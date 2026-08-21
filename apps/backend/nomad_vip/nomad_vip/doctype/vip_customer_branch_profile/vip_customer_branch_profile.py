import frappe
from frappe import _
from frappe.model.document import Document


class VIPCustomerBranchProfile(Document):
	def validate(self):
		duplicate = frappe.db.get_value(
			"VIP Customer Branch Profile",
			{"customer": self.customer, "branch": self.branch, "name": ["!=", self.name]},
			"name",
		)
		if duplicate:
			frappe.throw(_("A branch profile already exists for this customer and branch"))
