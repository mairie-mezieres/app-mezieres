const { test, expect } = require('@playwright/test');

// Régression du bug d'un jour corrigé en v4.47.1 (ADR-0007).
//
// ⚠️ Deux points volontaires dans ce fichier, à ne pas « simplifier » :
//
// 1. La charge utile reproduit la VRAIE forme de la réponse backend, où
//    `daily[0]` est **HIER** (Open-Meteo est interrogé avec `past_days=1`).
//    Les vérifications initiales de la fonctionnalité injectaient un `daily`
//    d'un seul élément valant aujourd'hui : elles validaient l'erreur au lieu
//    de la détecter. Les heures d'hier et d'aujourd'hui diffèrent ici de
//    2 minutes, comme dans la réalité — un jeu de données où les deux jours
//    seraient identiques ne prouverait rien.
//
// 2. L'horloge est fixée en **heure de Paris explicite** (`+02:00` en juillet).
//    Sans cela, l'horloge suit le fuseau de la machine de test (UTC en CI), et
//    « 23h30 » devient 01h30 à Paris — le test passe alors à côté du sujet.

const EXTERNAL_HOSTS = [
  'chatbot-mairie-mezieres.onrender.com', 'open-meteo.com', 'tile.openstreetmap',
  'data.education.gouv.fr', 'ingest.de.sentry.io', 'sentry.io',
];

const TODAY = '2026-07-29';
const YESTERDAY = '2026-07-28';
const PARIS_OFFSET = '+02:00'; // juillet = CEST

const PAYLOAD = (weatherCode) => ({
  forecast: {
    current: { weather_code: weatherCode },
    daily: {
      time:    [YESTERDAY, TODAY],
      sunrise: [`${YESTERDAY}T06:30`, `${TODAY}T06:32`],
      sunset:  [`${YESTERDAY}T21:38`, `${TODAY}T21:36`],
    },
  },
});

async function ambianceAt(page, parisTime, weatherCode) {
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (EXTERNAL_HOSTS.some((h) => url.includes(h))) return route.abort();
    return route.continue();
  });
  await page.addInitScript(() => {
    try { localStorage.setItem('mat_onboarded_v3', '1'); } catch (_) {}
  });
  await page.clock.setFixedTime(new Date(`${TODAY}T${parisTime}:00${PARIS_OFFSET}`));
  await page.goto('/');
  await page.waitForFunction(() => typeof window.matHeaderAmbiance === 'function');
  await page.evaluate((data) => { window._meteoData = data; matHeaderAmbiance(); }, PAYLOAD(weatherCode));

  return page.evaluate(() => {
    const layer = document.querySelector('.header-amb');
    const cls = document.querySelector('.header').className;
    return {
      particules: layer ? layer.dataset.kind : '',
      sunny: /\bamb-sunny\b/.test(cls),
      night: /\bamb-night\b/.test(cls),
      dusk: /\bamb-dusk\b/.test(cls),
    };
  });
}

test('ciel dégagé en plein jour → soleil, jamais étoiles', async ({ page }) => {
  const r = await ambianceAt(page, '09:30', 0);
  expect(r.particules).toBe('sun');
  expect(r.sunny).toBe(true);
  expect(r.night).toBe(false);
});

// Le cœur de la régression : à 15h, lire `daily[0]` (hier) donnerait « nuit »
// car l'heure courante dépasse le coucher de la veille.
test('la phase suit le jour courant, pas daily[0] qui est la veille', async ({ page }) => {
  const r = await ambianceAt(page, '15:00', 1);
  expect(r.particules).toBe('sun');
  expect(r.night).toBe(false);
});

test('ciel dégagé la nuit → étoiles', async ({ page }) => {
  const r = await ambianceAt(page, '23:30', 0);
  expect(r.particules).toBe('stars');
  expect(r.night).toBe(true);
  expect(r.sunny).toBe(false);
});

// Le bandeau restait vide ~80 min autour du coucher — l'heure la plus consultée.
test('crépuscule → teinte dorée ET premières étoiles', async ({ page }) => {
  // 21h20, soit 16 min avant le coucher du jour (21h36) → fenêtre ±40 min
  const r = await ambianceAt(page, '21:20', 0);
  expect(r.dusk).toBe(true);
  expect(r.particules).toBe('stars-dim');
  expect(r.sunny).toBe(false);
});

test('aube → dernières étoiles, jamais le soleil', async ({ page }) => {
  const r = await ambianceAt(page, '06:10', 0); // lever 06h32 → fenêtre aube
  expect(r.particules).toBe('stars-dim');
  expect(r.sunny).toBe(false);
});

test('météo active prioritaire sur le ciel dégagé (non-régression nuages)', async ({ page }) => {
  const r = await ambianceAt(page, '15:00', 3);
  expect(r.particules).toBe('overcast');
  expect(r.sunny).toBe(false);
});

// Pas d'étoiles sous les nuages : la météo réelle l'emporte toujours, même la nuit.
test('pluie la nuit → gouttes seules, aucune étoile', async ({ page }) => {
  const r = await ambianceAt(page, '23:30', 61);
  expect(r.particules).toBe('rain');
  expect(r.night).toBe(true);
});

test('orage la nuit → éclairs seuls', async ({ page }) => {
  const r = await ambianceAt(page, '23:30', 95);
  expect(r.particules).toBe('storm');
});

// Les heures d'Open-Meteo sont des heures locales SANS fuseau : les comparer
// avec `Date.parse` les interpréterait dans le fuseau de l'appareil. Un habitant
// en voyage verrait alors la mauvaise phase. On ancre tout sur Paris.
test.describe('appareil dans un autre fuseau horaire', () => {
  test.use({ timezoneId: 'America/New_York' });

  test('la phase reste calée sur Paris', async ({ page }) => {
    // 15h00 à Paris = 9h00 à New York : plein jour dans les deux cas, mais
    // seul l'ancrage Paris donne la bonne comparaison lever/coucher.
    const jour = await ambianceAt(page, '15:00', 0);
    expect(jour.particules).toBe('sun');

    // 23h30 à Paris = 17h30 à New York — un calcul basé sur l'appareil
    // conclurait « plein jour » et afficherait le soleil.
    const nuit = await ambianceAt(page, '23:30', 0);
    expect(nuit.particules).toBe('stars');
  });
});

// ── Hiver : le soleil se couche tôt, et le calendrier festif occupe décembre ──
// Deux règles vérifiées ici : les décors de SOIRÉE (guirlande, étincelles,
// chauves-souris, 14 Juillet) se superposent aux étoiles ; les décors DIURNES
// (feuilles, pétales, œufs) leur cèdent la place — des feuilles qui tombent à
// 19 h dans le noir n'évoquent rien.
async function ambianceLe(page, dateISO, veilleISO, parisTime, offset, lever, coucher, weatherCode) {
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (EXTERNAL_HOSTS.some((h) => url.includes(h))) return route.abort();
    return route.continue();
  });
  await page.addInitScript(() => {
    try { localStorage.setItem('mat_onboarded_v3', '1'); } catch (_) {}
  });
  await page.clock.setFixedTime(new Date(`${dateISO}T${parisTime}:00${offset}`));
  await page.goto('/');
  await page.waitForFunction(() => typeof window.matHeaderAmbiance === 'function'
    && typeof window._getFeriesForYear === 'function');
  await page.evaluate((d) => { window._meteoData = d; matHeaderAmbiance(); }, {
    forecast: {
      current: { weather_code: weatherCode },
      daily: {
        time:    [veilleISO, dateISO],
        sunrise: [`${veilleISO}T${lever}`, `${dateISO}T${lever}`],
        sunset:  [`${veilleISO}T${coucher}`, `${dateISO}T${coucher}`],
      },
    },
  });
  return page.evaluate(() => {
    const layer = document.querySelector('.header-amb');
    return layer ? layer.dataset.kind : '';
  });
}

test('nuit de décembre, ciel dégagé → étoiles ET guirlande de Noël', async ({ page }) => {
  const k = await ambianceLe(page, '2026-12-15', '2026-12-14', '22:00', '+01:00', '08:35', '16:55', 0);
  expect(k).toBe('stars+noel');
});

test('nuit de novembre → étoiles à la place des feuilles mortes', async ({ page }) => {
  const k = await ambianceLe(page, '2026-11-20', '2026-11-19', '19:00', '+01:00', '08:00', '17:10', 0);
  expect(k).toBe('stars');
});

test('jour de novembre → feuilles mortes, pas d’étoiles', async ({ page }) => {
  const k = await ambianceLe(page, '2026-11-20', '2026-11-19', '14:00', '+01:00', '08:00', '17:10', 0);
  expect(k).toBe('automne');
});

test('nuit de décembre sous la pluie → gouttes seules', async ({ page }) => {
  const k = await ambianceLe(page, '2026-12-15', '2026-12-14', '18:00', '+01:00', '08:35', '16:55', 61);
  expect(k).toBe('rain');
});
