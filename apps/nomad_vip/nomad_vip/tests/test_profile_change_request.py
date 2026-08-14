from __future__ import annotations

from unittest import TestCase
from unittest.mock import MagicMock, patch

import frappe

from nomad_vip.api.profile import (
	REQUEST_DOCTYPE,
	_assert_photo_is_not_retained,
	_attach_proposed_photo,
	_delete_rejected_photo,
	_reattach_approved_photo,
	_require_profile_reviewer,
	review_profile_change_request,
	set_media_consent,
	submit_profile_change_request,
)
from nomad_vip.api.security import ActorContext


def _actor(role="Entertainer", branch="Sapphire", profile="ENT-1"):
	return ActorContext(
		user=f"{role.lower().replace(' ', '.')}@example.test",
		roles=frozenset({role}),
		role=role,
		branch=branch,
		profile=profile,
	)


def _master_profile():
	doc = MagicMock()
	values = {
		"stage_name": "Ану",
		"skills": "Dance",
		"languages": "Монгол",
		"service_tags": "VIP room",
		"style_tags": "Дэгжин",
		"profile_photo": "",
	}
	doc.name = "ENT-1"
	doc.doctype = "VIP Entertainer Profile"
	doc.employee = "EMP-1"
	doc.user = "entertainer@example.test"
	doc.branch = "Sapphire"
	doc.active = 1
	doc.lifecycle_status = "Active"
	doc.media_consent_status = "Granted"
	doc.media_consent_version = "consent-v1"
	doc.modified = "2026-08-12 09:00:00.000000"
	for key, value in values.items():
		setattr(doc, key, value)
	doc.get.side_effect = lambda key: getattr(doc, key, None)
	doc.set.side_effect = lambda key, value: setattr(doc, key, value)
	return doc


def _request_doc(*, status="Pending"):
	doc = MagicMock()
	doc.name = "PCR-1"
	doc.doctype = REQUEST_DOCTYPE
	doc.entertainer = "ENT-1"
	doc.employee = "EMP-1"
	doc.branch = "Sapphire"
	doc.status = status
	doc.requested_by = "entertainer@example.test"
	doc.requested_at = "2026-08-12 09:05:00"
	doc.base_profile_modified = "2026-08-12 09:00:00.000000"
	doc.base_values = "{}"
	doc.changed_fields = "stage_name"
	doc.proposed_stage_name = "Ану шинэ"
	doc.proposed_skills = "Dance"
	doc.proposed_languages = "Монгол"
	doc.proposed_service_tags = "VIP room"
	doc.proposed_style_tags = "Дэгжин"
	doc.proposed_profile_photo = ""
	doc.modified = "2026-08-12 09:05:00.000000"
	doc.decided_by = None
	doc.decided_at = None
	doc.decision_reason = None
	doc.applied_profile_modified = None
	doc.get.side_effect = lambda key: getattr(doc, key, None)
	doc.insert.return_value = doc
	return doc


class TestProfileChangeRequestBehaviour(TestCase):
	def test_submit_inserts_request_without_saving_master(self):
		actor = _actor()
		identity = frappe._dict({"name": "ENT-1", "employee": "EMP-1", "branch": "Sapphire"})
		master = _master_profile()
		request = _request_doc()
		created_payload = {}

		def get_doc(value, name=None):
			if isinstance(value, dict):
				created_payload.update(value)
				return request
			return master

		with (
			patch("nomad_vip.api.profile.require_entertainer_profile", return_value=(actor, identity)),
			patch("nomad_vip.api.profile.frappe.db.sql"),
			patch("nomad_vip.api.profile.frappe.get_doc", side_effect=get_doc),
			patch("nomad_vip.api.profile._validate_profile_photo", return_value=""),
			patch("nomad_vip.api.profile._existing_request_for_key", return_value=None),
			patch("nomad_vip.api.profile.assert_not_stale"),
			patch("nomad_vip.api.profile.now_datetime", return_value="2026-08-12 09:12:00"),
			patch("nomad_vip.api.profile.frappe.db.exists", return_value=False),
			patch("nomad_vip.api.profile._profile_payload", return_value={"name": "ENT-1"}),
			patch("nomad_vip.api.profile.record_api_audit") as audit,
			patch("nomad_vip.api.profile.frappe.db.commit"),
		):
			result = submit_profile_change_request(
				stage_name="Ану шинэ",
				skills="Dance",
				languages="Монгол",
				service_tags="VIP room",
				style_tags="Дэгжин",
				expected_modified=master.modified,
				idempotency_key="profile-change:1",
			)

		master.save.assert_not_called()
		request.insert.assert_called_once_with(ignore_permissions=True)
		self.assertEqual(created_payload["employee"], "EMP-1")
		self.assertEqual(created_payload["branch"], "Sapphire")
		self.assertEqual(created_payload["status"], "Pending")
		self.assertEqual(result["profile"], {"name": "ENT-1"})
		audit.assert_called_once()

	def test_reject_is_terminal_without_touching_master(self):
		actor = _actor("Branch Manager", profile=None)
		request = _request_doc()
		with (
			patch("nomad_vip.api.profile.require_actor", return_value=actor),
			patch("nomad_vip.api.profile.frappe.db.sql"),
			patch("nomad_vip.api.profile.frappe.get_doc", return_value=request) as get_doc,
			patch("nomad_vip.api.profile._successful_audit", return_value=None),
			patch("nomad_vip.api.profile.assert_not_stale"),
			patch("nomad_vip.api.profile.now_datetime", return_value="2026-08-12 09:12:00"),
			patch("nomad_vip.api.profile.record_api_audit"),
			patch("nomad_vip.api.profile._profile_payload", return_value={"name": "ENT-1"}),
			patch("nomad_vip.api.profile.frappe.db.commit"),
		):
			result = review_profile_change_request(
				request_name=request.name,
				decision="Rejected",
				reason="Мэдээлэл дутуу байна",
				expected_modified=request.modified,
				idempotency_key="profile-review:1",
			)

		self.assertEqual(request.status, "Rejected")
		request.save.assert_called_once_with(ignore_permissions=True)
		self.assertEqual(get_doc.call_count, 1)
		self.assertFalse(result["replayed"])

	def test_approve_applies_only_declared_changed_fields(self):
		actor = _actor("Branch Manager", profile=None)
		request = _request_doc()
		master = _master_profile()
		with (
			patch("nomad_vip.api.profile.require_actor", return_value=actor),
			patch("nomad_vip.api.profile.frappe.db.sql"),
			patch("nomad_vip.api.profile.frappe.get_doc", side_effect=[request, master]),
			patch("nomad_vip.api.profile._successful_audit", return_value=None),
			patch("nomad_vip.api.profile.assert_not_stale"),
			patch("nomad_vip.api.profile.now_datetime", return_value="2026-08-12 09:12:00"),
			patch("nomad_vip.api.profile._normalized_proposal", return_value={
				"stage_name": "Ану шинэ",
				"skills": "Өөрчлөх ёсгүй",
				"languages": "Өөрчлөх ёсгүй",
				"service_tags": "Өөрчлөх ёсгүй",
				"style_tags": "Өөрчлөх ёсгүй",
				"profile_photo": "",
			}),
			patch("nomad_vip.api.profile.frappe.db.get_value", return_value="2026-08-12 09:10:00.000000"),
			patch("nomad_vip.api.profile.record_api_audit") as audit,
			patch("nomad_vip.api.profile._profile_payload", return_value={"name": "ENT-1"}),
			patch("nomad_vip.api.profile.frappe.db.commit"),
		):
			review_profile_change_request(
				request_name=request.name,
				decision="Approved",
				reason="Мэдээллийг шалгаж зөвшөөрөв",
				expected_modified=request.modified,
				expected_profile_modified=master.modified,
				idempotency_key="profile-review:2",
			)

		master.set.assert_called_once_with("stage_name", "Ану шинэ")
		master.save.assert_called_once_with(ignore_permissions=True)
		self.assertEqual(request.status, "Approved")
		audit.assert_called_once()

	def test_denied_consent_keeps_private_reference_for_retention(self):
		actor = _actor()
		identity = frappe._dict({"name": "ENT-1", "employee": "EMP-1", "branch": "Sapphire"})
		master = _master_profile()
		master.profile_photo = "/private/files/anu.png"
		with (
			patch("nomad_vip.api.profile.require_entertainer_profile", return_value=(actor, identity)),
			patch("nomad_vip.api.profile.frappe.db.sql"),
			patch("nomad_vip.api.profile.frappe.get_doc", return_value=master),
			patch("nomad_vip.api.profile._successful_audit", return_value=None),
			patch("nomad_vip.api.profile.assert_not_stale"),
			patch("nomad_vip.api.profile.now_datetime", return_value="2026-08-12 09:12:00"),
			patch("nomad_vip.api.profile.record_api_audit"),
			patch("nomad_vip.api.profile._profile_payload", return_value={"name": "ENT-1", "profile_photo": None}),
			patch("nomad_vip.api.profile.frappe.db.commit"),
		):
			set_media_consent(
				status="Denied",
				consent_version="self-service-v2",
				expected_modified=master.modified,
				idempotency_key="consent:1",
			)

		self.assertEqual(master.profile_photo, "/private/files/anu.png")
		self.assertEqual(master.media_consent_status, "Denied")
		self.assertEqual(master.media_consent_actor, actor.user)
		master.save.assert_called_once_with(ignore_permissions=True)

	def test_regrant_keeps_old_retention_reference_and_does_not_restore_it(self):
		actor = _actor()
		identity = frappe._dict({"name": "ENT-1", "employee": "EMP-1", "branch": "Sapphire"})
		master = _master_profile()
		master.media_consent_status = "Revoked"
		master.profile_photo = ""
		master.media_retention_file_url = "/private/files/old.png"
		with (
			patch("nomad_vip.api.profile.require_entertainer_profile", return_value=(actor, identity)),
			patch("nomad_vip.api.profile.frappe.db.sql"),
			patch("nomad_vip.api.profile.frappe.get_doc", return_value=master),
			patch("nomad_vip.api.profile._successful_audit", return_value=None),
			patch("nomad_vip.api.profile.assert_not_stale"),
			patch("nomad_vip.api.profile.now_datetime", return_value="2026-08-12 09:12:00"),
			patch("nomad_vip.api.profile.record_api_audit"),
			patch("nomad_vip.api.profile._profile_payload", return_value={"name": "ENT-1", "profile_photo": None}),
			patch("nomad_vip.api.profile.frappe.db.commit"),
		):
			set_media_consent(
				status="Granted",
				consent_version="self-service-v3",
				expected_modified=master.modified,
				idempotency_key="consent:regrant",
			)

		self.assertEqual(master.media_consent_status, "Granted")
		self.assertEqual(master.profile_photo, "")
		self.assertEqual(master.media_retention_file_url, "/private/files/old.png")

	def test_only_the_retained_url_is_blocked_as_a_new_active_photo(self):
		master = _master_profile()
		master.media_retention_file_url = "/private/files/old.png"
		_assert_photo_is_not_retained(master, "/private/files/new.png")

	def test_request_photo_is_attached_then_reassigned_to_profile(self):
		unattached = frappe._dict({
			"name": "FILE-1",
			"owner": "entertainer@example.test",
			"is_private": 1,
			"attached_to_doctype": "",
			"attached_to_name": "",
			"attached_to_field": "",
		})
		request_attachment = frappe._dict({
			**unattached,
			"attached_to_doctype": REQUEST_DOCTYPE,
			"attached_to_name": "PCR-1",
			"attached_to_field": "proposed_profile_photo",
		})
		with (
			patch("nomad_vip.api.profile._photo_file", side_effect=[unattached, unattached, request_attachment, request_attachment]),
			patch("nomad_vip.api.profile.frappe.db.sql"),
			patch("nomad_vip.api.profile.frappe.db.count", return_value=0),
			patch("nomad_vip.api.profile.frappe.db.set_value") as set_value,
		):
			_attach_proposed_photo(
				"/private/files/anu.png",
				request_name="PCR-1",
				owner="entertainer@example.test",
			)
			_reattach_approved_photo(
				"/private/files/anu.png",
				request_name="PCR-1",
				owner="entertainer@example.test",
				profile_name="ENT-1",
			)

		self.assertEqual(set_value.call_count, 2)
		self.assertEqual(set_value.call_args_list[0].args[:2], ("File", "FILE-1"))
		self.assertEqual(set_value.call_args_list[0].args[2]["attached_to_doctype"], REQUEST_DOCTYPE)
		self.assertEqual(set_value.call_args_list[1].args[2]["attached_to_doctype"], "VIP Entertainer Profile")
		self.assertEqual(set_value.call_args_list[1].args[2]["attached_to_field"], "profile_photo")

	def test_rejected_request_deletes_only_its_dedicated_private_photo(self):
		row = frappe._dict({
			"name": "FILE-1",
			"owner": "entertainer@example.test",
			"is_private": 1,
			"attached_to_doctype": REQUEST_DOCTYPE,
			"attached_to_name": "PCR-1",
			"attached_to_field": "proposed_profile_photo",
		})
		file_doc = MagicMock()
		with (
			patch("nomad_vip.api.profile.frappe.get_all", return_value=[row]),
			patch("nomad_vip.api.profile.frappe.db.get_value", return_value=row),
			patch("nomad_vip.api.profile.frappe.db.sql"),
			patch("nomad_vip.api.profile.frappe.db.count", return_value=0),
			patch("nomad_vip.api.profile.frappe.get_doc", return_value=file_doc),
		):
			deleted = _delete_rejected_photo(
				"/private/files/anu.png",
				request_name="PCR-1",
				owner="entertainer@example.test",
			)

		self.assertTrue(deleted)
		file_doc.delete.assert_called_once_with(ignore_permissions=True)

	def test_system_manager_review_scope_is_global_without_branch(self):
		actor = _actor("System Manager", branch=None, profile=None)
		with patch("nomad_vip.api.profile.require_actor", return_value=actor):
			resolved, global_scope = _require_profile_reviewer()
		self.assertIs(resolved, actor)
		self.assertTrue(global_scope)

	def test_hr_manager_can_reject_a_cross_branch_request(self):
		actor = _actor("HR Manager", branch="Sapphire", profile=None)
		request = _request_doc()
		request.branch = "Neva"
		with (
			patch("nomad_vip.api.profile.require_actor", return_value=actor),
			patch("nomad_vip.api.profile.frappe.db.sql"),
			patch("nomad_vip.api.profile.frappe.get_doc", return_value=request),
			patch("nomad_vip.api.profile._successful_audit", return_value=None),
			patch("nomad_vip.api.profile.assert_not_stale"),
			patch("nomad_vip.api.profile.now_datetime", return_value="2026-08-12 09:12:00"),
			patch("nomad_vip.api.profile.record_api_audit"),
			patch("nomad_vip.api.profile._profile_payload", return_value={"name": "ENT-1"}),
			patch("nomad_vip.api.profile.frappe.db.commit"),
		):
			result = review_profile_change_request(
				request_name=request.name,
				decision="Rejected",
				reason="Мэдээлэл дутуу байна",
				expected_modified=request.modified,
				idempotency_key="profile-review:cross-branch",
			)

		self.assertEqual(request.status, "Rejected")
		self.assertFalse(result["replayed"])
