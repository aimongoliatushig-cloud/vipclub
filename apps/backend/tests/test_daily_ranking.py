from __future__ import annotations

import unittest

from nomad_vip.daily_ranking import (
	CANONICAL_THRESHOLDS,
	CANONICAL_WEIGHTS,
	COMPONENT_ORDER,
	attendance_penalty_override,
	calculate_absent_day,
	calculate_career_average,
	calculate_daily_rank,
	classify_score,
)


class DailyRankingTest(unittest.TestCase):
	def test_canonical_weights_total_one_hundred(self):
		self.assertEqual(sum(CANONICAL_WEIGHTS.values()), 100)

	def test_rank_boundaries_use_unrounded_score(self):
		self.assertEqual(classify_score(0), "Rank 3")
		self.assertEqual(classify_score(69.99), "Rank 3")
		self.assertEqual(classify_score(70), "Rank 3")
		self.assertEqual(classify_score(79.99), "Rank 3")
		self.assertEqual(classify_score(80), "Rank 2")
		self.assertEqual(classify_score(89.99), "Rank 2")
		self.assertEqual(classify_score(90), "Rank 1")
		self.assertEqual(classify_score(100), "Rank 1")

	def test_missing_component_never_becomes_zero(self):
		scores = {component: 100 for component in COMPONENT_ORDER}
		scores["sales"] = None
		result = calculate_daily_rank(
			scores,
			weights=CANONICAL_WEIGHTS,
			thresholds=CANONICAL_THRESHOLDS,
		)
		self.assertEqual(result["status"], "Incomplete")
		self.assertIsNone(result["weighted_score"])
		self.assertIsNone(result["calculated_rank"])
		self.assertEqual(result["missing_components"], ["sales"])

	def test_complete_result_exposes_all_contributions_and_interval(self):
		result = calculate_daily_rank(
			{component: 80 for component in COMPONENT_ORDER},
			weights=CANONICAL_WEIGHTS,
			thresholds=CANONICAL_THRESHOLDS,
		)
		self.assertEqual(result["status"], "Complete")
		self.assertEqual(result["weighted_score"], 80)
		self.assertEqual(result["calculated_rank"], "Rank 2")
		self.assertEqual(len(result["components"]), 8)
		self.assertEqual(sum(row["contribution"] for row in result["components"]), 80)
		self.assertEqual(result["threshold_interval"]["minimum"], 80)
		self.assertEqual(result["threshold_interval"]["maximum"], 90)
		self.assertFalse(result["threshold_interval"]["maximum_inclusive"])

	def test_sales_component_contributes_exactly_forty_percent(self):
		for sales_score, expected_contribution in ((0, 0), (50, 20), (100, 40)):
			scores = {component: 0 for component in COMPONENT_ORDER}
			scores["sales"] = sales_score
			result = calculate_daily_rank(
				scores,
				weights=CANONICAL_WEIGHTS,
				thresholds=CANONICAL_THRESHOLDS,
			)
			sales = next(row for row in result["components"] if row["component"] == "sales")
			self.assertEqual(sales["weight"], 40)
			self.assertEqual(sales["contribution"], expected_contribution)
			self.assertEqual(result["weighted_score"], expected_contribution)

	def test_absence_is_zero_attendance_not_a_missing_component(self):
		override = attendance_penalty_override(("Absence",))
		self.assertEqual(override, {
			"score": 0.0,
			"mode": "daily_absence",
			"scope": "scoring_date",
			"raw_state": "no_show",
		})
		scores = {component: 100 for component in COMPONENT_ORDER}
		scores["attendance"] = override["score"]
		result = calculate_daily_rank(scores, weights=CANONICAL_WEIGHTS, thresholds=CANONICAL_THRESHOLDS)
		self.assertEqual(result["status"], "Complete")
		self.assertEqual(result["missing_components"], [])
		self.assertEqual(result["weighted_score"], 90)
		attendance = next(row for row in result["components"] if row["component"] == "attendance")
		self.assertEqual(attendance["contribution"], 0)

	def test_absent_day_is_zero_without_defaults_or_stage_rounds(self):
		result = calculate_absent_day(weights=CANONICAL_WEIGHTS, thresholds=CANONICAL_THRESHOLDS)
		self.assertEqual(result["status"], "Complete")
		self.assertEqual(result["weighted_score"], 0)
		self.assertEqual(result["calculated_rank"], "Rank 3")
		by_component = {row["component"]: row for row in result["components"]}
		self.assertEqual(by_component["attendance"]["score"], 0)
		self.assertEqual(by_component["sales"]["score"], 0)
		self.assertEqual(by_component["shift_effort"]["status"], "excluded")
		self.assertIsNone(by_component["entertainer_attitude"]["score"])

	def test_career_average_counts_each_finalized_day_once(self):
		result = calculate_career_average([80, 90, 70], 100)
		self.assertEqual(result, {"score": 85.0, "counted_days": 4})

	def test_absence_zero_stays_in_career_average_denominator(self):
		result = calculate_career_average([80, 90], 0)
		self.assertEqual(result, {"score": 56.67, "counted_days": 3})


if __name__ == "__main__":
	unittest.main()
