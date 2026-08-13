import { describe, expect, it } from 'vitest'
import { BrowserManagerInsightsService } from './managerInsightsService'

describe('Manager customer and ranking insight boundaries', () => {
  it('returns only the authorized branch with masked customer contact data', () => {
    const snapshot = new BrowserManagerInsightsService().getSnapshot()

    expect(snapshot.branchId).toBe('branch-central')
    expect(snapshot.customers.every((customer) => customer.branchId === snapshot.branchId)).toBe(true)
    expect(snapshot.entertainerRankings.every((ranking) => ranking.branchId === snapshot.branchId)).toBe(true)
    expect(snapshot.customers.every((customer) => /^•••• \d{4}$/.test(customer.maskedPhone))).toBe(true)
  })

  it('denies another branch instead of returning unscoped CRM records', () => {
    expect(() => new BrowserManagerInsightsService().getSnapshot('branch-west')).toThrow('Энэ салбарын харилцагч болон зэрэглэлийн мэдээллийг харах эрхгүй байна.')
  })

  it('returns an independent read model so a screen cannot mutate shared evidence', () => {
    const service = new BrowserManagerInsightsService()
    const first = service.getSnapshot()
    first.customers[0].visits90d = 999

    expect(service.getSnapshot().customers[0].visits90d).toBe(14)
  })
})
