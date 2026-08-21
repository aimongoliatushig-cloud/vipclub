from __future__ import annotations

from datetime import timedelta
import json

import frappe
from frappe import _
from frappe.utils import flt, get_datetime, get_time, getdate, now_datetime, today

from nomad_vip.api.security import (
	assert_not_stale,
	normalize_idempotency_key,
	page_meta,
	page_window,
	record_api_audit,
	require_actor,
	require_entertainer_profile,
)
from nomad_vip.api.availability import (
	AVAILABILITY_EVENT_FIELDS,
	_assert_availability_version,
	availability_event_payload,
	availability_event_values,
	availability_request_matches,
	latest_availability,
)
from nomad_vip.api.shift_state import (
	attendance_state,
	resolve_shift_context,
	shift_checkins,
	shift_context_for_work_date,
)
from nomad_vip.availability_policy import (
	canonical_availability_status,
	entertainer_availability_next,
	entertainer_can_transition,
)


CORRECTION_FIELDS = [
	"name", "entertainer", "employee", "branch", "attendance_date", "correction_type",
	"requested_time", "reason", "status", "requested_at", "decided_by", "decided_at",
	"decision_reason", "shift_assignment", "proposed_at", "original_checkin", "original_time",
	"original_checkin_modified", "applied_checkin", "reversed_penalties", "modified",
]


def _latest_availability(profile_name, work_date=None):
	return latest_availability(profile_name, work_date or today())


def _verified_minutes(employee):
	month_start = getdate(today()).replace(day=1)
	rows = frappe.get_all(
		"Employee Checkin",
		filters={
			"employee": employee,
			"time": (">=", f"{month_start} 00:00:00"),
			"skip_auto_attendance": 0,
		},
		fields=["time", "log_type"],
		order_by="time asc",
		ignore_permissions=True,
	)
	verified_minutes, completed_days = _verified_minutes_from_rows(rows)
	arrival_days = len({str(getdate(row.time)) for row in rows if row.log_type == "IN"})
	return verified_minutes, completed_days, arrival_days


def _verified_minutes_from_rows(rows):
	"""Pair chronological IN/OUT events, including shifts that cross midnight."""
	total_seconds = 0
	completed_days = set()
	opened = None
	for event in rows:
		moment = get_datetime(event.time)
		if event.log_type == "IN":
			# A second IN starts a new candidate pair; an unclosed event is not billable evidence.
			opened = moment
		elif event.log_type == "OUT" and opened:
			elapsed = (moment - opened).total_seconds()
			# Reject reversed or implausibly long pairs instead of inflating an employee summary.
			if 0 < elapsed <= 24 * 60 * 60:
				total_seconds += elapsed
				completed_days.add(str(getdate(opened)))
			opened = None
	return int(total_seconds // 60), len(completed_days)


def _serialize_correction(row):
	return {field: row.get(field) for field in CORRECTION_FIELDS}


def _requested_datetime(context, requested_time):
	"""Map a wall-clock correction time into an operational shift window."""
	clock = get_time(requested_time)
	work_date = getdate(context.work_date)
	candidates = [
		get_datetime(f"{work_date} {clock}"),
		get_datetime(f"{work_date + timedelta(days=1)} {clock}"),
	]
	valid = [moment for moment in candidates if context.window_start <= moment <= context.window_end]
	if len(valid) != 1:
		frappe.throw(
			_("Санал болгосон цаг тухайн ээлжийн зөвшөөрөгдсөн хугацаанд багтахгүй байна."),
			frappe.ValidationError,
		)
	return valid[0]


def _validate_correction_sequence(rows, log_type, proposed_at, original_checkin=None):
	"""Fail closed unless the corrected effective evidence is a single IN → OUT pair."""
	events = [
		frappe._dict({"name": row.name, "time": get_datetime(row.time), "log_type": row.log_type})
		for row in rows
		if row.name != original_checkin
	]
	events.append(frappe._dict({"name": "PROPOSED", "time": get_datetime(proposed_at), "log_type": log_type}))
	events.sort(key=lambda row: (row.time, row.name))
	if len(events) > 2 or events[0].log_type != "IN" or any(
		left.log_type == right.log_type for left, right in zip(events, events[1:])
	):
		frappe.throw(
			_("Энэ ээлжид олон эсвэл зөрчилтэй ирцийн бүртгэл байна. Системийн админ эх нотолгоог шалгана."),
			frappe.ValidationError,
		)
	if len(events) == 2 and events[1].log_type != "OUT":
		frappe.throw(_("Гарах цаг нь орсон цагаас хойш байх ёстой."), frappe.ValidationError)
	if len(events) == 1 and log_type != "IN":
		frappe.throw(_("Гарах цаг засахаас өмнө орсон цаг бүртгэлтэй байх шаардлагатай."), frappe.ValidationError)
	return events


def _correction_evidence(employee, attendance_date, correction_type, requested_time):
	context = shift_context_for_work_date(employee, attendance_date)
	if not context:
		frappe.throw(_("Сонгосон өдөр баталгаатай ээлж олдсонгүй."), frappe.ValidationError)
	proposed_at = _requested_datetime(context, requested_time)
	log_type = "IN" if correction_type == "Check-in" else "OUT"
	rows = shift_checkins(employee, context)
	same_type = [row for row in rows if row.log_type == log_type]
	if len(same_type) > 1:
		frappe.throw(
			_("Энэ ээлжид ижил төрлийн олон ирц байна. Системийн админ эх нотолгоог шалгана."),
			frappe.ValidationError,
		)
	original = same_type[0] if same_type else None
	_validate_correction_sequence(rows, log_type, proposed_at, original.name if original else None)
	return context, proposed_at, original


def _affected_penalties(doc, context, original_checkin=None):
	if doc.correction_type != "Check-in":
		return []
	rows = frappe.get_all(
		"VIP Attendance Penalty",
		filters={
			"entertainer": doc.entertainer,
			"attendance_date": doc.attendance_date,
			"status": "Approved",
		},
		fields=["name", "penalty_type", "amount", "source_checkin", "shift_assignment"],
		ignore_permissions=True,
	)
	return [
		row for row in rows
		if (
			row.penalty_type == "Late"
			and original_checkin
			and row.source_checkin == original_checkin
		) or (
			row.penalty_type == "Absence"
			and row.shift_assignment == context.assignment.name
		)
	]


def _manager_correction_payload(row):
	payload = _serialize_correction(row)
	context = shift_context_for_work_date(row.employee, row.attendance_date)
	if not context or context.assignment.name != row.shift_assignment:
		payload["review_blocked_reason"] = _("Ээлжийн эх нотолгоо өөрчлөгдсөн байна. Системийн админ шалгана.")
		payload["penalties"] = []
		return payload
	penalties = _affected_penalties(row, context, row.original_checkin)
	payload.update({
		"shift_start": context.start,
		"shift_end": context.end,
		"penalties": [
			{"name": penalty.name, "penalty_type": penalty.penalty_type, "amount": flt(penalty.amount)}
			for penalty in penalties
		],
		"review_blocked_reason": None,
	})
	return payload


def _throw_idempotency_mismatch() -> None:
	frappe.throw(
		_("Энэ давхардал хамгаалах түлхүүрийг өөр хүсэлтэд ашигласан байна."),
		frappe.TimestampMismatchError,
	)


@frappe.whitelist(methods=["GET"])
def get_workday():
	_actor, profile = require_entertainer_profile("stage_name", "employee_name")
	shift_context = resolve_shift_context(profile.employee)
	shift = shift_context.assignment if shift_context else None
	checkins = shift_checkins(profile.employee, shift_context)
	state = attendance_state(checkins)
	work_date = shift_context.work_date if shift_context else getdate(today())
	availability = _latest_availability(profile.name, work_date)
	verified_minutes, completed_days, arrival_days = _verified_minutes(profile.employee)
	corrections = frappe.get_all(
		"VIP Attendance Correction Request",
		filters={"entertainer": profile.name},
		fields=CORRECTION_FIELDS,
		order_by="requested_at desc",
		limit=12,
		ignore_permissions=True,
	)
	reservations = frappe.db.count(
		"VIP Reservation",
		{"entertainer": profile.name, "status": "Completed", "ends_at": (">=", f"{getdate(today()).replace(day=1)} 00:00:00")},
	)
	checked_in = state.checked_in
	checked_out = state.checked_out
	allowed = list(entertainer_availability_next(availability.status)) if checked_in and not checked_out else []
	return {
		"date": work_date,
		"profile": {"name": profile.name, "display_name": profile.stage_name or profile.employee_name or profile.name, "branch": profile.branch},
		"shift": shift,
		"attendance": {
			"checked_in": checked_in,
			"checked_out": checked_out,
			"open": state.open,
			"attendance_mode": "arrival_only",
			"requires_checkout": False,
			"attendance_complete": checked_in,
			"events": checkins,
		},
		"availability": {**availability, "allowed_next": allowed},
		"summary": {
			"verified_minutes": verified_minutes,
			"completed_days": completed_days,
			"arrival_days": arrival_days,
			"completed_services": reservations,
		},
		"correction_requests": corrections,
	}


@frappe.whitelist(methods=["POST"])
def transition_availability(
	status,
	note="",
	expected_event=None,
	expected_version=None,
	idempotency_key=None,
):
	actor, profile = require_entertainer_profile()
	status = canonical_availability_status(status)
	note = (note or "").strip()
	idempotency_key = normalize_idempotency_key(idempotency_key)
	if not status:
		frappe.throw(_("Сонгосон ажлын төлөв хүчин төгөлдөр биш байна."), frappe.ValidationError)
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
				note,
				expected_event,
				expected_version,
			):
				_throw_idempotency_mismatch()
			return {"event": availability_event_payload(existing), "replayed": True}
	shift_context = resolve_shift_context(profile.employee)
	work_date = shift_context.work_date if shift_context else getdate(today())
	current = _latest_availability(profile.name, work_date)
	_assert_availability_version(current, expected_event, expected_version)
	if status == current.status:
		return {"event": availability_event_payload(current), "replayed": True}
	if not entertainer_can_transition(current.status, status):
		frappe.throw(_("{0} төлвөөс {1} төлөвт шууд шилжих боломжгүй.").format(current.status, status), frappe.ValidationError)
	state = attendance_state(shift_checkins(profile.employee, shift_context))
	if not state.open:
		frappe.throw(_("Эхлээд өнөөдрийн ирцээ QR-аар бүртгэнэ үү."), frappe.ValidationError)
	doc = frappe.get_doc(availability_event_values(
		profile=profile,
		branch=profile.branch,
		work_date=work_date,
		status=status,
		reason=note,
		actor=actor,
		current=current,
		idempotency_key=idempotency_key,
	)).insert(ignore_permissions=True)
	record_api_audit(
		actor=actor,
		action="entertainer.availability.transition",
		target_doctype=doc.doctype,
		target_name=doc.name,
		idempotency_key=idempotency_key,
		details={
			"from_status": current.status,
			"to_status": status,
			"from_event": current.name,
			"from_version": current.state_version,
			"to_version": doc.state_version,
			"reason": note,
			"branch": profile.branch,
			"occurred_at": str(doc.occurred_at),
		},
	)
	frappe.db.commit()
	return {"event": availability_event_payload(doc), "replayed": False}


@frappe.whitelist(methods=["POST"])
def submit_attendance_correction(attendance_date, correction_type, requested_time, reason, idempotency_key=None):
	actor, profile = require_entertainer_profile()
	day = getdate(attendance_date)
	if day > getdate(today()):
		frappe.throw(_("Ирээдүйн ирцийг засварлуулах боломжгүй."), frappe.ValidationError)
	if (getdate(today()) - day).days > 31:
		frappe.throw(_("31 хоногоос өмнөх ирцийг энэ урсгалаар засварлуулах боломжгүй."), frappe.ValidationError)
	correction_type = (correction_type or "").strip()
	if correction_type != "Check-in":
		frappe.throw(_("Бүжигчний ирц зөвхөн ирсэн цагаар бүртгэгдэнэ."), frappe.ValidationError)
	reason = (reason or "").strip()
	if len(reason) < 5:
		frappe.throw(_("Шалтгааныг хамгийн багадаа 5 тэмдэгтээр бичнэ үү."), frappe.ValidationError)
	requested_time = get_time(requested_time)
	idempotency_key = normalize_idempotency_key(idempotency_key)
	frappe.db.sql(
		"SELECT name FROM `tabVIP Entertainer Profile` WHERE name=%s FOR UPDATE",
		profile.name,
	)
	if idempotency_key:
		existing = frappe.db.get_value("VIP Attendance Correction Request", {"entertainer": profile.name, "idempotency_key": idempotency_key}, CORRECTION_FIELDS, as_dict=True)
		if existing:
			if (
				getdate(existing.attendance_date) != day
				or existing.correction_type != correction_type
				or get_time(existing.requested_time) != requested_time
				or (existing.reason or "").strip() != reason
			):
				_throw_idempotency_mismatch()
			return {"request": _serialize_correction(existing), "replayed": True}
	if frappe.db.exists("VIP Attendance Correction Request", {"entertainer": profile.name, "attendance_date": day, "correction_type": correction_type, "status": "Pending"}):
		frappe.throw(_("Энэ өдрийн ижил төрлийн хүсэлт хүлээгдэж байна."), frappe.ValidationError)
	context, proposed_at, original = _correction_evidence(
		profile.employee,
		day,
		correction_type,
		requested_time,
	)
	doc = frappe.get_doc({
		"doctype": "VIP Attendance Correction Request", "entertainer": profile.name, "employee": profile.employee,
		"branch": profile.branch, "attendance_date": day, "correction_type": correction_type,
		"requested_time": requested_time, "reason": reason, "status": "Pending", "requested_at": now_datetime(),
		"shift_assignment": context.assignment.name, "proposed_at": proposed_at,
		"original_checkin": original.name if original else None,
		"original_time": original.time if original else None,
		"original_checkin_modified": original.modified if original else None,
		"idempotency_key": idempotency_key,
	}).insert(ignore_permissions=True)
	record_api_audit(actor=actor, action="entertainer.attendance_correction.create", target_doctype=doc.doctype, target_name=doc.name, idempotency_key=idempotency_key, details={"date": str(day), "type": correction_type, "proposed_at": str(proposed_at), "shift_assignment": context.assignment.name, "original_checkin": original.name if original else None, "original_time": str(original.time) if original else None, "reason": reason})
	frappe.db.commit()
	return {"request": _serialize_correction(doc), "replayed": False}


@frappe.whitelist(methods=["GET"])
def get_manager_correction_requests(status="Pending", limit=100, cursor=0):
	actor = require_actor("Branch Manager", require_branch=True)
	page_size, offset = page_window(limit, cursor)
	status = (status or "Pending").strip().title()
	if status not in ("Pending", "Approved", "Rejected", "All"):
		frappe.throw(_("Сонгосон хүсэлтийн төлөв хүчинтэй биш байна."), frappe.ValidationError)
	filters = {"branch": actor.branch}
	if status != "All":
		filters["status"] = status
	total = frappe.db.count("VIP Attendance Correction Request", filters)
	rows = frappe.get_all(
		"VIP Attendance Correction Request",
		filters=filters,
		fields=CORRECTION_FIELDS,
		order_by="requested_at asc",
		limit_start=offset,
		limit_page_length=page_size,
		ignore_permissions=True,
	)
	for row in rows:
		row["display_name"] = frappe.db.get_value("VIP Entertainer Profile", row.entertainer, "stage_name") or row.entertainer
	rows = [_manager_correction_payload(row) for row in rows]
	return {
		"branch": actor.branch,
		"requests": rows,
		"meta": page_meta(
			branch=actor.branch,
			limit=page_size,
			offset=offset,
			returned=len(rows),
			total=total,
		),
	}


@frappe.whitelist(methods=["POST"])
def decide_attendance_correction(request_name, decision, reason="", expected_modified=None, idempotency_key=None):
	actor = require_actor("Branch Manager", require_branch=True)
	decision = (decision or "").strip().title()
	if decision not in ("Approved", "Rejected"):
		frappe.throw(_("Шийдвэрийн утга хүчин төгөлдөр биш байна."), frappe.ValidationError)
	reason = (reason or "").strip()
	if decision == "Rejected" and len(reason) < 3:
		frappe.throw(_("Татгалзсан шалтгааныг бичнэ үү."), frappe.ValidationError)
	frappe.db.sql(
		"SELECT name FROM `tabVIP Attendance Correction Request` WHERE name=%s FOR UPDATE",
		request_name,
	)
	doc = frappe.get_doc("VIP Attendance Correction Request", request_name)
	if doc.branch != actor.branch:
		frappe.throw(_("Өөр салбарын хүсэлтийг шийдвэрлэх эрхгүй."), frappe.PermissionError)
	idempotency_key = normalize_idempotency_key(idempotency_key)
	audit_name = idempotency_key and frappe.db.exists("VIP API Audit Event", {"actor": actor.user, "action": "manager.attendance_correction.decide", "target_name": doc.name, "idempotency_key": idempotency_key, "outcome": "Succeeded"})
	if audit_name:
		if isinstance(audit_name, str):
			raw_details = frappe.db.get_value("VIP API Audit Event", audit_name, "details")
			try:
				details = json.loads(raw_details or "{}")
			except (TypeError, ValueError):
				details = {}
			recorded_decision = details.get("decision", doc.status)
			recorded_reason = details.get("reason", (doc.decision_reason or "").strip())
			if recorded_decision != decision or recorded_reason != reason:
				_throw_idempotency_mismatch()
		return {"name": doc.name, "status": doc.status, "replayed": True}
	assert_not_stale(doc.doctype, doc.name, expected_modified)
	if doc.status != "Pending":
		frappe.throw(_("Энэ хүсэлтийг өмнө нь шийдвэрлэсэн байна."), frappe.ValidationError)
	applied_checkin = None
	reversed_penalties = []
	audit_details = {"decision": decision, "reason": reason}
	if decision == "Approved":
		log_type = "IN" if doc.correction_type == "Check-in" else "OUT"
		context = shift_context_for_work_date(doc.employee, doc.attendance_date)
		if not context or context.assignment.name != doc.shift_assignment:
			frappe.throw(_("Ээлжийн эх нотолгоо өөрчлөгдсөн байна. Системийн админ шалгана."), frappe.TimestampMismatchError)
		requested_at = _requested_datetime(context, doc.requested_time)
		if not doc.proposed_at or get_datetime(doc.proposed_at) != requested_at:
			frappe.throw(_("Хүсэлтийн санал болгосон цаг өөрчлөгдсөн байна. Дахин ачаална уу."), frappe.TimestampMismatchError)
		rows = shift_checkins(doc.employee, context)
		original = None
		if doc.original_checkin:
			frappe.db.sql(
				"SELECT name FROM `tabEmployee Checkin` WHERE name=%s FOR UPDATE",
				doc.original_checkin,
			)
			original = frappe.get_doc("Employee Checkin", doc.original_checkin)
			assert_not_stale("Employee Checkin", original.name, doc.original_checkin_modified)
			if original.employee != doc.employee or original.log_type != log_type or original.skip_auto_attendance:
				frappe.throw(_("Ирцийн эх нотолгоо өөрчлөгдсөн байна. Системийн админ шалгана."), frappe.TimestampMismatchError)
			if get_datetime(original.time) != get_datetime(doc.original_time):
				frappe.throw(_("Ирцийн эх цаг өөрчлөгдсөн байна. Дахин шалгана уу."), frappe.TimestampMismatchError)
			if not any(row.name == original.name for row in rows):
				frappe.throw(_("Ирцийн эх нотолгоо тухайн ээлжид хамаарахгүй байна."), frappe.TimestampMismatchError)
		elif any(row.log_type == log_type for row in rows):
			frappe.throw(_("Ижил төрлийн ирц шинээр бүртгэгдсэн байна. Дахин ачаална уу."), frappe.TimestampMismatchError)

		_validate_correction_sequence(rows, log_type, requested_at, original.name if original else None)
		penalties = _affected_penalties(doc, context, original.name if original else None)
		checkin = frappe.get_doc({
			"doctype": "Employee Checkin",
			"employee": doc.employee,
			"time": requested_at,
			"log_type": log_type,
			"shift": context.assignment.shift_type,
			"skip_auto_attendance": 0,
		}).insert(ignore_permissions=True)
		applied_checkin = checkin.name
		if original:
			frappe.db.set_value("Employee Checkin", original.name, "skip_auto_attendance", 1, update_modified=True)
		for penalty in penalties:
			frappe.db.set_value(
				"VIP Attendance Penalty",
				penalty.name,
				{
					"status": "Reversed",
					"reversed_by": actor.user,
					"reversed_at": now_datetime(),
					"reversal_reason": _("Ирцийн засварын хүсэлт зөвшөөрөгдсөн."),
				},
				update_modified=True,
			)
			reversed_penalties.append(penalty.name)
		audit_details.update({
			"shift_assignment": context.assignment.name,
			"original_checkin": original.name if original else None,
			"original_time": str(original.time) if original else None,
			"applied_checkin": applied_checkin,
			"applied_time": str(requested_at),
			"reversed_penalties": reversed_penalties,
		})
	frappe.db.set_value(doc.doctype, doc.name, {
		"status": decision,
		"decided_by": actor.user,
		"decided_at": now_datetime(),
		"decision_reason": reason,
		"applied_checkin": applied_checkin,
		"reversed_penalties": json.dumps(reversed_penalties),
	}, update_modified=True)
	record_api_audit(actor=actor, action="manager.attendance_correction.decide", target_doctype=doc.doctype, target_name=doc.name, idempotency_key=idempotency_key, details=audit_details)
	frappe.db.commit()
	return {
		"name": doc.name,
		"status": decision,
		"applied_checkin": applied_checkin,
		"reversed_penalties": reversed_penalties,
		"replayed": False,
	}
