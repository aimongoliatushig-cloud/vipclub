import ast
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1] / "nomad_vip"


class VipEntryBranchAccessContractTest(unittest.TestCase):
	def source(self, relative):
		return (ROOT / relative).read_text(encoding="utf-8")

	def function_source(self, relative, name):
		source = self.source(relative)
		tree = ast.parse(source)
		for node in ast.walk(tree):
			if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == name:
				return ast.get_source_segment(source, node) or ""
		self.fail(f"Missing function {name} in {relative}")

	def test_each_branch_qr_projects_a_separate_vip_entry_url(self):
		source = self.function_source("api/attendance.py", "get_branch_qr")
		self.assertIn('"entry_qr_payload"', source)
		self.assertIn('/vip-entry/?entry_access=', source)

	def test_access_verification_requires_role_qr_gps_branch_and_radius(self):
		source = self.source("api/entry_access.py")
		for contract in (
			'require_actor("Reception", "Operation", "Branch Manager")',
			'"VIP Branch Attendance QR"',
			'MAX_LOCATION_ACCURACY_METERS',
			'requested_branch != config.branch',
			'actor.branch != config.branch',
			'distance > int(config.radius_meters or 100)',
		):
			self.assertIn(contract, source)

	def test_entry_qr_resolves_a_public_branch_locked_login_without_location_data(self):
		source = self.function_source("api/entry_access.py", "get_entry_qr_context")
		module_source = self.source("api/entry_access.py")
		self.assertIn('@frappe.whitelist(allow_guest=True, methods=["GET"])', module_source)
		self.assertIn('"VIP Branch Attendance QR"', source)
		self.assertIn('"branch": config.branch', source)
		self.assertNotIn('latitude":', source)
		self.assertNotIn('longitude":', source)

	def test_context_is_readable_before_qr_but_marks_access_required(self):
		source = self.function_source("api/entry.py", "get_context")
		self.assertIn('"entry_access_required": not is_admin and not test_entry_access_bypass', source)
		self.assertIn('"entry_access_test_bypass": test_entry_access_bypass', source)
		self.assertNotIn("require_entry_access", source)

	def test_temporary_bypass_is_server_controlled_and_limited_to_guard_and_operator(self):
		source = self.source("api/entry_access.py")
		role_source = self.function_source("api/entry_access.py", "_is_test_bypass_role")
		branch_source = self.function_source("api/entry_access.py", "_test_bypass_branch")
		self.assertIn('TEST_BYPASS_CONFIG_KEY = "vip_entry_test_bypass_qr"', source)
		self.assertIn('frappe.conf.get(TEST_BYPASS_CONFIG_KEY)', source)
		self.assertIn('{"Reception", "Operation"}', role_source)
		self.assertIn('"Branch Manager" in roles', role_source)
		self.assertIn('requested_branch not in VIP_BRANCHES', branch_source)
		self.assertIn('requested_branch != actor.branch', branch_source)

	def test_api_enforcement_uses_bypass_before_qr_validation(self):
		source = self.function_source("api/entry_access.py", "require_entry_access")
		self.assertIn('require_actor("Reception", "Operation", "Branch Manager")', source)
		self.assertIn("_test_bypass_branch(actor, branch)", source)
		self.assertLess(source.index("_test_bypass_branch"), source.index("_validate_entry_access"))

	def test_guard_manager_and_operator_actions_require_branch_access(self):
		entry_source = self.function_source("api/entry.py", "_branch")
		operation_source = self.function_source("api/operation.py", "_branch")
		reservation_source = self.function_source("api/operation.py", "_reservation_branch")
		customer_lookup = self.function_source("api/customer.py", "lookup_customer_by_phone")
		customer_register = self.function_source("api/customer.py", "register_walk_in_customer")
		for source in (entry_source, operation_source, reservation_source, customer_lookup, customer_register):
			self.assertIn("require_entry_access", source)

	def test_operator_cannot_cancel_a_reservation_outside_scanned_branch(self):
		source = self.function_source("api/operation.py", "cancel_phone_reservation")
		self.assertIn("_reservation_branch(doc.branch)", source)
		self.assertNotIn('"Operation" in roles', source)


if __name__ == "__main__":
	unittest.main()
