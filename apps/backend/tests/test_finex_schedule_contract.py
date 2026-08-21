from __future__ import annotations

import ast
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FINEX = ROOT / "nomad_vip" / "integrations" / "finex.py"
SCHEDULE = ROOT / "nomad_vip" / "api" / "schedule.py"
ENTERTAINER = ROOT / "nomad_vip" / "api" / "entertainer.py"
ROSTER = ROOT / "nomad_vip" / "api" / "entertainer_roster.py"
HOOKS = ROOT / "nomad_vip" / "hooks.py"
DOCTYPE = ROOT / "nomad_vip" / "nomad_vip" / "doctype" / "vip_finex_schedule_snapshot" / "vip_finex_schedule_snapshot.json"


def function_source(path: Path, name: str) -> str:
	source = path.read_text(encoding="utf-8")
	tree = ast.parse(source)
	for node in ast.walk(tree):
		if isinstance(node, ast.FunctionDef) and node.name == name:
			return ast.get_source_segment(source, node) or ""
	raise AssertionError(f"{name} not found in {path}")


class FinexScheduleContractTests(unittest.TestCase):
	def test_legacy_schedule_import_is_bounded_but_no_longer_runs_daily(self):
		client = function_source(FINEX, "dancer_schedule")
		sync = function_source(FINEX, "sync_dancer_schedule_range")
		self.assertIn('f"{BASE_URL}/dancerSchedule"', client)
		self.assertIn("cannot exceed 62 days", sync)
		self.assertIn("_canonical_branch", sync)

		tree = ast.parse(HOOKS.read_text(encoding="utf-8"))
		scheduler = next(
			ast.literal_eval(node.value)
			for node in tree.body
			if isinstance(node, ast.Assign)
			and any(isinstance(target, ast.Name) and target.id == "scheduler_events" for target in node.targets)
		)
		self.assertNotIn(
			"nomad_vip.integrations.finex.sync_recent_dancer_schedule",
			json.dumps(scheduler),
		)

	def test_unreviewed_finex_names_never_become_confirmed_schedule(self):
		confirm = function_source(FINEX, "_confirmed_schedule_profile")
		self.assertIn('candidate.review_status != "Entertainer"', confirm)
		self.assertIn("not candidate.linked_profile", confirm)
		self.assertIn("profile.branch != branch", confirm)
		self.assertNotIn('"doctype": "Employee"', FINEX.read_text(encoding="utf-8"))
		self.assertNotIn('"doctype": "VIP Entertainer Profile"', function_source(FINEX, "sync_dancer_schedule_range"))

	def test_missing_finex_integer_codes_are_normalized_for_erpnext(self):
		upsert = function_source(FINEX, "_upsert_schedule_snapshot")
		self.assertIn('item.get("attendanceType") or 0', upsert)
		self.assertIn('dancer.get("status") or 0', upsert)

	def test_manager_must_link_one_active_same_branch_profile(self):
		review = function_source(ROSTER, "review_manager_roster_candidate")
		self.assertIn('decision == "Entertainer" and not linked_profile', review)
		self.assertIn("profile.branch != branch", review)
		self.assertIn('"linked_profile": linked_profile', review)
		self.assertIn('"name": ["!=", doc.name]', review)
		self.assertIn("doc.linked_profile = linked_profile or None", review)

	def test_manager_and_entertainer_calendars_use_only_confirmed_shift_assignments(self):
		projection = function_source(SCHEDULE, "get_manager_schedule")
		weekly = function_source(ENTERTAINER, "_weekly_schedule")
		self.assertIn('"Shift Assignment"', projection)
		self.assertIn('"authoritative": "Manager Entry"', projection)
		self.assertNotIn("finex_schedule_evidence", projection)
		self.assertNotIn('"imported"', projection)
		self.assertNotIn('"schedule_conflict"', projection)
		self.assertIn('"Shift Assignment"', weekly)
		self.assertNotIn("finex_schedule_evidence", weekly)
		self.assertNotIn('"imported"', weekly)
		self.assertNotIn('"schedule_conflict"', weekly)

	def test_legacy_import_can_still_be_run_deliberately_without_overwriting_manual_assignments(self):
		sync_assignment = function_source(FINEX, "_sync_finex_shift_assignment")
		cancel_assignment = function_source(FINEX, "_cancel_finex_assignment")
		integration_fields = function_source(FINEX, "ensure_crm_fields")
		self.assertIn('"doctype": "Shift Assignment"', sync_assignment)
		self.assertIn('"custom_vip_schedule_source": "Finex"', sync_assignment)
		self.assertIn('current.custom_vip_schedule_source != "Finex"', sync_assignment)
		self.assertIn('return "manual_override"', sync_assignment)
		self.assertIn('frappe.db.get_value("Employee", profile.employee, "status") != "Active"', sync_assignment)
		self.assertIn('return "inactive_employee"', sync_assignment)
		self.assertIn('getdate(work_date) < getdate(date.today())', cancel_assignment)
		self.assertIn('"Shift Assignment"', integration_fields)
		self.assertIn('"custom_finex_schedule_snapshot"', integration_fields)

	def test_manager_schedule_separates_entertainers_from_confirmed_employee_master(self):
		projection = function_source(SCHEDULE, "get_manager_schedule")
		setter = function_source(SCHEDULE, "set_manager_schedule")
		self.assertIn('"Employee"', projection)
		self.assertIn('filters={"branch": actor.branch, "status": "Active"}', projection)
		self.assertIn('"member_type": "Entertainer" if is_entertainer else "Employee"', projection)
		self.assertIn('"role_label": employee.designation or employee.department', projection)
		self.assertIn('"entertainer_count": entertainer_count', projection)
		self.assertIn('"employee_count": employee_count', projection)
		self.assertNotIn('"unlinked_candidates"', projection)
		self.assertIn("_schedule_target(profile_name, employee_name, actor.branch)", setter)
		self.assertIn('SELECT name FROM `tabEmployee` WHERE name=%s FOR UPDATE', setter)
		self.assertIn('"employee": employee.name', setter)

	def test_snapshot_is_read_only_for_manager_and_scope_hooks_exist(self):
		payload = json.loads(DOCTYPE.read_text(encoding="utf-8"))
		manager = next(row for row in payload["permissions"] if row["role"] == "Branch Manager")
		self.assertEqual(manager.get("read"), 1)
		self.assertNotEqual(manager.get("write"), 1)
		self.assertNotEqual(manager.get("create"), 1)
		self.assertNotEqual(manager.get("delete"), 1)

		hooks = HOOKS.read_text(encoding="utf-8")
		self.assertIn('"VIP Finex Schedule Snapshot"', hooks)
		self.assertIn("get_finex_schedule_query_conditions", hooks)
		self.assertIn("has_finex_schedule_permission", hooks)


if __name__ == "__main__":
	unittest.main()
