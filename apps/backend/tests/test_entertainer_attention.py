from __future__ import annotations

import unittest

from nomad_vip.entertainer_attention import build_entertainer_attention


class EntertainerAttentionTest(unittest.TestCase):
	def build(self, **overrides):
		values = {
			"scoring_date": "2026-08-19",
			"checked_in": True,
			"active_window": True,
			"readiness": {"result": "READY"},
			"stage_rounds_completed": 7,
			"daily_rank": None,
			"attendance_penalties": [],
			"is_demo": False,
		}
		values.update(overrides)
		return build_entertainer_attention(**values)

	def test_absence_is_day_scoped_and_actionable(self):
		items = self.build(attendance_penalties=[{
			"attendance_date": "2026-08-19",
			"penalty_type": "Absence",
			"late_minutes": 0,
		}])
		self.assertEqual(items[0]["key"], "absence")
		self.assertEqual(items[0]["value"], "Ирц 0/100")
		self.assertIn("Зөвхөн энэ өдрийн оноонд", items[0]["detail"])

	def test_person_specific_gaps_are_ranked_by_urgency(self):
		items = self.build(
			readiness={"result": "NOT_READY", "reason": "Гутал бэлэн биш"},
			stage_rounds_completed=3,
			attendance_penalties=[{"penalty_type": "Late", "late_minutes": 12}],
			daily_rank={
				"scoring_date": "2026-08-19",
				"status": "Complete",
				"missing_components": [],
				"components": [
					{"component": "sales", "score": 50, "weight": 40},
					{"component": "entertainer_attitude", "score": 60, "weight": 10},
				],
			},
		)
		keys = [item["key"] for item in items]
		self.assertEqual(keys[:3], ["lateness", "readiness_not_ready", "stage_rounds"])
		self.assertIn("stage_rounds", keys)
		self.assertIn("rank_entertainer_attitude", keys)

	def test_old_daily_snapshot_does_not_leak_into_today(self):
		items = self.build(daily_rank={
			"scoring_date": "2026-08-18",
			"status": "Complete",
			"missing_components": [],
			"components": [{"component": "sales", "score": 0, "weight": 40}],
		})
		self.assertEqual(items, [])

	def test_missing_sources_stay_visibly_unresolved(self):
		items = self.build(
			checked_in=False,
			readiness=None,
			stage_rounds_completed=0,
			daily_rank={
				"scoring_date": "2026-08-19",
				"status": "Incomplete",
				"missing_components": ["sales", "cleanliness_beauty"],
				"components": [],
			},
		)
		self.assertEqual(items[0]["key"], "attendance_missing")
		self.assertTrue(all(item["source_state"] == "unresolved" for item in items))

	def test_demo_evidence_is_labeled(self):
		items = self.build(
			is_demo=True,
			stage_rounds_completed=2,
		)
		self.assertEqual(items[0]["source_state"], "demo")
		self.assertEqual(items[0]["source_label"], "Туршилтын өгөгдөл")


if __name__ == "__main__":
	unittest.main()
