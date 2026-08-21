import assert from 'node:assert/strict'
import test from 'node:test'

const emitted = []
const browserWindow = {
  location: { pathname: '/staff/', origin: 'https://staff.example.test' },
  setTimeout,
  clearTimeout,
  dispatchEvent(event) {
    emitted.push(event)
    return true
  },
}

Object.defineProperty(globalThis, 'window', { configurable: true, value: browserWindow })
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } })

const { api, STAFF_API_FAILURE_EVENT } = await import('../src/api.ts')
const { StaffApiError } = await import('../src/runtimePolicy.ts')

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

test.beforeEach(() => {
  emitted.length = 0
})

test('context keeps session-expired metadata without emitting a duplicate global event', async () => {
  globalThis.fetch = async () => jsonResponse(403, {
    exc_type: 'PermissionError',
    session_expired: 1,
    message: 'Please sign in.',
  })

  await assert.rejects(api.context(), error => {
    assert.equal(error instanceof StaffApiError, true)
    assert.equal(error.kind, 'session-expired')
    assert.equal(error.invalidatesSession, true)
    return true
  })
  assert.equal(emitted.length, 0)
})

test('protected API role denial emits one permission event and preserves the session', async () => {
  globalThis.fetch = async () => jsonResponse(403, {
    exc_type: 'PermissionError',
    message: 'Өөр салбарын мэдээллийг харах эрхгүй.',
  })

  await assert.rejects(api.managerDashboard(), error => {
    assert.equal(error.kind, 'permission-denied')
    assert.equal(error.invalidatesSession, false)
    return true
  })
  assert.equal(emitted.length, 1)
  assert.equal(emitted[0].type, STAFF_API_FAILURE_EVENT)
  assert.equal(emitted[0].detail.error.kind, 'permission-denied')
})

test('protected API expiry emits one session event for immediate protected-state purge', async () => {
  globalThis.fetch = async () => jsonResponse(403, {
    exc_type: 'PermissionError',
    session_expired: 1,
    message: 'Please sign in.',
  })

  await assert.rejects(api.managerDashboard(), error => error.kind === 'session-expired')
  assert.equal(emitted.length, 1)
  assert.equal(emitted[0].detail.error.invalidatesSession, true)
})

test('offline fetch failure is typed and never becomes a permission event', async () => {
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: false } })
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch') }

  await assert.rejects(api.context(), error => {
    assert.equal(error.kind, 'offline')
    assert.equal(error.retryable, true)
    return true
  })
  assert.equal(emitted.length, 0)
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } })
})

test('invalid login gets a clear Mongolian message and does not emit session expiry', async () => {
  globalThis.fetch = async () => jsonResponse(401, {
    exc_type: 'AuthenticationError',
    message: 'Invalid login credentials',
  })

  await assert.rejects(api.login('wrong', 'wrong'), error => {
    assert.equal(error.message, 'Утасны дугаар эсвэл нууц үг буруу байна.')
    return true
  })
  assert.equal(emitted.length, 0)
})
