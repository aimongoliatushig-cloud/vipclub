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

test('dancer home keeps the approved first view free of extra attention panels', async () => {
  const source = await readFile('src/App.tsx', 'utf8')
  const api = await readFile('src/api.ts', 'utf8')
  const home = source.slice(source.indexOf('function EntertainerHome'), source.indexOf('function ManagerPeoplePage'))
  assert.doesNotMatch(home, /attention_items|home-attention|Анхаарах зүйл/)
  assert.match(api, /'verified' \| 'demo' \| 'unresolved' \| 'inferred'/)
})

test('dancer prototype keeps earnings focused on confirmed amounts without comparison deltas', async () => {
  const home = await readFile('src/features/dancer-ops/HomeRequestScreens.tsx', 'utf8')
  const earnings = await readFile('src/features/dancer-ops/EarningsScreens.tsx', 'utf8')
  const model = await readFile('src/features/dancer-ops/model.ts', 'utf8')

  for (const source of [home, earnings, model])
    assert.doesNotMatch(source, /(?:өчигдрөөс|өмнөх 7 хоногоос|өмнөх сараас)/i)
})

test('dancer prototype renders income composition as an exact labeled donut chart', async () => {
  const earnings = await readFile('src/features/dancer-ops/EarningsScreens.tsx', 'utf8')
  const breakdown = earnings.slice(earnings.indexOf('earnings-breakdown-title'), earnings.indexOf('recent-transactions-title'))

  assert.match(earnings, /PieChart/)
  assert.match(earnings, /innerRadius=\{62\}/)
  assert.match(earnings, /Math\.round\(\(item\.value \/ total\) \* 100\)/)
  assert.match(breakdown, /Нийт орлого/)
  assert.match(breakdown, /formatMoney\(item\.value\)/)
  assert.match(breakdown, /item\.share/)
  assert.doesNotMatch(breakdown, /DisclosureRow/)
})

test('dancer earnings uses the same rounded indigo bar language as the Home earnings card', async () => {
  const earnings = await readFile('src/features/dancer-ops/EarningsScreens.tsx', 'utf8')

  assert.match(earnings, /<h2 id="earnings-trend-title">Орлогын хөдөлгөөн<\/h2>/)
  assert.match(earnings, /<BarChart data=\{chartData\}/)
  assert.match(earnings, /radius=\{\[9, 9, 9, 9\]\}/)
  assert.match(earnings, /index === chartData\.length - 1 \? "var\(--primary\)" : "var\(--primary-border\)"/)
  assert.doesNotMatch(earnings, /<LineChart|<Line\s/)
})

test('dancer earnings presents the net amount once with a compact calculation', async () => {
  const earnings = await readFile('src/features/dancer-ops/EarningsScreens.tsx', 'utf8')

  assert.match(earnings, /id="confirmed-income">Гарт авах дүн/)
  assert.match(earnings, /className="ops-income-calculation"/)
  assert.match(earnings, /<small>Орлого<\/small>/)
  assert.match(earnings, /<small>Суутгал<\/small>/)
  assert.doesNotMatch(earnings, /ops-finance-summary-grid|className="is-net"|>Цэвэр авах</)
})

test('dancer settings offers persistent Mongolian, English and Russian language choices', async () => {
  const locale = await readFile('src/features/dancer-ops/locale.ts', 'utf8')
  const profile = await readFile('src/features/dancer-ops/ScheduleProfileScreens.tsx', 'utf8')
  const app = await readFile('src/features/dancer-ops/DancerOperatingApp.tsx', 'utf8')

  assert.match(locale, /locale: "mn", label: "Монгол"/)
  assert.match(locale, /locale: "en", label: "English"/)
  assert.match(locale, /locale: "ru", label: "Русский"/)
  assert.match(profile, /<LanguageFlag locale=\{option\.locale\}/)
  assert.match(profile, /fill="#c4272f"[\s\S]*fill="#015197"/)
  assert.match(profile, /fill="#012169"[\s\S]*stroke="#c8102e"/)
  assert.match(profile, /fill="#0039a6"[\s\S]*fill="#d52b1e"/)
  assert.match(profile, /role="radiogroup"[\s\S]*role="radio"[\s\S]*aria-checked=\{selected\}/)
  assert.match(profile, /onClick=\{onSettings\}/)
  assert.match(app, /case "settings"/)
  assert.match(app, /localStorage\.setItem\(localeStorageKey, locale\)/)
  assert.match(app, /document\.documentElement\.lang = locale/)
})

test('dancer profile keeps appearance and prototype role controls inside Settings only', async () => {
  const screens = await readFile('src/features/dancer-ops/ScheduleProfileScreens.tsx', 'utf8')
  const profile = screens.slice(screens.indexOf('export function ProfileScreen'), screens.indexOf('export function SettingsScreen'))
  const settings = screens.slice(screens.indexOf('export function SettingsScreen'), screens.indexOf('export function RankScreen'))

  assert.doesNotMatch(profile, /ops-theme-setting|ops-role-preview|role="switch"/)
  assert.match(settings, /ops-theme-setting/)
})

test('dancer prototype keeps schedule access in navigation without duplicating it as a home card', async () => {
  const home = await readFile('src/features/dancer-ops/HomeRequestScreens.tsx', 'utf8')
  const ui = await readFile('src/features/dancer-ops/ui.tsx', 'utf8')
  const locale = await readFile('src/features/dancer-ops/locale.ts', 'utf8')

  assert.doesNotMatch(home, /title="Хуваарь"/)
  assert.match(ui, /id: "schedule" as const, icon: CalendarDays/)
  assert.match(locale, /schedule: "Хуваарь"/)
})

test('dancer weekly schedule shows every Mongolian weekday and honest rest days', async () => {
  const screens = await readFile('src/features/dancer-ops/ScheduleProfileScreens.tsx', 'utf8')
  const model = await readFile('src/features/dancer-ops/model.ts', 'utf8')
  const schedule = screens.slice(screens.indexOf('type ScheduleMode'), screens.indexOf('export function ShiftDetailScreen'))

  assert.match(schedule, /"Даваа"[\s\S]*"Мягмар"[\s\S]*"Лхагва"[\s\S]*"Пүрэв"[\s\S]*"Баасан"[\s\S]*"Бямба"[\s\S]*"Ням"/)
  assert.match(schedule, /shifts\.find\(\(item\) => item\.date === day\.date\)/)
  assert.match(schedule, /shift \? `\$\{shift\.start\}–\$\{shift\.end\}` : "Амралт"/)
  assert.match(schedule, /shift \? shift\.branch : "Ээлжгүй"/)
  assert.match(schedule, /onClick=\{\(\) => onShift\(shift\)\}/)
  assert.match(model, /weekday: "Даваа",[\s\S]*date: "8 сарын 24"/)
  assert.doesNotMatch(schedule, /Өнөөдөр нэг ээлжтэй/)
})

test('dancer prototype keeps the senior team summary off the personal home screen', async () => {
  const home = await readFile('src/features/dancer-ops/HomeRequestScreens.tsx', 'utf8')

  assert.doesNotMatch(home, /title="Багийн ээлж"/)
  assert.doesNotMatch(home, /12 ажиллаж байна/)
})

test('dancer QR attendance provides a camera flow with safe shift validation and recovery', async () => {
  const attendance = await readFile('src/features/dancer-ops/AttendanceScreens.tsx', 'utf8')
  const styles = await readFile('src/features/dancer-ops/dancer-ops.css', 'utf8')

  assert.match(attendance, /Ирцийн QR уншуулах/)
  assert.match(attendance, /getUserMedia/)
  assert.match(attendance, /facingMode: \{ ideal: "environment" \}/)
  assert.match(attendance, /BarcodeDetector/)
  assert.match(attendance, /Nomad[\s\S]*21:00–04:00/)
  assert.match(attendance, /normalized !== expectedAttendanceQr/)
  assert.match(attendance, /Энэ ээлжид ирц бүртгэгдэнэ/)
  assert.match(attendance, /track\.stop\(\)/)
  assert.match(attendance, /cameraRequestRef/)
  assert.match(attendance, /Камерын хүсэлтийг цуцлах/)
  assert.match(attendance, /Камерын эрх хаалттай байна/)
  assert.match(attendance, /QR кодын доорх код/)
  assert.match(attendance, /Камерын дүрс хадгалагдахгүй/)
  assert.match(styles, /\.ops-qr-camera video[\s\S]*object-fit: cover/)
  assert.match(styles, /\.ops-qr-manual > input:focus[\s\S]*var\(--primary\)/)
})

test('dancer request tab is the employee request hub while VIP service requests stay separate', async () => {
  const home = await readFile('src/features/dancer-ops/HomeRequestScreens.tsx', 'utf8')
  const app = await readFile('src/features/dancer-ops/DancerOperatingApp.tsx', 'utf8')
  const model = await readFile('src/features/dancer-ops/model.ts', 'utf8')

  assert.match(home, /title="Хүсэлт"[\s\S]*value="Илгээх"[\s\S]*detail="Чөлөө · Ирц · Санал"/)
  assert.match(home, /Чөлөө авах[\s\S]*Ирц засуулах[\s\S]*Профайл өөрчлөх[\s\S]*Санал, гомдол/)
  assert.match(home, /data-screen="requests"[\s\S]*Юу илгээх вэ\?/)
  assert.match(app, /case "requests":[\s\S]*RequestCenterScreen/)
  assert.match(app, /case "service-request":[\s\S]*ServiceRequestScreen/)
  assert.match(model, /"service-request"/)
})

test('dancer prototype rank explanation mirrors the canonical three-rank contract', async () => {
  const screen = await readFile('src/features/dancer-ops/ScheduleProfileScreens.tsx', 'utf8')
  const model = await readFile('src/features/dancer-ops/model.ts', 'utf8')

  for (const expected of [
    '3-р зэрэг", scoreRange: "0–79.99 оноо", payoutPercent: 50',
    '2-р зэрэг", scoreRange: "80–89.99 оноо", payoutPercent: 60',
    '1-р зэрэг", scoreRange: "90–100 оноо", payoutPercent: 70',
    '"Ирц", score: 96, weight: 10',
    '"Зочны санал, гомдол", score: 92, weight: 15',
    '"Борлуулалт", score: 86, weight: 40',
    '"Үзвэр, бүжгийн ур чадвар", score: 88, weight: 5',
    '"Цэвэр байдал, төрх", score: 90, weight: 5',
    '"Өдрийн гараа", score: 78, weight: 10',
    '"Хувийн хөгжил", score: 82, weight: 5',
    '"Хандлага", score: 94, weight: 10',
  ]) assert.equal(model.includes(expected), true, `missing canonical rank fixture: ${expected}`)

  assert.match(screen, /Одоогийн зэрэг/)
  assert.match(screen, /Мөрдөх хувь/)
  assert.match(screen, /Тооцогдсон өдөр/)
  assert.match(screen, /Дараагийн зэрэг/)
  assert.match(screen, /Баталгаажсан таслалт 0 оноотой/)
  assert.match(screen, /Зөвшөөрсөн чөлөө болон бүрдээгүй өдөр дундажид орохгүй/)
  assert.doesNotMatch(screen, /Шинэ зэрэг болон цалин/)
})

test('dancer rank history uses an exact labeled bar chart instead of a text row list', async () => {
  const profile = await readFile('src/features/dancer-ops/ScheduleProfileScreens.tsx', 'utf8')
  const model = await readFile('src/features/dancer-ops/model.ts', 'utf8')
  const rankScreen = profile.slice(profile.indexOf('export function RankScreen'), profile.indexOf('export function NotificationsScreen'))

  assert.match(model, /rankHistory[\s\S]*8\/19[\s\S]*89\.1[\s\S]*8\/20[\s\S]*displayScore: "0"[\s\S]*8\/21[\s\S]*displayScore: "—"[\s\S]*8\/23[\s\S]*87\.2/)
  assert.match(rankScreen, /<BarChart data=\{rankHistory\}/)
  assert.match(rankScreen, /<LabelList dataKey="displayScore"/)
  assert.match(rankScreen, /domain=\{\[0, 100\]\}/)
  assert.doesNotMatch(rankScreen, /<DisclosureRow title="8 сарын 23"/)
})

test('attendance home explains arrival-only and shows server timestamps', async () => {
  const source = await readFile('src/App.tsx', 'utf8')
  const qr = await readFile('src/features/attendance/AttendanceQR.tsx', 'utf8')
  const entertainerHome = source.slice(source.indexOf('function EntertainerHome'), source.indexOf('function ManagerPeoplePage'))
  const api = await readFile('src/api.ts', 'utf8')
  assert.doesNotMatch(entertainerHome, /Гарах цаг|Гарсан цаг/)
  assert.doesNotMatch(entertainerHome, /checkedOut|Гарсан/)
  assert.doesNotMatch(entertainerHome, /Өнөөдрийн ажлаа үргэлжлүүлэх/)
  assert.match(entertainerHome, /data-destination="attendance-qr"/)
  assert.match(entertainerHome, /onClick=\{onOpenAttendance\}/)
  assert.match(entertainerHome, /data\.latest_checkin\?\.time/)
  assert.match(qr, /className="attendance-history-row"/)
  assert.doesNotMatch(qr, /expandedDay|attendance-history-detail|ChevronDown|LogOut/)
  assert.match(api, /checked_in_at\?: string \| null/)
  assert.match(api, /checked_out_at\?: string \| null/)
})

test('home attendance card shows the real shift and a seven-day visual while the full schedule route remains available', async () => {
  const app = await readFile('src/App.tsx', 'utf8')
  const workforce = await readFile('src/features/workforce/WorkforceWorkspace.tsx', 'utf8')
  const schedulePage = workforce.slice(
    workforce.indexOf('export function EntertainerSchedulePage'),
    workforce.indexOf('export function EntertainerProfilePage'),
  )

  const home = app.slice(app.indexOf('function EntertainerHome'), app.indexOf('function ManagerPeoplePage'))
  assert.match(home, /className="dancer-week-dots"/)
  assert.match(home, /data\.shift\?\.shift\?\.start_time/)
  assert.match(home, /Array\.from\(\{ length: 7 \}/)
  assert.doesNotMatch(home, /data-destination="schedule"/)
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

test('dancer home exposes the exact approved card hierarchy with direct workflow destinations', async () => {
  const app = await readFile('src/App.tsx', 'utf8')
  const home = app.slice(app.indexOf('function EntertainerHome'), app.indexOf('function ManagerPeoplePage'))
  const destinations = ['income', 'attendance-qr', 'rank', 'requests', 'loan']

  for (const destination of destinations)
    assert.match(home, new RegExp(`data-destination="${destination}"`))

  assert.match(home, /className="dancer-income-card"/)
  assert.match(home, /className="dancer-home-pair"/)
  assert.match(home, /className="dancer-home-rows"/)
  assert.match(home, /formatHeroMoney/)
  assert.match(home, /dancer-income-chart-dot/)
  assert.match(home, /dancer-week-dots/)
  assert.match(home, /requestHub\.summary\.pending_count/)
  assert.doesNotMatch(home, /rank\?\.payout_percent \?\? 0/)
  assert.match(home, /loanOverview\.evidence\.outstanding_balance/)
  assert.match(home, /loanOverview\.policy\.message/)
  assert.match(app, /onOpenRequests=\{\(\) => navigateTo\("requests"\)\}/)
  assert.match(app, /onOpenLoan=\{\(\) => navigateTo\("loan"\)\}/)
})

test('loan center loads policy evidence and submits explicit terms acceptance', async () => {
  const source = await readFile('src/features/workforce/LoanCenter.tsx', 'utf8')

  assert.match(source, /api\.loanOverview\(\)/)
  assert.match(source, /api\.submitLoanRequest/)
  assert.match(source, /ENTERTAINER_LOAN_TERMS_VERSION/)
  assert.match(source, /accepted_terms: true/)
  assert.match(source, /policy\.status === 'Active'/)
  assert.match(source, /required_decisions/)
  assert.match(source, /blocking_reasons/)
  assert.match(source, /Дахин оролдох/)
  assert.doesNotMatch(source, /Тун удахгүй/)
})

test('dancer prototype connects the Home loan card to a complete consent-based request flow', async () => {
  const app = await readFile('src/features/dancer-ops/DancerOperatingApp.tsx', 'utf8')
  const home = await readFile('src/features/dancer-ops/HomeRequestScreens.tsx', 'utf8')
  const loan = await readFile('src/features/dancer-ops/LoanScreen.tsx', 'utf8')
  const model = await readFile('src/features/dancer-ops/model.ts', 'utf8')

  assert.match(model, /\| "loan"/)
  assert.match(home, /title="Зээл"/)
  assert.match(home, /onClick=\{onLoan\}/)
  assert.match(app, /case "loan"/)
  assert.match(app, /setView\("loan"\)/)
  assert.match(loan, /Хүсэх дээд дүн/)
  assert.match(loan, /Одоогийн үлдэгдэл/)
  assert.match(loan, /Эргэн төлөх хувь/)
  assert.match(loan, /acceptedTerms/)
  assert.match(loan, /Хүсэлт илгээснээр зээл шууд олгогдохгүй/)
})

test('dancer prototype keeps secondary Home cards concise and defers supporting detail', async () => {
  const home = await readFile('src/features/dancer-ops/HomeRequestScreens.tsx', 'utf8')
  const homeSection = home.slice(home.indexOf('export function HomeScreen'), home.indexOf('type PersonalRequestKind'))

  assert.match(homeSection, /detail="Цагтаа"/)
  assert.match(homeSection, /detail="2-р зэрэг"/)
  assert.match(homeSection, /detail="Чөлөө · Ирц · Санал"/)
  assert.doesNotMatch(homeSection, /1-р зэрэгт 5\.4 оноо дутуу/)
  assert.doesNotMatch(homeSection, /Шууд нээж холбогдох хэсэгт очно/)
  assert.doesNotMatch(homeSection, /Идэвхтэй зээлгүй · Эргэн төлөх хувь/)
})

test('dancer Home keeps notifications in the header instead of a duplicate card', async () => {
  const home = await readFile('src/features/dancer-ops/HomeRequestScreens.tsx', 'utf8')
  const homeSection = home.slice(home.indexOf('export function HomeScreen'), home.indexOf('type PersonalRequestKind'))

  assert.match(homeSection, /<MobileHeader[\s\S]*unreadCount=\{unreadNotifications\}[\s\S]*onNotifications=\{onNotifications\}/)
  assert.match(homeSection, /title="Хүсэлт"[\s\S]*?accent="lavender"[\s\S]*?wide/)
  assert.doesNotMatch(homeSection, /title="Мэдэгдэл"/)
  assert.doesNotMatch(homeSection, /NotificationsCardArt/)
})

test('dancer Home ends with two truthful, actionable attention items', async () => {
  const home = await readFile('src/features/dancer-ops/HomeRequestScreens.tsx', 'utf8')
  const homeSection = home.slice(home.indexOf('export function HomeScreen'), home.indexOf('type PersonalRequestKind'))

  assert.match(homeSection, /className="ops-attention-card"[\s\S]*Анхаарах зүйлс/)
  assert.match(homeSection, /onClick=\{onAttendance\}[\s\S]*Хоцролтоо багасгах[\s\S]*Ээлжээс 15 минутын өмнө ирэх/)
  assert.match(homeSection, /onClick=\{onRank\}[\s\S]*Өдрийн гараанд гарах[\s\S]*Одоогийн үзүүлэлт · 78 оноо/)
})

test('dancer Home cards use one indigo family with shade-based variants', async () => {
  const home = await readFile('src/features/dancer-ops/HomeRequestScreens.tsx', 'utf8')
  const ui = await readFile('src/features/dancer-ops/ui.tsx', 'utf8')
  const styles = await readFile('src/features/dancer-ops/dancer-ops.css', 'utf8')
  const homeSection = home.slice(home.indexOf('export function HomeScreen'), home.indexOf('type PersonalRequestKind'))

  assert.match(ui, /"deep-indigo" \| "indigo" \| "periwinkle" \| "lavender"/)
  assert.match(styles, /has-deep-indigo[\s\S]*#4f46e5/)
  assert.match(styles, /has-indigo[\s\S]*#6366f1/)
  assert.match(styles, /has-periwinkle[\s\S]*#818cf8/)
  assert.match(styles, /has-lavender[\s\S]*#a5b4fc/)
  assert.doesNotMatch(homeSection, /accent="(?:cyan|emerald|rose|amber)"/)
})

test('dancer Profile menu icons use the shared dark indigo treatment', async () => {
  const styles = await readFile('src/features/dancer-ops/dancer-ops.css', 'utf8')

  assert.match(styles, /\.dancer-ops-app\.is-dark \.ops-profile-menu \.ops-row-icon \{[\s\S]*?border: 1px solid var\(--primary-border\);[\s\S]*?background: var\(--primary-soft\);[\s\S]*?color: var\(--primary-strong\);/)
  assert.match(styles, /\.ops-profile-menu button:(?:hover|focus-visible) \.ops-row-icon/)
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
  assert.match(app, /Дэлгэцийн горим/)
  assert.match(app, /Цайвар, бараан эсвэл системийн тохиргоо/)
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
