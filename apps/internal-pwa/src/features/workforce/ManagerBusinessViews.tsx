import {
  AlertTriangle,
  Bell,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  ContactRound,
  FileCheck2,
  FileText,
  History,
  Inbox,
  LockKeyhole,
  MessageSquare,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  Users,
  Wrench,
  X,
} from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import type { ManagerInsightsSnapshot } from './managerInsightsModels'
import type {
  CreateCrmHandoffInput,
  CreateFormalNoticeInput,
  CreateMaintenanceInput,
  CreateRecommendationInput,
  CreateReservationInput,
  ManagerBusinessSnapshot,
  ManagerComplaint,
  ManagerNotification,
  ManagerRecommendation,
  ManagerReservation,
  MaintenanceRequest,
} from './managerBusinessModels'
import type { ManagerView } from './ManagerWorkspaceViews'
import type { TeamMember } from './models'
import { entertainerRankLabels, formatDate, formatDateTime, membershipLevelLabels, roleLabels } from './localization'

const reservationStatusLabels: Record<ManagerReservation['status'], string> = {
  requested: 'Хүсэлт', confirmed: 'Баталгаажсан', arrived: 'Ирсэн', completed: 'Дууссан', cancelled: 'Цуцлагдсан',
}
const maintenanceStatusLabels: Record<MaintenanceRequest['status'], string> = {
  reported: 'Бүртгэсэн', assigned: 'Оноосон', 'in-progress': 'Ажиллаж байна', submitted: 'Хянуулах', verified: 'Баталгаажсан', rework: 'Дахин ажиллах',
}
const complaintStatusLabels: Record<ManagerComplaint['status'], string> = {
  received: 'Хүлээн авсан', triaged: 'Ангилсан', 'handed-off': 'Шилжүүлсэн', resolved: 'Шийдвэрлэсэн',
}
const recommendationStatusLabels: Record<ManagerRecommendation['status'], string> = {
  draft: 'Ноорог', submitted: 'Шийдвэр хүлээж байна', 'revision-requested': 'Засварт буцаасан', approved: 'Баталсан', rejected: 'Татгалзсан',
}

function ViewNotice({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return message ? <div className="status-message manager-view-notice" role="status"><Check size={18} /><span>{message}</span><button type="button" aria-label="Мэдэгдлийг хаах" onClick={onDismiss}><X size={17} /></button></div> : null
}

function ReservationCreatePanel({ branchId, onClose, onCreate }: { branchId: string; onClose: () => void; onCreate: (input: CreateReservationInput) => void }) {
  const [customerName, setCustomerName] = useState('')
  const [phoneLastFour, setPhoneLastFour] = useState('')
  const [visitAt, setVisitAt] = useState('')
  const [partySize, setPartySize] = useState(2)
  const [specialRequest, setSpecialRequest] = useState('')
  const [error, setError] = useState('')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try { onCreate({ branchId, customerName, phoneLastFour, visitAt, partySize, specialRequest }) } catch (caught) { setError(caught instanceof Error ? caught.message : 'Захиалгыг хадгалж чадсангүй.') }
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal-card business-modal" role="dialog" aria-modal="true" aria-labelledby="reservation-create-title"><header className="modal-header"><div><span className="eyebrow">Салбарын захиалга</span><h2 id="reservation-create-title">Шинэ хүсэлт бүртгэх</h2></div><button className="icon-button" type="button" aria-label="Хаах" onClick={onClose}><X size={20} /></button></header><form className="business-form" onSubmit={submit}><div className="business-form-grid"><label><span>Харилцагчийн нэр</span><input value={customerName} onChange={(event) => setCustomerName(event.target.value)} autoFocus /></label><label><span>Утасны сүүлийн 4 орон</span><input inputMode="numeric" maxLength={4} value={phoneLastFour} onChange={(event) => setPhoneLastFour(event.target.value.replace(/\D/g, ''))} placeholder="4821" /></label><label><span>Зочлох огноо, цаг</span><input type="datetime-local" value={visitAt} onChange={(event) => setVisitAt(event.target.value)} /></label><label><span>Зочдын тоо</span><input type="number" min="1" max="99" value={partySize} onChange={(event) => setPartySize(Number(event.target.value))} /></label></div><label><span>Тусгай хүсэлт</span><textarea rows={3} value={specialRequest} onChange={(event) => setSpecialRequest(event.target.value)} /></label><div className="form-boundary"><ShieldCheck size={16} /><span>Бүтэн утасны дугаарыг вэб хөтөчид хадгалахгүй. Энэ дэлгэц зөвхөн масктай таних тэмдэг үүсгэнэ.</span></div>{error ? <p className="form-error" role="alert">{error}</p> : null}<footer className="modal-actions modal-actions--end"><button className="button button--ghost" type="button" onClick={onClose}>Цуцлах</button><button className="button button--primary" type="submit"><CalendarCheck size={17} />Хүсэлт бүртгэх</button></footer></form></section></div>
}

function MaintenanceCreatePanel({ branchId, onClose, onCreate }: { branchId: string; onClose: () => void; onCreate: (input: CreateMaintenanceInput) => void }) {
  const [input, setInput] = useState<CreateMaintenanceInput>({ branchId, title: '', category: 'equipment', location: '', priority: 'normal', description: '' })
  const [error, setError] = useState('')
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); try { onCreate(input) } catch (caught) { setError(caught instanceof Error ? caught.message : 'Хүсэлтийг хадгалж чадсангүй.') } }
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal-card business-modal" role="dialog" aria-modal="true" aria-labelledby="maintenance-create-title"><header className="modal-header"><div><span className="eyebrow">Засвар үйлчилгээ</span><h2 id="maintenance-create-title">Асуудал бүртгэх</h2></div><button className="icon-button" type="button" aria-label="Хаах" onClick={onClose}><X size={20} /></button></header><form className="business-form" onSubmit={submit}><div className="business-form-grid"><label><span>Хүсэлтийн нэр</span><input value={input.title} onChange={(event) => setInput({ ...input, title: event.target.value })} autoFocus /></label><label><span>Байршил</span><input value={input.location} onChange={(event) => setInput({ ...input, location: event.target.value })} /></label><label><span>Ангилал</span><select value={input.category} onChange={(event) => setInput({ ...input, category: event.target.value as MaintenanceRequest['category'] })}><option value="equipment">Тоног төхөөрөмж</option><option value="facility">Барилга, эд хогшил</option><option value="safety">Аюулгүй ажиллагаа</option></select></label><label><span>Яаралтай байдал</span><select value={input.priority} onChange={(event) => setInput({ ...input, priority: event.target.value as MaintenanceRequest['priority'] })}><option value="normal">Энгийн</option><option value="urgent">Яаралтай</option></select></label></div><label><span>Асуудлын тайлбар</span><textarea rows={4} value={input.description} onChange={(event) => setInput({ ...input, description: event.target.value })} /></label>{error ? <p className="form-error" role="alert">{error}</p> : null}<footer className="modal-actions modal-actions--end"><button className="button button--ghost" type="button" onClick={onClose}>Цуцлах</button><button className="button button--primary" type="submit"><Wrench size={17} />Бүртгэх</button></footer></form></section></div>
}

function ReservationDetail({ item, onAction }: { item: ManagerReservation; onAction: (action: 'confirm' | 'arrive' | 'complete' | 'cancel') => void }) {
  return <section className="workspace-panel business-detail"><header className="business-detail-header"><span className="business-detail-icon"><CalendarCheck size={22} /></span><div><span className="eyebrow">{item.maskedPhone}</span><h2>{item.customerName}</h2><p>{formatDateTime(item.visitAt)} · {item.partySize} зочин</p></div><b data-state={item.status}>{reservationStatusLabels[item.status]}</b></header><dl className="business-detail-facts"><div><dt>Эх үүсвэр</dt><dd>{item.source === 'reception' ? 'Хүлээн авах' : item.source === 'customer' ? 'Харилцагчийн хүсэлт' : 'Менежер'}</dd></div><div><dt>Энтертайнер</dt><dd>{item.entertainerName ?? 'Оноогоогүй'}</dd></div><div><dt>Тусгай хүсэлт</dt><dd>{item.specialRequest ?? 'Байхгүй'}</dd></div><div><dt>Таних баримт</dt><dd>{item.consentVerified ? 'Масктай танилт баталгаатай' : 'Шалгах шаардлагатай'}</dd></div></dl><footer className="business-actions">{item.status === 'requested' ? <button className="button button--primary" type="button" onClick={() => onAction('confirm')}><Check size={16} />Баталгаажуулах</button> : null}{item.status === 'confirmed' ? <button className="button button--primary" type="button" onClick={() => onAction('arrive')}><UserRoundCheck size={16} />Ирснийг тэмдэглэх</button> : null}{item.status === 'arrived' ? <button className="button button--primary" type="button" onClick={() => onAction('complete')}><CheckCircle2 size={16} />Үйлчилгээг дуусгах</button> : null}{!['completed', 'cancelled'].includes(item.status) ? <button className="button button--ghost" type="button" onClick={() => onAction('cancel')}>Цуцлах</button> : <span><History size={15} />{formatDateTime(item.updatedAt)}</span>}</footer></section>
}

function MaintenanceDetail({ item, onAssign, onSimulate, onReview }: { item: MaintenanceRequest; onAssign: (assignedTo: string, dueDate: string) => void; onSimulate: (action: 'start' | 'submit') => void; onReview: (action: 'verify' | 'rework', note: string) => void }) {
  const [assignedTo, setAssignedTo] = useState(item.assignedTo ?? 'Техникийн туслах Бат')
  const [dueDate, setDueDate] = useState(item.dueDate ?? new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('Гүйцэтгэл болон туршилтын баримтыг хянав.')
  return <section className="workspace-panel business-detail"><header className="business-detail-header"><span className="business-detail-icon"><Wrench size={22} /></span><div><span className="eyebrow">{item.location} · {item.priority === 'urgent' ? 'Яаралтай' : 'Энгийн'}</span><h2>{item.title}</h2><p>{item.description}</p></div><b data-state={item.status}>{maintenanceStatusLabels[item.status]}</b></header><div className="maintenance-flow" aria-label="Засварын явц"><span data-done>Бүртгэсэн</span><ChevronRight size={15} /><span data-done={item.status !== 'reported' || undefined}>Оноосон</span><ChevronRight size={15} /><span data-done={['in-progress', 'submitted', 'verified'].includes(item.status) || undefined}>Гүйцэтгэл</span><ChevronRight size={15} /><span data-done={item.status === 'verified' || undefined}>Баталгаажуулалт</span></div>{item.status === 'reported' ? <div className="business-inline-form"><label><span>Хариуцагч</span><select value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)}><option>Техникийн туслах Бат</option><option>Мужаан Тамир</option></select></label><label><span>Дуусах огноо</span><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label><button className="button button--primary" type="button" onClick={() => onAssign(assignedTo, dueDate)}>Ажил оноох</button></div> : <dl className="business-detail-facts"><div><dt>Хариуцагч</dt><dd>{item.assignedTo}</dd></div><div><dt>Дуусах хугацаа</dt><dd>{item.dueDate ? formatDate(item.dueDate) : 'Тодорхойгүй'}</dd></div><div><dt>Гүйцэтгэлийн тайлбар</dt><dd>{item.result ?? 'Ирээгүй'}</dd></div><div><dt>Зурагт баримт</dt><dd>{item.evidenceFileName ?? 'Ирээгүй'}</dd></div></dl>}{item.status === 'submitted' ? <div className="business-review-box"><label><span>Менежерийн хяналтын тэмдэглэл</span><textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} /></label><div><button className="button button--secondary" type="button" onClick={() => onReview('rework', note)}>Дахин ажиллуулах</button><button className="button button--primary" type="button" onClick={() => onReview('verify', note)}><Check size={16} />Баталгаажуулж хаах</button></div></div> : null}<footer className="business-actions">{['assigned', 'rework'].includes(item.status) ? <button className="button button--secondary" type="button" onClick={() => onSimulate('start')}>Гүйцэтгэгч эхлүүлэхийг турших</button> : null}{item.status === 'in-progress' ? <button className="button button--secondary" type="button" onClick={() => onSimulate('submit')}>Баримттай хянуулахыг турших</button> : null}{item.managerNote ? <span><ClipboardCheck size={15} />{item.managerNote}</span> : null}</footer></section>
}

export function ManagerBranchOperationsView({ snapshot, message, onDismissMessage, onCreateReservation, onReservationAction, onCreateMaintenance, onAssignMaintenance, onSimulateMaintenance, onReviewMaintenance, onComplaintAction }: {
  snapshot: ManagerBusinessSnapshot
  message: string
  onDismissMessage: () => void
  onCreateReservation: (input: CreateReservationInput) => void
  onReservationAction: (id: string, action: 'confirm' | 'arrive' | 'complete' | 'cancel') => void
  onCreateMaintenance: (input: CreateMaintenanceInput) => void
  onAssignMaintenance: (id: string, assignedTo: string, dueDate: string) => void
  onSimulateMaintenance: (id: string, action: 'start' | 'submit') => void
  onReviewMaintenance: (id: string, action: 'verify' | 'rework', note: string) => void
  onComplaintAction: (id: string, action: 'triage' | 'handoff' | 'resolve') => void
}) {
  const [tab, setTab] = useState<'reservations' | 'maintenance' | 'complaints'>('reservations')
  const [reservationOpen, setReservationOpen] = useState(false)
  const [maintenanceOpen, setMaintenanceOpen] = useState(false)
  const [reservationId, setReservationId] = useState(snapshot.reservations[0]?.id ?? '')
  const [maintenanceId, setMaintenanceId] = useState(snapshot.maintenance[0]?.id ?? '')
  const reservation = snapshot.reservations.find((item) => item.id === reservationId) ?? snapshot.reservations[0]
  const maintenance = snapshot.maintenance.find((item) => item.id === maintenanceId) ?? snapshot.maintenance[0]
  const pendingReservations = snapshot.reservations.filter((item) => item.status === 'requested').length
  const maintenanceReview = snapshot.maintenance.filter((item) => item.status === 'submitted').length
  const openComplaints = snapshot.complaints.filter((item) => item.status !== 'resolved').length
  return <><section className="page-heading manager-view-heading"><div><span className="eyebrow">Салбарын өдөр тутмын үйлчилгээ</span><h1>Үйл ажиллагааны төв</h1><p>Захиалга, засвар, үйлчилгээний санал гомдлыг нэг салбарын хүрээнд хянаж, эзэнд нь шилжүүлж, баримттай хаана.</p></div>{tab === 'reservations' ? <button className="button button--primary" type="button" onClick={() => setReservationOpen(true)}><Plus size={17} />Захиалга бүртгэх</button> : tab === 'maintenance' ? <button className="button button--primary" type="button" onClick={() => setMaintenanceOpen(true)}><Plus size={17} />Засвар бүртгэх</button> : null}</section><ViewNotice message={message} onDismiss={onDismissMessage} /><section className="business-metrics"><article><CalendarCheck size={20} /><span>Захиалгын хүсэлт</span><strong>{pendingReservations}</strong></article><article><Wrench size={20} /><span>Хянуулах засвар</span><strong>{maintenanceReview}</strong></article><article><MessageSquare size={20} /><span>Нээлттэй санал, гомдол</span><strong>{openComplaints}</strong></article></section><div className="segmented-control business-tabs" role="tablist" aria-label="Үйл ажиллагааны төрөл"><button role="tab" aria-selected={tab === 'reservations'} className={tab === 'reservations' ? 'active' : ''} onClick={() => setTab('reservations')}>Захиалга · {snapshot.reservations.length}</button><button role="tab" aria-selected={tab === 'maintenance'} className={tab === 'maintenance' ? 'active' : ''} onClick={() => setTab('maintenance')}>Засвар · {snapshot.maintenance.length}</button><button role="tab" aria-selected={tab === 'complaints'} className={tab === 'complaints' ? 'active' : ''} onClick={() => setTab('complaints')}>Санал, гомдол · {openComplaints}</button></div>{tab === 'reservations' ? <div className="business-master-detail"><section className="workspace-panel business-list"><header className="card-header"><div><h2>Захиалгын дараалал</h2><p>Хүсэлтээс үйлчилгээ дуусах хүртэлх төлөв</p></div><CalendarCheck size={20} /></header><div>{snapshot.reservations.map((item) => <button key={item.id} className={reservation?.id === item.id ? 'selected' : ''} type="button" onClick={() => setReservationId(item.id)}><span data-state={item.status}>{reservationStatusLabels[item.status]}</span><div><strong>{item.customerName}</strong><small>{formatDateTime(item.visitAt)} · {item.partySize} хүн</small></div><ChevronRight size={17} /></button>)}</div></section>{reservation ? <ReservationDetail item={reservation} onAction={(action) => onReservationAction(reservation.id, action)} /> : null}</div> : null}{tab === 'maintenance' ? <div className="business-master-detail"><section className="workspace-panel business-list"><header className="card-header"><div><h2>Засварын дараалал</h2><p>Оношилгоо, гүйцэтгэл, баталгаажуулалт</p></div><Wrench size={20} /></header><div>{snapshot.maintenance.map((item) => <button key={item.id} className={maintenance?.id === item.id ? 'selected' : ''} type="button" onClick={() => setMaintenanceId(item.id)}><span data-state={item.status}>{maintenanceStatusLabels[item.status]}</span><div><strong>{item.title}</strong><small>{item.location} · {item.priority === 'urgent' ? 'Яаралтай' : 'Энгийн'}</small></div><ChevronRight size={17} /></button>)}</div></section>{maintenance ? <MaintenanceDetail key={`${maintenance.id}-${maintenance.status}`} item={maintenance} onAssign={(assignedTo, dueDate) => onAssignMaintenance(maintenance.id, assignedTo, dueDate)} onSimulate={(action) => onSimulateMaintenance(maintenance.id, action)} onReview={(action, note) => onReviewMaintenance(maintenance.id, action, note)} /> : null}</div> : null}{tab === 'complaints' ? <section className="complaint-grid">{snapshot.complaints.map((item) => <article className="workspace-panel complaint-card" key={item.id} data-restricted={item.restricted || undefined}><header><span className="business-detail-icon">{item.restricted ? <LockKeyhole size={20} /> : <MessageSquare size={20} />}</span><div><span className="eyebrow">{item.type === 'people' ? 'Хүний нөөц' : item.type === 'customer' ? 'Харилцагч' : 'Үйлчилгээ'}</span><h2>{item.subject}</h2></div><b data-state={item.status}>{complaintStatusLabels[item.status]}</b></header><p>{item.summary}</p><dl><div><dt>Одоогийн эзэн</dt><dd>{item.ownerRole}</dd></div><div><dt>Хүлээн авсан</dt><dd>{formatDateTime(item.receivedAt)}</dd></div></dl><footer>{item.restricted ? <button className="button button--secondary" type="button" onClick={() => onComplaintAction(item.id, 'handoff')}>Хүний нөөцөд шилжүүлэх</button> : item.status === 'received' ? <button className="button button--secondary" type="button" onClick={() => onComplaintAction(item.id, 'triage')}>Ангилж хүлээн авах</button> : item.status !== 'resolved' ? <><button className="button button--ghost" type="button" onClick={() => onComplaintAction(item.id, 'handoff')}>Эзэнд шилжүүлэх</button><button className="button button--primary" type="button" onClick={() => onComplaintAction(item.id, 'resolve')}>Үйлчилгээний асуудлыг хаах</button></> : <span><CheckCircle2 size={16} />Шийдвэрлэсэн</span>}</footer></article>)}</section> : null}<section className="scope-guardrail"><ShieldCheck size={19} /><div><strong>Үйл ажиллагааны эрхийн зааг</strong><span>Менежер өөрийн салбарын захиалга, засвар, үйлчилгээний асуудлыг удирдана. Хүний нөөцийн нууц гомдлын агуулга харагдахгүй; зөвхөн эрх бүхий эзэнд шилжүүлж, төлөвийг хянана.</span></div></section>{reservationOpen ? <ReservationCreatePanel branchId={snapshot.branchId} onClose={() => setReservationOpen(false)} onCreate={(input) => { onCreateReservation(input); setReservationOpen(false) }} /> : null}{maintenanceOpen ? <MaintenanceCreatePanel branchId={snapshot.branchId} onClose={() => setMaintenanceOpen(false)} onCreate={(input) => { onCreateMaintenance(input); setMaintenanceOpen(false) }} /> : null}</>
}

function NoticeCreatePanel({ branchId, members, onClose, onCreate }: { branchId: string; members: TeamMember[]; onClose: () => void; onCreate: (input: CreateFormalNoticeInput) => void }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10))
  const [audienceIds, setAudienceIds] = useState<string[]>([])
  const [error, setError] = useState('')
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); try { onCreate({ branchId, title, body, dueDate, audienceIds }) } catch (caught) { setError(caught instanceof Error ? caught.message : 'Албан мэдэгдлийг үүсгэж чадсангүй.') } }
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal-card business-modal" role="dialog" aria-modal="true" aria-labelledby="notice-create-title"><header className="modal-header"><div><span className="eyebrow">Заавар ба баталгаажуулалт</span><h2 id="notice-create-title">Албан мэдэгдэл үүсгэх</h2></div><button className="icon-button" type="button" aria-label="Хаах" onClick={onClose}><X size={20} /></button></header><form className="business-form" onSubmit={submit}><label><span>Гарчиг</span><input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus /></label><label><span>Зааврын агуулга</span><textarea rows={4} value={body} onChange={(event) => setBody(event.target.value)} /></label><label><span>Баталгаажуулах эцсийн хугацаа</span><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label><fieldset className="audience-picker"><legend>Хүлээн авагчид</legend>{members.filter((member) => member.active).map((member) => <label key={member.id}><input type="checkbox" checked={audienceIds.includes(member.id)} onChange={(event) => setAudienceIds((current) => event.target.checked ? [...current, member.id] : current.filter((item) => item !== member.id))} /><span className="avatar avatar--member">{member.initials}</span><span><strong>{member.name}</strong><small>{roleLabels[member.role]}</small></span></label>)}</fieldset>{error ? <p className="form-error" role="alert">{error}</p> : null}<footer className="modal-actions modal-actions--end"><button className="button button--ghost" type="button" onClick={onClose}>Цуцлах</button><button className="button button--primary" type="submit"><Send size={16} />Нийтлэх баримт үүсгэх</button></footer></form></section></div>
}

function CrmHandoffPanel({ branchId, onClose, onCreate }: { branchId: string; onClose: () => void; onCreate: (input: CreateCrmHandoffInput) => void }) {
  const [input, setInput] = useState<CreateCrmHandoffInput>({ branchId, title: '', criteria: '', reason: '' })
  const [error, setError] = useState('')
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); try { onCreate(input) } catch (caught) { setError(caught instanceof Error ? caught.message : 'CRM хүсэлтийг үүсгэж чадсангүй.') } }
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal-card business-modal" role="dialog" aria-modal="true" aria-labelledby="crm-handoff-title"><header className="modal-header"><div><span className="eyebrow">CRM багт шилжүүлэх</span><h2 id="crm-handoff-title">Сегмент, харилцааны хүсэлт</h2></div><button className="icon-button" type="button" aria-label="Хаах" onClick={onClose}><X size={20} /></button></header><form className="business-form" onSubmit={submit}><label><span>Хүсэлтийн нэр</span><input value={input.title} onChange={(event) => setInput({ ...input, title: event.target.value })} autoFocus /></label><label><span>Сегментийн нөхцөл</span><textarea rows={3} value={input.criteria} onChange={(event) => setInput({ ...input, criteria: event.target.value })} placeholder="Жишээ: Gold+ · 45 хоног зочлоогүй" /></label><label><span>Бизнес үндэслэл</span><textarea rows={3} value={input.reason} onChange={(event) => setInput({ ...input, reason: event.target.value })} /></label><div className="form-boundary"><ShieldCheck size={16} /><span>Энэ үйлдэл кампанит ажил илгээхгүй. CRM/маркетингийн эрхтэй багт хянуулах хүсэлт л үүсгэнэ.</span></div>{error ? <p className="form-error" role="alert">{error}</p> : null}<footer className="modal-actions modal-actions--end"><button className="button button--ghost" type="button" onClick={onClose}>Цуцлах</button><button className="button button--primary" type="submit"><Send size={16} />CRM багт шилжүүлэх</button></footer></form></section></div>
}

function NotificationCard({ item, onRead, onEscalate, onNavigate }: { item: ManagerNotification; onRead: () => void; onEscalate: () => void; onNavigate: (view: ManagerView) => void }) {
  return <article className="notification-card" data-severity={item.severity} data-read={Boolean(item.readAt) || undefined}><span className="notification-mark">{item.severity === 'critical' ? <AlertTriangle size={20} /> : <Bell size={20} />}</span><div><header><span>{item.severity === 'critical' ? 'Яаралтай' : item.severity === 'warning' ? 'Анхаарах' : 'Мэдээлэл'}</span><time>{formatDateTime(item.createdAt)}</time></header><h3>{item.title}</h3><p>{item.body}</p><footer><button className="button button--secondary" type="button" onClick={() => onNavigate(item.relatedView)}>Холбогдох ажлыг нээх</button>{!item.readAt ? <button className="button button--ghost" type="button" onClick={onRead}>Уншсан</button> : null}{item.severity !== 'info' && !item.escalationRecordedAt ? <button className="button button--ghost" type="button" onClick={onEscalate}>Шат ахиулсан баримт</button> : item.escalationRecordedAt ? <span><History size={14} />Шат ахиулалтыг тэмдэглэсэн</span> : null}</footer></div></article>
}

export function ManagerInboxView({ snapshot, teamMembers, message, onDismissMessage, onReadNotification, onEscalateNotification, onCreateNotice, onAcknowledgeNotice, onCreateCrmHandoff, onNavigate }: {
  snapshot: ManagerBusinessSnapshot
  teamMembers: TeamMember[]
  message: string
  onDismissMessage: () => void
  onReadNotification: (id: string) => void
  onEscalateNotification: (id: string) => void
  onCreateNotice: (input: CreateFormalNoticeInput) => void
  onAcknowledgeNotice: (noticeId: string, teamMemberId: string) => void
  onCreateCrmHandoff: (input: CreateCrmHandoffInput) => void
  onNavigate: (view: ManagerView) => void
}) {
  const [tab, setTab] = useState<'notifications' | 'notices' | 'crm'>('notifications')
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [crmOpen, setCrmOpen] = useState(false)
  const unread = snapshot.notifications.filter((item) => !item.readAt).length
  const unacknowledged = snapshot.notices.reduce((sum, item) => sum + item.audienceIds.filter((memberId) => !item.acknowledgedByIds.includes(memberId)).length, 0)
  const memberById = useMemo(() => new Map(teamMembers.map((item) => [item.id, item])), [teamMembers])
  return <><section className="page-heading manager-view-heading"><div><span className="eyebrow">Мэдэгдэл ба харилцааны баримт</span><h1>Менежерийн мэдээллийн төв</h1><p>Шийдвэрлэх мэдэгдэл, албан зааврын хүлээн авалт, CRM харилцааны зөвшөөрөлтэй түүх болон багт шилжүүлэх хүсэлтийг хянана.</p></div>{tab === 'notices' ? <button className="button button--primary" type="button" onClick={() => setNoticeOpen(true)}><Plus size={17} />Албан мэдэгдэл</button> : tab === 'crm' ? <button className="button button--primary" type="button" onClick={() => setCrmOpen(true)}><Plus size={17} />CRM хүсэлт</button> : null}</section><ViewNotice message={message} onDismiss={onDismissMessage} /><div className="segmented-control business-tabs" role="tablist" aria-label="Мэдээллийн төрөл"><button role="tab" aria-selected={tab === 'notifications'} className={tab === 'notifications' ? 'active' : ''} onClick={() => setTab('notifications')}>Мэдэгдэл · {unread}</button><button role="tab" aria-selected={tab === 'notices'} className={tab === 'notices' ? 'active' : ''} onClick={() => setTab('notices')}>Албан заавар · {unacknowledged}</button><button role="tab" aria-selected={tab === 'crm'} className={tab === 'crm' ? 'active' : ''} onClick={() => setTab('crm')}>CRM харилцаа</button></div>{tab === 'notifications' ? <section className="workspace-panel notification-center"><header className="card-header"><div><h2>Шийдвэрлэх мэдэгдлүүд</h2><p>PWA доторх баримт; гаднын суваг руу бодитоор илгээгээгүй</p></div><Inbox size={21} /></header><div>{snapshot.notifications.map((item) => <NotificationCard key={item.id} item={item} onRead={() => onReadNotification(item.id)} onEscalate={() => onEscalateNotification(item.id)} onNavigate={onNavigate} />)}</div></section> : null}{tab === 'notices' ? <section className="notice-grid">{snapshot.notices.map((notice) => { const waiting = notice.audienceIds.filter((item) => !notice.acknowledgedByIds.includes(item)); return <article className="workspace-panel formal-notice" key={notice.id}><header><span className="business-detail-icon"><FileText size={20} /></span><div><span className="eyebrow">{formatDateTime(notice.issuedAt)}</span><h2>{notice.title}</h2></div><b>{notice.acknowledgedByIds.length}/{notice.audienceIds.length}</b></header><p>{notice.body}</p><div className="notice-progress"><span style={{ width: `${notice.audienceIds.length ? (notice.acknowledgedByIds.length / notice.audienceIds.length) * 100 : 0}%` }} /></div><footer><span><Clock3 size={15} />Эцсийн хугацаа {formatDate(notice.dueDate)}</span>{waiting.length ? <button className="button button--secondary" type="button" onClick={() => onAcknowledgeNotice(notice.id, waiting[0])}><UserRoundCheck size={16} />{memberById.get(waiting[0])?.name} баталгаажуулахыг турших</button> : <strong><CheckCircle2 size={16} />Бүгд баталгаажуулсан</strong>}</footer></article> })}</section> : null}{tab === 'crm' ? <div className="crm-communications-layout"><section className="workspace-panel communication-history"><header className="card-header"><div><h2>Харилцааны түүх</h2><p>Салбарын хүрээн дэх масктай, зөвшөөрлийн төлөвтэй баримт</p></div><ContactRound size={20} /></header><div className="communication-table" role="table"><div role="row"><strong role="columnheader">Харилцагч</strong><strong role="columnheader">Суваг</strong><strong role="columnheader">Зорилго</strong><strong role="columnheader">Төлөв</strong><strong role="columnheader">Огноо</strong></div>{snapshot.communications.map((item) => <div role="row" key={item.id}><span role="cell"><strong>{item.customerName}</strong><small>{item.maskedPhone}</small></span><span role="cell">{item.channel}</span><span role="cell">{item.purpose}</span><span role="cell" data-state={item.deliveryState}>{item.deliveryState === 'delivered' ? 'Хүрсэн' : item.deliveryState === 'recorded' ? 'Бүртгэсэн' : 'Алдаа'}</span><time role="cell">{formatDateTime(item.occurredAt)}</time></div>)}</div></section><section className="workspace-panel crm-handoff-list"><header className="card-header"><div><h2>CRM багт шилжүүлсэн</h2><p>Менежер өөрөө кампанит ажил илгээхгүй</p></div><Send size={20} /></header>{snapshot.crmHandoffs.map((item) => <article key={item.id}><header><strong>{item.title}</strong><span data-state={item.status}>{item.status === 'submitted' ? 'Илгээсэн' : item.status === 'accepted' ? 'Хүлээн авсан' : 'Хаасан'}</span></header><p>{item.criteria}</p><small>{item.reason} · {formatDateTime(item.createdAt)}</small></article>)}</section></div> : null}<section className="scope-guardrail"><ShieldCheck size={19} /><div><strong>PWA ба CRM эрхийн зааг</strong><span>Дотоод мэдэгдэл, баталгаажуулалтын баримтыг энд хянана. Гадаад мессежийн бодит хүргэлт, маркетингийн сегмент үүсгэх, кампанит ажил илгээх эрх CRM/маркетингийн эзэнд хэвээр үлдэнэ.</span></div></section>{noticeOpen ? <NoticeCreatePanel branchId={snapshot.branchId} members={teamMembers} onClose={() => setNoticeOpen(false)} onCreate={(input) => { onCreateNotice(input); setNoticeOpen(false) }} /> : null}{crmOpen ? <CrmHandoffPanel branchId={snapshot.branchId} onClose={() => setCrmOpen(false)} onCreate={(input) => { onCreateCrmHandoff(input); setCrmOpen(false) }} /> : null}</>
}

function RecommendationCreatePanel({ branchId, insights, teamMembers, onClose, onCreate }: { branchId: string; insights: ManagerInsightsSnapshot; teamMembers: TeamMember[]; onClose: () => void; onCreate: (input: CreateRecommendationInput) => void }) {
  const entertainers = teamMembers.filter((item) => item.rank)
  const [type, setType] = useState<CreateRecommendationInput['type']>('entertainer-rank')
  const [subjectId, setSubjectId] = useState(entertainers[0]?.id ?? '')
  const [proposedValue, setProposedValue] = useState('')
  const [evidenceSummary, setEvidenceSummary] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const entertainer = entertainers.find((item) => item.id === subjectId)
  const customer = insights.customers.find((item) => item.id === subjectId)
  function changeType(next: CreateRecommendationInput['type']) { setType(next); setSubjectId(next === 'entertainer-rank' ? entertainers[0]?.id ?? '' : insights.customers[0]?.id ?? ''); setProposedValue(''); setEvidenceSummary(''); setReason('') }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); try { const subjectName = type === 'entertainer-rank' ? entertainer?.name ?? '' : customer?.displayName ?? ''; const currentValue = type === 'entertainer-rank' ? entertainer?.rank ? entertainerRankLabels[entertainer.rank] : 'Тодорхойгүй' : customer ? membershipLevelLabels[customer.membershipLevel] : 'Тодорхойгүй'; onCreate({ branchId, type, subjectId, subjectName, currentValue, proposedValue, evidenceSummary, reason }) } catch (caught) { setError(caught instanceof Error ? caught.message : 'Саналыг үүсгэж чадсангүй.') } }
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal-card business-modal" role="dialog" aria-modal="true" aria-labelledby="recommendation-create-title"><header className="modal-header"><div><span className="eyebrow">Гүйцэтгэх захирал эсвэл CRM-ийн шийдвэрт шилжүүлэх</span><h2 id="recommendation-create-title">Менежерийн санал бэлтгэх</h2></div><button className="icon-button" type="button" aria-label="Хаах" onClick={onClose}><X size={20} /></button></header><form className="business-form" onSubmit={submit}><div className="business-form-grid"><label><span>Саналын төрөл</span><select value={type} onChange={(event) => changeType(event.target.value as CreateRecommendationInput['type'])}><option value="entertainer-rank">Энтертайнерийн зэрэглэл</option><option value="customer-membership">Харилцагчийн гишүүнчлэл</option></select></label><label><span>{type === 'entertainer-rank' ? 'Энтертайнер' : 'Харилцагч'}</span><select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>{type === 'entertainer-rank' ? entertainers.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.rank ? entertainerRankLabels[item.rank] : ''}</option>) : insights.customers.map((item) => <option key={item.id} value={item.id}>{item.displayName} · {membershipLevelLabels[item.membershipLevel]}</option>)}</select></label></div><label><span>{type === 'entertainer-rank' ? 'Санал болгож буй зэрэглэл' : 'Дэмжих эсвэл хадгалах санал'}</span><input value={proposedValue} onChange={(event) => setProposedValue(event.target.value)} placeholder={type === 'entertainer-rank' ? 'Жишээ: 1-р зэрэглэл' : 'Жишээ: Тооцоолсон түвшнийг дэмжих'} /></label><label><span>Нотолгооны хураангуй</span><textarea rows={3} value={evidenceSummary} onChange={(event) => setEvidenceSummary(event.target.value)} /></label><label><span>Менежерийн үндэслэл</span><textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} /></label><div className="form-boundary"><ShieldCheck size={16} /><span>Энэ саналаас зэрэглэл эсвэл гишүүнчлэлийн түвшин өөрчлөгдөхгүй. Эрх бүхий эцсийн шийдвэр тусдаа бүртгэгдэнэ.</span></div>{error ? <p className="form-error" role="alert">{error}</p> : null}<footer className="modal-actions modal-actions--end"><button className="button button--ghost" type="button" onClick={onClose}>Цуцлах</button><button className="button button--primary" type="submit"><FileCheck2 size={16} />Ноорог үүсгэх</button></footer></form></section></div>
}

export function ManagerRecommendationsView({ snapshot, insights, teamMembers, message, onDismissMessage, onCreate, onSubmit }: { snapshot: ManagerBusinessSnapshot; insights: ManagerInsightsSnapshot; teamMembers: TeamMember[]; message: string; onDismissMessage: () => void; onCreate: (input: CreateRecommendationInput) => void; onSubmit: (id: string) => void }) {
  const [filter, setFilter] = useState<'all' | 'entertainer-rank' | 'customer-membership'>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const visible = snapshot.recommendations.filter((item) => filter === 'all' || item.type === filter)
  const pending = snapshot.recommendations.filter((item) => item.status === 'submitted').length
  return <>
    <section className="page-heading manager-view-heading">
      <div><span className="eyebrow">Тайлбарлагдах нотолгоо ба шийдвэрийн зааг</span><h1>Шийдвэрийн санал</h1><p>Энтертайнерийн 14 хоногийн зэрэглэл болон харилцагчийн тооцоолсон түвшний нотолгоог хянаж, эрх бүхий эцсийн шийдвэрт санал илгээнэ.</p></div>
      <button className="button button--primary" type="button" onClick={() => setCreateOpen(true)}><Plus size={17} />Санал бэлтгэх</button>
    </section>
    <ViewNotice message={message} onDismiss={onDismissMessage} />
    <section className="recommendation-summary">
      <article><Sparkles size={20} /><div><span>Шийдвэр хүлээж байна</span><strong>{pending}</strong></div></article>
      <article><Users size={20} /><div><span>Энтертайнерийн санал</span><strong>{snapshot.recommendations.filter((item) => item.type === 'entertainer-rank').length}</strong></div></article>
      <article><ContactRound size={20} /><div><span>Гишүүнчлэлийн санал</span><strong>{snapshot.recommendations.filter((item) => item.type === 'customer-membership').length}</strong></div></article>
    </section>
    <div className="segmented-control business-tabs" role="tablist" aria-label="Саналын төрөл">
      <button role="tab" aria-selected={filter === 'all'} className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Бүгд</button>
      <button role="tab" aria-selected={filter === 'entertainer-rank'} className={filter === 'entertainer-rank' ? 'active' : ''} onClick={() => setFilter('entertainer-rank')}>Энтертайнер</button>
      <button role="tab" aria-selected={filter === 'customer-membership'} className={filter === 'customer-membership' ? 'active' : ''} onClick={() => setFilter('customer-membership')}>Харилцагч</button>
    </div>
    <section className="recommendation-list">
      {visible.map((item) => <article className="workspace-panel recommendation-card" key={item.id}>
        <header><span className="business-detail-icon">{item.type === 'entertainer-rank' ? <Users size={20} /> : <ContactRound size={20} />}</span><div><span className="eyebrow">{item.type === 'entertainer-rank' ? '14 хоногийн зэрэглэлийн санал' : 'Гишүүнчлэлийн түвшний дэмжлэг'}</span><h2>{item.subjectName}</h2></div><b data-state={item.status}>{recommendationStatusLabels[item.status]}</b></header>
        <div className="recommendation-change"><span><small>Одоогийн эх утга</small><strong>{item.currentValue}</strong></span><ChevronRight size={19} /><span><small>Менежерийн санал</small><strong>{item.proposedValue}</strong></span></div>
        <section><h3>Нотолгооны хураангуй</h3><p>{item.evidenceSummary}</p></section>
        <section><h3>Үндэслэл</h3><p>{item.reason}</p></section>
        <div className="recommendation-policy"><ShieldCheck size={16} /><span>{item.policyNote}</span></div>
        {item.decisionComment ? <blockquote className="manager-decision-comment"><strong>Гүйцэтгэх захирлын шийдвэрийн тайлбар</strong><span>{item.decisionComment}</span></blockquote> : null}
        <footer><span><History size={15} />{formatDateTime(item.updatedAt)}</span>{['draft', 'revision-requested'].includes(item.status) ? <button className="button button--primary" type="button" onClick={() => onSubmit(item.id)}><Send size={16} />Эцсийн шийдвэрт илгээх</button> : <strong><Clock3 size={16} />Менежерээс өөрчлөх боломжгүй</strong>}</footer>
      </article>)}
    </section>
    <section className="scope-guardrail"><ShieldCheck size={19} /><div><strong>Шийдвэр гаргах эрхийн зааг</strong><span>Салбарын менежер баримтыг хянаж санал илгээнэ. Энтертайнерийн зэрэглэлийн эцсийн шийдвэрийг Гүйцэтгэх захирал, харилцагчийн гишүүнчлэлийн өөрчлөлтийг хүчинтэй бодлого ба CRM болон Гүйцэтгэх захирлын эрх бүхий урсгал шийднэ.</span></div></section>
    {createOpen ? <RecommendationCreatePanel branchId={snapshot.branchId} insights={insights} teamMembers={teamMembers} onClose={() => setCreateOpen(false)} onCreate={(input) => { onCreate(input); setCreateOpen(false) }} /> : null}
  </>
}
