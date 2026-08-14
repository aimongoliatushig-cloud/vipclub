import type { ManagementSession } from '../shared/managementAccess'

const SESSION_KEY = 'vipclub.management-session.mn.v1'

export interface SessionStore {
  read(): ManagementSession | null
  write(session: ManagementSession): void
  clear(): void
}

export class BrowserSessionStore implements SessionStore {
  read(): ManagementSession | null {
    try {
      const raw = window.localStorage.getItem(SESSION_KEY)
      return raw ? JSON.parse(raw) as ManagementSession : null
    } catch {
      return null
    }
  }

  write(session: ManagementSession): void {
    try {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    } catch {
      // Session persistence is best-effort in the local prototype.
    }
  }

  clear(): void {
    try {
      window.localStorage.removeItem(SESSION_KEY)
    } catch {
      // Session persistence is best-effort in the local prototype.
    }
  }
}

export function resetManagementSessionPrototype(): void {
  try {
    window.localStorage.removeItem(SESSION_KEY)
  } catch {
    // Test/demo helper only.
  }
}
