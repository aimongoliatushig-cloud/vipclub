export type ManagementRole = 'ceo' | 'hr-manager' | 'branch-manager'

export type ManagementPermission =
  | 'company.dashboard.read'
  | 'company.approvals.read'
  | 'company.approvals.write'
  | 'company.branches.read'
  | 'company.crm.read'
  | 'company.workforce.write'
  | 'branch.dashboard.read'
  | 'branch.workforce.write'
  | 'branch.crm.read'
  | 'branch.recommendations.write'

export interface ManagementSession {
  userId: string
  displayName: string
  initials: string
  role: ManagementRole
  branchIds: string[]
  permissions: ManagementPermission[]
  source: 'demo' | 'server'
}

export const roleLabels: Record<ManagementRole, string> = {
  ceo: 'Гүйцэтгэх захирал',
  'hr-manager': 'Хүний нөөцийн менежер',
  'branch-manager': 'Салбарын менежер',
}

export const demoCeoSession: ManagementSession = {
  userId: 'demo-ceo-battushig',
  displayName: 'Баттүшиг захирал',
  initials: 'БЗ',
  role: 'ceo',
  branchIds: ['branch-central', 'branch-east', 'branch-west', 'branch-gobi'],
  permissions: [
    'company.dashboard.read',
    'company.approvals.read',
    'company.approvals.write',
    'company.branches.read',
    'company.crm.read',
  ],
  source: 'demo',
}

export const demoManagerSession: ManagementSession = {
  userId: 'demo-manager-central',
  displayName: 'Ариун менежер',
  initials: 'АМ',
  role: 'branch-manager',
  branchIds: ['branch-central'],
  permissions: [
    'branch.dashboard.read',
    'branch.workforce.write',
    'branch.crm.read',
    'branch.recommendations.write',
  ],
  source: 'demo',
}

export function hasPermission(session: ManagementSession, permission: ManagementPermission): boolean {
  return session.permissions.includes(permission)
}

export function requirePermission(session: ManagementSession, permission: ManagementPermission): void {
  if (!hasPermission(session, permission)) {
    throw new Error('Энэ үйлдлийг хийх эрх таны үүрэгт олгогдоогүй байна.')
  }
}

export function canAccessBranch(session: ManagementSession, branchId: string): boolean {
  return session.role === 'ceo' || session.role === 'hr-manager' || session.branchIds.includes(branchId)
}
