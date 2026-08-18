import frappe


def enable_mongolian():
	if frappe.db.exists("Language", "mn"):
		frappe.db.set_value("Language", "mn", "enabled", 1, update_modified=False)
	frappe.db.set_single_value("System Settings", "language", "mn")
	system_users = frappe.get_all("User", filters={"enabled": 1, "user_type": "System User"}, pluck="name")
	for user in system_users:
		frappe.db.set_value("User", user, "language", "mn", update_modified=False)
		frappe.defaults.set_user_default("lang", "mn", user)
		frappe.defaults.set_user_default("language", "mn", user)
	frappe.defaults.set_global_default("lang", "mn")
	frappe.defaults.set_global_default("language", "mn")
	frappe.defaults.set_user_default("lang", "mn", "Administrator")
	frappe.defaults.set_user_default("language", "mn", "Administrator")
	frappe.db.commit()
	frappe.clear_cache()
	return {
		"system_language": frappe.db.get_single_value("System Settings", "language"),
		"administrator_language": frappe.db.get_value("User", "Administrator", "language"),
		"global_lang": frappe.defaults.get_global_default("lang"),
		"user_lang": frappe.defaults.get_user_default("lang", "Administrator"),
		"updated_system_users": len(system_users),
	}
