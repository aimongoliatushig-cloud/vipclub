from __future__ import annotations

import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class HumanRankPenaltyContractTests(unittest.TestCase):
	def test_point_recalculation_never_auto_changes_rank(self):
		source = (ROOT / "nomad_vip" / "services.py").read_text(encoding="utf-8")
		body = source.split("def update_profile_points", 1)[1].split("def reverse_readiness_points", 1)[0]
		self.assertNotIn("VIP Rank History", body)
		self.assertNotIn("minimum_points", body)
		self.assertIn('approved_rank = current.current_rank if current and current.current_rank else "Gold"', body)

	def test_entertainer_rank_separates_approved_and_recommended(self):
		source = (ROOT / "nomad_vip" / "api" / "entertainer.py").read_text(encoding="utf-8")
		body = source.split("def get_rank", 1)[1].split("def get_workspace", 1)[0]
		self.assertIn('approved_name = profile.current_rank or "Gold"', body)
		self.assertIn('"recommendation"', body)
		self.assertIn('"requires_human_approval": True', body)
		self.assertIn('"ranks": all_ranks', body)
		self.assertIn('filters={"active": 1}', body)
		self.assertIn('order_by="rank_order asc"', body)

	def test_penalty_is_proposal_until_manager_decision(self):
		source = (ROOT / "nomad_vip" / "api" / "attendance_policy.py").read_text(encoding="utf-8")
		self.assertIn('"status": "Pending Review"', source)
		self.assertIn("def decide_penalty", source)
		self.assertIn('require_actor("Branch Manager", require_branch=True)', source)
		self.assertIn('action="manager.attendance_penalty.decide"', source)

	def test_attendance_rates_and_late_rounding_match_approved_policy(self):
		source = (ROOT / "nomad_vip" / "api" / "attendance_policy.py").read_text(encoding="utf-8")
		self.assertIn('"absence_deduction": flt(frappe.db.get_single_value(POLICY_DOCTYPE, "absence_deduction") or 150000)', source)
		self.assertIn('"late_deduction_per_minute": flt(frappe.db.get_single_value(POLICY_DOCTYPE, "late_deduction_per_minute") or 500)', source)
		self.assertIn("late_minutes = int(math.ceil(late_seconds / 60))", source)
		self.assertIn("late_minutes * policy.late_deduction_per_minute", source)
		self.assertIn('"Absence", policy.absence_deduction, policy.absence_deduction', source)

	def test_absence_proposals_are_finalized_by_the_scheduler(self):
		hooks = (ROOT / "nomad_vip" / "hooks.py").read_text(encoding="utf-8")
		self.assertIn('"hourly": ["nomad_vip.api.attendance_policy.finalize_absences"]', hooks)

	def test_only_approved_penalties_are_summed(self):
		source = (ROOT / "nomad_vip" / "api" / "entertainer.py").read_text(encoding="utf-8")
		self.assertNotIn('row.status == "Active"', source)
		self.assertIn('row.status == "Approved"', source)

	def test_doctype_statuses_and_audit_fields(self):
		path = ROOT / "nomad_vip" / "nomad_vip" / "doctype" / "vip_attendance_penalty" / "vip_attendance_penalty.json"
		payload = json.loads(path.read_text(encoding="utf-8"))
		fields = {row["fieldname"]: row for row in payload["fields"]}
		self.assertEqual(fields["status"]["default"], "Pending Review")
		self.assertEqual(fields["status"]["options"].splitlines(), ["Pending Review", "Approved", "Rejected", "Reversed"])
		for fieldname in ("decided_by", "decided_at", "decision_reason", "reversed_by", "reversed_at", "reversal_reason"):
			self.assertIn(fieldname, fields)


if __name__ == "__main__":
	unittest.main()
