from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import cint, flt, now_datetime

from nomad_vip.api.security import normalize_idempotency_key, record_api_audit, require_actor
from nomad_vip.desk_policy import ensure_desk_policy
from nomad_vip.integrations.finex import VIP_BRANCHES
from nomad_vip.services import require_any_role


RANKS = ("Bronze", "Silver", "Gold", "Diamond", "Black Diamond")
RANK_ORDER = {rank: index + 1 for index, rank in enumerate(RANKS)}
LEAD_ENTERTAINER_ROLE = "Lead Entertainer"


def _require_admin():
	require_any_role("VIP Admin", "System Manager", "CEO")


def _admin_actor():
	return require_actor("VIP Admin", "System Manager")


def _validate_branch(branch):
	if branch not in VIP_BRANCHES:
		frappe.throw(_("Unknown VIP branch"))
	return branch


def _rules(branch):
	return frappe.get_all(
		"VIP Customer Rank Rule",
		filters={"branch": branch},
		fields=[
			"name", "branch", "membership_rank", "rank_order", "minimum_total_spend",
			"minimum_visit_count", "minimum_average_bill", "active", "modified", "applied_at",
		],
		order_by="rank_order asc",
	)


def _branch_stats(branch):
	total = frappe.db.count("VIP Customer Branch Profile", {"branch": branch})
	assigned = frappe.db.count(
		"VIP Customer Branch Profile",
		{"branch": branch, "membership_rank": ["!=", "Unassigned"]},
	)
	last_applied = frappe.db.get_value(
		"VIP Customer Rank Rule",
		{"branch": branch, "applied_at": ["is", "set"]},
		"applied_at",
		order_by="applied_at desc",
	)
	return {
		"total_customers": total,
		"ranked_customers": assigned,
		"unranked_customers": total - assigned,
		"last_applied_at": last_applied,
	}


@frappe.whitelist()
def get_rank_settings(branch=None):
	_require_admin()
	branch = _validate_branch(branch or VIP_BRANCHES[0])
	return {
		"branches": list(VIP_BRANCHES),
		"branch": branch,
		"rules": _rules(branch),
		"stats": _branch_stats(branch),
	}


@frappe.whitelist()
def get_branch_customers(branch, membership_rank=None, search=None, limit_start=0, limit_page_length=50):
	_require_admin()
	branch = _validate_branch(branch)
	limit_start = max(cint(limit_start), 0)
	limit_page_length = min(max(cint(limit_page_length), 1), 100)
	conditions = ["profile.branch = %s"]
	values = [branch]
	if membership_rank and membership_rank != "All":
		if membership_rank not in ("Unassigned", *RANKS):
			frappe.throw(_("Unknown VIP membership rank"))
		conditions.append("profile.membership_rank = %s")
		values.append(membership_rank)
	search = (search or "").strip()
	if search:
		like_value = f"%{search}%"
		conditions.append(
			"(customer.customer_name like %s or customer.name like %s or "
			"customer.mobile_no like %s or customer.custom_finex_phone like %s)"
		)
		values.extend([like_value, like_value, like_value, like_value])
	where_clause = " and ".join(conditions)
	total = frappe.db.sql(
		f"""select count(*)
		from `tabVIP Customer Branch Profile` profile
		inner join `tabCustomer` customer on customer.name = profile.customer
		where {where_clause}""",
		tuple(values),
	)[0][0]
	rows = frappe.db.sql(
		f"""select
			profile.name, profile.customer, customer.customer_name,
			coalesce(nullif(customer.mobile_no, ''), customer.custom_finex_phone, '') as phone,
			profile.membership_rank, profile.manual_rank, profile.rank_override_by,
			profile.visit_count, profile.bill_count, profile.total_spend,
			profile.average_bill, profile.last_visit
		from `tabVIP Customer Branch Profile` profile
		inner join `tabCustomer` customer on customer.name = profile.customer
		where {where_clause}
		order by field(profile.membership_rank, 'Black Diamond', 'Diamond', 'Gold', 'Silver', 'Bronze', 'Unassigned'),
			profile.average_bill desc, customer.customer_name asc
		limit %s offset %s""",
		tuple([*values, limit_page_length, limit_start]),
		as_dict=True,
	)
	rank_counts = {"Unassigned": 0, **{rank: 0 for rank in RANKS}}
	for row in frappe.db.sql(
		"""select membership_rank, count(*) as customer_count
		from `tabVIP Customer Branch Profile`
		where branch = %s group by membership_rank""",
		(branch,),
		as_dict=True,
	):
		rank_counts[row.membership_rank or "Unassigned"] = cint(row.customer_count)
	return {
		"branch": branch,
		"customers": rows,
		"total": cint(total),
		"limit_start": limit_start,
		"limit_page_length": limit_page_length,
		"rank_counts": rank_counts,
	}


def _normalise_rule_rows(rows):
	if isinstance(rows, str):
		rows = frappe.parse_json(rows)
	if not isinstance(rows, list):
		frappe.throw(_("Ranking rules must be a list"))
	by_rank = {row.get("membership_rank"): row for row in rows}
	if set(by_rank) != set(RANKS):
		frappe.throw(_("Bronze, Silver, Gold, Diamond and Black Diamond rules are required"))

	normalised = []
	for rank in RANKS:
		row = by_rank[rank]
		values = {
			"membership_rank": rank,
			"rank_order": RANK_ORDER[rank],
			"minimum_total_spend": 0,
			"minimum_visit_count": 0,
			"minimum_average_bill": flt(row.get("minimum_average_bill")),
			"active": cint(row.get("active")),
		}
		if values["minimum_average_bill"] < 0:
			frappe.throw(_("Ranking thresholds cannot be negative"))
		normalised.append(values)

	active_values = [row["minimum_average_bill"] for row in normalised if row["active"]]
	if active_values != sorted(active_values):
		frappe.throw(_("Each higher rank must have an equal or higher average check threshold"))
	return normalised


@frappe.whitelist(methods=["POST"])
def save_rank_settings(branch, rules):
	_require_admin()
	branch = _validate_branch(branch)
	rows = _normalise_rule_rows(rules)
	for values in rows:
		name = frappe.db.get_value(
			"VIP Customer Rank Rule",
			{"branch": branch, "membership_rank": values["membership_rank"]},
			"name",
		)
		payload = {**values, "updated_by": frappe.session.user}
		if name:
			frappe.db.set_value("VIP Customer Rank Rule", name, payload)
		else:
			frappe.get_doc({"doctype": "VIP Customer Rank Rule", "branch": branch, **payload}).insert(
				ignore_permissions=True
			)
	frappe.db.commit()
	return {
		"branches": list(VIP_BRANCHES),
		"branch": branch,
		"rules": _rules(branch),
		"stats": _branch_stats(branch),
	}


def resolve_customer_rank(branch, profile, include_manual=True):
	if include_manual and profile.get("manual_rank"):
		return profile.manual_rank
	rules = [row for row in _rules(branch) if row.active]
	rules.sort(key=lambda row: row.rank_order, reverse=True)
	for rule in rules:
		if flt(profile.get("average_bill")) >= flt(rule.minimum_average_bill):
			return rule.membership_rank
	return "Unassigned"


def apply_customer_rank_rules(branch):
	branch = _validate_branch(branch)
	profiles = frappe.get_all(
		"VIP Customer Branch Profile",
		filters={"branch": branch},
		fields=["name", "membership_rank", "manual_rank", "average_bill"],
	)
	changed = 0
	counts = {"Unassigned": 0, **{rank: 0 for rank in RANKS}}
	for profile in profiles:
		new_rank = resolve_customer_rank(branch, profile)
		counts[new_rank] += 1
		if profile.membership_rank != new_rank:
			frappe.db.set_value(
				"VIP Customer Branch Profile", profile.name, "membership_rank", new_rank, update_modified=False
			)
			changed += 1

	applied_at = now_datetime()
	for rule in _rules(branch):
		frappe.db.set_value(
			"VIP Customer Rank Rule", rule.name, "applied_at", applied_at, update_modified=False
		)
	return {"branch": branch, "processed": len(profiles), "changed": changed, "counts": counts, "applied_at": applied_at}


@frappe.whitelist(methods=["POST"])
def recalculate_branch_ranks(branch):
	_require_admin()
	result = apply_customer_rank_rules(branch)
	frappe.db.commit()
	result["stats"] = _branch_stats(branch)
	return result


def recalculate_all_customer_ranks():
	if not frappe.db.exists("DocType", "VIP Customer Rank Rule"):
		return
	for branch in VIP_BRANCHES:
		apply_customer_rank_rules(branch)


def _lead_candidate_payload(profile):
	user = frappe.db.get_value("Employee", profile.employee, "user_id") if profile.employee else None
	roles = set(frappe.get_roles(user)) if user else set()
	return {
		"profile": profile.name,
		"display_name": profile.stage_name or profile.employee_name or profile.name,
		"branch": profile.branch,
		"has_login": bool(user),
		"is_lead": LEAD_ENTERTAINER_ROLE in roles or "Entertainer Supervisor" in roles,
	}


@frappe.whitelist(methods=["GET"])
def get_lead_entertainer_candidates(branch):
	_admin_actor()
	branch = _validate_branch(branch)
	profiles = frappe.get_all(
		"VIP Entertainer Profile",
		filters={"branch": branch, "active": 1},
		fields=["name", "employee", "employee_name", "stage_name", "branch"],
		order_by="stage_name asc, employee_name asc",
		ignore_permissions=True,
	)
	return {
		"branch": branch,
		"people": [_lead_candidate_payload(profile) for profile in profiles],
	}


@frappe.whitelist(methods=["POST"])
def set_lead_entertainer(profile_name, enabled=1, reason=None, idempotency_key=None):
	actor = _admin_actor()
	reason = (reason or "").strip()
	if len(reason) < 5:
		frappe.throw(_("Үүрэг өөрчилсөн шалтгааныг хамгийн багадаа 5 тэмдэгтээр бичнэ үү."), frappe.ValidationError)
	enabled = bool(cint(enabled))
	idempotency_key = normalize_idempotency_key(idempotency_key)
	frappe.db.sql(
		"SELECT name FROM `tabVIP Entertainer Profile` WHERE name=%s FOR UPDATE",
		profile_name,
	)
	profile = frappe.db.get_value(
		"VIP Entertainer Profile",
		profile_name,
		["name", "employee", "employee_name", "stage_name", "branch", "active", "lifecycle_status"],
		as_dict=True,
	)
	if not profile or not profile.active or profile.lifecycle_status not in (None, "", "Active"):
		frappe.throw(_("Идэвхтэй бүжигчний бүртгэл олдсонгүй."), frappe.DoesNotExistError)
	user_name = frappe.db.get_value("Employee", profile.employee, "user_id")
	if not user_name:
		frappe.throw(_("Энэ бүжигчинд нэвтрэх эрх үүсгээгүй байна. Эхлээд ажилтны нэвтрэх эрхийг холбоно уу."), frappe.ValidationError)
	frappe.db.sql("SELECT name FROM `tabUser` WHERE name=%s FOR UPDATE", user_name)
	roles_before = set(frappe.get_roles(user_name))
	if roles_before.intersection({"Branch Manager", "VIP Admin", "System Manager"}):
		frappe.throw(_("Менежер эсвэл админы бүртгэлийг ахлах бүжигчнээр давхар тохируулахгүй."), frappe.ValidationError)

	if idempotency_key:
		replay = frappe.db.get_value(
			"VIP API Audit Event",
			{
				"actor": actor.user,
				"action": "admin.lead_entertainer.set",
				"idempotency_key": idempotency_key,
				"outcome": "Succeeded",
			},
			["target_name", "details"],
			as_dict=True,
		)
		if replay:
			import json

			details = json.loads(replay.details or "{}")
			if replay.target_name != profile.name or bool(details.get("enabled")) != enabled or details.get("reason") != reason:
				frappe.throw(_("Энэ давхардал хамгаалах түлхүүрийг өөр хүсэлтэд ашигласан байна."), frappe.TimestampMismatchError)
			return {"person": _lead_candidate_payload(profile), "replayed": True}

	user = frappe.get_doc("User", user_name)
	roles = [row.role for row in user.get("roles") or []]
	if enabled:
		for role in ("Entertainer", LEAD_ENTERTAINER_ROLE):
			if role not in roles:
				user.append("roles", {"role": role})
	else:
		user.set("roles", [row for row in user.get("roles") or [] if row.role != LEAD_ENTERTAINER_ROLE])
	user.save(ignore_permissions=True)
	ensure_desk_policy()
	record_api_audit(
		actor=actor,
		action="admin.lead_entertainer.set",
		target_doctype="VIP Entertainer Profile",
		target_name=profile.name,
		idempotency_key=idempotency_key,
		details={
			"enabled": enabled,
			"reason": reason,
			"roles_before": sorted(role for role in roles_before if role in {"Entertainer", LEAD_ENTERTAINER_ROLE}),
			"roles_after": sorted(
				role for role in frappe.get_roles(user_name) if role in {"Entertainer", LEAD_ENTERTAINER_ROLE}
			),
		},
	)
	frappe.db.commit()
	return {"person": _lead_candidate_payload(profile), "replayed": False}
