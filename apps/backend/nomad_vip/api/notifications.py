from __future__ import annotations

import json

import frappe
from frappe import _
from frappe.utils import add_days, get_datetime, now_datetime, strip_html

from nomad_vip.api.security import require_entertainer_profile


def _serialize(row) -> dict:
	return {
		"name": row.name,
		"subject": row.subject,
		"message": strip_html(row.email_content or ""),
		"created_at": str(row.creation),
		"read": bool(row.read),
		"document_type": row.document_type,
		"document_name": row.document_name,
	}


@frappe.whitelist(methods=["GET"])
def get_my_notifications(limit=20):
	actor, _profile = require_entertainer_profile()
	try:
		page_size = max(1, min(50, int(limit or 20)))
	except (TypeError, ValueError):
		frappe.throw(_("Мэдэгдлийн тоо бүхэл тоо байна."), frappe.ValidationError)
	since = get_datetime(add_days(now_datetime(), -30))
	rows = frappe.get_all(
		"Notification Log",
		filters={"for_user": actor.user, "creation": [">=", since]},
		fields=["name", "subject", "email_content", "creation", "read", "document_type", "document_name"],
		order_by="creation desc",
		limit_page_length=page_size,
		ignore_permissions=True,
	)
	unread = frappe.db.count(
		"Notification Log",
		filters={"for_user": actor.user, "read": 0, "creation": [">=", since]},
	)
	return {"notifications": [_serialize(row) for row in rows], "unread_count": unread}


@frappe.whitelist(methods=["POST"])
def mark_my_notifications_read(names):
	actor, _profile = require_entertainer_profile()
	try:
		values = json.loads(names) if isinstance(names, str) else names
	except (TypeError, ValueError, json.JSONDecodeError):
		frappe.throw(_("Мэдэгдлийн жагсаалт буруу байна."), frappe.ValidationError)
	if not isinstance(values, list) or len(values) > 50:
		frappe.throw(_("50 хүртэл мэдэгдэл сонгоно уу."), frappe.ValidationError)
	clean = [str(value).strip() for value in values if str(value).strip()]
	if not clean:
		return {"updated": 0}
	owned = frappe.get_all(
		"Notification Log",
		filters={"name": ["in", clean], "for_user": actor.user},
		pluck="name",
		ignore_permissions=True,
	)
	for name in owned:
		frappe.db.set_value("Notification Log", name, "read", 1, update_modified=False)
	return {"updated": len(owned)}
