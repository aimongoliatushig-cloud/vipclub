from __future__ import annotations

from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import patch

import frappe

from nomad_vip.api.customer import get_customer_detail, set_customer_service_characteristics
from nomad_vip.api.entry import get_service_entry_feed
from nomad_vip.api.operation import get_operation_customer_detail
from nomad_vip.api.security import ActorContext


def _actor(role: str, branch: str | None = "Nomad") -> ActorContext:
	return ActorContext(
		user=f"{role.lower().replace(' ', '.')}@example.test",
		roles=frozenset({role}),
		role=role,
		branch=branch,
		profile=None,
		employee="HR-EMP-0001",
	)


class TestCompactGuestServiceFeed(TestCase):
	def test_operator_receives_only_the_service_whitelist(self):
		rows = [frappe._dict({
			"name": "ENTRY-1",
			"customer_name": "Болд",
			"membership_rank": "Gold",
			"entered_at": "2026-08-19 22:10:00",
			"visit_number": 4,
			"service_characteristics": "Тайван ширээ сонгодог",
		})]
		with (
			patch("nomad_vip.api.security.require_actor", return_value=_actor("Operation", None)),
			patch("nomad_vip.api.entry.now_datetime", return_value="2026-08-19 22:15:00"),
			patch(
				"nomad_vip.api.entry_day.operational_window",
				return_value=("2026-08-19", "2026-08-19 12:00:00", "2026-08-20 12:00:00"),
			),
			patch("nomad_vip.api.entry.frappe.db.sql", return_value=rows) as sql,
		):
			result = get_service_entry_feed(branch="Nomad", limit=50)

		self.assertEqual(result["branch"], "Nomad")
		self.assertEqual(result["entries"], rows)
		self.assertEqual(
			result["visible_fields"],
			["customer_name", "membership_rank", "entered_at", "visit_number", "service_characteristics"],
		)
		query = sql.call_args.args[0].lower()
		for forbidden in ("total_spend", "average_bill", "bill_code", "phone", "ban_reason"):
			self.assertNotIn(forbidden, query)

	def test_branch_staff_cannot_request_another_branch(self):
		with (
			patch("nomad_vip.api.security.require_actor", return_value=_actor("Bartender", "Nomad")),
			patch("nomad_vip.api.entry.frappe.db.sql") as sql,
		):
			with self.assertRaises(frappe.PermissionError):
				get_service_entry_feed(branch="Neva")
			service_queries = [
				call.args[0]
				for call in sql.call_args_list
				if call.args and "tabVIP Customer Entry" in str(call.args[0])
			]
			self.assertEqual(service_queries, [])

	def test_operator_cannot_call_the_legacy_full_history_lookup(self):
		with (
			patch(
				"nomad_vip.api.operation.require_any_role",
				side_effect=frappe.PermissionError("denied"),
			),
			patch("nomad_vip.api.customer._find_customer_by_phone") as find_customer,
		):
			with self.assertRaises(frappe.PermissionError):
				get_operation_customer_detail("99112233", "Nomad")
			find_customer.assert_not_called()

	def test_operation_role_is_denied_even_if_customer_read_permission_exists(self):
		with (
			patch("nomad_vip.api.customer.frappe.get_roles", return_value=["Operation"]),
			patch("nomad_vip.api.customer.frappe.has_permission", return_value=True),
			patch("nomad_vip.api.customer.frappe.session", SimpleNamespace(user="operator@example.test")),
			patch("nomad_vip.api.customer.frappe.get_doc") as get_doc,
		):
			with self.assertRaises(frappe.PermissionError):
				get_customer_detail("CUST-1", "Nomad")
			get_doc.assert_not_called()


class TestGuestServiceCharacteristics(TestCase):
	def test_manager_updates_branch_scoped_characteristics_with_audit(self):
		profile = frappe._dict({"name": "PROFILE-1", "service_characteristics": "Өмнөх тэмдэглэл"})
		with (
			patch("nomad_vip.api.security.require_actor", return_value=_actor("Branch Manager", "Nomad")),
			patch("nomad_vip.api.customer.frappe.db.get_value", return_value=profile) as get_value,
			patch("nomad_vip.api.customer.frappe.db.set_value") as set_value,
			patch("nomad_vip.api.security.record_api_audit") as audit,
			patch("nomad_vip.api.customer.frappe.db.commit") as commit,
			patch("nomad_vip.api.customer.now_datetime", return_value="2026-08-19 12:00:00"),
		):
			result = set_customer_service_characteristics("CUST-1", "  Мөсгүй ус хүсдэг  ")

		get_value.assert_called_once_with(
			"VIP Customer Branch Profile",
			{"customer": "CUST-1", "branch": "Nomad"},
			["name", "service_characteristics"],
			as_dict=True,
		)
		set_value.assert_called_once_with(
			"VIP Customer Branch Profile",
			"PROFILE-1",
			{
				"service_characteristics": "Мөсгүй ус хүсдэг",
				"service_characteristics_updated_by": "branch.manager@example.test",
				"service_characteristics_updated_at": "2026-08-19 12:00:00",
			},
		)
		audit.assert_called_once()
		commit.assert_called_once()
		self.assertEqual(result["service_characteristics"], "Мөсгүй ус хүсдэг")
		self.assertEqual(result["branch"], "Nomad")

	def test_characteristics_length_is_bounded_before_database_access(self):
		with (
			patch("nomad_vip.api.security.require_actor", return_value=_actor("Branch Manager", "Nomad")),
			patch("nomad_vip.api.customer.frappe.db.get_value") as get_value,
		):
			with self.assertRaises(frappe.ValidationError):
				set_customer_service_characteristics("CUST-1", "x" * 501)
			get_value.assert_not_called()
