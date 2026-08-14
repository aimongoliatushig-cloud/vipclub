import { CheckCircle2, ChevronRight, ListFilter, Paperclip, Plus, Search, Send, TimerReset } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { OverlayPanel } from '../components/ui/OverlayPanel'
import { PageHeader } from '../components/ui/PageHeader'
import { StatusMark } from '../components/ui/StatusMark'
import type { CreateTaskInput, ExecutiveTask, TaskPriority, TaskStatus } from '../domain/types'
import { useApp } from '../state/useApp'
import { taskPriorityLabel, taskStatusLabel } from '../utils/format'

const priorityTone = (priority: TaskPriority) => priority === 'critical' ? 'critical' : priority === 'high' ? 'attention' : 'neutral'
const statusTone = (status: TaskStatus) => status === 'completed' ? 'healthy' : status === 'overdue' || status === 'rework' ? 'critical' : status === 'submitted' ? 'attention' : 'neutral'

interface CreateTaskPanelProps {
  open: boolean
  onClose(): void
  onCreated(task: ExecutiveTask): void
  branchId?: string
  context?: string
  title?: string
  instruction?: string
  sourceContext?: string
}

function CreateTaskPanel({ open, onClose, onCreated, branchId, context, title, instruction, sourceContext }: CreateTaskPanelProps) {
  const { createTask, branches } = useApp()
  const [working, setWorking] = useState(false)
  const [form, setForm] = useState<CreateTaskInput>({
    title: title ?? (context ? `${context} — арга хэмжээ` : ''),
    instruction: instruction ?? '',
    assignee: branchId ? branches.find((item) => item.id === branchId)?.manager ?? '' : 'Г. Тэмүүлэн',
    assigneeRole: 'Салбарын менежер',
    branchId,
    module: context ?? 'Удирдлагын төв',
    dueAt: '2026-08-14T18:00',
    priority: 'high',
    sourceContext,
  })

  useEffect(() => {
    if (!open) return
    const manager = branchId ? branches.find((item) => item.id === branchId)?.manager : undefined
    setForm((current) => ({
      ...current,
      branchId,
      assignee: manager ?? current.assignee,
      module: context ?? current.module,
      title: title ?? (context ? `${context} — арга хэмжээ` : current.title),
      instruction: instruction ?? current.instruction,
      sourceContext,
    }))
  }, [open, branchId, context, title, instruction, sourceContext, branches])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setWorking(true)
    try {
      onCreated(await createTask(form))
    } finally {
      setWorking(false)
    }
  }

  return (
    <OverlayPanel open={open} onClose={onClose} title="Шинэ даалгавар" description="CEO authority directive · recipient may clarify but cannot reject legitimate authority." variant="drawer" footer={<div className="modal-actions"><button className="button button--secondary" type="button" onClick={onClose}>Болих</button><button className="button button--primary" type="submit" form="create-task-form" disabled={working}>{working ? 'Үүсгэж байна…' : 'Даалгавар оноох'}</button></div>}>
      <form id="create-task-form" className="form-stack" onSubmit={(event) => void submit(event)}>
        {form.sourceContext ? <div className="source-context-callout"><strong>Эх сурвалжийн контекст</strong><span>{form.sourceContext}</span></div> : null}
        <label><span>Гарчиг</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></label>
        <label><span>Заавар</span><textarea value={form.instruction} onChange={(event) => setForm({ ...form, instruction: event.target.value })} required /></label>
        <div className="form-grid">
          <label><span>Хариуцагч</span><input value={form.assignee} onChange={(event) => setForm({ ...form, assignee: event.target.value })} required /></label>
          <label><span>Role</span><select value={form.assigneeRole} onChange={(event) => setForm({ ...form, assigneeRole: event.target.value })}><option>Салбарын менежер</option><option>HR менежер</option><option>Гишүүнчлэлийн менежер</option><option>Нягтлан бодогч</option></select></label>
          <label><span>Салбар</span><select value={form.branchId ?? ''} onChange={(event) => setForm({ ...form, branchId: event.target.value || undefined })}><option value="">Компанийн хэмжээнд</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
          <label><span>Priority</span><select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as TaskPriority })}>{Object.entries(taskPriorityLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label><span>Хугацаа</span><input type="datetime-local" value={form.dueAt} onChange={(event) => setForm({ ...form, dueAt: event.target.value })} required /></label>
          <label><span>Холбоотой модуль</span><input value={form.module} onChange={(event) => setForm({ ...form, module: event.target.value })} /></label>
        </div>
        <div className="callout"><Paperclip size={18} /><p>Attachment/evidence upload UI нь дараагийн integration slice. Task thread ба audit state mock service дээр ажиллана.</p></div>
      </form>
    </OverlayPanel>
  )
}

function TaskDetail({ task, onClose }: { task: ExecutiveTask; onClose(): void }) {
  const { commentTask, setTaskStatus } = useApp()
  const [comment, setComment] = useState('')
  const submitComment = async (event: FormEvent) => { event.preventDefault(); if (!comment.trim()) return; await commentTask(task.id, comment.trim()); setComment('') }
  return (
    <OverlayPanel open title={task.title} description={`${task.assignee} · ${task.assigneeRole}`} onClose={onClose} wide>
      {task.sourceContext ? <div className="source-context-callout"><strong>Эх сурвалжийн контекст</strong><span>{task.sourceContext}</span></div> : null}
      <div className="task-detail__summary"><StatusMark tone={statusTone(task.status)} label={taskStatusLabel[task.status]} /><StatusMark tone={priorityTone(task.priority)} label={taskPriorityLabel[task.priority]} /><span><strong>Хугацаа</strong> {task.dueAt.replace('T', ' ')}</span><span><strong>Модуль</strong> {task.module}</span></div>
      <section className="detail-section"><header><h3>Заавар</h3><small>Created by {task.createdBy}</small></header><p className="instruction-copy">{task.instruction}</p></section>
      <section className="detail-section"><header><h3>Conversation thread</h3><span>{task.messages.length} message</span></header><div className="thread-messages">{task.messages.length ? task.messages.map((message) => <article key={message.id} data-mine={message.author === 'Баттүшиг' || undefined}><div className="avatar avatar--small">{message.author.slice(0, 1)}</div><div><header><strong>{message.author}</strong><small>{message.role} · {message.createdAt}</small></header><p>{message.body}</p></div></article>) : <p className="muted-copy">Одоогоор ярилцлагагүй.</p>}</div><form className="thread-composer" onSubmit={(event) => void submitComment(event)}><textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Тодруулга эсвэл review comment…" /><button className="button button--primary" type="submit" disabled={!comment.trim()}><Send size={17} />Илгээх</button></form></section>
      <section className="detail-section"><header><h3>Evidence ба review</h3><span>{task.evidenceCount} attachment</span></header><div className="task-review-actions"><button className="button button--secondary" type="button" onClick={() => void setTaskStatus(task.id, 'rework')} disabled={task.status === 'completed'}><TimerReset size={17} />Дахин ажиллуулах</button><button className="button button--primary" type="button" onClick={() => void setTaskStatus(task.id, 'completed')} disabled={task.status === 'completed'}><CheckCircle2 size={17} />Дууссан гэж батлах</button></div></section>
    </OverlayPanel>
  )
}

export default function TasksPage() {
  const { tasks, branches } = useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const createOpen = searchParams.get('create') === '1'
  const selectedId = searchParams.get('selected')
  const status = searchParams.get('status')
  const branch = searchParams.get('branch')
  const context = searchParams.get('context') ?? undefined
  const title = searchParams.get('title') ?? undefined
  const instruction = searchParams.get('instruction') ?? undefined
  const sourceContext = searchParams.get('source') ?? undefined
  const selected = tasks.find((item) => item.id === selectedId)
  const filtered = useMemo(() => tasks.filter((task) => (!status || task.status === status) && (!branch || task.branchId === branch) && `${task.title} ${task.assignee} ${task.module}`.toLowerCase().includes(query.toLowerCase())), [tasks, status, branch, query])
  const counts = { overdue: tasks.filter((item) => item.status === 'overdue').length, review: tasks.filter((item) => item.status === 'submitted').length, active: tasks.filter((item) => ['assigned', 'acknowledged', 'in-progress', 'clarification'].includes(item.status)).length, completed: tasks.filter((item) => item.status === 'completed').length }
  const closeCreate = () => { const next = new URLSearchParams(searchParams); for (const key of ['create', 'context', 'title', 'instruction', 'source']) next.delete(key); setSearchParams(next) }
  const taskCreated = (task: ExecutiveTask) => { const next = new URLSearchParams(searchParams); for (const key of ['create', 'context', 'title', 'instruction', 'source']) next.delete(key); next.set('selected', task.id); setSearchParams(next) }
  const openCreate = () => { const next = new URLSearchParams(searchParams); next.set('create', '1'); setSearchParams(next) }
  const openTask = (id: string) => { const next = new URLSearchParams(searchParams); next.set('selected', id); setSearchParams(next) }
  const closeTask = () => { const next = new URLSearchParams(searchParams); next.delete('selected'); setSearchParams(next) }

  return (
    <div className="page tasks-page">
      <PageHeader title="Даалгавар" description="CEO-assigned directives, acknowledgement, evidence, review, rework, completion." actions={<button className="button button--primary" type="button" onClick={openCreate}><Plus size={17} />Шинэ даалгавар</button>} />
      <section className="metric-strip metric-strip--compact"><article><span>Идэвхтэй</span><strong>{counts.active}</strong><small>Assigned → In Progress</small></article><article><span>Хяналтад ирсэн</span><strong data-tone="attention">{counts.review}</strong><small>Submitted for review</small></article><article><span>Хугацаа хэтэрсэн</span><strong data-tone="critical">{counts.overdue}</strong><small>CEO attention</small></article><article><span>Дууссан</span><strong data-tone="healthy">{counts.completed}</strong><small>Approved completion</small></article></section>
      <section className="workbench-section task-center">
        <header className="section-header"><div><h2>CEO Task Center</h2><p>{filtered.length} даалгавар · company scope</p></div><label className="search-field"><Search size={17} /><input aria-label="Даалгаврыг нэр эсвэл эзнээр хайх" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Даалгавар, эзэн хайх" /></label></header>
        <div className="filter-tabs"><button type="button" aria-selected={!status} onClick={() => { const p = new URLSearchParams(searchParams); p.delete('status'); setSearchParams(p) }}>Бүгд</button>{[['in-progress', 'Хийгдэж буй'], ['submitted', 'Review'], ['overdue', 'Хугацаа хэтэрсэн'], ['completed', 'Дууссан']].map(([value, label]) => <button key={value} type="button" aria-selected={status === value} onClick={() => { const p = new URLSearchParams(searchParams); p.set('status', value); setSearchParams(p) }}>{label}</button>)}</div>
        <div className="task-table"><div className="task-table__head"><span>Даалгавар</span><span>Хариуцагч</span><span>Салбар / Модуль</span><span>Priority</span><span>Хугацаа</span><span>Evidence</span><span>Төлөв</span><span /></div>{filtered.map((task) => <button key={task.id} type="button" className="task-row" onClick={() => openTask(task.id)}><span><strong>{task.title}</strong><small>{task.instruction}</small></span><span><strong>{task.assignee}</strong><small>{task.assigneeRole}</small></span><span><strong>{branches.find((item) => item.id === task.branchId)?.name ?? 'Компанийн хэмжээнд'}</strong><small>{task.module}</small></span><StatusMark tone={priorityTone(task.priority)} label={taskPriorityLabel[task.priority]} compact /><span><strong data-tone={task.status === 'overdue' ? 'critical' : undefined}>{task.dueAt.slice(0, 10)}</strong><small>{task.dueAt.slice(11, 16)}</small></span><span><Paperclip size={15} /> {task.evidenceCount}</span><StatusMark tone={statusTone(task.status)} label={taskStatusLabel[task.status]} compact /><ChevronRight size={18} /></button>)}</div>
        {filtered.length === 0 ? <div className="empty-state"><ListFilter size={26} /><strong>Даалгавар олдсонгүй</strong><p>Filter эсвэл хайлтаа өөрчилнө үү.</p></div> : null}
      </section>
      <CreateTaskPanel open={createOpen} onClose={closeCreate} onCreated={taskCreated} branchId={branch ?? undefined} context={context} title={title} instruction={instruction} sourceContext={sourceContext} />
      {selected ? <TaskDetail task={selected} onClose={closeTask} /> : null}
    </div>
  )
}
