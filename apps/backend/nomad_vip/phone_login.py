from __future__ import annotations

import re
from collections import Counter

import frappe
from frappe import _


STAFF_DESIGNATION_ROLES = {
	"Bartender": frozenset({"Бармен", "Bartender", "Barmen"}),
	"Server": frozenset({"Зөөгч", "Server", "Waiter"}),
}


def normalize_employee_phone(value) -> str:
	digits = re.sub(r"\D", "", value or "")
	return digits[-8:] if len(digits) >= 8 else ""


def _user_phone_owner(phone: str, exclude_user: str | None = None) -> str | None:
	for row in frappe.get_all(
		"User",
		filters={"enabled": 1, "mobile_no": ["is", "set"]},
		fields=["name", "mobile_no"],
		limit_page_length=0,
	):
		if row.name != exclude_user and normalize_employee_phone(row.mobile_no) == phone:
			return row.name
	return None


def _required_staff_roles(user_name: str) -> set[str]:
	"""Derive scoped staff-app roles only from confirmed active Employee rows."""
	designations = {
		(row.designation or "").strip()
		for row in frappe.get_all(
			"Employee",
			filters={"user_id": user_name, "status": "Active"},
			fields=["designation"],
			ignore_permissions=True,
		)
	}
	return {
		role
		for role, allowed_designations in STAFF_DESIGNATION_ROLES.items()
		if designations.intersection(allowed_designations)
	}


def _sync_employee_staff_roles(user_name: str | None):
	"""Keep Bartender/Server access aligned when an Employee changes."""
	user_name = (user_name or "").strip()
	if (
		not user_name
		or user_name in {"Administrator", "Guest"}
		or not frappe.db.exists("User", user_name)
	):
		return
	desired = _required_staff_roles(user_name)
	managed = set(STAFF_DESIGNATION_ROLES)
	user = frappe.get_doc("User", user_name)
	current = {row.role for row in user.roles}
	if desired == current.intersection(managed):
		return
	user.set("roles", [row for row in user.roles if row.role not in managed or row.role in desired])
	for role in sorted(desired - current):
		if frappe.db.exists("Role", role):
			user.append("roles", {"role": role})
	user.save(ignore_permissions=True)
	frappe.clear_cache(user=user_name)


def enable_employee_staff_roles():
	"""Provision scoped service roles and align all linked active employees."""
	for role in STAFF_DESIGNATION_ROLES:
		if not frappe.db.exists("Role", role):
			frappe.get_doc(
				{"doctype": "Role", "role_name": role, "desk_access": 0}
			).insert(ignore_permissions=True)
	users = {
		(row.user_id or "").strip()
		for row in frappe.get_all(
			"Employee",
			filters={"status": "Active", "user_id": ("is", "set")},
			fields=["user_id"],
			ignore_permissions=True,
		)
	}
	for user_name in users:
		_sync_employee_staff_roles(user_name)
	frappe.db.commit()
	return {
		"roles": sorted(STAFF_DESIGNATION_ROLES),
		"linked_users_checked": len(users),
	}


def sync_employee_phone_login(doc, method=None):
	"""Sync a confirmed Employee's phone alias and scoped staff-app access."""
	previous = doc.get_doc_before_save() if hasattr(doc, "get_doc_before_save") else None
	for user_name in {getattr(previous, "user_id", None), doc.user_id}:
		_sync_employee_staff_roles(user_name)
	if not doc.user_id or doc.status != "Active":
		return
	phone = normalize_employee_phone(doc.cell_number)
	if not phone:
		return
	duplicate_employee = frappe.db.sql(
		"""
		select name from `tabEmployee`
		where name != %(employee)s and status = 'Active'
			and coalesce(user_id, '') != ''
			and right(regexp_replace(coalesce(cell_number, ''), '[^0-9]', ''), 8) = %(phone)s
		limit 1
		""",
		{"employee": doc.name, "phone": phone},
	)
	if duplicate_employee:
		frappe.throw(_("Энэ утасны дугаар өөр ажилтны нэвтрэх эрхтэй давхцаж байна."), frappe.ValidationError)
	owner = _user_phone_owner(phone, doc.user_id)
	if owner:
		frappe.throw(_("Энэ утасны дугаар өөр хэрэглэгчийн нэвтрэх эрхтэй давхцаж байна."), frappe.ValidationError)
	frappe.db.set_value("User", doc.user_id, "mobile_no", phone, update_modified=False)
	frappe.clear_cache(user=doc.user_id)


def enable_employee_phone_login():
	"""Enable mobile login and migrate only unique, source-confirmed Employee phones."""
	if frappe.get_meta("System Settings").has_field("allow_login_using_mobile_number"):
		frappe.db.set_single_value("System Settings", "allow_login_using_mobile_number", 1)

	rows = frappe.db.sql(
		"""
		select e.name, e.employee_name, e.user_id, e.cell_number
		from `tabEmployee` e
		inner join `tabUser` u on u.name = e.user_id and u.enabled = 1
		where e.status = 'Active' and coalesce(e.user_id, '') != ''
		order by e.name
		""",
		as_dict=True,
	)
	phones = {row.name: normalize_employee_phone(row.cell_number) for row in rows}
	counts = Counter(phone for phone in phones.values() if phone)
	migrated = []
	missing = []
	duplicates = []
	conflicts = []
	for row in rows:
		phone = phones[row.name]
		if not phone:
			missing.append(row.name)
			continue
		if counts[phone] > 1:
			duplicates.append(row.name)
			continue
		owner = _user_phone_owner(phone, row.user_id)
		if owner:
			conflicts.append(row.name)
			continue
		frappe.db.set_value("User", row.user_id, "mobile_no", phone, update_modified=False)
		frappe.clear_cache(user=row.user_id)
		migrated.append(row.name)
	frappe.db.commit()
	return {
		"mobile_login_enabled": True,
		"passwords_changed": 0,
		"migrated": len(migrated),
		"missing_phone": len(missing),
		"duplicate_phone": len(duplicates),
		"user_conflicts": len(conflicts),
		"missing_employee_ids": missing,
		"duplicate_employee_ids": duplicates,
		"conflict_employee_ids": conflicts,
	}
