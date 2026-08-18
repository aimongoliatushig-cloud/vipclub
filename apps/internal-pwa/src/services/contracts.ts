import type {
  Approval,
  AuditEvent,
  Branch,
  BranchSetting,
  CreateConversationInput,
  CreateTaskInput,
  Customer,
  DecisionInput,
  EmployeePerformance,
  ExecutiveTask,
  HermesDailyBriefing,
  HermesFeedbackInput,
  HermesMonthlyReview,
  HermesRecommendation,
  HermesStatus,
  ManagerPerformance,
  MessageThread,
  RecordAuditInput,
  SettlementBatch,
  TaskStatus,
  UpdateBranchSettingInput,
  WorkforceReadinessSnapshot,
} from '../domain/types'

export interface BranchService {
  list(): Promise<Branch[]>
  updateTarget(branchId: string, target: number): Promise<Branch>
}

export interface BranchSettingsService {
  list(): Promise<BranchSetting[]>
  update(branchId: string, settingId: string, input: UpdateBranchSettingInput): Promise<BranchSetting>
}

export interface CustomerService {
  list(): Promise<Customer[]>
}

export interface ApprovalService {
  list(): Promise<Approval[]>
  decide(id: string, input: DecisionInput): Promise<Approval>
}

export interface TaskService {
  list(): Promise<ExecutiveTask[]>
  create(input: CreateTaskInput): Promise<ExecutiveTask>
  comment(id: string, body: string): Promise<ExecutiveTask>
  setStatus(id: string, status: TaskStatus): Promise<ExecutiveTask>
}

export interface MessagingService {
  list(): Promise<MessageThread[]>
  create(input: CreateConversationInput): Promise<MessageThread>
  open(threadId: string): Promise<MessageThread>
  send(threadId: string, body: string): Promise<MessageThread>
}

export interface HermesActionResult {
  recommendation: HermesRecommendation
  task?: ExecutiveTask
}

export interface HermesService {
  daily(): Promise<HermesDailyBriefing>
  monthly(): Promise<HermesMonthlyReview>
  list(): Promise<HermesRecommendation[]>
  open(id: string): Promise<HermesRecommendation>
  act(id: string, status: HermesStatus): Promise<HermesActionResult>
  annotate(id: string, body: string): Promise<HermesRecommendation>
  feedback(id: string, input: HermesFeedbackInput): Promise<HermesRecommendation>
  openConversation(id: string): Promise<MessageThread>
}

export interface SettlementService {
  list(): Promise<SettlementBatch[]>
}

export interface PeopleService {
  listManagers(): Promise<ManagerPerformance[]>
  listEmployees(): Promise<EmployeePerformance[]>
  openEmployee(id: string): Promise<EmployeePerformance>
}

export interface WorkforceService {
  list(): Promise<WorkforceReadinessSnapshot[]>
}

export interface AuditService {
  list(): Promise<AuditEvent[]>
  record(input: RecordAuditInput): Promise<AuditEvent>
}

export interface AppServices {
  branches: BranchService
  branchSettings: BranchSettingsService
  customers: CustomerService
  approvals: ApprovalService
  tasks: TaskService
  messaging: MessagingService
  hermes: HermesService
  settlements: SettlementService
  workforce: WorkforceService
  people: PeopleService
  audit: AuditService
}
