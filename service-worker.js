// SERVICE WORKER v4.0.3 — MAT Mézières Avec Toi
// Network First — mises à jour automatiques garanties
const CACHE = 'mat-v4.0.3';

const PRECACHE_URLS = [
  './index.html',
  './css/mat.css?v=3.7.4',
  './css/mat-desktop.css?v=4.0.2',
  './js/mat-utils.js?v=3.7.4',
  './js/mat-core.js?v=4.0.0',
  './js/mat-accessibility.js?v=3.7.4',
  './js/mat-widgets.js?v=3.7.4',
  './js/mat-agenda.js?v=3.7.4',
  './js/mat-forms.js?v=4.0.0',
  './js/mat-actus.js?v=4.0.1',
  './js/mat-trombi.js?v=3.7.4',
  './js/mat-mel.js?v=4.0.3',
  './js/mat-boot.js?v=4.0.1',
  './js/mat-pwa-notif.js?v=3.7.5',
  './js/mat-dechets-notif.js?v=4.0.0',
  './js/mat-jours-feries.js?v=4.0.1',
  './js/mat-sondages.js?v=4.0.1',
  './js/mat-associations.js?v=4.0.3',
  './js/mat-desktop.js?v=4.0.2',
  './js/mat-eau8.js?v=3.8.9',
  './data/plu-data.json?v=3.7.4',
  './data/mel-tree.json?v=3.7.4',
  './mat-header.png',
  './icon-192.png'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(PRECACHE_URLS.map(url => c.add(url).catch(err => console.warn('[SW] precache skip:', url, err.message))))));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  if (url.includes('onrender.com') || url.includes('googleapis.com') || url.includes('open-meteo.com') || url.includes('facebook.com') || url.includes('panneaupocket') || url.includes('api-adresse.data.gouv.fr') || url.includes('apicarto.ign.fr') || url.includes('geoportail-urbanisme') || url.includes('raw.githubusercontent.com') || url.includes('res.cloudinary.com') || url.includes('data.education.gouv.fr')) return;
  e.respondWith(fetch(e.request.clone()).then(res => { if (res && res.ok && e.request.method === 'GET') { caches.open(CACHE).then(c => c.put(e.request, res.clone())); } return res; }).catch(() => caches.match(e.request).then(c => c || caches.match('./index.html'))));
});
