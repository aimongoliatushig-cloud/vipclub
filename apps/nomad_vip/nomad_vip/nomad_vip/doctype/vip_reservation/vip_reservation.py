import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import get_datetime


ALLOWED_TRANSITIONS = {
	"Draft": {"Assigned", "Cancelled"},
	"Assigned": {"Acknowledged", "Conflict", "Cancelled"},
	"Acknowledged": {"Completed", "Cancelled", "Customer No-show"},
	"Conflict": {"Assigned", "Cancelled"},
	"Completed": set(),
	"Cancelled": set(),
	"Customer No-show": set(),
}


class VIPReservation(Document):
	def validate(self):
		if get_datetime(self.ends_at) <= get_datetime(self.starts_at):
			frappe.throw(_("Reservation end time must be after the start time."))

		if self.entertainer:
			profile_branch = frappe.db.get_value("VIP Entertainer Profile", self.entertainer, "branch")
			if profile_branch and self.branch and profile_branch != self.branch:
				frappe.throw(_("The entertainer belongs to another branch."))

		before = self.get_doc_before_save()
		if before and before.status != self.status:
			allowed = ALLOWED_TRANSITIONS.get(before.status, set())
			if self.status not in allowed:
				frappe.throw(_("Reservation cannot move from {0} to {1}.").format(before.status, self.status))
		if self.status == "Conflict" and not (self.conflict_reason or "").strip():
			frappe.throw(_("A conflict reason is required."))
