from __future__ import annotations

import hashlib
from collections import Counter
from typing import Any, Mapping

from nomad_vip.daily_ranking import COMPONENT_ORDER, calculate_absent_day, calculate_daily_rank


COMPONENT_LABELS = {
	"attendance": "Ирц",
	"customer_complaints": "Үйлчлүүлэгчийн гомдол",
	"sales": "Борлуулалт",
	"entertaining_skill": "Үзвэрийн ур чадвар",
	"cleanliness_beauty": "Цэвэр байдал, төрх",
	"shift_effort": "Өдрийн гараа",
	"personal_development": "Хувийн хөгжил",
	"entertainer_attitude": "Ажлын хандлага",
}


def _number(batch_id: str, profile_name: str, key: str) -> int:
	digest = hashlib.sha256(f"{batch_id}|{profile_name}|{key}".encode("utf-8")).hexdigest()
	return int(digest[:12], 16)


def _score(batch_id: str, profile_name: str, key: str, minimum: int, maximum: int) -> float:
	return float(minimum + _number(batch_id, profile_name, key) % (maximum - minimum + 1))


def _attendance(batch_id: str, profile_name: str) -> tuple[str, int, float]:
	value = _number(batch_id, profile_name, "attendance") % 11
	if value == 0:
		return "Absent", 0, 0.0
	if value <= 3:
		minutes = 3 + _number(batch_id, profile_name, "late-minutes") % 27
		return "Late", minutes, float(max(40, 100 - minutes * 2))
	return "Present", 0, 100.0


def build_demo_rank_result(
	profile: Mapping[str, Any],
	*,
	batch_id: str,
	scoring_date: str,
	weights: Mapping[str, Any],
	thresholds: Mapping[str, Any],
) -> dict[str, Any]:
	"""Build one deterministic, explicitly non-operational daily rank scenario."""
	profile_name = str(profile["name"])
	attendance_state, late_minutes, attendance_score = _attendance(batch_id, profile_name)
	rounds_completed = 3 + _number(batch_id, profile_name, "rounds") % 5
	readiness_result = "Not Ready" if _number(batch_id, profile_name, "readiness") % 7 == 0 else "Ready"
	demo_sales_amount = 300_000 + (_number(batch_id, profile_name, "sales-amount") % 271) * 10_000
	scores = {
		"attendance": attendance_score,
		"customer_complaints": _score(batch_id, profile_name, "complaints", 62, 100),
		"sales": _score(batch_id, profile_name, "sales", 52, 100),
		"entertaining_skill": _score(batch_id, profile_name, "skill", 64, 100),
		"cleanliness_beauty": _score(batch_id, profile_name, "cleanliness", 64, 100),
		"shift_effort": round(rounds_completed / 7 * 100, 6),
		"personal_development": _score(batch_id, profile_name, "development", 60, 100),
		"entertainer_attitude": _score(batch_id, profile_name, "attitude", 58, 100),
	}
	calculation = (
		calculate_absent_day(weights=weights, thresholds=thresholds)
		if attendance_state == "Absent"
		else calculate_daily_rank(scores, weights=weights, thresholds=thresholds)
	)
	components = []
	for component in calculation["components"]:
		components.append({
			**component,
			"label": COMPONENT_LABELS[component["component"]],
			"provenance": "DEMO",
		})

	attention = []
	if attendance_state == "Absent":
		attention.append("Demo таслалт: тухайн өдрийн ирцийн оноо 0 болсон")
	elif attendance_state == "Late":
		attention.append(f"Demo хоцролт: {late_minutes} минут")
	if readiness_result == "Not Ready":
		attention.append("Demo бэлэн байдал: бэлэн бус")
	if rounds_completed < 7:
		attention.append(f"Demo гараа: {rounds_completed}/7, {7 - rounds_completed} гараа дутуу")
	for key in COMPONENT_ORDER:
		if scores[key] < 70 and key not in {"attendance", "shift_effort"}:
			attention.append(f"{COMPONENT_LABELS[key]}: {scores[key]:.0f} оноо")

	approved_rank = str(profile.get("current_rank") or "Rank 3")
	calculated_rank = calculation.get("calculated_rank")
	return {
		"profile": profile_name,
		"employee": profile.get("employee"),
		"display_name": profile.get("stage_name") or profile.get("employee_name") or profile_name,
		"branch": profile.get("branch"),
		"identity_provenance": "VERIFIED_EMPLOYEE_MASTER",
		"input_provenance": "DEMO",
		"approved_rank": approved_rank,
		"calculated_rank": calculated_rank,
		"change_state": "No Change" if calculated_rank == approved_rank else "Demo Difference",
		"status": calculation["status"],
		"weighted_score": calculation.get("weighted_score"),
		"displayed_score": calculation.get("displayed_score"),
		"attendance_state": attendance_state,
		"late_minutes": late_minutes,
		"readiness_result": readiness_result,
		"rounds_completed": rounds_completed,
		"rounds_target": 7,
		"demo_sales_amount": demo_sales_amount,
		"components": components,
		"attention": attention,
		"scoring_date": scoring_date,
	}


def summarize_demo_results(results: list[Mapping[str, Any]]) -> dict[str, Any]:
	rank_counts = Counter(str(row.get("calculated_rank") or "Incomplete") for row in results)
	branch_counts = Counter(str(row.get("branch") or "Тодорхойгүй") for row in results)
	scores = [float(row["weighted_score"]) for row in results if row.get("weighted_score") is not None]
	return {
		"profile_count": len(results),
		"complete_count": sum(1 for row in results if row.get("status") == "Complete"),
		"attention_count": sum(1 for row in results if row.get("attention")),
		"average_score": round(sum(scores) / len(scores), 2) if scores else None,
		"demo_sales_total": sum(int(row.get("demo_sales_amount") or 0) for row in results),
		"rank_counts": dict(sorted(rank_counts.items())),
		"branch_counts": dict(sorted(branch_counts.items())),
	}
