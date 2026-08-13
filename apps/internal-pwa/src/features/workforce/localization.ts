import type {
  AssignmentResponse,
  AttendanceDecisionAction,
  AttendanceExceptionStatus,
  AttendanceExceptionType,
  EntertainerRank,
  OperationalStatus,
  RosterAuditEvent,
  RosterStatus,
  ShiftTemplateName,
  WorkforceRole,
} from './models'

export const MN_LOCALE = 'mn-MN'

const weekdayLabels = {
  long: ['Ням гараг', 'Даваа гараг', 'Мягмар гараг', 'Лхагва гараг', 'Пүрэв гараг', 'Баасан гараг', 'Бямба гараг'],
  short: ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя'],
} as const

export const roleLabels: Record<WorkforceRole, string> = {
  Entertainer: 'Энтертайнер',
  Server: 'Зөөгч',
  Bartender: 'Бармен',
  Reception: 'Хүлээн авах',
  Security: 'Хамгаалалт',
}

export const shiftLabels: Record<ShiftTemplateName, string> = {
  Evening: 'Орой',
  Late: 'Шөнө',
  Day: 'Өдөр',
}

export const rosterStatusLabels: Record<RosterStatus, string> = {
  draft: 'Ноорог',
  published: 'Нийтэлсэн',
  closed: 'Хаасан',
  superseded: 'Шинэчилсэн',
}

export const assignmentResponseLabels: Record<AssignmentResponse, string> = {
  assigned: 'Хариу хүлээж байна',
  acknowledged: 'Хүлээн авснаа баталсан',
  'change-requested': 'Өөрчлөлт хүссэн',
}

export const operationalStatusLabels: Record<OperationalStatus, string> = {
  available: 'Боломжтой',
  reserved: 'Захиалгатай',
  serving: 'Үйлчилж байна',
  break: 'Завсарлагатай',
  late: 'Хоцорсон',
  absent: 'Ирээгүй',
  leave: 'Чөлөөтэй',
  'off-shift': 'Ээлжгүй',
}

export const entertainerRankLabels: Record<EntertainerRank, string> = {
  Rank1: '1-р зэрэглэл',
  Rank2: '2-р зэрэглэл',
  Rank3: '3-р зэрэглэл',
}

export const attendanceExceptionLabels: Record<AttendanceExceptionType, string> = {
  late: 'Хоцорсон ирэлт',
  'no-show': 'Мэдэгдэлгүй ирээгүй',
  'approved-absence': 'Зөвшөөрсөн чөлөө',
  mismatch: 'Хуваарь, ирцийн зөрүү',
  correction: 'Залруулгын хүсэлт',
  'leave-request': 'Чөлөөний хүсэлт',
}

export const attendanceDecisionLabels: Record<AttendanceDecisionAction, string> = {
  excuse: 'Чөлөөлөх',
  confirm: 'Баталгаажуулах',
  approve: 'Зөвшөөрөх',
  reject: 'Татгалзах',
}

export const attendanceStatusLabels: Record<AttendanceExceptionStatus, string> = {
  open: 'Нээлттэй',
  approved: 'Зөвшөөрсөн',
  excused: 'Чөлөөлсөн',
  confirmed: 'Баталгаажуулсан',
  rejected: 'Татгалзсан',
}

export const auditActionLabels: Record<RosterAuditEvent['action'], string> = {
  created: 'Долоо хоногийн ноорог үүсгэсэн',
  copied: 'Өмнөх долоо хоногийг хуулсан',
  'assignment-added': 'Ээлж нэмсэн',
  'assignment-changed': 'Ээлж өөрчилсөн',
  'assignment-removed': 'Ээлж хассан',
  published: 'Хуваарь нийтэлсэн',
  'requirements-updated': 'Хүний нөөцийн доод шаардлага шинэчилсэн',
  'manager-messaged': 'Салбарын менежерт мэдэгдэл тэмдэглэсэн',
  'follow-up-created': 'Гүйцэтгэх захирлын даалгавар үүсгэсэн',
  'assignment-acknowledged': 'Ээлж хүлээн авснаа баталсан',
  'assignment-change-requested': 'Ээлж өөрчлөх хүсэлт гаргасан',
  'acknowledgement-reminder-recorded': 'Баталгаажуулалтын сануулгын баримт тэмдэглэсэн',
  'attendance-decision-recorded': 'Ирцийн шийдвэр тэмдэглэсэн',
  'availability-overridden': 'Ажиллах боломжийг өөрчилсөн',
}

export function dateAtNoon(value: string): Date {
  return new Date(`${value}T12:00:00`)
}

export function formatDate(
  value: string | Date,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' },
): string {
  const date = typeof value === 'string'
    ? value.includes('T') ? new Date(value) : dateAtNoon(value)
    : value
  const parts: string[] = []
  const weekdayStyle = options.weekday === 'long' ? 'long' : 'short'
  if (options.weekday) parts.push(weekdayLabels[weekdayStyle][date.getDay()])

  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  let calendarDate = ''
  if (options.year) {
    calendarDate = options.month
      ? `${year} оны ${month}-р сар${options.day ? `ын ${day}` : ''}`
      : `${year} он${options.day ? `ы ${day}` : ''}`
  } else if (options.month) {
    calendarDate = `${month}-р сар${options.day ? `ын ${day}` : ''}`
  } else if (options.day) {
    calendarDate = String(day)
  }
  if (calendarDate) parts.push(calendarDate)

  return parts.join(', ')
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return `${formatDate(date)}, ${formatTime(date)}`
}

export function formatTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
