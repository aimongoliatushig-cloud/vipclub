import ast
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1] / "nomad_vip"


class CrossBranchBanVisibilityContractTest(unittest.TestCase):
	def function_source(self, relative, name):
		path = ROOT / relative
		source = path.read_text(encoding="utf-8")
		tree = ast.parse(source)
		for node in ast.walk(tree):
			if isinstance(node, ast.FunctionDef) and node.name == name:
				return ast.get_source_segment(source, node) or ""
		self.fail(f"Missing function {name} in {relative}")

	def test_customer_detail_exposes_only_active_ban_notices_to_manager_roles(self):
		source = self.function_source("api/customer.py", "get_customer_detail")
		self.assertIn('{"System Manager", "CEO", "Branch Manager"}', source)
		self.assertIn('filters={"customer": customer, "is_banned": 1}', source)
		self.assertIn('fields=["branch", "ban_reason", "banned_by", "banned_at"]', source)
		self.assertIn('"branch_ban_notices": branch_ban_notices', source)

	def test_entry_enforcement_remains_scoped_to_the_current_branch(self):
		source = self.function_source("api/entry.py", "admit_customer")
		self.assertIn('{"customer": customer, "branch": branch}', source)
		self.assertIn('if profile.is_banned:', source)

	def test_manager_ban_requires_a_written_reason_and_current_branch(self):
		source = self.function_source("api/customer.py", "set_customer_ban")
		self.assertIn('require_actor("Branch Manager", require_branch=True)', source)
		self.assertIn('if not reason:', source)
		self.assertIn('{"customer": customer, "branch": branch}', source)
		self.assertIn('record_api_audit(', source)
		self.assertIn('"previous_reason": profile.ban_reason or ""', source)

	def test_manager_can_search_and_manage_without_a_door_qr(self):
		search = self.function_source("api/entry.py", "search_customer_for_manager")
		self.assertIn("branch = _manager_branch()", search)
		self.assertIn("len(digits) != 8", search)
		self.assertNotIn("branch = _branch()", search)
		for function_name in (
			"get_customer_detail_for_entry",
			"set_customer_rank_for_entry",
			"set_customer_ban_for_entry",
		):
			source = self.function_source("api/entry.py", function_name)
			self.assertIn("_manager_branch()", source)
			self.assertNotIn("\n\t_branch()", source)


if __name__ == "__main__":
	unittest.main()
