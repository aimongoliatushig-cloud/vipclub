import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  ContactRound,
  FileBarChart,
  Gem,
  LayoutDashboard,
  ListChecks,
  LoaderCircle,
  LogOut,
  Menu,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  WalletCards,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import type { ManagementSession } from '../shared/managementAccess'
import {
  FrappeManagementApi,
  type BranchSalesGoalRecord,
  type BranchSalesProgress,
  type CompanyDashboard,
  type LeaveRequest,
  type ManagerCustomerRow,
  type ManagerDashboard,
  type ManagerSchedule,
  type ManagerTeam,
  type PenaltyRow,
  type UnassignedEmployee,
} from '../services/managementApi'
import { formatDate, formatDateTime, formatMoney } from '../features/workforce/localization'
import '../styles.css'

type ManagerView = 'overview' | 'schedule' | 'team' | 'leave' | 'penalties' | 'crm' | 'rankings' | 'goals'
type CeoView = 'overview' | 'branches' | 'goals' | 'approvals' | 'crm' | 'workforce' | 'penalties' | 'finance' | 'tasks' | 'messages' | 'hermes' | 'reports'
type LiveView = ManagerView | CeoView

interface NavigationItem {
  id: LiveView
  label: string
  icon: LucideIcon
  badge?: number
}

const managerNavigation: NavigationItem[] = [
  { id: 'overview', label: 'Менежерийн тойм', icon: LayoutDashboard },
  { id: 'schedule', label: 'Хуваарь', icon: CalendarDays },
  { id: 'team', label: 'Миний баг', icon: Users },
  { id: 'leave', label: 'Чөлөөний хүсэлт', icon: ClipboardCheck },
  { id: 'penalties', label: 'Хоцролт, торгууль', icon: ShieldAlert },
  { id: 'crm', label: 'Харилцагчийн CRM', icon: ContactRound },
  { id: 'rankings', label: 'Зэрэглэлийн хяналт', icon: Gem },
  { id: 'goals', label: 'Борлуулалтын зорилго', icon: Target },
]

const ceoNavigation: NavigationItem[] = [
  { id: 'overview', label: 'Удирдлагын төв', icon: LayoutDashboard },
  { id: 'branches', label: 'Салбарууд', icon: Building2 },
  { id: 'goals', label: 'Борлуулалт ба зорилт', icon: Target },
  { id: 'approvals', label: 'Шийдвэрүүд', icon: BadgeCheck },
  { id: 'crm', label: 'Харилцагч ба CRM', icon: ContactRound },
  { id: 'workforce', label: 'Ажиллах хүч', icon: Users },
  { id: 'penalties', label: 'Ирц ба торгууль', icon: ShieldAlert },
  { id: 'finance', label: 'Санхүү ба тооцоо', icon: WalletCards },
  { id: 'tasks', label: 'Даалгавар', icon: ListChecks },
  { id: 'messages', label: 'Мессеж', icon: MessageSquare },
  { id: 'hermes', label: 'Hermes зөвлөмж', icon: Sparkles },
  { id: 'reports', label: 'Тайлан, шинжилгээ', icon: FileBarChart },
]

const statusLabels: Record<string, string> = {
  checked_in: 'Ажилдаа ирсэн', late: 'Хоцорсон', absent: 'Ирээгүй', scheduled: 'Хуваарьтай',
  leave: 'Чөлөөтэй', off: 'Ээлжгүй', Pending: 'Хүлээгдэж байна', Approved: 'Зөвшөөрсөн',
  Rejected: 'Татгалзсан', Cancelled: 'Цуцалсан', 'Pending Review': 'Хяналт хүлээж байна',
  Reversed: 'Буцаасан', Active: 'Батлагдсан', Submitted: 'CEO-ийн шийдвэр хүлээж байна',
  Draft: 'Ноорог', 'Revision Requested': 'Засвар хүссэн', Late: 'Хоцролт', Absence: 'Таслалт',
  'Black Diamond': 'Хар алмаз', Diamond: 'Алмаз', Gold: 'Алт', Silver: 'Мөнгө', Bronze: 'Хүрэл',
  Unassigned: 'Түвшингүй', 'Rank 1': 'Зэрэглэл 1', 'Rank 2': 'Зэрэглэл 2', 'Rank 3': 'Зэрэглэл 3',
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function startOfWeek(value = new Date()): string {
  const date = new Date(value)
  date.setHours(12, 0, 0, 0)
  const day = date.getDay() || 7
  date.setDate(date.getDate() - day + 1)
  return dateKey(date)
}

function addDays(value: string, days: number): string {
  const date = new Date(`${value}T12:00:00`)
  date.setDate(date.getDate() + days)
  return dateKey(date)
}

function daysInMonth(value: string): number {
  const [year, month] = value.split('-').map(Number)
  return new Date(year, month, 0).getDate()
}

function monthLabel(value: string): string {
  const [year, month] = value.split('-').map(Number)
  const months = ['1-р сар', '2-р сар', '3-р сар', '4-р сар', '5-р сар', '6-р сар', '7-р сар', '8-р сар', '9-р сар', '10-р сар', '11-р сар', '12-р сар']
  return `${year} оны ${months[month - 1] ?? `${month}-р сар`}`
}

function stateLabel(value?: string | null): string {
  if (!value) return 'Тодорхойгүй'
  return statusLabels[value] ?? value
}

function LoadingState({ label = 'NextERP-ээс мэдээлэл ачаалж байна…' }: { label?: string }) {
  return <div className="live-loading" role="status"><LoaderCircle size={24} /><span>{label}</span></div>
}

function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="live-error" role="alert"><AlertTriangle size={22} /><div><strong>Мэдээлэл ачаалж чадсангүй</strong><span>{message}</span></div>{retry ? <button type="button" onClick={retry}><RefreshCw size={16} />Дахин оролдох</button> : null}</div>
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <header className="live-page-heading"><div><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</header>
}

function Metric({ label, value, hint, icon: Icon, tone = 'blue' }: { label: string; value: ReactNode; hint: string; icon: LucideIcon; tone?: string }) {
  return <article className="live-metric" data-tone={tone}><i><Icon size={20} /></i><span>{label}</span><strong>{value}</strong><small>{hint}</small></article>
}

function Progress({ value, label }: { value: number; label: string }) {
  const safe = Math.max(0, Math.min(value, 100))
  return <div className="live-progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)}><span style={{ width: `${safe}%` }} /></div>
}

function ScopeBadge({ session }: { session: ManagementSession }) {
  return <span className="live-scope"><BadgeCheck size={14} />{session.role === 'ceo' ? 'Компанийн бүх салбар' : session.branchIds[0]}</span>
}

interface ManagerData {
  sales: BranchSalesProgress
  dashboard: ManagerDashboard
  team: ManagerTeam
  leaves: LeaveRequest[]
  penalties: PenaltyRow[]
  customers: ManagerCustomerRow[]
  customerTotal: number
}

function ManagerOverview({ data, onNavigate }: { data: ManagerData; onNavigate: (view: ManagerView) => void }) {
  const goal = data.sales.active_goal
  const target = goal?.approved_target ?? 0
  const percent = data.sales.achievement_percent ?? 0
  return <>
    <PageHeading eyebrow={`${data.dashboard.branch} салбар · ${monthLabel(data.sales.month)}`} title="Менежерийн тойм" description="Борлуулалтын зорилго, багийн өнөөдрийн төлөв болон таны шийдвэрлэх хүсэлтийг бодит NextERP мэдээллээс харуулна." />
    <section className="live-sales-hero">
      <header><div><span>Энэ сарын борлуулалтын зорилго</span><h2>{goal ? `${Math.round(percent)}% биелэлт` : 'Батлагдсан зорилго хүлээгдэж байна'}</h2></div><CircleDollarSign size={28} /></header>
      <div><span><small>Бодит борлуулалт</small><strong>{formatMoney(data.sales.actual_sales)}</strong></span><span><small>Миний салбарын зорилго</small><strong>{goal ? formatMoney(target) : '—'}</strong></span><span><small>Үлдсэн</small><strong>{goal ? formatMoney(data.sales.remaining_amount ?? 0) : '—'}</strong></span></div>
      <Progress value={percent} label="Салбарын борлуулалтын зорилгын биелэлт" />
      <footer><span>{goal ? `CEO баталсан · ${stateLabel(goal.state)} · ${data.sales.actual_source}` : 'Менежер саналаа бэлтгэж CEO-д илгээх боломжтой.'}</span><button type="button" onClick={() => onNavigate('goals')}>Зорилго удирдах<ChevronRight size={16} /></button></footer>
    </section>
    <section className="live-metrics">
      <Metric icon={Users} label="Идэвхтэй баг" value={data.team.meta.total} hint={`${data.team.meta.entertainer_total} энтертайнер`} />
      <Metric icon={CalendarDays} label="Өнөөдрийн хуваарь" value={data.dashboard.summary.scheduled} hint={`${data.dashboard.summary.off} ээлжгүй`} tone="violet" />
      <Metric icon={ClipboardCheck} label="Чөлөөний хүсэлт" value={data.dashboard.summary.pending_leave} hint="Менежерийн шийдвэр хүлээж байна" tone={data.dashboard.summary.pending_leave ? 'amber' : 'green'} />
      <Metric icon={ShieldAlert} label="Торгуулийн хяналт" value={data.penalties.filter((item) => item.status === 'Pending Review').length} hint="Хоцролт, таслалтын нотолгоо" tone={data.penalties.some((item) => item.status === 'Pending Review') ? 'red' : 'green'} />
    </section>
    <div className="live-two-columns">
      <section className="live-panel"><header><div><span>Өнөөдөр</span><h2>Энтертайнерийн ирц ба бэлэн байдал</h2></div><button type="button" onClick={() => onNavigate('team')}>Бүх багийг харах</button></header><div className="live-list">{data.dashboard.roster.slice(0, 6).map((row) => <article key={row.profile}><span className="live-avatar">{row.display_name.slice(0, 2)}</span><div><strong>{row.display_name}</strong><small>{stateLabel(row.rank)} · {row.shift?.shift_type ?? 'Ээлжгүй'}</small></div><b data-state={row.status}>{stateLabel(row.status)}</b></article>)}{!data.dashboard.roster.length ? <p className="live-empty">Энэ салбарт идэвхтэй энтертайнерийн бүртгэл алга.</p> : null}</div></section>
      <section className="live-panel"><header><div><span>Шийдвэрлэх ажил</span><h2>Менежерийн дараалал</h2></div></header><div className="live-action-list"><button type="button" onClick={() => onNavigate('leave')}><ClipboardCheck size={19} /><span><strong>Чөлөөний хүсэлт</strong><small>Зөвшөөрөх эсвэл татгалзах</small></span><b>{data.leaves.filter((item) => item.status === 'Pending').length}</b></button><button type="button" onClick={() => onNavigate('penalties')}><ShieldAlert size={19} /><span><strong>Хоцролт, таслалт</strong><small>Нотолгоо шалгаж шийдвэрлэх</small></span><b>{data.penalties.filter((item) => item.status === 'Pending Review').length}</b></button><button type="button" onClick={() => onNavigate('crm')}><ContactRound size={19} /><span><strong>CRM хайлт</strong><small>Нэр, утас, зарцуулалт</small></span><b>{data.customerTotal}</b></button></div></section>
    </div>
  </>
}

function ScheduleView({ api }: { api: FrappeManagementApi }) {
  const [mode, setMode] = useState<'week' | 'month'>('week')
  const [anchor, setAnchor] = useState(startOfWeek())
  const [schedule, setSchedule] = useState<ManagerSchedule | null>(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<{ profile: string; name: string; date: string; assignment?: { name: string; shift_type: string; modified: string } | null } | null>(null)
  const [shiftType, setShiftType] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setError('')
    setSchedule(null)
    const start = mode === 'week' ? startOfWeek(new Date(`${anchor}T12:00:00`)) : `${anchor.slice(0, 7)}-01`
    try { setSchedule(await api.getSchedule(start, mode === 'week' ? 7 : daysInMonth(start.slice(0, 7)))) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Хуваарь ачаалж чадсангүй.') }
  }, [anchor, api, mode])

  useEffect(() => { void load() }, [load])

  function changePeriod(direction: number) {
    if (mode === 'week') setAnchor((value) => addDays(value, direction * 7))
    else {
      const date = new Date(`${anchor.slice(0, 7)}-01T12:00:00`)
      date.setMonth(date.getMonth() + direction)
      setAnchor(dateKey(date))
    }
  }

  function openEditor(profile: string, name: string, date: string, assignment?: { name: string; shift_type: string; modified: string } | null) {
    setEditing({ profile, name, date, assignment })
    setShiftType(assignment?.shift_type ?? schedule?.shift_types[0]?.name ?? '')
    setReason('')
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!editing) return
    if (reason.trim().length < 5) { setError('Хуваарь өөрчилсөн шалтгааныг 5-аас дээш тэмдэгтээр бичнэ үү.'); return }
    setSaving(true)
    try {
      await api.setSchedule({ profileName: editing.profile, workDate: editing.date, shiftType, reason, expectedAssignment: editing.assignment?.name, expectedModified: editing.assignment?.modified })
      setEditing(null)
      await load()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Хуваарь хадгалж чадсангүй.') }
    finally { setSaving(false) }
  }

  return <>
    <PageHeading eyebrow="Ажиллах хүчний төлөвлөлт" title="Багийн хуваарь" description="Долоо хоног болон сарын хуваарийг NextERP-ийн Shift Assignment бүртгэлээр харж, ирээдүйн ээлжийг шалтгаантайгаар өөрчилнө." action={<div className="live-segment"><button className={mode === 'week' ? 'active' : ''} type="button" onClick={() => setMode('week')}>7 хоног</button><button className={mode === 'month' ? 'active' : ''} type="button" onClick={() => setMode('month')}>Сар</button></div>} />
    <section className="live-period"><button type="button" aria-label="Өмнөх хугацаа" onClick={() => changePeriod(-1)}><ChevronLeft /></button><strong>{mode === 'week' ? `${formatDate(anchor)} – ${formatDate(addDays(startOfWeek(new Date(`${anchor}T12:00:00`)), 6))}` : monthLabel(anchor.slice(0, 7))}</strong><button type="button" aria-label="Дараах хугацаа" onClick={() => changePeriod(1)}><ChevronRight /></button></section>
    {error ? <ErrorState message={error} retry={load} /> : null}
    {!schedule ? <LoadingState label="Хуваарь ачаалж байна…" /> : <section className="live-schedule-panel"><div className="live-schedule-scroll"><table><thead><tr><th>Багийн гишүүн</th>{schedule.dates.map((date) => <th key={date}><span>{formatDate(date, { weekday: 'short' })}</span><strong>{new Date(`${date}T12:00:00`).getDate()}</strong></th>)}</tr></thead><tbody>{schedule.people.map((person) => <tr key={person.profile}><th><span className="live-avatar">{person.display_name.slice(0, 2)}</span><span><strong>{person.display_name}</strong><small>{person.rank ?? 'Зэрэглэлгүй'}</small></span></th>{person.days.map((day) => <td key={day.date}><button disabled={!day.editable} type="button" onClick={() => openEditor(person.profile, person.display_name, day.date, day.assignment)} data-assigned={Boolean(day.assignment)}>{day.assignment ? <><strong>{day.assignment.shift_type}</strong><small>Засах</small></> : <><span>+</span><small>{day.editable ? 'Ээлж өгөх' : 'Өнгөрсөн'}</small></>}</button></td>)}</tr>)}</tbody></table></div>{!schedule.people.length ? <p className="live-empty">Энэ салбарт хуваарьт оруулах идэвхтэй гишүүн алга.</p> : null}</section>}
    {editing ? <div className="live-modal" role="presentation"><form onSubmit={save}><header><div><span>Ээлжийн тохиргоо</span><h2>{editing.name} · {formatDate(editing.date)}</h2></div><button type="button" aria-label="Хаах" onClick={() => setEditing(null)}><X /></button></header><label><span>Ээлжийн төрөл</span><select value={shiftType} onChange={(event) => setShiftType(event.target.value)}><option value="">Ээлжгүй болгох</option>{schedule?.shift_types.map((shift) => <option key={shift.name} value={shift.name}>{shift.name} · {shift.start_time}–{shift.end_time}</option>)}</select></label><label><span>Өөрчлөлтийн шалтгаан</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} placeholder="Жишээ: Зөвшөөрсөн чөлөөг нөхөн хуваарилав" /></label><footer><button type="button" onClick={() => setEditing(null)}>Цуцлах</button><button className="live-button--primary" disabled={saving} type="submit">{saving ? 'Хадгалж байна…' : 'Хуваарь хадгалах'}</button></footer></form></div> : null}
  </>
}

function TeamView({ team }: { team: ManagerTeam }) {
  const [search, setSearch] = useState('')
  const rows = useMemo(() => team.members.filter((row) => `${row.display_name} ${row.role_label}`.toLocaleLowerCase('mn').includes(search.trim().toLocaleLowerCase('mn'))), [team.members, search])
  const scheduled = team.members.filter((row) => row.shift).length
  return <><PageHeading eyebrow={`${team.branch} салбар`} title="Миний баг" description="Салбарт оноогдсон бүх идэвхтэй ажилтан, энтертайнерийн албан тушаал болон өнөөдрийн ээлжийг нэг дор шалгана." action={<label className="live-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Нэр, албан тушаалаар хайх" /></label>} /><section className="live-metrics"><Metric icon={Users} label="Нийт баг" value={team.meta.total} hint="Салбарт оноогдсон идэвхтэй ажилтан" /><Metric icon={Gem} label="Энтертайнер" value={team.meta.entertainer_total} hint="Идэвхтэй энтертайнерийн профайл" tone="violet" /><Metric icon={CalendarDays} label="Өнөөдрийн ээлжтэй" value={scheduled} hint={`${team.meta.total - scheduled} ээлжгүй`} tone="green" /></section><section className="live-panel"><div className="live-table-list"><div className="head"><span>Гишүүн</span><span>Албан тушаал</span><span>Төрөл</span><span>Ээлж</span><span>Төлөв</span></div>{rows.map((row) => <article key={row.employee}><span><i className="live-avatar">{row.display_name.slice(0, 2)}</i><strong>{row.display_name}</strong></span><span>{row.role_label}</span><span>{row.member_type === 'Entertainer' ? `Энтертайнер${row.rank ? ` · ${stateLabel(row.rank)}` : ''}` : 'Ажилтан'}</span><span>{row.shift?.shift_type ?? 'Ээлжгүй'}</span><b data-state={row.status}>{row.status === 'Active' ? 'Идэвхтэй' : stateLabel(row.status)}</b></article>)}</div>{!rows.length ? <p className="live-empty">Тохирох багийн гишүүн олдсонгүй.</p> : null}</section></>
}

function LeaveView({ api, requests, onRefresh }: { api: FrappeManagementApi; requests: LeaveRequest[]; onRefresh: () => Promise<void> }) {
  const [status, setStatus] = useState('All')
  const [busy, setBusy] = useState('')
  const filtered = requests.filter((item) => status === 'All' || item.status === status)
  async function decide(item: LeaveRequest, decision: 'Approved' | 'Rejected') {
    const reason = decision === 'Rejected' ? window.prompt('Татгалзсан шалтгааныг бичнэ үү:') : ''
    if (reason === null || (decision === 'Rejected' && !reason.trim())) return
    setBusy(item.name)
    try { await api.decideLeave(item.name, decision, reason, item.modified, item.source_type); await onRefresh() }
    finally { setBusy('') }
  }
  return <><PageHeading eyebrow="Ирц ба хүний нөөц" title="Чөлөө, амралтын өдрийн хүсэлт" description="Салбарын бүх ажилтны NextERP Leave Application болон энтертайнерийн гэнэтийн чөлөөний хүсэлтийг нэг дарааллаас шалгаж, зөвшөөрөх эсвэл үндэслэлтэй татгалзана." action={<select className="live-select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="All">Бүх төлөв</option><option value="Pending">Хүлээгдэж буй</option><option value="Approved">Зөвшөөрсөн</option><option value="Rejected">Татгалзсан</option></select>} /><section className="live-card-grid">{filtered.map((item) => <article className="live-request-card" key={`${item.source_type ?? 'Emergency Leave'}:${item.name}`}><header><span className="live-avatar">{item.display_name.slice(0, 2)}</span><div><h2>{item.display_name}</h2><p>{formatDate(item.leave_date, { year: 'numeric', month: 'long', day: 'numeric' })}{item.to_date && item.to_date !== item.leave_date ? ` – ${formatDate(item.to_date)}` : ''}</p></div><b data-state={item.status}>{stateLabel(item.status)}</b></header><blockquote>{item.reason}</blockquote><dl><div><dt>Хүсэлт гаргасан</dt><dd>{formatDateTime(item.requested_at)}</dd></div><div><dt>Хүсэлтийн төрөл</dt><dd>{item.source_type === 'Leave Application' ? `ERP чөлөө${item.leave_type ? ` · ${item.leave_type}` : ''}` : 'Гэнэтийн чөлөө'}</dd></div><div><dt>Салбар</dt><dd>{item.branch}</dd></div></dl>{item.decision_reason ? <p className="live-decision-note"><strong>Шийдвэрийн тайлбар:</strong> {item.decision_reason}</p> : null}{item.status === 'Pending' ? <footer><button disabled={busy === item.name} type="button" onClick={() => void decide(item, 'Rejected')}>Татгалзах</button><button className="live-button--primary" disabled={busy === item.name} type="button" onClick={() => void decide(item, 'Approved')}>Зөвшөөрөх</button></footer> : null}</article>)}{!filtered.length ? <p className="live-empty live-empty--card">Сонгосон төлөвт чөлөөний хүсэлт алга.</p> : null}</section></>
}

function PenaltiesView({ api, penalties, canDecide, branch, onRefresh }: { api: FrappeManagementApi; penalties: PenaltyRow[]; canDecide: boolean; branch?: string; onRefresh?: () => Promise<void> }) {
  const [status, setStatus] = useState('All')
  const [busy, setBusy] = useState('')
  const filtered = penalties.filter((item) => status === 'All' || item.status === status)
  async function decide(item: PenaltyRow, decision: 'Approved' | 'Rejected' | 'Reversed') {
    const reason = window.prompt(decision === 'Reversed' ? 'Буцаалтын шалтгааныг бичнэ үү:' : 'Шийдвэрийн үндэслэлийг 5-аас дээш тэмдэгтээр бичнэ үү:')
    if (!reason?.trim() || (decision !== 'Reversed' && reason.trim().length < 5)) return
    setBusy(item.name)
    try {
      if (decision === 'Reversed') await api.reversePenalty(item.name, reason, item.modified)
      else await api.decidePenalty(item.name, decision, reason, item.modified)
      await onRefresh?.()
    } finally { setBusy('') }
  }
  return <><PageHeading eyebrow={branch ? `${branch} салбар` : 'Компанийн ирцийн хяналт'} title="Хоцролт, таслалт ба торгуулийн хяналт" description={canDecide ? 'Автоматаар илэрсэн нотолгоог шалгасны дараа зөвшөөрөх, татгалзах эсвэл батлагдсан шийдвэрийг буцаана.' : 'Салбарын торгуулийн нотолгоо ба менежерийн шийдвэрийн төлөвийг хянана.'} action={<select className="live-select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="All">Бүх төлөв</option><option value="Pending Review">Хяналт хүлээж буй</option><option value="Approved">Зөвшөөрсөн</option><option value="Rejected">Татгалзсан</option><option value="Reversed">Буцаасан</option></select>} /><section className="live-policy-note"><ShieldAlert size={19} /><div><strong>Шийдвэр бүр аудиттай</strong><span>Хоцролтын минут, таслалтын өдөр, эх нотолгоо болон шийдвэрийн тайлбар хадгалагдана. Бодлогын мөнгөн дүнг зөвхөн батлагдсан дүрмийн хүрээнд хэрэглэнэ.</span></div></section><section className="live-card-grid">{filtered.map((item) => <article className="live-request-card" key={item.name}><header><span className="live-avatar">{item.display_name.slice(0, 2)}</span><div><h2>{item.display_name}</h2><p>{formatDate(item.attendance_date)} · {stateLabel(item.penalty_type)}</p></div><b data-state={item.status}>{stateLabel(item.status)}</b></header><div className="live-penalty-facts"><span><small>Хоцролт</small><strong>{item.late_minutes || 0} минут</strong></span><span><small>Бодлогын дүн</small><strong>{item.amount ? formatMoney(item.amount) : 'Тооцоогүй'}</strong></span></div><blockquote>{item.reason}</blockquote>{item.decision_reason ? <p className="live-decision-note"><strong>Шийдвэрийн тайлбар:</strong> {item.decision_reason}</p> : null}{canDecide && item.status === 'Pending Review' ? <footer><button disabled={busy === item.name} type="button" onClick={() => void decide(item, 'Rejected')}>Татгалзах</button><button className="live-button--primary" disabled={busy === item.name} type="button" onClick={() => void decide(item, 'Approved')}>Зөвшөөрөх</button></footer> : null}{canDecide && item.status === 'Approved' ? <footer><span /><button disabled={busy === item.name} type="button" onClick={() => void decide(item, 'Reversed')}>Шийдвэр буцаах</button></footer> : null}</article>)}{!filtered.length ? <p className="live-empty live-empty--card">Сонгосон төлөвт торгуулийн бүртгэл алга.</p> : null}</section></>
}

function CrmView({ api, branches, initialBranch }: { api: FrappeManagementApi; branches: string[]; initialBranch?: string }) {
  const [branch, setBranch] = useState(initialBranch ?? branches[0] ?? '')
  const [query, setQuery] = useState('')
  const [rank, setRank] = useState('All')
  const [customers, setCustomers] = useState<ManagerCustomerRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState('')
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { const result = await api.getCustomers({ search: query, membershipRank: rank, limit: 100, branch: initialBranch ? undefined : branch }); setCustomers(result.customers); setTotal(result.meta.total); setSelected((value) => value || result.customers[0]?.name || '') }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'CRM мэдээлэл ачаалж чадсангүй.') }
    finally { setLoading(false) }
  }, [api, branch, initialBranch, query, rank])
  useEffect(() => { void load() }, [branch, rank])
  const customer = customers.find((item) => item.name === selected) ?? customers[0]
  function search(event: FormEvent) { event.preventDefault(); void load() }
  return <><PageHeading eyebrow={`${initialBranch ?? branch} салбар · нууцлалтай харагдац`} title="Харилцагчийн CRM" description="Нэр эсвэл бүтэн утасны дугаараар сервер дээр хайж, зөвхөн масклсан холбоо, түвшин, нийт ба дундаж зарцуулалтыг харуулна." /><form className="live-crm-controls" onSubmit={search}>{branches.length > 1 ? <select value={branch} onChange={(event) => setBranch(event.target.value)}>{branches.map((item) => <option key={item}>{item}</option>)}</select> : null}<label><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Нэр эсвэл утасны дугаар" /></label><select value={rank} onChange={(event) => setRank(event.target.value)}><option value="All">Бүх түвшин</option>{['Black Diamond', 'Diamond', 'Gold', 'Silver', 'Bronze', 'Unassigned'].map((item) => <option key={item} value={item}>{stateLabel(item)}</option>)}</select><button className="live-button--primary" type="submit">Хайх</button></form>{error ? <ErrorState message={error} retry={load} /> : null}{loading ? <LoadingState label="Харилцагчийн мэдээлэл ачаалж байна…" /> : <><section className="live-metrics"><Metric icon={Users} label="Харилцагч" value={total} hint="Сонгосон салбар" /><Metric icon={CircleDollarSign} label="Харагдаж буй нийт зарцуулалт" value={formatMoney(customers.reduce((sum, item) => sum + item.total_spend, 0))} hint="Одоогийн хайлтын үр дүн" tone="green" /><Metric icon={Gem} label="VIP түвшинтэй" value={customers.filter((item) => ['Black Diamond', 'Diamond', 'Gold'].includes(item.membership_rank)).length} hint="Алт болон түүнээс дээш" tone="violet" /></section><div className="live-crm-layout"><section className="live-panel live-customer-list"><header><div><span>Эрэмбэлсэн жагсаалт</span><h2>Харилцагчид</h2></div><b>{customers.length}/{total}</b></header><div>{customers.map((item) => <button className={customer?.name === item.name ? 'selected' : ''} key={item.name} type="button" onClick={() => setSelected(item.name)}><span className="live-avatar">{item.customer_name.slice(0, 2)}</span><span><strong>{item.customer_name}</strong><small>{item.phone || 'Утасгүй'} · {item.bill_count} баримт</small><em>{formatMoney(item.total_spend)} нийт</em></span><b>{stateLabel(item.membership_rank)}</b></button>)}</div></section>{customer ? <section className="live-panel live-customer-detail"><header><div><span className="live-avatar live-avatar--large">{customer.customer_name.slice(0, 2)}</span><span><h2>{customer.customer_name}</h2><p>{customer.phone || 'Утасны мэдээлэлгүй'}</p></span></div><b>{stateLabel(customer.membership_rank)}</b></header><div className="live-customer-facts"><span><small>Нийт зарцуулалт</small><strong>{formatMoney(customer.total_spend)}</strong></span><span><small>Дундаж зарцуулалт</small><strong>{formatMoney(customer.average_bill)}</strong></span><span><small>Нийт зочлолт</small><strong>{customer.visit_count}</strong></span><span><small>Сүүлийн зочлолт</small><strong>{customer.last_visit ? formatDate(customer.last_visit) : 'Мэдээлэлгүй'}</strong></span></div><p className="live-privacy"><BadgeCheck size={16} />Бүтэн утас болон бусад хувийн мэдээлэл браузерт буцаж ирэхгүй. CRM харагдац зөвхөн үйлчилгээний шийдвэрт зориулагдсан.</p></section> : <p className="live-empty live-empty--card">Харилцагч олдсонгүй.</p>}</div></>}</>
}

function RankingsView({ dashboard, customers }: { dashboard: ManagerDashboard; customers: ManagerCustomerRow[] }) {
  const [tab, setTab] = useState<'team' | 'customers'>('team')
  const team = [...dashboard.roster].sort((a, b) => String(a.rank).localeCompare(String(b.rank)) || a.display_name.localeCompare(b.display_name))
  const customerRows = [...customers].sort((a, b) => b.total_spend - a.total_spend)
  return <><PageHeading eyebrow="Эх баримтын зэрэглэл" title="Баг ба харилцагчийн зэрэглэлийн хяналт" description="NextERP-д хадгалагдсан одоогийн зэрэглэл, гишүүнчлэлийн түвшинг бодит борлуулалт ба зочлолтын мэдээлэлтэй нь харьцуулна." action={<div className="live-segment"><button className={tab === 'team' ? 'active' : ''} type="button" onClick={() => setTab('team')}>Багийн зэрэглэл</button><button className={tab === 'customers' ? 'active' : ''} type="button" onClick={() => setTab('customers')}>Харилцагчийн түвшин</button></div>} /><section className="live-policy-note"><Sparkles size={19} /><div><strong>Хүний шийдвэр хэвээр</strong><span>Систем одоогийн эх утгыг харуулна. Энтертайнерийн зэрэглэлийн өөрчлөлтийг менежер санал болгож, CEO эцэслэн шийдвэрлэнэ; харилцагчийн түвшний дүрэм батлагдсан хувилбараар ажиллана.</span></div></section><section className="live-panel"><div className="live-ranking-list">{tab === 'team' ? team.map((item, index) => <article key={item.profile}><strong>{index + 1}</strong><span className="live-avatar">{item.display_name.slice(0, 2)}</span><div><h3>{item.display_name}</h3><p>{stateLabel(item.status)} · {item.shift?.shift_type ?? 'Ээлжгүй'}</p></div><b>{stateLabel(item.rank)}</b></article>) : customerRows.map((item, index) => <article key={item.name}><strong>{index + 1}</strong><span className="live-avatar">{item.customer_name.slice(0, 2)}</span><div><h3>{item.customer_name}</h3><p>{item.visit_count} зочлолт · дундаж {formatMoney(item.average_bill)}</p></div><b>{stateLabel(item.membership_rank)} · {formatMoney(item.total_spend)}</b></article>)}</div></section></>
}

function ManagerGoalView({ api, sales, onRefresh }: { api: FrappeManagementApi; sales: BranchSalesProgress; onRefresh: () => Promise<void> }) {
  const [target, setTarget] = useState(String(sales.goal?.proposed_target || sales.active_goal?.approved_target || ''))
  const [rationale, setRationale] = useState(sales.goal?.manager_rationale ?? '')
  const [action, setAction] = useState('Борлуулалтын сарын үйл ажиллагааны төлөвлөгөө хэрэгжүүлэх')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const editable = !sales.goal || ['Draft', 'Revision Requested'].includes(sales.goal.state)
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy('save'); setError('')
    try { await api.saveGoal(`${sales.month}-01`, Number(target), rationale, [{ title: action }], sales.goal?.modified); await onRefresh() }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Зорилго хадгалж чадсангүй.') }
    finally { setBusy('') }
  }
  async function submit() {
    if (!sales.goal) return
    setBusy('submit'); setError('')
    try { await api.submitGoal(sales.goal.name, sales.goal.modified); await onRefresh() }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'CEO-д илгээж чадсангүй.') }
    finally { setBusy('') }
  }
  return <><PageHeading eyebrow={`${sales.branch} салбар · ${monthLabel(sales.month)}`} title="Борлуулалтын зорилго" description="Менежер зөвхөн өөрийн салбарын зорилтыг санал болгож, CEO-ийн шийдвэрийн дараа батлагдсан зорилгоор биелэлтээ хянана." /><section className="live-sales-hero"><header><div><span>Бодит борлуулалтын явц</span><h2>{sales.active_goal ? `${Math.round(sales.achievement_percent ?? 0)}% биелэлт` : 'Батлагдсан зорилго алга'}</h2></div><Target size={28} /></header><div><span><small>Бодит</small><strong>{formatMoney(sales.actual_sales)}</strong></span><span><small>Батлагдсан зорилго</small><strong>{sales.active_goal ? formatMoney(sales.active_goal.approved_target) : '—'}</strong></span><span><small>Саналын төлөв</small><strong>{sales.goal ? stateLabel(sales.goal.state) : 'Шинэ санал'}</strong></span></div><Progress value={sales.achievement_percent ?? 0} label="Борлуулалтын биелэлт" /></section>{error ? <ErrorState message={error} /> : null}<form className="live-panel live-goal-form" onSubmit={save}><header><div><span>Менежерийн санал</span><h2>{monthLabel(sales.month)} сарын зорилго</h2></div>{sales.goal ? <b data-state={sales.goal.state}>{stateLabel(sales.goal.state)}</b> : null}</header><label><span>Санал болгож буй зорилго</span><input disabled={!editable} type="number" min="1" value={target} onChange={(event) => setTarget(event.target.value)} /></label><label><span>Үндэслэл</span><textarea disabled={!editable} value={rationale} onChange={(event) => setRationale(event.target.value)} rows={4} placeholder="Борлуулалтын баримт, боломж, эрсдэлээ тайлбарлана уу" /></label><label><span>Хэрэгжүүлэх үндсэн ажил</span><input disabled={!editable} value={action} onChange={(event) => setAction(event.target.value)} /></label>{sales.goal?.decision_comment ? <p className="live-decision-note"><strong>CEO-ийн тайлбар:</strong> {sales.goal.decision_comment}</p> : null}<footer>{editable ? <button className="live-button--primary" disabled={Boolean(busy)} type="submit">{busy === 'save' ? 'Хадгалж байна…' : 'Ноорог хадгалах'}</button> : <span />}{sales.goal?.state === 'Draft' ? <button disabled={Boolean(busy)} type="button" onClick={() => void submit()}>{busy === 'submit' ? 'Илгээж байна…' : 'CEO-д хянуулахаар илгээх'}</button> : null}</footer></form></>
}

function ManagerLiveApp({ api, session, view, onNavigate }: { api: FrappeManagementApi; session: ManagementSession; view: ManagerView; onNavigate: (view: ManagerView) => void }) {
  const [data, setData] = useState<ManagerData | null>(null)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    setError('')
    try {
      const [sales, dashboard, team, leaveResult, penaltyResult, customerResult] = await Promise.all([
        api.getSalesProgress(currentMonth()), api.getManagerDashboard({ limit: 100 }), api.getManagerTeam({ limit: 100 }), api.getLeaveRequests('All'), api.getPenalties('All'), api.getCustomers({ limit: 100 }),
      ])
      setData({ sales, dashboard, team, leaves: leaveResult.requests, penalties: penaltyResult.penalties, customers: customerResult.customers, customerTotal: customerResult.meta.total })
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Менежерийн мэдээлэл ачаалж чадсангүй.') }
  }, [api])
  useEffect(() => { void load() }, [load])
  if (error && !data) return <ErrorState message={error} retry={load} />
  if (!data) return <LoadingState />
  return <>{error ? <ErrorState message={error} retry={load} /> : null}{view === 'overview' ? <ManagerOverview data={data} onNavigate={onNavigate} /> : null}{view === 'schedule' ? <ScheduleView api={api} /> : null}{view === 'team' ? <TeamView team={data.team} /> : null}{view === 'leave' ? <LeaveView api={api} requests={data.leaves} onRefresh={load} /> : null}{view === 'penalties' ? <PenaltiesView api={api} penalties={data.penalties} canDecide branch={data.dashboard.branch} onRefresh={load} /> : null}{view === 'crm' ? <CrmView api={api} branches={session.branchIds} initialBranch={session.branchIds[0]} /> : null}{view === 'rankings' ? <RankingsView dashboard={data.dashboard} customers={data.customers} /> : null}{view === 'goals' ? <ManagerGoalView api={api} sales={data.sales} onRefresh={load} /> : null}</>
}

function CeoOverview({ dashboard, onNavigate }: { dashboard: CompanyDashboard; onNavigate: (view: CeoView) => void }) {
  const percent = dashboard.totals.active_target ? dashboard.totals.actual_sales / dashboard.totals.active_target * 100 : 0
  return <><PageHeading eyebrow={`${monthLabel(dashboard.month)} · компанийн хэмжээнд`} title="Удирдлагын төв" description="Дөрвөн салбарын борлуулалт, зорилго, баг, CRM болон шийдвэр хүлээсэн ажлыг бодит NextERP мэдээллээс нэгтгэн харуулна." /><section className="live-sales-hero live-sales-hero--ceo"><header><div><span>Компанийн сарын борлуулалт</span><h2>{dashboard.totals.active_target ? `${Math.round(percent)}% биелэлт` : 'Батлагдсан зорилгууд хүлээгдэж байна'}</h2></div><BarChart3 size={28} /></header><div><span><small>Бодит борлуулалт</small><strong>{formatMoney(dashboard.totals.actual_sales)}</strong></span><span><small>Батлагдсан нийт зорилго</small><strong>{dashboard.totals.active_target ? formatMoney(dashboard.totals.active_target) : '—'}</strong></span><span><small>Үлдсэн</small><strong>{dashboard.totals.active_target ? formatMoney(Math.max(dashboard.totals.active_target - dashboard.totals.actual_sales, 0)) : '—'}</strong></span></div><Progress value={percent} label="Компанийн борлуулалтын зорилгын биелэлт" /><footer><span>POS / Finex-ийн төлөгдсөн борлуулалтын тулгалт</span><button type="button" onClick={() => onNavigate('branches')}>Салбаруудаар харах<ChevronRight size={16} /></button></footer></section><section className="live-metrics"><Metric icon={Building2} label="Салбар" value={dashboard.branches.length} hint="Нэгдсэн хяналт" /><Metric icon={Users} label="Идэвхтэй баг" value={dashboard.totals.active_team_members} hint="Бүх салбар" tone="violet" /><Metric icon={ContactRound} label="Харилцагч" value={dashboard.totals.customers} hint="Давхардалгүй, идэвхтэй" tone="green" /><Metric icon={BadgeCheck} label="Зорилгын шийдвэр" value={dashboard.totals.pending_goals} hint="CEO-ийн шийдвэр хүлээж байна" tone={dashboard.totals.pending_goals ? 'amber' : 'green'} /></section><div className="live-two-columns"><section className="live-panel"><header><div><span>Салбарууд</span><h2>Борлуулалтын гүйцэтгэл</h2></div><button type="button" onClick={() => onNavigate('branches')}>Дэлгэрэнгүй</button></header><div className="live-branch-rows">{dashboard.branches.map((branch) => <article key={branch.branch}><span className="live-avatar">{branch.branch.slice(0, 2)}</span><div><strong>{branch.branch}</strong><Progress value={branch.achievement_percent ?? 0} label={`${branch.branch} салбарын биелэлт`} /><small>{formatMoney(branch.actual_sales)} · {branch.active_target ? `${Math.round(branch.achievement_percent ?? 0)}%` : 'зорилгогүй'}</small></div><b>{branch.active_team_members} хүн</b></article>)}</div></section><section className="live-panel"><header><div><span>Шийдвэр ба эрсдэл</span><h2>CEO-ийн дараалал</h2></div></header><div className="live-action-list"><button type="button" onClick={() => onNavigate('approvals')}><BadgeCheck size={19} /><span><strong>Зорилгын санал</strong><small>Менежерүүдээс ирсэн</small></span><b>{dashboard.totals.pending_goals}</b></button><button type="button" onClick={() => onNavigate('workforce')}><Users size={19} /><span><strong>Чөлөөний хүлээлт</strong><small>Салбаруудын үйл ажиллагааны эрсдэл</small></span><b>{dashboard.totals.pending_leave}</b></button><button type="button" onClick={() => onNavigate('penalties')}><ShieldAlert size={19} /><span><strong>Торгуулийн хяналт</strong><small>Менежерийн шийдвэр хүлээж буй</small></span><b>{dashboard.totals.pending_penalties}</b></button></div></section></div></>
}

function CeoBranches({ dashboard }: { dashboard: CompanyDashboard }) {
  return <><PageHeading eyebrow="Компанийн дөрвөн салбар" title="Салбарын гүйцэтгэл" description="Борлуулалтын биелэлт, багийн хэмжээ, харилцагч, чөлөө ба торгуулийн хүлээлтийг салбар бүрээр харьцуулна." /><section className="live-branch-grid">{dashboard.branches.map((branch) => <article key={branch.branch}><header><span className="live-avatar live-avatar--large">{branch.branch.slice(0, 2)}</span><div><h2>{branch.branch}</h2><p>{branch.goal ? stateLabel(branch.goal.state) : 'Зорилгын санал алга'}</p></div><b>{branch.achievement_percent == null ? '—' : `${Math.round(branch.achievement_percent)}%`}</b></header><Progress value={branch.achievement_percent ?? 0} label={`${branch.branch} салбарын биелэлт`} /><dl><div><dt>Бодит борлуулалт</dt><dd>{formatMoney(branch.actual_sales)}</dd></div><div><dt>Батлагдсан зорилго</dt><dd>{branch.active_target ? formatMoney(branch.active_target) : '—'}</dd></div><div><dt>Баг</dt><dd>{branch.active_team_members}</dd></div><div><dt>Харилцагч</dt><dd>{branch.customers}</dd></div><div><dt>Чөлөө хүлээгдэж буй</dt><dd>{branch.pending_leave}</dd></div><div><dt>Торгууль хүлээгдэж буй</dt><dd>{branch.pending_penalties}</dd></div></dl></article>)}</section></>
}

function CeoGoals({ dashboard }: { dashboard: CompanyDashboard }) {
  const branchesWithTarget = dashboard.branches.filter((branch) => branch.active_target > 0)
  const achieved = branchesWithTarget.filter((branch) => (branch.achievement_percent ?? 0) >= 100).length
  return <><PageHeading eyebrow={`${monthLabel(dashboard.month)} · компанийн хэмжээнд`} title="Борлуулалт ба зорилт" description="Салбар бүрийн бодит борлуулалт, менежерийн санал, CEO-ийн баталсан зорилго, биелэлт ба шийдвэрийн төлөвийг нэг дор харуулна." /><section className="live-metrics"><Metric icon={CircleDollarSign} label="Бодит борлуулалт" value={formatMoney(dashboard.totals.actual_sales)} hint="POS / Finex төлөгдсөн дүн" tone="green" /><Metric icon={Target} label="Батлагдсан зорилго" value={dashboard.totals.active_target ? formatMoney(dashboard.totals.active_target) : '—'} hint={`${branchesWithTarget.length}/${dashboard.branches.length} салбар зорилготой`} tone="violet" /><Metric icon={BadgeCheck} label="Шийдвэр хүлээж буй" value={dashboard.totals.pending_goals} hint="Менежерийн санал" tone="amber" /><Metric icon={TrendingUp} label="Зорилго биелүүлсэн" value={achieved} hint="100% болон түүнээс дээш" /></section><section className="live-branch-grid">{dashboard.branches.map((branch) => <article key={branch.branch}><header><span className="live-avatar live-avatar--large">{branch.branch.slice(0, 2)}</span><div><h2>{branch.branch}</h2><p>{branch.goal ? stateLabel(branch.goal.state) : 'Зорилгын санал ирээгүй'}</p></div><b>{branch.achievement_percent == null ? '—' : `${Math.round(branch.achievement_percent)}%`}</b></header><Progress value={branch.achievement_percent ?? 0} label={`${branch.branch} салбарын зорилгын биелэлт`} /><dl><div><dt>Бодит борлуулалт</dt><dd>{formatMoney(branch.actual_sales)}</dd></div><div><dt>Менежерийн санал</dt><dd>{branch.goal?.proposed_target ? formatMoney(branch.goal.proposed_target) : '—'}</dd></div><div><dt>CEO баталсан</dt><dd>{branch.active_target ? formatMoney(branch.active_target) : '—'}</dd></div><div><dt>Өмнөх сарын суурь</dt><dd>{branch.goal?.baseline_amount ? formatMoney(branch.goal.baseline_amount) : '—'}</dd></div></dl>{branch.goal?.decision_comment ? <p className="live-decision-note"><strong>CEO-ийн тайлбар:</strong> {branch.goal.decision_comment}</p> : null}</article>)}</section></>
}

function CeoApprovals({ api, dashboard, onRefresh }: { api: FrappeManagementApi; dashboard: CompanyDashboard; onRefresh: () => Promise<void> }) {
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  async function decide(goal: BranchSalesGoalRecord, decision: 'approve' | 'revision' | 'reject') {
    const comment = decision === 'approve' ? window.prompt('Баталсан тайлбар (заавал биш):', '') : window.prompt(decision === 'revision' ? 'Засварлах шаардлагыг бичнэ үү:' : 'Татгалзсан шалтгааныг бичнэ үү:')
    if (comment === null || (decision !== 'approve' && comment.trim().length < 5)) return
    setBusy(goal.name); setError('')
    try { await api.decideGoal(goal.name, decision, comment, goal.modified); await onRefresh() }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Шийдвэр хадгалж чадсангүй.') }
    finally { setBusy('') }
  }
  return <><PageHeading eyebrow="CEO-ийн эцсийн шийдвэр" title="Менежерүүдээс ирсэн хүсэлт" description="Салбарын сарын зорилгын санал, суурь борлуулалт, үндэслэл ба хэрэгжүүлэх ажлыг шалгаж батлах, засварт буцаах эсвэл татгалзана." />{error ? <ErrorState message={error} /> : null}<section className="live-card-grid">{dashboard.pending_goals.map((goal) => <article className="live-request-card live-goal-approval" key={goal.name}><header><span className="live-avatar">{goal.branch?.slice(0, 2)}</span><div><h2>{goal.branch} · {monthLabel(String(goal.goal_month).slice(0, 7))}</h2><p>{goal.submitted_by ?? 'Салбарын менежер'} · {goal.submitted_at ? formatDateTime(goal.submitted_at) : 'Илгээсэн'}</p></div><b>{stateLabel(goal.state)}</b></header><div className="live-penalty-facts"><span><small>Менежерийн санал</small><strong>{formatMoney(goal.proposed_target ?? 0)}</strong></span><span><small>Өмнөх сарын суурь</small><strong>{formatMoney(goal.baseline_amount ?? 0)}</strong></span></div><blockquote>{goal.manager_rationale || 'Үндэслэл оруулаагүй.'}</blockquote><footer><button disabled={busy === goal.name} type="button" onClick={() => void decide(goal, 'reject')}>Татгалзах</button><button disabled={busy === goal.name} type="button" onClick={() => void decide(goal, 'revision')}>Засвар хүсэх</button><button className="live-button--primary" disabled={busy === goal.name} type="button" onClick={() => void decide(goal, 'approve')}>Зорилго батлах</button></footer></article>)}{!dashboard.pending_goals.length ? <p className="live-empty live-empty--card"><BadgeCheck size={28} />Шийдвэр хүлээсэн борлуулалтын зорилгын санал алга.</p> : null}</section></>
}

function CeoWorkforce({ api, dashboard, onRefresh }: { api: FrappeManagementApi; dashboard: CompanyDashboard; onRefresh: () => Promise<void> }) {
  const [employees, setEmployees] = useState<UnassignedEmployee[]>([])
  const [branches, setBranches] = useState<string[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<UnassignedEmployee | null>(null)
  const [branch, setBranch] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const load = useCallback(async (query = '') => {
    setLoading(true); setError('')
    try {
      const result = await api.getUnassignedEmployees({ search: query || undefined, limit: 50 })
      setEmployees(result.employees); setBranches(result.branches); setTotal(result.meta.total)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Салбаргүй ажилтны жагсаалт ачаалж чадсангүй.') }
    finally { setLoading(false) }
  }, [api])
  useEffect(() => { void load() }, [load])
  function openAssign(employee: UnassignedEmployee) {
    setEditing(employee); setBranch(branches[0] ?? dashboard.branches[0]?.branch ?? ''); setReason('')
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!editing || !branch) return
    if (reason.trim().length < 5) { setError('Салбар оноосон үндэслэлийг 5-аас дээш тэмдэгтээр бичнэ үү.'); return }
    setSaving(true); setError('')
    try {
      await api.assignEmployeeBranch(editing.name, branch, reason, editing.modified)
      setEditing(null)
      await Promise.all([load(search), onRefresh()])
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Салбар оноож чадсангүй.') }
    finally { setSaving(false) }
  }
  function searchSubmit(event: FormEvent) { event.preventDefault(); void load(search) }
  return <><PageHeading eyebrow="Компанийн ажиллах хүч" title="Салбарын баг ба ирцийн эрсдэл" description="Салбар бүрт оноогдсон бүх идэвхтэй ажилтан, энтертайнер, чөлөө болон торгуулийн шийдвэрийн хүлээлтийг нэгтгэн хянана." /><section className="live-metrics"><Metric icon={Users} label="Салбартай идэвхтэй баг" value={dashboard.totals.active_team_members} hint="Дөрвөн салбарт баталгаатай оноогдсон" /><Metric icon={AlertTriangle} label="Салбаргүй ажилтан" value={dashboard.totals.unassigned_active_employees} hint="NextERP-д салбар оноох шаардлагатай" tone="amber" /><Metric icon={Gem} label="Энтертайнер" value={dashboard.totals.active_entertainers} hint="Идэвхтэй тусгай профайл" tone="violet" /><Metric icon={ClipboardCheck} label="Чөлөө хүлээгдэж буй" value={dashboard.totals.pending_leave} hint="Менежерүүд шийдвэрлэнэ" tone="amber" /><Metric icon={ShieldAlert} label="Торгууль хүлээгдэж буй" value={dashboard.totals.pending_penalties} hint="Нотолгооны хяналт" tone="red" /></section><section className="live-policy-note"><AlertTriangle size={19} /><div><strong>Салбаргүй ажилтныг таамгаар хуваарилахгүй</strong><span>{dashboard.totals.unassigned_active_employees} идэвхтэй ажилтанд баталгаатай салбар оноосны дараа тухайн менежерийн баг болон хуваарьт автоматаар орно. Өөрчлөлт бүр аудитын бүртгэлтэй.</span></div></section><section className="live-panel live-assignment-panel"><header><div><span>Өгөгдлийн чанарын ажил</span><h2>Салбаргүй ажилтанд салбар оноох</h2></div><form className="live-search" onSubmit={searchSubmit}><Search size={17} /><input aria-label="Салбаргүй ажилтан хайх" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Нэр, ID, албан тушаалаар хайх" /><button type="submit">Хайх</button></form></header>{error ? <ErrorState message={error} retry={() => load(search)} /> : null}{loading ? <LoadingState label="Салбаргүй ажилтнуудыг ачаалж байна…" /> : <><div className="live-unassigned-summary"><strong>{total}</strong><span>тохирох салбаргүй идэвхтэй ажилтан</span></div><div className="live-table-list live-employee-assignment"><div className="head"><span>Ажилтан</span><span>Ажилтны ID</span><span>Албан тушаал</span><span>Хэлтэс</span><span>Үйлдэл</span></div>{employees.map((employee) => { const employeeLabel = employee.employee_name || employee.name; return <article key={employee.name}><span><i className="live-avatar">{employeeLabel.slice(0, 2)}</i><strong>{employeeLabel}</strong></span><span>{employee.name}</span><span>{employee.designation || 'Тодорхойгүй'}</span><span>{employee.department || 'Тодорхойгүй'}</span><span><button className="live-button--primary" type="button" onClick={() => openAssign(employee)}>Салбар оноох</button></span></article> })}</div>{!employees.length ? <p className="live-empty">Тохирох салбаргүй ажилтан олдсонгүй.</p> : total > employees.length ? <p className="live-assignment-note">Эхний {employees.length} ажилтан харагдаж байна. Хайлтаар ажилтнаа нарийвчилна уу.</p> : null}</>}</section><section className="live-panel"><div className="live-table-list"><div className="head"><span>Салбар</span><span>Идэвхтэй баг</span><span>Энтертайнер</span><span>Чөлөө</span><span>Торгууль</span></div>{dashboard.branches.map((item) => <article key={item.branch}><span><i className="live-avatar">{item.branch.slice(0, 2)}</i><strong>{item.branch}</strong></span><span>{item.active_team_members}</span><span>{item.active_entertainers}</span><span>{item.pending_leave}</span><span>{item.pending_penalties}</span></article>)}</div></section>{editing ? <div className="live-modal" role="dialog" aria-modal="true" aria-labelledby="branch-assignment-title"><form onSubmit={submit}><header><div><span>Салбарын баталгаажуулалт</span><h2 id="branch-assignment-title">{editing.employee_name || editing.name}</h2></div><button type="button" aria-label="Хаах" onClick={() => setEditing(null)}><X /></button></header><p className="live-modal-copy">{editing.name} · {editing.designation || editing.department || 'Албан тушаал тодорхойгүй'}</p><label><span>Оноох салбар</span><select aria-label="Оноох салбар" value={branch} onChange={(event) => setBranch(event.target.value)}>{branches.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Оноосон үндэслэл</span><textarea aria-label="Оноосон үндэслэл" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Жишээ: Хөдөлмөрийн гэрээ болон салбарын бүртгэлтэй тулгав" /></label><footer><button type="button" onClick={() => setEditing(null)}>Цуцлах</button><button className="live-button--primary" disabled={saving} type="submit">{saving ? 'Хадгалж байна…' : 'Баталгаажуулж оноох'}</button></footer></form></div> : null}</>
}

function ErpModuleView({ view }: { view: Extract<CeoView, 'finance' | 'tasks' | 'messages' | 'hermes' | 'reports'> }) {
  const config = {
    finance: { title: 'Санхүү ба тооцоо', description: 'NextERP-ийн баталгаатай санхүү, төлбөр, тооцооны ажлын орчин.', links: [['Нягтлан бодох бүртгэл', '/app/accounting'], ['Борлуулалтын нэхэмжлэл', '/app/sales-invoice'], ['Төлбөрийн бүртгэл', '/app/payment-entry']] },
    tasks: { title: 'Даалгавар', description: 'Хариуцагч, хугацаа, явц, үр дүнгийн бодит ERP бүртгэл.', links: [['Даалгаврын жагсаалт', '/app/task'], ['Хийх ажил', '/app/todo'], ['Төсөл', '/app/project']] },
    messages: { title: 'Мессеж ба харилцаа', description: 'ERP доторх мэдэгдэл, харилцаа, хариуцлагын түүх.', links: [['Харилцааны түүх', '/app/communication'], ['Мэдэгдэл', '/app/notification-log'], ['И-мэйл дараалал', '/app/email-queue']] },
    hermes: { title: 'Hermes зөвлөмж', description: 'Зөвлөмж нь хүний шийдвэрийг орлохгүй; эх баримт, эрсдэл, дараагийн үйлдлийг тайлбарлана.', links: [['Hermes ажлын орчин', '/app/hermes'], ['Зорилгын шийдвэр', '/app/vip-branch-sales-goal'], ['Аудитын бүртгэл', '/app/vip-api-audit-event']] },
    reports: { title: 'Тайлан, шинжилгээ', description: 'NextERP-ийн тайлан бүтээгч, борлуулалт, ажиллах хүчний эх тайлан.', links: [['Тайлан бүтээгч', '/app/query-report'], ['Борлуулалтын шинжилгээ', '/app/sales-analytics'], ['Ажилтны шинжилгээ', '/app/employee']] },
  }[view]
  return <><PageHeading eyebrow="NextERP-ийн үндсэн модуль" title={config.title} description={config.description} /><section className="live-policy-note"><BadgeCheck size={19} /><div><strong>Нэг нэвтрэлт, нэг эрхийн бодлого</strong><span>Доорх холбоосууд энэ хэрэглэгчийн NextERP эрхээр нээгдэнэ. Зөвшөөрөөгүй өгөгдөл болон үйлдэл сервер дээр хаалттай хэвээр.</span></div></section><section className="live-erp-links">{config.links.map(([label, href]) => <a key={href} href={href}><span><h2>{label}</h2><p>NextERP-д нээх</p></span><ChevronRight /></a>)}</section></>
}

function CeoLiveApp({ api, session, view, onNavigate }: { api: FrappeManagementApi; session: ManagementSession; view: CeoView; onNavigate: (view: CeoView) => void }) {
  const [dashboard, setDashboard] = useState<CompanyDashboard | null>(null)
  const [penalties, setPenalties] = useState<PenaltyRow[]>([])
  const [selectedBranch, setSelectedBranch] = useState(session.branchIds[0] ?? '')
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    setError('')
    try { setDashboard(await api.getCompanyDashboard(currentMonth())) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Компанийн мэдээлэл ачаалж чадсангүй.') }
  }, [api])
  const loadPenalties = useCallback(async () => {
    if (!selectedBranch) return
    try { setPenalties((await api.getPenalties('All', selectedBranch)).penalties) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Торгуулийн мэдээлэл ачаалж чадсангүй.') }
  }, [api, selectedBranch])
  useEffect(() => { void load() }, [load])
  useEffect(() => { if (view === 'penalties') void loadPenalties() }, [loadPenalties, view])
  if (error && !dashboard) return <ErrorState message={error} retry={load} />
  if (!dashboard) return <LoadingState />
  return <>{error ? <ErrorState message={error} retry={load} /> : null}{view === 'overview' ? <CeoOverview dashboard={dashboard} onNavigate={onNavigate} /> : null}{view === 'branches' ? <CeoBranches dashboard={dashboard} /> : null}{view === 'goals' ? <CeoGoals dashboard={dashboard} /> : null}{view === 'approvals' ? <CeoApprovals api={api} dashboard={dashboard} onRefresh={load} /> : null}{view === 'crm' ? <CrmView api={api} branches={session.branchIds} /> : null}{view === 'workforce' ? <CeoWorkforce api={api} dashboard={dashboard} onRefresh={load} /> : null}{view === 'penalties' ? <><div className="live-branch-filter"><label>Салбар<select value={selectedBranch} onChange={(event) => setSelectedBranch(event.target.value)}>{session.branchIds.map((branch) => <option key={branch}>{branch}</option>)}</select></label></div><PenaltiesView api={api} penalties={penalties} canDecide={false} branch={selectedBranch} /></> : null}{(['finance', 'tasks', 'messages', 'hermes', 'reports'] as CeoView[]).includes(view) ? <ErpModuleView view={view as Extract<CeoView, 'finance' | 'tasks' | 'messages' | 'hermes' | 'reports'>} /> : null}</>
}

export default function LiveManagementApplication({ api, session }: { api: FrappeManagementApi; session: ManagementSession }) {
  const [view, setView] = useState<LiveView>('overview')
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigation = session.role === 'ceo' ? ceoNavigation : managerNavigation
  const signOut = async () => {
    try { await api.logout() } catch { /* A login redirect still clears the browser flow safely. */ }
    window.location.assign('/login')
  }
  function navigate(next: LiveView) {
    setView(next)
    setMobileOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  return <div className="live-app"><aside className={mobileOpen ? 'live-sidebar open' : 'live-sidebar'}><header><img src={`${import.meta.env.BASE_URL}vip-club-mark.svg`} alt="VIP Club" /><div><strong>VIP CLUB</strong><span>Удирдлагын систем</span></div><button type="button" aria-label="Цэс хаах" onClick={() => setMobileOpen(false)}><X /></button></header><ScopeBadge session={session} /><nav aria-label={session.role === 'ceo' ? 'Гүйцэтгэх захирлын навигац' : 'Менежерийн навигац'}>{navigation.map(({ id, label, icon: Icon, badge }) => <button className={view === id ? 'active' : ''} key={id} type="button" onClick={() => navigate(id)}><Icon size={18} /><span>{label}</span>{badge ? <b>{badge}</b> : null}</button>)}</nav><footer><button type="button" onClick={() => void signOut()}><LogOut size={17} />Системээс гарах</button></footer></aside><div className="live-workspace"><header className="live-topbar"><button type="button" aria-label="Цэс нээх" onClick={() => setMobileOpen(true)}><Menu /></button><div><ScopeBadge session={session} /><span className="live-sync"><BadgeCheck size={14} />NextERP бодит өгөгдөл</span></div><div className="live-user"><button type="button" aria-label="Мэдэгдэл"><Bell size={18} /></button><span className="live-avatar">{session.initials}</span><span><strong>{session.displayName}</strong><small>{session.role === 'ceo' ? 'Гүйцэтгэх захирал' : 'Салбарын менежер'}</small></span></div></header><main>{session.role === 'ceo' ? <CeoLiveApp api={api} session={session} view={view as CeoView} onNavigate={(next) => navigate(next)} /> : <ManagerLiveApp api={api} session={session} view={view as ManagerView} onNavigate={(next) => navigate(next)} />}</main></div></div>
}
