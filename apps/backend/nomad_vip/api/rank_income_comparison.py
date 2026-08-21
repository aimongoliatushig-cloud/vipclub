from __future__ import annotations

from calendar import monthrange
from datetime import date, timedelta

import frappe
from frappe import _
from frappe.utils import getdate, today

from nomad_vip.api.security import require_entertainer_profile
from nomad_vip.api.entertainer_finex import (
	_linked_dancer_ids,
	_paid_branch_bills,
	_payout_rank_evidence,
)
from nomad_vip.entertainer_ranks import (
	ACTIVE_ENTERTAINER_RANKS,
	DEFAULT_ENTERTAINER_RANK,
	payout_percent_for_rank,
)
from nomad_vip.finex_entertainer_metrics import build_finex_entertainer_summary


def _calendar_period(reference: date) -> tuple[date, date]:
	start_day = ((reference.day - 1) // 3) * 3 + 1
	end_day = min(start_day + 2, monthrange(reference.year, reference.month)[1])
	return reference.replace(day=start_day), reference.replace(day=end_day)


def _demo_rank_history(profile_name: str, month_start: date, period_end: date):
	# Lazy import avoids changing the existing API module dependency graph.
	from nomad_vip.api.entertainer import _demo_rank_snapshots

	snapshots = []
	for snapshot in _demo_rank_snapshots(profile_name, 31):
		scoring_date = getdate(snapshot.get("scoring_date")) if snapshot.get("scoring_date") else None
		rank = str(snapshot.get("calculated_rank") or "")
		if (
			scoring_date
			and month_start <= scoring_date < period_end
			and snapshot.get("status") == "Complete"
			and rank in ACTIVE_ENTERTAINER_RANKS
		):
			snapshots.append((scoring_date, rank))

	current_rank = DEFAULT_ENTERTAINER_RANK
	history = []
	for scoring_date, rank in sorted(snapshots):
		history.append({
			"from_rank": current_rank,
			"to_rank": rank,
			"changed_at": scoring_date.isoformat(),
			"effective_from": (scoring_date + timedelta(days=1)).isoformat(),
		})
		current_rank = rank
	return history, (max((row[0] for row in snapshots), default=None))


def _rank_at_end(history, period_end: date) -> str:
	rank = DEFAULT_ENTERTAINER_RANK
	for row in history:
		if getdate(row.get("effective_from")) <= period_end:
			rank = row.get("to_rank") or rank
	return rank


def _approved_month_deduction(profile_name: str, start: date, end: date) -> tuple[float | None, str]:
	try:
		rows = frappe.get_all(
			"VIP Attendance Penalty",
			filters={
				"entertainer": profile_name,
				"status": "Approved",
				"attendance_date": ("between", [start, end]),
			},
			fields=["amount"],
			limit_page_length=0,
			ignore_permissions=True,
		)
	except frappe.DoesNotExistError:
		return None, "unavailable"
	return sum(float(row.get("amount") or 0) for row in rows), "available"


def _summary(profile, bills, dancer_ids, start: date, end: date, current_rank, rank_history=()):
	return build_finex_entertainer_summary(
		bills,
		dancer_ids,
		start,
		end,
		start,
		recent_limit=0,
		current_rank=current_rank,
		rank_history=rank_history,
	)


@frappe.whitelist(methods=["GET"])
def get_rank_income_comparison(period_date: str | None = None):
	"""Compare the current fixed three-day payout period using daily ranks."""
	_actor, profile = require_entertainer_profile("name", "branch", "current_rank")
	today_date = getdate(today())
	reference_date = getdate(period_date) if period_date else today_date
	if reference_date > today_date:
		frappe.throw(_("Ирээдүйн цалингийн мөчлөгийг харах боломжгүй."), frappe.ValidationError)
	month_start = reference_date.replace(day=1)
	period_start, period_end = _calendar_period(reference_date)
	calculated_through = min(period_end, today_date)
	dancer_ids = _linked_dancer_ids(profile.name)
	base_response = {
		"selected_month": month_start.strftime("%Y-%m"),
		"period": {
			"from": period_start.isoformat(),
			"to": period_end.isoformat(),
			"calculated_through": calculated_through.isoformat(),
			"can_next": period_end < today_date,
		},
		"comparison_mode": "daily_rank_calendar_period",
		"mutates_payroll": False,
	}
	if not dancer_ids:
		return {
			**base_response,
			"data_state": "insufficient",
			"reason": _("Үйлчилгээний бүртгэл ажилтны профайлтай холбогдоогүй байна."),
		}

	demo_history, latest_scoring_date = _demo_rank_history(profile.name, month_start, period_end)
	if not demo_history:
		return {
			**base_response,
			"data_state": "insufficient",
			"reason": _("Энэ сарын зэрэглэлийн үнэлгээ бүрдээгүй байна."),
		}

	bills = _paid_branch_bills(profile, period_start, calculated_through)
	current_rank, rank_history = _payout_rank_evidence(profile)
	baseline = _summary(profile, bills, dancer_ids, period_start, calculated_through, current_rank, rank_history)
	scenario = _summary(
		profile,
		bills,
		dancer_ids,
		period_start,
		calculated_through,
		DEFAULT_ENTERTAINER_RANK,
		demo_history,
	)
	deduction, deduction_status = _approved_month_deduction(profile.name, period_start, calculated_through)
	service_count = int(baseline.get("service_count") or 0)
	data_state = "verified" if service_count > 0 else "insufficient"
	baseline_income = float(baseline.get("net_income") or 0)
	scenario_income = float(scenario.get("net_income") or 0)
	can_calculate_salary = data_state == "verified" and deduction_status == "available"
	current_policy = baseline.get("payout_policy") or {}
	scenario_rank = _rank_at_end(demo_history, calculated_through)

	return {
		**base_response,
		"scoring_date": latest_scoring_date.isoformat() if latest_scoring_date else None,
		"data_provenance": "DEMO",
		"data_state": data_state,
		"reason": None if data_state == "verified" else _("Энэ 3 хоногт тооцох үйлчилгээний бүртгэл алга."),
		"deduction_status": deduction_status,
		"service_count": service_count,
		"baseline": {
			"rank": current_policy.get("rank") or current_rank,
			"percent": current_policy.get("percent") or payout_percent_for_rank(current_rank),
			"service_income": baseline_income,
			"deduction": deduction,
			"calculated_salary": baseline_income - deduction if can_calculate_salary else None,
		},
		"scenario": {
			"rank": scenario_rank,
			"percent": payout_percent_for_rank(scenario_rank),
			"service_income": scenario_income,
			"deduction": deduction,
			"calculated_salary": scenario_income - deduction if can_calculate_salary else None,
		},
		"delta": scenario_income - baseline_income if can_calculate_salary else None,
	}
