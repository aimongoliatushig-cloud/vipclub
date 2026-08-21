from __future__ import annotations

from datetime import timedelta

import frappe
from frappe.utils import add_days, get_datetime, getdate, now_datetime, today

from nomad_vip.provisioning import bootstrap_user_fields, get_bootstrap_password
from nomad_vip.services import update_profile_points


DEMO_USER = "demo.anu@vipclub.local"
DEMO_STAGE_NAME = "Ану"
DEMO_BRANCH = "Sapphire"
DEMO_SHIFT = "VIP Night Shift"


def _ensure_user() -> str:
	security_fields = bootstrap_user_fields(DEMO_USER, required=True)
	if not frappe.db.exists("User", DEMO_USER):
		frappe.get_doc({
			"doctype": "User",
			"email": DEMO_USER,
			"first_name": "Ану",
			"last_name": "Demo",
			**security_fields,
			"roles": [{"role": "Entertainer"}],
		}).insert(ignore_permissions=True)
	else:
		user = frappe.get_doc("User", DEMO_USER)
		user.enabled = 1
		if "Entertainer" not in frappe.get_roles(DEMO_USER):
			user.append("roles", {"role": "Entertainer"})
		user.save(ignore_permissions=True)
		from frappe.utils.password import update_password
		update_password(DEMO_USER, get_bootstrap_password(DEMO_USER, required=True))
	return DEMO_USER


def _ensure_employee(user: str) -> str:
	employee = frappe.db.get_value("Employee", {"user_id": user}, "name")
	if employee:
		frappe.db.set_value(
			"Employee", employee,
			{"branch": DEMO_BRANCH, "status": "Active"},
			update_modified=False,
		)
		return employee
	company = frappe.defaults.get_global_default("company") or frappe.db.get_value("Company", {}, "name")
	if not company:
		frappe.throw("A company is required before creating the demo entertainer.")
	return frappe.get_doc({
		"doctype": "Employee",
		"first_name": "Ану",
		"last_name": "Demo",
		"gender": "Female",
		"date_of_birth": "2001-06-18",
		"date_of_joining": "2026-05-18",
		"company": company,
		"branch": DEMO_BRANCH,
		"status": "Active",
		"user_id": user,
	}).insert(ignore_permissions=True).name


def _ensure_profile(employee: str) -> str:
	profile_name = frappe.db.get_value("VIP Entertainer Profile", {"employee": employee}, "name")
	values = {
		"stage_name": DEMO_STAGE_NAME,
		"active": 1,
		"is_demo": 1,
		"employment_type": "Employee",
		"lifecycle_status": "Active",
		"skills": "Contemporary dance\nHeels choreography\nVIP hosting",
		"languages": "Монгол\nАнгли\nСолонгос",
		"service_tags": "VIP room\nStage performance\nGuest hosting",
		"style_tags": "Elegant\nEnergetic\nFriendly",
		"profile_photo": "/staff/demo/anu-demo-profile.png",
		"media_consent_status": "Granted",
		"media_consent_version": "demo-profile-v1",
		"media_consent_note": "Synthetic demo identity generated for product development.",
	}
	if profile_name:
		profile = frappe.get_doc("VIP Entertainer Profile", profile_name)
		profile.update(values)
		profile.save(ignore_permissions=True)
	else:
		profile = frappe.get_doc({
			"doctype": "VIP Entertainer Profile",
			"employee": employee,
			**values,
		}).insert(ignore_permissions=True)
		profile_name = profile.name
	return profile_name


def _ensure_branch_assignment(profile: str) -> None:
	if frappe.db.exists(
		"VIP Entertainer Branch Assignment",
		{"entertainer": profile, "branch": DEMO_BRANCH, "assignment_status": "Active"},
	):
		return
	frappe.get_doc({
		"doctype": "VIP Entertainer Branch Assignment",
		"entertainer": profile,
		"branch": DEMO_BRANCH,
		"effective_from": "2026-05-18",
		"assignment_status": "Active",
		"reason": "Synthetic demo profile for staff app development",
	}).insert(ignore_permissions=True)


def _ensure_shift_type() -> None:
	values = {"start_time": "22:00:00", "end_time": "04:00:00"}
	if frappe.db.exists("Shift Type", DEMO_SHIFT):
		frappe.db.set_value("Shift Type", DEMO_SHIFT, values)
		return
	frappe.get_doc({
		"doctype": "Shift Type",
		"name": DEMO_SHIFT,
		**values,
	}).insert(ignore_permissions=True)


def _ensure_shift_assignments(employee: str) -> list[str]:
	base = getdate(today()) - timedelta(days=getdate(today()).weekday())
	assignments = []
	for week_offset in (-1, 0, 1):
		week_start = base + timedelta(days=7 * week_offset)
		for day_offset in range(5):
			day = week_start + timedelta(days=day_offset)
			name = frappe.db.get_value(
				"Shift Assignment",
				{"employee": employee, "shift_type": DEMO_SHIFT, "start_date": day, "end_date": day, "docstatus": 1},
				"name",
			)
			if not name:
				doc = frappe.get_doc({
					"doctype": "Shift Assignment",
					"employee": employee,
					"shift_type": DEMO_SHIFT,
					"start_date": day,
					"end_date": day,
				}).insert(ignore_permissions=True)
				doc.flags.ignore_permissions = True
				doc.submit()
				name = doc.name
			assignments.append(name)
	return assignments


def _ensure_history(employee: str) -> None:
	base = getdate(today()) - timedelta(days=getdate(today()).weekday()) - timedelta(days=7)
	for day_offset, minute_offset in ((0, -4), (1, 2), (2, -7), (4, -2)):
		day = base + timedelta(days=day_offset)
		start = get_datetime(f"{day} 22:00:00") + timedelta(minutes=minute_offset)
		end = get_datetime(f"{add_days(day, 1)} 04:00:00")
		for log_type, moment in (("IN", start), ("OUT", end)):
			if not frappe.db.exists("Employee Checkin", {"employee": employee, "time": moment, "log_type": log_type}):
				frappe.get_doc({
					"doctype": "Employee Checkin",
					"employee": employee,
					"time": moment,
					"log_type": log_type,
					"device_id": "NOMAD-DEMO-SEED",
				}).insert(ignore_permissions=True)


def _ensure_leave(profile: str, employee: str) -> None:
	month_start = getdate(today()).replace(day=1)
	leave_day = month_start + timedelta(days=3)
	if frappe.db.exists("VIP Emergency Leave Request", {"entertainer": profile, "leave_date": leave_day}):
		return
	frappe.get_doc({
		"doctype": "VIP Emergency Leave Request",
		"entertainer": profile,
		"employee": employee,
		"branch": DEMO_BRANCH,
		"leave_date": leave_day,
		"status": "Approved",
		"requested_at": get_datetime(f"{month_start + timedelta(days=2)} 08:35:00"),
		"reason": "Demo: family appointment",
		"decided_by": "Administrator",
		"decided_at": get_datetime(f"{month_start + timedelta(days=2)} 08:40:00"),
		"decision_reason": "Demo request approved",
	}).insert(ignore_permissions=True)


def _ensure_reservation(profile: str) -> str:
	starts_at = get_datetime(f"{add_days(today(), 1)} 22:30:00")
	existing = frappe.db.get_value(
		"VIP Reservation",
		{"entertainer": profile, "starts_at": starts_at, "source": "PWA"},
		"name",
	)
	if existing:
		return existing
	return frappe.get_doc({
		"doctype": "VIP Reservation",
		"customer_name": "Demo Guest",
		"branch": DEMO_BRANCH,
		"entertainer": profile,
		"starts_at": starts_at,
		"ends_at": starts_at + timedelta(hours=1),
		"status": "Assigned",
		"source": "PWA",
		"party_size": 4,
		"venue": "VIP Room 3",
		"notes": "[DEMO] Synthetic reservation for staff app preview.",
	}).insert(ignore_permissions=True).name


def _ensure_rank_points(profile: str) -> None:
	key = "demo-anu-rank-v1"
	event_name = frappe.db.get_value("VIP Performance Event", {"deduplication_key": key}, "name")
	if not event_name:
		event_name = frappe.get_doc({
			"doctype": "VIP Performance Event",
			"entertainer": profile,
			"event_type": "Manual Adjustment",
			"occurred_at": now_datetime(),
			"verified": 1,
			"source": "Demo Seed",
			"external_id": key,
			"deduplication_key": key,
		}).insert(ignore_permissions=True).name
	if not frappe.db.exists("VIP Point Ledger", {"performance_event": event_name}):
		policy = frappe.db.get_value("VIP Ranking Policy", {"status": "Published"}, "name")
		frappe.get_doc({
			"doctype": "VIP Point Ledger",
			"entertainer": profile,
			"performance_event": event_name,
			"metric": "Adjustment",
			"points": 320,
			"ranking_policy": policy,
			"posted_at": now_datetime(),
			"reason": "Synthetic demo starting score",
		}).insert(ignore_permissions=True)
	update_profile_points(profile)


def ensure_demo_entertainer() -> dict:
	"""Create one idempotent synthetic entertainer without using a real Finex identity."""
	if not frappe.conf.get("allow_demo_seed"):
		frappe.throw(
			"Demo seed is disabled. Set allow_demo_seed only on an isolated development site."
		)
	user = _ensure_user()
	employee = _ensure_employee(user)
	profile = _ensure_profile(employee)
	_ensure_branch_assignment(profile)
	_ensure_shift_type()
	assignments = _ensure_shift_assignments(employee)
	_ensure_history(employee)
	_ensure_leave(profile, employee)
	reservation = _ensure_reservation(profile)
	_ensure_rank_points(profile)
	frappe.db.commit()
	return {
		"user": user,
		"employee": employee,
		"profile": profile,
		"branch": DEMO_BRANCH,
		"shift_assignments": len(assignments),
		"reservation": reservation,
		"is_demo": True,
	}
