import { StaffApiError, classifyApiFailure } from './runtimePolicy.ts'
import { normalizeRankData } from './rankContract.ts'

export const STAFF_API_FAILURE_EVENT = 'nomad-staff:api-failure'
export const SESSION_EXPIRED_EVENT = 'nomad:session-expired'
export const API_REQUEST_TIMEOUT_MS = 20000

export type AppContext = {
  user: string
  full_name: string
  branch: string
  mode: 'admin' | 'manager' | 'lead' | 'entertainer' | 'employee'
  profile?: string | null
  employee?: string | null
  designation?: string | null
  can_scan_attendance?: boolean
  can_view_guest_service?: boolean
}

export type ServiceGuestEntry = {
  name: string
  customer_name: string
  membership_rank: string
  entered_at: string
  visit_number: number
  service_characteristics: string
}

export type ServiceGuestFeed = {
  branch: string
  work_date: string
  window_start: string
  window_end: string
  entries: ServiceGuestEntry[]
  today_total: number
  visible_fields: string[]
}

export type EmployeeAttendanceStatus = {
  employee: string
  employee_name?: string | null
  branch: string
  work_date: string
  action: 'IN' | 'OUT'
  attendance_mode?: 'arrival_only' | 'arrival_and_departure'
  requires_checkout?: boolean
  attendance_complete?: boolean
  checked_in: boolean
  checked_out: boolean
  checked_in_at?: string | null
  checked_out_at?: string | null
  open: boolean
  latest_checkin?: { name: string; time: string; log_type: 'IN' | 'OUT'; shift?: string | null } | null
  late_after_time?: string
  late_minutes?: number
  shift?: { name: string; shift_type: string; start: string; end: string } | null
}

export type EmployeeAttendanceHistoryDay = {
  work_date: string
  status: 'arrived' | 'late' | 'completed'
  checked_in_at?: string | null
  checked_out_at?: string | null
  late_minutes?: number
  shift?: string | null
}

export type EmployeeAttendanceHistory = {
  employee: string
  branch: string
  days: EmployeeAttendanceHistoryDay[]
}

export type ShiftAssignmentBrief = {
  name: string
  shift_type: string
  start_date: string
  end_date?: string | null
  status?: string
  modified?: string
}

export type FinexScheduleEvidence = {
  source: 'Finex'
  scheduled: boolean
  attendance_type?: number | null
  attendance_name?: string | null
  store_name?: string | null
  synced_at?: string | null
}

export type ManagerScheduleData = {
  branch: string
  window: { from: string; to: string }
  dates: string[]
  shift_types: { name: string; start_time: string; end_time: string }[]
  people: {
    profile?: string | null
    employee: string
    display_name: string
    role_label: string
    member_type: 'Entertainer' | 'Employee'
    identity_state?: 'Confirmed Entertainer Profile' | 'Employee Master'
    rank?: string | null
    days: { date: string; assignment?: ShiftAssignmentBrief | null; imported?: FinexScheduleEvidence | null; schedule_conflict?: boolean; editable: boolean }[]
  }[]
  source_meta?: { authoritative: string; imported: string; imported_rows: number; conflicts: number; entertainer_count?: number; employee_count?: number; unlinked_candidates?: number; unlinked_rows?: number }
  generated_at: string
}

export type ReadinessQueueRow = {
  entertainer: string
  stage_name?: string | null
  employee: string
  branch: string
  shift_assignment: string
  shift_type: string
  readiness_status: 'PENDING' | 'READY' | 'NOT_READY'
  readiness_check?: string | null
  readiness_modified?: string | null
  readiness_supervisor?: string | null
  readiness_checked_at?: string | null
  attendance: { checked_in: boolean; employee_checkin?: string | null; checked_in_at?: string | null }
}

export type ReadinessQueueData = {
  branch: string
  work_date: string
  status: string
  queue: ReadinessQueueRow[]
  summary: { total: number; pending: number; ready: number; not_ready: number }
  access: {
    can_submit: boolean
    mode: 'lead' | 'manager_fallback' | 'manager_read_only' | 'system'
    lead_state: 'on_duty' | 'off' | 'leave' | 'not_configured' | 'unrestricted'
    lead_name?: string | null
    message: string
  }
  meta: { limit: number; cursor: number; next_cursor?: number | null; total: number }
}

export type DailyRoundRow = {
  entertainer: string
  employee: string
  display_name: string
  current_rank?: string | null
  shift_assignment: string
  shift_type: string
  employee_checkin: string
  checked_in_at: string
  rounds: number
  target: number
  completed: boolean
  missing_rounds: number
  projected_penalty: number
  last_recorded_at?: string | null
}

export type DailyRoundsData = {
  branch: string
  work_date: string
  target: number
  penalty_rate: number
  people: DailyRoundRow[]
  summary: { checked_in: number; completed: number; incomplete: number; remaining_rounds: number; projected_penalty: number }
  access: { can_submit: boolean; message: string }
  replayed?: boolean
}

export type LeadEntertainerCandidate = {
  profile: string
  display_name: string
  branch: string
  has_login: boolean
  is_lead: boolean
}

export type BranchAttendanceQR = {
  branch: 'Nomad' | 'Neva' | 'Sapphire' | 'Monarch'
  qr_payload: string
  configured: boolean
  latitude?: number | null
  longitude?: number | null
  radius_meters: number
  active: boolean
  configured_by?: string | null
  configured_at?: string | null
}

export type ManagerRosterRow = {
  profile: string
  display_name: string
  rank: string
  lifecycle_status?: string
  photo?: string | null
  is_demo?: boolean
  profile_change_pending?: boolean
  status: 'checked_in' | 'late' | 'scheduled' | 'off' | 'leave' | 'absent'
  shift?: { name: string; shift_type: string; shift?: { start_time?: string; end_time?: string } } | null
  latest_checkin?: { name: string; time: string; log_type: string } | null
  readiness?: { name: string; result: string; reason?: string; checked_at?: string } | null
  availability?: { name?: string | null; status: AvailabilityStatus; occurred_at?: string | null; note?: string | null }
}

export type ManagerDashboard = {
  branch: string
  date: string
  summary: {
    total: number; scheduled: number; on_shift: number; checked_in: number; late: number; absent: number; leave: number; off: number
    available: number; reserved: number; working: number; break: number
    pending_readiness: number; pending_leave: number; pending_corrections: number; pending_profile_changes: number
  }
  roster: ManagerRosterRow[]
  meta?: { api_version: string; generated_at: string; limit: number; cursor: number; next_cursor?: number | null; total: number }
}

export type ManagerSettings = {
  branch: string
  sales: {
    weight: number
    full_score_amount: number
    configured: boolean
    updated_by?: string | null
    updated_at?: string | null
  }
  attendance: {
    late_after_time: string
    updated_by?: string | null
    updated_at?: string | null
  }
  modified: string
  replayed?: boolean
}

export type EntertainerDashboard = {
  profile: { name: string; employee_name?: string; stage_name?: string; branch: string; current_rank?: string; current_points?: number; profile_photo?: string | null; is_demo?: boolean; daily_rank?: DailyRankSnapshot | null }
  shift?: { name: string; shift_type: string; shift?: { start_time?: string; end_time?: string } } | null
  latest_checkin?: { name: string; time: string; log_type: string } | null
  attendance?: { checked_in: boolean; checked_out: boolean; open: boolean; work_date: string; active_window: boolean }
  readiness?: { name: string; result: string; reason?: string } | null
  attention_items?: EntertainerAttentionItem[]
  next_reservation?: { name: string; starts_at: string; ends_at?: string; status: string; party_size?: number; venue?: string; customer_alias: string } | null
  week: { start: string; end: string; days: WeekScheduleDay[] }
  work_summary: { scheduled_days: number; active_deduction: number; late_minutes: number; leave_used: number; leave_remaining: number; stage_rounds_completed?: number }
}

export type EntertainerAttentionItem = {
  key: string
  priority: number
  title: string
  detail: string
  value?: string | null
  source_state: 'verified' | 'demo' | 'unresolved' | 'inferred'
  source_label: string
}

export type StaffNotification = {
  name: string
  subject: string
  message: string
  created_at: string
  read: boolean
  document_type?: string | null
  document_name?: string | null
}

export type StaffNotificationData = {
  notifications: StaffNotification[]
  unread_count: number
}

export type RankData = {
  scoring_date: string | null
  data_provenance: 'VERIFIED' | 'DEMO' | 'UNRESOLVED'
  demo_batch: string | null
  score: number | null
  daily_score: number | null
  counted_days: number
  score_basis: 'attendance_day_career_average'
  score_status: 'complete' | 'incomplete'
  effective_rank: string
  effective_rank_label: string
  effective_from: string | null
  payout_percent: number
  calculated_next_rank: string | null
  calculated_next_rank_label: string | null
  calculated_next_payout_percent: number | null
  next_effective_from: string | null
  next_rank: string | null
  next_rank_label: string | null
  next_rank_threshold: number | null
  missing_score: number | null
  missing_components: DailyRankComponentKey[]
  components: {
    key: DailyRankComponentKey
    label: string
    score: number | null
    weight: number
    contribution: number | null
    data_status: 'verified' | 'missing' | 'not_applicable'
    target_status: 'met' | 'not_met' | 'unknown'
    source_label: string
  }[]
  history: {
    scoring_date: string | null
    score: number | null
    score_status: 'complete' | 'incomplete'
    calculated_rank: string | null
    calculated_rank_label: string | null
    next_day_effective_rank: string
    next_day_effective_rank_label: string
    data_provenance: 'VERIFIED' | 'DEMO' | 'UNRESOLVED'
  }[]
  rules: {
    rank: string
    label: string
    minimum_score: number
    maximum_score: number
    maximum_inclusive: boolean
    payout_percent: number
  }[]
}

export type RankIncomeComparison = {
  selected_month: string
  period?: { from: string; to: string; calculated_through: string; can_next: boolean }
  scoring_date?: string | null
  data_provenance?: 'DEMO'
  comparison_mode?: 'daily_rank_calendar_period'
  data_state: 'verified' | 'insufficient'
  reason?: string | null
  deduction_status?: 'available' | 'unavailable'
  service_count?: number
  baseline?: {
    rank?: string | null
    percent?: number | null
    service_income: number
    deduction?: number | null
    calculated_salary?: number | null
  }
  scenario?: {
    rank?: string | null
    percent?: number | null
    service_income: number
    deduction?: number | null
    calculated_salary?: number | null
  }
  delta?: number | null
  mutates_payroll: false
}

export type DailyRankComponentKey = 'attendance' | 'customer_complaints' | 'sales' | 'entertaining_skill' | 'cleanliness_beauty' | 'shift_effort' | 'personal_development' | 'entertainer_attitude'

export type DailyRankSnapshot = {
  name: string
  revision: number
  scoring_date: string
  status: 'Complete' | 'Incomplete' | 'Invalid'
  weighted_score?: number | null
  displayed_score?: number | null
  daily_score?: number | null
  career_average_score?: number | null
  counted_days?: number
  score_basis?: 'attendance_day_career_average'
  calculated_rank?: string | null
  threshold_interval?: { minimum: number; maximum: number; minimum_inclusive: boolean; maximum_inclusive: boolean } | null
  approved_rank?: string | null
  change_state: 'No Change' | 'Recommended Change' | 'Incomplete'
  missing_components: DailyRankComponentKey[]
  components: {
    component: DailyRankComponentKey
    score?: number | null
    weight: number
    contribution?: number | null
    status: 'verified' | 'missing' | 'excluded'
    source?: { mode?: string; records?: string[]; [key: string]: unknown }
  }[]
  policy?: string | null
  policy_version?: string | null
  calculated_at?: string | null
}

export type LoanOverview = {
  policy: { status: 'Configuration Required' | 'Active'; request_enabled: boolean; message: string; amount_step?: number; repayment_min?: number; repayment_max?: number; repayment_step?: number; repayment_default?: number; interest_percent?: number }
  evidence: {
    employment_type?: string | null
    branch: string
    current_rank: string
    tenure_days?: number | null
    verified_income: number
    income_window: { from: string; to: string }
    verified_bill_count: number
    outstanding_balance?: number | null
    income_months?: { month: string; income: number; service_count: number; bill_count: number }[]
    three_month_average?: number
    loan_multiplier?: number
    maximum_amount?: number
    typical_three_day_income?: number
    blocking_reasons?: string[]
  }
  required_decisions: string[]
  requests?: { name: string; requested_at: string; requested_amount: number; repayment_rate: number; status: string; purpose: string; estimated_completion_date?: string | null }[]
}

export type LoanTermsAcceptance = {
  accepted_terms: boolean
  terms_version: string
}

export const ENTERTAINER_LOAN_TERMS_VERSION = 'entertainer-loan-v1'

export type FinexEntertainerSummary = {
  window: { from: string; to: string }
  selected_month?: string
  current_month_income: number
  net_income: number
  gross_sales?: number
  points: number
  point_rule_mnt: number
  service_count: number
  bill_count: number
  linked_customer_count: number
  linked_customer_bill_count: number
  repeat_customer_count: number
  months: { month: string; income: number; services: number; bills: number }[]
  days?: { date: string; income: number; cumulative_income: number }[]
  data_state?: 'verified' | 'imported' | 'demo'
  recent_services: {
    key: string
    date: string
    service: string
    amount: number
    service_total?: number
    percent: number
    raw_amount?: number
    raw_percent?: number
    allocation_count?: number
    payout_rank?: string
    rate_source?: 'rank_policy' | 'finex_allocation'
    previous_percent?: number | null
    percent_change?: number | null
  }[]
  last_synced_at?: string | null
  payout_policy?: {
    rank: string
    percent: number
    effective_from?: string | null
    source: string
    applies_to: 'table_service'
  }
  quality: {
    verified: boolean
    customer_linkage_verified: boolean
    skipped_inconsistent_items: number
    skipped_malformed_bills: number
    rank_policy_services?: number
    finex_allocation_services?: number
    rank_policy_mismatches?: number
  }
}

export type WorkforceProfile = {
  name: string
  employee: string
  employee_name?: string
  stage_name?: string
  branch: string
  employment_type?: string
  lifecycle_status?: string
  skills?: string
  languages?: string
  service_tags?: string
  style_tags?: string
  profile_photo?: string | null
  media_consent_status?: string
  current_rank?: string
	approved_rank?: string
	daily_rank?: DailyRankSnapshot | null
  current_points?: number
  is_demo?: boolean
  modified?: string
}

export type ProfileChangeValues = Pick<WorkforceProfile, 'stage_name' | 'skills' | 'languages' | 'service_tags' | 'style_tags' | 'profile_photo'>

export type EditableProfileInput = ProfileChangeValues & {
  media_consent_status: 'Granted' | 'Denied' | 'Revoked'
  expected_modified?: string
}

export type ProfileChangeRequest = {
  name: string
  entertainer: string
  branch: string
  status: 'Pending' | 'Approved' | 'Rejected' | 'Withdrawn'
  requested_at: string
  requested_by?: string
  decided_at?: string | null
  decided_by?: string | null
  decision_reason?: string | null
  modified: string
  base_profile_modified?: string
  current_profile_modified?: string
  changed_fields: string[]
  changes: { field: keyof ProfileChangeValues; before?: string | null; after?: string | null }[]
  current?: ProfileChangeValues
  proposed?: ProfileChangeValues
}

export type EditableProfileData = {
  profile: WorkforceProfile
  pending_request?: ProfileChangeRequest | null
}

export type WeekScheduleDay = {
  date: string
  assignment?: string | null
  shift_type?: string | null
  start_time?: string | null
  end_time?: string | null
  imported?: FinexScheduleEvidence | null
  schedule_conflict?: boolean
}

export type PersonalScheduleWeek = {
  week: { start: string; end: string; days: WeekScheduleDay[] }
  attended_dates: string[]
}

export type WorkforceWorkspace = {
  branch?: string
  profile: WorkforceProfile
  performance?: FinexEntertainerSummary | null
  week: { start: string; end: string; days: WeekScheduleDay[] }
  attendance: { name: string; time: string; log_type: 'IN' | 'OUT'; shift?: string | null }[]
  penalties: (AttendancePenalty & { rate: number; status: 'Pending Review' | 'Approved' | 'Rejected' | 'Reversed'; modified: string; decided_by?: string | null; decided_at?: string | null; decision_reason?: string | null })[]
  leave_requests: Pick<EmergencyLeaveRequest, 'name' | 'leave_date' | 'status' | 'requested_at' | 'reason' | 'decision_reason'>[]
  summary: { scheduled_days: number; attendance_events: number; late_minutes: number; active_deduction: number }
  manager_controls?: {
    availability: { name?: string | null; status: AvailabilityStatus; previous_event?: string | null; previous_status?: AvailabilityStatus | null; previous_version?: number; state_version: number; occurred_at?: string | null; note?: string | null; actor?: string | null }
    availability_options: AvailabilityStatus[]
    daily_rank?: DailyRankSnapshot | null
  }
  meta?: { api_version: string; generated_at: string; profile_version?: string }
}

export type AttendanceScanResult = {
  accepted: boolean
  result: 'Accepted' | 'Duplicate' | 'Denied'
  reason?: string
  already_checked_in?: boolean
  checked_out?: boolean
  already_recorded?: boolean
  attendance_action?: 'IN' | 'OUT'
  branch?: string
  distance_meters?: number
  checkin?: { name: string; time: string; log_type: string }
  requires_checkout?: boolean
}

export type AttendancePolicy = {
  absence_deduction: number
  late_deduction_per_minute: number
  same_day_request_deadline: string
  request_deadline_basis?: 'previous_day'
  emergency_leave_monthly_limit: number
  hourly_leave_arrival_deadline: string
  timezone: string
}

export type EmergencyLeaveRequest = {
  name: string
  entertainer?: string | null
  employee: string
  branch: string
  display_name?: string
  leave_date: string
  to_date?: string | null
  leave_type?: string | null
  source_type?: 'Emergency Leave' | 'Leave Application'
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled'
  requested_at: string
  reason: string
  decision_reason?: string | null
  decided_by?: string | null
  decided_at?: string | null
  modified: string
}

export type TeamClimateCategory = 'Positive' | 'Concern' | 'Support'

export type TeamClimateCandidate = {
  profile: string
  display_name: string
  rank?: string | null
}

export type TeamClimateCandidates = {
  branch: string
  people: TeamClimateCandidate[]
  meta: { total: number }
}

export type RequestHubKind = 'leave' | 'attendance_correction' | 'profile_change' | 'team_feedback'

export type RequestHubStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'withdrawn'
  | 'submitted'

export type RequestHubItem = {
  id: string
  kind: RequestHubKind
  status: RequestHubStatus
  submitted_at: string
  title: string
  detail?: string | null
  decision_reason?: string | null
  metadata?: Record<string, string | number | boolean | null | undefined>
}

export type RequestHubData = {
  summary: {
    pending_count: number
    resolved_count: number
    submitted_count: number
    total_count: number
  }
  items: RequestHubItem[]
  next_cursor?: string | null
}

export type AttendancePenalty = {
  name: string
  attendance_date: string
  penalty_type: 'Late' | 'Absence' | 'Stage Round'
  late_minutes: number
  missed_rounds?: number
  amount: number
  reason: string
}

export type LeavePolicyData = {
  selected_month?: string
  policy: AttendancePolicy
  quota: { used: number; remaining: number }
  day_leave_types?: string[]
  requests: EmergencyLeaveRequest[]
  penalties: AttendancePenalty[]
}

export type RosterCandidate = {
  name: string
  finex_dancer_id: string
  dancer_name: string
  dancer_nickname: string
  inferred_branch: string
  observed_branches: string
  bill_count: number
  first_seen: string | null
  last_seen: string | null
  suggested_classification: 'Entertainer' | 'Staff' | 'Review'
  review_status: 'Pending' | 'Entertainer' | 'Staff' | 'Inactive'
  review_note?: string | null
  reviewed_by?: string | null
  reviewed_at?: string | null
  linked_profile?: string | null
  modified: string
}

export type RosterCandidateData = {
  branch: string
  status: 'Pending' | 'Entertainer' | 'Staff' | 'Inactive' | 'All'
  summary: { total: number; pending: number; entertainer: number; staff: number; inactive: number }
  candidates: RosterCandidate[]
  profiles: {
    name: string
    employee: string
    employee_name?: string | null
    stage_name?: string | null
    current_rank?: string | null
    lifecycle_status?: string | null
  }[]
  meta: { limit: number; cursor: number; next_cursor: number | null; total: number }
}

export type AvailabilityStatus = 'Unavailable' | 'Available' | 'Scheduled' | 'Reserved' | 'Working' | 'Break' | 'Leave'

export type AttendanceCorrectionRequest = {
  name: string
  entertainer: string
  employee: string
  branch: string
  display_name?: string
  attendance_date: string
  correction_type: 'Check-in' | 'Check-out'
  requested_time: string
  reason: string
  status: 'Pending' | 'Approved' | 'Rejected'
  requested_at: string
  decided_by?: string | null
  decided_at?: string | null
  decision_reason?: string | null
  shift_assignment?: string | null
  shift_start?: string | null
  shift_end?: string | null
  proposed_at?: string | null
  original_checkin?: string | null
  original_time?: string | null
  original_checkin_modified?: string | null
  applied_checkin?: string | null
  reversed_penalties?: string | null
  penalties?: { name: string; penalty_type: 'Late' | 'Absence'; amount: number }[]
  review_blocked_reason?: string | null
  modified: string
}

export type WorkdayData = {
  date: string
  profile: { name: string; display_name: string; branch: string }
  shift?: { name: string; shift_type: string; shift?: { start_time?: string; end_time?: string } } | null
  attendance: { checked_in: boolean; checked_out: boolean; open: boolean; attendance_mode: 'arrival_only'; requires_checkout: false; attendance_complete: boolean; events: { name: string; time: string; log_type: 'IN' | 'OUT'; shift?: string | null }[] }
  availability: { name?: string | null; status: AvailabilityStatus; previous_event?: string | null; previous_status?: AvailabilityStatus | null; previous_version?: number; state_version: number; occurred_at?: string | null; note?: string | null; allowed_next: ('Available' | 'Unavailable')[] }
  summary: { verified_minutes: number; completed_days: number; arrival_days: number; completed_services: number }
  correction_requests: AttendanceCorrectionRequest[]
}

type RequestBehavior = {
  signalAccessFailure?: boolean
  invalidCredentialsMessage?: boolean
  signal?: AbortSignal
}

type ApiFailureEventDetail = {
  method: string
  error: ApiRequestError
}

export type ApiRequestError = StaffApiError & Readonly<{
  exc_type?: string
  session_expired?: boolean
}>

type FrappePayload = Record<string, unknown>

let sessionExpiredEventDispatched = false

function payloadRecord(value: unknown): FrappePayload {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as FrappePayload
    : {}
}

function payloadExcType(payload: FrappePayload): string | undefined {
  return typeof payload.exc_type === 'string' && payload.exc_type.trim()
    ? payload.exc_type.trim()
    : undefined
}

function payloadSessionExpired(payload: FrappePayload): boolean | undefined {
  if (!Object.hasOwn(payload, 'session_expired')) return undefined
  const value = payload.session_expired
  return value === true || value === 1 || value === '1' || value === 'true'
}

function withFrappeMetadata(error: StaffApiError, payload: FrappePayload): ApiRequestError {
  const excType = payloadExcType(payload)
  const sessionExpired = payloadSessionExpired(payload)
  if (excType !== undefined) Object.defineProperty(error, 'exc_type', { enumerable: true, value: excType })
  if (sessionExpired !== undefined) Object.defineProperty(error, 'session_expired', { enumerable: true, value: sessionExpired })
  return error as ApiRequestError
}

function emitApiFailure(method: string, error: ApiRequestError, enabled = true): void {
  if (!enabled) return
  const detail: ApiFailureEventDetail = { method, error }
  if (error.kind === 'session-expired') {
    if (!sessionExpiredEventDispatched) {
      sessionExpiredEventDispatched = true
      window.dispatchEvent(new CustomEvent<ApiFailureEventDetail>(SESSION_EXPIRED_EVENT, { detail }))
    }
    return
  }
  if (error.kind === 'permission-denied') {
    window.dispatchEvent(new CustomEvent<ApiFailureEventDetail>(STAFF_API_FAILURE_EVENT, { detail }))
  }
}

function apiErrorFrom(
  method: string,
  payload: FrappePayload,
  options: { status?: number; cause?: unknown; aborted?: boolean; behavior?: RequestBehavior } = {},
): ApiRequestError {
  if (options.behavior?.invalidCredentialsMessage && options.status === 401) {
    return withFrappeMetadata(new StaffApiError('server', {
      status: options.status,
      message: 'Утасны дугаар эсвэл нууц үг буруу байна.',
      cause: options.cause,
    }), payload)
  }
  const sessionExpired = payloadSessionExpired(payload)
  const failure = classifyApiFailure({
    status: options.status,
    payload,
    cause: options.cause,
    aborted: options.aborted,
    sessionExpired,
    online: navigator.onLine,
  })
  const useServerMessage = failure.kind === 'server'
    && Boolean(failure.serverMessage)
    && Boolean(options.status && options.status < 500)
  const error = withFrappeMetadata(new StaffApiError(failure.kind, {
    status: failure.status,
    message: useServerMessage ? failure.serverMessage : failure.message,
    serverMessage: failure.serverMessage,
    cause: options.cause,
  }), payload)
  emitApiFailure(method, error, options.behavior?.signalAccessFailure !== false)
  return error
}

type JsonRequestResult = {
  response: Response
  payload: FrappePayload
}

async function fetchFrappeJson(
  method: string,
  url: URL | string,
  init: RequestInit,
  behavior: RequestBehavior = {},
): Promise<JsonRequestResult> {
  const controller = new AbortController()
  const abortFromCaller = () => controller.abort(behavior.signal?.reason)
  if (behavior.signal?.aborted) abortFromCaller()
  else behavior.signal?.addEventListener('abort', abortFromCaller, { once: true })
  const timeout = window.setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS)
  let response: Response
  try {
    response = await fetch(url, {
      ...init,
      credentials: 'include',
      cache: 'no-store',
      signal: controller.signal,
    })
  } catch (error) {
    throw apiErrorFrom(method, {}, {
      cause: error,
      aborted: error instanceof DOMException && error.name === 'AbortError',
      behavior,
    })
  } finally {
    window.clearTimeout(timeout)
    behavior.signal?.removeEventListener('abort', abortFromCaller)
  }

  const payload = payloadRecord(await response.json().catch(() => ({})))
  if (!response.ok || payload.exc) {
    throw apiErrorFrom(method, payload, { status: response.status, behavior })
  }
  return { response, payload }
}

async function request<T>(
  method: string,
  args: Record<string, unknown> = {},
  httpMethod: 'GET' | 'POST' = 'GET',
  behavior: RequestBehavior = {},
): Promise<T> {
  const prefix = window.location.pathname.startsWith('/staff') ? '/staff-api' : '/api'
  const url = new URL(`${prefix}/method/${method}`, window.location.origin)
  const options: RequestInit = { method: httpMethod, headers: {} }
  if (httpMethod === 'GET') {
    Object.entries(args).forEach(([key, value]) => url.searchParams.set(key, String(value)))
    url.searchParams.set('_ts', String(Date.now()))
  } else {
    options.headers = { 'Content-Type': 'application/x-www-form-urlencoded' }
    options.body = new URLSearchParams(Object.entries(args).map(([key, value]) => [key, String(value)]))
  }
  const { payload } = await fetchFrappeJson(method, url, options, behavior)
  if (method === 'login') sessionExpiredEventDispatched = false
  return payload.message as T
}

async function uploadProfilePhoto(file: File): Promise<string> {
  const prefix = window.location.pathname.startsWith('/staff') ? '/staff-api' : '/api'
  const body = new FormData()
  body.set('file', file)
  body.set('is_private', '1')
  const method = 'upload_file'
  const { response, payload } = await fetchFrappeJson(method, `${prefix}/method/${method}`, {
    method: 'POST',
    body,
  })
  const message = payloadRecord(payload.message)
  if (typeof message.file_url !== 'string' || !message.file_url) {
    throw apiErrorFrom(method, {
      exc_type: 'InvalidUploadResponse',
      message: 'Зураг байршуулахад алдаа гарлаа.',
    }, { status: response.status })
  }
  return message.file_url
}

export function idempotencyKey(scope: string): string {
  const value = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${scope}:${value}`
}

export interface ManagementSessionProbe {
  authenticated: boolean
  role?: 'CEO' | 'Branch Manager'
}

export interface AppEntryProbe {
  authenticated: boolean
  destination: 'staff' | 'manager' | 'vip-entry'
}

export const api = {
  login: (usr: string, pwd: string) => request('login', { usr, pwd }, 'POST', { signalAccessFailure: false, invalidCredentialsMessage: true }),
  logout: () => request('logout', {}, 'POST', { signalAccessFailure: false }),
  changePassword: (current_password: string, new_password: string) => request<{ changed: true }>('nomad_vip.api.profile.change_own_password', {
    current_password,
    new_password,
  }, 'POST'),
  context: () => request<AppContext>('nomad_vip.api.workforce.get_context', {}, 'GET', { signalAccessFailure: false }),
  appEntry: () => request<AppEntryProbe>('nomad_vip.api.management.get_app_entry', {}, 'GET', { signalAccessFailure: false }),
  managementSession: () => request<ManagementSessionProbe>('nomad_vip.api.management.get_session', {}, 'GET', { signalAccessFailure: false }),
  managerDashboard: (filters: { query?: string; status?: string } = {}) => request<ManagerDashboard>('nomad_vip.api.workforce.get_manager_dashboard', {
    limit: 100,
    query: filters.query || '',
    status: filters.status || '',
  }),
  managerSettings: () => request<ManagerSettings>('nomad_vip.api.manager_settings.get_manager_settings'),
  updateManagerSettings: (input: { sales_full_score_amount: number; late_after_time: string; reason: string; expected_modified?: string }, requestKey = idempotencyKey('manager-settings')) => request<ManagerSettings>('nomad_vip.api.manager_settings.update_manager_settings', {
    ...input,
    expected_modified: input.expected_modified || '',
    idempotency_key: requestKey,
  }, 'POST'),
  serviceGuestFeed: (branch: string) => request<ServiceGuestFeed>('nomad_vip.api.entry.get_service_entry_feed', { branch, limit: 50 }),
  managerSchedule: (start_date: string, days = 7) => request<ManagerScheduleData>('nomad_vip.api.schedule.get_manager_schedule', { start_date, days }),
  setManagerSchedule: (input: { employee_name: string; profile_name?: string | null; work_date: string; shift_type?: string; reason: string; expected_assignment?: string | null; expected_modified?: string | null }, requestKey = idempotencyKey('manager-schedule')) => request<{ assignment?: ShiftAssignmentBrief | null; previous_assignment?: ShiftAssignmentBrief | null; replayed?: boolean }>('nomad_vip.api.schedule.set_manager_schedule', {
    ...input,
    profile_name: input.profile_name || '',
    shift_type: input.shift_type || '',
    expected_assignment: input.expected_assignment || '',
    expected_modified: input.expected_modified || '',
    idempotency_key: requestKey,
  }, 'POST'),
  readinessQueue: (status: 'All' | 'Pending' | 'Ready' | 'Not_Ready' = 'All', work_date = '') => request<ReadinessQueueData>('nomad_vip.api.supervisor.get_readiness_queue', { status, work_date, limit: 100 }),
  submitReadiness: (input: { entertainer: string; shift_assignment: string; result: 'READY' | 'NOT_READY'; reason?: string; employee_checkin?: string | null }, requestKey = idempotencyKey('lead-readiness')) => request('nomad_vip.api.supervisor.submit_readiness', {
    ...input,
    reason: input.reason || '',
    employee_checkin: input.employee_checkin || '',
    idempotency_key: requestKey,
  }, 'POST'),
  dailyRounds: (work_date = '') => request<DailyRoundsData>('nomad_vip.api.stage_rounds.get_daily_rounds', { work_date }),
  recordDailyRound: (entertainer: string, work_date: string, requestKey = idempotencyKey('lead-stage-round')) => request<DailyRoundsData>('nomad_vip.api.stage_rounds.record_daily_round', {
    entertainer,
    work_date,
    idempotency_key: requestKey,
  }, 'POST'),
  leadEntertainerCandidates: (branch: BranchAttendanceQR['branch']) => request<{ branch: string; people: LeadEntertainerCandidate[] }>('nomad_vip.api.admin.get_lead_entertainer_candidates', { branch }),
  setLeadEntertainer: (profile_name: string, enabled: boolean, reason: string, requestKey = idempotencyKey('admin-lead-role')) => request<{ person: LeadEntertainerCandidate; replayed?: boolean }>('nomad_vip.api.admin.set_lead_entertainer', { profile_name, enabled: enabled ? 1 : 0, reason, idempotency_key: requestKey }, 'POST'),
  entertainerDashboard: () => request<EntertainerDashboard>('nomad_vip.api.entertainer.get_dashboard'),
  myNotifications: (limit = 20) => request<StaffNotificationData>('nomad_vip.api.notifications.get_my_notifications', { limit }),
  markMyNotificationsRead: (names: string[]) => request<{ updated: number }>('nomad_vip.api.notifications.mark_my_notifications_read', { names: JSON.stringify(names) }, 'POST'),
  entertainerWorkspace: () => request<WorkforceWorkspace>('nomad_vip.api.entertainer.get_workspace'),
  entertainerSchedule: (week_start = '') => request<PersonalScheduleWeek>('nomad_vip.api.entertainer.get_my_schedule', { week_start }),
  editableProfile: () => request<EditableProfileData>('nomad_vip.api.profile.get_editable_profile'),
  uploadProfilePhoto,
  updateEditableProfile: (input: EditableProfileInput) => request<{ profile: WorkforceProfile; replayed?: boolean }>('nomad_vip.api.profile.update_editable_profile', {
    ...input,
    expected_modified: input.expected_modified || '',
    idempotency_key: idempotencyKey('profile-update'),
  }, 'POST'),
  submitProfileChangeRequest: (input: ProfileChangeValues & { expected_modified?: string }, requestKey = idempotencyKey('profile-change-request')) => request<{ request: ProfileChangeRequest; profile: WorkforceProfile; replayed?: boolean }>('nomad_vip.api.profile.submit_profile_change_request', {
    ...input,
    expected_modified: input.expected_modified || '',
    idempotency_key: requestKey,
  }, 'POST'),
  setMediaConsent: (status: 'Granted' | 'Denied' | 'Revoked', consent_version: string, expected_modified?: string, requestKey = idempotencyKey('media-consent')) => request<{ profile: WorkforceProfile; replayed?: boolean }>('nomad_vip.api.profile.set_media_consent', {
    status,
    consent_version,
    expected_modified: expected_modified || '',
    idempotency_key: requestKey,
  }, 'POST'),
  managerProfileChangeRequests: (status: ProfileChangeRequest['status'] | 'All' = 'Pending', cursor = 0, limit = 20) => request<{ branch: string; requests: ProfileChangeRequest[]; meta: { limit: number; cursor: number; next_cursor?: number | null; total: number } }>('nomad_vip.api.profile.get_manager_profile_change_requests', {
    status,
    cursor,
    limit,
  }),
  reviewProfileChangeRequest: (request_name: string, decision: 'Approved' | 'Rejected', reason: string, expected_modified: string, expected_profile_modified: string, requestKey = idempotencyKey('profile-change-review')) => request<{ request: ProfileChangeRequest; profile?: WorkforceProfile; replayed?: boolean }>('nomad_vip.api.profile.review_profile_change_request', {
    request_name,
    decision,
    reason,
    expected_modified,
    expected_profile_modified,
    idempotency_key: requestKey,
  }, 'POST'),
  managerEntertainerDetail: (profile_name: string) => request<WorkforceWorkspace>('nomad_vip.api.workforce.get_manager_entertainer_detail', { profile_name }),
  managerOverrideAvailability: (profile_name: string, status: AvailabilityStatus, reason: string, expected_event?: string | null, expected_version = 0, request_key?: string) => request<{ event: { name?: string | null; status: AvailabilityStatus; state_version: number; occurred_at?: string | null; note?: string | null; actor?: string | null }; previous_status?: AvailabilityStatus; replayed?: boolean }>('nomad_vip.api.workforce.manager_override_availability', {
    profile_name,
    status,
    reason,
    expected_event: expected_event || '',
    expected_version,
    idempotency_key: request_key || idempotencyKey('manager-availability-override'),
  }, 'POST'),
  decidePenalty: (penalty_name: string, decision: 'Approved' | 'Rejected', reason: string, expected_modified?: string) => request<{ name: string; status: string; decided_at?: string; replayed?: boolean }>('nomad_vip.api.attendance_policy.decide_penalty', {
    penalty_name,
    decision,
    reason,
    expected_modified: expected_modified || '',
    idempotency_key: idempotencyKey('penalty-decision'),
  }, 'POST'),
  rank: async () => normalizeRankData(await request<unknown>('nomad_vip.api.entertainer.get_rank')),
  rankIncomeComparison: (period_date = '') => request<RankIncomeComparison>(
    'nomad_vip.api.rank_income_comparison.get_rank_income_comparison',
    period_date ? { period_date } : {},
  ),
  loanOverview: () => request<LoanOverview>('nomad_vip.api.entertainer.get_loan_overview'),
  submitLoanRequest: (requested_amount: number, repayment_rate: number, purpose: string, consent: LoanTermsAcceptance) => request<{ request: NonNullable<LoanOverview['requests']>[number]; replayed?: boolean }>('nomad_vip.api.entertainer.submit_loan_request', {
    requested_amount,
    repayment_rate,
    purpose,
    accepted_terms: consent.accepted_terms ? 1 : 0,
    terms_version: consent.terms_version,
    idempotency_key: idempotencyKey('loan-request'),
  }, 'POST'),
  finexIncome: (month = '') => request<FinexEntertainerSummary>('nomad_vip.api.entertainer_finex.get_finex_summary', month ? { month } : {}),
  myAttendanceStatus: () => request<EmployeeAttendanceStatus>('nomad_vip.api.attendance.get_my_attendance_status'),
  myAttendanceHistory: (limit = 14) => request<EmployeeAttendanceHistory>('nomad_vip.api.attendance.get_my_attendance_history', { limit }),
  scanBranchQR: (qr_payload: string, latitude: number, longitude: number, accuracy: number, log_type: 'AUTO' | 'IN' | 'OUT' = 'AUTO', signal?: AbortSignal) => request<AttendanceScanResult>('nomad_vip.api.attendance.scan_branch_qr', { qr_payload, latitude, longitude, accuracy, log_type }, 'POST', { signal }),
  branchAttendanceQR: (branch: BranchAttendanceQR['branch']) => request<BranchAttendanceQR>('nomad_vip.api.attendance.get_branch_qr', { branch }),
  configureBranchAttendanceLocation: (branch: BranchAttendanceQR['branch'], latitude: number, longitude: number, radius_meters: number) => request<BranchAttendanceQR>('nomad_vip.api.attendance.configure_branch_location', { branch, latitude, longitude, radius_meters }, 'POST'),
  leavePolicy: (month = '') => request<LeavePolicyData>('nomad_vip.api.attendance_policy.get_leave_policy', month ? { month } : {}),
  submitEmergencyLeave: (leave_date: string, reason: string) => request<{ request: EmergencyLeaveRequest; quota: { used: number; remaining: number }; replayed?: boolean }>('nomad_vip.api.attendance_policy.submit_emergency_leave', { leave_date, reason, idempotency_key: idempotencyKey('leave-create') }, 'POST'),
  submitDayLeave: (leave_date: string, reason: string) => request<{ request: EmergencyLeaveRequest; replayed?: boolean }>('nomad_vip.api.attendance_policy.submit_day_leave', { from_date: leave_date, reason, idempotency_key: idempotencyKey('day-leave-create') }, 'POST'),
  teamClimateCandidates: () => request<TeamClimateCandidates>('nomad_vip.api.team_climate.get_feedback_candidates'),
  submitTeamClimateFeedback: (target_entertainer: string, category: TeamClimateCategory, feedback: string) => request<{ submitted: true; submitted_at: string; replayed?: boolean }>('nomad_vip.api.team_climate.submit_feedback', { target_entertainer, category, feedback, idempotency_key: idempotencyKey('team-climate-feedback') }, 'POST'),
  myRequestHub: (limit = 25, cursor = '') => request<RequestHubData>('nomad_vip.api.entertainer.get_my_request_hub', { limit, cursor }),
  managerLeaveRequests: () => request<{ policy: AttendancePolicy; requests: EmergencyLeaveRequest[] }>('nomad_vip.api.attendance_policy.get_manager_leave_requests'),
  decideManagerLeave: (request_name: string, source_type: EmergencyLeaveRequest['source_type'], decision: 'Approved' | 'Rejected', reason = '', expected_modified?: string) => request<{ name: string; status: string; replayed?: boolean }>('nomad_vip.api.attendance_policy.decide_manager_leave', { request_name, source_type: source_type || 'Emergency Leave', decision, reason, expected_modified: expected_modified || '', idempotency_key: idempotencyKey('leave-decision') }, 'POST'),
  managerRosterCandidates: (status: RosterCandidateData['status'] = 'Pending', search = '', cursor = 0, limit = 50) => request<RosterCandidateData>('nomad_vip.api.entertainer_roster.get_manager_roster_candidates', { status, search, cursor, limit }),
  reviewRosterCandidate: (candidate: string, decision: 'Entertainer' | 'Staff' | 'Inactive', note = '', linked_profile = '', expected_modified?: string) => request<{ name: string; review_status: string; reviewed_at: string; modified: string; replayed: boolean }>('nomad_vip.api.entertainer_roster.review_manager_roster_candidate', { candidate, decision, note, linked_profile, expected_modified: expected_modified || '', idempotency_key: idempotencyKey('roster-review') }, 'POST'),
  workday: () => request<WorkdayData>('nomad_vip.api.workday.get_workday'),
  transitionAvailability: (status: 'Available' | 'Unavailable', note: string, expected_event?: string | null, expected_version = 0, request_key?: string) => request<{ event: { name: string; status: AvailabilityStatus; state_version: number; occurred_at: string; note?: string }; replayed?: boolean }>('nomad_vip.api.workday.transition_availability', { status, note, expected_event: expected_event || '', expected_version, idempotency_key: request_key || idempotencyKey('availability-transition') }, 'POST'),
  submitAttendanceCorrection: (attendance_date: string, correction_type: AttendanceCorrectionRequest['correction_type'], requested_time: string, reason: string, requestKey = idempotencyKey('attendance-correction')) => request<{ request: AttendanceCorrectionRequest; replayed?: boolean }>('nomad_vip.api.workday.submit_attendance_correction', { attendance_date, correction_type, requested_time, reason, idempotency_key: requestKey }, 'POST'),
  managerCorrectionRequests: (status: AttendanceCorrectionRequest['status'] | 'All' = 'Pending') => request<{ branch: string; requests: AttendanceCorrectionRequest[] }>('nomad_vip.api.workday.get_manager_correction_requests', { status }),
  decideAttendanceCorrection: (request_name: string, decision: 'Approved' | 'Rejected', reason = '', expected_modified?: string, requestKey = idempotencyKey('attendance-correction-decision')) => request<{ name: string; status: string; applied_checkin?: string | null; reversed_penalties?: string[]; replayed?: boolean }>('nomad_vip.api.workday.decide_attendance_correction', { request_name, decision, reason, expected_modified: expected_modified || '', idempotency_key: requestKey }, 'POST'),
}
