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
  action:
    | 'created'
    | 'assignment-added'
    | 'assignment-changed'
    | 'assignment-removed'
    | 'published'
    | 'copied'
    | 'requirements-updated'
    | 'manager-messaged'
    | 'follow-up-created'
  reason?: string
  assignmentId?: string
  version: number
  requirementVersion?: number
}

export interface ExecutiveFollowUpRecord {
  id: string
  createdAt: string
  createdBy: string
  action: 'message' | 'task'
  note: string
  dueDate?: string
  status: 'recorded' | 'open'
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
  requirementVersion: number
  requirementsEffectiveFrom: string
  executiveFollowUps: ExecutiveFollowUpRecord[]
  audit: RosterAuditEvent[]
}

export interface ExecutiveFollowUpSummary {
  publicationState: 'draft-overdue' | 'draft-on-time' | 'published-late' | 'published-on-time'
  publicationLabel: string
  coverageGapCount: number
  pendingAcknowledgementCount: number
  changeRequestCount: number
  accountableManager: string
  lastManagerAction: string
  lastManagerActionAt: string
  nextAction: string
  dueDate: string
  latestFollowUp?: ExecutiveFollowUpRecord
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
