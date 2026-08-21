from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from typing import Any, Iterable, Mapping

from nomad_vip.daily_ranking import COMPONENT_ORDER, validate_thresholds
from nomad_vip.entertainer_ranks import (
	ACTIVE_ENTERTAINER_RANKS,
	payout_percent_for_rank,
)


COMPONENT_LABELS = {
	"attendance": "Ирц",
	"customer_complaints": "Зочны санал, гомдол",
	"sales": "Борлуулалт",
	"entertaining_skill": "Үзвэр, бүжгийн ур чадвар",
	"cleanliness_beauty": "Цэвэр байдал, төрх",
	"shift_effort": "Өдрийн гараа",
	"personal_development": "Хувийн хөгжил",
	"entertainer_attitude": "Хандлага",
}

SOURCE_LABELS = {
	"daily_absence": "Ирцийн бүртгэл",
	"absence_zero": "Тасалсан өдрийн 0 оноо",
	"absence_not_scored": "Тасалсан өдөр тооцохгүй",
	"normalized_event": "Баталгаажсан үнэлгээ",
	"attendance_normalization_required": "Ирцийн үнэлгээ хүлээгдэж байна",
	"seven_item_stage_round_checklist": "Өдрийн гарааны бүртгэл",
	"normalization_required": "Үнэлгээ хүлээгдэж байна",
	"latest_approved_assessment": "Сүүлийн баталгаажсан үнэлгээ",
	"approved_assessment_required": "Үнэлгээ хүлээгдэж байна",
	"substantiated_daily_incident": "Тайлбартай үнэлгээ",
	"policy_default_no_substantiated_incident": "Зөрчил бүртгэгдээгүй",
	"demo_batch": "Туршилтын өгөгдөл",
}

RANK_LABELS_MN = {
	"Rank 1": "1-р зэрэг",
	"Rank 2": "2-р зэрэг",
	"Rank 3": "3-р зэрэг",
}


def rank_label(rank: str | None) -> str:
	return RANK_LABELS_MN.get(str(rank or ""), str(rank or "—"))


def _date(value: Any) -> date | None:
	if isinstance(value, date):
		return value
	try:
		return date.fromisoformat(str(value)[:10])
	except (TypeError, ValueError):
		return None


def _number(value: Any) -> float | None:
	if value is None:
		return None
	return float(Decimal(str(value)))


def next_rank(rank: str | None) -> str | None:
	return {
		"Rank 3": "Rank 2",
		"Rank 2": "Rank 1",
	}.get(str(rank or ""))


def threshold_for_rank(rank: str | None, thresholds: Mapping[str, Any]) -> float | None:
	limits = validate_thresholds(thresholds)
	key = {
		"Rank 1": "rank_1",
		"Rank 2": "rank_2",
		"Rank 3": "rank_3",
	}.get(str(rank or ""))
	return float(limits[key]) if key else None


def payout_rules(thresholds: Mapping[str, Any]) -> list[dict[str, Any]]:
	limits = validate_thresholds(thresholds)
	return [
		{
			"rank": "Rank 3",
			"label": rank_label("Rank 3"),
			"minimum_score": 0.0,
			"maximum_score": float(limits["rank_2"]),
			"maximum_inclusive": False,
			"payout_percent": payout_percent_for_rank("Rank 3"),
		},
		{
			"rank": "Rank 2",
			"label": rank_label("Rank 2"),
			"minimum_score": float(limits["rank_2"]),
			"maximum_score": float(limits["rank_1"]),
			"maximum_inclusive": False,
			"payout_percent": payout_percent_for_rank("Rank 2"),
		},
		{
			"rank": "Rank 1",
			"label": rank_label("Rank 1"),
			"minimum_score": float(limits["rank_1"]),
			"maximum_score": 100.0,
			"maximum_inclusive": True,
			"payout_percent": payout_percent_for_rank("Rank 1"),
		},
	]


def component_contract(rows: Iterable[Mapping[str, Any]], thresholds: Mapping[str, Any]) -> list[dict[str, Any]]:
	by_key = {str(row.get("component")): row for row in rows}
	component_target = float(validate_thresholds(thresholds)["rank_3"])
	result = []
	for key in COMPONENT_ORDER:
		row = by_key.get(key, {})
		score = _number(row.get("score"))
		data_status = "verified" if row.get("status") == "verified" else ("not_applicable" if row.get("status") == "excluded" else "missing")
		target_status = "unknown" if score is None else ("met" if score >= component_target else "not_met")
		source = row.get("source") if isinstance(row.get("source"), Mapping) else {}
		result.append({
			"key": key,
			"label": COMPONENT_LABELS[key],
			"score": score,
			"weight": _number(row.get("weight")) or 0.0,
			"contribution": _number(row.get("contribution")),
			"data_status": data_status,
			"target_status": target_status,
			"source_label": SOURCE_LABELS.get(str(source.get("mode") or ""), "Баталгаажуулалт хүлээгдэж байна"),
		})
	return result


def build_rank_contract(
	*,
	snapshot: Mapping[str, Any] | None,
	effective_rank: str,
	effective_from: Any = None,
	thresholds: Mapping[str, Any],
	history: Iterable[Mapping[str, Any]] = (),
) -> dict[str, Any]:
	"""Build the API presentation contract without recalculating the daily score."""
	snapshot = snapshot or {}
	status = str(snapshot.get("status") or "Incomplete")
	complete = status == "Complete" and snapshot.get("weighted_score") is not None
	score = _number(snapshot.get("displayed_score") if snapshot.get("displayed_score") is not None else snapshot.get("weighted_score")) if complete else None
	calculated = str(snapshot.get("calculated_rank") or "") if complete else None
	scoring_date = _date(snapshot.get("scoring_date"))
	data_provenance = snapshot.get("input_provenance") or ("VERIFIED" if snapshot else "UNRESOLVED")

	promotion_rank = next_rank(effective_rank)
	promotion_threshold = threshold_for_rank(promotion_rank, thresholds)
	missing_score = None if score is None or promotion_threshold is None else max(0.0, round(promotion_threshold - score, 2))
	next_effective_from = (
		scoring_date + timedelta(days=1)
		if data_provenance != "DEMO"
		and scoring_date
		and calculated in ACTIVE_ENTERTAINER_RANKS
		and calculated != effective_rank
		else None
	)

	return {
		"scoring_date": scoring_date.isoformat() if scoring_date else None,
		"score": score,
		"daily_score": _number(snapshot.get("daily_score") if snapshot.get("daily_score") is not None else snapshot.get("weighted_score")) if complete else None,
		"counted_days": int(snapshot.get("counted_days") or 0),
		"score_basis": snapshot.get("score_basis") or "attendance_day_career_average",
		"score_status": "complete" if complete else "incomplete",
		"effective_rank": effective_rank,
		"effective_rank_label": rank_label(effective_rank),
		"effective_from": _date(effective_from).isoformat() if _date(effective_from) else None,
		"payout_percent": payout_percent_for_rank(effective_rank),
		"calculated_next_rank": calculated,
		"calculated_next_rank_label": rank_label(calculated) if calculated else None,
		"calculated_next_payout_percent": payout_percent_for_rank(calculated) if calculated in ACTIVE_ENTERTAINER_RANKS else None,
		"next_effective_from": next_effective_from.isoformat() if next_effective_from else None,
		"next_rank": promotion_rank,
		"next_rank_label": rank_label(promotion_rank) if promotion_rank else None,
		"next_rank_threshold": promotion_threshold,
		"missing_score": missing_score,
		"components": component_contract(snapshot.get("components") or (), thresholds),
		"missing_components": list(snapshot.get("missing_components") or ()),
		"history": list(history),
		"rules": payout_rules(thresholds),
		"data_provenance": data_provenance,
		"demo_batch": snapshot.get("demo_batch"),
	}
