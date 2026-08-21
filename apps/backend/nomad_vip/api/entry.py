from __future__ import annotations

from datetime import timedelta

import frappe
from frappe import _
from frappe.utils import now_datetime

from nomad_vip.services import get_branch_for_user, require_any_role


def _branch():
	branch = get_branch_for_user()
	if not branch:
		frappe.throw(_("Your user is not assigned to a branch"), frappe.PermissionError)
	from nomad_vip.api.entry_access import require_entry_access
	return require_entry_access(branch)


def _manager_branch():
	"""Resolve the manager's assigned branch without requiring the door QR.

	Door QR/GPS evidence protects actions performed at the physical entrance.
	The management workbench is allowed to read and acknowledge its own branch's
	entry feed remotely, but never another branch's data.
	"""
	require_any_role("Branch Manager")
	branch = get_branch_for_user()
	if not branch:
		frappe.throw(_("Таны хэрэглэгчид салбар оноогоогүй байна."), frappe.PermissionError)
	return branch


@frappe.whitelist()
def get_context():
	require_any_role("Reception", "Branch Manager", "Operation", "VIP Admin", "System Manager", "CEO")
	roles = set(frappe.get_roles())
	is_admin = frappe.session.user == "Administrator" or bool(roles.intersection({"VIP Admin", "System Manager", "CEO"}))
	mode = "admin" if is_admin else "operation" if "Operation" in roles and "Branch Manager" not in roles else "manager" if "Branch Manager" in roles else "guard"
	from nomad_vip.integrations.finex import VIP_BRANCHES
	assigned_branch = None if is_admin or mode == "operation" else get_branch_for_user()
	if not is_admin and mode != "operation" and not assigned_branch:
		frappe.throw(_("Таны хэрэглэгчид салбар оноогоогүй байна."), frappe.PermissionError)
	from nomad_vip.api.entry_access import is_test_entry_access_bypass_enabled
	test_entry_access_bypass = mode == "guard" and is_test_entry_access_bypass_enabled()
	return {
		"user": frappe.session.user,
		"full_name": frappe.utils.get_fullname(frappe.session.user),
		"branch": "Бүх салбар" if is_admin or mode == "operation" else assigned_branch,
		"branches": list(VIP_BRANCHES) if mode == "operation" else [],
		"mode": mode,
		"entry_access_required": mode == "guard" and not test_entry_access_bypass,
		"entry_access_test_bypass": test_entry_access_bypass,
	}


@frappe.whitelist()
def search_customer(phone):
	require_any_role("Reception", "Branch Manager")
	_branch()
	from nomad_vip.api.customer import lookup_customer_by_phone
	return lookup_customer_by_phone(phone)


@frappe.whitelist(methods=["GET"])
def search_customer_for_manager(phone):
	"""Look up an existing customer before door entry, scoped to the manager's branch."""
	branch = _manager_branch()
	from nomad_vip.api.customer import _find_customer_by_phone, _phone_digits, get_customer_detail

	digits = _phone_digits(phone)
	if len(digits) != 8:
		frappe.throw(_("8 оронтой утасны дугаар оруулна уу."), frappe.ValidationError)
	customer = _find_customer_by_phone(digits)
	if not customer:
		return {"found": False, "branch": branch, "phone": digits}
	return {"found": True, "branch": branch, "phone": digits, "detail": get_customer_detail(customer, branch)}


@frappe.whitelist(methods=["GET"])
def get_customer_detail_for_entry(customer):
	require_any_role("Branch Manager")
	branch = _manager_branch()
	from nomad_vip.api.customer import get_customer_detail
	return get_customer_detail(customer, branch)


@frappe.whitelist(methods=["POST"])
def set_customer_rank_for_entry(customer, membership_rank):
	require_any_role("Branch Manager")
	_manager_branch()
	from nomad_vip.api.customer import set_customer_rank
	return set_customer_rank(customer, membership_rank)


@frappe.whitelist(methods=["POST"])
def set_customer_ban_for_entry(customer, banned, reason):
	require_any_role("Branch Manager")
	_manager_branch()
	from nomad_vip.api.customer import set_customer_ban
	return set_customer_ban(customer, banned, reason)


def _branch_users_for_role(branch, role):
	users = frappe.get_all("Employee", filters={"branch": branch, "status": "Active", "user_id": ["is", "set"]}, pluck="user_id")
	return [user for user in users if role in frappe.get_roles(user)]


def _manager_users(branch):
	return _branch_users_for_role(branch, "Branch Manager")


def _reception_users(branch):
	return _branch_users_for_role(branch, "Reception")


def _operation_users():
	return [
		row[0]
		for row in frappe.db.sql(
			"""
			select distinct role.parent
			from `tabHas Role` role
			inner join `tabUser` user on user.name = role.parent
			where role.parenttype = 'User'
				and role.role = 'Operation'
				and user.enabled = 1
			"""
		)
	]


def _entry_payload(entry, reservation=None):
	return {
		"name": entry.name,
		"branch": entry.branch,
		"customer_name": entry.customer_name_snapshot,
		"membership_rank": entry.membership_rank_snapshot,
		"guard_name": frappe.utils.get_fullname(entry.guard_user),
		"entered_at": entry.entered_at,
		"visit_type": entry.visit_type,
		"visit_number": entry.visit_number,
		"reservation": reservation,
	}


@frappe.whitelist()
def admit_customer(customer, reservation=None):
	require_any_role("Reception")
	branch = _branch()
	from nomad_vip.api.locking import database_lock
	with database_lock("customer-entry", branch, customer):
		reservation_row = None
		if reservation:
			rows = frappe.db.sql(
				"""
				select name, branch, customer, status, entry_event
				from `tabVIP Phone Reservation`
				where name = %s
				for update
				""",
				(reservation,),
				as_dict=True,
			)
			if not rows:
				frappe.throw(_("Захиалга олдсонгүй."), frappe.DoesNotExistError)
			reservation_row = rows[0]
			if reservation_row.branch != branch or reservation_row.customer != customer:
				frappe.throw(_("Энэ захиалгыг нэвтрүүлэх эрхгүй."), frappe.PermissionError)
			if reservation_row.status == "Arrived" and reservation_row.entry_event:
				entry = frappe.get_doc("VIP Customer Entry Event", reservation_row.entry_event)
				return _entry_payload(entry, reservation_row.name)
			if reservation_row.status != "Scheduled":
				frappe.throw(_("Энэ зочин хүлээлгийн жагсаалтад байхгүй байна."), frappe.ValidationError)
		else:
			recent_cutoff = now_datetime() - timedelta(seconds=30)
			recent = frappe.db.sql(
				"""
				select name
				from `tabVIP Customer Entry Event`
				where customer = %(customer)s
					and branch = %(branch)s
					and entered_at >= %(recent_cutoff)s
				order by entered_at desc
				limit 1
				""",
				{"customer": customer, "branch": branch, "recent_cutoff": recent_cutoff},
			)
			if recent:
				entry = frappe.get_doc("VIP Customer Entry Event", recent[0][0])
				linked_reservation = frappe.db.get_value(
					"VIP Phone Reservation", {"entry_event": entry.name, "branch": branch}, "name"
				)
				return _entry_payload(entry, linked_reservation)

		profiles = frappe.db.sql(
			"""
			select membership_rank, visit_count, is_banned, ban_reason
			from `tabVIP Customer Branch Profile`
			where customer = %s and branch = %s
			for update
			""",
			(customer, branch),
			as_dict=True,
		)
		if not profiles:
			frappe.throw(_("Customer does not have a profile for your branch"), frappe.PermissionError)
		profile = profiles[0]
		if profile.is_banned:
			reason = (profile.ban_reason or "Шалтгаан оруулаагүй").strip()
			frappe.throw(f"Энэ хэрэглэгчийн нэвтрэх эрх хориглогдсон. Шалтгаан: {reason}", frappe.PermissionError)
		last_visits = frappe.db.sql(
			"""
			select visit_number
			from `tabVIP Customer Entry Event`
			where customer = %s and branch = %s
			order by entered_at desc
			limit 1
			for update
			""",
			(customer, branch),
		)
		last_visit_number = last_visits[0][0] if last_visits else 0
		visit_number = max(int(profile.visit_count or 0), int(last_visit_number or 0)) + 1
		customer_values = frappe.db.get_value(
			"Customer", customer, ["customer_name", "custom_finex_phone", "mobile_no"], as_dict=True
		)
		if not customer_values:
			frappe.throw(_("Хэрэглэгчийн бүртгэл олдсонгүй."), frappe.DoesNotExistError)
		customer_name = customer_values.customer_name
		phone = customer_values.custom_finex_phone or customer_values.mobile_no
		entry = frappe.get_doc({
			"doctype": "VIP Customer Entry Event",
			"branch": branch,
			"customer": customer,
			"customer_name_snapshot": customer_name,
			"membership_rank_snapshot": profile.membership_rank or "Unassigned",
			"guard_user": frappe.session.user,
			"entered_at": now_datetime(),
			"visit_type": "New Customer" if visit_number == 1 else "Returning",
			"visit_number": visit_number,
		}).insert(ignore_permissions=True)
		from nomad_vip.api.operation import mark_latest_reservation_arrived, mark_reservation_arrived
		reservation_name = (
			mark_reservation_arrived(reservation_row.name, branch, entry.name)
			if reservation_row
			else mark_latest_reservation_arrived(phone, branch, entry.name)
		)
		payload = _entry_payload(entry, reservation_name)
		manager_users = set(_manager_users(branch))
		for user in manager_users:
			frappe.get_doc({
				"doctype": "Notification Log",
				"subject": _("{0} customer entered: {1}").format(entry.membership_rank_snapshot, customer_name),
				"for_user": user,
				"from_user": frappe.session.user,
				"type": "Alert",
				"document_type": "VIP Customer Entry Event",
				"document_name": entry.name,
			}).insert(ignore_permissions=True)
		for user in manager_users.union(_operation_users()):
			frappe.publish_realtime("vip_customer_entry", payload, user=user, after_commit=True)
		frappe.db.commit()
		return payload


@frappe.whitelist()
def get_feed(limit=50):
	branch = _manager_branch()
	limit = min(max(int(limit or 50), 1), 100)
	from nomad_vip.api.entry_day import operational_window
	work_date, window_start, window_end = operational_window(now_datetime())
	date_filters = [
		["VIP Customer Entry Event", "branch", "=", branch],
		["VIP Customer Entry Event", "entered_at", ">=", window_start],
		["VIP Customer Entry Event", "entered_at", "<", window_end],
	]
	rows = frappe.get_all(
		"VIP Customer Entry Event",
		filters=date_filters,
		fields=["name", "customer", "customer_name_snapshot as customer_name", "membership_rank_snapshot as membership_rank", "guard_user", "entered_at", "visit_type", "visit_number", "manager_acknowledged"],
		order_by="entered_at desc",
		limit_page_length=limit,
	)
	for row in rows:
		# Legacy entry rows predate the explicit visit counter. Keep them out of
		# the misleading "first visit" state while all new admissions store the
		# exact sequence number.
		if not row.visit_number:
			row.visit_number = 1 if row.visit_type == "New Customer" else 2
		row.guard_name = frappe.utils.get_fullname(row.guard_user)
	# Dashboard totals must describe the complete operational day, not only the
	# paginated rows returned to the activity list.
	entry_counts = frappe.db.sql(
		"""
		select count(*) as today_total,
			coalesce(sum(case when visit_type = 'New Customer' then 1 else 0 end), 0) as today_new,
			coalesce(sum(case when coalesce(manager_acknowledged, 0) = 0 then 1 else 0 end), 0) as unread
		from `tabVIP Customer Entry Event`
		where branch = %(branch)s
			and entered_at >= %(window_start)s
			and entered_at < %(window_end)s
		""",
		{
			"branch": branch,
			"window_start": window_start,
			"window_end": window_end,
		},
		as_dict=True,
	)[0]
	from nomad_vip.api.operation import _scheduled_reservations
	reservations = _scheduled_reservations(branch, limit)
	return {
		"branch": branch,
		"work_date": str(work_date),
		"window_start": window_start,
		"window_end": window_end,
		"entries": rows,
		"reservations": reservations,
		"pending_reservations": len(reservations),
		"today_total": int(entry_counts.today_total or 0),
		"today_new": int(entry_counts.today_new or 0),
		"unread": int(entry_counts.unread or 0),
	}


@frappe.whitelist(methods=["GET"])
def get_service_entry_feed(branch=None, limit=50):
	"""Return the minimum current-shift guest context needed by service staff."""
	from nomad_vip.api.security import require_actor
	from nomad_vip.integrations.finex import VIP_BRANCHES

	actor = require_actor(
		"Operation", "Bartender", "Lead Entertainer", "Entertainer Supervisor", "Branch Manager"
	)
	is_central_operation = "Operation" in actor.roles and "Branch Manager" not in actor.roles
	if is_central_operation:
		selected_branch = (branch or "").strip()
		if selected_branch not in VIP_BRANCHES:
			frappe.throw(_("Хүчинтэй VIP салбар сонгоно уу."), frappe.ValidationError)
	else:
		selected_branch = actor.branch
		if not selected_branch:
			frappe.throw(_("Таны ажилтны бүртгэлд салбар тохируулаагүй байна."), frappe.PermissionError)
		if branch and branch != selected_branch:
			frappe.throw(_("Өөр салбарын зочны мэдээллийг харах эрхгүй."), frappe.PermissionError)

	try:
		page_size = min(max(int(limit or 50), 1), 100)
	except (TypeError, ValueError):
		frappe.throw(_("Мөрийн тоо бүхэл тоо байна."), frappe.ValidationError)
	from nomad_vip.api.entry_day import operational_window
	work_date, window_start, window_end = operational_window(now_datetime())
	rows = frappe.db.sql(
		"""
		select entry.name,
			entry.customer_name_snapshot as customer_name,
			coalesce(nullif(profile.membership_rank, ''), entry.membership_rank_snapshot, 'Unassigned') as membership_rank,
			entry.entered_at,
			coalesce(nullif(entry.visit_number, 0), if(entry.visit_type = 'New Customer', 1, 2)) as visit_number,
			coalesce(profile.service_characteristics, '') as service_characteristics
		from `tabVIP Customer Entry Event` entry
		left join `tabVIP Customer Branch Profile` profile
			on profile.customer = entry.customer and profile.branch = entry.branch
		where entry.branch = %(branch)s
			and entry.entered_at >= %(window_start)s
			and entry.entered_at < %(window_end)s
		order by entry.entered_at desc
		limit %(limit)s
		""",
		{
			"branch": selected_branch,
			"window_start": window_start,
			"window_end": window_end,
			"limit": page_size,
		},
		as_dict=True,
	)
	total_count = frappe.db.sql(
		"""
		select count(*)
		from `tabVIP Customer Entry Event`
		where branch = %(branch)s
			and entered_at >= %(window_start)s
			and entered_at < %(window_end)s
		""",
		{
			"branch": selected_branch,
			"window_start": window_start,
			"window_end": window_end,
		},
	)[0][0]
	return {
		"branch": selected_branch,
		"work_date": str(work_date),
		"window_start": window_start,
		"window_end": window_end,
		"entries": rows,
		"today_total": int(total_count or 0),
		"visible_fields": [
			"customer_name", "membership_rank", "entered_at", "visit_number", "service_characteristics"
		],
	}


@frappe.whitelist(methods=["GET"])
def get_reservation_summary(reservation):
	"""Return the same compact guest intelligence before the guest arrives."""
	branch = _manager_branch()
	doc = frappe.get_doc("VIP Phone Reservation", reservation)
	if doc.branch != branch:
		frappe.throw(_("Өөр салбарын урьдчилсан захиалгыг харах эрхгүй"), frappe.PermissionError)

	from nomad_vip.api.customer import get_customer_detail
	detail = get_customer_detail(doc.customer, branch)
	profiles = detail.get("branch_profiles") or []
	entertainers = (detail.get("dancers") or [])[:5]
	profile = profiles[0] if profiles else None
	top_entertainer = entertainers[0] if entertainers else None
	customer = detail.get("customer", {})

	return {
		"reservation": {
			"name": doc.name,
			"customer": doc.customer,
			"customer_name": doc.customer_name,
			"expected_at": doc.expected_at,
			"party_size": doc.party_size or 1,
			"status": doc.status,
			"notes": doc.notes or "",
			"order_items": [line.strip() for line in (doc.order_details or "").splitlines() if line.strip()],
		},
		"phone": customer.get("phone") or doc.phone or "",
		"visit_count": max(
			(profile or {}).get("visit_count") or 0,
			customer.get("visit_count") or 0,
		),
		"membership_rank": (profile or {}).get("membership_rank") or "Unassigned",
		"average_bill": (profile or {}).get("average_bill") or customer.get("average_bill") or 0,
		"is_banned": int((profile or {}).get("is_banned") or 0),
		"ban_reason": (profile or {}).get("ban_reason") or "",
		"service_characteristics": (profile or {}).get("service_characteristics") or "",
		"branch_ban_notices": detail.get("branch_ban_notices") or [],
		"recent_bills": (detail.get("recent_bills") or [])[:20],
		"entertainers": [
			{
				"dancer_id": row.get("dancer_id") or "",
				"name": row.get("name") or "",
				"nickname": row.get("nickname") or "",
				"service_count": row.get("service_count") or 0,
				"bill_count": row.get("bill_count") or 0,
			}
			for row in entertainers
		],
		"top_entertainer": {
			"dancer_id": top_entertainer.get("dancer_id") or "",
			"name": top_entertainer.get("name") or "",
			"nickname": top_entertainer.get("nickname") or "",
			"service_count": top_entertainer.get("service_count") or 0,
			"bill_count": top_entertainer.get("bill_count") or 0,
		} if top_entertainer else None,
	}


@frappe.whitelist()
def get_entry_summary(entry):
	"""Return only the manager-facing intelligence needed from an entry alert."""
	branch = _manager_branch()
	doc = frappe.get_doc("VIP Customer Entry Event", entry)
	if doc.branch != branch:
		frappe.throw(_("You cannot view another branch's customer information"), frappe.PermissionError)

	from nomad_vip.api.customer import get_customer_detail
	detail = get_customer_detail(doc.customer, branch)
	profiles = detail.get("branch_profiles") or []
	entertainers = (detail.get("dancers") or [])[:5]
	recent_bills = detail.get("recent_bills") or []
	profile = profiles[0] if profiles else None
	top_entertainer = entertainers[0] if entertainers else None
	customer = detail.get("customer", {})
	reservation = frappe.db.get_value(
		"VIP Phone Reservation",
		{"entry_event": doc.name, "branch": branch},
		[
			"name",
			"customer",
			"customer_name",
			"phone",
			"expected_at",
			"party_size",
			"order_details",
			"notes",
			"status",
			"arrived_at",
			"entry_event",
		],
		as_dict=True,
	)
	if reservation:
		reservation["order_items"] = [
			line.strip()
			for line in (reservation.get("order_details") or "").splitlines()
			if line.strip()
		]

	return {
		"entry": {
			"name": doc.name,
			"customer": doc.customer,
			"customer_name": doc.customer_name_snapshot,
			"entered_at": doc.entered_at,
			"visit_number": doc.visit_number or (1 if doc.visit_type == "New Customer" else 2),
			"guard_name": frappe.utils.get_fullname(doc.guard_user),
		},
		"phone": customer.get("phone") or "",
		"visit_count": max(
			(profile or {}).get("visit_count") or 0,
			customer.get("visit_count") or 0,
			doc.visit_number or (1 if doc.visit_type == "New Customer" else 2),
		),
		"membership_rank": (profile or {}).get("membership_rank") or doc.membership_rank_snapshot or "Unassigned",
		"average_bill": (profile or {}).get("average_bill") or customer.get("average_bill") or 0,
		"is_banned": int((profile or {}).get("is_banned") or 0),
		"ban_reason": (profile or {}).get("ban_reason") or "",
		"service_characteristics": (profile or {}).get("service_characteristics") or "",
		"branch_ban_notices": detail.get("branch_ban_notices") or [],
		# This is the latest source-backed POS bill in the manager's own branch.
		# The client labels it as previous history so it cannot be mistaken for
		# the room or entertainer assigned to the current visit.
		"latest_bill": recent_bills[0] if recent_bills else None,
		"recent_bills": recent_bills[:20],
		"reservation": reservation,
		"entertainers": [
			{
				"dancer_id": row.get("dancer_id") or "",
				"name": row.get("name") or "",
				"nickname": row.get("nickname") or "",
				"service_count": row.get("service_count") or 0,
				"bill_count": row.get("bill_count") or 0,
			}
			for row in entertainers
		],
		"top_entertainer": {
			"dancer_id": top_entertainer.get("dancer_id") or "",
			"name": top_entertainer.get("name") or "",
			"nickname": top_entertainer.get("nickname") or "",
			"service_count": top_entertainer.get("service_count") or 0,
			"bill_count": top_entertainer.get("bill_count") or 0,
		} if top_entertainer else None,
	}


@frappe.whitelist()
def acknowledge_entry(entry):
	branch = _manager_branch()
	doc = frappe.get_doc("VIP Customer Entry Event", entry)
	if doc.branch != branch:
		frappe.throw(_("You cannot view another branch's customer information"), frappe.PermissionError)
	frappe.db.set_value("VIP Customer Entry Event", doc.name, {"manager_acknowledged": 1, "acknowledged_by": frappe.session.user, "acknowledged_at": now_datetime()})
	frappe.db.commit()
	return {"name": doc.name, "manager_acknowledged": 1}
