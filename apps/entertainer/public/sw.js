importScripts('/staff/sw-policy.js')

const CACHE = 'nomad-staff-v7-public-only'
const CACHE_PREFIX = 'nomad-staff-'
const SHELL_URL = '/staff/'
const SHELL = [
  SHELL_URL,
  '/staff/manifest.webmanifest',
  '/staff/icon-192.png',
  '/staff/icon-512.png',
  '/staff/dhd-logo.png',
  '/staff/dhd-startup.wav',
  '/staff/sw-policy.js',
]
const {
  shouldHandlePublicAsset,
  isStaffNavigation,
  shouldCacheResponse,
} = self.NomadStaffCachePolicy

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const origin = self.location.origin

  if (isStaffNavigation(request, origin)) {
    event.respondWith(
      fetch(request).catch(() => caches.match(SHELL_URL)),
    )
    return
  }

  if (!shouldHandlePublicAsset(request, origin)) return

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        if (!shouldCacheResponse(response)) return response
        const copy = response.clone()
        event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)))
        return response
      })
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = event.notification.data?.url || '/staff/?view=notifications'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const existing = windows.find((client) => new URL(client.url).origin === self.location.origin)
      if (existing) return existing.navigate(target).then((client) => client.focus())
      return self.clients.openWindow(target)
    }),
  )
})
