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


def _assert_before(test: TestCase, source: str, guard: str, protected_access: str) -> None:
	guard_at = source.find(guard)
	access_at = source.find(protected_access)
	test.assertGreaterEqual(guard_at, 0, f"missing guard: {guard}")
	test.assertGreaterEqual(access_at, 0, f"missing protected access: {protected_access}")
	test.assertLess(guard_at, access_at, f"{guard} must execute before {protected_access}")


class TestBackendSecuritySourceContracts(TestCase):
	"""Dependency-free checks that catch accidental guard removal before Frappe tests run."""

	def test_reservation_response_guards_before_loading_target(self):
		source = _function_source("nomad_vip/api/reservations.py", "respond")
		_assert_before(self, source, "require_entertainer_profile()", 'frappe.get_doc("VIP Reservation"')
		self.assertIn("doc.entertainer != profile.name", source)
		self.assertIn("doc.branch != profile.branch", source)
		self.assertIn("assert_not_stale", source)
		self.assertIn("record_api_audit", source)

	def test_profile_mutation_guards_before_loading_profile(self):
		source = _function_source("nomad_vip/api/profile.py", "submit_profile_change_request")
		_assert_before(self, source, "require_entertainer_profile()", 'frappe.get_doc("VIP Entertainer Profile"')
		self.assertIn("profile.branch != actor.branch", source)
		self.assertIn("assert_not_stale", source)
		self.assertIn("record_api_audit", source)
		self.assertNotIn("profile.save", source)

		compatibility = _function_source("nomad_vip/api/profile.py", "update_editable_profile")
		self.assertIn("submit_profile_change_request", compatibility)
		self.assertNotIn("frappe.get_doc", compatibility)

	def test_leave_endpoints_resolve_entertainer_identity_before_private_queries(self):
		for function_name, protected_access in (
			("get_leave_policy", "_profile(identity.name)"),
			("submit_emergency_leave", "_profile(identity.name)"),
		):
			with self.subTest(function_name=function_name):
				source = _function_source("nomad_vip/api/attendance_policy.py", function_name)
				_assert_before(self, source, "require_entertainer_profile()", protected_access)

	def test_manager_workforce_endpoints_use_server_branch_actor(self):
		for function_name in (
			"get_manager_dashboard",
			"get_manager_entertainer_detail",
			"manager_override_availability",
			"manager_override_rank",
		):
			with self.subTest(function_name=function_name):
				source = _function_source("nomad_vip/api/workforce.py", function_name)
				self.assertIn('require_actor("Branch Manager", require_branch=True)', source)

	def test_state_mutations_serialize_and_reject_idempotency_payload_reuse(self):
		for relative_path, function_name in (
			("nomad_vip/api/reservations.py", "respond"),
			("nomad_vip/api/supervisor.py", "submit_readiness"),
			("nomad_vip/api/supervisor.py", "reverse_readiness"),
			("nomad_vip/api/workforce.py", "manager_override_availability"),
			("nomad_vip/api/rank_review.py", "submit_rank_recommendation"),
			("nomad_vip/api/rank_review.py", "decide_rank_review"),
			("nomad_vip/api/workday.py", "transition_availability"),
			("nomad_vip/api/workday.py", "submit_attendance_correction"),
			("nomad_vip/api/workday.py", "decide_attendance_correction"),
			("nomad_vip/api/attendance_policy.py", "submit_emergency_leave"),
			("nomad_vip/api/attendance_policy.py", "decide_emergency_leave"),
			("nomad_vip/api/attendance_policy.py", "reverse_penalty"),
		):
			with self.subTest(function_name=function_name):
				source = _function_source(relative_path, function_name)
				self.assertIn("FOR UPDATE", source)
				self.assertTrue(
					"_throw_idempotency_mismatch" in source
					or "TimestampMismatchError" in source
					or "давхардал хамгаалах түлхүүр" in source
				)

	def test_permission_hooks_cover_bat112_and_bat113_records(self):
		hooks = (ROOT / "nomad_vip/hooks.py").read_text(encoding="utf-8")
		for doctype in (
			"VIP Entertainer Profile",
			"VIP Entertainer Branch Assignment",
			"VIP Attendance Scan",
			"VIP Emergency Leave Request",
			"VIP Attendance Penalty",
			"VIP Availability Event",
			"VIP Attendance Correction Request",
		):
			with self.subTest(doctype=doctype):
				self.assertGreaterEqual(hooks.count(f'"{doctype}"'), 2)

	def test_entertainer_projection_excludes_customer_and_bill_fields(self):
		source = (ROOT / "nomad_vip/api/entertainer.py").read_text(encoding="utf-8").lower()
		profile_fields = source.split("profile_fields = [", 1)[1].split("]", 1)[0]
		for forbidden in ("customer_phone", "bill_history", "full_bill", "raw_payload"):
			with self.subTest(field=forbidden):
				self.assertNotIn(forbidden, profile_fields)

	def test_bat113_import_preserves_consent_and_assignment_checks_serialize(self):
		upsert = _function_source("nomad_vip/imports/employee_intake.py", "_upsert_profile")
		update_path = upsert.split("if profile_name:", 1)[1].split("doc = frappe.get_doc({", 1)[0]
		create_path = upsert.split("doc = frappe.get_doc({", 1)[1]
		self.assertNotIn("media_consent_", update_path)
		self.assertIn('"media_consent_status": "Pending"', create_path)

		overlap = _function_source(
			"nomad_vip/nomad_vip/doctype/vip_entertainer_branch_assignment/vip_entertainer_branch_assignment.py",
			"_validate_overlap",
		)
		_assert_before(self, overlap, "FOR UPDATE", "tabVIP Entertainer Branch Assignment")
		self.assertIn("if self.allow_overlap:", overlap)

		exception = _function_source(
			"nomad_vip/nomad_vip/doctype/vip_entertainer_branch_assignment/vip_entertainer_branch_assignment.py",
			"_validate_overlap_exception",
		)
		self.assertIn("self.allow_overlap", exception)
		self.assertIn("self.reason", exception)

	def test_bat113_backfill_accepts_planned_or_active_equivalent(self):
		source = (ROOT / "nomad_vip/patches/v1_0/backfill_entertainer_branch_assignments.py").read_text(
			encoding="utf-8"
		)
		self.assertIn('"assignment_status": ("in", ["Planned", "Active"])', source)

	def test_qr_attendance_is_employee_owned_and_not_entertainer_only(self):
		attendance = (ROOT / "nomad_vip/api/attendance.py").read_text(encoding="utf-8")
		scan = _function_source("nomad_vip/api/attendance.py", "scan_branch_qr")
		context = _function_source("nomad_vip/api/workforce.py", "get_context")
		self.assertIn("require_employee_identity", scan)
		self.assertNotIn("require_entertainer_profile", scan)
		self.assertIn("tabEmployee", scan)
		self.assertIn('actor.branch != config.branch', scan)
		self.assertIn('log_type == "AUTO"', scan)
		self.assertIn("get_my_attendance_status", attendance)
		self.assertIn('"mode": "employee"', context)
		self.assertIn('"designation": designation', context)


if __name__ == "__main__":
	import unittest

	unittest.main()
