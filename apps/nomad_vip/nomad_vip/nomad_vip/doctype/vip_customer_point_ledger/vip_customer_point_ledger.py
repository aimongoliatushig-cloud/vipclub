import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime


class VIPCustomerPointLedger(Document):
	def before_insert(self):
		self.posted_at = self.posted_at or now_datetime()
		self.posted_by = self.posted_by or frappe.session.user

	def validate(self):
		if not self.is_new():
			frappe.throw(_("Customer point ledger rows are immutable. Post a reversal row instead."))

	def on_trash(self):
		frappe.throw(_("Customer point ledger rows cannot be deleted."))
