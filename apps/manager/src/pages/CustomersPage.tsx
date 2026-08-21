import { ArrowRight, CalendarClock, ChevronRight, CircleAlert, MessageCircle, Search, ShieldCheck, TrendingDown, UserRoundCheck } from 'lucide-react'
import { useMemo, useState, type CSSProperties } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { DataMeta } from '../components/ui/DataMeta'
import { OverlayPanel } from '../components/ui/OverlayPanel'
import { PageHeader } from '../components/ui/PageHeader'
import { Sparkline } from '../components/ui/Sparkline'
import { StatusMark } from '../components/ui/StatusMark'
import { ExecutiveCrmRankingPanel } from '../features/executive/ExecutiveHandoffPanels'
import { membershipLevels } from '../data/fixtures'
import type { Customer, MembershipLevel } from '../domain/types'
import { useApp } from '../state/useApp'
import { formatMoney, formatPercent } from '../utils/format'

const levelColor: Record<MembershipLevel, string> = {
  Bronze: '#9A6A3A',
  Silver: '#7D8792',
  Gold: '#4F46E5',
  Diamond: '#476B81',
  'Black Diamond': '#18212B',
}

function CustomerDetail({ customer, onClose }: { customer: Customer; onClose(): void }) {
  const navigate = useNavigate()
  const { branches, approvals } = useApp()
  const branch = branches.find((item) => item.id === customer.branchId)
  const approval = approvals.find((item) => item.type === 'membership' && item.subject.startsWith(customer.name))
  return (
    <OverlayPanel open title={customer.name} description={`${branch?.name} · ${customer.maskedPhone}`} onClose={onClose} wide>
      <div className="customer-detail__summary">
        <div className="customer-avatar">{customer.name.slice(0, 1)}</div>
        <div><span>Одоогийн түвшин</span><strong style={{ color: levelColor[customer.level] }}>{customer.level}</strong><small>Policy: {customer.meta.policyVersion}</small></div>
        <div><span>Тооцсон түвшин</span><strong style={{ color: levelColor[customer.calculatedLevel] }}>{customer.calculatedLevel}</strong><small>{customer.retainedException ? 'Retained-level exception' : 'System proposal'}</small></div>
        <div><span>Дундаж зарцуулалт</span><strong>{formatMoney(customer.averageSpend)}</strong><small>{customer.completedVisits} completed eligible visit</small></div>
      </div>
      <section className="detail-section"><header><h3>Айлчлал ба зан төлөв</h3><DataMeta meta={customer.meta} /></header><div className="customer-evidence-grid"><div><span>Сүүлийн айлчлал</span><strong>{customer.lastVisit}</strong></div><div><span>Айлчлалын тренд</span><strong data-tone={customer.visitTrend >= 0 ? 'healthy' : 'critical'}>{formatPercent(customer.visitTrend)}</strong></div><div><span>Preferred entertainer</span><strong>{customer.preferredEntertainer}</strong></div><div><span>Consent state</span><strong>Outreach зөвшөөрсөн</strong></div></div></section>
      <section className="detail-section"><header><h3>Гишүүнчлэлийн review</h3><StatusMark tone={customer.proposedLevel ? 'attention' : 'healthy'} label={customer.proposedLevel ? 'Review required' : 'Өөрчлөлтгүй'} /></header><div className="definition-list"><div><span>Manager decision</span><strong>{customer.managerDecision}</strong></div><div><span>Manager comment</span><strong>{customer.managerComment ?? '—'}</strong></div><div><span>Open rule</span><strong>Eligible-spend exclusions · multi-branch classification</strong></div></div></section>
      <div className="callout callout--warning"><CircleAlert size={18} /><p>Bronze → Black Diamond range нь салбар бүрийн effective-dated policy. Prototype values нь demo; refund/discount/multi-branch treatment нээлттэй.</p></div>
      <div className="modal-actions"><button className="button button--secondary" type="button" onClick={() => navigate(`/messages?branch=${customer.branchId}`)}><MessageCircle size={17} />Менежерт бичих</button>{approval ? <button className="button button--primary" type="button" onClick={() => navigate(`/approvals?selected=${approval.id}`)}>CEO review <ArrowRight size={17} /></button> : null}</div>
    </OverlayPanel>
  )
}

export default function CustomersPage() {
  const navigate = useNavigate()
  const { customerId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { customers, branches } = useApp()
  const [query, setQuery] = useState('')
  const cohort = searchParams.get('cohort') ?? 'all'
  const selected = customers.find((item) => item.id === customerId)

  const filtered = useMemo(() => customers.filter((customer) => {
    const matchesQuery = `${customer.name} ${customer.maskedPhone} ${customer.level}`.toLowerCase().includes(query.toLowerCase())
    const matchesCohort = cohort === 'all' || (cohort === 'declining' && customer.visitTrend < 0) || (cohort === 'high-value' && ['Gold', 'Diamond', 'Black Diamond'].includes(customer.level)) || (cohort === 'review' && Boolean(customer.proposedLevel))
    return matchesQuery && matchesCohort
  }), [customers, query, cohort])

  const distribution = membershipLevels.map((level) => ({ level, count: customers.filter((item) => item.level === level).length }))
  const declining = customers.filter((item) => item.visitTrend < 0).length
  const reviewRequired = customers.filter((item) => item.proposedLevel).length

  return (
    <div className="page customer-page">
      <PageHeader title="Харилцагчийн мэдээлэл" description="Компанийн харилцагчийн мэдээлэл, таван түвшний гишүүнчлэл, идэвхийн бууралт ба харилцах ажиллагааны хяналт." meta={<DataMeta meta={customers[0].meta} detailed />} actions={<button className="button button--primary" type="button" onClick={() => setSearchParams({ cohort: 'declining' })}><TrendingDown size={17} />Идэвх буурсан бүлэг</button>} />
      <section className="metric-strip metric-strip--compact">
        <article><span>Нийт харилцагч</span><strong>12,486</strong><small>4 салбар · +6.4%</small></article>
        <article><span>Давтан айлчлал</span><strong data-tone="healthy">48%</strong><small>Өмнөх сараас +3 пункт</small></article>
        <article><span>Дундаж зарцуулалт</span><strong>{formatMoney(0.86)}</strong><small>Эрх бүхий дууссан айлчлал</small></article>
        <article><span>Гишүүнчлэл хянах</span><strong data-tone="attention">{reviewRequired}</strong><small>CEO шийдвэр шаардлагатай</small></article>
        <article><span>Үнэ цэнтэй харилцагч буурсан</span><strong data-tone="critical">{declining}</strong><small>30 хоногийн эрсдэлийн бүлэг</small></article>
      </section>
      <ExecutiveCrmRankingPanel />
      <section className="customer-intelligence-grid">
        <article className="workbench-section membership-distribution"><header className="section-header"><div><h2>Гишүүнчлэлийн тархалт</h2><p>Bronze → Black Diamond · компанийн хүрээ</p></div><ShieldCheck size={19} /></header><div className="membership-bars">{distribution.map(({ level, count }, index) => <div key={level}><span>{level}</span><div><i style={{ width: `${22 + index * 13}%`, background: levelColor[level] }} /></div><strong>{[47, 28, 15, 7, 3][index]}%</strong><small>{count || index + 1} туршилтын бүртгэл</small></div>)}</div></article>
        <article className="workbench-section cohort-highlight"><header><div><TrendingDown size={20} /><span>Үнэ цэнтэй, идэвх буурсан бүлэг</span></div><strong>15</strong></header><p>Өмнө идэвхтэй Gold+ харилцагч 30 хоног эргэж ирээгүй.</p><Sparkline values={[26, 24, 23, 21, 19, 18, 15]} tone="danger" width={280} height={64} label="Үнэ цэнтэй харилцагчийн хандлага" /><dl><div><dt>Queen Club</dt><dd data-tone="critical">8</dd></div><div><dt>Empire Lounge</dt><dd>2</dd></div><div><dt>Platinum</dt><dd>3</dd></div><div><dt>Gobi Lounge</dt><dd>2</dd></div></dl><button className="text-button" type="button" onClick={() => setSearchParams({ cohort: 'declining' })}>Бүлгийг харах <ChevronRight size={16} /></button></article>
        <article className="workbench-section outreach-oversight"><header className="section-header"><div><h2>Харилцагчтай харилцах хяналт</h2><p>Зөвшөөрөлд нийцсэн кампанит ажлын төлөв</p></div><UserRoundCheck size={19} /></header><div className="outreach-row"><span><strong>Gold харилцагчийг эргэн идэвхжүүлэх</strong><small>Queen Club · 15 хүн</small></span><StatusMark tone="attention" label="Менежерийн ноорог" /></div><div className="outreach-row"><span><strong>Diamond ойн мэндчилгээ</strong><small>Бүх салбар · 28 хүн</small></span><StatusMark tone="healthy" label="Илгээсэн · 82% хүрсэн" /></div><div className="outreach-row"><span><strong>30 хоног айлчлаагүй</strong><small>Зөвшөөрөлтэй · 41 хүн</small></span><StatusMark tone="neutral" label="Зөвшөөрөл хүлээж байна" /></div></article>
      </section>
      <section className="workbench-section customer-table-section">
        <header className="section-header"><div><h2>Харилцагч 360 жагсаалт</h2><p>Зөвшөөрөгдсөн талбарууд · {filtered.length} туршилтын бүртгэл</p></div><label className="search-field"><Search size={17} /><input aria-label="Харилцагчийг нэр эсвэл түвшнээр хайх" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Нэр, түвшин хайх" /></label></header>
        <div className="filter-tabs" role="tablist">{[['all','Бүгд'],['high-value','Өндөр үнэ цэнтэй'],['declining','Буурч буй'],['review','Хянах шаардлагатай']].map(([value,label]) => <button key={value} type="button" role="tab" aria-selected={cohort === value} onClick={() => setSearchParams(value === 'all' ? {} : { cohort: value })}>{label}</button>)}</div>
        <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Харилцагч</th><th>Салбар</th><th>Одоогийн түвшин</th><th>Тооцсон түвшин</th><th>Дундаж</th><th>Айлчлал</th><th>30 хоног</th><th>Сүүлийн айлчлал</th><th /></tr></thead><tbody>{filtered.map((customer) => { const branch = branches.find((item) => item.id === customer.branchId); return <tr key={customer.id}><td><button className="person-cell" type="button" onClick={() => navigate(`/customers/${customer.id}${cohort !== 'all' ? `?cohort=${cohort}` : ''}`)}><span>{customer.name.slice(0,1)}</span><span><strong>{customer.name}</strong><small>{customer.maskedPhone}</small></span></button></td><td>{branch?.name}</td><td><span className="membership-level" style={{ '--level-color': levelColor[customer.level] } as CSSProperties}>{customer.level}</span></td><td><span className="membership-level" style={{ '--level-color': levelColor[customer.calculatedLevel] } as CSSProperties}>{customer.calculatedLevel}</span></td><td>{formatMoney(customer.averageSpend)}</td><td>{customer.completedVisits}</td><td><strong data-tone={customer.visitTrend >= 0 ? 'healthy' : 'critical'}>{formatPercent(customer.visitTrend)}</strong></td><td><CalendarClock size={15} /> {customer.lastVisit}</td><td><button className="icon-button" type="button" onClick={() => navigate(`/customers/${customer.id}`)} aria-label={`${customer.name} дэлгэрэнгүй`}><ChevronRight size={18} /></button></td></tr> })}</tbody></table></div>
      </section>
      {selected ? <CustomerDetail customer={selected} onClose={() => navigate(`/customers${cohort !== 'all' ? `?cohort=${cohort}` : ''}`)} /> : null}
    </div>
  )
}
