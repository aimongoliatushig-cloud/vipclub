from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

from nomad_vip.entertainer_ranks import (
	ACTIVE_ENTERTAINER_RANKS,
	DEFAULT_ENTERTAINER_RANK,
	ENTERTAINER_PAYOUT_PERCENT_BY_RANK,
	ENTERTAINER_RANKS,
	LEGACY_ENTERTAINER_RANK_MAP,
	normalize_entertainer_rank,
	payout_percent_for_rank,
)


class ThreeLevelEntertainerRankContractTests(unittest.TestCase):
	def test_exact_three_level_policy_uses_rank_one_as_highest(self):
		self.assertEqual(ACTIVE_ENTERTAINER_RANKS, ("Rank 3", "Rank 2", "Rank 1"))
		self.assertEqual(DEFAULT_ENTERTAINER_RANK, "Rank 3")
		self.assertEqual([row["rank_order"] for row in ENTERTAINER_RANKS], [1, 2, 3])
		self.assertEqual(ENTERTAINER_RANKS[-1]["code"], "Rank 1")
		self.assertEqual(ENTERTAINER_RANKS[-1]["minimum_points"], 1000)
		self.assertEqual(
			ENTERTAINER_PAYOUT_PERCENT_BY_RANK,
			{"Rank 3": 50, "Rank 2": 60, "Rank 1": 70},
		)
		self.assertEqual([payout_percent_for_rank(rank) for rank in ACTIVE_ENTERTAINER_RANKS], [50, 60, 70])

	def test_legacy_ranks_map_without_losing_existing_profiles(self):
		self.assertEqual(
			LEGACY_ENTERTAINER_RANK_MAP,
			{"Bronze": "Rank 3", "Silver": "Rank 3", "Gold": "Rank 2", "Diamond": "Rank 1"},
		)
		for legacy, expected in LEGACY_ENTERTAINER_RANK_MAP.items():
			self.assertEqual(normalize_entertainer_rank(legacy), expected)
		self.assertEqual(normalize_entertainer_rank(""), "Rank 3")

	def test_migration_updates_all_rank_links_and_preserves_history(self):
		source = (
			ROOT / "nomad_vip" / "patches" / "v1_0" / "migrate_entertainer_ranks_to_three_levels.py"
		).read_text(encoding="utf-8")
		for table, field in (
			("tabVIP Entertainer Profile", "current_rank"),
			("tabVIP Rank History", "from_rank"),
			("tabVIP Rank History", "to_rank"),
			("tabVIP Entertainer Rank Review", "from_rank"),
			("tabVIP Entertainer Rank Review", "recommended_rank"),
		):
			self.assertIn(f'_map_link("{table}", "{field}")', source)
		self.assertNotIn("DELETE FROM", source.upper())

	def test_customer_membership_rank_policy_remains_separate(self):
		source = (ROOT / "nomad_vip" / "api" / "cashback.py").read_text(encoding="utf-8")
		for customer_rank in ("Bronze", "Silver", "Gold", "Diamond", "Black Diamond"):
			self.assertIn(f'"{customer_rank}"', source)

	def test_rank_history_has_a_next_day_effective_contract(self):
		history_schema = (
			ROOT / "nomad_vip" / "nomad_vip" / "doctype" / "vip_rank_history" / "vip_rank_history.json"
		).read_text(encoding="utf-8")
		review_source = (ROOT / "nomad_vip" / "api" / "rank_review.py").read_text(encoding="utf-8")
		patches = (ROOT / "nomad_vip" / "patches.txt").read_text(encoding="utf-8")

		self.assertIn('"fieldname":"effective_from"', history_schema)
		self.assertIn('effective_from = getdate(review.window_to) + timedelta(days=1)', review_source)
		self.assertIn('"effective_from": effective_from', review_source)
		self.assertIn("backfill_rank_history_effective_from", patches)


if __name__ == "__main__":
	unittest.main()
