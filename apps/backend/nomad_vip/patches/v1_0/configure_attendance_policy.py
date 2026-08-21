import frappe


def execute():
	values = {
		"absence_deduction": 150000,
		"late_deduction_per_minute": 500,
		"same_day_request_deadline": "09:00:00",
		"emergency_leave_monthly_limit": 2,
		"timezone": "Asia/Ulaanbaatar",
	}
	for fieldname, value in values.items():
		frappe.db.set_single_value("VIP Attendance Policy", fieldname, value)
