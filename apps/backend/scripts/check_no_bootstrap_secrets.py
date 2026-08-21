from __future__ import annotations

import ast
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
EXCLUDED_PARTS = {".git", "__pycache__", ".venv", "node_modules"}


def literal_password_findings(path: Path) -> list[str]:
	findings: list[str] = []
	tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
	for node in ast.walk(tree):
		if isinstance(node, ast.Dict):
			for key, value in zip(node.keys, node.values, strict=False):
				if (
					isinstance(key, ast.Constant)
					and key.value == "new_password"
					and isinstance(value, ast.Constant)
					and isinstance(value.value, str)
				):
					findings.append(f"{path.relative_to(ROOT)}:{value.lineno}: literal new_password")
		if isinstance(node, (ast.Assign, ast.AnnAssign)):
			targets = node.targets if isinstance(node, ast.Assign) else [node.target]
			value = node.value
			if not isinstance(value, ast.Constant) or not isinstance(value.value, str):
				continue
			for target in targets:
				if isinstance(target, ast.Name) and target.id.endswith("_PASSWORD"):
					findings.append(f"{path.relative_to(ROOT)}:{value.lineno}: literal {target.id}")
	return findings


def main() -> int:
	findings: list[str] = []
	for path in ROOT.rglob("*.py"):
		if any(part in EXCLUDED_PARTS or part.startswith(".bat125-") for part in path.parts):
			continue
		findings.extend(literal_password_findings(path))
	if findings:
		print("Hard-coded bootstrap credential check failed:")
		for finding in findings:
			print(f"- {finding}")
		return 1
	print("Hard-coded bootstrap credential check passed.")
	return 0


if __name__ == "__main__":
	raise SystemExit(main())
