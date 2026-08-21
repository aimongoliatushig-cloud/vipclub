from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document


ALLOWED_CATEGORIES = {"Positive", "Concern", "Support"}


class VIPTeamClimateFeedback(Document):
	def validate(self):
		self.feedback = (self.feedback or "").strip()
		if self.category not in ALLOWED_CATEGORIES:
			frappe.throw(_("Саналын төрөл хүчин төгөлдөр биш байна."), frappe.ValidationError)
		if len(self.feedback) < 10 or len(self.feedback) > 500:
			frappe.throw(_("Саналаа 10–500 тэмдэгтэд багтааж бичнэ үү."), frappe.ValidationError)
		if self.sender_entertainer == self.target_entertainer:
			frappe.throw(_("Өөртөө санал өгөх боломжгүй."), frappe.ValidationError)
		if not self.sender_entertainer or not self.target_entertainer:
			frappe.throw(_("Санал илгээгч болон хүлээн авагчийг сонгоно уу."), frappe.ValidationError)

		sender = frappe.db.get_value(
			"VIP Entertainer Profile", self.sender_entertainer,
			["employee", "branch", "active", "lifecycle_status"], as_dict=True,
		)
		target = frappe.db.get_value(
			"VIP Entertainer Profile", self.target_entertainer,
			["employee", "branch", "active", "lifecycle_status"], as_dict=True,
		)
		if not sender or not target or not sender.active or not target.active:
			frappe.throw(_("Идэвхтэй бүжигчний бүртгэл сонгоно уу."), frappe.ValidationError)
		if sender.lifecycle_status not in (None, "", "Active") or target.lifecycle_status not in (None, "", "Active"):
			frappe.throw(_("Идэвхтэй бүжигчний бүртгэл сонгоно уу."), frappe.ValidationError)
		if sender.branch != target.branch or self.branch != sender.branch:
			frappe.throw(_("Зөвхөн өөрийн салбарын бүжигчинд санал өгнө."), frappe.PermissionError)
		if self.sender_employee != sender.employee or self.target_employee != target.employee:
			frappe.throw(_("Бүжигчний ажилтны бүртгэл зөрүүтэй байна."), frappe.ValidationError)

