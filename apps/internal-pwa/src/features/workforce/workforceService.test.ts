import { beforeEach, describe, expect, it } from 'vitest'
import { addDays, BrowserWorkforceService, resetWorkforcePrototype, startOfWeek } from './workforceService'

describe('Branch Manager weekly scheduling rules', () => {
  beforeEach(() => resetWorkforcePrototype())

  it('requires a reason when publishing below minimum coverage', () => {
    const service = new BrowserWorkforceService()
    const weekStart = startOfWeek(new Date('2026-08-13T12:00:00'))

    expect(() => service.publishRoster(weekStart)).toThrow(/reason/i)

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
    })).toThrow(/reason/i)

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
    })).toThrow(/already has a shift/i)
  })

  it('versions effective-dated staffing requirements with a reason', () => {
    const service = new BrowserWorkforceService()
    const weekStart = startOfWeek(new Date('2026-08-13T12:00:00'))
    const roster = service.getRoster(weekStart)
    const requirements = roster.requirements.map((item, index) => index === 0 ? { ...item, required: item.required + 1 } : item)

    expect(() => service.saveRequirements(weekStart, requirements, weekStart, '')).toThrow(/why/i)

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
    expect(summary.accountableManager).toBe('Ariun Manager')
    expect(summary.lastManagerAction).toMatch(/Created/)
  })

  it('records due-dated CEO follow-up tasks in the audit trail', () => {
    const service = new BrowserWorkforceService()
    const weekStart = startOfWeek(new Date('2026-08-13T12:00:00'))

    expect(() => service.recordExecutiveFollowUp(weekStart, 'task', 'Publish the roster.')).toThrow(/due date/i)

    const updated = service.recordExecutiveFollowUp(weekStart, 'task', 'Publish the roster.', '2026-08-14')
    expect(updated.executiveFollowUps.at(-1)).toMatchObject({ action: 'task', status: 'open', dueDate: '2026-08-14' })
    expect(updated.audit.at(-1)).toMatchObject({ actor: 'CEO Demo', action: 'follow-up-created' })
  })

  it('accepts assignment responses only after publication and only from the assigned member', () => {
    const service = new BrowserWorkforceService()
    const weekStart = startOfWeek(new Date('2026-08-13T12:00:00'))
    const draft = service.getRoster(weekStart)
    const assignment = draft.assignments[0]

    expect(() => service.respondToAssignment(weekStart, assignment.teamMemberId, assignment.id, 'acknowledged')).toThrow(/published/i)

    const published = service.publishRoster(weekStart, 'Two permitted gaps are being backfilled.')
    const publishedAssignment = published.assignments[0]
    expect(publishedAssignment.responseDueAt).toBeTruthy()
    expect(() => service.respondToAssignment(weekStart, 'tm-bolor', publishedAssignment.id, 'acknowledged')).toThrow(/own published assignment/i)

    const acknowledged = service.respondToAssignment(weekStart, publishedAssignment.teamMemberId, publishedAssignment.id, 'acknowledged')
    expect(acknowledged.version).toBe(1)
    expect(acknowledged.assignments[0]).toMatchObject({ response: 'acknowledged', respondedBy: 'Anu Bat' })
    expect(acknowledged.audit.at(-1)).toMatchObject({ actor: 'Anu Bat', action: 'assignment-acknowledged' })
  })

  it('requires a specific change reason and prioritizes the request in the manager queue', () => {
    const service = new BrowserWorkforceService()
    const weekStart = startOfWeek(new Date('2026-08-13T12:00:00'))
    const published = service.publishRoster(weekStart, 'Two permitted gaps are being backfilled.')
    const assignment = published.assignments[0]

    expect(() => service.respondToAssignment(weekStart, assignment.teamMemberId, assignment.id, 'change-requested', 'No')).toThrow(/at least 5/i)

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
    expect(reminded.audit.at(-1)?.reason).toMatch(/No message was sent/i)
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
    expect(() => service.getTeamMembers('branch-west')).toThrow(/access denied/i)
  })

  it('keeps attendance unavailable for drafts and records a reasoned decision without replacing evidence', () => {
    const service = new BrowserWorkforceService()
    const weekStart = startOfWeek(new Date('2026-08-13T12:00:00'))

    expect(service.getAttendanceExceptions(weekStart)).toEqual([])
    expect(service.getReadiness(weekStart).every((row) => !row.attendanceAvailable)).toBe(true)

    service.publishRoster(weekStart, 'Two permitted gaps are being backfilled.')
    const leaveRequest = service.getAttendanceExceptions(weekStart).find((item) => item.type === 'leave-request')
    expect(leaveRequest).toBeTruthy()
    expect(() => service.decideAttendanceException(weekStart, leaveRequest!.id, 'confirm', 'Manager checked the request.')).toThrow(/not valid/i)
    expect(() => service.decideAttendanceException(weekStart, leaveRequest!.id, 'approve', 'No')).toThrow(/at least 5/i)

    const decided = service.decideAttendanceException(weekStart, leaveRequest!.id, 'approve', 'Coverage owner confirmed the approved backfill.')
    const retained = decided.attendanceExceptions.find((item) => item.id === leaveRequest!.id)
    expect(retained).toMatchObject({ status: 'approved', evidence: leaveRequest!.evidence })
    expect(retained?.decision).toMatchObject({ action: 'approve', actor: 'Ariun Manager' })
    expect(decided.audit.at(-1)).toMatchObject({ action: 'attendance-decision-recorded' })
  })

  it('requires a reason for availability overrides and recalculates effective coverage', () => {
    const service = new BrowserWorkforceService()
    const weekStart = startOfWeek(new Date('2026-08-13T12:00:00'))
    const roster = service.getRoster(weekStart)
    const assignment = roster.assignments[0]
    const before = service.getReadiness(weekStart).find((row) => row.date === assignment.date && row.role === assignment.role)

    expect(() => service.overrideAvailability(weekStart, assignment.teamMemberId, assignment.date, false, 'No')).toThrow(/at least 5/i)

    const updated = service.overrideAvailability(weekStart, assignment.teamMemberId, assignment.date, false, 'Approved training conflict recorded by the manager.')
    const after = service.getReadiness(weekStart).find((row) => row.date === assignment.date && row.role === assignment.role)
    expect(after?.scheduled).toBe((before?.scheduled ?? 0) - 1)
    expect(updated.availabilityOverrides.at(-1)).toMatchObject({ available: false, actor: 'Ariun Manager' })
    expect(updated.audit.at(-1)).toMatchObject({ action: 'availability-overridden' })
  })
})
