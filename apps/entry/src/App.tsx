import { useCallback, useEffect, useRef, useState } from "react";
import {
  Ban,
  BedDouble,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardList,
  Clock3,
  Coins,
  DoorOpen,
  Eye,
  Heart,
  MapPin,
  Phone,
  QrCode,
  ReceiptText,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  ShoppingBag,
  Star,
  UserPlus,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import {
  api,
  setEntryAccessEvidence,
  type AppContext,
  type CustomerDetail,
  type DailyEntryWorkspace,
  type DailyGuestItem,
  type Entry,
  type EntrySummary,
  type EntryAccessVerification,
  type EntryQRContext,
  type PhoneReservation,
  type ServiceEntryFeed,
} from "./api";
import AdminApp from "./AdminApp";
import { Brand, Header } from "./AppHeader";
import { subscribeRealtime } from "./realtime";

const money = (value: number) =>
  new Intl.NumberFormat("mn-MN", {
    style: "currency",
    currency: "MNT",
    maximumFractionDigits: 0,
  }).format(value || 0);
const compactMoney = (value: number) =>
  Math.abs(value || 0) >= 1_000_000
    ? `${new Intl.NumberFormat("mn-MN", { maximumFractionDigits: 1 }).format((value || 0) / 1_000_000)} сая ₮`
    : money(value);
const dateTime = (value: string) => {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (match) return `${match[1]}.${match[2]}.${match[3]} ${match[4]}:${match[5]}`;
  return new Intl.DateTimeFormat("mn-MN", {
    hour: "2-digit",
    minute: "2-digit",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour12: false,
  }).format(new Date(value));
};
const dateOnly = (value: string | null) =>
  value ? value.match(/^(\d{4})-(\d{2})-(\d{2})/)?.slice(1).join(".") || new Intl.DateTimeFormat("mn-MN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value)) : "—";
const timeOnly = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("mn-MN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(value))
    : "—";
const durationLabel = (minutes: number) => {
  const hours = Math.floor((minutes || 0) / 60);
  const rest = (minutes || 0) % 60;
  return hours && rest
    ? `${hours} цаг ${rest} мин`
    : hours
      ? `${hours} цаг`
      : `${rest} мин`;
};
const onlyDigits = (value: string) => value.replace(/\D/g, "").slice(0, 8);
const phoneView = (value: string) => {
  const d = onlyDigits(value);
  return d.length > 4 ? `${d.slice(0, 4)} ${d.slice(4)}` : d;
};
const visitLabel = (number: number) =>
  number <= 1 ? "Анх удаа ирж байна" : `${number} дахь удаагаа ирж байна`;
const rankClass = (value: string) =>
  `rank-${value.toLowerCase().replace(/\s+/g, "-")}`;
const localDateTimeValue = (value: Date) => {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
};
const nextReservationTime = () => {
  const now = new Date();
  const value = new Date(now.getTime() + 30 * 60_000);
  value.setMinutes(Math.ceil(value.getMinutes() / 15) * 15, 0, 0);
  const operationalEnd = new Date(now);
  if (now.getHours() >= 12) operationalEnd.setDate(operationalEnd.getDate() + 1);
  operationalEnd.setHours(12, 0, 0, 0);
  if (value >= operationalEnd) value.setTime(operationalEnd.getTime() - 5 * 60_000);
  return localDateTimeValue(value);
};
const reservationHours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const reservationMinutes = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, "0"));
const reservationDateTimeLabel = (value: string) => {
  const [datePart = "", timePart = ""] = value.replace(" ", "T").split("T");
  const [, month = "", day = ""] = datePart.split("-");
  return month && day && timePart ? `${Number(month)}-р сарын ${Number(day)} · ${timePart.slice(0, 5)}` : "Цаг сонгоогүй";
};
const workDayLabel = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  const weekdays = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];
  const weekday = weekdays[new Date(year, month - 1, day, 12).getDay()];
  return `${year} оны ${month}-р сарын ${day} · ${weekday}`;
};

async function showSystemNotification(
  title: string,
  options: NotificationOptions,
  onFallbackClick?: () => void,
) {
  if (!("Notification" in window) || Notification.permission !== "granted")
    return;
  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, options);
      return;
    }
    const notice = new Notification(title, options);
    if (onFallbackClick)
      notice.onclick = () => {
        window.focus();
        onFallbackClick();
        notice.close();
      };
  } catch {
    /* The in-app alert remains visible if this browser cannot show a system notification. */
  }
}

function AmbientStage() {
  useEffect(() => {
    if (!window.matchMedia("(pointer:fine)").matches) return;
    let frame = 0;
    const move = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        document.documentElement.style.setProperty(
          "--pointer-x",
          `${event.clientX}px`,
        );
        document.documentElement.style.setProperty(
          "--pointer-y",
          `${event.clientY}px`,
        );
      });
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
    };
  }, []);
  return (
    <div className="ambient-stage" aria-hidden="true">
      <i />
      <i />
      <i />
    </div>
  );
}

function EntryDayHeader({
  workspace,
  loading,
  onRefresh,
}: {
  workspace: DailyEntryWorkspace | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  const activeDate = workspace?.work_date || "";
  return (
    <section className="entry-day-overview" aria-label="Үүдний бүртгэлийн өдөр">
      <div className="entry-day-title">
        <span className="entry-day-icon"><CalendarDays /></span>
        <div>
          <small>{workspace?.branch || "САЛБАР"}</small>
          <h1>{workspace?.is_current === false ? "Өмнөх өдрийн бүртгэл" : "Өнөөдрийн үүдний бүртгэл"}</h1>
          <p>{activeDate ? workDayLabel(activeDate) : "Өдрийг тодорхойлж байна…"}</p>
        </div>
        <button className="entry-day-refresh" type="button" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={loading ? "spin" : ""} />
          <span>Шинэчлэх</span>
        </button>
      </div>
      <div className="entry-day-metrics">
        <span><Clock3 /><small>Хүлээж буй</small><strong>{workspace?.summary?.waiting || 0}</strong></span>
        <span><DoorOpen /><small>Нэвтэрсэн</small><strong>{workspace?.summary?.arrived || 0}</strong></span>
        <span><X /><small>Цуцлагдсан</small><strong>{workspace?.summary?.cancelled || 0}</strong></span>
      </div>
      <p className="entry-day-boundary">
        Энэ хэсэгт зөвхөн сонгосон оройн болон дараагийн өглөөний бүртгэл харагдана. Өмнөх өдөр өнөөдрийн тоонд орохгүй.
      </p>
    </section>
  );
}

function DailyGuestList({
  workspace,
  busyName,
  onAdmit,
  onCancel,
  onDetail,
}: {
  workspace: DailyEntryWorkspace | null;
  busyName?: string;
  onAdmit?: (item: DailyGuestItem) => void;
  onCancel?: (item: DailyGuestItem) => void;
  onDetail?: (item: DailyGuestItem) => void;
}) {
  const items = workspace?.items || [];
  return (
    <section className="daily-guest-panel">
      <header>
        <div><ClipboardList /><span><h2>Зочдын жагсаалт</h2><p>{workspace?.is_current === false ? "Түүхийн мэдээлэл · засварлахгүй" : "Одоогийн ажлын өдөр"}</p></span></div>
        <strong>{items.length}</strong>
      </header>
      <div className="daily-guest-list">
        {items.map((item) => {
          const waiting = item.status === "Scheduled";
          const arrived = item.status === "Arrived";
          return (
            <article className={`daily-guest-row status-${item.status.toLowerCase()} ${item.is_banned ? "is-banned" : ""}`} key={`${item.kind}-${item.name}`}>
              <div className="daily-guest-time">
                <small>{waiting ? "ИРЭХ ЦАГ" : arrived ? "НЭВТЭРСЭН" : "БҮРТГЭСЭН"}</small>
                <strong>{timeOnly(item.actual_at || item.expected_at)}</strong>
              </div>
              <div className="daily-guest-person">
                <strong>{item.customer_name === item.phone ? "Нэргүй зочин" : item.customer_name}</strong>
                <span>{item.phone ? phoneView(item.phone) : "Шууд нэвтрүүлсэн"} · {item.party_size || 1} хүн</span>
                {item.notes && <p>{item.notes}</p>}
                {Boolean(item.is_banned) && <p className="daily-guest-ban"><Ban /> Нэвтрэх эрхгүй: {item.ban_reason || "Шалтгаан оруулаагүй"}</p>}
              </div>
              <div className="daily-guest-status">
                <span className={`daily-status status-${item.status.toLowerCase()}`}>
                  {waiting ? "Хүлээж байна" : arrived ? "Нэвтэрсэн" : "Цуцлагдсан"}
                </span>
                <div>
                  {onDetail && item.phone && <button type="button" className="daily-secondary" onClick={() => onDetail(item)}><Eye /> Мэдээлэл</button>}
                  {workspace?.is_current !== false && waiting && onAdmit && (
                    <button type="button" className="daily-primary" onClick={() => onAdmit(item)} disabled={Boolean(busyName) || Boolean(item.is_banned)}>
                      {item.is_banned ? <><Ban /> Нэвтрэх эрхгүй</> : <><DoorOpen />{busyName === item.name ? "Нэвтрүүлж байна…" : "Нэвтрүүлэх"}</>}
                    </button>
                  )}
                  {workspace?.is_current !== false && waiting && onCancel && (
                    <button type="button" className="daily-danger" onClick={() => onCancel(item)} disabled={Boolean(busyName)}><X /> Цуцлах</button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
        {!items.length && (
          <div className="daily-guest-empty"><ClipboardList /><div><strong>Энэ өдөр зочны бүртгэл алга</strong><span>Өөр өдрийн мэдээлэл энд холилдохгүй.</span></div></div>
        )}
      </div>
    </section>
  );
}

function ServiceEntryPanel({ feed }: { feed: ServiceEntryFeed | null }) {
  return <section className="service-entry-panel">
    <header><div><DoorOpen /><span><h2>Нэвтэрсэн зочид</h2><p>Зөвхөн угтахад хэрэгтэй мэдээлэл</p></span></div><strong>{feed?.today_total || 0}</strong></header>
    <div>{feed?.entries.map((entry) => <article key={entry.name}>
      <time>{timeOnly(entry.entered_at)}</time>
      <span><strong>{entry.customer_name}</strong><small>{entry.visit_number > 1 ? `${entry.visit_number} дахь ирэлт` : 'Анхны ирэлт'}</small></span>
      <Rank value={entry.membership_rank || 'Unassigned'} />
      {entry.service_characteristics ? <p><Heart />{entry.service_characteristics}</p> : null}
    </article>)}{!feed?.entries.length ? <p className="service-entry-empty">Энэ ээлжийн нэвтрэлт хараахан алга.</p> : null}</div>
  </section>
}

function Login({
  onLogin,
  requiredBranch,
}: {
  onLogin: (ctx: AppContext) => void | Promise<void>;
  requiredBranch?: string;
}) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const loginId = /^\+?[\d\s()-]+$/.test(phone.trim()) ? phone.replace(/\D/g, "").slice(-8) : phone.trim();
      await api.login(loginId, password);
      await onLogin(await api.context());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Нэвтрэх боломжгүй");
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="login-screen">
      <form className="login-panel" onSubmit={submit}>
        <Brand />
        <h2>{requiredBranch ? `${requiredBranch} салбарын VIP Entry` : "VIP үүдний систем"}</h2>
        <p>{requiredBranch ? `${requiredBranch} салбарт оноогдсон эрхээр нэвтэрнэ үү` : "Салбарын эрхээрээ нэвтэрнэ үү"}</p>
        <label>
          Утасны дугаар
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            placeholder="99112233"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
          />
        </label>
        <label>
          Нууц үг
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && <div className="error-box">{error}</div>}
        <button className="gold-button" disabled={loading}>
          {loading ? "Нэвтэрч байна…" : "Нэвтрэх"}
        </button>
      </form>
    </main>
  );
}

function EntryQRFailure({ message }: { message: string }) {
  return (
    <main className="entry-access-screen">
      <section className="entry-access-card">
        <Brand />
        <span className="entry-access-icon"><QrCode /></span>
        <h1>VIP Entry QR ашиглах боломжгүй</h1>
        <div className="entry-access-error" role="alert"><MapPin />{message}</div>
        <p>Салбар дээр байршуулсан идэвхтэй QR кодыг дахин уншуулна уу.</p>
      </section>
    </main>
  );
}

type LocationEvidence = { latitude: number; longitude: number; accuracy: number };

function getCurrentPosition(): Promise<LocationEvidence> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Энэ төхөөрөмж байршил тодорхойлох боломжгүй байна."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
      }),
      (error) => reject(new Error(
        error.code === 1
          ? "VIP Entry ашиглахын тулд байршлын зөвшөөрөл өгнө үү."
          : "Байршил тогтоож чадсангүй. GPS-ээ асаагаад дахин оролдоно уу.",
      )),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

function BranchEntryAccess({
  ctx,
  onVerified,
  onLogout,
}: {
  ctx: AppContext;
  onVerified: (result: EntryAccessVerification) => void;
  onLogout: () => void;
}) {
  const params = new URLSearchParams(window.location.search);
  const queryToken = params.get("entry_access") || "";
  const [token] = useState(() => queryToken || sessionStorage.getItem("vip-entry-branch-qr") || "");
  const [checking, setChecking] = useState(Boolean(token));
  const [error, setError] = useState("");

  const verify = useCallback(async () => {
    if (!token) return;
    setChecking(true);
    setError("");
    try {
      const position = await getCurrentPosition();
      const result = await api.verifyEntryAccess(
        token,
        position.latitude,
        position.longitude,
        position.accuracy,
      );
      setEntryAccessEvidence({ token, ...position });
      sessionStorage.setItem("vip-entry-branch-qr", token);
      if (queryToken) {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("entry_access");
        window.history.replaceState({}, "", `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
      }
      onVerified(result);
    } catch (err) {
      setEntryAccessEvidence(null);
      setError(err instanceof Error ? err.message : "Салбарын эрхийг баталгаажуулж чадсангүй.");
    } finally {
      setChecking(false);
    }
  }, [onVerified, queryToken, token]);

  useEffect(() => {
    if (token) void verify();
  }, [token, verify]);

  return (
    <main className="entry-access-screen">
      <section className="entry-access-card">
        <Brand />
        <span className="entry-access-icon"><QrCode /></span>
        <h1>{checking ? "Салбарын эрхийг шалгаж байна" : "Салбарын QR уншуулна уу"}</h1>
        <p>
          {checking
            ? "QR код, таны салбарын эрх болон одоогийн байршлыг тулгаж байна."
            : `${ctx.full_name} · ${ctx.mode === "operation" ? "Оператор" : ctx.branch}`}
        </p>
        {error && <div className="entry-access-error" role="alert"><MapPin />{error}</div>}
        {!token && (
          <div className="entry-access-guide">
            <strong>VIP Entry QR-ийг утасны камераар уншуулна.</strong>
            <span>Nomad-ийн QR зөвхөн Nomad салбар дээр ажиллана.</span>
          </div>
        )}
        {token && (
          <button type="button" className="entry-access-primary" onClick={() => void verify()} disabled={checking}>
            <MapPin />{checking ? "Байршил шалгаж байна…" : "Байршлаа дахин шалгах"}
          </button>
        )}
        <button type="button" className="entry-access-logout" onClick={onLogout}>Өөр эрхээр нэвтрэх</button>
      </section>
    </main>
  );
}

function GuardDirectLookup({
  branch,
  onAdmitted,
}: {
  branch: string;
  onAdmitted: (customerName: string) => void;
}) {
  const [phone, setPhone] = useState("");
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [admitting, setAdmitting] = useState(false);
  const [error, setError] = useState("");
  const profile =
    detail?.branch_profiles.find(
      (branchProfile) => branchProfile.branch === detail.scope_branch,
    ) || detail?.branch_profiles[0];
  const searchCustomer = async (event: React.FormEvent) => {
    event.preventDefault();
    const digits = onlyDigits(phone);
    if (digits.length !== 8) return;
    setLoading(true);
    setError("");
    setDetail(null);
    setSearched(false);
    try {
      const result = await api.search(digits);
      setDetail(result.found && result.detail ? result.detail : null);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Хэрэглэгч хайх боломжгүй");
    } finally {
      setLoading(false);
    }
  };
  const admitDirect = async () => {
    if (!detail || profile?.is_banned) return;
    setAdmitting(true);
    setError("");
    try {
      await api.admit(detail.customer.name);
      onAdmitted(detail.customer.customer_name || detail.customer.phone);
      setPhone("");
      setDetail(null);
      setSearched(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Зочныг нэвтрүүлэх боломжгүй",
      );
    } finally {
      setAdmitting(false);
    }
  };
  return (
    <section className="guard-direct-entry">
      <div className="guard-direct-heading">
        <Phone />
        <div>
          <small>{branch.toUpperCase()} САЛБАР</small>
          <h2>Утасны дугаараар шууд нэвтрүүлэх</h2>
          <p>Зочны 8 оронтой дугаарыг оруулаад мэдээллийг шалгана.</p>
        </div>
      </div>
      <form className="guard-phone-search" onSubmit={searchCustomer}>
        <label htmlFor="guard-phone">Утасны дугаар</label>
        <div>
          <span>
            <Phone />
            <input
              id="guard-phone"
              inputMode="numeric"
              autoComplete="off"
              value={phoneView(phone)}
              onChange={(event) => {
                setPhone(onlyDigits(event.target.value));
                setDetail(null);
                setSearched(false);
                setError("");
              }}
              placeholder="9911 2233"
              aria-describedby="guard-phone-help"
            />
          </span>
          <button
            type="submit"
            disabled={loading || onlyDigits(phone).length !== 8}
          >
            <Search />
            {loading ? "Хайж байна…" : "Хайх"}
          </button>
        </div>
        <small id="guard-phone-help">
          Нэр болон худалдан авалтын дүн оруулах шаардлагагүй.
        </small>
      </form>
      {error && <div className="error-box guard-lookup-error">{error}</div>}
      {searched && !detail && (
        <div className="guard-customer-missing">
          <UserPlus />
          <div>
            <strong>Хэрэглэгч олдсонгүй</strong>
            <span>
              Энэ дугаарыг operator-оор бүртгүүлээд waitlist-ээс нэвтрүүлнэ үү.
            </span>
          </div>
        </div>
      )}
      {detail && (
        <article
          className={`guard-customer-result ${profile?.is_banned ? "is-banned" : ""}`}
        >
          <div className="guard-customer-identity">
            <span className="guard-customer-avatar">
              <Users />
            </span>
            <div>
              <small>ХЭРЭГЛЭГЧ ОЛДЛОО</small>
              <h3>
                {detail.customer.customer_name === detail.customer.phone
                  ? "Нэргүй зочин"
                  : detail.customer.customer_name}
              </h3>
              <p>{phoneView(detail.customer.phone)}</p>
            </div>
            <Rank value={profile?.membership_rank || "Unassigned"} />
          </div>
          {profile?.is_banned ? (
            <div className="guard-direct-ban" role="alert">
              <Ban />
              <div>
                <strong>Энэ салбарт нэвтрэх эрхгүй</strong>
                <span>{profile.ban_reason || "Шалтгаан оруулаагүй"}</span>
              </div>
            </div>
          ) : (
            <div className="guard-customer-facts">
              <span>
                Нийт ирэлт
                <strong>
                  {profile?.visit_count || detail.customer.visit_count || 0}{" "}
                  удаа
                </strong>
              </span>
              <span>
                Сүүлд ирсэн
                <strong>
                  {dateOnly(profile?.last_visit || detail.customer.last_visit)}
                </strong>
              </span>
              <span>
                Одоогийн оролт
                <strong>{visitLabel(detail.next_visit_number || 1)}</strong>
              </span>
            </div>
          )}
          <button
            className="guard-direct-admit"
            type="button"
            onClick={admitDirect}
            disabled={admitting || Boolean(profile?.is_banned)}
          >
            {profile?.is_banned ? (
              <>
                <Ban />
                Нэвтрэх эрхгүй
              </>
            ) : (
              <>
                <DoorOpen />
                {admitting ? "Нэвтрүүлж байна…" : "Нэвтрүүлэх"}
              </>
            )}
          </button>
        </article>
      )}
    </section>
  );
}

function GuardApp({
  ctx,
  onLogout,
}: {
  ctx: AppContext;
  onLogout: () => void;
}) {
  const [workspace, setWorkspace] = useState<DailyEntryWorkspace | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyReservation, setBusyReservation] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const refreshWaitlist = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const result = await api.guardWaitlist();
      setWorkspace(result);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Хүлээлгийн жагсаалт авах боломжгүй",
      );
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refreshWaitlist();
    const reconcile = () => void refreshWaitlist(true);
    const timer = window.setInterval(reconcile, 60_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") reconcile();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", reconcile);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", reconcile);
    };
  }, [refreshWaitlist]);
  useEffect(
    () =>
      subscribeRealtime("vip_phone_reservation", (payload) => {
        if (!payload.branch || payload.branch === ctx.branch)
          void refreshWaitlist(true);
      }),
    [ctx.branch, refreshWaitlist],
  );
  const admitWaiting = async (row: PhoneReservation) => {
    if (!row.customer) return;
    setBusyReservation(row.name);
    setError("");
    setSuccess("");
    try {
      await api.admit(row.customer, row.name);
      setSuccess(
        `${row.customer_name === row.phone ? "Зочин" : row.customer_name} нэвтэрлээ. Менежерт мэдэгдэл очсон.`,
      );
      await refreshWaitlist();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Зочныг нэвтрүүлэх боломжгүй",
      );
    } finally {
      setBusyReservation("");
    }
  };
  return (
    <>
      <Header ctx={ctx} onLogout={onLogout} title="Үүдний нэвтрүүлэлт" />
      <main className="guard-main guard-only-main entry-workbench">
        {error && <div className="error-box wide">{error}</div>}
        {success && (
          <div className="success-box guard-success" role="status">
            <Check />
            {success}
          </div>
        )}
        <EntryDayHeader
          workspace={workspace}
          loading={loading}
          onRefresh={() => void refreshWaitlist()}
        />
        {workspace?.is_current !== false && (
          <GuardDirectLookup
            branch={ctx.branch}
            onAdmitted={(customerName) => {
              setSuccess(`${customerName} нэвтэрлээ. Менежерт мэдэгдэл очсон.`);
              setError("");
              void refreshWaitlist();
            }}
          />
        )}
        <DailyGuestList workspace={workspace} busyName={busyReservation} onAdmit={admitWaiting} />
      </main>
    </>
  );
}

function Rank({ value }: { value: string }) {
  return (
    <span className={`rank-inline ${rankClass(value)}`}>
      {value === "Unassigned" ? "Зэрэглэлгүй" : value}
    </span>
  );
}

function EntryInsightModal({
  entry,
  summary,
  loading,
  error,
  onClose,
  onOpenFullDetail,
}: {
  entry: Entry;
  summary: EntrySummary | null;
  loading: boolean;
  error: string;
  onClose: () => void;
  onOpenFullDetail: () => void;
}) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", close);
    document.body.classList.add("drawer-open");
    return () => {
      document.removeEventListener("keydown", close);
      document.body.classList.remove("drawer-open");
    };
  }, [onClose]);
  const entertainer = summary?.top_entertainer;
  const entertainers = summary?.entertainers?.length
    ? summary.entertainers
    : entertainer
      ? [entertainer]
      : [];
  const latestBill = summary?.latest_bill;
  const billEntertainers = latestBill
    ? Array.from(
        new Set(
          latestBill.items.flatMap((item) =>
            item.dancers.map((dancer) => dancer.nickname || dancer.name),
          ),
        ),
      )
    : [];
  const billServices = latestBill?.items
    .filter((item) => !item.is_room)
    .slice(0, 3);
  const reservationItems = summary?.reservation?.order_items || [];
  return (
    <div
      className="insight-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="entry-insight"
        role="dialog"
        aria-modal="true"
        aria-label={`${entry.customer_name} зочны товч мэдээлэл`}
      >
        <div className="insight-header">
          <div className="insight-bell">
            <Bell />
          </div>
          <div>
            <span>ШИНЭ ЗОЧИН ИРЛЭЭ</span>
            <h2>{summary?.entry.customer_name || entry.customer_name}</h2>
            <p>
              {summary?.phone
                ? phoneView(summary.phone)
                : visitLabel(entry.visit_number || 1)}
            </p>
          </div>
          <button onClick={onClose} aria-label="Товч мэдээлэл хаах">
            <X />
          </button>
        </div>
        {loading ? (
          <div className="insight-loading">
            <RefreshCw className="spin" />
            <strong>Зочны товч мэдээллийг ачаалж байна…</strong>
          </div>
        ) : error ? (
          <div className="error-box insight-error">{error}</div>
        ) : (
          summary && (
            <div className="insight-body">
              <div className="insight-meta">
                <span>
                  <Clock3 /> {dateTime(summary.entry.entered_at)}
                </span>
                <span>
                  <ShieldCheck /> {summary.entry.guard_name}
                </span>
                <span>
                  <Users /> {visitLabel(summary.entry.visit_number)}
                </span>
              </div>
              <div className="insight-metrics">
                <article>
                  <Users />
                  <span>
                    Нийт ирсэн<strong>{summary.visit_count} удаа</strong>
                  </span>
                </article>
                <article>
                  <ReceiptText />
                  <span>
                    Дундаж баримт<strong>{compactMoney(summary.average_bill)}</strong>
                  </span>
                </article>
                <article>
                  <ShieldCheck />
                  <span>
                    VIP зэрэг
                    <strong>
                      <Rank value={summary.membership_rank} />
                    </strong>
                  </span>
                </article>
              </div>
              {summary.reservation && (
                <section className="insight-reservation" aria-label="Энэ удаагийн захиалга">
                  <div className="insight-section-heading">
                    <ClipboardList />
                    <div>
                      <small>ЭНЭ УДААГИЙН ЗАХИАЛГА</small>
                      <strong>
                        {timeOnly(summary.reservation.expected_at)} · {summary.reservation.party_size} хүн
                      </strong>
                    </div>
                    <span>Ирсэн</span>
                  </div>
                  {reservationItems.length > 0 ? (
                    <ul>
                      {reservationItems.map((item, index) => (
                        <li key={`${summary.reservation?.name}-${index}`}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>Өрөө, бүжигчин эсвэл үйлчилгээ урьдчилан тэмдэглээгүй.</p>
                  )}
                  {summary.reservation.notes && <p className="insight-reservation-note">Тайлбар: {summary.reservation.notes}</p>}
                </section>
              )}
              <section className="insight-history" aria-label="Сүүлийн бодит bill">
                <div className="insight-section-heading">
                  <ReceiptText />
                  <div>
                    <small>СҮҮЛИЙН БОДИТ BILL</small>
                    <strong>
                      {latestBill
                        ? `${dateOnly(latestBill.posting_date)} · ${latestBill.bill_code || latestBill.name}`
                        : "Өмнөх bill-ийн мэдээлэлгүй"}
                    </strong>
                  </div>
                  {latestBill && (
                    <span className={latestBill.is_paid ? "is-paid" : "is-pending"}>
                      {latestBill.is_paid ? "Төлөгдсөн" : "Төлбөр хүлээгдэж байна"}
                    </span>
                  )}
                </div>
                {latestBill ? (
                  <>
                    <div className="insight-bill-total">
                      <span>{latestBill.store_name}</span>
                      <strong>{latestBill.bill_type === 2 ? "− " : ""}{money(Math.abs(latestBill.total_amount))}</strong>
                    </div>
                    <div className="insight-history-grid">
                      <article>
                        <BedDouble />
                        <span>Өмнө орсон өрөө</span>
                        <strong>
                          {latestBill.rooms?.length
                            ? latestBill.rooms.map((room) => `${room.name} · ${room.hours} цаг`).join(", ")
                            : "Өрөө бүртгэгдээгүй"}
                        </strong>
                      </article>
                      <article>
                        <Star />
                        <span>Тухайн bill-ийн бүжигчин</span>
                        <strong>{billEntertainers.length ? billEntertainers.join(", ") : "Бүжигчин бүртгэгдээгүй"}</strong>
                      </article>
                      <article>
                        <ShoppingBag />
                        <span>Авсан зүйл</span>
                        <strong>
                          {billServices?.length
                            ? billServices.map((item) => `${item.name} × ${item.quantity}`).join(", ")
                            : "Үйлчилгээний мөр байхгүй"}
                        </strong>
                      </article>
                      <article>
                        <Clock3 />
                        <span>Bill-ийн хугацаа</span>
                        <strong>
                          {latestBill.open_date
                            ? `${timeOnly(latestBill.open_date)}–${timeOnly(latestBill.closed_date)}${latestBill.duration_minutes > 0 ? ` · ${durationLabel(latestBill.duration_minutes)}` : ""}`
                            : "Цагийн мэдээлэлгүй"}
                        </strong>
                      </article>
                    </div>
                  </>
                ) : (
                  <p className="insight-history-empty">Энэ салбарт баталгаажсан POS bill хараахан байхгүй.</p>
                )}
              </section>
              <p className="insight-preference">
                <Star />
                <span>
                  Давтамжтай сонголт:
                  <strong>
                    {entertainers.length
                      ? entertainers.map((row) => `${row.nickname || row.name} · ${row.service_count} удаа`).join(" • ")
                      : " мэдээлэлгүй"}
                  </strong>
                </span>
              </p>
              <div className="insight-actions">
                <button className="insight-full" onClick={onOpenFullDetail}>
                  <Eye /> Бүрэн түүх харах
                </button>
                <button className="insight-done" onClick={onClose}>
                  <Check /> Ойлголоо, хаах
                </button>
              </div>
            </div>
          )
        )}
      </section>
    </div>
  );
}

function CustomerDetailDrawer({
  entry,
  detail,
  loading,
  error,
  onClose,
  onRankSaved,
  canEditRank = true,
  approvalMode = "manager",
}: {
  entry: Entry;
  detail: CustomerDetail | null;
  loading: boolean;
  error: string;
  onClose: () => void;
  onRankSaved: (detail: CustomerDetail) => void;
  canEditRank?: boolean;
  approvalMode?: "manager" | "operation";
}) {
  const [rankChoice, setRankChoice] = useState("Automatic");
  const [rankSaving, setRankSaving] = useState(false);
  const [rankError, setRankError] = useState("");
  const [rankSuccess, setRankSuccess] = useState("");
  const [banReason, setBanReason] = useState("");
  const [banSaving, setBanSaving] = useState(false);
  const [banError, setBanError] = useState("");
  const [banSuccess, setBanSuccess] = useState("");
  const [banConfirmOpen, setBanConfirmOpen] = useState(false);
  const [expandedBill, setExpandedBill] = useState<string | null>(null);
  const [redeemBill, setRedeemBill] = useState("");
  const [redeemCategory, setRedeemCategory] = useState<"Tax" | "VIP Room">(
    "Tax",
  );
  const [redeemPoints, setRedeemPoints] = useState("");
  const [redeemNote, setRedeemNote] = useState("");
  const [redeemSaving, setRedeemSaving] = useState(false);
  const [redeemError, setRedeemError] = useState("");
  const [redeemSuccess, setRedeemSuccess] = useState("");
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (banConfirmOpen) setBanConfirmOpen(false);
      else onClose();
    };
    document.addEventListener("keydown", close);
    document.body.classList.add("drawer-open");
    return () => {
      document.removeEventListener("keydown", close);
      document.body.classList.remove("drawer-open");
    };
  }, [banConfirmOpen, onClose]);
  const profile =
    detail?.branch_profiles.find(
      (branchProfile) => branchProfile.branch === detail.scope_branch,
    ) || detail?.branch_profiles[0];
  const otherBranchBans =
    detail?.branch_ban_notices?.filter(
      (notice) => notice.branch !== detail.scope_branch,
    ) || [];
  const canApprovePoints = canEditRank || approvalMode === "operation";
  useEffect(() => {
    setRankChoice(profile?.manual_rank || "Automatic");
  }, [profile?.manual_rank, entry.customer]);
  useEffect(() => {
    setRankError("");
    setRankSuccess("");
    setBanReason("");
    setBanError("");
    setBanSuccess("");
    setBanConfirmOpen(false);
    setExpandedBill(null);
    setRedeemBill("");
    setRedeemCategory("Tax");
    setRedeemPoints("");
    setRedeemNote("");
    setRedeemError("");
    setRedeemSuccess("");
  }, [entry.customer]);
  const saveRank = async () => {
    setRankSaving(true);
    setRankError("");
    setRankSuccess("");
    try {
      const updated = await api.setCustomerRank(entry.customer, rankChoice);
      onRankSaved(updated);
      setRankSuccess(
        rankChoice === "Automatic"
          ? "Зэрэглэлийг автомат тооцоололд шилжүүллээ"
          : `${rankChoice} зэрэглэлээр гараар тохирууллаа`,
      );
    } catch (err) {
      setRankError(
        err instanceof Error
          ? err.message
          : "Зэрэглэл хадгалах боломжгүй байна",
      );
    } finally {
      setRankSaving(false);
    }
  };
  const requestBanConfirmation = (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile || !banReason.trim()) return;
    setBanConfirmOpen(true);
  };
  const saveBan = async () => {
    if (!profile || !banReason.trim()) return;
    const nextBanned = !profile.is_banned;
    setBanSaving(true);
    setBanError("");
    setBanSuccess("");
    try {
      const updated = await api.setCustomerBan(
        entry.customer,
        nextBanned,
        banReason.trim(),
      );
      onRankSaved(updated);
      setBanReason("");
      setBanConfirmOpen(false);
      setBanSuccess(
        nextBanned
          ? "Хэрэглэгчийн нэвтрэх эрхийг энэ салбарт хориглолоо"
          : "Хэрэглэгчийн ban-ийг цуцаллаа",
      );
    } catch (err) {
      setBanConfirmOpen(false);
      setBanError(
        err instanceof Error
          ? err.message
          : "Ban тохиргоог хадгалах боломжгүй байна",
      );
    } finally {
      setBanSaving(false);
    }
  };
  const preferredServices =
    detail?.services.filter(
      (service) => !/^\s*(tax|татвар)\s*$/i.test(service.name),
    ) || [];
  const topService = preferredServices[0];
  const topDancer = detail?.dancers[0];
  const wallet = detail?.wallet;
  const selectedRedeemBill = wallet?.eligible_bills.find(
    (bill) => bill.name === redeemBill,
  );
  const redeemRemaining = selectedRedeemBill?.remaining[redeemCategory] || 0;
  const redeemOptions = selectedRedeemBill?.options?.[redeemCategory] || [];
  const redeem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!redeemBill) return;
    if (approvalMode === "operation" && !redeemNote.trim()) {
      setRedeemError("Manager байхгүй шалтгааныг тайлбар хэсэгт оруулна уу");
      return;
    }
    setRedeemSaving(true);
    setRedeemError("");
    setRedeemSuccess("");
    try {
      const updated = await api.redeemCustomerPoints(
        entry.customer,
        redeemBill,
        redeemCategory,
        Number(redeemPoints),
        redeemNote,
        approvalMode === "operation" ? redeemNote : "",
      );
      onRankSaved(updated);
      setRedeemSuccess(
        `${Number(redeemPoints).toLocaleString("mn-MN")} point-оор ${redeemCategory === "Tax" ? "Tax" : "VIP room"} төлөлт бүртгэлээ`,
      );
      setRedeemPoints("");
      setRedeemNote("");
    } catch (err) {
      setRedeemError(
        err instanceof Error
          ? err.message
          : "Point зарцуулалтыг бүртгэх боломжгүй байна",
      );
    } finally {
      setRedeemSaving(false);
    }
  };
  return (
    <div
      className="detail-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <aside
        className="detail-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`${entry.customer_name} хэрэглэгчийн дэлгэрэнгүй`}
      >
        <div className="drawer-header">
          <div>
            <span>
              {(profile?.membership_rank || entry.membership_rank) ===
              "Unassigned"
                ? "Зэрэглэлгүй"
                : profile?.membership_rank || entry.membership_rank}
              {detail?.scope_branch ? ` · ${detail.scope_branch} салбар` : ""}
            </span>
            <h2>{detail?.customer.customer_name || entry.customer_name}</h2>
            <p>{phoneView(detail?.customer.phone || entry.customer)}</p>
          </div>
          <button
            className="drawer-close"
            onClick={onClose}
            aria-label="Дэлгэрэнгүй цонх хаах"
          >
            <X />
          </button>
        </div>
        {loading ? (
          <div className="drawer-loading">
            <RefreshCw className="spin" />
            <strong>Хэрэглэгчийн мэдээллийг ачаалж байна…</strong>
          </div>
        ) : error ? (
          <div className="error-box drawer-error">{error}</div>
        ) : (
          detail && (
            <div className="drawer-body">
              {Boolean(profile?.is_banned) && (
                <section className="customer-ban-banner" role="alert">
                  <Ban />
                  <div>
                    <small>
                      {detail.scope_branch.toUpperCase()} САЛБАРТ НЭВТРЭХ ЭРХГҮЙ
                    </small>
                    <h3>{profile?.ban_reason || "Шалтгаан оруулаагүй"}</h3>
                    <p>
                      {profile?.banned_at
                        ? `${dateTime(profile.banned_at)}-д`
                        : ""}
                      {profile?.banned_by ? ` · ${profile.banned_by}` : ""}
                    </p>
                  </div>
                </section>
              )}
              {otherBranchBans.length > 0 && (
                <section className="cross-branch-ban-notice" role="status">
                  <div className="cross-branch-ban-heading">
                    <Ban />
                    <div>
                      <small>БУСАД САЛБАРЫН ИДЭВХТЭЙ ХОРИГ</small>
                      <h3>
                        {profile?.is_banned
                          ? `Нэмэлтээр ${otherBranchBans.length} салбарт хоригтой`
                          : "Энэ салбарт хориггүй. Өөр салбарын тэмдэглэл байна."}
                      </h3>
                      <p>
                        Мэдээллийн анхааруулга — {detail.scope_branch} салбарын
                        нэвтрэх эрхийг автоматаар хориглохгүй.
                      </p>
                    </div>
                  </div>
                  <div className="cross-branch-ban-list">
                    {otherBranchBans.map((notice) => (
                      <article key={notice.branch}>
                        <strong>{notice.branch} салбар</strong>
                        <span>{notice.ban_reason || "Шалтгаан оруулаагүй"}</span>
                        <small>
                          {notice.banned_at ? dateTime(notice.banned_at) : "Огноо тодорхойгүй"}
                          {notice.banned_by ? ` · ${notice.banned_by}` : ""}
                        </small>
                      </article>
                    ))}
                  </div>
                </section>
              )}
              <section className="detail-stats">
                <div>
                  <Users />
                  <span>
                    Нийт ирэлт
                    <strong>
                      {profile?.visit_count || detail.customer.visit_count || 0}
                    </strong>
                  </span>
                </div>
                <div>
                  <WalletCards />
                  <span>
                    Нийт зарцуулалт
                    <strong>
                      {money(
                        profile?.total_spend || detail.customer.total_spend,
                      )}
                    </strong>
                  </span>
                </div>
                <div>
                  <ReceiptText />
                  <span>
                    Дундаж чек
                    <strong>
                      {money(
                        profile?.average_bill || detail.customer.average_bill,
                      )}
                    </strong>
                  </span>
                </div>
                <div>
                  <CalendarDays />
                  <span>
                    Сүүлд ирсэн
                    <strong>
                      {dateOnly(
                        profile?.last_visit || detail.customer.last_visit,
                      )}
                    </strong>
                  </span>
                </div>
              </section>
              {canEditRank ? (
                <section className="manager-rank-editor">
                  <div className="rank-editor-copy">
                    <ShieldCheck />
                    <span>
                      <small>Салбарын VIP зэрэг</small>
                      <strong>
                        <Rank
                          value={profile?.membership_rank || "Unassigned"}
                        />
                      </strong>
                      <em>
                        {profile?.manual_rank
                          ? "Менежерийн гараар тохируулсан"
                          : "Дундаж чекээр автоматаар тооцсон"}
                      </em>
                    </span>
                  </div>
                  <label>
                    Зэрэглэл
                    <select
                      value={rankChoice}
                      onChange={(event) => {
                        setRankChoice(event.target.value);
                        setRankError("");
                        setRankSuccess("");
                      }}
                    >
                      <option value="Automatic">Автомат (дундаж чекээр)</option>
                      <option value="Unassigned">Зэрэглэлгүй</option>
                      <option value="Bronze">Bronze</option>
                      <option value="Silver">Silver</option>
                      <option value="Gold">Gold</option>
                      <option value="Diamond">Diamond</option>
                      <option value="Black Diamond">Black Diamond</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={saveRank}
                    disabled={rankSaving}
                  >
                    <Save />
                    {rankSaving ? "Хадгалж байна…" : "Зэрэглэл хадгалах"}
                  </button>
                  {rankError && (
                    <p className="rank-editor-message error">{rankError}</p>
                  )}
                  {rankSuccess && (
                    <p className="rank-editor-message success">{rankSuccess}</p>
                  )}
                </section>
              ) : (
                <section className="operator-rank-summary">
                  <ShieldCheck />
                  <span>
                    <small>Сонгосон салбарын VIP зэрэг</small>
                    <strong>
                      <Rank value={profile?.membership_rank || "Unassigned"} />
                    </strong>
                    <em>{detail.scope_branch} салбарын мэдээлэл</em>
                  </span>
                </section>
              )}
              {canEditRank && (
                <form
                  className={`manager-ban-editor ${profile?.is_banned ? "is-banned" : ""}`}
                  onSubmit={requestBanConfirmation}
                >
                  <div className="ban-editor-copy">
                    <Ban />
                    <span>
                      <small>САЛБАРЫН НЭВТРЭХ ЭРХ</small>
                      <strong>
                        {profile?.is_banned
                          ? "Ban цуцлах"
                          : "Хэрэглэгчийг ban хийх"}
                      </strong>
                      <em>
                        {profile?.is_banned
                          ? "Цуцалсан шалтгааныг тэмдэглэж хадгална."
                          : "Зөвхөн энэ салбарт үйлчилнэ. Шалтгаан нь бусад салбарын менежерт харагдана."}
                      </em>
                    </span>
                  </div>
                  <label>
                    {profile?.is_banned
                      ? "Ban цуцлах шалтгаан"
                      : "Ban хийх шалтгаан"}
                    <textarea
                      value={banReason}
                      onChange={(event) => {
                        setBanReason(event.target.value);
                        setBanError("");
                        setBanSuccess("");
                      }}
                      maxLength={500}
                      placeholder={
                        profile?.is_banned
                          ? "Жишээ: Менежерийн шийдвэрээр эрхийг сэргээв"
                          : "Жишээ: Дотоод журам зөрчсөн"
                      }
                      required
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={banSaving || !banReason.trim()}
                  >
                    <Ban />
                    {banSaving
                      ? "Хадгалж байна…"
                      : profile?.is_banned
                        ? "Ban цуцлах"
                        : "Ban хийх"}
                  </button>
                  {banError && (
                    <p className="rank-editor-message error">{banError}</p>
                  )}
                  {banSuccess && (
                    <p className="rank-editor-message success">{banSuccess}</p>
                  )}
                </form>
              )}
              {canEditRank && banConfirmOpen && profile && (
                <div
                  className="operation-confirm-backdrop"
                  role="presentation"
                  onMouseDown={(event) => {
                    if (event.target === event.currentTarget && !banSaving)
                      setBanConfirmOpen(false);
                  }}
                >
                  <section
                    className="operation-confirm-dialog manager-ban-confirm"
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="manager-ban-confirm-title"
                  >
                    <button
                      className="operation-confirm-close"
                      type="button"
                      aria-label="Хаах"
                      onClick={() => setBanConfirmOpen(false)}
                      disabled={banSaving}
                    >
                      <X />
                    </button>
                    <span className="operation-confirm-icon"><Ban /></span>
                    <h2 id="manager-ban-confirm-title">
                      {profile.is_banned ? "Ban цуцлах уу?" : "Ban хийхээ батлах уу?"}
                    </h2>
                    <p><strong>{detail.scope_branch} салбар</strong> · {detail.customer.customer_name}</p>
                    <small className="manager-ban-confirm-reason">“{banReason.trim()}”</small>
                    <small>
                      {profile.is_banned
                        ? "Энэ салбарт нэвтрэх эрхийг сэргээнэ. Үйлдэл audit түүхэнд хадгалагдана."
                        : "Хориг зөвхөн энэ салбарт үйлчилнэ. Бусад салбарын менежерт шалтгаан нь харагдана."}
                    </small>
                    <div>
                      <button
                        type="button"
                        className="operation-confirm-secondary"
                        onClick={() => setBanConfirmOpen(false)}
                        disabled={banSaving}
                      >
                        Буцах
                      </button>
                      <button
                        type="button"
                        className={`operation-confirm-danger ${profile.is_banned ? "is-unban" : ""}`}
                        onClick={() => void saveBan()}
                        disabled={banSaving}
                        autoFocus
                      >
                        {banSaving
                          ? "Хадгалж байна…"
                          : profile.is_banned
                            ? "Тийм, ban цуцлах"
                            : "Тийм, ban хийх"}
                      </button>
                    </div>
                  </section>
                </div>
              )}
              {wallet && (
                <section className="cashback-panel">
                  <div className="cashback-summary">
                    <div className="cashback-icon">
                      <Coins />
                    </div>
                    <div>
                      <small>НЭГДСЭН POINT ДАНС</small>
                      <h3>
                        {Math.round(wallet.balance).toLocaleString("mn-MN")}{" "}
                        <span>point</span>
                      </h3>
                      <p>
                        1 point = 1₮ · Бүх салбарт Tax болон VIP room төлөхөд
                        ашиглана
                      </p>
                    </div>
                    <div className="cashback-rate">
                      <span>
                        {wallet.rank === "Unassigned"
                          ? "Зэрэглэлгүй"
                          : wallet.rank}
                      </span>
                      <strong>{wallet.cashback_rate}%</strong>
                      <small>оноо цуглуулах хувь</small>
                    </div>
                  </div>
                  <div className="cashback-metrics">
                    <span>
                      Нийт цуглуулсан
                      <strong>
                        +
                        {Math.round(wallet.earned_total).toLocaleString(
                          "mn-MN",
                        )}
                      </strong>
                    </span>
                    <span>
                      Нийт ашигласан
                      <strong>
                        -
                        {Math.round(wallet.redeemed_total).toLocaleString(
                          "mn-MN",
                        )}
                      </strong>
                    </span>
                    <span>
                      Одоогийн үлдэгдэл
                      <strong>
                        {Math.round(wallet.balance).toLocaleString("mn-MN")}{" "}
                        point
                      </strong>
                    </span>
                  </div>
                  {canApprovePoints && (
                    <form className="cashback-redeem" onSubmit={redeem}>
                      <div className="cashback-redeem-title">
                        <WalletCards />
                        <div>
                          <h4>Point-оор төлөлт бүртгэх</h4>
                          <p>
                            {approvalMode === "operation"
                              ? "Manager байхгүй үед Operation шалтгаанаа бичиж орлон зөвшөөрнө."
                              : "Салбарын бүх bill-ээс Tax болон VIP room-ийн үлдэгдлийг систем автоматаар гаргана."}
                          </p>
                        </div>
                      </div>
                      {wallet.eligible_bills.length ? (
                        <div className="cashback-fields">
                          <label>
                            Bill
                            <select
                              value={redeemBill}
                              onChange={(event) => {
                                setRedeemBill(event.target.value);
                                setRedeemError("");
                                setRedeemSuccess("");
                              }}
                              required
                            >
                              <option value="">Bill сонгох</option>
                              {wallet.eligible_bills.map((bill) => (
                                <option key={bill.name} value={bill.name}>
                                  {dateOnly(bill.posting_date)} ·{" "}
                                  {bill.bill_code || bill.name} · Tax{" "}
                                  {Math.round(
                                    bill.remaining.Tax,
                                  ).toLocaleString("mn-MN")}
                                  ₮ · VIP{" "}
                                  {Math.round(
                                    bill.remaining["VIP Room"],
                                  ).toLocaleString("mn-MN")}
                                  ₮
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Төлбөрийн төрөл
                            <select
                              value={redeemCategory}
                              onChange={(event) => {
                                setRedeemCategory(
                                  event.target.value as "Tax" | "VIP Room",
                                );
                                setRedeemError("");
                              }}
                            >
                              <option value="Tax">Tax</option>
                              <option value="VIP Room">VIP room</option>
                            </select>
                          </label>
                          <label>
                            Ашиглах point{" "}
                            <small>
                              {redeemBill
                                ? `Боломжит: ${Math.round(redeemRemaining).toLocaleString("mn-MN")} point`
                                : "Эхлээд bill сонгоно"}
                            </small>
                            <input
                              type="number"
                              min="1"
                              max={
                                Math.min(wallet.balance, redeemRemaining) ||
                                undefined
                              }
                              step="1"
                              inputMode="numeric"
                              value={redeemPoints}
                              onChange={(event) =>
                                setRedeemPoints(event.target.value)
                              }
                              placeholder="Жишээ: 50000"
                              required
                            />
                          </label>
                          {redeemBill && (
                            <div className="redemption-quick-options">
                              <span>Bill дээрх бодит үнээс хурдан сонгох</span>
                              {redeemOptions.map((option, index) => (
                                <button
                                  type="button"
                                  key={`${option.name}-${index}`}
                                  onClick={() =>
                                    setRedeemPoints(
                                      String(
                                        Math.min(
                                          wallet.balance,
                                          redeemRemaining,
                                          option.total,
                                        ),
                                      ),
                                    )
                                  }
                                  disabled={!wallet.balance || !redeemRemaining}
                                >
                                  {option.name} · {option.quantity} ×{" "}
                                  {Math.round(option.unit_price).toLocaleString(
                                    "mn-MN",
                                  )}
                                  ₮ ={" "}
                                  {Math.round(option.total).toLocaleString(
                                    "mn-MN",
                                  )}
                                  ₮
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() =>
                                  setRedeemPoints(
                                    String(
                                      Math.min(wallet.balance, redeemRemaining),
                                    ),
                                  )
                                }
                                disabled={!wallet.balance || !redeemRemaining}
                              >
                                Боломжит дүнг бүтнээр ашиглах ·{" "}
                                {Math.round(
                                  Math.min(wallet.balance, redeemRemaining),
                                ).toLocaleString("mn-MN")}
                                ₮
                              </button>
                            </div>
                          )}
                          <label>
                            {approvalMode === "operation"
                              ? "Manager байхгүй шалтгаан"
                              : "Тайлбар"}{" "}
                            <small>
                              {approvalMode === "operation"
                                ? "(заавал)"
                                : "(заавал биш)"}
                            </small>
                            <input
                              value={redeemNote}
                              onChange={(event) =>
                                setRedeemNote(event.target.value)
                              }
                              placeholder={
                                approvalMode === "operation"
                                  ? "Жишээ: Ээлжийн менежер чөлөөтэй"
                                  : "Менежерийн тэмдэглэл"
                              }
                              required={approvalMode === "operation"}
                            />
                          </label>
                          <button
                            type="submit"
                            disabled={
                              redeemSaving ||
                              !redeemBill ||
                              !redeemPoints ||
                              (approvalMode === "operation" &&
                                !redeemNote.trim()) ||
                              Number(redeemPoints) > wallet.balance ||
                              Number(redeemPoints) > redeemRemaining
                            }
                          >
                            <Coins />
                            {redeemSaving
                              ? "Бүртгэж байна…"
                              : "Point төлөлт бүртгэх"}
                          </button>
                        </div>
                      ) : (
                        <div className="cashback-empty">
                          Энэ салбарт point-оор төлж болох Tax эсвэл VIP room
                          үлдэгдэлтэй bill одоогоор алга.
                        </div>
                      )}
                      {redeemError && (
                        <p className="rank-editor-message error">
                          {redeemError}
                        </p>
                      )}
                      {redeemSuccess && (
                        <p className="rank-editor-message success">
                          {redeemSuccess}
                        </p>
                      )}
                    </form>
                  )}
                  {wallet.transactions.length > 0 && (
                    <div className="cashback-history">
                      <h4>Сүүлийн point хөдөлгөөн</h4>
                      {wallet.transactions.slice(0, 6).map((row) => (
                        <div key={row.name}>
                          <span>
                            <strong>
                              {row.transaction_type === "Redeem"
                                ? "Point ашигласан"
                                : "Point нэмэгдсэн"}
                            </strong>
                            <small>
                              {dateTime(row.posted_at)} · {row.branch}
                              {row.bill_code ? ` · ${row.bill_code}` : ""}
                              {row.redemption_category
                                ? ` · ${row.redemption_category}`
                                : ""}
                            </small>
                          </span>
                          <em className={row.points < 0 ? "spent" : "earned"}>
                            {row.points > 0 ? "+" : ""}
                            {Math.round(row.points).toLocaleString("mn-MN")}
                          </em>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}
              <section className="taste-summary">
                <div>
                  <Heart />
                  <span>
                    Их авдаг үйлчилгээ
                    <strong>
                      {topService?.name || "Одоогоор мэдээлэлгүй"}
                    </strong>
                    {topService && (
                      <small>
                        {topService.quantity} удаа ·{" "}
                        {money(topService.total_spend)}
                      </small>
                    )}
                  </span>
                </div>
                <div>
                  <Star />
                  <span>
                    Их сонгодог бүжигчин
                    <strong>
                      {topDancer?.nickname ||
                        topDancer?.name ||
                        "Одоогоор мэдээлэлгүй"}
                    </strong>
                    {topDancer && (
                      <small>
                        {topDancer.service_count} үйлчилгээ
                        {topDancer.service_hours
                          ? ` · ${topDancer.service_hours} цаг`
                          : ""}{" "}
                        · сүүлд {dateOnly(topDancer.last_visit)}
                      </small>
                    )}
                  </span>
                </div>
              </section>
              <div className="preference-grid">
                <section className="detail-section">
                  <div className="detail-title">
                    <ShoppingBag />
                    <div>
                      <h3>Дуртай үйлчилгээ</h3>
                      <p>Өмнөх авалтын давтамж, зарцуулалтаар</p>
                    </div>
                  </div>
                  {preferredServices.length ? (
                    <div className="preference-list">
                      {preferredServices.slice(0, 6).map((service, index) => (
                        <div
                          className="preference-row"
                          key={service.menu_id || service.name}
                        >
                          <b>{index + 1}</b>
                          <span>
                            <strong>{service.name}</strong>
                            <small>
                              {service.quantity} ширхэг · {service.bill_count}{" "}
                              төлбөр
                            </small>
                          </span>
                          <em>{money(service.total_spend)}</em>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="detail-empty">
                      Үйлчилгээний түүх хараахан алга
                    </div>
                  )}
                </section>
                <section className="detail-section">
                  <div className="detail-title">
                    <Users />
                    <div>
                      <h3>Сонгосон entertainer-ууд</h3>
                      <p>Нийт цаг, давтамж, хамгийн сүүлд сонгосон өдөр</p>
                    </div>
                  </div>
                  {detail.dancers.length ? (
                    <div className="preference-list">
                      {detail.dancers.slice(0, 8).map((dancer, index) => (
                        <div
                          className="preference-row"
                          key={dancer.dancer_id || dancer.name}
                        >
                          <b>{index + 1}</b>
                          <span>
                            <strong>{dancer.nickname || dancer.name}</strong>
                            <small>
                              {dancer.nickname &&
                              dancer.name !== dancer.nickname
                                ? `${dancer.name} · `
                                : ""}
                              {dancer.service_count} үйлчилгээ
                              {dancer.service_hours
                                ? ` · ${dancer.service_hours} цаг`
                                : ""}
                            </small>
                          </span>
                          <em>Сүүлд {dateOnly(dancer.last_visit)}</em>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="detail-empty">
                      Entertainer сонгосон түүх хараахан алга
                    </div>
                  )}
                </section>
              </div>
              <section className="detail-section bills-section">
                <div className="detail-title">
                  <ReceiptText />
                  <div>
                    <h3>Өмнөх авалтууд</h3>
                    <p>
                      Bill бүр хураалттай. “Дэлгэх” дээр дарж үйлчилгээ,
                      entertainer, цаг, өрөөг харна.
                    </p>
                  </div>
                </div>
                {detail.recent_bills.length ? (
                  <div className="bill-list">
                    {detail.recent_bills.slice(0, 10).map((bill) => {
                      const isExpanded = expandedBill === bill.name;
                      const billEntertainers = Array.from(
                        new Set(
                          bill.items.flatMap((item) =>
                            item.dancers.map(
                              (dancer) => dancer.nickname || dancer.name,
                            ),
                          ),
                        ),
                      );
                      return (
                        <article
                          className={`bill-card ${isExpanded ? "open" : ""}`}
                          key={bill.name}
                        >
                          <button
                            type="button"
                            className="bill-summary"
                            aria-expanded={isExpanded}
                            onClick={() =>
                              setExpandedBill((current) =>
                                current === bill.name ? null : bill.name,
                              )
                            }
                          >
                            <div className="bill-head">
                              <span>
                                <strong>{dateOnly(bill.posting_date)}</strong>
                                <small>
                                  {bill.bill_code || bill.name} ·{" "}
                                  {bill.store_name}
                                </small>
                              </span>
                              <strong
                                className={bill.bill_type === 2 ? "refund" : ""}
                              >
                                {bill.bill_type === 2 ? "- " : ""}
                                {money(Math.abs(bill.total_amount))}
                              </strong>
                            </div>
                            <div className="bill-visit-meta">
                              {bill.open_date && (
                                <span>
                                  <Clock3 />
                                  {timeOnly(bill.open_date)}–
                                  {timeOnly(bill.closed_date)}
                                  {bill.duration_minutes > 0 &&
                                    ` · ${durationLabel(bill.duration_minutes)}`}
                                </span>
                              )}
                              {bill.rooms?.length > 0 && (
                                <span>
                                  <BedDouble />
                                  {bill.rooms
                                    .map(
                                      (room) =>
                                        `${room.name} · ${room.hours} цаг`,
                                    )
                                    .join(", ")}
                                </span>
                              )}
                              {billEntertainers.length > 0 && (
                                <span>
                                  <Star />
                                  {billEntertainers.join(", ")}
                                </span>
                              )}
                            </div>
                            <span className="bill-toggle-label">
                              {isExpanded ? "Хураах" : "Дэлгэх"}
                            </span>
                            <ChevronDown className="bill-summary-chevron" />
                          </button>
                          {isExpanded && (
                            <div className="bill-detail">
                              {bill.rooms?.length > 0 && (
                                <div className="bill-room-list">
                                  <BedDouble />
                                  <div>
                                    <small>АВСАН ӨРӨӨ</small>
                                    <strong>
                                      {bill.rooms
                                        .map(
                                          (room) =>
                                            `${room.name} — ${room.hours} цаг`,
                                        )
                                        .join(" · ")}
                                    </strong>
                                  </div>
                                </div>
                              )}
                              {bill.items?.length ? (
                                <div className="bill-items">
                                  {bill.items.map((item, index) => (
                                    <div key={`${bill.name}-${index}`}>
                                      <span>
                                        {item.name}
                                        {item.dancers.length > 0 && (
                                          <small>
                                            {item.dancers
                                              .map(
                                                (dancer) =>
                                                  `${dancer.nickname || dancer.name}${dancer.hours ? ` · ${dancer.hours} цаг` : ""}`,
                                              )
                                              .join(", ")}
                                          </small>
                                        )}
                                      </span>
                                      <em>
                                        {item.quantity} × {money(item.total)}
                                      </em>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="bill-no-items">
                                  Барааны задаргаа байхгүй
                                </div>
                              )}
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="detail-empty">
                    Өмнөх авалтын мэдээлэл хараахан алга
                  </div>
                )}
              </section>
            </div>
          )
        )}
      </aside>
    </div>
  );
}

function OperationApp({
  ctx,
  onLogout,
}: {
  ctx: AppContext;
  onLogout: () => void;
}) {
  const branches = ctx.branches?.length
    ? ctx.branches
    : ["Nomad", "Neva", "Sapphire", "Monarch"];
  const [form, setForm] = useState({
    customer_name: "",
    phone: "",
    party_size: 1,
    expected_at: nextReservationTime(),
    notes: "",
    branch: branches[0],
  });
  const [workspace, setWorkspace] = useState<DailyEntryWorkspace | null>(null);
  const [serviceFeed, setServiceFeed] = useState<ServiceEntryFeed | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [cancelTarget, setCancelTarget] = useState<DailyGuestItem | null>(null);
  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [result, compactFeed] = await Promise.all([
        api.phoneReservations(form.branch),
        api.serviceEntryFeed(form.branch),
      ]);
      setWorkspace(result);
      setServiceFeed(compactFeed);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Захиалгын мэдээлэл авах боломжгүй байна",
      );
    } finally {
      if (!silent) setLoading(false);
    }
  }, [form.branch]);
  useEffect(() => {
    void refresh();
    const reconcile = () => void refresh(true);
    const timer = window.setInterval(reconcile, 60_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") reconcile();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", reconcile);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", reconcile);
    };
  }, [refresh]);
  useEffect(() => {
    const refreshSelectedBranch = (payload: Record<string, unknown>) => {
      if (!payload.branch || payload.branch === form.branch) void refresh(true);
    };
    const unsubscribeReservation = subscribeRealtime(
      "vip_phone_reservation",
      refreshSelectedBranch,
    );
    const unsubscribeEntry = subscribeRealtime(
      "vip_customer_entry",
      refreshSelectedBranch,
    );
    return () => {
      unsubscribeReservation();
      unsubscribeEntry();
    };
  }, [form.branch, refresh]);
  const update = (field: string, value: string | number) =>
    setForm((current) => ({ ...current, [field]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const saved = await api.createPhoneReservation({
        ...form,
        phone: onlyDigits(form.phone),
        notes: form.notes.trim(),
      });
      setSuccess(
        `${form.branch} салбар · ${saved.customer_name}-ийн бүртгэл амжилттай хадгалагдлаа`,
      );
      setForm((current) => ({
        ...current,
        customer_name: "",
        phone: "",
        party_size: 1,
        expected_at: nextReservationTime(),
        notes: "",
      }));
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Зочин бүртгэх боломжгүй байна",
      );
    } finally {
      setLoading(false);
    }
  };
  const cancel = async (name: string) => {
    setLoading(true);
    setError("");
    try {
      await api.cancelPhoneReservation(name);
      setSuccess("Захиалгыг цуцаллаа");
      setCancelTarget(null);
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Захиалга цуцлах боломжгүй байна",
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <Header ctx={ctx} onLogout={onLogout} title="Утасны бүртгэл" />
      <main className="operation-main entry-workbench">
        <nav
          className="operation-branch-tabs"
          aria-label="Захиалгын салбар сонгох"
        >
          {branches.map((branch) => (
            <button
              type="button"
              key={branch}
              className={form.branch === branch ? "active" : ""}
              onClick={() => update("branch", branch)}
              disabled={loading}
            >
              {branch}
            </button>
          ))}
        </nav>
        {error && <div className="error-box wide">{error}</div>}
        {success && (
          <div className="success-box">
            <Check />
            {success}
          </div>
        )}
        <EntryDayHeader
          workspace={workspace}
          loading={loading}
          onRefresh={() => void refresh()}
        />
        <div className={`operation-layout ${workspace?.is_current === false ? "history-only" : ""}`}>
          {workspace?.is_current !== false && <form className="operation-form" onSubmit={submit}>
            <div className="operation-heading">
              <Phone />
              <div>
                <h2>{form.branch} салбарт зочин бүртгэх</h2>
                <p>
                  Утас, хүний тоог оруулна. Хадгалахад хамгаалагчийн жагсаалт
                  болон менежерийн мэдэгдэлд шууд орно.
                </p>
              </div>
            </div>
            <div className="operation-fields">
              <label>
                Зочны нэр <small>(заавал биш)</small>
                <input
                  value={form.customer_name}
                  onChange={(event) =>
                    update("customer_name", event.target.value)
                  }
                  placeholder="Нэр (заавал биш)"
                />
              </label>
              <label>
                Утасны дугаар
                <input
                  inputMode="numeric"
                  value={phoneView(form.phone)}
                  onChange={(event) =>
                    update("phone", onlyDigits(event.target.value))
                  }
                  required
                  placeholder="9911 2233"
                />
              </label>
              <label className="field-wide">
                Хэдүүлээ ирэх вэ?
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={form.party_size}
                  onChange={(event) =>
                    update("party_size", Number(event.target.value))
                  }
                  required
                />
              </label>
              <fieldset className="field-wide operation-time-field">
                <legend>Ирэх цаг</legend>
                <div className="operation-time-picker">
                  <select
                    aria-label="Ирэх цаг"
                    value={form.expected_at.slice(11, 13)}
                    onChange={(event) => update("expected_at", `${form.expected_at.slice(0, 11)}${event.target.value}:${form.expected_at.slice(14, 16)}`)}
                  >
                    {reservationHours.map((hour) => <option key={hour} value={hour}>{hour}</option>)}
                  </select>
                  <span aria-hidden="true">:</span>
                  <select
                    aria-label="Ирэх минут"
                    value={form.expected_at.slice(14, 16)}
                    onChange={(event) => update("expected_at", `${form.expected_at.slice(0, 14)}${event.target.value}`)}
                  >
                    {reservationMinutes.map((minute) => <option key={minute} value={minute}>{minute}</option>)}
                  </select>
                </div>
                <small>Өнөөдрийн үүдний жагсаалтад энэ цагаар эрэмбэлэгдэнэ.</small>
              </fieldset>
              <label className="field-wide">
                Нэмэлт тайлбар <small>(заавал биш)</small>
                <textarea
                  value={form.notes}
                  onChange={(event) => update("notes", event.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Жишээ: Төрсөн өдөр, VIP өрөө хүссэн, 22:00 цагаас хойш ирнэ"
                />
              </label>
            </div>
            <div className="operation-form-summary" aria-live="polite">
              <span><Clock3 /><small>Ирэх цаг</small><strong>{reservationDateTimeLabel(form.expected_at)}</strong></span>
              <span><Users /><small>Зочны тоо</small><strong>{form.party_size || 1} хүн</strong></span>
            </div>
            <div className="operation-form-actions">
              <button className="operation-submit" disabled={loading}>
                <ClipboardList />
                {loading
                  ? "Хадгалж байна…"
                  : `${form.branch} салбарын жагсаалтад нэмэх`}
              </button>
            </div>
          </form>}
          <DailyGuestList
            workspace={workspace}
            busyName={loading ? "busy" : ""}
            onCancel={setCancelTarget}
          />
          {workspace?.is_current !== false ? <ServiceEntryPanel feed={serviceFeed} /> : null}
        </div>
      </main>
      {cancelTarget && (
        <div className="operation-confirm-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !loading) setCancelTarget(null);
        }}>
          <section className="operation-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="cancel-reservation-title">
            <button className="operation-confirm-close" type="button" aria-label="Хаах" onClick={() => setCancelTarget(null)} disabled={loading}><X /></button>
            <span className="operation-confirm-icon"><CalendarDays /></span>
            <h2 id="cancel-reservation-title">Захиалгыг цуцлах уу?</h2>
            <p><strong>{cancelTarget.customer_name === cancelTarget.phone ? "Нэргүй зочин" : cancelTarget.customer_name}</strong> · {phoneView(cancelTarget.phone)} · {timeOnly(cancelTarget.expected_at)}</p>
            <small>Цуцалсны дараа хамгаалагчийн хүлээлгийн жагсаалтаас хасагдана.</small>
            <div>
              <button type="button" className="operation-confirm-secondary" onClick={() => setCancelTarget(null)} disabled={loading}>Үгүй, хэвээр үлдээх</button>
              <button type="button" className="operation-confirm-danger" onClick={() => void cancel(cancelTarget.name)} disabled={loading}>{loading ? "Цуцалж байна…" : "Тийм, цуцлах"}</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function ManagerApp({
  ctx,
  onLogout,
}: {
  ctx: AppContext;
  onLogout: () => void;
}) {
  const [feed, setFeed] = useState<{
    entries: Entry[];
    pending_reservations: PhoneReservation[];
    today_total: number;
    today_new: number;
    unread: number;
  } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [customerDetail, setCustomerDetail] = useState<CustomerDetail | null>(
    null,
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerSearching, setCustomerSearching] = useState(false);
  const [customerSearchError, setCustomerSearchError] = useState("");
  const [customerSearched, setCustomerSearched] = useState(false);
  const [customerSearchFound, setCustomerSearchFound] = useState(false);
  const [entryAlert, setEntryAlert] = useState<Entry | null>(null);
  const [reservationAlert, setReservationAlert] =
    useState<PhoneReservation | null>(null);
  const [insightEntry, setInsightEntry] = useState<Entry | null>(null);
  const [entrySummary, setEntrySummary] = useState<EntrySummary | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState("");
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unavailable"
  >(() =>
    "Notification" in window && window.isSecureContext
      ? Notification.permission
      : "unavailable",
  );
  const seenEntries = useRef(new Set<string>());
  const seenReservations = useRef(new Set<string>());
  const feedReady = useRef(false);
  const openInsight = useCallback(async (entry: Entry) => {
    setInsightEntry(entry);
    setEntryAlert(null);
    setEntrySummary(null);
    setInsightError("");
    setInsightLoading(true);
    try {
      setEntrySummary(await api.entrySummary(entry.name));
      if (!entry.manager_acknowledged) {
        await api.acknowledge(entry.name);
        setFeed((current) =>
          current
            ? {
                ...current,
                unread: Math.max(0, current.unread - 1),
                entries: current.entries.map((row) =>
                  row.name === entry.name
                    ? { ...row, manager_acknowledged: 1 }
                    : row,
                ),
              }
            : current,
        );
      }
    } catch (err) {
      setInsightError(
        err instanceof Error
          ? err.message
          : "Зочны товч мэдээллийг авах боломжгүй",
      );
    } finally {
      setInsightLoading(false);
    }
  }, []);
  const closeInsight = useCallback(() => setInsightEntry(null), []);
  const notifyOfEntry = useCallback(
    (entry: Entry) => {
      setEntryAlert(entry);
      if ("vibrate" in navigator) navigator.vibrate([180, 100, 180]);
      try {
        const AudioContextClass =
          window.AudioContext ||
          (
            window as typeof window & {
              webkitAudioContext?: typeof AudioContext;
            }
          ).webkitAudioContext;
        if (AudioContextClass) {
          const audio = new AudioContextClass();
          const gain = audio.createGain();
          const oscillator = audio.createOscillator();
          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(880, audio.currentTime);
          oscillator.frequency.setValueAtTime(660, audio.currentTime + 0.18);
          gain.gain.setValueAtTime(0.0001, audio.currentTime);
          gain.gain.exponentialRampToValueAtTime(
            0.22,
            audio.currentTime + 0.02,
          );
          gain.gain.exponentialRampToValueAtTime(
            0.0001,
            audio.currentTime + 0.42,
          );
          oscillator.connect(gain);
          gain.connect(audio.destination);
          oscillator.start();
          oscillator.stop(audio.currentTime + 0.44);
          oscillator.onended = () => audio.close();
        }
      } catch {
        /* In-app alert remains available when the browser blocks audio. */
      }
      if (
        "Notification" in window &&
        window.isSecureContext &&
        Notification.permission === "granted"
      )
        void showSystemNotification(
          "Шинэ зочин ирлээ",
          {
            body: `${entry.customer_name} · ${entry.membership_rank === "Unassigned" ? "Зэрэглэлгүй" : entry.membership_rank} · Товч мэдээлэл харах`,
            icon: new URL("icon-192.png", document.baseURI).toString(),
            tag: entry.name,
            data: { kind: "entry", entry: entry.name },
          },
          () => openInsight(entry),
        );
    },
    [openInsight],
  );
  const notifyOfReservation = useCallback((reservation: PhoneReservation) => {
    setReservationAlert(reservation);
    if ("vibrate" in navigator) navigator.vibrate([120, 80, 120]);
    if (
      "Notification" in window &&
      window.isSecureContext &&
      Notification.permission === "granted"
    )
      void showSystemNotification("Операторын шинэ захиалга", {
        body: `${reservation.customer_name === reservation.phone ? "Нэргүй зочин" : reservation.customer_name} · ${phoneView(reservation.phone)} · ${reservation.party_size} хүн`,
        icon: new URL("icon-192.png", document.baseURI).toString(),
        tag: reservation.name,
        data: { kind: "reservation", reservation: reservation.name },
      });
  }, []);
  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const nextFeed = await api.feed();
      if (feedReady.current) {
        const newcomers = nextFeed.entries.filter(
          (entry) => !seenEntries.current.has(entry.name),
        );
        [...newcomers].reverse().forEach(notifyOfEntry);
        const newReservations = nextFeed.pending_reservations.filter(
          (row) => !seenReservations.current.has(row.name),
        );
        [...newReservations].reverse().forEach(notifyOfReservation);
      }
      nextFeed.entries.forEach((entry) => seenEntries.current.add(entry.name));
      nextFeed.pending_reservations.forEach((row) =>
        seenReservations.current.add(row.name),
      );
      feedReady.current = true;
      setFeed(nextFeed);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Мэдээлэл авах боломжгүй");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [notifyOfEntry, notifyOfReservation]);
  useEffect(() => {
    void refresh();
    const reconcile = () => void refresh(true);
    const timer = window.setInterval(reconcile, 60_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") reconcile();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", reconcile);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", reconcile);
    };
  }, [refresh]);
  useEffect(() => {
    const reconcile = () => void refresh(true);
    const unsubscribeEntry = subscribeRealtime("vip_customer_entry", reconcile);
    const unsubscribeReservation = subscribeRealtime(
      "vip_phone_reservation",
      reconcile,
    );
    return () => {
      unsubscribeEntry();
      unsubscribeReservation();
    };
  }, [refresh]);
  useEffect(() => {
    document.title = feed?.unread
      ? `(${feed.unread}) NOMAD VIP — Үүдний хяналт`
      : "NOMAD VIP — Үүдний хяналт";
    return () => {
      document.title = "NOMAD VIP — Үүдний бүртгэл";
    };
  }, [feed?.unread]);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const openFromNotification = (event: MessageEvent) => {
      if (event.data?.type !== "OPEN_ENTRY_NOTIFICATION") return;
      const entry = feed?.entries.find((row) => row.name === event.data.entry);
      if (entry) openInsight(entry);
    };
    navigator.serviceWorker.addEventListener("message", openFromNotification);
    return () =>
      navigator.serviceWorker.removeEventListener(
        "message",
        openFromNotification,
      );
  }, [feed?.entries, openInsight]);
  useEffect(() => {
    const entryName = new URLSearchParams(window.location.search).get("entry");
    if (!entryName || !feed?.entries.length) return;
    const entry = feed.entries.find((row) => row.name === entryName);
    if (entry) {
      openInsight(entry);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [feed?.entries, openInsight]);
  const enableNotifications = async () => {
    if (!window.isSecureContext || !("Notification" in window)) {
      setNotificationPermission("unavailable");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === "granted")
        await showSystemNotification("NOMAD VIP", {
          body: "Менежерийн мэдэгдэл амжилттай идэвхжлээ.",
          icon: new URL("icon-192.png", document.baseURI).toString(),
          tag: "notification-enabled",
          data: { kind: "setup" },
        });
    } catch {
      setNotificationPermission("unavailable");
    }
  };
  const acknowledge = async (entry: string) => {
    await api.acknowledge(entry);
    await refresh();
  };
  const openDetail = async (entry: Entry) => {
    setSelectedEntry(entry);
    setCustomerDetail(null);
    setDetailError("");
    setDetailLoading(true);
    try {
      setCustomerDetail(await api.customerDetail(entry.customer));
    } catch (err) {
      setDetailError(
        err instanceof Error
          ? err.message
          : "Хэрэглэгчийн дэлгэрэнгүй мэдээлэл авах боломжгүй",
      );
    } finally {
      setDetailLoading(false);
    }
  };
  const searchCustomerBeforeEntry = async (event: React.FormEvent) => {
    event.preventDefault();
    const phone = onlyDigits(customerPhone);
    if (phone.length !== 8 || customerSearching) return;
    setCustomerSearching(true);
    setCustomerSearchError("");
    setCustomerSearched(false);
    setCustomerSearchFound(false);
    try {
      const result = await api.managerCustomerSearch(phone);
      setCustomerSearched(true);
      setCustomerSearchFound(Boolean(result.found && result.detail));
      if (!result.found || !result.detail) return;
      const customer = result.detail.customer;
      const profile =
        result.detail.branch_profiles.find(
          (row) => row.branch === result.detail?.scope_branch,
        ) || result.detail.branch_profiles[0];
      setSelectedEntry({
        name: `manager-search:${customer.name}`,
        customer: customer.name,
        customer_name: customer.customer_name,
        membership_rank: profile?.membership_rank || "Unassigned",
        guard_user: "",
        guard_name: "Урьдчилсан хайлт",
        entered_at: new Date().toISOString(),
        visit_type: "Manager Lookup",
        visit_number: result.detail.next_visit_number || 1,
        manager_acknowledged: 1,
      });
      setCustomerDetail(result.detail);
      setDetailError("");
      setDetailLoading(false);
    } catch (err) {
      setCustomerSearchError(
        err instanceof Error ? err.message : "Хэрэглэгч хайх боломжгүй байна",
      );
    } finally {
      setCustomerSearching(false);
    }
  };
  const closeDetail = useCallback(() => setSelectedEntry(null), []);
  const latest =
    feed?.entries.find((e) => !e.manager_acknowledged) || feed?.entries[0];
  const notificationText =
    notificationPermission === "granted"
      ? "Мэдэгдэл идэвхтэй"
      : notificationPermission === "denied"
        ? "Мэдэгдэл хаалттай"
        : notificationPermission === "unavailable"
          ? "Мэдэгдэл тохируулах"
          : "Мэдэгдэл асаах";
  return (
    <>
      <Header
        ctx={ctx}
        onLogout={onLogout}
        title="Үүдний хяналт"
        actions={
          <button
            className={`header-action notify-toggle ${notificationPermission === "granted" ? "active" : ""}`}
            onClick={enableNotifications}
          >
            <Bell />
            {notificationText}
          </button>
        }
      />
      {entryAlert && (
        <div
          className="entry-toast"
          role="alert"
          aria-live="assertive"
          onClick={() => openInsight(entryAlert)}
        >
          <div className="entry-toast-icon">
            <Bell />
          </div>
          <div>
            <small>ШИНЭ ЗОЧИН · ДАРЖ ХАРАХ</small>
            <strong>{entryAlert.customer_name}</strong>
            <span>
              {entryAlert.membership_rank === "Unassigned"
                ? "Зэрэглэлгүй"
                : entryAlert.membership_rank}{" "}
              · {visitLabel(entryAlert.visit_number || 1)}
            </span>
          </div>
          <button
            onClick={(event) => {
              event.stopPropagation();
              setEntryAlert(null);
            }}
            aria-label="Мэдэгдэл хаах"
          >
            <X />
          </button>
        </div>
      )}
      {reservationAlert && !entryAlert && (
        <div
          className="entry-toast reservation-toast"
          role="alert"
          aria-live="assertive"
        >
          <div className="entry-toast-icon">
            <ClipboardList />
          </div>
          <div>
            <small>ОПЕРАТОРЫН ШИНЭ БҮРТГЭЛ</small>
            <strong>
              {reservationAlert.customer_name === reservationAlert.phone
                ? "Нэргүй зочин"
                : reservationAlert.customer_name}
            </strong>
            <span>
              {phoneView(reservationAlert.phone)} ·{" "}
              {reservationAlert.party_size} хүн · хамгаалагчийн хүлээлгийн
              жагсаалтад орлоо
            </span>
          </div>
          <button
            onClick={() => setReservationAlert(null)}
            aria-label="Бүртгэлийн мэдэгдэл хаах"
          >
            <X />
          </button>
        </div>
      )}
      <main className="manager-main">
        {error && <div className="error-box wide">{error}</div>}
        <section className="manager-customer-search" aria-labelledby="manager-customer-search-title">
          <div className="manager-customer-search-copy">
            <span className="manager-customer-search-icon"><Search /></span>
            <div>
              <small>НЭВТРЭХ ЭРХИЙН УРЬДЧИЛСАН ШАЛГАЛТ</small>
              <h2 id="manager-customer-search-title">Хэрэглэгчийг утсаар хайх</h2>
              <p>Зочин ирэхээс өмнө энэ болон бусад салбарын идэвхтэй хоригийг шалгана.</p>
            </div>
          </div>
          <form onSubmit={searchCustomerBeforeEntry}>
            <label htmlFor="manager-customer-phone">Утасны дугаар</label>
            <div>
              <Phone />
              <input
                id="manager-customer-phone"
                inputMode="numeric"
                autoComplete="tel"
                value={customerPhone}
                onChange={(event) => {
                  setCustomerPhone(onlyDigits(event.target.value));
                  setCustomerSearched(false);
                  setCustomerSearchFound(false);
                  setCustomerSearchError("");
                }}
                placeholder="9911 2233"
                maxLength={8}
              />
              <button type="submit" disabled={customerSearching || customerPhone.length !== 8}>
                {customerSearching ? <RefreshCw className="spin" /> : <Search />}
                {customerSearching ? "Хайж байна…" : "Шалгах"}
              </button>
            </div>
          </form>
          {customerSearchError && <p className="manager-customer-search-message error" role="alert">{customerSearchError}</p>}
          {customerSearched && !customerSearchError && !customerSearchFound && (
            <p className="manager-customer-search-message empty" role="status">
              Бүртгэлтэй хэрэглэгч олдсонгүй. Шинэ хэрэглэгчийг оператор эсвэл үүдний бүртгэлээр үүсгэнэ.
            </p>
          )}
        </section>
        {latest && (
          <section className="live-panel">
            <div className="live-icon">
              <Bell />
              <small>LIVE</small>
            </div>
            <div className="live-content">
              <span className="new-entry">Шинэ нэвтрэлт</span>
              <h2>
                <Rank value={latest.membership_rank} /> хэрэглэгч нэвтэрлээ
              </h2>
              <div className="live-meta">
                <span>
                  <Clock3 /> Нэвтэрсэн цаг{" "}
                  <strong>{dateTime(latest.entered_at)}</strong>
                </span>
                <span>
                  <ShieldCheck /> Хамгаалагч{" "}
                  <strong>{latest.guard_name}</strong>
                </span>
                <span>
                  <UserPlus /> Төлөв{" "}
                  <strong>{visitLabel(latest.visit_number || 1)}</strong>
                </span>
              </div>
            </div>
            <div className="live-actions">
              <button
                className="detail-button"
                onClick={() => openInsight(latest)}
              >
                <Bell /> Зочны товч
              </button>
              {!latest.manager_acknowledged && (
                <button
                  className="ack-button"
                  onClick={() => acknowledge(latest.name)}
                >
                  <Check /> Уншсан
                </button>
              )}
            </div>
          </section>
        )}
        <section className="summary-strip">
          <span>
            <CalendarDays /> Өнөөдөр
          </span>
          <span>
            Нийт нэвтрэлт <strong>{feed?.today_total || 0}</strong>
          </span>
          <span>
            Анхны ирэлт <strong>{feed?.today_new || 0}</strong>
          </span>
          <span>
            Уншаагүй <strong>{feed?.unread || 0}</strong>
          </span>
          <button
            className="refresh-button"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw className={loading ? "spin" : ""} /> Шинэчлэх
          </button>
        </section>
        <section className="feed-section">
          <div className="section-title">
            <h2>Сүүлийн нэвтрэлтүүд</h2>
            <span>{ctx.branch} салбарын мэдээлэл</span>
          </div>
          <div className="entry-table">
            <div className="table-head">
              <span>Нэвтэрсэн цаг</span>
              <span>Хэрэглэгч</span>
              <span>VIP зэрэг</span>
              <span>Төлөв</span>
              <span>Хамгаалагч</span>
              <span>Үйлдэл</span>
            </div>
            {feed?.entries.length ? (
              feed.entries.map((entry) => (
                <div
                  className={`table-row ${!entry.manager_acknowledged ? "unread" : ""}`}
                  key={entry.name}
                >
                  <span data-label="Нэвтэрсэн цаг">
                    {dateTime(entry.entered_at)}
                  </span>
                  <strong data-label="Хэрэглэгч">{entry.customer_name}</strong>
                  <span className="mobile-field" data-label="VIP зэрэг">
                    <Rank value={entry.membership_rank} />
                  </span>
                  <span data-label="Төлөв">
                    {visitLabel(entry.visit_number || 1)}
                  </span>
                  <span data-label="Хамгаалагч">{entry.guard_name}</span>
                  <span className="table-actions" data-label="Үйлдэл">
                    <button
                      className="row-detail"
                      onClick={() => openDetail(entry)}
                    >
                      <Eye /> Дэлгэрэнгүй
                    </button>
                    {!entry.manager_acknowledged && (
                      <button onClick={() => acknowledge(entry.name)}>
                        Уншсан
                      </button>
                    )}
                  </span>
                </div>
              ))
            ) : (
              <div className="empty-feed">Өнөөдрийн нэвтрэлт хараахан алга</div>
            )}
          </div>
        </section>
      </main>
      {insightEntry && (
        <EntryInsightModal
          entry={insightEntry}
          summary={entrySummary}
          loading={insightLoading}
          error={insightError}
          onClose={closeInsight}
          onOpenFullDetail={() => {
            const entry = insightEntry;
            closeInsight();
            void openDetail(entry);
          }}
        />
      )}{" "}
      {selectedEntry && (
        <CustomerDetailDrawer
          entry={selectedEntry}
          detail={customerDetail}
          loading={detailLoading}
          error={detailError}
          onClose={closeDetail}
          onRankSaved={(updated) => {
            setCustomerDetail(updated);
            refresh();
          }}
        />
      )}
    </>
  );
}

export default function App() {
  const [ctx, setCtx] = useState<AppContext | null>(null);
  const [entryAccess, setEntryAccess] = useState<EntryAccessVerification | null>(null);
  const [entryQRContext, setEntryQRContext] = useState<EntryQRContext | null>(null);
  const [entryQRError, setEntryQRError] = useState("");
  const [scannedToken] = useState(() => new URLSearchParams(window.location.search).get("entry_access") || "");
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    let active = true;
    const boot = async () => {
      let lockedBranch: EntryQRContext | null = null;
      if (scannedToken) {
        try {
          lockedBranch = await api.entryQRContext(scannedToken);
          if (active) setEntryQRContext(lockedBranch);
        } catch (err) {
          if (active) {
            setEntryQRError(err instanceof Error ? err.message : "Үүдний QR кодыг шалгаж чадсангүй.");
            setCtx(null);
          }
          return;
        }
      }
      let current: AppContext | null = null;
      try {
        current = await api.context();
      } catch {
        current = null;
      }
      if (lockedBranch && current) {
        const canUseBranch = current.mode === "operation" || (
          current.mode !== "admin" && current.branch === lockedBranch.branch
        );
        if (!canUseBranch) {
          await api.logout().catch(() => {});
          current = null;
        }
      }
      if (active) setCtx(current);
    };
    void boot().finally(() => {
      if (active) setChecking(false);
    });
    return () => { active = false; };
  }, [scannedToken]);
  useEffect(() => {
    if (!ctx || ctx.mode === "admin" || !entryAccess) return;
    const timer = window.setInterval(async () => {
      const token = sessionStorage.getItem("vip-entry-branch-qr") || "";
      if (!token) {
        setEntryAccessEvidence(null);
        setEntryAccess(null);
        return;
      }
      try {
        const position = await getCurrentPosition();
        const result = await api.verifyEntryAccess(token, position.latitude, position.longitude, position.accuracy);
        setEntryAccessEvidence({ token, ...position });
        setEntryAccess(result);
      } catch {
        setEntryAccessEvidence(null);
        setEntryAccess(null);
      }
    }, 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [ctx, entryAccess]);
  const logout = async () => {
    await api.logout().catch(() => {});
    sessionStorage.removeItem("vip-entry-branch-qr");
    setEntryAccessEvidence(null);
    setEntryAccess(null);
    setCtx(null);
  };
  const acceptLogin = async (nextContext: AppContext) => {
    if (entryQRContext) {
      const canUseBranch = nextContext.mode === "operation" || (
        nextContext.mode !== "admin" && nextContext.branch === entryQRContext.branch
      );
      if (!canUseBranch) {
        await api.logout().catch(() => {});
        throw new Error(`${entryQRContext.branch} салбарын хамгаалагч, оператор эсвэл менежерийн эрхээр нэвтэрнэ үү.`);
      }
    }
    setCtx(nextContext);
  };
  let screen: React.ReactNode;
  if (checking)
    screen = (
      <div className="boot">
        <Brand />
        <span>Системийг ачаалж байна…</span>
      </div>
    );
  else if (!ctx && entryQRError) screen = <EntryQRFailure message={entryQRError} />;
  else if (!ctx) screen = <Login onLogin={acceptLogin} requiredBranch={entryQRContext?.branch} />;
  else if (ctx.mode === "admin")
    screen = <AdminApp ctx={ctx} onLogout={logout} />;
  else if (ctx.mode !== "manager" && ctx.entry_access_required && !entryAccess)
    screen = <BranchEntryAccess ctx={ctx} onVerified={setEntryAccess} onLogout={logout} />;
  else if (ctx.mode === "operation")
    screen = <OperationApp ctx={{...ctx, branch: entryAccess?.branch || ctx.branch, branches: entryAccess ? [entryAccess.branch] : ctx.branches}} onLogout={logout} />;
  else
    screen =
      ctx.mode === "manager" ? (
        <ManagerApp ctx={ctx} onLogout={logout} />
      ) : (
        <GuardApp ctx={ctx} onLogout={logout} />
      );
  return (
    <div className={`app-shell mode-${ctx?.mode || "login"}`}>
      <AmbientStage />
      {screen}
    </div>
  );
}
