import {
  Bot,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileWarning,
  ListTodo,
  LockKeyhole,
  MessageCircle,
  Paperclip,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  SlidersHorizontal,
  UserRound,
  Users,
  WifiOff,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { OverlayPanel } from '../components/ui/OverlayPanel'
import { PageHeader } from '../components/ui/PageHeader'
import { StatusMark } from '../components/ui/StatusMark'
import type {
  CreateConversationInput,
  MessageDeliveryStatus,
  MessageThread,
  MessageThreadStatus,
  ThreadKind,
} from '../domain/types'
import { useApp } from '../state/useApp'

const kindLabel: Record<ThreadKind, string> = {
  normal: 'Энгийн чат',
  task: 'Task thread',
  hermes: 'Hermes',
  sensitive: 'Нууцлалтай',
  anonymous: 'Recipient-д нэр нууцалсан',
}
const statusLabel: Record<MessageThreadStatus, string> = { active: 'Идэвхтэй', stale: 'Хуучирсан', retained: 'Хадгалсан', deleted: 'Устгасан' }
const deliveryLabel: Record<MessageDeliveryStatus, string> = { pending: 'Илгээж байна', delivered: 'Хүрсэн', read: 'Уншсан', failed: 'Хүрээгүй' }
const kindTone = (kind: ThreadKind) => kind === 'sensitive' || kind === 'anonymous' ? 'critical' : kind === 'hermes' ? 'attention' : 'neutral'
const isSensitive = (thread: MessageThread) => thread.kind === 'sensitive' || thread.kind === 'anonymous'
const lastDelivery = (thread: MessageThread) => thread.messages.at(-1)?.delivery ?? 'delivered'

function ThreadIcon({ kind }: { kind: ThreadKind }) {
  if (kind === 'hermes') return <Bot size={19} />
  if (kind === 'sensitive' || kind === 'anonymous') return <LockKeyhole size={19} />
  if (kind === 'task') return <ListTodo size={19} />
  return <UserRound size={19} />
}

interface CreateConversationPanelProps {
  open: boolean
  onClose(): void
  onCreated(thread: MessageThread): void
  branchId?: string
  title?: string
  body?: string
  context?: string
}

function CreateConversationPanel({ open, onClose, onCreated, branchId, title, body, context }: CreateConversationPanelProps) {
  const { branches, createConversation } = useApp()
  const [working, setWorking] = useState(false)
  const [form, setForm] = useState<CreateConversationInput>({ title: title ?? '', participant: '', participantRole: 'Салбарын менежер', branchId, kind: 'normal', urgency: 'attention', context, body: body ?? '' })

  useEffect(() => {
    if (!open) return
    const branch = branchId ? branches.find((item) => item.id === branchId) : undefined
    setForm((current) => ({ ...current, title: title ?? current.title, body: body ?? current.body, context, branchId, participant: branch?.manager ?? current.participant }))
  }, [open, branchId, title, body, context, branches])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setWorking(true)
    try {
      onCreated(await createConversation(form))
    } finally {
      setWorking(false)
    }
  }

  return (
    <OverlayPanel open={open} onClose={onClose} title="Шинэ яриа" description="Зөвхөн дотоод удирдлагын оролцогч · эх контекст хадгалагдана" variant="drawer" footer={<div className="modal-actions"><button className="button button--secondary" type="button" onClick={onClose}>Болих</button><button className="button button--primary" type="submit" form="create-conversation-form" disabled={working}>{working ? 'Үүсгэж байна…' : 'Яриа эхлүүлэх'}</button></div>}>
      <form id="create-conversation-form" className="form-stack" onSubmit={(event) => void submit(event)}>
        {form.context ? <div className="source-context-callout"><strong>Эх сурвалжийн контекст</strong><span>{form.context}</span></div> : null}
        <label><span>Ярианы гарчиг</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></label>
        <div className="form-grid">
          <label><span>Хүлээн авагч</span><input value={form.participant} onChange={(event) => setForm({ ...form, participant: event.target.value })} required /></label>
          <label><span>Role</span><select value={form.participantRole} onChange={(event) => setForm({ ...form, participantRole: event.target.value })}><option>Салбарын менежер</option><option>HR менежер</option><option>Нягтлан бодогч</option><option>Гишүүнчлэлийн менежер</option></select></label>
          <label><span>Салбар</span><select value={form.branchId ?? ''} onChange={(event) => { const nextBranch = branches.find((item) => item.id === event.target.value); setForm({ ...form, branchId: event.target.value || undefined, participant: nextBranch?.manager ?? form.participant }) }}><option value="">Компанийн хэмжээнд</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
          <label><span>Төрөл</span><select value={form.kind} onChange={(event) => { const kind = event.target.value as ThreadKind; setForm({ ...form, kind, urgency: kind === 'sensitive' ? 'critical' : form.urgency }) }}><option value="normal">Энгийн чат</option><option value="task">Task thread</option><option value="sensitive">Нууцлалтай</option></select></label>
          <label><span>Яаралтай байдал</span><select value={form.urgency} onChange={(event) => setForm({ ...form, urgency: event.target.value as CreateConversationInput['urgency'] })}><option value="healthy">Ердийн</option><option value="attention">Анхаарах</option><option value="critical">Яаралтай</option></select></label>
          <label><span>Audience</span><input value="Дотоод удирдлага" disabled /></label>
        </div>
        <label><span>Эхний мессеж</span><textarea value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} required /></label>
        {form.kind === 'sensitive' ? <div className="callout callout--warning"><ShieldAlert size={18} /><p>Нууцлалтай яриа generic preview, ердийн хайлт, Hermes automatic analysis болон export-оос хасагдана. Хандалт бүр аудитад орно.</p></div> : null}
        <div className="callout"><ShieldCheck size={18} /><p>Энэ суваг customer outreach биш. Харилцагч руу гарах мессежийг зөвхөн consent-controlled workflow-оор илгээнэ; internal chat түүнийг тойрохгүй.</p></div>
      </form>
    </OverlayPanel>
  )
}

export default function MessagesPage() {
  const navigate = useNavigate()
  const { threads, sendMessage, openConversation, branches, online } = useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  const [quickFilter, setQuickFilter] = useState<'all' | 'unread' | 'sensitive'>('all')
  const [scopeFilter, setScopeFilter] = useState<'all' | MessageThread['scope']>('all')
  const [branchFilter, setBranchFilter] = useState(searchParams.get('branch') ?? 'all')
  const [deliveryFilter, setDeliveryFilter] = useState<'all' | MessageDeliveryStatus>('all')
  const [contextFilter, setContextFilter] = useState<'all' | 'linked' | 'unlinked'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | MessageThreadStatus | 'revoked'>('all')
  const openedThreads = useRef(new Set<string>())
  const createOpen = searchParams.get('create') === '1'

  const filtered = useMemo(() => threads.filter((thread) => {
    const haystack = `${thread.title} ${thread.participant} ${thread.participantRole}`.toLowerCase()
    if (!haystack.includes(query.toLowerCase())) return false
    if (quickFilter === 'unread' && thread.unread === 0) return false
    if (quickFilter === 'sensitive' && !isSensitive(thread)) return false
    if (scopeFilter !== 'all' && thread.scope !== scopeFilter) return false
    if (branchFilter !== 'all' && thread.branchId !== branchFilter) return false
    if (deliveryFilter !== 'all' && lastDelivery(thread) !== deliveryFilter) return false
    if (contextFilter === 'linked' && !thread.context) return false
    if (contextFilter === 'unlinked' && thread.context) return false
    if (statusFilter === 'revoked' && thread.accessStatus !== 'revoked') return false
    if (statusFilter !== 'all' && statusFilter !== 'revoked' && thread.status !== statusFilter) return false
    return true
  }), [threads, query, quickFilter, scopeFilter, branchFilter, deliveryFilter, contextFilter, statusFilter])

  const selectedId = searchParams.get('thread') ?? filtered[0]?.id ?? threads[0]?.id
  const selected = threads.find((item) => item.id === selectedId)
  const draftKey = selected ? `vipclub-message-draft:${selected.id}` : ''

  useEffect(() => {
    if (!selectedId || !online || openedThreads.current.has(selectedId)) return
    openedThreads.current.add(selectedId)
    void openConversation(selectedId).catch(() => undefined)
  }, [selectedId, online, openConversation])

  useEffect(() => {
    setDraft(draftKey ? window.localStorage.getItem(draftKey) ?? '' : '')
  }, [draftKey])

  const changeDraft = (value: string) => {
    setDraft(value)
    if (!draftKey) return
    if (value) window.localStorage.setItem(draftKey, value)
    else window.localStorage.removeItem(draftKey)
  }
  const canSend = Boolean(selected && selected.accessStatus === 'active' && selected.status === 'active' && selected.kind !== 'hermes')
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!selected || !draft.trim() || !online || !canSend) return
    await sendMessage(selected.id, draft.trim())
    changeDraft('')
  }
  const createTask = (thread: MessageThread) => navigate(`/tasks?create=1&branch=${thread.branchId ?? ''}&context=${encodeURIComponent(`Мессеж: ${thread.title}`)}&source=${encodeURIComponent(thread.context ?? thread.title)}`)
  const selectThread = (threadId: string) => { const next = new URLSearchParams(searchParams); next.set('thread', threadId); next.delete('create'); setSearchParams(next) }
  const openCreate = () => { const next = new URLSearchParams(searchParams); next.set('create', '1'); setSearchParams(next) }
  const closeCreate = () => { const next = new URLSearchParams(searchParams); for (const key of ['create', 'title', 'body', 'context']) next.delete(key); setSearchParams(next) }
  const conversationCreated = (thread: MessageThread) => setSearchParams({ thread: thread.id })
  const preview = (thread: MessageThread) => {
    if (thread.accessStatus === 'revoked') return 'Хандах эрх цуцлагдсан · агуулга хаалттай'
    if (isSensitive(thread)) return 'Нууцлалтай агуулга · preview хаалттай'
    if (thread.status === 'deleted') return 'Агуулга устсан · audit бүртгэл хадгалагдсан'
    return thread.messages.at(-1)?.body ?? 'Мессежгүй'
  }

  return (
    <div className="page messages-page">
      <PageHeader title="Мессеж" description="Удирдлагын харилцаа, task thread, хүргэлт ба sensitive escalation-ийг нэг хамгаалагдсан workbench-д хянана." actions={<button className="button button--primary" type="button" onClick={openCreate}><MessageCircle size={17} />Шинэ яриа</button>} />
      <div className="messaging-workbench">
        <aside className="thread-list">
          <label className="search-field"><Search size={17} /><input aria-label="Яриаг оролцогч эсвэл гарчгаар хайх" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Оролцогч, гарчиг хайх" /></label>
          <div className="thread-filter-tabs" role="tablist" aria-label="Inbox хурдан шүүлтүүр">
            <button type="button" role="tab" aria-selected={quickFilter === 'all'} onClick={() => setQuickFilter('all')}>Бүгд {threads.length}</button>
            <button type="button" role="tab" aria-selected={quickFilter === 'unread'} onClick={() => setQuickFilter('unread')}>Уншаагүй</button>
            <button type="button" role="tab" aria-selected={quickFilter === 'sensitive'} onClick={() => setQuickFilter('sensitive')}>Sensitive</button>
          </div>
          <details className="thread-advanced-filters">
            <summary><SlidersHorizontal size={15} />Нарийвчилсан шүүлтүүр <span>{filtered.length}</span></summary>
            <div>
              <label><span>Хүрээ</span><select value={scopeFilter} onChange={(event) => setScopeFilter(event.target.value as typeof scopeFilter)}><option value="all">Бүх хүрээ</option><option value="company">Компани</option><option value="branch">Салбар</option></select></label>
              <label><span>Салбар</span><select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}><option value="all">Бүх салбар</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
              <label><span>Хүргэлт</span><select value={deliveryFilter} onChange={(event) => setDeliveryFilter(event.target.value as typeof deliveryFilter)}><option value="all">Бүх хүргэлт</option><option value="pending">Илгээж байна</option><option value="delivered">Хүрсэн</option><option value="read">Уншсан</option><option value="failed">Хүрээгүй</option></select></label>
              <label><span>Контекст</span><select value={contextFilter} onChange={(event) => setContextFilter(event.target.value as typeof contextFilter)}><option value="all">Бүгд</option><option value="linked">Record холбоотой</option><option value="unlinked">Холбоосгүй</option></select></label>
              <label><span>Төлөв</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}><option value="all">Бүх төлөв</option><option value="active">Идэвхтэй</option><option value="stale">Хуучирсан</option><option value="retained">Хадгалсан</option><option value="deleted">Устгасан</option><option value="revoked">Хандалт цуцлагдсан</option></select></label>
            </div>
          </details>
          <div className="thread-list__items">
            {filtered.length ? filtered.map((thread) => <button key={thread.id} type="button" data-selected={thread.id === selectedId || undefined} onClick={() => selectThread(thread.id)} aria-label={`${thread.title} дэлгэрэнгүй`}><span className="thread-icon" data-tone={kindTone(thread.kind)}><ThreadIcon kind={thread.kind} /></span><span><strong>{thread.title}</strong><small>{thread.participant} · {thread.updatedAt}</small><em>{preview(thread)}</em><i data-delivery={lastDelivery(thread)}>{deliveryLabel[lastDelivery(thread)]} · {statusLabel[thread.status]}</i></span>{thread.unread ? <b>{thread.unread}</b> : <ChevronRight size={17} />}</button>) : <div className="thread-list__empty"><Search size={22} /><strong>Илэрц олдсонгүй</strong><span>Шүүлтүүр эсвэл хайлтаа өөрчилнө үү.</span></div>}
          </div>
        </aside>

        {selected ? <section className="conversation">
          <header className="conversation__header"><div className="avatar">{selected.participant.slice(0, 1)}</div><div><h2>{selected.title}</h2><p>{selected.participant} · {selected.participantRole}</p></div><StatusMark tone={kindTone(selected.kind)} label={kindLabel[selected.kind]} /><button className="button button--secondary" type="button" onClick={() => createTask(selected)} disabled={selected.accessStatus === 'revoked' || selected.status === 'deleted'}><ListTodo size={17} />Task болгох</button></header>
          {isSensitive(selected) ? <div className="sensitive-banner"><ShieldAlert size={19} /><div><strong>Нууцлалтай executive escalation</strong><p>Generic preview, ердийн хайлт, Hermes analysis болон export-оос хасагдсан. Хандалт бүр аудитад бүртгэгдэнэ.</p></div></div> : null}
          {selected.status === 'stale' ? <div className="thread-state-banner" data-tone="warning"><Clock3 size={18} /><span><strong>Хуучирсан thread</strong>Эх record шинэчлэгдсэн эсэхийг шалгаад шинэ яриа үүсгэнэ үү.</span></div> : null}
          {selected.status === 'retained' ? <div className="thread-state-banner"><ShieldCheck size={18} /><span><strong>Legal hold · зөвхөн унших</strong>Агуулга болон attachment хадгалагдсан; шинэ мессеж, export хориглогдсон.</span></div> : null}
          {selected.context ? <div className="conversation-context"><span>{selected.context}</span><button type="button">Холбоотой record <ChevronRight size={15} /></button></div> : null}

          {selected.accessStatus === 'revoked' ? <div className="conversation-guard"><ShieldX size={34} /><strong>Хандах эрх цуцлагдсан</strong><p>Оролцогчийн membership өөрчлөгдсөн. Нууцлалтай агуулга, attachment болон хайлтын preview харагдахгүй; татгалзсан оролдлого аудитад бүртгэгдсэн.</p></div> : selected.status === 'deleted' ? <div className="conversation-guard"><FileWarning size={34} /><strong>Агуулга устсан</strong><p>Батлагдсан retention schedule-ийн дагуу message body болон attachment устсан. Audit tombstone, actor, хугацаа хадгалагдсан.</p></div> : <div className="conversation__messages">{selected.messages.map((message) => <article key={message.id} data-mine={message.mine || undefined}><div className="avatar avatar--small">{message.sender.slice(0, 1)}</div><div><header><strong>{message.sender}</strong><small>{message.createdAt}</small></header><p>{message.body}</p>{message.attachments.map((attachment) => <button className="message-attachment" type="button" key={attachment.id} disabled={attachment.status !== 'available'}><Paperclip size={14} /><span>{attachment.name}<small>{attachment.sizeLabel} · {attachment.status === 'denied' ? 'Хандах эрхгүй' : attachment.status === 'retained' ? 'Legal hold' : 'Нээх'}</small></span></button>)}<small className="message-delivery" data-delivery={message.delivery}>{deliveryLabel[message.delivery]}{message.readAt ? ` · ${message.readAt}` : message.deliveredAt ? ` · ${message.deliveredAt}` : ''}</small></div></article>)}</div>}

          {selected.accessStatus !== 'revoked' && selected.status !== 'deleted' ? <form className="message-composer" onSubmit={(event) => void submit(event)}><textarea aria-label={isSensitive(selected) ? 'Нууцлалтай хариу бичих' : 'Мессеж бичих'} value={draft} onChange={(event) => changeDraft(event.target.value)} placeholder={isSensitive(selected) ? 'Нууцлалтай хариу…' : 'Мессеж бичих…'} disabled={!canSend} /><div><span>{!online ? <><WifiOff size={13} /> Офлайн · ноорог энэ төхөөрөмжид хадгалагдсан</> : !canSend ? 'Энэ thread зөвхөн унших төлөвтэй' : 'Internal only · customer consent workflow-г тойрохгүй'}</span><button className="button button--primary" type="submit" disabled={!draft.trim() || !online || !canSend}><Send size={17} />Илгээх</button></div></form> : null}
        </section> : <section className="conversation conversation--empty"><MessageCircle size={32} /><strong>Ярилцлага сонгоно уу</strong><p>Authorized thread-ийн агуулга энд харагдана.</p></section>}

        <aside className="conversation-inspector"><h2>Контекст ба хяналт</h2>{selected ? <>
          <div className="definition-list"><div><span>Хүрээ</span><strong>{selected.scope === 'company' ? 'Компани' : branches.find((item) => item.id === selected.branchId)?.name ?? 'Салбар'}</strong></div><div><span>Owner / urgency</span><strong>{selected.owner} · {selected.urgency}</strong></div><div><span>Retention</span><strong>{selected.retentionLabel}</strong></div><div><span>Export</span><strong>{selected.exportAllowed ? 'Зөвшөөрөлтэй' : 'Хориглосон'}</strong></div><div><span>Эх record</span><strong>{selected.meta.sourceRecord}</strong></div><div><span>Freshness</span><strong>{selected.meta.updatedAt}</strong></div></div>
          <section className="conversation-participants"><h3><Users size={15} />Оролцогчид</h3>{selected.participants.map((participant) => <div key={`${participant.name}-${participant.role}`}><span>{participant.name}<small>{participant.role}</small></span><StatusMark tone={participant.access === 'revoked' ? 'critical' : 'healthy'} label={participant.access === 'revoked' ? 'Цуцлагдсан' : 'Идэвхтэй'} /></div>)}</section>
          <section className="conversation-audit"><h3>Хандалт ба үйлдлийн аудит</h3>{selected.auditTrail.slice().reverse().map((entry) => <div key={entry.id}><span>{entry.action}<small>{entry.actor} · {entry.createdAt}</small></span><p>{entry.detail}</p></div>)}</section>
          <div className="callout callout--warning"><CircleAlert size={17} /><p>Production role, retention, export policy одоогоор approved GitHub policy-гүй тул “configuration pending”. UI нь deny-by-state хамгаалалтыг demo service boundary дээр мөрдөнө.</p></div>
        </> : null}</aside>
      </div>
      <CreateConversationPanel open={createOpen} onClose={closeCreate} onCreated={conversationCreated} branchId={searchParams.get('branch') ?? undefined} title={searchParams.get('title') ?? undefined} body={searchParams.get('body') ?? undefined} context={searchParams.get('context') ?? undefined} />
    </div>
  )
}
