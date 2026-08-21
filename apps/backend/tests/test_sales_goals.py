from __future__ import annotations

import unittest

from nomad_vip.sales_goals import approved_target_amount


class SalesGoalDecisionTest(unittest.TestCase):
	def test_ceo_can_keep_manager_proposal(self):
		self.assertEqual(approved_target_amount(320_000_000), 320_000_000)

	def test_ceo_can_approve_a_changed_amount(self):
		self.assertEqual(approved_target_amount(320_000_000, 345_000_000), 345_000_000)

	def test_approved_amount_must_be_positive(self):
		for value in (0, -1, "not-a-number"):
			with self.assertRaises(ValueError):
				approved_target_amount(320_000_000, value)


if __name__ == "__main__":
	unittest.main()
