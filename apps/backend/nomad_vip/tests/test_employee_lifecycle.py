from unittest.mock import patch
from uuid import uuid4

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import today

from nomad_vip.api.management import hire_employee, terminate_employee
from nomad_vip.api.security import ActorContext
from nomad_vip.integrations.finex import ensure_vip_branches


class TestEmployeeLifecycle(FrappeTestCase):
	def setUp(self):
		ensure_vip_branches()
		self.company = frappe.defaults.get_global_default("company") or frappe.db.get_value("Company", {}, "name")
		self.gender = frappe.db.get_value("Gender", {}, "name")
		self.designation = frappe.db.get_value("Designation", {}, "name")
		if not self.company or not self.gender or not self.designation:
			self.skipTest("Employee master options are not installed on this test site")
		self.created = []

	def tearDown(self):
		for employee in reversed(self.created):
			if frappe.db.exists("Employee", employee):
				frappe.delete_doc("Employee", employee, force=True, ignore_permissions=True)
		frappe.db.delete("VIP API Audit Event", {"target_doctype": "Employee", "target_name": ("in", self.created)})
		frappe.db.commit()

	def _hire(self, actor, branch):
		suffix = uuid4().hex[:10]
		with patch("nomad_vip.api.management._people_actor", return_value=actor), patch(
			"nomad_vip.api.management.record_api_audit", return_value="AUDIT-TEST"
		):
			result = hire_employee(
				first_name=f"Lifecycle {suffix}",
				gender=self.gender,
				date_of_birth="2000-01-01",
				date_of_joining=today(),
				company=self.company,
				designation=self.designation,
				reason="Батлагдсан тестийн орон тоо",
				branch=branch,
				idempotency_key=f"employee-hire:{suffix}",
			)
		self.created.append(result["employee"].name)
		return result

	def test_branch_manager_hires_and_terminates_only_own_branch(self):
		actor = ActorContext("manager.test@example.com", frozenset({"Branch Manager"}), "Branch Manager", "Nomad", None)
		result = self._hire(actor, "Nomad")
		employee = result["employee"]
		self.assertEqual(employee.branch, "Nomad")
		self.assertFalse(frappe.db.get_value("Employee", employee.name, "user_id"))
		self.assertFalse(frappe.db.exists("VIP Entertainer Profile", {"employee": employee.name}))
		with patch("nomad_vip.api.management._people_actor", return_value=actor), patch(
			"nomad_vip.api.management.record_api_audit", return_value="AUDIT-TEST"
		):
			with self.assertRaises(frappe.PermissionError):
				hire_employee(
					first_name="Cross Branch",
					gender=self.gender,
					date_of_birth="2000-01-01",
					date_of_joining=today(),
					company=self.company,
					designation=self.designation,
					reason="Өөр салбарын тест",
					branch="Neva",
					idempotency_key=f"cross:{uuid4().hex}",
				)
		with patch("nomad_vip.api.management._people_actor", return_value=actor), patch(
			"nomad_vip.api.management.record_api_audit", return_value="AUDIT-TEST"
		):
			terminated = terminate_employee(
				employee.name,
				today(),
				"Тестийн хөдөлмөрийн харилцааг дуусгав",
				employee.modified,
				f"employee-terminate:{uuid4().hex}",
			)
		self.assertEqual(terminated["employee"].status, "Inactive")

	def test_hr_manager_can_choose_any_confirmed_branch(self):
		actor = ActorContext("hr.test@example.com", frozenset({"HR Manager"}), "HR Manager", None, None)
		result = self._hire(actor, "Sapphire")
		self.assertEqual(result["employee"].branch, "Sapphire")
