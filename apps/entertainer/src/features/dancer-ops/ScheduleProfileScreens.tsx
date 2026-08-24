import { useState } from "react";
import {
  Bell,
  CalendarCheck2,
  Check,
  ChevronRight,
  Clock3,
  FileText,
  Languages,
  LockKeyhole,
  Moon,
  QrCode,
  Settings2,
  ShieldCheck,
  Star,
  Sun,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { localeOptions, opsCopy, type OpsLocale } from "./locale";
import { formatCountdown, rankFactors, rankHistory, rankRules, rankSummary, shifts, type Shift } from "./model";
import { DisclosureRow, PageHeader, SegmentedControl, type OpsTheme } from "./ui";

type ScheduleMode = "today" | "week";

const dancerWeek = [
  { weekday: "Даваа", date: "8 сарын 24", isToday: true },
  { weekday: "Мягмар", date: "8 сарын 25", isToday: false },
  { weekday: "Лхагва", date: "8 сарын 26", isToday: false },
  { weekday: "Пүрэв", date: "8 сарын 27", isToday: false },
  { weekday: "Баасан", date: "8 сарын 28", isToday: false },
  { weekday: "Бямба", date: "8 сарын 29", isToday: false },
  { weekday: "Ням", date: "8 сарын 30", isToday: false },
] as const;

export function ScheduleScreen({ onShift, onAttendance }: { onShift: (shift: Shift) => void; onAttendance: () => void }) {
  const [mode, setMode] = useState<ScheduleMode>("week");
  const visibleDays = mode === "today" ? dancerWeek.slice(0, 1) : dancerWeek;
  return (
    <div className="ops-screen" data-screen="schedule">
      <PageHeader title="Хуваарь" />
      <SegmentedControl
        label="Хуваарийн харагдац"
        value={mode}
        options={[{ value: "today", label: "Өнөөдөр" }, { value: "week", label: "7 хоног" }]}
        onChange={setMode}
      />
      <section className="ops-schedule-summary">
        <small>{mode === "today" ? "8 сарын 24 · Даваа" : "8 сарын 24–30 · Даваа–Ням"}</small>
        <strong>{mode === "today" ? "Өнөөдрийн ээлж" : "3 ээлж · 22 цаг"}</strong>
        <span>Баталгаажсан хуваарь</span>
      </section>
      <button className="ops-schedule-attendance-card" type="button" onClick={onAttendance}>
        <span className="ops-module-icon"><QrCode aria-hidden="true" /></span>
        <span><small>QR ирц</small><strong>20:56 · Цагтаа</strong><span>Өнөөдрийн болон өмнөх бүртгэл</span></span>
        <ChevronRight aria-hidden="true" />
      </button>
      <section className="ops-week-schedule" aria-label={mode === "today" ? "Өнөөдрийн хуваарь" : "Даваагаас Ням хүртэлх хуваарь"}>
        {mode === "week" ? <div className="ops-section-heading"><h2>7 хоногийн хуваарь</h2><span>Даваа–Ням</span></div> : null}
        <div className="ops-week-day-list">
          {visibleDays.map((day) => {
            const shift = shifts.find((item) => item.date === day.date);
            const content = (
              <>
                <time><strong>{day.weekday}</strong><small>{day.date}</small></time>
                <span><strong>{shift ? `${shift.start}–${shift.end}` : "Амралт"}</strong><small>{shift ? shift.branch : "Ээлжгүй"}</small></span>
                <span className={`ops-week-day-state${shift ? shift.status === "Баталгаажсан" ? " is-success" : " is-warning" : ""}`}>{shift ? shift.status : null}</span>
                {shift ? <ChevronRight aria-hidden="true" /> : <i className="ops-week-day-empty-mark" aria-hidden="true" />}
              </>
            );
            return shift ? (
              <button key={day.date} className={`ops-week-day${day.isToday ? " is-today" : ""}`} type="button" onClick={() => onShift(shift)}>{content}</button>
            ) : (
              <div key={day.date} className="ops-week-day is-rest">{content}</div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export function ShiftDetailScreen({ shift, onBack, onRequestChange }: { shift: Shift; onBack: () => void; onRequestChange: () => void }) {
  return (
    <div className="ops-screen" data-screen="shift-detail">
      <PageHeader title="Ээлжийн дэлгэрэнгүй" onBack={onBack} />
      <section className="ops-shift-detail-hero">
        <small>{shift.weekday} · {shift.date}</small>
        <strong>{shift.start}–{shift.end}</strong>
        <span>{shift.branch}</span>
      </section>
      <div className="ops-key-value-list" role="list">
        <KeyValue label="Үргэлжлэх хугацаа" value="7 цаг" />
        <KeyValue label="Ирц бүртгэх" value="20:45–21:15" />
        <KeyValue label="Төлөв" value={shift.status} tone={shift.status === "Баталгаажсан" ? "success" : "warning"} />
        <KeyValue label="Салбар" value={shift.branch} />
      </div>
      <button className="ops-secondary-button ops-sticky-action" type="button" onClick={onRequestChange}>Ээлж солих хүсэлт гаргах</button>
    </div>
  );
}

export function ProfileScreen({
  isSenior,
  locale,
  onRank,
  onNotifications,
  onSettings,
}: {
  isSenior: boolean;
  locale: OpsLocale;
  onRank: () => void;
  onNotifications: () => void;
  onSettings: () => void;
}) {
  const copy = opsCopy[locale].profile;
  return (
    <div className="ops-screen" data-screen="profile">
      <PageHeader title={copy.title} />
      <section className="ops-profile-identity">
        <span className="ops-profile-avatar" aria-hidden="true">А</span>
        <div><h2>Ану</h2><p>{isSenior ? copy.seniorRole : copy.role} · Nomad</p></div>
      </section>
      <button className="ops-rank-summary" type="button" onClick={onRank}>
        <span><small>{copy.currentRank}</small><strong>{copy.rank}</strong></span>
        <span className="ops-rank-score"><strong>84.6</strong><small>{copy.averageScore}</small></span>
        <ChevronRight aria-hidden="true" />
      </button>
      <section className="ops-performance-summary" aria-labelledby="performance-title">
        <h2 id="performance-title">{copy.performance}</h2>
        <div>
          <span><small>{copy.rating}</small><strong>4.9</strong></span>
          <span><small>{copy.responseRate}</small><strong>96%</strong></span>
          <span><small>{copy.punctuality}</small><strong>97%</strong></span>
        </div>
      </section>
      <div className="ops-open-list ops-profile-menu">
        <DisclosureRow title={copy.notifications} detail={copy.notificationsDetail} icon={<Bell aria-hidden="true" />} onClick={onNotifications} />
        <DisclosureRow title={copy.documents} detail={copy.documentsDetail} icon={<FileText aria-hidden="true" />} />
        <DisclosureRow title={copy.privacy} detail={copy.privacyDetail} icon={<LockKeyhole aria-hidden="true" />} />
        <DisclosureRow title={copy.settings} detail={copy.settingsDetail} icon={<Settings2 aria-hidden="true" />} onClick={onSettings} />
      </div>
    </div>
  );
}

export function SettingsScreen({
  locale,
  theme,
  onBack,
  onLocaleChange,
  onThemeToggle,
}: {
  locale: OpsLocale;
  theme: OpsTheme;
  onBack: () => void;
  onLocaleChange: (locale: OpsLocale) => void;
  onThemeToggle: () => void;
}) {
  const copy = opsCopy[locale];
  const isDark = theme === "dark";

  return (
    <div className="ops-screen ops-settings-screen" data-screen="settings">
      <PageHeader title={copy.settings.title} onBack={onBack} backLabel={copy.settings.back} />
      <section className="ops-settings-group" aria-labelledby="language-setting-title">
        <div className="ops-settings-heading">
          <span><Languages aria-hidden="true" /></span>
          <div>
            <h2 id="language-setting-title">{copy.settings.language}</h2>
            <p>{copy.settings.languageDetail}</p>
          </div>
        </div>
        <div className="ops-language-options" role="radiogroup" aria-label={copy.settings.languageGroup}>
          {localeOptions.map((option) => {
            const selected = locale === option.locale;
            return (
              <button
                key={option.locale}
                className={selected ? "is-selected" : ""}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onLocaleChange(option.locale)}
              >
                <LanguageFlag locale={option.locale} />
                <strong lang={option.locale}>{option.label}</strong>
                <span className="ops-language-check" aria-hidden="true">{selected ? <Check /> : null}</span>
              </button>
            );
          })}
        </div>
      </section>
      <section className="ops-settings-appearance" aria-labelledby="appearance-setting-title">
        <h2 id="appearance-setting-title">{copy.settings.appearance}</h2>
        <button className="ops-theme-setting" type="button" role="switch" aria-checked={isDark} onClick={onThemeToggle}>
          <span>{isDark ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}</span>
          <span><strong>{copy.shell.appearance}</strong><small>{isDark ? copy.shell.darkMode : copy.shell.lightMode}</small></span>
          <i aria-hidden="true"><b /></i>
        </button>
      </section>
    </div>
  );
}

function LanguageFlag({ locale }: { locale: OpsLocale }) {
  if (locale === "mn") {
    return (
      <span className="ops-language-flag" aria-hidden="true">
        <svg viewBox="0 0 30 20">
          <rect width="10" height="20" fill="#c4272f" />
          <rect x="10" width="10" height="20" fill="#015197" />
          <rect x="20" width="10" height="20" fill="#c4272f" />
          <circle cx="5" cy="5" r="1.4" fill="#f9cf02" />
          <rect x="3.8" y="8" width="2.4" height="7" rx="1" fill="#f9cf02" />
        </svg>
      </span>
    );
  }
  if (locale === "en") {
    return (
      <span className="ops-language-flag" aria-hidden="true">
        <svg viewBox="0 0 30 20">
          <rect width="30" height="20" fill="#012169" />
          <path d="M0 0 30 20M30 0 0 20" stroke="#fff" strokeWidth="5" />
          <path d="M0 0 30 20M30 0 0 20" stroke="#c8102e" strokeWidth="2" />
          <path d="M15 0v20M0 10h30" stroke="#fff" strokeWidth="7" />
          <path d="M15 0v20M0 10h30" stroke="#c8102e" strokeWidth="4" />
        </svg>
      </span>
    );
  }
  return (
    <span className="ops-language-flag" aria-hidden="true">
      <svg viewBox="0 0 30 20">
        <rect width="30" height="6.67" fill="#fff" />
        <rect y="6.67" width="30" height="6.67" fill="#0039a6" />
        <rect y="13.34" width="30" height="6.66" fill="#d52b1e" />
      </svg>
    </span>
  );
}

export function RankScreen({ onBack }: { onBack: () => void }) {
  const [rulesOpen, setRulesOpen] = useState(false);
  const [showAllFactors, setShowAllFactors] = useState(false);
  return (
    <div className="ops-screen" data-screen="rank">
      <PageHeader title="Зэрэг" onBack={onBack} action={<button className="ops-text-button" type="button" aria-label="3 зэргийн дүрэм харах" aria-expanded={rulesOpen} onClick={() => setRulesOpen((value) => !value)}>Дүрэм</button>} />
      {rulesOpen ? (
        <section className="ops-rank-rules" aria-label="Зэргийн дүрэм">
          <div className="ops-rank-rules-heading">
            <strong>3 зэрэг ба мөрдөх хувь</strong>
            <small>Үйлчилгээний суурь дүнгээс</small>
          </div>
          <div className="ops-rank-rule-list">
            {rankRules.map((rule) => (
              <div className={rule.label === rankSummary.currentRank ? "is-current" : ""} key={rule.label}>
                <span><strong>{rule.label}</strong><small>{rule.note}</small></span>
                <span><strong>{rule.scoreRange}</strong><small>Онооны босго</small></span>
                <b>{rule.payoutPercent}%</b>
              </div>
            ))}
          </div>
          <ul>
            <li>Шинэ зэрэг болон хувь дараагийн хуанлийн өдрөөс хүчинтэй.</li>
            <li>Баталгаажсан таслалт 0 оноотой нэг өдөр болж тооцогдоно.</li>
            <li>Зөвшөөрсөн чөлөө болон бүрдээгүй өдөр дундажид орохгүй.</li>
          </ul>
        </section>
      ) : null}
      <section className="ops-rank-detail">
        <small className="ops-rank-current-label">Одоогийн зэрэг</small>
        <strong className="ops-rank-current">{rankSummary.currentRank}</strong>
        <div className="ops-rank-summary-metrics" aria-label="Зэргийн хураангуй">
          <span><small>Нийт дундаж оноо</small><strong>{rankSummary.score.toFixed(1)}</strong></span>
          <span><small>Мөрдөх хувь</small><strong>{rankSummary.payoutPercent}%</strong></span>
          <span><small>Тооцогдсон өдөр</small><strong>{rankSummary.countedDays}</strong></span>
        </div>
        <div className="ops-rank-progress" role="progressbar" aria-label={`${rankSummary.nextRank} хүрэх явц`} aria-valuemin={80} aria-valuemax={rankSummary.nextThreshold} aria-valuenow={rankSummary.score}>
          <i style={{ width: `${((rankSummary.score - 80) / 10) * 100}%` }} />
        </div>
        <div className="ops-rank-next">
          <span><small>Дараагийн зэрэг</small><strong>{rankSummary.nextRank} · {rankSummary.nextThreshold} оноо</strong></span>
          <b>{rankSummary.missingScore.toFixed(1)} оноо дутуу</b>
        </div>
        <p className="ops-rank-basis">Нийт дундаж нь баталгаажсан болон тасалсан {rankSummary.countedDays} өдрийн онооны дундаж.</p>
      </section>
      <section className="ops-section" aria-labelledby="rank-calculation-title">
        <div className="ops-section-heading"><h2 id="rank-calculation-title">Оноо хэрхэн бодогдов?</h2><span>{rankSummary.latestDate} · {rankSummary.latestDailyScore.toFixed(1)}</span></div>
        <p className="ops-section-intro">Сүүлийн баталгаажсан өдрийн 8 үзүүлэлтийг жингээр нь үржүүлж нэмсэн дүн.</p>
        <div className="ops-factor-list">
          {rankFactors.slice(0, showAllFactors ? rankFactors.length : 5).map((factor) => (
            <div key={factor.label}>
              <span><strong>{factor.label}</strong><small>{factor.score} × {factor.weight}% жин = {factor.contribution.toFixed(1)} оноо</small></span>
              <span className="ops-factor-line"><i style={{ width: `${factor.score}%` }} /></span>
              <strong>{factor.score}</strong>
            </div>
          ))}
        </div>
        <button className="ops-detail-link" type="button" aria-expanded={showAllFactors} onClick={() => setShowAllFactors((value) => !value)}>{showAllFactors ? "Товч харах" : "Бүх 8 үзүүлэлтийг харах"} <ChevronRight aria-hidden="true" /></button>
      </section>
      <section className="ops-section" aria-labelledby="rank-history-title">
        <div className="ops-section-heading">
          <h2 id="rank-history-title">Өмнөх өдрүүдийн оноо</h2>
          <span>8 сарын 19–23 · 100 онооноос</span>
        </div>
        <p className="ops-section-intro">Баталгаажсан оноо, тасалсан өдөр болон дундажид орохгүй чөлөөг хамтад нь харуулав.</p>
        <div
          className="ops-rank-history-chart"
          role="img"
          aria-label="8 сарын 19-нөөс 23-ны оноо: 89.1, тасалсан өдөр 0, зөвшөөрсөн чөлөө дундажид орохгүй, 82.8, 87.2"
        >
          <ResponsiveContainer width="100%" height={236}>
            <BarChart data={rankHistory} margin={{ top: 28, right: 4, bottom: 4, left: -8 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
              <XAxis dataKey="shortDate" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} />
              <YAxis domain={[0, 100]} ticks={[0, 50, 100]} axisLine={false} tickLine={false} width={34} tick={{ fill: "var(--muted)", fontSize: 10 }} />
              <Tooltip content={<RankHistoryTooltip />} cursor={{ fill: "var(--primary-soft)" }} />
              <Bar dataKey="score" radius={[8, 8, 8, 8]} maxBarSize={44} minPointSize={4} isAnimationActive={false}>
                {rankHistory.map((entry) => (
                  <Cell
                    key={entry.date}
                    fill={entry.tone === "missed" ? "var(--danger)" : entry.tone === "leave" ? "var(--border-strong)" : "var(--primary)"}
                  />
                ))}
                <LabelList dataKey="displayScore" position="top" fill="var(--ink)" fontSize={11} fontWeight={700} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="ops-rank-history-key" aria-label="Диаграммын тайлбар">
            <span><i className="is-confirmed" aria-hidden="true" />Баталгаажсан</span>
            <span><i className="is-missed" aria-hidden="true" />Тасалсан</span>
            <span><i className="is-leave" aria-hidden="true" />Зөвшөөрсөн чөлөө</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function RankHistoryTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: (typeof rankHistory)[number] }> }) {
  if (!active || !payload?.[0]) return null;
  const entry = payload[0].payload;
  return (
    <div className="ops-chart-tooltip">
      <small>{entry.date}</small>
      <strong>{entry.displayScore === "—" ? "Дундажид орохгүй" : `${entry.displayScore} оноо`}</strong>
      <span>{entry.status}</span>
    </div>
  );
}

export function NotificationsScreen({
  requestCountdown,
  onBack,
  onRequests,
  onSchedule,
  onEarnings,
  onRank,
}: {
  requestCountdown: number;
  onBack: () => void;
  onRequests: () => void;
  onSchedule: () => void;
  onEarnings: () => void;
  onRank: () => void;
}) {
  const requestExpired = requestCountdown <= 0;
  return (
    <div className="ops-screen" data-screen="notifications">
      <PageHeader title="Мэдэгдэл" onBack={onBack} />
      <section className="ops-notification-list" aria-label="Мэдэгдлийн жагсаалт">
        <button type="button" className={requestExpired ? "" : "is-urgent"} onClick={onRequests}><Clock3 aria-hidden="true" /><div><strong>{requestExpired ? "VIP 03 хүсэлтийн хугацаа дууссан" : "VIP 03 хүсэлт хүлээгдэж байна"}</strong><p>{requestExpired ? "Хүсэлтийн түүхийг нээж шалгана уу." : `Хариу өгөхөд ${formatCountdown(requestCountdown)} үлдсэн.`}</p><time>{requestExpired ? "1 мин өмнө" : "Одоо"}</time></div><ChevronRight aria-hidden="true" /></button>
        <button type="button" onClick={onSchedule}><CalendarCheck2 aria-hidden="true" /><div><strong>Маргаашийн ээлж баталгаажлаа</strong><p>Nomad · 21:00–04:00</p><time>18 мин өмнө</time></div><ChevronRight aria-hidden="true" /></button>
        <button type="button" onClick={onEarnings}><ShieldCheck aria-hidden="true" /><div><strong>Тооцоо баталгаажсан</strong><p>{`VIP 03 · ₮240,000`}</p><time>1 цагийн өмнө</time></div><ChevronRight aria-hidden="true" /></button>
        <button type="button" onClick={onRank}><Star aria-hidden="true" /><div><strong>Дундаж оноо шинэчлэгдлээ</strong><p>Одоогийн дундаж 84.6 оноо.</p><time>Өчигдөр</time></div><ChevronRight aria-hidden="true" /></button>
      </section>
    </div>
  );
}

function KeyValue({ label, value, tone }: { label: string; value: string; tone?: "success" | "warning" }) {
  return <div className="ops-key-value" role="listitem"><span>{label}</span><strong className={tone ? `is-${tone}` : ""}>{value}</strong></div>;
}
