import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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

function managerApi() {
  return {
    getSalesProgress: vi.fn().mockResolvedValue({ branch: 'Nomad', month: '2026-08', active_goal: { name: 'G-1', goal_month: '2026-08-01', state: 'Active', version: 1, approved_target: 1000000, modified: '2026-08-13' }, actual_sales: 600000, achievement_percent: 60, remaining_amount: 400000, actual_source: 'VIP POS Bill' }),
    getManagerDashboard: vi.fn().mockResolvedValue({ branch: 'Nomad', date: '2026-08-13', summary: { total: 1, scheduled: 1, checked_in: 1, late: 0, absent: 0, leave: 0, off: 0, pending_readiness: 0, pending_leave: 1, pending_corrections: 0, pending_profile_changes: 0 }, roster: [{ profile: 'P-1', display_name: 'Ану', rank: 'Rank 1', status: 'checked_in', work_date: '2026-08-13', shift: { shift_type: 'Night' }, availability: { status: 'Available' } }], meta: { total: 1 } }),
    getManagerTeam: vi.fn().mockResolvedValue({ branch: 'Nomad', date: '2026-08-13', members: [{ employee: 'EMP-1', profile: 'P-1', display_name: 'Ану', role_label: 'Энтертайнер', member_type: 'Entertainer', rank: 'Rank 1', shift: { shift_type: 'Night' }, status: 'Active' }], meta: { total: 1, entertainer_total: 1 } }),
    getLeaveRequests: vi.fn().mockResolvedValue({ requests: [{ name: 'L-1', entertainer: 'P-1', branch: 'Nomad', display_name: 'Ану', leave_date: '2026-08-14', status: 'Pending', requested_at: '2026-08-13 10:00:00', reason: 'Гэр бүлийн шалтгаан', modified: '2026-08-13' }], meta: { total: 1 } }),
    getPenalties: vi.fn().mockResolvedValue({ branch: 'Nomad', penalties: [], meta: { total: 0 } }),
    getCustomers: vi.fn().mockResolvedValue({ branch: 'Nomad', customers: [{ name: 'C-1', customer_name: 'Болд', phone: '•••• 1122', membership_rank: 'Gold', visit_count: 8, bill_count: 6, total_spend: 800000, average_bill: 133333 }], meta: { total: 1 } }),
  } as unknown as FrappeManagementApi
}

function ceoApi() {
  return {
    getCompanyDashboard: vi.fn().mockResolvedValue({ month: '2026-08', branches: ['Monarch', 'Sapphire', 'Neva', 'Nomad'].map((branch) => ({ branch, actual_sales: 100000, active_target: 200000, achievement_percent: 50, remaining_amount: 100000, customers: 10, customer_total_spend: 1000000, active_team_members: 5, active_entertainers: 2, pending_leave: 0, pending_penalties: 0, monthly_penalty_records: 0, approved_penalty_amount: 0 })), pending_goals: [], totals: { actual_sales: 400000, active_target: 800000, customers: 40, active_team_members: 20, active_entertainers: 8, unassigned_active_employees: 3, pending_leave: 0, pending_penalties: 0, pending_goals: 0 }, generated_at: '2026-08-13' }),
    getUnassignedEmployees: vi.fn().mockResolvedValue({ employees: [{ name: 'HR-EMP-99', employee_name: 'Салбаргүй ажилтан', designation: 'Зөөгч', department: 'Үйлчилгээ', company: 'Nomad VIP', status: 'Active', modified: '2026-08-13 12:00:00' }], branches: ['Monarch', 'Sapphire', 'Neva', 'Nomad'], meta: { total: 1 } }),
    assignEmployeeBranch: vi.fn().mockResolvedValue({ employee: { name: 'HR-EMP-99', employee_name: 'Салбаргүй ажилтан', branch: 'Nomad', status: 'Active', modified: '2026-08-13 12:01:00' }, replayed: false }),
  } as unknown as FrappeManagementApi
}

describe('live role-aware management application', () => {
  it('shows a manager-only branch overview from server data', async () => {
    render(<LiveManagementApplication api={managerApi()} session={managerSession} />)
    expect(await screen.findByRole('heading', { name: 'Менежерийн тойм' })).toBeInTheDocument()
    expect(screen.getByText('600 мянга ₮')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Менежерийн навигац' })).toHaveTextContent('Чөлөөний хүсэлт')
    expect(screen.queryByText('Санхүү ба тооцоо')).not.toBeInTheDocument()
  })

  it('keeps the full CEO navigation while using a company-wide live summary', async () => {
    render(<LiveManagementApplication api={ceoApi()} session={ceoSession} />)
    expect(await screen.findByRole('heading', { name: 'Удирдлагын төв' })).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Гүйцэтгэх захирлын навигац' })
    expect(nav).toHaveTextContent('Санхүү ба тооцоо')
    expect(nav).toHaveTextContent('Даалгавар')
    expect(nav).toHaveTextContent('Hermes зөвлөмж')
    expect(nav).toHaveTextContent('Тайлан, шинжилгээ')
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

  it('opens the live CRM without exposing a full phone', async () => {
    render(<LiveManagementApplication api={managerApi()} session={managerSession} />)
    await screen.findByRole('heading', { name: 'Менежерийн тойм' })
    fireEvent.click(screen.getByRole('button', { name: /Харилцагчийн CRM/ }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Харилцагчийн CRM' })).toBeInTheDocument())
  })
})
