import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime


class VIPRankHistory(Document):
	def before_insert(self):
		self.changed_at = self.changed_at or now_datetime()

	def validate(self):
		if not self.is_new():
			frappe.throw(_("Rank history is immutable."))

	def on_trash(self):
		frappe.throw(_("Rank history cannot be deleted."))
