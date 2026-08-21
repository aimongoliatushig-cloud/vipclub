from __future__ import annotations

import frappe


def execute() -> None:
	if not frappe.db.exists("DocType", "VIP Rank History"):
		return
	if not frappe.db.has_column("VIP Rank History", "effective_from"):
		return

	if frappe.db.exists("DocType", "VIP Entertainer Rank Review"):
		frappe.db.sql(
			"""
			UPDATE `tabVIP Rank History` history
			LEFT JOIN `tabVIP Entertainer Rank Review` review
				ON review.rank_history = history.name
			SET history.effective_from = COALESCE(
				DATE_ADD(review.window_to, INTERVAL 1 DAY),
				DATE_ADD(DATE(history.changed_at), INTERVAL 1 DAY)
			)
			WHERE history.effective_from IS NULL
			"""
		)
		return

	frappe.db.sql(
		"""
		UPDATE `tabVIP Rank History`
		SET effective_from = DATE_ADD(DATE(changed_at), INTERVAL 1 DAY)
		WHERE effective_from IS NULL
		"""
	)
