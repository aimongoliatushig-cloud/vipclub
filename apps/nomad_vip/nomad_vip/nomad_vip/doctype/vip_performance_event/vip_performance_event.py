import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime

from nomad_vip.services import make_deduplication_key


class VIPPerformanceEvent(Document):
	def before_insert(self):
		self.occurred_at = self.occurred_at or now_datetime()
		if self.source and self.external_id and not self.deduplication_key:
			self.deduplication_key = make_deduplication_key(self.source, self.external_id)

	def validate(self):
		if not self.is_new():
			frappe.throw(_("Performance events are immutable. Post a reversal event instead."))

	def on_trash(self):
		frappe.throw(_("Performance events cannot be deleted."))
