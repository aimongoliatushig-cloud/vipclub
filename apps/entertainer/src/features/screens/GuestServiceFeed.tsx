import { useCallback, useEffect, useState } from 'react'
import { Clock3, DoorOpen, HeartHandshake, RefreshCw } from 'lucide-react'
import { api, type ServiceGuestFeed } from '../../api'

const entryTime = (value: string) => {
  const match = value?.match(/[ T](\d{2}):(\d{2})/)
  return match ? `${match[1]}:${match[2]}` : '—'
}
const guestRankLabel = (value: string) => value === 'Unassigned' ? 'Зэрэглэлгүй' : value

export function GuestServiceFeedPage({ branch }: { branch: string }) {
  const [feed, setFeed] = useState<ServiceGuestFeed | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    setLoading(true)
    try { setFeed(await api.serviceGuestFeed(branch)); setError('') }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Зочны мэдээлэл ачаалж чадсангүй.') }
    finally { setLoading(false) }
  }, [branch])
  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(), 20_000)
    return () => window.clearInterval(timer)
  }, [load])

  return <main className="page guest-service-page">
    <header className="guest-service-heading"><div><span>{branch} салбар · өнөөдрийн ээлж</span><h1>Нэвтэрсэн зочид</h1></div><button type="button" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? 'spin' : ''} />Шинэчлэх</button></header>
    {error ? <p className="guest-service-error" role="alert">{error}</p> : null}
    <section className="guest-service-list" aria-busy={loading}>
      <header><DoorOpen /><span><strong>{feed?.today_total ?? 0}</strong><small>нэвтэрсэн зочин</small></span></header>
      <div>{feed?.entries.map((entry) => <article key={entry.name}>
        <time><Clock3 />{entryTime(entry.entered_at)}</time>
        <div><strong>{entry.customer_name}</strong><small>{entry.visit_number > 1 ? `${entry.visit_number} дахь ирэлт` : 'Анхны ирэлт'}</small></div>
        <b>{guestRankLabel(entry.membership_rank || 'Unassigned')}</b>
        {entry.service_characteristics ? <p><HeartHandshake />{entry.service_characteristics}</p> : null}
      </article>)}{!loading && !feed?.entries.length ? <p className="guest-service-empty">Энэ ээлжийн нэвтрэлт хараахан алга.</p> : null}</div>
    </section>
  </main>
}
