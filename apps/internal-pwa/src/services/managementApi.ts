import type { ManagementPermission, ManagementRole, ManagementSession } from '../shared/managementAccess'
import { callFrappe, idempotencyKey, setFrappeCsrfToken } from './frappeClient'

export interface ManagementSessionResponse {
  authenticated?: true
  user: string
  display_name: string
  role: 'CEO' | 'Branch Manager'
  branch?: string | null
  branches: string[]
  capabilities: {
    company_wide: boolean
    manage_schedule: boolean
    decide_leave: boolean
    read_penalties: boolean
    search_customers: boolean
    approve_sales_goal: boolean
  }
  csrf_token?: string
}

interface ManagementLoginRequiredResponse {
  authenticated: false
}

export class FrappeLoginRequiredError extends Error {
  constructor() {
    super('NextERP нэвтрэлт шаардлагатай.')
    this.name = 'FrappeLoginRequiredError'
  }
}

export interface ManagerCustomerRow {
  name: string
  customer_name: string
  phone: string
  membership_rank: string
  visit_count: number
  bill_count: number
  total_spend: number
  average_bill: number
  first_visit?: string | null
  last_visit?: string | null
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
  actual_source: string
  generated_at: string
}

export interface ManagerRosterRow {
  profile: string
  display_name: string
  rank: string
  status: string
  lifecycle_status?: string
  shift?: { name?: string; shift_type?: string; start_date?: string; end_date?: string } | null
  work_date: string
  latest_checkin?: { name?: string; time?: string; log_type?: string } | null
  availability?: { status?: string; note?: string | null }
}

export interface ManagerDashboard {
  branch: string
  date: string
  summary: {
    total: number
    scheduled: number
    checked_in: number
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
  meta: { total: number; next_cursor?: number | null }
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
}

export interface ManagerTeam {
  branch: string
  date: string
  members: ManagerTeamMember[]
  meta: { total: number; entertainer_total: number; next_cursor?: number | null }
}

export interface ScheduleAssignment {
  name: string
  shift_type: string
  start_date: string
  end_date?: string | null
  status: string
  modified: string
}

export interface ManagerSchedule {
  branch: string
  window: { from: string; to: string }
  dates: string[]
  shift_types: Array<{ name: string; start_time: string; end_time: string }>
  people: Array<{
    profile: string
    employee?: string | null
    display_name: string
    rank?: string | null
    days: Array<{ date: string; assignment?: ScheduleAssignment | null; editable: boolean }>
  }>
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

function initials(value: string): string {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'VIP'
}

function permissionsFor(role: ManagementRole): ManagementPermission[] {
  return role === 'ceo'
    ? ['company.dashboard.read', 'company.approvals.read', 'company.approvals.write', 'company.branches.read', 'company.crm.read']
    : ['branch.dashboard.read', 'branch.workforce.write', 'branch.crm.read', 'branch.recommendations.write']
}

export class FrappeManagementApi {
  async getSession(): Promise<ManagementSession> {
    const response = await callFrappe<ManagementSessionResponse | ManagementLoginRequiredResponse>('nomad_vip.api.management.get_session')
    if (response.authenticated === false) throw new FrappeLoginRequiredError()
    setFrappeCsrfToken(response.csrf_token)
    const role: ManagementRole = response.role === 'CEO' ? 'ceo' : 'branch-manager'
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

  getManagerTeam(input: { search?: string; limit?: number; cursor?: number } = {}) {
    return callFrappe<ManagerTeam>('nomad_vip.api.management.get_manager_team', input)
  }

  getSchedule(startDate: string, days: number) {
    return callFrappe<ManagerSchedule>('nomad_vip.api.schedule.get_manager_schedule', { start_date: startDate, days })
  }

  setSchedule(input: { profileName: string; workDate: string; shiftType?: string; reason: string; expectedAssignment?: string; expectedModified?: string }) {
    return callFrappe<{ assignment?: ScheduleAssignment | null; previous_assignment?: ScheduleAssignment | null; replayed?: boolean }>(
      'nomad_vip.api.schedule.set_manager_schedule',
      {
        profile_name: input.profileName,
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

  decideLeave(requestName: string, decision: 'Approved' | 'Rejected', reason: string, expectedModified?: string, sourceType?: LeaveRequest['source_type']) {
    return callFrappe<{ name: string; status: string }>(
      'nomad_vip.api.attendance_policy.decide_manager_leave',
      { request_name: requestName, source_type: sourceType ?? 'Emergency Leave', decision, reason, expected_modified: expectedModified, idempotency_key: idempotencyKey('manager-leave') },
      'POST',
    )
  }

  getPenalties(status = 'All', branch?: string) {
    return callFrappe<{ branch: string; penalties: PenaltyRow[]; meta: { total: number } }>(
      'nomad_vip.api.management.get_manager_penalties',
      { status, branch, limit: 100 },
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

  decideGoal(goalName: string, decision: 'approve' | 'revision' | 'reject', comment: string, expectedModified?: string) {
    return callFrappe<{ goal: Record<string, unknown>; replayed: boolean }>(
      'nomad_vip.api.management.decide_sales_goal',
      { goal_name: goalName, decision, comment, expected_modified: expectedModified, idempotency_key: idempotencyKey('ceo-goal-decision') },
      'POST',
    )
  }

  logout() {
    return callFrappe<unknown>('logout', {}, 'POST')
  }
}
