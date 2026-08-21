from __future__ import annotations

import hashlib
import json
from pathlib import PurePosixPath

import frappe
from frappe import _
from frappe.utils import cint, now_datetime
from frappe.utils.password import check_password, update_password

from nomad_vip.api.entertainer import PROFILE_FIELDS
from nomad_vip.api.security import (
	assert_not_stale,
	can_project_media,
	normalize_idempotency_key,
	page_meta,
	page_window,
	record_api_audit,
	require_actor,
	require_entertainer_profile,
)


REQUEST_DOCTYPE = "VIP Entertainer Profile Change Request"
EDITABLE_FIELDS = ("stage_name", "skills", "languages", "service_tags", "style_tags", "profile_photo")
PROPOSED_FIELD_MAP = {field: f"proposed_{field}" for field in EDITABLE_FIELDS}
CONSENT_STATUSES = {"Granted", "Denied", "Revoked"}
REQUEST_STATUSES = {"Pending", "Approved", "Rejected", "Withdrawn"}
IMAGE_FILE_TYPES = {"JPG", "JPEG", "PNG", "WEBP"}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024
GLOBAL_REVIEW_ROLES = {"System Manager", "HR Manager"}
REQUEST_FIELDS = [
	"name",
	"entertainer",
	"employee",
	"branch",
	"status",
	"requested_by",
	"requested_at",
	"base_profile_modified",
	"base_values",
	"changed_fields",
	*PROPOSED_FIELD_MAP.values(),
	"decided_by",
	"decided_at",
	"decision_reason",
	"applied_profile_modified",
	"modified",
]
REQUEST_INTERNAL_FIELDS = [*REQUEST_FIELDS, "idempotency_key"]


@frappe.whitelist(methods=["POST"])
def change_own_password(current_password, new_password):
	actor = require_actor()
	current_password = str(current_password or "")
	new_password = str(new_password or "")
	if not current_password:
		frappe.throw(_("Одоогийн нууц үгээ оруулна уу."), frappe.ValidationError)
	if (
		len(new_password) < 10
		or not any(character.isalpha() for character in new_password)
		or not any(character.isdigit() for character in new_password)
	):
		frappe.throw(
			_("Шинэ нууц үг 10-аас доошгүй тэмдэгт, үсэг болон тоо агуулна."),
			frappe.ValidationError,
		)
	if current_password == new_password:
		frappe.throw(_("Шинэ нууц үг одоогийнхоос өөр байна."), frappe.ValidationError)
	try:
		check_password(actor.user, current_password)
	except frappe.AuthenticationError:
		frappe.throw(_("Одоогийн нууц үг буруу байна."), frappe.AuthenticationError)
	update_password(actor.user, new_password)
	record_api_audit(
		actor=actor,
		action="account.password.change",
		target_doctype="User",
		target_name=actor.user,
	)
	frappe.db.commit()
	return {"changed": True}


def _profile_payload(profile_name: str):
	profile = frappe.db.get_value("VIP Entertainer Profile", profile_name, PROFILE_FIELDS, as_dict=True)
	if not profile:
		frappe.throw(_("Бүжигчний профайл олдсонгүй."), frappe.DoesNotExistError)
	if not can_project_media(profile):
		profile.profile_photo = None
	return profile


def _normalize_lines(value, label: str) -> str:
	items = []
	seen = set()
	for raw in str(value or "").replace(",", "\n").splitlines():
		item = raw.strip()
		key = item.casefold()
		if not item or key in seen:
			continue
		if len(item) > 80:
			frappe.throw(_("{0}: нэг утга 80 тэмдэгтээс урт байж болохгүй.").format(label), frappe.ValidationError)
		seen.add(key)
		items.append(item)
	if len(items) > 20:
		frappe.throw(_("{0}: 20-оос олон утга оруулах боломжгүй.").format(label), frappe.ValidationError)
	return "\n".join(items)


def _photo_file(file_url: str, actor_user: str):
	rows = frappe.get_all(
		"File",
		filters={"file_url": file_url},
		fields=[
			"name",
			"owner",
			"file_name",
			"file_size",
			"file_type",
			"is_private",
			"attached_to_doctype",
			"attached_to_name",
			"attached_to_field",
		],
		limit_page_length=2,
		ignore_permissions=True,
	)
	if len(rows) != 1 or rows[0].owner != actor_user:
		frappe.throw(_("Таны байршуулсан зураг олдсонгүй."), frappe.PermissionError)
	file_row = rows[0]
	if not cint(file_row.is_private):
		frappe.throw(_("Профайлын зургийг хувийн файл хэлбэрээр байршуулна уу."), frappe.PermissionError)
	return file_row


def _validate_profile_photo(file_url: str, actor_user: str, current_photo: str | None) -> str:
	file_url = (file_url or "").strip()
	if not file_url:
		return ""
	if file_url == (current_photo or ""):
		return file_url
	file_row = _photo_file(file_url, actor_user)
	extension = PurePosixPath(file_row.file_name or file_url).suffix.lower()
	if (file_row.file_type or "").upper() not in IMAGE_FILE_TYPES or extension not in IMAGE_EXTENSIONS:
		frappe.throw(_("Зөвхөн JPG, PNG эсвэл WEBP зураг ашиглана уу."), frappe.ValidationError)
	if int(file_row.file_size or 0) > MAX_IMAGE_BYTES:
		frappe.throw(_("Профайлын зураг 5 МБ-аас ихгүй байна."), frappe.ValidationError)
	return file_url


def _lock_photo_file(file_name: str) -> None:
	frappe.db.sql("SELECT name FROM `tabFile` WHERE name=%s FOR UPDATE", (file_name,))


def _photo_has_other_references(file_url: str, *, request_name: str | None = None, profile_name: str | None = None) -> bool:
	request_filters = {"proposed_profile_photo": file_url}
	profile_filters = {"profile_photo": file_url}
	if request_name:
		request_filters["name"] = ["!=", request_name]
	if profile_name:
		profile_filters["name"] = ["!=", profile_name]
	return bool(
		frappe.db.count(REQUEST_DOCTYPE, request_filters)
		or frappe.db.count("VIP Entertainer Profile", profile_filters)
		or frappe.db.count("VIP Entertainer Profile", {"media_retention_file_url": file_url})
	)


def _attach_proposed_photo(file_url: str, *, request_name: str, owner: str) -> None:
	if not file_url:
		return
	row = _photo_file(file_url, owner)
	_lock_photo_file(row.name)
	row = _photo_file(file_url, owner)
	attachment = (row.attached_to_doctype or "", row.attached_to_name or "", row.attached_to_field or "")
	allowed = {
		("", "", ""),
		(REQUEST_DOCTYPE, request_name, ""),
		(REQUEST_DOCTYPE, request_name, "proposed_profile_photo"),
	}
	if attachment not in allowed or _photo_has_other_references(file_url, request_name=request_name):
		frappe.throw(_("Энэ зураг өөр бүртгэлд ашиглагдаж байгаа тул хүсэлтэд хавсаргах боломжгүй."), frappe.PermissionError)
	frappe.db.set_value(
		"File",
		row.name,
		{
			"attached_to_doctype": REQUEST_DOCTYPE,
			"attached_to_name": request_name,
			"attached_to_field": "proposed_profile_photo",
		},
		update_modified=False,
	)


def _reattach_approved_photo(file_url: str, *, request_name: str, owner: str, profile_name: str) -> None:
	if not file_url:
		return
	row = _photo_file(file_url, owner)
	_lock_photo_file(row.name)
	row = _photo_file(file_url, owner)
	if (
		row.attached_to_doctype != REQUEST_DOCTYPE
		or row.attached_to_name != request_name
		or row.attached_to_field not in (None, "", "proposed_profile_photo")
		or _photo_has_other_references(file_url, request_name=request_name, profile_name=profile_name)
	):
		frappe.throw(_("Хүсэлтийн зураг тусдаа, баталгаатай файл биш байна."), frappe.PermissionError)
	frappe.db.set_value(
		"File",
		row.name,
		{
			"attached_to_doctype": "VIP Entertainer Profile",
			"attached_to_name": profile_name,
			"attached_to_field": "profile_photo",
		},
		update_modified=False,
	)


def _delete_rejected_photo(file_url: str, *, request_name: str, owner: str) -> bool:
	if not file_url:
		return False
	rows = frappe.get_all(
		"File",
		filters={"file_url": file_url},
		fields=["name", "owner", "is_private", "attached_to_doctype", "attached_to_name", "attached_to_field"],
		limit_page_length=2,
		ignore_permissions=True,
	)
	if len(rows) != 1:
		return False
	row = rows[0]
	_lock_photo_file(row.name)
	row = frappe.db.get_value(
		"File",
		row.name,
		["name", "owner", "is_private", "attached_to_doctype", "attached_to_name", "attached_to_field"],
		as_dict=True,
	)
	if not row or row.owner != owner or not cint(row.is_private):
		return False
	if (
		row.attached_to_doctype != REQUEST_DOCTYPE
		or row.attached_to_name != request_name
		or row.attached_to_field not in (None, "", "proposed_profile_photo")
		or _photo_has_other_references(file_url, request_name=request_name)
	):
		return False
	frappe.get_doc("File", row.name).delete(ignore_permissions=True)
	return True


def _photo_audit_value(value) -> dict:
	value = str(value or "")
	return {
		"present": bool(value),
		"ref": hashlib.sha256(value.encode("utf-8")).hexdigest()[:20] if value else None,
	}


def _redact_profile_audit(values: dict) -> dict:
	redacted = dict(values or {})
	if "profile_photo" in redacted:
		redacted["profile_photo"] = _photo_audit_value(redacted["profile_photo"])
	return redacted


def _assert_photo_is_not_retained(profile, photo: str) -> None:
	retained = str(profile.get("media_retention_file_url") or "")
	if photo and retained and photo == retained:
		frappe.throw(
			_("Устгал хүлээж буй өмнөх зургийг дахин профайлын зураг болгох боломжгүй."),
			frappe.ValidationError,
		)


def _require_profile_reviewer():
	actor = require_actor("Branch Manager", "System Manager", "HR Manager", require_branch=False)
	is_global = actor.user == "Administrator" or bool(actor.roles.intersection(GLOBAL_REVIEW_ROLES))
	if not is_global and not actor.branch:
		frappe.throw(_("Таны ажилтны бүртгэлд салбар тохируулаагүй байна."), frappe.PermissionError)
	return actor, is_global


def _require_idempotency_key(value) -> str:
	key = normalize_idempotency_key(value)
	if not key:
		frappe.throw(_("Давхардал хамгаалах түлхүүр шаардлагатай."), frappe.ValidationError)
	return key


def _require_version(value, label: str) -> str:
	value = str(value or "").strip()
	if not value:
		frappe.throw(_("{0} уншсан хувилбар шаардлагатай. Мэдээллээ шинэчлээд дахин оролдоно уу.").format(label), frappe.ValidationError)
	return value


def _throw_idempotency_mismatch() -> None:
	frappe.throw(
		_("Энэ давхардал хамгаалах түлхүүрийг өөр хүсэлтэд ашигласан байна."),
		frappe.TimestampMismatchError,
	)


def _json_loads(value) -> dict:
	try:
		loaded = json.loads(value or "{}")
	except (TypeError, ValueError):
		return {}
	return loaded if isinstance(loaded, dict) else {}


def _changed_fields(value) -> list[str]:
	return [field for field in str(value or "").splitlines() if field in EDITABLE_FIELDS]


def _profile_values(profile) -> dict:
	return {field: (profile.get(field) or "") for field in EDITABLE_FIELDS}


def _request_proposed(row) -> dict:
	return {field: (row.get(PROPOSED_FIELD_MAP[field]) or "") for field in EDITABLE_FIELDS}


def _serialize_request(row, *, include_diff: bool = True) -> dict:
	payload = {field: row.get(field) for field in REQUEST_FIELDS if field not in {"base_values", *PROPOSED_FIELD_MAP.values()}}
	changed = _changed_fields(row.get("changed_fields"))
	payload["changed_fields"] = changed
	if include_diff:
		base = _json_loads(row.get("base_values"))
		proposed = _request_proposed(row)
		payload["changes"] = [
			{"field": field, "before": base.get(field, ""), "after": proposed.get(field, "")}
			for field in changed
		]
	return payload


def _normalized_proposal(
	*,
	stage_name,
	skills,
	languages,
	service_tags,
	style_tags,
	profile_photo,
	file_owner: str,
	profile,
	require_photo_consent: bool = True,
) -> dict:
	stage_name = (stage_name or "").strip()
	if len(stage_name) < 2 or len(stage_name) > 80:
		frappe.throw(_("Тайзны нэр 2–80 тэмдэгт байна."), frappe.ValidationError)
	photo = _validate_profile_photo(profile_photo, file_owner, profile.profile_photo)
	if (
		require_photo_consent
		and photo
		and photo != (profile.profile_photo or "")
		and profile.media_consent_status != "Granted"
	):
		frappe.throw(_("Зураг өөрчлөхийн өмнө медиа зөвшөөрлөө олгоно уу."), frappe.ValidationError)
	return {
		"stage_name": stage_name,
		"skills": _normalize_lines(skills, _("Ур чадвар")),
		"languages": _normalize_lines(languages, _("Хэл")),
		"service_tags": _normalize_lines(service_tags, _("Үйлчилгээ")),
		"style_tags": _normalize_lines(style_tags, _("Хэв маяг")),
		"profile_photo": photo,
	}


def _existing_request_for_key(profile_name: str, idempotency_key: str):
	existing = frappe.db.get_value(
		REQUEST_DOCTYPE,
		{"idempotency_key": idempotency_key},
		REQUEST_INTERNAL_FIELDS,
		as_dict=True,
	)
	if existing and existing.entertainer != profile_name:
		_throw_idempotency_mismatch()
	return existing


def _successful_audit(actor, action: str, target_name: str, idempotency_key: str):
	audit = frappe.db.get_value(
		"VIP API Audit Event",
		{
			"actor": actor.user,
			"action": action,
			"idempotency_key": idempotency_key,
			"outcome": "Succeeded",
		},
		["name", "target_name", "details"],
		as_dict=True,
	)
	if audit and audit.target_name != target_name:
		_throw_idempotency_mismatch()
	return audit


def _pending_request(profile_name: str):
	rows = frappe.get_all(
		REQUEST_DOCTYPE,
		filters={"entertainer": profile_name, "status": "Pending"},
		fields=REQUEST_FIELDS,
		order_by="requested_at desc, creation desc",
		limit=1,
		ignore_permissions=True,
	)
	return _serialize_request(rows[0]) if rows else None


@frappe.whitelist(methods=["GET"])
def get_editable_profile():
	_actor, profile = require_entertainer_profile()
	return {"profile": _profile_payload(profile.name), "pending_request": _pending_request(profile.name)}


@frappe.whitelist(methods=["POST"])
def submit_profile_change_request(
	stage_name,
	skills="",
	languages="",
	service_tags="",
	style_tags="",
	profile_photo="",
	expected_modified=None,
	idempotency_key=None,
):
	actor, identity = require_entertainer_profile()
	expected_modified = _require_version(expected_modified, _("Профайлын"))
	idempotency_key = _require_idempotency_key(idempotency_key)
	frappe.db.sql("SELECT name FROM `tabVIP Entertainer Profile` WHERE name=%s FOR UPDATE", identity.name)
	profile = frappe.get_doc("VIP Entertainer Profile", identity.name)
	if profile.branch != actor.branch or not profile.active or profile.lifecycle_status not in (None, "", "Active"):
		frappe.throw(_("Таны идэвхтэй профайлын мэдээлэл тохирохгүй байна."), frappe.PermissionError)
	proposal = _normalized_proposal(
		stage_name=stage_name,
		skills=skills,
		languages=languages,
		service_tags=service_tags,
		style_tags=style_tags,
		profile_photo=profile_photo,
		file_owner=actor.user,
		profile=profile,
		require_photo_consent=False,
	)
	_assert_photo_is_not_retained(profile, proposal["profile_photo"])
	existing = _existing_request_for_key(profile.name, idempotency_key)
	if existing:
		if str(existing.base_profile_modified) != expected_modified or _request_proposed(existing) != proposal:
			_throw_idempotency_mismatch()
		return {"profile": _profile_payload(profile.name), "request": _serialize_request(existing), "replayed": True}
	if (
		proposal["profile_photo"]
		and proposal["profile_photo"] != (profile.profile_photo or "")
		and profile.media_consent_status != "Granted"
	):
		frappe.throw(_("Зураг өөрчлөхийн өмнө медиа зөвшөөрлөө олгоно уу."), frappe.ValidationError)
	assert_not_stale(profile.doctype, profile.name, expected_modified)
	base = _profile_values(profile)
	changed = [field for field in EDITABLE_FIELDS if base.get(field, "") != proposal.get(field, "")]
	if not changed:
		frappe.throw(_("Өөрчлөх мэдээлэл алга байна."), frappe.ValidationError)
	if frappe.db.exists(REQUEST_DOCTYPE, {"entertainer": profile.name, "status": "Pending"}):
		frappe.throw(_("Шийдвэр хүлээж буй профайлын хүсэлт байна."), frappe.ValidationError)
	doc = frappe.get_doc({
		"doctype": REQUEST_DOCTYPE,
		"entertainer": profile.name,
		"employee": profile.employee,
		"branch": profile.branch,
		"status": "Pending",
		"requested_by": actor.user,
		"requested_at": now_datetime(),
		"base_profile_modified": str(profile.modified),
		"base_values": json.dumps(base, ensure_ascii=False, sort_keys=True),
		"changed_fields": "\n".join(changed),
		**{PROPOSED_FIELD_MAP[field]: proposal[field] for field in EDITABLE_FIELDS},
		"idempotency_key": idempotency_key,
	}).insert(ignore_permissions=True)
	if "profile_photo" in changed and proposal["profile_photo"]:
		_attach_proposed_photo(
			proposal["profile_photo"],
			request_name=doc.name,
			owner=actor.user,
		)
	record_api_audit(
		actor=actor,
		action="entertainer.profile_change.create",
		target_doctype=doc.doctype,
		target_name=doc.name,
		idempotency_key=idempotency_key,
		details={
			"changed_fields": changed,
			"before": _redact_profile_audit(base),
			"proposed": _redact_profile_audit(proposal),
		},
	)
	frappe.db.commit()
	return {"profile": _profile_payload(profile.name), "request": _serialize_request(doc), "replayed": False}


@frappe.whitelist(methods=["POST"])
def update_editable_profile(
	stage_name,
	skills="",
	languages="",
	service_tags="",
	style_tags="",
	media_consent_status=None,
	profile_photo="",
	expected_modified=None,
	idempotency_key=None,
):
	"""Compatibility endpoint: create a review request; never mutate the master profile."""
	if media_consent_status not in (None, "", "Granted", "Denied", "Revoked"):
		frappe.throw(_("Медиа зөвшөөрлийн төлөв буруу байна."), frappe.ValidationError)
	return submit_profile_change_request(
		stage_name=stage_name,
		skills=skills,
		languages=languages,
		service_tags=service_tags,
		style_tags=style_tags,
		profile_photo=profile_photo,
		expected_modified=expected_modified,
		idempotency_key=idempotency_key,
	)


@frappe.whitelist(methods=["GET"])
def get_manager_profile_change_requests(status="Pending", limit=50, cursor=0):
	actor, global_scope = _require_profile_reviewer()
	page_size, offset = page_window(limit, cursor)
	status = (status or "Pending").strip().title()
	if status not in REQUEST_STATUSES | {"All"}:
		frappe.throw(_("Профайлын хүсэлтийн төлөв буруу байна."), frappe.ValidationError)
	filters = {} if global_scope else {"branch": actor.branch}
	if status != "All":
		filters["status"] = status
	total = frappe.db.count(REQUEST_DOCTYPE, filters)
	rows = frappe.get_all(
		REQUEST_DOCTYPE,
		filters=filters,
		fields=REQUEST_FIELDS,
		order_by="requested_at asc, creation asc",
		limit_start=offset,
		limit_page_length=page_size,
		ignore_permissions=True,
	)
	requests = []
	for row in rows:
		payload = _serialize_request(row)
		profile = frappe.db.get_value(
			"VIP Entertainer Profile",
			row.entertainer,
			["employee_name", "stage_name", "modified"],
			as_dict=True,
		)
		payload["display_name"] = (profile and (profile.stage_name or profile.employee_name)) or row.entertainer
		payload["current_profile_modified"] = profile.modified if profile else None
		requests.append(payload)
	return {
		"branch": None if global_scope else actor.branch,
		"requests": requests,
		"meta": page_meta(
			branch=None if global_scope else actor.branch,
			limit=page_size,
			offset=offset,
			returned=len(requests),
			total=total,
		),
	}


@frappe.whitelist(methods=["POST"])
def review_profile_change_request(
	request_name,
	decision,
	reason,
	expected_modified=None,
	expected_profile_modified=None,
	idempotency_key=None,
):
	actor, global_scope = _require_profile_reviewer()
	decision = (decision or "").strip().title()
	if decision not in {"Approved", "Rejected"}:
		frappe.throw(_("Шийдвэрийн утга буруу байна."), frappe.ValidationError)
	reason = (reason or "").strip()
	if len(reason) < 5:
		frappe.throw(_("Шийдвэрийн үндэслэлийг хамгийн багадаа 5 тэмдэгтээр бичнэ үү."), frappe.ValidationError)
	expected_modified = _require_version(expected_modified, _("Хүсэлтийн"))
	if decision == "Approved":
		expected_profile_modified = _require_version(expected_profile_modified, _("Профайлын"))
	idempotency_key = _require_idempotency_key(idempotency_key)
	frappe.db.sql(f"SELECT name FROM `tab{REQUEST_DOCTYPE}` WHERE name=%s FOR UPDATE", request_name)
	doc = frappe.get_doc(REQUEST_DOCTYPE, request_name)
	if not global_scope and doc.branch != actor.branch:
		frappe.throw(_("Өөр салбарын профайлын хүсэлтийг шийдвэрлэх эрхгүй."), frappe.PermissionError)
	audit = _successful_audit(actor, "manager.profile_change.review", doc.name, idempotency_key)
	if audit:
		details = _json_loads(audit.details)
		if details.get("decision") != decision or details.get("reason", "") != reason:
			_throw_idempotency_mismatch()
		return {"request": _serialize_request(doc), "profile": _profile_payload(doc.entertainer), "replayed": True}
	assert_not_stale(doc.doctype, doc.name, expected_modified)
	if doc.status != "Pending":
		frappe.throw(_("Энэ профайлын хүсэлтийг өмнө нь шийдвэрлэсэн байна."), frappe.ValidationError)
	before = {}
	after = {}
	applied_profile_modified = None
	photo_file_deleted = False
	if decision == "Approved":
		frappe.db.sql("SELECT name FROM `tabVIP Entertainer Profile` WHERE name=%s FOR UPDATE", doc.entertainer)
		profile = frappe.get_doc("VIP Entertainer Profile", doc.entertainer)
		if profile.employee != doc.employee or profile.branch != doc.branch or profile.user != doc.requested_by:
			frappe.throw(_("Хүсэлт болон профайлын ажилтан, салбар, хэрэглэгч тохирохгүй байна."), frappe.PermissionError)
		if not profile.active or profile.lifecycle_status not in (None, "", "Active"):
			frappe.throw(_("Идэвхгүй профайлын хүсэлтийг зөвшөөрөх боломжгүй."), frappe.ValidationError)
		assert_not_stale(profile.doctype, profile.name, expected_profile_modified)
		assert_not_stale(profile.doctype, profile.name, doc.base_profile_modified)
		proposal = _normalized_proposal(
			stage_name=doc.proposed_stage_name,
			skills=doc.proposed_skills,
			languages=doc.proposed_languages,
			service_tags=doc.proposed_service_tags,
			style_tags=doc.proposed_style_tags,
			profile_photo=doc.proposed_profile_photo,
			file_owner=doc.requested_by,
			profile=profile,
		)
		_assert_photo_is_not_retained(profile, proposal["profile_photo"])
		before = _profile_values(profile)
		changed = _changed_fields(doc.changed_fields)
		if not changed:
			frappe.throw(_("Хүсэлтэд хэрэгжүүлэх өөрчлөлт алга байна."), frappe.ValidationError)
		for field in changed:
			value = (proposal[field] or None) if field == "profile_photo" else proposal[field]
			profile.set(field, value)
		profile.save(ignore_permissions=True)
		if "profile_photo" in changed and proposal["profile_photo"]:
			_reattach_approved_photo(
				proposal["profile_photo"],
				request_name=doc.name,
				owner=doc.requested_by,
				profile_name=profile.name,
			)
		after = _profile_values(profile)
		applied_profile_modified = str(frappe.db.get_value(profile.doctype, profile.name, "modified") or profile.modified)
	else:
		photo_file_deleted = _delete_rejected_photo(
			doc.proposed_profile_photo,
			request_name=doc.name,
			owner=doc.requested_by,
		)
	doc.status = decision
	doc.decided_by = actor.user
	doc.decided_at = now_datetime()
	doc.decision_reason = reason
	doc.applied_profile_modified = applied_profile_modified
	doc.save(ignore_permissions=True)
	record_api_audit(
		actor=actor,
		action="manager.profile_change.review",
		target_doctype=doc.doctype,
		target_name=doc.name,
		idempotency_key=idempotency_key,
		details={
			"decision": decision,
			"reason": reason,
			"changed_fields": _changed_fields(doc.changed_fields),
			"before": _redact_profile_audit(before),
			"after": _redact_profile_audit(after),
			"applied_profile_modified": applied_profile_modified,
			"proposed_photo_deleted": photo_file_deleted,
		},
	)
	frappe.db.commit()
	return {"request": _serialize_request(doc), "profile": _profile_payload(doc.entertainer), "replayed": False}


@frappe.whitelist(methods=["POST"])
def set_media_consent(
	status,
	consent_version,
	expected_modified=None,
	idempotency_key=None,
):
	actor, identity = require_entertainer_profile()
	status = (status or "").strip().title()
	if status not in CONSENT_STATUSES:
		frappe.throw(_("Медиа зөвшөөрлийн төлөв буруу байна."), frappe.ValidationError)
	consent_version = (consent_version or "").strip()
	if len(consent_version) < 2 or len(consent_version) > 80:
		frappe.throw(_("Медиа зөвшөөрлийн хувилбар 2–80 тэмдэгт байна."), frappe.ValidationError)
	expected_modified = _require_version(expected_modified, _("Профайлын"))
	idempotency_key = _require_idempotency_key(idempotency_key)
	frappe.db.sql("SELECT name FROM `tabVIP Entertainer Profile` WHERE name=%s FOR UPDATE", identity.name)
	doc = frappe.get_doc("VIP Entertainer Profile", identity.name)
	if doc.branch != actor.branch or not doc.active or doc.lifecycle_status not in (None, "", "Active"):
		frappe.throw(_("Таны идэвхтэй профайлын мэдээлэл тохирохгүй байна."), frappe.PermissionError)
	audit = _successful_audit(actor, "entertainer.media_consent.set", doc.name, idempotency_key)
	if audit:
		details = _json_loads(audit.details)
		if details.get("requested_status") != status or details.get("consent_version") != consent_version:
			_throw_idempotency_mismatch()
		return {"profile": _profile_payload(doc.name), "replayed": True}
	assert_not_stale(doc.doctype, doc.name, expected_modified)
	before = {
		"media_consent_status": doc.media_consent_status,
		"media_consent_version": doc.media_consent_version,
		"profile_photo": _photo_audit_value(doc.profile_photo),
	}
	doc.media_consent_status = status
	doc.media_consent_actor = actor.user
	doc.media_consent_at = now_datetime()
	doc.media_consent_version = consent_version
	doc.media_consent_expires_on = None
	doc.save(ignore_permissions=True)
	after = {
		"media_consent_status": doc.media_consent_status,
		"media_consent_version": doc.media_consent_version,
		"profile_photo": _photo_audit_value(doc.profile_photo),
	}
	record_api_audit(
		actor=actor,
		action="entertainer.media_consent.set",
		target_doctype=doc.doctype,
		target_name=doc.name,
		idempotency_key=idempotency_key,
		details={
			"requested_status": status,
			"consent_version": consent_version,
			"before": before,
			"after": after,
		},
	)
	frappe.db.commit()
	return {"profile": _profile_payload(doc.name), "replayed": False}
