import frappe
from frappe.utils import today

from nomad_vip.provisioning import bootstrap_user_fields
from nomad_vip.entertainer_ranks import ENTERTAINER_RANKS, LEGACY_ENTERTAINER_RANK_MAP


ROLES = (
	"Entertainer",
	"Lead Entertainer",
	"Entertainer Supervisor",
	"Bartender",
	"Server",
	"Branch Manager",
	"CEO",
	"Accountant",
	"Reception",
	"Operation",
	"VIP Admin",
)

BARTENDER_DESIGNATIONS = ("Бармен", "Bartender", "Barmen")
SERVER_DESIGNATIONS = ("Зөөгч", "Server", "Waiter")

RANKS = ENTERTAINER_RANKS


def ensure_roles():
	for role_name in ROLES:
		if not frappe.db.exists("Role", role_name):
			frappe.get_doc({"doctype": "Role", "role_name": role_name, "desk_access": 1}).insert(
				ignore_permissions=True
			)


def _ensure_employee_role(role: str, designations: tuple[str, ...]):
	"""Grant one scoped staff-app role to linked active employees."""
	assigned = []
	for row in frappe.get_all(
		"Employee",
		filters={
			"status": "Active",
			"designation": ("in", designations),
			"user_id": ("is", "set"),
		},
		fields=["name", "user_id"],
		ignore_permissions=True,
	):
		user_name = (row.user_id or "").strip()
		if not user_name or user_name in {"Administrator", "Guest"} or not frappe.db.exists("User", user_name):
			continue
		if role in frappe.get_roles(user_name):
			continue
		user = frappe.get_doc("User", user_name)
		user.append("roles", {"role": role})
		user.save(ignore_permissions=True)
		assigned.append(user_name)
	return {"assigned": assigned}


def ensure_bartender_roles():
	"""Grant the scoped staff-app role to linked active bartender employees."""
	return _ensure_employee_role("Bartender", BARTENDER_DESIGNATIONS)


def ensure_server_roles():
	"""Grant the scoped staff-app role to linked active server employees."""
	return _ensure_employee_role("Server", SERVER_DESIGNATIONS)


def after_migrate():
	ensure_roles()
	from nomad_vip.desk_policy import ensure_desk_policy
	from nomad_vip.integrations.finex import ensure_crm_fields
	ensure_crm_fields()
	seed_ranks()
	seed_default_policy()
	seed_customer_rank_rules()
	normalize_customer_rank_rules()
	ensure_database_indexes()
	ensure_operation_accounts()
	ensure_admin_account()
	ensure_bartender_roles()
	ensure_server_roles()
	ensure_desk_policy()
	frappe.db.commit()


def ensure_database_indexes():
	if frappe.db.exists("DocType", "VIP Customer Point Ledger"):
		frappe.db.add_index("VIP Customer Point Ledger", ["customer", "posted_at"])
		frappe.db.add_index("VIP Customer Point Ledger", ["vip_pos_bill", "transaction_type"])
	if frappe.db.exists("DocType", "VIP Daily Readiness Check"):
		frappe.db.add_unique(
			"VIP Daily Readiness Check",
			["entertainer", "shift_assignment"],
			"uniq_entertainer_shift_readiness",
		)
	if frappe.db.exists("DocType", "VIP Reservation"):
		frappe.db.add_index("VIP Reservation", ["entertainer", "starts_at", "status"])
	if frappe.db.exists("DocType", "VIP Availability Event"):
		frappe.db.add_index("VIP Availability Event", ["entertainer", "work_date", "occurred_at"])
	if frappe.db.exists("DocType", "VIP Attendance Correction Request"):
		frappe.db.add_index("VIP Attendance Correction Request", ["branch", "status", "requested_at"])
	if frappe.db.exists("DocType", "VIP Branch Sales Goal"):
		frappe.db.add_unique(
			"VIP Branch Sales Goal",
			["branch", "goal_month"],
			"uniq_branch_goal_month",
		)
	if frappe.db.exists("DocType", "VIP Entertainer Branch Assignment"):
		frappe.db.add_index(
			"VIP Entertainer Branch Assignment",
			["entertainer", "assignment_status", "effective_from", "effective_to"],
			"idx_entertainer_assignment_window",
		)
	if frappe.db.exists("DocType", "VIP Team Climate Feedback"):
		frappe.db.add_index(
			"VIP Team Climate Feedback",
			["branch", "submitted_at"],
			"idx_team_climate_branch_submitted",
		)
	if frappe.db.exists("DocType", "VIP Entertainer Daily Rank Snapshot"):
		frappe.db.add_index(
			"VIP Entertainer Daily Rank Snapshot",
			["entertainer", "scoring_date", "policy_version"],
			"idx_daily_rank_entertainer_date",
		)
	if frappe.db.exists("DocType", "VIP Performance Event"):
		frappe.db.add_index(
			"VIP Performance Event",
			["entertainer", "ranking_component", "scoring_date"],
			"idx_rank_component_date",
		)
	if frappe.db.exists("DocType", "VIP Phone Reservation"):
		frappe.db.add_index(
			"VIP Phone Reservation",
			["branch", "expected_at", "status"],
			"idx_phone_reservation_workday",
		)
		frappe.db.add_index(
			"VIP Phone Reservation",
			["phone", "branch", "status", "expected_at"],
			"idx_phone_reservation_active_guest",
		)
	if frappe.db.exists("DocType", "VIP Customer Entry Event"):
		frappe.db.add_index(
			"VIP Customer Entry Event",
			["branch", "entered_at"],
			"idx_customer_entry_workday",
		)
		frappe.db.add_index(
			"VIP Customer Entry Event",
			["customer", "branch", "entered_at"],
			"idx_customer_entry_sequence",
		)


def seed_ranks():
	if not frappe.db.exists("DocType", "VIP Rank Definition"):
		return

	for values in RANKS:
		if frappe.db.exists("VIP Rank Definition", values["code"]):
			frappe.db.set_value(
				"VIP Rank Definition",
				values["code"],
				{**values, "active": 1},
				update_modified=False,
			)
		else:
			frappe.get_doc(
				{
					"doctype": "VIP Rank Definition",
					**values,
					"active": 1,
				}
			).insert(ignore_permissions=True)
	for legacy_name in LEGACY_ENTERTAINER_RANK_MAP:
		if frappe.db.exists("VIP Rank Definition", legacy_name):
			frappe.db.set_value(
				"VIP Rank Definition", legacy_name, "active", 0, update_modified=False
			)


def seed_default_policy():
	if not frappe.db.exists("DocType", "VIP Ranking Policy"):
		return
	if frappe.db.exists("VIP Ranking Policy", {"status": "Published"}):
		return

	frappe.get_doc(
		{
			"doctype": "VIP Ranking Policy",
			"version": "DAILY-8-FACTOR-V1",
			"effective_from": frappe.utils.today(),
			"status": "Published",
			"evaluation_mode": "Active",
			"daily_scoring_enabled": 1,
			"evaluation_window_days": 1,
			"evaluation_cadence": "Daily",
			"attendance_weight": 10,
			"customer_complaints_weight": 15,
			"sales_weight": 40,
			"entertaining_skill_weight": 5,
			"cleanliness_beauty_weight": 5,
			"shift_effort_weight": 10,
			"personal_development_weight": 5,
			"entertainer_attitude_weight": 10,
			"rank_1_threshold": 90,
			"rank_2_threshold": 80,
			"rank_3_threshold": 70,
			"ready_points": 5,
			"not_ready_points": -10,
			"notes": "Өдөр бүрийн 8 үзүүлэлтээр тооцно. Дутуу өгөгдлийг 0 гэж таамаглахгүй.",
		}
	).insert(ignore_permissions=True)


def seed_customer_rank_rules():
	if not frappe.db.exists("DocType", "VIP Customer Rank Rule"):
		return
	from nomad_vip.integrations.finex import VIP_BRANCHES
	defaults = (
		("Bronze", 1, 0, 0, 0),
		("Silver", 2, 0, 0, 50000),
		("Gold", 3, 0, 0, 100000),
		("Diamond", 4, 0, 0, 200000),
		("Black Diamond", 5, 0, 0, 300000),
	)
	for branch in VIP_BRANCHES:
		for rank, order, spend, visits, average in defaults:
			if frappe.db.exists("VIP Customer Rank Rule", {"branch": branch, "membership_rank": rank}):
				continue
			frappe.get_doc({
				"doctype": "VIP Customer Rank Rule",
				"branch": branch,
				"membership_rank": rank,
				"rank_order": order,
				"minimum_total_spend": spend,
				"minimum_visit_count": visits,
				"minimum_average_bill": average,
				"active": 1,
			}).insert(ignore_permissions=True)


def normalize_customer_rank_rules():
	if not frappe.db.exists("DocType", "VIP Customer Rank Rule"):
		return
	for name in frappe.get_all("VIP Customer Rank Rule", pluck="name"):
		frappe.db.set_value(
			"VIP Customer Rank Rule",
			name,
			{"minimum_total_spend": 0, "minimum_visit_count": 0},
			update_modified=False,
		)


def ensure_admin_account():
	email = "admin@vipclub.local"
	if not frappe.db.exists("User", email):
		frappe.get_doc({
			"doctype": "User",
			"email": email,
			"first_name": "VIP System Admin",
			**bootstrap_user_fields(email),
			"roles": [{"role": "VIP Admin"}],
		}).insert(ignore_permissions=True)
	elif "VIP Admin" not in frappe.get_roles(email):
		user = frappe.get_doc("User", email)
		user.append("roles", {"role": "VIP Admin"})
		user.save(ignore_permissions=True)
	return email


def ensure_guard_accounts():
	from nomad_vip.integrations.finex import VIP_BRANCHES, ensure_vip_branches
	ensure_vip_branches()
	company = frappe.defaults.get_global_default("company") or frappe.db.get_value("Company", {}, "name")
	created = []
	for branch in VIP_BRANCHES:
		email = f"guard.{branch.lower()}@vipclub.local"
		if not frappe.db.exists("User", email):
			user = frappe.get_doc({
				"doctype": "User", "email": email, "first_name": f"{branch} Guard",
				**bootstrap_user_fields(email),
				"roles": [{"role": "Reception"}],
			}).insert(ignore_permissions=True)
			created.append(user.name)
		elif "Reception" not in frappe.get_roles(email):
			user = frappe.get_doc("User", email)
			user.append("roles", {"role": "Reception"})
			user.save(ignore_permissions=True)
		employee = frappe.db.get_value("Employee", {"user_id": email}, "name")
		if employee:
			frappe.db.set_value("Employee", employee, "branch", branch)
		else:
			frappe.get_doc({
				"doctype": "Employee", "first_name": f"{branch} Guard", "gender": "Male",
				"date_of_birth": "1990-01-01", "date_of_joining": today(), "company": company,
				"status": "Active", "branch": branch, "user_id": email,
			}).insert(ignore_permissions=True)
	frappe.db.commit()
	return {"created": created, "accounts": [f"guard.{branch.lower()}@vipclub.local" for branch in VIP_BRANCHES]}


def ensure_entry_manager_accounts():
	from nomad_vip.integrations.finex import VIP_BRANCHES, ensure_vip_branches
	ensure_vip_branches()
	company = frappe.defaults.get_global_default("company") or frappe.db.get_value("Company", {}, "name")
	created = []
	for branch in VIP_BRANCHES:
		email = f"manager.{branch.lower()}@vipclub.local"
		if not frappe.db.exists("User", email):
			frappe.get_doc({
				"doctype": "User", "email": email, "first_name": f"{branch} Manager",
				**bootstrap_user_fields(email),
				"roles": [{"role": "Branch Manager"}],
			}).insert(ignore_permissions=True)
			created.append(email)
		elif "Branch Manager" not in frappe.get_roles(email):
			user = frappe.get_doc("User", email)
			user.append("roles", {"role": "Branch Manager"})
			user.save(ignore_permissions=True)
		employee = frappe.db.get_value("Employee", {"user_id": email}, "name")
		if employee:
			frappe.db.set_value("Employee", employee, "branch", branch)
		else:
			frappe.get_doc({
				"doctype": "Employee", "first_name": f"{branch} Manager", "gender": "Male",
				"date_of_birth": "1990-01-01", "date_of_joining": today(), "company": company,
				"status": "Active", "branch": branch, "user_id": email,
			}).insert(ignore_permissions=True)
	frappe.db.commit()
	return {"created": created, "accounts": [f"manager.{branch.lower()}@vipclub.local" for branch in VIP_BRANCHES]}


def ensure_operation_accounts():
	from nomad_vip.integrations.finex import VIP_BRANCHES, ensure_vip_branches
	ensure_vip_branches()
	email = "operation@vipclub.local"
	created = False
	if not frappe.db.exists("User", email):
		frappe.get_doc({
			"doctype": "User", "email": email, "first_name": "VIP Operation",
			**bootstrap_user_fields(email),
			"roles": [{"role": "Operation"}],
		}).insert(ignore_permissions=True)
		created = True
	else:
		if "Operation" not in frappe.get_roles(email):
			user = frappe.get_doc("User", email)
			user.append("roles", {"role": "Operation"})
			user.save(ignore_permissions=True)

	# The product has one central operator. Retire the old branch-specific logins
	# so reservations cannot accidentally be entered under the wrong workflow.
	for branch in VIP_BRANCHES:
		legacy_email = f"operation.{branch.lower()}@vipclub.local"
		if frappe.db.exists("User", legacy_email):
			frappe.db.set_value("User", legacy_email, "enabled", 0)
	frappe.db.commit()
	return {"created": created, "account": email, "retired_accounts": [f"operation.{branch.lower()}@vipclub.local" for branch in VIP_BRANCHES]}
