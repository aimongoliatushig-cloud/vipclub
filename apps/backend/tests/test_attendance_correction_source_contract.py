from __future__ import annotations

import ast
import json
from pathlib import Path
from unittest import TestCase


ROOT = Path(__file__).resolve().parents[1]


def _function_source(function_name: str) -> str:
	path = ROOT / "nomad_vip/api/workday.py"
	source = path.read_text(encoding="utf-8")
	tree = ast.parse(source)
	for node in ast.walk(tree):
		if isinstance(node, ast.FunctionDef) and node.name == function_name:
			return ast.get_source_segment(source, node) or ""
	raise AssertionError(f"{function_name} not found")


class TestAttendanceCorrectionSourceContract(TestCase):
	def test_approval_preserves_original_timestamp_and_links_replacement(self):
		source = _function_source("decide_attendance_correction")
		self.assertIn('frappe.get_doc("Employee Checkin", doc.original_checkin)', source)
		self.assertIn('"skip_auto_attendance", 1', source)
		self.assertIn('"applied_checkin": applied_checkin', source)
		self.assertNotIn('"Employee Checkin", original.name, "time"', source)

	def test_approval_uses_operational_shift_and_targeted_penalties(self):
		source = _function_source("decide_attendance_correction")
		self.assertIn("shift_context_for_work_date", source)
		self.assertIn("_requested_datetime", source)
		self.assertIn("_validate_correction_sequence", source)
		self.assertIn("_affected_penalties", source)
		self.assertIn("FOR UPDATE", source)

	def test_correction_schema_stores_review_evidence(self):
		path = ROOT / (
			"nomad_vip/nomad_vip/doctype/vip_attendance_correction_request/"
			"vip_attendance_correction_request.json"
		)
		fields = {field["fieldname"] for field in json.loads(path.read_text(encoding="utf-8"))["fields"]}
		self.assertTrue({
			"shift_assignment",
			"proposed_at",
			"original_checkin",
			"original_time",
			"original_checkin_modified",
			"applied_checkin",
			"reversed_penalties",
		}.issubset(fields))


if __name__ == "__main__":
	import unittest

	unittest.main()
