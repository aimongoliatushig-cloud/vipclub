import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BadgeAlert,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import {
  Area,
  AreaChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { api } from "../../api";
import type {
  EntertainerDashboard,
  FinexEntertainerSummary,
  LeavePolicyData,
} from "../../api";
import "./IncomeSummary.css";

const wholeNumber = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const formatMoney = (value: number) => `₮${wholeNumber.format(Number(value || 0))}`;

const dateParts = (value: string) => value.slice(0, 10).split("-").map(Number);
const monthLabel = (value: string) => {
  const [year, month] = dateParts(`${value}-01`);
  return `${year} оны ${month}-р сар`;
};
const shortDate = (value: string) => {
  const [, month, day] = dateParts(value);
  return `${month}-р сарын ${day}`;
};
const currentMonthKey = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ulaanbaatar",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return `${year}-${month}`;
};
const monthChoices = (monthKey: string, count = 12) => {
  const [year, month] = dateParts(`${monthKey}-01`);
  return Array.from({ length: count }, (_, index) => {
    const value = new Date(Date.UTC(year, month - 1 - index, 1));
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`;
  });
};
const SELECTED_MONTH_KEY = "nomad-staff:income-month";
const preferredMonth = () => {
  const current = currentMonthKey();
  try {
    const stored = sessionStorage.getItem(SELECTED_MONTH_KEY) || "";
    return monthChoices(current).includes(stored) ? stored : current;
  } catch {
    return current;
  }
};
const rememberMonth = (month: string) => {
  try {
    sessionStorage.setItem(SELECTED_MONTH_KEY, month);
  } catch {
    // A blocked storage API should not prevent the income view from loading.
  }
};
const rankLabel = (value?: string) => {
  const rank = String(value || "").match(/Rank\s+([123])/i)?.[1];
  return rank ? `${rank}-р зэрэг` : "Зэрэглэл";
};

const eachDate = (from: string, to: string) => {
  const [fromYear, fromMonth, fromDay] = dateParts(from);
  const [toYear, toMonth, toDay] = dateParts(to);
  const cursor = new Date(Date.UTC(fromYear, fromMonth - 1, fromDay));
  const end = new Date(Date.UTC(toYear, toMonth - 1, toDay));
  const values: string[] = [];
  while (cursor <= end) {
    values.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return values;
};

type Props = {
  branch: string;
  dashboard: EntertainerDashboard;
  onOpenLoan?: () => void;
};

export function EntertainerIncomeSummary({
  branch,
  dashboard,
  onOpenLoan,
}: Props) {
  const [attendancePolicy, setAttendancePolicy] = useState<LeavePolicyData>();
  const [viewedFinex, setViewedFinex] = useState<FinexEntertainerSummary>();
  const [selectedMonth, setSelectedMonth] = useState(preferredMonth);
  const initialMonth = useRef(selectedMonth);
  const [monthLoading, setMonthLoading] = useState(false);
  const [showAllServices, setShowAllServices] = useState(false);
  const [error, setError] = useState("");
  const [policyError, setPolicyError] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (month: string) => {
    setLoading(true);
    setError("");
    setPolicyError(false);
    try {
      const [finexResult, policyResult] = await Promise.allSettled([
        api.finexIncome(month),
        api.leavePolicy(month),
      ]);
      if (finexResult.status === "rejected") throw finexResult.reason;
      setViewedFinex(finexResult.value);
      rememberMonth(month);
      setShowAllServices(false);
      if (policyResult.status === "fulfilled")
        setAttendancePolicy(policyResult.value);
      else {
        setAttendancePolicy(undefined);
        setPolicyError(true);
      }
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "Тооцооны мэдээлэл ачаалсангүй.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(initialMonth.current);
  }, [load]);

  const approvedDeduction = attendancePolicy
    ? attendancePolicy.penalties.reduce(
        (total, penalty) => total + Number(penalty.amount || 0),
        0,
      )
    : selectedMonth === currentMonthKey()
      ? dashboard.work_summary.active_deduction
      : null;
  const visibleAmount =
    approvedDeduction === null
      ? null
      : Number(viewedFinex?.net_income || 0) - approvedDeduction;
  const services = useMemo(() => viewedFinex?.recent_services || [], [viewedFinex]);
  const serviceDays = useMemo(() => {
    const groups = new Map<string, typeof services>();
    for (const row of services) groups.set(row.date, [...(groups.get(row.date) || []), row]);
    return [...groups.entries()]
      .map(([date, rows]) => ({ date, rows, total: rows.reduce((sum, row) => sum + Number(row.amount || 0), 0) }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [services]);
  const visibleServiceDays = showAllServices ? serviceDays : serviceDays.slice(0, 3);
  const selectableMonths = monthChoices(currentMonthKey());

  const chartData = useMemo(() => {
    if (!viewedFinex) return [];
    const dailyIncome = new Map(
      (viewedFinex.days || []).map((row) => [
        row.date,
        Number(row.income || 0),
      ]),
    );
    if (!dailyIncome.size) return [];
    let cumulativeIncome = 0;
    return eachDate(viewedFinex.window.from, viewedFinex.window.to).map(
      (date) => {
        const amount = dailyIncome.get(date) || 0;
        cumulativeIncome += amount;
        return {
          date,
          label: String(dateParts(date)[2]),
          fullLabel: shortDate(date),
          amount,
          cumulative: cumulativeIncome,
        };
      },
    );
  }, [viewedFinex]);
  const lastChartPoint = chartData.at(-1);
  const firstIncomePoint = chartData.find((point) => point.cumulative > 0) || chartData.at(0);
  const chartSummary = viewedFinex && firstIncomePoint && lastChartPoint
    ? `${monthLabel(viewedFinex.selected_month || selectedMonth)}. ${firstIncomePoint.fullLabel}-нд ${formatMoney(firstIncomePoint.cumulative)}, ${lastChartPoint.fullLabel}-нд ${formatMoney(lastChartPoint.cumulative)}-ийн хуримтлагдсан орлого бүртгэгдсэн.`
    : "Энэ сард орлогын хөдөлгөөн бүртгэгдээгүй.";
  const dataStateTone = viewedFinex?.data_state === "demo"
    ? "is-info"
    : viewedFinex?.quality.verified
      ? "is-success"
      : "is-neutral";

  const selectMonth = async (month: string) => {
    setSelectedMonth(month);
    rememberMonth(month);
    setMonthLoading(true);
    setShowAllServices(false);
    setViewedFinex(undefined);
    setAttendancePolicy(undefined);
    setError("");
    try {
      const [finexResult, policyResult] = await Promise.allSettled([
        api.finexIncome(month),
        api.leavePolicy(month),
      ]);
      if (finexResult.status === "rejected") throw finexResult.reason;
      setViewedFinex(finexResult.value);
      if (policyResult.status === "fulfilled") {
        setAttendancePolicy(policyResult.value);
        setPolicyError(false);
      } else {
        setAttendancePolicy(undefined);
        setPolicyError(true);
      }
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "Сарын орлогын мэдээлэл ачаалсангүй.",
      );
    } finally {
      setMonthLoading(false);
    }
  };

  return (
    <div
      className="page entertainer-income-page income-dashboard-v2"
      aria-label={`${branch} салбарын сарын орлого`}
    >
      <header className="income-dashboard-header">
        <h1 className="sr-only">Миний сарын орлого</h1>
        <div className="income-dashboard-actions">
          <label className="income-month-picker">
            <span className="sr-only">Сар сонгох</span>
            <CalendarDays aria-hidden="true" />
            <select
              aria-label="Орлого харах сар"
              value={selectedMonth}
              onChange={(event) => void selectMonth(event.target.value)}
              disabled={monthLoading || loading}
            >
              {selectableMonths.map((month) => (
                <option key={month} value={month}>
                  {monthLabel(month)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="income-refresh"
            onClick={() => void load(selectedMonth)}
            disabled={loading || monthLoading}
            aria-label="Тооцоог шинэчлэх"
          >
            <RefreshCw className={loading ? "spin" : ""} aria-hidden="true" />
          </button>
        </div>
      </header>

      {(loading || monthLoading) && !viewedFinex ? (
        <section
          className="income-loading income-loading-v2"
          aria-busy="true"
          aria-live="polite"
        >
          <span aria-hidden="true"><i /><i /><i /></span>
          <strong>{monthLabel(selectedMonth)}-ийн мэдээлэл ачаалж байна</strong>
          <small>Орлого, суутгалын тооцоог тулгаж байна…</small>
        </section>
      ) : null}

      {error ? (
        <section className="income-error" role="alert">
          <AlertTriangle aria-hidden="true" />
          <div>
            <strong>Мэдээлэл ачаалсангүй</strong>
            <p>{error}</p>
          </div>
          <button type="button" onClick={() => void load(selectedMonth)}>
            <RefreshCw aria-hidden="true" /> Дахин оролдох
          </button>
        </section>
      ) : null}

      {viewedFinex ? (
        <>
          <section
            className="income-analytics-card"
            aria-labelledby="income-chart-title"
            aria-busy={loading}
          >
            <h2 id="income-chart-title" className="sr-only">Сарын орлогын хөдөлгөөн</h2>
            <div className="income-summary-hero">
              <header>
                <div className="income-chart-total">
                  <span className="income-hero-label">Орлого</span>
                  <strong>{formatMoney(viewedFinex.net_income)}</strong>
                  <time>{monthLabel(viewedFinex.selected_month || selectedMonth)}</time>
                  <small>
                    {viewedFinex.payout_policy
                      ? `${rankLabel(viewedFinex.payout_policy.rank)} · ${viewedFinex.payout_policy.percent}% ногдол`
                      : "Үйлчилгээний ногдол"}
                  </small>
                </div>
                <span className={`income-data-state ${dataStateTone}`}>
                  {viewedFinex.data_state === "demo"
                    ? "Туршилтын өгөгдөл"
                    : viewedFinex.quality.verified
                      ? "Баталгаатай"
                      : "Шалгаж байна"}
                </span>
              </header>

              <div
                className="income-chart"
                role="img"
                aria-label={`${monthLabel(viewedFinex.selected_month || selectedMonth)} — хуримтлагдсан орлогын график`}
                aria-describedby="income-chart-summary"
              >
                {chartData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 12, right: 10, bottom: 8, left: 4 }}
                    >
                      <defs>
                        <linearGradient id="income-detail-area" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.28} />
                          <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="label" hide />
                      <YAxis hide />
                      <Tooltip
                        cursor={{ stroke: "rgba(255,255,255,.5)", strokeDasharray: "3 4" }}
                        formatter={(value) => [
                          formatMoney(Number(value)),
                          "Хуримтлагдсан орлого",
                        ]}
                        labelFormatter={(_label, payload) =>
                          payload?.[0]?.payload?.fullLabel || ""
                        }
                        contentStyle={{
                          color: "var(--wb-ink)",
                          backgroundColor: "var(--wb-surface)",
                          border: "1px solid var(--wb-border)",
                          borderRadius: 10,
                          boxShadow: "var(--wb-shadow-raised)",
                          fontSize: 12,
                        }}
                        labelStyle={{ color: "var(--wb-ink)" }}
                        itemStyle={{ color: "var(--wb-ink)" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="cumulative"
                        stroke="var(--income-chart-line)"
                        strokeWidth={2.8}
                        fill="url(#income-detail-area)"
                        fillOpacity={1}
                        dot={false}
                        activeDot={{
                          r: 5,
                          fill: "var(--income-chart-point)",
                          stroke: "var(--income-chart-line)",
                          strokeWidth: 3,
                        }}
                        isAnimationActive={false}
                      />
                      {lastChartPoint ? (
                        <ReferenceDot
                          x={lastChartPoint.label}
                          y={lastChartPoint.cumulative}
                          r={4.5}
                          fill="var(--income-chart-point)"
                          stroke="var(--income-chart-line)"
                          strokeWidth={3}
                        />
                      ) : null}
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="income-chart-empty">
                    <strong>Энэ сард орлого бүртгэгдээгүй</strong>
                    <span>Үйлчилгээ баталгаажмагц хөдөлгөөн энд харагдана.</span>
                  </div>
                )}
              </div>
              <p id="income-chart-summary" className="sr-only">{chartSummary}</p>

              <footer className="income-hero-footer">
                <span>{shortDate(viewedFinex.window.from)} – {shortDate(viewedFinex.window.to)}</span>
                <strong>Эцсийн цалин биш</strong>
              </footer>
            </div>

            <div
              className="income-ledger-metrics"
              aria-label="Сарын тооцооны задаргаа"
            >
              <article>
                <small>Үйлчилгээний ногдол</small>
                <strong>{formatMoney(viewedFinex.net_income)}</strong>
              </article>
              <article className={approvedDeduction ? "deduction" : ""}>
                <small>Суутгал</small>
                <strong>
                  {approvedDeduction === null
                    ? "—"
                    : approvedDeduction
                      ? `− ${formatMoney(approvedDeduction)}`
                      : formatMoney(0)}
                </strong>
              </article>
              <article className="total">
                <small>Тооцоолсон цалин</small>
                <strong>{visibleAmount === null ? "—" : formatMoney(visibleAmount)}</strong>
              </article>
              <div className="income-calculation-note" role="note">
                <ShieldCheck aria-hidden="true" />
                <p>
                  Эцсийн цалин биш. Үйлчилгээний ногдлоос одоогоор бүртгэгдсэн
                  суутгалыг хассан дүн.
                </p>
              </div>
            </div>
          </section>

          {policyError ? (
            <section className="income-policy-warning" role="status">
              <AlertTriangle aria-hidden="true" />
              <span>
                <strong>Суутгалын мэдээлэл ачаалсангүй</strong>
                <small>
                  Орлогын дүн ачаалсан. Суутгалыг шинэчилж, урьдчилсан тооцоог
                  дахин шалгана уу.
                </small>
              </span>
              <button type="button" onClick={() => void load(selectedMonth)}>
                Дахин шалгах
              </button>
            </section>
          ) : null}

          {onOpenLoan ? (
            <button type="button" className="income-loan-entry" onClick={onOpenLoan}>
              <span className="income-row-icon"><WalletCards aria-hidden="true" /></span>
              <span><strong>Зээл</strong><small>Нөхцөл, хүсэлтээ харах</small></span>
              <ChevronRight aria-hidden="true" />
            </button>
          ) : null}

          <section
            className="income-service-breakdown"
            aria-labelledby="income-services-title"
          >
            <header>
              <h2 id="income-services-title">Үйлчилгээний задаргаа</h2>
              {serviceDays.length > 3 ? (
                <button
                  type="button"
                  onClick={() => setShowAllServices((value) => !value)}
                  aria-expanded={showAllServices}
                >
                  {showAllServices ? "Хураах" : "Бүгдийг харах"} <ChevronRight aria-hidden="true" />
                </button>
              ) : null}
            </header>
            <div className="income-service-days">
              {visibleServiceDays.length ? (
                visibleServiceDays.map((day) => (
                  <details key={day.date} className="income-service-day">
                    <summary>
                      <span><strong>{shortDate(day.date)}</strong><small>{day.rows.length} үйлчилгээ</small></span>
                      <b>{formatMoney(day.total)}</b>
                      <ChevronDown aria-hidden="true" />
                    </summary>
                    <div className="income-service-list">
                      {day.rows.map((row) => (
                        <article key={row.key}>
                          <span>
                            <strong>{row.service}</strong>
                            <small>
                              {row.rate_source === "rank_policy" ? `${rankLabel(row.payout_rank)} · ` : ""}
                              {row.percent}% ногдол
                              {row.percent_change ? (
                                <em className={row.percent_change > 0 ? "is-up" : "is-down"}>
                                  {row.percent_change > 0 ? "+" : ""}{row.percent_change} нэгж
                                </em>
                              ) : null}
                            </small>
                          </span>
                          <small>{row.service_total ? `${formatMoney(row.service_total)} × ${row.percent}%` : "Төлөгдсөн үйлчилгээ"}</small>
                          <b>{formatMoney(row.amount)}</b>
                        </article>
                      ))}
                    </div>
                  </details>
                ))
              ) : (
                <div className="income-empty-row">Энэ сард үйлчилгээний бүртгэл алга.</div>
              )}
            </div>
            <footer>
              <span>{viewedFinex.service_count} үйлчилгээ · {viewedFinex.bill_count} төлөгдсөн баримт</span>
              <strong>{formatMoney(viewedFinex.net_income)}</strong>
            </footer>
          </section>

          <details className="income-method income-deduction-rules">
            <summary>
              <BadgeAlert aria-hidden="true" />
              <span>
                <strong>Суутгалын мэдээлэл</strong>
                <small>
                  {approvedDeduction === null
                    ? "Задаргаа ачаалсангүй"
                    : approvedDeduction
                      ? `${formatMoney(approvedDeduction)} тооцоонд орсон`
                      : "Суутгал алга"}
                </small>
              </span>
              <ChevronDown className="income-disclosure-icon" aria-hidden="true" />
            </summary>
            <div>
              {attendancePolicy?.penalties.length ? (
                <div className="income-deduction-list" aria-label="Тооцоонд орсон суутгалын задаргаа">
                  {attendancePolicy.penalties.map((row) => (
                    <p key={row.name}>
                      <span>
                        <strong>
                          {row.penalty_type === "Late"
                            ? `${row.late_minutes} минут хоцролт`
                            : row.penalty_type === "Stage Round"
                              ? `${row.missed_rounds || 0} гараа дутуу`
                              : "Өдрийн таслалт"}
                        </strong>
                        <small>{shortDate(row.attendance_date)} · {row.reason || "Тайлбаргүй"}</small>
                      </span>
                      <b>− {formatMoney(row.amount)}</b>
                    </p>
                  ))}
                </div>
              ) : (
                <p className="income-no-deduction">Энэ сард тооцоонд орсон суутгал алга.</p>
              )}
            </div>
          </details>
        </>
      ) : null}
    </div>
  );
}
