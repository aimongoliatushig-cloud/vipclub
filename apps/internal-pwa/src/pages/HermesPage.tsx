import {
  Bot,
  CalendarDays,
  ChevronRight,
  CircleAlert,
  Database,
  History,
  ListTodo,
  MessageCircle,
  MessageSquareText,
  Pause,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { DataMeta } from '../components/ui/DataMeta'
import { PageHeader } from '../components/ui/PageHeader'
import { ProgressBar } from '../components/ui/ProgressBar'
import { StatusMark } from '../components/ui/StatusMark'
import type { HermesAnalysisState, HermesFeedbackInput, HermesRecommendation } from '../domain/types'
import { useApp } from '../state/useApp'

const analysisStateLabels: Record<HermesAnalysisState, string> = {
  ready: 'Шинжилгээнд бэлэн',
  empty: 'Найдвартай signal алга',
  'conflicting-source': 'Эх үүсвэр зөрсөн',
  stale: 'Эх үүсвэр хуучирсан',
  'low-confidence': 'Итгэлцэл бага',
  unavailable: 'Өгөгдөл бэлэн биш',
  'unsafe-action': 'Аюултай action хаагдсан',
}

const stateTone = (state: HermesAnalysisState) =>
  state === 'ready' ? 'healthy' : state === 'empty' || state === 'unavailable' ? 'neutral' : state === 'unsafe-action' ? 'critical' : 'attention'

function HermesTabs({ view }: { view: 'daily' | 'monthly' | 'recommendation' }) {
  const navigate = useNavigate()
  return (
    <nav className="workspace-tabs" aria-label="Hermes workspace">
      <button type="button" aria-selected={view === 'daily'} onClick={() => navigate('/hermes')}>Өдрийн briefing</button>
      <button type="button" aria-selected={view === 'monthly'} onClick={() => navigate('/hermes/monthly')}>Сарын review</button>
      <button type="button" aria-selected={view === 'recommendation'} onClick={() => navigate('/hermes/hermes-1')}>Зөвлөмжүүд</button>
    </nav>
  )
}

function DailyBriefing() {
  const { hermesDaily } = useApp()
  const navigate = useNavigate()
  return (
    <section className="hermes-daily-workspace" aria-labelledby="hermes-daily-title">
      <article className="daily-briefing daily-briefing--expanded">
        <header>
          <div><Bot size={22} /><span><h2 id="hermes-daily-title">Өдрийн briefing</h2><p>{hermesDaily.period}</p></span></div>
          <StatusMark tone={hermesDaily.meta.reconciled ? 'healthy' : 'attention'} label="Authorized read models" />
        </header>
        <p className="hermes-summary">{hermesDaily.summary}</p>
        <div className="hermes-domain-grid">
          {hermesDaily.items.map((item) => (
            <button key={item.id} type="button" onClick={() => navigate(item.href)}>
              <span><Database size={15} />{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.detail}</p>
              <small>{item.sourceRecord}</small>
              <small>{item.updatedAt.slice(0, 16)} · {analysisStateLabels[item.state]}</small>
              <ChevronRight size={16} />
            </button>
          ))}
        </div>
        <DataMeta meta={hermesDaily.meta} detailed />
      </article>
      <aside className="hermes-known-gaps">
        <CircleAlert size={18} />
        <div><h3>Known missing / partial data</h3>{hermesDaily.knownMissingData.map((item) => <p key={item}>{item}</p>)}</div>
      </aside>
    </section>
  )
}

function MonthlyReview() {
  const { hermesMonthly, branches } = useApp()
  return (
    <section className="hermes-monthly-workspace" aria-labelledby="hermes-monthly-title">
      <article className="monthly-review-card monthly-review-card--expanded">
        <header>
          <CalendarDays size={21} />
          <div><h2 id="hermes-monthly-title">Сарын review</h2><p>{hermesMonthly.period} · prior {hermesMonthly.priorPeriod}</p></div>
          <StatusMark tone={hermesMonthly.meta.reconciled ? 'healthy' : 'attention'} label="Advisory comparison" />
        </header>
        <p className="hermes-summary">{hermesMonthly.summary}</p>
        <div className="monthly-review-table" role="table" aria-label="Сарын Hermes review">
          <div className="monthly-review-table__head" role="row">
            <span>Салбар</span><span>Target</span><span>Plan</span><span>Execution</span><span>Outcome</span><span>Unresolved risk</span><span>Prior recommendation</span>
          </div>
          {hermesMonthly.branches.map((item) => (
            <article key={item.branchId} role="row" data-state={item.state}>
              <span><strong>{branches.find((branch) => branch.id === item.branchId)?.name}</strong><small>{item.state}</small></span>
              <span data-label="Target">{item.target}</span>
              <span data-label="Plan">{item.plan}</span>
              <span data-label="Execution">{item.execution}</span>
              <span data-label="Outcome">{item.outcome}</span>
              <span data-label="Unresolved risk">{item.unresolvedRisk}</span>
              <span data-label="Prior recommendation">{item.priorRecommendationResult}<small>{item.sourceRecords.join(' · ')}</small></span>
            </article>
          ))}
        </div>
        <DataMeta meta={hermesMonthly.meta} detailed />
      </article>
      <aside className="hermes-known-gaps">
        <CircleAlert size={18} />
        <div><h3>Хүний review шаардлагатай</h3>{hermesMonthly.knownMissingData.map((item) => <p key={item}>{item}</p>)}</div>
      </aside>
    </section>
  )
}

function RecommendationDetail({ recommendation }: { recommendation: HermesRecommendation }) {
  const navigate = useNavigate()
  const {
    actOnRecommendation,
    annotateRecommendation,
    branches,
    discussRecommendation,
    openRecommendation,
    submitHermesFeedback,
  } = useApp()
  const opened = useRef<string | null>(null)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [annotation, setAnnotation] = useState('')
  const [feedback, setFeedback] = useState<HermesFeedbackInput>({ usefulness: 'useful', accuracy: 'uncertain' })

  useEffect(() => {
    if (opened.current === recommendation.id) return
    opened.current = recommendation.id
    void openRecommendation(recommendation.id).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Зөвлөмж нээж чадсангүй.'))
  }, [openRecommendation, recommendation.id])

  useEffect(() => {
    setAnnotation('')
    setError('')
  }, [recommendation.id])

  const act = async (status: HermesRecommendation['status']) => {
    setWorking(true)
    setError('')
    try {
      const task = await actOnRecommendation(recommendation.id, status)
      if (task) navigate(`/tasks?selected=${task.id}`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Үйлдэл амжилтгүй боллоо.')
    } finally {
      setWorking(false)
    }
  }

  const discuss = async () => {
    setWorking(true)
    setError('')
    try {
      const thread = await discussRecommendation(recommendation.id)
      navigate(`/messages?thread=${thread.id}`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Хэлэлцүүлэг нээж чадсангүй.')
    } finally {
      setWorking(false)
    }
  }

  const saveAnnotation = async (event: FormEvent) => {
    event.preventDefault()
    if (!annotation.trim()) return
    setWorking(true)
    setError('')
    try {
      await annotateRecommendation(recommendation.id, annotation)
      setAnnotation('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Тэмдэглэл хадгалж чадсангүй.')
    } finally {
      setWorking(false)
    }
  }

  const saveFeedback = async (event: FormEvent) => {
    event.preventDefault()
    setWorking(true)
    setError('')
    try {
      await submitHermesFeedback(recommendation.id, feedback)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Feedback хадгалж чадсангүй.')
    } finally {
      setWorking(false)
    }
  }

  const consequentialActionBlocked = ['empty', 'unavailable', 'unsafe-action'].includes(recommendation.analysisState)

  return (
    <article className="hermes-detail">
      <header>
        <div>
          <small>{branches.find((item) => item.id === recommendation.branchId)?.name ?? 'Компанийн хэмжээнд'} · {recommendation.createdAt.slice(11, 16)}</small>
          <h2>{recommendation.title}</h2>
          <StatusMark tone={stateTone(recommendation.analysisState)} label={analysisStateLabels[recommendation.analysisState]} />
        </div>
        <DataMeta meta={recommendation.meta} />
      </header>

      {(recommendation.analysisState !== 'ready' || recommendation.unsafeActionReason) && (
        <div className={`hermes-state-banner hermes-state-banner--${recommendation.analysisState}`}>
          <CircleAlert size={18} />
          <p>{recommendation.unsafeActionReason ?? `${analysisStateLabels[recommendation.analysisState]}. Evidence, freshness болон uncertainty-г шийдэх хүртэл consequential action автоматаар хийхгүй.`}</p>
        </div>
      )}

      <section><h3>Ажиглалт</h3><p>{recommendation.observation}</p></section>
      <section>
        <h3>Contributing evidence</h3>
        {recommendation.evidence.length ? (
          <div className="hermes-evidence-grid">
            {recommendation.evidence.map((item) => (
              <article key={item.id} data-state={item.state}>
                <header><strong>{item.label}</strong><StatusMark tone={item.state === 'complete' ? 'healthy' : item.state === 'unavailable' ? 'neutral' : 'attention'} label={item.state} compact /></header>
                <b>{item.value}</b><p>{item.detail}</p><small>{item.sourceRecord}</small><small>{item.updatedAt.slice(0, 16)} · authorized</small>
              </article>
            ))}
          </div>
        ) : <div className="hermes-empty-state"><Database size={20} /><strong>Нотолгоо байхгүй</strong><p>Evidence үүсэх хүртэл Hermes дүгнэлт болон action санал болгохгүй.</p></div>}
      </section>
      <section><h3>Болзошгүй шалтгаан</h3><p>{recommendation.possibleCause}</p></section>
      <div className="confidence-row">
        <div><span>Confidence</span><strong>{recommendation.confidence}%</strong><ProgressBar value={recommendation.confidence} tone={recommendation.confidence >= 80 ? 'success' : 'gold'} label="Hermes confidence" /></div>
        <div><span>Uncertainty</span><p>{recommendation.uncertainty}</p></div>
      </div>
      <section className="hermes-governance-grid">
        <div><h3>Policy / metric version</h3><p>{recommendation.policyVersion}</p><p>{recommendation.metricVersion}</p></div>
        <div><h3>Assumptions</h3>{recommendation.assumptions.length ? recommendation.assumptions.map((item) => <p key={item}>{item}</p>) : <p>Таамаглал бүртгээгүй.</p>}</div>
        <div><h3>Known missing data</h3>{recommendation.missingData.length ? recommendation.missingData.map((item) => <p key={item}>{item}</p>) : <p>Known missing data байхгүй.</p>}</div>
      </section>
      <section className="hermes-authorized-inputs">
        <ShieldCheck size={18} />
        <div><h3>Prompt-д орсон authorized summary</h3>{recommendation.authorizedInputSummary.map((item) => <p key={item}>{item}</p>)}<small>Raw private field, sensitive thread болон CEO-д зөвшөөрөөгүй field оруулаагүй.</small></div>
      </section>
      <section className="recommendation-action"><Sparkles size={21} /><div><h3>Зөвлөмж · authoritative record биш</h3><p>{recommendation.recommendation}</p></div></section>
      <div className="hermes-boundary"><ShieldCheck size={18} /><p>Hermes approve/reject хийхгүй, payment эхлүүлэхгүй, membership/rank эсвэл target өөрчлөхгүй. Зөвхөн хүний зөвшөөрсөн task ба internal message үүсгэнэ.</p></div>

      {error && <div className="callout callout--danger" role="alert"><CircleAlert size={18} /><p>{error}</p></div>}

      <footer className="hermes-primary-actions">
        <button className="button button--secondary" type="button" onClick={() => void discuss()} disabled={working}><MessageCircle size={17} />Authorized message</button>
        <button className="button button--secondary" type="button" onClick={() => void act('snoozed')} disabled={working}><Pause size={17} />Түр хойшлуулах</button>
        <button className="button button--secondary" type="button" onClick={() => void act('dismissed')} disabled={working}><X size={17} />Хэрэглэхгүй</button>
        <button className="button button--primary" type="button" onClick={() => void act('converted')} disabled={working || consequentialActionBlocked || Boolean(recommendation.linkedTaskId)} title={consequentialActionBlocked ? 'Энэ төлөвөөс task үүсгэхгүй' : undefined}><ListTodo size={17} />{recommendation.linkedTaskId ? 'Task холбогдсон' : 'Task болгох'}</button>
      </footer>

      <section className="hermes-collaboration">
        <form onSubmit={saveAnnotation}>
          <header><MessageSquareText size={17} /><div><h3>CEO annotation</h3><p>Recommendation record дээр хадгалагдана.</p></div></header>
          <textarea aria-label="Hermes тэмдэглэл" value={annotation} onChange={(event) => setAnnotation(event.target.value)} placeholder="Асуулт, шалгах нөхцөл эсвэл тайлбар…" maxLength={500} />
          <button className="button button--secondary" type="submit" disabled={working || annotation.trim().length < 2}>Тэмдэглэл хадгалах</button>
          {recommendation.annotations.map((item) => <p className="hermes-retained-item" key={item.id}><strong>{item.actor}</strong> · {item.createdAt}<br />{item.body}</p>)}
        </form>
        <form onSubmit={saveFeedback}>
          <header><ThumbsUp size={17} /><div><h3>Usefulness / accuracy feedback</h3><p>Business шийдвэрээс тусдаа хадгална.</p></div></header>
          <div className="hermes-feedback-fields">
            <label><span>Хэрэгтэй эсэх</span><select aria-label="Hermes usefulness" value={feedback.usefulness} onChange={(event) => setFeedback((current) => ({ ...current, usefulness: event.target.value as HermesFeedbackInput['usefulness'] }))}><option value="useful">Хэрэгтэй</option><option value="not-useful">Хэрэггүй</option></select></label>
            <label><span>Accuracy</span><select aria-label="Hermes accuracy" value={feedback.accuracy} onChange={(event) => setFeedback((current) => ({ ...current, accuracy: event.target.value as HermesFeedbackInput['accuracy'] }))}><option value="accurate">Зөв</option><option value="uncertain">Тодорхойгүй</option><option value="inaccurate">Буруу</option></select></label>
          </div>
          <input aria-label="Hermes feedback тайлбар" value={feedback.note ?? ''} onChange={(event) => setFeedback((current) => ({ ...current, note: event.target.value }))} placeholder="Нэмэлт тайлбар (optional)" maxLength={300} />
          <button className="button button--secondary" type="submit" disabled={working}>Feedback хадгалах</button>
          {recommendation.feedback.map((item) => <p className="hermes-retained-item" key={item.id}><History size={13} /> {item.usefulness} · {item.accuracy} · {item.createdAt}</p>)}
        </form>
      </section>
    </article>
  )
}

function RecommendationWorkspace({ selected }: { selected?: HermesRecommendation }) {
  const { recommendations, branches } = useApp()
  const navigate = useNavigate()
  if (!recommendations.length) return <div className="hermes-empty-state"><Bot size={24} /><strong>Зөвлөмж алга</strong><p>Authorized source signal үүсэхэд энд харагдана. Hermes хоосон үед action таахгүй.</p></div>
  return (
    <div className="hermes-workbench">
      <aside className="recommendation-list">
        <header><h2>Зөвлөмж</h2><span>{recommendations.length}</span></header>
        {recommendations.map((item) => (
          <button key={item.id} type="button" data-selected={item.id === selected?.id || undefined} onClick={() => navigate(`/hermes/${item.id}`)}>
            <span className="recommendation-list__icon" data-status={item.status}><Bot size={18} /></span>
            <span><strong>{item.title}</strong><small>{branches.find((branch) => branch.id === item.branchId)?.name ?? 'Company'} · Confidence {item.confidence}%</small><em>{item.observation}</em></span>
            <StatusMark tone={stateTone(item.analysisState)} label={analysisStateLabels[item.analysisState]} compact />
          </button>
        ))}
      </aside>
      {selected ? <RecommendationDetail recommendation={selected} /> : null}
    </div>
  )
}

export default function HermesPage() {
  const { recommendations, hermesDaily } = useApp()
  const location = useLocation()
  const navigate = useNavigate()
  const { recommendationId } = useParams()
  const [searchParams] = useSearchParams()
  const view: 'daily' | 'monthly' | 'recommendation' = location.pathname.endsWith('/monthly') ? 'monthly' : recommendationId || searchParams.get('selected') ? 'recommendation' : 'daily'
  const selectedId = recommendationId ?? searchParams.get('selected') ?? recommendations[0]?.id
  const selected = recommendations.find((item) => item.id === selectedId) ?? recommendations[0]

  return (
    <div className="page hermes-page">
      <PageHeader
        title="Hermes"
        description="Authorized read model дээр суурилсан, тайлбарлагдах ба authoritative биш decision support."
        meta={<DataMeta meta={hermesDaily.meta} detailed />}
        actions={<StatusMark tone="attention" label={`${recommendations.filter((item) => item.status === 'new').length} шинэ зөвлөмж`} />}
      />
      <HermesTabs view={view} />
      {view === 'daily' && <DailyBriefing />}
      {view === 'monthly' && <MonthlyReview />}
      {view === 'recommendation' && <RecommendationWorkspace selected={selected} />}
      {view !== 'recommendation' && (
        <section className="hermes-recommendation-preview">
          <header><div><Bot size={18} /><h2>Тайлбарлагдах зөвлөмжүүд</h2></div><button type="button" className="text-button" onClick={() => navigate(`/hermes/${recommendations[0]?.id ?? ''}`)}>Бүгдийг харах <ChevronRight size={16} /></button></header>
          <div>{recommendations.slice(0, 3).map((item) => <button key={item.id} type="button" onClick={() => navigate(`/hermes/${item.id}`)}><strong>{item.title}</strong><span>{analysisStateLabels[item.analysisState]} · {item.confidence}%</span></button>)}</div>
        </section>
      )}
      <div className="callout callout--warning hermes-global-note"><CircleAlert size={18} /><p>Correlation нь causation биш. Missing/unauthorized data Hermes-ийн input-д ордоггүй; sensitive threads automatic analysis-аас хасагдана. Хүний зөвшөөрөлгүй consequential record өөрчлөгдөхгүй.</p></div>
    </div>
  )
}
