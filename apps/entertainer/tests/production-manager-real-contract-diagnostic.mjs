import { existsSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { homedir, tmpdir } from 'node:os'
import { extname, join } from 'node:path'

const fixturePath = process.env.NOMAD_MANAGER_FIXTURE
if (!fixturePath) throw new Error('NOMAD_MANAGER_FIXTURE is required')
const managerUrl = process.env.NOMAD_MANAGER_URL || 'https://srv1871758.hstgr.cloud/manager/?contract-test=1'

const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'))
const localDist = process.env.NOMAD_MANAGER_DIST
const require = createRequire(import.meta.url)
const runtimePlaywright = join(homedir(), '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright')
const { chromium } = existsSync(join(runtimePlaywright, 'package.json')) ? require(runtimePlaywright) : require('playwright')
const chromeExecutable = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].find(existsSync)

const browser = await chromium.launch({ headless: true, ...(chromeExecutable ? { executablePath: chromeExecutable } : {}) })
for (const [persona, responses] of Object.entries(fixture)) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' })
  const page = await context.newPage()
  const events = []
  page.on('console', message => {
    if (['error', 'warning'].includes(message.type())) events.push(`console:${message.type()}:${message.text()}`)
  })
  page.on('pageerror', error => events.push(`pageerror:${error.stack || error.message}`))
  page.on('requestfailed', request => events.push(`requestfailed:${request.url()}:${request.failure()?.errorText}`))
  if (localDist) {
    await page.route('**/manager/**', route => {
      const url = new URL(route.request().url())
      const relative = url.pathname.slice(url.pathname.indexOf('/manager/') + '/manager/'.length) || 'index.html'
      const filePath = join(localDist, relative)
      const selectedPath = existsSync(filePath) && statSync(filePath).isFile() ? filePath : join(localDist, 'index.html')
      const contentTypes = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.woff': 'font/woff', '.woff2': 'font/woff2' }
      return route.fulfill({ status: 200, contentType: contentTypes[extname(selectedPath)] ?? 'application/octet-stream', body: readFileSync(selectedPath) })
    })
  }
  await page.route('**/api/method/**', route => {
    const url = new URL(route.request().url())
    const method = url.pathname.split('/api/method/')[1]
    const status = url.searchParams.get('status')
    const key = status ? `${method}|status=${status}` : method
    const body = responses[key] ?? responses[method]
    if (body === undefined) {
      return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ exception: `Diagnostic fixture does not include ${key}` }) })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: body }) })
  })

  await page.goto(managerUrl, { waitUntil: 'networkidle', timeout: 30_000 })
  await page.waitForTimeout(2_000)
  const state = await page.evaluate(() => ({
    title: document.title,
    fallback: document.body.innerText.includes('Шинэ хувилбарыг ачаална уу'),
    managerOverview: document.body.innerText.includes('Менежерийн тойм'),
    ceoOverview: document.body.innerText.includes('Удирдлагын төв'),
    loading: document.body.innerText.includes('Мэдээлэл ачаалж байна'),
    visibleTextLength: document.body.innerText.length,
  }))
  let scheduleState = null
  if (persona === 'manager' && state.managerOverview) {
    await page.getByRole('button', { name: 'Хуваарь', exact: true }).click()
    await page.waitForTimeout(1_000)
    const entertainerSource = await page.locator('.live-schedule-source').innerText()
    await page.getByRole('tab', { name: /Бусад ажилтан/ }).click()
    const employeeSource = await page.locator('.live-schedule-source').innerText()
    scheduleState = {
      entertainerAutoSync: entertainerSource.includes('Finex → ERPNext · Автомат хуваарь'),
      employeeErpNextOnly: employeeSource.includes('ERPNext · Бусад ажилтны хуваарь'),
      employeeNoFinexReviewWarning: await page.getByText(/Finex-ийн .* нэр баталгаатай ажилтантай холбоогүй/).count() === 0,
      fallback: await page.getByText('Шинэ хувилбарыг ачаална уу', { exact: true }).count() > 0,
    }
  }
  const screenshot = join(tmpdir(), `nomad-${persona}-real-contract.png`)
  await page.screenshot({ path: screenshot, fullPage: true })
  console.log(JSON.stringify({ persona, state, scheduleState, events, screenshot }, null, 2))
  await context.close()
}
await browser.close()
