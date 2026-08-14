from __future__ import annotations

import json

import frappe
from frappe import _
from frappe.utils import add_days, get_datetime, getdate, now_datetime, today

from nomad_vip.api.security import (
	assert_not_stale,
	normalize_idempotency_key,
	record_api_audit,
	require_actor,
)


MAX_SCHEDULE_DAYS = 31
MAX_FUTURE_DAYS = 90


def _date_text(value) -> str:
	return str(getdate(value))


def _manager_schedule_person(person_name: str, branch: str):
	profile = frappe.db.get_value(
		"VIP Entertainer Profile",
		person_name,
		["name", "employee", "employee_name", "stage_name", "branch", "active", "lifecycle_status", "current_rank"],
		as_dict=True,
	)
	if profile and profile.active and profile.lifecycle_status in (None, "", "Active") and profile.employee:
		employee = frappe.db.get_value(
			"Employee",
			profile.employee,
			["name", "employee_name", "designation", "department", "branch", "status"],
			as_dict=True,
		)
		if employee and employee.status == "Active":
			if employee.branch != branch or profile.branch != branch:
				frappe.throw(_("Өөр салбарын багийн гишүүний хуваарийг удирдах эрхгүй."), frappe.PermissionError)
			employee.schedule_key = profile.name
			employee.display_name = profile.stage_name or profile.employee_name or employee.employee_name
			employee.rank = profile.get("current_rank")
			return employee
	employee = frappe.db.get_value(
		"Employee",
		person_name,
		["name", "employee_name", "designation", "department", "branch", "status"],
		as_dict=True,
	)
	if not employee or employee.status != "Active":
		frappe.throw(_("Идэвхтэй багийн гишүүний бүртгэл олдсонгүй."), frappe.DoesNotExistError)
	if employee.branch != branch:
		frappe.throw(_("Өөр салбарын багийн гишүүний хуваарийг удирдах эрхгүй."), frappe.PermissionError)
	employee.schedule_key = employee.name
	employee.display_name = employee.employee_name or employee.name
	employee.rank = None
	return employee


def _assignment_for_date(employee: str, work_date, *, for_update: bool = False):
	lock = " FOR UPDATE" if for_update else ""
	rows = frappe.db.sql(
		f"""
		select name, employee, shift_type, start_date, end_date, status, modified
		from `tabShift Assignment`
		where employee = %(employee)s
			and docstatus = 1
			and status = 'Active'
			and start_date <= %(work_date)s
			and (end_date is null or end_date >= %(work_date)s)
		order by start_date desc, creation desc
		limit 2{lock}
		""",
		{"employee": employee, "work_date": getdate(work_date)},
		as_dict=True,
	)
	if len(rows) > 1:
		frappe.throw(_("Энэ өдөр давхардсан ээлж байна. Системийн админ шалгана уу."), frappe.ValidationError)
	return rows[0] if rows else None


def _assignment_payload(row):
	if not row:
		return None
	return {
		"name": row.get("name"),
		"shift_type": row.get("shift_type"),
		"start_date": str(row.get("start_date")) if row.get("start_date") else None,
		"end_date": str(row.get("end_date")) if row.get("end_date") else None,
		"status": row.get("status"),
		"modified": str(row.get("modified")) if row.get("modified") else None,
	}


def _audit_replay(actor, idempotency_key: str | None):
	if not idempotency_key:
		return None
	return frappe.db.get_value(
		"VIP API Audit Event",
		{
			"actor": actor.user,
			"action": "manager.schedule.set",
			"idempotency_key": idempotency_key,
			"outcome": "Succeeded",
		},
		["name", "details"],
		as_dict=True,
	)


@frappe.whitelist(methods=["GET"])
def get_manager_schedule(start_date=None, days=7):
	actor = require_actor("Branch Manager", require_branch=True)
	start = getdate(start_date or today())
	try:
		days = int(days or 7)
	except (TypeError, ValueError):
		frappe.throw(_("Харах өдрийн тоо бүхэл тоо байна."), frappe.ValidationError)
	if days < 1 or days > MAX_SCHEDULE_DAYS:
		frappe.throw(_("1–31 хоногийн хуваарь харах боломжтой."), frappe.ValidationError)
	if start > getdate(add_days(today(), MAX_FUTURE_DAYS)):
		frappe.throw(_("Хуваарийг 90 хүртэл хоногийн өмнөөс төлөвлөнө."), frappe.ValidationError)
	end = getdate(add_days(start, days - 1))

	employees = frappe.get_all(
		"Employee",
		filters={"branch": actor.branch, "status": "Active"},
		fields=["name", "employee_name", "designation", "department"],
		order_by="employee_name asc, name asc",
		ignore_permissions=True,
	)
	employee_names = [row.name for row in employees]
	profiles = frappe.get_all(
		"VIP Entertainer Profile",
		filters={"employee": ("in", employee_names), "active": 1} if employee_names else {"name": ""},
		fields=["name", "employee", "employee_name", "stage_name", "current_rank"],
		ignore_permissions=True,
	)
	profiles_by_employee = {}
	for profile in profiles:
		profiles_by_employee.setdefault(profile.employee, profile)
	assignments = []
	if employee_names:
		assignments = frappe.get_all(
			"Shift Assignment",
			filters=[
				["employee", "in", employee_names],
				["docstatus", "=", 1],
				["status", "=", "Active"],
				["start_date", "<=", end],
			],
			or_filters=[["end_date", ">=", start], ["end_date", "is", "not set"]],
			fields=["name", "employee", "shift_type", "start_date", "end_date", "status", "modified"],
			order_by="start_date asc, creation asc",
			ignore_permissions=True,
		)

	dates = [getdate(add_days(start, offset)) for offset in range(days)]
	people = []
	for employee in employees:
		profile = profiles_by_employee.get(employee.name)
		entries = []
		for work_date in dates:
			matches = [
				row for row in assignments
				if row.employee == employee.name
				and getdate(row.start_date) <= work_date
				and (not row.end_date or getdate(row.end_date) >= work_date)
			]
			entries.append({
				"date": work_date,
				"assignment": _assignment_payload(matches[0]) if matches else None,
				"editable": work_date >= getdate(today()),
			})
		people.append({
			"profile": profile.name if profile else employee.name,
			"employee": employee.name,
			"display_name": (profile.stage_name if profile else None) or employee.employee_name or employee.name,
			"rank": (profile.current_rank if profile else None) or employee.designation or employee.department,
			"role_label": employee.designation or employee.department or _("Багийн гишүүн"),
			"member_type": "Entertainer" if profile else "Employee",
			"days": entries,
		})

	shift_types = frappe.get_all(
		"Shift Type",
		fields=["name", "start_time", "end_time"],
		order_by="name asc",
		ignore_permissions=True,
	)
	return {
		"branch": actor.branch,
		"window": {"from": start, "to": end},
		"dates": dates,
		"shift_types": shift_types,
		"people": people,
		"generated_at": now_datetime(),
	}


@frappe.whitelist(methods=["POST"])
def set_manager_schedule(
	profile_name: str,
	work_date,
	shift_type: str | None = None,
	reason: str | None = None,
	expected_assignment=None,
	expected_modified=None,
	idempotency_key=None,
):
	actor = require_actor("Branch Manager", require_branch=True)
	person = _manager_schedule_person(profile_name, actor.branch)
	work_date = getdate(work_date)
	if work_date < getdate(today()):
		frappe.throw(_("Өнгөрсөн өдрийн хуваарийг өөрчлөх боломжгүй."), frappe.ValidationError)
	if work_date > getdate(add_days(today(), MAX_FUTURE_DAYS)):
		frappe.throw(_("Хуваарийг 90 хүртэл хоногийн өмнөөс төлөвлөнө."), frappe.ValidationError)
	shift_type = (shift_type or "").strip()
	reason = (reason or "").strip()
	if len(reason) < 5:
		frappe.throw(_("Хуваарь өөрчилсөн шалтгааныг хамгийн багадаа 5 тэмдэгтээр бичнэ үү."), frappe.ValidationError)
	if shift_type and not frappe.db.exists("Shift Type", shift_type):
		frappe.throw(_("Сонгосон ээлжийн төрөл олдсонгүй."), frappe.DoesNotExistError)
	idempotency_key = normalize_idempotency_key(idempotency_key)
	requested = {
		"profile": person.schedule_key,
		"work_date": _date_text(work_date),
		"shift_type": shift_type or None,
		"reason": reason,
	}

	frappe.db.sql(
		"SELECT name FROM `tabEmployee` WHERE name=%s FOR UPDATE",
		person.name,
	)
	replay = _audit_replay(actor, idempotency_key)
	if replay:
		try:
			details = json.loads(replay.details or "{}")
		except (TypeError, ValueError):
			details = {}
		if details.get("requested") != requested:
			frappe.throw(_("Энэ давхардал хамгаалах түлхүүрийг өөр хүсэлтэд ашигласан байна."), frappe.TimestampMismatchError)
		return {
			"assignment": details.get("assignment"),
			"previous_assignment": details.get("previous_assignment"),
			"replayed": True,
		}

	current = _assignment_for_date(person.name, work_date, for_update=True)
	if expected_assignment is not None and str(expected_assignment or "") != str(current.name if current else ""):
		frappe.throw(_("Хуваарь өөр хүнээр шинэчлэгдсэн байна. Мэдээллээ шинэчлээд дахин оролдоно уу."), frappe.TimestampMismatchError)
	if current:
		assert_not_stale("Shift Assignment", current.name, expected_modified)
		if getdate(current.start_date) != work_date or (current.end_date and getdate(current.end_date) != work_date):
			frappe.throw(_("Энэ өдөр олон өдрийн ээлжийн бүртгэлд багтсан байна. Системийн админ салгаж засна уу."), frappe.ValidationError)
		if current.shift_type == shift_type:
			return {"assignment": _assignment_payload(current), "previous_assignment": _assignment_payload(current), "replayed": True}
	elif not shift_type:
		return {"assignment": None, "previous_assignment": None, "replayed": True}

	previous = _assignment_payload(current)
	if current:
		window_end = get_datetime(f"{add_days(work_date, 1)} 06:00:00")
		window_start = get_datetime(f"{work_date} 00:00:00")
		if frappe.db.exists(
			"Employee Checkin",
			{"employee": person.name, "time": ("between", [window_start, window_end])},
		):
			frappe.throw(_("QR ирц бүртгэгдсэн өдрийн ээлжийг солих боломжгүй. Ирц засах хүсэлт ашиглана уу."), frappe.ValidationError)
		doc = frappe.get_doc("Shift Assignment", current.name)
		doc.flags.ignore_permissions = True
		doc.cancel()

	assignment = None
	if shift_type:
		doc = frappe.get_doc({
			"doctype": "Shift Assignment",
			"employee": person.name,
			"shift_type": shift_type,
			"start_date": work_date,
			"end_date": work_date,
			"status": "Active",
		}).insert(ignore_permissions=True)
		doc.flags.ignore_permissions = True
		doc.submit()
		assignment = frappe.db.get_value(
			"Shift Assignment",
			doc.name,
			["name", "shift_type", "start_date", "end_date", "status", "modified"],
			as_dict=True,
		)
	assignment_payload = _assignment_payload(assignment)
	record_api_audit(
		actor=actor,
		action="manager.schedule.set",
		target_doctype="Shift Assignment",
		target_name=assignment.name if assignment else (current.name if current else None),
		idempotency_key=idempotency_key,
		details={
			"requested": requested,
			"previous_assignment": previous,
			"assignment": assignment_payload,
		},
	)
	frappe.db.commit()
	return {
		"assignment": assignment_payload,
		"previous_assignment": previous,
		"replayed": False,
	}
