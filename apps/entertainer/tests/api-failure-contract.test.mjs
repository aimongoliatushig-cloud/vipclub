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

const {
  api,
  API_REQUEST_TIMEOUT_MS,
  SESSION_EXPIRED_EVENT,
  STAFF_API_FAILURE_EVENT,
} = await import('../src/api.ts')
const { StaffApiError } = await import('../src/runtimePolicy.ts')

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

test.beforeEach(() => {
  emitted.length = 0
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } })
})

test('Frappe nested message and failure metadata survive as a typed API error', async () => {
  globalThis.fetch = async () => jsonResponse(403, {
    exc_type: 'PermissionError',
    session_expired: 1,
    _server_messages: JSON.stringify([
      JSON.stringify({ message: 'Please <strong>sign in</strong> again.' }),
    ]),
  })

  await assert.rejects(api.managerDashboard(), error => {
    assert.equal(error instanceof StaffApiError, true)
    assert.equal(error.kind, 'session-expired')
    assert.equal(error.status, 403)
    assert.equal(error.exc_type, 'PermissionError')
    assert.equal(error.session_expired, true)
    assert.equal(error.serverMessage, 'Please sign in again.')
    return true
  })
  assert.equal(emitted.length, 1)
  assert.equal(emitted[0].type, SESSION_EXPIRED_EVENT)
})

test('parallel expiry responses emit the global session event only once until login succeeds', async () => {
  let loginSucceeded = false
  globalThis.fetch = async () => jsonResponse(200, { message: { full_name: 'Test' } })
  await api.login('test@example.com', 'secret')
  emitted.length = 0

  globalThis.fetch = async () => jsonResponse(401, {
    exc_type: 'AuthenticationError',
    session_expired: true,
  })

  await Promise.allSettled([api.managerDashboard(), api.entertainerDashboard()])
  assert.equal(emitted.filter(event => event.type === SESSION_EXPIRED_EVENT).length, 1)

  globalThis.fetch = async () => {
    loginSucceeded = true
    return jsonResponse(200, { message: { full_name: 'Test' } })
  }
  await api.login('test@example.com', 'secret')
  assert.equal(loginSucceeded, true)
  emitted.length = 0

  globalThis.fetch = async () => jsonResponse(401, {
    exc_type: 'AuthenticationError',
    session_expired: true,
  })
  await assert.rejects(api.managerDashboard(), error => error.kind === 'session-expired')
  assert.equal(emitted.filter(event => event.type === SESSION_EXPIRED_EVENT).length, 1)
})

test('a forbidden response remains permission-denied and never emits session expiry', async () => {
  globalThis.fetch = async () => jsonResponse(403, {
    exc_type: 'PermissionError',
    message: 'Өөр салбарын мэдээллийг харах эрхгүй.',
  })

  await assert.rejects(api.managerDashboard(), error => {
    assert.equal(error.kind, 'permission-denied')
    assert.equal(error.status, 403)
    assert.equal(error.exc_type, 'PermissionError')
    assert.equal(error.session_expired, undefined)
    return true
  })
  assert.equal(emitted.length, 1)
  assert.equal(emitted[0].type, STAFF_API_FAILURE_EVENT)
})

test('offline and timeout failures remain distinct typed failures', async () => {
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: false } })
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(api.managerDashboard(), error => error.kind === 'offline' && error.retryable)

  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } })
  globalThis.fetch = async () => { throw new DOMException('The operation was aborted.', 'AbortError') }
  await assert.rejects(api.managerDashboard(), error => error.kind === 'timeout' && error.retryable)
  assert.equal(API_REQUEST_TIMEOUT_MS, 20000)
})

test('common requests and private uploads share credentials, cache and abort policy', async () => {
  const calls = []
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options })
    if (String(url).includes('/method/upload_file')) {
      return jsonResponse(200, { message: { file_url: '/private/files/avatar.png' } })
    }
    return jsonResponse(200, { message: { branch: 'Sapphire', roster: [] } })
  }

  await api.managerDashboard()
  const uploadResult = await api.uploadProfilePhoto(new File(['photo'], 'avatar.png', { type: 'image/png' }))

  assert.equal(uploadResult, '/private/files/avatar.png')
  assert.equal(calls.length, 2)
  for (const call of calls) {
    assert.equal(call.options.credentials, 'include')
    assert.equal(call.options.cache, 'no-store')
    assert.equal(call.options.signal instanceof AbortSignal, true)
  }
  assert.equal(calls[0].options.method, 'GET')
  assert.equal(calls[1].options.method, 'POST')
  assert.equal(calls[1].options.body instanceof FormData, true)
  assert.equal(calls[1].options.body.get('is_private'), '1')
})

test('private upload failures use the same typed metadata and timeout classifier', async () => {
  globalThis.fetch = async () => jsonResponse(500, {
    exc: 'Traceback omitted',
    exc_type: 'ValidationError',
    _server_messages: JSON.stringify([JSON.stringify({ message: 'Файл хадгалагдсангүй.' })]),
  })

  await assert.rejects(
    api.uploadProfilePhoto(new File(['photo'], 'avatar.png', { type: 'image/png' })),
    error => {
      assert.equal(error.kind, 'server')
      assert.equal(error.status, 500)
      assert.equal(error.exc_type, 'ValidationError')
      assert.equal(error.serverMessage, 'Файл хадгалагдсангүй.')
      return true
    },
  )

  globalThis.fetch = async () => { throw new DOMException('The operation was aborted.', 'AbortError') }
  await assert.rejects(
    api.uploadProfilePhoto(new File(['photo'], 'avatar.png', { type: 'image/png' })),
    error => error.kind === 'timeout',
  )
})
