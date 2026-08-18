import type { ApprovalStatus, DataMode, SettlementStatus, Severity, TaskPriority, TaskStatus } from '../domain/types'

export const formatMoney = (value: number, suffix = 'сая ₮') =>
  `${new Intl.NumberFormat('mn-MN', { minimumFractionDigits: value < 10 ? 2 : 1, maximumFractionDigits: 2 }).format(value)} ${suffix}`

export const formatPercent = (value: number) => `${value > 0 ? '+' : ''}${value}%`

export const branchTone = (score: number): Severity => (score >= 80 ? 'healthy' : score >= 70 ? 'attention' : 'critical')

export const dataModeLabel: Record<DataMode, string> = {
  demo: 'Demo өгөгдөл',
  live: 'Бодит өгөгдөл',
  pending: 'Интеграц хүлээгдэж байна',
}

export const approvalStatusLabel: Record<ApprovalStatus, string> = {
  pending: 'CEO шийдвэр хүлээж байна',
  approved: 'Батлагдсан',
  returned: 'Хяналтад буцаасан',
  rejected: 'Татгалзсан',
  retained: 'Одоогийн төлөв үлдсэн',
  overridden: 'Эрх бүхий override',
}

export const taskStatusLabel: Record<TaskStatus, string> = {
  assigned: 'Оноосон',
  clarification: 'Тодруулга шаардлагатай',
  acknowledged: 'Хүлээн авсан',
  'in-progress': 'Хийгдэж байна',
  submitted: 'Хяналтад ирсэн',
  rework: 'Дахин ажиллах',
  completed: 'Дууссан',
  overdue: 'Хугацаа хэтэрсэн',
}

export const taskPriorityLabel: Record<TaskPriority, string> = {
  low: 'Бага',
  medium: 'Дунд',
  high: 'Өндөр',
  critical: 'Нэн яаралтай',
}

export const settlementStatusLabel: Record<SettlementStatus, string> = {
  draft: 'Draft',
  'accountant-reviewed': 'Нягтлан хянасан',
  'ceo-required': 'CEO approval required',
  approved: 'Батлагдсан',
  submitted: 'Банканд илгээсэн',
  processing: 'Боловсруулж байна',
  paid: 'Олгосон',
  'partial-failure': 'Partial failure',
}

export const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
