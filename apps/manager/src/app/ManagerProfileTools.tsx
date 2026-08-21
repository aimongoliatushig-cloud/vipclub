import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  HeartHandshake,
  KeyRound,
  LoaderCircle,
  LogOut,
  QrCode,
  Save,
  Settings2,
  UserRound,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ThemeToggle } from '../components/ThemeToggle'
import {
  type FrappeManagementApi,
  type ManagerSettings,
  type MyAttendanceHistory,
  type MyAttendanceHistoryDay,
  type MyAttendanceStatus,
} from '../services/managementApi'
import type { ManagementSession } from '../shared/managementAccess'
import './ManagerProfileTools.css'

export type ManagerProfilePanel = 'attendance' | 'settings' | null

type LocationEvidence = { latitude: number; longitude: number; accuracy: number }
type ScanState = 'idle' | 'camera' | 'location' | 'submitting' | 'success' | 'error'

function formatClock(value?: string | null): string {
  if (!value) return '—'
  const match = String(value).match(/(?:T|\s)(\d{2}:\d{2})/)
  return match?.[1] || String(value).slice(0, 5)
}

function formatWorkDate(value: string): string {
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  const days = ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя']
  return `${parsed.getMonth() + 1}-р сарын ${parsed.getDate()} · ${days[parsed.getDay()]}`
}

function attendanceStatusLabel(day: MyAttendanceHistoryDay): string {
  if (day.status === 'late') return day.late_minutes ? `${day.late_minutes} мин хоцорсон` : 'Хоцорсон'
  if (day.status === 'completed') return 'Бүрэн бүртгэгдсэн'
  return 'Ирсэн'
}

function getCurrentPosition(signal: AbortSignal): Promise<LocationEvidence> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Энэ төхөөрөмж байршил тогтоох боломжгүй байна.'))
      return
    }
    if (signal.aborted) {
      reject(new DOMException('Canceled', 'AbortError'))
      return
    }
    let watchId = -1
    let settled = false
    const cleanup = () => {
      signal.removeEventListener('abort', cancel)
      if (watchId >= 0) navigator.geolocation.clearWatch(watchId)
    }
    const finish = (callback: () => void) => {
      if (settled) return
      settled = true
      cleanup()
      callback()
    }
    const cancel = () => finish(() => reject(new DOMException('Canceled', 'AbortError')))
    signal.addEventListener('abort', cancel, { once: true })
    watchId = navigator.geolocation.watchPosition(
      ({ coords }) => finish(() => resolve({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
      })),
      (error) => finish(() => reject(new Error(
        error.code === 1
          ? 'Байршлын зөвшөөрлийг асаагаад дахин оролдоно уу.'
          : error.code === 3
            ? 'Байршил тогтооход хугацаа хэтэрлээ. GPS-ээ шалгана уу.'
            : 'Байршил тогтоож чадсангүй. Интернет болон GPS-ээ шалгана уу.',
      ))),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  })
}

function scannerError(error: unknown): string {
  const name = error && typeof error === 'object' && 'name' in error ? String(error.name) : ''
  if (name === 'NotAllowedError') return 'Камерын зөвшөөрлийг асаагаад дахин оролдоно уу.'
  if (name === 'NotFoundError') return 'Камер олдсонгүй.'
  if (name === 'NotReadableError') return 'Камерыг өөр апп ашиглаж байна.'
  return 'Камер нээж чадсангүй. Зөвшөөрлөө шалгана уу.'
}

export function ManagerProfileMenuActions({
  onOpen,
}: {
  onOpen: (panel: Exclude<ManagerProfilePanel, null>) => void
}) {
  return (
    <div className="manager-profile-actions">
      <button type="button" onClick={() => onOpen('attendance')}>
        <Clock3 size={17} />
        <span><strong>Миний ирц</strong><small>Ирэх, гарах цагаа бүртгэх</small></span>
      </button>
      <button type="button" onClick={() => onOpen('settings')}>
        <Settings2 size={17} />
        <span><strong>Салбарын тохиргоо</strong><small>Онооны босго, ирцийн цаг</small></span>
      </button>
    </div>
  )
}

export function ManagerProfilePage({
  api,
  session,
  onOpen,
  onOpenClimate,
  onLogout,
}: {
  api: FrappeManagementApi
  session: ManagementSession
  onOpen: (panel: Exclude<ManagerProfilePanel, null>) => void
  onOpenClimate: () => void
  onLogout: () => Promise<void>
}) {
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const [logoutBusy, setLogoutBusy] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  )
  const [notificationNote, setNotificationNote] = useState('')
  const [notificationBusy, setNotificationBusy] = useState(false)

  useEffect(() => {
    const syncPermission = () => setNotificationPermission(
      typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
    )
    window.addEventListener('focus', syncPermission)
    return () => window.removeEventListener('focus', syncPermission)
  }, [])

  const requestNotificationPermission = async () => {
    setNotificationNote('')
    if (typeof Notification === 'undefined') {
      setNotificationPermission('unsupported')
      setNotificationNote('Энэ browser мэдэгдэл дэмжихгүй байна.')
      return
    }
    if (!window.isSecureContext) {
      setNotificationNote('Мэдэгдлийг хамгаалалттай холболтоор асаана.')
      return
    }
    if (Notification.permission === 'denied') {
      setNotificationPermission('denied')
      setNotificationNote('Browser-ийн тохиргооноос мэдэгдлийг зөвшөөрнө үү.')
      return
    }
    if (Notification.permission === 'granted') {
      setNotificationPermission('granted')
      setNotificationNote('Энэ төхөөрөмж дээр мэдэгдэл асаалттай байна.')
      return
    }
    setNotificationBusy(true)
    try {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      setNotificationNote(permission === 'granted' ? 'Мэдэгдэл асаалаа.' : 'Мэдэгдлийг асаагаагүй байна.')
    } catch {
      setNotificationNote('Мэдэгдлийн зөвшөөрөл авах боломжгүй байна.')
    } finally {
      setNotificationBusy(false)
    }
  }

  const notificationStatus = notificationPermission === 'granted'
    ? 'Зөвшөөрсөн'
    : notificationPermission === 'denied'
      ? 'Хориглосон'
      : notificationPermission === 'unsupported'
        ? 'Дэмжихгүй'
        : 'Асаах'

  const resetPassword = () => {
    setPasswordOpen(false)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordError('')
  }

  const submitPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')
    if (!currentPassword) {
      setPasswordError('Одоогийн нууц үгээ оруулна уу.')
      return
    }
    if (
      newPassword.length < 10
      || !Array.from(newPassword).some((character) => /[A-Za-zА-ЯӨҮЁа-яөүё]/.test(character))
      || !Array.from(newPassword).some((character) => /\d/.test(character))
    ) {
      setPasswordError('Шинэ нууц үг 10-аас доошгүй тэмдэгт, үсэг болон тоо агуулна.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Шинэ нууц үг таарахгүй байна.')
      return
    }
    setPasswordBusy(true)
    try {
      await api.changePassword(currentPassword, newPassword)
      resetPassword()
      setPasswordSuccess('Нууц үг шинэчлэгдлээ.')
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Нууц үг солих боломжгүй байна.')
    } finally {
      setPasswordBusy(false)
    }
  }

  const logout = async () => {
    setLogoutBusy(true)
    try {
      await onLogout()
    } finally {
      setLogoutBusy(false)
    }
  }

  return (
    <div className="manager-profile-page">
      <header className="manager-profile-page-heading">
        <span>МИНИЙ МЭДЭЭЛЭЛ</span>
        <h1>Профайл</h1>
      </header>

      <section className="manager-profile-identity" aria-label="Менежерийн мэдээлэл">
        <span className="manager-profile-avatar"><UserRound /></span>
        <div>
          <h2>{session.displayName}</h2>
          <p>{session.branchIds[0] || 'Салбар'} · Салбарын менежер</p>
        </div>
      </section>

      <section className="manager-profile-section" aria-labelledby="manager-work-settings">
        <h2 id="manager-work-settings">Ажил</h2>
        <button type="button" onClick={() => onOpen('attendance')}>
          <Clock3 /><span><strong>Миний ирц</strong><small>Ирц бүртгэх, түүхээ харах</small></span><ChevronRight />
        </button>
        <button type="button" onClick={() => onOpen('settings')}>
          <Settings2 /><span><strong>Салбарын тохиргоо</strong><small>Борлуулалтын босго, ирцийн цаг</small></span><ChevronRight />
        </button>
        <button type="button" onClick={onOpenClimate}>
          <HeartHandshake /><span><strong>Охидын уур амьсгал</strong><small>Санал хүсэлтийг харах</small></span><ChevronRight />
        </button>
      </section>

      <section className="manager-profile-section" aria-labelledby="manager-device-settings">
        <h2 id="manager-device-settings">Тохиргоо</h2>
        <button type="button" onClick={() => void requestNotificationPermission()} disabled={notificationBusy}>
          <Bell /><span><strong>Мэдэгдэл</strong><small>{notificationNote || 'Утас болон энэ төхөөрөмж дээр'}</small></span><b>{notificationBusy ? 'Нээж байна…' : notificationStatus}</b>
        </button>
        <div className="manager-profile-setting-row">
          <span><strong>Харанхуй горим</strong><small>Дэлгэцийн өнгийг солих</small></span>
          <ThemeToggle />
        </div>
        <button
          type="button"
          onClick={() => {
            setPasswordOpen((open) => !open)
            setPasswordError('')
            setPasswordSuccess('')
            setLogoutConfirmOpen(false)
          }}
          aria-expanded={passwordOpen}
          aria-controls="manager-password-form"
        >
          <KeyRound /><span><strong>Нууц үг солих</strong><small>{passwordSuccess || 'Одоогийн нууц үгээр баталгаажуулна'}</small></span><ChevronRight />
        </button>
        {passwordOpen ? (
          <form id="manager-password-form" className="manager-profile-password-form" onSubmit={(event) => void submitPassword(event)}>
            <label><span>Одоогийн нууц үг</span><input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} disabled={passwordBusy} required /></label>
            <label><span>Шинэ нууц үг</span><input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} disabled={passwordBusy} aria-describedby="manager-password-hint" required /></label>
            <small id="manager-password-hint">10-аас доошгүй тэмдэгт, үсэг болон тоо</small>
            <label><span>Шинэ нууц үг давтах</span><input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} disabled={passwordBusy} required /></label>
            {passwordError ? <p className="manager-profile-form-error" role="alert"><AlertTriangle />{passwordError}</p> : null}
            <div className="manager-profile-form-actions"><button type="button" onClick={resetPassword} disabled={passwordBusy}>Болих</button><button type="submit" disabled={passwordBusy}>{passwordBusy ? 'Хадгалж байна…' : 'Хадгалах'}</button></div>
          </form>
        ) : null}
        <button
          className="manager-profile-logout-row"
          type="button"
          onClick={() => {
            setLogoutConfirmOpen((open) => !open)
            setPasswordOpen(false)
            setPasswordError('')
          }}
          aria-expanded={logoutConfirmOpen}
          aria-controls="manager-logout-confirm"
        >
          <LogOut /><span><strong>Системээс гарах</strong><small>Энэ төхөөрөмжийн нэвтрэлтийг хаах</small></span><ChevronRight />
        </button>
        {logoutConfirmOpen ? (
          <div id="manager-logout-confirm" className="manager-profile-logout-confirm">
            <strong>Системээс гарах уу?</strong>
            <div className="manager-profile-form-actions"><button type="button" onClick={() => setLogoutConfirmOpen(false)} disabled={logoutBusy}>Болих</button><button className="danger" type="button" onClick={() => void logout()} disabled={logoutBusy}>{logoutBusy ? 'Гарч байна…' : 'Гарах'}</button></div>
          </div>
        ) : null}
      </section>
    </div>
  )
}

function DialogShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string
  subtitle: string
  onClose: () => void
  children: ReactNode
}) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
      activeElement?.focus()
    }
  }, [])

  return createPortal(
    <div className="manager-tool-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.currentTarget === event.target) onClose()
    }}>
      <section className="manager-tool-dialog" role="dialog" aria-modal="true" aria-labelledby="manager-tool-title">
        <header className="manager-tool-header">
          <button type="button" aria-label="Буцах" onClick={onClose}><ArrowLeft /></button>
          <div><h2 id="manager-tool-title">{title}</h2><p>{subtitle}</p></div>
        </header>
        <div className="manager-tool-body">{children}</div>
      </section>
    </div>,
    document.body,
  )
}

function ManagerAttendancePanel({
  api,
  onClose,
  initialPayload,
  onPayloadHandled,
}: {
  api: FrappeManagementApi
  onClose: () => void
  initialPayload?: string
  onPayloadHandled: () => void
}) {
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void | Promise<void> } | null>(null)
  const operationRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)
  const handledRef = useRef(false)
  const automaticRef = useRef(false)
  const submitRef = useRef<(payload: string) => Promise<void>>(async () => undefined)
  const [status, setStatus] = useState<MyAttendanceStatus | null>(null)
  const [history, setHistory] = useState<MyAttendanceHistory | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [message, setMessage] = useState('')

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current
    scannerRef.current = null
    if (!scanner) return
    try { await scanner.stop() } catch { /* already stopped */ }
    try { await scanner.clear() } catch { /* already cleared */ }
  }, [])

  const cancelOperation = useCallback(() => {
    operationRef.current?.abort()
    operationRef.current = null
    handledRef.current = false
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [nextStatus, nextHistory] = await Promise.all([
        api.getMyAttendanceStatus(),
        api.getMyAttendanceHistory(14),
      ])
      if (!mountedRef.current) return
      setStatus(nextStatus)
      setHistory({ ...nextHistory, days: Array.isArray(nextHistory.days) ? nextHistory.days : [] })
    } catch (error) {
      if (!mountedRef.current) return
      setLoadError(error instanceof Error ? error.message : 'Ирцийн мэдээлэл ачаалж чадсангүй.')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [api])

  useEffect(() => {
    mountedRef.current = true
    void load()
    return () => {
      mountedRef.current = false
      cancelOperation()
      void stopScanner()
    }
  }, [cancelOperation, load, stopScanner])

  const submit = useCallback(async (payload: string) => {
    if (handledRef.current) return
    handledRef.current = true
    const controller = new AbortController()
    operationRef.current = controller
    await stopScanner()
    if (controller.signal.aborted || !mountedRef.current) return
    setScanState('location')
    setMessage('Байршлыг шалгаж байна…')
    try {
      const position = await getCurrentPosition(controller.signal)
      if (controller.signal.aborted || !mountedRef.current) return
      setScanState('submitting')
      setMessage(status?.action === 'OUT' ? 'Гарсан цагийг бүртгэж байна…' : 'Ирсэн цагийг бүртгэж байна…')
      const result = await api.scanAttendanceQr(
        payload,
        position.latitude,
        position.longitude,
        position.accuracy,
        controller.signal,
      )
      if (controller.signal.aborted || !mountedRef.current) return
      if (!result.accepted) {
        setScanState('error')
        setMessage(result.reason || 'Ирц бүртгэгдсэнгүй.')
        return
      }
      setScanState('success')
      setMessage(result.attendance_action === 'OUT' ? 'Гарсан цаг бүртгэгдлээ.' : 'Ирсэн цаг бүртгэгдлээ.')
      await load()
    } catch (error) {
      if (controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError') || !mountedRef.current) return
      setScanState('error')
      setMessage(error instanceof Error ? error.message : 'Ирц бүртгэж чадсангүй.')
    } finally {
      if (operationRef.current === controller) operationRef.current = null
      onPayloadHandled()
    }
  }, [api, load, onPayloadHandled, status?.action, stopScanner])
  submitRef.current = submit

  useEffect(() => {
    if (!initialPayload || automaticRef.current || loading) return
    automaticRef.current = true
    const timer = window.setTimeout(() => void submitRef.current(initialPayload), 100)
    return () => window.clearTimeout(timer)
  }, [initialPayload, loading])

  const startScanner = async () => {
    cancelOperation()
    await stopScanner()
    handledRef.current = false
    setMessage('')
    setScanState('camera')
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      if (!mountedRef.current) return
      const scanner = new Html5Qrcode('manager-attendance-qr-reader', { verbose: false })
      scannerRef.current = scanner
      const size = Math.max(210, Math.min(280, window.innerWidth - 80))
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: size, height: size }, aspectRatio: 1 },
        (decoded) => void submitRef.current(decoded),
        () => undefined,
      )
    } catch (error) {
      await stopScanner()
      if (!mountedRef.current) return
      setScanState('error')
      setMessage(scannerError(error))
    }
  }

  const close = () => {
    cancelOperation()
    void stopScanner()
    onClose()
  }
  const currentTime = status?.checked_out
    ? formatClock(status.checked_out_at)
    : formatClock(status?.checked_in_at || status?.latest_checkin?.time)
  const currentTitle = status?.checked_out
    ? 'Өдрийн ирц бүрэн'
    : status?.checked_in
      ? 'Ирсэн цаг бүртгэгдсэн'
      : 'Өнөөдрийн ирц'
  const actionLabel = status?.action === 'OUT' ? 'Гарсан цаг бүртгэх' : 'Ирсэн цаг бүртгэх'

  return (
    <DialogShell title="Миний ирц" subtitle="Өнөөдөр ба өмнөх бүртгэл" onClose={close}>
      {loading ? <div className="manager-tool-loading"><LoaderCircle className="spin" />Ачаалж байна…</div> : null}
      {!loading && loadError ? <div className="manager-tool-error" role="alert"><XCircle /><span>{loadError}</span><button type="button" onClick={() => void load()}>Дахин оролдох</button></div> : null}
      {!loading && !loadError && status ? (
        <>
          {scanState === 'idle' ? (
            <>
              <section className={`manager-attendance-today ${status.late_minutes ? 'is-late' : status.checked_in ? 'is-present' : ''}`}>
                <span className="manager-attendance-icon">{status.checked_in ? <CheckCircle2 /> : <Clock3 />}</span>
                <div><small>{formatWorkDate(status.work_date)}</small><h3>{currentTitle}</h3><p>{status.checked_in ? currentTime : 'Одоогоор бүртгэгдээгүй'}{status.late_minutes ? ` · ${status.late_minutes} мин хоцорсон` : ''}</p></div>
              </section>
              <button className="manager-tool-primary" type="button" onClick={() => void startScanner()} disabled={status.attendance_complete}>
                {status.attendance_complete ? <CheckCircle2 /> : <QrCode />}
                {status.attendance_complete ? 'Өнөөдрийн ирц бүрэн' : actionLabel}
              </button>
              <section className="manager-attendance-history" aria-labelledby="manager-attendance-history-title">
                <header><CalendarDays /><h3 id="manager-attendance-history-title">Сүүлийн ирц</h3></header>
                {history?.days.slice(0, 5).map((day) => (
                  <div className={day.status === 'late' ? 'is-late' : ''} key={day.work_date}>
                    <span><strong>{formatWorkDate(day.work_date)}</strong><small>{attendanceStatusLabel(day)}</small></span>
                    <time>{formatClock(day.checked_in_at)}{day.checked_out_at ? ` – ${formatClock(day.checked_out_at)}` : ''}</time>
                  </div>
                ))}
                {!history?.days.length ? <p className="manager-tool-empty">Өмнөх бүртгэл алга.</p> : null}
              </section>
            </>
          ) : null}
          {scanState !== 'idle' ? (
            <section className={`manager-attendance-scanner is-${scanState}`} aria-live="polite">
              <div id="manager-attendance-qr-reader" />
              {scanState === 'camera' ? <p>Салбарын QR кодыг хүрээнд тааруулна уу.</p> : null}
              {scanState === 'location' || scanState === 'submitting' ? <div className="manager-scan-message"><LoaderCircle className="spin" /><strong>{message}</strong></div> : null}
              {scanState === 'success' ? <div className="manager-scan-result success"><CheckCircle2 /><strong>{message}</strong><button type="button" onClick={() => setScanState('idle')}>Боллоо</button></div> : null}
              {scanState === 'error' ? <div className="manager-scan-result error"><XCircle /><strong>Бүртгэгдсэнгүй</strong><p>{message}</p><button type="button" onClick={() => void startScanner()}>Дахин оролдох</button></div> : null}
              {scanState === 'camera' ? <button className="manager-tool-secondary" type="button" onClick={() => { cancelOperation(); void stopScanner(); setScanState('idle') }}>Цуцлах</button> : null}
            </section>
          ) : null}
        </>
      ) : null}
    </DialogShell>
  )
}

function ManagerSettingsPanel({
  api,
  branch,
  onClose,
}: {
  api: FrappeManagementApi
  branch?: string
  onClose: () => void
}) {
  const [settings, setSettings] = useState<ManagerSettings | null>(null)
  const [salesMonth, setSalesMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [amount, setAmount] = useState('')
  const [lateTime, setLateTime] = useState('22:00')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.getManagerSettings(branch, salesMonth)
      setSettings(response)
      setAmount(String(Math.round(response.sales.full_score_amount || 0)))
      setLateTime(response.attendance.late_after_time.slice(0, 5))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Тохиргоо ачаалж чадсангүй.')
    } finally {
      setLoading(false)
    }
  }, [api, branch, salesMonth])

  useEffect(() => { void load() }, [load])

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!settings || saving) return
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) {
      setError('Борлуулалтын босгыг зөв оруулна уу.')
      return
    }
    if (reason.trim().length < 3) {
      setError('Өөрчилсөн шалтгаанаа товч бичнэ үү.')
      return
    }
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const response = await api.updateManagerSettings({
        salesFullScoreAmount: value,
        salesMonth,
        lateAfterTime: lateTime,
        reason: reason.trim(),
        expectedModified: settings.modified,
        expectedSalesModified: settings.sales.modified,
        branch,
      })
      setSettings(response)
      setAmount(String(Math.round(response.sales.full_score_amount)))
      setLateTime(response.attendance.late_after_time.slice(0, 5))
      setReason('')
      setSuccess(`${selectedMonthLabel}-ын босго хадгалагдлаа.`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Тохиргоо хадгалж чадсангүй.')
    } finally {
      setSaving(false)
    }
  }
  const weight = settings ? Math.round((settings.sales.weight <= 1 ? settings.sales.weight * 100 : settings.sales.weight)) : 40
  const selectedMonthLabel = (() => {
    const [year, month] = salesMonth.split('-')
    return `${year} оны ${Number(month)}-р сар`
  })()
  const currentMonth = (() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })()

  return (
    <DialogShell title="Салбарын тохиргоо" subtitle={branch || 'Таны салбар'} onClose={onClose}>
      {loading ? <div className="manager-tool-loading"><LoaderCircle className="spin" />Ачаалж байна…</div> : null}
      {!loading && !settings && error ? <div className="manager-tool-error" role="alert"><XCircle /><span>{error}</span><button type="button" onClick={() => void load()}>Дахин оролдох</button></div> : null}
      {!loading && settings ? (
        <form className="manager-settings-form" onSubmit={(event) => void save(event)}>
          <div className="manager-settings-block">
            <header>
              <span className="manager-settings-group-icon"><CalendarDays /></span>
              <div><h3>Сарын борлуулалтын босго</h3><p>{selectedMonthLabel} · зэрэглэлийн {weight} оноо</p></div>
            </header>
            <label>
              <span>Тохируулах сар</span>
              <input type="month" min={currentMonth} value={salesMonth} onChange={(event) => setSalesMonth(event.target.value)} />
            </label>
            <label>
              <span>Өдрийн бүтэн онооны босго</span>
              <div className="manager-input-suffix"><input inputMode="numeric" type="number" min="1" max="1000000000" step="1000" value={amount} onChange={(event) => setAmount(event.target.value)} /><b>₮</b></div>
            </label>
            <p className="manager-settings-hint">
              {settings.sales.source === 'previous_setting'
                ? 'Энэ сард тусдаа босго хадгалаагүй. Өмнөх тохиргоог санал болгож байна.'
                : `Энэ сард бүжигчин нэг өдөр уг дүнд хүрвэл борлуулалтын үзүүлэлтээс ${weight} оноо авна.`}
            </p>
          </div>
          <div className="manager-settings-block">
            <header>
              <span className="manager-settings-group-icon"><Clock3 /></span>
              <div><h3>Ирцийн тохиргоо</h3><p>Сар солигдоход өөрчлөгдөхгүй</p></div>
            </header>
            <label>
              <span>Хоцролт тооцох цаг</span>
              <input type="time" value={lateTime} onChange={(event) => setLateTime(event.target.value)} />
            </label>
          </div>
          <label>
            <span>Өөрчилсөн шалтгаан</span>
            <textarea rows={3} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} placeholder={`Жишээ: ${selectedMonthLabel}-ын төлөвлөгөө шинэчлэгдсэн`} />
          </label>
          {error ? <p className="manager-settings-message error" role="alert">{error}</p> : null}
          {success ? <p className="manager-settings-message success" role="status"><CheckCircle2 />{success}</p> : null}
          <button className="manager-tool-primary" type="submit" disabled={saving}><Save />{saving ? 'Хадгалж байна…' : 'Хадгалах'}</button>
        </form>
      ) : null}
    </DialogShell>
  )
}

export function ManagerProfilePanels({
  api,
  branch,
  panel,
  onClose,
  attendancePayload,
  onAttendancePayloadHandled,
}: {
  api: FrappeManagementApi
  branch?: string
  panel: ManagerProfilePanel
  onClose: () => void
  attendancePayload?: string
  onAttendancePayloadHandled: () => void
}) {
  if (panel === 'attendance') {
    return <ManagerAttendancePanel api={api} onClose={onClose} initialPayload={attendancePayload} onPayloadHandled={onAttendancePayloadHandled} />
  }
  if (panel === 'settings') {
    return <ManagerSettingsPanel api={api} branch={branch} onClose={onClose} />
  }
  return null
}
