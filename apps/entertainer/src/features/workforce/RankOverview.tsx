import { useEffect, useState } from 'react'
import { BookOpen, Check, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, Database } from 'lucide-react'

import { api } from '../../api'
import type { RankData, RankIncomeComparison } from '../../api'
import { RankCrest } from '../../components/RankCrest'
import './RankOverview.css'

type Props = { data: RankData; incomeComparison?: RankIncomeComparison }

const number = new Intl.NumberFormat('mn-MN', { maximumFractionDigits: 2 })
const money = (value: number) => `${number.format(value)} ₮`
const periodLabel = (period?: RankIncomeComparison['period']) => {
  if (!period) return 'Одоогийн 3 хоног'
  const [, fromMonth, fromDay] = period.from.split('-').map(Number)
  const [, toMonth, toDay] = period.to.split('-').map(Number)
  return fromMonth === toMonth
    ? `${fromMonth}-р сарын ${fromDay}–${toDay}`
    : `${fromMonth}-р сарын ${fromDay} – ${toMonth}-р сарын ${toDay}`
}
const shiftDate = (value: string, days: number) => {
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
const shortDate = (value: string | null) => {
  if (!value) return ''
  const [, month, day] = value.slice(0, 10).split('-').map(Number)
  return `${month}-р сарын ${day}`
}

const ruleRange = (minimum: number, maximum: number, maximumInclusive: boolean) => {
  if (maximumInclusive) return `${number.format(minimum)}–${number.format(maximum)} оноо`
  if (minimum === 0) return `${number.format(maximum)}-аас доош оноо`
  return `${number.format(minimum)}–${number.format(maximum)}-аас доош оноо`
}

export function EntertainerRankOverview({ data, incomeComparison }: Props) {
  const [rulesOpen, setRulesOpen] = useState(false)
  const [visibleComparison, setVisibleComparison] = useState(incomeComparison)
  const [comparisonLoading, setComparisonLoading] = useState(false)
  const [comparisonError, setComparisonError] = useState('')

  useEffect(() => {
    setVisibleComparison(incomeComparison)
    setComparisonError('')
  }, [incomeComparison])

  const moveComparison = async (direction: -1 | 1) => {
    if (!visibleComparison?.period || comparisonLoading) return
    const periodDate = direction < 0
      ? shiftDate(visibleComparison.period.from, -1)
      : shiftDate(visibleComparison.period.to, 1)
    setComparisonLoading(true)
    setComparisonError('')
    try {
      setVisibleComparison(await api.rankIncomeComparison(periodDate))
    } catch {
      setComparisonError('3 хоногийн тооцоог ачаалсангүй.')
    } finally {
      setComparisonLoading(false)
    }
  }
  const score = data.score_status === 'complete' ? data.score : null
  const complete = score != null
  const isDemo = data.data_provenance === 'DEMO'
  const showingDemoResult = Boolean(isDemo && complete && data.calculated_next_rank)
  const displayRank = showingDemoResult ? data.calculated_next_rank! : data.effective_rank
  const displayRankLabel = showingDemoResult
    ? (data.calculated_next_rank_label || data.effective_rank_label)
    : data.effective_rank_label
  const displayPayout = showingDemoResult
    ? (data.calculated_next_payout_percent
      ?? data.rules.find(rule => rule.rank === displayRank)?.payout_percent
      ?? data.payout_percent)
    : data.payout_percent
  const nextDisplayRank = displayRank === 'Rank 3' ? 'Rank 2' : displayRank === 'Rank 2' ? 'Rank 1' : null
  const nextDisplayRule = nextDisplayRank
    ? data.rules.find(rule => rule.rank === nextDisplayRank)
    : undefined
  const pointsToNext = score != null && nextDisplayRule
    ? Math.max(0, nextDisplayRule.minimum_score - score)
    : null
  const verifiedCount = data.components.filter(item => item.data_status === 'verified').length

  return <section className="rank-overview" aria-labelledby="rank-overview-title">
    <header className="rank-page-heading">
      <div>
        <span>ЗЭРЭГЛЭЛ</span>
        <h1 id="rank-overview-title">Миний зэрэглэл</h1>
      </div>
      <div className="rank-rules-popover">
        <button
          id="rank-rules-trigger"
          type="button"
          aria-expanded={rulesOpen}
          aria-controls="rank-rules-panel"
          onClick={() => setRulesOpen(open => !open)}
        ><BookOpen aria-hidden="true" /> Дүрэм</button>
        {rulesOpen ? <div id="rank-rules-panel" role="region" aria-labelledby="rank-rules-trigger">
          <h2>Бүх зэрэглэлийн дүрэм</h2>
          <ul>{data.rules.map(rule => <li key={rule.rank}>
            <span><strong>{rule.label}</strong><small>{ruleRange(rule.minimum_score, rule.maximum_score, rule.maximum_inclusive)}</small></span>
            <b>{rule.payout_percent}%</b>
          </li>)}</ul>
          <p>Ажилласан болон тасалсан өдрийн дундаж оноогоор зэрэг тогтооно.</p>
        </div> : null}
      </div>
    </header>

    <section className="rank-summary-card" data-testid="today-rank-summary" aria-live="polite">
      <div className="rank-summary-primary">
        <span className="rank-summary-crest"><RankCrest rank={displayRank} label={`${displayRankLabel} тэмдэг`} /></span>
        <div>
          <small>{isDemo ? `${shortDate(data.scoring_date)} · ТУРШИЛТЫН ДУНДАЖ` : 'НИЙТ ДУНДАЖ ОНОО'}</small>
          <strong>{complete ? displayRankLabel : 'Үнэлгээ бүрдээгүй'}</strong>
          <span>{complete ? `${number.format(score)} оноо · ${displayPayout}% · ${data.counted_days} өдөр` : `${data.missing_components.length} үзүүлэлт хүлээгдэж байна`}</span>
        </div>
      </div>

      {complete ? <p className="rank-next-target">
        {nextDisplayRule && pointsToNext != null
          ? <><span>Дараагийн шат</span><strong>{nextDisplayRule.label} · {number.format(pointsToNext)} оноо дутуу</strong></>
          : <><span>Зэрэглэл</span><strong>Хамгийн дээд шат</strong></>}
      </p> : null}

      {!complete ? <div className="rank-incomplete" role="status">
        <CircleAlert />
        <span><strong>{isDemo ? 'Туршилтын дундаж бүрдээгүй' : 'Дундаж оноо бүрдээгүй'}</strong><small>{data.missing_components.length} үзүүлэлт хүлээгдэж байна</small></span>
      </div> : null}
    </section>

    {visibleComparison ? <section className="rank-income-comparison" aria-labelledby="rank-income-title" aria-busy={comparisonLoading}>
      <header>
        <div>
          <small>{periodLabel(visibleComparison.period)}</small>
          <h2 id="rank-income-title">3 хоногийн цалин</h2>
        </div>
        <div className="rank-income-period-actions" aria-label="Цалингийн хугацаа солих">
          <button
            type="button"
            aria-label="Өмнөх 3 хоног"
            disabled={comparisonLoading}
            onClick={() => void moveComparison(-1)}
          ><ChevronLeft aria-hidden="true" /></button>
          <button
            type="button"
            aria-label="Дараагийн 3 хоног"
            disabled={comparisonLoading || !visibleComparison.period?.can_next}
            onClick={() => void moveComparison(1)}
          ><ChevronRight aria-hidden="true" /></button>
        </div>
      </header>
      {comparisonLoading ? <p className="rank-income-status" role="status">Ачаалж байна…</p> : null}
      {comparisonError ? <p className="rank-income-status is-error" role="alert">{comparisonError}</p> : null}
      {visibleComparison.data_state === 'verified'
        && visibleComparison.baseline?.calculated_salary != null
        && visibleComparison.scenario?.calculated_salary != null
        ? <>
          <dl>
            <div>
              <dt>Одоо бодогдсон</dt>
              <dd>{money(visibleComparison.baseline.calculated_salary)}</dd>
              <small>Бүртгэгдсэн тооцоо</small>
            </div>
            <div className="is-scenario">
              <dt>Өдрийн зэргээр</dt>
              <dd>{money(visibleComparison.scenario.calculated_salary)}</dd>
              <small>Өдөр бүрийн хувиар</small>
            </div>
          </dl>
          <p className="rank-income-delta">
            <span>Зөрүү</span>
            <strong>{(visibleComparison.delta || 0) > 0 ? '+' : ''}{money(visibleComparison.delta || 0)}</strong>
          </p>
          <p className="rank-income-note">Өдөр бүр тухайн өдөр хүчинтэй хувийг хэрэглэсэн.</p>
        </>
        : <div className="rank-income-empty" role="status">
          <strong>Энэ 3 хоногт тооцох үйлчилгээ алга</strong>
          <p>{visibleComparison.reason || 'Цалингийн хоёр дүнг одоогоор харьцуулах боломжгүй.'}</p>
          {visibleComparison.baseline?.deduction
            ? <span>Суутгал: {money(visibleComparison.baseline.deduction)}</span>
            : null}
        </div>}
    </section> : null}

    <div className="rank-disclosures">
      <details className="rank-disclosure">
        <summary>
          <span><strong>Оноо хэрхэн бодогдов?</strong><small>{verifiedCount}/8 үзүүлэлт бүрдсэн</small></span>
          <ChevronDown />
        </summary>
        <div className="rank-component-list">
          {data.components.map(item => <article key={item.key}>
            <span className={`rank-component-state ${item.data_status}`} aria-label={item.data_status === 'verified' ? 'Мэдээлэл бүрдсэн' : 'Мэдээлэл дутуу'}>{item.data_status === 'verified' ? <Check /> : <Database />}</span>
            <div><strong>{item.label}</strong><small>{item.target_status === 'met' ? 'Хангалттай' : item.target_status === 'not_met' ? 'Сайжруулах' : 'Хүлээгдэж байна'}</small></div>
            <strong className="rank-component-score">{item.score == null ? '—' : `${number.format(item.score)} / 100`}</strong>
          </article>)}
        </div>
      </details>

      <details className="rank-disclosure">
        <summary>
          <span><strong>Өмнөх өдрүүдийн оноо</strong><small>{data.history.length} өдөр</small></span>
          <ChevronDown />
        </summary>
        <div className="rank-history-list">
          {data.history.length ? data.history.map((row, index) => <article key={`${row.scoring_date}-${index}`}>
            <time>{shortDate(row.scoring_date)}</time>
            <strong>{row.calculated_rank_label || row.next_day_effective_rank_label}</strong>
            <span>{row.score == null ? '—' : `${number.format(row.score)} оноо`}</span>
          </article>) : <p>Өмнөх өдрийн оноо алга.</p>}
        </div>
      </details>
    </div>
  </section>
}
