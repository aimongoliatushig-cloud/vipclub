import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  Target,
  Users,
} from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { StatusMark } from '../../components/ui/StatusMark'
import type { ManagementSession } from '../../shared/managementAccess'
import {
  attendanceStatusLabels,
  entertainerRankLabels,
  formatDate,
  formatDateTime,
  formatMoney,
  leaveRequestStatusLabels,
  leaveRequestTypeLabels,
  membershipLevelLabels,
  penaltyReviewStateLabels,
  rosterStatusLabels,
} from '../workforce/localization'
import type { ManagerRecommendation, RecommendationStatus, RecommendationType } from '../workforce/managerBusinessModels'
import type { SalesGoalProposal, SalesGoalProposalState } from '../workforce/managerOperationsModels'
import { BrowserWorkforceService } from '../workforce/workforceService'
import type { ExecutiveGoalDecision, ExecutiveRecommendationDecision, ExecutiveSnapshot } from './executiveModels'
import { BrowserExecutiveService } from './executiveService'

const goalStateLabels: Record<SalesGoalProposalState, string> = {
  draft: 'Ноорог',
  submitted: 'CEO шийдвэр хүлээж байна',
  'revision-requested': 'Засвар хүссэн',
  approved: 'Баталсан',
  rejected: 'Татгалзсан',
}

const recommendationStateLabels: Record<RecommendationStatus, string> = {
  draft: 'Ноорог',
  submitted: 'CEO шийдвэр хүлээж байна',
  'revision-requested': 'Засвар хүссэн',
  approved: 'Баталсан',
  rejected: 'Татгалзсан',
}

const recommendationTypeLabels: Record<RecommendationType, string> = {
  'entertainer-rank': 'Энтертайнерын зэрэг ахиулах санал',
  'customer-membership': 'Харилцагчийн гишүүнчлэлийн санал',
}

const stateTone = (state: SalesGoalProposalState | RecommendationStatus) => {
  if (state === 'approved') return 'healthy' as const
  if (state === 'submitted' || state === 'revision-requested') return 'attention' as const
  if (state === 'rejected') return 'critical' as const
  return 'neutral' as const
}

function toManagementSession(session: ReturnType<typeof useAuth>['session']): ManagementSession {
  return {
    userId: session.userId,
    displayName: session.displayName,
    initials: session.initials,
    role: 'ceo',
    branchIds: session.branchIds,
    permissions: [
      'company.dashboard.read',
      'company.approvals.read',
      'company.approvals.write',
      'company.branches.read',
      'company.crm.read',
    ],
    source: session.source,
  }
}

function useExecutiveHandoff() {
  const { session } = useAuth()
  const service = useMemo(() => new BrowserExecutiveService(toManagementSession(session)), [session])
  const [snapshot, setSnapshot] = useState<ExecutiveSnapshot>(() => service.getSnapshot())

  const refresh = () => setSnapshot(service.getSnapshot())
  const reviewGoal = (proposalId: string, decision: ExecutiveGoalDecision, comment: string) => {
    setSnapshot(service.reviewGoalProposal(proposalId, decision, comment).snapshot)
  }
  const reviewRecommendation = (recommendationId: string, decision: ExecutiveRecommendationDecision, comment: string) => {
    setSnapshot(service.reviewRecommendation(recommendationId, decision, comment).snapshot)
  }

  return { snapshot, refresh, reviewGoal, reviewRecommendation }
}

function pendingDecisionCount(snapshot: ExecutiveSnapshot): number {
  return Number(snapshot.operations.goalProposal.state === 'submitted')
    + snapshot.business.recommendations.filter((item) => item.status === 'submitted').length
}

export function ExecutiveHandoffOverview() {
  const navigate = useNavigate()
  const { snapshot, refresh } = useExecutiveHandoff()
  const decisionCount = pendingDecisionCount(snapshot)
  const pendingLeave = snapshot.workforce.leaveRequests.filter((item) => item.status === 'pending').length
  const unreadNotifications = snapshot.business.notifications.filter((item) => !item.readAt).length
  const unresolvedOperations = snapshot.business.reservations.filter((item) => item.status === 'requested').length
    + snapshot.business.maintenance.filter((item) => ['submitted', 'rework'].includes(item.status)).length
    + snapshot.business.complaints.filter((item) => item.status !== 'resolved').length

  return (
    <section className="manager-handoff-overview" aria-labelledby="manager-handoff-overview-title">
      <header>
        <div>
          <span className="manager-handoff-kicker">САЛБАРЫН ШУУД МЭДЭЭЛЭЛ</span>
          <h2 id="manager-handoff-overview-title">Менежерүүдээс ирсэн шинэ мэдээлэл</h2>
          <p>Зорилго, зөвшөөрөл, хуваарь, ирц болон CRM-ийн нэгтгэсэн хяналт.</p>
        </div>
        <button className="icon-button" type="button" onClick={refresh} aria-label="Менежерийн мэдээллийг шинэчлэх"><RefreshCw size={17} /></button>
      </header>
      <div className="manager-handoff-overview__grid">
        <button type="button" onClick={() => navigate('/approvals?source=manager')}>
          <span className="manager-handoff-icon" data-tone={decisionCount ? 'critical' : 'healthy'}><ClipboardCheck size={19} /></span>
          <span><small>CEO шийдвэр</small><strong>{decisionCount} хүлээгдэж байна</strong><em>Зорилго ба ахиулах саналууд</em></span>
          <ArrowRight size={17} />
        </button>
        <button type="button" onClick={() => navigate('/workforce/manager-evidence')}>
          <span className="manager-handoff-icon" data-tone={snapshot.workforce.openCoverageGaps ? 'critical' : 'healthy'}><CalendarCheck2 size={19} /></span>
          <span><small>Хуваарь ба ирц</small><strong>{snapshot.workforce.openCoverageGaps} нөхөгдөөгүй · {pendingLeave} чөлөө</strong><em>{snapshot.workforce.penaltyReviews.length} хоцролт/таслалтын хяналт</em></span>
          <ArrowRight size={17} />
        </button>
        <button type="button" onClick={() => navigate('/branches')}>
          <span className="manager-handoff-icon" data-tone={unresolvedOperations ? 'attention' : 'healthy'}><AlertTriangle size={19} /></span>
          <span><small>Салбарын ажиллагаа</small><strong>{unresolvedOperations} нээлттэй ажил</strong><em>{unreadNotifications} уншаагүй менежерийн мэдэгдэл</em></span>
          <ArrowRight size={17} />
        </button>
        <button type="button" onClick={() => navigate('/customers?source=manager')}>
          <span className="manager-handoff-icon" data-tone="healthy"><Users size={19} /></span>
          <span><small>CRM ба эрэмбэ</small><strong>{snapshot.insights.customers.length} харилцагч · {snapshot.insights.entertainerRankings.length} ажилтан</strong><em>Нийт ба дундаж зарцуулалтын нотолгоо</em></span>
          <ArrowRight size={17} />
        </button>
      </div>
      <footer>Сүүлд шинэчилсэн: {formatDateTime(snapshot.refreshedAt)} · Төв салбарын менежерийн эх бүртгэл</footer>
    </section>
  )
}

interface DecisionFormProps {
  id: string
  onDecision(decision: 'approve' | 'revision' | 'reject', comment: string): void
}

function ManagerDecisionForm({ id, onDecision }: DecisionFormProps) {
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)

  const decide = (decision: 'approve' | 'revision' | 'reject') => {
    try {
      onDecision(decision, comment)
      setComment('')
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Шийдвэр хадгалагдсангүй.')
    }
  }

  return (
    <form className="manager-decision-form" onSubmit={(event: FormEvent) => { event.preventDefault(); decide('approve') }}>
      <label htmlFor={`${id}-comment`}>Шийдвэрийн тайлбар <b>*</b></label>
      <textarea id={`${id}-comment`} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Үндэслэл, шаардлагатай дараагийн алхмыг бичнэ үү…" maxLength={300} />
      <small>{comment.length}/300 · Менежерт шийдвэр гаргагч, огноо, тайлбартай харагдана.</small>
      {error ? <p className="manager-decision-form__error" role="alert">{error}</p> : null}
      <div>
        <button className="button button--danger-outline" type="button" disabled={comment.trim().length < 5} onClick={() => decide('reject')}>Татгалзах</button>
        <button className="button button--secondary" type="button" disabled={comment.trim().length < 5} onClick={() => decide('revision')}>Засвар хүсэх</button>
        <button className="button button--primary" type="submit" disabled={comment.trim().length < 5}>Санал батлах</button>
      </div>
    </form>
  )
}

function GoalApprovalCard({ proposal, onDecision }: { proposal: SalesGoalProposal; onDecision(decision: ExecutiveGoalDecision, comment: string): void }) {
  return (
    <article className="manager-approval-card" data-state={proposal.state}>
      <header>
        <span className="manager-handoff-icon"><Target size={19} /></span>
        <div><small>Дараагийн сарын борлуулалтын зорилго</small><h3>{proposal.managerName} · {proposal.month}</h3></div>
        <StatusMark tone={stateTone(proposal.state)} label={goalStateLabels[proposal.state]} />
      </header>
      <div className="manager-approval-card__metrics">
        <div><span>Санал болгосон зорилт</span><strong>{formatMoney(proposal.proposedTarget)}</strong></div>
        <div><span>Hermes зөвлөмж</span><strong>{formatMoney(proposal.recommendation.recommendedTarget)}</strong></div>
        <div><span>Үйл ажиллагаа</span><strong>{proposal.actions.length}</strong></div>
        <div><span>Хувилбар</span><strong>v{proposal.version}</strong></div>
      </div>
      <p>{proposal.rationale}</p>
      <div className="manager-approval-card__evidence"><ShieldCheck size={16} /><span>{proposal.recommendation.sourceSummary}</span></div>
      {proposal.ceoComment ? <blockquote><strong>CEO тайлбар</strong>{proposal.ceoComment}</blockquote> : null}
      {proposal.state === 'submitted' ? <ManagerDecisionForm id={proposal.id} onDecision={onDecision} /> : <p className="manager-approval-card__waiting">{proposal.state === 'draft' ? 'Менежер саналаа CEO-д илгээсний дараа шийдвэрийн товч идэвхжинэ.' : `Энэ санал ${goalStateLabels[proposal.state].toLowerCase()} төлөвтэй.`}</p>}
    </article>
  )
}

function RecommendationApprovalCard({ recommendation, onDecision }: { recommendation: ManagerRecommendation; onDecision(decision: ExecutiveRecommendationDecision, comment: string): void }) {
  return (
    <article className="manager-approval-card" data-state={recommendation.status}>
      <header>
        <span className="manager-handoff-icon"><Star size={19} /></span>
        <div><small>{recommendationTypeLabels[recommendation.type]}</small><h3>{recommendation.subjectName}</h3></div>
        <StatusMark tone={stateTone(recommendation.status)} label={recommendationStateLabels[recommendation.status]} />
      </header>
      <div className="manager-approval-card__change">
        <span><small>Одоогийн</small><strong>{recommendation.currentValue}</strong></span>
        <ArrowRight size={18} />
        <span><small>Санал</small><strong>{recommendation.proposedValue}</strong></span>
      </div>
      <p>{recommendation.reason}</p>
      <div className="manager-approval-card__evidence"><ShieldCheck size={16} /><span>{recommendation.evidenceSummary} · {recommendation.policyNote}</span></div>
      {recommendation.decisionComment ? <blockquote><strong>CEO тайлбар</strong>{recommendation.decisionComment}</blockquote> : null}
      {recommendation.status === 'submitted' ? <ManagerDecisionForm id={recommendation.id} onDecision={onDecision} /> : <p className="manager-approval-card__waiting">{recommendation.status === 'draft' ? 'Менежер саналаа CEO-д илгээгээгүй байна.' : `Энэ санал ${recommendationStateLabels[recommendation.status].toLowerCase()} төлөвтэй.`}</p>}
    </article>
  )
}

export function ManagerApprovalHandoffPanel() {
  const { snapshot, refresh, reviewGoal, reviewRecommendation } = useExecutiveHandoff()
  const pending = pendingDecisionCount(snapshot)

  return (
    <section className="manager-handoff-section manager-approvals" aria-labelledby="manager-approval-title">
      <header className="manager-handoff-section__header">
        <div><span className="manager-handoff-kicker">МЕНЕЖЕР → CEO</span><h2 id="manager-approval-title">Менежерээс ирсэн хүсэлт</h2><p>Салбарын зорилго, энтертайнерын зэрэг, харилцагчийн гишүүнчлэлийн нотолгоотой санал.</p></div>
        <div><StatusMark tone={pending ? 'critical' : 'healthy'} label={`${pending} шийдвэр хүлээж байна`} /><button className="icon-button" type="button" onClick={refresh} aria-label="Хүсэлтийн жагсаалтыг шинэчлэх"><RefreshCw size={17} /></button></div>
      </header>
      <div className="manager-approval-grid">
        <GoalApprovalCard proposal={snapshot.operations.goalProposal} onDecision={(decision, comment) => reviewGoal(snapshot.operations.goalProposal.id, decision, comment)} />
        {snapshot.business.recommendations.map((item) => <RecommendationApprovalCard key={item.id} recommendation={item} onDecision={(decision, comment) => reviewRecommendation(item.id, decision, comment)} />)}
      </div>
    </section>
  )
}

export function ExecutiveGoalProposalSummary() {
  const navigate = useNavigate()
  const { snapshot } = useExecutiveHandoff()
  const proposal = snapshot.operations.goalProposal

  return (
    <section className="manager-goal-summary" aria-labelledby="manager-goal-summary-title">
      <div className="manager-goal-summary__icon"><Target size={22} /></div>
      <div><span className="manager-handoff-kicker">МЕНЕЖЕРИЙН ДАРААГИЙН САРЫН САНАЛ</span><h2 id="manager-goal-summary-title">{proposal.managerName} · {proposal.month}</h2><p>{proposal.rationale}</p></div>
      <div className="manager-goal-summary__value"><span>Санал</span><strong>{formatMoney(proposal.proposedTarget)}</strong><StatusMark tone={stateTone(proposal.state)} label={goalStateLabels[proposal.state]} /></div>
      <button className="button button--secondary" type="button" onClick={() => navigate('/approvals?source=manager')}>Нотолгоо ба шийдвэр <ArrowRight size={16} /></button>
    </section>
  )
}

export function ExecutiveWorkforceHandoffPanel() {
  const { snapshot, refresh } = useExecutiveHandoff()
  const workforceService = useMemo(() => new BrowserWorkforceService(), [])
  const members = useMemo(() => new Map(workforceService.getTeamMembers(snapshot.workforce.roster.branchId).map((item) => [item.id, item])), [snapshot.workforce.roster.branchId, workforceService])
  const { roster, followUp, leaveRequests, penaltyReviews } = snapshot.workforce

  return (
    <section className="manager-handoff-section manager-workforce-evidence" aria-labelledby="manager-workforce-title">
      <header className="manager-handoff-section__header">
        <div><span className="manager-handoff-kicker">МЕНЕЖЕРИЙН ХУВААРИЙН НОТОЛГОО</span><h2 id="manager-workforce-title">Долоо хоногийн хуваарь, чөлөө ба ирцийн хяналт</h2><p>{roster.branchName} · {formatDate(roster.weekStart)} эхлэх долоо хоног</p></div>
        <div><StatusMark tone={roster.status === 'published' ? 'healthy' : 'attention'} label={`${rosterStatusLabels[roster.status]} · v${roster.version}`} /><button className="icon-button" type="button" onClick={refresh} aria-label="Хуваарийн нотолгоог шинэчлэх"><RefreshCw size={17} /></button></div>
      </header>
      <div className="manager-workforce-summary">
        <div><CalendarCheck2 size={18} /><span>Нийтлэх төлөв</span><strong>{followUp.publicationLabel}</strong><small>Хариуцагч: {followUp.accountableManager}</small></div>
        <div><Users size={18} /><span>Нөхөгдөөгүй ээлж</span><strong data-tone={followUp.coverageGapCount ? 'critical' : 'healthy'}>{followUp.coverageGapCount}</strong><small>{followUp.nextAction}</small></div>
        <div><CheckCircle2 size={18} /><span>Баталгаажуулалт</span><strong>{followUp.pendingAcknowledgementCount} хүлээгдэж буй</strong><small>{followUp.changeRequestCount} өөрчлөх хүсэлт</small></div>
        <div><Clock3 size={18} /><span>Дараагийн хугацаа</span><strong>{formatDate(followUp.dueDate)}</strong><small>{followUp.lastManagerAction}</small></div>
      </div>
      <div className="manager-workforce-columns">
        <article>
          <header><div><h3>Чөлөө ба амралтын хүсэлт</h3><p>Менежер шийдвэрлэсэн болон хүлээгдэж буй бүх хүсэлт.</p></div><StatusMark tone={leaveRequests.some((item) => item.status === 'pending') ? 'attention' : 'healthy'} label={`${leaveRequests.length} хүсэлт`} /></header>
          <div className="manager-evidence-list">
            {leaveRequests.map((request) => <div key={request.id}><span className="avatar avatar--small">{members.get(request.teamMemberId)?.initials ?? 'БГ'}</span><span><strong>{members.get(request.teamMemberId)?.name ?? 'Багийн гишүүн'}</strong><small>{leaveRequestTypeLabels[request.type]} · {formatDate(request.startDate)}–{formatDate(request.endDate)} · {request.reason}</small></span><StatusMark tone={request.status === 'approved' ? 'healthy' : request.status === 'rejected' ? 'critical' : 'attention'} label={leaveRequestStatusLabels[request.status]} /></div>)}
          </div>
        </article>
        <article>
          <header><div><h3>Хоцролт ба ирээгүйн торгуулийн хяналт</h3><p>Торгуулийн дүн автоматаар бодохгүй; ирц ба батлагдсан бодлогыг тусад нь хянана.</p></div><StatusMark tone={penaltyReviews.length ? 'attention' : 'healthy'} label={`${penaltyReviews.length} тохиолдол`} /></header>
          <div className="manager-evidence-list">
            {penaltyReviews.map((review) => <div key={review.id}><span className="avatar avatar--small">{members.get(review.teamMemberId)?.initials ?? 'БГ'}</span><span><strong>{members.get(review.teamMemberId)?.name ?? 'Багийн гишүүн'} · {review.attendanceType === 'late' ? `${review.lateMinutes ?? 0} минут хоцорсон` : 'Мэдэгдэлгүй ирээгүй'}</strong><small>{formatDate(review.date)} · {review.evidence} · {attendanceStatusLabels[review.attendanceStatus]}</small></span><StatusMark tone={review.state === 'excluded' ? 'neutral' : 'attention'} label={penaltyReviewStateLabels[review.state]} /></div>)}
          </div>
          <div className="manager-policy-note"><ShieldCheck size={17} /><p><strong>Бодлогын хамгаалалт:</strong> CL-013 торгуулийн хэмжээ, суутгалын дүрэм эцэслэн батлагдаагүй тул “Дүн тооцоогүй” төлөвтэй.</p></div>
        </article>
      </div>
    </section>
  )
}

export function ExecutiveCrmRankingPanel() {
  const { snapshot, refresh } = useExecutiveHandoff()
  const workforceService = useMemo(() => new BrowserWorkforceService(), [])
  const members = useMemo(() => new Map(workforceService.getTeamMembers().map((item) => [item.id, item])), [workforceService])
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLocaleLowerCase('mn-MN')
  const customers = snapshot.insights.customers
    .filter((item) => !normalizedQuery || item.displayName.toLocaleLowerCase('mn-MN').includes(normalizedQuery) || item.maskedPhone.includes(normalizedQuery))
    .slice()
    .sort((left, right) => right.lifetimeValue - left.lifetimeValue)

  return (
    <section className="manager-handoff-section manager-crm-ranking" aria-labelledby="manager-crm-title">
      <header className="manager-handoff-section__header">
        <div><span className="manager-handoff-kicker">МЕНЕЖЕРИЙН CRM НОТОЛГОО</span><h2 id="manager-crm-title">Харилцагч ба багийн эрэмбэ</h2><p>Утасны дугаарыг далдалсан, нийт ба дундаж зарцуулалттай салбарын хүрээний мэдээлэл.</p></div>
        <div><label className="manager-crm-search"><Search size={16} /><input aria-label="Харилцагчийг нэр эсвэл утасны дугаараар хайх" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Нэр, утасны сүүлийн орон" /></label><button className="icon-button" type="button" onClick={refresh} aria-label="CRM мэдээллийг шинэчлэх"><RefreshCw size={17} /></button></div>
      </header>
      <div className="manager-crm-columns">
        <article>
          <header><div><h3>Харилцагчийн зарцуулалтын эрэмбэ</h3><p>{customers.length} зөвшөөрөгдсөн CRM бүртгэл</p></div></header>
          <div className="manager-ranking-table">
            <div className="manager-ranking-table__head"><span>Харилцагч</span><span>Түвшин</span><span>Нийт зарцуулалт</span><span>Дундаж</span></div>
            {customers.map((customer, index) => <div key={customer.id}><span><b>{index + 1}</b><span><strong>{customer.displayName}</strong><small>{customer.maskedPhone} · {customer.visits90d} айлчлал / 90 хоног</small></span></span><span>{membershipLevelLabels[customer.membershipLevel]}</span><strong>{formatMoney(customer.lifetimeValue)}</strong><span>{formatMoney(customer.averageSpend)}</span></div>)}
          </div>
        </article>
        <article>
          <header><div><h3>Энтертайнерын гүйцэтгэлийн эрэмбэ</h3><p>Ирц, борлуулалтын хандлага, давтан харилцагчийн нотолгоо.</p></div></header>
          <div className="manager-entertainer-ranking">
            {snapshot.insights.entertainerRankings.map((ranking, index) => <div key={ranking.teamMemberId}><span className="manager-ranking-position">{index + 1}</span><span className="avatar avatar--small">{members.get(ranking.teamMemberId)?.initials ?? 'ЭТ'}</span><span><strong>{members.get(ranking.teamMemberId)?.name ?? 'Энтертайнер'}</strong><small>{entertainerRankLabels[ranking.currentRank]} · {ranking.rankPolicyVersion ?? 'Бодлого хүлээгдэж буй'}</small></span><span><small>Ирц</small><strong>{ranking.attendancePercent}%</strong></span><span><small>Борлуулалт</small><strong data-tone={ranking.salesTrendPercent >= 0 ? 'healthy' : 'critical'}>{ranking.salesTrendPercent > 0 ? '+' : ''}{ranking.salesTrendPercent}%</strong></span><span><small>Давтан</small><strong>{ranking.repeatCustomers}</strong></span></div>)}
          </div>
        </article>
      </div>
      <footer className="manager-policy-note"><ShieldCheck size={17} /><p><strong>Нууцлал ба шийдвэр:</strong> CEO компанийн түвшний харьцуулалт харна. Утасны бүтэн дугаар, буцаалттай зарцуулалт болон зөвшөөрөлгүй outreach харуулахгүй.</p></footer>
    </section>
  )
}
