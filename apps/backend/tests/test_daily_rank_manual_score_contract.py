from __future__ import annotations

import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class DailyRankManualScoreContractTest(unittest.TestCase):
	def test_manager_score_changes_are_append_only_and_five_point_steps(self):
		source = (ROOT / "nomad_vip" / "api" / "daily_rank.py").read_text(encoding="utf-8")
		self.assertIn('"customer_complaints": "Ranking Customer Complaints Score"', source)
		self.assertIn('MANAGER_ONLY_COMPONENTS = {"customer_complaints", "entertainer_attitude"}', source)
		self.assertIn('abs(value / 5 - round(value / 5))', source)
		self.assertIn('order_by="scoring_date desc, occurred_at desc, creation desc"', source)
		self.assertIn('"previous_event": previous.name if previous else None', source)
		self.assertIn('"previous_score": flt(previous.component_score) if previous else None', source)
		self.assertNotIn("TimestampMismatchError", source)

	def test_customer_complaint_requires_reason_and_severity(self):
		source = (ROOT / "nomad_vip" / "api" / "daily_rank.py").read_text(encoding="utf-8")
		self.assertIn('if component == "customer_complaints":', source)
		self.assertIn('if len(reason) < 5:', source)
		self.assertIn('if severity not in COMPLAINT_SEVERITIES:', source)
		self.assertIn('"severity": severity or None', source)

	def test_manager_profile_keeps_effective_rank_and_exposes_score_audit(self):
		source = (ROOT / "nomad_vip" / "api" / "workforce.py").read_text(encoding="utf-8")
		self.assertIn('"component_audit": component_audit', source)
		self.assertIn('filters={"entertainer": profile_name, "source": "daily_rank_assessment"}', source)
		self.assertIn('frappe.db.has_column("VIP Performance Event", field)', source)
		self.assertIn('if all(', source)
		self.assertNotIn('payload["profile"]["current_rank"] = daily_rank.get("calculated_rank")', source)
		self.assertIn('payload["profile"]["approved_rank"] = profile_record.current_rank or DEFAULT_ENTERTAINER_RANK', source)


if __name__ == "__main__":
	unittest.main()
