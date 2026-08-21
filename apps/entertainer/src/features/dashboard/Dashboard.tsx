import {
  ArrowRight,
  CalendarClock,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  MapPin,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { entertainer, rankRequirements, reservations, shift } from '../../data/mock'
import type { ShiftState } from '../../types'

interface DashboardProps {
  shiftState: ShiftState
  onClock: () => void
  onOpenIncome: () => void
  onOpenRanking: () => void
  onOpenReservations: () => void
}

function statusCopy(state: ShiftState) {
  if (state === 'working') return { label: 'Ажиллаж байна', detail: 'Ирсэн цаг · 18:54', button: 'Ажлаас гарах' }
  if (state === 'completed') return { label: 'Ээлж дууссан', detail: '9 цаг 04 минут ажилласан', button: 'Ирцийн түүх харах' }
  return { label: 'Ирээгүй', detail: 'Ээлж эхлэхээс 28 минутын өмнө', button: 'Ажилдаа ирлээ' }
}

export function Dashboard({ shiftState, onClock, onOpenIncome, onOpenRanking, onOpenReservations }: DashboardProps) {
  const copy = statusCopy(shiftState)
  const nextReservation = reservations[0]

  return (
    <div className="screen dashboard-screen">
      <section className="profile-hero">
        <div className="avatar-wrap">
          <img src="/assets/anu-avatar.png" alt="Анугийн зураг" width="88" height="88" />
          <span className="online-dot" aria-label="Онлайн" />
        </div>
        <div className="profile-copy">
          <h1>{entertainer.name}</h1>
          <p><MapPin size={14} /> {entertainer.branch}</p>
          <div className="rank-chip"><span className="silver-gem" /> SILVER ЭНТЕРТАЙНЕР</div>
        </div>
      </section>

      <section className={`shift-panel ${shiftState}`}>
        <div className="panel-topline">
          <div>
            <span className="section-kicker">Өнөөдрийн ээлж</span>
            <strong className="shift-time">{shift.start}<span>–</span>{shift.end}</strong>
            <p className="shift-location"><MapPin size={14} /> {shift.location}</p>
          </div>
          <div className="clock-orb"><Clock3 size={27} /></div>
        </div>

        <div className="shift-status">
          <span className="status-light" />
          <div><strong>{copy.label}</strong><small>{copy.detail}</small></div>
        </div>

        <button className="primary-action" type="button" onClick={onClock}>
          {shiftState === 'not-started' ? <Check size={21} /> : <Clock3 size={21} />}
          {copy.button}
        </button>
      </section>

      <button className="readiness-row" type="button">
        <span className="feature-icon"><ShieldCheck size={23} /></span>
        <span className="row-copy"><small>Өнөөдрийн бэлэн байдал</small><strong>Шалгагдаагүй</strong></span>
        <span className="row-meta">Ахлах шалгана</span>
        <ChevronRight size={18} />
      </button>

      <button className="payout-row" type="button" onClick={onOpenIncome}>
        <span className="feature-icon"><CircleDollarSign size={24} /></span>
        <span className="row-copy"><small>Энэ 3 хоногийн тооцоолсон орлого</small><strong>580,000₮</strong></span>
        <ChevronRight size={19} />
      </button>

      <section className="rank-progress-panel">
        <button className="section-link" type="button" onClick={onOpenRanking}>
          <span>Зэрэглэлийн ахиц</span><span>Дэлгэрэнгүй <ArrowRight size={15} /></span>
        </button>
        <div className="rank-headline">
          <div><span className="rank-medal silver" /><strong>Silver</strong><small>Одоогийн зэрэглэл</small></div>
          <b>{entertainer.progress}%</b>
          <div className="align-right"><span className="rank-medal gold" /><strong>Gold</strong><small>Дараагийн зэрэглэл</small></div>
        </div>
        <div className="progress-track"><span style={{ width: `${entertainer.progress}%` }} /></div>
        <div className="requirement-preview">
          <TrendingUp size={16} />
          <span>{rankRequirements.length} шалгуурын үзүүлэлт сайжруулах шаардлагатай</span>
        </div>
        <div className="gate-clear"><ShieldCheck size={16} /> Идэвхтэй no-show хориг байхгүй</div>
      </section>

      <section className="upcoming-section">
        <div className="section-heading">
          <div><span>Дараагийн захиалга</span><small>Өнөөдөр</small></div>
          <button type="button" onClick={onOpenReservations}>Бүгдийг харах</button>
        </div>
        <button className="reservation-row" type="button" onClick={onOpenReservations}>
          <span className="reservation-time"><CalendarClock size={21} /><strong>{nextReservation.time}</strong></span>
          <span className="reservation-info"><strong>{nextReservation.room}</strong><small>{nextReservation.customer}</small></span>
          <span className="vip-tag"><Sparkles size={13} /> VIP</span>
          <ChevronRight size={18} />
        </button>
      </section>
    </div>
  )
}

