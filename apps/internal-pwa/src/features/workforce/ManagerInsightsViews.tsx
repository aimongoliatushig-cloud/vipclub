import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  CircleDollarSign,
  Clock3,
  DatabaseZap,
  Gem,
  HeartHandshake,
  History,
  LockKeyhole,
  MessageCircleMore,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserRoundSearch,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import type {
  ConsentChannel,
  CustomerActivityState,
  CustomerIntelligenceRecord,
  CustomerMembershipLevel,
  ManagerInsightsSnapshot,
} from './managerInsightsModels'
import type { TeamMember } from './models'
import { entertainerRankLabels, formatDate, formatDateTime, formatTime } from './localization'

const membershipLevelLabels: Record<CustomerMembershipLevel, string> = {
  provisional: 'Шинэ / түр',
  'level-1': '1-р түвшин',
  'level-2': '2-р түвшин',
  'level-3': '3-р түвшин',
  'level-4': '4-р түвшин',
  'level-5': '5-р түвшин',
}

const activityLabels: Record<CustomerActivityState, string> = {
  recent: 'Саяхан идэвхтэй',
  watch: 'Анхаарах',
  lapsed: 'Удаан ирээгүй',
}

const consentLabels: Record<ConsentChannel, string> = {
  viber: 'Viber',
  telegram: 'Telegram',
  email: 'И-мэйл',
}

function formatMoney(value: number): string {
  if (value >= 1_000_000) {
    const amount = value / 1_000_000
    const digits = amount >= 10 || Number.isInteger(amount) ? 0 : 1
    return `${amount.toLocaleString('mn-MN', { minimumFractionDigits: digits, maximumFractionDigits: digits })} сая ₮`
  }
  return `${Math.round(value / 1_000).toLocaleString('mn-MN')} мянга ₮`
}

function rollingAverage(customer: CustomerIntelligenceRecord): number {
  return Math.round(customer.monthlyEligibleSpend.reduce((sum, value) => sum + value, 0) / 3)
}

function CustomerScopeNotice({ branchName }: { branchName: string }) {
  return (
    <section className="insights-guardrail">
      <ShieldCheck size={19} />
      <div>
        <strong>{branchName} · нууцлалтай харилцагчийн харагдац</strong>
        <span>Зөвхөн салбарын үйлчилгээний шийдвэрт хэрэгтэй нэр, масклсан холбоо барих мэдээлэл, зочлолт, зарцуулалт, зөвшөөрөл болон энтертайнерын хамаарлыг харуулна. Иргэний үнэмлэх, бүтэн утас, хувийн тэмдэглэл, экспорт болон сурталчилгаа илгээх эрх энэ харагдацад байхгүй.</span>
      </div>
    </section>
  )
}

export function CustomerCrmView({ snapshot }: { snapshot: ManagerInsightsSnapshot }) {
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState<'all' | CustomerMembershipLevel>('all')
  const [activity, setActivity] = useState<'all' | CustomerActivityState>('all')
  const [selectedId, setSelectedId] = useState(snapshot.customers[0]?.id ?? '')
  const filtered = snapshot.customers.filter((customer) => {
    const query = search.trim().toLowerCase()
    return (level === 'all' || customer.membershipLevel === level)
      && (activity === 'all' || customer.activityState === activity)
      && (!query || customer.displayName.toLowerCase().includes(query) || customer.maskedPhone.includes(query))
  })
  const selected = filtered.find((customer) => customer.id === selectedId) ?? filtered[0]
  const recentCount = snapshot.customers.filter((customer) => customer.activityState === 'recent').length
  const consentedCount = snapshot.customers.filter((customer) => customer.consentedChannels.length > 0).length
  const totalVisits = snapshot.customers.reduce((sum, customer) => sum + customer.visits90d, 0)

  return (
    <>
      <section className="page-heading manager-view-heading">
        <div><span className="eyebrow">Харилцагчийн мэдээлэл</span><h1>Харилцагчийн удирдлага</h1><p>Төв салбарын зочлолт, зарцуулалт, зөвшөөрөл болон энтертайнерын хамаарлыг нэг дор шалгана.</p></div>
        <div className="freshness"><DatabaseZap size={15} /><span>Борлуулалтын баримт шинэчилсэн</span><strong>{formatTime(snapshot.refreshedAt)}</strong></div>
      </section>

      <CustomerScopeNotice branchName={snapshot.branchName} />

      <section className="insight-metrics" aria-label="Харилцагчийн хураангуй">
        <article><Users size={19} /><span>Харагдах харилцагч</span><strong>{snapshot.customers.length}</strong><small>Зөвхөн энэ салбар</small></article>
        <article><HeartHandshake size={19} /><span>Саяхан идэвхтэй</span><strong>{recentCount}</strong><small>Үйлчилгээний дохио</small></article>
        <article><CalendarClock size={19} /><span>90 хоногийн зочлолт</span><strong>{totalVisits}</strong><small>Баталгаажсан зочлолт</small></article>
        <article><MessageCircleMore size={19} /><span>Суваг зөвшөөрсөн</span><strong>{consentedCount}</strong><small>Илгээх эрх биш</small></article>
      </section>

      <section className="insight-filter-bar" aria-label="Харилцагчийн шүүлтүүр">
        <label className="search-field"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Харилцагч хайх" aria-label="Харилцагч хайх" /></label>
        <select value={level} onChange={(event) => setLevel(event.target.value as 'all' | CustomerMembershipLevel)} aria-label="Гишүүнчлэлийн түвшнээр шүүх">
          <option value="all">Бүх түвшин</option>
          {Object.entries(membershipLevelLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={activity} onChange={(event) => setActivity(event.target.value as 'all' | CustomerActivityState)} aria-label="Идэвхийн төлвөөр шүүх">
          <option value="all">Бүх идэвх</option>
          {Object.entries(activityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </section>

      {selected ? (
        <div className="crm-layout">
          <section className="workspace-panel crm-directory" aria-label="Харилцагчийн жагсаалт">
            <header className="card-header"><div><h2>Салбарын харилцагчид</h2><p>{filtered.length} масклсан бүртгэл харагдаж байна</p></div><UserRoundSearch size={20} /></header>
            <div>
              {filtered.map((customer) => (
                <button key={customer.id} className={selected.id === customer.id ? 'selected' : ''} type="button" onClick={() => setSelectedId(customer.id)}>
                  <span className="avatar avatar--member">{customer.displayName.slice(0, 2)}</span>
                  <span><strong>{customer.displayName}</strong><small>{customer.maskedPhone} · {formatDate(customer.lastVisitAt, { month: 'short', day: 'numeric' })}</small></span>
                  <b data-level={customer.membershipLevel}>{membershipLevelLabels[customer.membershipLevel]}</b>
                </button>
              ))}
            </div>
          </section>

          <section className="workspace-panel crm-detail" aria-label={`${selected.displayName} харилцагчийн мэдээлэл`}>
            <header className="crm-detail-header">
              <div><span className="avatar avatar--large">{selected.displayName.slice(0, 2)}</span><span><h2>{selected.displayName}</h2><p>{selected.maskedPhone} · {activityLabels[selected.activityState]}</p></span></div>
              <span className="membership-badge" data-level={selected.membershipLevel}><Gem size={15} />{membershipLevelLabels[selected.membershipLevel]}</span>
            </header>

            <div className="crm-facts">
              <article><span>90 хоногийн зочлолт</span><strong>{selected.visits90d}</strong></article>
              <article><span>Дундаж зарцуулалт</span><strong>{formatMoney(selected.averageSpend)}</strong></article>
              <article><span>Зарцуулалтын хүрээ</span><strong>{formatMoney(selected.minimumSpend)} – {formatMoney(selected.maximumSpend)}</strong></article>
              <article><span>Нийт баталгаажсан үнэ цэнэ</span><strong>{formatMoney(selected.lifetimeValue)}</strong></article>
            </div>

            <div className="crm-detail-grid">
              <section>
                <h3>Зочлох хэв маяг</h3>
                <div className="detail-note"><Clock3 size={16} /><span><strong>{selected.preferredVisitWindow}</strong><small>Баталгаажсан зочлолтын хандлага</small></span></div>
                <h3>Энтертайнерын хамаарал</h3>
                <div className="affinity-list">
                  {selected.affinities.length ? selected.affinities.map((affinity) => <article key={affinity.teamMemberId}><span><strong>{affinity.entertainerName}</strong><small>{affinity.reservationCount} захиалгатай</small></span><b>{affinity.sharePercent}%</b></article>) : <p>Хангалттай баталгаажсан хамаарал алга.</p>}
                </div>
              </section>
              <section>
                <h3>Холбоо барих зөвшөөрөл</h3>
                <div className="consent-list">
                  {(['viber', 'telegram', 'email'] as ConsentChannel[]).map((channel) => <span key={channel} data-consented={selected.consentedChannels.includes(channel)}>{selected.consentedChannels.includes(channel) ? <BadgeCheck size={14} /> : <LockKeyhole size={14} />}{consentLabels[channel]}</span>)}
                </div>
                <h3>Үнэнч байдлын баримт</h3>
                <dl className="loyalty-facts"><div><dt>Ашигласан эрх</dt><dd>{selected.benefitUses90d}</dd></div><div><dt>Буцаан олголтын үлдэгдэл</dt><dd>{formatMoney(selected.cashbackBalance)}</dd></div></dl>
              </section>
            </div>

            <section className="recent-visits">
              <header><h3>Сүүлийн баталгаажсан зочлолтууд</h3><span>{selected.sourceState === 'reconciled' ? 'Тулгалттай' : 'Шинэчлэлт хоцорсон'}</span></header>
              <div role="table" aria-label="Сүүлийн зочлолтын баримт">
                {selected.recentVisits.map((visit) => <div role="row" key={visit.id}><time role="cell">{formatDate(visit.date, { month: 'short', day: 'numeric' })}</time><span role="cell">{visit.entertainerName ?? 'Хамааралгүй'}</span><strong role="cell">{formatMoney(visit.eligibleSpend)}</strong></div>)}
              </div>
            </section>

            <div className="policy-lock"><LockKeyhole size={17} /><span><strong>Түвшний тооцоолол, нэр, босго батлагдаагүй</strong><small>Энэ нь эх системд байгаа түвшнийг л харуулна. CL-040–CL-044 шийдэгдтэл менежер түвшин тооцох, өөрчлөх эсвэл босго засах боломжгүй.</small></span></div>
          </section>
        </div>
      ) : <section className="workspace-empty"><UserRoundSearch size={28} /><strong>Тохирох харилцагч олдсонгүй</strong><span>Хайлт болон шүүлтүүрээ өөрчилнө үү.</span></section>}
    </>
  )
}

type RankingTab = 'team' | 'customers'

export function ManagerRankingsView({ snapshot, teamMembers }: { snapshot: ManagerInsightsSnapshot; teamMembers: TeamMember[] }) {
  const [tab, setTab] = useState<RankingTab>('team')
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState(snapshot.entertainerRankings[0]?.teamMemberId ?? '')
  const [selectedCustomerId, setSelectedCustomerId] = useState(snapshot.customers[0]?.id ?? '')
  const memberById = useMemo(() => new Map(teamMembers.map((member) => [member.id, member])), [teamMembers])
  const selectedRanking = snapshot.entertainerRankings.find((ranking) => ranking.teamMemberId === selectedTeamMemberId) ?? snapshot.entertainerRankings[0]
  const selectedCustomer = snapshot.customers.find((customer) => customer.id === selectedCustomerId) ?? snapshot.customers[0]

  return (
    <>
      <section className="page-heading manager-view-heading">
        <div><span className="eyebrow">Тайлбарлагдах баримт</span><h1>Зэрэглэлийн хяналт</h1><p>Багийн одоогийн зэрэглэл болон харилцагчийн гишүүнчлэлийн түвшнийг эх баримтаас шалгана.</p></div>
        <div className="freshness"><History size={15} /><span>Баримт шинэчилсэн</span><strong>{formatTime(snapshot.refreshedAt)}</strong></div>
      </section>

      <section className="ranking-policy-notice"><AlertTriangle size={19} /><div><strong>Зэрэглэл харагдана, шийдвэр автоматжихгүй</strong><span>Энтертайнерын дөрвөн зэрэглэл CL-017, харилцагчийн таван түвшин CL-040–CL-044 дээр Гүйцэтгэх захирал/Ерөнхий менежерийн баталгаажуулалт хүлээж байна. Оноо, босго, дэвшүүлэх/бууруулах болон гар өөрчлөлт үүсгэхгүй.</span></div></section>

      <div className="segmented-control ranking-tabs" role="tablist" aria-label="Зэрэглэлийн төрөл">
        <button role="tab" aria-selected={tab === 'team'} className={tab === 'team' ? 'active' : ''} type="button" onClick={() => setTab('team')}><Sparkles size={15} />Багийн зэрэглэл</button>
        <button role="tab" aria-selected={tab === 'customers'} className={tab === 'customers' ? 'active' : ''} type="button" onClick={() => setTab('customers')}><Gem size={15} />Харилцагчийн түвшин</button>
      </div>

      {tab === 'team' && selectedRanking ? (
        <div className="ranking-layout">
          <section className="workspace-panel ranking-list" aria-label="Энтертайнерын зэрэглэлийн жагсаалт">
            <header className="card-header"><div><h2>Энтертайнер баг</h2><p>Одоогийн профайлын зэрэглэл</p></div><Users size={20} /></header>
            <div>{snapshot.entertainerRankings.map((ranking) => {
              const member = memberById.get(ranking.teamMemberId)
              return <button key={ranking.teamMemberId} className={selectedRanking.teamMemberId === ranking.teamMemberId ? 'selected' : ''} type="button" onClick={() => setSelectedTeamMemberId(ranking.teamMemberId)}><span className="avatar avatar--member">{member?.initials}</span><span><strong>{member?.name}</strong><small>{ranking.dataQuality === 'complete' ? 'Баримт бүрэн' : 'Баримт дутуу'}</small></span><b data-rank={ranking.currentRank}>{entertainerRankLabels[ranking.currentRank]}</b></button>
            })}</div>
          </section>

          <section className="workspace-panel ranking-detail" aria-label="Энтертайнерын зэрэглэлийн баримт">
            <header className="ranking-detail-header"><div><span className="avatar avatar--large">{memberById.get(selectedRanking.teamMemberId)?.initials}</span><span><h2>{memberById.get(selectedRanking.teamMemberId)?.name}</h2><p>{selectedRanking.rankSource} · {formatDate(selectedRanking.rankEffectiveFrom)}-с</p></span></div><span className="rank-badge" data-rank={selectedRanking.currentRank}><Sparkles size={15} />{entertainerRankLabels[selectedRanking.currentRank]}</span></header>
            <div className="ranking-evidence-grid">
              <article><span>Ирц</span><strong>{selectedRanking.attendancePercent}%</strong><small>Баталгаажсан ирц</small></article>
              <article data-tone={selectedRanking.unresolvedNoShows ? 'warning' : 'healthy'}><span>Шийдэгдээгүй ирээгүй тохиолдол</span><strong>{selectedRanking.unresolvedNoShows}</strong><small>Хатуу шалгуур батлагдаагүй</small></article>
              <article><span>Захиалга</span><strong>{selectedRanking.verifiedReservations}</strong><small>Баталгаажсан</small></article>
              <article><span>Давтан харилцагч</span><strong>{selectedRanking.repeatCustomers}</strong><small>Хамаарлын баримт</small></article>
              <article data-tone={selectedRanking.salesTrendPercent < 0 ? 'warning' : 'healthy'}><span>Борлуулалтын хандлага</span><strong>{selectedRanking.salesTrendPercent > 0 ? '+' : ''}{selectedRanking.salesTrendPercent}%</strong><small>{selectedRanking.salesTrendPercent < 0 ? <TrendingDown size={13} /> : <TrendingUp size={13} />} Баталгаажсан эх үүсвэр</small></article>
              <article><span>Сургалт</span><strong>{selectedRanking.trainingCompleted}</strong><small>Дууссан сургалт</small></article>
              <article data-tone={selectedRanking.openComplaints ? 'warning' : 'healthy'}><span>Нээлттэй гомдол</span><strong>{selectedRanking.openComplaints}</strong><small>Шийдвэрийн баримт</small></article>
              <article><span>Түүхийн хэмжээ</span><strong>{selectedRanking.verifiedHistoryMonths} сар</strong><small>{selectedRanking.dataQuality === 'complete' ? 'Баримт бүрэн' : 'Баримт дутуу'}</small></article>
            </div>
            <div className="policy-lock"><LockKeyhole size={17} /><span><strong>Зэрэглэл өөрчлөх эрх түгжигдсэн</strong><small>Одоогийн зэрэглэлийг харуулж байгаа боловч жин, босго, хүлээлгийн хугацаа, хатуу шалгуур болон гар өөрчлөлтийн эрх батлагдаагүй. Эндээс зэрэглэл өөрчлөх үйлдэл хийхгүй.</small></span></div>
          </section>
        </div>
      ) : null}

      {tab === 'customers' && selectedCustomer ? (
        <div className="ranking-layout">
          <section className="workspace-panel ranking-list" aria-label="Харилцагчийн түвшний жагсаалт">
            <header className="card-header"><div><h2>Харилцагчийн түвшин</h2><p>Масклсан, салбарын хүрээтэй</p></div><Gem size={20} /></header>
            <div>{snapshot.customers.map((customer) => <button key={customer.id} className={selectedCustomer.id === customer.id ? 'selected' : ''} type="button" onClick={() => setSelectedCustomerId(customer.id)}><span className="avatar avatar--member">{customer.displayName.slice(0, 2)}</span><span><strong>{customer.displayName}</strong><small>{customer.maskedPhone} · {customer.visits90d} зочлолт</small></span><b data-level={customer.membershipLevel}>{membershipLevelLabels[customer.membershipLevel]}</b></button>)}</div>
          </section>

          <section className="workspace-panel ranking-detail" aria-label="Харилцагчийн түвшний баримт">
            <header className="ranking-detail-header"><div><span className="avatar avatar--large">{selectedCustomer.displayName.slice(0, 2)}</span><span><h2>{selectedCustomer.displayName}</h2><p>{selectedCustomer.levelSource}</p></span></div><span className="membership-badge" data-level={selectedCustomer.membershipLevel}><Gem size={15} />{membershipLevelLabels[selectedCustomer.membershipLevel]}</span></header>
            <div className="membership-evidence">
              <header><div><CircleDollarSign size={20} /><span><strong>Санал болгосон 3 сарын тайлбар</strong><small>Түвшин тогтоохгүй, зөвхөн эх зарцуулалтыг тайлбарлана</small></span></div><b>{formatMoney(rollingAverage(selectedCustomer))}</b></header>
              <div>{selectedCustomer.monthlyEligibleSpend.map((amount, index) => <article key={index}><span>{index === 0 ? '2 сарын өмнө' : index === 1 ? 'Өмнөх сар' : 'Одоогийн сар'}</span><strong>{formatMoney(amount)}</strong></article>)}</div>
            </div>
            <div className="customer-rank-facts"><article><span>Гишүүн болсон</span><strong>{formatDate(selectedCustomer.memberSince)}</strong></article><article><span>Сүүлийн зочлолт</span><strong>{formatDateTime(selectedCustomer.lastVisitAt)}</strong></article><article><span>90 хоногийн зочлолт</span><strong>{selectedCustomer.visits90d}</strong></article><article><span>Нийт үнэ цэнэ</span><strong>{formatMoney(selectedCustomer.lifetimeValue)}</strong></article></div>
            <div className="policy-lock"><LockKeyhole size={17} /><span><strong>Гишүүнчлэлийн түвшин автоматаар өөрчлөгдөхгүй</strong><small>3 сарын дундажийн мөчлөг нь санал төдий. Түвшний нэр, тооцох зарцуулалт, босго, салбар хоорондын дүрэм, бууруулах хүлээлгийн хугацаа болон эрхүүд батлагдсаны дараа л бодлогын хувилбараар тооцоолно.</small></span></div>
          </section>
        </div>
      ) : null}
    </>
  )
}
