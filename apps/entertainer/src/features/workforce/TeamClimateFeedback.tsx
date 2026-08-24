import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AlertTriangle, CheckCircle2, ChevronLeft, HeartHandshake, LockKeyhole, RefreshCw, Send } from 'lucide-react'
import { api, type TeamClimateCandidate, type TeamClimateCategory } from '../../api'
import './TeamClimateFeedback.css'


const categoryOptions: Array<{ value: TeamClimateCategory; label: string; help: string }> = [
  { value: 'Positive', label: 'Сайн зүйл', help: 'Талархал, сайн хамтын ажиллагаа' },
  { value: 'Concern', label: 'Анхаарах зүйл', help: 'Засах эсвэл ярилцах шаардлагатай зүйл' },
  { value: 'Support', label: 'Дэмжлэг хэрэгтэй', help: 'Менежерийн тусламж шаардлагатай нөхцөл' },
]


export function TeamClimateFeedbackPage({ onBack, backLabel = 'Миний мэдээлэл рүү буцах' }: { onBack: () => void; backLabel?: string }) {
  const [people, setPeople] = useState<TeamClimateCandidate[]>([])
  const [target, setTarget] = useState('')
  const [category, setCategory] = useState<TeamClimateCategory>('Positive')
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)

  const selected = useMemo(() => people.find((person) => person.profile === target), [people, target])

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError('')
    api.teamClimateCandidates()
      .then((result) => {
        if (!active) return
        if (!Array.isArray(result?.people)) {
          throw new Error('Бүжигчдийн жагсаалтын мэдээлэл бүрэн бус байна.')
        }
        setPeople(result.people)
      })
      .catch((caught) => {
        if (!active) return
        setPeople([])
        setLoadError(caught instanceof Error ? caught.message : 'Бүжигчдийн жагсаалтыг ачаалж чадсангүй.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [loadAttempt])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!target || feedback.trim().length < 10 || busy) return
    setBusy(true); setSubmitError(''); setSuccess(false)
    try {
      await api.submitTeamClimateFeedback(target, category, feedback.trim())
      setTarget(''); setCategory('Positive'); setFeedback(''); setSuccess(true)
    } catch (caught) {
      setSubmitError(caught instanceof Error ? caught.message : 'Саналыг хадгалж чадсангүй.')
    } finally { setBusy(false) }
  }

  return <div className="page team-climate-page">
    <button className="back-link" type="button" onClick={onBack}><ChevronLeft />{backLabel}</button>
    <header className="team-climate-title">
      <div><h1>Багийн уур амьсгал</h1><p>Хамт ажиллаж буй бүжигчиндээ өгөх саналаа товч, бодитоор бичнэ үү.</p></div>
      <HeartHandshake aria-hidden="true" />
    </header>

    <div className="team-climate-privacy" role="note"><LockKeyhole /><span><strong>Илгээгчийн нэр харагдана</strong><small>Таны нэр болон саналыг салбарын менежер, захирал, эрхтэй системийн админ харна.</small></span></div>

    {success ? <div className="team-climate-success" role="status"><CheckCircle2 /><span><strong>Санал хадгалагдлаа</strong><small>Таны нэртэй хамт удирдлагад харагдана.</small></span></div> : null}
    {loadError ? <div className="team-climate-error" role="alert"><AlertTriangle /><span><strong>Жагсаалт ачаалагдсангүй</strong><small>{loadError}</small></span><button className="team-climate-retry" type="button" onClick={() => setLoadAttempt((value) => value + 1)}><RefreshCw />Дахин оролдох</button></div> : null}
    {submitError ? <div className="team-climate-error" role="alert"><AlertTriangle /><span><strong>Санал илгээгдсэнгүй</strong><small>{submitError}</small></span></div> : null}
    {loading ? <div className="team-climate-state" role="status"><RefreshCw className="spin" /><span>Бүжигчдийн жагсаалтыг ачаалж байна…</span></div> : null}
    {!loading && !loadError && people.length === 0 ? <div className="team-climate-state"><HeartHandshake /><span><strong>Санал өгөх бүжигчин алга</strong><small>Таны салбарт өөр идэвхтэй бүжигчин бүртгэгдээгүй байна.</small></span></div> : null}

    {!loading && !loadError && people.length > 0 ? <form className="team-climate-form" onSubmit={submit}>
      <label><span>Хэнд санал өгөх вэ?</span>
        <select value={target} onChange={(event) => { setTarget(event.target.value); setSuccess(false); setSubmitError('') }} disabled={busy} required>
          <option value="">Бүжигчин сонгох</option>
          {people.map((person) => <option key={person.profile} value={person.profile}>{person.display_name}</option>)}
        </select>
      </label>

      <fieldset><legend>Саналын төрөл</legend><div className="team-climate-categories">{categoryOptions.map((option) => <label key={option.value} className={category === option.value ? 'selected' : ''}><input type="radio" name="climate-category" value={option.value} checked={category === option.value} onChange={() => setCategory(option.value)} disabled={busy} /><span><strong>{option.label}</strong><small>{option.help}</small></span></label>)}</div></fieldset>

      <label><span>{selected ? `${selected.display_name}-д өгөх санал` : 'Санал'}</span>
        <textarea value={feedback} onChange={(event) => { setFeedback(event.target.value.slice(0, 500)); setSuccess(false); setSubmitError('') }} rows={5} minLength={10} maxLength={500} disabled={busy} placeholder="Жишээ: Ээлжийн үеэр багтайгаа сайн ойлголцож ажилласан…" required />
        <small className="team-climate-counter">{feedback.trim().length}/500 · хамгийн багадаа 10 тэмдэгт</small>
      </label>

      <button className="team-climate-submit" type="submit" disabled={busy || !target || feedback.trim().length < 10}>{busy ? <RefreshCw className="spin" /> : <Send />}{busy ? 'Хадгалж байна…' : 'Санал илгээх'}</button>
    </form> : null}
  </div>
}
