(function attachNomadStaffCachePolicy(scope) {
  'use strict'

  const STAFF_SCOPE = '/staff/'
  const PUBLIC_ASSET_PREFIXES = [
    '/staff/assets/',
    '/staff/branch-logos/',
  ]
  const PUBLIC_ASSET_PATHS = new Set([
    '/staff/manifest.webmanifest',
    '/staff/icon-192.png',
    '/staff/icon-512.png',
    '/staff/icons.svg',
    '/staff/favicon.svg',
    '/staff/nomad-logo-transparent.png',
    '/staff/sw-policy.js',
  ])
  const SENSITIVE_PATH_PREFIXES = [
    '/staff-api',
    '/api',
    '/private',
    '/files',
  ]

  function requestUrl(request, origin) {
    return new URL(request.url, origin)
  }

  function isSameOrigin(url, origin) {
    return url.origin === origin
  }

  function isSensitivePath(pathname) {
    return SENSITIVE_PATH_PREFIXES.some((prefix) => (
      pathname === prefix || pathname.startsWith(`${prefix}/`)
    ))
  }

  function hasAuthorizationHeader(request) {
    return Boolean(request.headers && request.headers.get('authorization'))
  }

  function isPublicAssetPath(pathname) {
    return PUBLIC_ASSET_PATHS.has(pathname)
      || PUBLIC_ASSET_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  }

  function shouldHandlePublicAsset(request, origin) {
    if (!request || request.method !== 'GET') return false
    const url = requestUrl(request, origin)
    if (!isSameOrigin(url, origin)) return false
    if (isSensitivePath(url.pathname)) return false
    if (url.search) return false
    if (hasAuthorizationHeader(request)) return false
    return isPublicAssetPath(url.pathname)
  }

  function isStaffNavigation(request, origin) {
    if (!request || request.method !== 'GET' || request.mode !== 'navigate') return false
    const url = requestUrl(request, origin)
    return isSameOrigin(url, origin)
      && !isSensitivePath(url.pathname)
      && (url.pathname === '/staff' || url.pathname.startsWith(STAFF_SCOPE))
  }

  function shouldCacheResponse(response) {
    if (!response || !response.ok) return false
    if (response.type && response.type !== 'basic' && response.type !== 'default') return false
    const cacheControl = response.headers && response.headers.get('cache-control')
    return !cacheControl || !/(?:^|,)\s*(?:no-store|private)(?:\s|,|=|$)/i.test(cacheControl)
  }

  scope.NomadStaffCachePolicy = Object.freeze({
    STAFF_SCOPE,
    PUBLIC_ASSET_PATHS,
    PUBLIC_ASSET_PREFIXES,
    SENSITIVE_PATH_PREFIXES,
    isSensitivePath,
    isPublicAssetPath,
    shouldHandlePublicAsset,
    isStaffNavigation,
    shouldCacheResponse,
  })
})(self)
