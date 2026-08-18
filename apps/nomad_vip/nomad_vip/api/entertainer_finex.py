from __future__ import annotations

from datetime import timedelta

import frappe
from frappe import _
from frappe.utils import getdate, today

from nomad_vip.api.security import require_entertainer_profile
from nomad_vip.finex_entertainer_metrics import build_finex_entertainer_summary, rank_for_points


WINDOW_DAYS = 62


def _linked_dancer_ids(profile_name: str) -> list[str]:
	return frappe.get_all(
		"VIP Finex Entertainer Candidate",
		filters={"linked_profile": profile_name, "review_status": "Entertainer"},
		pluck="finex_dancer_id",
		ignore_permissions=True,
	)


def _summary(profile) -> dict:
	dancer_ids = _linked_dancer_ids(profile.name)
	end = getdate(today())
	start = end - timedelta(days=WINDOW_DAYS - 1)
	month_start = end.replace(day=1)
	if not dancer_ids:
		frappe.throw(_("Таны борлуулалтын бүртгэл ажилтны бүртгэлтэй хараахан холбогдоогүй байна."))
	bills = frappe.get_all(
		"VIP POS Bill",
		filters={
			"posting_date": ["between", [start, end]],
			"is_paid": 1,
			"store_name": ["like", f"%{profile.branch}%"],
		},
		fields=["name", "posting_date", "is_paid", "bill_type", "raw_payload", "last_synced_at"],
		order_by="posting_date desc",
		limit_page_length=0,
		ignore_permissions=True,
	)
	result = build_finex_entertainer_summary(bills, dancer_ids, start, end, month_start)
	ranks = frappe.get_all(
		"VIP Rank Definition",
		filters={"active": 1},
		fields=["name", "code", "rank_order", "minimum_points", "benefits"],
		order_by="minimum_points asc, rank_order asc",
		ignore_permissions=True,
	)
	current, next_rank = rank_for_points(result["points"], ranks)
	result["rank"] = {
		"current": current,
		"next": next_rank,
		"remaining_points": max(0, float((next_rank or {}).get("minimum_points") or 0) - result["points"]),
	}
	return result


@frappe.whitelist(methods=["GET"])
def get_finex_summary():
	_actor, profile = require_entertainer_profile("name", "branch")
	return _summary(profile)
