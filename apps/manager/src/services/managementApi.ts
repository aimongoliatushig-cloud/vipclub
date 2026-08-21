import type { ManagementPermission, ManagementRole, ManagementSession } from '../shared/managementAccess'
import { callFrappe, idempotencyKey, setFrappeCsrfToken } from './frappeClient'

export interface ManagementSessionResponse {
  authenticated?: true
  user: string
  display_name: string
  role: 'CEO' | 'HR Manager' | 'Branch Manager'
  branch?: string | null
  branches: string[]
  capabilities: {
    company_wide: boolean
    manage_schedule: boolean
    decide_leave: boolean
    read_penalties: boolean
    search_customers: boolean
    approve_sales_goal: boolean
    manage_employees?: boolean
  }
  csrf_token?: string
}

interface ManagementLoginRequiredResponse {
  authenticated: false
}

export class FrappeLoginRequiredError extends Error {
  constructor() {
    super('Системд нэвтрэх шаардлагатай.')
    this.name = 'FrappeLoginRequiredError'
  }
}

export interface ManagerCustomerRow {
  name: string
  profile_name?: string
  customer_name: string
  phone: string
  membership_rank: string
  visit_count: number
  bill_count: number
  total_spend: number
  average_bill: number
  first_visit?: string | null
  last_visit?: string | null
  is_banned?: number
  ban_reason?: string | null
  banned_by?: string | null
  banned_at?: string | null
  service_characteristics?: string | null
  service_characteristics_updated_by?: string | null
  service_characteristics_updated_at?: string | null
  point_balance?: number
}

export interface BranchSalesGoalRecord {
  name: string
  branch?: string
  goal_month: string
  state: string
  version: number
  baseline_month?: string | null
  baseline_amount?: number
  proposed_target?: number
  approved_target: number
  manager_rationale?: string | null
  actions_json?: string | null
  submitted_by?: string | null
  submitted_at?: string | null
  decision_by?: string | null
  decision_at?: string | null
  decision_comment?: string | null
  modified: string
}

export interface BranchSalesProgress {
  branch: string
  month: string
  goal?: BranchSalesGoalRecord | null
  active_goal?: BranchSalesGoalRecord | null
  actual_sales: number
  achievement_percent?: number | null
  remaining_amount?: number | null
  periods?: Partial<Record<SalesPeriodKey, SalesPeriodDetail>>
  latest_paid_bill_date?: string | null
  latest_synced_at?: string | null
  actual_source: string
  metric_definition?: string
  generated_at: string
}

export interface ManagerSettings {
  branch: string
  sales: {
    month: string
    weight: number
    full_score_amount: number
    configured: boolean
    source?: 'monthly' | 'previous_setting' | 'empty'
    updated_by?: string | null
    updated_at?: string | null
    modified?: string | null
  }
  attendance: {
    late_after_time: string
    updated_by?: string | null
    updated_at?: string | null
  }
  modified: string
  replayed?: boolean
}

export interface MyAttendanceStatus {
  employee: string
  employee_name?: string | null
  branch: string
  work_date: string
  action: 'IN' | 'OUT'
  attendance_mode: 'arrival_only' | 'arrival_and_departure'
  requires_checkout: boolean
  attendance_complete: boolean
  checked_in: boolean
  checked_out: boolean
  checked_in_at?: string | null
  checked_out_at?: string | null
  open: boolean
  latest_checkin?: { name: string; time: string; log_type: 'IN' | 'OUT'; shift?: string | null } | null
  attendance_state: 'absent' | 'late' | 'checked_in' | 'not_arrived'
  late_after_time: string
  late_minutes: number
  hourly_leave?: boolean
  shift?: { name: string; shift_type: string; start: string; end: string } | null
}

export interface MyAttendanceHistoryDay {
  work_date: string
  status: 'arrived' | 'late' | 'completed'
  checked_in_at?: string | null
  checked_out_at?: string | null
  late_minutes?: number
  shift?: string | null
}

export interface MyAttendanceHistory {
  employee: string
  branch: string
  days: MyAttendanceHistoryDay[]
}

export interface AttendanceScanResult {
  accepted: boolean
  result: 'Accepted' | 'Duplicate' | 'Denied'
  reason?: string
  already_recorded?: boolean
  attendance_action?: 'IN' | 'OUT'
  branch?: string
  distance_meters?: number
  checkin?: { name: string; time: string; log_type: 'IN' | 'OUT' }
  requires_checkout?: boolean
}

export type SalesPeriodKey = 'yesterday' | 'week' | 'month'

export interface SalesPeriodItem {
  name: string
  quantity: number
  net_sales: number
  bill_count: number
}

export interface SalesPeriodBillItem {
  name: string
  quantity: number
  total: number
  dancers?: Array<{
    name: string
    amount: number
    sales_amount: number
  }>
}

export interface SalesPeriodBill {
  name: string
  bill_code: string
  posting_date: string
  open_date?: string | null
  closed_date?: string | null
  store_name: string
  bill_type: number
  total_amount: number
  items: SalesPeriodBillItem[]
}

export interface SalesTrendPoint {
  date: string
  net_sales: number
  gross_sales: number
  bill_count: number
  refund_count: number
}

export interface SalesCategoryRow {
  name: string
  quantity: number
  net_sales: number
  bill_count: number
}

export interface SalesPersonRow {
  name: string
  sales_amount: number
  employee_amount: number
  service_count: number
  bill_count: number
}

export interface SalesPeriodDetail {
  start_date: string
  end_date: string
  net_sales: number
  gross_sales: number
  bill_count: number
  refund_count: number
  refund_amount?: number
  average_bill: number
  previous_net_sales?: number | null
  change_percent?: number | null
  daily_sales?: SalesTrendPoint[]
  categories?: SalesCategoryRow[]
  category_detail_coverage?: number | null
  top_items: SalesPeriodItem[]
  people?: SalesPersonRow[]
  recent_bills: SalesPeriodBill[]
  bill_total?: number
  item_detail_coverage?: number | null
}

export interface ManagerRosterRow {
  profile: string
  display_name: string
  rank: string
  current_points?: number
  status: string
  lifecycle_status?: string
  shift?: { name?: string; shift_type?: string; start_date?: string; end_date?: string } | null
  work_date: string
  latest_checkin?: { name?: string; time?: string; log_type?: string } | null
  readiness?: {
    name: string
    result: 'READY' | 'NOT_READY'
    reason?: string | null
    checked_at?: string | null
  } | null
  availability?: { status?: string; note?: string | null }
}

export interface ManagerDashboard {
  branch: string
  date: string
  generated_at?: string
  summary: {
    total: number
    scheduled: number
    on_shift: number
    checked_in: number
    available: number
    reserved: number
    working: number
    break: number
    late: number
    absent: number
    leave: number
    off: number
    pending_readiness: number
    pending_leave: number
    pending_corrections: number
    pending_profile_changes: number
  }
  roster: ManagerRosterRow[]
  meta: { total: number; next_cursor?: number | null; generated_at?: string }
}

export interface ReadinessQueueRow {
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

export interface ReadinessQueueData {
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
  meta: { total: number; next_cursor?: number | null }
}

export interface DailyRoundRow {
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

export interface DailyRoundsData {
  branch: string
  work_date: string
  target: number
  penalty_rate: number
  people: DailyRoundRow[]
  summary: { checked_in: number; completed: number; incomplete: number; remaining_rounds: number; projected_penalty: number }
  access: { can_submit: boolean; message: string }
  replayed?: boolean
}

export interface ManagerTeamMember {
  employee: string
  profile?: string | null
  display_name: string
  role_label: string
  member_type: 'Entertainer' | 'Employee'
  rank?: string | null
  shift?: { name?: string; shift_type?: string; start_date?: string; end_date?: string } | null
  status: string
  modified: string
  attendance?: {
    work_date: string
    state: 'not_arrived' | 'checked_in' | 'checked_out' | 'late' | 'absent'
    checked_in: boolean
    checked_out: boolean
    arrival_time?: string | null
    departure_time?: string | null
    late_minutes: number
    late_after_time: string
    hourly_leave?: boolean
    requires_checkout: boolean
  }
}

export interface ManagerTeam {
  branch: string
  date: string
  members: ManagerTeamMember[]
  meta: { total: number; entertainer_total: number; next_cursor?: number | null }
}

export interface EntertainerDetail {
  branch?: string
  profile: {
    name: string
    employee: string
    employee_name?: string
    stage_name?: string
    branch: string
    lifecycle_status?: string
    current_rank?: string
	approved_rank?: string
	daily_rank?: DailyRankSnapshot | null
    current_points?: number
    skills?: string
    languages?: string
    service_tags?: string
    style_tags?: string
    profile_photo?: string | null
    modified?: string
  }
  performance?: {
    window: { from: string; to: string }
    current_month_income: number
    net_income: number
    points: number
    service_count: number
    bill_count: number
    lifetime?: {
      window: { from: string; to: string }
      total_income: number
      active_months: number
      service_count: number
      bill_count: number
      months: { month: string; income: number; services: number; bills: number }[]
      first_service_date?: string | null
      last_service_date?: string | null
      last_synced_at?: string | null
    }
    recent_services: { key: string; date: string; service: string; amount: number; percent: number }[]
    rank: { current: { name: string }; next?: { name: string } | null; remaining_points: number }
  } | null
  week: { start: string; end: string; days: { date: string; shift_type?: string | null; start_time?: string | null; end_time?: string | null }[] }
  attendance: { name: string; time: string; log_type: 'IN' | 'OUT'; shift?: string | null }[]
  summary: { scheduled_days: number; attendance_events: number; late_minutes: number; active_deduction: number }
  manager_controls?: {
    rank_options?: RankDefinition[]
    rank_reviews?: RankReview[]
    pending_rank_review?: RankReview | null
    rank_recommendation?: { rank?: string | null; points?: number; source?: string; requires_human_approval?: boolean } | null
    rank_evaluation?: { interval_days: number; last_evaluated_at?: string | null; next_evaluation_at: string; remaining_days: number; due: boolean }
	daily_rank?: DailyRankSnapshot | null
    component_audit?: DailyRankComponentAudit[]
  }
  meta?: { profile_version?: string; generated_at?: string; api_version?: string }
}

export interface DailyRankSnapshot {
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
  approved_rank?: string | null
  change_state: 'No Change' | 'Recommended Change' | 'Incomplete'
  missing_components: string[]
  threshold_interval?: { minimum: number; maximum: number; minimum_inclusive: boolean; maximum_inclusive: boolean } | null
  components?: DailyRankComponent[]
  calculated_at?: string | null
}

export type DailyRankComponentName =
  | 'attendance'
  | 'customer_complaints'
  | 'sales'
  | 'entertaining_skill'
  | 'cleanliness_beauty'
  | 'shift_effort'
  | 'personal_development'
  | 'entertainer_attitude'

export interface DailyRankComponent {
  component: DailyRankComponentName
  score?: number | null
  weight: number
  contribution?: number | null
  status: 'verified' | 'missing' | 'excluded'
  source?: {
    mode?: string
    records?: string[]
    assessment_date?: string
    completed?: number
    missed?: number
  }
}

export interface DailyRankComponentAudit {
  name: string
  component: DailyRankComponentName
  score: number
  previous_score?: number | null
  reason?: string | null
  severity?: 'low' | 'medium' | 'high' | 'critical' | null
  entered_by?: string | null
  scoring_date: string
  occurred_at: string
}

export interface DemoRankComponent {
  component: string
  label: string
  score: number
  weight: number
  contribution: number
  status: 'verified' | 'missing'
  provenance: 'DEMO'
}

export interface DemoRankResult {
  profile: string
  employee: string
  display_name: string
  branch: string
  identity_provenance: 'VERIFIED_EMPLOYEE_MASTER'
  input_provenance: 'DEMO'
  approved_rank: string
  calculated_rank?: string | null
  change_state: 'No Change' | 'Demo Difference'
  status: 'Complete' | 'Incomplete' | 'Invalid'
  weighted_score?: number | null
  displayed_score?: number | null
  attendance_state: 'Present' | 'Late' | 'Absent'
  late_minutes: number
  readiness_result: 'Ready' | 'Not Ready'
  rounds_completed: number
  rounds_target: number
  demo_sales_amount: number
  components: DemoRankComponent[]
  attention: string[]
  scoring_date: string
}

export interface DemoRankReport {
  batch: {
    batch_id: string
    scoring_date: string
    status: 'Active' | 'Rolled Back'
    policy_version: string
    created_by: string
    created_at: string
    notes?: string | null
  } | null
  summary: {
    profile_count: number
    complete_count: number
    attention_count: number
    average_score?: number | null
    demo_sales_total: number
    rank_counts: Record<string, number>
    branch_counts: Record<string, number>
  }
  results: DemoRankResult[]
  data_contract: {
    identity: 'VERIFIED_EMPLOYEE_MASTER'
    inputs: 'DEMO'
    mutates_approved_rank: false
    mutates_attendance_or_payroll: false
  }
}

export interface RankDefinition {
  name: string
  code?: string
  rank_order?: number
  minimum_points?: number
}

export interface RankReview {
  name: string
  entertainer: string
  employee?: string
  display_name: string
  branch: string
  from_rank: string
  recommended_rank: string
  points: number
  manager_reason: string
  status: 'Submitted' | 'Approved' | 'Returned' | 'Rejected'
  submitted_at?: string
  decision_reason?: string | null
  modified: string
}

export interface AttendanceCorrectionRequest {
  name: string
  entertainer: string
  employee: string
  branch: string
  display_name?: string
  attendance_date: string
  correction_type: 'Check-in' | 'Check-out'
  requested_time: string
  proposed_at?: string | null
  original_time?: string | null
  shift_start?: string | null
  shift_end?: string | null
  reason: string
  status: 'Pending' | 'Approved' | 'Rejected'
  penalties?: { name: string; penalty_type: 'Late' | 'Absence'; amount: number }[]
  review_blocked_reason?: string | null
  modified: string
}

export interface ScheduleAssignment {
  name: string
  shift_type: string
  start_date: string
  end_date?: string | null
  status: string
  modified: string
}

export interface FinexScheduleEvidence {
  source: 'Finex'
  scheduled: boolean
  attendance_type?: number | null
  attendance_name?: string | null
  store_name?: string | null
  synced_at?: string | null
}

export interface ManagerSchedule {
  branch: string
  window: { from: string; to: string }
  dates: string[]
  shift_types: Array<{ name: string; start_time: string; end_time: string }>
  people: Array<{
    profile?: string | null
    employee: string
    display_name: string
    role_label: string
    member_type: 'Entertainer' | 'Employee'
    identity_state?: 'Confirmed Entertainer Profile' | 'Employee Master'
    rank?: string | null
    days: Array<{ date: string; assignment?: ScheduleAssignment | null; imported?: FinexScheduleEvidence | null; schedule_conflict?: boolean; editable: boolean }>
  }>
  source_meta?: { authoritative: string; imported: string; imported_rows: number; conflicts: number; entertainer_count?: number; employee_count?: number; unlinked_candidates?: number; unlinked_rows?: number }
  generated_at: string
}

export interface LeaveRequest {
  name: string
  entertainer: string
  employee?: string | null
  branch: string
  display_name: string
  leave_date: string
  status: string
  requested_at: string
  reason: string
  decision_reason?: string | null
  modified: string
  source_type?: 'Emergency Leave' | 'Leave Application'
  to_date?: string | null
  leave_type?: string | null
}

export interface PenaltyRow {
  name: string
  entertainer: string
  employee?: string | null
  display_name: string
  attendance_date: string
  penalty_type: string
  late_minutes: number
  missed_rounds?: number
  amount: number
  status: string
  reason: string
  decision_reason?: string | null
  modified: string
}

export interface CompanyBranchSnapshot {
  branch: string
  actual_sales: number
  active_target: number
  achievement_percent?: number | null
  remaining_amount?: number | null
  goal?: BranchSalesGoalRecord | null
  customers: number
  customer_total_spend: number
  active_team_members: number
  active_entertainers: number
  pending_leave: number
  pending_penalties: number
  monthly_penalty_records: number
  approved_penalty_amount: number
}

export interface CompanyDashboard {
  month: string
  branches: CompanyBranchSnapshot[]
  pending_goals: BranchSalesGoalRecord[]
  totals: {
    actual_sales: number
    active_target: number
    customers: number
    active_team_members: number
    active_entertainers: number
    unassigned_active_employees: number
    pending_leave: number
    pending_penalties: number
    pending_goals: number
  }
  generated_at: string
}

export interface UnassignedEmployee {
  name: string
  employee_name: string
  designation?: string | null
  department?: string | null
  company?: string | null
  status: string
  modified: string
}

export interface UnassignedEmployeeResult {
  employees: UnassignedEmployee[]
  branches: string[]
  meta: { total: number; next_cursor?: number | null }
}

export type TeamClimateCategory = 'Positive' | 'Concern' | 'Support'

export interface TeamClimateFeedbackRow {
  name: string
  branch: string
  sender_entertainer: string
  sender_display_name: string
  target_entertainer: string
  target_display_name: string
  category: TeamClimateCategory
  feedback: string
  submitted_at: string
}

export interface TeamClimateFeedbackResult {
  branch?: string | null
  branches: string[]
  feedback: TeamClimateFeedbackRow[]
  meta: { total: number; next_cursor?: number | null }
}

export interface BranchAttendancePolicy {
  branch: string
  late_after_time: string
  updated_by?: string | null
  updated_at?: string | null
  modified: string
}

export interface CustomerEntry {
  name: string
  customer: string
  customer_name: string
  membership_rank: string
  guard_user: string
  guard_name: string
  entered_at: string
  visit_type: string
  visit_number: number
  reservation?: string | null
  manager_acknowledged: number
}

export interface CustomerEntryFeed {
  branch: string
  work_date?: string
  window_start?: string
  window_end?: string
  entries: CustomerEntry[]
  reservations: CustomerReservation[]
  pending_reservations: number
  today_total: number
  today_new: number
  unread: number
}

export interface CustomerReservation {
  name: string
  customer: string
  customer_name: string
  phone: string
  expected_at: string
  party_size: number
  notes?: string
  order_items?: string[]
  status: string
  is_banned?: number
  ban_reason?: string
}

export interface CustomerBranchBanNotice {
  branch: string
  ban_reason?: string | null
  banned_by?: string | null
  banned_at?: string | null
}

export interface CustomerReservationSummary {
  reservation: {
    name: string
    customer: string
    customer_name: string
    expected_at: string
    party_size: number
    status: string
    notes: string
    order_items: string[]
  }
  phone: string
  visit_count: number
  membership_rank: string
  average_bill: number
  is_banned: number
  ban_reason: string
  service_characteristics?: string
  branch_ban_notices?: CustomerBranchBanNotice[]
  recent_bills?: CustomerBill[]
  entertainers: CustomerEntrySummary['entertainers']
  top_entertainer: CustomerEntrySummary['top_entertainer']
}

export interface CustomerBillDancer {
  name: string
  nickname: string
  hours: number
}

export interface CustomerBillItem {
  name: string
  quantity: number
  total: number
  is_paid_service: number
  is_room: boolean
  is_hour_service: boolean
  dancers: CustomerBillDancer[]
}

export interface CustomerBill {
  name: string
  bill_code: string
  posting_date: string
  open_date?: string | null
  closed_date?: string | null
  duration_minutes: number
  store_name: string
  total_amount: number
  bill_type: number
  is_paid: number
  rooms: Array<{ name: string; hours: number }>
  items: CustomerBillItem[]
}

export interface CustomerEntrySummary {
  entry: {
    name: string
    customer: string
    customer_name: string
    entered_at: string
    visit_number: number
    guard_name: string
  }
  phone: string
  visit_count: number
  membership_rank: string
  average_bill: number
  is_banned: number
  ban_reason: string
  service_characteristics?: string
  branch_ban_notices?: CustomerBranchBanNotice[]
  latest_bill?: CustomerBill | null
  recent_bills?: CustomerBill[]
  reservation?: CustomerReservation | null
  entertainers: Array<{
    dancer_id: string
    name: string
    nickname: string
    service_count: number
    bill_count: number
  }>
  top_entertainer: {
    dancer_id: string
    name: string
    nickname: string
    service_count: number
    bill_count: number
  } | null
}

export interface EmployeeLifecycleOptions {
  branch: string
  branches: string[]
  companies: string[]
  designations: string[]
  departments: string[]
  genders: string[]
  today: string
}

export interface EmployeeLifecycleRecord {
  name: string
  employee_name: string
  designation?: string | null
  department?: string | null
  company?: string | null
  branch: string
  status: string
  date_of_joining?: string | null
  relieving_date?: string | null
  modified: string
}

export interface HireEmployeeInput {
  firstName: string
  lastName?: string
  gender: string
  dateOfBirth: string
  dateOfJoining: string
  company: string
  designation: string
  department?: string
  branch: string
  reason: string
}

function initials(value: string): string {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'VIP'
}

function permissionsFor(role: ManagementRole): ManagementPermission[] {
  if (role === 'ceo') return ['company.dashboard.read', 'company.approvals.read', 'company.approvals.write', 'company.branches.read', 'company.crm.read']
  if (role === 'hr-manager') return ['company.workforce.write']
  return ['branch.dashboard.read', 'branch.workforce.write', 'branch.crm.read', 'branch.recommendations.write']
}

export class FrappeManagementApi {
  async login(username: string, password: string): Promise<ManagementSession> {
    await callFrappe<unknown>('login', { usr: username.trim(), pwd: password }, 'POST')
    return this.getSession()
  }

  async getSession(): Promise<ManagementSession> {
    const response = await callFrappe<ManagementSessionResponse | ManagementLoginRequiredResponse>('nomad_vip.api.management.get_session')
    if (response.authenticated === false) throw new FrappeLoginRequiredError()
    setFrappeCsrfToken(response.csrf_token)
    const role: ManagementRole = response.role === 'CEO' ? 'ceo' : (response.role === 'HR Manager' ? 'hr-manager' : 'branch-manager')
    return {
      userId: response.user,
      displayName: response.display_name,
      initials: initials(response.display_name),
      role,
      branchIds: response.branches,
      permissions: permissionsFor(role),
      source: 'server',
    }
  }

  getManagerSettings(branch?: string, month?: string) {
    return callFrappe<ManagerSettings>('nomad_vip.api.manager_settings.get_manager_settings', { branch, month })
  }

  updateManagerSettings(input: {
    salesFullScoreAmount: number
    salesMonth: string
    lateAfterTime: string
    reason: string
    expectedModified: string
    expectedSalesModified?: string | null
    branch?: string
  }, requestKey = idempotencyKey('manager-settings')) {
    return callFrappe<ManagerSettings>(
      'nomad_vip.api.manager_settings.update_manager_settings',
      {
        sales_full_score_amount: input.salesFullScoreAmount,
        month: input.salesMonth,
        late_after_time: input.lateAfterTime,
        reason: input.reason,
        expected_modified: input.expectedModified,
        expected_sales_modified: input.expectedSalesModified,
        idempotency_key: requestKey,
        branch: input.branch,
      },
      'POST',
    )
  }

  getMyAttendanceStatus() {
    return callFrappe<MyAttendanceStatus>('nomad_vip.api.attendance.get_my_attendance_status')
  }

  getMyAttendanceHistory(limit = 14) {
    return callFrappe<MyAttendanceHistory>('nomad_vip.api.attendance.get_my_attendance_history', { limit })
  }

  scanAttendanceQr(
    qrPayload: string,
    latitude: number,
    longitude: number,
    accuracy: number,
    signal?: AbortSignal,
  ) {
    return callFrappe<AttendanceScanResult>(
      'nomad_vip.api.attendance.scan_branch_qr',
      { qr_payload: qrPayload, latitude, longitude, accuracy, log_type: 'AUTO' },
      'POST',
      { signal },
    )
  }

  getCustomers(input: { search?: string; membershipRank?: string; limit?: number; cursor?: number; branch?: string } = {}) {
    return callFrappe<{ branch: string; customers: ManagerCustomerRow[]; meta: { total: number; next_cursor?: number | null } }>(
      'nomad_vip.api.management.get_manager_customers',
      { search: input.search, membership_rank: input.membershipRank, limit: input.limit, cursor: input.cursor, branch: input.branch },
    )
  }

  getSalesProgress(month?: string, branch?: string) {
    return callFrappe<BranchSalesProgress>('nomad_vip.api.management.get_branch_sales_progress', { month, branch })
  }

  getCompanyDashboard(month?: string) {
    return callFrappe<CompanyDashboard>('nomad_vip.api.management.get_company_dashboard', { month })
  }

  getUnassignedEmployees(input: { search?: string; limit?: number; cursor?: number } = {}) {
    return callFrappe<UnassignedEmployeeResult>(
      'nomad_vip.api.management.get_unassigned_employees', input,
    )
  }

  assignEmployeeBranch(employeeName: string, branch: string, reason: string, expectedModified?: string) {
    return callFrappe<{ employee: UnassignedEmployee & { branch: string }; replayed: boolean }>(
      'nomad_vip.api.management.assign_employee_branch',
      { employee_name: employeeName, branch, reason, expected_modified: expectedModified, idempotency_key: idempotencyKey('ceo-employee-branch') },
      'POST',
    )
  }

  getManagerDashboard(input: { query?: string; status?: string; limit?: number; cursor?: number } = {}) {
    return callFrappe<ManagerDashboard>('nomad_vip.api.workforce.get_manager_dashboard', input)
  }

  getReadinessQueue(status: 'All' | 'Pending' | 'Ready' | 'Not_Ready' = 'All') {
    return callFrappe<ReadinessQueueData>('nomad_vip.api.supervisor.get_readiness_queue', { status, limit: 100 })
  }

  submitReadiness(input: { entertainer: string; shift_assignment: string; result: 'READY' | 'NOT_READY'; reason?: string; employee_checkin?: string | null }, requestKey: string) {
    return callFrappe<unknown>(
      'nomad_vip.api.supervisor.submit_readiness',
      {
        ...input,
        reason: input.reason || '',
        employee_checkin: input.employee_checkin || '',
        idempotency_key: requestKey,
      },
      'POST',
    )
  }

  getDailyRounds(workDate = '') {
    return callFrappe<DailyRoundsData>('nomad_vip.api.stage_rounds.get_daily_rounds', { work_date: workDate })
  }

  recordDailyRound(entertainer: string, workDate: string, requestKey: string) {
    return callFrappe<DailyRoundsData>(
      'nomad_vip.api.stage_rounds.record_daily_round',
      { entertainer, work_date: workDate, idempotency_key: requestKey },
      'POST',
    )
  }

  getManagerTeam(input: { search?: string; limit?: number; cursor?: number; branch?: string } = {}) {
    return callFrappe<ManagerTeam>('nomad_vip.api.management.get_manager_team', input)
  }

  getEmployeeLifecycleOptions(branch?: string) {
    return callFrappe<EmployeeLifecycleOptions>('nomad_vip.api.management.get_employee_lifecycle_options', { branch })
  }

  hireEmployee(input: HireEmployeeInput, requestKey: string) {
    return callFrappe<{ employee: EmployeeLifecycleRecord; replayed: boolean }>(
      'nomad_vip.api.management.hire_employee',
      {
        first_name: input.firstName,
        last_name: input.lastName,
        gender: input.gender,
        date_of_birth: input.dateOfBirth,
        date_of_joining: input.dateOfJoining,
        company: input.company,
        designation: input.designation,
        department: input.department,
        branch: input.branch,
        reason: input.reason,
        idempotency_key: requestKey,
      },
      'POST',
    )
  }

  terminateEmployee(employeeName: string, relievingDate: string, reason: string, expectedModified: string, requestKey: string) {
    return callFrappe<{ employee: EmployeeLifecycleRecord; replayed: boolean }>(
      'nomad_vip.api.management.terminate_employee',
      {
        employee_name: employeeName,
        relieving_date: relievingDate,
        reason,
        expected_modified: expectedModified,
        idempotency_key: requestKey,
      },
      'POST',
    )
  }

  getManagerEntertainerDetail(profileName: string) {
    return callFrappe<EntertainerDetail>('nomad_vip.api.workforce.get_manager_entertainer_detail', { profile_name: profileName })
  }

  getDemoRankReport(branch?: string) {
    return callFrappe<DemoRankReport>('nomad_vip.api.demo_rank_report.get_demo_rank_report', { branch })
  }

  getAttendanceCorrections(status: AttendanceCorrectionRequest['status'] | 'All' = 'Pending') {
    return callFrappe<{ branch: string; requests: AttendanceCorrectionRequest[] }>(
      'nomad_vip.api.workday.get_manager_correction_requests', { status, limit: 100 },
    )
  }

  getBranchAttendancePolicy(branch?: string) {
    return callFrappe<BranchAttendancePolicy>('nomad_vip.api.attendance.get_branch_attendance_policy', { branch })
  }

  updateBranchLateTime(lateAfterTime: string, reason: string, expectedModified: string, requestKey: string, branch?: string) {
    return callFrappe<BranchAttendancePolicy>(
      'nomad_vip.api.attendance.update_branch_late_time',
      { late_after_time: lateAfterTime, reason, expected_modified: expectedModified, idempotency_key: requestKey, branch },
      'POST',
    )
  }

  decideAttendanceCorrection(requestName: string, decision: 'Approved' | 'Rejected', reason: string, expectedModified: string, requestKey: string) {
    return callFrappe<{ name: string; status: string; applied_checkin?: string | null; reversed_penalties?: string[]; replayed?: boolean }>(
      'nomad_vip.api.workday.decide_attendance_correction',
      { request_name: requestName, decision, reason, expected_modified: expectedModified, idempotency_key: requestKey },
      'POST',
    )
  }

  getSchedule(startDate: string, days: number) {
    return callFrappe<ManagerSchedule>('nomad_vip.api.schedule.get_manager_schedule', { start_date: startDate, days })
  }

  setSchedule(input: { employeeName: string; profileName?: string | null; workDate: string; shiftType?: string; reason: string; expectedAssignment?: string; expectedModified?: string }) {
    return callFrappe<{ assignment?: ScheduleAssignment | null; previous_assignment?: ScheduleAssignment | null; replayed?: boolean }>(
      'nomad_vip.api.schedule.set_manager_schedule',
      {
        employee_name: input.employeeName,
        profile_name: input.profileName ?? '',
        work_date: input.workDate,
        shift_type: input.shiftType,
        reason: input.reason,
        expected_assignment: input.expectedAssignment,
        expected_modified: input.expectedModified,
        idempotency_key: idempotencyKey('manager-schedule'),
      },
      'POST',
    )
  }

  getLeaveRequests(status = 'All') {
    return callFrappe<{ requests: LeaveRequest[]; meta: { total: number } }>(
      'nomad_vip.api.attendance_policy.get_manager_leave_requests',
      { status, limit: 100 },
    )
  }

  decideLeave(requestName: string, decision: 'Approved' | 'Rejected', reason: string, expectedModified?: string, sourceType?: LeaveRequest['source_type'], requestKey?: string) {
    return callFrappe<{ name: string; status: string }>(
      'nomad_vip.api.attendance_policy.decide_manager_leave',
      { request_name: requestName, source_type: sourceType ?? 'Emergency Leave', decision, reason, expected_modified: expectedModified, idempotency_key: requestKey ?? idempotencyKey('manager-leave') },
      'POST',
    )
  }

  async getEntryFeed(limit = 50) {
    const response = await callFrappe<Omit<CustomerEntryFeed, 'reservations' | 'pending_reservations'> & {
      reservations?: CustomerReservation[]
      pending_reservations?: number | CustomerReservation[]
    }>('nomad_vip.api.entry.get_feed', { limit })
    const legacyReservations = Array.isArray(response.pending_reservations) ? response.pending_reservations : []
    const reservations = response.reservations ?? legacyReservations
    const entries = response.window_start && response.window_end
      ? response.entries.filter((entry) => {
          const enteredAt = new Date(entry.entered_at.replace(' ', 'T')).getTime()
          const windowStart = new Date(response.window_start!.replace(' ', 'T')).getTime()
          const windowEnd = new Date(response.window_end!.replace(' ', 'T')).getTime()
          return Number.isFinite(enteredAt) && Number.isFinite(windowStart) && Number.isFinite(windowEnd)
            ? enteredAt >= windowStart && enteredAt < windowEnd
            : true
        })
      : response.entries
    const localTodayNew = entries.filter((entry) => entry.visit_number === 1).length
    const localUnread = entries.filter((entry) => !entry.manager_acknowledged).length
    // The feed is intentionally paginated. Keep the server aggregates when they
    // are available instead of making the dashboard count equal to the page size.
    const todayTotal = Number.isFinite(response.today_total)
      ? Math.max(response.today_total, entries.length)
      : entries.length
    const todayNew = Number.isFinite(response.today_new)
      ? Math.min(todayTotal, Math.max(response.today_new, localTodayNew))
      : localTodayNew
    const unread = Number.isFinite(response.unread)
      ? Math.max(response.unread, localUnread)
      : localUnread
    return {
      ...response,
      entries,
      reservations,
      pending_reservations: typeof response.pending_reservations === 'number' ? response.pending_reservations : reservations.length,
      today_total: todayTotal,
      today_new: todayNew,
      unread,
    }
  }

  getEntrySummary(entry: string) {
    return callFrappe<CustomerEntrySummary>('nomad_vip.api.entry.get_entry_summary', { entry })
  }

  getReservationSummary(reservation: string) {
    return callFrappe<CustomerReservationSummary>('nomad_vip.api.entry.get_reservation_summary', { reservation })
  }

  setCustomerBan(customer: string, banned: boolean, reason: string) {
    return callFrappe<unknown>(
      'nomad_vip.api.entry.set_customer_ban_for_entry',
      { customer, banned: banned ? 1 : 0, reason },
      'POST',
    )
  }

  setCustomerServiceCharacteristics(customer: string, characteristics: string) {
    return callFrappe<{
      customer: string
      branch: string
      service_characteristics: string
      service_characteristics_updated_by: string
      service_characteristics_updated_at: string
    }>(
      'nomad_vip.api.customer.set_customer_service_characteristics',
      { customer, characteristics },
      'POST',
    )
  }

  acknowledgeEntry(entry: string) {
    return callFrappe<{ entry: string; acknowledged: boolean }>(
      'nomad_vip.api.entry.acknowledge_entry',
      { entry },
      'POST',
    )
  }

  getManagerRankReviews(status: RankReview['status'] | 'All' = 'All') {
    return callFrappe<{ reviews: RankReview[]; meta: { total: number; next_cursor?: number | null } }>(
      'nomad_vip.api.rank_review.get_manager_rank_reviews', { status, limit: 100 },
    )
  }

  getCeoRankReviews(status: RankReview['status'] | 'All' = 'Submitted') {
    return callFrappe<{ reviews: RankReview[]; meta: { total: number; next_cursor?: number | null } }>(
      'nomad_vip.api.rank_review.get_ceo_rank_reviews', { status, limit: 100 },
    )
  }

  submitRankRecommendation(profileName: string, rank: string, reason: string, expectedModified: string | undefined, requestKey: string) {
    return callFrappe<{ review: RankReview; replayed: boolean }>(
      'nomad_vip.api.rank_review.submit_rank_recommendation',
      { profile_name: profileName, rank, reason, expected_modified: expectedModified, idempotency_key: requestKey },
      'POST',
    )
  }

  submitDailyRankComponent(
	profileName: string,
	component: 'customer_complaints' | 'entertaining_skill' | 'cleanliness_beauty' | 'personal_development' | 'entertainer_attitude',
	score: number,
	scoringDate: string,
	reason: string,
	requestKey: string,
	severity?: 'low' | 'medium' | 'high' | 'critical',
  ) {
	return callFrappe<{ event: string; daily_rank?: DailyRankSnapshot | null; idempotent_replay: boolean }>(
	  'nomad_vip.api.daily_rank.submit_component_score',
	  { profile_name: profileName, component, score, scoring_date: scoringDate, reason, severity, idempotency_key: requestKey },
	  'POST',
	)
  }

  decideRankReview(reviewName: string, decision: 'approve' | 'return' | 'reject', reason: string, expectedModified: string, requestKey: string) {
    return callFrappe<{ review: RankReview; replayed: boolean }>(
      'nomad_vip.api.rank_review.decide_rank_review',
      { review_name: reviewName, decision, reason, expected_modified: expectedModified, idempotency_key: requestKey },
      'POST',
    )
  }

  getPenalties(status = 'All', branch?: string) {
    return callFrappe<{ branch: string; penalties: PenaltyRow[]; meta: { total: number } }>(
      'nomad_vip.api.management.get_manager_penalties',
      { status, branch, limit: 100 },
    )
  }

  getTeamClimateFeedback(input: { branch?: string; category?: TeamClimateCategory | 'All'; limit?: number; cursor?: number } = {}) {
    return callFrappe<TeamClimateFeedbackResult>(
      'nomad_vip.api.team_climate.get_management_feedback',
      { branch: input.branch, category: input.category ?? 'All', limit: input.limit ?? 100, cursor: input.cursor ?? 0 },
    )
  }

  decidePenalty(penaltyName: string, decision: 'Approved' | 'Rejected', reason: string, expectedModified?: string) {
    return callFrappe<{ name: string; status: string }>(
      'nomad_vip.api.attendance_policy.decide_penalty',
      { penalty_name: penaltyName, decision, reason, expected_modified: expectedModified, idempotency_key: idempotencyKey('manager-penalty') },
      'POST',
    )
  }

  reversePenalty(penaltyName: string, reason: string, expectedModified?: string) {
    return callFrappe<{ name: string; status: string }>(
      'nomad_vip.api.attendance_policy.reverse_penalty',
      { penalty_name: penaltyName, reason, expected_modified: expectedModified, idempotency_key: idempotencyKey('manager-penalty-reverse') },
      'POST',
    )
  }

  saveGoal(month: string, proposedTarget: number, rationale: string, actions: unknown[], expectedModified?: string) {
    return callFrappe<{ goal: Record<string, unknown>; replayed: boolean }>(
      'nomad_vip.api.management.save_sales_goal_proposal',
      { month, proposed_target: proposedTarget, rationale, actions, expected_modified: expectedModified, idempotency_key: idempotencyKey('manager-goal-save') },
      'POST',
    )
  }

  submitGoal(goalName: string, expectedModified?: string) {
    return callFrappe<{ goal: Record<string, unknown>; replayed: boolean }>(
      'nomad_vip.api.management.submit_sales_goal_proposal',
      { goal_name: goalName, expected_modified: expectedModified, idempotency_key: idempotencyKey('manager-goal-submit') },
      'POST',
    )
  }

  decideGoal(
    goalName: string,
    decision: 'approve' | 'revision' | 'reject',
    comment: string,
    expectedModified?: string,
    approvedTarget?: number,
  ) {
    return callFrappe<{ goal: Record<string, unknown>; replayed: boolean }>(
      'nomad_vip.api.management.decide_sales_goal',
      { goal_name: goalName, decision, comment, expected_modified: expectedModified, approved_target: approvedTarget, idempotency_key: idempotencyKey('ceo-goal-decision') },
      'POST',
    )
  }

  changePassword(currentPassword: string, newPassword: string) {
    return callFrappe<{ changed: true }>(
      'nomad_vip.api.profile.change_own_password',
      { current_password: currentPassword, new_password: newPassword },
      'POST',
    )
  }

  logout() {
    return callFrappe<unknown>('logout', {}, 'POST')
  }
}
