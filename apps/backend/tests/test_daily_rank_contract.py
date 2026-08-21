from __future__ import annotations

import unittest

from nomad_vip.daily_ranking import CANONICAL_THRESHOLDS, CANONICAL_WEIGHTS, COMPONENT_ORDER, calculate_daily_rank
from nomad_vip.rank_contract import build_rank_contract


def snapshot(score: float, scoring_date: str = "2026-08-01") -> dict:
	calculation = calculate_daily_rank(
		{component: score for component in COMPONENT_ORDER},
		weights=CANONICAL_WEIGHTS,
		thresholds=CANONICAL_THRESHOLDS,
	)
	return {
		"scoring_date": scoring_date,
		"status": calculation["status"],
		"weighted_score": calculation["weighted_score"],
		"displayed_score": calculation["displayed_score"],
		"calculated_rank": calculation["calculated_rank"],
		"missing_components": calculation["missing_components"],
		"components": [
			{**row, "source": {"mode": "normalized_event"}}
			for row in calculation["components"]
		],
	}


class DailyRankContractTest(unittest.TestCase):
	def contract(self, row, effective_rank="Rank 3"):
		return build_rank_contract(
			snapshot=row,
			effective_rank=effective_rank,
			effective_from="2026-08-01",
			thresholds=CANONICAL_THRESHOLDS,
		)

	def test_73_16_is_rank_three_with_fifty_percent_and_6_84_to_rank_two(self):
		row = snapshot(73.16)
		result = self.contract(row)
		self.assertEqual(result["score"], 73.16)
		self.assertEqual(result["effective_rank"], "Rank 3")
		self.assertEqual(result["payout_percent"], 50)
		self.assertEqual(result["next_rank"], "Rank 2")
		self.assertEqual(result["next_rank_threshold"], 80)
		self.assertEqual(result["missing_score"], 6.84)

	def test_august_first_score_80_keeps_fifty_percent_then_schedules_rank_two_for_august_second(self):
		result = self.contract(snapshot(80, "2026-08-01"))
		self.assertEqual(result["payout_percent"], 50)
		self.assertEqual(result["calculated_next_rank"], "Rank 2")
		self.assertEqual(result["calculated_next_payout_percent"], 60)
		self.assertEqual(result["next_effective_from"], "2026-08-02")

	def test_score_90_schedules_rank_one_at_seventy_percent_next_day(self):
		result = self.contract(snapshot(90, "2026-08-04"), effective_rank="Rank 2")
		self.assertEqual(result["payout_percent"], 60)
		self.assertEqual(result["calculated_next_rank"], "Rank 1")
		self.assertEqual(result["calculated_next_payout_percent"], 70)
		self.assertEqual(result["next_effective_from"], "2026-08-05")

	def test_everyone_stays_at_rank_three_below_seventy(self):
		result = self.contract(snapshot(42))
		self.assertEqual(result["calculated_next_rank"], "Rank 3")
		self.assertNotIn("Rookie", str(result))

	def test_incomplete_snapshot_never_guesses_score_or_rank(self):
		row = snapshot(80)
		row.update({"status": "Incomplete", "weighted_score": None, "displayed_score": None, "calculated_rank": None, "missing_components": ["sales"]})
		result = self.contract(row)
		self.assertIsNone(result["score"])
		self.assertIsNone(result["calculated_next_rank"])
		self.assertIsNone(result["missing_score"])

	def test_verified_data_and_unmet_target_are_separate_states(self):
		row = snapshot(65)
		result = self.contract(row)
		self.assertTrue(all(component["data_status"] == "verified" for component in result["components"]))
		self.assertTrue(all(component["target_status"] == "not_met" for component in result["components"]))


if __name__ == "__main__":
	unittest.main()
