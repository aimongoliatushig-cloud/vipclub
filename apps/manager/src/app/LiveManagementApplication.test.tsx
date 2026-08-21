import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ManagementSession } from '../shared/managementAccess'
import { setFrappeCsrfToken } from '../services/frappeClient'
import { FrappeManagementApi } from '../services/managementApi'
import LiveManagementApplication from './LiveManagementApplication'

const managerSession: ManagementSession = {
  userId: 'manager@vipclub.local', displayName: 'Номин Менежер', initials: 'НМ', role: 'branch-manager',
  branchIds: ['Nomad'], permissions: ['branch.dashboard.read', 'branch.workforce.write', 'branch.crm.read', 'branch.recommendations.write'], source: 'server',
}

const ceoSession: ManagementSession = {
  userId: 'ceo@vipclub.local', displayName: 'Бат CEO', initials: 'БЗ', role: 'ceo',
  branchIds: ['Monarch', 'Sapphire', 'Neva', 'Nomad'], permissions: ['company.dashboard.read', 'company.approvals.read', 'company.approvals.write', 'company.branches.read', 'company.crm.read'], source: 'server',
}

const hrSession: ManagementSession = {
  userId: 'hr@vipclub.local', displayName: 'Сараа HR', initials: 'СХ', role: 'hr-manager',
  branchIds: ['Monarch', 'Sapphire', 'Neva', 'Nomad'], permissions: ['company.workforce.write'], source: 'server',
}

function managerApi() {
  return {
    getSalesProgress: vi.fn().mockResolvedValue({ branch: 'Nomad', month: '2026-08', active_goal: { name: 'G-1', goal_month: '2026-08-01', state: 'Active', version: 1, approved_target: 1000000, modified: '2026-08-13' }, actual_sales: 600000, achievement_percent: 60, remaining_amount: 400000, actual_source: 'VIP POS Bill' }),
    getManagerDashboard: vi.fn().mockResolvedValue({ branch: 'Nomad', date: '2026-08-13', summary: { total: 1, scheduled: 1, on_shift: 1, checked_in: 1, available: 1, reserved: 0, working: 0, break: 0, late: 0, absent: 0, leave: 0, off: 0, pending_readiness: 0, pending_leave: 1, pending_corrections: 0, pending_profile_changes: 0 }, roster: [{ profile: 'P-1', display_name: 'Ану', rank: 'Rank 1', status: 'checked_in', work_date: '2026-08-13', shift: { shift_type: 'Night' }, readiness: { name: 'RC-1', result: 'NOT_READY', reason: 'Ажлын бэлтгэл хангалтгүй', checked_at: '2026-08-13 20:05:00' }, availability: { status: 'Available' } }], meta: { total: 1, generated_at: '2026-08-13 20:10:00' } }),
    getReadinessQueue: vi.fn().mockResolvedValue({ branch: 'Nomad', work_date: '2026-08-13', status: 'ALL', queue: [{ entertainer: 'P-1', stage_name: 'Ану', employee: 'EMP-1', branch: 'Nomad', shift_assignment: 'SA-1', shift_type: 'Night', readiness_status: 'NOT_READY', readiness_check: 'RC-1', readiness_supervisor: 'lead@vipclub.local', attendance: { checked_in: true, employee_checkin: 'CHK-1', checked_in_at: '2026-08-13 20:00:00' } }], summary: { total: 1, pending: 0, ready: 0, not_ready: 1 }, access: { can_submit: false, mode: 'manager_read_only', lead_state: 'on_duty', lead_name: 'Ахлах', message: 'Менежер үр дүнг зөвхөн харна.' }, meta: { total: 1 } }),
    getDailyRounds: vi.fn().mockResolvedValue({ branch: 'Nomad', work_date: '2026-08-13', target: 7, people: [{ entertainer: 'P-1', employee: 'EMP-1', display_name: 'Ану', current_rank: 'Rank 1', shift_assignment: 'SA-1', shift_type: 'Night', employee_checkin: 'CHK-1', checked_in_at: '2026-08-13 20:00:00', rounds: 3, target: 7, completed: false }], summary: { checked_in: 1, completed: 0, incomplete: 1, remaining_rounds: 4 }, access: { can_submit: true, message: 'Зөвхөн QR ирцтэй бүжигчид.' } }),
    recordDailyRound: vi.fn().mockResolvedValue({ branch: 'Nomad', work_date: '2026-08-13', target: 7, people: [{ entertainer: 'P-1', employee: 'EMP-1', display_name: 'Ану', current_rank: 'Rank 1', shift_assignment: 'SA-1', shift_type: 'Night', employee_checkin: 'CHK-1', checked_in_at: '2026-08-13 20:00:00', rounds: 4, target: 7, completed: false }], summary: { checked_in: 1, completed: 0, incomplete: 1, remaining_rounds: 3 }, access: { can_submit: true, message: 'Зөвхөн QR ирцтэй бүжигчид.' } }),
    getManagerTeam: vi.fn().mockResolvedValue({ branch: 'Nomad', date: '2026-08-13', members: [
      { employee: 'EMP-1', profile: 'P-1', display_name: 'Ану', role_label: 'Бүжигчин', member_type: 'Entertainer', rank: 'Rank 1', shift: { shift_type: 'Night' }, status: 'Active', modified: '2026-08-13 12:00:00' },
      { employee: 'EMP-2', profile: null, display_name: 'Бат', role_label: 'Бармен', member_type: 'Employee', status: 'Active', modified: '2026-08-13 12:00:00' },
      { employee: 'EMP-3', profile: null, display_name: 'Дорж', role_label: 'Хамгаалагч', member_type: 'Employee', status: 'Active', modified: '2026-08-13 12:00:00' },
    ], meta: { total: 3, entertainer_total: 1 } }),
    getLeaveRequests: vi.fn().mockResolvedValue({ requests: [{ name: 'L-1', entertainer: 'P-1', employee: 'EMP-1', source_type: 'Emergency', branch: 'Nomad', display_name: 'Ану', leave_date: '2026-08-14', status: 'Pending', requested_at: '2026-08-13 10:00:00', reason: 'Гэр бүлийн шалтгаан', modified: '2026-08-13' }], meta: { total: 1 } }),
    decideLeave: vi.fn().mockResolvedValue({ request: { name: 'L-1', status: 'Approved' }, replayed: false }),
    getEntryFeed: vi.fn().mockResolvedValue({ branch: 'Nomad', work_date: '2026-08-15', window_start: '2026-08-15 12:00:00', window_end: '2026-08-16 12:00:00', entries: [{ name: 'E-1', customer: 'C-1', customer_name: 'Болд', membership_rank: 'Gold', guard_user: 'guard@vipclub.local', guard_name: 'Номин хамгаалагч', entered_at: '2026-08-15 20:10:00', visit_type: 'Returning', visit_number: 4, manager_acknowledged: 0 }], reservations: [{ name: 'R-1', customer: 'C-2', customer_name: 'Саруул', phone: '99112233', expected_at: '2026-08-15 21:30:00', party_size: 4, notes: 'Төрсөн өдөр', order_items: [], status: 'Scheduled', is_banned: 0, ban_reason: '' }], pending_reservations: 1, today_total: 1, today_new: 0, unread: 1 }),
    getEntrySummary: vi.fn().mockResolvedValue({ entry: { name: 'E-1', customer: 'C-1', customer_name: 'Болд', entered_at: '2026-08-15 20:10:00', visit_number: 4, guard_name: 'Номин хамгаалагч' }, phone: '•••• 1122', visit_count: 4, membership_rank: 'Gold', average_bill: 320000, entertainers: [{ dancer_id: 'D-1', name: 'Ану', nickname: 'Anu', service_count: 6, bill_count: 3 }], top_entertainer: { dancer_id: 'D-1', name: 'Ану', nickname: 'Anu', service_count: 6, bill_count: 3 } }),
    getReservationSummary: vi.fn().mockResolvedValue({ reservation: { name: 'R-1', customer: 'C-2', customer_name: 'Саруул', expected_at: '2026-08-15 21:30:00', party_size: 4, status: 'Scheduled', notes: 'Төрсөн өдөр', order_items: [] }, phone: '•••• 2233', visit_count: 3, membership_rank: 'Silver', average_bill: 210000, is_banned: 0, ban_reason: '', entertainers: [{ dancer_id: 'D-2', name: 'Сондор', nickname: 'Sondor', service_count: 4, bill_count: 2 }], top_entertainer: { dancer_id: 'D-2', name: 'Сондор', nickname: 'Sondor', service_count: 4, bill_count: 2 } }),
    acknowledgeEntry: vi.fn().mockResolvedValue({ entry: 'E-1', acknowledged: true }),
    getPenalties: vi.fn().mockResolvedValue({ branch: 'Nomad', penalties: [], meta: { total: 0 } }),
    getAttendanceCorrections: vi.fn().mockResolvedValue({ branch: 'Nomad', requests: [] }),
    getBranchAttendancePolicy: vi.fn().mockResolvedValue({ branch: 'Nomad', late_after_time: '22:00:00', updated_by: null, updated_at: null, modified: '2026-08-13 12:00:00' }),
    updateBranchLateTime: vi.fn().mockResolvedValue({ branch: 'Nomad', late_after_time: '22:30:00', updated_by: 'manager@vipclub.local', updated_at: '2026-08-13 12:01:00', modified: '2026-08-13 12:01:00' }),
    getManagerEntertainerDetail: vi.fn().mockResolvedValue({ profile: { name: 'P-1', employee: 'EMP-1', employee_name: 'Ану', branch: 'Nomad', lifecycle_status: 'Active', current_rank: 'Rank 1', approved_rank: 'Rank 1', current_points: 86.25, modified: '2026-08-13 12:00:00' }, performance: { window: { from: '2026-06-13', to: '2026-08-13' }, current_month_income: 500000, net_income: 1200000, points: 120, service_count: 8, bill_count: 4, lifetime: { window: { from: '2025-11-01', to: '2026-08-13' }, total_income: 9500000, active_months: 7, service_count: 42, bill_count: 24, months: [] }, recent_services: [], rank: { current: { name: 'Rank 1' }, remaining_points: 0 } }, week: { start: '2026-08-10', end: '2026-08-16', days: [] }, attendance: [], summary: { scheduled_days: 1, attendance_events: 2, late_minutes: 0, active_deduction: 0 }, manager_controls: { daily_rank: { name: 'DR-1', revision: 2, scoring_date: '2026-08-13', status: 'Complete', weighted_score: 86.25, displayed_score: 86.25, calculated_rank: 'Rank 2', approved_rank: 'Rank 1', change_state: 'Recommended Change', missing_components: [], components: [
      { component: 'sales', score: 80, weight: 40, contribution: 32, status: 'verified', source: { mode: 'normalized_event' } },
      { component: 'attendance', score: 100, weight: 10, contribution: 10, status: 'verified', source: { mode: 'normalized_event' } },
      { component: 'customer_complaints', score: 90, weight: 15, contribution: 13.5, status: 'verified', source: { mode: 'normalized_event' } },
      { component: 'shift_effort', score: 100, weight: 10, contribution: 10, status: 'verified', source: { mode: 'seven_item_stage_round_checklist' } },
      { component: 'entertaining_skill', score: 80, weight: 5, contribution: 4, status: 'verified', source: { mode: 'latest_approved_assessment' } },
      { component: 'cleanliness_beauty', score: 75, weight: 5, contribution: 3.75, status: 'verified', source: { mode: 'normalized_event' } },
      { component: 'personal_development', score: 70, weight: 5, contribution: 3.5, status: 'verified', source: { mode: 'latest_approved_assessment' } },
      { component: 'entertainer_attitude', score: 95, weight: 10, contribution: 9.5, status: 'verified', source: { mode: 'substantiated_daily_incident' } },
    ] }, component_audit: [{ name: 'EVT-1', component: 'entertaining_skill', score: 80, previous_score: 75, reason: 'Ур чадвар ахисан', scoring_date: '2026-08-13', occurred_at: '2026-08-13 21:00:00' }] }, meta: { profile_version: '2026-08-13 12:00:00' } }),
    submitDailyRankComponent: vi.fn().mockResolvedValue({ event: 'EVT-2', daily_rank: { name: 'DR-2' }, idempotent_replay: false }),
    getCustomers: vi.fn().mockResolvedValue({ branch: 'Nomad', customers: [{ name: 'C-1', customer_name: 'Болд', phone: '•••• 1122', membership_rank: 'Gold', visit_count: 8, bill_count: 6, total_spend: 800000, average_bill: 133333, is_banned: 0, ban_reason: '', service_characteristics: 'Тайван ширээ сонгодог' }], meta: { total: 1 } }),
    setCustomerBan: vi.fn().mockResolvedValue({}),
    setCustomerServiceCharacteristics: vi.fn().mockImplementation(async (customer: string, characteristics: string) => ({ customer, branch: 'Nomad', service_characteristics: characteristics, service_characteristics_updated_by: 'manager@vipclub.local', service_characteristics_updated_at: '2026-08-19 12:00:00' })),
    getEmployeeLifecycleOptions: vi.fn().mockResolvedValue({ branch: 'Nomad', branches: ['Nomad'], companies: ['BIG Future DHD LLC'], designations: ['Бармен', 'Бүжигчин'], departments: ['Үйлчилгээ'], genders: ['Female', 'Male'], today: '2026-08-15' }),
    hireEmployee: vi.fn().mockResolvedValue({ employee: { name: 'EMP-4', employee_name: 'Сараа', branch: 'Nomad', status: 'Active', modified: '2026-08-15' }, replayed: false }),
    terminateEmployee: vi.fn().mockResolvedValue({ employee: { name: 'EMP-2', employee_name: 'Бат', branch: 'Nomad', status: 'Inactive', modified: '2026-08-15' }, replayed: false }),
  } as unknown as FrappeManagementApi
}

function ceoApi() {
  return {
    getCompanyDashboard: vi.fn().mockResolvedValue({ month: '2026-08', branches: ['Monarch', 'Sapphire', 'Neva', 'Nomad'].map((branch) => ({ branch, actual_sales: 100000, active_target: 200000, achievement_percent: 50, remaining_amount: 100000, customers: 10, customer_total_spend: 1000000, active_team_members: 5, active_entertainers: 2, pending_leave: 0, pending_penalties: 0, monthly_penalty_records: 0, approved_penalty_amount: 0 })), pending_goals: [], totals: { actual_sales: 400000, active_target: 800000, customers: 40, active_team_members: 20, active_entertainers: 8, unassigned_active_employees: 3, pending_leave: 0, pending_penalties: 0, pending_goals: 0 }, generated_at: '2026-08-13' }),
    getCustomers: vi.fn().mockImplementation(async ({ branch }: { branch?: string } = {}) => ({
      branch: branch ?? 'Monarch',
      customers: branch === 'Monarch'
        ? [{ name: 'C-MON-1', customer_name: 'Ариунаа', phone: '•••• 1042', membership_rank: 'Gold', visit_count: 12, bill_count: 9, total_spend: 7_500_000, average_bill: 833_333, last_visit: '2026-06-20' }]
        : [{ name: `C-${branch}`, customer_name: `${branch} зочин`, phone: '•••• 2200', membership_rank: 'Silver', visit_count: 4, bill_count: 3, total_spend: 1_200_000, average_bill: 400_000, last_visit: null }],
      meta: { total: 1 },
    })),
    getUnassignedEmployees: vi.fn().mockResolvedValue({ employees: [{ name: 'HR-EMP-99', employee_name: 'Салбаргүй ажилтан', designation: 'Зөөгч', department: 'Үйлчилгээ', company: 'Nomad VIP', status: 'Active', modified: '2026-08-13 12:00:00' }], branches: ['Monarch', 'Sapphire', 'Neva', 'Nomad'], meta: { total: 1 } }),
    assignEmployeeBranch: vi.fn().mockResolvedValue({ employee: { name: 'HR-EMP-99', employee_name: 'Салбаргүй ажилтан', branch: 'Nomad', status: 'Active', modified: '2026-08-13 12:01:00' }, replayed: false }),
    getCeoRankReviews: vi.fn().mockResolvedValue({ reviews: [], meta: { total: 0 } }),
    decideGoal: vi.fn().mockResolvedValue({ goal: { name: 'GOAL-1', state: 'Active', approved_target: 345000000 }, replayed: false }),
  } as unknown as FrappeManagementApi
}

describe('live role-aware management application', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/manager/')
  })

  it('shows a manager-only branch overview from server data', async () => {
    render(<LiveManagementApplication api={managerApi()} session={managerSession} />)
    expect(await screen.findByRole('heading', { name: 'Менежерийн тойм' })).toBeInTheDocument()
    expect(screen.getAllByText('600 мянга ₮').length).toBeGreaterThan(0)
    expect(screen.getByRole('navigation', { name: 'Менежерийн навигац' })).toHaveTextContent('Чөлөөний хүсэлт')
    expect(screen.queryByText('Санхүү ба тооцоо')).not.toBeInTheDocument()
    expect(screen.getByText('Бэлэн бус')).toBeInTheDocument()
    expect(screen.getByText('Ажлын бэлтгэл хангалтгүй')).toBeInTheDocument()
    expect(screen.getByText(/Менежер үр дүнг зөвхөн харна/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Шалгалт батлах|Бэлэн бус болгох|Бэлэн болгох/ })).not.toBeInTheDocument()
    const operations = screen.getByRole('region', { name: 'Шуурхай тойм' })
    expect(within(operations).getByText('Өнөөдрийн зочин')).toBeInTheDocument()
    expect(within(operations).getByText('Ээлжтэй бүжигчин')).toBeInTheDocument()
    expect(within(operations).getByText('Ирсэн бүжигчин')).toBeInTheDocument()
    expect(within(operations).getByText('Шалгалт хүлээж буй')).toBeInTheDocument()
    expect(screen.getByText(/Сүүлд шинэчилсэн/)).toBeInTheDocument()
  })

  it('records one of seven daily rounds only for the checked-in dancer', async () => {
    const api = managerApi()
    render(<LiveManagementApplication api={api} session={managerSession} />)
    await screen.findByRole('heading', { name: 'Менежерийн тойм' })
    const managerNav = screen.getByRole('navigation', { name: 'Менежерийн навигац' })
    fireEvent.click(within(managerNav).getByRole('button', { name: /Өдрийн гараа/ }))
    expect(await screen.findByRole('heading', { name: 'Өдрийн гараа' })).toBeInTheDocument()
    expect(screen.getByText(/3\/7/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Гарсан' }))
    await waitFor(() => expect(api.recordDailyRound).toHaveBeenCalledWith('P-1', '2026-08-13', expect.any(String)))
    expect((await screen.findAllByText(/4\/7/)).length).toBeGreaterThan(0)
  })

  it('lets the branch manager save service characteristics and a branch ban from CRM', async () => {
    const api = managerApi()
    render(<LiveManagementApplication api={api} session={managerSession} />)
    await screen.findByRole('heading', { name: 'Менежерийн тойм' })
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Менежерийн навигац' })).getByRole('button', { name: /Зочид/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Харилцагчид' }))
    expect(await screen.findByRole('heading', { name: 'Харилцагчид' })).toBeInTheDocument()

    const characteristics = screen.getByRole('textbox', { name: 'Зочны үйлчилгээний онцлог' })
    await waitFor(() => expect(characteristics).toHaveValue('Тайван ширээ сонгодог'))
    fireEvent.change(characteristics, { target: { value: 'Нам гүм булан, мөсгүй ус хүсдэг' } })
    const saveCharacteristics = screen.getByRole('button', { name: 'Хадгалах' })
    await waitFor(() => expect(saveCharacteristics).toBeEnabled())
    fireEvent.click(saveCharacteristics)
    await waitFor(() => expect(api.setCustomerServiceCharacteristics).toHaveBeenCalledWith('C-1', 'Нам гүм булан, мөсгүй ус хүсдэг'))

    fireEvent.change(screen.getByRole('textbox', { name: 'Блоклох шалтгаан' }), { target: { value: 'Дотоод журам зөрчсөн' } })
    fireEvent.click(screen.getByRole('button', { name: 'Блоклох' }))
    fireEvent.click(screen.getByRole('button', { name: 'Тийм, блоклох' }))
    await waitFor(() => expect(api.setCustomerBan).toHaveBeenCalledWith('C-1', true, 'Дотоод журам зөрчсөн'))
  })

  it('keeps the full CEO navigation while using a company-wide live summary', async () => {
    render(<LiveManagementApplication api={ceoApi()} session={ceoSession} />)
    expect(await screen.findByRole('heading', { name: 'Удирдлагын төв' })).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Гүйцэтгэх захирлын навигац' })
    expect(nav).toHaveTextContent('Санхүү ба тооцоо')
    expect(nav).toHaveTextContent('Даалгавар')
    expect(nav).toHaveTextContent('AI туслах')
    expect(nav).toHaveTextContent('Тайлан, шинжилгээ')
  })

  it('shows a company-wide CRM snapshot with explainable, non-consent segments', async () => {
    const api = ceoApi()
    render(<LiveManagementApplication api={api} session={ceoSession} />)
    await screen.findByRole('heading', { name: 'Удирдлагын төв' })
    fireEvent.click(screen.getByRole('button', { name: /Харилцагч ба CRM/ }))
    expect(await screen.findByRole('heading', { name: 'Харилцагчийн тойм' })).toBeInTheDocument()
    await waitFor(() => expect(api.getCustomers).toHaveBeenCalledTimes(4))
    expect(screen.getByText('Ариунаа')).toBeInTheDocument()
    expect(screen.getByText(/шинжилгээний харагдац бөгөөд харилцах зөвшөөрөл биш/)).toBeInTheDocument()
    const campaignButton = screen.getByRole('button', { name: 'Кампанит ажил үүсгэх боломжгүй' })
    expect(campaignButton).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '30+ хоног' }))
    expect(screen.getByRole('button', { name: '30+ хоног' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Ариунаа')).toBeInTheDocument()
    expect(screen.queryByText('Sapphire зочин')).not.toBeInTheDocument()
  })

  it('labels the AI assistant as rule-based and keeps decisions with the CEO', async () => {
    render(<LiveManagementApplication api={ceoApi()} session={ceoSession} />)
    await screen.findByRole('heading', { name: 'Удирдлагын төв' })
    fireEvent.click(screen.getByRole('button', { name: /AI туслах/ }))
    expect(await screen.findByRole('heading', { name: 'Өнөөдрийн удирдлагын туслах' })).toBeInTheDocument()
    expect(screen.getByText('AI туслахын шууд холболт хүлээгдэж байна')).toBeInTheDocument()
    expect(screen.getByText(/AI дүгнэлт биш/)).toBeInTheDocument()
    expect(screen.getByText(/зорилго батлах, төлбөр хийх, ажилтны зэрэглэл өөрчлөх эрхгүй/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Салбарын гүйцэтгэл харах/ }))
    expect(await screen.findByRole('heading', { name: 'Салбарын гүйцэтгэл' })).toBeInTheDocument()
  })

  it('shows a dedicated CEO sales-goal screen instead of repeating the branch screen', async () => {
    render(<LiveManagementApplication api={ceoApi()} session={ceoSession} />)
    await screen.findByRole('heading', { name: 'Удирдлагын төв' })
    fireEvent.click(screen.getByRole('button', { name: /Борлуулалт ба зорилт/ }))
    expect(await screen.findByRole('heading', { name: 'Борлуулалт ба зорилт' })).toBeInTheDocument()
    expect(screen.getAllByText('Менежерийн санал').length).toBeGreaterThan(0)
    expect(screen.queryByRole('heading', { name: 'Салбарын гүйцэтгэл' })).not.toBeInTheDocument()
  })

  it('lets the CEO review an unassigned employee before choosing a confirmed branch', async () => {
    render(<LiveManagementApplication api={ceoApi()} session={ceoSession} />)
    await screen.findByRole('heading', { name: 'Удирдлагын төв' })
    fireEvent.click(screen.getByRole('button', { name: /Ажиллах хүч/ }))
    expect(await screen.findByRole('heading', { name: 'Салбарын баг ба ирцийн эрсдэл' })).toBeInTheDocument()
    expect((await screen.findAllByText('Салбаргүй ажилтан')).length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'Салбар оноох' }))
    expect(screen.getByRole('dialog', { name: 'Салбаргүй ажилтан' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Оноох салбар' })).toHaveValue('Monarch')
    expect(screen.getByRole('textbox', { name: 'Оноосон үндэслэл' })).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Баталгаажуулж оноох' })).toBeInTheDocument()
  })

  it('sends the Frappe CSRF token on writes', async () => {
    const fetchMock = vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({ message: {} }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    setFrappeCsrfToken('csrf-test')
    const api = new FrappeManagementApi()
    await api.decideLeave('L-1', 'Approved', '', '2026-08-13')
    const [, options] = fetchMock.mock.calls[0]
    expect(options?.headers).toMatchObject({ 'X-Frappe-CSRF-Token': 'csrf-test' })
  })

  it('opens customers inside the single guest workspace without exposing a full phone', async () => {
    render(<LiveManagementApplication api={managerApi()} session={managerSession} />)
    await screen.findByRole('heading', { name: 'Менежерийн тойм' })
    const managerNav = screen.getByRole('navigation', { name: 'Менежерийн навигац' })
    expect(within(managerNav).getAllByRole('button').filter((button) => button.textContent?.includes('Зочид'))).toHaveLength(1)
    expect(managerNav).not.toHaveTextContent('CRM')
    fireEvent.click(screen.getByRole('button', { name: /Харилцагч хайх/ }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Харилцагчид', level: 1 })).toBeInTheDocument())
    expect(screen.getByRole('navigation', { name: 'Зочдын ажлын хэсэг' })).toHaveTextContent('Өнөөдрийн урсгал')
  })

  it('lets the CEO change the manager proposal amount before approval', async () => {
    window.history.replaceState({}, '', '/manager/?view=approvals')
    const api = ceoApi()
    api.getCompanyDashboard = vi.fn().mockResolvedValue({
      month: '2026-08',
      branches: [],
      pending_goals: [{
        name: 'GOAL-1', branch: 'Nomad', goal_month: '2026-08-01', state: 'Submitted', version: 2,
        baseline_amount: 300000000, proposed_target: 320000000, approved_target: 0,
        manager_rationale: 'Өмнөх сарын өсөлтөд тулгуурласан санал.', submitted_by: 'manager@vipclub.local',
        submitted_at: '2026-08-21 10:00:00', modified: '2026-08-21 10:00:00',
      }],
      totals: { actual_sales: 0, active_target: 0, customers: 0, active_team_members: 0, active_entertainers: 0, unassigned_active_employees: 0, pending_leave: 0, pending_penalties: 0, pending_goals: 1 },
      generated_at: '2026-08-21 10:01:00',
    })
    render(<LiveManagementApplication api={api} session={ceoSession} />)
    expect(await screen.findByRole('heading', { name: 'Менежерүүдээс ирсэн хүсэлт' })).toBeInTheDocument()
    const approvedTarget = await screen.findByLabelText(/Батлах дүн/)
    expect(approvedTarget).toHaveValue(320000000)
    fireEvent.change(approvedTarget, { target: { value: '345000000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Дүнг батлах' }))
    await waitFor(() => expect(api.decideGoal).toHaveBeenCalledWith(
      'GOAL-1', 'approve', '', '2026-08-21 10:00:00', 345000000,
    ))
  })

  it('keeps only the current club shift in the guest-entry feed', async () => {
    const fetchMock = vi.spyOn(window, 'fetch').mockResolvedValue(new Response(JSON.stringify({ message: {
      branch: 'Nomad', work_date: '2026-08-15', window_start: '2026-08-15 12:00:00', window_end: '2026-08-16 12:00:00',
      entries: [
        { name: 'E-1', customer: 'C-1', customer_name: 'Болд', membership_rank: 'Gold', guard_user: 'guard@vipclub.local', guard_name: 'Номин хамгаалагч', entered_at: '2026-08-15 20:10:00', visit_type: 'Returning', visit_number: 4, manager_acknowledged: 0 },
        { name: 'E-OLD', customer: 'C-OLD', customer_name: 'Өмнөх өдрийн зочин', membership_rank: 'Silver', guard_user: 'guard@vipclub.local', guard_name: 'Номин хамгаалагч', entered_at: '2026-08-08 01:16:00', visit_type: 'Returning', visit_number: 2, manager_acknowledged: 0 },
      ],
      reservations: [], pending_reservations: 0, today_total: 1, today_new: 0, unread: 1,
    } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    const feed = await new FrappeManagementApi().getEntryFeed()
    expect(feed.entries.map((entry) => entry.name)).toEqual(['E-1'])
    expect(feed.today_total).toBe(1)
    expect(feed.unread).toBe(1)
    fetchMock.mockRestore()
  })

  it('opens the selected CEO branch and reveals only live company metrics', async () => {
    render(<LiveManagementApplication api={ceoApi()} session={ceoSession} />)
    await screen.findByRole('heading', { name: 'Удирдлагын төв' })
    fireEvent.click(screen.getByRole('button', { name: 'Nomad салбарын дэлгэрэнгүй' }))
    expect(await screen.findByRole('heading', { name: 'Салбарын гүйцэтгэл' })).toBeInTheDocument()
    const branchButton = screen.getByRole('button', { name: /Nomad.*50%/ })
    expect(branchButton).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('heading', { name: 'Борлуулалт' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Баг' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Шийдвэрлэх ажил' })).toBeInTheDocument()
    expect(screen.getByText('1 сая ₮')).toBeInTheDocument()
  })

  it('shows the eight-factor daily score and saves manager adjustments with complaint evidence', async () => {
    const api = managerApi()
    render(<LiveManagementApplication api={api} session={managerSession} />)
    await screen.findByRole('heading', { name: 'Менежерийн тойм' })
    fireEvent.click(screen.getByRole('button', { name: /Миний баг/ }))
    expect(await screen.findByRole('heading', { name: 'Манай баг' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Бүжигчид' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Барны баг' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Хамгаалалтын баг' })).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Профайл' })[0])
    expect(await screen.findByRole('heading', { name: 'Ану', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Энэ сарын борлуулалт')).toBeInTheDocument()
    expect(screen.getByText('500 мянга ₮')).toBeInTheDocument()
    expect(screen.getByText('Нийт борлуулалт')).toBeInTheDocument()
    expect(screen.getByText('9.5 сая ₮')).toBeInTheDocument()
    expect(screen.getByText('Ажилласан сар')).toBeInTheDocument()
    expect(screen.getByText('7 сар')).toBeInTheDocument()
    expect(screen.queryByText('Сүүлийн 62 хоног')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Онооны үнэлгээ' })).toBeInTheDocument()
    expect(screen.getAllByText('86.3/100')).toHaveLength(2)
    expect(screen.getAllByText('Pole, бүжгийн ур чадвар').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'Pole, бүжгийн ур чадвар 5 оноо нэмэх' }))
    await waitFor(() => expect(api.submitDailyRankComponent).toHaveBeenCalledWith(
      'P-1', 'entertaining_skill', 85, '2026-08-13', 'Pole, бүжгийн ур чадвар · 85 оноо болгон шинэчлэв.',
      expect.stringMatching(/^manager-daily-rank-/), undefined,
    ))
    fireEvent.click(screen.getByRole('button', { name: 'Шалтгаантай засах' }))
    fireEvent.input(screen.getByLabelText('Өдрийн үнэлгээний оноо'), { target: { value: '80' } })
    fireEvent.change(screen.getByLabelText('Гомдлын ноцтой байдал'), { target: { value: 'high' } })
    fireEvent.change(screen.getByLabelText('Гомдлын шалтгаан'), { target: { value: 'Зочны баталгаатай гомдол бүртгэгдсэн.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Оноо хадгалах' }))
    await waitFor(() => expect(api.submitDailyRankComponent).toHaveBeenCalledWith(
      'P-1', 'customer_complaints', 80, '2026-08-13', 'Зочны баталгаатай гомдол бүртгэгдсэн.',
      expect.stringMatching(/^manager-daily-rank-/), 'high',
    ))
  })

  it('lets a branch manager hire only into the manager branch', async () => {
    const api = managerApi()
    render(<LiveManagementApplication api={api} session={managerSession} />)
    await screen.findByRole('heading', { name: 'Менежерийн тойм' })
    fireEvent.click(screen.getByRole('button', { name: /Миний баг/ }))
    await screen.findByRole('heading', { name: 'Манай баг' })
    fireEvent.click(screen.getByRole('button', { name: 'Ажилтан авах' }))
    expect(await screen.findByRole('dialog', { name: 'Шинэ ажилтан авах' })).toHaveTextContent('Nomad салбар')
    expect(screen.queryByLabelText('Салбар')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Нэр'), { target: { value: 'Сараа' } })
    fireEvent.change(screen.getByLabelText('Төрсөн огноо'), { target: { value: '2000-01-01' } })
    fireEvent.change(screen.getByLabelText('Ажилд авсан үндэслэл'), { target: { value: 'Батлагдсан орон тоонд авав' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ажилд авах' }))
    await waitFor(() => expect(api.hireEmployee).toHaveBeenCalledWith(expect.objectContaining({ firstName: 'Сараа', branch: 'Nomad' }), expect.stringMatching(/^employee-hire-/)))
  })

  it('gives HR a company-wide workforce view without sales navigation', async () => {
    const api = managerApi()
    render(<LiveManagementApplication api={api} session={hrSession} />)
    expect(await screen.findByRole('heading', { name: 'Манай баг' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Хүний нөөцийн навигац' })).toHaveTextContent('Хүний нөөц')
    expect(screen.getByLabelText('Хүний нөөцийн салбар')).toHaveValue('Monarch')
    expect(screen.queryByText('Харилцагчид')).not.toBeInTheDocument()
    expect(api.getManagerTeam).toHaveBeenCalledWith({ branch: 'Monarch', limit: 100 })
  })

  it('lets a manager approve a pending leave request from the same branch', async () => {
    const api = managerApi()
    render(<LiveManagementApplication api={api} session={managerSession} />)
    await screen.findByRole('heading', { name: 'Менежерийн тойм' })
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Менежерийн навигац' })).getByRole('button', { name: /Чөлөөний хүсэлт/ }))
    expect(await screen.findByRole('heading', { name: 'Чөлөөний хүсэлт' })).toBeInTheDocument()
    expect(screen.getByText('Ажилтны тайлбар')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Зөвшөөрөх' }))
    const dialog = screen.getByRole('dialog', { name: 'Ану' })
    expect(dialog).toHaveTextContent('2026 оны 8-р сарын 14')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Зөвшөөрөх' }))
    await waitFor(() => expect(api.decideLeave).toHaveBeenCalledWith('L-1', 'Approved', '', '2026-08-13', 'Emergency', expect.stringMatching(/^manager-leave-/)))
  })

  it('lets a branch manager set the own-branch late cutoff with an audited reason', async () => {
    const api = managerApi()
    render(<LiveManagementApplication api={api} session={managerSession} />)
    await screen.findByRole('heading', { name: 'Менежерийн тойм' })
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Менежерийн навигац' })).getByRole('button', { name: /Ирцийн хяналт/ }))
    expect(await screen.findByRole('heading', { name: 'Ирцийн хяналт' })).toBeInTheDocument()
    expect(await screen.findByLabelText('Хоцорсонд тооцох цаг')).toHaveValue('22:00')
    fireEvent.change(screen.getByLabelText('Хоцорсонд тооцох цаг'), { target: { value: '22:30' } })
    fireEvent.change(screen.getByLabelText('Өөрчилсөн шалтгаан'), { target: { value: 'Өнөөдрийн хөтөлбөрийн эхлэх цаг өөрчлөгдсөн.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Цаг хадгалах' }))
    await waitFor(() => expect(api.updateBranchLateTime).toHaveBeenCalledWith(
      '22:30',
      'Өнөөдрийн хөтөлбөрийн эхлэх цаг өөрчлөгдсөн.',
      '2026-08-13 12:00:00',
      expect.stringMatching(/^branch-late-time-/),
      'Nomad',
    ))
    expect(await screen.findByText('Nomad салбарын хоцролтын босгыг 22:30 болголоо.')).toBeInTheDocument()
  })

  it('combines leave and entry alerts in the manager notification center', async () => {
    const api = managerApi()
    render(<LiveManagementApplication api={api} session={managerSession} />)
    await screen.findByRole('heading', { name: 'Менежерийн тойм' })
    fireEvent.click(await screen.findByRole('button', { name: 'Мэдэгдэл, 3 уншаагүй' }))
    const panel = screen.getByLabelText('Менежерийн мэдэгдэл')
    expect(panel).toHaveTextContent('Чөлөөний хүсэлт')
    expect(panel).toHaveTextContent('Урьдчилсан захиалга')
    expect(panel).toHaveTextContent('Зочны нэвтрэлт')
    fireEvent.click(within(panel).getByRole('button', { name: /Саруул/ }))
    expect(await screen.findByRole('heading', { name: 'Саруул' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Зочны жагсаалт руу буцах' })).toBeInTheDocument()
    expect(screen.getAllByText('Мөнгө').length).toBeGreaterThan(0)
    expect(screen.getByText('210 мянга ₮')).toBeInTheDocument()
    expect(screen.getByText('Өмнөх ирэлт')).toBeInTheDocument()
    expect(screen.getByText('Дундаж баримт')).toBeInTheDocument()
    expect(screen.getByText('Өмнөх bill ба үйлчилгээ')).toBeInTheDocument()
    expect(api.getReservationSummary).toHaveBeenCalledWith('R-1')
  })

  it('shows the branch entry feed as a dedicated manager view', async () => {
    const api = managerApi()
    render(<LiveManagementApplication api={api} session={managerSession} />)
    await screen.findByRole('heading', { name: 'Менежерийн тойм' })
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Менежерийн навигац' })).getByRole('button', { name: /Зочид/ }))
    expect(await screen.findByRole('heading', { name: 'Өнөөдрийн зочид' })).toBeInTheDocument()
    expect(screen.getByText('4 дахь удаагаа ирж байна')).toBeInTheDocument()
    expect(screen.getByText('1 зочин')).toBeInTheDocument()
    expect(screen.getByText('Урьдчилсан захиалга')).toBeInTheDocument()
    expect(screen.getByText('Саруул')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Зочны товч' })[1])
    expect(await screen.findByRole('heading', { name: 'Болд' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Өмнөх bill ба үйлчилгээ')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Зочны жагсаалт руу буцах' }))
    expect(await screen.findByRole('heading', { name: 'Өнөөдрийн зочид' })).toBeInTheDocument()
  })
})
