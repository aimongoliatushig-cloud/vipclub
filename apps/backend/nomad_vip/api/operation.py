import re
from datetime import timedelta

import frappe
from frappe import _
from frappe.utils import add_days, get_datetime, getdate, now_datetime, today

from nomad_vip.services import get_branch_for_user, require_any_role
from nomad_vip.api.entry_day import operational_window


def _branch():
	branch = get_branch_for_user()
	if not branch:
		frappe.throw(_("Your user is not assigned to a branch"), frappe.PermissionError)
	from nomad_vip.api.entry_access import require_entry_access
	return require_entry_access(branch)


def _reservation_branch(branch=None):
	"""Resolve the target branch for a reservation.

	The central Operation account can work across all VIP branches, while a branch
	manager remains restricted to the branch assigned to their Employee record.
	"""
	from nomad_vip.integrations.finex import VIP_BRANCHES

	roles = set(frappe.get_roles())
	if "Operation" in roles and "Branch Manager" not in roles:
		if branch not in VIP_BRANCHES:
			frappe.throw(_("Select a valid VIP branch"))
		return branch

	assigned_branch = get_branch_for_user()
	if not assigned_branch:
		frappe.throw(_("Таны хэрэглэгчид салбар оноогоогүй байна."), frappe.PermissionError)
	if branch and branch != assigned_branch:
		frappe.throw(_("You cannot update another branch's reservation"), frappe.PermissionError)
	return assigned_branch


def _phone_digits(value):
	return re.sub(r"\D", "", value or "")[-8:]


def _ensure_customer(customer_name, phone):
	from nomad_vip.api.customer import _find_customer_by_phone

	customer = _find_customer_by_phone(phone)
	if customer:
		return customer

	from nomad_vip.integrations.finex import VIP_BRANCHES, _customer_group, _territory, ensure_vip_branches
	ensure_vip_branches()
	doc = frappe.get_doc({
		"doctype": "Customer",
		"customer_name": customer_name or phone,
		"customer_type": "Individual",
		"customer_group": _customer_group(),
		"territory": _territory(),
		"mobile_no": phone,
		"custom_finex_phone": phone,
	}).insert(ignore_permissions=True)
	for branch in VIP_BRANCHES:
		frappe.get_doc({
			"doctype": "VIP Customer Branch Profile",
			"customer": doc.name,
			"branch": branch,
			"membership_rank": "Unassigned",
		}).insert(ignore_permissions=True)
	return doc.name


def _serialize(row):
	return {
		**row,
		"order_items": [line.strip() for line in (row.get("order_details") or "").splitlines() if line.strip()],
	}


def _with_branch_bans(rows, branch):
	"""Attach branch-scoped access status without leaking another branch's ban."""
	customers = list({row.get("customer") for row in rows if row.get("customer")})
	profiles = frappe.get_all(
		"VIP Customer Branch Profile",
		filters={"branch": branch, "customer": ["in", customers]},
		fields=["customer", "is_banned", "ban_reason", "banned_by", "banned_at"],
		limit_page_length=0,
	) if customers else []
	by_customer = {row.customer: row for row in profiles}
	result = []
	for row in rows:
		profile = by_customer.get(row.get("customer"))
		serialized = _serialize(row)
		serialized.update({
			"is_banned": int(profile.is_banned or 0) if profile else 0,
			"ban_reason": profile.ban_reason or "" if profile else "",
			"banned_by": profile.banned_by if profile else None,
			"banned_at": profile.banned_at if profile else None,
		})
		result.append(serialized)
	return result


def get_active_reservations(phone, branch):
	_, window_start, window_end = operational_window(now_datetime())
	return [
		_serialize(row)
		for row in frappe.get_all(
			"VIP Phone Reservation",
			filters=[
				["VIP Phone Reservation", "branch", "=", branch],
				["VIP Phone Reservation", "phone", "=", _phone_digits(phone)],
				["VIP Phone Reservation", "status", "=", "Scheduled"],
				["VIP Phone Reservation", "expected_at", ">=", window_start],
				["VIP Phone Reservation", "expected_at", "<", window_end],
			],
			fields=["name", "customer_name", "phone", "expected_at", "party_size", "order_details", "notes", "status"],
			order_by="expected_at asc",
			limit_page_length=20,
		)
	]


def _validate_work_date(value):
	day, window_start, window_end = operational_window(now_datetime(), value)
	current_day, _, _ = operational_window(now_datetime())
	if day < getdate(add_days(current_day, -31)) or day > getdate(add_days(current_day, 7)):
		frappe.throw(_("Сонгосон өдөр зөвшөөрөгдсөн хүрээнээс гадуур байна"))
	return day, window_start, window_end, day == current_day


def _daily_reservations(branch, window_start, window_end, limit=100, status=None):
	filters = [
		["VIP Phone Reservation", "branch", "=", branch],
		["VIP Phone Reservation", "expected_at", ">=", window_start],
		["VIP Phone Reservation", "expected_at", "<", window_end],
	]
	if status:
		filters.append(["VIP Phone Reservation", "status", "=", status])
	return frappe.get_all(
		"VIP Phone Reservation",
		filters=filters,
		fields=["name", "customer", "customer_name", "phone", "expected_at", "party_size", "order_details", "notes", "status", "arrived_at", "entry_event"],
		order_by="expected_at asc",
		limit_page_length=min(max(int(limit or 100), 1), 200),
	)


def _daily_entries(branch, window_start, window_end, limit=100):
	return frappe.get_all(
		"VIP Customer Entry Event",
		filters=[
			["VIP Customer Entry Event", "branch", "=", branch],
			["VIP Customer Entry Event", "entered_at", ">=", window_start],
			["VIP Customer Entry Event", "entered_at", "<", window_end],
		],
		fields=["name", "customer", "customer_name_snapshot as customer_name", "membership_rank_snapshot as membership_rank", "entered_at", "visit_number"],
		order_by="entered_at desc",
		limit_page_length=min(max(int(limit or 100), 1), 200),
	)


def _daily_summary(branch, window_start, window_end):
	reservation_counts = frappe.db.sql(
		"""
		select status, count(*) as total
		from `tabVIP Phone Reservation`
		where branch = %(branch)s
			and expected_at >= %(window_start)s
			and expected_at < %(window_end)s
		group by status
		""",
		{"branch": branch, "window_start": window_start, "window_end": window_end},
		as_dict=True,
	)
	by_status = {row.status: int(row.total or 0) for row in reservation_counts}
	entry_total = frappe.db.sql(
		"""
		select count(*)
		from `tabVIP Customer Entry Event`
		where branch = %(branch)s
			and entered_at >= %(window_start)s
			and entered_at < %(window_end)s
		""",
		{"branch": branch, "window_start": window_start, "window_end": window_end},
	)[0][0]
	return {
		"waiting": by_status.get("Scheduled", 0),
		"arrived": int(entry_total or 0),
		"cancelled": by_status.get("Cancelled", 0),
	}


@frappe.whitelist()
def get_daily_entry_workspace(branch=None, work_date=None, limit=100):
	"""One clearly bounded entrance workday for Guard and Operator.

	Reservations and direct admissions are merged without duplicating an arrived
	reservation.  Branch and role scope are always resolved on the server.
	"""
	require_any_role("Reception", "Operation", "Branch Manager")
	roles = set(frappe.get_roles())
	if roles.intersection({"Operation", "Branch Manager"}):
		resolved_branch = _reservation_branch(branch)
	else:
		resolved_branch = _branch()
		if branch and branch != resolved_branch:
			frappe.throw(_("Өөр салбарын үүдний мэдээлэл харах эрхгүй"), frappe.PermissionError)

	day, window_start, window_end, is_current = _validate_work_date(work_date)
	reservations = _with_branch_bans(
		_daily_reservations(resolved_branch, window_start, window_end, limit),
		resolved_branch,
	)
	entries = _daily_entries(resolved_branch, window_start, window_end, limit)
	linked_entries = {
		row[0]
		for row in frappe.db.sql(
			"""
			select entry_event
			from `tabVIP Phone Reservation`
			where branch = %(branch)s
				and expected_at >= %(window_start)s
				and expected_at < %(window_end)s
				and coalesce(entry_event, '') != ''
			""",
			{"branch": resolved_branch, "window_start": window_start, "window_end": window_end},
		)
	}
	items = [
		{
			**row,
			"kind": "reservation",
			"actual_at": row.get("arrived_at"),
		}
		for row in reservations
	]
	direct_items = _with_branch_bans([
		{
			"name": row.name,
			"kind": "direct",
			"customer": row.customer,
			"customer_name": row.customer_name,
			"phone": "",
			"expected_at": row.entered_at,
			"actual_at": row.entered_at,
			"party_size": 1,
			"status": "Arrived",
			"membership_rank": row.membership_rank,
			"visit_number": row.visit_number,
			"order_items": [],
			"notes": "",
		}
		for row in entries
		if row.name not in linked_entries
	], resolved_branch)
	items.extend(direct_items)
	status_order = {"Scheduled": 0, "Arrived": 1, "Cancelled": 2}
	items.sort(
		key=lambda row: (
			status_order.get(row.get("status"), 3),
			str(row.get("actual_at") or row.get("expected_at") or ""),
		),
		reverse=False,
	)
	return {
		"branch": resolved_branch,
		"work_date": str(day),
		"window_start": window_start,
		"window_end": window_end,
		"is_current": is_current,
		"summary": _daily_summary(resolved_branch, window_start, window_end),
		"items": items,
	}


@frappe.whitelist()
def create_phone_reservation(customer_name, phone, party_size=1, branch=None, expected_at=None, order_details=None, notes=None):
	require_any_role("Operation", "Branch Manager")
	branch = _reservation_branch(branch)
	name = (customer_name or "").strip()
	digits = _phone_digits(phone)
	if len(digits) != 8:
		frappe.throw(_("Enter a valid 8-digit phone number"))
	name = name or digits
	if len(name) > 140:
		frappe.throw(_("Зочны нэр 140 тэмдэгтээс урт байж болохгүй."), frappe.ValidationError)
	clean_notes = (notes or "").strip()
	clean_order_details = (order_details or "").strip()
	if len(clean_notes) > 500:
		frappe.throw(_("Нэмэлт тайлбар 500 тэмдэгтээс урт байж болохгүй."), frappe.ValidationError)
	if len(clean_order_details) > 1000:
		frappe.throw(_("Захиалгын задаргаа 1000 тэмдэгтээс урт байж болохгүй."), frappe.ValidationError)
	try:
		party_count = int(party_size or 1)
	except (TypeError, ValueError):
		frappe.throw(_("Зочны тоо бүхэл тоо байна."), frappe.ValidationError)
	if party_count < 1 or party_count > 99:
		frappe.throw(_("Зочны тоо 1-99 хооронд байна."), frappe.ValidationError)

	moment = now_datetime()
	_, window_start, window_end = operational_window(moment)
	expected = get_datetime(expected_at) if expected_at else moment
	if expected < moment - timedelta(minutes=5):
		frappe.throw(_("Ирэх цаг өнгөрсөн байна. Одоогийн эсвэл дараах цаг сонгоно уу."), frappe.ValidationError)
	if not window_start <= expected < window_end:
		frappe.throw(_("Ирэх цаг өнөөдрийн үүдний ажлын өдөрт багтахгүй байна."), frappe.ValidationError)

	from nomad_vip.api.locking import database_lock
	with database_lock("customer-phone", digits):
		customer = _ensure_customer(name, digits)
	with database_lock("phone-reservation", branch, digits, window_start):
		existing = frappe.get_all(
			"VIP Phone Reservation",
			filters=[
				["VIP Phone Reservation", "branch", "=", branch],
				["VIP Phone Reservation", "phone", "=", digits],
				["VIP Phone Reservation", "status", "=", "Scheduled"],
				["VIP Phone Reservation", "expected_at", ">=", window_start],
				["VIP Phone Reservation", "expected_at", "<", window_end],
			],
			fields=["name", "expected_at"],
			order_by="expected_at asc",
			limit_page_length=1,
		)
		if existing:
			frappe.throw(_("Энэ дугаарт өнөөдрийн идэвхтэй захиалга байна. Өмнөх захиалгыг цуцалж байж шинээр үүсгэнэ үү."), frappe.ValidationError)
		doc = frappe.get_doc({
			"doctype": "VIP Phone Reservation",
			"branch": branch,
			"customer": customer,
			"customer_name": name,
			"phone": digits,
			"expected_at": expected,
			"party_size": party_count,
			"order_details": clean_order_details,
			"notes": clean_notes,
			"status": "Scheduled",
		}).insert(ignore_permissions=True)
	from nomad_vip.api.entry import _manager_users, _operation_users, _reception_users
	payload = _serialize(doc.as_dict())
	manager_users = set(_manager_users(branch))
	for user in manager_users:
		frappe.get_doc({
			"doctype": "Notification Log",
			"subject": _("Урьдчилсан захиалга: {0} · {1} хүн").format(name, doc.party_size),
			"for_user": user,
			"from_user": frappe.session.user,
			"type": "Alert",
			"document_type": "VIP Phone Reservation",
			"document_name": doc.name,
		}).insert(ignore_permissions=True)
	for user in manager_users.union(_reception_users(branch)).union(_operation_users()):
		frappe.publish_realtime("vip_phone_reservation", payload, user=user, after_commit=True)
	frappe.db.commit()
	return payload


def _scheduled_reservations(branch, limit=50):
	_, window_start, window_end = operational_window(now_datetime())
	rows = _daily_reservations(branch, window_start, window_end, limit, status="Scheduled")
	return _with_branch_bans(rows, branch)


@frappe.whitelist()
def get_guard_waitlist(limit=50, work_date=None):
	require_any_role("Reception")
	branch = _branch()
	workspace = get_daily_entry_workspace(branch, work_date, limit)
	return {**workspace, "reservations": [row for row in workspace["items"] if row.get("status") == "Scheduled"]}


@frappe.whitelist()
def get_phone_reservations(branch=None, limit=50, work_date=None):
	require_any_role("Operation", "Branch Manager")
	branch = _reservation_branch(branch)
	workspace = get_daily_entry_workspace(branch, work_date, limit)
	return {**workspace, "reservations": workspace["items"]}


@frappe.whitelist()
def get_operation_customer_detail(phone, branch=None):
	"""Legacy manager-only lookup retained without granting operator history access."""
	require_any_role("Branch Manager")
	branch = _reservation_branch(branch)
	from nomad_vip.api.customer import _find_customer_by_phone, _phone_digits, get_customer_detail
	digits = _phone_digits(phone)
	if len(digits) != 8:
		frappe.throw(_("Enter a valid 8-digit phone number"))
	customer = _find_customer_by_phone(digits)
	if not customer:
		return {"found": False, "branch": branch, "phone": digits}
	return {"found": True, "branch": branch, "detail": get_customer_detail(customer, branch)}


@frappe.whitelist()
def cancel_phone_reservation(reservation):
	require_any_role("Operation", "Branch Manager")
	frappe.db.sql("select name from `tabVIP Phone Reservation` where name=%s for update", (reservation,))
	doc = frappe.get_doc("VIP Phone Reservation", reservation)
	branch = _reservation_branch(doc.branch)
	if doc.branch != branch:
		frappe.throw(_("You cannot update another branch's reservation"), frappe.PermissionError)
	if doc.status != "Scheduled":
		frappe.throw(_("Only a scheduled reservation can be cancelled"))
	doc.status = "Cancelled"
	doc.save(ignore_permissions=True)
	from nomad_vip.api.entry import _manager_users, _operation_users, _reception_users
	payload = _serialize(doc.as_dict())
	for user in set(_manager_users(branch)).union(_reception_users(branch)).union(_operation_users()):
		frappe.publish_realtime("vip_phone_reservation", payload, user=user, after_commit=True)
	frappe.db.commit()
	return {"name": doc.name, "status": doc.status}


def mark_latest_reservation_arrived(phone, branch, entry_event):
	_, window_start, window_end = operational_window(now_datetime())
	rows = frappe.db.sql(
		"""
		select name
		from `tabVIP Phone Reservation`
		where branch = %(branch)s
			and phone = %(phone)s
			and status = 'Scheduled'
			and expected_at >= %(window_start)s
			and expected_at < %(window_end)s
		order by expected_at asc
		limit 1
		for update
		""",
		{
			"branch": branch,
			"phone": _phone_digits(phone),
			"window_start": window_start,
			"window_end": window_end,
		},
	)
	if not rows:
		return None
	doc = frappe.get_doc("VIP Phone Reservation", rows[0][0])
	doc.status = "Arrived"
	doc.arrived_at = now_datetime()
	doc.entry_event = entry_event
	doc.save(ignore_permissions=True)
	return doc.name


def mark_reservation_arrived(reservation, branch, entry_event):
	frappe.db.sql("select name from `tabVIP Phone Reservation` where name=%s for update", (reservation,))
	doc = frappe.get_doc("VIP Phone Reservation", reservation)
	if doc.branch != branch:
		frappe.throw(_("You cannot update another branch's reservation"), frappe.PermissionError)
	if doc.status == "Arrived" and doc.entry_event == entry_event:
		return doc.name
	if doc.status != "Scheduled":
		frappe.throw(_("This guest is no longer waiting"))
	doc.status = "Arrived"
	doc.arrived_at = now_datetime()
	doc.entry_event = entry_event
	doc.save(ignore_permissions=True)
	return doc.name
