import frappe

from nomad_vip.api.management import get_company_dashboard, get_session


def execute():
	"""Exercise the CEO dashboard without returning customer or employee rows."""
	original = frappe.session.user
	out = {}
	try:
		frappe.set_user("Administrator")
		session = get_session()
		dashboard = get_company_dashboard()
		out = {
			"session_role": session["role"],
			"csrf_http_only": session.get("csrf_token") is None,
			"branch_count": len(dashboard["branches"]),
			"pending_goals": dashboard["totals"]["pending_goals"],
			"actual_sales_available": dashboard["totals"]["actual_sales"] is not None,
		}
	finally:
		frappe.set_user(original)
	return out
