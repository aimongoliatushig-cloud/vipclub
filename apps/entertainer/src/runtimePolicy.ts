export const STAFF_TABS = [
  'home',
  'people',
  'schedule',
  'income',
  'loan',
  'rank',
  'notifications',
  'profile',
  'attendance-qr',
  'leave',
  'roster-review',
  'person-detail',
  'workday',
  'corrections',
  'attendance-admin',
  'readiness',
  'rounds',
  'climate',
  'guests',
  'requests',
] as const

export type StaffMode = 'admin' | 'manager' | 'lead' | 'entertainer' | 'employee'
export type StaffTab = (typeof STAFF_TABS)[number]

export const ROLE_TAB_ALLOWLIST: Readonly<Record<StaffMode, readonly StaffTab[]>> = Object.freeze({
  admin: Object.freeze([
    'home',
    'profile',
    'attendance-admin',
  ] as const),
  manager: Object.freeze([
    'home',
    'people',
    'schedule',
    'notifications',
    'profile',
    'leave',
    'roster-review',
    'person-detail',
    'corrections',
    'attendance-qr',
  ] as const),
  lead: Object.freeze([
    'home',
    'schedule',
    'income',
    'loan',
    'rank',
    'notifications',
    'profile',
    'attendance-qr',
    'leave',
    'workday',
    'readiness',
    'rounds',
    'climate',
    'guests',
    'requests',
  ] as const),
  entertainer: Object.freeze([
    'home',
    'schedule',
    'income',
    'loan',
    'rank',
    'notifications',
    'profile',
    'attendance-qr',
    'leave',
    'workday',
    'climate',
    'requests',
  ] as const),
  employee: Object.freeze([
    'home',
    'profile',
    'attendance-qr',
    'guests',
  ] as const),
})

export function isStaffMode(value: unknown): value is StaffMode {
  return value === 'admin' || value === 'manager' || value === 'lead' || value === 'entertainer' || value === 'employee'
}

export function isStaffTab(value: unknown): value is StaffTab {
  return typeof value === 'string' && (STAFF_TABS as readonly string[]).includes(value)
}

export function canAccessStaffTab(mode: StaffMode, tab: unknown): tab is StaffTab {
  return isStaffTab(tab) && (ROLE_TAB_ALLOWLIST[mode] as readonly string[]).includes(tab)
}

export const isTabAllowed = canAccessStaffTab

export function resolveStaffTab(mode: StaffMode, candidate: unknown, fallback: StaffTab = 'home'): StaffTab {
  if (canAccessStaffTab(mode, candidate)) return candidate
  return canAccessStaffTab(mode, fallback) ? fallback : 'home'
}

export type ApiFailureKind =
  | 'session-expired'
  | 'permission-denied'
  | 'offline'
  | 'timeout'
  | 'network'
  | 'server'

export type StaffApiFailureKind = ApiFailureKind

export const API_FAILURE_USER_MESSAGES: Readonly<Record<ApiFailureKind, string>> = Object.freeze({
  'session-expired': 'Таны нэвтрэх хугацаа дууссан байна. Дахин нэвтэрнэ үү.',
  'permission-denied': 'Энэ мэдээллийг харах эсвэл үйлдлийг хийх эрх танд алга.',
  offline: 'Интернет холболтгүй байна. Сүлжээ орсны дараа дахин оролдоно уу.',
  timeout: 'Сүлжээ удаан байна. Интернетээ шалгаад дахин оролдоно уу.',
  network: 'Сервертэй холбогдож чадсангүй. Түр хүлээгээд дахин оролдоно уу.',
  server: 'Мэдээлэл боловсруулахад алдаа гарлаа. Дахин оролдоно уу.',
})

export function messageForFailure(kind: StaffApiFailureKind, fallback = 'Хүсэлт амжилтгүй боллоо.'): string {
  return API_FAILURE_USER_MESSAGES[kind] || fallback
}

export class StaffApiError extends Error {
  readonly kind: StaffApiFailureKind
  readonly status?: number
  readonly serverMessage?: string
  readonly retryable: boolean
  readonly invalidatesSession: boolean

  constructor(
    kind: StaffApiFailureKind,
    options: Readonly<{ status?: number; message?: string; serverMessage?: string; cause?: unknown }> = {},
  ) {
    super(options.message || messageForFailure(kind))
    this.name = 'StaffApiError'
    this.kind = kind
    this.status = options.status
    this.serverMessage = options.serverMessage
    this.retryable = kind === 'offline' || kind === 'timeout' || kind === 'network' || kind === 'server'
    this.invalidatesSession = kind === 'session-expired'
    if (options.cause !== undefined) this.cause = options.cause
  }
}

export type ApiFailureInput = Readonly<{
  status?: number
  message?: string
  payload?: unknown
  cause?: unknown
  online?: boolean
  aborted?: boolean
  sessionExpired?: boolean
}>

export type ClassifiedApiFailure = Readonly<{
  kind: ApiFailureKind
  status?: number
  message: string
  serverMessage?: string
  retryable: boolean
  invalidatesSession: boolean
}>

export type RuntimeFailureView = 'login' | 'session-expired' | 'access-denied' | 'offline' | 'error'

type UnknownRecord = Record<string, unknown>

const SESSION_STATUS = new Set([401, 419, 440])
const SESSION_MARKERS = [
  'login to accessfunction',
  'please sign in',
  'login required',
  'authentication required',
  'session expired',
  'session has expired',
  'not permitted to access this resource. login',
  'нэвтрэх хугацаа дууссан',
  'нэвтэрнэ үү',
]

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stripMarkup(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function collectMessages(value: unknown, target: string[], depth = 0): void {
  if (depth > 5 || value === undefined || value === null) return

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return
    if (/^[[{"]/.test(trimmed)) {
      try {
        const parsed: unknown = JSON.parse(trimmed)
        if (parsed !== value) {
          collectMessages(parsed, target, depth + 1)
          return
        }
      } catch {
        // A normal server message may start with punctuation; keep it as text.
      }
    }
    const clean = stripMarkup(trimmed)
    if (clean) target.push(clean)
    return
  }

  if (Array.isArray(value)) {
    value.forEach(item => collectMessages(item, target, depth + 1))
    return
  }

  if (isRecord(value)) {
    for (const key of ['message', '_server_messages', 'exception', 'exc']) {
      if (key in value) collectMessages(value[key], target, depth + 1)
    }
  }
}

export function extractApiFailureMessage(payload: unknown, cause?: unknown): string | undefined {
  const messages: string[] = []
  collectMessages(payload, messages)
  if (isRecord(cause) && typeof cause.message === 'string') collectMessages(cause.message, messages)
  else if (cause instanceof Error) collectMessages(cause.message, messages)
  return messages.find(Boolean)
}

function statusFrom(input: ApiFailureInput): number | undefined {
  if (typeof input.status === 'number' && Number.isFinite(input.status)) return input.status
  if (isRecord(input.cause) && typeof input.cause.status === 'number' && Number.isFinite(input.cause.status)) {
    return input.cause.status
  }
  return undefined
}

function causeName(cause: unknown): string {
  if (cause instanceof Error) return cause.name
  if (isRecord(cause) && typeof cause.name === 'string') return cause.name
  return ''
}

function hasSessionMarker(payload: unknown, message: string): boolean {
  const payloadType = isRecord(payload) && typeof payload.exc_type === 'string' ? payload.exc_type.toLowerCase() : ''
  if (payloadType.includes('authentication') || payloadType.includes('sessionexpired')) return true
  const normalized = message.toLowerCase()
  return SESSION_MARKERS.some(marker => normalized.includes(marker))
}

function createFailure(kind: ApiFailureKind, status: number | undefined, serverMessage?: string): ClassifiedApiFailure {
  return Object.freeze({
    kind,
    ...(status === undefined ? {} : { status }),
    message: messageForFailure(kind),
    ...(serverMessage ? { serverMessage } : {}),
    retryable: kind === 'offline' || kind === 'timeout' || kind === 'network' || kind === 'server',
    invalidatesSession: kind === 'session-expired',
  })
}

export function classifyApiFailure(input: ApiFailureInput): ClassifiedApiFailure {
  const status = statusFrom(input)
  const serverMessage = extractApiFailureMessage(input.payload, input.message || input.cause)
  const message = serverMessage || ''

  if (input.sessionExpired === true) return createFailure('session-expired', status, serverMessage)
  if (status !== undefined && SESSION_STATUS.has(status)) {
    return createFailure('session-expired', status, serverMessage)
  }
  if (status === 403) {
    return createFailure(hasSessionMarker(input.payload, message) ? 'session-expired' : 'permission-denied', status, serverMessage)
  }
  if (input.online === false) return createFailure('offline', status, serverMessage)

  const name = causeName(input.cause).toLowerCase()
  const normalized = message.toLowerCase()
  if (input.aborted === true || name === 'aborterror' || normalized.includes('timeout') || normalized.includes('timed out')) {
    return createFailure('timeout', status, serverMessage)
  }
  if (name === 'typeerror' && status === undefined) return createFailure('network', status, serverMessage)
  return createFailure('server', status, serverMessage)
}

export function failureViewFor(failure: ClassifiedApiFailure, hadAuthenticatedSession = false): RuntimeFailureView {
  if (failure.kind === 'session-expired') return hadAuthenticatedSession ? 'session-expired' : 'login'
  if (failure.kind === 'permission-denied') return 'access-denied'
  if (failure.kind === 'offline') return 'offline'
  return 'error'
}
