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
ENTERTAINER_DESIGNATIONS = {"бүжигчин", "dancer", "entertainer"}


def _date_text(value) -> str:
	return str(getdate(value))


def _manager_profile(profile_name: str, branch: str):
	profile = frappe.db.get_value(
		"VIP Entertainer Profile",
		profile_name,
		["name", "employee", "employee_name", "stage_name", "branch", "active", "lifecycle_status"],
		as_dict=True,
	)
	if not profile or not profile.active or profile.lifecycle_status not in (None, "", "Active"):
		frappe.throw(_("Идэвхтэй бүжигчний бүртгэл олдсонгүй."), frappe.DoesNotExistError)
	if profile.branch != branch:
		frappe.throw(_("Өөр салбарын бүжигчний хуваарийг удирдах эрхгүй."), frappe.PermissionError)
	return profile


def _manager_employee(employee_name: str, branch: str):
	employee = frappe.db.get_value(
		"Employee",
		employee_name,
		["name", "employee_name", "designation", "department", "branch", "status", "modified"],
		as_dict=True,
	)
	if not employee or employee.status != "Active":
		frappe.throw(_("Идэвхтэй ажилтны бүртгэл олдсонгүй."), frappe.DoesNotExistError)
	if employee.branch != branch:
		frappe.throw(_("Өөр салбарын ажилтны хуваарийг удирдах эрхгүй."), frappe.PermissionError)
	return employee


def _schedule_target(profile_name: str | None, employee_name: str | None, branch: str):
	profile_name = (profile_name or "").strip()
	employee_name = (employee_name or "").strip()
	profile = _manager_profile(profile_name, branch) if profile_name else None
	if profile and employee_name and profile.employee != employee_name:
		frappe.throw(_("Сонгосон ажилтан болон бүжигчний профайл хоорондоо зөрж байна."), frappe.ValidationError)
	target_employee = employee_name or (profile.employee if profile else None)
	if not target_employee:
		frappe.throw(_("Хуваарь оруулах ажилтныг сонгоно уу."), frappe.ValidationError)
	return _manager_employee(target_employee, branch), profile


def _is_entertainer_employee(employee, profile) -> bool:
	if profile:
		return True
	designation = str(employee.get("designation") or "").strip().lower()
	return designation in ENTERTAINER_DESIGNATIONS


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


def finex_schedule_evidence(employees, start, end):
	"""Return imported Finex evidence without promoting it to an ERPNext shift."""
	if not employees or not frappe.db.exists("DocType", "VIP Finex Schedule Snapshot"):
		return {}
	rows = frappe.get_all(
		"VIP Finex Schedule Snapshot",
		filters=[
			["employee", "in", list(employees)],
			["work_date", ">=", getdate(start)],
			["work_date", "<=", getdate(end)],
		],
		fields=[
			"employee", "work_date", "scheduled", "attendance_type", "attendance_name",
			"store_name", "source_synced_at",
		],
		order_by="source_synced_at desc",
		ignore_permissions=True,
	)
	evidence = {}
	for row in rows:
		key = (row.employee, getdate(row.work_date))
		if key in evidence:
			continue
		evidence[key] = {
			"source": "Finex",
			"scheduled": bool(row.scheduled),
			"attendance_type": row.attendance_type,
			"attendance_name": row.attendance_name,
			"store_name": row.store_name,
			"synced_at": str(row.source_synced_at) if row.source_synced_at else None,
		}
	return evidence


def unlinked_finex_import_summary(branch, start, end):
	"""Count imported names that still require an explicit employee review/link."""
	if not frappe.db.exists("DocType", "VIP Finex Schedule Snapshot"):
		return {"candidates": 0, "rows": 0}
	result = frappe.db.sql(
		"""
		select count(distinct candidate) candidates, count(*) row_count
		from `tabVIP Finex Schedule Snapshot`
		where branch = %(branch)s
			and employee is null
			and work_date between %(start)s and %(end)s
		""",
		{"branch": branch, "start": getdate(start), "end": getdate(end)},
		as_dict=True,
	)[0]
	return {"candidates": int(result.candidates or 0), "rows": int(result.row_count or 0)}


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

	employee_rows = frappe.get_all(
		"Employee",
		filters={"branch": actor.branch, "status": "Active"},
		fields=["name", "employee_name", "designation", "department", "branch", "status"],
		order_by="employee_name asc, name asc",
		limit_page_length=0,
		ignore_permissions=True,
	)
	employees = [row.name for row in employee_rows]
	profiles = frappe.get_all(
		"VIP Entertainer Profile",
		filters={"employee": ["in", employees], "branch": actor.branch, "active": 1} if employees else {"name": ""},
		fields=["name", "employee", "employee_name", "stage_name", "current_rank", "lifecycle_status"],
		order_by="stage_name asc, employee_name asc",
		limit_page_length=0,
		ignore_permissions=True,
	)
	profiles_by_employee = {
		row.employee: row for row in profiles
		if row.employee and row.lifecycle_status in (None, "", "Active", "On Leave")
	}
	assignments = []
	if employees:
		assignments = frappe.get_all(
			"Shift Assignment",
			filters=[
				["employee", "in", employees],
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
	for employee in employee_rows:
		profile = profiles_by_employee.get(employee.name)
		entries = []
		for work_date in dates:
			matches = [
				row for row in assignments
				if row.employee == employee.name
				and getdate(row.start_date) <= work_date
				and (not row.end_date or getdate(row.end_date) >= work_date)
			]
			assignment = _assignment_payload(matches[0]) if matches else None
			entries.append({
				"date": work_date,
				"assignment": assignment,
				"editable": work_date >= getdate(today()),
			})
		is_entertainer = _is_entertainer_employee(employee, profile)
		people.append({
			"profile": profile.name if profile else None,
			"employee": employee.name,
			"display_name": (profile.stage_name if profile else None) or employee.employee_name or employee.name,
			"role_label": employee.designation or employee.department or (_("Бүжигчин") if is_entertainer else _("Ажилтан")),
			"member_type": "Entertainer" if is_entertainer else "Employee",
			"identity_state": "Confirmed Entertainer Profile" if profile else "Employee Master",
			"rank": profile.current_rank if profile else None,
			"days": entries,
		})
	people.sort(key=lambda row: (0 if row["member_type"] == "Entertainer" else 1, row["display_name"].lower()))
	entertainer_count = sum(1 for row in people if row["member_type"] == "Entertainer")
	employee_count = len(people) - entertainer_count

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
		"source_meta": {
			"authoritative": "Manager Entry",
			"entertainer_count": entertainer_count,
			"employee_count": employee_count,
		},
		"generated_at": now_datetime(),
	}


@frappe.whitelist(methods=["POST"])
def set_manager_schedule(
	profile_name: str | None = None,
	work_date=None,
	shift_type: str | None = None,
	reason: str | None = None,
	expected_assignment=None,
	expected_modified=None,
	idempotency_key=None,
	employee_name: str | None = None,
):
	actor = require_actor("Branch Manager", require_branch=True)
	employee, profile = _schedule_target(profile_name, employee_name, actor.branch)
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
		"profile": profile.name if profile else None,
		"employee": employee.name,
		"work_date": _date_text(work_date),
		"shift_type": shift_type or None,
		"reason": reason,
	}

	frappe.db.sql("SELECT name FROM `tabEmployee` WHERE name=%s FOR UPDATE", employee.name)
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

	current = _assignment_for_date(employee.name, work_date, for_update=True)
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
			{"employee": employee.name, "time": ("between", [window_start, window_end])},
		):
			frappe.throw(_("QR ирц бүртгэгдсэн өдрийн ээлжийг солих боломжгүй. Ирц засах хүсэлт ашиглана уу."), frappe.ValidationError)
		doc = frappe.get_doc("Shift Assignment", current.name)
		doc.flags.ignore_permissions = True
		doc.cancel()

	assignment = None
	if shift_type:
		doc = frappe.get_doc({
			"doctype": "Shift Assignment",
			"employee": employee.name,
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
