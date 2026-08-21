from pathlib import Path
import unittest


SOURCE = (
	Path(__file__).parents[1] / "nomad_vip" / "api" / "management.py"
).read_text(encoding="utf-8")


class EmployeeLifecycleContractTest(unittest.TestCase):
	def test_people_roles_are_separate_from_commercial_management_roles(self):
		self.assertIn('require_actor("Branch Manager", "HR Manager", "System Manager")', SOURCE)
		self.assertIn('require_actor("Branch Manager", "CEO", "System Manager")', SOURCE)
		self.assertIn('roles.intersection({"HR Manager", "System Manager"})', SOURCE)

	def test_branch_manager_scope_is_server_enforced(self):
		self.assertIn('if requested and requested != actor.branch:', SOURCE)
		self.assertIn('Өөр салбарын ажилтны мэдээлэлд хандах эрхгүй байна.', SOURCE)
		self.assertIn('selected_branch = _people_branch(actor, employee.branch)', SOURCE)

	def test_hire_creates_only_employee_master(self):
		hire = SOURCE.split("def hire_employee(", 1)[1].split("def terminate_employee(", 1)[0]
		self.assertIn('"doctype": "Employee"', hire)
		self.assertNotIn('"doctype": "User"', hire)
		self.assertNotIn('"doctype": "VIP Entertainer Profile"', hire)
		self.assertIn('employee.lifecycle.hire', hire)
		self.assertIn('request_hash', hire)

	def test_termination_is_locked_audited_and_non_destructive(self):
		terminate = SOURCE.split("def terminate_employee(", 1)[1]
		self.assertIn('FOR UPDATE', terminate)
		self.assertIn('assert_not_stale("Employee"', terminate)
		self.assertIn('"status": "Inactive"', terminate)
		self.assertIn('"lifecycle_status": "Inactive"', terminate)
		self.assertIn('"assignment_status": "Ended"', terminate)
		self.assertIn('"assignment_status", "Cancelled"', terminate)
		self.assertIn('"enabled", 0', terminate)
		self.assertIn('frappe.db.delete("Sessions"', terminate)
		self.assertIn('employee.lifecycle.terminate', terminate)
		self.assertNotIn('delete("Employee"', terminate)

	def test_hr_route_is_visible_without_expanding_customer_access(self):
		self.assertIn('{"CEO", "Branch Manager", "HR Manager", "System Manager"}', SOURCE)
		customer = SOURCE.split("def get_manager_customers(", 1)[1].split("def get_manager_team(", 1)[0]
		self.assertIn('actor = _management_actor()', customer)
		self.assertNotIn('_people_actor()', customer)


if __name__ == "__main__":
	unittest.main()
