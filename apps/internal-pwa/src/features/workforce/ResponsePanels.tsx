import { Bell, Check, Clock3, Eye, MessageSquare, Pencil, User, X } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import type { ResponseQueueItem, ShiftAssignment, TeamMember, WeeklyRoster } from './models'

const responseDate = new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' })

function dateAtNoon(value: string): Date {
  return new Date(`${value}T12:00:00`)
}

interface ResponseQueuePanelProps {
  roster: WeeklyRoster
  queue: ResponseQueueItem[]
  onClose: () => void
  onEdit: (assignment: ShiftAssignment) => void
  onReminder: (assignmentId: string) => void
  onOpenMemberPreview: () => void
}

export function ResponseQueuePanel({ roster, queue, onClose, onEdit, onReminder, onOpenMemberPreview }: ResponseQueuePanelProps) {
  const [error, setError] = useState('')
  const pending = roster.status === 'published' ? roster.assignments.filter((item) => item.response === 'assigned').length : 0
  const acknowledged = roster.status === 'published' ? roster.assignments.filter((item) => item.response === 'acknowledged').length : 0
  const changeRequests = roster.status === 'published' ? roster.assignments.filter((item) => item.response === 'change-requested').length : 0
  const overdue = queue.filter((item) => item.overdue).length

  function recordReminder(assignmentId: string) {
    try {
      onReminder(assignmentId)
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to record this reminder.')
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card modal-card--responses" role="dialog" aria-modal="true" aria-labelledby="response-queue-title">
        <header className="modal-header">
          <div>
            <span className="eyebrow">Manager action queue</span>
            <h2 id="response-queue-title">Assignment responses</h2>
            <p>Acknowledgement proves receipt only. Attendance still requires verified attendance evidence.</p>
          </div>
          <button className="icon-button" type="button" aria-label="Close assignment responses" onClick={onClose}><X size={20} /></button>
        </header>

        <div className="response-summary">
          <article><span>Pending</span><strong>{pending}</strong><small>{overdue} past reminder threshold</small></article>
          <article data-tone="healthy"><span>Acknowledged</span><strong>{acknowledged}</strong><small>Receipt recorded</small></article>
          <article data-tone={changeRequests ? 'warning' : 'neutral'}><span>Change requests</span><strong>{changeRequests}</strong><small>Manager review needed</small></article>
        </div>

        <div className="response-toolbar">
          <div><Eye size={17} /><span><strong>Permission-safe preview</strong><small>Production identity comes from the signed-in team member.</small></span></div>
          <button className="button button--secondary" type="button" onClick={onOpenMemberPreview}><User size={16} />Open team-member preview</button>
        </div>

        {roster.status !== 'published' ? (
          <div className="response-empty"><Clock3 size={23} /><strong>Responses begin after publication</strong><span>Draft assignments are not yet an attendance expectation and are not visible in the team-member schedule.</span></div>
        ) : queue.length ? (
          <div className="response-list">
            {queue.map(({ assignment, teamMember, overdue: isOverdue }) => (
              <article key={assignment.id} data-tone={assignment.response === 'change-requested' ? 'warning' : isOverdue ? 'danger' : 'neutral'}>
                <span className="avatar avatar--member">{teamMember.initials}</span>
                <div className="response-detail">
                  <header><strong>{teamMember.name}</strong><span>{assignment.response === 'change-requested' ? 'Change requested' : isOverdue ? 'Acknowledgement overdue' : 'Pending acknowledgement'}</span></header>
                  <p>{responseDate.format(dateAtNoon(assignment.date))} · {assignment.start}–{assignment.end} · {assignment.role}</p>
                  {assignment.responseNote ? <blockquote>{assignment.responseNote}</blockquote> : null}
                  {assignment.response === 'assigned' && assignment.responseDueAt ? <small>Reminder threshold {new Date(assignment.responseDueAt).toLocaleString()}</small> : null}
                  {assignment.lastReminderAt ? <small>Reminder evidence recorded {new Date(assignment.lastReminderAt).toLocaleString()} · {assignment.reminderCount} total</small> : null}
                </div>
                <div className="response-actions">
                  {assignment.response === 'change-requested'
                    ? <button className="button button--primary" type="button" onClick={() => onEdit(assignment)}><Pencil size={15} />Edit schedule</button>
                    : <button className="button button--secondary" type="button" onClick={() => recordReminder(assignment.id)}><Bell size={15} />Record reminder</button>}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="response-empty"><Check size={23} /><strong>All assignments acknowledged</strong><span>No pending acknowledgements or change requests remain for this roster version.</span></div>
        )}
        {error ? <p className="form-error response-panel-error" role="alert">{error}</p> : null}
        <div className="integration-note response-integration-note"><Bell size={16} /><span>Reminder actions record audit evidence only. This prototype does not send a notification.</span></div>
      </section>
    </div>
  )
}

interface TeamMemberSchedulePanelProps {
  roster: WeeklyRoster
  teamMembers: TeamMember[]
  onClose: () => void
  onRespond: (
    teamMemberId: string,
    assignmentId: string,
    response: 'acknowledged' | 'change-requested',
    note?: string,
  ) => void
}

export function TeamMemberSchedulePanel({ roster, teamMembers, onClose, onRespond }: TeamMemberSchedulePanelProps) {
  const assignedMemberIds = useMemo(() => new Set(roster.assignments.map((item) => item.teamMemberId)), [roster.assignments])
  const availableMembers = teamMembers.filter((member) => member.active && assignedMemberIds.has(member.id))
  const [teamMemberId, setTeamMemberId] = useState(availableMembers[0]?.id ?? '')
  const [requestAssignmentId, setRequestAssignmentId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const member = availableMembers.find((item) => item.id === teamMemberId)
  const assignments = roster.status === 'published'
    ? roster.assignments.filter((item) => item.teamMemberId === teamMemberId).sort((left, right) => left.date.localeCompare(right.date))
    : []

  function acknowledge(assignmentId: string) {
    try {
      onRespond(teamMemberId, assignmentId, 'acknowledged')
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to acknowledge this assignment.')
    }
  }

  function requestChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!requestAssignmentId) return
    try {
      onRespond(teamMemberId, requestAssignmentId, 'change-requested', note)
      setRequestAssignmentId(null)
      setNote('')
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to request this schedule change.')
    }
  }

  function selectMember(id: string) {
    setTeamMemberId(id)
    setRequestAssignmentId(null)
    setNote('')
    setError('')
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card modal-card--member-preview" role="dialog" aria-modal="true" aria-labelledby="member-preview-title">
        <header className="modal-header">
          <div>
            <span className="eyebrow">Prototype · team-member self-service</span>
            <h2 id="member-preview-title">My published schedule</h2>
            <p>The selector exists only for prototype review. Production must derive identity and own-assignment scope from authentication.</p>
          </div>
          <button className="icon-button" type="button" aria-label="Close team-member schedule preview" onClick={onClose}><X size={20} /></button>
        </header>

        <label className="member-preview-select">
          <span>Preview as</span>
          <select value={teamMemberId} onChange={(event) => selectMember(event.target.value)}>
            {availableMembers.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.role}</option>)}
          </select>
        </label>

        {roster.status !== 'published' ? (
          <div className="response-empty"><Clock3 size={23} /><strong>No published schedule yet</strong><span>Team members see only the authoritative published roster, never the manager's draft.</span></div>
        ) : assignments.length ? (
          <div className="member-assignment-list">
            {assignments.map((assignment) => (
              <article key={assignment.id} data-response={assignment.response}>
                <div className="member-shift-date"><span>{responseDate.format(dateAtNoon(assignment.date))}</span><strong>{assignment.start}–{assignment.end}</strong><small>{roster.branchName} · {assignment.shift}</small></div>
                <div className="member-response-state">
                  {assignment.response === 'acknowledged' ? <><Check size={17} /><span><strong>Acknowledged</strong><small>{assignment.respondedAt ? new Date(assignment.respondedAt).toLocaleString() : 'Receipt recorded'}</small></span></> : null}
                  {assignment.response === 'change-requested' ? <><MessageSquare size={17} /><span><strong>Change requested</strong><small>{assignment.responseNote}</small></span></> : null}
                  {assignment.response === 'assigned' ? <><Clock3 size={17} /><span><strong>Response pending</strong><small>Due {assignment.responseDueAt ? new Date(assignment.responseDueAt).toLocaleString() : 'after publication'}</small></span></> : null}
                </div>
                <div className="member-response-actions">
                  {assignment.response === 'assigned' ? <button className="button button--primary" type="button" onClick={() => acknowledge(assignment.id)}><Check size={15} />Acknowledge</button> : null}
                  {assignment.response !== 'change-requested' ? <button className="button button--secondary" type="button" onClick={() => { setRequestAssignmentId(assignment.id); setNote(''); setError('') }}><MessageSquare size={15} />Request change</button> : null}
                </div>
                {requestAssignmentId === assignment.id ? (
                  <form className="change-request-form" onSubmit={requestChange}>
                    <label><span>Why do you need a change?</span><textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Give the manager enough detail to act" /></label>
                    <div><button className="button button--ghost" type="button" onClick={() => setRequestAssignmentId(null)}>Cancel</button><button className="button button--primary" type="submit">Submit request</button></div>
                  </form>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="response-empty"><User size={23} /><strong>No assignments this week</strong><span>{member?.name ?? 'This team member'} has no published shifts in the selected week.</span></div>
        )}
        {error ? <p className="form-error response-panel-error" role="alert">{error}</p> : null}
      </section>
    </div>
  )
}
