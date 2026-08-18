import {
  demoCeoSession,
  executivePermissions,
  type AuthSession,
  type ExecutivePermission,
} from './types'

const sessionKeys = ['status', 'userId', 'displayName', 'initials', 'role', 'branchIds', 'permissions', 'source', 'expiresAt']
const statuses = ['authenticated', 'unauthenticated', 'expired']
const roles = ['CEO', 'Branch Manager']

export class SessionContractError extends Error {
  constructor(message: string) {
    super(`Session contract: ${message}`)
    this.name = 'SessionContractError'
  }
}

export function validateAuthSession(value: unknown): AuthSession {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new SessionContractError('expected an object payload.')
  const record = value as Record<string, unknown>
  const unknownKey = Object.keys(record).find((key) => !sessionKeys.includes(key))
  if (unknownKey) throw new SessionContractError(`unknown field ${unknownKey}.`)
  const missingKey = sessionKeys.find((key) => !(key in record))
  if (missingKey) throw new SessionContractError(`missing field ${missingKey}.`)

  for (const key of ['userId', 'displayName', 'initials', 'expiresAt'] as const) {
    if (typeof record[key] !== 'string') throw new SessionContractError(`${key} must be a string.`)
  }
  if (!statuses.includes(String(record.status))) throw new SessionContractError('status is incompatible.')
  if (!roles.includes(String(record.role))) throw new SessionContractError('role is incompatible.')
  if (record.source !== 'demo' && record.source !== 'server') throw new SessionContractError('source must be demo or server.')
  if (!Array.isArray(record.branchIds) || record.branchIds.some((item) => typeof item !== 'string')) {
    throw new SessionContractError('branchIds must be a string array.')
  }
  if (!Array.isArray(record.permissions) || record.permissions.some((item) => !executivePermissions.includes(item as ExecutivePermission))) {
    throw new SessionContractError('permissions contain an unsupported value.')
  }
  if (!Number.isFinite(Date.parse(record.expiresAt as string))) throw new SessionContractError('expiresAt must be an ISO-compatible date.')
  if (new Set(record.branchIds).size !== record.branchIds.length) throw new SessionContractError('branchIds must be unique.')
  if (new Set(record.permissions).size !== record.permissions.length) throw new SessionContractError('permissions must be unique.')
  return structuredClone(record) as unknown as AuthSession
}

export interface SessionAdapter {
  kind: 'fixture' | 'server'
  initial(): AuthSession
  signIn(current: AuthSession): Promise<AuthSession>
  signOut(current: AuthSession): Promise<AuthSession>
}

export function createFixtureSessionAdapter(initialSession: AuthSession = demoCeoSession): SessionAdapter {
  const validated = validateAuthSession(initialSession)
  return {
    kind: 'fixture',
    initial: () => structuredClone(validated),
    async signIn() {
      const authenticated = validated.role === 'CEO'
        ? { ...validated, status: 'authenticated', branchIds: demoCeoSession.branchIds, permissions: executivePermissions }
        : { ...validated, status: 'authenticated' }
      return validateAuthSession(authenticated)
    },
    async signOut(current) {
      return validateAuthSession({ ...current, status: 'unauthenticated' })
    },
  }
}

export interface ServerSessionOperations {
  reauthenticate?(current: AuthSession): Promise<unknown>
  logout?(current: AuthSession): Promise<unknown>
}

export function createServerSessionAdapter(
  serverSession: unknown,
  operations: ServerSessionOperations = {},
): SessionAdapter {
  const initialSession = validateAuthSession(serverSession)
  if (initialSession.source !== 'server') throw new SessionContractError('server adapter requires source=server.')

  return {
    kind: 'server',
    initial: () => structuredClone(initialSession),
    async signIn(current) {
      const payload = operations.reauthenticate
        ? await operations.reauthenticate(current)
        : { ...initialSession, status: 'authenticated' }
      const session = validateAuthSession(payload)
      if (session.source !== 'server') throw new SessionContractError('reauthentication must return a server session.')
      return session
    },
    async signOut(current) {
      const payload = operations.logout
        ? await operations.logout(current)
        : { ...current, status: 'unauthenticated' }
      const session = validateAuthSession(payload)
      if (session.source !== 'server') throw new SessionContractError('logout must return a server session.')
      return session
    },
  }
}
