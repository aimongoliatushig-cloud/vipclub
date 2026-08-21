import { useState } from 'react'
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  HandCoins,
  MapPin,
  Medal,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
  WalletCards,
} from 'lucide-react'
import { entertainer, payoutRows, rankRequirements, reservations, shift } from '../../data/mock'
import type { Screen } from '../../types'

export function ScreenHeader({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack?: () => void }) {
  return (
    <header className="screen-header">
      {onBack ? <button className="back-button" type="button" onClick={onBack} aria-label="Буцах"><ArrowLeft size={20} /></button> : null}
      <div><h1>{title}</h1>{subtitle ? <p>{subtitle}</p> : null}</div>
    </header>
  )
}

export function ScheduleScreen() {
  const days = ['Дав', 'Мяг', 'Лха', 'Пүр', 'Баа', 'Бям', 'Ням']
  return (
    <div className="screen sub-screen">
      <ScreenHeader title="Миний хуваарь" subtitle="8 сарын 1–7" />
      <div className="week-strip">
        {days.map((day, index) => <button key={day} className={index === 6 ? 'active' : ''} type="button"><span>{day}</span><b>{index + 1}</b></button>)}
      </div>
      <section className="schedule-card">
        <div className="schedule-date"><span>02</span><small>VIII · НЯМ</small></div>
        <div className="schedule-detail">
          <span className="status-label">Өнөөдөр</span>
          <h2>{shift.start}–{shift.end}</h2>
          <p><MapPin size={15} /> {shift.location}</p>
        </div>
      </section>
      <section className="simple-panel">
        <h2>Энэ долоо хоног</h2>
        <div className="stat-rail"><span>Нийт ээлж</span><strong>5</strong></div>
        <div className="stat-rail"><span>Ажиллах цаг</span><strong>45 цаг</strong></div>
        <div className="stat-rail"><span>Амралтын өдөр</span><strong>2 өдөр</strong></div>
      </section>
    </div>
  )
}

export function IncomeScreen() {
  return (
    <div className="screen sub-screen">
      <ScreenHeader title="Миний орлого" subtitle="Энэ 3 хоногийн шинэчлэгдсэн тооцоо" />
      <section className="money-hero">
        <span>Тооцоолсон цэвэр орлого</span>
        <strong>580,000₮</strong>
        <p>8 сарын 1–3 · Маргааш 06:00-д хаагдана</p>
        <div className="money-breakdown"><span>Нийт орлого <b>580,000₮</b></span><span>Зээлийн суутгал <b>0₮</b></span></div>
      </section>
      <div className="section-heading standalone"><div><span>Өмнөх тооцоонууд</span><small>3 хоног тутам</small></div></div>
      <div className="list-panel">
        {payoutRows.map((row) => (
          <button className="payout-history-row" type="button" key={row.period}>
            <span className="list-icon"><WalletCards size={20} /></span>
            <span><strong>{row.period}</strong><small>{row.status}</small></span>
            <b>{row.net}</b><ChevronRight size={17} />
          </button>
        ))}
      </div>
      <section className="average-panel"><span>Сүүлийн 3 сарын eligible орлогын дундаж</span><strong>4,700,000₮</strong><small>Зээлийн боломжийг энэ дүнгээс тооцно</small></section>
    </div>
  )
}

export function RankingScreen() {
  return (
    <div className="screen sub-screen">
      <ScreenHeader title="Миний зэрэглэл" subtitle="Оноо таны бүртгэгдсэн ажлаас үүснэ" />
      <section className="rank-hero">
        <span className="rank-medal silver large" />
        <div><span>Одоогийн зэрэглэл</span><strong>Silver</strong><small>Gold хүртэл {100 - entertainer.progress}% үлдсэн</small></div>
        <b>{entertainer.progress}%</b>
      </section>
      <div className="progress-track large"><span style={{ width: `${entertainer.progress}%` }} /></div>
      <section className="simple-panel requirement-list">
        <h2>Gold зэрэглэлийн шаардлага</h2>
        {rankRequirements.map((item) => (
          <div className="requirement-item" key={item.label}>
            <div><strong>{item.label}</strong><span>{item.value}</span></div>
            <div className="mini-progress"><span style={{ width: `${item.progress}%` }} /></div>
          </div>
        ))}
      </section>
      <div className="gate-clear large"><ShieldCheck size={18} /> Идэвхтэй no-show хориг байхгүй</div>
      <section className="simple-panel"><h2>Сүүлийн оноо</h2><div className="point-row"><span><Check size={17} /> Ээлждээ цагтаа ирсэн</span><b>+8 XP</b></div><div className="point-row"><span><Sparkles size={17} /> VIP захиалга дуусгасан</span><b>+12 XP</b></div></section>
    </div>
  )
}

export function MoreScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const actions = [
    { id: 'reservations' as const, label: 'Захиалга', icon: CalendarDays, detail: '2 шинэ' },
    { id: 'attendance' as const, label: 'Ирц', icon: Clock3, detail: '92%' },
    { id: 'loan' as const, label: 'Зээл', icon: HandCoins, detail: '940,000₮ хүртэл' },
    { id: 'leave' as const, label: 'Чөлөө хүсэх', icon: ShieldCheck, detail: '1 хүлээгдэж буй' },
    { id: 'profile' as const, label: 'Мэдээлэл', icon: UserRound, detail: 'Миний мэдээлэл' },
  ]
  return <div className="screen sub-screen"><ScreenHeader title="Бусад үйлчилгээ" subtitle="Танд хэрэгтэй бүх үйлдэл" /><div className="service-list">{actions.map(({ id, label, icon: Icon, detail }) => <button type="button" key={id} onClick={() => onNavigate(id)}><span className="feature-icon"><Icon size={22} /></span><span><strong>{label}</strong><small>{detail}</small></span><ChevronRight size={18} /></button>)}</div></div>
}

export function AttendanceScreen({ onBack }: { onBack: () => void }) {
  return <div className="screen sub-screen"><ScreenHeader title="Ирцийн түүх" subtitle="Ээлжийн мэдээлэл" onBack={onBack} /><section className="attendance-score"><strong>92%</strong><span>Энэ сарын ирц</span><small>23 ээлжээс 21-д нь цагтаа ирсэн</small></section><div className="list-panel"><div className="timeline-row"><span className="timeline-dot success"/><div><strong>8 сарын 1</strong><small>18:54 ирсэн · 04:03 гарсан</small></div><b>Хэвийн</b></div><div className="timeline-row"><span className="timeline-dot warning"/><div><strong>7 сарын 30</strong><small>19:08 ирсэн · 04:01 гарсан</small></div><b>8 мин хоцорсон</b></div><div className="timeline-row"><span className="timeline-dot success"/><div><strong>7 сарын 29</strong><small>18:51 ирсэн · 04:00 гарсан</small></div><b>Хэвийн</b></div></div></div>
}

export function ReservationsScreen({ onBack, notify }: { onBack: () => void; notify: (message: string) => void }) {
  const [accepted, setAccepted] = useState<number[]>([1])
  return <div className="screen sub-screen"><ScreenHeader title="Миний захиалгууд" subtitle="Өнөөдрийн хүсэлт ба хүлээн авсан цаг" onBack={onBack} /><div className="reservation-stack">{reservations.map((item) => { const isAccepted = accepted.includes(item.id); return <section className="reservation-card" key={item.id}><div className="reservation-card-head"><span><Clock3 size={17}/>{item.time}</span><i>{isAccepted ? 'Хүлээн авсан' : 'Хариу хүлээж буй'}</i></div><h2>{item.room}</h2><p>{item.customer}</p>{!isAccepted ? <button type="button" className="primary-action compact" onClick={() => { setAccepted((current) => [...current, item.id]); notify('Захиалгыг амжилттай хүлээн авлаа') }}>Хүлээн авах</button> : <div className="confirmed-line"><Check size={17}/> Хуваарьт нэмэгдсэн</div>}</section>})}</div></div>
}

export function LoanScreen({ onBack, notify }: { onBack: () => void; notify: (message: string) => void }) {
  const [amount, setAmount] = useState(750000)
  const [rate, setRate] = useState(50)
  return <div className="screen sub-screen"><ScreenHeader title="Зээлийн боломж" subtitle="Silver зэрэглэлийн боломж" onBack={onBack} /><section className="loan-limit"><span>Таны авах боломжтой дээд хэмжээ</span><strong>940,000₮</strong><small>3 сарын дундаж 4,700,000₮ × 20%</small></section><section className="simple-panel slider-panel"><label htmlFor="loan-amount">Хүсэх дүн <b>{amount.toLocaleString()}₮</b></label><input id="loan-amount" type="range" min="100000" max="940000" step="10000" value={amount} onChange={(e) => setAmount(Number(e.target.value))}/><label htmlFor="loan-rate">3 хоногийн төлөлтийн хувь <b>{rate}%</b></label><input id="loan-rate" type="range" min="30" max="60" step="5" value={rate} onChange={(e) => setRate(Number(e.target.value))}/><div className="loan-estimate"><CircleDollarSign size={19}/><span>500,000₮ payout байвал ойролцоогоор <strong>{(500000 * rate / 100).toLocaleString()}₮</strong> суутгана.</span></div><button className="primary-action" type="button" onClick={() => notify('Зээлийн хүсэлт амжилттай илгээгдлээ')}>Хүсэлт илгээх</button></section></div>
}

export function LeaveScreen({ onBack, notify }: { onBack: () => void; notify: (message: string) => void }) {
  return <div className="screen sub-screen"><ScreenHeader title="Чөлөө хүсэх" subtitle="Менежерт хүсэлт илгээнэ" onBack={onBack}/><form className="simple-panel leave-form" onSubmit={(event) => { event.preventDefault(); notify('Чөлөөний хүсэлт илгээгдлээ') }}><label>Чөлөөний төрөл<select defaultValue="personal"><option value="personal">Хувийн чөлөө</option><option value="health">Эрүүл мэнд</option></select></label><label>Огноо<input type="date" defaultValue="2026-08-05"/></label><label>Тайлбар<textarea placeholder="Товч тайлбар бичнэ үү" required/></label><button className="primary-action" type="submit">Хүсэлт илгээх</button></form></div>
}

export function ProfileScreen({ onBack }: { onBack: () => void }) {
  return <div className="screen sub-screen"><ScreenHeader title="Миний мэдээлэл" onBack={onBack}/><section className="profile-card"><img src="/assets/anu-avatar.png" alt="Анугийн зураг"/><h2>{entertainer.fullName}</h2><span>{entertainer.rank} · {entertainer.branch}</span></section><div className="list-panel profile-fields"><div><Phone size={18}/><span><small>Утас</small><strong>{entertainer.phone}</strong></span></div><div><UserRound size={18}/><span><small>И-мэйл</small><strong>{entertainer.email}</strong></span></div><div><Medal size={18}/><span><small>Зэрэглэл</small><strong>{entertainer.rank}</strong></span></div></div></div>
}
