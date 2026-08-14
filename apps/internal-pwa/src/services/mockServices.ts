import { cloneSnapshot } from '../data/fixtures'
import type {
  Approval,
  AuditEvent,
  Branch,
  BranchSetting,
  CreateConversationInput,
  CreateTaskInput,
  DecisionInput,
  ExecutiveTask,
  HermesFeedbackInput,
  HermesStatus,
  MessageItem,
  MessageThread,
  TaskStatus,
} from '../domain/types'
import type { AppServices, HermesActionResult } from './contracts'
import { validateAppSnapshot, validateFixtureReconciliation, withContractValidation } from './contractValidation'
import {
  assertBranchAccess,
  canAccessScopedRecord,
  demoCeoAccess,
  scopeSnapshot,
  type ServiceAccessContext,
} from './serviceAccess'

const clone = <T,>(value: T): T => structuredClone(value)

const nowTime = () =>
  new Intl.DateTimeFormat('mn-MN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

export const createMockServices = (access: ServiceAccessContext = demoCeoAccess): AppServices => {
  const db = validateAppSnapshot(cloneSnapshot())
  validateFixtureReconciliation(db)
  const recentExportRequests: number[] = []

  const addAudit = (event: Omit<AuditEvent, 'id' | 'createdAt' | 'correlationId'>): AuditEvent => {
    const auditEvent: AuditEvent = {
      ...event,
      id: generateId('audit'),
      createdAt: `2026.08.12 ${nowTime()}`,
      correlationId: `AUD-DEMO-${Date.now()}`,
    }
    db.auditEvents.unshift(auditEvent)
    return auditEvent
  }

  const findBranch = (branchId: string): Branch => {
    assertBranchAccess(access, branchId)
    const branch = db.branches.find((item) => item.id === branchId)
    if (!branch) throw new Error('Салбар олдсонгүй.')
    return branch
  }

  const services: AppServices = {
    branches: {
      async list() {
        return clone(scopeSnapshot(db, access).branches)
      },
      async updateTarget(branchId, target) {
        if (!Number.isFinite(target) || target <= 0) throw new Error('Борлуулалтын зорилт 0-ээс их тоо байна.')
        const branch = findBranch(branchId)
        branch.salesTarget = target
        addAudit({
          actor: access.actor,
          role: access.role,
          action: 'Сарын зорилт шинэчилсэн',
          target: `${branch.name} · ${target.toFixed(1)} сая ₮`,
          branchId,
          reason: 'CEO prototype action',
        })
        return clone(branch)
      },
    },
    branchSettings: {
      async list() {
        return clone(scopeSnapshot(db, access).branchSettings)
      },
      async update(branchId, settingId, input): Promise<BranchSetting> {
        assertBranchAccess(access, branchId)
        const setting = db.branchSettings.find((item) => item.id === settingId && item.branchId === branchId)
        if (!setting) throw new Error('Салбарын тохиргоо олдсонгүй эсвэл хандах эрхгүй.')
        const editable = access.role === 'CEO' ? setting.ceoEditable : setting.managerEditable
        if (!editable || setting.status === 'locked' || setting.valueType === 'masked') {
          throw new Error(setting.lockedReason ?? 'Энэ тохиргоог таны эрхээр өөрчлөх боломжгүй.')
        }
        const value = input.value.trim()
        const reason = input.reason.trim()
        if (!value) throw new Error('Тохиргооны утга шаардлагатай.')
        if (value.length > 300) throw new Error('Тохиргооны утга 300 тэмдэгтээс урт байж болохгүй.')
        if (reason.length < 5) throw new Error('Өөрчлөлтийн шалтгаан хамгийн багадаа 5 тэмдэгт байна.')
        if (!/^\d{4}-\d{2}-\d{2}$/.test(input.effectiveFrom) || Number.isNaN(Date.parse(`${input.effectiveFrom}T00:00:00+08:00`))) {
          throw new Error('Хүчин төгөлдөр болох огноо шаардлагатай.')
        }
        if (setting.valueType === 'number' && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
          throw new Error('Тоон тохиргоонд 0 эсвэл түүнээс их утга оруулна уу.')
        }
        if (setting.valueType === 'time' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
          throw new Error('Цагийн утгыг HH:MM хэлбэрээр оруулна уу.')
        }
        if (setting.version !== input.expectedVersion) {
          throw new Error('Тохиргооны хувилбар шинэчлэгдсэн байна. Дахин ачаалаад шалгана уу.')
        }

        const before = setting.value
        setting.value = value
        setting.version += 1
        setting.effectiveFrom = input.effectiveFrom
        setting.updatedBy = access.actor
        setting.updatedAt = new Date().toISOString()
        setting.origin = access.role === 'CEO' ? 'ceo-override' : 'branch'
        setting.status = access.role === 'Branch Manager' && setting.requiresCeoApproval
          ? 'pending-approval'
          : input.effectiveFrom > '2026-08-13'
            ? 'scheduled'
            : 'active'
        setting.history.unshift({
          id: generateId('setting-history'),
          actor: access.actor,
          role: access.role,
          action: access.role === 'CEO' ? 'override' : setting.requiresCeoApproval ? 'submitted' : 'updated',
          before,
          after: value,
          reason,
          effectiveFrom: input.effectiveFrom,
          version: setting.version,
          createdAt: setting.updatedAt,
        })
        addAudit({
          actor: access.actor,
          role: access.role,
          domain: 'BranchSettings',
          action: access.role === 'CEO' ? 'Салбарын тохиргоо override хийсэн' : setting.requiresCeoApproval ? 'Салбарын тохиргоо хяналтад илгээсэн' : 'Салбарын тохиргоо шинэчилсэн',
          target: `${setting.label} · v${setting.version}`,
          branchId,
          reason,
          before,
          after: value,
          summary: `${setting.key} · effective ${input.effectiveFrom} · ${setting.status}`,
        })
        return clone(setting)
      },
    },
    customers: {
      async list() {
        return clone(scopeSnapshot(db, access).customers)
      },
    },
    approvals: {
      async list() {
        return clone(scopeSnapshot(db, access).approvals)
      },
      async decide(id: string, input: DecisionInput): Promise<Approval> {
        if (!input.reason.trim()) throw new Error('Шийдвэрийн үндэслэл заавал шаардлагатай.')
        if (access.role !== 'CEO') throw new Error('Эцсийн шийдвэрийг зөвхөн CEO гаргана.')
        const approval = db.approvals.find((item) => item.id === id && canAccessScopedRecord(access, item.branchId))
        if (!approval) throw new Error('Шийдвэрийн хүсэлт олдсонгүй эсвэл хандах эрхгүй.')
        const normalizedActor = access.actor.trim().toLocaleLowerCase('mn-MN')
        if ([approval.requester, approval.reviewer].some((person) => person.trim().toLocaleLowerCase('mn-MN') === normalizedActor)) {
          throw new Error('Өөрийн хүсэлт эсвэл өөрийн хянасан материалыг эцэслэн шийдвэрлэх боломжгүй.')
        }
        if (approval.status !== 'pending') throw new Error('Энэ хүсэлтийг өмнө нь шийдвэрлэсэн байна.')
        if (!approval.meta.reconciled) throw new Error('Эх өгөгдлийн тулгалт дутуу тул эцсийн шийдвэр хаалттай байна.')
        if (approval.meta.updatedAt !== input.expectedUpdatedAt) {
          throw new Error('Шийдвэрийн мэдээлэл шинэчлэгдсэн байна. Queue-г дахин шалгана уу.')
        }
        if (['retained', 'overridden'].includes(input.status) && !['membership', 'rank'].includes(approval.type)) {
          throw new Error('Үлдээх болон override шийдвэр зөвхөн membership эсвэл rank хүсэлтэд зөвшөөрөгдөнө.')
        }
        if (input.status === 'overridden') {
          if (!input.overrideValue || !approval.overrideOptions?.includes(input.overrideValue)) {
            throw new Error('Override хийх зөвшөөрөгдсөн үр дүнг сонгоно уу.')
          }
        }
        approval.status = input.status
        approval.decisionReason = input.reason
        approval.overrideValue = input.status === 'overridden' ? input.overrideValue : undefined
        approval.history.push({
          at: `2026.08.12 · ${nowTime()}`,
          actor: access.actor,
          role: access.role,
          action: input.status === 'overridden' ? `Эрх бүхий override · ${input.overrideValue}` : `Шийдвэр · ${input.status}`,
          sourceVersion: input.expectedUpdatedAt,
        })
        approval.meta.updatedAt = new Date().toISOString()
        if (approval.type === 'settlement' && input.status === 'approved') {
          const batch = db.settlements.find((item) => item.id === 'batch-2026-08-11')
          if (batch) batch.status = 'approved'
        }
        addAudit({
          actor: access.actor,
          role: access.role,
          action: `Шийдвэр: ${input.status}`,
          target: approval.subject,
          branchId: approval.branchId,
          reason: input.reason,
          summary: `Эх өгөгдлийн хувилбар ${input.expectedUpdatedAt} → ${approval.meta.updatedAt}${input.overrideValue ? ` · override ${input.overrideValue}` : ''}`,
        })
        return clone(approval)
      },
    },
    tasks: {
      async list() {
        return clone(scopeSnapshot(db, access).tasks)
      },
      async create(input: CreateTaskInput): Promise<ExecutiveTask> {
        assertBranchAccess(access, input.branchId)
        const task: ExecutiveTask = {
          ...input,
          id: generateId('task'),
          status: 'assigned',
          createdBy: access.actor,
          createdAt: new Date().toISOString(),
          evidenceCount: 0,
          messages: [],
        }
        db.tasks.unshift(task)
        addAudit({
          actor: access.actor,
          role: access.role,
          action: 'Даалгавар үүсгэсэн',
          target: task.title,
          branchId: task.branchId,
          reason: task.instruction,
        })
        return clone(task)
      },
      async comment(id: string, body: string): Promise<ExecutiveTask> {
        const task = db.tasks.find((item) => item.id === id && canAccessScopedRecord(access, item.branchId))
        if (!task) throw new Error('Даалгавар олдсонгүй эсвэл хандах эрхгүй.')
        task.messages.push({ id: generateId('task-message'), author: access.actor, role: access.role, body, createdAt: nowTime() })
        return clone(task)
      },
      async setStatus(id: string, status: TaskStatus): Promise<ExecutiveTask> {
        const task = db.tasks.find((item) => item.id === id && canAccessScopedRecord(access, item.branchId))
        if (!task) throw new Error('Даалгавар олдсонгүй эсвэл хандах эрхгүй.')
        task.status = status
        addAudit({
          actor: access.actor,
          role: access.role,
          action: `Даалгаврын төлөв: ${status}`,
          target: task.title,
          branchId: task.branchId,
          reason: 'CEO prototype task review',
        })
        return clone(task)
      },
    },
    messaging: {
      async list() {
        return clone(scopeSnapshot(db, access).threads.filter((thread) => access.role === 'CEO' || (thread.kind !== 'sensitive' && thread.kind !== 'anonymous')))
      },
      async create(input: CreateConversationInput): Promise<MessageThread> {
        assertBranchAccess(access, input.branchId)
        if ((input.kind === 'sensitive' || input.kind === 'anonymous') && access.role !== 'CEO') {
          throw new Error('Нууцлалтай яриа үүсгэх эрх зөвхөн CEO demo scope-д нээлттэй.')
        }
        const createdAt = nowTime()
        const thread: MessageThread = {
          id: generateId('thread'),
          title: input.title,
          participant: input.participant,
          participantRole: input.participantRole,
          participants: [
            { name: access.actor, role: access.role, access: 'active' },
            { name: input.participant, role: input.participantRole, access: 'active' },
          ],
          branchId: input.branchId,
          kind: input.kind,
          scope: input.branchId ? 'branch' : 'company',
          status: 'active',
          accessStatus: 'active',
          urgency: input.urgency ?? (input.kind === 'sensitive' ? 'critical' : 'attention'),
          owner: access.actor,
          retentionLabel: input.kind === 'sensitive' ? 'Restricted retention · тохиргоо хүлээгдэж байна' : 'Бодлогын тохиргоо хүлээгдэж байна',
          exportAllowed: input.kind !== 'sensitive' && input.kind !== 'anonymous',
          audience: 'internal',
          unread: 0,
          updatedAt: createdAt,
          context: input.context,
          auditTrail: [{ id: generateId('message-audit'), actor: access.actor, action: 'Яриа үүсгэсэн', detail: input.context ?? 'Internal management conversation', createdAt }],
          meta: {
            source: 'Management messaging mock service',
            sourceRecord: input.context ?? 'New internal conversation',
            owner: access.actor,
            permission: input.kind === 'sensitive' ? 'Restricted · CEO demo scope' : 'Scoped management access',
            updatedAt: `2026.08.12 ${createdAt}`,
            mode: 'demo',
            reconciled: true,
            policyVersion: input.kind === 'sensitive' ? 'Configuration pending' : 'UI-first service abstraction',
          },
          messages: [{ id: generateId('message'), sender: access.actor, body: input.body, createdAt, mine: true, read: false, delivery: 'delivered', deliveredAt: createdAt, attachments: [] }],
        }
        db.threads.unshift(thread)
        addAudit({
          actor: access.actor,
          role: access.role,
          action: 'Удирдлагын яриа үүсгэсэн',
          target: thread.title,
          branchId: thread.branchId,
          reason: thread.kind === 'sensitive' || thread.kind === 'anonymous' ? 'Restricted conversation · content redacted' : thread.context ?? input.body,
        })
        return clone(thread)
      },
      async open(threadId: string): Promise<MessageThread> {
        const thread = db.threads.find((item) => item.id === threadId && canAccessScopedRecord(access, item.branchId))
        if (!thread) throw new Error('Харилцан яриа олдсонгүй эсвэл хандах эрхгүй.')
        if ((thread.kind === 'sensitive' || thread.kind === 'anonymous') && access.role !== 'CEO') {
          throw new Error('Нууцлалтай ярианд хандах эрхгүй.')
        }
        const createdAt = nowTime()
        const denied = thread.accessStatus === 'revoked'
        const action = denied ? 'Хандалт татгалзсан' : 'Яриа нээсэн'
        const lastEntry = thread.auditTrail.at(-1)
        if (lastEntry?.actor !== access.actor || lastEntry.action !== action) {
          thread.auditTrail.push({
            id: generateId('message-audit'),
            actor: access.actor,
            action,
            detail: denied ? 'Membership revoked · content masked' : 'Authorized management access',
            createdAt,
          })
          addAudit({
            actor: access.actor,
            role: access.role,
            domain: 'SensitiveMessaging',
            action,
            target: thread.title,
            branchId: thread.branchId,
            reason: denied ? 'Revoked membership guard' : 'Authorized thread review',
            summary: thread.kind === 'sensitive' || thread.kind === 'anonymous' ? 'Restricted content redacted' : thread.context,
          })
        }
        return clone(thread)
      },
      async send(threadId: string, body: string): Promise<MessageThread> {
        const thread = db.threads.find((item) => item.id === threadId && canAccessScopedRecord(access, item.branchId))
        if (!thread) throw new Error('Харилцан яриа олдсонгүй эсвэл хандах эрхгүй.')
        if ((thread.kind === 'sensitive' || thread.kind === 'anonymous') && access.role !== 'CEO') throw new Error('Нууцлалтай ярианд хандах эрхгүй.')
        if (thread.accessStatus === 'revoked') throw new Error('Энэ ярианы хандалт цуцлагдсан.')
        if (thread.status !== 'active') throw new Error('Энэ яриа шинэ мессеж хүлээн авах идэвхтэй төлөвт биш байна.')
        const message: MessageItem = {
          id: generateId('message'),
          sender: access.actor,
          body,
          createdAt: nowTime(),
          mine: true,
          read: false,
          delivery: 'delivered',
          deliveredAt: nowTime(),
          attachments: [],
        }
        thread.messages.push(message)
        thread.updatedAt = message.createdAt
        thread.unread = 0
        thread.auditTrail.push({ id: generateId('message-audit'), actor: access.actor, action: 'Мессеж илгээсэн', detail: 'Delivery recorded · content omitted from audit', createdAt: message.createdAt })
        addAudit({
          actor: access.actor,
          role: access.role,
          domain: thread.kind === 'sensitive' || thread.kind === 'anonymous' ? 'SensitiveMessaging' : 'Messaging',
          action: 'Мессеж илгээсэн',
          target: thread.title,
          branchId: thread.branchId,
          reason: 'Authorized internal conversation',
          summary: 'Message content omitted',
        })
        return clone(thread)
      },
    },
    hermes: {
      async daily() {
        return clone(scopeSnapshot(db, access).hermesDaily)
      },
      async monthly() {
        return clone(scopeSnapshot(db, access).hermesMonthly)
      },
      async list() {
        return clone(scopeSnapshot(db, access).recommendations)
      },
      async open(id: string) {
        const recommendation = db.recommendations.find((item) => item.id === id && canAccessScopedRecord(access, item.branchId))
        if (!recommendation) throw new Error('Hermes зөвлөмж олдсонгүй эсвэл хандах эрхгүй.')
        addAudit({
          actor: access.actor,
          role: access.role,
          action: 'Hermes зөвлөмж нээсэн',
          target: recommendation.id,
          branchId: recommendation.branchId,
          reason: 'Authorized evidence summary only; sensitive fields excluded.',
        })
        return clone(recommendation)
      },
      async act(id: string, status: HermesStatus): Promise<HermesActionResult> {
        const recommendation = db.recommendations.find((item) => item.id === id && canAccessScopedRecord(access, item.branchId))
        if (!recommendation) throw new Error('Hermes зөвлөмж олдсонгүй эсвэл хандах эрхгүй.')
        if (access.role !== 'CEO') throw new Error('Hermes зөвлөмжийн action-д CEO эрх шаардлагатай.')
        if (status === 'converted' && ['empty', 'unavailable', 'unsafe-action'].includes(recommendation.analysisState)) {
          throw new Error('Энэ төлөвөөс business task үүсгэх нь хаалттай. Эх үүсвэр эсвэл эрхийн нөхцөлийг эхлээд шийднэ үү.')
        }
        if (status === 'converted' && recommendation.linkedTaskId) throw new Error('Энэ зөвлөмж аль хэдийн task-тай холбогдсон.')
        recommendation.status = status
        let task: ExecutiveTask | undefined
        if (status === 'converted') {
          const branch = recommendation.branchId ? findBranch(recommendation.branchId) : undefined
          task = {
            id: generateId('task'),
            title: recommendation.title,
            instruction: recommendation.recommendation,
            assignee: branch?.manager ?? 'Ерөнхий менежер',
            assigneeRole: 'Салбарын менежер',
            branchId: recommendation.branchId,
            module: 'Hermes',
            dueAt: '2026-08-14T18:00:00+08:00',
            priority: 'high',
            status: 'assigned',
            createdBy: access.actor,
            createdAt: new Date().toISOString(),
            evidenceCount: recommendation.evidence.length,
            messages: [],
            sourceContext: `Hermes recommendation ${recommendation.id} · ${recommendation.metricVersion}`,
          }
          db.tasks.unshift(task)
          recommendation.linkedTaskId = task.id
        }
        addAudit({
          actor: access.actor,
          role: access.role,
          action: `Hermes зөвлөмж: ${status}`,
          target: recommendation.title,
          branchId: recommendation.branchId,
          reason: status === 'converted' ? 'Зөвлөмжийг даалгавар болгон хөрвүүлсэн.' : 'Хэрэглэгчийн ил тод үйлдэл.',
        })
        return { recommendation: clone(recommendation), task: task ? clone(task) : undefined }
      },
      async annotate(id: string, body: string) {
        const recommendation = db.recommendations.find((item) => item.id === id && canAccessScopedRecord(access, item.branchId))
        if (!recommendation) throw new Error('Hermes зөвлөмж олдсонгүй эсвэл хандах эрхгүй.')
        if (access.role !== 'CEO') throw new Error('Hermes annotation-д CEO эрх шаардлагатай.')
        const normalized = body.trim()
        if (normalized.length < 2 || normalized.length > 500) throw new Error('Тэмдэглэл 2–500 тэмдэгт байна.')
        recommendation.annotations.push({ id: generateId('hermes-note'), body: normalized, actor: access.actor, createdAt: nowTime() })
        addAudit({ actor: access.actor, role: access.role, action: 'Hermes annotation нэмсэн', target: recommendation.id, branchId: recommendation.branchId, reason: 'Annotation content retained on recommendation record; audit summary redacted.' })
        return clone(recommendation)
      },
      async feedback(id: string, input: HermesFeedbackInput) {
        const recommendation = db.recommendations.find((item) => item.id === id && canAccessScopedRecord(access, item.branchId))
        if (!recommendation) throw new Error('Hermes зөвлөмж олдсонгүй эсвэл хандах эрхгүй.')
        if (access.role !== 'CEO') throw new Error('Hermes feedback-д CEO эрх шаардлагатай.')
        const note = input.note?.trim()
        if (note && note.length > 300) throw new Error('Feedback тайлбар 300 тэмдэгтээс урт байж болохгүй.')
        recommendation.feedback.push({ id: generateId('hermes-feedback'), usefulness: input.usefulness, accuracy: input.accuracy, note: note || undefined, actor: access.actor, createdAt: nowTime() })
        addAudit({ actor: access.actor, role: access.role, action: 'Hermes feedback хадгалсан', target: recommendation.id, branchId: recommendation.branchId, reason: 'Usefulness/accuracy feedback retained separately from business decisions.' })
        return clone(recommendation)
      },
      async openConversation(id: string) {
        const recommendation = db.recommendations.find((item) => item.id === id && canAccessScopedRecord(access, item.branchId))
        if (!recommendation) throw new Error('Hermes зөвлөмж олдсонгүй эсвэл хандах эрхгүй.')
        if (access.role !== 'CEO') throw new Error('Hermes discussion-д CEO эрх шаардлагатай.')
        const context = `Recommendation ${recommendation.id}`
        let thread = db.threads.find((item) => item.kind === 'hermes' && item.context === context && canAccessScopedRecord(access, item.branchId))
        if (!thread) {
          const createdAt = nowTime()
          thread = {
            id: generateId('thread-hermes'),
            title: `Hermes · ${recommendation.title}`,
            participant: 'Hermes',
            participantRole: 'Бизнес зөвлөх',
            participants: [{ name: access.actor, role: access.role, access: 'active' }, { name: 'Hermes', role: 'Бизнес зөвлөх', access: 'active' }],
            branchId: recommendation.branchId,
            kind: 'hermes',
            scope: recommendation.branchId ? 'branch' : 'company',
            status: 'active',
            accessStatus: 'active',
            urgency: recommendation.analysisState === 'ready' ? 'attention' : 'critical',
            owner: access.actor,
            retentionLabel: 'Зөвлөмжийн эх record-той ижил',
            exportAllowed: true,
            audience: 'internal',
            unread: 0,
            updatedAt: createdAt,
            context,
            auditTrail: [{ id: generateId('message-audit'), actor: access.actor, action: 'Hermes discussion үүсгэсэн', detail: context, createdAt }],
            meta: { source: 'Hermes authorized discussion service', sourceRecord: context, owner: access.actor, permission: 'CEO and scoped management access', updatedAt: `2026.08.12 ${createdAt}`, mode: 'demo', reconciled: true, policyVersion: 'UI-first service abstraction' },
            messages: [{ id: generateId('message'), sender: 'Hermes', body: `${recommendation.title} зөвлөмжийн authorized summary-г хэлэлцэх thread. Sensitive болон зөвшөөрөлгүй field оруулаагүй.`, createdAt, mine: false, read: true, delivery: 'read', deliveredAt: createdAt, readAt: createdAt, attachments: [] }],
          }
          db.threads.unshift(thread)
        }
        recommendation.linkedThreadId = thread.id
        addAudit({ actor: access.actor, role: access.role, action: 'Hermes discussion нээсэн', target: recommendation.id, branchId: recommendation.branchId, reason: `Authorized message thread ${thread.id}` })
        return clone(thread)
      },
    },
    settlements: {
      async list() {
        return clone(access.companyWide ? db.settlements : [])
      },
    },
    workforce: {
      async list() {
        return clone(scopeSnapshot(db, access).workforce)
      },
    },
    people: {
      async listManagers() {
        return clone(scopeSnapshot(db, access).managers)
      },
      async listEmployees() {
        return clone(scopeSnapshot(db, access).employees)
      },
      async openEmployee(id: string) {
        const employee = db.employees.find((item) => item.id === id && canAccessScopedRecord(access, item.branchId))
        if (!employee) throw new Error('Ажилтны мэдээлэл олдсонгүй эсвэл хандах эрхгүй.')
        if (access.role !== 'CEO') throw new Error('Ажилтны performance drill-down-д CEO эрх шаардлагатай.')
        addAudit({
          actor: access.actor,
          role: access.role,
          domain: 'EmployeePerformance',
          action: 'Ажилтны performance нээсэн',
          target: employee.maskedEmployeeCode,
          branchId: employee.branchId,
          reason: 'Authorized executive performance review',
          summary: 'Approved aggregate fields only · sensitive fields masked',
        })
        return clone(employee)
      },
    },
    audit: {
      async list() {
        return clone(scopeSnapshot(db, access).auditEvents)
      },
      async record(input) {
        if (!input.reason.trim()) throw new Error('Audit event-ийн зорилго эсвэл үндэслэл шаардлагатай.')
        assertBranchAccess(access, input.branchId)
        const isExport = input.action.includes('Export')
        if (isExport && !input.exportControl) throw new Error('Export хүсэлт deny-by-default: control context шаардлагатай.')
        if (input.exportControl) {
          if (!isExport) throw new Error('Export control зөвхөн export audit event-д ашиглагдана.')
          if (!input.exportControl.masked || input.exportControl.scope !== 'current-authorized-view') {
            throw new Error('Export нь зөвхөн masked, одоогийн зөвшөөрөгдсөн хүрээнд байна.')
          }
          if (!Number.isFinite(input.exportControl.estimatedRows) || input.exportControl.estimatedRows < 0) {
            throw new Error('Export мөрийн тоо хүчинтэй байх шаардлагатай.')
          }
          if (input.exportControl.estimatedRows > 5_000 && input.exportControl.outcome !== 'denied') {
            throw new Error('Large-result export хориглогдлоо; filter-ээ нарийсгана уу.')
          }
          if (input.exportControl.outcome !== 'denied') {
            const now = Date.now()
            while (recentExportRequests.length && recentExportRequests[0] < now - 60_000) recentExportRequests.shift()
            if (recentExportRequests.length >= 3) throw new Error('Export rate control: нэг минутын хязгаарт хүрлээ.')
            recentExportRequests.push(now)
          }
        }
        if (input.eventType === 'adjustment' || input.eventType === 'reversal') {
          if (!input.reversesEventId || !input.before || !input.after) {
            throw new Error('Audit correction нь эх event, before, after утгатай байна.')
          }
          if (!db.auditEvents.some((item) => item.id === input.reversesEventId)) {
            throw new Error('Засах audit event олдсонгүй.')
          }
        }
        return clone(addAudit({
          actor: access.actor,
          role: access.role,
          domain: input.domain,
          action: input.action,
          target: input.target,
          branchId: input.branchId,
          reason: input.reason,
          summary: input.summary,
          eventType: input.eventType,
          before: input.before,
          after: input.after,
          reversesEventId: input.reversesEventId,
          exportControl: input.exportControl,
        }))
      },
    },
  }

  return withContractValidation(services, 'fixture')
}
