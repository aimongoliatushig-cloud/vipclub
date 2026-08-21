import type { ManagementSession } from '../../shared/managementAccess'
import { requirePermission } from '../../shared/managementAccess'
import {
  BrowserManagerBusinessService,
  MANAGER_BUSINESS_STORAGE_KEY,
  type StoredBusinessState,
} from '../workforce/managerBusinessService'
import { BrowserManagerInsightsService } from '../workforce/managerInsightsService'
import {
  BrowserManagerOperationsService,
  MANAGER_OPERATIONS_STORAGE_KEY,
  type StoredOperationsState,
} from '../workforce/managerOperationsService'
import { BrowserWorkforceService, getCoverage, startOfWeek } from '../workforce/workforceService'
import type {
  ExecutiveDecisionResult,
  ExecutiveGoalDecision,
  ExecutiveRecommendationDecision,
  ExecutiveSnapshot,
} from './executiveModels'

const BRANCH_ID = 'branch-central'

function id(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function requireComment(value: string): string {
  const comment = value.trim()
  if (comment.length < 5) throw new Error('Шийдвэрийн тайлбар дор хаяж 5 тэмдэгт байна.')
  return comment
}

function readStored<T>(key: string): T {
  const raw = window.localStorage.getItem(key)
  if (!raw) throw new Error('Хуваалцсан хүсэлтийн өгөгдөл бэлэн бус байна.')
  return JSON.parse(raw) as T
}

function writeStored<T>(key: string, state: T): void {
  window.localStorage.setItem(key, JSON.stringify(state))
}

export interface ExecutiveService {
  getSnapshot(): ExecutiveSnapshot
  reviewGoalProposal(proposalId: string, decision: ExecutiveGoalDecision, comment: string): ExecutiveDecisionResult
  reviewRecommendation(recommendationId: string, decision: ExecutiveRecommendationDecision, comment: string): ExecutiveDecisionResult
}

export class BrowserExecutiveService implements ExecutiveService {
  private readonly operationsService = new BrowserManagerOperationsService()
  private readonly businessService = new BrowserManagerBusinessService()
  private readonly insightsService = new BrowserManagerInsightsService()
  private readonly workforceService = new BrowserWorkforceService()

  constructor(private readonly session: ManagementSession) {}

  private assertRead(): void {
    requirePermission(this.session, 'company.dashboard.read')
  }

  private assertDecision(): void {
    requirePermission(this.session, 'company.approvals.write')
  }

  getSnapshot(): ExecutiveSnapshot {
    this.assertRead()
    const operations = this.operationsService.getSnapshot(BRANCH_ID)
    const business = this.businessService.getSnapshot(BRANCH_ID)
    const insights = this.insightsService.getSnapshot(BRANCH_ID)
    const weekStart = startOfWeek(new Date())
    const roster = this.workforceService.getRoster(weekStart)
    const coverage = getCoverage(roster)
    const pendingApprovals = Number(operations.goalProposal.state === 'submitted')
      + business.recommendations.filter((item) => item.status === 'submitted').length

    return {
      refreshedAt: new Date().toISOString(),
      branches: [
        { id: BRANCH_ID, name: 'Төв салбар', managerName: roster.managerName, targetAmount: 320_000_000, actualSales: insights.salesGoal?.actualSales ?? 0, workforceRisk: coverage.some((item) => item.gap > 0) ? 'attention' : 'healthy', openApprovals: pendingApprovals },
        { id: 'branch-east', name: 'Зүүн салбар', managerName: 'Солонго менежер', targetAmount: 250_000_000, actualSales: 177_000_000, workforceRisk: 'healthy', openApprovals: 0 },
        { id: 'branch-west', name: 'Баруун салбар', managerName: 'Тэмүүлэн менежер', targetAmount: 285_000_000, actualSales: 202_000_000, workforceRisk: 'attention', openApprovals: 1 },
        { id: 'branch-gobi', name: 'Говь салбар', managerName: 'Нараа менежер', targetAmount: 165_000_000, actualSales: 115_000_000, workforceRisk: 'healthy', openApprovals: 0 },
      ],
      operations,
      business,
      insights,
      workforce: {
        roster,
        followUp: this.workforceService.getExecutiveFollowUp(weekStart),
        openCoverageGaps: coverage.reduce((total, item) => total + item.gap, 0),
        leaveRequests: this.workforceService.getLeaveRequests(weekStart),
        penaltyReviews: this.workforceService.getPenaltyReviews(weekStart),
      },
    }
  }

  reviewGoalProposal(proposalId: string, decision: ExecutiveGoalDecision, comment: string): ExecutiveDecisionResult {
    this.assertDecision()
    this.operationsService.getSnapshot(BRANCH_ID)
    const state = readStored<StoredOperationsState>(MANAGER_OPERATIONS_STORAGE_KEY)
    const proposal = state.goalProposal
    if (proposal.id !== proposalId || proposal.state !== 'submitted') {
      throw new Error('Зөвхөн хяналтад илгээсэн зорилгын саналыг шийдвэрлэнэ.')
    }
    const note = requireComment(comment)
    const now = new Date().toISOString()
    proposal.state = decision === 'approve' ? 'approved' : decision === 'revision' ? 'revision-requested' : 'rejected'
    proposal.ceoComment = note
    proposal.updatedAt = now
    proposal.audit.push({
      id: id('goal-audit'),
      action: decision === 'approve' ? 'approved' : decision === 'revision' ? 'revision-requested' : 'rejected',
      actor: this.session.displayName,
      at: now,
      note,
      version: proposal.version,
    })
    writeStored(MANAGER_OPERATIONS_STORAGE_KEY, state)
    const snapshot = this.getSnapshot()
    return { snapshot, goalProposal: snapshot.operations.goalProposal }
  }

  reviewRecommendation(recommendationId: string, decision: ExecutiveRecommendationDecision, comment: string): ExecutiveDecisionResult {
    this.assertDecision()
    this.businessService.getSnapshot(BRANCH_ID)
    const state = readStored<StoredBusinessState>(MANAGER_BUSINESS_STORAGE_KEY)
    const recommendation = state.recommendations.find((item) => item.id === recommendationId)
    if (!recommendation || recommendation.status !== 'submitted') {
      throw new Error('Зөвхөн эцсийн шийдвэрт илгээсэн саналыг шийдвэрлэнэ.')
    }
    recommendation.status = decision === 'approve' ? 'approved' : decision === 'revision' ? 'revision-requested' : 'rejected'
    recommendation.decisionComment = requireComment(comment)
    recommendation.updatedAt = new Date().toISOString()
    writeStored(MANAGER_BUSINESS_STORAGE_KEY, state)
    const snapshot = this.getSnapshot()
    return { snapshot, recommendation: snapshot.business.recommendations.find((item) => item.id === recommendationId) }
  }
}
