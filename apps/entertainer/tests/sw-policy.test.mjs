import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

const appOrigin = 'https://staff.example.test'
const policySource = await readFile(new URL('../public/sw-policy.js', import.meta.url), 'utf8')
const workerSource = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8')

function loadPolicy() {
  const context = vm.createContext({ self: {}, URL })
  vm.runInContext(policySource, context, { filename: 'sw-policy.js' })
  return context.self.NomadStaffCachePolicy
}

function request(path, overrides = {}) {
  const headers = new Headers(overrides.headers)
  return {
    url: new URL(path, appOrigin).href,
    method: 'GET',
    mode: 'cors',
    ...overrides,
    headers,
  }
}

test('only explicitly public staff assets are eligible for runtime caching', () => {
  const policy = loadPolicy()

  assert.equal(policy.shouldHandlePublicAsset(request('/staff/assets/index-abcd1234.js'), appOrigin), true)
  assert.equal(policy.shouldHandlePublicAsset(request('/staff/assets/index-abcd1234.css'), appOrigin), true)
  assert.equal(policy.shouldHandlePublicAsset(request('/staff/branch-logos/sapphire-original.png'), appOrigin), true)
  assert.equal(policy.shouldHandlePublicAsset(request('/staff/icon-192.png'), appOrigin), true)

  assert.equal(policy.shouldHandlePublicAsset(request('/staff/demo/anu-demo-profile.png'), appOrigin), false)
  assert.equal(policy.shouldHandlePublicAsset(request('/staff/unknown.json'), appOrigin), false)
  assert.equal(policy.shouldHandlePublicAsset(request('https://other.example/staff/assets/app.js'), appOrigin), false)
})

test('API, private files, query tokens, writes and authorized requests are never cache candidates', () => {
  const policy = loadPolicy()
  const denied = [
    request('/staff-api/method/nomad_vip.api.workforce.get_context'),
    request('/api/method/nomad_vip.api.workforce.get_context'),
    request('/private/files/profile-photo.png'),
    request('/files/export.xlsx'),
    request('/staff/assets/app.js?token=secret'),
    request('/staff/?attendance=branch-qr-secret', { mode: 'navigate' }),
    request('/staff/assets/app.js', { method: 'POST' }),
    request('/staff/assets/app.js', { headers: { Authorization: 'Bearer secret' } }),
  ]

  for (const candidate of denied) {
    assert.equal(policy.shouldHandlePublicAsset(candidate, appOrigin), false, candidate.url)
  }
})

test('navigation fallback is limited to the staff scope and is never treated as an asset', () => {
  const policy = loadPolicy()

  assert.equal(policy.isStaffNavigation(request('/staff/', { mode: 'navigate' }), appOrigin), true)
  assert.equal(policy.isStaffNavigation(request('/staff/profile', { mode: 'navigate' }), appOrigin), true)
  assert.equal(policy.isStaffNavigation(request('/staff/?attendance=secret', { mode: 'navigate' }), appOrigin), true)
  assert.equal(policy.isStaffNavigation(request('/private/files/photo.png', { mode: 'navigate' }), appOrigin), false)
  assert.equal(policy.isStaffNavigation(request('/desk', { mode: 'navigate' }), appOrigin), false)
  assert.equal(policy.shouldHandlePublicAsset(request('/staff/', { mode: 'navigate' }), appOrigin), false)
})

test('only successful public responses without private cache directives may be persisted', () => {
  const policy = loadPolicy()
  const response = (overrides = {}) => ({
    ok: true,
    type: 'basic',
    headers: new Headers(),
    ...overrides,
  })

  assert.equal(policy.shouldCacheResponse(response()), true)
  assert.equal(policy.shouldCacheResponse(response({ ok: false })), false)
  assert.equal(policy.shouldCacheResponse(response({ type: 'opaque' })), false)
  assert.equal(policy.shouldCacheResponse(response({ headers: new Headers({ 'Cache-Control': 'private, max-age=60' }) })), false)
  assert.equal(policy.shouldCacheResponse(response({ headers: new Headers({ 'Cache-Control': 'no-store, no-cache' }) })), false)
})

test('worker imports the privacy policy, bumps its cache and applies guarded navigation and asset paths', () => {
  assert.match(workerSource, /importScripts\('\/staff\/sw-policy\.js'\)/)
  assert.match(workerSource, /nomad-staff-v7-public-only/)
  assert.match(workerSource, /isStaffNavigation\(request, origin\)/)
  assert.match(workerSource, /shouldHandlePublicAsset\(request, origin\)/)
  assert.match(workerSource, /shouldCacheResponse\(response\)/)
  assert.doesNotMatch(workerSource, /cache\.put\(event\.request/)
})
