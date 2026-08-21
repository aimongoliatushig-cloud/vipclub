from __future__ import annotations

import json
import math
import secrets
from datetime import time, timedelta
from urllib.parse import parse_qs, urlparse

import frappe
from frappe import _
from frappe.utils import cint, flt, get_datetime, get_time, getdate, now_datetime

from nomad_vip.api.attendance_policy import (
	arrival_requires_fixed_penalty,
	get_branch_late_after_time,
	has_approved_hourly_leave,
	hourly_leave_arrival_cutoff,
	hourly_leave_counts_as_absence,
	late_minutes_after_cutoff,
	record_late_penalty,
)
from nomad_vip.api.security import assert_not_stale, normalize_idempotency_key, record_api_audit, require_actor, require_employee_identity
from nomad_vip.api.shift_state import attendance_state, resolve_shift_context, shift_checkins
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
	profile = _employee_profile(actor)
	work_date, shift_context, state = _attendance_context(actor)
	employee_name = frappe.db.get_value("Employee", actor.employee, "employee_name")
	requires_checkout = not bool(profile)
	arrival = next((row for row in state.events if row.log_type == "IN"), None)
	departure = next((row for row in reversed(state.events) if row.log_type == "OUT"), None)
	approved_hourly_leave = bool(profile and has_approved_hourly_leave(entertainer=profile.name, work_date=work_date))
	leave_missed = bool(approved_hourly_leave and not arrival and hourly_leave_counts_as_absence(
		work_date,
		moment=now_datetime(),
	))
	fixed_penalty_arrival = bool(arrival and arrival_requires_fixed_penalty(work_date, arrival.time))
	late_minutes = 0 if approved_hourly_leave or fixed_penalty_arrival else (late_minutes_after_cutoff(actor.branch, work_date, arrival.time) if arrival else 0)
	return {
		"employee": actor.employee,
		"employee_name": employee_name,
		"branch": actor.branch,
		"work_date": work_date,
		"action": "OUT" if requires_checkout and state.open else "IN",
		"attendance_mode": "arrival_only" if profile else "arrival_and_departure",
		"requires_checkout": requires_checkout,
		"attendance_complete": bool(state.checked_in) if profile else bool(state.checked_out),
		"checked_in": bool(state.checked_in),
		"checked_out": False if profile else bool(state.checked_out),
		"checked_in_at": arrival.time if arrival else None,
		"checked_out_at": None if profile else (departure.time if departure else None),
		"open": bool(state.checked_in) if profile else bool(state.open),
		"latest_checkin": arrival if profile else state.latest,
		"attendance_state": "absent" if leave_missed else ("late" if late_minutes else ("checked_in" if state.checked_in else "not_arrived")),
		"late_after_time": str(hourly_leave_arrival_cutoff(work_date).time() if approved_hourly_leave else get_branch_late_after_time(actor.branch)),
		"late_minutes": late_minutes,
		"hourly_leave": approved_hourly_leave,
		"shift": {
			"name": shift_context.assignment.name,
			"shift_type": shift_context.assignment.shift_type,
			"start": shift_context.start,
			"end": shift_context.end,
		} if shift_context else None,
	}


@frappe.whitelist(methods=["GET"])
def get_my_attendance_history(limit=14):
	"""Return the signed-in employee's recent, operational-day attendance history."""
	actor = require_employee_identity()
	profile = _employee_profile(actor)
	limit = max(1, min(cint(limit or 14), 31))
	current_work_date, _start, end = _operational_window()
	start = get_datetime(f"{current_work_date - timedelta(days=max(limit * 2, 31))} 12:00:00")
	rows = frappe.get_all(
		"Employee Checkin",
		filters={
			"employee": actor.employee,
			"time": ("between", [start, end]),
			"skip_auto_attendance": 0,
		},
		fields=["name", "time", "log_type", "shift"],
		order_by="time desc, creation desc",
		limit_page_length=0,
		ignore_permissions=True,
	)
	buckets = {}
	for row in rows:
		moment = get_datetime(row.time)
		work_date = getdate(moment)
		if moment.time() < time(12, 0):
			work_date -= timedelta(days=1)
		buckets.setdefault(work_date, []).append(row)

	days = []
	for work_date in sorted(buckets, reverse=True)[:limit]:
		events = sorted(buckets[work_date], key=lambda row: get_datetime(row.time))
		arrival = next((row for row in events if row.log_type == "IN"), None)
		departure = next((row for row in reversed(events) if row.log_type == "OUT"), None)
		approved_hourly_leave = bool(
			profile and has_approved_hourly_leave(entertainer=profile.name, work_date=work_date)
		)
		fixed_penalty_arrival = bool(arrival and arrival_requires_fixed_penalty(work_date, arrival.time))
		late_minutes = 0
		if arrival and not approved_hourly_leave and not fixed_penalty_arrival:
			late_minutes = late_minutes_after_cutoff(actor.branch, work_date, arrival.time)
		status = "late" if fixed_penalty_arrival or late_minutes else (
			"arrived" if profile else ("completed" if departure else "arrived")
		)
		days.append({
			"work_date": work_date,
			"status": status,
			"checked_in_at": arrival.time if arrival else None,
			"checked_out_at": None if profile else (departure.time if departure else None),
			"late_minutes": late_minutes,
			"shift": (arrival or (None if profile else departure) or events[-1]).shift,
		})

	return {
		"employee": actor.employee,
		"branch": actor.branch,
		"days": days,
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
		"entry_qr_payload": f"https://srv1871758.hstgr.cloud/vip-entry/?entry_access={config.qr_token}",
		"configured": bool(config.configured_at and config.latitude and config.longitude),
		"latitude": config.latitude,
		"longitude": config.longitude,
		"radius_meters": config.radius_meters or 100,
		"active": bool(config.active),
		"configured_by": config.configured_by,
		"configured_at": config.configured_at,
		"late_after_time": str(get_time(config.late_after_time or "22:00:00")),
	}


def _attendance_policy_actor(branch=None):
	actor = require_actor("Branch Manager", "VIP Admin", "System Manager")
	is_global = actor.user == "Administrator" or bool(actor.roles.intersection({"VIP Admin", "System Manager"}))
	requested = (branch or actor.branch or "").strip()
	if not requested or requested not in VIP_BRANCHES:
		frappe.throw(_("Салбар сонгоно уу."), frappe.ValidationError)
	if not is_global and (not actor.branch or requested != actor.branch):
		frappe.throw(_("Та зөвхөн өөрийн салбарын ирцийн цагийг тохируулна."), frappe.PermissionError)
	return actor, requested


@frappe.whitelist(methods=["GET"])
def get_branch_attendance_policy(branch=None):
	_actor, branch = _attendance_policy_actor(branch)
	config = _ensure_config(branch)
	return {
		"branch": branch,
		"late_after_time": str(get_time(config.late_after_time or "22:00:00")),
		"updated_by": config.policy_updated_by,
		"updated_at": config.policy_updated_at,
		"modified": config.modified,
	}


@frappe.whitelist(methods=["POST"])
def update_branch_late_time(late_after_time, reason, expected_modified=None, idempotency_key=None, branch=None):
	actor, branch = _attendance_policy_actor(branch)
	reason = (reason or "").strip()
	if len(reason) < 3:
		frappe.throw(_("Өөрчилсөн шалтгаанаа бичнэ үү."), frappe.ValidationError)
	try:
		late_time = get_time(late_after_time)
	except (TypeError, ValueError):
		frappe.throw(_("Хоцролтын цаг буруу байна."), frappe.ValidationError)
	idempotency_key = normalize_idempotency_key(idempotency_key)
	action = "manager.attendance_policy.update_late_time"
	requested = {"branch": branch, "late_after_time": late_time.strftime("%H:%M:%S"), "reason": reason}
	if idempotency_key:
		audit_row = frappe.db.get_value(
			"VIP API Audit Event",
			{"actor": actor.user, "action": action, "idempotency_key": idempotency_key, "outcome": "Succeeded"},
			["name", "details"],
			as_dict=True,
		)
		if audit_row:
			try:
				details = json.loads(audit_row.details or "{}")
			except (TypeError, ValueError):
				details = {}
			if details.get("requested") != requested:
				frappe.throw(_("Энэ давхардал хамгаалах түлхүүрийг өөр хүсэлтэд ашигласан байна."), frappe.TimestampMismatchError)
			result = get_branch_attendance_policy(branch)
			result.update({"audit": audit_row.name, "replayed": True})
			return result
	config = _ensure_config(branch)
	frappe.db.sql("SELECT name FROM `tabVIP Branch Attendance QR` WHERE name=%s FOR UPDATE", config.name)
	assert_not_stale("VIP Branch Attendance QR", config.name, expected_modified)
	before = str(get_time(config.late_after_time or "22:00:00"))
	after = requested["late_after_time"]
	config.db_set({
		"late_after_time": after,
		"policy_updated_by": actor.user,
		"policy_updated_at": now_datetime(),
	})
	audit = record_api_audit(
		actor=actor,
		action=action,
		target_doctype="VIP Branch Attendance QR",
		target_name=config.name,
		idempotency_key=idempotency_key,
		details={"requested": requested, "before": before, "after": after},
	)
	frappe.db.commit()
	result = get_branch_attendance_policy(branch)
	result.update({"audit": audit, "replayed": False})
	return result


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
	if profile and log_type == "OUT":
		return deny(_("Бүжигчин зөвхөн ирэхдээ QR код уншуулна."), config.branch, distance, config, shift)
	if log_type == "AUTO":
		log_type = "IN" if profile else ("OUT" if state.open else "IN")

	# Serialize scans for one employee so two near-simultaneous requests cannot
	# create duplicate IN/OUT evidence.
	frappe.db.sql("SELECT name FROM `tabEmployee` WHERE name=%s FOR UPDATE", actor.employee)
	work_date, shift_context, state = _attendance_context(actor)
	shift = shift_context.assignment if shift_context else None
	latest = state.latest
	if (log_type == "IN" and (state.checked_in if profile else state.open)) or (log_type == "OUT" and state.checked_out):
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
		record_late_penalty(profile, shift, checkin, work_date)
	reason = _("Ирсэн цаг QR болон байршлаар баталгаажсан.") if log_type == "IN" else _("Гарсан цаг QR болон байршлаар баталгаажсан.")
	log = _scan_log(actor, profile, config.branch, "Accepted", reason, latitude, longitude, accuracy, distance, config, shift, checkin.name)
	if log_type == "IN" and profile and shift:
		from nomad_vip.api.entry import _manager_users
		readiness_payload = {
			"branch": config.branch,
			"entertainer": profile.name,
			"employee_checkin": checkin.name,
			"shift_assignment": shift.name,
			"scanned_at": str(checkin.time),
		}
		for user in _manager_users(config.branch):
			frappe.publish_realtime(
				"vip_readiness_pending",
				readiness_payload,
				user=user,
				after_commit=True,
			)
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
		"requires_checkout": not bool(profile),
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
