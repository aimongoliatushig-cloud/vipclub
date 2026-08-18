import { createContext } from 'react'
import type { AuthSession, ExecutivePermission } from './types'

export interface AuthContextValue {
  session: AuthSession
  signIn(): Promise<void>
  signOut(): Promise<void>
  hasPermission(permission: ExecutivePermission): boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)
