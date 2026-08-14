export type ReservationStatus = 'requested' | 'confirmed' | 'arrived' | 'completed' | 'cancelled'

export interface ManagerReservation {
  id: string
  branchId: string
  customerName: string
  maskedPhone: string
  visitAt: string
  partySize: number
  status: ReservationStatus
  source: 'reception' | 'manager' | 'customer'
  entertainerName?: string
  specialRequest?: string
  consentVerified: boolean
  updatedAt: string
}

export interface CreateReservationInput {
  branchId: string
  customerName: string
  phoneLastFour: string
  visitAt: string
  partySize: number
  specialRequest?: string
}

export type MaintenanceStatus = 'reported' | 'assigned' | 'in-progress' | 'submitted' | 'verified' | 'rework'
export type MaintenancePriority = 'normal' | 'urgent'

export interface MaintenanceRequest {
  id: string
  branchId: string
  title: string
  category: 'equipment' | 'facility' | 'safety'
  location: string
  priority: MaintenancePriority
  status: MaintenanceStatus
  description: string
  assignedTo?: string
  dueDate?: string
  result?: string
  evidenceFileName?: string
  managerNote?: string
  createdAt: string
  updatedAt: string
}

export interface CreateMaintenanceInput {
  branchId: string
  title: string
  category: MaintenanceRequest['category']
  location: string
  priority: MaintenancePriority
  description: string
}

export type ComplaintStatus = 'received' | 'triaged' | 'handed-off' | 'resolved'

export interface ManagerComplaint {
  id: string
  branchId: string
  type: 'service' | 'customer' | 'people'
  subject: string
  summary: string
  restricted: boolean
  status: ComplaintStatus
  ownerRole: 'Салбарын менежер' | 'Хүний нөөцийн менежер' | 'CRM менежер'
  receivedAt: string
  updatedAt: string
}

export type ManagerNotificationSeverity = 'info' | 'warning' | 'critical'

export interface ManagerNotification {
  id: string
  branchId: string
  severity: ManagerNotificationSeverity
  category: 'workforce' | 'task' | 'reservation' | 'maintenance' | 'decision'
  title: string
  body: string
  relatedView: 'attendance' | 'tasks' | 'operations' | 'recommendations'
  readAt?: string
  escalationRecordedAt?: string
  createdAt: string
}

export interface FormalNotice {
  id: string
  branchId: string
  title: string
  body: string
  issuedBy: string
  issuedAt: string
  dueDate: string
  audienceIds: string[]
  acknowledgedByIds: string[]
}

export interface CreateFormalNoticeInput {
  branchId: string
  title: string
  body: string
  dueDate: string
  audienceIds: string[]
}

export interface CrmCommunicationRecord {
  id: string
  branchId: string
  customerName: string
  maskedPhone: string
  channel: 'SMS' | 'PWA' | 'Утас'
  purpose: string
  consentState: 'verified' | 'not-required'
  deliveryState: 'delivered' | 'recorded' | 'failed'
  occurredAt: string
}

export interface CrmHandoffRequest {
  id: string
  branchId: string
  title: string
  criteria: string
  reason: string
  status: 'submitted' | 'accepted' | 'closed'
  createdAt: string
}

export interface CreateCrmHandoffInput {
  branchId: string
  title: string
  criteria: string
  reason: string
}

export type RecommendationType = 'entertainer-rank' | 'customer-membership'
export type RecommendationStatus = 'draft' | 'submitted' | 'revision-requested' | 'approved' | 'rejected'

export interface ManagerRecommendation {
  id: string
  branchId: string
  type: RecommendationType
  subjectId: string
  subjectName: string
  currentValue: string
  proposedValue: string
  evidenceSummary: string
  reason: string
  status: RecommendationStatus
  policyNote: string
  createdAt: string
  updatedAt: string
  decisionComment?: string
}

export interface CreateRecommendationInput {
  branchId: string
  type: RecommendationType
  subjectId: string
  subjectName: string
  currentValue: string
  proposedValue: string
  evidenceSummary: string
  reason: string
}

export interface ManagerBusinessSnapshot {
  branchId: string
  refreshedAt: string
  reservations: ManagerReservation[]
  maintenance: MaintenanceRequest[]
  complaints: ManagerComplaint[]
  notifications: ManagerNotification[]
  notices: FormalNotice[]
  communications: CrmCommunicationRecord[]
  crmHandoffs: CrmHandoffRequest[]
  recommendations: ManagerRecommendation[]
}
