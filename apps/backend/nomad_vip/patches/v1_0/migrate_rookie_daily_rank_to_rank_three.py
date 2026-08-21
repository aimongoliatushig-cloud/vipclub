from __future__ import annotations

import frappe


def execute() -> None:
	if not frappe.db.exists("DocType", "VIP Entertainer Daily Rank Snapshot"):
		return
	frappe.db.sql(
		"""
		UPDATE `tabVIP Entertainer Daily Rank Snapshot`
		SET calculated_rank = 'Rank 3'
		WHERE calculated_rank = 'Rookie'
		"""
	)
