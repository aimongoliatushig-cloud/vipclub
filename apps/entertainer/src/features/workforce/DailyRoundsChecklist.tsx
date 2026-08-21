import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Clock3, Plus, RefreshCw, RotateCcw, ShieldCheck } from 'lucide-react'
import { api, idempotencyKey, type DailyRoundsData } from '../../api'
import './DailyRoundsChecklist.css'

const time = new Intl.DateTimeFormat('mn-MN', {
  hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ulaanbaatar',
})
const money = new Intl.NumberFormat('mn-MN', { style: 'currency', currency: 'MNT', maximumFractionDigits: 0 })

function formatTime(value?: string | null) {
  if (!value) return '—'
  return time.format(new Date(value.replace(' ', 'T')))
}

export function DailyRoundsChecklist({ branch }: { branch: string }) {
  const [data, setData] = useState<DailyRoundsData>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try { setData(await api.dailyRounds()) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Өдрийн гарааны мэдээлэл ачаалсангүй.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  const addRound = async (entertainer: string, displayName: string) => {
    if (!data || saving) return
    setSaving(entertainer)
    setError('')
    setMessage('')
    try {
      const next = await api.recordDailyRound(entertainer, data.work_date, idempotencyKey('lead-stage-round'))
      setData(next)
      const person = next.people.find((row) => row.entertainer === entertainer)
      setMessage(`${displayName}: ${person?.rounds ?? 0}/${next.target} гараа бүртгэлээ.`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Гарааг хадгалж чадсангүй.')
    } finally { setSaving('') }
  }

  return <div className="page rounds-page">
    <header className="rounds-heading">
      <div><span className="eyebrow">{branch} салбар · Өнөөдөр</span><h1>Өдрийн гараа</h1><p>QR ирцтэй бүжигчин бүрийн гарааг 7/7 хүртэл тэмдэглэнэ.</p></div>
      <button type="button" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? 'spin' : ''} /><span>Шинэчлэх</span></button>
    </header>

    <section className="rounds-rule"><ShieldCheck /><span><strong>Нэг дутуу гараа = {data ? money.format(data.penalty_rate) : '30,000 ₮'}</strong><small>Ээлж дуусахад дутуу гарааны санал үүснэ. Менежер баталсны дараа л суутгал болно.</small></span></section>

    {data ? <section className="rounds-summary" aria-label="Өдрийн гарааны явц">
      <article><small>QR ирцтэй</small><strong>{data.summary.checked_in}</strong></article>
      <article><small>7/7 дууссан</small><strong>{data.summary.completed}</strong></article>
      <article><small>Дутуу хүн</small><strong>{data.summary.incomplete}</strong></article>
      <article><small>Үлдсэн гараа</small><strong>{data.summary.remaining_rounds}</strong></article>
      <article><small>Урьдчилсан торгууль</small><strong>{money.format(data.summary.projected_penalty)}</strong></article>
    </section> : null}

    {message ? <p className="rounds-message success" role="status"><CheckCircle2 />{message}</p> : null}
    {error ? <p className="rounds-message error" role="alert"><RotateCcw />{error}<button type="button" onClick={() => void load()}>Дахин</button></p> : null}

    {loading && !data ? <div className="rounds-empty"><RefreshCw className="spin" />Мэдээлэл ачаалж байна…</div> : data?.people.length ? <section className="rounds-list" aria-busy={Boolean(saving)}>
      {data.people.map((person) => <article key={person.entertainer} className={person.completed ? 'complete' : ''}>
        <div className="rounds-person"><span>{person.display_name.slice(0, 1)}</span><div><strong>{person.display_name}</strong><small>{person.shift_type} · <Clock3 /> {formatTime(person.checked_in_at)}</small></div></div>
        <div className="rounds-count"><strong>{person.rounds}/{person.target}</strong><div aria-label={`${person.rounds} гараа бүртгэсэн`}>{Array.from({ length: person.target }, (_, index) => <i key={index} className={index < person.rounds ? 'done' : ''} />)}</div><small>{person.completed ? 'Торгуульгүй' : `${person.missing_rounds} дутуу · ${money.format(person.projected_penalty)}`}</small></div>
        <button type="button" disabled={person.completed || Boolean(saving)} onClick={() => void addRound(person.entertainer, person.display_name)}>{saving === person.entertainer ? <RefreshCw className="spin" /> : person.completed ? <CheckCircle2 /> : <Plus />}<span>{person.completed ? '7/7 дууссан' : 'Гараа нэмэх'}</span></button>
      </article>)}
    </section> : data ? <div className="rounds-empty"><Clock3 /><strong>Одоогоор QR ирцтэй бүжигчин алга</strong><p>Ирц бүртгэгдмэгц жагсаалтад автоматаар орно.</p></div> : null}
  </div>
}
