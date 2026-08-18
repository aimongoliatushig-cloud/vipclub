import type {
  AppSnapshot,
  Approval,
  AuditEvent,
  Branch,
  BranchSetting,
  Customer,
  EmployeePerformance,
  ExecutiveTask,
  HermesDailyBriefing,
  HermesMonthlyReview,
  HermesRecommendation,
  ManagerPerformance,
  MessageThread,
  SettlementBatch,
  WorkforceReadinessSnapshot,
} from '../domain/types'
import type { AppServices, HermesActionResult } from './contracts'

type Schema =
  | { kind: 'string' | 'number' | 'boolean' }
  | { kind: 'enum'; values: readonly string[] }
  | { kind: 'array'; item: Schema }
  | { kind: 'object'; fields: Record<string, Schema> }
  | { kind: 'optional'; value: Schema }

const stringValue: Schema = { kind: 'string' }
const numberValue: Schema = { kind: 'number' }
const booleanValue: Schema = { kind: 'boolean' }
const oneOf = (...values: string[]): Schema => ({ kind: 'enum', values })
const arrayOf = (item: Schema): Schema => ({ kind: 'array', item })
const shape = (fields: Record<string, Schema>): Schema => ({ kind: 'object', fields })
const optional = (value: Schema): Schema => ({ kind: 'optional', value })

export class ContractValidationError extends Error {
  constructor(adapter: string, path: string, message: string) {
    super(`${adapter} adapter payload at ${path}: ${message}`)
    this.name = 'ContractValidationError'
  }
}

function assertSchema(value: unknown, schema: Schema, path: string, adapter: string): void {
  if (schema.kind === 'optional') {
    if (value === undefined) return
    assertSchema(value, schema.value, path, adapter)
    return
  }
  if (schema.kind === 'string' || schema.kind === 'number' || schema.kind === 'boolean') {
    if (typeof value !== schema.kind || (schema.kind === 'number' && !Number.isFinite(value))) {
      throw new ContractValidationError(adapter, path, `expected ${schema.kind}`)
    }
    return
  }
  if (schema.kind === 'enum') {
    if (typeof value !== 'string' || !schema.values.includes(value)) {
      throw new ContractValidationError(adapter, path, `expected one of ${schema.values.join(', ')}`)
    }
    return
  }
  if (schema.kind === 'array') {
    if (!Array.isArray(value)) throw new ContractValidationError(adapter, path, 'expected array')
    value.forEach((item, index) => assertSchema(item, schema.item, `${path}[${index}]`, adapter))
    return
  }
  if (schema.kind !== 'object') throw new ContractValidationError(adapter, path, 'unsupported schema')
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ContractValidationError(adapter, path, 'expected object')
  }

  const record = value as Record<string, unknown>
  for (const key of Object.keys(record)) {
    if (!schema.fields[key]) throw new ContractValidationError(adapter, `${path}.${key}`, 'unknown field')
  }
  for (const [key, fieldSchema] of Object.entries(schema.fields)) {
    if (!(key in record) && fieldSchema.kind !== 'optional') {
      throw new ContractValidationError(adapter, `${path}.${key}`, 'missing field')
    }
    assertSchema(record[key], fieldSchema, `${path}.${key}`, adapter)
  }
}

const dataMetaSchema = shape({
  source: stringValue,
  sourceRecord: stringValue,
  owner: stringValue,
  permission: stringValue,
  updatedAt: stringValue,
  mode: oneOf('demo', 'live', 'pending'),
  reconciled: booleanValue,
  policyVersion: optional(stringValue),
})

const healthDriverSchema = shape({
  id: stringValue,
  label: stringValue,
  weight: numberValue,
  score: numberValue,
  positive: arrayOf(stringValue),
  negative: arrayOf(stringValue),
  meta: dataMetaSchema,
})

const branchSchema = shape({
  id: stringValue,
  name: stringValue,
  shortName: stringValue,
  location: stringValue,
  manager: stringValue,
  health: numberValue,
  previousHealth: numberValue,
  severity: oneOf('healthy', 'attention', 'critical'),
  salesActual: numberValue,
  salesTarget: numberValue,
  expectedPace: numberValue,
  customerTrend: numberValue,
  workforceReadiness: numberValue,
  requiredStaff: numberValue,
  scheduledStaff: numberValue,
  checkedInStaff: numberValue,
  approvedLeave: numberValue,
  noShows: numberValue,
  serviceIssues: numberValue,
  overdueTasks: numberValue,
  healthTrend: arrayOf(numberValue),
  drivers: arrayOf(healthDriverSchema),
  meta: dataMetaSchema,
})

const branchSettingSchema = shape({
  id: stringValue,
  key: stringValue,
  branchId: stringValue,
  category: oneOf('profile', 'workforce', 'membership', 'service', 'notifications', 'governance', 'finance', 'access', 'integration'),
  label: stringValue,
  description: stringValue,
  value: stringValue,
  unit: optional(stringValue),
  valueType: oneOf('text', 'number', 'time', 'boolean', 'masked'),
  origin: oneOf('company-default', 'branch', 'ceo-override', 'configuration-required'),
  status: oneOf('active', 'scheduled', 'pending-approval', 'locked', 'configuration-required'),
  managerEditable: booleanValue,
  ceoEditable: booleanValue,
  requiresCeoApproval: booleanValue,
  highImpact: booleanValue,
  effectiveFrom: stringValue,
  version: numberValue,
  updatedBy: stringValue,
  updatedAt: stringValue,
  lockedReason: optional(stringValue),
  sourceDocs: arrayOf(stringValue),
  history: arrayOf(shape({
    id: stringValue,
    actor: stringValue,
    role: oneOf('CEO', 'Branch Manager'),
    action: oneOf('created', 'updated', 'override', 'submitted'),
    before: stringValue,
    after: stringValue,
    reason: stringValue,
    effectiveFrom: stringValue,
    version: numberValue,
    createdAt: stringValue,
  })),
})

const customerSchema = shape({
  id: stringValue,
  name: stringValue,
  maskedPhone: stringValue,
  branchId: stringValue,
  level: oneOf('Bronze', 'Silver', 'Gold', 'Diamond', 'Black Diamond'),
  calculatedLevel: oneOf('Bronze', 'Silver', 'Gold', 'Diamond', 'Black Diamond'),
  proposedLevel: optional(oneOf('Bronze', 'Silver', 'Gold', 'Diamond', 'Black Diamond')),
  averageSpend: numberValue,
  completedVisits: numberValue,
  visitTrend: numberValue,
  lastVisit: stringValue,
  preferredEntertainer: stringValue,
  managerDecision: stringValue,
  managerComment: optional(stringValue),
  retainedException: booleanValue,
  meta: dataMetaSchema,
})

const approvalDetailSchema = shape({
  label: stringValue,
  value: stringValue,
  tone: optional(oneOf('healthy', 'attention', 'critical')),
})

const approvalHistorySchema = shape({
  at: stringValue,
  actor: stringValue,
  role: stringValue,
  action: stringValue,
  sourceVersion: stringValue,
})

const approvalSchema = shape({
  id: stringValue,
  type: oneOf('membership', 'rank', 'loan', 'plan', 'settlement'),
  title: stringValue,
  subject: stringValue,
  branchId: stringValue,
  requester: stringValue,
  reviewer: stringValue,
  requestedAt: stringValue,
  ageMinutes: numberValue,
  urgency: oneOf('healthy', 'attention', 'critical'),
  financial: booleanValue,
  amount: optional(numberValue),
  status: oneOf('pending', 'approved', 'returned', 'rejected', 'retained', 'overridden'),
  detail: arrayOf(approvalDetailSchema),
  sourceEvidence: arrayOf(stringValue),
  policyState: oneOf('approved', 'configuration-pending', 'integration-pending'),
  conflicts: arrayOf(stringValue),
  downstreamConsequence: stringValue,
  history: arrayOf(approvalHistorySchema),
  overrideOptions: optional(arrayOf(stringValue)),
  meta: dataMetaSchema,
  decisionReason: optional(stringValue),
  overrideValue: optional(stringValue),
})

const taskMessageSchema = shape({
  id: stringValue,
  author: stringValue,
  role: stringValue,
  body: stringValue,
  createdAt: stringValue,
})

const taskSchema = shape({
  id: stringValue,
  title: stringValue,
  instruction: stringValue,
  assignee: stringValue,
  assigneeRole: stringValue,
  branchId: optional(stringValue),
  module: stringValue,
  dueAt: stringValue,
  priority: oneOf('low', 'medium', 'high', 'critical'),
  status: oneOf('assigned', 'clarification', 'acknowledged', 'in-progress', 'submitted', 'rework', 'completed', 'overdue'),
  createdBy: stringValue,
  createdAt: stringValue,
  evidenceCount: numberValue,
  messages: arrayOf(taskMessageSchema),
  sourceContext: optional(stringValue),
})

const messageItemSchema = shape({
  id: stringValue,
  sender: stringValue,
  body: stringValue,
  createdAt: stringValue,
  mine: booleanValue,
  read: booleanValue,
  delivery: oneOf('pending', 'delivered', 'read', 'failed'),
  deliveredAt: optional(stringValue),
  readAt: optional(stringValue),
  attachments: arrayOf(shape({
    id: stringValue,
    name: stringValue,
    sizeLabel: stringValue,
    status: oneOf('available', 'denied', 'retained'),
  })),
})

const messageThreadSchema = shape({
  id: stringValue,
  title: stringValue,
  participant: stringValue,
  participantRole: stringValue,
  participants: arrayOf(shape({
    name: stringValue,
    role: stringValue,
    access: oneOf('active', 'revoked'),
  })),
  branchId: optional(stringValue),
  kind: oneOf('normal', 'task', 'hermes', 'sensitive', 'anonymous'),
  scope: oneOf('company', 'branch'),
  status: oneOf('active', 'stale', 'retained', 'deleted'),
  accessStatus: oneOf('active', 'revoked'),
  urgency: oneOf('healthy', 'attention', 'critical'),
  owner: stringValue,
  retentionLabel: stringValue,
  exportAllowed: booleanValue,
  audience: oneOf('internal'),
  unread: numberValue,
  updatedAt: stringValue,
  context: optional(stringValue),
  auditTrail: arrayOf(shape({
    id: stringValue,
    actor: stringValue,
    action: stringValue,
    detail: stringValue,
    createdAt: stringValue,
  })),
  meta: dataMetaSchema,
  messages: arrayOf(messageItemSchema),
})

const hermesAnalysisStateSchema = oneOf('ready', 'empty', 'conflicting-source', 'stale', 'low-confidence', 'unavailable', 'unsafe-action')

const hermesEvidenceSchema = shape({
  id: stringValue,
  label: stringValue,
  value: stringValue,
  detail: stringValue,
  sourceRecord: stringValue,
  updatedAt: stringValue,
  state: oneOf('complete', 'partial', 'stale', 'conflict', 'unavailable'),
  authorized: booleanValue,
})

const hermesDailySchema = shape({
  id: stringValue,
  period: stringValue,
  summary: stringValue,
  items: arrayOf(shape({
    id: stringValue,
    domain: oneOf('branch', 'sales', 'customer', 'workforce', 'task', 'approval', 'exception'),
    branchId: optional(stringValue),
    label: stringValue,
    value: stringValue,
    detail: stringValue,
    href: stringValue,
    sourceRecord: stringValue,
    updatedAt: stringValue,
    state: hermesAnalysisStateSchema,
  })),
  knownMissingData: arrayOf(stringValue),
  meta: dataMetaSchema,
})

const hermesMonthlySchema = shape({
  id: stringValue,
  period: stringValue,
  priorPeriod: stringValue,
  summary: stringValue,
  branches: arrayOf(shape({
    branchId: stringValue,
    target: stringValue,
    plan: stringValue,
    execution: stringValue,
    outcome: stringValue,
    unresolvedRisk: stringValue,
    priorRecommendationResult: stringValue,
    sourceRecords: arrayOf(stringValue),
    state: oneOf('complete', 'partial', 'stale'),
  })),
  knownMissingData: arrayOf(stringValue),
  meta: dataMetaSchema,
})

const recommendationSchema = shape({
  id: stringValue,
  title: stringValue,
  branchId: optional(stringValue),
  observation: stringValue,
  evidence: arrayOf(hermesEvidenceSchema),
  possibleCause: stringValue,
  confidence: numberValue,
  uncertainty: stringValue,
  recommendation: stringValue,
  analysisState: hermesAnalysisStateSchema,
  policyVersion: stringValue,
  metricVersion: stringValue,
  assumptions: arrayOf(stringValue),
  missingData: arrayOf(stringValue),
  authorizedInputSummary: arrayOf(stringValue),
  unsafeActionReason: optional(stringValue),
  linkedThreadId: optional(stringValue),
  linkedTaskId: optional(stringValue),
  annotations: arrayOf(shape({ id: stringValue, body: stringValue, actor: stringValue, createdAt: stringValue })),
  feedback: arrayOf(shape({
    id: stringValue,
    usefulness: oneOf('useful', 'not-useful'),
    accuracy: oneOf('accurate', 'uncertain', 'inaccurate'),
    note: optional(stringValue),
    actor: stringValue,
    createdAt: stringValue,
  })),
  isAuthoritative: booleanValue,
  status: oneOf('new', 'accepted', 'dismissed', 'snoozed', 'converted'),
  createdAt: stringValue,
  meta: dataMetaSchema,
})

const settlementLineSchema = shape({
  label: stringValue,
  amount: numberValue,
  kind: oneOf('earning', 'deduction', 'adjustment'),
})

const settlementEntertainerSchema = shape({
  id: stringValue,
  name: stringValue,
  rank: oneOf('Rank 1', 'Rank 2', 'Rank 3'),
  branchId: stringValue,
  net: numberValue,
  exceptions: numberValue,
})

const settlementSchema = shape({
  id: stringValue,
  period: stringValue,
  status: oneOf('draft', 'accountant-reviewed', 'ceo-required', 'approved', 'submitted', 'processing', 'paid', 'partial-failure'),
  accountant: stringValue,
  reviewedAt: stringValue,
  entertainerCount: numberValue,
  exceptionCount: numberValue,
  lines: arrayOf(settlementLineSchema),
  entertainers: arrayOf(settlementEntertainerSchema),
  meta: dataMetaSchema,
})

const workforceSchema = shape({
  id: stringValue,
  branchId: stringValue,
  operatingDate: stringValue,
  statusCounts: arrayOf(shape({
    state: oneOf('scheduled', 'available', 'reserved', 'serving', 'break', 'late', 'absent', 'leave', 'uncovered', 'stale', 'unknown'),
    count: numberValue,
  })),
  coverageGaps: arrayOf(shape({
    id: stringValue,
    role: stringValue,
    timeWindow: stringValue,
    required: numberValue,
    covered: numberValue,
    state: oneOf('uncovered', 'stale', 'unknown'),
    evidence: arrayOf(stringValue),
    sourceRecord: stringValue,
  })),
  attendanceTrend: arrayOf(shape({
    period: stringValue,
    late: numberValue,
    absent: numberValue,
    leave: numberValue,
  })),
  forecast: arrayOf(shape({
    horizonDays: numberValue,
    predictedGap: numberValue,
    confidence: optional(numberValue),
    assumptions: arrayOf(stringValue),
    missingData: arrayOf(stringValue),
    dataState: oneOf('complete', 'partial', 'stale', 'unavailable'),
    sourceRecord: stringValue,
  })),
  meta: dataMetaSchema,
})

const managerSchema = shape({
  id: stringValue,
  name: stringValue,
  branchId: stringValue,
  score: numberValue,
  salesAttainment: numberValue,
  healthScore: numberValue,
  customerGrowth: numberValue,
  staffingReadiness: numberValue,
  taskExecution: numberValue,
  actionPlanCompletion: numberValue,
  trend: arrayOf(numberValue),
  metricEvidence: arrayOf(shape({
    id: stringValue,
    label: stringValue,
    value: numberValue,
    unit: oneOf('%', 'score'),
    sourceRecord: stringValue,
    updatedAt: stringValue,
    policyState: oneOf('approved', 'configuration-pending'),
  })),
  events: arrayOf(shape({
    id: stringValue,
    at: stringValue,
    type: oneOf('task', 'acknowledgement', 'exception', 'review'),
    title: stringValue,
    status: stringValue,
    sourceRecord: stringValue,
  })),
  automatedDecision: booleanValue,
  meta: dataMetaSchema,
})

const employeeSchema = shape({
  id: stringValue,
  displayName: stringValue,
  maskedEmployeeCode: stringValue,
  branchId: stringValue,
  role: stringValue,
  employmentState: oneOf('active', 'leave', 'inactive'),
  attendanceRate: numberValue,
  taskCompletion: numberValue,
  acknowledgementRate: numberValue,
  openExceptions: numberValue,
  approvedFields: arrayOf(stringValue),
  sensitiveFieldsMasked: booleanValue,
  accessAuditRequired: booleanValue,
  history: arrayOf(shape({
    id: stringValue,
    at: stringValue,
    type: oneOf('task', 'acknowledgement', 'exception', 'review'),
    title: stringValue,
    status: stringValue,
    sourceRecord: stringValue,
  })),
  meta: dataMetaSchema,
})

const auditEventSchema = shape({
  id: stringValue,
  actor: stringValue,
  role: stringValue,
  domain: optional(stringValue),
  action: stringValue,
  target: stringValue,
  branchId: optional(stringValue),
  reason: stringValue,
  summary: optional(stringValue),
  eventType: optional(oneOf('action', 'adjustment', 'reversal')),
  before: optional(stringValue),
  after: optional(stringValue),
  reversesEventId: optional(stringValue),
  exportControl: optional(shape({
    format: oneOf('csv', 'pdf'),
    estimatedRows: numberValue,
    scope: oneOf('current-authorized-view'),
    masked: booleanValue,
    outcome: oneOf('allowed', 'partial', 'denied'),
  })),
  createdAt: stringValue,
  correlationId: stringValue,
})

const snapshotSchema = shape({
  branches: arrayOf(branchSchema),
  branchSettings: arrayOf(branchSettingSchema),
  customers: arrayOf(customerSchema),
  approvals: arrayOf(approvalSchema),
  tasks: arrayOf(taskSchema),
  threads: arrayOf(messageThreadSchema),
  hermesDaily: hermesDailySchema,
  hermesMonthly: hermesMonthlySchema,
  recommendations: arrayOf(recommendationSchema),
  settlements: arrayOf(settlementSchema),
  workforce: arrayOf(workforceSchema),
  managers: arrayOf(managerSchema),
  employees: arrayOf(employeeSchema),
  auditEvents: arrayOf(auditEventSchema),
})

function parse<T>(value: unknown, schema: Schema, path: string, adapter: string): T {
  assertSchema(value, schema, path, adapter)
  return value as T
}

export function validateAppSnapshot(value: unknown, adapter = 'fixture'): AppSnapshot {
  return parse<AppSnapshot>(value, snapshotSchema, 'snapshot', adapter)
}

const cents = (value: number) => Math.round(value * 100)

export function validateFixtureReconciliation(snapshot: AppSnapshot): void {
  const expectedBranchIds = ['queen', 'empire', 'platinum', 'gobi']
  const branchIds = snapshot.branches.map((branch) => branch.id)
  if (branchIds.length !== expectedBranchIds.length || expectedBranchIds.some((id) => !branchIds.includes(id))) {
    throw new Error('Executive scenario fixture must contain the four approved branches.')
  }

  const assertUnique = (label: string, ids: string[]) => {
    if (new Set(ids).size !== ids.length) throw new Error(`${label} fixture IDs must be unique.`)
  }
  assertUnique('Branch', branchIds)
  assertUnique('Branch setting', snapshot.branchSettings.map((item) => item.id))
  assertUnique('Customer', snapshot.customers.map((item) => item.id))
  assertUnique('Approval', snapshot.approvals.map((item) => item.id))
  assertUnique('Task', snapshot.tasks.map((item) => item.id))
  assertUnique('Thread', snapshot.threads.map((item) => item.id))
  assertUnique('Recommendation', snapshot.recommendations.map((item) => item.id))
  assertUnique('Settlement', snapshot.settlements.map((item) => item.id))
  assertUnique('Workforce readiness', snapshot.workforce.map((item) => item.id))
  assertUnique('Manager', snapshot.managers.map((item) => item.id))
  assertUnique('Employee', snapshot.employees.map((item) => item.id))
  assertUnique('Audit event', snapshot.auditEvents.map((item) => item.id))

  const assertBranchReference = (label: string, branchId?: string) => {
    if (branchId && !branchIds.includes(branchId)) throw new Error(`${label} references unknown branch ${branchId}.`)
  }
  snapshot.customers.forEach((item) => assertBranchReference(`Customer ${item.id}`, item.branchId))
  snapshot.branchSettings.forEach((item) => assertBranchReference(`Branch setting ${item.id}`, item.branchId))
  snapshot.approvals.forEach((item) => assertBranchReference(`Approval ${item.id}`, item.branchId))
  snapshot.tasks.forEach((item) => assertBranchReference(`Task ${item.id}`, item.branchId))
  snapshot.threads.forEach((item) => assertBranchReference(`Thread ${item.id}`, item.branchId))
  snapshot.hermesDaily.items.forEach((item) => assertBranchReference(`Hermes daily item ${item.id}`, item.branchId))
  snapshot.hermesMonthly.branches.forEach((item) => assertBranchReference(`Hermes monthly branch ${item.branchId}`, item.branchId))
  snapshot.recommendations.forEach((item) => assertBranchReference(`Recommendation ${item.id}`, item.branchId))
  snapshot.workforce.forEach((item) => assertBranchReference(`Workforce ${item.id}`, item.branchId))
  snapshot.employees.forEach((item) => assertBranchReference(`Employee ${item.id}`, item.branchId))
  snapshot.auditEvents.forEach((item) => assertBranchReference(`Audit event ${item.id}`, item.branchId))

  const briefingDomains = ['branch', 'sales', 'customer', 'workforce', 'task', 'approval', 'exception']
  if (briefingDomains.some((domain) => !snapshot.hermesDaily.items.some((item) => item.domain === domain))) {
    throw new Error('Hermes daily briefing must cover every approved executive read-model domain.')
  }
  if (snapshot.hermesMonthly.branches.length !== snapshot.branches.length) {
    throw new Error('Hermes monthly review must cover all four approved branches.')
  }
  for (const recommendation of snapshot.recommendations) {
    if (recommendation.isAuthoritative !== false) throw new Error(`Hermes recommendation ${recommendation.id} must remain advisory.`)
    if (recommendation.evidence.some((item) => item.authorized !== true)) throw new Error(`Hermes recommendation ${recommendation.id} contains unauthorized evidence.`)
    assertUnique(`Hermes recommendation ${recommendation.id} evidence`, recommendation.evidence.map((item) => item.id))
    assertUnique(`Hermes recommendation ${recommendation.id} annotation`, recommendation.annotations.map((item) => item.id))
    assertUnique(`Hermes recommendation ${recommendation.id} feedback`, recommendation.feedback.map((item) => item.id))
  }

  if (snapshot.managers.length !== snapshot.branches.length) throw new Error('Each branch must have one manager drill-down.')
  for (const manager of snapshot.managers) {
    const branch = snapshot.branches.find((item) => item.id === manager.branchId)
    if (!branch) throw new Error(`Manager ${manager.id} references an unknown branch.`)
    if (manager.healthScore !== branch.health || manager.customerGrowth !== branch.customerTrend) {
      throw new Error(`Manager ${manager.id} does not reconcile with branch ${branch.id}.`)
    }
    if (manager.automatedDecision !== false) throw new Error(`Manager ${manager.id} must never produce an automated decision.`)
  }

  for (const branch of snapshot.branches) {
    const weightTotal = branch.drivers.reduce((sum, driver) => sum + driver.weight, 0)
    const weightedHealth = Math.round(branch.drivers.reduce((sum, driver) => sum + (driver.score * driver.weight) / 100, 0))
    if (weightTotal !== 100) throw new Error(`${branch.id} Branch Health weights must total 100%.`)
    if (weightedHealth !== branch.health) throw new Error(`${branch.id} Branch Health components do not reconcile with the top-level score.`)
  }

  for (const batch of snapshot.settlements) {
    assertUnique(`Settlement ${batch.id} entertainer`, batch.entertainers.map((item) => item.id))
    batch.entertainers.forEach((item) => assertBranchReference(`Settlement entertainer ${item.id}`, item.branchId))
    if (batch.entertainerCount !== batch.entertainers.length) throw new Error(`${batch.id} entertainer count does not reconcile.`)
    if (batch.exceptionCount !== batch.entertainers.reduce((sum, item) => sum + item.exceptions, 0)) {
      throw new Error(`${batch.id} exception count does not reconcile.`)
    }
    const lineTotal = batch.lines.reduce((sum, item) => sum + cents(item.amount), 0)
    const drillDownTotal = batch.entertainers.reduce((sum, item) => sum + cents(item.net), 0)
    if (lineTotal !== drillDownTotal) throw new Error(`${batch.id} line and entertainer totals do not reconcile.`)
  }
}

export function withContractValidation(services: AppServices, adapter: 'fixture' | 'live'): AppServices {
  const list = <T,>(promise: Promise<unknown>, schema: Schema, path: string) =>
    promise.then((value) => parse<T>(value, arrayOf(schema), path, adapter))
  const entity = <T,>(promise: Promise<unknown>, schema: Schema, path: string) =>
    promise.then((value) => parse<T>(value, schema, path, adapter))

  return {
    branches: {
      list: () => list<Branch[]>(services.branches.list(), branchSchema, 'branches.list'),
      updateTarget: (branchId, target) => entity<Branch>(services.branches.updateTarget(branchId, target), branchSchema, 'branches.updateTarget'),
    },
    branchSettings: {
      list: () => list<BranchSetting[]>(services.branchSettings.list(), branchSettingSchema, 'branchSettings.list'),
      update: (branchId, settingId, input) => entity<BranchSetting>(services.branchSettings.update(branchId, settingId, input), branchSettingSchema, 'branchSettings.update'),
    },
    customers: { list: () => list<Customer[]>(services.customers.list(), customerSchema, 'customers.list') },
    approvals: {
      list: () => list<Approval[]>(services.approvals.list(), approvalSchema, 'approvals.list'),
      decide: (id, input) => entity<Approval>(services.approvals.decide(id, input), approvalSchema, 'approvals.decide'),
    },
    tasks: {
      list: () => list<ExecutiveTask[]>(services.tasks.list(), taskSchema, 'tasks.list'),
      create: (input) => entity<ExecutiveTask>(services.tasks.create(input), taskSchema, 'tasks.create'),
      comment: (id, body) => entity<ExecutiveTask>(services.tasks.comment(id, body), taskSchema, 'tasks.comment'),
      setStatus: (id, status) => entity<ExecutiveTask>(services.tasks.setStatus(id, status), taskSchema, 'tasks.setStatus'),
    },
    messaging: {
      list: () => list<MessageThread[]>(services.messaging.list(), messageThreadSchema, 'messaging.list'),
      create: (input) => entity<MessageThread>(services.messaging.create(input), messageThreadSchema, 'messaging.create'),
      open: (threadId) => entity<MessageThread>(services.messaging.open(threadId), messageThreadSchema, 'messaging.open'),
      send: (threadId, body) => entity<MessageThread>(services.messaging.send(threadId, body), messageThreadSchema, 'messaging.send'),
    },
    hermes: {
      daily: () => entity<HermesDailyBriefing>(services.hermes.daily(), hermesDailySchema, 'hermes.daily'),
      monthly: () => entity<HermesMonthlyReview>(services.hermes.monthly(), hermesMonthlySchema, 'hermes.monthly'),
      list: () => list<HermesRecommendation[]>(services.hermes.list(), recommendationSchema, 'hermes.list'),
      open: (id) => entity<HermesRecommendation>(services.hermes.open(id), recommendationSchema, 'hermes.open'),
      act: (id, status) => entity<HermesActionResult>(services.hermes.act(id, status), shape({ recommendation: recommendationSchema, task: optional(taskSchema) }), 'hermes.act'),
      annotate: (id, body) => entity<HermesRecommendation>(services.hermes.annotate(id, body), recommendationSchema, 'hermes.annotate'),
      feedback: (id, input) => entity<HermesRecommendation>(services.hermes.feedback(id, input), recommendationSchema, 'hermes.feedback'),
      openConversation: (id) => entity<MessageThread>(services.hermes.openConversation(id), messageThreadSchema, 'hermes.openConversation'),
    },
    settlements: { list: () => list<SettlementBatch[]>(services.settlements.list(), settlementSchema, 'settlements.list') },
    workforce: { list: () => list<WorkforceReadinessSnapshot[]>(services.workforce.list(), workforceSchema, 'workforce.list') },
    people: {
      listManagers: () => list<ManagerPerformance[]>(services.people.listManagers(), managerSchema, 'people.listManagers'),
      listEmployees: () => list<EmployeePerformance[]>(services.people.listEmployees(), employeeSchema, 'people.listEmployees'),
      openEmployee: (id) => entity<EmployeePerformance>(services.people.openEmployee(id), employeeSchema, 'people.openEmployee'),
    },
    audit: {
      list: () => list<AuditEvent[]>(services.audit.list(), auditEventSchema, 'audit.list'),
      record: (input) => entity<AuditEvent>(services.audit.record(input), auditEventSchema, 'audit.record'),
    },
  }
}
