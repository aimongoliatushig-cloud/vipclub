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
		self.assertIn('approved_rank = current.current_rank if current and current.current_rank else DEFAULT_ENTERTAINER_RANK', body)

	def test_entertainer_rank_uses_effective_history_and_the_canonical_contract(self):
		source = (ROOT / "nomad_vip" / "api" / "entertainer.py").read_text(encoding="utf-8")
		body = source.split("def get_rank", 1)[1].split("def get_loan_overview", 1)[0]
		self.assertIn('current_rank = profile.current_rank or DEFAULT_ENTERTAINER_RANK', body)
		self.assertIn('effective_rank = _rank_on_date(reference_date, current_rank, history_rows)', body)
		self.assertIn('return build_rank_contract(', body)
		self.assertNotIn('minimum_points', body)
		self.assertNotIn('requires_human_approval', body)
		self.assertNotIn('_summary(profile)', body)

	def test_public_income_api_does_not_recreate_rank_from_cumulative_sales_points(self):
		source = (ROOT / "nomad_vip" / "api" / "entertainer_finex.py").read_text(encoding="utf-8")
		self.assertNotIn("rank_for_points", source)
		self.assertNotIn('result["rank"]', source)
		self.assertIn("rank_history=rank_history", source)

	def test_only_short_lateness_waits_for_manager_cancellation(self):
		source = (ROOT / "nomad_vip" / "api" / "attendance_policy.py").read_text(encoding="utf-8")
		self.assertIn("MANAGER_LATE_REVIEW_MINUTES = 10", source)
		self.assertIn('"status": "Approved" if auto_approve else "Pending Review"', source)
		self.assertIn("auto_approve=late_minutes > MANAGER_LATE_REVIEW_MINUTES", source)
		self.assertIn("auto_approve=True", source)
		self.assertIn("def decide_penalty", source)
		self.assertIn('require_actor("Branch Manager", require_branch=True)', source)
		self.assertIn('action="manager.attendance_penalty.decide"', source)

	def test_attendance_rates_and_late_rounding_match_approved_policy(self):
		source = (ROOT / "nomad_vip" / "api" / "attendance_policy.py").read_text(encoding="utf-8")
		self.assertIn('"absence_deduction": flt(frappe.db.get_single_value(POLICY_DOCTYPE, "absence_deduction") or 150000)', source)
		self.assertIn('"late_deduction_per_minute": flt(frappe.db.get_single_value(POLICY_DOCTYPE, "late_deduction_per_minute") or 500)', source)
		self.assertIn("max(0, int(math.ceil(late_seconds / 60)))", source)
		self.assertIn("branch_late_cutoff(branch, work_date)", source)
		self.assertIn("late_minutes * policy.late_deduction_per_minute", source)
		self.assertRegex(
			source,
			r'"Absence",\s+policy\.absence_deduction,\s+policy\.absence_deduction',
		)

	def test_absence_proposals_are_finalized_by_the_scheduler(self):
		hooks = (ROOT / "nomad_vip" / "hooks.py").read_text(encoding="utf-8")
		self.assertIn('"hourly": [', hooks)
		self.assertIn('"nomad_vip.api.attendance_policy.finalize_absences"', hooks)

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
