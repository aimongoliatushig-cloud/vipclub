import {
  BadgeDollarSign,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileCheck2,
  Filter,
  HandCoins,
  RotateCcw,
  Search,
  ShieldCheck,
  Star,
  UserRoundCheck,
  WifiOff,
  XCircle,
} from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DataMeta } from '../components/ui/DataMeta'
import { OverlayPanel } from '../components/ui/OverlayPanel'
import { PageHeader } from '../components/ui/PageHeader'
import { StatusMark } from '../components/ui/StatusMark'
import { ManagerApprovalHandoffPanel } from '../features/executive/ExecutiveHandoffPanels'
import type { Approval, ApprovalStatus, ApprovalType } from '../domain/types'
import { ApprovalDecisionError } from '../state/appContextState'
import { useApp } from '../state/useApp'
import { approvalStatusLabel, formatMoney } from '../utils/format'

const typeLabel: Record<ApprovalType, string> = {
  membership: 'Гишүүнчлэл',
  rank: 'Зэрэг',
  loan: 'Зээл',
  plan: 'Үйл ажиллагааны төлөвлөгөө',
  settlement: 'Тооцооны багц',
}

const typeIcon: Record<ApprovalType, typeof UserRoundCheck> = {
  membership: UserRoundCheck,
  rank: Star,
  loan: HandCoins,
  plan: FileCheck2,
  settlement: BadgeDollarSign,
}

const policyStateLabel: Record<Approval['policyState'], string> = {
  approved: 'Батлагдсан тохиргоо',
  'configuration-pending': 'Бизнесийн тохиргоо хүлээгдэж байна',
  'integration-pending': 'Интеграц хүлээгдэж байна',
}

type FinalDecision = 'approved' | 'rejected' | 'retained' | 'overridden'

const finalDecisionLabel: Record<FinalDecision, string> = {
  approved: 'Батлах',
  rejected: 'Татгалзах',
  retained: 'Одоогийн төлөв үлдээх',
  overridden: 'Эрх бүхий override',
}

type QueueTab = 'pending' | 'mine' | 'urgent' | 'recent'
type AgeFilter = 'all' | 'under-hour' | 'one-to-two-hours' | 'over-two-hours'
type FinancialFilter = 'all' | 'financial' | 'non-financial'
type FreshnessFilter = 'all' | 'reconciled' | 'unreconciled'

const matchesAgeFilter = (ageMinutes: number, filter: AgeFilter) => {
  if (filter === 'under-hour') return ageMinutes < 60
  if (filter === 'one-to-two-hours') return ageMinutes >= 60 && ageMinutes <= 120
  if (filter === 'over-two-hours') return ageMinutes > 120
  return true
}

function ApprovalQueueRow({ approval, selected, branchName, onSelect }: { approval: Approval; selected: boolean; branchName: string; onSelect(): void }) {
  const Icon = typeIcon[approval.type]
  return (
    <button type="button" className="approval-row" data-selected={selected || undefined} onClick={onSelect}>
      <span className="approval-row__icon"><Icon size={20} strokeWidth={1.7} aria-hidden="true" /></span>
      <span><strong>{approval.title}</strong><small>{approval.subject}</small></span>
      <span><small>Салбар</small><strong>{branchName}</strong></span>
      <span><small>Хүсэгч / Хянагч</small><strong>{approval.requester}</strong><small>{approval.reviewer}</small></span>
      <span><small>Хүлээгдэж буй</small><strong data-tone={approval.ageMinutes > 120 ? 'critical' : 'attention'}>{Math.floor(approval.ageMinutes / 60) ? `${Math.floor(approval.ageMinutes / 60)} ц ` : ''}{approval.ageMinutes % 60} мин</strong></span>
      <span><small>Нөлөөлөл</small><strong>{approval.amount ? formatMoney(approval.amount) : '—'}</strong></span>
      <span><DataMeta meta={approval.meta} /></span>
      <span><StatusMark tone={['approved', 'retained', 'overridden'].includes(approval.status) ? 'healthy' : approval.status === 'pending' ? approval.urgency : 'neutral'} label={approvalStatusLabel[approval.status]} compact /></span>
      <ChevronRight size={18} aria-hidden="true" />
    </button>
  )
}

function ApprovalDetail({ approval, onDecisionComplete }: { approval: Approval; onDecisionComplete(): void }) {
  const { branches, settlements, decideApproval, online } = useApp()
  const [reason, setReason] = useState('')
  const [working, setWorking] = useState(false)
  const [pendingDecision, setPendingDecision] = useState<FinalDecision | null>(null)
  const [overrideValue, setOverrideValue] = useState(approval.overrideOptions?.[0] ?? '')
  const [decisionError, setDecisionError] = useState<string | null>(null)
  const branch = branches.find((item) => item.id === approval.branchId)
  const settlement = approval.type === 'settlement' ? settlements[0] : undefined
  const canDecide = online && approval.status === 'pending' && approval.meta.reconciled

  const canRetainOrOverride = approval.type === 'membership' || approval.type === 'rank'

  const decide = async (status: Exclude<ApprovalStatus, 'pending'>) => {
    if (!reason.trim()) return
    setWorking(true)
    setDecisionError(null)
    try {
      await decideApproval(approval.id, status, reason.trim(), approval.meta.updatedAt, status === 'overridden' ? overrideValue : undefined)
      setReason('')
      setPendingDecision(null)
      onDecisionComplete()
    } catch (error) {
      setDecisionError(error instanceof Error ? error.message : 'Queue мэдээллийг дахин шалгана уу.')
      setPendingDecision(null)
      if (error instanceof ApprovalDecisionError && error.reconciledStatus && error.reconciledStatus !== 'pending') {
        onDecisionComplete()
      }
    } finally {
      setWorking(false)
    }
  }

  const requestFinalDecision = (status: FinalDecision) => {
    if (!reason.trim() || working || !canDecide || (status === 'overridden' && !overrideValue)) return
    setDecisionError(null)
    setPendingDecision(status)
  }

  return (
    <aside className="approval-detail" aria-label="Шийдвэрийн дэлгэрэнгүй">
      <header className="approval-detail__header">
        <div><small>{branch?.name} · {typeLabel[approval.type]}</small><h2>{approval.title}</h2><p>{approval.subject}</p></div>
        <StatusMark tone={approval.status === 'pending' ? approval.urgency : ['approved', 'retained', 'overridden'].includes(approval.status) ? 'healthy' : 'neutral'} label={approvalStatusLabel[approval.status]} />
      </header>
      <div className="approval-detail__summary">
        {approval.detail.map((item) => <div key={item.label}><span>{item.label}</span><strong data-tone={item.tone}>{item.value}</strong></div>)}
      </div>
      <section className="approval-evidence approval-governance"><header><h3>Эх сурвалж, зөрчил ба үр дагавар</h3><DataMeta meta={approval.meta} detailed /></header><div className="definition-list"><div><span>Санал гаргагч</span><strong>{approval.requester}</strong></div><div><span>Хянагч / owner</span><strong>{approval.reviewer}</strong></div><div><span>Source record</span><strong>{approval.meta.sourceRecord}</strong></div><div><span>Policy / calculation version</span><strong>{approval.meta.policyVersion ?? 'configuration-pending'}</strong></div><div><span>Тохиргооны төлөв</span><strong data-tone={approval.policyState === 'approved' ? 'healthy' : 'attention'}>{policyStateLabel[approval.policyState]}</strong></div></div><div className="approval-evidence-list"><strong>Нотолгооны холбоос</strong>{approval.sourceEvidence.map((item) => <span key={item}>• {item}</span>)}</div>{approval.conflicts.map((conflict) => <div className="callout callout--warning" key={conflict}><CircleAlert size={17} /><p><strong>Зөрчил / нээлттэй нөхцөл.</strong> {conflict}</p></div>)}<div className="callout"><ShieldCheck size={17} /><p><strong>Downstream consequence.</strong> {approval.downstreamConsequence}</p></div></section>
      {approval.type === 'membership' ? <section className="approval-evidence"><header><h3>Гишүүнчлэлийн нотолгоо</h3><ShieldCheck size={18} /></header><div className="definition-list"><div><span>Төлөвлөсөн таван түвшин</span><strong>Bronze → Silver → Gold → Diamond → Black Diamond</strong></div><div><span>Prototype evidence metric</span><strong>Зөвшөөрөгдөх зарцуулалт ÷ дууссан зөвшөөрөгдөх айлчлал</strong></div><div><span>Идэвхтэй салбарын хүрээ</span><strong>{branch?.name} · single-branch evidence · 2026.07.01–08.11</strong></div><div><span>Салбарын босго</span><strong>queen-membership-v4</strong></div><div><span>Менежерийн support / retain</span><strong>Ахиулахыг дэмжсэн · retain exception хүсээгүй</strong></div></div><div className="callout callout--warning"><CircleAlert size={17} /><p><strong>Production policy биш.</strong> GitHub business source дээр formula, level name, refund болон multi-branch дүрэм formal approval хүлээгдэж байна. Энэ нь тодорхой тэмдэглэсэн demo decision state.</p></div></section> : null}
      {approval.type === 'rank' ? <section className="approval-evidence"><header><h3>Зэргийн нотолгоо</h3><Star size={18} /></header><div className="definition-list"><div><span>Хяналтын мөчлөг</span><strong>2 долоо хоног</strong></div><div><span>Ирц</span><strong>96%</strong></div><div><span>Хоцролт / гэнэтийн таслалт</span><strong>1 / 0</strong></div><div><span>Менежерийн санал</span><strong>Rank 1</strong></div><div><span>Томьёо</span><strong>Тохиргоо хүлээгдэж байна</strong></div></div></section> : null}
      {approval.type === 'plan' ? <section className="approval-evidence"><header><h3>Үйл ажиллагааны төлөвлөгөөний нотолгоо</h3><FileCheck2 size={18} /></header><div className="definition-list"><div><span>CEO зорилт</span><strong>26.00 сая ₮</strong></div><div><span>Менежер хүлээн авсан</span><strong>2026.08.01 · 09:35</strong></div><div><span>Үйл ажиллагаа</span><strong>5 · хариуцагчгүй 1</strong></div><div><span>Одоогийн хурд</span><strong data-tone="critical">Төлөвлөснөөс −12 пункт</strong></div></div></section> : null}
      {approval.type === 'loan' ? <section className="approval-evidence"><header><h3>Зээлийн хяналт</h3><HandCoins size={18} /></header><div className="callout callout--danger"><CircleAlert size={17} /><p>Эрхийн шалгуур, дээд хэмжээ, эргэн төлөлтийн хязгаар тодорхойгүй. Үйлдвэрлэлийн орчинд батлах хаалттай; зөвхөн туршилтын шийдвэрийн төлөв.</p></div></section> : null}
      {settlement ? <section className="approval-evidence settlement-evidence"><header><h3>Дүнгийн бүрэлдэхүүн</h3><DataMeta meta={settlement.meta} /></header><div className="settlement-lines">{settlement.lines.map((line) => <div key={line.label}><span>{line.label}</span><strong data-tone={line.amount < 0 ? 'critical' : 'healthy'}>{formatMoney(line.amount)}</strong></div>)}<div className="settlement-lines__total"><span>Цэвэр олголт</span><strong>{formatMoney(approval.amount ?? 0)}</strong></div></div><div className="definition-list"><div><span>Бодлогын хувилбар</span><strong>{settlement.meta.policyVersion}</strong></div><div><span>Нягтлан хянасан</span><strong>{settlement.accountant} · 08:06</strong></div><div><span>Онцгой тохиолдол</span><strong data-tone="critical">{settlement.exceptionCount}</strong></div><div><span>Үүргийн салалт</span><strong>Нягтлан хянасан → CEO батална → Payment accountant илгээнэ → Банк status буцаана</strong></div></div></section> : null}
      <section className="approval-audit"><h3>Өөрчлөлт ба аудитын түүх</h3>{approval.history.map((event) => <div key={`${event.at}-${event.action}`}><span className="audit-dot" /><strong>{event.actor}<small>{event.role}</small></strong><p>{event.action}<small>{event.sourceVersion}</small></p><small>{event.at}</small></div>)}{approval.status !== 'pending' ? <div><span className="audit-dot" /><strong>Баттүшиг<small>CEO</small></strong><p>{approvalStatusLabel[approval.status]}{approval.overrideValue ? ` · ${approval.overrideValue}` : ''} · {approval.decisionReason}</p><small>Одоо</small></div> : null}</section>
      <form className="decision-form" onSubmit={(event: FormEvent) => { event.preventDefault(); requestFinalDecision('approved') }}>
        {!online ? <div className="callout callout--warning" role="status"><WifiOff size={17} /><p><strong>Офлайн үед шийдвэр хаалттай.</strong> Холболт сэргэж, эх өгөгдлийн хувилбарыг дахин шалгасны дараа үргэлжлүүлнэ.</p></div> : null}
        {!approval.meta.reconciled ? <div className="callout callout--danger" role="alert"><CircleAlert size={17} /><p><strong>Эх өгөгдлийн тулгалт дутуу.</strong> Нотолгоо бүрэн тулгагдах хүртэл бүх эцсийн шийдвэр хаалттай.</p></div> : null}
        <label><span>Шийдвэрийн тайлбар / шалтгаан <b>*</b></span><textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Шийдвэрийн үндэслэлээ бичнэ үү…" maxLength={300} disabled={!canDecide} /></label>
        <small>{reason.length}/300 · Өөрчлөх боломжгүй аудитад хадгалагдана</small>
        {decisionError ? <div className="callout callout--danger" role="alert"><CircleAlert size={17} /><p><strong>Шийдвэр хадгалагдсангүй.</strong> {decisionError} Queue мэдээллийг шинэчиллээ.</p></div> : null}
        <div className="decision-actions"><button className="button button--secondary" type="button" onClick={() => void decide('returned')} disabled={!reason.trim() || working || !canDecide}><RotateCcw size={17} />Буцаах</button><button className="button button--danger-outline" type="button" onClick={() => requestFinalDecision('rejected')} disabled={!reason.trim() || working || !canDecide}><XCircle size={17} />Татгалзах</button><button className="button button--primary" type="submit" disabled={!reason.trim() || working || !canDecide}>Батлах</button></div>
        {canRetainOrOverride ? <div className="decision-override"><label><span>Override үр дүн</span><select value={overrideValue} onChange={(event) => setOverrideValue(event.target.value)} disabled={!canDecide}>{approval.overrideOptions?.map((option) => <option key={option} value={option}>{option}</option>)}</select></label><div><button className="button button--secondary" type="button" onClick={() => requestFinalDecision('retained')} disabled={!reason.trim() || working || !canDecide}>Одоогийн төлөв үлдээх</button><button className="button button--danger-outline" type="button" onClick={() => requestFinalDecision('overridden')} disabled={!reason.trim() || working || !canDecide || !overrideValue}>Эрх бүхий override</button></div></div> : null}
      </form>
      <div className="sod-note"><CircleAlert size={18} /><p><strong>Салалтын үүргийн зарчим:</strong> {approval.reviewer} хянасан. CEO шийдвэр шаардлагатай. Эх өгөгдөл өөрчлөгдвөл дахин хянана.</p></div>
      <OverlayPanel
        open={pendingDecision !== null}
        variant="modal"
        title={pendingDecision === 'approved' ? 'Шийдвэрийг баталгаажуулах' : pendingDecision ? `${finalDecisionLabel[pendingDecision]} шийдвэрийг баталгаажуулах` : 'Шийдвэрийг баталгаажуулах'}
        description={`${approval.title} · ${approval.subject}`}
        onClose={() => { if (!working) setPendingDecision(null) }}
        footer={<><button className="button button--secondary" type="button" onClick={() => setPendingDecision(null)} disabled={working}>Болих</button><button className={pendingDecision === 'rejected' || pendingDecision === 'overridden' ? 'button button--danger-outline' : 'button button--primary'} type="button" onClick={() => pendingDecision && void decide(pendingDecision)} disabled={working}>{working ? 'Хадгалж байна…' : pendingDecision ? `Эцэслэн ${finalDecisionLabel[pendingDecision].toLowerCase()}` : 'Эцэслэх'}</button></>}
      >
        <div className="callout callout--danger"><CircleAlert size={18} /><p><strong>Энэ нь эцсийн шийдвэр.</strong> Хадгалсны дараа шууд засах боломжгүй бөгөөд үндэслэл өөрчлөх боломжгүй аудитад үлдэнэ. Давхар илгээлт болон хуучирсан эх өгөгдлийн хувилбар автоматаар хаагдана.</p></div>
        <div className="definition-list"><div><span>Шийдвэр</span><strong>{pendingDecision ? finalDecisionLabel[pendingDecision] : '—'}</strong></div>{pendingDecision === 'overridden' ? <div><span>Override үр дүн</span><strong>{overrideValue}</strong></div> : null}<div><span>Шийдвэр гаргагч</span><strong>CEO · эцсийн шийдвэр гаргагч</strong></div><div><span>Хянагч</span><strong>{approval.reviewer}</strong></div><div><span>Эх өгөгдлийн хувилбар</span><strong>{approval.meta.updatedAt}</strong></div><div><span>Үндэслэл</span><strong>{reason.trim()}</strong></div><div><span>Downstream consequence</span><strong>{approval.downstreamConsequence}</strong></div></div>
      </OverlayPanel>
    </aside>
  )
}

export default function ApprovalsPage() {
  const { approvals, branches } = useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const [typeFilter, setTypeFilter] = useState<'all' | ApprovalType>('all')
  const [branchFilter, setBranchFilter] = useState('all')
  const [queueTab, setQueueTab] = useState<QueueTab>('pending')
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | Approval['urgency']>('all')
  const [ageFilter, setAgeFilter] = useState<AgeFilter>('all')
  const [requesterFilter, setRequesterFilter] = useState('all')
  const [reviewerFilter, setReviewerFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | ApprovalStatus>('all')
  const [financialFilter, setFinancialFilter] = useState<FinancialFilter>('all')
  const [freshnessFilter, setFreshnessFilter] = useState<FreshnessFilter>('all')
  const [query, setQuery] = useState('')
  const selectedId = searchParams.get('selected')
  const requesters = useMemo(() => Array.from(new Set(approvals.map((approval) => approval.requester))).sort(), [approvals])
  const reviewers = useMemo(() => Array.from(new Set(approvals.map((approval) => approval.reviewer))).sort(), [approvals])

  const filtered = useMemo(() => approvals.filter((approval) => {
    const matchesTab = queueTab === 'recent'
      ? approval.status !== 'pending'
      : queueTab === 'urgent'
        ? approval.status === 'pending' && approval.urgency === 'critical'
        : approval.status === 'pending'
    const matchesType = typeFilter === 'all' || approval.type === typeFilter
    const matchesBranch = branchFilter === 'all' || approval.branchId === branchFilter
    const matchesUrgency = urgencyFilter === 'all' || approval.urgency === urgencyFilter
    const matchesRequester = requesterFilter === 'all' || approval.requester === requesterFilter
    const matchesReviewer = reviewerFilter === 'all' || approval.reviewer === reviewerFilter
    const matchesStatus = statusFilter === 'all' || approval.status === statusFilter
    const matchesFinancial = financialFilter === 'all' || approval.financial === (financialFilter === 'financial')
    const matchesFreshness = freshnessFilter === 'all' || approval.meta.reconciled === (freshnessFilter === 'reconciled')
    const matchesQuery = `${approval.title} ${approval.subject} ${approval.requester} ${approval.reviewer} ${approval.sourceEvidence.join(' ')} ${approval.conflicts.join(' ')}`.toLowerCase().includes(query.toLowerCase())
    return matchesTab && matchesType && matchesBranch && matchesUrgency && matchesAgeFilter(approval.ageMinutes, ageFilter) && matchesRequester && matchesReviewer && matchesStatus && matchesFinancial && matchesFreshness && matchesQuery
  }), [approvals, queueTab, typeFilter, branchFilter, urgencyFilter, ageFilter, requesterFilter, reviewerFilter, statusFilter, financialFilter, freshnessFilter, query])

  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0]
  const select = (id: string) => setSearchParams({ selected: id })
  const pending = approvals.filter((item) => item.status === 'pending').length
  const urgent = approvals.filter((item) => item.status === 'pending' && item.urgency === 'critical').length
  const recent = approvals.filter((item) => item.status !== 'pending').length
  const resetFilters = () => {
    setTypeFilter('all')
    setBranchFilter('all')
    setUrgencyFilter('all')
    setAgeFilter('all')
    setRequesterFilter('all')
    setReviewerFilter('all')
    setStatusFilter('all')
    setFinancialFilter('all')
    setFreshnessFilter('all')
    setQuery('')
  }

  return (
    <div className="page approvals-page">
      <PageHeader title="Шийдвэрүүд" description="Нэг дараалал · домэйн бүрийн нотолгоо · заавал үндэслэл · өөрчлөх боломжгүй аудит." actions={<StatusMark tone="critical" label={`${urgent} яаралтай`} />} />
      <ManagerApprovalHandoffPanel />
      <div className="approval-tabs" role="tablist"><button type="button" role="tab" aria-selected={queueTab === 'pending'} onClick={() => setQueueTab('pending')}>Бүх хүлээгдэж буй <span>{pending}</span></button><button type="button" role="tab" aria-selected={queueTab === 'mine'} onClick={() => setQueueTab('mine')}>Миний тоймлох <span>{pending}</span></button><button type="button" role="tab" aria-selected={queueTab === 'urgent'} onClick={() => setQueueTab('urgent')}>Эскалацтай <span>{urgent}</span></button><button type="button" role="tab" aria-selected={queueTab === 'recent'} onClick={() => setQueueTab('recent')}>Саяхан шийдсэн <span>{recent}</span></button></div>
      <div className="approval-workbench">
        <section className="approval-queue" aria-label="Шийдвэрийн queue">
          <div className="approval-filters">
            <label><span>Салбар</span><select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}><option value="all">Бүх салбар</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
            <label><span>Шийдвэрийн төрөл</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as 'all' | ApprovalType)}><option value="all">Бүгд</option>{Object.entries(typeLabel).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label><span>Эрсдэл</span><select value={urgencyFilter} onChange={(event) => setUrgencyFilter(event.target.value as 'all' | Approval['urgency'])}><option value="all">Бүгд</option><option value="critical">Яаралтай</option><option value="attention">Анхаарах</option><option value="healthy">Хэвийн</option><option value="neutral">Мэдээллийн</option></select></label>
            <label><span>Хугацаа / SLA</span><select value={ageFilter} onChange={(event) => setAgeFilter(event.target.value as AgeFilter)}><option value="all">Бүх хугацаа</option><option value="under-hour">60 минутаас бага</option><option value="one-to-two-hours">1–2 цаг</option><option value="over-two-hours">2 цагаас их</option></select></label>
            <label><span>Хүсэгч</span><select value={requesterFilter} onChange={(event) => setRequesterFilter(event.target.value)}><option value="all">Бүх хүсэгч</option>{requesters.map((requester) => <option key={requester} value={requester}>{requester}</option>)}</select></label>
            <label><span>Хянагч / owner</span><select value={reviewerFilter} onChange={(event) => setReviewerFilter(event.target.value)}><option value="all">Бүх owner</option>{reviewers.map((reviewer) => <option key={reviewer} value={reviewer}>{reviewer}</option>)}</select></label>
            <label><span>Шийдвэрийн төлөв</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | ApprovalStatus)}><option value="all">Бүх төлөв</option><option value="pending">Хүлээгдэж буй</option><option value="approved">Батлагдсан</option><option value="returned">Буцаасан</option><option value="rejected">Татгалзсан</option><option value="retained">Одоогийн төлөв үлдсэн</option><option value="overridden">Override</option></select></label>
            <label><span>Нөлөөлөл</span><select value={financialFilter} onChange={(event) => setFinancialFilter(event.target.value as FinancialFilter)}><option value="all">Бүгд</option><option value="financial">Санхүүгийн</option><option value="non-financial">Санхүүгийн бус</option></select></label>
            <label><span>Эх өгөгдлийн тулгалт</span><select value={freshnessFilter} onChange={(event) => setFreshnessFilter(event.target.value as FreshnessFilter)}><option value="all">Бүгд</option><option value="reconciled">Тулгалт хийгдсэн</option><option value="unreconciled">Тулгалт дутуу</option></select></label>
            <label className="approval-search"><span>Хайлт</span><span><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Хүсэлт, ажилтан…" /></span></label>
            <div className="approval-filter-summary" role="status"><span>{filtered.length} хүсэлт</span><button className="button button--secondary" type="button" onClick={resetFilters}><Filter size={17} />Цэвэрлэх</button></div>
          </div>
          <div className="approval-queue__head"><span>Төрөл</span><span>Сэдэв</span><span>Салбар</span><span>Хүсэгч</span><span>Хүлээгдэж буй</span><span>Нөлөөлөл</span><span>Эх үүсвэр</span><span>Төлөв</span><span /></div>
          <div className="approval-queue__rows">{filtered.map((approval) => <ApprovalQueueRow key={approval.id} approval={approval} selected={selected?.id === approval.id} branchName={branches.find((item) => item.id === approval.branchId)?.name ?? '—'} onSelect={() => select(approval.id)} />)}</div>
          {filtered.length === 0 ? <div className="empty-state"><Clock3 size={26} /><strong>Хүсэлт олдсонгүй</strong><p>Шүүлтүүрээ өөрчилж дахин шалгана уу.</p></div> : null}
        </section>
        {selected ? <ApprovalDetail key={selected.id} approval={selected} onDecisionComplete={() => setQueueTab('recent')} /> : null}
      </div>
    </div>
  )
}
