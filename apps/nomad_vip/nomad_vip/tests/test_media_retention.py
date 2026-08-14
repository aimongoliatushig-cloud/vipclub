from __future__ import annotations

from unittest.mock import MagicMock, call, patch

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, get_datetime, today

from nomad_vip.patches.v1_0 import backfill_media_retention_state
from nomad_vip.tasks.media_retention import (
	_owned_private_file,
	_process_locked_profile,
	_profile_reference,
	media_retention_days,
)


class TestMediaRetentionProfile(FrappeTestCase):
	def setUp(self):
		super().setUp()
		frappe.set_user("Administrator")
		company = frappe.db.get_single_value("Global Defaults", "default_company")
		company = company or frappe.db.get_value("Company", {}, "name")
		self.assertTrue(company, "A Company is required for media-retention tests.")
		self.company = company
		self.suffix = frappe.generate_hash(length=8)
		self.branch = frappe.get_doc(
			{"doctype": "Branch", "branch": f"Retention {self.suffix}", "company": company}
		).insert(ignore_permissions=True)
		self.profile = self._make_profile(
			status="Granted",
			photo=f"/private/files/retention-{self.suffix}.png",
		)

	def _make_profile(self, *, status: str, photo: str | None = None):
		employee = frappe.get_doc(
			{
				"doctype": "Employee",
				"first_name": f"Retention {frappe.generate_hash(length=6)}",
				"gender": "Female",
				"date_of_birth": "2000-01-01",
				"date_of_joining": today(),
				"company": self.company,
				"branch": self.branch.name,
				"status": "Active",
			}
		).insert(ignore_permissions=True)
		values = {
			"doctype": "VIP Entertainer Profile",
			"employee": employee.name,
			"stage_name": f"Stage {frappe.generate_hash(length=6)}",
			"media_consent_status": status,
			"active": 1,
		}
		if status == "Granted":
			values.update(
				{
					"media_consent_version": "retention-test-v1",
					"media_consent_expires_on": add_days(today(), 60),
					"profile_photo": photo,
				}
			)
		return frappe.get_doc(values).insert(ignore_permissions=True)

	def tearDown(self):
		frappe.set_user("Administrator")
		super().tearDown()

	def test_denial_hides_and_queues_media_while_regrant_keeps_retention(self):
		original_photo = self.profile.profile_photo
		self.profile.media_consent_status = "Denied"
		self.profile.save(ignore_permissions=True)
		self.assertFalse(self.profile.profile_photo)
		self.assertEqual(self.profile.media_retention_file_url, original_photo)
		self.assertEqual(self.profile.media_retention_status, "Queued")
		self.assertEqual(
			str(self.profile.media_retention_due_on),
			str(add_days(today(), media_retention_days())),
		)
		self.assertIsNone(self.profile.media_retention_completed_at)

		self.profile.media_consent_status = "Granted"
		self.profile.media_consent_version = "retention-test-v2"
		self.profile.media_consent_expires_on = add_days(today(), 90)
		self.profile.save(ignore_permissions=True)
		self.assertFalse(self.profile.profile_photo)
		self.assertEqual(self.profile.media_retention_file_url, original_photo)
		self.assertEqual(self.profile.media_retention_status, "Queued")
		self.assertEqual(
			str(self.profile.media_retention_due_on),
			str(add_days(today(), media_retention_days())),
		)
		self.assertIsNone(self.profile.media_retention_completed_at)

	def test_legal_hold_pauses_queue_and_release_resumes_it(self):
		self.profile.media_consent_status = "Revoked"
		self.profile.media_legal_hold = 1
		self.profile.save(ignore_permissions=True)
		self.assertFalse(self.profile.profile_photo)
		self.assertTrue(self.profile.media_retention_file_url)
		self.assertEqual(self.profile.media_retention_status, "On Hold")
		due_on = self.profile.media_retention_due_on

		self.profile.media_legal_hold = 0
		self.profile.save(ignore_permissions=True)
		self.assertEqual(self.profile.media_retention_status, "Queued")
		self.assertEqual(self.profile.media_retention_due_on, due_on)

	def test_different_approved_photo_can_coexist_but_retained_photo_cannot_revive(self):
		self.profile.media_consent_status = "Denied"
		self.profile.save(ignore_permissions=True)
		retained_photo = self.profile.media_retention_file_url

		self.profile.media_consent_status = "Granted"
		self.profile.media_consent_version = "retention-test-v2"
		self.profile.media_consent_expires_on = add_days(today(), 90)
		self.profile.profile_photo = "/private/files/new-photo.png"
		self.profile.save(ignore_permissions=True)
		self.assertEqual(self.profile.profile_photo, "/private/files/new-photo.png")
		self.assertEqual(self.profile.media_retention_file_url, retained_photo)
		self.assertEqual(self.profile.media_retention_status, "Queued")

		self.profile.profile_photo = retained_photo
		with self.assertRaises(frappe.ValidationError):
			self.profile.save(ignore_permissions=True)

	def test_deleted_state_survives_regranted_profile_save(self):
		self.profile.media_consent_status = "Denied"
		self.profile.save(ignore_permissions=True)
		self.profile.media_consent_status = "Granted"
		self.profile.media_consent_version = "retention-test-v2"
		self.profile.media_consent_expires_on = add_days(today(), 90)
		self.profile.save(ignore_permissions=True)

		self.profile.media_retention_file_url = None
		self.profile.media_retention_status = "Deleted"
		self.profile.media_retention_completed_at = get_datetime(f"{today()} 22:00:00")
		self.profile.save(ignore_permissions=True)
		self.assertEqual(self.profile.media_retention_status, "Deleted")
		self.assertTrue(self.profile.media_retention_completed_at)

	def test_same_status_consent_metadata_change_records_actor_and_time(self):
		recorded_at = get_datetime(f"{today()} 21:15:00")
		self.profile.media_consent_note = "Updated consent scope"
		with patch(
			"nomad_vip.nomad_vip.doctype.vip_entertainer_profile.vip_entertainer_profile.now_datetime",
			return_value=recorded_at,
		):
			self.profile.save(ignore_permissions=True)
		self.assertEqual(self.profile.media_consent_actor, "Administrator")
		self.assertEqual(get_datetime(self.profile.media_consent_at), recorded_at)

	def test_expiry_cannot_precede_recorded_grant(self):
		self.profile.media_consent_expires_on = add_days(today(), -1)
		self.profile.media_consent_note = "Invalid expiry test"
		with self.assertRaises(frappe.ValidationError):
			self.profile.save(ignore_permissions=True)

	def test_pending_profile_does_not_claim_a_consent_actor(self):
		pending = self._make_profile(status="Pending")
		self.assertFalse(pending.media_consent_actor)
		self.assertFalse(pending.media_consent_at)

	def test_retention_fields_are_restricted_to_system_and_hr(self):
		meta = frappe.get_meta("VIP Entertainer Profile")
		retention_fields = {
			"media_retention_file_url",
			"media_retention_status",
			"media_retention_due_on",
			"media_retention_completed_at",
			"media_legal_hold",
		}
		for fieldname in retention_fields:
			self.assertEqual(meta.get_field(fieldname).permlevel, 2)
		self.assertFalse(meta.get_field("media_legal_hold").read_only)
		for fieldname in retention_fields - {"media_legal_hold"}:
			self.assertTrue(meta.get_field(fieldname).read_only)
		roles = {
			permission.role
			for permission in meta.permissions
			if permission.permlevel == 2 and permission.read and permission.write
		}
		self.assertEqual(roles, {"System Manager", "HR Manager"})


class TestMediaRetentionTask(FrappeTestCase):
	def test_retention_days_default_and_clamp(self):
		self.assertEqual(media_retention_days({}), 30)
		self.assertEqual(media_retention_days({"vip_media_retention_days": -50}), 1)
		self.assertEqual(media_retention_days({"vip_media_retention_days": 5000}), 365)
		self.assertEqual(media_retention_days({"vip_media_retention_days": "invalid"}), 30)

	def test_private_file_must_be_dedicated_to_exact_profile(self):
		profile = frappe._dict(
			doctype="VIP Entertainer Profile",
			name="opaque-profile",
			profile_photo=None,
			media_retention_file_url="/private/files/photo.png",
		)
		owned = frappe._dict(
			name="opaque-file",
			is_private=1,
			attached_to_doctype=profile.doctype,
			attached_to_name=profile.name,
			attached_to_field="profile_photo",
		)
		with (
			patch("nomad_vip.tasks.media_retention.frappe.get_all", return_value=[owned]),
			patch("nomad_vip.tasks.media_retention.frappe.db.count", return_value=0),
		):
			self.assertEqual(_owned_private_file(profile), owned)

		public = frappe._dict(owned)
		public.is_private = 0
		with patch("nomad_vip.tasks.media_retention.frappe.get_all", return_value=[public]):
			self.assertIsNone(_owned_private_file(profile))

		with (
			patch("nomad_vip.tasks.media_retention.frappe.get_all", return_value=[owned]),
			patch("nomad_vip.tasks.media_retention.frappe.db.count", return_value=1),
		):
			self.assertIsNone(_owned_private_file(profile))

		profile.profile_photo = profile.media_retention_file_url
		with patch("nomad_vip.tasks.media_retention.frappe.get_all") as get_all:
			self.assertIsNone(_owned_private_file(profile))
		get_all.assert_not_called()

	def test_due_queue_deletes_reference_and_appends_audit(self):
		profile = frappe._dict(
			doctype="VIP Entertainer Profile",
			name="opaque-profile",
			media_consent_status="Denied",
			media_consent_at=get_datetime(f"{today()} 09:00:00"),
			media_legal_hold=0,
			media_retention_status="Queued",
			media_retention_due_on=today(),
			media_retention_completed_at=None,
			profile_photo="/private/files/current-visible.png",
			media_retention_file_url="/private/files/photo.png",
		)
		profile.save = MagicMock()
		with (
			patch("nomad_vip.tasks.media_retention.frappe.db.sql", return_value=[[profile.name]]),
			patch("nomad_vip.tasks.media_retention.frappe.get_doc", return_value=profile),
			patch("nomad_vip.tasks.media_retention._delete_owned_private_file", return_value=True) as delete_file,
			patch("nomad_vip.tasks.media_retention._append_retention_audit") as append_audit,
		):
			self.assertEqual(_process_locked_profile(profile.name), "deleted")
		delete_file.assert_called_once_with(profile)
		self.assertEqual(profile.profile_photo, "/private/files/current-visible.png")
		self.assertIsNone(profile.media_retention_file_url)
		self.assertEqual(profile.media_retention_status, "Deleted")
		self.assertTrue(profile.media_retention_completed_at)
		profile.save.assert_called_once_with(ignore_permissions=True)
		append_audit.assert_called_once_with(profile, file_deleted=True)

	def test_legal_hold_is_never_deleted(self):
		profile = frappe._dict(
			doctype="VIP Entertainer Profile",
			name="opaque-held",
			media_consent_status="Denied",
			media_legal_hold=1,
			media_retention_status="Queued",
			media_retention_due_on=today(),
			profile_photo=None,
			media_retention_file_url="/private/files/photo.png",
		)
		with (
			patch("nomad_vip.tasks.media_retention.frappe.db.sql", return_value=[[profile.name]]),
			patch("nomad_vip.tasks.media_retention.frappe.get_doc", return_value=profile),
			patch("nomad_vip.tasks.media_retention._delete_owned_private_file") as delete_file,
		):
			self.assertEqual(_process_locked_profile(profile.name), "held")
		delete_file.assert_not_called()

	def test_regranted_retained_media_is_still_deleted_when_due(self):
		profile = frappe._dict(
			doctype="VIP Entertainer Profile",
			name="opaque-regranted",
			media_consent_status="Granted",
			media_consent_at=get_datetime(f"{today()} 09:00:00"),
			media_legal_hold=0,
			media_retention_status="Queued",
			media_retention_due_on=today(),
			media_retention_completed_at=None,
			profile_photo=None,
			media_retention_file_url="/private/files/old-photo.png",
		)
		profile.save = MagicMock()
		with (
			patch("nomad_vip.tasks.media_retention.frappe.db.sql", return_value=[[profile.name]]),
			patch("nomad_vip.tasks.media_retention.frappe.get_doc", return_value=profile),
			patch("nomad_vip.tasks.media_retention._delete_owned_private_file", return_value=True),
			patch("nomad_vip.tasks.media_retention._append_retention_audit"),
		):
			self.assertEqual(_process_locked_profile(profile.name), "deleted")
		self.assertIsNone(profile.media_retention_file_url)
		self.assertEqual(profile.media_retention_status, "Deleted")

	def test_audit_reference_does_not_contain_profile_identifier(self):
		identifier = "employee-personal-identifier"
		reference = _profile_reference(identifier)
		self.assertNotIn(identifier, reference)
		self.assertEqual(len(reference), 20)

	def test_backfill_is_idempotent_for_existing_queue(self):
		to_queue = frappe._dict(
			name="queue-me",
			profile_photo="/private/files/legacy.png",
			media_retention_file_url=None,
			media_legal_hold=0,
			media_retention_status="Not Queued",
			media_retention_due_on=None,
		)
		already_queued = frappe._dict(
			name="already-queued",
			profile_photo=None,
			media_retention_file_url="/private/files/already.png",
			media_legal_hold=0,
			media_retention_status="Queued",
			media_retention_due_on=add_days(today(), 30),
		)
		granted = frappe._dict(
			name="granted-profile",
			media_retention_file_url=None,
			media_legal_hold=0,
			media_retention_status="Queued",
			media_retention_due_on=today(),
		)
		granted_retained = frappe._dict(
			name="granted-retained",
			media_retention_file_url="/private/files/retained.png",
			media_legal_hold=0,
			media_retention_status="Queued",
			media_retention_due_on=add_days(today(), 30),
		)
		with (
			patch(
				"nomad_vip.patches.v1_0.backfill_media_retention_state.frappe.get_all",
				side_effect=[[to_queue, already_queued], [granted, granted_retained]],
			),
			patch(
				"nomad_vip.patches.v1_0.backfill_media_retention_state.frappe.db.set_value"
			) as set_value,
			patch("nomad_vip.patches.v1_0.backfill_media_retention_state.frappe.logger"),
		):
			backfill_media_retention_state.execute()
		self.assertEqual(set_value.call_count, 2)
		self.assertEqual(set_value.call_args_list[0].args[:2], ("VIP Entertainer Profile", "queue-me"))
		self.assertEqual(set_value.call_args_list[1], call(
			"VIP Entertainer Profile",
			granted.name,
			{
				"media_retention_status": "Not Queued",
				"media_retention_due_on": None,
				"media_retention_completed_at": None,
			},
			update_modified=False,
		))
