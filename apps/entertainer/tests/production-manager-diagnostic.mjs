import { mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const require = createRequire(import.meta.url)
const runtimePlaywright = join(homedir(), '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright')
const { chromium } = existsSync(join(runtimePlaywright, 'package.json')) ? require(runtimePlaywright) : require('playwright')
const chromeExecutable = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].find(existsSync)

const output = join(tmpdir(), 'nomad-production-manager-diagnostic')
await mkdir(output, { recursive: true })

const browser = await chromium.launch({ headless: true, ...(chromeExecutable ? { executablePath: chromeExecutable } : {}) })
for (const serviceWorkers of ['allow', 'block']) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers })
  const page = await context.newPage()
  const events = []
  if (serviceWorkers === 'block') {
    await page.route('**/api/method/nomad_vip.api.management.get_session**', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: { authenticated: true, user: 'manager.qa@example.test', display_name: 'QA Менежер', role: 'Branch Manager', branches: ['Nomad'], csrf_token: 'qa-token' } }),
    }))
  }
  page.on('console', message => events.push(`console:${message.type()}:${message.text()}`))
  page.on('pageerror', error => events.push(`pageerror:${error.stack || error.message}`))
  page.on('requestfailed', request => events.push(`requestfailed:${request.url()}:${request.failure()?.errorText}`))
  page.on('response', response => { if (response.status() >= 400) events.push(`response:${response.status()}:${response.url()}`) })
  const response = await page.goto('https://srv1871758.hstgr.cloud/manager/', { waitUntil: 'networkidle', timeout: 30_000 })
  await page.waitForTimeout(2_000)
  const state = await page.evaluate(async () => ({
    title: document.title,
    location: location.href,
    bodyText: document.body.innerText,
    bodyHtml: document.body.innerHTML.slice(0, 2_000),
    rootHtml: document.querySelector('#root')?.innerHTML.slice(0, 2_000),
    serviceWorkers: await navigator.serviceWorker?.getRegistrations().then(rows => rows.map(row => ({ scope: row.scope, active: row.active?.scriptURL }))),
  }))
  await page.screenshot({ path: join(output, `manager-${serviceWorkers}.png`), fullPage: true })
  console.log(JSON.stringify({ serviceWorkers, status: response?.status(), state, events }, null, 2))
  await context.close()
}
await browser.close()
