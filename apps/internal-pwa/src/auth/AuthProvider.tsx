import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthContext, type AuthContextValue } from './authContextState'
import { demoCeoSession, type AuthSession } from './types'
import { createFixtureSessionAdapter, createServerSessionAdapter, validateAuthSession, type SessionAdapter } from './sessionAdapter'

export function AuthProvider({ children, initialSession = demoCeoSession, sessionAdapter }: { children: ReactNode; initialSession?: AuthSession; sessionAdapter?: SessionAdapter }) {
  const adapter = useMemo(
    () => sessionAdapter ?? (initialSession.source === 'server' ? createServerSessionAdapter(initialSession) : createFixtureSessionAdapter(initialSession)),
    [initialSession, sessionAdapter],
  )
  const [session, setSession] = useState<AuthSession>(() => validateAuthSession(adapter.initial()))
  const signIn = useCallback(async () => setSession(validateAuthSession(await adapter.signIn(session))), [adapter, session])
  const signOut = useCallback(async () => setSession(validateAuthSession(await adapter.signOut(session))), [adapter, session])
  const hasPermission = useCallback((permission: AuthSession['permissions'][number]) => session.permissions.includes(permission), [session.permissions])
  const value = useMemo<AuthContextValue>(() => ({ session, signIn, signOut, hasPermission }), [session, signIn, signOut, hasPermission])

  useEffect(() => {
    if (session.status !== 'authenticated') return
    const remaining = Date.parse(session.expiresAt) - Date.now()
    if (remaining <= 0) {
      setSession((current) => ({ ...current, status: 'expired' }))
      return
    }
    const timer = window.setTimeout(() => setSession((current) => ({ ...current, status: 'expired' })), Math.min(remaining, 2_147_483_647))
    return () => window.clearTimeout(timer)
  }, [session.expiresAt, session.status])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
