from __future__ import annotations

import hashlib

import frappe
from frappe import _
from frappe.utils import flt, now_datetime

from nomad_vip.entertainer_ranks import DEFAULT_ENTERTAINER_RANK


PRIVILEGED_ROLES = {"System Manager", "Administrator", "CEO"}
BRANCH_ROLES = {"Lead Entertainer", "Entertainer Supervisor", "Branch Manager", "Reception", "Operation"}


def get_employee_for_user(user: str | None = None) -> str | None:
	user = user or frappe.session.user
	if user == "Guest":
		return None
	return frappe.db.get_value("Employee", {"user_id": user, "status": "Active"}, "name")


def get_profile_for_user(user: str | None = None) -> str | None:
	employee = get_employee_for_user(user)
	if not employee:
		return None
	return frappe.db.get_value("VIP Entertainer Profile", {"employee": employee, "active": 1}, "name")


def get_branch_for_user(user: str | None = None) -> str | None:
	employee = get_employee_for_user(user)
	if not employee:
		return None
	return frappe.db.get_value("Employee", employee, "branch")


def require_profile_for_user() -> str:
	profile = get_profile_for_user()
	if not profile:
		frappe.throw(_("Your user is not linked to an active entertainer profile."), frappe.PermissionError)
	return profile


def require_any_role(*roles: str) -> None:
	if frappe.session.user == "Administrator":
		return
	if not set(frappe.get_roles()).intersection(roles):
		frappe.throw(_("You are not allowed to perform this action."), frappe.PermissionError)


def published_policy() -> frappe._dict:
	policy = frappe.db.get_value(
		"VIP Ranking Policy",
		{"status": "Published", "effective_from": ("<=", frappe.utils.today())},
		["name", "version", "ready_points", "not_ready_points"],
		as_dict=True,
		order_by="effective_from desc, creation desc",
	)
	if not policy:
		frappe.throw(_("No published ranking policy is active."))
	return policy


def make_deduplication_key(source: str, external_id: str) -> str:
	return hashlib.sha256(f"{source}:{external_id}".encode()).hexdigest()


def post_readiness_points(check) -> tuple[str, str, float]:
	policy = published_policy()
	points = flt(policy.ready_points if check.result == "READY" else policy.not_ready_points)
	external_id = f"readiness:{check.name}"
	key = make_deduplication_key("VIP Daily Readiness Check", external_id)

	if frappe.db.exists("VIP Performance Event", {"deduplication_key": key}):
		event_name = frappe.db.get_value("VIP Performance Event", {"deduplication_key": key}, "name")
		ledger_name = frappe.db.get_value("VIP Point Ledger", {"performance_event": event_name}, "name")
		return event_name, ledger_name, points

	event = frappe.get_doc(
		{
			"doctype": "VIP Performance Event",
			"entertainer": check.entertainer,
			"event_type": "Readiness Ready" if check.result == "READY" else "Readiness Not Ready",
			"occurred_at": check.checked_at or now_datetime(),
			"source": "VIP Daily Readiness Check",
			"external_id": external_id,
			"deduplication_key": key,
			"verified": 1,
			"source_document_type": check.doctype,
			"source_document_name": check.name,
		}
	).insert(ignore_permissions=True)

	ledger = frappe.get_doc(
		{
			"doctype": "VIP Point Ledger",
			"entertainer": check.entertainer,
			"performance_event": event.name,
			"metric": "Readiness",
			"points": points,
			"ranking_policy": policy.name,
			"posted_at": now_datetime(),
		}
	).insert(ignore_permissions=True)

	update_profile_points(check.entertainer)
	return event.name, ledger.name, points


def update_profile_points(profile_name: str) -> None:
	total = frappe.db.sql(
		"""
		select coalesce(sum(points), 0)
		from `tabVIP Point Ledger`
		where entertainer = %s
		""",
		(profile_name,),
	)[0][0]

	current = frappe.db.get_value(
		"VIP Entertainer Profile", profile_name, ["current_rank", "current_points"], as_dict=True
	)
	# Оноо нь баталгаатай үйл явдлаас автоматаар шинэчлэгдэнэ. Харин зэрэглэл бол
	# хүний шийдвэр тул эндээс автоматаар ахиулах/бууруулах ёсгүй.
	approved_rank = current.current_rank if current and current.current_rank else DEFAULT_ENTERTAINER_RANK
	frappe.db.set_value(
		"VIP Entertainer Profile",
		profile_name,
		{
			"current_points": total,
			"current_rank": approved_rank,
			"rank_last_calculated_at": now_datetime(),
		},
		update_modified=False,
	)


def reverse_readiness_points(check, reason: str) -> str:
	if not reason or not reason.strip():
		frappe.throw(_("A correction reason is required."))
	if check.is_reversed:
		frappe.throw(_("This readiness check has already been reversed."))

	original = frappe.get_doc("VIP Point Ledger", check.point_ledger)
	external_id = f"readiness-reversal:{check.name}"
	key = make_deduplication_key("VIP Daily Readiness Check Reversal", external_id)
	if frappe.db.exists("VIP Performance Event", {"deduplication_key": key}):
		frappe.throw(_("This readiness check has already been reversed."))

	event = frappe.get_doc(
		{
			"doctype": "VIP Performance Event",
			"entertainer": check.entertainer,
			"event_type": "Reversal",
			"occurred_at": now_datetime(),
			"source": "VIP Daily Readiness Check Reversal",
			"external_id": external_id,
			"deduplication_key": key,
			"verified": 1,
			"source_document_type": check.doctype,
			"source_document_name": check.name,
		}
	).insert(ignore_permissions=True)
	reversal = frappe.get_doc(
		{
			"doctype": "VIP Point Ledger",
			"entertainer": check.entertainer,
			"performance_event": event.name,
			"metric": original.metric,
			"points": -flt(original.points),
			"ranking_policy": original.ranking_policy,
			"posted_at": now_datetime(),
			"is_reversal": 1,
			"reversal_of": original.name,
			"reason": reason.strip(),
		}
	).insert(ignore_permissions=True)
	check.db_set("is_reversed", 1, update_modified=False)
	check.db_set("reversal_point_ledger", reversal.name, update_modified=False)
	check.db_set("reversal_reason", reason.strip(), update_modified=False)
	update_profile_points(check.entertainer)
	return reversal.name
