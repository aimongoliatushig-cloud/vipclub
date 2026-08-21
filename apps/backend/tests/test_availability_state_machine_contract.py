from __future__ import annotations

import ast
import json
from pathlib import Path
from unittest import TestCase

from nomad_vip.availability_policy import (
	CANONICAL_AVAILABILITY_STATES,
	SYSTEM_AVAILABILITY_STATES,
	canonical_availability_status,
	entertainer_availability_next,
	entertainer_can_transition,
)


ROOT = Path(__file__).resolve().parents[1]


def _function_source(relative_path: str, function_name: str) -> str:
	path = ROOT / relative_path
	source = path.read_text(encoding="utf-8")
	tree = ast.parse(source)
	for node in ast.walk(tree):
		if isinstance(node, ast.FunctionDef) and node.name == function_name:
			return ast.get_source_segment(source, node) or ""
	raise AssertionError(f"{function_name} not found in {relative_path}")


class TestAvailabilityPolicy(TestCase):
	def test_canonical_states_and_legacy_read_aliases(self):
		self.assertEqual(
			CANONICAL_AVAILABILITY_STATES,
			("Unavailable", "Available", "Scheduled", "Reserved", "Working", "Break", "Leave"),
		)
		self.assertEqual(canonical_availability_status("Off Duty"), "Unavailable")
		self.assertEqual(canonical_availability_status("Serving"), "Working")
		self.assertIsNone(canonical_availability_status("Unknown"))

	def test_entertainer_only_owns_available_unavailable_toggle(self):
		self.assertEqual(entertainer_availability_next("Unavailable"), ("Available",))
		self.assertEqual(entertainer_availability_next("Available"), ("Unavailable",))
		self.assertTrue(entertainer_can_transition("Unavailable", "Available"))
		self.assertTrue(entertainer_can_transition("Available", "Unavailable"))
		for protected in SYSTEM_AVAILABILITY_STATES:
			with self.subTest(protected=protected):
				self.assertEqual(entertainer_availability_next(protected), ())
				self.assertFalse(entertainer_can_transition("Available", protected))
				self.assertFalse(entertainer_can_transition(protected, "Available"))


class TestAvailabilityMutationSourceContract(TestCase):
	def test_self_transition_has_lock_stale_idempotency_and_audit_guards(self):
		source = _function_source("nomad_vip/api/workday.py", "transition_availability")
		self.assertIn("require_entertainer_profile()", source)
		self.assertIn("FOR UPDATE", source)
		self.assertIn("expected_event", source)
		self.assertIn("expected_version", source)
		self.assertIn("_assert_availability_version", source)
		self.assertIn("_throw_idempotency_mismatch", source)
		self.assertIn("entertainer_can_transition", source)
		self.assertIn("record_api_audit", source)

	def test_manager_override_is_reasoned_branch_scoped_and_versioned(self):
		source = _function_source("nomad_vip/api/workforce.py", "manager_override_availability")
		self.assertIn('require_actor("Branch Manager", require_branch=True)', source)
		self.assertIn("_manager_profile(profile_name, branch)", source)
		self.assertIn("_required_reason(reason)", source)
		self.assertIn("FOR UPDATE", source)
		self.assertIn("expected_event", source)
		self.assertIn("expected_version", source)
		self.assertIn("_assert_availability_version", source)
		self.assertIn("_throw_idempotency_mismatch", source)
		self.assertIn("record_api_audit", source)

	def test_event_schema_preserves_complete_transition_chain(self):
		path = ROOT / (
			"nomad_vip/nomad_vip/doctype/vip_availability_event/"
			"vip_availability_event.json"
		)
		doc = json.loads(path.read_text(encoding="utf-8"))
		fields = {field["fieldname"] for field in doc["fields"]}
		self.assertTrue({
			"previous_event",
			"previous_status",
			"previous_version",
			"state_version",
			"status",
			"actor",
			"branch",
			"occurred_at",
		}.issubset(fields))

	def test_event_controller_enforces_append_only_history(self):
		path = ROOT / (
			"nomad_vip/nomad_vip/doctype/vip_availability_event/"
			"vip_availability_event.py"
		)
		source = path.read_text(encoding="utf-8")
		self.assertIn("def before_save", source)
		self.assertIn("if not self.is_new()", source)
		self.assertIn("def on_trash", source)
		self.assertGreaterEqual(source.count("frappe.PermissionError"), 2)

	def test_manager_override_uses_operational_shift_work_date(self):
		source = _function_source("nomad_vip/api/workforce.py", "manager_override_availability")
		self.assertIn("resolve_shift_context(profile.employee)", source)
		self.assertIn("shift_context.work_date", source)
		self.assertIn("shift_checkins(profile.employee, shift_context)", source)
		self.assertIn("state.open", source)
		self.assertIn("work_date=work_date", source)


if __name__ == "__main__":
	import unittest

	unittest.main()
