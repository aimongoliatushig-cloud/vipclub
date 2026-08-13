export const workforceRoles = ['Entertainer', 'Server', 'Bartender', 'Reception', 'Security'] as const
export type WorkforceRole = (typeof workforceRoles)[number]

export const shiftTemplates = {
  Evening: { start: '18:00', end: '02:00' },
  Late: { start: '20:00', end: '04:00' },
  Day: { start: '12:00', end: '20:00' },
} as const

export type ShiftTemplateName = keyof typeof shiftTemplates
export type RosterStatus = 'draft' | 'published' | 'closed' | 'superseded'
export type AssignmentResponse = 'assigned' | 'acknowledged' | 'change-requested'

export interface TeamMember {
  id: string
  name: string
  initials: string
  role: WorkforceRole
  active: boolean
  unavailableDates: string[]
}

export interface ShiftAssignment {
  id: string
  teamMemberId: string
  date: string
  role: WorkforceRole
  shift: ShiftTemplateName
  start: string
  end: string
  response: AssignmentResponse
}

export interface StaffingRequirement {
  date: string
  role: WorkforceRole
  required: number
}

export interface RosterAuditEvent {
  id: string
  at: string
  actor: string
  action: 'created' | 'assignment-added' | 'assignment-changed' | 'assignment-removed' | 'published' | 'copied'
  reason?: string
  assignmentId?: string
  version: number
}

export interface WeeklyRoster {
  id: string
  branchId: string
  branchName: string
  managerName: string
  weekStart: string
  status: RosterStatus
  version: number
  publicationDue: string
  publishedAt?: string
  lastSavedAt: string
  assignments: ShiftAssignment[]
  requirements: StaffingRequirement[]
  audit: RosterAuditEvent[]
}

export interface AssignmentInput {
  id?: string
  teamMemberId: string
  date: string
  shift: ShiftTemplateName
  reason?: string
}

export interface CoverageRow {
  date: string
  role: WorkforceRole
  required: number
  scheduled: number
  gap: number
}

export interface ValidationIssue {
  severity: 'error' | 'warning'
  code: 'inactive' | 'wrong-branch' | 'role' | 'leave' | 'overlap' | 'coverage'
  message: string
  date?: string
  role?: WorkforceRole
}
