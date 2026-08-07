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

// Les étoiles étaient bien COMPOSÉES (`dataset.kind === 'stars'`) mais pas
// PEINTES : une accolade orpheline dans mat.css avalait la règle `.amb-star`
// (v4.52.1 → v4.60). Les `✦` restaient en `position:static`, empilés en haut à
// gauche, couleur héritée sombre, sans scintillement — invisibles sur le
// dégradé de nuit. Tous les tests d'ambiance passaient : aucun ne regardait le
// rendu. Vérifier le style calculé, pas seulement la composition. ADR-0015.
test('les étoiles de la nuit sont réellement peintes, pas seulement composées', async ({ page }) => {
  const r = await ambianceAt(page, '23:30', 0);
  expect(r.particules).toBe('stars');

  const etoiles = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('.header-amb .amb-star'));
    if (!els.length) return null;
    const c = getComputedStyle(els[0]);
    const r0 = els[0].getBoundingClientRect();
    const r1 = els[els.length - 1].getBoundingClientRect();
    return {
      nombre: els.length,
      position: c.position,
      animation: c.animationName,
      // `position:static` empile les glyphes dans le flux : ils partagent
      // alors la même ordonnée, alors que le JS leur pose des `top` variés.
      dispersees: Math.abs(r0.top - r1.top) > 1 || Math.abs(r0.left - r1.left) > 1,
    };
  });

  expect(etoiles, 'aucune étoile dans le DOM').not.toBeNull();
  expect(etoiles.nombre).toBeGreaterThan(1);
  expect(etoiles.position).toBe('absolute');
  expect(etoiles.animation).toBe('ambTwinkle');
  expect(etoiles.dispersees, 'les étoiles ne sont pas positionnées dans le bandeau').toBe(true);
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
  const k = await ambianceLe(page, '2026-12-17', '2026-12-16', '22:00', '+01:00', '08:37', '16:55', 0);
  expect(k).toBe('stars+noel');
});

// Les saisons ne durent que 3 jours : l'équinoxe d'automne, pas tout novembre.
test('nuit d’équinoxe d’automne → étoiles à la place des feuilles', async ({ page }) => {
  const k = await ambianceLe(page, '2026-09-24', '2026-09-23', '22:00', '+02:00', '07:35', '19:50', 0);
  expect(k).toBe('stars');
});

test('jour d’équinoxe d’automne → feuilles, pas d’étoiles', async ({ page }) => {
  const k = await ambianceLe(page, '2026-09-24', '2026-09-23', '14:00', '+02:00', '07:35', '19:50', 0);
  expect(k).toBe('automne');
});

// Hors des fenêtres de 3 jours, plus aucun décor : le 10 novembre est nu.
test('hors fenêtre de saison → aucun décor, seulement le ciel', async ({ page }) => {
  const k = await ambianceLe(page, '2026-11-10', '2026-11-09', '14:00', '+01:00', '07:45', '17:20', 0);
  expect(k).toBe('sun');
});

// L'annonce du solstice (21-23 déc) est incluse dans Noël (15-30 déc) : sans
// priorité explicite, elle ne s'afficherait jamais.
test('solstice d’hiver → givre, prioritaire sur Noël', async ({ page }) => {
  const k = await ambianceLe(page, '2026-12-22', '2026-12-21', '14:00', '+01:00', '08:40', '16:55', 0);
  expect(k).toBe('hiver');
});

test('solstice d’été → poussière de lumière', async ({ page }) => {
  const k = await ambianceLe(page, '2026-06-22', '2026-06-21', '14:00', '+02:00', '05:50', '21:55', 0);
  expect(k).toBe('ete');
});

test('nuit de décembre sous la pluie → gouttes seules', async ({ page }) => {
  const k = await ambianceLe(page, '2026-12-17', '2026-12-16', '18:00', '+01:00', '08:37', '16:55', 61);
  expect(k).toBe('rain');
});

// ── Aperçu des ambiances (outil mairie) ──────────────────────────────────────
// Contrat vérifié ici : invisible pour les habitants (rien dans le DOM tant
// qu'on ne l'ouvre pas), et strictement en mémoire (aucune trace persistée).
test.describe('aperçu des ambiances', () => {
  async function ouvrirPersonnalisation(page) {
    await page.route('**/*', (route) => {
      const url = route.request().url();
      if (EXTERNAL_HOSTS.some((h) => url.includes(h))) return route.abort();
      return route.continue();
    });
    await page.addInitScript(() => {
      try { localStorage.setItem('mat_onboarded_v3', '1'); } catch (_) {}
    });
    await page.goto('/');
    await page.waitForFunction(() => typeof window.openAccessibilite === 'function');
    await expect(async () => {
      await page.evaluate(() => window.openAccessibilite());
      await expect(page.locator('#ov-accessibilite')).toHaveClass(/open/, { timeout: 1000 });
    }).toPass({ timeout: 8000 });
    // L'écran de démarrage recouvre encore la page juste après le boot : un
    // appui y atterrirait au lieu du titre. On attend que le titre soit
    // réellement l'élément touché au point visé.
    await page.waitForFunction(() => {
      const t = document.querySelector('#ov-accessibilite .panel-title');
      if (!t) return false;
      const r = t.getBoundingClientRect();
      const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !!(el && el.closest('.panel-title'));
    }, null, { timeout: 10000 });
  }

  test('absent du DOM tant qu’il n’est pas ouvert', async ({ page }) => {
    await ouvrirPersonnalisation(page);
    expect(await page.locator('#amb-apercu').count()).toBe(0);
    expect(await page.locator('#amb-apercu-bandeau').count()).toBe(0);
  });

  test('cinq appuis rapides sur le titre → panneau, simulation et bandeau APERÇU', async ({ page }) => {
    await ouvrirPersonnalisation(page);
    const titre = page.locator('#ov-accessibilite .panel-title');
    for (let i = 0; i < 5; i++) await titre.click({ delay: 20 });

    await expect(page.locator('#amb-apercu')).toBeVisible();
    await expect(page.locator('#amb-apercu-bandeau')).toBeVisible();

    // Neige + nuit, quelle que soit la météo réelle
    await page.selectOption('#amb-ap-meteo', '73');
    await page.selectOption('#amb-ap-moment', 'night');
    expect(await page.evaluate(() => document.querySelector('.header-amb').dataset.kind)).toBe('snow');

    // Ciel dégagé + nuit + Noël → superposition
    await page.selectOption('#amb-ap-meteo', '0');
    // On retrouve l'option par son LIBELLÉ, pas par sa date : ce couplage à la
    // valeur avait cassé le test au premier resserrage de la fenêtre de Noël.
    const valeurNoel = await page.evaluate(() => {
      const o = Array.from(document.getElementById('amb-ap-saison').options)
        .find((x) => x.textContent.trim().startsWith('Noël'));
      return o ? o.value : '';
    });
    expect(valeurNoel, 'option Noël absente de la liste d’aperçu').not.toBe('');
    await page.selectOption('#amb-ap-saison', valeurNoel);
    expect(await page.evaluate(() => document.querySelector('.header-amb').dataset.kind)).toBe('stars+noel');

    // Retour au réel : bandeau retiré, aucune trace persistée
    await page.click('#amb-ap-stop');
    await expect(page.locator('#amb-apercu-bandeau')).toHaveCount(0);
    const persiste = await page.evaluate(() =>
      Object.keys(localStorage).some((k) => /apercu|ambiance|sim/i.test(k)));
    expect(persiste).toBe(false);
  });

  test('quatre appuis ne suffisent pas', async ({ page }) => {
    await ouvrirPersonnalisation(page);
    const titre = page.locator('#ov-accessibilite .panel-title');
    for (let i = 0; i < 4; i++) await titre.click({ delay: 20 });
    await page.waitForTimeout(300);
    expect(await page.locator('#amb-apercu').count()).toBe(0);
  });

  test('des appuis trop espacés ne déclenchent rien', async ({ page }) => {
    await ouvrirPersonnalisation(page);
    const titre = page.locator('#ov-accessibilite .panel-title');
    for (let i = 0; i < 5; i++) { await titre.click(); await page.waitForTimeout(900); }
    expect(await page.locator('#amb-apercu').count()).toBe(0);
  });

});
