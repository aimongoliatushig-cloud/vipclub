from __future__ import annotations

import frappe
from frappe.utils import today


POLICY_VERSION = "MVP-2-15D"


def execute() -> None:
	if not frappe.db.exists("DocType", "VIP Ranking Policy"):
		return
	existing = frappe.db.get_value(
		"VIP Ranking Policy",
		{"status": "Published"},
		[
			"name",
			"evaluation_mode",
			"evaluation_window_days",
			"sales_weight",
			"attendance_weight",
			"loyalty_weight",
			"behavior_weight",
			"ready_points",
			"not_ready_points",
		],
		as_dict=True,
		order_by="effective_from desc, creation desc",
	)
	if frappe.db.exists("VIP Ranking Policy", POLICY_VERSION):
		frappe.db.sql(
			"UPDATE `tabVIP Ranking Policy` SET status='Retired' WHERE status='Published' AND name!=%s",
			(POLICY_VERSION,),
		)
		frappe.db.set_value(
			"VIP Ranking Policy",
			POLICY_VERSION,
			{"status": "Published", "evaluation_cadence": "Every 15 Days"},
			update_modified=False,
		)
		return
	if existing:
		frappe.db.set_value(
			"VIP Ranking Policy", existing.name, "status", "Retired", update_modified=False
		)
	values = {
		"doctype": "VIP Ranking Policy",
		"version": POLICY_VERSION,
		"effective_from": today(),
		"status": "Published",
		"evaluation_mode": (existing or {}).get("evaluation_mode") or "Shadow",
		"evaluation_window_days": int((existing or {}).get("evaluation_window_days") or 62),
		"evaluation_cadence": "Every 15 Days",
		"sales_weight": (existing or {}).get("sales_weight") or 0,
		"attendance_weight": (existing or {}).get("attendance_weight") or 0,
		"loyalty_weight": (existing or {}).get("loyalty_weight") or 0,
		"behavior_weight": (existing or {}).get("behavior_weight") or 0,
		"ready_points": (existing or {}).get("ready_points") or 5,
		"not_ready_points": (existing or {}).get("not_ready_points") or -10,
		"notes": "Үзүүлэлтийг 15 хоног тутам шинэчилнэ. Зэрэглэл зөвхөн менежерийн санал, CEO-ийн шийдвэрээр өөрчлөгдөнө.",
	}
	frappe.get_doc(values).insert(ignore_permissions=True)
