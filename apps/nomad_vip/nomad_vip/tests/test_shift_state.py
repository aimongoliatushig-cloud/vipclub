from __future__ import annotations

from datetime import date
from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase

from nomad_vip.api.shift_state import attendance_state, resolve_shift_context
from nomad_vip.api.workday import (
	_requested_datetime,
	_validate_correction_sequence,
	_verified_minutes_from_rows,
)


def _assignment(work_date):
	return frappe._dict({
		"name": f"SHIFT-{work_date}",
		"shift_type": "VIP Night Shift",
		"start_date": work_date,
		"end_date": work_date,
		"shift": frappe._dict({
			"name": "VIP Night Shift",
			"start_time": "19:00:00",
			"end_time": "03:00:00",
			"begin_check_in_before_shift_start_time": 60,
			"allow_check_out_after_shift_end_time": 60,
		}),
	})


class TestShiftState(FrappeTestCase):
	def test_after_midnight_belongs_to_previous_overnight_shift(self):
		assignments = {
			date(2026, 8, 11): _assignment(date(2026, 8, 11)),
			date(2026, 8, 12): _assignment(date(2026, 8, 12)),
		}
		with patch("nomad_vip.api.shift_state._assignment_for_date", side_effect=lambda _employee, day: assignments.get(day)):
			context = resolve_shift_context("HR-EMP-0001", "2026-08-12 01:15:00")
		self.assertEqual(context.work_date, date(2026, 8, 11))
		self.assertEqual(str(context.window_start), "2026-08-11 18:00:00")
		self.assertEqual(str(context.window_end), "2026-08-12 04:00:00")
		self.assertTrue(context.is_active_window)

	def test_before_evening_window_returns_upcoming_shift_without_opening_qr(self):
		assignments = {
			date(2026, 8, 11): _assignment(date(2026, 8, 11)),
			date(2026, 8, 12): _assignment(date(2026, 8, 12)),
		}
		with patch("nomad_vip.api.shift_state._assignment_for_date", side_effect=lambda _employee, day: assignments.get(day)):
			context = resolve_shift_context("HR-EMP-0001", "2026-08-12 17:30:00")
		self.assertEqual(context.work_date, date(2026, 8, 12))
		self.assertFalse(context.is_active_window)

	def test_attendance_state_only_closes_on_latest_out_event(self):
		open_state = attendance_state([
			frappe._dict({"name": "IN-1", "time": "2026-08-11 18:58:00", "log_type": "IN"}),
		])
		self.assertTrue(open_state.checked_in)
		self.assertTrue(open_state.open)
		self.assertFalse(open_state.checked_out)

		closed_state = attendance_state([
			frappe._dict({"name": "IN-1", "time": "2026-08-11 18:58:00", "log_type": "IN"}),
			frappe._dict({"name": "OUT-1", "time": "2026-08-12 03:02:00", "log_type": "OUT"}),
		])
		self.assertTrue(closed_state.checked_in)
		self.assertFalse(closed_state.open)
		self.assertTrue(closed_state.checked_out)

	def test_verified_minutes_pairs_overnight_in_and_out(self):
		minutes, completed_days = _verified_minutes_from_rows([
			frappe._dict({"time": "2026-08-11 19:00:00", "log_type": "IN"}),
			frappe._dict({"time": "2026-08-12 03:00:00", "log_type": "OUT"}),
		])
		self.assertEqual(minutes, 8 * 60)
		self.assertEqual(completed_days, 1)

	def test_overnight_correction_maps_early_clock_to_next_calendar_day(self):
		with patch("nomad_vip.api.shift_state._assignment_for_date", return_value=_assignment(date(2026, 8, 11))):
			context = resolve_shift_context("HR-EMP-0001", "2026-08-11 20:00:00")
		self.assertEqual(str(_requested_datetime(context, "19:05:00")), "2026-08-11 19:05:00")
		self.assertEqual(str(_requested_datetime(context, "03:00:00")), "2026-08-12 03:00:00")

	def test_correction_sequence_accepts_one_immutable_replacement_pair(self):
		rows = [
			frappe._dict({"name": "IN-ORIGINAL", "time": "2026-08-11 19:12:00", "log_type": "IN"}),
			frappe._dict({"name": "OUT-1", "time": "2026-08-12 03:00:00", "log_type": "OUT"}),
		]
		events = _validate_correction_sequence(
			rows,
			"IN",
			"2026-08-11 19:00:00",
			original_checkin="IN-ORIGINAL",
		)
		self.assertEqual([(row.log_type, str(row.time)) for row in events], [
			("IN", "2026-08-11 19:00:00"),
			("OUT", "2026-08-12 03:00:00"),
		])
