import {
  shiftTemplates,
  workforceRoles,
  type AssignmentInput,
  type AttendanceDecisionAction,
  type AttendanceException,
  type CoverageRow,
  type ExecutiveFollowUpSummary,
  type ManagerDashboardSummary,
  type ReadinessRow,
  type ResponseQueueItem,
  type ShiftAssignment,
  type StaffingRequirement,
  type TeamMember,
  type ValidationIssue,
  type WeeklyRoster,
  type WorkforceRole,
} from './models'

const STORAGE_KEY = 'vipclub.workforce.manager-prototype.v1'
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
  { id: 'tm-anu', name: 'Anu Bat', initials: 'AB', branchId: AUTHORIZED_BRANCH_ID, role: 'Entertainer', active: true, unavailableDates: [], operationalStatus: 'serving', statusUpdatedAt: demoStatusAt, rank: 'Gold' },
  { id: 'tm-bolor', name: 'Bolor Erdene', initials: 'BE', branchId: AUTHORIZED_BRANCH_ID, role: 'Entertainer', active: true, unavailableDates: [], operationalStatus: 'reserved', statusUpdatedAt: demoStatusAt, rank: 'Silver' },
  { id: 'tm-naraa', name: 'Naraa Munkh', initials: 'NM', branchId: AUTHORIZED_BRANCH_ID, role: 'Entertainer', active: true, unavailableDates: [], operationalStatus: 'break', statusUpdatedAt: demoStatusAt, rank: 'Bronze' },
  { id: 'tm-solongo', name: 'Solongo Tseren', initials: 'ST', branchId: AUTHORIZED_BRANCH_ID, role: 'Entertainer', active: true, unavailableDates: [addDays(demoWeekStart, 3)], operationalStatus: 'late', statusUpdatedAt: demoStatusAt, rank: 'Diamond' },
  { id: 'tm-temuulen', name: 'Temuulen Baatar', initials: 'TB', branchId: AUTHORIZED_BRANCH_ID, role: 'Server', active: true, unavailableDates: [], operationalStatus: 'serving', statusUpdatedAt: demoStatusAt },
  { id: 'tm-bilguun', name: 'Bilguun Dorj', initials: 'BD', branchId: AUTHORIZED_BRANCH_ID, role: 'Server', active: true, unavailableDates: [addDays(demoWeekStart, 4)], operationalStatus: 'absent', statusUpdatedAt: demoStatusAt },
  { id: 'tm-sarnai', name: 'Sarnai Gan', initials: 'SG', branchId: AUTHORIZED_BRANCH_ID, role: 'Bartender', active: true, unavailableDates: [], operationalStatus: 'available', statusUpdatedAt: demoStatusAt },
  { id: 'tm-oyun', name: 'Oyun Bold', initials: 'OB', branchId: AUTHORIZED_BRANCH_ID, role: 'Bartender', active: true, unavailableDates: [], operationalStatus: 'leave', statusUpdatedAt: demoStatusAt },
  { id: 'tm-enkhjin', name: 'Enkhjin Amar', initials: 'EA', branchId: AUTHORIZED_BRANCH_ID, role: 'Reception', active: true, unavailableDates: [], operationalStatus: 'serving', statusUpdatedAt: demoStatusAt },
  { id: 'tm-munkh', name: 'Munkh Orgil', initials: 'MO', branchId: AUTHORIZED_BRANCH_ID, role: 'Security', active: true, unavailableDates: [], operationalStatus: 'available', statusUpdatedAt: demoStatusAt },
  { id: 'tm-altan', name: 'Altan Sukh', initials: 'AS', branchId: AUTHORIZED_BRANCH_ID, role: 'Security', active: true, unavailableDates: [], operationalStatus: 'off-shift', statusUpdatedAt: demoStatusAt },
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

function isMemberUnavailable(roster: WeeklyRoster, teamMemberId: string, date: string): boolean {
  const override = latestAvailabilityOverride(roster, teamMemberId, date)
  if (override) return !override.available
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
      evidence: 'Verified device check-in at the Central Branch entrance.',
    },
    {
      teamMemberId: 'tm-bilguun', date: addDays(weekStart, 3), type: 'no-show', status: 'open',
      evidence: 'No verified check-in was recorded by the shift threshold.',
    },
    {
      teamMemberId: 'tm-solongo', date: addDays(weekStart, 2), type: 'approved-absence', status: 'approved',
      requestNote: 'Approved medical leave from the HR source record.',
      evidence: 'Approved Leave Application linked to the published assignment.',
    },
    {
      teamMemberId: 'tm-oyun', date: addDays(weekStart, 3), type: 'leave-request', status: 'open',
      requestNote: 'Family appointment; requesting this evening away from the branch.',
      evidence: 'Team-member leave request submitted before shift start.',
    },
    {
      teamMemberId: 'tm-enkhjin', date: addDays(weekStart, 1), type: 'mismatch', status: 'open',
      checkInAt: `${addDays(weekStart, 1)}T17:42:00+08:00`,
      evidence: 'Check-in exists, but the device branch code differs from the published assignment.',
    },
    {
      teamMemberId: 'tm-temuulen', date: addDays(weekStart, 4), type: 'correction', status: 'open',
      requestNote: 'Device was offline at arrival; security log records entry at 17:55.',
      evidence: 'Correction request includes the branch security desk reference.',
    },
  ]

  return specs.flatMap((spec) => {
    const source = assignments.find((item) => item.teamMemberId === spec.teamMemberId && item.date === spec.date)
    if (!source) return []
    return [{ ...spec, id: id('attendance'), assignmentId: source.id, scheduledStart: source.start }]
  })
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
    branchName: 'Central Branch',
    managerName: 'Ariun Manager',
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
    availabilityOverrides: [],
    executiveFollowUps: [],
    audit: [{ id: id('audit'), at: now, actor: 'Ariun Manager', action: 'created', version: 1 }],
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
    if (branchId !== AUTHORIZED_BRANCH_ID) throw new Error('Branch access denied.')
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
      || !('availabilityOverrides' in existing)
      || needsResponseMigration
    const roster = {
      ...existing,
      assignments,
      requirementVersion: existing.requirementVersion ?? 1,
      requirementsEffectiveFrom: existing.requirementsEffectiveFrom ?? existing.weekStart,
      attendanceExceptions: existing.attendanceExceptions ?? createAttendanceExceptions(existing.weekStart, assignments),
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
      const approvedAbsence = relevant.filter((item) => (
        item.type === 'approved-absence' || (item.type === 'leave-request' && item.status === 'approved')
      )).length
      const noShow = relevant.filter((item) => item.type === 'no-show').length
      const late = relevant.filter((item) => item.type === 'late').length
      const checkedIn = attendanceAvailable ? Math.max(0, row.scheduled - approvedAbsence - noShow) : 0
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

  decideAttendanceException(
    weekStart: string,
    exceptionId: string,
    decision: AttendanceDecisionAction,
    reason: string,
  ): WeeklyRoster {
    const roster = this.getRoster(weekStart)
    if (roster.status === 'draft') throw new Error('Publish the roster before deciding an attendance exception.')
    const exception = roster.attendanceExceptions.find((item) => item.id === exceptionId)
    if (!exception) throw new Error('Attendance exception not found in this branch.')
    if (exception.status !== 'open') throw new Error('This attendance exception already has a recorded outcome.')
    if (reason.trim().length < 5) throw new Error('Add a specific decision reason of at least 5 characters.')
    const requestDecision = exception.type === 'correction' || exception.type === 'leave-request'
    const allowed = requestDecision ? ['approve', 'reject'] : ['excuse', 'confirm']
    if (!allowed.includes(decision)) throw new Error('This decision is not valid for the selected exception.')

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
      reason: `${decision}: ${reason.trim()}`,
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
    if (!member?.active) throw new Error('Choose an active team member from the authorized branch.')
    if (!weekDates(weekStart).includes(date)) throw new Error('Choose a date within the selected week.')
    if (reason.trim().length < 5) throw new Error('Add a specific availability reason of at least 5 characters.')

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
      reason: `${member.name} marked ${available ? 'available' : 'unavailable'} on ${date}: ${reason.trim()}`,
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
    if (!reason.trim()) throw new Error('Record why the staffing requirement changed.')
    if (!isDateKey(effectiveFrom)) throw new Error('Choose when these requirements take effect.')

    const expectedKeys = weekDates(weekStart).flatMap((date) => workforceRoles.map((role) => `${date}:${role}`))
    const submitted = new Map(requirements.map((item) => [`${item.date}:${item.role}`, item]))
    if (requirements.length !== expectedKeys.length || submitted.size !== expectedKeys.length) {
      throw new Error('Provide one staffing requirement for every day and role.')
    }

    const normalized = expectedKeys.map((key) => {
      const item = submitted.get(key)
      if (!item || !Number.isInteger(item.required) || item.required < 0 || item.required > 99) {
        throw new Error('Staffing requirements must be whole numbers from 0 to 99.')
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
      'draft-overdue': 'Draft is overdue for publication',
      'draft-on-time': 'Draft is still within its publication window',
      'published-late': 'Schedule was published after its deadline',
      'published-on-time': 'Schedule was published on time',
    }
    const coverageGapCount = getCoverage(roster).reduce((total, row) => total + row.gap, 0)
    const pendingAcknowledgementCount = hasPublication
      ? roster.assignments.filter((item) => (
          item.response === 'assigned' && Boolean(item.responseDueAt && new Date(item.responseDueAt) < now)
        )).length
      : 0
    const changeRequestCount = roster.assignments.filter((item) => item.response === 'change-requested').length
    const managerEvents = roster.audit.filter((event) => event.actor === roster.managerName)
    const lastManagerEvent = managerEvents[managerEvents.length - 1]
    const actionLabels: Record<string, string> = {
      created: 'Created the weekly draft',
      copied: 'Copied the previous week',
      'assignment-added': 'Added an assignment',
      'assignment-changed': 'Changed an assignment',
      'assignment-removed': 'Removed an assignment',
      'requirements-updated': 'Updated staffing requirements',
      'attendance-decision-recorded': 'Reviewed an attendance exception',
      'availability-overridden': 'Updated team-member availability',
      published: 'Published the schedule',
    }
    const nextAction = publicationState === 'draft-overdue'
      ? 'Contact the Branch Manager and create a due-dated publication follow-up.'
      : coverageGapCount > 0
        ? `Confirm mitigation for ${coverageGapCount} uncovered role-shift${coverageGapCount === 1 ? '' : 's'}.`
        : changeRequestCount > 0
          ? `Review ${changeRequestCount} team-member change request${changeRequestCount === 1 ? '' : 's'}.`
          : pendingAcknowledgementCount > 0
            ? `Ask the Branch Manager to resolve ${pendingAcknowledgementCount} overdue acknowledgement${pendingAcknowledgementCount === 1 ? '' : 's'}.`
            : 'No follow-up is currently required.'

    return {
      publicationState,
      publicationLabel: publicationLabels[publicationState],
      coverageGapCount,
      pendingAcknowledgementCount,
      changeRequestCount,
      accountableManager: roster.managerName,
      lastManagerAction: lastManagerEvent ? actionLabels[lastManagerEvent.action] ?? lastManagerEvent.action : 'No manager activity recorded',
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
    if (!note.trim()) throw new Error('Add a specific follow-up note.')
    if (action === 'task' && !isDateKey(dueDate ?? '')) {
      throw new Error('Choose a due date for the follow-up task.')
    }

    const now = new Date().toISOString()
    roster.executiveFollowUps.push({
      id: id('follow-up'),
      createdAt: now,
      createdBy: 'CEO Demo',
      action,
      note: note.trim(),
      dueDate: action === 'task' ? dueDate : undefined,
      status: action === 'message' ? 'recorded' : 'open',
    })
    roster.lastSavedAt = now
    roster.audit.push({
      id: id('audit'),
      at: now,
      actor: 'CEO Demo',
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
    if (roster.status !== 'published') throw new Error('Only published assignments can receive a team-member response.')
    const assignment = roster.assignments.find((item) => item.id === assignmentId)
    if (!assignment || assignment.teamMemberId !== teamMemberId) {
      throw new Error('You can respond only to your own published assignment.')
    }
    const member = teamMembers.find((item) => item.id === teamMemberId)
    if (!member?.active) throw new Error('This team member is not active in the branch.')
    if (response === 'change-requested' && (note?.trim().length ?? 0) < 5) {
      throw new Error('Add a specific change-request reason of at least 5 characters.')
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
    if (roster.status !== 'published') throw new Error('Publish the roster before recording an acknowledgement reminder.')
    const assignment = roster.assignments.find((item) => item.id === assignmentId)
    if (!assignment || assignment.response !== 'assigned') {
      throw new Error('A reminder can be recorded only for a pending acknowledgement.')
    }
    const member = teamMembers.find((item) => item.id === assignment.teamMemberId)
    if (!member) throw new Error('The assigned team member is no longer available.')

    const now = new Date().toISOString()
    assignment.lastReminderAt = now
    assignment.reminderCount = (assignment.reminderCount ?? 0) + 1
    roster.lastSavedAt = now
    roster.audit.push({
      id: id('audit'),
      at: now,
      actor: roster.managerName,
      action: 'acknowledgement-reminder-recorded',
      reason: `Reminder evidence recorded for ${member.name}. No message was sent by this prototype.`,
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
        issues.push({ severity: 'error', code: 'inactive', message: 'Inactive team member is assigned.', date: item.date })
        return
      }
      if (member.role !== item.role) {
        issues.push({ severity: 'error', code: 'role', message: `${member.name} is not eligible for ${item.role}.`, date: item.date, role: item.role })
      }
      if (isMemberUnavailable(roster, member.id, item.date)) {
        issues.push({ severity: 'error', code: 'leave', message: `${member.name} is unavailable on ${item.date}.`, date: item.date, role: item.role })
      }
      const duplicateKey = `${item.teamMemberId}:${item.date}`
      if (seen.has(duplicateKey)) {
        issues.push({ severity: 'error', code: 'overlap', message: `${member.name} has overlapping shifts on ${item.date}.`, date: item.date, role: item.role })
      }
      seen.add(duplicateKey)
    })

    getCoverage(roster)
      .filter((item) => item.gap > 0)
      .forEach((item) => {
        issues.push({
          severity: 'warning',
          code: 'coverage',
          message: `${item.date}: ${item.role} is ${item.gap} below minimum.`,
          date: item.date,
          role: item.role,
        })
      })
    return issues
  }

  upsertAssignment(weekStart: string, input: AssignmentInput): WeeklyRoster {
    const roster = this.getRoster(weekStart)
    const member = teamMembers.find((candidate) => candidate.id === input.teamMemberId)
    if (!member?.active) throw new Error('Choose an active team member from this branch.')
    if (isMemberUnavailable(roster, member.id, input.date)) throw new Error('This team member is unavailable on the selected date.')
    const duplicate = roster.assignments.find(
      (item) => item.teamMemberId === input.teamMemberId && item.date === input.date && item.id !== input.id,
    )
    if (duplicate) throw new Error('This team member already has a shift on the selected date.')
    if (roster.status === 'published' && !input.reason?.trim()) {
      throw new Error('A reason is required to change a published schedule.')
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
      throw new Error('A reason is required to remove a published assignment.')
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
      throw new Error('Resolve assignment validation errors before publishing.')
    }
    if (issues.some((issue) => issue.code === 'coverage') && !shortageReason?.trim()) {
      throw new Error('Record a reason before publishing below minimum coverage.')
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
    roster.availabilityOverrides = []
    roster.audit = [{
      id: id('audit'),
      at: now,
      actor: roster.managerName,
      action: 'copied',
      reason: `Copied roster ${previous.weekStart}`,
      version: 1,
    }]
    roster.lastSavedAt = now
    return this.writeRoster(roster)
  }
}

export function resetWorkforcePrototype(): void {
  window.localStorage.removeItem(STORAGE_KEY)
}
