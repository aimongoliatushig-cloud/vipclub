import hashlib
import json

import frappe
from frappe import _
from frappe.utils import flt, get_datetime, now_datetime

from nomad_vip.integrations.finex import _canonical_branch
from nomad_vip.services import get_branch_for_user, require_any_role


RANK_CASHBACK_RATES = {
	"Unassigned": 0,
	"Bronze": 2,
	"Silver": 4,
	"Gold": 6,
	"Diamond": 8,
	"Black Diamond": 10,
}

FIRST_PAID_SALE_POLICY = "first-paid-sale-no-cashback-v1"


def _normalized(value):
	return " ".join((value or "").strip().lower().split())


def _is_tax(name):
	value = _normalized(name)
	return value == "tax" or "татвар" in value


def _is_vip_room(name):
	value = _normalized(name)
	return "room" in value or "өрөө" in value or "vip өрөө" in value


def _bill_component_lines(bill):
	try:
		payload = json.loads(bill.raw_payload or "{}")
	except (TypeError, ValueError):
		payload = {}
	lines = {"Tax": [], "VIP Room": []}
	for item in payload.get("items") or []:
		amount = abs(flt(item.get("total")))
		name = item.get("menuName") or ""
		category = None
		if _is_tax(name):
			category = "Tax"
		elif _is_vip_room(name):
			category = "VIP Room"
		if category and amount:
			quantity = max(1, flt(item.get("quantity")))
			unit_price = abs(flt(item.get("price"))) or amount / quantity
			lines[category].append({
				"name": name.strip() or category,
				"quantity": quantity,
				"unit_price": round(unit_price),
				"total": round(amount),
			})
	if not lines["Tax"] and abs(flt(bill.tax_amount)):
		lines["Tax"].append({
			"name": "Tax",
			"quantity": 1,
			"unit_price": round(abs(flt(bill.tax_amount))),
			"total": round(abs(flt(bill.tax_amount))),
		})
	return lines


def _bill_components(bill):
	lines = _bill_component_lines(bill)
	return {
		category: round(sum(flt(line["total"]) for line in category_lines))
		for category, category_lines in lines.items()
	}


def _wallet_balance(customer):
	return flt(frappe.db.sql(
		"select coalesce(sum(points), 0) from `tabVIP Customer Point Ledger` where customer = %s",
		(customer,),
	)[0][0])


def _rank_for_bill(customer, branch):
	rank = frappe.db.get_value(
		"VIP Customer Branch Profile",
		{"customer": customer, "branch": branch},
		"membership_rank",
	)
	return rank if rank in RANK_CASHBACK_RATES else "Unassigned"


def _signature(bill, eligible_amount, policy_marker=None):
	values = [
		bill.name, bill.customer, bill.is_paid, bill.bill_type, bill.total_amount,
		bill.tax_amount, eligible_amount,
	]
	if policy_marker:
		values.append(policy_marker)
	payload = "|".join(str(value or "") for value in values)
	return hashlib.sha256(payload.encode()).hexdigest()


def _bill_order_key(bill):
	event_time = bill.get("closed_date") or bill.get("open_date") or bill.get("posting_date")
	return (str(event_time or ""), str(bill.get("creation") or ""), str(bill.get("name") or ""))


def _cashback_context(customers):
	customers = sorted({customer for customer in customers if customer})
	context = {"histories": {}, "profiles": {}, "rules": {}}
	if not customers:
		return context

	for row in frappe.get_all(
		"VIP POS Bill",
		filters={"customer": ["in", customers], "is_paid": 1, "bill_type": ["!=", 2]},
		fields=[
			"name", "customer", "store_name", "posting_date", "open_date", "closed_date",
			"creation", "total_amount",
		],
		order_by="posting_date asc, creation asc, name asc",
		limit_page_length=0,
		ignore_permissions=True,
	):
		branch = _canonical_branch(row.store_name)
		if branch:
			context["histories"].setdefault((row.customer, branch), []).append(row)

	for key, rows in context["histories"].items():
		rows.sort(key=_bill_order_key)
		context["histories"][key] = {
			"rows": rows,
			"positions": {row.name: index for index, row in enumerate(rows)},
		}

	for profile in frappe.get_all(
		"VIP Customer Branch Profile",
		filters={"customer": ["in", customers]},
		fields=["customer", "branch", "manual_rank", "rank_override_at"],
		limit_page_length=0,
		ignore_permissions=True,
	):
		context["profiles"][(profile.customer, profile.branch)] = profile
	return context


def _automatic_rank_before_bill(branch, average_bill, context):
	if branch not in context["rules"]:
		context["rules"][branch] = frappe.get_all(
			"VIP Customer Rank Rule",
			filters={"branch": branch, "active": 1},
			fields=["membership_rank", "rank_order", "minimum_average_bill"],
			order_by="rank_order desc",
			limit_page_length=0,
			ignore_permissions=True,
		)
	for rule in context["rules"][branch]:
		if flt(average_bill) >= flt(rule.minimum_average_bill):
			return rule.membership_rank
	return "Unassigned"


def _paid_sale_context(bill, branch, context):
	history = context["histories"].get((bill.customer, branch))
	if not history or bill.name not in history["positions"]:
		return {"sale_number": None, "rank_before": _rank_for_bill(bill.customer, branch)}

	position = history["positions"][bill.name]
	sale_number = position + 1
	if position == 0:
		return {"sale_number": sale_number, "rank_before": "Unassigned"}

	profile = context["profiles"].get((bill.customer, branch))
	manual_rank = (profile or {}).get("manual_rank")
	if manual_rank in RANK_CASHBACK_RATES:
		override_at = (profile or {}).get("rank_override_at")
		bill_time = bill.get("closed_date") or bill.get("open_date") or bill.get("posting_date")
		if not override_at or not bill_time or get_datetime(override_at) <= get_datetime(bill_time):
			return {"sale_number": sale_number, "rank_before": manual_rank}

	previous_sales = history["rows"][:position]
	average_bill = sum(abs(flt(row.total_amount)) for row in previous_sales) / len(previous_sales)
	return {
		"sale_number": sale_number,
		"rank_before": _automatic_rank_before_bill(branch, average_bill, context),
	}


def sync_bill_cashback(bill_name, context=None):
	if not frappe.db.exists("DocType", "VIP Customer Point Ledger"):
		return None
	bill = frappe.get_doc("VIP POS Bill", bill_name)
	if not bill.customer:
		return None
	branch = _canonical_branch(bill.store_name)
	if not branch:
		return None
	context = context or _cashback_context([bill.customer])
	paid_sale = _paid_sale_context(bill, branch, context)
	is_first_paid_sale = paid_sale["sale_number"] == 1

	existing = frappe.get_all(
		"VIP Customer Point Ledger",
		filters={"vip_pos_bill": bill.name, "transaction_type": ["in", ["Earn", "Earn Adjustment"]]},
		fields=["name", "points", "membership_rank", "cashback_percent", "source_signature"],
		order_by="posted_at asc",
		limit_page_length=0,
	)
	current_points = round(sum(flt(row.points) for row in existing))
	components = _bill_components(bill)
	eligible_spend = max(0, round(abs(flt(bill.total_amount)) - components["Tax"]))
	signature = _signature(
		bill,
		eligible_spend,
		FIRST_PAID_SALE_POLICY if is_first_paid_sale else None,
	)
	if existing and existing[-1].source_signature == signature:
		return existing[-1].name

	rank = existing[0].membership_rank if existing else paid_sale["rank_before"]
	rate = flt(existing[0].cashback_percent) if existing else flt(RANK_CASHBACK_RATES.get(rank, 0))
	desired_points = 0
	if bill.is_paid and not is_first_paid_sale:
		desired_points = round(eligible_spend * rate / 100)
		if int(bill.bill_type or 0) == 2:
			desired_points *= -1
	delta = desired_points - current_points
	if not delta:
		return existing[-1].name if existing else None

	deduplication_key = hashlib.sha256(
		f"cashback:{bill.name}:{current_points}:{desired_points}:{signature}".encode()
	).hexdigest()
	if frappe.db.exists("VIP Customer Point Ledger", {"deduplication_key": deduplication_key}):
		return frappe.db.get_value("VIP Customer Point Ledger", {"deduplication_key": deduplication_key}, "name")
	row = frappe.get_doc({
		"doctype": "VIP Customer Point Ledger",
		"customer": bill.customer,
		"transaction_type": "Earn" if not existing and delta > 0 else "Earn Adjustment",
		"points": delta,
		"branch": branch,
		"membership_rank": rank,
		"cashback_percent": rate,
		"eligible_amount": eligible_spend,
		"vip_pos_bill": bill.name,
		"bill_code": bill.bill_code,
		"source_signature": signature,
		"deduplication_key": deduplication_key,
		"posted_by": "Administrator",
		"posted_at": now_datetime(),
		"note": _("Төлөгдсөн баримтаас автоматаар нэмэгдсэн оноо"),
	}).insert(ignore_permissions=True)
	return row.name


def sync_customer_cashback_range(date_from=None, date_to=None):
	if not frappe.db.exists("DocType", "VIP Customer Point Ledger"):
		return {"processed": 0, "posted": 0}
	filters = {"customer": ["is", "set"]}
	if date_from and date_to:
		filters["posting_date"] = ["between", [date_from, date_to]]
	bill_rows = frappe.get_all(
		"VIP POS Bill",
		filters=filters,
		fields=["name", "customer"],
		order_by="posting_date asc, creation asc, name asc",
		limit_page_length=0,
	)
	context = _cashback_context(row.customer for row in bill_rows)
	posted = 0
	for bill in bill_rows:
		before = frappe.db.count("VIP Customer Point Ledger")
		sync_bill_cashback(bill.name, context=context)
		posted += max(0, frappe.db.count("VIP Customer Point Ledger") - before)
	frappe.db.commit()
	return {"processed": len(bill_rows), "posted": posted}


def cashback_policy_audit():
	"""Return a read-only summary of first-payment cashback compliance."""
	customers = frappe.get_all(
		"VIP POS Bill",
		filters={"customer": ["is", "set"], "is_paid": 1, "bill_type": ["!=", 2]},
		pluck="customer",
		distinct=True,
		limit_page_length=0,
	)
	context = _cashback_context(customers)
	first_bill_names = [history["rows"][0].name for history in context["histories"].values() if history["rows"]]
	ledger_rows = frappe.get_all(
		"VIP Customer Point Ledger",
		filters={
			"vip_pos_bill": ["in", first_bill_names],
			"transaction_type": ["in", ["Earn", "Earn Adjustment"]],
		},
		fields=["vip_pos_bill", "points"],
		limit_page_length=0,
		ignore_permissions=True,
	) if first_bill_names else []
	net_by_bill = {}
	for row in ledger_rows:
		net_by_bill[row.vip_pos_bill] = net_by_bill.get(row.vip_pos_bill, 0) + flt(row.points)
	return {
		"policy": FIRST_PAID_SALE_POLICY,
		"customer_branch_histories": len(context["histories"]),
		"paid_sales": sum(len(history["rows"]) for history in context["histories"].values()),
		"first_payments": len(first_bill_names),
		"eligible_payments_from_second": sum(max(0, len(history["rows"]) - 1) for history in context["histories"].values()),
		"first_payments_with_nonzero_cashback": sum(1 for points in net_by_bill.values() if round(points) != 0),
		"first_payment_net_points": round(sum(net_by_bill.values())),
	}


def reconcile_first_payment_cashback():
	"""Post audited adjustments only for first payments that already earned points."""
	before = cashback_policy_audit()
	if not before["first_payments_with_nonzero_cashback"]:
		return {"adjustments_posted": 0, "before": before, "after": before}

	customers = frappe.get_all(
		"VIP Customer Point Ledger",
		filters={"transaction_type": ["in", ["Earn", "Earn Adjustment"]]},
		pluck="customer",
		distinct=True,
		limit_page_length=0,
	)
	context = _cashback_context(customers)
	first_bill_names = [history["rows"][0].name for history in context["histories"].values() if history["rows"]]
	rows_before = frappe.db.count("VIP Customer Point Ledger")
	for bill_name in first_bill_names:
		sync_bill_cashback(bill_name, context=context)
	frappe.db.commit()
	after = cashback_policy_audit()
	return {
		"adjustments_posted": max(0, frappe.db.count("VIP Customer Point Ledger") - rows_before),
		"before": before,
		"after": after,
	}


def _redeemed_for_bill(bill_name, category):
	value = frappe.db.sql(
		"""select coalesce(sum(-points), 0) from `tabVIP Customer Point Ledger`
		where vip_pos_bill = %s and transaction_type = 'Redeem' and redemption_category = %s""",
		(bill_name, category),
	)[0][0]
	return flt(value)


def get_customer_wallet(customer, branch=None):
	if not frappe.db.exists("DocType", "VIP Customer Point Ledger"):
		return {"balance": 0, "earned_total": 0, "redeemed_total": 0, "cashback_rate": 0, "rank": "Unassigned", "rates": RANK_CASHBACK_RATES, "transactions": [], "eligible_bills": []}
	transaction_filters = {"customer": customer}
	if branch:
		# The wallet balance is global, but branch staff must never receive
		# another branch's bill references or redemption history.
		transaction_filters["branch"] = branch
	rows = frappe.get_all(
		"VIP Customer Point Ledger",
		filters=transaction_filters,
		fields=["name", "transaction_type", "points", "branch", "membership_rank", "cashback_percent", "vip_pos_bill", "bill_code", "redemption_category", "posted_by", "posted_at", "note"],
		order_by="posted_at desc",
		limit_page_length=12,
		ignore_permissions=True,
	)
	balance = _wallet_balance(customer)
	totals = frappe.db.sql(
		"""select
		coalesce(sum(case when transaction_type in ('Earn', 'Earn Adjustment') then points else 0 end), 0) earned_total,
		coalesce(sum(case when transaction_type = 'Redeem' then -points else 0 end), 0) redeemed_total
		from `tabVIP Customer Point Ledger` where customer = %s""",
		(customer,), as_dict=True,
	)[0]
	earned_total = flt(totals.earned_total)
	redeemed_total = flt(totals.redeemed_total)
	rank = _rank_for_bill(customer, branch) if branch else "Unassigned"
	eligible_bills = []
	if branch:
		for bill in frappe.get_all(
			"VIP POS Bill",
			filters={"customer": customer, "bill_type": ["!=", 2], "store_name": ["like", f"%{branch}%"]},
			fields=["name", "bill_code", "posting_date", "store_name", "is_paid", "tax_amount", "total_amount", "raw_payload"],
			order_by="posting_date desc, creation desc",
			limit_page_length=30,
			ignore_permissions=True,
		):
			component_lines = _bill_component_lines(bill)
			components = {
				category: round(sum(flt(line["total"]) for line in lines))
				for category, lines in component_lines.items()
			}
			remaining = {category: max(0, amount - _redeemed_for_bill(bill.name, category)) for category, amount in components.items()}
			if any(remaining.values()):
				eligible_bills.append({
					"name": bill.name,
					"bill_code": bill.bill_code,
					"posting_date": bill.posting_date,
					"store_name": bill.store_name,
					"is_paid": bill.is_paid,
					"eligible": components,
					"remaining": remaining,
					"options": component_lines,
				})
	return {
		"balance": balance,
		"earned_total": earned_total,
		"redeemed_total": redeemed_total,
		"cashback_rate": RANK_CASHBACK_RATES.get(rank, 0),
		"rank": rank,
		"rates": RANK_CASHBACK_RATES,
		"transactions": rows,
		"eligible_bills": eligible_bills,
	}


@frappe.whitelist(methods=["POST"])
def redeem_customer_points(customer, vip_pos_bill, category, points, note=None, manager_unavailable_reason=None):
	require_any_role("Branch Manager", "Operation")
	roles = set(frappe.get_roles())
	is_manager = "Branch Manager" in roles
	is_operation_fallback = "Operation" in roles and not is_manager
	if is_operation_fallback and not (manager_unavailable_reason or "").strip():
		frappe.throw(_("Operation approval requires the reason why the branch manager is unavailable"))
	if category not in ("Tax", "VIP Room"):
		frappe.throw(_("Points may only be used for Tax or VIP Room"))
	amount = flt(points)
	if amount <= 0 or abs(amount - round(amount)) > 0.001:
		frappe.throw(_("Enter a positive whole point amount"))
	amount = round(amount)

	frappe.db.sql("select name from `tabCustomer` where name = %s for update", (customer,))
	bill = frappe.get_doc("VIP POS Bill", vip_pos_bill)
	if bill.customer != customer or int(bill.bill_type or 0) == 2:
		frappe.throw(_("Select a valid bill belonging to this customer"))
	branch = _canonical_branch(bill.store_name)
	if not branch:
		frappe.throw(_("The selected bill is not mapped to a VIP branch"))
	user_branch = get_branch_for_user()
	if is_manager and not user_branch:
		frappe.throw(_("Your manager account is not assigned to a branch"), frappe.PermissionError)
	if is_manager and branch != user_branch:
		frappe.throw(_("You cannot redeem points against another branch's bill"), frappe.PermissionError)
	available_points = _wallet_balance(customer)
	if amount > available_points:
		frappe.throw(_("The customer does not have enough points"))
	components = _bill_components(bill)
	remaining = max(0, components[category] - _redeemed_for_bill(bill.name, category))
	if amount > remaining:
		frappe.throw(_("The point amount is higher than the remaining {0} charge").format(category))

	deduplication_key = hashlib.sha256(
		f"redeem:{customer}:{bill.name}:{category}:{amount}:{frappe.generate_hash(length=16)}".encode()
	).hexdigest()
	frappe.get_doc({
		"doctype": "VIP Customer Point Ledger",
		"customer": customer,
		"transaction_type": "Redeem",
		"points": -amount,
		"branch": branch,
		"membership_rank": _rank_for_bill(customer, branch),
		"cashback_percent": RANK_CASHBACK_RATES.get(_rank_for_bill(customer, branch), 0),
		"eligible_amount": components[category],
		"vip_pos_bill": bill.name,
		"bill_code": bill.bill_code,
		"redemption_category": category,
		"deduplication_key": deduplication_key,
		"posted_by": frappe.session.user,
		"posted_at": now_datetime(),
		"approval_role": "Operation" if is_operation_fallback else "Branch Manager",
		"manager_unavailable_reason": (manager_unavailable_reason or "").strip(),
		"note": (note or "").strip() or _("Approved point redemption"),
	}).insert(ignore_permissions=True)
	frappe.db.commit()
	from nomad_vip.api.customer import get_customer_detail
	return get_customer_detail(customer, branch)
