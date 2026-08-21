import { useCallback, useEffect, useState } from 'react'
import { BellRing, CheckCircle2, Clock3, RefreshCw } from 'lucide-react'
import { api } from '../../api'
import type { StaffNotification, StaffNotificationData } from '../../api'
import './ShiftReminderNotifications.css'

const DISPLAYED_KEY = 'nomad-shift-reminder-last-shown'

const displayDateTime = (value: string) => {
  const parsed = new Date(String(value || '').replace(' ', 'T'))
  if (Number.isNaN(parsed.getTime())) return 'Огноо тодорхойгүй'
  return new Intl.DateTimeFormat('mn-MN', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(parsed)
}

const showSystemNotification = async (row: StaffNotification) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  if (localStorage.getItem(DISPLAYED_KEY) === row.name) return
  const registration = await navigator.serviceWorker?.ready.catch(() => undefined)
  if (registration) await registration.showNotification(row.subject, {
    body: row.message,
    icon: '/staff/icon-192.png',
    badge: '/staff/icon-192.png',
    tag: `shift-reminder-${row.name}`,
    data: { url: '/staff/?view=notifications' },
  })
  else {
    const notification = new Notification(row.subject, { body: row.message, icon: '/staff/icon-192.png', tag: `shift-reminder-${row.name}` })
    notification.onclick = () => {
      notification.close()
      window.location.assign('/staff/?view=notifications')
    }
  }
  localStorage.setItem(DISPLAYED_KEY, row.name)
}

export function ShiftReminderWatcher() {
  const poll = useCallback(async () => {
    if (document.visibilityState === 'hidden' || !navigator.onLine) return
    try {
      const data = await api.myNotifications(5)
      const reminder = data.notifications.find(row => !row.read && row.document_type === 'Shift Assignment')
      if (reminder) await showSystemNotification(reminder)
    } catch {
      // The global API boundary handles session and permission failures.
    }
  }, [])

  useEffect(() => {
    void poll()
    const timer = window.setInterval(() => void poll(), 60_000)
    const onVisibility = () => { if (document.visibilityState === 'visible') void poll() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [poll])

  return null
}

export function ShiftReminderNotifications() {
  const [data, setData] = useState<StaffNotificationData>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => 'Notification' in window ? Notification.permission : 'unsupported')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const value = await api.myNotifications(20)
      setData(value)
      // Mark only rows this screen actually exposes. Hidden notification types must
      // remain unread until their own destination has rendered them.
      const unread = value.notifications
        .filter(row => !row.read && row.document_type === 'Shift Assignment')
        .map(row => row.name)
      if (unread.length) void api.markMyNotificationsRead(unread).catch(() => undefined)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Сануулгыг ачаалж чадсангүй.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const enableSystemNotifications = async () => {
    if (!('Notification' in window)) return
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === 'granted') {
      const reminder = data?.notifications.find(row => row.document_type === 'Shift Assignment')
      if (reminder) await showSystemNotification(reminder)
    }
  }

  const rows = data?.notifications.filter(row => row.document_type === 'Shift Assignment') ?? []
  return <section className="shift-reminder-list" aria-label="Ээлжийн сануулга">
    <header><div><span>Ээлжийн сануулга</span><h2>Миний ээлж</h2></div><button type="button" onClick={() => void load()} aria-label="Сануулга шинэчлэх"><RefreshCw className={loading ? 'spin' : ''} /></button></header>
    {permission === 'default' ? <button className="shift-notification-permission" type="button" onClick={() => void enableSystemNotifications()}><BellRing /><span><strong>Аппын сануулга асаах</strong><small>Апп нээлттэй үед шинэ сануулгыг төхөөрөмж дээр харуулна.</small></span></button> : null}
    {permission === 'denied' ? <div className="shift-notification-disabled"><BellRing /><span>Сануулга хаалттай байна. Browser-ийн тохиргооноос зөвшөөрч болно.</span></div> : null}
    {permission === 'granted' ? <div className="shift-notification-enabled"><CheckCircle2 /><span>Апп нээлттэй үеийн сануулга идэвхтэй</span></div> : null}
    {error ? <div className="shift-reminder-state is-error" role="alert">{error}</div> : loading && !data ? <div className="shift-reminder-state"><RefreshCw className="spin" />Ачаалж байна…</div> : rows.length ? rows.map(row => <article key={row.name}><span className="shift-reminder-icon"><Clock3 /></span><div><strong>{row.subject}</strong><p>{row.message}</p><small>{displayDateTime(row.created_at)}</small></div></article>) : <div className="shift-reminder-state"><Clock3 /><span>Шинэ ээлжийн сануулга алга.</span></div>}
  </section>
}
