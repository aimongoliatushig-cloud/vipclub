import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CloudOff } from "lucide-react";
import "./dancer-ops.css";
import { isOpsLocale, localeStorageKey, opsCopy, type OpsLocale } from "./locale";
import {
  attendanceRecords,
  formatMoney,
  type LoanRequest,
  shifts,
  transactions,
  type AppView,
  type AttendanceRecord,
  type MainTab,
  type RequestState,
  type Shift,
  type Transaction,
} from "./model";
import { BottomNavigation, DesktopNavigation, Toast, type OpsTheme } from "./ui";
import {
  ActiveServiceScreen,
  CompletionScreen,
  HomeScreen,
  RequestCenterScreen,
  RequestDetailScreen,
  ServiceRequestScreen,
} from "./HomeRequestScreens";
import { AdjustmentScreen, EarningsScreen, TransactionDetailScreen } from "./EarningsScreens";
import {
  NotificationsScreen,
  ProfileScreen,
  RankScreen,
  ScheduleScreen,
  SettingsScreen,
  ShiftDetailScreen,
} from "./ScheduleProfileScreens";
import { TeamExceptionScreen, TeamScreen } from "./TeamScreens";
import { AttendanceDetailScreen, AttendanceScreen } from "./AttendanceScreens";
import { LoanScreen } from "./LoanScreen";

const tabForView: Record<AppView, MainTab> = {
  home: "home",
  loan: "home",
  attendance: "schedule",
  "attendance-day": "schedule",
  requests: "requests",
  "service-request": "home",
  schedule: "schedule",
  earnings: "earnings",
  profile: "profile",
  "request-detail": "home",
  "active-service": "home",
  completion: "home",
  "transaction-detail": "earnings",
  "shift-detail": "schedule",
  rank: "profile",
  settings: "profile",
  notifications: "home",
  team: "home",
  "team-exception": "home",
  adjustment: "earnings",
};

export function DancerOperatingApp() {
  const searchParams = new URLSearchParams(window.location.search);
  const requestedTheme = searchParams.get("theme");
  const requestedLocale = searchParams.get("lang");
  const forceOffline = new URLSearchParams(window.location.search).get("offline") === "1";
  const [theme, setTheme] = useState<OpsTheme>(() => {
    if (requestedTheme === "dark" || requestedTheme === "light") return requestedTheme;
    return window.localStorage.getItem("vip-dancer-theme-v1") === "dark" ? "dark" : "light";
  });
  const [locale, setLocale] = useState<OpsLocale>(() => {
    if (isOpsLocale(requestedLocale)) return requestedLocale;
    const stored = window.localStorage.getItem(localeStorageKey);
    return isOpsLocale(stored) ? stored : "mn";
  });
  const [view, setView] = useState<AppView>("home");
  const [requestState, setRequestState] = useState<RequestState>("new");
  const [requestCountdown, setRequestCountdown] = useState(98);
  const [serviceRemaining, setServiceRemaining] = useState(84 * 60);
  const [extensionRequested, setExtensionRequested] = useState(false);
  const [todayEarnings, setTodayEarnings] = useState(487_500);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction>(transactions[0]);
  const [selectedShift, setSelectedShift] = useState<Shift>(shifts[0]);
  const [selectedAttendance, setSelectedAttendance] = useState<AttendanceRecord>(attendanceRecords[0]);
  const isSenior = true;
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [toastTone, setToastTone] = useState<"success" | "danger">("success");
  const [unreadNotifications, setUnreadNotifications] = useState(4);
  const [loanRequest, setLoanRequest] = useState<LoanRequest | null>(null);
  const [confirmDecline, setConfirmDecline] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [online, setOnline] = useState(() => forceOffline ? false : navigator.onLine);
  const [returnView, setReturnView] = useState<AppView>("home");
  const historyReady = useRef(false);
  const historyNavigation = useRef(false);

  const activeTab = tabForView[view];
  const title = requestState === "accepted"
    ? opsCopy[locale].shell.activeServiceTitle
    : opsCopy[locale].shell.appTitle;

  useEffect(() => {
    window.localStorage.setItem("vip-dancer-theme-v1", theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem(localeStorageKey, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (forceOffline) return;
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [forceOffline]);

  useEffect(() => {
    if (requestState !== "new" || requestCountdown <= 0) return;
    const timer = window.setTimeout(() => setRequestCountdown((value) => Math.max(0, value - 1)), 1_000);
    return () => window.clearTimeout(timer);
  }, [requestCountdown, requestState]);

  useEffect(() => {
    if (requestState !== "accepted" || serviceRemaining <= 0) return;
    const timer = window.setTimeout(() => setServiceRemaining((value) => Math.max(0, value - 1)), 1_000);
    return () => window.clearTimeout(timer);
  }, [requestState, serviceRemaining]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setConfirmDecline(false);
      setConfirmComplete(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [view]);

  useEffect(() => {
    if (!historyReady.current) {
      window.history.replaceState({ ...window.history.state, dancerView: view }, "", `${window.location.pathname}${window.location.search}#${view}`);
      historyReady.current = true;
      return;
    }
    if (historyNavigation.current) {
      historyNavigation.current = false;
      return;
    }
    if (window.history.state?.dancerView === view && window.location.hash === `#${view}`) return;
    window.history.pushState({ ...window.history.state, dancerView: view }, "", `${window.location.pathname}${window.location.search}#${view}`);
  }, [view]);

  useEffect(() => {
    const handleHistory = (event: PopStateEvent) => {
      const next = event.state?.dancerView as AppView | undefined;
      historyNavigation.current = true;
      setView(next || "home");
    };
    window.addEventListener("popstate", handleHistory);
    return () => window.removeEventListener("popstate", handleHistory);
  }, []);

  const showToast = (message: string, tone: "success" | "danger" = "success") => {
    setToastTone(tone);
    setToast(message);
    window.setTimeout(() => setToast(""), 3_000);
  };

  const selectTab = (tab: MainTab) => {
    if (tab === "home" && requestState === "accepted") setView("active-service");
    else setView(tab);
  };

  const openSecondary = (next: AppView) => {
    setReturnView(view);
    setView(next);
  };

  const openNotifications = () => {
    setUnreadNotifications(0);
    openSecondary("notifications");
  };

  const toggleTheme = () => setTheme((value) => value === "dark" ? "light" : "dark");

  const acceptRequest = () => {
    if (!online) {
      showToast("Интернет холболтоо шалгаад дахин оролдоно уу.", "danger");
      return;
    }
    setBusy(true);
    window.setTimeout(() => {
      setRequestState("accepted");
      setBusy(false);
      setView("active-service");
      showToast("VIP 03 хүсэлтийг зөвшөөрлөө.");
    }, 650);
  };

  const declineRequest = () => {
    setConfirmDecline(false);
    setRequestState("declined");
    showToast("Хүсэлтийг татгалзлаа.");
  };

  const completeService = () => {
    setConfirmComplete(false);
    setRequestState("completed");
    setTodayEarnings((value) => value + 240_000);
    setView("completion");
  };

  let screen: React.ReactNode;
  switch (view) {
    case "home":
      screen = (
        <HomeScreen
          todayEarnings={todayEarnings}
          unreadNotifications={unreadNotifications}
          theme={theme}
          locale={locale}
          loanRequest={loanRequest}
          onEarnings={() => setView("earnings")}
          onAttendance={() => setView("attendance")}
          onRank={() => setView("rank")}
          onRequests={() => setView("requests")}
          onLoan={() => setView("loan")}
          onThemeToggle={toggleTheme}
          onNotifications={openNotifications}
        />
      );
      break;
    case "loan":
      screen = (
        <LoanScreen
          request={loanRequest}
          onBack={() => setView("home")}
          onSubmit={(request) => {
            setLoanRequest(request);
            showToast("Зээлийн хүсэлтийг илгээлээ.");
          }}
        />
      );
      break;
    case "attendance":
      screen = <AttendanceScreen onRecord={(record) => { setSelectedAttendance(record); setView("attendance-day"); }} />;
      break;
    case "attendance-day":
      screen = <AttendanceDetailScreen record={selectedAttendance} onBack={() => setView("attendance")} onRequestCorrection={() => showToast("Ирц засуулах хүсэлтийг нээлээ.")} />;
      break;
    case "requests":
      screen = <RequestCenterScreen onSubmitted={(message) => showToast(message)} />;
      break;
    case "service-request":
      screen = (
        <ServiceRequestScreen
          state={requestState}
          countdown={requestCountdown}
          busy={busy}
          onDetail={() => setView("request-detail")}
          onAccept={acceptRequest}
          onDecline={() => setConfirmDecline(true)}
        />
      );
      break;
    case "request-detail":
      screen = <RequestDetailScreen onBack={() => setView("service-request")} onAccept={acceptRequest} busy={busy} />;
      break;
    case "active-service":
      screen = (
        <ActiveServiceScreen
          remaining={serviceRemaining}
          extensionRequested={extensionRequested}
          onBack={() => setView("home")}
          onExtension={() => {
            setExtensionRequested(true);
            showToast("Сунгалтын хүсэлт илгээлээ.");
          }}
          onComplete={() => setConfirmComplete(true)}
        />
      );
      break;
    case "completion":
      screen = <CompletionScreen onContinue={() => setView("home")} onEarnings={() => setView("earnings")} />;
      break;
    case "earnings":
      screen = (
        <EarningsScreen
          todayEarnings={todayEarnings}
          onTransaction={(transaction) => {
            setSelectedTransaction(transaction);
            setView("transaction-detail");
          }}
          onAdjustment={() => setView("adjustment")}
        />
      );
      break;
    case "transaction-detail":
      screen = <TransactionDetailScreen transaction={selectedTransaction} onBack={() => setView("earnings")} />;
      break;
    case "adjustment":
      screen = <AdjustmentScreen onBack={() => setView("earnings")} onExplain={() => showToast("Тайлбар хүсэх хүсэлтийг илгээлээ.")} />;
      break;
    case "schedule":
      screen = <ScheduleScreen onAttendance={() => setView("attendance")} onShift={(shift) => { setSelectedShift(shift); setView("shift-detail"); }} />;
      break;
    case "shift-detail":
      screen = <ShiftDetailScreen shift={selectedShift} onBack={() => setView("schedule")} onRequestChange={() => showToast("Ээлж солих хүсэлт илгээлээ.")} />;
      break;
    case "profile":
      screen = <ProfileScreen isSenior={isSenior} locale={locale} onRank={() => setView("rank")} onNotifications={openNotifications} onSettings={() => setView("settings")} />;
      break;
    case "settings":
      screen = <SettingsScreen locale={locale} theme={theme} onBack={() => setView("profile")} onLocaleChange={setLocale} onThemeToggle={toggleTheme} />;
      break;
    case "rank":
      screen = <RankScreen onBack={() => setView("profile")} />;
      break;
    case "notifications":
      screen = (
        <NotificationsScreen
          requestCountdown={requestCountdown}
          onBack={() => setView(returnView)}
          onRequests={() => setView(requestState === "accepted" ? "active-service" : "service-request")}
          onSchedule={() => setView("schedule")}
          onEarnings={() => setView("earnings")}
          onRank={() => setView("rank")}
        />
      );
      break;
    case "team":
      screen = isSenior ? <TeamScreen onBack={() => setView("home")} onException={() => setView("team-exception")} /> : <HomeScreen todayEarnings={todayEarnings} unreadNotifications={unreadNotifications} theme={theme} locale={locale} loanRequest={loanRequest} onEarnings={() => setView("earnings")} onAttendance={() => setView("attendance")} onRank={() => setView("rank")} onRequests={() => setView("requests")} onLoan={() => setView("loan")} onThemeToggle={toggleTheme} onNotifications={openNotifications} />;
      break;
    case "team-exception":
      screen = (
        <TeamExceptionScreen
          onBack={() => setView("team")}
          onRemind={() => showToast("Уянгад дахин санууллаа.")}
          onReassign={() => showToast("Ануг дараагийн сонголтоор санал болголоо.")}
        />
      );
      break;
  }

  return (
    <div className={`dancer-ops-app${theme === "dark" ? " is-dark" : ""}`} aria-label={title}>
      <DesktopNavigation active={activeTab} theme={theme} locale={locale} unreadCount={unreadNotifications} onSelect={selectTab} onThemeToggle={toggleTheme} onNotifications={openNotifications} />
      <div className="ops-workbench">
        {!online ? <div className="ops-offline-banner" role="status"><CloudOff aria-hidden="true" /> Интернетгүй · Сүүлд шинэчилсэн 21:04</div> : null}
        <main className="ops-main" id="main-content">{screen}</main>
        {view !== "completion" ? <BottomNavigation active={activeTab} locale={locale} onSelect={selectTab} /> : null}
      </div>

      <Toast message={toast} tone={toastTone} onClose={() => setToast("")} />

      {confirmDecline ? (
        <ConfirmationSheet
          title="Үйлчилгээний хүсэлтээс татгалзах уу?"
          message="Татгалзсаны дараа энэ хүсэлтийг буцаах боломжгүй."
          primaryLabel="Татгалзах"
          tone="danger"
          onConfirm={declineRequest}
          onCancel={() => setConfirmDecline(false)}
        />
      ) : null}

      {confirmComplete ? (
        <ConfirmationSheet
          title="Үйлчилгээ дууссан уу?"
          message={`Дуусгаснаар 2 цагийн үйлчилгээ хаагдаж, ${formatMoney(240_000)} орлогын бүртгэл үүснэ.`}
          primaryLabel="Үйлчилгээ дуусгах"
          onConfirm={completeService}
          onCancel={() => setConfirmComplete(false)}
        />
      ) : null}
    </div>
  );
}

function ConfirmationSheet({
  title,
  message,
  primaryLabel,
  tone = "primary",
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  primaryLabel: string;
  tone?: "primary" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="ops-modal-layer" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onCancel(); }}>
      <section className="ops-confirm-sheet" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message">
        <h2 id="confirm-title">{title}</h2>
        <p id="confirm-message">{message}</p>
        <div>
          <button className={tone === "danger" ? "ops-danger-button" : "ops-primary-button"} type="button" onClick={onConfirm}>{primaryLabel}</button>
          <button className="ops-secondary-button" type="button" onClick={onCancel}>Буцах</button>
        </div>
      </section>
    </div>
  );
}
