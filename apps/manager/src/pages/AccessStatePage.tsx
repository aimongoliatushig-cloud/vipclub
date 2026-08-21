import { ArrowLeft, LockKeyhole, LogIn, ShieldAlert, TimerOff } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

interface AccessStatePageProps {
  variant: 'denied' | 'expired'
  embedded?: boolean
  detail?: string
}

export default function AccessStatePage({ variant, embedded = false, detail }: AccessStatePageProps) {
  const location = useLocation()
  const expired = variant === 'expired'
  const Icon = expired ? TimerOff : ShieldAlert
  const content = (
    <section className="access-state" aria-labelledby="access-state-title">
      <span className="access-state__icon"><Icon size={30} aria-hidden /></span>
      <p className="access-state__eyebrow">{expired ? 'SESSION EXPIRED' : 'ACCESS DENIED'}</p>
      <h1 id="access-state-title">{expired ? 'Нэвтрэх хугацаа дууссан' : 'Энэ хэсэгт хандах эрхгүй'}</h1>
      <p>{detail ?? (expired ? 'Аюулгүй байдлын үүднээс дахин нэвтэрнэ үү. Таны өмнөх хаягийг хадгалсан.' : 'Таны role, салбарын scope эсвэл permission энэ мэдээллийг зөвшөөрөхгүй байна.')}</p>
      <div className="access-state__meta"><LockKeyhole size={17} aria-hidden /><span>Route өөрөө эрх олгохгүй · Server session context шаардлагатай</span></div>
      <div className="access-state__actions">
        {expired ? <Link className="button button--primary" to="/login" state={{ returnTo: location.state?.returnTo ?? '/' }}><LogIn size={17} aria-hidden />Дахин нэвтрэх</Link> : <Link className="button button--primary" to="/"><ArrowLeft size={17} aria-hidden />Удирдлагын төв</Link>}
      </div>
    </section>
  )

  return embedded ? <div className="page access-state-page">{content}</div> : <main className="access-state-standalone">{content}</main>
}
