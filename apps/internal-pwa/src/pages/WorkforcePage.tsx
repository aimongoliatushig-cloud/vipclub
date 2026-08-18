import { ChevronRight, CircleAlert, Clock3, DatabaseZap, MessageSquare, ShieldAlert, Sparkles, UserMinus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { DataMeta } from '../components/ui/DataMeta'
import { OverlayPanel } from '../components/ui/OverlayPanel'
import { PageHeader } from '../components/ui/PageHeader'
import { Sparkline } from '../components/ui/Sparkline'
import { StatusMark } from '../components/ui/StatusMark'
import { ExecutiveWorkforceHandoffPanel } from '../features/executive/ExecutiveHandoffPanels'
import type { Branch, WorkforcePresenceState, WorkforceReadinessSnapshot } from '../domain/types'
import { useApp } from '../state/useApp'

const stateLabels: Record<WorkforcePresenceState, string> = {
  scheduled: 'Хуваарьтай',
  available: 'Боломжтой',
  reserved: 'Захиалгад',
  serving: 'Үйлчилж буй',
  break: 'Завсарлага',
  late: 'Хоцорсон',
  absent: 'Ирээгүй',
  leave: 'Чөлөөтэй',
  uncovered: 'Нөхөгдөөгүй',
  stale: 'Хуучирсан',
  unknown: 'Тодорхойгүй',
}
const stateTone = (state: WorkforcePresenceState) => ['absent', 'uncovered'].includes(state) ? 'critical' : ['late', 'stale', 'unknown'].includes(state) ? 'attention' : ['serving', 'available'].includes(state) ? 'healthy' : 'neutral'

function ReadinessDetail({ branch, snapshot, onClose }: { branch: Branch; snapshot: WorkforceReadinessSnapshot; onClose(): void }) {
  const navigate = useNavigate()
  const shortage = Math.max(0, branch.requiredStaff - branch.checkedInStaff)
  return (
    <OverlayPanel open title={`${branch.name} · нөхөлтийн нотолгоо`} description={`${snapshot.operatingDate} · ${shortage} хүн дутуу`} onClose={onClose} wide>
      <div className="readiness-state-grid">{snapshot.statusCounts.map((item) => <div key={item.state} data-tone={stateTone(item.state)}><span>{stateLabels[item.state]}</span><strong>{item.count}</strong></div>)}</div>
      <section className="detail-section"><header><h3>Үүрэг ба цагийн нөхөлтийн зөрүү</h3><DataMeta meta={snapshot.meta} /></header><div className="coverage-evidence-list">{snapshot.coverageGaps.map((gap) => <article key={gap.id}><header><div><strong>{gap.role}</strong><span>{gap.timeWindow}</span></div><StatusMark tone={gap.state === 'uncovered' ? 'critical' : 'attention'} label={gap.state === 'uncovered' ? `${gap.required - gap.covered} нөхөгдөөгүй` : gap.state === 'stale' ? 'Хуучирсан' : 'Тодорхойгүй'} /></header><div className="coverage-ratio"><span>Шаардлагатай {gap.required}</span><span>Нөхөгдсөн {gap.covered}</span><strong>{Math.round((gap.covered / gap.required) * 100)}%</strong></div><ul>{gap.evidence.map((item) => <li key={item}>{item}</li>)}</ul><small>{gap.sourceRecord}</small></article>)}</div></section>
      <div className="callout callout--danger"><ShieldAlert size={18} /><p>Мэдэгдэлгүй таслалт, чөлөө, хуучирсан болон тодорхойгүй төлөв нь тусдаа эрх бүхий бүртгэл. Эрсдэлийн автомат үржүүлэгч ба хүний нөөцийн автомат шийдвэр батлагдаагүй тул үүсгэхгүй.</p></div>
      <div className="modal-actions"><button className="button button--secondary" type="button" onClick={() => navigate(`/messages?create=1&branch=${branch.id}&title=${encodeURIComponent(`${branch.name} · Workforce coverage`)}&context=${encodeURIComponent(snapshot.meta.sourceRecord)}`)}><MessageSquare size={17} />Менежерт бичих</button><button className="button button--primary" type="button" onClick={() => navigate(`/tasks?create=1&branch=${branch.id}&context=${encodeURIComponent(`Workforce shortage · ${snapshot.meta.sourceRecord}`)}`)}>Даалгавар үүсгэх</button></div>
    </OverlayPanel>
  )
}

export default function WorkforcePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { branches, workforce } = useApp()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const view = location.pathname.endsWith('/manager-evidence') ? 'manager-evidence' : location.pathname.endsWith('/coverage') ? 'coverage' : location.pathname.endsWith('/attendance') ? 'attendance' : location.pathname.endsWith('/forecast') ? 'forecast' : 'tonight'
  const selectedSnapshot = selectedId ? workforce.find((item) => item.branchId === selectedId) : undefined
  const selectedBranch = selectedId ? branches.find((item) => item.id === selectedId) : undefined
  const totalShortage = branches.reduce((sum, item) => sum + Math.max(0, item.requiredStaff - item.checkedInStaff), 0)
  const totalNoShows = branches.reduce((sum, item) => sum + item.noShows, 0)
  const partialCount = workforce.filter((item) => item.forecast.some((forecast) => forecast.dataState !== 'complete')).length
  const totals = useMemo(() => workforce.flatMap((item) => item.statusCounts).reduce<Record<string, number>>((result, item) => ({ ...result, [item.state]: (result[item.state] ?? 0) + item.count }), {}), [workforce])

  return (
    <div className="page workforce-page">
      <PageHeader title="Ажиллах хүч" description="Өнөө оройн бэлэн байдал, үүрэг/цагийн нөхөлт, ирцийн хандлага ба зөвлөх урьдчилсан төлөв." meta={workforce[0] ? <DataMeta meta={workforce[0].meta} detailed /> : undefined} actions={<button className="button button--primary" type="button" onClick={() => setSelectedId(branches[0]?.id ?? null)}><CircleAlert size={17} />Ноцтой дутагдал харах</button>} />
      <div className="workspace-tabs workforce-tabs" role="tablist" aria-label="Ажиллах хүчний хэсэг"><button type="button" role="tab" aria-selected={view === 'tonight'} onClick={() => navigate('/workforce')}>Өнөө орой</button><button type="button" role="tab" aria-selected={view === 'coverage'} onClick={() => navigate('/workforce/coverage')}>Хүний нөөцийн нөхөлт</button><button type="button" role="tab" aria-selected={view === 'attendance'} onClick={() => navigate('/workforce/attendance')}>Ирц</button><button type="button" role="tab" aria-selected={view === 'manager-evidence'} onClick={() => navigate('/workforce/manager-evidence')}>Менежерийн хяналт</button><button type="button" role="tab" aria-selected={view === 'forecast'} onClick={() => navigate('/workforce/forecast')}>Урьдчилсан төлөв</button></div>

      {view === 'manager-evidence' ? <ExecutiveWorkforceHandoffPanel /> : null}

      {view === 'tonight' ? <>
        <section className="metric-strip metric-strip--compact"><article><span>Өнөө оройн шаардлага</span><strong>{branches.reduce((sum, item) => sum + item.requiredStaff, 0)}</strong><small>{branches.length} салбар</small></article><article><span>Үйлчилж буй</span><strong>{totals.serving ?? 0}</strong><small>Ажиллах боломжоос тусдаа</small></article><article><span>Нөхөгдөөгүй</span><strong data-tone="critical">{totals.uncovered ?? totalShortage}</strong><small>Үүрэг/цагийн зөрүү</small></article><article><span>Гэнэтийн таслалт</span><strong data-tone="critical">{totals.absent ?? totalNoShows}</strong><small>Зөвшөөрсөн чөлөөнөөс тусдаа</small></article><article><span>Хуучирсан / тодорхойгүй</span><strong data-tone="attention">{(totals.stale ?? 0) + (totals.unknown ?? 0)}</strong><small>Эрх бүхий бүртгэл биш</small></article></section>
        <section className="workbench-section readiness-board"><header className="section-header"><div><h2>Өнөө оройн бэлэн байдал</h2><p>Scheduled, available, reserved, serving, break, late, absent, leave, uncovered, stale, unknown</p></div><StatusMark tone="critical" label={`${totalShortage} хүн дутуу`} /></header><div className="readiness-rows">{branches.map((branch) => { const snapshot = workforce.find((item) => item.branchId === branch.id); const shortage = Math.max(0, branch.requiredStaff - branch.checkedInStaff); return <button key={branch.id} type="button" className="readiness-row" onClick={() => setSelectedId(branch.id)}><span className="branch-monogram">{branch.shortName}</span><span><strong>{branch.name}</strong><small>{branch.manager}</small></span><span><small>Required</small><strong>{branch.requiredStaff}</strong></span><span><small>Scheduled</small><strong>{branch.scheduledStaff}</strong></span><span><small>Serving</small><strong>{snapshot?.statusCounts.find((item) => item.state === 'serving')?.count ?? 0}</strong></span><span><small>Leave</small><strong>{snapshot?.statusCounts.find((item) => item.state === 'leave')?.count ?? 0}</strong></span><span><small>Absent</small><strong data-tone={branch.noShows > 4 ? 'critical' : 'attention'}>{branch.noShows}</strong></span><span><small>Uncovered</small><strong data-tone={shortage ? 'critical' : 'healthy'}>{shortage}</strong></span><span><small>Data state</small><StatusMark tone={snapshot?.forecast.some((item) => item.dataState !== 'complete') ? 'attention' : 'healthy'} label={snapshot?.forecast.some((item) => item.dataState !== 'complete') ? 'Partial' : 'Current'} /></span><ChevronRight size={18} /></button>})}</div></section>
      </> : null}

      {view === 'coverage' ? <section className="workbench-section workforce-coverage-view"><header className="section-header"><div><h2>Role / time coverage</h2><p>Exception бүр source evidence болон authoritative state-тэй.</p></div><StatusMark tone="critical" label={`${workforce.flatMap((item) => item.coverageGaps).filter((item) => item.state === 'uncovered').length} uncovered`} /></header><div className="coverage-branch-grid">{workforce.map((snapshot) => { const branch = branches.find((item) => item.id === snapshot.branchId); return <article key={snapshot.id}><header><div><h3>{branch?.name}</h3><small>{snapshot.operatingDate}</small></div><button className="button button--secondary" type="button" onClick={() => setSelectedId(snapshot.branchId)}>Нотолгоо</button></header>{snapshot.coverageGaps.map((gap) => <button key={gap.id} type="button" onClick={() => setSelectedId(snapshot.branchId)}><span><strong>{gap.role}</strong><small>{gap.timeWindow} · {gap.sourceRecord}</small></span><StatusMark tone={gap.state === 'uncovered' ? 'critical' : 'attention'} label={gap.state === 'uncovered' ? `${gap.required - gap.covered} gap` : gap.state} /></button>)}</article>})}</div></section> : null}

      {view === 'attendance' ? <section className="workbench-section attendance-view"><header className="section-header"><div><h2>Attendance trend</h2><p>Late, absent, approved leave · 8 долоо хоног · demo aggregate</p></div><Clock3 size={19} /></header><div className="attendance-branch-grid">{workforce.map((snapshot) => { const branch = branches.find((item) => item.id === snapshot.branchId); return <article key={snapshot.id}><header><div><h3>{branch?.name}</h3><DataMeta meta={snapshot.meta} /></div><StatusMark tone={snapshot.meta.reconciled ? 'healthy' : 'attention'} label={snapshot.meta.reconciled ? 'Current' : 'Partial'} /></header><Sparkline values={snapshot.attendanceTrend.map((item) => item.absent)} tone="danger" width={300} height={92} label={`${branch?.name} absence trend`} /><div className="attendance-totals"><span>Late <strong>{snapshot.attendanceTrend.at(-1)?.late}</strong></span><span>Absent <strong>{snapshot.attendanceTrend.at(-1)?.absent}</strong></span><span>Leave <strong>{snapshot.attendanceTrend.at(-1)?.leave}</strong></span></div></article>})}</div></section> : null}

      {view === 'forecast' ? <section className="workforce-forecast-view"><div className="advisory-boundary"><Sparkles size={20} /><div><strong>Зөвлөх forecast · authoritative record биш</strong><p>Хүний шийдвэр, хуваарь, сахилгын action автоматаар үүсгэхгүй. Confidence, assumption, missing data-г хамт уншина.</p></div><StatusMark tone={partialCount ? 'attention' : 'healthy'} label={`${partialCount} partial/stale`} /></div><div className="forecast-card-grid">{workforce.flatMap((snapshot) => snapshot.forecast.map((forecast) => { const branch = branches.find((item) => item.id === snapshot.branchId); return <article key={`${snapshot.id}-${forecast.horizonDays}`}><header><div><h3>{branch?.name}</h3><small>{forecast.horizonDays} хоногийн advisory projection</small></div><StatusMark tone={forecast.dataState === 'complete' ? 'healthy' : 'attention'} label={forecast.dataState} /></header><div className="forecast-number"><UserMinus size={22} /><strong>{forecast.predictedGap}</strong><span>predicted gap</span></div><dl><div><dt>Confidence</dt><dd>{forecast.confidence === undefined ? 'Not available' : `${forecast.confidence}%`}</dd></div><div><dt>Source</dt><dd>{forecast.sourceRecord}</dd></div></dl><h4>Assumptions</h4><ul>{forecast.assumptions.map((item) => <li key={item}>{item}</li>)}</ul>{forecast.missingData.length ? <div className="forecast-missing"><DatabaseZap size={16} /><span><strong>Missing / partial data</strong>{forecast.missingData.join(' · ')}</span></div> : null}</article> }))}</div></section> : null}

      {selectedBranch && selectedSnapshot ? <ReadinessDetail branch={selectedBranch} snapshot={selectedSnapshot} onClose={() => setSelectedId(null)} /> : null}
    </div>
  )
}
