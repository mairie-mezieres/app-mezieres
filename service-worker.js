// SERVICE WORKER v3.7.1 — MAT Mézières Avec Toi
// Network First — mises à jour automatiques garanties
// Phase 2 : CSS externalisé + JS modulaire (10 fichiers)
const CACHE = 'mat-v3.7.1';

// Fichiers critiques précachés à l'installation
const PRECACHE_URLS = [
  './index.html',
  './css/mat.css?v=3.7.1',
  './js/mat-utils.js?v=3.7.1',
  './js/mat-core.js?v=3.7.1',
  './js/mat-accessibility.js?v=3.7.1',
  './js/mat-widgets.js?v=3.7.1',
  './js/mat-agenda.js?v=3.7.1',
  './js/mat-forms.js?v=3.7.1',
  './js/mat-actus.js?v=3.7.1',
  './js/mat-trombi.js?v=3.7.1',
  './js/mat-mel.js?v=3.7.1',
  './js/mat-init.js?v=3.7.1',
  './mat-header.png',
  './icon-192.png'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c =>
      // addAll est atomique : si 1 échoue, tout plante. On fait du add individuel.
      Promise.all(PRECACHE_URLS.map(url =>
        c.add(url).catch(err => {
          console.warn('[SW] precache skip:', url, err.message);
        })
      ))
    )
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

  // Ne JAMAIS cacher les API backend et services externes
  if (url.includes('onrender.com') ||
      url.includes('googleapis.com') ||
      url.includes('open-meteo.com') ||
      url.includes('facebook.com') ||
      url.includes('panneaupocket') ||
      url.includes('api-adresse.data.gouv.fr') ||
      url.includes('geoportail-urbanisme') ||
      url.includes('raw.githubusercontent.com')) return;

  // Network First pour tout le reste (HTML, CSS, JS, images locales)
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

// ── Notifications Push ──
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
