from __future__ import annotations

import ast
import json
from pathlib import Path
from unittest import TestCase


ROOT = Path(__file__).resolve().parents[1]


class TestLeadEntertainerRoleContract(TestCase):
	def test_context_and_navigation_keep_lead_separate_from_manager(self):
		workforce = (ROOT / "nomad_vip/api/workforce.py").read_text(encoding="utf-8")
		runtime = (ROOT.parent / "entertainer-app/src/runtimePolicy.ts").read_text(encoding="utf-8")
		self.assertIn('"mode": "lead"', workforce)
		self.assertIn("lead: Object.freeze", runtime)
		lead_block = runtime.split("lead: Object.freeze", 1)[1].split("entertainer: Object.freeze", 1)[0]
		self.assertIn("'readiness'", lead_block)
		for forbidden in ("'people'", "'corrections'", "'roster-review'", "'person-detail'"):
			self.assertNotIn(forbidden, lead_block)

	def test_manager_submit_is_guarded_by_lead_duty_fallback(self):
		source = (ROOT / "nomad_vip/api/supervisor.py").read_text(encoding="utf-8")
		tree = ast.parse(source)
		submit = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == "submit_readiness")
		text = ast.get_source_segment(source, submit) or ""
		self.assertIn('"Branch Manager", "System Manager"', text)
		self.assertIn("_readiness_access(actor, profile.branch, work_date)", text)
		self.assertIn('if not access["can_submit"]', text)
		self.assertIn("verified_checkin = _shift_checkin", text)
		self.assertIn("employee_checkin", text)

	def test_manager_can_view_queue_with_server_derived_access_state(self):
		source = (ROOT / "nomad_vip/api/supervisor.py").read_text(encoding="utf-8")
		tree = ast.parse(source)
		queue = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == "get_readiness_queue")
		text = ast.get_source_segment(source, queue) or ""
		self.assertIn('"Branch Manager", "System Manager"', text)
		self.assertIn("access = _readiness_access", text)
		self.assertIn('"access": access', text)
		self.assertIn("if not global_access and not actor.branch", text)

	def test_readiness_queue_keeps_pending_people_before_completed_people(self):
		source = (ROOT / "nomad_vip/api/supervisor.py").read_text(encoding="utf-8")
		tree = ast.parse(source)
		queue = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == "get_readiness_queue")
		text = ast.get_source_segment(source, queue) or ""
		self.assertIn("case when rc.name is null then 0 else 1 end asc", text)
		self.assertIn("case when rc.name is not null then rc.checked_at end asc", text)

	def test_manager_schedule_is_branch_scoped_audited_and_never_writes_checkin(self):
		source = (ROOT / "nomad_vip/api/schedule.py").read_text(encoding="utf-8")
		self.assertGreaterEqual(source.count('require_actor("Branch Manager", require_branch=True)'), 2)
		self.assertIn('action="manager.schedule.set"', source)
		self.assertIn("FOR UPDATE", source)
		self.assertIn("Shift Assignment", source)
		self.assertNotIn('"doctype": "Employee Checkin"', source)

	def test_admin_assigns_only_the_lead_role_and_keeps_manager_rights_out(self):
		source = (ROOT / "nomad_vip/api/admin.py").read_text(encoding="utf-8")
		self.assertIn('LEAD_ENTERTAINER_ROLE = "Lead Entertainer"', source)
		self.assertIn('"Branch Manager", "VIP Admin", "System Manager"', source)
		self.assertIn('action="admin.lead_entertainer.set"', source)

	def test_readiness_doctype_permissions_match_the_policy(self):
		payload = json.loads((
			ROOT / "nomad_vip/nomad_vip/doctype/vip_daily_readiness_check/vip_daily_readiness_check.json"
		).read_text(encoding="utf-8"))
		by_role = {row["role"]: row for row in payload["permissions"]}
		self.assertEqual(by_role["Lead Entertainer"].get("create"), 1)
		self.assertNotEqual(by_role["Branch Manager"].get("create"), 1)


if __name__ == "__main__":
	import unittest

	unittest.main()
