import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowLeft, CalendarClock, CalendarDays, Check, CheckCircle2, Clock3, RefreshCw, ShieldCheck, X } from 'lucide-react'
import { api } from '../../api'
import type { EmergencyLeaveRequest, LeavePolicyData } from '../../api'
import './LeavePolicy.css'

const money = (value: number) => `${new Intl.NumberFormat('mn-MN').format(Number(value || 0))}₮`
const DEFAULT_TIMEZONE = 'Asia/Ulaanbaatar'
const DEFAULT_DEADLINE = '21:00'
const todayValue = (timeZone = DEFAULT_TIMEZONE) => new Date().toLocaleDateString('en-CA', { timeZone })
const statusLabel = (status: EmergencyLeaveRequest['status']) => status === 'Pending' ? 'Шийдвэр хүлээж байна' : status === 'Approved' ? 'Зөвшөөрсөн' : status === 'Rejected' ? 'Татгалзсан' : 'Цуцалсан'

type CutoffState = { isOpen: boolean; title: string; detail: string }

const deadlineValue = (value?: string) => {
  const [hours = '21', minutes = '00'] = String(value || DEFAULT_DEADLINE).split(':')
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`
}

const addCalendarDays = (value: string, amount: number) => {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + amount))
  return date.toISOString().slice(0, 10)
}

const displayDate = (value: string) => value.replaceAll('-', '.')
const displayDateTime = (value?: string | null) => {
  if (!value) return ''
  const date = new Date(value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('mn-MN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date)
}

const localDateTime = (at: Date, timeZone: string) => {
  const read = (zone: string) => Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at).filter(part => part.type !== 'literal').map(part => [part.type, part.value]))
  let parts: Record<string, string>
  try { parts = read(timeZone) }
  catch { parts = read(DEFAULT_TIMEZONE) }
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  }
}

const cutoffState = (selectedDate: string, deadline: string, timeZone: string, at: Date): CutoffState => {
  if (!selectedDate) return { isOpen: false, title: 'Ээлжийн өдрөө сонгоно уу', detail: 'Чөлөө авах ээлжийн өдрөө сонгоно уу.' }
  const now = localDateTime(at, timeZone)
  const [hours, minutes] = deadline.split(':').map(Number)
  const deadlineMinutes = (Number.isFinite(hours) ? hours : 21) * 60 + (Number.isFinite(minutes) ? minutes : 0)
  const cutoffDate = addCalendarDays(selectedDate, -1)
  const detail = `${displayDate(selectedDate)}-ны ээлжийн хүсэлтийг ${displayDate(cutoffDate)}-ны ${deadline} хүртэл илгээнэ.`
  if (selectedDate <= now.date) return { isOpen: false, title: 'Өнөөдөр эхлэх ээлжийн хугацаа дууссан', detail }
  if (now.date < cutoffDate || (now.date === cutoffDate && now.minutes <= deadlineMinutes)) {
    return { isOpen: true, title: 'Хүсэлт илгээх боломжтой', detail }
  }
  return { isOpen: false, title: 'Хүсэлтийн хугацаа дууссан', detail }
}

export function EntertainerLeavePage({ onBack }: { onBack: () => void }) {
  const [leaveKind, setLeaveKind] = useState<'hourly' | 'day'>('hourly')
  const [data, setData] = useState<LeavePolicyData>()
  const [date, setDate] = useState(() => addCalendarDays(todayValue(), 1))
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [now, setNow] = useState(Date.now)
  const hourlyTabRef = useRef<HTMLButtonElement>(null)
  const dayTabRef = useRef<HTMLButtonElement>(null)
  const load = async (submittedRequest?: EmergencyLeaveRequest) => {
    setLoading(true); setError('')
    try {
      const next = await api.leavePolicy()
      setData(submittedRequest ? {
        ...next,
        requests: [submittedRequest, ...next.requests.filter(row => row.name !== submittedRequest.name)],
      } : next)
    }
    catch (err) { setError(err instanceof Error ? err.message : 'Чөлөөний мэдээллийг ачаалж чадсангүй.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])
  const timeZone = data?.policy.timezone || DEFAULT_TIMEZONE
  const deadline = deadlineValue(data?.policy.same_day_request_deadline)
  const cutoff = cutoffState(date, deadline, timeZone, new Date(now))
  const selectedRequest = data?.requests.find(row =>
    String(row.leave_date).slice(0, 10) === date
    && (leaveKind === 'day' ? row.source_type === 'Leave Application' : row.source_type !== 'Leave Application'))
  const activeRequest = selectedRequest?.status === 'Pending' || selectedRequest?.status === 'Approved'
  const requestState = selectedRequest?.status === 'Approved'
    ? {
        tone: 'is-approved',
        title: 'Чөлөө зөвшөөрөгдсөн',
        detail: `${displayDate(date)}-ны чөлөөг менежер зөвшөөрсөн. Дахин хүсэлт илгээх шаардлагагүй.`,
      }
    : selectedRequest?.status === 'Pending'
      ? {
          tone: 'is-pending',
          title: 'Шийдвэр хүлээж байна',
          detail: `${displayDate(date)}-ны хүсэлт менежерт хүрсэн. Шийдвэр гармагц төлөв шинэчлэгдэнэ.`,
        }
      : selectedRequest?.status === 'Rejected'
        ? {
            tone: 'is-rejected',
            title: 'Хүсэлтийг татгалзсан',
            detail: selectedRequest.decision_reason || 'Менежер татгалзсан шалтгаан оруулаагүй байна.',
          }
        : selectedRequest?.status === 'Cancelled'
          ? {
              tone: 'is-cancelled',
              title: 'Хүсэлт цуцлагдсан',
              detail: selectedRequest.decision_reason || 'Энэ хүсэлт цуцлагдсан байна.',
            }
      : null
  const remaining = data?.quota.remaining ?? 0
  const chooseLeaveKind = (kind: 'hourly' | 'day') => {
    setLeaveKind(kind)
    setSuccess('')
    setError('')
  }
  const handleLeaveTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const nextKind = event.key === 'ArrowLeft' || event.key === 'Home'
      ? 'hourly'
      : event.key === 'ArrowRight' || event.key === 'End'
        ? 'day'
        : null
    if (!nextKind) return
    event.preventDefault()
    chooseLeaveKind(nextKind)
    const nextTab = nextKind === 'hourly' ? hourlyTabRef : dayTabRef
    nextTab.current?.focus()
  }
  const reasonIsValid = reason.trim().length >= 3
  const canSubmit = Boolean(data && !activeRequest && date && reasonIsValid && !busy && !loading && (
    leaveKind === 'hourly'
      ? remaining > 0 && cutoff.isOpen
      : Boolean(data.day_leave_types?.length)
  ))
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return
    setBusy(true); setError(''); setSuccess('')
    try {
      const result: { request: EmergencyLeaveRequest; quota?: LeavePolicyData['quota'] } = leaveKind === 'hourly'
        ? await api.submitEmergencyLeave(date, reason.trim())
        : await api.submitDayLeave(date, reason.trim())
      setData(current => current ? {
        ...current,
        quota: result.quota ?? current.quota,
        requests: [result.request, ...current.requests.filter(row => row.name !== result.request.name)],
      } : current)
      setReason('')
      setSuccess(`${leaveKind === 'hourly' ? 'Цагийн' : 'Өдрийн'} чөлөөний хүсэлт амжилттай илгээгдлээ.`)
      await load(result.request)
    }
    catch (err) { setError(err instanceof Error ? err.message : 'Чөлөөний хүсэлтийг илгээж чадсангүй.') }
    finally { setBusy(false) }
  }
  return <div className="page leave-page">
    <button className="back-link" onClick={onBack}><ArrowLeft />Буцах</button>
    <header className="leave-title leave-request-title"><div><h1>Чөлөө авах</h1><p>Цагийн эрхийн үлдэгдэл болон бүтэн өдрийн хүсэлтийг тусад нь харуулна.</p></div><CalendarClock /></header>
    <div className="leave-kind-switch" role="tablist" aria-label="Чөлөөний хугацаа">
      <button ref={hourlyTabRef} id="leave-tab-hourly" type="button" role="tab" aria-controls="leave-kind-panel" aria-selected={leaveKind === 'hourly'} tabIndex={leaveKind === 'hourly' ? 0 : -1} className={leaveKind === 'hourly' ? 'active' : ''} onKeyDown={handleLeaveTabKeyDown} onClick={() => chooseLeaveKind('hourly')}><CalendarClock />Цагийн чөлөө</button>
      <button ref={dayTabRef} id="leave-tab-day" type="button" role="tab" aria-controls="leave-kind-panel" aria-selected={leaveKind === 'day'} tabIndex={leaveKind === 'day' ? 0 : -1} className={leaveKind === 'day' ? 'active' : ''} onKeyDown={handleLeaveTabKeyDown} onClick={() => chooseLeaveKind('day')}><CalendarDays />Өдрийн чөлөө</button>
    </div>
    <div id="leave-kind-panel" className="leave-kind-panel" role="tabpanel" aria-labelledby={leaveKind === 'hourly' ? 'leave-tab-hourly' : 'leave-tab-day'}>
      {data ? <section className="leave-overview" aria-label="Чөлөөний эрх ба хүсэлт авах хугацаа">
        {leaveKind === 'hourly'
          ? <article className={remaining > 0 ? 'is-available' : 'is-closed'}><Clock3 /><div><small>Энэ сарын үлдэгдэл</small><strong>{remaining} эрх үлдсэн</strong><span>Сарын нийт {data.policy.emergency_leave_monthly_limit} эрх · {data.quota.used} ашигласан</span></div></article>
          : <article className={data.day_leave_types?.length ? 'is-available' : 'is-closed'}><CalendarDays /><div><small>Өдрийн чөлөө</small><strong>{data.day_leave_types?.length ? 'Хүсэлт илгээх боломжтой' : 'Эрх олдсонгүй'}</strong><span>{data.day_leave_types?.length ? 'Нэг өдрийн хүсэлт' : 'Ажилтны бүртгэлээ шалгуулна уу'}</span></div></article>}
        <article className={requestState?.tone || (leaveKind === 'day' || cutoff.isOpen ? 'is-available' : 'is-closed')}>{selectedRequest?.status === 'Approved' ? <CheckCircle2 /> : selectedRequest?.status === 'Pending' ? <Clock3 /> : selectedRequest ? <AlertTriangle /> : leaveKind === 'day' ? <CalendarDays /> : <CalendarClock />}<div><small>{requestState ? 'Сонгосон өдрийн төлөв' : leaveKind === 'day' ? 'Шийдвэр' : 'Хүсэлт авах хугацаа'}</small><strong>{requestState?.title || (leaveKind === 'day' ? 'Менежер шийдвэрлэнэ' : cutoff.title)}</strong><span id="leave-cutoff-detail">{requestState?.detail || (leaveKind === 'day' ? 'Илгээсний дараа хүсэлтийн төлөв энд харагдана.' : cutoff.detail)}</span></div></article>
      </section> : loading ? <section className="leave-overview leave-overview-loading" aria-label="Чөлөөний мэдээлэл ачаалж байна" aria-busy="true"><span /><span /></section> : null}
      {error ? <div className="leave-page-message leave-page-error" role="alert"><AlertTriangle /><span>{error}</span>{!data ? <button type="button" onClick={() => void load()} disabled={loading}>{loading ? <RefreshCw className="spin" /> : <RefreshCw />}Дахин оролдох</button> : null}</div> : null}
      {success ? <div className="leave-page-message leave-page-success" role="status"><CheckCircle2 /><span>{success}</span></div> : null}
      <form className="leave-request-form leave-request-primary" onSubmit={submit} aria-busy={busy}>
        <label><span>{leaveKind === 'hourly' ? 'Чөлөө авах ээлжийн өдөр' : 'Чөлөө авах өдөр'}</span><input type="date" min={addCalendarDays(todayValue(timeZone), 1)} value={date} onChange={event => { setDate(event.target.value); setSuccess('') }} disabled={busy || !data} required aria-describedby="leave-cutoff-detail" /></label>
        {requestState ? <div className={`leave-selected-request ${requestState.tone}`} role="status">{selectedRequest?.status === 'Approved' ? <CheckCircle2 /> : selectedRequest?.status === 'Pending' ? <Clock3 /> : <AlertTriangle />}<div><strong>{requestState.title}</strong><span>{requestState.detail}</span>{selectedRequest?.decided_at ? <small>Шийдвэрлэсэн: {displayDateTime(selectedRequest.decided_at)}</small> : null}</div></div> : null}
        {!activeRequest ? <>
          <label><span>Шалтгаан</span><textarea value={reason} onChange={event => { setReason(event.target.value); setSuccess('') }} placeholder="Жишээ: Эрүүл мэндийн шалтгаантай" disabled={busy || !data || (leaveKind === 'hourly' ? remaining <= 0 || !cutoff.isOpen : !data.day_leave_types?.length)} required /></label>
          <button className="primary-button leave-submit-button" disabled={!canSubmit}>{busy ? <RefreshCw className="spin" /> : leaveKind === 'day' ? <CalendarDays /> : <CalendarClock />}{busy ? 'Илгээж байна…' : 'Хүсэлт илгээх'}</button>
        </> : null}
      </form>
    </div>
    <section className="leave-history"><h2>Миний хүсэлтүүд</h2>{data?.requests.length ? data.requests.map(row => <article key={`${row.source_type}-${row.name}`}><div><strong>{row.leave_date}</strong><p>{row.reason}</p>{row.decision_reason ? <small className="leave-decision-reason">Шийдвэрийн тайлбар: {row.decision_reason}</small> : null}{row.decided_at ? <small className="leave-decision-time">Шийдвэрлэсэн: {displayDateTime(row.decided_at)}</small> : null}</div><span className={`leave-status ${row.status.toLowerCase()}`}>{statusLabel(row.status)}</span></article>) : <div className="empty-inline">Хүсэлт хараахан бүртгэгдээгүй байна.</div>}</section>
  </div>
}

export function EntertainerLeaveNotifications() {
  const [data, setData] = useState<LeavePolicyData>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = async () => {
    setLoading(true); setError('')
    try { setData(await api.leavePolicy()) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Мэдэгдлийг ачаалж чадсангүй.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])
  const rows = data?.requests ?? []
  if (loading) return <section className="leave-notification-feed" aria-busy="true"><RefreshCw className="spin" /><strong>Мэдэгдлийг ачаалж байна…</strong></section>
  if (error) return <section className="leave-notification-feed is-error" role="alert"><AlertTriangle /><strong>{error}</strong><button type="button" onClick={() => void load()}><RefreshCw />Дахин оролдох</button></section>
  if (!rows.length) return <section className="leave-notification-feed"><CheckCircle2 /><strong>Чөлөөний хүсэлт хараахан алга</strong><p>Хүсэлт илгээж, шийдвэр гарсны дараа төлөв энд харагдана.</p></section>
  return <section className="leave-notification-list" aria-label="Чөлөөний хүсэлтийн мэдэгдэл"><header><div><span>Миний хүсэлтүүд</span><h2>Шийдвэр ба төлөв</h2></div><button type="button" onClick={() => void load()} aria-label="Мэдэгдэл шинэчлэх"><RefreshCw /></button></header>{rows.map(row => <article key={row.name} className={`is-${row.status.toLowerCase()}`}><span className="leave-notification-icon">{row.status === 'Approved' ? <CheckCircle2 /> : row.status === 'Pending' ? <Clock3 /> : <AlertTriangle />}</span><div><strong>{displayDate(row.leave_date)} · {statusLabel(row.status)}</strong><p>{row.decision_reason || (row.status === 'Pending' ? 'Менежерийн шийдвэрийг хүлээж байна.' : row.reason)}</p>{row.decided_at ? <small>{displayDateTime(row.decided_at)}</small> : null}</div></article>)}</section>
}

export function ManagerLeaveQueue({ onBack, onChanged }: { onBack: () => void; onChanged: () => Promise<void> | void }) {
  const [rows, setRows] = useState<EmergencyLeaveRequest[]>([])
  const [policy, setPolicy] = useState<{ absence_deduction: number; late_deduction_per_minute: number; emergency_leave_monthly_limit?: number; hourly_leave_arrival_deadline?: string }>()
  const [rejecting, setRejecting] = useState<string>()
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const load = () => api.managerLeaveRequests().then(data => { setRows(data.requests); setPolicy(data.policy) }).catch(err => setError(err instanceof Error ? err.message : 'Хүсэлт ачаалсангүй'))
  useEffect(() => { void load() }, [])
  const decide = async (row: EmergencyLeaveRequest, decision: 'Approved' | 'Rejected') => {
    setBusy(row.name); setError('')
    try { await api.decideManagerLeave(row.name, row.source_type, decision, decision === 'Rejected' ? reason : '', row.modified); setRejecting(undefined); setReason(''); await Promise.all([load(), onChanged()]) }
    catch (err) { setError(err instanceof Error ? err.message : 'Шийдвэр хадгалсангүй') }
    finally { setBusy('') }
  }
  return <div className="page leave-page manager-leave-page">
    <button className="back-link" onClick={onBack}><ArrowLeft />Буцах</button>
    <header className="leave-title"><div><h1>Чөлөөний хүсэлтүүд</h1><p>Цагийн чөлөө болон бусад ажилтны төлөвлөсөн чөлөөг шийдвэрлэнэ.</p></div><ShieldCheck /></header>
    {policy ? <div className="policy-note"><strong>Цагийн чөлөөний нөхцөл</strong><span>Сард {policy.emergency_leave_monthly_limit ?? 3} удаа · {deadlineValue(policy.hourly_leave_arrival_deadline || '00:00:00')} хүртэл · хэтэрвэл тогтмол торгууль {money(policy.absence_deduction)}, ирц хүчинтэй</span></div> : null}
    {error ? <div className="qr-error"><AlertTriangle />{error}</div> : null}
    <section className="manager-leave-list">{rows.length ? rows.map(row => <article key={row.name}>
      <header><div><strong>{row.display_name || row.entertainer || row.employee}</strong><span>{row.leave_date}{row.to_date && row.to_date !== row.leave_date ? ` — ${row.to_date}` : ''} · {row.branch}</span></div><span className="leave-status pending">Шийдвэр хүлээж байна</span></header>
      <p><strong>{row.source_type === 'Leave Application' ? row.leave_type || 'Ажилтны чөлөө' : 'Цагийн чөлөө'}</strong><br />{row.reason}</p>
      {rejecting === row.name ? <div className="reject-box"><textarea value={reason} onChange={event => setReason(event.target.value)} placeholder="Татгалзсан шалтгаан" autoFocus /><div><button onClick={() => { setRejecting(undefined); setReason('') }}>Цуцлах</button><button className="danger-action" disabled={!reason.trim() || busy === row.name} onClick={() => void decide(row, 'Rejected')}><X />Татгалзах</button></div></div> : <div className="decision-actions"><button onClick={() => setRejecting(row.name)}><X />Татгалзах</button><button className="approve-action" disabled={busy === row.name} onClick={() => void decide(row, 'Approved')}>{busy === row.name ? <RefreshCw className="spin" /> : <Check />}Зөвшөөрөх</button></div>}
    </article>) : <div className="empty-state"><ShieldCheck /><strong>Шийдвэр хүлээж буй хүсэлт алга</strong><p>Шинэ хүсэлт ирэхэд энд харагдана.</p></div>}</section>
  </div>
}
