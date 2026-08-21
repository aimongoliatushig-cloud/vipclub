from __future__ import annotations

import hashlib
import json
from datetime import timedelta

import frappe
from frappe import _
from frappe.utils import flt, get_datetime, getdate, now_datetime, today

from nomad_vip.api.security import (
	assert_not_stale,
	normalize_idempotency_key,
	page_meta,
	page_window,
	record_api_audit,
	require_actor,
	require_entertainer_profile,
)
from nomad_vip.entertainer_ranks import DEFAULT_ENTERTAINER_RANK


REVIEW_DOCTYPE = "VIP Entertainer Rank Review"
ACTIVE_STATUS = "Submitted"
TERMINAL_STATUSES = {"Approved", "Returned", "Rejected"}
DECISION_STATUS = {
	"approve": "Approved",
	"return": "Returned",
	"reject": "Rejected",
}


def _required_text(value, label: str, minimum: int = 5) -> str:
	text = (value or "").strip()
	if len(text) < minimum:
		frappe.throw(_("{0}-ийг хамгийн багадаа {1} тэмдэгтээр бичнэ үү.").format(label, minimum), frappe.ValidationError)
	return text


def _rank(name: str):
	row = frappe.db.get_value(
		"VIP Rank Definition",
		name,
		["name", "code", "rank_order", "minimum_points", "benefits", "active"],
		as_dict=True,
	)
	if not row or not row.active:
		frappe.throw(_("Идэвхтэй зэрэглэл сонгоно уу."), frappe.ValidationError)
	return row


def _manager_profile(profile_name: str, branch: str):
	profile = frappe.db.get_value(
		"VIP Entertainer Profile",
		profile_name,
		[
			"name", "employee", "employee_name", "stage_name", "branch", "active",
			"lifecycle_status", "current_rank", "current_points", "modified",
		],
		as_dict=True,
	)
	if not profile or not profile.active or profile.lifecycle_status not in (None, "", "Active"):
		frappe.throw(_("Бүжигчний идэвхтэй бүртгэл олдсонгүй."), frappe.DoesNotExistError)
	if profile.branch != branch:
		frappe.throw(_("Өөр салбарын бүжигчний зэрэглэлд санал гаргах эрхгүй."), frappe.PermissionError)
	return profile


def _published_policy():
	return frappe.db.get_value(
		"VIP Ranking Policy",
		{"status": "Published", "effective_from": ("<=", today())},
		[
			"name", "version", "effective_from", "evaluation_mode",
			"evaluation_window_days", "evaluation_cadence", "sales_weight",
			"attendance_weight", "customer_complaints_weight",
			"entertaining_skill_weight", "cleanliness_beauty_weight",
			"shift_effort_weight", "personal_development_weight",
			"entertainer_attitude_weight",
		],
		as_dict=True,
		order_by="effective_from desc, creation desc",
	) or frappe._dict()


def _evidence_snapshot(profile) -> dict:
	from nomad_vip.api.entertainer_finex import _summary
	from nomad_vip.tasks.daily_rank import latest_daily_rank_snapshot, snapshot_payload

	finex = _summary(profile)
	policy = _published_policy()
	daily_rank = snapshot_payload(latest_daily_rank_snapshot(profile.name))
	window_days = int(policy.get("evaluation_window_days") or 1)
	if daily_rank:
		window_to = getdate(daily_rank.get("scoring_date"))
		window_from = window_to
	else:
		window_to = getdate(finex.get("window", {}).get("to") or today())
		window_from = getdate(finex.get("window", {}).get("from") or (window_to - timedelta(days=window_days - 1)))
	events = frappe.get_all(
		"VIP Performance Event",
		filters={
			"entertainer": profile.name,
			"verified": 1,
			"occurred_at": ("between", [window_from, window_to + timedelta(days=1)]),
		},
		fields=["event_type", "external_id"],
		ignore_permissions=True,
	)
	event_counts: dict[str, int] = {}
	stage_round_days: dict[str, set[int]] = {}
	for event in events:
		event_counts[event.event_type] = event_counts.get(event.event_type, 0) + 1
		if event.event_type == "Stage Round":
			parts = (event.external_id or "").split("|")
			if len(parts) == 3:
				try:
					stage_round_days.setdefault(parts[0], set()).add(int(parts[2]))
				except (TypeError, ValueError):
					pass
	completed_stage_round_days = sum(1 for rounds in stage_round_days.values() if len(rounds) >= 7)
	daily_complete = bool(daily_rank and daily_rank.get("status") == "Complete")

	return {
		"version": "rank-evidence-v4",
		"generated_at": str(now_datetime()),
		"window": {"from": str(window_from), "to": str(window_to), "days": window_days},
		"policy": {
			"name": policy.get("name"),
			"version": policy.get("version") or "configuration-pending",
			"mode": policy.get("evaluation_mode") or "Shadow",
			"cadence": policy.get("evaluation_cadence") or "Monthly",
			"effective_from": str(policy.get("effective_from") or ""),
			"weights": {
				"sales": flt(policy.get("sales_weight")),
				"attendance": flt(policy.get("attendance_weight")),
				"customer_complaints": flt(policy.get("customer_complaints_weight")),
				"entertaining_skill": flt(policy.get("entertaining_skill_weight")),
				"cleanliness_beauty": flt(policy.get("cleanliness_beauty_weight")),
				"shift_effort": flt(policy.get("shift_effort_weight")),
				"personal_development": flt(policy.get("personal_development_weight")),
				"entertainer_attitude": flt(policy.get("entertainer_attitude_weight")),
			},
		},
		"sales": {
			"verified_bill_count": int(finex.get("bill_count") or 0),
			"service_count": int(finex.get("service_count") or 0),
			"points": flt(finex.get("points")),
			"net_income": flt(finex.get("net_income")),
		},
		"attendance": {
			"present": event_counts.get("Attendance Present", 0),
			"late": event_counts.get("Attendance Late", 0),
			"absence": event_counts.get("Attendance No Show", 0),
		},
		"loyalty": {
			"verified_events": int(finex.get("repeat_customer_count") or 0),
			"repeat_customers": int(finex.get("repeat_customer_count") or 0),
			"linked_customer_bills": int(finex.get("linked_customer_bill_count") or 0),
		},
		"behavior": {
			"ready": event_counts.get("Readiness Ready", 0),
			"not_ready": event_counts.get("Readiness Not Ready", 0),
			"stage_rounds": event_counts.get("Stage Round", 0),
			"stage_round_completed_days": completed_stage_round_days,
			"stage_round_daily_target": 7,
		},
		"daily_rank": daily_rank,
		"system_recommendation": {
			"rank": (
				daily_rank.get("calculated_rank")
				if daily_complete and daily_rank.get("calculated_rank") in {"Rank 1", "Rank 2", "Rank 3"}
				else DEFAULT_ENTERTAINER_RANK
			) if daily_complete else (finex.get("rank", {}).get("current") or {}).get("name"),
			"points": daily_rank.get("displayed_score") if daily_complete else flt(finex.get("points")),
			"source": "attendance-day-career-average" if daily_complete else "sales-evidence",
			"requires_human_approval": True,
		},
	}


def _hash_evidence(evidence: dict) -> str:
	encoded = json.dumps(evidence, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
	return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def _review_payload(row) -> dict:
	evidence = {}
	try:
		evidence = json.loads(row.evidence_json or "{}")
	except (TypeError, ValueError):
		evidence = {}
	return {
		"name": row.name,
		"entertainer": row.entertainer,
		"employee": row.employee,
		"display_name": row.display_name,
		"branch": row.branch,
		"from_rank": row.from_rank,
		"recommended_rank": row.recommended_rank,
		"points": flt(row.points),
		"policy": row.ranking_policy,
		"policy_version": row.policy_version,
		"window_from": row.window_from,
		"window_to": row.window_to,
		"evidence": evidence,
		"evidence_hash": row.evidence_hash,
		"manager_reason": row.manager_reason,
		"status": row.status,
		"submitted_by": row.submitted_by,
		"submitted_at": row.submitted_at,
		"decided_by": row.decided_by,
		"decided_at": row.decided_at,
		"decision_reason": row.decision_reason,
		"rank_history": row.rank_history,
		"base_profile_modified": row.base_profile_modified,
		"applied_profile_modified": row.applied_profile_modified,
		"modified": row.modified,
	}


def rank_reviews_for_profile(profile_name: str, limit: int = 10) -> list[dict]:
	"""Return a bounded, explicit projection for an already-authorized profile."""
	page_size, _offset = page_window(limit, 0, default=10)
	rows = frappe.get_all(
		REVIEW_DOCTYPE,
		filters={"entertainer": profile_name},
		fields=[
			"name", "entertainer", "employee", "display_name", "branch", "ranking_policy",
			"policy_version", "window_from", "window_to", "from_rank", "recommended_rank",
			"points", "evidence_json", "evidence_hash", "manager_reason", "status",
			"submitted_by", "submitted_at", "decided_by", "decided_at", "decision_reason",
			"rank_history", "base_profile_modified", "applied_profile_modified", "modified",
		],
		order_by="submitted_at desc, creation desc",
		limit_page_length=page_size,
		ignore_permissions=True,
	)
	return [_review_payload(row) for row in rows]


def _get_review(name: str, *, lock: bool = False):
	if lock:
		frappe.db.sql(f"SELECT name FROM `tab{REVIEW_DOCTYPE}` WHERE name=%s FOR UPDATE", name)
	if not frappe.db.exists(REVIEW_DOCTYPE, name):
		frappe.throw(_("Зэрэглэлийн хүсэлт олдсонгүй."), frappe.DoesNotExistError)
	return frappe.get_doc(REVIEW_DOCTYPE, name)


def _audit_replay(actor, action: str, target_name: str, idempotency_key: str | None):
	if not idempotency_key:
		return None
	return frappe.db.get_value(
		"VIP API Audit Event",
		{
			"actor": actor.user,
			"action": action,
			"target_doctype": REVIEW_DOCTYPE,
			"target_name": target_name,
			"idempotency_key": idempotency_key,
			"outcome": "Succeeded",
		},
		["name", "details"],
		as_dict=True,
	)


@frappe.whitelist(methods=["POST"])
def submit_rank_recommendation(
	profile_name,
	rank,
	reason,
	expected_modified=None,
	idempotency_key=None,
):
	actor = require_actor("Branch Manager", require_branch=True)
	profile = _manager_profile(profile_name, actor.branch)
	reason = _required_text(reason, _("Саналын үндэслэл"))
	rank_row = _rank(rank)
	idempotency_key = normalize_idempotency_key(idempotency_key)
	if not idempotency_key:
		frappe.throw(_("Давхар илгээлтээс хамгаалах түлхүүр шаардлагатай."), frappe.ValidationError)

	frappe.db.sql("SELECT name FROM `tabVIP Entertainer Profile` WHERE name=%s FOR UPDATE", profile.name)
	profile = _manager_profile(profile.name, actor.branch)
	existing = frappe.db.get_value(
		REVIEW_DOCTYPE,
		{"submitted_by": actor.user, "idempotency_key": idempotency_key},
		["name", "recommended_rank", "manager_reason"],
		as_dict=True,
	)
	if existing:
		if existing.recommended_rank != rank_row.name or existing.manager_reason != reason:
			frappe.throw(_("Энэ давхар илгээлтийн түлхүүрийг өөр хүсэлтэд ашигласан байна."), frappe.TimestampMismatchError)
		return {"review": _review_payload(frappe.get_doc(REVIEW_DOCTYPE, existing.name)), "replayed": True}

	assert_not_stale("VIP Entertainer Profile", profile.name, expected_modified)
	active = frappe.db.get_value(
		REVIEW_DOCTYPE,
		{"entertainer": profile.name, "status": ACTIVE_STATUS},
		"name",
	)
	if active:
		frappe.throw(_("Энэ бүжигчинд CEO-ийн шийдвэр хүлээсэн санал байна."), frappe.ValidationError)

	evidence = _evidence_snapshot(profile)
	window = evidence["window"]
	policy = evidence["policy"]
	if policy.get("cadence") == "Daily" and (evidence.get("daily_rank") or {}).get("status") != "Complete":
		frappe.throw(
			_("Өдрийн 8 үзүүлэлт бүрэн баталгаажаагүй тул зэрэглэлийн санал илгээхгүй."),
			frappe.ValidationError,
		)
	review = frappe.get_doc({
		"doctype": REVIEW_DOCTYPE,
		"entertainer": profile.name,
		"employee": profile.employee,
		"display_name": profile.stage_name or profile.employee_name or profile.name,
		"branch": profile.branch,
		"ranking_policy": policy.get("name"),
		"policy_version": policy.get("version"),
		"window_from": window.get("from"),
		"window_to": window.get("to"),
		"from_rank": profile.current_rank or DEFAULT_ENTERTAINER_RANK,
		"recommended_rank": rank_row.name,
		"points": evidence["system_recommendation"]["points"],
		"evidence_json": json.dumps(evidence, ensure_ascii=False, sort_keys=True),
		"evidence_hash": _hash_evidence(evidence),
		"manager_reason": reason,
		"status": ACTIVE_STATUS,
		"submitted_by": actor.user,
		"submitted_at": now_datetime(),
		"base_profile_modified": profile.modified,
		"idempotency_key": idempotency_key,
	}).insert(ignore_permissions=True)
	audit = record_api_audit(
		actor=actor,
		action="manager.entertainer_rank.recommend",
		target_doctype=REVIEW_DOCTYPE,
		target_name=review.name,
		idempotency_key=idempotency_key,
		details={
			"profile": profile.name,
			"branch": profile.branch,
			"from_rank": review.from_rank,
			"recommended_rank": review.recommended_rank,
			"policy_version": review.policy_version,
			"evidence_hash": review.evidence_hash,
		},
	)
	frappe.db.commit()
	return {"review": _review_payload(review), "audit": audit, "replayed": False}


@frappe.whitelist(methods=["GET"])
def get_manager_rank_reviews(status="All", limit=50, cursor=0):
	actor = require_actor("Branch Manager", require_branch=True)
	return _list_reviews(actor=actor, status=status, branch=actor.branch, limit=limit, cursor=cursor)


@frappe.whitelist(methods=["GET"])
def get_ceo_rank_reviews(status="Submitted", branch=None, limit=50, cursor=0):
	actor = require_actor("CEO", "System Manager")
	selected_branch = (branch or "").strip() or None
	return _list_reviews(actor=actor, status=status, branch=selected_branch, limit=limit, cursor=cursor)


def _list_reviews(*, actor, status, branch, limit, cursor):
	allowed = {"All", ACTIVE_STATUS, *TERMINAL_STATUSES}
	status = (status or "All").strip()
	if status not in allowed:
		frappe.throw(_("Зэрэглэлийн хүсэлтийн төлөв буруу байна."), frappe.ValidationError)
	page_size, offset = page_window(limit, cursor)
	filters = {}
	if status != "All":
		filters["status"] = status
	if branch:
		filters["branch"] = branch
	total = frappe.db.count(REVIEW_DOCTYPE, filters)
	rows = frappe.get_all(
		REVIEW_DOCTYPE,
		filters=filters,
		fields=[
			"name", "entertainer", "employee", "display_name", "branch", "ranking_policy",
			"policy_version", "window_from", "window_to", "from_rank", "recommended_rank",
			"points", "evidence_json", "evidence_hash", "manager_reason", "status",
			"submitted_by", "submitted_at", "decided_by", "decided_at", "decision_reason",
			"rank_history", "base_profile_modified", "applied_profile_modified", "modified",
		],
		order_by="submitted_at desc, creation desc",
		limit_start=offset,
		limit_page_length=page_size,
		ignore_permissions=True,
	)
	return {
		"reviews": [_review_payload(row) for row in rows],
		"meta": page_meta(branch=branch, limit=page_size, offset=offset, returned=len(rows), total=total),
	}


@frappe.whitelist(methods=["POST"])
def decide_rank_review(
	review_name,
	decision,
	reason,
	expected_modified=None,
	idempotency_key=None,
):
	actor = require_actor("CEO", "System Manager")
	decision = (decision or "").strip().lower()
	if decision not in DECISION_STATUS:
		frappe.throw(_("Шийдвэр approve, return эсвэл reject байна."), frappe.ValidationError)
	reason = _required_text(reason, _("Шийдвэрийн үндэслэл"))
	idempotency_key = normalize_idempotency_key(idempotency_key)
	if not idempotency_key:
		frappe.throw(_("Давхар илгээлтээс хамгаалах түлхүүр шаардлагатай."), frappe.ValidationError)

	review = _get_review(review_name, lock=True)
	replay = _audit_replay(actor, "ceo.entertainer_rank.decide", review.name, idempotency_key)
	if replay:
		try:
			details = json.loads(replay.details or "{}")
		except (TypeError, ValueError):
			details = {}
		if details.get("decision") != decision or details.get("reason") != reason:
			frappe.throw(_("Энэ давхар илгээлтийн түлхүүрийг өөр шийдвэрт ашигласан байна."), frappe.TimestampMismatchError)
		return {"review": _review_payload(review), "replayed": True, "audit": replay.name}

	assert_not_stale(REVIEW_DOCTYPE, review.name, expected_modified)
	if review.status != ACTIVE_STATUS:
		frappe.throw(_("Энэ хүсэлт аль хэдийн шийдвэрлэгдсэн байна."), frappe.ValidationError)
	frappe.db.sql("SELECT name FROM `tabVIP Entertainer Profile` WHERE name=%s FOR UPDATE", review.entertainer)
	profile = frappe.db.get_value(
		"VIP Entertainer Profile",
		review.entertainer,
		["name", "current_rank", "current_points", "modified", "active", "lifecycle_status"],
		as_dict=True,
	)
	if not profile or not profile.active or profile.lifecycle_status not in (None, "", "Active"):
		frappe.throw(_("Бүжигчний идэвхтэй бүртгэл олдсонгүй."), frappe.ValidationError)
	if str(profile.modified) != str(review.base_profile_modified) or (profile.current_rank or DEFAULT_ENTERTAINER_RANK) != review.from_rank:
		frappe.throw(_("Санал илгээснээс хойш бүжигчний зэрэглэлийн эх мэдээлэл өөрчлөгдсөн байна. Менежер шинэ санал илгээнэ үү."), frappe.TimestampMismatchError)

	status = DECISION_STATUS[decision]
	changed_at = now_datetime()
	history_name = None
	applied_profile_modified = None
	if status == "Approved":
		_rank(review.recommended_rank)
		if review.recommended_rank != review.from_rank:
			effective_from = getdate(review.window_to) + timedelta(days=1)
			frappe.db.set_value(
				"VIP Entertainer Profile",
				profile.name,
				{"current_rank": review.recommended_rank, "rank_last_calculated_at": changed_at},
				update_modified=True,
			)
			history_name = frappe.get_doc({
				"doctype": "VIP Rank History",
				"entertainer": profile.name,
				"from_rank": review.from_rank,
				"to_rank": review.recommended_rank,
				"points_at_change": profile.current_points or review.points or 0,
				"changed_at": changed_at,
				"effective_from": effective_from,
				"reason": reason,
			}).insert(ignore_permissions=True).name
		applied_profile_modified = frappe.db.get_value("VIP Entertainer Profile", profile.name, "modified")

	review.status = status
	review.decided_by = actor.user
	review.decided_at = changed_at
	review.decision_reason = reason
	review.rank_history = history_name
	review.applied_profile_modified = applied_profile_modified
	review.flags.allow_rank_review_update = True
	review.save(ignore_permissions=True)
	audit = record_api_audit(
		actor=actor,
		action="ceo.entertainer_rank.decide",
		target_doctype=REVIEW_DOCTYPE,
		target_name=review.name,
		idempotency_key=idempotency_key,
		details={
			"decision": decision,
			"reason": reason,
			"from_rank": review.from_rank,
			"recommended_rank": review.recommended_rank,
			"evidence_hash": review.evidence_hash,
			"rank_history": history_name,
			"effective_from": str(effective_from) if history_name else None,
		},
	)
	frappe.db.commit()
	return {"review": _review_payload(review), "audit": audit, "replayed": False}


@frappe.whitelist(methods=["GET"])
def get_my_rank_reviews(limit=10):
	_actor, profile = require_entertainer_profile()
	return {"reviews": rank_reviews_for_profile(profile.name, limit)}
