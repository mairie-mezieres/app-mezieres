const { test, expect } = require('@playwright/test');

// Carte d'alerte météo et « Prochains risques » (v4.77).
//
// Ce que ces tests verrouillent, et pourquoi :
//
// 1. Le dépliant « Touchez pour le détail » redisait les deux horaires et le
//    résumé déjà affichés juste au-dessus. Il est remplacé par une frise ; on
//    vérifie donc qu'aucun <details> ne revient et que la date de début
//    n'apparaît **qu'une fois** dans la carte.
// 2. La frise est produite par du JS mais dessinée par du CSS : on asserte le
//    **style calculé** de la barre, pas seulement le HTML (règle 7 du CLAUDE.md).
// 3. Les règles anti-bruit de « Prochains risques » (seuil UV à 8, pas de
//    répétition du phénomène en vigilance, bloc masqué s'il est vide sous une
//    alerte) sont exactement ce que les habitants reprochaient à la section :
//    elles doivent rester.
//
// ⚠️ Fuseau forcé à Europe/Paris : les heures d'Open-Meteo sont **locales sans
// fuseau** (« 2026-07-29T14:00 »). En UTC (la CI), elles glisseraient de deux
// heures et les seuils horaires ne diraient plus la même chose.

test.use({ timezoneId: 'Europe/Paris' });

const EXTERNAL_HOSTS = [
  'chatbot-mairie-mezieres.onrender.com', 'open-meteo.com', 'tile.openstreetmap',
  'data.education.gouv.fr', 'ingest.de.sentry.io', 'sentry.io',
];

const HIER = '2026-07-28';
const AUJ  = '2026-07-29';
const DEMAIN = '2026-07-30';
const PARIS = '+02:00'; // juillet = CEST
const MAINTENANT = `${AUJ}T10:00:00${PARIS}`;

// `daily[0]` est HIER (past_days=1, ADR-0007) : le jeu de données reproduit
// volontairement cette forme — un tableau qui commencerait aujourd'hui
// validerait le bug au lieu de le détecter.
function payload(opts) {
  const o = opts || {};
  const heures = [], proba = [], pluie = [], rafales = [];
  for (let h = 8; h <= 23; h++) {
    heures.push(`${AUJ}T${String(h).padStart(2, '0')}:00`);
    proba.push(o.calme ? 0 : (h === 14 ? 80 : 5));
    pluie.push(o.calme ? 0 : (h === 14 ? 3.2 : 0));
    rafales.push(o.calme ? 8 : (h === 16 ? 68 : 12));
  }
  return {
    forecast: {
      current: { weather_code: 0, temperature_2m: 24, wind_speed_10m: 12 },
      daily: {
        time: [HIER, AUJ, DEMAIN],
        uv_index_max: [5, o.uv != null ? o.uv : 6.6, o.uvDemain != null ? o.uvDemain : 6.6],
        sunrise: [`${HIER}T06:30`, `${AUJ}T06:32`, `${DEMAIN}T06:34`],
        sunset:  [`${HIER}T21:38`, `${AUJ}T21:36`, `${DEMAIN}T21:34`],
      },
      hourly: {
        time: heures,
        precipitation_probability: proba,
        precipitation: pluie,
        wind_gusts_10m: rafales,
      },
    },
    vigilance: o.vigilance || null,
  };
}

const CANICULE = {
  level: 3, color_label: 'orange',
  phenomenon_id: 6, phenomenon_label: 'canicule',
  start: `${AUJ}T06:00:00${PARIS}`,
  end:   `${AUJ}T22:00:00${PARIS}`,
  upcoming: false, main_text: '',
};

const VENT = {
  level: 3, color_label: 'orange',
  phenomenon_id: 1, phenomenon_label: 'vent violent',
  start: `${AUJ}T06:00:00${PARIS}`,
  end:   `${AUJ}T22:00:00${PARIS}`,
  upcoming: false, main_text: '',
};

// Ouvre l'overlay météo avec une charge utile donnée et rend le détail.
async function ouvrirMeteo(page, data) {
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (EXTERNAL_HOSTS.some((h) => url.includes(h))) return route.abort();
    return route.continue();
  });
  await page.addInitScript(() => {
    try { localStorage.setItem('mat_onboarded_v3', '1'); } catch (_) {}
  });
  await page.clock.setFixedTime(new Date(MAINTENANT));
  await page.goto('/');
  await page.waitForFunction(() => typeof window.loadMeteoDetail === 'function');
  await page.evaluate(async (d) => {
    window._meteoData = d;
    openMeteo();
    await window.loadMeteoDetail();
  }, data);
  await page.waitForSelector('.meteo-alert-card');
}

test('l’alerte n’a plus de dépliant, et n’écrit ses horaires qu’une fois', async ({ page }) => {
  await ouvrirMeteo(page, payload({ vigilance: CANICULE }));

  const r = await page.evaluate(() => {
    const carte = document.querySelector('.meteo-alert-card');
    const txt = carte.innerText;
    return {
      details: carte.querySelectorAll('details').length,
      invite: /Touchez pour le d/.test(txt),
      debuts: (txt.match(/06:00/g) || []).length,
      fins: (txt.match(/22:00/g) || []).length,
      phenomene: carte.querySelector('.meteo-alert-title').textContent,
      // Le repli « Vigilance orange en cours sur le Loiret. » redit la pastille :
      // il ne doit pas s'afficher quand Météo-France ne fournit pas de bulletin.
      repli: (txt.match(/en cours sur le Loiret/g) || []).length,
    };
  });

  expect(r.details, 'le dépliant « détail » ne doit pas revenir').toBe(0);
  expect(r.invite).toBe(false);
  expect(r.debuts, 'heure de début écrite une seule fois').toBe(1);
  expect(r.fins, 'heure de fin écrite une seule fois').toBe(1);
  expect(r.phenomene).toContain('canicule');
  expect(r.repli, 'pas de phrase de repli qui redit la pastille').toBe(0);
});

test('la frise situe l’alerte et annonce le temps restant', async ({ page }) => {
  await ouvrirMeteo(page, payload({ vigilance: CANICULE }));

  const r = await page.evaluate(() => {
    const bar = document.querySelector('.meteo-alert-bar');
    const fill = document.querySelector('.meteo-alert-bar-fill');
    return {
      compte: document.querySelector('.meteo-alert-countdown').textContent,
      // Style CALCULÉ : le remplissage est posé en JS mais peint par le CSS.
      ratio: fill.getBoundingClientRect().width / bar.getBoundingClientRect().width,
    };
  });

  // 06:00 → 22:00, il est 10:00 : un quart de parcouru, douze heures restantes.
  expect(r.compte).toContain('Se termine dans 12 h');
  expect(r.ratio).toBeGreaterThan(0.2);
  expect(r.ratio).toBeLessThan(0.3);
});

test('UV : muet à 6.6, visible à 9.2', async ({ page }) => {
  await ouvrirMeteo(page, payload({ uv: 6.6, uvDemain: 6.6 }));
  expect(await page.locator('.meteo-risk-item', { hasText: 'UV' }).count(),
    'un UV de 6.6 tous les jours d’été n’apprend rien').toBe(0);

  await page.evaluate(async (d) => { window._meteoData = d; await window.loadMeteoDetail(); },
    payload({ uv: 9.2, uvDemain: 9.2 }));
  await expect(page.locator('.meteo-risk-item', { hasText: 'UV très fort' })).toHaveCount(1);
});

test('le risque déjà porté par la vigilance n’est pas répété', async ({ page }) => {
  await ouvrirMeteo(page, payload({ vigilance: VENT }));

  const r = await page.evaluate(() => ({
    rafales: document.querySelectorAll('.meteo-risk-item .meteo-risk-label').length
      ? [...document.querySelectorAll('.meteo-risk-item .meteo-risk-label')].map((e) => e.textContent)
      : [],
  }));

  expect(r.rafales, 'vigilance vent violent → pas de ligne « Rafales »').not.toContain('Rafales');
  expect(r.rafales, 'la pluie, elle, reste annoncée').toContain('Pluie');
});

test('sous une alerte, un bloc de risques vide disparaît', async ({ page }) => {
  await ouvrirMeteo(page, payload({ calme: true, vigilance: CANICULE }));
  await expect(page.locator('.meteo-risk-block')).toHaveCount(0);

  // Sans alerte, en revanche, le calme se dit — c'est une information.
  await page.evaluate(async (d) => { window._meteoData = d; await window.loadMeteoDetail(); },
    payload({ calme: true }));
  await expect(page.locator('.meteo-risk-calm')).toHaveCount(1);
});

test('les conseils du jour lisent le jour courant, pas la veille', async ({ page }) => {
  // daily[0] = HIER à 5 (rien), daily[1] = AUJOURD'HUI à 9.2 (« UV très fort »).
  await ouvrirMeteo(page, payload({ uv: 9.2, uvDemain: 3 }));
  await expect(page.locator('#meteo-detail', { hasText: 'UV très fort : chapeau' })).toHaveCount(1);
});

test('une vigilance vent déclenche ses propres conseils', async ({ page }) => {
  // Aucun seuil de température n'est atteint : sans la règle « vigilance »,
  // le bloc « Conseils du jour » resterait muet sous une alerte vent violent.
  await ouvrirMeteo(page, payload({ vigilance: VENT }));
  await expect(page.locator('#meteo-detail', { hasText: 'Vent violent : limitez vos déplacements' })).toHaveCount(1);
});
