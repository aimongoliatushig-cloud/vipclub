export const workforceRoles = ['Entertainer', 'Server', 'Bartender', 'Reception', 'Security', 'Driver', 'Maintenance'] as const
export type WorkforceRole = (typeof workforceRoles)[number]

export const shiftTemplates = {
  Evening: { start: '18:00', end: '02:00' },
  Late: { start: '20:00', end: '04:00' },
  Day: { start: '12:00', end: '20:00' },
} as const

export type ShiftTemplateName = keyof typeof shiftTemplates
export type RosterStatus = 'draft' | 'published' | 'closed' | 'superseded'
export type AssignmentResponse = 'assigned' | 'acknowledged' | 'change-requested'
export type OperationalStatus = 'available' | 'reserved' | 'serving' | 'break' | 'late' | 'absent' | 'leave' | 'off-shift'
export type EntertainerRank = 'Rank1' | 'Rank2' | 'Rank3'

export interface TeamMember {
  id: string
  name: string
  initials: string
  branchId: string
  role: WorkforceRole
  active: boolean
  unavailableDates: string[]
  operationalStatus: OperationalStatus
  statusUpdatedAt: string
  rank?: EntertainerRank
}

export interface AvailabilityOverride {
  id: string
  teamMemberId: string
  date: string
  available: boolean
  reason: string
  actor: string
  at: string
}

export type AttendanceExceptionType = 'late' | 'no-show' | 'approved-absence' | 'mismatch' | 'correction'
export type AttendanceDecisionAction = 'excuse' | 'confirm' | 'approve' | 'reject'
export type AttendanceExceptionStatus = 'open' | 'approved' | 'excused' | 'confirmed' | 'rejected'

export interface AttendanceDecision {
  action: AttendanceDecisionAction
  actor: string
  reason: string
  at: string
}

export interface AttendanceException {
  id: string
  teamMemberId: string
  assignmentId: string
  date: string
  type: AttendanceExceptionType
  status: AttendanceExceptionStatus
  scheduledStart: string
  checkInAt?: string
  lateMinutes?: number
  requestNote?: string
  evidence: string
  decision?: AttendanceDecision
}

export type LeaveRequestType = 'day-off' | 'leave'
export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected'

export interface LeaveRequestDecision {
  action: 'approve' | 'reject'
  actor: string
  reason: string
  at: string
}

export interface LeaveRequest {
  id: string
  teamMemberId: string
  branchId: string
  type: LeaveRequestType
  startDate: string
  endDate: string
  reason: string
  status: LeaveRequestStatus
  submittedBy: string
  submittedAt: string
  decision?: LeaveRequestDecision
}

export interface LeaveRequestInput {
  teamMemberId: string
  type: LeaveRequestType
  startDate: string
  endDate: string
  reason: string
}

export type PenaltyReviewState = 'attendance-pending' | 'policy-pending' | 'excluded'

export interface PenaltyReview {
  id: string
  exceptionId: string
  teamMemberId: string
  date: string
  attendanceType: 'late' | 'no-show'
  scheduledStart: string
  checkInAt?: string
  lateMinutes?: number
  evidence: string
  attendanceStatus: AttendanceExceptionStatus
  state: PenaltyReviewState
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
  responseDueAt?: string
  respondedAt?: string
  responseNote?: string
  respondedBy?: string
  lastReminderAt?: string
  reminderCount?: number
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
    | 'assignment-acknowledged'
    | 'assignment-change-requested'
    | 'acknowledgement-reminder-recorded'
    | 'attendance-decision-recorded'
    | 'availability-overridden'
    | 'leave-request-submitted'
    | 'leave-request-decided'
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
  attendanceExceptions: AttendanceException[]
  leaveRequests: LeaveRequest[]
  availabilityOverrides: AvailabilityOverride[]
  executiveFollowUps: ExecutiveFollowUpRecord[]
  audit: RosterAuditEvent[]
}

export interface ExecutiveFollowUpSummary {
  publicationState: 'draft-overdue' | 'draft-on-time' | 'published-late' | 'published-on-time'
  publicationLabel: string
  coverageGapCount: number
  pendingAcknowledgementCount: number
  changeRequestCount: number
  leaveRequestCount: number
  accountableManager: string
  lastManagerAction: string
  lastManagerActionAt: string
  nextAction: string
  dueDate: string
  latestFollowUp?: ExecutiveFollowUpRecord
}

export interface ResponseQueueItem {
  assignment: ShiftAssignment
  teamMember: TeamMember
  overdue: boolean
}

export interface ReadinessRow extends CoverageRow {
  attendanceAvailable: boolean
  checkedIn: number
  approvedAbsence: number
  noShow: number
  late: number
  readinessGap: number
}

export interface ManagerDashboardSummary {
  onShift: number
  available: number
  reserved: number
  serving: number
  break: number
  late: number
  absent: number
  leave: number
  dataFreshAt: string
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
