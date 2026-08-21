from __future__ import annotations

import json
import re
from datetime import timedelta

import frappe
from frappe import _
from frappe.utils import getdate, now_datetime, today

from nomad_vip.api.security import record_api_audit, require_actor
from nomad_vip.demo_rank_batch import build_demo_rank_result, summarize_demo_results
from nomad_vip.tasks.daily_rank import _policy_thresholds, _policy_weights, _published_policy


ACTION_CREATE = "system.demo_rank_batch.create"
ACTION_ROLLBACK = "system.demo_rank_batch.rollback"
BATCH_ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{5,79}$")
DEMO_TIMELINE_VERSION = "v3"


def _global_actor():
	return require_actor("System Manager")


def _report_actor():
	return require_actor("Branch Manager", "CEO", "System Manager")


def _is_global(actor) -> bool:
	return actor.user == "Administrator" or bool(actor.roles.intersection({"CEO", "System Manager"}))


def _parse_json(value, default):
	try:
		return json.loads(value or "")
	except (TypeError, ValueError):
		return default


def _confirmed_profiles():
	return frappe.db.sql(
		"""
		select
			p.name, p.employee, p.stage_name, p.branch, p.current_rank,
			coalesce(p.employee_name, e.employee_name) as employee_name
		from `tabVIP Entertainer Profile` p
		inner join `tabEmployee` e on e.name = p.employee and e.status = 'Active'
		where p.active = 1
			and coalesce(p.lifecycle_status, 'Active') = 'Active'
			and coalesce(p.is_demo, 0) = 0
		order by p.branch asc, p.stage_name asc, p.name asc
		""",
		as_dict=True,
	)


def _batch_payload(doc, results: list[dict]) -> dict:
	return {
		"batch": {
			"batch_id": doc.batch_id,
			"scoring_date": doc.scoring_date,
			"status": doc.status,
			"policy_version": doc.policy_version,
			"created_by": doc.created_by,
			"created_at": doc.created_at,
			"notes": doc.notes,
		},
		"summary": summarize_demo_results(results),
		"results": results,
		"data_contract": {
			"identity": "VERIFIED_EMPLOYEE_MASTER",
			"inputs": "DEMO",
			"mutates_approved_rank": False,
			"mutates_attendance_or_payroll": False,
		},
	}


@frappe.whitelist(methods=["POST"])
def seed_demo_rank_batch(scoring_date=None, batch_id=None, notes=None):
	"""Create one isolated demo batch for every confirmed active entertainer."""
	actor = _global_actor()
	date = getdate(scoring_date or today())
	identifier = (batch_id or f"production-demo-{date}-v1").strip().lower()
	if not BATCH_ID_PATTERN.fullmatch(identifier):
		frappe.throw(_("Туршилтын batch ID буруу байна."), frappe.ValidationError)
	existing = frappe.db.exists("VIP Demo Rank Batch", identifier)
	if existing:
		doc = frappe.get_doc("VIP Demo Rank Batch", existing)
		return {**_batch_payload(doc, _parse_json(doc.results_json, [])), "replayed": True}

	policy = _published_policy()
	if not policy:
		frappe.throw(_("Өдөр тутмын 8 үзүүлэлтийн бодлого нийтлэгдээгүй байна."), frappe.ValidationError)
	profiles = _confirmed_profiles()
	if not profiles:
		frappe.throw(_("Баталгаажсан идэвхтэй бүжигчин олдсонгүй."), frappe.ValidationError)
	weights = _policy_weights(policy)
	thresholds = _policy_thresholds(policy)
	results = [
		build_demo_rank_result(
			profile,
			batch_id=identifier,
			scoring_date=str(date),
			weights=weights,
			thresholds=thresholds,
		)
		for profile in profiles
	]
	summary = summarize_demo_results(results)
	doc = frappe.get_doc({
		"doctype": "VIP Demo Rank Batch",
		"batch_id": identifier,
		"scoring_date": date,
		"status": "Active",
		"policy_version": policy.version,
		"profile_count": summary["profile_count"],
		"complete_count": summary["complete_count"],
		"created_by": actor.user,
		"created_at": now_datetime(),
		"notes": (notes or "Production UI/logic demo. Бодит ирц, торгууль, цалин, батлагдсан зэрэглэлд нөлөөлөхгүй.").strip(),
		"summary_json": json.dumps(summary, ensure_ascii=False, sort_keys=True),
		"results_json": json.dumps(results, ensure_ascii=False, sort_keys=True),
	}).insert(ignore_permissions=True)
	record_api_audit(
		actor=actor,
		action=ACTION_CREATE,
		target_doctype="VIP Demo Rank Batch",
		target_name=doc.name,
		idempotency_key=identifier,
		details={
			"profile_count": summary["profile_count"],
			"scoring_date": str(date),
			"mutated_operational_records": 0,
		},
	)
	frappe.db.commit()
	return {**_batch_payload(doc, results), "replayed": False}


@frappe.whitelist(methods=["POST"])
def seed_demo_rank_timeline(start_date, end_date, notes=None):
	"""Persist an idempotent, isolated demo batch for each date in a short range."""
	_global_actor()
	start = getdate(start_date)
	end = getdate(end_date)
	if end < start:
		frappe.throw(_("Эхлэх огноо дуусах огнооноос хойш байж болохгүй."), frappe.ValidationError)
	day_count = (end - start).days + 1
	if day_count > 31:
		frappe.throw(_("Туршилтын хугацаа 31 өдрөөс урт байж болохгүй."), frappe.ValidationError)

	seeded = []
	for offset in range(day_count):
		date = start + timedelta(days=offset)
		payload = seed_demo_rank_batch(
			scoring_date=date,
			batch_id=f"production-demo-{date}-{DEMO_TIMELINE_VERSION}",
			notes=notes,
		)
		seeded.append({
			"batch_id": payload["batch"]["batch_id"],
			"scoring_date": str(payload["batch"]["scoring_date"]),
			"profile_count": payload["summary"]["profile_count"],
			"complete_count": payload["summary"]["complete_count"],
			"replayed": bool(payload.get("replayed")),
		})
	return {
		"from": str(start),
		"to": str(end),
		"days": day_count,
		"batches": seeded,
		"data_contract": {
			"inputs": "DEMO",
			"mutates_approved_rank": False,
			"mutates_attendance_or_payroll": False,
		},
	}


@frappe.whitelist(methods=["GET"])
def get_demo_rank_report(batch_id=None, branch=None):
	actor = _report_actor()
	filters = {"status": "Active"}
	if batch_id:
		filters["batch_id"] = (batch_id or "").strip().lower()
	name = frappe.db.get_value(
		"VIP Demo Rank Batch",
		filters,
		"name",
		order_by="scoring_date desc, created_at desc",
	)
	if not name:
		return {
			"batch": None,
			"summary": summarize_demo_results([]),
			"results": [],
			"data_contract": {
				"identity": "VERIFIED_EMPLOYEE_MASTER",
				"inputs": "DEMO",
				"mutates_approved_rank": False,
				"mutates_attendance_or_payroll": False,
			},
		}
	doc = frappe.get_doc("VIP Demo Rank Batch", name)
	results = _parse_json(doc.results_json, [])
	requested_branch = (branch or "").strip()
	if _is_global(actor):
		if requested_branch:
			results = [row for row in results if row.get("branch") == requested_branch]
	else:
		if not actor.branch:
			frappe.throw(_("Таны ажилтны бүртгэлд салбар тохируулаагүй байна."), frappe.PermissionError)
		if requested_branch and requested_branch != actor.branch:
			frappe.throw(_("Өөр салбарын тайлан харах эрхгүй байна."), frappe.PermissionError)
		results = [row for row in results if row.get("branch") == actor.branch]
	return _batch_payload(doc, results)


@frappe.whitelist(methods=["POST"])
def rollback_demo_rank_batch(batch_id, reason):
	actor = _global_actor()
	identifier = (batch_id or "").strip().lower()
	doc = frappe.get_doc("VIP Demo Rank Batch", identifier)
	reason = (reason or "").strip()
	if len(reason) < 5:
		frappe.throw(_("Буцаах шалтгааныг тодорхой бичнэ үү."), frappe.ValidationError)
	if doc.status != "Rolled Back":
		doc.db_set("status", "Rolled Back")
		record_api_audit(
			actor=actor,
			action=ACTION_ROLLBACK,
			target_doctype="VIP Demo Rank Batch",
			target_name=doc.name,
			details={"reason": reason, "operational_records_removed": 0},
		)
		frappe.db.commit()
	return {"batch_id": doc.batch_id, "status": "Rolled Back"}
