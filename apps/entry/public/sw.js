const CACHE_NAME='nomad-vip-entry-v19-indigo'
const APP_SHELL=['./','./manifest.webmanifest','./icon-192.png','./icon-512.png','./nomad-logo-transparent.png','./nomad-obsidian-atmosphere.png']

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()))
})

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))
})

self.addEventListener('fetch',event=>{
  const request=event.request
  if(request.method!=='GET')return
  const url=new URL(request.url)
  if(url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname.startsWith('/vip-entry-api/'))return
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).then(response=>{
      const copy=response.clone()
      caches.open(CACHE_NAME).then(cache=>cache.put(request,copy))
      return response
    }).catch(()=>caches.match(request).then(response=>response||caches.match('./'))))
    return
  }
  event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{
    if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy))}
    return response
  })))
})

self.addEventListener('notificationclick',event=>{
  event.notification.close()
  const entry=event.notification.data&&event.notification.data.entry
  const targetUrl=entry?`${self.registration.scope}?entry=${encodeURIComponent(entry)}`:self.registration.scope
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(windows=>{
    const target=windows.find(client=>client.url.startsWith(self.registration.scope))
    if(target){
      if(entry)target.postMessage({type:'OPEN_ENTRY_NOTIFICATION',entry})
      return target.focus()
    }
    return self.clients.openWindow(targetUrl)
  }))
})
