from __future__ import annotations

from datetime import date
from typing import Any, Iterable, Mapping


COMPONENT_COPY = {
	"attendance": ("Ирцээ сайжруулах", "Ирц"),
	"customer_complaints": ("Үйлчлүүлэгчийн гомдлыг бууруулах", "Гомдол"),
	"sales": ("Борлуулалтын оноогоо өсгөх", "Борлуулалт"),
	"entertaining_skill": ("Ур чадварын үнэлгээгээ сайжруулах", "Ур чадвар"),
	"cleanliness_beauty": ("Цэвэр байдал, гоо зүйдээ анхаарах", "Цэвэр байдал"),
	"shift_effort": ("Өдрийн гараагаа гүйцээх", "Өдрийн гараа"),
	"personal_development": ("Хувийн хөгжлийн үнэлгээгээ ахиулах", "Хувийн хөгжил"),
	"entertainer_attitude": ("Хандлагын үнэлгээгээ сайжруулах", "Хандлага"),
}


def _value(row: Any, key: str, default=None):
	if isinstance(row, Mapping):
		return row.get(key, default)
	return getattr(row, key, default)


def _date_key(value: Any) -> str:
	if isinstance(value, date):
		return value.isoformat()
	return str(value or "")[:10]


def build_entertainer_attention(
	*,
	scoring_date: Any,
	checked_in: bool,
	active_window: bool,
	readiness: Any,
	stage_rounds_completed: int,
	daily_rank: Mapping[str, Any] | None,
	attendance_penalties: Iterable[Any],
	is_demo: bool = False,
) -> list[dict[str, Any]]:
	"""Build concise, ranked actions from day-scoped evidence.

	The helper never changes a score. It only explains verified or unresolved
	evidence for the selected day, keeping test/demo provenance visible.
	"""
	items: list[dict[str, Any]] = []
	day_key = _date_key(scoring_date)
	verified_state = "demo" if is_demo else "verified"
	verified_label = "Туршилтын өгөгдөл" if is_demo else "Баталгаатай бүртгэл"

	def add(
		key: str,
		priority: int,
		title: str,
		detail: str,
		*,
		value: str | None = None,
		source_state: str = verified_state,
		source_label: str = verified_label,
	) -> None:
		items.append({
			"key": key,
			"priority": priority,
			"title": title,
			"detail": detail,
			"value": value,
			"source_state": source_state,
			"source_label": source_label,
		})

	penalties = list(attendance_penalties)
	absent = any(_value(row, "penalty_type") == "Absence" for row in penalties)
	late_minutes = sum(
		int(_value(row, "late_minutes", 0) or 0)
		for row in penalties
		if _value(row, "penalty_type") == "Late"
	)
	if absent:
		add(
			"absence",
			100,
			"Өнөөдрийн ирц тасалсан",
			"Ирцийн үзүүлэлт 0 болно. Зөвхөн энэ өдрийн оноонд нөлөөлнө.",
			value="Ирц 0/100",
		)
	elif active_window and not checked_in:
		add(
			"attendance_missing",
			95,
			"Ирцээ бүртгүүлэх",
			"Өнөөдрийн ирц баталгаажаагүй байна. Салбарын QR кодоо уншуулна уу.",
			source_state="unresolved",
			source_label="Баталгаажуулах шаардлагатай",
		)

	if late_minutes:
		add(
			"lateness",
			90,
			"Хоцролтоо багасгах",
			"Ээлж эхлэхээс өмнө ирцээ бүртгүүлж, дараагийн хоцролтоос сэргийлээрэй.",
			value=f"{late_minutes} мин",
		)

	readiness_result = _value(readiness, "result") if readiness else None
	if readiness_result == "NOT_READY":
		reason = str(_value(readiness, "reason") or "Бэлэн бус гэж тэмдэглэсэн шалтгаанаа засна уу.")
		add("readiness_not_ready", 85, "Бэлэн байдлаа засах", reason, value="Бэлэн бус")
	elif checked_in and not readiness_result:
		add(
			"readiness_missing",
			80,
			"Бэлэн байдлын шалгалтаа хийлгэх",
			"Ахлах бүжигчин эсвэл менежерээр өнөөдрийн бэлэн байдлаа шалгуулна уу.",
			source_state="unresolved",
			source_label="Шалгалт хүлээгдэж байна",
		)

	completed = max(0, min(7, int(stage_rounds_completed or 0)))
	if checked_in and completed < 7:
		add(
			"stage_rounds",
			75,
			"Өдрийн гараагаа гүйцээх",
			f"Үлдсэн {7 - completed} гарааг өнөөдрийн ээлж дуусахаас өмнө бүртгүүлнэ үү.",
			value=f"{completed}/7",
		)

	current_daily_rank = daily_rank if daily_rank and _date_key(daily_rank.get("scoring_date")) == day_key else None
	components = list((current_daily_rank or {}).get("components") or [])
	for component in components:
		key = str(component.get("component") or "")
		score = component.get("score")
		if key in {"attendance", "shift_effort"} or score is None or float(score) >= 70:
			continue
		title, short_label = COMPONENT_COPY.get(key, ("Үнэлгээгээ сайжруулах", key))
		weight = float(component.get("weight") or 0)
		loss = max(0.0, (100 - float(score)) * weight / 100)
		add(
			f"rank_{key}",
			50 + min(20, round(loss)),
			title,
			f"{short_label} {float(score):g}/100 · өдрийн нийт оноонд {loss:g} онооны боломж дутуу байна.",
			value=f"{float(score):g}/100",
		)

	missing = list((current_daily_rank or {}).get("missing_components") or [])
	if missing:
		labels = [COMPONENT_COPY.get(key, (key, key))[1] for key in missing]
		preview = ", ".join(labels[:3])
		if len(labels) > 3:
			preview += f" +{len(labels) - 3}"
		add(
			"rank_inputs_missing",
			40,
			"Өдрийн үнэлгээний мэдээлэл дутуу",
			f"{preview} үзүүлэлтийн эх баримт баталгаажаагүй байна.",
			value=f"{len(labels)} дутуу",
			source_state="unresolved",
			source_label="Эх баримт хүлээгдэж байна",
		)

	return sorted(items, key=lambda item: (-int(item["priority"]), item["key"]))
