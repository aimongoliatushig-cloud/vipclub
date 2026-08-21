from __future__ import annotations

import ast
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TASK = ROOT / "nomad_vip/tasks/rank_evaluation.py"
POLICY = ROOT / "nomad_vip/nomad_vip/doctype/vip_ranking_policy/vip_ranking_policy.json"
PATCHES = ROOT / "nomad_vip/patches.txt"


def function_source(name: str) -> str:
	source = TASK.read_text(encoding="utf-8")
	for node in ast.parse(source).body:
		if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == name:
			return ast.get_source_segment(source, node) or ""
	raise AssertionError(f"missing function: {name}")


class RankEvaluationCycleContractTests(unittest.TestCase):
	def test_cycle_is_fifteen_days_and_does_not_apply_rank(self):
		source = TASK.read_text(encoding="utf-8")
		self.assertIn("RANK_EVALUATION_INTERVAL_DAYS = 15", source)
		worker = function_source("_process_locked_profile")
		self.assertIn("FOR UPDATE", worker)
		self.assertIn('"current_points": points', worker)
		self.assertIn('"rank_last_calculated_at": evaluated_at', worker)
		self.assertNotIn('"current_rank"', worker.split("frappe.db.set_value", 1)[-1])

	def test_cycle_is_audited_and_manager_is_notified(self):
		source = TASK.read_text(encoding="utf-8")
		self.assertIn('RANK_EVALUATION_ACTION = "system.entertainer_rank.evaluate"', source)
		self.assertIn('"rank_changed": False', source)
		self.assertIn('"doctype": "Notification Log"', source)
		self.assertIn("15 хоногийн үнэлгээ шинэчлэгдлээ", source)

	def test_first_and_fifteenth_review_reminder_is_deduplicated(self):
		source = function_source("send_rank_review_reminders")
		self.assertIn("RANK_REVIEW_REMINDER_DAYS", source)
		self.assertIn('frappe.db.exists("Notification Log"', source)
		self.assertIn("зэрэглэлийн үнэлгээг шалгана уу", source)
		self.assertIn('"created": 0', source)
		self.assertIn('"skipped": 0', source)

	def test_missing_finex_link_is_skipped_without_mutation(self):
		worker = function_source("_process_locked_profile")
		link_guard = worker.index("if not _linked_dancer_ids")
		write = worker.index("frappe.db.set_value")
		self.assertLess(link_guard, write)
		self.assertIn('{"outcome": "unlinked"}', worker)

	def test_policy_exposes_daily_cadence_and_patch(self):
		payload = json.loads(POLICY.read_text(encoding="utf-8"))
		field = next(row for row in payload["fields"] if row["fieldname"] == "evaluation_cadence")
		self.assertIn("Daily", field["options"].splitlines())
		self.assertEqual(field["default"], "Daily")
		self.assertIn(
			"nomad_vip.patches.v1_0.configure_daily_eight_factor_ranking",
			PATCHES.read_text(encoding="utf-8"),
		)


if __name__ == "__main__":
	unittest.main()
