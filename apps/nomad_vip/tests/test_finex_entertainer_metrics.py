from __future__ import annotations

import json
import sys
import unittest
from datetime import date
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from nomad_vip.finex_entertainer_metrics import build_finex_entertainer_summary, rank_for_points


class FinexEntertainerMetricsTest(unittest.TestCase):
	def bill(self, *, amount=300000, employee_amount=300000, paid=1, bill_type=1, dancer_id="D-1", posted="2026-08-10"):
		return {
			"name": "BILL-1",
			"posting_date": posted,
			"is_paid": paid,
			"bill_type": bill_type,
			"last_synced_at": "2026-08-12 04:00:00",
			"raw_payload": json.dumps({
				"items": [{
					"menuName": "VIP hosting",
					"employeeAmount": employee_amount,
					"dancers": [{"dancerId": dancer_id, "amount": amount, "percent": 50}],
				}],
			}),
		}

	def summary(self, bills):
		return build_finex_entertainer_summary(
			bills,
			["D-1"],
			date(2026, 6, 12),
			date(2026, 8, 12),
			date(2026, 8, 1),
		)

	def test_uses_direct_dancer_amount_and_points_rule(self):
		result = self.summary([self.bill()])
		self.assertEqual(result["current_month_income"], 300000)
		self.assertEqual(result["net_income"], 300000)
		self.assertEqual(result["points"], 30)
		self.assertEqual(result["service_count"], 1)
		self.assertTrue(result["quality"]["verified"])

	def test_excludes_unpaid_unmatched_and_inconsistent_items(self):
		result = self.summary([
			self.bill(paid=0),
			self.bill(dancer_id="OTHER"),
			self.bill(employee_amount=999999),
		])
		self.assertEqual(result["net_income"], 0)
		self.assertEqual(result["quality"]["skipped_inconsistent_items"], 1)

	def test_refund_reverses_income(self):
		refund = self.bill(amount=100000, employee_amount=100000, bill_type=2)
		result = self.summary([self.bill(), refund])
		self.assertEqual(result["net_income"], 200000)
		self.assertEqual(result["points"], 20)

	def test_rank_and_next_rank_are_threshold_driven(self):
		ranks = [
			{"name": "Bronze", "minimum_points": 0, "rank_order": 1},
			{"name": "Silver", "minimum_points": 250, "rank_order": 2},
			{"name": "Gold", "minimum_points": 600, "rank_order": 3},
		]
		current, next_rank = rank_for_points(320, ranks)
		self.assertEqual(current["name"], "Silver")
		self.assertEqual(next_rank["name"], "Gold")


if __name__ == "__main__":
	unittest.main()
