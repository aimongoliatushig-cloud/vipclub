from __future__ import annotations

import frappe
from frappe import _

from nomad_vip.integrations.finex import VIP_BRANCHES
from nomad_vip.services import require_any_role


RANKS = ("Bronze", "Silver", "Gold", "Diamond", "Black Diamond")


def _require_admin():
	require_any_role("VIP Admin", "System Manager", "CEO")


def _validate_branch(branch):
	if branch not in VIP_BRANCHES:
		frappe.throw(_("VIP салбар олдсонгүй."), frappe.ValidationError)
	return branch


def _stats(branch):
	total = frappe.db.count("VIP Customer Branch Profile", {"branch": branch})
	ranked = frappe.db.count(
		"VIP Customer Branch Profile",
		{"branch": branch, "membership_rank": ["!=", "Unassigned"]},
	)
	last_decision = None
	if frappe.db.exists("DocType", "VIP Membership Assignment"):
		last_decision = frappe.db.get_value(
			"VIP Membership Assignment",
			{"branch": branch, "status": "Active"},
			"modified",
			order_by="modified desc",
		)
	return {
		"total_customers": total,
		"ranked_customers": ranked,
		"unranked_customers": total - ranked,
		"last_applied_at": last_decision,
	}


def _active_policy(branch):
	if not frappe.db.exists("DocType", "VIP Membership Policy"):
		return None
	rows = frappe.get_all(
		"VIP Membership Policy",
		filters={"branch": branch, "status": "Active"},
		fields=[
			"name",
			"branch",
			"version",
			"status",
			"effective_from",
			"effective_to",
			"lookback_visit_count",
			"currency",
			"decision_role",
			"sla_hours",
			"modified",
		],
		order_by="effective_from desc",
		limit=2,
	)
	if len(rows) != 1:
		return None
	doc = frappe.get_doc("VIP Membership Policy", rows[0].name)
	return {
		**rows[0],
		"tiers": [
			{
				"membership_rank": row.membership_level,
				"rank_order": row.tier_order,
				"minimum_average_bill": row.lower_bound,
				"maximum_average_bill": row.upper_bound,
				"active": 1,
			}
			for row in doc.tiers
		],
	}


def _legacy_reference(branch):
	if not frappe.db.exists("DocType", "VIP Customer Rank Rule"):
		return []
	rows = frappe.get_all(
		"VIP Customer Rank Rule",
		filters={"branch": branch},
		fields=[
			"name",
			"branch",
			"membership_rank",
			"rank_order",
			"minimum_average_bill",
			"active",
			"modified",
			"applied_at",
		],
		order_by="rank_order asc",
	)
	by_rank = {row.membership_rank: row for row in rows}
	return [by_rank[rank] for rank in RANKS if rank in by_rank]


@frappe.whitelist(methods=["GET"])
def get_membership_policy_settings(branch=None):
	"""Return the reviewed policy projection without reviving legacy write APIs."""
	_require_admin()
	branch = _validate_branch(branch or VIP_BRANCHES[0])
	policy = _active_policy(branch)
	legacy_rules = _legacy_reference(branch)
	return {
		"branches": list(VIP_BRANCHES),
		"branch": branch,
		"policy": policy,
		"policy_state": "active" if policy else "configuration_required",
		"rules": policy["tiers"] if policy else legacy_rules,
		"rules_are_reference_only": not bool(policy),
		"stats": _stats(branch),
	}
