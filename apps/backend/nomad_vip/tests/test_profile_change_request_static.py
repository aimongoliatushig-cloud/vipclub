from __future__ import annotations

import ast
import json
from pathlib import Path
from unittest import TestCase


APP_ROOT = Path(__file__).resolve().parents[1]
PROFILE_API = APP_ROOT / "api" / "profile.py"
CORE_PERMISSIONS = APP_ROOT / "permissions" / "core.py"
HOOKS = APP_ROOT / "hooks.py"
DOCTYPE_DIR = APP_ROOT / "nomad_vip" / "doctype" / "vip_entertainer_profile_change_request"


def _function_source(path: Path, name: str) -> str:
	source = path.read_text(encoding="utf-8")
	tree = ast.parse(source)
	node = next(item for item in tree.body if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)) and item.name == name)
	return ast.get_source_segment(source, node) or ""


class TestProfileChangeRequestStaticContract(TestCase):
	def test_doctype_is_append_only_proposal_with_terminal_decision(self):
		definition = json.loads((DOCTYPE_DIR / "vip_entertainer_profile_change_request.json").read_text(encoding="utf-8"))
		fields = {field["fieldname"]: field for field in definition["fields"]}
		self.assertEqual(fields["status"]["options"], "Pending\nApproved\nRejected\nWithdrawn")
		self.assertTrue(fields["idempotency_key"]["unique"])
		self.assertTrue(fields["base_profile_modified"]["reqd"])
		self.assertTrue(fields["changed_fields"]["reqd"])
		for fieldname in (
			"proposed_stage_name",
			"proposed_skills",
			"proposed_languages",
			"proposed_service_tags",
			"proposed_style_tags",
			"proposed_profile_photo",
		):
			self.assertIn(fieldname, fields)
		self.assertFalse(any(permission.get("write") for permission in definition["permissions"]))

	def test_entertainer_submission_does_not_save_master_profile(self):
		source = _function_source(PROFILE_API, "submit_profile_change_request")
		self.assertIn("VIP Entertainer Profile` WHERE name=%s FOR UPDATE", source)
		self.assertIn("REQUEST_DOCTYPE", source)
		self.assertIn(".insert(ignore_permissions=True)", source)
		self.assertNotIn("profile.save(", source)
		self.assertIn("assert_not_stale", source)

	def test_manager_review_has_branch_lock_stale_terminal_and_audit_guards(self):
		source = _function_source(PROFILE_API, "review_profile_change_request")
		for required in (
			"_require_profile_reviewer()",
			"FOR UPDATE",
			"assert_not_stale(doc.doctype, doc.name, expected_modified)",
			'if doc.status != "Pending"',
			"assert_not_stale(profile.doctype, profile.name, doc.base_profile_modified)",
			'action="manager.profile_change.review"',
		):
			self.assertIn(required, source)
		self.assertEqual(source.count("profile.save(ignore_permissions=True)"), 1)

	def test_consent_is_separate_preserves_retention_and_never_revives_old_photo(self):
		source = _function_source(PROFILE_API, "set_media_consent")
		self.assertNotIn("doc.profile_photo = None", source)
		self.assertNotIn("media_retention_file_url", source)
		self.assertIn("doc.media_consent_actor = actor.user", source)
		self.assertIn("doc.media_consent_at = now_datetime()", source)
		self.assertIn("doc.media_consent_version = consent_version", source)

	def test_permissions_and_hooks_scope_the_new_ledger(self):
		permission_source = CORE_PERMISSIONS.read_text(encoding="utf-8")
		hooks_source = HOOKS.read_text(encoding="utf-8")
		self.assertIn("def get_profile_change_request_query_conditions", permission_source)
		self.assertIn("def has_profile_change_request_permission", permission_source)
		self.assertGreaterEqual(hooks_source.count('"VIP Entertainer Profile Change Request"'), 2)
		self.assertIn('{"System Manager", "HR Manager"}', permission_source)

	def test_photo_lifecycle_and_audit_redaction_are_explicit(self):
		source = PROFILE_API.read_text(encoding="utf-8")
		for required in (
			"def _attach_proposed_photo",
			"def _reattach_approved_photo",
			"def _delete_rejected_photo",
			'"attached_to_doctype": REQUEST_DOCTYPE',
			'"attached_to_doctype": "VIP Entertainer Profile"',
			"def _photo_audit_value",
			"_redact_profile_audit(base)",
			"_redact_profile_audit(proposal)",
		):
			self.assertIn(required, source)
