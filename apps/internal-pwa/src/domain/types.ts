export type DataMode = 'demo' | 'live' | 'pending'
export type Severity = 'healthy' | 'attention' | 'critical'
export type TrendDirection = 'up' | 'down' | 'flat'

export interface DataMeta {
  source: string
  sourceRecord: string
  owner: string
  permission: string
  updatedAt: string
  mode: DataMode
  reconciled: boolean
  policyVersion?: string
}

export interface HealthDriver {
  id: string
  label: string
  weight: number
  score: number
  positive: string[]
  negative: string[]
  meta: DataMeta
}

export interface Branch {
  id: string
  name: string
  shortName: string
  location: string
  manager: string
  health: number
  previousHealth: number
  severity: Severity
  salesActual: number
  salesTarget: number
  expectedPace: number
  customerTrend: number
  workforceReadiness: number
  requiredStaff: number
  scheduledStaff: number
  checkedInStaff: number
  approvedLeave: number
  noShows: number
  serviceIssues: number
  overdueTasks: number
  healthTrend: number[]
  drivers: HealthDriver[]
  meta: DataMeta
}

export type MembershipLevel = 'Bronze' | 'Silver' | 'Gold' | 'Diamond' | 'Black Diamond'

export interface Customer {
  id: string
  name: string
  maskedPhone: string
  branchId: string
  level: MembershipLevel
  calculatedLevel: MembershipLevel
  proposedLevel?: MembershipLevel
  averageSpend: number
  completedVisits: number
  visitTrend: number
  lastVisit: string
  preferredEntertainer: string
  managerDecision: string
  managerComment?: string
  retainedException: boolean
  meta: DataMeta
}

export type ApprovalType = 'membership' | 'rank' | 'loan' | 'plan' | 'settlement'
export type ApprovalStatus = 'pending' | 'approved' | 'returned' | 'rejected' | 'retained' | 'overridden'

export interface ApprovalHistoryEntry {
  at: string
  actor: string
  role: string
  action: string
  sourceVersion: string
}

export interface Approval {
  id: string
  type: ApprovalType
  title: string
  subject: string
  branchId: string
  requester: string
  reviewer: string
  requestedAt: string
  ageMinutes: number
  urgency: Severity
  financial: boolean
  amount?: number
  status: ApprovalStatus
  detail: Array<{ label: string; value: string; tone?: Severity }>
  sourceEvidence: string[]
  policyState: 'approved' | 'configuration-pending' | 'integration-pending'
  conflicts: string[]
  downstreamConsequence: string
  history: ApprovalHistoryEntry[]
  overrideOptions?: string[]
  meta: DataMeta
  decisionReason?: string
  overrideValue?: string
}

export type TaskStatus =
  | 'assigned'
  | 'clarification'
  | 'acknowledged'
  | 'in-progress'
  | 'submitted'
  | 'rework'
  | 'completed'
  | 'overdue'

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'

export interface TaskMessage {
  id: string
  author: string
  role: string
  body: string
  createdAt: string
}

export interface ExecutiveTask {
  id: string
  title: string
  instruction: string
  assignee: string
  assigneeRole: string
  branchId?: string
  module: string
  dueAt: string
  priority: TaskPriority
  status: TaskStatus
  createdBy: string
  createdAt: string
  evidenceCount: number
  messages: TaskMessage[]
  sourceContext?: string
}

export type ThreadKind = 'normal' | 'task' | 'hermes' | 'sensitive' | 'anonymous'
export type MessageDeliveryStatus = 'pending' | 'delivered' | 'read' | 'failed'
export type MessageThreadStatus = 'active' | 'stale' | 'retained' | 'deleted'

export interface MessageParticipant {
  name: string
  role: string
  access: 'active' | 'revoked'
}

export interface MessageAttachment {
  id: string
  name: string
  sizeLabel: string
  status: 'available' | 'denied' | 'retained'
}

export interface MessageAuditEntry {
  id: string
  actor: string
  action: string
  detail: string
  createdAt: string
}

export interface MessageItem {
  id: string
  sender: string
  body: string
  createdAt: string
  mine: boolean
  read: boolean
  delivery: MessageDeliveryStatus
  deliveredAt?: string
  readAt?: string
  attachments: MessageAttachment[]
}

export interface MessageThread {
  id: string
  title: string
  participant: string
  participantRole: string
  participants: MessageParticipant[]
  branchId?: string
  kind: ThreadKind
  scope: 'company' | 'branch'
  status: MessageThreadStatus
  accessStatus: 'active' | 'revoked'
  urgency: Severity
  owner: string
  retentionLabel: string
  exportAllowed: boolean
  audience: 'internal'
  unread: number
  updatedAt: string
  context?: string
  auditTrail: MessageAuditEntry[]
  meta: DataMeta
  messages: MessageItem[]
}

export interface CreateConversationInput {
  title: string
  participant: string
  participantRole: string
  branchId?: string
  kind: ThreadKind
  urgency?: Severity
  context?: string
  body: string
}

export type HermesStatus = 'new' | 'accepted' | 'dismissed' | 'snoozed' | 'converted'

export type HermesAnalysisState =
  | 'ready'
  | 'empty'
  | 'conflicting-source'
  | 'stale'
  | 'low-confidence'
  | 'unavailable'
  | 'unsafe-action'

export type HermesBriefingDomain =
  | 'branch'
  | 'sales'
  | 'customer'
  | 'workforce'
  | 'task'
  | 'approval'
  | 'exception'

export interface HermesBriefingItem {
  id: string
  domain: HermesBriefingDomain
  branchId?: string
  label: string
  value: string
  detail: string
  href: string
  sourceRecord: string
  updatedAt: string
  state: HermesAnalysisState
}

export interface HermesDailyBriefing {
  id: string
  period: string
  summary: string
  items: HermesBriefingItem[]
  knownMissingData: string[]
  meta: DataMeta
}

export interface HermesMonthlyBranchReview {
  branchId: string
  target: string
  plan: string
  execution: string
  outcome: string
  unresolvedRisk: string
  priorRecommendationResult: string
  sourceRecords: string[]
  state: 'complete' | 'partial' | 'stale'
}

export interface HermesMonthlyReview {
  id: string
  period: string
  priorPeriod: string
  summary: string
  branches: HermesMonthlyBranchReview[]
  knownMissingData: string[]
  meta: DataMeta
}

export interface HermesEvidence {
  id: string
  label: string
  value: string
  detail: string
  sourceRecord: string
  updatedAt: string
  state: 'complete' | 'partial' | 'stale' | 'conflict' | 'unavailable'
  authorized: true
}

export interface HermesAnnotation {
  id: string
  body: string
  actor: string
  createdAt: string
}

export interface HermesFeedback {
  id: string
  usefulness: 'useful' | 'not-useful'
  accuracy: 'accurate' | 'uncertain' | 'inaccurate'
  note?: string
  actor: string
  createdAt: string
}

export interface HermesFeedbackInput {
  usefulness: HermesFeedback['usefulness']
  accuracy: HermesFeedback['accuracy']
  note?: string
}

export interface HermesRecommendation {
  id: string
  title: string
  branchId?: string
  observation: string
  evidence: HermesEvidence[]
  possibleCause: string
  confidence: number
  uncertainty: string
  recommendation: string
  analysisState: HermesAnalysisState
  policyVersion: string
  metricVersion: string
  assumptions: string[]
  missingData: string[]
  authorizedInputSummary: string[]
  unsafeActionReason?: string
  linkedThreadId?: string
  linkedTaskId?: string
  annotations: HermesAnnotation[]
  feedback: HermesFeedback[]
  isAuthoritative: false
  status: HermesStatus
  createdAt: string
  meta: DataMeta
}

export type SettlementStatus =
  | 'draft'
  | 'accountant-reviewed'
  | 'ceo-required'
  | 'approved'
  | 'submitted'
  | 'processing'
  | 'paid'
  | 'partial-failure'

export interface SettlementLine {
  label: string
  amount: number
  kind: 'earning' | 'deduction' | 'adjustment'
}

export interface SettlementEntertainer {
  id: string
  name: string
  rank: 'Rank 1' | 'Rank 2' | 'Rank 3'
  branchId: string
  net: number
  exceptions: number
}

export interface SettlementBatch {
  id: string
  period: string
  status: SettlementStatus
  accountant: string
  reviewedAt: string
  entertainerCount: number
  exceptionCount: number
  lines: SettlementLine[]
  entertainers: SettlementEntertainer[]
  meta: DataMeta
}

export type WorkforcePresenceState =
  | 'scheduled'
  | 'available'
  | 'reserved'
  | 'serving'
  | 'break'
  | 'late'
  | 'absent'
  | 'leave'
  | 'uncovered'
  | 'stale'
  | 'unknown'

export interface WorkforceStatusCount {
  state: WorkforcePresenceState
  count: number
}

export interface WorkforceCoverageGap {
  id: string
  role: string
  timeWindow: string
  required: number
  covered: number
  state: 'uncovered' | 'stale' | 'unknown'
  evidence: string[]
  sourceRecord: string
}

export interface AttendanceTrendPoint {
  period: string
  late: number
  absent: number
  leave: number
}

export interface WorkforceForecast {
  horizonDays: 14 | 30
  predictedGap: number
  confidence?: number
  assumptions: string[]
  missingData: string[]
  dataState: 'complete' | 'partial' | 'stale' | 'unavailable'
  sourceRecord: string
}

export interface WorkforceReadinessSnapshot {
  id: string
  branchId: string
  operatingDate: string
  statusCounts: WorkforceStatusCount[]
  coverageGaps: WorkforceCoverageGap[]
  attendanceTrend: AttendanceTrendPoint[]
  forecast: WorkforceForecast[]
  meta: DataMeta
}

export interface ManagerMetricEvidence {
  id: string
  label: string
  value: number
  unit: '%' | 'score'
  sourceRecord: string
  updatedAt: string
  policyState: 'approved' | 'configuration-pending'
}

export interface ManagerPerformanceEvent {
  id: string
  at: string
  type: 'task' | 'acknowledgement' | 'exception' | 'review'
  title: string
  status: string
  sourceRecord: string
}

export interface ManagerPerformance {
  id: string
  name: string
  branchId: string
  score: number
  salesAttainment: number
  healthScore: number
  customerGrowth: number
  staffingReadiness: number
  taskExecution: number
  actionPlanCompletion: number
  trend: number[]
  metricEvidence: ManagerMetricEvidence[]
  events: ManagerPerformanceEvent[]
  automatedDecision: false
  meta: DataMeta
}

export interface EmployeePerformance {
  id: string
  displayName: string
  maskedEmployeeCode: string
  branchId: string
  role: string
  employmentState: 'active' | 'leave' | 'inactive'
  attendanceRate: number
  taskCompletion: number
  acknowledgementRate: number
  openExceptions: number
  approvedFields: string[]
  sensitiveFieldsMasked: true
  accessAuditRequired: true
  history: ManagerPerformanceEvent[]
  meta: DataMeta
}

export type BranchSettingCategory =
  | 'profile'
  | 'workforce'
  | 'membership'
  | 'service'
  | 'notifications'
  | 'governance'
  | 'finance'
  | 'access'
  | 'integration'

export type BranchSettingValueType = 'text' | 'number' | 'time' | 'boolean' | 'masked'
export type BranchSettingOrigin = 'company-default' | 'branch' | 'ceo-override' | 'configuration-required'
export type BranchSettingStatus = 'active' | 'scheduled' | 'pending-approval' | 'locked' | 'configuration-required'

export interface BranchSettingHistoryEntry {
  id: string
  actor: string
  role: 'CEO' | 'Branch Manager'
  action: 'created' | 'updated' | 'override' | 'submitted'
  before: string
  after: string
  reason: string
  effectiveFrom: string
  version: number
  createdAt: string
}

export interface BranchSetting {
  id: string
  key: string
  branchId: string
  category: BranchSettingCategory
  label: string
  description: string
  value: string
  unit?: string
  valueType: BranchSettingValueType
  origin: BranchSettingOrigin
  status: BranchSettingStatus
  managerEditable: boolean
  ceoEditable: boolean
  requiresCeoApproval: boolean
  highImpact: boolean
  effectiveFrom: string
  version: number
  updatedBy: string
  updatedAt: string
  lockedReason?: string
  sourceDocs: string[]
  history: BranchSettingHistoryEntry[]
}

export interface UpdateBranchSettingInput {
  value: string
  reason: string
  effectiveFrom: string
  expectedVersion: number
}

export interface AuditEvent {
  id: string
  actor: string
  role: string
  domain?: string
  action: string
  target: string
  branchId?: string
  reason: string
  summary?: string
  eventType?: 'action' | 'adjustment' | 'reversal'
  before?: string
  after?: string
  reversesEventId?: string
  exportControl?: {
    format: 'csv' | 'pdf'
    estimatedRows: number
    scope: 'current-authorized-view'
    masked: true
    outcome: 'allowed' | 'partial' | 'denied'
  }
  createdAt: string
  correlationId: string
}

export interface RecordAuditInput {
  domain: string
  action: string
  target: string
  branchId?: string
  reason: string
  summary?: string
  eventType?: 'action' | 'adjustment' | 'reversal'
  before?: string
  after?: string
  reversesEventId?: string
  exportControl?: {
    format: 'csv' | 'pdf'
    estimatedRows: number
    scope: 'current-authorized-view'
    masked: true
    outcome: 'allowed' | 'partial' | 'denied'
  }
}

export interface CreateTaskInput {
  title: string
  instruction: string
  assignee: string
  assigneeRole: string
  branchId?: string
  module: string
  dueAt: string
  priority: TaskPriority
  sourceContext?: string
}

export interface DecisionInput {
  status: Exclude<ApprovalStatus, 'pending'>
  reason: string
  expectedUpdatedAt: string
  overrideValue?: string
}

export type ExecutiveNotificationKind =
  | 'approval'
  | 'settlement'
  | 'task'
  | 'message'
  | 'escalation'
  | 'goal-plan'
  | 'hermes'

export interface ExecutiveNotification {
  id: string
  kind: ExecutiveNotificationKind
  title: string
  description: string
  target: string
  deliveredAt: string
  readAt?: string
  urgency: Severity
  branchId?: string
  sensitive?: boolean
  targetState?: 'active' | 'stale' | 'withdrawn'
}

export interface AppSnapshot {
  branches: Branch[]
  branchSettings: BranchSetting[]
  customers: Customer[]
  approvals: Approval[]
  tasks: ExecutiveTask[]
  threads: MessageThread[]
  hermesDaily: HermesDailyBriefing
  hermesMonthly: HermesMonthlyReview
  recommendations: HermesRecommendation[]
  settlements: SettlementBatch[]
  workforce: WorkforceReadinessSnapshot[]
  managers: ManagerPerformance[]
  employees: EmployeePerformance[]
  auditEvents: AuditEvent[]
}
