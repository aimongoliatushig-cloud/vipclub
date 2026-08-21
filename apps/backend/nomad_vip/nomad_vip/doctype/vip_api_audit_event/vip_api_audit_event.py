from __future__ import annotations

import frappe
from frappe.model.document import Document


class VIPAPIAuditEvent(Document):
	def before_save(self):
		if not self.is_new():
			frappe.throw("API audit events are append-only.", frappe.PermissionError)

	def on_trash(self):
		frappe.throw("API audit events cannot be deleted.", frappe.PermissionError)
