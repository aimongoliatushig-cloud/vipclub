import frappe


def execute():
	# NOMAD's operational shift runs overnight. A leave request for the selected
	# shift date closes at 21:00 on the previous calendar day.
	frappe.db.set_single_value("VIP Attendance Policy", "same_day_request_deadline", "21:00:00")
