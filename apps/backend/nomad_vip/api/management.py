from __future__ import annotations

import hashlib
import json
import re
from datetime import time, timedelta

import frappe
from frappe import _
from frappe.utils import add_months, cint, flt, get_datetime, get_first_day, get_last_day, getdate, now_datetime, today

from nomad_vip.api.security import (
	assert_not_stale,
	normalize_idempotency_key,
	page_meta,
	page_window,
	record_api_audit,
	require_actor,
)
from nomad_vip.integrations.finex import VIP_BRANCHES
from nomad_vip.api.attendance_policy import (
	get_branch_late_after_time,
	has_approved_hourly_leave,
	hourly_leave_arrival_cutoff,
	hourly_leave_counts_as_absence,
	late_minutes_after_cutoff,
)
from nomad_vip.tasks.daily_rank import current_daily_rank_by_profile
from nomad_vip.sales_goals import approved_target_amount


CUSTOMER_RANKS = ("Unassigned", "Bronze", "Silver", "Gold", "Diamond", "Black Diamond")


def _safe_customer_display_name(value) -> str:
	"""Prevent a phone-only Customer name from bypassing the masked-phone projection."""
	name = (value or "").strip()
	digits = "".join(character for character in name if character.isdigit())
	if not name or (len(digits) >= 8 and not any(character.isalpha() for character in name)):
		return _("Нэр бүртгэгдээгүй")
	return re.sub(
		r"(?<!\d)(?:\d[\s-]*){8,}(?!\d)",
		lambda match: f"•••• {''.join(character for character in match.group(0) if character.isdigit())[-4:]}",
		name,
	)


def _management_actor():
	return require_actor("Branch Manager", "CEO", "System Manager")


def _session_actor():
	return require_actor("Branch Manager", "CEO", "HR Manager", "System Manager")


def _people_actor():
	return require_actor("Branch Manager", "HR Manager", "System Manager")


def _is_global(actor) -> bool:
	return actor.user == "Administrator" or bool(actor.roles.intersection({"CEO", "System Manager"}))


def _is_people_global(actor) -> bool:
	return actor.user == "Administrator" or bool(actor.roles.intersection({"HR Manager", "System Manager"}))


def _branch(actor, requested=None) -> str:
	if _is_global(actor):
		branch = (requested or "").strip()
		if branch not in VIP_BRANCHES:
			frappe.throw(_("Хүчинтэй VIP салбар сонгоно уу."), frappe.ValidationError)
		return branch
	if not actor.branch:
		frappe.throw(_("Таны ажилтны бүртгэлд салбар тохируулаагүй байна."), frappe.PermissionError)
	if requested and requested != actor.branch:
		frappe.throw(_("Өөр салбарын мэдээллийг харах эрхгүй байна."), frappe.PermissionError)
	return actor.branch


def _people_branch(actor, requested=None) -> str:
	if _is_people_global(actor):
		branch = (requested or "").strip()
		if branch not in VIP_BRANCHES:
			frappe.throw(_("Хүчинтэй VIP салбар сонгоно уу."), frappe.ValidationError)
		return branch
	if not actor.branch:
		frappe.throw(_("Таны ажилтны бүртгэлд салбар тохируулаагүй байна."), frappe.PermissionError)
	if requested and requested != actor.branch:
		frappe.throw(_("Өөр салбарын ажилтны мэдээлэлд хандах эрхгүй байна."), frappe.PermissionError)
	return actor.branch


def _request_hash(payload: dict) -> str:
	return hashlib.sha256(
		json.dumps(payload, ensure_ascii=False, sort_keys=True, default=str).encode("utf-8")
	).hexdigest()


def _employee_projection(employee_name: str):
	return frappe.db.get_value(
		"Employee",
		employee_name,
		[
			"name", "employee_name", "designation", "department", "company", "branch",
			"status", "date_of_joining", "relieving_date", "modified",
		],
		as_dict=True,
	)


def _throw_idempotency_mismatch() -> None:
	frappe.throw(
		_("Энэ давхардал хамгаалах түлхүүрийг өөр хүсэлтэд ашигласан байна."),
		frappe.TimestampMismatchError,
	)


def _audit_replay(actor, action: str, idempotency_key: str | None):
	if not idempotency_key:
		return None
	return frappe.db.get_value(
		"VIP API Audit Event",
		{
			"actor": actor.user,
			"action": action,
			"idempotency_key": idempotency_key,
			"outcome": "Succeeded",
		},
		["name", "target_name", "details"],
		as_dict=True,
	)


def _replayed_goal(actor, action: str, idempotency_key: str | None, requested: dict):
	audit = _audit_replay(actor, action, idempotency_key)
	if not audit:
		return None
	try:
		details = json.loads(audit.details or "{}")
	except (TypeError, ValueError):
		details = {}
	if details.get("requested") != requested or not audit.target_name:
		_throw_idempotency_mismatch()
	if not frappe.db.exists("VIP Branch Sales Goal", audit.target_name):
		_throw_idempotency_mismatch()
	return frappe.get_doc("VIP Branch Sales Goal", audit.target_name)


@frappe.whitelist(allow_guest=True, methods=["GET"])
def get_app_entry():
	"""Resolve the one staff sign-in destination without exposing protected data."""
	user = frappe.session.user
	if not user or user == "Guest":
		return {"authenticated": False, "destination": "staff"}
	roles = set(frappe.get_roles(user))
	if roles.intersection({"CEO", "Branch Manager", "HR Manager", "System Manager"}):
		destination = "manager"
	elif roles.intersection({"Reception", "Operation", "VIP Admin"}):
		destination = "vip-entry"
	else:
		destination = "staff"
	return {"authenticated": True, "destination": destination}


@frappe.whitelist(allow_guest=True, methods=["GET"])
def get_session():
	"""Return a minimal management session derived only from the Frappe identity."""
	if not frappe.session.user or frappe.session.user == "Guest":
		return {"authenticated": False}
	actor = _session_actor()
	global_access = _is_global(actor)
	people_global = _is_people_global(actor)
	role = "CEO" if global_access else ("HR Manager" if people_global else "Branch Manager")
	csrf_token = frappe.sessions.get_csrf_token() if getattr(frappe.local, "session_obj", None) else None
	return {
		"authenticated": True,
		"user": actor.user,
		"display_name": frappe.utils.get_fullname(actor.user),
		"role": role,
		"branch": actor.branch,
		"branches": list(VIP_BRANCHES) if (global_access or people_global) else [actor.branch],
		"capabilities": {
			"company_wide": global_access,
			"manage_schedule": not global_access,
			"decide_leave": not global_access,
			"read_penalties": True,
			"search_customers": True,
			"approve_sales_goal": global_access,
			"manage_employees": role in {"HR Manager", "Branch Manager"},
		},
		"csrf_token": csrf_token,
		"generated_at": now_datetime(),
	}


@frappe.whitelist(methods=["GET"])
def get_manager_customers(search=None, membership_rank=None, limit=50, cursor=0, branch=None):
	actor = _management_actor()
	branch = _branch(actor, branch)
	page_size, offset = page_window(limit, cursor)
	rank = (membership_rank or "").strip()
	if rank and rank != "All" and rank not in CUSTOMER_RANKS:
		frappe.throw(_("Харилцагчийн түвшин хүчин төгөлдөр биш байна."), frappe.ValidationError)
	conditions = [
		"profile.branch = %(branch)s",
		"(profile.bill_count > 0 or profile.visit_count > 0 or profile.total_spend != 0)",
	]
	values = {"branch": branch}
	if rank and rank != "All":
		conditions.append("profile.membership_rank = %(rank)s")
		values["rank"] = rank
	search = (search or "").strip()
	if search:
		values["search"] = f"%{search}%"
		conditions.append(
			"(customer.customer_name like %(search)s or customer.name like %(search)s "
			"or customer.mobile_no like %(search)s or customer.custom_finex_phone like %(search)s)"
		)
	where_clause = " and ".join(conditions)
	# Point is one global customer wallet. The customer set remains restricted to
	# the selected branch above; only the balance is projected here and no other
	# branch's transaction or bill detail is exposed to the manager.
	point_balance_projection = (
		"coalesce((select sum(point_ledger.points) "
		"from `tabVIP Customer Point Ledger` point_ledger "
		"where point_ledger.customer = customer.name), 0)"
		if frappe.db.exists("DocType", "VIP Customer Point Ledger")
		else "0"
	)
	total = frappe.db.sql(
		f"""select count(*) from `tabVIP Customer Branch Profile` profile
		inner join `tabCustomer` customer on customer.name = profile.customer
		where {where_clause}""",
		values,
	)[0][0]
	values.update({"limit": page_size, "offset": offset})
	rows = frappe.db.sql(
		f"""select customer.name, profile.name as profile_name, customer.customer_name,
		coalesce(nullif(customer.mobile_no, ''), customer.custom_finex_phone, '') as phone,
		profile.membership_rank, profile.visit_count, profile.bill_count,
		profile.total_spend, profile.average_bill, profile.first_visit, profile.last_visit,
		profile.is_banned, profile.ban_reason, profile.banned_by, profile.banned_at,
		profile.service_characteristics, profile.service_characteristics_updated_by,
		profile.service_characteristics_updated_at,
		{point_balance_projection} as point_balance
		from `tabVIP Customer Branch Profile` profile
		inner join `tabCustomer` customer on customer.name = profile.customer
		where {where_clause}
		order by field(profile.membership_rank, 'Black Diamond', 'Diamond', 'Gold', 'Silver', 'Bronze', 'Unassigned'),
		profile.total_spend desc, profile.average_bill desc, customer.customer_name asc
		limit %(limit)s offset %(offset)s""",
		values,
		as_dict=True,
	)
	for row in rows:
		digits = "".join(character for character in (row.phone or "") if character.isdigit())
		row.phone = f"•••• {digits[-4:]}" if digits else ""
		row.customer_name = _safe_customer_display_name(row.customer_name)
	return {
		"branch": branch,
		"customers": rows,
		"meta": page_meta(
			branch=branch, limit=page_size, offset=offset, returned=len(rows), total=cint(total)
		),
	}


@frappe.whitelist(methods=["GET"])
def get_manager_team(search=None, limit=100, cursor=0, branch=None):
	"""Return the active Employee roster for one branch, enriched with entertainer data when present."""
	actor = _people_actor()
	branch = _people_branch(actor, branch)
	page_size, offset = page_window(limit, cursor)
	search = (search or "").strip()
	filters = {"status": "Active", "branch": branch}
	or_filters = None
	if search:
		like = f"%{search}%"
		or_filters = {
			"employee_name": ("like", like),
			"designation": ("like", like),
			"department": ("like", like),
		}
	matching_employee_names = frappe.get_all(
		"Employee",
		filters=filters,
		or_filters=or_filters,
		pluck="name",
		limit_page_length=0,
		ignore_permissions=True,
	)
	total = len(matching_employee_names)
	employees = frappe.get_all(
		"Employee",
		filters=filters,
		or_filters=or_filters,
		fields=["name", "employee_name", "designation", "department", "branch", "status", "modified"],
		order_by="employee_name asc, name asc",
		limit_start=offset,
		limit_page_length=page_size,
		ignore_permissions=True,
	)
	employee_names = [row.name for row in employees]
	profiles = frappe.get_all(
		"VIP Entertainer Profile",
		filters={"employee": ("in", employee_names), "active": 1} if employee_names else {"name": ""},
		fields=["name", "employee", "stage_name", "current_rank"],
		ignore_permissions=True,
	)
	profiles_by_employee = {row.employee: row for row in profiles if row.employee}
	profile_names = [row.name for row in profiles]
	daily_rank_by_profile = current_daily_rank_by_profile(profile_names, get_all=frappe.get_all)
	work_date = getdate(today())
	assignments = frappe.get_all(
		"Shift Assignment",
		filters=[
			["employee", "in", employee_names],
			["docstatus", "=", 1],
			["status", "=", "Active"],
			["start_date", "<=", work_date],
		],
		or_filters=[["end_date", ">=", work_date], ["end_date", "is", "not set"]],
		fields=["name", "employee", "shift_type", "start_date", "end_date"],
		order_by="start_date desc, creation desc",
		ignore_permissions=True,
	) if employee_names else []
	assignment_by_employee = {}
	for assignment in assignments:
		assignment_by_employee.setdefault(assignment.employee, assignment)
	moment = now_datetime()
	attendance_work_date = getdate(moment)
	if moment.time() < time(12, 0):
		attendance_work_date -= timedelta(days=1)
	attendance_start = get_datetime(f"{attendance_work_date} 12:00:00")
	attendance_end = attendance_start + timedelta(days=1)
	checkins = frappe.get_all(
		"Employee Checkin",
		filters={"employee": ("in", employee_names), "time": ("between", [attendance_start, attendance_end])},
		fields=["name", "employee", "time", "log_type"],
		order_by="time asc, creation asc",
		limit_page_length=0,
		ignore_permissions=True,
	) if employee_names else []
	checkins_by_employee = {}
	for checkin in checkins:
		checkins_by_employee.setdefault(checkin.employee, []).append(checkin)
	late_after_time = str(get_branch_late_after_time(branch))
	members = []
	for employee in employees:
		profile = profiles_by_employee.get(employee.name)
		daily_rank = daily_rank_by_profile.get(profile.name) if profile else None
		daily_complete = bool(daily_rank and daily_rank.get("status") == "Complete")
		events = checkins_by_employee.get(employee.name, [])
		arrival = next((event for event in events if event.log_type == "IN"), None)
		departure = next((event for event in reversed(events) if event.log_type == "OUT"), None)
		approved_hourly_leave = bool(profile and has_approved_hourly_leave(entertainer=profile.name, work_date=attendance_work_date))
		leave_missed = bool(approved_hourly_leave and hourly_leave_counts_as_absence(
			attendance_work_date,
			arrival_time=arrival.time if arrival else None,
			moment=moment,
		))
		late_minutes = 0 if approved_hourly_leave else (late_minutes_after_cutoff(branch, attendance_work_date, arrival.time) if arrival else 0)
		attendance_state = "absent" if leave_missed else ("late" if late_minutes else ("checked_out" if departure else ("checked_in" if arrival else "not_arrived")))
		members.append({
			"employee": employee.name,
			"profile": profile.name if profile else None,
			"display_name": (profile.stage_name if profile else None) or employee.employee_name or employee.name,
			"role_label": employee.designation or employee.department or _("Багийн гишүүн"),
			"member_type": "Entertainer" if profile else "Employee",
			"rank": daily_rank.get("calculated_rank") if daily_complete else (profile.current_rank if profile else None),
			"approved_rank": profile.current_rank if profile else None,
			"daily_rank": daily_rank,
			"shift": assignment_by_employee.get(employee.name),
			"status": employee.status,
			"modified": employee.modified,
			"attendance": {
				"work_date": attendance_work_date,
				"state": attendance_state,
				"checked_in": bool(arrival),
				"checked_out": bool(departure),
				"arrival_time": arrival.time if arrival else None,
				"departure_time": departure.time if departure else None,
				"late_minutes": late_minutes,
				"late_after_time": str(hourly_leave_arrival_cutoff(attendance_work_date).time() if approved_hourly_leave else get_branch_late_after_time(branch)),
				"hourly_leave": approved_hourly_leave,
				"requires_checkout": not bool(profile),
			},
		})
	return {
		"branch": branch,
		"date": work_date,
		"members": members,
		"meta": {
			**page_meta(
				branch=branch, limit=page_size, offset=offset, returned=len(members), total=total
			),
			"entertainer_total": frappe.db.count(
				"VIP Entertainer Profile", {"branch": branch, "active": 1}
			),
		},
	}


@frappe.whitelist(methods=["GET"])
def get_unassigned_employees(search=None, limit=50, cursor=0):
	"""Return active Employees missing a Branch for the CEO data-quality queue."""
	require_actor("CEO", "HR Manager", "System Manager")
	page_size, offset = page_window(limit, cursor)
	search = (search or "").strip()
	conditions = ["status='Active'", "(branch is null or branch='')"]
	values = {}
	if search:
		conditions.append(
			"(employee_name like %(search)s or name like %(search)s "
			"or designation like %(search)s or department like %(search)s)"
		)
		values["search"] = f"%{search}%"
	where_clause = " and ".join(conditions)
	total = frappe.db.sql(
		f"select count(*) from `tabEmployee` where {where_clause}", values
	)[0][0]
	values.update({"limit": page_size, "offset": offset})
	rows = frappe.db.sql(
		f"""select name, employee_name, designation, department, company, status, modified
		from `tabEmployee` where {where_clause}
		order by employee_name asc, name asc
		limit %(limit)s offset %(offset)s""",
		values,
		as_dict=True,
	)
	return {
		"employees": rows,
		"branches": list(VIP_BRANCHES),
		"meta": page_meta(
			limit=page_size, offset=offset, returned=len(rows), total=cint(total)
		),
	}


@frappe.whitelist(methods=["POST"])
def assign_employee_branch(
	employee_name, branch, reason, expected_modified=None, idempotency_key=None
):
	"""Assign one previously unassigned active Employee to a confirmed VIP Branch."""
	actor = require_actor("CEO", "HR Manager", "System Manager")
	branch = (branch or "").strip()
	if branch not in VIP_BRANCHES:
		frappe.throw(_("Хүчинтэй VIP салбар сонгоно уу."), frappe.ValidationError)
	reason = (reason or "").strip()
	if len(reason) < 5:
		frappe.throw(_("Салбар оноосон үндэслэлийг 5-аас дээш тэмдэгтээр бичнэ үү."), frappe.ValidationError)
	idempotency_key = normalize_idempotency_key(idempotency_key)
	requested = {"employee": employee_name, "branch": branch, "reason": reason}
	frappe.db.sql("SELECT name FROM `tabEmployee` WHERE name=%s FOR UPDATE", employee_name)
	if idempotency_key:
		replay = _audit_replay(actor, "ceo.employee_branch.assign", idempotency_key)
		if replay:
			try:
				details = json.loads(replay.details or "{}")
			except (TypeError, ValueError):
				details = {}
			if replay.target_name != employee_name or details.get("requested") != requested:
				_throw_idempotency_mismatch()
			return {
				"employee": frappe.db.get_value(
					"Employee", employee_name,
					["name", "employee_name", "branch", "status", "modified"], as_dict=True,
				),
				"replayed": True,
			}
	employee = frappe.db.get_value(
		"Employee", employee_name,
		["name", "employee_name", "branch", "status", "modified"], as_dict=True,
	)
	if not employee or employee.status != "Active":
		frappe.throw(_("Идэвхтэй ажилтны бүртгэл олдсонгүй."), frappe.DoesNotExistError)
	if employee.branch:
		frappe.throw(_("Энэ ажилтанд салбар аль хэдийн оноогдсон байна."), frappe.ValidationError)
	profile_branch = frappe.db.get_value(
		"VIP Entertainer Profile", {"employee": employee.name, "active": 1}, "branch"
	)
	if profile_branch and profile_branch != branch:
		frappe.throw(
			_("Энтертайнерийн профайлын салбартай зөрж байна. Профайлын мэдээллийг эхлээд шалгана уу."),
			frappe.ValidationError,
		)
	assert_not_stale("Employee", employee.name, expected_modified)
	frappe.db.set_value("Employee", employee.name, "branch", branch, update_modified=True)
	updated = frappe.db.get_value(
		"Employee", employee.name,
		["name", "employee_name", "branch", "status", "modified"], as_dict=True,
	)
	record_api_audit(
		actor=actor,
		action="ceo.employee_branch.assign",
		target_doctype="Employee",
		target_name=employee.name,
		idempotency_key=idempotency_key,
		details={"requested": requested, "previous_branch": employee.branch},
	)
	frappe.db.commit()
	return {"employee": updated, "replayed": False}


@frappe.whitelist(methods=["GET"])
def get_employee_lifecycle_options(branch=None):
	"""Return the small, authoritative option set used by the employee lifecycle form."""
	actor = _people_actor()
	selected_branch = _people_branch(actor, branch)
	return {
		"branch": selected_branch,
		"branches": list(VIP_BRANCHES) if _is_people_global(actor) else [selected_branch],
		"companies": frappe.get_all(
			"Company", filters={"is_group": 0}, pluck="name", order_by="name asc", ignore_permissions=True
		),
		"designations": frappe.get_all(
			"Designation", pluck="name", order_by="name asc", ignore_permissions=True
		),
		"departments": frappe.get_all(
			"Department", filters={"is_group": 0}, pluck="name", order_by="name asc", ignore_permissions=True
		),
		"genders": frappe.get_all(
			"Gender", pluck="name", order_by="name asc", ignore_permissions=True
		),
		"today": today(),
	}


@frappe.whitelist(methods=["POST"])
def hire_employee(
	first_name,
	gender,
	date_of_birth,
	date_of_joining,
	company,
	designation,
	reason,
	branch=None,
	last_name=None,
	department=None,
	idempotency_key=None,
):
	"""Create one Employee master record without silently creating a login or entertainer profile."""
	actor = _people_actor()
	selected_branch = _people_branch(actor, branch)
	first_name = (first_name or "").strip()
	last_name = (last_name or "").strip()
	gender = (gender or "").strip()
	company = (company or "").strip()
	designation = (designation or "").strip()
	department = (department or "").strip()
	reason = (reason or "").strip()
	if not first_name:
		frappe.throw(_("Ажилтны нэрийг оруулна уу."), frappe.ValidationError)
	if not gender or not frappe.db.exists("Gender", gender):
		frappe.throw(_("Хүйсийн бүртгэл хүчин төгөлдөр биш байна."), frappe.ValidationError)
	if not company or not frappe.db.exists("Company", company):
		frappe.throw(_("Компаний бүртгэл хүчин төгөлдөр биш байна."), frappe.ValidationError)
	if not designation or not frappe.db.exists("Designation", designation):
		frappe.throw(_("Албан тушаалын бүртгэл хүчин төгөлдөр биш байна."), frappe.ValidationError)
	if department and not frappe.db.exists("Department", department):
		frappe.throw(_("Хэлтсийн бүртгэл хүчин төгөлдөр биш байна."), frappe.ValidationError)
	birth_date = getdate(date_of_birth)
	joining_date = getdate(date_of_joining)
	if birth_date >= joining_date:
		frappe.throw(_("Төрсөн огноо ажилд орсон огнооноос өмнө байна."), frappe.ValidationError)
	if len(reason) < 5:
		frappe.throw(_("Ажилд авсан үндэслэлийг 5-аас дээш тэмдэгтээр бичнэ үү."), frappe.ValidationError)
	idempotency_key = normalize_idempotency_key(idempotency_key)
	payload = {
		"first_name": first_name,
		"last_name": last_name,
		"gender": gender,
		"date_of_birth": str(birth_date),
		"date_of_joining": str(joining_date),
		"company": company,
		"designation": designation,
		"department": department,
		"branch": selected_branch,
		"reason": reason,
	}
	request_hash = _request_hash(payload)
	frappe.db.sql("SELECT name FROM `tabBranch` WHERE name=%s FOR UPDATE", selected_branch)
	replay = _audit_replay(actor, "employee.lifecycle.hire", idempotency_key)
	if replay:
		try:
			details = json.loads(replay.details or "{}")
		except (TypeError, ValueError):
			details = {}
		if details.get("request_hash") != request_hash or not replay.target_name:
			_throw_idempotency_mismatch()
		return {"employee": _employee_projection(replay.target_name), "replayed": True}
	full_name = " ".join(part for part in (first_name, last_name) if part)
	duplicate = frappe.db.get_value(
		"Employee",
		{"employee_name": full_name, "date_of_birth": birth_date, "status": "Active"},
		"name",
	)
	if duplicate:
		frappe.throw(
			_("Ижил нэр, төрсөн огноотой идэвхтэй ажилтан байна. Давхар бүртгэл эсэхийг шалгана уу."),
			frappe.DuplicateEntryError,
		)
	document = {
		"doctype": "Employee",
		"first_name": first_name,
		"last_name": last_name or None,
		"gender": gender,
		"date_of_birth": birth_date,
		"date_of_joining": joining_date,
		"company": company,
		"designation": designation,
		"department": department or None,
		"branch": selected_branch,
		"status": "Active",
	}
	employee = frappe.get_doc(document).insert(ignore_permissions=True)
	record_api_audit(
		actor=actor,
		action="employee.lifecycle.hire",
		target_doctype="Employee",
		target_name=employee.name,
		idempotency_key=idempotency_key,
		details={"request_hash": request_hash, "branch": selected_branch},
	)
	frappe.db.commit()
	return {"employee": _employee_projection(employee.name), "replayed": False}


@frappe.whitelist(methods=["POST"])
def terminate_employee(
	employee_name,
	relieving_date,
	reason,
	expected_modified=None,
	idempotency_key=None,
):
	"""End employment in place; preserve the master record and disable related access."""
	actor = _people_actor()
	reason = (reason or "").strip()
	if len(reason) < 5:
		frappe.throw(_("Ажлаас чөлөөлсөн үндэслэлийг 5-аас дээш тэмдэгтээр бичнэ үү."), frappe.ValidationError)
	end_date = getdate(relieving_date)
	idempotency_key = normalize_idempotency_key(idempotency_key)
	frappe.db.sql("SELECT name FROM `tabEmployee` WHERE name=%s FOR UPDATE", employee_name)
	employee = frappe.db.get_value(
		"Employee",
		employee_name,
		["name", "branch", "status", "date_of_joining", "user_id", "modified"],
		as_dict=True,
	)
	if not employee:
		frappe.throw(_("Ажилтны бүртгэл олдсонгүй."), frappe.DoesNotExistError)
	selected_branch = _people_branch(actor, employee.branch)
	if end_date < getdate(employee.date_of_joining):
		frappe.throw(_("Ажлаас чөлөөлөх огноо ажилд орсон огнооноос өмнө байж болохгүй."), frappe.ValidationError)
	payload = {
		"employee": employee.name,
		"branch": selected_branch,
		"relieving_date": str(end_date),
		"reason": reason,
	}
	request_hash = _request_hash(payload)
	replay = _audit_replay(actor, "employee.lifecycle.terminate", idempotency_key)
	if replay:
		try:
			details = json.loads(replay.details or "{}")
		except (TypeError, ValueError):
			details = {}
		if replay.target_name != employee.name or details.get("request_hash") != request_hash:
			_throw_idempotency_mismatch()
		return {"employee": _employee_projection(employee.name), "replayed": True}
	if employee.status != "Active":
		frappe.throw(_("Энэ ажилтан аль хэдийн идэвхгүй болсон байна."), frappe.ValidationError)
	assert_not_stale("Employee", employee.name, expected_modified)
	values = {"status": "Inactive", "relieving_date": end_date}
	if frappe.get_meta("Employee").has_field("reason_for_leaving"):
		values["reason_for_leaving"] = reason
	frappe.db.set_value("Employee", employee.name, values, update_modified=True)
	profile = frappe.db.get_value(
		"VIP Entertainer Profile", {"employee": employee.name}, ["name", "branch"], as_dict=True
	)
	if profile:
		if profile.branch and profile.branch != selected_branch:
			frappe.throw(_("Бүжигчний профайлын салбар ажилтны салбартай зөрж байна."), frappe.ValidationError)
		frappe.db.set_value(
			"VIP Entertainer Profile",
			profile.name,
			{"active": 0, "lifecycle_status": "Inactive"},
			update_modified=True,
		)
		assignments = frappe.get_all(
			"VIP Entertainer Branch Assignment",
			filters={"entertainer": profile.name, "assignment_status": ("in", ["Planned", "Active"])},
			fields=["name", "effective_from", "assignment_status"],
			ignore_permissions=True,
		)
		for assignment in assignments:
			if getdate(assignment.effective_from) > end_date:
				frappe.db.set_value(
					"VIP Entertainer Branch Assignment", assignment.name,
					"assignment_status", "Cancelled", update_modified=True,
				)
			else:
				frappe.db.set_value(
					"VIP Entertainer Branch Assignment", assignment.name,
					{"assignment_status": "Ended", "effective_to": end_date}, update_modified=True,
				)
	if employee.user_id and employee.user_id != "Administrator" and frappe.db.exists("User", employee.user_id):
		frappe.db.set_value("User", employee.user_id, "enabled", 0, update_modified=True)
		frappe.db.delete("Sessions", {"user": employee.user_id})
	record_api_audit(
		actor=actor,
		action="employee.lifecycle.terminate",
		target_doctype="Employee",
		target_name=employee.name,
		idempotency_key=idempotency_key,
		details={"request_hash": request_hash, "branch": selected_branch},
	)
	frappe.db.commit()
	return {"employee": _employee_projection(employee.name), "replayed": False}


@frappe.whitelist(methods=["GET"])
def get_manager_penalties(status="All", limit=50, cursor=0, branch=None):
	actor = _management_actor()
	branch = _branch(actor, branch)
	page_size, offset = page_window(limit, cursor)
	status = (status or "All").strip().title()
	allowed = {"All", "Pending Review", "Approved", "Rejected", "Reversed"}
	if status not in allowed:
		frappe.throw(_("Торгуулийн төлөв хүчин төгөлдөр биш байна."), frappe.ValidationError)
	filters = {"branch": branch}
	if status != "All":
		filters["status"] = status
	total = frappe.db.count("VIP Attendance Penalty", filters)
	rows = frappe.get_all(
		"VIP Attendance Penalty",
		filters=filters,
		fields=[
			"name", "entertainer", "employee", "attendance_date", "penalty_type",
			"late_minutes", "missed_rounds", "amount", "status", "reason", "decision_reason", "modified",
		],
		order_by="attendance_date desc, created_at desc",
		limit_start=offset,
		limit_page_length=page_size,
		ignore_permissions=True,
	)
	for row in rows:
		row["display_name"] = (
			frappe.db.get_value("VIP Entertainer Profile", row.entertainer, "stage_name") or row.entertainer
		)
	return {
		"branch": branch,
		"penalties": rows,
		"meta": page_meta(
			branch=branch, limit=page_size, offset=offset, returned=len(rows), total=total
		),
	}


@frappe.whitelist(methods=["GET"])
def get_branch_sales_progress(month=None, branch=None):
	"""Return source-backed sales summaries, item mix and recent paid Finex bills."""
	actor = _management_actor()
	branch = _branch(actor, branch)
	month_start = get_first_day(getdate(month or today()))
	month_end = get_last_day(month_start)
	reference_date = min(getdate(today()), getdate(month_end))
	yesterday = reference_date - timedelta(days=1)
	week_start = reference_date - timedelta(days=reference_date.weekday())
	previous_month_start = getdate(add_months(month_start, -1))
	previous_month_end = min(getdate(get_last_day(previous_month_start)), previous_month_start + (reference_date - getdate(month_start)))
	week_length = (reference_date - week_start).days
	previous_week_end = week_start - timedelta(days=1)
	previous_week_start = previous_week_end - timedelta(days=week_length)
	period_ranges = {
		"yesterday": (yesterday, yesterday),
		"week": (week_start, reference_date),
		"month": (getdate(month_start), reference_date),
	}
	comparison_ranges = {
		"yesterday": (yesterday - timedelta(days=1), yesterday - timedelta(days=1)),
		"week": (previous_week_start, previous_week_end),
		"month": (previous_month_start, previous_month_end),
	}
	earliest_date = min(start for start, _end in comparison_ranges.values())
	bills = frappe.get_all(
		"VIP POS Bill",
		filters={
			"is_paid": 1,
			"posting_date": ["between", [earliest_date, reference_date]],
			"store_name": ["like", f"%{branch}%"],
		},
		fields=[
			"name", "bill_code", "posting_date", "open_date", "closed_date", "store_name",
			"bill_type", "total_amount", "raw_payload", "last_synced_at",
		],
		order_by="posting_date desc, open_date desc, modified desc",
		limit_page_length=0,
		ignore_permissions=True,
	)

	def summarize_period(start, end, comparison_range):
		selected = [bill for bill in bills if start <= getdate(bill.posting_date) <= end]
		comparison_start, comparison_end = comparison_range
		comparison = [bill for bill in bills if comparison_start <= getdate(bill.posting_date) <= comparison_end]
		net_sales = 0.0
		gross_sales = 0.0
		sale_bill_count = 0
		refund_count = 0
		refund_amount = 0.0
		items = {}
		people = {}
		categories = {}
		daily = {}
		period_bills = []
		bills_with_items = 0
		bills_with_categories = 0
		for bill in selected:
			is_refund = cint(bill.bill_type) == 2
			sign = -1 if is_refund else 1
			amount = flt(bill.total_amount)
			net_sales += sign * amount
			day_key = str(getdate(bill.posting_date))
			day = daily.setdefault(day_key, {"net_sales": 0.0, "gross_sales": 0.0, "bill_count": 0, "refund_count": 0})
			day["net_sales"] += sign * amount
			if is_refund:
				refund_count += 1
				refund_amount += amount
				day["refund_count"] += 1
			else:
				gross_sales += amount
				sale_bill_count += 1
				day["gross_sales"] += amount
				day["bill_count"] += 1
			try:
				payload = json.loads(bill.raw_payload or "{}")
			except (TypeError, ValueError):
				payload = {}
			bill_items = []
			bill_has_category = False
			for item in payload.get("items") or []:
				name = (item.get("menuName") or _("Нэргүй бараа, үйлчилгээ")).strip()
				quantity = flt(item.get("quantity"))
				total = flt(item.get("total"))
				dancer_rows = []
				raw_dancers = [row for row in (item.get("dancers") or []) if isinstance(row, dict)]
				allocated_total = sum(max(flt(row.get("amount")), 0) for row in raw_dancers)
				for dancer in raw_dancers:
					display_name = str(
						dancer.get("dancerNickname") or dancer.get("dancerName")
						or dancer.get("nickname") or dancer.get("name") or _("Нэргүй ажилтан")
					).strip()
					allocated_amount = flt(dancer.get("amount"))
					attributed_sales = total * allocated_amount / allocated_total if allocated_total else 0
					dancer_key = str(
						dancer.get("dancerId") or dancer.get("dancerCode") or display_name.casefold()
					)
					person = people.setdefault(dancer_key, {
						"name": display_name, "sales_amount": 0.0, "employee_amount": 0.0,
						"service_count": 0, "bill_names": set(),
					})
					person["sales_amount"] += sign * attributed_sales
					person["employee_amount"] += sign * allocated_amount
					person["service_count"] += sign
					person["bill_names"].add(bill.name)
					dancer_rows.append({
						"name": display_name,
						"amount": round(sign * allocated_amount, 2),
						"sales_amount": round(sign * attributed_sales, 2),
					})
				bill_items.append({
					"name": name,
					"quantity": quantity,
					"total": sign * total,
					"dancers": dancer_rows,
				})
				# Finex adds a technical tax row to most bills. Keep it in bill detail,
				# but do not present it as a sold product in the ranked item mix.
				if name.casefold() == "tax":
					continue
				key = str(item.get("menuId") or name.casefold())
				row = items.setdefault(key, {
					"name": name, "quantity": 0.0, "net_sales": 0.0, "bill_names": set(),
				})
				row["quantity"] += sign * quantity
				row["net_sales"] += sign * total
				row["bill_names"].add(bill.name)
				category_name = (
					item.get("categoryName") or item.get("menuCategoryName")
					or item.get("itemCategory") or item.get("category")
				)
				if isinstance(category_name, dict):
					category_name = category_name.get("name") or category_name.get("label")
				category_name = str(category_name or "").strip()
				if category_name:
					bill_has_category = True
					category = categories.setdefault(category_name.casefold(), {
						"name": category_name, "quantity": 0.0, "net_sales": 0.0, "bill_names": set(),
					})
					category["quantity"] += sign * quantity
					category["net_sales"] += sign * total
					category["bill_names"].add(bill.name)
			if bill_items:
				bills_with_items += 1
			if bill_has_category:
				bills_with_categories += 1
			period_bills.append({
				"name": bill.name,
				"bill_code": bill.bill_code,
				"posting_date": bill.posting_date,
				"open_date": bill.open_date,
				"closed_date": bill.closed_date,
				"store_name": bill.store_name,
				"bill_type": cint(bill.bill_type),
				"total_amount": sign * amount,
				"items": bill_items,
			})
		top_items = sorted(
			(
				{
					"name": row["name"],
					"quantity": round(row["quantity"], 2),
					"net_sales": round(row["net_sales"], 2),
					"bill_count": len(row["bill_names"]),
				}
				for row in items.values()
				if row["net_sales"] != 0 or row["quantity"] != 0
			),
			key=lambda row: row["net_sales"],
			reverse=True,
		)
		people_rows = sorted(
			(
				{
					"name": row["name"],
					"sales_amount": round(row["sales_amount"], 2),
					"employee_amount": round(row["employee_amount"], 2),
					"service_count": max(cint(row["service_count"]), 0),
					"bill_count": len(row["bill_names"]),
				}
				for row in people.values()
				if row["sales_amount"] != 0 or row["employee_amount"] != 0
			),
			key=lambda row: row["sales_amount"],
			reverse=True,
		)
		category_rows = sorted(
			(
				{
					"name": row["name"],
					"quantity": round(row["quantity"], 2),
					"net_sales": round(row["net_sales"], 2),
					"bill_count": len(row["bill_names"]),
				}
				for row in categories.values()
				if row["net_sales"] != 0 or row["quantity"] != 0
			),
			key=lambda row: row["net_sales"],
			reverse=True,
		)[:8]
		daily_sales = []
		cursor = getdate(start)
		while cursor <= getdate(end):
			row = daily.get(str(cursor), {})
			daily_sales.append({
				"date": cursor,
				"net_sales": round(flt(row.get("net_sales")), 2),
				"gross_sales": round(flt(row.get("gross_sales")), 2),
				"bill_count": cint(row.get("bill_count")),
				"refund_count": cint(row.get("refund_count")),
			})
			cursor += timedelta(days=1)
		previous_net_sales = sum(
			(-1 if cint(bill.bill_type) == 2 else 1) * flt(bill.total_amount)
			for bill in comparison
		)
		return {
			"start_date": start,
			"end_date": end,
			"net_sales": round(net_sales, 2),
			"gross_sales": round(gross_sales, 2),
			"bill_count": sale_bill_count,
			"refund_count": refund_count,
			"refund_amount": round(refund_amount, 2),
			"average_bill": round(gross_sales / sale_bill_count, 2) if sale_bill_count else 0,
			"previous_net_sales": round(previous_net_sales, 2),
			"change_percent": round(((net_sales - previous_net_sales) / abs(previous_net_sales)) * 100, 1) if previous_net_sales else None,
			"daily_sales": daily_sales,
			"categories": category_rows,
			"category_detail_coverage": round((bills_with_categories / len(selected)) * 100, 1) if selected else None,
			"top_items": top_items,
			"people": people_rows,
			# Kept under the existing key for backward compatibility. The list now
			# contains every paid bill in the selected period, not only the newest eight.
			"recent_bills": period_bills,
			"bill_total": len(period_bills),
			"item_detail_coverage": round((bills_with_items / len(selected)) * 100, 1) if selected else None,
		}

	periods = {
		key: summarize_period(date_range[0], date_range[1], comparison_ranges[key])
		for key, date_range in period_ranges.items()
	}
	actual = flt(periods["month"]["net_sales"])
	goal = None
	if frappe.db.exists("DocType", "VIP Branch Sales Goal"):
		goal = frappe.db.get_value(
			"VIP Branch Sales Goal",
			{"branch": branch, "goal_month": month_start},
			[
				"name", "branch", "goal_month", "state", "version", "baseline_month",
				"baseline_amount", "proposed_target", "approved_target", "manager_rationale",
				"actions_json", "submitted_by", "submitted_at", "decision_by", "decision_at",
				"decision_comment", "modified",
			],
			as_dict=True,
			order_by="version desc",
		)
	active_goal = goal if goal and goal.state == "Active" else None
	target = flt(active_goal.approved_target) if active_goal else 0
	actual = flt(actual)
	return {
		"branch": branch,
		"month": str(month_start)[:7],
		"goal": goal,
		"active_goal": active_goal,
		"actual_sales": actual,
		"achievement_percent": round((actual / target) * 100, 2) if target else None,
		"remaining_amount": max(0, target - actual) if target else None,
		"periods": periods,
		"latest_paid_bill_date": max((bill.posting_date for bill in bills), default=None),
		"latest_synced_at": max((bill.last_synced_at for bill in bills if bill.last_synced_at), default=None),
		"actual_source": "VIP POS Bill / Finex paid sales",
		"metric_definition": "Төлөгдсөн Finex баримт; буцаалтыг хассан цэвэр борлуулалт; огноо нь posting_date.",
		"generated_at": now_datetime(),
	}


def _company_branch_snapshot(branch: str, month_start, month_end) -> dict:
	actual = _sales_actual(branch, month_start, month_end)
	goal = frappe.db.get_value(
		"VIP Branch Sales Goal",
		{"branch": branch, "goal_month": month_start},
		[
			"name", "branch", "goal_month", "state", "version", "baseline_month",
			"baseline_amount", "proposed_target", "approved_target", "manager_rationale",
			"actions_json", "submitted_by", "submitted_at", "decision_by", "decision_at",
			"decision_comment", "modified",
		],
		as_dict=True,
		order_by="version desc",
	) if frappe.db.exists("DocType", "VIP Branch Sales Goal") else None
	active_target = flt(goal.approved_target) if goal and goal.state == "Active" else 0
	customer_totals = frappe.db.sql(
		"""select count(*), coalesce(sum(total_spend), 0)
		from `tabVIP Customer Branch Profile` where branch=%s
		and (bill_count > 0 or visit_count > 0 or total_spend != 0)""",
		branch,
	)[0]
	penalty_totals = frappe.db.sql(
		"""select count(*), coalesce(sum(case when status='Approved' then amount else 0 end), 0)
		from `tabVIP Attendance Penalty` where branch=%s and attendance_date between %s and %s""",
		(branch, month_start, month_end),
	)[0]
	branch_employees = frappe.get_all(
		"Employee", filters={"branch": branch, "status": "Active"}, pluck="name", ignore_permissions=True
	)
	standard_pending_leave = frappe.db.count(
		"Leave Application",
		{"employee": ("in", branch_employees), "status": "Open", "docstatus": 0},
	) if branch_employees else 0
	return {
		"branch": branch,
		"actual_sales": actual,
		"active_target": active_target,
		"achievement_percent": round((actual / active_target) * 100, 2) if active_target else None,
		"remaining_amount": max(0, active_target - actual) if active_target else None,
		"goal": goal,
		"customers": cint(customer_totals[0]),
		"customer_total_spend": flt(customer_totals[1]),
		"active_team_members": frappe.db.count("Employee", {"branch": branch, "status": "Active"}),
		"active_entertainers": frappe.db.count("VIP Entertainer Profile", {"branch": branch, "active": 1}),
		"pending_leave": (
			frappe.db.count("VIP Emergency Leave Request", {"branch": branch, "status": "Pending"})
			+ standard_pending_leave
		),
		"pending_penalties": frappe.db.count("VIP Attendance Penalty", {"branch": branch, "status": "Pending Review"}),
		"monthly_penalty_records": cint(penalty_totals[0]),
		"approved_penalty_amount": flt(penalty_totals[1]),
	}


@frappe.whitelist(methods=["GET"])
def get_company_dashboard(month=None):
	"""Return one CEO-safe, cross-branch dashboard projection from live operational records."""
	actor = require_actor("CEO", "System Manager")
	month_start = get_first_day(getdate(month or today()))
	month_end = get_last_day(month_start)
	branches = [_company_branch_snapshot(branch, month_start, month_end) for branch in VIP_BRANCHES]
	unique_active_customers = frappe.db.sql(
		"""select count(distinct customer) from `tabVIP Customer Branch Profile`
		where bill_count > 0 or visit_count > 0 or total_spend != 0"""
	)[0][0]
	unassigned_active_employees = frappe.db.sql(
		"""select count(*) from `tabEmployee`
		where status='Active' and (branch is null or branch='')"""
	)[0][0]
	pending_goals = frappe.get_all(
		"VIP Branch Sales Goal",
		filters={"state": "Submitted"},
		fields=[
			"name", "branch", "goal_month", "state", "version", "baseline_month",
			"baseline_amount", "proposed_target", "approved_target", "manager_rationale",
			"actions_json", "submitted_by", "submitted_at", "decision_by", "decision_at",
			"decision_comment", "modified",
		],
		order_by="submitted_at asc, modified asc",
		ignore_permissions=True,
	) if frappe.db.exists("DocType", "VIP Branch Sales Goal") else []
	return {
		"month": str(month_start)[:7],
		"branches": branches,
		"pending_goals": pending_goals,
		"totals": {
			"actual_sales": sum(flt(row["actual_sales"]) for row in branches),
			"active_target": sum(flt(row["active_target"]) for row in branches),
			"customers": cint(unique_active_customers),
			"active_team_members": sum(cint(row["active_team_members"]) for row in branches),
			"active_entertainers": sum(cint(row["active_entertainers"]) for row in branches),
			"unassigned_active_employees": cint(unassigned_active_employees),
			"pending_leave": sum(cint(row["pending_leave"]) for row in branches),
			"pending_penalties": sum(cint(row["pending_penalties"]) for row in branches),
			"pending_goals": len(pending_goals),
		},
		"actor": actor.user,
		"generated_at": now_datetime(),
	}


def _sales_actual(branch, start, end) -> float:
	return flt(frappe.db.sql(
		"""select coalesce(sum(case when bill_type = 2 then -total_amount else total_amount end), 0)
		from `tabVIP POS Bill`
		where is_paid = 1 and posting_date between %s and %s and lower(coalesce(store_name, '')) like %s""",
		(start, end, f"%{branch.casefold()}%"),
	)[0][0])


def _actions_json(value) -> str:
	if isinstance(value, str):
		value = frappe.parse_json(value)
	if not isinstance(value, list):
		frappe.throw(_("Хэрэгжүүлэх ажлын жагсаалт массив байна."), frappe.ValidationError)
	for item in value:
		if not isinstance(item, dict) or not (item.get("title") or "").strip():
			frappe.throw(_("Хэрэгжүүлэх ажил бүр нэртэй байна."), frappe.ValidationError)
	return frappe.as_json(value)


@frappe.whitelist(methods=["POST"])
def save_sales_goal_proposal(
	month, proposed_target, rationale, actions, expected_modified=None, idempotency_key=None
):
	actor = require_actor("Branch Manager", require_branch=True)
	branch = actor.branch
	month_start = get_first_day(getdate(month))
	if month_start < get_first_day(getdate(today())):
		frappe.throw(_("Өнгөрсөн сарын зорилтыг өөрчлөх боломжгүй."), frappe.ValidationError)
	target = flt(proposed_target)
	if target <= 0:
		frappe.throw(_("Санал болгосон зорилт тэгээс их байна."), frappe.ValidationError)
	rationale = (rationale or "").strip()
	if len(rationale) < 10:
		frappe.throw(_("Зорилгын үндэслэлийг хамгийн багадаа 10 тэмдэгтээр бичнэ үү."), frappe.ValidationError)
	actions_json = _actions_json(actions)
	idempotency_key = normalize_idempotency_key(idempotency_key)
	unique_key = f"{branch}|{month_start}"
	requested = {
		"unique_key": unique_key,
		"proposed_target": target,
		"rationale": rationale,
		"actions": json.loads(actions_json),
	}
	replay = _replayed_goal(actor, "manager.sales_goal.save", idempotency_key, requested)
	if replay:
		return {"goal": replay.as_dict(), "replayed": True}
	name = frappe.db.get_value("VIP Branch Sales Goal", {"unique_key": unique_key}, "name")
	if name:
		frappe.db.sql("SELECT name FROM `tabVIP Branch Sales Goal` WHERE name=%s FOR UPDATE", name)
		doc = frappe.get_doc("VIP Branch Sales Goal", name)
		assert_not_stale(doc.doctype, doc.name, expected_modified)
		if doc.state not in ("Draft", "Revision Requested"):
			frappe.throw(_("Энэ зорилго одоогийн төлөвт засварлах боломжгүй."), frappe.ValidationError)
		doc.version = cint(doc.version) + 1
	else:
		baseline_month = get_first_day(add_months(month_start, -1))
		doc = frappe.get_doc({
			"doctype": "VIP Branch Sales Goal",
			"unique_key": unique_key,
			"branch": branch,
			"goal_month": month_start,
			"state": "Draft",
			"version": 1,
			"baseline_month": baseline_month,
			"baseline_amount": _sales_actual(branch, baseline_month, get_last_day(baseline_month)),
			"actual_source": "VIP POS Bill / Finex paid sales",
		})
	doc.proposed_target = target
	doc.manager_rationale = rationale
	doc.actions_json = actions_json
	doc.state = "Draft"
	if doc.is_new():
		doc.insert(ignore_permissions=True)
	else:
		doc.save(ignore_permissions=True)
	record_api_audit(
		actor=actor,
		action="manager.sales_goal.save",
		target_doctype=doc.doctype,
		target_name=doc.name,
		idempotency_key=idempotency_key,
		details={"requested": requested, "version": doc.version},
	)
	frappe.db.commit()
	return {"goal": doc.as_dict(), "replayed": False}


@frappe.whitelist(methods=["POST"])
def submit_sales_goal_proposal(goal_name, expected_modified=None, idempotency_key=None):
	actor = require_actor("Branch Manager", require_branch=True)
	idempotency_key = normalize_idempotency_key(idempotency_key)
	requested = {"goal_name": goal_name}
	replay = _replayed_goal(actor, "manager.sales_goal.submit", idempotency_key, requested)
	if replay:
		return {"goal": replay.as_dict(), "replayed": True}
	frappe.db.sql("SELECT name FROM `tabVIP Branch Sales Goal` WHERE name=%s FOR UPDATE", goal_name)
	doc = frappe.get_doc("VIP Branch Sales Goal", goal_name)
	if doc.branch != actor.branch:
		frappe.throw(_("Өөр салбарын зорилгыг илгээх эрхгүй байна."), frappe.PermissionError)
	assert_not_stale(doc.doctype, doc.name, expected_modified)
	if doc.state != "Draft":
		frappe.throw(_("Зөвхөн ноорог зорилгыг хяналтад илгээнэ."), frappe.ValidationError)
	doc.state = "Submitted"
	doc.submitted_by = actor.user
	doc.submitted_at = now_datetime()
	doc.save(ignore_permissions=True)
	record_api_audit(
		actor=actor,
		action="manager.sales_goal.submit",
		target_doctype=doc.doctype,
		target_name=doc.name,
		idempotency_key=idempotency_key,
		details={"requested": requested, "version": doc.version},
	)
	frappe.db.commit()
	return {"goal": doc.as_dict(), "replayed": False}


@frappe.whitelist(methods=["POST"])
def decide_sales_goal(
	goal_name,
	decision,
	comment="",
	expected_modified=None,
	idempotency_key=None,
	approved_target=None,
):
	actor = require_actor("CEO", "System Manager")
	decision = (decision or "").strip().lower()
	if decision not in ("approve", "revision", "reject"):
		frappe.throw(_("Шийдвэр хүчин төгөлдөр биш байна."), frappe.ValidationError)
	comment = (comment or "").strip()
	if decision != "approve" and len(comment) < 5:
		frappe.throw(_("Буцаах эсвэл татгалзах тайлбар шаардлагатай."), frappe.ValidationError)
	idempotency_key = normalize_idempotency_key(idempotency_key)
	approved_amount = None
	if decision == "approve":
		approved_amount = flt(approved_target) if approved_target not in (None, "") else None
	requested = {
		"goal_name": goal_name,
		"decision": decision,
		"comment": comment,
		"approved_target": approved_amount,
	}
	replay = _replayed_goal(actor, "ceo.sales_goal.decide", idempotency_key, requested)
	if replay:
		return {"goal": replay.as_dict(), "replayed": True}
	frappe.db.sql("SELECT name FROM `tabVIP Branch Sales Goal` WHERE name=%s FOR UPDATE", goal_name)
	doc = frappe.get_doc("VIP Branch Sales Goal", goal_name)
	assert_not_stale(doc.doctype, doc.name, expected_modified)
	if doc.state != "Submitted":
		frappe.throw(_("Зөвхөн хяналтад ирсэн зорилгыг шийдвэрлэнэ."), frappe.ValidationError)
	if decision == "approve":
		try:
			approved_amount = approved_target_amount(doc.proposed_target, approved_amount)
		except ValueError:
			frappe.throw(_("Батлах зорилгын дүн тэгээс их байна."), frappe.ValidationError)
	doc.version = cint(doc.version) + 1
	doc.decision_by = actor.user
	doc.decision_at = now_datetime()
	doc.decision_comment = comment
	if decision == "approve":
		doc.state = "Active"
		doc.approved_target = approved_amount
		doc.effective_from = doc.goal_month
		doc.effective_to = get_last_day(doc.goal_month)
	else:
		doc.state = "Revision Requested" if decision == "revision" else "Rejected"
		doc.approved_target = 0
	doc.save(ignore_permissions=True)
	record_api_audit(
		actor=actor,
		action="ceo.sales_goal.decide",
		target_doctype=doc.doctype,
		target_name=doc.name,
		idempotency_key=idempotency_key,
		details={"requested": requested, "version": doc.version},
	)
	frappe.db.commit()
	return {"goal": doc.as_dict(), "replayed": False}
