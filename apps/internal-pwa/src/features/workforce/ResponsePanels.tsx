import { Bell, Check, Clock3, Eye, MessageSquare, Pencil, User, X } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { assignmentResponseLabels, formatDate, formatDateTime, roleLabels, shiftLabels } from './localization'
import type { ResponseQueueItem, ShiftAssignment, TeamMember, WeeklyRoster } from './models'

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
      setError(caught instanceof Error ? caught.message : 'Сануулгын баримтыг тэмдэглэж чадсангүй.')
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card modal-card--responses" role="dialog" aria-modal="true" aria-labelledby="response-queue-title">
        <header className="modal-header">
          <div>
            <span className="eyebrow">Менежерийн шийдвэрлэх ажлууд</span>
            <h2 id="response-queue-title">Ээлжийн хариунууд</h2>
            <p>Баталгаажуулалт нь зөвхөн хуваарь хүлээн авсныг нотлоно. Ирцийг тусдаа баталгаажсан баримтаар тогтооно.</p>
          </div>
          <button className="icon-button" type="button" aria-label="Ээлжийн хариуг хаах" onClick={onClose}><X size={20} /></button>
        </header>

        <div className="response-summary">
          <article><span>Хүлээгдэж байна</span><strong>{pending}</strong><small>{overdue} сануулах хугацаа хэтэрсэн</small></article>
          <article data-tone="healthy"><span>Баталгаажуулсан</span><strong>{acknowledged}</strong><small>Хүлээн авсан баримттай</small></article>
          <article data-tone={changeRequests ? 'warning' : 'neutral'}><span>Өөрчлөх хүсэлт</span><strong>{changeRequests}</strong><small>Менежер хянах шаардлагатай</small></article>
        </div>

        <div className="response-toolbar">
          <div><Eye size={17} /><span><strong>Эрхийн аюулгүй урьдчилсан харагдац</strong><small>Үйлдвэрлэлийн орчинд нэвтэрсэн багийн гишүүний эрхээр танина.</small></span></div>
          <button className="button button--secondary" type="button" onClick={onOpenMemberPreview}><User size={16} />Багийн гишүүний харагдац нээх</button>
        </div>

        {roster.status !== 'published' ? (
          <div className="response-empty"><Clock3 size={23} /><strong>Хуваарь нийтэлсний дараа хариу авч эхэлнэ</strong><span>Ноорог ээлж нь ирцийн албан ёсны хүлээлт биш бөгөөд багийн гишүүний хуваарьт харагдахгүй.</span></div>
        ) : queue.length ? (
          <div className="response-list">
            {queue.map(({ assignment, teamMember, overdue: isOverdue }) => (
              <article key={assignment.id} data-tone={assignment.response === 'change-requested' ? 'warning' : isOverdue ? 'danger' : 'neutral'}>
                <span className="avatar avatar--member">{teamMember.initials}</span>
                <div className="response-detail">
                  <header><strong>{teamMember.name}</strong><span>{assignment.response === 'change-requested' ? 'Өөрчлөлт хүссэн' : isOverdue ? 'Баталгаажуулах хугацаа хэтэрсэн' : 'Баталгаажуулалт хүлээж байна'}</span></header>
                  <p>{formatDate(assignment.date, { weekday: 'short', month: 'short', day: 'numeric' })} · {assignment.start}–{assignment.end} · {roleLabels[assignment.role]}</p>
                  {assignment.responseNote ? <blockquote>{assignment.responseNote}</blockquote> : null}
                  {assignment.response === 'assigned' && assignment.responseDueAt ? <small>Сануулах хугацаа {formatDateTime(assignment.responseDueAt)}</small> : null}
                  {assignment.lastReminderAt ? <small>Сануулгын баримт {formatDateTime(assignment.lastReminderAt)} · нийт {assignment.reminderCount}</small> : null}
                </div>
                <div className="response-actions">
                  {assignment.response === 'change-requested'
                    ? <button className="button button--primary" type="button" onClick={() => onEdit(assignment)}><Pencil size={15} />Хуваарь засах</button>
                    : <button className="button button--secondary" type="button" onClick={() => recordReminder(assignment.id)}><Bell size={15} />Сануулга тэмдэглэх</button>}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="response-empty"><Check size={23} /><strong>Бүх ээлжийг баталгаажуулсан</strong><span>Энэ хуваарийн хувилбарт хүлээгдэж буй баталгаажуулалт эсвэл өөрчлөх хүсэлт үлдээгүй.</span></div>
        )}
        {error ? <p className="form-error response-panel-error" role="alert">{error}</p> : null}
        <div className="integration-note response-integration-note"><Bell size={16} /><span>Сануулах үйлдэл зөвхөн аудитын баримт тэмдэглэнэ. Энэ туршилтын хувилбар мэдэгдэл илгээхгүй.</span></div>
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
      setError(caught instanceof Error ? caught.message : 'Энэ ээлжийг хүлээн авснаа баталж чадсангүй.')
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
      setError(caught instanceof Error ? caught.message : 'Хуваарь өөрчлөх хүсэлтийг илгээж чадсангүй.')
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
            <span className="eyebrow">Туршилтын хувилбар · багийн гишүүний өөртөө үйлчлэх хэсэг</span>
            <h2 id="member-preview-title">Миний нийтэлсэн хуваарь</h2>
            <p>Сонголт нь зөвхөн туршилтын шалгалтад зориулагдсан. Үйлдвэрлэлийн орчинд нэвтрэлтээр хэрэглэгчийг таньж, зөвхөн өөрийн ээлжийг харуулна.</p>
          </div>
          <button className="icon-button" type="button" aria-label="Багийн гишүүний хуваарийн харагдацыг хаах" onClick={onClose}><X size={20} /></button>
        </header>

        <label className="member-preview-select">
          <span>Харах хэрэглэгч</span>
          <select value={teamMemberId} onChange={(event) => selectMember(event.target.value)}>
            {availableMembers.map((item) => <option key={item.id} value={item.id}>{item.name} · {roleLabels[item.role]}</option>)}
          </select>
        </label>

        {roster.status !== 'published' ? (
          <div className="response-empty"><Clock3 size={23} /><strong>Нийтэлсэн хуваарь алга</strong><span>Багийн гишүүд менежерийн нооргийг бус, зөвхөн албан ёсоор нийтэлсэн хуваарийг харна.</span></div>
        ) : assignments.length ? (
          <div className="member-assignment-list">
            {assignments.map((assignment) => (
              <article key={assignment.id} data-response={assignment.response}>
                <div className="member-shift-date"><span>{formatDate(assignment.date, { weekday: 'short', month: 'short', day: 'numeric' })}</span><strong>{assignment.start}–{assignment.end}</strong><small>{roster.branchName} · {shiftLabels[assignment.shift]}</small></div>
                <div className="member-response-state">
                  {assignment.response === 'acknowledged' ? <><Check size={17} /><span><strong>{assignmentResponseLabels.acknowledged}</strong><small>{assignment.respondedAt ? formatDateTime(assignment.respondedAt) : 'Хүлээн авсан баримттай'}</small></span></> : null}
                  {assignment.response === 'change-requested' ? <><MessageSquare size={17} /><span><strong>{assignmentResponseLabels['change-requested']}</strong><small>{assignment.responseNote}</small></span></> : null}
                  {assignment.response === 'assigned' ? <><Clock3 size={17} /><span><strong>Хариу хүлээж байна</strong><small>Хугацаа: {assignment.responseDueAt ? formatDateTime(assignment.responseDueAt) : 'нийтэлсний дараа'}</small></span></> : null}
                </div>
                <div className="member-response-actions">
                  {assignment.response === 'assigned' ? <button className="button button--primary" type="button" onClick={() => acknowledge(assignment.id)}><Check size={15} />Хүлээн авснаа батлах</button> : null}
                  {assignment.response !== 'change-requested' ? <button className="button button--secondary" type="button" onClick={() => { setRequestAssignmentId(assignment.id); setNote(''); setError('') }}><MessageSquare size={15} />Өөрчлөлт хүсэх</button> : null}
                </div>
                {requestAssignmentId === assignment.id ? (
                  <form className="change-request-form" onSubmit={requestChange}>
                    <label><span>Яагаад өөрчлөлт хэрэгтэй вэ?</span><textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Менежер шийдвэр гаргахад хангалттай тайлбар бичнэ үү" /></label>
                    <div><button className="button button--ghost" type="button" onClick={() => setRequestAssignmentId(null)}>Цуцлах</button><button className="button button--primary" type="submit">Хүсэлт илгээх</button></div>
                  </form>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="response-empty"><User size={23} /><strong>Энэ долоо хоногт ээлж алга</strong><span>{member?.name ?? 'Энэ багийн гишүүн'} сонгосон долоо хоногт нийтэлсэн ээлжгүй байна.</span></div>
        )}
        {error ? <p className="form-error response-panel-error" role="alert">{error}</p> : null}
      </section>
    </div>
  )
}
