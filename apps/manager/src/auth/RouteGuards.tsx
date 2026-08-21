import type { ReactNode } from 'react'
import { Navigate, useLocation, useParams } from 'react-router-dom'
import AccessStatePage from '../pages/AccessStatePage'
import type { ExecutivePermission } from './types'
import { useAuth } from './useAuth'

export function RequireSession({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const location = useLocation()

  if (session.status === 'unauthenticated') return <Navigate to="/login" state={{ returnTo: location.pathname + location.search }} replace />
  if (session.status === 'expired') return <Navigate to="/session-expired" state={{ returnTo: location.pathname + location.search }} replace />
  return children
}

export function RequirePermission({ permission, children }: { permission: ExecutivePermission; children: ReactNode }) {
  const { hasPermission } = useAuth()
  if (!hasPermission(permission)) return <AccessStatePage variant="denied" embedded />
  return children
}

export function RequireBranchScope({ children }: { children: ReactNode }) {
  const { branchId } = useParams()
  const { session } = useAuth()

  if (branchId && !session.branchIds.includes(branchId)) {
    return <AccessStatePage variant="denied" embedded detail="Таны session зөвхөн оноосон салбарын мэдээллийг харах эрхтэй. URL өөрөө нэмэлт эрх олгохгүй." />
  }

  return children
}
