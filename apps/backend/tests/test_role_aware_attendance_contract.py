from __future__ import annotations

import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class RoleAwareAttendanceContractTest(unittest.TestCase):
	def test_branch_qr_schema_stores_a_default_late_cutoff(self):
		schema = json.loads((ROOT / "nomad_vip/nomad_vip/doctype/vip_branch_attendance_qr/vip_branch_attendance_qr.json").read_text(encoding="utf-8"))
		fields = {field["fieldname"]: field for field in schema["fields"]}
		self.assertEqual(fields["late_after_time"]["fieldtype"], "Time")
		self.assertEqual(fields["late_after_time"]["default"], "22:00:00")
		self.assertEqual(fields["late_after_time"]["reqd"], 1)

	def test_entertainer_is_arrival_only_and_employee_auto_toggles_in_out(self):
		source = (ROOT / "nomad_vip/api/attendance.py").read_text(encoding="utf-8")
		self.assertIn('"attendance_mode": "arrival_only" if profile else "arrival_and_departure"', source)
		self.assertIn('"requires_checkout": requires_checkout', source)
		self.assertIn('"checked_out": False if profile else bool(state.checked_out)', source)
		self.assertIn('"checked_out_at": None if profile else', source)
		self.assertIn('"latest_checkin": arrival if profile else state.latest', source)
		self.assertIn('if profile and log_type == "OUT"', source)
		self.assertIn('log_type = "IN" if profile else ("OUT" if state.open else "IN")', source)

	def test_manager_cutoff_is_branch_scoped_locked_and_audited(self):
		source = (ROOT / "nomad_vip/api/attendance.py").read_text(encoding="utf-8")
		self.assertIn('require_actor("Branch Manager", "VIP Admin", "System Manager")', source)
		self.assertIn('requested != actor.branch', source)
		self.assertIn('FOR UPDATE', source)
		self.assertIn('assert_not_stale("VIP Branch Attendance QR"', source)
		self.assertIn('action = "manager.attendance_policy.update_late_time"', source)
		self.assertIn('action=action', source)
		self.assertIn('details.get("requested") != requested', source)
		self.assertIn('"replayed": True', source)

	def test_lateness_uses_branch_cutoff_instead_of_shift_start(self):
		policy = (ROOT / "nomad_vip/api/attendance_policy.py").read_text(encoding="utf-8")
		management = (ROOT / "nomad_vip/api/management.py").read_text(encoding="utf-8")
		self.assertIn('late_minutes_after_cutoff(profile.branch, attendance_date, checkin.time)', policy)
		self.assertIn('late_minutes_after_cutoff(branch, attendance_work_date, arrival.time)', management)
		self.assertIn('"late_after_time": str(', management)

	def test_attendance_history_is_self_owned_and_groups_overnight_events(self):
		source = (ROOT / "nomad_vip/api/attendance.py").read_text(encoding="utf-8")
		self.assertIn("def get_my_attendance_history(limit=14):", source)
		self.assertIn('actor = require_employee_identity()', source)
		self.assertIn('"employee": actor.employee', source)
		self.assertIn('if moment.time() < time(12, 0):', source)
		self.assertIn('"arrived" if profile else ("completed" if departure else "arrived")', source)
		self.assertIn('"checked_out_at": None if profile else', source)
		self.assertNotIn("def get_my_attendance_history(employee", source)

	def test_entertainer_can_browse_weekly_schedule_with_arrival_dates(self):
		source = (ROOT / "nomad_vip/api/entertainer.py").read_text(encoding="utf-8")
		self.assertIn("def get_my_schedule(week_start=None):", source)
		self.assertIn("_weekly_schedule(profile.employee, week_start)", source)
		self.assertIn('"log_type": "IN"', source)
		self.assertIn('"attended_dates": sorted(attended_dates)', source)
		self.assertIn("if moment.time() < time(12, 0):", source)


if __name__ == "__main__":
	unittest.main()
