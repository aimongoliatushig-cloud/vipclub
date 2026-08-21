from __future__ import annotations

from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import frappe
from frappe.tests.utils import FrappeTestCase

from nomad_vip.tasks.rank_evaluation import (
	RANK_EVALUATION_INTERVAL_DAYS,
	_process_locked_profile,
	rank_evaluation_schedule,
	send_rank_review_reminders,
)


class TestRankEvaluationCycle(FrappeTestCase):
	def test_schedule_becomes_due_after_exactly_fifteen_days(self):
		now = datetime(2026, 8, 15, 8, 30)
		last = now - timedelta(days=RANK_EVALUATION_INTERVAL_DAYS)
		self.assertTrue(rank_evaluation_schedule(last, now)["due"])
		self.assertFalse(rank_evaluation_schedule(last + timedelta(minutes=1), now)["due"])

	@patch("nomad_vip.tasks.rank_evaluation._append_evaluation_audit")
	@patch("nomad_vip.api.rank_review._evidence_snapshot")
	@patch("nomad_vip.api.entertainer_finex._linked_dancer_ids")
	@patch("frappe.db.set_value")
	@patch("frappe.db.get_value")
	@patch("frappe.db.sql")
	def test_refresh_updates_points_and_timestamp_but_not_rank(
		self,
		db_sql,
		db_get_value,
		db_set_value,
		linked_ids,
		evidence_snapshot,
		append_audit,
	):
		db_sql.return_value = [("PROFILE-1",)]
		db_get_value.return_value = frappe._dict({
			"name": "PROFILE-1",
			"employee": "EMP-1",
			"employee_name": "Test",
			"stage_name": "Test",
			"branch": "Nomad",
			"active": 1,
			"lifecycle_status": "Active",
			"current_rank": "Rank 3",
			"current_points": 0,
			"rank_last_calculated_at": datetime(2026, 7, 1, 8, 30),
		})
		linked_ids.return_value = ["DANCER-1"]
		evidence_snapshot.return_value = {
			"sales": {"points": 620},
			"system_recommendation": {"rank": "Rank 2"},
		}
		result = _process_locked_profile("PROFILE-1", datetime(2026, 8, 15, 8, 30))
		self.assertEqual(result["outcome"], "refreshed")
		values = db_set_value.call_args.args[2]
		self.assertEqual(values["current_points"], 620)
		self.assertNotIn("current_rank", values)
		append_audit.assert_called_once()

	@patch("nomad_vip.tasks.rank_evaluation._manager_users")
	@patch("frappe.get_all")
	@patch("frappe.get_doc")
	@patch("frappe.db.exists")
	def test_first_day_reminder_is_one_per_manager_and_is_replay_safe(
		self, db_exists, get_doc, get_all, manager_users
	):
		get_all.return_value = ["Nomad", "Nomad", None]
		manager_users.return_value = ["manager.nomad@example.com"]
		db_exists.return_value = False
		doc = MagicMock()
		get_doc.return_value = doc

		result = send_rank_review_reminders(datetime(2026, 9, 1, 8, 0))
		self.assertTrue(result["due"])
		self.assertEqual(result["branches"], 1)
		self.assertEqual(result["managers"], 1)
		self.assertEqual(result["created"], 1)
		doc.insert.assert_called_once_with(ignore_permissions=True)

		db_exists.return_value = True
		replay = send_rank_review_reminders(datetime(2026, 9, 1, 8, 5))
		self.assertEqual(replay["created"], 0)
		self.assertEqual(replay["skipped"], 1)

	@patch("frappe.get_all")
	def test_non_reminder_day_does_not_query_or_notify(self, get_all):
		result = send_rank_review_reminders(datetime(2026, 9, 2, 8, 0))
		self.assertFalse(result["due"])
		self.assertEqual(result["created"], 0)
		get_all.assert_not_called()
