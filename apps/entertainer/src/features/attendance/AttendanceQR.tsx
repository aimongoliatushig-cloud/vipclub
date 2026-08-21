import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, History, QrCode, RefreshCw, ShieldCheck, WifiOff, XCircle } from 'lucide-react'
import { api } from '../../api'
import type { AttendanceScanResult, EmployeeAttendanceHistory, EmployeeAttendanceHistoryDay, EmployeeAttendanceStatus, WorkforceWorkspace } from '../../api'
import { getAttendanceScanAvailability } from './attendanceAvailability'
import type { AttendanceScanAvailability } from './attendanceAvailability'

type PositionEvidence = { latitude: number; longitude: number; accuracy: number }
type ScannerState = 'landing' | 'camera' | 'location' | 'submitting' | 'done' | 'error'

function formatWorkDate(value: string): string {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  const weekdays = ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя']
  return `${date.getMonth() + 1}-р сарын ${date.getDate()} · ${weekdays[date.getDay()]}`
}

function formatClock(value?: string | null): string {
  if (!value) return '—'
  const match = value.match(/(?:T|\s)(\d{2}:\d{2})/)
  return match?.[1] || value.slice(0, 5)
}

function historyStatus(day: EmployeeAttendanceHistoryDay, arrivalOnly: boolean): string {
  if (day.status === 'late') return day.late_minutes ? `${day.late_minutes} мин хоцорсон` : 'Хоцорсон'
  if (day.status === 'completed' && !arrivalOnly) return 'Ээлж дууссан'
  return 'Ирсэн'
}

function operationalWorkDate(value: string): string | null {
  const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T|\s)(\d{2})/)
  const moment = parts
    ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]), Number(parts[4]))
    : new Date(value)
  if (Number.isNaN(moment.getTime())) return null
  if (moment.getHours() < 12) moment.setDate(moment.getDate() - 1)
  const year = moment.getFullYear()
  const month = String(moment.getMonth() + 1).padStart(2, '0')
  const day = String(moment.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function historyFromWorkspace(workspace: WorkforceWorkspace, limit = 14): EmployeeAttendanceHistory {
  const lateByDate = new Map<string, number>()
  ;(workspace.penalties || []).forEach(penalty => {
    if (penalty.penalty_type !== 'Late' || !penalty.attendance_date) return
    lateByDate.set(String(penalty.attendance_date).slice(0, 10), Number(penalty.late_minutes || 0))
  })
  const arrivals = new Map<string, WorkforceWorkspace['attendance'][number]>()
  ;(workspace.attendance || []).forEach(event => {
    if (event.log_type !== 'IN') return
    const workDate = operationalWorkDate(event.time)
    if (!workDate || arrivals.has(workDate)) return
    arrivals.set(workDate, event)
  })
  const days: EmployeeAttendanceHistoryDay[] = [...arrivals.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .slice(0, limit)
    .map(([workDate, event]) => {
      const lateMinutes = lateByDate.get(workDate) || 0
      return {
        work_date: workDate,
        status: lateMinutes > 0 ? 'late' : 'arrived',
        checked_in_at: event.time,
        checked_out_at: null,
        late_minutes: lateMinutes,
        shift: event.shift || null,
      }
    })
  return {
    employee: workspace.profile.employee,
    branch: workspace.profile.branch,
    days,
  }
}

function currentPosition(signal: AbortSignal): Promise<PositionEvidence> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Энэ төхөөрөмж байршил тодорхойлох боломжгүй байна.')); return }
    if (signal.aborted) { reject(new DOMException('Canceled', 'AbortError')); return }
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
      ({ coords }) => finish(() => resolve({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy })),
      (error) => finish(() => reject(new Error(error.code === 1
        ? 'Байршлын зөвшөөрөл хаалттай байна. Энэ сайтын тохиргооноос “Байршил”-ыг зөвшөөрөөд дахин оролдоно уу.'
        : error.code === 3
          ? 'Байршил тогтооход хугацаа хэтэрлээ. Байршлын үйлчилгээгээ (GPS) асаагаад, задгай хэсэгт дахин оролдоно уу.'
          : 'Байршил тогтоож чадсангүй. Байршлын үйлчилгээ болон интернет холболтоо шалгаад дахин оролдоно уу.'))),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  })
}

function cameraErrorMessage(error: unknown): string {
  const name = error && typeof error === 'object' && 'name' in error ? String(error.name) : ''
  if (name === 'NotAllowedError') return 'Камерын зөвшөөрөл хаалттай байна. Энэ сайтын тохиргооноос “Камер”-ыг зөвшөөрөөд дахин оролдоно уу.'
  if (name === 'NotFoundError') return 'Арын камер олдсонгүй. Камертай өөр төхөөрөмжөөр дахин оролдоно уу.'
  if (name === 'NotReadableError') return 'Камерыг өөр апп ашиглаж байна. Тэр аппыг хаагаад дахин оролдоно уу.'
  return 'Камер нээж чадсангүй. Камерын зөвшөөрөл болон интернетээ шалгаад дахин оролдоно уу.'
}

export function EmployeeQRScanner({ attendance, availability, onBack, onSuccess, initialPayload }: { attendance?: EmployeeAttendanceStatus; availability?: AttendanceScanAvailability; onBack: () => void; onSuccess: () => Promise<void> | void; initialPayload?: string }) {
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void | Promise<void> } | null>(null)
  const operationRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)
  const handledRef = useRef(false)
  const automaticStartRef = useRef(false)
  const submitRef = useRef<(payload: string) => Promise<void>>(async () => undefined)
  const [state, setState] = useState<ScannerState>('landing')
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<AttendanceScanResult>()
  const [online, setOnline] = useState(navigator.onLine)
  const [history, setHistory] = useState<EmployeeAttendanceHistory>()
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState(false)
  const [showAllHistory, setShowAllHistory] = useState(false)
  const scanAvailability = availability || getAttendanceScanAvailability(attendance)

  const stop = async () => {
    const scanner = scannerRef.current
    scannerRef.current = null
    if (!scanner) return
    try { await scanner.stop() } catch { /* already stopped */ }
    try { await scanner.clear() } catch { /* already cleared */ }
  }

  const cancelActiveOperation = () => {
    operationRef.current?.abort()
    operationRef.current = null
    handledRef.current = false
  }

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    mountedRef.current = true
    const resetInterruptedScanner = () => {
      cancelActiveOperation()
      setState(current => ['camera', 'location', 'submitting'].includes(current) ? 'landing' : current)
      void stop()
    }
    const handleOffline = () => { setOnline(false); resetInterruptedScanner() }
    const handleVisibility = () => { if (document.hidden) resetInterruptedScanner() }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      mountedRef.current = false
      cancelActiveOperation()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      document.removeEventListener('visibilitychange', handleVisibility)
      void stop()
    }
  }, [])

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    setHistoryError(false)
    try {
      const response = await api.myAttendanceHistory(14)
      setHistory({ ...response, days: Array.isArray(response.days) ? response.days : [] })
    } catch {
      try {
        // Older production backends do not expose the dedicated history method.
        // The workspace endpoint still contains the signed-in dancer's real check-ins.
        const workspaceHistory = historyFromWorkspace(await api.entertainerWorkspace(), 14)
        if (attendance?.checked_in && attendance.work_date && !workspaceHistory.days.some(day => day.work_date === attendance.work_date)) {
          workspaceHistory.days.unshift({
            work_date: attendance.work_date,
            status: attendance.late_minutes ? 'late' : 'arrived',
            checked_in_at: attendance.checked_in_at || attendance.latest_checkin?.time || null,
            checked_out_at: null,
            late_minutes: attendance.late_minutes || 0,
            shift: attendance.shift?.shift_type || attendance.latest_checkin?.shift || null,
          })
          workspaceHistory.days = workspaceHistory.days.slice(0, 14)
        }
        setHistory(workspaceHistory)
      } catch {
        const currentDay: EmployeeAttendanceHistoryDay[] = attendance?.checked_in && attendance.work_date
          ? [{
              work_date: attendance.work_date,
              status: attendance.late_minutes ? 'late' : 'arrived',
              checked_in_at: attendance.checked_in_at || attendance.latest_checkin?.time || null,
              checked_out_at: null,
              late_minutes: attendance.late_minutes || 0,
              shift: attendance.shift?.shift_type || attendance.latest_checkin?.shift || null,
            }]
          : []
        setHistory({
          employee: attendance?.employee || '',
          branch: attendance?.branch || '',
          days: currentDay,
        })
        setHistoryError(currentDay.length === 0)
      }
    } finally {
      setHistoryLoading(false)
    }
  }, [attendance])

  useEffect(() => { void loadHistory() }, [loadHistory])

  const submit = async (payload: string) => {
    if (handledRef.current) return
    if (!scanAvailability.available) { setState('landing'); setMessage(scanAvailability.detail); return }
    if (!navigator.onLine) { setState('error'); setMessage('Интернет холболтгүй байна. Сүлжээ орсны дараа дахин оролдоно уу.'); return }
    handledRef.current = true
    const controller = operationRef.current && !operationRef.current.signal.aborted
      ? operationRef.current
      : new AbortController()
    operationRef.current = controller
    await stop()
    if (controller.signal.aborted || !mountedRef.current) return
    setState('location'); setMessage('Таны байршлыг шалгаж байна…')
    try {
      const position = await currentPosition(controller.signal)
      if (controller.signal.aborted || !mountedRef.current) return
      setState('submitting'); setMessage('Ирсэн цагийг бүртгэж байна…')
      const response = await api.scanBranchQR(payload, position.latitude, position.longitude, position.accuracy, 'IN', controller.signal)
      if (controller.signal.aborted || !mountedRef.current) return
      setResult(response)
      if (!response.accepted) { setState('error'); setMessage(response.reason || 'Ирц бүртгэгдсэнгүй'); return }
      setState('done'); setMessage(response.already_recorded
        ? 'Энэ ээлжийн ирсэн цаг өмнө нь бүртгэгдсэн байна.'
        : `${response.branch} салбарт ирсэн цаг бүртгэгдлээ. Дахин QR уншуулах шаардлагагүй.`)
      await onSuccess()
      if (controller.signal.aborted || !mountedRef.current) return
      await loadHistory()
    } catch (err) {
      if (controller.signal.aborted || (err instanceof DOMException && err.name === 'AbortError') || !mountedRef.current) return
      setState('error'); setMessage(err instanceof Error ? err.message : 'Ирц бүртгэх боломжгүй байна')
    } finally {
      if (operationRef.current === controller) operationRef.current = null
    }
  }
  submitRef.current = submit

  useEffect(() => {
    if (!initialPayload || automaticStartRef.current || !scanAvailability.available) return
    automaticStartRef.current = true
    const timer = window.setTimeout(() => { void submitRef.current(initialPayload) }, 120)
    return () => window.clearTimeout(timer)
  }, [initialPayload, scanAvailability.available])

  const start = async () => {
    if (!scanAvailability.available) { setState('landing'); setMessage(scanAvailability.detail); return }
    if (!navigator.onLine) { setState('error'); setMessage('Интернет холболтгүй байна. Сүлжээ орсны дараа дахин оролдоно уу.'); return }
    cancelActiveOperation()
    await stop()
    const controller = new AbortController()
    operationRef.current = controller
    handledRef.current = false; setResult(undefined); setMessage(''); setState('camera')
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      if (controller.signal.aborted || !mountedRef.current) return
      const scanner = new Html5Qrcode('branch-qr-reader', { verbose: false })
      scannerRef.current = scanner
      const box = Math.max(200, Math.min(280, window.innerWidth - 80))
      await scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: box, height: box }, aspectRatio: 1 }, decoded => { void submit(decoded) }, () => undefined)
      if (controller.signal.aborted || !mountedRef.current) await stop()
    } catch (error) {
      await stop()
      if (controller.signal.aborted || !mountedRef.current) return
      setState('error'); setMessage(cameraErrorMessage(error))
    }
  }
  const returnToLanding = async () => {
    cancelActiveOperation()
    await stop()
    setResult(undefined)
    setMessage('')
    setState('landing')
  }
  const visibleHistory = history?.days.slice(0, showAllHistory ? history.days.length : 3) || []
  const todayTime = attendance?.checked_in
      ? `Ирсэн ${formatClock(attendance.checked_in_at || attendance.latest_checkin?.time)}`
      : 'Одоогоор бүртгэгдээгүй'
  const todayTitle = attendance?.checked_in
      ? 'Ирсэн цаг бүртгэгдсэн'
      : 'Өнөөдрийн ирц'

  return <div className="page qr-page scanner-page qr-flow-minimal">
    <header className="qr-compact-header">
      <button className="qr-close-button" aria-label={state === 'landing' ? 'Нүүр рүү буцах' : 'Ирц рүү буцах'} onClick={async () => { cancelActiveOperation(); if (state === 'landing') { await stop(); onBack() } else await returnToLanding() }}><ArrowLeft /></button>
      <div><h1>{state === 'landing' ? 'Ирц' : 'Ирсэн цагаа бүртгэх'}</h1><p>{state === 'landing' ? 'Өнөөдөр ба өмнөх бүртгэл' : 'QR кодыг хүрээнд тааруулна уу'}</p></div>
    </header>
    {!online ? <div className="offline-banner" role="status"><WifiOff /><div><strong>Интернет холболтгүй байна</strong><span>Сүлжээ ормогц дахин оролдоно уу.</span></div></div> : null}
    {state === 'landing' ? <div className="attendance-landing">
      <section className={`attendance-today ${attendance?.late_minutes ? 'is-late' : attendance?.checked_in ? 'is-checked' : ''}`} aria-labelledby="attendance-today-title">
        <div className="attendance-today-icon">{attendance?.checked_in ? <CheckCircle2 /> : <Clock3 />}</div>
        <div>
          <span>{attendance?.work_date ? formatWorkDate(attendance.work_date) : 'Өнөөдөр'}</span>
          <h2 id="attendance-today-title">{todayTitle}</h2>
          <p>{todayTime}{attendance?.late_minutes ? ` · ${attendance.late_minutes} мин хоцорсон` : ''}</p>
        </div>
      </section>
      <button className="primary-button attendance-scan-button" disabled={!online || !scanAvailability.available} onClick={start}><QrCode />{scanAvailability.label}</button>
      {!scanAvailability.available ? <p className="attendance-scan-state" role="status">{scanAvailability.detail}</p> : null}

      <section className="attendance-history" aria-labelledby="attendance-history-title">
        <header>
          <div><History /><h2 id="attendance-history-title">Сүүлийн ирц</h2></div>
          {history && history.days.length > 3 ? <button type="button" onClick={() => setShowAllHistory(current => !current)}>{showAllHistory ? 'Хураах' : 'Бүгдийг харах'}</button> : null}
        </header>
        {historyLoading ? <div className="attendance-history-loading" role="status"><RefreshCw className="spin" />Ачаалж байна…</div> : null}
        {!historyLoading && historyError ? <div className="attendance-history-error" role="status"><span>Түүхийг ачаалж чадсангүй.</span><button type="button" onClick={() => void loadHistory()}>Дахин оролдох</button></div> : null}
        {!historyLoading && !historyError && visibleHistory.length === 0 ? <div className="attendance-history-empty"><CalendarDays /><span>Өмнөх ирцийн бүртгэл алга.</span></div> : null}
        {!historyLoading && !historyError ? <div className="attendance-history-list">
          {visibleHistory.map(day => {
            return <article key={day.work_date} className={day.status === 'late' ? 'is-late' : ''}>
              <div className="attendance-history-row">
                <span className="attendance-history-status">{day.status === 'late' ? <Clock3 /> : <CheckCircle2 />}</span>
                <span><strong>{formatWorkDate(day.work_date)}</strong><small>{historyStatus(day, true)}</small></span>
                <time>{formatClock(day.checked_in_at)}</time>
              </div>
            </article>
          })}
        </div> : null}
      </section>
    </div> : <>
      <section className={`scanner-panel ${state}`} aria-live="polite">
        <div id="branch-qr-reader" className="qr-reader" />
        {['location','submitting'].includes(state) ? <div className="scanner-progress"><RefreshCw className="spin" /><strong>{message}</strong></div> : null}
        {state === 'done' ? <div className="scanner-result success"><CheckCircle2 /><strong>Ирсэн цаг бүртгэгдлээ</strong><p>{message}</p>{result?.distance_meters !== undefined ? <small>Салбарын цэгээс {result.distance_meters} метр</small> : null}<button className="primary-button" onClick={initialPayload ? onBack : () => void returnToLanding()}>{initialPayload ? 'Боллоо' : 'Ирц рүү буцах'}</button></div> : null}
        {state === 'error' ? <div className="scanner-result failed"><XCircle /><strong>Ирц бүртгэгдсэнгүй</strong><p>{message}</p><button className="outline-button" disabled={!online} onClick={() => void start()}><RefreshCw />Дахин оролдох</button></div> : null}
      </section>
      <p className="qr-privacy-note"><ShieldCheck /> QR болон байршлыг зөвхөн ирц бүртгэхэд ашиглана.</p>
    </>}
  </div>
}

export const EntertainerQRScanner = EmployeeQRScanner
