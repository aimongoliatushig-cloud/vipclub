import { beforeEach, describe, expect, it } from 'vitest'
import { addDays, BrowserWorkforceService, getCoverage, resetWorkforcePrototype, startOfWeek } from './workforceService'

describe('Branch Manager weekly scheduling rules', () => {
  beforeEach(() => resetWorkforcePrototype())

  it('requires a reason when publishing below minimum coverage', () => {
    const service = new BrowserWorkforceService()
    const weekStart = startOfWeek(new Date('2026-08-13T12:00:00'))

    expect(() => service.publishRoster(weekStart)).toThrow(/шалтгаан/i)

    const published = service.publishRoster(weekStart, 'Security backfill is awaiting confirmation.')
    expect(published.status).toBe('published')
    expect(published.audit.at(-1)).toMatchObject({
      action: 'published',
      reason: 'Security backfill is awaiting confirmation.',
    })
  })

  it('versions published changes and requires an audit reason', () => {
    const service = new BrowserWorkforceService()
    const weekStart = startOfWeek(new Date('2026-08-13T12:00:00'))
    const published = service.publishRoster(weekStart, 'Two permitted gaps are being backfilled.')
    const original = published.assignments[0]

    expect(() => service.upsertAssignment(weekStart, {
      id: original.id,
      teamMemberId: original.teamMemberId,
      date: original.date,
      shift: 'Evening',
    })).toThrow(/шалтгаан/i)

    const revised = service.upsertAssignment(weekStart, {
      id: original.id,
      teamMemberId: original.teamMemberId,
      date: original.date,
      shift: 'Evening',
      reason: 'Operating time changed after reservation forecast.',
    })

    expect(revised.status).toBe('published')
    expect(revised.version).toBe(2)
    expect(revised.assignments.find((item) => item.id === original.id)?.response).toBe('assigned')
    expect(revised.audit.at(-1)?.reason).toMatch(/Operating time changed/)
  })

  it('prevents more than one assignment per person and day', () => {
    const service = new BrowserWorkforceService()
    const weekStart = startOfWeek(new Date('2026-08-13T12:00:00'))
    const roster = service.getRoster(weekStart)
    const original = roster.assignments[0]

    expect(() => service.upsertAssignment(weekStart, {
      teamMemberId: original.teamMemberId,
      date: original.date,
      shift: 'Day',
    })).toThrow(/аль хэдийн ээлжтэй/i)
  })

  it('versions effective-dated staffing requirements with a reason', () => {
    const service = new BrowserWorkforceService()
    const weekStart = startOfWeek(new Date('2026-08-13T12:00:00'))
    const roster = service.getRoster(weekStart)
    const requirements = roster.requirements.map((item, index) => index === 0 ? { ...item, required: item.required + 1 } : item)

    expect(() => service.saveRequirements(weekStart, requirements, weekStart, '')).toThrow(/яагаад/i)

    const updated = service.saveRequirements(weekStart, requirements, weekStart, 'Reservation forecast increased.')
    expect(updated.requirementVersion).toBe(2)
    expect(updated.requirements[0].required).toBe(roster.requirements[0].required + 1)
    expect(updated.audit.at(-1)).toMatchObject({
      action: 'requirements-updated',
      reason: 'Reservation forecast increased.',
      requirementVersion: 2,
    })
  })

  it('carries the previous staffing template into a copied week', () => {
    const service = new BrowserWorkforceService()
    const weekStart = startOfWeek(new Date('2026-08-13T12:00:00'))
    const previousWeek = addDays(weekStart, -7)
    const previous = service.getRoster(previousWeek)
    const requirements = previous.requirements.map((item, index) => index === 0 ? { ...item, required: 4 } : item)
    service.saveRequirements(previousWeek, requirements, previousWeek, 'Recurring Monday event.')

    const copied = service.copyPreviousWeek(weekStart)
    expect(copied.requirements[0]).toMatchObject({ date: weekStart, required: 4 })
    expect(copied.requirementsEffectiveFrom).toBe(weekStart)
  })

  it('summarizes objective CEO follow-up evidence without inferring effort', () => {
    const service = new BrowserWorkforceService()
    const weekStart = startOfWeek(new Date('2026-08-13T12:00:00'))

    const summary = service.getExecutiveFollowUp(weekStart, new Date('2026-08-13T12:00:00+08:00'))

    expect(summary.publicationState).toBe('draft-overdue')
    expect(summary.coverageGapCount).toBe(2)
    expect(summary.accountableManager).toBe('Ариун менежер')
    expect(summary.lastManagerAction).toMatch(/үүсгэсэн/)
  })

  it('records due-dated CEO follow-up tasks in the audit trail', () => {
    const service = new BrowserWorkforceService()
    const weekStart = startOfWeek(new Date('2026-08-13T12:00:00'))

    expect(() => service.recordExecutiveFollowUp(weekStart, 'task', 'Хуваарийг нийтэлнэ үү.')).toThrow(/дуусах огноо/i)

    const updated = service.recordExecutiveFollowUp(weekStart, 'task', 'Хуваарийг нийтэлнэ үү.', '2026-08-14')
    expect(updated.executiveFollowUps.at(-1)).toMatchObject({ action: 'task', status: 'open', dueDate: '2026-08-14' })
    expect(updated.audit.at(-1)).toMatchObject({ actor: 'Гүйцэтгэх захирлын демо', action: 'follow-up-created' })
  })

  it('accepts assignment responses only after publication and only from the assigned member', () => {
    const service = new BrowserWorkforceService()
    const weekStart = startOfWeek(new Date('2026-08-13T12:00:00'))
    const draft = service.getRoster(weekStart)
    const assignment = draft.assignments[0]

    expect(() => service.respondToAssignment(weekStart, assignment.teamMemberId, assignment.id, 'acknowledged')).toThrow(/нийтэлсэн/i)

    const published = service.publishRoster(weekStart, 'Two permitted gaps are being backfilled.')
    const publishedAssignment = published.assignments[0]
    expect(publishedAssignment.responseDueAt).toBeTruthy()
    expect(() => service.respondToAssignment(weekStart, 'tm-bolor', publishedAssignment.id, 'acknowledged')).toThrow(/зөвхөн өөрийн нийтэлсэн ээлж/i)

    const acknowledged = service.respondToAssignment(weekStart, publishedAssignment.teamMemberId, publishedAssignment.id, 'acknowledged')
    expect(acknowledged.version).toBe(1)
    expect(acknowledged.assignments[0]).toMatchObject({ response: 'acknowledged', respondedBy: 'Бат Ану' })
    expect(acknowledged.audit.at(-1)).toMatchObject({ actor: 'Бат Ану', action: 'assignment-acknowledged' })
  })

  it('requires a specific change reason and prioritizes the request in the manager queue', () => {
    const service = new BrowserWorkforceService()
    const weekStart = startOfWeek(new Date('2026-08-13T12:00:00'))
    const published = service.publishRoster(weekStart, 'Two permitted gaps are being backfilled.')
    const assignment = published.assignments[0]

    expect(() => service.respondToAssignment(weekStart, assignment.teamMemberId, assignment.id, 'change-requested', 'Үгүй')).toThrow(/дор хаяж 5/i)

    service.respondToAssignment(weekStart, assignment.teamMemberId, assignment.id, 'change-requested', 'Class ends after this shift starts.')
    const queue = service.getResponseQueue(weekStart)
    expect(queue[0].assignment).toMatchObject({
      id: assignment.id,
      response: 'change-requested',
      responseNote: 'Class ends after this shift starts.',
    })
  })

  it('records reminder evidence without claiming notification delivery', () => {
    const service = new BrowserWorkforceService()
    const weekStart = startOfWeek(new Date('2026-08-13T12:00:00'))
    const published = service.publishRoster(weekStart, 'Two permitted gaps are being backfilled.')
    const assignment = published.assignments[0]

    const reminded = service.recordResponseReminder(weekStart, assignment.id)
    expect(reminded.assignments[0]).toMatchObject({ reminderCount: 1 })
    expect(reminded.audit.at(-1)).toMatchObject({ action: 'acknowledgement-reminder-recorded' })
    expect(reminded.audit.at(-1)?.reason).toMatch(/мэдэгдэл илгээгээгүй/i)
  })

  it('escalates only acknowledgements past the configured reminder threshold', () => {
    const service = new BrowserWorkforceService()
    const weekStart = startOfWeek(new Date('2026-08-13T12:00:00'))
    const published = service.publishRoster(weekStart, 'Two permitted gaps are being backfilled.')
    const responseDueAt = published.assignments[0].responseDueAt as string

    const beforeThreshold = service.getExecutiveFollowUp(weekStart, new Date(new Date(responseDueAt).getTime() - 1))
    const afterThreshold = service.getExecutiveFollowUp(weekStart, new Date(new Date(responseDueAt).getTime() + 1))

    expect(beforeThreshold.pendingAcknowledgementCount).toBe(0)
    expect(afterThreshold.pendingAcknowledgementCount).toBe(published.assignments.length)
  })

  it('returns the complete branch dashboard status counts and denies another branch', () => {
    const service = new BrowserWorkforceService()
    const weekStart = startOfWeek(new Date('2026-08-13T12:00:00'))

    expect(service.getManagerDashboard(weekStart)).toMatchObject({
      onShift: 6,
      available: 2,
      reserved: 1,
      serving: 3,
      break: 1,
      late: 1,
      absent: 1,
      leave: 1,
    })
    expect(() => service.getTeamMembers('branch-west')).toThrow(/хандах эрхгүй/i)
  })

  it('keeps attendance unavailable for drafts and records a reasoned attendance decision without replacing evidence', () => {
    const service = new BrowserWorkforceService()
    const weekStart = startOfWeek(new Date('2026-08-13T12:00:00'))

    expect(service.getAttendanceExceptions(weekStart)).toEqual([])
    expect(service.getReadiness(weekStart).every((row) => !row.attendanceAvailable)).toBe(true)

    service.publishRoster(weekStart, 'Two permitted gaps are being backfilled.')
    const late = service.getAttendanceExceptions(weekStart).find((item) => item.type === 'late')
    expect(late).toBeTruthy()
    expect(() => service.decideAttendanceException(weekStart, late!.id, 'approve', 'Менежер хүсэлтийг шалгасан.')).toThrow(/тохирохгүй/i)
    expect(() => service.decideAttendanceException(weekStart, late!.id, 'confirm', 'Үгүй')).toThrow(/дор хаяж 5/i)

    const decided = service.decideAttendanceException(weekStart, late!.id, 'confirm', 'Verified entrance-device timestamp confirmed the lateness.')
    const retained = decided.attendanceExceptions.find((item) => item.id === late!.id)
    expect(retained).toMatchObject({ status: 'confirmed', evidence: late!.evidence })
    expect(retained?.decision).toMatchObject({ action: 'confirm', actor: 'Ариун менежер' })
    expect(decided.audit.at(-1)).toMatchObject({ action: 'attendance-decision-recorded' })
  })

  it('submits an own-branch leave request and applies coverage only after a reasoned manager approval', () => {
    const service = new BrowserWorkforceService()
    const weekStart = startOfWeek(new Date('2026-08-13T12:00:00'))
    const roster = service.getRoster(weekStart)
    const assignment = roster.assignments.find((item) => item.teamMemberId === 'tm-anu')!
    const before = getCoverage(roster).find((row) => row.date === assignment.date && row.role === assignment.role)!

    expect(() => service.submitLeaveRequest(weekStart, {
      teamMemberId: assignment.teamMemberId,
      type: 'day-off',
      startDate: assignment.date,
      endDate: assignment.date,
      reason: 'Үгүй',
    })).toThrow(/дор хаяж 5/i)

    const submitted = service.submitLeaveRequest(weekStart, {
      teamMemberId: assignment.teamMemberId,
      type: 'day-off',
      startDate: assignment.date,
      endDate: assignment.date,
      reason: 'Гэр бүлийн урьдчилан төлөвлөсөн ажилтай.',
    })
    const request = submitted.leaveRequests.find((item) => item.teamMemberId === assignment.teamMemberId)!
    expect(request).toMatchObject({ status: 'pending', submittedBy: 'Бат Ану' })
    expect(getCoverage(submitted).find((row) => row.date === assignment.date && row.role === assignment.role)?.scheduled).toBe(before.scheduled)
    expect(() => service.decideLeaveRequest(weekStart, request.id, 'approve', 'Үгүй')).toThrow(/дор хаяж 5/i)

    const approved = service.decideLeaveRequest(weekStart, request.id, 'approve', 'Орлох хүнийг хайх хангалтын ажил нээлттэй үлдэнэ.')
    const retained = approved.leaveRequests.find((item) => item.id === request.id)
    expect(retained).toMatchObject({ status: 'approved', reason: request.reason })
    expect(retained?.decision).toMatchObject({ action: 'approve', actor: 'Ариун менежер' })
    expect(approved.assignments.some((item) => item.id === assignment.id)).toBe(true)
    expect(getCoverage(approved).find((row) => row.date === assignment.date && row.role === assignment.role)?.scheduled).toBe(before.scheduled - 1)
    expect(approved.audit.at(-1)).toMatchObject({ action: 'leave-request-decided' })
  })

  it('shows every lateness and no-show candidate without calculating a penalty amount', () => {
    const service = new BrowserWorkforceService()
    const weekStart = startOfWeek(new Date('2026-08-13T12:00:00'))
    service.publishRoster(weekStart, 'Two permitted gaps are being backfilled.')

    const initial = service.getPenaltyReviews(weekStart)
    expect(initial).toHaveLength(2)
    expect(initial.every((item) => item.state === 'attendance-pending')).toBe(true)

    const late = initial.find((item) => item.attendanceType === 'late')!
    service.decideAttendanceException(weekStart, late.exceptionId, 'confirm', 'Verified source evidence confirms the late arrival.')
    expect(service.getPenaltyReviews(weekStart).find((item) => item.id === late.id)?.state).toBe('policy-pending')

    const noShow = initial.find((item) => item.attendanceType === 'no-show')!
    service.decideAttendanceException(weekStart, noShow.exceptionId, 'excuse', 'Approved operational exception excludes this incident.')
    expect(service.getPenaltyReviews(weekStart).find((item) => item.id === noShow.id)?.state).toBe('excluded')
  })

  it('requires a reason for availability overrides and recalculates effective coverage', () => {
    const service = new BrowserWorkforceService()
    const weekStart = startOfWeek(new Date('2026-08-13T12:00:00'))
    const roster = service.getRoster(weekStart)
    const assignment = roster.assignments[0]
    const before = service.getReadiness(weekStart).find((row) => row.date === assignment.date && row.role === assignment.role)

    expect(() => service.overrideAvailability(weekStart, assignment.teamMemberId, assignment.date, false, 'Үгүй')).toThrow(/дор хаяж 5/i)

    const updated = service.overrideAvailability(weekStart, assignment.teamMemberId, assignment.date, false, 'Approved training conflict recorded by the manager.')
    const after = service.getReadiness(weekStart).find((row) => row.date === assignment.date && row.role === assignment.role)
    expect(after?.scheduled).toBe((before?.scheduled ?? 0) - 1)
    expect(updated.availabilityOverrides.at(-1)).toMatchObject({ available: false, actor: 'Ариун менежер' })
    expect(updated.audit.at(-1)).toMatchObject({ action: 'availability-overridden' })
  })
})
