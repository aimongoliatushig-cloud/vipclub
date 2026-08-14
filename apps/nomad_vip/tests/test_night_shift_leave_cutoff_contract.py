from __future__ import annotations

import unittest
from datetime import datetime, timedelta
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class NightShiftLeaveCutoffContractTests(unittest.TestCase):
	def test_previous_day_2100_business_rule(self):
		leave_day = datetime(2026, 8, 13)
		cutoff = leave_day - timedelta(days=1) + timedelta(hours=21)
		self.assertLessEqual(datetime(2026, 8, 12, 9, 0), cutoff)
		self.assertGreater(datetime(2026, 8, 12, 21, 1), cutoff)

	def test_backend_uses_the_same_previous_day_rule(self):
		source = (ROOT / "nomad_vip" / "api" / "attendance_policy.py").read_text(encoding="utf-8")
		self.assertIn('or "21:00:00"', source)
		self.assertIn('"request_deadline_basis": "previous_day"', source)
		self.assertIn("cutoff_day = leave_day - timedelta(days=1)", source)
		self.assertIn("if leave_day <= today_day", source)
		self.assertIn("if now_datetime() > cutoff_at", source)

	def test_migration_and_frontend_are_registered(self):
		patches = (ROOT / "nomad_vip" / "patches.txt").read_text(encoding="utf-8")
		self.assertIn("nomad_vip.patches.v1_0.configure_night_shift_leave_cutoff", patches)
		frontend = (ROOT.parent / "entertainer-app" / "src" / "features" / "attendance" / "LeavePolicy.tsx").read_text(encoding="utf-8")
		self.assertIn("const DEFAULT_DEADLINE = '21:00'", frontend)
		self.assertIn("const cutoffDate = addCalendarDays(selected, -1)", frontend)
		self.assertIn("өмнөх өдрийн {deadline} цаг хүртэл", frontend)


if __name__ == "__main__":
	unittest.main()
