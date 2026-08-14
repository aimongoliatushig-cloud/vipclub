from __future__ import annotations

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import getdate, now_datetime

from nomad_vip.services import PRIVILEGED_ROLES, get_branch_for_user


OPEN_STATUSES = ("Planned", "Active")


class VIPEntertainerBranchAssignment(Document):
	def before_insert(self):
		self.assigned_by = frappe.session.user
		self.assigned_at = now_datetime()

	def validate(self):
		self._load_employee()
		self._validate_dates()
		self._validate_branch_authority()
		self._validate_overlap_exception()
		self._validate_overlap()

	def _load_employee(self):
		profile = frappe.db.get_value(
			"VIP Entertainer Profile", self.entertainer, ["employee", "active"], as_dict=True
		)
		if not profile:
			frappe.throw(_("Бүжигчний профайл олдсонгүй."))
		if not profile.active and self.assignment_status in OPEN_STATUSES:
			frappe.throw(_("Идэвхгүй бүжигчинд нээлттэй салбарын томилгоо үүсгэх боломжгүй."))
		self.employee = profile.employee

	def _validate_dates(self):
		if self.effective_to and getdate(self.effective_to) < getdate(self.effective_from):
			frappe.throw(_("Дуусах огноо эхлэх огнооноос өмнө байж болохгүй."))

	def _validate_branch_authority(self):
		roles = set(frappe.get_roles())
		if frappe.session.user == "Administrator" or roles.intersection(PRIVILEGED_ROLES | {"HR Manager"}):
			return
		if "Branch Manager" not in roles or get_branch_for_user() != self.branch:
			frappe.throw(_("Та зөвхөн өөрийн салбарт бүжигчин томилох эрхтэй."), frappe.PermissionError)
		if self.allow_overlap:
			frappe.throw(_("Давхардсан томилгоог зөвхөн хүний нөөц эсвэл системийн менежер зөвшөөрнө."), frappe.PermissionError)

	def _validate_overlap_exception(self):
		if self.allow_overlap and not str(self.reason or "").strip():
			frappe.throw(_("Давхардсан хуваарийг зөвшөөрөх бол шалтгаан оруулна уу."))

	def _validate_overlap(self):
		if self.assignment_status not in OPEN_STATUSES:
			return

		# Serialize every open assignment validation for one entertainer. Without
		# this row lock, two concurrent inserts can both pass the overlap query.
		frappe.db.sql(
			"select name from `tabVIP Entertainer Profile` where name = %s FOR UPDATE",
			(self.entertainer,),
		)
		if self.allow_overlap:
			return

		end_date = self.effective_to or "9999-12-31"
		overlap = frappe.db.sql(
			"""
			select name
			from `tabVIP Entertainer Branch Assignment`
			where entertainer = %(entertainer)s
			  and name != %(name)s
			  and assignment_status in ('Planned', 'Active')
			  and effective_from <= %(end_date)s
			  and coalesce(effective_to, '9999-12-31') >= %(start_date)s
			limit 1
			""",
			{
				"entertainer": self.entertainer,
				"name": self.name or "",
				"start_date": self.effective_from,
				"end_date": end_date,
			},
		)
		if overlap:
			frappe.throw(_("Энэ бүжигчинд хугацаа давхардсан нээлттэй салбарын томилгоо байна."))
