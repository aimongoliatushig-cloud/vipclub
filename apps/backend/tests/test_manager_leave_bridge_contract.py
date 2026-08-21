import ast
import pathlib
import unittest


ROOT = pathlib.Path(__file__).parents[1]
SOURCE = ROOT / "nomad_vip" / "api" / "attendance_policy.py"


class ManagerLeaveBridgeContractTest(unittest.TestCase):
	@classmethod
	def setUpClass(cls):
		cls.source = SOURCE.read_text(encoding="utf-8")
		cls.tree = ast.parse(cls.source)
		cls.functions = {
			node.name: ast.get_source_segment(cls.source, node) or ""
			for node in cls.tree.body
			if isinstance(node, ast.FunctionDef)
		}

	def test_manager_queue_combines_emergency_and_standard_leave(self):
		body = self.functions["get_manager_leave_requests"]
		self.assertIn('"VIP Emergency Leave Request"', body)
		self.assertIn('"Leave Application"', body)
		self.assertIn('row["source_type"] = "Leave Application"', body)
		self.assertIn("page_meta", body)

	def test_standard_leave_decision_is_branch_scoped_locked_and_audited(self):
		body = self.functions["decide_manager_leave"]
		self.assertIn("require_actor", body)
		self.assertIn("FOR UPDATE", body)
		self.assertIn("doc.employee", body)
		self.assertIn("employee_branch", body)
		self.assertIn("assert_not_stale", body)
		self.assertIn("record_api_audit", body)
		self.assertIn("doc.submit()", body)

	def test_emergency_requests_keep_the_existing_audited_decision_path(self):
		body = self.functions["decide_manager_leave"]
		self.assertIn("decide_emergency_leave", body)
		self.assertIn("idempotency_key=idempotency_key", body)

	def test_staff_frontend_routes_both_leave_sources_through_the_bridge(self):
		api = (ROOT.parent / "entertainer-app" / "src" / "api.ts").read_text(encoding="utf-8")
		ui = (ROOT.parent / "entertainer-app" / "src" / "features" / "attendance" / "LeavePolicy.tsx").read_text(encoding="utf-8")
		self.assertIn("attendance_policy.decide_manager_leave", api)
		self.assertIn("source_type: source_type || 'Emergency Leave'", api)
		self.assertIn("api.decideManagerLeave(row.name, row.source_type", ui)

	def test_entertainer_can_choose_hourly_or_standard_day_leave(self):
		policy_body = self.functions["get_leave_policy"]
		create_body = self.functions["submit_day_leave"]
		api = (ROOT.parent / "entertainer-app" / "src" / "api.ts").read_text(encoding="utf-8")
		ui = (ROOT.parent / "entertainer-app" / "src" / "features" / "attendance" / "LeavePolicy.tsx").read_text(encoding="utf-8")
		self.assertIn('"day_leave_types"', policy_body)
		self.assertIn('"Leave Application"', policy_body)
		self.assertIn('"doctype": "Leave Application"', create_body)
		self.assertIn('action="entertainer.day_leave.create"', create_body)
		self.assertIn("attendance_policy.submit_day_leave", api)
		self.assertIn("Цагийн чөлөө", ui)
		self.assertIn("Өдрийн чөлөө", ui)

	def test_entertainer_day_leave_backend_contract(self):
		policy_body = self.functions["get_leave_policy"]
		create_body = self.functions["submit_day_leave"]
		self.assertIn('"day_leave_types"', policy_body)
		self.assertIn('"Leave Application"', policy_body)
		self.assertIn('"doctype": "Leave Application"', create_body)
		self.assertIn('action="entertainer.day_leave.create"', create_body)
		self.assertIn("to_day = from_day", create_body)
		self.assertIn("_default_day_leave_type(profile.employee, from_day)", create_body)
		self.assertNotIn("leave_type not in _day_leave_types", create_body)

	def test_manager_dashboard_pending_count_includes_standard_employee_leave(self):
		workforce = (ROOT / "nomad_vip" / "api" / "workforce.py").read_text(encoding="utf-8")
		tree = ast.parse(workforce)
		functions = {
			node.name: ast.get_source_segment(workforce, node) or ""
			for node in tree.body
			if isinstance(node, ast.FunctionDef)
		}
		body = functions["_pending_manager_leave_count"]
		self.assertIn('"VIP Emergency Leave Request"', body)
		self.assertIn('"Leave Application"', body)
		self.assertIn('"status": "Open"', body)
		self.assertIn('"pending_leave": _pending_manager_leave_count(branch)', workforce)


if __name__ == "__main__":
	unittest.main()
