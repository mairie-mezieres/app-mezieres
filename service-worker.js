// SERVICE WORKER v3.7.2 — MAT Mézières Avec Toi
// Network First — mises à jour automatiques garanties
// Phase 3 : détail d'actualité depuis notification push
const CACHE = 'mat-v3.7.2';

// Fichiers critiques précachés à l'installation
const PRECACHE_URLS = [
  './index.html',
  './css/mat.css?v=3.7.2',
  './js/mat-utils.js?v=3.7.2',
  './js/mat-core.js?v=3.7.2',
  './js/mat-accessibility.js?v=3.7.2',
  './js/mat-widgets.js?v=3.7.2',
  './js/mat-agenda.js?v=3.7.2',
  './js/mat-forms.js?v=3.7.2',
  './js/mat-actus.js?v=3.7.2',
  './js/mat-trombi.js?v=3.7.2',
  './js/mat-mel.js?v=3.7.2',
  './js/mat-init.js?v=3.7.2',
  './mat-header.png',
  './icon-192.png'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c =>
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
      url.includes('raw.githubusercontent.com') ||
      url.includes('res.cloudinary.com')) return;

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

function normalizePushPayload(raw) {
  const nested = raw && raw.data && typeof raw.data === 'object' ? raw.data : {};
  const actuId = nested.actuId != null ? String(nested.actuId) : null;
  const url = nested.url || raw.url || (actuId ? `/#actu=${encodeURIComponent(actuId)}` : '/#notifs');
  const listUrl = nested.listUrl || '/#notifs';
  const open = nested.open || (actuId ? 'actu' : 'notifs');
  const actions = Array.isArray(raw.actions) && raw.actions.length ? raw.actions : (actuId ? [{ action: 'detail', title: 'Détail' }] : []);
  return {
    title: raw.title || 'MAT — Mézières Avec Toi',
    body: raw.body || '',
    icon: raw.icon || './icon-192.png',
    badge: raw.badge || './icon-192.png',
    image: raw.image || undefined,
    actions,
    tag: actuId ? `actu-${actuId}` : 'mat-notif',
    data: {
      url,
      listUrl,
      actuId,
      open
    }
  };
}

// ── Notifications Push ──
self.addEventListener('push', e => {
  const raw = e.data ? e.data.json() : { title: 'MAT', body: 'Nouvelle publication Radio Mézières' };
  const notif = normalizePushPayload(raw || {});
  e.waitUntil(
    self.registration.showNotification(notif.title, {
      body: notif.body,
      icon: notif.icon,
      badge: notif.badge,
      image: notif.image,
      vibrate: [200, 100, 200],
      actions: notif.actions,
      tag: notif.tag,
      renotify: false,
      data: notif.data
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();

  const data = e.notification.data || {};
  const wantsDetail = e.action === 'detail' || data.open === 'actu' || !e.action;
  const targetHash = wantsDetail
    ? (data.url || (data.actuId ? `/#actu=${encodeURIComponent(String(data.actuId))}` : '/#notifs'))
    : (data.listUrl || '/#notifs');

  const absoluteUrl = new URL(targetHash, self.location.origin).href;

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cls => {
      const existing = cls.find(c => c.url.startsWith(self.location.origin));
      if (existing) {
        return existing.focus().then(() => {
          try {
            existing.postMessage({ action: 'openUrl', url: targetHash });
            if (wantsDetail && data.actuId != null) {
              existing.postMessage({ action: 'openActu', actuId: String(data.actuId) });
            } else {
              existing.postMessage({ action: 'openNotifs' });
            }
          } catch (_) {}
          if ('navigate' in existing) {
            return existing.navigate(absoluteUrl).catch(() => existing);
          }
          return existing;
        });
      }
      return clients.openWindow(absoluteUrl);
    })
  );
});
