app_name = "nomad_vip"
app_title = "NOMAD VIP"
app_publisher = "NOMAD"
app_description = "NOMAD VIP Entertainer Platform"
app_email = "admin@nomad.local"
app_license = "mit"

required_apps = ["erpnext", "hrms"]

before_migrate = "nomad_vip.install.ensure_roles"
after_migrate = "nomad_vip.install.after_migrate"

permission_query_conditions = {
	"VIP Entertainer Profile": "nomad_vip.permissions.core.get_profile_query_conditions",
	"VIP Entertainer Branch Assignment": "nomad_vip.permissions.core.get_branch_assignment_query_conditions",
	"VIP Branch Attendance QR": "nomad_vip.permissions.core.get_branch_attendance_qr_query_conditions",
	"VIP Attendance Scan": "nomad_vip.permissions.core.get_attendance_scan_query_conditions",
	"VIP Emergency Leave Request": "nomad_vip.permissions.core.get_emergency_leave_query_conditions",
	"VIP Attendance Penalty": "nomad_vip.permissions.core.get_attendance_penalty_query_conditions",
	"VIP Availability Event": "nomad_vip.permissions.core.get_availability_event_query_conditions",
	"VIP Attendance Correction Request": "nomad_vip.permissions.core.get_attendance_correction_query_conditions",
	"VIP Entertainer Profile Change Request": "nomad_vip.permissions.core.get_profile_change_request_query_conditions",
	"VIP Finex Entertainer Candidate": "nomad_vip.permissions.core.get_finex_candidate_query_conditions",
	"VIP Finex Schedule Snapshot": "nomad_vip.permissions.core.get_finex_schedule_query_conditions",
	"VIP Daily Readiness Check": "nomad_vip.permissions.core.get_readiness_query_conditions",
	"VIP Performance Event": "nomad_vip.permissions.core.get_performance_event_query_conditions",
	"VIP Point Ledger": "nomad_vip.permissions.core.get_point_ledger_query_conditions",
	"VIP Rank History": "nomad_vip.permissions.core.get_rank_history_query_conditions",
	"VIP Entertainer Daily Rank Snapshot": "nomad_vip.permissions.core.get_daily_rank_snapshot_query_conditions",
	"VIP Reservation": "nomad_vip.permissions.core.get_reservation_query_conditions",
	"VIP Customer Entry Event": "nomad_vip.permissions.core.get_entry_event_query_conditions",
	"VIP Phone Reservation": "nomad_vip.permissions.core.get_phone_reservation_query_conditions",
	"VIP Customer Point Ledger": "nomad_vip.permissions.core.get_customer_point_ledger_query_conditions",
	"VIP POS Bill": "nomad_vip.permissions.core.get_pos_bill_query_conditions",
	"VIP Customer Branch Profile": "nomad_vip.permissions.core.get_customer_branch_profile_query_conditions",
	"VIP Team Climate Feedback": "nomad_vip.permissions.core.get_team_climate_feedback_query_conditions",
}

has_permission = {
	"VIP Entertainer Profile": "nomad_vip.permissions.core.has_profile_permission",
	"VIP Entertainer Branch Assignment": "nomad_vip.permissions.core.has_branch_assignment_permission",
	"VIP Branch Attendance QR": "nomad_vip.permissions.core.has_branch_attendance_qr_permission",
	"VIP Attendance Scan": "nomad_vip.permissions.core.has_attendance_scan_permission",
	"VIP Emergency Leave Request": "nomad_vip.permissions.core.has_emergency_leave_permission",
	"VIP Attendance Penalty": "nomad_vip.permissions.core.has_attendance_penalty_permission",
	"VIP Availability Event": "nomad_vip.permissions.core.has_availability_event_permission",
	"VIP Attendance Correction Request": "nomad_vip.permissions.core.has_attendance_correction_permission",
	"VIP Entertainer Profile Change Request": "nomad_vip.permissions.core.has_profile_change_request_permission",
	"VIP Finex Entertainer Candidate": "nomad_vip.permissions.core.has_finex_candidate_permission",
	"VIP Finex Schedule Snapshot": "nomad_vip.permissions.core.has_finex_schedule_permission",
	"VIP Daily Readiness Check": "nomad_vip.permissions.core.has_readiness_permission",
	"VIP Performance Event": "nomad_vip.permissions.core.has_entertainer_record_permission",
	"VIP Point Ledger": "nomad_vip.permissions.core.has_entertainer_record_permission",
	"VIP Rank History": "nomad_vip.permissions.core.has_entertainer_record_permission",
	"VIP Entertainer Daily Rank Snapshot": "nomad_vip.permissions.core.has_entertainer_record_permission",
	"VIP Reservation": "nomad_vip.permissions.core.has_reservation_permission",
	"VIP Customer Entry Event": "nomad_vip.permissions.core.has_entry_event_permission",
	"VIP Phone Reservation": "nomad_vip.permissions.core.has_phone_reservation_permission",
	"VIP Customer Point Ledger": "nomad_vip.permissions.core.has_customer_point_ledger_permission",
	"VIP POS Bill": "nomad_vip.permissions.core.has_pos_bill_permission",
	"VIP Customer Branch Profile": "nomad_vip.permissions.core.has_customer_branch_profile_permission",
	"VIP Team Climate Feedback": "nomad_vip.permissions.core.has_team_climate_feedback_permission",
}

doc_events = {
	"Employee": {
		"on_update": "nomad_vip.phone_login.sync_employee_phone_login",
	},
}

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "nomad_vip",
# 		"logo": "/assets/nomad_vip/logo.png",
# 		"title": "NOMAD VIP",
# 		"route": "/nomad_vip",
# 		"has_permission": "nomad_vip.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/nomad_vip/css/nomad_vip.css"
# app_include_js = "/assets/nomad_vip/js/nomad_vip.js"

# include js, css files in header of web template
# web_include_css = "/assets/nomad_vip/css/nomad_vip.css"
# web_include_js = "/assets/nomad_vip/js/nomad_vip.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "nomad_vip/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
doctype_js = {"Customer": "public/js/customer_vip.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "nomad_vip/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# automatically load and sync documents of this doctype from downstream apps
# importable_doctypes = [doctype_1]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "nomad_vip.utils.jinja_methods",
# 	"filters": "nomad_vip.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "nomad_vip.install.before_install"
# after_install = "nomad_vip.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "nomad_vip.uninstall.before_uninstall"
# after_uninstall = "nomad_vip.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "nomad_vip.utils.before_app_install"
# after_app_install = "nomad_vip.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "nomad_vip.utils.before_app_uninstall"
# after_app_uninstall = "nomad_vip.utils.after_app_uninstall"

# Build
# ------------------
# To hook into the build process

# after_build = "nomad_vip.build.after_build"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "nomad_vip.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"nomad_vip.tasks.all"
# 	],
# 	"daily": [
# 		"nomad_vip.tasks.daily"
# 	],
# 	"hourly": [
# 		"nomad_vip.tasks.hourly"
# 	],
# 	"weekly": [
# 		"nomad_vip.tasks.weekly"
# 	],
# 	"monthly": [
# 		"nomad_vip.tasks.monthly"
# 	],
# }

scheduler_events = {
	"hourly": [
		"nomad_vip.api.attendance_policy.finalize_absences",
		"nomad_vip.api.stage_rounds.finalize_stage_round_penalties",
	],
	"daily": ["nomad_vip.tasks.media_retention.process_due_media_retention"],
	"cron": {
		# Site/server time is Asia/Ulaanbaatar. Pull the previous seven days again
		# every morning so delayed or corrected POS bills remain idempotently synced.
		"0 8 * * *": ["nomad_vip.integrations.finex.sync_recent_sales"],
		# Build one immutable, source-backed eight-factor snapshot for the previous
		# scheduled workday. This is the only automatic rank calculation path.
		# Missing inputs stay unresolved instead of becoming zero.
		"0 9 * * *": ["nomad_vip.tasks.daily_rank.refresh_daily_rankings"],
		# Persist one in-app reminder for each scheduled 22:00 entertainer.
		"50 21 * * *": ["nomad_vip.tasks.shift_reminders.send_shift_start_reminders"],
	},
}

# Testing
# -------

# before_tests = "nomad_vip.install.before_tests"

# Extend DocType Class
# ------------------------------
#
# Specify custom mixins to extend the standard doctype controller.
# extend_doctype_class = {
# 	"Task": "nomad_vip.custom.task.CustomTaskMixin"
# }

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "nomad_vip.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "nomad_vip.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["nomad_vip.utils.before_request"]
# after_request = ["nomad_vip.utils.after_request"]

# Job Events
# ----------
# before_job = ["nomad_vip.utils.before_job"]
# after_job = ["nomad_vip.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"nomad_vip.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

# Translation
# ------------
# List of apps whose translatable strings should be excluded from this app's translations.
# ignore_translatable_strings_from = []
