import re

import frappe
from frappe import _
from frappe.model.document import Document


class VIPPhoneReservation(Document):
	def validate(self):
		self.phone = re.sub(r"\D", "", self.phone or "")[-8:]
		if len(self.phone) != 8:
			frappe.throw(_("Enter a valid 8-digit phone number"))

	def before_insert(self):
		self.created_by = frappe.session.user
