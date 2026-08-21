import { useMemo } from 'react'
import type { SessionAdapter } from '../auth/sessionAdapter'
import { demoCeoSession, type AuthSession } from '../auth/types'
import type { ManagementSession } from '../shared/managementAccess'
import executiveAccessStyles from '../styles/access.css?inline'
import executiveExceptionStyles from '../styles/exception-flow.css?inline'
import executiveIndexStyles from '../styles/index.css?inline'
import executiveReportStyles from '../styles/reports-flow.css?inline'
import ExecutiveApplication from './ExecutiveApplication'

const executiveStyles = [executiveIndexStyles, executiveAccessStyles, executiveExceptionStyles, executiveReportStyles].join('\n')

export interface ExecutiveEntryProps {
  session: ManagementSession
  onSignOut(): void
}

export default function ExecutiveEntry({ session, onSignOut }: ExecutiveEntryProps) {
  const executiveSession = useMemo<AuthSession>(() => ({
    ...demoCeoSession,
    userId: session.userId,
    displayName: session.displayName,
    initials: session.initials,
    branchIds: [...demoCeoSession.branchIds],
    permissions: [...demoCeoSession.permissions],
    source: session.source,
    expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
  }), [session])
  const sessionAdapter = useMemo<SessionAdapter>(() => ({
    kind: 'fixture',
    initial: () => structuredClone(executiveSession),
    signIn: async () => structuredClone(executiveSession),
    signOut: async (current) => {
      onSignOut()
      return { ...current, status: 'unauthenticated' }
    },
  }), [executiveSession, onSignOut])

  return <><style>{executiveStyles}</style><ExecutiveApplication initialSession={executiveSession} sessionAdapter={sessionAdapter} /></>
}
