from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import cint

from nomad_vip.availability_policy import canonical_availability_status


AVAILABILITY_EVENT_FIELDS = [
	"name",
	"status",
	"previous_event",
	"previous_status",
	"previous_version",
	"state_version",
	"occurred_at",
	"note",
	"actor",
]


def _canonical_event(row):
	if not row:
		return frappe._dict({
			"name": None,
			"status": "Unavailable",
			"previous_event": None,
			"previous_status": None,
			"previous_version": 0,
			"state_version": 0,
			"occurred_at": None,
			"note": None,
			"actor": None,
		})
	row.status = canonical_availability_status(row.status) or row.status
	if row.get("previous_status"):
		row.previous_status = canonical_availability_status(row.previous_status) or row.previous_status
	row.previous_version = cint(row.get("previous_version") or 0)
	row.state_version = cint(row.get("state_version") or 0)
	return row


def latest_availability(profile_name: str, work_date):
	rows = frappe.get_all(
		"VIP Availability Event",
		filters={"entertainer": profile_name, "work_date": work_date},
		fields=AVAILABILITY_EVENT_FIELDS,
		order_by="occurred_at desc, creation desc",
		limit=1,
		ignore_permissions=True,
	)
	return _canonical_event(rows[0] if rows else None)


def _assert_availability_version(current, expected_event=None, expected_version=None) -> None:
	current_event = str(current.name or "")
	expected_event = str(expected_event or "")
	current_version = cint(current.state_version or 0)
	try:
		expected_version = cint(expected_version or 0)
	except (TypeError, ValueError):
		frappe.throw(_("Ажлын төлөвийн хувилбар буруу байна."), frappe.ValidationError)
	if current_event != expected_event or current_version != expected_version:
		frappe.throw(
			_("Ажлын төлөв өөр хүнээр шинэчлэгдсэн байна. Мэдээллээ шинэчлээд дахин оролдоно уу."),
			frappe.TimestampMismatchError,
		)


def availability_request_matches(existing, status, reason, expected_event=None, expected_version=None) -> bool:
	return bool(
		canonical_availability_status(existing.status) == status
		and (existing.note or "").strip() == reason
		and str(existing.previous_event or "") == str(expected_event or "")
		and cint(existing.previous_version or 0) == cint(expected_version or 0)
	)


def availability_event_values(*, profile, branch, work_date, status, reason, actor, current, idempotency_key):
	previous_version = cint(current.state_version or 0)
	return {
		"doctype": "VIP Availability Event",
		"entertainer": profile.name,
		"employee": profile.employee,
		"branch": branch,
		"work_date": work_date,
		"status": status,
		"previous_event": current.name,
		"previous_status": current.status,
		"previous_version": previous_version,
		"state_version": previous_version + 1,
		"occurred_at": frappe.utils.now_datetime(),
		"note": reason,
		"actor": actor.user,
		"idempotency_key": idempotency_key,
	}


def availability_event_payload(row):
	return {
		field: row.get(field)
		for field in AVAILABILITY_EVENT_FIELDS
	}
