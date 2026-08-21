import frappe


SHIFT_TYPE = "VIP Night Shift"
START_TIME = "22:00:00"
END_TIME = "04:00:00"


def execute():
	values = {"start_time": START_TIME, "end_time": END_TIME}
	if frappe.db.exists("Shift Type", SHIFT_TYPE):
		frappe.db.set_value("Shift Type", SHIFT_TYPE, values)
		return
	frappe.get_doc({
		"doctype": "Shift Type",
		"name": SHIFT_TYPE,
		**values,
	}).insert(ignore_permissions=True)
