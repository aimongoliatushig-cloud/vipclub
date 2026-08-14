import frappe
from frappe.model.document import Document


class VIPAvailabilityEvent(Document):
	def before_save(self):
		if not self.is_new():
			frappe.throw("Availability events are append-only.", frappe.PermissionError)

	def on_trash(self):
		frappe.throw("Availability events cannot be deleted.", frappe.PermissionError)
