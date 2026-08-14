from __future__ import annotations

import ast
import json
from pathlib import Path
from unittest import TestCase


ROOT = Path(__file__).resolve().parents[1]


class TestBat126DeskPolicyContract(TestCase):
	def test_policy_is_hide_first_and_preserves_unmanaged_profiles(self):
		source = (ROOT / "nomad_vip/desk_policy.py").read_text(encoding="utf-8")
		tree = ast.parse(source)
		self.assertIn("Module Profile", source)
		self.assertIn("current_profile and not current_is_managed", source)
		self.assertIn('return "preserved"', source)
		self.assertNotIn("delete_doc", source)
		self.assertNotIn("desk_access", source)
		self.assertTrue(any(isinstance(node, ast.FunctionDef) and node.name == "ensure_desk_policy" for node in ast.walk(tree)))

	def test_privileged_desk_roles_are_not_restricted(self):
		source = (ROOT / "nomad_vip/desk_policy.py").read_text(encoding="utf-8")
		for role in ("System Manager", "CEO", "Accountant", "HR Manager", "HR User"):
			self.assertIn(f'"{role}"', source)
		self.assertNotIn('"VIP Admin", "System Manager"', source)

	def test_workspaces_only_launch_the_role_apps(self):
		staff = json.loads(
			(ROOT / "nomad_vip/nomad_vip/workspace/nomad_staff/nomad_staff.json").read_text(
				encoding="utf-8"
			)
		)
		entry = json.loads(
			(ROOT / "nomad_vip/nomad_vip/workspace/nomad_entry/nomad_entry.json").read_text(
				encoding="utf-8"
			)
		)
		self.assertEqual([row["url"] for row in staff["shortcuts"]], ["/staff/"])
		self.assertEqual([row["url"] for row in entry["shortcuts"]], ["/vip-entry/"])
		self.assertEqual(staff["links"], [])
		self.assertEqual(entry["links"], [])
		self.assertEqual(
			{row["role"] for row in staff["roles"]},
			{"Branch Manager", "Entertainer", "Lead Entertainer", "Entertainer Supervisor"},
		)
		self.assertEqual(
			{row["role"] for row in entry["roles"]},
			{"Branch Manager", "Reception", "Operation", "VIP Admin"},
		)

	def test_after_migrate_reconciles_the_managed_policy(self):
		source = (ROOT / "nomad_vip/install.py").read_text(encoding="utf-8")
		self.assertIn("from nomad_vip.desk_policy import ensure_desk_policy", source)
		self.assertIn("ensure_desk_policy()", source)


if __name__ == "__main__":
	import unittest

	unittest.main()
