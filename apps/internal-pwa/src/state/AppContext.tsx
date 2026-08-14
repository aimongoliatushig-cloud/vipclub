import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/useAuth'
import { cloneSnapshot } from '../data/fixtures'
import { createExecutiveNotifications } from '../data/notifications'
import type { AppSnapshot, ApprovalStatus, CreateConversationInput, CreateTaskInput, HermesFeedbackInput, HermesStatus, RecordAuditInput, TaskStatus, UpdateBranchSettingInput } from '../domain/types'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import type { AppServices } from '../services/contracts'
import { createMockServices } from '../services/mockServices'
import { scopeSnapshot, type ServiceAccessContext } from '../services/serviceAccess'
import { AppContext, ApprovalDecisionError, type AppContextValue, type ToastMessage } from './appContextState'

export type AppServiceFactory = (access: ServiceAccessContext) => AppServices

interface AppProviderProps {
  children: ReactNode
  serviceFactory?: AppServiceFactory
}

const formatRefreshTime = () => new Intl.DateTimeFormat('mn-MN', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
}).format(new Date())

export function AppProvider({ children, serviceFactory = createMockServices }: AppProviderProps) {
  const { session } = useAuth()
  const online = useOnlineStatus()
  const access = useMemo<ServiceAccessContext>(() => ({
    actor: session.displayName,
    role: session.role,
    branchIds: session.branchIds,
    companyWide: session.role === 'CEO',
  }), [session.displayName, session.role, session.branchIds])
  const services = useMemo(() => serviceFactory(access), [access, serviceFactory])
  const [snapshot, setSnapshot] = useState<AppSnapshot>(() => scopeSnapshot(cloneSnapshot(), access))
  const [notifications, setNotifications] = useState(() => createExecutiveNotifications(scopeSnapshot(cloneSnapshot(), access)))
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [lastRefreshedAt, setLastRefreshedAt] = useState('08:20')
  const [toast, setToast] = useState<ToastMessage | null>(null)

  const notify = useCallback((message: Omit<ToastMessage, 'id'>) => {
    setToast({ ...message, id: Date.now() })
  }, [])

  const requireOnline = useCallback(() => {
    if (online) return
    const message = 'Офлайн үед өөрчлөлт хадгалахгүй. Холболт сэргэсний дараа дахин оролдоно уу.'
    notify({ title: 'Үйлдэл хаалттай', description: message, tone: 'danger' })
    throw new Error(message)
  }, [notify, online])

  const refresh = useCallback(async () => {
    if (!online) {
      setRefreshError('Интернет холболтгүй байна. Хувийн мэдээлэл дахин холбогдох хүртэл ачаалагдахгүй.')
      return
    }
    setRefreshing(true)
    setRefreshError(null)
    try {
      const [branches, branchSettings, customers, approvals, tasks, threads, hermesDaily, hermesMonthly, recommendations, settlements, workforce, managers, employees, auditEvents] =
        await Promise.all([
          services.branches.list(),
          services.branchSettings.list(),
          services.customers.list(),
          services.approvals.list(),
          services.tasks.list(),
          services.messaging.list(),
          services.hermes.daily(),
          services.hermes.monthly(),
          services.hermes.list(),
          services.settlements.list(),
          services.workforce.list(),
          services.people.listManagers(),
          services.people.listEmployees(),
          services.audit.list(),
        ])
      setSnapshot({ branches, branchSettings, customers, approvals, tasks, threads, hermesDaily, hermesMonthly, recommendations, settlements, workforce, managers, employees, auditEvents })
      setLastRefreshedAt(formatRefreshTime())
    } catch {
      setRefreshError('Эх сурвалжтай холбогдож чадсангүй. Сүүлд амжилттай авсан snapshot өөрчлөгдөөгүй.')
    } finally {
      setRefreshing(false)
    }
  }, [online, services])

  const updateTarget = useCallback(
    async (branchId: string, target: number) => {
      requireOnline()
      const branch = await services.branches.updateTarget(branchId, target)
      setSnapshot((current) => ({
        ...current,
        branches: current.branches.map((item) => (item.id === branch.id ? branch : item)),
      }))
      notify({ title: 'Сарын зорилт шинэчлэгдлээ', description: `${branch.name} · ${target.toFixed(1)} сая ₮`, tone: 'success' })
    },
    [notify, requireOnline, services],
  )

  const updateBranchSetting = useCallback(
    async (branchId: string, settingId: string, input: UpdateBranchSettingInput) => {
      requireOnline()
      const setting = await services.branchSettings.update(branchId, settingId, input)
      const auditEvents = await services.audit.list()
      setSnapshot((current) => ({
        ...current,
        branchSettings: current.branchSettings.map((item) => item.id === setting.id ? setting : item),
        auditEvents,
      }))
      notify({
        title: setting.status === 'pending-approval' ? 'CEO хяналтад илгээлээ' : setting.status === 'scheduled' ? 'Өөрчлөлтийг товлолоо' : 'Тохиргоо шинэчлэгдлээ',
        description: `${setting.label} · v${setting.version}`,
        tone: 'success',
      })
    },
    [notify, requireOnline, services],
  )

  const decideApproval = useCallback(
    async (id: string, status: Exclude<ApprovalStatus, 'pending'>, reason: string, expectedUpdatedAt: string, overrideValue?: string) => {
      requireOnline()
      try {
        const approval = await services.approvals.decide(id, { status, reason, expectedUpdatedAt, overrideValue })
        const settlements = approval.type === 'settlement' ? await services.settlements.list() : undefined
        const auditEvents = await services.audit.list()
        setSnapshot((current) => ({
          ...current,
          approvals: current.approvals.map((item) => (item.id === approval.id ? approval : item)),
          settlements: settlements ?? current.settlements,
          auditEvents,
        }))
        setNotifications((current) => current.map((item) => item.target.includes(`selected=${approval.id}`) ? { ...item, readAt: new Date().toISOString() } : item))
        notify({
          title: status === 'approved'
            ? 'Шийдвэр батлагдлаа'
            : status === 'returned'
              ? 'Хяналтад буцаалаа'
              : status === 'retained'
                ? 'Одоогийн төлөвийг үлдээлээ'
                : status === 'overridden'
                  ? 'Эрх бүхий override хадгалагдлаа'
                  : 'Шийдвэр татгалзлаа',
          description: approval.subject,
          tone: status === 'approved' || status === 'retained' || status === 'overridden' ? 'success' : 'neutral',
        })
      } catch (error) {
        let reconciledStatus: ApprovalStatus | undefined
        try {
          const [approvals, settlements, auditEvents] = await Promise.all([
            services.approvals.list(),
            services.settlements.list(),
            services.audit.list(),
          ])
          reconciledStatus = approvals.find((item) => item.id === id)?.status
          setSnapshot((current) => ({ ...current, approvals, settlements, auditEvents }))
        } catch {
          // Preserve the original decision error when reconciliation is temporarily unavailable.
        }
        notify({
          title: 'Шийдвэр хадгалагдсангүй',
          description: error instanceof Error ? error.message : 'Queue мэдээллийг дахин шалгана уу.',
          tone: 'danger',
        })
        throw new ApprovalDecisionError(
          error instanceof Error ? error.message : 'Queue мэдээллийг дахин шалгана уу.',
          reconciledStatus,
        )
      }
    },
    [notify, requireOnline, services],
  )

  const createTask = useCallback(
    async (input: CreateTaskInput) => {
      requireOnline()
      const task = await services.tasks.create(input)
      setSnapshot((current) => ({ ...current, tasks: [task, ...current.tasks] }))
      notify({ title: 'Даалгавар үүслээ', description: task.title, tone: 'success' })
      return task
    },
    [notify, requireOnline, services],
  )

  const commentTask = useCallback(
    async (id: string, body: string) => {
      requireOnline()
      const task = await services.tasks.comment(id, body)
      setSnapshot((current) => ({ ...current, tasks: current.tasks.map((item) => (item.id === task.id ? task : item)) }))
    },
    [requireOnline, services],
  )

  const setTaskStatus = useCallback(
    async (id: string, status: TaskStatus) => {
      requireOnline()
      const task = await services.tasks.setStatus(id, status)
      const auditEvents = await services.audit.list()
      setSnapshot((current) => ({ ...current, tasks: current.tasks.map((item) => (item.id === task.id ? task : item)), auditEvents }))
      notify({ title: 'Даалгаврын төлөв шинэчлэгдлээ', description: task.title, tone: 'success' })
    },
    [notify, requireOnline, services],
  )

  const sendMessage = useCallback(
    async (threadId: string, body: string) => {
      requireOnline()
      const thread = await services.messaging.send(threadId, body)
      setSnapshot((current) => ({
        ...current,
        threads: current.threads.map((item) => (item.id === thread.id ? thread : item)),
      }))
    },
    [requireOnline, services],
  )

  const openConversation = useCallback(
    async (threadId: string) => {
      requireOnline()
      const thread = await services.messaging.open(threadId)
      const auditEvents = await services.audit.list()
      setSnapshot((current) => ({
        ...current,
        threads: current.threads.map((item) => (item.id === thread.id ? thread : item)),
        auditEvents,
      }))
    },
    [requireOnline, services],
  )

  const createConversation = useCallback(
    async (input: CreateConversationInput) => {
      requireOnline()
      const thread = await services.messaging.create(input)
      const auditEvents = await services.audit.list()
      setSnapshot((current) => ({ ...current, threads: [thread, ...current.threads], auditEvents }))
      notify({ title: 'Яриа үүслээ', description: thread.title, tone: 'success' })
      return thread
    },
    [notify, requireOnline, services],
  )

  const openEmployee = useCallback(
    async (id: string) => {
      requireOnline()
      const employee = await services.people.openEmployee(id)
      const auditEvents = await services.audit.list()
      setSnapshot((current) => ({
        ...current,
        employees: current.employees.map((item) => (item.id === employee.id ? employee : item)),
        auditEvents,
      }))
      return employee
    },
    [requireOnline, services],
  )

  const actOnRecommendation = useCallback(
    async (id: string, status: HermesStatus) => {
      requireOnline()
      const result = await services.hermes.act(id, status)
      setSnapshot((current) => ({
        ...current,
        recommendations: current.recommendations.map((item) =>
          item.id === result.recommendation.id ? result.recommendation : item,
        ),
        tasks: result.task ? [result.task, ...current.tasks] : current.tasks,
      }))
      notify({
        title: status === 'converted' ? 'Зөвлөмжийг даалгавар болголоо' : 'Hermes зөвлөмж шинэчлэгдлээ',
        description: result.recommendation.title,
        tone: status === 'converted' ? 'success' : 'neutral',
      })
      return result.task
    },
    [notify, requireOnline, services],
  )

  const openRecommendation = useCallback(
    async (id: string) => {
      requireOnline()
      const recommendation = await services.hermes.open(id)
      const auditEvents = await services.audit.list()
      setSnapshot((current) => ({
        ...current,
        recommendations: current.recommendations.map((item) => item.id === recommendation.id ? recommendation : item),
        auditEvents,
      }))
    },
    [requireOnline, services],
  )

  const annotateRecommendation = useCallback(
    async (id: string, body: string) => {
      requireOnline()
      const recommendation = await services.hermes.annotate(id, body)
      const auditEvents = await services.audit.list()
      setSnapshot((current) => ({ ...current, recommendations: current.recommendations.map((item) => item.id === recommendation.id ? recommendation : item), auditEvents }))
      notify({ title: 'Тэмдэглэл хадгалагдлаа', description: recommendation.title, tone: 'success' })
    },
    [notify, requireOnline, services],
  )

  const submitHermesFeedback = useCallback(
    async (id: string, input: HermesFeedbackInput) => {
      requireOnline()
      const recommendation = await services.hermes.feedback(id, input)
      const auditEvents = await services.audit.list()
      setSnapshot((current) => ({ ...current, recommendations: current.recommendations.map((item) => item.id === recommendation.id ? recommendation : item), auditEvents }))
      notify({ title: 'Hermes feedback тусад нь хадгалагдлаа', description: 'Business шийдвэр болон recommendation status өөрчлөгдөөгүй.', tone: 'success' })
    },
    [notify, requireOnline, services],
  )

  const discussRecommendation = useCallback(
    async (id: string) => {
      requireOnline()
      const thread = await services.hermes.openConversation(id)
      const recommendations = await services.hermes.list()
      const auditEvents = await services.audit.list()
      setSnapshot((current) => ({
        ...current,
        threads: current.threads.some((item) => item.id === thread.id) ? current.threads.map((item) => item.id === thread.id ? thread : item) : [thread, ...current.threads],
        recommendations,
        auditEvents,
      }))
      return thread
    },
    [requireOnline, services],
  )

  const recordAudit = useCallback(
    async (input: RecordAuditInput) => {
      requireOnline()
      const event = await services.audit.record(input)
      setSnapshot((current) => ({ ...current, auditEvents: [event, ...current.auditEvents] }))
      notify({
        title: input.action === 'Export хүсэлт үүсгэсэн' ? 'Export хүсэлт бүртгэгдлээ' : 'Audit event бүртгэгдлээ',
        description: input.target,
        tone: 'success',
      })
    },
    [notify, requireOnline, services],
  )

  const visibleSnapshot = useMemo(() => {
    const scoped = scopeSnapshot(snapshot, access)
    if (online || session.source === 'demo') return scoped
    return {
      branches: [],
      branchSettings: [],
      customers: [],
      approvals: [],
      tasks: [],
      threads: [],
      hermesDaily: { ...scoped.hermesDaily, items: [], summary: 'Офлайн үед live briefing ачаалахгүй.', knownMissingData: ['Live connection unavailable'] },
      hermesMonthly: { ...scoped.hermesMonthly, branches: [], summary: 'Офлайн үед live monthly review ачаалахгүй.', knownMissingData: ['Live connection unavailable'] },
      recommendations: [],
      settlements: [],
      workforce: [],
      managers: [],
      employees: [],
      auditEvents: [],
    }
  }, [access, online, session.source, snapshot])
  const visibleNotifications = useMemo(() => {
    if (!online && session.source !== 'demo') return []
    return notifications.filter((item) => !item.branchId || access.companyWide || access.branchIds.includes(item.branchId))
  }, [access.branchIds, access.companyWide, notifications, online, session.source])
  const markNotificationRead = useCallback((id: string) => {
    setNotifications((current) => current.map((item) => item.id === id && !item.readAt ? { ...item, readAt: new Date().toISOString() } : item))
  }, [])
  const markAllNotificationsRead = useCallback(() => {
    const readAt = new Date().toISOString()
    setNotifications((current) => current.map((item) => item.readAt ? item : { ...item, readAt }))
  }, [])

  const value = useMemo<AppContextValue>(
    () => ({
      ...visibleSnapshot,
      online,
      notifications: visibleNotifications,
      refreshing,
      refreshError,
      lastRefreshedAt,
      toast,
      refresh,
      updateTarget,
      updateBranchSetting,
      decideApproval,
      createTask,
      commentTask,
      setTaskStatus,
      openConversation,
      sendMessage,
      createConversation,
      openEmployee,
      openRecommendation,
      actOnRecommendation,
      annotateRecommendation,
      submitHermesFeedback,
      discussRecommendation,
      recordAudit,
      markNotificationRead,
      markAllNotificationsRead,
      clearToast: () => setToast(null),
    }),
    [visibleSnapshot, online, visibleNotifications, refreshing, refreshError, lastRefreshedAt, toast, refresh, updateTarget, updateBranchSetting, decideApproval, createTask, commentTask, setTaskStatus, openConversation, sendMessage, createConversation, openEmployee, openRecommendation, actOnRecommendation, annotateRecommendation, submitHermesFeedback, discussRecommendation, recordAudit, markNotificationRead, markAllNotificationsRead],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
