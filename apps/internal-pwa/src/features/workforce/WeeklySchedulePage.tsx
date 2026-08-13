import {
  AlertTriangle,
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleGauge,
  ClipboardCheck,
  Clock3,
  Copy,
  FileClock,
  Inbox,
  LayoutDashboard,
  ListChecks,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import {
  shiftTemplates,
  workforceRoles,
  type AssignmentInput,
  type ExecutiveFollowUpSummary,
  type RosterAuditEvent,
  type ShiftAssignment,
  type StaffingRequirement,
  type ShiftTemplateName,
  type TeamMember,
  type ValidationIssue,
  type WeeklyRoster,
  type WorkforceRole,
} from './models'
import {
  addDays,
  getCoverage,
  startOfWeek,
  toDateKey,
  weekDates,
  type WorkforceService,
} from './workforceService'
import { ResponseQueuePanel, TeamMemberSchedulePanel } from './ResponsePanels'

const dayLabel = new Intl.DateTimeFormat('en', { weekday: 'short' })
const shortDate = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' })
const longDate = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'short', day: 'numeric' })

function dateAtNoon(value: string): Date {
  return new Date(`${value}T12:00:00`)
}

function formatWeek(weekStart: string): string {
  const end = addDays(weekStart, 6)
  return `${shortDate.format(dateAtNoon(weekStart))} – ${shortDate.format(dateAtNoon(end))}`
}

function statusText(roster: WeeklyRoster): string {
  return roster.status === 'published' ? `Published · v${roster.version}` : `Draft · v${roster.version}`
}

function responseText(response: ShiftAssignment['response']): string {
  if (response === 'acknowledged') return 'Acknowledged'
  if (response === 'change-requested') return 'Change requested'
  return 'Pending'
}

interface EditorState {
  assignment?: ShiftAssignment
  teamMemberId: string
  date: string
}

interface AssignmentEditorProps {
  state: EditorState
  roster: WeeklyRoster
  teamMembers: TeamMember[]
  onClose: () => void
  onSave: (input: AssignmentInput) => void
  onRemove: (assignmentId: string, reason?: string) => void
}

function AssignmentEditor({ state, roster, teamMembers, onClose, onSave, onRemove }: AssignmentEditorProps) {
  const [teamMemberId, setTeamMemberId] = useState(state.teamMemberId)
  const [shift, setShift] = useState<ShiftTemplateName>(state.assignment?.shift ?? 'Evening')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const isPublished = roster.status === 'published'

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      onSave({ id: state.assignment?.id, teamMemberId, date: state.date, shift, reason })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save this shift.')
    }
  }

  function remove() {
    if (!state.assignment) return
    try {
      onRemove(state.assignment.id, reason)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to remove this shift.')
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="shift-editor-title">
        <header className="modal-header">
          <div>
            <span className="eyebrow">{state.assignment ? 'Edit assignment' : 'New assignment'}</span>
            <h2 id="shift-editor-title">{longDate.format(dateAtNoon(state.date))}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Close shift editor" onClick={onClose}><X size={20} /></button>
        </header>

        <form className="editor-form" onSubmit={submit}>
          <label>
            <span>Team member</span>
            <select value={teamMemberId} onChange={(event) => setTeamMemberId(event.target.value)}>
              {teamMembers.filter((member) => member.active).map((member) => (
                <option key={member.id} value={member.id}>{member.name} · {member.role}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Shift</span>
            <select value={shift} onChange={(event) => setShift(event.target.value as ShiftTemplateName)}>
              {Object.entries(shiftTemplates).map(([name, times]) => (
                <option key={name} value={name}>{name} · {times.start}–{times.end}</option>
              ))}
            </select>
          </label>
          {isPublished ? (
            <label>
              <span>Reason for published change <b>Required</b></span>
              <textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Example: approved leave requires backfill" rows={3} />
            </label>
          ) : null}
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <div className="modal-actions">
            {state.assignment ? <button className="button button--danger" type="button" onClick={remove}>Remove shift</button> : <span />}
            <div>
              <button className="button button--ghost" type="button" onClick={onClose}>Cancel</button>
              <button className="button button--primary" type="submit"><Check size={17} />Save shift</button>
            </div>
          </div>
        </form>
      </section>
    </div>
  )
}

interface PublishReviewProps {
  roster: WeeklyRoster
  issues: ValidationIssue[]
  onClose: () => void
  onPublish: (reason?: string) => void
}

function PublishReview({ roster, issues, onClose, onPublish }: PublishReviewProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const blockers = issues.filter((issue) => issue.severity === 'error')
  const gaps = issues.filter((issue) => issue.code === 'coverage')

  function publish() {
    try {
      onPublish(reason)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to publish this roster.')
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card modal-card--review" role="dialog" aria-modal="true" aria-labelledby="publish-review-title">
        <header className="modal-header">
          <div>
            <span className="eyebrow">Publication review</span>
            <h2 id="publish-review-title">Week of {formatWeek(roster.weekStart)}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Close publication review" onClick={onClose}><X size={20} /></button>
        </header>
        <div className="review-summary">
          <article><Check size={18} /><div><strong>{roster.assignments.length} assignments</strong><span>Active branch team only</span></div></article>
          <article data-tone={blockers.length ? 'danger' : 'healthy'}><ShieldCheck size={18} /><div><strong>{blockers.length} blockers</strong><span>Eligibility and overlap checks</span></div></article>
          <article data-tone={gaps.length ? 'warning' : 'healthy'}><AlertTriangle size={18} /><div><strong>{gaps.length} coverage gaps</strong><span>Required vs scheduled</span></div></article>
        </div>

        {issues.length ? (
          <div className="issue-list" aria-label="Publication issues">
            {issues.map((issue, index) => (
              <div key={`${issue.code}-${issue.date}-${issue.role}-${index}`} data-tone={issue.severity === 'error' ? 'danger' : 'warning'}>
                <AlertTriangle size={17} /><span>{issue.message}</span>
              </div>
            ))}
          </div>
        ) : <div className="all-clear"><Check size={18} />All publication checks passed.</div>}

        {gaps.length ? (
          <label className="review-reason">
            <span>Reason for publishing below minimum <b>Required</b></span>
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} placeholder="Record the operating decision and planned backfill action" />
          </label>
        ) : null}
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="modal-actions modal-actions--end">
          <button className="button button--ghost" type="button" onClick={onClose}>Keep editing</button>
          <button className="button button--primary" type="button" disabled={blockers.length > 0} onClick={publish}><Send size={17} />Publish roster</button>
        </div>
      </section>
    </div>
  )
}

interface StaffingRequirementsEditorProps {
  roster: WeeklyRoster
  onClose: () => void
  onSave: (requirements: StaffingRequirement[], effectiveFrom: string, reason: string) => void
}

function StaffingRequirementsEditor({ roster, onClose, onSave }: StaffingRequirementsEditorProps) {
  const [requirements, setRequirements] = useState(() => roster.requirements.map((item) => ({ ...item })))
  const [effectiveFrom, setEffectiveFrom] = useState(roster.requirementsEffectiveFrom)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const dates = weekDates(roster.weekStart)

  function updateRequired(date: string, role: WorkforceRole, value: string) {
    const required = Number(value)
    setRequirements((current) => current.map((item) => item.date === date && item.role === role ? { ...item, required } : item))
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      onSave(requirements, effectiveFrom, reason)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save staffing requirements.')
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card modal-card--requirements" role="dialog" aria-modal="true" aria-labelledby="requirements-title">
        <header className="modal-header">
          <div>
            <span className="eyebrow">Staffing template · version {roster.requirementVersion}</span>
            <h2 id="requirements-title">Minimum people required</h2>
            <p>Set the operating minimum for every role and day. Changes are effective-dated and recorded.</p>
          </div>
          <button className="icon-button" type="button" aria-label="Close staffing requirements" onClick={onClose}><X size={20} /></button>
        </header>
        <form className="requirements-form" onSubmit={submit}>
          <div className="requirements-scroll">
            <div className="requirements-grid">
              <strong className="requirements-corner">Role</strong>
              {dates.map((date) => <span className="requirements-day" key={date}>{dayLabel.format(dateAtNoon(date))}<small>{dateAtNoon(date).getDate()}</small></span>)}
              {workforceRoles.map((itemRole) => (
                <div className="requirements-row" key={itemRole}>
                  <strong>{itemRole}</strong>
                  {dates.map((date) => {
                    const requirement = requirements.find((item) => item.date === date && item.role === itemRole)
                    return <input key={date} type="number" min="0" max="99" step="1" required value={requirement?.required ?? 0} aria-label={`${itemRole} required on ${date}`} onChange={(event) => updateRequired(date, itemRole, event.target.value)} />
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="requirements-meta">
            <label><span>Effective from</span><input type="date" required value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} /></label>
            <label className="requirements-reason"><span>Reason for change <b>Required</b></span><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Example: Friday event needs higher floor coverage" /></label>
          </div>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <div className="modal-actions modal-actions--end">
            <button className="button button--ghost" type="button" onClick={onClose}>Cancel</button>
            <button className="button button--primary" type="submit"><Check size={17} />Save requirements</button>
          </div>
        </form>
      </section>
    </div>
  )
}

function auditActionLabel(action: RosterAuditEvent['action']): string {
  const labels: Record<RosterAuditEvent['action'], string> = {
    created: 'Weekly draft created',
    copied: 'Previous week copied',
    'assignment-added': 'Assignment added',
    'assignment-changed': 'Assignment changed',
    'assignment-removed': 'Assignment removed',
    published: 'Schedule published',
    'requirements-updated': 'Staffing requirements updated',
    'manager-messaged': 'Branch Manager messaged',
    'follow-up-created': 'CEO follow-up task created',
    'assignment-acknowledged': 'Assignment acknowledged',
    'assignment-change-requested': 'Assignment change requested',
    'acknowledgement-reminder-recorded': 'Acknowledgement reminder recorded',
  }
  return labels[action]
}

interface AuditTrailPanelProps {
  roster: WeeklyRoster
  onClose: () => void
}

function AuditTrailPanel({ roster, onClose }: AuditTrailPanelProps) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card modal-card--audit" role="dialog" aria-modal="true" aria-labelledby="audit-title">
        <header className="modal-header">
          <div><span className="eyebrow">Schedule evidence</span><h2 id="audit-title">Complete audit trail</h2><p>Who changed what, when, and why for roster version {roster.version}.</p></div>
          <button className="icon-button" type="button" aria-label="Close audit trail" onClick={onClose}><X size={20} /></button>
        </header>
        <div className="audit-list">
          {[...roster.audit].reverse().map((event) => (
            <article key={event.id}>
              <span className="audit-icon"><FileClock size={18} /></span>
              <div><strong>{auditActionLabel(event.action)}</strong><span>{event.actor} · roster v{event.version}{event.requirementVersion ? ` · requirement v${event.requirementVersion}` : ''}</span>{event.reason ? <p>{event.reason}</p> : null}</div>
              <time dateTime={event.at}>{new Date(event.at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</time>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

interface ExecutiveFollowUpPanelProps {
  roster: WeeklyRoster
  summary: ExecutiveFollowUpSummary
  onClose: () => void
  onRecord: (action: 'message' | 'task', note: string, dueDate?: string) => void
}

function ExecutiveFollowUpPanel({ roster, summary, onClose, onRecord }: ExecutiveFollowUpPanelProps) {
  const [action, setAction] = useState<'message' | 'task'>('message')
  const [note, setNote] = useState(summary.nextAction)
  const today = toDateKey(new Date())
  const [dueDate, setDueDate] = useState(addDays(today, 1))
  const [error, setError] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      onRecord(action, note, action === 'task' ? dueDate : undefined)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to record this follow-up.')
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card modal-card--executive" role="dialog" aria-modal="true" aria-labelledby="executive-title">
        <header className="modal-header">
          <div><span className="eyebrow">Prototype · CEO evidence view</span><h2 id="executive-title">Branch follow-up</h2><p>Objective schedule signals for {roster.branchName}. This does not infer effort from missing activity.</p></div>
          <button className="icon-button" type="button" aria-label="Close CEO follow-up" onClick={onClose}><X size={20} /></button>
        </header>
        <div className="executive-owner">
          <div className="avatar">AM</div><div><span>Accountable Branch Manager</span><strong>{summary.accountableManager}</strong></div>
          <span className="evidence-state" data-state={summary.publicationState}>{summary.publicationLabel} · deadline {new Date(summary.dueDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
        </div>
        <div className="executive-signals">
          <article><span>Coverage gap</span><strong>{summary.coverageGapCount}</strong><small>Uncovered role-shifts</small></article>
          <article><span>Overdue response</span><strong>{summary.pendingAcknowledgementCount}</strong><small>Past reminder threshold</small></article>
          <article><span>Change requests</span><strong>{summary.changeRequestCount}</strong><small>Team-member requests</small></article>
        </div>
        <div className="manager-evidence">
          <ListChecks size={19} /><div><span>Last recorded manager action</span><strong>{summary.lastManagerAction}</strong><small>{new Date(summary.lastManagerActionAt).toLocaleString()}</small></div>
        </div>
        <div className="recommended-action"><strong>Recommended next action</strong><p>{summary.nextAction}</p></div>
        {summary.latestFollowUp ? <div className="latest-follow-up"><Check size={17} /><span>Latest: {summary.latestFollowUp.action === 'message' ? 'message recorded' : `task due ${summary.latestFollowUp.dueDate}`} · {summary.latestFollowUp.note}</span></div> : null}
        <div className="integration-note"><ShieldCheck size={16} /><span>This prototype records outreach evidence only. Slack delivery requires the secure notification integration.</span></div>
        <form className="follow-up-form" onSubmit={submit}>
          <div className="action-toggle" aria-label="Follow-up type">
            <button type="button" className={action === 'message' ? 'active' : ''} onClick={() => setAction('message')}><MessageSquare size={17} />Message manager</button>
            <button type="button" className={action === 'task' ? 'active' : ''} onClick={() => setAction('task')}><ClipboardCheck size={17} />Create follow-up task</button>
          </div>
          <label><span>Specific follow-up note</span><textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} /></label>
          {action === 'task' ? <label className="follow-up-due"><span>Due date</span><input type="date" min={today} required value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label> : null}
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <div className="modal-actions modal-actions--end">
            <button className="button button--ghost" type="button" onClick={onClose}>Cancel</button>
            <button className="button button--primary" type="submit">{action === 'message' ? <MessageSquare size={17} /> : <ClipboardCheck size={17} />}{action === 'message' ? 'Record message' : 'Create task'}</button>
          </div>
        </form>
      </section>
    </div>
  )
}

export interface WeeklySchedulePageProps {
  service: WorkforceService
}

export function WeeklySchedulePage({ service }: WeeklySchedulePageProps) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [roster, setRoster] = useState(() => service.getRoster(weekStart))
  const [selectedDay, setSelectedDay] = useState(weekStart)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<'All' | WorkforceRole>('All')
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [publishOpen, setPublishOpen] = useState(false)
  const [requirementsOpen, setRequirementsOpen] = useState(false)
  const [auditOpen, setAuditOpen] = useState(false)
  const [executiveOpen, setExecutiveOpen] = useState(false)
  const [responseQueueOpen, setResponseQueueOpen] = useState(false)
  const [memberPreviewOpen, setMemberPreviewOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const teamMembers = useMemo(() => service.getTeamMembers(), [service])

  useEffect(() => {
    setRoster(service.getRoster(weekStart))
    setSelectedDay(weekStart)
    setMessage('')
    setRequirementsOpen(false)
    setAuditOpen(false)
    setExecutiveOpen(false)
    setResponseQueueOpen(false)
    setMemberPreviewOpen(false)
  }, [service, weekStart])

  const dates = weekDates(weekStart)
  const coverage = useMemo(() => getCoverage(roster), [roster])
  const issues = useMemo(() => service.validateRoster(roster), [roster, service])
  const executiveSummary = useMemo(() => service.getExecutiveFollowUp(weekStart), [roster, service, weekStart])
  const responseQueue = useMemo(() => service.getResponseQueue(weekStart), [roster, service, weekStart])
  const openGaps = coverage.reduce((sum, item) => sum + item.gap, 0)
  const required = coverage.reduce((sum, item) => sum + item.required, 0)
  const scheduled = coverage.reduce((sum, item) => sum + item.scheduled, 0)
  const coveragePercent = required ? Math.round((scheduled / required) * 100) : 100
  const pendingAcknowledgements = roster.status === 'published'
    ? roster.assignments.filter((item) => item.response === 'assigned').length
    : 0
  const filteredMembers = teamMembers.filter((member) => {
    const matchesRole = role === 'All' || member.role === role
    const query = search.trim().toLowerCase()
    return matchesRole && (!query || member.name.toLowerCase().includes(query) || member.role.toLowerCase().includes(query))
  })
  const selectedCoverage = coverage.filter((item) => item.date === selectedDay)

  function saveAssignment(input: AssignmentInput) {
    const next = service.upsertAssignment(weekStart, input)
    setRoster(next)
    setEditor(null)
    setMessage(next.status === 'published' ? `Published roster updated to version ${next.version}. The affected assignment is pending acknowledgement.` : 'Draft shift saved.')
  }

  function removeAssignment(assignmentId: string, reason?: string) {
    const next = service.removeAssignment(weekStart, assignmentId, reason)
    setRoster(next)
    setEditor(null)
    setMessage(next.status === 'published' ? `Published roster updated to version ${next.version}.` : 'Draft shift removed.')
  }

  function publish(reason?: string) {
    const next = service.publishRoster(weekStart, reason)
    setRoster(next)
    setPublishOpen(false)
    setMessage(`Roster version ${next.version} published. ${next.assignments.length} assignment responses are now pending.`)
  }

  function copyPrevious() {
    const next = service.copyPreviousWeek(weekStart)
    setRoster(next)
    setMessage('Previous week copied into a new draft. Review leave, eligibility, and coverage before publishing.')
  }

  function saveRequirements(requirements: StaffingRequirement[], effectiveFrom: string, reason: string) {
    const next = service.saveRequirements(weekStart, requirements, effectiveFrom, reason)
    setRoster(next)
    setRequirementsOpen(false)
    setMessage(`Staffing requirements saved as version ${next.requirementVersion}. Coverage has been recalculated.`)
  }

  function recordExecutiveFollowUp(action: 'message' | 'task', note: string, dueDate?: string) {
    const next = service.recordExecutiveFollowUp(weekStart, action, note, dueDate)
    setRoster(next)
    setMessage(action === 'message' ? 'Manager message recorded in the audit trail.' : `CEO follow-up task recorded for ${dueDate}.`)
  }

  function respondToAssignment(
    teamMemberId: string,
    assignmentId: string,
    response: 'acknowledged' | 'change-requested',
    note?: string,
  ) {
    const next = service.respondToAssignment(weekStart, teamMemberId, assignmentId, response, note)
    setRoster(next)
    setMessage(response === 'acknowledged' ? 'Assignment receipt acknowledged.' : 'Schedule change request added to the Branch Manager queue.')
  }

  function recordResponseReminder(assignmentId: string) {
    const next = service.recordResponseReminder(weekStart, assignmentId)
    setRoster(next)
    setMessage('Reminder evidence recorded. No notification was sent by this prototype.')
  }

  function editResponseAssignment(assignment: ShiftAssignment) {
    setResponseQueueOpen(false)
    setEditor({ assignment, teamMemberId: assignment.teamMemberId, date: assignment.date })
  }

  return (
    <div className="app-shell">
      <aside className={menuOpen ? 'sidebar sidebar--open' : 'sidebar'}>
        <div className="brand"><span>V</span><div><strong>VIP Club</strong><small>Internal</small></div><button className="sidebar-close" type="button" aria-label="Close navigation" onClick={() => setMenuOpen(false)}><X size={19} /></button></div>
        <nav aria-label="Manager navigation">
          <a href="#overview"><LayoutDashboard size={19} />Overview</a>
          <a className="active" href="#schedule" aria-current="page"><CalendarDays size={19} />Weekly schedule</a>
          <a href="#coverage"><CircleGauge size={19} />Coverage <b>{openGaps}</b></a>
          <a href="#attendance"><ClipboardCheck size={19} />Attendance</a>
          <a href="#team"><Users size={19} />Team members</a>
        </nav>
        <div className="sidebar-foot">
          <div className="avatar">AM</div>
          <div><strong>{roster.managerName}</strong><span>Branch Manager</span></div>
          <MoreHorizontal size={18} />
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <button className="icon-button mobile-menu" type="button" aria-label="Toggle navigation" onClick={() => setMenuOpen((current) => !current)}><Menu size={21} /></button>
          <div className="branch-scope"><span className="scope-mark">CB</span><div><strong>{roster.branchName}</strong><small>Authorized branch scope</small></div></div>
          <div className="topbar-actions"><button className="icon-button" type="button" aria-label="Notifications"><Bell size={20} /><i /></button><div className="avatar avatar--small">AM</div></div>
        </header>

        <main id="schedule">
          <section className="page-heading">
            <div>
              <span className="eyebrow">Workforce planning</span>
              <h1>Weekly schedule</h1>
              <p>Assign every team member, confirm minimum coverage, then publish one authoritative roster.</p>
            </div>
            <div className="heading-actions">
              <button className="button button--secondary" type="button" onClick={copyPrevious}><Copy size={17} />Copy previous week</button>
              {roster.status === 'published'
                ? <span className="published-button"><Check size={17} />Published v{roster.version}</span>
                : <button className="button button--primary" type="button" onClick={() => setPublishOpen(true)}><Send size={17} />Review & publish</button>}
            </div>
          </section>

          <section className="control-bar" aria-label="Schedule controls">
            <div className="week-picker">
              <button className="icon-button" type="button" aria-label="Previous week" onClick={() => setWeekStart(addDays(weekStart, -7))}><ChevronLeft size={19} /></button>
              <div><CalendarDays size={18} /><strong>{formatWeek(weekStart)}</strong><span>2026</span></div>
              <button className="icon-button" type="button" aria-label="Next week" onClick={() => setWeekStart(addDays(weekStart, 7))}><ChevronRight size={19} /></button>
            </div>
            <div className="roster-state" data-status={roster.status}><span>{statusText(roster)}</span><small>Due {shortDate.format(new Date(roster.publicationDue))}, 18:00</small></div>
          </section>

          {message ? <div className="status-message" role="status"><Check size={18} /><span>{message}</span><button type="button" aria-label="Dismiss message" onClick={() => setMessage('')}><X size={17} /></button></div> : null}

          <section className="planning-actions" aria-label="Planning and accountability tools">
            <button type="button" onClick={() => setRequirementsOpen(true)}><span className="planning-action-icon"><Settings2 size={19} /></span><span><strong>Staffing requirements</strong><small>Template v{roster.requirementVersion} · effective {shortDate.format(dateAtNoon(roster.requirementsEffectiveFrom))}</small></span><ChevronRight size={18} /></button>
            <button type="button" onClick={() => setResponseQueueOpen(true)} data-tone={responseQueue.some((item) => item.assignment.response === 'change-requested' || item.overdue) ? 'attention' : 'neutral'}><span className="planning-action-icon"><Inbox size={19} /></span><span><strong>Response queue</strong><small>{roster.status === 'published' ? `${responseQueue.length} unresolved · ${roster.assignments.length - responseQueue.length} acknowledged` : 'Available after publication'}</small></span><ChevronRight size={18} /></button>
            <button type="button" onClick={() => setAuditOpen(true)}><span className="planning-action-icon"><FileClock size={19} /></span><span><strong>Audit evidence</strong><small>{roster.audit.length} recorded schedule events</small></span><ChevronRight size={18} /></button>
            <button type="button" onClick={() => setExecutiveOpen(true)} data-tone={executiveSummary.publicationState === 'draft-overdue' || openGaps ? 'attention' : 'neutral'}><span className="planning-action-icon"><CircleGauge size={19} /></span><span><strong>CEO follow-up</strong><small>{executiveSummary.publicationLabel}</small></span><ChevronRight size={18} /></button>
          </section>

          <section className="metric-grid" aria-label="Weekly schedule summary">
            <article><div className="metric-icon metric-icon--blue"><Users size={20} /></div><div><span>Team members</span><strong>{teamMembers.filter((member) => member.active).length}</strong><small>Active in this branch</small></div></article>
            <article><div className="metric-icon metric-icon--violet"><CalendarDays size={20} /></div><div><span>Weekly shifts</span><strong>{roster.assignments.length}</strong><small>{roster.status === 'draft' ? 'Draft assignments' : 'Published assignments'}</small></div></article>
            <article><div className="metric-icon metric-icon--green"><CircleGauge size={20} /></div><div><span>Planned coverage</span><strong>{coveragePercent}%</strong><small>{scheduled} scheduled / {required} required</small></div></article>
            <article data-tone={openGaps ? 'warning' : 'healthy'}><div className="metric-icon metric-icon--amber"><AlertTriangle size={20} /></div><div><span>Open coverage gaps</span><strong>{openGaps}</strong><small>{pendingAcknowledgements ? `${pendingAcknowledgements} acknowledgements pending` : 'Review before publish'}</small></div></article>
          </section>

          <div className="planner-layout">
            <section className="schedule-card">
              <header className="card-header">
                <div><h2>Team roster</h2><p>Click any day to add or edit a shift.</p></div>
                <div className="filters">
                  <label className="search-field"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search team" aria-label="Search team members" /></label>
                  <select value={role} onChange={(event) => setRole(event.target.value as 'All' | WorkforceRole)} aria-label="Filter by role">
                    <option value="All">All roles</option>
                    {workforceRoles.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
              </header>
              <div className="schedule-scroll">
                <div className="schedule-grid" style={{ '--team-count': filteredMembers.length } as CSSProperties}>
                  <div className="grid-corner"><span>Team member</span><small>{filteredMembers.length} shown</small></div>
                  {dates.map((date) => {
                    const dayGaps = coverage.filter((item) => item.date === date).reduce((sum, item) => sum + item.gap, 0)
                    return (
                      <button key={date} type="button" className={selectedDay === date ? 'day-heading selected' : 'day-heading'} onClick={() => setSelectedDay(date)}>
                        <span>{dayLabel.format(dateAtNoon(date))}</span><strong>{dateAtNoon(date).getDate()}</strong>{dayGaps ? <small>{dayGaps} gap</small> : <small className="covered">Covered</small>}
                      </button>
                    )
                  })}
                  {filteredMembers.map((member) => (
                    <div className="schedule-row" key={member.id}>
                      <div className="member-cell"><span className="avatar avatar--member">{member.initials}</span><div><strong>{member.name}</strong><small>{member.role}</small></div></div>
                      {dates.map((date) => {
                        const item = roster.assignments.find((candidate) => candidate.teamMemberId === member.id && candidate.date === date)
                        const unavailable = member.unavailableDates.includes(date)
                        return (
                          <div className="shift-cell" key={date}>
                            {item ? (
                              <button className="shift-pill" type="button" onClick={() => setEditor({ assignment: item, teamMemberId: member.id, date })}>
                                <span>{item.start}–{item.end}</span><small>{item.shift}</small>{roster.status === 'published' ? <i data-response={item.response}>{responseText(item.response)}</i> : null}
                              </button>
                            ) : unavailable ? (
                              <span className="unavailable-cell">Unavailable</span>
                            ) : (
                              <button className="add-shift" type="button" aria-label={`Add ${member.name} shift on ${date}`} onClick={() => setEditor({ teamMemberId: member.id, date })}><Plus size={16} /><span>Add</span></button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
              {!filteredMembers.length ? <div className="empty-state"><Users size={24} /><strong>No matching team members</strong><span>Clear search or choose another role.</span></div> : null}
            </section>

            <aside className="coverage-card" id="coverage">
              <header className="card-header"><div><span className="eyebrow">Daily check</span><h2>{longDate.format(dateAtNoon(selectedDay))}</h2></div><span className={selectedCoverage.some((item) => item.gap) ? 'risk-badge' : 'risk-badge risk-badge--healthy'}>{selectedCoverage.reduce((sum, item) => sum + item.gap, 0)} open</span></header>
              <div className="coverage-list">
                {selectedCoverage.map((item) => {
                  const percent = item.required ? Math.min(100, Math.round((item.scheduled / item.required) * 100)) : 100
                  return (
                    <article key={item.role}>
                      <header><strong>{item.role}</strong><span data-tone={item.gap ? 'warning' : 'healthy'}>{item.scheduled}/{item.required}</span></header>
                      <div className="progress-track"><span style={{ width: `${percent}%` }} data-tone={item.gap ? 'warning' : 'healthy'} /></div>
                      <small>{item.gap ? `${item.gap} more needed` : 'Minimum covered'}</small>
                    </article>
                  )
                })}
              </div>
              {selectedCoverage.some((item) => item.gap) ? <div className="coverage-callout"><AlertTriangle size={18} /><div><strong>Coverage action needed</strong><span>Assign an eligible team member or record a permitted shortage reason at publication.</span></div></div> : <div className="coverage-callout coverage-callout--healthy"><ShieldCheck size={18} /><div><strong>Minimum covered</strong><span>This day passes planned coverage checks.</span></div></div>}
              <div className="deadline-card"><Clock3 size={18} /><div><strong>Publication evidence</strong><span>{roster.status === 'published' && roster.publishedAt ? `Published ${new Date(roster.publishedAt).toLocaleString()}` : `Due ${new Date(roster.publicationDue).toLocaleString()}`}</span></div></div>
            </aside>
          </div>

          <section className="activity-card">
            <header className="card-header"><div><h2>Recent schedule activity</h2><p>Versioned evidence for manager and CEO follow-up.</p></div><button className="button button--ghost" type="button" onClick={() => setAuditOpen(true)}>View audit trail</button></header>
            <div className="activity-list">
              {roster.audit.slice(-4).reverse().map((event) => (
                <article key={event.id}><span className="activity-mark"><ClipboardCheck size={17} /></span><div><strong>{event.action.replaceAll('-', ' ')}</strong><small>{event.actor} · version {event.version}{event.reason ? ` · ${event.reason}` : ''}</small></div><time>{new Date(event.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></article>
              ))}
            </div>
          </section>
        </main>
      </div>

      {editor ? <AssignmentEditor state={editor} roster={roster} teamMembers={teamMembers} onClose={() => setEditor(null)} onSave={saveAssignment} onRemove={removeAssignment} /> : null}
      {publishOpen ? <PublishReview roster={roster} issues={issues} onClose={() => setPublishOpen(false)} onPublish={publish} /> : null}
      {requirementsOpen ? <StaffingRequirementsEditor roster={roster} onClose={() => setRequirementsOpen(false)} onSave={saveRequirements} /> : null}
      {auditOpen ? <AuditTrailPanel roster={roster} onClose={() => setAuditOpen(false)} /> : null}
      {executiveOpen ? <ExecutiveFollowUpPanel roster={roster} summary={executiveSummary} onClose={() => setExecutiveOpen(false)} onRecord={recordExecutiveFollowUp} /> : null}
      {responseQueueOpen ? <ResponseQueuePanel roster={roster} queue={responseQueue} onClose={() => setResponseQueueOpen(false)} onEdit={editResponseAssignment} onReminder={recordResponseReminder} onOpenMemberPreview={() => { setResponseQueueOpen(false); setMemberPreviewOpen(true) }} /> : null}
      {memberPreviewOpen ? <TeamMemberSchedulePanel roster={roster} teamMembers={teamMembers} onClose={() => setMemberPreviewOpen(false)} onRespond={respondToAssignment} /> : null}
    </div>
  )
}
