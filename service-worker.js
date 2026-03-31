// SERVICE WORKER v3.4.1 — MAT Mézières Avec Toi
// Network First — mises à jour automatiques garanties
const CACHE = 'mat-v3.4.1';

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(['./index.html', './mat-header.png', './icon-192.png']))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  if (url.includes('onrender.com') || url.includes('googleapis.com') ||
      url.includes('open-meteo.com') || url.includes('facebook.com') ||
      url.includes('panneaupocket') || url.includes('github.io')) return;

  e.respondWith(
    fetch(e.request.clone())
      .then(res => {
        if (res && res.ok && e.request.method === 'GET') {
          const resClone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, resClone));
        }
        return res;
      })
      .catch(() =>
        caches.match(e.request).then(c => c || caches.match('./index.html'))
      )
  );
});

// Réception des notifications push
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : { title: 'MAT', body: 'Nouvelle publication Radio Mézières' };
  e.waitUntil(
    self.registration.showNotification(data.title || 'MAT — Mézières Avec Toi', {
      body:    data.body || '',
      icon:    './icon-192.png',
      badge:   './icon-192.png',
      vibrate: [200, 100, 200],
      data:    { url: data.url || './' }
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || './';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cls => {
      const existing = cls.find(c => c.url.includes('mairie-mezieres'));
      if (existing) {
        existing.focus();
        existing.postMessage({ action: 'openNotifs' });
      } else {
        clients.openWindow(url + '#notifs');
      }
    })
  );
});
