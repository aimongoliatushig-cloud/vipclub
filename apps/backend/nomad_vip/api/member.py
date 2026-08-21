from __future__ import annotations

import secrets

import frappe
from frappe import _

from nomad_vip.api.customer import _find_customer_by_phone, _phone_digits
from nomad_vip.integrations.finex import VIP_BRANCHES


MEMBERSHIP_RANKS = (
	"Unassigned",
	"Bronze",
	"Silver",
	"Gold",
	"Diamond",
	"Black Diamond",
)


def _require_member_service_key() -> None:
	expected = str(frappe.conf.get("member_service_key") or "")
	provided = str(frappe.get_request_header("X-Nomad-Member-Key") or "")
	if not expected or not provided or not secrets.compare_digest(expected, provided):
		frappe.throw(_("Хандах эрхгүй байна"), frappe.PermissionError)


@frappe.whitelist(allow_guest=True, methods=["POST"])
def get_member_context(phone, branch="Nomad"):
	"""Return the smallest rank projection required by the table assistant.

	The caller is the customer-assistant server, never the browser. Customer
	identity, phone, spending, visit and bill details intentionally stay out
	of this response.
	"""
	_require_member_service_key()
	branch = str(branch or "").strip()
	if branch not in VIP_BRANCHES:
		frappe.throw(_("Салбарын мэдээлэл буруу байна"))

	digits = _phone_digits(phone)
	if len(digits) != 8:
		return {"found": False, "branch": branch, "rank": "Unassigned", "access": "standard"}

	customer = _find_customer_by_phone(digits)
	if not customer:
		return {"found": False, "branch": branch, "rank": "Unassigned", "access": "standard"}

	profile = frappe.db.get_value(
		"VIP Customer Branch Profile",
		{"customer": customer, "branch": branch},
		["membership_rank", "is_banned"],
		as_dict=True,
	) or frappe._dict()
	rank = profile.get("membership_rank") or "Unassigned"
	if rank not in MEMBERSHIP_RANKS:
		rank = "Unassigned"
	blocked = bool(profile.get("is_banned"))
	return {
		"found": True,
		"branch": branch,
		"rank": rank,
		"access": "blocked" if blocked else "ranked",
	}
