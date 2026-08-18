import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime


class VIPPointLedger(Document):
	def before_insert(self):
		self.posted_at = self.posted_at or now_datetime()

	def validate(self):
		if not self.is_new():
			frappe.throw(_("Point ledger rows are immutable. Post a reversal row instead."))

	def on_trash(self):
		frappe.throw(_("Point ledger rows cannot be deleted."))
