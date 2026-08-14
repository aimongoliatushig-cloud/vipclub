import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime

from nomad_vip.services import post_readiness_points, published_policy


class VIPDailyReadinessCheck(Document):
	def before_insert(self):
		self.supervisor = self.supervisor or frappe.session.user
		self.checked_at = self.checked_at or now_datetime()
		profile = frappe.db.get_value(
			"VIP Entertainer Profile", self.entertainer, ["employee", "branch"], as_dict=True
		)
		if not profile:
			frappe.throw(_("Бүжигчний бүртгэл олдсонгүй."))
		self.employee = profile.employee
		self.branch = profile.branch
		self.ranking_policy = published_policy().name

	def validate(self):
		if self.result == "NOT_READY" and not (self.reason or "").strip():
			frappe.throw(_("Бэлэн бус гэж тэмдэглэсэн шалтгааныг бичнэ үү."))

		if self.shift_assignment:
			assigned_employee = frappe.db.get_value("Shift Assignment", self.shift_assignment, "employee")
			if assigned_employee and self.employee and assigned_employee != self.employee:
				frappe.throw(_("Сонгосон ээлж өөр ажилтанд хамаарч байна."))
			existing = frappe.db.exists(
				"VIP Daily Readiness Check",
				{
					"entertainer": self.entertainer,
					"shift_assignment": self.shift_assignment,
					"name": ("!=", self.name or ""),
				},
			)
			if existing:
				frappe.throw(_("Энэ ээлжийн бэлэн байдлыг өмнө нь бүртгэсэн байна."))

	def after_insert(self):
		event, ledger, points = post_readiness_points(self)
		self.db_set("performance_event", event, update_modified=False)
		self.db_set("point_ledger", ledger, update_modified=False)
		self.db_set("point_impact", points, update_modified=False)

	def on_update(self):
		if not self.is_new() and self.get_doc_before_save():
			before = self.get_doc_before_save()
			protected = ("entertainer", "shift_assignment", "result", "reason")
			if any(self.get(field) != before.get(field) for field in protected):
				frappe.throw(_("Баталсан бэлэн байдлыг шууд засахгүй. Менежер буцаалт бүртгэнэ."))
