import { ArrowLeft, ChevronRight, Clock3, FileClock, Info, MessageSquare, Plus, Settings2, TrendingDown, UserRoundX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { DataMeta } from '../components/ui/DataMeta'
import { OverlayPanel } from '../components/ui/OverlayPanel'
import { PageHeader } from '../components/ui/PageHeader'
import { ProgressBar } from '../components/ui/ProgressBar'
import { Sparkline } from '../components/ui/Sparkline'
import { StatusMark } from '../components/ui/StatusMark'
import AccessStatePage from './AccessStatePage'
import { useApp } from '../state/useApp'
import { formatMoney, formatPercent } from '../utils/format'

interface BranchException {
  id: string
  time: string
  title: string
  detail: string
  tone: 'critical' | 'attention'
  source: string
  evidence: string
  consequence: string
  status: 'detected' | 'acknowledged' | 'assigned' | 'resolved'
  linkedEvidence: string
}

function BranchComparison() {
  const navigate = useNavigate()
  const { branches } = useApp()
  const { session, hasPermission } = useAuth()
  const [severity, setSeverity] = useState<'all' | 'healthy' | 'attention' | 'critical'>('all')
  const [ranking, setRanking] = useState<'health' | 'sales' | 'workforce'>('health')
  const rankedBranches = useMemo(() => branches
    .filter((branch) => severity === 'all' || branch.severity === severity)
    .toSorted((left, right) => {
      if (ranking === 'sales') return (right.salesActual / right.salesTarget) - (left.salesActual / left.salesTarget)
      if (ranking === 'workforce') return right.workforceReadiness - left.workforceReadiness
      return right.health - left.health
    }), [branches, ranking, severity])
  if (!branches.length) return <AccessStatePage variant="denied" embedded detail="Таны session-д оноосон салбар алга байна." />
  return (
    <div className="page">
      <PageHeader title="Салбарууд" description={session.role === 'CEO' ? 'Дөрвөн салбарын ижил хугацаа, ижил KPI definition дээрх харьцуулалт.' : 'Таны session-д оноосон салбарын KPI, эрсдэл ба нотолгоо.'} meta={<DataMeta meta={branches[0].meta} detailed />} actions={branches.length === 1 && hasPermission('branch-settings.read') ? <button className="button button--secondary" type="button" onClick={() => navigate(`/branches/${branches[0].id}/settings`)}><Settings2 size={17} />Салбарын тохиргоо</button> : undefined} />
      <section className="comparison-toolbar" aria-label="Салбарын харьцуулалтын шүүлтүүр">
        <div><strong>Харьцуулах хугацаа</strong><span>2026.08.01–08.12 · ижил snapshot</span></div>
        <label><span>Threshold төлөв</span><select value={severity} onChange={(event) => setSeverity(event.target.value as typeof severity)}><option value="all">Бүх төлөв</option><option value="healthy">Эрүүл</option><option value="attention">Анхааралтай</option><option value="critical">Нэн тэргүүнд</option></select></label>
        <label><span>Эрэмбэ</span><select value={ranking} onChange={(event) => setRanking(event.target.value as typeof ranking)}><option value="health">Branch Health</option><option value="sales">Борлуулалтын гүйцэтгэл</option><option value="workforce">Workforce readiness</option></select></label>
        <StatusMark tone="neutral" label={`${rankedBranches.length} салбар`} compact />
      </section>
      <section className="comparison-band">
        {rankedBranches.map((branch, index) => (
          <article key={branch.id} className="comparison-branch" data-tone={branch.severity}>
            <header><span className="branch-rank" aria-label={`${index + 1}-р байр`}>#{index + 1}</span><span className="branch-monogram">{branch.shortName}</span><div><h2>{branch.name}</h2><p>{branch.location} · {branch.manager}</p></div><button className="icon-button" type="button" onClick={() => navigate(`/branches/${branch.id}`)} aria-label={`${branch.name} дэлгэрэнгүй`}><ChevronRight size={20} /></button></header>
            <div className="comparison-branch__health"><div><strong>{branch.health}</strong><small>/100</small><StatusMark tone={branch.severity} label={branch.severity === 'healthy' ? 'Эрүүл' : branch.severity === 'attention' ? 'Анхааралтай' : 'Нэн тэргүүнд'} /></div><Sparkline values={branch.healthTrend} tone={branch.severity === 'healthy' ? 'success' : branch.severity === 'critical' ? 'danger' : 'gold'} width={176} height={52} /></div>
            <dl>
              <div><dt>Борлуулалт</dt><dd>{formatMoney(branch.salesActual)} <small>/ {formatMoney(branch.salesTarget)}</small></dd></div>
              <div><dt>Харилцагч</dt><dd data-tone={branch.customerTrend >= 0 ? 'healthy' : 'critical'}>{formatPercent(branch.customerTrend)}</dd></div>
              <div><dt>Workforce</dt><dd>{branch.checkedInStaff}/{branch.requiredStaff} <small>checked-in</small></dd></div>
              <div><dt>No-show</dt><dd data-tone={branch.noShows > 4 ? 'critical' : 'attention'}>{branch.noShows}</dd></div>
              <div><dt>Overdue task</dt><dd data-tone={branch.overdueTasks > 4 ? 'critical' : 'attention'}>{branch.overdueTasks}</dd></div>
            </dl>
            <button className="text-button comparison-branch__action" type="button" onClick={() => navigate(`/branches/${branch.id}`)}>Шалтгаан ба нотолгоо <ChevronRight size={16} /></button>
          </article>
        ))}
        {!rankedBranches.length ? <div className="comparison-empty" role="status"><strong>Сонгосон төлөвт салбар алга</strong><span>Threshold төлвийн шүүлтүүрийг өөрчилнө үү.</span></div> : null}
      </section>
      <section className="workbench-section">
        <header className="section-header"><div><h2>{session.role === 'CEO' ? 'Компанийн эрсдэлийн зураг' : 'Салбарын эрсдэлийн зураг'}</h2><p>Төлөвлөлтийн болон attendance failure-ийг тусад нь харуулна.</p></div></header>
        <div className="risk-matrix">
          {rankedBranches.map((branch) => (
            <button key={branch.id} type="button" onClick={() => navigate(`/branches/${branch.id}`)} className="risk-matrix__row">
              <span><strong>{branch.name}</strong><small>{branch.manager}</small></span>
              <span><small>Sales</small><ProgressBar value={(branch.salesActual / branch.salesTarget) * 100} tone="gold" label="Sales" /></span>
              <span><small>Workforce</small><ProgressBar value={branch.workforceReadiness} tone={branch.workforceReadiness >= 85 ? 'success' : 'danger'} label="Workforce" /></span>
              <span><small>Customer</small><b data-tone={branch.customerTrend >= 0 ? 'healthy' : 'critical'}>{formatPercent(branch.customerTrend)}</b></span>
              <ChevronRight size={18} />
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

function BranchDetail({ branchId }: { branchId: string }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { branches } = useApp()
  const { hasPermission } = useAuth()
  const [policyOpen, setPolicyOpen] = useState(false)
  const [manualException, setManualException] = useState<BranchException | null>(null)
  const branch = branches.find((item) => item.id === branchId)
  if (!branch) return <div className="page not-found"><h1>Салбар олдсонгүй</h1><button className="button button--primary" type="button" onClick={() => navigate('/branches')}>Салбарууд руу</button></div>

  const events: BranchException[] = [
    { id: 'sales-pace', time: '08.12 14:22', title: 'Борлуулалтын хурд −20%', detail: 'Expected-to-date pace-ээс доогуур', tone: 'critical', source: 'POS daily sales · 14:20 snapshot', evidence: `${formatMoney(branch.salesActual)} / ${formatMoney(branch.salesTarget)} · expected-to-date variance −20%`, consequence: 'Сарын зорилтод хүрэх эрсдэл өндөрссөн.', status: 'assigned', linkedEvidence: 'task-2 · Б. Отгонтунгалагт оноосон' },
    { id: 'customer-decline', time: '08.12 16:10', title: 'High-value харилцагч буурсан', detail: 'Top 15 айлчлал −30%', tone: 'attention', source: 'CRM eligible completed visits · 16:05 snapshot', evidence: 'Gold ба түүнээс дээш түвшний 15 харилцагч 30 хоногт эргэж ирээгүй.', consequence: 'Орлого болон loyal-customer retention буурах эрсдэлтэй.', status: 'acknowledged', linkedEvidence: 'Membership manager · 16:18 acknowledged' },
    { id: 'workforce-gap', time: '08.12 17:35', title: 'Ажиллах хүч дутуу', detail: `Checked-in ${branch.checkedInStaff}/${branch.requiredStaff}`, tone: 'critical', source: 'Workforce check-in · 17:32 snapshot', evidence: `Required ${branch.requiredStaff} · checked-in ${branch.checkedInStaff} · unexpected no-show ${branch.noShows}`, consequence: 'Өнөө оройн үйлчилгээний хүчин чадал доголдох эрсдэлтэй.', status: 'detected', linkedEvidence: 'Шинэ дохио · action owner хүлээгдэж байна' },
    { id: 'service-rating', time: '08.11 18:12', title: 'Сөрөг үнэлгээ өссөн', detail: '24 цагт 6 шинэ дохио', tone: 'attention', source: 'Service feedback · 18:10 snapshot', evidence: 'Сүүлийн 24 цагт 6 сөрөг дохио; менежер бүх хариуг баталгаажуулсан.', consequence: 'Үйлчилгээний чанар ба дахин айлчлалд нөлөөлж болзошгүй.', status: 'resolved', linkedEvidence: 'AUD-26-0812-021 · 08.12 07:40 resolved' },
    { id: 'cash-variance', time: '08.12 20:08', title: 'Бэлэн мөнгөний зөрүү', detail: 'Reconciliation pending', tone: 'attention', source: 'POS close + cash reconciliation · 20:05 snapshot', evidence: 'Ээлж хаалтын тулгалт дуусаагүй; эцсийн дүн баталгаажаагүй.', consequence: 'Баталгаажаагүй тул төлбөрийн шийдвэр гаргах боломжгүй.', status: 'detected', linkedEvidence: 'Integration pending · source reconciliation' },
  ]
  const selectedException = manualException ?? events.find((event) => event.id === searchParams.get('exception')) ?? null
  const closeException = () => {
    setManualException(null)
    if (searchParams.has('exception')) navigate(`/branches/${branch.id}`, { replace: true })
  }

  const sourceContext = (event: BranchException) => `${branch.name} · Branch Health ${branch.health}/100 · ${event.title} · ${event.source} · health-v3.2.1`
  const openTask = (event: BranchException) => {
    const params = new URLSearchParams({ create: '1', branch: branch.id, context: 'Branch Health exception', title: `${branch.name}: ${event.title}`, instruction: `${event.evidence} ${event.consequence} Шалтгааныг шалгаж, авсан арга хэмжээ болон нотолгоог тайлагнана уу.`, source: sourceContext(event) })
    navigate(`/tasks?${params}`)
  }
  const openMessage = (event: BranchException) => {
    const params = new URLSearchParams({ create: '1', branch: branch.id, title: `${branch.name} · ${event.title}`, body: `${event.evidence} ${event.consequence} Одоогийн нөхцөл болон авах арга хэмжээг шинэчилнэ үү.`, context: sourceContext(event) })
    navigate(`/messages?${params}`)
  }

  return (
    <div className="page branch-detail">
      <PageHeader
        title={branch.name}
        description={`${branch.location} · ${branch.manager} · Өнөө оройн ээлж`}
        meta={<DataMeta meta={branch.meta} detailed />}
        actions={<><button className="button button--secondary" type="button" onClick={() => navigate('/branches')}><ArrowLeft size={17} />Харьцуулалт</button>{hasPermission('branch-settings.read') ? <button className="button button--secondary" type="button" onClick={() => navigate(`/branches/${branch.id}/settings`)}><Settings2 size={17} />Тохиргоо</button> : null}{hasPermission('tasks.read') ? <button className="button button--primary" type="button" onClick={() => navigate(`/tasks?create=1&branch=${branch.id}&context=Branch Health`)}><Plus size={17} />Даалгавар өгөх</button> : null}</>}
      />
      <section className="health-explainer" aria-labelledby="health-title">
        <header className="health-explainer__summary"><div><span>Салбарын эрүүл мэнд</span><strong data-tone={branch.severity}>{branch.health}</strong><small>/100 · Өчигдөр {branch.previousHealth}</small></div><Sparkline values={branch.healthTrend} tone={branch.severity === 'critical' ? 'danger' : 'gold'} width={230} height={64} label={`${branch.name} health trend`} /><div><h2 id="health-title">Яагаад {branch.health} оноо вэ?</h2><p>5 factor-ийн жинлэсэн, versioned нийлбэр.</p></div><button className="button button--secondary" type="button" onClick={() => setPolicyOpen(true)}><Info size={17} />Эх сурвалж ба бодлого</button></header>
        <div className="health-drivers">
          {branch.drivers.map((item, index) => (
            <article key={item.id} className="health-driver">
              <header><small>{index + 1}. {item.label}</small><strong data-tone={item.score >= 80 ? 'healthy' : item.score >= 60 ? 'attention' : 'critical'}>{item.score}<span>/100</span></strong></header>
              <dl><div><dt>Жин</dt><dd>{item.weight}%</dd></div><div><dt>Оруулсан хувь</dt><dd>{((item.score * item.weight) / 100).toFixed(1)} оноо</dd></div></dl>
              <div className="driver-list driver-list--positive"><b>Эерэг драйвер</b>{item.positive.map((text) => <span key={text}>+ {text}</span>)}</div>
              <div className="driver-list driver-list--negative"><b>Сөрөг драйвер</b>{item.negative.length ? item.negative.map((text) => <span key={text}>− {text}</span>) : <span>Ноцтой сөрөг драйвергүй</span>}</div>
            </article>
          ))}
        </div>
      </section>
      <section className="exception-timeline" aria-labelledby="timeline-title">
        <header className="section-header"><div><h2 id="timeline-title">Онцгой үйл явдлын түүх</h2><p>Илэрсэн → хүлээн авсан → оноосон → шийдсэн · linked evidence</p></div>{hasPermission('tasks.read') || hasPermission('messages.read') ? <div className="section-actions">{hasPermission('tasks.read') ? <button className="button button--secondary" type="button" onClick={() => navigate(`/tasks?create=1&branch=${branch.id}&context=Exception timeline`)}><Plus size={17} />Даалгавар болгох</button> : null}{hasPermission('messages.read') ? <button className="button button--secondary" type="button" onClick={() => navigate(`/messages?branch=${branch.id}`)}><MessageSquare size={17} />Менежерт бичих</button> : null}</div> : null}</header>
        <div className="timeline-rail">
          {events.map((event) => <article key={event.id} data-tone={event.tone} data-status={event.status}><span className="timeline-dot" /><small>{event.time}</small><StatusMark tone={event.status === 'resolved' ? 'healthy' : event.status === 'detected' ? event.tone : 'neutral'} label={event.status === 'detected' ? 'Илэрсэн' : event.status === 'acknowledged' ? 'Хүлээн авсан' : event.status === 'assigned' ? 'Оноосон' : 'Шийдсэн'} compact /><strong>{event.title}</strong><p>{event.detail}</p><small>{event.linkedEvidence}</small><button type="button" onClick={() => setManualException(event)} aria-label={`${event.title} дэлгэрэнгүй`}>Нотолгоо</button></article>)}
        </div>
      </section>
      <section className="risk-card-row">
        <article><header><TrendingDown size={19} /><span>Борлуулалтын хурд</span><small>30 өдөр</small></header><strong>{formatMoney(branch.salesActual)}</strong><b data-tone="critical">−8%</b><Sparkline values={[24, 22, 23, 21, 22, 19, 20, 18.7]} tone="danger" width={200} /></article>
        <article><header><UserRoundX size={19} /><span>High-value бууралт</span><small>30 өдөр</small></header><strong>−30%</strong><p>Top 15 айлчлал буурсан</p><Sparkline values={[15, 15, 14, 13, 12, 11, 10, 8]} tone="danger" width={200} /></article>
        <article><header><Clock3 size={19} /><span>Шөнийн ээлжийн дутуу</span></header><strong>−{Math.max(0, branch.requiredStaff - branch.checkedInStaff)} хүн</strong><p>Required {branch.requiredStaff} · Checked-in {branch.checkedInStaff}</p><StatusMark tone="critical" label={`${branch.noShows} unexpected no-show`} /></article>
        <article><header><MessageSquare size={19} /><span>Сөрөг үнэлгээ</span><small>Сүүлийн 24 цаг</small></header><strong>6</strong><p>Хариулт өгсөн: 1 · Хүлээгдэж буй: 5</p><Sparkline values={[1, 1, 2, 2, 3, 4, 4, 6]} tone="danger" width={200} /></article>
        <article><header><FileClock size={19} /><span>Хугацаа хэтэрсэн CEO task</span></header><strong>{branch.overdueTasks}</strong><p>Өндөр нөлөөтэй 4 · Дунд нөлөөтэй 2</p><button className="text-button" type="button" onClick={() => navigate(`/tasks?branch=${branch.id}&status=overdue`)}>Дэлгэрэнгүй <ChevronRight size={16} /></button></article>
      </section>
      <OverlayPanel open={policyOpen} onClose={() => setPolicyOpen(false)} title="Эх сурвалж ба бодлого" description="Branch Health тооцооны тайлбар" variant="drawer">
        <div className="definition-list"><div><span>Policy version</span><strong>health-v3.2.1</strong></div><div><span>Сүүлд шинэчлэгдсэн</span><strong>2026.08.12 · 08:20</strong></div><div><span>Source reconciliation</span><strong>Demo fixture · Reconciled</strong></div><div><span>Top-level weights</span><strong>40 / 20 / 20 / 10 / 10</strong></div></div>
        <div className="callout callout--warning"><Info size={18} /><p>Sub-formula, threshold, severity color нь business configuration required. Prototype нь тайлбарлагдах fixture ашиглаж байна.</p></div>
        <section className="policy-source-list"><h3>Component source records</h3>{branch.drivers.map((driver) => <div key={driver.id}><span><strong>{driver.label}</strong><small>{driver.meta.owner} · {driver.meta.updatedAt}</small></span><code>{driver.meta.sourceRecord}</code></div>)}</section>
      </OverlayPanel>
      <OverlayPanel open={Boolean(selectedException)} onClose={closeException} title={selectedException?.title ?? ''} description={`${branch.name} · илрүүлсэн онцгой үйл явдал`} variant="drawer">
        {selectedException ? <div className="exception-detail">
          <StatusMark tone={selectedException.tone} label={selectedException.tone === 'critical' ? 'Нэн тэргүүнд' : 'Анхааралтай'} />
          <div className="definition-list"><div><span>Илэрсэн</span><strong>{selectedException.time}</strong></div><div><span>Lifecycle</span><strong>{selectedException.status} · {selectedException.linkedEvidence}</strong></div><div><span>Дохио</span><strong>{selectedException.detail}</strong></div><div><span>Эх сурвалж</span><strong>{selectedException.source}</strong></div><div><span>Бодлого</span><strong>health-v3.2.1 · demo reconciled</strong></div></div>
          <section><h3>Нотолгоо</h3><p>{selectedException.evidence}</p></section>
          <section><h3>Бизнесийн нөлөө</h3><p>{selectedException.consequence}</p></section>
          <div className="source-context-callout"><strong>Контекст хадгалагдана</strong><span>{sourceContext(selectedException)}</span></div>
          {hasPermission('messages.read') || hasPermission('tasks.read') ? <div className="exception-detail__actions">{hasPermission('messages.read') ? <button className="button button--secondary" type="button" onClick={() => openMessage(selectedException)}><MessageSquare size={17} />Менежерт бичих</button> : null}{hasPermission('tasks.read') ? <button className="button button--primary" type="button" onClick={() => openTask(selectedException)}><Plus size={17} />Даалгавар болгох</button> : null}</div> : null}
        </div> : null}
      </OverlayPanel>
    </div>
  )
}

export default function BranchesPage() {
  const { branchId } = useParams()
  return branchId ? <BranchDetail branchId={branchId} /> : <BranchComparison />
}
