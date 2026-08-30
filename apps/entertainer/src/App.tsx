import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  Home,
  DoorOpen,
  KeyRound,
  LogOut,
  Medal,
  MessageCircle,
  QrCode,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { api, SESSION_EXPIRED_EVENT, STAFF_API_FAILURE_EVENT } from "./api";
import type {
  AppContext,
  EmployeeAttendanceStatus,
  EntertainerDashboard,
  ManagerDashboard,
  RankData,
  RankIncomeComparison,
  LoanOverview,
  FinexEntertainerSummary,
  RequestHubData,
} from "./api";
import {
  AccessBanner,
  AccessDeniedState,
  DataUnavailableState,
  OfflineBanner,
  SessionNotice,
  StartupState,
  UnauthorizedState,
} from "./AppState";
import {
  StaffApiError,
  canAccessStaffTab,
  isStaffTab,
  resolveStaffTab,
} from "./runtimePolicy";
import type { StaffTab } from "./runtimePolicy";
import { EntertainerQRScanner } from "./features/attendance/AttendanceQR";
import {
  getAttendanceScanAvailability,
  type AttendanceScanAvailability,
} from "./features/attendance/attendanceAvailability";
import { AttendanceAdminPage } from "./features/attendance/AttendanceAdmin";
import {
  EntertainerLeaveNotifications,
  EntertainerLeavePage,
  ManagerLeaveQueue,
} from "./features/attendance/LeavePolicy";
import { ManagerRosterReview } from "./features/roster/RosterReview";
import {
  EntertainerProfilePage,
  EntertainerSchedulePage,
  ManagerEntertainerDetail,
} from "./features/workforce/WorkforceWorkspace";
import {
  EntertainerWorkdayPage,
  ManagerCorrectionQueue,
} from "./features/workforce/WorkdayFlow";
import { EntertainerIncomeSummary } from "./features/workforce/IncomeSummary";
import { EntertainerRankOverview } from "./features/workforce/RankOverview";
import { EntertainerLoanCenter } from "./features/workforce/LoanCenter";
import { ManagerSchedulePage } from "./features/workforce/ManagerSchedule";
import { LeadReadinessChecklist } from "./features/workforce/ReadinessChecklist";
import { DailyRoundsChecklist } from "./features/workforce/DailyRoundsChecklist";
import { TeamClimateFeedbackPage } from "./features/workforce/TeamClimateFeedback";
import {
  RequestHub,
  type RequestCreateKind,
} from "./features/requests/RequestHub";
import { GuestServiceFeedPage } from "./features/screens/GuestServiceFeed";
import { ManagerSettingsPage } from "./features/settings/ManagerSettings";
import {
  ShiftReminderNotifications,
  ShiftReminderWatcher,
} from "./features/notifications/ShiftReminderNotifications";
import { entertainerRankLabel } from "./ranks";
import { rankDataFromDashboard } from "./rankContract";
import "./App.css";
import "./Premium.css";
import "./Workbench.css";
import "./RuntimeStates.css";
import "./theme.css";
import "./DancerApp.css";
import "./StartupSplash.css";
import { ThemeToggle } from "./components/ThemeToggle";

type Tab = StaffTab;

const SESSION_MARKER = "nomad-staff:authenticated";
const PENDING_LOGOUT = "nomad-staff:pending-logout";

const roleLabel = (mode: AppContext["mode"], designation?: string | null) =>
  mode === "admin"
    ? "Системийн админ"
    : mode === "manager"
      ? "Менежер"
      : mode === "lead"
        ? "Ахлах бүжигчин"
        : mode === "entertainer"
          ? "Бүжигчин"
          : designation?.trim() || "Ажилтан";
const sectionLabel = (mode: AppContext["mode"]) =>
  mode === "admin"
    ? "Системийн админы хэсэг"
    : mode === "manager"
      ? "Менежерийн хэсэг"
      : mode === "lead"
        ? "Ахлах бүжигчний хэсэг"
        : mode === "entertainer"
          ? "Бүжигчний хэсэг"
          : "Ажилтны хэсэг";
const isEntertainerMode = (mode: AppContext["mode"]) =>
  mode === "lead" || mode === "entertainer";

const asStaffApiError = (error: unknown) =>
  error instanceof StaffApiError
    ? error
    : new StaffApiError(navigator.onLine ? "server" : "offline", {
        cause: error,
      });

const requestedTab = () => {
  const params = new URLSearchParams(window.location.search);
  const value = params.get("view") || params.get("tab");
  return isStaffTab(value) ? value : "home";
};

const REQUEST_KINDS = ["leave", "attendance", "profile", "feedback"] as const;

const requestedRequestKind = (): RequestCreateKind | undefined => {
  const value = new URLSearchParams(window.location.search).get("kind");
  return REQUEST_KINDS.includes(value as RequestCreateKind)
    ? (value as RequestCreateKind)
    : undefined;
};

const storedReturnTab = (): Tab | undefined => {
  const value = window.history.state?.returnTab;
  return isStaffTab(value) ? value : undefined;
};

const primaryNavigationTab = (
  mode: AppContext["mode"],
  tab: Tab,
  returnTab?: Tab,
): Tab => {
  if (mode === "manager") {
    if (["roster-review", "person-detail"].includes(tab)) return "people";
    if (["leave", "corrections", "notifications"].includes(tab)) return "home";
    return tab;
  }
  if (mode === "lead" || mode === "entertainer") {
    if (tab === "loan") return "income";
    if (tab === "rank") return "profile";
    if (["leave", "climate"].includes(tab)) return "requests";
    if (tab === "workday")
      return returnTab === "requests" ? "requests" : "attendance-qr";
    if (
      [
        "schedule",
        "readiness",
        "rounds",
        "guests",
        "notifications",
      ].includes(tab)
    )
      return "home";
  }
  if (mode === "admin" && tab === "attendance-admin") return "home";
  return tab;
};

const STAFF_ROUTE_STATE = "nomad-staff-route";

const writeStaffRoute = (
  nextTab: Tab,
  method: "push" | "replace",
  returnTab?: Tab,
) => {
  const url = new URL(window.location.href);
  url.searchParams.delete("tab");
  if (nextTab === "home") url.searchParams.delete("view");
  else url.searchParams.set("view", nextTab);
  if (nextTab !== "attendance-qr") url.searchParams.delete("attendance");
  url.searchParams.delete("kind");
  const currentState =
    window.history.state && typeof window.history.state === "object"
      ? window.history.state
      : {};
  const state = {
    ...currentState,
    [STAFF_ROUTE_STATE]: true,
    staffTab: nextTab,
    returnTab: returnTab || null,
  };
  if (method === "push") window.history.pushState(state, "", url);
  else window.history.replaceState(state, "", url);
};

const writeRequestRoute = (
  kind: RequestCreateKind | undefined,
  method: "push" | "replace",
) => {
  const url = new URL(window.location.href);
  url.searchParams.delete("tab");
  url.searchParams.delete("attendance");
  url.searchParams.set("view", "requests");
  if (kind) url.searchParams.set("kind", kind);
  else url.searchParams.delete("kind");
  const currentState =
    window.history.state && typeof window.history.state === "object"
      ? window.history.state
      : {};
  const state = {
    ...currentState,
    [STAFF_ROUTE_STATE]: true,
    staffTab: "requests",
    returnTab: "requests",
    requestKind: kind || null,
    requestParent: Boolean(kind && method === "push"),
  };
  if (method === "push") window.history.pushState(state, "", url);
  else window.history.replaceState(state, "", url);
};

const formatTime = (value?: string | null) => {
  if (!value) return "—";
  const [hours = "0", minutes = "00"] = String(value).split(":");
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
};
const lifecycleLabel = (value?: string) =>
  (
    ({
      Active: "Идэвхтэй",
      Inactive: "Идэвхгүй",
      Onboarding: "Бүртгэж байна",
      Suspended: "Түр зогсоосон",
    }) as Record<string, string>
  )[value || ""] ||
  value ||
  "Идэвхтэй";
const money = new Intl.NumberFormat("mn-MN", {
  style: "currency",
  currency: "MNT",
  maximumFractionDigits: 0,
});
const wholeNumber = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const formatHeroMoney = (value?: number | null) =>
  value === null || value === undefined ? null : `₮${wholeNumber.format(value)}`;
const formatCompactMoney = (value?: number | null) => {
  if (value === null || value === undefined) return null;
  if (Math.abs(value) >= 1_000_000) {
    return `${new Intl.NumberFormat("mn-MN", { maximumFractionDigits: 1 }).format(value / 1_000_000)} сая ₮`;
  }
  return money.format(value);
};
const hasLoanOverviewShape = (value?: LoanOverview): value is LoanOverview =>
  Boolean(value?.policy && value?.evidence && Array.isArray(value.required_decisions));
const requestHubKinds = new Set(["leave", "attendance_correction", "profile_change", "team_feedback"]);
const requestHubStatuses = new Set(["pending", "approved", "rejected", "cancelled", "withdrawn", "submitted"]);
const hasRequestHubShape = (value: unknown): value is RequestHubData => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  const summary = candidate.summary as Record<string, unknown> | undefined;
  const items = candidate.items;
  if (!summary || !Array.isArray(items)) return false;
  if (candidate.next_cursor !== undefined && candidate.next_cursor !== null && typeof candidate.next_cursor !== "string") return false;
  if (!["pending_count", "resolved_count", "submitted_count", "total_count"].every(key =>
    typeof summary[key] === "number" && Number.isFinite(summary[key]),
  )) return false;
  return items.every(item => {
    if (!item || typeof item !== "object") return false;
    const row = item as Record<string, unknown>;
    return typeof row.id === "string"
      && typeof row.title === "string"
      && typeof row.submitted_at === "string"
      && (row.detail === undefined || row.detail === null || typeof row.detail === "string")
      && (row.decision_reason === undefined || row.decision_reason === null || typeof row.decision_reason === "string")
      && requestHubKinds.has(String(row.kind))
      && requestHubStatuses.has(String(row.status));
  });
};
const mongoliaDateKey = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ulaanbaatar",
});
const dayLabels = ["Ня", "Да", "Мя", "Лх", "Пү", "Ба", "Бя"];
const STARTUP_TITLE = "WELCOME TO DHD LLC";

function Brand({ branch }: { branch?: string }) {
  const key = (branch || "").toLowerCase();
  const brand = key.includes("neva")
    ? {
        slug: "neva",
        src: "/staff/branch-logos/neva-original.png",
        label: "NEVA",
      }
    : key.includes("sapphire")
      ? {
          slug: "sapphire",
          src: "/staff/branch-logos/sapphire-original.png",
          label: "SAPPHIRE",
        }
      : key.includes("monarch")
        ? {
            slug: "monarch",
            src: "/staff/branch-logos/monarch-original.png",
            label: "MONARCH",
          }
        : {
            slug: "nomad",
            src: "/staff/nomad-logo-transparent.png",
            label: "NOMAD",
          };
  return (
    <div className="brand">
      <span
        className={`brand-mark brand-mark--${brand.slug}`}
        role="img"
        aria-label={brand.label}
        style={
          { "--brand-source": `url("${brand.src}")` } as React.CSSProperties
        }
      />
      <span>Ажилтан</span>
    </div>
  );
}

function WelcomeScreen({ exiting = false }: { exiting?: boolean }) {
  return (
    <div
      className={`startup-splash${exiting ? " is-exiting" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="startup-title"
    >
      <div className="startup-atmosphere" aria-hidden="true" />
      <section className="startup-content">
        <div className="startup-logo-frame" aria-hidden="true">
          <img
            className="startup-logo"
            src="/staff/dhd-logo.png"
            width="2000"
            height="2000"
            alt=""
            fetchPriority="high"
          />
        </div>
        <h1 id="startup-title" className="startup-title" aria-label={STARTUP_TITLE}>
          {Array.from(STARTUP_TITLE).map((character, index) => (
            <span
              className="startup-title-character"
              style={{ animationDelay: `${250 + index * 36}ms` }}
              aria-hidden="true"
              key={`${character}-${index}`}
            >
              {character === " " ? "\u00a0" : character}
            </span>
          ))}
        </h1>
      </section>
    </div>
  );
}

function Login({
  onLogin,
  sessionExpired = false,
  notice = "",
  online = true,
}: {
  onLogin: (username: string, password: string) => Promise<void>;
  sessionExpired?: boolean;
  notice?: string;
  online?: boolean;
}) {
  const [usr, setUsr] = useState("");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const loginId = /^\+?[\d\s()-]+$/.test(usr.trim())
      ? usr.replace(/\D/g, "").slice(-8)
      : usr.trim();
    try {
      await onLogin(loginId, pwd);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Нэвтрэх боломжгүй байна");
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="login-page">
      <div className="login-glow" />
      <section className="login-card">
        <Brand />
        <div className="login-copy">
          <span>Ажилтны веб апп</span>
          <h1>Ажилтны аппд нэвтрэх</h1>
          <p>Бүртгэлтэй утасны дугаараараа нэвтэрнэ.</p>
        </div>
        {sessionExpired ? <SessionNotice /> : null}
        {notice ? (
          <div className="form-error auth-notice" role="status">
            {notice}
          </div>
        ) : null}
        {!online ? <OfflineBanner login /> : null}
        <form onSubmit={submit}>
          <label>
            Утасны дугаар
            <input
              value={usr}
              onChange={(e) => setUsr(e.target.value)}
              inputMode="tel"
              autoComplete="username"
              placeholder="99112233"
              required
            />
          </label>
          <label>
            Нууц үг
            <input
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error ? (
            <div className="form-error" role="alert">
              {error}
            </div>
          ) : null}
          <button className="gold-button" disabled={busy || !online}>
            {busy ? <RefreshCw className="spin" /> : <LogOut />}{" "}
            {busy
              ? "Нэвтэрч байна…"
              : online
                ? "Нэвтрэх"
                : "Интернет холболт хүлээж байна"}
          </button>
        </form>
        <small className="security-note">
          <ShieldCheck /> Танд зөвшөөрөгдсөн салбар, үүрэгт тохирох мэдээлэл л
          харагдана.
        </small>
      </section>
    </main>
  );
}

function Header({
  ctx,
  profileName,
  profilePhoto,
  onTab,
  onLogout,
}: {
  ctx: AppContext;
  profileName?: string;
  profilePhoto?: string | null;
  onTab: (tab: Tab) => void;
  onLogout: () => void;
}) {
  const avatarName =
    profileName?.trim() ||
    ctx.full_name.trim() ||
    roleLabel(ctx.mode, ctx.designation);
  const avatarInitial =
    Array.from(avatarName)[0]?.toLocaleUpperCase("mn-MN") || "Х";
  if (isEntertainerMode(ctx.mode)) {
    return (
      <header className="app-header dancer-app-header">
        <button
          className="dancer-header-profile"
          type="button"
          aria-label={`${avatarName} — Миний мэдээлэл нээх`}
          onClick={() => onTab("profile")}
        >
          <span className="header-profile-avatar" aria-hidden="true">
            <img src={profilePhoto || "/staff/profile-dancer-default.webp"} alt="" />
          </span>
          <strong>{avatarName}</strong>
        </button>
        <button
          className="dancer-header-notifications"
          type="button"
          aria-label="Мэдэгдэл"
          onClick={() => onTab("notifications")}
        >
          <Bell aria-hidden="true" />
        </button>
      </header>
    );
  }
  return (
    <header className="app-header">
      <Brand branch={ctx.branch} />
      <div className="header-actions">
        {ctx.mode !== "admin" && ctx.mode !== "employee" ? (
          <button aria-label="Мэдэгдэл" onClick={() => onTab("notifications")}>
            <Bell />
          </button>
        ) : null}
        <button
          className="role-button"
          aria-label="Миний мэдээлэл нээх"
          title={avatarName}
          onClick={() => onTab("profile")}
        >
          <span className="header-profile-avatar" aria-hidden="true">
            {profilePhoto ? (
              <img src={profilePhoto} alt="" />
            ) : isEntertainerMode(ctx.mode) ? (
              <img src="/staff/profile-dancer-default.webp" alt="" />
            ) : (
              avatarInitial
            )}
          </span>
          <span className="role-copy">
            <small>{ctx.branch}</small>
            <strong>{roleLabel(ctx.mode, ctx.designation)}</strong>
          </span>
        </button>
        <button aria-label="Гарах" onClick={onLogout}>
          <LogOut />
        </button>
      </div>
    </header>
  );
}

function ProfilePreferences({
  onLogout,
  logoutBusy,
}: {
  onLogout: () => void;
  logoutBusy: boolean;
}) {
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >(() =>
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );
  const [notificationNote, setNotificationNote] = useState("");
  const [notificationBusy, setNotificationBusy] = useState(false);

  useEffect(() => {
    const syncPermission = () => {
      setNotificationPermission(
        typeof Notification === "undefined" ? "unsupported" : Notification.permission,
      );
    };
    window.addEventListener("focus", syncPermission);
    return () => window.removeEventListener("focus", syncPermission);
  }, []);

  const requestNotificationPermission = async () => {
    setNotificationNote("");
    if (typeof Notification === "undefined") {
      setNotificationPermission("unsupported");
      setNotificationNote("Энэ browser мэдэгдэл дэмжихгүй байна.");
      return;
    }
    if (!window.isSecureContext) {
      setNotificationNote("Мэдэгдлийг зөвхөн хамгаалалттай холболтоор асаана.");
      return;
    }
    if (Notification.permission === "denied") {
      setNotificationPermission("denied");
      setNotificationNote("Browser-ийн тохиргооноос мэдэгдлийг зөвшөөрнө үү.");
      return;
    }
    if (Notification.permission === "granted") {
      setNotificationPermission("granted");
      setNotificationNote("Энэ төхөөрөмж дээр мэдэгдэл зөвшөөрсөн байна.");
      return;
    }
    setNotificationBusy(true);
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      setNotificationNote(
        permission === "granted"
          ? "Мэдэгдэл асаалаа."
          : "Мэдэгдлийг асаагаагүй байна.",
      );
    } catch {
      setNotificationNote("Мэдэгдлийн зөвшөөрөл авах боломжгүй байна.");
    } finally {
      setNotificationBusy(false);
    }
  };

  const notificationStatus =
    notificationPermission === "granted"
      ? "Зөвшөөрсөн"
      : notificationPermission === "denied"
        ? "Хориглосон"
        : notificationPermission === "unsupported"
          ? "Дэмжихгүй"
          : "Асаах";

  const resetPasswordForm = () => {
    setPasswordOpen(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
  };

  const submitPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    if (!currentPassword) {
      setPasswordError("Одоогийн нууц үгээ оруулна уу.");
      return;
    }
    if (
      newPassword.length < 10 ||
      !Array.from(newPassword).some((character) => /[A-Za-zА-ЯӨҮЁа-яөүё]/.test(character)) ||
      !Array.from(newPassword).some((character) => /\d/.test(character))
    ) {
      setPasswordError("Шинэ нууц үг 10-аас доошгүй тэмдэгт, үсэг болон тоо агуулна.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Шинэ нууц үг таарахгүй байна.");
      return;
    }
    setPasswordBusy(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      resetPasswordForm();
      setPasswordSuccess("Нууц үг шинэчлэгдлээ.");
    } catch (error) {
      setPasswordError(
        error instanceof Error ? error.message : "Нууц үг солих боломжгүй байна.",
      );
    } finally {
      setPasswordBusy(false);
    }
  };

  return (
    <section
      className="profile-preferences"
      aria-labelledby="profile-preferences-title"
    >
      <h2 id="profile-preferences-title">Тохиргоо</h2>
      <button
        className="profile-preference-row profile-preference-link"
        type="button"
        onClick={() => void requestNotificationPermission()}
        disabled={notificationBusy}
        aria-describedby={notificationNote ? "profile-notification-note" : undefined}
      >
        <Bell size={20} aria-hidden="true" />
        <span>
          <strong>Мэдэгдэл</strong>
          <small>Утас болон энэ төхөөрөмж дээр</small>
        </span>
        <b
          className={`profile-permission-status is-${notificationPermission}`}
          aria-label={`Мэдэгдлийн төлөв: ${notificationStatus}`}
        >
          {notificationBusy ? "Нээж байна…" : notificationStatus}
        </b>
      </button>
      {notificationNote ? (
        <p id="profile-notification-note" className="profile-preference-note" role="status">
          {notificationNote}
        </p>
      ) : null}
      <div className="profile-preference-row">
        <span>
          <strong>Дэлгэцийн горим</strong>
          <small>Цайвар, бараан эсвэл системийн тохиргоо</small>
        </span>
        <ThemeToggle />
      </div>
      <button
        className="profile-preference-row profile-preference-link"
        type="button"
        onClick={() => {
          setPasswordOpen((open) => !open);
          setPasswordError("");
          setPasswordSuccess("");
          setLogoutConfirmOpen(false);
        }}
        aria-expanded={passwordOpen}
        aria-controls="profile-password-form"
      >
        <KeyRound size={20} aria-hidden="true" />
        <span>
          <strong>Нууц үг солих</strong>
          <small>{passwordSuccess || "Одоогийн нууц үгээр баталгаажуулна"}</small>
        </span>
        {passwordSuccess ? (
          <CheckCircle2 className="profile-success-icon" size={20} aria-hidden="true" />
        ) : (
          <ChevronRight size={20} aria-hidden="true" />
        )}
      </button>
      {passwordOpen ? (
        <form
          id="profile-password-form"
          className="profile-password-form"
          onSubmit={(event) => void submitPassword(event)}
        >
          <label>
            <span>Одоогийн нууц үг</span>
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              disabled={passwordBusy}
              required
            />
          </label>
          <label>
            <span>Шинэ нууц үг</span>
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              disabled={passwordBusy}
              aria-describedby="profile-password-hint"
              required
            />
          </label>
          <small id="profile-password-hint">10-аас доошгүй тэмдэгт, үсэг болон тоо</small>
          <label>
            <span>Шинэ нууц үг давтах</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={passwordBusy}
              required
            />
          </label>
          {passwordError ? (
            <p className="profile-form-error" role="alert">
              <AlertTriangle size={16} aria-hidden="true" />
              {passwordError}
            </p>
          ) : null}
          <div className="profile-form-actions">
            <button type="button" onClick={resetPasswordForm} disabled={passwordBusy}>
              Болих
            </button>
            <button className="primary-button" type="submit" disabled={passwordBusy}>
              {passwordBusy ? "Хадгалж байна…" : "Хадгалах"}
            </button>
          </div>
        </form>
      ) : null}
      <button
        className="profile-preference-row profile-preference-link profile-logout-row"
        type="button"
        onClick={() => {
          setLogoutConfirmOpen((open) => !open);
          setPasswordOpen(false);
          setPasswordError("");
        }}
        aria-expanded={logoutConfirmOpen}
        aria-controls="profile-logout-confirm"
      >
        <LogOut size={20} aria-hidden="true" />
        <span>
          <strong>Системээс гарах</strong>
          <small>Энэ төхөөрөмжийн нэвтрэлтийг хаах</small>
        </span>
        <ChevronRight size={20} aria-hidden="true" />
      </button>
      {logoutConfirmOpen ? (
        <div id="profile-logout-confirm" className="profile-logout-confirm" role="group">
          <strong>Системээс гарах уу?</strong>
          <div className="profile-form-actions">
            <button
              type="button"
              onClick={() => setLogoutConfirmOpen(false)}
              disabled={logoutBusy}
            >
              Болих
            </button>
            <button
              className="profile-danger-button"
              type="button"
              onClick={onLogout}
              disabled={logoutBusy}
            >
              {logoutBusy ? "Гарч байна…" : "Гарах"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ThemePreference() {
  return (
    <section className="profile-preferences" aria-labelledby="profile-display-title">
      <h2 id="profile-display-title">Тохиргоо</h2>
      <div className="profile-preference-row">
        <span>
          <strong>Дэлгэцийн горим</strong>
          <small>Цайвар, бараан эсвэл системийн тохиргоо</small>
        </span>
        <ThemeToggle />
      </div>
    </section>
  );
}

const managerStatusLabel = (row: ManagerDashboard["roster"][number]) => {
  if (
    row.status === "checked_in" &&
    row.availability?.status &&
    row.availability.status !== "Unavailable"
  ) {
    return (
      (
        {
          Available: "Бэлэн",
          Scheduled: "Ээлжтэй",
          Reserved: "Захиалгатай",
          Working: "Ажиллаж байна",
          Break: "Завсарлагатай",
          Leave: "Чөлөөтэй",
        } as Record<string, string>
      )[row.availability.status] || "Ирсэн"
    );
  }
  return (
    (
      {
        checked_in: "Ирсэн",
        late: "Хоцорсон",
        scheduled: "Ээлж эхлээгүй",
        leave: "Чөлөө авсан",
        absent: "Тасалсан",
        off: "Амралттай",
      } as Record<string, string>
    )[row.status] || row.status
  );
};

type ManagerRosterRow = ManagerDashboard["roster"][number];

function ManagerRosterTable({
  rows,
  onOpenPerson,
  emptyTitle = "Ажилтан бүртгэгдээгүй байна",
  emptyMessage = "Энэ салбарт ажилтан бүртгэгдмэгц энд харагдана.",
}: {
  rows: ManagerRosterRow[];
  onOpenPerson: (profile: string) => void;
  emptyTitle?: string;
  emptyMessage?: string;
}) {
  if (!rows.length)
    return (
      <div className="empty-state roster-empty">
        <UsersRound />
        <strong>{emptyTitle}</strong>
        <p>{emptyMessage}</p>
      </div>
    );
  return (
    <div className="employee-table">
      <div className="employee-table-head" aria-hidden="true">
        <span>Ажилтан</span>
        <span>Өнөөдрийн ээлж</span>
        <span>Зэрэглэл</span>
        <span>Одоогийн төлөв</span>
        <span />
      </div>
      <div className="employee-table-body">
        {rows.map((row) => (
          <button
            key={row.profile}
            className="employee-table-row"
            onClick={() => onOpenPerson(row.profile)}
            aria-label={`${row.display_name} дэлгэрэнгүй`}
          >
            <div className="employee-identity">
              <div className="avatar">
                {row.photo ? (
                  <img src={row.photo} alt="" />
                ) : (
                  row.display_name.slice(0, 1)
                )}
              </div>
              <span>
                <strong>
                  {row.display_name}
                  {row.is_demo ? (
                    <span className="demo-badge mini">DEMO</span>
                  ) : null}
                </strong>
                <small>
                  {lifecycleLabel(row.lifecycle_status)}
                  {row.profile_change_pending ? (
                    <em className="profile-request-badge">Өөрчлөх хүсэлт</em>
                  ) : null}
                </small>
              </span>
            </div>
            <span className="employee-shift">
              <small>Өнөөдрийн ээлж</small>
              <strong>
                {row.shift
                  ? `${formatTime(row.shift.shift?.start_time)}–${formatTime(row.shift.shift?.end_time)}`
                  : "Ээлжгүй"}
              </strong>
            </span>
            <span className="employee-rank">
              <small>Зэрэглэл</small>
              <strong>{entertainerRankLabel(row.rank)}</strong>
            </span>
            <span
              className={`employee-status ${row.status} ${row.availability?.status?.toLowerCase().replace(" ", "-") || ""}`}
            >
              <i />
              {managerStatusLabel(row)}
            </span>
            <ChevronRight className="employee-chevron" />
          </button>
        ))}
      </div>
    </div>
  );
}

function ManagerHome({
  data,
  onRefresh,
  onOpenLeave,
  onOpenCorrections,
  onOpenProfileChanges,
  onOpenPerson,
}: {
  data: ManagerDashboard;
  onRefresh: (filters?: {
    query?: string;
    status?: string;
  }) => Promise<void> | void;
  onOpenLeave: () => void;
  onOpenCorrections: () => void;
  onOpenProfileChanges: () => void;
  onOpenPerson: (profile: string) => void;
}) {
  const summary = data.summary;
  const attention =
    summary.pending_leave +
    (summary.pending_corrections || 0) +
    (summary.pending_profile_changes || 0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const [query, setQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState("");
  const generatedAt = data.meta?.generated_at
    ? new Date(String(data.meta.generated_at).replace(" ", "T")).getTime()
    : 0;
  const isStale = Boolean(
    generatedAt && Date.now() - generatedAt > 5 * 60 * 1000,
  );
  const refresh = async (filters = { query, status: activeStatus }) => {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshError("");
    try {
      await onRefresh(filters);
    } catch (error) {
      setRefreshError(
        error instanceof Error
          ? error.message
          : "Мэдээлэл шинэчлэхэд алдаа гарлаа.",
      );
    } finally {
      setRefreshing(false);
    }
  };
  const selectStatus = (status: string) => {
    const next = activeStatus === status ? "" : status;
    setActiveStatus(next);
    void refresh({ query, status: next });
  };
  const operational = [
    { key: "available", label: "Бэлэн", value: summary.available },
    { key: "reserved", label: "Захиалгатай", value: summary.reserved },
    { key: "working", label: "Ажиллаж байна", value: summary.working },
    { key: "break", label: "Завсарлага", value: summary.break },
    { key: "leave", label: "Чөлөө авсан", value: summary.leave },
    { key: "absent", label: "Тасалсан", value: summary.absent },
  ];
  const attentionItems = [
    {
      key: "leave",
      label: "Чөлөөний хүсэлт",
      value: summary.pending_leave,
      action: onOpenLeave,
    },
    {
      key: "corrections",
      label: "Ирц засах хүсэлт",
      value: summary.pending_corrections || 0,
      action: onOpenCorrections,
    },
    {
      key: "profile-changes",
      label: "Профайл өөрчлөх хүсэлт",
      value: summary.pending_profile_changes || 0,
      action: onOpenProfileChanges,
    },
  ];
  return (
    <div className="page manager-page manager-workbench">
      <header className="manager-command">
        <div>
          <span className="eyebrow">{data.branch} салбар · Менежер</span>
          <h1>Салбарын өнөөдрийн байдал</h1>
          <time className={isStale ? "stale" : ""}>
            {data.date} ·{" "}
            {data.meta?.generated_at
              ? `${String(data.meta.generated_at).slice(11, 16)}-д ${isStale ? "шинэчлэх шаардлагатай" : "шинэчилсэн"}`
              : "шууд мэдээлэл"}
          </time>
        </div>
        <button
          className="refresh-button"
          aria-label={refreshing ? "Шинэчилж байна" : "Шинэчлэх"}
          onClick={() => refresh()}
          disabled={refreshing}
        >
          <RefreshCw className={refreshing ? "spin" : ""} />
          <span>{refreshing ? "Шинэчилж байна…" : "Шинэчлэх"}</span>
        </button>
      </header>
      <section
        className="manager-overview"
        aria-label="Өнөөдрийн товч мэдээлэл"
      >
        <article>
          <span>
            <Clock3 />
            Өнөөдрийн ээлж
          </span>
          <strong>{summary.scheduled}</strong>
          <small>төлөвлөсөн ажилтан</small>
        </article>
        <article>
          <span>
            <CheckCircle2 />
            Одоо ажиллаж байна
          </span>
          <strong>{summary.on_shift}</strong>
          <small>ээлж дээр</small>
        </article>
        <article className={summary.late || summary.absent ? "danger" : ""}>
          <span>
            <AlertTriangle />
            Анхаарах ирц
          </span>
          <strong>{summary.late + summary.absent}</strong>
          <small>хоцорсон эсвэл тасалсан</small>
        </article>
      </section>
      <section
        className="manager-status-strip"
        aria-label="Ажилтны төлөвөөр шүүх"
      >
        {operational.map((item) => (
          <button
            key={item.key}
            className={activeStatus === item.key ? "active" : ""}
            onClick={() => selectStatus(item.key)}
            disabled={refreshing}
          >
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </button>
        ))}
      </section>
      <div className="manager-operational-grid">
        <section
          className={`manager-attention ${attention ? "has-attention" : ""}`}
        >
          <header>
            <div>
              <span className="section-kicker">Менежерийн ажил</span>
              <h2>Шийдвэрлэх хүсэлт</h2>
              <small>Таны батлах эсвэл татгалзах зүйлс</small>
            </div>
            <b>{attention}</b>
          </header>
          <div className="manager-attention-list">
            {attentionItems.map((item) => (
              <button
                key={item.key}
                onClick={item.action}
                disabled={!item.value}
              >
                <span>
                  <i
                    className={
                      item.value ? "attention-dot active" : "attention-dot"
                    }
                  />
                  <strong>{item.label}</strong>
                </span>
                <b>{item.value}</b>
                <ChevronRight />
              </button>
            ))}
          </div>
          {!attentionItems.some((item) => item.value) ? (
            <p className="attention-clear">
              <CheckCircle2 />
              Шийдвэр хүлээж буй ажил алга.
            </p>
          ) : null}
        </section>
        <section className="manager-roster">
          <div className="section-heading">
            <div>
              <span className="section-kicker">Салбарын баг</span>
              <h2>Ажилтны төлөв</h2>
              <small>
                {data.meta?.total ?? data.roster.length} / нийт {summary.total}{" "}
                ажилтан · мөр дээр дарж дэлгэрэнгүйг нээнэ
              </small>
            </div>
          </div>
          <form
            className="roster-toolbar"
            onSubmit={(event) => {
              event.preventDefault();
              void refresh();
            }}
          >
            <label>
              <Search />
              <span className="sr-only">Ажилтан хайх</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ажилтны нэрээр хайх"
                autoComplete="off"
              />
            </label>
            <button type="submit" disabled={refreshing}>
              {refreshing ? <RefreshCw className="spin" /> : <Search />}
              <span>Хайх</span>
            </button>
            {query || activeStatus ? (
              <button
                type="button"
                className="clear-filter"
                onClick={() => {
                  setQuery("");
                  setActiveStatus("");
                  void refresh({ query: "", status: "" });
                }}
                disabled={refreshing}
              >
                Шүүлт цэвэрлэх
              </button>
            ) : null}
          </form>
          {refreshError ? (
            <div className="inline-data-error" role="alert">
              <AlertTriangle />
              <span>
                <strong>Мэдээллийг шинэчилж чадсангүй</strong>
                <small>{refreshError}</small>
              </span>
              <button onClick={() => refresh()} disabled={refreshing}>
                Дахин оролдох
              </button>
            </div>
          ) : null}
          <ManagerRosterTable
            rows={data.roster}
            onOpenPerson={onOpenPerson}
            emptyTitle={
              query || activeStatus ? "Тохирох ажилтан олдсонгүй" : undefined
            }
            emptyMessage={
              query || activeStatus
                ? "Хайлт эсвэл төлвийн шүүлтээ өөрчлөөд дахин оролдоно уу."
                : undefined
            }
          />
        </section>
      </div>
    </div>
  );
}

function EntertainerHome({
  data,
  rank,
  rankIncomeComparison,
  incomeSummary,
  loanOverview,
  loanOverviewUnavailable,
  requestHub,
  requestHubUnavailable,
  attendanceAvailability,
  isLead,
  onOpenAttendance,
  onOpenIncome,
  onOpenRank,
  onOpenRequests,
  onOpenLoan,
  onGuests,
  onReadiness,
  onRounds,
}: {
  data: EntertainerDashboard;
  rank?: RankData;
  rankIncomeComparison?: RankIncomeComparison;
  incomeSummary?: FinexEntertainerSummary;
  loanOverview?: LoanOverview;
  loanOverviewUnavailable?: boolean;
  requestHub?: RequestHubData;
  requestHubUnavailable?: boolean;
  attendanceAvailability: AttendanceScanAvailability;
  isLead?: boolean;
  onOpenAttendance: () => void;
  onOpenIncome: () => void;
  onOpenRank: () => void;
  onOpenRequests: () => void;
  onOpenLoan: () => void;
  onGuests?: () => void;
  onReadiness?: () => void;
  onRounds?: () => void;
}) {
  const profile = data.profile;
  const checkedIn =
    attendanceAvailability.state === "complete" ||
    (data.attendance?.checked_in ?? data.latest_checkin?.log_type === "IN");
  const activeWindow = attendanceAvailability.available;
  const today = mongoliaDateKey.format(new Date());
  const salary =
    rankIncomeComparison?.data_state === "verified"
      ? rankIncomeComparison.baseline?.calculated_salary
      : null;
  const incomeValue = incomeSummary?.net_income ?? salary;
  const incomeLabel = formatHeroMoney(incomeValue);
  const incomePeriod =
    incomeSummary?.selected_month ||
    rankIncomeComparison?.selected_month ||
    today.slice(0, 7);
  const [incomeYear, incomeMonth] = incomePeriod.split("-");
  const incomePeriodLabel = incomeYear && incomeMonth
    ? `${incomeYear} оны ${Number(incomeMonth)} сар`
    : incomePeriod;
  const incomeMonths = [...(incomeSummary?.months || [])].sort((left, right) =>
    left.month.localeCompare(right.month),
  );
  const currentIncomeMonth = incomeMonths.at(-1);
  const previousIncomeMonth = incomeMonths.at(-2);
  const comparisonPercent =
    currentIncomeMonth && previousIncomeMonth && previousIncomeMonth.income > 0
      ? Math.round(((currentIncomeMonth.income - previousIncomeMonth.income) / previousIncomeMonth.income) * 100)
      : null;
  const dailyIncome = (incomeSummary?.days || []).slice(-16);
  const dailyMaximum = Math.max(...dailyIncome.map(day => day.cumulative_income), 1);
  const sparklinePoints = dailyIncome
    .map((day, index) => {
      const x = dailyIncome.length <= 1 ? 0 : (index / (dailyIncome.length - 1)) * 320;
      const y = 80 - (day.cumulative_income / dailyMaximum) * 68;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const sparklineAreaPoints = sparklinePoints
    ? `0,88 ${sparklinePoints} 320,88`
    : "";
  const lastIncomePoint = dailyIncome.length
    ? {
        x: dailyIncome.length <= 1 ? 0 : 320,
        y: 80 - (dailyIncome.at(-1)!.cumulative_income / dailyMaximum) * 68,
      }
    : null;
  const rankScore = rank?.score ?? profile.daily_rank?.career_average_score ?? null;
  const checkinTime = checkedIn
    ? formatTime(data.latest_checkin?.time?.split(" ")[1])
    : null;
  const rankLabel = rank?.effective_rank_label || entertainerRankLabel(profile.current_rank);
  const rankThreshold = rank?.next_rank_threshold || 100;
  const rankProgress = rankScore === null
    ? 0
    : Math.min(100, Math.max(0, (rankScore / rankThreshold) * 100));
  const shiftStart = formatTime(data.shift?.shift?.start_time);
  const shiftEnd = formatTime(data.shift?.shift?.end_time);
  const scheduledDays = new Map(data.week.days.map(day => [day.date, day]));
  const weekStart = new Date(`${data.week.start}T00:00:00Z`);
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setUTCDate(weekStart.getUTCDate() + index);
    const dateKey = date.toISOString().slice(0, 10);
    return scheduledDays.get(dateKey) || { date: dateKey, assignment: null };
  });
  const lastScheduledIndex = weekDays.reduce(
    (latest, day, index) => day.assignment ? index : latest,
    -1,
  );
  const latestLoanRequest = [...(loanOverview?.requests || [])].sort((left, right) =>
    right.requested_at.localeCompare(left.requested_at),
  )[0];
  let loanValue = "Ачаалсангүй";
  let loanDetail = "Дэлгэрэнгүй хэсгээс дахин оролдоно уу";
  if (!loanOverviewUnavailable && loanOverview) {
    if (loanOverview.evidence.outstanding_balance !== null && loanOverview.evidence.outstanding_balance !== undefined) {
      loanValue = formatCompactMoney(loanOverview.evidence.outstanding_balance) || "—";
      loanDetail = "Зээлийн үлдэгдэл";
    } else if (latestLoanRequest) {
      loanValue = formatCompactMoney(latestLoanRequest.requested_amount) || "—";
      loanDetail = `Хүсэлт · ${({
        Pending: "Хүлээгдэж байна",
        Approved: "Зөвшөөрсөн",
        Rejected: "Татгалзсан",
        Disbursed: "Олгосон",
        Repaid: "Төлж дууссан",
        Cancelled: "Цуцалсан",
      } as Record<string, string>)[latestLoanRequest.status] || latestLoanRequest.status}`;
    } else if (loanOverview.policy.request_enabled && loanOverview.evidence.maximum_amount !== undefined) {
      loanValue = formatCompactMoney(loanOverview.evidence.maximum_amount) || "—";
      loanDetail = "Хүсэх боломжтой дээд дүн";
    } else {
      loanValue = "Хүсэлт хаалттай";
      loanDetail = loanOverview.policy.message;
    }
  }
  const attendanceValue = checkedIn
    ? `Ирсэн${checkinTime ? ` · ${checkinTime}` : ""}`
    : activeWindow
      ? "Бүртгүүлэх боломжтой"
      : data.shift
        ? attendanceAvailability.label
        : "Өнөөдөр бүртгэлгүй";
  const attendanceDetail = checkedIn
    ? "Өнөөдрийн ирц баталгаажсан"
    : activeWindow
      ? attendanceAvailability.detail
      : data.shift
        ? attendanceAvailability.detail
        : "Ээлжгүй өдөр";
  const requestDetail = requestHubUnavailable
    ? "Төлөв ачаалсангүй"
    : requestHub
      ? requestHub.summary.pending_count > 0
        ? `${requestHub.summary.pending_count} хүлээгдэж байна`
        : "Хүлээгдэж буй хүсэлт алга"
      : "Төлөв ачаалж байна";
  const requestTone = requestHubUnavailable
    ? "is-danger"
    : requestHub
      ? requestHub.summary.pending_count > 0
        ? "is-warning"
        : "is-success"
      : "is-neutral";
  const loanTone = loanOverviewUnavailable
    ? "is-danger"
    : loanOverview && (
        Number(loanOverview.evidence.outstanding_balance || 0) > 0 ||
        Boolean(latestLoanRequest) ||
        loanOverview.policy.request_enabled
      )
      ? "is-info"
      : "is-neutral";
  return (
    <div className="page entertainer-page dancer-home">
      <h1 className="sr-only">Нүүр</h1>
      <section className="dancer-home-overview" aria-label="Таны товч мэдээлэл">
        <button className="dancer-income-card" data-destination="income" type="button" onClick={onOpenIncome}>
          <span className="dancer-card-title"><span>Орлого</span><ChevronRight aria-hidden="true" /></span>
          <strong>{incomeLabel || "Тооцоо бүрдэж байна"}</strong>
          <time>{incomePeriodLabel}</time>
          {sparklinePoints ? (
            <svg className="dancer-income-chart" viewBox="0 0 320 88" preserveAspectRatio="none" role="img" aria-label="Энэ сарын орлогын хөдөлгөөн">
              <defs>
                <linearGradient id="dancer-income-area-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.24" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon className="dancer-income-chart-area" points={sparklineAreaPoints} />
              <polyline points={sparklinePoints} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              {lastIncomePoint ? <>
                <circle className="dancer-income-chart-halo" cx={lastIncomePoint.x} cy={lastIncomePoint.y} r="9" vectorEffect="non-scaling-stroke" />
                <circle className="dancer-income-chart-dot" cx={lastIncomePoint.x} cy={lastIncomePoint.y} r="4.5" vectorEffect="non-scaling-stroke" />
              </> : null}
            </svg>
          ) : <span className="dancer-income-chart-empty">Өдрийн мэдээлэл бүрдээгүй</span>}
          <span className="dancer-income-context">
            {comparisonPercent === null
              ? incomeSummary?.data_state === "verified"
                ? "Баталгаажсан бүртгэл"
                : "Эцсийн цалин биш"
              : <>Өмнөх сараас <b>{comparisonPercent > 0 ? "+" : ""}{comparisonPercent}%</b></>}
          </span>
        </button>

        <div className="dancer-home-pair">
          <button className="dancer-compact-card dancer-attendance-card" data-destination="attendance-qr" type="button" onClick={onOpenAttendance}>
            <span className="dancer-card-title"><span>Ирц</span></span>
            <strong className={checkedIn ? "is-success" : activeWindow ? "is-action" : ""}>{attendanceValue}</strong>
            <small className="dancer-shift-time">{data.shift ? `Ээлж ${shiftStart}–${shiftEnd}` : attendanceDetail}</small>
            <span className="dancer-week-dots" aria-label="Энэ долоо хоногийн ээлж">
              {weekDays.map((day, index) => {
                const date = new Date(`${day.date}T00:00:00Z`);
                return <span key={day.date}>
                  <small>{dayLabels[date.getUTCDay()]}</small>
                  <i className={day.assignment ? "is-scheduled" : index === lastScheduledIndex + 1 ? "is-next" : ""} aria-hidden="true" />
                </span>;
              })}
            </span>
          </button>

          <button className="dancer-compact-card dancer-rank-card" data-destination="rank" type="button" onClick={onOpenRank}>
            <span className="dancer-card-title"><span>Зэрэг</span><ChevronRight aria-hidden="true" /></span>
            <strong className="dancer-rank-label">{rankLabel}</strong>
            <b className="dancer-rank-score">{rankScore === null ? "—" : rankScore.toFixed(1)} оноо</b>
            <span className="dancer-rank-progress" role="progressbar" aria-label={`${rankLabel} ахиц`} aria-valuemin={0} aria-valuemax={rankThreshold} aria-valuenow={rankScore || 0}>
              <span style={{ width: `${rankProgress}%` }} />
              <i style={{ left: `${rankProgress}%` }} />
            </span>
          </button>
        </div>

        <div className="dancer-home-rows">
          <button className={`dancer-home-row ${requestTone}`} data-destination="requests" type="button" onClick={onOpenRequests}>
            <span className="dancer-row-icon"><MessageCircle aria-hidden="true" /></span>
            <span><strong>Санал, хүсэлт</strong><small>{requestDetail}</small></span>
            <ChevronRight aria-hidden="true" />
          </button>
          <button className={`dancer-home-row ${loanTone}`} data-destination="loan" type="button" onClick={onOpenLoan}>
            <span className="dancer-row-icon"><WalletCards aria-hidden="true" /></span>
            <span><strong>Зээл</strong><small>{loanValue === "Хүсэлт хаалттай" ? loanValue : `${loanValue} · ${loanDetail}`}</small></span>
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </section>
      {isLead ? (
        <section className="lead-home-actions" aria-labelledby="lead-home-actions-title">
          <h2 id="lead-home-actions-title">Ахлахын ажил</h2>
          <div>
            <button type="button" onClick={onReadiness}>
              <ClipboardCheck aria-hidden="true" />
              <span>Бэлэн байдал</span>
              <ChevronRight aria-hidden="true" />
            </button>
            <button type="button" onClick={onRounds}>
              <TicketCheck aria-hidden="true" />
              <span>Өдрийн гараа</span>
              <ChevronRight aria-hidden="true" />
            </button>
            {onGuests ? (
              <button type="button" onClick={onGuests}>
                <DoorOpen aria-hidden="true" />
                <span>Зочдын мэдээлэл</span>
                <ChevronRight aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ManagerPeoplePage({
  manager,
  onOpenRosterReview,
  onOpenPerson,
}: {
  manager: ManagerDashboard;
  onOpenRosterReview?: () => void;
  onOpenPerson?: (profile: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const filtered = useMemo(
    () =>
      manager.roster.filter((row) => {
        const matchesQuery =
          !query.trim() ||
          row.display_name
            .toLocaleLowerCase("mn-MN")
            .includes(query.trim().toLocaleLowerCase("mn-MN"));
        const lifecycle = row.lifecycle_status || "Active";
        const matchesStatus =
          status === "all" ||
          (status === "active"
            ? lifecycle === "Active"
            : status === "request"
              ? Boolean(row.profile_change_pending)
              : lifecycle !== "Active");
        return matchesQuery && matchesStatus;
      }),
    [manager.roster, query, status],
  );

  return (
    <section className="people-directory">
      <header className="directory-header">
        <div>
          <span className="section-kicker">Баталгаатай бүртгэл</span>
          <h2>Салбарын ажилтнууд</h2>
          <small>
            {manager.branch} салбар · нийт {manager.roster.length} ажилтан
          </small>
        </div>
      </header>
      <div className="directory-toolbar">
        <label>
          <Search />
          <span className="sr-only">Ажилтан хайх</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Нэрээр хайх"
            autoComplete="off"
          />
        </label>
        <label className="directory-filter">
          <span className="sr-only">Төлөвөөр шүүх</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">Бүх төлөв</option>
            <option value="request">Өөрчлөх хүсэлттэй</option>
            <option value="active">Идэвхтэй</option>
            <option value="inactive">Идэвхгүй</option>
          </select>
        </label>
        <span className="directory-result">{filtered.length} үр дүн</span>
      </div>
      <ManagerRosterTable
        rows={filtered}
        onOpenPerson={(profile) => onOpenPerson?.(profile)}
        emptyTitle="Тохирох ажилтан олдсонгүй"
        emptyMessage="Хайх нэр эсвэл төлвийн шүүлтээ өөрчилнө үү."
      />
      <button
        className="roster-review-link"
        type="button"
        onClick={onOpenRosterReview}
      >
        <span>
          <strong>Бүртгэлгүй нэрсийг шалгах</strong>
          <small>HR бүртгэлтэй таараагүй нэрсийн тусдаа жагсаалт</small>
        </span>
        <ChevronRight />
      </button>
    </section>
  );
}

function EmployeeHome({
  ctx,
  attendance,
  onScanQR,
}: {
  ctx: AppContext;
  attendance: EmployeeAttendanceStatus;
  onScanQR: () => void;
}) {
  const availability = getAttendanceScanAvailability(
    attendance,
    ctx.can_scan_attendance !== false,
  );
  const completed = availability.state === "complete";
  const attendanceTime = (value?: string | null) =>
    value
      ? new Date(String(value).replace(" ", "T")).toLocaleTimeString("mn-MN", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";
  const status = completed ? "Ирсэн цаг бүртгэгдсэн" : availability.label;
  return (
    <div className="page employee-attendance-home">
      <section className="employee-attendance-intro">
        <div>
          <span>
            {ctx.branch} салбар · {attendance.work_date}
          </span>
          <h1>Сайн байна уу, {ctx.full_name}</h1>
          <p>Өнөөдөр салбарт ирэхдээ QR кодоо нэг удаа уншуулна.</p>
        </div>
        <Clock3 aria-hidden="true" />
      </section>
      <button
        className="attendance-cta employee-attendance-cta"
        onClick={onScanQR}
        disabled={!availability.available}
      >
        {completed ? <CheckCircle2 /> : <QrCode />}
        <span>
          <strong>
            {completed ? status : availability.label}
          </strong>
          <small>
            {completed
              ? `Ирсэн цаг · ${attendanceTime(attendance.checked_in_at || attendance.latest_checkin?.time)}`
              : availability.detail}
          </small>
        </span>
        {completed ? <ShieldCheck /> : <ChevronRight />}
      </button>
      <section className="employee-attendance-status">
        <div>
          <small>Өнөөдрийн төлөв</small>
          <strong>{status}</strong>
        </div>
        <div>
          <small>Ирсэн цаг</small>
          <strong>
            {attendanceTime(
              attendance.checked_in_at ||
                (attendance.latest_checkin?.log_type === "IN"
                  ? attendance.latest_checkin.time
                  : null),
            )}
            {attendance.late_minutes ? (
              <em>{attendance.late_minutes} мин хоцорсон</em>
            ) : null}
          </strong>
        </div>
        <div>
          <small>Хоцролтын босго</small>
          <strong>{attendance.late_after_time?.slice(0, 5) || "22:00"}</strong>
        </div>
      </section>
    </div>
  );
}

function SecondaryPage({
  tab,
  ctx,
  manager,
  entertainer,
  rank,
  rankIncomeComparison,
  onHome,
  onOpenRosterReview,
  onOpenPerson,
  onLogout,
  logoutBusy,
}: {
  tab: Tab;
  ctx: AppContext;
  manager?: ManagerDashboard;
  entertainer?: EntertainerDashboard;
  rank?: RankData;
  rankIncomeComparison?: RankIncomeComparison;
  onHome: () => void;
  onOpenRosterReview?: () => void;
  onOpenPerson?: (profile: string) => void;
  onLogout: () => void;
  logoutBusy: boolean;
}) {
  const titles: Record<Tab, string> = {
    home: "Нүүр",
    people: "Ажилтнууд",
    schedule: "Хуваарь",
    income: "Орлого",
    loan: "Зээл",
    rank: "Зэрэглэл",
    notifications: "Мэдэгдэл",
    profile: "Миний мэдээлэл",
    "attendance-qr": "Ирц бүртгэх",
    leave: "Чөлөө авах",
    "roster-review": "Бүртгэлгүй нэрс",
    "person-detail": "Ажилтны дэлгэрэнгүй",
    workday: "Өнөөдрийн ажил",
    corrections: "Ирц засах хүсэлт",
    "attendance-admin": "Ирцийн QR тохиргоо",
    readiness: "Өдрийн шалгалт",
    rounds: "Өдрийн гараа",
    climate: "Охидын уур амьсгал",
    guests: "Зочид",
    requests: "Санал, хүсэлт",
  };
  return (
    <div className={`page secondary-page${tab === "rank" ? " rank-page" : ""}`}>
      {tab !== "rank" ? (
        <div className="section-title">
          <div>
            <span>{ctx.branch}</span>
            <h1>{titles[tab]}</h1>
          </div>
        </div>
      ) : null}
      {tab === "people" && manager ? (
        <ManagerPeoplePage
          manager={manager}
          onOpenRosterReview={onOpenRosterReview}
          onOpenPerson={onOpenPerson}
        />
      ) : null}
      {tab === "profile" ? (
        <>
          <section className="profile-panel">
            <UserRound />
            <h2>{ctx.full_name}</h2>
            <p>{ctx.branch}</p>
            <span>{roleLabel(ctx.mode, ctx.designation)}</span>
          </section>
          {ctx.mode === "employee" ? (
            <ProfilePreferences
              onLogout={onLogout}
              logoutBusy={logoutBusy}
            />
          ) : (
            <ThemePreference />
          )}
        </>
      ) : null}
      {tab === "notifications" ? (
        isEntertainerMode(ctx.mode) ? (
          <div className="notification-page-stack">
            <ShiftReminderNotifications />
            <EntertainerLeaveNotifications />
          </div>
        ) : (
          <section className="empty-state">
            <Bell />
            <strong>Шинэ мэдэгдэл алга</strong>
            <p>Шийдвэрлэх мэдээлэл гарвал энд харагдана.</p>
          </section>
        )
      ) : null}
      {tab === "income" && entertainer ? (
        <section className="settlement-panel">
          <header>
            <WalletCards />
            <div>
              <small>Энэ сарын дүн</small>
              <h2>Тооцоо ба суутгал</h2>
            </div>
          </header>
          <div className="settlement-grid">
            <article>
              <small>Идэвхтэй суутгал</small>
              <strong>
                {money.format(entertainer.work_summary.active_deduction)}
              </strong>
            </article>
            <article>
              <small>Хоцорсон минут</small>
              <strong>{entertainer.work_summary.late_minutes}</strong>
            </article>
            <article>
              <small>Ажиллах ээлж</small>
              <strong>{entertainer.work_summary.scheduled_days}</strong>
            </article>
            <article>
              <small>Чөлөө ашигласан</small>
              <strong>{entertainer.work_summary.leave_used}</strong>
            </article>
          </div>
          <p>
            <ShieldCheck /> Энд ирцийн тооцоо харагдана. Цалин, урамшууллын
            эцсийн дүн тусдаа бодогдоно.
          </p>
        </section>
      ) : null}
      {tab === "rank" ? (
        rank ? <EntertainerRankOverview data={rank} incomeComparison={rankIncomeComparison} /> : (
          <section className="empty-state" role="status">
            <Medal />
            <strong>Зэрэглэлийн мэдээлэл түр хүлээгдэж байна</strong>
            <p>Нүүр хуудасны бодит зэрэг, оноогоор дэлгэцийг сэргээж байна.</p>
          </section>
        )
      ) : null}
      {![
        "people",
        "profile",
        "notifications",
        "income",
        "loan",
        "rank",
        "climate",
      ].includes(tab) ? (
        <section className="empty-state">
          <Sparkles />
          <strong>{titles[tab]} хэсэг</strong>
          <p>
            {ctx.mode === "manager"
              ? "Салбарын мэдээлэл энд харагдана."
              : entertainer
                ? "Таны мэдээлэл энд харагдана."
                : "Мэдээлэл ачаалж байна."}
          </p>
        </section>
      ) : null}
      {tab !== "rank" ? (
        <button className="outline-button" onClick={onHome}>
          <Home />
          Нүүр рүү буцах
        </button>
      ) : null}
    </div>
  );
}

function Shell({
  ctx,
  children,
  tab,
  attendanceAvailability,
  profileName,
  profilePhoto,
  onTab,
  onLogout,
  online,
  accessDenied,
  onDismissAccess,
}: {
  ctx: AppContext;
  children: React.ReactNode;
  tab: Tab;
  attendanceAvailability: AttendanceScanAvailability;
  profileName?: string;
  profilePhoto?: string | null;
  onTab: (tab: Tab) => void;
  onLogout: () => void;
  online: boolean;
  accessDenied: boolean;
  onDismissAccess: () => void;
}) {
  const mainRef = useRef<HTMLElement>(null);
  const isBartenderWorkspace =
    ctx.mode === "employee" && ctx.can_view_guest_service === true;
  const items: Array<{ id: Tab; label: string; icon: typeof Home }> =
    ctx.mode === "admin"
      ? [
          { id: "home" as Tab, label: "QR тохиргоо", icon: QrCode },
          { id: "profile" as Tab, label: "Мэдээлэл", icon: UserRound },
        ]
      : ctx.mode === "manager"
        ? [
            { id: "home", label: "Нүүр", icon: Home },
            { id: "people", label: "Ажилтнууд", icon: UsersRound },
            { id: "attendance-qr", label: "QR", icon: QrCode },
            { id: "schedule", label: "Хуваарь", icon: CalendarDays },
            { id: "profile", label: "Тохиргоо", icon: Settings2 },
          ]
        : ctx.mode === "lead"
          ? [
              { id: "home", label: "Нүүр", icon: Home },
              { id: "income", label: "Орлого", icon: BarChart3 },
              { id: "attendance-qr", label: "Ирц", icon: CalendarDays },
              { id: "requests", label: "Хүсэлт", icon: ClipboardList },
              { id: "profile", label: "Минийх", icon: UserRound },
            ]
          : ctx.mode === "entertainer"
            ? [
                { id: "home", label: "Нүүр", icon: Home },
                { id: "income", label: "Орлого", icon: BarChart3 },
                { id: "attendance-qr", label: "Ирц", icon: CalendarDays },
                { id: "requests", label: "Хүсэлт", icon: ClipboardList },
                { id: "profile", label: "Минийх", icon: UserRound },
              ]
            : isBartenderWorkspace
              ? [
                  { id: "home", label: "Ирц", icon: Clock3 },
                  { id: "guests", label: "Зочид", icon: DoorOpen },
                  { id: "profile", label: "Мэдээлэл", icon: UserRound },
                ]
              : [
                  { id: "home", label: "Нүүр", icon: Home },
                  { id: "attendance-qr", label: "QR", icon: QrCode },
                  { id: "profile", label: "Мэдээлэл", icon: UserRound },
                ];
  const activeNavigationTab =
    isBartenderWorkspace && tab === "attendance-qr"
      ? "home"
      : primaryNavigationTab(ctx.mode, tab, storedReturnTab());
  const qrNavigationLabel = attendanceAvailability.available
    ? "QR уншуулж ирц бүртгэх"
    : `${attendanceAvailability.label}. Ирцийн түүх харах`;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      mainRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [tab]);

  return (
    <div className={`app-stage${isEntertainerMode(ctx.mode) ? " dancer-app-stage" : ""}`}>
      <div className={`app-shell${isEntertainerMode(ctx.mode) ? " dancer-app-shell" : ""}`}>
        {isEntertainerMode(ctx.mode) ? <ShiftReminderWatcher /> : null}
        <aside className="desktop-nav" aria-label="Үндсэн цэс">
          <Brand branch={ctx.branch} />
          <div className="desktop-nav-context">
            <span>{ctx.branch}</span>
            <strong>
              {isBartenderWorkspace ? "Бармены хэсэг" : sectionLabel(ctx.mode)}
            </strong>
          </div>
          <nav>
            {items.map((item) => (
              <button
                key={item.id}
                className={activeNavigationTab === item.id ? "active" : ""}
                aria-current={activeNavigationTab === item.id ? "page" : undefined}
                aria-label={item.id === "attendance-qr" ? qrNavigationLabel : undefined}
                data-scan-state={item.id === "attendance-qr" ? attendanceAvailability.state : undefined}
                onClick={() => onTab(item.id)}
              >
                <item.icon />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          {!isEntertainerMode(ctx.mode) ? (
            <button className="desktop-logout" onClick={onLogout}>
              <LogOut />
              <span>Системээс гарах</span>
            </button>
          ) : null}
        </aside>
        <Header
          ctx={ctx}
          profileName={profileName}
          profilePhoto={profilePhoto}
          onTab={onTab}
          onLogout={onLogout}
        />
        <main ref={mainRef} className="app-main" tabIndex={-1}>
          {!online ? <OfflineBanner /> : null}
          {accessDenied ? <AccessBanner onClose={onDismissAccess} /> : null}
          {children}
        </main>
        <nav
          className={`bottom-nav item-count-${items.length}${isEntertainerMode(ctx.mode) ? " entertainer-bottom-nav" : ""}`}
          aria-label="Үндсэн цэс"
        >
          {items.map((item) => (
            <button
              key={item.id}
              aria-label={
                item.id === "attendance-qr"
                  ? qrNavigationLabel
                  : item.label
              }
              aria-current={activeNavigationTab === item.id ? "page" : undefined}
              data-scan-state={item.id === "attendance-qr" ? attendanceAvailability.state : undefined}
              className={`${activeNavigationTab === item.id ? "active " : ""}${item.id === "attendance-qr" ? "nav-scan-action" : ""}`.trim()}
              onClick={() => onTab(item.id)}
            >
              <span className="nav-icon">
                <item.icon />
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

type AppPhase =
  | "booting"
  | "guest"
  | "authenticated"
  | "session-expired"
  | "unauthorized"
  | "offline"
  | "fatal";

function AppRuntime() {
  const [phase, setPhase] = useState<AppPhase>("booting");
  const [splashPhase, setSplashPhase] = useState<
    "active" | "exiting" | "hidden"
  >("active");
  const [ctx, setCtx] = useState<AppContext | null>(null);
  const [manager, setManager] = useState<ManagerDashboard>();
  const [entertainer, setEntertainer] = useState<EntertainerDashboard>();
  const [rank, setRank] = useState<RankData>();
  const [rankIncomeComparison, setRankIncomeComparison] = useState<RankIncomeComparison>();
  const [incomeSummary, setIncomeSummary] = useState<FinexEntertainerSummary>();
  const [loanOverview, setLoanOverview] = useState<LoanOverview>();
  const [loanOverviewUnavailable, setLoanOverviewUnavailable] = useState(false);
  const [requestHub, setRequestHub] = useState<RequestHubData>();
  const [requestHubUnavailable, setRequestHubUnavailable] = useState(false);
  const [requestHubLoading, setRequestHubLoading] = useState(false);
  const [requestHubLoadingMore, setRequestHubLoadingMore] = useState(false);
  const [requestHubLoadMoreFailed, setRequestHubLoadMoreFailed] = useState(false);
  const [attendance, setAttendance] = useState<EmployeeAttendanceStatus>();
  const [selectedProfile, setSelectedProfile] = useState("");
  const [tab, setTab] = useState<Tab>("home");
  const [requestKind, setRequestKind] = useState<RequestCreateKind | undefined>(
    requestedRequestKind,
  );
  const [routeDenied, setRouteDenied] = useState(false);
  const [message, setMessage] = useState("");
  const [pageError, setPageError] = useState<StaffApiError>();
  const [runtimeError, setRuntimeError] = useState<StaffApiError>();
  const [loginNotice, setLoginNotice] = useState("");
  const [online, setOnline] = useState(() => navigator.onLine);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const bootStarted = useRef(false);
  const reconnectPending = useRef(false);
  const protectedEpoch = useRef(0);
  const authenticatedSession = useRef(false);
  const sessionInvalidated = useRef(false);
  const [attendancePayload, setAttendancePayload] = useState(
    () =>
      new URLSearchParams(window.location.search).get("attendance") ||
      undefined,
  );

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const audio = new Audio("/staff/dhd-startup.wav");
    audio.preload = "auto";
    audio.volume = 0.28;

    const soundTimer = window.setTimeout(
      () => {
        void audio.play().catch(() => undefined);
      },
      reducedMotion ? 120 : 450,
    );
    const exitTimer = window.setTimeout(
      () => setSplashPhase("exiting"),
      reducedMotion ? 340 : 1650,
    );
    const removeTimer = window.setTimeout(
      () => setSplashPhase("hidden"),
      reducedMotion ? 560 : 2000,
    );

    return () => {
      window.clearTimeout(soundTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(removeTimer);
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    };
  }, []);

  const clearProtectedState = useCallback(() => {
    protectedEpoch.current += 1;
    setCtx(null);
    setManager(undefined);
    setEntertainer(undefined);
    setRank(undefined);
    setRankIncomeComparison(undefined);
    setIncomeSummary(undefined);
    setLoanOverview(undefined);
    setLoanOverviewUnavailable(false);
    setRequestHub(undefined);
    setRequestHubUnavailable(false);
    setRequestHubLoading(false);
    setRequestHubLoadingMore(false);
    setRequestHubLoadMoreFailed(false);
    setAttendance(undefined);
    setSelectedProfile("");
    setPageError(undefined);
    setRouteDenied(false);
    setMessage("");
    setTab("home");
  }, []);

  const beginProtectedLoad = useCallback(() => {
    sessionInvalidated.current = false;
    clearProtectedState();
    setRuntimeError(undefined);
    setLoginNotice("");
    setPhase("booting");
    return protectedEpoch.current;
  }, [clearProtectedState]);

  const expireSession = useCallback(() => {
    const hadSession =
      authenticatedSession.current ||
      Boolean(sessionStorage.getItem(SESSION_MARKER));
    if (!hadSession || sessionInvalidated.current) return;
    sessionInvalidated.current = true;
    authenticatedSession.current = false;
    sessionStorage.removeItem(SESSION_MARKER);
    clearProtectedState();
    setRuntimeError(undefined);
    setLoginNotice("");
    setPhase("session-expired");
  }, [clearProtectedState]);

  const denyAccess = useCallback(() => {
    authenticatedSession.current = true;
    clearProtectedState();
    setRuntimeError(undefined);
    setLoginNotice("");
    setPhase("unauthorized");
  }, [clearProtectedState]);

  const showBoundaryFailure = useCallback(
    (failure: StaffApiError, hadSession = false) => {
      if (failure.invalidatesSession) {
        if (
          hadSession ||
          authenticatedSession.current ||
          sessionStorage.getItem(SESSION_MARKER)
        )
          expireSession();
        else {
          clearProtectedState();
          setRuntimeError(undefined);
          setPhase("guest");
        }
        return;
      }
      if (failure.kind === "permission-denied") {
        denyAccess();
        return;
      }
      clearProtectedState();
      setRuntimeError(failure);
      setPhase(failure.kind === "offline" ? "offline" : "fatal");
    },
    [clearProtectedState, denyAccess, expireSession],
  );

  const loadManagerDashboard = useCallback(
    async (filters: { query?: string; status?: string } = {}) => {
      const epoch = protectedEpoch.current;
      const data = await api.managerDashboard(filters);
      if (epoch === protectedEpoch.current) setManager(data);
    },
    [],
  );

  const loadMyRequests = useCallback(async () => {
    setRequestHubLoading(true);
    setRequestHubLoadMoreFailed(false);
    try {
      const data = await api.myRequestHub();
      if (hasRequestHubShape(data)) {
        setRequestHub(data);
        setRequestHubUnavailable(false);
      } else {
        setRequestHubUnavailable(true);
      }
    } catch (error) {
      const failure = asStaffApiError(error);
      if (!failure.invalidatesSession && failure.kind !== "permission-denied")
        setRequestHubUnavailable(true);
    } finally {
      setRequestHubLoading(false);
    }
  }, []);

  const loadMoreRequests = useCallback(async () => {
    const cursor = requestHub?.next_cursor;
    if (!cursor || requestHubLoadingMore) return;
    setRequestHubLoadingMore(true);
    setRequestHubLoadMoreFailed(false);
    try {
      const data = await api.myRequestHub(25, cursor);
      if (!hasRequestHubShape(data)) {
        setRequestHubLoadMoreFailed(true);
        return;
      }
      setRequestHub(current => {
        if (!current) return data;
        const seen = new Set(current.items.map(item => `${item.kind}:${item.id}`));
        const olderItems = data.items.filter(item => !seen.has(`${item.kind}:${item.id}`));
        return { ...data, items: [...current.items, ...olderItems] };
      });
    } catch (error) {
      const failure = asStaffApiError(error);
      if (!failure.invalidatesSession && failure.kind !== "permission-denied")
        setRequestHubLoadMoreFailed(true);
    } finally {
      setRequestHubLoadingMore(false);
    }
  }, [requestHub?.next_cursor, requestHubLoadingMore]);

  const loadProjection = useCallback(
    async (context: AppContext, epoch = protectedEpoch.current) => {
      if (context.mode === "admin") {
        if (epoch !== protectedEpoch.current) return;
        setManager(undefined);
        setEntertainer(undefined);
        setRank(undefined);
        setRankIncomeComparison(undefined);
        setIncomeSummary(undefined);
        setLoanOverview(undefined);
        setLoanOverviewUnavailable(false);
        setRequestHub(undefined);
        setRequestHubUnavailable(false);
        setAttendance(undefined);
        return;
      }
      if (context.mode === "manager") {
        const [data, attendanceData] = await Promise.all([
          api.managerDashboard(),
          api.myAttendanceStatus(),
        ]);
        if (epoch !== protectedEpoch.current) return;
        setManager(data);
        setEntertainer(undefined);
        setRank(undefined);
        setRankIncomeComparison(undefined);
        setIncomeSummary(undefined);
        setLoanOverview(undefined);
        setLoanOverviewUnavailable(false);
        setRequestHub(undefined);
        setRequestHubUnavailable(false);
        setAttendance(attendanceData);
        return;
      }

      if (context.mode === "employee") {
        const attendanceData = await api.myAttendanceStatus();
        if (epoch !== protectedEpoch.current) return;
        setAttendance(attendanceData);
        setManager(undefined);
        setEntertainer(undefined);
        setRank(undefined);
        setRankIncomeComparison(undefined);
        setIncomeSummary(undefined);
        setLoanOverview(undefined);
        setLoanOverviewUnavailable(false);
        setRequestHub(undefined);
        setRequestHubUnavailable(false);
        return;
      }

      const dashboardPromise = api.entertainerDashboard();
      const attendancePromise = api.myAttendanceStatus();
      const rankPromise = api.rank().catch((error: unknown) => {
        const failure = asStaffApiError(error);
        if (failure.invalidatesSession || failure.kind === "permission-denied")
          throw failure;
        return undefined;
      });
      const rankIncomePromise = api.rankIncomeComparison().catch((error: unknown) => {
        const failure = asStaffApiError(error);
        if (failure.invalidatesSession || failure.kind === "permission-denied")
          throw failure;
        return undefined;
      });
      const incomePromise = api.finexIncome().catch((error: unknown) => {
        const failure = asStaffApiError(error);
        if (failure.invalidatesSession || failure.kind === "permission-denied")
          throw failure;
        return undefined;
      });
      const loanPromise = api.loanOverview()
        .then((data) => hasLoanOverviewShape(data)
          ? { data, unavailable: false }
          : { data: undefined, unavailable: true })
        .catch((error: unknown) => {
          const failure = asStaffApiError(error);
          if (failure.invalidatesSession || failure.kind === "permission-denied")
            throw failure;
          return { data: undefined, unavailable: true };
        });
      const requestPromise = api.myRequestHub()
        .then((data) => hasRequestHubShape(data)
          ? { data, unavailable: false }
          : { data: undefined, unavailable: true })
        .catch((error: unknown) => {
          const failure = asStaffApiError(error);
          if (failure.invalidatesSession || failure.kind === "permission-denied")
            throw failure;
          return { data: undefined, unavailable: true };
        });
      const [dashboard, rankData, rankIncomeData, incomeData, loanData, requestData, attendanceData] = await Promise.all([
        dashboardPromise,
        rankPromise,
        rankIncomePromise,
        incomePromise,
        loanPromise,
        requestPromise,
        attendancePromise,
      ]);
      if (epoch !== protectedEpoch.current) return;
      setEntertainer(dashboard);
      setManager(undefined);
      setRank(rankData || rankDataFromDashboard(dashboard));
      setRankIncomeComparison(rankIncomeData);
      setIncomeSummary(incomeData);
      setLoanOverview(loanData.data);
      setLoanOverviewUnavailable(loanData.unavailable);
      setRequestHub(requestData.data);
      setRequestHubUnavailable(requestData.unavailable);
      setAttendance(attendanceData);
    },
    [],
  );

  const establishAuthenticatedState = useCallback(
    async (value: AppContext, epoch: number) => {
      if (epoch !== protectedEpoch.current) return;
      setCtx(value);
      await loadProjection(value, epoch);
      if (epoch !== protectedEpoch.current) return;

      const candidate: Tab =
        value.mode !== "admin" &&
        value.can_scan_attendance !== false &&
        attendancePayload
          ? "attendance-qr"
          : requestedTab();
      const allowed = canAccessStaffTab(value.mode, candidate);
      const resolvedTab = resolveStaffTab(value.mode, candidate);
      setTab(resolvedTab);
      const initialRequestKind = resolvedTab === "requests" ? requestedRequestKind() : undefined;
      setRequestKind(initialRequestKind);
      if (resolvedTab === "requests" && initialRequestKind)
        writeRequestRoute(initialRequestKind, "replace");
      else writeStaffRoute(resolvedTab, "replace");
      setRouteDenied(!allowed);
      setPageError(undefined);
      setRuntimeError(undefined);
      if (epoch !== protectedEpoch.current) return;
      authenticatedSession.current = true;
      sessionInvalidated.current = false;
      sessionStorage.setItem(SESSION_MARKER, "1");
      setPhase("authenticated");
    },
    [attendancePayload, loadProjection],
  );

  useEffect(() => {
    const handleApiFailure = (event: Event) => {
      const error = (event as CustomEvent<{ error?: StaffApiError }>).detail
        ?.error;
      if (!error) return;
      if (error.invalidatesSession) expireSession();
      else if (error.kind === "permission-denied") denyAccess();
    };
    const handleSessionExpired = () => expireSession();
    window.addEventListener(STAFF_API_FAILURE_EVENT, handleApiFailure);
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => {
      window.removeEventListener(STAFF_API_FAILURE_EVENT, handleApiFailure);
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, [denyAccess, expireSession]);

  useEffect(() => {
    const handleOffline = () => {
      reconnectPending.current = true;
      setOnline(false);
    };
    const handleOnline = () => {
      setOnline(true);
      if (reconnectPending.current) {
        reconnectPending.current = false;
        if (authenticatedSession.current)
          setMessage("Интернет холболт сэргэлээ.");
      }
      if (sessionStorage.getItem(PENDING_LOGOUT)) {
        void api
          .logout()
          .then(() => sessionStorage.removeItem(PENDING_LOGOUT))
          .catch(() => undefined);
      }
    };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const bootstrap = useCallback(async () => {
    const expectedSession = Boolean(sessionStorage.getItem(SESSION_MARKER));
    authenticatedSession.current = expectedSession;
    const epoch = beginProtectedLoad();

    if (navigator.onLine && sessionStorage.getItem(PENDING_LOGOUT)) {
      try {
        await api.logout();
        sessionStorage.removeItem(PENDING_LOGOUT);
      } catch {
        setLoginNotice(
          "Өмнөх гарах хүсэлтийг сервертэй холбогдмогц дахин илгээнэ.",
        );
      }
      if (epoch !== protectedEpoch.current) return;
      authenticatedSession.current = false;
      sessionStorage.removeItem(SESSION_MARKER);
      setPhase("guest");
      return;
    }

    try {
      const entry = await api
        .appEntry()
        .catch(() => ({ authenticated: true, destination: "staff" as const }));
      if (epoch !== protectedEpoch.current) return;
      if (!entry.authenticated) {
        authenticatedSession.current = false;
        sessionStorage.removeItem(SESSION_MARKER);
        setPhase(expectedSession ? "session-expired" : "guest");
        return;
      }
      if (entry.destination === "manager") {
        const attendance = new URLSearchParams(window.location.search).get("attendance");
        window.location.replace(attendance ? `/manager/?attendance=${encodeURIComponent(attendance)}` : "/manager/");
        return;
      }
      if (entry.destination === "vip-entry") {
        window.location.replace("/vip-entry/");
        return;
      }
      const value = await api.context();
      if (epoch !== protectedEpoch.current) return;
      authenticatedSession.current = true;
      await establishAuthenticatedState(value, epoch);
    } catch (error) {
      if (epoch !== protectedEpoch.current) return;
      const failure = asStaffApiError(error);
      showBoundaryFailure(failure, expectedSession);
    }
  }, [beginProtectedLoad, establishAuthenticatedState, showBoundaryFailure]);

  useEffect(() => {
    if (bootStarted.current) return;
    bootStarted.current = true;
    void bootstrap();
  }, [bootstrap]);

  const login = useCallback(
    async (username: string, password: string) => {
      await api.login(username, password);
      authenticatedSession.current = true;
      const epoch = beginProtectedLoad();
      try {
        const entry = await api
          .appEntry()
          .catch(() => ({
            authenticated: true,
            destination: "staff" as const,
          }));
        if (epoch !== protectedEpoch.current) return;
        if (entry.destination === "manager") {
          const attendance = new URLSearchParams(window.location.search).get("attendance");
          window.location.replace(attendance ? `/manager/?attendance=${encodeURIComponent(attendance)}` : "/manager/");
          return;
        }
        if (entry.destination === "vip-entry") {
          window.location.replace("/vip-entry/");
          return;
        }
        const value = await api.context();
        if (epoch !== protectedEpoch.current) return;
        await establishAuthenticatedState(value, epoch);
      } catch (error) {
        if (epoch !== protectedEpoch.current) return;
        const failure = asStaffApiError(error);
        showBoundaryFailure(failure, true);
      }
    },
    [beginProtectedLoad, establishAuthenticatedState, showBoundaryFailure],
  );

  const retryProjection = useCallback(async () => {
    if (!ctx || phase !== "authenticated") return;
    const epoch = protectedEpoch.current;
    try {
      await loadProjection(ctx, epoch);
      if (epoch === protectedEpoch.current) setPageError(undefined);
    } catch (error) {
      if (epoch !== protectedEpoch.current) return;
      const failure = asStaffApiError(error);
      if (failure.invalidatesSession || failure.kind === "permission-denied")
        showBoundaryFailure(failure, true);
      else setPageError(failure);
    }
  }, [ctx, loadProjection, phase, showBoundaryFailure]);

  const logout = useCallback(async () => {
    if (logoutBusy) return;
    setLogoutBusy(true);
    let completed = false;
    try {
      if (!navigator.onLine) throw new StaffApiError("offline");
      await api.logout();
      completed = true;
      sessionStorage.removeItem(PENDING_LOGOUT);
    } catch {
      sessionStorage.setItem(PENDING_LOGOUT, "1");
    } finally {
      authenticatedSession.current = false;
      sessionInvalidated.current = false;
      sessionStorage.removeItem(SESSION_MARKER);
      clearProtectedState();
      setRuntimeError(undefined);
      setPhase("guest");
      setLoginNotice(
        completed
          ? ""
          : "Төхөөрөмж дээрх мэдээллийг цэвэрлэлээ. Интернет ормогц системээс бүрэн гарна.",
      );
      setLogoutBusy(false);
    }
  }, [clearProtectedState, logoutBusy]);

  const attendanceAvailability = useMemo(
    () =>
      getAttendanceScanAvailability(
        attendance,
        ctx?.can_scan_attendance !== false,
      ),
    [attendance, ctx?.can_scan_attendance],
  );

  const navigateTo = useCallback(
    (nextTab: Tab) => {
      if (!ctx || phase !== "authenticated") return;
      if (!canAccessStaffTab(ctx.mode, nextTab)) {
        setRouteDenied(true);
        setTab("home");
        return;
      }
      if (nextTab === tab) {
        if (nextTab === "requests" && requestKind) {
          writeRequestRoute(undefined, "push");
          setRequestKind(undefined);
        }
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        return;
      }
      writeStaffRoute(
        nextTab,
        "push",
        primaryNavigationTab(ctx.mode, tab, storedReturnTab()),
      );
      if (nextTab !== "attendance-qr") setAttendancePayload(undefined);
      setRequestKind(undefined);
      setRouteDenied(false);
      setTab(nextTab);
    },
    [ctx, phase, requestKind, tab],
  );

  const replaceRoute = useCallback(
    (nextTab: Tab) => {
      if (!ctx || phase !== "authenticated") return;
      const allowed = canAccessStaffTab(ctx.mode, nextTab);
      const resolved = allowed ? resolveStaffTab(ctx.mode, nextTab) : "home";
      writeStaffRoute(resolved, "replace");
      if (resolved !== "attendance-qr") setAttendancePayload(undefined);
      setRequestKind(undefined);
      setRouteDenied(!allowed);
      setTab(resolved);
    },
    [ctx, phase],
  );

  const returnHome = useCallback(() => {
    writeStaffRoute("home", "replace");
    setAttendancePayload(undefined);
    setRequestKind(undefined);
    setRouteDenied(false);
    setTab("home");
  }, []);

  const openRequestKind = useCallback((kind: RequestCreateKind) => {
    writeRequestRoute(kind, "push");
    setRouteDenied(false);
    setTab("requests");
    setRequestKind(kind);
  }, []);

  const closeRequestKind = useCallback(() => {
    setRequestKind(undefined);
    void loadMyRequests();
    if (window.history.state?.requestParent === true) {
      window.history.back();
      return;
    }
    writeRequestRoute(undefined, "replace");
    setTab("requests");
  }, [loadMyRequests]);

  const returnFromSecondary = useCallback((fallback: Tab) => {
    const currentState = window.history.state;
    if (currentState?.[STAFF_ROUTE_STATE] && isStaffTab(currentState.returnTab)) {
      window.history.back();
      return;
    }
    replaceRoute(fallback);
  }, [replaceRoute]);

  useEffect(() => {
    if (!ctx || phase !== "authenticated") return;
    const handleHistoryNavigation = () => {
      const candidate = requestedTab();
      const allowed = canAccessStaffTab(ctx.mode, candidate);
      const resolved = resolveStaffTab(ctx.mode, candidate);
      if (resolved !== "attendance-qr") setAttendancePayload(undefined);
      setRequestKind(resolved === "requests" ? requestedRequestKind() : undefined);
      setRouteDenied(!allowed);
      setTab(resolved);
    };
    window.addEventListener("popstate", handleHistoryNavigation);
    return () => window.removeEventListener("popstate", handleHistoryNavigation);
  }, [ctx, phase]);

  const openPerson = useCallback(
    (profile: string) => {
      setSelectedProfile(profile);
      navigateTo("person-detail");
    },
    [navigateTo],
  );

  const content = useMemo(() => {
    if (!ctx) return null;
    if (routeDenied || !canAccessStaffTab(ctx.mode, tab))
      return <AccessDeniedState onHome={returnHome} />;
    if (
      pageError &&
      (ctx.mode === "manager"
        ? !manager
        : isEntertainerMode(ctx.mode)
          ? !entertainer
          : ctx.mode === "employee"
            ? !attendance
            : false)
    )
      return (
        <DataUnavailableState
          offline={pageError.kind === "offline"}
          onRetry={() => {
            void retryProjection();
          }}
        />
      );
    if ((tab === "home" || tab === "attendance-admin") && ctx.mode === "admin")
      return <AttendanceAdminPage />;
    if (
      tab === "attendance-qr" &&
      ctx.mode !== "admin" &&
      ctx.can_scan_attendance !== false
    )
      return (
        <EntertainerQRScanner
          attendance={attendance}
          availability={attendanceAvailability}
          initialPayload={attendancePayload}
          onBack={() => returnFromSecondary("home")}
          onSuccess={() => loadProjection(ctx)}
        />
      );
    if (tab === "leave" && ctx.mode === "manager")
      return (
        <ManagerLeaveQueue
          onBack={returnHome}
          onChanged={() => {
            void loadProjection(ctx);
          }}
        />
      );
    if (tab === "corrections" && ctx.mode === "manager")
      return (
        <ManagerCorrectionQueue
          branch={ctx.branch}
          onBack={returnHome}
          onChanged={() => {
            void loadProjection(ctx);
          }}
        />
      );
    if (tab === "roster-review" && ctx.mode === "manager")
      return <ManagerRosterReview onBack={() => replaceRoute("people")} />;
    if (tab === "schedule" && ctx.mode === "manager")
      return (
        <ManagerSchedulePage
          branch={ctx.branch}
          onOpenRosterReview={() => navigateTo("roster-review")}
        />
      );
    if (tab === "readiness" && ctx.mode === "lead")
      return <LeadReadinessChecklist branch={ctx.branch} />;
    if (tab === "rounds" && ctx.mode === "lead")
      return <DailyRoundsChecklist branch={ctx.branch} />;
    if (tab === "requests" && isEntertainerMode(ctx.mode)) {
      if (requestKind === "leave")
        return <EntertainerLeavePage onBack={closeRequestKind} />;
      if (requestKind === "attendance")
        return (
          <EntertainerWorkdayPage
            branch={ctx.branch}
            onBack={closeRequestKind}
            onScanQR={() => navigateTo("attendance-qr")}
          />
        );
      if (requestKind === "feedback")
        return <TeamClimateFeedbackPage onBack={closeRequestKind} backLabel="Санал, хүсэлт рүү буцах" />;
      if (requestKind === "profile")
        return (
          <div className="request-child-page">
            <header className="request-child-header">
              <button type="button" aria-label="Хүсэлт рүү буцах" onClick={closeRequestKind}>
                <ArrowLeft aria-hidden="true" />
              </button>
              <h1>Профайл өөрчлөх</h1>
            </header>
            <EntertainerProfilePage />
          </div>
        );
      return (
        <RequestHub
          data={requestHub}
          loading={requestHubLoading}
          unavailable={requestHubUnavailable}
          loadingMore={requestHubLoadingMore}
          loadMoreFailed={requestHubLoadMoreFailed}
          onReload={() => void loadMyRequests()}
          onLoadMore={() => void loadMoreRequests()}
          onOpenKind={openRequestKind}
        />
      );
    }
    if (tab === "climate" && isEntertainerMode(ctx.mode))
      return <TeamClimateFeedbackPage onBack={() => returnFromSecondary("requests")} />;
    if (tab === "guests")
      return ctx.can_view_guest_service ? (
        <GuestServiceFeedPage branch={ctx.branch} />
      ) : (
        <AccessDeniedState onHome={returnHome} />
      );
    if (tab === "leave" && isEntertainerMode(ctx.mode))
      return <EntertainerLeavePage onBack={() => returnFromSecondary("requests")} />;
    if (tab === "workday" && isEntertainerMode(ctx.mode))
      return (
        <EntertainerWorkdayPage
          branch={ctx.branch}
          onBack={() => returnFromSecondary("attendance-qr")}
          onScanQR={() => navigateTo("attendance-qr")}
        />
      );
    if (tab === "schedule" && isEntertainerMode(ctx.mode))
      return (
        <EntertainerSchedulePage
          branch={ctx.branch}
          onBack={() => returnFromSecondary("home")}
        />
      );
    if (tab === "profile" && isEntertainerMode(ctx.mode))
      return (
        <div className="profile-settings-stack">
          <EntertainerProfilePage />
          <ProfilePreferences
            onLogout={() => void logout()}
            logoutBusy={logoutBusy}
          />
        </div>
      );
    if (tab === "profile" && ctx.mode === "manager")
      return <ManagerSettingsPage branch={ctx.branch} />;
    if (tab === "income" && isEntertainerMode(ctx.mode) && entertainer)
      return (
        <EntertainerIncomeSummary
          branch={ctx.branch}
          dashboard={entertainer}
          onOpenLoan={() => navigateTo("loan")}
        />
      );
    if (tab === "loan" && isEntertainerMode(ctx.mode))
      return <EntertainerLoanCenter branch={ctx.branch} initialData={loanOverview} />;
    if (tab === "person-detail" && ctx.mode === "manager" && selectedProfile)
      return (
        <ManagerEntertainerDetail
          profileName={selectedProfile}
          branch={ctx.branch}
          onBack={() => replaceRoute("people")}
        />
      );
    if (tab !== "home")
      return (
        <SecondaryPage
          tab={tab}
          ctx={ctx}
          manager={manager}
          entertainer={entertainer}
          rank={rank}
          rankIncomeComparison={rankIncomeComparison}
          onHome={returnHome}
          onOpenRosterReview={() => navigateTo("roster-review")}
          onOpenPerson={openPerson}
          onLogout={() => void logout()}
          logoutBusy={logoutBusy}
        />
      );
    if (ctx.mode === "manager" && manager)
      return (
        <ManagerHome
          data={manager}
          onRefresh={loadManagerDashboard}
          onOpenLeave={() => navigateTo("leave")}
          onOpenCorrections={() => navigateTo("corrections")}
          onOpenProfileChanges={() => navigateTo("people")}
          onOpenPerson={openPerson}
        />
      );
    if (isEntertainerMode(ctx.mode) && entertainer)
      return (
        <EntertainerHome
          data={entertainer}
          rank={rank}
          rankIncomeComparison={rankIncomeComparison}
          incomeSummary={incomeSummary}
          loanOverview={loanOverview}
          loanOverviewUnavailable={loanOverviewUnavailable}
          requestHub={requestHub}
          requestHubUnavailable={requestHubUnavailable}
          attendanceAvailability={attendanceAvailability}
          isLead={ctx.mode === "lead"}
          onOpenAttendance={() => navigateTo("attendance-qr")}
          onOpenIncome={() => navigateTo("income")}
          onOpenRank={() => navigateTo("rank")}
          onOpenRequests={() => navigateTo("requests")}
          onOpenLoan={() => navigateTo("loan")}
          onGuests={
            ctx.can_view_guest_service
              ? () => navigateTo("guests")
              : undefined
          }
          onReadiness={() => navigateTo("readiness")}
          onRounds={() => navigateTo("rounds")}
        />
      );
    if (ctx.mode === "employee" && attendance)
      return (
        <EmployeeHome
          ctx={ctx}
          attendance={attendance}
          onScanQR={() => navigateTo("attendance-qr")}
        />
      );
    return (
      <div className="loading">
        <RefreshCw className="spin" />
        Мэдээлэл ачаалж байна…
      </div>
    );
  }, [
    ctx,
    routeDenied,
    tab,
    pageError,
    manager,
    entertainer,
    attendance,
    attendanceAvailability,
    requestKind,
    requestHub,
    requestHubLoading,
    requestHubLoadingMore,
    requestHubLoadMoreFailed,
    requestHubUnavailable,
    retryProjection,
    attendancePayload,
    returnHome,
    returnFromSecondary,
    loadProjection,
    loadMyRequests,
    loadMoreRequests,
    navigateTo,
    replaceRoute,
    closeRequestKind,
    openRequestKind,
    selectedProfile,
    rank,
    rankIncomeComparison,
    incomeSummary,
    loanOverview,
    loanOverviewUnavailable,
    openPerson,
    loadManagerDashboard,
    logout,
    logoutBusy,
  ]);

  const splashVisible = splashPhase !== "hidden";
  const withStartupSplash = (view: ReactNode) => (
    <>
      <div
        className="startup-underlay"
        aria-hidden={splashVisible ? true : undefined}
        inert={splashVisible ? true : undefined}
      >
        {view}
      </div>
      {splashVisible ? (
        <WelcomeScreen exiting={splashPhase === "exiting"} />
      ) : null}
    </>
  );

  if (phase === "booting")
    return withStartupSplash(
      splashVisible ? null : (
        <div className="loading">
          <RefreshCw className="spin" />
          Мэдээлэл ачаалж байна…
        </div>
      ),
    );
  if (phase === "offline")
    return withStartupSplash(
      <StartupState
        kind="offline"
        title="Интернет холболтгүй байна"
        message={
          runtimeError?.message || "Сүлжээ орсны дараа дахин оролдоно уу."
        }
        onRetry={() => {
          void bootstrap();
        }}
      />
    );
  if (phase === "fatal")
    return withStartupSplash(
      <StartupState
        kind="error"
        title="Ажилтны апптай холбогдож чадсангүй"
        message={runtimeError?.message || "Түр хүлээгээд дахин оролдоно уу."}
        onRetry={() => {
          void bootstrap();
        }}
      />
    );
  if (phase === "unauthorized")
    return withStartupSplash(
      <UnauthorizedState
        busy={logoutBusy}
        onLogout={() => {
          void logout();
        }}
      />
    );
  if (phase === "guest" || phase === "session-expired")
    return withStartupSplash(
      <Login
        onLogin={login}
        sessionExpired={phase === "session-expired"}
        notice={loginNotice}
        online={online}
      />
    );
  if (phase !== "authenticated" || !ctx)
    return withStartupSplash(
      <StartupState
        kind="error"
        title="Аппын төлөв тодорхойгүй байна"
        message="Хуудсыг дахин ачаална уу."
        onRetry={() => {
          void bootstrap();
        }}
      />
    );

  return withStartupSplash(
    <Shell
      ctx={ctx}
      tab={tab}
      attendanceAvailability={attendanceAvailability}
      profileName={
        entertainer?.profile.stage_name ||
        entertainer?.profile.employee_name ||
        ctx.full_name
      }
      profilePhoto={entertainer?.profile.profile_photo}
      onTab={navigateTo}
      onLogout={() => {
        void logout();
      }}
      online={online}
      accessDenied={false}
      onDismissAccess={() => undefined}
    >
      {content}
      {message ? (
        <button className="toast" onClick={() => setMessage("")}>
          {message}
        </button>
      ) : null}
    </Shell>
  );
}

export default function App() {
  const prototype = new URLSearchParams(window.location.search).get("prototype");
  if (prototype === "dancer")
    return (
      <Suspense fallback={<div className="loading">Мэдээлэл ачаалж байна…</div>}>
        <DancerPrototype />
      </Suspense>
    );
  return <AppRuntime />;
}

const DancerPrototype = lazy(() =>
  import("./features/dancer-ops/DancerOperatingApp").then((module) => ({
    default: module.DancerOperatingApp,
  })),
);
