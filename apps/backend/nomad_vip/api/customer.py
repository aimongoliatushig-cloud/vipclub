import json
import re
from collections import defaultdict

import frappe
from frappe import _
from frappe.utils import cint, flt, get_datetime, now_datetime


def _phone_digits(value):
	return re.sub(r"\D", "", value or "")[-8:]


def _normalized_menu_name(value):
	return " ".join((value or "").strip().lower().split())


def _is_hour_service(value):
	name = _normalized_menu_name(value)
	return "table service" in name or "ширээний үйлчилгээ" in name


def _is_room_service(value):
	name = _normalized_menu_name(value)
	return "room" in name or "өрөө" in name


def _duration_minutes(open_date, closed_date):
	if not open_date or not closed_date:
		return 0
	try:
		return max(0, int((get_datetime(closed_date) - get_datetime(open_date)).total_seconds() // 60))
	except (TypeError, ValueError):
		return 0


def _find_customer_by_phone(phone):
	digits = _phone_digits(phone)
	if len(digits) < 8:
		return None
	rows = frappe.db.sql(
		"""select name from `tabCustomer`
		where replace(replace(replace(replace(ifnull(custom_finex_phone, ''), ' ', ''), '-', ''), '(', ''), ')', '') like %s
		or replace(replace(replace(replace(ifnull(mobile_no, ''), ' ', ''), '-', ''), '(', ''), ')', '') like %s
		limit 1""",
		(f"%{digits}", f"%{digits}"),
	)
	return rows[0][0] if rows else None


def _reception_branch():
	roles = set(frappe.get_roles())
	if frappe.session.user == "Administrator" or roles.intersection({"System Manager", "CEO"}):
		return None
	if not roles.intersection({"Reception", "Branch Manager"}):
		frappe.throw(_("You are not allowed to use VIP Reception"), frappe.PermissionError)
	from nomad_vip.services import get_branch_for_user
	branch = get_branch_for_user()
	if not branch:
		frappe.throw(_("Your user is not assigned to a branch"), frappe.PermissionError)
	return branch


@frappe.whitelist()
def lookup_customer_by_phone(phone):
	branch = _reception_branch()
	from nomad_vip.api.entry_access import require_entry_access
	branch = require_entry_access(branch)
	customer = _find_customer_by_phone(phone)
	if not customer:
		return {"found": False, "phone": _phone_digits(phone)}
	return {"found": True, "branch": branch, "detail": get_customer_detail(customer, branch)}


@frappe.whitelist()
def register_walk_in_customer(customer_name, phone):
	assigned_branch = _reception_branch()
	from nomad_vip.api.entry_access import require_entry_access
	assigned_branch = require_entry_access(assigned_branch)
	if not frappe.has_permission("Customer", "create") and "Reception" not in frappe.get_roles():
		frappe.throw(_("Not permitted"), frappe.PermissionError)
	digits = _phone_digits(phone)
	if len(digits) != 8:
		frappe.throw(_("Enter a valid 8-digit phone number"))
	name = (customer_name or "").strip() or digits
	if len(name) > 140:
		frappe.throw(_("Зочны нэр 140 тэмдэгтээс урт байж болохгүй."), frappe.ValidationError)

	from nomad_vip.integrations.finex import VIP_BRANCHES, _customer_group, _territory, ensure_vip_branches
	from nomad_vip.api.locking import database_lock
	with database_lock("customer-phone", digits):
		existing = _find_customer_by_phone(digits)
		if existing:
			return {
				"created": False,
				"branch": assigned_branch,
				"detail": get_customer_detail(existing, assigned_branch),
			}
		ensure_vip_branches()
		doc = frappe.get_doc({
			"doctype": "Customer",
			"customer_name": name,
			"customer_type": "Individual",
			"customer_group": _customer_group(),
			"territory": _territory(),
			"mobile_no": digits,
			"custom_finex_phone": digits,
		}).insert(ignore_permissions=True)
		for profile_branch in VIP_BRANCHES:
			frappe.get_doc({
				"doctype": "VIP Customer Branch Profile",
				"customer": doc.name,
				"branch": profile_branch,
				"membership_rank": "Unassigned",
			}).insert(ignore_permissions=True)
		frappe.db.commit()
	return {
		"created": True,
		"branch": assigned_branch,
		"detail": get_customer_detail(doc.name, assigned_branch),
	}


@frappe.whitelist()
def get_customer_detail(customer, branch_filter=None):
	roles = set(frappe.get_roles())
	# Central operators use the compact service-entry feed.  They must never be
	# able to obtain the manager-only bill, spend and preference history by
	# calling this lower-level endpoint directly.
	if "Operation" in roles and not roles.intersection({"Branch Manager", "System Manager", "CEO"}) and frappe.session.user != "Administrator":
		frappe.throw(_("Дэлгэрэнгүй хэрэглэгчийн мэдээлэл харах эрхгүй байна."), frappe.PermissionError)
	if not frappe.has_permission("Customer", "read", customer) and not roles.intersection({"Reception", "Branch Manager", "Operation"}):
		frappe.throw(_("Not permitted"), frappe.PermissionError)
	if frappe.session.user != "Administrator" and not roles.intersection({"System Manager", "CEO"}) and roles.intersection({"Reception", "Branch Manager"}):
		from nomad_vip.services import get_branch_for_user
		assigned_branch = get_branch_for_user()
		if not assigned_branch:
			frappe.throw(_("Your user is not assigned to a branch"), frappe.PermissionError)
		if branch_filter and branch_filter != assigned_branch:
			frappe.throw(_("You cannot view another branch's customer information"), frappe.PermissionError)
		branch_filter = assigned_branch

	doc = frappe.get_doc("Customer", customer)
	profile_filters = {"customer": customer}
	if branch_filter:
		profile_filters["branch"] = branch_filter
	branch_profiles = frappe.get_all(
		"VIP Customer Branch Profile",
		filters=profile_filters,
		fields=["name", "branch", "membership_rank", "manual_rank", "rank_override_by", "rank_override_at", "service_characteristics", "service_characteristics_updated_by", "service_characteristics_updated_at", "is_banned", "ban_reason", "banned_by", "banned_at", "visit_count", "bill_count", "total_spend", "average_bill", "first_visit", "last_visit"],
		order_by="branch asc",
		limit_page_length=0,
	)
	# A branch ban is enforced only by that branch. Managers may still need the
	# active reason from another branch to make an informed, independent decision.
	# Keep this separate from branch_profiles so no cross-branch financial or rank
	# data is exposed to a branch-scoped user.
	can_view_cross_branch_bans = frappe.session.user == "Administrator" or bool(
		roles.intersection({"System Manager", "CEO", "Branch Manager"})
	)
	branch_ban_notices = []
	if can_view_cross_branch_bans:
		branch_ban_notices = frappe.get_all(
			"VIP Customer Branch Profile",
			filters={"customer": customer, "is_banned": 1},
			fields=["branch", "ban_reason", "banned_by", "banned_at"],
			order_by="branch asc",
			limit_page_length=0,
		)
	bill_filters = {"customer": customer}
	if branch_filter:
		bill_filters["store_name"] = ["like", f"%{branch_filter}%"]
	bills = frappe.get_all(
		"VIP POS Bill",
		filters=bill_filters,
		fields=["name", "bill_code", "posting_date", "open_date", "closed_date", "store_name", "total_amount", "bill_type", "is_paid", "raw_payload"],
		order_by="posting_date desc, creation desc",
		limit_page_length=0,
	)
	dancers = defaultdict(lambda: {"dancer_id": "", "name": "", "nickname": "", "bill_ids": set(), "service_count": 0, "service_hours": 0.0, "service_spend": 0.0, "last_visit": None})
	services = defaultdict(lambda: {"menu_id": "", "name": "", "quantity": 0.0, "total_spend": 0.0, "bill_ids": set()})
	branches = defaultdict(lambda: {"name": "", "bill_count": 0, "total_spend": 0.0, "last_visit": None})
	bill_items = {}
	bill_meta = {}

	for bill in bills:
		sign = -1 if bill.bill_type == 2 else 1
		branch = branches[bill.store_name or _("Unknown")]
		branch["name"] = bill.store_name or _("Unknown")
		branch["bill_count"] += 1
		branch["total_spend"] += sign * flt(bill.total_amount) if bill.is_paid else 0
		branch["last_visit"] = max(filter(None, [branch["last_visit"], bill.posting_date]), default=None)
		try:
			payload = json.loads(bill.raw_payload or "{}")
		except (TypeError, ValueError):
			payload = {}
		open_date = payload.get("openDate") or bill.open_date
		closed_date = payload.get("closedDate") or bill.closed_date
		bill_items[bill.name] = []
		room_hours = defaultdict(float)
		for item in payload.get("items") or []:
			item_name = item.get("menuName") or _("Unknown Service")
			quantity = flt(item.get("quantity"))
			is_hour_service = _is_hour_service(item_name)
			is_room_service = _is_room_service(item_name)
			item_dancers = [
				{
					"name": dancer.get("dancerName") or _("Unknown Entertainer"),
					"nickname": dancer.get("dancerNickname") or "",
					"hours": quantity if is_hour_service else 0,
				}
				for dancer in (item.get("dancers") or [])
				if dancer.get("dancerNickname") or dancer.get("dancerName")
			]
			bill_items[bill.name].append({
				"name": item_name,
				"quantity": quantity,
				"total": sign * flt(item.get("total")),
				"is_paid_service": 1 if item.get("isPaidService") else 0,
				"is_room": is_room_service,
				"is_hour_service": is_hour_service,
				"dancers": item_dancers,
			})
			if is_room_service:
				room_hours[item_name.strip()] += quantity
			service_key = str(item.get("menuId") or item.get("menuName") or "unknown")
			service = services[service_key]
			service["menu_id"] = str(item.get("menuId") or "")
			service["name"] = item.get("menuName") or _("Unknown Service")
			service["quantity"] += flt(item.get("quantity"))
			service["total_spend"] += sign * flt(item.get("total"))
			service["bill_ids"].add(bill.name)
			for dancer in item.get("dancers") or []:
				dancer_key = str(dancer.get("dancerId") or dancer.get("dancerCode") or dancer.get("dancerName") or "unknown")
				row = dancers[dancer_key]
				row["dancer_id"] = str(dancer.get("dancerId") or "")
				row["name"] = dancer.get("dancerName") or _("Unknown Entertainer")
				row["nickname"] = dancer.get("dancerNickname") or ""
				row["bill_ids"].add(bill.name)
				row["service_count"] += 1
				if is_hour_service:
					row["service_hours"] += quantity
				row["service_spend"] += sign * flt(item.get("total")) * flt(dancer.get("percent")) / 100
				row["last_visit"] = max(filter(None, [row["last_visit"], bill.posting_date]), default=None)
		bill_meta[bill.name] = {
			"open_date": open_date,
			"closed_date": closed_date,
			"duration_minutes": _duration_minutes(open_date, closed_date),
			"rooms": [{"name": name, "hours": hours} for name, hours in room_hours.items()],
		}

	dancer_rows = sorted(
		[{**{key: value for key, value in row.items() if key != "bill_ids"}, "bill_count": len(row["bill_ids"])} for row in dancers.values()],
		key=lambda row: (row["bill_count"], row["service_spend"]),
		reverse=True,
	)
	service_rows = sorted(
		[{**{key: value for key, value in row.items() if key != "bill_ids"}, "bill_count": len(row["bill_ids"])} for row in services.values()],
		key=lambda row: row["total_spend"],
		reverse=True,
	)
	branch_rows = sorted(branches.values(), key=lambda row: row["total_spend"], reverse=True)
	recent_bills = [
		{
			**{key: value for key, value in bill.items() if key != "raw_payload"},
			**bill_meta.get(bill.name, {}),
			"items": bill_items.get(bill.name, []),
		}
		for bill in bills[:20]
	]

	visible_profile = branch_profiles[0] if branch_filter and branch_profiles else None
	detail = {
		"customer": {
			"name": doc.name,
			"customer_name": doc.customer_name,
			"phone": _phone_digits(doc.get("mobile_no") or doc.get("custom_finex_phone")),
			"visit_count": visible_profile.visit_count if visible_profile else doc.get("custom_visit_count") or 0,
			"bill_count": visible_profile.bill_count if visible_profile else doc.get("custom_bill_count") or 0,
			"total_spend": visible_profile.total_spend if visible_profile else doc.get("custom_total_spend") or 0,
			"average_bill": visible_profile.average_bill if visible_profile else doc.get("custom_average_bill") or 0,
			"first_visit": visible_profile.first_visit if visible_profile else doc.get("custom_first_visit"),
			"last_visit": visible_profile.last_visit if visible_profile else doc.get("custom_last_visit"),
			"primary_branch": branch_filter or doc.get("custom_primary_branch"),
		},
		"scope_branch": branch_filter,
		"branch_profiles": branch_profiles,
		"branch_ban_notices": branch_ban_notices,
		"dancers": dancer_rows,
		"services": service_rows,
		"branches": branch_rows,
		"recent_bills": recent_bills,
	}
	if frappe.db.exists("DocType", "VIP Customer Point Ledger"):
		from nomad_vip.api.cashback import get_customer_wallet
		detail["wallet"] = get_customer_wallet(customer, branch_filter)
	if branch_filter:
		last_visit_number = frappe.db.get_value(
			"VIP Customer Entry Event",
			{"customer": customer, "branch": branch_filter},
			"visit_number",
			order_by="entered_at desc",
		) or 0
		baseline = int(visible_profile.visit_count or 0) if visible_profile else 0
		detail["next_visit_number"] = max(baseline, int(last_visit_number or 0)) + 1
		from nomad_vip.api.operation import get_active_reservations
		detail["reservations"] = get_active_reservations(detail["customer"]["phone"], branch_filter)

	can_view_financials = frappe.session.user == "Administrator" or bool(
		roles.intersection({"System Manager", "CEO", "Branch Manager", "Operation"})
	)
	if not can_view_financials:
		detail.pop("wallet", None)
		for key in ("total_spend", "average_bill"):
			detail["customer"].pop(key, None)
		for profile in detail["branch_profiles"]:
			profile.pop("total_spend", None)
			profile.pop("average_bill", None)
		for dancer in detail["dancers"]:
			dancer.pop("service_spend", None)
		for service in detail["services"]:
			service.pop("total_spend", None)
		for branch in detail["branches"]:
			branch.pop("total_spend", None)
		for bill in detail["recent_bills"]:
			bill.pop("total_amount", None)
			for item in bill.get("items", []):
				item.pop("total", None)

	return detail


@frappe.whitelist(methods=["POST"])
def set_customer_ban(customer, banned, reason):
	"""Ban or unban one customer for the signed-in manager's branch only."""
	from nomad_vip.api.security import record_api_audit, require_actor

	actor = require_actor("Branch Manager", require_branch=True)
	branch = actor.branch

	is_banned = 1 if cint(banned) else 0
	reason = (reason or "").strip()
	if not reason:
		frappe.throw("Хориглох эсвэл хоригийг цуцлах шалтгааныг заавал оруулна уу")
	if len(reason) > 500:
		frappe.throw("Шалтгаан 500 тэмдэгтээс урт байж болохгүй")

	profile = frappe.db.get_value(
		"VIP Customer Branch Profile",
		{"customer": customer, "branch": branch},
		["name", "is_banned", "ban_reason", "modified"],
		as_dict=True,
	)
	if not profile:
		frappe.throw(_("Тухайн салбар дахь хэрэглэгчийн бүртгэл олдсонгүй."))
	if cint(profile.is_banned) == is_banned:
		state = "аль хэдийн хориглогдсон" if is_banned else "аль хэдийн хориггүй"
		frappe.throw(f"Энэ хэрэглэгч {state} байна")

	values = {
		"is_banned": is_banned,
		"ban_reason": reason,
		"banned_by": frappe.session.user,
		"banned_at": now_datetime(),
	}
	frappe.db.set_value("VIP Customer Branch Profile", profile.name, values)
	record_api_audit(
		actor=actor,
		action="manager.customer_access.ban" if is_banned else "manager.customer_access.unban",
		target_doctype="VIP Customer Branch Profile",
		target_name=profile.name,
		details={
			"customer": customer,
			"branch": branch,
			"previous_banned": int(profile.is_banned or 0),
			"previous_reason": profile.ban_reason or "",
			"next_banned": is_banned,
			"reason": reason,
		},
	)
	frappe.db.commit()
	return get_customer_detail(customer, branch)


@frappe.whitelist(methods=["POST"])
def set_customer_service_characteristics(customer, characteristics):
	"""Store one branch-scoped service note without exposing customer financials.

	Only the branch manager may edit this field. Bartenders, operators and lead
	entertainers receive the resulting text through the compact service feed.
	"""
	from nomad_vip.api.security import record_api_audit, require_actor

	actor = require_actor("Branch Manager", require_branch=True)
	branch = actor.branch
	value = (characteristics or "").strip()
	if len(value) > 500:
		frappe.throw("Үйлчилгээний онцлог 500 тэмдэгтээс урт байж болохгүй")

	profile = frappe.db.get_value(
		"VIP Customer Branch Profile",
		{"customer": customer, "branch": branch},
		["name", "service_characteristics"],
		as_dict=True,
	)
	if not profile:
		frappe.throw(_("Тухайн салбар дахь хэрэглэгчийн бүртгэл олдсонгүй."))

	previous = (profile.service_characteristics or "").strip()
	frappe.db.set_value(
		"VIP Customer Branch Profile",
		profile.name,
		{
			"service_characteristics": value,
			"service_characteristics_updated_by": actor.user,
			"service_characteristics_updated_at": now_datetime(),
		},
	)
	record_api_audit(
		actor=actor,
		action="manager.customer_service_characteristics.update",
		target_doctype="VIP Customer Branch Profile",
		target_name=profile.name,
		details={
			"customer": customer,
			"branch": branch,
			"previous": previous,
			"next": value,
		},
	)
	frappe.db.commit()
	return {
		"customer": customer,
		"branch": branch,
		"service_characteristics": value,
		"service_characteristics_updated_by": actor.user,
		"service_characteristics_updated_at": now_datetime(),
	}


@frappe.whitelist(methods=["POST"])
def set_customer_rank(customer, membership_rank):
	frappe.throw(
		_("Direct or manual customer rank changes are retired. Use the audited membership recommendation decision workflow."),
		frappe.PermissionError,
	)
