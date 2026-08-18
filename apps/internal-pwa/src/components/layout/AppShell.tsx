import { useEffect, useRef, useState, type ComponentType } from 'react'
import {
  BarChart3,
  Bell,
  Bot,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  CircleAlert,
  ClipboardCheck,
  Crown,
  Gauge,
  HandCoins,
  LayoutDashboard,
  ListTodo,
  Menu,
  MessageSquare,
  PanelLeftClose,
  RefreshCw,
  Target,
  Users,
  UsersRound,
  WifiOff,
  X,
} from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../../state/useApp'
import { useAuth } from '../../auth/useAuth'
import type { ExecutivePermission } from '../../auth/types'
import { OverlayPanel } from '../ui/OverlayPanel'
import { Toast } from '../ui/Toast'
import { PwaLifecycleBanner } from '../pwa/PwaLifecycleBanner'

interface NavigationItem {
  label: string
  shortLabel: string
  to: string
  icon: ComponentType<{ size?: number; strokeWidth?: number; 'aria-hidden'?: boolean }>
  permission: ExecutivePermission
  end?: boolean
}

const navigation: NavigationItem[] = [
  { label: 'Удирдлагын төв', shortLabel: 'Төв', to: '/', icon: LayoutDashboard, permission: 'dashboard.read', end: true },
  { label: 'Салбарууд', shortLabel: 'Салбар', to: '/branches', icon: Building2, permission: 'branches.read' },
  { label: 'Борлуулалт ба зорилт', shortLabel: 'Борлуулалт', to: '/sales', icon: Target, permission: 'sales.read' },
  { label: 'Харилцагчид', shortLabel: 'CRM', to: '/customers', icon: UsersRound, permission: 'customers.read' },
  { label: 'Ажиллах хүч', shortLabel: 'Хүний нөөц', to: '/workforce', icon: Users, permission: 'workforce.read' },
  { label: 'Гүйцэтгэл', shortLabel: 'Гүйцэтгэл', to: '/performance', icon: Gauge, permission: 'performance.read' },
  { label: 'Шийдвэрүүд', shortLabel: 'Шийдвэр', to: '/approvals', icon: ClipboardCheck, permission: 'approvals.read' },
  { label: 'Санхүү ба тооцоо', shortLabel: 'Санхүү', to: '/finance', icon: HandCoins, permission: 'finance.read' },
  { label: 'Даалгавар', shortLabel: 'Даалгавар', to: '/tasks', icon: ListTodo, permission: 'tasks.read' },
  { label: 'Мессеж', shortLabel: 'Мессеж', to: '/messages', icon: MessageSquare, permission: 'messages.read' },
  { label: 'Hermes', shortLabel: 'Hermes', to: '/hermes', icon: Bot, permission: 'hermes.read' },
  { label: 'Тайлан, шинжилгээ', shortLabel: 'Тайлан', to: '/reports', icon: BarChart3, permission: 'reports.read' },
]

const primaryMobilePaths = ['/', '/branches', '/approvals', '/messages']

function NavigationLink({ item, mobile = false, count, onNavigate }: { item: NavigationItem; mobile?: boolean; count?: number; onNavigate?(): void }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}${mobile ? ' nav-link--mobile' : ''}`}
      onClick={onNavigate}
    >
      <Icon size={mobile ? 21 : 19} strokeWidth={1.75} aria-hidden />
      <span>{mobile ? item.shortLabel : item.label}</span>
      {!mobile && count ? <span className="nav-count">{count}</span> : null}
    </NavLink>
  )
}

export function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const { refresh, refreshing, refreshError, lastRefreshedAt, online, notifications, tasks, threads, branches } = useApp()
  const { session, signOut, hasPermission } = useAuth()
  const [moreOpen, setMoreOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const previousPath = useRef(location.pathname)
  const authorizedNavigation = navigation.filter((item) => hasPermission(item.permission))
  const unreadMessages = threads.reduce((total, item) => total + item.unread, 0)
  const unreadNotifications = notifications.filter((item) => !item.readAt).length
  const scopeLabel = session.role === 'CEO'
    ? `${branches.length} салбар · company-wide scope`
    : `${branches[0]?.name ?? 'Оноосон салбар'} · own-branch scope`
  const navigationCount = (item: NavigationItem) => item.to === '/tasks' ? tasks.length : item.to === '/messages' ? unreadMessages : undefined

  useEffect(() => {
    if (previousPath.current !== location.pathname) {
      mainRef.current?.focus({ preventScroll: true })
      previousPath.current = location.pathname
    }
  }, [location.pathname])

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Үндсэн агуулга руу шилжих</a>
      <aside className="sidebar" aria-label="Гүйцэтгэх захирлын хажуу цэс">
        <button className="brand" type="button" onClick={() => navigate('/')} aria-label="VIP Club удирдлагын төв">
          <Crown size={26} strokeWidth={1.7} aria-hidden="true" />
          <span>VIP CLUB</span>
        </button>
        <nav className="sidebar__nav" aria-label="Үндсэн цэс">
          {authorizedNavigation.map((item) => <NavigationLink key={item.to} item={item} count={navigationCount(item)} />)}
        </nav>
        <div className="sidebar__footer">
          <button type="button" className="sidebar-collapse" aria-label="Цэсийг хумих">
            <PanelLeftClose size={18} aria-hidden="true" />
            <span>Цэсийг нуух</span>
          </button>
          <span className="version-label">Management prototype · v0.1</span>
        </div>
      </aside>

      <div className="app-stage">
        <header className="topbar">
          <button className="mobile-brand" type="button" onClick={() => navigate('/')} aria-label="VIP Club удирдлагын төв">
            <Crown size={23} strokeWidth={1.7} aria-hidden="true" />
            <span>VIP CLUB</span>
          </button>
          {session.source === 'demo' ? <span className="demo-mode-label" aria-label="Demo өгөгдөл">DEMO DATA</span> : null}
          <div className="topbar__greeting">
            <strong>Өглөөний мэнд, {session.displayName}</strong>
            <span>{session.role === 'CEO' ? 'Гүйцэтгэх захирлын ажлын орчин' : 'Салбарын менежерийн ажлын орчин'}</span>
          </div>
          <div className="topbar__status">
            <div>
              <strong>2026.08.12, Лхагва · 08:24</strong>
              <button type="button" className="freshness-button" onClick={() => void refresh()} disabled={refreshing}>
                <RefreshCw size={13} className={refreshing ? 'spin' : undefined} aria-hidden="true" />
                {session.source === 'demo' ? 'Demo snapshot' : 'Server data'} · {lastRefreshedAt}
              </button>
            </div>
            {hasPermission('notifications.read') ? <button className="icon-button notification-button" type="button" onClick={() => navigate('/notifications')} aria-label={`${unreadNotifications} уншаагүй мэдэгдэл`}>
              <Bell size={20} aria-hidden="true" />
              {unreadNotifications ? <span>{unreadNotifications}</span> : null}
            </button> : null}
            <div className="profile-menu-wrap">
              <button className="profile-button" type="button" aria-label="Хэрэглэгчийн цэс" aria-expanded={profileOpen} onClick={() => setProfileOpen((value) => !value)}>
                <span className="avatar">{session.initials}</span>
                <span className="profile-button__copy"><strong>{session.displayName}</strong><small>{session.role}</small></span>
                <ChevronDown size={16} aria-hidden="true" />
              </button>
              {profileOpen ? <div className="profile-menu" role="menu"><div><strong>{session.displayName}</strong><span>{session.role} · {session.source === 'demo' ? 'Demo session' : 'Server session'}</span><small>{scopeLabel}</small></div><button type="button" role="menuitem" onClick={() => { setProfileOpen(false); signOut() }}>Гарах</button></div> : null}
            </div>
            {hasPermission('tasks.read') ? <button className="button button--primary topbar__primary" type="button" onClick={() => navigate('/tasks?create=1')}>
              <BriefcaseBusiness size={18} aria-hidden="true" />
              Шинэ даалгавар
            </button> : null}
          </div>
        </header>

        <PwaLifecycleBanner online={online} onReconnect={refresh} />
        {!online ? <div className="offline-banner" role="status"><WifiOff size={18} aria-hidden /><div><strong>Офлайн · өөрчлөлтүүд хаалттай</strong><span>{session.source === 'demo' ? 'Зөвхөн аюулгүй demo snapshot харагдана. Шийдвэр, мессеж болон бусад өөрчлөлт хадгалагдахгүй.' : 'Өмнөх API өгөгдөл, нууцлалтай агуулгыг офлайнаар харуулахгүй. Холболт сэргэсний дараа дахин ачаална.'}</span></div><button type="button" onClick={() => void refresh()} disabled={refreshing}>Холболт шалгах</button></div> : null}
        {online && refreshError ? <div className="sync-error-banner" role="alert"><CircleAlert size={18} aria-hidden /><div><strong>Өгөгдөл шинэчилж чадсангүй</strong><span>{refreshError}</span></div><button type="button" onClick={() => void refresh()} disabled={refreshing}>{refreshing ? 'Оролдож байна…' : 'Дахин оролдох'}</button></div> : null}

        <main className="app-main" id="main-content" key={location.pathname} ref={mainRef} tabIndex={-1} aria-label="Үндсэн агуулга">
          <Outlet />
        </main>
      </div>

      <nav className="mobile-nav" aria-label="Мобайл үндсэн цэс">
        {authorizedNavigation.filter((item) => primaryMobilePaths.includes(item.to)).map((item) => (
          <NavigationLink key={item.to} item={item} mobile />
        ))}
        <button type="button" className={`nav-link nav-link--mobile${moreOpen ? ' nav-link--active' : ''}`} onClick={() => setMoreOpen(true)}>
          <Menu size={21} strokeWidth={1.75} aria-hidden="true" />
          <span>Цэс</span>
        </button>
      </nav>

      <OverlayPanel open={moreOpen} onClose={() => setMoreOpen(false)} title="Бүх хэсэг" variant="sheet">
        <nav className="mobile-more-nav">
          {authorizedNavigation.map((item) => <NavigationLink key={item.to} item={item} count={navigationCount(item)} onNavigate={() => setMoreOpen(false)} />)}
        </nav>
        <button type="button" className="button button--secondary mobile-more-close" onClick={() => setMoreOpen(false)}>
          <X size={18} aria-hidden="true" /> Хаах
        </button>
      </OverlayPanel>
      <Toast />
    </div>
  )
}
