import { useMemo, useState } from 'react'
import {
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardPenLine,
  HeartHandshake,
  Loader2,
  MessageSquareText,
  Plus,
  RefreshCw,
  UserRoundPen,
  X,
} from 'lucide-react'

import type { RequestHubData, RequestHubItem, RequestHubKind } from '../../api'

export type RequestCreateKind = 'leave' | 'attendance' | 'profile' | 'feedback'

type Filter = 'all' | 'pending' | 'resolved' | 'submitted'

const statusLabel: Record<RequestHubItem['status'], string> = {
  pending: 'Хүлээгдэж байна',
  approved: 'Зөвшөөрсөн',
  rejected: 'Татгалзсан',
  cancelled: 'Цуцалсан',
  withdrawn: 'Буцаан татсан',
  submitted: 'Илгээсэн',
}

const kindLabel: Record<RequestHubKind, string> = {
  leave: 'Чөлөө',
  attendance_correction: 'Ирц засвар',
  profile_change: 'Профайл өөрчлөх',
  team_feedback: 'Багийн санал',
}

const kindIcon = {
  leave: CalendarClock,
  attendance_correction: ClipboardPenLine,
  profile_change: UserRoundPen,
  team_feedback: MessageSquareText,
} satisfies Record<RequestHubKind, typeof CalendarClock>

const formattedDate = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/)
  if (!match) return value
  return `${Number(match[2])}-р сарын ${Number(match[3])}, ${match[4]}:${match[5]}`
}

function matchesFilter(item: RequestHubItem, filter: Filter) {
  if (filter === 'all') return true
  if (filter === 'pending') return item.status === 'pending'
  if (filter === 'submitted') return item.status === 'submitted'
  return ['approved', 'rejected', 'cancelled', 'withdrawn'].includes(item.status)
}

export function RequestHub({
  data,
  loading,
  unavailable,
  loadingMore,
  loadMoreFailed,
  onReload,
  onLoadMore,
  onOpenKind,
}: {
  data?: RequestHubData
  loading?: boolean
  unavailable?: boolean
  loadingMore?: boolean
  loadMoreFailed?: boolean
  onReload: () => void
  onLoadMore: () => void
  onOpenKind: (kind: RequestCreateKind) => void
}) {
  const [filter, setFilter] = useState<Filter>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const items = useMemo(
    () => (data?.items || []).filter(item => matchesFilter(item, filter)),
    [data?.items, filter],
  )

  const filters: Array<{ id: Filter; label: string }> = [
    { id: 'all', label: 'Бүгд' },
    { id: 'pending', label: 'Хүлээгдэж буй' },
    { id: 'resolved', label: 'Шийдэгдсэн' },
    { id: 'submitted', label: 'Илгээсэн' },
  ]

  const createItems: Array<{
    id: RequestCreateKind
    title: string
    detail: string
    icon: typeof CalendarClock
  }> = [
    { id: 'leave', title: 'Чөлөө авах', detail: 'Өдөр болон цагийн чөлөө', icon: CalendarClock },
    { id: 'attendance', title: 'Ирц засуулах', detail: 'Буруу эсвэл дутуу бүртгэл', icon: ClipboardPenLine },
    { id: 'profile', title: 'Профайл өөрчлөх', detail: 'Профайл зураг', icon: UserRoundPen },
    { id: 'feedback', title: 'Багийн санал', detail: 'Санал, санаа зовнил, дэмжлэг', icon: HeartHandshake },
  ]

  return (
    <section className="request-hub" aria-labelledby="request-hub-title">
      <header className="dancer-screen-header">
        <div>
          <h1 id="request-hub-title">Санал, хүсэлт</h1>
          <p>Илгээсэн зүйлсийн төлөв</p>
        </div>
        <button
          className="dancer-primary-link"
          type="button"
          aria-expanded={createOpen}
          aria-controls="request-create-menu"
          onClick={() => setCreateOpen(open => !open)}
        >
          {createOpen ? <X aria-hidden="true" /> : <Plus aria-hidden="true" />}
          {createOpen ? 'Хаах' : 'Шинэ хүсэлт'}
        </button>
      </header>

      {createOpen ? (
        <section id="request-create-menu" className="request-create-menu" aria-label="Хүсэлтийн төрөл">
          {createItems.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setCreateOpen(false)
                onOpenKind(item.id)
              }}
            >
              <item.icon aria-hidden="true" />
              <span><strong>{item.title}</strong><small>{item.detail}</small></span>
              <ChevronRight aria-hidden="true" />
            </button>
          ))}
        </section>
      ) : null}

      <div className="request-filter" role="tablist" aria-label="Хүсэлтийн төлөв">
        {filters.map(item => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={filter === item.id}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {data ? (
        <div className="request-summary" aria-label="Хүсэлтийн товч төлөв">
          <span><b>{data.summary.pending_count}</b> хүлээгдэж байна</span>
          <span><b>{data.summary.resolved_count}</b> шийдэгдсэн</span>
          <span><b>{data.summary.submitted_count}</b> санал илгээсэн</span>
        </div>
      ) : null}
      {data?.summary.pending_count ? <p className="request-pending-help">Хүлээгдэж буй хүсэлтийг цуцлуулах бол салбарын менежертэй холбогдоно уу.</p> : null}

      {loading && !data ? (
        <div className="dancer-inline-state" role="status">
          <Loader2 className="spin" aria-hidden="true" />
          Хүсэлтүүдийг ачаалж байна…
        </div>
      ) : unavailable && !data ? (
        <div className="dancer-inline-state is-error" role="alert">
          <strong>Төлөв ачаалсангүй</strong>
          <span>Хүсэлт гаргах боломж хэвээр байна.</span>
          <button type="button" onClick={onReload}><RefreshCw aria-hidden="true" /> Дахин оролдох</button>
        </div>
      ) : items.length ? (
        <div className="request-list" aria-live="polite">
          {items.map(item => {
            const Icon = kindIcon[item.kind]
            return (
              <article key={`${item.kind}:${item.id}`}>
                <span className="request-kind-icon"><Icon aria-hidden="true" /></span>
                <span className="request-list-copy">
                  <strong>{item.title || kindLabel[item.kind]}</strong>
                  <small>{item.detail || formattedDate(item.submitted_at)}</small>
                  {item.decision_reason ? <em>Шийдвэрийн тайлбар: {item.decision_reason}</em> : null}
                  <time dateTime={item.submitted_at}>{formattedDate(item.submitted_at)}</time>
                </span>
                <span className={`request-status is-${item.status}`}>
                  {item.status === 'approved' || item.status === 'submitted' ? <CheckCircle2 aria-hidden="true" /> : null}
                  {statusLabel[item.status]}
                </span>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="dancer-inline-state is-empty" role="status">
          <MessageSquareText aria-hidden="true" />
          <strong>{filter === 'all' ? 'Одоогоор хүсэлт алга' : 'Энэ төлөвт хүсэлт алга'}</strong>
          <span>Шинэ хүсэлт илгээвэл төлөв нь энд харагдана.</span>
        </div>
      )}

      {loading && data ? <p className="request-refreshing" role="status">Шинэчилж байна…</p> : null}
      {unavailable && data ? <p className="request-refreshing is-error" role="alert">Төлөв шинэчилсэнгүй. <button type="button" onClick={onReload}>Дахин оролдох</button></p> : null}
      {data?.next_cursor ? <div className="request-load-more">
        {loadMoreFailed ? <p role="alert">Өмнөх хүсэлтүүдийг ачаалсангүй.</p> : null}
        <button type="button" onClick={onLoadMore} disabled={loadingMore}>
          {loadingMore ? <Loader2 className="spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
          {loadingMore ? 'Ачаалж байна…' : loadMoreFailed ? 'Дахин оролдох' : 'Өмнөх хүсэлтүүдийг ачаалах'}
        </button>
      </div> : null}
    </section>
  )
}
