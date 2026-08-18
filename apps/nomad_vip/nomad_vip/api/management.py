from __future__ import annotations

import json
import re

import frappe
from frappe import _
from frappe.utils import add_months, cint, flt, get_first_day, get_last_day, getdate, now_datetime, today

from nomad_vip.api.security import (
	assert_not_stale,
	normalize_idempotency_key,
	page_meta,
	page_window,
	record_api_audit,
	require_actor,
)
from nomad_vip.integrations.finex import VIP_BRANCHES


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


def _is_global(actor) -> bool:
	return actor.user == "Administrator" or bool(actor.roles.intersection({"CEO", "System Manager"}))


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
def get_session():
	"""Return a minimal management session derived only from the Frappe identity."""
	if not frappe.session.user or frappe.session.user == "Guest":
		return {"authenticated": False}
	actor = _management_actor()
	global_access = _is_global(actor)
	role = "CEO" if global_access else "Branch Manager"
	csrf_token = frappe.sessions.get_csrf_token() if getattr(frappe.local, "session_obj", None) else None
	return {
		"authenticated": True,
		"user": actor.user,
		"display_name": frappe.utils.get_fullname(actor.user),
		"role": role,
		"branch": actor.branch,
		"branches": list(VIP_BRANCHES) if global_access else [actor.branch],
		"capabilities": {
			"company_wide": global_access,
			"manage_schedule": not global_access,
			"decide_leave": not global_access,
			"read_penalties": True,
			"search_customers": True,
			"approve_sales_goal": global_access,
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
	total = frappe.db.sql(
		f"""select count(*) from `tabVIP Customer Branch Profile` profile
		inner join `tabCustomer` customer on customer.name = profile.customer
		where {where_clause}""",
		values,
	)[0][0]
	values.update({"limit": page_size, "offset": offset})
	rows = frappe.db.sql(
		f"""select profile.name, customer.customer_name,
		coalesce(nullif(customer.mobile_no, ''), customer.custom_finex_phone, '') as phone,
		profile.membership_rank, profile.visit_count, profile.bill_count,
		profile.total_spend, profile.average_bill, profile.first_visit, profile.last_visit
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
	actor = _management_actor()
	branch = _branch(actor, branch)
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
		fields=["name", "employee_name", "designation", "department", "branch", "status"],
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
	members = []
	for employee in employees:
		profile = profiles_by_employee.get(employee.name)
		members.append({
			"employee": employee.name,
			"profile": profile.name if profile else None,
			"display_name": (profile.stage_name if profile else None) or employee.employee_name or employee.name,
			"role_label": employee.designation or employee.department or _("Багийн гишүүн"),
			"member_type": "Entertainer" if profile else "Employee",
			"rank": profile.current_rank if profile else None,
			"shift": assignment_by_employee.get(employee.name),
			"status": employee.status,
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
	require_actor("CEO", "System Manager")
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
	actor = require_actor("CEO", "System Manager")
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
			"late_minutes", "amount", "status", "reason", "decision_reason", "modified",
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
	"""Return reconciled branch actuals and an approved goal when that DocType exists."""
	actor = _management_actor()
	branch = _branch(actor, branch)
	month_start = get_first_day(getdate(month or today()))
	month_end = get_last_day(month_start)
	actual = frappe.db.sql(
		"""select coalesce(sum(total_amount), 0) from `tabVIP POS Bill`
		where is_paid = 1 and posting_date between %s and %s and lower(coalesce(store_name, '')) like %s""",
		(month_start, month_end, f"%{branch.casefold()}%"),
	)[0][0]
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
		"actual_source": "VIP POS Bill / Finex paid sales",
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
		"""select coalesce(sum(total_amount), 0) from `tabVIP POS Bill`
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
def decide_sales_goal(goal_name, decision, comment="", expected_modified=None, idempotency_key=None):
	actor = require_actor("CEO", "System Manager")
	decision = (decision or "").strip().lower()
	if decision not in ("approve", "revision", "reject"):
		frappe.throw(_("Шийдвэр хүчин төгөлдөр биш байна."), frappe.ValidationError)
	comment = (comment or "").strip()
	if decision != "approve" and len(comment) < 5:
		frappe.throw(_("Буцаах эсвэл татгалзах тайлбар шаардлагатай."), frappe.ValidationError)
	idempotency_key = normalize_idempotency_key(idempotency_key)
	requested = {"goal_name": goal_name, "decision": decision, "comment": comment}
	replay = _replayed_goal(actor, "ceo.sales_goal.decide", idempotency_key, requested)
	if replay:
		return {"goal": replay.as_dict(), "replayed": True}
	frappe.db.sql("SELECT name FROM `tabVIP Branch Sales Goal` WHERE name=%s FOR UPDATE", goal_name)
	doc = frappe.get_doc("VIP Branch Sales Goal", goal_name)
	assert_not_stale(doc.doctype, doc.name, expected_modified)
	if doc.state != "Submitted":
		frappe.throw(_("Зөвхөн хяналтад ирсэн зорилгыг шийдвэрлэнэ."), frappe.ValidationError)
	doc.decision_by = actor.user
	doc.decision_at = now_datetime()
	doc.decision_comment = comment
	if decision == "approve":
		doc.state = "Active"
		doc.approved_target = doc.proposed_target
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
