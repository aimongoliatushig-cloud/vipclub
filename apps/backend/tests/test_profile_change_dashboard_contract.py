from pathlib import Path
import unittest


APP_ROOT = Path(__file__).resolve().parents[1]
WORKFORCE_API = APP_ROOT / "nomad_vip" / "api" / "workforce.py"


class ProfileChangeDashboardContractTests(unittest.TestCase):
	def test_manager_dashboard_projects_pending_profile_changes(self):
		source = WORKFORCE_API.read_text(encoding="utf-8")
		self.assertIn('"VIP Entertainer Profile Change Request"', source)
		self.assertIn('"profile_change_pending": profile.name in pending_profile_changes', source)
		self.assertIn('"pending_profile_changes": len(pending_profile_changes)', source)


if __name__ == "__main__":
	unittest.main()
