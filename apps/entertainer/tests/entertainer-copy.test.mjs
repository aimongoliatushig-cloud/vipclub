import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const entertainerSurfaces = [
  'src/features/attendance/AttendanceQR.tsx',
  'src/features/screens/CoreScreens.tsx',
  'src/features/workforce/IncomeSummary.tsx',
  'src/features/workforce/LoanCenter.tsx',
  'src/features/workforce/RankOverview.tsx',
  'src/features/workforce/WorkdayFlow.tsx',
]

test('entertainer-facing copy avoids internal approval language', async () => {
  const source = (await Promise.all(entertainerSurfaces.map(path => readFile(path, 'utf8')))).join('\n')
  for (const phrase of ['Батлагдсан', 'батлагдсан', 'баталгаатай']) {
    assert.equal(source.includes(phrase), false, `entertainer copy contains internal phrase: ${phrase}`)
  }
})

test('rank screen shows the lifetime attendance-day average without CEO workflow copy', async () => {
  const source = await readFile('src/features/workforce/RankOverview.tsx', 'utf8')
  assert.doesNotMatch(source, /CEO|зөвшөөрөл шаардлагатай|Албан шийдвэр/)
  assert.match(source, /НИЙТ ДУНДАЖ ОНОО/)
  assert.match(source, /Ажилласан болон тасалсан өдрийн дундаж оноогоор зэрэг тогтооно/)
  assert.match(source, /displayRankLabel/)
  assert.match(source, /displayPayout/)
  assert.match(source, /Дараагийн шат/)
  assert.match(source, /data-testid="today-rank-summary"/)
  assert.match(source, /Оноо хэрхэн бодогдов\?/)
  assert.match(source, /Өмнөх өдрүүдийн оноо/)
  assert.match(source, /Бүх зэрэглэлийн дүрэм/)
  assert.doesNotMatch(source, /Зэрэглэлийн шатлал/)
  assert.doesNotMatch(source, /rank_targets|current_points|recent_points|carousel/i)
})

test('home attention list exposes evidence provenance and limits the first view', async () => {
  const source = await readFile('src/App.tsx', 'utf8')
  const api = await readFile('src/api.ts', 'utf8')
  assert.match(source, /attention_items\?\.slice\(0, 3\)/)
  assert.match(source, /item\.source_label/)
  assert.match(api, /'verified' \| 'demo' \| 'unresolved' \| 'inferred'/)
})

test('attendance home explains arrival-only and shows server timestamps', async () => {
  const source = await readFile('src/App.tsx', 'utf8')
  const qr = await readFile('src/features/attendance/AttendanceQR.tsx', 'utf8')
  const entertainerHome = source.slice(source.indexOf('function EntertainerHome'), source.indexOf('function EmployeeHome'))
  const api = await readFile('src/api.ts', 'utf8')
  assert.doesNotMatch(entertainerHome, /Гарах цаг|Гарсан цаг/)
  assert.doesNotMatch(entertainerHome, /checkedOut|Гарсан/)
  assert.doesNotMatch(entertainerHome, /Өнөөдрийн ажлаа үргэлжлүүлэх/)
  assert.match(entertainerHome, /\{!checkedIn \? \(/)
  assert.match(qr, /className="attendance-history-row"/)
  assert.doesNotMatch(qr, /expandedDay|attendance-history-detail|ChevronDown|LogOut/)
  assert.match(api, /checked_in_at\?: string \| null/)
  assert.match(api, /checked_out_at\?: string \| null/)
})

test('home shift shortcut opens a real seven-day personal schedule', async () => {
  const app = await readFile('src/App.tsx', 'utf8')
  const workforce = await readFile('src/features/workforce/WorkforceWorkspace.tsx', 'utf8')
  const schedulePage = workforce.slice(
    workforce.indexOf('export function EntertainerSchedulePage'),
    workforce.indexOf('export function EntertainerProfilePage'),
  )

  assert.match(app, /<small>Миний ээлж<\/small>/)
  assert.match(app, /onBack=\{returnHome\}/)
  assert.match(schedulePage, /api\.entertainerSchedule\(weekStart\)/)
  assert.match(schedulePage, /Хуваарийн мэдээлэл бүрэн бус байна/)
  assert.match(schedulePage, /Өмнөх долоо хоног/)
  assert.match(schedulePage, /Дараагийн долоо хоног/)
  assert.match(schedulePage, /Энэ долоо хоног/)
  assert.match(schedulePage, /data\.week\.days/)
  assert.match(schedulePage, /attendedDates\.has\(day\.date\)/)
  assert.match(schedulePage, /Ирсэн/)
  assert.match(schedulePage, /timeOnly\(day\.start_time\).*timeOnly\(day\.end_time\)/s)
  assert.doesNotMatch(schedulePage, /QR код|onScanQR/)
})

test('visual QA serves complete personal schedule data', async () => {
  const source = await readFile('visual-staff-qa.html', 'utf8')

  assert.match(source, /entertainer\.get_my_schedule/)
  assert.match(source, /week_start/)
  assert.match(source, /attended_dates/)
})

test('team climate handles malformed data and visual QA provides candidates', async () => {
  const component = await readFile('src/features/workforce/TeamClimateFeedback.tsx', 'utf8')
  const visualQa = await readFile('visual-staff-qa.html', 'utf8')

  assert.match(component, /Array\.isArray\(result\?\.people\)/)
  assert.match(component, /Бүжигчдийн жагсаалтын мэдээлэл бүрэн бус байна/)
  assert.match(visualQa, /team_climate\.get_feedback_candidates/)
  assert.match(visualQa, /team_climate\.submit_feedback/)
})

test('entertainer profile keeps identity, photo, verified facts, and display preference in one clear flow', async () => {
  const workforce = await readFile('src/features/workforce/WorkforceWorkspace.tsx', 'utf8')
  const app = await readFile('src/App.tsx', 'utf8')
  const profilePage = workforce.slice(
    workforce.indexOf('export function EntertainerProfilePage'),
    workforce.indexOf("type ManagerDetailView"),
  )

  assert.match(profilePage, /ProfilePhotoSetting/)
  assert.match(workforce, /self-profile-facts/)
  assert.doesNotMatch(profilePage, /ProfileOverview/)
  assert.doesNotMatch(profilePage, /privacy-panel/)
  assert.match(app, /Харанхуй горим/)
  assert.match(app, /Дэлгэцийн өнгийг солих/)
  assert.match(app, /ProfilePreferences/)
})

test('entertainer leave page keeps deductions in the income view', async () => {
  const source = await readFile('src/features/attendance/LeavePolicy.tsx', 'utf8')
  const leavePage = source.slice(
    source.indexOf('export function EntertainerLeavePage'),
    source.indexOf('export function EntertainerLeaveNotifications'),
  )
  assert.doesNotMatch(leavePage, /Цагийн чөлөөний нөхцөл/)
  assert.doesNotMatch(leavePage, /Хүсэлт илгээх хугацаа/)
  assert.doesNotMatch(leavePage, /Ирэх хязгаар/)
  assert.doesNotMatch(leavePage, /Суутгал|суутгал|торгууль|penalty-history/)
  assert.match(leavePage, /Чөлөө авах өдөр/)
  assert.match(leavePage, /submitDayLeave\(date, reason\.trim\(\)\)/)
  assert.doesNotMatch(leavePage, /Эхлэх өдөр|Дуусах өдөр|toDate|leaveType|Чөлөөний төрөл|<select/)
  assert.match(leavePage, /requests: \[result\.request/)
  assert.match(leavePage, /load\(result\.request\)/)
})

test('visual QA persists submitted leave requests in the request list', async () => {
  const source = await readFile('visual-staff-qa.html', 'utf8')

  assert.match(source, /let leaveRequests = \[\]/)
  assert.match(source, /attendance_policy\.submit_emergency_leave/)
  assert.match(source, /attendance_policy\.submit_day_leave/)
  assert.match(source, /requests: leaveRequests/)
})
