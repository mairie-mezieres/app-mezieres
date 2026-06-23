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
// J7   : notificationclick via notif.html (query string) — corrige l'atterrissage
//         sur la page d'accueil Firefox au lieu de l'app après clic sur notif.
const CACHE = 'mat-v4.39.5';

// ⚙️ Adresse du backend MAT. Le service worker ne peut pas lire js/mat-config.js
// (contexte worker, pas de window) : il garde sa propre copie. RÉPLICATION :
// gardez cette valeur synchronisée avec window.MAT_API dans js/mat-config.js.
const MAT_API = 'https://chatbot-mairie-mezieres.onrender.com';

// Sous-ensemble de PRECACHE_URLS pour lequel un échec lors de install
// doit faire échouer l'install entière. Tout le reste est best-effort.
const CRITICAL_PRECACHE = [
  './index.html',
  './offline.html',
  './css/mat.css?v=4.3.7',
  './js/mat-config.js?v=1',
  './js/mat-utils.js?v=4.3.2',
  './js/mat-core.js?v=4.2.18'
];

// Fichiers critiques précachés à l'installation
const PRECACHE_URLS = [
  './index.html',
  './offline.html',
  './css/mat.css?v=4.3.7',
  './css/mat-desktop.css?v=4.2.9',
  './css/fonts.css?v=1',
  './js/mat-config.js?v=1',
  './js/mat-utils.js?v=4.3.2',
  './js/mat-core.js?v=4.2.18',
  './js/mat-accessibility.js?v=4.3.8',
  './js/mat-widgets.js?v=4.4.4',
  './js/mat-agenda.js?v=4.3.3',
  './js/mat-forms.js?v=4.6.1',
  './js/mat-photos.js?v=1.3.3',
  './js/mat-actus.js?v=4.4.5',
  './js/mat-trombi.js?v=4.2.7',
  './js/mat-mel.js?v=4.3.4',
  './js/mat-boot.js?v=4.3.3',
  './js/mat-pwa-notif.js?v=4.2.5',
  './js/mat-dechets-notif.js?v=4.2.7',
  './js/mat-jours-feries.js?v=4.2.3',
  './js/mat-sondages.js?v=4.3.1',
  './js/mat-associations.js?v=4.2.3',
  './js/mat-desktop.js?v=4.1.4',
  './js/mat-eau8.js?v=4.2.8',
  './js/mat-entreprises.js?v=1.2.1',
  './data/plu-data.json?v=4.2.3',
  './data/mel-tree.json?v=4.2.3',
  './img/mat-header.webp',
  './img/MAT et MEL.webp',
  './notif.html',
  './icon-192.png',
  './icon-badge.png'
];

self.addEventListener('install', e => {
  // J4.c — skipWaiting() rétabli : activation immédiate sans action utilisateur.
  // Nécessaire pour que les correctifs push (dechets boot sync) soient déployés
  // sans intervention manuelle (réabonnement automatique endpoint rotation).
  self.skipWaiting();
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
    url.startsWith(MAT_API) ||
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

  // Web Share Target API — partage OS (photo depuis galerie → signalement MAT)
  if (e.request.method === 'POST' && new URL(e.request.url).pathname.endsWith('/share-target')) {
    e.respondWith((async () => {
      try {
        const fd = await e.request.formData();
        const text = (fd.get('text') || fd.get('title') || '').trim();
        const media = fd.get('media');
        const params = new URLSearchParams({ 'share-open': '1' });
        if (text) params.set('share-text', text);
        if (media && media.size > 0) {
          const shareCache = await caches.open('mat-share-v1');
          await shareCache.put('./share-image', new Response(await media.arrayBuffer(), {
            headers: { 'Content-Type': media.type || 'image/jpeg' }
          }));
          params.set('share-media', '1');
        }
        return Response.redirect('./?' + params.toString(), 303);
      } catch (_) {
        return Response.redirect('./', 303);
      }
    })());
    return;
  }

  // Hors-GET : laisser passer sans interception (POST same-origin éventuels)
  if (e.request.method !== 'GET') return;

  // Stale-while-revalidate : on sert la version en cache immédiatement (chargement
  // quasi instantané pour les visites récurrentes) et on rafraîchit le cache en
  // arrière-plan. Les assets JS/CSS étant versionnés (?v=), un changement = nouvelle
  // URL = cache miss = re-téléchargement → aucun risque de servir du périmé pour eux.
  // index.html (non versionné) peut n'être à jour qu'au lancement suivant : le prompt
  // de mise à jour du SW (skipWaiting) couvre déjà ce cas.
  e.respondWith((async () => {
    const cached = await caches.match(e.request);

    const network = fetch(e.request.clone())
      .then(res => {
        if (res && res.ok && res.status !== 206) {
          const resClone = res.clone();
          caches.open(CACHE).then(c => {
            c.put(e.request, resClone);
            trimCacheSoft(c);
          });
        }
        return res;
      })
      .catch(() => null);

    if (cached) {
      e.waitUntil(network); // rafraîchissement en arrière-plan, sans bloquer la réponse
      return cached;
    }

    const fresh = await network;
    if (fresh) return fresh;
    if (e.request.mode === 'navigate') return (await caches.match('./offline.html')) || Response.error();
    return Response.error();
  })());
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
  const actuId = data.actuId != null ? String(data.actuId) : null;

  // URL de landing : query string > fragment pour openWindow() — les fragments
  // sont parfois ignorés ou provoquent l'ouverture d'un onglet vide sur Firefox Android.
  const params = new URLSearchParams({ open: openType });
  if (actuId) params.set('actuId', actuId);
  const landingUrl = new URL('./notif.html?' + params.toString(), self.registration.scope).href;

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async cls => {
      const existing = cls.find(c => c.url.startsWith(self.registration.scope));

      if (existing) {
        // L'app est déjà ouverte : focus + postMessage pour ouvrir le bon overlay
        // sans recharger la page (navigate() vers notif.html provoquerait un rechargement).
        try { await existing.focus(); } catch (_) {}
        try {
          if (openType === 'meteo') existing.postMessage({ action: 'openMeteo' });
          else if (openType === 'idees') existing.postMessage({ action: 'openIdees' });
          else if (openType === 'signalements') existing.postMessage({ action: 'openSignalements' });
          else if (openType === 'contact') existing.postMessage({ action: 'openContact' });
          else if (openType === 'actu' && actuId != null) existing.postMessage({ action: 'openActu', actuId });
          else existing.postMessage({ action: 'openNotifs' });
        } catch (_) {}
        return;
      }

      // L'app n'est pas ouverte : ouvrir notif.html qui redirige vers index.html#hash.
      return clients.openWindow(landingUrl);
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
      await fetch(MAT_API + '/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
        keepalive: true
      });
    } catch (_) {}

    // Re-sync canaux spécifiques depuis les préférences stockées par le client.
    // Nécessaire car la rotation d'endpoint vide silencieusement les listes
    // mat:subs:dechets / mat:subs:meteo si seul /push/subscribe est rappelé.
    try {
      const prefsCache = await caches.open('mat-config-v1');
      const prefsResp  = await prefsCache.match('mat-push-prefs');
      if (prefsResp) {
        const prefs = await prefsResp.json();
        const subJson = JSON.parse(JSON.stringify(sub));
        if (prefs.dechets) {
          fetch(MAT_API + '/push/subscribe/dechets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subJson),
            keepalive: true
          }).catch(() => {});
        }
        if (prefs.meteo) {
          const subM = Object.assign({}, subJson, { minLevel: prefs.meteoLevel || 2 });
          fetch(MAT_API + '/push/subscribe/meteo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subM),
            keepalive: true
          }).catch(() => {});
        }
      }
    } catch (_) {}
  })());
});
