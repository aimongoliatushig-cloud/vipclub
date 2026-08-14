import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import add_days, getdate, now_datetime, today

from nomad_vip.tasks.media_retention import media_retention_days


CONSENT_DECISIONS = {"Granted", "Denied", "Revoked"}
CONSENT_METADATA_FIELDS = (
	"media_consent_version",
	"media_consent_expires_on",
	"media_consent_note",
)
RETENTION_QUEUED_STATUSES = {"Queued", "On Hold"}


class VIPEntertainerProfile(Document):
	def validate(self):
		if not frappe.db.exists("Employee", self.employee):
			frappe.throw(_("Холбогдсон ажилтны бүртгэл олдсонгүй."))
		if not self.current_rank:
			self.current_rank = "Bronze"
		self._normalize_taxonomy_fields()
		self._record_media_consent_change()

		values = frappe.db.get_value(
			"Employee", self.employee, ["employee_name", "user_id", "branch"], as_dict=True
		)
		if values:
			self.employee_name = values.employee_name
			self.user = values.user_id
			self.branch = values.branch
		if not self.active:
			self.lifecycle_status = "Inactive"
		elif self.lifecycle_status == "Inactive":
			self.lifecycle_status = "Active"

	def _normalize_taxonomy_fields(self):
		for fieldname in ("skills", "languages", "service_tags", "style_tags"):
			values = []
			seen = set()
			for raw in (self.get(fieldname) or "").splitlines():
				value = raw.strip()
				key = value.casefold()
				if value and key not in seen:
					seen.add(key)
					values.append(value)
			self.set(fieldname, "\n".join(values))

	def _record_media_consent_change(self):
		previous = None if self.is_new() else self.get_db_value("media_consent_status")
		previous_photo = None if self.is_new() else self.get_db_value("profile_photo")
		metadata_changed = self._consent_metadata_changed()
		if (
			self.profile_photo
			and self.media_consent_status != "Granted"
			and self.profile_photo != previous_photo
		):
			frappe.throw(_("Шинэ профайл зураг оруулахын өмнө зураг ашиглах зөвшөөрөл өгнө үү."))

		if self.media_consent_status == "Granted" and not (self.media_consent_version or "").strip():
			frappe.throw(_("Профайл зураг харуулахын өмнө зөвшөөрлийн хувилбарыг оруулна уу."))
		if (
			self.media_consent_status == "Granted"
			and self.profile_photo
			and self.profile_photo == self.media_retention_file_url
		):
			frappe.throw(
				_("Устгал хүлээж буй зургийг дахин профайл зураг болгон ашиглах боломжгүй."),
				frappe.ValidationError,
			)

		status_changed = previous != self.media_consent_status
		record_change = self.media_consent_status in CONSENT_DECISIONS and (
			status_changed or metadata_changed
		)
		recorded_at = now_datetime() if record_change else self.media_consent_at
		if self.media_consent_status == "Granted" and self.media_consent_expires_on:
			grant_date = getdate(recorded_at or now_datetime())
			if getdate(self.media_consent_expires_on) < grant_date:
				frappe.throw(
					_("Медиа зөвшөөрлийн хугацаа зөвшөөрөл бүртгэсэн өдрөөс өмнө байж болохгүй."),
					frappe.ValidationError,
				)

		if record_change:
			self.media_consent_actor = frappe.session.user
			self.media_consent_at = recorded_at

		if self.media_consent_status in {"Denied", "Revoked"}:
			self._move_photo_to_retention(previous_photo)

		if self.media_consent_status != "Granted" and self.media_retention_file_url:
			frappe.msgprint(_("Өмнөх профайл зураг хадгалалтын хугацаанд байгаа бөгөөд аппад харагдахгүй."))

		self._sync_media_retention_state(previous)

	def _consent_metadata_changed(self) -> bool:
		if self.is_new():
			return any(self.get(fieldname) not in (None, "") for fieldname in CONSENT_METADATA_FIELDS)
		for fieldname in CONSENT_METADATA_FIELDS:
			current = str(self.get(fieldname) or "")
			previous = str(self.get_db_value(fieldname) or "")
			if current != previous:
				return True
		return False

	def _move_photo_to_retention(self, previous_photo: str | None) -> None:
		"""Move hidden media to a retention-only field without losing an older queue."""
		source_photo = self.profile_photo or previous_photo
		retained_photo = self.media_retention_file_url
		if retained_photo and source_photo and retained_photo != source_photo:
			frappe.throw(
				_("Өмнөх медиа устгал дуусаагүй тул шинэ зургийг хадгалалтын дараалалд оруулах боломжгүй."),
				frappe.ValidationError,
			)
		if source_photo and not retained_photo:
			self.media_retention_file_url = source_photo
		# The consented/public reference must disappear immediately even when
		# the same file is already present in the retention-only field.
		if self.profile_photo:
			self.profile_photo = None

	def _sync_media_retention_state(self, previous_consent_status: str | None) -> None:
		"""Keep retention state aligned without deleting media during a request."""
		status = self.media_consent_status
		if status == "Granted":
			if self.media_retention_file_url:
				if not self.media_retention_due_on:
					self.media_retention_due_on = add_days(today(), media_retention_days())
				self.media_retention_completed_at = None
				self.media_retention_status = "On Hold" if self.media_legal_hold else "Queued"
			elif self.media_retention_status != "Deleted":
				self.media_retention_status = "Not Queued"
				self.media_retention_due_on = None
				self.media_retention_completed_at = None
			return

		if status not in {"Denied", "Revoked"}:
			if self.media_retention_status != "Deleted":
				self.media_retention_status = "Not Queued"
				self.media_retention_due_on = None
				self.media_retention_completed_at = None
			return

		if not self.media_retention_file_url:
			if self.media_retention_status != "Deleted":
				self.media_retention_status = "Not Queued"
				self.media_retention_due_on = None
				self.media_retention_completed_at = None
			return

		if not self.media_retention_due_on:
			self.media_retention_due_on = add_days(today(), media_retention_days())
		self.media_retention_completed_at = None
		if self.media_legal_hold:
			self.media_retention_status = "On Hold"
			return

		if (
			previous_consent_status not in {"Denied", "Revoked"}
			or self.media_retention_status not in RETENTION_QUEUED_STATUSES
			or self.media_retention_status == "On Hold"
		):
			self.media_retention_status = "Queued"
