import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, get_first_day


class VIPMonthlyRankSalesTarget(Document):
	def validate(self):
		self.target_month = get_first_day(self.target_month)
		self.unique_key = f"{self.branch}|{str(self.target_month)[:7]}"
		if flt(self.full_score_amount) <= 0:
			frappe.throw(_("Өдрийн бүтэн онооны босго 0-ээс их байна."), frappe.ValidationError)
		if len((self.reason or "").strip()) < 3:
			frappe.throw(_("Өөрчилсөн шалтгаанаа бичнэ үү."), frappe.ValidationError)
