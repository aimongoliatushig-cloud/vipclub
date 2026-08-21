import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt


class VIPBranchAttendanceQR(Document):
	def validate(self):
		if flt(self.sales_full_score_amount) < 0:
			frappe.throw(_("Борлуулалтын бүтэн онооны босго сөрөг байж болохгүй."), frappe.ValidationError)
