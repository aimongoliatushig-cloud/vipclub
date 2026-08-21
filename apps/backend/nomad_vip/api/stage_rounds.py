from __future__ import annotations

import json
from datetime import timedelta

import frappe
from frappe import _
from frappe.utils import get_datetime, getdate, now_datetime

from nomad_vip.api.security import normalize_idempotency_key, record_api_audit, require_actor
from nomad_vip.api.supervisor import _assert_branch_access, _operational_date, _readiness_access, _shift_checkin


DAILY_TARGET = 7
ROUND_PENALTY_RATE = 30000
EVENT_TYPE = "Stage Round"
EVENT_SOURCE = "Daily Stage Round"
AUDIT_ACTION = "workforce.stage_round.record"


def _event_id(work_date, entertainer: str, round_number: int) -> str:
	return f"{work_date}|{entertainer}|{round_number}"


def _round_number(external_id: str | None, work_date, entertainer: str) -> int | None:
	parts = (external_id or "").split("|")
	if len(parts) != 3 or parts[0] != str(work_date) or parts[1] != entertainer:
		return None
	try:
		value = int(parts[2])
	except (TypeError, ValueError):
		return None
	return value if 1 <= value <= DAILY_TARGET else None


def _day_events(work_date, entertainers: list[str]) -> dict[str, list[dict]]:
	grouped = {name: [] for name in entertainers}
	if not entertainers:
		return grouped
	rows = frappe.get_all(
		"VIP Performance Event",
		filters={
			"entertainer": ("in", entertainers),
			"event_type": EVENT_TYPE,
			"source": EVENT_SOURCE,
			"external_id": ("like", f"{work_date}|%"),
			"verified": 1,
		},
		fields=["name", "entertainer", "external_id", "occurred_at", "source_document_name"],
		order_by="occurred_at asc, creation asc",
		ignore_permissions=True,
	)
	for row in rows:
		round_number = _round_number(row.external_id, work_date, row.entertainer)
		if round_number is not None:
			row["round_number"] = round_number
			grouped.setdefault(row.entertainer, []).append(row)
	return grouped


def _checked_in_roster(branch: str, work_date) -> list[dict]:
	assignments = frappe.db.sql(
		"""
		select
			p.name as entertainer, p.employee,
			coalesce(nullif(p.stage_name, ''), p.employee_name, p.name) as display_name,
			p.current_rank, p.branch, sa.name as shift_assignment, sa.shift_type,
			st.start_time as shift_start, st.end_time as shift_end
		from `tabVIP Entertainer Profile` p
		inner join `tabEmployee` e on e.name = p.employee and e.status = 'Active'
		inner join `tabShift Assignment` sa on sa.employee = p.employee
		inner join `tabShift Type` st on st.name = sa.shift_type
		where p.branch = %(branch)s
			and p.active = 1
			and coalesce(p.lifecycle_status, 'Active') = 'Active'
			and sa.docstatus = 1
			and sa.start_date <= %(work_date)s
			and (sa.end_date is null or sa.end_date >= %(work_date)s)
		order by display_name asc, sa.creation desc
		""",
		{"branch": branch, "work_date": work_date},
		as_dict=True,
	)
	roster = []
	seen = set()
	for row in assignments:
		if row.entertainer in seen:
			continue
		checkin = _shift_checkin(row.employee, row, work_date)
		if not checkin:
			continue
		seen.add(row.entertainer)
		row["employee_checkin"] = checkin.name
		row["checked_in_at"] = checkin.time
		roster.append(row)
	return roster


def _shift_end_datetime(work_date, row):
	start_at = get_datetime(f"{work_date} {row.shift_start}")
	end_at = get_datetime(f"{work_date} {row.shift_end}")
	if end_at <= start_at:
		end_at += timedelta(days=1)
	return end_at


def _payload(branch: str, work_date, access: dict | None = None) -> dict:
	roster = _checked_in_roster(branch, work_date)
	events = _day_events(work_date, [row.entertainer for row in roster])
	people = []
	for row in roster:
		person_events = events.get(row.entertainer, [])
		count = len({event.round_number for event in person_events})
		missing_rounds = max(0, DAILY_TARGET - count)
		people.append({
			"entertainer": row.entertainer,
			"employee": row.employee,
			"display_name": row.display_name,
			"current_rank": row.current_rank,
			"shift_assignment": row.shift_assignment,
			"shift_type": row.shift_type,
			"employee_checkin": row.employee_checkin,
			"checked_in_at": row.checked_in_at,
			"rounds": count,
			"target": DAILY_TARGET,
			"completed": count >= DAILY_TARGET,
			"missing_rounds": missing_rounds,
			"projected_penalty": missing_rounds * ROUND_PENALTY_RATE,
			"last_recorded_at": person_events[-1].occurred_at if person_events else None,
		})
	completed = sum(1 for row in people if row["completed"])
	remaining = sum(max(0, DAILY_TARGET - row["rounds"]) for row in people)
	return {
		"branch": branch,
		"work_date": work_date,
		"target": DAILY_TARGET,
		"penalty_rate": ROUND_PENALTY_RATE,
		"people": people,
		"summary": {
			"checked_in": len(people),
			"completed": completed,
			"incomplete": len(people) - completed,
			"remaining_rounds": remaining,
			"projected_penalty": remaining * ROUND_PENALTY_RATE,
		},
		"access": {
			"can_submit": True if access is None else bool(access["can_submit"]),
			"message": access["message"] if access else _("Зөвхөн өнөөдөр QR-аар ирцээ бүртгүүлсэн бүжигчид харагдана."),
		},
	}


@frappe.whitelist(methods=["GET"])
def get_daily_rounds(work_date=None):
	actor = require_actor(
		"Lead Entertainer", "Entertainer Supervisor", "Branch Manager", "System Manager",
		require_branch=True,
	)
	work_date = _operational_date(work_date)
	if not actor.branch:
		frappe.throw(_("Гараа хөтлөх салбар тодорхойгүй байна."), frappe.ValidationError)
	access = _readiness_access(actor, actor.branch, work_date)
	return _payload(actor.branch, work_date, access)


@frappe.whitelist(methods=["POST"])
def record_daily_round(entertainer: str, work_date=None, idempotency_key=None):
	actor = require_actor(
		"Lead Entertainer", "Entertainer Supervisor", "Branch Manager", "System Manager",
		require_branch=True,
	)
	operational_date = _operational_date()
	work_date = _operational_date(work_date)
	if work_date != operational_date:
		frappe.throw(_("Гарааг зөвхөн тухайн ажлын өдөр бүртгэнэ."), frappe.ValidationError)
	access = _readiness_access(actor, actor.branch, work_date)
	if not access["can_submit"]:
		frappe.throw(access["message"], frappe.PermissionError)
	idempotency_key = normalize_idempotency_key(idempotency_key)
	if not idempotency_key:
		frappe.throw(_("Давхар даралтаас хамгаалах түлхүүр шаардлагатай."), frappe.ValidationError)

	profile = frappe.db.get_value(
		"VIP Entertainer Profile",
		entertainer,
		["name", "employee", "branch", "active", "lifecycle_status"],
		as_dict=True,
	)
	if not profile or not profile.active or profile.lifecycle_status not in (None, "", "Active"):
		frappe.throw(_("Идэвхтэй бүжигчний бүртгэл олдсонгүй."), frappe.DoesNotExistError)
	_assert_branch_access(actor, profile.branch)
	frappe.db.sql("SELECT name FROM `tabVIP Entertainer Profile` WHERE name=%s FOR UPDATE", profile.name)

	replay = frappe.db.get_value(
		"VIP API Audit Event",
		{
			"actor": actor.user,
			"action": AUDIT_ACTION,
			"idempotency_key": idempotency_key,
			"outcome": "Succeeded",
		},
		["name", "target_name", "details"],
		as_dict=True,
	)
	if replay:
		try:
			details = json.loads(replay.details or "{}")
		except (TypeError, ValueError):
			details = {}
		if details.get("entertainer") != profile.name or details.get("work_date") != str(work_date):
			frappe.throw(_("Энэ давхар илгээлтийн түлхүүрийг өөр гараанд ашигласан байна."), frappe.TimestampMismatchError)
		return {**_payload(profile.branch, work_date, access), "replayed": True, "audit": replay.name}

	roster = _checked_in_roster(profile.branch, work_date)
	person = next((row for row in roster if row.entertainer == profile.name), None)
	if not person:
		frappe.throw(_("Бүжигчин өнөөдөр QR-аар ирцээ бүртгүүлээгүй байна."), frappe.ValidationError)
	if now_datetime() >= _shift_end_datetime(work_date, person):
		frappe.throw(_("Ээлж дууссан тул гарааны бүртгэл хаагдсан байна."), frappe.ValidationError)
	existing = _day_events(work_date, [profile.name]).get(profile.name, [])
	used_rounds = {event.round_number for event in existing}
	if len(used_rounds) >= DAILY_TARGET:
		frappe.throw(_("Өнөөдрийн 7 гараа бүрэн бүртгэгдсэн байна."), frappe.ValidationError)
	round_number = next(number for number in range(1, DAILY_TARGET + 1) if number not in used_rounds)
	event = frappe.get_doc({
		"doctype": "VIP Performance Event",
		"entertainer": profile.name,
		"event_type": EVENT_TYPE,
		"occurred_at": now_datetime(),
		"verified": 1,
		"source": EVENT_SOURCE,
		"external_id": _event_id(work_date, profile.name, round_number),
		"source_document_type": "Employee Checkin",
		"source_document_name": person.employee_checkin,
	}).insert(ignore_permissions=True)
	audit = record_api_audit(
		actor=actor,
		action=AUDIT_ACTION,
		target_doctype=event.doctype,
		target_name=event.name,
		idempotency_key=idempotency_key,
		details={
			"entertainer": profile.name,
			"work_date": str(work_date),
			"round_number": round_number,
			"daily_target": DAILY_TARGET,
			"employee_checkin": person.employee_checkin,
		},
	)
	frappe.db.commit()
	return {**_payload(profile.branch, work_date, access), "replayed": False, "audit": audit}


def finalize_stage_round_penalties():
	"""Create manager-review proposals after today's operating shift has ended."""
	from nomad_vip.api.attendance_policy import _create_penalty

	work_date = _operational_date()
	current_time = now_datetime()
	branches = frappe.db.sql(
		"""
		select distinct branch
		from `tabVIP Entertainer Profile`
		where active = 1 and coalesce(lifecycle_status, 'Active') = 'Active'
			and coalesce(branch, '') != ''
		""",
		pluck=True,
	)
	created = []
	for branch in branches:
		roster = _checked_in_roster(branch, work_date)
		events = _day_events(work_date, [row.entertainer for row in roster])
		for row in roster:
			if current_time < _shift_end_datetime(work_date, row):
				continue
			count = len({event.round_number for event in events.get(row.entertainer, [])})
			missing_rounds = max(0, DAILY_TARGET - count)
			if not missing_rounds:
				continue
			penalty = _create_penalty(
				frappe._dict({"name": row.entertainer, "employee": row.employee, "branch": row.branch}),
				work_date,
				frappe._dict({"name": row.shift_assignment}),
				"Stage Round",
				missing_rounds * ROUND_PENALTY_RATE,
				ROUND_PENALTY_RATE,
				_("Өдрийн {0} гараанаас {1} дутуу. Нэг гараа {2}₮.").format(
					DAILY_TARGET, missing_rounds, f"{ROUND_PENALTY_RATE:,}"
				),
				missed_rounds=missing_rounds,
				source_checkin=row.employee_checkin,
			)
			created.append(penalty.name)
	frappe.db.commit()
	return {"work_date": work_date, "penalties": created, "count": len(created)}
