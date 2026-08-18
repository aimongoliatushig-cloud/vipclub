from __future__ import annotations

from datetime import timedelta

import frappe
from frappe import _
from frappe.utils import getdate, now_datetime, today

from nomad_vip.api.security import can_project_media, require_entertainer_profile
from nomad_vip.api.shift_state import attendance_state, resolve_shift_context, shift_checkins


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
	"is_demo",
	"modified",
]


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

	week = _weekly_schedule(profile.employee)
	attendance = frappe.get_all(
		"Employee Checkin",
		filters={"employee": profile.employee, "skip_auto_attendance": 0},
		fields=["name", "time", "log_type", "shift"],
		order_by="time desc",
		limit=30,
		ignore_permissions=True,
	)
	month_start = getdate(today()).replace(day=1)
	penalties = frappe.get_all(
		"VIP Attendance Penalty",
		filters={"entertainer": profile.name, "attendance_date": (">=", month_start)},
		fields=["name", "attendance_date", "penalty_type", "late_minutes", "rate", "amount", "status", "reason", "modified", "decided_by", "decided_at", "decision_reason"],
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
	shift_context = resolve_shift_context(profile.employee)
	shift = shift_context.assignment if shift_context else None
	state = attendance_state(shift_checkins(profile.employee, shift_context))
	readiness = None
	if shift:
		readiness = frappe.db.get_value(
			"VIP Daily Readiness Check",
			{"entertainer": profile.name, "shift_assignment": shift.name},
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
	active_penalties = frappe.get_all(
		"VIP Attendance Penalty",
		filters={"entertainer": profile.name, "status": "Approved", "attendance_date": (">=", month_start)},
		fields=["amount", "late_minutes"],
		ignore_permissions=True,
	)
	from nomad_vip.api.attendance_policy import _leave_count, _policy
	policy = _policy()
	leave_used = _leave_count(profile.name, today())
	return {
		"profile": profile,
		"shift": shift,
		"latest_checkin": state.latest,
		"attendance": {
			"checked_in": state.checked_in,
			"checked_out": state.checked_out,
			"open": state.open,
			"work_date": shift_context.work_date if shift_context else getdate(today()),
			"active_window": bool(shift_context and shift_context.is_active_window),
		},
		"readiness": readiness,
		"next_reservation": reservation,
		"week": week,
		"work_summary": {
			"scheduled_days": sum(1 for row in week["days"] if row["assignment"]),
			"active_deduction": sum(float(row.amount or 0) for row in active_penalties),
			"late_minutes": sum(int(row.late_minutes or 0) for row in active_penalties),
			"leave_used": leave_used,
			"leave_remaining": max(0, policy.emergency_leave_monthly_limit - leave_used),
		},
	}


@frappe.whitelist(methods=["GET"])
def get_rank():
	_actor, profile = require_entertainer_profile("employee", "current_rank", "current_points")
	from nomad_vip.api.entertainer_finex import _summary
	finex = _summary(profile)
	recommended_rank = finex["rank"]["current"]
	approved_name = profile.current_rank or "Gold"
	approved_rank = frappe.db.get_value(
		"VIP Rank Definition",
		approved_name,
		["name", "minimum_points", "rank_order", "benefits"],
		as_dict=True,
	) or frappe._dict({"name": approved_name, "minimum_points": 0, "rank_order": 0, "benefits": None})
	next_rank = frappe.db.get_value(
		"VIP Rank Definition",
		{"active": 1, "rank_order": (">", approved_rank.rank_order or 0)},
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
		fields=["event_type"],
		ignore_permissions=True,
	)
	event_counts = {}
	for event in events:
		event_counts[event.event_type] = event_counts.get(event.event_type, 0) + 1
	attendance_present = event_counts.get("Attendance Present", 0)
	attendance_late = event_counts.get("Attendance Late", 0)
	attendance_no_show = event_counts.get("Attendance No Show", 0)
	loyalty_events = event_counts.get("Customer Repeat", 0) + event_counts.get("Reservation Completed", 0)
	behavior_events = event_counts.get("Readiness Ready", 0) + event_counts.get("Readiness Not Ready", 0)
	policy = frappe.db.get_value(
		"VIP Ranking Policy",
		{"status": "Published"},
		["name", "version", "effective_from", "evaluation_mode", "evaluation_window_days", "evaluation_cadence"],
		as_dict=True,
	) or frappe._dict()
	evidence = [
		{
			"key": "sales",
			"label": _("Борлуулалт ба гүйцэтгэл"),
			"status": "verified" if finex["bill_count"] else "missing",
			"value": finex["service_count"],
			"unit": _("үйлчилгээ"),
			"detail": _("{0} баталгаажсан баримтаас").format(finex["bill_count"]),
		},
		{
			"key": "attendance",
			"label": _("Ирц ба найдвартай байдал"),
			"status": "verified" if attendance_present or attendance_late or attendance_no_show else "missing",
			"value": attendance_present,
			"unit": _("баталгаажсан ирц"),
			"detail": _("Хоцролт {0} · таслалт {1}").format(attendance_late, attendance_no_show),
		},
		{
			"key": "loyalty",
			"label": _("Давтан үйлчлүүлэгч"),
			"status": "verified" if loyalty_events else "missing",
			"value": loyalty_events,
			"unit": _("баталгаажсан үйл явдал"),
			"detail": _("Цуцлагдсан, ирээгүй захиалгыг тооцохгүй."),
		},
		{
			"key": "behavior",
			"label": _("Ажлын бэлэн байдал ба сахилга"),
			"status": "verified" if behavior_events else "missing",
			"value": behavior_events,
			"unit": _("баталгаажсан үнэлгээ"),
			"detail": _("Гомдол дангаараа баталгаажсан зөрчил болохгүй."),
		},
	]
	return {
		"current": {
			"current_rank": approved_rank.get("name"),
			"current_points": finex["points"],
			"source": "Manager approved",
		},
		"next": next_rank,
		"ranks": all_ranks,
		"recommendation": {
			"rank": recommended_rank.get("name"),
			"points": finex["points"],
			"source": _("Борлуулалтын туслах үзүүлэлт"),
			"requires_human_approval": True,
			"evidence_only": True,
		},
		"policy": {
			"version": policy.get("version"),
			"effective_from": policy.get("effective_from"),
			"mode": policy.get("evaluation_mode") or "Shadow",
			"window_days": policy.get("evaluation_window_days") or 62,
			"cadence": policy.get("evaluation_cadence") or "Monthly",
			"configuration_required": (policy.get("evaluation_mode") or "Shadow") != "Active",
		},
		"evidence": evidence,
		"recent_points": recent_points,
		"finex": finex,
	}


@frappe.whitelist(methods=["GET"])
def get_loan_overview():
	"""Return the entertainer's own verified loan-readiness evidence.

	Loan submission stays closed until an effective policy defines eligibility,
	maximum, repayment, approval, departure, and reversal rules.
	"""
	_actor, profile = require_entertainer_profile(
		"employee", "branch", "employment_type", "current_rank"
	)
	from nomad_vip.api.entertainer_finex import _summary

	finex = _summary(profile)
	date_of_joining = frappe.db.get_value("Employee", profile.employee, "date_of_joining")
	tenure_days = max(0, (getdate(today()) - getdate(date_of_joining)).days) if date_of_joining else None
	return {
		"policy": {
			"status": "Configuration Required",
			"request_enabled": False,
			"message": _("Зээлийн шалгуур, дээд дүн, эргэн төлөлт болон батлах эрх баталгаажаагүй байна."),
		},
		"evidence": {
			"employment_type": profile.employment_type,
			"branch": profile.branch,
			"current_rank": profile.current_rank or "Gold",
			"tenure_days": tenure_days,
			"verified_income": finex["net_income"],
			"income_window": finex["window"],
			"verified_bill_count": finex["bill_count"],
			"outstanding_balance": None,
		},
		"required_decisions": [
			_("Зээл авах ажиллах хэлбэр болон ажилласан доод хугацаа"),
			_("Баталгаажсан орлогын хугацаа ба зээлийн дээд дүнгийн томьёо"),
			_("Эргэн төлөх хувь, хугацаа болон гурван өдрийн тооцооны суутгал"),
			_("Батлах эрх, төлбөрийн нотолгоо, буцаалт болон ажлаас гарах үеийн зохицуулалт"),
		],
	}


@frappe.whitelist(methods=["GET"])
def get_workspace():
	_actor, profile = require_entertainer_profile()
	return _workspace_payload(profile.name)


@frappe.whitelist(methods=["POST"])
def check_in():
	require_entertainer_profile()
	frappe.throw(
		_("Ирцийг салбарын QR болон байршлаар баталгаажуулж бүртгэнэ үү."),
		frappe.ValidationError,
	)
