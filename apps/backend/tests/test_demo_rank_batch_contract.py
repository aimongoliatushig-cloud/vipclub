from __future__ import annotations

import unittest

from nomad_vip.daily_ranking import CANONICAL_THRESHOLDS, CANONICAL_WEIGHTS, COMPONENT_ORDER
from nomad_vip.demo_rank_batch import build_demo_rank_result, summarize_demo_results


class DemoRankBatchContractTests(unittest.TestCase):
	def setUp(self):
		self.profile = {
			"name": "ENT-001",
			"employee": "EMP-001",
			"stage_name": "Сиси",
			"employee_name": "Алтанчимэг",
			"branch": "Nomad",
			"current_rank": "Rank 3",
		}

	def result(self):
		return build_demo_rank_result(
			self.profile,
			batch_id="production-demo-2026-08-19-v1",
			scoring_date="2026-08-19",
			weights=CANONICAL_WEIGHTS,
			thresholds=CANONICAL_THRESHOLDS,
		)

	def test_batch_is_deterministic_and_complete(self):
		first = self.result()
		second = self.result()
		self.assertEqual(first, second)
		self.assertEqual(first["status"], "Complete")
		self.assertEqual(first["input_provenance"], "DEMO")
		self.assertEqual(first["identity_provenance"], "VERIFIED_EMPLOYEE_MASTER")
		self.assertEqual({row["component"] for row in first["components"]}, set(COMPONENT_ORDER))
		self.assertTrue(all(row["provenance"] == "DEMO" for row in first["components"]))

	def test_sales_keeps_canonical_forty_percent_weight(self):
		result = self.result()
		sales = next(row for row in result["components"] if row["component"] == "sales")
		self.assertEqual(sales["weight"], 40.0)
		self.assertAlmostEqual(sales["contribution"], sales["score"] * 0.4)

	def test_summary_counts_people_without_mutating_master_rank(self):
		result = self.result()
		summary = summarize_demo_results([result])
		self.assertEqual(summary["profile_count"], 1)
		self.assertEqual(summary["complete_count"], 1)
		self.assertEqual(result["approved_rank"], self.profile["current_rank"])


if __name__ == "__main__":
	unittest.main()
