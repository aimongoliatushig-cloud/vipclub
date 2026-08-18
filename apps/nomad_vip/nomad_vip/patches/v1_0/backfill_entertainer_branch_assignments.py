from __future__ import annotations

import frappe
from frappe.utils import getdate


MIGRATION_REASON = "Idempotent migration from legacy VIP Entertainer Profile.branch"


def execute():
	profiles = frappe.get_all(
		"VIP Entertainer Profile",
		filters={"active": 1, "branch": ("is", "set")},
		fields=["name", "employee", "branch", "creation"],
	)
	for profile in profiles:
		if frappe.db.exists(
			"VIP Entertainer Branch Assignment",
			{
				"entertainer": profile.name,
				"branch": profile.branch,
				"assignment_status": ("in", ["Planned", "Active"]),
				"effective_to": ("is", "not set"),
			},
		):
			continue

		joining_date = frappe.db.get_value("Employee", profile.employee, "date_of_joining")
		frappe.get_doc(
			{
				"doctype": "VIP Entertainer Branch Assignment",
				"entertainer": profile.name,
				"branch": profile.branch,
				"effective_from": getdate(joining_date or profile.creation),
				"assignment_status": "Active",
				"reason": MIGRATION_REASON,
			}
		).insert(ignore_permissions=True)
