import hashlib

from frappe.model.document import Document


class VIPFinexScheduleSnapshot(Document):
	def autoname(self):
		identity = f"{self.finex_dancer_id}|{self.work_date}".encode("utf-8")
		self.name = f"FINEX-SCH-{hashlib.sha1(identity).hexdigest()[:20]}"
