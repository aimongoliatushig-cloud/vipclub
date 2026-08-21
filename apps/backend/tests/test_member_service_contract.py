from __future__ import annotations

import ast
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "nomad_vip" / "api" / "member.py"


class MemberServiceContractTests(unittest.TestCase):
	def setUp(self):
		self.source = SOURCE.read_text(encoding="utf-8")
		self.tree = ast.parse(self.source)

	def test_guest_endpoint_is_protected_before_identity_lookup(self):
		function = next(node for node in self.tree.body if isinstance(node, ast.FunctionDef) and node.name == "get_member_context")
		calls = [node for node in ast.walk(function) if isinstance(node, ast.Call)]
		call_names = []
		for call in calls:
			if isinstance(call.func, ast.Name):
				call_names.append(call.func.id)
		self.assertLess(call_names.index("_require_member_service_key"), call_names.index("_find_customer_by_phone"))
		self.assertIn("allow_guest=True", ast.get_source_segment(self.source, function.decorator_list[0]))

	def test_projection_excludes_customer_pii_and_financial_history(self):
		for forbidden in ("customer_name", '"phone"', "total_spend", "average_bill", "bill_count", "wallet"):
			self.assertNotIn(forbidden, self.source)
		for required in ('"found"', '"branch"', '"rank"', '"access"'):
			self.assertIn(required, self.source)


if __name__ == "__main__":
	unittest.main()
