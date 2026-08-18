from __future__ import annotations

import hashlib
import json
import re
from collections import Counter
from pathlib import Path

import frappe
from frappe import _
from frappe.utils import cint, now_datetime

from nomad_vip.api.security import record_api_audit, require_actor


ALLOWED_IMPORT_ROOT = Path("/tmp/nomad-vip-imports")
ALLOWED_BRANCHES = frozenset({"Nomad", "Neva", "Sapphire", "Monarch"})
ACTION = "hr.employee_branch.reconcile"
SOURCE_HASH_PATTERN = re.compile(r"^[0-9a-f]{64}$")


def _text(value) -> str:
	return " ".join(str(value or "").split()).strip()


def _load_mapping(source_path: str) -> tuple[dict, list[dict], str]:
	path = Path(source_path).resolve()
	root = ALLOWED_IMPORT_ROOT.resolve()
	if root not in path.parents:
		frappe.throw(_("Салбарын тулгалтын файл {0} хавтас дотор байх ёстой.").format(root))
	if path.suffix.lower() != ".json" or not path.is_file():
		frappe.throw(_("Салбарын тулгалтын JSON файл олдсонгүй."))

	with path.open("r", encoding="utf-8") as handle:
		payload = json.load(handle)
	if not isinstance(payload, dict) or payload.get("version") != 1:
		frappe.throw(_("Салбарын тулгалтын файлын хувилбар буруу байна."))
	if not isinstance(payload.get("records"), list):
		frappe.throw(_("Салбарын тулгалтын мөрүүд буруу бүтэцтэй байна."))

	policy = payload.get("policy") or {}
	if policy.get("updateOnlyBlankBranch") is not True:
		frappe.throw(_("Энэ ажиллагаа зөвхөн салбар хоосон ажилтныг шинэчлэх ёстой."))
	reviewed_recommendations = policy.get("highConfidenceReviewed") is True
	source_hash = _text((payload.get("source") or {}).get("sha256")).lower()
	if not SOURCE_HASH_PATTERN.fullmatch(source_hash):
		frappe.throw(_("Эх Excel файлын хэш дутуу эсвэл буруу байна."))

	records: list[dict] = []
	seen_employee_numbers: set[str] = set()
	for raw in payload["records"]:
		if not isinstance(raw, dict):
			frappe.throw(_("Салбарын тулгалтын мөр буруу байна."))
		employee_number = _text(raw.get("employeeNumber"))
		branch = _text(raw.get("branch"))
		evidence = _text(raw.get("evidence"))
		confidence = _text(raw.get("confidence")).lower()
		if not employee_number or employee_number in seen_employee_numbers:
			frappe.throw(_("Ажилтны код хоосон эсвэл давхардсан байна."))
		if branch not in ALLOWED_BRANCHES:
			frappe.throw(_("Зөвшөөрөгдөөгүй салбар байна: {0}").format(branch))
		if confidence not in {"exact", "reviewed"} or not evidence:
			frappe.throw(_("Зөвхөн эх жагсаалтаар батлагдсан салбарын мөрийг ашиглана."))
		if confidence == "reviewed" and not reviewed_recommendations:
			frappe.throw(_("Өндөр итгэлтэй зөвлөмжийг ашиглахын өмнө хянан баталгаажуулна уу."))
		seen_employee_numbers.add(employee_number)
		records.append(
			{
				"employee_number": employee_number,
				"branch": branch,
				"evidence": evidence,
				"confidence": confidence,
				"source_row": raw.get("sourceRow"),
			}
		)

	if not records:
		frappe.throw(_("Салбар оноох батлагдсан мөр алга байна."))
	records.sort(key=lambda item: item["employee_number"])
	canonical = json.dumps(records, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
	mapping_hash = hashlib.sha256(f"{source_hash}:{canonical}".encode("utf-8")).hexdigest()
	return payload, records, mapping_hash


def _branch_totals() -> dict[str, int]:
	totals = {branch: frappe.db.count("Employee", {"branch": branch}) for branch in sorted(ALLOWED_BRANCHES)}
	totals["Unassigned"] = frappe.db.count("Employee", {"branch": ("in", ["", None])})
	return totals


def _employee_rows(records: list[dict], *, lock: bool) -> list[dict]:
	placeholders = ", ".join(["%s"] * len(records))
	query = (
		"SELECT name, employee_number, branch FROM `tabEmployee` "
		f"WHERE employee_number IN ({placeholders}) ORDER BY employee_number"
	)
	if lock:
		query += " FOR UPDATE"
	return frappe.db.sql(query, tuple(item["employee_number"] for item in records), as_dict=True)


def _preflight(records: list[dict], *, lock: bool) -> tuple[dict, list[tuple[str, str]]]:
	requested = {item["employee_number"]: item for item in records}
	rows = _employee_rows(records, lock=lock)
	found_counts = Counter(_text(row.employee_number) for row in rows)
	missing = sorted(set(requested) - set(found_counts))
	duplicates = sorted(number for number, count in found_counts.items() if count != 1)
	conflicts: list[str] = []
	ready: list[tuple[str, str]] = []
	already_assigned = 0

	for row in rows:
		number = _text(row.employee_number)
		if found_counts[number] != 1:
			continue
		target = requested[number]["branch"]
		current = _text(row.branch)
		if not current:
			ready.append((row.name, target))
		elif current == target:
			already_assigned += 1
		else:
			conflicts.append(number)

	return (
		{
			"requested": len(records),
			"ready": len(ready),
			"already_assigned": already_assigned,
			"missing": len(missing),
			"duplicate_employee_numbers": len(duplicates),
			"conflicting_existing_branch": len(conflicts),
			"target_counts": dict(sorted(Counter(item["branch"] for item in records).items())),
			"confidence_counts": dict(sorted(Counter(item["confidence"] for item in records).items())),
		},
		ready,
	)


def _replay_result(mapping_hash: str) -> dict | None:
	details = frappe.db.get_value(
		"VIP API Audit Event",
		{"action": ACTION, "idempotency_key": f"employee-branch:{mapping_hash}", "outcome": "Succeeded"},
		"details",
	)
	if not details:
		return None
	try:
		result = json.loads(details)
	except (TypeError, ValueError):
		result = {}
	result.update({"dry_run": False, "replayed": True, "mapping_hash": mapping_hash})
	return result


@frappe.whitelist(methods=["POST"])
def run(source_path: str, dry_run=1) -> dict:
	"""Assign only source-confirmed blank Employee branches; never overwrite an existing branch."""
	actor = require_actor("System Manager")
	dry_run = bool(cint(dry_run))
	payload, records, mapping_hash = _load_mapping(source_path)
	before = _branch_totals()

	if not dry_run:
		replayed = _replay_result(mapping_hash)
		if replayed:
			return replayed

	summary, ready = _preflight(records, lock=not dry_run)
	result = {
		"dry_run": dry_run,
		"replayed": False,
		"source_hash": _text((payload.get("source") or {}).get("sha256")),
		"mapping_hash": mapping_hash,
		"before": before,
		"summary": summary,
		"after": None,
		"completed_at": None,
	}
	if any(
		summary[key]
		for key in ("missing", "duplicate_employee_numbers", "conflicting_existing_branch")
	):
		if dry_run:
			return result
		frappe.throw(_("Салбарын тулгалтад зөрчил байна. Dry-run тайланг шалгана уу."))
	if dry_run:
		projected = dict(before)
		for _, branch in ready:
			projected[branch] = projected.get(branch, 0) + 1
			projected["Unassigned"] = max(0, projected.get("Unassigned", 0) - 1)
		result["after"] = projected
		return result

	try:
		for employee_name, branch in ready:
			doc = frappe.get_doc("Employee", employee_name)
			if _text(doc.branch):
				frappe.throw(_("Шинэчлэх явцад ажилтны салбар өөрчлөгдсөн байна. Дахин dry-run хийнэ үү."))
			doc.branch = branch
			doc.save(ignore_permissions=True)

		result["after"] = _branch_totals()
		result["completed_at"] = str(now_datetime())
		audit_details = {
			"mapping_hash": mapping_hash,
			"source_hash": result["source_hash"],
			"updated": len(ready),
			"before": result["before"],
			"after": result["after"],
			"summary": summary,
			"completed_at": result["completed_at"],
		}
		record_api_audit(
			actor=actor,
			action=ACTION,
			target_doctype="Employee",
			idempotency_key=f"employee-branch:{mapping_hash}",
			details=audit_details,
		)
		frappe.db.commit()
	except Exception:
		frappe.db.rollback()
		raise
	return result
