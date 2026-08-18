import { useMemo, useState, type ComponentType } from 'react'
import {
  Bell,
  BellRing,
  Bot,
  CheckCheck,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  HandCoins,
  ListTodo,
  MessageSquareWarning,
  ShieldCheck,
  Target,
  WifiOff,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { ExecutivePermission } from '../auth/types'
import { useAuth } from '../auth/useAuth'
import { PageHeader } from '../components/ui/PageHeader'
import { StatusMark } from '../components/ui/StatusMark'
import type { ExecutiveNotification, ExecutiveNotificationKind } from '../domain/types'
import { useApp } from '../state/useApp'

type InboxFilter = 'all' | 'unread'
type BrowserPermissionState = NotificationPermission | 'unsupported'

const permissionByKind: Record<ExecutiveNotificationKind, ExecutivePermission> = {
  approval: 'approvals.read',
  settlement: 'finance.read',
  task: 'tasks.read',
  message: 'messages.read',
  escalation: 'branches.read',
  'goal-plan': 'sales.read',
  hermes: 'hermes.read',
}

const iconByKind: Record<ExecutiveNotificationKind, ComponentType<{ size?: number; 'aria-hidden'?: boolean }>> = {
  approval: ClipboardCheck,
  settlement: HandCoins,
  task: ListTodo,
  message: MessageSquareWarning,
  escalation: CircleAlert,
  'goal-plan': Target,
  hermes: Bot,
}

const permissionCopy: Record<BrowserPermissionState, { label: string; detail: string; tone: 'healthy' | 'attention' | 'neutral' }> = {
  granted: { label: 'Төхөөрөмжийн мэдэгдэл идэвхтэй', detail: 'Зөвхөн энэ төхөөрөмж дээр зөвшөөрсөн үйл явдлын товч дохио ирнэ.', tone: 'healthy' },
  denied: { label: 'Төхөөрөмжийн мэдэгдэл хаалттай', detail: 'Апп доторх мэдэгдлийн хайрцаг хэвийн ажиллана. Төхөөрөмжийн тохиргооноос зөвшөөрлийг өөрчилж болно.', tone: 'attention' },
  default: { label: 'Төхөөрөмжийн зөвшөөрөл асуугаагүй', detail: 'Таны товч дарах хүртэл систем зөвшөөрөл хүсэхгүй.', tone: 'neutral' },
  unsupported: { label: 'Энэ төхөөрөмж дэмжихгүй байна', detail: 'Апп доторх мэдэгдлийн хайрцаг нь iPhone болон дэмждэггүй орчны үндсэн хувилбар байна.', tone: 'neutral' },
}

const getBrowserPermission = (): BrowserPermissionState => {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return window.Notification.permission
}

const formatDeliveredAt = (value: string) => new Intl.DateTimeFormat('mn-MN', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
}).format(new Date(value))

export default function NotificationsPage() {
  const navigate = useNavigate()
  const { session, hasPermission } = useAuth()
  const { notifications, online, markNotificationRead, markAllNotificationsRead } = useApp()
  const [filter, setFilter] = useState<InboxFilter>('all')
  const [browserPermission, setBrowserPermission] = useState<BrowserPermissionState>(getBrowserPermission)
  const [permissionBusy, setPermissionBusy] = useState(false)
  const [targetMessage, setTargetMessage] = useState<string | null>(null)

  const authorizedNotifications = useMemo(() => notifications.filter((item) => {
    const branchAllowed = !item.branchId || session.role === 'CEO' || session.branchIds.includes(item.branchId)
    return branchAllowed && hasPermission(permissionByKind[item.kind])
  }), [hasPermission, notifications, session.branchIds, session.role])
  const unreadCount = authorizedNotifications.filter((item) => !item.readAt).length
  const visibleNotifications = filter === 'unread'
    ? authorizedNotifications.filter((item) => !item.readAt)
    : authorizedNotifications
  const permissionState = permissionCopy[browserPermission]

  const requestBrowserPermission = async () => {
    setTargetMessage(null)
    if (!online) {
      setTargetMessage('Офлайн үед төхөөрөмжийн зөвшөөрөл хүсэхгүй. Холболт сэргэсний дараа дахин оролдоно уу.')
      return
    }
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setBrowserPermission('unsupported')
      return
    }
    setPermissionBusy(true)
    try {
      setBrowserPermission(await window.Notification.requestPermission())
    } catch {
      setTargetMessage('Төхөөрөмжийн зөвшөөрлийн хүсэлт амжилтгүй боллоо. Апп доторх мэдэгдлийн хайрцаг хэвийн ажиллана.')
    } finally {
      setPermissionBusy(false)
    }
  }

  const openNotification = (item: ExecutiveNotification) => {
    setTargetMessage(null)
    markNotificationRead(item.id)
    const branchAllowed = !item.branchId || session.role === 'CEO' || session.branchIds.includes(item.branchId)
    if (!branchAllowed || !hasPermission(permissionByKind[item.kind])) {
      setTargetMessage('Энэ мэдэгдлийн зорилтот хэсэгт хандах эрхгүй. Холбоос нь нэмэлт эрх олгохгүй.')
      return
    }
    if (item.targetState && item.targetState !== 'active') {
      setTargetMessage('Зорилтот хүсэлт буцаан татагдсан эсвэл хуучирсан байна. Мэдэгдлийн төлөв шинэчлэгдлээ; хуучин дэлгэрэнгүйг нээсэнгүй.')
      return
    }
    if (!online && item.sensitive) {
      setTargetMessage('Нууцлалтай мэдэгдлийн агуулгыг офлайнаар нээхгүй. Холболт сэргэсний дараа дахин баталгаажуулна.')
      return
    }
    navigate(item.target)
  }

  return (
    <div className="page page--narrow notifications-page">
      <PageHeader
        title="Мэдэгдэл"
        description="Хүргэлт, уншсан төлөв, эрхтэй холбоос болон нууцлалын хамгаалалттай мэдэгдлийн хайрцаг."
        actions={<button className="button button--secondary" type="button" onClick={markAllNotificationsRead} disabled={!unreadCount}><CheckCheck size={18} aria-hidden="true" />Бүгдийг уншсан</button>}
      />

      <section className="notification-permission" aria-labelledby="browser-notification-title">
        <span className="notification-permission__icon"><BellRing size={20} aria-hidden="true" /></span>
        <div><h2 id="browser-notification-title">Төхөөрөмжийн мэдэгдэл</h2><p>{permissionState.detail}</p></div>
        <StatusMark tone={permissionState.tone} label={permissionState.label} />
        <button className="button button--secondary" type="button" onClick={() => void requestBrowserPermission()} disabled={permissionBusy || !online || browserPermission === 'granted'}>
          {permissionBusy ? 'Хүсэж байна…' : browserPermission === 'granted' ? 'Идэвхтэй' : 'Зөвшөөрөл тохируулах'}
        </button>
      </section>

      {!online ? <div className="callout callout--warning notification-offline" role="status"><WifiOff size={18} aria-hidden="true" /><p><strong>Офлайн хамгаалалт идэвхтэй.</strong> Шинэ хүргэлт авахгүй; нууцлалтай холбоос нээгдэхгүй; уншсан төлөв зөвхөн одоогийн нэвтрэлтийн хугацаанд хадгалагдана.</p></div> : null}
      {targetMessage ? <div className="callout callout--danger notification-target-message" role="alert"><CircleAlert size={18} aria-hidden="true" /><p>{targetMessage}</p></div> : null}

      <div className="notification-toolbar">
        <div className="notification-tabs" role="tablist" aria-label="Мэдэгдлийн шүүлтүүр">
          <button type="button" role="tab" aria-selected={filter === 'all'} onClick={() => setFilter('all')}>Бүгд <span>{authorizedNotifications.length}</span></button>
          <button type="button" role="tab" aria-selected={filter === 'unread'} onClick={() => setFilter('unread')}>Уншаагүй <span>{unreadCount}</span></button>
        </div>
        <small>Хүргэлт: апп дотор · Зөвшөөрлийг зөвхөн таны үйлдлээр хүснэ</small>
      </div>

      <section className="activity-list notification-list" aria-label="Мэдэгдлийн жагсаалт">
        {visibleNotifications.map((item) => {
          const Icon = iconByKind[item.kind]
          return (
            <button key={item.id} type="button" className="activity-row notification-row" data-unread={!item.readAt || undefined} onClick={() => openNotification(item)}>
              <span className="activity-row__icon" data-tone={item.urgency}><Icon size={19} aria-hidden /></span>
              <span><strong>{item.title}</strong><small>{item.description}</small><em>{item.readAt ? 'Уншсан' : 'Хүргэгдсэн · уншаагүй'}{item.sensitive ? ' · Нууцлалтай' : ''}</em></span>
              <span className="activity-row__time">{formatDeliveredAt(item.deliveredAt)}</span>
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          )
        })}
      </section>
      {visibleNotifications.length === 0 ? <div className="empty-state"><Bell size={28} /><strong>{filter === 'unread' ? 'Уншаагүй мэдэгдэлгүй' : 'Шинэ мэдэгдэлгүй'}</strong><p>Эрхтэй үйл явдал хүргэгдэхэд энд харагдана.</p></div> : null}
      <div className="notification-privacy-note"><ShieldCheck size={18} aria-hidden="true" /><p>Уншсан төлөв одоогийн нэвтрэлтийн хугацаанаас гадагш хадгалагдахгүй. API-аас ирсэн нууц өгөгдөл, мессежийн агуулга болон хувийн мэдээллийг мэдэгдлийн товч хэсэгт оруулахгүй.</p></div>
    </div>
  )
}
