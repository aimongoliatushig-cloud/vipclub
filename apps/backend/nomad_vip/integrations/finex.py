import json
from datetime import date, datetime, timedelta

import frappe
import requests
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields
from frappe.utils import flt, getdate, now_datetime


BASE_URL = "https://www.finex.mn/api/v1"
VIP_BRANCHES = ("Nomad", "Neva", "Sapphire", "Monarch")
FINEX_SHIFT_TYPE = "VIP Night Shift"


def ensure_crm_fields():
	create_custom_fields(
		{
			"Customer": [
				{"fieldname": "custom_finex_section", "label": "Finex CRM", "fieldtype": "Section Break", "insert_after": "customer_name"},
				{"fieldname": "custom_finex_client_id", "label": "Finex Client ID", "fieldtype": "Data", "unique": 1, "in_standard_filter": 1, "insert_after": "custom_finex_section"},
				{"fieldname": "custom_finex_phone", "label": "Finex Phone", "fieldtype": "Data", "insert_after": "custom_finex_client_id"},
				{"fieldname": "custom_finex_email", "label": "Finex Email", "fieldtype": "Data", "insert_after": "custom_finex_phone"},
				{"fieldname": "custom_finex_gender", "label": "Finex Gender", "fieldtype": "Select", "options": "Unknown\nMale\nFemale", "insert_after": "custom_finex_email"},
				{"fieldname": "custom_primary_store_id", "label": "Primary Finex Store ID", "fieldtype": "Data", "read_only": 1, "in_standard_filter": 1, "insert_after": "custom_finex_gender"},
				{"fieldname": "custom_primary_branch", "label": "Primary Branch", "fieldtype": "Data", "read_only": 1, "in_standard_filter": 1, "insert_after": "custom_primary_store_id"},
				{"fieldname": "custom_visited_branches", "label": "Visited Branches", "fieldtype": "Small Text", "read_only": 1, "insert_after": "custom_primary_branch"},
				{"fieldname": "custom_visit_count", "label": "Visit Count", "fieldtype": "Int", "read_only": 1, "insert_after": "custom_visited_branches"},
				{"fieldname": "custom_bill_count", "label": "Bill Count", "fieldtype": "Int", "read_only": 1, "insert_after": "custom_visit_count"},
				{"fieldname": "custom_total_spend", "label": "Total Spend", "fieldtype": "Currency", "read_only": 1, "insert_after": "custom_bill_count"},
				{"fieldname": "custom_average_bill", "label": "Average Bill", "fieldtype": "Currency", "read_only": 1, "insert_after": "custom_total_spend"},
				{"fieldname": "custom_first_visit", "label": "First Visit", "fieldtype": "Date", "read_only": 1, "insert_after": "custom_average_bill"},
				{"fieldname": "custom_last_visit", "label": "Last Visit", "fieldtype": "Date", "read_only": 1, "insert_after": "custom_first_visit"},
				{"fieldname": "custom_membership_rank", "label": "VIP Membership Rank", "fieldtype": "Select", "options": "Unassigned\nBronze\nSilver\nGold\nDiamond\nBlack Diamond", "default": "Unassigned", "hidden": 1, "insert_after": "custom_last_visit"},
				{"fieldname": "custom_vip_detail_dashboard", "label": "VIP Customer Detail", "fieldtype": "HTML", "insert_after": "custom_last_visit"},
			],
			"Shift Assignment": [
				{"fieldname": "custom_vip_schedule_source", "label": "VIP Schedule Source", "fieldtype": "Select", "options": "Manual\nFinex", "read_only": 1, "in_standard_filter": 1, "insert_after": "end_date"},
				{"fieldname": "custom_finex_schedule_snapshot", "label": "Finex Schedule Snapshot", "fieldtype": "Link", "options": "VIP Finex Schedule Snapshot", "read_only": 1, "insert_after": "custom_vip_schedule_source"},
				{"fieldname": "custom_finex_synced_at", "label": "Finex Synced At", "fieldtype": "Datetime", "read_only": 1, "insert_after": "custom_finex_schedule_snapshot"},
			],
		},
		update=True,
	)
	ensure_vip_branches()


def ensure_vip_branches():
	for branch_name in VIP_BRANCHES:
		if not frappe.db.exists("Branch", branch_name):
			frappe.get_doc({"doctype": "Branch", "branch": branch_name}).insert(ignore_permissions=True)


def _canonical_branch(store_name):
	value = (store_name or "").strip().lower()
	for branch_name in VIP_BRANCHES:
		if branch_name.lower() in value or value in branch_name.lower():
			return branch_name
	return None


def refresh_customer_branch_profiles():
	ensure_vip_branches()
	customers = frappe.get_all("Customer", filters={"custom_finex_client_id": ["is", "set"]}, pluck="name")
	metrics = frappe.db.sql(
		"""
		select customer, store_id, store_name, count(*) bill_count,
		count(distinct posting_date) visit_count,
		min(posting_date) first_visit, max(posting_date) last_visit,
		sum(case when bill_type = 2 then -total_amount else total_amount end) total_spend
		from `tabVIP POS Bill`
		where customer is not null and is_paid = 1
		group by customer, store_id, store_name
		""",
		as_dict=True,
	)
	by_key = {}
	for row in metrics:
		branch = _canonical_branch(row.store_name)
		if not branch:
			continue
		key = (row.customer, branch)
		current = by_key.setdefault(key, {"bill_count": 0, "visit_count": 0, "total_spend": 0, "first_visit": None, "last_visit": None, "store_ids": set()})
		current["bill_count"] += row.bill_count
		current["visit_count"] += row.visit_count
		current["total_spend"] += flt(row.total_spend)
		current["first_visit"] = min(filter(None, [current["first_visit"], row.first_visit]), default=None)
		current["last_visit"] = max(filter(None, [current["last_visit"], row.last_visit]), default=None)
		if row.store_id:
			current["store_ids"].add(str(row.store_id))

	for customer in customers:
		for branch in VIP_BRANCHES:
			values = by_key.get((customer, branch), {})
			name = frappe.db.get_value("VIP Customer Branch Profile", {"customer": customer, "branch": branch}, "name")
			payload = {
				"finex_store_id": ", ".join(sorted(values.get("store_ids", set()))),
				"visit_count": values.get("visit_count", 0),
				"bill_count": values.get("bill_count", 0),
				"total_spend": values.get("total_spend", 0),
				"average_bill": flt(values.get("total_spend", 0)) / values.get("bill_count", 1) if values.get("bill_count") else 0,
				"first_visit": values.get("first_visit"),
				"last_visit": values.get("last_visit"),
			}
			if name:
				frappe.db.set_value("VIP Customer Branch Profile", name, payload, update_modified=False)
			else:
				frappe.get_doc({"doctype": "VIP Customer Branch Profile", "customer": customer, "branch": branch, "membership_rank": "Unassigned", **payload}).insert(ignore_permissions=True)

	# Keep customer membership ranks aligned with each branch's saved rules
	# whenever Finex metrics are refreshed.
	from nomad_vip.api.admin import recalculate_all_customer_ranks
	recalculate_all_customer_ranks()


class FinexClient:
	def __init__(self):
		self.client_id = frappe.conf.get("finex_client_id")
		self.client_secret = frappe.conf.get("finex_client_secret")
		if not self.client_id or not self.client_secret:
			frappe.throw("Finex credentials are not configured")
		self.session = requests.Session()
		response = self.session.post(
			f"{BASE_URL}/token",
			json={"clientId": self.client_id, "clientSecret": self.client_secret},
			timeout=30,
		)
		response.raise_for_status()
		payload = response.json()
		if not payload.get("ok"):
			frappe.throw(payload.get("error") or "Finex token request failed")
		self.session.headers.update({"Authorization": f"Bearer {payload['data']['accessToken']}"})

	def sales(self, date_from, date_to, limit=2000, offset=0):
		response = self.session.post(
			f"{BASE_URL}/sales",
			json={"dateFrom": date_from.strftime("%Y.%m.%d"), "dateTo": date_to.strftime("%Y.%m.%d"), "includeUnpaid": True, "limit": limit, "offset": offset},
			timeout=120,
		)
		response.raise_for_status()
		payload = response.json()
		if not payload.get("ok"):
			frappe.throw(payload.get("error") or "Finex sales request failed")
		return payload["data"]

	def dancer_schedule(self, date_from, date_to, store_id=None):
		payload = {
			"dateFrom": date_from.strftime("%Y.%m.%d"),
			"dateTo": date_to.strftime("%Y.%m.%d"),
		}
		if store_id not in (None, ""):
			payload["storeId"] = int(store_id)
		response = self.session.post(f"{BASE_URL}/dancerSchedule", json=payload, timeout=120)
		response.raise_for_status()
		body = response.json()
		if not body.get("ok"):
			frappe.throw(body.get("error") or "Finex dancer schedule request failed")
		return body.get("data") or {}


def _gender(value):
	return {1: "Male", 2: "Female"}.get(value, "Unknown")


def _customer_group():
	configured = frappe.db.get_single_value("Selling Settings", "customer_group")
	if configured and not frappe.db.get_value("Customer Group", configured, "is_group"):
		return configured
	return frappe.db.get_value("Customer Group", {"is_group": 0}, "name", order_by="lft asc")


def _territory():
	configured = frappe.db.get_single_value("Selling Settings", "territory")
	if configured and not frappe.db.get_value("Territory", configured, "is_group"):
		return configured
	return frappe.db.get_value("Territory", {"is_group": 0}, "name", order_by="lft asc")


def upsert_customer(source):
	client_id = str(source["clientId"])
	name = frappe.db.get_value("Customer", {"custom_finex_client_id": client_id}, "name")
	values = {
		"custom_finex_phone": source.get("phone"),
		"custom_finex_email": source.get("email"),
		"custom_finex_gender": _gender(source.get("gender")),
	}
	if name:
		frappe.db.set_value("Customer", name, values, update_modified=False)
		return name
	doc = frappe.get_doc(
		{
			"doctype": "Customer",
			"customer_name": source.get("name") or f"Finex Customer {client_id}",
			"customer_type": "Individual",
			"customer_group": _customer_group(),
			"territory": _territory(),
			"custom_finex_client_id": client_id,
			**values,
		}
	)
	doc.flags.ignore_permissions = True
	doc.insert()
	return doc.name


def upsert_bill(source):
	bill_id = str(source["billId"])
	name = frappe.db.get_value("VIP POS Bill", {"finex_bill_id": bill_id}, "name")
	customer_source = source.get("customer")
	customer = upsert_customer(customer_source) if customer_source else None
	values = {
		"bill_code": source.get("billCode"),
		"posting_date": datetime.strptime(source["docdate"], "%Y.%m.%d").date(),
		"store_id": str(source.get("storeId") or ""),
		"store_name": source.get("storeName"),
		"customer": customer,
		"finex_client_id": str(customer_source["clientId"]) if customer_source else None,
		"bill_type": source.get("billType"),
		"is_paid": source.get("isPaid") or 0,
		"open_date": source.get("openDate"),
		"closed_date": source.get("closedDate"),
		"subtotal": flt(source.get("subtotal")),
		"tax_amount": flt(source.get("taxAmount")),
		"discount_amount": flt(source.get("discountAmount")),
		"total_amount": flt(source.get("totalAmount")),
		"raw_payload": json.dumps(source, ensure_ascii=False, separators=(",", ":")),
		"last_synced_at": now_datetime(),
	}
	if name:
		doc = frappe.get_doc("VIP POS Bill", name)
		doc.update(values)
		doc.flags.ignore_permissions = True
		doc.save()
		return False
	doc = frappe.get_doc({"doctype": "VIP POS Bill", "finex_bill_id": bill_id, **values})
	doc.flags.ignore_permissions = True
	doc.insert()
	return True


def refresh_customer_metrics():
	rows = frappe.db.sql(
		"""
		select customer, count(*) bill_count,
		count(distinct concat(posting_date, ':', store_id)) visit_count,
		min(posting_date) first_visit, max(posting_date) last_visit,
		sum(case when bill_type = 2 then -total_amount else total_amount end) total_spend
		from `tabVIP POS Bill`
		where customer is not null and is_paid = 1
		group by customer
		""",
		as_dict=True,
	)
	for row in rows:
		frappe.db.set_value(
			"Customer",
			row.customer,
			{
				"custom_visit_count": row.visit_count,
				"custom_bill_count": row.bill_count,
				"custom_total_spend": row.total_spend,
				"custom_average_bill": flt(row.total_spend) / row.bill_count if row.bill_count else 0,
				"custom_first_visit": row.first_visit,
				"custom_last_visit": row.last_visit,
			},
			update_modified=False,
		)
	branch_rows = frappe.db.sql(
		"""
		select customer, store_id, store_name, count(*) bill_count, max(posting_date) last_visit
		from `tabVIP POS Bill`
		where customer is not null and is_paid = 1
		group by customer, store_id, store_name
		order by customer, bill_count desc, last_visit desc
		""",
		as_dict=True,
	)
	by_customer = {}
	for row in branch_rows:
		by_customer.setdefault(row.customer, []).append(row)
	for customer, branches in by_customer.items():
		primary = branches[0]
		frappe.db.set_value(
			"Customer",
			customer,
			{
				"custom_primary_store_id": primary.store_id,
				"custom_primary_branch": primary.store_name,
				"custom_visited_branches": ", ".join(dict.fromkeys(branch.store_name for branch in branches if branch.store_name)),
			},
			update_modified=False,
		)
	refresh_customer_branch_profiles()
	frappe.db.commit()


def sync_range(date_from, date_to):
	ensure_crm_fields()
	client = FinexClient()
	created = updated = fetched = 0
	offset = 0
	while True:
		data = client.sales(date_from, date_to, offset=offset)
		for sale in data.get("sales", []):
			fetched += 1
			if upsert_bill(sale):
				created += 1
			else:
				updated += 1
		if data.get("count", 0) == 0 or offset + data.get("count", 0) >= data.get("total", 0):
			break
		offset += data["count"]
		frappe.db.commit()
	frappe.db.commit()
	return {"fetched": fetched, "created": created, "updated": updated}


@frappe.whitelist()
def sync_all_sales(start_year=2015):
	start = date(int(start_year), 1, 1)
	today = date.today()
	totals = {"fetched": 0, "created": 0, "updated": 0, "periods": 0}
	while start <= today:
		end = min(start + timedelta(days=364), today)
		result = sync_range(start, end)
		for key in ("fetched", "created", "updated"):
			totals[key] += result[key]
		totals["periods"] += 1
		start = end + timedelta(days=1)
	refresh_customer_metrics()
	from nomad_vip.api.cashback import sync_customer_cashback_range
	sync_customer_cashback_range(date(int(start_year), 1, 1), today)
	return totals


def sync_recent_sales():
	today = date.today()
	date_from = today - timedelta(days=7)
	result = sync_range(date_from, today)
	refresh_customer_metrics()
	from nomad_vip.api.cashback import sync_customer_cashback_range
	result["cashback"] = sync_customer_cashback_range(date_from, today)
	from nomad_vip.api.entertainer_roster import reconcile_finex_entertainer_candidates
	result["entertainer_candidates"] = reconcile_finex_entertainer_candidates()
	return result


def _schedule_dancer_key(dancer):
	for field in ("dancerId", "sid", "code"):
		value = dancer.get(field)
		if value not in (None, ""):
			return str(value).strip()
	return None


def _schedule_candidate(dancer, branch, synced_at):
	key = _schedule_dancer_key(dancer)
	if not key or not branch:
		return None, False
	name = frappe.db.get_value("VIP Finex Entertainer Candidate", {"finex_dancer_id": key}, "name")
	values = {
		"dancer_name": str(dancer.get("name") or "").strip(),
		"dancer_nickname": str(dancer.get("nickname") or "").strip(),
		"last_synced_at": synced_at,
		"suggested_classification": "Staff" if dancer.get("dancerType") == 2 else "Entertainer",
	}
	if name:
		existing = frappe.get_doc("VIP Finex Entertainer Candidate", name)
		if existing.review_status == "Pending":
			values["inferred_branch"] = branch
		frappe.db.set_value("VIP Finex Entertainer Candidate", name, values, update_modified=False)
		return frappe.get_doc("VIP Finex Entertainer Candidate", name), False
	doc = frappe.get_doc({
		"doctype": "VIP Finex Entertainer Candidate",
		"finex_dancer_id": key,
		"review_status": "Pending",
		"inferred_branch": branch,
		**values,
	}).insert(ignore_permissions=True)
	return doc, True


def _confirmed_schedule_profile(candidate, branch):
	if candidate.review_status != "Entertainer" or not candidate.linked_profile:
		return None
	profile = frappe.db.get_value(
		"VIP Entertainer Profile",
		candidate.linked_profile,
		["name", "employee", "branch", "active", "lifecycle_status"],
		as_dict=True,
	)
	if not profile or not profile.employee or not profile.active:
		return None
	if profile.lifecycle_status not in (None, "", "Active", "On Leave"):
		return None
	if profile.branch != branch or candidate.inferred_branch != branch:
		return None
	# Finex is authoritative only for confirmed entertainer schedules. A manager
	# who happens to be linked to a legacy performer record still keeps a manual
	# ERPNext schedule and must never receive a Finex Shift Assignment.
	user_id = frappe.db.get_value("Employee", profile.employee, "user_id")
	if user_id and "Branch Manager" in frappe.get_roles(user_id):
		return None
	return profile


def _upsert_schedule_snapshot(candidate, profile, branch, store, dancer, work_date, item, synced_at):
	filters = {"finex_dancer_id": candidate.finex_dancer_id, "work_date": work_date}
	existing = frappe.db.get_value("VIP Finex Schedule Snapshot", filters, ["name", "employee"], as_dict=True)
	name = existing.name if existing else None
	values = {
		"candidate": candidate.name,
		"linked_profile": profile.name if profile else None,
		"employee": profile.employee if profile else None,
		"branch": branch,
		"scheduled": 1 if item.get("scheduled") else 0,
		"attendance_type": item.get("attendanceType") or 0,
		"attendance_name": item.get("attendanceName"),
		"dancer_status": dancer.get("status") or 0,
		"dancer_status_name": dancer.get("statusName"),
		"store_id": str(store.get("storeId") or ""),
		"store_name": store.get("name"),
		"source_synced_at": synced_at,
	}
	if name:
		frappe.db.set_value("VIP Finex Schedule Snapshot", name, values, update_modified=False)
		return name, False, existing.employee
	doc = frappe.get_doc({
		"doctype": "VIP Finex Schedule Snapshot",
		"finex_dancer_id": candidate.finex_dancer_id,
		"work_date": work_date,
		**values,
	}).insert(ignore_permissions=True)
	return doc.name, True, None


def _active_shift_assignment(employee, work_date):
	rows = frappe.db.sql(
		"""
		select name, employee, shift_type, start_date, end_date, status, docstatus,
			custom_vip_schedule_source, custom_finex_schedule_snapshot, custom_finex_synced_at
		from `tabShift Assignment`
		where employee = %(employee)s
			and docstatus = 1
			and status = 'Active'
			and start_date <= %(work_date)s
			and (end_date is null or end_date >= %(work_date)s)
		order by start_date desc, creation desc
		limit 1
		""",
		{"employee": employee, "work_date": getdate(work_date)},
		as_dict=True,
	)
	return rows[0] if rows else None


def _cancel_finex_assignment(employee, work_date, snapshot_name):
	current = _active_shift_assignment(employee, work_date)
	if not current or current.custom_vip_schedule_source != "Finex":
		return "manual_override" if current else "unchanged"
	if current.custom_finex_schedule_snapshot and current.custom_finex_schedule_snapshot != snapshot_name:
		return "manual_override"
	if getdate(work_date) < getdate(date.today()):
		return "locked"
	if frappe.db.exists("VIP Daily Readiness Check", {"shift_assignment": current.name}):
		return "locked"
	doc = frappe.get_doc("Shift Assignment", current.name)
	doc.flags.ignore_permissions = True
	doc.cancel()
	return "cancelled"


def _sync_finex_shift_assignment(profile, work_date, item, snapshot_name, synced_at):
	"""Mirror one confirmed Finex dancerSchedule day into ERPNext idempotently."""
	if not profile or not profile.employee:
		return "unlinked"
	# Finex is authoritative for the dancer's schedule, but it must not silently
	# reactivate an Employee master record that HR has explicitly made inactive.
	# Keep that mismatch visible to reconciliation and continue syncing everyone
	# else instead of aborting the whole schedule import.
	if frappe.db.get_value("Employee", profile.employee, "status") != "Active":
		return "inactive_employee"
	work_date = getdate(work_date)
	current = _active_shift_assignment(profile.employee, work_date)
	if not item.get("scheduled"):
		return _cancel_finex_assignment(profile.employee, work_date, snapshot_name)
	if current:
		if current.custom_vip_schedule_source != "Finex":
			return "manual_override"
		frappe.db.set_value(
			"Shift Assignment",
			current.name,
			{
				"custom_finex_schedule_snapshot": snapshot_name,
				"custom_finex_synced_at": synced_at,
			},
			update_modified=False,
		)
		return "unchanged"
	if not frappe.db.exists("Shift Type", FINEX_SHIFT_TYPE):
		frappe.throw(f"Required Finex shift type is missing: {FINEX_SHIFT_TYPE}")
	doc = frappe.get_doc({
		"doctype": "Shift Assignment",
		"employee": profile.employee,
		"shift_type": FINEX_SHIFT_TYPE,
		"start_date": work_date,
		"end_date": work_date,
		"status": "Active",
		"custom_vip_schedule_source": "Finex",
		"custom_finex_schedule_snapshot": snapshot_name,
		"custom_finex_synced_at": synced_at,
	}).insert(ignore_permissions=True)
	doc.flags.ignore_permissions = True
	doc.submit()
	return "created"


def set_finex_schedule_snapshot_link(candidate_name, profile=None):
	"""Attach reviewed evidence and immediately reconcile its ERPNext shifts."""
	if not frappe.db.exists("DocType", "VIP Finex Schedule Snapshot"):
		return 0
	rows = frappe.get_all(
		"VIP Finex Schedule Snapshot",
		filters={"candidate": candidate_name},
		fields=["name", "employee", "work_date", "scheduled", "source_synced_at"],
		ignore_permissions=True,
	)
	values = {
		"linked_profile": profile.name if profile else None,
		"employee": profile.employee if profile else None,
	}
	for row in rows:
		if row.employee and (not profile or row.employee != profile.employee):
			_cancel_finex_assignment(row.employee, row.work_date, row.name)
		frappe.db.set_value("VIP Finex Schedule Snapshot", row.name, values, update_modified=False)
		if profile:
			_sync_finex_shift_assignment(
				profile,
				row.work_date,
				{"scheduled": bool(row.scheduled)},
				row.name,
				row.source_synced_at or now_datetime(),
			)
	return len(rows)


def sync_dancer_schedule_range(date_from, date_to, store_id=None):
	date_from = getdate(date_from)
	date_to = getdate(date_to)
	if date_to < date_from:
		frappe.throw("Finex schedule end date cannot be before start date")
	if (date_to - date_from).days > 61:
		frappe.throw("Finex schedule range cannot exceed 62 days")
	data = FinexClient().dancer_schedule(date_from, date_to, store_id=store_id)
	response_store = data.get("store") or {}
	synced_at = now_datetime()
	dancers = data.get("dancers") or []
	dancer_by_key = {key: dancer for dancer in dancers if (key := _schedule_dancer_key(dancer))}
	items_by_key = {key: [] for key in dancer_by_key}
	for day in data.get("days") or []:
		work_date = getdate(day.get("date"))
		for item in day.get("items") or []:
			key = str(item.get("dancerId") or "").strip()
			if key in items_by_key:
				items_by_key[key].append((work_date, item))
	result = {
		"branches": [],
		"window": {"from": date_from, "to": date_to},
		"dancers": len(dancers),
		"candidates_created": 0,
		"linked_profiles": 0,
		"skipped_unlinked": 0,
		"snapshots_created": 0,
		"snapshots_updated": 0,
		"assignments_created": 0,
		"assignments_cancelled": 0,
		"assignments_unchanged": 0,
		"assignments_manual_override": 0,
		"assignments_locked": 0,
		"assignments_inactive_employee": 0,
	}
	seen_branches = set()
	for key, dancer in dancer_by_key.items():
		branch = _canonical_branch(dancer.get("storeName") or response_store.get("name"))
		if not branch:
			result["skipped_unlinked"] += 1
			continue
		seen_branches.add(branch)
		candidate, created = _schedule_candidate(dancer, branch, synced_at)
		if not candidate:
			continue
		result["candidates_created"] += int(created)
		profile = _confirmed_schedule_profile(candidate, branch)
		if not profile:
			result["skipped_unlinked"] += 1
		else:
			result["linked_profiles"] += 1
		dancer_store = {
			"storeId": dancer.get("storeId") or response_store.get("storeId"),
			"name": dancer.get("storeName") or response_store.get("name"),
		}
		seen_dates = set()
		for work_date, item in items_by_key.get(key, []):
			seen_dates.add(work_date)
			snapshot_name, created, previous_employee = _upsert_schedule_snapshot(candidate, profile, branch, dancer_store, dancer, work_date, item, synced_at)
			if created:
				result["snapshots_created"] += 1
			else:
				result["snapshots_updated"] += 1
			if profile:
				action = _sync_finex_shift_assignment(profile, work_date, item, snapshot_name, synced_at)
			elif previous_employee:
				action = _cancel_finex_assignment(previous_employee, work_date, snapshot_name)
			else:
				action = "unlinked"
			if action in {"created", "cancelled", "unchanged", "manual_override", "locked", "inactive_employee"}:
				result[f"assignments_{action}"] += 1
		stale = frappe.get_all(
			"VIP Finex Schedule Snapshot",
			filters={
				"finex_dancer_id": candidate.finex_dancer_id,
				"work_date": ["between", [date_from, date_to]],
			},
			fields=["name", "work_date"],
			ignore_permissions=True,
		)
		for row in stale:
			if getdate(row.work_date) not in seen_dates:
				if profile:
					action = _cancel_finex_assignment(profile.employee, row.work_date, row.name)
					if action in {"cancelled", "unchanged", "manual_override", "locked"}:
						result[f"assignments_{action}"] += 1
					if action == "locked":
						continue
				frappe.delete_doc("VIP Finex Schedule Snapshot", row.name, ignore_permissions=True, force=True)
	result["branches"] = sorted(seen_branches)
	frappe.db.commit()
	return result


@frappe.whitelist()
def sync_recent_dancer_schedule(days_back=7, days_forward=55, store_id=None):
	user = getattr(getattr(frappe, "session", None), "user", "Guest")
	roles = set(frappe.get_roles()) if getattr(frappe, "session", None) else set()
	if user != "Administrator" and not roles.intersection({"System Manager", "VIP Admin", "HR Manager"}):
		frappe.throw("Finex schedule sync permission denied", frappe.PermissionError)
	today = date.today()
	start = today - timedelta(days=max(0, int(days_back or 0)))
	end = today + timedelta(days=max(0, int(days_forward or 0)))
	if (end - start).days > 61:
		end = start + timedelta(days=61)
	return sync_dancer_schedule_range(start, end, store_id=store_id)


def import_statistics():
	return frappe.db.sql(
		"""
		select count(*) bills,
		count(distinct customer) linked_customers,
		sum(case when customer is not null then 1 else 0 end) linked_bills,
		sum(case when customer is null then 1 else 0 end) unlinked_bills,
		min(posting_date) first_date, max(posting_date) last_date,
		sum(case when is_paid = 1 and bill_type = 2 then -total_amount
		         when is_paid = 1 then total_amount else 0 end) paid_net_total,
		sum(case when is_paid = 0 then 1 else 0 end) unpaid_bills
		from `tabVIP POS Bill`
		""",
		as_dict=True,
	)[0]


def branch_profile_statistics():
	return {
		"branches": frappe.get_all("Branch", filters={"name": ["in", VIP_BRANCHES]}, pluck="name"),
		"profiles": frappe.db.count("VIP Customer Branch Profile"),
		"by_branch": frappe.db.sql(
			"""select branch, count(*) profiles, sum(visit_count) visits, sum(bill_count) bills,
			sum(total_spend) total_spend from `tabVIP Customer Branch Profile` group by branch order by branch""",
			as_dict=True,
		),
	}
