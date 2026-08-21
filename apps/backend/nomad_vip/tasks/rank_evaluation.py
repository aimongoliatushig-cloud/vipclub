from __future__ import annotations

import json
import math
from datetime import timedelta

import frappe
from frappe.utils import flt, get_datetime, now_datetime


RANK_EVALUATION_INTERVAL_DAYS = 15
RANK_EVALUATION_ACTION = "system.entertainer_rank.evaluate"
RANK_EVALUATION_VERSION = "rank-evaluation-v1"
RANK_REVIEW_REMINDER_DAYS = {1, 15}


def rank_evaluation_schedule(last_evaluated_at=None, reference=None) -> dict:
	"""Return the shared 15-day evaluation schedule used by jobs and UI projections."""
	now = get_datetime(reference or now_datetime())
	last = get_datetime(last_evaluated_at) if last_evaluated_at else None
	next_at = last + timedelta(days=RANK_EVALUATION_INTERVAL_DAYS) if last else now
	remaining_seconds = max(0, (next_at - now).total_seconds())
	return {
		"interval_days": RANK_EVALUATION_INTERVAL_DAYS,
		"last_evaluated_at": last,
		"next_evaluation_at": next_at,
		"remaining_days": int(math.ceil(remaining_seconds / 86400)),
		"due": not last or now >= next_at,
	}


def _append_evaluation_audit(profile, evidence: dict, evaluated_at) -> None:
	from nomad_vip.api.rank_review import _hash_evidence

	window = evidence.get("window") or {}
	policy = evidence.get("policy") or {}
	recommendation = evidence.get("system_recommendation") or {}
	idempotency_key = f"rank-evaluation:{profile.name}:{evaluated_at.date().isoformat()}"
	if frappe.db.exists(
		"VIP API Audit Event",
		{
			"action": RANK_EVALUATION_ACTION,
			"idempotency_key": idempotency_key,
			"outcome": "Succeeded",
		},
	):
		return
	frappe.get_doc(
		{
			"doctype": "VIP API Audit Event",
			"actor": "Administrator",
			"actor_role": "System",
			"branch": profile.branch,
			"action": RANK_EVALUATION_ACTION,
			"outcome": "Succeeded",
			"target_doctype": "VIP Entertainer Profile",
			"target_name": profile.name,
			"idempotency_key": idempotency_key,
			"occurred_at": evaluated_at,
			"api_version": RANK_EVALUATION_VERSION,
			"details": json.dumps(
				{
					"evidence_hash": _hash_evidence(evidence),
					"window_from": window.get("from"),
					"window_to": window.get("to"),
					"policy_version": policy.get("version"),
					"points": flt((evidence.get("sales") or {}).get("points")),
					"recommended_rank": recommendation.get("rank"),
					"rank_changed": False,
				},
				ensure_ascii=False,
				sort_keys=True,
			),
		}
	).insert(ignore_permissions=True)


def _process_locked_profile(profile_name: str, reference=None, force: bool = False) -> dict:
	from nomad_vip.api.entertainer_finex import _linked_dancer_ids
	from nomad_vip.api.rank_review import _evidence_snapshot

	locked = frappe.db.sql(
		"SELECT name FROM `tabVIP Entertainer Profile` WHERE name=%s FOR UPDATE",
		(profile_name,),
	)
	if not locked:
		return {"outcome": "missing"}
	profile = frappe.db.get_value(
		"VIP Entertainer Profile",
		profile_name,
		[
			"name",
			"employee",
			"employee_name",
			"stage_name",
			"branch",
			"active",
			"lifecycle_status",
			"current_rank",
			"current_points",
			"rank_last_calculated_at",
		],
		as_dict=True,
	)
	if not profile or not profile.active or profile.lifecycle_status not in (None, "", "Active"):
		return {"outcome": "inactive"}
	if not force and not rank_evaluation_schedule(profile.rank_last_calculated_at, reference).get("due"):
		return {"outcome": "not_due"}
	if not _linked_dancer_ids(profile.name):
		return {"outcome": "unlinked"}

	evidence = _evidence_snapshot(profile)
	evaluated_at = get_datetime(reference or now_datetime())
	points = flt((evidence.get("sales") or {}).get("points"))
	frappe.db.set_value(
		"VIP Entertainer Profile",
		profile.name,
		{
			"current_points": points,
			"rank_last_calculated_at": evaluated_at,
		},
		update_modified=True,
	)
	_append_evaluation_audit(profile, evidence, evaluated_at)
	return {
		"outcome": "refreshed",
		"branch": profile.branch,
		"points": points,
		"recommended_rank": (evidence.get("system_recommendation") or {}).get("rank"),
	}


def _manager_users(branch: str) -> list[str]:
	users = frappe.get_all(
		"Employee",
		filters={"branch": branch, "status": "Active", "user_id": ["is", "set"]},
		pluck="user_id",
		ignore_permissions=True,
	)
	return [user for user in users if "Branch Manager" in frappe.get_roles(user)]


def _notify_managers(branch_counts: dict[str, int], manual: bool = False, reference=None) -> int:
	created = 0
	notification_date = get_datetime(reference or now_datetime()).date()
	policy_name = frappe.db.get_value(
		"VIP Ranking Policy",
		{"status": "Published"},
		"name",
		order_by="effective_from desc, creation desc",
	)
	for branch, count in sorted(branch_counts.items()):
		if count <= 0:
			continue
		for user in _manager_users(branch):
			subject = (
				f"{branch}: {count} бүжигчний ээлжит бус үнэлгээ шинэчлэгдлээ"
				if manual
				else f"{branch}: {count} бүжигчний 15 хоногийн үнэлгээ шинэчлэгдлээ"
			)
			if manual and frappe.db.exists(
				"Notification Log",
				{
					"for_user": user,
					"subject": subject,
					"creation": ["between", [f"{notification_date} 00:00:00", f"{notification_date} 23:59:59"]],
				},
			):
				continue
			frappe.get_doc(
				{
					"doctype": "Notification Log",
					"subject": subject,
					"email_content": (
						"Зэрэглэлийн оноо, системийн санал болон нотолгоо шинэчлэгдлээ. "
						"Бүжигчин бүрийн мэдээллийг шалгаад шаардлагатай саналыг CEO-д илгээнэ үү."
					),
					"for_user": user,
					"from_user": "Administrator",
					"type": "Alert",
					"document_type": "VIP Ranking Policy" if policy_name else None,
					"document_name": policy_name,
				}
			).insert(ignore_permissions=True)
			created += 1
	return created


def refresh_branch_rank_evaluations(branch: str, batch_size=500, reference=None) -> dict[str, int | str | bool]:
	"""Force one evidence refresh for active entertainers in one branch only.

	This deliberately does not change a rank or create a CEO review. It prepares
	current source-backed evidence for the branch manager's human recommendation.
	"""
	branch = (branch or "").strip()
	if not branch or not frappe.db.exists("Branch", branch):
		frappe.throw("Баталгаатай салбар сонгоно уу.")
	limit = max(1, min(1000, int(batch_size or 500)))
	profile_names = frappe.get_all(
		"VIP Entertainer Profile",
		filters={"active": 1, "branch": branch},
		pluck="name",
		order_by="name asc",
		limit_page_length=limit,
		ignore_permissions=True,
	)
	result: dict[str, int | str | bool] = {
		"branch": branch,
		"forced": True,
		"selected": len(profile_names),
		"refreshed": 0,
		"unlinked": 0,
		"skipped": 0,
		"failed": 0,
		"notifications": 0,
	}
	for profile_name in profile_names:
		try:
			outcome = _process_locked_profile(profile_name, reference=reference, force=True)
			key = outcome.get("outcome") or "failed"
			if key == "refreshed":
				result["refreshed"] += 1
				frappe.db.commit()
			elif key == "unlinked":
				result["unlinked"] += 1
				frappe.db.rollback()
			else:
				result["skipped"] += 1
				frappe.db.rollback()
		except Exception:
			frappe.db.rollback()
			result["failed"] += 1

	try:
		result["notifications"] = _notify_managers(
			{branch: int(result["refreshed"])},
			manual=True,
			reference=reference,
		)
		frappe.db.commit()
	except Exception:
		frappe.db.rollback()
		result["failed"] += 1

	frappe.logger("nomad_vip.rank_evaluation").info(
		json.dumps({"event": "rank_evaluation.branch_forced", **result}, ensure_ascii=False, sort_keys=True)
	)
	return result


def send_rank_review_reminders(reference=None) -> dict[str, int | bool | str]:
	"""Remind branch managers to review rank evidence on the 1st and 15th.

	The reminder is separate from the rolling 15-day evidence refresh. Re-running the
	job for the same date does not create a second notification for the same manager.
	"""
	reminder_at = get_datetime(reference or now_datetime())
	reminder_date = reminder_at.date()
	result: dict[str, int | bool | str] = {
		"date": reminder_date.isoformat(),
		"due": reminder_date.day in RANK_REVIEW_REMINDER_DAYS,
		"branches": 0,
		"managers": 0,
		"created": 0,
		"skipped": 0,
	}
	if not result["due"]:
		return result

	branches = sorted({
		branch
		for branch in frappe.get_all(
			"VIP Entertainer Profile",
			filters={"active": 1},
			pluck="branch",
			ignore_permissions=True,
		)
		if branch
	})
	result["branches"] = len(branches)
	for branch in branches:
		for user in _manager_users(branch):
			result["managers"] += 1
			subject = f"{branch}: {reminder_date:%Y.%m.%d} зэрэглэлийн үнэлгээг шалгана уу"
			if frappe.db.exists("Notification Log", {"for_user": user, "subject": subject}):
				result["skipped"] += 1
				continue
			frappe.get_doc(
				{
					"doctype": "Notification Log",
					"subject": subject,
					"email_content": (
						"Сар бүрийн 1, 15-ны зэрэглэлийн үнэлгээний сануулга. "
						"Шинэчлэгдсэн оноо, системийн санал болон нотолгоог шалгана уу."
					),
					"for_user": user,
					"from_user": "Administrator",
					"type": "Alert",
				}
			).insert(ignore_permissions=True)
			result["created"] += 1

	frappe.logger("nomad_vip.rank_evaluation").info(
		json.dumps({"event": "rank_review_reminder.completed", **result}, sort_keys=True)
	)
	return result


def refresh_due_rank_evaluations(batch_size=500) -> dict[str, int]:
	"""Refresh due evidence and points; a human decision remains required for rank changes."""
	limit = max(1, min(1000, int(batch_size or 500)))
	profile_names = frappe.get_all(
		"VIP Entertainer Profile",
		filters={"active": 1},
		pluck="name",
		order_by="branch asc, name asc",
		limit_page_length=limit,
		ignore_permissions=True,
	)
	result = {
		"selected": len(profile_names),
		"refreshed": 0,
		"not_due": 0,
		"unlinked": 0,
		"skipped": 0,
		"failed": 0,
		"notifications": 0,
	}
	branch_counts: dict[str, int] = {}
	for profile_name in profile_names:
		try:
			outcome = _process_locked_profile(profile_name)
			key = outcome.get("outcome") or "failed"
			if key == "refreshed":
				result["refreshed"] += 1
				branch = outcome.get("branch")
				if branch:
					branch_counts[branch] = branch_counts.get(branch, 0) + 1
				frappe.db.commit()
			elif key in {"not_due", "unlinked"}:
				result[key] += 1
				frappe.db.rollback()
			else:
				result["skipped"] += 1
				frappe.db.rollback()
		except Exception:
			frappe.db.rollback()
			result["failed"] += 1

	try:
		result["notifications"] = _notify_managers(branch_counts)
		frappe.db.commit()
	except Exception:
		frappe.db.rollback()
		result["failed"] += 1

	frappe.logger("nomad_vip.rank_evaluation").info(
		json.dumps({"event": "rank_evaluation.completed", **result}, sort_keys=True)
	)
	return result
