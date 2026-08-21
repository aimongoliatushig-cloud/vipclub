from __future__ import annotations

import importlib.util
import unittest
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ENTRY_DAY = ROOT / "nomad_vip" / "api" / "entry_day.py"
OPERATION = ROOT / "nomad_vip" / "api" / "operation.py"
ENTRY = ROOT / "nomad_vip" / "api" / "entry.py"


def _load_entry_day():
	spec = importlib.util.spec_from_file_location("entry_day_contract", ENTRY_DAY)
	module = importlib.util.module_from_spec(spec)
	assert spec and spec.loader
	spec.loader.exec_module(module)
	return module


class EntryOperationalDayTest(unittest.TestCase):
	def test_overnight_visit_remains_on_previous_work_date_until_noon(self):
		module = _load_entry_day()
		day, start, end = module.operational_window(datetime(2026, 8, 17, 5, 30))
		self.assertEqual(str(day), "2026-08-16")
		self.assertEqual(start.isoformat(sep=" "), "2026-08-16 12:00:00")
		self.assertEqual(end.isoformat(sep=" "), "2026-08-17 12:00:00")

	def test_new_work_date_starts_at_noon(self):
		module = _load_entry_day()
		day, start, end = module.operational_window(datetime(2026, 8, 17, 12, 0))
		self.assertEqual(str(day), "2026-08-17")
		self.assertEqual((end - start).total_seconds(), 86400)

	def test_guard_and_operator_share_one_server_scoped_workspace(self):
		source = OPERATION.read_text(encoding="utf-8")
		self.assertIn("def get_daily_entry_workspace", source)
		self.assertIn('require_any_role("Reception", "Operation", "Branch Manager")', source)
		self.assertIn('["VIP Phone Reservation", "expected_at", ">=", window_start]', source)
		self.assertIn('["VIP Phone Reservation", "expected_at", "<", window_end]', source)
		self.assertIn("workspace = get_daily_entry_workspace(branch, work_date, limit)", source)

	def test_manager_feed_uses_same_bounded_operational_day(self):
		source = ENTRY.read_text(encoding="utf-8")
		self.assertIn("operational_window(now_datetime())", source)
		self.assertIn('["VIP Customer Entry Event", "entered_at", "<", window_end]', source)
		self.assertIn("select count(*) as today_total", source)
		self.assertIn("sum(case when visit_type = 'New Customer'", source)
		self.assertIn("sum(case when coalesce(manager_acknowledged, 0) = 0", source)
		self.assertIn('"today_total": int(entry_counts.today_total or 0)', source)
		self.assertIn('"unread": int(entry_counts.unread or 0)', source)

	def test_operator_reservation_time_and_duplicate_guard_are_server_enforced(self):
		source = OPERATION.read_text(encoding="utf-8")
		self.assertIn("expected < moment - timedelta(minutes=5)", source)
		self.assertIn("not window_start <= expected < window_end", source)
		self.assertIn("SELECT name FROM `tabCustomer` WHERE name=%s FOR UPDATE", source)
		self.assertIn("Энэ дугаарт өнөөдрийн идэвхтэй захиалга байна", source)


if __name__ == "__main__":
	unittest.main()
