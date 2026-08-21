import frappe
from frappe import _
from frappe.model.document import Document


IMMUTABLE_FIELDS = (
	"entertainer",
	"employee",
	"branch",
	"requested_by",
	"requested_at",
	"base_profile_modified",
	"base_values",
	"changed_fields",
	"proposed_stage_name",
	"proposed_skills",
	"proposed_languages",
	"proposed_service_tags",
	"proposed_style_tags",
	"proposed_profile_photo",
	"idempotency_key",
)
TERMINAL_STATUSES = {"Approved", "Rejected", "Withdrawn"}


class VIPEntertainerProfileChangeRequest(Document):
	def validate(self):
		if self.status not in {"Pending", *TERMINAL_STATUSES}:
			frappe.throw(_("Профайлын хүсэлтийн төлөв буруу байна."), frappe.ValidationError)
		if not self.is_new():
			previous = frappe.db.get_value(
				self.doctype,
				self.name,
				[*IMMUTABLE_FIELDS, "status"],
				as_dict=True,
			)
			if previous:
				for fieldname in IMMUTABLE_FIELDS:
					if str(previous.get(fieldname) or "") != str(self.get(fieldname) or ""):
						frappe.throw(_("Профайлын хүсэлтийн санал болгосон мэдээллийг өөрчлөх боломжгүй."), frappe.ValidationError)
				if previous.status in TERMINAL_STATUSES and self.status != previous.status:
					frappe.throw(_("Шийдвэрлэсэн хүсэлтийн төлөвийг дахин өөрчлөх боломжгүй."), frappe.ValidationError)
		if self.status in TERMINAL_STATUSES and not (self.decided_by and self.decided_at and self.decision_reason):
			frappe.throw(_("Шийдвэр гаргасан хүн, хугацаа, үндэслэл шаардлагатай."), frappe.ValidationError)

