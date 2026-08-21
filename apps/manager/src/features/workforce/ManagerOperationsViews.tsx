import {
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileImage,
  History,
  ListChecks,
  MessageSquare,
  Plus,
  RotateCcw,
  Save,
  Send,
  ShieldCheck,
  Target,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type {
  CreateManagerTaskInput,
  GoalActionItem,
  ManagerOperationsSnapshot,
  ManagerTask,
  ManagerTaskStatus,
  SaveGoalProposalInput,
} from './managerOperationsModels'
import type { TeamMember } from './models'
import { formatDate, formatDateTime, formatMoney } from './localization'

const taskStatusLabels: Record<ManagerTaskStatus, string> = {
  assigned: 'Хүлээн авах хүлээлттэй',
  acknowledged: 'Хүлээн авсан',
  'in-progress': 'Гүйцэтгэж байна',
  submitted: 'Хянуулахад ирсэн',
  rework: 'Дахин ажиллуулах',
  completed: 'Баталж хаасан',
}

const goalStateLabels = {
  draft: 'Ноорог',
  submitted: 'Гүйцэтгэх захирлын хяналтад',
  'revision-requested': 'Засвар шаардсан',
  approved: 'Баталсан',
  rejected: 'Татгалзсан',
} as const

function isOverdue(task: ManagerTask, today: string): boolean {
  return task.dueDate < today && task.status !== 'completed'
}

function TaskCreatePanel({ branchId, members, onClose, onCreate }: {
  branchId: string
  members: TeamMember[]
  onClose: () => void
  onCreate: (input: CreateManagerTaskInput) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeId, setAssigneeId] = useState(members[0]?.id ?? '')
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10))
  const [error, setError] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      onCreate({ branchId, title, description, assigneeId, dueDate })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Даалгаврыг үүсгэж чадсангүй.')
    }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="modal-card modal-card--task" role="dialog" aria-modal="true" aria-labelledby="task-create-title">
      <header className="modal-header"><div><span className="eyebrow">Салбарын ажлын хариуцлага</span><h2 id="task-create-title">Шинэ даалгавар</h2><p>Зөвхөн өөрийн салбарын идэвхтэй багийн гишүүнд тодорхой ажил, хугацаа онооно.</p></div><button className="icon-button" type="button" aria-label="Шинэ даалгаврын цонхыг хаах" onClick={onClose}><X size={20} /></button></header>
      <form className="task-create-form" onSubmit={submit}>
        <label><span>Даалгаврын нэр</span><input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Жишээ: VIP өрөөний нээлтийн бэлэн байдлыг шалгах" /></label>
        <label><span>Хариуцах багийн гишүүн</span><select required value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>{members.filter((member) => member.active).map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
        <label className="task-description"><span>Гүйцэтгэх тайлбар</span><textarea required rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Хийх ажил, хүлээгдэж буй үр дүн, шалгах баримтыг тодорхой бичнэ үү" /></label>
        <label><span>Дуусах огноо</span><input required type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
        <div className="integration-note task-notification-note"><ShieldCheck size={16} /><span>PWA мэдэгдлийн баримт үүсгэнэ. Бодит хүргэлт нь хамгаалагдсан серверийн мэдэгдлийн интеграцаар хийгдэнэ.</span></div>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="modal-actions modal-actions--end"><button className="button button--ghost" type="button" onClick={onClose}>Цуцлах</button><button className="button button--primary" type="submit"><Plus size={17} />Даалгавар үүсгэх</button></div>
      </form>
    </section>
  </div>
}

function TaskDetail({ task, member, onComment, onReview, onSimulateProgress }: {
  task: ManagerTask
  member?: TeamMember
  onComment: (body: string) => void
  onReview: (action: 'approve' | 'rework', note: string) => void
  onSimulateProgress: (action: 'acknowledge' | 'start' | 'submit') => void
}) {
  const [comment, setComment] = useState('')
  const [reviewNote, setReviewNote] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setComment('')
    setReviewNote('')
    setError('')
  }, [task.id])

  function addComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      onComment(comment)
      setComment('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Сэтгэгдлийг хадгалж чадсангүй.')
    }
  }

  function review(action: 'approve' | 'rework') {
    try {
      onReview(action, reviewNote)
      setReviewNote('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Хяналтын шийдвэрийг хадгалж чадсангүй.')
    }
  }

  function simulate(action: 'acknowledge' | 'start' | 'submit') {
    try {
      onSimulateProgress(action)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Багийн гишүүний туршилтын үйлдлийг хийж чадсангүй.')
    }
  }

  return <section className="workspace-panel task-detail" aria-label="Даалгаврын дэлгэрэнгүй">
    <header className="task-detail-header"><div><span className="avatar avatar--large">{member?.initials}</span><span><h2>{task.title}</h2><p>{member?.name} · {formatDate(task.dueDate)} хүртэл</p></span></div><span className="task-status" data-status={task.status}>{taskStatusLabels[task.status]}</span></header>
    <p className="task-description-copy">{task.description}</p>

    <div className="task-facts"><article><span>Үүсгэсэн</span><strong>{task.createdBy}</strong><small>{formatDateTime(task.createdAt)}</small></article><article><span>Нотлох баримт</span><strong>{task.evidence.length}</strong><small>зураг хавсаргасан</small></article><article><span>Ярианы түүх</span><strong>{task.comments.length}</strong><small>сэтгэгдэл</small></article></div>

    {task.result ? <section className="task-result"><header><CheckCircle2 size={18} /><strong>Гүйцэтгэлийн үр дүн</strong></header><p>{task.result}</p>{task.evidence.map((item) => <span key={item.id}><FileImage size={15} />{item.fileName} · {Math.max(1, Math.round(item.size / 1000))} KB</span>)}</section> : null}

    {task.status === 'submitted' ? <section className="task-review"><header><ListChecks size={18} /><div><strong>Менежерийн үр дүнгийн хяналт</strong><span>Баримтыг шалгаад батлах эсвэл тодорхой заавартай дахин ажиллуулна.</span></div></header><textarea rows={3} value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="Хяналтын тэмдэглэл эсвэл дахин ажиллуулах заавар" /><div><button className="button button--danger" type="button" onClick={() => review('rework')}><RotateCcw size={16} />Дахин ажиллуулах</button><button className="button button--primary" type="button" onClick={() => review('approve')}><Check size={16} />Үр дүн батлах</button></div></section> : null}

    {task.status !== 'completed' && task.status !== 'submitted' ? <section className="task-member-preview"><div><Users size={17} /><span><strong>Багийн гишүүний туршилтын харагдац</strong><small>Хүлээн авах, эхлүүлэх, үр дүн илгээх урсгалыг энд шалгана.</small></span></div>{task.status === 'assigned' ? <button className="button button--secondary" type="button" onClick={() => simulate('acknowledge')}>Хүлээн авсан гэж турших</button> : null}{['acknowledged', 'rework'].includes(task.status) ? <button className="button button--secondary" type="button" onClick={() => simulate('start')}>Ажил эхлүүлсэн гэж турших</button> : null}{['acknowledged', 'in-progress', 'rework'].includes(task.status) ? <button className="button button--secondary" type="button" onClick={() => simulate('submit')}>Үр дүн илгээсэн гэж турших</button> : null}</section> : null}

    <section className="task-conversation"><h3>Сэтгэгдэл ба ярианы түүх</h3>{task.comments.length ? task.comments.map((item) => <article key={item.id} data-actor={item.actorType}><span className="avatar avatar--member">{item.author.slice(0, 2)}</span><div><header><strong>{item.author}</strong><time>{formatDateTime(item.at)}</time></header><p>{item.body}</p></div></article>) : <div className="task-empty-line">Одоогоор сэтгэгдэл алга.</div>}<form onSubmit={addComment}><MessageSquare size={16} /><input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Багийн гишүүнд тодорхой сэтгэгдэл бичих" /><button className="button button--secondary" type="submit">Нэмэх</button></form></section>
    {error ? <p className="form-error task-detail-error" role="alert">{error}</p> : null}
    <details className="task-audit"><summary><History size={15} />Аудитын түүх · {task.audit.length}</summary>{[...task.audit].reverse().map((item) => <div key={item.id}><span>{formatDateTime(item.at)}</span><strong>{item.actor}</strong><p>{item.note ?? item.action}</p></div>)}</details>
  </section>
}

export function ManagerTasksView({ snapshot, teamMembers, message, onDismissMessage, onCreate, onComment, onReview, onSimulateProgress }: {
  snapshot: ManagerOperationsSnapshot
  teamMembers: TeamMember[]
  message: string
  onDismissMessage: () => void
  onCreate: (input: CreateManagerTaskInput) => void
  onComment: (taskId: string, body: string) => void
  onReview: (taskId: string, action: 'approve' | 'rework', note: string) => void
  onSimulateProgress: (task: ManagerTask, action: 'acknowledge' | 'start' | 'submit') => void
}) {
  const [createOpen, setCreateOpen] = useState(false)
  const [filter, setFilter] = useState<'open' | 'review' | 'completed'>('open')
  const [selectedId, setSelectedId] = useState(snapshot.tasks[0]?.id ?? '')
  const today = new Date().toISOString().slice(0, 10)
  const memberById = useMemo(() => new Map(teamMembers.map((member) => [member.id, member])), [teamMembers])
  const counts = {
    open: snapshot.tasks.filter((task) => !['submitted', 'completed'].includes(task.status)).length,
    review: snapshot.tasks.filter((task) => task.status === 'submitted').length,
    completed: snapshot.tasks.filter((task) => task.status === 'completed').length,
    overdue: snapshot.tasks.filter((task) => isOverdue(task, today)).length,
  }
  const visibleTasks = snapshot.tasks.filter((task) => filter === 'review' ? task.status === 'submitted' : filter === 'completed' ? task.status === 'completed' : !['submitted', 'completed'].includes(task.status))
  const selected = snapshot.tasks.find((task) => task.id === selectedId && visibleTasks.some((item) => item.id === task.id)) ?? visibleTasks[0]

  function create(input: CreateManagerTaskInput) {
    onCreate(input)
    setCreateOpen(false)
    setFilter('open')
  }

  return <>
    <section className="page-heading manager-view-heading"><div><span className="eyebrow">Ажил ба хариуцлага</span><h1>Даалгаврын төв</h1><p>Салбарын багт ажил оноож, хүлээн авалт, гүйцэтгэл, зурагт баримт, дахин ажиллуулах болон баталж хаах үйл явцыг хянана.</p></div><button className="button button--primary" type="button" onClick={() => setCreateOpen(true)}><Plus size={17} />Шинэ даалгавар</button></section>
    {message ? <div className="status-message manager-view-notice" role="status"><Check size={18} /><span>{message}</span><button type="button" aria-label="Мэдэгдлийг хаах" onClick={onDismissMessage}><X size={17} /></button></div> : null}
    <section className="task-metrics" aria-label="Даалгаврын гүйцэтгэлийн хураангуй"><article><span>Нээлттэй</span><strong>{counts.open}</strong><small>ажиллаж буй</small></article><article data-tone="review"><span>Хянуулах</span><strong>{counts.review}</strong><small>менежерийн шийдвэр</small></article><article data-tone={counts.overdue ? 'warning' : 'healthy'}><span>Хугацаа хэтэрсэн</span><strong>{counts.overdue}</strong><small>яаралтай хяналт</small></article><article data-tone="healthy"><span>Хаасан</span><strong>{counts.completed}</strong><small>үр дүн баталсан</small></article></section>
    <div className="segmented-control task-tabs" role="tablist" aria-label="Даалгаврын төлөв"><button role="tab" aria-selected={filter === 'open'} className={filter === 'open' ? 'active' : ''} onClick={() => setFilter('open')}>Нээлттэй · {counts.open}</button><button role="tab" aria-selected={filter === 'review'} className={filter === 'review' ? 'active' : ''} onClick={() => setFilter('review')}>Хянуулах · {counts.review}</button><button role="tab" aria-selected={filter === 'completed'} className={filter === 'completed' ? 'active' : ''} onClick={() => setFilter('completed')}>Хаасан · {counts.completed}</button></div>
    <div className="task-layout"><section className="workspace-panel task-list" aria-label="Даалгаврын жагсаалт"><header className="card-header"><div><h2>{filter === 'review' ? 'Хянуулах үр дүн' : filter === 'completed' ? 'Баталж хаасан ажил' : 'Идэвхтэй ажил'}</h2><p>{visibleTasks.length} даалгавар харагдаж байна</p></div><ListChecks size={20} /></header><div>{visibleTasks.map((task) => { const member = memberById.get(task.assigneeId); return <button key={task.id} className={selected?.id === task.id ? 'selected' : ''} type="button" onClick={() => setSelectedId(task.id)}><span className="task-state-mark" data-status={task.status}>{task.status === 'completed' ? <Check size={15} /> : <Clock3 size={15} />}</span><span><strong>{task.title}</strong><small>{member?.name} · {formatDate(task.dueDate)}</small></span>{isOverdue(task, today) ? <b>Хэтэрсэн</b> : <ChevronRight size={17} />}</button> })}{!visibleTasks.length ? <div className="task-list-empty"><CheckCircle2 size={24} /><strong>Энэ төлөвт даалгавар алга</strong></div> : null}</div></section>{selected ? <TaskDetail task={selected} member={memberById.get(selected.assigneeId)} onComment={(body) => onComment(selected.id, body)} onReview={(action, note) => onReview(selected.id, action, note)} onSimulateProgress={(action) => onSimulateProgress(selected, action)} /> : <section className="workspace-panel task-detail task-detail--empty"><CheckCircle2 size={28} /><strong>Даалгавар сонгоно уу</strong></section>}</div>
    <section className="scope-guardrail"><ShieldCheck size={19} /><div><strong>Салбарын хүрээ ба мэдэгдлийн хил</strong><span>Менежер зөвхөн өөрийн салбарын багт ажил өгнө. Энэ прототип мэдэгдлийн баримтыг хадгалдаг боловч Slack эсвэл бусад суваг руу бодитоор илгээхгүй.</span></div></section>
    {createOpen ? <TaskCreatePanel branchId={snapshot.branchId} members={teamMembers} onClose={() => setCreateOpen(false)} onCreate={create} /> : null}
  </>
}

function GoalActionEditor({ action, members, disabled, onChange, onRemove }: { action: GoalActionItem; members: TeamMember[]; disabled: boolean; onChange: (action: GoalActionItem) => void; onRemove: () => void }) {
  return <article className="goal-action-editor"><label><span>Хэрэгжүүлэх ажил</span><input disabled={disabled} value={action.title} onChange={(event) => onChange({ ...action, title: event.target.value })} /></label><label><span>Хариуцагч</span><select disabled={disabled} value={action.ownerId} onChange={(event) => onChange({ ...action, ownerId: event.target.value })}>{members.filter((member) => member.active).map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label><label><span>Дуусах огноо</span><input disabled={disabled} type="date" value={action.dueDate} onChange={(event) => onChange({ ...action, dueDate: event.target.value })} /></label><label><span>Хүлээгдэж буй нөлөө</span><input disabled={disabled} value={action.expectedImpact} onChange={(event) => onChange({ ...action, expectedImpact: event.target.value })} /></label>{disabled ? <span /> : <button className="icon-button" type="button" aria-label="Хэрэгжүүлэх ажлыг хасах" onClick={onRemove}><X size={17} /></button>}</article>
}

export function ManagerGoalPlanningView({ snapshot, teamMembers, message, onDismissMessage, onSave, onSubmit }: {
  snapshot: ManagerOperationsSnapshot
  teamMembers: TeamMember[]
  message: string
  onDismissMessage: () => void
  onSave: (input: SaveGoalProposalInput) => void
  onSubmit: () => void
}) {
  const proposal = snapshot.goalProposal
  const [target, setTarget] = useState(proposal.proposedTarget)
  const [rationale, setRationale] = useState(proposal.rationale)
  const [actions, setActions] = useState(() => proposal.actions.map((item) => ({ ...item })))
  const [error, setError] = useState('')
  const editable = proposal.state === 'draft' || proposal.state === 'revision-requested'
  const targetDelta = target - proposal.recommendation.recommendedTarget

  useEffect(() => {
    setTarget(proposal.proposedTarget)
    setRationale(proposal.rationale)
    setActions(proposal.actions.map((item) => ({ ...item })))
    setError('')
  }, [proposal.updatedAt, proposal.state])

  function save(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    try {
      onSave({ proposedTarget: target, rationale, actions })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Төлөвлөгөөг хадгалж чадсангүй.')
    }
  }

  function submit() {
    try {
      onSave({ proposedTarget: target, rationale, actions })
      onSubmit()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Төлөвлөгөөг илгээж чадсангүй.')
    }
  }

  function addAction() {
    setActions((current) => [...current, { id: `goal-action-${Date.now()}`, title: '', ownerId: teamMembers[0]?.id ?? '', dueDate: new Date().toISOString().slice(0, 10), expectedImpact: '' }])
  }

  return <>
    <section className="page-heading manager-view-heading"><div><span className="eyebrow">Сарын борлуулалтын төлөвлөлт</span><h1>Зорилгын санал ба үйл ажиллагааны төлөвлөгөө</h1><p>Hermes-ийн тайлбарлагдах зөвлөмжийг хянаж, өөрийн салбарын дараагийн сарын зорилго болон хариуцах ажлыг Гүйцэтгэх захиралд илгээнэ.</p></div><span className="goal-proposal-state" data-state={proposal.state}>{goalStateLabels[proposal.state]} · хувилбар {proposal.version}</span></section>
    {message ? <div className="status-message manager-view-notice" role="status"><Check size={18} /><span>{message}</span><button type="button" aria-label="Мэдэгдлийг хаах" onClick={onDismissMessage}><X size={17} /></button></div> : null}
    <section className="goal-workflow" aria-label="Зорилгын батлах дараалал"><article data-active={proposal.state === 'draft' || proposal.state === 'revision-requested'}><span>1</span><div><strong>Менежерийн санал</strong><small>Зорилго ба үйл ажиллагааны төлөвлөгөө</small></div></article><ChevronRight size={17} /><article data-active={proposal.state === 'submitted'}><span>2</span><div><strong>Гүйцэтгэх захирлын хяналт</strong><small>Асуух, засварт буцаах, батлах эсвэл татгалзах</small></div></article><ChevronRight size={17} /><article data-active={proposal.state === 'approved'}><span>3</span><div><strong>Идэвхтэй зорилго</strong><small>Зөвхөн баталсны дараа хэрэгжинэ</small></div></article></section>
    <div className="goal-planning-layout">
      <aside className="workspace-panel hermes-recommendation"><header><span className="hermes-icon"><Bot size={22} /></span><div><span className="eyebrow">Hermes · зөвлөмж {proposal.recommendation.version}</span><h2>Тайлбарлагдах суурь</h2><p>{formatDateTime(proposal.recommendation.generatedAt)}</p></div></header><div className="hermes-target"><span>Зөвлөсөн зорилго</span><strong>{formatMoney(proposal.recommendation.recommendedTarget)}</strong><small>{formatMoney(proposal.recommendation.baselineAmount)} × {100 + proposal.recommendation.improvementPercent}%</small></div><dl><div><dt>Суурь сар</dt><dd>{proposal.recommendation.baselineMonth}</dd></div><div><dt>Эх үүсвэр</dt><dd>{proposal.recommendation.sourceSummary}</dd></div></dl><p>{proposal.recommendation.rationale}</p><section><h3>Төвлөрөх чиглэл</h3>{proposal.recommendation.focusAreas.map((item) => <span key={item}><Target size={14} />{item}</span>)}</section><section><h3>Эрсдэл</h3>{proposal.recommendation.risks.map((item) => <span key={item} data-tone="warning"><AlertTriangle size={14} />{item}</span>)}</section><div className="hermes-boundary"><ShieldCheck size={16} /><span>Hermes зөвлөж, тайлбарлана. Зорилгыг өөрчлөх, илгээх эсвэл батлахгүй.</span></div></aside>
      <form className="workspace-panel goal-proposal-form" onSubmit={save}><header className="card-header"><div><span className="eyebrow">Менежерийн ноорог</span><h2>{formatDate(`${proposal.month}-01`, { year: 'numeric', month: 'long' })}</h2><p>{editable ? 'Саналаа хадгалж бэлэн болмогц Гүйцэтгэх захиралд илгээнэ.' : 'Илгээсэн хувилбар түгжигдсэн. Гүйцэтгэх захирлын шийдвэрийг хүлээнэ.'}</p></div><Target size={22} /></header>
        <div className="goal-target-editor"><label><span>Санал болгож буй сарын зорилго</span><div><CircleDollarSign size={18} /><input type="number" min="1" step="100000" disabled={!editable} value={target} onChange={(event) => setTarget(Number(event.target.value))} /><b>MNT</b></div></label><article data-tone={targetDelta > 0 ? 'healthy' : targetDelta < 0 ? 'warning' : 'neutral'}><span>Hermes-ийн зөвлөмжөөс</span><strong>{targetDelta > 0 ? '+' : ''}{formatMoney(targetDelta)}</strong></article></div>
        <label className="goal-rationale"><span>Зорилгын үндэслэл</span><textarea rows={4} disabled={!editable} value={rationale} onChange={(event) => setRationale(event.target.value)} /></label>
        <section className="goal-actions-editor"><header><div><h3>Хэрэгжүүлэх ажлууд</h3><p>Хариуцагч, хугацаа, хүлээгдэж буй нөлөөг тодорхойлно.</p></div>{editable ? <button className="button button--secondary" type="button" onClick={addAction}><Plus size={16} />Ажил нэмэх</button> : null}</header>{actions.map((action, index) => <GoalActionEditor key={action.id} action={action} members={teamMembers} disabled={!editable} onChange={(next) => setActions((current) => current.map((item, itemIndex) => itemIndex === index ? next : item))} onRemove={() => setActions((current) => current.filter((_, itemIndex) => itemIndex !== index))} />)}</section>
        {proposal.ceoComment ? <div className="goal-ceo-comment"><MessageSquare size={17} /><div><strong>Гүйцэтгэх захирлын тайлбар</strong><p>{proposal.ceoComment}</p></div></div> : null}
        {error ? <p className="form-error goal-form-error" role="alert">{error}</p> : null}
        <footer className="goal-form-actions"><span><History size={15} />Сүүлд шинэчилсэн {formatDateTime(proposal.updatedAt)}</span>{editable ? <div><button className="button button--secondary" type="submit"><Save size={16} />Ноорог хадгалах</button><button className="button button--primary" type="button" onClick={submit}><Send size={16} />Гүйцэтгэх захиралд илгээх</button></div> : <span className="goal-awaiting"><Clock3 size={16} />Шийдвэр хүлээгдэж байна</span>}</footer>
      </form>
    </div>
    <section className="goal-approval-boundary"><ShieldCheck size={19} /><div><strong>Эрхийн зааг</strong><span>Менежер зөвхөн санал болон үйл ажиллагааны төлөвлөгөө бэлтгэж илгээнэ. Зөвхөн Гүйцэтгэх захирал баталснаар сарын зорилго идэвхжинэ; энэ дэлгэцээс батлах боломжгүй.</span></div></section>
  </>
}
