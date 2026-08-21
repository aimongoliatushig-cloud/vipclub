from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import Any


def approved_target_amount(proposed_target: Any, requested_target: Any = None) -> float:
	"""Resolve the CEO-approved monthly target without silently accepting zero."""
	raw = proposed_target if requested_target in (None, "") else requested_target
	try:
		amount = Decimal(str(raw))
	except (InvalidOperation, TypeError, ValueError) as exc:
		raise ValueError("Approved sales target must be numeric") from exc
	if amount <= 0:
		raise ValueError("Approved sales target must be greater than zero")
	return float(amount)
