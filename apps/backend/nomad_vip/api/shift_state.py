from __future__ import annotations

from datetime import timedelta

import frappe
from frappe.utils import cint, get_datetime, getdate, now_datetime


SHIFT_FIELDS = [
	"name",
	"start_time",
	"end_time",
	"begin_check_in_before_shift_start_time",
	"allow_check_out_after_shift_end_time",
]


def _assignment_for_date(employee: str, work_date):
	day = getdate(work_date)
	rows = frappe.get_all(
		"Shift Assignment",
		filters={"employee": employee, "docstatus": 1, "start_date": ("<=", day)},
		fields=["name", "shift_type", "start_date", "end_date"],
		order_by="start_date desc, creation desc",
		limit=20,
		ignore_permissions=True,
	)
	for row in rows:
		if row.end_date and getdate(row.end_date) < day:
			continue
		shift = frappe.db.get_value("Shift Type", row.shift_type, SHIFT_FIELDS, as_dict=True)
		if shift and shift.start_time is not None and shift.end_time is not None:
			row["shift"] = shift
			return row
	return None


def _bounds(work_date, shift):
	day = getdate(work_date)
	start = get_datetime(f"{day} {shift.start_time}")
	end = get_datetime(f"{day} {shift.end_time}")
	if end <= start:
		end += timedelta(days=1)
	lead_minutes = max(0, cint(shift.begin_check_in_before_shift_start_time or 0))
	tail_minutes = max(0, cint(shift.allow_check_out_after_shift_end_time or 0))
	return {
		"start": start,
		"end": end,
		"window_start": start - timedelta(minutes=lead_minutes),
		"window_end": end + timedelta(minutes=tail_minutes),
	}


def shift_context_for_work_date(employee: str, work_date):
	"""Return the submitted assignment and operational window for one work date."""
	day = getdate(work_date)
	assignment = _assignment_for_date(employee, day)
	if not assignment:
		return None
	bounds = _bounds(day, assignment.shift)
	return frappe._dict({
		"work_date": day,
		"assignment": assignment,
		"shift": assignment.shift,
		"start": bounds["start"],
		"end": bounds["end"],
		"window_start": bounds["window_start"],
		"window_end": bounds["window_end"],
		"is_active_window": bounds["window_start"] <= now_datetime() <= bounds["window_end"],
	})


def resolve_shift_context(employee: str, moment=None):
	"""Resolve the operational shift that owns *moment*, including overnight work.

	The previous work date is evaluated before today's upcoming assignment. This
	keeps a 19:00–03:00 shift attached to its original assignment after midnight.
	"""
	moment = get_datetime(moment or now_datetime())
	today = getdate(moment)
	contexts = []
	for work_date in (today - timedelta(days=1), today):
		context = shift_context_for_work_date(employee, work_date)
		if not context:
			continue
		context.is_active_window = context.window_start <= moment <= context.window_end
		contexts.append(context)

	active = [row for row in contexts if row.is_active_window]
	if active:
		return sorted(active, key=lambda row: row.start, reverse=True)[0]
	return next((row for row in contexts if row.work_date == today), None)


def resolve_shift_contexts(employees, moment=None):
	"""Resolve operational shift contexts for a roster in two bulk reads.

	The result follows :func:`resolve_shift_context`: an active previous-day
	overnight window wins over today's upcoming assignment.  Assignments and
	shift definitions are prefetched once so a manager roster does not issue
	several queries per employee.
	"""
	moment = get_datetime(moment or now_datetime())
	day = getdate(moment)
	previous_day = day - timedelta(days=1)
	employees = list(dict.fromkeys(employee for employee in employees if employee))
	if not employees:
		return {}

	assignments = frappe.get_all(
		"Shift Assignment",
		filters={
			"employee": ("in", employees),
			"docstatus": 1,
			"start_date": ("<=", day),
		},
		fields=["name", "employee", "shift_type", "start_date", "end_date", "creation"],
		order_by="employee asc, start_date desc, creation desc",
		limit_page_length=0,
		ignore_permissions=True,
	)
	shift_type_names = list(dict.fromkeys(row.shift_type for row in assignments if row.shift_type))
	shift_types = {
		row.name: row
		for row in frappe.get_all(
			"Shift Type",
			filters={"name": ("in", shift_type_names)},
			fields=SHIFT_FIELDS,
			limit_page_length=0,
			ignore_permissions=True,
		)
	} if shift_type_names else {}
	assignments_by_employee = {employee: [] for employee in employees}
	for assignment in assignments:
		shift = shift_types.get(assignment.shift_type)
		if not shift or shift.start_time is None or shift.end_time is None:
			continue
		assignment["shift"] = shift
		assignments_by_employee.setdefault(assignment.employee, []).append(assignment)

	def assignment_for(employee, work_date):
		for assignment in assignments_by_employee.get(employee, []):
			if getdate(assignment.start_date) > work_date:
				continue
			if assignment.end_date and getdate(assignment.end_date) < work_date:
				continue
			return assignment
		return None

	contexts_by_employee = {}
	for employee in employees:
		contexts = []
		for work_date in (previous_day, day):
			assignment = assignment_for(employee, work_date)
			if not assignment:
				continue
			bounds = _bounds(work_date, assignment.shift)
			contexts.append(frappe._dict({
				"work_date": work_date,
				"assignment": assignment,
				"shift": assignment.shift,
				"start": bounds["start"],
				"end": bounds["end"],
				"window_start": bounds["window_start"],
				"window_end": bounds["window_end"],
				"is_active_window": bounds["window_start"] <= moment <= bounds["window_end"],
			}))
		active = [row for row in contexts if row.is_active_window]
		if active:
			contexts_by_employee[employee] = sorted(active, key=lambda row: row.start, reverse=True)[0]
		else:
			contexts_by_employee[employee] = next(
				(row for row in contexts if row.work_date == day),
				None,
			)
	return contexts_by_employee


def shift_checkins(employee: str, context):
	if not context:
		return []
	return frappe.get_all(
		"Employee Checkin",
		filters={
			"employee": employee,
			"time": ("between", [context.window_start, context.window_end]),
			"skip_auto_attendance": 0,
		},
		fields=["name", "time", "log_type", "shift", "modified"],
		order_by="time asc, creation asc",
		ignore_permissions=True,
	)


def attendance_state(rows):
	latest = rows[-1] if rows else None
	return frappe._dict({
		"checked_in": any(row.log_type == "IN" for row in rows),
		"checked_out": bool(latest and latest.log_type == "OUT"),
		"open": bool(latest and latest.log_type == "IN"),
		"latest": latest,
		"events": rows,
	})
