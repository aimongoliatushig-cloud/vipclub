export type ExecutivePermission =
  | 'dashboard.read'
  | 'branches.read'
  | 'branch-settings.read'
  | 'branch-settings.write'
  | 'branch-settings.override'
  | 'sales.read'
  | 'customers.read'
  | 'workforce.read'
  | 'performance.read'
  | 'approvals.read'
  | 'finance.read'
  | 'tasks.read'
  | 'messages.read'
  | 'hermes.read'
  | 'reports.read'
  | 'notifications.read'

export type SessionStatus = 'authenticated' | 'unauthenticated' | 'expired'
export type ManagementRole = 'CEO' | 'Branch Manager'

export interface AuthSession {
  status: SessionStatus
  userId: string
  displayName: string
  initials: string
  role: ManagementRole
  branchIds: string[]
  permissions: ExecutivePermission[]
  source: 'demo' | 'server'
  expiresAt: string
}

export const executivePermissions: ExecutivePermission[] = [
  'dashboard.read',
  'branches.read',
  'branch-settings.read',
  'branch-settings.write',
  'branch-settings.override',
  'sales.read',
  'customers.read',
  'workforce.read',
  'performance.read',
  'approvals.read',
  'finance.read',
  'tasks.read',
  'messages.read',
  'hermes.read',
  'reports.read',
  'notifications.read',
]

export const demoCeoSession: AuthSession = {
  status: 'authenticated',
  userId: 'demo-ceo-battushig',
  displayName: 'Баттүшиг',
  initials: 'БТ',
  role: 'CEO',
  branchIds: ['queen', 'empire', 'platinum', 'gobi'],
  permissions: executivePermissions,
  source: 'demo',
  expiresAt: '2026-08-13T22:00:00+08:00',
}

export const demoBranchManagerSession: AuthSession = {
  status: 'authenticated',
  userId: 'demo-manager-queen',
  displayName: 'Г. Тэмүүлэн',
  initials: 'ГТ',
  role: 'Branch Manager',
  branchIds: ['queen'],
  permissions: ['branches.read', 'branch-settings.read', 'branch-settings.write'],
  source: 'demo',
  expiresAt: '2026-08-13T22:00:00+08:00',
}
