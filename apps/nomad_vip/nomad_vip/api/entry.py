from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import now_datetime, today

from nomad_vip.services import get_branch_for_user, require_any_role


def _branch():
	branch = get_branch_for_user()
	if not branch:
		frappe.throw(_("Your user is not assigned to a branch"), frappe.PermissionError)
	return branch


@frappe.whitelist()
def get_context():
	require_any_role("Reception", "Branch Manager", "Operation", "VIP Admin", "System Manager", "CEO")
	roles = set(frappe.get_roles())
	is_admin = frappe.session.user == "Administrator" or bool(roles.intersection({"VIP Admin", "System Manager", "CEO"}))
	mode = "admin" if is_admin else "operation" if "Operation" in roles and "Branch Manager" not in roles else "manager" if "Branch Manager" in roles else "guard"
	from nomad_vip.integrations.finex import VIP_BRANCHES
	return {
		"user": frappe.session.user,
		"full_name": frappe.utils.get_fullname(frappe.session.user),
		"branch": "Бүх салбар" if is_admin or mode == "operation" else _branch(),
		"branches": list(VIP_BRANCHES) if mode == "operation" else [],
		"mode": mode,
	}


@frappe.whitelist()
def search_customer(phone):
	require_any_role("Reception", "Branch Manager")
	from nomad_vip.api.customer import lookup_customer_by_phone
	return lookup_customer_by_phone(phone)


def _manager_users(branch):
	users = frappe.get_all("Employee", filters={"branch": branch, "status": "Active", "user_id": ["is", "set"]}, pluck="user_id")
	return [user for user in users if "Branch Manager" in frappe.get_roles(user)]


@frappe.whitelist()
def admit_customer(customer, reservation=None):
	require_any_role("Reception")
	branch = _branch()
	profile = frappe.db.get_value(
		"VIP Customer Branch Profile",
		{"customer": customer, "branch": branch},
		["membership_rank", "visit_count", "is_banned", "ban_reason"],
		as_dict=True,
	)
	if not profile:
		frappe.throw(_("Customer does not have a profile for your branch"), frappe.PermissionError)
	if profile.is_banned:
		reason = (profile.ban_reason or "Шалтгаан оруулаагүй").strip()
		frappe.throw(f"Энэ хэрэглэгчийн нэвтрэх эрх хориглогдсон. Шалтгаан: {reason}", frappe.PermissionError)
	last_visit_number = frappe.db.get_value(
		"VIP Customer Entry Event",
		{"customer": customer, "branch": branch},
		"visit_number",
		order_by="entered_at desc",
	) or 0
	visit_number = max(int(profile.visit_count or 0), int(last_visit_number or 0)) + 1
	customer_values = frappe.db.get_value(
		"Customer", customer, ["customer_name", "custom_finex_phone", "mobile_no"], as_dict=True
	)
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
	reservation = mark_reservation_arrived(reservation, branch, entry.name) if reservation else mark_latest_reservation_arrived(phone, branch, entry.name)

	payload = {
		"name": entry.name,
		"branch": branch,
		"customer_name": customer_name,
		"membership_rank": entry.membership_rank_snapshot,
		"guard_name": frappe.utils.get_fullname(frappe.session.user),
		"entered_at": entry.entered_at,
		"visit_type": entry.visit_type,
		"visit_number": visit_number,
		"reservation": reservation,
	}
	for user in _manager_users(branch):
		frappe.get_doc({
			"doctype": "Notification Log",
			"subject": _("{0} customer entered: {1}").format(entry.membership_rank_snapshot, customer_name),
			"for_user": user,
			"from_user": frappe.session.user,
			"type": "Alert",
			"document_type": "VIP Customer Entry Event",
			"document_name": entry.name,
		}).insert(ignore_permissions=True)
		frappe.publish_realtime("vip_customer_entry", payload, user=user)
	frappe.db.commit()
	return payload


@frappe.whitelist()
def get_feed(limit=50):
	require_any_role("Branch Manager")
	branch = _branch()
	limit = min(max(int(limit or 50), 1), 100)
	rows = frappe.get_all(
		"VIP Customer Entry Event",
		filters={"branch": branch},
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
	from nomad_vip.api.operation import _scheduled_reservations
	return {
		"branch": branch,
		"entries": rows,
		"pending_reservations": _scheduled_reservations(branch, limit),
		"today_total": frappe.db.count("VIP Customer Entry Event", {"branch": branch, "entered_at": [">=", today()]}),
		"today_new": frappe.db.count("VIP Customer Entry Event", {"branch": branch, "visit_type": "New Customer", "entered_at": [">=", today()]}),
		"unread": frappe.db.count("VIP Customer Entry Event", {"branch": branch, "manager_acknowledged": 0}),
	}


@frappe.whitelist()
def get_entry_summary(entry):
	"""Return only the manager-facing intelligence needed from an entry alert."""
	require_any_role("Branch Manager")
	branch = _branch()
	doc = frappe.get_doc("VIP Customer Entry Event", entry)
	if doc.branch != branch:
		frappe.throw(_("You cannot view another branch's customer information"), frappe.PermissionError)

	from nomad_vip.api.customer import get_customer_detail
	detail = get_customer_detail(doc.customer, branch)
	profiles = detail.get("branch_profiles") or []
	entertainers = (detail.get("dancers") or [])[:5]
	profile = profiles[0] if profiles else None
	top_entertainer = entertainers[0] if entertainers else None
	customer = detail.get("customer", {})

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
	require_any_role("Branch Manager")
	branch = _branch()
	doc = frappe.get_doc("VIP Customer Entry Event", entry)
	if doc.branch != branch:
		frappe.throw(_("You cannot view another branch's customer information"), frappe.PermissionError)
	frappe.db.set_value("VIP Customer Entry Event", doc.name, {"manager_acknowledged": 1, "acknowledged_by": frappe.session.user, "acknowledged_at": now_datetime()})
	frappe.db.commit()
	return {"name": doc.name, "manager_acknowledged": 1}
