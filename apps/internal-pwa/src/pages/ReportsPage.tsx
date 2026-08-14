import {
  BarChart3,
  BookmarkPlus,
  ChevronRight,
  CircleAlert,
  Clock3,
  Download,
  FileBarChart,
  Filter,
  LockKeyhole,
  Search,
  ShieldCheck,
  TableProperties,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { DataMeta } from '../components/ui/DataMeta'
import { OverlayPanel } from '../components/ui/OverlayPanel'
import { PageHeader } from '../components/ui/PageHeader'
import { Sparkline } from '../components/ui/Sparkline'
import { StatusMark } from '../components/ui/StatusMark'
import type { Branch, Severity } from '../domain/types'
import { useApp } from '../state/useApp'

type ReportStatus = 'ready' | 'empty' | 'no-access' | 'stale' | 'failed' | 'partial-export' | 'large-result'
type MetricId = 'health' | 'sales' | 'customers' | 'workforce'
type DimensionId = 'branch' | 'month' | 'manager'
type PeriodId = '30d' | 'month' | '3m'

interface ReportDefinition {
  id: string
  name: string
  owner: string
  purpose: string
  source: string
  cadence: string
  sensitivity: string
  exportLevel: string
  status: ReportStatus
  stateDetail: string
  filters: string[]
  lastRun: string
  estimatedRows: number
  metric?: MetricId
}

interface SavedView {
  id: string
  name: string
  metric: MetricId
  dimension: DimensionId
  period: PeriodId
  permissionScope: 'ceo-company-wide'
}

interface ChartRow {
  id: string
  name: string
  values: number[]
  tone: Severity
}

const statusLabels: Record<ReportStatus, string> = {
  ready: 'Бэлэн',
  empty: 'Хоосон',
  'no-access': 'Эрхгүй',
  stale: 'Хоцорсон',
  failed: 'Амжилтгүй',
  'partial-export': 'Хэсэгчилсэн export',
  'large-result': 'Хэт олон мөр',
}

const reportTone = (status: ReportStatus): Severity => {
  if (status === 'ready' || status === 'empty') return 'healthy'
  if (status === 'stale' || status === 'partial-export' || status === 'large-result') return 'attention'
  return 'critical'
}

const reports: ReportDefinition[] = [
  {
    id: 'branch-health',
    name: 'Branch Health тайлан',
    owner: 'CEO Operations',
    purpose: 'Салбарын эрүүл мэндийн оноо, таван драйвер, түүхэн чиглэлийг харьцуулна.',
    source: 'POS · CRM · Workforce',
    cadence: '15 минут',
    sensitivity: 'Internal',
    exportLevel: 'Masked aggregate · CSV/PDF request',
    status: 'ready',
    stateDetail: 'Шинэ, бүрэн snapshot.',
    filters: ['Салбар', 'Хугацаа', 'Severity'],
    lastRun: '2026.08.12 · 08:20',
    estimatedRows: 84,
    metric: 'health',
  },
  {
    id: 'sales-goal',
    name: 'Сарын зорилт ба pace',
    owner: 'CEO / Finance',
    purpose: 'Зорилт, бодит борлуулалт, expected-to-date pace болон variance-ийг харуулна.',
    source: 'Reconciled POS',
    cadence: '15 минут',
    sensitivity: 'Restricted',
    exportLevel: 'Purpose required · masked CSV/PDF',
    status: 'ready',
    stateDetail: 'Reconciled source ашигласан.',
    filters: ['Салбар', 'Сар', 'Менежер'],
    lastRun: '2026.08.12 · 08:20',
    estimatedRows: 168,
    metric: 'sales',
  },
  {
    id: 'customer',
    name: 'Customer Intelligence',
    owner: 'CRM',
    purpose: 'Давтан ирэлт, membership хөдөлгөөн, high-value бууралтыг масктайгаар шинжилнэ.',
    source: 'CRM · POS · Consent',
    cadence: 'Өдөр бүр',
    sensitivity: 'PII masked',
    exportLevel: 'Aggregate only · PII masked',
    status: 'stale',
    stateDetail: 'Consent source 24 цагаас хуучирсан; шийдвэр гаргалтад ашиглахгүй.',
    filters: ['Салбар', 'Membership', 'Хугацаа'],
    lastRun: '2026.08.12 · 08:00',
    estimatedRows: 96,
    metric: 'customers',
  },
  {
    id: 'workforce',
    name: 'Workforce readiness',
    owner: 'HR',
    purpose: 'Required, scheduled, checked-in, leave, no-show болон shortage дохиог нэгтгэнэ.',
    source: 'Shift · Attendance',
    cadence: '5 минут',
    sensitivity: 'Restricted',
    exportLevel: 'Aggregate only · employee PII hidden',
    status: 'ready',
    stateDetail: 'Approved aggregate fields only.',
    filters: ['Салбар', 'Role', 'Ээлж'],
    lastRun: '2026.08.12 · 08:20',
    estimatedRows: 112,
    metric: 'workforce',
  },
  {
    id: 'settlement',
    name: 'Settlement reconciliation',
    owner: 'Accounting',
    purpose: 'Нягтлан хянасан settlement batch, exception болон bank handoff төлөвийг нэгтгэнэ.',
    source: 'Settlement · Bank',
    cadence: '3 өдөр',
    sensitivity: 'Financial',
    exportLevel: 'Deny by default · policy pending',
    status: 'failed',
    stateDetail: 'Bank handoff contract бэлэн биш; last successful data харуулахгүй.',
    filters: ['Салбар', 'Batch', 'Төлөв'],
    lastRun: 'Live contract pending',
    estimatedRows: 0,
  },
  {
    id: 'service-exceptions',
    name: 'Өдрийн service exception',
    owner: 'Operations',
    purpose: 'Баталгаажсан service exception-уудыг өдөр тутам хянана.',
    source: 'Operations events',
    cadence: '15 минут',
    sensitivity: 'Internal',
    exportLevel: 'Masked aggregate',
    status: 'empty',
    stateDetail: 'Сонгосон хугацаанд баталгаажсан мөр алга; 0 нь жинхэнэ үр дүн.',
    filters: ['Салбар', 'Хугацаа', 'Severity'],
    lastRun: '2026.08.12 · 08:20',
    estimatedRows: 0,
  },
  {
    id: 'payroll-restricted',
    name: 'Цалингийн мөрийн дэлгэрэнгүй',
    owner: 'Restricted',
    purpose: 'Энэ тайлангийн metadata болон мөрүүд одоогийн эрхэд нуугдсан.',
    source: 'Нууцалсан',
    cadence: 'Нууцалсан',
    sensitivity: 'No access',
    exportLevel: 'Export denied',
    status: 'no-access',
    stateDetail: 'URL болон saved view нь нэмэлт эрх олгохгүй.',
    filters: [],
    lastRun: 'Нууцалсан',
    estimatedRows: 0,
  },
  {
    id: 'audit-archive',
    name: 'Executive audit archive',
    owner: 'Security',
    purpose: 'Урт хугацааны immutable audit мөрийг шүүлтүүртэй хянана.',
    source: 'Audit event store',
    cadence: 'Event-driven',
    sensitivity: 'Restricted',
    exportLevel: 'Current view only · 5,000 row guard',
    status: 'large-result',
    stateDetail: '5,420 мөр тул export хаалттай; шүүлтүүрийг нарийсгана.',
    filters: ['Actor', 'Role', 'Domain', 'Хугацаа'],
    lastRun: '2026.08.12 · 08:20',
    estimatedRows: 5420,
  },
  {
    id: 'crm-partial',
    name: 'CRM cohort export status',
    owner: 'CRM',
    purpose: 'Хэсэгчлэн боловсорсон export-ийн omitted мөр, шалтгааныг хянана.',
    source: 'CRM export queue',
    cadence: 'Request-driven',
    sensitivity: 'PII masked',
    exportLevel: 'Partial allowed · omitted rows audited',
    status: 'partial-export',
    stateDetail: '96 мөрөөс 92 бэлэн; 4 мөр consent validation-д үлдсэн.',
    filters: ['Cohort', 'Салбар', 'Хугацаа'],
    lastRun: '2026.08.12 · 08:16',
    estimatedRows: 96,
  },
]

const metricConfig: Record<MetricId, { label: string; owner: string; definition: string; version: string; source: string; freshness: string; dimensions: DimensionId[] }> = {
  health: {
    label: 'Branch Health Score',
    owner: 'CEO Operations',
    definition: 'Sales 40% · Workforce 20% · Customer 20% · Service 10% · Operations 10%',
    version: 'health-v3.2.1',
    source: 'POS · CRM · Workforce',
    freshness: '2026.08.12 · 08:20 · 15 минутын cadence',
    dimensions: ['branch', 'month'],
  },
  sales: {
    label: 'Sales attainment',
    owner: 'CEO / Finance',
    definition: 'Actual sales ÷ approved monthly target; expected-to-date variance тусдаа харагдана.',
    version: 'sales-goal-v1.4',
    source: 'Reconciled POS',
    freshness: '2026.08.12 · 08:20 · 15 минутын cadence',
    dimensions: ['branch', 'month', 'manager'],
  },
  customers: {
    label: 'Customer repeat rate',
    owner: 'CRM',
    definition: 'Хугацаанд 2 ба түүнээс олон completed eligible visit хийсэн харилцагчийн хувь.',
    version: 'crm-repeat-v2.0',
    source: 'CRM · POS · Consent',
    freshness: '2026.08.12 · 08:00 · stale',
    dimensions: ['branch', 'month'],
  },
  workforce: {
    label: 'Workforce readiness',
    owner: 'HR',
    definition: 'Checked-in болон confirmed ажилтан ÷ тухайн ээлжийн required headcount.',
    version: 'workforce-ready-v1.8',
    source: 'Shift · Attendance',
    freshness: '2026.08.12 · 08:20 · 5 минутын cadence',
    dimensions: ['branch', 'month', 'manager'],
  },
}

const dimensionLabels: Record<DimensionId, string> = { branch: 'Салбар', month: 'Сар', manager: 'Менежер' }
const periodLabels: Record<PeriodId, string> = { '30d': 'Сүүлийн 30 хоног', month: 'Энэ сар', '3m': 'Өмнөх 3 сар' }

const toneForValue = (value: number): Severity => (value >= 80 ? 'healthy' : value >= 60 ? 'attention' : 'critical')

const branchSeries = (branch: Branch, metric: MetricId): number[] => {
  if (metric === 'health') return branch.healthTrend
  if (metric === 'sales') {
    const base = Math.round((branch.salesActual / branch.salesTarget) * 100)
    return branch.healthTrend.map((value) => Math.max(0, base + value - branch.health))
  }
  if (metric === 'customers') {
    const base = Math.max(20, 58 + branch.customerTrend)
    return branch.healthTrend.map((value) => Math.max(0, base + Math.round((value - branch.health) / 2)))
  }
  return branch.healthTrend.map((value) => Math.max(0, Math.min(100, branch.workforceReadiness + value - branch.health)))
}

const inferAuditDomain = (action: string) => {
  if (action.includes('Export') || action.includes('Analytics')) return 'Reports'
  if (action.includes('Даалгавар')) return 'Tasks'
  if (action.includes('яриа')) return 'Messages'
  if (action.includes('Шийдвэр')) return 'Approvals'
  return 'Operations'
}

export default function ReportsPage() {
  const { branches, managers, auditEvents, recordAudit } = useApp()
  const initialTab = window.location.pathname.endsWith('/analytics')
    ? 'explorer'
    : window.location.pathname.endsWith('/audit') || new URLSearchParams(window.location.search).get('tab') === 'audit'
      ? 'audit'
      : 'catalog'
  const [tab, setTab] = useState<'catalog' | 'explorer' | 'audit'>(initialTab)
  const [selectedReport, setSelectedReport] = useState<ReportDefinition | null>(null)
  const [exportReport, setExportReport] = useState<ReportDefinition | null>(null)
  const [branch, setBranch] = useState('all')
  const [domain, setDomain] = useState('all')
  const [actor, setActor] = useState('')
  const [role, setRole] = useState('')
  const [action, setAction] = useState('')
  const [target, setTarget] = useState('')
  const [reason, setReason] = useState('')
  const [correlation, setCorrelation] = useState('')
  const [timeRange, setTimeRange] = useState<'all' | 'today' | 'month'>('all')
  const [metric, setMetric] = useState<MetricId>('health')
  const [dimension, setDimension] = useState<DimensionId>('branch')
  const [period, setPeriod] = useState<PeriodId>('30d')
  const [applied, setApplied] = useState({ metric: 'health' as MetricId, dimension: 'branch' as DimensionId, period: '30d' as PeriodId })
  const [savedViews, setSavedViews] = useState<SavedView[]>([
    { id: 'saved-health', name: 'Branch Health · 30 хоног', metric: 'health', dimension: 'branch', period: '30d', permissionScope: 'ceo-company-wide' },
  ])
  const [drilldown, setDrilldown] = useState<ChartRow | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportPurpose, setExportPurpose] = useState('')
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv')
  const [exportAcknowledged, setExportAcknowledged] = useState(false)

  const compatible = metricConfig[metric].dimensions.includes(dimension)
  const appliedMetric = metricConfig[applied.metric]
  const filteredAudit = useMemo(
    () => auditEvents.filter((item) => {
      const itemDomain = item.domain ?? inferAuditDomain(item.action)
      const matchesTime = timeRange === 'all'
        || (timeRange === 'today' && item.createdAt.startsWith('2026.08.12'))
        || (timeRange === 'month' && item.createdAt.startsWith('2026.08'))
      return (!branch || branch === 'all' || item.branchId === branch)
        && (domain === 'all' || itemDomain === domain)
        && item.actor.toLowerCase().includes(actor.toLowerCase())
        && item.role.toLowerCase().includes(role.toLowerCase())
        && item.action.toLowerCase().includes(action.toLowerCase())
        && item.target.toLowerCase().includes(target.toLowerCase())
        && item.reason.toLowerCase().includes(reason.toLowerCase())
        && item.correlationId.toLowerCase().includes(correlation.toLowerCase())
        && matchesTime
    }),
    [auditEvents, branch, domain, actor, role, action, target, reason, correlation, timeRange],
  )

  const chartRows = useMemo<ChartRow[]>(() => {
    if (applied.dimension === 'manager') {
      return managers.map((manager) => ({ id: manager.id, name: manager.name, values: manager.trend, tone: toneForValue(manager.score) }))
    }
    if (applied.dimension === 'month') {
      const values = branches.map((item) => branchSeries(item, applied.metric).at(-1) ?? 0)
      const average = Math.round(values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length))
      return ['2026.05', '2026.06', '2026.07', '2026.08'].map((name, index) => {
        const end = average - 6 + index * 2
        return { id: name, name, values: [end - 4, end - 2, end - 1, end], tone: toneForValue(end) }
      })
    }
    return branches.map((item) => {
      const values = branchSeries(item, applied.metric)
      return { id: item.id, name: item.name, values, tone: toneForValue(values.at(-1) ?? 0) }
    })
  }, [applied.dimension, applied.metric, branches, managers])

  const changeTab = (nextTab: 'catalog' | 'explorer' | 'audit') => {
    const nextPath = nextTab === 'catalog' ? '/reports' : nextTab === 'explorer' ? '/reports/analytics' : '/reports/audit'
    window.history.replaceState({}, '', nextPath)
    setTab(nextTab)
  }

  const openExport = (report: ReportDefinition | null = null) => {
    setExportReport(report)
    setSelectedReport(null)
    setExportOpen(true)
  }

  const closeExport = () => {
    setExportOpen(false)
    setExportReport(null)
  }

  const openInExplorer = (report: ReportDefinition) => {
    if (!report.metric) return
    setMetric(report.metric)
    setDimension('branch')
    setPeriod('30d')
    setApplied({ metric: report.metric, dimension: 'branch', period: '30d' })
    setSelectedReport(null)
    changeTab('explorer')
  }

  const analyze = () => {
    if (!compatible) return
    setApplied({ metric, dimension, period })
  }

  const applySavedView = (view: SavedView) => {
    if (view.permissionScope !== 'ceo-company-wide') return
    setMetric(view.metric)
    setDimension(view.dimension)
    setPeriod(view.period)
    setApplied({ metric: view.metric, dimension: view.dimension, period: view.period })
  }

  const saveView = async () => {
    const name = `${metricConfig[metric].label} · ${dimensionLabels[dimension]} · ${periodLabels[period]}`
    const nextView: SavedView = { id: `saved-${Date.now()}`, name, metric, dimension, period, permissionScope: 'ceo-company-wide' }
    setSavedViews((current) => [nextView, ...current])
    await recordAudit({
      domain: 'Reports',
      action: 'Analytics view хадгалсан',
      target: name,
      reason: 'CEO-ийн эрхтэй filter state; permission scope өргөжүүлэхгүй.',
      summary: `${metricConfig[metric].version} · ${dimensionLabels[dimension]} · ${periodLabels[period]}`,
      eventType: 'action',
    })
  }

  const openDrilldown = async (row: ChartRow) => {
    const scopedBranch = applied.dimension === 'branch' ? branches.find((item) => item.id === row.id) : undefined
    setDrilldown(row)
    await recordAudit({
      domain: 'Reports',
      action: 'Analytics drill-down нээсэн',
      target: `${appliedMetric.label} · ${row.name}`,
      branchId: scopedBranch?.id,
      reason: 'CEO approved aggregate drill-down',
      summary: 'Current authorized row scope · PII masked · raw financial fields hidden',
      eventType: 'action',
    })
  }

  const submitExport = async () => {
    if (!exportPurpose.trim() || !exportAcknowledged) return
    const target = exportReport?.name ?? `${appliedMetric.label} · ${periodLabels[applied.period]}`
    const estimatedRows = exportReport?.estimatedRows ?? chartRows.length
    const outcome = estimatedRows > 5_000 ? 'denied' : exportReport?.status === 'partial-export' ? 'partial' : 'allowed'
    const exportAction = outcome === 'denied'
      ? 'Export хориглосон'
      : outcome === 'partial'
        ? 'Export хэсэгчлэн бэлэн болсон'
        : 'Export хүсэлт үүсгэсэн'
    await recordAudit({
      domain: 'Reports',
      action: exportAction,
      target,
      reason: exportPurpose.trim(),
      summary: `${exportFormat.toUpperCase()} · Visible scope only · PII masked · ${estimatedRows.toLocaleString()} rows${outcome === 'partial' ? ' · 4 consent-pending rows omitted' : ''}`,
      eventType: 'action',
      exportControl: {
        format: exportFormat,
        estimatedRows,
        scope: 'current-authorized-view',
        masked: true,
        outcome,
      },
    })
    setExportOpen(false)
    setExportReport(null)
    setExportPurpose('')
    setExportAcknowledged(false)
    setSelectedReport(null)
    setAction(exportAction)
    setDomain('Reports')
    changeTab('audit')
  }

  return (
    <div className="page reports-page">
      <PageHeader
        title="Тайлан, шинжилгээ"
        description="Metric definition, source, freshness, permission ба immutable audit-тай executive analysis."
        actions={<button className="button button--primary" type="button" onClick={() => openExport()}><Download size={17} />Export хүсэлт</button>}
      />

      <div className="reports-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'catalog'} onClick={() => changeTab('catalog')}><FileBarChart size={18} />Тайлангийн каталог</button>
        <button type="button" role="tab" aria-selected={tab === 'explorer'} onClick={() => changeTab('explorer')}><BarChart3 size={18} />Analytics explorer</button>
        <button type="button" role="tab" aria-selected={tab === 'audit'} onClick={() => changeTab('audit')}><ShieldCheck size={18} />Executive audit</button>
      </div>

      {tab === 'catalog' ? (
        <section className="report-catalog">
          {reports.map((report) => (
            <article key={report.id}>
              <header>
                <span className="report-icon"><FileBarChart size={21} /></span>
                <div><h2>{report.name}</h2><p>{report.owner}</p></div>
                <StatusMark tone={reportTone(report.status)} label={statusLabels[report.status]} />
              </header>
              <p className="report-purpose">{report.purpose}</p>
              <dl>
                <div><dt>Source</dt><dd>{report.source}</dd></div>
                <div><dt>Refresh</dt><dd>{report.cadence}</dd></div>
                <div><dt>Data level</dt><dd><LockKeyhole size={14} /> {report.sensitivity}</dd></div>
                <div><dt>Export</dt><dd>{report.exportLevel}</dd></div>
                <div><dt>Last run</dt><dd>{report.lastRun}</dd></div>
              </dl>
              <p className={`report-state report-state--${reportTone(report.status)}`}>{report.stateDetail}</p>
              <button className="text-button" type="button" disabled={report.status === 'no-access'} onClick={() => setSelectedReport(report)}>{report.status === 'no-access' ? 'Хандах эрхгүй' : 'Тайлан нээх'} <ChevronRight size={16} /></button>
            </article>
          ))}
        </section>
      ) : null}

      {tab === 'explorer' ? (
        <section className="analytics-explorer">
          <aside className="analytics-controls">
            <h2>Шинжилгээний нөхцөл</h2>
            <label><span>Metric</span><select aria-label="Metric" value={metric} onChange={(event) => setMetric(event.target.value as MetricId)}>{Object.entries(metricConfig).map(([id, item]) => <option key={id} value={id}>{item.label}</option>)}</select></label>
            <label><span>Dimension</span><select aria-label="Dimension" value={dimension} onChange={(event) => setDimension(event.target.value as DimensionId)}>{Object.entries(dimensionLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
            <label><span>Хугацаа</span><select aria-label="Хугацаа" value={period} onChange={(event) => setPeriod(event.target.value as PeriodId)}>{Object.entries(periodLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
            {!compatible ? <div className="callout callout--danger" role="alert"><CircleAlert size={18} /><p>{metricConfig[metric].label} нь “{dimensionLabels[dimension]}” dimension-тэй батлагдаагүй. Салбар эсвэл Сар сонгоно уу.</p></div> : null}
            <button className="button button--primary button--full" type="button" onClick={analyze} disabled={!compatible}><Filter size={17} />Шинжлэх</button>
            <button className="button button--secondary button--full" type="button" onClick={saveView} disabled={!compatible}><BookmarkPlus size={17} />View хадгалах</button>
            <div className="saved-view-list" aria-label="Хадгалсан view">
              <strong>Хадгалсан view</strong>
              <small>CEO company-wide scope хадгалагдана; saved view нэмэлт эрх олгохгүй.</small>
              {savedViews.map((view) => <button key={view.id} type="button" onClick={() => applySavedView(view)}>{view.name}<ChevronRight size={14} /></button>)}
            </div>
          </aside>
          <article className="analytics-canvas">
            <header>
              <div><h2>{appliedMetric.label} · {periodLabels[applied.period]}</h2><p>{dimensionLabels[applied.dimension]} dimension · Demo fixture</p></div>
              <DataMeta meta={branches[0].meta} />
            </header>
            <div className="metric-definition"><TableProperties size={18} /><div><strong>{appliedMetric.definition}</strong><span>Metric owner: {appliedMetric.owner} · Formula: {appliedMetric.version}</span><span>Source: {appliedMetric.source} · Freshness: {appliedMetric.freshness}</span></div></div>
            <div className="multi-series-chart">
              {chartRows.map((item) => <button type="button" key={item.id} aria-label={`${item.name} drill-down`} onClick={() => void openDrilldown(item)}><span><i data-tone={item.tone} />{item.name}</span><Sparkline values={item.values} tone={item.tone === 'healthy' ? 'success' : item.tone === 'critical' ? 'danger' : 'gold'} width={560} height={76} /><ChevronRight size={16} /></button>)}
            </div>
            <footer><span>Metric owner: {appliedMetric.owner}</span><span>Formula version: {appliedMetric.version}</span><span>Freshness: {appliedMetric.freshness}</span><span>Sub-formula: configuration pending</span></footer>
          </article>
        </section>
      ) : null}

      {tab === 'audit' ? (
        <section className="audit-workbench">
          <header className="audit-filters">
            <label><span>Actor</span><input aria-label="Audit actor" value={actor} onChange={(event) => setActor(event.target.value)} placeholder="Нэр" /></label>
            <label><span>Role</span><input aria-label="Audit role" value={role} onChange={(event) => setRole(event.target.value)} placeholder="Role" /></label>
            <label><span>Action</span><input aria-label="Audit action" value={action} onChange={(event) => setAction(event.target.value)} placeholder="Үйлдэл" /></label>
            <label><span>Target</span><input aria-label="Audit target" value={target} onChange={(event) => setTarget(event.target.value)} placeholder="Объект" /></label>
            <label><span>Reason</span><input aria-label="Audit reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Үндэслэл" /></label>
            <label><span>Correlation</span><input aria-label="Audit correlation" value={correlation} onChange={(event) => setCorrelation(event.target.value)} placeholder="AUD-…" /></label>
            <label><span>Салбар</span><select aria-label="Audit branch" value={branch} onChange={(event) => setBranch(event.target.value)}><option value="all">Бүх салбар</option>{branches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label><span>Domain</span><select aria-label="Audit domain" value={domain} onChange={(event) => setDomain(event.target.value)}><option value="all">Бүх domain</option>{['Reports', 'Approvals', 'Tasks', 'Messages', 'Operations', 'EmployeePerformance', 'SensitiveMessaging'].map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>Хугацаа</span><select aria-label="Audit time" value={timeRange} onChange={(event) => setTimeRange(event.target.value as 'all' | 'today' | 'month')}><option value="all">Бүх хугацаа</option><option value="today">Өнөөдөр · 08.12</option><option value="month">2026.08 сар</option></select></label>
            <div className="audit-immutable"><StatusMark tone="healthy" label="Immutable event view" /><small>Засвар нь overwrite биш adjustment/reversal event.</small></div>
          </header>
          <div className="audit-table">
            <div className="audit-table__head"><span>Огноо</span><span>Actor / Role</span><span>Domain</span><span>Action</span><span>Target</span><span>Салбар</span><span>Reason / Summary</span><span>Before → After</span><span>Correlation</span></div>
            {filteredAudit.map((event) => (
              <div key={event.id} className="audit-table__row">
                <span><Clock3 size={14} />{event.createdAt}</span>
                <span><strong>{event.actor}</strong><small>{event.role}</small></span>
                <strong>{event.domain ?? inferAuditDomain(event.action)}</strong>
                <strong>{event.action}</strong>
                <span>{event.target}</span>
                <span>{branches.find((item) => item.id === event.branchId)?.name ?? 'Company'}</span>
                <span>{event.reason}{event.summary ? <small>{event.summary}</small> : null}{event.exportControl ? <small>{event.exportControl.outcome} · {event.exportControl.estimatedRows.toLocaleString()} rows · masked</small> : null}</span>
                <span>{event.before || event.after ? <><small>{event.eventType} · {event.reversesEventId}</small><strong>{event.before ?? '—'} → {event.after ?? '—'}</strong></> : <small>Өөрчлөлтгүй</small>}</span>
                <code>{event.correlationId}</code>
              </div>
            ))}
            {!filteredAudit.length ? <div className="empty-state"><Search size={28} /><strong>Тохирох audit event алга</strong><p>Filter эсвэл хайлтын нөхцөлийг өөрчилнө үү.</p></div> : null}
          </div>
        </section>
      ) : null}

      <OverlayPanel
        open={Boolean(selectedReport)}
        onClose={() => setSelectedReport(null)}
        title={selectedReport?.name ?? ''}
        description="Эрх, эх сурвалж, freshness болон available filter"
        variant="drawer"
        footer={selectedReport ? <div className="modal-actions"><button className="button button--secondary" type="button" disabled={!['ready', 'empty', 'partial-export', 'large-result'].includes(selectedReport.status)} onClick={() => openExport(selectedReport)}><Download size={17} />Export хүсэлт</button><button className="button button--primary" type="button" disabled={!selectedReport.metric || selectedReport.status !== 'ready'} onClick={() => openInExplorer(selectedReport)}>{selectedReport.metric && selectedReport.status === 'ready' ? 'Analytics-д нээх' : 'Шинжилгээ хаалттай'}<ChevronRight size={17} /></button></div> : null}
      >
        {selectedReport ? (
          <div className="report-detail">
            <StatusMark tone={reportTone(selectedReport.status)} label={statusLabels[selectedReport.status]} />
            <div className={`callout ${reportTone(selectedReport.status) === 'critical' ? 'callout--danger' : 'callout--warning'}`}><CircleAlert size={18} /><p>{selectedReport.stateDetail}</p></div>
            <section><h3>Зорилго</h3><p>{selectedReport.purpose}</p></section>
            <div className="definition-list">
              <div><span>Owner</span><strong>{selectedReport.owner}</strong></div>
              <div><span>Source</span><strong>{selectedReport.source}</strong></div>
              <div><span>Refresh cadence</span><strong>{selectedReport.cadence}</strong></div>
              <div><span>Last successful run</span><strong>{selectedReport.lastRun}</strong></div>
              <div><span>Sensitivity / export</span><strong>{selectedReport.sensitivity}</strong></div>
              <div><span>Export level</span><strong>{selectedReport.exportLevel}</strong></div>
              <div><span>Estimated result</span><strong>{selectedReport.estimatedRows.toLocaleString()} мөр</strong></div>
            </div>
            <section><h3>Available filters</h3><div className="report-filter-list">{selectedReport.filters.map((item) => <span key={item}>{item}</span>)}</div></section>
            <div className="callout callout--warning"><LockKeyhole size={18} /><p>Drill-down болон export нь одоогийн CEO permission scope-ийг өргөжүүлэхгүй. PII болон restricted field масктай хэвээр байна.</p></div>
          </div>
        ) : null}
      </OverlayPanel>

      <OverlayPanel
        open={Boolean(drilldown)}
        onClose={() => setDrilldown(null)}
        title={drilldown ? `${drilldown.name} · drill-down` : ''}
        description="Current authorized row scope · field-level masking"
        variant="drawer"
      >
        {drilldown ? (
          <div className="report-detail analytics-drilldown">
            <StatusMark tone={drilldown.tone} label="Aggregate row" />
            <div className="definition-list">
              <div><span>Metric</span><strong>{appliedMetric.label}</strong></div>
              <div><span>Scope</span><strong>{applied.dimension === 'branch' ? `${drilldown.name} салбар` : `${dimensionLabels[applied.dimension]} aggregate`}</strong></div>
              <div><span>Values</span><strong>{drilldown.values.join(' · ')}</strong></div>
              <div><span>Source / freshness</span><strong>{appliedMetric.source} · {appliedMetric.freshness}</strong></div>
            </div>
            <div className="callout callout--warning"><LockKeyhole size={18} /><p>Зөвхөн зөвшөөрөгдсөн aggregate мөр харагдана. Customer PII, employee sensitive field болон raw financial мөрүүд нууцлагдсан; drill-down нэмэлт эрх олгохгүй.</p></div>
          </div>
        ) : null}
      </OverlayPanel>

      <OverlayPanel
        open={exportOpen}
        onClose={closeExport}
        title="Export хүсэлт"
        description="Deny-by-default · purpose-bound · audited"
        variant="drawer"
        footer={<div className="modal-actions"><button className="button button--secondary" type="button" onClick={closeExport}>Болих</button><button className="button button--primary" type="button" onClick={submitExport} disabled={!exportPurpose.trim() || !exportAcknowledged}>Хүсэлт илгээх</button></div>}
      >
        <form className="form-stack" onSubmit={(event) => { event.preventDefault(); void submitExport() }}>
          <div className="export-context"><strong>Export context</strong><span>{exportReport?.name ?? `${appliedMetric.label} · ${periodLabels[applied.period]}`}</span><small>Current authorized view · {(exportReport?.estimatedRows ?? chartRows.length).toLocaleString()} estimated rows · {exportReport?.exportLevel ?? 'Masked aggregate'}</small></div>
          <label><span>Export-ийн зорилго *</span><textarea value={exportPurpose} onChange={(event) => setExportPurpose(event.target.value)} placeholder="Бизнесийн зорилго, хүлээн авагч, ашиглах хугацааг бичнэ үү." /></label>
          <label><span>Формат</span><select value={exportFormat} onChange={(event) => setExportFormat(event.target.value as 'csv' | 'pdf')}><option value="csv">CSV · masked fields</option><option value="pdf">PDF · executive summary</option></select></label>
          <div className={`callout ${(exportReport?.estimatedRows ?? chartRows.length) > 5_000 ? 'callout--danger' : 'callout--warning'}`}><ShieldCheck size={18} /><p>{(exportReport?.estimatedRows ?? chartRows.length) > 5_000 ? 'Large-result: 5,000 мөрийн хамгаалалтаас давсан тул download үүсэхгүй; denied event audit-д үлдэнэ.' : 'Шууд download хийхгүй. Хүсэлт бүр audit event үүсгэнэ; PII masked, visible scope only, 5,000 мөрийн hard limit болон минутын rate control үйлчилнэ.'}</p></div>
          <label className="export-ack"><input type="checkbox" checked={exportAcknowledged} onChange={(event) => setExportAcknowledged(event.target.checked)} /><span>Зөвхөн зөвшөөрөгдсөн бизнесийн зорилгоор ашиглаж, файлыг хамгаална.</span></label>
        </form>
      </OverlayPanel>
    </div>
  )
}
