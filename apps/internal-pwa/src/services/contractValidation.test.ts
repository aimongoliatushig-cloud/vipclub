import { describe, expect, it } from 'vitest'
import { cloneSnapshot } from '../data/fixtures'
import { executiveScenarios, validateExecutiveScenarios } from '../data/scenarios'
import type { Branch } from '../domain/types'
import { createMockServices } from './mockServices'
import { screenContracts, validateScreenContracts } from './screenContracts'
import {
  ContractValidationError,
  validateAppSnapshot,
  validateFixtureReconciliation,
  withContractValidation,
} from './contractValidation'

describe('BAT-127 screen-facing contract boundary', () => {
  it('documents every screen contract from R2 through R44', () => {
    expect(() => validateScreenContracts()).not.toThrow()
    expect(screenContracts).toHaveLength(43)
    expect(screenContracts.map((item) => item.id)).toEqual(
      Array.from({ length: 43 }, (_, index) => `R${index + 2}`),
    )
  })

  it('accepts the complete deterministic executive snapshot', () => {
    const snapshot = cloneSnapshot()
    expect(validateAppSnapshot(snapshot)).toEqual(snapshot)
    expect(() => validateFixtureReconciliation(snapshot)).not.toThrow()
  })

  it('rejects missing, unknown and incompatible payload fields', () => {
    const missing = structuredClone(cloneSnapshot()) as unknown as Record<string, unknown>
    delete missing.branches
    expect(() => validateAppSnapshot(missing)).toThrow(/missing field/)

    const unknown = structuredClone(cloneSnapshot()) as unknown as { branches: Array<Record<string, unknown>> }
    unknown.branches[0].unexpected = true
    expect(() => validateAppSnapshot(unknown)).toThrow(/unknown field/)

    const incompatible = structuredClone(cloneSnapshot()) as unknown as { branches: Array<Record<string, unknown>> }
    incompatible.branches[0].health = 'critical'
    expect(() => validateAppSnapshot(incompatible)).toThrow(/expected number/)
  })

  it('provides all required deterministic UI state scenarios', () => {
    expect(() => validateExecutiveScenarios()).not.toThrow()
    expect(Object.keys(executiveScenarios)).toEqual([
      'healthy',
      'warning',
      'critical',
      'empty',
      'stale',
      'partial',
      'denied',
      'integration-failure',
    ])
    expect(executiveScenarios.stale.snapshot.branches[0].meta.updatedAt).toBe('2026-08-10T08:20:00+08:00')
    expect(executiveScenarios.partial.snapshot.branches.some((item) => !item.meta.reconciled)).toBe(true)
  })

  it('reconciles every settlement list total with its drill-down', () => {
    for (const batch of cloneSnapshot().settlements) {
      expect(batch.entertainers).toHaveLength(batch.entertainerCount)
      expect(batch.entertainers.reduce((sum, item) => sum + item.exceptions, 0)).toBe(batch.exceptionCount)
      expect(Math.round(batch.entertainers.reduce((sum, item) => sum + item.net, 0) * 100)).toBe(
        Math.round(batch.lines.reduce((sum, item) => sum + item.amount, 0) * 100),
      )
    }
  })

  it('keeps fixture and live adapters on the same screen-facing contract', async () => {
    const fixtureAdapter = createMockServices()
    const liveAdapter = withContractValidation(createMockServices(), 'live')
    const [fixtureBranches, liveBranches] = await Promise.all([
      fixtureAdapter.branches.list(),
      liveAdapter.branches.list(),
    ])

    expect(liveBranches).toEqual(fixtureBranches)
    expect(Object.keys(liveAdapter).sort()).toEqual(Object.keys(fixtureAdapter).sort())
  })

  it('rejects an incompatible live adapter response before it reaches a screen', async () => {
    const base = createMockServices()
    const incompatibleLive = {
      ...base,
      branches: {
        ...base.branches,
        async list() {
          const rows = await base.branches.list()
          return rows.map((branch, index) => index === 0 ? { ...branch, unexpected: true } : branch) as Branch[]
        },
      },
    }

    await expect(withContractValidation(incompatibleLive, 'live').branches.list()).rejects.toBeInstanceOf(ContractValidationError)
  })
})
