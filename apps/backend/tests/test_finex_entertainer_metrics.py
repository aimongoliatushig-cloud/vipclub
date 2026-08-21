from __future__ import annotations

import json
import sys
import unittest
from datetime import date
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from nomad_vip.finex_entertainer_metrics import build_finex_entertainer_summary


class FinexEntertainerMetricsTest(unittest.TestCase):
	def bill(
		self,
		*,
		name="BILL-1",
		customer=None,
		amount=300000,
		employee_amount=300000,
		paid=1,
		bill_type=1,
		dancer_id="D-1",
		posted="2026-08-10",
		percent=50,
		total=600000,
		service="VIP Table Service",
		dancers=None,
	):
		dancer_rows = dancers or [{"dancerId": dancer_id, "amount": amount, "percent": percent}]
		return {
			"name": name,
			"customer": customer,
			"posting_date": posted,
			"is_paid": paid,
			"bill_type": bill_type,
			"last_synced_at": "2026-08-12 04:00:00",
			"raw_payload": json.dumps({
				"items": [{
					"menuName": service,
					"total": total,
					"employeeAmount": employee_amount,
					"dancers": dancer_rows,
				}],
			}),
		}

	def summary(self, bills, current_rank="Rank 3", rank_history=()):
		return build_finex_entertainer_summary(
			bills,
			["D-1"],
			date(2026, 6, 12),
			date(2026, 8, 12),
			date(2026, 8, 1),
			current_rank=current_rank,
			rank_history=rank_history,
		)

	def test_uses_direct_dancer_amount_and_points_rule(self):
		result = self.summary([self.bill()])
		self.assertEqual(result["current_month_income"], 300000)
		self.assertEqual(result["net_income"], 300000)
		self.assertEqual(result["points"], 30)
		self.assertEqual(result["service_count"], 1)
		self.assertEqual(result["days"], [{"date": "2026-08-10", "income": 300000.0, "cumulative_income": 300000.0}])
		self.assertEqual(result["recent_services"][0]["service_total"], 600000.0)
		self.assertEqual(result["recent_services"][0]["rate_source"], "rank_policy")
		self.assertEqual(result["payout_policy"], {
			"rank": "Rank 3", "percent": 50, "effective_from": None,
			"source": "Зэрэглэлийн түүх", "applies_to": "table_service",
		})
		self.assertIsNone(result["recent_services"][0]["percent_change"])
		self.assertTrue(result["quality"]["verified"])

	def test_rank_policy_overrides_a_stale_finex_table_service_percent(self):
		first = self.bill(name="BILL-1", amount=240000, employee_amount=240000, posted="2026-08-09", percent=40)
		second = self.bill(name="BILL-2", amount=300000, employee_amount=300000, posted="2026-08-10", percent=50)
		result = self.summary([first, second])
		self.assertEqual(result["net_income"], 600000)
		self.assertEqual(result["recent_services"][0]["previous_percent"], 50.0)
		self.assertEqual(result["recent_services"][0]["percent_change"], 0.0)
		self.assertEqual(result["quality"]["rank_policy_mismatches"], 1)

	def test_applies_rank_three_two_one_rates(self):
		for rank, percent, expected in (("Rank 3", 50, 300000), ("Rank 2", 60, 360000), ("Rank 1", 70, 420000)):
			with self.subTest(rank=rank):
				result = self.summary([self.bill()], current_rank=rank)
				self.assertEqual(result["net_income"], expected)
				self.assertEqual(result["recent_services"][0]["percent"], percent)
				self.assertEqual(result["recent_services"][0]["payout_rank"], rank)

	def test_splits_the_service_base_between_allocated_entertainers_before_applying_rank(self):
		result = self.summary([self.bill(
			employee_amount=300000,
			total=600000,
			dancers=[
				{"dancerId": "D-1", "amount": 150000, "percent": 25},
				{"dancerId": "D-2", "amount": 150000, "percent": 25},
			],
		)])
		self.assertEqual(result["net_income"], 150000)
		self.assertEqual(result["recent_services"][0]["service_total"], 300000)
		self.assertEqual(result["recent_services"][0]["allocation_count"], 2)

	def test_rank_change_becomes_effective_on_the_next_day(self):
		result = self.summary(
			[
				self.bill(name="BILL-1", posted="2026-08-10"),
				self.bill(name="BILL-2", posted="2026-08-11"),
			],
			current_rank="Rank 2",
			rank_history=[{"from_rank": "Rank 3", "to_rank": "Rank 2", "changed_at": "2026-08-10 08:00:00"}],
		)
		self.assertEqual(result["net_income"], 660000)
		by_date = {row["date"]: row for row in result["recent_services"]}
		self.assertEqual(by_date["2026-08-10"]["percent"], 50)
		self.assertEqual(by_date["2026-08-11"]["percent"], 60)
		self.assertEqual(result["payout_policy"]["rank"], "Rank 2")
		self.assertEqual(result["payout_policy"]["percent"], 60)
		self.assertEqual(result["payout_policy"]["effective_from"], "2026-08-11")

	def test_explicit_effective_date_uses_scoring_day_plus_one_even_after_a_later_decision(self):
		result = self.summary(
			[
				self.bill(name="BILL-1", posted="2026-08-01"),
				self.bill(name="BILL-2", posted="2026-08-02"),
			],
			current_rank="Rank 2",
			rank_history=[{
				"from_rank": "Rank 3",
				"to_rank": "Rank 2",
				"changed_at": "2026-08-05 08:00:00",
				"effective_from": "2026-08-02",
			}],
		)
		by_date = {row["date"]: row for row in result["recent_services"]}
		self.assertEqual(by_date["2026-08-01"]["percent"], 50)
		self.assertEqual(by_date["2026-08-02"]["percent"], 60)
		self.assertEqual(result["payout_policy"]["effective_from"], "2026-08-02")

	def test_keeps_finex_allocation_for_non_ranked_commission_categories(self):
		result = self.summary([
			self.bill(service="Kloster eberbach", percent=40.91, amount=180000, employee_amount=180000, total=440000),
		], current_rank="Rank 1")
		self.assertEqual(result["net_income"], 180000)
		self.assertEqual(result["recent_services"][0]["percent"], 40.91)
		self.assertEqual(result["recent_services"][0]["rate_source"], "finex_allocation")
		self.assertEqual(result["quality"]["finex_allocation_services"], 1)

	def test_excludes_unpaid_unmatched_and_inconsistent_items(self):
		result = self.summary([
			self.bill(paid=0),
			self.bill(dancer_id="OTHER"),
			self.bill(employee_amount=999999),
		])
		self.assertEqual(result["net_income"], 0)
		self.assertEqual(result["quality"]["skipped_inconsistent_items"], 1)

	def test_refund_reverses_income(self):
		refund = self.bill(name="BILL-2", amount=100000, employee_amount=100000, total=200000, bill_type=2, posted="2026-08-11")
		result = self.summary([self.bill(), refund])
		self.assertEqual(result["net_income"], 200000)
		self.assertEqual(result["points"], 20)
		self.assertEqual(result["days"][-1]["cumulative_income"], 200000)
		self.assertEqual(result["recent_services"][0]["service_total"], -200000.0)

	def test_counts_unique_repeat_customers_from_distinct_paid_bills(self):
		result = self.summary([
			self.bill(name="BILL-1", customer="CUSTOMER-A"),
			self.bill(name="BILL-2", customer="CUSTOMER-A", posted="2026-08-11"),
			self.bill(name="BILL-3", customer="CUSTOMER-B", posted="2026-08-11"),
		])
		self.assertEqual(result["linked_customer_count"], 2)
		self.assertEqual(result["linked_customer_bill_count"], 3)
		self.assertEqual(result["repeat_customer_count"], 1)
		self.assertTrue(result["quality"]["customer_linkage_verified"])

	def test_excludes_refunds_unpaid_and_unlinked_bills_from_repeat_customer_count(self):
		result = self.summary([
			self.bill(name="BILL-1", customer="CUSTOMER-A"),
			self.bill(name="BILL-2", customer="CUSTOMER-A", bill_type=2),
			self.bill(name="BILL-3", customer="CUSTOMER-A", paid=0),
			self.bill(name="BILL-4"),
		])
		self.assertEqual(result["linked_customer_bill_count"], 1)
		self.assertEqual(result["repeat_customer_count"], 0)

if __name__ == "__main__":
	unittest.main()
