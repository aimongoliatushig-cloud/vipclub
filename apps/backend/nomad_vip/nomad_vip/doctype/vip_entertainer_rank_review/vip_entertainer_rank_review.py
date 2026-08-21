from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document


class VIPEntertainerRankReview(Document):
	def validate(self):
		if self.is_new():
			if self.status != "Submitted":
				frappe.throw(_("Шинэ зэрэглэлийн санал Submitted төлөвтэй байна."), frappe.ValidationError)
			if not self.evidence_hash or not self.evidence_json:
				frappe.throw(_("Зэрэглэлийн санал нотолгооны snapshot-той байна."), frappe.ValidationError)
			return
		if not getattr(self.flags, "allow_rank_review_update", False):
			frappe.throw(_("Зэрэглэлийн хүсэлтийг зөвхөн баталгаатай API-аар шийдвэрлэнэ."), frappe.PermissionError)

	def on_trash(self):
		frappe.throw(_("Зэрэглэлийн шийдвэрийн түүхийг устгах боломжгүй."), frappe.PermissionError)
