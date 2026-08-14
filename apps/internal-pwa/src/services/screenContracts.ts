export type ScreenRequirementId = `R${number}`

export interface ScreenContract {
  id: ScreenRequirementId
  title: string
  route: string
  domain: string
  inputs: string[]
  actions: string[]
  states: string[]
  source: string
  sourceRecord: string
  owner: string
  freshness: string
  permission: string
  audit: string
}

const sharedStates = [
  'loading',
  'ready',
  'empty',
  'error',
  'stale',
  'partial',
  'denied',
  'integration-failure',
  'offline',
] as const

const contract = (
  id: ScreenRequirementId,
  title: string,
  route: string,
  domain: string,
  inputs: string[],
  actions: string[],
  source: string,
  owner: string,
): ScreenContract => ({
  id,
  title,
  route,
  domain,
  inputs,
  actions,
  states: [...sharedStates],
  source,
  sourceRecord: `${domain.toLocaleLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}:record-id`,
  owner,
  freshness: 'Record updatedAt plus demo/live/integration mode and reconciliation state',
  permission: 'Authenticated role permission plus server-enforced branch scope; deny by default',
  audit: actions.length
    ? 'Every state-changing action records actor, role, reason, target, branch, timestamp and correlation ID'
    : 'Read access inherits scoped audit and source provenance; no silent mutation',
})

export const screenContracts: ScreenContract[] = [
  contract('R2', 'CEO командын төв', '/', 'Executive', ['branch scope', 'time window', 'snapshot'], ['open drill-down', 'create task'], 'KPI snapshot fixtures / future Frappe API', 'CEO operations'),
  contract('R3', 'Мэдэгдлийн төв', '/notifications', 'Notification', ['urgency', 'read state', 'target state'], ['mark read', 'open target'], 'Executive notification projection', 'CEO operations'),
  contract('R4', 'Салбарын харьцуулалт', '/branches', 'Branch', ['four branch snapshots', 'KPI definitions'], ['open branch', 'create task'], 'POS + Workforce + CRM projections', 'Operations'),
  contract('R5', 'Салбарын дэлгэрэнгүй', '/branches/:branchId', 'Branch', ['branch ID', 'health drivers', 'trend'], ['create task', 'open message'], 'Branch executive projection', 'Branch manager'),
  contract('R6', 'Салбарын эрүүл мэнд', '/branches/:branchId/health', 'BranchHealth', ['weighted drivers', 'policy version'], ['open evidence'], 'Effective-dated health snapshot', 'Operations'),
  contract('R7', 'Салбарын үйл явдлын мөр', '/branches/:branchId/timeline', 'Audit', ['branch ID', 'event range'], ['open event'], 'Immutable audit events', 'Compliance'),
  contract('R8', 'Борлуулалтын тойм', '/sales', 'Sales', ['branch scope', 'period'], ['open branch', 'open goal'], 'POS sales projection', 'Sales'),
  contract('R9', 'Сарын зорилт', '/sales/goals', 'SalesGoal', ['month', 'branch', 'target'], ['update target'], 'Effective-dated sales goal', 'CEO / Sales'),
  contract('R10', 'Менежерийн үйл ажиллагааны төлөвлөгөө', '/sales/action-plans', 'ActionPlan', ['goal', 'owner', 'actions'], ['review plan', 'return plan'], 'Manager action plan', 'Branch manager'),
  contract('R11', 'Гүйцэтгэлийн түүх', '/sales/history', 'Sales', ['period range', 'branch'], ['compare period'], 'Sales KPI snapshots', 'Sales'),
  contract('R12', 'Харилцагчийн intelligence', '/customers', 'Customer', ['cohort', 'branch', 'membership'], ['open customer', 'open cohort'], 'CRM + eligible POS visit projection', 'Membership'),
  contract('R13', 'Бууралт ба өндөр үнэ цэнэ', '/customers?cohort=declining', 'Customer', ['value band', 'visit trend', 'consent'], ['open customer', 'create outreach task'], 'Customer behavior projection', 'Membership'),
  contract('R14', 'Customer 360', '/customers/:customerId', 'Customer', ['customer ID', 'masked contact', 'visit history'], ['request membership review'], 'Scoped CRM customer projection', 'Membership'),
  contract('R15', 'Outreach хяналт', '/customers/outreach', 'CustomerOutreach', ['consent', 'owner', 'status'], ['assign outreach', 'record result'], 'Consent-scoped outreach activity', 'Membership'),
  contract('R16', 'Ажиллах хүчний бэлэн байдал', '/workforce', 'Workforce', ['scheduled', 'available', 'reserved', 'serving', 'break', 'late', 'absent', 'leave', 'uncovered', 'stale', 'unknown'], ['open shortage', 'create task'], 'Authoritative workforce schedule, availability and check-in projection', 'HR'),
  contract('R17', 'Role coverage', '/workforce/coverage', 'Workforce', ['branch', 'time window', 'role', 'required', 'covered', 'exception evidence'], ['open role gap', 'message manager'], 'Workforce role/time coverage projection with source records', 'HR'),
  contract('R18', 'Ирц', '/workforce/attendance', 'Attendance', ['late', 'absent', 'approved leave', 'source', 'refresh', 'partial state'], ['review exception'], 'Eight-week attendance aggregate projection', 'HR'),
  contract('R19', 'Ажиллах хүчний таамаг', '/workforce/forecast', 'WorkforceForecast', ['14/30 day horizon', 'branch', 'confidence', 'assumptions', 'missing data'], ['create mitigation task'], 'Advisory workforce forecast explicitly separated from authoritative records', 'HR'),
  contract('R20', 'Менежерийн гүйцэтгэл', '/people/managers', 'ManagerPerformance', ['four managers', 'approved metric evidence', 'source', 'freshness'], ['open manager'], 'Explainable reporting projection with no automated disciplinary decision', 'HR / Operations'),
  contract('R21', 'Менежерийн дэлгэрэнгүй', '/people/managers/:managerId', 'ManagerPerformance', ['manager ID', 'source metrics', 'tasks', 'acknowledgements', 'exceptions', 'history'], ['create task', 'open source record'], 'Manager evidence and workflow history projection', 'HR / Operations'),
  contract('R22', 'Ажилтны дэлгэрэнгүй', '/people/employees/:employeeId', 'Employee', ['employee ID', 'approved aggregate fields', 'masked identifier', 'access audit'], ['open authorized detail'], 'Privacy-minimized CEO employee performance projection', 'HR'),
  contract('R23', 'Нэгдсэн зөвшөөрөл', '/approvals', 'Approval', ['type', 'urgency', 'age', 'source', 'history', 'conflict', 'consequence'], ['open approval'], 'Approval workflow projection', 'CEO operations'),
  contract('R24', 'Гишүүнчлэлийн зөвшөөрөл', '/approvals?type=membership', 'Approval', ['calculated level', 'proposal', 'evidence', 'policy state'], ['approve', 'return', 'reject', 'retain', 'authorized override'], 'Membership policy evaluation', 'Membership'),
  contract('R25', 'Rank зөвшөөрөл', '/approvals?type=rank', 'Approval', ['current rank', 'proposal', 'review cycle', 'policy state'], ['approve', 'return', 'reject', 'retain', 'authorized override'], 'Workforce rank review', 'HR'),
  contract('R26', 'Зээлийн зөвшөөрөл', '/approvals?type=loan', 'Approval', ['amount', 'reason', 'policy state'], ['approve', 'return', 'reject'], 'HR / Payroll loan request', 'HR / Finance'),
  contract('R27', 'Action-plan зөвшөөрөл', '/approvals?type=plan', 'Approval', ['goal', 'plan', 'owner'], ['approve', 'return', 'reject'], 'Manager action plan', 'Sales'),
  contract('R28', 'Тооцооны зөвшөөрөл', '/approvals?type=settlement', 'Approval', ['batch', 'exceptions', 'reconciliation'], ['approve', 'return', 'reject'], 'Settlement review batch', 'Finance'),
  contract('R29', 'Тооцооны багцын жагсаалт', '/finance', 'Settlement', ['period', 'status', 'batch'], ['open batch'], 'Settlement batches', 'Finance'),
  contract('R30', 'Тооцооны review', '/finance/:batchId', 'Settlement', ['lines', 'entertainers', 'exceptions'], ['open entertainer', 'send to approval'], 'Reconciled settlement batch', 'Finance'),
  contract('R31', 'Энтертайнер тооцооны handoff', '/finance/:batchId/entertainers', 'Settlement', ['rank', 'branch', 'net', 'exception'], ['open source record'], 'Settlement entertainer lines', 'Finance'),
  contract('R32', 'Төлбөрийн төлөв', '/finance/payments', 'Settlement', ['submission', 'processing', 'failure'], ['retry eligible item', 'open audit'], 'Payment status projection', 'Finance'),
  contract('R33', 'Даалгаврын төв', '/tasks', 'Task', ['status', 'owner', 'priority', 'due date'], ['open task', 'create task'], 'Executive task records', 'CEO operations'),
  contract('R34', 'Даалгавар үүсгэх', '/tasks?create=1', 'Task', ['instruction', 'assignee', 'due date', 'source context'], ['create task'], 'Executive task command', 'CEO operations'),
  contract('R35', 'Даалгаврын thread', '/tasks/:taskId', 'Task', ['task ID', 'messages', 'evidence'], ['comment', 'change status'], 'Task plus immutable audit projection', 'CEO operations'),
  contract('R36', 'Удирдлагын inbox', '/messages', 'Messaging', ['participant', 'scope', 'branch', 'unread', 'delivery', 'linked context', 'sensitivity', 'status'], ['open thread', 'create internal conversation'], 'Scoped management threads with deterministic delivery and lifecycle states', 'CEO operations'),
  contract('R37', 'Харилцан яриа', '/messages/:threadId', 'Messaging', ['participants', 'delivery and read state', 'timestamps', 'attachments', 'business links', 'audit trail'], ['send message', 'create linked task', 'save offline draft'], 'Scoped message thread with retained source evidence', 'CEO operations'),
  contract('R38', 'Нууцлалтай харилцаа', '/messages/:threadId?sensitive=1', 'SensitiveMessaging', ['restricted membership', 'masked participant', 'access and export audit', 'urgency', 'owner', 'retention'], ['send restricted message', 'deny revoked access', 'deny attachment', 'block export'], 'Restricted thread excluded from generic previews, search and Hermes analysis', 'Compliance'),
  contract('R39', 'Hermes өдөр тутмын briefing', '/hermes', 'Hermes', ['branch', 'sales', 'customer', 'workforce', 'task', 'approval', 'exception', 'period', 'source', 'freshness', 'missing data'], ['open authorized source', 'open recommendation'], 'Authorized, scoped and non-authoritative daily read-model rollup', 'Business advisory'),
  contract('R40', 'Hermes сарын review', '/hermes/monthly', 'Hermes', ['target', 'approved plan', 'execution', 'outcome', 'unresolved risk', 'prior recommendation result', 'period', 'source'], ['open source-backed recommendation'], 'Advisory monthly comparison with partial and stale disclosure', 'Business advisory'),
  contract('R41', 'Hermes зөвлөмж', '/hermes/:recommendationId', 'Hermes', ['contributing evidence', 'policy version', 'metric version', 'assumptions', 'uncertainty', 'missing data', 'authorized input summary', 'feedback history'], ['annotate', 'open authorized message', 'snooze', 'dismiss', 'convert safe recommendation to linked task', 'record separate usefulness and accuracy feedback'], 'Advisory recommendation with explicit empty, conflict, stale, low-confidence, unavailable and unsafe-action guards', 'Business advisory'),
  contract('R42', 'Тайлангийн каталог', '/reports', 'Reporting', ['owner', 'purpose', 'source', 'refresh cadence', 'sensitivity', 'export level', 'filters', 'last run', 'empty', 'no access', 'stale', 'failed', 'partial export', 'large result'], ['open authorized report', 'request guarded export'], 'Approved report definitions and explicit execution states', 'Analytics'),
  contract('R43', 'Executive analytics', '/reports/analytics', 'Reporting', ['approved metric', 'period', 'approved dimension', 'definition', 'formula version', 'source', 'freshness', 'permission scope'], ['apply compatible filters', 'save scoped view', 'open masked drill-down', 'request purpose-bound export'], 'Permission-preserving KPI snapshots and definitions', 'Analytics'),
  contract('R44', 'Аудитын тайлан', '/reports/audit', 'Audit', ['actor', 'role', 'branch', 'domain', 'action', 'target', 'reason', 'correlation ID', 'time', 'before', 'after'], ['filter events', 'open linked source'], 'Append-only audit events with linked adjustment and reversal corrections', 'Compliance'),
]

export function validateScreenContracts(contracts: ScreenContract[] = screenContracts): void {
  const expectedIds = Array.from({ length: 43 }, (_, index) => `R${index + 2}`)
  const actualIds = contracts.map((item) => item.id)

  if (new Set(actualIds).size !== actualIds.length) throw new Error('Screen contract IDs must be unique.')
  if (expectedIds.some((id) => !actualIds.includes(id as ScreenRequirementId))) {
    throw new Error('Screen contracts must cover every requirement from R2 through R44.')
  }

  for (const item of contracts) {
    const requiredText = [item.title, item.route, item.domain, item.source, item.sourceRecord, item.owner, item.freshness, item.permission, item.audit]
    if (requiredText.some((value) => !value.trim())) throw new Error(`${item.id} has an incomplete screen contract.`)
    if (!item.inputs.length || !item.states.length) throw new Error(`${item.id} must document inputs and UI states.`)
    if (!sharedStates.every((state) => item.states.includes(state))) throw new Error(`${item.id} is missing a required UI state.`)
  }
}
