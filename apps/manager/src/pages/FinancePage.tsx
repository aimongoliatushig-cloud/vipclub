import { ArrowRight, Banknote, ChevronRight, CircleAlert, Landmark, RefreshCw, ShieldCheck, WalletCards } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { DataMeta } from '../components/ui/DataMeta'
import { OverlayPanel } from '../components/ui/OverlayPanel'
import { PageHeader } from '../components/ui/PageHeader'
import { StatusMark } from '../components/ui/StatusMark'
import type { SettlementBatch } from '../domain/types'
import { useApp } from '../state/useApp'
import { formatMoney, settlementStatusLabel } from '../utils/format'

const statusTone = (status: SettlementBatch['status']) => status === 'paid' || status === 'approved' ? 'healthy' : status === 'partial-failure' ? 'critical' : 'attention'

export default function FinancePage() {
  const navigate = useNavigate()
  const { batchId } = useParams()
  const { settlements, approvals, branches } = useApp()
  const [selected, setSelected] = useState<SettlementBatch | null>(null)
  const pendingApproval = approvals.find((item) => item.type === 'settlement' && item.status === 'pending')
  const current = settlements[0]
  const net = current.lines.reduce((sum, line) => sum + line.amount, 0)

  useEffect(() => {
    if (!batchId) return
    setSelected(settlements.find((batch) => batch.id === batchId) ?? null)
  }, [batchId, settlements])
  return (
    <div className="page finance-page">
      <PageHeader title="Санхүү ба тооцоо" description="3 өдрийн entertainer settlement · Accountant review → CEO approval → bank status." meta={<DataMeta meta={current.meta} detailed />} actions={pendingApproval ? <button className="button button--primary" type="button" onClick={() => navigate(`/approvals?selected=${pendingApproval.id}`)}><ShieldCheck size={17} />Тооцооны багц review</button> : undefined} />
      <section className="metric-strip metric-strip--compact">
        <article><span>CEO approval required</span><strong data-tone="critical">{pendingApproval ? 1 : 0}</strong><small>{current.period}</small></article>
        <article><span>Цэвэр олголт</span><strong>{formatMoney(pendingApproval?.amount ?? net)}</strong><small>{current.entertainerCount} entertainer</small></article>
        <article><span>Онцгой тохиолдол</span><strong data-tone="critical">{current.exceptionCount}</strong><small>Source calculation review</small></article>
        <article><span>Processing</span><strong data-tone="attention">0</strong><small>Bank integration pending</small></article>
        <article><span>Partial failure</span><strong data-tone="critical">1</strong><small>Өмнөх багц · retry control</small></article>
      </section>
      <section className="finance-workbench">
        <article className="workbench-section settlement-batches">
          <header className="section-header"><div><h2>Settlement batch</h2><p>Төлөв ба reconciliation history</p></div><button className="button button--secondary" type="button"><RefreshCw size={16} />Шинэчлэх</button></header>
          <div className="settlement-batch-list">{settlements.map((batch) => <button key={batch.id} type="button" className="settlement-batch-row" onClick={() => setSelected(batch)}><span className="settlement-batch-row__icon"><WalletCards size={20} /></span><span><strong>{batch.period}</strong><small>{batch.accountant} · {batch.reviewedAt.slice(0,10)}</small></span><span><small>Энтертайнер</small><strong>{batch.entertainerCount}</strong></span><span><small>Онцгой</small><strong data-tone={batch.exceptionCount ? 'critical' : 'healthy'}>{batch.exceptionCount}</strong></span><span><small>Цэвэр дүн</small><strong>{formatMoney(batch.lines.reduce((sum, line) => sum + line.amount, 0))}</strong></span><StatusMark tone={statusTone(batch.status)} label={settlementStatusLabel[batch.status]} /><ChevronRight size={18} /></button>)}</div>
        </article>
        <aside className="workbench-section payment-status">
          <header className="section-header"><div><h2>Payment status</h2><p>Corporate bank integration state</p></div><Landmark size={19} /></header>
          <div className="integration-pending"><Banknote size={28} /><strong>Integration pending</strong><p>UI-first phase-д бодит банкны үйлдэл хийгдэхгүй. Approved, Submitted, Processing, Paid, Partial Failure state-ийг mock-оор туршина.</p></div>
          <div className="definition-list"><div><span>Idempotency</span><strong>Required</strong></div><div><span>Duplicate prevention</span><strong>Required</strong></div><div><span>Bank data</span><strong>Masked / restricted</strong></div><div><span>Hermes authority</span><strong>Summarize only</strong></div></div>
        </aside>
      </section>
      <section className="workbench-section branch-settlement-table">
        <header className="section-header"><div><h2>Салбараар</h2><p>Current batch · drill-down Branch → Entertainer → Source calculation</p></div></header>
        <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Салбар</th><th>Энтертайнер</th><th>Service income</th><th>Tips</th><th>Commission</th><th>Deduction</th><th>Цэвэр дүн</th><th>Exception</th><th /></tr></thead><tbody>{branches.map((branch, index) => { const share = [18.72, 22.45, 16.84, 14.47][index]; return <tr key={branch.id}><td><strong>{branch.name}</strong><small>{branch.location}</small></td><td>{[24,27,21,24][index]}</td><td>{formatMoney(share * 1.32)}</td><td>{formatMoney(share * .24)}</td><td>{formatMoney(share * .08)}</td><td><strong data-tone="critical">−{formatMoney(share * .18)}</strong></td><td><strong>{formatMoney(share)}</strong></td><td><strong data-tone={index === 0 ? 'critical' : 'healthy'}>{index === 0 ? 2 : 0}</strong></td><td><button className="icon-button" type="button" onClick={() => setSelected(current)} aria-label={`${branch.name} тооцоо дэлгэрэнгүй`}><ChevronRight size={18} /></button></td></tr> })}</tbody></table></div>
      </section>
      {selected ? <OverlayPanel open title="Тооцооны багц" description={selected.period} onClose={() => setSelected(null)} wide><div className="settlement-detail__summary"><div><span>Төлөв</span><StatusMark tone={statusTone(selected.status)} label={settlementStatusLabel[selected.status]} /></div><div><span>Нягтлан</span><strong>{selected.accountant}</strong></div><div><span>Энтертайнер</span><strong>{selected.entertainerCount}</strong></div><div><span>Онцгой</span><strong data-tone={selected.exceptionCount ? 'critical' : 'healthy'}>{selected.exceptionCount}</strong></div></div><section className="detail-section"><header><h3>Calculation lines</h3><DataMeta meta={selected.meta} /></header><div className="settlement-lines">{selected.lines.map((line) => <div key={line.label}><span>{line.label}</span><strong data-tone={line.amount < 0 ? 'critical' : 'healthy'}>{formatMoney(line.amount)}</strong></div>)}<div className="settlement-lines__total"><span>Цэвэр дүн</span><strong>{formatMoney(selected.lines.reduce((sum,line) => sum + line.amount,0))}</strong></div></div></section>{selected.entertainers.length ? <section className="detail-section"><header><h3>Entertainer drill-down</h3></header><div className="compact-list">{selected.entertainers.map((person) => <button key={person.id} type="button"><span><strong>{person.name}</strong><small>{person.rank} · {branches.find((item) => item.id === person.branchId)?.name}</small></span><span><strong>{formatMoney(person.net)}</strong><small data-tone={person.exceptions ? 'critical' : 'healthy'}>{person.exceptions} exception</small></span><ChevronRight size={17} /></button>)}</div></section> : null}<div className="callout callout--warning"><CircleAlert size={18} /><p>Performance-tip statutory treatment production automation-аас өмнө accounting/legal confirmation шаардлагатай.</p></div><div className="modal-actions">{selected.id === current.id && pendingApproval ? <button className="button button--primary" type="button" onClick={() => navigate(`/approvals?selected=${pendingApproval.id}`)}>CEO approval руу <ArrowRight size={17} /></button> : null}</div></OverlayPanel> : null}
    </div>
  )
}
