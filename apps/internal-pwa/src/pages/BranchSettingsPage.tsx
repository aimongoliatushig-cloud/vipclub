import {
  ArrowLeft,
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileClock,
  LockKeyhole,
  Search,
  Settings2,
  ShieldCheck,
  UserRoundCog,
} from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { PageHeader } from '../components/ui/PageHeader'
import { StatusMark } from '../components/ui/StatusMark'
import type { BranchSetting, BranchSettingCategory } from '../domain/types'
import { useApp } from '../state/useApp'
import '../styles/branch-settings.css'

const categoryLabels: Record<BranchSettingCategory | 'all', string> = {
  all: 'Бүх ангилал',
  profile: 'Салбарын үндсэн мэдээлэл',
  workforce: 'Ажиллах хүч',
  membership: 'Гишүүнчлэл ба loyalty',
  service: 'Үйлчилгээ ба үнэ',
  notifications: 'Мэдэгдэл ба эскалаци',
  governance: 'Засаглал ба тайлан',
  finance: 'Санхүүгийн бодлого',
  access: 'Эрх ба хамрах хүрээ',
  integration: 'Интеграц',
}

const statusCopy: Record<BranchSetting['status'], string> = {
  active: 'Идэвхтэй',
  scheduled: 'Товлосон',
  'pending-approval': 'CEO хяналт хүлээж буй',
  locked: 'Түгжээтэй',
  'configuration-required': 'Тохиргоо шаардлагатай',
}

const originCopy: Record<BranchSetting['origin'], string> = {
  'company-default': 'Компанийн default',
  branch: 'Салбарын утга',
  'ceo-override': 'CEO override',
  'configuration-required': 'Батлагдсан утга хүлээгдэж буй',
}

const statusTone = (setting: BranchSetting) => setting.status === 'active'
  ? 'healthy'
  : setting.status === 'locked'
    ? 'neutral'
    : setting.status === 'pending-approval' || setting.status === 'configuration-required'
      ? 'attention'
      : 'neutral'

function SettingDetail({ setting, branchName }: { setting: BranchSetting; branchName: string }) {
  const { session, hasPermission } = useAuth()
  const { online, updateBranchSetting } = useApp()
  const [value, setValue] = useState(setting.value)
  const [reason, setReason] = useState('')
  const [effectiveFrom, setEffectiveFrom] = useState(setting.effectiveFrom)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const roleAllowsEdit = session.role === 'CEO'
    ? hasPermission('branch-settings.override') && setting.ceoEditable
    : hasPermission('branch-settings.write') && setting.managerEditable
  const editable = roleAllowsEdit && setting.status !== 'locked' && setting.valueType !== 'masked'
  const changed = value.trim() !== setting.value || effectiveFrom !== setting.effectiveFrom
  const canSubmit = editable && online && changed && reason.trim().length >= 5 && Boolean(effectiveFrom) && !saving

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    setError(null)
    try {
      await updateBranchSetting(setting.branchId, setting.id, {
        value,
        reason,
        effectiveFrom,
        expectedVersion: setting.version,
      })
      setReason('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Тохиргоог хадгалж чадсангүй.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <article className="setting-detail" aria-label="Сонгосон тохиргооны дэлгэрэнгүй">
      <header className="setting-detail__header">
        <div className="setting-detail__icon"><Settings2 size={22} aria-hidden /></div>
        <div><span>{categoryLabels[setting.category]}</span><h2>{setting.label}</h2><p>{setting.description}</p></div>
        <StatusMark tone={statusTone(setting)} label={statusCopy[setting.status]} compact />
      </header>

      <div className="setting-provenance">
        <div><span>Одоогийн утга</span><strong>{setting.value}{setting.unit ? ` ${setting.unit}` : ''}</strong></div>
        <div><span>Эх үүсэл</span><strong>{originCopy[setting.origin]}</strong></div>
        <div><span>Хүчинтэй огноо</span><strong>{setting.effectiveFrom}</strong></div>
        <div><span>Хувилбар</span><strong>v{setting.version}</strong></div>
      </div>

      {setting.status === 'locked' || setting.valueType === 'masked' ? (
        <div className="setting-guard" data-tone="locked"><LockKeyhole size={19} aria-hidden /><div><strong>Энэ утгыг салбарын workspace-ээс өөрчлөхгүй</strong><p>{setting.lockedReason}</p></div></div>
      ) : setting.requiresCeoApproval && session.role === 'Branch Manager' ? (
        <div className="setting-guard" data-tone="approval"><ShieldCheck size={19} aria-hidden /><div><strong>Өөрчлөлт шууд идэвхжихгүй</strong><p>Таны шинэ утга versioned proposal болж CEO хяналтад орно.</p></div></div>
      ) : setting.status === 'configuration-required' ? (
        <div className="setting-guard" data-tone="attention"><CircleAlert size={19} aria-hidden /><div><strong>Бизнесийн утга хараахан батлагдаагүй</strong><p>Батлагдсан утга оруулах хүртэл систем энэ тохиргоог calculation-д ашиглахгүй.</p></div></div>
      ) : null}

      {editable ? (
        <form className="setting-editor" onSubmit={submit}>
          <div className="setting-editor__heading"><div><h3>Утга өөрчлөх</h3><p>{session.role === 'CEO' ? `${branchName}-ийн утгыг эрх бүхий override хэлбэрээр хадгална.` : 'Зөвхөн өөрийн салбарын зөвшөөрөгдсөн утгыг өөрчилнө.'}</p></div><UserRoundCog size={21} aria-hidden /></div>
          <label className="field"><span>Шинэ утга *</span>
            {setting.valueType === 'time' ? (
              <input type="time" value={value} onChange={(event) => setValue(event.target.value)} />
            ) : setting.valueType === 'number' ? (
              <input type="number" min="0" value={value} onChange={(event) => setValue(event.target.value)} />
            ) : setting.highImpact || value.length > 45 ? (
              <textarea rows={3} value={value} onChange={(event) => setValue(event.target.value)} />
            ) : (
              <input value={value} onChange={(event) => setValue(event.target.value)} />
            )}
          </label>
          <div className="setting-editor__grid">
            <label className="field"><span>Хүчин төгөлдөр болох огноо *</span><input type="date" value={effectiveFrom} onInput={(event) => setEffectiveFrom(event.currentTarget.value)} onChange={(event) => setEffectiveFrom(event.target.value)} /></label>
            <label className="field"><span>Өөрчлөлтийн шалтгаан *</span><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="5-аас дээш тэмдэгт" /></label>
          </div>
          {error ? <div className="setting-error" role="alert"><CircleAlert size={17} aria-hidden />{error}</div> : null}
          {!online ? <div className="setting-error" role="status"><CircleAlert size={17} aria-hidden />Офлайн үед тохиргоо хадгалахгүй.</div> : null}
          <div className="setting-editor__actions"><span>v{setting.version} дээр optimistic version check хийнэ.</span><button className="button button--primary" type="submit" disabled={!canSubmit}>{saving ? 'Хадгалж байна…' : session.role === 'CEO' ? 'CEO override хадгалах' : setting.requiresCeoApproval ? 'CEO хяналтад илгээх' : 'Өөрчлөлт хадгалах'}</button></div>
        </form>
      ) : null}

      <section className="setting-sources" aria-labelledby="setting-source-title">
        <h3 id="setting-source-title">Шаардлагын эх сурвалж</h3>
        {setting.sourceDocs.map((source) => <code key={source}>{source}</code>)}
      </section>

      <section className="setting-history" aria-labelledby="setting-history-title">
        <header><div><h3 id="setting-history-title">Version ба аудитын түүх</h3><p>Өмнөх утгыг дарж устгахгүй.</p></div><FileClock size={20} aria-hidden /></header>
        <ol>
          {setting.history.map((entry) => (
            <li key={entry.id}><span className="setting-history__dot" /><div><strong>{entry.actor} · {entry.role}</strong><p>{entry.before} → {entry.after}</p><small>{entry.reason}</small></div><time>{entry.createdAt.slice(0, 16).replace('T', ' · ')} · v{entry.version}</time></li>
          ))}
        </ol>
      </section>
    </article>
  )
}

export default function BranchSettingsPage() {
  const { branchId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { session } = useAuth()
  const { branches, branchSettings } = useApp()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<BranchSettingCategory | 'all'>('all')
  const branch = branches.find((item) => item.id === branchId)
  const settings = useMemo(() => branchSettings.filter((item) => item.branchId === branchId), [branchId, branchSettings])
  const filtered = useMemo(() => settings.filter((setting) => {
    const matchesCategory = category === 'all' || setting.category === category
    const haystack = `${setting.label} ${setting.description} ${setting.key}`.toLocaleLowerCase('mn-MN')
    return matchesCategory && haystack.includes(query.trim().toLocaleLowerCase('mn-MN'))
  }), [category, query, settings])
  const selectedId = searchParams.get('setting')
  const selected = filtered.find((setting) => setting.id === selectedId) ?? filtered[0]

  if (!branch) return null

  const managerEditable = settings.filter((item) => item.managerEditable).length
  const pending = settings.filter((item) => item.status === 'configuration-required' || item.status === 'pending-approval').length
  const locked = settings.filter((item) => item.status === 'locked' || item.valueType === 'masked').length

  return (
    <div className="page branch-settings-page">
      <PageHeader
        title="Салбарын тохиргоо"
        description={`${branch.name} · салбарын утга, inherited policy, version ба audit`}
        actions={<button className="button button--secondary" type="button" onClick={() => navigate(`/branches/${branch.id}`)}><ArrowLeft size={17} />Салбарын дэлгэрэнгүй</button>}
      />

      <section className="settings-scope" aria-label="Тохиргооны эрх ба салбар">
        <div className="settings-scope__identity"><span><Building2 size={19} aria-hidden /></span><div><small>Одоогийн хамрах хүрээ</small><strong>{branch.name}</strong><p>{session.role === 'CEO' ? 'CEO · бүх салбарын read + authorized override' : 'Branch Manager · зөвхөн оноосон салбар'}</p></div></div>
        {session.role === 'CEO' ? <label><span>Салбар сонгох</span><select value={branch.id} onChange={(event) => navigate(`/branches/${event.target.value}/settings`)}>{branches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : <div className="settings-scope__guard"><ShieldCheck size={18} aria-hidden /><span>Own-branch scope</span></div>}
      </section>

      <section className="settings-summary" aria-label="Тохиргооны тойм">
        <article><Settings2 size={20} aria-hidden /><div><strong>{settings.length}</strong><span>Нийт харагдах утга</span></div></article>
        <article><UserRoundCog size={20} aria-hidden /><div><strong>{managerEditable}</strong><span>Manager editable</span></div></article>
        <article><CalendarClock size={20} aria-hidden /><div><strong>{pending}</strong><span>Шийдвэр/утга хүлээгдэж буй</span></div></article>
        <article><LockKeyhole size={20} aria-hidden /><div><strong>{locked}</strong><span>Policy эсвэл secret lock</span></div></article>
      </section>

      <section className="settings-toolbar" aria-label="Тохиргоо шүүх">
        <label className="settings-search"><Search size={17} aria-hidden /><span className="sr-only">Тохиргоо хайх</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Нэр, тайлбар, key-ээр хайх" /></label>
        <label><span className="sr-only">Ангилал</span><select value={category} onChange={(event) => setCategory(event.target.value as BranchSettingCategory | 'all')}>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <span className="settings-toolbar__count">{filtered.length} утга</span>
      </section>

      <div className="settings-workbench">
        <nav className="settings-list" aria-label="Салбарын тохиргооны жагсаалт">
          {filtered.map((setting) => (
            <button key={setting.id} type="button" className={selected?.id === setting.id ? 'settings-list__item settings-list__item--active' : 'settings-list__item'} onClick={() => setSearchParams({ setting: setting.id })}>
              <span className="settings-list__top"><small>{categoryLabels[setting.category]}</small><StatusMark tone={statusTone(setting)} label={statusCopy[setting.status]} compact /></span>
              <strong>{setting.label}</strong>
              <span className="settings-list__value">{setting.value}{setting.unit ? ` ${setting.unit}` : ''}</span>
              <span className="settings-list__meta">{originCopy[setting.origin]} · v{setting.version}</span>
            </button>
          ))}
          {!filtered.length ? <div className="settings-empty"><Search size={24} aria-hidden /><strong>Тохиргоо олдсонгүй</strong><span>Хайлт эсвэл ангиллаа өөрчилнө үү.</span></div> : null}
        </nav>
        {selected ? <SettingDetail key={`${selected.id}-${selected.version}`} setting={selected} branchName={branch.name} /> : <div className="settings-no-selection"><Clock3 size={24} aria-hidden /><span>Харах тохиргоогоо сонгоно уу.</span></div>}
      </div>

      <footer className="settings-footnote"><CheckCircle2 size={17} aria-hidden /><span>Demo/service abstraction · production-д бүх query болон command backend permission, branch scope, version, reason, effective date, audit-аар дахин шалгагдана.</span></footer>
    </div>
  )
}
