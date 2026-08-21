from __future__ import annotations

from calendar import monthrange
from datetime import date, timedelta
import re

import frappe
from frappe import _
from frappe.utils import getdate, today

from nomad_vip.api.security import require_entertainer_profile
from nomad_vip.finex_entertainer_metrics import build_finex_entertainer_summary


WINDOW_DAYS = 62
MONTH_KEY_PATTERN = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")


def _linked_dancer_ids(profile_name: str) -> list[str]:
	return frappe.get_all(
		"VIP Finex Entertainer Candidate",
		filters={"linked_profile": profile_name, "review_status": "Entertainer"},
		pluck="finex_dancer_id",
		ignore_permissions=True,
	)


def _paid_branch_bills(profile, start=None, end=None) -> list[dict]:
	filters = {
		"is_paid": 1,
		"store_name": ["like", f"%{profile.branch}%"],
	}
	if start and end:
		filters["posting_date"] = ["between", [start, end]]
	elif end:
		filters["posting_date"] = ["<=", end]
	return frappe.get_all(
		"VIP POS Bill",
		filters=filters,
		fields=["name", "posting_date", "is_paid", "bill_type", "customer", "raw_payload", "last_synced_at"],
		order_by="posting_date desc",
		limit_page_length=0,
		ignore_permissions=True,
	)


def _payout_rank_evidence(profile) -> tuple[str, list[dict]]:
	current_rank = getattr(profile, "current_rank", None) or frappe.db.get_value(
		"VIP Entertainer Profile", profile.name, "current_rank"
	)
	history = frappe.get_all(
		"VIP Rank History",
		filters={"entertainer": profile.name},
		fields=["from_rank", "to_rank", "changed_at", "effective_from"],
		order_by="effective_from asc, changed_at asc",
		limit_page_length=0,
		ignore_permissions=True,
	)
	return current_rank, history


def _build_summary(profile, bills, start, end, month_start, recent_limit=12) -> dict:
	current_rank, rank_history = _payout_rank_evidence(profile)
	return build_finex_entertainer_summary(
		bills,
		_linked_dancer_ids(profile.name),
		start,
		end,
		month_start,
		recent_limit=recent_limit,
		current_rank=current_rank,
		rank_history=rank_history,
	)


def _summary(profile) -> dict:
	dancer_ids = _linked_dancer_ids(profile.name)
	end = getdate(today())
	start = end - timedelta(days=WINDOW_DAYS - 1)
	month_start = end.replace(day=1)
	if not dancer_ids:
		frappe.throw(_("Таны борлуулалтын бүртгэл ажилтны бүртгэлтэй хараахан холбогдоогүй байна."))
	bills = _paid_branch_bills(profile, start, end)
	return _build_summary(profile, bills, start, end, month_start)


def _month_bounds(month: str | None = None) -> tuple[date, date]:
	current = getdate(today())
	month_key = str(month or current.strftime("%Y-%m")).strip()
	if not MONTH_KEY_PATTERN.fullmatch(month_key):
		frappe.throw(_("Сарыг YYYY-MM хэлбэрээр сонгоно уу."))
	year, month_number = (int(value) for value in month_key.split("-"))
	start = date(year, month_number, 1)
	end = date(year, month_number, monthrange(year, month_number)[1])
	return start, min(end, current) if start <= current else end


def _monthly_summary(profile, month: str | None = None) -> dict:
	dancer_ids = _linked_dancer_ids(profile.name)
	start, end = _month_bounds(month)
	if not dancer_ids:
		frappe.throw(_("Таны борлуулалтын бүртгэл ажилтны бүртгэлтэй хараахан холбогдоогүй байна."))
	bills = _paid_branch_bills(profile, start, end)
	# A monthly salary preview needs every paid service row for the selected
	# month, not only the small recent-activity sample used elsewhere.
	result = _build_summary(profile, bills, start, end, start, recent_limit=500)
	result["selected_month"] = start.strftime("%Y-%m")
	result["data_state"] = "verified" if result.get("quality", {}).get("verified") else "imported"
	return result


def _lifetime_summary(profile) -> dict:
	dancer_ids = _linked_dancer_ids(profile.name)
	end = getdate(today())
	if not dancer_ids:
		frappe.throw(_("Таны борлуулалтын бүртгэл ажилтны бүртгэлтэй хараахан холбогдоогүй байна."))
	bills = _paid_branch_bills(profile, end=end)
	posting_dates = [getdate(row.get("posting_date")) for row in bills if row.get("posting_date")]
	start = min(posting_dates) if posting_dates else end
	result = _build_summary(profile, bills, start, end, end.replace(day=1))
	months = result.get("months") or []
	return {
		"window": result["window"],
		"total_income": result["net_income"],
		"active_months": len(months),
		"service_count": result["service_count"],
		"bill_count": result["bill_count"],
		"months": months,
		"first_service_date": months[-1]["month"] if months else None,
		"last_service_date": months[0]["month"] if months else None,
		"last_synced_at": result.get("last_synced_at"),
		"quality": result.get("quality") or {},
		"payout_policy": result.get("payout_policy") or {},
	}


@frappe.whitelist(methods=["GET"])
def get_finex_summary(month: str | None = None):
	_actor, profile = require_entertainer_profile("name", "branch", "current_rank")
	return _monthly_summary(profile, month)
