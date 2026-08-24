import assert from 'node:assert/strict'
import test from 'node:test'

const listeners = new Set()
let prefersDark = false
const localStorageData = new Map()
const themeColor = { content: '' }

const mediaQuery = {
  get matches() {
    return prefersDark
  },
  addEventListener(type, listener) {
    if (type === 'change') listeners.add(listener)
  },
  removeEventListener(type, listener) {
    if (type === 'change') listeners.delete(listener)
  },
}

globalThis.window = {
  localStorage: {
    getItem: key => localStorageData.get(key) ?? null,
    setItem: (key, value) => localStorageData.set(key, value),
    clear: () => localStorageData.clear(),
  },
  matchMedia: query => {
    assert.equal(query, '(prefers-color-scheme: dark)')
    return mediaQuery
  },
}

globalThis.document = {
  documentElement: { dataset: {}, style: {} },
  querySelector: selector => {
    assert.equal(selector, 'meta[name="theme-color"]')
    return { setAttribute: (_name, value) => { themeColor.content = value } }
  },
}

const {
  LEGACY_THEME_STORAGE_KEY,
  THEME_STORAGE_KEY,
  disposeThemeRuntime,
  initializeTheme,
  persistTheme,
  resolveTheme,
} = await import('../src/themeRuntime.ts')

function resetThemeTestState() {
  disposeThemeRuntime()
  localStorageData.clear()
  listeners.clear()
  prefersDark = false
  document.documentElement.dataset = {}
  document.documentElement.style = {}
  themeColor.content = ''
}

function emitSystemThemeChange(matches) {
  prefersDark = matches
  for (const listener of listeners) listener({ matches })
}

test('theme defaults to the canonical light mode', () => {
  resetThemeTestState()
  prefersDark = true

  assert.equal(initializeTheme(), 'light')
  assert.equal(document.documentElement.dataset.theme, 'light')
  assert.equal(document.documentElement.style.colorScheme, 'light')
  assert.equal(themeColor.content, '#F4F6F8')
  assert.equal(listeners.size, 0)

  emitSystemThemeChange(false)
  assert.equal(document.documentElement.dataset.theme, 'light')
  assert.equal(themeColor.content, '#F4F6F8')
})

test('legacy v2 explicit themes migrate to v3 preferences', () => {
  resetThemeTestState()
  localStorageData.set(LEGACY_THEME_STORAGE_KEY, 'dark')

  assert.equal(initializeTheme(), 'dark')
  assert.equal(localStorageData.get(THEME_STORAGE_KEY), 'dark')
  assert.equal(document.documentElement.dataset.theme, 'dark')
  assert.equal(listeners.size, 0)
})

test('explicit preference persists and detaches the system listener', () => {
  resetThemeTestState()
  persistTheme('system')
  assert.equal(listeners.size, 1)

  assert.equal(persistTheme('light'), 'light')
  assert.equal(localStorageData.get(THEME_STORAGE_KEY), 'light')
  assert.equal(document.documentElement.dataset.theme, 'light')
  assert.equal(listeners.size, 0)

  emitSystemThemeChange(true)
  assert.equal(document.documentElement.dataset.theme, 'light')

  assert.equal(persistTheme('system'), 'dark')
  assert.equal(localStorageData.get(THEME_STORAGE_KEY), 'system')
  assert.equal(listeners.size, 1)
  assert.equal(resolveTheme('system', false), 'light')
})
