import assert from 'node:assert/strict'
import test from 'node:test'

import {
  API_FAILURE_USER_MESSAGES,
  ROLE_TAB_ALLOWLIST,
  StaffApiError,
  canAccessStaffTab,
  classifyApiFailure,
  extractApiFailureMessage,
  failureViewFor,
  isStaffMode,
  isStaffTab,
  isTabAllowed,
  messageForFailure,
  resolveStaffTab,
} from '../src/runtimePolicy.ts'

test('all employee modes can record their own QR attendance while privileged views stay separated', () => {
  assert.equal(canAccessStaffTab('admin', 'attendance-admin'), true)
  assert.equal(canAccessStaffTab('admin', 'people'), false)
  assert.equal(canAccessStaffTab('admin', 'attendance-qr'), false)

  assert.equal(canAccessStaffTab('manager', 'people'), true)
  assert.equal(canAccessStaffTab('manager', 'person-detail'), true)
  assert.equal(canAccessStaffTab('manager', 'attendance-qr'), true)
  assert.equal(canAccessStaffTab('manager', 'income'), false)

  assert.equal(canAccessStaffTab('lead', 'readiness'), true)
  assert.equal(canAccessStaffTab('lead', 'attendance-qr'), true)
  assert.equal(canAccessStaffTab('lead', 'people'), false)
  assert.equal(canAccessStaffTab('lead', 'corrections'), false)

  assert.equal(canAccessStaffTab('entertainer', 'attendance-qr'), true)
  assert.equal(canAccessStaffTab('entertainer', 'workday'), true)
  assert.equal(canAccessStaffTab('entertainer', 'roster-review'), false)
  assert.equal(canAccessStaffTab('entertainer', 'corrections'), false)

  assert.equal(canAccessStaffTab('employee', 'attendance-qr'), true)
  assert.equal(canAccessStaffTab('employee', 'profile'), true)
  assert.equal(canAccessStaffTab('employee', 'people'), false)
  assert.equal(canAccessStaffTab('employee', 'income'), false)

  assert.equal(ROLE_TAB_ALLOWLIST.manager.includes('notifications'), true)
  assert.equal(ROLE_TAB_ALLOWLIST.lead.includes('readiness'), true)
  assert.equal(ROLE_TAB_ALLOWLIST.entertainer.includes('notifications'), true)
  assert.equal(ROLE_TAB_ALLOWLIST.admin.includes('attendance-admin'), true)
})

test('tab helpers reject unknown input and always resolve to an allowed fallback', () => {
  assert.equal(isStaffMode('manager'), true)
  assert.equal(isStaffMode('admin'), true)
  assert.equal(isStaffMode('lead'), true)
  assert.equal(isStaffMode('employee'), true)
  assert.equal(isStaffTab('home'), true)
  assert.equal(isStaffTab('admin'), false)
  assert.equal(isTabAllowed('manager', 'people'), true)
  assert.equal(resolveStaffTab('manager', 'attendance-qr'), 'attendance-qr')
  assert.equal(resolveStaffTab('entertainer', 'people', 'workday'), 'workday')
  assert.equal(resolveStaffTab('lead', 'people', 'readiness'), 'readiness')
  assert.equal(resolveStaffTab('manager', 'income', 'attendance-qr'), 'attendance-qr')
  assert.equal(resolveStaffTab('employee', 'people'), 'home')
  assert.equal(resolveStaffTab('admin', 'people'), 'home')
})

test('StaffApiError exposes the stable runtime contract used by the app shell', () => {
  const cause = new Error('raw network failure')
  const error = new StaffApiError('offline', { status: 0, serverMessage: 'Failed to fetch', cause })

  assert.equal(error.name, 'StaffApiError')
  assert.equal(error.kind, 'offline')
  assert.equal(error.message, messageForFailure('offline'))
  assert.equal(error.retryable, true)
  assert.equal(error.invalidatesSession, false)
  assert.equal(error.cause, cause)
})

test('nested Frappe server messages are decoded and stripped of markup', () => {
  const payload = {
    _server_messages: JSON.stringify([
      JSON.stringify({ message: 'Please <strong>sign in</strong> again.' }),
    ]),
  }

  assert.equal(extractApiFailureMessage(payload), 'Please sign in again.')
})

test('production-style guest 403 is classified as an expired session', () => {
  const payload = {
    exc_type: 'PermissionError',
    _server_messages: JSON.stringify([
      JSON.stringify({
        message: 'You are not permitted to access this resource. Login to accessFunction <strong>nomad_vip.api.workforce.get_context</strong> is not whitelisted.',
      }),
    ]),
  }

  const failure = classifyApiFailure({ status: 403, payload, online: true })
  assert.equal(failure.kind, 'session-expired')
  assert.equal(failure.invalidatesSession, true)
  assert.equal(failure.retryable, false)
  assert.equal(failure.message, API_FAILURE_USER_MESSAGES['session-expired'])
  assert.match(failure.serverMessage, /Login to accessFunction/)
  assert.doesNotMatch(failure.serverMessage, /<strong>/)
  assert.equal(failureViewFor(failure, false), 'login')
  assert.equal(failureViewFor(failure, true), 'session-expired')
})

test('a role or branch 403 remains permission denied and does not clear the session', () => {
  const failure = classifyApiFailure({
    status: 403,
    payload: { exc_type: 'PermissionError', message: 'Өөр салбарын мэдээллийг харах эрхгүй.' },
    online: true,
  })

  assert.equal(failure.kind, 'permission-denied')
  assert.equal(failure.invalidatesSession, false)
  assert.equal(failure.retryable, false)
  assert.equal(failureViewFor(failure, true), 'access-denied')
})

test('401, authentication exceptions, offline, timeout, network and server failures stay distinct', () => {
  assert.equal(classifyApiFailure({ sessionExpired: true, message: 'expired' }).kind, 'session-expired')
  assert.equal(classifyApiFailure({ status: 401 }).kind, 'session-expired')
  assert.equal(classifyApiFailure({ status: 403, payload: { exc_type: 'AuthenticationError' } }).kind, 'session-expired')
  assert.equal(classifyApiFailure({ online: false, cause: new TypeError('Failed to fetch') }).kind, 'offline')

  const timeout = new Error('request aborted')
  timeout.name = 'AbortError'
  assert.equal(classifyApiFailure({ online: true, cause: timeout }).kind, 'timeout')
  assert.equal(classifyApiFailure({ online: true, aborted: true, message: 'aborted' }).kind, 'timeout')
  assert.equal(classifyApiFailure({ online: true, cause: new TypeError('Failed to fetch') }).kind, 'network')
  assert.equal(classifyApiFailure({ status: 503, payload: { message: 'Service unavailable' } }).kind, 'server')
})

test('only transient failures are retryable', () => {
  for (const input of [
    { online: false },
    { online: true, cause: new TypeError('Failed to fetch') },
    { status: 500 },
  ]) {
    assert.equal(classifyApiFailure(input).retryable, true)
  }

  assert.equal(classifyApiFailure({ status: 401 }).retryable, false)
  assert.equal(classifyApiFailure({ status: 403, payload: { message: 'Эрхгүй.' } }).retryable, false)
})
