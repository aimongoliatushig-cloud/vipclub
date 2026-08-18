import type {
  CreateManagerTaskInput,
  ManagerOperationsSnapshot,
  ManagerTask,
  SaveGoalProposalInput,
  SalesGoalProposal,
  TaskEvidenceInput,
} from './managerOperationsModels'

export const MANAGER_OPERATIONS_STORAGE_KEY = 'vipclub.manager-operations.mn.v1'
const AUTHORIZED_BRANCH_ID = 'branch-central'
const MANAGER_NAME = 'Ариун менежер'
const ALLOWED_ASSIGNEES = new Set([
  'tm-anu', 'tm-bolor', 'tm-naraa', 'tm-solongo', 'tm-temuulen', 'tm-bilguun',
  'tm-sarnai', 'tm-oyun', 'tm-enkhjin', 'tm-munkh', 'tm-altan',
  'tm-bat', 'tm-tamir', 'tm-naran',
])

export interface StoredOperationsState {
  tasks: ManagerTask[]
  goalProposal: SalesGoalProposal
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function id(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(date: Date, days: number): string {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return toDateKey(result)
}

function nextMonthKey(date: Date): string {
  const result = new Date(date.getFullYear(), date.getMonth() + 1, 1)
  return `${result.getFullYear()}-${String(result.getMonth() + 1).padStart(2, '0')}`
}

function previousYearMonth(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number)
  return `${year - 1}-${String(monthNumber).padStart(2, '0')}`
}

function createSeedState(): StoredOperationsState {
  const now = new Date()
  const nowIso = now.toISOString()
  const yesterday = addDays(now, -1)
  const today = addDays(now, 0)
  const tomorrow = addDays(now, 1)
  const later = addDays(now, 4)
  const month = nextMonthKey(now)
  const recommendationAmount = 156_880_000

  const tasks: ManagerTask[] = [
    {
      id: 'task-opening-checklist',
      branchId: AUTHORIZED_BRANCH_ID,
      title: 'VIP өрөөний нээлтийн шалгах хуудас',
      description: 'VIP өрөө бүрийн гэрэлтүүлэг, ширээ, меню, тоноглолын бэлэн байдлыг нээлтээс өмнө шалгаж тэмдэглэнэ.',
      assigneeId: 'tm-enkhjin',
      createdBy: MANAGER_NAME,
      createdAt: nowIso,
      dueDate: tomorrow,
      status: 'acknowledged',
      comments: [{ id: 'comment-opening', author: 'Амар Энхжин', actorType: 'team-member', body: 'Даалгаврыг хүлээн авлаа. 17:30-д шалгалтыг эхлүүлнэ.', at: nowIso }],
      evidence: [],
      audit: [
        { id: 'audit-opening-created', action: 'created', actor: MANAGER_NAME, at: nowIso },
        { id: 'audit-opening-notified', action: 'notification-recorded', actor: 'Систем', at: nowIso, note: 'PWA мэдэгдлийн баримт үүссэн' },
        { id: 'audit-opening-ack', action: 'acknowledged', actor: 'Амар Энхжин', at: nowIso },
      ],
    },
    {
      id: 'task-event-prep',
      branchId: AUTHORIZED_BRANCH_ID,
      title: 'Баасан гарагийн арга хэмжээний бэлтгэл',
      description: 'Захиалгын суудал, үйлчилгээний баг, тусгай хүсэлтийн жагсаалтыг нэгтгэж менежерт хянуулна.',
      assigneeId: 'tm-temuulen',
      createdBy: MANAGER_NAME,
      createdAt: nowIso,
      dueDate: today,
      status: 'submitted',
      result: '42 зочны суудал, 6 тусгай хүсэлт, үйлчилгээний хуваарийг тулгаж дуусгав.',
      submittedAt: nowIso,
      comments: [],
      evidence: [{ id: 'evidence-event', fileName: 'baasan-beltnel.jpg', mimeType: 'image/jpeg', size: 248_000, addedBy: 'Баатар Тэмүүлэн', addedAt: nowIso }],
      audit: [
        { id: 'audit-event-created', action: 'created', actor: MANAGER_NAME, at: nowIso },
        { id: 'audit-event-ack', action: 'acknowledged', actor: 'Баатар Тэмүүлэн', at: nowIso },
        { id: 'audit-event-started', action: 'started', actor: 'Баатар Тэмүүлэн', at: nowIso },
        { id: 'audit-event-submitted', action: 'submitted', actor: 'Баатар Тэмүүлэн', at: nowIso, note: '1 зураг хавсаргасан' },
      ],
    },
    {
      id: 'task-stock-reconcile',
      branchId: AUTHORIZED_BRANCH_ID,
      title: 'Баарны үлдэгдэл тулгах',
      description: 'Тооллогын зөрүүтэй нэр төрлийг баримттай тулгаж, шалтгаан болон засах саналыг оруулна.',
      assigneeId: 'tm-sarnai',
      createdBy: MANAGER_NAME,
      createdAt: nowIso,
      dueDate: yesterday,
      status: 'in-progress',
      comments: [{ id: 'comment-stock', author: 'Ган Сарнай', actorType: 'team-member', body: 'Хоёр нэр төрлийн орлогын баримт хүлээгдэж байна.', at: nowIso }],
      evidence: [],
      audit: [
        { id: 'audit-stock-created', action: 'created', actor: MANAGER_NAME, at: nowIso },
        { id: 'audit-stock-ack', action: 'acknowledged', actor: 'Ган Сарнай', at: nowIso },
        { id: 'audit-stock-start', action: 'started', actor: 'Ган Сарнай', at: nowIso },
      ],
    },
    {
      id: 'task-safety-briefing',
      branchId: AUTHORIZED_BRANCH_ID,
      title: 'Аюулгүй ажиллагааны товч зааварчилгаа',
      description: 'Оройн ээлжийн багт гарц, зөрчил мэдээлэх дарааллыг танилцуулж, оролцсон хүмүүсийг тэмдэглэнэ.',
      assigneeId: 'tm-munkh',
      createdBy: MANAGER_NAME,
      createdAt: nowIso,
      dueDate: yesterday,
      status: 'completed',
      result: 'Оройн ээлжийн 9 ажилтан оролцож, гарц болон мэдээлэх дарааллыг давтан шалгав.',
      submittedAt: nowIso,
      completedAt: nowIso,
      comments: [{ id: 'comment-safety', author: MANAGER_NAME, actorType: 'manager', body: 'Оролцогчдын бүртгэлийг шалгав. Үр дүнг баталлаа.', at: nowIso }],
      evidence: [{ id: 'evidence-safety', fileName: 'zaavarchilgaa.jpg', mimeType: 'image/jpeg', size: 311_000, addedBy: 'Оргил Мөнх', addedAt: nowIso }],
      audit: [
        { id: 'audit-safety-created', action: 'created', actor: MANAGER_NAME, at: nowIso },
        { id: 'audit-safety-submitted', action: 'submitted', actor: 'Оргил Мөнх', at: nowIso },
        { id: 'audit-safety-approved', action: 'approved', actor: MANAGER_NAME, at: nowIso },
      ],
    },
  ]

  return {
    tasks,
    goalProposal: {
      id: `goal-proposal-${month}`,
      branchId: AUTHORIZED_BRANCH_ID,
      month,
      state: 'draft',
      version: 1,
      proposedTarget: 158_000_000,
      rationale: 'Өнгөрсөн оны ижил сарын тулгагдсан борлуулалт болон сүүлийн 90 хоногийн давтан зочлолтын хандлагыг үндэслэв.',
      actions: [
        { id: 'goal-action-1', title: 'Gold+ түвшний идэвхгүй харилцагчийн жагсаалтыг CRM багт шилжүүлэх', ownerId: 'tm-enkhjin', dueDate: later, expectedImpact: 'Давтан захиалгыг нэмэгдүүлэх' },
        { id: 'goal-action-2', title: 'Баасан гарагийн захиалгын өдөр тутмын хяналт хийх', ownerId: 'tm-temuulen', dueDate: later, expectedImpact: 'Оргил өдрийн сул суудлыг бууруулах' },
        { id: 'goal-action-3', title: 'Энтертайнерын давтан захиалгын гүйцэтгэлийг хянах', ownerId: 'tm-anu', dueDate: later, expectedImpact: 'Давтан зочлолтын хувийг өсгөх' },
      ],
      recommendation: {
        version: 1,
        generatedAt: nowIso,
        baselineMonth: previousYearMonth(month),
        baselineAmount: 148_000_000,
        improvementPercent: 6,
        recommendedTarget: recommendationAmount,
        sourceSummary: 'POS сарын хаалт · тулгалттай борлуулалтын түүх · Төв салбар',
        rationale: 'Ижил сарын суурь дээр батлагдсан туршилтын 6%-ийн өсөлтийн хувийг хэрэглэсэн зөвлөмж.',
        focusAreas: ['Gold+ давтан зочлолт', 'Баасан гарагийн захиалга', 'Энтертайнерын давтан захиалга'],
        risks: ['Оргил өдрийн хангалтын дутагдал', 'Идэвхгүй VIP харилцагчийн өсөлт'],
        suggestedActions: ['CRM багт зөвшөөрөлтэй дахин идэвхжүүлэх сегмент бэлтгэх', 'Өдөр тутмын захиалгын эрсдэлийг 17:00-д хянах'],
      },
      managerName: MANAGER_NAME,
      updatedAt: nowIso,
      audit: [{ id: 'goal-audit-created', action: 'draft-created', actor: MANAGER_NAME, at: nowIso, version: 1, note: 'Hermes-ийн 1-р зөвлөмжөөс ноорог үүсгэв' }],
    },
  }
}

function requireText(value: string, label: string): string {
  const result = value.trim()
  if (!result) throw new Error(`${label} заавал шаардлагатай.`)
  return result
}

export interface ManagerOperationsService {
  getSnapshot(branchId?: string): ManagerOperationsSnapshot
  createTask(input: CreateManagerTaskInput): ManagerOperationsSnapshot
  addTaskComment(taskId: string, body: string): ManagerOperationsSnapshot
  acknowledgeTask(taskId: string, assigneeId: string): ManagerOperationsSnapshot
  startTask(taskId: string, assigneeId: string): ManagerOperationsSnapshot
  submitTask(taskId: string, assigneeId: string, result: string, evidence?: TaskEvidenceInput): ManagerOperationsSnapshot
  reviewTask(taskId: string, action: 'approve' | 'rework', note: string): ManagerOperationsSnapshot
  saveGoalProposal(input: SaveGoalProposalInput): ManagerOperationsSnapshot
  submitGoalProposal(): ManagerOperationsSnapshot
}

export class BrowserManagerOperationsService implements ManagerOperationsService {
  private readState(): StoredOperationsState {
    try {
      const raw = window.localStorage.getItem(MANAGER_OPERATIONS_STORAGE_KEY)
      if (raw) return JSON.parse(raw) as StoredOperationsState
    } catch {
      // Browser persistence is best-effort in this UI prototype.
    }
    const state = createSeedState()
    this.writeState(state)
    return state
  }

  private writeState(state: StoredOperationsState): void {
    try {
      window.localStorage.setItem(MANAGER_OPERATIONS_STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Browser persistence is best-effort in this UI prototype.
    }
  }

  private snapshot(state: StoredOperationsState): ManagerOperationsSnapshot {
    return clone({ branchId: AUTHORIZED_BRANCH_ID, refreshedAt: new Date().toISOString(), ...state })
  }

  private requireBranch(branchId: string): void {
    if (branchId !== AUTHORIZED_BRANCH_ID) throw new Error('Энэ салбарт хандах эрхгүй байна.')
  }

  private findTask(state: StoredOperationsState, taskId: string): ManagerTask {
    const task = state.tasks.find((item) => item.id === taskId)
    if (!task || task.branchId !== AUTHORIZED_BRANCH_ID) throw new Error('Даалгавар олдсонгүй эсвэл энэ салбарын хүрээнд биш байна.')
    return task
  }

  getSnapshot(branchId = AUTHORIZED_BRANCH_ID): ManagerOperationsSnapshot {
    this.requireBranch(branchId)
    return this.snapshot(this.readState())
  }

  createTask(input: CreateManagerTaskInput): ManagerOperationsSnapshot {
    this.requireBranch(input.branchId)
    if (!ALLOWED_ASSIGNEES.has(input.assigneeId)) throw new Error('Зөвхөн өөрийн салбарын идэвхтэй багийн гишүүнд даалгавар өгнө.')
    const title = requireText(input.title, 'Даалгаврын нэр')
    const description = requireText(input.description, 'Гүйцэтгэх тайлбар')
    if (!input.dueDate) throw new Error('Дуусах огноо заавал шаардлагатай.')
    const state = this.readState()
    const now = new Date().toISOString()
    const task: ManagerTask = {
      id: id('task'),
      branchId: AUTHORIZED_BRANCH_ID,
      title,
      description,
      assigneeId: input.assigneeId,
      createdBy: MANAGER_NAME,
      createdAt: now,
      dueDate: input.dueDate,
      status: 'assigned',
      comments: [],
      evidence: [],
      audit: [
        { id: id('task-audit'), action: 'created', actor: MANAGER_NAME, at: now },
        { id: id('task-audit'), action: 'notification-recorded', actor: 'Систем', at: now, note: 'PWA мэдэгдлийн баримт үүссэн; бодит хүргэлтийн интеграц хүлээгдэж байна' },
      ],
    }
    state.tasks.unshift(task)
    this.writeState(state)
    return this.snapshot(state)
  }

  addTaskComment(taskId: string, body: string): ManagerOperationsSnapshot {
    const text = requireText(body, 'Сэтгэгдэл')
    const state = this.readState()
    const task = this.findTask(state, taskId)
    const now = new Date().toISOString()
    task.comments.push({ id: id('comment'), author: MANAGER_NAME, actorType: 'manager', body: text, at: now })
    task.audit.push({ id: id('task-audit'), action: 'commented', actor: MANAGER_NAME, at: now, note: text })
    this.writeState(state)
    return this.snapshot(state)
  }

  acknowledgeTask(taskId: string, assigneeId: string): ManagerOperationsSnapshot {
    const state = this.readState()
    const task = this.findTask(state, taskId)
    if (task.assigneeId !== assigneeId) throw new Error('Зөвхөн даалгаврын эзэн хүлээн авснаа баталгаажуулна.')
    if (task.status !== 'assigned') throw new Error('Энэ даалгаврыг дахин хүлээн авах боломжгүй төлөвтэй байна.')
    task.status = 'acknowledged'
    task.audit.push({ id: id('task-audit'), action: 'acknowledged', actor: 'Багийн гишүүн', at: new Date().toISOString() })
    this.writeState(state)
    return this.snapshot(state)
  }

  startTask(taskId: string, assigneeId: string): ManagerOperationsSnapshot {
    const state = this.readState()
    const task = this.findTask(state, taskId)
    if (task.assigneeId !== assigneeId) throw new Error('Зөвхөн даалгаврын эзэн ажлыг эхлүүлнэ.')
    if (!['acknowledged', 'rework'].includes(task.status)) throw new Error('Энэ төлвөөс ажлыг эхлүүлэх боломжгүй байна.')
    task.status = 'in-progress'
    task.audit.push({ id: id('task-audit'), action: 'started', actor: 'Багийн гишүүн', at: new Date().toISOString() })
    this.writeState(state)
    return this.snapshot(state)
  }

  submitTask(taskId: string, assigneeId: string, result: string, evidence?: TaskEvidenceInput): ManagerOperationsSnapshot {
    const state = this.readState()
    const task = this.findTask(state, taskId)
    if (task.assigneeId !== assigneeId) throw new Error('Зөвхөн даалгаврын эзэн үр дүн илгээнэ.')
    if (!['acknowledged', 'in-progress', 'rework'].includes(task.status)) throw new Error('Энэ даалгаврын үр дүнг одоо илгээх боломжгүй байна.')
    const now = new Date().toISOString()
    task.result = requireText(result, 'Гүйцэтгэлийн үр дүн')
    task.status = 'submitted'
    task.submittedAt = now
    if (evidence) {
      if (!evidence.mimeType.startsWith('image/')) throw new Error('Нотлох баримтаар зөвхөн зураг хавсаргана.')
      task.evidence.push({ id: id('evidence'), ...evidence, addedBy: 'Багийн гишүүн', addedAt: now })
    }
    task.audit.push({ id: id('task-audit'), action: 'submitted', actor: 'Багийн гишүүн', at: now, note: evidence ? 'Зургийн баримт хавсаргасан' : 'Текст үр дүн илгээсэн' })
    this.writeState(state)
    return this.snapshot(state)
  }

  reviewTask(taskId: string, action: 'approve' | 'rework', note: string): ManagerOperationsSnapshot {
    const state = this.readState()
    const task = this.findTask(state, taskId)
    if (task.status !== 'submitted') throw new Error('Зөвхөн хянуулахад илгээсэн үр дүнг шийдвэрлэнэ.')
    const reviewNote = requireText(note, action === 'approve' ? 'Хяналтын тэмдэглэл' : 'Дахин ажиллуулах заавар')
    const now = new Date().toISOString()
    task.status = action === 'approve' ? 'completed' : 'rework'
    task.completedAt = action === 'approve' ? now : undefined
    task.comments.push({ id: id('comment'), author: MANAGER_NAME, actorType: 'manager', body: reviewNote, at: now })
    task.audit.push({ id: id('task-audit'), action: action === 'approve' ? 'approved' : 'rework-requested', actor: MANAGER_NAME, at: now, note: reviewNote })
    this.writeState(state)
    return this.snapshot(state)
  }

  saveGoalProposal(input: SaveGoalProposalInput): ManagerOperationsSnapshot {
    const state = this.readState()
    const proposal = state.goalProposal
    this.requireBranch(proposal.branchId)
    if (!['draft', 'revision-requested'].includes(proposal.state)) throw new Error('Илгээсэн төлөвлөгөөг засах боломжгүй. Гүйцэтгэх захирлын шийдвэрийг хүлээнэ үү.')
    if (!Number.isFinite(input.proposedTarget) || input.proposedTarget <= 0) throw new Error('Санал болгож буй зорилго тэгээс их байна.')
    const rationale = requireText(input.rationale, 'Зорилгын үндэслэл')
    if (!input.actions.length) throw new Error('Дор хаяж нэг хэрэгжүүлэх ажил шаардлагатай.')
    const actions = input.actions.map((action) => ({
      ...action,
      title: requireText(action.title, 'Ажлын нэр'),
      expectedImpact: requireText(action.expectedImpact, 'Хүлээгдэж буй нөлөө'),
      ownerId: requireText(action.ownerId, 'Хариуцагч'),
      dueDate: requireText(action.dueDate, 'Дуусах огноо'),
    }))
    if (actions.some((action) => !ALLOWED_ASSIGNEES.has(action.ownerId))) throw new Error('Төлөвлөгөөний хариуцагч өөрийн салбарын багийн гишүүн байна.')
    const now = new Date().toISOString()
    proposal.proposedTarget = input.proposedTarget
    proposal.rationale = rationale
    proposal.actions = clone(actions)
    proposal.updatedAt = now
    proposal.audit.push({ id: id('goal-audit'), action: 'draft-saved', actor: MANAGER_NAME, at: now, version: proposal.version })
    this.writeState(state)
    return this.snapshot(state)
  }

  submitGoalProposal(): ManagerOperationsSnapshot {
    const state = this.readState()
    const proposal = state.goalProposal
    this.requireBranch(proposal.branchId)
    if (!['draft', 'revision-requested'].includes(proposal.state)) throw new Error('Энэ төлөвлөгөөг дахин илгээх боломжгүй төлөвтэй байна.')
    if (!proposal.proposedTarget || !proposal.rationale.trim() || !proposal.actions.length) throw new Error('Зорилго, үндэслэл, хэрэгжүүлэх ажлуудыг бүрэн хадгална уу.')
    const now = new Date().toISOString()
    proposal.state = 'submitted'
    proposal.version += 1
    proposal.submittedAt = now
    proposal.updatedAt = now
    proposal.audit.push({ id: id('goal-audit'), action: 'submitted', actor: MANAGER_NAME, at: now, version: proposal.version, note: 'Гүйцэтгэх захирлын хяналтад илгээв' })
    this.writeState(state)
    return this.snapshot(state)
  }
}

export function resetManagerOperationsPrototype(): void {
  try {
    window.localStorage.removeItem(MANAGER_OPERATIONS_STORAGE_KEY)
  } catch {
    // Tests and restricted browsers may not expose storage.
  }
}
