import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  HandCoins,
  Landmark,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  WalletCards,
} from 'lucide-react'

import {
  api,
  ENTERTAINER_LOAN_TERMS_VERSION,
  type LoanOverview,
} from '../../api'
import './LoanCenter.css'

const wholeNumber = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const formatMoney = (value: number) => `₮${wholeNumber.format(Number(value || 0))}`

const dateTime = new Intl.DateTimeFormat('mn-MN', {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

const formatDateTime = (value: string) => {
  const parsed = new Date(value.replace(' ', 'T'))
  return Number.isNaN(parsed.getTime()) ? value : dateTime.format(parsed)
}

const requestStatusLabel = (status: string) => ({
  Pending: 'Хүлээгдэж байна',
  Approved: 'Зөвшөөрсөн',
  Rejected: 'Татгалзсан',
  Disbursed: 'Олгосон',
  Repaid: 'Төлж дууссан',
  Cancelled: 'Цуцалсан',
}[status] || status)

const alignsWithStep = (value: number, step?: number, base = 0) => {
  if (!step || step <= 0) return true
  const quotient = (value - base) / step
  return Math.abs(quotient - Math.round(quotient)) < 0.000001
}

const hasLoanOverviewShape = (value?: LoanOverview): value is LoanOverview =>
  Boolean(value?.policy && value?.evidence && Array.isArray(value.required_decisions))

export function EntertainerLoanCenter({
  branch,
  initialData,
}: {
  branch: string
  initialData?: LoanOverview
}) {
  const [data, setData] = useState<LoanOverview | undefined>(initialData)
  const [loading, setLoading] = useState(!initialData)
  const [loadError, setLoadError] = useState('')
  const [requestedAmount, setRequestedAmount] = useState('')
  const [repaymentRate, setRepaymentRate] = useState('')
  const [purpose, setPurpose] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitState, setSubmitState] = useState<{ kind: 'success' | 'failed'; message: string }>()

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const overview = await api.loanOverview()
      if (!hasLoanOverviewShape(overview)) throw new Error('Зээлийн мэдээлэл бүрэн бус байна.')
      setData(overview)
      setRepaymentRate((current) => current || String(overview.policy.repayment_default ?? overview.policy.repayment_min ?? ''))
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Зээлийн мэдээллийг ачаалж чадсангүй.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initialData) {
      setData(initialData)
      setRepaymentRate((current) => current || String(initialData.policy.repayment_default ?? initialData.policy.repayment_min ?? ''))
      return
    }
    void load()
  }, [initialData, load])

  const active = data?.policy.status === 'Active' && data.policy.request_enabled
  const amount = Number(requestedAmount)
  const rate = Number(repaymentRate)
  const amountValid = Boolean(
    Number.isFinite(amount) &&
    amount > 0 &&
    (data?.evidence.maximum_amount === undefined || amount <= data.evidence.maximum_amount) &&
    alignsWithStep(amount, data?.policy.amount_step),
  )
  const rateValid = Boolean(
    Number.isFinite(rate) &&
    repaymentRate !== '' &&
    (data?.policy.repayment_min === undefined || rate >= data.policy.repayment_min) &&
    (data?.policy.repayment_max === undefined || rate <= data.policy.repayment_max) &&
    alignsWithStep(rate, data?.policy.repayment_step, data?.policy.repayment_min),
  )
  const canSubmit = Boolean(active && amountValid && rateValid && purpose.trim() && acceptedTerms && !submitting)

  const evidenceRows = useMemo(() => {
    if (!data) return []
    const rows: { label: string; value: string; note?: string }[] = [
      {
        label: 'Тооцоонд орсон орлого',
        value: formatMoney(data.evidence.verified_income),
        note: `${data.evidence.income_window.from}–${data.evidence.income_window.to}`,
      },
    ]
    if (data.evidence.three_month_average !== undefined)
      rows.push({ label: '3 сарын дундаж', value: formatMoney(data.evidence.three_month_average) })
    if (data.evidence.maximum_amount !== undefined)
      rows.push({ label: 'Хүсэх дээд дүн', value: formatMoney(data.evidence.maximum_amount) })
    if (data.evidence.outstanding_balance !== undefined && data.evidence.outstanding_balance !== null)
      rows.push({ label: 'Одоогийн үлдэгдэл', value: formatMoney(data.evidence.outstanding_balance) })
    if (data.evidence.current_rank)
      rows.push({ label: 'Одоогийн зэрэг', value: data.evidence.current_rank })
    if (data.evidence.tenure_days !== undefined && data.evidence.tenure_days !== null)
      rows.push({ label: 'Ажилласан хугацаа', value: `${data.evidence.tenure_days} өдөр` })
    return rows
  }, [data])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setSubmitState(undefined)
    try {
      await api.submitLoanRequest(amount, rate, purpose.trim(), {
        accepted_terms: true,
        terms_version: ENTERTAINER_LOAN_TERMS_VERSION,
      })
      setSubmitState({ kind: 'success', message: 'Зээлийн хүсэлтийг илгээлээ.' })
      setRequestedAmount('')
      setPurpose('')
      setAcceptedTerms(false)
      await load()
    } catch (error) {
      setSubmitState({
        kind: 'failed',
        message: error instanceof Error ? error.message : 'Зээлийн хүсэлтийг илгээж чадсангүй.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading && !data)
    return <section className="loan-center loan-state" aria-live="polite"><Loader2 className="spin" />Зээлийн мэдээлэл ачаалж байна…</section>

  if (loadError && !data)
    return <section className="loan-center loan-state failed" role="alert">
      <AlertCircle />
      <strong>Зээлийн мэдээллийг ачаалж чадсангүй</strong>
      <p>{loadError}</p>
      <button type="button" onClick={() => void load()}><RefreshCw /> Дахин оролдох</button>
    </section>

  if (!data) return null

  return <section className="loan-center" aria-labelledby="loan-title">
    <header className="loan-hero">
      <span aria-hidden="true"><HandCoins /></span>
      <div>
        <small>{branch} салбар</small>
        <h1 id="loan-title">Зээл</h1>
        <p>{data.policy.message}</p>
      </div>
      <em className={active ? 'is-open' : ''}>{active ? 'Хүсэлт авч байна' : 'Одоогоор хаалттай'}</em>
    </header>

    <div className="loan-limit" aria-label="Зээлийн товч мэдээлэл">
      {data.evidence.maximum_amount !== undefined ? <article>
        <small>Хүсэх дээд дүн</small>
        <strong>{formatMoney(data.evidence.maximum_amount)}</strong>
      </article> : null}
      {data.evidence.outstanding_balance !== undefined && data.evidence.outstanding_balance !== null ? <article>
        <small>Одоогийн үлдэгдэл</small>
        <strong>{formatMoney(data.evidence.outstanding_balance)}</strong>
      </article> : null}
      {data.policy.repayment_min !== undefined || data.policy.repayment_max !== undefined ? <article>
        <small>Эргэн төлөх хувь</small>
        <strong>{data.policy.repayment_min ?? '—'}–{data.policy.repayment_max ?? '—'}%</strong>
      </article> : null}
    </div>

    <div className={`loan-policy-note ${active ? 'is-open' : ''}`}>
      {active ? <ShieldCheck aria-hidden="true" /> : <AlertCircle aria-hidden="true" />}
      <span>
        <strong>{active ? 'Хүсэлт илгээх боломжтой' : 'Зээлийн хүсэлт нээгдээгүй байна'}</strong>
        <p>{data.policy.message}</p>
      </span>
    </div>

    {data.required_decisions.length ? <ul className="loan-blockers" aria-label="Шаардлагатай шийдвэр">
      {data.required_decisions.map((decision) => <li key={decision}><AlertCircle aria-hidden="true" />{decision}</li>)}
    </ul> : null}

    {data.evidence.blocking_reasons?.length ? <ul className="loan-blockers" aria-label="Хүсэлтэд саад болж буй нөхцөл">
      {data.evidence.blocking_reasons.map((reason) => <li key={reason}><AlertCircle aria-hidden="true" />{reason}</li>)}
    </ul> : null}

    <details className="loan-income-evidence">
      <summary>
        <span><strong>Тооцооны мэдээлэл</strong><small>Лимитэд ашигласан өгөгдлийг харах</small></span>
        <ChevronDown aria-hidden="true" />
      </summary>
      <div>
        {evidenceRows.map((row) => <article key={row.label}>
          <span>{row.label}{row.note ? <small>{row.note}</small> : null}</span>
          <strong>{row.value}</strong>
        </article>)}
      </div>
    </details>

    {active ? <form className="loan-request-form" onSubmit={(event) => void submit(event)}>
      <header><small>Шинэ хүсэлт</small><h2>Зээлийн хүсэлт илгээх</h2></header>

      <label>
        <span>Хүсэх дүн {data.evidence.maximum_amount !== undefined ? <b>Дээд тал нь {formatMoney(data.evidence.maximum_amount)}</b> : null}</span>
        <input
          type="number"
          inputMode="numeric"
          min="0"
          max={data.evidence.maximum_amount}
          step={data.policy.amount_step || 'any'}
          value={requestedAmount}
          onChange={(event) => setRequestedAmount(event.target.value)}
          aria-invalid={requestedAmount !== '' && !amountValid}
          required
        />
      </label>

      <label>
        <span>Эргэн төлөх хувь <b>{repaymentRate ? `${repaymentRate}%` : 'Сонгоно уу'}</b></span>
        <input
          type="number"
          inputMode="decimal"
          min={data.policy.repayment_min}
          max={data.policy.repayment_max}
          step={data.policy.repayment_step || 'any'}
          value={repaymentRate}
          onChange={(event) => setRepaymentRate(event.target.value)}
          aria-invalid={repaymentRate !== '' && !rateValid}
          required
        />
      </label>
      {data.policy.repayment_min !== undefined || data.policy.repayment_max !== undefined ? <div className="loan-form-meta">
        <span>Доод {data.policy.repayment_min ?? '—'}%</span>
        <strong>Сонгосон {repaymentRate || '—'}%</strong>
        <span>Дээд {data.policy.repayment_max ?? '—'}%</span>
      </div> : null}

      <label>
        <span>Зээлийн зориулалт</span>
        <textarea value={purpose} onChange={(event) => setPurpose(event.target.value)} required />
      </label>

      <div className="loan-estimate">
        <Landmark aria-hidden="true" />
        <span><small>Таны оруулсан хүсэлт</small><strong>{amountValid ? formatMoney(amount) : 'Дүн оруулна уу'}</strong><em>{rateValid ? `Орлогоос ${rate}% төлнө` : 'Эргэн төлөх хувийг шалгана уу'}</em></span>
      </div>

      <details className="loan-terms-disclosure">
        <summary><span><strong>Зээлийн нөхцөл</strong><small>Зөвшөөрөхөөс өмнө уншина уу</small></span><ChevronDown aria-hidden="true" /></summary>
        <ul>
          {data.evidence.maximum_amount !== undefined ? <li>Хүсэх дүн {formatMoney(data.evidence.maximum_amount)}-өөс хэтрэхгүй.</li> : null}
          <li>Сонгосон {repaymentRate || '—'}%-ийг орлогоос эргэн төлөх тооцоонд ашиглана.</li>
          {data.policy.interest_percent !== undefined ? <li>Хүү: {data.policy.interest_percent}%.</li> : null}
          <li>Хүсэлт илгээснээр зээл шууд олгогдохгүй; шийдвэрийн төлөв түүхэнд харагдана.</li>
        </ul>
        <small>Нөхцөлийн хувилбар: {ENTERTAINER_LOAN_TERMS_VERSION}</small>
      </details>

      <label className="loan-terms">
        <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} />
        <span>Оруулсан мэдээлэл зөв бөгөөд дээрх зээлийн нөхцөлийг уншиж зөвшөөрсөн.</span>
      </label>

      {submitState ? <p className={`loan-message ${submitState.kind}`} role={submitState.kind === 'failed' ? 'alert' : 'status'}>
        {submitState.kind === 'success' ? <CheckCircle2 /> : <AlertCircle />}{submitState.message}
      </p> : null}

      <button className="loan-primary" type="submit" disabled={!canSubmit}>
        {submitting ? <Loader2 className="spin" /> : <Send />}
        {submitting ? 'Илгээж байна…' : 'Хүсэлт илгээх'}
      </button>
    </form> : null}

    <section className="loan-history" aria-labelledby="loan-history-title">
      <header><small>Миний хүсэлтүүд</small><h2 id="loan-history-title">Хүсэлтийн түүх</h2></header>
      {data.requests?.length ? [...data.requests]
        .sort((left, right) => right.requested_at.localeCompare(left.requested_at))
        .map((request) => <article key={request.name}>
          <span>
            <strong>{formatMoney(request.requested_amount)} · {request.repayment_rate}%</strong>
            <small>{formatDateTime(request.requested_at)} · {request.purpose}</small>
          </span>
          <b>{requestStatusLabel(request.status)}</b>
        </article>) : <div className="loan-history-empty"><WalletCards aria-hidden="true" /><span><strong>Хүсэлт алга</strong><small>Таны илгээсэн хүсэлт энд харагдана.</small></span></div>}
    </section>
  </section>
}
