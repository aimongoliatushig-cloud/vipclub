from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import now_datetime

from nomad_vip.api.security import (
	normalize_idempotency_key,
	page_meta,
	page_window,
	record_api_audit,
	require_actor,
	require_entertainer_profile,
)
from nomad_vip.integrations.finex import VIP_BRANCHES


ALLOWED_CATEGORIES = {"Positive", "Concern", "Support"}


def _display_name(profile) -> str:
	return (profile.stage_name or profile.employee_name or profile.employee or profile.name).strip()


def _active_profile(profile_name: str, branch: str):
	profile = frappe.db.get_value(
		"VIP Entertainer Profile",
		profile_name,
		["name", "employee", "employee_name", "stage_name", "branch", "active", "lifecycle_status"],
		as_dict=True,
	)
	if not profile or not profile.active or profile.lifecycle_status not in (None, "", "Active"):
		frappe.throw(_("Идэвхтэй бүжигчин сонгоно уу."), frappe.ValidationError)
	if profile.branch != branch:
		frappe.throw(_("Зөвхөн өөрийн салбарын бүжигчинд санал өгнө."), frappe.PermissionError)
	return profile


@frappe.whitelist(methods=["GET"])
def get_feedback_candidates():
	actor, current = require_entertainer_profile("employee_name", "stage_name")
	profiles = frappe.get_all(
		"VIP Entertainer Profile",
		filters={"branch": current.branch, "active": 1},
		fields=["name", "employee", "employee_name", "stage_name", "current_rank", "lifecycle_status"],
		order_by="stage_name asc, employee_name asc",
		ignore_permissions=True,
	)
	people = [
		{
			"profile": row.name,
			"display_name": _display_name(row),
			"rank": row.current_rank,
		}
		for row in profiles
		if row.name != current.name and row.lifecycle_status in (None, "", "Active")
	]
	return {"branch": current.branch, "people": people, "meta": {"total": len(people)}}


@frappe.whitelist(methods=["POST"])
def submit_feedback(target_entertainer, category, feedback, idempotency_key=None):
	actor, sender = require_entertainer_profile("employee_name", "stage_name")
	category = (category or "").strip()
	feedback = (feedback or "").strip()
	request_key = normalize_idempotency_key(idempotency_key)
	if category not in ALLOWED_CATEGORIES:
		frappe.throw(_("Саналын төрөл сонгоно уу."), frappe.ValidationError)
	if len(feedback) < 10 or len(feedback) > 500:
		frappe.throw(_("Саналаа 10–500 тэмдэгтэд багтааж бичнэ үү."), frappe.ValidationError)
	if target_entertainer == sender.name:
		frappe.throw(_("Өөртөө санал өгөх боломжгүй."), frappe.ValidationError)

	if request_key:
		existing = frappe.db.get_value(
			"VIP Team Climate Feedback", {"idempotency_key": request_key},
			["name", "sender_entertainer", "target_entertainer", "category", "feedback", "submitted_at"], as_dict=True,
		)
		if existing:
			if (
				existing.sender_entertainer != sender.name
				or existing.target_entertainer != target_entertainer
				or existing.category != category
				or existing.feedback != feedback
			):
				frappe.throw(_("Энэ давхардал хамгаалах түлхүүрийг өөр хүсэлтэд ашигласан байна."), frappe.TimestampMismatchError)
			return {"submitted": True, "submitted_at": existing.submitted_at, "replayed": True}

	target = _active_profile((target_entertainer or "").strip(), sender.branch)
	doc = frappe.get_doc({
		"doctype": "VIP Team Climate Feedback",
		"sender_entertainer": sender.name,
		"sender_employee": sender.employee,
		"sender_display_name": _display_name(sender),
		"target_entertainer": target.name,
		"target_employee": target.employee,
		"target_display_name": _display_name(target),
		"branch": sender.branch,
		"category": category,
		"feedback": feedback,
		"submitted_at": now_datetime(),
		"idempotency_key": request_key,
	}).insert(ignore_permissions=True)
	record_api_audit(
		actor=actor,
		action="entertainer.team_climate_feedback.submit",
		target_doctype="VIP Team Climate Feedback",
		target_name=doc.name,
		idempotency_key=request_key,
		details={"target_entertainer": target.name, "category": category, "branch": sender.branch},
	)
	return {"submitted": True, "submitted_at": doc.submitted_at, "replayed": False}


@frappe.whitelist(methods=["GET"])
def get_management_feedback(branch=None, category="All", limit=50, cursor=0):
	actor = require_actor("Branch Manager", "CEO", "System Manager")
	global_access = actor.user == "Administrator" or bool(actor.roles.intersection({"CEO", "System Manager"}))
	requested_branch = (branch or "").strip()
	if global_access:
		if requested_branch and requested_branch not in VIP_BRANCHES:
			frappe.throw(_("Хүчинтэй VIP салбар сонгоно уу."), frappe.ValidationError)
		resolved_branch = requested_branch or None
	else:
		if not actor.branch:
			frappe.throw(_("Таны ажилтны бүртгэлд салбар тохируулаагүй байна."), frappe.PermissionError)
		if requested_branch and requested_branch != actor.branch:
			frappe.throw(_("Өөр салбарын санал харах эрхгүй байна."), frappe.PermissionError)
		resolved_branch = actor.branch

	category = (category or "All").strip()
	if category != "All" and category not in ALLOWED_CATEGORIES:
		frappe.throw(_("Саналын төрөл хүчин төгөлдөр биш байна."), frappe.ValidationError)
	page_size, offset = page_window(limit, cursor)
	filters = {}
	if resolved_branch:
		filters["branch"] = resolved_branch
	if category != "All":
		filters["category"] = category
	fields = [
		"name", "branch", "sender_entertainer", "sender_display_name",
		"target_entertainer", "target_display_name", "category", "feedback", "submitted_at",
	]
	total = frappe.db.count("VIP Team Climate Feedback", filters)
	rows = frappe.get_all(
		"VIP Team Climate Feedback",
		filters=filters,
		fields=fields,
		order_by="submitted_at desc, creation desc",
		limit_start=offset,
		limit_page_length=page_size,
		ignore_permissions=True,
	)
	return {
		"branch": resolved_branch,
		"branches": list(VIP_BRANCHES) if global_access else [actor.branch],
		"feedback": rows,
		"meta": page_meta(branch=resolved_branch, limit=page_size, offset=offset, returned=len(rows), total=total),
	}
