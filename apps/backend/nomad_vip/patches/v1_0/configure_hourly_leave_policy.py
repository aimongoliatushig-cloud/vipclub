import frappe


def execute():
	# A dancer may use hourly leave three times per calendar month. For the
	# overnight shift it excuses arrival only until midnight; a later arrival
	# receives the fixed absence penalty while the recorded arrival stays valid.
	frappe.db.set_single_value("VIP Attendance Policy", "emergency_leave_monthly_limit", 3)
	frappe.db.set_single_value("VIP Attendance Policy", "hourly_leave_arrival_deadline", "00:00:00")
