from __future__ import annotations

import frappe


POLICY_VERSION = "DAILY-8-FACTOR-V1"


def execute():
	if not frappe.db.exists("DocType", "VIP Ranking Policy"):
		return

	for name in frappe.get_all(
		"VIP Ranking Policy",
		filters={"status": "Published", "version": ("!=", POLICY_VERSION)},
		pluck="name",
	):
		frappe.db.set_value("VIP Ranking Policy", name, "status", "Retired", update_modified=False)

	values = {
		"effective_from": frappe.utils.today(),
		"status": "Published",
		"evaluation_mode": "Active",
		"daily_scoring_enabled": 1,
		"evaluation_window_days": 1,
		"evaluation_cadence": "Daily",
		"attendance_weight": 10,
		"customer_complaints_weight": 15,
		"sales_weight": 40,
		"entertaining_skill_weight": 5,
		"cleanliness_beauty_weight": 5,
		"shift_effort_weight": 10,
		"personal_development_weight": 5,
		"entertainer_attitude_weight": 10,
		"rank_1_threshold": 90,
		"rank_2_threshold": 80,
		"rank_3_threshold": 70,
		"ready_points": 5,
		"not_ready_points": -10,
		"loyalty_weight": 0,
		"behavior_weight": 0,
		"notes": "Өдөр бүрийн 8 үзүүлэлтээр тооцно. Дутуу өгөгдлийг 0 гэж таамаглахгүй.",
	}
	name = frappe.db.get_value("VIP Ranking Policy", {"version": POLICY_VERSION}, "name")
	if name:
		# Patches may repair an already-published policy. Use a direct write so the
		# normal controller's published-version immutability remains intact for users.
		frappe.db.set_value("VIP Ranking Policy", name, values, update_modified=False)
	else:
		frappe.get_doc({
			"doctype": "VIP Ranking Policy",
			"version": POLICY_VERSION,
			**values,
		}).insert(ignore_permissions=True)
