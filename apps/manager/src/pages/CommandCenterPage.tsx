import {
  AlertTriangle,
  ArrowRight,
  Bot,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  ListTodo,
  RefreshCw,
  Users,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ProgressBar } from '../components/ui/ProgressBar'
import { Sparkline } from '../components/ui/Sparkline'
import { DataMeta } from '../components/ui/DataMeta'
import { EmptyState } from '../components/ui/EmptyState'
import { ExecutiveHandoffOverview } from '../features/executive/ExecutiveHandoffPanels'
import { useApp } from '../state/useApp'
import { branchTone, formatMoney, formatPercent } from '../utils/format'

export default function CommandCenterPage() {
  const navigate = useNavigate()
  const { branches, approvals, tasks, recommendations, refresh, refreshing, lastRefreshedAt } = useApp()
  const pendingApprovals = approvals.filter((item) => item.status === 'pending')
  const overdueTasks = tasks.filter((item) => item.status === 'overdue')
  const companyHealth = Math.round(branches.reduce((sum, branch) => sum + branch.health, 0) / branches.length)
  const companySales = branches.reduce((sum, branch) => sum + branch.salesActual, 0)
  const companyTarget = branches.reduce((sum, branch) => sum + branch.salesTarget, 0)
  const shortage = branches.reduce((sum, branch) => sum + Math.max(0, branch.requiredStaff - branch.checkedInStaff), 0)
  const primaryRecommendation = recommendations.find((item) => item.status === 'new') ?? recommendations[0]

  if (!branches.length) return <div className="page"><h1 className="sr-only">Удирдлагын төв</h1><EmptyState icon={AlertTriangle} title="Executive snapshot алга" description="Сонгосон хугацаанд зөвшөөрөгдсөн салбарын мэдээлэл олдсонгүй." /></div>

  return (
    <div className="page command-center">
      <h1 className="sr-only">Удирдлагын төв</h1>

      <section className="snapshot-context" aria-label="Гүйцэтгэх удирдлагын нэгтгэл">
        <div><strong>Гүйцэтгэх удирдлагын нэгтгэл</strong><span>2026.08.01–08.12 · {branches.length} салбар · компанийн хүрээ</span></div>
        <DataMeta meta={branches[0].meta} detailed />
      </section>

      <section className="metric-strip" aria-label="Компанийн гол үзүүлэлт">
        <article className="metric-strip__health">
          <span>Компанийн эрүүл мэнд</span>
          <div><strong data-tone={branchTone(companyHealth)}>{companyHealth}</strong><small>/100</small><Sparkline values={[74, 73, 75, 72, 74, 76, 75, companyHealth]} tone="gold" label="Компанийн 30 хоногийн эрүүл мэнд" /></div>
          <small>Өчигдөр: 74</small>
        </article>
        <article><span>Нийт борлуулалт</span><strong>{formatMoney(companySales)}</strong><small>Зорилт: {formatMoney(companyTarget)}</small></article>
        <article><span>Зорилтын гүйцэтгэл</span><strong data-tone="healthy">{Math.round((companySales / companyTarget) * 100)}%</strong><small>{formatMoney(companySales)} / {formatMoney(companyTarget)}</small></article>
        <article><span>Шийдвэр хүлээсэн</span><strong data-tone="critical">{pendingApprovals.length}</strong><small>Яаралтай: {pendingApprovals.filter((item) => item.urgency === 'critical').length}</small></article>
        <article><span>Ажиллах хүчний дутуу</span><strong data-tone="critical">{shortage}</strong><small>Өнөө оройн баталгаажсан ирц</small></article>
      </section>

      <ExecutiveHandoffOverview />

      <section className="attention-grid" aria-label="Нэн тэргүүний асуудал">
        <article className="attention-panel attention-panel--danger">
          <header><AlertTriangle size={20} aria-hidden="true" /><h2>Яаралтай анхаарах асуудлууд</h2></header>
          <button type="button" onClick={() => navigate('/branches/queen')}><span>Queen Club-ийн ажиллах хүч дутуу</span><strong>12</strong><ChevronRight size={16} /></button>
          <button type="button" onClick={() => navigate('/customers?cohort=declining')}><span>Өндөр үнэ цэнтэй харилцагч буурсан</span><strong>15</strong><ChevronRight size={16} /></button>
          <button type="button" onClick={() => navigate('/tasks?status=overdue')}><span>Хугацаа хэтэрсэн CEO даалгавар</span><strong>{overdueTasks.length}</strong><ChevronRight size={16} /></button>
        </article>
        <article className="attention-panel">
          <header><ClipboardCheck size={20} aria-hidden="true" /><h2>Таны шийдвэр хүлээсэн</h2></header>
          {pendingApprovals.slice(0, 3).map((approval) => (
            <button key={approval.id} type="button" onClick={() => navigate(`/approvals?selected=${approval.id}`)}>
              <span>{approval.title}</span><strong>{approval.type === 'settlement' ? formatMoney(approval.amount ?? 0) : approval.ageMinutes + ' мин'}</strong><ChevronRight size={16} />
            </button>
          ))}
        </article>
        <article className="attention-panel attention-panel--hermes">
          <header><Bot size={20} aria-hidden="true" /><h2>Hermes зөвлөмж</h2></header>
          {primaryRecommendation ? <><p>{primaryRecommendation.observation}</p><strong>{primaryRecommendation.recommendation}</strong><button type="button" onClick={() => navigate(`/hermes?selected=${primaryRecommendation.id}`)}><span>Дэлгэрэнгүй</span><ChevronRight size={16} /></button></> : <p>Шинэ зөвлөмж алга.</p>}
        </article>
      </section>

      <section className="workbench-section branch-workbench" aria-labelledby="branches-title">
        <header className="section-header">
          <div><h2 id="branches-title">Салбарын харьцуулалт</h2><p>Эрүүл мэндийн оноо нь эх сурвалж, шинэчлэгдсэн хугацаа, бодлогын хувилбартай тайлбарлагдана.</p></div>
          <button className="text-button" type="button" onClick={() => navigate('/branches')}>Бүгдийг харах <ArrowRight size={16} /></button>
        </header>
        <div className="branch-table-wrap">
          <table className="branch-table">
            <thead><tr><th>Салбар</th><th>Эрүүл мэнд</th><th>Борлуулалтын гүйцэтгэл</th><th>Харилцагчийн хандлага</th><th>Ажиллах хүч</th><th>Мэдэгдэлгүй таслалт</th><th>Үйлчилгээ</th><th>Хугацаа хэтэрсэн</th><th>30 хоног</th></tr></thead>
            <tbody>
              {branches.map((branch) => {
                const attainment = Math.round((branch.salesActual / branch.salesTarget) * 100)
                return (
                  <tr key={branch.id}>
                    <td><button className="branch-identity" type="button" onClick={() => navigate(`/branches/${branch.id}`)}><span>{branch.shortName}</span><span><strong>{branch.name}</strong><small>{branch.location}</small></span><ChevronRight size={16} /></button></td>
                    <td><div className="score-cell"><strong data-tone={branch.severity}>{branch.health}</strong><span className="score-square" data-tone={branch.severity} /><small>Өчигдөр: {branch.previousHealth}</small></div></td>
                    <td><div className="value-cell"><strong>{formatMoney(branch.salesActual)}</strong><span><small>Зорилт: {formatMoney(branch.salesTarget)}</small><b data-tone={attainment >= 85 ? 'healthy' : 'critical'}>{attainment}%</b></span><ProgressBar value={attainment} tone={attainment >= 85 ? 'success' : attainment >= 75 ? 'gold' : 'danger'} label={`${branch.name} борлуулалтын гүйцэтгэл`} /></div></td>
                    <td><div className="trend-cell"><strong data-tone={branch.customerTrend >= 0 ? 'healthy' : 'critical'}>{formatPercent(branch.customerTrend)}</strong><Sparkline values={branch.healthTrend.slice(-6).map((value, index) => value + branch.customerTrend / 4 + index)} tone={branch.customerTrend >= 0 ? 'success' : 'danger'} label={`${branch.name} харилцагчийн хандлага`} /></div></td>
                    <td><div className="value-cell"><strong data-tone={branch.workforceReadiness >= 85 ? 'healthy' : 'critical'}>{branch.workforceReadiness}%</strong><small>{branch.checkedInStaff} / {branch.requiredStaff} ирц баталгаажсан</small><span><small>Дутуу:</small><b data-tone="critical">{Math.max(0, branch.requiredStaff - branch.checkedInStaff)}</b></span></div></td>
                    <td><div className="center-cell"><strong data-tone={branch.noShows > 4 ? 'critical' : 'attention'}>{branch.noShows}</strong><small>өнөөдөр</small></div></td>
                    <td><div className="center-cell"><strong data-tone={branch.serviceIssues > 1 ? 'critical' : branch.serviceIssues ? 'attention' : 'healthy'}>{branch.serviceIssues}</strong><small>нээлттэй</small></div></td>
                    <td><div className="center-cell"><strong data-tone={branch.overdueTasks > 4 ? 'critical' : 'attention'}>{branch.overdueTasks}</strong><small>даалгавар</small></div></td>
                    <td><Sparkline values={branch.healthTrend} tone={branch.severity === 'healthy' ? 'success' : branch.severity === 'critical' ? 'danger' : 'gold'} label={`${branch.name} эрүүл мэндийн 30 хоногийн тренд`} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="command-center__footer">
        <p>Тэмдэглэл: Эрүүл мэндийн оноо нь Борлуулалт 40% · Ажиллах хүч 20% · Харилцагч 20% · Үйлчилгээ 10% · Үйл ажиллагаа ба нийцэл 10% гэсэн батлагдсан жингийн нийлбэр.</p>
        <span>Сүүлийн нэгтгэл: {lastRefreshedAt}</span>
        <button className="button button--secondary" type="button" onClick={() => void refresh()} disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? 'spin' : undefined} aria-hidden="true" /> Шинэчлэх
        </button>
      </footer>

      <section className="mobile-action-rail" aria-label="Гол үйлдлүүд">
        <button type="button" onClick={() => navigate('/sales')}><CircleDollarSign size={19} /><span>Борлуулалт</span></button>
        <button type="button" onClick={() => navigate('/workforce')}><Users size={19} /><span>Ажиллах хүч</span></button>
        <button type="button" onClick={() => navigate('/tasks')}><ListTodo size={19} /><span>Даалгавар</span></button>
      </section>
    </div>
  )
}
