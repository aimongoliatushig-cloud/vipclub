import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../auth/AuthProvider'
import { RequireBranchScope, RequirePermission, RequireSession } from '../auth/RouteGuards'
import type { AuthSession, ExecutivePermission } from '../auth/types'
import type { SessionAdapter } from '../auth/sessionAdapter'
import { useAuth } from '../auth/useAuth'
import { AppShell } from '../components/layout/AppShell'
import { ScreenLoader } from '../components/layout/ScreenLoader'
import AccessStatePage from '../pages/AccessStatePage'
import { AppProvider, type AppServiceFactory } from '../state/AppContext'

const LoginPage = lazy(() => import('../pages/LoginPage'))
const CommandCenterPage = lazy(() => import('../pages/CommandCenterPage'))
const BranchesPage = lazy(() => import('../pages/BranchesPage'))
const BranchSettingsPage = lazy(() => import('../pages/BranchSettingsPage'))
const SalesGoalsPage = lazy(() => import('../pages/SalesGoalsPage'))
const CustomersPage = lazy(() => import('../pages/CustomersPage'))
const WorkforcePage = lazy(() => import('../pages/WorkforcePage'))
const PerformancePage = lazy(() => import('../pages/PerformancePage'))
const ApprovalsPage = lazy(() => import('../pages/ApprovalsPage'))
const FinancePage = lazy(() => import('../pages/FinancePage'))
const TasksPage = lazy(() => import('../pages/TasksPage'))
const MessagesPage = lazy(() => import('../pages/MessagesPage'))
const HermesPage = lazy(() => import('../pages/HermesPage'))
const ReportsPage = lazy(() => import('../pages/ReportsPage'))
const NotificationsPage = lazy(() => import('../pages/NotificationsPage'))
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'))
const permitted = (permission: ExecutivePermission, page: ReactNode) => (
  <RequirePermission permission={permission}>{page}</RequirePermission>
)

function RoleHome() {
  const { session } = useAuth()
  if (session.role === 'Branch Manager') return <Navigate to="/branches" replace />
  return permitted('dashboard.read', <CommandCenterPage />)
}

export default function ExecutiveApplication({ initialSession, serviceFactory, sessionAdapter }: { initialSession?: AuthSession; serviceFactory?: AppServiceFactory; sessionAdapter?: SessionAdapter }) {
  const routerBase = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

  return (
    <AuthProvider initialSession={initialSession} sessionAdapter={sessionAdapter}>
      <AppProvider serviceFactory={serviceFactory}>
        <BrowserRouter basename={routerBase}>
          <Suspense fallback={<ScreenLoader />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/session-expired" element={<AccessStatePage variant="expired" />} />
              <Route path="/access-denied" element={<AccessStatePage variant="denied" />} />
              <Route element={<RequireSession><AppShell /></RequireSession>}>
                <Route index element={<RoleHome />} />
                <Route path="branches" element={permitted('branches.read', <BranchesPage />)} />
                <Route path="branches/:branchId" element={permitted('branches.read', <RequireBranchScope><BranchesPage /></RequireBranchScope>)} />
                <Route path="branches/:branchId/health" element={permitted('branches.read', <RequireBranchScope><BranchesPage /></RequireBranchScope>)} />
                <Route path="branches/:branchId/timeline" element={permitted('branches.read', <RequireBranchScope><BranchesPage /></RequireBranchScope>)} />
                <Route path="branches/:branchId/settings" element={permitted('branch-settings.read', <RequireBranchScope><BranchSettingsPage /></RequireBranchScope>)} />
                <Route path="sales" element={permitted('sales.read', <SalesGoalsPage />)} />
                <Route path="sales/goals" element={permitted('sales.read', <SalesGoalsPage />)} />
                <Route path="sales/action-plans" element={permitted('sales.read', <SalesGoalsPage />)} />
                <Route path="sales/history" element={permitted('sales.read', <SalesGoalsPage />)} />
                <Route path="customers" element={permitted('customers.read', <CustomersPage />)} />
                <Route path="customers/outreach" element={permitted('customers.read', <CustomersPage />)} />
                <Route path="customers/:customerId" element={permitted('customers.read', <CustomersPage />)} />
                <Route path="workforce" element={permitted('workforce.read', <WorkforcePage />)} />
                <Route path="workforce/coverage" element={permitted('workforce.read', <WorkforcePage />)} />
                <Route path="workforce/attendance" element={permitted('workforce.read', <WorkforcePage />)} />
                <Route path="workforce/manager-evidence" element={permitted('workforce.read', <WorkforcePage />)} />
                <Route path="workforce/forecast" element={permitted('workforce.read', <WorkforcePage />)} />
                <Route path="performance" element={permitted('performance.read', <PerformancePage />)} />
                <Route path="people/managers" element={permitted('performance.read', <PerformancePage />)} />
                <Route path="people/managers/:managerId" element={permitted('performance.read', <PerformancePage />)} />
                <Route path="people/employees" element={permitted('performance.read', <PerformancePage />)} />
                <Route path="people/employees/:employeeId" element={permitted('performance.read', <PerformancePage />)} />
                <Route path="approvals" element={permitted('approvals.read', <ApprovalsPage />)} />
                <Route path="finance" element={permitted('finance.read', <FinancePage />)} />
                <Route path="finance/payments" element={permitted('finance.read', <FinancePage />)} />
                <Route path="finance/:batchId" element={permitted('finance.read', <FinancePage />)} />
                <Route path="finance/:batchId/entertainers" element={permitted('finance.read', <FinancePage />)} />
                <Route path="tasks" element={permitted('tasks.read', <TasksPage />)} />
                <Route path="tasks/:taskId" element={permitted('tasks.read', <TasksPage />)} />
                <Route path="messages" element={permitted('messages.read', <MessagesPage />)} />
                <Route path="messages/:threadId" element={permitted('messages.read', <MessagesPage />)} />
                <Route path="hermes" element={permitted('hermes.read', <HermesPage />)} />
                <Route path="hermes/monthly" element={permitted('hermes.read', <HermesPage />)} />
                <Route path="hermes/:recommendationId" element={permitted('hermes.read', <HermesPage />)} />
                <Route path="reports" element={permitted('reports.read', <ReportsPage />)} />
                <Route path="reports/analytics" element={permitted('reports.read', <ReportsPage />)} />
                <Route path="reports/audit" element={permitted('reports.read', <ReportsPage />)} />
                <Route path="notifications" element={permitted('notifications.read', <NotificationsPage />)} />
                <Route path="home" element={<Navigate to="/" replace />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  )
}
