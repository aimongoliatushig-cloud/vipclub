from __future__ import annotations

import hashlib
import json
import re
from collections import Counter

import frappe
from frappe import _
from frappe.utils import cint, getdate, now_datetime

from nomad_vip.api.security import (
	ActorContext,
	assert_not_stale,
	normalize_idempotency_key,
	page_meta,
	page_window,
	record_api_audit,
	require_actor,
)
from nomad_vip.integrations.finex import VIP_BRANCHES
from nomad_vip.services import PRIVILEGED_ROLES


STAFF_PATTERN = re.compile(
	r"(^|[\s_-])(tip|manager|mg|zoogch|zuugch|barmen|bartender|waiter)([\s_-]|$)",
	re.IGNORECASE,
)
STAFF_WORDS = ("зөөгч", "бармен", "үйлчлэгч", "менежер")
BRANCH_MARKERS = (
	(re.compile(r"(^|[\s_-])(dn|nd)([\s_-]|$)", re.IGNORECASE), "Nomad"),
	(re.compile(r"(^|[\s_-])nv([\s_-]|$)", re.IGNORECASE), "Neva"),
	(re.compile(r"(^|[\s_-])sp([\s_-]|$)", re.IGNORECASE), "Sapphire"),
	(re.compile(r"(^|[\s_-])mc([\s_-]|$)", re.IGNORECASE), "Monarch"),
)
CANDIDATE_FIELDS = [
	"name",
	"finex_dancer_id",
	"dancer_name",
	"dancer_nickname",
	"inferred_branch",
	"observed_branches",
	"bill_count",
	"first_seen",
	"last_seen",
	"suggested_classification",
	"review_status",
	"review_note",
	"reviewed_by",
	"reviewed_at",
	"linked_profile",
	"modified",
]
REVIEW_DECISIONS = {"Entertainer", "Staff", "Inactive"}
REVIEW_ACTION = "manager.finex_candidate.review"


def _value(row, field, default=None):
	return row.get(field, default) if isinstance(row, dict) else getattr(row, field, default)


def _candidate_key(dancer):
	for field in ("dancerId", "dancerCode"):
		value = dancer.get(field)
		if value not in (None, ""):
			return str(value).strip()
	label = "|".join(str(dancer.get(field) or "").strip().lower() for field in ("dancerName", "dancerNickname"))
	return f"legacy-{hashlib.sha1(label.encode('utf-8')).hexdigest()[:20]}" if label.strip("|") else None


def _suggest_classification(name, nickname):
	label = f"{name or ''} {nickname or ''}".strip().lower()
	if STAFF_PATTERN.search(label) or any(word in label for word in STAFF_WORDS):
		return "Staff"
	return "Entertainer"


def _infer_branch(name, nickname, observed_branches):
	label = f"{name or ''} {nickname or ''}"
	for pattern, branch in BRANCH_MARKERS:
		if pattern.search(label):
			return branch
	valid = [(branch, count) for branch, count in observed_branches.items() if branch in VIP_BRANCHES]
	return max(valid, key=lambda item: (item[1], item[0]))[0] if valid else None


def _extract_candidates(bills):
	candidates = {}
	for bill in bills:
		try:
			payload = json.loads(_value(bill, "raw_payload") or "{}")
		except (TypeError, ValueError):
			continue
		bill_name = str(_value(bill, "name") or payload.get("billId") or "")
		posting_date = getdate(_value(bill, "posting_date") or payload.get("docdate"))
		branch = (_value(bill, "store_name") or payload.get("storeName") or "").strip()
		for item in payload.get("items") or []:
			for dancer in item.get("dancers") or []:
				key = _candidate_key(dancer)
				if not key:
					continue
				row = candidates.setdefault(key, {
					"finex_dancer_id": key,
					"dancer_name": "",
					"dancer_nickname": "",
					"bill_ids": set(),
					"branches": Counter(),
					"first_seen": None,
					"last_seen": None,
				})
				row["dancer_name"] = str(dancer.get("dancerName") or row["dancer_name"] or "").strip()
				row["dancer_nickname"] = str(dancer.get("dancerNickname") or row["dancer_nickname"] or "").strip()
				row["bill_ids"].add(bill_name)
				if branch:
					row["branches"][branch] += 1
				if posting_date:
					row["first_seen"] = min(filter(None, [row["first_seen"], posting_date]), default=posting_date)
					row["last_seen"] = max(filter(None, [row["last_seen"], posting_date]), default=posting_date)
	for row in candidates.values():
		row["inferred_branch"] = _infer_branch(row["dancer_name"], row["dancer_nickname"], row["branches"])
		row["observed_branches"] = "\n".join(f"{branch}: {count} тооцооны баримт" for branch, count in row["branches"].most_common())
		row["bill_count"] = len(row["bill_ids"])
		row["suggested_classification"] = _suggest_classification(row["dancer_name"], row["dancer_nickname"])
	return candidates


def reconcile_finex_entertainer_candidates(dry_run=False):
	bills = frappe.get_all(
		"VIP POS Bill",
		fields=["name", "posting_date", "store_name", "raw_payload"],
		limit_page_length=0,
	)
	candidates = _extract_candidates(bills)
	result = {"bills": len(bills), "found": len(candidates), "created": 0, "updated": 0, "skipped_without_branch": 0, "dry_run": bool(dry_run)}
	if dry_run:
		result["by_branch"] = dict(Counter(row.get("inferred_branch") or "Unknown" for row in candidates.values()))
		result["suggested_staff"] = sum(row["suggested_classification"] == "Staff" for row in candidates.values())
		return result
	for key, row in candidates.items():
		if not row.get("inferred_branch"):
			result["skipped_without_branch"] += 1
			continue
		values = {
			"dancer_name": row["dancer_name"],
			"dancer_nickname": row["dancer_nickname"],
			"inferred_branch": row["inferred_branch"],
			"observed_branches": row["observed_branches"],
			"bill_count": row["bill_count"],
			"first_seen": row["first_seen"],
			"last_seen": row["last_seen"],
			"last_synced_at": now_datetime(),
			"suggested_classification": row["suggested_classification"],
		}
		name = frappe.db.get_value("VIP Finex Entertainer Candidate", {"finex_dancer_id": key}, "name")
		if name:
			frappe.db.set_value("VIP Finex Entertainer Candidate", name, values, update_modified=False)
			result["updated"] += 1
		else:
			frappe.get_doc({
				"doctype": "VIP Finex Entertainer Candidate",
				"finex_dancer_id": key,
				"review_status": "Pending",
				**values,
			}).insert(ignore_permissions=True)
			result["created"] += 1
	frappe.db.commit()
	return result


@frappe.whitelist()
def sync_finex_entertainer_candidates(dry_run=0):
	roles = set(frappe.get_roles())
	if frappe.session.user != "Administrator" and not roles.intersection(PRIVILEGED_ROLES | {"VIP Admin", "HR Manager"}):
		frappe.throw(_("Энэ үйлдлийг хийх эрхгүй."), frappe.PermissionError)
	return reconcile_finex_entertainer_candidates(bool(cint(dry_run)))


def _manager_actor() -> ActorContext:
	actor = require_actor("Branch Manager", require_branch=True)
	if not actor.branch:
		frappe.throw(_("Таны ажилтны бүртгэлд салбар тохируулаагүй байна."), frappe.PermissionError)
	return actor


def _candidate_projection(candidate, *, audit=None, replayed=False):
	return {
		"name": candidate.name,
		"finex_dancer_id": candidate.finex_dancer_id,
		"inferred_branch": candidate.inferred_branch,
		"review_status": candidate.review_status,
		"review_note": candidate.review_note,
		"reviewed_by": candidate.reviewed_by,
		"reviewed_at": candidate.reviewed_at,
		"linked_profile": candidate.linked_profile,
		"modified": candidate.modified,
		"audit": audit,
		"replayed": replayed,
	}


def _candidate_count(branch, status, search):
	conditions = ["inferred_branch = %(branch)s"]
	values = {"branch": branch}
	if status != "All":
		conditions.append("review_status = %(status)s")
		values["status"] = status
	if search:
		conditions.append(
			"(finex_dancer_id like %(search)s or dancer_name like %(search)s "
			"or dancer_nickname like %(search)s)"
		)
		values["search"] = f"%{search}%"
	return cint(
		frappe.db.sql(
			f"""select count(*) from `tabVIP Finex Entertainer Candidate`
			where {' and '.join(conditions)}""",
			values,
		)[0][0]
	)


@frappe.whitelist(methods=["GET"])
def get_manager_roster_candidates(status="Pending", search="", limit=50, cursor=0):
	actor = _manager_actor()
	branch = actor.branch
	page_size, offset = page_window(limit, cursor)
	status = (status or "Pending").strip().title()
	allowed = {"Pending", "Entertainer", "Staff", "Inactive", "All"}
	if status not in allowed:
		frappe.throw(_("Жагсаалтын төлөв буруу байна."), frappe.ValidationError)
	search = (search or "").strip()
	filters = {"inferred_branch": branch}
	if status != "All":
		filters["review_status"] = status
	or_filters = None
	if search:
		term = f"%{search}%"
		or_filters = {
			"finex_dancer_id": ["like", term],
			"dancer_name": ["like", term],
			"dancer_nickname": ["like", term],
		}
	rows = frappe.get_all(
		"VIP Finex Entertainer Candidate",
		filters=filters,
		or_filters=or_filters,
		fields=CANDIDATE_FIELDS,
		order_by="last_seen desc, bill_count desc, dancer_nickname asc",
		limit_start=offset,
		limit_page_length=page_size,
	)
	summary_rows = frappe.db.sql(
		"""select review_status, count(*) total from `tabVIP Finex Entertainer Candidate`
		where inferred_branch = %s group by review_status""",
		branch,
		as_dict=True,
	)
	summary = {"total": 0, "pending": 0, "entertainer": 0, "staff": 0, "inactive": 0}
	for row in summary_rows:
		key = str(row.review_status).lower()
		summary[key] = row.total
		summary["total"] += row.total
	total = _candidate_count(branch, status, search)
	return {
		"branch": branch,
		"status": status,
		"search": search,
		"summary": summary,
		"candidates": rows,
		"meta": page_meta(
			branch=branch,
			limit=page_size,
			offset=offset,
			returned=len(rows),
			total=total,
		),
	}


def _find_review_audit(actor, candidate, idempotency_key):
	if not idempotency_key:
		return None
	return frappe.db.get_value(
		"VIP API Audit Event",
		{
			"actor": actor.user,
			"action": REVIEW_ACTION,
			"target_doctype": "VIP Finex Entertainer Candidate",
			"target_name": candidate,
			"idempotency_key": idempotency_key,
			"outcome": "Succeeded",
		},
		["name", "details"],
		as_dict=True,
	)


@frappe.whitelist(methods=["POST"])
def review_manager_roster_candidate(
	candidate,
	decision,
	note="",
	expected_modified=None,
	idempotency_key=None,
):
	actor = _manager_actor()
	branch = actor.branch
	decision = (decision or "").strip().title()
	if decision not in REVIEW_DECISIONS:
		frappe.throw(_("Бүжигчин, ажилтан эсвэл идэвхгүй гэсэн төлвөөс сонгоно уу."), frappe.ValidationError)
	note = (note or "").strip()
	if decision in {"Staff", "Inactive"} and not note:
		frappe.throw(_("Ажилтан эсвэл идэвхгүй гэж ангилсан шалтгааныг бичнэ үү."), frappe.ValidationError)
	idempotency_key = normalize_idempotency_key(idempotency_key)
	locked = frappe.db.sql(
		"select name from `tabVIP Finex Entertainer Candidate` where name = %s for update",
		candidate,
	)
	if not locked:
		frappe.throw(_("Шалгах бүртгэл олдсонгүй."), frappe.DoesNotExistError)
	doc = frappe.get_doc("VIP Finex Entertainer Candidate", candidate)
	if doc.inferred_branch != branch:
		frappe.throw(_("Та зөвхөн өөрийн салбарын бүртгэлийг шалгах эрхтэй."), frappe.PermissionError)

	existing_audit = _find_review_audit(actor, doc.name, idempotency_key)
	if existing_audit:
		details = json.loads(existing_audit.details or "{}")
		after = details.get("after") or {}
		if after.get("review_status") != decision or (after.get("review_note") or "") != note:
			frappe.throw(
				_("Давхар хүсэлтээс хамгаалах энэ түлхүүрийг өөр мэдээлэлтэй дахин ашиглах боломжгүй."),
				frappe.ValidationError,
			)
		return _candidate_projection(doc, audit=existing_audit.name, replayed=True)

	assert_not_stale(doc.doctype, doc.name, expected_modified)
	if doc.review_status != "Pending":
		frappe.throw(_("Энэ бүртгэлийг өмнө нь шийдвэрлэсэн байна."), frappe.ValidationError)
	before = {
		"review_status": doc.review_status,
		"review_note": doc.review_note,
		"reviewed_by": doc.reviewed_by,
		"reviewed_at": doc.reviewed_at,
		"linked_profile": doc.linked_profile,
		"modified": str(doc.modified),
	}
	doc.review_status = decision
	doc.review_note = note
	doc.reviewed_by = actor.user
	doc.reviewed_at = now_datetime()
	doc.save(ignore_permissions=True)
	after = {
		"review_status": doc.review_status,
		"review_note": doc.review_note,
		"reviewed_by": doc.reviewed_by,
		"reviewed_at": str(doc.reviewed_at),
		"linked_profile": doc.linked_profile,
		"modified": str(doc.modified),
	}
	audit = record_api_audit(
		actor=actor,
		action=REVIEW_ACTION,
		target_doctype=doc.doctype,
		target_name=doc.name,
		idempotency_key=idempotency_key,
		details={"before": before, "after": after, "note": note},
	)
	frappe.db.commit()
	return _candidate_projection(doc, audit=audit, replayed=False)
