from __future__ import annotations

import frappe

from nomad_vip.api.management import (
	get_branch_sales_progress,
	get_manager_customers,
	get_manager_penalties,
	get_manager_team,
	get_session,
)
from nomad_vip.api.attendance_policy import get_manager_leave_requests
from nomad_vip.api.schedule import get_manager_schedule


def execute():
	"""Read-only production smoke check; returns counts and scope, never customer rows."""
	original_user = frappe.session.user
	results = []
	try:
		manager_users = frappe.get_all(
			"Has Role",
			filters={"role": "Branch Manager", "parenttype": "User"},
			pluck="parent",
		)
		for user in manager_users:
			frappe.set_user(user)
			session = get_session()
			customers = get_manager_customers(limit=1)
			penalties = get_manager_penalties(limit=1)
			team = get_manager_team(limit=100)
			schedule = get_manager_schedule(days=7)
			leaves = get_manager_leave_requests(status="All", limit=100)
			sales = get_branch_sales_progress()
			results.append({
				"user": user,
				"branch": session["branch"],
				"session_role": session["role"],
				"customer_count": customers["meta"]["total"],
				"penalty_count": penalties["meta"]["total"],
				"active_team_count": team["meta"]["total"],
				"entertainer_count": team["meta"]["entertainer_total"],
				"schedule_people_count": len(schedule["people"]),
				"leave_count": leaves["meta"]["total"],
				"standard_leave_count": sum(
					1 for row in leaves["requests"] if row.get("source_type") == "Leave Application"
				),
				"sales_actual_available": sales["actual_sales"] is not None,
				"goal_state": sales["goal"].state if sales["goal"] else None,
			})
	finally:
		frappe.set_user(original_user)
	return {"manager_count": len(results), "results": results}
