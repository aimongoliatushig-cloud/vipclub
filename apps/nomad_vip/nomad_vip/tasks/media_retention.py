from __future__ import annotations

import hashlib
import json

import frappe
from frappe.utils import cint, getdate, now_datetime, today


MEDIA_RETENTION_CONFIG_KEY = "vip_media_retention_days"
MEDIA_RETENTION_DEFAULT_DAYS = 30
MEDIA_RETENTION_MIN_DAYS = 1
MEDIA_RETENTION_MAX_DAYS = 365
MEDIA_RETENTION_ACTION = "media.retention.delete"
MEDIA_RETENTION_VERSION = "media-retention-v1"


def media_retention_days(config=None) -> int:
	"""Return configured retention days, defaulting to 30 and clamped to 1–365."""
	config = frappe.conf if config is None else config
	raw_value = config.get(MEDIA_RETENTION_CONFIG_KEY, MEDIA_RETENTION_DEFAULT_DAYS)
	try:
		value = int(raw_value)
	except (TypeError, ValueError):
		value = MEDIA_RETENTION_DEFAULT_DAYS
	return max(MEDIA_RETENTION_MIN_DAYS, min(MEDIA_RETENTION_MAX_DAYS, value))


def _profile_reference(profile_name: str) -> str:
	"""Return a non-identifying correlation token suitable for operational logs."""
	return hashlib.sha256(str(profile_name).encode("utf-8")).hexdigest()[:20]


def _owned_private_file(profile):
	"""Return one dedicated private File record, never a shared/public attachment."""
	file_url = (profile.media_retention_file_url or "").strip()
	if not file_url:
		return None
	if (profile.profile_photo or "").strip() == file_url:
		return None
	rows = frappe.get_all(
		"File",
		filters={"file_url": file_url},
		fields=[
			"name",
			"is_private",
			"attached_to_doctype",
			"attached_to_name",
			"attached_to_field",
		],
		limit_page_length=2,
		ignore_permissions=True,
	)
	if len(rows) != 1:
		return None
	row = rows[0]
	if not cint(row.is_private):
		return None
	if row.attached_to_doctype != profile.doctype or row.attached_to_name != profile.name:
		return None
	if row.attached_to_field not in (None, "", "profile_photo", "media_retention_file_url"):
		return None
	other_profile_references = frappe.db.count(
		"VIP Entertainer Profile",
		{"profile_photo": file_url, "name": ["!=", profile.name]},
	)
	other_retention_references = frappe.db.count(
		"VIP Entertainer Profile",
		{"media_retention_file_url": file_url, "name": ["!=", profile.name]},
	)
	return None if other_profile_references or other_retention_references else row


def _delete_owned_private_file(profile) -> bool:
	row = _owned_private_file(profile)
	if not row:
		return False
	frappe.get_doc("File", row.name).delete(ignore_permissions=True)
	return True


def _append_retention_audit(profile, *, file_deleted: bool) -> None:
	if not frappe.db.exists("DocType", "VIP API Audit Event"):
		return
	profile_ref = _profile_reference(profile.name)
	cycle_material = "|".join(
		(
			str(profile.name),
			str(profile.media_consent_at or ""),
			str(profile.media_retention_due_on or ""),
		)
	)
	cycle_ref = hashlib.sha256(cycle_material.encode("utf-8")).hexdigest()[:20]
	idempotency_key = f"media-retention:{cycle_ref}"
	if frappe.db.exists(
		"VIP API Audit Event",
		{"action": MEDIA_RETENTION_ACTION, "idempotency_key": idempotency_key, "outcome": "Succeeded"},
	):
		return
	frappe.get_doc(
		{
			"doctype": "VIP API Audit Event",
			"actor": "Administrator",
			"actor_role": "System",
			"action": MEDIA_RETENTION_ACTION,
			"outcome": "Succeeded",
			"target_doctype": "VIP Entertainer Profile",
			"idempotency_key": idempotency_key,
			"api_version": MEDIA_RETENTION_VERSION,
			"occurred_at": now_datetime(),
			"details": json.dumps(
				{
					"profile_ref": profile_ref,
					"file_deleted": bool(file_deleted),
					"retention_reference_cleared": True,
				},
				ensure_ascii=False,
				sort_keys=True,
			),
		}
	).insert(ignore_permissions=True)


def _process_locked_profile(profile_name: str) -> str:
	locked = frappe.db.sql(
		"SELECT name FROM `tabVIP Entertainer Profile` WHERE name=%s FOR UPDATE",
		(profile_name,),
	)
	if not locked:
		return "missing"
	profile = frappe.get_doc("VIP Entertainer Profile", profile_name)
	if profile.media_legal_hold:
		return "held"
	if profile.media_retention_status != "Queued" or not profile.media_retention_due_on:
		return "not_queued"
	if getdate(profile.media_retention_due_on) > getdate(today()):
		return "not_due"

	file_deleted = _delete_owned_private_file(profile)
	profile.media_retention_file_url = None
	profile.media_retention_status = "Deleted"
	profile.media_retention_completed_at = now_datetime()
	profile.save(ignore_permissions=True)
	_append_retention_audit(profile, file_deleted=file_deleted)
	return "deleted"


def process_due_media_retention(batch_size=100) -> dict[str, int]:
	"""Delete due media in small locked transactions and return aggregate evidence only."""
	limit = max(1, min(500, cint(batch_size) or 100))
	names = frappe.get_all(
		"VIP Entertainer Profile",
		filters={
			"media_retention_status": ["in", ["Queued", "On Hold"]],
			"media_retention_due_on": ["<=", today()],
		},
		pluck="name",
		order_by="media_retention_due_on asc, name asc",
		limit_page_length=limit,
		ignore_permissions=True,
	)
	result = {
		"selected": len(names),
		"deleted": 0,
		"held": 0,
		"skipped": 0,
		"failed": 0,
	}
	for profile_name in names:
		try:
			outcome = _process_locked_profile(profile_name)
			if outcome == "deleted":
				result["deleted"] += 1
				frappe.db.commit()
			else:
				result[outcome if outcome == "held" else "skipped"] += 1
				frappe.db.rollback()
		except Exception:
			frappe.db.rollback()
			result["failed"] += 1

	frappe.logger("nomad_vip.media_retention").info(
		json.dumps({"event": "media_retention.completed", **result}, sort_keys=True)
	)
	return result
