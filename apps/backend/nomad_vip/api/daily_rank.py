from __future__ import annotations

import json

import frappe
from frappe import _
from frappe.utils import flt, getdate, now_datetime, today

from nomad_vip.api.security import (
	normalize_idempotency_key,
	record_api_audit,
	require_actor,
)
from nomad_vip.tasks.daily_rank import refresh_profile_daily_rank


ACTION = "manager.entertainer_rank.component_score"
COMPONENT_EVENT_TYPES = {
	"customer_complaints": "Ranking Customer Complaints Score",
	"entertaining_skill": "Ranking Entertaining Skill Score",
	"cleanliness_beauty": "Ranking Cleanliness Beauty Score",
	"personal_development": "Ranking Personal Development Score",
	"entertainer_attitude": "Ranking Attitude Score",
}
MANAGER_ONLY_COMPONENTS = {"customer_complaints", "entertainer_attitude"}
COMPLAINT_SEVERITIES = {"low", "medium", "high", "critical"}


def _profile(profile_name: str, branch: str | None):
	row = frappe.db.get_value(
		"VIP Entertainer Profile",
		profile_name,
		["name", "employee", "branch", "active", "lifecycle_status"],
		as_dict=True,
	)
	if not row or not row.active or row.lifecycle_status not in (None, "", "Active"):
		frappe.throw(_("Бүжигчний идэвхтэй бүртгэл олдсонгүй."), frappe.DoesNotExistError)
	if branch and row.branch != branch:
		frappe.throw(_("Өөр салбарын бүжигчнийг үнэлэх эрхгүй."), frappe.PermissionError)
	return row


@frappe.whitelist(methods=["POST"])
def submit_component_score(
	profile_name,
	component,
	score,
	scoring_date,
	reason=None,
	severity=None,
	idempotency_key=None,
):
	"""Append one explicit human assessment and refresh that day's snapshot.

	Every save creates a new immutable performance event. The calculator selects
	the latest verified event, so a manager can correct a score without erasing
	the previous value or its audit trail.
	"""
	actor = require_actor("Branch Manager", "Lead Entertainer", require_branch=True)
	component = (component or "").strip()
	if component not in COMPONENT_EVENT_TYPES:
		frappe.throw(_("Энэ үзүүлэлтийг гараар үнэлэх боломжгүй."), frappe.ValidationError)
	if component in MANAGER_ONLY_COMPONENTS and actor.user != "Administrator" and "Branch Manager" not in actor.roles:
		frappe.throw(_("Энэ үзүүлэлтийг зөвхөн салбарын менежер үнэлнэ."), frappe.PermissionError)
	if score is None or str(score).strip() == "":
		frappe.throw(_("Үнэлгээ оруулна уу."), frappe.ValidationError)
	value = flt(score)
	if value < 0 or value > 100:
		frappe.throw(_("Үнэлгээ 0-100 хооронд байна."), frappe.ValidationError)
	if abs(value / 5 - round(value / 5)) > 0.000001:
		frappe.throw(_("Үнэлгээг 5 онооны алхмаар оруулна уу."), frappe.ValidationError)
	date = getdate(scoring_date)
	if date > getdate(today()):
		frappe.throw(_("Ирээдүйн өдрийн зэрэглэлд үнэлгээ оруулахгүй."), frappe.ValidationError)
	reason = (reason or "").strip()
	severity = (severity or "").strip().lower()
	if component == "customer_complaints":
		if len(reason) < 5:
			frappe.throw(_("Зочны санал, гомдлын шалтгааныг бичнэ үү."), frappe.ValidationError)
		if severity not in COMPLAINT_SEVERITIES:
			frappe.throw(_("Зочны санал, гомдлын ноцтой байдлыг сонгоно уу."), frappe.ValidationError)
	elif not reason:
		reason = _("Менежерийн өдрийн үнэлгээ")
	key = normalize_idempotency_key(idempotency_key)
	if not key:
		frappe.throw(_("Давхардал хамгаалах түлхүүр шаардлагатай."), frappe.ValidationError)
	profile = _profile(profile_name, actor.branch)
	if actor.profile == profile.name and actor.user != "Administrator" and "Branch Manager" not in actor.roles:
		frappe.throw(_("Ахлах бүжигчин өөрийгөө үнэлэхгүй."), frappe.PermissionError)
	external_id = f"{date}|{profile.name}|{component}|{key}"
	existing = frappe.db.get_value(
		"VIP Performance Event",
		{"source": "daily_rank_assessment", "external_id": external_id},
		"name",
	)
	if existing:
		return {
			"event": existing,
			"daily_rank": refresh_profile_daily_rank(profile.name, date),
			"idempotent_replay": True,
		}
	previous_rows = frappe.get_all(
		"VIP Performance Event",
		filters={
			"entertainer": profile.name,
			"ranking_component": component,
			"scoring_date": ("<=", date) if component in {"entertaining_skill", "personal_development"} else date,
			"verified": 1,
			"component_score": ("is", "set"),
		},
		fields=["name", "component_score", "scoring_date"],
		order_by="scoring_date desc, occurred_at desc, creation desc",
		limit=1,
		ignore_permissions=True,
	)
	previous = previous_rows[0] if previous_rows else None

	event = frappe.get_doc({
		"doctype": "VIP Performance Event",
		"entertainer": profile.name,
		"event_type": COMPONENT_EVENT_TYPES[component],
		"occurred_at": now_datetime(),
		"scoring_date": date,
		"verified": 1,
		"ranking_component": component,
		"component_score": value,
		"evidence_json": json.dumps({
			"reason": reason,
			"severity": severity or None,
			"entered_by": actor.user,
			"entered_role": actor.role,
			"previous_event": previous.name if previous else None,
			"previous_score": flt(previous.component_score) if previous else None,
			"previous_scoring_date": str(previous.scoring_date) if previous else None,
		}, ensure_ascii=False, sort_keys=True),
		"source": "daily_rank_assessment",
		"external_id": external_id,
	}).insert(ignore_permissions=True)
	record_api_audit(
		actor=actor,
		action=ACTION,
		target_doctype="VIP Performance Event",
		target_name=event.name,
		idempotency_key=key,
		details={
			"entertainer": profile.name,
			"scoring_date": str(date),
			"component": component,
			"score": value,
			"previous_score": flt(previous.component_score) if previous else None,
			"reason": reason,
			"severity": severity or None,
		},
	)
	daily_rank = refresh_profile_daily_rank(profile.name, date)
	frappe.db.commit()
	return {"event": event.name, "daily_rank": daily_rank, "idempotent_replay": False}
