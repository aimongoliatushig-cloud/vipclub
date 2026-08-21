from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
ENTRY = (ROOT / "nomad_vip" / "api" / "entry.py").read_text(encoding="utf-8")
OPERATION = (ROOT / "nomad_vip" / "api" / "operation.py").read_text(encoding="utf-8")
LEAVE_UI = (
    ROOT.parent
    / "entertainer-app"
    / "src"
    / "features"
    / "attendance"
    / "LeavePolicy.tsx"
).read_text(encoding="utf-8")


class LeaveReservationNotificationContractTest(unittest.TestCase):
    def test_manager_feed_projects_reservation_rows_and_a_numeric_count(self):
        self.assertIn('"reservations": reservations', ENTRY)
        self.assertIn('"pending_reservations": len(reservations)', ENTRY)

    def test_reservation_summary_is_branch_scoped_before_customer_projection(self):
        summary = ENTRY.split("def get_reservation_summary", 1)[1].split("def get_entry_summary", 1)[0]
        manager_branch = ENTRY.split("def _manager_branch", 1)[1].split("def get_context", 1)[0]
        self.assertIn('require_any_role("Branch Manager")', manager_branch)
        self.assertNotIn("require_entry_access", manager_branch)
        self.assertIn("branch = _manager_branch()", summary)
        self.assertIn("if doc.branch != branch", summary)
        self.assertLess(summary.index("if doc.branch != branch"), summary.index("get_customer_detail"))
        self.assertIn('"average_bill"', summary)
        self.assertIn('"membership_rank"', summary)
        self.assertIn('"entertainers"', summary)

    def test_operator_reservation_creates_a_mongolian_manager_notification(self):
        self.assertIn("Notification Log", OPERATION)
        self.assertIn("Урьдчилсан захиалга:", OPERATION)
        self.assertIn('frappe.publish_realtime("vip_phone_reservation"', OPERATION)

    def test_entertainer_leave_view_keeps_terminal_decisions_visible(self):
        self.assertIn("selectedRequest = data?.requests.find", LEAVE_UI)
        self.assertIn("selectedRequest?.status === 'Rejected'", LEAVE_UI)
        self.assertIn("selectedRequest.decision_reason", LEAVE_UI)
        self.assertIn("selectedRequest?.decided_at", LEAVE_UI)
        self.assertIn("EntertainerLeaveNotifications", LEAVE_UI)


if __name__ == "__main__":
    unittest.main()
