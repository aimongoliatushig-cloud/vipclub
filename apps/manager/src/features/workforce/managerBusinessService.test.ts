import { beforeEach, describe, expect, it } from 'vitest'
import { BrowserManagerBusinessService, resetManagerBusinessPrototype } from './managerBusinessService'

describe('BrowserManagerBusinessService', () => {
  beforeEach(() => resetManagerBusinessPrototype())

  it('keeps every read and create action inside the authorized branch', () => {
    const service = new BrowserManagerBusinessService()
    expect(() => service.getSnapshot('branch-west')).toThrow('эрхгүй')
    expect(() => service.createReservation({ branchId: 'branch-west', customerName: 'Тест', phoneLastFour: '1234', visitAt: new Date().toISOString(), partySize: 2 })).toThrow('эрхгүй')
  })

  it('creates a masked reservation and enforces the lifecycle order', () => {
    const service = new BrowserManagerBusinessService()
    let snapshot = service.createReservation({ branchId: 'branch-central', customerName: 'Саруул Д.', phoneLastFour: '9012', visitAt: new Date().toISOString(), partySize: 5, specialRequest: 'Тайван ширээ' })
    const reservation = snapshot.reservations[0]
    expect(reservation.maskedPhone).toBe('•••• 9012')
    expect(reservation.status).toBe('requested')
    expect(() => service.updateReservation(reservation.id, 'complete')).toThrow('боломжгүй')
    snapshot = service.updateReservation(reservation.id, 'confirm')
    snapshot = service.updateReservation(reservation.id, 'arrive')
    snapshot = service.updateReservation(reservation.id, 'complete')
    expect(snapshot.reservations.find((item) => item.id === reservation.id)?.status).toBe('completed')
  })

  it('requires submitted maintenance evidence before manager verification', () => {
    const service = new BrowserManagerBusinessService()
    let snapshot = service.createMaintenance({ branchId: 'branch-central', title: 'Гэрлийн гэмтэл', category: 'equipment', location: 'VIP 2', priority: 'urgent', description: 'Таазны нэг гэрэл анивчиж байна.' })
    const request = snapshot.maintenance[0]
    expect(() => service.reviewMaintenance(request.id, 'verify', 'Шалгав')).toThrow('хянуулахад ирсэн')
    snapshot = service.assignMaintenance(request.id, 'Техникийн туслах Бат', '2026-08-15')
    snapshot = service.simulateMaintenance(request.id, 'start')
    snapshot = service.simulateMaintenance(request.id, 'submit')
    snapshot = service.reviewMaintenance(request.id, 'verify', 'Туршилтын үр дүн хэвийн байна.')
    expect(snapshot.maintenance.find((item) => item.id === request.id)?.status).toBe('verified')
  })

  it('redacts restricted HR complaint content and only permits handoff', () => {
    const service = new BrowserManagerBusinessService()
    const restricted = service.getSnapshot().complaints.find((item) => item.restricted)
    expect(restricted?.summary).toContain('зөвхөн хүний нөөцийн эрхтэй')
    expect(() => service.updateComplaint(restricted!.id, 'resolve')).toThrow('эрх бүхий эзэнд')
    expect(service.updateComplaint(restricted!.id, 'handoff').complaints.find((item) => item.id === restricted!.id)?.status).toBe('handed-off')
  })

  it('records notice acknowledgement and PWA escalation evidence without external delivery', () => {
    const service = new BrowserManagerBusinessService()
    let snapshot = service.getSnapshot()
    const notice = snapshot.notices[0]
    const waitingMember = notice.audienceIds.find((item) => !notice.acknowledgedByIds.includes(item))!
    snapshot = service.acknowledgeNotice(notice.id, waitingMember)
    expect(snapshot.notices[0].acknowledgedByIds).toContain(waitingMember)
    const notification = snapshot.notifications[0]
    snapshot = service.recordNotificationEscalation(notification.id)
    expect(snapshot.notifications[0].escalationRecordedAt).toBeTruthy()
  })

  it('lets a manager submit recommendations but exposes no approve operation', () => {
    const service = new BrowserManagerBusinessService()
    let snapshot = service.createRecommendation({
      branchId: 'branch-central',
      type: 'entertainer-rank',
      subjectId: 'tm-anu',
      subjectName: 'Бат Ану',
      currentValue: '3-р зэрэглэл',
      proposedValue: '2-р зэрэглэл',
      evidenceSummary: '14 хоногийн ирц, захиалга, борлуулалтын тайлбарлагдах баримт.',
      reason: 'Эцсийн шийдвэрт баримтыг бүрэн хянуулах шаардлагатай.',
    })
    const recommendation = snapshot.recommendations[0]
    snapshot = service.submitRecommendation(recommendation.id)
    expect(snapshot.recommendations[0].status).toBe('submitted')
    expect('approveRecommendation' in service).toBe(false)
  })

  it('creates a CRM handoff request without a campaign-send capability', () => {
    const service = new BrowserManagerBusinessService()
    const snapshot = service.createCrmHandoff({ branchId: 'branch-central', title: 'Идэвхгүй Gold+', criteria: '45+ хоног зочлоогүй Gold түвшин', reason: 'Давтан захиалгын төлөвлөгөө хянуулах' })
    expect(snapshot.crmHandoffs[0].status).toBe('submitted')
    expect('sendCampaign' in service).toBe(false)
  })
})
