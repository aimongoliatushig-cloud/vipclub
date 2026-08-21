from __future__ import annotations

from unittest.mock import patch
from uuid import uuid4

import frappe
from frappe.utils import now_datetime, today


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


def _profile(employee, name: str):
	return frappe.get_doc({
		"doctype": "VIP Entertainer Profile",
		"employee": employee.name,
		"stage_name": name,
		"active": 1,
		"lifecycle_status": "Active",
	}).insert(ignore_permissions=True)


def _assignment(employee: str, shift_type: str):
	doc = frappe.get_doc({
		"doctype": "Shift Assignment",
		"employee": employee,
		"shift_type": shift_type,
		"start_date": today(),
		"end_date": today(),
	}).insert(ignore_permissions=True)
	doc.flags.ignore_permissions = True
	doc.submit()
	return doc


def _checkin(employee: str, shift_type: str | None = None):
	values = {
		"doctype": "Employee Checkin",
		"employee": employee,
		"time": now_datetime(),
		"log_type": "IN",
	}
	if shift_type:
		values["shift"] = shift_type
	return frappe.get_doc(values).insert(ignore_permissions=True)


def run():
	"""Exercise the complete manager/lead readiness workflow and roll back all records."""
	from nomad_vip.api.attendance import scan_branch_qr
	from nomad_vip.api.schedule import get_manager_schedule, set_manager_schedule
	from nomad_vip.api.supervisor import get_readiness_queue, reverse_readiness, submit_readiness

	frappe.db.savepoint("august_role_workflow_smoke")
	previous_user = frappe.session.user
	try:
		suffix = uuid4().hex[:10]
		company = frappe.db.get_single_value("Global Defaults", "default_company") or frappe.db.get_value("Company", {}, "name")
		if not company:
			raise AssertionError("A company is required for the disposable role workflow smoke.")
		branch = frappe.get_doc({
			"doctype": "Branch", "branch": f"QA Rank {suffix}", "company": company,
		}).insert(ignore_permissions=True).name
		other_branch = frappe.get_doc({
			"doctype": "Branch", "branch": f"QA Other {suffix}", "company": company,
		}).insert(ignore_permissions=True).name
		shift_type = frappe.get_doc({
			"doctype": "Shift Type",
			"name": f"QA Night {suffix}",
			"start_time": "22:00:00",
			"end_time": "04:00:00",
		}).insert(ignore_permissions=True).name

		manager_user = _user(f"qa.manager.{suffix}@example.invalid", "QA Manager", ("Branch Manager",))
		lead_user = _user(f"qa.lead.{suffix}@example.invalid", "QA Lead", ("Entertainer", "Lead Entertainer"))
		dancer_users = [
			_user(f"qa.dancer{index}.{suffix}@example.invalid", f"QA Dancer {index}", ("Entertainer",))
			for index in range(1, 6)
		]
		other_user = _user(f"qa.other.{suffix}@example.invalid", "QA Other", ("Entertainer",))
		manager_employee = _employee(company=company, branch=branch, user=manager_user.name, first_name="QA Manager")
		lead_employee = _employee(company=company, branch=branch, user=lead_user.name, first_name="QA Lead")
		dancer_employees = [
			_employee(company=company, branch=branch, user=user.name, first_name=f"QA Dancer {index}")
			for index, user in enumerate(dancer_users, start=1)
		]
		other_employee = _employee(company=company, branch=other_branch, user=other_user.name, first_name="QA Other")
		lead_profile = _profile(lead_employee, "QA Ахлах")
		dancer_profiles = [
			_profile(employee, f"QA Охин {index}")
			for index, employee in enumerate(dancer_employees, start=1)
		]
		other_profile = _profile(other_employee, "QA Өөр салбар")

		lead_assignment = _assignment(lead_employee.name, shift_type)
		dancer_assignments = [_assignment(employee.name, shift_type) for employee in dancer_employees[:4]]
		manual_checkins = [_checkin(employee.name, shift_type) for employee in dancer_employees[:2]]
		_checkin(dancer_employees[3].name, shift_type)

		qr = frappe.get_doc({
			"doctype": "VIP Branch Attendance QR",
			"branch": branch,
			"qr_token": f"qa-rank-{suffix}",
			"active": 1,
			"latitude": 47.9188,
			"longitude": 106.9176,
			"radius_meters": 100,
			"configured_by": "Administrator",
			"configured_at": now_datetime(),
		}).insert(ignore_permissions=True)

		with patch("frappe.db.commit"):
			frappe.set_user(manager_user.name)
			scheduled = set_manager_schedule(
				profile_name=dancer_profiles[4].name,
				work_date=today(),
				shift_type=shift_type,
				reason="Бүрэн QA workflow",
				idempotency_key=f"qa-schedule:{suffix}",
			)
			replayed_schedule = set_manager_schedule(
				profile_name=dancer_profiles[4].name,
				work_date=today(),
				shift_type=shift_type,
				reason="Бүрэн QA workflow",
				idempotency_key=f"qa-schedule:{suffix}",
			)
			dancer_assignments.append(frappe.get_doc("Shift Assignment", scheduled["assignment"]["name"]))
			_checkin(dancer_employees[4].name, shift_type)
			manager_schedule = get_manager_schedule(today(), 7)

			manager_queue = get_readiness_queue("All", 100, 0, today())
			manager_denied_while_lead = False
			try:
				submit_readiness(
					dancer_profiles[0].name,
					dancer_assignments[0].name,
					"READY",
					employee_checkin=manual_checkins[0].name,
					idempotency_key=f"qa-manager-denied:{suffix}",
				)
			except frappe.PermissionError:
				manager_denied_while_lead = True

			frappe.set_user(dancer_users[2].name)
			qr_in = scan_branch_qr(qr.qr_token, 47.9188, 106.9176, 5, "IN")
			qr_out_denied = scan_branch_qr(qr.qr_token, 47.9188, 106.9176, 5, "OUT")

			frappe.set_user(lead_user.name)
			lead_queue_before = get_readiness_queue("All", 100, 0, today())
			manual_ready = submit_readiness(
				dancer_profiles[0].name,
				dancer_assignments[0].name,
				"READY",
				employee_checkin=manual_checkins[0].name,
				idempotency_key=f"qa-lead-manual-ready:{suffix}",
			)
			missing_reason_blocked = False
			try:
				submit_readiness(
					dancer_profiles[1].name,
					dancer_assignments[1].name,
					"NOT_READY",
					idempotency_key=f"qa-no-reason:{suffix}",
				)
			except frappe.ValidationError:
				missing_reason_blocked = True
			not_ready = submit_readiness(
				dancer_profiles[1].name,
				dancer_assignments[1].name,
				"NOT_READY",
				reason="Үс засалт дутуу байна",
				employee_checkin=manual_checkins[1].name,
				idempotency_key=f"qa-lead-not-ready:{suffix}",
			)
			not_ready_replay = submit_readiness(
				dancer_profiles[1].name,
				dancer_assignments[1].name,
				"NOT_READY",
				reason="Үс засалт дутуу байна",
				employee_checkin=manual_checkins[1].name,
				idempotency_key=f"qa-lead-not-ready:{suffix}",
			)
			qr_ready = submit_readiness(
				dancer_profiles[2].name,
				dancer_assignments[2].name,
				"READY",
				employee_checkin=qr_in["checkin"]["name"],
				idempotency_key=f"qa-lead-qr-ready:{suffix}",
			)

			cross_branch_denied = False
			try:
				submit_readiness(
					other_profile.name,
					dancer_assignments[0].name,
					"READY",
					idempotency_key=f"qa-cross-branch:{suffix}",
				)
			except frappe.PermissionError:
				cross_branch_denied = True

			stage_rounds = {"available": False}
			try:
				from nomad_vip.api.stage_rounds import get_daily_rounds, record_daily_round

				stage_rounds["available"] = True
				for number in range(1, 8):
					recorded = record_daily_round(
						dancer_profiles[2].name,
						work_date=today(),
						idempotency_key=f"qa-round:{suffix}:{number}",
					)
				stage_rounds["completed_rounds"] = next(
					row["rounds"] for row in recorded["people"] if row["entertainer"] == dancer_profiles[2].name
				)
				stage_rounds["eighth_blocked"] = False
				try:
					record_daily_round(
						dancer_profiles[2].name,
						work_date=today(),
						idempotency_key=f"qa-round:{suffix}:8",
					)
				except frappe.ValidationError:
					stage_rounds["eighth_blocked"] = True
				frappe.set_user(manager_user.name)
				manager_round = record_daily_round(
					dancer_profiles[1].name,
					work_date=today(),
					idempotency_key=f"qa-manager-round:{suffix}",
				)
				stage_rounds["manager_recorded_while_lead_on_duty"] = any(
					row["entertainer"] == dancer_profiles[1].name and row["rounds"] == 1
					for row in manager_round["people"]
				)
			except ModuleNotFoundError as exc:
				stage_rounds["error"] = str(exc)

			frappe.set_user("Administrator")
			lead_assignment.cancel()
			frappe.set_user(manager_user.name)
			fallback_queue = get_readiness_queue("All", 100, 0, today())
			fallback_ready = submit_readiness(
				dancer_profiles[3].name,
				dancer_assignments[3].name,
				"READY",
				idempotency_key=f"qa-manager-fallback:{suffix}",
			)
			reversed_ready = reverse_readiness(
				fallback_ready["name"],
				"QA засварын шалгалт",
				expected_modified=fallback_ready["modified"],
				idempotency_key=f"qa-manager-reverse:{suffix}",
			)
			queue_after_reverse = get_readiness_queue("All", 100, 0, today())
			resubmit_after_reverse_blocked = False
			try:
				submit_readiness(
					dancer_profiles[3].name,
					dancer_assignments[3].name,
					"NOT_READY",
					reason="Засварын дараах шинэ үнэлгээ",
					idempotency_key=f"qa-manager-resubmit:{suffix}",
				)
			except frappe.ValidationError:
				resubmit_after_reverse_blocked = True

			ordered = get_readiness_queue("All", 100, 0, today())["queue"]
			ordered_statuses = [row["readiness_status"] for row in ordered]
			first_completed_index = next(
				(index for index, status in enumerate(ordered_statuses) if status != "PENDING"),
				len(ordered_statuses),
			)
			pending_before_completed = all(
				status == "PENDING" for status in ordered_statuses[:first_completed_index]
			) and all(status != "PENDING" for status in ordered_statuses[first_completed_index:])

		return {
			"status": "passed",
			"manager_schedule_created": bool(scheduled.get("assignment")),
			"manager_schedule_replayed": bool(replayed_schedule.get("replayed")),
			"manager_schedule_contains_dancer": any(
				row.get("profile") == dancer_profiles[4].name for row in manager_schedule.get("people") or []
			),
			"manager_read_only_while_lead_on_duty": manager_queue["access"]["mode"] == "manager_read_only",
			"manager_denied_while_lead_on_duty": manager_denied_while_lead,
			"lead_queue_size": lead_queue_before["summary"]["total"],
			"manual_employee_checkin_accepted_as_qr_evidence": manual_ready["result"] == "READY",
			"qr_scan_accepted": bool(qr_in.get("accepted")) and qr_in.get("result") == "Accepted",
			"entertainer_out_scan_denied": not bool(qr_out_denied.get("accepted")),
			"qr_readiness_saved": qr_ready["result"] == "READY",
			"not_ready_reason_required": missing_reason_blocked,
			"not_ready_saved": not_ready["result"] == "NOT_READY",
			"not_ready_replayed": bool(not_ready_replay.get("replayed")),
			"cross_branch_denied": cross_branch_denied,
			"stage_rounds": stage_rounds,
			"manager_fallback_mode": fallback_queue["access"]["mode"],
			"manager_fallback_saved": fallback_ready["result"] == "READY",
			"readiness_reversed": bool(reversed_ready.get("is_reversed")),
			"reversed_row_still_projects_status": next(
				row["readiness_status"] for row in queue_after_reverse["queue"]
				if row["entertainer"] == dancer_profiles[3].name
			),
			"resubmit_after_reverse_blocked": resubmit_after_reverse_blocked,
			"pending_before_completed": pending_before_completed,
			"lead_profile": lead_profile.name,
			"manager_employee": manager_employee.name,
		}
	finally:
		frappe.set_user(previous_user)
		frappe.db.rollback(save_point="august_role_workflow_smoke")
