import frappe
from frappe import _
from frappe.model.document import Document


class VIPRankingPolicy(Document):
	def validate(self):
		if int(self.evaluation_window_days or 0) <= 0:
			frappe.throw(_("Үнэлгээний хугацаа 0-ээс их байна."))
		weights = [self.sales_weight, self.attendance_weight, self.loyalty_weight, self.behavior_weight]
		if self.evaluation_mode == "Active" and round(sum(float(value or 0) for value in weights), 2) != 100:
			frappe.throw(_("Active горимд дөрвөн хэмжүүрийн жингийн нийлбэр 100% байна."))
		if self.status == "Published":
			other = frappe.db.exists(
				"VIP Ranking Policy", {"status": "Published", "name": ("!=", self.name or "")}
			)
			if other:
				frappe.throw(_("Нэг удаад зөвхөн нэг зэрэглэлийн бодлого нийтлэгдсэн байна."))

	def before_save(self):
		if not self.is_new():
			before = self.get_doc_before_save()
			if before and before.status == "Published":
				protected = (
					"version", "effective_from", "evaluation_mode", "evaluation_window_days",
					"evaluation_cadence", "sales_weight", "attendance_weight",
					"loyalty_weight", "behavior_weight", "ready_points", "not_ready_points",
				)
				if any(self.get(field) != before.get(field) for field in protected):
					frappe.throw(_("Нийтлэгдсэн бодлогыг өөрчлөхгүй. Шинэ хувилбар үүсгэнэ үү."))
