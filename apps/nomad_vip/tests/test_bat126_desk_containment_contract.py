from __future__ import annotations

import ast
import json
from pathlib import Path
from unittest import TestCase


ROOT = Path(__file__).resolve().parents[1]


def _function_source(relative_path: str, function_name: str) -> str:
	path = ROOT / relative_path
	source = path.read_text(encoding="utf-8")
	tree = ast.parse(source)
	for node in ast.walk(tree):
		if isinstance(node, ast.FunctionDef) and node.name == function_name:
			return ast.get_source_segment(source, node) or ""
	raise AssertionError(f"{function_name} not found in {relative_path}")


class TestBat126DeskContainmentContract(TestCase):
	def test_sensitive_customer_doctypes_have_query_and_document_hooks(self):
		hooks = (ROOT / "nomad_vip/hooks.py").read_text(encoding="utf-8")
		for doctype in ("VIP POS Bill", "VIP Customer Branch Profile"):
			with self.subTest(doctype=doctype):
				self.assertEqual(hooks.count(f'"{doctype}"'), 2)

	def test_pos_bill_policy_is_fail_closed_and_branch_scoped(self):
		query = _function_source("nomad_vip/permissions/core.py", "get_pos_bill_query_conditions")
		permission = _function_source("nomad_vip/permissions/core.py", "has_pos_bill_permission")
		self.assertIn('"Branch Manager" not in _roles(user)', query)
		self.assertIn('return "1 = 0"', query)
		self.assertIn("get_branch_for_user(user)", query)
		self.assertIn("VIP POS Bill", query)
		self.assertIn("actor_branch == bill_branch", permission)
		self.assertNotIn('"write"', permission)

	def test_full_customer_branch_profile_is_manager_branch_scoped(self):
		query = _function_source(
			"nomad_vip/permissions/core.py", "get_customer_branch_profile_query_conditions"
		)
		permission = _function_source(
			"nomad_vip/permissions/core.py", "has_customer_branch_profile_permission"
		)
		self.assertIn('"Branch Manager" not in _roles(user)', query)
		self.assertIn('return "1 = 0"', query)
		self.assertIn("get_branch_for_user(user)", query)
		self.assertIn("doc.branch == get_branch_for_user(user)", permission)
		self.assertNotIn('"write"', permission)

	def test_unsafe_report_is_global_only_and_guards_before_sql(self):
		report_root = ROOT / "nomad_vip/nomad_vip/report/vip_customer_intelligence"
		metadata = json.loads((report_root / "vip_customer_intelligence.json").read_text(encoding="utf-8"))
		self.assertEqual({row["role"] for row in metadata["roles"]}, {"System Manager", "CEO"})

		execute = _function_source(
			"nomad_vip/nomad_vip/report/vip_customer_intelligence/vip_customer_intelligence.py",
			"execute",
		)
		self.assertLess(execute.index("_require_report_access()"), execute.index("frappe.db.sql"))

	def test_legacy_reception_page_is_system_manager_only(self):
		path = ROOT / "nomad_vip/nomad_vip/page/vip_reception/vip_reception.json"
		metadata = json.loads(path.read_text(encoding="utf-8"))
		self.assertEqual(metadata["roles"], [{"role": "System Manager"}])


if __name__ == "__main__":
	import unittest

	unittest.main()
