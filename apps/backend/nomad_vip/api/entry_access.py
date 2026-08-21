from __future__ import annotations

import math
from urllib.parse import parse_qs, urlparse

import frappe
from frappe import _
from frappe.utils import cint, flt, now_datetime

from nomad_vip.api.security import require_actor


MAX_LOCATION_ACCURACY_METERS = 100
TEST_BYPASS_CONFIG_KEY = "vip_entry_test_bypass_qr"


def _is_test_bypass_role(roles) -> bool:
	"""Limit the temporary UAT bypass to the two door-operation personas."""
	roles = set(roles or ())
	if "Branch Manager" in roles:
		return False
	return bool(roles.intersection({"Reception", "Operation"}))


def is_test_entry_access_bypass_enabled() -> bool:
	"""Return a server-controlled UAT flag; clients cannot opt into the bypass."""
	return bool(cint(frappe.conf.get(TEST_BYPASS_CONFIG_KEY))) and _is_test_bypass_role(frappe.get_roles())


def _test_bypass_branch(actor, requested_branch=None):
	if not bool(cint(frappe.conf.get(TEST_BYPASS_CONFIG_KEY))) or not _is_test_bypass_role(actor.roles):
		return None

	if "Operation" in actor.roles:
		from nomad_vip.integrations.finex import VIP_BRANCHES

		if requested_branch not in VIP_BRANCHES:
			frappe.throw(_("Салбараа сонгоно уу."), frappe.PermissionError)
		return requested_branch

	if not actor.branch:
		frappe.throw(_("Таны хэрэглэгчид салбар оноогоогүй байна."), frappe.PermissionError)
	if requested_branch and requested_branch != actor.branch:
		frappe.throw(_("Та зөвхөн өөрийн салбарын мэдээлэлтэй ажиллана."), frappe.PermissionError)
	return actor.branch


def _token_from_payload(value: str) -> str:
	value = (value or "").strip()
	if not value:
		return ""
	if value.startswith("http://") or value.startswith("https://"):
		return (parse_qs(urlparse(value).query).get("entry_access") or [""])[0]
	return value


def _distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
	radius = 6371000
	phi1, phi2 = math.radians(lat1), math.radians(lat2)
	dphi = math.radians(lat2 - lat1)
	dlambda = math.radians(lon2 - lon1)
	a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
	return radius * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _validate_entry_access(qr_payload, latitude, longitude, accuracy, requested_branch=None, actor=None):
	actor = actor or require_actor("Reception", "Operation", "Branch Manager")
	raw_accuracy = accuracy
	latitude, longitude, accuracy = flt(latitude), flt(longitude), max(0, flt(accuracy))
	token = _token_from_payload(qr_payload)
	config_name = frappe.db.get_value(
		"VIP Branch Attendance QR",
		{"qr_token": token, "active": 1},
		"name",
	) if token else None
	if not config_name:
		frappe.throw(_("Үүдний QR код хүчингүй эсвэл идэвхгүй байна."), frappe.PermissionError)
	config = frappe.get_doc("VIP Branch Attendance QR", config_name)
	if not config.configured_at or not config.latitude or not config.longitude:
		frappe.throw(_("Энэ салбарын байршил хараахан тохируулагдаагүй байна."), frappe.ValidationError)
	if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
		frappe.throw(_("Байршлын мэдээлэл буруу байна."), frappe.ValidationError)
	if raw_accuracy in (None, "") or accuracy > MAX_LOCATION_ACCURACY_METERS:
		frappe.throw(_("Байршлын нарийвчлал хангалтгүй байна. GPS-ээ асаагаад дахин оролдоно уу."), frappe.PermissionError)
	if requested_branch and requested_branch != config.branch:
		frappe.throw(_("Сонгосон салбар энэ QR кодын салбартай тохирохгүй байна."), frappe.PermissionError)
	is_global_operation = "Operation" in actor.roles and "Branch Manager" not in actor.roles
	if not is_global_operation and actor.branch != config.branch:
		frappe.throw(_("Та зөвхөн өөрийн салбарын үүдний QR кодоор нэвтэрнэ."), frappe.PermissionError)
	distance = _distance_meters(latitude, longitude, flt(config.latitude), flt(config.longitude))
	if distance > int(config.radius_meters or 100):
		frappe.throw(_("Та салбарын зөвшөөрөгдсөн байршлаас гадуур байна."), frappe.PermissionError)
	return actor, config, distance


@frappe.whitelist(allow_guest=True, methods=["GET"])
def get_entry_qr_context(qr_payload):
	"""Resolve only the branch label needed to render a branch-locked login screen."""
	token = _token_from_payload(qr_payload)
	config_name = frappe.db.get_value(
		"VIP Branch Attendance QR",
		{"qr_token": token, "active": 1},
		"name",
	) if token else None
	if not config_name:
		frappe.throw(_("Үүдний QR код хүчингүй эсвэл идэвхгүй байна."), frappe.PermissionError)
	config = frappe.get_doc("VIP Branch Attendance QR", config_name)
	if not config.configured_at or not config.latitude or not config.longitude:
		frappe.throw(_("Энэ салбарын байршил хараахан тохируулагдаагүй байна."), frappe.ValidationError)
	return {"branch": config.branch}


@frappe.whitelist(methods=["POST"])
def verify_branch_entry_access(qr_payload, latitude, longitude, accuracy):
	_actor, config, distance = _validate_entry_access(qr_payload, latitude, longitude, accuracy)
	return {
		"branch": config.branch,
		"verified_at": now_datetime(),
		"distance_meters": round(distance, 1),
		"radius_meters": int(config.radius_meters or 100),
	}


def require_entry_access(branch=None):
	"""Require fresh branch QR and GPS evidence on every VIP Entry API request."""
	actor = require_actor("Reception", "Operation", "Branch Manager")
	bypass_branch = _test_bypass_branch(actor, branch)
	if bypass_branch:
		return bypass_branch

	form = frappe.form_dict or {}
	_actor, config, _distance = _validate_entry_access(
		form.get("entry_access_token"),
		form.get("entry_access_latitude"),
		form.get("entry_access_longitude"),
		form.get("entry_access_accuracy"),
		branch,
		actor,
	)
	return config.branch
