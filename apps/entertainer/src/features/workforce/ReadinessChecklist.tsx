import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, ClipboardCheck, Clock3, RefreshCw, XCircle } from 'lucide-react'
import { api, idempotencyKey } from '../../api'
import type { ReadinessQueueData, ReadinessQueueRow } from '../../api'
import './ReadinessChecklist.css'

const dateTime = new Intl.DateTimeFormat('mn-MN', {
  month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ulaanbaatar',
})
const formatWorkDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number)
  return year && month && day ? `${year} оны ${month}-р сарын ${day}` : value
}

const statusLabel = (status: ReadinessQueueRow['readiness_status']) => ({
  PENDING: 'Шалгаагүй', READY: 'Бэлэн', NOT_READY: 'Бэлэн бус',
})[status]

const notReadyReasons = [
  'Хувцаслалт/бүрдэл хангалтгүй',
  'Гоо сайхан, цэвэр байдал хангалтгүй',
  'Ажлын бэлтгэл хангалтгүй',
  'Бусад',
] as const

type NotReadyReason = typeof notReadyReasons[number] | ''

function orderReadinessQueue(rows: ReadinessQueueRow[], lastCompletedAssignment = '') {
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const priority = (row: ReadinessQueueRow) => row.readiness_status === 'PENDING'
        ? row.attendance.checked_in ? 0 : 1
        : 2
      const priorityDifference = priority(a.row) - priority(b.row)
      if (priorityDifference) return priorityDifference
      if (priority(a.row) === 2) {
        const aIsLatest = a.row.shift_assignment === lastCompletedAssignment
        const bIsLatest = b.row.shift_assignment === lastCompletedAssignment
        if (aIsLatest !== bIsLatest) return aIsLatest ? 1 : -1
        const aCheckedAt = String(a.row.readiness_checked_at || a.row.readiness_modified || '')
        const bCheckedAt = String(b.row.readiness_checked_at || b.row.readiness_modified || '')
        if (aCheckedAt && bCheckedAt && aCheckedAt !== bCheckedAt) return aCheckedAt.localeCompare(bCheckedAt)
      }
      return a.index - b.index
    })
    .map(({ row }) => row)
}

export function LeadReadinessChecklist({ branch }: { branch: string }) {
  const [data, setData] = useState<ReadinessQueueData>()
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Ready' | 'Not_Ready'>('All')
  const [selected, setSelected] = useState<ReadinessQueueRow>()
  const [reasonChoice, setReasonChoice] = useState<NotReadyReason>('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingAssignment, setSavingAssignment] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [lastCompletedAssignment, setLastCompletedAssignment] = useState('')
  const loadSequence = useRef(0)
  const requestKey = useRef('')
  const listRef = useRef<HTMLDivElement>(null)
  const orderedQueue = useMemo(() => orderReadinessQueue(data?.queue ?? [], lastCompletedAssignment), [data?.queue, lastCompletedAssignment])

  const load = useCallback(async (nextFilter = filter) => {
    const sequence = ++loadSequence.current
    setLoading(true)
    setError('')
    try {
      const value = await api.readinessQueue(nextFilter)
      if (sequence === loadSequence.current) setData(value)
    } catch (caught) {
      if (sequence === loadSequence.current) setError(caught instanceof Error ? caught.message : 'Бэлэн байдлын шалгалтыг ачаалж чадсангүй.')
    } finally {
      if (sequence === loadSequence.current) setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void load(filter)
    return () => { loadSequence.current += 1 }
  }, [filter, load])

  useEffect(() => {
    if (!lastCompletedAssignment) return
    const frame = window.requestAnimationFrame(() => {
      const nextRow = listRef.current?.querySelector<HTMLElement>('[data-readiness-actionable="true"]')
        ?? listRef.current?.querySelector<HTMLElement>('[data-readiness-pending="true"]')
      if (!nextRow) return
      nextRow.scrollIntoView({ behavior: 'smooth', block: 'center' })
      nextRow.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [data?.queue, lastCompletedAssignment])

  const selectFilter = (value: typeof filter) => {
    if (value === filter) return
    setFilter(value)
    setSelected(undefined)
    setMessage('')
  }

  const openNotReady = (row: ReadinessQueueRow) => {
    if (row.readiness_status !== 'PENDING' || !row.attendance.checked_in) return
    setSelected(row)
    setReasonChoice('')
    setReason('')
    setError('')
    setMessage('')
    requestKey.current = idempotencyKey('lead-readiness')
  }

  const saveReadiness = async (row: ReadinessQueueRow, result: 'READY' | 'NOT_READY', selectedReason: string, key: string) => {
    if (saving) return false
    setSaving(true)
    setSavingAssignment(row.shift_assignment)
    setError('')
    try {
      await api.submitReadiness({
        entertainer: row.entertainer,
        shift_assignment: row.shift_assignment,
        result,
        reason: result === 'NOT_READY' ? selectedReason : '',
        employee_checkin: row.attendance.employee_checkin,
      }, key)
      setMessage(`${row.stage_name || row.entertainer}: ${result === 'READY' ? 'ажилд бэлэн' : 'бэлэн бус'} гэж баталлаа.`)
      await load(filter)
      setLastCompletedAssignment(row.shift_assignment)
      return true
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Бэлэн байдлын шалгалтыг хадгалж чадсангүй.')
      return false
    } finally {
      setSaving(false)
      setSavingAssignment('')
    }
  }

  const markReady = async (row: ReadinessQueueRow) => {
    if (row.readiness_status !== 'PENDING' || !row.attendance.checked_in || saving) return
    setSelected(undefined)
    setMessage('')
    setError('')
    await saveReadiness(row, 'READY', '', idempotencyKey('lead-readiness-ready'))
  }

  const submitNotReady = async () => {
    if (!selected || saving || !reasonChoice || reason.trim().length < 3) return
    const selectedReason = reasonChoice === 'Бусад' ? reason.trim() : `${reasonChoice}: ${reason.trim()}`
    const saved = await saveReadiness(selected, 'NOT_READY', selectedReason, requestKey.current)
    if (saved) setSelected(undefined)
  }

  return <div className="page readiness-page">
    <header className="readiness-heading">
      <div><span className="eyebrow">{branch} салбар · Ахлах бүжигчин</span><h1>Өдрийн бэлэн байдлын шалгалт</h1><p>QR-аар ирцээ бүртгүүлсэн бүжигчний ажилд бэлэн байдлыг нэг удаа тэмдэглэнэ.</p></div>
      <button className="refresh-button" type="button" onClick={() => load()} disabled={loading}><RefreshCw className={loading ? 'spin' : ''} /><span>Шинэчлэх</span></button>
    </header>

    {data ? <section className="readiness-summary" aria-label="Бэлэн байдлын шалгалтын товч">
      <article><small>Нийт ээлж</small><strong>{data.summary.total}</strong></article>
      <article><small>Шалгаагүй</small><strong>{data.summary.pending}</strong></article>
      <article><small>Бэлэн</small><strong>{data.summary.ready}</strong></article>
      <article><small>Бэлэн бус</small><strong>{data.summary.not_ready}</strong></article>
    </section> : null}

    {data?.summary.total ? <section className="readiness-progress" aria-label="Өнөөдрийн шалгалтын явц">
      <div><span><strong>{data.summary.total - data.summary.pending}/{data.summary.total} шалгасан</strong><small>{data.summary.pending ? `${data.summary.pending} хүний шалгалт үлдсэн` : 'Өнөөдрийн шалгалт дууссан'}</small></span><b>{Math.round(((data.summary.total - data.summary.pending) / data.summary.total) * 100)}%</b></div>
      <progress max={data.summary.total} value={data.summary.total - data.summary.pending}>{data.summary.total - data.summary.pending}/{data.summary.total}</progress>
    </section> : null}

    <div className="readiness-toolbar">
      <div role="group" aria-label="Шалгалтын төлөвөөр шүүх">
        {([['All', 'Бүгд'], ['Pending', 'Шалгаагүй'], ['Ready', 'Бэлэн'], ['Not_Ready', 'Бэлэн бус']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} className={filter === value ? 'active' : ''} onClick={() => selectFilter(value)}>{label}</button>)}
      </div>
      <time dateTime={data?.work_date}>{data?.work_date ? formatWorkDate(data.work_date) : ''}</time>
    </div>

    {message ? <div className="readiness-message success" role="status"><CheckCircle2 />{message}</div> : null}
    {error && !selected ? <div className="readiness-message error" role="alert"><AlertTriangle />{error}<button type="button" onClick={() => load()}>Дахин оролдох</button></div> : null}

    {loading && !data ? <div className="readiness-loading"><RefreshCw className="spin" />Шалгалтын мэдээлэл ачаалж байна…</div> : orderedQueue.length ? <div className="readiness-list" ref={listRef}>
      {orderedQueue.map(row => <article
        key={row.shift_assignment}
        className={`readiness-row ${row.readiness_status.toLowerCase()}`}
        data-readiness-pending={row.readiness_status === 'PENDING' ? 'true' : undefined}
        data-readiness-actionable={row.readiness_status === 'PENDING' && row.attendance.checked_in ? 'true' : undefined}
      >
        <div className="readiness-person"><span className="readiness-avatar">{(row.stage_name || row.entertainer).slice(0, 1)}</span><span><strong>{row.stage_name || row.entertainer}</strong><small>{row.shift_type}</small></span></div>
        <div className={`readiness-evidence ${row.attendance.checked_in ? 'verified' : ''}`}><Clock3 /><span><small>QR ирц</small><strong>{row.attendance.checked_in ? row.attendance.checked_in_at ? dateTime.format(new Date(String(row.attendance.checked_in_at).replace(' ', 'T'))) : 'Бүртгэгдсэн' : 'Хүлээгдэж байна'}</strong></span></div>
        <div className={`readiness-result ${row.readiness_status.toLowerCase()}`}>{row.readiness_status === 'READY' ? <CheckCircle2 /> : row.readiness_status === 'NOT_READY' ? <XCircle /> : <ClipboardCheck />}<span><small>Бэлэн байдал</small><strong>{statusLabel(row.readiness_status)}</strong></span></div>
        {row.readiness_status === 'PENDING' ? row.attendance.checked_in ? <div className="readiness-actions" role="group" aria-label={`${row.stage_name || row.entertainer}-ийн бэлэн байдлыг батлах`}>
          <button type="button" className="readiness-decision ready" disabled={saving} onClick={() => void markReady(row)} aria-label={`${row.stage_name || row.entertainer}-г бэлэн гэж батлах`}>{savingAssignment === row.shift_assignment ? <RefreshCw className="spin" /> : <CheckCircle2 />}<span>Бэлэн</span></button>
          <button type="button" className="readiness-decision not-ready" disabled={saving} onClick={() => openNotReady(row)} aria-label={`${row.stage_name || row.entertainer}-г бэлэн бус гэж тэмдэглэх`}><XCircle /><span>Бэлэн бус</span></button>
        </div> : <button type="button" className="readiness-action" disabled>QR ирц хүлээж байна</button> : <span className="readiness-complete">Шалгасан</span>}
      </article>)}
    </div> : data ? <div className="readiness-empty"><ClipboardCheck /><strong>Энэ төлөвт шалгах хүн алга</strong><p>Шүүлтээ өөрчлөх эсвэл ээлжийн хуваарийг менежерээс шалгана уу.</p></div> : null}

    {selected ? <div className="readiness-editor-overlay" role="presentation" onMouseDown={event => { if (event.currentTarget === event.target && !saving) setSelected(undefined) }}>
      <section className="readiness-editor" role="dialog" aria-modal="true" aria-labelledby="readiness-editor-title">
        <header><div><span>Бэлэн бус шалтгаан</span><h2 id="readiness-editor-title">{selected.stage_name || selected.entertainer}</h2></div><button type="button" aria-label="Хаах" disabled={saving} onClick={() => setSelected(undefined)}><XCircle /></button></header>
        <div className="readiness-proof"><CheckCircle2 /><span><small>QR ирц</small><strong>Бүртгэгдсэн</strong></span></div>
        <div className="readiness-not-ready-note"><XCircle /><span><strong>Яагаад бэлэн бусыг тэмдэглэнэ</strong><small>Менежер зөвхөн энэ шалтгаан, тайлбарыг харна.</small></span></div>
        <fieldset className="readiness-reasons"><legend>Шалтгааны төрөл</legend><div role="radiogroup" aria-label="Бэлэн бус шалтгаан">{notReadyReasons.map(option => <button key={option} type="button" role="radio" aria-checked={reasonChoice === option} className={reasonChoice === option ? 'active' : ''} onClick={() => setReasonChoice(option)} disabled={saving}>{option}</button>)}</div><label><span>Тайлбар</span><textarea required value={reason} onChange={event => setReason(event.target.value)} placeholder="Юуг засах шаардлагатайг богино бичнэ үү" maxLength={300} disabled={saving} /></label></fieldset>
        {error ? <div className="readiness-editor-error" role="alert"><AlertTriangle />{error}</div> : null}
        <footer><button type="button" className="quiet-button" onClick={() => setSelected(undefined)} disabled={saving}>Болих</button><button type="button" className="readiness-submit-not-ready" onClick={() => void submitNotReady()} disabled={saving || !reasonChoice || reason.trim().length < 3}>{saving ? <RefreshCw className="spin" /> : <XCircle />}{saving ? 'Хадгалж байна…' : 'Бэлэн бус гэж хадгалах'}</button></footer>
      </section>
    </div> : null}
  </div>
}
