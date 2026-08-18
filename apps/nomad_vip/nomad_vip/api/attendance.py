from __future__ import annotations

import math
import secrets
from datetime import time, timedelta
from urllib.parse import parse_qs, urlparse

import frappe
from frappe import _
from frappe.utils import flt, get_datetime, getdate, now_datetime

from nomad_vip.api.attendance_policy import record_late_penalty
from nomad_vip.api.security import require_employee_identity
from nomad_vip.api.shift_state import attendance_state, resolve_shift_context, shift_checkins
from nomad_vip.availability_policy import canonical_availability_status
from nomad_vip.services import require_any_role


VIP_BRANCHES = ("Nomad", "Neva", "Sapphire", "Monarch")
MAX_LOCATION_ACCURACY_METERS = 100


def _ensure_config(branch: str):
	name = frappe.db.exists("VIP Branch Attendance QR", {"branch": branch})
	if name:
		return frappe.get_doc("VIP Branch Attendance QR", name)
	return frappe.get_doc({
		"doctype": "VIP Branch Attendance QR",
		"branch": branch,
		"qr_token": secrets.token_urlsafe(32),
		"active": 1,
		"radius_meters": 100,
	}).insert(ignore_permissions=True)


def _payload(token: str) -> str:
	return f"https://srv1871758.hstgr.cloud/staff/?attendance={token}"


def _token_from_payload(value: str) -> str:
	value = (value or "").strip()
	if not value:
		return ""
	if value.startswith("http://") or value.startswith("https://"):
		return (parse_qs(urlparse(value).query).get("attendance") or [""])[0]
	return value


def _distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
	radius = 6371000
	phi1, phi2 = math.radians(lat1), math.radians(lat2)
	dphi = math.radians(lat2 - lat1)
	dlambda = math.radians(lon2 - lon1)
	a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
	return radius * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _scan_log(actor, profile, branch, result, reason, latitude, longitude, accuracy, distance=None, config=None, shift=None, checkin=None):
	return frappe.get_doc({
		"doctype": "VIP Attendance Scan",
		"entertainer": profile.name if profile else None,
		"employee": actor.employee,
		"branch": branch,
		"scanned_at": now_datetime(),
		"result": result,
		"reason": reason,
		"qr_config": config.name if config else None,
		"latitude": latitude,
		"longitude": longitude,
		"accuracy_meters": accuracy,
		"distance_meters": distance,
		"shift_assignment": shift.name if shift else None,
		"employee_checkin": checkin,
		"scanned_by": frappe.session.user,
	}).insert(ignore_permissions=True)


def _employee_profile(actor):
	if not actor.profile:
		return None
	return frappe.db.get_value(
		"VIP Entertainer Profile",
		actor.profile,
		["name", "employee", "branch", "active", "lifecycle_status"],
		as_dict=True,
	)


def _operational_window(moment=None):
	"""Return the nightclub workday window (12:00–12:00 next day)."""
	moment = get_datetime(moment or now_datetime())
	work_date = getdate(moment)
	if moment.time() < time(12, 0):
		work_date -= timedelta(days=1)
	start = get_datetime(f"{work_date} 12:00:00")
	return work_date, start, start + timedelta(days=1)


def _operational_checkins(employee, moment=None):
	work_date, start, end = _operational_window(moment)
	rows = frappe.get_all(
		"Employee Checkin",
		filters={"employee": employee, "time": ("between", [start, end])},
		fields=["name", "time", "log_type", "shift"],
		order_by="time asc, creation asc",
		ignore_permissions=True,
	)
	return work_date, rows


def _attendance_context(actor, moment=None):
	shift_context = resolve_shift_context(actor.employee, moment)
	if shift_context and shift_context.is_active_window:
		rows = shift_checkins(actor.employee, shift_context)
		return shift_context.work_date, shift_context, attendance_state(rows)
	work_date, rows = _operational_checkins(actor.employee, moment)
	return work_date, None, attendance_state(rows)


@frappe.whitelist(methods=["GET"])
def get_my_attendance_status():
	actor = require_employee_identity()
	work_date, shift_context, state = _attendance_context(actor)
	employee_name = frappe.db.get_value("Employee", actor.employee, "employee_name")
	return {
		"employee": actor.employee,
		"employee_name": employee_name,
		"branch": actor.branch,
		"work_date": work_date,
		"action": "OUT" if state.open else "IN",
		"checked_in": bool(state.checked_in),
		"checked_out": bool(state.checked_out),
		"open": bool(state.open),
		"latest_checkin": state.latest,
		"shift": {
			"name": shift_context.assignment.name,
			"shift_type": shift_context.assignment.shift_type,
			"start": shift_context.start,
			"end": shift_context.end,
		} if shift_context else None,
	}


def _admin_branch(branch=None):
	require_any_role("VIP Admin", "System Manager")
	branch = branch or VIP_BRANCHES[0]
	if branch not in VIP_BRANCHES:
		frappe.throw(_("Сонгосон салбар бүртгэлгүй байна."), frappe.ValidationError)
	return branch


@frappe.whitelist(methods=["GET"])
def get_branch_qr(branch=None):
	branch = _admin_branch(branch)
	config = _ensure_config(branch)
	return {
		"branch": branch,
		"qr_payload": _payload(config.qr_token),
		"configured": bool(config.configured_at and config.latitude and config.longitude),
		"latitude": config.latitude,
		"longitude": config.longitude,
		"radius_meters": config.radius_meters or 100,
		"active": bool(config.active),
		"configured_by": config.configured_by,
		"configured_at": config.configured_at,
	}


@frappe.whitelist(methods=["POST"])
def configure_branch_location(branch, latitude, longitude, radius_meters=100):
	branch = _admin_branch(branch)
	latitude, longitude = flt(latitude), flt(longitude)
	radius = int(radius_meters or 100)
	if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
		frappe.throw(_("Байршлын мэдээлэл буруу байна."), frappe.ValidationError)
	if radius < 25 or radius > 500:
		frappe.throw(_("Зөвшөөрөх радиус 25–500 метр байна."), frappe.ValidationError)
	config = _ensure_config(branch)
	config.db_set({
		"latitude": latitude,
		"longitude": longitude,
		"radius_meters": radius,
		"active": 1,
		"configured_by": frappe.session.user,
		"configured_at": now_datetime(),
	})
	frappe.db.commit()
	return get_branch_qr(branch)


@frappe.whitelist(methods=["POST"])
def scan_branch_qr(qr_payload, latitude, longitude, accuracy, log_type="AUTO"):
	actor = require_employee_identity()
	profile = _employee_profile(actor)
	raw_accuracy = accuracy
	latitude, longitude, accuracy = flt(latitude), flt(longitude), max(0, flt(accuracy))
	log_type = (log_type or "AUTO").strip().upper()
	if log_type not in ("AUTO", "IN", "OUT"):
		frappe.throw(_("Ирцийн үйлдэл буруу байна."), frappe.ValidationError)
	token = _token_from_payload(qr_payload)
	config_name = frappe.db.get_value("VIP Branch Attendance QR", {"qr_token": token, "active": 1}, "name") if token else None
	config = frappe.get_doc("VIP Branch Attendance QR", config_name) if config_name else None

	def deny(reason, branch=None, distance=None, config_doc=None, shift=None):
		log = _scan_log(actor, profile, branch, "Denied", reason, latitude, longitude, accuracy, distance, config_doc, shift)
		frappe.db.commit()
		return {"accepted": False, "result": "Denied", "reason": reason, "scan": log.name}

	if not config:
		return deny(_("QR код хүчингүй эсвэл идэвхгүй байна."))
	if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
		return deny(_("Байршлын мэдээлэл буруу байна."), config.branch, config_doc=config)
	if raw_accuracy in (None, ""):
		return deny(_("Байршлын нарийвчлал ирсэнгүй. GPS-ээ асаагаад дахин оролдоно уу."), config.branch, config_doc=config)
	if not config.latitude or not config.longitude:
		return deny(_("Салбарын зөвшөөрөгдсөн байршил тохируулагдаагүй байна."), config.branch, config_doc=config)
	if profile and (not profile.active or profile.lifecycle_status not in (None, "", "Active")):
		return deny(_("Бүжигчний профайл идэвхгүй байна."), config.branch, config_doc=config)
	if actor.branch != config.branch:
		return deny(_("Энэ QR код таны зөвшөөрөгдсөн салбарынх биш байна."), config.branch, config_doc=config)
	if accuracy > MAX_LOCATION_ACCURACY_METERS:
		return deny(_("Байршлын нарийвчлал хангалтгүй байна. GPS-ээ асаагаад дахин оролдоно уу."), config.branch, config_doc=config)
	distance = _distance_meters(latitude, longitude, flt(config.latitude), flt(config.longitude))
	if distance > int(config.radius_meters or 100):
		return deny(_("Та салбарын зөвшөөрөгдсөн байршлаас гадуур байна."), config.branch, distance, config)
	work_date, shift_context, state = _attendance_context(actor)
	shift = shift_context.assignment if shift_context else None
	if log_type == "AUTO":
		log_type = "OUT" if state.open else "IN"

	# Serialize scans for one employee so two near-simultaneous requests cannot
	# create duplicate IN/OUT evidence.
	frappe.db.sql("SELECT name FROM `tabEmployee` WHERE name=%s FOR UPDATE", actor.employee)
	work_date, shift_context, state = _attendance_context(actor)
	shift = shift_context.assignment if shift_context else None
	latest = state.latest
	if (log_type == "IN" and state.open) or (log_type == "OUT" and state.checked_out):
		reason = _("Энэ ээлжийн ирсэн цаг өмнө нь бүртгэгдсэн.") if log_type == "IN" else _("Энэ ээлжийн гарсан цаг өмнө нь бүртгэгдсэн.")
		log = _scan_log(actor, profile, config.branch, "Duplicate", reason, latitude, longitude, accuracy, distance, config, shift, latest.name)
		frappe.db.commit()
		return {
			"accepted": True,
			"result": "Duplicate",
			"already_recorded": True,
			"already_checked_in": log_type == "IN",
			"checked_out": log_type == "OUT",
			"attendance_action": log_type,
			"checkin": latest,
			"scan": log.name,
			"branch": config.branch,
		}
	if log_type == "IN" and state.checked_out and shift_context:
		return deny(_("Энэ ээлжийн ирц аль хэдийн хаагдсан байна."), config.branch, distance, config, shift)
	if log_type == "OUT" and not state.open:
		return deny(_("Эхлээд энэ ээлжийн ирсэн цагаа бүртгэнэ үү."), config.branch, distance, config, shift)
	if log_type == "OUT" and profile and shift_context:
		availability = frappe.db.get_value(
			"VIP Availability Event",
			{"entertainer": profile.name, "work_date": work_date},
			["name", "status"],
			as_dict=True,
			order_by="occurred_at desc, creation desc",
		)
		if availability and canonical_availability_status(availability.status) != "Unavailable":
			return deny(_("Эхлээд “Өнөөдрийн ажил” хэсгээс ажлаа дуусгана уу."), config.branch, distance, config, shift)
	checkin_values = {
		"doctype": "Employee Checkin",
		"employee": actor.employee,
		"time": now_datetime(),
		"log_type": log_type,
	}
	if shift:
		checkin_values["shift"] = shift.shift_type
	checkin = frappe.get_doc(checkin_values).insert(ignore_permissions=True)
	if log_type == "IN" and profile and shift:
		record_late_penalty(profile, shift, checkin)
	reason = _("Ирсэн цаг QR болон байршлаар баталгаажсан.") if log_type == "IN" else _("Гарсан цаг QR болон байршлаар баталгаажсан.")
	log = _scan_log(actor, profile, config.branch, "Accepted", reason, latitude, longitude, accuracy, distance, config, shift, checkin.name)
	frappe.db.commit()
	return {
		"accepted": True,
		"result": "Accepted",
		"already_checked_in": False,
		"checked_out": log_type == "OUT",
		"already_recorded": False,
		"attendance_action": log_type,
		"checkin": {"name": checkin.name, "time": checkin.time, "log_type": checkin.log_type},
		"scan": log.name,
		"branch": config.branch,
		"distance_meters": round(distance, 1),
	}


@frappe.whitelist(methods=["POST"])
def ensure_branch_qrs():
	require_any_role("VIP Admin", "System Manager")
	created = []
	for branch in VIP_BRANCHES:
		if not frappe.db.exists("VIP Branch Attendance QR", {"branch": branch}):
			_ensure_config(branch)
			created.append(branch)
	frappe.db.commit()
	return {"created": created, "total": len(VIP_BRANCHES)}
