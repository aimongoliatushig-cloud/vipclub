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

    def test_loan_request_stays_closed_until_policy_decisions_are_approved(self):
        source = (ROOT / "nomad_vip" / "api" / "entertainer.py").read_text(encoding="utf-8")
        section = source.split("def get_loan_overview():", 1)[1].split("def get_workspace():", 1)[0]
        self.assertIn('"request_enabled": False', section)
        self.assertIn('"verified_income": finex["net_income"]', section)
        self.assertIn('"current_rank": profile.current_rank or "Gold"', section)
        for decision in ("зээлийн дээд дүнгийн томьёо", "Эргэн төлөх хувь", "Батлах эрх"):
            self.assertIn(decision, section)
        self.assertNotIn("loan_multiplier", section)
        self.assertNotIn("interest_rate", section)

    def test_active_ranking_policy_requires_four_weights_totalling_one_hundred(self):
        schema_path = ROOT / "nomad_vip" / "nomad_vip" / "doctype" / "vip_ranking_policy" / "vip_ranking_policy.json"
        schema = json.loads(schema_path.read_text(encoding="utf-8"))
        fields = {field["fieldname"]: field for field in schema["fields"]}
        self.assertEqual(fields["evaluation_mode"]["default"], "Shadow")
        for field in ("sales_weight", "attendance_weight", "loyalty_weight", "behavior_weight"):
            self.assertIn(field, fields)
        controller = schema_path.with_suffix(".py").read_text(encoding="utf-8")
        self.assertIn('self.evaluation_mode == "Active"', controller)
        self.assertIn("!= 100", controller)


if __name__ == "__main__":
    unittest.main()
