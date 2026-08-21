import type { ReactNode } from 'react'
import { Bell, CalendarDays, Home, Medal, Menu, UserRound, WalletCards } from 'lucide-react'
import type { Screen } from '../types'
import { BrandMark } from './BrandMark'

interface AppShellProps {
  active: Screen
  onNavigate: (screen: Screen) => void
  onNotifications: () => void
  children: ReactNode
}

const items = [
  { id: 'dashboard' as const, label: 'Нүүр', icon: Home },
  { id: 'schedule' as const, label: 'Хуваарь', icon: CalendarDays },
  { id: 'income' as const, label: 'Орлого', icon: WalletCards },
  { id: 'ranking' as const, label: 'Зэрэглэл', icon: Medal },
  { id: 'more' as const, label: 'Бусад', icon: Menu },
]

export function AppShell({ active, onNavigate, onNotifications, children }: AppShellProps) {
  return (
    <div className="app-stage">
      <div className="phone-shell">
        <header className="topbar">
          <BrandMark />
          <div className="topbar-actions">
            <button className="icon-button notification-button" type="button" aria-label="Мэдэгдэл" onClick={onNotifications}>
              <Bell size={20} />
              <span className="notification-dot" />
            </button>
            <button className="icon-button" type="button" aria-label="Профайл" onClick={() => onNavigate('profile')}>
              <UserRound size={20} />
            </button>
          </div>
        </header>

        <main className="app-main">{children}</main>

        <nav className="bottom-nav" aria-label="Үндсэн цэс">
          {items.map(({ id, label, icon: Icon }) => {
            const selected = active === id || (id === 'more' && ['attendance', 'reservations', 'loan', 'leave', 'profile'].includes(active))
            return (
              <button key={id} className={selected ? 'nav-item active' : 'nav-item'} type="button" onClick={() => onNavigate(id)}>
                <Icon size={21} strokeWidth={selected ? 2.2 : 1.8} />
                <span>{label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

