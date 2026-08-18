import frappe


def execute():
	"""Return aggregate-only workforce mapping evidence; never return employee rows."""
	active = frappe.get_all(
		"Employee",
		filters={"status": "Active"},
		fields=["branch", "department", "designation"],
		ignore_permissions=True,
		limit_page_length=0,
	)
	by_branch = {}
	for row in active:
		branch = row.branch or "(unset)"
		by_branch[branch] = by_branch.get(branch, 0) + 1
	return {
		"active_total": len(active),
		"with_branch": sum(1 for row in active if row.branch),
		"by_branch": dict(sorted(by_branch.items())),
		"with_department": sum(1 for row in active if row.department),
		"with_designation": sum(1 for row in active if row.designation),
	}
