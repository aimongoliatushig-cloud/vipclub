from __future__ import annotations

from collections.abc import Iterable

import frappe
from frappe.utils.modules import get_modules_from_all_apps


MANAGED_PROFILE_PREFIX = "NOMAD VIP - "
STAFF_PROFILE = f"{MANAGED_PROFILE_PREFIX}Staff"
ENTRY_PROFILE = f"{MANAGED_PROFILE_PREFIX}Entry"

STAFF_ROLES = frozenset({"Branch Manager", "Entertainer", "Lead Entertainer", "Entertainer Supervisor", "Bartender", "Server"})
ENTRY_ROLES = frozenset({"Reception", "Operation", "VIP Admin"})
UNRESTRICTED_DESK_ROLES = frozenset(
	{"System Manager", "CEO", "Accountant", "HR Manager", "HR User"}
)
ALLOWED_PRODUCT_MODULES = frozenset({"NOMAD VIP"})


def _module_names() -> set[str]:
	return {
		str(module.get("module_name") or "").strip()
		for module in get_modules_from_all_apps()
		if str(module.get("module_name") or "").strip()
	}


def _blocked_modules(allowed_modules: Iterable[str]) -> list[str]:
	return sorted(_module_names() - {str(module).strip() for module in allowed_modules})


def _ensure_module_profile(name: str, blocked_modules: list[str]):
	if frappe.db.exists("Module Profile", name):
		profile = frappe.get_doc("Module Profile", name)
	else:
		profile = frappe.get_doc(
			{"doctype": "Module Profile", "module_profile_name": name}
		)

	current = {row.module for row in profile.get("block_modules") or []}
	desired = set(blocked_modules)
	if current != desired or profile.is_new():
		profile.set("block_modules", [{"module": module} for module in blocked_modules])
		profile.save(ignore_permissions=True)
	return profile


def _target_profile(roles: set[str]) -> str | None:
	if roles & UNRESTRICTED_DESK_ROLES:
		return None
	if roles & STAFF_ROLES:
		return STAFF_PROFILE
	if roles & ENTRY_ROLES:
		return ENTRY_PROFILE
	return None


def _managed_users() -> list[str]:
	roles = tuple(sorted(STAFF_ROLES | ENTRY_ROLES | UNRESTRICTED_DESK_ROLES))
	return frappe.db.sql(
		"""
		SELECT DISTINCT parent
		FROM `tabHas Role`
		WHERE parenttype = 'User'
			AND role IN %(roles)s
			AND parent NOT IN ('Administrator', 'Guest')
		ORDER BY parent
		""",
		{"roles": roles},
		pluck=True,
	)


def _sync_user_profile(user_name: str, target_profile: str | None, blocked_modules: list[str]) -> str:
	user = frappe.get_doc("User", user_name)
	current_profile = (user.module_profile or "").strip()
	current_is_managed = current_profile.startswith(MANAGED_PROFILE_PREFIX)

	if current_profile and not current_is_managed:
		return "preserved"
	if not target_profile and not current_is_managed:
		return "unchanged"

	desired_modules = blocked_modules if target_profile else []
	current_modules = sorted(row.module for row in user.get("block_modules") or [])
	if current_profile == (target_profile or "") and current_modules == desired_modules:
		return "unchanged"

	user.module_profile = target_profile or ""
	user.set("block_modules", [{"module": module} for module in desired_modules])
	user.save(ignore_permissions=True)
	frappe.clear_cache(user=user_name)
	return "assigned" if target_profile else "released"


def ensure_desk_policy() -> dict[str, int]:
	"""Keep the technical Desk reversible while product roles use focused app launchers."""
	blocked_modules = _blocked_modules(ALLOWED_PRODUCT_MODULES)
	_ensure_module_profile(STAFF_PROFILE, blocked_modules)
	_ensure_module_profile(ENTRY_PROFILE, blocked_modules)

	result = {"assigned": 0, "released": 0, "preserved": 0, "unchanged": 0}
	for user_name in _managed_users():
		roles = set(frappe.get_roles(user_name))
		outcome = _sync_user_profile(user_name, _target_profile(roles), blocked_modules)
		result[outcome] += 1
	return result
