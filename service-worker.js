// SERVICE WORKER v4.2.2 — MAT Mézières Avec Toi
// Network First — mises à jour automatiques garanties
// Phase 9 : nav PC accessible (hauteur + police agrandie), Trello sans double-notif
const CACHE = 'mat-v4.2.2';

// Fichiers critiques précachés à l'installation
const PRECACHE_URLS = [
  './index.html',
  './offline.html',
  './css/mat.css?v=4.2.2',
  './css/mat-desktop.css?v=4.2.2',
  './js/mat-utils.js?v=4.2.2',
  './js/mat-core.js?v=4.2.2',
  './js/mat-accessibility.js?v=4.2.2',
  './js/mat-widgets.js?v=4.2.2',
  './js/mat-agenda.js?v=4.2.2',
  './js/mat-forms.js?v=4.2.2',
  './js/mat-actus.js?v=4.2.2',
  './js/mat-trombi.js?v=4.2.2',
  './js/mat-mel.js?v=4.2.2',
  './js/mat-boot.js?v=4.2.2',
  './js/mat-pwa-notif.js?v=4.2.2',
  './js/mat-dechets-notif.js?v=4.2.2',
  './js/mat-jours-feries.js?v=4.2.2',
  './js/mat-sondages.js?v=4.2.2',
  './js/mat-associations.js?v=4.2.2',
  './js/mat-desktop.js?v=4.2.2',
  './js/mat-eau8.js?v=4.2.2',
  './data/plu-data.json?v=4.2.2',
  './data/mel-tree.json?v=4.2.2',
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
  if (
    url.includes('onrender.com') ||
    url.includes('googleapis.com') ||
    url.includes('open-meteo.com') ||
    url.includes('facebook.com') ||
    url.includes('panneaupocket') ||
    url.includes('api-adresse.data.gouv.fr') ||
    url.includes('apicarto.ign.fr') ||
    url.includes('data.geopf.fr') ||
    url.includes('cadastre.data.gouv.fr') ||
    url.includes('geoportail-urbanisme') ||
    url.includes('raw.githubusercontent.com') ||
    url.includes('res.cloudinary.com') ||
    url.includes('data.education.gouv.fr')
  ) return;

  e.respondWith(
    fetch(e.request.clone())
      .then(res => {
        if (res && res.ok && res.status !== 206 && e.request.method === 'GET') {
          const resClone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, resClone));
        }
        return res;
      })
      .catch(() =>
        caches.match(e.request).then(c => c || (e.request.mode==='navigate'?caches.match('./offline.html'):null))
      )
  );
});

function normalizeInAppPath(input, fallback) {
  const raw = String(input || '').trim();
  const fb = fallback || './#notifs';

  if (!raw) return fb;

  if (raw.startsWith('./#')) return raw;
  if (raw.startsWith('/#')) return `.${raw}`;
  if (raw.startsWith('#')) return `./${raw}`;

  try {
    const u = new URL(raw, self.location.origin);
    if (u.origin === self.location.origin && u.hash) {
      return `./${u.hash}`;
    }
  } catch (_) {}

  return fb;
}

function normalizePushPayload(raw) {
  const nested = raw && raw.data && typeof raw.data === 'object' ? raw.data : {};
  const actuId = nested.actuId != null ? String(nested.actuId) : null;

  const url = normalizeInAppPath(
    nested.url || raw.url,
    actuId ? `./#actu=${encodeURIComponent(actuId)}` : './#notifs'
  );

  const listUrl = normalizeInAppPath(
    nested.listUrl,
    './#notifs'
  );

  const open = nested.open || (actuId ? 'actu' : 'notifs');
  const actions = Array.isArray(raw.actions) && raw.actions.length
    ? raw.actions
    : (actuId ? [{ action: 'detail', title: 'Détail' }] : []);

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

  e.waitUntil((async () => {
    await self.registration.showNotification(notif.title, {
      body: notif.body,
      icon: notif.icon,
      badge: notif.badge,
      image: notif.image,
      vibrate: [200, 100, 200],
      actions: notif.actions,
      tag: notif.tag,
      renotify: false,
      data: notif.data
    });

    try {
      if (self.navigator && 'setAppBadge' in self.navigator) {
        await self.navigator.setAppBadge();
      }
    } catch (_) {}
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();

  const data = e.notification.data || {};
  const wantsDetail = e.action === 'detail' || data.open === 'actu' || !e.action;

  const targetUrl = wantsDetail
    ? new URL(
        normalizeInAppPath(
          data.url,
          data.actuId != null
            ? `./#actu=${encodeURIComponent(String(data.actuId))}`
            : './#notifs'
        ),
        self.registration.scope
      ).href
    : new URL(
        normalizeInAppPath(data.listUrl, './#notifs'),
        self.registration.scope
      ).href;

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async cls => {
      const existing = cls.find(c => c.url.startsWith(self.registration.scope));

      if (existing) {
        await existing.focus();

        try {
          if (wantsDetail && data.actuId != null) {
            existing.postMessage({ action: 'openActu', actuId: String(data.actuId) });
          } else {
            existing.postMessage({ action: 'openNotifs' });
          }
        } catch (_) {}

        return existing;
      }

      return clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('message', e => {
  if (!e.data) return;

  if (e.data === 'clearBadge' || (typeof e.data === 'object' && e.data.action === 'clearBadge')) {
    e.waitUntil((async () => {
      try {
        if (self.navigator && 'clearAppBadge' in self.navigator) {
          await self.navigator.clearAppBadge();
        }
      } catch (_) {}
    })());
  }
});
