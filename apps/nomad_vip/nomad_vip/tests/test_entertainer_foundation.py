from __future__ import annotations

from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, today

from nomad_vip.permissions.core import (
	has_branch_assignment_permission,
	has_profile_permission,
)
from nomad_vip.api.entertainer import _week_bounds
from nomad_vip.api.entertainer import _workspace_payload
from nomad_vip.api.security import ActorContext
from nomad_vip.api.workforce import get_manager_entertainer_detail
from nomad_vip.imports.employee_intake import _upsert_profile
from nomad_vip.patches.v1_0.backfill_entertainer_branch_assignments import execute as backfill_assignments


class TestEntertainerFoundation(FrappeTestCase):
	def setUp(self):
		super().setUp()
		frappe.set_user("Administrator")
		company = frappe.db.get_single_value("Global Defaults", "default_company")
		company = company or frappe.db.get_value("Company", {}, "name")
		self.assertTrue(company, "A Company is required for entertainer foundation tests.")
		suffix = frappe.generate_hash(length=8)
		self.branch = frappe.get_doc(
			{"doctype": "Branch", "branch": f"Foundation {suffix}", "company": company}
		).insert(ignore_permissions=True)
		self.other_branch = frappe.get_doc(
			{"doctype": "Branch", "branch": f"Foundation Other {suffix}", "company": company}
		).insert(ignore_permissions=True)
		self.employee = frappe.get_doc(
			{
				"doctype": "Employee",
				"first_name": f"Foundation {suffix}",
				"gender": "Female",
				"date_of_birth": "2000-01-01",
				"date_of_joining": today(),
				"company": company,
				"branch": self.branch.name,
				"status": "Active",
			}
		).insert(ignore_permissions=True)
		self.profile = frappe.get_doc(
			{
				"doctype": "VIP Entertainer Profile",
				"employee": self.employee.name,
				"stage_name": f"Stage {suffix}",
				"skills": "Dance\ndance\nHosting",
				"languages": "Mongolian\nEnglish",
				"media_consent_status": "Granted",
				"media_consent_version": "foundation-test-v1",
				"active": 1,
			}
		).insert(ignore_permissions=True)

	def tearDown(self):
		frappe.set_user("Administrator")
		super().tearDown()

	def test_profile_normalizes_taxonomy_and_records_consent(self):
		self.assertEqual(self.profile.skills, "Dance\nHosting")
		self.assertEqual(self.profile.lifecycle_status, "Onboarding")
		self.assertEqual(self.profile.media_consent_actor, "Administrator")
		self.assertTrue(self.profile.media_consent_at)

	def test_new_photo_requires_granted_consent(self):
		self.profile.media_consent_status = "Denied"
		self.profile.profile_photo = "/files/not-uploaded-test-photo.png"
		with self.assertRaises(frappe.ValidationError):
			self.profile.save(ignore_permissions=True)

	def test_overlapping_open_assignments_are_blocked(self):
		frappe.get_doc(
			{
				"doctype": "VIP Entertainer Branch Assignment",
				"entertainer": self.profile.name,
				"branch": self.branch.name,
				"effective_from": today(),
				"effective_to": add_days(today(), 10),
				"assignment_status": "Active",
			}
		).insert(ignore_permissions=True)

		with self.assertRaises(frappe.ValidationError):
			frappe.get_doc(
				{
					"doctype": "VIP Entertainer Branch Assignment",
					"entertainer": self.profile.name,
					"branch": self.other_branch.name,
					"effective_from": add_days(today(), 5),
					"assignment_status": "Planned",
				}
			).insert(ignore_permissions=True)

	def test_administrator_can_record_audited_overlap_exception(self):
		for branch in (self.branch.name, self.other_branch.name):
			assignment = frappe.get_doc(
				{
					"doctype": "VIP Entertainer Branch Assignment",
					"entertainer": self.profile.name,
					"branch": branch,
					"effective_from": today(),
					"assignment_status": "Active",
					"allow_overlap": 1,
					"reason": "Approved test exception",
				}
			).insert(ignore_permissions=True)
			self.assertEqual(assignment.assigned_by, "Administrator")
			self.assertTrue(assignment.assigned_at)

	def test_overlap_exception_requires_reason(self):
		with self.assertRaises(frappe.ValidationError):
			frappe.get_doc(
				{
					"doctype": "VIP Entertainer Branch Assignment",
					"entertainer": self.profile.name,
					"branch": self.branch.name,
					"effective_from": today(),
					"assignment_status": "Active",
					"allow_overlap": 1,
				}
			).insert(ignore_permissions=True)

	def test_overlap_validation_locks_profile_before_checking_assignments(self):
		assignment = frappe.get_doc(
			{
				"doctype": "VIP Entertainer Branch Assignment",
				"entertainer": self.profile.name,
				"branch": self.branch.name,
				"effective_from": today(),
				"assignment_status": "Active",
			}
		)
		with patch("frappe.db.sql", side_effect=[[], []]) as sql:
			assignment._validate_overlap()
		self.assertIn("for update", sql.call_args_list[0].args[0].lower())
		self.assertIn("VIP Entertainer Profile", sql.call_args_list[0].args[0])
		self.assertIn("VIP Entertainer Branch Assignment", sql.call_args_list[1].args[0])

	def test_employee_intake_preserves_existing_media_consent_audit(self):
		original = {
			"status": self.profile.media_consent_status,
			"actor": self.profile.media_consent_actor,
			"at": self.profile.media_consent_at,
			"version": self.profile.media_consent_version,
		}
		profile_name, action = _upsert_profile(
			self.employee.name,
			{"stageName": "Imported Stage", "status": "Active"},
		)
		updated = frappe.get_doc("VIP Entertainer Profile", profile_name)
		self.assertEqual(action, "updated")
		self.assertEqual(updated.stage_name, "Imported Stage")
		self.assertEqual(updated.media_consent_status, original["status"])
		self.assertEqual(updated.media_consent_actor, original["actor"])
		self.assertEqual(updated.media_consent_at, original["at"])
		self.assertEqual(updated.media_consent_version, original["version"])

	def test_backfill_treats_open_planned_assignment_as_idempotent(self):
		planned = frappe.get_doc(
			{
				"doctype": "VIP Entertainer Branch Assignment",
				"entertainer": self.profile.name,
				"branch": self.branch.name,
				"effective_from": today(),
				"assignment_status": "Planned",
			}
		).insert(ignore_permissions=True)

		backfill_assignments()
		assignments = frappe.get_all(
			"VIP Entertainer Branch Assignment",
			filters={
				"entertainer": self.profile.name,
				"branch": self.branch.name,
				"assignment_status": ("in", ["Planned", "Active"]),
			},
			pluck="name",
		)
		self.assertEqual(assignments, [planned.name])

	def test_permission_projection_denies_cross_branch_and_entertainer_write(self):
		assignment = frappe._dict(
			entertainer=self.profile.name,
			branch=self.branch.name,
		)
		profile = frappe._dict(
			name=self.profile.name,
			branch=self.branch.name,
			employee=self.employee.name,
		)

		with (
			patch("nomad_vip.permissions.core.frappe.get_roles", return_value=["Branch Manager"]),
			patch("nomad_vip.permissions.core.get_branch_for_user", return_value=self.branch.name),
			patch("nomad_vip.permissions.core.get_profile_for_user", return_value=None),
		):
			self.assertTrue(has_profile_permission(profile, "manager@example.test", "write"))
			self.assertTrue(has_branch_assignment_permission(assignment, "manager@example.test", "create"))

		with (
			patch("nomad_vip.permissions.core.frappe.get_roles", return_value=["Branch Manager"]),
			patch("nomad_vip.permissions.core.get_branch_for_user", return_value=self.other_branch.name),
			patch("nomad_vip.permissions.core.get_profile_for_user", return_value=None),
		):
			self.assertFalse(has_profile_permission(profile, "other-manager@example.test", "read"))
			self.assertFalse(has_branch_assignment_permission(assignment, "other-manager@example.test", "write"))

		with (
			patch("nomad_vip.permissions.core.frappe.get_roles", return_value=["Entertainer"]),
			patch("nomad_vip.permissions.core.get_branch_for_user", return_value=self.branch.name),
			patch("nomad_vip.permissions.core.get_profile_for_user", return_value=self.profile.name),
		):
			self.assertTrue(has_profile_permission(profile, "entertainer@example.test", "read"))
			self.assertFalse(has_profile_permission(profile, "entertainer@example.test", "write"))
			self.assertTrue(has_branch_assignment_permission(assignment, "entertainer@example.test", "read"))
			self.assertFalse(has_branch_assignment_permission(assignment, "entertainer@example.test", "write"))

	def test_workspace_week_is_monday_through_sunday(self):
		start, end = _week_bounds("2026-08-12")
		self.assertEqual(str(start), "2026-08-10")
		self.assertEqual(str(end), "2026-08-16")

	def test_entertainer_projection_never_contains_customer_or_bill_data(self):
		payload = _workspace_payload(self.profile.name)
		serialized = frappe.as_json(payload).lower()
		self.assertNotIn("customer_phone", serialized)
		self.assertNotIn("full_bill", serialized)
		self.assertNotIn("bill_history", serialized)

	def test_manager_workspace_detail_denies_cross_branch_profile(self):
		actor = ActorContext(
			user="other-manager@example.test",
			roles=frozenset({"Branch Manager"}),
			role="Branch Manager",
			branch=self.other_branch.name,
			profile=None,
		)
		with patch("nomad_vip.api.workforce.require_actor", return_value=actor):
			with self.assertRaises(frappe.PermissionError):
				get_manager_entertainer_detail(self.profile.name)
