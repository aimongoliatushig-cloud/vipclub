import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle, ArrowLeft, Check, CheckCircle2, ChevronRight,
  Clock3, History, LoaderCircle, RefreshCw, ShieldCheck, Sparkles, Square,
} from 'lucide-react'
import { api, idempotencyKey, type AttendanceCorrectionRequest, type AvailabilityStatus, type WorkdayData } from '../../api'
import './WorkdayFlow.css'

const STATUS_COPY: Record<AvailabilityStatus, { label: string; helper: string; icon: typeof Sparkles }> = {
  Unavailable: { label: 'Боломжгүй', helper: 'Шинэ захиалга авахгүй', icon: Square },
  Available: { label: 'Бэлэн', helper: 'Шинэ захиалга авах боломжтой', icon: Sparkles },
  Scheduled: { label: 'Ээлжтэй', helper: 'Ээлж хуваарьт орсон', icon: Clock3 },
  Reserved: { label: 'Захиалгатай', helper: 'Захиалга үүссэн', icon: Clock3 },
  Working: { label: 'Ажиллаж байна', helper: 'Үйлчилгээ идэвхтэй', icon: Clock3 },
  Break: { label: 'Завсарлагатай', helper: 'Завсарлагыг систем бүртгэсэн', icon: Clock3 },
  Leave: { label: 'Чөлөөтэй', helper: 'Чөлөөтэй өдөр', icon: Clock3 },
}

const TRANSITION_COPY: Record<'Available' | 'Unavailable', string> = {
  Unavailable: 'Боломжгүй болгох',
  Available: 'Бэлэн болох',
}

const timeOnly = (value?: string | null) => {
  if (!value) return '—'
  const time = value.includes(' ') ? value.split(' ')[1] : value
  return time.slice(0, 5)
}

const statusLabel = (value: AttendanceCorrectionRequest['status']) =>
  value === 'Approved' ? 'Зөвшөөрсөн' : value === 'Rejected' ? 'Татгалзсан' : 'Шийдвэр хүлээж байна'

function WorkdayState({ error, onRetry }: { error?: string; onRetry: () => void }) {
  return <section className={`workday-load-state ${error ? 'failed' : ''}`}>
    {error ? <AlertCircle /> : <LoaderCircle className="spin" />}
    <strong>{error ? 'Мэдээлэл ачаалсангүй' : 'Өнөөдрийн ажлыг бэлдэж байна…'}</strong>
    {error ? <button className="workday-secondary" onClick={onRetry}><RefreshCw />Дахин оролдох</button> : null}
  </section>
}

function CorrectionForm({ data, onSaved }: { data: WorkdayData; onSaved: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const kind: AttendanceCorrectionRequest['correction_type'] = 'Check-in'
  const [date, setDate] = useState(data.date)
  const [time, setTime] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const requestKey = useRef({ fingerprint: '', value: '' })
  const valid = time && reason.trim().length >= 5
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!valid || busy) return
    setBusy(true); setError('')
    try {
      const fingerprint = `${date}|${kind}|${time}|${reason.trim()}`
      if (requestKey.current.fingerprint !== fingerprint) {
        requestKey.current = { fingerprint, value: idempotencyKey('attendance-correction') }
      }
      await api.submitAttendanceCorrection(date, kind, time, reason.trim(), requestKey.current.value)
      setReason(''); setTime(''); setOpen(false)
      requestKey.current = { fingerprint: '', value: '' }
      await onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Хүсэлт илгээж чадсангүй')
    } finally { setBusy(false) }
  }
  return <section className="correction-card">
    <button className="correction-toggle" onClick={() => setOpen(value => !value)} aria-expanded={open}>
      <span><History /><i><strong>Ирсэн цаг зөрүүтэй байна уу?</strong><small>Менежерт ирсэн цаг засах хүсэлт илгээх</small></i></span>
      <ChevronRight className={open ? 'rotated' : ''} />
    </button>
    {open ? <form onSubmit={submit} className="correction-form">
      <div className="correction-kind" role="group" aria-label="Засварын төрөл">
        <button type="button" className="active">Ирсэн цаг</button>
      </div>
      <div className="correction-fields">
        <label>Огноо<input type="date" value={date} max={data.date} onChange={event => setDate(event.target.value)} required /></label>
        <label>Засуулах цаг<input type="time" value={time} onChange={event => setTime(event.target.value)} required /></label>
      </div>
      <label>Шалтгаан<textarea value={reason} onChange={event => setReason(event.target.value)} minLength={5} maxLength={300} placeholder="Жишээ: QR уншсан боловч орох цаг бүртгэгдээгүй" required /></label>
      {error ? <div className="workday-inline-error" role="alert"><AlertCircle />{error}</div> : null}
      <button className="workday-primary" disabled={!valid || busy}>{busy ? <LoaderCircle className="spin" /> : <Check />}Хүсэлт илгээх</button>
    </form> : null}
  </section>
}

export function EntertainerWorkdayPage({ branch, onBack, onScanQR }: { branch: string; onBack: () => void; onScanQR: () => void }) {
  const [data, setData] = useState<WorkdayData>()
  const [error, setError] = useState('')
  const [busyStatus, setBusyStatus] = useState<AvailabilityStatus>()
  const [actionError, setActionError] = useState('')
  const transitionKeys = useRef(new Map<string, string>())
  const load = useCallback(async () => {
    setError('')
    try { setData(await api.workday()) }
    catch (err) { setError(err instanceof Error ? err.message : 'Мэдээлэл ачаалсангүй') }
  }, [])
  useEffect(() => { void load() }, [load])
  const transition = async (status: 'Available' | 'Unavailable') => {
    if (busyStatus) return
    const expectedEvent = data?.availability.name || ''
    const expectedVersion = data?.availability.state_version || 0
    const fingerprint = `${status}|${expectedEvent}|${expectedVersion}`
    let requestKey = transitionKeys.current.get(fingerprint)
    if (!requestKey) {
      requestKey = idempotencyKey('availability-transition')
      transitionKeys.current.set(fingerprint, requestKey)
    }
    setBusyStatus(status); setActionError('')
    try {
      await api.transitionAvailability(status, '', expectedEvent, expectedVersion, requestKey)
      transitionKeys.current.delete(fingerprint)
      await load()
    }
    catch (err) { setActionError(err instanceof Error ? err.message : 'Ажлын төлөвийг шинэчилж чадсангүй') }
    finally { setBusyStatus(undefined) }
  }
  const availability = data ? STATUS_COPY[data.availability.status] : STATUS_COPY.Unavailable
  const AvailabilityIcon = availability.icon
  const arrivedAt = data?.attendance.events.find(event => event.log_type === 'IN')?.time
  return <div className="page workday-page">
    <header className="workday-header"><button onClick={onBack}><ArrowLeft />Буцах</button><div><small>{branch} салбар</small><h1>Өнөөдрийн ажил</h1></div></header>
    {!data ? <WorkdayState error={error} onRetry={load} /> : <>
      <section className={`workday-status status-${data.availability.status.toLowerCase().replace(' ', '-')}`}>
        <div className="workday-status-icon"><AvailabilityIcon /></div>
        <div><small>Одоогийн ажлын төлөв</small><h2>{availability.label}</h2><p>{availability.helper}</p></div>
        <span>{timeOnly(data.availability.occurred_at)}</span>
      </section>

      <section className="today-shift-card">
        <header><div><Clock3 /><span><small>Энэ ээлж</small><strong>{data.shift ? `${timeOnly(data.shift.shift?.start_time)}–${timeOnly(data.shift.shift?.end_time)}` : 'Ээлжгүй'}</strong></span></div><i className={data.attendance.checked_in ? 'complete' : ''}>{data.attendance.checked_in ? 'Ирсэн' : 'Ирцгүй'}</i></header>
        {!data.attendance.checked_in ? <button className="workday-primary" onClick={onScanQR} disabled={!data.shift}><span><strong>QR код уншуулж ирсэн цагаа бүртгэх</strong><small>{data.shift ? 'Ирцээ бүртгэсний дараа ажлын төлөвөө сонгоно' : 'Ээлжтэй өдөр идэвхжинэ'}</small></span><ChevronRight /></button> : <div className="availability-actions">
          <small>Дараагийн үйлдэл</small>
          <div>{data.availability.allowed_next.map((status, index) => <button key={status} className={index === 0 ? 'primary-action' : ''} onClick={() => transition(status)} disabled={Boolean(busyStatus)}>{busyStatus === status ? <LoaderCircle className="spin" /> : null}{TRANSITION_COPY[status]}</button>)}</div>
          {!data.availability.allowed_next.length ? <p><CheckCircle2 />Ирсэн цаг бүртгэгдсэн байна.</p> : null}
        </div>}
        {actionError ? <div className="workday-inline-error" role="alert"><AlertCircle />{actionError}</div> : null}
      </section>

      <section className="verified-summary" aria-label="Ажлын хураангуй">
        <article><small>Энэ сард ирц бүртгэсэн өдөр</small><strong>{data.summary.arrival_days}<span> өдөр</span></strong></article>
        <article><small>Өнөөдөр ирсэн цаг</small><strong>{timeOnly(arrivedAt)}</strong></article>
        <article><small>Дууссан үйлчилгээ</small><strong>{data.summary.completed_services}</strong></article>
      </section>

      <CorrectionForm data={data} onSaved={load} />
      <section className="correction-history"><header><div><small>Миний хүсэлтүүд</small><h2>Сүүлийн хүсэлтүүд</h2></div><ShieldCheck /></header>
        {data.correction_requests.length ? data.correction_requests.slice(0, 5).map(row => <article key={row.name}><div><strong>{row.correction_type === 'Check-in' ? 'Орох' : 'Гарах'} цаг · {timeOnly(row.requested_time)}</strong><small>{row.attendance_date} · {row.reason}</small></div><span className={row.status.toLowerCase()}>{statusLabel(row.status)}</span></article>) : <div className="workday-empty"><CheckCircle2 />Ирц засах хүсэлт алга</div>}
      </section>
    </>}
  </div>
}

export function ManagerCorrectionQueue({ branch, onBack, onChanged }: { branch: string; onBack: () => void; onChanged: () => void }) {
  const [rows, setRows] = useState<AttendanceCorrectionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [reviewing, setReviewing] = useState<{ row: AttendanceCorrectionRequest; decision: 'Approved' | 'Rejected' }>()
  const [decisionReason, setDecisionReason] = useState('')
  const decisionKeys = useRef(new Map<string, string>())
  const load = useCallback(async () => {
    setError('')
    try { setRows((await api.managerCorrectionRequests()).requests) }
    catch (err) { setError(err instanceof Error ? err.message : 'Хүсэлтүүд ачаалсангүй') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  const openDecision = (row: AttendanceCorrectionRequest, decision: 'Approved' | 'Rejected') => {
    setReviewing({ row, decision })
    setDecisionReason('')
    setError('')
  }
  const decide = async () => {
    if (!reviewing) return
    const { row, decision } = reviewing
    const reason = decisionReason.trim()
    if (decision === 'Rejected' && reason.length < 3) return
    const fingerprint = `${row.name}|${row.modified}|${decision}|${reason}`
    let requestKey = decisionKeys.current.get(fingerprint)
    if (!requestKey) {
      requestKey = idempotencyKey('attendance-correction-decision')
      decisionKeys.current.set(fingerprint, requestKey)
    }
    setBusy(row.name); setError('')
    try {
      await api.decideAttendanceCorrection(row.name, decision, reason, row.modified, requestKey)
      decisionKeys.current.delete(fingerprint)
      setReviewing(undefined)
      setDecisionReason('')
      await load()
      onChanged()
    }
    catch (err) { setError(err instanceof Error ? err.message : 'Шийдвэр хадгалсангүй') }
    finally { setBusy('') }
  }
  const pending = useMemo(() => rows.filter(row => row.status === 'Pending'), [rows])
  const money = useMemo(() => new Intl.NumberFormat('mn-MN', { maximumFractionDigits: 0 }), [])
  return <div className="page workday-page manager-correction-page">
    <header className="workday-header"><button onClick={onBack}><ArrowLeft />Буцах</button><div><small>{branch} салбар</small><h1>Ирц засах хүсэлт</h1></div></header>
    <section className="manager-correction-intro"><History /><div><strong>{pending.length} хүсэлт шийдвэр хүлээж байна</strong><p>Эх цаг, санал болгосон цаг, ээлж болон зөвхөн холбогдох суутгалыг шалгаад шийдвэрлэнэ.</p></div></section>
    {error ? <div className="workday-inline-error" role="alert"><AlertCircle />{error}</div> : null}
    {loading ? <WorkdayState onRetry={load} /> : <section className="manager-correction-list">{pending.length ? pending.map(row => <article key={row.name}>
      <header><div><strong>{row.display_name || row.entertainer}</strong><small>{row.attendance_date} · {row.correction_type === 'Check-in' ? 'Орох цаг' : 'Гарах цаг'}</small></div><b>{timeOnly(row.proposed_at || row.requested_time)}</b></header>
      <dl className="correction-evidence">
        <div><dt>Ээлж</dt><dd>{row.shift_start && row.shift_end ? `${timeOnly(row.shift_start)}–${timeOnly(row.shift_end)}` : 'Тодорхойгүй'}</dd></div>
        <div><dt>Одоогийн бүртгэл</dt><dd>{row.original_time ? timeOnly(row.original_time) : 'Бүртгэл алга'}</dd></div>
        <div className="proposed"><dt>Санал болгосон</dt><dd>{timeOnly(row.proposed_at || row.requested_time)}</dd></div>
        <div><dt>Холбогдох суутгал</dt><dd>{row.penalties?.length ? `${row.penalties.length} · MNT ${money.format(row.penalties.reduce((sum, item) => sum + item.amount, 0))}` : 'Байхгүй'}</dd></div>
      </dl>
      <p><strong>Ажилтны тайлбар</strong>{row.reason}</p>
      {row.review_blocked_reason ? <div className="correction-review-blocked" role="alert"><AlertCircle />{row.review_blocked_reason}</div> : null}
      {reviewing?.row.name === row.name ? <div className="correction-decision-panel">
        <label>{reviewing.decision === 'Rejected' ? 'Татгалзах шалтгаан' : 'Менежерийн тэмдэглэл (заавал биш)'}
          <textarea value={decisionReason} onChange={event => setDecisionReason(event.target.value)} minLength={reviewing.decision === 'Rejected' ? 3 : undefined} maxLength={300} autoFocus placeholder={reviewing.decision === 'Rejected' ? 'Яагаад татгалзаж байгааг тодорхой бичнэ үү' : 'Нэмэлт тайлбар байвал бичнэ үү'} />
        </label>
        <p>{reviewing.decision === 'Approved' ? 'Эх цаг устахгүй. Зассан цаг шинэ нотолгоо болж хадгалагдана.' : 'Хүсэлт татгалзагдах бөгөөд ирцийн эх нотолгоо өөрчлөгдөхгүй.'}</p>
        <div><button type="button" onClick={() => setReviewing(undefined)} disabled={busy === row.name}>Цуцлах</button><button type="button" className={reviewing.decision === 'Approved' ? 'approve' : 'reject-confirm'} onClick={() => void decide()} disabled={busy === row.name || (reviewing.decision === 'Rejected' && decisionReason.trim().length < 3)}>{busy === row.name ? <LoaderCircle className="spin" /> : <Check />}Шийдвэр батлах</button></div>
      </div> : <footer><button onClick={() => openDecision(row, 'Rejected')} disabled={busy === row.name}>Татгалзах</button><button className="approve" onClick={() => openDecision(row, 'Approved')} disabled={busy === row.name || Boolean(row.review_blocked_reason)}><Check />Зөвшөөрөх</button></footer>}
    </article>) : <div className="workday-empty"><CheckCircle2 />Шийдвэр хүлээж буй хүсэлт алга</div>}</section>}
  </div>
}
