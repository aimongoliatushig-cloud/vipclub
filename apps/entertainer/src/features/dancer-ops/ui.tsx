import {
  ArrowLeft,
  Bell,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Home,
  Moon,
  Sun,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { opsCopy, type OpsLocale } from "./locale";
import type { MainTab, ShiftStatus } from "./model";

const mainNavigation = [
  { id: "home" as const, icon: Home },
  { id: "requests" as const, icon: ClipboardList },
  { id: "schedule" as const, icon: CalendarDays },
  { id: "earnings" as const, icon: WalletCards },
  { id: "profile" as const, icon: UserRound },
];

export function BrandMark() {
  return (
    <span className="ops-brand" aria-label="VIP Club">
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16 2.8 20.4 11l8.8 5-8.8 5L16 29.2 11.6 21l-8.8-5 8.8-5L16 2.8Z" />
        <path d="m11.6 11 4.4 5 4.4-5M11.6 21l4.4-5 4.4 5" />
      </svg>
      <strong>VIP CLUB</strong>
    </span>
  );
}

export type OpsTheme = "light" | "dark";

export function ThemeSwitch({
  theme,
  locale,
  onToggle,
  withLabel = false,
}: {
  theme: OpsTheme;
  locale: OpsLocale;
  onToggle: () => void;
  withLabel?: boolean;
}) {
  const isDark = theme === "dark";
  const copy = opsCopy[locale].shell;
  return (
    <label className={`ops-theme-switch${withLabel ? " is-labelled" : ""}`}>
      {withLabel ? <span className="ops-theme-switch-copy"><strong>{copy.appearance}</strong><small>{isDark ? copy.darkMode : copy.lightMode}</small></span> : null}
      <input
        type="checkbox"
        role="switch"
        checked={isDark}
        aria-label={isDark ? copy.switchToLight : copy.switchToDark}
        onChange={onToggle}
      />
      <span className="ops-theme-switch-track" aria-hidden="true">
        <Sun className="is-sun" />
        <Moon className="is-moon" />
        <i />
      </span>
    </label>
  );
}

export function MobileHeader({
  theme,
  locale,
  unreadCount,
  onThemeToggle,
  onNotifications,
}: {
  theme: OpsTheme;
  locale: OpsLocale;
  unreadCount: number;
  onThemeToggle: () => void;
  onNotifications: () => void;
}) {
  return (
    <header className="ops-mobile-header">
      <BrandMark />
      <span className="ops-header-actions">
        <ThemeSwitch theme={theme} locale={locale} onToggle={onThemeToggle} />
        <button className="ops-icon-button" type="button" aria-label={`${opsCopy[locale].shell.viewNotifications} · ${unreadCount}`} onClick={onNotifications}>
          <Bell aria-hidden="true" />
          {unreadCount > 0 ? <span className="ops-notification-dot" aria-hidden="true" /> : null}
        </button>
      </span>
    </header>
  );
}

export function PageHeader({
  title,
  subtitle,
  onBack,
  backLabel = "Буцах",
  action,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="ops-page-header">
      <span className="ops-page-header-side">
        {onBack ? (
          <button className="ops-icon-button" type="button" aria-label={backLabel} onClick={onBack}>
            <ArrowLeft aria-hidden="true" />
          </button>
        ) : null}
      </span>
      <div>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      <span className="ops-page-header-side ops-page-header-action">{action}</span>
    </header>
  );
}

export function BottomNavigation({ active, locale, onSelect }: { active: MainTab; locale: OpsLocale; onSelect: (tab: MainTab) => void }) {
  const copy = opsCopy[locale].shell;
  return (
    <nav className="ops-bottom-nav" aria-label={copy.navigationLabel}>
      {mainNavigation.map((item) => (
        <button
          key={item.id}
          type="button"
          className={active === item.id ? "is-active" : ""}
          aria-current={active === item.id ? "page" : undefined}
          onClick={() => onSelect(item.id)}
        >
          <item.icon aria-hidden="true" />
          <span>{copy.navigation[item.id]}</span>
        </button>
      ))}
    </nav>
  );
}

export function DesktopNavigation({
  active,
  theme,
  locale,
  unreadCount,
  onSelect,
  onThemeToggle,
  onNotifications,
}: {
  active: MainTab;
  theme: OpsTheme;
  locale: OpsLocale;
  unreadCount: number;
  onSelect: (tab: MainTab) => void;
  onThemeToggle: () => void;
  onNotifications: () => void;
}) {
  const copy = opsCopy[locale].shell;
  return (
    <aside className="ops-desktop-nav">
      <BrandMark />
      <p>{copy.appSubtitle}</p>
      <nav aria-label={copy.navigationLabel}>
        {mainNavigation.map((item) => (
          <button
            key={item.id}
            type="button"
            className={active === item.id ? "is-active" : ""}
            aria-current={active === item.id ? "page" : undefined}
            onClick={() => onSelect(item.id)}
          >
            <item.icon aria-hidden="true" />
            <span>{copy.navigation[item.id]}</span>
          </button>
        ))}
      </nav>
      <div className="ops-desktop-shift">
        <small>{copy.currentShift}</small>
        <strong>Nomad</strong>
        <span>21:00–04:00</span>
      </div>
      <div className="ops-desktop-tools">
        <ThemeSwitch theme={theme} locale={locale} onToggle={onThemeToggle} withLabel />
        <button type="button" onClick={onNotifications}>
          <Bell aria-hidden="true" />
          {copy.notifications} {unreadCount > 0 ? <span>{unreadCount}</span> : null}
        </button>
      </div>
    </aside>
  );
}

export function ModuleCard({
  title,
  value,
  detail,
  meta,
  icon,
  visual,
  onClick,
  emphasis = "default",
  accent = "indigo",
  wide = false,
}: {
  title: string;
  value: string;
  detail: string;
  meta?: string;
  icon: React.ReactNode;
  visual: React.ReactNode;
  onClick: () => void;
  emphasis?: "default" | "hero" | "warning";
  accent?: "deep-indigo" | "indigo" | "periwinkle" | "lavender";
  wide?: boolean;
}) {
  return (
    <button
      className={`ops-module-card is-${emphasis} has-${accent}${wide ? " is-wide" : ""}`}
      type="button"
      onClick={onClick}
      aria-label={`${title}: ${value}. ${detail}`}
    >
      <span className="ops-module-card-head">
        <span className="ops-module-icon">{icon}</span>
        <small>{title}</small>
        <ChevronRight aria-hidden="true" />
      </span>
      <span className="ops-module-visual" aria-hidden="true">{visual}</span>
      <strong>{value}</strong>
      <span className="ops-module-detail">{detail}</span>
      {meta ? <span className="ops-module-meta">{meta}</span> : null}
    </button>
  );
}

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="ops-segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={value === option.value ? "is-active" : ""}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function DisclosureRow({
  title,
  detail,
  meta,
  tone,
  onClick,
  icon,
}: {
  title: string;
  detail?: string;
  meta?: string;
  tone?: "success" | "warning" | "danger" | "primary";
  onClick?: () => void;
  icon?: React.ReactNode;
}) {
  const content = (
    <>
      {icon ? <span className={`ops-row-icon${tone ? ` is-${tone}` : ""}`}>{icon}</span> : null}
      <span className="ops-row-copy">
        <strong>{title}</strong>
        {detail ? <small>{detail}</small> : null}
      </span>
      {meta ? <span className={`ops-row-meta${tone ? ` is-${tone}` : ""}`}>{meta}</span> : null}
      {onClick ? <ChevronRight className="ops-row-chevron" aria-hidden="true" /> : null}
    </>
  );

  return onClick ? (
    <button className="ops-disclosure-row" type="button" onClick={onClick}>
      {content}
    </button>
  ) : (
    <div className="ops-disclosure-row">{content}</div>
  );
}

export function StatusMark({ status }: { status: ShiftStatus | string }) {
  const tone =
    status === "Боломжтой" || status === "Баталгаажсан"
      ? "success"
      : status === "Тайзан дээр"
        ? "stage"
        : status === "VIP үйлчилгээ"
          ? "primary"
          : status === "Ирээгүй"
            ? "danger"
            : "neutral";
  return <span className={`ops-status-mark is-${tone}`} aria-hidden="true" />;
}

export function Toast({ message, tone = "success", onClose }: { message: string; tone?: "success" | "danger"; onClose: () => void }) {
  if (!message) return null;
  return (
    <div className={`ops-toast is-${tone}`} role="status">
      <span>{message}</span>
      <button type="button" aria-label="Мэдэгдэл хаах" onClick={onClose}>
        <X aria-hidden="true" />
      </button>
    </div>
  );
}
