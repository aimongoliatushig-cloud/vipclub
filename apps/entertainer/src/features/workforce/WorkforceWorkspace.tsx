import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Database,
  History,
  Languages,
  Medal,
  ReceiptText,
  RefreshCw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Tags,
  UserCheck,
  UserX,
  WalletCards,
  X,
} from "lucide-react";
import {
  api,
  idempotencyKey,
  type AvailabilityStatus,
  type EditableProfileData,
  type PersonalScheduleWeek,
  type ProfileChangeRequest,
  type ProfileChangeValues,
  type WorkforceProfile,
  type WorkforceWorkspace,
} from "../../api";
import { entertainerRankLabel } from "../../ranks";

const money = new Intl.NumberFormat("mn-MN", {
  style: "currency",
  currency: "MNT",
  maximumFractionDigits: 0,
});
const dayDate = new Intl.DateTimeFormat("mn-MN", {
  month: "2-digit",
  day: "2-digit",
});
const dayLabels = ["Ня", "Да", "Мя", "Лх", "Пү", "Ба", "Бя"];
const scheduleWeekRange = (start: string) => {
  const from = new Date(`${start}T00:00:00`);
  if (Number.isNaN(from.getTime())) return start;
  const to = new Date(from);
  to.setDate(to.getDate() + 6);
  return `${dayDate.format(from)}–${dayDate.format(to)}`;
};

const timeOnly = (value?: string | null) => {
  if (!value) return "—";
  const [hours = "0", minutes = "00"] = String(value).split(":");
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
};
const shiftTypeLabel = (value?: string | null) =>
  (
    ({
      "VIP Night Shift": "Шөнийн ээлж",
      "Night Shift": "Шөнийн ээлж",
      "Day Shift": "Өдрийн ээлж",
    }) as Record<string, string>
  )[value || ""] || value;
const fullDateTime = (value: string) => {
  const date = new Date(value.replace(" ", "T"));
  const part = (input: number) => String(input).padStart(2, "0");
  return `${date.getFullYear()}.${part(date.getMonth() + 1)}.${part(date.getDate())} ${part(date.getHours())}:${part(date.getMinutes())}`;
};
const tags = (value?: string) =>
  String(value || "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
const statusLabel = (value: string) =>
  value === "Approved"
    ? "Зөвшөөрсөн"
    : value === "Rejected"
      ? "Татгалзсан"
      : value === "Pending"
        ? "Шийдвэр хүлээж байна"
        : "Цуцалсан";
const lifecycleLabel = (value?: string) =>
  (
    ({
      Active: "Идэвхтэй",
      Inactive: "Идэвхгүй",
      Suspended: "Түр түдгэлзүүлсэн",
    }) as Record<string, string>
  )[value || ""] ||
  value ||
  "Идэвхтэй";
const employmentLabel = (value?: string) =>
  (
    ({
      Employee: "Үндсэн ажилтан",
      "Full-time": "Үндсэн ажилтан",
      "Part-time": "Цагийн ажилтан",
      Contractor: "Гэрээт ажилтан",
      Temporary: "Түр ажилтан",
    }) as Record<string, string>
  )[value || ""] ||
  value ||
  "Ажилтан";
const availabilityLabel: Record<AvailabilityStatus, string> = {
  Unavailable: "Боломжгүй",
  Available: "Бэлэн",
  Scheduled: "Ээлжтэй",
  Reserved: "Захиалгатай",
  Working: "Ажиллаж байна",
  Break: "Завсарлагатай",
  Leave: "Чөлөөтэй",
};

function WorkspaceState({
  error,
  onRetry,
}: {
  error?: string;
  onRetry: () => void;
}) {
  return (
    <section className={`workspace-state ${error ? "failed" : ""}`}>
      {error ? <AlertTriangle /> : <RefreshCw className="spin" />}
      <strong>
        {error ? "Мэдээлэл ачаалсангүй" : "Ажлын мэдээллийг ачаалж байна…"}
      </strong>
      {error ? (
        <>
          <p>{error}</p>
          <button className="outline-button" onClick={onRetry}>
            <RefreshCw />
            Дахин оролдох
          </button>
        </>
      ) : null}
    </section>
  );
}

function BackHeader({
  title,
  branch,
  onBack,
  manager = false,
}: {
  title: string;
  branch: string;
  onBack: () => void;
  manager?: boolean;
}) {
  return (
    <div className="workspace-header">
      <button className="back-link" onClick={onBack}>
        <ArrowLeft />
        Буцах
      </button>
      <div>
        <span>{branch} салбар</span>
        <h1>{title}</h1>
        <p>
          {manager
            ? "Таны салбарын ажилтны ажлын мэдээлэл"
            : "Зөвхөн таны өөрийн ажлын мэдээлэл"}
        </p>
      </div>
    </div>
  );
}

function WeekRail({ data }: { data: WorkforceWorkspace }) {
  const today = new Date().toISOString().slice(0, 10);
  const workDays = data.week.days.filter(
    (day) => day.assignment || day.imported?.scheduled,
  ).length;
  return (
    <section className="week-panel">
      <header>
        <div>
          <CalendarDays />
          <span>
            <strong>Энэ долоо хоног</strong>
            <small>
              {dayDate.format(new Date(`${data.week.start}T00:00:00`))}–
              {dayDate.format(new Date(`${data.week.end}T00:00:00`))}
            </small>
          </span>
        </div>
        <b>{workDays} ажлын өдөр</b>
      </header>
      <div className="week-rail">
        {data.week.days.map((day) => (
          <article
            key={day.date}
            className={`${day.date === today ? "today" : ""} ${day.assignment ? "scheduled" : day.imported?.scheduled ? "imported" : "off"} ${day.schedule_conflict ? "conflict" : ""}`}
          >
            <span>{dayLabels[new Date(`${day.date}T00:00:00`).getDay()]}</span>
            <strong>{dayDate.format(new Date(`${day.date}T00:00:00`))}</strong>
            <small>
              {day.assignment
                ? `${timeOnly(day.start_time)}–${timeOnly(day.end_time)}`
                : day.imported?.scheduled
                  ? "Ажиллана"
                  : "Амралт"}
            </small>
            {day.imported ? (
              <em className={day.schedule_conflict ? "conflict" : ""}>
                {day.schedule_conflict ? <AlertTriangle /> : <Database />}
                {day.schedule_conflict ? "Зөрүү" : "Импорт"}
              </em>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function AttendanceHistory({ data }: { data: WorkforceWorkspace }) {
  const rows = data.attendance.filter((row) => row.log_type === "IN").slice(0, 8);
  return (
    <section className="workspace-list-section">
      <div className="workspace-section-title">
        <div>
          <h2>Ирцийн түүх</h2>
          <p>Сүүлд бүртгэгдсэн ирсэн цаг</p>
        </div>
        <Clock3 />
      </div>
      {rows.length ? (
        <div className="timeline-list">
          {rows.map((row) => (
            <article key={row.name}>
              <i className="in" />
              <div>
                <strong>Ажилдаа ирсэн</strong>
                <small>{row.shift || "Ээлж тодорхойгүй"}</small>
              </div>
              <time>{fullDateTime(row.time)}</time>
            </article>
          ))}
        </div>
      ) : (
        <div className="workspace-empty">
          Ирцийн бүртгэл хараахан алга байна.
        </div>
      )}
    </section>
  );
}

function PenaltySummary({
  data,
  manager = false,
  onChanged,
}: {
  data: WorkforceWorkspace;
  manager?: boolean;
  onChanged?: () => void;
}) {
  const approved = data.penalties.filter((row) => row.status === "Approved");
  const pending = data.penalties.filter(
    (row) => row.status === "Pending Review",
  );
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string>();
  const [message, setMessage] = useState<string>();
  const decide = async (
    name: string,
    decision: "Approved" | "Rejected",
    modified: string,
  ) => {
    const reason = (reasons[name] || "").trim();
    if (reason.length < 5) return;
    setBusy(`${name}:${decision}`);
    setMessage(undefined);
    try {
      await api.decidePenalty(name, decision, reason, modified);
      setMessage(
        decision === "Approved"
          ? "Суутгалыг баталгаажууллаа."
          : "Суутгалын саналыг татгалзлаа.",
      );
      onChanged?.();
    } catch (value) {
      setMessage(
        value instanceof Error
          ? value.message
          : "Шийдвэр хадгалахад алдаа гарлаа.",
      );
    } finally {
      setBusy(undefined);
    }
  };
  return (
    <section className="workspace-list-section">
      <div className="workspace-section-title">
        <div>
          <h2>Энэ сарын суутгал</h2>
          <p>Зөвхөн менежерийн баталгаажуулсан дүн цалингаас суутгагдана</p>
        </div>
        <WalletCards />
      </div>
      <div className="deduction-summary">
        <span>
          <small>Баталгаажсан дүн</small>
          <strong>{money.format(data.summary.active_deduction)}</strong>
        </span>
        <span>
          <small>Баталгаажсан хоцролт</small>
          <strong>{data.summary.late_minutes} минут</strong>
        </span>
      </div>
      {manager && pending.length ? (
        <div className="penalty-review-list">
          <h3>Шийдвэр хүлээж буй санал · {pending.length}</h3>
          {pending.map((row) => (
            <article key={row.name}>
              <div className="penalty-review-copy">
                <AlertTriangle />
                <span>
                  <strong>
                    {row.penalty_type === "Absence"
                      ? "Өдрийн таслалтын санал"
                      : row.penalty_type === "Stage Round"
                        ? `${row.missed_rounds || 0} дутуу гарааны санал`
                        : `${row.late_minutes} минут хоцролтын санал`}
                  </strong>
                  <small>
                    {row.attendance_date} · {row.reason}
                  </small>
                </span>
                <b>{money.format(row.amount)}</b>
              </div>
              <label>
                <span>Шийдвэрийн үндэслэл</span>
                <input
                  value={reasons[row.name] || ""}
                  onChange={(event) =>
                    setReasons((current) => ({
                      ...current,
                      [row.name]: event.target.value,
                    }))
                  }
                  placeholder="Жишээ: Ирцийн нотолгоог шалгав"
                  minLength={5}
                />
              </label>
              <div className="penalty-review-actions">
                <button
                  type="button"
                  className="outline-button danger"
                  onClick={() =>
                    void decide(row.name, "Rejected", row.modified)
                  }
                  disabled={
                    Boolean(busy) || (reasons[row.name] || "").trim().length < 5
                  }
                >
                  {busy === `${row.name}:Rejected` ? (
                    <RefreshCw className="spin" />
                  ) : (
                    <X />
                  )}
                  Татгалзах
                </button>
                <button
                  type="button"
                  className="gold-button"
                  onClick={() =>
                    void decide(row.name, "Approved", row.modified)
                  }
                  disabled={
                    Boolean(busy) || (reasons[row.name] || "").trim().length < 5
                  }
                >
                  {busy === `${row.name}:Approved` ? (
                    <RefreshCw className="spin" />
                  ) : (
                    <CheckCircle2 />
                  )}
                  Батлах
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
      {message ? (
        <p className="penalty-review-message" role="status">
          {message}
        </p>
      ) : null}
      {approved.length ? (
        <div className="penalty-list">
          {approved.map((row) => (
            <article key={row.name}>
              <AlertTriangle />
              <div>
                <strong>
                  {row.penalty_type === "Absence"
                    ? "Өдрийн таслалт"
                    : row.penalty_type === "Stage Round"
                      ? `${row.missed_rounds || 0} гараа дутуу`
                      : `${row.late_minutes} минут хоцролт`}
                </strong>
                <small>
                  {row.attendance_date} · {row.decision_reason || row.reason}
                </small>
              </div>
              <b>{money.format(row.amount)}</b>
            </article>
          ))}
        </div>
      ) : (
        <div className="workspace-empty success">
          <CheckCircle2 />
          Баталгаажсан суутгал алга
        </div>
      )}
    </section>
  );
}

function ProfileOverview({ data }: { data: WorkforceWorkspace }) {
  const profile = data.profile;
  const dailyScore = profile.daily_rank?.status === "Complete"
    ? profile.daily_rank.displayed_score ?? profile.daily_rank.weighted_score
    : null;
  const groups = [
    { icon: <Sparkles />, label: "Ур чадвар", items: tags(profile.skills) },
    { icon: <Languages />, label: "Хэл", items: tags(profile.languages) },
    { icon: <Tags />, label: "Үйлчилгээ", items: tags(profile.service_tags) },
    {
      icon: <Tags />,
      label: "Төрх ба хэв маяг",
      items: tags(profile.style_tags),
    },
  ];
  const populatedGroups = groups.filter((group) => group.items.length);
  return (
    <>
      <section className="workspace-profile-card">
        <div className="avatar workspace-avatar">
          {profile.profile_photo ? (
            <img src={profile.profile_photo} alt="" />
          ) : (
            <img
              src="/staff/profile-dancer-default.webp"
              alt=""
              aria-hidden="true"
            />
          )}
        </div>
        <div>
          <div className="profile-name-line">
            <h2>{profile.stage_name || profile.employee_name}</h2>
            {profile.is_demo ? <span className="demo-badge">DEMO</span> : null}
          </div>
          <p>
            {profile.branch} · {employmentLabel(profile.employment_type)}
          </p>
          <span>
            <Medal />
            {entertainerRankLabel(profile.current_rank)}
            {dailyScore != null ? ` · Өдрийн оноо ${Number(dailyScore).toLocaleString("mn-MN", { maximumFractionDigits: 2 })}` : ""}
          </span>
        </div>
        <b>{lifecycleLabel(profile.lifecycle_status)}</b>
      </section>
      <section className="profile-facts">
        <article>
          <small>Ажилтны нэр</small>
          <strong>{profile.employee_name || "—"}</strong>
        </article>
        <article>
          <small>Зураг ашиглах зөвшөөрөл</small>
          <strong>
            {profile.media_consent_status === "Granted"
              ? "Зөвшөөрсөн"
              : "Зөвшөөрөлгүй"}
          </strong>
        </article>
      </section>
      {populatedGroups.length ? (
        <section className="capability-groups">
          {populatedGroups.map((group) => (
            <article key={group.label}>
              <header>
                {group.icon}
                <strong>{group.label}</strong>
              </header>
              <div>
                {group.items.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="profile-data-empty">
          <Sparkles />
          <div>
            <strong>Профайлын нэмэлт мэдээлэл оруулаагүй</strong>
            <p>
              Ур чадвар, хэл, үйлчилгээ болон хэв маягийн мэдээллийг ажилтан
              хүсэлтээр оруулна.
            </p>
          </div>
        </section>
      )}
    </>
  );
}

function ManagerPerformanceSummary({ data }: { data: WorkforceWorkspace }) {
  const performance = data.performance;
  if (!performance)
    return (
      <section className="manager-performance-empty">
        <ReceiptText />
        <div>
          <strong>Тооцооны мэдээлэл холбогдоогүй</strong>
          <p>
            Ажилтны бүртгэлийг тооцооны системийн нэртэй тулган холбосны дараа
            бодит үзүүлэлт энд харагдана.
          </p>
        </div>
      </section>
    );
  return (
    <section
      className="manager-performance"
      aria-labelledby="manager-performance-title"
    >
      <header>
        <div>
          <span>БОДИТ ҮЗҮҮЛЭЛТ</span>
          <h2 id="manager-performance-title">Ажил, орлогын товч</h2>
          <p>
            {performance.window.from} – {performance.window.to} · зөвхөн
            төлөгдсөн баримтаас
          </p>
        </div>
        <CircleDollarSign />
      </header>
      <div className="manager-performance-grid">
        <article>
          <small>Энэ сарын орлого</small>
          <strong>{money.format(performance.current_month_income)}</strong>
        </article>
        <article>
          <small>Сүүлийн 62 хоногийн орлого</small>
          <strong>{money.format(performance.net_income)}</strong>
        </article>
        <article>
          <small>Үйлчилгээ</small>
          <strong>{performance.service_count}</strong>
          <span>удаа</span>
        </article>
        <article>
          <small>Төлөгдсөн баримт</small>
          <strong>{performance.bill_count}</strong>
          <span>баримт</span>
        </article>
      </div>
      {performance.recent_services.length ? (
        <details className="manager-performance-services">
          <summary>
            <Sparkles />
            <span>
              <strong>Сүүлийн үйлчилгээнүүд</strong>
              <small>{performance.recent_services.length} бүртгэл</small>
            </span>
            <ChevronDown />
          </summary>
          <div>
            {performance.recent_services.map((row) => (
              <p key={row.key}>
                <span>
                  <strong>{row.service}</strong>
                  <small>
                    {row.date} · {row.percent}%
                  </small>
                </span>
                <b>{money.format(row.amount)}</b>
              </p>
            ))}
          </div>
        </details>
      ) : null}
      <footer>
        <ShieldCheck />
        <span>
          {performance.last_synced_at
            ? `${fullDateTime(performance.last_synced_at)}-д шинэчилсэн`
            : "Шинэчлэгдсэн хугацаа бүртгэгдээгүй"}{" "}
          · Зочны мэдээлэл болон бүтэн баримт харагдахгүй.
        </span>
      </footer>
    </section>
  );
}

function ManagerControlCenter({
  data,
  onChanged,
}: {
  data: WorkforceWorkspace;
  onChanged: () => Promise<unknown>;
}) {
  const controls = data.manager_controls;
  const currentAvailability = controls?.availability.status || "Unavailable";
  const [availability, setAvailability] =
    useState<AvailabilityStatus>(currentAvailability);
  const [availabilityReason, setAvailabilityReason] = useState("");
  const [busy, setBusy] = useState<"availability" | "">("");
  const [availabilityMessage, setAvailabilityMessage] = useState<{
    type: "success" | "failed";
    text: string;
  }>();
  const availabilityKeys = useRef(new Map<string, string>());

  useEffect(() => {
    setAvailability(currentAvailability);
  }, [currentAvailability]);

  if (!controls) return null;

  const saveAvailability = async (event: React.FormEvent) => {
    event.preventDefault();
    if (
      availability === currentAvailability ||
      availabilityReason.trim().length < 5
    )
      return;
    const reason = availabilityReason.trim();
    const expectedEvent = controls.availability.name || "";
    const expectedVersion = controls.availability.state_version || 0;
    const fingerprint = `${data.profile.name}|${availability}|${expectedEvent}|${expectedVersion}|${reason}`;
    let requestKey = availabilityKeys.current.get(fingerprint);
    if (!requestKey) {
      requestKey = idempotencyKey("manager-availability-override");
      availabilityKeys.current.set(fingerprint, requestKey);
    }
    setBusy("availability");
    setAvailabilityMessage(undefined);
    try {
      await api.managerOverrideAvailability(
        data.profile.name,
        availability,
        reason,
        expectedEvent,
        expectedVersion,
        requestKey,
      );
      availabilityKeys.current.delete(fingerprint);
      await onChanged();
      setAvailabilityReason("");
      setAvailabilityMessage({
        type: "success",
        text: "Ажлын төлөв шинэчлэгдэж, өөрчлөлтийн түүхэнд бүртгэгдлээ.",
      });
    } catch (value) {
      setAvailabilityMessage({
        type: "failed",
        text:
          value instanceof Error
            ? value.message
            : "Төлөв шинэчлэхэд алдаа гарлаа.",
      });
    } finally {
      setBusy("");
    }
  };

  return (
    <section className="manager-control-center">
      <header className="manager-control-heading">
        <div>
          <SlidersHorizontal />
          <span>
            <h2>Менежерийн удирдлага</h2>
            <p>Ажилтны ажлын төлөвийг шалтгаантайгаар шинэчилнэ.</p>
          </span>
        </div>
        <span>
          <ShieldCheck />
          Үйлдэл бүр түүхэнд бүртгэгдэнэ
        </span>
      </header>
      <div className="manager-control-grid">
        <details className="manager-control-card">
          <summary>
            <i>
              <Activity />
            </i>
            <span>
              <small>Ажлын төлөв</small>
              <strong>{availabilityLabel[currentAvailability]}</strong>
            </span>
            <b>
              Өөрчлөх
              <ChevronDown />
            </b>
          </summary>
          <form onSubmit={saveAvailability}>
            <label>
              <span>Сонгох төлөв</span>
              <select
                value={availability}
                onChange={(event) =>
                  setAvailability(event.target.value as AvailabilityStatus)
                }
                disabled={busy === "availability"}
              >
                {controls.availability_options.map((option) => (
                  <option key={option} value={option}>
                    {availabilityLabel[option]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Өөрчлөлтийн шалтгаан</span>
              <textarea
                value={availabilityReason}
                onChange={(event) => setAvailabilityReason(event.target.value)}
                disabled={busy === "availability"}
                minLength={5}
                maxLength={240}
                placeholder="Жишээ: Үйлчилгээний захиалга баталгаажсан"
              />
              <small>
                Хамгийн багадаа 5 тэмдэгт · одоо{" "}
                {availabilityReason.trim().length}
              </small>
            </label>
            {controls.availability.occurred_at ? (
              <p className="manager-control-last">
                Сүүлд шинэчилсэн:{" "}
                {fullDateTime(controls.availability.occurred_at)} ·{" "}
                {controls.availability.actor || "систем"}
              </p>
            ) : null}
            {availabilityMessage ? (
              <div
                className={`manager-control-message ${availabilityMessage.type}`}
                role={
                  availabilityMessage.type === "failed" ? "alert" : "status"
                }
              >
                {availabilityMessage.type === "success" ? (
                  <CheckCircle2 />
                ) : (
                  <AlertTriangle />
                )}
                {availabilityMessage.text}
              </div>
            ) : null}
            <button
              className="gold-button"
              type="submit"
              disabled={
                busy === "availability" ||
                availability === currentAvailability ||
                availabilityReason.trim().length < 5
              }
            >
              {busy === "availability" ? (
                <RefreshCw className="spin" />
              ) : (
                <Save />
              )}
              {busy === "availability"
                ? "Хадгалж байна…"
                : "Ажлын төлөв шинэчлэх"}
            </button>
          </form>
        </details>
      </div>
    </section>
  );
}

function useWorkspace(loader: () => Promise<WorkforceWorkspace>) {
  const [data, setData] = useState<WorkforceWorkspace>();
  const [error, setError] = useState("");
  const load = useCallback(() => {
    setError("");
    return loader()
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Мэдээлэл ачаалсангүй"),
      );
  }, [loader]);
  useEffect(() => {
    void load();
  }, [load]);
  return { data, error, load };
}

const profileFieldLabels: Record<keyof ProfileChangeValues, string> = {
  stage_name: "Тайзны нэр",
  skills: "Ур чадвар",
  languages: "Хэл",
  service_tags: "Үйлчилгээ",
  style_tags: "Төрх ба хэв маяг",
  profile_photo: "Профайлын зураг",
};
const profileValue = (value: unknown) => String(value || "").trim();
const requestChangedFields = (request: ProfileChangeRequest) =>
  Array.isArray(request.changed_fields)
    ? request.changed_fields
    : String(request.changed_fields || "")
        .split(/\r?\n|,/)
        .map((value) => value.trim())
        .filter(Boolean);
type ProfileReviewDecision = "Approved" | "Rejected";
const createProfileReviewKeys = (): Record<ProfileReviewDecision, string> => ({
  Approved: idempotencyKey("profile-change-review"),
  Rejected: idempotencyKey("profile-change-review"),
});

function ProfilePhotoSetting({
  profile,
  pending,
  onSubmitted,
}: {
  profile: WorkforceProfile;
  pending?: ProfileChangeRequest;
  onSubmitted: () => Promise<void>;
}) {
  const [photo, setPhoto] = useState<File>();
  const [preview, setPreview] = useState(profile.profile_photo || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  useEffect(() => {
    if (!photo) {
      setPreview(profile.profile_photo || "");
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo, profile.profile_photo]);
  const selectPhoto = (file?: File) => {
    setError("");
    setConsentAccepted(false);
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("JPG, PNG эсвэл WEBP зураг сонгоно уу.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(
        "Зураг 5 MB-аас их байна. Хэмжээг нь багасгах эсвэл өөр зураг сонгоно уу.",
      );
      return;
    }
    setPhoto(file);
  };
  const save = async () => {
    const needsConsent = profile.media_consent_status !== "Granted";
    if (!photo || pending || (needsConsent && !consentAccepted)) return;
    setBusy(true);
    setError("");
    try {
      const profile_photo = await api.uploadProfilePhoto(photo);
      let latest = profile;
      if (needsConsent) {
        const result = await api.setMediaConsent(
          "Granted",
          "profile-photo-self-service-v1",
          latest.modified,
          idempotencyKey("media-consent"),
        );
        latest = result.profile;
      }
      const proposal: ProfileChangeValues = {
        stage_name: String(latest.stage_name || ""),
        skills: String(latest.skills || ""),
        languages: String(latest.languages || ""),
        service_tags: String(latest.service_tags || ""),
        style_tags: String(latest.style_tags || ""),
        profile_photo,
      };
      await api.submitProfileChangeRequest(
        { ...proposal, expected_modified: latest.modified },
        idempotencyKey("profile-photo-request"),
      );
      setPhoto(undefined);
      setConsentAccepted(false);
      await onSubmitted();
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "Зургийн хүсэлтийг илгээж чадсангүй.",
      );
    } finally {
      setBusy(false);
    }
  };
  const visiblePhoto =
    preview && (photo || profile.media_consent_status === "Granted");
  return (
    <section
      className="self-profile-card"
      aria-labelledby="self-profile-title"
      aria-busy={busy}
    >
      <div className="self-profile-identity">
        <div className="self-profile-avatar">
          {visiblePhoto ? (
            <img src={preview} alt="Таны профайл зураг" />
          ) : (
            <img
              src="/staff/profile-dancer-default.webp"
              alt=""
              aria-hidden="true"
            />
          )}
        </div>
        <div className="self-profile-identity-copy">
          <strong id="self-profile-title">
            {profile.stage_name || profile.employee_name || "Бүжигчин"}
          </strong>
          <span>{profile.branch || "—"} · {entertainerRankLabel(profile.current_rank)}</span>
          <small><CheckCircle2 aria-hidden="true" />{lifecycleLabel(profile.lifecycle_status)}</small>
        </div>
        <label className={`self-photo-picker ${pending ? "disabled" : ""}`}>
          <Camera aria-hidden="true" />
          <span>Зураг {profile.profile_photo ? "солих" : "оруулах"}</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label={`Профайл зураг ${profile.profile_photo ? "солих" : "оруулах"}`}
            aria-describedby="self-photo-format"
            disabled={busy || Boolean(pending)}
            onChange={(event) => {
              selectPhoto(event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>
      <p className="sr-only" id="self-photo-format">
        JPG, PNG эсвэл WEBP зураг сонгоно. Дээд хэмжээ 5 MB; том зураг бол
        хэмжээг нь багасгаад дахин сонгоно уу.
      </p>
      <dl className="self-profile-facts" aria-label="Баталгаажсан ажлын мэдээлэл">
        <div>
          <dt>Ажилтны нэр</dt>
          <dd>{profile.employee_name || "—"}</dd>
        </div>
        <div>
          <dt>Ажилтны төрөл</dt>
          <dd>{employmentLabel(profile.employment_type)}</dd>
        </div>
      </dl>
      {pending ? (
        <div className="self-photo-status pending">
          <Clock3 />
          <span>
            <strong>Зургийн хүсэлт шалгагдаж байна</strong>
          </span>
        </div>
      ) : null}
      {photo && !pending && profile.media_consent_status !== "Granted" ? (
        <label className="self-photo-consent">
          <input
            type="checkbox"
            checked={consentAccepted}
            onChange={(event) => setConsentAccepted(event.target.checked)}
            disabled={busy}
          />
          <span>
            <strong>Энэ зургийг ажлын профайлд харуулахыг зөвшөөрч байна</strong>
            <small>Зөвшөөрөөгүй бол зураг илгээгдэхгүй.</small>
          </span>
        </label>
      ) : null}
      {photo && !pending ? (
        <div className="self-photo-actions">
          <button
            type="button"
            className="outline-button"
            onClick={() => {
              setPhoto(undefined);
              setConsentAccepted(false);
            }}
            disabled={busy}
          >
            Болих
          </button>
          <button
            type="button"
            className="gold-button"
            onClick={save}
            disabled={
              busy ||
              (profile.media_consent_status !== "Granted" && !consentAccepted)
            }
          >
            {busy ? <RefreshCw className="spin" /> : <Save />}
            {busy ? "Илгээж байна…" : "Зургийн хүсэлт илгээх"}
          </button>
        </div>
      ) : null}
      {error ? (
        <div className="self-photo-status failed" role="alert">
          <AlertTriangle />
          <span>{error}</span>
        </div>
      ) : null}
    </section>
  );
}

function ProfileChangeReview({
  profileName,
  onChanged,
}: {
  profileName: string;
  onChanged: () => Promise<unknown>;
}) {
  const [request, setRequest] = useState<ProfileChangeRequest>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<ProfileReviewDecision | "">("");
  const [message, setMessage] = useState<{
    type: "success" | "failed";
    text: string;
  }>();
  const [reviewKeys, setReviewKeys] = useState(createProfileReviewKeys);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.managerProfileChangeRequests("Pending", 0, 100);
      setRequest(
        result.requests.find((row) => row.entertainer === profileName),
      );
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "Профайл өөрчлөх хүсэлтийг ачаалсангүй.",
      );
    } finally {
      setLoading(false);
    }
  }, [profileName]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    setReviewKeys(createProfileReviewKeys());
  }, [request?.name, request?.modified]);
  if (loading)
    return (
      <section className="profile-review-card loading" aria-busy="true">
        <RefreshCw className="spin" />
        <span>Профайл өөрчлөх хүсэлтийг шалгаж байна…</span>
      </section>
    );
  if (error)
    return (
      <section className="profile-review-card failed">
        <AlertTriangle />
        <span>{error}</span>
        <button className="outline-button" onClick={load}>
          Дахин оролдох
        </button>
      </section>
    );
  if (!request) return null;
  const fields = requestChangedFields(request);
  const decide = async (decision: ProfileReviewDecision) => {
    if (reason.trim().length < 5) return;
    setBusy(decision);
    setMessage(undefined);
    try {
      await api.reviewProfileChangeRequest(
        request.name,
        decision,
        reason.trim(),
        request.modified,
        request.current_profile_modified || request.base_profile_modified || "",
        reviewKeys[decision],
      );
      setReviewKeys(createProfileReviewKeys());
      setMessage({
        type: "success",
        text:
          decision === "Approved"
            ? "Өөрчлөлтийг зөвшөөрч, үндсэн профайл шинэчлэгдлээ."
            : "Хүсэлтийг татгалзаж, үндсэн профайлыг хэвээр үлдээлээ.",
      });
      await onChanged();
      await load();
    } catch (value) {
      setMessage({
        type: "failed",
        text:
          value instanceof Error
            ? value.message
            : "Хүсэлтийг шийдвэрлэж чадсангүй.",
      });
    } finally {
      setBusy("");
    }
  };
  return (
    <section className="profile-review-card">
      <header>
        <div>
          <ClipboardCheck />
          <span>
            <small>ШИЙДВЭР ХҮЛЭЭЖ БАЙНА</small>
            <h2>Мэдээлэл өөрчлөх хүсэлт</h2>
            <p>{fullDateTime(request.requested_at)}-нд илгээсэн</p>
          </span>
        </div>
        <b>{fields.length} өөрчлөлт</b>
      </header>
      <div className="profile-diff-list">
        {fields.map((field) => {
          const key = field as keyof ProfileChangeValues;
          const change = request.changes?.find((row) => row.field === key);
          const before =
            profileValue(change?.before ?? request.current?.[key]) || "—";
          const after =
            profileValue(change?.after ?? request.proposed?.[key]) || "—";
          return (
            <article key={field}>
              <strong>{profileFieldLabels[key] || field}</strong>
              <div>
                <span>
                  {key === "profile_photo" && before !== "—"
                    ? "Одоогийн зураг"
                    : before}
                </span>
                <ArrowRight />
                <b>
                  {key === "profile_photo" && after !== "—"
                    ? "Шинэ зураг"
                    : after}
                </b>
              </div>
            </article>
          );
        })}
      </div>
      <label className="profile-review-reason">
        <span>Шийдвэрийн үндэслэл</span>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={240}
          placeholder="Жишээ: Мэдээллийг ажилтантай тулган баталгаажуулсан"
          disabled={Boolean(busy)}
        />
        <small>Хамгийн багадаа 5 тэмдэгт · одоо {reason.trim().length}</small>
      </label>
      {message ? (
        <div
          className={`manager-control-message ${message.type}`}
          role={message.type === "failed" ? "alert" : "status"}
        >
          {message.type === "success" ? <CheckCircle2 /> : <AlertTriangle />}
          {message.text}
        </div>
      ) : null}
      <footer>
        <button
          className="outline-button danger"
          onClick={() => decide("Rejected")}
          disabled={Boolean(busy) || reason.trim().length < 5}
        >
          {busy === "Rejected" ? <RefreshCw className="spin" /> : <UserX />}
          Татгалзах
        </button>
        <button
          className="gold-button"
          onClick={() => decide("Approved")}
          disabled={Boolean(busy) || reason.trim().length < 5}
        >
          {busy === "Approved" ? <RefreshCw className="spin" /> : <UserCheck />}
          Зөвшөөрөх
        </button>
      </footer>
    </section>
  );
}

export function EntertainerSchedulePage({
  branch,
  onBack,
}: {
  branch: string;
  onBack: () => void;
}) {
  const [data, setData] = useState<PersonalScheduleWeek>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [requestedWeekStart, setRequestedWeekStart] = useState("");
  const load = useCallback(async (weekStart = "") => {
    setRequestedWeekStart(weekStart);
    setError("");
    setLoading(true);
    try {
      const schedule = await api.entertainerSchedule(weekStart);
      if (
        !schedule?.week?.start ||
        !schedule.week.end ||
        !Array.isArray(schedule.week.days)
      ) {
        throw new Error("Хуваарийн мэдээлэл бүрэн бус байна.");
      }
      setData({
        ...schedule,
        attended_dates: Array.isArray(schedule.attended_dates)
          ? schedule.attended_dates
          : [],
      });
    } catch (value) {
      setError(
        value instanceof Error ? value.message : "Хуваарийг ачаалсангүй.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const requestedWeekLabel = requestedWeekStart
    ? scheduleWeekRange(requestedWeekStart)
    : "Энэ долоо хоног";
  const requestedWeekPossessive = requestedWeekStart
    ? `${requestedWeekLabel}-ийн`
    : "Энэ долоо хоногийн";

  if (!data) {
    return (
      <div className="page workforce-page entertainer-schedule-page">
        <button type="button" className="schedule-back-button" onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
          Нүүр рүү буцах
        </button>
        <WorkspaceState
          error={error ? `${requestedWeekLabel}: ${error}` : ""}
          onRetry={() => void load(requestedWeekStart)}
        />
      </div>
    );
  }

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ulaanbaatar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const weekStart = new Date(`${data.week.start}T00:00:00`);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const dateKey = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
    return data.week.days.find((day) => day.date === dateKey) || { date: dateKey };
  });
  const scheduledDays = days.filter((day) => Boolean(day.assignment)).length;
  const weekRange = `${dayDate.format(new Date(`${data.week.start}T00:00:00`))}–${dayDate.format(new Date(`${data.week.end}T00:00:00`))}`;
  const attendedDates = new Set(data.attended_dates || []);
  const changeWeek = (offset: number) => {
    const date = new Date(`${data.week.start}T00:00:00`);
    date.setDate(date.getDate() + offset * 7);
    const nextWeek = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
    void load(nextWeek);
  };

  return (
    <div className="page workforce-page entertainer-schedule-page">
      <button type="button" className="schedule-back-button" onClick={onBack}>
        <ArrowLeft aria-hidden="true" />
        Нүүр рүү буцах
      </button>
      <header className="entertainer-schedule-header">
        <div>
          <span>{branch} салбар</span>
          <h1>Миний ээлж</h1>
          <p>7 хоногоор харах хувийн хуваарь</p>
        </div>
        <div className="schedule-week-summary" aria-label="Хуваарийн товч мэдээлэл">
          <strong>{scheduledDays}</strong>
          <span>ээлж</span>
          <small>{weekRange}</small>
        </div>
      </header>
      {error ? (
        <section className="schedule-load-error" role="alert">
          <AlertTriangle aria-hidden="true" />
          <div>
            <strong>{requestedWeekPossessive} хуваарийг нээж чадсангүй</strong>
            <p>{error} Одоогоор өмнө ачаалсан {weekRange} хуваарийг харуулж байна.</p>
          </div>
          <button
            type="button"
            onClick={() => void load(requestedWeekStart)}
            disabled={loading}
          >
            <RefreshCw className={loading ? "spin" : ""} aria-hidden="true" />
            Дахин оролдох
          </button>
        </section>
      ) : null}
      <nav className="personal-week-navigation" aria-label="Хуваарийн долоо хоног сонгох">
        <button type="button" aria-label="Өмнөх долоо хоног" onClick={() => changeWeek(-1)} disabled={loading}>
          <ChevronLeft aria-hidden="true" />
        </button>
        <strong>{weekRange}</strong>
        <button type="button" aria-label="Дараагийн долоо хоног" onClick={() => changeWeek(1)} disabled={loading}>
          <ChevronRight aria-hidden="true" />
        </button>
        <button type="button" className="current-week-button" onClick={() => void load()} disabled={loading}>
          Энэ долоо хоног
        </button>
      </nav>
      <section className="personal-week-schedule" aria-label="7 хоногийн хуваарь">
        {days.map((day) => {
          const date = new Date(`${day.date}T00:00:00`);
          const isToday = day.date === today;
          const isConfirmed = Boolean(day.assignment);
          const isPending = !isConfirmed && Boolean(day.imported?.scheduled);
          const attended = attendedDates.has(day.date);
          return (
            <article
              key={day.date}
              className={`${isToday ? "is-today" : ""} ${isConfirmed ? "is-scheduled" : "is-off"} ${attended ? "is-attended" : ""}`}
            >
              <time dateTime={day.date}>
                <span>{dayLabels[date.getDay()]}</span>
                <strong>{dayDate.format(date)}</strong>
              </time>
              <div className="personal-shift-detail">
                <strong>
                  {isConfirmed
                    ? `${timeOnly(day.start_time)}–${timeOnly(day.end_time)}`
                    : isPending
                      ? "Хуваарь баталгаажаагүй"
                      : "Амралт"}
                </strong>
                {isConfirmed && day.shift_type ? (
                  <small>{shiftTypeLabel(day.shift_type)}</small>
                ) : null}
              </div>
              {attended ? <b className="attendance-day-badge"><CheckCircle2 aria-hidden="true" />Ирсэн</b> : isToday ? <b>Өнөөдөр</b> : null}
            </article>
          );
        })}
      </section>
    </div>
  );
}

export function EntertainerProfilePage() {
  const [data, setData] = useState<{
    workspace: WorkforceWorkspace;
    editable: EditableProfileData;
  }>();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    setError("");
    try {
      const [workspace, editable] = await Promise.all([
        api.entertainerWorkspace(),
        api.editableProfile(),
      ]);
      setData({
        workspace: { ...workspace, profile: editable.profile },
        editable,
      });
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "Хувийн мэдээллийг ачаалсангүй.",
      );
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const handleSubmitted = async () => {
    await load();
    setNotice("Зургийн хүсэлт менежерт илгээгдлээ.");
    window.setTimeout(() => setNotice(""), 4000);
  };
  const pending = data?.editable.pending_request;
  return (
    <div className="page workforce-page self-profile-page">
      <header className="self-profile-page-header">
        <h1>Миний мэдээлэл</h1>
      </header>
      {!data ? (
        <WorkspaceState error={error} onRetry={load} />
      ) : (
        <div className="self-profile-sections">
          <ProfilePhotoSetting
            profile={data.workspace.profile}
            pending={pending || undefined}
            onSubmitted={handleSubmitted}
          />
          {notice ? (
            <div className="self-photo-status success" role="status">
              <CheckCircle2 />
              <span>{notice}</span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

type ManagerDetailView = "summary" | "decisions" | "history";

export function ManagerEntertainerDetail({
  profileName,
  branch,
  onBack,
}: {
  profileName: string;
  branch: string;
  onBack: () => void;
}) {
  const loader = useCallback(
    () => api.managerEntertainerDetail(profileName),
    [profileName],
  );
  const { data, error, load } = useWorkspace(loader);
  const [view, setView] = useState<ManagerDetailView>("summary");
  const leaveSummary = useMemo(
    () => data?.leave_requests.slice(0, 4) || [],
    [data],
  );
  return (
    <div className="page workforce-page manager-detail-page">
      <BackHeader
        title="Ажилтны дэлгэрэнгүй"
        branch={branch}
        onBack={onBack}
        manager
      />
      {!data ? (
        <WorkspaceState error={error} onRetry={load} />
      ) : (
        <>
          <nav
            className="manager-detail-tabs"
            aria-label="Ажилтны мэдээллийн хэсэг"
          >
            <button
              className={view === "summary" ? "active" : ""}
              aria-current={view === "summary" ? "page" : undefined}
              onClick={() => setView("summary")}
            >
              <UserCheck />
              <span>
                <strong>Товч</strong>
                <small>Үндсэн мэдээлэл</small>
              </span>
            </button>
            <button
              className={view === "decisions" ? "active" : ""}
              aria-current={view === "decisions" ? "page" : undefined}
              onClick={() => setView("decisions")}
            >
              <SlidersHorizontal />
              <span>
                <strong>Шийдвэр</strong>
                <small>Төлөв, зэрэглэл, суутгал</small>
              </span>
            </button>
            <button
              className={view === "history" ? "active" : ""}
              aria-current={view === "history" ? "page" : undefined}
              onClick={() => setView("history")}
            >
              <History />
              <span>
                <strong>Түүх</strong>
                <small>Хуваарь, ирц, чөлөө</small>
              </span>
            </button>
          </nav>
          <div className="manager-detail-view" key={view}>
            {view === "summary" ? (
              <>
                <ProfileOverview data={data} />
                <ManagerPerformanceSummary data={data} />
                <section className="workspace-metrics manager-detail-metrics">
                  <article>
                    <CalendarDays />
                    <small>Энэ долоо хоног</small>
                    <strong>{data.summary.scheduled_days}</strong>
                    <span>ээлж</span>
                  </article>
                  <article>
                    <Clock3 />
                    <small>Ирцийн бүртгэл</small>
                    <strong>{data.summary.attendance_events}</strong>
                  </article>
                  <article
                    className={data.summary.active_deduction ? "danger" : ""}
                  >
                    <WalletCards />
                    <small>Баталгаажсан суутгал</small>
                    <strong>
                      {money.format(data.summary.active_deduction)}
                    </strong>
                  </article>
                </section>
                <button
                  type="button"
                  className="manager-next-action"
                  onClick={() => setView("decisions")}
                >
                  <span>
                    <strong>Менежерийн шийдвэрүүд</strong>
                    <small>
                      Ажлын төлөв, зэрэглэл болон суутгалын саналыг шалгах
                    </small>
                  </span>
                  <ArrowRight />
                </button>
              </>
            ) : null}
            {view === "decisions" ? (
              <>
                <ProfileChangeReview
                  profileName={profileName}
                  onChanged={async () => {
                    await load();
                    setView("summary");
                  }}
                />
                <ManagerControlCenter data={data} onChanged={load} />
                <PenaltySummary data={data} manager onChanged={load} />
              </>
            ) : null}
            {view === "history" ? (
              <>
                <WeekRail data={data} />
                <AttendanceHistory data={data} />
                <section className="workspace-list-section">
                  <div className="workspace-section-title">
                    <div>
                      <h2>Чөлөөний түүх</h2>
                      <p>Сүүлийн хүсэлт, шийдвэрүүд</p>
                    </div>
                    <CalendarDays />
                  </div>
                  {leaveSummary.length ? (
                    <div className="leave-mini-list">
                      {leaveSummary.map((row) => (
                        <article key={row.name}>
                          <div>
                            <strong>{row.leave_date}</strong>
                            <small>{row.reason}</small>
                          </div>
                          <span
                            className={`leave-status ${row.status.toLowerCase()}`}
                          >
                            {statusLabel(row.status)}
                          </span>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="workspace-empty">
                      Чөлөөний хүсэлт хараахан алга байна.
                    </div>
                  )}
                </section>
              </>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
