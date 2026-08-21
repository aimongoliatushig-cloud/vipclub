from __future__ import annotations

import json
from dataclasses import dataclass

import frappe
from frappe import _
from frappe.utils import getdate, now_datetime, today

from nomad_vip.services import get_branch_for_user, get_employee_for_user, get_profile_for_user


API_VERSION = "2026-08-11"
MAX_PAGE_SIZE = 100


@dataclass(frozen=True)
class ActorContext:
	user: str
	roles: frozenset[str]
	role: str
	branch: str | None
	profile: str | None
	employee: str | None = None


def require_actor(*allowed_roles: str, require_branch: bool = False) -> ActorContext:
	"""Resolve server-side identity once and deny any role/branch ambiguity."""
	user = frappe.session.user
	if not user or user == "Guest":
		frappe.throw(_("Нэвтэрнэ үү."), frappe.PermissionError)

	roles = frozenset(frappe.get_roles(user))
	allowed = set(allowed_roles)
	is_administrator = user == "Administrator"
	matched = roles.intersection(allowed)
	if allowed and not is_administrator and not matched:
		frappe.throw(_("Энэ үйлдлийг хийх эрхгүй байна."), frappe.PermissionError)

	role = "Administrator" if is_administrator else (sorted(matched)[0] if matched else "Employee")
	employee = get_employee_for_user(user)
	branch = get_branch_for_user(user)
	if require_branch and not branch and not is_administrator:
		frappe.throw(_("Таны ажилтны бүртгэлд салбар тохируулаагүй байна."), frappe.PermissionError)

	return ActorContext(
		user=user,
		roles=roles,
		role=role,
		branch=branch,
		profile=get_profile_for_user(user),
		employee=employee,
	)


def require_employee_identity() -> ActorContext:
	"""Return the current authenticated user's active Employee identity.

	QR attendance is an employee-owned action, not an entertainer-only action.
	The Employee link and branch are always derived from the authenticated session.
	"""
	actor = require_actor()
	if not actor.employee:
		frappe.throw(_("Таны хэрэглэгч идэвхтэй ажилтны бүртгэлтэй холбогдоогүй байна."), frappe.PermissionError)
	if not actor.branch:
		frappe.throw(_("Таны ажилтны бүртгэлд салбар тохируулаагүй байна."), frappe.PermissionError)
	return actor


def require_entertainer_profile(*extra_fields: str):
	"""Return a server-derived active entertainer identity.

	A profile link alone is not authorization: the current user must still hold the
	Entertainer role and the profile branch must match the employee branch resolved
	by :func:`require_actor`.
	"""
	actor = require_actor("Entertainer", "Lead Entertainer", "Entertainer Supervisor", require_branch=True)
	if not actor.profile:
		frappe.throw(_("Бүжигчний бүртгэл таны хэрэглэгчтэй холбогдоогүй байна."), frappe.PermissionError)

	fields = list(dict.fromkeys([
		"name", "employee", "branch", "active", "lifecycle_status", *extra_fields,
	]))
	profile = frappe.db.get_value("VIP Entertainer Profile", actor.profile, fields, as_dict=True)
	if not profile or not profile.employee:
		frappe.throw(_("Бүжигчний бүртгэл олдсонгүй."), frappe.PermissionError)
	if not profile.active or profile.lifecycle_status not in (None, "", "Active"):
		frappe.throw(_("Бүжигчний бүртгэл идэвхгүй байна."), frappe.PermissionError)
	if actor.branch and profile.branch != actor.branch:
		frappe.throw(_("Бүжигчний бүртгэл болон ажилтны салбар зөрүүтэй байна."), frappe.PermissionError)
	return actor, profile


def page_window(limit=None, cursor=None, *, default: int = 50) -> tuple[int, int]:
	"""Return a bounded offset window used by all list endpoints."""
	try:
		page_size = int(default if limit is None or str(limit).strip() == "" else limit)
	except (TypeError, ValueError):
		frappe.throw(_("Нэг хуудсанд авах мөрийн тоо бүхэл тоо байна."), frappe.ValidationError)
	try:
		offset = int(0 if cursor is None or str(cursor).strip() == "" else cursor)
	except (TypeError, ValueError):
		frappe.throw(_("Хуудасны заагч бүхэл тоо байна."), frappe.ValidationError)
	if page_size < 1 or page_size > MAX_PAGE_SIZE:
		frappe.throw(
			_("Нэг хуудсанд 1–{0} мөр авах боломжтой.").format(MAX_PAGE_SIZE),
			frappe.ValidationError,
		)
	if offset < 0:
		frappe.throw(_("Хуудасны заагч сөрөг утгатай байж болохгүй."), frappe.ValidationError)
	return page_size, offset


def page_meta(*, branch=None, limit: int, offset: int, returned: int, total: int) -> dict:
	next_cursor = offset + returned if offset + returned < total else None
	return {
		"api_version": API_VERSION,
		"generated_at": now_datetime(),
		"branch": branch,
		"limit": limit,
		"cursor": offset,
		"next_cursor": next_cursor,
		"total": total,
	}


def can_project_media(profile) -> bool:
	"""Return consented media only while the grant is still effective."""
	status = profile.get("media_consent_status") if hasattr(profile, "get") else None
	expires_on = profile.get("media_consent_expires_on") if hasattr(profile, "get") else None
	if status != "Granted":
		return False
	return not expires_on or getdate(expires_on) >= getdate(today())


def assert_not_stale(doctype: str, name: str, expected_modified=None) -> None:
	"""Apply optimistic concurrency when a client supplies the version it read."""
	if not expected_modified:
		return
	current = frappe.db.get_value(doctype, name, "modified")
	if not current:
		frappe.throw(_("Хүссэн бүртгэл олдсонгүй."), frappe.DoesNotExistError)
	if str(current) != str(expected_modified):
		frappe.throw(
			_("Таныг нээснээс хойш энэ бүртгэл өөрчлөгдсөн байна. Мэдээллээ шинэчлээд дахин оролдоно уу."),
			frappe.TimestampMismatchError,
		)


def normalize_idempotency_key(value) -> str | None:
	value = (value or "").strip()
	if not value:
		return None
	if len(value) > 140:
		frappe.throw(_("Давхардал хамгаалах түлхүүр хэт урт байна."), frappe.ValidationError)
	return value


def record_api_audit(
	*,
	actor: ActorContext,
	action: str,
	outcome: str = "Succeeded",
	target_doctype: str | None = None,
	target_name: str | None = None,
	idempotency_key: str | None = None,
	details: dict | None = None,
) -> str:
	"""Write an append-only audit event in the same transaction as the action."""
	payload = {
		"doctype": "VIP API Audit Event",
		"actor": actor.user,
		"actor_role": actor.role,
		"branch": actor.branch,
		"action": action,
		"outcome": outcome,
		"target_doctype": target_doctype,
		"target_name": target_name,
		"idempotency_key": idempotency_key,
		"occurred_at": now_datetime(),
		"api_version": API_VERSION,
		"details": json.dumps(details or {}, ensure_ascii=False, sort_keys=True),
	}
	return frappe.get_doc(payload).insert(ignore_permissions=True).name
