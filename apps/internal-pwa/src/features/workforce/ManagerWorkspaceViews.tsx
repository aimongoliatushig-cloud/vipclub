import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CalendarOff,
  CalendarClock,
  Check,
  CircleGauge,
  Clock3,
  FileCheck2,
  LockKeyhole,
  ReceiptText,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type {
  AttendanceDecisionAction,
  AttendanceException,
  LeaveRequest,
  ManagerDashboardSummary,
  OperationalStatus,
  PenaltyReview,
  ReadinessRow,
  TeamMember,
  WeeklyRoster,
  WorkforceRole,
} from './models'
import {
  attendanceDecisionLabels,
  attendanceExceptionLabels,
  attendanceStatusLabels,
  entertainerRankLabels,
  formatDate,
  formatDateTime,
  formatTime,
  operationalStatusLabels,
  leaveRequestStatusLabels,
  leaveRequestTypeLabels,
  penaltyReviewStateLabels,
  roleLabels,
  shiftLabels,
} from './localization'
import { weekDates } from './workforceService'

export type ManagerView = 'overview' | 'schedule' | 'coverage' | 'attendance' | 'team' | 'customers' | 'rankings'

function statusLabel(status: OperationalStatus): string {
  return operationalStatusLabels[status]
}

function exceptionLabel(type: AttendanceException['type']): string {
  return attendanceExceptionLabels[type]
}

function Notice({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return message ? <div className="status-message manager-view-notice" role="status"><Check size={18} /><span>{message}</span><button type="button" aria-label="Мэдэгдлийг хаах" onClick={onDismiss}><X size={17} /></button></div> : null
}

interface OverviewProps {
  roster: WeeklyRoster
  dashboard: ManagerDashboardSummary
  readiness: ReadinessRow[]
  openAttendance: number
  openResponses: number
  openGaps: number
  message: string
  onDismissMessage: () => void
  onNavigate: (view: ManagerView) => void
}

export function ManagerOverviewView({ roster, dashboard, readiness, openAttendance, openResponses, openGaps, message, onDismissMessage, onNavigate }: OverviewProps) {
  const today = weekDates(roster.weekStart).find((date) => date === new Date().toISOString().slice(0, 10)) ?? roster.weekStart
  const todayRows = readiness.filter((item) => item.date === today)
  const required = todayRows.reduce((sum, item) => sum + item.required, 0)
  const scheduled = todayRows.reduce((sum, item) => sum + item.scheduled, 0)
  const checkedIn = todayRows.reduce((sum, item) => sum + item.checkedIn, 0)
  const readinessGap = todayRows.reduce((sum, item) => sum + item.readinessGap, 0)
  const statusMetrics: Array<[string, number, string]> = [
    ['Ээлж дээр', dashboard.onShift, 'active'],
    ['Боломжтой', dashboard.available, 'healthy'],
    ['Захиалгатай', dashboard.reserved, 'neutral'],
    ['Үйлчилж байна', dashboard.serving, 'healthy'],
    ['Завсарлагатай', dashboard.break, 'neutral'],
    ['Хоцорсон', dashboard.late, 'warning'],
    ['Ирээгүй', dashboard.absent, 'danger'],
    ['Чөлөөтэй', dashboard.leave, 'neutral'],
  ]

  return <>
    <section className="page-heading manager-view-heading">
      <div><span className="eyebrow">Салбарын үйл ажиллагаа</span><h1>Менежерийн тойм</h1><p>Багийн бодит цагийн төлөв, хүний нөөцийн эрсдэл, шийдвэрлэх ажлыг нэг дор харуулна.</p></div>
      <div className="freshness"><Clock3 size={15} /><span>Мэдээлэл шинэчилсэн</span><strong>{formatTime(dashboard.dataFreshAt)}</strong></div>
    </section>
    <Notice message={message} onDismiss={onDismissMessage} />

    <section className="operations-metrics" aria-label="Салбарын ажиллах хүчний одоогийн төлөв">
      {statusMetrics.map(([label, value, tone]) => <article key={label} data-tone={tone}><span>{label}</span><strong>{value}</strong></article>)}
    </section>

    <div className="manager-overview-grid">
      <section className="workspace-panel readiness-summary">
        <header className="card-header"><div><span className="eyebrow">Өнөөдөр</span><h2>{formatDate(today, { weekday: 'long', month: 'long', day: 'numeric' })}</h2><p>Төлөвлөлт болон ирцийг тусдаа баримтаар харуулна.</p></div><CircleGauge size={22} /></header>
        <div className="readiness-chain">
          <article><span>Шаардлагатай</span><strong>{required}</strong><small>Хүний нөөцийн доод хэмжээ</small></article>
          <ArrowRight size={18} />
          <article><span>Хуваарилсан</span><strong>{scheduled}</strong><small>{openGaps ? `Долоо хоногт ${openGaps} дутуу` : 'Төлөвлөгөө бүрэн'}</small></article>
          <ArrowRight size={18} />
          <article><span>Ирсэн</span><strong>{roster.status === 'published' ? checkedIn : '—'}</strong><small>{roster.status === 'published' ? `${readinessGap} бэлэн байдлын дутагдал` : 'Идэвхжүүлэхийн тулд нийтэлнэ үү'}</small></article>
        </div>
        <button className="button button--secondary" type="button" onClick={() => onNavigate('coverage')}>Хангалт ба бэлэн байдлыг нээх<ArrowRight size={16} /></button>
      </section>

      <section className="workspace-panel manager-queue-summary">
        <header className="card-header"><div><span className="eyebrow">Шийдвэрлэх ажлууд</span><h2>Менежерийн хяналт</h2><p>Хянаж шийдвэрлэх шаардлагатай үйл ажиллагааны баримтууд.</p></div><FileCheck2 size={22} /></header>
        <button type="button" onClick={() => onNavigate('attendance')}><span><AlertTriangle size={17} /><strong>Ирцийн зөрчлүүд</strong></span><b>{openAttendance}</b></button>
        <button type="button" onClick={() => onNavigate('schedule')}><span><CalendarClock size={17} /><strong>Ээлжийн хариунууд</strong></span><b>{openResponses}</b></button>
        <button type="button" onClick={() => onNavigate('coverage')}><span><CircleGauge size={17} /><strong>Хангалтын дутагдал</strong></span><b>{openGaps}</b></button>
      </section>
    </div>

    <section className="scope-guardrail"><ShieldCheck size={19} /><div><strong>{roster.branchName} · зөвшөөрөгдсөн хүрээ</strong><span>Энэ ажлын хэсэгт зөвхөн ажиллах хүчний үйл ажиллагааны мэдээлэл харагдана. Хүний нөөцийн нууц, хэрэглэгчийн хязгаарлалтгүй болон төлбөрийн мэдээлэл менежерт харагдахгүй.</span></div></section>
  </>
}

interface CoverageProps {
  roster: WeeklyRoster
  readiness: ReadinessRow[]
  message: string
  onDismissMessage: () => void
  onNavigate: (view: ManagerView) => void
}

export function CoverageReadinessView({ roster, readiness, message, onDismissMessage, onNavigate }: CoverageProps) {
  const dates = weekDates(roster.weekStart)
  const [selectedDate, setSelectedDate] = useState(dates.find((date) => date === new Date().toISOString().slice(0, 10)) ?? dates[0])
  const rows = readiness.filter((item) => item.date === selectedDate)
  const totals = rows.reduce((sum, row) => ({
    required: sum.required + row.required,
    scheduled: sum.scheduled + row.scheduled,
    checkedIn: sum.checkedIn + row.checkedIn,
    planningGap: sum.planningGap + row.gap,
    readinessGap: sum.readinessGap + row.readinessGap,
  }), { required: 0, scheduled: 0, checkedIn: 0, planningGap: 0, readinessGap: 0 })

  return <>
    <section className="page-heading manager-view-heading">
      <div><span className="eyebrow">Шаардлагатай → Хуваарилсан → Ирсэн</span><h1>Хангалт ба бэлэн байдал</h1><p>Төлөвлөлтийн дутагдал болон бодит ирцийн дутагдлыг өдөр, үүргээр тусад нь хянана.</p></div>
      <button className="button button--secondary" type="button" onClick={() => onNavigate('schedule')}>Долоо хоногийн хуваарь засах</button>
    </section>
    <Notice message={message} onDismiss={onDismissMessage} />
    {roster.status === 'draft' ? <div className="readiness-unavailable"><LockKeyhole size={18} /><span><strong>Ноорог үед ирцийн бэлэн байдлыг тооцохгүй.</strong> Хуваарийн төлөвлөгөө харагдана. Хоцролт, ирээгүй баримтыг ашиглахын өмнө албан ёсны хуваарийг нийтэлнэ үү.</span></div> : null}

    <section className="coverage-day-strip" aria-label="Хангалтын огноо">
      {dates.map((date) => {
        const dateRows = readiness.filter((item) => item.date === date)
        const gap = dateRows.reduce((sum, item) => sum + item.gap, 0)
        const actualGap = dateRows.reduce((sum, item) => sum + item.readinessGap, 0)
        return <button key={date} className={selectedDate === date ? 'selected' : ''} type="button" onClick={() => setSelectedDate(date)}><span>{formatDate(date, { weekday: 'short', month: 'short', day: 'numeric' })}</span><strong>{gap ? `Төлөвлөгөө ${gap}-аар дутуу` : 'Төлөвлөгөө бүрэн'}</strong><small>{roster.status === 'published' ? `Бэлэн байдал ${actualGap}-аар дутуу` : 'Ирц хүлээгдэж байна'}</small></button>
      })}
    </section>

    <section className="workspace-panel readiness-table-card">
      <header className="card-header"><div><h2>{formatDate(selectedDate, { weekday: 'long', month: 'long', day: 'numeric' })}</h2><p>Салбарын зөвшөөрөгдсөн үүрэг тус бүрийн үйл ажиллагааны тоо.</p></div><span className={totals.readinessGap || totals.planningGap ? 'risk-badge' : 'risk-badge risk-badge--healthy'}>{totals.readinessGap || totals.planningGap} нээлттэй</span></header>
      <div className="readiness-table" role="table" aria-label="Үүрэг тус бүрийн бэлэн байдал">
        <div className="readiness-table-head" role="row"><span role="columnheader">Үүрэг</span><span role="columnheader">Шаардлагатай</span><span role="columnheader">Хуваарилсан</span><span role="columnheader">Ирсэн</span><span role="columnheader">Чөлөө</span><span role="columnheader">Ирээгүй</span><span role="columnheader">Хоцорсон</span><span role="columnheader">Дутуу</span></div>
        {rows.map((row) => <div className="readiness-table-row" role="row" key={row.role} data-tone={row.readinessGap || row.gap ? 'warning' : 'healthy'}><strong role="cell">{roleLabels[row.role]}</strong><span role="cell">{row.required}</span><span role="cell">{row.scheduled}</span><span role="cell">{row.attendanceAvailable ? row.checkedIn : '—'}</span><span role="cell">{row.attendanceAvailable ? row.approvedAbsence : '—'}</span><span role="cell">{row.attendanceAvailable ? row.noShow : '—'}</span><span role="cell">{row.attendanceAvailable ? row.late : '—'}</span><b role="cell">{row.attendanceAvailable ? row.readinessGap : row.gap}</b></div>)}
      </div>
      <footer className="readiness-total"><span>Өдрийн нийт</span><strong>{totals.required} шаардлагатай</strong><strong>{totals.scheduled} хуваарилсан</strong><strong>{roster.status === 'published' ? `${totals.checkedIn} ирсэн` : 'Ирц хүлээгдэж байна'}</strong></footer>
    </section>
  </>
}

interface DecisionFormProps {
  exception: AttendanceException
  onDecision: (id: string, action: AttendanceDecisionAction, reason: string) => void
}

function AttendanceDecisionForm({ exception, onDecision }: DecisionFormProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const requestDecision = exception.type === 'correction'
  const actions: AttendanceDecisionAction[] = requestDecision ? ['approve', 'reject'] : ['excuse', 'confirm']

  function submit(action: AttendanceDecisionAction) {
    try {
      onDecision(exception.id, action, reason)
      setReason('')
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Ирцийн шийдвэрийг тэмдэглэж чадсангүй.')
    }
  }

  return <form className="attendance-decision-form" onSubmit={(event) => event.preventDefault()}>
    <label><span>Менежерийн шийдвэрийн шалтгаан</span><textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Баримт болон бодлогын үндэслэлийг бичнэ үү" /></label>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    <div>{actions.map((action) => <button key={action} className={action === 'reject' || action === 'confirm' ? 'button button--secondary' : 'button button--primary'} type="button" onClick={() => submit(action)}>{attendanceDecisionLabels[action]}</button>)}</div>
  </form>
}

interface AttendanceProps {
  roster: WeeklyRoster
  exceptions: AttendanceException[]
  leaveRequests: LeaveRequest[]
  penaltyReviews: PenaltyReview[]
  teamMembers: TeamMember[]
  message: string
  onDismissMessage: () => void
  onDecision: (id: string, action: AttendanceDecisionAction, reason: string) => void
  onLeaveDecision: (id: string, action: 'approve' | 'reject', reason: string) => void
}

function LeaveDecisionForm({ request, onDecision }: { request: LeaveRequest; onDecision: (id: string, action: 'approve' | 'reject', reason: string) => void }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  function submit(action: 'approve' | 'reject') {
    try {
      onDecision(request.id, action, reason)
      setReason('')
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Чөлөөний хүсэлтийн шийдвэрийг тэмдэглэж чадсангүй.')
    }
  }

  return <form className="attendance-decision-form" onSubmit={(event) => event.preventDefault()}>
    <label><span>Менежерийн шийдвэрийн шалтгаан</span><textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Хангалт, орлох хүн болон бодлогын үндэслэлийг бичнэ үү" /></label>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    <div><button className="button button--primary" type="button" onClick={() => submit('approve')}>Зөвшөөрөх</button><button className="button button--secondary" type="button" onClick={() => submit('reject')}>Татгалзах</button></div>
  </form>
}

export function AttendanceReviewView({ roster, exceptions, leaveRequests, penaltyReviews, teamMembers, message, onDismissMessage, onDecision, onLeaveDecision }: AttendanceProps) {
  const [section, setSection] = useState<'attendance' | 'leave' | 'penalties'>('attendance')
  const [filter, setFilter] = useState<'open' | 'all'>('open')
  const filtered = filter === 'open' ? exceptions.filter((item) => item.status === 'open') : exceptions
  const [selectedId, setSelectedId] = useState(filtered[0]?.id ?? '')
  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0]
  const filteredLeave = filter === 'open' ? leaveRequests.filter((item) => item.status === 'pending') : leaveRequests
  const [selectedLeaveId, setSelectedLeaveId] = useState(filteredLeave[0]?.id ?? '')
  const selectedLeave = filteredLeave.find((item) => item.id === selectedLeaveId) ?? filteredLeave[0]
  const [selectedPenaltyId, setSelectedPenaltyId] = useState(penaltyReviews[0]?.id ?? '')
  const selectedPenalty = penaltyReviews.find((item) => item.id === selectedPenaltyId) ?? penaltyReviews[0]
  const memberById = new Map(teamMembers.map((member) => [member.id, member]))
  const pendingLeave = leaveRequests.filter((item) => item.status === 'pending').length

  return <>
    <section className="page-heading manager-view-heading"><div><span className="eyebrow">Хүсэлт, ирц ба бодлогын хяналт</span><h1>Ирц ба чөлөө</h1><p>Чөлөөний хүсэлтийг шийдвэрлэж, хоцролтын эх баримт болон торгуулийн шилжилтийг тусад нь хянана.</p></div><div className="segmented-control"><button className={filter === 'open' ? 'active' : ''} type="button" onClick={() => setFilter('open')}>Нээлттэй</button><button className={filter === 'all' ? 'active' : ''} type="button" onClick={() => setFilter('all')}>Бүх баримт</button></div></section>
    <Notice message={message} onDismiss={onDismissMessage} />

    <div className="attendance-section-tabs" role="tablist" aria-label="Ирц ба чөлөөний хяналтын төрөл">
      <button type="button" role="tab" aria-selected={section === 'attendance'} className={section === 'attendance' ? 'active' : ''} onClick={() => setSection('attendance')}><Clock3 size={17} />Ирцийн зөрчил <b>{exceptions.filter((item) => item.status === 'open').length}</b></button>
      <button type="button" role="tab" aria-selected={section === 'leave'} className={section === 'leave' ? 'active' : ''} onClick={() => setSection('leave')}><CalendarOff size={17} />Чөлөөний хүсэлт <b>{pendingLeave}</b></button>
      <button type="button" role="tab" aria-selected={section === 'penalties'} className={section === 'penalties' ? 'active' : ''} onClick={() => setSection('penalties')}><ReceiptText size={17} />Торгуулийн хяналт <b>{penaltyReviews.length}</b></button>
    </div>

    {section === 'attendance' && roster.status === 'draft' ? <div className="workspace-empty"><LockKeyhole size={24} /><strong>Ирцийн албан ёсны хүлээлт үүсээгүй байна</strong><span>Хоцролт, ирээгүй болон залруулгын баримтыг хянахын өмнө долоо хоногийн хуваарийг нийтэлнэ үү.</span></div> : null}
    {section === 'attendance' && roster.status !== 'draft' && filtered.length ? <div className="attendance-review-layout">
      <section className="workspace-panel attendance-queue">
        <header className="card-header"><div><h2>Зөрчлийн жагсаалт</h2><p>{filter === 'open' ? `${filtered.length} зүйл шийдвэр хүлээж байна` : `Энэ долоо хоногт ${filtered.length} бүртгэл байна`}</p></div><AlertTriangle size={20} /></header>
        <div>{filtered.map((exception) => {
          const member = memberById.get(exception.teamMemberId)
          return <button key={exception.id} className={selected?.id === exception.id ? 'selected' : ''} type="button" onClick={() => setSelectedId(exception.id)}><span className="avatar avatar--member">{member?.initials}</span><span><strong>{member?.name}</strong><small>{exceptionLabel(exception.type)} · {formatDate(exception.date, { weekday: 'short', month: 'short', day: 'numeric' })}</small></span><b data-status={exception.status}>{attendanceStatusLabels[exception.status]}</b></button>
        })}</div>
      </section>

      {selected ? <section className="workspace-panel attendance-detail">
        <header className="card-header"><div><span className="eyebrow">Эх баримт</span><h2>{memberById.get(selected.teamMemberId)?.name}</h2><p>{formatDate(selected.date, { weekday: 'long', month: 'long', day: 'numeric' })}-ны {exceptionLabel(selected.type).toLowerCase()}</p></div><BadgeCheck size={22} /></header>
        <dl><div><dt>Хуваарийн эхлэл</dt><dd>{selected.scheduledStart}</dd></div><div><dt>Баталгаажсан ирэлт</dt><dd>{selected.checkInAt ? formatTime(selected.checkInAt) : 'Ирсэн бүртгэлгүй'}</dd></div><div><dt>Хоцорсон минут</dt><dd>{selected.lateMinutes ?? '—'}</dd></div><div><dt>Одоогийн үр дүн</dt><dd>{attendanceStatusLabels[selected.status]}</dd></div></dl>
        <blockquote>{selected.evidence}</blockquote>
        {selected.requestNote ? <div className="request-note"><strong>Хүсэлтийн тайлбар</strong><span>{selected.requestNote}</span></div> : null}
        {selected.decision ? <div className="recorded-decision"><FileCheck2 size={17} /><span><strong>{selected.decision.actor} “{attendanceDecisionLabels[selected.decision.action]}” шийдвэр тэмдэглэсэн</strong><small>{selected.decision.reason} · {formatDateTime(selected.decision.at)}</small></span></div> : null}
        {selected.status === 'open' ? <AttendanceDecisionForm key={selected.id} exception={selected} onDecision={onDecision} /> : null}
      </section> : null}
    </div> : null}
    {section === 'attendance' && roster.status !== 'draft' && !filtered.length ? <div className="workspace-empty"><Check size={24} /><strong>Нээлттэй ирцийн зөрчил алга</strong><span>Шийдвэрлэсэн баримтыг харахын тулд шүүлтүүрийг солино уу.</span></div> : null}

    {section === 'leave' && filteredLeave.length ? <div className="attendance-review-layout">
      <section className="workspace-panel attendance-queue">
        <header className="card-header"><div><h2>Чөлөөний хүсэлтүүд</h2><p>{filter === 'open' ? `${filteredLeave.length} хүсэлт шийдвэр хүлээж байна` : `Энэ долоо хоногт ${filteredLeave.length} хүсэлт байна`}</p></div><CalendarOff size={20} /></header>
        <div>{filteredLeave.map((request) => {
          const member = memberById.get(request.teamMemberId)
          return <button key={request.id} className={selectedLeave?.id === request.id ? 'selected' : ''} type="button" onClick={() => setSelectedLeaveId(request.id)}><span className="avatar avatar--member">{member?.initials}</span><span><strong>{member?.name}</strong><small>{leaveRequestTypeLabels[request.type]} · {formatDate(request.startDate, { month: 'short', day: 'numeric' })}</small></span><b data-status={request.status}>{leaveRequestStatusLabels[request.status]}</b></button>
        })}</div>
      </section>
      {selectedLeave ? <section className="workspace-panel attendance-detail leave-request-detail">
        <header className="card-header"><div><span className="eyebrow">Багийн гишүүний хүсэлт</span><h2>{memberById.get(selectedLeave.teamMemberId)?.name}</h2><p>{leaveRequestTypeLabels[selectedLeave.type]} · {formatDateTime(selectedLeave.submittedAt)}-д илгээсэн</p></div><CalendarOff size={22} /></header>
        <dl><div><dt>Эхлэх огноо</dt><dd>{formatDate(selectedLeave.startDate)}</dd></div><div><dt>Дуусах огноо</dt><dd>{formatDate(selectedLeave.endDate)}</dd></div><div><dt>Төрөл</dt><dd>{leaveRequestTypeLabels[selectedLeave.type]}</dd></div><div><dt>Одоогийн төлөв</dt><dd>{leaveRequestStatusLabels[selectedLeave.status]}</dd></div></dl>
        <div className="request-note"><strong>Хүсэлтийн шалтгаан</strong><span>{selectedLeave.reason}</span></div>
        <div className="leave-impact-note"><AlertTriangle size={17} /><span><strong>Хангалтын нөлөөг шийдвэрийн дараа тооцно</strong><small>Зөвшөөрвөл тухайн өдрийн ажиллах боломжийг хааж, нийтэлсэн ээлжтэй бол хангалтын дутагдлыг нээлттэй үлдээнэ. Эх хуваарийг устгахгүй.</small></span></div>
        {selectedLeave.decision ? <div className="recorded-decision"><FileCheck2 size={17} /><span><strong>{selectedLeave.decision.actor} “{leaveRequestStatusLabels[selectedLeave.status]}” шийдвэр тэмдэглэсэн</strong><small>{selectedLeave.decision.reason} · {formatDateTime(selectedLeave.decision.at)}</small></span></div> : null}
        {selectedLeave.status === 'pending' ? <LeaveDecisionForm key={selectedLeave.id} request={selectedLeave} onDecision={onLeaveDecision} /> : null}
      </section> : null}
    </div> : null}
    {section === 'leave' && !filteredLeave.length ? <div className="workspace-empty"><Check size={24} /><strong>Шийдвэр хүлээж буй чөлөөний хүсэлт алга</strong><span>Шийдвэрлэсэн хүсэлтүүдийг харахын тулд “Бүх баримт”-ыг сонгоно уу.</span></div> : null}

    {section === 'penalties' && roster.status === 'draft' ? <div className="workspace-empty"><LockKeyhole size={24} /><strong>Торгуулийн эх баримт үүсээгүй байна</strong><span>Нийтэлсэн хуваарь болон баталгаажсан ирцгүй үед хоцролт, ирээгүй тохиолдлыг торгуулийн хяналтад шилжүүлэхгүй.</span></div> : null}
    {section === 'penalties' && roster.status !== 'draft' && penaltyReviews.length ? <div className="attendance-review-layout">
      <section className="workspace-panel attendance-queue penalty-queue">
        <header className="card-header"><div><h2>Торгуулийн эх баримт</h2><p>Хоцролт болон ирээгүй бүх тохиолдол</p></div><ReceiptText size={20} /></header>
        <div>{penaltyReviews.map((review) => {
          const member = memberById.get(review.teamMemberId)
          return <button key={review.id} className={selectedPenalty?.id === review.id ? 'selected' : ''} type="button" onClick={() => setSelectedPenaltyId(review.id)}><span className="avatar avatar--member">{member?.initials}</span><span><strong>{member?.name}</strong><small>{review.attendanceType === 'late' ? `${review.lateMinutes ?? 0} минут хоцорсон` : 'Ирээгүй'} · {formatDate(review.date, { month: 'short', day: 'numeric' })}</small></span><b data-status={review.state}>{penaltyReviewStateLabels[review.state]}</b></button>
        })}</div>
      </section>
      {selectedPenalty ? <section className="workspace-panel attendance-detail penalty-detail">
        <header className="card-header"><div><span className="eyebrow">Торгуулийн өмнөх хяналт</span><h2>{memberById.get(selectedPenalty.teamMemberId)?.name}</h2><p>{selectedPenalty.attendanceType === 'late' ? 'Хоцролтын' : 'Ирээгүй'} эх баримт · {formatDate(selectedPenalty.date)}</p></div><ReceiptText size={22} /></header>
        <dl><div><dt>Хуваарийн эхлэл</dt><dd>{selectedPenalty.scheduledStart}</dd></div><div><dt>Баталгаажсан ирэлт</dt><dd>{selectedPenalty.checkInAt ? formatTime(selectedPenalty.checkInAt) : 'Ирсэн бүртгэлгүй'}</dd></div><div><dt>Хоцорсон минут</dt><dd>{selectedPenalty.lateMinutes ?? '—'}</dd></div><div><dt>Торгуулийн дүн</dt><dd>Тооцоогүй</dd></div></dl>
        <blockquote>{selectedPenalty.evidence}</blockquote>
        <div className="penalty-policy-lock"><LockKeyhole size={18} /><span><strong>{penaltyReviewStateLabels[selectedPenalty.state]}</strong><small>CL-013-ийн төрөл, томьёо, нотолгоо, гомдол болон хүчин төгөлдөр огноо батлагдаагүй тул энэ дэлгэц мөнгөн дүн тооцох, суутгал үүсгэх эрхгүй.</small></span></div>
        <div className="penalty-boundary"><ShieldCheck size={17} /><span>Менежер ирцийн эх баримтыг хянаж болно. Зөвхөн хүчинтэй бодлогын хувилбар болон эрх бүхий дараагийн workflow батлагдсаны дараа торгууль/суутгалын тусдаа бүртгэл үүснэ.</span></div>
      </section> : null}
    </div> : null}
    {section === 'penalties' && roster.status !== 'draft' && !penaltyReviews.length ? <div className="workspace-empty"><Check size={24} /><strong>Торгуулийн хяналтын эх баримт алга</strong><span>Энэ долоо хоногт хоцролт эсвэл ирээгүй тохиолдол бүртгэгдээгүй байна.</span></div> : null}
  </>
}

interface TeamProps {
  roster: WeeklyRoster
  teamMembers: TeamMember[]
  message: string
  onDismissMessage: () => void
  onOverrideAvailability: (teamMemberId: string, date: string, available: boolean, reason: string) => void
}

export function TeamMembersView({ roster, teamMembers, message, onDismissMessage, onOverrideAvailability }: TeamProps) {
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<'All' | WorkforceRole>('All')
  const [status, setStatus] = useState<'All' | OperationalStatus>('All')
  const [selectedMemberId, setSelectedMemberId] = useState(teamMembers[0]?.id ?? '')
  const [date, setDate] = useState(roster.weekStart)
  const [available, setAvailable] = useState(true)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const query = search.trim().toLowerCase()
  const filtered = teamMembers.filter((member) => (role === 'All' || member.role === role)
    && (status === 'All' || member.operationalStatus === status)
    && (!query || member.name.toLowerCase().includes(query) || roleLabels[member.role].toLowerCase().includes(query)))
  const selected = teamMembers.find((member) => member.id === selectedMemberId) ?? filtered[0]
  const upcoming = roster.assignments.filter((item) => item.teamMemberId === selected?.id).sort((left, right) => left.date.localeCompare(right.date)).slice(0, 4)
  const latestOverride = roster.availabilityOverrides.filter((item) => item.teamMemberId === selected?.id && item.date === date).sort((left, right) => right.at.localeCompare(left.at))[0]
  const unavailable = latestOverride ? !latestOverride.available : Boolean(selected?.unavailableDates.includes(date))

  function submitAvailability(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected) return
    try {
      onOverrideAvailability(selected.id, date, available, reason)
      setReason('')
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Ажиллах боломжийг шинэчилж чадсангүй.')
    }
  }

  return <>
    <section className="page-heading manager-view-heading"><div><span className="eyebrow">Зөвшөөрөгдсөн ажиллах хүчний бүртгэл</span><h1>Багийн гишүүд</h1><p>Салбарын ажилтныг хайж, удахгүй болох ээлжийг хянаж, ажиллах боломжийг тэмдэглэнэ.</p></div><span className="branch-only-badge"><ShieldCheck size={15} />Зөвхөн {roster.branchName}</span></section>
    <Notice message={message} onDismiss={onDismissMessage} />
    <section className="team-filter-bar"><label className="search-field"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Багийн гишүүн хайх" aria-label="Ажиллах хүчний бүртгэлээс хайх" /></label><select value={role} onChange={(event) => setRole(event.target.value as 'All' | WorkforceRole)} aria-label="Багийг үүргээр шүүх"><option value="All">Бүх үүрэг</option>{Array.from(new Set(teamMembers.map((member) => member.role))).map((item) => <option key={item} value={item}>{roleLabels[item]}</option>)}</select><select value={status} onChange={(event) => setStatus(event.target.value as 'All' | OperationalStatus)} aria-label="Багийг төлвөөр шүүх"><option value="All">Бүх төлөв</option>{Array.from(new Set(teamMembers.map((member) => member.operationalStatus))).map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}</select></section>

    {filtered.length ? <div className="team-workspace-layout">
      <section className="workspace-panel team-directory"><header className="card-header"><div><h2>Салбарын бүртгэл</h2><p>{filtered.length} үйл ажиллагааны бүртгэл харагдаж байна</p></div><Users size={20} /></header><div>{filtered.map((member) => <button key={member.id} className={selected?.id === member.id ? 'selected' : ''} type="button" onClick={() => setSelectedMemberId(member.id)}><span className="avatar avatar--member">{member.initials}</span><span><strong>{member.name}</strong><small>{roleLabels[member.role]}{member.rank ? ` · ${entertainerRankLabels[member.rank]}` : ''}</small></span><b data-status={member.operationalStatus}>{statusLabel(member.operationalStatus)}</b></button>)}</div></section>

      {selected ? <section className="workspace-panel team-detail-panel">
        <header className="team-detail-header"><span className="avatar avatar--large">{selected.initials}</span><div><h2>{selected.name}</h2><p>{roleLabels[selected.role]} · {roster.branchName}</p></div><span data-status={selected.operationalStatus}>{statusLabel(selected.operationalStatus)}</span></header>
        <div className="team-detail-facts"><article><span>Идэвхтэй салбар</span><strong>{roster.branchName}</strong></article><article><span>Үйл ажиллагааны зэрэглэл</span><strong>{selected.rank ? entertainerRankLabels[selected.rank] : 'Хамаарахгүй'}</strong></article><article><span>Сонгосон өдөр</span><strong>{unavailable ? 'Боломжгүй' : 'Боломжтой'}</strong></article></div>
        <div className="upcoming-shifts"><h3>Удахгүй болох ээлжүүд</h3>{upcoming.length ? upcoming.map((item) => <article key={item.id}><CalendarClock size={16} /><span><strong>{formatDate(item.date, { weekday: 'short', month: 'short', day: 'numeric' })}</strong><small>{item.start}–{item.end} · {shiftLabels[item.shift]}</small></span></article>) : <p>Энэ долоо хоногт ээлж алга.</p>}</div>
        <form className="availability-form" onSubmit={submitAvailability}><div><h3>Ажиллах боломжийг өөрчлөх</h3><p>Шалтгаан заавал бичигдэх бөгөөд анхны боломжийн баримт түүхэнд хадгалагдана.</p></div><label><span>Огноо</span><select value={date} onChange={(event) => setDate(event.target.value)}>{weekDates(roster.weekStart).map((item) => <option key={item} value={item}>{formatDate(item, { weekday: 'long', month: 'long', day: 'numeric' })}</option>)}</select></label><label><span>Өөрчлөх төлөв</span><select value={available ? 'available' : 'unavailable'} onChange={(event) => setAvailable(event.target.value === 'available')}><option value="available">Боломжтой</option><option value="unavailable">Боломжгүй</option></select></label><label className="availability-reason"><span>Шалтгаан</span><textarea rows={2} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Яагаад энэ өөрчлөлт шаардлагатайг бичнэ үү" /></label>{error ? <p className="form-error" role="alert">{error}</p> : null}<button className="button button--primary" type="submit"><UserCheck size={16} />Боломжийг хадгалах</button></form>
        {latestOverride ? <div className="latest-override"><FileCheck2 size={16} /><span><strong>Сүүлийн өөрчлөлт: {latestOverride.available ? 'боломжтой' : 'боломжгүй'}</strong><small>{latestOverride.reason} · {latestOverride.actor}</small></span></div> : null}
        {selected.rank ? <div className="rank-policy-lock"><LockKeyhole size={16} /><span><strong>Зэрэглэл өөрчлөх эрх түгжигдсэн</strong><small>Дөрвөн түвшний зэрэглэлийн бодлогод Гүйцэтгэх захирал эсвэл Ерөнхий менежерийн албан ёсны зөвшөөрөл шаардлагатай хэвээр байна. Энэ менежерийн дэлгэц зөвшөөрөөгүй эрх үүсгэхгүй.</small></span></div> : null}
      </section> : null}
    </div> : <div className="workspace-empty"><Users size={24} /><strong>Тохирох багийн гишүүн олдсонгүй</strong><span>Хайлтыг арилгах эсвэл өөр шүүлтүүр сонгоно уу.</span></div>}
  </>
}
