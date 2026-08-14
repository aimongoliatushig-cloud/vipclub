from __future__ import annotations

import json
from pathlib import Path
from unittest import TestCase


ROOT = Path(__file__).resolve().parents[1]


class TestManagementSourceContract(TestCase):
	def test_management_reads_are_server_scoped(self):
		source = (ROOT / "nomad_vip/api/management.py").read_text(encoding="utf-8")
		self.assertIn('require_actor("Branch Manager", "CEO", "System Manager")', source)
		self.assertIn("branch = _branch(actor, branch)", source)
		self.assertIn("row.phone = f\"•••• {digits[-4:]}\"", source)
		self.assertIn("row.customer_name = _safe_customer_display_name(row.customer_name)", source)
		customer_projection = source.split("def get_manager_customers", 1)[1].split("def get_manager_penalties", 1)[0]
		self.assertNotIn("select profile.name, profile.customer", customer_projection)
		self.assertIn("profile.bill_count > 0 or profile.visit_count > 0", customer_projection)
		self.assertIn("if search:", customer_projection)
		self.assertIn('"actual_source": "VIP POS Bill / Finex paid sales"', source)

	def test_goal_workflow_separates_manager_and_ceo_authority(self):
		source = (ROOT / "nomad_vip/api/management.py").read_text(encoding="utf-8")
		manager = source.split("def save_sales_goal_proposal", 1)[1].split("def submit_sales_goal_proposal", 1)[0]
		ceo = source.split("def decide_sales_goal", 1)[1]
		self.assertIn('require_actor("Branch Manager", require_branch=True)', manager)
		self.assertIn('require_actor("CEO", "System Manager")', ceo)
		self.assertIn('doc.state = "Active"', ceo)
		self.assertIn("_replayed_goal", manager)
		self.assertIn("_replayed_goal", ceo)

	def test_goal_doctype_is_api_written_and_branch_read_scoped(self):
		payload = json.loads((
			ROOT / "nomad_vip/nomad_vip/doctype/vip_branch_sales_goal/vip_branch_sales_goal.json"
		).read_text(encoding="utf-8"))
		by_role = {row["role"]: row for row in payload["permissions"]}
		self.assertEqual(by_role["CEO"].get("read"), 1)
		self.assertEqual(by_role["Branch Manager"].get("read"), 1)
		for row in by_role.values():
			self.assertNotEqual(row.get("write"), 1)


if __name__ == "__main__":
	import unittest

	unittest.main()
