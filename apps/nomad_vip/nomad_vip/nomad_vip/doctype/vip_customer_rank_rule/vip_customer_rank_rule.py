import frappe
from frappe.model.document import Document
from frappe.utils import cint, flt


class VIPCustomerRankRule(Document):
	def validate(self):
		if flt(self.minimum_total_spend) < 0 or cint(self.minimum_visit_count) < 0 or flt(self.minimum_average_bill) < 0:
			frappe.throw("Ranking thresholds cannot be negative")
		duplicate = frappe.db.exists(
			"VIP Customer Rank Rule",
			{"branch": self.branch, "membership_rank": self.membership_rank, "name": ["!=", self.name]},
		)
		if duplicate:
			frappe.throw(f"A {self.membership_rank} rule already exists for {self.branch}")
