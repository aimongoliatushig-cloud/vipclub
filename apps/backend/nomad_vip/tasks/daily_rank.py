from __future__ import annotations

import hashlib
import json
from datetime import timedelta

import frappe
from frappe.utils import flt, get_datetime, getdate, now_datetime, today

from nomad_vip.daily_ranking import (
	COMPONENT_ORDER,
	attendance_penalty_override,
	calculate_absent_day,
	calculate_career_average,
	calculate_daily_rank,
	classify_score,
	threshold_interval,
)
from nomad_vip.entertainer_ranks import ACTIVE_ENTERTAINER_RANKS, DEFAULT_ENTERTAINER_RANK
from nomad_vip.finex_entertainer_metrics import rank_on_date
from nomad_vip.sales_scoring import daily_sales_score


SNAPSHOT_DOCTYPE = "VIP Entertainer Daily Rank Snapshot"
DAILY_RANK_ACTION = "system.entertainer_rank.daily_snapshot"
DAILY_RANK_VERSION = "attendance-day-career-average-v2"
SNAPSHOT_PROJECTION_FIELDS = [
	"name", "revision", "entertainer", "scoring_date", "status", "weighted_score",
	"displayed_score", "career_average_score", "counted_days", "calculated_rank", "threshold_interval_json", "approved_rank",
	"change_state", "missing_components", "components_json", "ranking_policy",
	"policy_version", "calculated_at",
]
DAILY_EVENT_COMPONENTS = {
	"customer_complaints",
	"sales",
	"cleanliness_beauty",
	"entertainer_attitude",
}
CARRY_FORWARD_COMPONENTS = {"entertaining_skill", "personal_development"}


def _published_policy():
	return frappe.db.get_value(
		"VIP Ranking Policy",
		{"status": "Published", "effective_from": ("<=", today()), "daily_scoring_enabled": 1},
		[
			"name", "version", "effective_from", "evaluation_mode", "evaluation_cadence",
			"attendance_weight", "customer_complaints_weight", "sales_weight",
			"entertaining_skill_weight", "cleanliness_beauty_weight", "shift_effort_weight",
			"personal_development_weight", "entertainer_attitude_weight",
			"rank_1_threshold", "rank_2_threshold", "rank_3_threshold",
		],
		as_dict=True,
		order_by="effective_from desc, creation desc",
	)


def _policy_weights(policy) -> dict[str, float]:
	return {
		"attendance": flt(policy.attendance_weight),
		"customer_complaints": flt(policy.customer_complaints_weight),
		"sales": flt(policy.sales_weight),
		"entertaining_skill": flt(policy.entertaining_skill_weight),
		"cleanliness_beauty": flt(policy.cleanliness_beauty_weight),
		"shift_effort": flt(policy.shift_effort_weight),
		"personal_development": flt(policy.personal_development_weight),
		"entertainer_attitude": flt(policy.entertainer_attitude_weight),
	}


def _policy_thresholds(policy) -> dict[str, float]:
	return {
		"rank_1": flt(policy.rank_1_threshold),
		"rank_2": flt(policy.rank_2_threshold),
		"rank_3": flt(policy.rank_3_threshold),
	}


def _scheduled_profiles(scoring_date, limit: int, profile_name: str | None = None) -> list:
	limit = max(1, min(5000, int(limit)))
	profile_filter = "and p.name = %(profile_name)s" if profile_name else ""
	return frappe.db.sql(
		f"""
		select
			p.name, p.employee, p.branch, p.current_rank,
			sa.name as shift_assignment, sa.shift_type,
			st.start_time as shift_start, st.end_time as shift_end
		from `tabVIP Entertainer Profile` p
		inner join `tabEmployee` e on e.name = p.employee and e.status = 'Active'
		inner join `tabShift Assignment` sa on sa.employee = p.employee
		inner join `tabShift Type` st on st.name = sa.shift_type
		where p.active = 1
			and coalesce(p.lifecycle_status, 'Active') = 'Active'
			and sa.docstatus = 1
			and sa.start_date <= %(scoring_date)s
			and (sa.end_date is null or sa.end_date >= %(scoring_date)s)
			{profile_filter}
		order by p.branch asc, p.name asc, sa.creation desc
		limit {limit}
		""",
		{"scoring_date": scoring_date, "profile_name": profile_name},
		as_dict=True,
	)


def _shift_window(profile, scoring_date):
	start_at = get_datetime(f"{scoring_date} {profile.shift_start}")
	end_at = get_datetime(f"{scoring_date} {profile.shift_end}")
	if end_at <= start_at:
		end_at += timedelta(days=1)
	return start_at, end_at


def _component_event(profile_name: str, component: str, scoring_date, *, carry_forward: bool = False):
	filters = {
		"entertainer": profile_name,
		"ranking_component": component,
		"verified": 1,
		"component_score": ("is", "set"),
	}
	if carry_forward:
		filters["scoring_date"] = ("<=", scoring_date)
	else:
		filters["scoring_date"] = scoring_date
	rows = frappe.get_all(
		"VIP Performance Event",
		filters=filters,
		fields=["name", "event_type", "component_score", "scoring_date", "occurred_at", "source", "source_document_type", "source_document_name"],
		order_by="scoring_date desc, occurred_at desc, creation desc",
		limit=1,
		ignore_permissions=True,
	)
	return rows[0] if rows else None


def _attendance_score(profile, scoring_date) -> tuple[float | None, dict]:
	penalties = frappe.get_all(
		"VIP Attendance Penalty",
		filters={
			"entertainer": profile.name,
			"attendance_date": scoring_date,
			"status": ("not in", ["Rejected", "Reversed"]),
		},
		fields=["name", "penalty_type", "late_minutes", "status", "source_checkin"],
		ignore_permissions=True,
	)
	penalty_override = attendance_penalty_override(tuple(row.penalty_type for row in penalties))
	if penalty_override:
		return penalty_override["score"], {
			"mode": penalty_override["mode"],
			"scope": penalty_override["scope"],
			"raw_state": penalty_override["raw_state"],
			"scoring_date": str(scoring_date),
			"records": [row.name for row in penalties if row.penalty_type == "Absence"],
		}

	explicit = _component_event(profile.name, "attendance", scoring_date)
	if explicit:
		return flt(explicit.component_score), {"mode": "normalized_event", "records": [explicit.name]}
	if any(row.penalty_type == "Late" for row in penalties):
		return None, {
			"mode": "attendance_normalization_required",
			"raw_state": "late",
			"records": [row.name for row in penalties],
			"late_minutes": sum(int(row.late_minutes or 0) for row in penalties),
		}

	start_at, end_at = _shift_window(profile, scoring_date)
	checkin = frappe.db.get_value(
		"Employee Checkin",
		{
			"employee": profile.employee,
			"log_type": "IN",
			"time": ("between", [start_at - timedelta(hours=6), end_at]),
		},
		["name", "time"],
		as_dict=True,
		order_by="time asc",
	)
	if checkin:
		return None, {"mode": "attendance_normalization_required", "raw_state": "present", "records": [checkin.name], "checked_in_at": str(checkin.time)}
	return None, {"mode": "attendance_normalization_required", "raw_state": "no_checkin", "records": []}


def _shift_effort_score(profile_name: str, scoring_date) -> tuple[float, dict]:
	rows = frappe.get_all(
		"VIP Performance Event",
		filters={
			"entertainer": profile_name,
			"event_type": "Stage Round",
			"verified": 1,
			"external_id": ("like", f"{scoring_date}|{profile_name}|%"),
		},
		fields=["name", "external_id"],
		ignore_permissions=True,
	)
	rounds = set()
	for row in rows:
		parts = (row.external_id or "").split("|")
		if len(parts) == 3:
			try:
				round_number = int(parts[2])
			except (TypeError, ValueError):
				continue
			if 1 <= round_number <= 7:
				rounds.add(round_number)
	completed = min(7, len(rounds))
	return completed / 7 * 100, {
		"mode": "seven_item_stage_round_checklist",
		"completed": completed,
		"missed": 7 - completed,
		"records": [row.name for row in rows],
	}


def collect_daily_component_scores(profile, scoring_date) -> tuple[dict, dict]:
	scores: dict[str, float | None] = {component: None for component in COMPONENT_ORDER}
	sources: dict[str, dict] = {}
	scores["attendance"], sources["attendance"] = _attendance_score(profile, scoring_date)
	if sources["attendance"].get("mode") == "daily_absence":
		# A confirmed no-show is one finalized zero-score day. Do not pull
		# assessments, defaults or stage rounds into a day that was not worked.
		scores["sales"] = 0.0
		sources["sales"] = {"mode": "absence_zero", "records": []}
		for component in COMPONENT_ORDER:
			if component not in {"attendance", "sales"}:
				sources[component] = {"mode": "absence_not_scored", "records": []}
		return scores, sources
	scores["shift_effort"], sources["shift_effort"] = _shift_effort_score(profile.name, scoring_date)

	for component in DAILY_EVENT_COMPONENTS - {"entertainer_attitude", "sales"}:
		event = _component_event(profile.name, component, scoring_date)
		if event:
			scores[component] = flt(event.component_score)
			sources[component] = {"mode": "normalized_event", "records": [event.name]}
		else:
			sources[component] = {"mode": "normalization_required", "records": []}

	sales_event = _component_event(profile.name, "sales", scoring_date)
	if sales_event:
		scores["sales"] = flt(sales_event.component_score)
		sources["sales"] = {"mode": "normalized_event", "records": [sales_event.name]}
	else:
		scores["sales"], sources["sales"] = daily_sales_score(profile, scoring_date)

	for component in CARRY_FORWARD_COMPONENTS:
		event = _component_event(profile.name, component, scoring_date, carry_forward=True)
		if event:
			scores[component] = flt(event.component_score)
			sources[component] = {
				"mode": "latest_approved_assessment",
				"records": [event.name],
				"assessment_date": str(event.scoring_date),
			}
		else:
			sources[component] = {"mode": "approved_assessment_required", "records": []}

	attitude = _component_event(profile.name, "entertainer_attitude", scoring_date)
	if attitude:
		scores["entertainer_attitude"] = flt(attitude.component_score)
		sources["entertainer_attitude"] = {"mode": "substantiated_daily_incident", "records": [attitude.name]}
	else:
		scores["entertainer_attitude"] = 100.0
		sources["entertainer_attitude"] = {"mode": "policy_default_no_substantiated_incident", "records": []}
	return scores, sources


def _career_average(profile_name: str, scoring_date, daily_score: float) -> dict:
	rows = frappe.get_all(
		SNAPSHOT_DOCTYPE,
		filters={
			"entertainer": profile_name,
			"is_current": 1,
			"status": "Complete",
			"scoring_date": ("<", scoring_date),
		},
		fields=["weighted_score"],
		order_by="scoring_date asc",
		limit_page_length=0,
		ignore_permissions=True,
	)
	return calculate_career_average(
		[row.weighted_score for row in rows if row.weighted_score is not None],
		daily_score,
	)


def _fingerprint(payload: dict) -> str:
	encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
	return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def _append_audit(profile, snapshot, changed: bool) -> None:
	idempotency_key = f"daily-rank:{snapshot.unique_key}:{snapshot.input_fingerprint}"
	if frappe.db.exists("VIP API Audit Event", {"action": DAILY_RANK_ACTION, "idempotency_key": idempotency_key}):
		return
	frappe.get_doc({
		"doctype": "VIP API Audit Event",
		"actor": "Administrator",
		"actor_role": "System",
		"branch": profile.branch,
		"action": DAILY_RANK_ACTION,
		"outcome": "Succeeded",
		"target_doctype": SNAPSHOT_DOCTYPE,
		"target_name": snapshot.name,
		"idempotency_key": idempotency_key,
		"occurred_at": snapshot.calculated_at,
		"api_version": DAILY_RANK_VERSION,
		"details": json.dumps({
			"scoring_date": str(snapshot.scoring_date),
			"policy_version": snapshot.policy_version,
			"status": snapshot.status,
			"weighted_score": snapshot.weighted_score,
			"calculated_rank": snapshot.calculated_rank,
			"approved_rank": snapshot.approved_rank,
			"input_changed": changed,
		}, ensure_ascii=False, sort_keys=True),
	}).insert(ignore_permissions=True)


def calculate_profile_daily_rank(profile, policy, scoring_date) -> dict:
	scores, sources = collect_daily_component_scores(profile, scoring_date)
	weights = _policy_weights(policy)
	thresholds = _policy_thresholds(policy)
	is_absent = sources.get("attendance", {}).get("mode") == "daily_absence"
	calculation = (
		calculate_absent_day(weights=weights, thresholds=thresholds)
		if is_absent
		else calculate_daily_rank(scores, weights=weights, thresholds=thresholds)
	)
	career = None
	if calculation["status"] == "Complete":
		career = _career_average(profile.name, scoring_date, calculation["weighted_score"])
		calculation["displayed_score"] = career["score"]
		calculation["calculated_rank"] = classify_score(career["score"], thresholds)
		calculation["threshold_interval"] = threshold_interval(calculation["calculated_rank"], thresholds)
	approved_rank = profile.current_rank or DEFAULT_ENTERTAINER_RANK
	if calculation["status"] != "Complete":
		change_state = "Incomplete"
	elif calculation["calculated_rank"] == approved_rank:
		change_state = "No Change"
	else:
		change_state = "Recommended Change"

	components = []
	for row in calculation["components"]:
		components.append({**row, "source": sources.get(row["component"], {})})
	input_payload = {
		"calculation_version": DAILY_RANK_VERSION,
		"scoring_date": str(scoring_date),
		"policy": policy.version,
		"scores": scores,
		"weights": _policy_weights(policy),
		"thresholds": _policy_thresholds(policy),
		"sources": sources,
	}
	input_fingerprint = _fingerprint(input_payload)
	values = {
		"entertainer": profile.name,
		"employee": profile.employee,
		"branch": profile.branch,
		"scoring_date": scoring_date,
		"ranking_policy": policy.name,
		"policy_version": policy.version,
		"status": calculation["status"],
		"weighted_score": calculation["weighted_score"],
		"displayed_score": calculation.get("displayed_score"),
		"career_average_score": career["score"] if career else None,
		"counted_days": career["counted_days"] if career else 0,
		"calculated_rank": calculation["calculated_rank"],
		"threshold_interval_json": json.dumps(calculation.get("threshold_interval"), ensure_ascii=False, sort_keys=True),
		"approved_rank": approved_rank,
		"change_state": change_state,
		"missing_components": ", ".join(calculation["missing_components"]),
		"components_json": json.dumps(components, ensure_ascii=False, sort_keys=True),
		"sources_json": json.dumps(sources, ensure_ascii=False, sort_keys=True),
		"input_fingerprint": input_fingerprint,
		"calculated_at": now_datetime(),
	}
	existing_name = frappe.db.get_value(
		SNAPSHOT_DOCTYPE,
		{
			"entertainer": profile.name,
			"scoring_date": scoring_date,
			"policy_version": policy.version,
			"is_current": 1,
		},
		"name",
	)
	changed = True
	if existing_name:
		snapshot = frappe.get_doc(SNAPSHOT_DOCTYPE, existing_name)
		changed = snapshot.input_fingerprint != input_fingerprint
		if changed:
			previous = snapshot
			revision = int(previous.revision or 1) + 1
			frappe.db.set_value(SNAPSHOT_DOCTYPE, previous.name, "is_current", 0, update_modified=False)
			snapshot = frappe.get_doc({
				"doctype": SNAPSHOT_DOCTYPE,
				"unique_key": f"{profile.name}|{scoring_date}|{policy.version}|{revision}",
				"revision": revision,
				"is_current": 1,
				"supersedes": previous.name,
				**values,
			}).insert(ignore_permissions=True)
	else:
		revision = int(frappe.db.get_value(
			SNAPSHOT_DOCTYPE,
			{"entertainer": profile.name, "scoring_date": scoring_date, "policy_version": policy.version},
			"revision",
			order_by="revision desc",
		) or 0) + 1
		snapshot = frappe.get_doc({
			"doctype": SNAPSHOT_DOCTYPE,
			"unique_key": f"{profile.name}|{scoring_date}|{policy.version}|{revision}",
			"revision": revision,
			"is_current": 1,
			**values,
		}).insert(
			ignore_permissions=True
		)
	_append_audit(profile, snapshot, changed)
	return {"snapshot": snapshot, "changed": changed}


def snapshot_payload(row) -> dict | None:
	if not row:
		return None
	components = []
	threshold_interval = None
	try:
		components = json.loads(row.components_json or "[]")
	except (TypeError, ValueError):
		components = []
	try:
		threshold_interval = json.loads(row.get("threshold_interval_json") or "null")
	except (TypeError, ValueError):
		threshold_interval = None
	return {
		"name": row.name,
		"revision": int(row.get("revision") or 1),
		"scoring_date": row.scoring_date,
		"status": row.status,
		"weighted_score": flt(row.weighted_score) if row.weighted_score is not None else None,
		"displayed_score": flt(row.get("displayed_score")) if row.get("displayed_score") is not None else None,
		"daily_score": flt(row.weighted_score) if row.weighted_score is not None else None,
		"career_average_score": flt(row.get("career_average_score")) if row.get("career_average_score") is not None else None,
		"counted_days": int(row.get("counted_days") or 0),
		"score_basis": "attendance_day_career_average",
		"calculated_rank": row.calculated_rank,
		"threshold_interval": threshold_interval,
		"approved_rank": row.approved_rank,
		"change_state": row.change_state,
		"missing_components": [value.strip() for value in (row.missing_components or "").split(",") if value.strip()],
		"components": components,
		"policy": row.ranking_policy,
		"policy_version": row.policy_version,
		"calculated_at": row.calculated_at,
	}


def current_daily_rank_by_profile(profile_names, *, get_all=None) -> dict[str, dict]:
	"""Return current daily-rank projections without breaking older deployments.

	The manager workbench is operationally critical, so a missing optional snapshot
	DocType must degrade to the already-approved rank instead of blanking the page.
	"""
	profile_names = [value for value in (profile_names or []) if value]
	if not profile_names:
		return {}
	get_all = get_all or frappe.get_all
	try:
		rows = get_all(
			SNAPSHOT_DOCTYPE,
			filters={"entertainer": ("in", profile_names), "is_current": 1},
			fields=SNAPSHOT_PROJECTION_FIELDS,
			order_by="scoring_date desc, calculated_at desc",
			ignore_permissions=True,
		)
	except frappe.DoesNotExistError:
		return {}
	result = {}
	for row in rows:
		result.setdefault(row.entertainer, snapshot_payload(row))
	return result


def latest_daily_rank_snapshot(profile_name: str):
	try:
		return frappe.db.get_value(
			SNAPSHOT_DOCTYPE,
			{"entertainer": profile_name, "is_current": 1},
			SNAPSHOT_PROJECTION_FIELDS,
			as_dict=True,
			order_by="scoring_date desc, calculated_at desc",
		)
	except frappe.DoesNotExistError:
		return None


def recent_daily_rank_snapshots(profile_name: str, limit: int = 14) -> list[dict]:
	try:
		rows = frappe.get_all(
			SNAPSHOT_DOCTYPE,
			filters={"entertainer": profile_name, "is_current": 1},
			fields=SNAPSHOT_PROJECTION_FIELDS,
			order_by="scoring_date desc, calculated_at desc",
			limit_page_length=max(1, min(31, int(limit or 14))),
			ignore_permissions=True,
		)
	except frappe.DoesNotExistError:
		return []
	return [snapshot_payload(row) for row in rows]


def _apply_daily_rank_transition(profile, snapshot) -> dict:
	"""Schedule a completed 3/2/1 rank for the day after its scoring date."""
	if snapshot.status != "Complete":
		return {"status": "incomplete"}
	calculated_rank = str(snapshot.calculated_rank or "")
	if calculated_rank not in ACTIVE_ENTERTAINER_RANKS:
		return {"status": "invalid_rank", "calculated_rank": calculated_rank}

	effective_from = getdate(snapshot.scoring_date) + timedelta(days=1)
	history = frappe.get_all(
		"VIP Rank History",
		filters={"entertainer": profile.name},
		fields=["name", "from_rank", "to_rank", "changed_at", "effective_from"],
		order_by="effective_from asc, changed_at asc",
		limit_page_length=0,
		ignore_permissions=True,
	)
	from_rank = rank_on_date(getdate(snapshot.scoring_date), profile.current_rank or DEFAULT_ENTERTAINER_RANK, history)
	if calculated_rank == from_rank:
		return {"status": "no_change", "effective_from": str(effective_from)}

	existing = next((row for row in history if getdate(row.effective_from) == effective_from), None)
	if existing:
		return {
			"status": "unchanged" if existing.to_rank == calculated_rank else "conflict",
			"history": existing.name,
			"effective_from": str(effective_from),
		}

	changed_at = now_datetime()
	history_name = frappe.get_doc({
		"doctype": "VIP Rank History",
		"entertainer": profile.name,
		"from_rank": from_rank,
		"to_rank": calculated_rank,
		"points_at_change": snapshot.displayed_score or snapshot.weighted_score or 0,
		"changed_at": changed_at,
		"effective_from": effective_from,
		"reason": f"Нийт ажилласан өдрийн дундаж оноо · {snapshot.name}",
	}).insert(ignore_permissions=True).name
	if effective_from <= getdate(today()):
		frappe.db.set_value(
			"VIP Entertainer Profile",
			profile.name,
			{"current_rank": calculated_rank, "rank_last_calculated_at": changed_at},
			update_modified=True,
		)
	return {"status": "scheduled", "history": history_name, "effective_from": str(effective_from)}


def refresh_profile_daily_rank(profile_name: str, scoring_date) -> dict | None:
	"""Refresh one scheduled entertainer after a source event is recorded."""
	date = getdate(scoring_date)
	policy = _published_policy()
	if not policy:
		return None
	profiles = _scheduled_profiles(date, 1, profile_name=profile_name)
	if not profiles:
		return None
	outcome = calculate_profile_daily_rank(profiles[0], policy, date)
	return snapshot_payload(outcome["snapshot"])


def refresh_daily_rankings(scoring_date=None, batch_size=1000) -> dict:
	"""Refresh the previous work day's eight-factor rank snapshot idempotently."""
	date = getdate(scoring_date or (getdate(today()) - timedelta(days=1)))
	limit = max(1, min(5000, int(batch_size or 1000)))
	policy = _published_policy()
	result = {
		"scoring_date": str(date),
		"policy_version": policy.version if policy else None,
		"selected": 0,
		"complete": 0,
		"incomplete": 0,
		"unchanged": 0,
		"failed": 0,
		"rank_changes": 0,
		"rank_invalid": 0,
		"rank_conflicts": 0,
	}
	if not policy:
		frappe.logger("nomad_vip.daily_rank").warning(json.dumps({"event": "daily_rank.policy_missing", **result}))
		return result

	profiles = _scheduled_profiles(date, limit)
	seen = set()
	for profile in profiles:
		if profile.name in seen:
			continue
		seen.add(profile.name)
		result["selected"] += 1
		try:
			outcome = calculate_profile_daily_rank(profile, policy, date)
			snapshot = outcome["snapshot"]
			if snapshot.status == "Complete":
				result["complete"] += 1
			else:
				result["incomplete"] += 1
			if not outcome["changed"]:
				result["unchanged"] += 1
			transition = _apply_daily_rank_transition(profile, snapshot)
			if transition["status"] == "scheduled":
				result["rank_changes"] += 1
			elif transition["status"] == "invalid_rank":
				result["rank_invalid"] += 1
			elif transition["status"] == "conflict":
				result["rank_conflicts"] += 1
			frappe.db.commit()
		except Exception:
			frappe.db.rollback()
			result["failed"] += 1
			frappe.log_error(frappe.get_traceback(), f"Daily rank failed: {profile.name} / {date}")

	frappe.logger("nomad_vip.daily_rank").info(
		json.dumps({"event": "daily_rank.completed", **result}, ensure_ascii=False, sort_keys=True)
	)
	return result
