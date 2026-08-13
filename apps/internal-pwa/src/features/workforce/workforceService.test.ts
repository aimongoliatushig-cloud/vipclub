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
})
