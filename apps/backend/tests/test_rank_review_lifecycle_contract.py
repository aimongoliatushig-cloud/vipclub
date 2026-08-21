from __future__ import annotations

import ast
import json
from pathlib import Path
from unittest import TestCase


ROOT = Path(__file__).resolve().parents[1]
API = ROOT / "nomad_vip/api/rank_review.py"


def function_source(name: str) -> str:
	source = API.read_text(encoding="utf-8")
	tree = ast.parse(source)
	for node in tree.body:
		if isinstance(node, ast.FunctionDef) and node.name == name:
			return ast.get_source_segment(source, node) or ""
	raise AssertionError(f"missing function: {name}")


class TestRankReviewLifecycleContract(TestCase):
	def test_manager_only_submits_snapshot_recommendation(self):
		source = function_source("submit_rank_recommendation")
		self.assertIn('require_actor("Branch Manager", require_branch=True)', source)
		self.assertIn("_evidence_snapshot(profile)", source)
		self.assertIn("FOR UPDATE", source)
		self.assertIn("assert_not_stale", source)
		self.assertIn('"status": ACTIVE_STATUS', source)
		self.assertNotIn('frappe.db.set_value(\n\t\t"VIP Entertainer Profile"', source)

	def test_only_ceo_decision_can_apply_profile_rank(self):
		source = function_source("decide_rank_review")
		self.assertIn('require_actor("CEO", "System Manager")', source)
		self.assertIn("FOR UPDATE", source)
		self.assertIn("assert_not_stale", source)
		self.assertIn('if status == "Approved"', source)
		self.assertIn('"VIP Rank History"', source)
		self.assertIn('action="ceo.entertainer_rank.decide"', source)

	def test_manager_compatibility_endpoint_rejects_the_retired_manual_rank_path(self):
		source = (ROOT / "nomad_vip/api/workforce.py").read_text(encoding="utf-8")
		function = ast.get_source_segment(
			source,
			next(node for node in ast.parse(source).body if isinstance(node, ast.FunctionDef) and node.name == "manager_override_rank"),
		) or ""
		self.assertIn("өдөр тутмын 8 үзүүлэлтийн оноо автоматаар шинэчилнэ", function)
		self.assertIn("frappe.ValidationError", function)
		self.assertNotIn("submit_rank_recommendation", function)
		self.assertNotIn("VIP Rank History", function)
		self.assertNotIn("set_value", function)

	def test_doctype_is_api_managed_and_not_exposed_to_product_roles(self):
		payload = json.loads((
			ROOT / "nomad_vip/nomad_vip/doctype/vip_entertainer_rank_review/vip_entertainer_rank_review.json"
		).read_text(encoding="utf-8"))
		self.assertEqual([row["role"] for row in payload["permissions"]], ["System Manager"])
		by_name = {field["fieldname"]: field for field in payload["fields"]}
		self.assertEqual(by_name["idempotency_key"].get("unique"), 1)
		self.assertNotEqual(by_name["evidence_hash"].get("unique"), 1)


if __name__ == "__main__":
	import unittest

	unittest.main()
