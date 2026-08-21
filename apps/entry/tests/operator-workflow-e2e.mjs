import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test, { after, before } from 'node:test'

const require = createRequire(import.meta.url)
const APP_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const SCREENSHOT_ROOT = resolve(APP_ROOT, '..', 'outputs', 'operator-workflow-qa')
let server
let origin

function loadPlaywright() {
  try { return require('playwright') } catch (localError) {
    const candidates = [
      process.env.NOMAD_PLAYWRIGHT_MODULE,
      join(homedir(), '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright'),
    ].filter(Boolean)
    for (const candidate of candidates) if (existsSync(join(candidate, 'package.json'))) return require(candidate)
    throw new Error(`Playwright олдсонгүй: ${localError.message}`)
  }
}

function chromeExecutable() {
  return [
    process.env.NOMAD_CHROME_EXECUTABLE,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean).find(existsSync)
}

before(async () => {
  await mkdir(SCREENSHOT_ROOT, { recursive: true })
  const { createServer } = await import('vite')
  server = await createServer({ root: APP_ROOT, server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' })
  await server.listen()
  const address = server.httpServer.address()
  assert.ok(address && typeof address === 'object')
  origin = `http://127.0.0.1:${address.port}`
})

after(async () => { await server?.close() })

for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
  test(`operator creates and safely cancels a reservation at ${viewport.width}px`, { timeout: 45_000 }, async () => {
    const { chromium } = loadPlaywright()
    const browser = await chromium.launch({ headless: true, ...(chromeExecutable() ? { executablePath: chromeExecutable() } : {}) })
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
    const page = await context.newPage()
    const errors = []
    page.on('console', message => {
      if (message.type() === 'error' && !message.text().includes('Failed to load resource')) errors.push(message.text())
    })
    page.on('pageerror', error => errors.push(error.message))
    try {
      await page.goto(`${origin}/visual-operator-qa.html`, { waitUntil: 'domcontentloaded' })
      await page.getByRole('heading', { name: 'Nomad салбарт зочин бүртгэх' }).waitFor()
      assert.equal(await page.locator('.operation-time-picker select').count(), 2)
      assert.match(await page.locator('.operation-form-summary').innerText(), /Ирэх цаг/)
      assert.doesNotMatch(await page.locator('.daily-guest-time strong').first().innerText(), /AM|PM/)

      await page.getByRole('button', { name: /Оператор профайл/ }).click()
      await page.locator('.profile-card').evaluate(element => Promise.allSettled(element.getAnimations().map(animation => animation.finished)))
      assert.equal(await page.locator('.profile-card').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(255, 255, 255)')
      if (viewport.width === 390) await page.screenshot({ path: join(SCREENSHOT_ROOT, 'operator-profile-light-390x844.png') })
      await page.getByRole('button', { name: 'Профайл хаах' }).last().click()

      await page.getByLabel(/Зочны нэр/).fill('Оператор тест зочин')
      await page.getByLabel('Утасны дугаар').fill('99887766')
      await page.getByLabel('Хэдүүлээ ирэх вэ?').fill('5')
      await page.getByLabel('Ирэх цаг').selectOption('23')
      await page.getByLabel('Ирэх минут').selectOption('30')
      await page.getByLabel(/Нэмэлт тайлбар/).fill('QA захиалга')
      await page.getByRole('button', { name: 'Nomad салбарын жагсаалтад нэмэх' }).click()
      await page.getByText(/бүртгэл амжилттай хадгалагдлаа/).waitFor()
      await page.getByText('Оператор тест зочин', { exact: true }).waitFor()

      await page.getByRole('button', { name: 'Цуцлах' }).first().click()
      await page.getByRole('alertdialog').waitFor()
      if (viewport.width === 390) await page.screenshot({ path: join(SCREENSHOT_ROOT, 'operator-cancel-confirm-390x844.png'), fullPage: true })
      await page.getByRole('button', { name: 'Үгүй, хэвээр үлдээх' }).click()
      assert.equal(await page.getByRole('alertdialog').count(), 0)
      await page.getByRole('button', { name: 'Цуцлах' }).first().click()
      await page.getByRole('button', { name: 'Тийм, цуцлах' }).click()
      await page.getByText('Захиалгыг цуцаллаа', { exact: true }).waitFor()

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      assert.ok(overflow <= 1, `${viewport.width}px viewport-д ${overflow}px хэвтээ overflow байна`)
      assert.deepEqual(errors, [])
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.screenshot({ path: join(SCREENSHOT_ROOT, `operator-${viewport.width}x${viewport.height}.png`), fullPage: true })
    } finally {
      await context.close()
      await browser.close()
    }
  })
}

test('staff login accepts the advertised phone-number identity', { timeout: 30_000 }, async () => {
  const { chromium } = loadPlaywright()
  const browser = await chromium.launch({ headless: true, ...(chromeExecutable() ? { executablePath: chromeExecutable() } : {}) })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  try {
    await page.goto(`${origin}/visual-operator-qa.html?guest=1`, { waitUntil: 'domcontentloaded' })
    const username = page.getByLabel('Утасны дугаар')
    await username.fill('99112233')
    assert.equal(await username.getAttribute('inputmode'), 'tel')
    await page.getByLabel('Нууц үг').fill('qa-password')
    await page.screenshot({ path: join(SCREENSHOT_ROOT, 'operator-login-390x844.png'), fullPage: true })
    await page.getByRole('button', { name: 'Нэвтрэх' }).click()
    await page.getByRole('heading', { name: 'Утасны бүртгэл' }).waitFor()
  } finally {
    await page.close()
    await browser.close()
  }
})
