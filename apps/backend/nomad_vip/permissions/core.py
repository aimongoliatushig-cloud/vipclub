from __future__ import annotations

import frappe

from nomad_vip.services import BRANCH_ROLES, PRIVILEGED_ROLES, get_branch_for_user, get_profile_for_user


def _roles(user: str | None = None) -> set[str]:
	return set(frappe.get_roles(user or frappe.session.user))


def _is_privileged(user: str | None = None) -> bool:
	user = user or frappe.session.user
	return user == "Administrator" or bool(_roles(user).intersection(PRIVILEGED_ROLES))


def _quoted(value: str) -> str:
	return frappe.db.escape(value)


def _canonical_vip_branch(value: str | None) -> str | None:
	"""Resolve a Finex store/employee branch to the shared canonical VIP branch name."""
	normalized = (value or "").strip().casefold()
	if not normalized:
		return None

	# Import lazily so Desk permission evaluation does not initialize the Finex client module
	# until this bill-specific policy is evaluated.
	from nomad_vip.integrations.finex import VIP_BRANCHES

	for branch in VIP_BRANCHES:
		branch_key = branch.casefold()
		if branch_key in normalized or normalized in branch_key:
			return branch
	return None


def get_profile_query_conditions(user: str | None = None) -> str:
	user = user or frappe.session.user
	if _is_privileged(user) or "HR Manager" in _roles(user):
		return ""
	profile = get_profile_for_user(user)
	branch = get_branch_for_user(user)
	if _roles(user).intersection(BRANCH_ROLES) and branch:
		return f"`tabVIP Entertainer Profile`.`branch` = {_quoted(branch)}"
	return f"`tabVIP Entertainer Profile`.`name` = {_quoted(profile or '')}"


def has_profile_permission(doc, user: str | None = None, permission_type: str | None = None) -> bool:
	user = user or frappe.session.user
	roles = _roles(user)
	if _is_privileged(user) or "HR Manager" in roles:
		return True
	if doc.name == get_profile_for_user(user) and permission_type in (None, "read", "select"):
		return True
	branch = doc.branch or (
		frappe.db.get_value("Employee", doc.employee, "branch") if getattr(doc, "employee", None) else None
	)
	if branch != get_branch_for_user(user):
		return False
	if "Branch Manager" in roles:
		return permission_type in (None, "read", "select", "create", "write")
	return bool(roles.intersection({"Entertainer Supervisor", "Reception"}) and permission_type in (None, "read", "select"))


def get_branch_assignment_query_conditions(user: str | None = None) -> str:
	user = user or frappe.session.user
	roles = _roles(user)
	if _is_privileged(user) or "HR Manager" in roles:
		return ""
	branch = get_branch_for_user(user)
	if roles.intersection(BRANCH_ROLES) and branch:
		return f"`tabVIP Entertainer Branch Assignment`.`branch` = {_quoted(branch)}"
	profile = get_profile_for_user(user)
	return f"`tabVIP Entertainer Branch Assignment`.`entertainer` = {_quoted(profile or '')}"


def has_branch_assignment_permission(doc, user: str | None = None, permission_type: str | None = None) -> bool:
	user = user or frappe.session.user
	roles = _roles(user)
	if _is_privileged(user) or "HR Manager" in roles:
		return True
	if doc.entertainer == get_profile_for_user(user):
		return permission_type in (None, "read", "select")
	if doc.branch != get_branch_for_user(user):
		return False
	if "Branch Manager" in roles:
		return permission_type in (None, "read", "select", "create", "write")
	return bool("Entertainer Supervisor" in roles and permission_type in (None, "read", "select"))


def get_branch_attendance_qr_query_conditions(user: str | None = None) -> str:
	user = user or frappe.session.user
	if _is_privileged(user) or "VIP Admin" in _roles(user):
		return ""
	return "1 = 0"


def has_branch_attendance_qr_permission(doc, user: str | None = None, permission_type: str | None = None) -> bool:
	user = user or frappe.session.user
	if _is_privileged(user) or "VIP Admin" in _roles(user):
		return True
	return False


def get_attendance_scan_query_conditions(user: str | None = None) -> str:
	user = user or frappe.session.user
	if _is_privileged(user) or _roles(user).intersection({"VIP Admin", "HR Manager"}):
		return ""
	branch = get_branch_for_user(user)
	if _roles(user).intersection({"Branch Manager", "Entertainer Supervisor"}) and branch:
		return f"`tabVIP Attendance Scan`.`branch` = {_quoted(branch)}"
	return f"`tabVIP Attendance Scan`.`entertainer` = {_quoted(get_profile_for_user(user) or '')}"


def has_attendance_scan_permission(doc, user: str | None = None, permission_type: str | None = None) -> bool:
	user = user or frappe.session.user
	if permission_type not in (None, "read", "select"):
		return False
	if _is_privileged(user) or _roles(user).intersection({"VIP Admin", "HR Manager"}):
		return True
	if doc.entertainer == get_profile_for_user(user):
		return True
	return bool(_roles(user).intersection({"Branch Manager", "Entertainer Supervisor"}) and doc.branch == get_branch_for_user(user))


def _get_branch_or_own_query_conditions(doctype: str, user: str | None = None) -> str:
	user = user or frappe.session.user
	roles = _roles(user)
	if _is_privileged(user) or roles.intersection({"VIP Admin", "HR Manager"}):
		return ""
	branch = get_branch_for_user(user)
	if roles.intersection({"Branch Manager", "Entertainer Supervisor"}) and branch:
		return f"`tab{doctype}`.`branch` = {_quoted(branch)}"
	return f"`tab{doctype}`.`entertainer` = {_quoted(get_profile_for_user(user) or '')}"


def _has_branch_or_own_permission(doc, user: str | None = None, permission_type: str | None = None) -> bool:
	user = user or frappe.session.user
	if permission_type not in (None, "read", "select"):
		return False
	roles = _roles(user)
	if _is_privileged(user) or roles.intersection({"VIP Admin", "HR Manager"}):
		return True
	if doc.entertainer == get_profile_for_user(user):
		return True
	return bool(roles.intersection({"Branch Manager", "Entertainer Supervisor"}) and doc.branch == get_branch_for_user(user))


def get_emergency_leave_query_conditions(user: str | None = None) -> str:
	return _get_branch_or_own_query_conditions("VIP Emergency Leave Request", user)


def has_emergency_leave_permission(doc, user: str | None = None, permission_type: str | None = None) -> bool:
	return _has_branch_or_own_permission(doc, user, permission_type)


def get_attendance_penalty_query_conditions(user: str | None = None) -> str:
	return _get_branch_or_own_query_conditions("VIP Attendance Penalty", user)


def has_attendance_penalty_permission(doc, user: str | None = None, permission_type: str | None = None) -> bool:
	return _has_branch_or_own_permission(doc, user, permission_type)


def get_availability_event_query_conditions(user: str | None = None) -> str:
	return _get_branch_or_own_query_conditions("VIP Availability Event", user)


def has_availability_event_permission(doc, user: str | None = None, permission_type: str | None = None) -> bool:
	return _has_branch_or_own_permission(doc, user, permission_type)


def get_attendance_correction_query_conditions(user: str | None = None) -> str:
	return _get_branch_or_own_query_conditions("VIP Attendance Correction Request", user)


def has_attendance_correction_permission(doc, user: str | None = None, permission_type: str | None = None) -> bool:
	return _has_branch_or_own_permission(doc, user, permission_type)


def get_profile_change_request_query_conditions(user: str | None = None) -> str:
	user = user or frappe.session.user
	roles = _roles(user)
	if user == "Administrator" or roles.intersection({"System Manager", "HR Manager"}):
		return ""
	branch = get_branch_for_user(user)
	if "Branch Manager" in roles and branch:
		return f"`tabVIP Entertainer Profile Change Request`.`branch` = {_quoted(branch)}"
	return (
		"`tabVIP Entertainer Profile Change Request`.`entertainer` = "
		+ _quoted(get_profile_for_user(user) or "")
	)


def has_profile_change_request_permission(doc, user: str | None = None, permission_type: str | None = None) -> bool:
	user = user or frappe.session.user
	if permission_type not in (None, "read", "select"):
		return False
	roles = _roles(user)
	if user == "Administrator" or roles.intersection({"System Manager", "HR Manager"}):
		return True
	if doc.entertainer == get_profile_for_user(user):
		return True
	return bool("Branch Manager" in roles and doc.branch == get_branch_for_user(user))


def get_finex_candidate_query_conditions(user: str | None = None) -> str:
	user = user or frappe.session.user
	roles = _roles(user)
	if _is_privileged(user) or roles.intersection({"VIP Admin", "HR Manager"}):
		return ""
	branch = get_branch_for_user(user)
	if "Branch Manager" in roles and branch:
		return f"`tabVIP Finex Entertainer Candidate`.`inferred_branch` = {_quoted(branch)}"
	return "1 = 0"


def has_finex_candidate_permission(doc, user: str | None = None, permission_type: str | None = None) -> bool:
	user = user or frappe.session.user
	roles = _roles(user)
	if _is_privileged(user) or roles.intersection({"VIP Admin", "HR Manager"}):
		return True
	return bool(
		"Branch Manager" in roles
		and doc.inferred_branch == get_branch_for_user(user)
		and permission_type in (None, "read", "select", "write")
	)


def get_finex_schedule_query_conditions(user: str | None = None) -> str:
	user = user or frappe.session.user
	roles = _roles(user)
	if _is_privileged(user) or roles.intersection({"VIP Admin", "HR Manager"}):
		return ""
	branch = get_branch_for_user(user)
	if "Branch Manager" in roles and branch:
		return f"`tabVIP Finex Schedule Snapshot`.`branch` = {_quoted(branch)}"
	profile = get_profile_for_user(user)
	if profile:
		return f"`tabVIP Finex Schedule Snapshot`.`linked_profile` = {_quoted(profile)}"
	return "1 = 0"


def has_finex_schedule_permission(doc, user: str | None = None, permission_type: str | None = None) -> bool:
	user = user or frappe.session.user
	if permission_type not in (None, "read", "select", "report", "export"):
		return False
	roles = _roles(user)
	if _is_privileged(user) or roles.intersection({"VIP Admin", "HR Manager"}):
		return True
	if "Branch Manager" in roles and doc.branch == get_branch_for_user(user):
		return True
	return bool(doc.linked_profile == get_profile_for_user(user))


def _get_entertainer_record_query_conditions(doctype: str, user: str | None = None) -> str:
	user = user or frappe.session.user
	if _is_privileged(user):
		return ""
	profile = get_profile_for_user(user)
	branch = get_branch_for_user(user)
	if _roles(user).intersection(BRANCH_ROLES) and branch:
		return (
			"exists (select 1 from `tabVIP Entertainer Profile` p "
			f"where p.name = `tab{doctype}`.entertainer and p.branch = {_quoted(branch)})"
		)
	return f"`tab{doctype}`.entertainer = " + _quoted(profile or "")


def get_performance_event_query_conditions(user: str | None = None) -> str:
	return _get_entertainer_record_query_conditions("VIP Performance Event", user)


def get_point_ledger_query_conditions(user: str | None = None) -> str:
	return _get_entertainer_record_query_conditions("VIP Point Ledger", user)


def get_rank_history_query_conditions(user: str | None = None) -> str:
	return _get_entertainer_record_query_conditions("VIP Rank History", user)


def get_daily_rank_snapshot_query_conditions(user: str | None = None) -> str:
	return _get_entertainer_record_query_conditions("VIP Entertainer Daily Rank Snapshot", user)


def has_entertainer_record_permission(doc, user: str | None = None, permission_type: str | None = None) -> bool:
	user = user or frappe.session.user
	if _is_privileged(user):
		return True
	if permission_type not in (None, "read", "select"):
		return False
	if doc.entertainer == get_profile_for_user(user):
		return True
	branch = frappe.db.get_value("VIP Entertainer Profile", doc.entertainer, "branch")
	return bool(_roles(user).intersection(BRANCH_ROLES) and branch == get_branch_for_user(user))


def get_readiness_query_conditions(user: str | None = None) -> str:
	user = user or frappe.session.user
	if _is_privileged(user):
		return ""
	profile = get_profile_for_user(user)
	branch = get_branch_for_user(user)
	if _roles(user).intersection({"Lead Entertainer", "Entertainer Supervisor", "Branch Manager"}) and branch:
		return f"`tabVIP Daily Readiness Check`.`branch` = {_quoted(branch)}"
	return f"`tabVIP Daily Readiness Check`.`entertainer` = {_quoted(profile or '')}"


def has_readiness_permission(doc, user: str | None = None, permission_type: str | None = None) -> bool:
	user = user or frappe.session.user
	if _is_privileged(user):
		return True
	roles = _roles(user)
	if permission_type in (None, "read", "select") and doc.entertainer == get_profile_for_user(user):
		return True
	return bool(
		roles.intersection({"Lead Entertainer", "Entertainer Supervisor", "Branch Manager"})
		and doc.branch == get_branch_for_user(user)
		and permission_type in (None, "read", "select", "create", "write")
	)


def get_reservation_query_conditions(user: str | None = None) -> str:
	user = user or frappe.session.user
	if _is_privileged(user):
		return ""
	profile = get_profile_for_user(user)
	branch = get_branch_for_user(user)
	if _roles(user).intersection(BRANCH_ROLES) and branch:
		return f"`tabVIP Reservation`.`branch` = {_quoted(branch)}"
	return f"`tabVIP Reservation`.`entertainer` = {_quoted(profile or '')}"


def has_reservation_permission(doc, user: str | None = None, permission_type: str | None = None) -> bool:
	user = user or frappe.session.user
	if _is_privileged(user):
		return True
	if doc.entertainer == get_profile_for_user(user) and permission_type in (None, "read", "select"):
		return True
	return bool(
		_roles(user).intersection(BRANCH_ROLES)
		and doc.branch == get_branch_for_user(user)
		and permission_type in (None, "read", "select", "create", "write")
	)


def get_entry_event_query_conditions(user: str | None = None) -> str:
	user = user or frappe.session.user
	if _is_privileged(user):
		return ""
	branch = get_branch_for_user(user)
	if _roles(user).intersection({"Reception", "Branch Manager"}) and branch:
		return f"`tabVIP Customer Entry Event`.`branch` = {_quoted(branch)}"
	return "1 = 0"


def has_entry_event_permission(doc, user: str | None = None, permission_type: str | None = None) -> bool:
	user = user or frappe.session.user
	if _is_privileged(user):
		return True
	return bool(
		_roles(user).intersection({"Reception", "Branch Manager"})
		and doc.branch == get_branch_for_user(user)
		and permission_type in (None, "read", "select", "create", "write")
	)


def get_phone_reservation_query_conditions(user: str | None = None) -> str:
	user = user or frappe.session.user
	if _is_privileged(user):
		return ""
	branch = get_branch_for_user(user)
	if _roles(user).intersection({"Operation", "Reception", "Branch Manager"}) and branch:
		return f"`tabVIP Phone Reservation`.`branch` = {_quoted(branch)}"
	return "1 = 0"


def has_phone_reservation_permission(doc, user: str | None = None, permission_type: str | None = None) -> bool:
	user = user or frappe.session.user
	if _is_privileged(user):
		return True
	return bool(
		_roles(user).intersection({"Operation", "Reception", "Branch Manager"})
		and doc.branch == get_branch_for_user(user)
		and permission_type in (None, "read", "select", "create", "write")
	)


def get_customer_point_ledger_query_conditions(user: str | None = None) -> str:
	user = user or frappe.session.user
	if _is_privileged(user) or "VIP Admin" in _roles(user):
		return ""
	branch = get_branch_for_user(user)
	if "Branch Manager" in _roles(user) and branch:
		return f"`tabVIP Customer Point Ledger`.`branch` = {_quoted(branch)}"
	return "1 = 0"


def has_customer_point_ledger_permission(doc, user: str | None = None, permission_type: str | None = None) -> bool:
	user = user or frappe.session.user
	if _is_privileged(user) or "VIP Admin" in _roles(user):
		return True
	return bool(
		"Branch Manager" in _roles(user)
		and doc.branch == get_branch_for_user(user)
		and permission_type in (None, "read", "select")
	)


def get_pos_bill_query_conditions(user: str | None = None) -> str:
	"""Keep raw Finex bills out of Reception and outside a manager's own branch."""
	user = user or frappe.session.user
	if _is_privileged(user):
		return ""
	if "Branch Manager" not in _roles(user):
		return "1 = 0"

	branch = _canonical_vip_branch(get_branch_for_user(user))
	if not branch:
		return "1 = 0"
	pattern = f"%{branch.casefold()}%"
	return f"lower(coalesce(`tabVIP POS Bill`.`store_name`, '')) like {_quoted(pattern)}"


def has_pos_bill_permission(doc, user: str | None = None, permission_type: str | None = None) -> bool:
	user = user or frappe.session.user
	if _is_privileged(user):
		return True
	if permission_type not in (None, "read", "select", "report", "export"):
		return False
	if "Branch Manager" not in _roles(user):
		return False

	actor_branch = _canonical_vip_branch(get_branch_for_user(user))
	bill_branch = _canonical_vip_branch(getattr(doc, "store_name", None))
	return bool(actor_branch and bill_branch and actor_branch == bill_branch)


def get_customer_branch_profile_query_conditions(user: str | None = None) -> str:
	"""Expose full customer branch profiles only to their own branch manager."""
	user = user or frappe.session.user
	if _is_privileged(user):
		return ""
	if "Branch Manager" not in _roles(user):
		# Reception uses the guarded customer projection API. The master DocType also
		# contains bill totals, so it must not be exposed directly through Desk.
		return "1 = 0"

	branch = get_branch_for_user(user)
	if not branch:
		return "1 = 0"
	return f"`tabVIP Customer Branch Profile`.`branch` = {_quoted(branch)}"


def has_customer_branch_profile_permission(
	doc, user: str | None = None, permission_type: str | None = None
) -> bool:
	user = user or frappe.session.user
	if _is_privileged(user):
		return True
	if "Branch Manager" not in _roles(user):
		return False
	# Rank and ban changes must go through the audited manager APIs rather than a
	# direct Desk form save of this Finex-derived master record.
	if permission_type not in (None, "read", "select", "report", "export"):
		return False
	return bool(getattr(doc, "branch", None) and doc.branch == get_branch_for_user(user))


def get_team_climate_feedback_query_conditions(user: str | None = None) -> str:
	"""Keep peer feedback visible only to CEO/System Manager and the row's branch manager."""
	user = user or frappe.session.user
	roles = _roles(user)
	if user == "Administrator" or roles.intersection({"CEO", "System Manager"}):
		return ""
	branch = get_branch_for_user(user)
	if "Branch Manager" in roles and branch:
		return f"`tabVIP Team Climate Feedback`.`branch` = {_quoted(branch)}"
	return "1 = 0"


def has_team_climate_feedback_permission(
	doc, user: str | None = None, permission_type: str | None = None
) -> bool:
	user = user or frappe.session.user
	if permission_type not in (None, "read", "select", "report", "export"):
		return False
	roles = _roles(user)
	if user == "Administrator" or roles.intersection({"CEO", "System Manager"}):
		return True
	return bool(
		"Branch Manager" in roles
		and getattr(doc, "branch", None)
		and doc.branch == get_branch_for_user(user)
	)
