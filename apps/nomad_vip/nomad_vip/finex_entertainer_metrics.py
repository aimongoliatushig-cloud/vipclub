from __future__ import annotations

import json
from collections import defaultdict
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any, Iterable


POINT_MNT = Decimal("10000")
AMOUNT_TOLERANCE = Decimal("1")


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


def build_finex_entertainer_summary(
	bills: Iterable[dict[str, Any]],
	dancer_ids: Iterable[str],
	window_start: date,
	window_end: date,
	current_month_start: date,
	recent_limit: int = 12,
) -> dict[str, Any]:
	identifiers = {str(value).strip() for value in dancer_ids if str(value).strip()}
	months: dict[str, dict[str, Any]] = defaultdict(lambda: {"income": Decimal("0"), "services": 0, "bills": set()})
	recent: list[dict[str, Any]] = []
	net_income = Decimal("0")
	current_month_income = Decimal("0")
	service_count = 0
	matched_bills: set[str] = set()
	skipped_inconsistent = 0
	skipped_malformed = 0
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
		for item_index, item in enumerate(payload.get("items") or []):
			if not isinstance(item, dict):
				continue
			dancers = [row for row in item.get("dancers") or [] if isinstance(row, dict)]
			employee_amount = abs(_decimal(item.get("employeeAmount")))
			all_dancer_amount = sum((abs(_decimal(row.get("amount"))) for row in dancers), Decimal("0"))
			if employee_amount and abs(employee_amount - all_dancer_amount) > AMOUNT_TOLERANCE:
				skipped_inconsistent += 1
				continue
			for dancer_index, dancer in enumerate(dancers):
				identifier = str(dancer.get("dancerId") or dancer.get("dancerCode") or "").strip()
				if identifier not in identifiers:
					continue
				amount = abs(_decimal(dancer.get("amount"))) * sign
				if not amount:
					continue
				month_key = posting_date.strftime("%Y-%m")
				months[month_key]["income"] += amount
				months[month_key]["services"] += 1
				months[month_key]["bills"].add(bill_name)
				net_income += amount
				if posting_date >= current_month_start:
					current_month_income += amount
				service_count += 1
				matched_bills.add(bill_name)
				recent.append(
					{
						"key": f"{bill_name}:{item_index}:{dancer_index}",
						"date": posting_date.isoformat(),
						"service": str(item.get("menuName") or "Үйлчилгээ").strip(),
						"amount": float(amount),
						"percent": float(_decimal(dancer.get("percent"))),
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
	recent.sort(key=lambda row: (row["date"], row["key"]), reverse=True)
	points = max(Decimal("0"), net_income / POINT_MNT)
	return {
		"window": {"from": window_start.isoformat(), "to": window_end.isoformat()},
		"current_month_income": float(current_month_income),
		"net_income": float(net_income),
		"points": float(points.quantize(Decimal("0.01"))),
		"point_rule_mnt": float(POINT_MNT),
		"service_count": service_count,
		"bill_count": len(matched_bills),
		"months": month_rows,
		"recent_services": recent[: max(0, int(recent_limit))],
		"last_synced_at": str(last_synced_at) if last_synced_at else None,
		"quality": {
			"verified": bool(identifiers and service_count),
			"skipped_inconsistent_items": skipped_inconsistent,
			"skipped_malformed_bills": skipped_malformed,
		},
	}


def rank_for_points(points: float, ranks: Iterable[dict[str, Any]]) -> tuple[dict[str, Any], dict[str, Any] | None]:
	ordered = sorted(ranks, key=lambda row: (float(row.get("minimum_points") or 0), int(row.get("rank_order") or 0)))
	current = ordered[0] if ordered else {"name": "Bronze", "minimum_points": 0}
	next_rank = None
	for rank in ordered:
		if float(rank.get("minimum_points") or 0) <= points:
			current = rank
		elif next_rank is None:
			next_rank = rank
	return current, next_rank
