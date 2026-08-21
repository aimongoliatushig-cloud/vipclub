import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class RankLoanPolicyContractTests(unittest.TestCase):
    def test_rank_uses_four_explainable_evidence_dimensions(self):
        source = (ROOT / "nomad_vip" / "api" / "entertainer.py").read_text(encoding="utf-8")
        for key in ('"key": "sales"', '"key": "attendance"', '"key": "loyalty"', '"key": "behavior"'):
            self.assertIn(key, source)
        self.assertIn('"requires_human_approval": True', source)
        self.assertIn('"evidence_only": True', source)
        self.assertNotIn('profile.current_rank = recommended_rank', source)

    def test_loan_request_uses_server_calculated_active_policy(self):
        source = (ROOT / "nomad_vip" / "api" / "entertainer.py").read_text(encoding="utf-8")
        section = source.split("def get_loan_overview():", 1)[1].split("def get_workspace():", 1)[0]
        self.assertIn('"request_enabled": snapshot["eligible"]', section)
        self.assertIn('"status": "Active"', section)
        self.assertIn('"three_month_average": snapshot["three_month_average"]', section)
        self.assertIn('"current_rank": profile.current_rank or DEFAULT_ENTERTAINER_RANK', section)
        self.assertIn('"loan_multiplier": snapshot["loan_multiplier"]', section)
        self.assertIn('"interest_percent": 0', section)
        self.assertIn("def submit_loan_request", section)
        self.assertIn("record_api_audit", section)

    def test_daily_ranking_policy_requires_eight_weights_totalling_one_hundred(self):
        schema_path = ROOT / "nomad_vip" / "nomad_vip" / "doctype" / "vip_ranking_policy" / "vip_ranking_policy.json"
        schema = json.loads(schema_path.read_text(encoding="utf-8"))
        fields = {field["fieldname"]: field for field in schema["fields"]}
        self.assertEqual(fields["evaluation_mode"]["default"], "Active")
        for field in (
            "attendance_weight", "customer_complaints_weight", "sales_weight",
            "entertaining_skill_weight", "cleanliness_beauty_weight", "shift_effort_weight",
            "personal_development_weight", "entertainer_attitude_weight",
        ):
            self.assertIn(field, fields)
        controller = schema_path.with_suffix(".py").read_text(encoding="utf-8")
        self.assertIn("validate_weights", controller)
        self.assertIn('"customer_complaints": self.customer_complaints_weight', controller)
        self.assertIn('"entertainer_attitude": self.entertainer_attitude_weight', controller)


if __name__ == "__main__":
    unittest.main()
