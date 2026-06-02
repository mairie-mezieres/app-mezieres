// SERVICE WORKER v4.7.0 — MAT Mézières Avec Toi - Site WEB officiel
// Copyright (c) 2024-2026 Commune de Mézières-lez-Cléry — Licence MIT
// Network First
// J4.a : install échoue si un fichier critique manque (l'ancienne version
//         reste alors active, plutôt que d'installer un cache cassé).
// J4.b : skipWaiting() déclenché uniquement sur postMessage('SKIP_WAITING')
//         côté PWA après confirmation utilisateur (cf. mat-core.js).
// J5.d : retrait de la ligne url.includes('panneaupocket') morte.
// J6   : bump suite à C10 — validation URL avant innerHTML href côté
//         frontend (safeHref dans mat-utils.js).
const CACHE = 'mat-v4.17.4';

// Sous-ensemble de PRECACHE_URLS pour lequel un échec lors de install
// doit faire échouer l'install entière. Tout le reste est best-effort.
const CRITICAL_PRECACHE = [
  './index.html',
  './offline.html',
  './css/mat.css?v=4.3.5',
  './js/mat-utils.js?v=4.2.9',
  './js/mat-core.js?v=4.2.14'
];

// Fichiers critiques précachés à l'installation
const PRECACHE_URLS = [
  './index.html',
  './offline.html',
  './css/mat.css?v=4.3.5',
  './css/mat-desktop.css?v=4.2.5',
  './css/fonts.css?v=1',
  './js/mat-utils.js?v=4.2.9',
  './js/mat-core.js?v=4.2.14',
  './js/mat-accessibility.js?v=4.3.7',
  './js/mat-widgets.js?v=4.4.0',
  './js/mat-agenda.js?v=4.2.4',
  './js/mat-forms.js?v=4.3.2',
  './js/mat-actus.js?v=4.3.4',
  './js/mat-trombi.js?v=4.2.6',
  './js/mat-mel.js?v=4.3.2',
  './js/mat-boot.js?v=4.2.5',
  './js/mat-pwa-notif.js?v=4.2.4',
  './js/mat-dechets-notif.js?v=4.2.5',
  './js/mat-jours-feries.js?v=4.2.3',
  './js/mat-sondages.js?v=4.2.3',
  './js/mat-associations.js?v=4.2.3',
  './js/mat-desktop.js?v=4.1.0',
  './js/mat-eau8.js?v=4.2.5',
  './js/mat-entreprises.js?v=1.2.0',
  './data/plu-data.json?v=4.2.3',
  './data/mel-tree.json?v=4.2.3',
  './img/mat-header.webp',
  './img/MAT et MEL.webp',
  './icon-192.png',
  './icon-badge.png'
];

self.addEventListener('install', e => {
  // J4.b — skipWaiting() retiré : la nouvelle version reste en 'waiting'
  // tant que la PWA n'a pas envoyé postMessage('SKIP_WAITING') après
  // confirmation utilisateur. Cf. listener 'message' plus bas.
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    const results = await Promise.allSettled(PRECACHE_URLS.map(url => c.add(url)));
    const failed = [];
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        const url = PRECACHE_URLS[i];
        console.warn('[SW] precache skip:', url, r.reason && r.reason.message);
        if (CRITICAL_PRECACHE.includes(url)) failed.push(url);
      }
    });
    if (failed.length) {
      // L'install échoue → l'ancienne version reste active, l'utilisateur
      // garde une app fonctionnelle (vs. un cache nouveau mais cassé).
      throw new Error('[SW] precache critique échoué: ' + failed.join(', '));
    }
  })());
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
    url.includes('clearbit.com') ||
    url.includes('google.com') ||
    url.includes('open-meteo.com') ||
    url.includes('facebook.com') ||
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
          caches.open(CACHE).then(c => {
            c.put(e.request, resClone);
            trimCacheSoft(c);
          });
        }
        return res;
      })
      .catch(() =>
        caches.match(e.request).then(c => {
          if (c) return c;
          if (e.request.mode === 'navigate') return caches.match('./offline.html');
          return Promise.reject(new TypeError('not cached'));
        })
      )
  );
});

// LRU douce sur le cache runtime : si on dépasse MAX_CACHE_ENTRIES, on
// supprime les entrées les plus anciennes (FIFO via cache.keys()) jusqu'à
// retomber sous le seuil. Pas d'await dans le caller : la purge est
// best-effort et silencieuse. Évite la croissance illimitée du cache
// (qui peut faire éjecter brutalement tout le storage par le navigateur
// sous pression mémoire).
// Les URLs de PRECACHE_URLS (app shell + offline.html) sont protégées
// de l'éviction — sinon la navigation offline finirait par échouer une
// fois la file FIFO ayant rattrapé les entrées précachées à l'install.
const MAX_CACHE_ENTRIES = 250;
const _PRECACHE_SET = new Set(PRECACHE_URLS.map(u => new URL(u, self.location.href).href));
let _trimming = false;
async function trimCacheSoft(c) {
  if (_trimming) return;
  _trimming = true;
  try {
    const keys = await c.keys();
    if (keys.length > MAX_CACHE_ENTRIES) {
      const evictable = keys.filter(req => !_PRECACHE_SET.has(req.url));
      const excess = keys.length - MAX_CACHE_ENTRIES;
      const toDelete = Math.min(excess, evictable.length);
      for (let i = 0; i < toDelete; i++) await c.delete(evictable[i]);
    }
  } catch (_) {}
  _trimming = false;
}

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

  // Calculer open en premier pour en déduire l'URL par défaut correcte.
  // open peut valoir: 'actu', 'notifs', 'meteo', 'idees', 'signalements', 'contact'
  const open = nested.open || (actuId ? 'actu' : 'notifs');

  let defaultUrl;
  if (actuId)                    defaultUrl = `./#actu=${encodeURIComponent(actuId)}`;
  else if (open === 'meteo')     defaultUrl = './#meteo';
  else if (open === 'idees')     defaultUrl = './#idees';
  else if (open === 'signalements') defaultUrl = './#signalements';
  else if (open === 'contact')   defaultUrl = './#contact';
  else                           defaultUrl = './#notifs';

  const url = normalizeInAppPath(nested.url || raw.url, defaultUrl);

  const listUrl = normalizeInAppPath(
    nested.listUrl,
    './#notifs'
  );
  const actions = Array.isArray(raw.actions) && raw.actions.length
    ? raw.actions
    : (actuId ? [{ action: 'detail', title: 'Détail' }] : []);

  return {
    title: raw.title || 'MAT — Mézières Avec Toi',
    body: raw.body || '',
    icon: raw.icon || './icon-192.png',
    badge: raw.badge || './icon-badge.png',
    image: raw.image || undefined,
    actions,
    tag: raw.tag || (actuId ? `actu-${actuId}` : 'mat-notif'),
    renotify: raw.renotify !== undefined ? !!raw.renotify : false,
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
      renotify: notif.renotify,
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
  const openType = data.open || 'notifs';

  // Construire l'URL cible selon le type
  let fallbackHash;
  if (openType === 'meteo') fallbackHash = './#meteo';
  else if (openType === 'idees') fallbackHash = './#idees';
  else if (openType === 'signalements') fallbackHash = './#signalements';
  else if (openType === 'contact') fallbackHash = './#contact';
  else if (openType === 'actu' && data.actuId != null) fallbackHash = `./#actu=${encodeURIComponent(String(data.actuId))}`;
  else fallbackHash = './#notifs';

  const targetUrl = new URL(
    normalizeInAppPath(data.url || fallbackHash, fallbackHash),
    self.registration.scope
  ).href;

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async cls => {
      const existing = cls.find(c => c.url.startsWith(self.registration.scope));

      if (existing) {
        try { await existing.focus(); } catch (_) {}
        // navigate() est plus fiable que postMessage depuis un écran verrouillé
        // (l'app suspendue peut ne pas répondre au postMessage immédiatement).
        try {
          await existing.navigate(targetUrl);
          return;
        } catch (_) {}
        // Fallback postMessage si navigate() n'est pas supporté
        try {
          if (openType === 'meteo') existing.postMessage({ action: 'openMeteo' });
          else if (openType === 'idees') existing.postMessage({ action: 'openIdees' });
          else if (openType === 'signalements') existing.postMessage({ action: 'openSignalements' });
          else if (openType === 'contact') existing.postMessage({ action: 'openContact' });
          else if (openType === 'actu' && data.actuId != null) existing.postMessage({ action: 'openActu', actuId: String(data.actuId) });
          else existing.postMessage({ action: 'openNotifs' });
        } catch (_) {}
        return;
      }

      return clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('message', e => {
  if (!e.data) return;

  // J4.b — La PWA déclenche le passage à la nouvelle version après que
  // l'utilisateur a confirmé via le prompt 'Mise à jour disponible'.
  if (e.data === 'SKIP_WAITING' || (typeof e.data === 'object' && e.data.action === 'SKIP_WAITING')) {
    self.skipWaiting();
    return;
  }

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

function _urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

// Rotation de subscription par le navigateur : re-synchronise avec le backend.
// Fonctionne même quand aucun onglet n'est ouvert (cas le plus fréquent).
self.addEventListener('pushsubscriptionchange', e => {
  e.waitUntil((async () => {
    let sub = e.newSubscription;

    if (!sub) {
      // Relire la clé VAPID stockée par le client dans le Cache API
      try {
        const cache = await caches.open('mat-config-v1');
        const resp  = await cache.match('mat-vapid-public-key');
        if (resp) {
          const vapidKey = await resp.text();
          sub = await self.registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: _urlBase64ToUint8Array(vapidKey)
          });
        }
      } catch (_) {}
    }

    if (!sub) return; // impossible de se ré-abonner sans clé VAPID

    try {
      await fetch('https://chatbot-mairie-mezieres.onrender.com/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
        keepalive: true
      });
    } catch (_) {}
  })());
});
