import json

import frappe
from frappe import _

from nomad_vip.api.security import (
	assert_not_stale,
	normalize_idempotency_key,
	record_api_audit,
	require_entertainer_profile,
)


def _response_payload(doc, *, replayed: bool) -> dict:
	return {
		"name": doc.name,
		"status": doc.status,
		"modified": doc.modified,
		"replayed": replayed,
	}


@frappe.whitelist(methods=["POST"])
def respond(
	reservation: str,
	response: str,
	reason: str | None = None,
	expected_modified=None,
	idempotency_key=None,
):
	actor, profile = require_entertainer_profile()
	response = (response or "").strip().upper()
	if response not in {"ACKNOWLEDGE", "CONFLICT"}:
		frappe.throw(
			_("Захиалгыг зөвшөөрөх эсвэл зөрчилтэй гэж тэмдэглэнэ үү."),
			frappe.ValidationError,
		)
	reason = (reason or "").strip()
	if response == "CONFLICT" and len(reason) < 3:
		frappe.throw(_("Зөрчлийн шалтгааныг бичнэ үү."), frappe.ValidationError)
	idempotency_key = normalize_idempotency_key(idempotency_key)

	# Serialize responses for one reservation so concurrent retries cannot post
	# two state transitions or duplicate audit evidence.
	frappe.db.sql("SELECT name FROM `tabVIP Reservation` WHERE name=%s FOR UPDATE", reservation)
	doc = frappe.get_doc("VIP Reservation", reservation)
	if doc.entertainer != profile.name:
		frappe.throw(_("Энэ захиалга өөр бүжигчинд хуваарилагдсан байна."), frappe.PermissionError)
	if doc.branch != profile.branch:
		frappe.throw(_("Энэ захиалга өөр салбарт хамаарч байна."), frappe.PermissionError)
	request_details = {
		"response": response,
		"reason": reason if response == "CONFLICT" else None,
	}
	audit_name = idempotency_key and frappe.db.exists(
		"VIP API Audit Event",
		{
			"actor": actor.user,
			"action": "entertainer.reservation.respond",
			"target_doctype": "VIP Reservation",
			"target_name": doc.name,
			"idempotency_key": idempotency_key,
			"outcome": "Succeeded",
		},
	)
	if audit_name:
		# Frappe returns the matching document name. Keeping the type guard also
		# makes this path tolerant of older test doubles that return a boolean.
		if isinstance(audit_name, str):
			raw_details = frappe.db.get_value("VIP API Audit Event", audit_name, "details")
			try:
				audit_details = json.loads(raw_details or "{}")
			except (TypeError, ValueError):
				audit_details = {}
			recorded_response = audit_details.get("response") or {
				"Acknowledged": "ACKNOWLEDGE",
				"Conflict": "CONFLICT",
			}.get(doc.status)
			recorded_reason = audit_details.get(
				"reason",
				(doc.conflict_reason or "").strip() if recorded_response == "CONFLICT" else None,
			)
			if (
				recorded_response != request_details["response"]
				or recorded_reason != request_details["reason"]
			):
				frappe.throw(
					_("Энэ давхардал хамгаалах түлхүүрийг өөр хүсэлтэд ашигласан байна."),
					frappe.TimestampMismatchError,
				)
		return _response_payload(doc, replayed=True)
	assert_not_stale(doc.doctype, doc.name, expected_modified)
	if doc.status != "Assigned":
		frappe.throw(
			_("Зөвхөн хуваарилагдсан захиалгыг зөвшөөрөх эсвэл зөрчилтэй гэж тэмдэглэх боломжтой."),
			frappe.ValidationError,
		)

	if response == "ACKNOWLEDGE":
		doc.status = "Acknowledged"
		doc.conflict_reason = None
	elif response == "CONFLICT":
		doc.status = "Conflict"
		doc.conflict_reason = reason

	doc.flags.ignore_permissions = True
	doc.save()
	record_api_audit(
		actor=actor,
		action="entertainer.reservation.respond",
		target_doctype=doc.doctype,
		target_name=doc.name,
		idempotency_key=idempotency_key,
		details=request_details,
	)
	frappe.db.commit()
	return _response_payload(doc, replayed=False)
