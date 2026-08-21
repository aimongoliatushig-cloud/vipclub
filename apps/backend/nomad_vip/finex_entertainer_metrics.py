from __future__ import annotations

import json
import re
from collections import defaultdict
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation
from typing import Any, Iterable

from nomad_vip.entertainer_ranks import (
	DEFAULT_ENTERTAINER_RANK,
	normalize_entertainer_rank,
	payout_percent_for_rank,
)


POINT_MNT = Decimal("10000")
AMOUNT_TOLERANCE = Decimal("1")
PERCENT_TOLERANCE = Decimal("0.1")
RANKED_SERVICE_PATTERN = re.compile(r"\btable\s+service\b", re.IGNORECASE)


def _decimal(value: Any) -> Decimal:
	try:
		return Decimal(str(value or 0))
	except (InvalidOperation, TypeError, ValueError):
		return Decimal("0")


def _date(value: Any) -> date | None:
	if isinstance(value, datetime):
		return value.date()
	if isinstance(value, date):
		return value
	try:
		return date.fromisoformat(str(value)[:10])
	except (TypeError, ValueError):
		return None


def _payload(value: Any) -> dict[str, Any]:
	if isinstance(value, dict):
		return value
	try:
		parsed = json.loads(value or "{}")
	except (TypeError, ValueError):
		return {}
	return parsed if isinstance(parsed, dict) else {}


def _ranked_service(item: dict[str, Any]) -> bool:
	"""Identify Finex table-service lines governed by the entertainer rank policy.

	Wine, tip, product and other commission lines keep their posted Finex
	allocation because those categories follow separate financial policies.
	"""
	name = " ".join(str(item.get("menuName") or "").split())
	return bool(RANKED_SERVICE_PATTERN.search(name))


def _rank_history_rows(rank_history: Iterable[dict[str, Any]]) -> list[tuple[date, str, str]]:
	rows: list[tuple[date, str, str]] = []
	for row in rank_history:
		effective_from = _date(row.get("effective_from"))
		if not effective_from:
			changed_at = _date(row.get("changed_at"))
			effective_from = changed_at + timedelta(days=1) if changed_at else None
		if not effective_from:
			continue
		rows.append((
			effective_from,
			normalize_entertainer_rank(row.get("from_rank")),
			normalize_entertainer_rank(row.get("to_rank")),
		))
	return sorted(rows, key=lambda row: row[0])


def _rank_on_date_rows(posting_date: date, current_rank: str, history: list[tuple[date, str, str]]) -> str:
	if not history:
		return normalize_entertainer_rank(current_rank)
	rank = history[0][1]
	for effective_from, _from_rank, to_rank in history:
		if effective_from > posting_date:
			break
		rank = to_rank
	return rank


def rank_on_date(posting_date: date, current_rank: str, rank_history: Iterable[dict[str, Any]] = ()) -> str:
	"""Return the rank effective on a business date from the shared history ledger."""
	return _rank_on_date_rows(posting_date, current_rank, _rank_history_rows(rank_history))


def _rank_evidence_on_date(
	posting_date: date,
	current_rank: str,
	history: list[tuple[date, str, str]],
) -> tuple[str, date | None]:
	"""Return the effective rank and the transition date that established it."""
	if not history:
		return normalize_entertainer_rank(current_rank), None
	rank = history[0][1]
	effective_from = None
	for transition_date, _from_rank, to_rank in history:
		if transition_date > posting_date:
			break
		rank = to_rank
		effective_from = transition_date
	return rank, effective_from


def build_finex_entertainer_summary(
	bills: Iterable[dict[str, Any]],
	dancer_ids: Iterable[str],
	window_start: date,
	window_end: date,
	current_month_start: date,
	recent_limit: int = 12,
	current_rank: str = DEFAULT_ENTERTAINER_RANK,
	rank_history: Iterable[dict[str, Any]] = (),
) -> dict[str, Any]:
	identifiers = {str(value).strip() for value in dancer_ids if str(value).strip()}
	confirmed_rank = normalize_entertainer_rank(current_rank)
	history = _rank_history_rows(rank_history)
	months: dict[str, dict[str, Any]] = defaultdict(lambda: {"income": Decimal("0"), "services": 0, "bills": set()})
	days: dict[date, Decimal] = defaultdict(lambda: Decimal("0"))
	recent: list[dict[str, Any]] = []
	net_income = Decimal("0")
	gross_sales = Decimal("0")
	current_month_income = Decimal("0")
	service_count = 0
	matched_bills: set[str] = set()
	customer_bills: dict[str, set[str]] = defaultdict(set)
	skipped_inconsistent = 0
	skipped_malformed = 0
	rank_policy_services = 0
	finex_allocation_services = 0
	rank_policy_mismatches = 0
	last_synced_at = None

	for bill in bills:
		posting_date = _date(bill.get("posting_date"))
		if not posting_date or posting_date < window_start or posting_date > window_end or not bill.get("is_paid"):
			continue
		payload = _payload(bill.get("raw_payload"))
		if not payload:
			skipped_malformed += 1
			continue
		sign = Decimal("-1") if int(bill.get("bill_type") or 0) == 2 else Decimal("1")
		bill_name = str(bill.get("name") or "")
		customer = str(bill.get("customer") or "").strip()
		for item_index, item in enumerate(payload.get("items") or []):
			if not isinstance(item, dict):
				continue
			dancers = [row for row in item.get("dancers") or [] if isinstance(row, dict)]
			allocation_count = len(dancers)
			employee_amount = abs(_decimal(item.get("employeeAmount")))
			all_dancer_amount = sum((abs(_decimal(row.get("amount"))) for row in dancers), Decimal("0"))
			if employee_amount and abs(employee_amount - all_dancer_amount) > AMOUNT_TOLERANCE:
				skipped_inconsistent += 1
				continue
			uses_rank_policy = _ranked_service(item)
			item_total = abs(_decimal(item.get("total")))
			shared_service_total = item_total / allocation_count if item_total and allocation_count else Decimal("0")
			for dancer_index, dancer in enumerate(dancers):
				identifier = str(dancer.get("dancerId") or dancer.get("dancerCode") or "").strip()
				if identifier not in identifiers:
					continue
				raw_amount = abs(_decimal(dancer.get("amount")))
				if not raw_amount:
					continue
				raw_percent = abs(_decimal(dancer.get("percent")))
				rank = _rank_on_date_rows(posting_date, confirmed_rank, history)
				if uses_rank_policy:
					percent = Decimal(payout_percent_for_rank(rank))
					service_total = (
						shared_service_total
						or (raw_amount * Decimal("100") / raw_percent if raw_percent else Decimal("0"))
					) * sign
					amount = service_total * percent / Decimal("100")
					rank_policy_services += 1
					raw_pool_percent = raw_percent * allocation_count
					if raw_percent and abs(raw_pool_percent - percent) > PERCENT_TOLERANCE:
						rank_policy_mismatches += 1
					rate_source = "rank_policy"
				else:
					percent = raw_percent
					amount = raw_amount * sign
					service_total = amount * Decimal("100") / percent if percent else Decimal("0")
					finex_allocation_services += 1
					rate_source = "finex_allocation"
				month_key = posting_date.strftime("%Y-%m")
				months[month_key]["income"] += amount
				months[month_key]["services"] += 1
				months[month_key]["bills"].add(bill_name)
				days[posting_date] += amount
				net_income += amount
				gross_sales += service_total
				if posting_date >= current_month_start:
					current_month_income += amount
				service_count += 1
				matched_bills.add(bill_name)
				if customer and sign > 0:
					customer_bills[customer].add(bill_name)
				recent.append(
					{
						"key": f"{bill_name}:{item_index}:{dancer_index}",
						"date": posting_date.isoformat(),
						"service": str(item.get("menuName") or "Үйлчилгээ").strip(),
						"amount": float(amount),
						"service_total": float(service_total),
						"percent": float(percent),
						"raw_amount": float(raw_amount * sign),
						"raw_percent": float(raw_percent),
						"allocation_count": allocation_count,
						"payout_rank": rank,
						"rate_source": rate_source,
					}
				)
		last_synced = bill.get("last_synced_at")
		if last_synced and (last_synced_at is None or str(last_synced) > str(last_synced_at)):
			last_synced_at = last_synced

	month_rows = [
		{
			"month": month,
			"income": float(row["income"]),
			"services": row["services"],
			"bills": len(row["bills"]),
		}
		for month, row in sorted(months.items(), reverse=True)
	]
	cumulative_income = Decimal("0")
	day_rows = []
	for posting_date, amount in sorted(days.items()):
		cumulative_income += amount
		day_rows.append({
			"date": posting_date.isoformat(),
			"income": float(amount),
			"cumulative_income": float(cumulative_income),
		})
	previous_percent_by_service: dict[str, float] = {}
	for row in sorted(recent, key=lambda value: (value["date"], value["key"])):
		service_key = str(row["service"]).strip().casefold()
		previous_percent = previous_percent_by_service.get(service_key)
		row["previous_percent"] = previous_percent
		row["percent_change"] = round(row["percent"] - previous_percent, 2) if previous_percent is not None else None
		previous_percent_by_service[service_key] = row["percent"]
	recent.sort(key=lambda row: (row["date"], row["key"]), reverse=True)
	linked_customer_bill_count = sum(len(names) for names in customer_bills.values())
	repeat_customer_count = sum(1 for names in customer_bills.values() if len(names) >= 2)
	points = max(Decimal("0"), net_income / POINT_MNT)
	summary_rank, summary_rank_effective_from = _rank_evidence_on_date(window_end, confirmed_rank, history)
	return {
		"window": {"from": window_start.isoformat(), "to": window_end.isoformat()},
		"current_month_income": float(current_month_income),
		"net_income": float(net_income),
		"gross_sales": float(gross_sales),
		"points": float(points.quantize(Decimal("0.01"))),
		"point_rule_mnt": float(POINT_MNT),
		"service_count": service_count,
		"bill_count": len(matched_bills),
		"linked_customer_count": len(customer_bills),
		"linked_customer_bill_count": linked_customer_bill_count,
		"repeat_customer_count": repeat_customer_count,
		"months": month_rows,
		"days": day_rows,
		"recent_services": recent[: max(0, int(recent_limit))],
		"last_synced_at": str(last_synced_at) if last_synced_at else None,
		"payout_policy": {
			"rank": summary_rank,
			"percent": payout_percent_for_rank(summary_rank),
			"effective_from": summary_rank_effective_from.isoformat() if summary_rank_effective_from else None,
			"source": "Зэрэглэлийн түүх",
			"applies_to": "table_service",
		},
		"quality": {
			"verified": bool(identifiers and service_count),
			"customer_linkage_verified": bool(linked_customer_bill_count),
			"skipped_inconsistent_items": skipped_inconsistent,
			"skipped_malformed_bills": skipped_malformed,
			"rank_policy_services": rank_policy_services,
			"finex_allocation_services": finex_allocation_services,
			"rank_policy_mismatches": rank_policy_mismatches,
		},
	}
