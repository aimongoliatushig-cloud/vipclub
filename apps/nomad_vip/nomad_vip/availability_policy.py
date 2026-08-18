from __future__ import annotations


CANONICAL_AVAILABILITY_STATES = (
	"Unavailable",
	"Available",
	"Scheduled",
	"Reserved",
	"Working",
	"Break",
	"Leave",
)

ENTERTAINER_AVAILABILITY_STATES = frozenset({"Unavailable", "Available"})
SYSTEM_AVAILABILITY_STATES = frozenset({"Scheduled", "Reserved", "Working", "Break", "Leave"})

# Read compatibility only. New events are always written with canonical values.
LEGACY_AVAILABILITY_ALIASES = {
	"Off Duty": "Unavailable",
	"Serving": "Working",
}

_NORMALIZED_STATES = {
	state.casefold(): state for state in CANONICAL_AVAILABILITY_STATES
}
_NORMALIZED_STATES.update({
	legacy.casefold(): canonical
	for legacy, canonical in LEGACY_AVAILABILITY_ALIASES.items()
})


def canonical_availability_status(value) -> str | None:
	"""Return the canonical availability state, including legacy read aliases."""
	key = str(value or "").strip().casefold()
	return _NORMALIZED_STATES.get(key)


def entertainer_availability_next(current) -> tuple[str, ...]:
	"""Expose only the two availability choices owned by the entertainer."""
	current_status = canonical_availability_status(current)
	if current_status == "Unavailable":
		return ("Available",)
	if current_status == "Available":
		return ("Unavailable",)
	return ()


def entertainer_can_transition(current, target) -> bool:
	current_status = canonical_availability_status(current)
	target_status = canonical_availability_status(target)
	return bool(
		current_status in ENTERTAINER_AVAILABILITY_STATES
		and target_status in ENTERTAINER_AVAILABILITY_STATES
		and current_status != target_status
	)
