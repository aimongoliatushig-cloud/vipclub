import frappe


def execute():
	for name in frappe.get_all("VIP Branch Attendance QR", pluck="name"):
		if not frappe.db.get_value("VIP Branch Attendance QR", name, "late_after_time"):
			frappe.db.set_value(
				"VIP Branch Attendance QR",
				name,
				"late_after_time",
				"22:00:00",
				update_modified=False,
			)
