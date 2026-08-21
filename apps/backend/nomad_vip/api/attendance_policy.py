from __future__ import annotations

import calendar
import json
import math
import re
from datetime import time, timedelta

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
from nomad_vip.services import get_branch_for_user


POLICY_DOCTYPE = "VIP Attendance Policy"
DEFAULT_BRANCH_LATE_AFTER_TIME = "22:00:00"
DEFAULT_HOURLY_LEAVE_ARRIVAL_DEADLINE = "00:00:00"
MANAGER_LATE_REVIEW_MINUTES = 10
MONTH_KEY_PATTERN = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")
LEAVE_REQUEST_FIELDS = [
	"name", "entertainer", "employee", "branch", "leave_date", "status", "requested_at",
	"reason", "decided_by", "decided_at", "decision_reason", "modified",
]


def _policy() -> frappe._dict:
	return frappe._dict({
		"absence_deduction": flt(frappe.db.get_single_value(POLICY_DOCTYPE, "absence_deduction") or 150000),
		"late_deduction_per_minute": flt(frappe.db.get_single_value(POLICY_DOCTYPE, "late_deduction_per_minute") or 500),
		"same_day_request_deadline": str(frappe.db.get_single_value(POLICY_DOCTYPE, "same_day_request_deadline") or "21:00:00"),
		"request_deadline_basis": "previous_day",
		"emergency_leave_monthly_limit": int(frappe.db.get_single_value(POLICY_DOCTYPE, "emergency_leave_monthly_limit") or 3),
		"hourly_leave_arrival_deadline": str(frappe.db.get_single_value(POLICY_DOCTYPE, "hourly_leave_arrival_deadline") or DEFAULT_HOURLY_LEAVE_ARRIVAL_DEADLINE),
		"timezone": frappe.db.get_single_value(POLICY_DOCTYPE, "timezone") or "Asia/Ulaanbaatar",
	})


def get_branch_late_after_time(branch: str):
	value = frappe.db.get_value("VIP Branch Attendance QR", branch, "late_after_time")
	return get_time(value or DEFAULT_BRANCH_LATE_AFTER_TIME)


def branch_late_cutoff(branch: str, work_date):
	"""Return the branch-specific arrival deadline for an operational workday."""
	cutoff_time = get_branch_late_after_time(branch)
	cutoff = get_datetime(f"{getdate(work_date)} {cutoff_time}")
	if cutoff_time < time(12, 0):
		cutoff += timedelta(days=1)
	return cutoff


def late_minutes_after_cutoff(branch: str, work_date, arrival_time) -> int:
	late_seconds = (get_datetime(arrival_time) - branch_late_cutoff(branch, work_date)).total_seconds()
	return max(0, int(math.ceil(late_seconds / 60)))


def hourly_leave_arrival_cutoff(work_date, policy=None):
	"""Return the midnight arrival limit for an approved hourly-leave day."""
	policy = policy or _policy()
	deadline_time = get_time(policy.hourly_leave_arrival_deadline or DEFAULT_HOURLY_LEAVE_ARRIVAL_DEADLINE)
	cutoff = get_datetime(f"{getdate(work_date)} {deadline_time}")
	if deadline_time < time(12, 0):
		cutoff += timedelta(days=1)
	return cutoff


def has_approved_hourly_leave(*, entertainer=None, employee=None, work_date) -> bool:
	filters = {"leave_date": getdate(work_date), "status": "Approved"}
	if entertainer:
		filters["entertainer"] = entertainer
	elif employee:
		filters["employee"] = employee
	else:
		return False
	return bool(frappe.db.exists("VIP Emergency Leave Request", filters))


def hourly_leave_counts_as_absence(work_date, *, arrival_time=None, moment=None) -> bool:
	"""Approved hourly leave becomes an absence after its arrival deadline."""
	reference = get_datetime(arrival_time or moment or now_datetime())
	return reference > hourly_leave_arrival_cutoff(work_date)


def arrival_requires_fixed_penalty(work_date, arrival_time) -> bool:
	"""Return whether a recorded arrival crossed the 00:00 fixed-penalty boundary."""
	return get_datetime(arrival_time) >= hourly_leave_arrival_cutoff(work_date)


def _profile(profile_name: str) -> frappe._dict:
	profile = frappe.db.get_value(
		"VIP Entertainer Profile",
		profile_name,
		["name", "employee", "branch", "active", "lifecycle_status"],
		as_dict=True,
	)
	if not profile or not profile.active:
		frappe.throw(_("Ажилтны идэвхтэй профайл олдсонгүй."), frappe.PermissionError)
	return profile


def _month_bounds(value):
	day = getdate(value)
	return day.replace(day=1), day.replace(day=calendar.monthrange(day.year, day.month)[1])


def _month_reference(month=None):
	month_key = str(month or "").strip()
	if not month_key:
		return getdate(today())
	if not MONTH_KEY_PATTERN.fullmatch(month_key):
		frappe.throw(_("Сарыг YYYY-MM хэлбэрээр сонгоно уу."))
	return getdate(f"{month_key}-01")


def _leave_request_cutoff(leave_date, deadline):
	"""Return the previous calendar day's cutoff for an overnight club shift."""
	leave_day = getdate(leave_date)
	cutoff_day = leave_day - timedelta(days=1)
	return get_datetime(f"{cutoff_day} {get_time(deadline)}")


def _leave_count(profile_name: str, leave_date) -> int:
	start, end = _month_bounds(leave_date)
	return frappe.db.count(
		"VIP Emergency Leave Request",
		filters={
			"entertainer": profile_name,
			"leave_date": ("between", [start, end]),
			"status": ("in", ["Pending", "Approved"]),
		},
	)


def _serialize_request(row) -> dict:
	return {
		"name": row.name,
		"entertainer": row.entertainer,
		"employee": row.employee,
		"branch": row.branch,
		"leave_date": row.leave_date,
		"status": row.status,
		"requested_at": row.requested_at,
		"reason": row.reason,
		"decided_by": row.decided_by,
		"decided_at": row.decided_at,
		"decision_reason": row.decision_reason,
		"modified": row.modified,
	}


def _day_leave_types(employee: str, reference=None) -> list[str]:
	"""Return leave types the employee can actually request for the selected period."""
	if not employee or not frappe.db.exists("DocType", "Leave Application"):
		return []
	reference_day = getdate(reference or today())
	allocated = frappe.get_all(
		"Leave Allocation",
		filters={
			"employee": employee,
			"docstatus": 1,
			"from_date": ("<=", reference_day),
			"to_date": (">=", reference_day),
		},
		pluck="leave_type",
		ignore_permissions=True,
	)
	unpaid = frappe.get_all(
		"Leave Type",
		filters={"is_lwp": 1},
		pluck="name",
		ignore_permissions=True,
	)
	return sorted({str(value) for value in [*allocated, *unpaid] if value})


def _default_day_leave_type(employee: str, reference=None) -> str | None:
	"""Choose the employee's configured paid type first, then the available fallback."""
	available = _day_leave_types(employee, reference)
	if not available:
		return None
	paid = frappe.get_all(
		"Leave Type",
		filters={"name": ("in", available), "is_lwp": 0},
		pluck="name",
		order_by="name asc",
		ignore_permissions=True,
	)
	return str(paid[0] if paid else available[0])


def _serialize_day_leave(row, branch: str) -> dict:
	return {
		"name": row.name,
		"entertainer": None,
		"employee": row.employee,
		"branch": branch,
		"leave_date": row.from_date,
		"to_date": row.to_date,
		"leave_type": row.leave_type,
		"source_type": "Leave Application",
		"status": "Pending" if row.status == "Open" else row.status,
		"requested_at": row.creation,
		"reason": (row.description or "").strip() or row.leave_type,
		"decision_reason": None,
		"decided_by": None,
		"decided_at": None,
		"modified": row.modified,
	}


def _throw_idempotency_mismatch() -> None:
	frappe.throw(
		_("Энэ давхардал хамгаалах түлхүүрийг өөр хүсэлтэд ашигласан байна."),
		frappe.TimestampMismatchError,
	)


@frappe.whitelist(methods=["GET"])
def get_leave_policy(month=None):
	_actor, identity = require_entertainer_profile()
	profile = _profile(identity.name)
	policy = _policy()
	month_reference = _month_reference(month)
	used = _leave_count(profile.name, month_reference)
	hourly_requests = frappe.get_all(
		"VIP Emergency Leave Request",
		filters={"entertainer": profile.name},
		fields=LEAVE_REQUEST_FIELDS,
		order_by="leave_date desc, requested_at desc",
		limit=12,
		ignore_permissions=True,
	)
	day_requests = []
	if profile.employee and frappe.db.exists("DocType", "Leave Application"):
		rows = frappe.get_all(
			"Leave Application",
			filters={"employee": profile.employee, "docstatus": ("<", 2)},
			fields=["name", "employee", "from_date", "to_date", "leave_type", "status", "description", "creation", "modified"],
			order_by="from_date desc, creation desc",
			limit=12,
			ignore_permissions=True,
		)
		day_requests = [_serialize_day_leave(row, profile.branch) for row in rows]
	requests = sorted(
		[*hourly_requests, *day_requests],
		key=lambda row: (str(row.get("leave_date") or ""), str(row.get("requested_at") or "")),
		reverse=True,
	)[:16]
	penalties = frappe.get_all(
		"VIP Attendance Penalty",
		filters={"entertainer": profile.name, "status": "Approved", "attendance_date": ("between", list(_month_bounds(month_reference)))},
		fields=["name", "attendance_date", "penalty_type", "late_minutes", "missed_rounds", "amount", "status", "reason", "decision_reason", "modified"],
		order_by="attendance_date desc, created_at desc",
		limit=31,
		ignore_permissions=True,
	)
	return {
		"selected_month": month_reference.strftime("%Y-%m"),
		"policy": policy,
		"quota": {"used": used, "remaining": max(0, policy.emergency_leave_monthly_limit - used)},
		"day_leave_types": _day_leave_types(profile.employee, month_reference),
		"requests": requests,
		"penalties": penalties,
	}


@frappe.whitelist(methods=["POST"])
def submit_emergency_leave(leave_date, reason, idempotency_key=None):
	actor, identity = require_entertainer_profile()
	profile = _profile(identity.name)
	policy = _policy()
	leave_day = getdate(leave_date)
	reason = (reason or "").strip()
	if not reason:
		frappe.throw(_("Чөлөөний шалтгаан заавал бичнэ үү."))
	idempotency_key = normalize_idempotency_key(idempotency_key)
	frappe.db.sql(
		"SELECT name FROM `tabVIP Entertainer Profile` WHERE name=%s FOR UPDATE",
		profile.name,
	)
	if idempotency_key:
		existing = frappe.db.get_value(
			"VIP Emergency Leave Request",
			{"entertainer": profile.name, "idempotency_key": idempotency_key},
			LEAVE_REQUEST_FIELDS,
			as_dict=True,
		)
		if existing:
			if getdate(existing.leave_date) != leave_day or (existing.reason or "").strip() != reason:
				_throw_idempotency_mismatch()
			used = _leave_count(profile.name, existing.leave_date)
			return {
				"request": _serialize_request(existing),
				"quota": {"used": used, "remaining": max(0, policy.emergency_leave_monthly_limit - used)},
				"replayed": True,
			}
	today_day = getdate(today())
	if leave_day <= today_day:
		frappe.throw(_("Өнөөдөр эсвэл өнгөрсөн ээлжийн чөлөөний хүсэлт илгээх боломжгүй."))
	cutoff_at = _leave_request_cutoff(leave_day, policy.same_day_request_deadline)
	if now_datetime() > cutoff_at:
		frappe.throw(
			_("Энэ ээлжийн хүсэлтийн хугацаа дууссан. Ээлжийн өмнөх өдрийн {0} цагаас өмнө илгээнэ.").format(
				str(policy.same_day_request_deadline)[:5]
			)
		)
	if frappe.db.exists(
		"VIP Emergency Leave Request",
		{"entertainer": profile.name, "leave_date": leave_day, "status": ("in", ["Pending", "Approved"])},
	):
		frappe.throw(_("Энэ өдрийн идэвхтэй чөлөөний хүсэлт өмнө нь бүртгэгдсэн байна."))
	used = _leave_count(profile.name, leave_day)
	if used >= policy.emergency_leave_monthly_limit:
		frappe.throw(_("Энэ сарын цагийн чөлөөний {0} удаагийн эрх дууссан байна.").format(policy.emergency_leave_monthly_limit))
	doc = frappe.get_doc({
		"doctype": "VIP Emergency Leave Request",
		"entertainer": profile.name,
		"employee": profile.employee,
		"branch": profile.branch,
		"leave_date": leave_day,
		"status": "Pending",
		"requested_at": now_datetime(),
		"reason": reason,
		"idempotency_key": idempotency_key,
	}).insert(ignore_permissions=True)
	record_api_audit(
		actor=actor,
		action="entertainer.hourly_leave.create",
		target_doctype=doc.doctype,
		target_name=doc.name,
		idempotency_key=idempotency_key,
		details={"leave_date": str(leave_day), "reason": reason},
	)
	frappe.db.commit()
	return {"request": _serialize_request(doc), "quota": {"used": used + 1, "remaining": max(0, policy.emergency_leave_monthly_limit - used - 1)}}


@frappe.whitelist(methods=["POST"])
def submit_day_leave(from_date, to_date=None, leave_type=None, reason="", idempotency_key=None):
	actor, identity = require_entertainer_profile()
	profile = _profile(identity.name)
	if not profile.employee:
		frappe.throw(_("Ажилтны бүртгэлтэй холбогдоогүй байна."), frappe.ValidationError)
	from_day = getdate(from_date)
	to_day = from_day
	if from_day <= getdate(today()):
		frappe.throw(_("Өдрийн чөлөөний огноог зөв сонгоно уу."), frappe.ValidationError)
	leave_type = _default_day_leave_type(profile.employee, from_day)
	reason = (reason or "").strip()
	if not leave_type:
		frappe.throw(_("Өдрийн чөлөөний эрх тохируулагдаагүй байна."), frappe.ValidationError)
	if len(reason) < 3:
		frappe.throw(_("Чөлөөний шалтгаанаа бичнэ үү."), frappe.ValidationError)
	idempotency_key = normalize_idempotency_key(idempotency_key)
	existing = frappe.db.get_value(
		"Leave Application",
		{
			"employee": profile.employee,
			"from_date": from_day,
			"to_date": to_day,
			"leave_type": leave_type,
			"docstatus": ("<", 2),
		},
		["name", "employee", "from_date", "to_date", "leave_type", "status", "description", "creation", "modified"],
		as_dict=True,
	)
	if existing:
		return {"request": _serialize_day_leave(existing, profile.branch), "replayed": True}
	employee = frappe.db.get_value("Employee", profile.employee, ["company"], as_dict=True)
	doc = frappe.get_doc({
		"doctype": "Leave Application",
		"employee": profile.employee,
		"company": employee.company if employee else None,
		"leave_type": leave_type,
		"from_date": from_day,
		"to_date": to_day,
		"posting_date": today(),
		"description": reason,
		"status": "Open",
		"follow_via_email": 0,
	}).insert(ignore_permissions=True)
	record_api_audit(
		actor=actor,
		action="entertainer.day_leave.create",
		target_doctype=doc.doctype,
		target_name=doc.name,
		idempotency_key=idempotency_key,
		details={"from_date": str(from_day), "to_date": str(to_day), "leave_type": leave_type},
	)
	frappe.db.commit()
	return {"request": _serialize_day_leave(doc, profile.branch)}


@frappe.whitelist(methods=["GET"])
def get_manager_leave_requests(status="Pending", limit=50, cursor=0):
	actor = require_actor("Branch Manager", require_branch=True)
	branch = actor.branch
	page_size, offset = page_window(limit, cursor)
	status = (status or "Pending").strip().title()
	if status not in ("Pending", "Approved", "Rejected", "Cancelled", "All"):
		frappe.throw(_("Сонгосон хүсэлтийн төлөв хүчин төгөлдөр биш байна."), frappe.ValidationError)
	emergency_filters = {"branch": branch}
	if status != "All":
		emergency_filters["status"] = status
	emergency_rows = frappe.get_all(
		"VIP Emergency Leave Request",
		filters=emergency_filters,
		fields=LEAVE_REQUEST_FIELDS,
		order_by="leave_date asc, requested_at asc",
		limit_page_length=offset + page_size,
		ignore_permissions=True,
	)
	for row in emergency_rows:
		row["display_name"] = frappe.db.get_value("VIP Entertainer Profile", row.entertainer, "stage_name") or row.entertainer
		row["source_type"] = "Emergency Leave"
		row["to_date"] = row.leave_date
		row["leave_type"] = None

	employee_rows = frappe.get_all(
		"Employee",
		filters={"branch": branch, "status": "Active"},
		fields=["name", "employee_name"],
		ignore_permissions=True,
	)
	employee_names = [row.name for row in employee_rows]
	employee_labels = {row.name: row.employee_name or row.name for row in employee_rows}
	leave_rows = []
	if employee_names:
		leave_status = "Open" if status == "Pending" else status
		leave_filters = {"employee": ("in", employee_names), "docstatus": ("<", 2)}
		if status != "All":
			leave_filters["status"] = leave_status
		leave_rows = frappe.get_all(
			"Leave Application",
			filters=leave_filters,
			fields=[
				"name", "employee", "employee_name", "from_date", "to_date", "leave_type",
				"status", "description", "posting_date", "creation", "modified",
			],
			order_by="from_date asc, creation asc",
			limit_page_length=offset + page_size,
			ignore_permissions=True,
		)
	for row in leave_rows:
		row["entertainer"] = None
		row["branch"] = branch
		row["display_name"] = row.employee_name or employee_labels.get(row.employee) or row.employee
		row["leave_date"] = row.from_date
		row["requested_at"] = row.creation
		row["reason"] = (row.description or "").strip() or row.leave_type
		row["decision_reason"] = None
		row["source_type"] = "Leave Application"
		row["status"] = "Pending" if row.status == "Open" else row.status

	rows = sorted(
		[*emergency_rows, *leave_rows],
		key=lambda row: (str(row.get("leave_date") or ""), str(row.get("requested_at") or ""), row.name),
	)
	total = frappe.db.count("VIP Emergency Leave Request", emergency_filters)
	if employee_names:
		total += frappe.db.count("Leave Application", leave_filters)
	rows = rows[offset:offset + page_size]
	return {
		"policy": _policy(),
		"requests": rows,
		"meta": page_meta(
			branch=branch,
			limit=page_size,
			offset=offset,
			returned=len(rows),
			total=total,
		),
	}


@frappe.whitelist(methods=["POST"])
def decide_manager_leave(
	request_name,
	source_type="Emergency Leave",
	decision="Approved",
	reason="",
	expected_modified=None,
	idempotency_key=None,
):
	"""Route both club emergency leave and HRMS leave through one manager action."""
	if (source_type or "Emergency Leave").strip() != "Leave Application":
		return decide_emergency_leave(request_name, decision, reason, expected_modified, idempotency_key)

	actor = require_actor("Branch Manager", require_branch=True)
	decision = (decision or "").strip().title()
	if decision not in ("Approved", "Rejected"):
		frappe.throw(_("Шийдвэрийн утга хүчин төгөлдөр биш байна."), frappe.ValidationError)
	reason = (reason or "").strip()
	if decision == "Rejected" and not reason:
		frappe.throw(_("Татгалзсан шалтгаан заавал бичнэ үү."), frappe.ValidationError)
	frappe.db.sql("SELECT name FROM `tabLeave Application` WHERE name=%s FOR UPDATE", request_name)
	doc = frappe.get_doc("Leave Application", request_name)
	employee_branch = frappe.db.get_value("Employee", doc.employee, "branch")
	if employee_branch != actor.branch:
		frappe.throw(_("Өөр салбарын чөлөөний хүсэлтийг шийдвэрлэх эрхгүй."), frappe.PermissionError)
	idempotency_key = normalize_idempotency_key(idempotency_key)
	payload = {"decision": decision, "reason": reason, "source_type": "Leave Application"}
	replay = idempotency_key and frappe.db.get_value(
		"VIP API Audit Event",
		{"actor": actor.user, "action": "manager.leave_application.decide", "target_name": doc.name, "idempotency_key": idempotency_key, "outcome": "Succeeded"},
		["name", "details"],
		as_dict=True,
	)
	if replay:
		try:
			recorded = json.loads(replay.details or "{}")
		except (TypeError, ValueError):
			recorded = {}
		if any(recorded.get(key) != value for key, value in payload.items()):
			_throw_idempotency_mismatch()
		return {"name": doc.name, "status": "Pending" if doc.status == "Open" else doc.status, "replayed": True}
	assert_not_stale(doc.doctype, doc.name, expected_modified)
	if doc.status != "Open" or doc.docstatus != 0:
		frappe.throw(_("Энэ хүсэлтийг өмнө нь шийдвэрлэсэн байна."), frappe.ValidationError)
	doc.status = decision
	if doc.meta.has_field("leave_approver"):
		doc.leave_approver = actor.user
	doc.flags.ignore_permissions = True
	doc.submit()
	record_api_audit(
		actor=actor,
		action="manager.leave_application.decide",
		target_doctype=doc.doctype,
		target_name=doc.name,
		idempotency_key=idempotency_key,
		details=payload,
	)
	frappe.db.commit()
	return {"name": doc.name, "status": decision, "replayed": False}


@frappe.whitelist(methods=["POST"])
def decide_emergency_leave(request_name, decision, reason="", expected_modified=None, idempotency_key=None):
	actor = require_actor("Branch Manager", require_branch=True)
	branch = actor.branch
	decision = (decision or "").strip().title()
	if decision not in ("Approved", "Rejected"):
		frappe.throw(_("Шийдвэрийн утга хүчин төгөлдөр биш байна."))
	reason = (reason or "").strip()
	if decision == "Rejected" and not reason:
		frappe.throw(_("Татгалзсан шалтгаан заавал бичнэ үү."))
	frappe.db.sql(
		"SELECT name FROM `tabVIP Emergency Leave Request` WHERE name=%s FOR UPDATE",
		request_name,
	)
	doc = frappe.get_doc("VIP Emergency Leave Request", request_name)
	if doc.branch != branch:
		frappe.throw(_("Өөр салбарын хүсэлтийг шийдвэрлэх эрхгүй."), frappe.PermissionError)
	idempotency_key = normalize_idempotency_key(idempotency_key)
	audit_name = idempotency_key and frappe.db.exists(
		"VIP API Audit Event",
		{
			"actor": actor.user,
			"action": "manager.emergency_leave.decide",
			"target_name": doc.name,
			"idempotency_key": idempotency_key,
			"outcome": "Succeeded",
		},
	)
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
		frappe.throw(_("Энэ хүсэлтийг өмнө нь шийдвэрлэсэн байна."))
	frappe.db.set_value(
		"VIP Emergency Leave Request",
		doc.name,
		{"status": decision, "decided_by": frappe.session.user, "decided_at": now_datetime(), "decision_reason": reason},
		update_modified=True,
	)
	record_api_audit(
		actor=actor,
		action="manager.emergency_leave.decide",
		target_doctype=doc.doctype,
		target_name=doc.name,
		idempotency_key=idempotency_key,
		details={"decision": decision, "reason": reason},
	)
	frappe.db.commit()
	return {"name": doc.name, "status": decision}


def _create_penalty(
	profile,
	attendance_date,
	shift_assignment,
	penalty_type,
	amount,
	rate,
	reason,
	late_minutes=0,
	missed_rounds=0,
	source_checkin=None,
	auto_approve=False,
	auto_decision_reason=None,
):
	unique_key = f"{profile.name}|{attendance_date}|{shift_assignment.name}|{penalty_type}"
	existing = frappe.db.get_value("VIP Attendance Penalty", {"unique_key": unique_key}, "name")
	if existing:
		return frappe.get_doc("VIP Attendance Penalty", existing)
	created_at = now_datetime()
	return frappe.get_doc({
		"doctype": "VIP Attendance Penalty",
		"unique_key": unique_key,
		"entertainer": profile.name,
		"employee": profile.employee,
		"branch": profile.branch,
		"attendance_date": attendance_date,
		"shift_assignment": shift_assignment.name,
		"penalty_type": penalty_type,
		"late_minutes": late_minutes,
		"missed_rounds": missed_rounds,
		"rate": rate,
		"amount": amount,
		# 10 хүртэл минутын хоцролтыг менежер цуцалж болно. Үүнээс
		# дээш хоцролт болон таслалт бодлогын дагуу шууд баталгаажна.
		"status": "Approved" if auto_approve else "Pending Review",
		"source_checkin": source_checkin,
		"created_at": created_at,
		"reason": reason,
		"decided_by": "Administrator" if auto_approve else None,
		"decided_at": created_at if auto_approve else None,
		"decision_reason": auto_decision_reason if auto_approve else None,
	}).insert(ignore_permissions=True)


def record_late_penalty(profile, shift_assignment, checkin, work_date=None):
	attendance_date = getdate(work_date or checkin.time)
	policy = _policy()
	if has_approved_hourly_leave(entertainer=profile.name, work_date=attendance_date):
		if not hourly_leave_counts_as_absence(attendance_date, arrival_time=checkin.time):
			return None
		return _create_penalty(
			profile,
			attendance_date,
			shift_assignment,
			"Absence",
			policy.absence_deduction,
			policy.absence_deduction,
			_("Цагийн чөлөөний 00:00 цагийн хязгаараас хойш ирсэн тул таслалтад тооцов."),
			source_checkin=checkin.name,
			auto_approve=True,
			auto_decision_reason=_("00:00 цагаас хойш ирсэн тул таслалтыг автоматаар баталгаажуулав."),
		)
	if arrival_requires_fixed_penalty(attendance_date, checkin.time):
		return _create_penalty(
			profile,
			attendance_date,
			shift_assignment,
			"Absence",
			policy.absence_deduction,
			policy.absence_deduction,
			_("00:00 цагаас хойш ирсэн тул тогтмол торгууль тооцов. Ирц нь ирснээр бүртгэгдэнэ."),
			source_checkin=checkin.name,
			auto_approve=True,
			auto_decision_reason=_("00:00 цагаас хойш ирсэн тул тогтмол торгуулийг автоматаар баталгаажуулав."),
		)
	late_minutes = late_minutes_after_cutoff(profile.branch, attendance_date, checkin.time)
	if not late_minutes:
		return None
	return _create_penalty(
		profile,
		attendance_date,
		shift_assignment,
		"Late",
		late_minutes * policy.late_deduction_per_minute,
		policy.late_deduction_per_minute,
		_("{0} минут хоцорсон.").format(late_minutes),
		late_minutes=late_minutes,
		source_checkin=checkin.name,
		auto_approve=late_minutes > MANAGER_LATE_REVIEW_MINUTES,
		auto_decision_reason=_("10 минутаас дээш хоцролтыг дүрмийн дагуу автоматаар баталгаажуулав."),
	)


def _assignment_for(profile, day):
	rows = frappe.get_all(
		"Shift Assignment",
		filters={"employee": profile.employee, "docstatus": 1, "start_date": ("<=", day)},
		fields=["name", "shift_type", "start_date", "end_date"],
		order_by="start_date desc, creation desc",
		limit=5,
		ignore_permissions=True,
	)
	for row in rows:
		if not row.end_date or getdate(row.end_date) >= day:
			row["shift"] = frappe.db.get_value("Shift Type", row.shift_type, ["start_time", "end_time"], as_dict=True)
			return row
	return None


def finalize_absences():
	policy = _policy()
	now = now_datetime()
	profiles = frappe.get_all(
		"VIP Entertainer Profile",
		filters={"active": 1, "lifecycle_status": "Active", "is_demo": 0},
		fields=["name", "employee", "branch"],
		ignore_permissions=True,
	)
	created = 0
	for day in (getdate(today()) - timedelta(days=1), getdate(today())):
		for profile in profiles:
			assignment = _assignment_for(profile, day)
			if not assignment or not assignment.shift or not assignment.shift.end_time:
				continue
			start_dt = get_datetime(f"{day} {assignment.shift.start_time}")
			end_dt = get_datetime(f"{day} {assignment.shift.end_time}")
			if end_dt <= start_dt:
				end_dt += timedelta(days=1)
			if now <= end_dt:
				continue
			arrival = frappe.db.get_value(
				"Employee Checkin",
				{"employee": profile.employee, "log_type": "IN", "time": ("between", [start_dt - timedelta(hours=6), end_dt])},
				["name", "time"],
				as_dict=True,
			)
			approved_hourly_leave = has_approved_hourly_leave(entertainer=profile.name, work_date=day)
			if approved_hourly_leave and arrival and not hourly_leave_counts_as_absence(day, arrival_time=arrival.time):
				continue
			if not approved_hourly_leave and arrival:
				continue
			before = frappe.db.exists("VIP Attendance Penalty", {"unique_key": f"{profile.name}|{day}|{assignment.name}|Absence"})
			reason = _("Цагийн чөлөөтэй боловч 00:00 хүртэл ирц бүртгүүлээгүй тул таслалтад тооцов.") if approved_hourly_leave else _("Бүтэн өдрийн таслалт.")
			_create_penalty(
				profile,
				day,
				assignment,
				"Absence",
				policy.absence_deduction,
				policy.absence_deduction,
				reason,
				source_checkin=arrival.name if arrival else None,
				auto_approve=True,
				auto_decision_reason=_("Таслалтыг дүрмийн дагуу автоматаар баталгаажуулав."),
			)
			created += 0 if before else 1
	frappe.db.commit()
	return {"created": created}


@frappe.whitelist(methods=["POST"])
def decide_penalty(penalty_name, decision, reason, expected_modified=None, idempotency_key=None):
	actor = require_actor("Branch Manager", require_branch=True)
	decision = (decision or "").strip()
	reason = (reason or "").strip()
	if decision not in ("Approved", "Rejected"):
		frappe.throw(_("Шийдвэр нь зөвшөөрсөн эсвэл татгалзсан байна."), frappe.ValidationError)
	if len(reason) < 5:
		frappe.throw(_("Шийдвэрийн үндэслэлийг хамгийн багадаа 5 тэмдэгтээр бичнэ үү."), frappe.ValidationError)
	frappe.db.sql(
		"SELECT name FROM `tabVIP Attendance Penalty` WHERE name=%s FOR UPDATE",
		penalty_name,
	)
	doc = frappe.get_doc("VIP Attendance Penalty", penalty_name)
	if doc.branch != actor.branch:
		frappe.throw(_("Өөр салбарын суутгалын саналд шийдвэр гаргах эрхгүй."), frappe.PermissionError)
	idempotency_key = normalize_idempotency_key(idempotency_key)
	audit_name = idempotency_key and frappe.db.exists(
		"VIP API Audit Event",
		{
			"actor": actor.user,
			"action": "manager.attendance_penalty.decide",
			"target_name": doc.name,
			"idempotency_key": idempotency_key,
			"outcome": "Succeeded",
		},
	)
	if audit_name:
		raw_details = frappe.db.get_value("VIP API Audit Event", audit_name, "details")
		try:
			details = json.loads(raw_details or "{}")
		except (TypeError, ValueError):
			details = {}
		if details.get("decision") != decision or details.get("reason") != reason:
			_throw_idempotency_mismatch()
		return {"name": doc.name, "status": doc.status, "replayed": True}
	assert_not_stale(doc.doctype, doc.name, expected_modified)
	if doc.status != "Pending Review":
		frappe.throw(_("Энэ суутгалын саналд аль хэдийн шийдвэр гарсан байна."), frappe.ValidationError)
	decided_at = now_datetime()
	frappe.db.set_value(
		doc.doctype,
		doc.name,
		{
			"status": decision,
			"decided_by": actor.user,
			"decided_at": decided_at,
			"decision_reason": reason,
		},
		update_modified=True,
	)
	record_api_audit(
		actor=actor,
		action="manager.attendance_penalty.decide",
		target_doctype=doc.doctype,
		target_name=doc.name,
		idempotency_key=idempotency_key,
		details={
			"decision": decision,
			"reason": reason,
			"evidence": {
				"type": doc.penalty_type,
				"attendance_date": str(doc.attendance_date),
				"late_minutes": int(doc.late_minutes or 0),
				"missed_rounds": int(doc.missed_rounds or 0),
				"proposed_amount": flt(doc.amount),
				"source_checkin": doc.source_checkin,
			},
		},
	)
	frappe.db.commit()
	return {"name": doc.name, "status": decision, "decided_at": decided_at}


@frappe.whitelist(methods=["POST"])
def reverse_penalty(penalty_name, reason, expected_modified=None, idempotency_key=None):
	actor = require_actor("Branch Manager", require_branch=True)
	reason = (reason or "").strip()
	if not reason:
		frappe.throw(_("Буцаалтын шалтгаан заавал бичнэ үү."))
	frappe.db.sql(
		"SELECT name FROM `tabVIP Attendance Penalty` WHERE name=%s FOR UPDATE",
		penalty_name,
	)
	doc = frappe.get_doc("VIP Attendance Penalty", penalty_name)
	if doc.branch != actor.branch:
		frappe.throw(_("Өөр салбарын суутгалд өөрчлөлт хийх эрхгүй."), frappe.PermissionError)
	idempotency_key = normalize_idempotency_key(idempotency_key)
	audit_name = idempotency_key and frappe.db.exists(
		"VIP API Audit Event",
		{
			"actor": actor.user,
			"action": "manager.attendance_penalty.reverse",
			"target_name": doc.name,
			"idempotency_key": idempotency_key,
			"outcome": "Succeeded",
		},
	)
	if audit_name:
		if isinstance(audit_name, str):
			raw_details = frappe.db.get_value("VIP API Audit Event", audit_name, "details")
			try:
				details = json.loads(raw_details or "{}")
			except (TypeError, ValueError):
				details = {}
			recorded_reason = details.get("reason", (doc.reversal_reason or "").strip())
			if recorded_reason != reason:
				_throw_idempotency_mismatch()
		return {"name": doc.name, "status": doc.status, "replayed": True}
	assert_not_stale(doc.doctype, doc.name, expected_modified)
	if doc.status == "Reversed":
		return {"name": doc.name, "status": doc.status}
	if doc.status != "Approved":
		frappe.throw(_("Зөвхөн баталгаажсан суутгалыг буцааж болно."), frappe.ValidationError)
	frappe.db.set_value("VIP Attendance Penalty", doc.name, {"status": "Reversed", "reversed_by": frappe.session.user, "reversed_at": now_datetime(), "reversal_reason": reason}, update_modified=True)
	record_api_audit(
		actor=actor,
		action="manager.attendance_penalty.reverse",
		target_doctype=doc.doctype,
		target_name=doc.name,
		idempotency_key=idempotency_key,
		details={"reason": reason},
	)
	frappe.db.commit()
	return {"name": doc.name, "status": "Reversed"}
