from __future__ import annotations

import frappe

from nomad_vip.availability_policy import canonical_availability_status


def execute():
	"""Canonicalize legacy values and build an idempotent per-workday version chain."""
	previous_by_stream = {}
	rows = frappe.get_all(
		"VIP Availability Event",
		fields=["name", "entertainer", "work_date", "status", "occurred_at", "creation"],
		order_by="entertainer asc, work_date asc, occurred_at asc, creation asc",
	)
	for row in rows:
		status = canonical_availability_status(row.status)
		if not status:
			continue
		stream = (row.entertainer, str(row.work_date))
		previous = previous_by_stream.get(stream)
		previous_version = previous["state_version"] if previous else 0
		state_version = previous_version + 1
		values = {
			"status": status,
			"previous_event": previous["name"] if previous else None,
			"previous_status": previous["status"] if previous else "Unavailable",
			"previous_version": previous_version,
			"state_version": state_version,
		}
		frappe.db.set_value(
			"VIP Availability Event",
			row.name,
			values,
			update_modified=False,
		)
		previous_by_stream[stream] = {
			"name": row.name,
			"status": status,
			"state_version": state_version,
		}
