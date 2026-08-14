import re

import frappe
from frappe import _
from frappe.utils import add_days, get_datetime, now_datetime, today

from nomad_vip.services import get_branch_for_user, require_any_role


def _branch():
	branch = get_branch_for_user()
	if not branch:
		frappe.throw(_("Your user is not assigned to a branch"), frappe.PermissionError)
	return branch


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

	assigned_branch = _branch()
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
	return [
		_serialize(row)
		for row in frappe.get_all(
			"VIP Phone Reservation",
			filters={
				"branch": branch,
				"phone": _phone_digits(phone),
				"status": "Scheduled",
				"expected_at": ["between", [add_days(today(), -1), add_days(today(), 2)]],
			},
			fields=["name", "customer_name", "phone", "expected_at", "party_size", "order_details", "notes", "status"],
			order_by="expected_at asc",
			limit_page_length=20,
		)
	]


@frappe.whitelist()
def create_phone_reservation(customer_name, phone, party_size=1, branch=None, expected_at=None, order_details=None, notes=None):
	require_any_role("Operation", "Branch Manager")
	branch = _reservation_branch(branch)
	name = (customer_name or "").strip()
	digits = _phone_digits(phone)
	if len(digits) != 8:
		frappe.throw(_("Enter a valid 8-digit phone number"))
	name = name or digits

	customer = _ensure_customer(name, digits)
	doc = frappe.get_doc({
		"doctype": "VIP Phone Reservation",
		"branch": branch,
		"customer": customer,
		"customer_name": name,
		"phone": digits,
		"expected_at": get_datetime(expected_at) if expected_at else now_datetime(),
		"party_size": max(int(party_size or 1), 1),
		"order_details": (order_details or "").strip(),
		"notes": (notes or "").strip(),
		"status": "Scheduled",
	}).insert(ignore_permissions=True)
	from nomad_vip.api.entry import _manager_users
	payload = _serialize(doc.as_dict())
	for user in _manager_users(branch):
		frappe.get_doc({
			"doctype": "Notification Log",
			"subject": _("New operator reservation: {0} ({1} guests)").format(name, doc.party_size),
			"for_user": user,
			"from_user": frappe.session.user,
			"type": "Alert",
			"document_type": "VIP Phone Reservation",
			"document_name": doc.name,
		}).insert(ignore_permissions=True)
		frappe.publish_realtime("vip_phone_reservation", payload, user=user)
	frappe.db.commit()
	return payload


def _scheduled_reservations(branch, limit=50):
	rows = frappe.get_all(
		"VIP Phone Reservation",
		filters={"branch": branch, "status": "Scheduled", "expected_at": [">=", add_days(today(), -1)]},
		fields=["name", "customer", "customer_name", "phone", "expected_at", "party_size", "order_details", "notes", "status", "arrived_at", "entry_event"],
		order_by="expected_at asc",
		limit_page_length=min(max(int(limit or 50), 1), 100),
	)
	return _with_branch_bans(rows, branch)


@frappe.whitelist()
def get_guard_waitlist(limit=50):
	require_any_role("Reception")
	branch = _branch()
	return {"branch": branch, "reservations": _scheduled_reservations(branch, limit)}


@frappe.whitelist()
def get_phone_reservations(branch=None, limit=50):
	require_any_role("Operation", "Branch Manager")
	branch = _reservation_branch(branch)
	rows = frappe.get_all(
		"VIP Phone Reservation",
		filters={"branch": branch, "expected_at": [">=", add_days(today(), -1)]},
		fields=["name", "customer", "customer_name", "phone", "expected_at", "party_size", "order_details", "notes", "status", "arrived_at"],
		order_by="expected_at desc",
		limit_page_length=min(max(int(limit or 50), 1), 100),
	)
	return {"branch": branch, "reservations": _with_branch_bans(rows, branch)}


@frappe.whitelist()
def get_operation_customer_detail(phone, branch=None):
	"""Return a branch-scoped customer history for the central operator."""
	require_any_role("Operation", "Branch Manager")
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
	doc = frappe.get_doc("VIP Phone Reservation", reservation)
	roles = set(frappe.get_roles())
	if not ("Operation" in roles and "Branch Manager" not in roles) and doc.branch != _branch():
		frappe.throw(_("You cannot update another branch's reservation"), frappe.PermissionError)
	if doc.status != "Scheduled":
		frappe.throw(_("Only a scheduled reservation can be cancelled"))
	doc.status = "Cancelled"
	doc.save(ignore_permissions=True)
	frappe.db.commit()
	return {"name": doc.name, "status": doc.status}


def mark_latest_reservation_arrived(phone, branch, entry_event):
	reservations = get_active_reservations(phone, branch)
	if not reservations:
		return None
	doc = frappe.get_doc("VIP Phone Reservation", reservations[0]["name"])
	doc.status = "Arrived"
	doc.arrived_at = now_datetime()
	doc.entry_event = entry_event
	doc.save(ignore_permissions=True)
	return doc.name


def mark_reservation_arrived(reservation, branch, entry_event):
	doc = frappe.get_doc("VIP Phone Reservation", reservation)
	if doc.branch != branch:
		frappe.throw(_("You cannot update another branch's reservation"), frappe.PermissionError)
	if doc.status != "Scheduled":
		frappe.throw(_("This guest is no longer waiting"))
	doc.status = "Arrived"
	doc.arrived_at = now_datetime()
	doc.entry_event = entry_event
	doc.save(ignore_permissions=True)
	return doc.name
