from __future__ import annotations

from unittest import TestCase
from unittest.mock import Mock, patch

import frappe

from nomad_vip.tasks.daily_rank import current_daily_rank_by_profile, latest_daily_rank_snapshot


class TestDailyRankSnapshotFallback(TestCase):
	def test_current_snapshot_projection_degrades_when_doctype_is_not_installed(self):
		get_all = Mock(side_effect=frappe.DoesNotExistError("missing snapshot DocType"))

		result = current_daily_rank_by_profile(["VIP-ENT-0001"], get_all=get_all)

		self.assertEqual(result, {})
		get_all.assert_called_once()

	def test_latest_snapshot_degrades_when_doctype_is_not_installed(self):
		with patch(
			"nomad_vip.tasks.daily_rank.frappe.db.get_value",
			side_effect=frappe.DoesNotExistError("missing snapshot DocType"),
		):
			self.assertIsNone(latest_daily_rank_snapshot("VIP-ENT-0001"))
