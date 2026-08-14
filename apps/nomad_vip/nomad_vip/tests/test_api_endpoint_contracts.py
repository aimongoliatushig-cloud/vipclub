from __future__ import annotations

from unittest import TestCase
from unittest.mock import MagicMock, patch

import frappe

from nomad_vip.api.attendance_policy import get_leave_policy, get_manager_leave_requests
from nomad_vip.api.entertainer_roster import get_manager_roster_candidates
from nomad_vip.api.profile import _validate_profile_photo, get_editable_profile, update_editable_profile
from nomad_vip.api.reservations import respond
from nomad_vip.api.security import ActorContext
from nomad_vip.api.supervisor import get_readiness_queue, submit_readiness
from nomad_vip.api.workforce import get_context, get_manager_dashboard


def _actor(role: str, *, branch: str = "Sapphire", profile: str | None = None) -> ActorContext:
	return ActorContext(
		user=f"{role.lower().replace(' ', '.')}@example.test",
		roles=frozenset({role}),
		role=role,
		branch=branch,
		profile=profile,
	)


def _reservation(*, entertainer="VIP-ENT-A", branch="Sapphire", status="Assigned"):
	doc = MagicMock()
	doc.name = "VIP-RES-0001"
	doc.doctype = "VIP Reservation"
	doc.entertainer = entertainer
	doc.branch = branch
	doc.status = status
	doc.modified = "2026-08-12 10:00:00.000000"
	return doc


class TestProfileAndLeaveGuards(TestCase):
	def test_profile_photo_rejects_user_owned_public_file(self):
		file_row = frappe._dict({
			"name": "FILE-1",
			"owner": "entertainer@example.test",
			"file_name": "profile.png",
			"file_size": 1024,
			"file_type": "PNG",
			"is_private": 0,
		})
		with patch("nomad_vip.api.profile.frappe.get_all", return_value=[file_row]):
			with self.assertRaises(frappe.PermissionError):
				_validate_profile_photo(
					"/files/profile.png",
					"entertainer@example.test",
					None,
				)

	def test_profile_read_stops_when_role_guard_denies(self):
		denied = frappe.PermissionError("denied")
		with (
			patch("nomad_vip.api.profile.require_entertainer_profile", side_effect=denied),
			patch("nomad_vip.api.profile._profile_payload") as payload,
		):
			with self.assertRaises(frappe.PermissionError):
				get_editable_profile()
			payload.assert_not_called()

	def test_profile_update_stops_when_active_profile_guard_denies(self):
		with (
			patch(
				"nomad_vip.api.profile.require_entertainer_profile",
				side_effect=frappe.PermissionError("inactive profile"),
			),
			patch("nomad_vip.api.profile.frappe.get_doc") as get_doc,
		):
			with self.assertRaises(frappe.PermissionError):
				update_editable_profile(stage_name="Anu")
			get_doc.assert_not_called()

	def test_leave_projection_stops_when_entertainer_guard_denies(self):
		denied = frappe.PermissionError("denied")
		with (
			patch("nomad_vip.api.attendance_policy.require_entertainer_profile", side_effect=denied),
			patch("nomad_vip.api.attendance_policy._profile") as profile,
		):
			with self.assertRaises(frappe.PermissionError):
				get_leave_policy()
			profile.assert_not_called()

	def test_manager_leave_list_is_branch_scoped_and_paginated(self):
		actor = _actor("Branch Manager")
		with (
			patch("nomad_vip.api.attendance_policy.require_actor", return_value=actor),
			patch("nomad_vip.api.attendance_policy.frappe.get_all", return_value=[]) as get_all,
			patch("nomad_vip.api.attendance_policy._policy", return_value=frappe._dict()),
		):
			result = get_manager_leave_requests(status="Pending", limit=25, cursor=50)

		self.assertEqual(result["meta"]["branch"], actor.branch)
		self.assertEqual(result["meta"]["limit"], 25)
		self.assertEqual(result["meta"]["cursor"], 50)
		request_call = next(
			call
			for call in get_all.call_args_list
			if call.args and call.args[0] == "VIP Emergency Leave Request"
		)
		self.assertEqual(request_call.kwargs["filters"]["branch"], actor.branch)
		self.assertEqual(request_call.kwargs["limit_page_length"], 0)
		self.assertTrue(any(call.args and call.args[0] == "Employee" for call in get_all.call_args_list))
		self.assertTrue(any(call.args and call.args[0] == "Leave Application" for call in get_all.call_args_list))


class TestReservationSecurityContract(TestCase):
	def test_reservation_response_stops_when_profile_guard_denies(self):
		with (
			patch(
				"nomad_vip.api.reservations.require_entertainer_profile",
				side_effect=frappe.PermissionError("denied"),
			),
			patch("nomad_vip.api.reservations.frappe.get_doc") as get_doc,
		):
			with self.assertRaises(frappe.PermissionError):
				respond("VIP-RES-0001", "ACKNOWLEDGE")
			get_doc.assert_not_called()

	def test_reservation_response_denies_other_entertainer_idor(self):
		actor = _actor("Entertainer", profile="VIP-ENT-A")
		profile = frappe._dict(name="VIP-ENT-A", branch="Sapphire")
		doc = _reservation(entertainer="VIP-ENT-B")
		with (
			patch("nomad_vip.api.reservations.require_entertainer_profile", return_value=(actor, profile)),
			patch("nomad_vip.api.reservations.frappe.db.sql"),
			patch("nomad_vip.api.reservations.frappe.get_doc", return_value=doc),
			patch("nomad_vip.api.reservations.record_api_audit") as audit,
		):
			with self.assertRaises(frappe.PermissionError):
				respond(doc.name, "ACKNOWLEDGE")
			audit.assert_not_called()

	def test_reservation_response_denies_cross_branch_idor(self):
		actor = _actor("Entertainer", profile="VIP-ENT-A")
		profile = frappe._dict(name="VIP-ENT-A", branch="Sapphire")
		doc = _reservation(entertainer=profile.name, branch="Neva")
		with (
			patch("nomad_vip.api.reservations.require_entertainer_profile", return_value=(actor, profile)),
			patch("nomad_vip.api.reservations.frappe.db.sql"),
			patch("nomad_vip.api.reservations.frappe.get_doc", return_value=doc),
			patch("nomad_vip.api.reservations.record_api_audit") as audit,
		):
			with self.assertRaises(frappe.PermissionError):
				respond(doc.name, "ACKNOWLEDGE")
			audit.assert_not_called()

	def test_reservation_response_rejects_stale_version_before_save(self):
		actor = _actor("Entertainer", profile="VIP-ENT-A")
		profile = frappe._dict(name="VIP-ENT-A", branch="Sapphire")
		doc = _reservation()
		with (
			patch("nomad_vip.api.reservations.require_entertainer_profile", return_value=(actor, profile)),
			patch("nomad_vip.api.reservations.frappe.db.sql"),
			patch("nomad_vip.api.reservations.frappe.get_doc", return_value=doc),
			patch("nomad_vip.api.reservations.assert_not_stale", side_effect=frappe.TimestampMismatchError("stale")),
			patch("nomad_vip.api.reservations.record_api_audit") as audit,
		):
			with self.assertRaises(frappe.TimestampMismatchError):
				respond(doc.name, "ACKNOWLEDGE", expected_modified="old")
			doc.save.assert_not_called()
			audit.assert_not_called()

	def test_reservation_response_replays_before_second_transition(self):
		actor = _actor("Entertainer", profile="VIP-ENT-A")
		profile = frappe._dict(name="VIP-ENT-A", branch="Sapphire")
		doc = _reservation(status="Acknowledged")
		with (
			patch("nomad_vip.api.reservations.require_entertainer_profile", return_value=(actor, profile)),
			patch("nomad_vip.api.reservations.frappe.db.sql"),
			patch("nomad_vip.api.reservations.frappe.get_doc", return_value=doc),
			patch("nomad_vip.api.reservations.frappe.db.exists", return_value=True),
			patch("nomad_vip.api.reservations.assert_not_stale") as stale,
		):
			result = respond(doc.name, "ACKNOWLEDGE", idempotency_key="retry-1")

		self.assertTrue(result["replayed"])
		self.assertEqual(result["status"], "Acknowledged")
		stale.assert_not_called()
		doc.save.assert_not_called()

	def test_successful_reservation_response_saves_and_audits_once(self):
		actor = _actor("Entertainer", profile="VIP-ENT-A")
		profile = frappe._dict(name="VIP-ENT-A", branch="Sapphire")
		doc = _reservation()
		with (
			patch("nomad_vip.api.reservations.require_entertainer_profile", return_value=(actor, profile)),
			patch("nomad_vip.api.reservations.frappe.db.sql") as lock,
			patch("nomad_vip.api.reservations.frappe.get_doc", return_value=doc),
			patch("nomad_vip.api.reservations.frappe.db.exists", return_value=False),
			patch("nomad_vip.api.reservations.assert_not_stale") as stale,
			patch("nomad_vip.api.reservations.record_api_audit") as audit,
			patch("nomad_vip.api.reservations.frappe.db.commit") as commit,
		):
			result = respond(
				doc.name,
				"CONFLICT",
				reason="Schedule conflict",
				expected_modified=doc.modified,
				idempotency_key="command-1",
			)

		self.assertFalse(result["replayed"])
		self.assertEqual(doc.status, "Conflict")
		self.assertEqual(doc.conflict_reason, "Schedule conflict")
		self.assertTrue(doc.flags.ignore_permissions)
		lock.assert_called_once()
		stale.assert_called_once_with(doc.doctype, doc.name, doc.modified)
		doc.save.assert_called_once_with()
		audit.assert_called_once()
		self.assertEqual(audit.call_args.kwargs["actor"], actor)
		self.assertEqual(audit.call_args.kwargs["target_name"], doc.name)
		self.assertEqual(audit.call_args.kwargs["idempotency_key"], "command-1")
		commit.assert_called_once_with()


class TestRosterReadinessAndContextContracts(TestCase):
	def test_context_uses_server_actor_for_manager(self):
		actor = _actor("Branch Manager")
		with (
			patch("nomad_vip.api.workforce.require_actor", return_value=actor),
			patch("nomad_vip.api.workforce.frappe.utils.get_fullname", return_value="Manager"),
		):
			result = get_context()
		self.assertEqual(result["mode"], "manager")
		self.assertEqual(result["branch"], actor.branch)
		self.assertIsNone(result["profile"])

	def test_context_uses_server_linked_entertainer_profile(self):
		actor = _actor("Entertainer", profile="VIP-ENT-A")
		profile = frappe._dict(name=actor.profile, branch="Sapphire")
		with (
			patch("nomad_vip.api.workforce.require_actor", return_value=actor),
			patch("nomad_vip.api.workforce.require_entertainer_profile", return_value=(actor, profile)),
			patch("nomad_vip.api.workforce.frappe.utils.get_fullname", return_value="Anu"),
		):
			result = get_context()
		self.assertEqual(result["mode"], "entertainer")
		self.assertEqual(result["profile"], actor.profile)
		self.assertEqual(result["branch"], "Sapphire")

	def test_empty_manager_roster_keeps_branch_and_page_contract(self):
		actor = _actor("Branch Manager")
		with (
			patch("nomad_vip.api.workforce.require_actor", return_value=actor),
			patch("nomad_vip.api.workforce.frappe.get_all", return_value=[]),
			patch("nomad_vip.api.workforce.frappe.db.count", return_value=0),
		):
			result = get_manager_dashboard(limit=10, cursor=20)

		self.assertEqual(result["branch"], actor.branch)
		self.assertEqual(result["roster"], [])
		self.assertEqual(result["meta"]["limit"], 10)
		self.assertEqual(result["meta"]["cursor"], 20)
		self.assertEqual(result["meta"]["total"], 0)

	def test_finex_review_queue_is_filtered_to_manager_branch(self):
		actor = _actor("Branch Manager")
		with (
			patch("nomad_vip.api.entertainer_roster.require_actor", return_value=actor),
			patch("nomad_vip.api.entertainer_roster.frappe.get_all", return_value=[]) as get_all,
			patch(
				"nomad_vip.api.entertainer_roster.frappe.db.sql",
				side_effect=[[], [[0]]],
			),
		):
			result = get_manager_roster_candidates(status="Pending")

		self.assertEqual(result["branch"], "Sapphire")
		self.assertEqual(get_all.call_args.kwargs["filters"], {
			"inferred_branch": "Sapphire",
			"review_status": "Pending",
		})

	def test_readiness_queue_sql_is_branch_scoped(self):
		actor = _actor("Branch Manager")
		with (
			patch("nomad_vip.api.supervisor.require_actor", return_value=actor),
			patch("nomad_vip.api.supervisor.frappe.db.sql", side_effect=[[[0]], []]) as sql,
		):
			result = get_readiness_queue()

		self.assertEqual(result["queue"], [])
		self.assertEqual(result["meta"]["branch"], actor.branch)
		for call in sql.call_args_list:
			query, values = call.args[:2]
			self.assertIn("p.branch = %(branch)s", query)
			self.assertEqual(values["branch"], actor.branch)

	def test_readiness_submit_denies_cross_branch_entertainer(self):
		actor = _actor("Branch Manager")
		with (
			patch("nomad_vip.api.supervisor.require_actor", return_value=actor),
			patch("nomad_vip.api.supervisor.frappe.db.get_value", return_value=frappe._dict({
				"name": "VIP-ENT-NEVA",
				"employee": "HR-EMP-NEVA",
				"branch": "Neva",
				"active": 1,
				"lifecycle_status": "Active",
			})),
			patch("nomad_vip.api.supervisor.frappe.get_doc") as get_doc,
		):
			with self.assertRaises(frappe.PermissionError):
				submit_readiness("VIP-ENT-NEVA", "SHIFT-NEVA", "READY")
			get_doc.assert_not_called()
