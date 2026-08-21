from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "nomad_vip" / "api" / "membership_admin.py"


class MembershipAdminContractTest(unittest.TestCase):
	def test_policy_projection_does_not_reactivate_legacy_writes(self):
		source = SOURCE.read_text(encoding="utf-8")
		self.assertIn('def get_membership_policy_settings(branch=None):', source)
		self.assertIn('"policy_state": "active" if policy else "configuration_required"', source)
		self.assertIn('"rules_are_reference_only": not bool(policy)', source)
		self.assertNotIn("save_rank_settings", source)
		self.assertNotIn("recalculate_branch_ranks", source)

	def test_real_customer_stats_are_independent_from_policy_presence(self):
		source = SOURCE.read_text(encoding="utf-8")
		self.assertIn('frappe.db.count("VIP Customer Branch Profile"', source)
		self.assertIn('"total_customers": total', source)
		self.assertIn('"unranked_customers": total - ranked', source)


if __name__ == "__main__":
	unittest.main()
