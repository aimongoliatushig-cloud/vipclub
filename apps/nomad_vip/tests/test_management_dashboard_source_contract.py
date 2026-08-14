from pathlib import Path
from unittest import TestCase


ROOT = Path(__file__).resolve().parents[1]


class TestManagementDashboardSourceContract(TestCase):
	def test_company_dashboard_requires_global_management_role(self):
		source = (ROOT / "nomad_vip/api/management.py").read_text(encoding="utf-8")
		company_block = source.split("def get_company_dashboard", 1)[1]
		self.assertIn('require_actor("CEO", "System Manager")', company_block)
		self.assertIn('"branches": branches', company_block)
		self.assertIn('"pending_goals": pending_goals', company_block)

	def test_manager_session_issues_a_csrf_token_for_cookie_authenticated_writes(self):
		source = (ROOT / "nomad_vip/api/management.py").read_text(encoding="utf-8")
		session_block = source.split("def get_session", 1)[1].split("def get_manager_customers", 1)[0]
		self.assertIn('@frappe.whitelist(allow_guest=True, methods=["GET"])', source)
		self.assertIn('return {"authenticated": False}', session_block)
		self.assertIn('csrf_token = frappe.sessions.get_csrf_token()', session_block)
		self.assertIn('"csrf_token": csrf_token', session_block)

	def test_schedule_supports_the_documented_month_view(self):
		source = (ROOT / "nomad_vip/api/schedule.py").read_text(encoding="utf-8")
		self.assertIn("MAX_SCHEDULE_DAYS = 31", source)
		self.assertIn("1–31 хоногийн хуваарь", source)
		self.assertIn('"Employee"', source)
		self.assertIn('filters={"branch": actor.branch, "status": "Active"}', source)

	def test_team_roster_uses_active_employees_and_company_reports_unassigned_people(self):
		source = (ROOT / "nomad_vip/api/management.py").read_text(encoding="utf-8")
		team_block = source.split("def get_manager_team", 1)[1].split("def get_manager_penalties", 1)[0]
		self.assertIn('filters = {"status": "Active", "branch": branch}', team_block)
		self.assertIn('"member_type": "Entertainer" if profile else "Employee"', team_block)
		self.assertIn('"unassigned_active_employees"', source)
		self.assertIn('"Leave Application"', source)
		self.assertIn('"status": "Open", "docstatus": 0', source)

	def test_ceo_can_only_assign_a_confirmed_branch_to_an_unassigned_employee(self):
		source = (ROOT / "nomad_vip/api/management.py").read_text(encoding="utf-8")
		block = source.split("def assign_employee_branch", 1)[1].split("def get_manager_penalties", 1)[0]
		self.assertIn('require_actor("CEO", "System Manager")', block)
		self.assertIn("if branch not in VIP_BRANCHES", block)
		self.assertIn("if employee.branch:", block)
		self.assertIn('action="ceo.employee_branch.assign"', block)
		self.assertIn('target_doctype="Employee"', block)


if __name__ == "__main__":
	import unittest
	unittest.main()
