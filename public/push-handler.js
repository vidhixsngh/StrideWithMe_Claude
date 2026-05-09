/* StrideWithMe — push event handler. Imported into the workbox-generated SW. */

self.addEventListener('push', (event) => {
  let payload = { title: 'StrideWithMe', body: 'Time to log today.', url: '/log' }
  if (event.data) {
    try { payload = { ...payload, ...event.data.json() } }
    catch { payload.body = event.data.text() }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'stridewithme-reminder',
      data: { url: payload.url },
      requireInteraction: false,
      vibrate: [120, 60, 120],
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data && event.notification.data.url) || '/log'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
      for (const c of cs) {
        if ('focus' in c) {
          c.navigate(targetUrl).catch(() => {})
          return c.focus()
        }
      }
      return self.clients.openWindow(targetUrl)
    })
  )
})
