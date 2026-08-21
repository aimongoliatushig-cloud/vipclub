import { ArrowRight, CalendarDays, CheckCircle2, ChevronRight, FileCheck2, Pencil, Target, TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { DataMeta } from '../components/ui/DataMeta'
import { OverlayPanel } from '../components/ui/OverlayPanel'
import { PageHeader } from '../components/ui/PageHeader'
import { ProgressBar } from '../components/ui/ProgressBar'
import { Sparkline } from '../components/ui/Sparkline'
import { StatusMark } from '../components/ui/StatusMark'
import { ExecutiveGoalProposalSummary } from '../features/executive/ExecutiveHandoffPanels'
import { useApp } from '../state/useApp'
import { formatMoney } from '../utils/format'

export default function SalesGoalsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { branches, approvals, updateTarget } = useApp()
  const requestedBranch = searchParams.get('branch')
  const [selectedId, setSelectedId] = useState(() => branches.some((item) => item.id === requestedBranch) ? requestedBranch as string : 'queen')
  const [targetOpen, setTargetOpen] = useState(false)
  const selected = branches.find((item) => item.id === selectedId) ?? branches[0]
  const [targetValue, setTargetValue] = useState(String(selected.salesTarget))
  const planApproval = approvals.find((item) => item.type === 'plan' && item.branchId === selected.id)
  const totalActual = branches.reduce((sum, item) => sum + item.salesActual, 0)
  const totalTarget = branches.reduce((sum, item) => sum + item.salesTarget, 0)

  useEffect(() => {
    if (requestedBranch && branches.some((item) => item.id === requestedBranch)) setSelectedId(requestedBranch)
  }, [branches, requestedBranch])

  const pace = useMemo(() => Math.round((selected.salesActual / selected.salesTarget) * 100), [selected])

  const openTarget = () => {
    setTargetValue(String(selected.salesTarget))
    setTargetOpen(true)
  }

  const submitTarget = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = Number(targetValue)
    if (!Number.isFinite(value) || value <= 0) return
    await updateTarget(selected.id, value)
    setTargetOpen(false)
  }

  return (
    <div className="page sales-page">
      <PageHeader
        title="Борлуулалт ба зорилт"
        description="CEO зорилт → менежерийн төлөвлөгөө → CEO хяналт → хэрэгжилт."
        meta={<DataMeta meta={branches[0].meta} detailed />}
        actions={<button className="button button--primary" type="button" onClick={openTarget}><Pencil size={17} />Сарын зорилт оруулах</button>}
      />

      <section className="metric-strip metric-strip--compact" aria-label="Борлуулалтын тойм">
        <article><span>Нийт гүйцэтгэл</span><strong>{formatMoney(totalActual)}</strong><small>{formatMoney(totalTarget)} зорилтоос</small></article>
        <article><span>Компанийн attainment</span><strong data-tone="healthy">{Math.round((totalActual / totalTarget) * 100)}%</strong><small>Expected-to-date: 77%</small></article>
        <article><span>Хурдаас хоцорсон</span><strong data-tone="critical">2</strong><small>Queen Club · Gobi Lounge</small></article>
        <article><span>Үйл ажиллагааны төлөвлөгөө хянах</span><strong data-tone="attention">1</strong><small>CEO шийдвэр хүлээсэн</small></article>
      </section>

      <ExecutiveGoalProposalSummary />

      <section className="sales-workbench">
        <div className="sales-branches" role="tablist" aria-label="Салбар сонгох">
          {branches.map((branch) => {
            const attainment = Math.round((branch.salesActual / branch.salesTarget) * 100)
            return (
              <button key={branch.id} type="button" role="tab" aria-selected={selectedId === branch.id} className={selectedId === branch.id ? 'selected' : undefined} onClick={() => setSelectedId(branch.id)}>
                <span className="branch-monogram">{branch.shortName}</span>
                <span><strong>{branch.name}</strong><small>{formatMoney(branch.salesActual)} / {formatMoney(branch.salesTarget)}</small></span>
                <span className="sales-branch__pace" data-tone={attainment >= 85 ? 'healthy' : attainment >= 75 ? 'attention' : 'critical'}>{attainment}%</span>
              </button>
            )
          })}
        </div>
        <article className="sales-focus">
          <header><div><h2>{selected.name} · 2026 оны 8-р сар</h2><p>CEO баталсан зорилтын хяналт</p></div><button className="button button--secondary" type="button" onClick={openTarget}><Pencil size={16} />Зорилт засах</button></header>
          <div className="sales-focus__hero">
            <div><span>CEO зорилт</span><strong>{formatMoney(selected.salesTarget)}</strong><small>Policy: target-2026-08-v1</small></div>
            <div><span>Бодит борлуулалт</span><strong>{formatMoney(selected.salesActual)}</strong><small>Reconciled · 08:20</small></div>
            <div><span>Гүйцэтгэл</span><strong data-tone={pace >= 85 ? 'healthy' : pace >= 75 ? 'attention' : 'critical'}>{pace}%</strong><small>Expected-to-date: {selected.expectedPace}%</small></div>
            <div className="sales-focus__chart"><Sparkline values={[10, 11.2, 12.4, 13.1, 14.9, 15.8, 17.3, selected.salesActual]} tone={pace >= 85 ? 'success' : 'danger'} width={220} height={72} label="Борлуулалтын сарын тренд" /><span>Actual</span></div>
          </div>
          <ProgressBar value={pace} tone={pace >= 85 ? 'success' : pace >= 75 ? 'gold' : 'danger'} label={`${selected.name} сарын зорилт`} />
          <div className="sales-focus__variance"><span>Expected-to-date variance</span><strong data-tone={pace >= selected.expectedPace ? 'healthy' : 'critical'}>{pace - selected.expectedPace} пункт</strong><small>Өдрийн дундаж шаардлага: {formatMoney(Math.max(0, selected.salesTarget - selected.salesActual) / 19)}</small></div>
        </article>
      </section>

      <section className="workbench-split">
        <article className="workbench-section manager-plan">
          <header className="section-header"><div><h2>Менежерийн үйл ажиллагааны төлөвлөгөө</h2><p>{selected.manager} · Сүүлд шинэчилсэн 07:55</p></div>{planApproval ? <StatusMark tone="attention" label="CEO хянах шаардлагатай" /> : <StatusMark tone="healthy" label="Батлагдсан" />}</header>
          <ol className="plan-list">
            <li><span>01</span><div><strong>Үнэ цэнтэй харилцагчийг идэвхжүүлэх</strong><p>15 харилцагч · CRM хариуцагч</p></div><b>40%</b></li>
            <li><span>02</span><div><strong>Баасан гарагийн premium package</strong><p>Campaign owner assigned</p></div><b>70%</b></li>
            <li><span>03</span><div><strong>Preferred entertainer backup roster</strong><p>Эзэн томилоогүй</p></div><b data-tone="critical">0%</b></li>
            <li><span>04</span><div><strong>Service recovery review</strong><p>6 сөрөг үнэлгээний шалтгаан</p></div><b>25%</b></li>
          </ol>
          <footer><button className="button button--secondary" type="button" onClick={() => navigate(`/tasks?branch=${selected.id}`)}>Холбоотой даалгавар <ArrowRight size={16} /></button>{planApproval ? <button className="button button--primary" type="button" onClick={() => navigate(`/approvals?selected=${planApproval.id}`)}>Төлөвлөгөө review хийх <ChevronRight size={17} /></button> : null}</footer>
        </article>
        <article className="workbench-section execution-history">
          <header className="section-header"><div><h2>Хэрэгжилт ба түүх</h2><p>Зорилт, төлөвлөгөө, хяналтын аудитын мөр</p></div></header>
          <div className="timeline-list">
            <div><span data-tone="healthy"><Target size={17} /></span><div><strong>CEO сарын зорилт тогтоосон</strong><p>26.00 сая ₮ · 2026.08.01 09:10</p></div></div>
            <div><span data-tone="healthy"><CheckCircle2 size={17} /></span><div><strong>Менежер хүлээн авсан</strong><p>{selected.manager} · 2026.08.01 09:35</p></div></div>
            <div><span data-tone="attention"><FileCheck2 size={17} /></span><div><strong>Action plan шинэчилсэн</strong><p>4 activity · 1 owner missing</p></div></div>
            <div><span data-tone="neutral"><CalendarDays size={17} /></span><div><strong>Сарын review</strong><p>2026.08.31 · Scheduled</p></div></div>
          </div>
          <div className="hermes-inline"><TrendingUp size={20} /><div><strong>Hermes insight</strong><p>Outreach ба staffing action хоёр зорилтын variance-д хамгийн их нөлөөлөх магадлалтай.</p></div><button type="button" onClick={() => navigate('/hermes')}>Харах</button></div>
        </article>
      </section>

      <OverlayPanel open={targetOpen} onClose={() => setTargetOpen(false)} title={`${selected.name} · сарын зорилт`} description="CEO-level management manually sets the approved monthly target." variant="modal">
        <form id="target-form" className="form-stack" onSubmit={(event) => void submitTarget(event)}>
          <label><span>Сар</span><input value="2026 оны 8-р сар" disabled /></label>
          <label><span>Зорилт · сая ₮</span><input type="number" min="1" step="0.1" value={targetValue} onChange={(event) => setTargetValue(event.target.value)} required /></label>
          <div className="callout"><Target size={18} /><p>Зорилт өөрчлөгдвөл manager acknowledgement ба action plan version шинэчлэгдэнэ. Энэ prototype action audit event үүсгэнэ.</p></div>
        </form>
        <div className="modal-actions"><button className="button button--secondary" type="button" onClick={() => setTargetOpen(false)}>Болих</button><button className="button button--primary" type="submit" form="target-form">Зорилт хадгалах</button></div>
      </OverlayPanel>
    </div>
  )
}
