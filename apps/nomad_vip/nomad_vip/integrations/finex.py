import json
from datetime import date, datetime, timedelta

import frappe
import requests
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields
from frappe.utils import flt, now_datetime


BASE_URL = "https://www.finex.mn/api/v1"
VIP_BRANCHES = ("Nomad", "Neva", "Sapphire", "Monarch")


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
			]
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
