import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt


class VIPEntertainerDailyRankSnapshot(Document):
	def validate(self):
		if self.status == "Complete":
			if not self.calculated_rank:
				frappe.throw(_("Бүрэн өдрийн тооцоонд зэрэглэл шаардлагатай."))
			if flt(self.weighted_score) < 0 or flt(self.weighted_score) > 100:
				frappe.throw(_("Өдрийн зэрэглэлийн оноо 0-100 байна."))
		elif self.calculated_rank:
			frappe.throw(_("Дутуу эсвэл алдаатай тооцоонд зэрэглэл тогтоохгүй."))

	def before_save(self):
		if not self.is_new() and not getattr(self.flags, "daily_rank_refresh", False):
			frappe.throw(_("Өдрийн зэрэглэлийн snapshot-ийг зөвхөн системийн шинэчлэлт өөрчилнө."))

	def on_trash(self):
		frappe.throw(_("Өдрийн зэрэглэлийн snapshot-ийг устгахгүй."))
