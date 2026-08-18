from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import get_first_day, getdate

from nomad_vip.integrations.finex import VIP_BRANCHES


class VIPBranchSalesGoal(Document):
	def validate(self):
		if self.branch not in VIP_BRANCHES:
			frappe.throw(_("Хүчинтэй VIP салбар сонгоно уу."), frappe.ValidationError)
		if not self.goal_month:
			frappe.throw(_("Зорилгын сар шаардлагатай."), frappe.ValidationError)
		self.goal_month = get_first_day(getdate(self.goal_month))
		self.unique_key = f"{self.branch}|{self.goal_month}"
		if self.proposed_target is not None and self.proposed_target < 0:
			frappe.throw(_("Санал болгосон зорилт сөрөг байж болохгүй."), frappe.ValidationError)
		if self.approved_target is not None and self.approved_target < 0:
			frappe.throw(_("Баталсан зорилт сөрөг байж болохгүй."), frappe.ValidationError)
