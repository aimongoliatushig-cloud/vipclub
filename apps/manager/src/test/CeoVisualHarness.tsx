import React from 'react'
import ReactDOM from 'react-dom/client'
import LiveManagementApplication from '../app/LiveManagementApplication'
import type { FrappeManagementApi } from '../services/managementApi'
import type { ManagementSession } from '../shared/managementAccess'
import '../styles.css'
import '../theme.css'
import { initializeTheme } from '../themeRuntime'

initializeTheme()

const session: ManagementSession = {
  userId: 'ceo.visual@example.test',
  displayName: 'Бат Захирал',
  initials: 'БЗ',
  role: 'ceo',
  branchIds: ['Monarch', 'Sapphire', 'Neva', 'Nomad'],
  permissions: ['company.dashboard.read', 'company.approvals.read', 'company.approvals.write', 'company.branches.read', 'company.crm.read'],
  source: 'server',
}

const branches = [
  { branch: 'Monarch', actual_sales: 268_000_000, active_target: 300_000_000, achievement_percent: 89, remaining_amount: 32_000_000, customers: 86, customer_total_spend: 258_000_000, active_team_members: 32, active_entertainers: 24, pending_leave: 1, pending_penalties: 0, monthly_penalty_records: 1, approved_penalty_amount: 0, goal: { name: 'G-MON', state: 'Active', proposed_target: 300_000_000, approved_target: 300_000_000, baseline_amount: 252_000_000 } },
  { branch: 'Sapphire', actual_sales: 231_000_000, active_target: 280_000_000, achievement_percent: 83, remaining_amount: 49_000_000, customers: 74, customer_total_spend: 221_000_000, active_team_members: 29, active_entertainers: 22, pending_leave: 0, pending_penalties: 1, monthly_penalty_records: 2, approved_penalty_amount: 15_000, goal: { name: 'G-SAP', state: 'Active', proposed_target: 280_000_000, approved_target: 280_000_000, baseline_amount: 224_000_000 } },
  { branch: 'Neva', actual_sales: 176_000_000, active_target: 260_000_000, achievement_percent: 68, remaining_amount: 84_000_000, customers: 59, customer_total_spend: 169_000_000, active_team_members: 25, active_entertainers: 19, pending_leave: 2, pending_penalties: 1, monthly_penalty_records: 3, approved_penalty_amount: 25_000, goal: { name: 'G-NEV', state: 'Active', proposed_target: 260_000_000, approved_target: 260_000_000, baseline_amount: 205_000_000 } },
  { branch: 'Nomad', actual_sales: 214_000_000, active_target: 320_000_000, achievement_percent: 67, remaining_amount: 106_000_000, customers: 68, customer_total_spend: 203_000_000, active_team_members: 24, active_entertainers: 18, pending_leave: 2, pending_penalties: 0, monthly_penalty_records: 1, approved_penalty_amount: 0, goal: { name: 'G-NOM', state: 'Active', proposed_target: 320_000_000, approved_target: 320_000_000, baseline_amount: 238_000_000 } },
]

const customersByBranch = {
  Monarch: [
    { name: 'C-MON-1', customer_name: 'Ариунаа', phone: '•••• 1042', membership_rank: 'Black Diamond', visit_count: 24, bill_count: 19, total_spend: 18_600_000, average_bill: 978_947, last_visit: '2026-08-15' },
    { name: 'C-MON-2', customer_name: 'Тэмүүлэн', phone: '•••• 8801', membership_rank: 'Gold', visit_count: 11, bill_count: 9, total_spend: 7_420_000, average_bill: 824_444, last_visit: '2026-06-28' },
  ],
  Sapphire: [
    { name: 'C-SAP-1', customer_name: 'Мишээл', phone: '•••• 3315', membership_rank: 'Diamond', visit_count: 18, bill_count: 14, total_spend: 12_300_000, average_bill: 878_571, last_visit: '2026-08-09' },
    { name: 'C-SAP-2', customer_name: 'Билгүүн', phone: '•••• 4670', membership_rank: 'Silver', visit_count: 7, bill_count: 6, total_spend: 3_180_000, average_bill: 530_000, last_visit: null },
  ],
  Neva: [
    { name: 'C-NEV-1', customer_name: 'Номин', phone: '•••• 7508', membership_rank: 'Gold', visit_count: 13, bill_count: 10, total_spend: 8_900_000, average_bill: 890_000, last_visit: '2026-07-01' },
    { name: 'C-NEV-2', customer_name: 'Энхжин', phone: '•••• 2084', membership_rank: 'Bronze', visit_count: 4, bill_count: 3, total_spend: 1_420_000, average_bill: 473_333, last_visit: '2026-08-12' },
  ],
  Nomad: [
    { name: 'C-NOM-1', customer_name: 'Саруул', phone: '•••• 9216', membership_rank: 'Diamond', visit_count: 20, bill_count: 16, total_spend: 14_750_000, average_bill: 921_875, last_visit: '2026-08-16' },
    { name: 'C-NOM-2', customer_name: 'Ананд', phone: '•••• 6144', membership_rank: 'Unassigned', visit_count: 2, bill_count: 2, total_spend: 640_000, average_bill: 320_000, last_visit: null },
  ],
} as const

const api = {
  getCompanyDashboard: async () => ({
    month: '2026-08', branches, pending_goals: [],
    totals: { actual_sales: 889_000_000, active_target: 1_160_000_000, customers: 287, active_team_members: 110, active_entertainers: 83, unassigned_active_employees: 2, pending_leave: 5, pending_penalties: 2, pending_goals: 0 },
    generated_at: '2026-08-17 14:30:00',
  }),
  getCeoRankReviews: async () => ({ reviews: [], meta: { total: 0 } }),
  getCustomers: async ({ branch }: { branch?: string } = {}) => {
    const resolvedBranch = (branch ?? 'Monarch') as keyof typeof customersByBranch
    const customers = [...(customersByBranch[resolvedBranch] ?? [])]
    return { branch: resolvedBranch, customers, meta: { total: customers.length } }
  },
  getPenalties: async () => ({ branch: 'Monarch', penalties: [], meta: { total: 0 } }),
  logout: async () => undefined,
} as unknown as FrappeManagementApi

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><LiveManagementApplication api={api} session={session} /></React.StrictMode>,
)
