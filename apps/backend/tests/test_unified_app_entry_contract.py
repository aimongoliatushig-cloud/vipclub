from __future__ import annotations

import ast
from pathlib import Path
from unittest import TestCase


ROOT = Path(__file__).resolve().parents[1]


class TestUnifiedAppEntryContract(TestCase):
	def test_gateway_routes_each_product_persona_to_its_app(self):
		source = (ROOT / "nomad_vip/api/management.py").read_text(encoding="utf-8")
		tree = ast.parse(source)
		function = next(
			node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == "get_app_entry"
		)
		contract = ast.get_source_segment(source, function) or ""

		for role in ("CEO", "Branch Manager", "HR Manager", "System Manager"):
			self.assertIn(f'"{role}"', contract)
		for role in ("Reception", "Operation", "VIP Admin"):
			self.assertIn(f'"{role}"', contract)
		self.assertIn('destination = "manager"', contract)
		self.assertIn('destination = "vip-entry"', contract)
		self.assertIn('destination = "staff"', contract)


if __name__ == "__main__":
	import unittest

	unittest.main()
