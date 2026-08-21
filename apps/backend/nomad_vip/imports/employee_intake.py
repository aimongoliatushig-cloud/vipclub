from __future__ import annotations

import hashlib
import json
from pathlib import Path

import frappe
from frappe import _
from frappe.utils import cint, getdate, now_datetime, validate_email_address


ALLOWED_IMPORT_ROOT = Path("/tmp/nomad-vip-imports")
TARGET_BRANCH = "Nomad"
TARGET_DESIGNATION = "Бүжигчин"
SOURCE_PREFIX = "NOMAD-"


def _text(value) -> str:
	return " ".join(str(value or "").split()).strip()


def _source_key(registration_number: str) -> str:
	registration_number = _text(registration_number).upper().replace(" ", "")
	if not registration_number:
		return ""
	return f"{SOURCE_PREFIX}{hashlib.sha256(registration_number.encode('utf-8')).hexdigest()[:16].upper()}"


def _valid_email(value) -> str:
	email = _text(value).lower()
	return email if email and validate_email_address(email, throw=False) else ""


def _load_records(source_path: str) -> list[dict]:
	path = Path(source_path).resolve()
	root = ALLOWED_IMPORT_ROOT.resolve()
	if root not in path.parents:
		frappe.throw(_("Import file must be located under {0}.").format(root))
	if path.suffix.lower() != ".json" or not path.is_file():
		frappe.throw(_("The import JSON file does not exist."))
	with path.open("r", encoding="utf-8") as handle:
		payload = json.load(handle)
	if not isinstance(payload, list):
		frappe.throw(_("The import payload must be a list."))
	return payload


def _ready(record: dict) -> bool:
	return (
		_text(record.get("branch")) == TARGET_BRANCH
		and _text(record.get("designation")).replace(" ", "") == TARGET_DESIGNATION
		and not record.get("missingRequired")
		and bool(_source_key(record.get("registrationNumber")))
	)


def _candidate_employee_names(record: dict, source_key: str) -> set[str]:
	matches: set[str] = set()
	for filters in (
		{"employee_number": source_key},
		{"personal_email": _valid_email(record.get("personalEmail"))} if _valid_email(record.get("personalEmail")) else None,
		{"cell_number": _text(record.get("mobilePhone"))} if record.get("mobilePhone") else None,
	):
		if filters:
			matches.update(frappe.get_all("Employee", filters=filters, pluck="name", limit_page_length=0))

	name_filters = {
		"first_name": _text(record.get("legalFirstName")),
		"last_name": _text(record.get("legalLastName")),
		"date_of_birth": getdate(record.get("dateOfBirth")),
		"branch": TARGET_BRANCH,
	}
	matches.update(frappe.get_all("Employee", filters=name_filters, pluck="name", limit_page_length=0))
	return matches


def _employee_values(record: dict, source_key: str, company: str) -> dict:
	return {
		"employee_number": source_key,
		"first_name": _text(record.get("legalFirstName")),
		"last_name": _text(record.get("legalLastName")),
		"gender": _text(record.get("gender")),
		"date_of_birth": getdate(record.get("dateOfBirth")),
		"date_of_joining": getdate(record.get("dateOfJoining")),
		"company": company,
		"branch": TARGET_BRANCH,
		"designation": TARGET_DESIGNATION,
		"status": "Active" if _text(record.get("status")) == "Active" else "Inactive",
		"personal_email": _valid_email(record.get("personalEmail")),
		"cell_number": _text(record.get("mobilePhone")),
		"current_address": _text(record.get("homeAddress")),
	}


def _upsert_employee(record: dict, source_key: str, company: str, employee_name: str | None) -> tuple[str, str]:
	values = _employee_values(record, source_key, company)
	if employee_name:
		doc = frappe.get_doc("Employee", employee_name)
		for fieldname, value in values.items():
			if value not in (None, ""):
				doc.set(fieldname, value)
		doc.save(ignore_permissions=True)
		return doc.name, "updated"
	doc = frappe.get_doc({"doctype": "Employee", **values}).insert(ignore_permissions=True)
	return doc.name, "created"


def _upsert_profile(employee: str, record: dict) -> tuple[str, str]:
	profile_name = frappe.db.get_value("VIP Entertainer Profile", {"employee": employee}, "name")
	values = {
		"stage_name": _text(record.get("stageName")),
		"active": 1 if _text(record.get("status")) == "Active" else 0,
		"is_demo": 0,
		"employment_type": "Employee",
		"lifecycle_status": "Active" if _text(record.get("status")) == "Active" else "Inactive",
	}
	if profile_name:
		doc = frappe.get_doc("VIP Entertainer Profile", profile_name)
		doc.update(values)
		doc.save(ignore_permissions=True)
		return doc.name, "updated"
	doc = frappe.get_doc({
		"doctype": "VIP Entertainer Profile",
		"employee": employee,
		"media_consent_status": "Pending",
		"current_rank": "Rank 3",
		**values,
	}).insert(ignore_permissions=True)
	return doc.name, "created"


def _ensure_assignment(profile: str, employee: str, effective_from) -> str:
	existing = frappe.db.get_value(
		"VIP Entertainer Branch Assignment",
		{"entertainer": profile, "branch": TARGET_BRANCH, "assignment_status": "Active"},
		"name",
	)
	if existing:
		return "existing"
	frappe.get_doc({
		"doctype": "VIP Entertainer Branch Assignment",
		"entertainer": profile,
		"employee": employee,
		"branch": TARGET_BRANCH,
		"effective_from": getdate(effective_from),
		"assignment_status": "Active",
		"reason": "HR Excel intake import",
	}).insert(ignore_permissions=True)
	return "created"


def _environment() -> tuple[str, bool, bool]:
	company = frappe.defaults.get_global_default("company") or frappe.db.get_value("Company", {}, "name")
	if not company:
		frappe.throw(_("A default Company is required before importing employees."))
	return company, bool(frappe.db.exists("Branch", TARGET_BRANCH)), bool(frappe.db.exists("Designation", TARGET_DESIGNATION))


def run(source_path: str, dry_run=1) -> dict:
	"""Preview or import real Nomad entertainer records without creating login accounts.

	The employee number stores a one-way source identity hash; the raw registration
	number is deliberately not persisted in Frappe.
	"""
	dry_run = bool(cint(dry_run))
	records = _load_records(source_path)
	company, branch_exists, designation_exists = _environment()
	if not branch_exists:
		frappe.throw(_("The Nomad branch does not exist."))

	result = {
		"dry_run": dry_run,
		"source_rows": len(records),
		"ready_rows": 0,
		"blocked_rows": 0,
		"new_employees": 0,
		"matched_employees": 0,
		"conflicts": 0,
		"employees_created": 0,
		"employees_updated": 0,
		"profiles_created": 0,
		"profiles_updated": 0,
		"assignments_created": 0,
		"assignments_existing": 0,
		"login_accounts_created": 0,
		"invalid_emails_omitted": 0,
		"company": company,
		"branch": TARGET_BRANCH,
		"designation_will_be_created": not designation_exists,
		"blocked_source_rows": [],
		"conflict_source_rows": [],
		"completed_at": None,
	}

	prepared = []
	for record in records:
		if not _ready(record):
			result["blocked_rows"] += 1
			result["blocked_source_rows"].append(record.get("sourceRow"))
			continue
		result["ready_rows"] += 1
		if record.get("personalEmail") and not _valid_email(record.get("personalEmail")):
			result["invalid_emails_omitted"] += 1
		source_key = _source_key(record.get("registrationNumber"))
		matches = _candidate_employee_names(record, source_key)
		if len(matches) > 1:
			result["conflicts"] += 1
			result["conflict_source_rows"].append(record.get("sourceRow"))
			continue
		employee_name = next(iter(matches), None)
		if employee_name:
			result["matched_employees"] += 1
		else:
			result["new_employees"] += 1
		prepared.append((record, source_key, employee_name))

	if dry_run:
		return result

	if not designation_exists:
		frappe.get_doc({"doctype": "Designation", "designation_name": TARGET_DESIGNATION}).insert(ignore_permissions=True)

	try:
		for record, source_key, employee_name in prepared:
			employee, employee_action = _upsert_employee(record, source_key, company, employee_name)
			result[f"employees_{employee_action}"] += 1
			profile, profile_action = _upsert_profile(employee, record)
			result[f"profiles_{profile_action}"] += 1
			assignment_action = _ensure_assignment(profile, employee, record.get("dateOfJoining"))
			result[f"assignments_{assignment_action}"] += 1
		frappe.db.commit()
	except Exception:
		frappe.db.rollback()
		raise

	result["completed_at"] = str(now_datetime())
	return result


def production_summary() -> dict:
	return {
		"nomad_profiles": frappe.db.count("VIP Entertainer Profile", {"branch": TARGET_BRANCH}),
		"nomad_active_profiles": frappe.db.count("VIP Entertainer Profile", {"branch": TARGET_BRANCH, "active": 1}),
		"nomad_assignments": frappe.db.count("VIP Entertainer Branch Assignment", {"branch": TARGET_BRANCH, "assignment_status": "Active"}),
		"generated_at": str(now_datetime()),
	}
