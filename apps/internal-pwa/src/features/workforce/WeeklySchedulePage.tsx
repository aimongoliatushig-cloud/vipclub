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
  type AttendanceDecisionAction,
  type ExecutiveFollowUpSummary,
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
import {
  AttendanceReviewView,
  CoverageReadinessView,
  ManagerOverviewView,
  TeamMembersView,
  type ManagerView,
} from './ManagerWorkspaceViews'
import {
  attendanceDecisionLabels,
  auditActionLabels,
  assignmentResponseLabels,
  formatDate,
  formatDateTime,
  formatTime,
  roleLabels,
  rosterStatusLabels,
  shiftLabels,
} from './localization'

function formatWeek(weekStart: string): string {
  const end = addDays(weekStart, 6)
  return `${formatDate(weekStart, { month: 'short', day: 'numeric' })} – ${formatDate(end, { month: 'short', day: 'numeric' })}`
}

function statusText(roster: WeeklyRoster): string {
  return `${rosterStatusLabels[roster.status]} · хувилбар ${roster.version}`
}

function responseText(response: ShiftAssignment['response']): string {
  return assignmentResponseLabels[response]
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
      setError(caught instanceof Error ? caught.message : 'Энэ ээлжийг хадгалж чадсангүй.')
    }
  }

  function remove() {
    if (!state.assignment) return
    try {
      onRemove(state.assignment.id, reason)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Энэ ээлжийг хасаж чадсангүй.')
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="shift-editor-title">
        <header className="modal-header">
          <div>
            <span className="eyebrow">{state.assignment ? 'Ээлж засах' : 'Шинэ ээлж'}</span>
            <h2 id="shift-editor-title">{formatDate(state.date, { weekday: 'long', month: 'short', day: 'numeric' })}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Ээлж засварлагчийг хаах" onClick={onClose}><X size={20} /></button>
        </header>

        <form className="editor-form" onSubmit={submit}>
          <label>
            <span>Багийн гишүүн</span>
            <select value={teamMemberId} onChange={(event) => setTeamMemberId(event.target.value)}>
              {teamMembers.filter((member) => member.active).map((member) => (
                <option key={member.id} value={member.id}>{member.name} · {roleLabels[member.role]}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Ээлж</span>
            <select value={shift} onChange={(event) => setShift(event.target.value as ShiftTemplateName)}>
              {Object.entries(shiftTemplates).map(([name, times]) => (
                <option key={name} value={name}>{shiftLabels[name as ShiftTemplateName]} · {times.start}–{times.end}</option>
              ))}
            </select>
          </label>
          {isPublished ? (
            <label>
              <span>Нийтэлсэн хуваарийг өөрчлөх шалтгаан <b>Заавал</b></span>
              <textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Жишээ: зөвшөөрсөн чөлөөг нөхөн хуваарилах шаардлагатай" rows={3} />
            </label>
          ) : null}
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <div className="modal-actions">
            {state.assignment ? <button className="button button--danger" type="button" onClick={remove}>Ээлж хасах</button> : <span />}
            <div>
              <button className="button button--ghost" type="button" onClick={onClose}>Цуцлах</button>
              <button className="button button--primary" type="submit"><Check size={17} />Ээлж хадгалах</button>
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
      setError(caught instanceof Error ? caught.message : 'Энэ хуваарийг нийтэлж чадсангүй.')
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card modal-card--review" role="dialog" aria-modal="true" aria-labelledby="publish-review-title">
        <header className="modal-header">
          <div>
            <span className="eyebrow">Нийтлэхийн өмнөх хяналт</span>
            <h2 id="publish-review-title">{formatWeek(roster.weekStart)}-ны долоо хоног</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Нийтлэхийн өмнөх хяналтыг хаах" onClick={onClose}><X size={20} /></button>
        </header>
        <div className="review-summary">
          <article><Check size={18} /><div><strong>{roster.assignments.length} ээлж</strong><span>Зөвхөн идэвхтэй салбарын баг</span></div></article>
          <article data-tone={blockers.length ? 'danger' : 'healthy'}><ShieldCheck size={18} /><div><strong>{blockers.length} саад</strong><span>Эрх болон давхцлын шалгалт</span></div></article>
          <article data-tone={gaps.length ? 'warning' : 'healthy'}><AlertTriangle size={18} /><div><strong>{gaps.length} хангалтын дутагдал</strong><span>Шаардлагатай ба хуваарилсан</span></div></article>
        </div>

        {issues.length ? (
          <div className="issue-list" aria-label="Нийтлэхэд саад болж буй асуудлууд">
            {issues.map((issue, index) => (
              <div key={`${issue.code}-${issue.date}-${issue.role}-${index}`} data-tone={issue.severity === 'error' ? 'danger' : 'warning'}>
                <AlertTriangle size={17} /><span>{issue.message}</span>
              </div>
            ))}
          </div>
        ) : <div className="all-clear"><Check size={18} />Нийтлэх бүх шалгалтыг давлаа.</div>}

        {gaps.length ? (
          <label className="review-reason">
            <span>Доод хэмжээнээс дутуугаар нийтлэх шалтгаан <b>Заавал</b></span>
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} placeholder="Үйл ажиллагааны шийдвэр болон нөхөн бүрдүүлэх төлөвлөгөөг бичнэ үү" />
          </label>
        ) : null}
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="modal-actions modal-actions--end">
          <button className="button button--ghost" type="button" onClick={onClose}>Үргэлжлүүлэн засах</button>
          <button className="button button--primary" type="button" disabled={blockers.length > 0} onClick={publish}><Send size={17} />Хуваарь нийтлэх</button>
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
      setError(caught instanceof Error ? caught.message : 'Хүний нөөцийн шаардлагыг хадгалж чадсангүй.')
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card modal-card--requirements" role="dialog" aria-modal="true" aria-labelledby="requirements-title">
        <header className="modal-header">
          <div>
            <span className="eyebrow">Хүний нөөцийн загвар · хувилбар {roster.requirementVersion}</span>
            <h2 id="requirements-title">Шаардлагатай хүний доод тоо</h2>
            <p>Өдөр болон үүрэг тус бүрийн үйл ажиллагааны доод хэмжээг тогтооно. Өөрчлөлт хэрэгжих огноотой, бүртгэлтэй байна.</p>
          </div>
          <button className="icon-button" type="button" aria-label="Хүний нөөцийн шаардлагыг хаах" onClick={onClose}><X size={20} /></button>
        </header>
        <form className="requirements-form" onSubmit={submit}>
          <div className="requirements-scroll">
            <div className="requirements-grid">
              <strong className="requirements-corner">Үүрэг</strong>
              {dates.map((date) => <span className="requirements-day" key={date}>{formatDate(date, { weekday: 'short' })}<small>{new Date(`${date}T12:00:00`).getDate()}</small></span>)}
              {workforceRoles.map((itemRole) => (
                <div className="requirements-row" key={itemRole}>
                  <strong>{roleLabels[itemRole]}</strong>
                  {dates.map((date) => {
                    const requirement = requirements.find((item) => item.date === date && item.role === itemRole)
                    return <input key={date} type="number" min="0" max="99" step="1" required value={requirement?.required ?? 0} aria-label={`${date}-нд ${roleLabels[itemRole]} үүрэгт шаардлагатай хүний тоо`} onChange={(event) => updateRequired(date, itemRole, event.target.value)} />
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="requirements-meta">
            <label><span>Хэрэгжих огноо</span><input type="date" required value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} /></label>
            <label className="requirements-reason"><span>Өөрчлөх шалтгаан <b>Заавал</b></span><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Жишээ: Баасан гарагийн арга хэмжээнд илүү олон үйлчилгээний ажилтан хэрэгтэй" /></label>
          </div>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <div className="modal-actions modal-actions--end">
            <button className="button button--ghost" type="button" onClick={onClose}>Цуцлах</button>
            <button className="button button--primary" type="submit"><Check size={17} />Шаардлага хадгалах</button>
          </div>
        </form>
      </section>
    </div>
  )
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
          <div><span className="eyebrow">Хуваарийн баримт</span><h2 id="audit-title">Аудитын бүрэн түүх</h2><p>Хуваарийн {roster.version}-р хувилбарт хэн, юуг, хэзээ, яагаад өөрчилснийг харуулна.</p></div>
          <button className="icon-button" type="button" aria-label="Аудитын түүхийг хаах" onClick={onClose}><X size={20} /></button>
        </header>
        <div className="audit-list">
          {[...roster.audit].reverse().map((event) => (
            <article key={event.id}>
              <span className="audit-icon"><FileClock size={18} /></span>
              <div><strong>{auditActionLabels[event.action]}</strong><span>{event.actor} · хуваарь {event.version}-р хувилбар{event.requirementVersion ? ` · шаардлага ${event.requirementVersion}-р хувилбар` : ''}</span>{event.reason ? <p>{event.reason}</p> : null}</div>
              <time dateTime={event.at}>{formatDateTime(event.at)}</time>
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
      setError(caught instanceof Error ? caught.message : 'Энэ хяналтын үйлдлийг тэмдэглэж чадсангүй.')
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card modal-card--executive" role="dialog" aria-modal="true" aria-labelledby="executive-title">
        <header className="modal-header">
          <div><span className="eyebrow">Туршилтын хувилбар · Гүйцэтгэх захирлын баримтын харагдац</span><h2 id="executive-title">Салбарын хяналт</h2><p>{roster.branchName}-ын хуваарийн бодит баримтыг харуулна. Үйлдэл бүртгэгдээгүйгээс ажлын хүчин чармайлтыг таамаглахгүй.</p></div>
          <button className="icon-button" type="button" aria-label="Гүйцэтгэх захирлын хяналтыг хаах" onClick={onClose}><X size={20} /></button>
        </header>
        <div className="executive-owner">
          <div className="avatar">АМ</div><div><span>Хариуцсан салбарын менежер</span><strong>{summary.accountableManager}</strong></div>
          <span className="evidence-state" data-state={summary.publicationState}>{summary.publicationLabel} · эцсийн хугацаа {formatDateTime(summary.dueDate)}</span>
        </div>
        <div className="executive-signals">
          <article><span>Хангалтын дутагдал</span><strong>{summary.coverageGapCount}</strong><small>Хүн дутуу үүрэг-ээлж</small></article>
          <article><span>Хугацаа хэтэрсэн хариу</span><strong>{summary.pendingAcknowledgementCount}</strong><small>Сануулах хугацаа өнгөрсөн</small></article>
          <article><span>Өөрчлөх хүсэлт</span><strong>{summary.changeRequestCount}</strong><small>Багийн гишүүдийн хүсэлт</small></article>
        </div>
        <div className="manager-evidence">
          <ListChecks size={19} /><div><span>Менежерийн хамгийн сүүлд бүртгэсэн үйлдэл</span><strong>{summary.lastManagerAction}</strong><small>{formatDateTime(summary.lastManagerActionAt)}</small></div>
        </div>
        <div className="recommended-action"><strong>Санал болгож буй дараагийн алхам</strong><p>{summary.nextAction}</p></div>
        {summary.latestFollowUp ? <div className="latest-follow-up"><Check size={17} /><span>Сүүлийнх: {summary.latestFollowUp.action === 'message' ? 'мэдэгдлийн баримт тэмдэглэсэн' : `даалгаврын хугацаа ${summary.latestFollowUp.dueDate}`} · {summary.latestFollowUp.note}</span></div> : null}
        <div className="integration-note"><ShieldCheck size={16} /><span>Энэ туршилтын хувилбар зөвхөн холбогдсон баримтыг тэмдэглэнэ. Slack-аар илгээхийн тулд аюулгүй мэдэгдлийн интеграц шаардлагатай.</span></div>
        <form className="follow-up-form" onSubmit={submit}>
          <div className="action-toggle" aria-label="Хяналтын төрөл">
            <button type="button" className={action === 'message' ? 'active' : ''} onClick={() => setAction('message')}><MessageSquare size={17} />Менежерт мэдэгдэл тэмдэглэх</button>
            <button type="button" className={action === 'task' ? 'active' : ''} onClick={() => setAction('task')}><ClipboardCheck size={17} />Хяналтын даалгавар үүсгэх</button>
          </div>
          <label><span>Хяналтын тодорхой тайлбар</span><textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} /></label>
          {action === 'task' ? <label className="follow-up-due"><span>Дуусах огноо</span><input type="date" min={today} required value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label> : null}
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <div className="modal-actions modal-actions--end">
            <button className="button button--ghost" type="button" onClick={onClose}>Цуцлах</button>
            <button className="button button--primary" type="submit">{action === 'message' ? <MessageSquare size={17} /> : <ClipboardCheck size={17} />}{action === 'message' ? 'Мэдэгдэл тэмдэглэх' : 'Даалгавар үүсгэх'}</button>
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
  const [activeView, setActiveView] = useState<ManagerView>('overview')
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
  const dashboard = useMemo(() => service.getManagerDashboard(weekStart), [roster, service, weekStart])
  const readiness = useMemo(() => service.getReadiness(weekStart), [roster, service, weekStart])
  const attendanceExceptions = useMemo(() => service.getAttendanceExceptions(weekStart), [roster, service, weekStart])
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
    return matchesRole && (!query || member.name.toLowerCase().includes(query) || roleLabels[member.role].toLowerCase().includes(query))
  })
  const selectedCoverage = coverage.filter((item) => item.date === selectedDay)

  function saveAssignment(input: AssignmentInput) {
    const next = service.upsertAssignment(weekStart, input)
    setRoster(next)
    setEditor(null)
    setMessage(next.status === 'published' ? `Нийтэлсэн хуваарь ${next.version}-р хувилбар болж шинэчлэгдлээ. Өөрчилсөн ээлж баталгаажуулалт хүлээж байна.` : 'Ноорог ээлж хадгалагдлаа.')
  }

  function removeAssignment(assignmentId: string, reason?: string) {
    const next = service.removeAssignment(weekStart, assignmentId, reason)
    setRoster(next)
    setEditor(null)
    setMessage(next.status === 'published' ? `Нийтэлсэн хуваарь ${next.version}-р хувилбар болж шинэчлэгдлээ.` : 'Ноорог ээлж хасагдлаа.')
  }

  function publish(reason?: string) {
    const next = service.publishRoster(weekStart, reason)
    setRoster(next)
    setPublishOpen(false)
    setMessage(`Хуваарийн ${next.version}-р хувилбарыг нийтэллээ. ${next.assignments.length} ээлжийн хариу хүлээгдэж байна.`)
  }

  function copyPrevious() {
    const next = service.copyPreviousWeek(weekStart)
    setRoster(next)
    setMessage('Өмнөх долоо хоногийг шинэ ноорогт хууллаа. Нийтлэхийн өмнө чөлөө, эрх, хангалтыг шалгана уу.')
  }

  function saveRequirements(requirements: StaffingRequirement[], effectiveFrom: string, reason: string) {
    const next = service.saveRequirements(weekStart, requirements, effectiveFrom, reason)
    setRoster(next)
    setRequirementsOpen(false)
    setMessage(`Хүний нөөцийн шаардлагыг ${next.requirementVersion}-р хувилбараар хадгаллаа. Хангалтыг дахин тооцоолов.`)
  }

  function recordExecutiveFollowUp(action: 'message' | 'task', note: string, dueDate?: string) {
    const next = service.recordExecutiveFollowUp(weekStart, action, note, dueDate)
    setRoster(next)
    setMessage(action === 'message' ? 'Менежерт хүргэх мэдэгдлийн баримтыг аудитын түүхэнд тэмдэглэлээ.' : `Гүйцэтгэх захирлын хяналтын даалгаврыг ${dueDate}-нд дуусахаар тэмдэглэлээ.`)
  }

  function respondToAssignment(
    teamMemberId: string,
    assignmentId: string,
    response: 'acknowledged' | 'change-requested',
    note?: string,
  ) {
    const next = service.respondToAssignment(weekStart, teamMemberId, assignmentId, response, note)
    setRoster(next)
    setMessage(response === 'acknowledged' ? 'Ээлж хүлээн авснаа баталгаажууллаа.' : 'Хуваарь өөрчлөх хүсэлтийг салбарын менежерийн жагсаалтад нэмлээ.')
  }

  function recordResponseReminder(assignmentId: string) {
    const next = service.recordResponseReminder(weekStart, assignmentId)
    setRoster(next)
    setMessage('Сануулгын баримтыг тэмдэглэлээ. Энэ туршилтын хувилбараас мэдэгдэл илгээгээгүй.')
  }

  function editResponseAssignment(assignment: ShiftAssignment) {
    setResponseQueueOpen(false)
    setActiveView('schedule')
    setEditor({ assignment, teamMemberId: assignment.teamMemberId, date: assignment.date })
  }

  function navigate(view: ManagerView) {
    setActiveView(view)
    setMenuOpen(false)
  }

  function decideAttendance(exceptionId: string, decision: AttendanceDecisionAction, reason: string) {
    const next = service.decideAttendanceException(weekStart, exceptionId, decision, reason)
    setRoster(next)
    setMessage(`Ирцийн “${attendanceDecisionLabels[decision]}” шийдвэрийг тэмдэглэлээ. Эх хуваарь болон ирсэн баримтыг хэвээр хадгалав.`)
  }

  function overrideAvailability(teamMemberId: string, date: string, available: boolean, reason: string) {
    const next = service.overrideAvailability(weekStart, teamMemberId, date, available, reason)
    setRoster(next)
    setMessage(`${formatDate(date)}-ны ажиллах боломжийн өөрчлөлтийг тэмдэглэлээ. Хангалт болон ээлжийн шалгалтыг дахин тооцоолов.`)
  }

  return (
    <div className="app-shell">
      <aside className={menuOpen ? 'sidebar sidebar--open' : 'sidebar'}>
        <div className="brand"><span>V</span><div><strong>VIP Club</strong><small>Дотоод</small></div><button className="sidebar-close" type="button" aria-label="Навигацыг хаах" onClick={() => setMenuOpen(false)}><X size={19} /></button></div>
        <nav aria-label="Менежерийн навигац">
          <a className={activeView === 'overview' ? 'active' : ''} href="#overview" aria-current={activeView === 'overview' ? 'page' : undefined} onClick={(event) => { event.preventDefault(); navigate('overview') }}><LayoutDashboard size={19} />Тойм</a>
          <a className={activeView === 'schedule' ? 'active' : ''} href="#schedule" aria-current={activeView === 'schedule' ? 'page' : undefined} onClick={(event) => { event.preventDefault(); navigate('schedule') }}><CalendarDays size={19} />Долоо хоногийн хуваарь</a>
          <a className={activeView === 'coverage' ? 'active' : ''} href="#coverage" aria-current={activeView === 'coverage' ? 'page' : undefined} onClick={(event) => { event.preventDefault(); navigate('coverage') }}><CircleGauge size={19} />Хангалт <b>{openGaps}</b></a>
          <a className={activeView === 'attendance' ? 'active' : ''} href="#attendance" aria-current={activeView === 'attendance' ? 'page' : undefined} onClick={(event) => { event.preventDefault(); navigate('attendance') }}><ClipboardCheck size={19} />Ирц</a>
          <a className={activeView === 'team' ? 'active' : ''} href="#team" aria-current={activeView === 'team' ? 'page' : undefined} onClick={(event) => { event.preventDefault(); navigate('team') }}><Users size={19} />Багийн гишүүд</a>
        </nav>
        <div className="sidebar-foot">
          <div className="avatar">АМ</div>
          <div><strong>{roster.managerName}</strong><span>Салбарын менежер</span></div>
          <MoreHorizontal size={18} />
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <button className="icon-button mobile-menu" type="button" aria-label="Навигацыг нээх эсвэл хаах" onClick={() => setMenuOpen((current) => !current)}><Menu size={21} /></button>
          <div className="branch-scope"><span className="scope-mark">ТС</span><div><strong>{roster.branchName}</strong><small>Зөвшөөрөгдсөн салбарын хүрээ</small></div></div>
          <div className="topbar-actions"><button className="icon-button" type="button" aria-label={`${attendanceExceptions.filter((item) => item.status === 'open').length + responseQueue.length} нээлттэй мэдэгдэл`} onClick={() => navigate('attendance')}><Bell size={20} /><i /></button><div className="avatar avatar--small">АМ</div></div>
        </header>

        <main id={activeView}>
          {activeView === 'overview' ? <ManagerOverviewView roster={roster} dashboard={dashboard} readiness={readiness} openAttendance={attendanceExceptions.filter((item) => item.status === 'open').length} openResponses={responseQueue.length} openGaps={openGaps} message={message} onDismissMessage={() => setMessage('')} onNavigate={navigate} /> : null}
          {activeView === 'coverage' ? <CoverageReadinessView roster={roster} readiness={readiness} message={message} onDismissMessage={() => setMessage('')} onNavigate={navigate} /> : null}
          {activeView === 'attendance' ? <AttendanceReviewView roster={roster} exceptions={attendanceExceptions} teamMembers={teamMembers} message={message} onDismissMessage={() => setMessage('')} onDecision={decideAttendance} /> : null}
          {activeView === 'team' ? <TeamMembersView roster={roster} teamMembers={teamMembers} message={message} onDismissMessage={() => setMessage('')} onOverrideAvailability={overrideAvailability} /> : null}
          {activeView === 'schedule' ? <>
          <section className="page-heading">
            <div>
              <span className="eyebrow">Ажиллах хүчний төлөвлөлт</span>
              <h1>Долоо хоногийн хуваарь</h1>
              <p>Багийн гишүүдийг ээлжид хуваарилж, доод хангалтыг шалгасны дараа нэг албан ёсны хуваарь нийтэлнэ.</p>
            </div>
            <div className="heading-actions">
              <button className="button button--secondary" type="button" onClick={copyPrevious}><Copy size={17} />Өмнөх долоо хоногийг хуулах</button>
              {roster.status === 'published'
                ? <span className="published-button"><Check size={17} />Нийтэлсэн · хувилбар {roster.version}</span>
                : <button className="button button--primary" type="button" onClick={() => setPublishOpen(true)}><Send size={17} />Хянаж нийтлэх</button>}
            </div>
          </section>

          <section className="control-bar" aria-label="Хуваарийн удирдлага">
            <div className="week-picker">
              <button className="icon-button" type="button" aria-label="Өмнөх долоо хоног" onClick={() => setWeekStart(addDays(weekStart, -7))}><ChevronLeft size={19} /></button>
              <div><CalendarDays size={18} /><strong>{formatWeek(weekStart)}</strong><span>2026</span></div>
              <button className="icon-button" type="button" aria-label="Дараагийн долоо хоног" onClick={() => setWeekStart(addDays(weekStart, 7))}><ChevronRight size={19} /></button>
            </div>
            <div className="roster-state" data-status={roster.status}><span>{statusText(roster)}</span><small>Эцсийн хугацаа {formatDate(new Date(roster.publicationDue), { month: 'short', day: 'numeric' })}, 18:00</small></div>
          </section>

          {message ? <div className="status-message" role="status"><Check size={18} /><span>{message}</span><button type="button" aria-label="Мэдэгдлийг хаах" onClick={() => setMessage('')}><X size={17} /></button></div> : null}

          <section className="planning-actions" aria-label="Төлөвлөлт ба хариуцлагын хэрэгслүүд">
            <button type="button" onClick={() => setRequirementsOpen(true)}><span className="planning-action-icon"><Settings2 size={19} /></span><span><strong>Хүний нөөцийн шаардлага</strong><small>Загвар {roster.requirementVersion}-р хувилбар · {formatDate(roster.requirementsEffectiveFrom, { month: 'short', day: 'numeric' })}-с хэрэгжинэ</small></span><ChevronRight size={18} /></button>
            <button type="button" onClick={() => setResponseQueueOpen(true)} data-tone={responseQueue.some((item) => item.assignment.response === 'change-requested' || item.overdue) ? 'attention' : 'neutral'}><span className="planning-action-icon"><Inbox size={19} /></span><span><strong>Хариуны жагсаалт</strong><small>{roster.status === 'published' ? `${responseQueue.length} шийдвэрлээгүй · ${roster.assignments.length - responseQueue.length} баталгаажсан` : 'Нийтэлсний дараа ашиглана'}</small></span><ChevronRight size={18} /></button>
            <button type="button" onClick={() => setAuditOpen(true)}><span className="planning-action-icon"><FileClock size={19} /></span><span><strong>Аудитын баримт</strong><small>Хуваарийн {roster.audit.length} үйл явдал бүртгэгдсэн</small></span><ChevronRight size={18} /></button>
            <button type="button" onClick={() => setExecutiveOpen(true)} data-tone={executiveSummary.publicationState === 'draft-overdue' || openGaps ? 'attention' : 'neutral'}><span className="planning-action-icon"><CircleGauge size={19} /></span><span><strong>Гүйцэтгэх захирлын хяналт</strong><small>{executiveSummary.publicationLabel}</small></span><ChevronRight size={18} /></button>
          </section>

          <section className="metric-grid" aria-label="Долоо хоногийн хуваарийн хураангуй">
            <article><div className="metric-icon metric-icon--blue"><Users size={20} /></div><div><span>Багийн гишүүд</span><strong>{teamMembers.filter((member) => member.active).length}</strong><small>Энэ салбарт идэвхтэй</small></div></article>
            <article><div className="metric-icon metric-icon--violet"><CalendarDays size={20} /></div><div><span>Долоо хоногийн ээлж</span><strong>{roster.assignments.length}</strong><small>{roster.status === 'draft' ? 'Ноорог ээлжүүд' : 'Нийтэлсэн ээлжүүд'}</small></div></article>
            <article><div className="metric-icon metric-icon--green"><CircleGauge size={20} /></div><div><span>Төлөвлөсөн хангалт</span><strong>{coveragePercent}%</strong><small>{scheduled} хуваарилсан / {required} шаардлагатай</small></div></article>
            <article data-tone={openGaps ? 'warning' : 'healthy'}><div className="metric-icon metric-icon--amber"><AlertTriangle size={20} /></div><div><span>Нээлттэй хангалтын дутагдал</span><strong>{openGaps}</strong><small>{pendingAcknowledgements ? `${pendingAcknowledgements} баталгаажуулалт хүлээгдэж байна` : 'Нийтлэхийн өмнө хянана уу'}</small></div></article>
          </section>

          <div className="planner-layout">
            <section className="schedule-card">
              <header className="card-header">
                <div><h2>Багийн хуваарь</h2><p>Өдөр дээр дарж ээлж нэмэх эсвэл засна уу.</p></div>
                <div className="filters">
                  <label className="search-field"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Багийн гишүүн хайх" aria-label="Багийн гишүүдээс хайх" /></label>
                  <select value={role} onChange={(event) => setRole(event.target.value as 'All' | WorkforceRole)} aria-label="Үүргээр шүүх">
                    <option value="All">Бүх үүрэг</option>
                    {workforceRoles.map((item) => <option key={item} value={item}>{roleLabels[item]}</option>)}
                  </select>
                </div>
              </header>
              <div className="schedule-scroll">
                <div className="schedule-grid" style={{ '--team-count': filteredMembers.length } as CSSProperties}>
                  <div className="grid-corner"><span>Багийн гишүүн</span><small>{filteredMembers.length} харагдаж байна</small></div>
                  {dates.map((date) => {
                    const dayGaps = coverage.filter((item) => item.date === date).reduce((sum, item) => sum + item.gap, 0)
                    return (
                      <button key={date} type="button" className={selectedDay === date ? 'day-heading selected' : 'day-heading'} onClick={() => setSelectedDay(date)}>
                        <span>{formatDate(date, { weekday: 'short' })}</span><strong>{new Date(`${date}T12:00:00`).getDate()}</strong>{dayGaps ? <small>{dayGaps} дутуу</small> : <small className="covered">Бүрэн</small>}
                      </button>
                    )
                  })}
                  {filteredMembers.map((member) => (
                    <div className="schedule-row" key={member.id}>
                      <div className="member-cell"><span className="avatar avatar--member">{member.initials}</span><div><strong>{member.name}</strong><small>{roleLabels[member.role]}</small></div></div>
                      {dates.map((date) => {
                        const item = roster.assignments.find((candidate) => candidate.teamMemberId === member.id && candidate.date === date)
                        const unavailable = member.unavailableDates.includes(date)
                        return (
                          <div className="shift-cell" key={date}>
                            {item ? (
                              <button className="shift-pill" type="button" onClick={() => setEditor({ assignment: item, teamMemberId: member.id, date })}>
                                <span>{item.start}–{item.end}</span><small>{shiftLabels[item.shift]}</small>{roster.status === 'published' ? <i data-response={item.response}>{responseText(item.response)}</i> : null}
                              </button>
                            ) : unavailable ? (
                              <span className="unavailable-cell">Боломжгүй</span>
                            ) : (
                              <button className="add-shift" type="button" aria-label={`${member.name}-д ${date}-нд ээлж нэмэх`} onClick={() => setEditor({ teamMemberId: member.id, date })}><Plus size={16} /><span>Нэмэх</span></button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
              {!filteredMembers.length ? <div className="empty-state"><Users size={24} /><strong>Тохирох багийн гишүүн олдсонгүй</strong><span>Хайлтыг арилгах эсвэл өөр үүрэг сонгоно уу.</span></div> : null}
            </section>

            <aside className="coverage-card" id="coverage">
              <header className="card-header"><div><span className="eyebrow">Өдрийн шалгалт</span><h2>{formatDate(selectedDay, { weekday: 'long', month: 'short', day: 'numeric' })}</h2></div><span className={selectedCoverage.some((item) => item.gap) ? 'risk-badge' : 'risk-badge risk-badge--healthy'}>{selectedCoverage.reduce((sum, item) => sum + item.gap, 0)} нээлттэй</span></header>
              <div className="coverage-list">
                {selectedCoverage.map((item) => {
                  const percent = item.required ? Math.min(100, Math.round((item.scheduled / item.required) * 100)) : 100
                  return (
                    <article key={item.role}>
                      <header><strong>{roleLabels[item.role]}</strong><span data-tone={item.gap ? 'warning' : 'healthy'}>{item.scheduled}/{item.required}</span></header>
                      <div className="progress-track"><span style={{ width: `${percent}%` }} data-tone={item.gap ? 'warning' : 'healthy'} /></div>
                      <small>{item.gap ? `Дахин ${item.gap} хүн хэрэгтэй` : 'Доод хэмжээ бүрэн'}</small>
                    </article>
                  )
                })}
              </div>
              {selectedCoverage.some((item) => item.gap) ? <div className="coverage-callout"><AlertTriangle size={18} /><div><strong>Хангалтын арга хэмжээ шаардлагатай</strong><span>Эрх бүхий багийн гишүүнийг хуваарилах эсвэл нийтлэх үед зөвшөөрөгдсөн дутагдлын шалтгааныг тэмдэглэнэ үү.</span></div></div> : <div className="coverage-callout coverage-callout--healthy"><ShieldCheck size={18} /><div><strong>Доод хэмжээ бүрэн</strong><span>Энэ өдөр төлөвлөсөн хангалтын шалгалтыг давлаа.</span></div></div>}
              <div className="deadline-card"><Clock3 size={18} /><div><strong>Нийтлэлийн баримт</strong><span>{roster.status === 'published' && roster.publishedAt ? `${formatDateTime(roster.publishedAt)}-д нийтэлсэн` : `Эцсийн хугацаа ${formatDateTime(roster.publicationDue)}`}</span></div></div>
            </aside>
          </div>

          <section className="activity-card">
            <header className="card-header"><div><h2>Хуваарийн сүүлийн үйлдлүүд</h2><p>Менежер болон Гүйцэтгэх захирлын хяналтад зориулсан хувилбарт баримт.</p></div><button className="button button--ghost" type="button" onClick={() => setAuditOpen(true)}>Аудитын түүх харах</button></header>
            <div className="activity-list">
              {roster.audit.slice(-4).reverse().map((event) => (
                <article key={event.id}><span className="activity-mark"><ClipboardCheck size={17} /></span><div><strong>{auditActionLabels[event.action]}</strong><small>{event.actor} · {event.version}-р хувилбар{event.reason ? ` · ${event.reason}` : ''}</small></div><time>{formatTime(event.at)}</time></article>
              ))}
            </div>
          </section>
          </> : null}
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
