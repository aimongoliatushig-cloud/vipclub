from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase

from nomad_vip.api.security import (
	ActorContext,
	can_project_media,
	page_window,
	require_actor,
	require_entertainer_profile,
)


class TestAPISecurityContract(FrappeTestCase):
	def test_guest_is_denied_before_role_or_branch_resolution(self):
		with (
			patch("nomad_vip.api.security.frappe.session", SimpleNamespace(user="Guest")),
			patch("nomad_vip.api.security.frappe.get_roles") as get_roles,
			patch("nomad_vip.api.security.get_branch_for_user") as get_branch,
		):
			with self.assertRaises(frappe.PermissionError):
				require_actor("Branch Manager", require_branch=True)
			get_roles.assert_not_called()
			get_branch.assert_not_called()

	def test_actor_requires_an_explicit_allowed_role(self):
		with (
			patch("nomad_vip.api.security.frappe.session", SimpleNamespace(user="user@example.test")),
			patch("nomad_vip.api.security.frappe.get_roles", return_value=["System Manager"]),
			patch("nomad_vip.api.security.get_branch_for_user", return_value="Sapphire"),
			patch("nomad_vip.api.security.get_profile_for_user", return_value=None),
		):
			with self.assertRaises(frappe.PermissionError):
				require_actor("Branch Manager", require_branch=True)

	def test_actor_context_is_server_derived(self):
		with (
			patch("nomad_vip.api.security.frappe.session", SimpleNamespace(user="manager@example.test")),
			patch("nomad_vip.api.security.frappe.get_roles", return_value=["Branch Manager"]),
			patch("nomad_vip.api.security.get_branch_for_user", return_value="Sapphire"),
			patch("nomad_vip.api.security.get_profile_for_user", return_value=None),
		):
			actor = require_actor("Branch Manager", require_branch=True)
			self.assertEqual(actor.user, "manager@example.test")
			self.assertEqual(actor.branch, "Sapphire")
			self.assertEqual(actor.role, "Branch Manager")

	def test_branch_scoped_actor_requires_server_derived_branch(self):
		with (
			patch("nomad_vip.api.security.frappe.session", SimpleNamespace(user="manager@example.test")),
			patch("nomad_vip.api.security.frappe.get_roles", return_value=["Branch Manager"]),
			patch("nomad_vip.api.security.get_branch_for_user", return_value=None),
			patch("nomad_vip.api.security.get_profile_for_user", return_value=None),
		):
			with self.assertRaises(frappe.PermissionError):
				require_actor("Branch Manager", require_branch=True)

	def test_page_window_is_bounded(self):
		self.assertEqual(page_window(25, 50), (25, 50))
		with self.assertRaises(frappe.ValidationError):
			page_window(101, 0)
		with self.assertRaises(frappe.ValidationError):
			page_window(10, -1)

	def test_media_projection_requires_active_unexpired_consent(self):
		with patch("nomad_vip.api.security.today", return_value="2026-08-12"):
			self.assertTrue(can_project_media(frappe._dict({
				"media_consent_status": "Granted",
				"media_consent_expires_on": "2026-08-12",
			})))
			self.assertFalse(can_project_media(frappe._dict({
				"media_consent_status": "Granted",
				"media_consent_expires_on": "2026-08-11",
			})))
			self.assertFalse(can_project_media(frappe._dict({
				"media_consent_status": "Revoked",
				"media_consent_expires_on": None,
			})))

	def test_entertainer_profile_requires_role_and_matching_active_branch(self):
		actor = ActorContext(
			user="entertainer@example.test",
			roles=frozenset({"Entertainer"}),
			role="Entertainer",
			branch="Sapphire",
			profile="VIP-ENT-0001",
		)
		with (
			patch("nomad_vip.api.security.require_actor", return_value=actor),
			patch("nomad_vip.api.security.frappe.db.get_value", return_value=frappe._dict({
				"name": actor.profile,
				"employee": "HR-EMP-0001",
				"branch": "Sapphire",
				"active": 1,
				"lifecycle_status": "Active",
			})),
		):
			resolved_actor, profile = require_entertainer_profile()
			self.assertEqual(resolved_actor.user, actor.user)
			self.assertEqual(profile.branch, actor.branch)

		with (
			patch("nomad_vip.api.security.require_actor", return_value=actor),
			patch("nomad_vip.api.security.frappe.db.get_value", return_value=frappe._dict({
				"name": actor.profile,
				"employee": "HR-EMP-0001",
				"branch": "Neva",
				"active": 1,
				"lifecycle_status": "Active",
			})),
		):
			with self.assertRaises(frappe.PermissionError):
				require_entertainer_profile()

	def test_entertainer_profile_denies_inactive_and_suspended_lifecycle(self):
		actor = ActorContext(
			user="entertainer@example.test",
			roles=frozenset({"Entertainer"}),
			role="Entertainer",
			branch="Sapphire",
			profile="VIP-ENT-0001",
		)
		for active, lifecycle_status in ((0, "Inactive"), (1, "Suspended"), (1, "On Leave")):
			with self.subTest(active=active, lifecycle_status=lifecycle_status):
				with (
					patch("nomad_vip.api.security.require_actor", return_value=actor),
					patch("nomad_vip.api.security.frappe.db.get_value", return_value=frappe._dict({
						"name": actor.profile,
						"employee": "HR-EMP-0001",
						"branch": actor.branch,
						"active": active,
						"lifecycle_status": lifecycle_status,
					})),
				):
					with self.assertRaises(frappe.PermissionError):
						require_entertainer_profile()

	def test_entertainer_profile_denies_missing_profile_record(self):
		actor = ActorContext(
			user="entertainer@example.test",
			roles=frozenset({"Entertainer"}),
			role="Entertainer",
			branch="Sapphire",
			profile="VIP-ENT-MISSING",
		)
		with (
			patch("nomad_vip.api.security.require_actor", return_value=actor),
			patch("nomad_vip.api.security.frappe.db.get_value", return_value=None),
		):
			with self.assertRaises(frappe.PermissionError):
				require_entertainer_profile()
