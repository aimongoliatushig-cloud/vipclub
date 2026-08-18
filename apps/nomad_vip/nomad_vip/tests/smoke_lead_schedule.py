from __future__ import annotations

from unittest.mock import patch
from uuid import uuid4

import frappe
from frappe.utils import get_datetime, today

from nomad_vip.api.schedule import get_manager_schedule, set_manager_schedule
from nomad_vip.api.supervisor import get_readiness_queue, submit_readiness
from nomad_vip.api.workforce import get_context
from nomad_vip.api.admin import set_lead_entertainer


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
		"date_of_birth": "2000-01-01",
		"date_of_joining": today(),
		"company": company,
		"branch": branch,
		"status": "Active",
		"user_id": user,
	}).insert(ignore_permissions=True)


def run():
	"""Exercise manager schedule + lead checklist on a disposable site and roll back."""
	frappe.db.savepoint("lead_schedule_smoke")
	previous_user = frappe.session.user
	try:
		suffix = uuid4().hex[:10]
		company = frappe.db.get_single_value("Global Defaults", "default_company") or frappe.db.get_value("Company", {}, "name")
		if not company:
			company = frappe.get_doc({
				"doctype": "Company",
				"company_name": f"NOMAD Smoke {suffix}",
				"abbr": f"NS{suffix[:4]}",
				"default_currency": "MNT",
				"country": "Mongolia",
			}).insert(ignore_permissions=True).name
		branch = frappe.db.get_value("Branch", {"name": "Nomad"}, "name") or frappe.db.get_value("Branch", {}, "name")
		if not branch:
			branch = frappe.get_doc({
				"doctype": "Branch", "branch": "Nomad", "company": company,
			}).insert(ignore_permissions=True).name
		shift_type = frappe.db.get_value("Shift Type", {"name": "VIP Night Shift"}, "name") or frappe.db.get_value("Shift Type", {}, "name")
		if not shift_type:
			shift_type = frappe.get_doc({
				"doctype": "Shift Type", "name": "VIP Night Shift", "shift_type": "VIP Night Shift",
				"start_time": "19:00:00", "end_time": "03:00:00",
			}).insert(ignore_permissions=True).name
		manager_user = _user(f"smoke.manager.{suffix}@example.invalid", "Smoke Manager", ("Branch Manager",))
		lead_user = _user(f"smoke.lead.{suffix}@example.invalid", "Smoke Lead", ("Entertainer", "Lead Entertainer"))
		dancer_user = _user(f"smoke.dancer.{suffix}@example.invalid", "Smoke Dancer", ("Entertainer",))
		_manager = _employee(company=company, branch=branch, user=manager_user.name, first_name="Smoke Manager")
		lead_employee = _employee(company=company, branch=branch, user=lead_user.name, first_name="Smoke Lead")
		dancer_employee = _employee(company=company, branch=branch, user=dancer_user.name, first_name="Smoke Dancer")
		frappe.get_doc({
			"doctype": "VIP Entertainer Profile", "employee": lead_employee.name,
			"stage_name": "Smoke Lead", "active": 1, "lifecycle_status": "Active",
		}).insert(ignore_permissions=True)
		dancer_profile = frappe.get_doc({
			"doctype": "VIP Entertainer Profile", "employee": dancer_employee.name,
			"stage_name": "Smoke Dancer", "active": 1, "lifecycle_status": "Active",
		}).insert(ignore_permissions=True)

		with patch("frappe.db.commit"):
			frappe.set_user(manager_user.name)
			scheduled = set_manager_schedule(
				profile_name=dancer_profile.name,
				work_date=today(),
				shift_type=shift_type,
				reason="Тусгаарласан smoke шалгалт",
				idempotency_key=f"smoke-schedule:{suffix}",
			)
			if not scheduled.get("assignment"):
				raise AssertionError("Manager schedule was not created.")
			manager_view = get_manager_schedule(today(), 7)
			if not any(row.get("profile") == dancer_profile.name for row in manager_view.get("people") or []):
				raise AssertionError("Manager schedule did not project the assigned dancer.")

			assignment_name = scheduled["assignment"]["name"]
			frappe.get_doc({
				"doctype": "Employee Checkin",
				"employee": dancer_employee.name,
				"time": get_datetime(f"{today()} 19:05:00"),
				"log_type": "IN",
				"shift": shift_type,
			}).insert(ignore_permissions=True)

			manager_denied = False
			try:
				submit_readiness(
					entertainer=dancer_profile.name,
					shift_assignment=assignment_name,
					result="READY",
					idempotency_key=f"smoke-manager-denied:{suffix}",
				)
			except frappe.PermissionError:
				manager_denied = True
			if not manager_denied:
				raise AssertionError("Branch Manager unexpectedly submitted the lead checklist.")

			frappe.set_user(lead_user.name)
			context = get_context()
			if context.get("mode") != "lead":
				raise AssertionError("Lead Entertainer context was not selected.")
			queue = get_readiness_queue("Pending", 100, 0, today())
			row = next((item for item in queue.get("queue") or [] if item.get("entertainer") == dancer_profile.name), None)
			if not row or not row.get("attendance", {}).get("checked_in"):
				raise AssertionError("Lead checklist did not receive verified QR attendance evidence.")
			result = submit_readiness(
				entertainer=dancer_profile.name,
				shift_assignment=assignment_name,
				result="READY",
				employee_checkin=row["attendance"]["employee_checkin"],
				idempotency_key=f"smoke-lead-ready:{suffix}",
			)
			if result.get("result") != "READY":
				raise AssertionError("Lead checklist did not persist the readiness decision.")

			frappe.set_user("Administrator")
			role_result = set_lead_entertainer(
				profile_name=dancer_profile.name,
				enabled=1,
				reason="Тусгаарласан role smoke шалгалт",
				idempotency_key=f"smoke-lead-role:{suffix}",
			)
			if not role_result.get("person", {}).get("is_lead"):
				raise AssertionError("System admin did not assign the Lead Entertainer role.")

		return {
			"status": "passed",
			"manager_schedule": True,
			"manager_checklist_denied": manager_denied,
			"lead_mode": context.get("mode"),
			"qr_evidence": True,
			"readiness_result": result.get("result"),
			"admin_role_assignment": True,
		}
	finally:
		frappe.set_user(previous_user)
		frappe.db.rollback(save_point="lead_schedule_smoke")
