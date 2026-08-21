from __future__ import annotations

import json

import frappe
from frappe import _
from frappe.utils import flt, get_first_day, get_time, getdate, now_datetime, today

from nomad_vip.api.attendance import VIP_BRANCHES, _ensure_config
from nomad_vip.api.security import (
	assert_not_stale,
	normalize_idempotency_key,
	record_api_audit,
	require_actor,
)
from nomad_vip.daily_ranking import CANONICAL_WEIGHTS


ACTION = "manager.branch_settings.update"
MAX_SALES_FULL_SCORE_AMOUNT = 1_000_000_000
MONTHLY_TARGET_DOCTYPE = "VIP Monthly Rank Sales Target"


def _settings_actor(branch=None):
	actor = require_actor("Branch Manager", require_branch=True)
	if actor.user == "Administrator" or "Branch Manager" not in actor.roles:
		frappe.throw(_("Энэ тохиргоог зөвхөн салбарын менежер өөрчилнө."), frappe.PermissionError)
	requested = (branch or actor.branch or "").strip()
	if not requested or requested not in VIP_BRANCHES:
		frappe.throw(_("Салбар сонгоно уу."), frappe.ValidationError)
	if not actor.branch or requested != actor.branch:
		frappe.throw(_("Та зөвхөн өөрийн салбарын тохиргоог өөрчилнө."), frappe.PermissionError)
	return actor, requested


def _sales_weight() -> float:
	value = frappe.db.get_value(
		"VIP Ranking Policy",
		{"status": "Published", "effective_from": ("<=", today()), "daily_scoring_enabled": 1},
		"sales_weight",
		order_by="effective_from desc, creation desc",
	)
	return flt(value if value is not None else CANONICAL_WEIGHTS["sales"])


def _month_start(value=None):
	try:
		return get_first_day(getdate(value or today()))
	except (TypeError, ValueError):
		frappe.throw(_("Тохируулах сар буруу байна."), frappe.ValidationError)


def _monthly_target(branch: str, month_start):
	if not frappe.db.exists("DocType", MONTHLY_TARGET_DOCTYPE):
		return None
	return frappe.db.get_value(
		MONTHLY_TARGET_DOCTYPE,
		{"branch": branch, "target_month": month_start},
		["name", "full_score_amount", "reason", "updated_by", "updated_at", "modified"],
		as_dict=True,
	)


def _serialize(config, branch: str, month=None) -> dict:
	month_start = _month_start(month)
	monthly = _monthly_target(branch, month_start)
	legacy_amount = flt(config.sales_full_score_amount)
	amount = flt(monthly.full_score_amount) if monthly else legacy_amount
	return {
		"branch": branch,
		"sales": {
			"month": str(month_start)[:7],
			"weight": _sales_weight(),
			"full_score_amount": amount,
			"configured": amount > 0,
			"source": "monthly" if monthly else ("previous_setting" if legacy_amount > 0 else "empty"),
			"updated_by": monthly.updated_by if monthly else config.rank_scoring_updated_by,
			"updated_at": monthly.updated_at if monthly else config.rank_scoring_updated_at,
			"modified": monthly.modified if monthly else None,
		},
		"attendance": {
			"late_after_time": str(get_time(config.late_after_time or "22:00:00")),
			"updated_by": config.policy_updated_by,
			"updated_at": config.policy_updated_at,
		},
		"modified": config.modified,
	}


@frappe.whitelist(methods=["GET"])
def get_manager_settings(branch=None, month=None):
	_actor, branch = _settings_actor(branch)
	return _serialize(_ensure_config(branch), branch, month)


@frappe.whitelist(methods=["POST"])
def update_manager_settings(
	sales_full_score_amount,
	late_after_time,
	reason,
	month=None,
	expected_modified=None,
	expected_sales_modified=None,
	idempotency_key=None,
	branch=None,
):
	actor, branch = _settings_actor(branch)
	month_start = _month_start(month)
	if month_start < get_first_day(getdate(today())):
		frappe.throw(_("Өнгөрсөн сарын босгыг өөрчлөх боломжгүй."), frappe.ValidationError)
	reason = (reason or "").strip()
	if len(reason) < 3:
		frappe.throw(_("Өөрчилсөн шалтгаанаа бичнэ үү."), frappe.ValidationError)
	amount = flt(sales_full_score_amount)
	if amount <= 0:
		frappe.throw(_("Борлуулалтын бүтэн онооны босго 0-ээс их байна."), frappe.ValidationError)
	if amount > MAX_SALES_FULL_SCORE_AMOUNT:
		frappe.throw(_("Борлуулалтын босго хэт өндөр байна."), frappe.ValidationError)
	try:
		late_time = get_time(late_after_time)
	except (TypeError, ValueError):
		frappe.throw(_("Ирцийн цаг буруу байна."), frappe.ValidationError)

	key = normalize_idempotency_key(idempotency_key)
	if not key:
		frappe.throw(_("Давхардал хамгаалах түлхүүр шаардлагатай."), frappe.ValidationError)
	requested = {
		"branch": branch,
		"month": str(month_start)[:7],
		"sales_full_score_amount": amount,
		"late_after_time": late_time.strftime("%H:%M:%S"),
		"reason": reason,
	}
	existing_audit = frappe.db.get_value(
		"VIP API Audit Event",
		{"actor": actor.user, "action": ACTION, "idempotency_key": key, "outcome": "Succeeded"},
		["name", "details"],
		as_dict=True,
	)
	if existing_audit:
		try:
			details = json.loads(existing_audit.details or "{}")
		except (TypeError, ValueError):
			details = {}
		if details.get("requested") != requested:
			frappe.throw(_("Энэ давхардал хамгаалах түлхүүрийг өөр хүсэлтэд ашигласан байна."), frappe.TimestampMismatchError)
		result = get_manager_settings(branch, month_start)
		result.update({"audit": existing_audit.name, "replayed": True})
		return result

	config = _ensure_config(branch)
	frappe.db.sql("SELECT name FROM `tabVIP Branch Attendance QR` WHERE name=%s FOR UPDATE", config.name)
	assert_not_stale("VIP Branch Attendance QR", config.name, expected_modified)
	target_name = frappe.db.get_value(
		MONTHLY_TARGET_DOCTYPE,
		{"branch": branch, "target_month": month_start},
		"name",
	)
	if target_name:
		frappe.db.sql(f"SELECT name FROM `tab{MONTHLY_TARGET_DOCTYPE}` WHERE name=%s FOR UPDATE", target_name)
		target = frappe.get_doc(MONTHLY_TARGET_DOCTYPE, target_name)
		assert_not_stale(MONTHLY_TARGET_DOCTYPE, target.name, expected_sales_modified)
	else:
		target = frappe.get_doc({
			"doctype": MONTHLY_TARGET_DOCTYPE,
			"unique_key": f"{branch}|{str(month_start)[:7]}",
			"branch": branch,
			"target_month": month_start,
		})
	before = {
		"month": str(month_start)[:7],
		"sales_full_score_amount": flt(target.full_score_amount),
		"late_after_time": str(get_time(config.late_after_time or "22:00:00")),
	}
	now = now_datetime()
	target.full_score_amount = amount
	target.reason = reason
	target.updated_by = actor.user
	target.updated_at = now
	if target.is_new():
		target.insert(ignore_permissions=True)
	else:
		target.save(ignore_permissions=True)
	config.db_set({
		"late_after_time": requested["late_after_time"],
		"policy_updated_by": actor.user,
		"policy_updated_at": now,
	})
	audit = record_api_audit(
		actor=actor,
		action=ACTION,
		target_doctype=MONTHLY_TARGET_DOCTYPE,
		target_name=target.name,
		idempotency_key=key,
		details={"requested": requested, "before": before, "after": requested},
	)
	frappe.db.commit()
	result = get_manager_settings(branch, month_start)
	result.update({"audit": audit, "replayed": False})
	return result
