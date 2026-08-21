import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class DailyStageRoundContractTest(unittest.TestCase):
	def test_api_is_branch_scoped_qr_verified_and_limited_to_seven(self):
		source = (ROOT / "nomad_vip/api/stage_rounds.py").read_text(encoding="utf-8")
		supervisor = (ROOT / "nomad_vip/api/supervisor.py").read_text(encoding="utf-8")
		self.assertIn('DAILY_TARGET = 7', source)
		self.assertIn('"Lead Entertainer", "Entertainer Supervisor", "Branch Manager", "System Manager"', source)
		self.assertIn('_assert_branch_access(actor, profile.branch)', source)
		self.assertIn('_shift_checkin(row.employee, row, work_date)', source)
		self.assertIn("inner join `tabVIP Attendance Scan` scan", supervisor)
		self.assertIn("scan.result = 'Accepted'", supervisor)
		self.assertIn('if not checkin:', source)
		self.assertIn('if len(used_rounds) >= DAILY_TARGET:', source)
		self.assertIn('"verified": 1', source)
		self.assertIn('"source_document_type": "Employee Checkin"', source)
		self.assertIn('AUDIT_ACTION = "workforce.stage_round.record"', source)

	def test_manager_can_record_rounds_only_when_lead_is_not_on_duty(self):
		source = (ROOT / "nomad_vip/api/stage_rounds.py").read_text(encoding="utf-8")
		self.assertIn('_readiness_access(actor, actor.branch, work_date)', source)
		self.assertIn('if not access["can_submit"]:', source)
		self.assertIn('frappe.throw(access["message"], frappe.PermissionError)', source)

	def test_reversed_readiness_returns_to_pending_and_can_be_resubmitted(self):
		supervisor = (ROOT / "nomad_vip/api/supervisor.py").read_text(encoding="utf-8")
		entertainer = (ROOT / "nomad_vip/api/entertainer.py").read_text(encoding="utf-8")
		self.assertGreaterEqual(supervisor.count("and coalesce(rc.is_reversed, 0) = 0"), 3)
		self.assertIn('{"entertainer": profile.name, "shift_assignment": shift_assignment, "is_reversed": 0}', supervisor)
		self.assertIn('{"entertainer": profile.name, "shift_assignment": shift.name, "is_reversed": 0}', entertainer)

	def test_stage_round_is_rank_evidence_not_an_automatic_rank_change(self):
		rank_review = (ROOT / "nomad_vip/api/rank_review.py").read_text(encoding="utf-8")
		entertainer = (ROOT / "nomad_vip/api/entertainer.py").read_text(encoding="utf-8")
		self.assertIn('event_counts.get("Stage Round", 0)', rank_review)
		self.assertIn('"stage_round_completed_days": completed_stage_round_days', rank_review)
		self.assertIn('requires_human_approval', rank_review)
		self.assertIn('completed_stage_round_days', entertainer)
		self.assertIn('Гараа {0} · 7/7 биелүүлсэн өдөр {1}', entertainer)

	def test_performance_event_accepts_stage_round(self):
		path = ROOT / "nomad_vip/nomad_vip/doctype/vip_performance_event/vip_performance_event.json"
		definition = json.loads(path.read_text(encoding="utf-8"))
		event_type = next(field for field in definition["fields"] if field["fieldname"] == "event_type")
		self.assertIn("Stage Round", event_type["options"].splitlines())


if __name__ == "__main__":
	unittest.main()
