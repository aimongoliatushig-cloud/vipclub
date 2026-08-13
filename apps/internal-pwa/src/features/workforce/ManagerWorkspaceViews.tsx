import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Check,
  CircleGauge,
  Clock3,
  FileCheck2,
  LockKeyhole,
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
  ManagerDashboardSummary,
  OperationalStatus,
  ReadinessRow,
  TeamMember,
  WeeklyRoster,
  WorkforceRole,
} from './models'
import { weekDates } from './workforceService'

export type ManagerView = 'overview' | 'schedule' | 'coverage' | 'attendance' | 'team'

const shortDate = new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' })
const longDate = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' })

function dateAtNoon(value: string): Date {
  return new Date(`${value}T12:00:00`)
}

function statusLabel(status: OperationalStatus): string {
  return status === 'off-shift' ? 'Off shift' : status[0].toUpperCase() + status.slice(1)
}

function exceptionLabel(type: AttendanceException['type']): string {
  const labels: Record<AttendanceException['type'], string> = {
    late: 'Late arrival',
    'no-show': 'Unexpected no-show',
    'approved-absence': 'Approved absence',
    mismatch: 'Schedule mismatch',
    correction: 'Correction request',
    'leave-request': 'Leave request',
  }
  return labels[type]
}

function Notice({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return message ? <div className="status-message manager-view-notice" role="status"><Check size={18} /><span>{message}</span><button type="button" aria-label="Dismiss message" onClick={onDismiss}><X size={17} /></button></div> : null
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
    ['On shift', dashboard.onShift, 'active'],
    ['Available', dashboard.available, 'healthy'],
    ['Reserved', dashboard.reserved, 'neutral'],
    ['Serving', dashboard.serving, 'healthy'],
    ['Break', dashboard.break, 'neutral'],
    ['Late', dashboard.late, 'warning'],
    ['Absent', dashboard.absent, 'danger'],
    ['Leave', dashboard.leave, 'neutral'],
  ]

  return <>
    <section className="page-heading manager-view-heading">
      <div><span className="eyebrow">Branch operations</span><h1>Manager overview</h1><p>One branch-scoped view of live team status, staffing risk, and action queues.</p></div>
      <div className="freshness"><Clock3 size={15} /><span>Data refreshed</span><strong>{new Date(dashboard.dataFreshAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></div>
    </section>
    <Notice message={message} onDismiss={onDismissMessage} />

    <section className="operations-metrics" aria-label="Current branch workforce status">
      {statusMetrics.map(([label, value, tone]) => <article key={label} data-tone={tone}><span>{label}</span><strong>{value}</strong></article>)}
    </section>

    <div className="manager-overview-grid">
      <section className="workspace-panel readiness-summary">
        <header className="card-header"><div><span className="eyebrow">Today</span><h2>{longDate.format(dateAtNoon(today))}</h2><p>Planning and attendance remain separate evidence.</p></div><CircleGauge size={22} /></header>
        <div className="readiness-chain">
          <article><span>Required</span><strong>{required}</strong><small>Minimum staffing</small></article>
          <ArrowRight size={18} />
          <article><span>Scheduled</span><strong>{scheduled}</strong><small>{openGaps ? `${openGaps} weekly gaps` : 'Plan covered'}</small></article>
          <ArrowRight size={18} />
          <article><span>Checked in</span><strong>{roster.status === 'published' ? checkedIn : '—'}</strong><small>{roster.status === 'published' ? `${readinessGap} readiness gaps` : 'Publish to activate'}</small></article>
        </div>
        <button className="button button--secondary" type="button" onClick={() => onNavigate('coverage')}>Open coverage and readiness<ArrowRight size={16} /></button>
      </section>

      <section className="workspace-panel manager-queue-summary">
        <header className="card-header"><div><span className="eyebrow">Action queue</span><h2>Manager follow-up</h2><p>Objective operational items requiring review.</p></div><FileCheck2 size={22} /></header>
        <button type="button" onClick={() => onNavigate('attendance')}><span><AlertTriangle size={17} /><strong>Attendance exceptions</strong></span><b>{openAttendance}</b></button>
        <button type="button" onClick={() => onNavigate('schedule')}><span><CalendarClock size={17} /><strong>Assignment responses</strong></span><b>{openResponses}</b></button>
        <button type="button" onClick={() => onNavigate('coverage')}><span><CircleGauge size={17} /><strong>Coverage gaps</strong></span><b>{openGaps}</b></button>
      </section>
    </div>

    <section className="scope-guardrail"><ShieldCheck size={19} /><div><strong>Central Branch scope enforced</strong><span>This workspace exposes operational workforce fields only. Private HR, unrestricted customer, and billing data are not part of the manager projection.</span></div></section>
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
      <div><span className="eyebrow">Required → Scheduled → Checked In</span><h1>Coverage and readiness</h1><p>Separate manager planning gaps from actual attendance shortages by date and role.</p></div>
      <button className="button button--secondary" type="button" onClick={() => onNavigate('schedule')}>Edit weekly schedule</button>
    </section>
    <Notice message={message} onDismiss={onDismissMessage} />
    {roster.status === 'draft' ? <div className="readiness-unavailable"><LockKeyhole size={18} /><span><strong>Attendance readiness is not active for a draft.</strong> Scheduled planning remains visible; publish the authoritative roster before late or no-show evidence can apply.</span></div> : null}

    <section className="coverage-day-strip" aria-label="Coverage date">
      {dates.map((date) => {
        const dateRows = readiness.filter((item) => item.date === date)
        const gap = dateRows.reduce((sum, item) => sum + item.gap, 0)
        const actualGap = dateRows.reduce((sum, item) => sum + item.readinessGap, 0)
        return <button key={date} className={selectedDate === date ? 'selected' : ''} type="button" onClick={() => setSelectedDate(date)}><span>{shortDate.format(dateAtNoon(date))}</span><strong>{gap ? `${gap} plan gap` : 'Plan covered'}</strong><small>{roster.status === 'published' ? `${actualGap} readiness gap` : 'Attendance pending'}</small></button>
      })}
    </section>

    <section className="workspace-panel readiness-table-card">
      <header className="card-header"><div><h2>{longDate.format(dateAtNoon(selectedDate))}</h2><p>Operational counts by approved branch role.</p></div><span className={totals.readinessGap || totals.planningGap ? 'risk-badge' : 'risk-badge risk-badge--healthy'}>{totals.readinessGap || totals.planningGap} open</span></header>
      <div className="readiness-table" role="table" aria-label="Role readiness">
        <div className="readiness-table-head" role="row"><span role="columnheader">Role</span><span role="columnheader">Required</span><span role="columnheader">Scheduled</span><span role="columnheader">Checked in</span><span role="columnheader">Leave</span><span role="columnheader">No-show</span><span role="columnheader">Late</span><span role="columnheader">Gap</span></div>
        {rows.map((row) => <div className="readiness-table-row" role="row" key={row.role} data-tone={row.readinessGap || row.gap ? 'warning' : 'healthy'}><strong role="cell">{row.role}</strong><span role="cell">{row.required}</span><span role="cell">{row.scheduled}</span><span role="cell">{row.attendanceAvailable ? row.checkedIn : '—'}</span><span role="cell">{row.attendanceAvailable ? row.approvedAbsence : '—'}</span><span role="cell">{row.attendanceAvailable ? row.noShow : '—'}</span><span role="cell">{row.attendanceAvailable ? row.late : '—'}</span><b role="cell">{row.attendanceAvailable ? row.readinessGap : row.gap}</b></div>)}
      </div>
      <footer className="readiness-total"><span>Daily total</span><strong>{totals.required} required</strong><strong>{totals.scheduled} scheduled</strong><strong>{roster.status === 'published' ? `${totals.checkedIn} checked in` : 'Attendance pending'}</strong></footer>
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
  const requestDecision = exception.type === 'correction' || exception.type === 'leave-request'
  const actions: AttendanceDecisionAction[] = requestDecision ? ['approve', 'reject'] : ['excuse', 'confirm']

  function submit(action: AttendanceDecisionAction) {
    try {
      onDecision(exception.id, action, reason)
      setReason('')
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to record this attendance decision.')
    }
  }

  return <form className="attendance-decision-form" onSubmit={(event) => event.preventDefault()}>
    <label><span>Manager decision reason</span><textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Record the evidence and policy basis" /></label>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    <div>{actions.map((action) => <button key={action} className={action === 'reject' || action === 'confirm' ? 'button button--secondary' : 'button button--primary'} type="button" onClick={() => submit(action)}>{action[0].toUpperCase() + action.slice(1)}</button>)}</div>
  </form>
}

interface AttendanceProps {
  roster: WeeklyRoster
  exceptions: AttendanceException[]
  teamMembers: TeamMember[]
  message: string
  onDismissMessage: () => void
  onDecision: (id: string, action: AttendanceDecisionAction, reason: string) => void
}

export function AttendanceReviewView({ roster, exceptions, teamMembers, message, onDismissMessage, onDecision }: AttendanceProps) {
  const [filter, setFilter] = useState<'open' | 'all'>('open')
  const filtered = filter === 'open' ? exceptions.filter((item) => item.status === 'open') : exceptions
  const [selectedId, setSelectedId] = useState(filtered[0]?.id ?? '')
  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0]
  const memberById = new Map(teamMembers.map((member) => [member.id, member]))

  return <>
    <section className="page-heading manager-view-heading"><div><span className="eyebrow">Daily exception review</span><h1>Attendance review</h1><p>Review source evidence without rewriting the original schedule or check-in record.</p></div><div className="segmented-control"><button className={filter === 'open' ? 'active' : ''} type="button" onClick={() => setFilter('open')}>Open</button><button className={filter === 'all' ? 'active' : ''} type="button" onClick={() => setFilter('all')}>All evidence</button></div></section>
    <Notice message={message} onDismiss={onDismissMessage} />

    {roster.status === 'draft' ? <div className="workspace-empty"><LockKeyhole size={24} /><strong>No authoritative attendance expectation yet</strong><span>Publish the weekly roster before reviewing lateness, no-show, leave, or correction evidence.</span></div> : filtered.length ? <div className="attendance-review-layout">
      <section className="workspace-panel attendance-queue">
        <header className="card-header"><div><h2>Exception queue</h2><p>{filtered.length} {filter === 'open' ? 'items need a decision' : 'records in this week'}</p></div><AlertTriangle size={20} /></header>
        <div>{filtered.map((exception) => {
          const member = memberById.get(exception.teamMemberId)
          return <button key={exception.id} className={selected?.id === exception.id ? 'selected' : ''} type="button" onClick={() => setSelectedId(exception.id)}><span className="avatar avatar--member">{member?.initials}</span><span><strong>{member?.name}</strong><small>{exceptionLabel(exception.type)} · {shortDate.format(dateAtNoon(exception.date))}</small></span><b data-status={exception.status}>{exception.status}</b></button>
        })}</div>
      </section>

      {selected ? <section className="workspace-panel attendance-detail">
        <header className="card-header"><div><span className="eyebrow">Source evidence</span><h2>{memberById.get(selected.teamMemberId)?.name}</h2><p>{exceptionLabel(selected.type)} on {longDate.format(dateAtNoon(selected.date))}</p></div><BadgeCheck size={22} /></header>
        <dl><div><dt>Scheduled start</dt><dd>{selected.scheduledStart}</dd></div><div><dt>Verified check-in</dt><dd>{selected.checkInAt ? new Date(selected.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No check-in'}</dd></div><div><dt>Late minutes</dt><dd>{selected.lateMinutes ?? '—'}</dd></div><div><dt>Current outcome</dt><dd>{selected.status}</dd></div></dl>
        <blockquote>{selected.evidence}</blockquote>
        {selected.requestNote ? <div className="request-note"><strong>Request note</strong><span>{selected.requestNote}</span></div> : null}
        {selected.decision ? <div className="recorded-decision"><FileCheck2 size={17} /><span><strong>{selected.decision.action} recorded by {selected.decision.actor}</strong><small>{selected.decision.reason} · {new Date(selected.decision.at).toLocaleString()}</small></span></div> : null}
        {selected.status === 'open' ? <AttendanceDecisionForm key={selected.id} exception={selected} onDecision={onDecision} /> : null}
      </section> : null}
    </div> : <div className="workspace-empty"><Check size={24} /><strong>No open attendance exceptions</strong><span>Change the filter to review completed evidence.</span></div>}
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
    && (!query || member.name.toLowerCase().includes(query) || member.role.toLowerCase().includes(query)))
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
      setError(caught instanceof Error ? caught.message : 'Unable to update availability.')
    }
  }

  return <>
    <section className="page-heading manager-view-heading"><div><span className="eyebrow">Authorized operational roster</span><h1>Team members</h1><p>Search branch staff, review upcoming shifts, and record scheduling availability.</p></div><span className="branch-only-badge"><ShieldCheck size={15} />{roster.branchName} only</span></section>
    <Notice message={message} onDismiss={onDismissMessage} />
    <section className="team-filter-bar"><label className="search-field"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search team" aria-label="Search operational roster" /></label><select value={role} onChange={(event) => setRole(event.target.value as 'All' | WorkforceRole)} aria-label="Filter team by role"><option value="All">All roles</option>{Array.from(new Set(teamMembers.map((member) => member.role))).map((item) => <option key={item}>{item}</option>)}</select><select value={status} onChange={(event) => setStatus(event.target.value as 'All' | OperationalStatus)} aria-label="Filter team by status"><option value="All">All statuses</option>{Array.from(new Set(teamMembers.map((member) => member.operationalStatus))).map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}</select></section>

    {filtered.length ? <div className="team-workspace-layout">
      <section className="workspace-panel team-directory"><header className="card-header"><div><h2>Branch roster</h2><p>{filtered.length} operational records shown</p></div><Users size={20} /></header><div>{filtered.map((member) => <button key={member.id} className={selected?.id === member.id ? 'selected' : ''} type="button" onClick={() => setSelectedMemberId(member.id)}><span className="avatar avatar--member">{member.initials}</span><span><strong>{member.name}</strong><small>{member.role}{member.rank ? ` · ${member.rank}` : ''}</small></span><b data-status={member.operationalStatus}>{statusLabel(member.operationalStatus)}</b></button>)}</div></section>

      {selected ? <section className="workspace-panel team-detail-panel">
        <header className="team-detail-header"><span className="avatar avatar--large">{selected.initials}</span><div><h2>{selected.name}</h2><p>{selected.role} · {roster.branchName}</p></div><span data-status={selected.operationalStatus}>{statusLabel(selected.operationalStatus)}</span></header>
        <div className="team-detail-facts"><article><span>Active branch</span><strong>{roster.branchName}</strong></article><article><span>Operational rank</span><strong>{selected.rank ?? 'Not applicable'}</strong></article><article><span>Selected date</span><strong>{unavailable ? 'Unavailable' : 'Available'}</strong></article></div>
        <div className="upcoming-shifts"><h3>Upcoming shifts</h3>{upcoming.length ? upcoming.map((item) => <article key={item.id}><CalendarClock size={16} /><span><strong>{shortDate.format(dateAtNoon(item.date))}</strong><small>{item.start}–{item.end} · {item.shift}</small></span></article>) : <p>No assignments in this week.</p>}</div>
        <form className="availability-form" onSubmit={submitAvailability}><div><h3>Availability override</h3><p>Reason is required and the original availability evidence remains in history.</p></div><label><span>Date</span><select value={date} onChange={(event) => setDate(event.target.value)}>{weekDates(roster.weekStart).map((item) => <option key={item} value={item}>{longDate.format(dateAtNoon(item))}</option>)}</select></label><label><span>Override</span><select value={available ? 'available' : 'unavailable'} onChange={(event) => setAvailable(event.target.value === 'available')}><option value="available">Available</option><option value="unavailable">Unavailable</option></select></label><label className="availability-reason"><span>Reason</span><textarea rows={2} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Record why this override is necessary" /></label>{error ? <p className="form-error" role="alert">{error}</p> : null}<button className="button button--primary" type="submit"><UserCheck size={16} />Save availability</button></form>
        {latestOverride ? <div className="latest-override"><FileCheck2 size={16} /><span><strong>Latest override: {latestOverride.available ? 'available' : 'unavailable'}</strong><small>{latestOverride.reason} · {latestOverride.actor}</small></span></div> : null}
        {selected.rank ? <div className="rank-policy-lock"><LockKeyhole size={16} /><span><strong>Rank override is governance-locked</strong><small>The repository’s four-level ranking policy still requires CEO or General Manager approval. This manager UI does not invent override authority.</small></span></div> : null}
      </section> : null}
    </div> : <div className="workspace-empty"><Users size={24} /><strong>No matching team members</strong><span>Clear the search or choose another operational filter.</span></div>}
  </>
}
