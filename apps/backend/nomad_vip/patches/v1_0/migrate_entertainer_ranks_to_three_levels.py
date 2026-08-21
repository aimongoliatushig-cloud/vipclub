from __future__ import annotations

import frappe

from nomad_vip.entertainer_ranks import ENTERTAINER_RANKS, LEGACY_ENTERTAINER_RANK_MAP


def _upsert_rank(values: dict) -> None:
	name = values["code"]
	if frappe.db.exists("VIP Rank Definition", name):
		frappe.db.set_value(
			"VIP Rank Definition",
			name,
			{
				"code": name,
				"rank_order": values["rank_order"],
				"minimum_points": values["minimum_points"],
				"loan_multiplier": values["loan_multiplier"],
				"active": 1,
			},
			update_modified=False,
		)
		return
	frappe.get_doc({"doctype": "VIP Rank Definition", **values, "active": 1}).insert(
		ignore_permissions=True
	)


def _map_link(table: str, fieldname: str) -> None:
	for old_name, new_name in LEGACY_ENTERTAINER_RANK_MAP.items():
		frappe.db.sql(
			f"UPDATE `{table}` SET `{fieldname}`=%s WHERE `{fieldname}`=%s",
			(new_name, old_name),
		)


def execute() -> None:
	if not frappe.db.exists("DocType", "VIP Rank Definition"):
		return

	for values in ENTERTAINER_RANKS:
		_upsert_rank(values)

	if frappe.db.exists("DocType", "VIP Entertainer Profile"):
		_map_link("tabVIP Entertainer Profile", "current_rank")
	if frappe.db.exists("DocType", "VIP Rank History"):
		_map_link("tabVIP Rank History", "from_rank")
		_map_link("tabVIP Rank History", "to_rank")
	if frappe.db.exists("DocType", "VIP Entertainer Rank Review"):
		_map_link("tabVIP Entertainer Rank Review", "from_rank")
		_map_link("tabVIP Entertainer Rank Review", "recommended_rank")

	for legacy_name in LEGACY_ENTERTAINER_RANK_MAP:
		if frappe.db.exists("VIP Rank Definition", legacy_name):
			frappe.db.set_value(
				"VIP Rank Definition", legacy_name, "active", 0, update_modified=False
			)
