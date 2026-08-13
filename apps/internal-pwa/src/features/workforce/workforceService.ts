import {
  shiftTemplates,
  workforceRoles,
  type AssignmentInput,
  type AttendanceDecisionAction,
  type AttendanceException,
  type CoverageRow,
  type ExecutiveFollowUpSummary,
  type LeaveRequest,
  type LeaveRequestInput,
  type ManagerDashboardSummary,
  type PenaltyReview,
  type ReadinessRow,
  type ResponseQueueItem,
  type ShiftAssignment,
  type StaffingRequirement,
  type TeamMember,
  type ValidationIssue,
  type WeeklyRoster,
  type WorkforceRole,
} from './models'
import { attendanceDecisionLabels, roleLabels } from './localization'

const STORAGE_KEY = 'vipclub.workforce.manager-prototype.mn.v3'
const DAY_MS = 86_400_000
const ACKNOWLEDGEMENT_WINDOW_MS = DAY_MS
const AUTHORIZED_BRANCH_ID = 'branch-central'

export function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDateKey(value: string): Date {
  return new Date(`${value}T12:00:00`)
}

export function startOfWeek(date: Date): string {
  const result = new Date(date)
  result.setHours(12, 0, 0, 0)
  const mondayOffset = (result.getDay() + 6) % 7
  result.setDate(result.getDate() - mondayOffset)
  return toDateKey(result)
}

export function addDays(date: string, days: number): string {
  return toDateKey(new Date(parseDateKey(date).getTime() + days * DAY_MS))
}

export function weekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
}

export function getCoverage(roster: WeeklyRoster): CoverageRow[] {
  return roster.requirements.map((requirement) => {
    const scheduled = roster.assignments.filter(
      (assignment) => assignment.date === requirement.date
        && assignment.role === requirement.role
        && !isMemberUnavailable(roster, assignment.teamMemberId, assignment.date),
    ).length
    return {
      ...requirement,
      scheduled,
      gap: Math.max(0, requirement.required - scheduled),
    }
  })
}

export interface WorkforceService {
  getTeamMembers(branchId?: string): TeamMember[]
  getRoster(weekStart: string): WeeklyRoster
  getManagerDashboard(weekStart: string): ManagerDashboardSummary
  getReadiness(weekStart: string): ReadinessRow[]
  getAttendanceExceptions(weekStart: string): AttendanceException[]
  getLeaveRequests(weekStart: string, teamMemberId?: string): LeaveRequest[]
  submitLeaveRequest(weekStart: string, input: LeaveRequestInput): WeeklyRoster
  decideLeaveRequest(
    weekStart: string,
    requestId: string,
    decision: 'approve' | 'reject',
    reason: string,
  ): WeeklyRoster
  getPenaltyReviews(weekStart: string): PenaltyReview[]
  decideAttendanceException(
    weekStart: string,
    exceptionId: string,
    decision: AttendanceDecisionAction,
    reason: string,
  ): WeeklyRoster
  overrideAvailability(
    weekStart: string,
    teamMemberId: string,
    date: string,
    available: boolean,
    reason: string,
  ): WeeklyRoster
  upsertAssignment(weekStart: string, input: AssignmentInput): WeeklyRoster
  removeAssignment(weekStart: string, assignmentId: string, reason?: string): WeeklyRoster
  publishRoster(weekStart: string, shortageReason?: string): WeeklyRoster
  copyPreviousWeek(weekStart: string): WeeklyRoster
  saveRequirements(weekStart: string, requirements: StaffingRequirement[], effectiveFrom: string, reason: string): WeeklyRoster
  getExecutiveFollowUp(weekStart: string, now?: Date): ExecutiveFollowUpSummary
  recordExecutiveFollowUp(
    weekStart: string,
    action: 'message' | 'task',
    note: string,
    dueDate?: string,
  ): WeeklyRoster
  getResponseQueue(weekStart: string, now?: Date): ResponseQueueItem[]
  respondToAssignment(
    weekStart: string,
    teamMemberId: string,
    assignmentId: string,
    response: 'acknowledged' | 'change-requested',
    note?: string,
  ): WeeklyRoster
  recordResponseReminder(weekStart: string, assignmentId: string): WeeklyRoster
  validateRoster(roster: WeeklyRoster): ValidationIssue[]
}

const demoWeekStart = startOfWeek(new Date())
const demoStatusAt = new Date().toISOString()

const teamMembers: TeamMember[] = [
  { id: 'tm-anu', name: 'Бат Ану', initials: 'БА', branchId: AUTHORIZED_BRANCH_ID, role: 'Entertainer', active: true, unavailableDates: [], operationalStatus: 'serving', statusUpdatedAt: demoStatusAt, rank: 'Rank3' },
  { id: 'tm-bolor', name: 'Эрдэнэ Болор', initials: 'ЭБ', branchId: AUTHORIZED_BRANCH_ID, role: 'Entertainer', active: true, unavailableDates: [], operationalStatus: 'reserved', statusUpdatedAt: demoStatusAt, rank: 'Rank2' },
  { id: 'tm-naraa', name: 'Мөнх Нараа', initials: 'МН', branchId: AUTHORIZED_BRANCH_ID, role: 'Entertainer', active: true, unavailableDates: [], operationalStatus: 'break', statusUpdatedAt: demoStatusAt, rank: 'Rank1' },
  { id: 'tm-solongo', name: 'Цэрэн Солонго', initials: 'ЦС', branchId: AUTHORIZED_BRANCH_ID, role: 'Entertainer', active: true, unavailableDates: [addDays(demoWeekStart, 3)], operationalStatus: 'late', statusUpdatedAt: demoStatusAt, rank: 'Rank3' },
  { id: 'tm-temuulen', name: 'Баатар Тэмүүлэн', initials: 'БТ', branchId: AUTHORIZED_BRANCH_ID, role: 'Server', active: true, unavailableDates: [], operationalStatus: 'serving', statusUpdatedAt: demoStatusAt },
  { id: 'tm-bilguun', name: 'Дорж Билгүүн', initials: 'ДБ', branchId: AUTHORIZED_BRANCH_ID, role: 'Server', active: true, unavailableDates: [addDays(demoWeekStart, 4)], operationalStatus: 'absent', statusUpdatedAt: demoStatusAt },
  { id: 'tm-sarnai', name: 'Ган Сарнай', initials: 'ГС', branchId: AUTHORIZED_BRANCH_ID, role: 'Bartender', active: true, unavailableDates: [], operationalStatus: 'available', statusUpdatedAt: demoStatusAt },
  { id: 'tm-oyun', name: 'Болд Оюун', initials: 'БО', branchId: AUTHORIZED_BRANCH_ID, role: 'Bartender', active: true, unavailableDates: [], operationalStatus: 'leave', statusUpdatedAt: demoStatusAt },
  { id: 'tm-enkhjin', name: 'Амар Энхжин', initials: 'АЭ', branchId: AUTHORIZED_BRANCH_ID, role: 'Reception', active: true, unavailableDates: [], operationalStatus: 'serving', statusUpdatedAt: demoStatusAt },
  { id: 'tm-munkh', name: 'Оргил Мөнх', initials: 'ОМ', branchId: AUTHORIZED_BRANCH_ID, role: 'Security', active: true, unavailableDates: [], operationalStatus: 'available', statusUpdatedAt: demoStatusAt },
  { id: 'tm-altan', name: 'Сүх Алтан', initials: 'СА', branchId: AUTHORIZED_BRANCH_ID, role: 'Security', active: true, unavailableDates: [], operationalStatus: 'off-shift', statusUpdatedAt: demoStatusAt },
]

function id(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function latestAvailabilityOverride(roster: WeeklyRoster, teamMemberId: string, date: string) {
  return (roster.availabilityOverrides ?? [])
    .filter((item) => item.teamMemberId === teamMemberId && item.date === date)
    .sort((left, right) => right.at.localeCompare(left.at))[0]
}

function dateFallsWithin(date: string, startDate: string, endDate: string): boolean {
  return date >= startDate && date <= endDate
}

function isMemberUnavailable(roster: WeeklyRoster, teamMemberId: string, date: string): boolean {
  const override = latestAvailabilityOverride(roster, teamMemberId, date)
  if (override) return !override.available
  const approvedLeave = (roster.leaveRequests ?? []).some((request) => (
    request.teamMemberId === teamMemberId
    && request.status === 'approved'
    && dateFallsWithin(date, request.startDate, request.endDate)
  ))
  if (approvedLeave) return true
  const member = teamMembers.find((item) => item.id === teamMemberId)
  return Boolean(member?.unavailableDates.includes(date))
}

function isDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && toDateKey(parseDateKey(value)) === value
}

function createRequirements(weekStart: string): StaffingRequirement[] {
  return weekDates(weekStart).flatMap((date, dayIndex) =>
    workforceRoles.map((role) => ({
      date,
      role,
      required: role === 'Entertainer' ? (dayIndex === 4 || dayIndex === 5 ? 3 : 2) : 1,
    })),
  )
}

function assignment(member: TeamMember, date: string, shift: keyof typeof shiftTemplates): ShiftAssignment {
  return {
    id: id('shift'),
    teamMemberId: member.id,
    date,
    role: member.role,
    shift,
    ...shiftTemplates[shift],
    response: 'assigned',
  }
}

function createAttendanceExceptions(weekStart: string, assignments: ShiftAssignment[]): AttendanceException[] {
  const specs: Array<Omit<AttendanceException, 'id' | 'assignmentId' | 'scheduledStart'>> = [
    {
      teamMemberId: 'tm-anu', date: addDays(weekStart, 3), type: 'late', status: 'open',
      checkInAt: `${addDays(weekStart, 3)}T20:13:00+08:00`, lateMinutes: 13,
      evidence: 'Төв салбарын үүдний төхөөрөмжөөр ирснийг баталгаажуулсан.',
    },
    {
      teamMemberId: 'tm-bilguun', date: addDays(weekStart, 3), type: 'no-show', status: 'open',
      evidence: 'Ээлжийн ирэх хугацаанд баталгаажсан ирсэн бүртгэл үүсээгүй.',
    },
    {
      teamMemberId: 'tm-solongo', date: addDays(weekStart, 2), type: 'approved-absence', status: 'approved',
      requestNote: 'Хүний нөөцийн эх бүртгэл дэх зөвшөөрсөн эмнэлгийн чөлөө.',
      evidence: 'Зөвшөөрсөн чөлөөний хүсэлтийг нийтэлсэн ээлжтэй холбосон.',
    },
    {
      teamMemberId: 'tm-enkhjin', date: addDays(weekStart, 1), type: 'mismatch', status: 'open',
      checkInAt: `${addDays(weekStart, 1)}T17:42:00+08:00`,
      evidence: 'Ирсэн бүртгэл байгаа боловч төхөөрөмжийн салбарын код нийтэлсэн ээлжтэй таарахгүй байна.',
    },
    {
      teamMemberId: 'tm-temuulen', date: addDays(weekStart, 4), type: 'correction', status: 'open',
      requestNote: 'Ирэх үед төхөөрөмж сүлжээгүй байсан; хамгаалалтын бүртгэлд 17:55-д орсныг тэмдэглэсэн.',
      evidence: 'Залруулгын хүсэлтэд салбарын хамгаалалтын бүртгэлийн лавлагаа хавсаргасан.',
    },
  ]

  return specs.flatMap((spec) => {
    const source = assignments.find((item) => item.teamMemberId === spec.teamMemberId && item.date === spec.date)
    if (!source) return []
    return [{ ...spec, id: id('attendance'), assignmentId: source.id, scheduledStart: source.start }]
  })
}

function createLeaveRequests(weekStart: string): LeaveRequest[] {
  const submittedAt = new Date().toISOString()
  return [{
    id: id('leave'),
    teamMemberId: 'tm-oyun',
    branchId: AUTHORIZED_BRANCH_ID,
    type: 'day-off',
    startDate: addDays(weekStart, 3),
    endDate: addDays(weekStart, 3),
    reason: 'Гэр бүлийн ажилтай тул энэ оройн ээлжээс амралтын өдөр хүссэн.',
    status: 'pending',
    submittedBy: 'Болд Оюун',
    submittedAt,
  }]
}

function createSeedRoster(weekStart: string): WeeklyRoster {
  const dates = weekDates(weekStart)
  const byRole = (role: WorkforceRole) => teamMembers.filter((member) => member.role === role)
  const entertainers = byRole('Entertainer')
  const servers = byRole('Server')
  const bartenders = byRole('Bartender')
  const security = byRole('Security')
  const receptionist = byRole('Reception')[0]
  const assignments: ShiftAssignment[] = []

  dates.forEach((date, dayIndex) => {
    const entertainerCount = dayIndex === 4 || dayIndex === 5 ? 3 : 2
    const availableEntertainers = Array.from({ length: entertainers.length }, (_, offset) => entertainers[(dayIndex + offset) % entertainers.length])
      .filter((member) => !member.unavailableDates.includes(date))
      .slice(0, entertainerCount)
    availableEntertainers.forEach((member) => assignments.push(assignment(member, date, 'Late')))
    const availableServer = Array.from({ length: servers.length }, (_, offset) => servers[(dayIndex + offset) % servers.length])
      .find((member) => !member.unavailableDates.includes(date))
    if (availableServer) assignments.push(assignment(availableServer, date, 'Evening'))
    if (dayIndex !== 1) assignments.push(assignment(bartenders[dayIndex % bartenders.length], date, 'Evening'))
    assignments.push(assignment(receptionist, date, 'Evening'))
    if (dayIndex !== 6) assignments.push(assignment(security[dayIndex % security.length], date, 'Evening'))
  })

  const now = new Date().toISOString()
  return {
    id: `roster-central-${weekStart}`,
    branchId: 'branch-central',
    branchName: 'Төв салбар',
    managerName: 'Ариун менежер',
    weekStart,
    status: 'draft',
    version: 1,
    publicationDue: `${addDays(weekStart, -3)}T18:00:00+08:00`,
    lastSavedAt: now,
    assignments,
    requirements: createRequirements(weekStart),
    requirementVersion: 1,
    requirementsEffectiveFrom: weekStart,
    attendanceExceptions: createAttendanceExceptions(weekStart, assignments),
    leaveRequests: createLeaveRequests(weekStart),
    availabilityOverrides: [],
    executiveFollowUps: [],
    audit: [{ id: id('audit'), at: now, actor: 'Ариун менежер', action: 'created', version: 1 }],
  }
}

interface StoredState {
  rosters: Record<string, WeeklyRoster>
}

export class BrowserWorkforceService implements WorkforceService {
  private readState(): StoredState {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) return JSON.parse(raw) as StoredState
    } catch {
      // The prototype still works in private/restricted browser storage.
    }
    return { rosters: {} }
  }

  private writeRoster(roster: WeeklyRoster): WeeklyRoster {
    const state = this.readState()
    state.rosters[roster.weekStart] = roster
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Persistence is best-effort in the browser-only prototype.
    }
    return clone(roster)
  }

  getTeamMembers(branchId = AUTHORIZED_BRANCH_ID): TeamMember[] {
    if (branchId !== AUTHORIZED_BRANCH_ID) throw new Error('Энэ салбарт хандах эрхгүй байна.')
    return clone(teamMembers.filter((member) => member.branchId === branchId))
  }

  getRoster(weekStart: string): WeeklyRoster {
    const existing = this.readState().rosters[weekStart]
    if (!existing) return this.writeRoster(createSeedRoster(weekStart))

    const responseDueAt = existing.publishedAt
      ? new Date(new Date(existing.publishedAt).getTime() + ACKNOWLEDGEMENT_WINDOW_MS).toISOString()
      : undefined
    const assignments = existing.assignments.map((item) => (
      item.response === 'assigned' && existing.status === 'published' && !item.responseDueAt
        ? { ...item, responseDueAt }
        : item
    ))
    const needsResponseMigration = assignments.some((item, index) => item !== existing.assignments[index])
    const needsMigration = !('requirementVersion' in existing)
      || !('executiveFollowUps' in existing)
      || !('attendanceExceptions' in existing)
      || !('leaveRequests' in existing)
      || !('availabilityOverrides' in existing)
      || needsResponseMigration
    const roster = {
      ...existing,
      assignments,
      requirementVersion: existing.requirementVersion ?? 1,
      requirementsEffectiveFrom: existing.requirementsEffectiveFrom ?? existing.weekStart,
      attendanceExceptions: existing.attendanceExceptions ?? createAttendanceExceptions(existing.weekStart, assignments),
      leaveRequests: existing.leaveRequests ?? createLeaveRequests(existing.weekStart),
      availabilityOverrides: existing.availabilityOverrides ?? [],
      executiveFollowUps: existing.executiveFollowUps ?? [],
    }
    return needsMigration ? this.writeRoster(roster) : clone(roster)
  }

  getManagerDashboard(weekStart: string): ManagerDashboardSummary {
    const roster = this.getRoster(weekStart)
    const members = this.getTeamMembers(roster.branchId).filter((member) => member.active)
    const count = (status: TeamMember['operationalStatus']) => members.filter((member) => member.operationalStatus === status).length
    const onShiftStatuses = new Set<TeamMember['operationalStatus']>(['reserved', 'serving', 'break', 'late'])
    return {
      onShift: members.filter((member) => onShiftStatuses.has(member.operationalStatus)).length,
      available: count('available'),
      reserved: count('reserved'),
      serving: count('serving'),
      break: count('break'),
      late: count('late'),
      absent: count('absent'),
      leave: count('leave'),
      dataFreshAt: members.reduce((latest, member) => member.statusUpdatedAt > latest ? member.statusUpdatedAt : latest, roster.lastSavedAt),
    }
  }

  getReadiness(weekStart: string): ReadinessRow[] {
    const roster = this.getRoster(weekStart)
    const attendanceAvailable = roster.status === 'published' || roster.status === 'closed' || roster.status === 'superseded'
    const memberById = new Map(teamMembers.map((member) => [member.id, member]))

    return getCoverage(roster).map((row) => {
      const relevant = attendanceAvailable
        ? roster.attendanceExceptions.filter((item) => (
            item.date === row.date && memberById.get(item.teamMemberId)?.role === row.role && item.status !== 'rejected'
          ))
        : []
      const attendanceAbsence = relevant.filter((item) => item.type === 'approved-absence').length
      const approvedLeave = attendanceAvailable
        ? roster.leaveRequests.filter((request) => (
            request.status === 'approved'
            && dateFallsWithin(row.date, request.startDate, request.endDate)
            && memberById.get(request.teamMemberId)?.role === row.role
            && roster.assignments.some((assignment) => (
              assignment.teamMemberId === request.teamMemberId
              && assignment.date === row.date
              && assignment.role === row.role
            ))
          )).length
        : 0
      const approvedAbsence = attendanceAbsence + approvedLeave
      const noShow = relevant.filter((item) => item.type === 'no-show').length
      const late = relevant.filter((item) => item.type === 'late').length
      const checkedIn = attendanceAvailable ? Math.max(0, row.scheduled - attendanceAbsence - noShow) : 0
      return {
        ...row,
        attendanceAvailable,
        checkedIn,
        approvedAbsence,
        noShow,
        late,
        readinessGap: attendanceAvailable ? Math.max(0, row.required - checkedIn) : 0,
      }
    })
  }

  getAttendanceExceptions(weekStart: string): AttendanceException[] {
    const roster = this.getRoster(weekStart)
    if (roster.status === 'draft') return []
    return clone(roster.attendanceExceptions).sort((left, right) => {
      if ((left.status === 'open') !== (right.status === 'open')) return left.status === 'open' ? -1 : 1
      return right.date.localeCompare(left.date)
    })
  }

  getLeaveRequests(weekStart: string, teamMemberId?: string): LeaveRequest[] {
    const roster = this.getRoster(weekStart)
    return clone(roster.leaveRequests)
      .filter((request) => !teamMemberId || request.teamMemberId === teamMemberId)
      .sort((left, right) => {
        if ((left.status === 'pending') !== (right.status === 'pending')) return left.status === 'pending' ? -1 : 1
        return right.submittedAt.localeCompare(left.submittedAt)
      })
  }

  submitLeaveRequest(weekStart: string, input: LeaveRequestInput): WeeklyRoster {
    const roster = this.getRoster(weekStart)
    const member = teamMembers.find((item) => item.id === input.teamMemberId && item.branchId === roster.branchId)
    if (!member?.active) throw new Error('Та зөвхөн өөрийн идэвхтэй салбарын эрхээр чөлөө хүсэж болно.')
    const dates = weekDates(weekStart)
    if (!dates.includes(input.startDate) || !dates.includes(input.endDate) || input.startDate > input.endDate) {
      throw new Error('Сонгосон долоо хоногийн дотор зөв эхлэх, дуусах огноо сонгоно уу.')
    }
    if (input.reason.trim().length < 5) throw new Error('Чөлөө хүсэх шалтгааныг дор хаяж 5 тэмдэгтээр тодорхой бичнэ үү.')
    const overlaps = roster.leaveRequests.some((request) => (
      request.teamMemberId === member.id
      && request.status !== 'rejected'
      && request.startDate <= input.endDate
      && request.endDate >= input.startDate
    ))
    if (overlaps) throw new Error('Сонгосон хугацаанд шийдвэр хүлээж буй эсвэл зөвшөөрсөн хүсэлт аль хэдийн байна.')

    const now = new Date().toISOString()
    const request: LeaveRequest = {
      id: id('leave'),
      teamMemberId: member.id,
      branchId: roster.branchId,
      type: input.type,
      startDate: input.startDate,
      endDate: input.endDate,
      reason: input.reason.trim(),
      status: 'pending',
      submittedBy: member.name,
      submittedAt: now,
    }
    roster.leaveRequests.push(request)
    roster.lastSavedAt = now
    roster.audit.push({
      id: id('audit'),
      at: now,
      actor: member.name,
      action: 'leave-request-submitted',
      reason: `${input.startDate}–${input.endDate}: ${request.reason}`,
      version: roster.version,
    })
    return this.writeRoster(roster)
  }

  decideLeaveRequest(
    weekStart: string,
    requestId: string,
    decision: 'approve' | 'reject',
    reason: string,
  ): WeeklyRoster {
    const roster = this.getRoster(weekStart)
    const request = roster.leaveRequests.find((item) => item.id === requestId && item.branchId === roster.branchId)
    if (!request) throw new Error('Энэ салбарт чөлөөний хүсэлт олдсонгүй.')
    if (request.status !== 'pending') throw new Error('Энэ чөлөөний хүсэлтэд шийдвэр аль хэдийн тэмдэглэгдсэн байна.')
    if (reason.trim().length < 5) throw new Error('Шийдвэрийн шалтгааныг дор хаяж 5 тэмдэгтээр тодорхой бичнэ үү.')

    const now = new Date().toISOString()
    request.status = decision === 'approve' ? 'approved' : 'rejected'
    request.decision = { action: decision, actor: roster.managerName, reason: reason.trim(), at: now }
    roster.lastSavedAt = now
    roster.audit.push({
      id: id('audit'),
      at: now,
      actor: roster.managerName,
      action: 'leave-request-decided',
      reason: `${decision === 'approve' ? 'Зөвшөөрсөн' : 'Татгалзсан'}: ${reason.trim()}`,
      version: roster.version,
    })
    return this.writeRoster(roster)
  }

  getPenaltyReviews(weekStart: string): PenaltyReview[] {
    return this.getAttendanceExceptions(weekStart)
      .filter((exception): exception is AttendanceException & { type: 'late' | 'no-show' } => (
        exception.type === 'late' || exception.type === 'no-show'
      ))
      .map((exception) => ({
        id: `penalty-${exception.id}`,
        exceptionId: exception.id,
        teamMemberId: exception.teamMemberId,
        date: exception.date,
        attendanceType: exception.type,
        scheduledStart: exception.scheduledStart,
        checkInAt: exception.checkInAt,
        lateMinutes: exception.lateMinutes,
        evidence: exception.evidence,
        attendanceStatus: exception.status,
        state: exception.status === 'open'
          ? 'attendance-pending'
          : exception.status === 'confirmed'
            ? 'policy-pending'
            : 'excluded',
      }))
  }

  decideAttendanceException(
    weekStart: string,
    exceptionId: string,
    decision: AttendanceDecisionAction,
    reason: string,
  ): WeeklyRoster {
    const roster = this.getRoster(weekStart)
    if (roster.status === 'draft') throw new Error('Ирцийн зөрчлийг шийдвэрлэхийн өмнө хуваарийг нийтэлнэ үү.')
    const exception = roster.attendanceExceptions.find((item) => item.id === exceptionId)
    if (!exception) throw new Error('Энэ салбарт ирцийн зөрчил олдсонгүй.')
    if (exception.status !== 'open') throw new Error('Энэ ирцийн зөрчилд шийдвэр аль хэдийн тэмдэглэгдсэн байна.')
    if (reason.trim().length < 5) throw new Error('Шийдвэрийн шалтгааныг дор хаяж 5 тэмдэгтээр тодорхой бичнэ үү.')
    const requestDecision = exception.type === 'correction'
    const allowed = requestDecision ? ['approve', 'reject'] : ['excuse', 'confirm']
    if (!allowed.includes(decision)) throw new Error('Сонгосон зөрчилд энэ шийдвэр тохирохгүй байна.')

    const now = new Date().toISOString()
    const statuses = { excuse: 'excused', confirm: 'confirmed', approve: 'approved', reject: 'rejected' } as const
    exception.status = statuses[decision]
    exception.decision = { action: decision, actor: roster.managerName, reason: reason.trim(), at: now }
    roster.lastSavedAt = now
    roster.audit.push({
      id: id('audit'),
      at: now,
      actor: roster.managerName,
      action: 'attendance-decision-recorded',
      reason: `${attendanceDecisionLabels[decision]}: ${reason.trim()}`,
      assignmentId: exception.assignmentId,
      version: roster.version,
    })
    return this.writeRoster(roster)
  }

  overrideAvailability(
    weekStart: string,
    teamMemberId: string,
    date: string,
    available: boolean,
    reason: string,
  ): WeeklyRoster {
    const roster = this.getRoster(weekStart)
    const member = teamMembers.find((item) => item.id === teamMemberId && item.branchId === roster.branchId)
    if (!member?.active) throw new Error('Зөвшөөрөгдсөн салбараас идэвхтэй багийн гишүүн сонгоно уу.')
    if (!weekDates(weekStart).includes(date)) throw new Error('Сонгосон долоо хоногийн доторх огноо сонгоно уу.')
    if (reason.trim().length < 5) throw new Error('Ажиллах боломжийн шалтгааныг дор хаяж 5 тэмдэгтээр тодорхой бичнэ үү.')

    const now = new Date().toISOString()
    roster.availabilityOverrides.push({
      id: id('availability'),
      teamMemberId,
      date,
      available,
      reason: reason.trim(),
      actor: roster.managerName,
      at: now,
    })
    roster.lastSavedAt = now
    roster.audit.push({
      id: id('audit'),
      at: now,
      actor: roster.managerName,
      action: 'availability-overridden',
      reason: `${member.name}-г ${date}-нд ${available ? 'боломжтой' : 'боломжгүй'} гэж тэмдэглэв: ${reason.trim()}`,
      version: roster.version,
    })
    return this.writeRoster(roster)
  }

  saveRequirements(
    weekStart: string,
    requirements: StaffingRequirement[],
    effectiveFrom: string,
    reason: string,
  ): WeeklyRoster {
    const roster = this.getRoster(weekStart)
    if (!reason.trim()) throw new Error('Хүний нөөцийн шаардлага яагаад өөрчлөгдсөнийг бичнэ үү.')
    if (!isDateKey(effectiveFrom)) throw new Error('Эдгээр шаардлага хэрэгжих огноог сонгоно уу.')

    const expectedKeys = weekDates(weekStart).flatMap((date) => workforceRoles.map((role) => `${date}:${role}`))
    const submitted = new Map(requirements.map((item) => [`${item.date}:${item.role}`, item]))
    if (requirements.length !== expectedKeys.length || submitted.size !== expectedKeys.length) {
      throw new Error('Өдөр болон үүрэг тус бүрт нэг хүний нөөцийн шаардлага оруулна уу.')
    }

    const normalized = expectedKeys.map((key) => {
      const item = submitted.get(key)
      if (!item || !Number.isInteger(item.required) || item.required < 0 || item.required > 99) {
        throw new Error('Хүний нөөцийн шаардлага 0-99 хүртэлх бүхэл тоо байна.')
      }
      return { ...item }
    })

    const now = new Date().toISOString()
    roster.requirements = normalized
    roster.requirementVersion += 1
    roster.requirementsEffectiveFrom = effectiveFrom
    roster.lastSavedAt = now
    roster.audit.push({
      id: id('audit'),
      at: now,
      actor: roster.managerName,
      action: 'requirements-updated',
      reason: reason.trim(),
      version: roster.version,
      requirementVersion: roster.requirementVersion,
    })
    return this.writeRoster(roster)
  }

  getExecutiveFollowUp(weekStart: string, now = new Date()): ExecutiveFollowUpSummary {
    const roster = this.getRoster(weekStart)
    const deadline = new Date(roster.publicationDue)
    const hasPublication = Boolean(roster.publishedAt) || roster.status === 'published' || roster.status === 'closed' || roster.status === 'superseded'
    const wasPublishedLate = Boolean(roster.publishedAt && new Date(roster.publishedAt) > deadline)
    const publicationState: ExecutiveFollowUpSummary['publicationState'] = hasPublication
      ? wasPublishedLate ? 'published-late' : 'published-on-time'
      : now > deadline ? 'draft-overdue' : 'draft-on-time'
    const publicationLabels: Record<ExecutiveFollowUpSummary['publicationState'], string> = {
      'draft-overdue': 'Ноорог нийтлэх хугацаа хэтэрсэн',
      'draft-on-time': 'Ноорог нийтлэх хугацаандаа байна',
      'published-late': 'Хуваарийг хугацаа хэтэрч нийтэлсэн',
      'published-on-time': 'Хуваарийг хугацаанд нь нийтэлсэн',
    }
    const coverageGapCount = getCoverage(roster).reduce((total, row) => total + row.gap, 0)
    const pendingAcknowledgementCount = hasPublication
      ? roster.assignments.filter((item) => (
          item.response === 'assigned' && Boolean(item.responseDueAt && new Date(item.responseDueAt) < now)
        )).length
      : 0
    const changeRequestCount = roster.assignments.filter((item) => item.response === 'change-requested').length
    const leaveRequestCount = roster.leaveRequests.filter((item) => item.status === 'pending').length
    const managerEvents = roster.audit.filter((event) => event.actor === roster.managerName)
    const lastManagerEvent = managerEvents[managerEvents.length - 1]
    const actionLabels: Record<string, string> = {
      created: 'Долоо хоногийн ноорог үүсгэсэн',
      copied: 'Өмнөх долоо хоногийг хуулсан',
      'assignment-added': 'Ээлж нэмсэн',
      'assignment-changed': 'Ээлж өөрчилсөн',
      'assignment-removed': 'Ээлж хассан',
      'requirements-updated': 'Хүний нөөцийн шаардлага шинэчилсэн',
      'attendance-decision-recorded': 'Ирцийн зөрчил хянасан',
      'availability-overridden': 'Багийн гишүүний ажиллах боломжийг шинэчилсэн',
      'leave-request-decided': 'Чөлөөний хүсэлт шийдвэрлэсэн',
      published: 'Хуваарь нийтэлсэн',
    }
    const nextAction = publicationState === 'draft-overdue'
      ? 'Салбарын менежертэй холбогдож, дуусах хугацаатай нийтлэх хяналтын даалгавар үүсгэнэ үү.'
      : coverageGapCount > 0
        ? `Хүн дутуу ${coverageGapCount} үүрэг-ээлжийн нөхөх арга хэмжээг баталгаажуулна уу.`
        : changeRequestCount > 0
          ? `Багийн гишүүний ${changeRequestCount} өөрчлөх хүсэлтийг хянана уу.`
          : leaveRequestCount > 0
            ? `Багийн гишүүний ${leaveRequestCount} чөлөөний хүсэлтийг хянана уу.`
          : pendingAcknowledgementCount > 0
            ? `Хугацаа хэтэрсэн ${pendingAcknowledgementCount} баталгаажуулалтыг шийдвэрлэхийг салбарын менежерт мэдэгдэнэ үү.`
            : 'Одоогоор нэмэлт хяналт шаардлагагүй.'

    return {
      publicationState,
      publicationLabel: publicationLabels[publicationState],
      coverageGapCount,
      pendingAcknowledgementCount,
      changeRequestCount,
      leaveRequestCount,
      accountableManager: roster.managerName,
      lastManagerAction: lastManagerEvent ? actionLabels[lastManagerEvent.action] ?? lastManagerEvent.action : 'Менежерийн үйлдэл бүртгэгдээгүй',
      lastManagerActionAt: lastManagerEvent?.at ?? roster.lastSavedAt,
      nextAction,
      dueDate: roster.publicationDue,
      latestFollowUp: roster.executiveFollowUps[roster.executiveFollowUps.length - 1],
    }
  }

  recordExecutiveFollowUp(
    weekStart: string,
    action: 'message' | 'task',
    note: string,
    dueDate?: string,
  ): WeeklyRoster {
    const roster = this.getRoster(weekStart)
    if (!note.trim()) throw new Error('Хяналтын тодорхой тайлбар бичнэ үү.')
    if (action === 'task' && !isDateKey(dueDate ?? '')) {
      throw new Error('Хяналтын даалгаврын дуусах огноог сонгоно уу.')
    }

    const now = new Date().toISOString()
    roster.executiveFollowUps.push({
      id: id('follow-up'),
      createdAt: now,
      createdBy: 'Гүйцэтгэх захирлын демо',
      action,
      note: note.trim(),
      dueDate: action === 'task' ? dueDate : undefined,
      status: action === 'message' ? 'recorded' : 'open',
    })
    roster.lastSavedAt = now
    roster.audit.push({
      id: id('audit'),
      at: now,
      actor: 'Гүйцэтгэх захирлын демо',
      action: action === 'message' ? 'manager-messaged' : 'follow-up-created',
      reason: note.trim(),
      version: roster.version,
    })
    return this.writeRoster(roster)
  }

  getResponseQueue(weekStart: string, now = new Date()): ResponseQueueItem[] {
    const roster = this.getRoster(weekStart)
    if (roster.status !== 'published') return []

    const memberById = new Map(teamMembers.map((member) => [member.id, member]))
    return roster.assignments
      .filter((item) => item.response !== 'acknowledged')
      .flatMap((item) => {
        const member = memberById.get(item.teamMemberId)
        if (!member) return []
        return [{
          assignment: item,
          teamMember: member,
          overdue: item.response === 'assigned' && Boolean(item.responseDueAt && new Date(item.responseDueAt) < now),
        }]
      })
      .sort((left, right) => {
        if (left.assignment.response !== right.assignment.response) {
          return left.assignment.response === 'change-requested' ? -1 : 1
        }
        if (left.overdue !== right.overdue) return left.overdue ? -1 : 1
        return left.assignment.date.localeCompare(right.assignment.date)
      })
  }

  respondToAssignment(
    weekStart: string,
    teamMemberId: string,
    assignmentId: string,
    response: 'acknowledged' | 'change-requested',
    note?: string,
  ): WeeklyRoster {
    const roster = this.getRoster(weekStart)
    if (roster.status !== 'published') throw new Error('Зөвхөн нийтэлсэн ээлжид багийн гишүүн хариу өгч болно.')
    const assignment = roster.assignments.find((item) => item.id === assignmentId)
    if (!assignment || assignment.teamMemberId !== teamMemberId) {
      throw new Error('Та зөвхөн өөрийн нийтэлсэн ээлжид хариу өгч болно.')
    }
    const member = teamMembers.find((item) => item.id === teamMemberId)
    if (!member?.active) throw new Error('Энэ багийн гишүүн салбарт идэвхгүй байна.')
    if (response === 'change-requested' && (note?.trim().length ?? 0) < 5) {
      throw new Error('Өөрчлөх хүсэлтийн шалтгааныг дор хаяж 5 тэмдэгтээр тодорхой бичнэ үү.')
    }

    const now = new Date().toISOString()
    assignment.response = response
    assignment.respondedAt = now
    assignment.respondedBy = member.name
    assignment.responseNote = response === 'change-requested' ? note?.trim() : undefined
    roster.lastSavedAt = now
    roster.audit.push({
      id: id('audit'),
      at: now,
      actor: member.name,
      action: response === 'acknowledged' ? 'assignment-acknowledged' : 'assignment-change-requested',
      reason: assignment.responseNote,
      assignmentId,
      version: roster.version,
    })
    return this.writeRoster(roster)
  }

  recordResponseReminder(weekStart: string, assignmentId: string): WeeklyRoster {
    const roster = this.getRoster(weekStart)
    if (roster.status !== 'published') throw new Error('Баталгаажуулах сануулга тэмдэглэхийн өмнө хуваарийг нийтэлнэ үү.')
    const assignment = roster.assignments.find((item) => item.id === assignmentId)
    if (!assignment || assignment.response !== 'assigned') {
      throw new Error('Сануулгыг зөвхөн хүлээгдэж буй баталгаажуулалтад тэмдэглэж болно.')
    }
    const member = teamMembers.find((item) => item.id === assignment.teamMemberId)
    if (!member) throw new Error('Хуваарилсан багийн гишүүн цаашид боломжгүй байна.')

    const now = new Date().toISOString()
    assignment.lastReminderAt = now
    assignment.reminderCount = (assignment.reminderCount ?? 0) + 1
    roster.lastSavedAt = now
    roster.audit.push({
      id: id('audit'),
      at: now,
      actor: roster.managerName,
      action: 'acknowledgement-reminder-recorded',
      reason: `${member.name}-д сануулсан баримтыг тэмдэглэв. Энэ туршилтын хувилбараас мэдэгдэл илгээгээгүй.`,
      assignmentId,
      version: roster.version,
    })
    return this.writeRoster(roster)
  }

  validateRoster(roster: WeeklyRoster): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    const seen = new Set<string>()

    roster.assignments.forEach((item) => {
      const member = teamMembers.find((candidate) => candidate.id === item.teamMemberId)
      if (!member?.active) {
        issues.push({ severity: 'error', code: 'inactive', message: 'Идэвхгүй багийн гишүүнийг ээлжид хуваарилсан байна.', date: item.date })
        return
      }
      if (member.role !== item.role) {
        issues.push({ severity: 'error', code: 'role', message: `${member.name} нь “${roleLabels[item.role]}” үүрэгт тохирохгүй.`, date: item.date, role: item.role })
      }
      if (isMemberUnavailable(roster, member.id, item.date)) {
        issues.push({ severity: 'error', code: 'leave', message: `${member.name} нь ${item.date}-нд ажиллах боломжгүй.`, date: item.date, role: item.role })
      }
      const duplicateKey = `${item.teamMemberId}:${item.date}`
      if (seen.has(duplicateKey)) {
        issues.push({ severity: 'error', code: 'overlap', message: `${member.name}-ийн ${item.date}-ны ээлжүүд давхцаж байна.`, date: item.date, role: item.role })
      }
      seen.add(duplicateKey)
    })

    getCoverage(roster)
      .filter((item) => item.gap > 0)
      .forEach((item) => {
        issues.push({
          severity: 'warning',
          code: 'coverage',
          message: `${item.date}: “${roleLabels[item.role]}” үүрэг доод хэмжээнээс ${item.gap}-аар дутуу байна.`,
          date: item.date,
          role: item.role,
        })
      })
    return issues
  }

  upsertAssignment(weekStart: string, input: AssignmentInput): WeeklyRoster {
    const roster = this.getRoster(weekStart)
    const member = teamMembers.find((candidate) => candidate.id === input.teamMemberId)
    if (!member?.active) throw new Error('Энэ салбараас идэвхтэй багийн гишүүн сонгоно уу.')
    if (isMemberUnavailable(roster, member.id, input.date)) throw new Error('Энэ багийн гишүүн сонгосон өдөр ажиллах боломжгүй.')
    const duplicate = roster.assignments.find(
      (item) => item.teamMemberId === input.teamMemberId && item.date === input.date && item.id !== input.id,
    )
    if (duplicate) throw new Error('Энэ багийн гишүүн сонгосон өдөр аль хэдийн ээлжтэй байна.')
    if (roster.status === 'published' && !input.reason?.trim()) {
      throw new Error('Нийтэлсэн хуваарийг өөрчлөхөд шалтгаан заавал бичнэ.')
    }

    const existingIndex = input.id ? roster.assignments.findIndex((item) => item.id === input.id) : -1
    const nextAssignment: ShiftAssignment = {
      id: input.id ?? id('shift'),
      teamMemberId: member.id,
      date: input.date,
      role: member.role,
      shift: input.shift,
      ...shiftTemplates[input.shift],
      response: 'assigned',
      responseDueAt: roster.status === 'published'
        ? new Date(Date.now() + ACKNOWLEDGEMENT_WINDOW_MS).toISOString()
        : undefined,
    }
    if (existingIndex >= 0) roster.assignments[existingIndex] = nextAssignment
    else roster.assignments.push(nextAssignment)

    if (roster.status === 'published') roster.version += 1
    roster.lastSavedAt = new Date().toISOString()
    roster.audit.push({
      id: id('audit'),
      at: roster.lastSavedAt,
      actor: roster.managerName,
      action: existingIndex >= 0 ? 'assignment-changed' : 'assignment-added',
      reason: input.reason?.trim() || undefined,
      assignmentId: nextAssignment.id,
      version: roster.version,
    })
    return this.writeRoster(roster)
  }

  removeAssignment(weekStart: string, assignmentId: string, reason?: string): WeeklyRoster {
    const roster = this.getRoster(weekStart)
    if (roster.status === 'published' && !reason?.trim()) {
      throw new Error('Нийтэлсэн ээлжийг хасахад шалтгаан заавал бичнэ.')
    }
    if (!roster.assignments.some((item) => item.id === assignmentId)) return roster
    roster.assignments = roster.assignments.filter((item) => item.id !== assignmentId)
    if (roster.status === 'published') roster.version += 1
    roster.lastSavedAt = new Date().toISOString()
    roster.audit.push({
      id: id('audit'),
      at: roster.lastSavedAt,
      actor: roster.managerName,
      action: 'assignment-removed',
      reason: reason?.trim() || undefined,
      assignmentId,
      version: roster.version,
    })
    return this.writeRoster(roster)
  }

  publishRoster(weekStart: string, shortageReason?: string): WeeklyRoster {
    const roster = this.getRoster(weekStart)
    const issues = this.validateRoster(roster)
    if (issues.some((issue) => issue.severity === 'error')) {
      throw new Error('Нийтлэхийн өмнө ээлжийн шалгалтын алдааг шийдвэрлэнэ үү.')
    }
    if (issues.some((issue) => issue.code === 'coverage') && !shortageReason?.trim()) {
      throw new Error('Доод хангалтаас дутуугаар нийтлэхийн өмнө шалтгаан тэмдэглэнэ үү.')
    }
    const now = new Date().toISOString()
    roster.status = 'published'
    roster.publishedAt = now
    roster.lastSavedAt = now
    const responseDueAt = new Date(new Date(now).getTime() + ACKNOWLEDGEMENT_WINDOW_MS).toISOString()
    roster.assignments = roster.assignments.map((item) => ({
      ...item,
      response: 'assigned',
      responseDueAt,
      respondedAt: undefined,
      respondedBy: undefined,
      responseNote: undefined,
      lastReminderAt: undefined,
      reminderCount: 0,
    }))
    roster.audit.push({
      id: id('audit'),
      at: now,
      actor: roster.managerName,
      action: 'published',
      reason: shortageReason?.trim() || undefined,
      version: roster.version,
    })
    return this.writeRoster(roster)
  }

  copyPreviousWeek(weekStart: string): WeeklyRoster {
    const previous = this.getRoster(addDays(weekStart, -7))
    const now = new Date().toISOString()
    const roster = createSeedRoster(weekStart)
    roster.assignments = previous.assignments.map((item) => ({
      ...item,
      id: id('shift'),
      date: addDays(item.date, 7),
      response: 'assigned',
      responseDueAt: undefined,
      respondedAt: undefined,
      respondedBy: undefined,
      responseNote: undefined,
      lastReminderAt: undefined,
      reminderCount: 0,
    }))
    roster.requirements = previous.requirements.map((item) => ({ ...item, date: addDays(item.date, 7) }))
    roster.requirementsEffectiveFrom = weekStart
    roster.requirementVersion = 1
    roster.attendanceExceptions = []
    roster.leaveRequests = []
    roster.availabilityOverrides = []
    roster.audit = [{
      id: id('audit'),
      at: now,
      actor: roster.managerName,
      action: 'copied',
      reason: `${previous.weekStart}-ны хуваарийг хуулсан`,
      version: 1,
    }]
    roster.lastSavedAt = now
    return this.writeRoster(roster)
  }
}

export function resetWorkforcePrototype(): void {
  window.localStorage.removeItem(STORAGE_KEY)
}
