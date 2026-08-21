from __future__ import annotations

import json
from datetime import timedelta

import frappe
from frappe import _
from frappe.utils import add_days, get_datetime, getdate, now_datetime, today

from nomad_vip.api.security import (
	assert_not_stale,
	normalize_idempotency_key,
	page_meta,
	page_window,
	record_api_audit,
	require_actor,
)
from nomad_vip.services import reverse_readiness_points


READINESS_FIELDS = [
	"name", "entertainer", "employee", "branch", "shift_assignment", "employee_checkin",
	"result", "reason", "supervisor", "checked_at", "ranking_policy", "point_impact",
	"performance_event", "point_ledger", "is_reversed", "reversal_point_ledger",
	"reversal_reason", "modified",
]

OPERATING_DAY_CUTOFF_HOUR = 5
LEAD_ROLES = ("Lead Entertainer", "Entertainer Supervisor")


def _operational_date(value=None):
	if value:
		return getdate(value)
	now = now_datetime()
	return getdate(add_days(today(), -1)) if now.hour < OPERATING_DAY_CUTOFF_HOUR else getdate(today())


def _shift_checkin(employee: str, assignment, work_date):
	shift = frappe.db.get_value(
		"Shift Type", assignment.shift_type, ["start_time", "end_time"], as_dict=True
	)
	if not shift:
		return None
	window_start = get_datetime(f"{work_date} {shift.start_time}") - timedelta(hours=2)
	window_end = get_datetime(f"{work_date} {shift.end_time}") + timedelta(hours=2)
	if shift.end_time <= shift.start_time:
		window_end += timedelta(days=1)
	rows = frappe.db.sql(
		"""
		select ec.name, ec.time, ec.log_type
		from `tabEmployee Checkin` ec
		inner join `tabVIP Attendance Scan` scan
			on scan.employee_checkin = ec.name and scan.result = 'Accepted'
		where ec.employee = %(employee)s
			and ec.log_type = 'IN'
			and ec.time between %(window_start)s and %(window_end)s
		order by ec.time asc, ec.creation asc
		limit 1
		""",
		{"employee": employee, "window_start": window_start, "window_end": window_end},
		as_dict=True,
	)
	return rows[0] if rows else None


def _readiness_payload(value, *, replayed: bool) -> dict:
	row = value if isinstance(value, (dict, frappe._dict)) else value.as_dict()
	return {
		**{field: row.get(field) for field in READINESS_FIELDS},
		"replayed": replayed,
	}


def _has_global_access(actor) -> bool:
	return actor.user == "Administrator" or "System Manager" in actor.roles


def _lead_duty_status(branch: str, work_date) -> dict:
	"""Return the authoritative lead coverage for one branch and operating day."""
	leads = frappe.db.sql(
		"""
		select distinct
			p.name as profile, p.employee, coalesce(nullif(p.stage_name, ''), p.employee_name, p.name) as display_name
		from `tabVIP Entertainer Profile` p
		inner join `tabEmployee` e on e.name = p.employee and e.status = 'Active'
		inner join `tabHas Role` hr on hr.parent = e.user_id and hr.parenttype = 'User'
		where p.branch = %(branch)s
			and p.active = 1
			and coalesce(p.lifecycle_status, 'Active') = 'Active'
			and hr.role in %(lead_roles)s
		order by display_name asc
		""",
		{"branch": branch, "lead_roles": LEAD_ROLES},
		as_dict=True,
	)
	if not leads:
		return {
			"state": "not_configured",
			"lead_name": None,
			"message": _("Ахлах бүжигчин тохируулаагүй тул менежер шалгана."),
		}

	fallback_state = "off"
	fallback_lead = leads[0]
	for lead in leads:
		emergency_leave = frappe.db.exists(
			"VIP Emergency Leave Request",
			{"entertainer": lead.profile, "leave_date": work_date, "status": "Approved"},
		)
		standard_leave = frappe.db.exists(
			"Leave Application",
			{
				"employee": lead.employee,
				"docstatus": 1,
				"status": "Approved",
				"from_date": ("<=", work_date),
				"to_date": (">=", work_date),
			},
		)
		if emergency_leave or standard_leave:
			fallback_state = "leave"
			fallback_lead = lead
			continue

		assignment = frappe.db.sql(
			"""
			select name from `tabShift Assignment`
			where employee = %(employee)s
				and docstatus = 1
				and start_date <= %(work_date)s
				and (end_date is null or end_date >= %(work_date)s)
			limit 1
			""",
			{"employee": lead.employee, "work_date": work_date},
		)
		if assignment:
			return {
				"state": "on_duty",
				"lead_name": lead.display_name,
				"message": _("{0} өнөөдөр хуваарьтай. Бэлэн байдлыг ахлах бүжигчин шалгана.").format(lead.display_name),
			}

	return {
		"state": fallback_state,
		"lead_name": fallback_lead.display_name,
		"message": (
			_("{0} өнөөдөр чөлөөтэй тул менежер шалгана.").format(fallback_lead.display_name)
			if fallback_state == "leave"
			else _("{0} өнөөдөр амарсан тул менежер шалгана.").format(fallback_lead.display_name)
		),
	}


def _readiness_access(actor, branch: str | None, work_date) -> dict:
	if _has_global_access(actor):
		return {
			"can_submit": True,
			"mode": "system",
			"lead_state": "unrestricted",
			"lead_name": None,
			"message": _("Системийн хяналтын эрх идэвхтэй."),
		}
	if "Branch Manager" not in actor.roles:
		return {
			"can_submit": True,
			"mode": "lead",
			"lead_state": "on_duty",
			"lead_name": frappe.utils.get_fullname(actor.user),
			"message": _("Бэлэн байдлын шалгалтыг ахлах бүжигчин гүйцэтгэнэ."),
		}

	duty = _lead_duty_status(branch or "", work_date)
	can_submit = duty["state"] != "on_duty"
	return {
		"can_submit": can_submit,
		"mode": "manager_fallback" if can_submit else "manager_read_only",
		"lead_state": duty["state"],
		"lead_name": duty.get("lead_name"),
		"message": duty["message"],
	}


def _readiness_audit_action(actor) -> str:
	return (
		"manager.readiness.fallback.submit"
		if "Branch Manager" in actor.roles and not _has_global_access(actor)
		else "lead_entertainer.readiness.submit"
	)


def _assert_branch_access(actor, branch: str) -> None:
	if not _has_global_access(actor) and actor.branch != branch:
		frappe.throw(_("Та зөвхөн өөрийн салбарын мэдээлэлтэй ажиллах эрхтэй."), frappe.PermissionError)


def _audit_replay(actor, action: str, idempotency_key: str | None):
	if not idempotency_key:
		return None
	return frappe.db.get_value(
		"VIP API Audit Event",
		{
			"actor": actor.user,
			"action": action,
			"idempotency_key": idempotency_key,
			"outcome": "Succeeded",
		},
		["name", "target_name", "details"],
		as_dict=True,
	)


@frappe.whitelist(methods=["GET"])
def get_readiness_queue(status="All", limit=50, cursor=0, work_date=None):
	actor = require_actor("Lead Entertainer", "Entertainer Supervisor", "Branch Manager", "System Manager")
	global_access = _has_global_access(actor)
	if not global_access and not actor.branch:
		frappe.throw(_("Таны ажилтны бүртгэлд салбар тохируулаагүй байна."), frappe.PermissionError)
	page_size, offset = page_window(limit, cursor)
	status = (status or "All").strip().upper()
	if status not in {"ALL", "PENDING", "READY", "NOT_READY"}:
		frappe.throw(_("Сонгосон бэлэн байдлын төлөв хүчин төгөлдөр биш байна."), frappe.ValidationError)

	work_date = _operational_date(work_date)
	access = _readiness_access(actor, actor.branch, work_date)
	base_conditions = [
		"sa.docstatus = 1",
		"sa.start_date <= %(today)s",
		"(sa.end_date is null or sa.end_date >= %(today)s)",
		"p.active = 1",
		"coalesce(p.lifecycle_status, 'Active') = 'Active'",
	]
	values = {"today": work_date, "limit": page_size, "offset": offset}
	if not global_access:
		base_conditions.append("p.branch = %(branch)s")
		values["branch"] = actor.branch
	conditions = list(base_conditions)
	if status != "ALL":
		conditions.append("coalesce(rc.result, 'PENDING') = %(status)s")
		values["status"] = status
	where_clause = " and ".join(conditions)
	base_where_clause = " and ".join(base_conditions)
	summary_counts = {"PENDING": 0, "READY": 0, "NOT_READY": 0}
	for count_row in frappe.db.sql(
		f"""
		select coalesce(rc.result, 'PENDING') as readiness_status, count(*) as row_count
		from `tabVIP Entertainer Profile` p
		inner join `tabShift Assignment` sa on sa.employee = p.employee
		left join `tabVIP Daily Readiness Check` rc
			on rc.entertainer = p.name and rc.shift_assignment = sa.name
			and coalesce(rc.is_reversed, 0) = 0
		where {base_where_clause}
		group by coalesce(rc.result, 'PENDING')
		""",
		values,
		as_dict=True,
	):
		summary_counts[count_row.readiness_status] = int(count_row.row_count or 0)
	total = frappe.db.sql(
		f"""
		select count(*)
		from `tabVIP Entertainer Profile` p
		inner join `tabShift Assignment` sa on sa.employee = p.employee
		left join `tabVIP Daily Readiness Check` rc
			on rc.entertainer = p.name and rc.shift_assignment = sa.name
			and coalesce(rc.is_reversed, 0) = 0
		where {where_clause}
		""",
		values,
	)[0][0]
	rows = frappe.db.sql(
		f"""
		select
			p.name as entertainer, p.stage_name, p.employee, p.branch,
			sa.name as shift_assignment, sa.shift_type,
			coalesce(rc.result, 'PENDING') as readiness_status,
			rc.name as readiness_check, rc.modified as readiness_modified,
			rc.supervisor as readiness_supervisor, rc.checked_at as readiness_checked_at
		from `tabVIP Entertainer Profile` p
		inner join `tabShift Assignment` sa on sa.employee = p.employee
		left join `tabVIP Daily Readiness Check` rc
			on rc.entertainer = p.name and rc.shift_assignment = sa.name
			and coalesce(rc.is_reversed, 0) = 0
		where {where_clause}
		order by
			case when rc.name is null then 0 else 1 end asc,
			case when rc.name is not null then rc.checked_at end asc,
			p.stage_name asc, p.name asc
		limit %(limit)s offset %(offset)s
		""",
		values,
		as_dict=True,
	)
	for row in rows:
		assignment = frappe._dict({
			"name": row.shift_assignment,
			"shift_type": row.shift_type,
		})
		checkin = _shift_checkin(row.employee, assignment, work_date)
		row["attendance"] = {
			"checked_in": bool(checkin),
			"employee_checkin": checkin.name if checkin else None,
			"checked_in_at": checkin.time if checkin else None,
		}
	return {
		"branch": None if global_access else actor.branch,
		"work_date": work_date,
		"status": status,
		"queue": rows,
		"summary": {
			"total": sum(summary_counts.values()),
			"pending": summary_counts["PENDING"],
			"ready": summary_counts["READY"],
			"not_ready": summary_counts["NOT_READY"],
		},
		"access": access,
		"meta": page_meta(
			branch=None if global_access else actor.branch,
			limit=page_size,
			offset=offset,
			returned=len(rows),
			total=int(total or 0),
		),
	}


@frappe.whitelist(methods=["POST"])
def submit_readiness(
	entertainer: str,
	shift_assignment: str,
	result: str,
	reason: str | None = None,
	employee_checkin: str | None = None,
	idempotency_key=None,
):
	actor = require_actor("Lead Entertainer", "Entertainer Supervisor", "Branch Manager", "System Manager")
	result = (result or "").strip().upper()
	if result not in {"READY", "NOT_READY"}:
		frappe.throw(_("Үр дүнг READY эсвэл NOT_READY гэж сонгоно уу."), frappe.ValidationError)
	reason = (reason or "").strip()
	if result == "NOT_READY" and len(reason) < 3:
		frappe.throw(_("Бэлэн бус гэж тэмдэглэсэн шалтгааныг бичнэ үү."), frappe.ValidationError)
	idempotency_key = normalize_idempotency_key(idempotency_key)
	profile = frappe.db.get_value(
		"VIP Entertainer Profile",
		entertainer,
		["name", "employee", "branch", "active", "lifecycle_status"],
		as_dict=True,
	)
	if not profile or not profile.active or profile.lifecycle_status not in (None, "", "Active"):
		frappe.throw(_("Идэвхтэй бүжигчний бүртгэл олдсонгүй."), frappe.DoesNotExistError)
	_assert_branch_access(actor, profile.branch)
	work_date = _operational_date()
	access = _readiness_access(actor, profile.branch, work_date)
	if not access["can_submit"]:
		frappe.throw(access["message"], frappe.PermissionError)
	assignment = frappe.db.get_value(
		"Shift Assignment",
		shift_assignment,
		["employee", "shift_type", "start_date", "end_date", "docstatus"],
		as_dict=True,
	)
	if not assignment or assignment.employee != profile.employee:
		frappe.throw(_("Сонгосон ээлж өөр ажилтанд хамаарч байна."), frappe.PermissionError)
	if (
		assignment.docstatus != 1
		or not assignment.start_date
		or getdate(assignment.start_date) > work_date
		or (assignment.end_date and getdate(assignment.end_date) < work_date)
	):
		frappe.throw(_("Сонгосон ээлж өнөөдөр идэвхгүй байна."), frappe.ValidationError)
	verified_checkin = _shift_checkin(profile.employee, assignment, work_date)
	if not verified_checkin:
		frappe.throw(_("Бүжигчин QR-аар ирцээ бүртгүүлсний дараа бэлэн байдлыг батална."), frappe.ValidationError)
	if employee_checkin:
		checkin = frappe.db.get_value(
			"Employee Checkin",
			employee_checkin,
			["name", "employee", "shift"],
			as_dict=True,
		)
		if not checkin or checkin.employee != profile.employee:
			frappe.throw(_("Сонгосон ирцийн бүртгэл өөр ажилтанд хамаарч байна."), frappe.PermissionError)
		if checkin.shift and assignment.shift_type and checkin.shift != assignment.shift_type:
			frappe.throw(_("Сонгосон ирцийн бүртгэл энэ ээлжид хамаарахгүй байна."), frappe.ValidationError)
		if checkin.name != verified_checkin.name:
			frappe.throw(_("Энэ ээлжийн баталгаатай QR ирцийг сонгоно уу."), frappe.ValidationError)
	else:
		employee_checkin = verified_checkin.name

	frappe.db.sql(
		"SELECT name FROM `tabVIP Entertainer Profile` WHERE name=%s FOR UPDATE",
		profile.name,
	)
	audit_action = _readiness_audit_action(actor)
	replay = _audit_replay(actor, audit_action, idempotency_key)
	if replay:
		try:
			details = json.loads(replay.details or "{}")
		except (TypeError, ValueError):
			details = {}
		row = frappe.db.get_value("VIP Daily Readiness Check", replay.target_name, READINESS_FIELDS, as_dict=True)
		requested = {
			"entertainer": profile.name,
			"shift_assignment": shift_assignment,
			"result": result,
			"reason": reason if result == "NOT_READY" else None,
			"employee_checkin": employee_checkin or None,
		}
		if "reason" not in details and row:
			details["reason"] = (row.reason or "").strip() if row.result == "NOT_READY" else None
		if any(details.get(key) != value for key, value in requested.items()):
			frappe.throw(
				_("Энэ давхардал хамгаалах түлхүүрийг өөр хүсэлтэд ашигласан байна."),
				frappe.TimestampMismatchError,
			)
		if row:
			return _readiness_payload(row, replayed=True)

	existing = frappe.db.get_value(
		"VIP Daily Readiness Check",
		{"entertainer": profile.name, "shift_assignment": shift_assignment, "is_reversed": 0},
		READINESS_FIELDS,
		as_dict=True,
	)
	if existing:
		frappe.throw(_("Энэ ээлжийн бэлэн байдлыг өмнө нь бүртгэсэн байна."), frappe.ValidationError)
	doc = frappe.get_doc({
		"doctype": "VIP Daily Readiness Check",
		"entertainer": profile.name,
		"shift_assignment": shift_assignment,
		"employee_checkin": employee_checkin,
		"result": result,
		"reason": reason,
	}).insert(ignore_permissions=True)
	row = frappe.db.get_value("VIP Daily Readiness Check", doc.name, READINESS_FIELDS, as_dict=True)
	record_api_audit(
		actor=actor,
		action=audit_action,
		target_doctype=doc.doctype,
		target_name=doc.name,
		idempotency_key=idempotency_key,
		details={
			"entertainer": profile.name,
			"shift_assignment": shift_assignment,
			"result": result,
			"reason": reason if result == "NOT_READY" else None,
			"employee_checkin": employee_checkin or None,
			"performance_event": row.performance_event,
			"point_ledger": row.point_ledger,
			"access_mode": access["mode"],
			"lead_state": access["lead_state"],
		},
	)
	frappe.db.commit()
	return _readiness_payload(row, replayed=False)


@frappe.whitelist(methods=["POST"])
def reverse_readiness(
	readiness_check: str,
	reason: str,
	expected_modified=None,
	idempotency_key=None,
):
	actor = require_actor("Branch Manager", "System Manager")
	reason = (reason or "").strip()
	if len(reason) < 3:
		frappe.throw(_("Буцаалтын шалтгааныг бичнэ үү."), frappe.ValidationError)
	idempotency_key = normalize_idempotency_key(idempotency_key)
	frappe.db.sql(
		"SELECT name FROM `tabVIP Daily Readiness Check` WHERE name=%s FOR UPDATE",
		readiness_check,
	)
	doc = frappe.get_doc("VIP Daily Readiness Check", readiness_check)
	_assert_branch_access(actor, doc.branch)
	replay = _audit_replay(actor, "manager.readiness.reverse", idempotency_key)
	if replay:
		try:
			details = json.loads(replay.details or "{}")
		except (TypeError, ValueError):
			details = {}
		if replay.target_name != doc.name or details.get("reason") != reason:
			frappe.throw(
				_("Энэ давхардал хамгаалах түлхүүрийг өөр хүсэлтэд ашигласан байна."),
				frappe.TimestampMismatchError,
			)
		row = frappe.db.get_value(doc.doctype, doc.name, READINESS_FIELDS, as_dict=True)
		return _readiness_payload(row, replayed=True)
	assert_not_stale(doc.doctype, doc.name, expected_modified)
	reversal = reverse_readiness_points(doc, reason)
	row = frappe.db.get_value(doc.doctype, doc.name, READINESS_FIELDS, as_dict=True)
	record_api_audit(
		actor=actor,
		action="manager.readiness.reverse",
		target_doctype=doc.doctype,
		target_name=doc.name,
		idempotency_key=idempotency_key,
		details={
			"reason": reason,
			"reversal_point_ledger": reversal,
			"current_points": frappe.db.get_value(
				"VIP Entertainer Profile", doc.entertainer, "current_points"
			),
		},
	)
	frappe.db.commit()
	return _readiness_payload(row, replayed=False)
