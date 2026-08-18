import { createContext } from 'react'
import type {
  AppSnapshot,
  ApprovalStatus,
  CreateConversationInput,
  CreateTaskInput,
  ExecutiveTask,
  ExecutiveNotification,
  EmployeePerformance,
  HermesFeedbackInput,
  HermesStatus,
  MessageThread,
  RecordAuditInput,
  TaskStatus,
  UpdateBranchSettingInput,
} from '../domain/types'

export interface ToastMessage {
  id: number
  title: string
  description?: string
  tone?: 'success' | 'danger' | 'neutral'
}

export class ApprovalDecisionError extends Error {
  readonly reconciledStatus?: ApprovalStatus

  constructor(message: string, reconciledStatus?: ApprovalStatus) {
    super(message)
    this.name = 'ApprovalDecisionError'
    this.reconciledStatus = reconciledStatus
  }
}

export interface AppContextValue extends AppSnapshot {
  online: boolean
  notifications: ExecutiveNotification[]
  refreshing: boolean
  refreshError: string | null
  lastRefreshedAt: string
  toast: ToastMessage | null
  refresh(): Promise<void>
  updateTarget(branchId: string, target: number): Promise<void>
  updateBranchSetting(branchId: string, settingId: string, input: UpdateBranchSettingInput): Promise<void>
  decideApproval(id: string, status: Exclude<ApprovalStatus, 'pending'>, reason: string, expectedUpdatedAt: string, overrideValue?: string): Promise<void>
  createTask(input: CreateTaskInput): Promise<ExecutiveTask>
  commentTask(id: string, body: string): Promise<void>
  setTaskStatus(id: string, status: TaskStatus): Promise<void>
  openConversation(threadId: string): Promise<void>
  sendMessage(threadId: string, body: string): Promise<void>
  createConversation(input: CreateConversationInput): Promise<MessageThread>
  openEmployee(id: string): Promise<EmployeePerformance>
  openRecommendation(id: string): Promise<void>
  actOnRecommendation(id: string, status: HermesStatus): Promise<ExecutiveTask | undefined>
  annotateRecommendation(id: string, body: string): Promise<void>
  submitHermesFeedback(id: string, input: HermesFeedbackInput): Promise<void>
  discussRecommendation(id: string): Promise<MessageThread>
  recordAudit(input: RecordAuditInput): Promise<void>
  markNotificationRead(id: string): void
  markAllNotificationsRead(): void
  clearToast(): void
}

export const AppContext = createContext<AppContextValue | null>(null)
