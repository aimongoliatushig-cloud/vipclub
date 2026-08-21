from __future__ import annotations

from datetime import time

import frappe
from frappe.utils import get_datetime, get_time, now_datetime


REMINDER_START_TIME = time(22, 0)
REMINDER_SUBJECT = "22:00 ээлж эхлэхэд 10 минут үлдлээ"


def _scheduled_entertainers(work_date):
	return frappe.db.sql(
		"""
		select
			sa.name as assignment,
			sa.shift_type,
			e.name as employee,
			e.employee_name,
			e.user_id,
			e.branch,
			p.stage_name,
			st.start_time,
			st.end_time
		from `tabShift Assignment` sa
		inner join `tabEmployee` e on e.name = sa.employee
		inner join `tabVIP Entertainer Profile` p on p.employee = e.name
		inner join `tabShift Type` st on st.name = sa.shift_type
		where sa.docstatus = 1
			and sa.status = 'Active'
			and sa.start_date <= %(work_date)s
			and (sa.end_date is null or sa.end_date >= %(work_date)s)
			and e.status = 'Active'
			and e.user_id is not null
			and e.user_id != ''
			and p.active = 1
			and (p.lifecycle_status is null or p.lifecycle_status in ('', 'Active'))
		order by e.user_id asc, sa.creation desc
		""",
		{"work_date": work_date},
		as_dict=True,
	)


def send_shift_start_reminders(reference=None):
	"""Create one persistent 21:50 reminder for each scheduled 22:00 entertainer.

	The scheduler may retry, so the Notification Log is deduplicated per user and
	operational date. A realtime event is also emitted for an already-open client.
	"""
	moment = get_datetime(reference or now_datetime())
	work_date = moment.date()
	day_start = f"{work_date} 00:00:00"
	day_end = f"{work_date} 23:59:59"
	created = 0
	skipped = 0
	seen_users: set[str] = set()

	for row in _scheduled_entertainers(work_date):
		if get_time(row.start_time) != REMINDER_START_TIME or row.user_id in seen_users:
			continue
		seen_users.add(row.user_id)
		if frappe.db.exists(
			"Notification Log",
			{
				"for_user": row.user_id,
				"subject": REMINDER_SUBJECT,
				"creation": ["between", [day_start, day_end]],
			},
		):
			skipped += 1
			continue

		content = (
			"Өнөөдрийн 22:00–04:00 ээлж эхлэх гэж байна. "
			"Ажилдаа бэлдээд QR кодоо уншуулж ирцээ бүртгүүлээрэй."
		)
		notification = frappe.get_doc(
			{
				"doctype": "Notification Log",
				"subject": REMINDER_SUBJECT,
				"email_content": content,
				"for_user": row.user_id,
				"from_user": "Administrator",
				"type": "Alert",
				"document_type": "Shift Assignment",
				"document_name": row.assignment,
			}
		).insert(ignore_permissions=True)
		frappe.publish_realtime(
			"vip_shift_reminder",
			{
				"name": notification.name,
				"subject": REMINDER_SUBJECT,
				"message": content,
				"work_date": str(work_date),
				"shift_start": "22:00",
				"branch": row.branch,
			},
			user=row.user_id,
		)
		created += 1

	frappe.db.commit()
	return {"work_date": str(work_date), "eligible": len(seen_users), "created": created, "skipped": skipped}
