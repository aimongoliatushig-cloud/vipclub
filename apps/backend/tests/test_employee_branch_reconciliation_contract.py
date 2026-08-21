from __future__ import annotations

import ast
from pathlib import Path
from unittest import TestCase


ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / "nomad_vip/imports/employee_branch_reconciliation.py"


def _function_source(name: str) -> str:
	source = MODULE.read_text(encoding="utf-8")
	tree = ast.parse(source)
	for node in ast.walk(tree):
		if isinstance(node, ast.FunctionDef) and node.name == name:
			return ast.get_source_segment(source, node) or ""
	raise AssertionError(f"missing function {name}")


class TestEmployeeBranchReconciliationContract(TestCase):
	def test_mapping_is_exact_four_branch_and_blank_only(self):
		source = MODULE.read_text(encoding="utf-8")
		self.assertIn('{"Nomad", "Neva", "Sapphire", "Monarch"}', source)
		self.assertIn('policy.get("updateOnlyBlankBranch") is not True', source)
		self.assertIn('confidence not in {"exact", "reviewed"}', source)
		self.assertIn('confidence == "reviewed" and not reviewed_recommendations', source)

	def test_preflight_never_overwrites_existing_branch(self):
		source = _function_source("_preflight")
		self.assertIn("if not current:", source)
		self.assertIn("elif current == target:", source)
		self.assertIn("conflicts.append", source)

	def test_apply_locks_before_updates_and_is_audited(self):
		rows = _function_source("_employee_rows")
		run = _function_source("run")
		self.assertIn('query += " FOR UPDATE"', rows)
		self.assertLess(run.index("_preflight"), run.index('frappe.get_doc("Employee"'))
		self.assertIn("record_api_audit", run)
		self.assertIn("frappe.db.rollback", run)
		self.assertIn("mapping_hash", run)

	def test_no_login_profile_or_assignment_creation(self):
		source = MODULE.read_text(encoding="utf-8")
		for forbidden in (
			'frappe.get_doc("User"',
			'"doctype": "User"',
			'"doctype": "VIP Entertainer Profile"',
			'"doctype": "VIP Entertainer Branch Assignment"',
		):
			self.assertNotIn(forbidden, source)


if __name__ == "__main__":
	import unittest

	unittest.main()
