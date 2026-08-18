from __future__ import annotations

import hashlib
import json
import re
from collections import Counter
from pathlib import Path

import frappe
from frappe import _
from frappe.utils import cint, getdate, now_datetime, validate_email_address

from nomad_vip.api.security import ActorContext, record_api_audit


ALLOWED_IMPORT_ROOT = Path("/tmp/nomad-vip-imports")
ALLOWED_COMPANIES = {
	"BIG future DHD LLC": {
		"abbr": "BFDL",
		"country": "Mongolia",
		"default_currency": "MNT",
	},
	"Эл лайн вэйл ХХК": {
		"abbr": "ELV",
		"country": "Mongolia",
		"default_currency": "MNT",
	},
}
ALLOWED_BRANCHES = {"Nomad", "Neva", "Sapphire", "Monarch"}
UNKNOWN_GENDER = "Prefer not to say"


def _text(value) -> str:
	return " ".join(str(value or "").split()).strip()


def _valid_email(value) -> str:
	email = _text(value).lower()
	return email if email and validate_email_address(email, throw=False) else ""


def _phone_numbers(value) -> list[str]:
	return re.findall(r"(?<!\d)\d{8}(?!\d)", _text(value))


def _primary_phone(value) -> str:
	numbers = _phone_numbers(value)
	return numbers[0] if numbers else ""


def _load_payload(source_path: str) -> dict:
	path = Path(source_path).resolve()
	root = ALLOWED_IMPORT_ROOT.resolve()
	if root not in path.parents:
		frappe.throw(_("Импортын файл {0} хавтас дотор байх ёстой.").format(root))
	if path.suffix.lower() != ".json" or not path.is_file():
		frappe.throw(_("Импортлох JSON файл олдсонгүй."))
	with path.open("r", encoding="utf-8") as handle:
		payload = json.load(handle)
	if not isinstance(payload, dict) or not isinstance(payload.get("records"), list):
		frappe.throw(_("Импортын бүтэц буруу байна."))
	policy = payload.get("policy") or {}
	if policy.get("createLoginAccounts") is not False:
		frappe.throw(_("Энэ импорт нэвтрэх эрх үүсгэх ёсгүй."))
	return payload


def _row_ready(record: dict) -> bool:
	return all(
		_text(record.get(fieldname))
		for fieldname in (
			"employeeNumber",
			"sourceIdentityHash",
			"legalFirstName",
			"legalLastName",
			"dateOfBirth",
			"dateOfJoining",
			"company",
			"designation",
			"status",
		)
	)


def _payload_fingerprint(record: dict) -> str:
	projection = {
		key: record.get(key)
		for key in (
			"employeeNumber",
			"sourceIdentityHash",
			"legalFirstName",
			"legalLastName",
			"dateOfBirth",
			"dateOfJoining",
			"company",
			"sourceDepartment",
			"branch",
			"designation",
			"status",
			"employmentType",
			"personalEmail",
			"mobilePhone",
			"homeAddress",
			"bankName",
			"bankAccount",
		)
	}
	serialized = json.dumps(projection, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
	return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def _ensure_company(company: str) -> str:
	if company not in ALLOWED_COMPANIES:
		frappe.throw(_("Зөвшөөрөөгүй компани байна: {0}").format(company))
	if frappe.db.exists("Company", company):
		return company
	settings = ALLOWED_COMPANIES[company]
	frappe.get_doc(
		{
			"doctype": "Company",
			"company_name": company,
			"abbr": settings["abbr"],
			"country": settings["country"],
			"default_currency": settings["default_currency"],
			"create_chart_of_accounts_based_on": "Standard Template",
			"chart_of_accounts": "Standard",
		}
	).insert(ignore_permissions=True)
	return company


def _ensure_designation(value: str) -> str:
	value = _text(value)
	if not frappe.db.exists("Designation", value):
		frappe.get_doc({"doctype": "Designation", "designation_name": value}).insert(ignore_permissions=True)
	return value


def _ensure_employment_type(value: str) -> str:
	value = _text(value)
	if value and not frappe.db.exists("Employment Type", value):
		frappe.get_doc({"doctype": "Employment Type", "employee_type_name": value}).insert(ignore_permissions=True)
	return value


def _ensure_department(value: str, company: str) -> str:
	value = _text(value)
	if not value:
		return ""
	existing = frappe.db.get_value("Department", {"department_name": value, "company": company}, "name")
	if existing:
		return existing
	parent = frappe.db.get_value("Department", {"company": company, "is_group": 1, "parent_department": ""}, "name")
	if not parent:
		parent = frappe.db.get_value("Department", {"company": company, "is_group": 1}, "name")
	return frappe.get_doc(
		{
			"doctype": "Department",
			"department_name": value,
			"company": company,
			"parent_department": parent,
			"is_group": 0,
		}
	).insert(ignore_permissions=True).name


def _candidate_employee_names(record: dict, unique_emails: set[str], unique_phones: set[str]) -> set[str]:
	matches: set[str] = set()
	for employee_number in (_text(record.get("employeeNumber")), _text(record.get("legacyEmployeeNumber"))):
		if employee_number:
			matches.update(frappe.get_all("Employee", filters={"employee_number": employee_number}, pluck="name", limit_page_length=0))
	email = _valid_email(record.get("personalEmail"))
	if email and email in unique_emails:
		matches.update(frappe.get_all("Employee", filters={"personal_email": email}, pluck="name", limit_page_length=0))
	phone = _primary_phone(record.get("mobilePhone"))
	if phone and phone in unique_phones:
		matches.update(frappe.get_all("Employee", filters={"cell_number": phone}, pluck="name", limit_page_length=0))
	matches.update(
		frappe.get_all(
			"Employee",
			filters={
				"first_name": _text(record.get("legalFirstName")),
				"last_name": _text(record.get("legalLastName")),
				"date_of_birth": getdate(record.get("dateOfBirth")),
			},
			pluck="name",
			limit_page_length=0,
		)
	)
	return matches


def _employee_values(record: dict, company: str, department: str) -> dict:
	branch = _text(record.get("branch"))
	if branch and branch not in ALLOWED_BRANCHES:
		frappe.throw(_("Салбарын утга буруу байна."))
	return {
		"employee_number": _text(record.get("employeeNumber")),
		"first_name": _text(record.get("legalFirstName")),
		"last_name": _text(record.get("legalLastName")),
		"gender": _text(record.get("gender")) or UNKNOWN_GENDER,
		"date_of_birth": getdate(record.get("dateOfBirth")),
		"date_of_joining": getdate(record.get("dateOfJoining")),
		"company": company,
		"department": department,
		"designation": _text(record.get("designation")),
		"branch": branch,
		"status": "Active" if _text(record.get("status")) == "Active" else "Inactive",
		"employment_type": _text(record.get("employmentType")),
		"personal_email": _valid_email(record.get("personalEmail")),
		"cell_number": _primary_phone(record.get("mobilePhone")),
		"current_address": _text(record.get("homeAddress")),
		"bank_name": _text(record.get("bankName")),
		"bank_ac_no": _text(record.get("bankAccount")),
	}


def _upsert_employee(record: dict, employee_name: str | None) -> tuple[str, str]:
	company = _ensure_company(_text(record.get("company")))
	designation = _ensure_designation(record.get("designation"))
	employment_type = _ensure_employment_type(record.get("employmentType"))
	department = _ensure_department(record.get("sourceDepartment"), company)
	values = _employee_values(record, company, department)
	values["designation"] = designation
	values["employment_type"] = employment_type
	if employee_name:
		doc = frappe.get_doc("Employee", employee_name)
		for fieldname, value in values.items():
			if fieldname in {"branch", "gender"} and not value:
				continue
			if fieldname == "branch" and not value and doc.branch:
				continue
			if fieldname == "gender" and value == UNKNOWN_GENDER and doc.gender and doc.gender != UNKNOWN_GENDER:
				continue
			doc.set(fieldname, value)
		doc.save(ignore_permissions=True)
		return doc.name, "updated"
	doc = frappe.get_doc({"doctype": "Employee", **values}).insert(ignore_permissions=True)
	return doc.name, "created"


def run(source_path: str, dry_run=1) -> dict:
	"""Import the confirmed HR employee master without creating User accounts.

	The raw registration and tax numbers are never uploaded or persisted. The
	employee number is the workbook's operational code; bank data remains inside
	the permission-controlled Employee document. Salary is intentionally excluded
	until payroll semantics are approved.
	"""
	dry_run = bool(cint(dry_run))
	payload = _load_payload(source_path)
	records = payload["records"]
	email_counts = Counter(_valid_email(record.get("personalEmail")) for record in records)
	phone_counts = Counter(_primary_phone(record.get("mobilePhone")) for record in records)
	unique_emails = {value for value, count in email_counts.items() if value and count == 1}
	unique_phones = {value for value, count in phone_counts.items() if value and count == 1}

	result = {
		"dry_run": dry_run,
		"replayed": False,
		"source_hash": _text((payload.get("source") or {}).get("sha256")),
		"source_rows": len(records),
		"ready_rows": 0,
		"blocked_rows": 0,
		"new_employees": 0,
		"matched_employees": 0,
		"conflicts": 0,
		"employees_created": 0,
		"employees_updated": 0,
		"login_accounts_created": 0,
		"profile_records_created": 0,
		"branch_known_rows": 0,
		"branch_review_rows": 0,
		"invalid_emails_omitted": 0,
		"invalid_phones_omitted": 0,
		"alternate_phones_omitted": 0,
		"blocked_source_rows": [],
		"conflict_source_rows": [],
		"completed_at": None,
	}
	prepared: list[tuple[dict, str | None]] = []
	for record in records:
		row = record.get("sourceRow")
		if not _row_ready(record):
			result["blocked_rows"] += 1
			result["blocked_source_rows"].append(row)
			continue
		result["ready_rows"] += 1
		if _text(record.get("branch")):
			result["branch_known_rows"] += 1
		else:
			result["branch_review_rows"] += 1
		if record.get("personalEmail") and not _valid_email(record.get("personalEmail")):
			result["invalid_emails_omitted"] += 1
		phone_numbers = _phone_numbers(record.get("mobilePhone"))
		if record.get("mobilePhone") and not phone_numbers:
			result["invalid_phones_omitted"] += 1
		if len(phone_numbers) > 1:
			result["alternate_phones_omitted"] += len(phone_numbers) - 1
		matches = _candidate_employee_names(record, unique_emails, unique_phones)
		if len(matches) > 1:
			result["conflicts"] += 1
			result["conflict_source_rows"].append(row)
			continue
		employee_name = next(iter(matches), None)
		if employee_name:
			result["matched_employees"] += 1
		else:
			result["new_employees"] += 1
		prepared.append((record, employee_name))

	if dry_run:
		return result
	audit_key = f"employee-master:{result['source_hash'][:32]}"
	if frappe.db.exists(
		"VIP API Audit Event",
		{"action": "hr.employee_master.import", "idempotency_key": audit_key, "outcome": "Succeeded"},
	):
		result["replayed"] = True
		result["completed_at"] = str(now_datetime())
		return result
	try:
		for record, employee_name in prepared:
			_, action = _upsert_employee(record, employee_name)
			result[f"employees_{action}"] += 1
		actor = ActorContext(
			user=frappe.session.user or "Administrator",
			roles=frozenset({"System Manager"}),
			role="System Manager",
			branch=None,
			profile=None,
		)
		record_api_audit(
			actor=actor,
			action="hr.employee_master.import",
			target_doctype="Employee",
			idempotency_key=audit_key,
			details={
				"source_hash": result["source_hash"],
				"source_rows": result["source_rows"],
				"created": result["employees_created"],
				"updated": result["employees_updated"],
				"blocked": result["blocked_rows"],
				"conflicts": result["conflicts"],
				"branch_review": result["branch_review_rows"],
				"login_accounts_created": 0,
			},
		)
		frappe.db.commit()
	except Exception:
		frappe.db.rollback()
		raise
	result["completed_at"] = str(now_datetime())
	return result
