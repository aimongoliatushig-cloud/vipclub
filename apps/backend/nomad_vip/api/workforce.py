from __future__ import annotations

import json
from datetime import timedelta

import frappe
from frappe import _
from frappe.utils import flt, get_datetime, getdate, now_datetime, today

from nomad_vip.api.attendance_policy import (
	arrival_requires_fixed_penalty,
	branch_late_cutoff,
	hourly_leave_arrival_cutoff,
	hourly_leave_counts_as_absence,
	late_minutes_after_cutoff,
)
from nomad_vip.api.entertainer import _workspace_payload
from nomad_vip.api.availability import (
	AVAILABILITY_EVENT_FIELDS,
	_assert_availability_version,
	availability_event_payload,
	availability_event_values,
	availability_request_matches,
	latest_availability,
)
from nomad_vip.api.security import (
	assert_not_stale,
	can_project_media,
	normalize_idempotency_key,
	page_meta,
	page_window,
	record_api_audit,
	require_actor,
	require_entertainer_profile,
)
from nomad_vip.api.shift_state import (
	attendance_state,
	resolve_shift_context,
	resolve_shift_contexts,
	shift_checkins,
)
from nomad_vip.availability_policy import (
	CANONICAL_AVAILABILITY_STATES,
	canonical_availability_status,
)
from nomad_vip.entertainer_ranks import DEFAULT_ENTERTAINER_RANK
from nomad_vip.services import get_branch_for_user
from nomad_vip.tasks.daily_rank import current_daily_rank_by_profile, latest_daily_rank_snapshot, snapshot_payload


def _branch_for_manager() -> str:
	branch = get_branch_for_user()
	if not branch:
		frappe.throw(_("Таны ажилтны бүртгэлд салбар тохируулаагүй байна."), frappe.PermissionError)
	return branch


def _pending_manager_leave_count(branch: str) -> int:
	"""Count both club emergency leave and HRMS employee leave for one branch."""
	pending = frappe.db.count("VIP Emergency Leave Request", {"branch": branch, "status": "Pending"})
	employees = frappe.get_all(
		"Employee",
		filters={"branch": branch, "status": "Active"},
		pluck="name",
		ignore_permissions=True,
	)
	if employees:
		pending += frappe.db.count(
			"Leave Application",
			{"employee": ("in", employees), "status": "Open", "docstatus": ("<", 2)},
		)
	return pending


def _active_shift(employee: str):
	assignment = frappe.get_all(
		"Shift Assignment",
		filters={"employee": employee, "docstatus": 1, "start_date": ("<=", today())},
		fields=["name", "shift_type", "start_date", "end_date"],
		order_by="start_date desc, creation desc",
		limit=5,
		ignore_permissions=True,
	)
	for row in assignment:
		if not row.end_date or str(row.end_date) >= today():
			row.shift = frappe.db.get_value(
				"Shift Type", row.shift_type, ["start_time", "end_time"], as_dict=True
			)
			return row
	return None


def _manager_profile(profile_name: str, branch: str):
	profile = frappe.db.get_value(
		"VIP Entertainer Profile",
		profile_name,
		[
			"name", "employee", "employee_name", "stage_name", "branch", "active",
			"lifecycle_status", "current_rank", "current_points", "rank_last_calculated_at", "modified",
		],
		as_dict=True,
	)
	if not profile or not profile.active:
		frappe.throw(_("Бүжигчний идэвхтэй бүртгэл олдсонгүй."), frappe.DoesNotExistError)
	if profile.branch != branch:
		frappe.throw(_("Өөр салбарын бүжигчний мэдээллийг удирдах эрхгүй."), frappe.PermissionError)
	return profile


def _latest_availability(profile_name: str, work_date=None):
	return latest_availability(profile_name, work_date or today())


def _required_reason(value) -> str:
	reason = (value or "").strip()
	if len(reason) < 5:
		frappe.throw(_("Шалтгааныг хамгийн багадаа 5 тэмдэгтээр бичнэ үү."), frappe.ValidationError)
	return reason


def _throw_idempotency_mismatch() -> None:
	frappe.throw(
		_("Энэ давхардал хамгаалах түлхүүрийг өөр хүсэлтэд ашигласан байна."),
		frappe.TimestampMismatchError,
	)


@frappe.whitelist(methods=["GET"])
def get_context():
	actor = require_actor()
	if actor.user == "Administrator" or actor.roles.intersection({"VIP Admin", "System Manager"}):
		return {
			"user": actor.user,
			"full_name": frappe.utils.get_fullname(actor.user),
			"branch": "Бүх салбар",
			"mode": "admin",
			"profile": None,
			"employee": actor.employee,
			"can_scan_attendance": bool(actor.employee and actor.branch),
		}
	# A dual-role account opens the manager workspace. Entertainer mode is only
	# returned after the active profile and employee branch have been matched.
	if "Branch Manager" in actor.roles:
		if not actor.branch:
			frappe.throw(_("Таны ажилтны бүртгэлд салбар тохируулаагүй байна."), frappe.PermissionError)
		return {
			"user": actor.user,
			"full_name": frappe.utils.get_fullname(actor.user),
			"branch": actor.branch,
			"mode": "manager",
			"profile": None,
			"employee": actor.employee,
			"can_scan_attendance": True,
		}
	if actor.roles.intersection({"Lead Entertainer", "Entertainer Supervisor"}):
		# Ахлах бүжигчин өөрийн ажилтны мэдээллийг харна. Нэмэлт эрх нь
		# зөвхөн салбарын өдөр тутмын бэлэн байдлын checklist-д хамаарна.
		entertainer_actor, profile = require_entertainer_profile()
		return {
			"user": entertainer_actor.user,
			"full_name": frappe.utils.get_fullname(entertainer_actor.user),
			"branch": profile.branch,
			"mode": "lead",
			"profile": profile.name,
			"employee": profile.employee,
			"can_scan_attendance": True,
			"can_view_guest_service": True,
		}
	if "Entertainer" in actor.roles:
		entertainer_actor, profile = require_entertainer_profile()
		return {
			"user": entertainer_actor.user,
			"full_name": frappe.utils.get_fullname(entertainer_actor.user),
			"branch": profile.branch,
			"mode": "entertainer",
			"profile": profile.name,
			"employee": profile.employee,
			"can_scan_attendance": True,
		}
	if actor.employee and actor.branch:
		designation = frappe.db.get_value("Employee", actor.employee, "designation")
		return {
			"user": actor.user,
			"full_name": frappe.utils.get_fullname(actor.user),
			"branch": actor.branch,
			"mode": "employee",
			"profile": None,
			"employee": actor.employee,
			"designation": designation,
			"can_scan_attendance": True,
			"can_view_guest_service": "Bartender" in actor.roles,
		}
	frappe.throw(_("Таны хэрэглэгч идэвхтэй ажилтны бүртгэлтэй холбогдоогүй байна."), frappe.PermissionError)


@frappe.whitelist(methods=["GET"])
def get_manager_dashboard(limit=50, cursor=0, query=None, status=None):
	actor = require_actor("Branch Manager", require_branch=True)
	branch = actor.branch or _branch_for_manager()
	page_size, offset = page_window(limit, cursor)
	query = (query or "").strip().casefold()
	status_filter = (status or "").strip().lower().replace(" ", "_")
	allowed_statuses = {
		"", "checked_in", "late", "scheduled", "off", "leave", "absent",
		"unavailable", "available", "reserved", "working", "break",
	}
	if status_filter not in allowed_statuses:
		frappe.throw(_("Сонгосон жагсаалтын төлөв хүчин төгөлдөр биш байна."), frappe.ValidationError)
	profiles = frappe.get_all(
		"VIP Entertainer Profile",
		filters={"branch": branch, "active": 1},
		fields=[
			"name", "employee", "employee_name", "stage_name", "lifecycle_status",
			"current_rank", "current_points", "profile_photo", "media_consent_status",
			"media_consent_expires_on", "is_demo",
		],
		order_by="stage_name asc, employee_name asc",
		ignore_permissions=True,
	)
	profile_names = [row.name for row in profiles]
	daily_rank_by_profile = current_daily_rank_by_profile(profile_names, get_all=frappe.get_all)
	employee_names = [row.employee for row in profiles if row.employee]
	projection_moment = now_datetime()
	shift_context_by_employee = resolve_shift_contexts(employee_names, projection_moment)
	work_date_by_profile = {
		profile.name: (
			shift_context_by_employee.get(profile.employee).work_date
			if shift_context_by_employee.get(profile.employee)
			else getdate(projection_moment)
		)
		for profile in profiles
	}
	work_dates = sorted(set(work_date_by_profile.values()))
	pending_profile_changes = set(frappe.get_all(
		"VIP Entertainer Profile Change Request",
		filters={"branch": branch, "status": "Pending"},
		pluck="entertainer",
		ignore_permissions=True,
	)) if profile_names else set()
	approved_leave_by_profile_date = {
		(row.entertainer, getdate(row.leave_date))
		for row in frappe.get_all(
			"VIP Emergency Leave Request",
			filters={
				"entertainer": ("in", profile_names),
				"leave_date": ("in", work_dates),
				"status": "Approved",
			},
			fields=["entertainer", "leave_date"],
			ignore_permissions=True,
		)
	} if profile_names and work_dates else set()
	absent_by_profile_date = {
		(row.entertainer, getdate(row.attendance_date))
		for row in frappe.get_all(
			"VIP Attendance Penalty",
			filters={
				"entertainer": ("in", profile_names),
				"attendance_date": ("in", work_dates),
				"penalty_type": "Absence",
				"status": ("in", ["Pending Review", "Approved"]),
			},
			fields=["entertainer", "attendance_date"],
			ignore_permissions=True,
		)
	} if profile_names and work_dates else set()
	availability_by_profile = {}
	if profile_names and work_dates:
		for event in frappe.get_all(
			"VIP Availability Event",
			filters={"entertainer": ("in", profile_names), "work_date": ("in", work_dates)},
			fields=["entertainer", "work_date", *AVAILABILITY_EVENT_FIELDS],
			order_by="occurred_at desc, creation desc",
			ignore_permissions=True,
		):
			event.status = canonical_availability_status(event.status) or event.status
			key = (event.entertainer, getdate(event.work_date))
			availability_by_profile.setdefault(key, event)
	checkins_by_employee = {employee: [] for employee in employee_names}
	active_contexts = [context for context in shift_context_by_employee.values() if context]
	if active_contexts:
		window_start = min(context.window_start for context in active_contexts)
		window_end = max(context.window_end for context in active_contexts)
		for event in frappe.get_all(
			"Employee Checkin",
			filters={
				"employee": ("in", employee_names),
				"time": ("between", [window_start, window_end]),
				"skip_auto_attendance": 0,
			},
			fields=["name", "employee", "time", "log_type"],
			order_by="time asc, creation asc",
			ignore_permissions=True,
		):
			context = shift_context_by_employee.get(event.employee)
			if context and context.window_start <= get_datetime(event.time) <= context.window_end:
				checkins_by_employee.setdefault(event.employee, []).append(event)
	shift_assignment_names = [context.assignment.name for context in active_contexts]
	readiness_by_assignment = {
		row.shift_assignment: row
		for row in frappe.get_all(
			"VIP Daily Readiness Check",
			filters={"shift_assignment": ("in", shift_assignment_names)},
			fields=["name", "entertainer", "shift_assignment", "result", "reason", "checked_at"],
			order_by="checked_at desc, creation desc",
			ignore_permissions=True,
		)
	} if shift_assignment_names else {}

	roster = []
	checked_in = 0
	late = 0
	pending_readiness = 0
	for profile in profiles:
		shift_context = shift_context_by_employee.get(profile.employee)
		shift = shift_context.assignment if shift_context else None
		work_date = work_date_by_profile[profile.name]
		approved_leave = (profile.name, work_date) in approved_leave_by_profile_date
		state = attendance_state(checkins_by_employee.get(profile.employee, []))
		checkin = state.latest
		arrival = next((event for event in state.events if event.log_type == "IN"), None)
		leave_missed = bool(approved_leave and not arrival and hourly_leave_counts_as_absence(
			work_date,
			moment=projection_moment,
		))
		fixed_penalty_arrival = bool(arrival and arrival_requires_fixed_penalty(work_date, arrival.time))
		late_minutes = 0 if approved_leave or fixed_penalty_arrival else (late_minutes_after_cutoff(branch, work_date, arrival.time) if arrival else 0)
		absence_penalty = (profile.name, work_date) in absent_by_profile_date
		availability = availability_by_profile.get((profile.name, work_date)) or frappe._dict({
			"name": None, "status": "Unavailable", "occurred_at": None, "note": None,
			"state_version": 0, "previous_version": 0, "previous_event": None,
		})
		readiness = readiness_by_assignment.get(shift.name) if shift else None
		if (absence_penalty and not state.checked_in) or leave_missed:
			row_status = "absent"
		elif approved_leave and state.checked_in:
			row_status = "checked_in"
			checked_in += 1
		elif approved_leave:
			row_status = "leave"
		elif state.checked_in:
			row_status = "late" if late_minutes else "checked_in"
			checked_in += 1
			late += 1 if late_minutes else 0
		elif shift:
			row_status = "late" if projection_moment > branch_late_cutoff(branch, work_date) else "scheduled"
			late += 1 if row_status == "late" else 0
		else:
			row_status = "off"
		if row_status != "checked_in":
			availability = frappe._dict({
				"name": availability.name,
				"status": "Unavailable",
				"occurred_at": availability.occurred_at,
				"note": None,
				"state_version": availability.get("state_version") or 0,
			})
		if shift and not readiness:
			pending_readiness += 1
		daily_rank = daily_rank_by_profile.get(profile.name)
		daily_complete = bool(daily_rank and daily_rank.get("status") == "Complete")
		roster.append({
			"profile": profile.name,
			"display_name": profile.stage_name or profile.employee_name or profile.name,
			"profile_change_pending": profile.name in pending_profile_changes,
			"rank": daily_rank.get("calculated_rank") if daily_complete else (profile.current_rank or DEFAULT_ENTERTAINER_RANK),
			"approved_rank": profile.current_rank or DEFAULT_ENTERTAINER_RANK,
			"daily_rank": daily_rank,
			"current_points": flt(daily_rank.get("displayed_score")) if daily_complete else flt(profile.current_points),
			"is_demo": bool(profile.is_demo),
			"lifecycle_status": profile.lifecycle_status,
			"photo": profile.profile_photo if can_project_media(profile) else None,
			"shift": shift,
			"work_date": work_date,
			"active_window": bool(shift_context and shift_context.is_active_window),
			"latest_checkin": checkin,
			"late_minutes": late_minutes,
			"readiness": readiness,
			"status": row_status,
			"availability": availability,
		})
	filtered_roster = [
		row for row in roster
		if (
			not status_filter
			or row["status"] == status_filter
			or str(row["availability"].status).strip().lower().replace(" ", "_") == status_filter
		)
		and (
			not query
			or query in row["display_name"].casefold()
			or query in row["profile"].casefold()
		)
	]
	paged_roster = filtered_roster[offset:offset + page_size]

	return {
		"branch": branch,
		"date": getdate(projection_moment),
		"generated_at": now_datetime(),
		"summary": {
			"total": len(profiles),
			"scheduled": sum(1 for row in roster if row["shift"]),
			"on_shift": checked_in,
			"checked_in": checked_in,
			"late": late,
			"absent": sum(1 for row in roster if row["status"] == "absent"),
			"leave": sum(1 for row in roster if row["status"] == "leave"),
			"off": sum(1 for row in roster if row["status"] == "off"),
			"available": sum(1 for row in roster if row["availability"].status == "Available"),
			"reserved": sum(1 for row in roster if row["availability"].status == "Reserved"),
			"working": sum(1 for row in roster if row["availability"].status == "Working"),
			"break": sum(1 for row in roster if row["availability"].status == "Break"),
			"pending_readiness": pending_readiness,
			"pending_leave": _pending_manager_leave_count(branch),
			"pending_corrections": frappe.db.count("VIP Attendance Correction Request", {"branch": branch, "status": "Pending"}),
			"pending_profile_changes": len(pending_profile_changes),
		},
		"roster": paged_roster,
		"meta": page_meta(
			branch=branch,
			limit=page_size,
			offset=offset,
			returned=len(paged_roster),
			total=len(filtered_roster),
		),
	}


@frappe.whitelist(methods=["GET"])
def get_manager_entertainer_detail(profile_name):
	actor = require_actor("Branch Manager", require_branch=True)
	branch = actor.branch or _branch_for_manager()
	profile_record = _manager_profile(profile_name, branch)
	payload = _workspace_payload(profile_name)
	projection_moment = now_datetime()
	shift_context = resolve_shift_context(profile_record.employee, projection_moment)
	work_date = shift_context.work_date if shift_context else getdate(projection_moment)
	availability = _latest_availability(profile_name, work_date)
	state = attendance_state(shift_checkins(profile_record.employee, shift_context))
	arrival = next((event for event in state.events if event.log_type == "IN"), None)
	approved_leave = bool(frappe.db.exists(
		"VIP Emergency Leave Request",
		{"entertainer": profile_name, "leave_date": work_date, "status": "Approved"},
	))
	leave_missed = bool(approved_leave and not arrival and hourly_leave_counts_as_absence(
		work_date,
		moment=projection_moment,
	))
	fixed_penalty_arrival = bool(arrival and arrival_requires_fixed_penalty(work_date, arrival.time))
	late_minutes = 0 if approved_leave or fixed_penalty_arrival else (late_minutes_after_cutoff(branch, work_date, arrival.time) if arrival else 0)
	absence_penalty = bool(frappe.db.exists(
		"VIP Attendance Penalty",
		{
			"entertainer": profile_name,
			"attendance_date": work_date,
			"penalty_type": "Absence",
			"status": ("in", ["Pending Review", "Approved"]),
		},
	))
	if (absence_penalty and not state.checked_in) or leave_missed:
		operational_status = "absent"
	elif approved_leave and state.checked_in:
		operational_status = "checked_in"
	elif approved_leave:
		operational_status = "leave"
	elif state.checked_in:
		operational_status = "late" if late_minutes else "checked_in"
	elif shift_context:
		operational_status = "late" if projection_moment > branch_late_cutoff(branch, work_date) else "scheduled"
	else:
		operational_status = "off"
	daily_rank = snapshot_payload(latest_daily_rank_snapshot(profile_name))
	component_audit = []
	# Keep the manager detail usable while a rolling deployment is between app
	# code update and DocType migration.  The audit is supplementary; the
	# confirmed profile and daily rank must not disappear because these newer
	# columns have not reached the database yet.
	rank_audit_columns = (
		"ranking_component",
		"component_score",
		"scoring_date",
		"evidence_json",
	)
	if all(frappe.db.has_column("VIP Performance Event", field) for field in rank_audit_columns):
		for event in frappe.get_all(
			"VIP Performance Event",
			filters={"entertainer": profile_name, "source": "daily_rank_assessment"},
			fields=["name", "ranking_component", "component_score", "scoring_date", "occurred_at", "evidence_json"],
			order_by="occurred_at desc, creation desc",
			limit=12,
			ignore_permissions=True,
		):
			try:
				evidence = json.loads(event.evidence_json or "{}")
			except (TypeError, ValueError):
				evidence = {}
			component_audit.append({
				"name": event.name,
				"component": event.ranking_component,
				"score": flt(event.component_score),
				"previous_score": evidence.get("previous_score"),
				"reason": evidence.get("reason"),
				"severity": evidence.get("severity"),
				"entered_by": evidence.get("entered_by"),
				"scoring_date": event.scoring_date,
				"occurred_at": event.occurred_at,
			})
	from nomad_vip.api.entertainer_finex import _lifetime_summary, _linked_dancer_ids, _summary
	# Manager detail must still open for a newly onboarded profile whose
	# transaction identity has not been reviewed/linked yet.  When a verified
	# link exists, return the complete performer-only projection so the manager
	# can see useful work evidence instead of four empty profile fields.
	performance = _summary(profile_record) if _linked_dancer_ids(profile_record.name) else None
	if performance:
		performance["lifetime"] = _lifetime_summary(profile_record)
	payload["branch"] = branch
	payload["performance"] = performance
	payload["profile"]["approved_rank"] = profile_record.current_rank or DEFAULT_ENTERTAINER_RANK
	payload["profile"]["daily_rank"] = daily_rank
	if daily_rank and daily_rank.get("status") == "Complete":
		payload["profile"]["current_points"] = daily_rank.get("displayed_score")
	payload["manager_controls"] = {
		"availability": availability,
		"availability_options": list(CANONICAL_AVAILABILITY_STATES),
		"operational": {
			"status": operational_status,
			"work_date": work_date,
			"active_window": bool(shift_context and shift_context.is_active_window),
			"shift": shift_context.assignment if shift_context else None,
			"latest_checkin": state.latest,
			"checked_in": state.checked_in,
			"checked_out": state.checked_out,
			"open": state.open,
			"late_minutes": late_minutes,
			"late_after_time": str(hourly_leave_arrival_cutoff(work_date).time() if approved_leave else branch_late_cutoff(branch, work_date).time()),
			"approved_leave": approved_leave,
			"hourly_leave_deadline_missed": leave_missed,
			"absence_penalty": absence_penalty,
		},
		"component_audit": component_audit,
		"daily_rank": daily_rank,
	}
	payload["meta"] = {
		"api_version": "2026-08-11",
		"generated_at": now_datetime(),
		"profile_version": profile_record.modified,
	}
	record_api_audit(
		actor=actor,
		action="manager.entertainer_detail.read",
		target_doctype="VIP Entertainer Profile",
		target_name=profile_name,
		details={"projection": "manager_branch_workforce"},
	)
	frappe.db.commit()
	return payload


@frappe.whitelist(methods=["POST"])
def manager_override_availability(
	profile_name,
	status,
	reason,
	expected_event=None,
	expected_version=None,
	idempotency_key=None,
):
	actor = require_actor("Branch Manager", require_branch=True)
	branch = actor.branch or _branch_for_manager()
	profile = _manager_profile(profile_name, branch)
	status = canonical_availability_status(status)
	if not status:
		frappe.throw(_("Сонгосон ажлын төлөв хүчин төгөлдөр биш байна."), frappe.ValidationError)
	reason = _required_reason(reason)
	idempotency_key = normalize_idempotency_key(idempotency_key)
	frappe.db.sql(
		"SELECT name FROM `tabVIP Entertainer Profile` WHERE name=%s FOR UPDATE",
		profile.name,
	)
	if idempotency_key:
		existing = frappe.db.get_value(
			"VIP Availability Event",
			{"entertainer": profile.name, "idempotency_key": idempotency_key},
			AVAILABILITY_EVENT_FIELDS,
			as_dict=True,
		)
		if existing:
			if not availability_request_matches(
				existing,
				status,
				reason,
				expected_event,
				expected_version,
			):
				_throw_idempotency_mismatch()
			return {"event": availability_event_payload(existing), "replayed": True}
	shift_context = resolve_shift_context(profile.employee)
	work_date = shift_context.work_date if shift_context else getdate(today())
	current = latest_availability(profile.name, work_date)
	_assert_availability_version(current, expected_event, expected_version)
	if status == current.status:
		return {"event": availability_event_payload(current), "previous_status": current.status, "replayed": True}
	if status != "Unavailable":
		state = attendance_state(shift_checkins(profile.employee, shift_context)) if shift_context else None
		if not state or not state.open:
			frappe.throw(_("Өнөөдрийн ирц нь бүртгэгдээгүй ажилтныг идэвхтэй ажлын төлөвт оруулах боломжгүй."), frappe.ValidationError)
	doc = frappe.get_doc(availability_event_values(
		profile=profile,
		branch=branch,
		work_date=work_date,
		status=status,
		reason=reason,
		actor=actor,
		current=current,
		idempotency_key=idempotency_key,
	)).insert(ignore_permissions=True)
	record_api_audit(
		actor=actor,
		action="manager.availability.override",
		target_doctype=doc.doctype,
		target_name=doc.name,
		idempotency_key=idempotency_key,
		details={
			"entertainer": profile.name,
			"from_status": current.status,
			"to_status": status,
			"from_event": current.name,
			"from_version": current.state_version,
			"to_version": doc.state_version,
			"reason": reason,
			"branch": branch,
			"occurred_at": str(doc.occurred_at),
		},
	)
	frappe.db.commit()
	return {
		"event": availability_event_payload(doc),
		"previous_status": current.status,
		"replayed": False,
	}


@frappe.whitelist(methods=["POST"])
def manager_override_rank(profile_name, rank, reason, expected_modified=None, idempotency_key=None):
	"""Reject the retired manual rank path; daily scoring is canonical."""
	require_actor("Branch Manager", require_branch=True)
	frappe.throw(_("Зэрэглэлийг өдөр тутмын 8 үзүүлэлтийн оноо автоматаар шинэчилнэ."), frappe.ValidationError)
