export type ManagerTaskStatus = 'assigned' | 'acknowledged' | 'in-progress' | 'submitted' | 'rework' | 'completed'

export interface ManagerTaskComment {
  id: string
  author: string
  actorType: 'manager' | 'team-member'
  body: string
  at: string
}

export interface ManagerTaskEvidence {
  id: string
  fileName: string
  mimeType: string
  size: number
  addedBy: string
  addedAt: string
}

export interface ManagerTaskAuditEvent {
  id: string
  action: 'created' | 'notification-recorded' | 'acknowledged' | 'started' | 'commented' | 'submitted' | 'rework-requested' | 'approved'
  actor: string
  at: string
  note?: string
}

export interface ManagerTask {
  id: string
  branchId: string
  title: string
  description: string
  assigneeId: string
  createdBy: string
  createdAt: string
  dueDate: string
  status: ManagerTaskStatus
  result?: string
  submittedAt?: string
  completedAt?: string
  comments: ManagerTaskComment[]
  evidence: ManagerTaskEvidence[]
  audit: ManagerTaskAuditEvent[]
}

export interface CreateManagerTaskInput {
  branchId: string
  title: string
  description: string
  assigneeId: string
  dueDate: string
}

export interface TaskEvidenceInput {
  fileName: string
  mimeType: string
  size: number
}

export type SalesGoalProposalState = 'draft' | 'submitted' | 'revision-requested' | 'approved' | 'rejected'

export interface GoalActionItem {
  id: string
  title: string
  ownerId: string
  dueDate: string
  expectedImpact: string
}

export interface GoalProposalAuditEvent {
  id: string
  action: 'draft-created' | 'draft-saved' | 'submitted' | 'revision-requested' | 'approved' | 'rejected'
  actor: string
  at: string
  note?: string
  version: number
}

export interface HermesGoalRecommendation {
  version: number
  generatedAt: string
  baselineMonth: string
  baselineAmount: number
  improvementPercent: number
  recommendedTarget: number
  sourceSummary: string
  rationale: string
  focusAreas: string[]
  risks: string[]
  suggestedActions: string[]
}

export interface SalesGoalProposal {
  id: string
  branchId: string
  month: string
  state: SalesGoalProposalState
  version: number
  proposedTarget: number
  rationale: string
  actions: GoalActionItem[]
  recommendation: HermesGoalRecommendation
  managerName: string
  updatedAt: string
  submittedAt?: string
  ceoComment?: string
  audit: GoalProposalAuditEvent[]
}

export interface SaveGoalProposalInput {
  proposedTarget: number
  rationale: string
  actions: GoalActionItem[]
}

export interface ManagerOperationsSnapshot {
  branchId: string
  refreshedAt: string
  tasks: ManagerTask[]
  goalProposal: SalesGoalProposal
}
