import frappe
from frappe import _
from frappe.model.document import Document

from nomad_vip.daily_ranking import validate_thresholds, validate_weights


class VIPRankingPolicy(Document):
	def validate(self):
		if int(self.evaluation_window_days or 0) <= 0:
			frappe.throw(_("Үнэлгээний хугацаа 0-ээс их байна."))
		if self.daily_scoring_enabled:
			try:
				validate_weights({
					"attendance": self.attendance_weight,
					"customer_complaints": self.customer_complaints_weight,
					"sales": self.sales_weight,
					"entertaining_skill": self.entertaining_skill_weight,
					"cleanliness_beauty": self.cleanliness_beauty_weight,
					"shift_effort": self.shift_effort_weight,
					"personal_development": self.personal_development_weight,
					"entertainer_attitude": self.entertainer_attitude_weight,
				})
				validate_thresholds({
					"rank_1": self.rank_1_threshold,
					"rank_2": self.rank_2_threshold,
					"rank_3": self.rank_3_threshold,
				})
			except ValueError as exc:
				frappe.throw(_(str(exc)))
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
					"evaluation_cadence", "daily_scoring_enabled", "attendance_weight",
					"customer_complaints_weight", "sales_weight", "entertaining_skill_weight",
					"cleanliness_beauty_weight", "shift_effort_weight",
					"personal_development_weight", "entertainer_attitude_weight",
					"rank_1_threshold", "rank_2_threshold", "rank_3_threshold",
					"ready_points", "not_ready_points",
				)
				if any(self.get(field) != before.get(field) for field in protected):
					frappe.throw(_("Нийтлэгдсэн бодлогыг өөрчлөхгүй. Шинэ хувилбар үүсгэнэ үү."))
