from __future__ import annotations

from datetime import date, datetime, time, timedelta


ENTRY_DAY_START_HOUR = 12


def _as_date(value) -> date:
	if isinstance(value, datetime):
		return value.date()
	if isinstance(value, date):
		return value
	return date.fromisoformat(str(value))


def operational_work_date(moment: datetime) -> date:
	"""Return the club work date owning a wall-clock moment.

	The entrance works overnight.  A noon boundary keeps one evening and its
	following early morning in the same operational day.
	"""
	day = moment.date()
	return day - timedelta(days=1) if moment.hour < ENTRY_DAY_START_HOUR else day


def operational_window(moment: datetime, work_date=None):
	day = _as_date(work_date) if work_date else operational_work_date(moment)
	start = datetime.combine(day, time(hour=ENTRY_DAY_START_HOUR))
	return day, start, start + timedelta(days=1)
