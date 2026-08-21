import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { api, idempotencyKey } from "../../api";
import type { ManagerScheduleData, ShiftAssignmentBrief } from "../../api";
import "./ManagerSchedule.css";

const dayNames = ["Ня", "Да", "Мя", "Лх", "Пү", "Ба", "Бя"];

const dateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const localToday = () => dateKey(new Date());
const moveDate = (value: string, days: number) => {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return dateKey(date);
};
const readableDate = (value: string) => {
  const date = new Date(`${value}T12:00:00`);
  return {
    day: dayNames[date.getDay()],
    date: `${value.slice(5, 7)}/${value.slice(8, 10)}`,
  };
};
const compactRange = (from: string, to: string) => {
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  return start.getMonth() === end.getMonth()
    ? `${start.getMonth() + 1}-р сарын ${start.getDate()}–${end.getDate()}`
    : `${start.getMonth() + 1}-р сарын ${start.getDate()} – ${end.getMonth() + 1}-р сарын ${end.getDate()}`;
};
const shortTime = (value?: string | null) =>
  value ? String(value).slice(0, 5).padStart(5, "0") : "—";

type Selection = {
  employee: string;
  profile?: string | null;
  displayName: string;
  roleLabel: string;
  memberType: "Entertainer" | "Employee";
  date: string;
  assignment?: ShiftAssignmentBrief | null;
};

export function ManagerSchedulePage({
  branch,
  onOpenRosterReview,
}: {
  branch: string;
  onOpenRosterReview?: () => void;
}) {
  const [startDate, setStartDate] = useState(localToday);
  const [selectedDate, setSelectedDate] = useState(localToday);
  const [data, setData] = useState<ManagerScheduleData>();
  const [selection, setSelection] = useState<Selection>();
  const [shiftType, setShiftType] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [memberType, setMemberType] = useState<"Entertainer" | "Employee">(
    "Entertainer",
  );
  const requestKey = useRef("");
  const loadSequence = useRef(0);

  const load = useCallback(
    async (from = startDate) => {
      const sequence = ++loadSequence.current;
      setLoading(true);
      setError("");
      try {
        const value = await api.managerSchedule(from, 7);
        if (sequence !== loadSequence.current) return;
        setData(value);
        setSelectedDate((current) =>
          value.dates.includes(current) ? current : value.dates[0] || from,
        );
      } catch (caught) {
        if (sequence !== loadSequence.current) return;
        setError(
          caught instanceof Error
            ? caught.message
            : "Хуваарийг ачаалж чадсангүй.",
        );
      } finally {
        if (sequence === loadSequence.current) setLoading(false);
      }
    },
    [startDate],
  );

  useEffect(() => {
    void load(startDate);
    return () => {
      loadSequence.current += 1;
    };
  }, [startDate, load]);

  const openEditor = (
    person: ManagerScheduleData["people"][number],
    date: string,
    assignment?: ShiftAssignmentBrief | null,
    editable = true,
  ) => {
    if (!editable) return;
    setSelection({
      employee: person.employee,
      profile: person.profile,
      displayName: person.display_name,
      roleLabel: person.role_label,
      memberType: person.member_type,
      date,
      assignment,
    });
    setShiftType(assignment?.shift_type || "");
    setReason("");
    setError("");
    setMessage("");
    requestKey.current = idempotencyKey("manager-schedule");
  };

  const save = async () => {
    if (!selection || reason.trim().length < 5 || saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await api.setManagerSchedule(
        {
          employee_name: selection.employee,
          profile_name: selection.profile,
          work_date: selection.date,
          shift_type: shiftType,
          reason: reason.trim(),
          expected_assignment: selection.assignment?.name || "",
          expected_modified: selection.assignment?.modified || "",
        },
        requestKey.current,
      );
      setSelection(undefined);
      setMessage(
        `${selection.displayName}-ийн ${selection.date} өдрийн хуваарь хадгалагдлаа.`,
      );
      await load(startDate);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Хуваарийг хадгалж чадсангүй.",
      );
    } finally {
      setSaving(false);
    }
  };

  const visiblePeople = useMemo(
    () =>
      data?.people.filter((person) => person.member_type === memberType) || [],
    [data, memberType],
  );
  const selectedDayRows = useMemo(
    () =>
      visiblePeople.map((person) => ({
        ...person,
        day: person.days.find((day) => day.date === selectedDate),
      })),
    [selectedDate, visiblePeople],
  );

  const sourceLabel = (day: ManagerScheduleData["people"][number]["days"][number]) => {
    if (day.assignment) return "Баталгаажсан";
    return day.editable ? "Хуваарь оруулах" : "Бүртгэлгүй";
  };

  const scheduleLabel = (day: ManagerScheduleData["people"][number]["days"][number]) => day.assignment?.shift_type || "Хуваарьгүй";

  const changeWeek = (days: number) => {
    const next = moveDate(startDate, days);
    setStartDate(next);
    setSelectedDate(next);
  };

  return (
    <div className="page manager-schedule-page">
      <header className="manager-schedule-heading">
        <div>
          <span className="eyebrow">{branch} салбар · Менежер</span>
          <h1>Ээлжийн хуваарь</h1>
          <p>
            Менежер хуваарь төлөвлөнө. Ирцийг ажилтан салбарын QR-аар өөрөө
            бүртгүүлнэ.
          </p>
        </div>
        <button
          className="refresh-button"
          type="button"
          onClick={() => load()}
          disabled={loading}
        >
          <RefreshCw className={loading ? "spin" : ""} />
          <span>Шинэчлэх</span>
        </button>
      </header>

      <section className="schedule-policy-note">
        <ShieldCheck />
        <span>
          <strong>Менежерийн оруулсан хуваарь</strong>
          <small>Бүжигчин болон бусад ажилтны ээлжийг менежер эндээс төлөвлөж, өөрчлөлтийн түүхийг хадгална.</small>
        </span>
      </section>

      {data?.source_meta?.unlinked_candidates ? (
        <section className="schedule-unlinked-note">
          <AlertTriangle />
          <span>
            <strong>
              Импортолсон {data.source_meta.unlinked_candidates} нэр ажилтны бүртгэлтэй холбоогүй
            </strong>
            <small>
               Нэр бүрийг шалгаж зөв профайлтай холбоно.
            </small>
          </span>
          {onOpenRosterReview ? (
            <button type="button" onClick={onOpenRosterReview}>
              Нэрсийг шалгах
              <ChevronRight />
            </button>
          ) : null}
        </section>
      ) : null}

      <div className="schedule-week-toolbar">
        <button
          type="button"
          aria-label="Өмнөх долоо хоног"
          onClick={() => changeWeek(-7)}
        >
          <ChevronLeft />
        </button>
        <strong>
          {data ? compactRange(data.window.from, data.window.to) : "Долоо хоног"}
        </strong>
        <button
          type="button"
          className="today-button"
          onClick={() => {
            const today = localToday();
            setStartDate(today);
            setSelectedDate(today);
          }}
        >
          Өнөөдөр
        </button>
        <button
          type="button"
          className="next-week-button"
          aria-label="Дараагийн долоо хоног"
          onClick={() => changeWeek(7)}
        >
          <ChevronRight />
        </button>
      </div>

      {data ? (
        <div
          className="schedule-group-tabs"
          role="tablist"
          aria-label="Ажилтны төрөл"
        >
          <button
            type="button"
            role="tab"
            aria-selected={memberType === "Entertainer"}
            className={memberType === "Entertainer" ? "active" : ""}
            onClick={() => setMemberType("Entertainer")}
          >
            <span>
              <strong>Бүжигчид</strong>
              <small>Менежерийн оруулсан ээлж</small>
            </span>
            <b>
              {data.source_meta?.entertainer_count ??
                data.people.filter(
                  (person) => person.member_type === "Entertainer",
                ).length}
            </b>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={memberType === "Employee"}
            className={memberType === "Employee" ? "active" : ""}
            onClick={() => setMemberType("Employee")}
          >
            <span>
              <strong>Бусад ажилтан</strong>
              <small>Бармен, зөөгч, хамгаалагч</small>
            </span>
            <b>
              {data.source_meta?.employee_count ??
                data.people.filter(
                  (person) => person.member_type === "Employee",
                ).length}
            </b>
          </button>
        </div>
      ) : null}

      {message ? (
        <div className="schedule-message success" role="status">
          {message}
        </div>
      ) : null}
      {error && !selection ? (
        <div className="schedule-message error" role="alert">
          <AlertTriangle />
          {error}
          <button type="button" onClick={() => load()}>
            Дахин оролдох
          </button>
        </div>
      ) : null}

      {loading && !data ? (
        <div className="schedule-loading">
          <RefreshCw className="spin" />
          Хуваарь ачаалж байна…
        </div>
      ) : data ? (
        <>
          <div
            className="schedule-desktop-grid"
            role="table"
            aria-label="Долоо хоногийн ээлжийн хуваарь"
          >
            <div className="schedule-grid-head" role="row">
              <span role="columnheader">
                {memberType === "Entertainer" ? "Бүжигчин" : "Ажилтан"}
              </span>
              {data.dates.map((date) => {
                const label = readableDate(date);
                return (
                  <span key={date} role="columnheader">
                    <small>{label.day}</small>
                    <strong>{label.date}</strong>
                  </span>
                );
              })}
            </div>
            {visiblePeople.map((person) => (
              <div
                className="schedule-grid-row"
                role="row"
                key={person.employee}
              >
                <div className="schedule-person" role="rowheader">
                  <strong>{person.display_name}</strong>
                  <small>
                    {person.role_label}
                    {person.rank ? ` · ${person.rank}` : ""}
                  </small>
                </div>
                {person.days.map((day) => (
                  <button
                    key={day.date}
                    type="button"
                    role="cell"
                    className={`${day.assignment ? "scheduled" : "off"} ${day.editable ? "" : "locked"}`}
                    disabled={!day.editable}
                    onClick={() =>
                      openEditor(
                        person,
                        day.date,
                        day.assignment,
                        day.editable,
                      )
                    }
                  >
                    <span>{scheduleLabel(day)}</span>
                    <small>{sourceLabel(day)}</small>
                  </button>
                ))}
              </div>
            ))}
            {!visiblePeople.length ? (
              <div className="schedule-group-empty">
                <CalendarDays />
                <strong>
                  {memberType === "Entertainer"
                    ? "Бүжигчний бүртгэл алга"
                    : "Бусад ажилтан алга"}
                </strong>
                <span>
                  Ажилтны үндсэн бүртгэл болон салбарын тохиргоог шалгана уу.
                </span>
              </div>
            ) : null}
          </div>

          <div className="schedule-mobile-view">
            <div className="schedule-day-picker" aria-label="Өдөр сонгох">
              {data.dates.map((date) => {
                const label = readableDate(date);
                return (
                  <button
                    type="button"
                    key={date}
                    className={selectedDate === date ? "active" : ""}
                    onClick={() => setSelectedDate(date)}
                  >
                    <small>{label.day}</small>
                    <strong>{label.date}</strong>
                  </button>
                );
              })}
            </div>
            <div className="schedule-mobile-list">
              {selectedDayRows.map((person) => (
                <button
                  type="button"
                  key={person.employee}
                  className={person.day?.assignment ? "scheduled" : ""}
                  disabled={!person.day?.editable}
                  onClick={() =>
                    openEditor(
                      person,
                      selectedDate,
                      person.day?.assignment,
                      Boolean(person.day?.editable),
                    )
                  }
                >
                  <span>
                    <strong>{person.display_name}</strong>
                    <small>
                      {person.role_label}
                      {person.rank ? ` · ${person.rank}` : ""}
                    </small>
                  </span>
                  <em
                    className={
                      person.day?.assignment ? "scheduled" : ""
                    }
                  >
                    <CalendarDays />
                    {person.day
                      ? scheduleLabel(person.day)
                      : "Хуваарьгүй"}
                    <ChevronRight />
                  </em>
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}

      {selection ? (
        <div
          className="schedule-editor-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target && !saving)
              setSelection(undefined);
          }}
        >
          <section
            className="schedule-editor"
            role="dialog"
            aria-modal="true"
            aria-labelledby="schedule-editor-title"
          >
            <header>
              <div>
                <span>
                  {selection.date} ·{" "}
                  {selection.memberType === "Entertainer"
                    ? "Бүжигчин"
                    : selection.roleLabel}
                </span>
                <h2 id="schedule-editor-title">{selection.displayName}</h2>
              </div>
              <button
                type="button"
                aria-label="Хаах"
                onClick={() => setSelection(undefined)}
                disabled={saving}
              >
                <X />
              </button>
            </header>
            <div className="schedule-current">
              <Clock3 />
              <span>
                <small>Одоогийн хуваарь</small>
                <strong>{selection.assignment?.shift_type || "Ээлжгүй"}</strong>
              </span>
            </div>
            <label>
              <span>Ээлж</span>
              <select
                value={shiftType}
                onChange={(event) => setShiftType(event.target.value)}
                disabled={saving}
              >
                <option value="">Ээлжгүй</option>
                {data?.shift_types.map((shift) => (
                  <option key={shift.name} value={shift.name}>
                    {shift.name} · {shortTime(shift.start_time)}–
                    {shortTime(shift.end_time)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Өөрчилсөн шалтгаан</span>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Жишээ: Дараагийн долоо хоногийн батлагдсан хуваарь"
                maxLength={300}
                disabled={saving}
              />
            </label>
            {error ? (
              <div className="schedule-editor-error" role="alert">
                <AlertTriangle />
                {error}
              </div>
            ) : null}
            <footer>
              <button
                type="button"
                className="quiet-button"
                onClick={() => setSelection(undefined)}
                disabled={saving}
              >
                Болих
              </button>
              <button
                type="button"
                className="gold-button"
                onClick={save}
                disabled={saving || reason.trim().length < 5}
              >
                {saving ? <RefreshCw className="spin" /> : <CalendarDays />}
                {saving ? "Хадгалж байна…" : "Хуваарь хадгалах"}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}
