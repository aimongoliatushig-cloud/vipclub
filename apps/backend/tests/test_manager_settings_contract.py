from __future__ import annotations

import json
import unittest
from pathlib import Path

from nomad_vip.daily_ranking import sales_score_from_amount


ROOT = Path(__file__).resolve().parents[1]


class ManagerSettingsContractTest(unittest.TestCase):
	def test_sales_amount_normalizes_to_the_forty_point_component(self):
		self.assertIsNone(sales_score_from_amount(1_000_000, 0))
		self.assertEqual(sales_score_from_amount(-100, 4_000_000), 0)
		self.assertEqual(sales_score_from_amount(2_000_000, 4_000_000), 50)
		self.assertEqual(sales_score_from_amount(4_000_000, 4_000_000), 100)
		self.assertEqual(sales_score_from_amount(8_000_000, 4_000_000), 100)

	def test_branch_schema_stores_sales_threshold_beside_attendance_policy(self):
		schema = json.loads((ROOT / "nomad_vip/nomad_vip/doctype/vip_branch_attendance_qr/vip_branch_attendance_qr.json").read_text(encoding="utf-8"))
		fields = {field["fieldname"]: field for field in schema["fields"]}
		self.assertEqual(fields["sales_full_score_amount"]["fieldtype"], "Currency")
		self.assertEqual(fields["sales_full_score_amount"]["default"], "0")

	def test_manager_settings_are_branch_scoped_versioned_idempotent_and_audited(self):
		source = (ROOT / "nomad_vip/api/manager_settings.py").read_text(encoding="utf-8")
		self.assertIn('require_actor("Branch Manager", require_branch=True)', source)
		self.assertIn('"Branch Manager" not in actor.roles', source)
		self.assertIn('requested != actor.branch', source)
		self.assertIn('FOR UPDATE', source)
		self.assertIn('assert_not_stale("VIP Branch Attendance QR"', source)
		self.assertIn('ACTION = "manager.branch_settings.update"', source)
		self.assertIn('details.get("requested") != requested', source)
		self.assertIn('record_api_audit(', source)

	def test_daily_rank_uses_verified_sales_when_no_explicit_event_exists(self):
		source = (ROOT / "nomad_vip/tasks/daily_rank.py").read_text(encoding="utf-8")
		self.assertIn('daily_sales_score(profile, scoring_date)', source)
		self.assertIn('DAILY_EVENT_COMPONENTS - {"entertainer_attitude", "sales"}', source)
		self.assertIn('_component_event(profile.name, "sales", scoring_date)', source)

	def test_manager_role_is_linked_to_own_employee_attendance(self):
		workforce = (ROOT / "nomad_vip/api/workforce.py").read_text(encoding="utf-8")
		self.assertIn('"mode": "manager"', workforce)
		self.assertIn('"employee": actor.employee', workforce)
		self.assertIn('"can_scan_attendance": True', workforce)


if __name__ == "__main__":
	unittest.main()
