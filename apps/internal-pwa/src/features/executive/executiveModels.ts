import type { ManagerBusinessSnapshot, ManagerRecommendation } from '../workforce/managerBusinessModels'
import type { ManagerInsightsSnapshot } from '../workforce/managerInsightsModels'
import type { ManagerOperationsSnapshot, SalesGoalProposal } from '../workforce/managerOperationsModels'
import type { ExecutiveFollowUpSummary, LeaveRequest, PenaltyReview, WeeklyRoster } from '../workforce/models'

export interface ExecutiveBranchSummary {
  id: string
  name: string
  managerName: string
  targetAmount: number
  actualSales: number
  workforceRisk: 'healthy' | 'attention' | 'critical'
  openApprovals: number
}

export interface ExecutiveWorkforceSnapshot {
  roster: WeeklyRoster
  followUp: ExecutiveFollowUpSummary
  openCoverageGaps: number
  leaveRequests: LeaveRequest[]
  penaltyReviews: PenaltyReview[]
}

export interface ExecutiveSnapshot {
  refreshedAt: string
  branches: ExecutiveBranchSummary[]
  operations: ManagerOperationsSnapshot
  business: ManagerBusinessSnapshot
  insights: ManagerInsightsSnapshot
  workforce: ExecutiveWorkforceSnapshot
}

export type ExecutiveGoalDecision = 'approve' | 'revision' | 'reject'
export type ExecutiveRecommendationDecision = 'approve' | 'revision' | 'reject'

export interface ExecutiveDecisionResult {
  snapshot: ExecutiveSnapshot
  goalProposal?: SalesGoalProposal
  recommendation?: ManagerRecommendation
}
