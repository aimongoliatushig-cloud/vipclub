from __future__ import annotations

from datetime import date
from decimal import Decimal, InvalidOperation

import frappe
from frappe.utils import get_first_day, getdate

from nomad_vip.entertainer_ranks import DEFAULT_ENTERTAINER_RANK
from nomad_vip.finex_entertainer_metrics import build_finex_entertainer_summary
from nomad_vip.daily_ranking import sales_score_from_amount


def _decimal(value) -> Decimal:
	try:
		return Decimal(str(value or 0))
	except (InvalidOperation, TypeError, ValueError):
		return Decimal("0")


def _daily_sales_summary(profile, scoring_date: date) -> tuple[float | None, dict]:
	threshold = None
	threshold_source = "monthly"
	if frappe.db.exists("DocType", "VIP Monthly Rank Sales Target"):
		threshold = frappe.db.get_value(
			"VIP Monthly Rank Sales Target",
			{"branch": profile.branch, "target_month": get_first_day(getdate(scoring_date))},
			"full_score_amount",
		)
	if _decimal(threshold) <= 0:
		threshold_source = "previous_setting"
		threshold = frappe.db.get_value(
			"VIP Branch Attendance QR",
			{"branch": profile.branch},
			"sales_full_score_amount",
		)
	if _decimal(threshold) <= 0:
		return None, {"mode": "sales_threshold_required", "records": []}

	dancer_ids = frappe.get_all(
		"VIP Finex Entertainer Candidate",
		filters={"linked_profile": profile.name, "review_status": "Entertainer"},
		pluck="finex_dancer_id",
		ignore_permissions=True,
	)
	if not dancer_ids:
		return None, {"mode": "sales_identity_required", "records": []}

	bills = frappe.get_all(
		"VIP POS Bill",
		filters={
			"is_paid": 1,
			"store_name": ["like", f"%{profile.branch}%"],
			"posting_date": scoring_date,
		},
		fields=["name", "posting_date", "is_paid", "bill_type", "customer", "raw_payload", "last_synced_at"],
		order_by="posting_date desc",
		limit_page_length=0,
		ignore_permissions=True,
	)
	history = frappe.get_all(
		"VIP Rank History",
		filters={"entertainer": profile.name},
		fields=["from_rank", "to_rank", "changed_at", "effective_from"],
		order_by="effective_from asc, changed_at asc",
		limit_page_length=0,
		ignore_permissions=True,
	)
	summary = build_finex_entertainer_summary(
		bills,
		dancer_ids,
		scoring_date,
		scoring_date,
		scoring_date.replace(day=1),
		recent_limit=10000,
		current_rank=getattr(profile, "current_rank", None) or DEFAULT_ENTERTAINER_RANK,
		rank_history=history,
	)
	amount = float(summary.get("gross_sales") or 0)
	score = sales_score_from_amount(amount, threshold)
	return score, {
		"mode": "verified_sales_amount",
		"records": [row.name for row in bills],
		"amount": amount,
		"full_score_amount": float(_decimal(threshold)),
		"threshold_source": threshold_source,
	}


def daily_sales_score(profile, scoring_date: date) -> tuple[float | None, dict]:
	return _daily_sales_summary(profile, scoring_date)
