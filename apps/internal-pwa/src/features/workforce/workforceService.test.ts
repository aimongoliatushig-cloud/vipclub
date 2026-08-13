import { beforeEach, describe, expect, it } from 'vitest'
import { BrowserWorkforceService, resetWorkforcePrototype, startOfWeek } from './workforceService'

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
})
