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
  FormalNotice,
  CrmCommunicationRecord,
  CrmHandoffRequest,
} from './managerBusinessModels'

export const MANAGER_BUSINESS_STORAGE_KEY = 'vipclub.manager-business.mn.v2'
const AUTHORIZED_BRANCH_ID = 'branch-central'
const MANAGER_NAME = 'Ариун менежер'
const ALLOWED_TEAM_IDS = new Set([
  'tm-anu', 'tm-bolor', 'tm-naraa', 'tm-solongo', 'tm-temuulen', 'tm-bilguun',
  'tm-sarnai', 'tm-oyun', 'tm-enkhjin', 'tm-munkh', 'tm-altan', 'tm-bat', 'tm-tamir', 'tm-naran',
])

export interface StoredBusinessState {
  reservations: ManagerReservation[]
  maintenance: MaintenanceRequest[]
  complaints: ManagerComplaint[]
  notifications: ManagerNotification[]
  notices: FormalNotice[]
  communications: CrmCommunicationRecord[]
  crmHandoffs: CrmHandoffRequest[]
  recommendations: ManagerRecommendation[]
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function id(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function requireText(value: string, label: string, minimum = 1): string {
  const result = value.trim()
  if (result.length < minimum) throw new Error(`${label} дор хаяж ${minimum} тэмдэгт байна.`)
  return result
}

function addDays(days: number): string {
  const result = new Date()
  result.setDate(result.getDate() + days)
  return result.toISOString().slice(0, 10)
}

function atHour(days: number, hour: number): string {
  const result = new Date()
  result.setDate(result.getDate() + days)
  result.setHours(hour, 0, 0, 0)
  return result.toISOString()
}

function createSeedState(): StoredBusinessState {
  const now = new Date().toISOString()
  return {
    reservations: [
      { id: 'reservation-erdene', branchId: AUTHORIZED_BRANCH_ID, customerName: 'Эрдэнэ Т.', maskedPhone: '•••• 4821', visitAt: atHour(0, 21), partySize: 6, status: 'confirmed', source: 'reception', entertainerName: 'Бат Ану', specialRequest: 'Тайван бүсийн ширээ', consentVerified: true, updatedAt: now },
      { id: 'reservation-bolormaa', branchId: AUTHORIZED_BRANCH_ID, customerName: 'Болормаа Г.', maskedPhone: '•••• 1190', visitAt: atHour(1, 20), partySize: 4, status: 'requested', source: 'customer', specialRequest: 'Төрсөн өдрийн жижиг бэлтгэл', consentVerified: true, updatedAt: now },
      { id: 'reservation-munkh', branchId: AUTHORIZED_BRANCH_ID, customerName: 'Мөнх-Оргил Н.', maskedPhone: '•••• 7602', visitAt: atHour(-1, 22), partySize: 3, status: 'completed', source: 'manager', consentVerified: true, updatedAt: now },
    ],
    maintenance: [
      { id: 'maintenance-audio', branchId: AUTHORIZED_BRANCH_ID, title: 'VIP 3 өрөөний дууны холболт', category: 'equipment', location: 'VIP 3 өрөө', priority: 'urgent', status: 'submitted', description: 'Зүүн талын чанга яригч тасалдаж байна.', assignedTo: 'Техникийн туслах Бат', dueDate: addDays(0), result: 'Кабелийн толгойг сольж, 30 минут туршив.', evidenceFileName: 'vip3-audio-test.jpg', createdAt: now, updatedAt: now },
      { id: 'maintenance-door', branchId: AUTHORIZED_BRANCH_ID, title: 'Үндсэн хаалганы бариул', category: 'facility', location: 'Үндсэн орц', priority: 'normal', status: 'assigned', description: 'Бариул суларсан тул хаалт жигд бус байна.', assignedTo: 'Мужаан Тамир', dueDate: addDays(1), createdAt: now, updatedAt: now },
    ],
    complaints: [
      { id: 'complaint-service', branchId: AUTHORIZED_BRANCH_ID, type: 'service', subject: 'Хүлээлгийн хугацаа', summary: 'Захиалгат ширээ бэлдэх хугацаа 18 минутаар хоцорсон.', restricted: false, status: 'received', ownerRole: 'Салбарын менежер', receivedAt: now, updatedAt: now },
      { id: 'complaint-people', branchId: AUTHORIZED_BRANCH_ID, type: 'people', subject: 'Хүний нөөцийн нууц хүсэлт', summary: 'Хязгаарласан дэлгэрэнгүй мэдээлэл.', restricted: true, status: 'handed-off', ownerRole: 'Хүний нөөцийн менежер', receivedAt: now, updatedAt: now },
    ],
    notifications: [
      { id: 'notification-maintenance', branchId: AUTHORIZED_BRANCH_ID, severity: 'critical', category: 'maintenance', title: 'Яаралтай засварыг баталгаажуулна уу', body: 'VIP 3 өрөөний дууны холболтын гүйцэтгэл хянуулахад ирлээ.', relatedView: 'operations', createdAt: now },
      { id: 'notification-reservation', branchId: AUTHORIZED_BRANCH_ID, severity: 'warning', category: 'reservation', title: 'Захиалгын хүсэлт хүлээгдэж байна', body: 'Маргаашийн 4 хүний захиалгыг баталгаажуулах шаардлагатай.', relatedView: 'operations', createdAt: now },
      { id: 'notification-rank', branchId: AUTHORIZED_BRANCH_ID, severity: 'info', category: 'decision', title: '14 хоногийн зэрэглэлийн хяналт', body: 'Энтертайнерийн нотолгоог хянаж, Гүйцэтгэх захиралд санал илгээнэ үү.', relatedView: 'recommendations', createdAt: now },
    ],
    notices: [
      { id: 'notice-safety', branchId: AUTHORIZED_BRANCH_ID, title: 'Оройн ээлжийн аюулгүй ажиллагааны заавар', body: 'Гарц, зөрчил мэдээлэх дараалал, хаалтын шалгалтыг ээлж эхлэхээс өмнө баталгаажуулна.', issuedBy: MANAGER_NAME, issuedAt: now, dueDate: addDays(1), audienceIds: ['tm-temuulen', 'tm-sarnai', 'tm-munkh'], acknowledgedByIds: ['tm-munkh'] },
    ],
    communications: [
      { id: 'comm-1', branchId: AUTHORIZED_BRANCH_ID, customerName: 'Эрдэнэ Т.', maskedPhone: '•••• 4821', channel: 'SMS', purpose: 'Захиалга баталгаажуулалт', consentState: 'not-required', deliveryState: 'delivered', occurredAt: now },
      { id: 'comm-2', branchId: AUTHORIZED_BRANCH_ID, customerName: 'Болормаа Г.', maskedPhone: '•••• 1190', channel: 'PWA', purpose: 'Gold түвшний зөвшөөрөлтэй санал', consentState: 'verified', deliveryState: 'recorded', occurredAt: atHour(-2, 13) },
    ],
    crmHandoffs: [
      { id: 'handoff-inactive-gold', branchId: AUTHORIZED_BRANCH_ID, title: 'Идэвхгүй Gold+ харилцагч', criteria: 'Gold ба түүнээс дээш · 45+ хоног зочлоогүй', reason: 'Давтан захиалгын зөвшөөрөлтэй төлөвлөгөө бэлтгэх', status: 'accepted', createdAt: now },
    ],
    recommendations: [
      { id: 'recommendation-bolor', branchId: AUTHORIZED_BRANCH_ID, type: 'entertainer-rank', subjectId: 'tm-bolor', subjectName: 'Эрдэнэ Болор', currentValue: '2-р зэрэглэл', proposedValue: '1-р зэрэглэл', evidenceSummary: '14 хоног · ирц 100% · давтан захиалга 7 · баталгаажсан борлуулалт өссөн', reason: 'Шалгуурын тайлбарлагдах баримтыг Гүйцэтгэх захиралд хянуулах', status: 'draft', policyNote: 'Тоон босго, жин ба хатуу шалгуурын хүчинтэй хувилбар хүлээгдэж байна.', createdAt: now, updatedAt: now },
      { id: 'recommendation-customer', branchId: AUTHORIZED_BRANCH_ID, type: 'customer-membership', subjectId: 'customer-erdene', subjectName: 'Эрдэнэ Т.', currentValue: 'Gold', proposedValue: 'Тооцоолсон түвшнийг дэмжих', evidenceSummary: '12 дууссан зочлол · дундаж эрх бүхий зарлага ₮1.24 сая · эх өгөгдөл тулгалттай', reason: 'Системийн тооцооллыг дэмжиж, CRM болон Гүйцэтгэх захирлын шийдвэрт шилжүүлэх', status: 'submitted', policyNote: 'Менежер түвшин өөрчлөхгүй; зөвхөн дэмжих эсвэл одоогийн түвшнийг хадгалах үндэслэл өгнө.', createdAt: now, updatedAt: now },
    ],
  }
}

export interface ManagerBusinessService {
  getSnapshot(branchId?: string): ManagerBusinessSnapshot
  createReservation(input: CreateReservationInput): ManagerBusinessSnapshot
  updateReservation(reservationId: string, action: 'confirm' | 'arrive' | 'complete' | 'cancel'): ManagerBusinessSnapshot
  createMaintenance(input: CreateMaintenanceInput): ManagerBusinessSnapshot
  assignMaintenance(requestId: string, assignedTo: string, dueDate: string): ManagerBusinessSnapshot
  simulateMaintenance(requestId: string, action: 'start' | 'submit'): ManagerBusinessSnapshot
  reviewMaintenance(requestId: string, action: 'verify' | 'rework', note: string): ManagerBusinessSnapshot
  updateComplaint(complaintId: string, action: 'triage' | 'handoff' | 'resolve'): ManagerBusinessSnapshot
  markNotificationRead(notificationId: string): ManagerBusinessSnapshot
  recordNotificationEscalation(notificationId: string): ManagerBusinessSnapshot
  createNotice(input: CreateFormalNoticeInput): ManagerBusinessSnapshot
  acknowledgeNotice(noticeId: string, teamMemberId: string): ManagerBusinessSnapshot
  createCrmHandoff(input: CreateCrmHandoffInput): ManagerBusinessSnapshot
  createRecommendation(input: CreateRecommendationInput): ManagerBusinessSnapshot
  submitRecommendation(recommendationId: string): ManagerBusinessSnapshot
}

export class BrowserManagerBusinessService implements ManagerBusinessService {
  private readState(): StoredBusinessState {
    try {
      const raw = window.localStorage.getItem(MANAGER_BUSINESS_STORAGE_KEY)
      if (raw) return JSON.parse(raw) as StoredBusinessState
    } catch {
      // Browser persistence is best-effort in this UI prototype.
    }
    const state = createSeedState()
    this.writeState(state)
    return state
  }

  private writeState(state: StoredBusinessState): void {
    try {
      window.localStorage.setItem(MANAGER_BUSINESS_STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Browser persistence is best-effort in this UI prototype.
    }
  }

  private requireBranch(branchId: string): void {
    if (branchId !== AUTHORIZED_BRANCH_ID) throw new Error('Энэ салбарт хандах эрхгүй байна.')
  }

  private snapshot(state: StoredBusinessState): ManagerBusinessSnapshot {
    const safeState = clone(state)
    safeState.complaints = safeState.complaints.map((item) => item.restricted
      ? { ...item, subject: 'Хязгаарласан хүний нөөцийн хүсэлт', summary: 'Дэлгэрэнгүйг зөвхөн хүний нөөцийн эрхтэй хэрэглэгч харна.' }
      : item)
    return { branchId: AUTHORIZED_BRANCH_ID, refreshedAt: new Date().toISOString(), ...safeState }
  }

  getSnapshot(branchId = AUTHORIZED_BRANCH_ID): ManagerBusinessSnapshot {
    this.requireBranch(branchId)
    return this.snapshot(this.readState())
  }

  createReservation(input: CreateReservationInput): ManagerBusinessSnapshot {
    this.requireBranch(input.branchId)
    const customerName = requireText(input.customerName, 'Харилцагчийн нэр', 2)
    if (!/^\d{4}$/.test(input.phoneLastFour)) throw new Error('Утасны сүүлийн 4 оронг зөв оруулна уу.')
    if (!input.visitAt) throw new Error('Зочлох огноо, цаг шаардлагатай.')
    if (!Number.isInteger(input.partySize) || input.partySize < 1 || input.partySize > 99) throw new Error('Зочдын тоо 1–99 байна.')
    const state = this.readState()
    const now = new Date().toISOString()
    state.reservations.unshift({ id: id('reservation'), branchId: AUTHORIZED_BRANCH_ID, customerName, maskedPhone: `•••• ${input.phoneLastFour}`, visitAt: input.visitAt, partySize: input.partySize, status: 'requested', source: 'manager', specialRequest: input.specialRequest?.trim(), consentVerified: true, updatedAt: now })
    this.writeState(state)
    return this.snapshot(state)
  }

  updateReservation(reservationId: string, action: 'confirm' | 'arrive' | 'complete' | 'cancel'): ManagerBusinessSnapshot {
    const state = this.readState()
    const reservation = state.reservations.find((item) => item.id === reservationId && item.branchId === AUTHORIZED_BRANCH_ID)
    if (!reservation) throw new Error('Захиалга олдсонгүй.')
    const allowed = {
      confirm: reservation.status === 'requested',
      arrive: reservation.status === 'confirmed',
      complete: reservation.status === 'arrived',
      cancel: !['completed', 'cancelled'].includes(reservation.status),
    }
    if (!allowed[action]) throw new Error('Захиалгын одоогийн төлөвт энэ үйлдлийг хийх боломжгүй.')
    reservation.status = action === 'confirm' ? 'confirmed' : action === 'arrive' ? 'arrived' : action === 'complete' ? 'completed' : 'cancelled'
    reservation.updatedAt = new Date().toISOString()
    this.writeState(state)
    return this.snapshot(state)
  }

  createMaintenance(input: CreateMaintenanceInput): ManagerBusinessSnapshot {
    this.requireBranch(input.branchId)
    const state = this.readState()
    const now = new Date().toISOString()
    state.maintenance.unshift({ id: id('maintenance'), branchId: AUTHORIZED_BRANCH_ID, title: requireText(input.title, 'Засварын нэр', 3), category: input.category, location: requireText(input.location, 'Байршил', 2), priority: input.priority, status: 'reported', description: requireText(input.description, 'Асуудлын тайлбар', 5), createdAt: now, updatedAt: now })
    this.writeState(state)
    return this.snapshot(state)
  }

  assignMaintenance(requestId: string, assignedTo: string, dueDate: string): ManagerBusinessSnapshot {
    const state = this.readState()
    const request = state.maintenance.find((item) => item.id === requestId && item.branchId === AUTHORIZED_BRANCH_ID)
    if (!request) throw new Error('Засварын хүсэлт олдсонгүй.')
    request.assignedTo = requireText(assignedTo, 'Хариуцагч', 2)
    if (!dueDate) throw new Error('Дуусах огноо шаардлагатай.')
    request.dueDate = dueDate
    request.status = 'assigned'
    request.updatedAt = new Date().toISOString()
    this.writeState(state)
    return this.snapshot(state)
  }

  simulateMaintenance(requestId: string, action: 'start' | 'submit'): ManagerBusinessSnapshot {
    const state = this.readState()
    const request = state.maintenance.find((item) => item.id === requestId)
    if (!request) throw new Error('Засварын хүсэлт олдсонгүй.')
    if (action === 'start' && !['assigned', 'rework'].includes(request.status)) throw new Error('Зөвхөн оноосон ажлыг эхлүүлнэ.')
    if (action === 'submit' && request.status !== 'in-progress') throw new Error('Эхлүүлсэн ажлыг л хянуулахад илгээнэ.')
    request.status = action === 'start' ? 'in-progress' : 'submitted'
    if (action === 'submit') {
      request.result = 'Оношилгоо, засварыг гүйцэтгэж туршилтаар хэвийн ажиллагааг баталгаажуулав.'
      request.evidenceFileName = 'zasvariin-barimt.jpg'
    }
    request.updatedAt = new Date().toISOString()
    this.writeState(state)
    return this.snapshot(state)
  }

  reviewMaintenance(requestId: string, action: 'verify' | 'rework', note: string): ManagerBusinessSnapshot {
    const state = this.readState()
    const request = state.maintenance.find((item) => item.id === requestId)
    if (!request || request.status !== 'submitted') throw new Error('Зөвхөн хянуулахад ирсэн засварыг шийдвэрлэнэ.')
    request.managerNote = requireText(note, 'Менежерийн тэмдэглэл', 3)
    request.status = action === 'verify' ? 'verified' : 'rework'
    request.updatedAt = new Date().toISOString()
    this.writeState(state)
    return this.snapshot(state)
  }

  updateComplaint(complaintId: string, action: 'triage' | 'handoff' | 'resolve'): ManagerBusinessSnapshot {
    const state = this.readState()
    const complaint = state.complaints.find((item) => item.id === complaintId && item.branchId === AUTHORIZED_BRANCH_ID)
    if (!complaint) throw new Error('Хүсэлт олдсонгүй.')
    if (complaint.restricted && action !== 'handoff') throw new Error('Хязгаарласан хүний нөөцийн хүсэлтийг зөвхөн эрх бүхий эзэнд шилжүүлнэ.')
    complaint.status = action === 'triage' ? 'triaged' : action === 'handoff' ? 'handed-off' : 'resolved'
    if (action === 'handoff') complaint.ownerRole = complaint.type === 'people' ? 'Хүний нөөцийн менежер' : 'CRM менежер'
    complaint.updatedAt = new Date().toISOString()
    this.writeState(state)
    return this.snapshot(state)
  }

  markNotificationRead(notificationId: string): ManagerBusinessSnapshot {
    const state = this.readState()
    const notification = state.notifications.find((item) => item.id === notificationId)
    if (!notification) throw new Error('Мэдэгдэл олдсонгүй.')
    notification.readAt = notification.readAt ?? new Date().toISOString()
    this.writeState(state)
    return this.snapshot(state)
  }

  recordNotificationEscalation(notificationId: string): ManagerBusinessSnapshot {
    const state = this.readState()
    const notification = state.notifications.find((item) => item.id === notificationId)
    if (!notification) throw new Error('Мэдэгдэл олдсонгүй.')
    notification.escalationRecordedAt = new Date().toISOString()
    this.writeState(state)
    return this.snapshot(state)
  }

  createNotice(input: CreateFormalNoticeInput): ManagerBusinessSnapshot {
    this.requireBranch(input.branchId)
    const audienceIds = [...new Set(input.audienceIds)]
    if (!audienceIds.length || audienceIds.some((item) => !ALLOWED_TEAM_IDS.has(item))) throw new Error('Өөрийн салбарын нэгээс доошгүй багийн гишүүн сонгоно уу.')
    if (!input.dueDate) throw new Error('Баталгаажуулах хугацаа шаардлагатай.')
    const state = this.readState()
    state.notices.unshift({ id: id('notice'), branchId: AUTHORIZED_BRANCH_ID, title: requireText(input.title, 'Мэдэгдлийн нэр', 3), body: requireText(input.body, 'Зааврын агуулга', 8), issuedBy: MANAGER_NAME, issuedAt: new Date().toISOString(), dueDate: input.dueDate, audienceIds, acknowledgedByIds: [] })
    this.writeState(state)
    return this.snapshot(state)
  }

  acknowledgeNotice(noticeId: string, teamMemberId: string): ManagerBusinessSnapshot {
    const state = this.readState()
    const notice = state.notices.find((item) => item.id === noticeId)
    if (!notice || !notice.audienceIds.includes(teamMemberId)) throw new Error('Энэ багийн гишүүн мэдэгдлийн хүлээн авагч биш байна.')
    if (!notice.acknowledgedByIds.includes(teamMemberId)) notice.acknowledgedByIds.push(teamMemberId)
    this.writeState(state)
    return this.snapshot(state)
  }

  createCrmHandoff(input: CreateCrmHandoffInput): ManagerBusinessSnapshot {
    this.requireBranch(input.branchId)
    const state = this.readState()
    state.crmHandoffs.unshift({ id: id('crm-handoff'), branchId: AUTHORIZED_BRANCH_ID, title: requireText(input.title, 'Хүсэлтийн нэр', 3), criteria: requireText(input.criteria, 'Сегментийн нөхцөл', 5), reason: requireText(input.reason, 'Бизнес үндэслэл', 5), status: 'submitted', createdAt: new Date().toISOString() })
    this.writeState(state)
    return this.snapshot(state)
  }

  createRecommendation(input: CreateRecommendationInput): ManagerBusinessSnapshot {
    this.requireBranch(input.branchId)
    const state = this.readState()
    const now = new Date().toISOString()
    state.recommendations.unshift({ id: id('recommendation'), branchId: AUTHORIZED_BRANCH_ID, type: input.type, subjectId: requireText(input.subjectId, 'Субъект'), subjectName: requireText(input.subjectName, 'Нэр', 2), currentValue: requireText(input.currentValue, 'Одоогийн төлөв'), proposedValue: requireText(input.proposedValue, 'Санал'), evidenceSummary: requireText(input.evidenceSummary, 'Нотолгооны хураангуй', 8), reason: requireText(input.reason, 'Үндэслэл', 8), status: 'draft', policyNote: input.type === 'entertainer-rank' ? '14 хоногийн тайлбарлагдах нотолгоо; Гүйцэтгэх захирал эцсийн шийдвэр гаргана.' : 'Менежер зөвхөн дэмжих/хадгалах санал өгнө; түвшин өөрчлөхгүй.', createdAt: now, updatedAt: now })
    this.writeState(state)
    return this.snapshot(state)
  }

  submitRecommendation(recommendationId: string): ManagerBusinessSnapshot {
    const state = this.readState()
    const recommendation = state.recommendations.find((item) => item.id === recommendationId)
    if (!recommendation || !['draft', 'revision-requested'].includes(recommendation.status)) throw new Error('Энэ саналыг одоогийн төлөвт илгээх боломжгүй.')
    recommendation.status = 'submitted'
    recommendation.updatedAt = new Date().toISOString()
    this.writeState(state)
    return this.snapshot(state)
  }
}

export function resetManagerBusinessPrototype(): void {
  try {
    window.localStorage.removeItem(MANAGER_BUSINESS_STORAGE_KEY)
  } catch {
    // Test/demo helper only.
  }
}
