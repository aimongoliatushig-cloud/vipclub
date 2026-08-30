import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { access, cp, mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { constants as fsConstants, existsSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { basename, extname, join, normalize, resolve, sep } from 'node:path'
import { createRequire } from 'node:module'
import test, { after, before } from 'node:test'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const APP_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const DIST_ROOT = join(APP_ROOT, 'dist')
const SCREENSHOT_ROOT = join(tmpdir(), 'nomad-bat118-e2e')
const VIEWPORT = { width: 390, height: 844 }

function loadPlaywright() {
  try {
    return require('playwright')
  } catch (localError) {
    const candidates = [
      process.env.NOMAD_PLAYWRIGHT_MODULE,
      ...String(process.env.NODE_PATH || '').split(process.platform === 'win32' ? ';' : ':').filter(Boolean).map(path => join(path, 'playwright')),
      join(homedir(), '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright'),
    ].filter(Boolean)
    for (const candidate of candidates) {
      if (existsSync(join(candidate, 'package.json'))) return require(candidate)
    }
    throw new Error(`Playwright олдсонгүй. NOMAD_PLAYWRIGHT_MODULE эсвэл NODE_PATH тохируулна уу. ${localError.message}`)
  }
}

function chromeExecutable() {
  const candidates = [
    process.env.NOMAD_CHROME_EXECUTABLE,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].filter(Boolean)
  return candidates.find(existsSync)
}

const MIME = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

const managerContext = {
  user: 'manager.qa@example.test',
  full_name: 'Сапфайр Менежер',
  branch: 'Sapphire',
  mode: 'manager',
  employee: 'EMP-MANAGER-QA',
  can_scan_attendance: true,
}

const managerSettings = {
  branch: 'Sapphire',
  sales: { weight: 40, full_score_amount: 4000000, configured: true },
  attendance: { late_after_time: '22:00:00' },
  modified: '2026-08-12 09:00:00.000000',
}

const managerDashboard = {
  branch: 'Sapphire',
  date: '2026-08-12',
  summary: {
    total: 1,
    scheduled: 1,
    on_shift: 1,
    checked_in: 1,
    late: 0,
    absent: 0,
    leave: 0,
    off: 0,
    available: 1,
    reserved: 0,
    working: 0,
    break: 0,
    pending_readiness: 0,
    pending_leave: 0,
    pending_corrections: 0,
  },
  roster: [{
    profile: 'VIP-ENT-SECRET',
    display_name: 'Нууц Ажилтан',
    rank: 'Rank 3',
    lifecycle_status: 'Active',
    status: 'checked_in',
    shift: { name: 'SHIFT-QA', shift_type: 'VIP Night Shift', shift: { start_time: '18:00:00', end_time: '04:00:00' } },
    availability: { status: 'Available', state_version: 1 },
  }],
  meta: { api_version: 'v1', generated_at: '2026-08-12 01:30:00', limit: 20, cursor: 0, next_cursor: null, total: 1 },
}

const entertainerContext = {
  user: 'entertainer.qa@example.test',
  full_name: 'Ану',
  branch: 'Sapphire',
  mode: 'entertainer',
  profile: 'VIP-ENT-QA',
}

const adminContext = {
  user: 'admin.qa@example.test',
  full_name: 'Системийн админ',
  branch: 'Бүх салбар',
  mode: 'admin',
}

const leadContext = {
  user: 'lead.qa@example.test',
  full_name: 'Ахлах бүжигчин',
  branch: 'Sapphire',
  mode: 'lead',
  profile: 'VIP-ENT-LEAD-QA',
}

const employeeContext = {
  user: 'employee.qa@example.test',
  full_name: 'Бат Ажилтан',
  branch: 'Nomad',
  mode: 'employee',
  employee: 'EMP-QA-GENERAL',
  designation: 'Бармен',
  can_scan_attendance: true,
}

const managerScheduleData = {
  branch: 'Sapphire',
  window: { from: '2026-08-12', to: '2026-08-18' },
  dates: ['2026-08-12', '2026-08-13', '2026-08-14', '2026-08-15', '2026-08-16', '2026-08-17', '2026-08-18'],
  shift_types: [{ name: 'VIP Night Shift', start_time: '22:00:00', end_time: '05:00:00' }],
  people: [{
    profile: 'VIP-ENT-QA', employee: 'EMP-ENT-QA', display_name: 'Ану', role_label: 'Бүжигчин', member_type: 'Entertainer', identity_state: 'Confirmed Entertainer Profile', rank: 'Rank 3',
    days: ['2026-08-12', '2026-08-13', '2026-08-14', '2026-08-15', '2026-08-16', '2026-08-17', '2026-08-18'].map((date, index) => ({
      date,
      editable: index > 0,
      assignment: index === 1 ? { name: 'SHIFT-ASSIGN-QA', shift_type: 'VIP Night Shift', modified: '2026-08-12 12:00:00' } : null,
      imported: index === 1 || index === 2 ? { source: 'Finex', scheduled: true, attendance_type: index === 1 ? 1 : null, attendance_name: index === 1 ? 'Ирсэн' : null, store_name: 'Sapphire', synced_at: '2026-08-12 08:15:00' } : null,
      schedule_conflict: index === 2,
    })),
  }, {
    profile: null, employee: 'EMP-BAR-QA', display_name: 'Бат', role_label: 'Бармен', member_type: 'Employee', identity_state: 'Employee Master', rank: null,
    days: ['2026-08-12', '2026-08-13', '2026-08-14', '2026-08-15', '2026-08-16', '2026-08-17', '2026-08-18'].map((date, index) => ({
      date,
      editable: index > 0,
      assignment: index === 1 ? { name: 'SHIFT-BAR-QA', shift_type: 'VIP Night Shift', modified: '2026-08-12 12:00:00' } : null,
      imported: null,
      schedule_conflict: false,
    })),
  }],
  source_meta: { authoritative: 'ERPNext Shift Assignment', imported: 'Finex dancerSchedule', imported_rows: 2, conflicts: 1, entertainer_count: 1, employee_count: 1, unlinked_candidates: 1, unlinked_rows: 7 },
}

const readinessQueueData = {
  branch: 'Sapphire',
  work_date: '2026-08-12',
  summary: { total: 2, pending: 1, ready: 1, not_ready: 0 },
  queue: [{
    entertainer: 'VIP-ENT-QA', stage_name: 'Ану', shift_assignment: 'SHIFT-ASSIGN-QA', shift_type: 'VIP Night Shift',
    readiness_status: 'PENDING',
    attendance: { checked_in: true, checked_in_at: '2026-08-12 22:02:00', employee_checkin: 'CHECKIN-QA' },
  }, {
    entertainer: 'VIP-ENT-READY', stage_name: 'Болор', shift_assignment: 'SHIFT-ASSIGN-READY', shift_type: 'VIP Night Shift',
    readiness_status: 'READY',
    attendance: { checked_in: true, checked_in_at: '2026-08-12 21:58:00', employee_checkin: 'CHECKIN-READY' },
  }],
}

const entertainerDashboard = {
  profile: {
    name: 'VIP-ENT-QA',
    employee_name: 'Ану',
    stage_name: 'Ану',
    branch: 'Sapphire',
    current_rank: 'Rank 3',
    current_points: 320,
    is_demo: true,
  },
  shift: { name: 'SHIFT-QA', shift_type: 'VIP Night Shift', shift: { start_time: '18:00:00', end_time: '04:00:00' } },
  latest_checkin: { name: 'IN-QA', time: '2026-08-12 18:05:00', log_type: 'IN' },
  attendance: { checked_in: true, checked_out: false, open: true, work_date: '2026-08-12', active_window: true },
  readiness: null,
  next_reservation: null,
  week: {
    start: '2026-08-10',
    end: '2026-08-16',
    days: ['10', '11', '12', '13', '14', '15', '16'].map((day, index) => ({
      date: `2026-08-${day}`,
      assignment: index < 5 ? `A-${day}` : null,
      shift_type: index < 5 ? 'VIP Night Shift' : null,
      start_time: index < 5 ? '18:00:00' : null,
      end_time: index < 5 ? '04:00:00' : null,
    })),
  },
  work_summary: { scheduled_days: 5, active_deduction: 0, late_minutes: 0, leave_used: 1, leave_remaining: 1 },
}

function workdayData(status = 'Available', stateVersion = 2, name = 'AVAIL-QA-002') {
  return {
    date: '2026-08-12',
    profile: { name: 'VIP-ENT-QA', display_name: 'Ану', branch: 'Sapphire' },
    shift: { name: 'SHIFT-QA', shift_type: 'VIP Night Shift', shift: { start_time: '18:00:00', end_time: '04:00:00' } },
    attendance: { checked_in: true, checked_out: false, open: true, attendance_mode: 'arrival_only', requires_checkout: false, attendance_complete: true, events: [{ name: 'IN-QA', time: '2026-08-12 18:05:00', log_type: 'IN' }] },
    availability: {
      name,
      status,
      state_version: stateVersion,
      occurred_at: '2026-08-12 18:10:00',
      allowed_next: status === 'Available' ? ['Unavailable'] : status === 'Unavailable' ? ['Available'] : [],
    },
    summary: { verified_minutes: 0, completed_days: 0, arrival_days: 5, completed_services: 0 },
    correction_requests: [],
  }
}

const _legacyRankData = {
  current: { current_rank: 'Rank 3', approved_rank: 'Rank 3', current_points: 73.16 },
  next: { name: 'Rank 2', minimum_points: 600, benefits: '' },
  ranks: [
    { name: 'Rank 3', code: 'Rank 3', rank_order: 1, minimum_points: 0 },
    { name: 'Rank 2', code: 'Rank 2', rank_order: 2, minimum_points: 600 },
    { name: 'Rank 1', code: 'Rank 1', rank_order: 3, minimum_points: 1000 },
  ],
  recommendation: { rank: 'Rank 3', points: 320, requires_human_approval: true, evidence_only: true },
  policy: { mode: 'Shadow', cadence: 'Every 15 Days', configuration_required: true },
  evaluation: {
    interval_days: 15,
    last_evaluated_at: '2026-08-10 08:30:00',
    next_evaluation_at: '2026-08-25 08:30:00',
    remaining_days: 13,
    due: false,
  },
  evidence: [
    { key: 'sales', label: 'Борлуулалт ба гүйцэтгэл', status: 'verified', value: 18, unit: 'үйлчилгээ', detail: '9 баталгаажсан баримтаас' },
    { key: 'attendance', label: 'Ирц ба найдвартай байдал', status: 'verified', value: 5, unit: 'баталгаажсан ирц', detail: 'Хоцролт 0 · таслалт 0' },
    { key: 'loyalty', label: 'Давтан үйлчлүүлэгч', status: 'verified', value: 1, unit: 'давтан үйлчлүүлэгч', detail: 'Харилцагчтай холбогдсон 6 төлөгдсөн баримтаас' },
    { key: 'behavior', label: 'Ажлын бэлэн байдал ба сахилга', status: 'verified', value: 4, unit: 'баталгаажсан үнэлгээ', detail: 'Бэлэн байдлын үнэлгээ' },
  ],
  daily_rank: {
    name: 'DAILY-RANK-QA', revision: 1, scoring_date: '2026-08-12', status: 'Complete',
    weighted_score: 73.16, displayed_score: 73.16, calculated_rank: 'Rank 3', approved_rank: 'Rank 3',
    change_state: 'No Change', missing_components: [], components: [],
  },
  finex: { window: { from: '2026-06-12', to: '2026-08-12' }, points: 320 },
  recent_points: [],
}

const rankData = {
  scoring_date: '2026-08-12', score: 73.16, score_status: 'complete',
  effective_rank: 'Rank 3', effective_rank_label: '3-р зэрэг', effective_from: '2026-08-01', payout_percent: 50,
  calculated_next_rank: 'Rank 3', calculated_next_rank_label: '3-р зэрэг', calculated_next_payout_percent: 50, next_effective_from: null,
  next_rank: 'Rank 2', next_rank_label: '2-р зэрэг', next_rank_threshold: 80, missing_score: 6.84,
  missing_components: [],
  components: [
    ['attendance', 'Ирц', 82, 10, 8.2],
    ['customer_complaints', 'Зочны санал, гомдол', 100, 15, 15],
    ['sales', 'Борлуулалт', 65, 40, 26],
    ['entertaining_skill', 'Үзвэр, бүжгийн ур чадвар', 85, 5, 4.25],
    ['cleanliness_beauty', 'Цэвэр байдал, төрх', 60, 5, 3],
    ['shift_effort', 'Өдрийн гараа', 57.14, 10, 5.714],
    ['personal_development', 'Хувийн хөгжил', 80, 5, 4],
    ['entertainer_attitude', 'Хандлага', 70, 10, 7],
  ].map(([key, label, score, weight, contribution]) => ({
    key, label, score, weight, contribution, data_status: 'verified',
    target_status: score >= 70 ? 'met' : 'not_met', source_label: 'Бүрдсэн мэдээлэл',
  })),
  history: [
    { scoring_date: '2026-08-12', score: 73.16, score_status: 'complete', calculated_rank: 'Rank 3', calculated_rank_label: '3-р зэрэг', next_day_effective_rank: 'Rank 3', next_day_effective_rank_label: '3-р зэрэг' },
  ],
  rules: [
    { rank: 'Rank 3', label: '3-р зэрэг', minimum_score: 0, maximum_score: 80, maximum_inclusive: false, payout_percent: 50 },
    { rank: 'Rank 2', label: '2-р зэрэг', minimum_score: 80, maximum_score: 90, maximum_inclusive: false, payout_percent: 60 },
    { rank: 'Rank 1', label: '1-р зэрэг', minimum_score: 90, maximum_score: 100, maximum_inclusive: true, payout_percent: 70 },
  ],
}

const rankIncomeComparison = {
  selected_month: '2026-08',
  period: { from: '2026-08-01', to: '2026-08-31', calculated_through: '2026-08-12', can_next: false },
  scoring_date: '2026-08-12',
  comparison_mode: 'daily_rank_calendar_period',
  data_state: 'verified',
  deduction_status: 'available',
  service_count: 18,
  baseline: { rank: 'Rank 3', percent: 50, service_income: 8400000, deduction: 0, calculated_salary: 4200000 },
  scenario: { rank: 'Rank 2', percent: 60, service_income: 8400000, deduction: 0, calculated_salary: 5040000 },
  delta: 840000,
  mutates_payroll: false,
}

const loanOverview = {
  policy: { status: 'Configuration Required', request_enabled: false, message: 'Зээлийн нөхцөл баталгаажаагүй байна.' },
  evidence: { employment_type: 'Employee', branch: 'Nomad', current_rank: 'Rank 3', tenure_days: 420, verified_income: 4200000, income_window: { from: '2026-06-12', to: '2026-08-12' }, verified_bill_count: 9, outstanding_balance: null },
  required_decisions: ['Зээлийн дээд дүнгийн томьёо', 'Эргэн төлөх хувь', 'Батлах эрх'],
}

const requestHubData = {
  summary: { pending_count: 1, resolved_count: 2, submitted_count: 1, total_count: 4 },
  items: [
    { id: 'LEAVE-QA-1', kind: 'leave', status: 'pending', submitted_at: '2026-08-20 21:00:00', title: 'Чөлөө', detail: '8-р сарын 28' },
    { id: 'CORR-QA-1', kind: 'attendance_correction', status: 'approved', submitted_at: '2026-08-19 20:00:00', title: 'Ирц засвар', detail: '8-р сарын 19' },
    { id: 'FEEDBACK-QA-1', kind: 'team_feedback', status: 'submitted', submitted_at: '2026-08-16 20:00:00', title: 'Багийн санал', detail: 'Илгээсэн' },
    { id: 'PROFILE-QA-1', kind: 'profile_change', status: 'approved', submitted_at: '2026-08-10 20:00:00', title: 'Профайл өөрчлөх', detail: 'Зураг шинэчлэх' },
  ],
  next_cursor: null,
}

const finexSummary = {
  window: { from: '2026-08-01', to: '2026-08-12' },
  current_month_income: 4200000,
  net_income: 4200000,
  points: 420,
  point_rule_mnt: 10000,
  service_count: 18,
  bill_count: 9,
  months: [],
  days: [
    { date: '2026-08-02', income: 650000, cumulative_income: 650000 },
    { date: '2026-08-05', income: 850000, cumulative_income: 1500000 },
    { date: '2026-08-09', income: 1200000, cumulative_income: 2700000 },
    { date: '2026-08-12', income: 1500000, cumulative_income: 4200000 },
  ],
  recent_services: [
    { key: 'aug-service-1', date: '2026-08-12', service: 'VIP Table Service', service_total: 3000000, amount: 1500000, percent: 50, payout_rank: 'Rank 3', rate_source: 'rank_policy' },
    { key: 'aug-service-2', date: '2026-08-09', service: 'Table Service', service_total: 2400000, amount: 1200000, percent: 50, payout_rank: 'Rank 3', rate_source: 'rank_policy' },
    { key: 'aug-service-3', date: '2026-08-05', service: 'VIP Table Service', service_total: 1700000, amount: 850000, percent: 50, payout_rank: 'Rank 3', rate_source: 'rank_policy' },
    { key: 'aug-service-4', date: '2026-08-02', service: 'Table Service', service_total: 1300000, amount: 650000, percent: 50, payout_rank: 'Rank 3', rate_source: 'rank_policy' },
  ],
  payout_policy: { rank: 'Rank 3', percent: 50, source: 'ERPNext confirmed rank policy', applies_to: 'table_service' },
  quality: { verified: true, skipped_inconsistent_items: 0, skipped_malformed_bills: 0 },
  rank: { current: { name: 'Rank 3', minimum_points: 0 }, next: { name: 'Rank 2', minimum_points: 600 }, remaining_points: 280 },
}

const leavePolicyData = {
  policy: {
    absence_deduction: 150000,
    late_deduction_per_minute: 500,
    same_day_request_deadline: '21:00:00',
    request_deadline_basis: 'previous_day',
    emergency_leave_monthly_limit: 2,
    timezone: 'Asia/Ulaanbaatar',
  },
  quota: { used: 0, remaining: 2 },
  requests: [],
  penalties: [],
}

function workforceProfile(overrides = {}) {
  return {
    name: 'VIP-ENT-QA',
    employee: 'EMP-QA-001',
    employee_name: 'Ану Бат',
    stage_name: 'Ану',
    branch: 'Sapphire',
    employment_type: 'Employee',
    lifecycle_status: 'Active',
    skills: 'Contemporary dance',
    languages: 'Монгол',
    service_tags: 'VIP room',
    style_tags: 'Дэгжин',
    profile_photo: null,
    media_consent_status: 'Denied',
    current_rank: 'Rank 3',
    current_points: 73.16,
    daily_rank: { name: 'DAILY-RANK-QA', revision: 1, scoring_date: '2026-08-12', status: 'Complete', weighted_score: 73.16, displayed_score: 73.16, calculated_rank: 'Rank 3', approved_rank: 'Rank 3', change_state: 'No Change', missing_components: [], components: [] },
    modified: '2026-08-12 09:00:00.000000',
    ...overrides,
  }
}

function workforceWorkspace(profile = workforceProfile()) {
  return {
    branch: 'Sapphire',
    profile,
    performance: {
      ...finexSummary,
      points: 820,
      current_month_income: 2350000,
      net_income: 8650000,
      service_count: 34,
      bill_count: 17,
      recent_services: [{ key: 'service-1', date: '2026-08-12', service: 'VIP үйлчилгээ', service_total: 457142.86, amount: 320000, percent: 70, payout_rank: 'Rank 1', rate_source: 'rank_policy' }],
      payout_policy: { rank: 'Rank 1', percent: 70, effective_from: '2026-08-01', source: 'Зэрэглэлийн түүх', applies_to: 'table_service' },
      last_synced_at: '2026-08-13 08:00:00',
    },
    week: { start: '2026-08-10', end: '2026-08-16', days: [] },
    attendance: [],
    penalties: [{
      name: 'PENALTY-QA-001', attendance_date: '2026-08-12', penalty_type: 'Late', late_minutes: 8,
      rate: 500, amount: 4000, status: 'Pending Review', reason: '8 минут хоцорсон.',
      modified: '2026-08-12 10:02:00.000000',
    }],
    leave_requests: [],
    summary: { scheduled_days: 0, attendance_events: 0, late_minutes: 0, active_deduction: 0 },
    manager_controls: {
      availability: { status: 'Unavailable', state_version: 0 },
      availability_options: ['Unavailable', 'Available', 'Scheduled', 'Reserved', 'Working', 'Break', 'Leave'],
      daily_rank: profile.daily_rank,
    },
    meta: { api_version: 'v1', generated_at: '2026-08-12 10:00:00', profile_version: profile.modified },
  }
}

function pendingProfileRequest(overrides = {}) {
  return {
    name: 'PROFILE-CHANGE-QA-001',
    entertainer: 'VIP-ENT-QA',
    branch: 'Sapphire',
    status: 'Pending',
    requested_at: '2026-08-12 10:00:00',
    requested_by: entertainerContext.user,
    modified: '2026-08-12 10:01:00.000000',
    base_profile_modified: '2026-08-12 09:00:00.000000',
    current_profile_modified: '2026-08-12 09:00:00.000000',
    changed_fields: ['stage_name', 'skills'],
    changes: [
      { field: 'stage_name', before: 'Ану', after: 'Ану Прайм' },
      { field: 'skills', before: 'Contemporary dance', after: 'Contemporary dance\nHeels choreography' },
    ],
    current: { stage_name: 'Ану', skills: 'Contemporary dance' },
    proposed: { stage_name: 'Ану Прайм', skills: 'Contemporary dance\nHeels choreography' },
    ...overrides,
  }
}

function rosterCandidate(name, displayName, modified = '2026-08-12 12:00:00') {
  return {
    name,
    finex_dancer_id: name,
    dancer_name: displayName,
    dancer_nickname: displayName,
    inferred_branch: 'Sapphire',
    observed_branches: 'Sapphire: 3 тооцооны баримт',
    bill_count: 3,
    first_seen: '2026-08-01',
    last_seen: '2026-08-12',
    suggested_classification: 'Entertainer',
    review_status: 'Pending',
    modified,
  }
}

function rosterPage(candidates, cursor, nextCursor, total) {
  return {
    branch: 'Sapphire',
    status: 'Pending',
    search: '',
    summary: { total, pending: total, entertainer: 0, staff: 0, inactive: 0 },
    candidates,
    profiles: [{ name: 'VIP-ENT-QA', employee: 'EMP-QA', employee_name: 'Ану', stage_name: 'Ану', current_rank: 'Rank 1', lifecycle_status: 'Active' }],
    meta: {
      api_version: 'v1',
      generated_at: '2026-08-12 12:00:00',
      limit: 50,
      cursor,
      next_cursor: nextCursor,
      total,
    },
  }
}

let browser
let server
let origin
let servedRoot

function methodName(url) {
  const marker = '/method/'
  return decodeURIComponent(url.includes(marker) ? url.split(marker)[1].split('?')[0] : '')
}

function success(message) {
  return { status: 200, payload: { message } }
}

function forbidden(message = 'Энэ мэдээллийг харах эрхгүй байна.') {
  return { status: 403, payload: { exc_type: 'PermissionError', message } }
}

function expired() {
  return { status: 403, payload: { exc_type: 'PermissionError', session_expired: 1, message: 'Please sign in.' } }
}

async function installApi(context, resolver) {
  await context.route('**/staff-api/method/**', async route => {
    const request = route.request()
    const method = methodName(request.url())
    let result = await resolver(method, request, route)
    if (method.endsWith('management.get_app_entry') && !result?.payload?.message?.destination) {
      result = success({ authenticated: true, destination: 'staff' })
    }
    if (result === 'abort') {
      await route.abort('internetdisconnected')
      return
    }
    const response = result || success({})
    await route.fulfill({
      status: response.status,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify(response.payload),
    })
  })
}

async function defaultManagerApi(method) {
  if (method.endsWith('workforce.get_context')) return success(managerContext)
  if (method.endsWith('workforce.get_manager_dashboard')) return success(managerDashboard)
  if (method.endsWith('manager_settings.get_manager_settings')) return success(managerSettings)
  if (method.endsWith('attendance.get_my_attendance_status')) return success({
    employee: 'EMP-MANAGER-QA', employee_name: 'Сапфайр Менежер', branch: 'Sapphire', work_date: '2026-08-12',
    action: 'IN', attendance_mode: 'arrival_and_departure', requires_checkout: true,
    attendance_complete: false, checked_in: false, checked_out: false, open: false,
    late_after_time: '22:00:00', late_minutes: 0,
  })
  if (method.endsWith('attendance.get_my_attendance_history')) return success({ employee: 'EMP-MANAGER-QA', branch: 'Sapphire', days: [] })
  return success({})
}

async function defaultEntertainerApi(method) {
  if (method.endsWith('workforce.get_context')) return success(entertainerContext)
  if (method.endsWith('entertainer.get_dashboard')) return success(entertainerDashboard)
  if (method.endsWith('entertainer.get_rank')) return success(rankData)
  if (method.endsWith('rank_income_comparison.get_rank_income_comparison')) return success(rankIncomeComparison)
  if (method.endsWith('entertainer.get_loan_overview')) return success(loanOverview)
  if (method.endsWith('entertainer.get_my_request_hub')) return success(requestHubData)
  if (method.endsWith('entertainer_finex.get_finex_summary')) return success(finexSummary)
  if (method.endsWith('workday.get_workday')) return success(workdayData())
  if (method.endsWith('attendance_policy.get_leave_policy')) return success(leavePolicyData)
  if (method.endsWith('attendance.get_my_attendance_status')) return success({
    employee: 'EMP-QA', employee_name: 'Ану', branch: 'Sapphire', work_date: '2026-08-12',
    action: 'IN', attendance_mode: 'arrival_only', requires_checkout: false,
    attendance_complete: true, checked_in: true, checked_out: false, open: true,
    checked_in_at: '2026-08-12 21:54:00', late_after_time: '22:00:00', late_minutes: 0,
    latest_checkin: { name: 'IN-QA', time: '2026-08-12 21:54:00', log_type: 'IN' },
  })
  if (method.endsWith('attendance.get_my_attendance_history')) return success({
    employee: 'EMP-QA', branch: 'Sapphire', days: [
      { work_date: '2026-08-12', status: 'arrived', checked_in_at: '2026-08-12 21:54:00', checked_out_at: null, late_minutes: 0, shift: 'VIP Night Shift' },
      { work_date: '2026-08-11', status: 'late', checked_in_at: '2026-08-11 22:08:00', checked_out_at: null, late_minutes: 8, shift: 'VIP Night Shift' },
      { work_date: '2026-08-10', status: 'completed', checked_in_at: '2026-08-10 21:50:00', checked_out_at: '2026-08-11 04:02:00', late_minutes: 0, shift: 'VIP Night Shift' },
      { work_date: '2026-08-09', status: 'arrived', checked_in_at: '2026-08-09 21:47:00', checked_out_at: null, late_minutes: 0, shift: 'VIP Night Shift' },
    ],
  })
  return success({})
}

async function defaultLeadApi(method) {
  if (method.endsWith('workforce.get_context')) return success(leadContext)
  if (method.endsWith('entertainer.get_dashboard')) return success({ ...entertainerDashboard, profile: { ...entertainerDashboard.profile, name: leadContext.profile, stage_name: 'Ахлах бүжигчин' } })
  if (method.endsWith('entertainer.get_rank')) return success(rankData)
  if (method.endsWith('supervisor.get_readiness_queue')) return success(readinessQueueData)
  if (method.endsWith('entertainer_finex.get_finex_summary')) return success(finexSummary)
  if (method.endsWith('entertainer.get_my_request_hub')) return success(requestHubData)
  return success({})
}

function safeDistPath(pathname) {
  const relative = decodeURIComponent(pathname.replace(/^\/staff\/?/, ''))
  const candidate = normalize(join(servedRoot, relative))
  return candidate === servedRoot || candidate.startsWith(`${servedRoot}${sep}`) ? candidate : null
}

async function startServer() {
  await access(join(DIST_ROOT, 'index.html'), fsConstants.R_OK)
  servedRoot = await mkdtemp(join(tmpdir(), 'nomad-bat118-dist-'))
  await cp(DIST_ROOT, servedRoot, { recursive: true })
  server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || '/', 'http://127.0.0.1')
      if (url.pathname.startsWith('/staff-api/') || url.pathname.startsWith('/api/') || url.pathname.startsWith('/private/') || url.pathname.startsWith('/files/')) {
        response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
        response.end(JSON.stringify({ message: 'BAT118_TOP_SECRET' }))
        return
      }
      if (url.pathname.startsWith('/staff/assets/') && basename(url.pathname).includes('bat118-')) {
        response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' })
        response.end('globalThis.__BAT118_PUBLIC_ASSET__ = true')
        return
      }
      if (url.pathname === '/staff' || url.pathname === '/staff/') {
        const body = await readFile(join(servedRoot, 'index.html'))
        response.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-cache' })
        response.end(body)
        return
      }
      if (url.pathname === '/vip-entry' || url.pathname === '/vip-entry/') {
        response.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-cache' })
        response.end('<!doctype html><html lang="mn"><body><h1>VIP Entry</h1></body></html>')
        return
      }
      const candidate = safeDistPath(url.pathname)
      if (candidate) {
        try {
          const info = await stat(candidate)
          if (info.isFile()) {
            const body = await readFile(candidate)
            response.writeHead(200, { 'Content-Type': MIME[extname(candidate)] || 'application/octet-stream' })
            response.end(body)
            return
          }
        } catch {
          // Unknown staff routes use the SPA shell below.
        }
      }
      if (url.pathname.startsWith('/staff/') && !extname(url.pathname)) {
        const body = await readFile(join(servedRoot, 'index.html'))
        response.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-cache' })
        response.end(body)
        return
      }
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      response.end('Not found')
    } catch (error) {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
      response.end(error instanceof Error ? error.message : String(error))
    }
  })
  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen)
    server.listen(0, '127.0.0.1', resolveListen)
  })
  const address = server.address()
  origin = `http://127.0.0.1:${address.port}`
}

async function closeServer() {
  if (server) await new Promise((resolveClose, rejectClose) => server.close(error => error ? rejectClose(error) : resolveClose()))
  if (servedRoot) await rm(servedRoot, { recursive: true, force: true })
}

async function assertNoHorizontalOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }))
  assert.ok(dimensions.document <= dimensions.viewport + 1, `${label}: document ${dimensions.document}px > viewport ${dimensions.viewport}px`)
  assert.ok(dimensions.body <= dimensions.viewport + 1, `${label}: body ${dimensions.body}px > viewport ${dimensions.viewport}px`)
}

async function visibleBottomNavLabels(page) {
  return page.locator('.bottom-nav button:visible').allTextContents().then(labels => labels.map(label => label.replace(/\s+/g, ' ').trim()))
}

async function waitForEntertainerShell(page) {
  await page.getByRole('button', { name: /Миний мэдээлэл нээх/ }).waitFor()
  await page.locator('.dancer-home-overview').waitFor()
}

function trackBrowserErrors(page) {
  const errors = []
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  page.on('pageerror', error => errors.push(`page: ${error.message}`))
  return errors
}

async function runScenario(name, setup, verify, options = {}) {
  const context = await browser.newContext({
    viewport: options.viewport || VIEWPORT,
    locale: 'mn-MN',
    timezoneId: 'Asia/Ulaanbaatar',
    serviceWorkers: options.serviceWorkers || 'block',
    reducedMotion: options.reducedMotion || 'no-preference',
  })
  const page = await context.newPage()
  page.setDefaultTimeout(7_000)
  page.setDefaultNavigationTimeout(15_000)
  try {
    if (setup) await setup(context, page)
    await page.goto(`${origin}/staff/${options.search || ''}`, { waitUntil: options.waitUntil || 'networkidle' })
    await verify(context, page)
  } catch (error) {
    const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const screenshot = join(SCREENSHOT_ROOT, `${safeName}.png`)
    await page.screenshot({ path: screenshot, fullPage: true }).catch(() => undefined)
    if (error instanceof Error) error.message = `${error.message}\nFailure screenshot: ${screenshot}`
    throw error
  } finally {
    await context.close()
  }
}

before(async () => {
  const { chromium } = loadPlaywright()
  await startServer()
  browser = await chromium.launch({
    headless: true,
    ...(chromeExecutable() ? { executablePath: chromeExecutable() } : {}),
  })
})

after(async () => {
  await browser?.close()
  await closeServer()
})

test('first render plays the DHD startup sequence before opening the workspace', { timeout: 30_000 }, async () => {
  await runScenario('company-welcome-mobile', context => installApi(context, method => {
    if (method.endsWith('workforce.get_context')) return success({ ...entertainerContext, branch: 'Nomad' })
    if (method.endsWith('entertainer.get_dashboard')) return success({
      ...entertainerDashboard,
      profile: { ...entertainerDashboard.profile, branch: 'Nomad' },
    })
    return defaultEntertainerApi(method)
  }), async (_context, page) => {
    await page.getByRole('heading', { name: 'WELCOME TO DHD LLC' }).waitFor()
    assert.equal(await page.locator('.startup-title-character').count(), 18)
    assert.equal(await page.locator('.welcome-progress').count(), 0)
    const logoBox = await page.locator('.startup-logo-frame').evaluate(element => {
      const box = element.getBoundingClientRect()
      return { width: box.width, height: box.height }
    })
    assert.ok(logoBox.width >= 176 && logoBox.height >= 100, `startup logo too small: ${logoBox.width}x${logoBox.height}`)
    await page.waitForTimeout(1_150)
    await page.screenshot({ path: join(SCREENSHOT_ROOT, 'company-welcome-mobile.png'), fullPage: true })
    await waitForEntertainerShell(page)
    await page.locator('.startup-splash').waitFor({ state: 'detached' })
    const headerAvatarBox = await page.locator('.dancer-app-header .header-profile-avatar').evaluate(element => {
      const box = element.getBoundingClientRect()
      return { width: box.width, height: box.height }
    })
    assert.ok(headerAvatarBox.width >= 40 && headerAvatarBox.height >= 40, `header avatar too small: ${headerAvatarBox.width}x${headerAvatarBox.height}`)
    assert.match(await page.locator('.dancer-header-profile').innerText(), /Ану/)
    await assertNoHorizontalOverflow(page, 'company welcome')
  }, { waitUntil: 'domcontentloaded' })
})

test('reduced motion uses a brief fade and still opens the workspace', { timeout: 30_000 }, async () => {
  await runScenario('company-welcome-reduced-motion', context => installApi(context, method => {
    if (method.endsWith('workforce.get_context')) return success({ ...entertainerContext, branch: 'Nomad' })
    if (method.endsWith('entertainer.get_dashboard')) return success({
      ...entertainerDashboard,
      profile: { ...entertainerDashboard.profile, branch: 'Nomad' },
    })
    return defaultEntertainerApi(method)
  }), async (_context, page) => {
    await page.getByRole('heading', { name: 'WELCOME TO DHD LLC' }).waitFor()
    const characterAnimation = await page.locator('.startup-title-character').first().evaluate(element => getComputedStyle(element).animationName)
    assert.equal(characterAnimation, 'none')
    await page.locator('.startup-splash').waitFor({ state: 'detached', timeout: 1_500 })
    await waitForEntertainerShell(page)
  }, { waitUntil: 'domcontentloaded', reducedMotion: 'reduce' })
})

test('guest bootstrap renders only the login shell at 390x844', { timeout: 30_000 }, async () => {
  let browserErrors
  await runScenario('guest-login-shell', async (context, page) => {
    browserErrors = trackBrowserErrors(page)
    await installApi(context, method => method.endsWith('workforce.get_context') ? expired() : success({}))
  }, async (_context, page) => {
    await page.getByRole('heading', { name: 'Ажилтны аппд нэвтрэх' }).waitFor()
    await page.getByLabel('Утасны дугаар').waitFor()
    await page.getByLabel('Нууц үг').waitFor()
    await page.getByRole('button', { name: 'Нэвтрэх' }).waitFor()
    assert.equal(await page.getByText('Нууц Ажилтан', { exact: true }).count(), 0)
    await assertNoHorizontalOverflow(page, 'guest login')
    assert.deepEqual(browserErrors, ['console: Failed to load resource: the server responded with a status of 403 (Forbidden)'])
    await page.screenshot({ path: join(SCREENSHOT_ROOT, 'guest-login-shell-390.png'), fullPage: true })
  })
})

test('manager navigation exposes manager-only destinations without mobile overflow', { timeout: 30_000 }, async () => {
  await runScenario('manager-role-nav', context => installApi(context, defaultManagerApi), async (_context, page) => {
    await page.getByRole('heading', { name: 'Салбарын өнөөдрийн байдал' }).waitFor()
    assert.match(await page.locator('.role-button').innerText(), /Менежер/)
    assert.deepEqual(await visibleBottomNavLabels(page), ['Нүүр', 'Ажилтнууд', 'QR', 'Хуваарь', 'Тохиргоо'])
    assert.equal(await page.locator('.bottom-nav button:visible').filter({ hasText: 'Орлого' }).count(), 0)
    await page.locator('.bottom-nav').getByRole('button', { name: 'Ажилтнууд', exact: true }).click()
    await page.getByRole('heading', { name: 'Ажилтнууд', exact: true }).first().waitFor()
    await assertNoHorizontalOverflow(page, 'manager people')
  })
})

test('manager configures the 40-point sales threshold and attendance cutoff, then opens own QR attendance', { timeout: 30_000 }, async () => {
  let savedBody
  await runScenario('manager-settings-and-own-attendance', async context => {
    await installApi(context, async (method, request) => {
      if (method.endsWith('manager_settings.update_manager_settings')) {
        savedBody = Object.fromEntries(new URLSearchParams(request.postData() || ''))
        return success({
          ...managerSettings,
          sales: { ...managerSettings.sales, full_score_amount: Number(savedBody.sales_full_score_amount) },
          attendance: { ...managerSettings.attendance, late_after_time: `${savedBody.late_after_time}:00` },
          modified: '2026-08-12 09:05:00.000000',
        })
      }
      return defaultManagerApi(method)
    })
  }, async (_context, page) => {
    await page.getByRole('heading', { name: 'Салбарын өнөөдрийн байдал' }).waitFor()
    await page.locator('.bottom-nav').getByRole('button', { name: 'Тохиргоо', exact: true }).click()
    await page.getByRole('heading', { name: 'Тохиргоо', exact: true }).waitFor()
    await page.locator('input[type="number"]').fill('5000000')
    await page.locator('input[type="time"]').fill('21:45')
    await page.getByPlaceholder('Товч шалтгаан').fill('Шинэ сарын зорилго')
    const saveButton = page.getByRole('button', { name: 'Хадгалах', exact: true })
    assert.equal(await saveButton.isEnabled(), true)
    assert.equal(await page.locator('.manager-settings-form').evaluate(form => form.checkValidity()), true)
    await saveButton.click()
    assert.ok(savedBody, `settings request was not sent: ${await page.locator('body').innerText()}`)
    await page.getByText('Тохиргоо хадгалагдлаа.').waitFor()
    assert.equal(savedBody.sales_full_score_amount, '5000000')
    assert.equal(savedBody.late_after_time, '21:45')
    assert.match(savedBody.idempotency_key, /^manager-settings:/)
    await page.locator('.bottom-nav button').filter({ hasText: 'QR' }).click()
    await page.getByRole('heading', { name: 'Ирц', exact: true }).waitFor()
    await page.getByText('Өнөөдөр ба өмнөх бүртгэл').waitFor()
    await assertNoHorizontalOverflow(page, 'manager settings and attendance')
  })
})

test('manager reviews overnight attendance evidence and retry keeps one decision key', { timeout: 30_000 }, async () => {
  const decisionWrites = []
  let queueLoads = 0
  const dashboard = {
    ...managerDashboard,
    summary: { ...managerDashboard.summary, pending_corrections: 1 },
  }
  const correction = {
    name: 'ATT-CORR-QA-001',
    entertainer: 'VIP-ENT-QA',
    employee: 'EMP-QA-001',
    display_name: 'Ану',
    branch: 'Sapphire',
    attendance_date: '2026-08-11',
    correction_type: 'Check-out',
    requested_time: '03:00:00',
    proposed_at: '2026-08-12 03:00:00',
    reason: 'Гарах үед төхөөрөмж ажиллаагүй.',
    status: 'Pending',
    requested_at: '2026-08-12 04:10:00',
    shift_assignment: 'SHIFT-ASSIGN-QA',
    shift_start: '2026-08-11 19:00:00',
    shift_end: '2026-08-12 03:00:00',
    original_checkin: 'OUT-ORIGINAL-QA',
    original_time: '2026-08-12 03:18:00',
    original_checkin_modified: '2026-08-12 03:18:01.000000',
    penalties: [],
    modified: '2026-08-12 04:10:00.000000',
  }
  await runScenario('manager-attendance-correction', async context => {
    await installApi(context, async (method, request) => {
      if (method.endsWith('workforce.get_context')) return success(managerContext)
      if (method.endsWith('workforce.get_manager_dashboard')) return success(dashboard)
      if (method.endsWith('workday.get_manager_correction_requests')) {
        queueLoads += 1
        return success({ branch: 'Sapphire', requests: queueLoads > 1 ? [] : [correction] })
      }
      if (method.endsWith('workday.decide_attendance_correction')) {
        decisionWrites.push(Object.fromEntries(new URLSearchParams(request.postData() || '')))
        if (decisionWrites.length === 1) return 'abort'
        return success({ name: correction.name, status: 'Approved', applied_checkin: 'OUT-CORRECTED-QA', reversed_penalties: [], replayed: true })
      }
      return success({})
    })
  }, async (_context, page) => {
    await page.locator('.manager-attention-list button').filter({ hasText: 'Ирц засах хүсэлт' }).click()
    await page.getByRole('heading', { name: 'Ирц засах хүсэлт' }).waitFor()
    assert.match(await page.locator('.correction-evidence').innerText(), /19:00.*03:00/s)
    assert.match(await page.locator('.correction-evidence').innerText(), /03:18/)
    assert.match(await page.locator('.correction-evidence').innerText(), /03:00/)
    await page.getByRole('button', { name: 'Зөвшөөрөх' }).click()
    assert.match(await page.locator('.correction-decision-panel').innerText(), /Эх цаг устахгүй/)
    await page.getByRole('button', { name: 'Шийдвэр батлах' }).click()
    await page.getByRole('alert').waitFor()
    await page.getByRole('button', { name: 'Шийдвэр батлах' }).click()
    await page.getByText('Шийдвэр хүлээж буй хүсэлт алга').waitFor()
    assert.equal(decisionWrites.length, 2)
    assert.equal(decisionWrites[0].idempotency_key, decisionWrites[1].idempotency_key)
    assert.match(decisionWrites[0].idempotency_key, /^attendance-correction-decision:/)
    assert.equal(decisionWrites[0].expected_modified, correction.modified)
    assert.equal(decisionWrites[0].decision, 'Approved')
    await assertNoHorizontalOverflow(page, 'manager attendance correction')
    await page.screenshot({ path: join(SCREENSHOT_ROOT, 'manager-attendance-correction-390.png'), fullPage: true })
  })
})

for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
  test(`manager edits schedules but never receives the readiness checklist at ${viewport.width}px`, { timeout: 30_000 }, async () => {
    const scheduleWrites = []
    await runScenario(`manager-schedule-${viewport.width}`, async context => {
      await installApi(context, async (method, request) => {
        if (method.endsWith('workforce.get_context')) return success(managerContext)
        if (method.endsWith('workforce.get_manager_dashboard')) return success(managerDashboard)
        if (method.endsWith('schedule.get_manager_schedule')) return success(managerScheduleData)
        if (method.endsWith('schedule.set_manager_schedule')) {
          scheduleWrites.push(Object.fromEntries(new URLSearchParams(request.postData() || '')))
          return success({ assignment: managerScheduleData.people[0].days[1].assignment, replayed: false })
        }
        return success({})
      })
    }, async (_context, page) => {
      const nav = viewport.width >= 1024 ? page.locator('.desktop-nav') : page.locator('.bottom-nav')
      await nav.getByRole('button', { name: 'Хуваарь', exact: true }).click()
      await page.getByRole('heading', { name: 'Ээлжийн хуваарь' }).waitFor()
      await page.screenshot({ path: join(SCREENSHOT_ROOT, `manager-schedule-${viewport.width}.png`), fullPage: true })
      assert.equal(await page.getByText('Өдрийн бэлэн байдлын шалгалт', { exact: true }).count(), 0)
      assert.match(await page.locator('.schedule-policy-note').innerText(), /Менежерийн оруулсан хуваарь/)
      assert.doesNotMatch(await page.locator('body').innerText(), /Finex|ERPNext/i)
      assert.equal(await page.getByRole('tab', { name: /Бүжигчид/ }).getAttribute('aria-selected'), 'true')
      if (viewport.width < 760) await page.locator('.schedule-day-picker button').nth(1).click()
      const dayButton = page.locator('.schedule-grid-row [role="cell"]:visible:not([disabled]), .schedule-mobile-list button:visible:not([disabled])').first()
      await dayButton.click()
      await page.getByRole('dialog').waitFor()
      assert.doesNotMatch(await page.getByRole('dialog').innerText(), /Finex|ERPNext/i)
      await page.getByLabel('Өөрчилсөн шалтгаан').fill('Батлагдсан долоо хоногийн хуваарь')
      await page.getByRole('button', { name: 'Хуваарь хадгалах' }).click()
      await page.waitForFunction(() => document.querySelector('[role="dialog"]') === null)
      assert.equal(scheduleWrites.length, 1)
      assert.match(scheduleWrites[0].idempotency_key, /^manager-schedule:/)
      assert.equal(scheduleWrites[0].employee_name, 'EMP-ENT-QA')
      await page.getByRole('tab', { name: /Бусад ажилтан/ }).click()
      await page.locator('.schedule-person:visible, .schedule-mobile-list > button:visible').filter({ hasText: 'Бат' }).first().waitFor()
      await page.screenshot({ path: join(SCREENSHOT_ROOT, `manager-schedule-employees-${viewport.width}.png`), fullPage: true })
      assert.match(await page.locator('.schedule-policy-note').innerText(), /Менежерийн оруулсан хуваарь/)
      await assertNoHorizontalOverflow(page, `manager schedule ${viewport.width}px`)
    }, { viewport })
  })
}

for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
  test(`lead entertainer completes only the QR-backed readiness checklist at ${viewport.width}px`, { timeout: 30_000 }, async () => {
    const readinessWrites = []
    let browserErrors
    await runScenario(`lead-readiness-${viewport.width}`, async (context, page) => {
      browserErrors = trackBrowserErrors(page)
      await installApi(context, async (method, request) => {
        if (method.endsWith('supervisor.submit_readiness')) {
          readinessWrites.push(Object.fromEntries(new URLSearchParams(request.postData() || '')))
          return success({ status: 'READY', replayed: false })
        }
        return defaultLeadApi(method)
      })
    }, async (_context, page) => {
      assert.match(await page.locator('body').innerText(), /Ахлах бүжигчин/)
      const nav = viewport.width >= 1024 ? page.locator('.desktop-nav') : page.locator('.bottom-nav')
      assert.equal(await nav.getByRole('button', { name: 'Ажилтнууд', exact: true }).count(), 0)
      assert.equal(await nav.getByRole('button', { name: 'Хуваарь', exact: true }).count(), 0)
      assert.equal(await nav.getByRole('button', { name: 'Шалгалт', exact: true }).count(), 0)
      assert.equal(await nav.getByRole('button', { name: 'Зочид', exact: true }).count(), 0)
      assert.equal(await nav.getByRole('button', { name: 'Гараа', exact: true }).count(), 0)
      await page.getByRole('button', { name: 'Бэлэн байдал', exact: true }).click()
      await page.getByRole('heading', { name: 'Өдрийн бэлэн байдлын шалгалт' }).waitFor()
      await page.locator('.readiness-page').evaluate(element => Promise.all(element.getAnimations().map(animation => animation.finished)))
      await page.screenshot({ path: join(SCREENSHOT_ROOT, `lead-readiness-${viewport.width}.png`), fullPage: true })
      assert.equal(await page.locator('.readiness-scope').count(), 0, 'removed policy prose must stay out of the mobile task flow')
      assert.equal(await page.locator('.readiness-row').count(), 2)
      await page.getByRole('button', { name: 'Ану-г бэлэн бус гэж тэмдэглэх', exact: true }).click()
      const readinessDialog = page.getByRole('dialog')
      await readinessDialog.waitFor()
      await readinessDialog.getByRole('radio', { name: 'Ажлын бэлтгэл хангалтгүй', exact: true }).click()
      await readinessDialog.getByLabel('Тайлбар').fill('Бэлтгэл дутуу байна')
      if (viewport.width === 390) await page.screenshot({ path: join(SCREENSHOT_ROOT, 'lead-readiness-editor-390.png') })
      await page.getByRole('button', { name: 'Бэлэн бус гэж хадгалах' }).click()
      await page.waitForFunction(() => document.querySelector('[role="dialog"]') === null)
      assert.equal(readinessWrites.length, 1)
      assert.equal(readinessWrites[0].employee_checkin, 'CHECKIN-QA')
      assert.equal(readinessWrites[0].result, 'NOT_READY')
      assert.equal(readinessWrites[0].reason, 'Ажлын бэлтгэл хангалтгүй: Бэлтгэл дутуу байна')
      assert.match(readinessWrites[0].idempotency_key, /^lead-readiness:/)
      await assertNoHorizontalOverflow(page, `lead readiness ${viewport.width}px`)
      assert.deepEqual(browserErrors, [])
    }, { viewport })
  })
}

test('manager roster keeps pagination, stale writes and latest-search rendering correct on mobile', { timeout: 30_000 }, async () => {
  const reviewRequests = []
  await runScenario('manager-roster-review', async context => {
    await installApi(context, async (method, request) => {
      if (method.endsWith('workforce.get_context')) return success(managerContext)
      if (method.endsWith('workforce.get_manager_dashboard')) return success(managerDashboard)
      if (method.endsWith('entertainer_roster.get_manager_roster_candidates')) {
        const url = new URL(request.url())
        const cursor = Number(url.searchParams.get('cursor') || 0)
        const search = url.searchParams.get('search') || ''
        if (search === 'удаан') await new Promise(resolveWait => setTimeout(resolveWait, 500))
        if (search) return success(rosterPage([rosterCandidate(`SEARCH-${search}`, search)], 0, null, 1))
        if (cursor === 2) return success(rosterPage([rosterCandidate('CAND-3', 'Солонго')], 2, null, 3))
        return success(rosterPage([
          rosterCandidate('CAND-1', 'Ану'),
          rosterCandidate('CAND-2', 'Болор'),
        ], 0, 2, 3))
      }
      if (method.endsWith('entertainer_roster.review_manager_roster_candidate')) {
        reviewRequests.push(Object.fromEntries(new URLSearchParams(request.postData() || '')))
        return {
          status: 409,
          payload: {
            exc_type: 'TimestampMismatchError',
            message: 'Мэдээлэл өөрчлөгдсөн байна. Жагсаалтаа шинэчлээд дахин оролдоно уу.',
          },
        }
      }
      return success({})
    })
  }, async (_context, page) => {
    assert.equal(page.url(), `${origin}/staff/?view=roster-review`)
    assert.equal(await page.title(), 'NOMAD Ажилтан')
    await page.getByRole('heading', { name: 'Бүртгэлгүй нэрсийг шалгах' }).waitFor()
    await page.locator('.candidate-row').first().waitFor()
    assert.equal(await page.locator('.candidate-row').count(), 2)

    await page.getByRole('button', { name: /Дараагийн нэрсийг харах/ }).click()
    await page.getByText('Солонго', { exact: true }).waitFor()
    assert.equal(await page.locator('.candidate-row').count(), 3)
    assert.equal(await page.locator('.candidate-load-more').count(), 0)

    const firstRow = page.locator('.candidate-row').first()
    await firstRow.locator('.review-open-button').click()
    await firstRow.locator('.decision-grid button').first().click()
    await firstRow.getByLabel('Баталгаатай ажилтан').selectOption('VIP-ENT-QA')
    await firstRow.locator('.candidate-save').click()
    await firstRow.getByRole('alert').waitFor()
    assert.match(await firstRow.getByRole('alert').innerText(), /Мэдээлэл өөрчлөгдсөн/)
    assert.equal(reviewRequests[0].expected_modified, '2026-08-12 12:00:00')
    assert.equal(reviewRequests[0].linked_profile, 'VIP-ENT-QA')
    assert.match(reviewRequests[0].idempotency_key, /^roster-review:/)

    const search = page.getByPlaceholder('Нэр эсвэл бүртгэлийн ID-аар хайх')
    await search.fill('удаан')
    await page.waitForTimeout(50)
    await search.fill('хурдан')
    await page.getByText('хурдан', { exact: true }).waitFor()
    await page.waitForTimeout(650)
    assert.deepEqual(await page.locator('.candidate-name strong').allTextContents(), ['хурдан'])
    assert.doesNotMatch(await page.locator('body').innerText(), /finex/i)
    await page.screenshot({ path: join(SCREENSHOT_ROOT, 'no-source-brand-roster-mobile.png'), fullPage: true })
    await assertNoHorizontalOverflow(page, 'manager roster review')
  }, { search: '?view=roster-review' })
})

test('entertainer navigation exposes personal work destinations without manager controls', { timeout: 30_000 }, async () => {
  await runScenario('entertainer-role-nav', context => installApi(context, (method, request) => {
    if (method.endsWith('profile.get_editable_profile')) return success({ profile: workforceProfile(), pending_request: null })
    if (method.endsWith('entertainer_finex.get_finex_summary') && new URL(request.url()).searchParams.get('month') === '2026-07') {
      return success({
        ...finexSummary,
        window: { from: '2026-07-01', to: '2026-07-31' },
        selected_month: '2026-07',
        current_month_income: 900000,
        net_income: 900000,
        service_count: 6,
        bill_count: 4,
        days: [
          { date: '2026-07-04', income: 300000, cumulative_income: 300000 },
          { date: '2026-07-18', income: 600000, cumulative_income: 900000 },
        ],
        recent_services: [{ key: 'july-service', date: '2026-07-18', service: 'VIP үйлчилгээ', amount: 150000, percent: 50 }],
      })
    }
    return defaultEntertainerApi(method)
  }), async (_context, page) => {
    await waitForEntertainerShell(page)
    assert.match(await page.locator('.dancer-header-profile').innerText(), /Ану/)
    assert.equal(await page.locator('.dancer-app-header .brand-mark').count(), 0)
    assert.deepEqual(await visibleBottomNavLabels(page), ['Нүүр', 'Орлого', 'Ирц', 'Хүсэлт', 'Минийх'])
    assert.match(await page.locator('.dancer-home-overview').innerText(), /Орлого.*₮4,200,000.*Ирц.*Ирсэн.*Ээлж 18:00–04:00.*Зэрэг.*73.2 оноо.*Санал, хүсэлт.*1 хүлээгдэж байна.*Зээл/s)
    const homeActions = page.locator('.dancer-home-overview [data-destination]')
    assert.equal(await homeActions.count(), 5)
    assert.deepEqual(await homeActions.evaluateAll(elements => elements.map(element => element.dataset.destination)), ['income', 'attendance-qr', 'rank', 'requests', 'loan'])
    const kpiActionStyles = await homeActions.evaluateAll(elements => elements.map(element => ({
      radius: getComputedStyle(element).borderRadius,
      minHeight: Number.parseFloat(getComputedStyle(element).minHeight),
      backgroundImage: getComputedStyle(element).backgroundImage,
    })))
    assert.ok(kpiActionStyles.every(style => style.minHeight >= 44), 'KPI actions must keep a 44px touch target')
    assert.notEqual(kpiActionStyles[0].backgroundImage, 'none', 'the approved income card uses the reference gradient')
    assert.ok(kpiActionStyles.slice(1).every(style => style.backgroundImage === 'none'), `supporting actions stay on clean solid surfaces: ${JSON.stringify(kpiActionStyles)}`)
    assert.match(String(await page.locator('[data-destination="requests"]').getAttribute('class')), /is-warning/, 'pending requests use the semantic warning tone')
    assert.match(String(await page.locator('[data-destination="loan"]').getAttribute('class')), /is-neutral/, 'a closed loan state remains neutral')
    assert.equal(await page.locator('.home-attention').count(), 0, 'empty attention state must not create filler UI')
    assert.equal(await page.locator('.home-week').count(), 0, 'full weekly calendar belongs in the schedule view')
    assert.equal(await page.locator('.rank-panel').count(), 0, 'rank detail belongs in the rank view')
    await page.screenshot({ path: join(SCREENSHOT_ROOT, 'entertainer-home-viewport-390.png') })
    await page.screenshot({ path: join(SCREENSHOT_ROOT, 'entertainer-home-simplified-390.png'), fullPage: true })
    await page.locator('.bottom-nav').getByRole('button', { name: 'Минийх', exact: true }).click()
    await page.getByLabel('Дэлгэцийн горим').selectOption('dark')
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark')
    await page.locator('.bottom-nav').getByRole('button', { name: 'Нүүр', exact: true }).click()
    await page.locator('.dancer-home-overview').waitFor()
    const darkCardStyle = await page.locator('.dancer-income-card').evaluate(element => ({
      color: getComputedStyle(element).color,
      background: getComputedStyle(element).backgroundImage,
      surface: getComputedStyle(element).backgroundColor,
    }))
    assert.notEqual(darkCardStyle.background, 'none')
    assert.notEqual(darkCardStyle.surface, 'rgba(0, 0, 0, 0)')
    await page.screenshot({ path: join(SCREENSHOT_ROOT, 'entertainer-home-dark-viewport-390.png') })
    await page.screenshot({ path: join(SCREENSHOT_ROOT, 'entertainer-home-dark-390.png'), fullPage: true })
    await page.locator('.bottom-nav').getByRole('button', { name: 'Минийх', exact: true }).click()
    await page.getByLabel('Дэлгэцийн горим').selectOption('light')
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'light')
    await page.locator('.bottom-nav').getByRole('button', { name: 'Нүүр', exact: true }).click()
    await page.locator('.dancer-home-overview').waitFor()
    for (const viewport of [{ width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
      await page.setViewportSize(viewport)
      await assertNoHorizontalOverflow(page, `simplified entertainer home at ${viewport.width}px`)
      await page.screenshot({ path: join(SCREENSHOT_ROOT, `entertainer-home-simplified-${viewport.width}.png`), fullPage: true })
    }
    await page.setViewportSize(VIEWPORT)
    const mobileNavLayout = await page.locator('.bottom-nav').evaluate(element => ({
      height: element.getBoundingClientRect().height,
      rows: new Set([...element.querySelectorAll('button')].map(button => Math.round(button.getBoundingClientRect().top))).size,
      activeRadius: getComputedStyle(element.querySelector('button.active')).borderRadius,
      buttonMinHeights: [...element.querySelectorAll('button')].map(button => Number.parseFloat(getComputedStyle(button).minHeight)),
    }))
    assert.equal(mobileNavLayout.rows, 1, 'mobile navigation must stay on one row')
    assert.ok(mobileNavLayout.height <= 80, `mobile navigation is too tall: ${mobileNavLayout.height}px`)
    assert.equal(mobileNavLayout.activeRadius, '10px')
    assert.ok(mobileNavLayout.buttonMinHeights.every(height => height >= 44), 'bottom navigation must keep 44px touch targets')
    assert.equal(await page.locator('.bottom-nav button:visible').filter({ hasText: 'Ажилтнууд' }).count(), 0)
    await page.locator('.bottom-nav button[data-scan-state]').click()
    await page.getByRole('heading', { name: 'Ирц', exact: true }).waitFor()
    await page.getByRole('heading', { name: 'Сүүлийн ирц' }).waitFor()
    assert.match(await page.locator('.attendance-today').innerText(), /Ирсэн цаг бүртгэгдсэн.*21:54/s)
    assert.equal(await page.locator('.attendance-history-list article').count(), 3)
    assert.match(await page.locator('.attendance-history-list article').first().innerText(), /8-р сарын 12.*Ирсэн.*21:54/s)
    assert.equal(await page.locator('.attendance-history-list article').first().getByRole('button').count(), 0)
    assert.equal(await page.locator('.attendance-history-detail').count(), 0)
    assert.doesNotMatch(await page.locator('main').innerText(), /Энэ долоо хоног|Энэ сарын суутгал|Зэрэглэл/)
    await assertNoHorizontalOverflow(page, 'attendance history landing')
    await page.locator('.bottom-nav').getByRole('button', { name: 'Орлого', exact: true }).click()
    await page.getByRole('heading', { name: 'Миний сарын орлого' }).waitFor()
    await page.locator('.income-chart-total strong').filter({ hasText: '4,200,000' }).waitFor()
    assert.match(await page.locator('.income-chart-total').innerText(), /3-р зэрэг.*50% ногдол/s)
    const ledgerText = await page.locator('.income-ledger-metrics').innerText()
    assert.match(ledgerText, /Үйлчилгээний ногдол.*Суутгал.*Тооцоолсон цалин/s)
    assert.match(ledgerText, /₮4,200,000/)
    assert.doesNotMatch(ledgerText, /MNT/, 'income money labels use one employee-facing format')
    assert.match(String(await page.locator('.income-data-state').getAttribute('class')), /is-success/, 'verified income uses the semantic success state')
    assert.match(await page.locator('#income-chart-summary').textContent(), /8-р сарын 2.*₮650,000.*8-р сарын 12.*₮4,200,000/s)
    assert.match(await page.locator('.income-calculation-note').innerText(), /Эцсийн цалин биш/)
    assert.match(await page.locator('.income-analytics-card').innerText(), /8-р сарын 1.*8-р сарын 12.*4,200,000/s)
    assert.match(await page.locator('.income-service-breakdown').innerText(), /18 үйлчилгээ.*9 төлөгдсөн баримт/s)
    await page.getByRole('button', { name: /Бүгдийг харах/ }).click()
    assert.equal(await page.locator('.income-service-list article').count(), 4)
    await page.getByLabel('Орлого харах сар').selectOption('2026-07')
    assert.equal(await page.getByLabel('Орлого харах сар').inputValue(), '2026-07')
    assert.match(await page.locator('.income-analytics-card').innerText(), /7-р сарын 1.*7-р сарын 31.*900,000/s)
    assert.match(await page.locator('.income-service-breakdown').innerText(), /150,000.*6 үйлчилгээ.*4 төлөгдсөн баримт/s)
    assert.match(await page.locator('.income-ledger-metrics').innerText(), /900,000/s, 'selected-month settlement must update with the month filter')
    assert.doesNotMatch(await page.locator('main').innerText(), /Зэрэглэлийн оноо|Одоогийн зэрэглэл/)
    const deductionDetails = page.locator('.income-deduction-rules')
    assert.equal(await deductionDetails.getAttribute('open'), null)
    await deductionDetails.locator('summary').click()
    assert.match(await deductionDetails.innerText(), /Суутгал алга/)
    assert.doesNotMatch(await deductionDetails.innerText(), /500.*150,000/s)
    await deductionDetails.locator('summary').click()
    assert.doesNotMatch(await page.locator('body').innerText(), /finex/i)
    await page.locator('.income-analytics-card').evaluate(element => window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - 84 }))
    await page.screenshot({ path: join(SCREENSHOT_ROOT, 'income-month-july-mobile.png') })
    await assertNoHorizontalOverflow(page, 'entertainer income')
  })
})

test('entertainer home omits the redundant workday action', { timeout: 30_000 }, async () => {
  await runScenario('entertainer-home-no-workday-action', context => installApi(context, defaultEntertainerApi), async (_context, page) => {
    await waitForEntertainerShell(page)
    assert.equal(await page.getByRole('button', { name: /Өнөөдрийн ажлаа үргэлжлүүлэх/ }).count(), 0)
    assert.equal(await page.getByRole('button', { name: /Боломжгүй болгох|Бэлэн болох/ }).count(), 0)
    await assertNoHorizontalOverflow(page, 'entertainer home without redundant workday action')
  })
})

test('all five approved dancer home actions open their own workflow route', { timeout: 30_000 }, async () => {
  await runScenario('entertainer-home-card-routes', context => installApi(context, defaultEntertainerApi), async (_context, page) => {
    for (const destination of ['income', 'attendance-qr', 'rank', 'requests', 'loan']) {
      await page.locator(`[data-destination="${destination}"]`).click()
      await page.waitForFunction(expected => new URL(window.location.href).searchParams.get('view') === expected, destination)
      assert.equal(await page.getByText('Энэ хэсэгт хандах эрх алга', { exact: true }).count(), 0)
      await page.goBack()
      await page.locator('.dancer-home-overview').waitFor()
    }
    await assertNoHorizontalOverflow(page, 'dancer home card routes')
  })
})

test('active loan policy accepts one complete entertainer request', { timeout: 30_000 }, async () => {
  const writes = []
  let requests = []
  const activeOverview = () => ({
    policy: {
      status: 'Active', request_enabled: true, message: 'Зээлийн хүсэлт илгээх боломжтой.',
      amount_step: 100000, repayment_min: 10, repayment_max: 30, repayment_step: 5, repayment_default: 20,
    },
    evidence: {
      branch: 'Sapphire', current_rank: 'Rank 3', tenure_days: 420,
      verified_income: 4200000, income_window: { from: '2026-06-12', to: '2026-08-12' },
      verified_bill_count: 9, three_month_average: 3900000, maximum_amount: 2000000, outstanding_balance: null,
    },
    required_decisions: [],
    requests,
  })
  await runScenario('entertainer-loan-request', context => installApi(context, async (method, request) => {
    if (method.endsWith('entertainer.get_loan_overview')) return success(activeOverview())
    if (method.endsWith('entertainer.submit_loan_request')) {
      const body = Object.fromEntries(new URLSearchParams(request.postData() || ''))
      writes.push(body)
      const created = {
        name: 'LOAN-QA-001', requested_at: '2026-08-24 21:30:00', requested_amount: Number(body.requested_amount),
        repayment_rate: Number(body.repayment_rate), status: 'Pending', purpose: body.purpose,
      }
      requests = [created]
      return success({ request: created, replayed: false })
    }
    return defaultEntertainerApi(method)
  }), async (_context, page) => {
    await page.locator('[data-destination="loan"]').click()
    await page.getByRole('heading', { name: 'Зээл', exact: true }).waitFor()
    assert.match(await page.locator('.loan-center').innerText(), /₮2,000,000/)
    assert.doesNotMatch(await page.locator('.loan-center').innerText(), /MNT/, 'loan money labels match the dancer income format')
    await page.getByLabel(/Хүсэх дүн/).fill('1500000')
    await page.getByLabel(/Эргэн төлөх хувь/).fill('20')
    await page.getByLabel('Зээлийн зориулалт').fill('Гэр бүлийн хэрэгцээ')
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: 'Хүсэлт илгээх' }).click()
    await page.getByText('Зээлийн хүсэлтийг илгээлээ.', { exact: true }).waitFor()
    assert.equal(writes.length, 1)
    assert.equal(writes[0].requested_amount, '1500000')
    assert.equal(writes[0].repayment_rate, '20')
    assert.equal(writes[0].accepted_terms, '1')
    assert.equal(writes[0].terms_version, 'entertainer-loan-v1')
    assert.match(await page.locator('.loan-history').innerText(), /1,500,000.*20%.*Хүлээгдэж байна/s)
    await assertNoHorizontalOverflow(page, 'active loan request')
    await page.screenshot({ path: join(SCREENSHOT_ROOT, 'entertainer-loan-request-390.png'), fullPage: true })
  })
})

test('manager availability retry keeps one fingerprint key and version evidence', { timeout: 30_000 }, async () => {
  let workspace = workforceWorkspace()
  const dashboard = {
    ...managerDashboard,
    roster: [{
      ...managerDashboard.roster[0],
      profile: workspace.profile.name,
      display_name: workspace.profile.stage_name,
    }],
  }
  workspace.manager_controls.availability = {
    name: 'AVAIL-MANAGER-QA-004', status: 'Unavailable', state_version: 4,
    occurred_at: '2026-08-11 19:30:00', actor: 'manager.sapphire@example.com',
  }
  const writes = []
  await runScenario('manager-availability-idempotency', async context => {
    await installApi(context, async (method, request) => {
      if (method.endsWith('workforce.get_context')) return success(managerContext)
      if (method.endsWith('workforce.get_manager_dashboard')) return success(dashboard)
      if (method.endsWith('workforce.get_manager_entertainer_detail')) return success(workspace)
      if (method.endsWith('workforce.manager_override_availability')) {
        const form = Object.fromEntries(new URLSearchParams(request.postData() || ''))
        writes.push(form)
        if (writes.length === 1) return 'abort'
        workspace = workforceWorkspace()
        workspace.manager_controls.availability = {
          name: 'AVAIL-MANAGER-QA-005', status: 'Available', state_version: 5,
          occurred_at: '2026-08-11 19:35:00', actor: 'manager.sapphire@example.com',
        }
        return success({ event: workspace.manager_controls.availability, previous_status: 'Unavailable', replayed: true })
      }
      return success({})
    })
  }, async (_context, page) => {
    await page.getByRole('heading', { name: 'Салбарын өнөөдрийн байдал' }).waitFor()
    await page.getByRole('button', { name: 'Ану дэлгэрэнгүй' }).click()
    await page.getByRole('button', { name: /Шийдвэр/ }).click()
    const control = page.locator('.manager-control-card').first()
    await control.locator('summary').click()
    await control.locator('select').selectOption('Available')
    await control.getByPlaceholder('Жишээ: Үйлчилгээний захиалга баталгаажсан').fill('Захиалга ээлжийн системд баталгаажсан')
    await control.getByRole('button', { name: 'Ажлын төлөв шинэчлэх', exact: true }).click()
    await control.getByRole('alert').waitFor()
    await control.getByRole('button', { name: 'Ажлын төлөв шинэчлэх', exact: true }).click()
    await control.locator('summary strong').filter({ hasText: 'Бэлэн' }).waitFor()
    assert.equal(writes.length, 2)
    assert.equal(writes[0].status, 'Available')
    assert.equal(writes[0].expected_event, 'AVAIL-MANAGER-QA-004')
    assert.equal(writes[0].expected_version, '4')
    assert.equal(writes[0].reason, 'Захиалга ээлжийн системд баталгаажсан')
    assert.match(writes[0].idempotency_key, /^manager-availability-override:/)
    assert.equal(writes[1].idempotency_key, writes[0].idempotency_key)
  })
})

for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  test(`manager sees performer work evidence without empty profile-card clutter at ${viewport.width}px`, { timeout: 30_000 }, async () => {
    const profile = workforceProfile({ skills: '', languages: '', service_tags: '', style_tags: '' })
    const workspace = workforceWorkspace(profile)
    const dashboard = {
      ...managerDashboard,
      roster: [{ ...managerDashboard.roster[0], profile: profile.name, display_name: profile.stage_name }],
    }
    await runScenario(`manager-performance-${viewport.width}`, async context => {
      await installApi(context, async method => {
        if (method.endsWith('workforce.get_context')) return success(managerContext)
        if (method.endsWith('workforce.get_manager_dashboard')) return success(dashboard)
        if (method.endsWith('workforce.get_manager_entertainer_detail')) return success(workspace)
        if (method.endsWith('profile.get_manager_profile_change_requests')) return success({ branch: 'Sapphire', requests: [], meta: {} })
        return success({})
      })
    }, async (_context, page) => {
      await page.getByRole('heading', { name: 'Салбарын өнөөдрийн байдал' }).waitFor()
      await page.getByRole('button', { name: 'Ану дэлгэрэнгүй' }).click()
      await page.getByRole('heading', { name: 'Ажил, орлогын товч' }).waitFor()
      const performance = page.locator('.manager-performance')
      assert.match(await performance.innerText(), /Энэ сарын орлого.*Сүүлийн 62 хоногийн орлого.*34.*17/s)
      assert.doesNotMatch(await performance.innerText(), /Тооцоолсон зэрэглэлийн санал|1,020 оноо/)
      assert.match(await page.locator('.workspace-profile-card').innerText(), /3-р зэрэг.*Өдрийн оноо 73.16/s)
      assert.match(await page.locator('.profile-data-empty').innerText(), /Профайлын нэмэлт мэдээлэл оруулаагүй/)
      assert.doesNotMatch(await page.locator('main').innerText(), /Finex/i)
      await performance.locator('summary').click()
      await performance.getByText('VIP үйлчилгээ', { exact: true }).waitFor()
      await assertNoHorizontalOverflow(page, `manager performance ${viewport.width}px`)
      await page.screenshot({ path: join(SCREENSHOT_ROOT, `manager-performance-${viewport.width}.png`), fullPage: true })
    }, { viewport })
  })
}

for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
  test(`settlement calculation stays clear at ${viewport.width}px`, { timeout: 30_000 }, async () => {
    await runScenario(`settlement-clarity-${viewport.width}`, context => installApi(context, defaultEntertainerApi), async (_context, page) => {
      await waitForEntertainerShell(page)
      const navigation = viewport.width >= 1024 ? page.locator('.desktop-nav') : page.locator('.bottom-nav')
      await navigation.getByRole('button', { name: 'Орлого', exact: true }).click()
      await page.getByRole('heading', { name: 'Миний сарын орлого' }).waitFor()
      assert.match(await page.locator('.income-ledger-metrics').innerText(), /Үйлчилгээний ногдол.*Суутгал.*Тооцоолсон цалин/s)
      assert.equal(await page.locator('.income-method[open]').count(), 0)
      assert.doesNotMatch(await page.locator('main').innerText(), /Зэрэглэлийн оноо|Одоогийн зэрэглэл|Эцсийн цалин хараахан бодогдоогүй/)
      await assertNoHorizontalOverflow(page, `settlement calculation ${viewport.width}px`)
      await page.screenshot({ path: join(SCREENSHOT_ROOT, `settlement-clarity-${viewport.width}.png`), fullPage: true })
    }, { viewport })
  })
}

for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
  test(`rank overview keeps today's points and current rank visible at ${viewport.width}px`, { timeout: 30_000 }, async () => {
    await runScenario(`rank-today-summary-${viewport.width}`, context => installApi(context, defaultEntertainerApi), async (_context, page) => {
      await waitForEntertainerShell(page)
      await page.locator('[data-destination="rank"]').click()
      await page.getByRole('heading', { name: 'Миний зэрэглэл' }).waitFor()
      const todaySummary = page.getByTestId('today-rank-summary')
      assert.match(await todaySummary.innerText(), /НИЙТ ДУНДАЖ ОНОО\s*3-р зэрэг.*73\.16 оноо/s)
      assert.match(await todaySummary.innerText(), /73.16 оноо · 50%/s)
      assert.match(await todaySummary.innerText(), /Дараагийн шат\s*2-р зэрэг · 6.84 оноо дутуу/s)
      assert.equal(await page.locator('.rank-disclosure[open]').count(), 0)
      await page.locator('.rank-disclosure').first().locator('summary').click()
      assert.equal(await page.locator('.rank-component-list article').count(), 8)
      assert.match(await page.locator('.rank-component-list').innerText(), /Борлуулалт/)
      assert.match(await page.locator('.rank-component-list').innerText(), /Ирц/)
      assert.doesNotMatch(await page.locator('body').innerText(), /CEO|зөвшөөрөл шаардлагатай|Албан шийдвэр/)
      await page.screenshot({ path: join(SCREENSHOT_ROOT, `rank-today-summary-${viewport.width}.png`), fullPage: true })
      await assertNoHorizontalOverflow(page, `rank today summary ${viewport.width}px`)
    }, { viewport })
  })
}

test('entertainer profile keeps identity, photo and preferences in one mobile view', { timeout: 30_000 }, async () => {
  const canonicalProfile = workforceProfile()
  let pendingRequest = null
  const submissions = []
  await runScenario('bat113-entertainer-profile-request', async context => {
    await installApi(context, async (method, request) => {
      if (method.endsWith('workforce.get_context')) return success(entertainerContext)
      if (method.endsWith('entertainer.get_dashboard')) return success(entertainerDashboard)
      if (method.endsWith('entertainer.get_rank')) return success(rankData)
      if (method.endsWith('attendance.get_my_attendance_status')) return success({
        employee: 'EMP-QA', employee_name: 'Ану', branch: 'Sapphire', work_date: '2026-08-12',
        action: 'OUT', checked_in: true, checked_out: false, open: true,
        latest_checkin: { name: 'IN-QA', time: '2026-08-12 18:05:00', log_type: 'IN' },
      })
      if (method.endsWith('entertainer.get_workspace')) return success(workforceWorkspace(canonicalProfile))
      if (method.endsWith('profile.get_editable_profile')) return success({ profile: canonicalProfile, pending_request: pendingRequest })
      if (method.endsWith('profile.submit_profile_change_request')) {
        const form = Object.fromEntries(new URLSearchParams(request.postData() || ''))
        submissions.push(form)
        if (submissions.length === 1) {
          return { status: 503, payload: { message: 'Түр сүлжээний алдаа. Дахин оролдоно уу.' } }
        }
        pendingRequest = pendingProfileRequest({
          changes: [
            { field: 'stage_name', before: canonicalProfile.stage_name, after: form.stage_name },
            { field: 'skills', before: canonicalProfile.skills, after: form.skills },
          ],
          proposed: { stage_name: form.stage_name, skills: form.skills },
        })
        return success({ request: pendingRequest, profile: canonicalProfile, replayed: false })
      }
      return success({})
    })
  }, async (_context, page) => {
    await waitForEntertainerShell(page)
    await page.locator('.bottom-nav').getByRole('button', { name: 'Минийх', exact: true }).click()
    await page.getByRole('heading', { name: 'Миний мэдээлэл' }).waitFor()
    assert.equal((await page.locator('.self-profile-card #self-profile-title').innerText()).trim(), 'Ану')
    assert.equal(await page.getByLabel('Профайл зураг оруулах').count(), 1)
    assert.equal(await page.getByRole('button', { name: /Мэдээлэл өөрчлөх хүсэлт/ }).count(), 0)
    await page.getByText('Мэдэгдэл', { exact: true }).waitFor()
    await page.getByText('Дэлгэцийн горим', { exact: true }).waitFor()
    await page.getByText('Нууц үг солих', { exact: true }).waitFor()
    await page.getByRole('button', { name: /Системээс гарах/ }).waitFor()
    assert.equal(submissions.length, 0)
    await assertNoHorizontalOverflow(page, 'entertainer profile mobile')
  }, { viewport: { width: 390, height: 844 } })
})

async function verifyManagerProfileDecision({ decision, viewport, retry }) {
  const initialProfile = workforceProfile()
  let canonicalProfile = initialProfile
  let pendingRequest = pendingProfileRequest()
  const reviews = []
  const dashboard = {
    ...managerDashboard,
    summary: { ...managerDashboard.summary, pending_profile_changes: 1 },
    roster: [{
      ...managerDashboard.roster[0],
      profile: initialProfile.name,
      display_name: initialProfile.stage_name,
      profile_change_pending: true,
    }],
  }
  await runScenario(`bat113-manager-${decision.toLowerCase()}`, async context => {
    await installApi(context, async (method, request) => {
      if (method.endsWith('workforce.get_context')) return success(managerContext)
      if (method.endsWith('workforce.get_manager_dashboard')) return success(dashboard)
      if (method.endsWith('workforce.get_manager_entertainer_detail')) return success(workforceWorkspace(canonicalProfile))
      if (method.endsWith('profile.get_manager_profile_change_requests')) {
        return success({
          branch: 'Sapphire',
          requests: pendingRequest ? [pendingRequest] : [],
          meta: { limit: 100, cursor: 0, next_cursor: null, total: pendingRequest ? 1 : 0 },
        })
      }
      if (method.endsWith('profile.review_profile_change_request')) {
        const form = Object.fromEntries(new URLSearchParams(request.postData() || ''))
        reviews.push(form)
        if (retry && reviews.length === 1) {
          return { status: 503, payload: { message: 'Шийдвэрийг түр хадгалж чадсангүй. Дахин оролдоно уу.' } }
        }
        if (decision === 'Approved') {
          canonicalProfile = workforceProfile({
            stage_name: 'Ану Прайм',
            skills: 'Contemporary dance\nHeels choreography',
            modified: '2026-08-12 10:03:00.000000',
          })
        }
        const decided = { ...pendingRequest, status: decision, decision_reason: form.reason }
        pendingRequest = null
        return success({ request: decided, profile: canonicalProfile, replayed: false })
      }
      return success({})
    })
  }, async (_context, page) => {
    await page.getByRole('heading', { name: 'Салбарын өнөөдрийн байдал' }).waitFor()
    await page.getByRole('button', { name: 'Ану дэлгэрэнгүй' }).click()
    await page.getByRole('button', { name: /Шийдвэр/ }).click()
    await page.getByRole('heading', { name: 'Мэдээлэл өөрчлөх хүсэлт' }).waitFor()
    assert.doesNotMatch(await page.locator('body').innerText(), /finex/i)
    await page.getByText(/Шийдвэр хүлээж буй санал/).waitFor()
    await page.screenshot({ path: join(SCREENSHOT_ROOT, `human-review-manager-${decision.toLowerCase()}.png`), fullPage: true })
    const diff = page.locator('.profile-diff-list')
    await diff.getByText('Тайзны нэр', { exact: true }).waitFor()
    assert.match(await diff.innerText(), /Ану/)
    assert.match(await diff.innerText(), /Ану Прайм/)
    assert.match(await diff.innerText(), /Contemporary dance/)
    assert.match(await diff.innerText(), /Heels choreography/)

    await page.getByPlaceholder('Жишээ: Мэдээллийг ажилтантай тулган баталгаажуулсан').fill('Ажилтны хүсэлтийг мэдээлэлтэй тулган баталгаажуулсан.')
    const buttonName = decision === 'Approved' ? 'Зөвшөөрөх' : 'Татгалзах'
    await page.locator('.profile-review-card').getByRole('button', { name: buttonName, exact: true }).click()
    if (retry) {
      await page.getByRole('alert').waitFor()
      assert.match(await page.getByRole('alert').innerText(), /Дахин оролдоно уу/)
      await page.locator('.profile-review-card').getByRole('button', { name: buttonName, exact: true }).click()
    }

    const expectedName = decision === 'Approved' ? 'Ану Прайм' : 'Ану'
    await page.locator('.workspace-profile-card h2').filter({ hasText: expectedName }).waitFor()
    await page.waitForFunction(() => !document.querySelector('.profile-review-card'))
    assert.equal(reviews.length, retry ? 2 : 1)
    assert.equal(reviews[0].decision, decision)
    assert.equal(reviews[0].expected_modified, '2026-08-12 10:01:00.000000')
    assert.equal(reviews[0].expected_profile_modified, '2026-08-12 09:00:00.000000')
    assert.match(reviews[0].idempotency_key, /^profile-change-review:/)
    if (retry) assert.equal(reviews[0].idempotency_key, reviews[1].idempotency_key, 'transport retry must reuse the same review key')
    if (decision === 'Rejected') assert.equal(canonicalProfile.stage_name, initialProfile.stage_name, 'rejection must keep the canonical profile unchanged')
    await assertNoHorizontalOverflow(page, `BAT-113 manager ${decision} ${viewport.width}px`)
  }, { viewport })
}

test('BAT-113 manager sees the profile diff and approves with version guards at 1440x900', { timeout: 30_000 }, async () => {
  await verifyManagerProfileDecision({ decision: 'Approved', viewport: { width: 1440, height: 900 }, retry: true })
})

test('BAT-113 manager rejects a profile proposal without changing master data at 390x844', { timeout: 30_000 }, async () => {
  await verifyManagerProfileDecision({ decision: 'Rejected', viewport: { width: 390, height: 844 }, retry: false })
})

test('an expired protected request immediately purges sensitive DOM and shows session-ended state', { timeout: 30_000 }, async () => {
  let dashboardCalls = 0
  await runScenario('session-expiry-mid-request', async context => {
    await installApi(context, method => {
      if (method.endsWith('workforce.get_context')) return success(managerContext)
      if (method.endsWith('workforce.get_manager_dashboard')) {
        dashboardCalls += 1
        return dashboardCalls === 1 ? success(managerDashboard) : expired()
      }
      return success({})
    })
  }, async (_context, page) => {
    await page.getByText('Нууц Ажилтан', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Шинэчлэх', exact: true }).click()
    await page.getByText('Нэвтрэх хугацаа дууссан', { exact: true }).waitFor({ timeout: 5_000 })
    assert.equal(await page.getByText('Нууц Ажилтан', { exact: true }).count(), 0)
    assert.equal(await page.getByRole('heading', { name: 'Салбарын өнөөдрийн байдал' }).count(), 0)
    assert.equal(await page.evaluate(() => sessionStorage.getItem('nomad-staff:authenticated')), null)
    await assertNoHorizontalOverflow(page, 'session expired')
  })
})

test('a forbidden account gets a clear access state without protected content', { timeout: 30_000 }, async () => {
  await runScenario('forbidden-account', async context => {
    await installApi(context, method => method.endsWith('workforce.get_context') ? forbidden() : success({}))
  }, async (_context, page) => {
    await page.getByRole('heading', { name: 'Ажилтны мэдээлэл харах эрх алга' }).waitFor()
    await page.getByRole('button', { name: 'Системээс гарах' }).waitFor()
    assert.equal(await page.getByRole('heading', { name: 'Ажилтны аппд нэвтрэх' }).count(), 0)
    assert.equal(await page.getByText('Нууц Ажилтан', { exact: true }).count(), 0)
    await assertNoHorizontalOverflow(page, 'forbidden account')
  })
})

test('operator entering the unified staff URL is routed to VIP Entry before workforce data is requested', { timeout: 30_000 }, async () => {
  let workforceContextCalls = 0
  await runScenario('operator-unified-entry', async context => {
    await installApi(context, method => {
      if (method.endsWith('management.get_app_entry')) {
        return success({ authenticated: true, destination: 'vip-entry' })
      }
      if (method.endsWith('workforce.get_context')) workforceContextCalls += 1
      return success({})
    })
  }, async (_context, page) => {
    await page.getByRole('heading', { name: 'VIP Entry' }).waitFor()
    assert.equal(new URL(page.url()).pathname, '/vip-entry/')
    assert.equal(workforceContextCalls, 0)
  })
})

test('offline bootstrap offers retry and recovers into the authenticated manager view', { timeout: 30_000 }, async () => {
  let contextCalls = 0
  await runScenario('offline-bootstrap-retry', async (context, page) => {
    await page.addInitScript(() => {
      window.__BAT118_ONLINE__ = false
      Object.defineProperty(Navigator.prototype, 'onLine', {
        configurable: true,
        get: () => window.__BAT118_ONLINE__,
      })
    })
    await installApi(context, method => {
      if (method.endsWith('workforce.get_context')) {
        contextCalls += 1
        return contextCalls === 1 ? 'abort' : success(managerContext)
      }
      if (method.endsWith('workforce.get_manager_dashboard')) return success(managerDashboard)
      return success({})
    })
  }, async (_context, page) => {
    await page.getByRole('heading', { name: 'Интернет холболтгүй байна' }).waitFor()
    await page.evaluate(() => {
      window.__BAT118_ONLINE__ = true
      window.dispatchEvent(new Event('online'))
    })
    await page.getByRole('button', { name: 'Дахин оролдох' }).click()
    await page.getByRole('heading', { name: 'Салбарын өнөөдрийн байдал' }).waitFor()
    assert.equal(contextCalls, 2)
    await assertNoHorizontalOverflow(page, 'offline retry recovery')
  })
})

async function installFixedClock(page, instant) {
  await page.addInitScript(({ fixedInstant }) => {
    const NativeDate = Date
    const fixedNow = new NativeDate(fixedInstant).valueOf()
    class FixedDate extends NativeDate {
      constructor(...args) { super(...(args.length ? args : [fixedNow])) }
      static now() { return fixedNow }
    }
    globalThis.Date = FixedDate
  }, { fixedInstant: instant })
}

async function openRequestFlow(page, label) {
  await page.locator('.bottom-nav').getByRole('button', { name: 'Хүсэлт', exact: true }).click()
  await page.getByRole('heading', { name: 'Санал, хүсэлт' }).waitFor()
  await page.getByRole('button', { name: 'Шинэ хүсэлт' }).click()
  await page.locator('#request-create-menu').getByRole('button', { name: label }).click()
}

test('overnight leave request is open at 09:00 until the previous-day 21:00 cutoff', { timeout: 30_000 }, async () => {
  await runScenario('leave-open-at-0900', async (context, page) => {
    await installFixedClock(page, '2026-08-12T01:00:00.000Z')
    await installApi(context, defaultEntertainerApi)
  }, async (_context, page) => {
    await waitForEntertainerShell(page)
    await openRequestFlow(page, /Чөлөө авах/)
    await page.getByRole('heading', { name: 'Чөлөө авах' }).waitFor()
    assert.equal(await page.getByLabel('Чөлөө авах ээлжийн өдөр').inputValue(), '2026-08-13')
    await page.getByText(/2026\.08\.12-ны 21:00 хүртэл/).first().waitFor()
    assert.equal(await page.getByLabel('Шалтгаан').isEnabled(), true)
    await page.getByLabel('Шалтгаан').fill('Эрүүл мэндийн шалтгаантай')
    assert.equal(await page.getByRole('button', { name: 'Хүсэлт илгээх' }).isEnabled(), true)
    await assertNoHorizontalOverflow(page, 'leave open at 09:00')
    await page.screenshot({ path: join(SCREENSHOT_ROOT, 'leave-open-at-0900.png'), fullPage: true })
  })
})

test('submitted hourly leave appears immediately in My requests at 390px', { timeout: 30_000 }, async () => {
  let requests = []
  await runScenario('leave-request-visible-after-submit', async (context, page) => {
    await installFixedClock(page, '2026-08-12T01:00:00.000Z')
    await installApi(context, async (method, request) => {
      if (method.endsWith('attendance_policy.get_leave_policy')) {
        return success({ ...leavePolicyData, requests })
      }
      if (method.endsWith('attendance_policy.submit_emergency_leave')) {
        const body = new URLSearchParams(request.postData() || '')
        const created = {
          name: 'LEAVE-PENDING-QA',
          entertainer: 'VIP-ENT-QA', employee: 'EMP-QA-001', branch: 'Sapphire',
          leave_date: body.get('leave_date'), source_type: 'Emergency Leave', status: 'Pending',
          requested_at: '2026-08-12 09:05:00', reason: body.get('reason'),
          decision_reason: null, decided_by: null, decided_at: null, modified: '2026-08-12 09:05:00',
        }
        requests = [created]
        return success({ request: created, quota: { used: 1, remaining: 1 } })
      }
      return defaultEntertainerApi(method)
    })
  }, async (_context, page) => {
    await waitForEntertainerShell(page)
    await openRequestFlow(page, /Чөлөө авах/)
    await page.getByRole('heading', { name: 'Чөлөө авах' }).waitFor()
    await page.getByLabel('Шалтгаан').fill('Эрүүл мэндийн шалтгаантай')
    await page.getByRole('button', { name: 'Хүсэлт илгээх' }).click()
    await page.getByText('Цагийн чөлөөний хүсэлт амжилттай илгээгдлээ.', { exact: true }).waitFor()
    const history = page.locator('.leave-history')
    await history.getByText('Эрүүл мэндийн шалтгаантай', { exact: true }).waitFor()
    await history.getByText('Шийдвэр хүлээж байна', { exact: true }).waitFor()
    assert.equal(await history.locator('article').count(), 1)
    await assertNoHorizontalOverflow(page, 'submitted leave request history')
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: join(SCREENSHOT_ROOT, 'leave-request-visible-after-submit.png'), fullPage: true })
  })
})

test('overnight leave request closes after the previous-day 21:00 cutoff', { timeout: 30_000 }, async () => {
  await runScenario('leave-closed-after-2100', async (context, page) => {
    await installFixedClock(page, '2026-08-12T13:01:00.000Z')
    await installApi(context, defaultEntertainerApi)
  }, async (_context, page) => {
    await waitForEntertainerShell(page)
    await openRequestFlow(page, /Чөлөө авах/)
    await page.getByRole('heading', { name: 'Чөлөө авах' }).waitFor()
    await page.getByText('Хүсэлтийн хугацаа дууссан', { exact: true }).waitFor()
    assert.equal(await page.getByLabel('Шалтгаан').isDisabled(), true)
    assert.equal(await page.getByRole('button', { name: 'Хүсэлт илгээх' }).isDisabled(), true)
    await assertNoHorizontalOverflow(page, 'leave closed after 21:00')
    await page.screenshot({ path: join(SCREENSHOT_ROOT, 'leave-closed-after-2100.png'), fullPage: true })
  })
})

test('approved leave stays approved after cutoff and does not show a second request form', { timeout: 30_000 }, async () => {
  const approvedRequest = {
    name: 'LEAVE-APPROVED-QA',
    entertainer: 'VIP-ENT-QA',
    employee: 'EMP-QA-001',
    branch: 'Nomad',
    leave_date: '2026-08-13',
    status: 'Approved',
    requested_at: '2026-08-12 19:30:00',
    reason: 'Эрүүл мэндийн шалтгаантай',
    decision_reason: '',
    modified: '2026-08-12 21:15:00',
  }
  await runScenario('leave-approved-after-cutoff', async (context, page) => {
    await installFixedClock(page, '2026-08-12T13:30:00.000Z')
    await installApi(context, async method => {
      if (method.endsWith('attendance_policy.get_leave_policy')) {
        return success({ ...leavePolicyData, quota: { used: 1, remaining: 1 }, requests: [approvedRequest] })
      }
      return defaultEntertainerApi(method)
    })
  }, async (_context, page) => {
    await waitForEntertainerShell(page)
    await openRequestFlow(page, /Чөлөө авах/)
    await page.getByRole('heading', { name: 'Чөлөө авах' }).waitFor()
    await page.getByText('Чөлөө зөвшөөрөгдсөн', { exact: true }).first().waitFor()
    assert.equal(await page.getByText('Хүсэлтийн хугацаа дууссан', { exact: true }).count(), 0)
    assert.equal(await page.getByLabel('Шалтгаан').count(), 0)
    assert.equal(await page.getByRole('button', { name: 'Хүсэлт илгээх' }).count(), 0)
    assert.equal(await page.getByText(/Дахин хүсэлт илгээх шаардлагагүй/).count() > 0, true)
    await assertNoHorizontalOverflow(page, 'approved leave after cutoff')
    await page.screenshot({ path: join(SCREENSHOT_ROOT, 'leave-approved-after-cutoff.png'), fullPage: true })
  })
})

test('an entertainer browses every week and sees attended days in green', { timeout: 30_000 }, async () => {
  await runScenario('entertainer-personal-schedule', context => installApi(context, (method, request) => {
    if (method.endsWith('workforce.get_context')) return success(entertainerContext)
    if (method.endsWith('entertainer.get_dashboard')) return success(entertainerDashboard)
    if (method.endsWith('entertainer.get_rank')) return success(rankData)
    if (method.endsWith('entertainer.get_my_schedule')) {
      const requested = new URL(request.url()).searchParams.get('week_start') || '2026-08-10'
      const nextWeek = requested === '2026-08-17'
      const startDay = nextWeek ? 17 : 10
      const dates = Array.from({ length: 7 }, (_, index) => `2026-08-${String(startDay + index).padStart(2, '0')}`)
      return success({
        week: {
          start: dates[0],
          end: dates[6],
          days: dates.map((date, index) => ({
            date,
            assignment: index % 2 === 0 ? `SHIFT-${date}` : null,
            shift_type: index % 2 === 0 ? 'VIP Night Shift' : null,
            start_time: index % 2 === 0 ? '19:00:00' : null,
            end_time: index % 2 === 0 ? '04:00:00' : null,
          })),
        },
        attended_dates: [nextWeek ? '2026-08-19' : '2026-08-12'],
      })
    }
    return defaultEntertainerApi(method)
  }), async (_context, page) => {
    await page.getByRole('heading', { name: 'Миний ээлж' }).waitFor()
    assert.match(await page.locator('.personal-week-schedule article.is-attended').innerText(), /08[-/]12.*Ирсэн/s)
    await page.getByRole('button', { name: 'Дараагийн долоо хоног' }).click()
    await page.locator('time[datetime="2026-08-17"]').waitFor()
    assert.match(await page.locator('.personal-week-schedule article.is-attended').innerText(), /08[-/]19.*Ирсэн/s)
    assert.equal(await page.locator('.personal-week-schedule article.is-attended').count(), 1)
    await assertNoHorizontalOverflow(page, 'personal schedule week navigation')
    await page.screenshot({ path: join(SCREENSHOT_ROOT, 'entertainer-schedule-attended-next-week.png'), fullPage: true })
  }, { search: '?view=schedule' })
})

test('an entertainer opens and submits team climate feedback at 390px', { timeout: 30_000 }, async () => {
  let submittedFeedback = null
  const profile = workforceProfile()
  await runScenario('entertainer-team-climate', context => installApi(context, (method, request) => {
    if (method.endsWith('workforce.get_context')) return success(entertainerContext)
    if (method.endsWith('entertainer.get_dashboard')) return success(entertainerDashboard)
    if (method.endsWith('entertainer.get_rank')) return success(rankData)
    if (method.endsWith('profile.get_editable_profile')) return success({ profile, pending_request: null })
    if (method.endsWith('team_climate.get_feedback_candidates')) {
      return success({
        branch: 'Sapphire',
        people: [
          { profile: 'ENT-GINJIN', display_name: 'Гинжин', rank: 'Rank 3' },
          { profile: 'ENT-ARIU', display_name: 'Ариу', rank: 'Rank 2' },
        ],
        meta: { total: 2 },
      })
    }
    if (method.endsWith('team_climate.submit_feedback')) {
      submittedFeedback = Object.fromEntries(new URLSearchParams(request.postData() || ''))
      return success({ submitted: true, submitted_at: '2026-08-20 22:20:00' })
    }
    return defaultEntertainerApi(method)
  }), async (_context, page) => {
    await waitForEntertainerShell(page)
    await openRequestFlow(page, /Багийн санал/)
    await page.getByRole('heading', { name: 'Багийн уур амьсгал' }).waitFor()
    await page.getByLabel('Хэнд санал өгөх вэ?').selectOption('ENT-GINJIN')
    await page.getByRole('textbox').fill('Ээлжийн үеэр багтайгаа маш сайн ойлголцож ажилласан.')
    await page.getByRole('button', { name: 'Санал илгээх' }).click()
    await page.getByText('Санал хадгалагдлаа', { exact: true }).waitFor()
    assert.equal(submittedFeedback?.target_entertainer, 'ENT-GINJIN')
    assert.equal(submittedFeedback?.category, 'Positive')
    assert.match(submittedFeedback?.feedback || '', /сайн ойлголцож/)
    await assertNoHorizontalOverflow(page, 'team climate feedback')
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: join(SCREENSHOT_ROOT, 'entertainer-team-climate-mobile.png'), fullPage: true })
  })
})

test('an entertainer records arrival once and never receives a checkout action', { timeout: 30_000 }, async () => {
  let dashboardCalls = 0
  let submittedAction = ''
  await runScenario('overnight-qr-checkout', async (context) => {
    await context.grantPermissions(['geolocation'], { origin })
    await context.setGeolocation({ latitude: 47.9188, longitude: 106.9176, accuracy: 12 })
    await installApi(context, async (method, request) => {
      if (method.endsWith('workforce.get_context')) return success(entertainerContext)
      if (method.endsWith('entertainer.get_dashboard')) {
        dashboardCalls += 1
        if (dashboardCalls === 1) return success({
          ...entertainerDashboard,
          latest_checkin: null,
          attendance: { ...entertainerDashboard.attendance, checked_in: false, checked_out: false, open: false },
        })
        return success({
          ...entertainerDashboard,
          latest_checkin: { name: 'IN-QA', time: '2026-08-12 21:55:00', log_type: 'IN' },
          attendance: { ...entertainerDashboard.attendance, checked_in: true, checked_out: false, open: true },
        })
      }
      if (method.endsWith('entertainer.get_rank')) return success(rankData)
      if (method.endsWith('attendance.get_my_attendance_status')) return success({
        employee: 'EMP-QA', employee_name: 'Ану', branch: 'Sapphire', work_date: '2026-08-12',
        action: 'IN', attendance_mode: 'arrival_only', requires_checkout: false,
        attendance_complete: false, checked_in: false, checked_out: false, open: true,
        late_after_time: '22:00:00', late_minutes: 0, latest_checkin: null,
        shift: { name: 'SHIFT-QA', shift_type: 'VIP Night Shift', start_time: '22:00:00', end_time: '04:00:00' },
      })
      if (method.endsWith('attendance.scan_branch_qr')) {
        submittedAction = new URLSearchParams(request.postData() || '').get('log_type') || ''
        return success({
          accepted: true,
          result: 'Accepted',
          attendance_action: 'IN',
          checked_out: false,
          already_recorded: false,
          requires_checkout: false,
          branch: 'Sapphire',
          distance_meters: 8.4,
          checkin: { name: 'IN-QA', time: '2026-08-12 21:55:00', log_type: 'IN' },
        })
      }
      return success({})
    })
  }, async (_context, page) => {
    await page.getByRole('heading', { name: 'Ирсэн цагаа бүртгэх' }).waitFor()
    await page.getByText('Ирсэн цаг бүртгэгдлээ', { exact: true }).waitFor()
    assert.equal(submittedAction, 'IN')
    assert.ok(dashboardCalls >= 2, 'successful IN must refresh the entertainer dashboard')
    await page.getByRole('button', { name: 'Боллоо' }).click()
    await page.getByText(/Ирсэн · 21:55/).waitFor()
    assert.equal(await page.getByText(/Гарсан цагаа бүртгэх/).count(), 0)
    assert.equal(await page.locator('.attendance-cta').count(), 0, 'arrival status should remain visible without an expandable workday action')
    await assertNoHorizontalOverflow(page, 'entertainer arrival only')
    await page.screenshot({ path: join(SCREENSHOT_ROOT, 'entertainer-arrival-only.png'), fullPage: true })
  }, { search: '?attendance=BAT112-BRANCH-QR' })
})

test('a non-entertainer employee records only their own branch QR attendance', { timeout: 30_000 }, async () => {
  let submittedAction = ''
  let submittedPayload = ''
  const calls = []
  await runScenario('general-employee-qr', async (context) => {
    await context.grantPermissions(['geolocation'], { origin })
    await context.setGeolocation({ latitude: 47.9188, longitude: 106.9176, accuracy: 10 })
    await installApi(context, async (method, request) => {
      calls.push(method)
      if (method.endsWith('workforce.get_context')) return success(employeeContext)
      if (method.endsWith('attendance.get_my_attendance_status')) return success({
        employee: 'EMP-QA-GENERAL', employee_name: 'Бат Ажилтан', branch: 'Nomad', work_date: '2026-08-13',
        action: 'IN', attendance_mode: 'arrival_and_departure', requires_checkout: true,
        attendance_complete: false, checked_in: false, checked_out: false, open: true,
        late_after_time: '22:00:00', late_minutes: 0, latest_checkin: null,
        shift: { name: 'SHIFT-GENERAL', shift_type: 'VIP Night Shift', start_time: '22:00:00', end_time: '04:00:00' },
      })
      if (method.endsWith('attendance.scan_branch_qr')) {
        const body = new URLSearchParams(request.postData() || '')
        submittedAction = body.get('log_type') || ''
        submittedPayload = body.get('qr_payload') || ''
        return success({
          accepted: true, result: 'Accepted', attendance_action: 'IN', already_recorded: false,
          branch: 'Nomad', distance_meters: 5.2, requires_checkout: true,
          checkin: { name: 'CHECKIN-GENERAL', time: '2026-08-13 21:58:00', log_type: 'IN' },
        })
      }
      return success({})
    })
  }, async (_context, page) => {
    if (await page.getByRole('heading', { name: 'Ажилтны аппд нэвтрэх' }).count()) {
      assert.fail(`generic employee unexpectedly reached login; API calls: ${calls.join(', ')}`)
    }
    await page.getByText('Ирсэн цаг бүртгэгдлээ', { exact: true }).waitFor()
    assert.equal(submittedAction, 'IN')
    assert.equal(submittedPayload, 'GENERAL-EMPLOYEE-QR')
    assert.equal(await page.getByText('Бармен', { exact: true }).count(), 1, 'generic employee must see their Employee designation')
    assert.equal(await page.getByRole('button', { name: /Ажилтнууд/ }).count(), 0)
    assert.equal(await page.getByRole('button', { name: /Орлого/ }).count(), 0)
    await assertNoHorizontalOverflow(page, 'general employee QR')
    await page.screenshot({ path: join(SCREENSHOT_ROOT, 'general-employee-qr.png'), fullPage: true })
  }, { search: '?attendance=GENERAL-EMPLOYEE-QR' })
})

test('a non-entertainer employee does not scan again after arrival', { timeout: 30_000 }, async () => {
  let scanCalls = 0
  await runScenario('general-employee-checkout', async (context) => {
    await context.grantPermissions(['geolocation'], { origin })
    await context.setGeolocation({ latitude: 47.9188, longitude: 106.9176, accuracy: 10 })
    await installApi(context, async (method, _request) => {
      if (method.endsWith('workforce.get_context')) return success(employeeContext)
      if (method.endsWith('attendance.get_my_attendance_status')) return success({
        employee: 'EMP-QA-GENERAL', employee_name: 'Бат Ажилтан', branch: 'Nomad', work_date: '2026-08-13',
        action: 'OUT', attendance_mode: 'arrival_and_departure', requires_checkout: true,
        attendance_complete: false, checked_in: true, checked_out: false, open: true,
        late_after_time: '22:00:00', late_minutes: 0,
        latest_checkin: { name: 'CHECKIN-GENERAL-IN', time: '2026-08-13 21:58:00', log_type: 'IN' }, shift: null,
      })
      if (method.endsWith('attendance.scan_branch_qr')) scanCalls += 1
      return success({})
    })
  }, async (_context, page) => {
    await page.getByRole('heading', { name: 'Ирц', exact: true }).waitFor()
    await page.getByRole('heading', { name: 'Ирсэн цаг бүртгэгдсэн' }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Ирсэн цаг бүртгэгдсэн', exact: true }).isDisabled(), true)
    assert.equal(await page.getByText(/Гарсан цагаа бүртгэх|Гарсан цаг бүртгэгдлээ/).count(), 0)
    assert.equal(scanCalls, 0)
    await assertNoHorizontalOverflow(page, 'general employee arrival complete')
    await page.screenshot({ path: join(SCREENSHOT_ROOT, 'general-employee-arrival-complete.png'), fullPage: true })
  }, { search: '?attendance=GENERAL-EMPLOYEE-QR' })
})

for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
  test(`system admin configures and prints branch attendance QR at ${viewport.width}px`, async () => {
    let configuredBody
    let leadRoleBody
    let browserErrors
    await runScenario(`attendance-admin-${viewport.width}`, async (context, page) => {
      browserErrors = trackBrowserErrors(page)
      await context.grantPermissions(['geolocation'], { origin })
      await context.setGeolocation({ latitude: 47.9188, longitude: 106.9176, accuracy: 12 })
      await installApi(context, async (method, request) => {
        if (method.endsWith('workforce.get_context')) return success(adminContext)
        if (method.endsWith('attendance.get_branch_qr')) {
          const selected = new URL(request.url()).searchParams.get('branch') || 'Nomad'
          return success({
            branch: selected,
            qr_payload: `https://example.test/staff/?attendance=${selected}-QA-TOKEN`,
            configured: false,
            latitude: null,
            longitude: null,
            radius_meters: 100,
            active: true,
          })
        }
        if (method.endsWith('attendance.configure_branch_location')) {
          configuredBody = Object.fromEntries(new URLSearchParams(request.postData() || ''))
          return success({
            branch: configuredBody.branch,
            qr_payload: `https://example.test/staff/?attendance=${configuredBody.branch}-QA-TOKEN`,
            configured: true,
            latitude: Number(configuredBody.latitude),
            longitude: Number(configuredBody.longitude),
            radius_meters: Number(configuredBody.radius_meters),
            active: true,
            configured_at: '2026-08-12 20:30:00',
          })
        }
        if (method.endsWith('admin.get_lead_entertainer_candidates')) {
          const selected = new URL(request.url()).searchParams.get('branch') || 'Nomad'
          return success({ branch: selected, people: [{ profile: 'VIP-ENT-QA', display_name: 'Ану', branch: selected, has_login: true, is_lead: false }] })
        }
        if (method.endsWith('admin.set_lead_entertainer')) {
          leadRoleBody = Object.fromEntries(new URLSearchParams(request.postData() || ''))
          return success({ person: { profile: 'VIP-ENT-QA', display_name: 'Ану', branch: leadRoleBody.branch || 'Sapphire', has_login: true, is_lead: true }, replayed: false })
        }
        return success({})
      })
    }, async (_context, page) => {
      await page.getByRole('heading', { name: 'Системийн тохиргоо' }).waitFor()
      await page.getByRole('button', { name: 'Sapphire' }).click()
      await page.getByRole('button', { name: 'Энэ байршлыг зөвшөөрөх' }).click()
      await page.getByText('Sapphire салбарын зөвшөөрөгдсөн байршил хадгалагдлаа.').waitFor()
      assert.equal(configuredBody.branch, 'Sapphire')
      assert.equal(configuredBody.radius_meters, '100')
      assert.ok(Math.abs(Number(configuredBody.latitude) - 47.9188) < 0.00001)
      await page.getByRole('button', { name: 'QR код хэвлэх' }).isEnabled()
      assert.equal(await page.locator('.attendance-qr-code svg').count(), 1)
      await page.getByRole('button', { name: 'Ахлах бүжигчин', exact: true }).click()
      await page.getByRole('heading', { name: 'Ахлах бүжигчин', exact: true }).waitFor()
      await page.getByLabel('Өөрчилсөн шалтгаан').fill('Салбарын ахлах бүжигчнээр томилов')
      await page.getByRole('button', { name: 'Ахлах болгох' }).click()
      await page.getByText('Ану: ахлах бүжигчний эрх олголоо.').waitFor()
      assert.equal(leadRoleBody.profile_name, 'VIP-ENT-QA')
      assert.equal(leadRoleBody.enabled, '1')
      assert.match(leadRoleBody.idempotency_key, /^admin-lead-role:/)
      await assertNoHorizontalOverflow(page, `attendance admin ${viewport.width}`)
      assert.deepEqual(browserErrors, [])
      await page.screenshot({ path: join(SCREENSHOT_ROOT, `attendance-admin-${viewport.width}.png`), fullPage: true })
    }, { viewport })
  })
}

test('entertainer home keeps attendance visible when no shift is assigned', async () => {
  await runScenario('attendance-no-shift', async context => {
    await installApi(context, async method => {
      if (method.endsWith('workforce.get_context')) return success(entertainerContext)
      if (method.endsWith('entertainer.get_dashboard')) return success({ ...entertainerDashboard, shift: null, latest_checkin: null, attendance: { checked_in: false, checked_out: false, open: false, work_date: '2026-08-12', active_window: false } })
      if (method.endsWith('entertainer.get_rank')) return success(rankData)
      return success({})
    })
  }, async (_context, page) => {
    const attendance = page.locator('[data-destination="attendance-qr"]')
    await attendance.waitFor()
    await assertNoHorizontalOverflow(page, 'attendance without shift')
  })
})

test('service worker CacheStorage contains public shell data but no sensitive or tokenized URL', { timeout: 45_000 }, async () => {
  await runScenario('cache-privacy', async context => {
    await installApi(context, async method => {
      if (method.endsWith('workforce.get_context')) return success(managerContext)
      if (method.endsWith('workforce.get_manager_dashboard')) return success(managerDashboard)
      return success('BAT118_TOP_SECRET')
    })
  }, async (_context, page) => {
    await page.evaluate(async () => { await navigator.serviceWorker.ready })
    await page.evaluate(async () => {
      const requests = [
        fetch('/staff/assets/bat118-public.js'),
        fetch('/staff-api/method/nomad_vip.api.workforce.get_context'),
        fetch('/api/method/private-data'),
        fetch('/private/files/profile-photo.png'),
        fetch('/files/export.xlsx'),
        fetch('/staff/assets/bat118-query-secret.js?token=branch-qr-secret'),
        fetch('/staff/assets/bat118-authorized-secret.js', { headers: { Authorization: 'Bearer secret' } }),
        fetch('/staff/?attendance=branch-qr-secret'),
      ]
      await Promise.all(requests.map(request => request.then(response => response.text()).catch(() => '')))
      await new Promise(resolveWait => setTimeout(resolveWait, 150))
    })
    const cacheState = await page.evaluate(async () => {
      const names = await caches.keys()
      const urls = []
      const bodies = []
      for (const name of names) {
        const cache = await caches.open(name)
        for (const request of await cache.keys()) {
          urls.push(request.url)
          const response = await cache.match(request)
          bodies.push(await response.clone().text().catch(() => ''))
        }
      }
      return { names, urls, bodies }
    })
    assert.ok(cacheState.names.some(name => name === 'nomad-staff-v7-public-only'))
    assert.ok(cacheState.urls.some(url => url.endsWith('/staff/assets/bat118-public.js')), 'public test asset should prove runtime caching is active')
    for (const url of cacheState.urls) {
      assert.doesNotMatch(url, /\/(?:staff-api|api|private|files)(?:\/|$)/)
      assert.doesNotMatch(url, /[?&](?:token|attendance)=/)
      assert.doesNotMatch(url, /bat118-(?:query|authorized)-secret/)
    }
    assert.equal(cacheState.bodies.some(body => body.includes('BAT118_TOP_SECRET')), false)
    await assertNoHorizontalOverflow(page, 'cache privacy')
  }, { serviceWorkers: 'allow' })
})
