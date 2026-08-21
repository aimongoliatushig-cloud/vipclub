from __future__ import annotations

from unittest.mock import patch
from uuid import uuid4

import frappe
from frappe.utils import now_datetime, today

from nomad_vip.api.attendance import get_my_attendance_status, scan_branch_qr
from nomad_vip.api.workforce import get_context


def _user(email: str, first_name: str, roles: tuple[str, ...]):
	user = frappe.get_doc({
		"doctype": "User",
		"email": email,
		"first_name": first_name,
		"enabled": 1,
		"send_welcome_email": 0,
	}).insert(ignore_permissions=True)
	user.add_roles(*roles)
	return user


def _employee(*, company: str, branch: str, user: str, first_name: str):
	return frappe.get_doc({
		"doctype": "Employee",
		"first_name": first_name,
		"gender": "Female",
		"date_of_birth": "1995-01-01",
		"date_of_joining": today(),
		"company": company,
		"branch": branch,
		"status": "Active",
		"user_id": user,
	}).insert(ignore_permissions=True)


def run():
	"""Verify generic employees and managers can record only their own branch QR time."""
	frappe.db.savepoint("all_employee_qr_smoke")
	previous_user = frappe.session.user
	try:
		suffix = uuid4().hex[:10]
		company = frappe.db.get_single_value("Global Defaults", "default_company") or frappe.db.get_value("Company", {}, "name")
		branch = frappe.db.get_value("Branch", {"name": "Nomad"}, "name") or frappe.db.get_value("Branch", {}, "name")
		if not company or not branch:
			raise AssertionError("Disposable test site needs a company and branch.")

		qr = frappe.get_doc({
			"doctype": "VIP Branch Attendance QR",
			"branch": branch,
			"qr_token": f"all-employee-{suffix}",
			"active": 1,
			"latitude": 47.9188,
			"longitude": 106.9176,
			"radius_meters": 100,
			"configured_by": "Administrator",
			"configured_at": now_datetime(),
		}).insert(ignore_permissions=True)

		employee_user = _user(f"smoke.employee.{suffix}@example.invalid", "Smoke Employee", ("Employee",))
		manager_user = _user(f"smoke.manager.qr.{suffix}@example.invalid", "Smoke Manager", ("Branch Manager",))
		employee = _employee(company=company, branch=branch, user=employee_user.name, first_name="Smoke Employee")
		manager = _employee(company=company, branch=branch, user=manager_user.name, first_name="Smoke Manager")

		with patch("frappe.db.commit"):
			frappe.set_user(employee_user.name)
			context = get_context()
			if context.get("mode") != "employee" or context.get("employee") != employee.name:
				raise AssertionError("Generic employee did not receive attendance-only context.")
			before = get_my_attendance_status()
			if before.get("action") != "IN":
				raise AssertionError("A new employee attendance session must start with IN.")
			first = scan_branch_qr(qr.qr_token, 47.9188, 106.9176, 10, "AUTO")
			if not first.get("accepted") or first.get("attendance_action") != "IN":
				raise AssertionError("Generic employee IN was not accepted.")
			second = scan_branch_qr(qr.qr_token, 47.9188, 106.9176, 10, "AUTO")
			if not second.get("accepted") or second.get("attendance_action") != "OUT":
				raise AssertionError("Generic employee OUT was not accepted.")

			frappe.set_user(manager_user.name)
			manager_context = get_context()
			if manager_context.get("mode") != "manager" or manager_context.get("employee") != manager.name:
				raise AssertionError("Manager context did not keep its own Employee identity.")
			manager_scan = scan_branch_qr(qr.qr_token, 47.9188, 106.9176, 10, "AUTO")
			if not manager_scan.get("accepted") or manager_scan.get("attendance_action") != "IN":
				raise AssertionError("Manager could not record their own QR attendance.")

		return {
			"status": "passed",
			"employee_mode": context.get("mode"),
			"employee_in_out": [first.get("attendance_action"), second.get("attendance_action")],
			"manager_mode": manager_context.get("mode"),
			"manager_qr": manager_scan.get("accepted"),
			"branch_scoped": manager_scan.get("branch") == branch,
		}
	finally:
		frappe.set_user(previous_user)
		frappe.db.rollback(save_point="all_employee_qr_smoke")
