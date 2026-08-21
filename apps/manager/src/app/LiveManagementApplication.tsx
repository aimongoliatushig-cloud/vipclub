import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  BedDouble,
  Bell,
  Building2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  ClipboardCheck,
  ContactRound,
  Database,
  DoorOpen,
  FileBarChart,
  Gem,
  HeartHandshake,
  LayoutDashboard,
  ListChecks,
  LoaderCircle,
  LogOut,
  Menu,
  MessageSquare,
  Minus,
  Plus,
  RefreshCw,
  ReceiptText,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
  UserRound,
  UserMinus,
  UserPlus,
  WalletCards,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { ManagementSession } from "../shared/managementAccess";
import { ThemeToggle } from "../components/ThemeToggle";
import {
  ManagerProfilePage,
  ManagerProfilePanels,
  type ManagerProfilePanel,
} from "./ManagerProfileTools";
import {
  FrappeManagementApi,
  type BranchSalesGoalRecord,
  type BranchSalesProgress,
  type BranchAttendancePolicy,
  type CompanyDashboard,
  type CustomerBill,
  type CustomerBranchBanNotice,
  type CustomerEntry,
  type CustomerEntryFeed,
  type CustomerEntrySummary,
  type CustomerReservation,
  type CustomerReservationSummary,
  type LeaveRequest,
  type AttendanceCorrectionRequest,
  type EntertainerDetail,
  type EmployeeLifecycleOptions,
  type HireEmployeeInput,
  type ManagerCustomerRow,
  type ManagerDashboard,
  type ManagerSchedule,
  type ManagerTeam,
  type ManagerTeamMember,
  type PenaltyRow,
  type RankReview,
  type ReadinessQueueData,
  type ReadinessQueueRow,
  type SalesPeriodDetail,
  type SalesPeriodKey,
  type DailyRoundsData,
  type DemoRankReport,
  type DailyRankComponentName,
  type TeamClimateCategory,
  type TeamClimateFeedbackRow,
  type UnassignedEmployee,
} from "../services/managementApi";
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatTime,
} from "../features/workforce/localization";
import { idempotencyKey } from "../services/frappeClient";
import { connectManagerRealtime } from "../services/managerRealtime";
import "../styles.css";

type ManagerView =
  | "overview"
  | "entries"
  | "schedule"
  | "team"
  | "readiness"
  | "rounds"
  | "leave"
  | "penalties"
  | "crm"
  | "rankings"
  | "goals"
  | "climate"
  | "profile";
type CeoView =
  | "overview"
  | "branches"
  | "goals"
  | "approvals"
  | "crm"
  | "workforce"
  | "penalties"
  | "finance"
  | "tasks"
  | "messages"
  | "hermes"
  | "reports"
  | "climate"
  | "demo-report";
type HrView = "workforce";
type LiveView = ManagerView | CeoView | HrView;
type GuestDetailTarget = {
  kind: "entry" | "reservation";
  name: string;
  acknowledge?: boolean;
};

interface NavigationItem {
  id: LiveView;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

const managerNavigation: NavigationItem[] = [
  { id: "overview", label: "Менежерийн тойм", icon: LayoutDashboard },
  { id: "entries", label: "Зочид", icon: DoorOpen },
  { id: "schedule", label: "Хуваарь", icon: CalendarDays },
  { id: "team", label: "Миний баг", icon: Users },
  { id: "readiness", label: "Бэлэн байдлын шалгалт", icon: ListChecks },
  { id: "rounds", label: "Өдрийн гараа", icon: ReceiptText },
  { id: "leave", label: "Чөлөөний хүсэлт", icon: ClipboardCheck },
  { id: "penalties", label: "Ирцийн хяналт", icon: ShieldAlert },
  { id: "rankings", label: "Бүжигчдийн зэрэглэл", icon: Gem },
  { id: "climate", label: "Охидын уур амьсгал", icon: HeartHandshake },
  { id: "goals", label: "Борлуулалтын зорилго", icon: Target },
  { id: "profile", label: "Миний мэдээлэл", icon: UserRound },
];

const ceoNavigation: NavigationItem[] = [
  { id: "overview", label: "Удирдлагын төв", icon: LayoutDashboard },
  { id: "branches", label: "Салбарууд", icon: Building2 },
  { id: "goals", label: "Борлуулалт ба зорилт", icon: Target },
  { id: "approvals", label: "Шийдвэрүүд", icon: BadgeCheck },
  { id: "crm", label: "Харилцагч ба CRM", icon: ContactRound },
  { id: "workforce", label: "Ажиллах хүч", icon: Users },
  { id: "climate", label: "Охидын уур амьсгал", icon: HeartHandshake },
  { id: "penalties", label: "Ирц ба торгууль", icon: ShieldAlert },
  { id: "finance", label: "Санхүү ба тооцоо", icon: WalletCards },
  { id: "tasks", label: "Даалгавар", icon: ListChecks },
  { id: "messages", label: "Мессеж", icon: MessageSquare },
  { id: "hermes", label: "AI туслах", icon: Sparkles },
  { id: "reports", label: "Тайлан, шинжилгээ", icon: FileBarChart },
  { id: "demo-report", label: "Туршилтын тайлан", icon: Database },
];

const hrNavigation: NavigationItem[] = [
  { id: "workforce", label: "Хүний нөөц", icon: Users },
];

const managerViews: readonly LiveView[] = [
  ...managerNavigation.map((item) => item.id),
  "crm",
];
const ceoViews: readonly LiveView[] = ceoNavigation.map((item) => item.id);
const hrViews: readonly LiveView[] = hrNavigation.map((item) => item.id);

function defaultViewForSession(session: ManagementSession): LiveView {
  return session.role === "hr-manager" ? "workforce" : "overview";
}

function allowedViewsForSession(session: ManagementSession): readonly LiveView[] {
  if (session.role === "ceo") return ceoViews;
  if (session.role === "hr-manager") return hrViews;
  return managerViews;
}

function viewFromLocation(session: ManagementSession): LiveView {
  const candidate = new URLSearchParams(window.location.search).get("view");
  const allowed = allowedViewsForSession(session);
  return candidate && allowed.includes(candidate as LiveView)
    ? (candidate as LiveView)
    : defaultViewForSession(session);
}

function locationForView(view: LiveView): string {
  const url = new URL(window.location.href);
  url.searchParams.set("view", view);
  url.hash = "";
  return `${url.pathname}${url.search}`;
}

const statusLabels: Record<string, string> = {
  checked_in: "Ажилдаа ирсэн",
  late: "Хоцорсон",
  absent: "Ирээгүй",
  scheduled: "Хуваарьтай",
  leave: "Чөлөөтэй",
  off: "Ээлжгүй",
  Pending: "Хүлээгдэж байна",
  Approved: "Зөвшөөрсөн",
  Rejected: "Татгалзсан",
  Cancelled: "Цуцалсан",
  "Pending Review": "Хяналт хүлээж байна",
  Reversed: "Буцаасан",
  Active: "Батлагдсан",
  Submitted: "Захирлын шийдвэр хүлээж байна",
  Draft: "Ноорог",
  "Revision Requested": "Засвар хүссэн",
  Late: "Хоцролт",
  Absence: "Таслалт",
  "Stage Round": "Гарааны торгууль",
  "Black Diamond": "Хар алмаз",
  Diamond: "Алмаз",
  Gold: "Алт",
  Silver: "Мөнгө",
  Bronze: "Хүрэл",
  Unassigned: "Түвшингүй",
  "Rank 1": "1-р зэрэг",
  "Rank 2": "2-р зэрэг",
  "Rank 3": "3-р зэрэг",
};

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(value = new Date()): string {
  const date = new Date(value);
  date.setHours(12, 0, 0, 0);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return dateKey(date);
}

function addDays(value: string, days: number): string {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

function elapsedDays(from?: string | null, to?: string | null): number | null {
  if (!from || !to) return null;
  const fromDate = new Date(`${from.slice(0, 10)}T12:00:00`);
  const toDate = new Date(`${to.slice(0, 10)}T12:00:00`);
  const difference = toDate.getTime() - fromDate.getTime();
  return Number.isFinite(difference)
    ? Math.max(0, Math.floor(difference / 86_400_000))
    : null;
}

function daysInMonth(value: string): number {
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

function monthLabel(value: string): string {
  const [year, month] = value.split("-").map(Number);
  const months = [
    "1-р сар",
    "2-р сар",
    "3-р сар",
    "4-р сар",
    "5-р сар",
    "6-р сар",
    "7-р сар",
    "8-р сар",
    "9-р сар",
    "10-р сар",
    "11-р сар",
    "12-р сар",
  ];
  return `${year} оны ${months[month - 1] ?? `${month}-р сар`}`;
}

function stateLabel(value?: string | null): string {
  if (!value) return "Тодорхойгүй";
  return statusLabels[value] ?? value;
}

function salesProgressState(
  value: number,
  hasTarget = true,
): { tone: "complete" | "steady" | "attention" | "pending"; label: string } {
  if (!hasTarget) return { tone: "pending", label: "Зорилго хүлээгдэж байна" };
  if (value >= 100) return { tone: "complete", label: "Зорилго биелсэн" };
  if (value >= 75) return { tone: "steady", label: "Зорилгод ойртож байна" };
  return { tone: "attention", label: "Идэвхжүүлэх шаардлагатай" };
}

function LoadingState({
  label = "Мэдээлэл ачаалж байна…",
}: {
  label?: string;
}) {
  return (
    <div className="live-loading" role="status">
      <div className="live-loading-copy">
        <LoaderCircle size={24} />
        <span>{label}</span>
      </div>
      <div className="live-skeleton-grid" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}

function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="live-error" role="alert">
      <AlertTriangle size={22} />
      <div>
        <strong>Мэдээлэл ачаалж чадсангүй</strong>
        <span>{message}</span>
      </div>
      {retry ? (
        <button type="button" onClick={retry}>
          <RefreshCw size={16} />
          Дахин оролдох
        </button>
      ) : null}
    </div>
  );
}

function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="live-page-heading">
      <div>
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}

function Metric({
  label,
  value,
  hint,
  icon: Icon,
  tone = "blue",
}: {
  label: string;
  value: ReactNode;
  hint: string;
  icon: LucideIcon;
  tone?: string;
}) {
  return (
    <article className="live-metric" data-tone={tone}>
      <i>
        <Icon size={20} />
      </i>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
  );
}

function Progress({ value, label }: { value: number; label: string }) {
  const safe = Math.max(0, Math.min(value, 100));
  return (
    <div
      className="live-progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
    >
      <span style={{ width: `${safe}%` }} />
    </div>
  );
}

function ScopeBadge({ session }: { session: ManagementSession }) {
  const companyWide = session.role === "ceo" || session.role === "hr-manager";
  return (
    <span className="live-scope">
      <BadgeCheck size={14} />
      {companyWide ? "Компанийн бүх салбар" : session.branchIds[0]}
    </span>
  );
}

interface ManagerData {
  sales: BranchSalesProgress;
  dashboard: ManagerDashboard;
  readiness: ReadinessQueueData;
  rounds: DailyRoundsData;
  team: ManagerTeam;
  leaves: LeaveRequest[];
  penalties: PenaltyRow[];
  corrections: AttendanceCorrectionRequest[];
  customers: ManagerCustomerRow[];
  customerTotal: number;
  entryFeed: CustomerEntryFeed;
}

type ManagerSectionKey =
  | "sales"
  | "dashboard"
  | "readiness"
  | "rounds"
  | "team"
  | "leaves"
  | "penalties"
  | "corrections"
  | "customers"
  | "entryFeed";

interface ManagerSectionIssue {
  key: ManagerSectionKey;
  label: string;
  showingPrevious: boolean;
}

const managerSectionLabels: Record<ManagerSectionKey, string> = {
  sales: "борлуулалт",
  dashboard: "өнөөдрийн баг",
  readiness: "бэлэн байдлын шалгалт",
  rounds: "өдрийн гараа",
  team: "багийн бүртгэл",
  leaves: "чөлөөний хүсэлт",
  penalties: "ирцийн шийдвэр",
  corrections: "цагийн засвар",
  customers: "харилцагч",
  entryFeed: "зочдын бүртгэл",
};

function settledValue<T>(
  result: PromiseSettledResult<T>,
  fallback: T,
): T {
  return result.status === "fulfilled" ? result.value : fallback;
}

const salesPeriodLabels: Record<SalesPeriodKey, string> = {
  yesterday: "Өчигдөр",
  week: "Энэ 7 хоног",
  month: "Энэ сар",
};

function emptySalesPeriod(date: string): SalesPeriodDetail {
  return {
    start_date: date,
    end_date: date,
    net_sales: 0,
    gross_sales: 0,
    bill_count: 0,
    refund_count: 0,
    refund_amount: 0,
    average_bill: 0,
    previous_net_sales: null,
    change_percent: null,
    daily_sales: [],
    categories: [],
    category_detail_coverage: null,
    top_items: [],
    people: [],
    recent_bills: [],
    bill_total: 0,
    item_detail_coverage: null,
  };
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat("mn-MN", { maximumFractionDigits: 2 }).format(
    value,
  );
}

function formatPointBalance(value?: number): string {
  return `${new Intl.NumberFormat("mn-MN", { maximumFractionDigits: 0 }).format(Number(value ?? 0))} point`;
}

function SalesTrendChart({ detail }: { detail: SalesPeriodDetail }) {
  const points = detail.daily_sales ?? [];
  if (!points.length)
    return (
      <p className="live-sales-empty">
        Өдрийн хөдөлгөөний мэдээлэл хараахан алга.
      </p>
    );
  const width = 760;
  const height = 220;
  const insetX = 28;
  const insetY = 24;
  const values = points.map((point) => point.net_sales);
  const top = Math.max(...values, 1);
  const bottom = Math.min(...values, 0);
  const range = Math.max(top - bottom, 1);
  const x = (index: number) =>
    points.length === 1
      ? width / 2
      : insetX + (index / (points.length - 1)) * (width - insetX * 2);
  const y = (value: number) =>
    insetY + ((top - value) / range) * (height - insetY * 2);
  const line = points
    .map(
      (point, index) =>
        `${index ? "L" : "M"}${x(index).toFixed(1)},${y(point.net_sales).toFixed(1)}`,
    )
    .join(" ");
  const baseline = y(0);
  const area = `${line} L${x(points.length - 1).toFixed(1)},${baseline.toFixed(1)} L${x(0).toFixed(1)},${baseline.toFixed(1)} Z`;
  return (
    <div className="live-sales-chart-wrap">
      <svg
        className="live-sales-chart"
        role="img"
        aria-label="Өдөр тутмын цэвэр борлуулалтын график"
        viewBox={`0 0 ${width} ${height}`}
      >
        {[0, 0.5, 1].map((ratio) => {
          const gridY = insetY + ratio * (height - insetY * 2);
          return (
            <line
              key={ratio}
              x1={insetX}
              x2={width - insetX}
              y1={gridY}
              y2={gridY}
              className="grid"
            />
          );
        })}
        <path d={area} className="area" />
        <path d={line} className="line" />
        {points.map((point, index) => (
          <circle
            key={point.date}
            cx={x(index)}
            cy={y(point.net_sales)}
            r="4"
            className="point"
          >
            <title>
              {formatDate(point.date)} · {formatMoney(point.net_sales)} ·{" "}
              {point.bill_count} bill
            </title>
          </circle>
        ))}
      </svg>
      <div className="live-sales-chart-axis">
        <span>
          {formatDate(points[0].date, { month: "short", day: "numeric" })}
        </span>
        <span>
          {formatDate(points[points.length - 1].date, {
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>
    </div>
  );
}

function ManagerSalesWorkbench({ sales }: { sales: BranchSalesProgress }) {
  const [selectedPeriod, setSelectedPeriod] =
    useState<SalesPeriodKey>("yesterday");
  const [itemQuery, setItemQuery] = useState("");
  const [billQuery, setBillQuery] = useState("");
  const [billDate, setBillDate] = useState("");
  const fallbackDate = `${sales.month}-01`;
  const fallbackMonth: SalesPeriodDetail = {
    ...emptySalesPeriod(fallbackDate),
    net_sales: sales.actual_sales,
    gross_sales: sales.actual_sales,
  };
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const periods: Record<SalesPeriodKey, SalesPeriodDetail> = {
    yesterday:
      sales.periods?.yesterday ?? emptySalesPeriod(dateKey(yesterday)),
    week: sales.periods?.week ?? emptySalesPeriod(dateKey(new Date())),
    month: sales.periods?.month ?? fallbackMonth,
  };
  const detail = periods[selectedPeriod];
  const topAmount = Math.max(
    ...detail.top_items.map((item) => Math.abs(item.net_sales)),
    1,
  );
  const topPersonAmount = Math.max(
    ...(detail.people ?? []).map((person) => Math.abs(person.sales_amount)),
    1,
  );
  const topCategoryAmount = Math.max(
    ...(detail.categories ?? []).map((item) => Math.abs(item.net_sales)),
    1,
  );
  const normalizedItemQuery = itemQuery.trim().toLocaleLowerCase("mn-MN");
  const normalizedBillQuery = billQuery.trim().toLocaleLowerCase("mn-MN");
  const visibleItems = normalizedItemQuery
    ? detail.top_items.filter((item) =>
        item.name.toLocaleLowerCase("mn-MN").includes(normalizedItemQuery),
      )
    : detail.top_items;
  const dateFilteredBills = billDate
    ? detail.recent_bills.filter((bill) => bill.posting_date === billDate)
    : detail.recent_bills;
  const visibleBills = normalizedBillQuery
    ? dateFilteredBills.filter((bill) =>
        [
          bill.bill_code,
          bill.name,
          bill.store_name,
          ...bill.items.flatMap((item) => [
            item.name,
            ...(item.dancers ?? []).map((person) => person.name),
          ]),
        ].some((value) =>
          String(value ?? "")
            .toLocaleLowerCase("mn-MN")
            .includes(normalizedBillQuery),
        ),
      )
    : dateFilteredBills;
  const latestBillLabel = sales.latest_paid_bill_date
    ? `Сүүлийн төлөгдсөн баримт: ${formatDate(sales.latest_paid_bill_date)}`
    : "Төлөгдсөн баримт олдсонгүй";

  return (
    <section
      className="live-sales-workbench"
      aria-labelledby="manager-sales-title"
    >
      <header>
        <div>
          <span>ТӨЛӨГДСӨН БАРИМТ</span>
          <h2 id="manager-sales-title">Борлуулалтын дэлгэрэнгүй</h2>
          <p>
            Өчигдөр, энэ 7 хоног болон сарын дүнг цэвэр
            борлуулалтаар харуулна.
          </p>
        </div>
        <small>
          <Database size={15} />
          {latestBillLabel}
        </small>
      </header>
      <div
        className="live-sales-periods"
        role="tablist"
        aria-label="Борлуулалтын хугацаа"
      >
        {(Object.keys(salesPeriodLabels) as SalesPeriodKey[]).map((period) => {
          const row = periods[period];
          return (
            <button
              key={period}
              type="button"
              role="tab"
              aria-selected={selectedPeriod === period}
              className={selectedPeriod === period ? "active" : ""}
              onClick={() => {
                setSelectedPeriod(period);
                setItemQuery("");
                setBillQuery("");
                setBillDate("");
              }}
            >
              <span>{salesPeriodLabels[period]}</span>
              <strong>{formatMoney(row.net_sales)}</strong>
              <small>
                {row.bill_count} баримт · дундаж {formatMoney(row.average_bill)}
              </small>
            </button>
          );
        })}
      </div>
      <div className="live-sales-period-meta">
        <span>
          <CalendarDays size={15} />
          {formatDate(detail.start_date)} – {formatDate(detail.end_date)}
        </span>
        <span>
          {detail.refund_count
            ? `${detail.refund_count} буцаалт цэвэр дүнгээс хасагдсан`
            : "Буцаалт бүртгэгдээгүй"}
        </span>
        <span>
          {detail.item_detail_coverage == null
            ? "Барааны мөр алга"
            : `Барааны задаргаа ${Math.round(detail.item_detail_coverage)}%`}
        </span>
      </div>
      <div
        className="live-sales-kpis"
        aria-label="Сонгосон хугацааны борлуулалтын үзүүлэлт"
      >
        <article className="is-primary">
          <span>Цэвэр борлуулалт</span>
          <strong>{formatMoney(detail.net_sales)}</strong>
          <small>
            {detail.change_percent == null
              ? "Өмнөх үетэй харьцуулах дата алга"
              : `Өмнөх үеэс ${detail.change_percent > 0 ? "+" : ""}${formatQuantity(detail.change_percent)}%`}
          </small>
        </article>
        <article>
          <span>Нийт борлуулалт</span>
          <strong>{formatMoney(detail.gross_sales)}</strong>
          <small>Буцаалт хасаагүй дүн</small>
        </article>
        <article>
          <span>Төлөгдсөн bill</span>
          <strong>{detail.bill_count}</strong>
          <small>Төлбөр нь баталгаажсан</small>
        </article>
        <article>
          <span>Дундаж bill</span>
          <strong>{formatMoney(detail.average_bill)}</strong>
          <small>Нийт ÷ төлөгдсөн bill</small>
        </article>
        <article>
          <span>Буцаалт</span>
          <strong>{detail.refund_count}</strong>
          <small>
            {detail.refund_count
              ? formatMoney(detail.refund_amount ?? 0)
              : "Буцаалт бүртгэгдээгүй"}
          </small>
        </article>
      </div>
      <section className="live-sales-trend" aria-labelledby="sales-trend-title">
        <header>
          <div>
            <span>Өдрийн хөдөлгөөн</span>
            <h3 id="sales-trend-title">Цэвэр борлуулалтын тренд</h3>
          </div>
          <b>{detail.daily_sales?.length ?? 0} өдөр</b>
        </header>
        <SalesTrendChart detail={detail} />
        <div
          className="live-sales-daily-ledger"
          aria-label="Өдөр тус бүрийн борлуулалт"
        >
          <header>
            <span>Огноо</span>
            <span>Цэвэр борлуулалт</span>
            <span>Bill</span>
            <span>Дундаж</span>
            <span />
          </header>
          {detail.daily_sales?.map((day) => (
            <button
              key={day.date}
              type="button"
              aria-pressed={billDate === day.date}
              onClick={() => {
                setBillDate(day.date);
                window.setTimeout(
                  () =>
                    document
                      .getElementById("sales-bills-title")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" }),
                  0,
                );
              }}
            >
              <span>
                <strong>
                  {formatDate(day.date, { month: "short", day: "numeric" })}
                </strong>
                <small>{formatDate(day.date, { weekday: "short" })}</small>
              </span>
              <b>{formatMoney(day.net_sales)}</b>
              <span>
                {day.bill_count}
                {day.refund_count ? (
                  <small>{day.refund_count} буцаалт</small>
                ) : null}
              </span>
              <span>
                {day.bill_count
                  ? formatMoney(day.gross_sales / day.bill_count)
                  : "—"}
              </span>
              <em>Bill харах</em>
            </button>
          ))}
        </div>
      </section>
      {(detail.categories?.length ?? 0) > 0 ? (
        <section
          className="live-sales-categories"
          aria-labelledby="sales-category-title"
        >
          <header>
            <div>
              <span>Ангиллын бүтэц</span>
              <h3 id="sales-category-title">Борлуулалтын ангилал</h3>
            </div>
            <b>{detail.categories?.length}</b>
          </header>
          <div>
            {detail.categories?.map((category) => (
              <article key={category.name}>
                <span>
                  <strong>{category.name}</strong>
                  <small>
                    {formatQuantity(category.quantity)} нэгж ·{" "}
                    {category.bill_count} bill
                  </small>
                </span>
                <b>{formatMoney(category.net_sales)}</b>
                <i>
                  <span
                    style={{
                      width: `${Math.max(2, (Math.abs(category.net_sales) / topCategoryAmount) * 100)}%`,
                    }}
                  />
                </i>
              </article>
            ))}
          </div>
          <small>
            Ангилал тодорхой болсон баримт:{" "}
            {Math.round(detail.category_detail_coverage ?? 0)}%
          </small>
        </section>
      ) : null}
      <div className="live-sales-detail-grid">
        <section
          className="live-sales-people"
          aria-labelledby="sales-people-title"
        >
          <header>
            <div>
              <span>Хүний гүйцэтгэл</span>
              <h3 id="sales-people-title">Борлуулалт тэргүүлэгчид</h3>
            </div>
            <b>{detail.people?.length ?? 0}</b>
          </header>
          <div>
            {detail.people?.map((person, index) => (
              <article key={person.name}>
                <i>{index + 1}</i>
                <span>
                  <strong>{person.name}</strong>
                  <small>
                    {person.service_count} үйлчилгээ · {person.bill_count} bill
                  </small>
                </span>
                <b>{formatMoney(person.sales_amount)}</b>
                <em>
                  <span
                    style={{
                      width: `${Math.max(2, (Math.abs(person.sales_amount) / topPersonAmount) * 100)}%`,
                    }}
                  />
                </em>
                <small>
                  Ажилтанд ногдсон: {formatMoney(person.employee_amount)}
                </small>
              </article>
            ))}
            {!detail.people?.length ? (
              <p className="live-sales-empty">
                Төлбөрийн баримтад ажилтан холбогдсон үйлчилгээ алга.
              </p>
            ) : null}
          </div>
        </section>
        <section
          className="live-sales-item-mix"
          aria-labelledby="sales-items-title"
        >
          <header>
            <div>
              <span>Бараа, үйлчилгээ</span>
              <h3 id="sales-items-title">Бүх барааны борлуулалт</h3>
            </div>
            <b>{detail.top_items.length}</b>
          </header>
          <label className="live-sales-search">
            <Search size={15} />
            <span className="sr-only">Бараа, үйлчилгээ хайх</span>
            <input
              value={itemQuery}
              onChange={(event) => setItemQuery(event.target.value)}
              placeholder="Барааны нэрээр хайх"
            />
          </label>
          <div>
            {visibleItems.map((item) => (
              <article key={item.name}>
                <span>
                  <strong>{item.name}</strong>
                  <small>
                    {formatQuantity(item.quantity)} нэгж · {item.bill_count}{" "}
                    баримт
                  </small>
                </span>
                <b>{formatMoney(item.net_sales)}</b>
                <i aria-hidden="true">
                  <span
                    style={{
                      width: `${Math.max(2, (Math.abs(item.net_sales) / topAmount) * 100)}%`,
                    }}
                  />
                </i>
              </article>
            ))}
            {!visibleItems.length ? (
              <p className="live-sales-empty">
                Тохирох бараа, үйлчилгээ олдсонгүй.
              </p>
            ) : null}
          </div>
        </section>
      </div>
      <section className="live-sales-bills" aria-labelledby="sales-bills-title">
        <header>
          <div>
            <span>Баримтын бүртгэл</span>
            <h3 id="sales-bills-title">
              {billDate
                ? `${formatDate(billDate)}-ны бүх bill`
                : "Сонгосон хугацааны бүх bill"}
            </h3>
          </div>
          <b>
            {billDate
              ? dateFilteredBills.length
              : (detail.bill_total ?? detail.recent_bills.length)}
          </b>
        </header>
        {billDate ? (
          <button
            className="live-sales-date-filter"
            type="button"
            onClick={() => setBillDate("")}
          >
            <CalendarDays size={14} />
            {formatDate(billDate)}
            <X size={14} />
          </button>
        ) : null}
        <label className="live-sales-search">
          <Search size={15} />
          <span className="sr-only">Bill хайх</span>
          <input
            value={billQuery}
            onChange={(event) => setBillQuery(event.target.value)}
            placeholder="Bill №, бараа эсвэл ажилтнаар хайх"
          />
        </label>
        <div>
          {visibleBills.map((bill) => (
            <details key={bill.name}>
              <summary>
                <span>
                  <strong>Bill №{bill.bill_code || bill.name}</strong>
                  <small>
                    {formatDate(bill.posting_date)}
                    {bill.open_date
                      ? ` · ${formatTime(bill.open_date)}`
                      : ""} · {bill.items.length} мөр
                    {bill.bill_type === 2 ? " · Буцаалт" : ""}
                  </small>
                </span>
                <b>{formatMoney(bill.total_amount)}</b>
                <ChevronDown size={16} />
              </summary>
              <div>
                {bill.items.map((item, index) => (
                  <article key={`${bill.name}-${index}`}>
                    <span>
                      <strong>{item.name}</strong>
                      <small>
                        {formatQuantity(item.quantity)} нэгж
                        {item.dancers?.length
                          ? ` · ${item.dancers.map((person) => person.name).join(", ")}`
                          : ""}
                      </small>
                    </span>
                    <b>{formatMoney(item.total)}</b>
                  </article>
                ))}
              </div>
            </details>
          ))}
          {!visibleBills.length ? (
            <p className="live-sales-empty">
              Тохирох төлөгдсөн bill олдсонгүй.
            </p>
          ) : null}
        </div>
      </section>
      <footer>
        <ReceiptText size={15} />
        <span>
          {sales.metric_definition ??
            "Төлөгдсөн POS баримтын баталгаатай нийлбэр."}
        </span>
      </footer>
    </section>
  );
}

function ManagerOverview({
  data,
  onNavigate,
  refreshedAt,
  sectionIssues,
}: {
  data: ManagerData;
  onNavigate: (view: ManagerView) => void;
  refreshedAt: string | null;
  sectionIssues: ManagerSectionIssue[];
}) {
  const goal = data.sales.active_goal;
  const target = goal?.approved_target ?? 0;
  const percent = data.sales.achievement_percent ?? 0;
  const progressState = salesProgressState(percent, Boolean(goal));
  const readinessRows = data.dashboard.roster.slice(0, 6);
  const salesMissing = sectionIssues.some(
    (issue) => issue.key === "sales" && !issue.showingPrevious,
  );
  const entryFeedMissing = sectionIssues.some(
    (issue) => issue.key === "entryFeed" && !issue.showingPrevious,
  );
  const dashboardMissing = sectionIssues.some(
    (issue) => issue.key === "dashboard" && !issue.showingPrevious,
  );
  const operationalSummary = [
    {
      label: "Өнөөдрийн зочин",
      value: entryFeedMissing ? "—" : data.entryFeed.today_total,
      hint: entryFeedMissing
        ? "Мэдээлэл түр байхгүй"
        : `${data.entryFeed.today_new} шинэ`,
      tone: "neutral",
    },
    {
      label: "Ээлжтэй бүжигчин",
      value: dashboardMissing ? "—" : data.dashboard.summary.scheduled,
      hint: dashboardMissing
        ? "Мэдээлэл түр байхгүй"
        : `${data.dashboard.summary.total} идэвхтэй`,
      tone: "neutral",
    },
    {
      label: "Ирсэн бүжигчин",
      value: dashboardMissing ? "—" : data.dashboard.summary.checked_in,
      hint: dashboardMissing
        ? "Мэдээлэл түр байхгүй"
        : `${data.dashboard.summary.late} хоцорсон · ${data.dashboard.summary.absent} тасалсан`,
      tone: data.dashboard.summary.absent
        ? "danger"
        : data.dashboard.summary.late
          ? "attention"
          : "healthy",
    },
    {
      label: "Шалгалт хүлээж буй",
      value: dashboardMissing
        ? "—"
        : data.dashboard.summary.pending_readiness,
      hint: dashboardMissing
        ? "Мэдээлэл түр байхгүй"
        : "Бэлэн байдлын шалгалт",
      tone: data.dashboard.summary.pending_readiness ? "attention" : "healthy",
    },
  ];
  return (
    <>
      <PageHeading
        eyebrow={`${data.dashboard.branch} салбар · ${monthLabel(data.sales.month)}`}
        title="Менежерийн тойм"
        description="Борлуулалтын зорилго, багийн өнөөдрийн төлөв болон таны шийдвэрлэх хүсэлтийг баталгаатай бүртгэлээс харуулна."
        action={
          <span className="live-data-freshness" aria-live="polite">
            <Clock3 size={16} />
            {refreshedAt
              ? `Сүүлд шинэчилсэн ${formatDateTime(refreshedAt)}`
              : "Мэдээлэл шинэчлэгдэж байна"}
          </span>
        }
      />
      <section
        className="live-operation-strip"
        aria-labelledby="manager-operation-title"
      >
        <header>
          <div>
            <span>Өнөөдрийн ажил</span>
            <h2 id="manager-operation-title">Шуурхай тойм</h2>
          </div>
          <small>{formatDate(data.dashboard.date)}</small>
        </header>
        <div className="live-operation-grid">
          {operationalSummary.map((item) => (
            <article key={item.label} data-tone={item.tone}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.hint}</small>
            </article>
          ))}
        </div>
      </section>
      <section
        className="live-sales-hero"
        data-progress={salesMissing ? "pending" : progressState.tone}
      >
        <header>
          <div>
            <span>Энэ сарын борлуулалтын зорилго</span>
            <h2>
              {salesMissing
                ? "Мэдээлэл түр ачаалагдсангүй"
                : goal
                ? `${Math.round(percent)}% биелэлт`
                : "Батлагдсан зорилго хүлээгдэж байна"}
            </h2>
          </div>
          <div className="live-sales-hero-status">
            <b>{progressState.label}</b>
            <CircleDollarSign size={28} />
          </div>
        </header>
        <div className="live-sales-facts">
          <span className="is-primary">
            <small>Бодит борлуулалт</small>
            <strong>
              {salesMissing ? "—" : formatMoney(data.sales.actual_sales)}
            </strong>
          </span>
          <span>
            <small>Салбарын зорилго</small>
            <strong>{!salesMissing && goal ? formatMoney(target) : "—"}</strong>
          </span>
          <span>
            <small>Биелүүлэх үлдэгдэл</small>
            <strong>
              {!salesMissing && goal
                ? formatMoney(data.sales.remaining_amount ?? 0)
                : "—"}
            </strong>
          </span>
        </div>
        <Progress
          value={salesMissing ? 0 : percent}
          label="Салбарын борлуулалтын зорилгын биелэлт"
        />
        <footer>
          <span>
            {salesMissing
              ? "Шинэчлэх товчоор дахин оролдоно уу."
              : goal
              ? `CEO баталсан · ${stateLabel(goal.state)} · Баталгаатай борлуулалт`
              : "Менежер саналаа бэлтгэж CEO-д илгээх боломжтой."}
          </span>
          <button type="button" onClick={() => onNavigate("goals")}>
            Зорилго удирдах
            <ChevronRight size={16} />
          </button>
        </footer>
      </section>
      <div className="live-two-columns">
        <section className="live-panel live-panel--readiness">
          <header>
            <div>
              <span>Өнөөдөр</span>
              <h2>Бүжигчдийн ирц ба бэлэн байдал</h2>
            </div>
            <button type="button" onClick={() => onNavigate("readiness")}>
              {data.readiness.access.can_submit
                ? "Шалгалт хийх"
                : "Бүгдийг харах"}
            </button>
          </header>
          <div
            className={`live-readiness-note ${data.readiness.access.can_submit ? "is-fallback" : ""}`}
            role="note"
          >
            <ShieldCheck size={18} />
            <span>
              <strong>
                {data.dashboard.summary.pending_readiness} шалгаагүй
              </strong>
              <small>{data.readiness.access.message}</small>
            </span>
          </div>
          <div className="live-list live-readiness-list">
            {readinessRows.map((row) => {
              const readinessState = !row.shift
                ? "off"
                : (row.readiness?.result ?? "PENDING");
              const readinessLabel =
                readinessState === "READY"
                  ? "Бэлэн"
                  : readinessState === "NOT_READY"
                    ? "Бэлэн бус"
                    : readinessState === "PENDING"
                      ? "Шалгаагүй"
                      : "Ээлжгүй";
              return (
                <article key={row.profile}>
                  <span className="live-avatar">
                    {row.display_name.slice(0, 2)}
                  </span>
                  <div className="live-readiness-person">
                    <strong>{row.display_name}</strong>
                    <small>
                      {stateLabel(row.rank)} ·{" "}
                      {row.shift?.shift_type ?? "Ээлжгүй"}
                    </small>
                  </div>
                  <dl className="live-readiness-states">
                    <div>
                      <dt>QR ирц</dt>
                      <dd
                        data-tone={
                          row.status === "checked_in"
                            ? "ready"
                            : row.status === "late"
                              ? "warning"
                              : "muted"
                        }
                      >
                        {stateLabel(row.status)}
                      </dd>
                    </div>
                    <div>
                      <dt>Бэлэн байдал</dt>
                      <dd
                        data-tone={
                          readinessState === "READY"
                            ? "ready"
                            : readinessState === "NOT_READY"
                              ? "danger"
                              : readinessState === "PENDING"
                                ? "warning"
                                : "muted"
                        }
                      >
                        {readinessLabel}
                      </dd>
                      {row.readiness?.result === "NOT_READY" &&
                      row.readiness.reason ? (
                        <small title={row.readiness.reason}>
                          {row.readiness.reason}
                        </small>
                      ) : null}
                    </div>
                  </dl>
                </article>
              );
            })}
            {!readinessRows.length ? (
              <p className="live-empty">
                Энэ салбарт идэвхтэй бүжигчний бүртгэл алга.
              </p>
            ) : null}
          </div>
        </section>
        <section className="live-panel">
          <header>
            <div>
              <span>Шийдвэрлэх ажил</span>
              <h2>Менежерийн дараалал</h2>
            </div>
          </header>
          <div className="live-action-list">
            <button type="button" onClick={() => onNavigate("leave")}>
              <ClipboardCheck size={19} />
              <span>
                <strong>Чөлөөний хүсэлт</strong>
                <small>Зөвшөөрөх эсвэл татгалзах</small>
              </span>
              <b>
                {data.leaves.filter((item) => item.status === "Pending").length}
              </b>
            </button>
            <button type="button" onClick={() => onNavigate("penalties")}>
              <ShieldAlert size={19} />
              <span>
                <strong>Ирцийн шийдвэр</strong>
                <small>Цаг засвар, хоцролт, таслалт</small>
              </span>
              <b>
                {data.corrections.filter((item) => item.status === "Pending")
                  .length +
                  data.penalties.filter(
                    (item) => item.status === "Pending Review",
                  ).length}
              </b>
            </button>
            <button type="button" onClick={() => onNavigate("crm")}>
              <ContactRound size={19} />
              <span>
                <strong>Харилцагч хайх</strong>
                <small>Нэр, утас, зарцуулалт</small>
              </span>
              <b>{data.customerTotal}</b>
            </button>
          </div>
        </section>
      </div>
    </>
  );
}

function ScheduleView({ api }: { api: FrappeManagementApi }) {
  const [mode, setMode] = useState<"week" | "month">("week");
  const [memberType, setMemberType] = useState<"Entertainer" | "Employee">(
    "Entertainer",
  );
  const [anchor, setAnchor] = useState(startOfWeek());
  const [schedule, setSchedule] = useState<ManagerSchedule | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<{
    employee: string;
    profile?: string | null;
    name: string;
    roleLabel: string;
    memberType: "Entertainer" | "Employee";
    date: string;
    assignment?: { name: string; shift_type: string; modified: string } | null;
  } | null>(null);
  const [shiftType, setShiftType] = useState("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [editorError, setEditorError] = useState("");
  const [scheduleMessage, setScheduleMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError("");
    setSchedule(null);
    const start =
      mode === "week"
        ? startOfWeek(new Date(`${anchor}T12:00:00`))
        : `${anchor.slice(0, 7)}-01`;
    try {
      setSchedule(
        await api.getSchedule(
          start,
          mode === "week" ? 7 : daysInMonth(start.slice(0, 7)),
        ),
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Хуваарь ачаалж чадсангүй.",
      );
    }
  }, [anchor, api, mode]);

  useEffect(() => {
    void load();
  }, [load]);

  function changePeriod(direction: number) {
    if (mode === "week") setAnchor((value) => addDays(value, direction * 7));
    else {
      const date = new Date(`${anchor.slice(0, 7)}-01T12:00:00`);
      date.setMonth(date.getMonth() + direction);
      setAnchor(dateKey(date));
    }
  }

  function openEditor(
    person: ManagerSchedule["people"][number],
    date: string,
    assignment?: { name: string; shift_type: string; modified: string } | null,
  ) {
    setEditing({
      employee: person.employee,
      profile: person.profile,
      name: person.display_name,
      roleLabel: person.role_label,
      memberType: person.member_type,
      date,
      assignment,
    });
    setShiftType(
      assignment?.shift_type ?? schedule?.shift_types[0]?.name ?? "",
    );
    setSelectedDates([date]);
    setReason("");
    setEditorError("");
  }

  function openBulkEditor(person: ManagerSchedule["people"][number]) {
    setEditing({
      employee: person.employee,
      profile: person.profile,
      name: person.display_name,
      roleLabel: person.role_label,
      memberType: person.member_type,
      date: "",
      assignment: null,
    });
    setShiftType(schedule?.shift_types[0]?.name ?? "");
    setSelectedDates([]);
    setReason("");
    setEditorError("");
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editing || !schedule) return;
    const person = schedule.people.find(
      (item) => item.employee === editing.employee,
    );
    const targets =
      person?.days.filter(
        (day) => day.editable && selectedDates.includes(day.date),
      ) ?? [];
    if (!targets.length) {
      setEditorError("Хуваарь оруулах өдрөө сонгоно уу.");
      return;
    }
    const auditReason =
      reason.trim() ||
      (shiftType
        ? `Менежер ${targets.length} өдрийн хуваарь оруулав`
        : `Менежер ${targets.length} өдрийн ээлжийг цуцлав`);
    setSaving(true);
    setEditorError("");
    setScheduleMessage("");
    const failedDates: string[] = [];
    let savedCount = 0;
    try {
      for (const day of targets) {
        try {
          await api.setSchedule({
            employeeName: editing.employee,
            profileName: editing.profile,
            workDate: day.date,
            shiftType,
            reason: auditReason,
            expectedAssignment: day.assignment?.name,
            expectedModified: day.assignment?.modified,
          });
          savedCount += 1;
        } catch {
          failedDates.push(day.date);
        }
      }
      await load();
      if (failedDates.length) {
        setSelectedDates(failedDates);
        setEditorError(
          `${failedDates.length} өдрийг хадгалж чадсангүй. Сонгогдсон өдрүүдийг дахин оролдоно уу.`,
        );
        if (savedCount)
          setScheduleMessage(`${savedCount} өдрийн хуваарь хадгалагдлаа.`);
      } else {
        setEditing(null);
        setScheduleMessage(`${savedCount} өдрийн хуваарь хадгалагдлаа.`);
      }
    } finally {
      setSaving(false);
    }
  }

  const visiblePeople =
    schedule?.people.filter((person) => person.member_type === memberType) ??
    [];
  const weekStart = new Date(`${anchor}T12:00:00`);
  const weekEnd = new Date(`${addDays(startOfWeek(weekStart), 6)}T12:00:00`);
  const compactWeek =
    weekStart.getMonth() === weekEnd.getMonth()
      ? `${weekStart.getMonth() + 1}-р сарын ${weekStart.getDate()}–${weekEnd.getDate()}`
      : `${weekStart.getMonth() + 1}-р сарын ${weekStart.getDate()} – ${weekEnd.getMonth() + 1}-р сарын ${weekEnd.getDate()}`;

  return (
    <>
      <PageHeading
        eyebrow="Ажиллах хүчний төлөвлөлт"
        title="Багийн хуваарь"
        description="Ажилтнаа сонгоод өдөр, ээлжийг нэг дор оруулна."
        action={
          <div className="live-segment">
            <button
              className={mode === "week" ? "active" : ""}
              type="button"
              onClick={() => setMode("week")}
            >
              7 хоног
            </button>
            <button
              className={mode === "month" ? "active" : ""}
              type="button"
              onClick={() => setMode("month")}
            >
              Сар
            </button>
          </div>
        }
      />
      <section className="live-period">
        <button
          type="button"
          aria-label="Өмнөх хугацаа"
          onClick={() => changePeriod(-1)}
        >
          <ChevronLeft />
        </button>
        <strong>
          {mode === "week" ? compactWeek : monthLabel(anchor.slice(0, 7))}
        </strong>
        <button
          type="button"
          aria-label="Дараах хугацаа"
          onClick={() => changePeriod(1)}
        >
          <ChevronRight />
        </button>
      </section>
      {error ? <ErrorState message={error} retry={load} /> : null}
      {!schedule ? (
        <LoadingState label="Хуваарь ачаалж байна…" />
      ) : (
        <>
          <div className="live-schedule-source">
            <ShieldCheck />
            <span>
              <strong>Менежерийн оруулсан хуваарь</strong>
              <small>
                Ажилтны нэр дээрх “Олон өдөр” товчоор ижил ээлжийг нэг дор оруулна.
              </small>
            </span>
          </div>
          {scheduleMessage ? (
            <p className="live-schedule-message" role="status">
              <CheckCircle2 size={17} />
              {scheduleMessage}
            </p>
          ) : null}
          <div
            className="live-schedule-groups"
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
                {schedule.source_meta?.entertainer_count ??
                  schedule.people.filter(
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
                {schedule.source_meta?.employee_count ??
                  schedule.people.filter(
                    (person) => person.member_type === "Employee",
                  ).length}
              </b>
            </button>
          </div>
          <section className="live-schedule-panel">
            <div className="live-schedule-scroll">
              <table>
                <thead>
                  <tr>
                    <th>
                      {memberType === "Entertainer" ? "Бүжигчин" : "Ажилтан"}
                    </th>
                    {schedule.dates.map((date) => (
                      <th key={date}>
                        <span>{formatDate(date, { weekday: "short" })}</span>
                        <strong>
                          {new Date(`${date}T12:00:00`).getDate()}
                        </strong>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visiblePeople.map((person) => (
                    <tr key={person.employee}>
                      <th>
                        <span className="live-avatar">
                          {person.display_name.slice(0, 2)}
                        </span>
                        <span className="live-schedule-person-info">
                          <strong>{person.display_name}</strong>
                          <small>
                            {person.role_label}
                            {person.rank ? ` · ${stateLabel(person.rank)}` : ""}
                          </small>
                        </span>
                        <button
                          className="live-schedule-bulk"
                          type="button"
                          onClick={() => openBulkEditor(person)}
                          aria-label={`${person.display_name}-ийн олон өдрийн хуваарь оруулах`}
                        >
                          Олон өдөр
                        </button>
                      </th>
                      {person.days.map((day) => (
                        <td key={day.date}>
                          <button
                            disabled={!day.editable}
                            type="button"
                            onClick={() =>
                              openEditor(person, day.date, day.assignment)
                            }
                            data-assigned={Boolean(day.assignment)}
                          >
                            {day.assignment ? (
                              <>
                                <strong>{day.assignment.shift_type}</strong>
                                <small>Баталгаажсан</small>
                              </>
                            ) : (
                              <>
                                <span>+</span>
                                <small>
                                  {day.editable ? "Ээлж оруулах" : "Бүртгэлгүй"}
                                </small>
                              </>
                            )}
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="live-schedule-mobile" aria-label="Мобайл хуваарь">
              {visiblePeople.map((person) => (
                <article key={person.employee}>
                  <header>
                    <span className="live-avatar">
                      {person.display_name.slice(0, 2)}
                    </span>
                    <span className="live-schedule-person-info">
                      <strong>{person.display_name}</strong>
                      <small>
                        {person.role_label}
                        {person.rank ? ` · ${stateLabel(person.rank)}` : ""}
                      </small>
                    </span>
                    <button
                      className="live-schedule-bulk"
                      type="button"
                      onClick={() => openBulkEditor(person)}
                      aria-label={`${person.display_name}-ийн олон өдрийн хуваарь оруулах`}
                    >
                      Олон өдөр
                    </button>
                  </header>
                  <div>
                    {person.days.map((day) => (
                      <button
                        key={day.date}
                        disabled={!day.editable}
                        type="button"
                        onClick={() => openEditor(person, day.date, day.assignment)}
                        data-assigned={Boolean(day.assignment)}
                      >
                        <span>
                          <small>{formatDate(day.date, { weekday: "short" })}</small>
                          <strong>
                            {formatDate(day.date, {
                              month: "short",
                              day: "numeric",
                            })}
                          </strong>
                        </span>
                        <span>
                          <strong>{day.assignment?.shift_type ?? "Ээлжгүй"}</strong>
                          <small>
                            {day.assignment
                              ? "Баталгаажсан"
                              : day.editable
                                ? "Дарж ээлж оруулах"
                                : "Бүртгэлгүй"}
                          </small>
                        </span>
                        <ChevronRight size={17} />
                      </button>
                    ))}
                  </div>
                </article>
              ))}
            </div>
            {!visiblePeople.length ? (
              <p className="live-empty">
                {memberType === "Entertainer"
                  ? "Энэ салбарт бүжигчний бүртгэл алга."
                  : "Энэ салбарт бусад ажилтны бүртгэл алга."}
              </p>
            ) : null}
          </section>
        </>
      )}
      {editing ? (
        <div
          className="live-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="schedule-dialog-title"
        >
          <form className="live-schedule-editor" onSubmit={save}>
            <header>
              <div>
                <span>
                  {editing.memberType === "Entertainer"
                    ? "Бүжигчин"
                    : editing.roleLabel}{" "}
                  · Ээлжийн тохиргоо
                </span>
                <h2 id="schedule-dialog-title">{editing.name}</h2>
              </div>
              <button
                type="button"
                aria-label="Хаах"
                onClick={() => setEditing(null)}
              >
                <X />
              </button>
            </header>
            <fieldset className="live-schedule-date-picker">
              <legend>1. Өдрүүдээ сонгоно уу</legend>
              <div>
                {schedule?.people
                  .find((person) => person.employee === editing.employee)
                  ?.days.map((day) => (
                    <button
                      key={day.date}
                      type="button"
                      disabled={!day.editable}
                      aria-pressed={selectedDates.includes(day.date)}
                      className={
                        selectedDates.includes(day.date) ? "active" : ""
                      }
                      onClick={() => {
                        setSelectedDates((current) =>
                          current.includes(day.date)
                            ? current.filter((date) => date !== day.date)
                            : [...current, day.date],
                        );
                        setEditorError("");
                      }}
                    >
                      <small>
                        {formatDate(day.date, { weekday: "short" })}
                      </small>
                      <strong>
                        {formatDate(day.date, {
                          month: "short",
                          day: "numeric",
                        })}
                      </strong>
                      <span>{day.assignment?.shift_type ?? "Ээлжгүй"}</span>
                    </button>
                  ))}
              </div>
            </fieldset>
            <label>
              <span>2. Ээлжээ сонгоно уу</span>
              <select
                value={shiftType}
                onChange={(event) => setShiftType(event.target.value)}
              >
                <option value="">Амралт / ээлжгүй</option>
                {schedule?.shift_types.map((shift) => (
                  <option key={shift.name} value={shift.name}>
                    {shift.name} · {shift.start_time}–{shift.end_time}
                  </option>
                ))}
              </select>
            </label>
            <details className="live-schedule-note">
              <summary>Тайлбар нэмэх (заавал биш)</summary>
              <label>
                <span>Тайлбар</span>
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={2}
                  placeholder="Жишээ: Ажилтны хүсэлтээр"
                />
              </label>
            </details>
            {editorError ? (
              <p className="live-schedule-editor-error" role="alert">
                <AlertTriangle size={16} />
                {editorError}
              </p>
            ) : null}
            <footer>
              <button type="button" onClick={() => setEditing(null)}>
                Цуцлах
              </button>
              <button
                className="live-button--primary"
                disabled={saving || !selectedDates.length}
                type="submit"
              >
                {saving
                  ? "Хадгалж байна…"
                  : `${selectedDates.length || 0} өдрийн хуваарь хадгалах`}
              </button>
            </footer>
          </form>
        </div>
      ) : null}
    </>
  );
}

function TeamView({
  api,
  team,
  onRefresh,
}: {
  api: FrappeManagementApi;
  team: ManagerTeam;
  onRefresh: () => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ManagerTeamMember | null>(null);
  const [detail, setDetail] = useState<EntertainerDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [options, setOptions] = useState<EmployeeLifecycleOptions | null>(null);
  const [hireOpen, setHireOpen] = useState(false);
  const [terminating, setTerminating] = useState<ManagerTeamMember | null>(
    null,
  );
  const [relievingDate, setRelievingDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [terminationReason, setTerminationReason] = useState("");
  const [savingLifecycle, setSavingLifecycle] = useState(false);
  const [lifecycleError, setLifecycleError] = useState("");
  const [lifecycleSuccess, setLifecycleSuccess] = useState("");
  const [hire, setHire] = useState<HireEmployeeInput>({
    firstName: "",
    lastName: "",
    gender: "",
    dateOfBirth: "",
    dateOfJoining: new Date().toISOString().slice(0, 10),
    company: "",
    designation: "",
    department: "",
    branch: team.branch,
    reason: "",
  });
  const lifecycleKeys = useRef(new Map<string, string>());
  const rows = useMemo(
    () =>
      team.members.filter((row) =>
        `${row.display_name} ${row.role_label}`
          .toLocaleLowerCase("mn")
          .includes(search.trim().toLocaleLowerCase("mn")),
      ),
    [team.members, search],
  );
  const groups = useMemo(
    () =>
      teamGroupOrder
        .map((group) => ({
          ...group,
          members: rows.filter((member) => teamGroupFor(member) === group.id),
        }))
        .filter((group) => group.members.length),
    [rows],
  );
  const scheduled = team.members.filter((row) => row.shift).length;
  async function openDetail(
    member: ManagerTeamMember,
    preserveCurrent = false,
  ) {
    setSelected(member);
    if (!preserveCurrent) setDetail(null);
    setDetailError("");
    setLoadingDetail(Boolean(member.profile) && !preserveCurrent);
    if (!member.profile) return;
    try {
      setDetail(await api.getManagerEntertainerDetail(member.profile));
    } catch (caught) {
      setDetailError(
        caught instanceof Error
          ? caught.message
          : "Бүжигчний мэдээлэл ачаалж чадсангүй.",
      );
    } finally {
      setLoadingDetail(false);
    }
  }
  async function openHire() {
    setLifecycleError("");
    setLifecycleSuccess("");
    try {
      const loaded = await api.getEmployeeLifecycleOptions(team.branch);
      setOptions(loaded);
      setHire({
        firstName: "",
        lastName: "",
        gender: loaded.genders[0] ?? "",
        dateOfBirth: "",
        dateOfJoining: loaded.today,
        company: loaded.companies[0] ?? "",
        designation: loaded.designations[0] ?? "",
        department: "",
        branch: team.branch,
        reason: "",
      });
      setHireOpen(true);
    } catch (caught) {
      setLifecycleError(
        caught instanceof Error
          ? caught.message
          : "Ажилтны бүртгэлийн тохиргоо ачаалж чадсангүй.",
      );
    }
  }
  async function submitHire(event: FormEvent) {
    event.preventDefault();
    if (
      !hire.firstName.trim() ||
      !hire.gender ||
      !hire.dateOfBirth ||
      !hire.dateOfJoining ||
      !hire.company ||
      !hire.designation ||
      hire.reason.trim().length < 5
    )
      return;
    const fingerprint = JSON.stringify(hire);
    let key = lifecycleKeys.current.get(fingerprint);
    if (!key) {
      key = idempotencyKey("employee-hire");
      lifecycleKeys.current.set(fingerprint, key);
    }
    setSavingLifecycle(true);
    setLifecycleError("");
    setLifecycleSuccess("");
    try {
      await api.hireEmployee(hire, key);
      lifecycleKeys.current.delete(fingerprint);
      setHireOpen(false);
      setLifecycleSuccess("Шинэ ажилтан багийн бүртгэлд нэмэгдлээ.");
      await onRefresh();
    } catch (caught) {
      setLifecycleError(
        caught instanceof Error
          ? caught.message
          : "Ажилтныг бүртгэж чадсангүй.",
      );
    } finally {
      setSavingLifecycle(false);
    }
  }
  function openTermination(member: ManagerTeamMember) {
    setTerminating(member);
    setRelievingDate(new Date().toISOString().slice(0, 10));
    setTerminationReason("");
    setLifecycleError("");
    setLifecycleSuccess("");
  }
  async function submitTermination(event: FormEvent) {
    event.preventDefault();
    if (!terminating || !relievingDate || terminationReason.trim().length < 5)
      return;
    const fingerprint = `${terminating.employee}|${terminating.modified}|${relievingDate}|${terminationReason.trim()}`;
    let key = lifecycleKeys.current.get(fingerprint);
    if (!key) {
      key = idempotencyKey("employee-terminate");
      lifecycleKeys.current.set(fingerprint, key);
    }
    setSavingLifecycle(true);
    setLifecycleError("");
    setLifecycleSuccess("");
    try {
      await api.terminateEmployee(
        terminating.employee,
        relievingDate,
        terminationReason.trim(),
        terminating.modified,
        key,
      );
      lifecycleKeys.current.delete(fingerprint);
      setTerminating(null);
      setSelected(null);
      setLifecycleSuccess("Ажилтны хөдөлмөрийн төлөв идэвхгүй боллоо.");
      await onRefresh();
    } catch (caught) {
      setLifecycleError(
        caught instanceof Error
          ? caught.message
          : "Ажилтны төлөвийг өөрчилж чадсангүй.",
      );
    } finally {
      setSavingLifecycle(false);
    }
  }
  if (selected)
    return (
      <>
        <button
          className="live-back"
          type="button"
          onClick={() => {
            setSelected(null);
            setDetail(null);
            setDetailError("");
            setTerminating(null);
          }}
        >
          <ChevronLeft size={18} />
          Багийн жагсаалт
        </button>
        {detailError ? (
          <ErrorState
            message={detailError}
            retry={() => void openDetail(selected)}
          />
        ) : null}
        {loadingDetail ? (
          <LoadingState label="Ажилтны мэдээлэл ачаалж байна…" />
        ) : detail ? (
          <EntertainerDetailView
            detail={detail}
            rankControl={
              <DailyRankScorecard
                api={api}
                detail={detail}
                onUpdated={() => openDetail(selected, true)}
              />
            }
          />
        ) : !detailError ? (
          <section className="live-panel live-member-profile">
            <header>
              <span className="live-avatar">
                {selected.display_name.slice(0, 2)}
              </span>
              <div>
                <span>{selected.role_label}</span>
                <h1>{selected.display_name}</h1>
                <p>{team.branch} салбар</p>
              </div>
            </header>
            <dl>
              <div>
                <dt>Ажилтны төлөв</dt>
                <dd>{stateLabel(selected.status)}</dd>
              </div>
              <div>
                <dt>Өнөөдрийн ээлж</dt>
                <dd>{selected.shift?.shift_type ?? "Ээлжгүй"}</dd>
              </div>
              <div>
                <dt>Ирц</dt>
                <dd>
                  {selected.attendance?.checked_in
                    ? selected.attendance.checked_out &&
                      selected.member_type === "Employee"
                      ? "Ирсэн · Гарсан"
                      : "Ирсэн"
                    : "Ирээгүй"}
                </dd>
              </div>
            </dl>
          </section>
        ) : null}
        <section className="live-panel live-employment-actions">
          <div>
            <span>Ажлын харилцаа</span>
            <h2>Ажилтны төлөв</h2>
            <p>
              Ажлаас чөлөөлөх үйлдэл нь үндсэн бүртгэлийг устгахгүй бөгөөд
              шалтгаантайгаар аудитад хадгалагдана.
            </p>
          </div>
          <button
            className="live-button"
            type="button"
            onClick={() => openTermination(selected)}
          >
            <UserMinus size={16} />
            Ажлын харилцааг дуусгах
          </button>
        </section>
        {terminating ? (
          <div
            className="live-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="terminate-employee-title"
          >
            <form onSubmit={submitTermination}>
              <header>
                <div>
                  <span>{team.branch} салбар</span>
                  <h2 id="terminate-employee-title">Ажлаас чөлөөлөх</h2>
                </div>
                <button
                  type="button"
                  aria-label="Хаах"
                  onClick={() => setTerminating(null)}
                >
                  <X />
                </button>
              </header>
              <p className="live-modal-copy">
                <strong>{terminating.display_name}</strong>-ийн үндсэн бүртгэл
                устахгүй. Ажил эрхлэлтийн төлөв идэвхгүй болж, холбогдсон
                нэвтрэх эрх хаагдана.
              </p>
              <label>
                <span>Чөлөөлөх огноо</span>
                <input
                  required
                  type="date"
                  value={relievingDate}
                  onChange={(event) => setRelievingDate(event.target.value)}
                />
              </label>
              <label>
                <span>Үндэслэл</span>
                <textarea
                  required
                  rows={4}
                  value={terminationReason}
                  onChange={(event) => setTerminationReason(event.target.value)}
                  placeholder="Шийдвэрийн үндэслэлийг тодорхой бичнэ үү"
                />
              </label>
              <footer>
                <button type="button" onClick={() => setTerminating(null)}>
                  Буцах
                </button>
                <button
                  className="live-button--danger"
                  disabled={
                    savingLifecycle || terminationReason.trim().length < 5
                  }
                  type="submit"
                >
                  {savingLifecycle ? "Хадгалж байна…" : "Ажлаас чөлөөлөх"}
                </button>
              </footer>
            </form>
          </div>
        ) : null}
      </>
    );
  const action = (
    <div className="live-heading-actions">
      <label className="live-search">
        <Search size={17} />
        <input
          aria-label="Багийн гишүүн хайх"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Нэр, албан тушаалаар хайх"
        />
      </label>
      <button
        className="live-button--primary"
        type="button"
        onClick={() => void openHire()}
      >
        <UserPlus size={17} />
        Ажилтан авах
      </button>
    </div>
  );
  return (
    <>
      <PageHeading
        eyebrow={`${team.branch} салбар`}
        title="Манай баг"
        description="Багийн гишүүдийг ажлын үүргээр нь ангилж, өнөөдрийн ээлж ба ирцийг нэг дор хянана."
        action={action}
      />
      {lifecycleError ? <ErrorState message={lifecycleError} /> : null}
      {lifecycleSuccess ? (
        <p className="live-inline-success" role="status">
          {lifecycleSuccess}
        </p>
      ) : null}
      <section className="live-metrics">
        <Metric
          icon={Users}
          label="Нийт баг"
          value={team.meta.total}
          hint={`${groups.length} ажлын бүлэг`}
        />
        <Metric
          icon={Gem}
          label="Бүжигчин"
          value={team.meta.entertainer_total}
          hint="Зэрэглэлтэй гишүүд"
          tone="violet"
        />
        <Metric
          icon={CalendarDays}
          label="Өнөөдрийн ээлжтэй"
          value={scheduled}
          hint={`${team.meta.total - scheduled} ээлжгүй`}
          tone="green"
        />
      </section>
      <div className="live-team-groups">
        {groups.map((group) => (
          <section className="live-panel live-team-group" key={group.id}>
            <header>
              <div>
                <span>{group.description}</span>
                <h2>{group.label}</h2>
              </div>
              <b>{group.members.length}</b>
            </header>
            <div className="live-table-list live-team-list">
              <div className="head">
                <span>Гишүүн</span>
                <span>Албан тушаал</span>
                <span>Төлөв</span>
                <span>Ирц</span>
                <span>Үйлдэл</span>
              </div>
              {group.members.map((row) => {
                const attendance = row.attendance;
                const attendanceText =
                  attendance?.state === "absent"
                    ? `Таслалт · ${attendance.late_after_time.slice(0, 5)}-оос хойш`
                    : !attendance?.checked_in
                      ? `Ирээгүй · босго ${attendance?.late_after_time?.slice(0, 5) ?? "22:00"}`
                      : attendance.late_minutes > 0
                        ? `${attendance.arrival_time ? formatDateTime(attendance.arrival_time) : "Ирсэн"} · ${attendance.late_minutes} мин хоцорсон`
                      : attendance.checked_out && row.member_type === "Employee"
                        ? `${attendance.arrival_time ? formatDateTime(attendance.arrival_time) : "Ирсэн"} · гарсан`
                        : `${attendance.arrival_time ? formatDateTime(attendance.arrival_time) : "Ирсэн"} · ${attendance.hourly_leave ? "цагийн чөлөөтэй" : "цагтаа"}`;
                return (
                  <article key={row.employee}>
                    <span>
                      <i className="live-avatar">
                        {row.display_name.slice(0, 2)}
                      </i>
                      <strong>{row.display_name}</strong>
                    </span>
                    <span>{row.role_label}</span>
                    <span>
                      {row.member_type === "Entertainer"
                        ? stateLabel(row.rank)
                        : stateLabel(row.status)}
                    </span>
                    <span
                      className="live-team-attendance"
                      data-state={attendance?.state ?? "not_arrived"}
                    >
                      {attendanceText}
                    </span>
                    <span className="live-row-actions">
                      <button
                        className="live-row-action"
                        type="button"
                        onClick={() => void openDetail(row)}
                      >
                        Профайл
                        <ChevronRight size={16} />
                      </button>
                    </span>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      {!rows.length ? (
        <p className="live-empty live-empty--card">
          Тохирох багийн гишүүн олдсонгүй.
        </p>
      ) : null}
      {hireOpen && options ? (
        <div
          className="live-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="hire-employee-title"
        >
          <form onSubmit={submitHire}>
            <header>
              <div>
                <span>{team.branch} салбар</span>
                <h2 id="hire-employee-title">Шинэ ажилтан авах</h2>
              </div>
              <button
                type="button"
                aria-label="Хаах"
                onClick={() => setHireOpen(false)}
              >
                <X />
              </button>
            </header>
            <p className="live-modal-copy">
              Энд үндсэн ажилтны бүртгэл үүснэ. Нэвтрэх эрх болон бүжигчний
              профайл автоматаар үүсэхгүй.
            </p>
            <div className="live-form-grid">
              <label>
                <span>Нэр</span>
                <input
                  required
                  value={hire.firstName}
                  onChange={(event) =>
                    setHire({ ...hire, firstName: event.target.value })
                  }
                />
              </label>
              <label>
                <span>Овог</span>
                <input
                  value={hire.lastName}
                  onChange={(event) =>
                    setHire({ ...hire, lastName: event.target.value })
                  }
                />
              </label>
              <label>
                <span>Хүйс</span>
                <select
                  required
                  value={hire.gender}
                  onChange={(event) =>
                    setHire({ ...hire, gender: event.target.value })
                  }
                >
                  {options.genders.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Төрсөн огноо</span>
                <input
                  required
                  type="date"
                  value={hire.dateOfBirth}
                  onChange={(event) =>
                    setHire({ ...hire, dateOfBirth: event.target.value })
                  }
                />
              </label>
              <label>
                <span>Ажилд орох огноо</span>
                <input
                  required
                  type="date"
                  value={hire.dateOfJoining}
                  onChange={(event) =>
                    setHire({ ...hire, dateOfJoining: event.target.value })
                  }
                />
              </label>
              <label>
                <span>Компани</span>
                <select
                  required
                  value={hire.company}
                  onChange={(event) =>
                    setHire({ ...hire, company: event.target.value })
                  }
                >
                  {options.companies.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Албан тушаал</span>
                <select
                  required
                  value={hire.designation}
                  onChange={(event) =>
                    setHire({ ...hire, designation: event.target.value })
                  }
                >
                  {options.designations.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Хэлтэс</span>
                <select
                  value={hire.department}
                  onChange={(event) =>
                    setHire({ ...hire, department: event.target.value })
                  }
                >
                  <option value="">Сонгохгүй</option>
                  {options.departments.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              <span>Ажилд авсан үндэслэл</span>
              <textarea
                required
                rows={3}
                value={hire.reason}
                onChange={(event) =>
                  setHire({ ...hire, reason: event.target.value })
                }
                placeholder="Жишээ: Батлагдсан орон тоонд ажилд авав"
              />
            </label>
            <footer>
              <button type="button" onClick={() => setHireOpen(false)}>
                Цуцлах
              </button>
              <button
                className="live-button--primary"
                disabled={
                  savingLifecycle ||
                  !hire.firstName.trim() ||
                  !hire.dateOfBirth ||
                  hire.reason.trim().length < 5
                }
                type="submit"
              >
                {savingLifecycle ? "Бүртгэж байна…" : "Ажилд авах"}
              </button>
            </footer>
          </form>
        </div>
      ) : null}
      {terminating ? (
        <div
          className="live-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="terminate-employee-title"
        >
          <form onSubmit={submitTermination}>
            <header>
              <div>
                <span>{team.branch} салбар</span>
                <h2 id="terminate-employee-title">Ажлаас чөлөөлөх</h2>
              </div>
              <button
                type="button"
                aria-label="Хаах"
                onClick={() => setTerminating(null)}
              >
                <X />
              </button>
            </header>
            <p className="live-modal-copy">
              <strong>{terminating.display_name}</strong>-ийн үндсэн бүртгэл
              устахгүй. Ажил эрхлэлтийн төлөв идэвхгүй болж, холбогдсон нэвтрэх
              эрх хаагдана.
            </p>
            <label>
              <span>Чөлөөлөх огноо</span>
              <input
                required
                type="date"
                value={relievingDate}
                onChange={(event) => setRelievingDate(event.target.value)}
              />
            </label>
            <label>
              <span>Үндэслэл</span>
              <textarea
                required
                rows={4}
                value={terminationReason}
                onChange={(event) => setTerminationReason(event.target.value)}
                placeholder="Шийдвэрийн үндэслэлийг тодорхой бичнэ үү"
              />
            </label>
            <footer>
              <button type="button" onClick={() => setTerminating(null)}>
                Буцах
              </button>
              <button
                className="live-button--danger"
                disabled={
                  savingLifecycle || terminationReason.trim().length < 5
                }
                type="submit"
              >
                {savingLifecycle ? "Хадгалж байна…" : "Ажлаас чөлөөлөх"}
              </button>
            </footer>
          </form>
        </div>
      ) : null}
    </>
  );
}

type TeamGroupId =
  | "entertainer"
  | "bar"
  | "security"
  | "service"
  | "leadership"
  | "other";

const teamGroupOrder: Array<{
  id: TeamGroupId;
  label: string;
  description: string;
}> = [
  {
    id: "entertainer",
    label: "Бүжигчид",
    description: "Зэрэглэл, орлого, үйлчилгээний дэлгэрэнгүйтэй",
  },
  { id: "bar", label: "Барны баг", description: "Бармен болон бармены туслах" },
  {
    id: "security",
    label: "Хамгаалалтын баг",
    description: "Хамгаалагч болон хүлээн авах ажилтан",
  },
  {
    id: "service",
    label: "Үйлчилгээний баг",
    description: "Зөөгч, үйлчлэгч болон үйлчилгээний ажилтан",
  },
  {
    id: "leadership",
    label: "Удирдлагын баг",
    description: "Менежер, ахлах болон зохицуулагч",
  },
  { id: "other", label: "Бусад ажилтан", description: "Бусад албан тушаал" },
];

function teamGroupFor(member: ManagerTeamMember): TeamGroupId {
  const role = member.role_label.toLocaleLowerCase("mn");
  if (member.member_type === "Entertainer" || /бүжигчин|entertainer/.test(role))
    return "entertainer";
  if (/бармен|bartender|bar /.test(role)) return "bar";
  if (/хамгаалагч|харуул|guard|reception|хүлээн авах/.test(role))
    return "security";
  if (/зөөгч|үйлчлэгч|үйлчилгээ|waiter|service/.test(role)) return "service";
  if (/менежер|ахлах|зохицуулагч|manager|supervisor/.test(role))
    return "leadership";
  return "other";
}

type EditableDailyRankComponent = Extract<
  DailyRankComponentName,
  | "customer_complaints"
  | "entertaining_skill"
  | "cleanliness_beauty"
  | "personal_development"
  | "entertainer_attitude"
>;

const dailyRankComponentOrder: DailyRankComponentName[] = [
  "sales",
  "attendance",
  "customer_complaints",
  "shift_effort",
  "entertaining_skill",
  "cleanliness_beauty",
  "personal_development",
  "entertainer_attitude",
];

const dailyRankComponentMeta: Record<
  DailyRankComponentName,
  {
    label: string;
    hint: string;
    source: string;
    weight: number;
    editable: boolean;
  }
> = {
  sales: {
    label: "Борлуулалт",
    hint: "Төлөгдсөн POS баримтын бодит гүйцэтгэл",
    source: "POS борлуулалт",
    weight: 40,
    editable: false,
  },
  attendance: {
    label: "Ирц, найдвартай байдал",
    hint: "Хуваарь ба QR ирц",
    source: "QR ирц",
    weight: 10,
    editable: false,
  },
  customer_complaints: {
    label: "Зочны санал, гомдол",
    hint: "100 = баталгаатай гомдолгүй",
    source: "Менежер",
    weight: 15,
    editable: true,
  },
  shift_effort: {
    label: "Өдрийн гараа",
    hint: "7 гарааны биелэлт",
    source: "Гараа",
    weight: 10,
    editable: false,
  },
  entertaining_skill: {
    label: "Pole, бүжгийн ур чадвар",
    hint: "Үзүүлбэрийн түвшин",
    source: "Менежер",
    weight: 5,
    editable: true,
  },
  cleanliness_beauty: {
    label: "Цэвэр цэмцгэр байдал",
    hint: "Өдрийн бэлтгэл, арчилгаа",
    source: "Менежер",
    weight: 5,
    editable: true,
  },
  personal_development: {
    label: "Хувийн идэвх",
    hint: "Суралцах, хөгжих оролцоо",
    source: "Менежер",
    weight: 5,
    editable: true,
  },
  entertainer_attitude: {
    label: "Хандлага",
    hint: "Баг ба зочинтой харилцах байдал",
    source: "Менежер",
    weight: 10,
    editable: true,
  },
};

const complaintSeverityLabels = {
  low: "Бага",
  medium: "Дунд",
  high: "Ноцтой",
  critical: "Маш ноцтой",
} as const;

function DailyRankScorecard({
  api,
  detail,
  onUpdated,
}: {
  api: FrappeManagementApi;
  detail: EntertainerDetail;
  onUpdated: () => Promise<void>;
}) {
  const snapshot =
    detail.manager_controls?.daily_rank ?? detail.profile.daily_rank;
  const audit = detail.manager_controls?.component_audit ?? [];
  const componentMap = new Map(
    (snapshot?.components ?? []).map((row) => [row.component, row]),
  );
  const scoringDate =
    snapshot?.scoring_date ||
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ulaanbaatar" });
  const [busyComponent, setBusyComponent] =
    useState<EditableDailyRankComponent | null>(null);
  const [editor, setEditor] = useState<EditableDailyRankComponent | null>(null);
  const [editorScore, setEditorScore] = useState(50);
  const [complaintReason, setComplaintReason] = useState("");
  const [complaintSeverity, setComplaintSeverity] =
    useState<keyof typeof complaintSeverityLabels>("medium");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function openEditor(
    component: EditableDailyRankComponent,
    currentScore?: number | null,
  ) {
    setEditor(component);
    setEditorScore(
      currentScore ?? (component === "customer_complaints" ? 100 : 50),
    );
    setComplaintReason("");
    setComplaintSeverity("medium");
    setError("");
  }

  async function saveScore(
    component: EditableDailyRankComponent,
    score: number,
    reason = "",
    severity?: keyof typeof complaintSeverityLabels,
  ) {
    const meta = dailyRankComponentMeta[component];
    setBusyComponent(component);
    setError("");
    setSuccess("");
    try {
      await api.submitDailyRankComponent(
        detail.profile.name,
        component,
        score,
        scoringDate,
        reason || `${meta.label} · ${score} оноо болгон шинэчлэв.`,
        idempotencyKey("manager-daily-rank"),
        severity,
      );
      setEditor(null);
      setSuccess(`${meta.label}: ${score} оноо хадгалагдлаа.`);
      await onUpdated();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Үнэлгээг хадгалж чадсангүй.",
      );
    } finally {
      setBusyComponent(null);
    }
  }

  function adjust(
    component: EditableDailyRankComponent,
    currentScore: number | null,
    delta: number,
  ) {
    if (currentScore === null || component === "customer_complaints") {
      openEditor(component, currentScore);
      return;
    }
    void saveScore(component, Math.max(0, Math.min(100, currentScore + delta)));
  }

  function submitEditor(event: FormEvent) {
    event.preventDefault();
    if (!editor) return;
    if (editor === "customer_complaints" && complaintReason.trim().length < 5)
      return;
    void saveScore(
      editor,
      editorScore,
      editor === "customer_complaints" ? complaintReason.trim() : "",
      editor === "customer_complaints" ? complaintSeverity : undefined,
    );
  }

  return (
    <section
      className="live-panel live-daily-rank"
      aria-labelledby="daily-rank-title"
    >
      <header>
        <div>
          <span>8 үзүүлэлт · {formatDate(scoringDate)}</span>
          <h2 id="daily-rank-title">Онооны үнэлгээ</h2>
        </div>
        <BarChart3 aria-hidden="true" />
      </header>
      <div className="live-daily-rank-summary">
        <span>
          <small>Хүчинтэй зэрэглэл</small>
          <strong>
            {stateLabel(
              detail.profile.approved_rank || detail.profile.current_rank,
            )}
          </strong>
        </span>
        <span>
          <small>Нийт өдрийн дундаж</small>
          <strong>
            {snapshot?.displayed_score == null
              ? "—"
              : `${Math.round(snapshot.displayed_score * 10) / 10}/100`}
          </strong>
          <em>{snapshot?.counted_days ?? 0} өдөр тооцсон</em>
        </span>
        <span>
          <small>Энэ өдрийн оноо</small>
          <strong>
            {snapshot?.weighted_score == null
              ? "—"
              : `${Math.round(snapshot.weighted_score * 10) / 10}/100`}
          </strong>
          <em>
            {snapshot?.calculated_rank
              ? `Дундажаар ${stateLabel(snapshot.calculated_rank)}`
              : `${snapshot?.missing_components.length ?? 8} үзүүлэлт дутуу`}
          </em>
        </span>
      </div>
      <div className="live-daily-rank-list">
        {dailyRankComponentOrder.map((component, index) => {
          const meta = dailyRankComponentMeta[component];
          const row = componentMap.get(component);
          const score = row?.score == null ? null : Math.round(row.score);
          const isEditable = meta.editable;
          const editableComponent = component as EditableDailyRankComponent;
          const busy = busyComponent === component;
          return (
            <article key={component} data-editable={isEditable}>
              <i aria-hidden="true">{index + 1}</i>
              <span className="live-daily-rank-label">
                <strong>{meta.label}</strong>
                <small>{meta.hint}</small>
              </span>
              <span className="live-daily-rank-source">
                <small>{meta.source}</small>
                <b>{row?.weight ?? meta.weight}%</b>
              </span>
              <span className="live-daily-rank-value">
                <strong>{score === null ? "—" : score}</strong>
                <small>
                  {row?.contribution == null
                    ? "Тооцоогүй"
                    : `${Math.round(row.contribution * 10) / 10} оноо`}
                </small>
              </span>
              {isEditable ? (
                <span className="live-score-stepper">
                  {score === null ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => openEditor(editableComponent, score)}
                    >
                      Оноо өгөх
                    </button>
                  ) : component === "customer_complaints" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => openEditor(editableComponent, score)}
                    >
                      Шалтгаантай засах
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        aria-label={`${meta.label} 5 оноо хасах`}
                        disabled={busy || score <= 0}
                        onClick={() => adjust(editableComponent, score, -5)}
                      >
                        <Minus />
                      </button>
                      <button
                        type="button"
                        aria-label={`${meta.label} 5 оноо нэмэх`}
                        disabled={busy || score >= 100}
                        onClick={() => adjust(editableComponent, score, 5)}
                      >
                        <Plus />
                      </button>
                    </>
                  )}
                </span>
              ) : (
                <span className="live-daily-rank-lock">
                  <ShieldCheck />
                  <small>Автомат</small>
                </span>
              )}
            </article>
          );
        })}
      </div>
      {error ? (
        <p className="live-inline-error" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="live-inline-success" role="status">
          <CheckCircle2 />
          {success}
        </p>
      ) : null}
      {audit.length ? (
        <details className="live-daily-rank-audit">
          <summary>
            Сүүлийн өөрчлөлтүүд <span>{audit.length}</span>
          </summary>
          <div>
            {audit.slice(0, 6).map((item) => (
              <article key={item.name}>
                <span>
                  <strong>
                    {dailyRankComponentMeta[item.component]?.label ??
                      item.component}
                  </strong>
                  <small>
                    {item.reason || "Өдрийн үнэлгээ"} ·{" "}
                    {formatDateTime(item.occurred_at)}
                  </small>
                </span>
                <b>
                  {item.previous_score == null
                    ? "—"
                    : Math.round(item.previous_score)}{" "}
                  → {Math.round(item.score)}
                </b>
              </article>
            ))}
          </div>
        </details>
      ) : null}
      {editor
        ? createPortal(
            <div
              className="live-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="daily-rank-editor-title"
            >
              <form onSubmit={submitEditor}>
                <header>
                  <div>
                    <span>
                      {formatDate(scoringDate)} ·{" "}
                      {dailyRankComponentMeta[editor].weight}%
                    </span>
                    <h2 id="daily-rank-editor-title">
                      {dailyRankComponentMeta[editor].label}
                    </h2>
                  </div>
                  <button
                    type="button"
                    aria-label="Хаах"
                    onClick={() => setEditor(null)}
                  >
                    <X />
                  </button>
                </header>
                <div className="live-score-editor-value">
                  <strong>{editorScore}</strong>
                  <span>/100</span>
                </div>
                <label>
                  <span>Оноо</span>
                  <input
                    aria-label="Өдрийн үнэлгээний оноо"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={editorScore}
                    onInput={(event) =>
                      setEditorScore(Number(event.currentTarget.value))
                    }
                  />
                </label>
                <div className="live-score-editor-scale">
                  <span>0</span>
                  <span>50</span>
                  <span>100</span>
                </div>
                {editor === "customer_complaints" ? (
                  <>
                    <label>
                      <span>Ноцтой байдал</span>
                      <select
                        aria-label="Гомдлын ноцтой байдал"
                        value={complaintSeverity}
                        onChange={(event) =>
                          setComplaintSeverity(
                            event.target
                              .value as keyof typeof complaintSeverityLabels,
                          )
                        }
                      >
                        {Object.entries(complaintSeverityLabels).map(
                          ([value, label]) => (
                            <option value={value} key={value}>
                              {label}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                    <label>
                      <span>Яагаад энэ оноог өгч байна?</span>
                      <textarea
                        aria-label="Гомдлын шалтгаан"
                        rows={4}
                        value={complaintReason}
                        onChange={(event) =>
                          setComplaintReason(event.target.value)
                        }
                        placeholder="Зочны санал, болсон үйл явдал, шалгасан баримтыг товч бичнэ үү"
                      />
                    </label>
                  </>
                ) : (
                  <p className="live-modal-copy">
                    Өөрчлөлт шууд хадгалагдаж, хэн хэзээ өөрчилсөн нь audit-д
                    үлдэнэ.
                  </p>
                )}
                {error ? (
                  <p className="live-inline-error" role="alert">
                    {error}
                  </p>
                ) : null}
                <footer>
                  <button type="button" onClick={() => setEditor(null)}>
                    Цуцлах
                  </button>
                  <button
                    className="live-button--primary"
                    disabled={
                      busyComponent === editor ||
                      (editor === "customer_complaints" &&
                        complaintReason.trim().length < 5)
                    }
                    type="submit"
                  >
                    {busyComponent === editor
                      ? "Хадгалж байна…"
                      : "Оноо хадгалах"}
                  </button>
                </footer>
              </form>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}

function EntertainerDetailView({
  detail,
  rankControl,
}: {
  detail: EntertainerDetail;
  rankControl?: ReactNode;
}) {
  const name =
    detail.profile.stage_name ||
    detail.profile.employee_name ||
    detail.profile.employee;
  const performance = detail.performance;
  const tags = [
    detail.profile.skills,
    detail.profile.languages,
    detail.profile.service_tags,
    detail.profile.style_tags,
  ].filter(Boolean);
  const lifetime = performance?.lifetime;
  const arrivalLogs = detail.attendance.filter((row) => row.log_type === "IN");
  return (
    <>
      <PageHeading
        eyebrow={`${detail.profile.branch} салбар · Бүжигчний мэдээлэл`}
        title={name}
        description="Орлого, үйлчилгээ, ирц, хуваарийг баталгаатай эх бүртгэлээс нэг дор харуулна."
      />
      <section className="live-person-summary">
        <div className="live-person-identity">
          <span className="live-avatar live-avatar--large">
            {name.slice(0, 2)}
          </span>
          <div>
            <h2>{name}</h2>
            <p>
              {detail.profile.employee_name || detail.profile.employee} ·{" "}
              {stateLabel(detail.profile.current_rank)}
            </p>
          </div>
          <b>
            {detail.profile.lifecycle_status === "Active"
              ? "Идэвхтэй"
              : stateLabel(detail.profile.lifecycle_status)}
          </b>
        </div>
        <div className="live-person-metrics">
          <span>
            <small>Энэ сарын борлуулалт</small>
            <strong>
              {formatMoney(performance?.current_month_income ?? 0)}
            </strong>
          </span>
          <span>
            <small>Нийт борлуулалт</small>
            <strong>{formatMoney(lifetime?.total_income ?? 0)}</strong>
          </span>
          <span>
            <small>Ажилласан сар</small>
            <strong>{lifetime?.active_months ?? 0} сар</strong>
          </span>
          <span>
            <small>Нийт үйлчилгээ</small>
            <strong>{lifetime?.service_count ?? 0}</strong>
          </span>
          <span>
            <small>Төлөгдсөн баримт</small>
            <strong>{lifetime?.bill_count ?? 0}</strong>
          </span>
        </div>
      </section>
      {rankControl}
      <div className="live-two-columns">
        <section className="live-panel">
          <header>
            <div>
              <span>Өнөөдрийн хяналт</span>
              <h2>Ирц ба хуваарь</h2>
            </div>
          </header>
          <dl className="live-detail-facts">
            <div>
              <dt>Хуваарьтай өдөр</dt>
              <dd>{detail.summary.scheduled_days}</dd>
            </div>
            <div>
              <dt>Ирсэн бүртгэл</dt>
              <dd>{arrivalLogs.length}</dd>
            </div>
            <div>
              <dt>Хоцролт</dt>
              <dd>{detail.summary.late_minutes} минут</dd>
            </div>
            <div>
              <dt>Идэвхтэй суутгал</dt>
              <dd>{formatMoney(detail.summary.active_deduction)}</dd>
            </div>
          </dl>
          <div className="live-attendance-list">
            {arrivalLogs.slice(0, 8).map((row) => (
              <article key={row.name}>
                <Clock3 size={16} />
                <span>
                  <strong>Ирсэн</strong>
                  <small>{formatDateTime(row.time)}</small>
                </span>
              </article>
            ))}
            {!arrivalLogs.length ? (
              <p className="live-empty">Ирцийн бүртгэл хараахан алга.</p>
            ) : null}
          </div>
        </section>
        <section className="live-panel">
          <header>
            <div>
              <span>Ажил, үйлчилгээ</span>
              <h2>Сүүлийн үйлчилгээ</h2>
            </div>
          </header>
          <div className="live-service-list">
            {performance?.recent_services.slice(0, 8).map((row) => (
              <article key={row.key}>
                <span>
                  <strong>{row.service}</strong>
                  <small>{formatDate(row.date)}</small>
                </span>
                <b>{formatMoney(row.amount)}</b>
              </article>
            ))}
            {!performance?.recent_services.length ? (
              <p className="live-empty">Үйлчилгээний мэдээлэл хараахан алга.</p>
            ) : null}
          </div>
        </section>
      </div>
      <section className="live-panel live-week-detail">
        <header>
          <div>
            <span>
              {detail.week.start} – {detail.week.end}
            </span>
            <h2>Энэ долоо хоногийн хуваарь</h2>
          </div>
        </header>
        <div>
          {detail.week.days.map((day) => (
            <article key={day.date}>
              <strong>
                {formatDate(day.date, { weekday: "short", day: "numeric" })}
              </strong>
              <span>
                {day.shift_type
                  ? `${day.shift_type}${day.start_time && day.end_time ? ` · ${day.start_time.slice(0, 5)}–${day.end_time.slice(0, 5)}` : ""}`
                  : "Ээлжгүй"}
              </span>
            </article>
          ))}
        </div>
      </section>
      {tags.length ? (
        <section className="live-profile-tags">
          <h2>Ур чадвар ба үйлчилгээ</h2>
          <div>
            {tags.map((value) =>
              String(value)
                .split(/\r?\n|,/)
                .filter(Boolean)
                .map((item) => (
                  <span key={`${value}:${item}`}>{item.trim()}</span>
                )),
            )}
          </div>
        </section>
      ) : null}
    </>
  );
}

function visitLabel(count: number): string {
  return count <= 1 ? "Анх удаа ирж байна" : `${count} дахь удаагаа ирж байна`;
}

function leavePeriodLabel(item: LeaveRequest): string {
  if (!item.to_date || item.to_date === item.leave_date)
    return formatDate(item.leave_date, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  const start = new Date(`${item.leave_date}T12:00:00`);
  const end = new Date(`${item.to_date}T12:00:00`);
  const days = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / 86400000) + 1,
  );
  return `${formatDate(item.leave_date)} – ${formatDate(item.to_date)} · ${days} өдөр`;
}

function billDurationLabel(minutes: number): string {
  if (!minutes) return "";
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return [hours ? `${hours} цаг` : "", remainder ? `${remainder} минут` : ""]
    .filter(Boolean)
    .join(" ");
}

function billEntertainerRows(bill: CustomerBill) {
  const rows = new Map<
    string,
    { name: string; hours: number; services: number }
  >();
  for (const item of bill.items ?? []) {
    for (const dancer of item.dancers ?? []) {
      const name = dancer.nickname || dancer.name || "Нэргүй бүжигчин";
      const row = rows.get(name) ?? { name, hours: 0, services: 0 };
      row.hours += Number(dancer.hours || 0);
      row.services += 1;
      rows.set(name, row);
    }
  }
  return [...rows.values()].sort(
    (left, right) => right.hours - left.hours || right.services - left.services,
  );
}

function EntryBillHistory({ bills }: { bills: CustomerBill[] }) {
  const [expandedBill, setExpandedBill] = useState<string | null>(null);
  const days = useMemo(() => {
    const grouped = new Map<string, CustomerBill[]>();
    for (const bill of bills) {
      const day = bill.posting_date || "Огноогүй";
      grouped.set(day, [...(grouped.get(day) ?? []), bill]);
    }
    return [...grouped.entries()].map(([date, dayBills]) => ({
      date,
      bills: dayBills,
    }));
  }, [bills]);

  return (
    <section
      className="live-entry-bill-history"
      aria-labelledby="entry-bill-history-title"
    >
      <header>
        <ReceiptText />
        <div>
          <small>POS борлуулалт · Бодит мэдээлэл</small>
          <h2 id="entry-bill-history-title">Өмнөх bill ба үйлчилгээ</h2>
          <p>
            Bill дээр дарж өрөө, бүжигчин, суусан цаг болон задаргааг харна.
          </p>
        </div>
        <b>{bills.length} bill</b>
      </header>
      {!days.length ? (
        <p className="live-empty live-entry-bill-empty">
          Энэ салбарт өмнөх bill-ийн мэдээлэл хараахан алга.
        </p>
      ) : (
        <div className="live-entry-bill-days">
          {days.map((day) => {
            const dailyTotal = day.bills.reduce(
              (sum, bill) =>
                sum +
                (bill.bill_type === 2
                  ? -Math.abs(bill.total_amount || 0)
                  : Math.abs(bill.total_amount || 0)),
              0,
            );
            return (
              <section className="live-entry-bill-day" key={day.date}>
                <header>
                  <span>
                    <CalendarDays />
                    <strong>
                      {day.date === "Огноогүй"
                        ? day.date
                        : formatDate(day.date, {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                    </strong>
                    <small>
                      {day.date === "Огноогүй"
                        ? ""
                        : formatDate(day.date, { weekday: "long" })}{" "}
                      · {day.bills.length} bill
                    </small>
                  </span>
                  <span>
                    <small>Өдрийн дүн</small>
                    <b>{formatMoney(dailyTotal)}</b>
                  </span>
                </header>
                <div>
                  {day.bills.map((bill) => {
                    const entertainers = billEntertainerRows(bill);
                    const totalHours = entertainers.reduce(
                      (sum, item) => sum + item.hours,
                      0,
                    );
                    const expanded = expandedBill === bill.name;
                    const roomLabel = bill.rooms?.length
                      ? bill.rooms.map((room) => room.name).join(", ")
                      : "Өрөөгүй";
                    return (
                      <article
                        className={expanded ? "is-expanded" : ""}
                        key={bill.name}
                      >
                        <button
                          type="button"
                          aria-expanded={expanded}
                          aria-controls={`bill-detail-${bill.name}`}
                          onClick={() =>
                            setExpandedBill((current) =>
                              current === bill.name ? null : bill.name,
                            )
                          }
                        >
                          <span className="live-entry-bill-identity">
                            <small>Bill №</small>
                            <strong>{bill.bill_code || bill.name}</strong>
                            <em>
                              {bill.open_date
                                ? `${formatTime(bill.open_date)}${bill.closed_date ? `–${formatTime(bill.closed_date)}` : ""}`
                                : bill.store_name}
                              {bill.duration_minutes > 0
                                ? ` · ${billDurationLabel(bill.duration_minutes)}`
                                : ""}
                            </em>
                          </span>
                          <strong
                            className={`live-entry-bill-amount${bill.bill_type === 2 ? " is-refund" : ""}`}
                          >
                            {bill.bill_type === 2 ? "− " : ""}
                            {formatMoney(Math.abs(bill.total_amount || 0))}
                          </strong>
                          <span className="live-entry-bill-tags">
                            <small>
                              <BedDouble />
                              {roomLabel}
                            </small>
                            <small>
                              <Star />
                              {entertainers.length
                                ? `${entertainers.length} бүжигчин${totalHours ? ` · ${totalHours} цаг` : ""}`
                                : "Бүжигчин бүртгэлгүй"}
                            </small>
                          </span>
                          <ChevronDown aria-hidden="true" />
                        </button>
                        {expanded ? (
                          <div
                            className="live-entry-bill-detail"
                            id={`bill-detail-${bill.name}`}
                          >
                            <section className="live-entry-bill-primary-detail">
                              <h3>Үндсэн мэдээлэл</h3>
                              <div className="live-entry-bill-facts">
                                <span>
                                  <small>Өрөө</small>
                                  <strong>
                                    {bill.rooms?.length
                                      ? bill.rooms
                                          .map((room) => room.name)
                                          .join(", ")
                                      : "Бүртгэлгүй"}
                                  </strong>
                                </span>
                                <span>
                                  <small>Өрөөний цаг</small>
                                  <strong>
                                    {bill.rooms?.length
                                      ? `${bill.rooms.reduce((sum, room) => sum + Number(room.hours || 0), 0)} цаг`
                                      : "—"}
                                  </strong>
                                </span>
                                <span>
                                  <small>Бүжигчний нийт цаг</small>
                                  <strong>
                                    {totalHours ? `${totalHours} цаг` : "—"}
                                  </strong>
                                </span>
                              </div>
                            </section>
                            <section>
                              <h3>Суусан бүжигчин · {entertainers.length}</h3>
                              {entertainers.length ? (
                                <div className="live-entry-bill-entertainers">
                                  {entertainers.map((item, index) => (
                                    <article key={`${bill.name}-${item.name}`}>
                                      <span>
                                        <i>{index + 1}</i>
                                        <strong>{item.name}</strong>
                                      </span>
                                      <b>
                                        {item.hours
                                          ? `${item.hours} цаг`
                                          : `${item.services} үйлчилгээ`}
                                      </b>
                                    </article>
                                  ))}
                                </div>
                              ) : (
                                <p>Энэ bill-д бүжигчин холбогдоогүй.</p>
                              )}
                            </section>
                            <details className="live-entry-bill-items-disclosure">
                              <summary>
                                <span>
                                  <ReceiptText />
                                  <strong>Bill-ийн задаргаа</strong>
                                  <small>{bill.items?.length ?? 0} мөр</small>
                                </span>
                                <ChevronDown />
                              </summary>
                              {bill.items?.length ? (
                                <div className="live-entry-bill-items">
                                  {bill.items.map((item, index) => (
                                    <article key={`${bill.name}-item-${index}`}>
                                      <span>
                                        <strong>{item.name}</strong>
                                        {item.dancers?.length ? (
                                          <small>
                                            {item.dancers
                                              .map(
                                                (dancer) =>
                                                  `${dancer.nickname || dancer.name}${dancer.hours ? ` · ${dancer.hours} цаг` : ""}`,
                                              )
                                              .join(", ")}
                                          </small>
                                        ) : null}
                                      </span>
                                      <b>
                                        {item.quantity} ш ·{" "}
                                        {formatMoney(Math.abs(item.total || 0))}
                                      </b>
                                    </article>
                                  ))}
                                </div>
                              ) : (
                                <p>
                                  Bill-ийн бараа, үйлчилгээний задаргаа ирээгүй.
                                </p>
                              )}
                            </details>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}

function GuestBanControl({
  customer,
  customerName,
  branch,
  isBanned,
  currentReason,
  notices = [],
  onSave,
}: {
  customer: string;
  customerName: string;
  branch: string;
  isBanned: boolean;
  currentReason?: string;
  notices?: CustomerBranchBanNotice[];
  onSave: (customer: string, banned: boolean, reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const otherBranchBans = notices.filter((notice) => notice.branch !== branch);
  const nextBanned = !isBanned;
  useEffect(() => {
    setReason("");
    setConfirming(false);
    setError("");
    setSuccess("");
  }, [customer, isBanned]);
  function requestConfirmation(event: FormEvent) {
    event.preventDefault();
    if (reason.trim().length < 3) return;
    setConfirming(true);
  }
  async function save() {
    if (reason.trim().length < 3) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await onSave(customer, nextBanned, reason.trim());
      setSuccess(
        nextBanned
          ? `${branch} салбарт нэвтрэх эрхийг блоклолоо.`
          : `${branch} салбарын блокийг цуцаллаа.`,
      );
      setReason("");
      setConfirming(false);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Нэвтрэх эрхийн өөрчлөлтийг хадгалж чадсангүй.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className={`live-guest-ban-control${isBanned ? " is-banned" : ""}`}
      aria-labelledby="guest-ban-control-title"
    >
      <header>
        <ShieldAlert size={22} />
        <div>
          <small>САЛБАРЫН НЭВТРЭХ ЭРХ</small>
          <h2 id="guest-ban-control-title">
            {isBanned ? "Блок цуцлах" : "Хэрэглэгчийг блоклох"}
          </h2>
          <p>
            Зөвхөн {branch || "энэ"} салбарт үйлчилнэ. Шалтгаан нь бусад
            салбарын менежерт харагдана.
          </p>
        </div>
        <b>{isBanned ? "Блоктой" : "Нээлттэй"}</b>
      </header>
      {isBanned ? (
        <div className="live-guest-ban-current">
          <strong>Одоогийн шалтгаан</strong>
          <span>{currentReason || "Шалтгаан оруулаагүй"}</span>
        </div>
      ) : null}
      {otherBranchBans.length ? (
        <details className="live-guest-ban-other">
          <summary>
            Бусад салбарын блок · {otherBranchBans.length}
            <ChevronDown size={16} />
          </summary>
          <div>
            {otherBranchBans.map((notice) => (
              <article key={notice.branch}>
                <strong>{notice.branch}</strong>
                <span>{notice.ban_reason || "Шалтгаан оруулаагүй"}</span>
                <small>
                  {notice.banned_at
                    ? formatDateTime(notice.banned_at)
                    : "Огноо тодорхойгүй"}
                  {notice.banned_by ? ` · ${notice.banned_by}` : ""}
                </small>
              </article>
            ))}
          </div>
        </details>
      ) : null}
      <form onSubmit={requestConfirmation}>
        <label>
          <span>{isBanned ? "Блок цуцлах шалтгаан" : "Блоклох шалтгаан"}</span>
          <textarea
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              setConfirming(false);
              setError("");
              setSuccess("");
            }}
            placeholder={
              isBanned
                ? "Жишээ: Менежерийн шийдвэрээр эрхийг сэргээв"
                : "Жишээ: Дотоод журам зөрчсөн"
            }
          />
        </label>
        {confirming ? (
          <div className="live-guest-ban-confirm" role="alert">
            <span>
              <strong>{customerName}</strong>
              <small>
                {nextBanned
                  ? `${branch} салбарт блоклох гэж байна.`
                  : `${branch} салбарын блокийг цуцлах гэж байна.`}
              </small>
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirming(false)}
            >
              Буцах
            </button>
            <button
              className={nextBanned ? "is-danger" : "is-success"}
              type="button"
              disabled={busy}
              onClick={() => void save()}
            >
              {busy
                ? "Хадгалж байна…"
                : nextBanned
                  ? "Тийм, блоклох"
                  : "Тийм, цуцлах"}
            </button>
          </div>
        ) : (
          <button
            className={nextBanned ? "is-danger" : "is-success"}
            type="submit"
            disabled={busy || reason.trim().length < 3}
          >
            {nextBanned ? "Блоклох" : "Блок цуцлах"}
          </button>
        )}
        {error ? (
          <p className="live-inline-error" role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="live-inline-success" role="status">
            {success}
          </p>
        ) : null}
      </form>
    </section>
  );
}

function GuestCharacteristicsControl({
  customer,
  value = "",
  onSave,
}: {
  customer: string;
  value?: string;
  onSave: (customer: string, value: string) => Promise<void>;
}) {
  const [text, setText] = useState(value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  useEffect(() => {
    setText(value);
    setError("");
    setSuccess("");
  }, [customer, value]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await onSave(customer, text.trim());
      setSuccess("Үйлчилгээний онцлог хадгалагдлаа.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Үйлчилгээний онцлог хадгалж чадсангүй.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="live-guest-characteristics" onSubmit={submit}>
      <header>
        <HeartHandshake size={19} />
        <span>
          <small>ҮЙЛЧИЛГЭЭНИЙ БАГТ ХАРАГДАНА</small>
          <strong>Зочны онцлог</strong>
        </span>
      </header>
      <label>
        <span className="sr-only">Зочны үйлчилгээний онцлог</span>
        <textarea
          rows={3}
          maxLength={500}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setError("");
            setSuccess("");
          }}
          placeholder="Жишээ: Тайван орчин хүсдэг, виски мөстэй уудаг"
        />
      </label>
      <footer>
        <small>{text.length}/500</small>
        <button
          className="live-button--primary"
          type="submit"
          disabled={busy || text.trim() === value.trim()}
        >
          {busy ? "Хадгалж байна…" : "Хадгалах"}
        </button>
      </footer>
      {error ? (
        <p className="live-inline-error" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="live-inline-success" role="status">
          {success}
        </p>
      ) : null}
    </form>
  );
}

function EntrySummaryPage({
  summary,
  loading,
  error,
  branch,
  onBanChange,
  onCharacteristicsChange,
  onBack,
}: {
  summary: CustomerEntrySummary | null;
  loading: boolean;
  error?: string;
  branch: string;
  onBanChange: (
    customer: string,
    banned: boolean,
    reason: string,
  ) => Promise<void>;
  onCharacteristicsChange: (customer: string, value: string) => Promise<void>;
  onBack: () => void;
}) {
  const name = summary?.entry.customer_name || "Зочны мэдээлэл";
  return (
    <div className="live-entry-detail-page">
      <button className="live-entry-detail-back" type="button" onClick={onBack}>
        <ChevronLeft size={18} />
        Зочны жагсаалт руу буцах
      </button>
      <header className="live-entry-detail-hero">
        <span className="live-avatar live-avatar--large">
          {name.slice(0, 2)}
        </span>
        <div>
          <small>Зочны мэдээлэл</small>
          <h1 id="entry-summary-title">{name}</h1>
          {summary ? (
            <p>{summary.phone || visitLabel(summary.visit_count)}</p>
          ) : (
            <p>Мэдээллийг ачаалж байна…</p>
          )}
        </div>
        {summary ? (
          <b>{stateLabel(summary.membership_rank || "Unassigned")}</b>
        ) : null}
      </header>
      {loading ? <LoadingState label="Зочны мэдээллийг ачаалж байна…" /> : null}
      {error ? (
        <p className="live-inline-error" role="alert">
          {error}
        </p>
      ) : null}
      {summary ? (
        <>
          <section
            className="live-panel live-entry-detail-card"
            aria-labelledby="entry-visit-title"
          >
            <header>
              <div>
                <span>Энэ удаагийн нэвтрэлт</span>
                <h2 id="entry-visit-title">Угтахад хэрэгтэй мэдээлэл</h2>
              </div>
              <DoorOpen size={22} />
            </header>
            <div className="live-entry-summary-meta">
              <span>
                <Clock3 />
                <small>Нэвтэрсэн цаг</small>
                <strong>{formatDateTime(summary.entry.entered_at)}</strong>
              </span>
              <span>
                <ShieldCheck />
                <small>Хамгаалагч</small>
                <strong>{summary.entry.guard_name || "Мэдээлэлгүй"}</strong>
              </span>
              <span>
                <Users />
                <small>Ирэлтийн төлөв</small>
                <strong>
                  {visitLabel(
                    summary.entry.visit_number || summary.visit_count,
                  )}
                </strong>
              </span>
            </div>
          </section>
          <div className="live-entry-summary-metrics">
            <article>
              <Users />
              <span>
                <small>Нийт ирсэн</small>
                <strong>
                  {summary.visit_count > 0
                    ? `${summary.visit_count} удаа`
                    : "Мэдээлэлгүй"}
                </strong>
              </span>
            </article>
            <article>
              <ReceiptText />
              <span>
                <small>Дундаж баримт</small>
                <strong>
                  {summary.average_bill > 0
                    ? formatMoney(summary.average_bill)
                    : "Мэдээлэлгүй"}
                </strong>
              </span>
            </article>
            <article>
              <Gem />
              <span>
                <small>VIP зэрэглэл</small>
                <strong>
                  {stateLabel(summary.membership_rank || "Unassigned")}
                </strong>
              </span>
            </article>
          </div>
          <GuestCharacteristicsControl
            customer={summary.entry.customer}
            value={summary.service_characteristics ?? ""}
            onSave={onCharacteristicsChange}
          />
          <GuestBanControl
            customer={summary.entry.customer}
            customerName={summary.entry.customer_name}
            branch={branch}
            isBanned={Boolean(summary.is_banned)}
            currentReason={summary.ban_reason}
            notices={summary.branch_ban_notices}
            onSave={onBanChange}
          />
          <EntryBillHistory
            bills={
              summary.recent_bills ??
              (summary.latest_bill ? [summary.latest_bill] : [])
            }
          />
        </>
      ) : null}
    </div>
  );
}

function ReservationSummaryPage({
  summary,
  loading,
  error,
  branch,
  onBanChange,
  onCharacteristicsChange,
  onBack,
}: {
  summary: CustomerReservationSummary | null;
  loading: boolean;
  error?: string;
  branch: string;
  onBanChange: (
    customer: string,
    banned: boolean,
    reason: string,
  ) => Promise<void>;
  onCharacteristicsChange: (customer: string, value: string) => Promise<void>;
  onBack: () => void;
}) {
  const name = summary?.reservation.customer_name || "Зочны мэдээлэл";
  return (
    <div className="live-entry-detail-page">
      <button className="live-entry-detail-back" type="button" onClick={onBack}>
        <ChevronLeft size={18} />
        Зочны жагсаалт руу буцах
      </button>
      <header className="live-entry-detail-hero">
        <span className="live-avatar live-avatar--large">
          {name.slice(0, 2)}
        </span>
        <div>
          <small>Урьдчилсан захиалга</small>
          <h1 id="reservation-summary-title">{name}</h1>
          {summary ? (
            <p>{summary.phone || visitLabel(summary.visit_count)}</p>
          ) : (
            <p>Мэдээллийг ачаалж байна…</p>
          )}
        </div>
        {summary ? (
          <b>{stateLabel(summary.membership_rank || "Unassigned")}</b>
        ) : null}
      </header>
      {loading ? <LoadingState label="Зочны мэдээллийг ачаалж байна…" /> : null}
      {error ? (
        <p className="live-inline-error" role="alert">
          {error}
        </p>
      ) : null}
      {summary ? (
        <>
          {summary.is_banned ? (
            <p className="live-inline-error" role="alert">
              <ShieldAlert /> Нэвтрэх эрх хориглосон:{" "}
              {summary.ban_reason || "Шалтгаан оруулаагүй"}
            </p>
          ) : null}
          <section
            className="live-panel live-entry-detail-card"
            aria-labelledby="reservation-visit-title"
          >
            <header>
              <div>
                <span>Операторын бүртгэл</span>
                <h2 id="reservation-visit-title">Ирэх мэдээлэл</h2>
              </div>
              <CalendarClock size={22} />
            </header>
            <div className="live-entry-summary-meta">
              <span>
                <CalendarClock />
                <small>Ирэх цаг</small>
                <strong>
                  {formatDateTime(summary.reservation.expected_at)}
                </strong>
              </span>
              <span>
                <Users />
                <small>Зочны тоо</small>
                <strong>{summary.reservation.party_size} хүн</strong>
              </span>
              <span>
                <ClipboardCheck />
                <small>Төлөв</small>
                <strong>{stateLabel(summary.reservation.status)}</strong>
              </span>
            </div>
          </section>
          <div className="live-entry-summary-metrics">
            <article>
              <Users />
              <span>
                <small>Өмнөх ирэлт</small>
                <strong>
                  {summary.visit_count > 0
                    ? `${summary.visit_count} удаа`
                    : "Анхны ирэлт"}
                </strong>
              </span>
            </article>
            <article>
              <ReceiptText />
              <span>
                <small>Дундаж баримт</small>
                <strong>
                  {summary.average_bill > 0
                    ? formatMoney(summary.average_bill)
                    : "Мэдээлэлгүй"}
                </strong>
              </span>
            </article>
            <article>
              <Gem />
              <span>
                <small>VIP зэрэглэл</small>
                <strong>
                  {stateLabel(summary.membership_rank || "Unassigned")}
                </strong>
              </span>
            </article>
          </div>
          {summary.reservation.notes ? (
            <section className="live-reservation-note">
              <small>Операторын тэмдэглэл</small>
              <p>{summary.reservation.notes}</p>
            </section>
          ) : null}
          <GuestCharacteristicsControl
            customer={summary.reservation.customer}
            value={summary.service_characteristics ?? ""}
            onSave={onCharacteristicsChange}
          />
          <GuestBanControl
            customer={summary.reservation.customer}
            customerName={summary.reservation.customer_name}
            branch={branch}
            isBanned={Boolean(summary.is_banned)}
            currentReason={summary.ban_reason}
            notices={summary.branch_ban_notices}
            onSave={onBanChange}
          />
          <EntryBillHistory bills={summary.recent_bills ?? []} />
        </>
      ) : null}
    </div>
  );
}

function EntryView({
  api,
  initialTarget,
  onTargetHandled,
}: {
  api: FrappeManagementApi;
  initialTarget?: GuestDetailTarget | null;
  onTargetHandled?: () => void;
}) {
  const [feed, setFeed] = useState<CustomerEntryFeed | null>(null);
  const [summary, setSummary] = useState<CustomerEntrySummary | null>(null);
  const [reservationSummary, setReservationSummary] =
    useState<CustomerReservationSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [detailKind, setDetailKind] = useState<"entry" | "reservation" | null>(
    null,
  );
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const listScrollPosition = useRef(0);
  const load = useCallback(async () => {
    try {
      setFeed(await api.getEntryFeed(50));
      setError("");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Зочны нэвтрэлтийн мэдээлэл ачаалж чадсангүй.",
      );
    }
  }, [api]);
  useEffect(() => {
    void load();
    const disconnectRealtime = connectManagerRealtime({
      onGuestChanged: () => void load(),
      onReconnect: () => void load(),
    });
    const refresh = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", refresh);
    return () => {
      disconnectRealtime();
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);
  const handledTarget = useRef("");
  useEffect(() => {
    if (!initialTarget) return;
    const key = `${initialTarget.kind}:${initialTarget.name}`;
    if (handledTarget.current === key) return;
    handledTarget.current = key;
    if (initialTarget.kind === "entry") {
      setDetailKind("entry");
      setSummaryLoading(true);
      setSummary(null);
      setReservationSummary(null);
      setDetailError("");
      void api
        .getEntrySummary(initialTarget.name)
        .then(async (detail) => {
          setSummary(detail);
          if (initialTarget.acknowledge)
            await api.acknowledgeEntry(initialTarget.name);
          await load();
        })
        .catch((caught) =>
          setDetailError(
            caught instanceof Error
              ? caught.message
              : "Зочны мэдээлэл нээж чадсангүй.",
          ),
        )
        .finally(() => setSummaryLoading(false));
      return;
    }
    setDetailKind("reservation");
    setSummaryLoading(true);
    setReservationSummary(null);
    setSummary(null);
    setDetailError("");
    void api
      .getReservationSummary(initialTarget.name)
      .then(setReservationSummary)
      .catch((caught) =>
        setDetailError(
          caught instanceof Error
            ? caught.message
            : "Урьдчилсан захиалгын мэдээлэл нээж чадсангүй.",
        ),
      )
      .finally(() => setSummaryLoading(false));
  }, [api, initialTarget, load]);
  async function openEntry(entry: CustomerEntry) {
    listScrollPosition.current = window.scrollY;
    window.scrollTo({ top: 0, behavior: "smooth" });
    setDetailKind("entry");
    setSummaryLoading(true);
    setSummary(null);
    setReservationSummary(null);
    setDetailError("");
    try {
      const detail = await api.getEntrySummary(entry.name);
      setSummary(detail);
      if (!entry.manager_acknowledged) await api.acknowledgeEntry(entry.name);
      await load();
    } catch (caught) {
      setDetailError(
        caught instanceof Error
          ? caught.message
          : "Зочны мэдээлэл нээж чадсангүй.",
      );
    } finally {
      setSummaryLoading(false);
    }
  }
  async function openReservation(reservation: CustomerReservation) {
    listScrollPosition.current = window.scrollY;
    window.scrollTo({ top: 0, behavior: "smooth" });
    setDetailKind("reservation");
    setSummaryLoading(true);
    setReservationSummary(null);
    setSummary(null);
    setDetailError("");
    try {
      setReservationSummary(await api.getReservationSummary(reservation.name));
    } catch (caught) {
      setDetailError(
        caught instanceof Error
          ? caught.message
          : "Урьдчилсан захиалгын мэдээлэл нээж чадсангүй.",
      );
    } finally {
      setSummaryLoading(false);
    }
  }
  async function updateCustomerBan(
    customer: string,
    banned: boolean,
    reason: string,
  ) {
    await api.setCustomerBan(customer, banned, reason);
    if (detailKind === "entry" && summary?.entry.name)
      setSummary(await api.getEntrySummary(summary.entry.name));
    if (detailKind === "reservation" && reservationSummary?.reservation.name)
      setReservationSummary(
        await api.getReservationSummary(reservationSummary.reservation.name),
      );
    await load();
  }
  async function updateCustomerCharacteristics(
    customer: string,
    value: string,
  ) {
    await api.setCustomerServiceCharacteristics(customer, value);
    if (detailKind === "entry" && summary?.entry.name)
      setSummary(await api.getEntrySummary(summary.entry.name));
    if (detailKind === "reservation" && reservationSummary?.reservation.name)
      setReservationSummary(
        await api.getReservationSummary(reservationSummary.reservation.name),
      );
  }
  const shiftDate = feed?.work_date
    ? formatDate(feed.work_date, { month: "long", day: "numeric" })
    : "Өнөөдөр";
  const closeDetail = () => {
    const restorePosition = listScrollPosition.current;
    setSummary(null);
    setReservationSummary(null);
    setSummaryLoading(false);
    setDetailKind(null);
    setDetailError("");
    handledTarget.current = "";
    onTargetHandled?.();
    window.requestAnimationFrame(() =>
      window.scrollTo({ top: restorePosition, behavior: "auto" }),
    );
  };
  if (detailKind === "entry")
    return (
      <EntrySummaryPage
        summary={summary}
        loading={summaryLoading}
        error={!summaryLoading ? detailError : ""}
        branch={feed?.branch ?? ""}
        onBanChange={updateCustomerBan}
        onCharacteristicsChange={updateCustomerCharacteristics}
        onBack={closeDetail}
      />
    );
  if (detailKind === "reservation")
    return (
      <ReservationSummaryPage
        summary={reservationSummary}
        loading={summaryLoading}
        error={!summaryLoading ? detailError : ""}
        branch={feed?.branch ?? ""}
        onBanChange={updateCustomerBan}
        onCharacteristicsChange={updateCustomerCharacteristics}
        onBack={closeDetail}
      />
    );
  return (
    <>
      <PageHeading
        eyebrow={
          feed
            ? `${feed.branch} салбар · ${shiftDate}-ны ээлж`
            : "Үүдний мэдээлэл"
        }
        title="Өнөөдрийн зочид"
        description="Энэ ээлжийн нэвтрэлт ба урьдчилсан захиалга."
        action={
          <button type="button" onClick={() => void load()}>
            <RefreshCw size={16} />
            Шинэчлэх
          </button>
        }
      />
      {error && !feed ? <ErrorState message={error} retry={load} /> : null}
      {feed ? (
        <>
          <section className="live-metrics live-entry-metrics">
            <Metric
              icon={DoorOpen}
              label="Нэвтэрсэн зочин"
              value={feed.today_total}
              hint="Энэ ээлж"
            />
            <Metric
              icon={Users}
              label="Анхны ирэлт"
              value={feed.today_new}
              hint="Шинэ зочин"
              tone="violet"
            />
            <Metric
              icon={Bell}
              label="Уншаагүй"
              value={feed.unread}
              hint="Менежер харах шаардлагатай"
              tone={feed.unread ? "amber" : "green"}
            />
            <Metric
              icon={CalendarDays}
              label="Захиалга"
              value={feed.pending_reservations}
              hint="Операторын бүртгэл"
            />
          </section>
          {feed.reservations.length ? (
            <section className="live-panel live-reservation-list">
              <header>
                <div>
                  <span>Операторын бүртгэл</span>
                  <h2>Урьдчилсан захиалга</h2>
                </div>
                <b>{feed.reservations.length}</b>
              </header>
              <div>
                {feed.reservations.map((reservation) => (
                  <article key={reservation.name}>
                    <span>
                      <CalendarClock />
                      <small>Ирэх цаг</small>
                      <strong>{formatTime(reservation.expected_at)}</strong>
                    </span>
                    <span>
                      <Users />
                      <small>Зочин</small>
                      <strong>{reservation.customer_name}</strong>
                      <em>{reservation.party_size} хүн</em>
                    </span>
                    <button
                      type="button"
                      onClick={() => void openReservation(reservation)}
                    >
                      Зочны товч
                    </button>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
          <section className="live-panel live-entry-list">
            <header>
              <div>
                <span>Энэ ээлжийн нэвтрэлт</span>
                <h2>{shiftDate}</h2>
              </div>
              <b>{feed.entries.length} зочин</b>
            </header>
            <div className="live-entry-table">
              <div className="head">
                <span>Нэвтэрсэн цаг</span>
                <span>Зочин</span>
                <span>Зэрэглэл</span>
                <span>Ирэлт</span>
                <span>Үйлдэл</span>
              </div>
              {feed.entries.map((entry) => (
                <article
                  className={entry.manager_acknowledged ? "" : "unread"}
                  key={entry.name}
                >
                  <span>{formatTime(entry.entered_at)}</span>
                  <span>
                    <strong>{entry.customer_name}</strong>
                    <small>{entry.guard_name}</small>
                  </span>
                  <span>
                    {stateLabel(entry.membership_rank || "Unassigned")}
                  </span>
                  <span>{visitLabel(entry.visit_number)}</span>
                  <span>
                    <button type="button" onClick={() => void openEntry(entry)}>
                      Зочны товч
                    </button>
                  </span>
                </article>
              ))}
            </div>
            {!feed.entries.length ? (
              <p className="live-empty">Энэ ээлжийн зочин хараахан алга.</p>
            ) : null}
          </section>
        </>
      ) : !error ? (
        <LoadingState label="Зочны нэвтрэлтийг ачаалж байна…" />
      ) : null}
    </>
  );
}

const managerNotReadyReasons = [
  "Хувцаслалт/бүрдэл хангалтгүй",
  "Гоо сайхан, цэвэр байдал хангалтгүй",
  "Ажлын бэлтгэл хангалтгүй",
  "Бусад",
] as const;

function orderReadinessQueue(
  rows: ReadinessQueueRow[],
  lastCompletedAssignment = "",
) {
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const priority = (row: ReadinessQueueRow) =>
        row.readiness_status === "PENDING"
          ? row.attendance.checked_in
            ? 0
            : 1
          : 2;
      const priorityDifference = priority(a.row) - priority(b.row);
      if (priorityDifference) return priorityDifference;
      if (priority(a.row) === 2) {
        const aIsLatest = a.row.shift_assignment === lastCompletedAssignment;
        const bIsLatest = b.row.shift_assignment === lastCompletedAssignment;
        if (aIsLatest !== bIsLatest) return aIsLatest ? 1 : -1;
        const aCheckedAt = String(
          a.row.readiness_checked_at || a.row.readiness_modified || "",
        );
        const bCheckedAt = String(
          b.row.readiness_checked_at || b.row.readiness_modified || "",
        );
        if (aCheckedAt && bCheckedAt && aCheckedAt !== bCheckedAt)
          return aCheckedAt.localeCompare(bCheckedAt);
      }
      return a.index - b.index;
    })
    .map(({ row }) => row);
}

function ManagerReadinessView({
  api,
  initialData,
  onRefresh,
}: {
  api: FrappeManagementApi;
  initialData: ReadinessQueueData;
  onRefresh: () => Promise<void>;
}) {
  const [data, setData] = useState(initialData);
  const [filter, setFilter] = useState<
    "All" | "Pending" | "Ready" | "Not_Ready"
  >("All");
  const [selected, setSelected] = useState<ReadinessQueueRow | null>(null);
  const [reasonChoice, setReasonChoice] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [lastCompletedAssignment, setLastCompletedAssignment] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const orderedQueue = useMemo(
    () => orderReadinessQueue(data.queue, lastCompletedAssignment),
    [data.queue, lastCompletedAssignment],
  );

  const load = useCallback(
    async (nextFilter = filter) => {
      setLoading(true);
      setError("");
      try {
        setData(await api.getReadinessQueue(nextFilter));
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Бэлэн байдлын мэдээлэл ачаалсангүй.",
        );
      } finally {
        setLoading(false);
      }
    },
    [api, filter],
  );

  useEffect(() => {
    void load(filter);
  }, [filter, load]);

  useEffect(
    () =>
      connectManagerRealtime({
        onReadinessChanged: () => void load(filter),
        onReconnect: () => void load(filter),
      }),
    [filter, load],
  );

  useEffect(() => {
    if (!lastCompletedAssignment) return;
    const frame = window.requestAnimationFrame(() => {
      const nextRow =
        listRef.current?.querySelector<HTMLElement>(
          '[data-readiness-actionable="true"]',
        ) ??
        listRef.current?.querySelector<HTMLElement>(
          '[data-readiness-pending="true"]',
        );
      if (!nextRow) return;
      nextRow.scrollIntoView({ behavior: "smooth", block: "center" });
      nextRow
        .querySelector<HTMLButtonElement>("button:not(:disabled)")
        ?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [data.queue, lastCompletedAssignment]);

  const save = async (
    row: ReadinessQueueRow,
    result: "READY" | "NOT_READY",
    note = "",
  ) => {
    if (!data.access.can_submit || savingAssignment) return;
    setSavingAssignment(row.shift_assignment);
    setError("");
    setMessage("");
    try {
      await api.submitReadiness(
        {
          entertainer: row.entertainer,
          shift_assignment: row.shift_assignment,
          result,
          reason: note,
          employee_checkin: row.attendance.employee_checkin,
        },
        idempotencyKey("manager-readiness-fallback"),
      );
      setSelected(null);
      setReasonChoice("");
      setReason("");
      setMessage(
        `${row.stage_name || row.entertainer}: ${result === "READY" ? "бэлэн" : "бэлэн бус"} гэж хадгаллаа.`,
      );
      await Promise.all([load(filter), onRefresh()]);
      setLastCompletedAssignment(row.shift_assignment);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Шалгалтын үр дүнг хадгалж чадсангүй.",
      );
    } finally {
      setSavingAssignment("");
    }
  };

  const submitNotReady = async () => {
    if (!selected || !reasonChoice || reason.trim().length < 3) return;
    const note =
      reasonChoice === "Бусад"
        ? reason.trim()
        : `${reasonChoice}: ${reason.trim()}`;
    await save(selected, "NOT_READY", note);
  };

  const checked = data.summary.total - data.summary.pending;
  return (
    <>
      <PageHeading
        eyebrow={`${data.branch} салбар · ${formatDate(data.work_date)}`}
        title="Бэлэн байдлын шалгалт"
        description="QR ирцтэй бүжигчний ажилд бэлэн байдлыг нэг удаа батална."
      />

      <section
        className={`manager-readiness-access ${data.access.can_submit ? "is-active" : ""}`}
        role="status"
      >
        <ShieldCheck size={21} />
        <div>
          <strong>
            {data.access.can_submit
              ? "Менежерийн орлох эрх нээлттэй"
              : "Ахлах бүжигчин шалгалт хариуцаж байна"}
          </strong>
          <span>{data.access.message}</span>
        </div>
        <b>{data.access.can_submit ? "Шалгах эрхтэй" : "Зөвхөн харах"}</b>
      </section>

      <section className="manager-readiness-summary" aria-label="Шалгалтын явц">
        <button
          type="button"
          aria-pressed={filter === "All"}
          data-active={filter === "All"}
          onClick={() => setFilter("All")}
        >
          <span>Нийт ээлж</span>
          <strong>{data.summary.total}</strong>
        </button>
        <button
          type="button"
          aria-pressed={filter === "Pending"}
          data-active={filter === "Pending"}
          data-tone={data.summary.pending ? "attention" : "healthy"}
          onClick={() => setFilter("Pending")}
        >
          <span>Шалгаагүй</span>
          <strong>{data.summary.pending}</strong>
        </button>
        <button
          type="button"
          aria-pressed={filter === "Ready"}
          data-active={filter === "Ready"}
          data-tone="healthy"
          onClick={() => setFilter("Ready")}
        >
          <span>Бэлэн</span>
          <strong>{data.summary.ready}</strong>
        </button>
        <button
          type="button"
          aria-pressed={filter === "Not_Ready"}
          data-active={filter === "Not_Ready"}
          data-tone={data.summary.not_ready ? "danger" : "neutral"}
          onClick={() => setFilter("Not_Ready")}
        >
          <span>Бэлэн бус</span>
          <strong>{data.summary.not_ready}</strong>
        </button>
        <footer>
          <span>
            {checked}/{data.summary.total || 0} шалгасан
          </span>
          <div className="live-progress">
            <span
              style={{
                width: `${data.summary.total ? Math.round((checked / data.summary.total) * 100) : 0}%`,
              }}
            />
          </div>
        </footer>
      </section>

      <section className="live-panel manager-readiness-panel">
        <header>
          <div>
            <span>Өнөөдрийн жагсаалт</span>
            <h2>Бүжигчид</h2>
          </div>
        </header>
        {message ? (
          <p className="manager-readiness-message success" role="status">
            <CheckCircle2 size={17} />
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="manager-readiness-message error" role="alert">
            <AlertTriangle size={17} />
            {error}
          </p>
        ) : null}
        <div
          className="manager-readiness-list"
          aria-busy={loading}
          ref={listRef}
        >
          {orderedQueue.map((row) => (
            <article
              key={row.shift_assignment}
              data-readiness-pending={
                row.readiness_status === "PENDING" ? "true" : undefined
              }
              data-readiness-actionable={
                row.readiness_status === "PENDING" && row.attendance.checked_in
                  ? "true"
                  : undefined
              }
            >
              <span className="live-avatar">
                {(row.stage_name || row.entertainer).slice(0, 2)}
              </span>
              <div className="person">
                <strong>{row.stage_name || row.entertainer}</strong>
                <small>{row.shift_type}</small>
              </div>
              <div className="state">
                <small>QR ирц</small>
                <strong
                  data-tone={row.attendance.checked_in ? "healthy" : "muted"}
                >
                  {row.attendance.checked_in
                    ? row.attendance.checked_in_at
                      ? formatTime(row.attendance.checked_in_at)
                      : "Бүртгэгдсэн"
                    : "Хүлээгдэж байна"}
                </strong>
              </div>
              <div className="state">
                <small>Бэлэн байдал</small>
                <strong
                  data-tone={
                    row.readiness_status === "READY"
                      ? "healthy"
                      : row.readiness_status === "NOT_READY"
                        ? "danger"
                        : "attention"
                  }
                >
                  {row.readiness_status === "READY"
                    ? "Бэлэн"
                    : row.readiness_status === "NOT_READY"
                      ? "Бэлэн бус"
                      : "Шалгаагүй"}
                </strong>
              </div>
              <div className="actions">
                {row.readiness_status !== "PENDING" ? (
                  <span className="complete">
                    <CheckCircle2 size={16} />
                    {row.readiness_supervisor ? "Шалгасан" : "Бүртгэгдсэн"}
                  </span>
                ) : !row.attendance.checked_in ? (
                  <span className="waiting">QR ирц хүлээж байна</span>
                ) : data.access.can_submit ? (
                  <>
                    <button
                      type="button"
                      className="ready"
                      disabled={Boolean(savingAssignment)}
                      onClick={() => void save(row, "READY")}
                    >
                      <CheckCircle2 size={18} />
                      Бэлэн
                    </button>
                    <button
                      type="button"
                      className="not-ready"
                      disabled={Boolean(savingAssignment)}
                      onClick={() => {
                        setSelected(row);
                        setReasonChoice("");
                        setReason("");
                        setError("");
                      }}
                    >
                      <XCircle size={18} />
                      Бэлэн бус
                    </button>
                  </>
                ) : (
                  <span className="waiting">Ахлах шалгана</span>
                )}
              </div>
            </article>
          ))}
          {!orderedQueue.length ? (
            <p className="live-empty">Сонгосон төлөвт бүжигчин алга.</p>
          ) : null}
        </div>
      </section>

      {selected ? (
        <div
          className="manager-readiness-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !savingAssignment)
              setSelected(null);
          }}
        >
          <section
            className="manager-readiness-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manager-readiness-dialog-title"
          >
            <header>
              <div>
                <span>Бэлэн бус шалтгаан</span>
                <h2 id="manager-readiness-dialog-title">
                  {selected.stage_name || selected.entertainer}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Хаах"
                onClick={() => setSelected(null)}
                disabled={Boolean(savingAssignment)}
              >
                <X />
              </button>
            </header>
            <fieldset>
              <legend>Шалтгааны төрөл</legend>
              <div>
                {managerNotReadyReasons.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={reasonChoice === option ? "active" : ""}
                    aria-pressed={reasonChoice === option}
                    onClick={() => setReasonChoice(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </fieldset>
            <label>
              <span>Тайлбар</span>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={300}
                placeholder="Юуг засах шаардлагатайг богино бичнэ үү"
              />
            </label>
            {error ? (
              <p className="manager-readiness-dialog-error" role="alert">
                <AlertTriangle size={16} />
                {error}
              </p>
            ) : null}
            <footer>
              <button
                type="button"
                className="live-button"
                onClick={() => setSelected(null)}
                disabled={Boolean(savingAssignment)}
              >
                Болих
              </button>
              <button
                type="button"
                className="manager-not-ready-submit"
                onClick={() => void submitNotReady()}
                disabled={
                  Boolean(savingAssignment) ||
                  !reasonChoice ||
                  reason.trim().length < 3
                }
              >
                {savingAssignment ? (
                  <LoaderCircle className="live-spin" size={17} />
                ) : (
                  <XCircle size={17} />
                )}
                Бэлэн бус гэж хадгалах
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}

function ManagerDailyRoundsView({
  api,
  initialData,
}: {
  api: FrappeManagementApi;
  initialData: DailyRoundsData;
}) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await api.getDailyRounds());
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Өдрийн гарааны мэдээлэл ачаалсангүй.",
      );
    } finally {
      setLoading(false);
    }
  }, [api]);

  const addRound = async (entertainer: string, displayName: string) => {
    if (saving) return;
    setSaving(entertainer);
    setError("");
    setMessage("");
    try {
      const next = await api.recordDailyRound(
        entertainer,
        data.work_date,
        idempotencyKey("manager-stage-round"),
      );
      setData(next);
      const person = next.people.find((row) => row.entertainer === entertainer);
      setMessage(
        `${displayName}: ${person?.rounds ?? 0}/${next.target} гараа бүртгэлээ.`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Гарааг хадгалж чадсангүй.",
      );
    } finally {
      setSaving("");
    }
  };

  return (
    <>
      <PageHeading
        eyebrow={`${data.branch} салбар · ${formatDate(data.work_date)}`}
        title="Өдрийн гараа"
        description="Өнөөдөр QR ирцтэй бүжигчид."
        action={
          <button
            className="live-button"
            type="button"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw className={loading ? "live-spin" : ""} size={17} />
            Шинэчлэх
          </button>
        }
      />
      {message ? (
        <p className="manager-rounds-message success" role="status">
          <CheckCircle2 size={17} />
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="manager-rounds-message error" role="alert">
          <AlertTriangle size={17} />
          {error}
        </p>
      ) : null}
      <section className="live-panel manager-rounds-panel">
        <header>
          <div>
            <span>Өнөөдрийн ирц</span>
            <h2>Ирсэн бүжигчид</h2>
          </div>
          <b>{data.people.length} хүн</b>
        </header>
        <div className="manager-rounds-list" aria-busy={Boolean(saving)}>
          {data.people.map((person) => (
            <article
              key={person.entertainer}
              className={person.completed ? "complete" : ""}
            >
              <i className="live-avatar">{person.display_name.slice(0, 2)}</i>
              <div className="person">
                <strong>{person.display_name}</strong>
                <small>
                  {formatTime(person.checked_in_at)} ирсэн
                  {person.rounds ? ` · ${person.rounds}/${person.target}` : ""}
                </small>
              </div>
              <button
                type="button"
                disabled={person.completed || Boolean(saving)}
                onClick={() =>
                  void addRound(person.entertainer, person.display_name)
                }
              >
                {saving === person.entertainer ? (
                  <LoaderCircle className="live-spin" size={18} />
                ) : (
                  <CheckCircle2 size={18} />
                )}
                {person.completed ? "Дууссан" : "Гарсан"}
              </button>
            </article>
          ))}
          {!data.people.length ? (
            <p className="live-empty">Одоогоор QR ирцтэй бүжигчин алга.</p>
          ) : null}
        </div>
      </section>
    </>
  );
}

function NotificationCenter({
  api,
  onOpenLeave,
  onOpenPenalty,
  onOpenGuest,
  onBadgeChange,
}: {
  api: FrappeManagementApi;
  onOpenLeave: () => void;
  onOpenPenalty: () => void;
  onOpenGuest: (target: GuestDetailTarget) => void;
  onBadgeChange: (counts: { guests: number; readiness?: number }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [feed, setFeed] = useState<CustomerEntryFeed | null>(null);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [penalties, setPenalties] = useState<PenaltyRow[]>([]);
  const [error, setError] = useState("");
  const seenEntries = useRef<Set<string> | null>(null);
  const seenLeaves = useRef<Set<string> | null>(null);
  const seenPenalties = useRef<Set<string> | null>(null);
  const seenReservations = useRef<Set<string> | null>(null);
  const load = useCallback(async () => {
    try {
      const [nextFeed, leaveResult, penaltyResult, readinessResult] = await Promise.all([
        api.getEntryFeed(100),
        api.getLeaveRequests("Pending"),
        api.getPenalties("Pending Review"),
        api.getReadinessQueue("Pending").catch(() => null),
      ]);
      const nextLeaves = leaveResult.requests;
      const nextPenalties = penaltyResult.penalties;
      if (
        seenEntries.current &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        nextFeed.entries
          .filter((item) => !seenEntries.current?.has(item.name))
          .forEach((item) => {
            const notice = new Notification("Зочин нэвтэрлээ", {
              body: `${item.customer_name} · ${stateLabel(item.membership_rank || "Unassigned")} · ${visitLabel(item.visit_number)}`,
            });
            notice.onclick = () => {
              window.focus();
              setOpen(false);
              onOpenGuest({
                kind: "entry",
                name: item.name,
                acknowledge: !item.manager_acknowledged,
              });
            };
          });
      }
      if (
        seenLeaves.current &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        nextLeaves
          .filter(
            (item) =>
              !seenLeaves.current?.has(`${item.source_type}:${item.name}`),
          )
          .forEach((item) => {
            const notice = new Notification("Чөлөөний хүсэлт ирлээ", {
              body: `${item.display_name} · ${leavePeriodLabel(item)}`,
            });
            notice.onclick = () => {
              window.focus();
              onOpenLeave();
            };
          });
      }
      if (
        seenPenalties.current &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        nextPenalties
          .filter((item) => !seenPenalties.current?.has(item.name))
          .forEach((item) => {
            const notice = new Notification("Хоцролтын мэдэгдэл", {
              body: `${item.display_name} · ${item.late_minutes || 0} минут · Менежер цуцлах боломжтой`,
            });
            notice.onclick = () => {
              window.focus();
              setOpen(false);
              onOpenPenalty();
            };
          });
      }
      if (
        seenReservations.current &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        nextFeed.reservations
          .filter((item) => !seenReservations.current?.has(item.name))
          .forEach((item) => {
            const notice = new Notification("Урьдчилсан захиалга ирлээ", {
              body: `${item.customer_name} · ${item.party_size} хүн · ${formatDateTime(item.expected_at)}`,
            });
            notice.onclick = () => {
              window.focus();
              setOpen(false);
              onOpenGuest({ kind: "reservation", name: item.name });
            };
          });
      }
      seenEntries.current = new Set(nextFeed.entries.map((item) => item.name));
      seenLeaves.current = new Set(
        nextLeaves.map((item) => `${item.source_type}:${item.name}`),
      );
      seenPenalties.current = new Set(nextPenalties.map((item) => item.name));
      seenReservations.current = new Set(
        nextFeed.reservations.map((item) => item.name),
      );
      setFeed(nextFeed);
      setLeaves(nextLeaves);
      setPenalties(nextPenalties);
      onBadgeChange({
        guests: Math.max(0, Number(nextFeed.unread) || 0),
        readiness: readinessResult
          ? readinessResult.queue.filter(
              (item) =>
                item.readiness_status === "PENDING" && item.attendance.checked_in,
            ).length
          : undefined,
      });
      setError("");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Мэдэгдэл шинэчилж чадсангүй.",
      );
    }
  }, [api, onBadgeChange, onOpenGuest, onOpenLeave, onOpenPenalty]);
  useEffect(() => {
    void load();
    const disconnectRealtime = connectManagerRealtime({
      onGuestChanged: () => void load(),
      onReadinessChanged: () => void load(),
      onReconnect: () => void load(),
    });
    const refresh = () => {
      if (document.visibilityState === "visible") void load();
    };
    const refreshOnline = () => void load();
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refreshOnline);
    return () => {
      disconnectRealtime();
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("online", refreshOnline);
    };
  }, [load]);
  async function toggle() {
    setOpen((value) => !value);
    if ("Notification" in window && Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch {
        /* The in-app list remains available. */
      }
    }
  }
  const unread =
    (feed?.unread ?? 0) +
    leaves.length +
    penalties.length +
    (feed?.pending_reservations ?? 0);
  return (
    <div className="live-notification-center">
      <button
        className="live-notification-trigger"
        type="button"
        aria-label={`Мэдэгдэл${unread ? `, ${unread} уншаагүй` : ""}`}
        aria-expanded={open}
        onClick={() => void toggle()}
      >
        <Bell size={18} />
        {unread ? <b>{unread > 99 ? "99+" : unread}</b> : null}
      </button>
      {open ? (
        <aside
          className="live-notification-panel"
          aria-label="Менежерийн мэдэгдэл"
        >
          <header>
            <div>
              <span>Шийдвэр ба зочин</span>
              <h2>Мэдэгдэл</h2>
            </div>
            <button
              type="button"
              aria-label="Мэдэгдэл хаах"
              onClick={() => setOpen(false)}
            >
              <X size={18} />
            </button>
          </header>
          {error ? (
            <p className="live-inline-error" role="alert">
              {error}
            </p>
          ) : null}
          <section>
            <h3>
              Чөлөөний хүсэлт <b>{leaves.length}</b>
            </h3>
            {leaves.slice(0, 5).map((item) => (
              <button
                key={`${item.source_type}:${item.name}`}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onOpenLeave();
                }}
              >
                <ClipboardCheck size={18} />
                <span>
                  <strong>{item.display_name}</strong>
                  <small>
                    {leavePeriodLabel(item)} · {item.reason}
                  </small>
                </span>
                <ChevronRight size={16} />
              </button>
            ))}
            {!leaves.length ? <p>Шийдвэр хүлээсэн хүсэлт алга.</p> : null}
          </section>
          <section>
            <h3>
              Хоцролтын мэдэгдэл <b>{penalties.length}</b>
            </h3>
            {penalties.slice(0, 5).map((item) => (
              <button
                key={item.name}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onOpenPenalty();
                }}
              >
                <Clock3 size={18} />
                <span>
                  <strong>{item.display_name}</strong>
                  <small>
                    {item.late_minutes || 0} минут · Цуцлах боломжтой
                  </small>
                </span>
                <ChevronRight size={16} />
              </button>
            ))}
            {!penalties.length ? <p>Хяналт хүлээсэн хоцролт алга.</p> : null}
          </section>
          <section>
            <h3>
              Урьдчилсан захиалга <b>{feed?.pending_reservations ?? 0}</b>
            </h3>
            {feed?.reservations.slice(0, 5).map((item) => (
              <button
                key={item.name}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onOpenGuest({ kind: "reservation", name: item.name });
                }}
              >
                <CalendarClock size={18} />
                <span>
                  <strong>{item.customer_name}</strong>
                  <small>
                    {formatDateTime(item.expected_at)} · {item.party_size} хүн
                  </small>
                </span>
                <ChevronRight size={16} />
              </button>
            ))}
            {!feed?.pending_reservations ? (
              <p>Хүлээгдэж буй захиалга алга.</p>
            ) : null}
          </section>
          <section>
            <h3>
              Зочны нэвтрэлт <b>{feed?.unread ?? 0}</b>
            </h3>
            {feed?.entries
              .filter((item) => !item.manager_acknowledged)
              .slice(0, 5)
              .map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onOpenGuest({
                      kind: "entry",
                      name: item.name,
                      acknowledge: true,
                    });
                  }}
                >
                  <DoorOpen size={18} />
                  <span>
                    <strong>{item.customer_name}</strong>
                    <small>
                      {stateLabel(item.membership_rank || "Unassigned")} ·{" "}
                      {visitLabel(item.visit_number)}
                    </small>
                  </span>
                  <ChevronRight size={16} />
                </button>
              ))}
            {!feed?.unread ? <p>Уншаагүй зочны мэдээлэл алга.</p> : null}
          </section>
        </aside>
      ) : null}
    </div>
  );
}

function LeaveView({
  api,
  requests,
  onRefresh,
}: {
  api: FrappeManagementApi;
  requests: LeaveRequest[];
  onRefresh: () => Promise<void>;
}) {
  const [status, setStatus] = useState("All");
  const [busy, setBusy] = useState("");
  const [reviewing, setReviewing] = useState<{
    item: LeaveRequest;
    decision: "Approved" | "Rejected";
  } | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const requestKeys = useRef(new Map<string, string>());
  const filtered = requests.filter(
    (item) => status === "All" || item.status === status,
  );
  function startReview(item: LeaveRequest, decision: "Approved" | "Rejected") {
    setReviewing({ item, decision });
    setReason("");
    setError("");
    setSuccess("");
  }
  async function decide() {
    if (!reviewing) return;
    const { item, decision } = reviewing;
    const cleanReason = reason.trim();
    if (decision === "Rejected" && cleanReason.length < 3) return;
    const fingerprint = `${item.source_type || "Emergency Leave"}|${item.name}|${item.modified}|${decision}|${cleanReason}`;
    let key = requestKeys.current.get(fingerprint);
    if (!key) {
      key = idempotencyKey("manager-leave-decision");
      requestKeys.current.set(fingerprint, key);
    }
    setBusy(item.name);
    setError("");
    try {
      await api.decideLeave(
        item.name,
        decision,
        cleanReason,
        item.modified,
        item.source_type,
        key,
      );
      requestKeys.current.delete(fingerprint);
      setReviewing(null);
      setReason("");
      setSuccess(
        decision === "Approved"
          ? "Чөлөөний хүсэлтийг зөвшөөрлөө."
          : "Чөлөөний хүсэлтийг татгалзлаа.",
      );
      await onRefresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Чөлөөний шийдвэр хадгалж чадсангүй.",
      );
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="Ирц ба хүний нөөц"
        title="Чөлөөний хүсэлт"
        description="Цагийн чөлөө сард 3 удаа, 00:00 хүртэл хүчинтэй. Үүнээс хойш ирвэл таслалтад тооцно."
        action={
          <select
            className="live-select"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="All">Бүх төлөв</option>
            <option value="Pending">Шийдвэр хүлээж буй</option>
            <option value="Approved">Зөвшөөрсөн</option>
            <option value="Rejected">Татгалзсан</option>
          </select>
        }
      />
      {success ? (
        <p className="live-inline-success live-page-message" role="status">
          {success}
        </p>
      ) : null}
      <section className="live-card-grid">
        {filtered.map((item) => (
          <article
            className="live-request-card live-leave-card"
            key={`${item.source_type ?? "Emergency Leave"}:${item.name}`}
          >
            <header>
              <span className="live-avatar">
                {item.display_name.slice(0, 2)}
              </span>
              <div>
                <h2>{item.display_name}</h2>
                <p>{item.employee || item.entertainer}</p>
              </div>
              <b data-state={item.status}>{stateLabel(item.status)}</b>
            </header>
            <dl>
              <div>
                <dt>Хүссэн хугацаа</dt>
                <dd>{leavePeriodLabel(item)}</dd>
              </div>
              <div>
                <dt>Чөлөөний төрөл</dt>
                <dd>
                  {item.source_type === "Leave Application"
                    ? `Төлөвлөсөн чөлөө${item.leave_type ? ` · ${item.leave_type}` : ""}`
                    : "Цагийн чөлөө · 00:00 хүртэл"}
                </dd>
              </div>
              <div>
                <dt>Хүсэлт илгээсэн</dt>
                <dd>{formatDateTime(item.requested_at)}</dd>
              </div>
              <div>
                <dt>Салбар</dt>
                <dd>{item.branch}</dd>
              </div>
            </dl>
            <div className="live-leave-reason">
              <small>Ажилтны тайлбар</small>
              <p>{item.reason || "Тайлбар оруулаагүй"}</p>
            </div>
            {item.decision_reason ? (
              <p className="live-decision-note">
                <strong>Шийдвэрийн тайлбар:</strong> {item.decision_reason}
              </p>
            ) : null}
            {item.status === "Pending" ? (
              <footer>
                <button
                  disabled={busy === item.name}
                  type="button"
                  onClick={() => startReview(item, "Rejected")}
                >
                  Татгалзах
                </button>
                <button
                  className="live-button--primary"
                  disabled={busy === item.name}
                  type="button"
                  onClick={() => startReview(item, "Approved")}
                >
                  Зөвшөөрөх
                </button>
              </footer>
            ) : null}
          </article>
        ))}
        {!filtered.length ? (
          <p className="live-empty live-empty--card">
            Сонгосон төлөвт чөлөөний хүсэлт алга.
          </p>
        ) : null}
      </section>
      {reviewing ? (
        <div
          className="live-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-decision-title"
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void decide();
            }}
          >
            <header>
              <div>
                <span>
                  {reviewing.decision === "Approved"
                    ? "Хүсэлт зөвшөөрөх"
                    : "Хүсэлт татгалзах"}
                </span>
                <h2 id="leave-decision-title">{reviewing.item.display_name}</h2>
              </div>
              <button
                type="button"
                aria-label="Хаах"
                onClick={() => setReviewing(null)}
              >
                <X />
              </button>
            </header>
            <dl className="live-decision-summary">
              <div>
                <dt>Хугацаа</dt>
                <dd>{leavePeriodLabel(reviewing.item)}</dd>
              </div>
              <div>
                <dt>Төрөл</dt>
                <dd>
                  {reviewing.item.source_type === "Leave Application"
                    ? "Төлөвлөсөн чөлөө"
                    : "Цагийн чөлөө · 00:00 хүртэл"}
                </dd>
              </div>
            </dl>
            <div className="live-leave-reason">
              <small>Ажилтны тайлбар</small>
              <p>{reviewing.item.reason || "Тайлбар оруулаагүй"}</p>
            </div>
            <label>
              <span>
                {reviewing.decision === "Rejected"
                  ? "Татгалзсан шалтгаан"
                  : "Менежерийн тайлбар (заавал биш)"}
              </span>
              <textarea
                autoFocus
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={
                  reviewing.decision === "Rejected"
                    ? "Ажилтанд ойлгомжтой шалтгаан бичнэ үү"
                    : "Шаардлагатай бол тайлбар үлдээнэ үү"
                }
              />
            </label>
            {error ? (
              <p className="live-inline-error" role="alert">
                {error}
              </p>
            ) : null}
            <footer>
              <button type="button" onClick={() => setReviewing(null)}>
                Цуцлах
              </button>
              <button
                className={
                  reviewing.decision === "Rejected"
                    ? "live-button--danger"
                    : "live-button--primary"
                }
                disabled={
                  Boolean(busy) ||
                  (reviewing.decision === "Rejected" &&
                    reason.trim().length < 3)
                }
                type="submit"
              >
                {busy
                  ? "Хадгалж байна…"
                  : reviewing.decision === "Approved"
                    ? "Зөвшөөрөх"
                    : "Татгалзах"}
              </button>
            </footer>
          </form>
        </div>
      ) : null}
    </>
  );
}

function PenaltiesView({
  api,
  penalties,
  canDecide,
  branch,
  onRefresh,
}: {
  api: FrappeManagementApi;
  penalties: PenaltyRow[];
  canDecide: boolean;
  branch?: string;
  onRefresh?: () => Promise<void>;
}) {
  const [status, setStatus] = useState("All");
  const [busy, setBusy] = useState("");
  const filtered = penalties.filter(
    (item) => status === "All" || item.status === status,
  );
  async function decide(
    item: PenaltyRow,
    decision: "Approved" | "Rejected" | "Reversed",
  ) {
    const reason =
      decision === "Approved"
        ? "Менежер хоцролтын торгуулийг хэвээр үлдээв."
        : window.prompt(
            decision === "Reversed"
              ? "Буцаалтын шалтгааныг бичнэ үү:"
              : "Цуцалсан шалтгааныг 5-аас дээш тэмдэгтээр бичнэ үү:",
          );
    if (
      !reason?.trim() ||
      (decision !== "Reversed" && reason.trim().length < 5)
    )
      return;
    setBusy(item.name);
    try {
      if (decision === "Reversed")
        await api.reversePenalty(item.name, reason, item.modified);
      else await api.decidePenalty(item.name, decision, reason, item.modified);
      await onRefresh?.();
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <PageHeading
        eyebrow={branch ? `${branch} салбар` : "Компанийн ирцийн хяналт"}
        title="Хоцролт, таслалт ба торгуулийн хяналт"
        description={
          canDecide
            ? "10 минут хүртэлх хоцролтыг цуцлах боломжтой. 10 минутаас дээш хоцролт автоматаар баталгаажна."
            : "Салбарын торгуулийн нотолгоо ба менежерийн шийдвэрийн төлөвийг хянана."
        }
        action={
          <select
            className="live-select"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="All">Бүх төлөв</option>
            <option value="Pending Review">Хяналт хүлээж буй</option>
            <option value="Approved">Зөвшөөрсөн</option>
            <option value="Rejected">Татгалзсан</option>
            <option value="Reversed">Буцаасан</option>
          </select>
        }
      />
      <section className="live-policy-note">
        <ShieldAlert size={19} />
        <div>
          <strong>10 минутын хяналтын дүрэм</strong>
          <span>
            10 минут хүртэлх хоцролт менежерт мэдэгдэнэ. Цуцлаагүй бол торгууль
            хэвээр үлдэнэ; түүнээс дээш хоцролт шууд баталгаажна.
          </span>
        </div>
      </section>
      <section className="live-card-grid">
        {filtered.map((item) => (
          <article className="live-request-card" key={item.name}>
            <header>
              <span className="live-avatar">
                {item.display_name.slice(0, 2)}
              </span>
              <div>
                <h2>{item.display_name}</h2>
                <p>
                  {formatDate(item.attendance_date)} ·{" "}
                  {stateLabel(item.penalty_type)}
                </p>
              </div>
              <b data-state={item.status}>{stateLabel(item.status)}</b>
            </header>
            <div className="live-penalty-facts">
              <span>
                <small>
                  {item.penalty_type === "Stage Round"
                    ? "Дутуу гараа"
                    : "Хоцролт"}
                </small>
                <strong>
                  {item.penalty_type === "Stage Round"
                    ? `${item.missed_rounds || 0} гараа`
                    : `${item.late_minutes || 0} минут`}
                </strong>
              </span>
              <span>
                <small>Бодлогын дүн</small>
                <strong>
                  {item.amount ? formatMoney(item.amount) : "Тооцоогүй"}
                </strong>
              </span>
            </div>
            <blockquote>{item.reason}</blockquote>
            {item.decision_reason ? (
              <p className="live-decision-note">
                <strong>Шийдвэрийн тайлбар:</strong> {item.decision_reason}
              </p>
            ) : null}
            {canDecide && item.status === "Pending Review" ? (
              <footer>
                <button
                  disabled={busy === item.name}
                  type="button"
                  onClick={() => void decide(item, "Rejected")}
                >
                  Цуцлах
                </button>
                <button
                  className="live-button--primary"
                  disabled={busy === item.name}
                  type="button"
                  onClick={() => void decide(item, "Approved")}
                >
                  Хэвээр үлдээх
                </button>
              </footer>
            ) : null}
            {canDecide && item.status === "Approved" ? (
              <footer>
                <span />
                <button
                  disabled={busy === item.name}
                  type="button"
                  onClick={() => void decide(item, "Reversed")}
                >
                  Шийдвэр буцаах
                </button>
              </footer>
            ) : null}
          </article>
        ))}
        {!filtered.length ? (
          <p className="live-empty live-empty--card">
            Сонгосон төлөвт торгуулийн бүртгэл алга.
          </p>
        ) : null}
      </section>
    </>
  );
}

function AttendanceCorrectionView({
  api,
  rows,
  onRefresh,
}: {
  api: FrappeManagementApi;
  rows: AttendanceCorrectionRequest[];
  onRefresh: () => Promise<void>;
}) {
  const [reviewing, setReviewing] = useState<{
    row: AttendanceCorrectionRequest;
    decision: "Approved" | "Rejected";
  } | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const keys = useRef(new Map<string, string>());
  const pending = rows.filter((row) => row.status === "Pending");
  async function decide() {
    if (!reviewing) return;
    const cleanReason = reason.trim();
    if (reviewing.decision === "Rejected" && cleanReason.length < 3) return;
    const fingerprint = `${reviewing.row.name}|${reviewing.row.modified}|${reviewing.decision}|${cleanReason}`;
    let key = keys.current.get(fingerprint);
    if (!key) {
      key = idempotencyKey("attendance-correction");
      keys.current.set(fingerprint, key);
    }
    setBusy(reviewing.row.name);
    setError("");
    try {
      await api.decideAttendanceCorrection(
        reviewing.row.name,
        reviewing.decision,
        cleanReason,
        reviewing.row.modified,
        key,
      );
      keys.current.delete(fingerprint);
      setReviewing(null);
      setReason("");
      await onRefresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Ирцийн шийдвэр хадгалж чадсангүй.",
      );
    } finally {
      setBusy("");
    }
  }
  return (
    <section className="live-correction-section">
      <header className="live-section-heading">
        <div>
          <span>Ирцийн засвар</span>
          <h2>Цаг засах хүсэлт</h2>
          <p>
            Эх бүртгэлийг устгалгүй, санал болгосон цаг ба холбогдох суутгалыг
            шалгаж шийдвэрлэнэ.
          </p>
        </div>
        <b>{pending.length}</b>
      </header>
      {error ? <ErrorState message={error} /> : null}
      <div className="live-card-grid">
        {pending.map((row) => (
          <article className="live-request-card" key={row.name}>
            <header>
              <span className="live-avatar">
                {(row.display_name || row.employee).slice(0, 2)}
              </span>
              <div>
                <h2>{row.display_name || row.employee}</h2>
                <p>
                  {formatDate(row.attendance_date)} ·{" "}
                  {row.correction_type === "Check-in"
                    ? "Орох цаг"
                    : "Гарах цаг"}
                </p>
              </div>
              <b>Хүлээгдэж байна</b>
            </header>
            <dl className="live-correction-facts">
              <div>
                <dt>Ээлж</dt>
                <dd>
                  {row.shift_start && row.shift_end
                    ? `${row.shift_start.slice(-8, -3)}–${row.shift_end.slice(-8, -3)}`
                    : "Тодорхойгүй"}
                </dd>
              </div>
              <div>
                <dt>Эх бүртгэл</dt>
                <dd>
                  {row.original_time
                    ? row.original_time.slice(-8, -3)
                    : "Бүртгэлгүй"}
                </dd>
              </div>
              <div>
                <dt>Санал болгосон</dt>
                <dd>{(row.proposed_at || row.requested_time).slice(-8, -3)}</dd>
              </div>
              <div>
                <dt>Холбогдох суутгал</dt>
                <dd>
                  {row.penalties?.length
                    ? formatMoney(
                        row.penalties.reduce(
                          (sum, item) => sum + item.amount,
                          0,
                        ),
                      )
                    : "Байхгүй"}
                </dd>
              </div>
            </dl>
            <blockquote>{row.reason}</blockquote>
            {row.review_blocked_reason ? (
              <p className="live-decision-note">{row.review_blocked_reason}</p>
            ) : null}
            {reviewing?.row.name === row.name ? (
              <div className="live-inline-decision">
                <label>
                  <span>
                    {reviewing.decision === "Rejected"
                      ? "Татгалзах шалтгаан"
                      : "Менежерийн тэмдэглэл"}
                  </span>
                  <textarea
                    autoFocus
                    rows={3}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                  />
                </label>
                <footer>
                  <button type="button" onClick={() => setReviewing(null)}>
                    Цуцлах
                  </button>
                  <button
                    className="live-button--primary"
                    disabled={
                      busy === row.name ||
                      (reviewing.decision === "Rejected" &&
                        reason.trim().length < 3)
                    }
                    type="button"
                    onClick={() => void decide()}
                  >
                    {busy === row.name ? "Хадгалж байна…" : "Шийдвэр батлах"}
                  </button>
                </footer>
              </div>
            ) : (
              <footer>
                <button
                  type="button"
                  onClick={() => {
                    setReviewing({ row, decision: "Rejected" });
                    setReason("");
                  }}
                >
                  Татгалзах
                </button>
                <button
                  className="live-button--primary"
                  disabled={Boolean(row.review_blocked_reason)}
                  type="button"
                  onClick={() => {
                    setReviewing({ row, decision: "Approved" });
                    setReason("");
                  }}
                >
                  Зөвшөөрөх
                </button>
              </footer>
            )}
          </article>
        ))}
        {!pending.length ? (
          <p className="live-empty live-empty--card">
            Шийдвэр хүлээж буй цаг засах хүсэлт алга.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function AttendancePolicyControl({
  api,
  branch,
}: {
  api: FrappeManagementApi;
  branch: string;
}) {
  const [policy, setPolicy] = useState<BranchAttendancePolicy | null>(null);
  const [lateTime, setLateTime] = useState("22:00");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const requestKey = useRef("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const next = await api.getBranchAttendancePolicy(branch);
      setPolicy(next);
      setLateTime(next.late_after_time.slice(0, 5));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Ирцийн цагийн тохиргоог ачаалж чадсангүй.",
      );
    } finally {
      setLoading(false);
    }
  }, [api, branch]);
  useEffect(() => {
    void load();
  }, [load]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!policy || reason.trim().length < 3) return;
    if (!requestKey.current)
      requestKey.current = idempotencyKey("branch-late-time");
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const next = await api.updateBranchLateTime(
        lateTime,
        reason.trim(),
        policy.modified,
        requestKey.current,
        branch,
      );
      setPolicy(next);
      setLateTime(next.late_after_time.slice(0, 5));
      setReason("");
      requestKey.current = "";
      setMessage(
        `${branch} салбарын хоцролтын босгыг ${next.late_after_time.slice(0, 5)} болголоо.`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Хоцролтын цагийг хадгалж чадсангүй.",
      );
    } finally {
      setSaving(false);
    }
  }
  if (loading)
    return (
      <section className="live-attendance-policy">
        <LoadingState label="Хоцролтын цагийг ачаалж байна…" />
      </section>
    );
  return (
    <section className="live-attendance-policy">
      <header>
        <div>
          <span>Салбарын ирцийн дүрэм</span>
          <h2>Хоцролт эхлэх цаг</h2>
          <p>Энэ цагаас хойш бүртгүүлсэн ирэлтийг хоцролт гэж тооцно.</p>
        </div>
        <Clock3 size={21} />
      </header>
      <form onSubmit={submit}>
        <label>
          <span>Хоцорсонд тооцох цаг</span>
          <input
            aria-label="Хоцорсонд тооцох цаг"
            type="time"
            value={lateTime}
            onChange={(event) => {
              setLateTime(event.target.value);
              requestKey.current = "";
            }}
            required
          />
        </label>
        <label>
          <span>Өөрчилсөн шалтгаан</span>
          <input
            aria-label="Өөрчилсөн шалтгаан"
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              requestKey.current = "";
            }}
            placeholder="Жишээ: Өнөөдрийн үйл ажиллагаа 22:30-д эхэлнэ"
          />
        </label>
        <button
          className="live-button--primary"
          type="submit"
          disabled={saving || !policy || reason.trim().length < 3}
        >
          {saving ? "Хадгалж байна…" : "Цаг хадгалах"}
        </button>
      </form>
      <p className="live-attendance-rule">
        <strong>Бүжигчин:</strong> зөвхөн ирэхдээ QR уншуулна.{" "}
        <strong>Бусад ажилтан:</strong> ирэхдээ болон гарахдаа QR уншуулна.
      </p>
      {error ? (
        <p className="live-inline-error" role="alert">
          {error}{" "}
          <button type="button" onClick={() => void load()}>
            Дахин оролдох
          </button>
        </p>
      ) : null}
      {message ? (
        <p className="live-inline-success" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}

function AttendanceReviewView({
  api,
  data,
  onRefresh,
}: {
  api: FrappeManagementApi;
  data: ManagerData;
  onRefresh: () => Promise<void>;
}) {
  return (
    <>
      <PageHeading
        eyebrow={`${data.dashboard.branch} салбар`}
        title="Ирцийн хяналт"
        description="Хоцролтын цаг, цаг засах хүсэлт, таслалт ба суутгалын нотолгоог нэг дарааллаас шалгана."
      />
      <AttendancePolicyControl api={api} branch={data.dashboard.branch} />
      <AttendanceCorrectionView
        api={api}
        rows={data.corrections}
        onRefresh={onRefresh}
      />
      <PenaltiesView
        api={api}
        penalties={data.penalties}
        canDecide
        branch={data.dashboard.branch}
        onRefresh={onRefresh}
      />
    </>
  );
}

function CrmView({
  api,
  branches,
  initialBranch,
}: {
  api: FrappeManagementApi;
  branches: string[];
  initialBranch?: string;
}) {
  const [branch, setBranch] = useState(initialBranch ?? branches[0] ?? "");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [rank, setRank] = useState("All");
  const [customers, setCustomers] = useState<ManagerCustomerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [loadMoreError, setLoadMoreError] = useState("");
  const [selected, setSelected] = useState("");
  const load = useCallback(async (cursor = 0, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    if (!append) setError("");
    setLoadMoreError("");
    try {
      const result = await api.getCustomers({
        search: submittedQuery,
        membershipRank: rank,
        limit: 50,
        cursor,
        branch: initialBranch ? undefined : branch,
      });
      setCustomers((current) => {
        if (!append) return result.customers;
        const existing = new Set(current.map((item) => item.name));
        return [
          ...current,
          ...result.customers.filter((item) => !existing.has(item.name)),
        ];
      });
      setTotal(result.meta.total);
      setNextCursor(result.meta.next_cursor ?? null);
      if (!append) {
        setSelected((value) =>
          result.customers.some((item) => item.name === value)
            ? value
            : result.customers[0]?.name || "",
        );
      }
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "Харилцагчийн мэдээлэл ачаалж чадсангүй.";
      if (append) setLoadMoreError(message);
      else setError(message);
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  }, [api, branch, initialBranch, rank, submittedQuery]);
  useEffect(() => {
    void load(0, false);
  }, [load]);
  const customer =
    customers.find((item) => item.name === selected) ?? customers[0];
  function search(event: FormEvent) {
    event.preventDefault();
    const nextQuery = query.trim();
    if (nextQuery === submittedQuery) void load(0, false);
    else setSubmittedQuery(nextQuery);
  }
  async function updateBan(target: string, banned: boolean, reason: string) {
    await api.setCustomerBan(target, banned, reason);
    setCustomers((rows) =>
      rows.map((row) =>
        row.name === target
          ? { ...row, is_banned: banned ? 1 : 0, ban_reason: reason }
          : row,
      ),
    );
  }
  async function updateCharacteristics(target: string, value: string) {
    const saved = await api.setCustomerServiceCharacteristics(target, value);
    setCustomers((rows) =>
      rows.map((row) =>
        row.name === target
          ? {
              ...row,
              service_characteristics: saved.service_characteristics,
              service_characteristics_updated_by:
                saved.service_characteristics_updated_by,
              service_characteristics_updated_at:
                saved.service_characteristics_updated_at,
            }
          : row,
      ),
    );
  }
  return (
    <>
      <PageHeading
        eyebrow={`${initialBranch ?? branch} салбар · нууцлалтай бүртгэл`}
        title="Харилцагчид"
        description="Хайлт, үйлчилгээний онцлог, нэвтрэх эрх."
      />
      <form className="live-crm-controls" onSubmit={search}>
        {branches.length > 1 ? (
          <select
            value={branch}
            onChange={(event) => setBranch(event.target.value)}
          >
            {branches.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        ) : null}
        <label>
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Нэр эсвэл утасны дугаар"
          />
        </label>
        <select value={rank} onChange={(event) => setRank(event.target.value)}>
          <option value="All">Бүх түвшин</option>
          {[
            "Black Diamond",
            "Diamond",
            "Gold",
            "Silver",
            "Bronze",
            "Unassigned",
          ].map((item) => (
            <option key={item} value={item}>
              {stateLabel(item)}
            </option>
          ))}
        </select>
        <button className="live-button--primary" type="submit">
          Хайх
        </button>
      </form>
      {error ? <ErrorState message={error} retry={load} /> : null}
      {loading ? (
        <LoadingState label="Харилцагчийн мэдээлэл ачаалж байна…" />
      ) : (
        <div className="live-crm-layout">
          <section className="live-panel live-customer-list">
            <header>
              <div>
                <span>Сонгосон салбар</span>
                <h2>Харилцагчид</h2>
              </div>
              <b>
                {customers.length}/{total}
              </b>
            </header>
            <div>
              {customers.map((item) => (
                <button
                  className={customer?.name === item.name ? "selected" : ""}
                  key={item.name}
                  type="button"
                  onClick={() => setSelected(item.name)}
                >
                  <span className="live-avatar">
                    {item.customer_name.slice(0, 2)}
                  </span>
                  <span>
                    <strong>{item.customer_name}</strong>
                    <small>
                      {item.phone || "Утасгүй"} · {item.visit_count} ирэлт
                    </small>
                    {item.is_banned ? (
                      <em>Нэвтрэх эрх хориглосон</em>
                    ) : item.service_characteristics ? (
                      <em>{item.service_characteristics}</em>
                    ) : null}
                  </span>
                  <span className="live-customer-row-status">
                    <b>{stateLabel(item.membership_rank)}</b>
                    <small>{formatPointBalance(item.point_balance)}</small>
                  </span>
                </button>
              ))}
            </div>
            {nextCursor !== null || loadMoreError ? (
              <footer className="live-customer-list-footer">
                {loadMoreError ? (
                  <p role="alert">{loadMoreError}</p>
                ) : (
                  <span>
                    {customers.length}/{total} харилцагч
                  </span>
                )}
                {nextCursor !== null ? (
                  <button
                    type="button"
                    onClick={() => void load(nextCursor, true)}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <LoaderCircle className="spin" size={16} />
                    ) : (
                      <Plus size={16} />
                    )}
                    {loadingMore ? "Ачаалж байна…" : "Цааш харах"}
                  </button>
                ) : null}
              </footer>
            ) : null}
          </section>
          {customer ? (
            <div className="live-customer-workspace">
              <section className="live-panel live-customer-detail">
                <header>
                  <div>
                    <span className="live-avatar live-avatar--large">
                      {customer.customer_name.slice(0, 2)}
                    </span>
                    <span>
                      <h2>{customer.customer_name}</h2>
                      <p>{customer.phone || "Утасны мэдээлэлгүй"}</p>
                    </span>
                  </div>
                  <b>{stateLabel(customer.membership_rank)}</b>
                </header>
                <div className="live-customer-facts">
                  <span className="live-customer-points">
                    <small>Point үлдэгдэл</small>
                    <strong>{formatPointBalance(customer.point_balance)}</strong>
                  </span>
                  <span>
                    <small>Нийт зарцуулалт</small>
                    <strong>{formatMoney(customer.total_spend)}</strong>
                  </span>
                  <span>
                    <small>Дундаж зарцуулалт</small>
                    <strong>{formatMoney(customer.average_bill)}</strong>
                  </span>
                  <span>
                    <small>Нийт зочлолт</small>
                    <strong>{customer.visit_count}</strong>
                  </span>
                  <span>
                    <small>Сүүлийн зочлолт</small>
                    <strong>
                      {customer.last_visit
                        ? formatDate(customer.last_visit)
                        : "Мэдээлэлгүй"}
                    </strong>
                  </span>
                </div>
                <p className="live-privacy">
                  <BadgeCheck size={16} />
                  Утасны мэдээлэл масктай.
                </p>
              </section>
              <GuestCharacteristicsControl
                customer={customer.name}
                value={customer.service_characteristics ?? ""}
                onSave={updateCharacteristics}
              />
              <GuestBanControl
                customer={customer.name}
                customerName={customer.customer_name}
                branch={initialBranch ?? branch}
                isBanned={Boolean(customer.is_banned)}
                currentReason={customer.ban_reason ?? ""}
                onSave={updateBan}
              />
            </div>
          ) : (
            <p className="live-empty live-empty--card">Харилцагч олдсонгүй.</p>
          )}
        </div>
      )}
    </>
  );
}

type CeoCrmSegment = "all" | "vip" | "inactive" | "missing";
type CeoCustomerRow = ManagerCustomerRow & { branch: string };

function CeoCrmWorkspace({
  api,
  branches,
  generatedAt,
}: {
  api: FrappeManagementApi;
  branches: string[];
  generatedAt: string;
}) {
  const [customers, setCustomers] = useState<CeoCustomerRow[]>([]);
  const [knownTotal, setKnownTotal] = useState(0);
  const [failedBranches, setFailedBranches] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [branch, setBranch] = useState("All");
  const [segment, setSegment] = useState<CeoCrmSegment>("all");
  const referenceDay = generatedAt.slice(0, 10);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setFailedBranches([]);
    try {
      const results = await Promise.allSettled(
        branches.map(async (branchName) => ({
          branchName,
          result: await api.getCustomers({ branch: branchName, limit: 100 }),
        })),
      );
      const loaded = results.flatMap((result) =>
        result.status === "fulfilled"
          ? result.value.result.customers.map((customer) => ({
              ...customer,
              branch: result.value.result.branch || result.value.branchName,
            }))
          : [],
      );
      const successfulTotals = results.reduce(
        (sum, result) =>
          result.status === "fulfilled"
            ? sum + result.value.result.meta.total
            : sum,
        0,
      );
      const failures = results.flatMap((result, index) =>
        result.status === "rejected" ? [branches[index]] : [],
      );
      if (!loaded.length && failures.length === branches.length)
        throw new Error("Бүх салбарын харилцагчийн мэдээлэл ачаалсангүй.");
      setCustomers(loaded);
      setKnownTotal(successfulTotals);
      setFailedBranches(failures);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "CRM тойм ачаалж чадсангүй.",
      );
    } finally {
      setLoading(false);
    }
  }, [api, branches]);

  useEffect(() => {
    void load();
  }, [load]);

  const vipCount = customers.filter((customer) =>
    ["Black Diamond", "Diamond", "Gold"].includes(customer.membership_rank),
  ).length;
  const inactiveCount = customers.filter((customer) => {
    const days = elapsedDays(customer.last_visit, referenceDay);
    return days != null && days >= 30;
  }).length;
  const missingCount = customers.filter(
    (customer) => !customer.last_visit,
  ).length;
  const visibleCustomers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("mn-MN");
    return customers.filter((customer) => {
      const matchesBranch = branch === "All" || customer.branch === branch;
      const matchesQuery =
        !normalized ||
        `${customer.customer_name} ${customer.phone ?? ""}`
          .toLocaleLowerCase("mn-MN")
          .includes(normalized);
      const days = elapsedDays(customer.last_visit, referenceDay);
      const matchesSegment =
        segment === "all" ||
        (segment === "vip" &&
          ["Black Diamond", "Diamond", "Gold"].includes(
            customer.membership_rank,
          )) ||
        (segment === "inactive" && days != null && days >= 30) ||
        (segment === "missing" && !customer.last_visit);
      return matchesBranch && matchesQuery && matchesSegment;
    });
  }, [branch, customers, query, referenceDay, segment]);

  const criteria = {
    all: "Ачаалсан баталгаатай харилцагчийн бүртгэл",
    vip: "Гишүүнчлэлийн түвшин Алт, Алмаз эсвэл Хар алмаз",
    inactive: `Сүүлийн зочлолтоос ${referenceDay} хүртэл 30-аас дээш хоног`,
    missing: "Сүүлийн зочлолтын огноо бүртгэгдээгүй",
  }[segment];

  return (
    <>
      <PageHeading
        eyebrow="Компанийн CRM · зөвхөн унших"
        title="Харилцагчийн тойм"
        description="Салбаруудын баталгаатай бүртгэлийг нэгтгэн хайж, тайлбарлагдах сегментээр хянана."
        action={
          <span className="live-data-freshness">
            <Clock3 size={16} />
            Төлөв: {formatDateTime(generatedAt)}
          </span>
        }
      />
      {error ? <ErrorState message={error} retry={load} /> : null}
      {loading ? (
        <LoadingState label="Компанийн харилцагчдыг ачаалж байна…" />
      ) : (
        <>
          {failedBranches.length ? (
            <p className="live-inline-warning" role="status">
              <AlertTriangle size={16} />
              <span>
                <strong>Хэсэгчилсэн мэдээлэл</strong>
                {failedBranches.join(", ")} салбарын өгөгдөл ачаалсангүй.
              </span>
            </p>
          ) : null}
          <section className="live-metrics">
            <Metric
              icon={Users}
              label="Бүртгэлтэй харилцагч"
              value={knownTotal}
              hint={`${customers.length} бүртгэл ачаалсан`}
            />
            <Metric
              icon={Gem}
              label="VIP түвшинтэй"
              value={vipCount}
              hint="Алт болон түүнээс дээш"
              tone="violet"
            />
            <Metric
              icon={Clock3}
              label="30+ хоног ирээгүй"
              value={inactiveCount}
              hint="Тооцоолсон сегмент"
              tone={inactiveCount ? "amber" : "green"}
            />
            <Metric
              icon={AlertTriangle}
              label="Огноо дутуу"
              value={missingCount}
              hint="Сүүлийн зочлолтгүй"
              tone={missingCount ? "amber" : "green"}
            />
          </section>
          <section
            className="live-panel live-ceo-crm-filters"
            aria-label="CRM шүүлтүүр"
          >
            <label>
              <span>Хайх</span>
              <span className="live-input-with-icon">
                <Search size={17} />
                <input
                  aria-label="Харилцагч хайх"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Нэр эсвэл масктай утас"
                />
              </span>
            </label>
            <label>
              <span>Салбар</span>
              <select
                aria-label="CRM салбар"
                value={branch}
                onChange={(event) => setBranch(event.target.value)}
              >
                <option value="All">Бүх салбар</option>
                {branches.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <div
              className="live-crm-segments"
              role="group"
              aria-label="Харилцагчийн сегмент"
            >
              {(
                [
                  ["all", "Бүгд"],
                  ["vip", "VIP"],
                  ["inactive", "30+ хоног"],
                  ["missing", "Огноо дутуу"],
                ] as [CeoCrmSegment, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={segment === value}
                  className={segment === value ? "active" : ""}
                  onClick={() => setSegment(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>
          <section className="live-policy-note live-crm-criteria">
            <BadgeCheck size={19} />
            <div>
              <strong>Сегментийн шалгуур</strong>
              <span>
                {criteria}. Энэ нь шинжилгээний харагдац бөгөөд харилцах
                зөвшөөрөл биш.
              </span>
            </div>
          </section>
          <section className="live-panel live-ceo-crm-directory">
            <header>
              <div>
                <span>Шүүлтийн үр дүн</span>
                <h2>Харилцагчид</h2>
              </div>
              <b>{visibleCustomers.length}</b>
            </header>
            <div className="live-ceo-crm-table">
              <div className="head">
                <span>Харилцагч</span>
                <span>Салбар</span>
                <span>Түвшин</span>
                <span>Зочлолт</span>
                <span>Сүүлийн зочлолт</span>
                <span>Нийт зарцуулалт</span>
              </div>
              {visibleCustomers.map((customer) => {
                const days = elapsedDays(customer.last_visit, referenceDay);
                return (
                  <article key={`${customer.branch}-${customer.name}`}>
                    <span className="customer">
                      <i className="live-avatar">
                        {customer.customer_name.slice(0, 2)}
                      </i>
                      <span>
                        <strong>{customer.customer_name}</strong>
                        <small>{customer.phone || "Утасны мэдээлэлгүй"}</small>
                      </span>
                    </span>
                    <span data-label="Салбар">{customer.branch}</span>
                    <span data-label="Түвшин">
                      <b>{stateLabel(customer.membership_rank)}</b>
                    </span>
                    <span data-label="Зочлолт">{customer.visit_count}</span>
                    <span data-label="Сүүлийн зочлолт">
                      <strong>
                        {customer.last_visit
                          ? formatDate(customer.last_visit)
                          : "Мэдээлэлгүй"}
                      </strong>
                      <small>
                        {days == null ? "Огноо дутуу" : `${days} хоногийн өмнө`}
                      </small>
                    </span>
                    <span data-label="Нийт зарцуулалт">
                      {formatMoney(customer.total_spend)}
                    </span>
                  </article>
                );
              })}
              {!visibleCustomers.length ? (
                <p className="live-empty">
                  Сонгосон шүүлтүүрт тохирох харилцагч алга.
                </p>
              ) : null}
            </div>
          </section>
          <section className="live-panel live-crm-integration-state">
            <div>
              <span>Кампанит ажлын холболт</span>
              <h2>Зөвшөөрөл ба хүргэлтийн API хүлээгдэж байна</h2>
              <p>
                Харилцах зөвшөөрөл, суваг, давтамжийн хязгаар, батлах урсгал,
                хүргэлтийн үр дүн серверээс ирсний дараа кампанит ажил
                идэвхжинэ.
              </p>
            </div>
            <button type="button" disabled>
              Кампанит ажил үүсгэх боломжгүй
            </button>
          </section>
        </>
      )}
    </>
  );
}

function GuestWorkspaceView({
  api,
  session,
  view,
  onNavigate,
  guestDetailTarget,
  onGuestDetailHandled,
}: {
  api: FrappeManagementApi;
  session: ManagementSession;
  view: "entries" | "crm";
  onNavigate: (view: ManagerView) => void;
  guestDetailTarget?: GuestDetailTarget | null;
  onGuestDetailHandled?: () => void;
}) {
  return (
    <>
      <nav className="live-guest-tabs" aria-label="Зочдын ажлын хэсэг">
        <button
          className={view === "entries" ? "active" : ""}
          type="button"
          onClick={() => onNavigate("entries")}
        >
          <DoorOpen size={18} />
          Өнөөдрийн урсгал
        </button>
        <button
          className={view === "crm" ? "active" : ""}
          type="button"
          onClick={() => onNavigate("crm")}
        >
          <ContactRound size={18} />
          Харилцагчид
        </button>
      </nav>
      {view === "entries" ? (
        <EntryView
          api={api}
          initialTarget={guestDetailTarget}
          onTargetHandled={onGuestDetailHandled}
        />
      ) : (
        <CrmView
          api={api}
          branches={session.branchIds}
          initialBranch={session.branchIds[0]}
        />
      )}
    </>
  );
}

function RankingsView({
  api,
  dashboard,
}: {
  api: FrappeManagementApi;
  dashboard: ManagerDashboard;
}) {
  const [rankTab, setRankTab] = useState<"ranking" | "demo">("ranking");
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<EntertainerDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [query, setQuery] = useState("");
  async function openDetail(profile: string, preserveCurrent = false) {
    setSelected(profile);
    if (!preserveCurrent) setDetail(null);
    setDetailError("");
    setLoadingDetail(!preserveCurrent);
    try {
      setDetail(await api.getManagerEntertainerDetail(profile));
    } catch (caught) {
      setDetailError(
        caught instanceof Error
          ? caught.message
          : "Зэрэглэлийн үнэлгээ ачаалж чадсангүй.",
      );
    } finally {
      setLoadingDetail(false);
    }
  }
  const tabs = (
    <nav className="live-section-tabs" aria-label="Зэрэглэлийн хэсэг">
      <button
        type="button"
        className={rankTab === "ranking" ? "active" : ""}
        aria-current={rankTab === "ranking" ? "page" : undefined}
        onClick={() => setRankTab("ranking")}
      >
        <Gem size={17} />
        Өнөөдрийн зэрэглэл
      </button>
      <button
        type="button"
        className={rankTab === "demo" ? "active" : ""}
        aria-current={rankTab === "demo" ? "page" : undefined}
        onClick={() => setRankTab("demo")}
      >
        <Database size={17} />
        Туршилтын тайлан
      </button>
    </nav>
  );
  if (rankTab === "demo")
    return (
      <>
        {tabs}
        <DemoRankReportView api={api} />
      </>
    );
  if (selected)
    return (
      <>
        <button
          className="live-back"
          type="button"
          onClick={() => {
            setSelected(null);
            setDetail(null);
            setDetailError("");
          }}
        >
          <ChevronLeft size={18} />
          Зэрэглэлийн жагсаалт
        </button>
        {detailError ? (
          <ErrorState
            message={detailError}
            retry={() => void openDetail(selected)}
          />
        ) : null}
        {loadingDetail ? (
          <LoadingState label="Зэрэглэлийн үнэлгээ ачаалж байна…" />
        ) : detail ? (
          <EntertainerDetailView
            detail={detail}
            rankControl={
              <DailyRankScorecard
                api={api}
                detail={detail}
                onUpdated={() => openDetail(selected, true)}
              />
            }
          />
        ) : null}
      </>
    );
  const rankOrder = (rank?: string | null) =>
    (
      ({
        "Rank 1": 1,
        Diamond: 1,
        "Rank 2": 2,
        Gold: 2,
        "Rank 3": 3,
        Silver: 3,
        Bronze: 3,
      }) as Record<string, number>
    )[String(rank || "")] ?? 99;
  const team = [...dashboard.roster].sort(
    (a, b) =>
      rankOrder(a.rank) - rankOrder(b.rank) ||
      Number(b.current_points || 0) - Number(a.current_points || 0) ||
      a.display_name.localeCompare(b.display_name, "mn"),
  );
  const normalizedQuery = query.trim().toLocaleLowerCase("mn");
  const visibleTeam = normalizedQuery
    ? team.filter((item) =>
        item.display_name.toLocaleLowerCase("mn").includes(normalizedQuery),
      )
    : team;
  return (
    <>
      {tabs}
      <PageHeading
        eyebrow={`${dashboard.branch} салбар · Багийн гүйцэтгэл`}
        title="Бүжигчдийн зэрэглэл"
        description="Өнөөдрийн хүчинтэй зэрэглэл, 8 үзүүлэлтийн оноог нэг дор хянана. Баталгаажсан дүн дараагийн өдөр хэрэгжинэ."
      />
      <section className="live-panel">
        <div className="live-ranking-toolbar">
          <label>
            <Search size={17} />
            <input
              aria-label="Бүжигчин хайх"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Нэрээр хайх"
            />
          </label>
          <span>
            {visibleTeam.length}/{team.length} бүжигчин
          </span>
        </div>
        <div className="live-ranking-list">
          {visibleTeam.map((item) => {
            const position =
              team.findIndex((row) => row.profile === item.profile) + 1;
            return (
              <article key={item.profile}>
                <strong>{position}</strong>
                <span className="live-avatar">
                  {item.display_name.slice(0, 2)}
                </span>
                <div>
                  <h3>{item.display_name}</h3>
                  <p>
                    {Math.round(item.current_points || 0)} оноо ·{" "}
                    {item.shift?.shift_type ?? "Ээлжгүй"}
                  </p>
                </div>
                <b>{stateLabel(item.rank)}</b>
                <button
                  className="live-rank-open"
                  type="button"
                  onClick={() => void openDetail(item.profile)}
                >
                  Өдрийн үнэлгээ
                  <ChevronRight size={16} />
                </button>
              </article>
            );
          })}
        </div>
        {!visibleTeam.length ? (
          <p className="live-empty">
            {query
              ? "Хайлтад тохирох бүжигчин олдсонгүй."
              : "Энэ салбарт идэвхтэй бүжигчин алга."}
          </p>
        ) : null}
      </section>
    </>
  );
}

function ManagerGoalView({
  api,
  sales,
  onRefresh,
}: {
  api: FrappeManagementApi;
  sales: BranchSalesProgress;
  onRefresh: () => Promise<void>;
}) {
  const [target, setTarget] = useState(
    String(
      sales.goal?.proposed_target || sales.active_goal?.approved_target || "",
    ),
  );
  const [rationale, setRationale] = useState(
    sales.goal?.manager_rationale ?? "",
  );
  const [action, setAction] = useState(
    "Борлуулалтын сарын үйл ажиллагааны төлөвлөгөө хэрэгжүүлэх",
  );
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [goalTab, setGoalTab] = useState<"report" | "proposal">("report");
  const editable =
    !sales.goal || ["Draft", "Revision Requested"].includes(sales.goal.state);
  const percent = sales.achievement_percent ?? 0;
  const progressState = salesProgressState(percent, Boolean(sales.active_goal));
  const formattedTarget =
    Number(target) > 0 ? formatMoney(Number(target)) : "Дүн оруулаагүй";
  async function persistDraft() {
    return api.saveGoal(
      `${sales.month}-01`,
      Number(target),
      rationale,
      [{ title: action }],
      sales.goal?.modified,
    );
  }
  async function saveDraft() {
    setBusy("save");
    setError("");
    try {
      await persistDraft();
      await onRefresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Зорилго хадгалж чадсангүй.",
      );
    } finally {
      setBusy("");
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy("submit");
    setError("");
    try {
      const result = await persistDraft();
      const goal = result.goal as { name?: string; modified?: string };
      if (!goal.name) throw new Error("Хүсэлтийн дугаар үүссэнгүй.");
      await api.submitGoal(goal.name, goal.modified);
      await onRefresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "CEO-д илгээж чадсангүй.",
      );
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <PageHeading
        eyebrow={`${sales.branch} салбар · ${monthLabel(sales.month)}`}
        title="Борлуулалтын зорилго"
        description="Сарын явцаа шалгаад зорилгын саналаа захиралд илгээнэ."
      />
      <nav
        className="live-section-tabs"
        aria-label="Борлуулалтын зорилгын хэсэг"
      >
        <button
          type="button"
          className={goalTab === "report" ? "active" : ""}
          aria-current={goalTab === "report" ? "page" : undefined}
          onClick={() => setGoalTab("report")}
        >
          <BarChart3 size={17} />
          Борлуулалтын тайлан
        </button>
        <button
          type="button"
          className={goalTab === "proposal" ? "active" : ""}
          aria-current={goalTab === "proposal" ? "page" : undefined}
          onClick={() => setGoalTab("proposal")}
        >
          <Target size={17} />
          Зорилгын санал
        </button>
      </nav>
      {goalTab === "report" ? (
        <>
          <section
            className="live-sales-hero"
            data-progress={progressState.tone}
          >
            <header>
              <div>
                <span>Бодит борлуулалтын явц</span>
                <h2>
                  {sales.active_goal
                    ? `${Math.round(percent)}% биелэлт`
                    : "Батлагдсан зорилго алга"}
                </h2>
              </div>
              <div className="live-sales-hero-status">
                <b>{progressState.label}</b>
                <Target size={28} />
              </div>
            </header>
            <div className="live-sales-facts">
              <span className="is-primary">
                <small>Бодит борлуулалт</small>
                <strong>{formatMoney(sales.actual_sales)}</strong>
              </span>
              <span>
                <small>Батлагдсан зорилго</small>
                <strong>
                  {sales.active_goal
                    ? formatMoney(sales.active_goal.approved_target)
                    : "—"}
                </strong>
              </span>
              <span>
                <small>Саналын төлөв</small>
                <strong>
                  {sales.goal ? stateLabel(sales.goal.state) : "Шинэ санал"}
                </strong>
              </span>
            </div>
            <Progress value={percent} label="Борлуулалтын биелэлт" />
          </section>
          <ManagerSalesWorkbench sales={sales} />
        </>
      ) : null}
      {goalTab === "proposal" ? (
        <>
          {error ? <ErrorState message={error} /> : null}
          <form className="live-panel live-goal-form" onSubmit={submit}>
            <header>
              <div>
                <span>Менежерийн санал</span>
                <h2>{monthLabel(sales.month)} зорилго</h2>
                <p>
                  Дүн, үндэслэл, хийх ажлаа оруулаад захиралд илгээнэ.
                </p>
              </div>
              {sales.goal ? (
                <b data-state={sales.goal.state}>
                  {stateLabel(sales.goal.state)}
                </b>
              ) : null}
            </header>
            <div className="live-goal-step">
              <span className="live-step-number">1</span>
              <label>
                <span>Санал болгож буй зорилгын дүн</span>
                <input
                  disabled={!editable}
                  type="number"
                  min="1"
                  inputMode="numeric"
                  value={target}
                  onChange={(event) => setTarget(event.target.value)}
                />
                <small>{formattedTarget}</small>
              </label>
            </div>
            <div className="live-goal-step">
              <span className="live-step-number">2</span>
              <label>
                <span>Үндэслэл</span>
                <textarea
                  disabled={!editable}
                  value={rationale}
                  onChange={(event) => setRationale(event.target.value)}
                  rows={4}
                  placeholder="Өмнөх сарын дүн, боломж, эрсдэлээ товч тайлбарлана уу"
                />
              </label>
            </div>
            <div className="live-goal-step">
              <span className="live-step-number">3</span>
              <label>
                <span>Хэрэгжүүлэх үндсэн ажил</span>
                <input
                  disabled={!editable}
                  value={action}
                  onChange={(event) => setAction(event.target.value)}
                  placeholder="Зорилгод хүрэх гол ажлаа бичнэ үү"
                />
              </label>
            </div>
            {sales.goal?.decision_comment ? (
              <p className="live-decision-note">
                <strong>Захирлын тайлбар:</strong> {sales.goal.decision_comment}
              </p>
            ) : null}
            <footer>
              <span className="live-form-state">
                {editable
                  ? "Өөрчлөлт илгээх хүртэл ноорог хэвээр байна."
                  : "Энэ саналыг засах боломжгүй төлөвт байна."}
              </span>
              <div>
                {editable ? (
                  <button
                    className="live-button"
                    disabled={Boolean(busy)}
                    type="button"
                    onClick={() => void saveDraft()}
                  >
                    {busy === "save" ? "Хадгалж байна…" : "Ноорог хадгалах"}
                  </button>
                ) : null}
                {editable ? (
                  <button
                    className="live-button--primary"
                    disabled={Boolean(busy)}
                    type="submit"
                  >
                    {busy === "submit" ? "Илгээж байна…" : "Захиралд илгээх"}
                  </button>
                ) : null}
              </div>
            </footer>
          </form>
        </>
      ) : null}
    </>
  );
}

const climateCategoryLabels: Record<TeamClimateCategory, string> = {
  Positive: "Сайн зүйл",
  Concern: "Анхаарах зүйл",
  Support: "Дэмжлэг хэрэгтэй",
};

function TeamClimateView({
  api,
  session,
}: {
  api: FrappeManagementApi;
  session: ManagementSession;
}) {
  const isCeo = session.role === "ceo";
  const [branch, setBranch] = useState(
    isCeo ? "" : (session.branchIds[0] ?? ""),
  );
  const [category, setCategory] = useState<TeamClimateCategory | "All">("All");
  const [rows, setRows] = useState<TeamClimateFeedbackRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.getTeamClimateFeedback({
        branch: branch || undefined,
        category,
        limit: 100,
      });
      setRows(result.feedback);
      setTotal(result.meta.total);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Багийн саналыг ачаалж чадсангүй.",
      );
    } finally {
      setLoading(false);
    }
  }, [api, branch, category]);
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <PageHeading
        eyebrow={
          isCeo
            ? "Компанийн дотоод уур амьсгал"
            : `${session.branchIds[0]} салбар · Дотоод уур амьсгал`
        }
        title="Охидын уур амьсгал"
        description="Бүжигчдийн өгсөн дотоод саналыг салбар, төрөл болон хугацаагаар хянана."
        action={
          <span className="live-confidential">
            <ShieldCheck size={16} />
            Зөвхөн менежер, захирал
          </span>
        }
      />
      <section className="live-policy-note live-climate-policy">
        <ShieldCheck size={19} />
        <div>
          <strong>Нууц удирдлагын мэдээлэл</strong>
          <span>
            Энд байгаа саналыг бүжигчин болон бусад ажилтан харахгүй. Агуулгыг
            багийн уур амьсгалыг сайжруулахад ашиглана.
          </span>
        </div>
      </section>
      <section className="live-panel live-climate-panel">
        <header>
          <div>
            <span>Ирсэн санал</span>
            <h2>{total} бүртгэл</h2>
          </div>
          <div className="live-climate-filters">
            {isCeo ? (
              <label>
                <span>Салбар</span>
                <select
                  value={branch}
                  onChange={(event) => setBranch(event.target.value)}
                >
                  <option value="">Бүх салбар</option>
                  {session.branchIds.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
            ) : null}
            <label>
              <span>Төрөл</span>
              <select
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as TeamClimateCategory | "All")
                }
              >
                <option value="All">Бүх төрөл</option>
                <option value="Positive">Сайн зүйл</option>
                <option value="Concern">Анхаарах зүйл</option>
                <option value="Support">Дэмжлэг хэрэгтэй</option>
              </select>
            </label>
            <button
              type="button"
              aria-label="Санал шинэчлэх"
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCw className={loading ? "spin" : ""} size={17} />
              Шинэчлэх
            </button>
          </div>
        </header>
        {error ? <ErrorState message={error} retry={load} /> : null}
        {loading ? (
          <LoadingState label="Багийн саналыг ачаалж байна…" />
        ) : (
          <div className="live-climate-list">
            {rows.map((row) => (
              <article key={row.name} data-category={row.category}>
                <header>
                  <div>
                    <i className="live-avatar">
                      {row.target_display_name.slice(0, 2)}
                    </i>
                    <span>
                      <small>Санал хүлээн авагч</small>
                      <strong>{row.target_display_name}</strong>
                    </span>
                  </div>
                  <b>{climateCategoryLabels[row.category]}</b>
                </header>
                <p>{row.feedback}</p>
                <footer>
                  <span>
                    <strong>Илгээсэн:</strong> {row.sender_display_name}
                  </span>
                  <span>
                    {row.branch} · {formatDateTime(row.submitted_at)}
                  </span>
                </footer>
              </article>
            ))}
            {!rows.length ? (
              <p className="live-empty">Сонгосон шүүлтэд тохирох санал алга.</p>
            ) : null}
          </div>
        )}
      </section>
    </>
  );
}

const demoAttendanceLabels: Record<string, string> = {
  Present: "Ирсэн",
  Late: "Хоцорсон",
  Absent: "Тасалсан",
};

function DemoRankReportView({ api }: { api: FrappeManagementApi }) {
  const [report, setReport] = useState<DemoRankReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setReport(await api.getDemoRankReport());
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Туршилтын тайлан ачаалж чадсангүй.",
      );
    } finally {
      setLoading(false);
    }
  }, [api]);
  useEffect(() => {
    void load();
  }, [load]);
  if (loading) return <LoadingState label="Туршилтын тайлан ачаалж байна…" />;
  if (error) return <ErrorState message={error} retry={load} />;
  if (!report?.batch)
    return (
      <>
        <PageHeading
          eyebrow="DEMO"
          title="Туршилтын тайлан"
          description="Туршилтын batch одоогоор үүсгээгүй байна."
        />
        <p className="live-empty live-empty--card">
          <Database size={28} />
          Туршилтын өгөгдөл алга.
        </p>
      </>
    );
  const { batch, summary, results } = report;
  return (
    <>
      <PageHeading
        eyebrow={`${formatDate(batch.scoring_date)} · ${batch.policy_version}`}
        title="Туршилтын тайлан"
        description="Бүжигчин бүрийн demo ирц, бэлэн байдал, гараа, 8 үзүүлэлт, оноо ба тооцоолсон зэрэглэлийг нэг дор харуулна."
        action={
          <button
            className="live-refresh-button"
            type="button"
            onClick={() => void load()}
          >
            <RefreshCw size={16} />
            Шинэчлэх
          </button>
        }
      />
      <section
        className="live-demo-contract"
        aria-label="Туршилтын өгөгдлийн тайлбар"
      >
        <Database size={21} />
        <div>
          <strong>DEMO өгөгдөл</strong>
          <span>
            Нэр, салбар нь баталгаажсан employee master-аас. Ирц, гараа,
            борлуулалтын оноо болон бусад үзүүлэлт бүгд туршилтынх.
          </span>
        </div>
        <b>
          <ShieldCheck size={15} />
          Бодит зэрэглэл, ирц, торгууль, цалинд нөлөөлөөгүй
        </b>
      </section>
      <section className="live-metrics live-demo-metrics">
        <Metric
          icon={Users}
          label="Бүжигчин"
          value={summary.profile_count}
          hint="Баталгаажсан профайл"
        />
        <Metric
          icon={BadgeCheck}
          label="Бүрэн тооцоо"
          value={`${summary.complete_count}/${summary.profile_count}`}
          hint="8/8 үзүүлэлттэй"
          tone="green"
        />
        <Metric
          icon={BarChart3}
          label="Дундаж оноо"
          value={
            summary.average_score == null
              ? "—"
              : summary.average_score.toFixed(2)
          }
          hint="Demo жинлэсэн оноо"
          tone="violet"
        />
        <Metric
          icon={AlertTriangle}
          label="Анхаарах хүн"
          value={summary.attention_count}
          hint="Demo зөрчил илэрсэн"
          tone={summary.attention_count ? "amber" : "green"}
        />
      </section>
      <section
        className="live-demo-rank-summary"
        aria-label="Тооцоолсон зэрэглэлийн нэгтгэл"
      >
        <div>
          <span>Тооцоолсон зэрэглэл</span>
          <strong>
            {Object.entries(summary.rank_counts)
              .map(([rank, count]) => `${stateLabel(rank)} ${count}`)
              .join(" · ")}
          </strong>
        </div>
        <div>
          <span>Demo борлуулалтын нийлбэр</span>
          <strong>{formatMoney(summary.demo_sales_total)}</strong>
        </div>
        <small>Batch: {batch.batch_id}</small>
      </section>
      <section
        className="live-demo-report-list"
        aria-label="Бүжигчдийн demo үр дүн"
      >
        <header>
          <span>Хүн бүрийн үр дүн</span>
          <strong>{results.length} хүн</strong>
        </header>
        {results.map((row) => (
          <details className="live-demo-person" key={row.profile}>
            <summary>
              <span className="live-avatar">
                {row.display_name.slice(0, 2)}
              </span>
              <span className="live-demo-person-name">
                <strong>{row.display_name}</strong>
                <small>
                  {row.branch} · {stateLabel(row.approved_rank)} батлагдсан
                </small>
              </span>
              <span>
                <small>Demo оноо</small>
                <strong>{row.displayed_score?.toFixed(2) ?? "—"}</strong>
              </span>
              <span>
                <small>Demo зэрэглэл</small>
                <strong>{stateLabel(row.calculated_rank)}</strong>
              </span>
              <b data-tone={row.attention.length ? "attention" : "complete"}>
                {row.attention.length
                  ? `${row.attention.length} анхаарах`
                  : "Хэвийн"}
              </b>
              <ChevronDown size={18} />
            </summary>
            <div className="live-demo-person-detail">
              <dl className="live-demo-context">
                <div>
                  <dt>Ирц</dt>
                  <dd>
                    {demoAttendanceLabels[row.attendance_state]}
                    {row.late_minutes ? ` · ${row.late_minutes} мин` : ""}
                  </dd>
                </div>
                <div>
                  <dt>Бэлэн байдал</dt>
                  <dd>
                    {row.readiness_result === "Ready" ? "Бэлэн" : "Бэлэн бус"}
                  </dd>
                </div>
                <div>
                  <dt>Гараа</dt>
                  <dd>
                    {row.rounds_completed}/{row.rounds_target}
                  </dd>
                </div>
                <div>
                  <dt>Demo борлуулалт</dt>
                  <dd>{formatMoney(row.demo_sales_amount)}</dd>
                </div>
              </dl>
              <div
                className="live-demo-components"
                role="table"
                aria-label={`${row.display_name} 8 үзүүлэлт`}
              >
                <div role="row">
                  <b role="columnheader">Үзүүлэлт</b>
                  <b role="columnheader">Оноо</b>
                  <b role="columnheader">Жин</b>
                  <b role="columnheader">Нөлөө</b>
                </div>
                {row.components.map((component) => (
                  <div role="row" key={component.component}>
                    <span role="cell">
                      {component.label}
                      <em>DEMO</em>
                    </span>
                    <strong role="cell">{component.score.toFixed(0)}</strong>
                    <span role="cell">{component.weight.toFixed(0)}%</span>
                    <span role="cell">
                      +{component.contribution.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              {row.attention.length ? (
                <div className="live-demo-attention">
                  <strong>Анхаарах зүйл</strong>
                  <ul>
                    {row.attention.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="live-demo-clear">
                  <CheckCircle2 size={17} />
                  Demo нөхцөлд анхаарах зөрчил илрээгүй.
                </p>
              )}
            </div>
          </details>
        ))}
      </section>
    </>
  );
}

function ManagerLiveApp({
  api,
  session,
  view,
  onNavigate,
  guestDetailTarget,
  onGuestDetailHandled,
}: {
  api: FrappeManagementApi;
  session: ManagementSession;
  view: ManagerView;
  onNavigate: (view: ManagerView) => void;
  guestDetailTarget?: GuestDetailTarget | null;
  onGuestDetailHandled?: () => void;
}) {
  const managerBranch = session.branchIds[0] ?? "";
  const [data, setData] = useState<ManagerData | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const [sectionIssues, setSectionIssues] = useState<ManagerSectionIssue[]>([]);
  const dataRef = useRef<ManagerData | null>(null);
  const loadInFlight = useRef(false);
  const successfulSections = useRef<Set<ManagerSectionKey>>(new Set());
  useEffect(() => {
    dataRef.current = data;
  }, [data]);
  const load = useCallback(async (_options?: { silent?: boolean }) => {
    if (loadInFlight.current) return;
    loadInFlight.current = true;
    if (dataRef.current) setRefreshing(true);
    try {
      const now = new Date().toISOString();
      const workDate = dateKey(new Date());
      const [
        salesResult,
        dashboardResult,
        readinessResult,
        roundsResult,
        teamResult,
        leaveResult,
        penaltyResult,
        correctionResult,
        customerResult,
        entryFeedResult,
      ] = await Promise.allSettled([
        api.getSalesProgress(currentMonth()),
        api.getManagerDashboard({ limit: 100 }),
        api.getReadinessQueue(),
        api.getDailyRounds(),
        api.getManagerTeam({ limit: 100 }),
        api.getLeaveRequests("All"),
        api.getPenalties("All"),
        api.getAttendanceCorrections("All"),
        api.getCustomers({ limit: 100 }),
        api.getEntryFeed(20),
      ]);
      const previous = dataRef.current;
      const resultMap: Array<
        [ManagerSectionKey, PromiseSettledResult<unknown>]
      > = [
        ["sales", salesResult],
        ["dashboard", dashboardResult],
        ["readiness", readinessResult],
        ["rounds", roundsResult],
        ["team", teamResult],
        ["leaves", leaveResult],
        ["penalties", penaltyResult],
        ["corrections", correctionResult],
        ["customers", customerResult],
        ["entryFeed", entryFeedResult],
      ];
      const nextIssues = resultMap
        .filter(([, result]) => result.status === "rejected")
        .map(([key]) => ({
          key,
          label: managerSectionLabels[key],
          showingPrevious: successfulSections.current.has(key),
        }));
      resultMap.forEach(([key, result]) => {
        if (result.status === "fulfilled") successfulSections.current.add(key);
      });
      const hasOverviewData =
        Boolean(previous) ||
        salesResult.status === "fulfilled" ||
        dashboardResult.status === "fulfilled";
      if (!hasOverviewData) {
        throw new Error("Менежерийн тоймын үндсэн мэдээлэл ачаалж чадсангүй.");
      }

      const emptySales: BranchSalesProgress = {
        branch: managerBranch,
        month: currentMonth(),
        active_goal: null,
        actual_sales: 0,
        actual_source: "unavailable",
        generated_at: now,
      };
      const emptyDashboard: ManagerDashboard = {
        branch: managerBranch,
        date: workDate,
        generated_at: now,
        summary: {
          total: 0,
          scheduled: 0,
          on_shift: 0,
          checked_in: 0,
          available: 0,
          reserved: 0,
          working: 0,
          break: 0,
          late: 0,
          absent: 0,
          leave: 0,
          off: 0,
          pending_readiness: 0,
          pending_leave: 0,
          pending_corrections: 0,
          pending_profile_changes: 0,
        },
        roster: [],
        meta: { total: 0, generated_at: now },
      };
      const emptyReadiness: ReadinessQueueData = {
        branch: managerBranch,
        work_date: workDate,
        status: "Unavailable",
        queue: [],
        summary: { total: 0, pending: 0, ready: 0, not_ready: 0 },
        access: {
          can_submit: false,
          mode: "manager_read_only",
          lead_state: "not_configured",
          message: "Мэдээлэл шинэчлэгдсэний дараа шалгана уу.",
        },
        meta: { total: 0 },
      };
      const emptyRounds: DailyRoundsData = {
        branch: managerBranch,
        work_date: workDate,
        target: 0,
        penalty_rate: 0,
        people: [],
        summary: {
          checked_in: 0,
          completed: 0,
          incomplete: 0,
          remaining_rounds: 0,
          projected_penalty: 0,
        },
        access: {
          can_submit: false,
          message: "Мэдээлэл шинэчлэгдсэний дараа бүртгэнэ үү.",
        },
      };
      const emptyTeam: ManagerTeam = {
        branch: managerBranch,
        date: workDate,
        members: [],
        meta: { total: 0, entertainer_total: 0 },
      };
      const emptyEntryFeed: CustomerEntryFeed = {
        branch: managerBranch,
        work_date: workDate,
        entries: [],
        reservations: [],
        pending_reservations: 0,
        today_total: 0,
        today_new: 0,
        unread: 0,
      };
      const nextData: ManagerData = {
        sales: settledValue(salesResult, previous?.sales ?? emptySales),
        dashboard: settledValue(
          dashboardResult,
          previous?.dashboard ?? emptyDashboard,
        ),
        readiness: settledValue(
          readinessResult,
          previous?.readiness ?? emptyReadiness,
        ),
        rounds: settledValue(roundsResult, previous?.rounds ?? emptyRounds),
        team: settledValue(teamResult, previous?.team ?? emptyTeam),
        leaves: settledValue(leaveResult, {
          requests: previous?.leaves ?? [],
          meta: { total: previous?.leaves.length ?? 0 },
        }).requests,
        penalties: settledValue(penaltyResult, {
          branch: managerBranch,
          penalties: previous?.penalties ?? [],
          meta: { total: previous?.penalties.length ?? 0 },
        }).penalties,
        corrections: settledValue(correctionResult, {
          branch: managerBranch,
          requests: previous?.corrections ?? [],
        }).requests,
        customers: settledValue(customerResult, {
          branch: managerBranch,
          customers: previous?.customers ?? [],
          meta: { total: previous?.customerTotal ?? 0 },
        }).customers,
        customerTotal: settledValue(customerResult, {
          branch: managerBranch,
          customers: previous?.customers ?? [],
          meta: { total: previous?.customerTotal ?? 0 },
        }).meta.total,
        entryFeed: settledValue(
          entryFeedResult,
          previous?.entryFeed ?? emptyEntryFeed,
        ),
      };
      dataRef.current = nextData;
      setData(nextData);
      setSectionIssues(nextIssues);
      if (nextIssues.length < resultMap.length) setRefreshedAt(now);
      setError("");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Менежерийн мэдээлэл ачаалж чадсангүй.",
      );
    } finally {
      loadInFlight.current = false;
      setRefreshing(false);
    }
  }, [api, managerBranch]);
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible")
        void load({ silent: true });
    }, 60000);
    const refreshVisiblePage = () => {
      if (document.visibilityState === "visible")
        void load({ silent: true });
    };
    const refreshOnlinePage = () => void load({ silent: true });
    document.addEventListener("visibilitychange", refreshVisiblePage);
    window.addEventListener("online", refreshOnlinePage);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshVisiblePage);
      window.removeEventListener("online", refreshOnlinePage);
    };
  }, [load]);
  if (error && !data) return <ErrorState message={error} retry={load} />;
  if (!data) return <LoadingState />;
  return (
    <>
      {error ? <ErrorState message={error} retry={load} /> : null}
      {sectionIssues.length ? (
        <section className="live-partial-data" role="status">
          <AlertTriangle size={18} />
          <div>
            <strong>Зарим мэдээлэл шинэчлэгдсэнгүй</strong>
            <span>
              {sectionIssues.map((issue) => issue.label).join(", ")}.{" "}
              {sectionIssues.every((issue) => issue.showingPrevious)
                ? "Өмнөх амжилттай мэдээллийг хадгалж харуулж байна."
                : "Тухайн хэсэг түр хоосон харагдана."}
            </span>
          </div>
          <button type="button" onClick={() => void load()} disabled={refreshing}>
            <RefreshCw size={15} />
            Дахин оролдох
          </button>
        </section>
      ) : null}
      {view === "overview" ? (
        <ManagerOverview
          data={data}
          onNavigate={onNavigate}
          refreshedAt={refreshedAt}
          sectionIssues={sectionIssues}
        />
      ) : null}
      {view === "entries" || view === "crm" ? (
        <GuestWorkspaceView
          api={api}
          session={session}
          view={view}
          onNavigate={onNavigate}
          guestDetailTarget={guestDetailTarget}
          onGuestDetailHandled={onGuestDetailHandled}
        />
      ) : null}
      {view === "schedule" ? <ScheduleView api={api} /> : null}
      {view === "team" ? (
        <TeamView api={api} team={data.team} onRefresh={load} />
      ) : null}
      {view === "readiness" ? (
        <ManagerReadinessView
          api={api}
          initialData={data.readiness}
          onRefresh={load}
        />
      ) : null}
      {view === "rounds" ? (
        <ManagerDailyRoundsView api={api} initialData={data.rounds} />
      ) : null}
      {view === "leave" ? (
        <LeaveView api={api} requests={data.leaves} onRefresh={load} />
      ) : null}
      {view === "penalties" ? (
        <AttendanceReviewView api={api} data={data} onRefresh={load} />
      ) : null}
      {view === "rankings" ? (
        <RankingsView api={api} dashboard={data.dashboard} />
      ) : null}
      {view === "goals" ? (
        <ManagerGoalView api={api} sales={data.sales} onRefresh={load} />
      ) : null}
      {view === "climate" ? (
        <TeamClimateView api={api} session={session} />
      ) : null}
    </>
  );
}

function HrLiveApp({
  api,
  session,
}: {
  api: FrappeManagementApi;
  session: ManagementSession;
}) {
  const [branch, setBranch] = useState(session.branchIds[0] ?? "");
  const [team, setTeam] = useState<ManagerTeam | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!branch) return;
    setError("");
    try {
      setTeam(await api.getManagerTeam({ branch, limit: 100 }));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Ажилтны жагсаалт ачаалж чадсангүй.",
      );
    }
  }, [api, branch]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <>
      {
        <div className="live-branch-filter">
          <label>
            Салбар
            <select
              aria-label="Хүний нөөцийн салбар"
              value={branch}
              onChange={(event) => {
                setBranch(event.target.value);
                setTeam(null);
              }}
            >
              {session.branchIds.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>
      }
      {error ? <ErrorState message={error} retry={load} /> : null}
      {!team ? (
        <LoadingState label="Салбарын ажилтнуудыг ачаалж байна…" />
      ) : (
        <TeamView api={api} team={team} onRefresh={load} />
      )}
    </>
  );
}

function CeoOverview({
  dashboard,
  onNavigate,
  onOpenBranch,
}: {
  dashboard: CompanyDashboard;
  onNavigate: (view: CeoView) => void;
  onOpenBranch: (branch: string) => void;
}) {
  const percent = dashboard.totals.active_target
    ? (dashboard.totals.actual_sales / dashboard.totals.active_target) * 100
    : 0;
  const progressState = salesProgressState(
    percent,
    Boolean(dashboard.totals.active_target),
  );
  return (
    <>
      <PageHeading
        eyebrow={`${monthLabel(dashboard.month)} · бүх салбар`}
        title="Удирдлагын төв"
        description="Борлуулалтын явц, салбарын гүйцэтгэл болон шийдвэр хүлээж буй ажлыг нэг дор хянана."
        action={
          <span className="live-data-freshness">
            <Clock3 size={16} />
            Сүүлд шинэчилсэн {formatDateTime(dashboard.generated_at)}
          </span>
        }
      />
      <section
        className="live-sales-hero live-sales-hero--ceo"
        data-progress={progressState.tone}
      >
        <header>
          <div>
            <span>Энэ сарын төлөгдсөн борлуулалт</span>
            <h2>
              {dashboard.totals.active_target
                ? `${Math.round(percent)}% биелэлт`
                : "Сарын зорилго батлагдаагүй"}
            </h2>
          </div>
          <div className="live-sales-hero-status">
            <b>{progressState.label}</b>
            <BarChart3 size={28} />
          </div>
        </header>
        <div className="live-sales-facts">
          <span className="is-primary">
            <small>Төлөгдсөн борлуулалт</small>
            <strong>{formatMoney(dashboard.totals.actual_sales)}</strong>
          </span>
          <span>
            <small>Батлагдсан нийт зорилго</small>
            <strong>
              {dashboard.totals.active_target
                ? formatMoney(dashboard.totals.active_target)
                : "—"}
            </strong>
          </span>
          <span>
            <small>Биелүүлэх үлдэгдэл</small>
            <strong>
              {dashboard.totals.active_target
                ? formatMoney(
                    Math.max(
                      dashboard.totals.active_target -
                        dashboard.totals.actual_sales,
                      0,
                    ),
                  )
                : "—"}
            </strong>
          </span>
        </div>
        {dashboard.totals.active_target ? (
          <Progress value={percent} label="Борлуулалтын зорилгын биелэлт" />
        ) : null}
        <footer>
          <span>Төлөгдсөн POS баримтын баталгаатай нийлбэр</span>
          <button type="button" onClick={() => onNavigate("branches")}>
            Салбарын гүйцэтгэл
            <ChevronRight size={16} />
          </button>
        </footer>
      </section>
      <section className="live-metrics">
        <Metric
          icon={Building2}
          label="Салбар"
          value={dashboard.branches.length}
          hint="Системд бүртгэлтэй"
        />
        <Metric
          icon={Users}
          label="Идэвхтэй ажилтан"
          value={dashboard.totals.active_team_members}
          hint="Салбарт оноогдсон"
          tone="violet"
        />
        <Metric
          icon={ContactRound}
          label="Харилцагч"
          value={dashboard.totals.customers}
          hint="Борлуулалт эсвэл айлчлалтай"
          tone="green"
        />
        <Metric
          icon={BadgeCheck}
          label="Шийдвэр хүлээсэн зорилго"
          value={dashboard.totals.pending_goals}
          hint="Менежерээс ирсэн санал"
          tone={dashboard.totals.pending_goals ? "amber" : "green"}
        />
      </section>
      <div className="live-two-columns">
        <section className="live-panel">
          <header>
            <div>
              <span>Салбарууд</span>
              <h2>Төлөгдсөн борлуулалт</h2>
            </div>
            <button type="button" onClick={() => onNavigate("branches")}>
              Бүгдийг харах
            </button>
          </header>
          <div className="live-branch-rows">
            {dashboard.branches.map((branch) => (
              <button
                className="live-branch-row-button"
                key={branch.branch}
                type="button"
                onClick={() => onOpenBranch(branch.branch)}
                aria-label={`${branch.branch} салбарын дэлгэрэнгүй`}
              >
                <span className="live-avatar">{branch.branch.slice(0, 2)}</span>
                <div>
                  <strong>{branch.branch}</strong>
                  {branch.active_target ? (
                    <Progress
                      value={branch.achievement_percent ?? 0}
                      label={`${branch.branch} салбарын биелэлт`}
                    />
                  ) : null}
                  <small>
                    {formatMoney(branch.actual_sales)} ·{" "}
                    {branch.active_target
                      ? `${Math.round(branch.achievement_percent ?? 0)}%`
                      : "зорилго батлагдаагүй"}
                  </small>
                </div>
                <b>{branch.active_team_members} хүн</b>
                <ChevronRight size={17} />
              </button>
            ))}
          </div>
        </section>
        <section className="live-panel">
          <header>
            <div>
              <span>Шийдвэрлэх хүсэлт</span>
              <h2>Захирлын дараалал</h2>
            </div>
          </header>
          <div className="live-action-list">
            <button type="button" onClick={() => onNavigate("approvals")}>
              <BadgeCheck size={19} />
              <span>
                <strong>Борлуулалтын зорилгын санал</strong>
                <small>Менежерүүдээс ирсэн</small>
              </span>
              <b>{dashboard.totals.pending_goals}</b>
            </button>
            <button type="button" onClick={() => onNavigate("workforce")}>
              <Users size={19} />
              <span>
                <strong>Хүлээгдэж буй чөлөө</strong>
                <small>Салбарын менежер шийдвэрлэнэ</small>
              </span>
              <b>{dashboard.totals.pending_leave}</b>
            </button>
            <button type="button" onClick={() => onNavigate("penalties")}>
              <ShieldAlert size={19} />
              <span>
                <strong>Ирцийн шийдвэр</strong>
                <small>Менежерийн хяналт хүлээж буй</small>
              </span>
              <b>{dashboard.totals.pending_penalties}</b>
            </button>
          </div>
        </section>
      </div>
    </>
  );
}

function CeoBranches({
  dashboard,
  selectedBranch,
  onSelectBranch,
}: {
  dashboard: CompanyDashboard;
  selectedBranch: string;
  onSelectBranch: (branch: string) => void;
}) {
  return (
    <>
      <PageHeading
        eyebrow="Компанийн дөрвөн салбар"
        title="Салбарын гүйцэтгэл"
        description="Салбараа дарж борлуулалт, баг, харилцагч болон шийдвэр хүлээж буй ажлын дэлгэрэнгүйг харна."
      />
      <section className="live-branch-grid">
        {dashboard.branches.map((branch) => {
          const isOpen = selectedBranch === branch.branch;
          const nonEntertainerTeam = Math.max(
            branch.active_team_members - branch.active_entertainers,
            0,
          );
          return (
            <article className={isOpen ? "expanded" : ""} key={branch.branch}>
              <button
                className="live-branch-card-summary"
                type="button"
                aria-expanded={isOpen}
                aria-controls={`branch-detail-${branch.branch}`}
                onClick={() => onSelectBranch(isOpen ? "" : branch.branch)}
              >
                <span className="live-avatar live-avatar--large">
                  {branch.branch.slice(0, 2)}
                </span>
                <span>
                  <strong>{branch.branch}</strong>
                  <small>
                    {branch.goal
                      ? stateLabel(branch.goal.state)
                      : "Зорилгын санал алга"}
                  </small>
                </span>
                <b>
                  {branch.achievement_percent == null
                    ? "—"
                    : `${Math.round(branch.achievement_percent)}%`}
                </b>
                <ChevronDown size={18} />
              </button>
              <Progress
                value={branch.achievement_percent ?? 0}
                label={`${branch.branch} салбарын биелэлт`}
              />
              <div className="live-branch-card-glance">
                <span>
                  <small>Борлуулалт</small>
                  <strong>{formatMoney(branch.actual_sales)}</strong>
                </span>
                <span>
                  <small>Баг</small>
                  <strong>{branch.active_team_members}</strong>
                </span>
                <span>
                  <small>Харилцагч</small>
                  <strong>{branch.customers}</strong>
                </span>
              </div>
              {isOpen ? (
                <div
                  className="live-branch-detail"
                  id={`branch-detail-${branch.branch}`}
                >
                  <section>
                    <header>
                      <CircleDollarSign size={18} />
                      <h3>Борлуулалт</h3>
                    </header>
                    <dl>
                      <div>
                        <dt>Төлөгдсөн борлуулалт</dt>
                        <dd>{formatMoney(branch.actual_sales)}</dd>
                      </div>
                      <div>
                        <dt>Сарын зорилго</dt>
                        <dd>
                          {branch.active_target
                            ? formatMoney(branch.active_target)
                            : "Зорилго батлагдаагүй"}
                        </dd>
                      </div>
                      <div>
                        <dt>Үлдсэн дүн</dt>
                        <dd>
                          {branch.active_target
                            ? formatMoney(
                                branch.remaining_amount ??
                                  Math.max(
                                    branch.active_target - branch.actual_sales,
                                    0,
                                  ),
                              )
                            : "—"}
                        </dd>
                      </div>
                      <div>
                        <dt>Харилцагчийн нийт зарцуулалт</dt>
                        <dd>{formatMoney(branch.customer_total_spend)}</dd>
                      </div>
                    </dl>
                  </section>
                  <section>
                    <header>
                      <Users size={18} />
                      <h3>Баг</h3>
                    </header>
                    <dl>
                      <div>
                        <dt>Идэвхтэй ажилтан</dt>
                        <dd>{branch.active_team_members}</dd>
                      </div>
                      <div>
                        <dt>Бүжигчин</dt>
                        <dd>{branch.active_entertainers}</dd>
                      </div>
                      <div>
                        <dt>Бусад ажилтан</dt>
                        <dd>{nonEntertainerTeam}</dd>
                      </div>
                      <div>
                        <dt>Харилцагч</dt>
                        <dd>{branch.customers}</dd>
                      </div>
                    </dl>
                  </section>
                  <section>
                    <header>
                      <ListChecks size={18} />
                      <h3>Шийдвэрлэх ажил</h3>
                    </header>
                    <dl>
                      <div>
                        <dt>Чөлөөний хүсэлт</dt>
                        <dd>{branch.pending_leave}</dd>
                      </div>
                      <div>
                        <dt>Ирцийн шийдвэр</dt>
                        <dd>{branch.pending_penalties}</dd>
                      </div>
                      <div>
                        <dt>Энэ сарын ирцийн бүртгэл</dt>
                        <dd>{branch.monthly_penalty_records}</dd>
                      </div>
                      <div>
                        <dt>Тооцоонд орсон суутгал</dt>
                        <dd>{formatMoney(branch.approved_penalty_amount)}</dd>
                      </div>
                    </dl>
                  </section>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
    </>
  );
}

function CeoGoals({ dashboard }: { dashboard: CompanyDashboard }) {
  const branchesWithTarget = dashboard.branches.filter(
    (branch) => branch.active_target > 0,
  );
  const achieved = branchesWithTarget.filter(
    (branch) => (branch.achievement_percent ?? 0) >= 100,
  ).length;
  const percent = dashboard.totals.active_target
    ? (dashboard.totals.actual_sales / dashboard.totals.active_target) * 100
    : 0;
  const progressState = salesProgressState(
    percent,
    Boolean(dashboard.totals.active_target),
  );
  const lowestBranch = [...branchesWithTarget].sort(
    (a, b) => (a.achievement_percent ?? 0) - (b.achievement_percent ?? 0),
  )[0];
  return (
    <>
      <PageHeading
        eyebrow={`${monthLabel(dashboard.month)} · компанийн хэмжээнд`}
        title="Борлуулалт ба зорилт"
        description="Компанийн нийт явцыг түрүүлж харж, дараа нь салбар бүрийн санал ба батлагдсан зорилгыг харьцуулна."
      />
      <section
        className="live-sales-hero live-sales-hero--ceo"
        data-progress={progressState.tone}
      >
        <header>
          <div>
            <span>Компанийн сарын зорилгын явц</span>
            <h2>
              {dashboard.totals.active_target
                ? `${Math.round(percent)}% биелэлт`
                : "Сарын зорилго батлагдаагүй"}
            </h2>
          </div>
          <div className="live-sales-hero-status">
            <b>{progressState.label}</b>
            <Target size={28} />
          </div>
        </header>
        <div className="live-sales-facts">
          <span className="is-primary">
            <small>Бодит борлуулалт</small>
            <strong>{formatMoney(dashboard.totals.actual_sales)}</strong>
          </span>
          <span>
            <small>Батлагдсан зорилго</small>
            <strong>
              {dashboard.totals.active_target
                ? formatMoney(dashboard.totals.active_target)
                : "—"}
            </strong>
          </span>
          <span>
            <small>Биелүүлэх үлдэгдэл</small>
            <strong>
              {dashboard.totals.active_target
                ? formatMoney(
                    Math.max(
                      dashboard.totals.active_target -
                        dashboard.totals.actual_sales,
                      0,
                    ),
                  )
                : "—"}
            </strong>
          </span>
        </div>
        {dashboard.totals.active_target ? (
          <Progress
            value={percent}
            label="Компанийн борлуулалтын зорилгын биелэлт"
          />
        ) : null}
        <footer>
          <span>
            {lowestBranch
              ? `Хамгийн бага биелэлт: ${lowestBranch.branch} · ${Math.round(lowestBranch.achievement_percent ?? 0)}%`
              : "Салбарын батлагдсан зорилго хүлээгдэж байна."}
          </span>
          <span className="live-sales-summary">
            {achieved}/{branchesWithTarget.length} салбар зорилго биелүүлсэн
          </span>
        </footer>
      </section>
      <section className="live-metrics live-metrics--decision">
        <Metric
          icon={Target}
          label="Зорилготой салбар"
          value={`${branchesWithTarget.length}/${dashboard.branches.length}`}
          hint="CEO баталсан зорилготой"
        />
        <Metric
          icon={BadgeCheck}
          label="Шийдвэр хүлээж буй"
          value={dashboard.totals.pending_goals}
          hint="Менежерийн санал"
          tone={dashboard.totals.pending_goals ? "amber" : "green"}
        />
        <Metric
          icon={TrendingUp}
          label="Зорилго биелүүлсэн"
          value={achieved}
          hint="100% болон түүнээс дээш"
          tone="green"
        />
      </section>
      <section className="live-section-heading">
        <div>
          <span>Салбарын харьцуулалт</span>
          <h2>Зорилгын дэлгэрэнгүй</h2>
        </div>
        <small>Бодит дүнг батлагдсан зорилготой харьцуулсан</small>
      </section>
      <section className="live-branch-grid live-sales-branch-grid">
        {dashboard.branches.map((branch) => {
          const branchState = salesProgressState(
            branch.achievement_percent ?? 0,
            Boolean(branch.active_target),
          );
          return (
            <article data-progress={branchState.tone} key={branch.branch}>
              <header>
                <span className="live-avatar live-avatar--large">
                  {branch.branch.slice(0, 2)}
                </span>
                <div>
                  <h2>{branch.branch}</h2>
                  <p>
                    {branch.goal
                      ? stateLabel(branch.goal.state)
                      : "Зорилгын санал ирээгүй"}
                  </p>
                </div>
                <span className="live-branch-achievement">
                  <b>
                    {branch.achievement_percent == null
                      ? "—"
                      : `${Math.round(branch.achievement_percent)}%`}
                  </b>
                  <small>{branchState.label}</small>
                </span>
              </header>
              <Progress
                value={branch.achievement_percent ?? 0}
                label={`${branch.branch} салбарын зорилгын биелэлт`}
              />
              <dl>
                <div className="is-primary">
                  <dt>Бодит борлуулалт</dt>
                  <dd>{formatMoney(branch.actual_sales)}</dd>
                </div>
                <div>
                  <dt>CEO баталсан</dt>
                  <dd>
                    {branch.active_target
                      ? formatMoney(branch.active_target)
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt>Биелүүлэх үлдэгдэл</dt>
                  <dd>
                    {branch.active_target
                      ? formatMoney(
                          Math.max(
                            branch.active_target - branch.actual_sales,
                            0,
                          ),
                        )
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt>Менежерийн санал</dt>
                  <dd>
                    {branch.goal?.proposed_target
                      ? formatMoney(branch.goal.proposed_target)
                      : "—"}
                  </dd>
                </div>
              </dl>
              {branch.goal?.decision_comment ? (
                <p className="live-decision-note">
                  <strong>CEO-ийн тайлбар:</strong>{" "}
                  {branch.goal.decision_comment}
                </p>
              ) : null}
            </article>
          );
        })}
      </section>
    </>
  );
}

function CeoGoalApprovalCard({
  goal,
  busy,
  onDecide,
}: {
  goal: BranchSalesGoalRecord;
  busy: boolean;
  onDecide: (
    goal: BranchSalesGoalRecord,
    decision: "approve" | "revision" | "reject",
    comment: string,
    approvedTarget?: number,
  ) => Promise<void>;
}) {
  const [approvedTarget, setApprovedTarget] = useState(
    String(goal.proposed_target ?? ""),
  );
  const [comment, setComment] = useState("");
  const [validation, setValidation] = useState("");

  async function decide(decision: "approve" | "revision" | "reject") {
    const amount = Number(approvedTarget);
    if (decision === "approve" && (!Number.isFinite(amount) || amount <= 0)) {
      setValidation("Батлах дүнгээ оруулна уу.");
      return;
    }
    if (decision !== "approve" && comment.trim().length < 5) {
      setValidation(
        decision === "revision"
          ? "Засварлах зүйлээ товч бичнэ үү."
          : "Татгалзсан шалтгаанаа товч бичнэ үү.",
      );
      return;
    }
    setValidation("");
    await onDecide(
      goal,
      decision,
      comment.trim(),
      decision === "approve" ? amount : undefined,
    );
  }

  return (
    <article className="live-request-card live-goal-approval">
      <header>
        <span className="live-avatar">{goal.branch?.slice(0, 2)}</span>
        <div>
          <h2>
            {goal.branch} · {monthLabel(String(goal.goal_month).slice(0, 7))}
          </h2>
          <p>
            {goal.submitted_by ?? "Салбарын менежер"} ·{" "}
            {goal.submitted_at ? formatDateTime(goal.submitted_at) : "Илгээсэн"}
          </p>
        </div>
        <b>{stateLabel(goal.state)}</b>
      </header>
      <div className="live-penalty-facts">
        <span>
          <small>Менежерийн санал</small>
          <strong>{formatMoney(goal.proposed_target ?? 0)}</strong>
        </span>
        <span>
          <small>Өмнөх сарын борлуулалт</small>
          <strong>{formatMoney(goal.baseline_amount ?? 0)}</strong>
        </span>
      </div>
      <blockquote>{goal.manager_rationale || "Үндэслэл оруулаагүй."}</blockquote>
      <div className="live-goal-decision-fields">
        <label>
          <span>Батлах дүн</span>
          <input
            type="number"
            min="1"
            inputMode="numeric"
            value={approvedTarget}
            disabled={busy}
            onChange={(event) => setApprovedTarget(event.target.value)}
          />
          <small>{Number(approvedTarget) > 0 ? formatMoney(Number(approvedTarget)) : "Дүн оруулна уу"}</small>
        </label>
        <label>
          <span>Шийдвэрийн тайлбар</span>
          <textarea
            rows={3}
            value={comment}
            disabled={busy}
            placeholder="Батлахад заавал биш. Буцаах, татгалзахад шалтгаанаа бичнэ."
            onChange={(event) => setComment(event.target.value)}
          />
        </label>
      </div>
      {validation ? <p className="live-inline-error" role="alert">{validation}</p> : null}
      <footer>
        <button disabled={busy} type="button" onClick={() => void decide("reject")}>
          Татгалзах
        </button>
        <button disabled={busy} type="button" onClick={() => void decide("revision")}>
          Засвар хүсэх
        </button>
        <button
          className="live-button--primary"
          disabled={busy}
          type="button"
          onClick={() => void decide("approve")}
        >
          {busy ? "Хадгалж байна…" : "Дүнг батлах"}
        </button>
      </footer>
    </article>
  );
}

function CeoApprovals({
  api,
  dashboard,
  onRefresh,
}: {
  api: FrappeManagementApi;
  dashboard: CompanyDashboard;
  onRefresh: () => Promise<void>;
}) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  async function decide(
    goal: BranchSalesGoalRecord,
    decision: "approve" | "revision" | "reject",
    comment: string,
    approvedTarget?: number,
  ) {
    setBusy(goal.name);
    setError("");
    try {
      await api.decideGoal(
        goal.name,
        decision,
        comment,
        goal.modified,
        approvedTarget,
      );
      await onRefresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Шийдвэр хадгалж чадсангүй.",
      );
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="Захирлын эцсийн шийдвэр"
        title="Менежерүүдээс ирсэн хүсэлт"
        description="Менежерийн саналын дүнг хэвээр батлах эсвэл өөрчилж батална."
      />
      {error ? <ErrorState message={error} /> : null}
      <section className="live-card-grid">
        {dashboard.pending_goals.map((goal) => (
          <CeoGoalApprovalCard
            key={goal.name}
            goal={goal}
            busy={busy === goal.name}
            onDecide={decide}
          />
        ))}
        {!dashboard.pending_goals.length ? (
          <p className="live-empty live-empty--card">
            <BadgeCheck size={28} />
            Шийдвэр хүлээсэн борлуулалтын зорилгын санал алга.
          </p>
        ) : null}
      </section>
    </>
  );
}

function CeoRankApprovals({ api }: { api: FrappeManagementApi }) {
  const [reviews, setReviews] = useState<RankReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const requestKeys = useRef(new Map<string, string>());
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setReviews((await api.getCeoRankReviews("Submitted")).reviews);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Зэрэглэлийн санал ачаалж чадсангүй.",
      );
    } finally {
      setLoading(false);
    }
  }, [api]);
  useEffect(() => {
    void load();
  }, [load]);
  async function decide(
    review: RankReview,
    decision: "approve" | "return" | "reject",
  ) {
    const entered = window.prompt(
      decision === "approve"
        ? "Шийдвэрийн тайлбар:"
        : decision === "return"
          ? "Засварлах шаардлагыг бичнэ үү:"
          : "Татгалзсан шалтгааныг бичнэ үү:",
    );
    if (entered === null || entered.trim().length < 5) return;
    const reason = entered.trim();
    const fingerprint = `${review.name}|${review.modified}|${decision}|${reason}`;
    let key = requestKeys.current.get(fingerprint);
    if (!key) {
      key = idempotencyKey("ceo-rank-decision");
      requestKeys.current.set(fingerprint, key);
    }
    setBusy(review.name);
    setError("");
    try {
      await api.decideRankReview(
        review.name,
        decision,
        reason,
        review.modified,
        key,
      );
      requestKeys.current.delete(fingerprint);
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Зэрэглэлийн шийдвэр хадгалж чадсангүй.",
      );
    } finally {
      setBusy("");
    }
  }
  return (
    <section className="live-rank-approvals">
      <header className="live-section-heading">
        <div>
          <span>Зэрэглэлийн засаглал</span>
          <h2>Зэрэглэл ахиулах санал</h2>
          <p>
            Менежерийн үндэслэл, оноо болон одоогийн зэрэглэлийг шалгаж эцсийн
            шийдвэр гаргана.
          </p>
        </div>
        <b>{reviews.length}</b>
      </header>
      {error ? <ErrorState message={error} retry={load} /> : null}
      {loading ? (
        <LoadingState label="Зэрэглэлийн санал ачаалж байна…" />
      ) : (
        <div className="live-card-grid">
          {reviews.map((review) => (
            <article className="live-request-card" key={review.name}>
              <header>
                <span className="live-avatar">
                  {review.display_name.slice(0, 2)}
                </span>
                <div>
                  <h2>{review.display_name}</h2>
                  <p>
                    {review.branch} ·{" "}
                    {review.submitted_at
                      ? formatDateTime(review.submitted_at)
                      : "Илгээсэн"}
                  </p>
                </div>
                <b>{stateLabel(review.status)}</b>
              </header>
              <div className="live-penalty-facts">
                <span>
                  <small>Одоогийн</small>
                  <strong>{stateLabel(review.from_rank)}</strong>
                </span>
                <span>
                  <small>Санал</small>
                  <strong>{stateLabel(review.recommended_rank)}</strong>
                </span>
                <span>
                  <small>Оноо</small>
                  <strong>{Math.round(review.points)}</strong>
                </span>
              </div>
              <blockquote>{review.manager_reason}</blockquote>
              <footer>
                <button
                  disabled={busy === review.name}
                  type="button"
                  onClick={() => void decide(review, "reject")}
                >
                  Татгалзах
                </button>
                <button
                  disabled={busy === review.name}
                  type="button"
                  onClick={() => void decide(review, "return")}
                >
                  Засвар хүсэх
                </button>
                <button
                  className="live-button--primary"
                  disabled={busy === review.name}
                  type="button"
                  onClick={() => void decide(review, "approve")}
                >
                  Зэрэглэл батлах
                </button>
              </footer>
            </article>
          ))}
          {!reviews.length ? (
            <p className="live-empty live-empty--card">
              <BadgeCheck size={28} />
              Шийдвэр хүлээсэн зэрэглэлийн санал алга.
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}

function CeoDecisionCenter({
  api,
  dashboard,
  onRefresh,
}: {
  api: FrappeManagementApi;
  dashboard: CompanyDashboard;
  onRefresh: () => Promise<void>;
}) {
  return (
    <>
      <CeoApprovals api={api} dashboard={dashboard} onRefresh={onRefresh} />
      <CeoRankApprovals api={api} />
    </>
  );
}

function CeoWorkforce({
  api,
  dashboard,
  onRefresh,
}: {
  api: FrappeManagementApi;
  dashboard: CompanyDashboard;
  onRefresh: () => Promise<void>;
}) {
  const [employees, setEmployees] = useState<UnassignedEmployee[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<UnassignedEmployee | null>(null);
  const [branch, setBranch] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const load = useCallback(
    async (query = "") => {
      setLoading(true);
      setError("");
      try {
        const result = await api.getUnassignedEmployees({
          search: query || undefined,
          limit: 50,
        });
        setEmployees(result.employees);
        setBranches(result.branches);
        setTotal(result.meta.total);
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Салбаргүй ажилтны жагсаалт ачаалж чадсангүй.",
        );
      } finally {
        setLoading(false);
      }
    },
    [api],
  );
  useEffect(() => {
    void load();
  }, [load]);
  function openAssign(employee: UnassignedEmployee) {
    setEditing(employee);
    setBranch(branches[0] ?? dashboard.branches[0]?.branch ?? "");
    setReason("");
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!editing || !branch) return;
    if (reason.trim().length < 5) {
      setError("Салбар оноосон үндэслэлийг 5-аас дээш тэмдэгтээр бичнэ үү.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.assignEmployeeBranch(
        editing.name,
        branch,
        reason,
        editing.modified,
      );
      setEditing(null);
      await Promise.all([load(search), onRefresh()]);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Салбар оноож чадсангүй.",
      );
    } finally {
      setSaving(false);
    }
  }
  function searchSubmit(event: FormEvent) {
    event.preventDefault();
    void load(search);
  }
  return (
    <>
      <PageHeading
        eyebrow="Компанийн ажиллах хүч"
        title="Салбарын баг ба ирцийн эрсдэл"
        description="Салбар бүрт оноогдсон бүх идэвхтэй ажилтан, энтертайнер, чөлөө болон торгуулийн шийдвэрийн хүлээлтийг нэгтгэн хянана."
      />
      <section className="live-metrics">
        <Metric
          icon={Users}
          label="Салбартай идэвхтэй баг"
          value={dashboard.totals.active_team_members}
          hint="Дөрвөн салбарт баталгаатай оноогдсон"
        />
        <Metric
          icon={AlertTriangle}
          label="Салбаргүй ажилтан"
          value={dashboard.totals.unassigned_active_employees}
          hint="Салбар оноох шаардлагатай"
          tone="amber"
        />
        <Metric
          icon={Gem}
          label="Энтертайнер"
          value={dashboard.totals.active_entertainers}
          hint="Идэвхтэй тусгай профайл"
          tone="violet"
        />
        <Metric
          icon={ClipboardCheck}
          label="Чөлөө хүлээгдэж буй"
          value={dashboard.totals.pending_leave}
          hint="Менежерүүд шийдвэрлэнэ"
          tone="amber"
        />
        <Metric
          icon={ShieldAlert}
          label="Торгууль хүлээгдэж буй"
          value={dashboard.totals.pending_penalties}
          hint="Нотолгооны хяналт"
          tone="red"
        />
      </section>
      <section className="live-policy-note">
        <AlertTriangle size={19} />
        <div>
          <strong>Салбаргүй ажилтныг таамгаар хуваарилахгүй</strong>
          <span>
            {dashboard.totals.unassigned_active_employees} идэвхтэй ажилтанд
            баталгаатай салбар оноосны дараа тухайн менежерийн баг болон
            хуваарьт автоматаар орно. Өөрчлөлт бүр аудитын бүртгэлтэй.
          </span>
        </div>
      </section>
      <section className="live-panel live-assignment-panel">
        <header>
          <div>
            <span>Өгөгдлийн чанарын ажил</span>
            <h2>Салбаргүй ажилтанд салбар оноох</h2>
          </div>
          <form className="live-search" onSubmit={searchSubmit}>
            <Search size={17} />
            <input
              aria-label="Салбаргүй ажилтан хайх"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Нэр, ID, албан тушаалаар хайх"
            />
            <button type="submit">Хайх</button>
          </form>
        </header>
        {error ? (
          <ErrorState message={error} retry={() => load(search)} />
        ) : null}
        {loading ? (
          <LoadingState label="Салбаргүй ажилтнуудыг ачаалж байна…" />
        ) : (
          <>
            <div className="live-unassigned-summary">
              <strong>{total}</strong>
              <span>тохирох салбаргүй идэвхтэй ажилтан</span>
            </div>
            <div className="live-table-list live-employee-assignment">
              <div className="head">
                <span>Ажилтан</span>
                <span>Ажилтны ID</span>
                <span>Албан тушаал</span>
                <span>Хэлтэс</span>
                <span>Үйлдэл</span>
              </div>
              {employees.map((employee) => {
                const employeeLabel = employee.employee_name || employee.name;
                return (
                  <article key={employee.name}>
                    <span>
                      <i className="live-avatar">{employeeLabel.slice(0, 2)}</i>
                      <strong>{employeeLabel}</strong>
                    </span>
                    <span>{employee.name}</span>
                    <span>{employee.designation || "Тодорхойгүй"}</span>
                    <span>{employee.department || "Тодорхойгүй"}</span>
                    <span>
                      <button
                        className="live-button--primary"
                        type="button"
                        onClick={() => openAssign(employee)}
                      >
                        Салбар оноох
                      </button>
                    </span>
                  </article>
                );
              })}
            </div>
            {!employees.length ? (
              <p className="live-empty">Тохирох салбаргүй ажилтан олдсонгүй.</p>
            ) : total > employees.length ? (
              <p className="live-assignment-note">
                Эхний {employees.length} ажилтан харагдаж байна. Хайлтаар
                ажилтнаа нарийвчилна уу.
              </p>
            ) : null}
          </>
        )}
      </section>
      <section className="live-panel">
        <div className="live-table-list">
          <div className="head">
            <span>Салбар</span>
            <span>Идэвхтэй баг</span>
            <span>Энтертайнер</span>
            <span>Чөлөө</span>
            <span>Торгууль</span>
          </div>
          {dashboard.branches.map((item) => (
            <article key={item.branch}>
              <span>
                <i className="live-avatar">{item.branch.slice(0, 2)}</i>
                <strong>{item.branch}</strong>
              </span>
              <span>{item.active_team_members}</span>
              <span>{item.active_entertainers}</span>
              <span>{item.pending_leave}</span>
              <span>{item.pending_penalties}</span>
            </article>
          ))}
        </div>
      </section>
      {editing ? (
        <div
          className="live-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="branch-assignment-title"
        >
          <form onSubmit={submit}>
            <header>
              <div>
                <span>Салбарын баталгаажуулалт</span>
                <h2 id="branch-assignment-title">
                  {editing.employee_name || editing.name}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Хаах"
                onClick={() => setEditing(null)}
              >
                <X />
              </button>
            </header>
            <p className="live-modal-copy">
              {editing.name} ·{" "}
              {editing.designation ||
                editing.department ||
                "Албан тушаал тодорхойгүй"}
            </p>
            <label>
              <span>Оноох салбар</span>
              <select
                aria-label="Оноох салбар"
                value={branch}
                onChange={(event) => setBranch(event.target.value)}
              >
                {branches.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Оноосон үндэслэл</span>
              <textarea
                aria-label="Оноосон үндэслэл"
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Жишээ: Хөдөлмөрийн гэрээ болон салбарын бүртгэлтэй тулгав"
              />
            </label>
            <footer>
              <button type="button" onClick={() => setEditing(null)}>
                Цуцлах
              </button>
              <button
                className="live-button--primary"
                disabled={saving}
                type="submit"
              >
                {saving ? "Хадгалж байна…" : "Баталгаажуулж оноох"}
              </button>
            </footer>
          </form>
        </div>
      ) : null}
    </>
  );
}

function CeoAiAssistantWorkspace({
  dashboard,
  onNavigate,
}: {
  dashboard: CompanyDashboard;
  onNavigate: (view: CeoView) => void;
}) {
  const attentionBranches = [...dashboard.branches]
    .filter(
      (branch) =>
        branch.active_target > 0 && (branch.achievement_percent ?? 0) < 75,
    )
    .sort(
      (a, b) => (a.achievement_percent ?? 0) - (b.achievement_percent ?? 0),
    );
  const lead = attentionBranches[0];
  const companyPercent = dashboard.totals.active_target
    ? (dashboard.totals.actual_sales / dashboard.totals.active_target) * 100
    : 0;
  return (
    <>
      <PageHeading
        eyebrow="AI ТУСЛАХ"
        title="Өнөөдрийн удирдлагын туслах"
        description="Баталгаатай мэдээллээс анхаарах ажлыг түрүүлж харуулна. Эцсийн шийдвэрийг хүн гаргана."
        action={
          <span className="live-data-freshness">
            <Clock3 size={16} />
            Эх өгөгдөл: {formatDateTime(dashboard.generated_at)}
          </span>
        }
      />
      <section className="live-policy-note live-hermes-pending">
        <AlertTriangle size={19} />
        <div>
          <strong>AI туслахын шууд холболт хүлээгдэж байна</strong>
          <span>
            Одоогийн мэдээлэл нь AI дүгнэлт биш. Борлуулалтын биелэлт ба
            шийдвэрийн тоонд тулгуурласан дүрмийн тойм.
          </span>
        </div>
      </section>
      <section className="live-hermes-command">
        <article
          className="live-panel live-hermes-lead"
          data-tone={lead ? "attention" : "healthy"}
        >
          <header>
            <div>
              <span>Нэн түрүүнд</span>
              <h2>
                {lead
                  ? `${lead.branch} салбарын зорилгын явцыг шалгах`
                  : "Салбарын зорилгын явц хэвийн"}
              </h2>
            </div>
            {lead ? <AlertTriangle size={23} /> : <BadgeCheck size={23} />}
          </header>
          {lead ? (
            <>
              <p>
                {lead.branch} салбар {Math.round(lead.achievement_percent ?? 0)}
                % биелэлттэй, зорилгод хүрэхэд{" "}
                {formatMoney(
                  lead.remaining_amount ??
                    Math.max(lead.active_target - lead.actual_sales, 0),
                )}{" "}
                үлдсэн.
              </p>
              <dl>
                <div>
                  <dt>Бодит борлуулалт</dt>
                  <dd>{formatMoney(lead.actual_sales)}</dd>
                </div>
                <div>
                  <dt>Батлагдсан зорилго</dt>
                  <dd>{formatMoney(lead.active_target)}</dd>
                </div>
                <div>
                  <dt>Тооцоолсон биелэлт</dt>
                  <dd>{Math.round(lead.achievement_percent ?? 0)}%</dd>
                </div>
              </dl>
            </>
          ) : (
            <p>
              75%-иас доош биелэлттэй, батлагдсан зорилготой салбар одоогоор
              алга.
            </p>
          )}
          <footer>
            <button
              className="live-button--primary"
              type="button"
              onClick={() => onNavigate("branches")}
            >
              Салбарын гүйцэтгэл харах
              <ChevronRight size={16} />
            </button>
          </footer>
        </article>
        <aside className="live-panel live-hermes-evidence">
          <header>
            <div>
              <span>Тайлбар ба хил хязгаар</span>
              <h2>Яагаад энэ мэдээлэл гарсан бэ?</h2>
            </div>
            <ShieldCheck size={21} />
          </header>
          <ul>
            <li>
              Компанийн биелэлт:{" "}
              <strong>
                {dashboard.totals.active_target
                  ? `${Math.round(companyPercent)}%`
                  : "Зорилгогүй"}
              </strong>
            </li>
            <li>
              75%-иас доош салбар: <strong>{attentionBranches.length}</strong>
            </li>
            <li>
              Шийдвэр хүлээсэн зорилго:{" "}
              <strong>{dashboard.totals.pending_goals}</strong>
            </li>
          </ul>
          <p>
            AI туслах нь зорилго батлах, төлбөр хийх, ажилтны зэрэглэл өөрчлөх
            эрхгүй.
          </p>
        </aside>
      </section>
      <section className="live-panel live-hermes-queue">
        <header>
          <div>
            <span>Анхаарах дараалал</span>
            <h2>Дүрмээр илэрсэн салбарууд</h2>
          </div>
          <b>{attentionBranches.length}</b>
        </header>
        <div>
          {attentionBranches.map((branch, index) => (
            <button
              key={branch.branch}
              type="button"
              onClick={() => onNavigate("branches")}
            >
              <strong>{index + 1}</strong>
              <span>
                <b>{branch.branch}</b>
                <small>
                  {formatMoney(branch.actual_sales)} /{" "}
                  {formatMoney(branch.active_target)}
                </small>
              </span>
              <em>{Math.round(branch.achievement_percent ?? 0)}%</em>
              <ChevronRight size={17} />
            </button>
          ))}
          {!attentionBranches.length ? (
            <p className="live-empty">Яаралтай анхаарах салбар илрээгүй.</p>
          ) : null}
        </div>
        <footer>
          <button type="button" onClick={() => onNavigate("goals")}>
            Борлуулалт ба зорилт
          </button>
          {dashboard.totals.pending_goals ? (
            <button type="button" onClick={() => onNavigate("approvals")}>
              Шийдвэр хүлээсэн санал ({dashboard.totals.pending_goals})
            </button>
          ) : null}
        </footer>
      </section>
    </>
  );
}

function ErpModuleView({
  view,
}: {
  view: Extract<CeoView, "finance" | "tasks" | "messages" | "reports">;
}) {
  const config = {
    finance: {
      title: "Санхүү ба тооцоо",
      description: "Баталгаатай санхүү, төлбөр, тооцооны ажлын орчин.",
      items: [
        "Нягтлан бодох бүртгэл",
        "Борлуулалтын нэхэмжлэл",
        "Төлбөрийн бүртгэл",
      ],
    },
    tasks: {
      title: "Даалгавар",
      description: "Хариуцагч, хугацаа, явц, үр дүнгийн баталгаатай бүртгэл.",
      items: ["Даалгаврын жагсаалт", "Хийх ажил", "Төсөл"],
    },
    messages: {
      title: "Мессеж ба харилцаа",
      description: "Мэдэгдэл, харилцаа, хариуцлагын түүх.",
      items: ["Харилцааны түүх", "Мэдэгдэл", "И-мэйл дараалал"],
    },
    reports: {
      title: "Тайлан, шинжилгээ",
      description: "Борлуулалт, ажиллах хүчний баталгаатай эх тайлан.",
      items: ["Тайлан бүтээгч", "Борлуулалтын шинжилгээ", "Ажилтны шинжилгээ"],
    },
  }[view];
  return (
    <>
      <PageHeading
        eyebrow="Үндсэн ажлын хэсэг"
        title={config.title}
        description={config.description}
      />
      <section className="live-policy-note live-coming-soon-note">
        <Clock3 size={19} />
        <div>
          <strong>Тун удахгүй</strong>
          <span>Энэ хэсгийн бэлтгэл дуусах хүртэл нээхгүй.</span>
        </div>
      </section>
      <section className="live-erp-links">
        {config.items.map((label) => (
          <button
            key={label}
            type="button"
            disabled
            aria-label={`${label} — Тун удахгүй`}
          >
            <span>
              <h2>{label}</h2>
              <p>Тун удахгүй</p>
            </span>
            <Clock3 />
          </button>
        ))}
      </section>
    </>
  );
}

function CeoLiveApp({
  api,
  session,
  view,
  onNavigate,
}: {
  api: FrappeManagementApi;
  session: ManagementSession;
  view: CeoView;
  onNavigate: (view: CeoView) => void;
}) {
  const [dashboard, setDashboard] = useState<CompanyDashboard | null>(null);
  const [penalties, setPenalties] = useState<PenaltyRow[]>([]);
  const [selectedBranch, setSelectedBranch] = useState(
    session.branchIds[0] ?? "",
  );
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setError("");
    try {
      setDashboard(await api.getCompanyDashboard(currentMonth()));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Компанийн мэдээлэл ачаалж чадсангүй.",
      );
    }
  }, [api]);
  const loadPenalties = useCallback(async () => {
    if (!selectedBranch) return;
    try {
      setPenalties((await api.getPenalties("All", selectedBranch)).penalties);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Торгуулийн мэдээлэл ачаалж чадсангүй.",
      );
    }
  }, [api, selectedBranch]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (view === "penalties") void loadPenalties();
  }, [loadPenalties, view]);
  useEffect(() => {
    if (view !== "penalties") setError("");
  }, [view]);
  if (view === "demo-report") return <DemoRankReportView api={api} />;
  if (error && !dashboard) return <ErrorState message={error} retry={load} />;
  if (!dashboard) return <LoadingState />;
  const openBranch = (branch: string) => {
    setSelectedBranch(branch);
    onNavigate("branches");
  };
  return (
    <>
      {error ? <ErrorState message={error} retry={load} /> : null}
      {view === "overview" ? (
        <CeoOverview
          dashboard={dashboard}
          onNavigate={onNavigate}
          onOpenBranch={openBranch}
        />
      ) : null}
      {view === "branches" ? (
        <CeoBranches
          dashboard={dashboard}
          selectedBranch={selectedBranch}
          onSelectBranch={setSelectedBranch}
        />
      ) : null}
      {view === "goals" ? <CeoGoals dashboard={dashboard} /> : null}
      {view === "approvals" ? (
        <CeoDecisionCenter api={api} dashboard={dashboard} onRefresh={load} />
      ) : null}
      {view === "crm" ? (
        <CeoCrmWorkspace
          api={api}
          branches={session.branchIds}
          generatedAt={dashboard.generated_at}
        />
      ) : null}
      {view === "workforce" ? (
        <CeoWorkforce api={api} dashboard={dashboard} onRefresh={load} />
      ) : null}
      {view === "penalties" ? (
        <>
          <div className="live-branch-filter">
            <label>
              Салбар
              <select
                value={selectedBranch}
                onChange={(event) => setSelectedBranch(event.target.value)}
              >
                {session.branchIds.map((branch) => (
                  <option key={branch}>{branch}</option>
                ))}
              </select>
            </label>
          </div>
          <PenaltiesView
            api={api}
            penalties={penalties}
            canDecide={false}
            branch={selectedBranch}
          />
        </>
      ) : null}
      {view === "climate" ? (
        <TeamClimateView api={api} session={session} />
      ) : null}
      {view === "hermes" ? (
        <CeoAiAssistantWorkspace
          dashboard={dashboard}
          onNavigate={onNavigate}
        />
      ) : null}
      {(["finance", "tasks", "messages", "reports"] as CeoView[]).includes(
        view,
      ) ? (
        <ErpModuleView
          view={
            view as Extract<
              CeoView,
              "finance" | "tasks" | "messages" | "reports"
            >
          }
        />
      ) : null}
    </>
  );
}

export default function LiveManagementApplication({
  api,
  session,
  onSignOut,
}: {
  api: FrappeManagementApi;
  session: ManagementSession;
  onSignOut?: () => void | Promise<void>;
}) {
  const [view, setView] = useState<LiveView>(() => viewFromLocation(session));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileBadges, setMobileBadges] = useState({
    entries: 0,
    readiness: 0,
  });
  const [managerProfilePanel, setManagerProfilePanel] =
    useState<ManagerProfilePanel>(() =>
      session.role === "branch-manager" &&
      Boolean(new URLSearchParams(window.location.search).get("attendance"))
        ? "attendance"
        : null,
    );
  const [attendancePayload, setAttendancePayload] = useState<string | undefined>(
    () => new URLSearchParams(window.location.search).get("attendance") || undefined,
  );
  const [guestDetailTarget, setGuestDetailTarget] =
    useState<GuestDetailTarget | null>(null);
  const navigation =
    session.role === "ceo"
      ? ceoNavigation
      : session.role === "hr-manager"
        ? hrNavigation
        : managerNavigation;
  const signOut = async () => {
    if (onSignOut) {
      await onSignOut();
      return;
    }
    try {
      await api.logout();
    } catch {
      /* Demo and tests still clear their own shell. */
    }
    window.location.reload();
  };
  useEffect(() => {
    const resolved = viewFromLocation(session);
    setView(resolved);
    if (new URLSearchParams(window.location.search).get("view") !== resolved) {
      window.history.replaceState(
        { ...window.history.state, view: resolved },
        "",
        locationForView(resolved),
      );
    }
    const restoreView = () => {
      setGuestDetailTarget(null);
      setView(viewFromLocation(session));
      setMobileOpen(false);
      setProfileOpen(false);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("popstate", restoreView);
    return () => window.removeEventListener("popstate", restoreView);
  }, [session]);
  const navigate = useCallback((next: LiveView) => {
    setGuestDetailTarget(null);
    setView(next);
    setMobileOpen(false);
    setProfileOpen(false);
    if (new URLSearchParams(window.location.search).get("view") !== next) {
      window.history.pushState(
        { ...window.history.state, view: next },
        "",
        locationForView(next),
      );
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  const openLeave = useCallback(() => navigate("leave"), [navigate]);
  const openPenalty = useCallback(() => navigate("penalties"), [navigate]);
  const openGuestDetail = useCallback((target: GuestDetailTarget) => {
    setGuestDetailTarget(target);
    setView("entries");
    setMobileOpen(false);
    setProfileOpen(false);
    if (new URLSearchParams(window.location.search).get("view") !== "entries") {
      window.history.pushState(
        { ...window.history.state, view: "entries" },
        "",
        locationForView("entries"),
      );
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  const clearGuestDetail = useCallback(() => setGuestDetailTarget(null), []);
  const updateMobileBadges = useCallback(
    (counts: { guests: number; readiness?: number }) => {
      setMobileBadges((current) => ({
        entries: counts.guests,
        readiness: counts.readiness ?? current.readiness,
      }));
    },
    [],
  );
  const openManagerProfilePanel = useCallback(
    (panel: Exclude<ManagerProfilePanel, null>) => {
      setProfileOpen(false);
      setManagerProfilePanel(panel);
    },
    [],
  );
  const clearAttendancePayload = useCallback(() => {
    setAttendancePayload(undefined);
    const url = new URL(window.location.href);
    url.searchParams.delete("attendance");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
  }, []);
  const navigationLabel =
    session.role === "ceo"
      ? "Гүйцэтгэх захирлын навигац"
      : session.role === "hr-manager"
        ? "Хүний нөөцийн навигац"
        : "Менежерийн навигац";
  const roleLabel =
    session.role === "ceo"
      ? "Гүйцэтгэх захирал"
      : session.role === "hr-manager"
        ? "Хүний нөөцийн менежер"
        : "Салбарын менежер";
  const mobileIds: LiveView[] =
    session.role === "ceo"
      ? ["overview", "branches", "approvals", "hermes"]
      : session.role === "branch-manager"
        ? ["overview", "entries", "readiness", "profile"]
        : [];
  const mobileLabels: Partial<Record<LiveView, string>> = {
    overview: "Тойм",
    branches: "Салбар",
    approvals: "Шийдвэр",
    hermes: "AI туслах",
    entries: "Зочид",
    schedule: "Хуваарь",
    team: "Баг",
    readiness: "Шалгалт",
    rounds: "Гараа",
    profile: "Мэдээлэл",
  };
  const mobileNavigation = mobileIds
    .map((id) => navigation.find((item) => item.id === id))
    .filter((item): item is NavigationItem => Boolean(item));
  const mobileItemActive = (id: LiveView) =>
    view === id || (id === "entries" && view === "crm");
  const badgeForView = (id: LiveView) =>
    session.role !== "branch-manager"
      ? 0
      : id === "entries"
        ? mobileBadges.entries
        : id === "readiness"
          ? mobileBadges.readiness
          : 0;
  const mobileMenuActive =
    mobileOpen || !mobileNavigation.some((item) => mobileItemActive(item.id));

  return (
    <div className="live-app">
      {mobileOpen ? (
        <button
          className="live-sidebar-scrim"
          type="button"
          aria-label="Цэс хаах"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
      <aside className={mobileOpen ? "live-sidebar open" : "live-sidebar"}>
        <header>
          <img
            src={`${import.meta.env.BASE_URL}vip-club-mark.svg`}
            alt="VIP Club"
          />
          <div>
            <strong>VIP CLUB</strong>
            <span>Удирдлагын систем</span>
          </div>
          <button
            type="button"
            aria-label="Цэс хаах"
            onClick={() => setMobileOpen(false)}
          >
            <X />
          </button>
        </header>
        <ScopeBadge session={session} />
        <nav aria-label={navigationLabel}>
          {navigation.map(({ id, label, icon: Icon, badge }) => {
            const count = badge ?? badgeForView(id);
            return (
            <button
              className={mobileItemActive(id) ? "active" : ""}
              aria-current={mobileItemActive(id) ? "page" : undefined}
              key={id}
              type="button"
              onClick={() => navigate(id)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {count ? <b aria-label={`${count} шинэ`}>{count > 99 ? "99+" : count}</b> : null}
            </button>
            );
          })}
        </nav>
        <footer>
          {session.role === "branch-manager" ? (
            <button type="button" onClick={() => navigate("profile")}>
              <UserRound size={17} />
              Миний мэдээлэл
            </button>
          ) : (
            <button type="button" onClick={() => void signOut()}>
              <LogOut size={17} />
              Системээс гарах
            </button>
          )}
        </footer>
      </aside>
      <div className="live-workspace">
        <header className="live-topbar">
          <button
            type="button"
            aria-label="Цэс нээх"
            onClick={() => setMobileOpen(true)}
          >
            <Menu />
          </button>
          <div>
            <ScopeBadge session={session} />
          </div>
          <div className="live-user">
            {session.role === "branch-manager" ? (
              <NotificationCenter
                api={api}
                onOpenLeave={openLeave}
                onOpenPenalty={openPenalty}
                onOpenGuest={openGuestDetail}
                onBadgeChange={updateMobileBadges}
              />
            ) : (
              <button type="button" aria-label="Мэдэгдэл">
                <Bell size={18} />
              </button>
            )}
            <div className="live-profile-wrap">
              <button
                className="live-profile-trigger"
                type="button"
                aria-label="Профайл ба тохиргоо"
                aria-expanded={session.role === "branch-manager" ? undefined : profileOpen}
                aria-controls={session.role === "branch-manager" ? undefined : "manager-profile-menu"}
                onClick={() => session.role === "branch-manager" ? navigate("profile") : setProfileOpen((current) => !current)}
              >
                <span className="live-avatar">{session.initials}</span>
                <span>
                  <strong>{session.displayName}</strong>
                  <small>{roleLabel}</small>
                </span>
                <ChevronDown size={15} />
              </button>
              {profileOpen && session.role !== "branch-manager" ? (
                <div
                  id="manager-profile-menu"
                  className="live-profile-menu"
                  role="dialog"
                  aria-label="Профайл ба тохиргоо"
                >
                  <header>
                    <div>
                      <strong>{session.displayName}</strong>
                      <small>{roleLabel}</small>
                    </div>
                    <button
                      type="button"
                      aria-label="Профайл хаах"
                      onClick={() => setProfileOpen(false)}
                    >
                      <X size={17} />
                    </button>
                  </header>
                  <div className="live-theme-setting">
                    <span>
                      <strong>Харагдах горим</strong>
                      <small>Анхны тохиргоо Light байна</small>
                    </span>
                    <ThemeToggle />
                  </div>
                  <button
                    className="live-profile-logout"
                    type="button"
                    onClick={() => void signOut()}
                  >
                    <LogOut size={17} />
                    Системээс гарах
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>
        <main>
          {session.role === "ceo" ? (
            <CeoLiveApp
              api={api}
              session={session}
              view={view as CeoView}
              onNavigate={(next) => navigate(next)}
            />
          ) : session.role === "hr-manager" ? (
            <HrLiveApp api={api} session={session} />
          ) : view === "profile" ? (
            <ManagerProfilePage
              api={api}
              session={session}
              onOpen={openManagerProfilePanel}
              onOpenClimate={() => navigate("climate")}
              onLogout={signOut}
            />
          ) : (
            <ManagerLiveApp
              api={api}
              session={session}
              view={view as ManagerView}
              onNavigate={(next) => navigate(next)}
              guestDetailTarget={guestDetailTarget}
              onGuestDetailHandled={clearGuestDetail}
            />
          )}
        </main>
      </div>
      {mobileNavigation.length ? (
        <nav
          className="live-mobile-nav"
          aria-label={`${navigationLabel} · хурдан цэс`}
        >
          {mobileNavigation.map(({ id, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={mobileItemActive(id) ? "active" : ""}
              aria-current={mobileItemActive(id) ? "page" : undefined}
              aria-label={`${mobileLabels[id] || id}${badgeForView(id) ? `, ${badgeForView(id)} шинэ` : ""}`}
              onClick={() => navigate(id)}
            >
              <Icon size={20} />
              {badgeForView(id) ? (
                <b className="live-mobile-nav-badge" aria-hidden="true">
                  {badgeForView(id) > 99 ? "99+" : badgeForView(id)}
                </b>
              ) : null}
              <span>{mobileLabels[id] || id}</span>
            </button>
          ))}
          <button
            type="button"
            className={mobileMenuActive ? "active" : ""}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={20} />
            <span>Цэс</span>
          </button>
        </nav>
      ) : null}
      {session.role === "branch-manager" ? (
        <ManagerProfilePanels
          api={api}
          branch={session.branchIds[0]}
          panel={managerProfilePanel}
          onClose={() => setManagerProfilePanel(null)}
          attendancePayload={attendancePayload}
          onAttendancePayloadHandled={clearAttendancePayload}
        />
      ) : null}
    </div>
  );
}
