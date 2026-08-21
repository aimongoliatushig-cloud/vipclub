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
		if self.ranking_component:
			expected_types = {
				"attendance": "Ranking Attendance Score",
				"customer_complaints": "Ranking Customer Complaints Score",
				"sales": "Ranking Sales Score",
				"entertaining_skill": "Ranking Entertaining Skill Score",
				"cleanliness_beauty": "Ranking Cleanliness Beauty Score",
				"personal_development": "Ranking Personal Development Score",
				"entertainer_attitude": "Ranking Attitude Score",
			}
			if not self.scoring_date:
				frappe.throw(_("Зэрэглэлийн үзүүлэлтэд тооцох өдөр шаардлагатай."))
			if self.event_type != expected_types.get(self.ranking_component):
				frappe.throw(_("Зэрэглэлийн үзүүлэлт ба event type зөрүүтэй байна."))
			if not self.verified:
				frappe.throw(_("Зөвхөн баталгаажсан нормчилсон үзүүлэлтийг зэрэглэлд тооцно."))
			if self.component_score is None:
				frappe.throw(_("Зэрэглэлийн үзүүлэлтэд 0-100 нормчилсон оноо шаардлагатай."))
			if float(self.component_score) < 0 or float(self.component_score) > 100:
				frappe.throw(_("Зэрэглэлийн үзүүлэлтийн оноо 0-100 байна."))
			try:
				frappe.parse_json(self.evidence_json or "{}")
			except Exception:
				frappe.throw(_("Зэрэглэлийн нотлох баримт зөв JSON байна."))

	def on_trash(self):
		frappe.throw(_("Performance events cannot be deleted."))
