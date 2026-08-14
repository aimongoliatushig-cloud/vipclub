from __future__ import annotations

from unittest import TestCase
from unittest.mock import patch

import frappe
from frappe.tests import IntegrationTestCase

from nomad_vip.api.management import (
	_branch,
	assign_employee_branch,
	decide_sales_goal,
	get_branch_sales_progress,
	get_manager_customers,
	get_session,
	get_unassigned_employees,
	save_sales_goal_proposal,
	submit_sales_goal_proposal,
)
from nomad_vip.api.security import ActorContext


def actor(role="Branch Manager", branch="Nomad"):
	return ActorContext(
		user=f"{role.lower().replace(' ', '.')}@example.test",
		roles=frozenset({role}),
		role=role,
		branch=branch,
		profile=None,
		employee="HR-EMP-1",
	)


class TestManagementAPI(TestCase):
	def test_manager_cannot_request_another_branch(self):
		with self.assertRaises(frappe.PermissionError):
			_branch(actor(), "Neva")

	def test_ceo_must_select_a_real_vip_branch(self):
		with self.assertRaises(frappe.ValidationError):
			_branch(actor("CEO", None), "Unknown")

	def test_session_is_derived_from_server_actor(self):
		manager = actor()
		with (
			patch("nomad_vip.api.management._management_actor", return_value=manager),
			patch("nomad_vip.api.management.frappe.utils.get_fullname", return_value="Nomad Manager"),
		):
			result = get_session()
		self.assertEqual(result["role"], "Branch Manager")
		self.assertEqual(result["branches"], [manager.branch])
		self.assertFalse(result["capabilities"]["company_wide"])
		self.assertTrue(result["authenticated"])

	def test_guest_session_returns_a_login_signal_without_role_resolution(self):
		with (
			patch("nomad_vip.api.management.frappe.session", frappe._dict(user="Guest")),
			patch("nomad_vip.api.management._management_actor") as management_actor,
		):
			result = get_session()
		self.assertEqual(result, {"authenticated": False})
		management_actor.assert_not_called()

	def test_customer_list_uses_server_branch_and_masks_phone(self):
		manager = actor()
		row = frappe._dict({
			"name": "VIP-CBP-1", "customer": "CUST-1", "customer_name": "Test",
			"phone": "99112233", "membership_rank": "Gold", "visit_count": 2,
			"bill_count": 2, "total_spend": 100, "average_bill": 50,
			"first_visit": None, "last_visit": None,
		})
		with (
			patch("nomad_vip.api.management._management_actor", return_value=manager),
			patch("nomad_vip.api.management.frappe.db.sql", side_effect=[[[1]], [row]]) as sql,
			patch("nomad_vip.api.management.page_meta", return_value={"total": 1}),
		):
			result = get_manager_customers(search="2233")
		self.assertEqual(result["branch"], manager.branch)
		self.assertEqual(result["customers"][0].phone, "•••• 2233")
		self.assertEqual(sql.call_args_list[0].args[1]["branch"], manager.branch)
		self.assertIn("profile.bill_count > 0", sql.call_args_list[0].args[0])

	def test_customer_directory_excludes_empty_cross_branch_profiles(self):
		manager = actor()
		with (
			patch("nomad_vip.api.management._management_actor", return_value=manager),
			patch("nomad_vip.api.management.frappe.db.sql", side_effect=[[[0]], []]) as sql,
			patch("nomad_vip.api.management.page_meta", return_value={"total": 0}),
		):
			get_manager_customers(search="2233")
		self.assertIn("profile.bill_count > 0 or profile.visit_count > 0", sql.call_args_list[0].args[0])

	def test_customer_phone_only_name_is_not_returned_as_a_display_name(self):
		manager = actor()
		row = frappe._dict({
			"name": "VIP-CBP-1", "customer_name": "9911 2233", "phone": "99112233",
			"membership_rank": "Unassigned", "visit_count": 1, "bill_count": 1,
			"total_spend": 100, "average_bill": 100, "first_visit": None, "last_visit": None,
		})
		with (
			patch("nomad_vip.api.management._management_actor", return_value=manager),
			patch("nomad_vip.api.management.frappe.db.sql", side_effect=[[[1]], [row]]),
			patch("nomad_vip.api.management.page_meta", return_value={"total": 1}),
		):
			result = get_manager_customers()
		self.assertEqual(result["customers"][0].customer_name, "Нэр бүртгэгдээгүй")
		self.assertEqual(result["customers"][0].phone, "•••• 2233")

	def test_customer_name_masks_an_embedded_phone_number(self):
		from nomad_vip.api.management import _safe_customer_display_name

		self.assertEqual(_safe_customer_display_name("Болд 9911-2233"), "Болд •••• 2233")

	def test_goal_proposal_uses_manager_branch_not_client_branch(self):
		manager = actor()
		new_doc = frappe._dict(
			name="GOAL-1", doctype="VIP Branch Sales Goal", state="Draft", version=1,
			is_new=lambda: True, insert=lambda **kwargs: None,
			as_dict=lambda: {"name": "GOAL-1", "branch": manager.branch},
		)
		with (
			patch("nomad_vip.api.management.require_actor", return_value=manager),
			patch("nomad_vip.api.management.frappe.db.get_value", return_value=None),
			patch("nomad_vip.api.management._sales_actual", return_value=100),
			patch("nomad_vip.api.management.today", return_value="2026-08-13"),
			patch("nomad_vip.api.management.frappe.get_doc", return_value=new_doc) as get_doc,
			patch("nomad_vip.api.management.record_api_audit"),
			patch("nomad_vip.api.management.frappe.db.commit"),
		):
			result = save_sales_goal_proposal(
				"2026-09-01", 1000, "Борлуулалтын өсөлтийн бодит төлөвлөгөө", [{"title": "CRM outreach"}]
			)
		self.assertEqual(get_doc.call_args.args[0]["branch"], manager.branch)
		self.assertEqual(result["goal"]["branch"], manager.branch)

	def test_unassigned_employee_queue_is_global_and_searchable(self):
		ceo = actor("CEO", None)
		row = frappe._dict(
			name="HR-EMP-99", employee_name="Test Employee", designation="Waiter",
			department="Operations", company="Nomad VIP", status="Active", modified="2026-08-13",
		)
		with (
			patch("nomad_vip.api.management.require_actor", return_value=ceo) as require,
			patch("nomad_vip.api.management.frappe.db.sql", side_effect=[[[1]], [row]]) as sql,
		):
			result = get_unassigned_employees(search="Waiter")
		require.assert_called_once_with("CEO", "System Manager")
		self.assertEqual(result["employees"][0].name, "HR-EMP-99")
		self.assertEqual(result["meta"]["total"], 1)
		self.assertIn("(branch is null or branch='')", sql.call_args_list[0].args[0])
		self.assertEqual(sql.call_args_list[0].args[1]["search"], "%Waiter%")

	def test_ceo_branch_assignment_is_guarded_and_audited(self):
		ceo = actor("CEO", None)
		before = frappe._dict(
			name="HR-EMP-99", employee_name="Test Employee", branch=None,
			status="Active", modified="2026-08-13 12:00:00",
		)
		after = frappe._dict(before)
		after.branch = "Nomad"
		after.modified = "2026-08-13 12:01:00"
		with (
			patch("nomad_vip.api.management.require_actor", return_value=ceo),
			patch("nomad_vip.api.management.frappe.db.sql"),
			patch("nomad_vip.api.management.frappe.db.get_value", side_effect=[before, None, after]),
			patch("nomad_vip.api.management.assert_not_stale"),
			patch("nomad_vip.api.management.frappe.db.set_value") as set_value,
			patch("nomad_vip.api.management.record_api_audit") as audit,
			patch("nomad_vip.api.management.frappe.db.commit") as commit,
		):
			result = assign_employee_branch(
				"HR-EMP-99", "Nomad", "Signed employment record", "2026-08-13 12:00:00"
			)
		set_value.assert_called_once_with("Employee", "HR-EMP-99", "branch", "Nomad", update_modified=True)
		audit.assert_called_once()
		self.assertEqual(audit.call_args.kwargs["action"], "ceo.employee_branch.assign")
		self.assertEqual(audit.call_args.kwargs["target_doctype"], "Employee")
		commit.assert_called_once()
		self.assertEqual(result["employee"].branch, "Nomad")

	def test_branch_assignment_rejects_an_existing_branch(self):
		ceo = actor("CEO", None)
		employee = frappe._dict(
			name="HR-EMP-1", employee_name="Already Assigned", branch="Neva",
			status="Active", modified="2026-08-13",
		)
		with (
			patch("nomad_vip.api.management.require_actor", return_value=ceo),
			patch("nomad_vip.api.management.frappe.db.sql"),
			patch("nomad_vip.api.management.frappe.db.get_value", return_value=employee),
			patch("nomad_vip.api.management.frappe.db.set_value") as set_value,
		):
			with self.assertRaises(frappe.ValidationError):
				assign_employee_branch("HR-EMP-1", "Nomad", "Confirmed branch record")
		set_value.assert_not_called()


class TestManagementDatabaseFlow(IntegrationTestCase):
	def test_goal_proposal_to_ceo_approval_is_audited_and_replay_safe(self):
		manager = ActorContext(
			user="Administrator", roles=frozenset({"Branch Manager"}), role="Branch Manager",
			branch="Nomad", profile=None, employee=None,
		)
		ceo = ActorContext(
			user="Administrator", roles=frozenset({"CEO"}), role="CEO",
			branch=None, profile=None, employee=None,
		)
		month = "2031-09-01"
		actions = [{"title": "VIP харилцагчийн дахин захиалгыг нэмэгдүүлэх"}]
		with (
			patch("nomad_vip.api.management.require_actor", return_value=manager),
			patch("nomad_vip.api.management.frappe.db.commit"),
		):
			saved = save_sales_goal_proposal(
				month, 1_000_000, "POS суурь болон CRM давтан зочлолтын бодит төлөвлөгөө",
				actions, idempotency_key="test-goal-save-2031-09",
			)
			replayed = save_sales_goal_proposal(
				month, 1_000_000, "POS суурь болон CRM давтан зочлолтын бодит төлөвлөгөө",
				actions, idempotency_key="test-goal-save-2031-09",
			)
			self.assertTrue(replayed["replayed"])
			self.assertEqual(replayed["goal"]["name"], saved["goal"]["name"])
			submitted = submit_sales_goal_proposal(
				saved["goal"]["name"], idempotency_key="test-goal-submit-2031-09"
			)
			self.assertEqual(submitted["goal"]["state"], "Submitted")

		with (
			patch("nomad_vip.api.management.require_actor", return_value=ceo),
			patch("nomad_vip.api.management.frappe.db.commit"),
		):
			decided = decide_sales_goal(
				saved["goal"]["name"], "approve", "Батлав",
				idempotency_key="test-goal-approve-2031-09",
			)
			self.assertEqual(decided["goal"]["state"], "Active")
			self.assertEqual(decided["goal"]["approved_target"], 1_000_000)

		with patch("nomad_vip.api.management._management_actor", return_value=ceo):
			progress = get_branch_sales_progress(month=month, branch="Nomad")
		self.assertEqual(progress["active_goal"]["name"], saved["goal"]["name"])
		self.assertEqual(progress["active_goal"]["decision_by"], "Administrator")
