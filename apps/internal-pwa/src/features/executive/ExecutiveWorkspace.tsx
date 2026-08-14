import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BellRing,
  Building2,
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  ContactRound,
  Crown,
  Gem,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import type { ManagementSession } from '../../shared/managementAccess'
import { roleLabels } from '../../shared/managementAccess'
import { formatDate, formatMoney } from '../workforce/localization'
import type { ManagerRecommendation } from '../workforce/managerBusinessModels'
import type { SalesGoalProposal } from '../workforce/managerOperationsModels'
import type { TeamMember } from '../workforce/models'
import type { ExecutiveGoalDecision, ExecutiveRecommendationDecision, ExecutiveSnapshot } from './executiveModels'
import type { ExecutiveService } from './executiveService'

type ExecutiveView = 'overview' | 'approvals' | 'branches' | 'workforce' | 'crm'

const goalStateLabels: Record<SalesGoalProposal['state'], string> = {
  draft: 'Менежерийн ноорог',
  submitted: 'Шийдвэр хүлээж байна',
  'revision-requested': 'Засвар хүссэн',
  approved: 'Баталсан',
  rejected: 'Татгалзсан',
}

const recommendationStateLabels: Record<ManagerRecommendation['status'], string> = {
  draft: 'Ноорог',
  submitted: 'Шийдвэр хүлээж байна',
  'revision-requested': 'Засвар хүссэн',
  approved: 'Баталсан',
  rejected: 'Татгалзсан',
}

function Notice({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return message ? <div className="status-message executive-notice" role="status"><Check size={18} /><span>{message}</span><button type="button" aria-label="Мэдэгдлийг хаах" onClick={onDismiss}><X size={17} /></button></div> : null
}

function EmptyApprovalState() {
  return <div className="executive-empty"><BadgeCheck size={28} /><strong>Шийдвэр хүлээсэн хүсэлт алга</strong><span>Менежер шинэ санал илгээхэд энэ жагсаалтад автоматаар харагдана.</span></div>
}

function DecisionForm({
  id,
  onSubmit,
  approveLabel = 'Батлах',
}: {
  id: string
  onSubmit: (decision: 'approve' | 'revision' | 'reject', comment: string) => void
  approveLabel?: string
}) {
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')

  function decide(decision: 'approve' | 'revision' | 'reject') {
    try {
      onSubmit(decision, comment)
      setComment('')
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Шийдвэрийг хадгалж чадсангүй.')
    }
  }

  return <div className="executive-decision-form">
    <label htmlFor={`decision-${id}`}><span>Шийдвэрийн тайлбар</span><textarea id={`decision-${id}`} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Үндэслэл, засах шаардлага эсвэл баталсан тайлбар" rows={3} /></label>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    <div>
      <button className="button button--primary" type="button" onClick={() => decide('approve')}><BadgeCheck size={16} />{approveLabel}</button>
      <button className="button button--secondary" type="button" onClick={() => decide('revision')}>Засвар хүсэх</button>
      <button className="button button--danger" type="button" onClick={() => decide('reject')}>Татгалзах</button>
    </div>
  </div>
}

function SectionHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <section className="page-heading manager-view-heading">
    <div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>
    {action}
  </section>
}

function ExecutiveOverview({ snapshot, onNavigate }: { snapshot: ExecutiveSnapshot; onNavigate: (view: ExecutiveView) => void }) {
  const totalTarget = snapshot.branches.reduce((sum, item) => sum + item.targetAmount, 0)
  const totalSales = snapshot.branches.reduce((sum, item) => sum + item.actualSales, 0)
  const achievement = totalTarget ? Math.round((totalSales / totalTarget) * 100) : 0
  const pending = Number(snapshot.operations.goalProposal.state === 'submitted') + snapshot.business.recommendations.filter((item) => item.status === 'submitted').length
  const risks = snapshot.branches.filter((item) => item.workforceRisk !== 'healthy').length

  return <>
    <SectionHeading eyebrow="Компанийн хяналтын төв" title="Гүйцэтгэх захирлын тойм" description="Борлуулалт, салбарын эрсдэл, менежерээс ирсэн шийдвэрийн хүсэлтийг нэг дор хянана." />
    <section className="executive-hero-grid">
      <article className="executive-sales-hero">
        <header><div><span className="eyebrow">Энэ сарын компанийн борлуулалт</span><h2>{achievement}% биелэлт</h2></div><CircleDollarSign size={26} /></header>
        <div className="executive-sales-values"><span><small>Бодит борлуулалт</small><strong>{formatMoney(totalSales)}</strong></span><span><small>Компанийн зорилго</small><strong>{formatMoney(totalTarget)}</strong></span><span><small>Үлдсэн</small><strong>{formatMoney(Math.max(totalTarget - totalSales, 0))}</strong></span></div>
        <div className="sales-goal-progress" role="progressbar" aria-label="Компанийн борлуулалтын зорилгын биелэлт" aria-valuemin={0} aria-valuemax={100} aria-valuenow={achievement}><span style={{ width: `${Math.min(achievement, 100)}%` }} /></div>
        <footer><span>4 салбарын батлагдсан зорилго · POS тулгалттай мэдээлэл</span><button className="button button--secondary" type="button" onClick={() => onNavigate('branches')}>Салбаруудаар харах<ArrowRight size={16} /></button></footer>
      </article>
      <section className="executive-action-queue" aria-label="Гүйцэтгэх захирлын шийдвэрлэх ажлууд">
        <button type="button" onClick={() => onNavigate('approvals')}><span><ClipboardCheck size={18} /><span><strong>Батлах хүсэлт</strong><small>Менежерээс ирсэн зорилго ба зэрэглэлийн санал</small></span></span><b>{pending}</b></button>
        <button type="button" onClick={() => onNavigate('workforce')}><span><Users size={18} /><span><strong>Ажиллах хүчний эрсдэл</strong><small>Хангалт, чөлөө, хоцролтын тойм</small></span></span><b>{snapshot.workforce.openCoverageGaps + risks}</b></button>
        <button type="button" onClick={() => onNavigate('crm')}><span><ContactRound size={18} /><span><strong>CRM ба зэрэглэл</strong><small>Шилдэг харилцагч, багийн нотолгоо</small></span></span><ChevronRight size={18} /></button>
      </section>
    </section>

    <section className="workspace-panel executive-branch-preview">
      <header className="card-header"><div><span className="eyebrow">Салбарууд</span><h2>Гүйцэтгэл ба хариуцлага</h2><p>Компанийн хүрээний борлуулалт, ажиллах хүчний төлөв.</p></div><Building2 size={22} /></header>
      <div className="executive-branch-rows">
        {snapshot.branches.map((branch) => {
          const percent = branch.targetAmount ? Math.round((branch.actualSales / branch.targetAmount) * 100) : 0
          return <article key={branch.id}><span className="scope-mark">{branch.name.slice(0, 2)}</span><div><strong>{branch.name}</strong><small>{branch.managerName}</small></div><div className="executive-branch-progress"><span><i style={{ width: `${Math.min(percent, 100)}%` }} /></span><small>{percent}% · {formatMoney(branch.actualSales)}</small></div><b data-tone={branch.workforceRisk}>{branch.workforceRisk === 'healthy' ? 'Хэвийн' : branch.workforceRisk === 'attention' ? 'Анхаарах' : 'Ноцтой'}</b></article>
        })}
      </div>
    </section>
  </>
}

function ExecutiveApprovals({ snapshot, onGoalDecision, onRecommendationDecision }: {
  snapshot: ExecutiveSnapshot
  onGoalDecision: (id: string, decision: ExecutiveGoalDecision, comment: string) => void
  onRecommendationDecision: (id: string, decision: ExecutiveRecommendationDecision, comment: string) => void
}) {
  const goal = snapshot.operations.goalProposal
  const recommendations = snapshot.business.recommendations.filter((item) => item.status !== 'draft')
  const pending = Number(goal.state === 'submitted') + recommendations.filter((item) => item.status === 'submitted').length

  return <>
    <SectionHeading eyebrow="Эцсийн шийдвэр" title="Батлах хүсэлт" description="Менежерийн оруулсан зорилго, энтертайнерийн зэрэглэл болон харилцагчийн түвшний саналыг нотолгоотой нь шийдвэрлэнэ." />
    <section className="approval-summary" aria-label="Батлах хүсэлтийн хураангуй"><article><span>Шийдвэр хүлээж байна</span><strong>{pending}</strong></article><article><span>Зорилгын санал</span><strong>{goal.state === 'submitted' ? 1 : 0}</strong></article><article><span>Зэрэглэл ба түвшин</span><strong>{recommendations.filter((item) => item.status === 'submitted').length}</strong></article></section>
    {!pending && !recommendations.length ? <EmptyApprovalState /> : null}

    <section className="executive-approval-stack">
      <article className="workspace-panel executive-approval-card" data-state={goal.state}>
        <header><div><span className="eyebrow">Дараагийн сарын борлуулалтын зорилго</span><h2>{formatDate(`${goal.month}-01`, { year: 'numeric', month: 'long' })} · {goal.managerName}</h2></div><b>{goalStateLabels[goal.state]}</b></header>
        <div className="executive-proposal-values"><span><small>Менежерийн санал</small><strong>{formatMoney(goal.proposedTarget)}</strong></span><span><small>Hermes зөвлөмж</small><strong>{formatMoney(goal.recommendation.recommendedTarget)}</strong></span><span><small>Өсөлтийн санал</small><strong>{goal.recommendation.improvementPercent}%</strong></span><span><small>Хувилбар</small><strong>{goal.version}</strong></span></div>
        <section><h3>Үндэслэл</h3><p>{goal.rationale}</p><h3>Хэрэгжүүлэх ажил</h3><ul>{goal.actions.map((action) => <li key={action.id}><strong>{action.title}</strong><span>{action.expectedImpact} · {formatDate(action.dueDate)}</span></li>)}</ul></section>
        {goal.ceoComment ? <blockquote><strong>Гүйцэтгэх захирлын тайлбар</strong>{goal.ceoComment}</blockquote> : null}
        {goal.state === 'submitted' ? <DecisionForm id={goal.id} onSubmit={(decision, comment) => onGoalDecision(goal.id, decision, comment)} approveLabel="Зорилго батлах" /> : null}
      </article>

      {recommendations.map((item) => <article className="workspace-panel executive-approval-card" data-state={item.status} key={item.id}>
        <header><div><span className="eyebrow">{item.type === 'entertainer-rank' ? 'Энтертайнерийн зэрэглэлийн санал' : 'Харилцагчийн гишүүнчлэлийн санал'}</span><h2>{item.subjectName}</h2></div><b>{recommendationStateLabels[item.status]}</b></header>
        <div className="recommendation-change"><span><small>Одоогийн төлөв</small><strong>{item.currentValue}</strong></span><ArrowRight size={20} /><span><small>Менежерийн санал</small><strong>{item.proposedValue}</strong></span></div>
        <section><h3>Нотолгооны хураангуй</h3><p>{item.evidenceSummary}</p><h3>Менежерийн үндэслэл</h3><p>{item.reason}</p></section>
        <p className="recommendation-policy"><ShieldCheck size={16} />{item.policyNote}</p>
        {item.decisionComment ? <blockquote><strong>Гүйцэтгэх захирлын тайлбар</strong>{item.decisionComment}</blockquote> : null}
        {item.status === 'submitted' ? <DecisionForm id={item.id} onSubmit={(decision, comment) => onRecommendationDecision(item.id, decision, comment)} approveLabel="Санал батлах" /> : null}
      </article>)}
    </section>
  </>
}

function ExecutiveBranches({ snapshot }: { snapshot: ExecutiveSnapshot }) {
  return <>
    <SectionHeading eyebrow="Компанийн хүрээ" title="Салбарын гүйцэтгэл" description="Салбар бүрийн батлагдсан зорилго, бодит борлуулалт, менежерийн хариуцлагын төлөв." />
    <section className="workspace-panel executive-table-card">
      <div className="executive-table-scroll"><table><thead><tr><th>Салбар</th><th>Менежер</th><th>Зорилго</th><th>Бодит</th><th>Биелэлт</th><th>Хүний нөөц</th><th>Хүсэлт</th></tr></thead><tbody>{snapshot.branches.map((branch) => { const percent = Math.round((branch.actualSales / branch.targetAmount) * 100); return <tr key={branch.id}><td><strong>{branch.name}</strong></td><td>{branch.managerName}</td><td>{formatMoney(branch.targetAmount)}</td><td>{formatMoney(branch.actualSales)}</td><td><span className="table-progress"><i style={{ width: `${Math.min(percent, 100)}%` }} /></span><strong>{percent}%</strong></td><td><b className="executive-state" data-tone={branch.workforceRisk}>{branch.workforceRisk === 'healthy' ? 'Хэвийн' : 'Анхаарах'}</b></td><td>{branch.openApprovals}</td></tr> })}</tbody></table></div>
    </section>
    <section className="scope-guardrail"><ShieldCheck size={19} /><div><strong>Гүйцэтгэх захирал · компанийн бүх салбар</strong><span>Салбарын менежер зөвхөн оноосон салбараа харна. Энэ харагдац компанийн нэгтгэсэн мэдээлэл болон эцсийн шийдвэрийн эрхтэй.</span></div></section>
  </>
}

function ExecutiveWorkforce({ snapshot, teamMembers }: { snapshot: ExecutiveSnapshot; teamMembers: TeamMember[] }) {
  const workforce = snapshot.workforce
  const pendingLeave = workforce.leaveRequests.filter((item) => item.status === 'pending')
  return <>
    <SectionHeading eyebrow="Компанийн ажиллах хүч" title="Ажиллах хүчний хяналт" description="Салбарын менежерийн нийтэлсэн хуваарь, хангалт, чөлөө болон торгуулийн нотлох баримтын тойм." />
    <section className="approval-summary"><article><span>Хуваарийн төлөв</span><strong>{workforce.roster.status === 'published' ? 'Нийтэлсэн' : 'Ноорог'}</strong></article><article><span>Хангалтын дутагдал</span><strong>{workforce.openCoverageGaps}</strong></article><article><span>Чөлөө хүлээгдэж байна</span><strong>{pendingLeave.length}</strong></article><article><span>Торгуулийн нэр дэвшигч</span><strong>{workforce.penaltyReviews.length}</strong></article></section>
    <div className="executive-workforce-grid">
      <section className="workspace-panel"><header className="card-header"><div><h2>Чөлөөний хүсэлт</h2><p>Менежер шийдвэрлэнэ; Гүйцэтгэх захирал нэгтгэлийг хянана.</p></div><ClipboardCheck size={21} /></header><div className="executive-record-list">{workforce.leaveRequests.map((item) => { const member = teamMembers.find((candidate) => candidate.id === item.teamMemberId); return <article key={item.id}><span className="avatar avatar--member">{member?.initials ?? 'БГ'}</span><div><strong>{member?.name ?? 'Багийн гишүүн'}</strong><small>{formatDate(item.startDate)} – {formatDate(item.endDate)} · {item.reason}</small></div><b>{item.status === 'pending' ? 'Хүлээгдэж байна' : item.status === 'approved' ? 'Зөвшөөрсөн' : 'Татгалзсан'}</b></article> })}</div></section>
      <section className="workspace-panel"><header className="card-header"><div><h2>Хоцролт ба ирээгүй тохиолдол</h2><p>Мөнгөн дүн бус, эх баримт болон бодлогын төлөв.</p></div><AlertTriangle size={21} /></header><div className="executive-record-list">{workforce.penaltyReviews.map((item) => { const member = teamMembers.find((candidate) => candidate.id === item.teamMemberId); return <article key={item.id}><span className="avatar avatar--member">{member?.initials ?? 'БГ'}</span><div><strong>{member?.name ?? 'Багийн гишүүн'} · {item.attendanceType === 'late' ? 'Хоцролт' : 'Ирээгүй'}</strong><small>{formatDate(item.date)} · {item.lateMinutes ? `${item.lateMinutes} минут` : item.evidence}</small></div><b>{item.state === 'policy-pending' ? 'Бодлого хүлээгдэж байна' : 'Хяналтын баримт'}</b></article> })}</div></section>
    </div>
  </>
}

function ExecutiveCrm({ snapshot, teamMembers }: { snapshot: ExecutiveSnapshot; teamMembers: TeamMember[] }) {
  const customers = useMemo(() => [...snapshot.insights.customers].sort((a, b) => b.lifetimeValue - a.lifetimeValue), [snapshot.insights.customers])
  const entertainers = useMemo(() => [...snapshot.insights.entertainerRankings].sort((a, b) => b.salesTrendPercent - a.salesTrendPercent), [snapshot.insights.entertainerRankings])
  return <>
    <SectionHeading eyebrow="CRM ба гүйцэтгэлийн нотолгоо" title="Харилцагч ба багийн зэрэглэл" description="Компанийн шийдвэрт ашиглах масктай CRM мэдээлэл, тайлбарлагдах багийн гүйцэтгэлийн үзүүлэлт." />
    <div className="executive-workforce-grid">
      <section className="workspace-panel"><header className="card-header"><div><h2>Харилцагчийн эрэмбэ</h2><p>Нийт болон дундаж эрх бүхий зарлага.</p></div><ContactRound size={21} /></header><div className="executive-ranking-list">{customers.slice(0, 6).map((customer, index) => <article key={customer.id}><b>{index + 1}</b><div><strong>{customer.displayName}</strong><small>{customer.maskedPhone} · {customer.membershipLevel}</small></div><span><strong>{formatMoney(customer.lifetimeValue)}</strong><small>{formatMoney(customer.averageSpend)} дундаж</small></span></article>)}</div></section>
      <section className="workspace-panel"><header className="card-header"><div><h2>Багийн гүйцэтгэлийн эрэмбэ</h2><p>14 хоногийн тайлбарлагдах нотолгоо.</p></div><Gem size={21} /></header><div className="executive-ranking-list">{entertainers.map((item, index) => { const member = teamMembers.find((candidate) => candidate.id === item.teamMemberId); return <article key={item.teamMemberId}><b>{index + 1}</b><div><strong>{member?.name ?? item.teamMemberId}</strong><small>{item.currentRank} · ирц {item.attendancePercent}%</small></div><span><strong>{item.salesTrendPercent > 0 ? '+' : ''}{item.salesTrendPercent}%</strong><small>{item.repeatCustomers} давтан харилцагч</small></span></article> })}</div></section>
    </div>
    <section className="scope-guardrail"><ShieldCheck size={19} /><div><strong>Нууцлал ба шийдвэрийн хил</strong><span>Утас масктай хэвээр. Эх өгөгдөл болон бодлогын хувилбаргүй үед түвшин, зэрэглэлийг автомат өөрчлөхгүй.</span></div></section>
  </>
}

export interface ExecutiveWorkspaceProps {
  session: ManagementSession
  service: ExecutiveService
  teamMembers: TeamMember[]
  onSignOut: () => void
}

export function ExecutiveWorkspace({ session, service, teamMembers, onSignOut }: ExecutiveWorkspaceProps) {
  const [snapshot, setSnapshot] = useState(() => service.getSnapshot())
  const [activeView, setActiveView] = useState<ExecutiveView>('overview')
  const [message, setMessage] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const unreadApprovals = Number(snapshot.operations.goalProposal.state === 'submitted') + snapshot.business.recommendations.filter((item) => item.status === 'submitted').length

  function navigate(view: ExecutiveView) {
    setActiveView(view)
    setMessage('')
    setMenuOpen(false)
  }

  function refresh() {
    setSnapshot(service.getSnapshot())
    setMessage('Менежерүүдийн хамгийн сүүлийн мэдээллийг шинэчиллээ.')
  }

  function reviewGoal(id: string, decision: ExecutiveGoalDecision, comment: string) {
    const result = service.reviewGoalProposal(id, decision, comment)
    setSnapshot(result.snapshot)
    setMessage(decision === 'approve' ? 'Сарын зорилгын саналыг баталлаа. Шийдвэр менежерийн төлөвлөгөөнд харагдана.' : decision === 'revision' ? 'Зорилгын саналыг тайлбартайгаар засварт буцаалаа.' : 'Зорилгын саналыг татгалзлаа.')
  }

  function reviewRecommendation(id: string, decision: ExecutiveRecommendationDecision, comment: string) {
    const result = service.reviewRecommendation(id, decision, comment)
    setSnapshot(result.snapshot)
    setMessage(decision === 'approve' ? 'Зэрэглэл эсвэл түвшний саналыг баталлаа. Шийдвэр менежерт харагдана.' : decision === 'revision' ? 'Саналыг нэмэлт нотолгоо шаардан засварт буцаалаа.' : 'Саналыг татгалзлаа.')
  }

  const navItems: Array<[ExecutiveView, ReactNode, string]> = [
    ['overview', <LayoutDashboard size={19} />, 'Тойм'],
    ['approvals', <ClipboardCheck size={19} />, 'Батлах хүсэлт'],
    ['branches', <Building2 size={19} />, 'Салбарууд'],
    ['workforce', <Users size={19} />, 'Ажиллах хүч'],
    ['crm', <ContactRound size={19} />, 'CRM ба зэрэглэл'],
  ]

  return <div className="app-shell executive-shell">
    <aside className={menuOpen ? 'sidebar sidebar--open' : 'sidebar'}>
      <div className="brand"><span><Crown size={18} /></span><div><strong>VIP Club</strong><small>Удирдлагын төв</small></div><button className="sidebar-close" type="button" aria-label="Навигацыг хаах" onClick={() => setMenuOpen(false)}><X size={19} /></button></div>
      <nav aria-label="Гүйцэтгэх захирлын навигац">{navItems.map(([view, icon, label]) => <a className={activeView === view ? 'active' : ''} href={`#${view}`} aria-current={activeView === view ? 'page' : undefined} key={view} onClick={(event) => { event.preventDefault(); navigate(view) }}>{icon}{label}{view === 'approvals' && unreadApprovals ? <b>{unreadApprovals}</b> : null}</a>)}</nav>
      <div className="sidebar-foot"><div className="avatar">{session.initials}</div><div><strong>{session.displayName}</strong><span>{roleLabels[session.role]}</span></div><button className="sidebar-signout" type="button" aria-label="Системээс гарах" title="Системээс гарах" onClick={onSignOut}><LogOut size={17} /></button></div>
    </aside>

    <div className="workspace">
      <header className="topbar"><button className="icon-button mobile-menu" type="button" aria-label="Навигацыг нээх эсвэл хаах" onClick={() => setMenuOpen((current) => !current)}><Menu size={21} /></button><div className="branch-scope"><span className="scope-mark">КН</span><div><strong>Компанийн нэгдсэн харагдац</strong><small>{session.branchIds.length} салбар · Гүйцэтгэх захирлын эрх</small></div></div><div className="topbar-actions"><button className="button button--secondary" type="button" onClick={refresh}><RefreshCw size={16} />Шинэчлэх</button><button className="icon-button" type="button" aria-label={`${unreadApprovals} шийдвэр хүлээсэн хүсэлт`} onClick={() => navigate('approvals')}><BellRing size={19} />{unreadApprovals ? <i /> : null}</button><div className="avatar avatar--small">{session.initials}</div></div></header>
      <main id={activeView}>
        <Notice message={message} onDismiss={() => setMessage('')} />
        {activeView === 'overview' ? <ExecutiveOverview snapshot={snapshot} onNavigate={navigate} /> : null}
        {activeView === 'approvals' ? <ExecutiveApprovals snapshot={snapshot} onGoalDecision={reviewGoal} onRecommendationDecision={reviewRecommendation} /> : null}
        {activeView === 'branches' ? <ExecutiveBranches snapshot={snapshot} /> : null}
        {activeView === 'workforce' ? <ExecutiveWorkforce snapshot={snapshot} teamMembers={teamMembers} /> : null}
        {activeView === 'crm' ? <ExecutiveCrm snapshot={snapshot} teamMembers={teamMembers} /> : null}
      </main>
    </div>
  </div>
}
