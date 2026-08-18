import { describe, expect, it } from 'vitest'
import { demoCeoSession } from './types'
import {
  SessionContractError,
  createFixtureSessionAdapter,
  createServerSessionAdapter,
  validateAuthSession,
} from './sessionAdapter'

describe('BAT-128 session adapter boundary', () => {
  it('validates the deterministic fixture session', () => {
    expect(validateAuthSession(demoCeoSession)).toEqual(demoCeoSession)
    expect(createFixtureSessionAdapter().initial()).toEqual(demoCeoSession)
  })

  it('rejects missing, unknown and incompatible authorization fields', () => {
    const missing = structuredClone(demoCeoSession) as unknown as Record<string, unknown>
    delete missing.permissions
    expect(() => validateAuthSession(missing)).toThrow(/missing field permissions/)

    expect(() => validateAuthSession({ ...demoCeoSession, admin: true })).toThrow(/unknown field admin/)
    expect(() => validateAuthSession({ ...demoCeoSession, permissions: ['finance.admin'] })).toThrow(/unsupported value/)
  })

  it('uses server operations without changing the screen-facing session contract', async () => {
    const serverSession = { ...demoCeoSession, source: 'server' as const }
    const adapter = createServerSessionAdapter(serverSession, {
      reauthenticate: async () => ({ ...serverSession, status: 'authenticated' }),
      logout: async (current) => ({ ...current, status: 'unauthenticated' }),
    })

    expect(adapter.kind).toBe('server')
    expect(await adapter.signIn({ ...serverSession, status: 'expired' })).toEqual(serverSession)
    expect((await adapter.signOut(serverSession)).status).toBe('unauthenticated')
  })

  it('fails closed when a server operation returns a fixture or malformed payload', async () => {
    const serverSession = { ...demoCeoSession, source: 'server' as const }
    const adapter = createServerSessionAdapter(serverSession, {
      reauthenticate: async () => ({ ...demoCeoSession, source: 'demo' }),
    })

    await expect(adapter.signIn({ ...serverSession, status: 'expired' })).rejects.toBeInstanceOf(SessionContractError)
  })
})
