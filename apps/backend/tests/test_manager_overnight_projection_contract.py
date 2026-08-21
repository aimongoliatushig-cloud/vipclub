from __future__ import annotations

import ast
from pathlib import Path
from unittest import TestCase


ROOT = Path(__file__).resolve().parents[1]


def _function_source(relative_path: str, function_name: str) -> str:
	path = ROOT / relative_path
	source = path.read_text(encoding="utf-8")
	tree = ast.parse(source)
	for node in ast.walk(tree):
		if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == function_name:
			return ast.get_source_segment(source, node) or ""
	raise AssertionError(f"{function_name} not found in {relative_path}")


class TestManagerOvernightProjectionSourceContract(TestCase):
	def test_roster_uses_bulk_operational_context_and_windowed_checkins(self):
		source = _function_source("nomad_vip/api/workforce.py", "get_manager_dashboard")
		self.assertIn("resolve_shift_contexts(employee_names, projection_moment)", source)
		self.assertIn("work_date_by_profile", source)
		self.assertIn('"work_date": ("in", work_dates)', source)
		self.assertIn('fields=["entertainer", "work_date", *AVAILABILITY_EVENT_FIELDS]', source)
		self.assertIn("context.window_start", source)
		self.assertIn("context.window_end", source)
		self.assertIn('"work_date": work_date', source)
		self.assertIn('"generated_at": now_datetime()', source)
		for summary_key in ('"on_shift"', '"available"', '"reserved"', '"working"', '"break"'):
			self.assertIn(summary_key, source)
		self.assertNotIn("_active_shift(profile.employee)", source)

	def test_manager_detail_uses_resolved_work_date_for_all_live_state(self):
		source = _function_source("nomad_vip/api/workforce.py", "get_manager_entertainer_detail")
		self.assertIn("resolve_shift_context(profile_record.employee, projection_moment)", source)
		self.assertIn("shift_context.work_date", source)
		self.assertIn("_latest_availability(profile_name, work_date)", source)
		self.assertIn("shift_checkins(profile_record.employee, shift_context)", source)
		self.assertIn('"leave_date": work_date', source)
		self.assertIn('"attendance_date": work_date', source)
		self.assertIn('"operational": {', source)

	def test_bulk_resolver_prefetches_assignments_and_shift_types(self):
		source = _function_source("nomad_vip/api/shift_state.py", "resolve_shift_contexts")
		self.assertIn('"Shift Assignment"', source)
		self.assertIn('"Shift Type"', source)
		self.assertIn("previous_day", source)
		self.assertIn("contexts_by_employee", source)


if __name__ == "__main__":
	import unittest

	unittest.main()
