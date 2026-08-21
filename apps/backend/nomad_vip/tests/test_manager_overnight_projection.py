from __future__ import annotations

from datetime import date
from unittest import TestCase
from unittest.mock import patch

import frappe

from nomad_vip.api.security import ActorContext
from nomad_vip.api.shift_state import resolve_shift_contexts
from nomad_vip.api.workforce import get_manager_dashboard, get_manager_entertainer_detail


def _night_assignment(work_date):
	return frappe._dict({
		"name": f"SHIFT-{work_date}",
		"employee": "HR-EMP-0001",
		"shift_type": "VIP Night Shift",
		"start_date": work_date,
		"end_date": work_date,
		"creation": f"{work_date} 10:00:00",
	})


def _night_shift():
	return frappe._dict({
		"name": "VIP Night Shift",
		"start_time": "22:00:00",
		"end_time": "05:00:00",
		"begin_check_in_before_shift_start_time": 60,
		"allow_check_out_after_shift_end_time": 60,
	})


def _context():
	assignment = _night_assignment(date(2026, 8, 11))
	assignment.shift = _night_shift()
	return frappe._dict({
		"work_date": date(2026, 8, 11),
		"assignment": assignment,
		"shift": assignment.shift,
		"start": frappe.utils.get_datetime("2026-08-11 22:00:00"),
		"end": frappe.utils.get_datetime("2026-08-12 05:00:00"),
		"window_start": frappe.utils.get_datetime("2026-08-11 21:00:00"),
		"window_end": frappe.utils.get_datetime("2026-08-12 06:00:00"),
		"is_active_window": True,
	})


def _actor():
	return ActorContext(
		user="manager@example.test",
		roles=frozenset({"Branch Manager"}),
		role="Branch Manager",
		branch="Nomad",
		profile=None,
	)


class TestManagerOvernightProjection(TestCase):
	def test_bulk_resolver_keeps_after_midnight_on_previous_work_date(self):
		assignments = [
			_night_assignment(date(2026, 8, 12)),
			_night_assignment(date(2026, 8, 11)),
		]

		def get_all(doctype, **_kwargs):
			if doctype == "Shift Assignment":
				return assignments
			if doctype == "Shift Type":
				return [_night_shift()]
			raise AssertionError(f"unexpected doctype {doctype}")

		with patch("nomad_vip.api.shift_state.frappe.get_all", side_effect=get_all) as query:
			contexts = resolve_shift_contexts(["HR-EMP-0001"], "2026-08-12 01:30:00")

		self.assertEqual(query.call_count, 2)
		self.assertEqual(contexts["HR-EMP-0001"].work_date, date(2026, 8, 11))
		self.assertEqual(str(contexts["HR-EMP-0001"].window_end), "2026-08-12 06:00:00")
		self.assertTrue(contexts["HR-EMP-0001"].is_active_window)

	def test_dashboard_projects_previous_day_availability_and_checkin(self):
		profile = frappe._dict({
			"name": "VIP-ENT-0001",
			"employee": "HR-EMP-0001",
			"employee_name": "Test Entertainer",
			"stage_name": "Test",
			"lifecycle_status": "Active",
			"current_rank": "Gold",
			"profile_photo": None,
			"media_consent_status": "Not Requested",
			"media_consent_expires_on": None,
			"is_demo": 0,
		})
		availability = frappe._dict({
			"name": "AVL-1",
			"entertainer": profile.name,
			"work_date": date(2026, 8, 11),
			"status": "Available",
			"occurred_at": "2026-08-11 22:05:00",
			"note": None,
			"state_version": 1,
			"previous_version": 0,
			"previous_event": None,
		})
		checkin = frappe._dict({
			"name": "CHECKIN-1",
			"employee": profile.employee,
			"time": frappe.utils.get_datetime("2026-08-11 21:58:00"),
			"log_type": "IN",
		})

		def get_all(doctype, **_kwargs):
			return {
				"VIP Entertainer Profile": [profile],
				"VIP Entertainer Profile Change Request": [],
				"VIP Emergency Leave Request": [],
				"VIP Attendance Penalty": [],
				"VIP Availability Event": [availability],
				"Employee Checkin": [checkin],
				"VIP Daily Readiness Check": [],
			}.get(doctype, [])

		with (
			patch("nomad_vip.api.workforce.require_actor", return_value=_actor()),
			patch("nomad_vip.api.workforce.now_datetime", return_value=frappe.utils.get_datetime("2026-08-12 01:30:00")),
			patch("nomad_vip.api.workforce.resolve_shift_contexts", return_value={profile.employee: _context()}),
			patch("nomad_vip.api.workforce.frappe.get_all", side_effect=get_all),
			patch("nomad_vip.api.workforce.frappe.db.count", return_value=0),
		):
			result = get_manager_dashboard()

		row = result["roster"][0]
		self.assertEqual(row["work_date"], date(2026, 8, 11))
		self.assertEqual(row["status"], "checked_in")
		self.assertEqual(row["availability"].status, "Available")
		self.assertEqual(row["latest_checkin"].name, "CHECKIN-1")

	def test_manager_detail_uses_previous_work_date_for_live_projection(self):
		profile = frappe._dict({
			"name": "VIP-ENT-0001",
			"employee": "HR-EMP-0001",
			"current_rank": "Gold",
			"current_points": 100,
			"modified": "2026-08-11 22:00:00",
		})
		availability = frappe._dict({"name": "AVL-1", "status": "Working", "state_version": 2})
		checkin = frappe._dict({
			"name": "CHECKIN-1",
			"employee": profile.employee,
			"time": frappe.utils.get_datetime("2026-08-11 21:58:00"),
			"log_type": "IN",
		})
		with (
			patch("nomad_vip.api.workforce.require_actor", return_value=_actor()),
			patch("nomad_vip.api.workforce._manager_profile", return_value=profile),
			patch("nomad_vip.api.workforce._workspace_payload", return_value={}),
			patch("nomad_vip.api.workforce.now_datetime", return_value=frappe.utils.get_datetime("2026-08-12 01:30:00")),
			patch("nomad_vip.api.workforce.resolve_shift_context", return_value=_context()),
			patch("nomad_vip.api.workforce._latest_availability", return_value=availability) as latest,
			patch("nomad_vip.api.workforce.shift_checkins", return_value=[checkin]),
			patch("nomad_vip.api.workforce.frappe.db.exists", side_effect=[False, False]),
			patch("nomad_vip.api.workforce.frappe.get_all", return_value=[]),
			patch("nomad_vip.api.entertainer_finex._summary", return_value={
				"rank": {"current": frappe._dict({"name": "Gold"})},
				"points": 100,
			}),
			patch("nomad_vip.api.workforce.record_api_audit"),
			patch("nomad_vip.api.workforce.frappe.db.commit"),
		):
			result = get_manager_entertainer_detail(profile.name)

		latest.assert_called_once_with(profile.name, date(2026, 8, 11))
		operational = result["manager_controls"]["operational"]
		self.assertEqual(operational["work_date"], date(2026, 8, 11))
		self.assertEqual(operational["status"], "checked_in")
		self.assertEqual(operational["latest_checkin"].name, "CHECKIN-1")


if __name__ == "__main__":
	import unittest

	unittest.main()
