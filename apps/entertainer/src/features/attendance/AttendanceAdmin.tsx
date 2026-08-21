import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Crosshair, MapPin, Printer, QrCode, RefreshCw, ShieldCheck, UserRound, UsersRound } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { api } from '../../api'
import type { BranchAttendanceQR, LeadEntertainerCandidate } from '../../api'
import './AttendanceAdmin.css'

const BRANCHES: BranchAttendanceQR['branch'][] = ['Nomad', 'Neva', 'Sapphire', 'Monarch']
const RADII = [25, 50, 75, 100, 150, 200, 300, 500]

const dateTime = new Intl.DateTimeFormat('mn-MN', {
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  timeZone: 'Asia/Ulaanbaatar',
})

function getCurrentLocation(): Promise<{ latitude: number; longitude: number; accuracy: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Энэ төхөөрөмж байршил тогтоох боломжгүй байна.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy }),
      error => reject(new Error(error.code === 1
        ? 'Байршлын зөвшөөрөл хаалттай байна. Энэ сайтын “Байршил” зөвшөөрлийг нээгээд дахин оролдоно уу.'
        : error.code === 3
          ? 'Байршил тогтооход хугацаа хэтэрлээ. GPS-ээ асаагаад дахин оролдоно уу.'
          : 'Байршил тогтоож чадсангүй. GPS болон интернет холболтоо шалгана уу.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  })
}

export function AttendanceAdminPage() {
  const [section, setSection] = useState<'qr' | 'roles'>('qr')
  const [branch, setBranch] = useState<BranchAttendanceQR['branch']>('Nomad')
  const [config, setConfig] = useState<BranchAttendanceQR>()
  const [radius, setRadius] = useState(100)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string }>()
  const [people, setPeople] = useState<LeadEntertainerCandidate[]>([])
  const [rolesLoading, setRolesLoading] = useState(false)
  const [roleSaving, setRoleSaving] = useState('')
  const [roleReason, setRoleReason] = useState('')
  const requestSequence = useRef(0)

  const load = async (selectedBranch = branch) => {
    const sequence = ++requestSequence.current
    setLoading(true)
    setMessage(undefined)
    try {
      const value = await api.branchAttendanceQR(selectedBranch)
      if (sequence !== requestSequence.current) return
      setConfig(value)
      setRadius(value.radius_meters || 100)
    } catch (error) {
      if (sequence !== requestSequence.current) return
      setConfig(undefined)
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'QR тохиргоог ачаалж чадсангүй.' })
    } finally {
      if (sequence === requestSequence.current) setLoading(false)
    }
  }

  useEffect(() => {
    if (section === 'qr') void load(branch)
    else void loadRoles(branch)
    return () => { requestSequence.current += 1 }
  }, [branch, section])

  const loadRoles = async (selectedBranch = branch) => {
    const sequence = ++requestSequence.current
    setRolesLoading(true)
    setMessage(undefined)
    try {
      const value = await api.leadEntertainerCandidates(selectedBranch)
      if (sequence === requestSequence.current) setPeople(value.people)
    } catch (error) {
      if (sequence === requestSequence.current) {
        setPeople([])
        setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Ахлах бүжигчний тохиргоог ачаалж чадсангүй.' })
      }
    } finally {
      if (sequence === requestSequence.current) setRolesLoading(false)
    }
  }

  const toggleLeadRole = async (person: LeadEntertainerCandidate) => {
    if (roleSaving || roleReason.trim().length < 5 || !person.has_login) return
    setRoleSaving(person.profile)
    setMessage(undefined)
    try {
      const value = await api.setLeadEntertainer(person.profile, !person.is_lead, roleReason.trim())
      setPeople(current => current.map(row => row.profile === person.profile ? value.person : row))
      setRoleReason('')
      setMessage({ type: 'success', text: `${person.display_name}: ${value.person.is_lead ? 'ахлах бүжигчний эрх олголоо' : 'ахлах бүжигчний эрхийг цуцаллаа'}.` })
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Үүргийг шинэчилж чадсангүй.' })
    } finally {
      setRoleSaving('')
    }
  }

  const saveCurrentLocation = async () => {
    setSaving(true)
    setMessage(undefined)
    try {
      const position = await getCurrentLocation()
      if (position.accuracy > 100) {
        throw new Error(`Байршлын нарийвчлал ${Math.round(position.accuracy)} метр байна. GPS дохио сайжирсны дараа дахин оролдоно уу.`)
      }
      const value = await api.configureBranchAttendanceLocation(branch, position.latitude, position.longitude, radius)
      setConfig(value)
      setMessage({ type: 'success', text: `${branch} салбарын зөвшөөрөгдсөн байршил хадгалагдлаа.` })
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Байршлыг хадгалж чадсангүй.' })
    } finally {
      setSaving(false)
    }
  }

  return <div className="page attendance-admin-page">
    <header className="attendance-admin-heading">
      <div><h1>Системийн тохиргоо</h1><p>Ирцийн QR болон ахлах бүжигчний үүргийг системийн админ удирдана.</p></div>
      <ShieldCheck aria-hidden="true" />
    </header>

    <nav className="attendance-admin-sections" aria-label="Системийн тохиргооны хэсэг">
      <button type="button" className={section === 'qr' ? 'active' : ''} onClick={() => setSection('qr')}><QrCode />Ирцийн QR</button>
      <button type="button" className={section === 'roles' ? 'active' : ''} onClick={() => setSection('roles')}><UsersRound />Ахлах бүжигчин</button>
    </nav>

    <nav className="attendance-branch-tabs" aria-label="Салбар сонгох">
      {BRANCHES.map(item => <button key={item} type="button" className={branch === item ? 'active' : ''} onClick={() => setBranch(item)}>{item}</button>)}
    </nav>

    {message ? <div className={`attendance-admin-message ${message.type}`} role={message.type === 'error' ? 'alert' : 'status'}>{message.type === 'success' ? <CheckCircle2 /> : <MapPin />}{message.text}</div> : null}

    {section === 'qr' ? loading ? <section className="attendance-admin-loading" aria-live="polite"><RefreshCw className="spin" />QR тохиргоог ачаалж байна…</section> : <div className="attendance-admin-layout">
      <section className="attendance-location-panel">
        <header><span><MapPin /><strong>{branch} салбарын байршил</strong></span><em className={config?.configured ? 'configured' : ''}>{config?.configured ? 'Тохируулсан' : 'Тохируулаагүй'}</em></header>
        <div className="attendance-location-facts">
          <span><small>Өргөрөг</small><strong>{config?.latitude?.toFixed(6) || '—'}</strong></span>
          <span><small>Уртраг</small><strong>{config?.longitude?.toFixed(6) || '—'}</strong></span>
        </div>
        <label><span>Зөвшөөрөх радиус</span><select value={radius} onChange={event => setRadius(Number(event.target.value))} disabled={saving}>{RADII.map(value => <option key={value} value={value}>{value} метр</option>)}</select></label>
        <button className="gold-button attendance-location-save" type="button" onClick={saveCurrentLocation} disabled={saving}>
          {saving ? <RefreshCw className="spin" /> : <Crosshair />}{saving ? 'Байршил тогтоож байна…' : 'Энэ байршлыг зөвшөөрөх'}
        </button>
        <p className="attendance-location-note">Энэ товчийг тухайн салбар дээр очсон үедээ дарна. Бүжигчин QR уншуулах мөчид сервер байршлыг дахин шалгана.</p>
        {config?.configured_at ? <small className="attendance-configured-at">Сүүлд тохируулсан: {dateTime.format(new Date(config.configured_at))}</small> : null}
      </section>

      <section className={`attendance-qr-sheet ${config?.configured ? 'ready' : ''}`}>
        <header><div><QrCode /><span><strong>{branch} — Ажилтны ирц</strong><small>Салбарын үүдэнд байрлуулах QR код</small></span></div></header>
        {config?.qr_payload ? <div className="attendance-qr-code"><QRCodeSVG value={config.qr_payload} size={248} level="H" marginSize={2} title={`${branch} салбарын ирцийн QR код`} /></div> : null}
        <div className="attendance-qr-status">
          <span className={config?.configured ? 'ready' : ''}>{config?.configured ? <CheckCircle2 /> : <MapPin />}{config?.configured ? 'Хэвлэхэд бэлэн' : 'Эхлээд салбарын байршлыг тохируулна уу'}</span>
        </div>
        <button className="outline-button attendance-print-button" type="button" disabled={!config?.configured} onClick={() => window.print()}><Printer />QR код хэвлэх</button>
      </section>
    </div> : rolesLoading ? <section className="attendance-admin-loading" aria-live="polite"><RefreshCw className="spin" />Үүргийн тохиргоог ачаалж байна…</section> : <section className="lead-role-panel">
      <header><div><span>Салбарын үүрэг</span><h2>Ахлах бүжигчин</h2><p>Өдөр тутмын бэлэн байдлын шалгалтыг хариуцна. Менежерийн хуваарь, зэрэглэл, торгуулийн эрх олгохгүй.</p></div><UserRound /></header>
      <label className="lead-role-reason"><span>Өөрчилсөн шалтгаан</span><input value={roleReason} onChange={event => setRoleReason(event.target.value)} placeholder="Жишээ: Салбарын ахлах бүжигчнээр томилов" maxLength={300} /></label>
      <div className="lead-role-list">{people.map(person => <article key={person.profile}>
        <span className="lead-role-avatar">{person.display_name.slice(0, 1)}</span>
        <span className="lead-role-identity"><strong>{person.display_name}</strong><small>{person.has_login ? person.is_lead ? 'Ахлах бүжигчин' : 'Бүжигчин' : 'Нэвтрэх эрх холбоогүй'}</small></span>
        <button type="button" className={person.is_lead ? 'remove' : ''} disabled={!person.has_login || roleReason.trim().length < 5 || Boolean(roleSaving)} onClick={() => toggleLeadRole(person)}>{roleSaving === person.profile ? <RefreshCw className="spin" /> : null}{person.is_lead ? 'Эрх цуцлах' : 'Ахлах болгох'}</button>
      </article>)}</div>
      {!people.length ? <div className="lead-role-empty">Энэ салбарт идэвхтэй бүжигчин алга байна.</div> : null}
    </section>}
  </div>
}
