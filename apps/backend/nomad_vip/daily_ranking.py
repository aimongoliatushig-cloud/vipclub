from __future__ import annotations

from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any, Mapping


COMPONENT_ORDER = (
	"attendance",
	"customer_complaints",
	"sales",
	"entertaining_skill",
	"cleanliness_beauty",
	"shift_effort",
	"personal_development",
	"entertainer_attitude",
)

CANONICAL_WEIGHTS = {
	"attendance": Decimal("10"),
	"customer_complaints": Decimal("15"),
	"sales": Decimal("40"),
	"entertaining_skill": Decimal("5"),
	"cleanliness_beauty": Decimal("5"),
	"shift_effort": Decimal("10"),
	"personal_development": Decimal("5"),
	"entertainer_attitude": Decimal("10"),
}

CANONICAL_THRESHOLDS = {
	"rank_1": Decimal("90"),
	"rank_2": Decimal("80"),
	"rank_3": Decimal("70"),
}

RANK_LABELS = {
	"rank_1": "Rank 1",
	"rank_2": "Rank 2",
	"rank_3": "Rank 3",
}


def attendance_penalty_override(penalty_types: list[str] | tuple[str, ...]) -> dict[str, Any] | None:
	"""Return the day-scoped attendance score forced by a confirmed raw state.

	An absence is evidence of a zero attendance component, not a missing input. The
	result is deliberately stateless so one day's absence cannot leak into another
	day or mutate the employee's approved rank.
	"""
	if "Absence" not in set(penalty_types):
		return None
	return {
		"score": 0.0,
		"mode": "daily_absence",
		"scope": "scoring_date",
		"raw_state": "no_show",
	}


def sales_score_from_amount(amount, full_score_amount) -> float | None:
	"""Normalize verified daily sales to 0–100 for the 40-point component."""
	try:
		threshold = Decimal(str(full_score_amount or 0))
		value = Decimal(str(amount or 0))
	except (InvalidOperation, TypeError, ValueError):
		return None
	if threshold <= 0:
		return None
	ratio = max(Decimal("0"), value) / threshold * Decimal("100")
	return float(min(Decimal("100"), ratio).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def _decimal(value: Any) -> Decimal:
	try:
		return Decimal(str(value))
	except (InvalidOperation, TypeError, ValueError) as exc:
		raise ValueError(f"Invalid numeric score: {value!r}") from exc


def validate_weights(weights: Mapping[str, Any]) -> dict[str, Decimal]:
	normalized: dict[str, Decimal] = {}
	for component in COMPONENT_ORDER:
		if component not in weights:
			raise ValueError(f"Missing ranking weight: {component}")
		weight = _decimal(weights[component])
		if weight < 0:
			raise ValueError(f"Ranking weight cannot be negative: {component}")
		normalized[component] = weight
	if sum(normalized.values(), Decimal("0")) != Decimal("100"):
		raise ValueError("Ranking weights must total 100")
	return normalized


def validate_thresholds(thresholds: Mapping[str, Any]) -> dict[str, Decimal]:
	normalized = {
		"rank_1": _decimal(thresholds["rank_1"]),
		"rank_2": _decimal(thresholds["rank_2"]),
		"rank_3": _decimal(thresholds["rank_3"]),
	}
	if not Decimal("0") <= normalized["rank_3"] < normalized["rank_2"] < normalized["rank_1"] <= Decimal("100"):
		raise ValueError("Rank thresholds must satisfy 0 <= Rank 3 < Rank 2 < Rank 1 <= 100")
	return normalized


def classify_score(score: Any, thresholds: Mapping[str, Any] | None = None) -> str:
	value = _decimal(score)
	if value < 0 or value > 100:
		raise ValueError("Daily ranking score must be between 0 and 100")
	limits = validate_thresholds(thresholds or CANONICAL_THRESHOLDS)
	if value >= limits["rank_1"]:
		return RANK_LABELS["rank_1"]
	if value >= limits["rank_2"]:
		return RANK_LABELS["rank_2"]
	if value >= limits["rank_3"]:
		return RANK_LABELS["rank_3"]
	# Rank 3 is the floor: every entertainer starts here and a low daily
	# score can never create a fourth, unapproved rank.
	return RANK_LABELS["rank_3"]


def calculate_career_average(previous_scores: list[Any] | tuple[Any, ...], current_score: Any) -> dict[str, Any]:
	"""Return the attendance-day average used by the effective rank.

	Only finalized daily scores belong in ``previous_scores``. A confirmed absence
	is finalized as zero by ``calculate_absent_day`` and therefore remains in the
	denominator; incomplete days and approved leave never reach this function.
	"""
	values = [_decimal(value) for value in previous_scores if value is not None]
	values.append(_decimal(current_score))
	if any(value < 0 or value > 100 for value in values):
		raise ValueError("Career ranking scores must be between 0 and 100")
	average = sum(values, Decimal("0")) / Decimal(len(values))
	return {
		"score": float(average.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
		"counted_days": len(values),
	}


def threshold_interval(rank: str, thresholds: Mapping[str, Any]) -> dict[str, Any]:
	limits = validate_thresholds(thresholds)
	if rank == RANK_LABELS["rank_1"]:
		return {"minimum": float(limits["rank_1"]), "maximum": 100.0, "minimum_inclusive": True, "maximum_inclusive": True}
	if rank == RANK_LABELS["rank_2"]:
		return {"minimum": float(limits["rank_2"]), "maximum": float(limits["rank_1"]), "minimum_inclusive": True, "maximum_inclusive": False}
	if rank == RANK_LABELS["rank_3"]:
		return {"minimum": 0.0, "maximum": float(limits["rank_2"]), "minimum_inclusive": True, "maximum_inclusive": False}
	raise ValueError(f"Unsupported entertainer rank: {rank}")


def calculate_daily_rank(
	component_scores: Mapping[str, Any],
	*,
	weights: Mapping[str, Any],
	thresholds: Mapping[str, Any],
) -> dict[str, Any]:
	"""Calculate one explainable daily classification without inventing missing inputs."""
	normalized_weights = validate_weights(weights)
	normalized_thresholds = validate_thresholds(thresholds)
	missing = [component for component in COMPONENT_ORDER if component_scores.get(component) is None]
	components = []
	total = Decimal("0")
	for component in COMPONENT_ORDER:
		raw_score = component_scores.get(component)
		weight = normalized_weights[component]
		if raw_score is None:
			components.append({
				"component": component,
				"score": None,
				"weight": float(weight),
				"contribution": None,
				"status": "missing",
			})
			continue
		score = _decimal(raw_score)
		if score < 0 or score > 100:
			raise ValueError(f"{component} score must be between 0 and 100")
		contribution = score * weight / Decimal("100")
		total += contribution
		components.append({
			"component": component,
			"score": float(score),
			"weight": float(weight),
			"contribution": float(contribution),
			"status": "verified",
		})

	if missing:
		return {
			"status": "Incomplete",
			"weighted_score": None,
			"calculated_rank": None,
			"threshold_interval": None,
			"missing_components": missing,
			"components": components,
		}

	calculated_rank = classify_score(total, normalized_thresholds)
	return {
		"status": "Complete",
		"weighted_score": float(total),
		"displayed_score": round(float(total), 2),
		"calculated_rank": calculated_rank,
		"threshold_interval": threshold_interval(calculated_rank, normalized_thresholds),
		"missing_components": [],
		"components": components,
	}


def calculate_absent_day(*, weights: Mapping[str, Any], thresholds: Mapping[str, Any]) -> dict[str, Any]:
	"""Finalize a scheduled no-show as one zero-score day.

	Sales and attendance are explicit zeroes. The other six factors are excluded,
	so defaults, manager assessments and stage rounds are not silently counted on
	a day when the entertainer did not work.
	"""
	normalized_weights = validate_weights(weights)
	normalized_thresholds = validate_thresholds(thresholds)
	components = []
	for component in COMPONENT_ORDER:
		counted = component in {"attendance", "sales"}
		components.append({
			"component": component,
			"score": 0.0 if counted else None,
			"weight": float(normalized_weights[component]),
			"contribution": 0.0 if counted else None,
			"status": "verified" if counted else "excluded",
		})
	calculated_rank = classify_score(0, normalized_thresholds)
	return {
		"status": "Complete",
		"weighted_score": 0.0,
		"displayed_score": 0.0,
		"calculated_rank": calculated_rank,
		"threshold_interval": threshold_interval(calculated_rank, normalized_thresholds),
		"missing_components": [],
		"components": components,
	}
