from __future__ import annotations

from calendar import monthrange
from datetime import date, time, timedelta
import json
import math

import frappe
from frappe import _
from frappe.utils import cint, getdate, get_datetime, now_datetime, today

from nomad_vip.api.security import (
	can_project_media,
	normalize_idempotency_key,
	record_api_audit,
	require_entertainer_profile,
)
from nomad_vip.api.shift_state import attendance_state, resolve_shift_context, shift_checkins
from nomad_vip.entertainer_ranks import DEFAULT_ENTERTAINER_RANK, payout_percent_for_rank
from nomad_vip.entertainer_attention import build_entertainer_attention
from nomad_vip.daily_ranking import CANONICAL_THRESHOLDS, calculate_career_average, classify_score
from nomad_vip.rank_contract import build_rank_contract, rank_label
from nomad_vip.tasks.daily_rank import (
	SNAPSHOT_DOCTYPE,
	SNAPSHOT_PROJECTION_FIELDS,
	latest_daily_rank_snapshot,
	snapshot_payload,
)


PROFILE_FIELDS = [
	"name",
	"employee",
	"employee_name",
	"stage_name",
	"branch",
	"employment_type",
	"lifecycle_status",
	"skills",
	"languages",
	"service_tags",
	"style_tags",
	"profile_photo",
	"media_consent_status",
	"media_consent_expires_on",
	"current_rank",
	"current_points",
	"rank_last_calculated_at",
	"is_demo",
	"modified",
]

ENTERTAINER_LOAN_TERMS_VERSION = "entertainer-loan-v1"


def _demo_rank_snapshots(profile_name: str, limit: int = 31) -> list[dict]:
	"""Project persisted demo batches into the rank read contract only.

	Demo batches never create attendance, payroll, rank-history, or approved-rank
	records. Operational daily snapshots always win for the same date.
	"""
	try:
		batches = frappe.get_all(
			"VIP Demo Rank Batch",
			filters={"status": "Active"},
			fields=["name", "batch_id", "scoring_date", "policy_version", "created_at", "results_json"],
			order_by="scoring_date desc, created_at desc",
			# Read extra versions before de-duplicating by date so a corrected
			# batch cannot crowd an older date out of the requested window.
			limit_page_length=max(31, min(124, int(limit or 31) * 4)),
			ignore_permissions=True,
		)
	except frappe.DoesNotExistError:
		return []

	projected = []
	for batch in batches:
		try:
			results = json.loads(batch.results_json or "[]")
		except (TypeError, ValueError):
			continue
		result = next((row for row in results if row.get("profile") == profile_name), None)
		if not result:
			continue
		components = []
		for component in result.get("components") or []:
			components.append({
				**component,
				"source": {
					"mode": "demo_batch",
					"batch_id": batch.batch_id,
				},
			})
		projected.append({
			"name": f"demo:{batch.batch_id}:{profile_name}",
			"revision": 1,
			"scoring_date": batch.scoring_date,
			"status": result.get("status") or "Incomplete",
			"weighted_score": result.get("weighted_score"),
			"displayed_score": result.get("displayed_score"),
			"attendance_state": result.get("attendance_state"),
			"calculated_rank": result.get("calculated_rank"),
			"threshold_interval": None,
			"approved_rank": result.get("approved_rank"),
			"change_state": result.get("change_state") or "Incomplete",
			"missing_components": [
				row.get("component")
				for row in result.get("components") or []
				if row.get("status") != "verified" and row.get("component")
			],
			"components": components,
			"policy": None,
			"policy_version": batch.policy_version,
			"calculated_at": batch.created_at,
			"input_provenance": "DEMO",
			"demo_batch": batch.batch_id,
		})
	# Active demo batches are a date series, so expose the same attendance-day
	# running average as operational data. Keep only the newest batch per date.
	latest_by_date = {}
	for row in projected:
		latest_by_date.setdefault(str(row.get("scoring_date")), row)
	previous_scores = []
	for row in sorted(latest_by_date.values(), key=lambda item: str(item.get("scoring_date") or "")):
		if row.get("status") != "Complete" or row.get("weighted_score") is None:
			continue
		daily_score = 0.0 if row.get("attendance_state") == "Absent" else float(row.get("weighted_score"))
		if row.get("attendance_state") == "Absent":
			for component in row.get("components") or []:
				counted = component.get("component") in {"attendance", "sales"}
				component.update({
					"score": 0.0 if counted else None,
					"contribution": 0.0 if counted else None,
					"status": "verified" if counted else "excluded",
					"source": {"mode": "absence_zero" if counted else "absence_not_scored", "records": []},
				})
		row["weighted_score"] = daily_score
		career = calculate_career_average(previous_scores, daily_score)
		row["daily_score"] = daily_score
		row["displayed_score"] = career["score"]
		row["career_average_score"] = career["score"]
		row["counted_days"] = career["counted_days"]
		row["score_basis"] = "attendance_day_career_average"
		row["calculated_rank"] = classify_score(career["score"], CANONICAL_THRESHOLDS)
		previous_scores.append(daily_score)
	return list(latest_by_date.values())


def _recent_operational_rank_snapshots(profile_name: str, limit: int = 31) -> list[dict]:
	"""Read operational snapshots without requiring a scheduler code rollout."""
	try:
		rows = frappe.get_all(
			SNAPSHOT_DOCTYPE,
			filters={"entertainer": profile_name, "is_current": 1},
			fields=SNAPSHOT_PROJECTION_FIELDS,
			order_by="scoring_date desc, calculated_at desc",
			limit_page_length=max(1, min(31, int(limit or 31))),
			ignore_permissions=True,
		)
	except frappe.DoesNotExistError:
		return []
	return [snapshot_payload(row) for row in rows]


def _rank_on_date(value, current_rank: str, history_rows) -> str:
	"""Resolve the real effective rank without depending on a newer payroll module."""
	rank = current_rank or DEFAULT_ENTERTAINER_RANK
	ordered = sorted(
		(row for row in history_rows if row.get("effective_from")),
		key=lambda row: (getdate(row.get("effective_from")), str(row.get("changed_at") or "")),
	)
	if ordered:
		rank = ordered[0].get("from_rank") or rank
	for row in ordered:
		if getdate(row.get("effective_from")) > getdate(value):
			break
		rank = row.get("to_rank") or rank
	return rank


def _active_shift(employee: str):
	context = resolve_shift_context(employee)
	return context.assignment if context else None


def _week_bounds(value=None):
	day = getdate(value or today())
	start = day - timedelta(days=day.weekday())
	return start, start + timedelta(days=6)


def _weekly_schedule(employee: str, value=None):
	start, end = _week_bounds(value)
	assignments = frappe.get_all(
		"Shift Assignment",
		filters={"employee": employee, "docstatus": 1, "start_date": ("<=", end)},
		fields=["name", "shift_type", "start_date", "end_date"],
		order_by="start_date desc, creation desc",
		ignore_permissions=True,
	)
	assignments = [row for row in assignments if not row.end_date or getdate(row.end_date) >= start]
	shift_types = {
		name: frappe.db.get_value("Shift Type", name, ["start_time", "end_time"], as_dict=True)
		for name in {row.shift_type for row in assignments}
	}
	days = []
	for offset in range(7):
		day = start + timedelta(days=offset)
		assignment = next(
			(
				row for row in assignments
				if getdate(row.start_date) <= day and (not row.end_date or getdate(row.end_date) >= day)
			),
			None,
		)
		shift = shift_types.get(assignment.shift_type) if assignment else None
		days.append({
			"date": day,
			"assignment": assignment.name if assignment else None,
			"shift_type": assignment.shift_type if assignment else None,
			"start_time": shift.start_time if shift else None,
			"end_time": shift.end_time if shift else None,
		})
	return {"start": start, "end": end, "days": days}


def _workspace_payload(profile_name: str):
	profile = frappe.db.get_value("VIP Entertainer Profile", profile_name, PROFILE_FIELDS, as_dict=True)
	if not profile:
		frappe.throw(_("Бүжигчний профайл олдсонгүй."), frappe.DoesNotExistError)
	if not can_project_media(profile):
		profile.profile_photo = None
	profile["approved_rank"] = profile.current_rank or DEFAULT_ENTERTAINER_RANK
	profile["daily_rank"] = snapshot_payload(latest_daily_rank_snapshot(profile.name))

	week = _weekly_schedule(profile.employee)
	attendance = frappe.get_all(
		"Employee Checkin",
		filters={"employee": profile.employee, "skip_auto_attendance": 0, "log_type": "IN"},
		fields=["name", "time", "log_type", "shift"],
		order_by="time desc",
		limit=30,
		ignore_permissions=True,
	)
	month_start = getdate(today()).replace(day=1)
	penalties = frappe.get_all(
		"VIP Attendance Penalty",
		filters={"entertainer": profile.name, "attendance_date": (">=", month_start)},
		fields=["name", "attendance_date", "penalty_type", "late_minutes", "missed_rounds", "rate", "amount", "status", "reason", "modified", "decided_by", "decided_at", "decision_reason"],
		order_by="attendance_date desc, created_at desc",
		limit=50,
		ignore_permissions=True,
	)
	leaves = frappe.get_all(
		"VIP Emergency Leave Request",
		filters={"entertainer": profile.name},
		fields=["name", "leave_date", "status", "requested_at", "reason", "decision_reason"],
		order_by="leave_date desc, requested_at desc",
		limit=20,
		ignore_permissions=True,
	)
	active_penalties = [row for row in penalties if row.status == "Approved"]
	return {
		"profile": profile,
		"week": week,
		"attendance": attendance,
		"penalties": penalties,
		"leave_requests": leaves,
		"summary": {
			"scheduled_days": sum(1 for row in week["days"] if row["assignment"]),
			"attendance_events": len(attendance),
			"late_minutes": sum(int(row.late_minutes or 0) for row in active_penalties if row.penalty_type == "Late"),
			"active_deduction": sum(float(row.amount or 0) for row in active_penalties),
		},
	}


@frappe.whitelist(methods=["GET"])
def get_dashboard():
	_actor, profile = require_entertainer_profile(
			"name",
			"employee",
			"employee_name",
			"stage_name",
			"branch",
			"employment_type",
			"lifecycle_status",
			"skills",
			"languages",
			"service_tags",
			"style_tags",
			"profile_photo",
			"media_consent_status",
			"media_consent_expires_on",
			"current_rank",
			"current_points",
			"is_demo",
	)
	profile_name = profile.name
	if not can_project_media(profile):
		profile.profile_photo = None
	profile["approved_rank"] = profile.current_rank or DEFAULT_ENTERTAINER_RANK
	profile["daily_rank"] = snapshot_payload(latest_daily_rank_snapshot(profile.name))
	shift_context = resolve_shift_context(profile.employee)
	shift = shift_context.assignment if shift_context else None
	state = attendance_state(shift_checkins(profile.employee, shift_context))
	readiness = None
	if shift:
		readiness = frappe.db.get_value(
			"VIP Daily Readiness Check",
			{"entertainer": profile.name, "shift_assignment": shift.name, "is_reversed": 0},
			["name", "result", "reason", "point_impact", "checked_at"],
			as_dict=True,
		)
	next_reservation = frappe.get_all(
		"VIP Reservation",
		filters={
			"entertainer": profile.name,
			"starts_at": (">=", now_datetime()),
			"status": ("in", ["Assigned", "Acknowledged"]),
		},
		fields=["name", "starts_at", "ends_at", "status", "party_size", "venue"],
		order_by="starts_at asc",
		limit=1,
		ignore_permissions=True,
	)
	reservation = next_reservation[0] if next_reservation else None
	if reservation:
		reservation["customer_alias"] = _("Зочин")
	week = _weekly_schedule(profile.employee)
	month_start = getdate(today()).replace(day=1)
	work_date = shift_context.work_date if shift_context else getdate(today())
	active_penalties = frappe.get_all(
		"VIP Attendance Penalty",
		filters={"entertainer": profile.name, "status": "Approved", "attendance_date": (">=", month_start)},
		fields=["attendance_date", "penalty_type", "amount", "late_minutes"],
		ignore_permissions=True,
	)
	today_penalties = frappe.get_all(
		"VIP Attendance Penalty",
		filters={
			"entertainer": profile.name,
			"attendance_date": work_date,
			"status": ("not in", ["Rejected", "Reversed"]),
		},
		fields=["attendance_date", "penalty_type", "amount", "late_minutes", "status"],
		ignore_permissions=True,
	)
	stage_round_events = frappe.get_all(
		"VIP Performance Event",
		filters={
			"entertainer": profile.name,
			"event_type": "Stage Round",
			"verified": 1,
			"external_id": ("like", f"{work_date}|{profile.name}|%"),
		},
		fields=["external_id"],
		ignore_permissions=True,
	)
	completed_rounds = set()
	for event in stage_round_events:
		parts = (event.external_id or "").split("|")
		if len(parts) == 3:
			try:
				round_number = int(parts[2])
			except (TypeError, ValueError):
				continue
			if 1 <= round_number <= 7:
				completed_rounds.add(round_number)
	daily_rank = profile.get("daily_rank")
	attention_items = build_entertainer_attention(
		scoring_date=work_date,
		checked_in=bool(state.checked_in),
		active_window=bool(shift_context and shift_context.is_active_window),
		readiness=readiness,
		stage_rounds_completed=len(completed_rounds),
		daily_rank=daily_rank,
		attendance_penalties=today_penalties,
		is_demo=bool(profile.is_demo),
	)
	from nomad_vip.api.attendance_policy import _leave_count, _policy
	policy = _policy()
	leave_used = _leave_count(profile.name, today())
	arrival = next((row for row in state.events if row.log_type == "IN"), None)
	return {
		"profile": profile,
		"shift": shift,
		"latest_checkin": arrival,
		"attendance": {
			"checked_in": state.checked_in,
			"checked_out": False,
			"open": bool(state.checked_in),
			"work_date": shift_context.work_date if shift_context else getdate(today()),
			"active_window": bool(shift_context and shift_context.is_active_window),
		},
		"readiness": readiness,
		"attention_items": attention_items,
		"next_reservation": reservation,
		"week": week,
		"work_summary": {
			"scheduled_days": sum(1 for row in week["days"] if row["assignment"]),
			"active_deduction": sum(float(row.amount or 0) for row in active_penalties),
			"late_minutes": sum(int(row.late_minutes or 0) for row in active_penalties),
			"stage_rounds_completed": len(completed_rounds),
			"leave_used": leave_used,
			"leave_remaining": max(0, policy.emergency_leave_monthly_limit - leave_used),
		},
	}


def _legacy_rank_payload():
	_actor, profile = require_entertainer_profile(
		"employee", "current_rank", "current_points", "rank_last_calculated_at"
	)
	from nomad_vip.api.entertainer_finex import _summary
	from nomad_vip.api.rank_review import rank_reviews_for_profile
	finex = _summary(profile)
	recommended_rank = finex["rank"]["current"]
	approved_name = profile.current_rank or DEFAULT_ENTERTAINER_RANK
	daily_rank = snapshot_payload(latest_daily_rank_snapshot(profile.name))
	daily_complete = bool(daily_rank and daily_rank.get("status") == "Complete")
	display_rank_name = daily_rank.get("calculated_rank") if daily_complete else approved_name
	approved_rank = frappe.db.get_value(
		"VIP Rank Definition",
		approved_name,
		["name", "minimum_points", "rank_order", "benefits"],
		as_dict=True,
	) or frappe._dict({"name": approved_name, "minimum_points": 0, "rank_order": 0, "benefits": None})
	display_rank = frappe.db.get_value(
		"VIP Rank Definition",
		display_rank_name,
		["name", "minimum_points", "rank_order", "benefits"],
		as_dict=True,
	) or approved_rank
	next_rank = frappe.db.get_value(
		"VIP Rank Definition",
		{"active": 1, "rank_order": (">", display_rank.rank_order or 0)},
		["name", "minimum_points", "rank_order", "benefits"],
		as_dict=True,
		order_by="rank_order asc",
	)
	all_ranks = frappe.get_all(
		"VIP Rank Definition",
		filters={"active": 1},
		fields=["name", "code", "minimum_points", "rank_order", "benefits"],
		order_by="rank_order asc",
	)
	recent_points = [
		{
			"name": row["key"],
			"metric": row["service"],
			"points": round(float(row["amount"]) / float(finex["point_rule_mnt"]), 2),
			"posted_at": row["date"],
		}
		for row in finex["recent_services"]
	]
	window_from = getdate(finex["window"]["from"])
	window_to = getdate(finex["window"]["to"])
	events = frappe.get_all(
		"VIP Performance Event",
		filters={
			"entertainer": profile.name,
			"verified": 1,
			"occurred_at": ("between", [window_from, window_to + timedelta(days=1)]),
		},
		fields=["event_type", "external_id"],
		ignore_permissions=True,
	)
	event_counts = {}
	stage_round_days = {}
	for event in events:
		event_counts[event.event_type] = event_counts.get(event.event_type, 0) + 1
		if event.event_type == "Stage Round":
			parts = (event.external_id or "").split("|")
			if len(parts) == 3:
				try:
					stage_round_days.setdefault(parts[0], set()).add(int(parts[2]))
				except (TypeError, ValueError):
					pass
	attendance_present = event_counts.get("Attendance Present", 0)
	attendance_late = event_counts.get("Attendance Late", 0)
	attendance_no_show = event_counts.get("Attendance No Show", 0)
	repeat_customers = int(finex.get("repeat_customer_count") or 0)
	linked_customer_bills = int(finex.get("linked_customer_bill_count") or 0)
	stage_rounds = event_counts.get("Stage Round", 0)
	completed_stage_round_days = sum(1 for rounds in stage_round_days.values() if len(rounds) >= 7)
	behavior_events = event_counts.get("Readiness Ready", 0) + event_counts.get("Readiness Not Ready", 0) + stage_rounds
	policy = frappe.db.get_value(
		"VIP Ranking Policy",
		{"status": "Published"},
		[
			"name", "version", "effective_from", "evaluation_mode", "evaluation_window_days", "evaluation_cadence",
			"rank_1_threshold", "rank_2_threshold", "rank_3_threshold",
		],
		as_dict=True,
	) or frappe._dict()
	from nomad_vip.tasks.rank_evaluation import rank_evaluation_schedule
	evaluation = rank_evaluation_schedule(profile.rank_last_calculated_at)
	evidence = [
		{
			"key": "sales",
			"label": _("Борлуулалт ба гүйцэтгэл"),
			"status": "verified" if finex["bill_count"] else "missing",
			"value": finex["service_count"],
			"unit": _("үйлчилгээ"),
			"detail": _("{0} төлөгдсөн баримтаас").format(finex["bill_count"]),
		},
		{
			"key": "attendance",
			"label": _("Ирц ба найдвартай байдал"),
			"status": "verified" if attendance_present or attendance_late or attendance_no_show else "missing",
			"value": attendance_present,
			"unit": _("ирцийн бүртгэл"),
			"detail": _("Хоцролт {0} · таслалт {1}").format(attendance_late, attendance_no_show),
		},
		{
			"key": "loyalty",
			"label": _("Давтан үйлчлүүлэгч"),
			"status": "verified" if linked_customer_bills else "missing",
			"value": repeat_customers,
			"unit": _("давтан үйлчлүүлэгч"),
			"detail": (
				_("Харилцагчтай холбогдсон {0} төлөгдсөн баримтаас").format(linked_customer_bills)
				if linked_customer_bills
				else _("Харилцагчтай холбогдсон төлөгдсөн баримт алга.")
			),
		},
		{
			"key": "behavior",
			"label": _("Бэлэн байдал ба өдрийн гараа"),
			"status": "verified" if behavior_events else "missing",
			"value": behavior_events,
			"unit": _("ажлын үнэлгээ"),
			"detail": _("Гараа {0} · 7/7 биелүүлсэн өдөр {1}").format(stage_rounds, completed_stage_round_days),
		},
	]
	component_labels = {
		"attendance": (_("Ирц"), _("оноо")),
		"customer_complaints": (_("Үйлчлүүлэгчийн гомдол"), _("оноо")),
		"sales": (_("Борлуулалт"), _("оноо")),
		"entertaining_skill": (_("Үзвэр, бүжгийн ур чадвар"), _("оноо")),
		"cleanliness_beauty": (_("Цэвэр байдал ба гоо зүй"), _("оноо")),
		"shift_effort": (_("Өдрийн гараа"), _("оноо")),
		"personal_development": (_("Хувийн хөгжил"), _("оноо")),
		"entertainer_attitude": (_("Хандлага"), _("оноо")),
	}
	if daily_rank:
		evidence = []
		for component in daily_rank.get("components") or []:
			key = component.get("component")
			label, unit = component_labels.get(key, (key, _("оноо")))
			source = component.get("source") or {}
			score = component.get("score")
			detail = _("Эх баримт хүлээгдэж байна") if score is None else _("Жин {0}% · хувь нэмэр {1}").format(
				component.get("weight") or 0,
				round(float(component.get("contribution") or 0), 2),
			)
			if source.get("mode") == "lateness_normalization_required":
				detail = _("Хоцролтын {0} минутын үнэлгээ шаардлагатай").format(source.get("late_minutes") or 0)
			evidence.append({
				"key": key,
				"label": label,
				"status": component.get("status") or "missing",
				"value": score,
				"unit": unit,
				"detail": detail,
				"weight": component.get("weight"),
				"contribution": component.get("contribution"),
			})
	if daily_rank:
		evaluation = {
			"interval_days": 1,
			"last_evaluated_at": daily_rank.get("calculated_at"),
			"next_evaluation_at": str(getdate(daily_rank.get("scoring_date")) + timedelta(days=1)),
			"remaining_days": 1,
			"due": False,
		}
	thresholds = {
		"Rank 1": float(policy.get("rank_1_threshold") or 90),
		"Rank 2": float(policy.get("rank_2_threshold") or 80),
		"Rank 3": float(policy.get("rank_3_threshold") or 70),
	}
	current_score = float(daily_rank.get("displayed_score") or daily_rank.get("weighted_score") or 0) if daily_complete else 0.0
	focus = sorted(
		(item for item in evidence if item.get("value") is not None),
		key=lambda item: float(item.get("value") or 0),
	)[:2]
	rank_targets = []
	for target_rank in all_ranks:
		if int(target_rank.get("rank_order") or 0) <= int(display_rank.get("rank_order") or 0):
			continue
		target_score = thresholds.get(target_rank.name, 100.0)
		requirements = [
			_("Өдрийн нийт оноо {0} буюу түүнээс дээш").format(round(target_score, 2)),
			_("8 үзүүлэлт бүгд баталгаажсан байх"),
		]
		for item in focus:
			requirements.append(_("{0}: одоо {1} оноо").format(item.get("label"), round(float(item.get("value") or 0), 2)))
		rank_targets.append({
			"rank": target_rank.name,
			"score_required": target_score,
			"current_score": current_score,
			"score_needed": max(0.0, round(target_score - current_score, 2)),
			"payout_percent": payout_percent_for_rank(target_rank.name),
			"requirements": requirements,
		})
	next_target = rank_targets[0] if rank_targets else None
	return {
		"current": {
			"current_rank": display_rank_name,
			"approved_rank": approved_name,
			"current_points": daily_rank.get("displayed_score") if daily_complete else (profile.current_points or 0),
			"payout_percent": payout_percent_for_rank(display_rank_name),
			"source": _("Ажилласан өдрийн дундаж оноо") if daily_complete else _("Баталгаажсан зэрэглэл"),
		},
		"next": next_rank,
		"next_target": next_target,
		"rank_targets": rank_targets,
		"ranks": all_ranks,
		"recommendation": {
			"rank": daily_rank.get("calculated_rank") if daily_complete else recommended_rank.get("name"),
			"points": daily_rank.get("displayed_score") if daily_complete else finex["points"],
			"source": _("Ажилласан өдрийн дундаж оноо") if daily_complete else _("Борлуулалтын туслах үзүүлэлт"),
			"requires_human_approval": True,
			"evidence_only": True,
		},
		"policy": {
			"version": policy.get("version"),
			"effective_from": policy.get("effective_from"),
			"mode": policy.get("evaluation_mode") or "Shadow",
			"window_days": policy.get("evaluation_window_days") or 1,
			"cadence": policy.get("evaluation_cadence") or "Daily",
			"configuration_required": (policy.get("evaluation_mode") or "Shadow") != "Active",
		},
		"evaluation": evaluation,
		"evidence": evidence,
		"daily_rank": daily_rank,
		"recent_points": recent_points,
		"reviews": rank_reviews_for_profile(profile.name, 10),
		"finex": finex,
	}


@frappe.whitelist(methods=["GET"])
def get_rank():
	"""Return the single backend-owned daily score, effective rank and payout contract."""
	_actor, profile = require_entertainer_profile(
		"employee", "current_rank", "rank_last_calculated_at"
	)
	current_rank = profile.current_rank or DEFAULT_ENTERTAINER_RANK
	policy = frappe.db.get_value(
		"VIP Ranking Policy",
		{"status": "Published", "effective_from": ("<=", today()), "daily_scoring_enabled": 1},
		["rank_1_threshold", "rank_2_threshold", "rank_3_threshold"],
		as_dict=True,
		order_by="effective_from desc, creation desc",
	) or frappe._dict({"rank_1_threshold": 90, "rank_2_threshold": 80, "rank_3_threshold": 70})
	thresholds = {
		"rank_1": policy.rank_1_threshold or 90,
		"rank_2": policy.rank_2_threshold or 80,
		"rank_3": policy.rank_3_threshold or 70,
	}
	history_rows = frappe.get_all(
		"VIP Rank History",
		filters={"entertainer": profile.name},
		fields=["name", "from_rank", "to_rank", "changed_at", "effective_from"],
		order_by="effective_from asc, changed_at asc",
		limit_page_length=0,
		ignore_permissions=True,
	)
	reference_date = getdate(today())
	effective_rank = _rank_on_date(reference_date, current_rank, history_rows)
	effective_history = [row for row in history_rows if getdate(row.effective_from) <= reference_date]
	effective_from = effective_history[-1].effective_from if effective_history else None

	snapshot = snapshot_payload(latest_daily_rank_snapshot(profile.name))
	operational_snapshots = _recent_operational_rank_snapshots(profile.name, 31)
	demo_snapshots = _demo_rank_snapshots(profile.name, 31)
	by_date = {}
	for row in demo_snapshots:
		if row.get("scoring_date"):
			by_date.setdefault(str(row.get("scoring_date")), row)
	for row in operational_snapshots:
		if row.get("scoring_date"):
			by_date[str(row.get("scoring_date"))] = row
	recent_snapshots = sorted(
		by_date.values(),
		key=lambda row: str(row.get("scoring_date") or ""),
		reverse=True,
	)[:31]
	if recent_snapshots:
		# The rank page represents the career average, so today's still-incomplete
		# inputs must not blank an already established score.
		snapshot = next(
			(
				row for row in recent_snapshots
				if row.get("status") == "Complete" and row.get("displayed_score") is not None
			),
			recent_snapshots[0],
		)
	recent_history = []
	for row in recent_snapshots:
		scoring_date = getdate(row.get("scoring_date")) if row.get("scoring_date") else None
		next_day_rank = _rank_on_date(scoring_date + timedelta(days=1), current_rank, history_rows) if scoring_date else effective_rank
		recent_history.append({
			"scoring_date": str(scoring_date) if scoring_date else None,
			"score": row.get("displayed_score") if row.get("status") == "Complete" else None,
			"score_status": "complete" if row.get("status") == "Complete" else "incomplete",
			"calculated_rank": row.get("calculated_rank") if row.get("status") == "Complete" else None,
			"calculated_rank_label": rank_label(row.get("calculated_rank")) if row.get("status") == "Complete" else None,
			"next_day_effective_rank": next_day_rank,
			"next_day_effective_rank_label": rank_label(next_day_rank),
			"data_provenance": row.get("input_provenance") or "VERIFIED",
		})

	return build_rank_contract(
		snapshot=snapshot,
		effective_rank=effective_rank,
		effective_from=effective_from,
		thresholds=thresholds,
		history=recent_history,
	)


@frappe.whitelist(methods=["GET"])
def get_loan_overview():
	"""Return server-calculated loan eligibility and the entertainer's requests."""
	_actor, profile = require_entertainer_profile(
		"employee", "branch", "employment_type", "current_rank"
	)
	snapshot = _loan_eligibility_snapshot(profile)
	date_of_joining = frappe.db.get_value("Employee", profile.employee, "date_of_joining")
	tenure_days = max(0, (getdate(today()) - getdate(date_of_joining)).days) if date_of_joining else None
	requests = frappe.get_all(
		"VIP Entertainer Loan Request",
		filters={"entertainer": profile.name},
		fields=["name", "requested_at", "requested_amount", "repayment_rate", "status", "purpose", "estimated_completion_date"],
		order_by="requested_at desc",
		limit=10,
		ignore_permissions=True,
	)
	return {
		"policy": {
			"status": "Active",
			"request_enabled": snapshot["eligible"],
			"message": snapshot["message"],
			"amount_step": 10000,
			"repayment_min": 30,
			"repayment_max": 60,
			"repayment_step": 5,
			"repayment_default": 50,
			"interest_percent": 0,
		},
		"evidence": {
			"employment_type": profile.employment_type,
			"branch": profile.branch,
			"current_rank": profile.current_rank or DEFAULT_ENTERTAINER_RANK,
			"tenure_days": tenure_days,
			"verified_income": snapshot["three_month_total"],
			"income_window": snapshot["income_window"],
			"verified_bill_count": snapshot["verified_bill_count"],
			"income_months": snapshot["income_months"],
			"three_month_average": snapshot["three_month_average"],
			"loan_multiplier": snapshot["loan_multiplier"],
			"maximum_amount": snapshot["maximum_amount"],
			"typical_three_day_income": snapshot["typical_three_day_income"],
			"outstanding_balance": None,
			"blocking_reasons": snapshot["blocking_reasons"],
		},
		"required_decisions": [],
		"requests": requests,
	}


LOAN_OPEN_STATUSES = ("Submitted", "Returned for Info", "CEO Approved", "Accounting Pending", "Disbursed", "Active", "Repaying")


def _previous_completed_months(reference=None) -> list[tuple[date, date]]:
	current = getdate(reference or today()).replace(day=1)
	months = []
	for offset in range(1, 4):
		year = current.year
		month = current.month - offset
		while month <= 0:
			year -= 1
			month += 12
		start = date(year, month, 1)
		months.append((start, date(year, month, monthrange(year, month)[1])))
	return list(reversed(months))


def _loan_eligibility_snapshot(profile) -> dict:
	from nomad_vip.api.entertainer_finex import _monthly_summary

	rank_name = profile.current_rank or DEFAULT_ENTERTAINER_RANK
	multiplier = float(frappe.db.get_value("VIP Rank Definition", rank_name, "loan_multiplier") or 0)
	month_rows = []
	for start, _end in _previous_completed_months():
		summary = _monthly_summary(profile, start.strftime("%Y-%m"))
		month_rows.append({
			"month": start.strftime("%Y-%m"),
			"income": float(summary.get("net_income") or 0),
			"service_count": int(summary.get("service_count") or 0),
			"bill_count": int(summary.get("bill_count") or 0),
		})
	total = sum(row["income"] for row in month_rows)
	average = total / 3
	maximum = math.floor((average * multiplier / 100) / 10000) * 10000 if multiplier else 0
	typical_three_day = round(average / 10, 2)
	blocking = []
	if multiplier <= 0:
		blocking.append(_("Одоогийн зэрэглэлд зээлийн эрх нээгдээгүй."))
	if any(row["bill_count"] <= 0 for row in month_rows):
		blocking.append(_("Өмнөх бүтэн 3 сарын орлогын бүртгэл бүрдээгүй."))
	if frappe.db.exists("VIP Entertainer Loan Request", {"entertainer": profile.name, "status": ("in", LOAN_OPEN_STATUSES)}):
		blocking.append(_("Өмнөх зээлийн хүсэлт эсвэл идэвхтэй зээл дуусаагүй."))
	if frappe.db.exists("VIP Attendance Penalty", {"entertainer": profile.name, "penalty_type": "Absence", "status": "Approved", "attendance_date": (">=", getdate(today()) - timedelta(days=30))}):
		blocking.append(_("Сүүлийн 30 хоногт шийдэгдээгүй таслалт байна."))
	if maximum <= 0 and multiplier > 0:
		blocking.append(_("Зээл тооцох баталгаатай орлого хүрэлцэхгүй байна."))
	window = _previous_completed_months()
	eligible = not blocking
	return {
		"eligible": eligible,
		"message": _("Хүсэлт гаргах боломжтой.") if eligible else blocking[0],
		"blocking_reasons": blocking,
		"income_months": month_rows,
		"income_window": {"from": str(window[0][0]), "to": str(window[-1][1])},
		"three_month_total": total,
		"three_month_average": round(average, 2),
		"verified_bill_count": sum(row["bill_count"] for row in month_rows),
		"loan_multiplier": multiplier,
		"maximum_amount": maximum,
		"typical_three_day_income": typical_three_day,
	}


@frappe.whitelist(methods=["POST"])
def submit_loan_request(
	requested_amount,
	repayment_rate,
	purpose,
	accepted_terms=0,
	terms_version=None,
	idempotency_key=None,
):
	actor, profile = require_entertainer_profile("employee", "branch", "current_rank")
	terms_version = (terms_version or "").strip()
	if not cint(accepted_terms):
		frappe.throw(_("Зээлийн нөхцөлийг зөвшөөрнө үү."), frappe.ValidationError)
	if terms_version != ENTERTAINER_LOAN_TERMS_VERSION:
		frappe.throw(_("Зээлийн нөхцөл шинэчлэгдсэн байна. Дахин уншаад зөвшөөрнө үү."), frappe.ValidationError)
	key = normalize_idempotency_key(idempotency_key)
	if key:
		existing = frappe.db.get_value(
			"VIP Entertainer Loan Request",
			{"entertainer": profile.name, "idempotency_key": key},
			["name", "requested_at", "requested_amount", "repayment_rate", "status", "purpose", "estimated_completion_date"],
			as_dict=True,
		)
		if existing:
			return {"request": existing, "replayed": True}
	snapshot = _loan_eligibility_snapshot(profile)
	if not snapshot["eligible"]:
		frappe.throw(snapshot["message"], frappe.ValidationError)
	try:
		amount = int(float(requested_amount))
		rate = int(float(repayment_rate))
	except (TypeError, ValueError):
		frappe.throw(_("Зээлийн дүн болон эргэн төлөх хувийг зөв оруулна уу."), frappe.ValidationError)
	if amount <= 0 or amount > snapshot["maximum_amount"] or amount % 10000:
		frappe.throw(_("Зээлийн дүн 10,000₮-ийн алхамтай, зөвшөөрөгдсөн дээд дүнгээс ихгүй байна."), frappe.ValidationError)
	if rate < 30 or rate > 60 or rate % 5:
		frappe.throw(_("Эргэн төлөх хувь 30–60%, 5%-ийн алхамтай байна."), frappe.ValidationError)
	purpose = (purpose or "").strip()
	if len(purpose) < 5 or len(purpose) > 500:
		frappe.throw(_("Зээлийн зориулалтыг 5–500 тэмдэгтээр бичнэ үү."), frappe.ValidationError)
	deduction = round(snapshot["typical_three_day_income"] * rate / 100, 2)
	cycles = max(1, math.ceil(amount / deduction)) if deduction > 0 else 0
	estimated_completion = getdate(today()) + timedelta(days=cycles * 3) if cycles else None
	doc = frappe.get_doc({
		"doctype": "VIP Entertainer Loan Request",
		"entertainer": profile.name,
		"employee": profile.employee,
		"branch": profile.branch,
		"current_rank": profile.current_rank or DEFAULT_ENTERTAINER_RANK,
		"income_window_from": snapshot["income_window"]["from"],
		"income_window_to": snapshot["income_window"]["to"],
		"income_months_json": frappe.as_json(snapshot["income_months"]),
		"three_month_average": snapshot["three_month_average"],
		"loan_multiplier": snapshot["loan_multiplier"],
		"maximum_amount": snapshot["maximum_amount"],
		"requested_amount": amount,
		"repayment_rate": rate,
		"typical_three_day_income": snapshot["typical_three_day_income"],
		"estimated_deduction": deduction,
		"estimated_cycles": cycles,
		"estimated_completion_date": estimated_completion,
		"interest_percent": 0,
		"purpose": purpose,
		"accepted_terms": 1,
		"status": "Submitted",
		"requested_at": now_datetime(),
		"idempotency_key": key,
	}).insert(ignore_permissions=True)
	record_api_audit(
		actor=actor,
		action="entertainer.loan.requested",
		target_doctype=doc.doctype,
		target_name=doc.name,
		idempotency_key=key,
		details={
			"amount": amount,
			"repayment_rate": rate,
			"maximum_amount": snapshot["maximum_amount"],
			"accepted_terms": True,
			"terms_version": terms_version,
		},
	)
	return {"request": {field: doc.get(field) for field in ("name", "requested_at", "requested_amount", "repayment_rate", "status", "purpose", "estimated_completion_date")}, "replayed": False}


@frappe.whitelist(methods=["GET"])
def get_workspace():
	_actor, profile = require_entertainer_profile()
	return _workspace_payload(profile.name)


@frappe.whitelist(methods=["GET"])
def get_my_schedule(week_start=None):
	"""Return one requested week of the signed-in entertainer's schedule and arrivals."""
	_actor, profile = require_entertainer_profile()
	week = _weekly_schedule(profile.employee, week_start)
	window_start = get_datetime(f"{week['start']} 12:00:00")
	window_end = get_datetime(f"{week['end'] + timedelta(days=1)} 11:59:59")
	checkins = frappe.get_all(
		"Employee Checkin",
		filters={
			"employee": profile.employee,
			"log_type": "IN",
			"skip_auto_attendance": 0,
			"time": ("between", [window_start, window_end]),
		},
		fields=["time"],
		order_by="time asc",
		limit_page_length=0,
		ignore_permissions=True,
	)
	attended_dates = set()
	for row in checkins:
		moment = get_datetime(row.time)
		work_date = getdate(moment)
		if moment.time() < time(12, 0):
			work_date -= timedelta(days=1)
		if week["start"] <= work_date <= week["end"]:
			attended_dates.add(work_date)
	return {
		"week": week,
		"attended_dates": sorted(attended_dates),
	}


@frappe.whitelist(methods=["POST"])
def check_in():
	require_entertainer_profile()
	frappe.throw(
		_("Ирцийг салбарын QR болон байршлаар баталгаажуулж бүртгэнэ үү."),
		frappe.ValidationError,
	)
