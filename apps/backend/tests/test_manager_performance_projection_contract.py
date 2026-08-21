import ast
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def function_source(name: str) -> str:
	path = ROOT / "nomad_vip" / "api" / "workforce.py"
	source = path.read_text(encoding="utf-8")
	tree = ast.parse(source)
	for node in tree.body:
		if isinstance(node, ast.FunctionDef) and node.name == name:
			return ast.get_source_segment(source, node) or ""
	raise AssertionError(f"Function not found: {name}")


class ManagerPerformanceProjectionContractTests(unittest.TestCase):
	def test_detail_returns_verified_performer_projection_when_linked(self):
		source = function_source("get_manager_entertainer_detail")
		self.assertIn("_linked_dancer_ids", source)
		self.assertIn('payload["performance"] = performance', source)
		self.assertIn('performance["lifetime"] = _lifetime_summary(profile_record)', source)
		self.assertIn('payload["profile"]["daily_rank"] = daily_rank', source)
		self.assertNotIn('performance["rank"]', source)

	def test_unlinked_profile_detail_does_not_fail_on_missing_transaction_identity(self):
		source = function_source("get_manager_entertainer_detail")
		self.assertIn("if _linked_dancer_ids(profile_record.name) else None", source)
		self.assertNotIn('"rank_recommendation"', source)


if __name__ == "__main__":
	unittest.main()
