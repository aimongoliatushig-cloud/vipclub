import { describe, expect, it } from 'vitest'
import { cloneSnapshot } from './fixtures'
import { createExecutiveNotifications } from './notifications'

describe('executive notification projection', () => {
  it('deduplicates delivery and covers every governed CEO destination', () => {
    const snapshot = cloneSnapshot()
    const notifications = createExecutiveNotifications(snapshot)
    const ids = notifications.map((item) => item.id)

    expect(new Set(ids).size).toBe(ids.length)
    expect(notifications.find((item) => item.kind === 'approval')?.target).toMatch(/^\/approvals/)
    expect(notifications.find((item) => item.kind === 'goal-plan')?.target).toBe('/sales/action-plans?branch=queen')
    expect(notifications.find((item) => item.kind === 'settlement')?.target).toBe('/finance/batch-2026-08-11')
    expect(notifications.find((item) => item.kind === 'task')?.target).toMatch(/^\/tasks/)
    expect(notifications.find((item) => item.kind === 'message')?.target).toMatch(/^\/messages/)
    expect(notifications.find((item) => item.kind === 'escalation')?.target).toMatch(/^\/branches\/queen/)
    expect(notifications.find((item) => item.kind === 'hermes')?.target).toMatch(/^\/hermes/)
  })

  it('keeps sensitive message content out of the notification projection', () => {
    const snapshot = cloneSnapshot()
    const thread = snapshot.threads.find((item) => item.kind === 'sensitive')
    const notification = createExecutiveNotifications(snapshot).find((item) => item.kind === 'message')

    expect(notification?.sensitive).toBe(true)
    for (const message of thread?.messages ?? []) expect(notification?.description).not.toContain(message.body)
  })
})
