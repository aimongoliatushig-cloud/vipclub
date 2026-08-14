from __future__ import annotations

import json

import frappe
from frappe import _
from frappe.utils import get_datetime, getdate, now_datetime, today

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
from nomad_vip.services import get_branch_for_user


def _branch_for_manager() -> str:
	branch = get_branch_for_user()
	if not branch:
		frappe.throw(_("Таны ажилтны бүртгэлд салбар тохируулаагүй байна."), frappe.PermissionError)
	return branch


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
			"lifecycle_status", "current_rank", "current_points", "modified",
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
		return {
			"user": actor.user,
			"full_name": frappe.utils.get_fullname(actor.user),
			"branch": actor.branch,
			"mode": "employee",
			"profile": None,
			"employee": actor.employee,
			"can_scan_attendance": True,
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
			"current_rank", "profile_photo", "media_consent_status",
			"media_consent_expires_on", "is_demo",
		],
		order_by="stage_name asc, employee_name asc",
		ignore_permissions=True,
	)
	profile_names = [row.name for row in profiles]
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
		absence_penalty = (profile.name, work_date) in absent_by_profile_date
		availability = availability_by_profile.get((profile.name, work_date)) or frappe._dict({
			"name": None, "status": "Unavailable", "occurred_at": None, "note": None,
			"state_version": 0, "previous_version": 0, "previous_event": None,
		})
		readiness = readiness_by_assignment.get(shift.name) if shift else None
		if approved_leave:
			row_status = "leave"
		elif absence_penalty:
			row_status = "absent"
		elif state.open:
			row_status = "checked_in"
			checked_in += 1
		elif shift:
			row_status = "late" if shift_context.start and projection_moment > shift_context.start else "scheduled"
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
		roster.append({
			"profile": profile.name,
			"display_name": profile.stage_name or profile.employee_name or profile.name,
			"profile_change_pending": profile.name in pending_profile_changes,
			"rank": profile.current_rank or "Gold",
			"is_demo": bool(profile.is_demo),
			"lifecycle_status": profile.lifecycle_status,
			"photo": profile.profile_photo if can_project_media(profile) else None,
			"shift": shift,
			"work_date": work_date,
			"active_window": bool(shift_context and shift_context.is_active_window),
			"latest_checkin": checkin,
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
			"pending_leave": frappe.db.count("VIP Emergency Leave Request", {"branch": branch, "status": "Pending"}),
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
	approved_leave = bool(frappe.db.exists(
		"VIP Emergency Leave Request",
		{"entertainer": profile_name, "leave_date": work_date, "status": "Approved"},
	))
	absence_penalty = bool(frappe.db.exists(
		"VIP Attendance Penalty",
		{
			"entertainer": profile_name,
			"attendance_date": work_date,
			"penalty_type": "Absence",
			"status": ("in", ["Pending Review", "Approved"]),
		},
	))
	if approved_leave:
		operational_status = "leave"
	elif absence_penalty:
		operational_status = "absent"
	elif state.open:
		operational_status = "checked_in"
	elif shift_context:
		operational_status = "late" if projection_moment > shift_context.start else "scheduled"
	else:
		operational_status = "off"
	rank_options = frappe.get_all(
		"VIP Rank Definition",
		filters={"active": 1},
		fields=["name", "code", "rank_order", "minimum_points"],
		order_by="rank_order asc",
		ignore_permissions=True,
	)
	rank_audit = []
	from nomad_vip.api.entertainer_finex import _summary
	finex_rank = _summary(profile_record)
	for event in frappe.get_all(
		"VIP API Audit Event",
		filters={
			"branch": branch,
			"action": "manager.entertainer_rank.override",
			"target_doctype": "VIP Entertainer Profile",
			"target_name": profile_name,
			"outcome": "Succeeded",
		},
		fields=["name", "actor", "occurred_at", "details"],
		order_by="occurred_at desc",
		limit=10,
		ignore_permissions=True,
	):
		try:
			details = json.loads(event.details or "{}")
		except (TypeError, ValueError):
			details = {}
		rank_audit.append({
			"name": event.name,
			"actor": event.actor,
			"occurred_at": event.occurred_at,
			"from_rank": details.get("from_rank"),
			"to_rank": details.get("to_rank"),
			"reason": details.get("reason"),
		})
	payload["branch"] = branch
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
			"approved_leave": approved_leave,
			"absence_penalty": absence_penalty,
		},
		"rank_options": rank_options,
		"rank_audit": rank_audit,
		"rank_recommendation": {
			"rank": finex_rank["rank"]["current"].get("name"),
			"points": finex_rank["points"],
			"source": "Сүүлийн 62 хоногийн борлуулалтын нотолгоо",
			"requires_human_approval": True,
		},
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
	actor = require_actor("Branch Manager", require_branch=True)
	branch = actor.branch or _branch_for_manager()
	profile = _manager_profile(profile_name, branch)
	reason = _required_reason(reason)
	idempotency_key = normalize_idempotency_key(idempotency_key)
	frappe.db.sql(
		"SELECT name FROM `tabVIP Entertainer Profile` WHERE name=%s FOR UPDATE",
		profile.name,
	)
	if idempotency_key:
		existing = frappe.db.get_value(
			"VIP API Audit Event",
			{
				"actor": actor.user,
				"action": "manager.entertainer_rank.override",
				"target_doctype": "VIP Entertainer Profile",
				"target_name": profile.name,
				"idempotency_key": idempotency_key,
				"outcome": "Succeeded",
			},
			["name", "details", "occurred_at"],
			as_dict=True,
		)
		if existing:
			try:
				details = json.loads(existing.details or "{}")
			except (TypeError, ValueError):
				details = {}
			if details.get("to_rank") != rank or details.get("reason") != reason:
				_throw_idempotency_mismatch()
			return {"rank": details.get("to_rank"), "audit": existing.name, "replayed": True}
	assert_not_stale("VIP Entertainer Profile", profile.name, expected_modified)
	rank_record = frappe.db.get_value(
		"VIP Rank Definition", rank, ["name", "code", "active", "rank_order"], as_dict=True
	)
	if not rank_record or not rank_record.active:
		frappe.throw(_("Идэвхтэй, батлагдсан зэрэглэл сонгоно уу."), frappe.ValidationError)
	old_rank = profile.current_rank or "Gold"
	if rank_record.name == old_rank:
		return {"rank": old_rank, "profile_modified": profile.modified, "replayed": True}
	changed_at = now_datetime()
	frappe.db.set_value(
		"VIP Entertainer Profile",
		profile.name,
		{"current_rank": rank_record.name, "rank_last_calculated_at": changed_at},
		update_modified=True,
	)
	history = frappe.get_doc({
		"doctype": "VIP Rank History",
		"entertainer": profile.name,
		"from_rank": old_rank,
		"to_rank": rank_record.name,
		"points_at_change": profile.current_points or 0,
		"changed_at": changed_at,
		"reason": reason,
	}).insert(ignore_permissions=True)
	audit = record_api_audit(
		actor=actor,
		action="manager.entertainer_rank.override",
		target_doctype="VIP Entertainer Profile",
		target_name=profile.name,
		idempotency_key=idempotency_key,
		details={
			"from_rank": old_rank,
			"to_rank": rank_record.name,
			"reason": reason,
			"rank_history": history.name,
		},
	)
	frappe.db.commit()
	return {
		"rank": rank_record.name,
		"history": history.name,
		"audit": audit,
		"profile_modified": frappe.db.get_value("VIP Entertainer Profile", profile.name, "modified"),
		"replayed": False,
	}
