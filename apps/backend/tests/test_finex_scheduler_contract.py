from __future__ import annotations

import ast
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
HOOKS = ROOT / "nomad_vip" / "hooks.py"
FINEX = ROOT / "nomad_vip" / "integrations" / "finex.py"


class FinexSchedulerContractTests(unittest.TestCase):
	def test_recent_sales_runs_every_day_at_eight(self):
		tree = ast.parse(HOOKS.read_text(encoding="utf-8"))
		scheduler = None
		for node in tree.body:
			if not isinstance(node, ast.Assign):
				continue
			if any(isinstance(target, ast.Name) and target.id == "scheduler_events" for target in node.targets):
				scheduler = ast.literal_eval(node.value)
		self.assertIsNotNone(scheduler)
		self.assertEqual(
			scheduler["cron"]["0 8 * * *"],
			["nomad_vip.integrations.finex.sync_recent_sales"],
		)
		self.assertNotIn("30 8 * * *", scheduler["cron"])
		self.assertNotIn("0 8 1,15 * *", scheduler["cron"])
		self.assertEqual(
			scheduler["cron"]["0 9 * * *"],
			["nomad_vip.tasks.daily_rank.refresh_daily_rankings"],
		)

	def test_recent_sync_reconciles_delayed_bills_and_downstream_metrics(self):
		source = FINEX.read_text(encoding="utf-8")
		self.assertIn("today - timedelta(days=7)", source)
		self.assertIn("refresh_customer_metrics()", source)
		self.assertIn("sync_customer_cashback_range(date_from, today)", source)
		self.assertIn("reconcile_finex_entertainer_candidates()", source)


if __name__ == "__main__":
	unittest.main()
