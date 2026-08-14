from __future__ import annotations

import frappe
from frappe.utils import add_days, now_datetime, today

from nomad_vip.services import (
	make_deduplication_key,
	reverse_readiness_points,
	update_profile_points,
)


def run():
	"""Exercise the readiness-to-points flow and roll back every test record."""
	frappe.db.savepoint("nomad_vip_smoke")
	try:
		company = frappe.db.get_single_value("Global Defaults", "default_company")
		company = company or frappe.db.get_value("Company", {}, "name")
		if not company:
			raise RuntimeError("A Company is required before running the NOMAD VIP smoke test.")

		branch = frappe.get_doc(
			{"doctype": "Branch", "branch": "NOMAD Smoke Branch", "company": company}
		).insert(ignore_permissions=True)
		employee = frappe.get_doc(
			{
				"doctype": "Employee",
				"first_name": "NOMAD Smoke Entertainer",
				"gender": "Female",
				"date_of_birth": "2000-01-01",
				"date_of_joining": today(),
				"company": company,
				"branch": branch.name,
				"status": "Active",
			}
		).insert(ignore_permissions=True)
		shift_type = frappe.get_doc(
			{
				"doctype": "Shift Type",
				"name": "NOMAD Smoke Night Shift",
				"start_time": "19:00:00",
				"end_time": "04:00:00",
			}
		).insert(ignore_permissions=True)
		shift_assignment = frappe.get_doc(
			{
				"doctype": "Shift Assignment",
				"employee": employee.name,
				"shift_type": shift_type.name,
				"start_date": today(),
				"end_date": add_days(today(), 1),
			}
		).insert(ignore_permissions=True)
		shift_assignment.flags.ignore_permissions = True
		shift_assignment.submit()
		profile = frappe.get_doc(
			{
				"doctype": "VIP Entertainer Profile",
				"employee": employee.name,
				"stage_name": "Smoke Anu",
				"active": 1,
			}
		).insert(ignore_permissions=True)

		check = frappe.get_doc(
			{
				"doctype": "VIP Daily Readiness Check",
				"entertainer": profile.name,
				"shift_assignment": shift_assignment.name,
				"result": "READY",
			}
		).insert(ignore_permissions=True)

		if not check.performance_event or not check.point_ledger:
			raise AssertionError("Readiness did not create its event and point ledger.")
		policy_points = frappe.db.get_value("VIP Ranking Policy", check.ranking_policy, "ready_points")
		if float(check.point_impact) != float(policy_points):
			raise AssertionError("Readiness points do not match the published policy.")
		if float(frappe.db.get_value("VIP Entertainer Profile", profile.name, "current_points")) != float(
			policy_points
		):
			raise AssertionError("Entertainer points were not updated.")

		duplicate_blocked = False
		try:
			frappe.get_doc(
				{
					"doctype": "VIP Daily Readiness Check",
					"entertainer": profile.name,
					"shift_assignment": shift_assignment.name,
					"result": "READY",
				}
			).insert(ignore_permissions=True)
		except frappe.ValidationError:
			duplicate_blocked = True
		if not duplicate_blocked:
			raise AssertionError("Duplicate readiness was not blocked.")

		reversal = reverse_readiness_points(check, "Smoke test correction")
		if not reversal or float(frappe.db.get_value("VIP Entertainer Profile", profile.name, "current_points")) != 0:
			raise AssertionError("Readiness reversal did not restore the point balance.")

		bonus_event = frappe.get_doc(
			{
				"doctype": "VIP Performance Event",
				"entertainer": profile.name,
				"event_type": "Manual Adjustment",
				"occurred_at": now_datetime(),
				"source": "NOMAD Smoke Test",
				"external_id": "rank-promotion",
				"deduplication_key": make_deduplication_key("NOMAD Smoke Test", "rank-promotion"),
				"verified": 1,
			}
		).insert(ignore_permissions=True)
		frappe.get_doc(
			{
				"doctype": "VIP Point Ledger",
				"entertainer": profile.name,
				"performance_event": bonus_event.name,
				"metric": "Adjustment",
				"points": 300,
				"ranking_policy": check.ranking_policy,
				"posted_at": now_datetime(),
				"reason": "Smoke test rank promotion",
			}
		).insert(ignore_permissions=True)
		update_profile_points(profile.name)
		rank = frappe.db.get_value("VIP Entertainer Profile", profile.name, "current_rank")
		rank_history = frappe.db.count("VIP Rank History", {"entertainer": profile.name})
		if rank != "Gold" or rank_history != 0:
			raise AssertionError("Point recalculation changed the human-approved rank.")

		return {
			"status": "passed",
			"readiness_result": check.result,
			"point_impact": check.point_impact,
			"reversal_posted": bool(reversal),
			"rank": rank,
			"rank_history_rows": rank_history,
			"duplicate_blocked": duplicate_blocked,
		}
	finally:
		frappe.db.rollback(save_point="nomad_vip_smoke")
