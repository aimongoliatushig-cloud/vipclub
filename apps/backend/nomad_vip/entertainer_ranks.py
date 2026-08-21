from __future__ import annotations


# Rank order stays ascending so the existing recommendation engine can find
# the next higher rank with ``rank_order > current.rank_order``.  Rank 1 is
# therefore the highest label even though it has the largest internal order.
ENTERTAINER_RANKS = (
	{"code": "Rank 3", "rank_order": 1, "minimum_points": 0, "loan_multiplier": 0, "payout_percent": 50},
	{"code": "Rank 2", "rank_order": 2, "minimum_points": 600, "loan_multiplier": 30, "payout_percent": 60},
	{"code": "Rank 1", "rank_order": 3, "minimum_points": 1000, "loan_multiplier": 40, "payout_percent": 70},
)

DEFAULT_ENTERTAINER_RANK = "Rank 3"
ACTIVE_ENTERTAINER_RANKS = tuple(row["code"] for row in ENTERTAINER_RANKS)
LEGACY_ENTERTAINER_RANK_MAP = {
	"Bronze": "Rank 3",
	"Silver": "Rank 3",
	"Gold": "Rank 2",
	"Diamond": "Rank 1",
}
ENTERTAINER_PAYOUT_PERCENT_BY_RANK = {
	row["code"]: row["payout_percent"] for row in ENTERTAINER_RANKS
}


def normalize_entertainer_rank(value: str | None) -> str:
	name = (value or "").strip()
	if name in ACTIVE_ENTERTAINER_RANKS:
		return name
	return LEGACY_ENTERTAINER_RANK_MAP.get(name, DEFAULT_ENTERTAINER_RANK)


def payout_percent_for_rank(value: str | None) -> int:
	"""Return the approved table-service payout rate for an entertainer rank."""
	rank = normalize_entertainer_rank(value)
	return ENTERTAINER_PAYOUT_PERCENT_BY_RANK[rank]
