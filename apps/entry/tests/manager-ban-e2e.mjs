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
const SCREENSHOT_ROOT = resolve(APP_ROOT, '..', 'outputs', 'manager-ban-qa')
let server
let origin

function loadPlaywright() {
  try { return require('playwright') } catch (localError) {
    const candidate = join(homedir(), '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright')
    if (existsSync(join(candidate, 'package.json'))) return require(candidate)
    throw new Error(`Playwright олдсонгүй: ${localError.message}`)
  }
}

const chromeExecutable = () => [
  process.env.NOMAD_CHROME_EXECUTABLE,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean).find(existsSync)

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
  test(`branch manager can read another branch ban and add a local ban at ${viewport.width}px`, { timeout: 45_000 }, async () => {
    const { chromium } = loadPlaywright()
    const browser = await chromium.launch({ headless: true, ...(chromeExecutable() ? { executablePath: chromeExecutable() } : {}) })
    const page = await browser.newPage({ viewport })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    try {
      await page.goto(`${origin}/visual-manager-ban-qa.html`, { waitUntil: 'domcontentloaded' })
      await page.getByRole('heading', { name: 'Сүүлийн нэвтрэлтүүд' }).waitFor()
      assert.equal(await page.getByRole('heading', { name: 'Салбарын баталгаажуулалт' }).count(), 0, 'manager management workbench must not require the door QR')
      await page.getByLabel('Утасны дугаар').fill('99112233')
      if (viewport.width === 390) await page.screenshot({ path: join(SCREENSHOT_ROOT, 'manager-pre-entry-search-390x844.png') })
      await page.getByRole('button', { name: 'Шалгах', exact: true }).click()
      await page.getByRole('dialog').waitFor()
      await page.getByText('Энэ салбарт хориггүй. Өөр салбарын тэмдэглэл байна.').waitFor()
      assert.match(await page.locator('.cross-branch-ban-notice').innerText(), /Monarch салбар[\s\S]*Үйлчилгээний журам давтан зөрчсөн/)
      assert.match(await page.locator('.cross-branch-ban-notice').innerText(), /автоматаар хориглохгүй/)
      assert.equal(await page.locator('.customer-ban-banner').count(), 0)
      await page.waitForTimeout(350)
      await page.screenshot({ path: join(SCREENSHOT_ROOT, `manager-other-branch-ban-${viewport.width}x${viewport.height}.png`) })

      await page.getByLabel('Ban хийх шалтгаан').fill('Nomad салбарын менежерийн QA хориг')
      await page.getByRole('button', { name: 'Ban хийх', exact: true }).click()
      const confirm = page.getByRole('alertdialog')
      await confirm.waitFor()
      assert.match(await confirm.innerText(), /Nomad салбар[\s\S]*Nomad салбарын менежерийн QA хориг/)
      await page.getByRole('button', { name: 'Буцах', exact: true }).click()
      assert.equal(await page.getByRole('alertdialog').count(), 0)
      await page.getByRole('button', { name: 'Ban хийх', exact: true }).click()
      await page.getByRole('alertdialog').waitFor()
      if (viewport.width === 390) await page.screenshot({ path: join(SCREENSHOT_ROOT, 'manager-ban-confirm-390x844.png') })
      await page.getByRole('button', { name: 'Тийм, ban хийх', exact: true }).click()
      await page.getByText('Хэрэглэгчийн нэвтрэх эрхийг энэ салбарт хориглолоо').waitFor()
      await page.locator('.customer-ban-banner').waitFor()
      assert.match(await page.locator('.customer-ban-banner').innerText(), /NOMAD САЛБАРТ НЭВТРЭХ ЭРХГҮЙ/)
      assert.match(await page.locator('.cross-branch-ban-notice').innerText(), /Нэмэлтээр 1 салбарт хоригтой/)

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      assert.ok(overflow <= 1, `${viewport.width}px viewport-д ${overflow}px хэвтээ overflow байна`)
      assert.deepEqual(errors, [])
      await page.screenshot({ path: join(SCREENSHOT_ROOT, `manager-local-ban-${viewport.width}x${viewport.height}.png`) })
    } finally {
      await page.close()
      await browser.close()
    }
  })
}

test('manager gets a clear empty result for an unknown exact phone', { timeout: 30_000 }, async () => {
  const { chromium } = loadPlaywright()
  const browser = await chromium.launch({ headless: true, ...(chromeExecutable() ? { executablePath: chromeExecutable() } : {}) })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  try {
    await page.goto(`${origin}/visual-manager-ban-qa.html`, { waitUntil: 'domcontentloaded' })
    await page.getByLabel('Утасны дугаар').fill('99000001')
    await page.getByRole('button', { name: 'Шалгах', exact: true }).click()
    await page.getByText(/Бүртгэлтэй хэрэглэгч олдсонгүй/).waitFor()
    assert.equal(await page.getByRole('dialog').count(), 0)
    await page.screenshot({ path: join(SCREENSHOT_ROOT, 'manager-search-empty-390x844.png') })
  } finally {
    await page.close()
    await browser.close()
  }
})

test('manager search keeps a clear recoverable error state', { timeout: 30_000 }, async () => {
  const { chromium } = loadPlaywright()
  const browser = await chromium.launch({ headless: true, ...(chromeExecutable() ? { executablePath: chromeExecutable() } : {}) })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  try {
    await page.goto(`${origin}/visual-manager-ban-qa.html`, { waitUntil: 'domcontentloaded' })
    await page.getByLabel('Утасны дугаар').fill('99999999')
    await page.getByRole('button', { name: 'Шалгах', exact: true }).click()
    await page.getByRole('alert').filter({ hasText: 'Хайлт түр боломжгүй байна' }).waitFor()
    assert.equal(await page.getByLabel('Утасны дугаар').inputValue(), '99999999')
    await page.screenshot({ path: join(SCREENSHOT_ROOT, 'manager-search-error-390x844.png') })
  } finally {
    await page.close()
    await browser.close()
  }
})
