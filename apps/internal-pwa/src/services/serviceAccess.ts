import type { ManagementRole } from '../auth/types'
import type { AppSnapshot } from '../domain/types'

export interface ServiceAccessContext {
  actor: string
  role: ManagementRole
  branchIds: string[]
  companyWide: boolean
}

export const demoCeoAccess: ServiceAccessContext = {
  actor: 'Баттүшиг',
  role: 'CEO',
  branchIds: ['queen', 'empire', 'platinum', 'gobi'],
  companyWide: true,
}

export const canAccessBranch = (access: ServiceAccessContext, branchId: string) =>
  access.branchIds.includes(branchId)

export const canAccessScopedRecord = (access: ServiceAccessContext, branchId?: string) =>
  branchId ? canAccessBranch(access, branchId) : access.companyWide

export const assertBranchAccess = (access: ServiceAccessContext, branchId?: string) => {
  if (!canAccessScopedRecord(access, branchId)) {
    throw new Error('Энэ салбарын мэдээлэлд хандах эрхгүй.')
  }
}

export const scopeSnapshot = (snapshot: AppSnapshot, access: ServiceAccessContext): AppSnapshot => ({
  branches: snapshot.branches.filter((item) => canAccessBranch(access, item.id)),
  branchSettings: snapshot.branchSettings.filter((item) => canAccessBranch(access, item.branchId)),
  customers: snapshot.customers.filter((item) => canAccessBranch(access, item.branchId)),
  approvals: snapshot.approvals.filter((item) => canAccessBranch(access, item.branchId)),
  tasks: snapshot.tasks.filter((item) => canAccessScopedRecord(access, item.branchId)),
  threads: snapshot.threads.filter((item) => canAccessScopedRecord(access, item.branchId)),
  hermesDaily: {
    ...snapshot.hermesDaily,
    items: snapshot.hermesDaily.items.filter((item) => canAccessScopedRecord(access, item.branchId)),
    summary: access.companyWide ? snapshot.hermesDaily.summary : 'Authorized branch scope advisory briefing.',
  },
  hermesMonthly: {
    ...snapshot.hermesMonthly,
    branches: snapshot.hermesMonthly.branches.filter((item) => canAccessBranch(access, item.branchId)),
    summary: access.companyWide ? snapshot.hermesMonthly.summary : 'Authorized branch scope advisory monthly review.',
  },
  recommendations: snapshot.recommendations.filter((item) => canAccessScopedRecord(access, item.branchId)),
  settlements: access.companyWide ? snapshot.settlements : [],
  workforce: snapshot.workforce.filter((item) => canAccessBranch(access, item.branchId)),
  managers: snapshot.managers.filter((item) => canAccessBranch(access, item.branchId)),
  employees: access.role === 'CEO' ? snapshot.employees.filter((item) => canAccessBranch(access, item.branchId)) : [],
  auditEvents: snapshot.auditEvents.filter((item) => canAccessScopedRecord(access, item.branchId)),
})
