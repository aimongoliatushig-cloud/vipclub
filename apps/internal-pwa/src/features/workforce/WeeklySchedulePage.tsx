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
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import {
  shiftTemplates,
  workforceRoles,
  type AssignmentInput,
  type ShiftAssignment,
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
  weekDates,
  type WorkforceService,
} from './workforceService'

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
  const [message, setMessage] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const teamMembers = useMemo(() => service.getTeamMembers(), [service])

  useEffect(() => {
    setRoster(service.getRoster(weekStart))
    setSelectedDay(weekStart)
    setMessage('')
  }, [service, weekStart])

  const dates = weekDates(weekStart)
  const coverage = useMemo(() => getCoverage(roster), [roster])
  const issues = useMemo(() => service.validateRoster(roster), [roster, service])
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
    setMessage(`Roster version ${next.version} published. ${next.assignments.length} team-member notifications are ready.`)
  }

  function copyPrevious() {
    const next = service.copyPreviousWeek(weekStart)
    setRoster(next)
    setMessage('Previous week copied into a new draft. Review leave, eligibility, and coverage before publishing.')
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
            <header className="card-header"><div><h2>Recent schedule activity</h2><p>Versioned evidence for manager and CEO follow-up.</p></div><button className="button button--ghost" type="button">View audit trail</button></header>
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
    </div>
  )
}
