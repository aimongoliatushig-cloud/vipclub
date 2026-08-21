import ast
import unittest
from pathlib import Path


SOURCE_PATH = Path(__file__).resolve().parents[1] / "nomad_vip" / "api" / "workday.py"


def function_source(name):
	source = SOURCE_PATH.read_text(encoding="utf-8")
	for node in ast.walk(ast.parse(source)):
		if isinstance(node, ast.FunctionDef) and node.name == name:
			return ast.get_source_segment(source, node) or ""
	raise AssertionError(f"Missing function {name}")


class EntertainerArrivalOnlyWorkdayContractTest(unittest.TestCase):
	def test_workday_declares_arrival_only_and_counts_arrival_days(self):
		source = function_source("get_workday")
		self.assertIn('"attendance_mode": "arrival_only"', source)
		self.assertIn('"requires_checkout": False', source)
		self.assertIn('"attendance_complete": checked_in', source)
		self.assertIn('"arrival_days": arrival_days', source)

	def test_entertainer_cannot_submit_a_checkout_correction(self):
		source = function_source("submit_attendance_correction")
		self.assertIn('if correction_type != "Check-in":', source)
		self.assertIn('Бүжигчний ирц зөвхөн ирсэн цагаар бүртгэгдэнэ.', source)


if __name__ == "__main__":
	unittest.main()
