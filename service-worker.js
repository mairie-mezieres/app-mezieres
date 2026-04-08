// SERVICE WORKER v3.7.0 — MAT Mézières Avec Toi
// Network First — mises à jour automatiques garanties
// Phase 1 : précache CSS externalisé + préparation JSON externes
const CACHE = 'mat-v3.7.0';

// Fichiers locaux à précacher au démarrage
const PRECACHE_URLS = [
  './index.html',
  './css/mat.css',
  './mat-header.png',
  './icon-192.png'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c =>
      // addAll est atomique : si un fichier échoue, rien n'est caché
      // On fait un fallback par fichier pour éviter ce problème
      Promise.all(
        PRECACHE_URLS.map(url =>
          c.add(url).catch(err => console.warn('[SW] precache skipped:', url, err.message))
        )
      )
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

  // Ne pas intercepter les appels vers les APIs externes
  if (url.includes('onrender.com') || url.includes('googleapis.com') ||
      url.includes('open-meteo.com') || url.includes('facebook.com') ||
      url.includes('panneaupocket') || url.includes('api-adresse.data.gouv.fr') ||
      url.includes('apicarto.ign.fr') || url.includes('overpass-api')) return;

  // Ne pas intercepter les requêtes non-GET
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request.clone())
      .then(res => {
        if (res && res.ok) {
          const resClone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, resClone));
        }
        return res;
      })
      .catch(() =>
        caches.match(e.request).then(c => {
          if (c) return c;
          // Fallback HTML uniquement pour les requêtes de navigation
          if (e.request.mode === 'navigate') return caches.match('./index.html');
          return new Response('', { status: 504, statusText: 'Offline' });
        })
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
