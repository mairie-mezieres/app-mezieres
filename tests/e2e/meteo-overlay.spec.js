const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

// Fenêtre météo — carte « Maintenant », hors-ligne, honnêteté des données,
// accessibilité (v4.78).
//
// Ce lot verrouille des comportements qui avaient tous déjà existé « en
// silence » : des mesures calculées et jamais affichées, un cache absent, des
// zéros présentés comme des relevés, des carrousels hors d'atteinte au clavier.
//
// ⚠️ Fuseau forcé à Europe/Paris (heures Open-Meteo locales sans fuseau).

test.use({ timezoneId: 'Europe/Paris' });

const EXTERNAL_HOSTS = [
  'chatbot-mairie-mezieres.onrender.com', 'open-meteo.com', 'tile.openstreetmap',
  'data.education.gouv.fr', 'ingest.de.sentry.io', 'sentry.io',
];

const HIER = '2026-07-28';
const AUJ = '2026-07-29';
const DEMAIN = '2026-07-30';
const APRES = '2026-07-31';
const PARIS = '+02:00';
const MAINTENANT = `${AUJ}T10:00:00${PARIS}`;

// `daily[0]` = HIER (past_days=1, ADR-0007). Le 4ᵉ jour est volontairement
// **vide** : c'est le cas qui produisait « 0 °C » et un grand soleil.
function payload() {
  const heures = [], temp = [], hum = [], pres = [], gust = [], prob = [], pluie = [], codes = [];
  for (let h = 7; h <= 23; h++) {
    heures.push(`${AUJ}T${String(h).padStart(2, '0')}:00`);
    temp.push(30 + (h % 3));
    hum.push(h < 10 ? 55 : 38);      // 55 % il y a trois heures → tendance à la baisse
    pres.push(h < 10 ? 1018 : 1013);
    gust.push(25);
    prob.push(h === 14 ? 70 : 5);
    pluie.push(h === 14 ? 2.0 : 0);
    codes.push(0);
  }
  return {
    forecast: {
      current: {
        temperature_2m: 36.6, apparent_temperature: 41.2, relative_humidity_2m: 38,
        pressure_msl: 1013, weather_code: 0, wind_speed_10m: 14, wind_direction_10m: 220,
      },
      daily: {
        time: [HIER, AUJ, DEMAIN, APRES],
        weather_code: [0, 0, 3, null],
        temperature_2m_max: [35, 37, 29, null],
        temperature_2m_min: [19, 21, 17, null],
        precipitation_sum: [0, 0, 1.2, null],
        uv_index_max: [7, 9.2, 3.1, null],
        wind_gusts_10m_max: [46, 52, 38, null],
        wind_direction_10m_dominant: [220, 230, 250, null],
        sunrise: [`${HIER}T06:30`, `${AUJ}T06:32`, `${DEMAIN}T06:34`, `${APRES}T06:36`],
        sunset: [`${HIER}T21:38`, `${AUJ}T21:36`, `${DEMAIN}T21:34`, `${APRES}T21:32`],
      },
      hourly: {
        time: heures, temperature_2m: temp, relative_humidity_2m: hum,
        surface_pressure: pres, wind_gusts_10m: gust, weather_code: codes,
        precipitation_probability: prob, precipitation: pluie,
      },
    },
    vigilance: null,
  };
}

// Normales servies par le backend (`lib/normales.js`). `tmaxJuillet` est le seul
// paramètre qui compte ici : la maximale d'aujourd'hui vaut 37 °C dans le payload.
function normales(tmaxJuillet) {
  return {
    periode: { debut: 1991, fin: 2020 },
    jeu: 'ERA5',
    fournisseur: 'Open-Meteo',
    licence: 'CC BY 4.0',
    reanalyse: true,
    station: null,
    etiquette: 'Normales 1991-2020 — réanalyse ERA5 (Open-Meteo)',
    mois: Array.from({ length: 12 }, (_, i) => ({
      mois: i + 1,
      tmax: i + 1 === 7 ? tmaxJuillet : 15,
      tmin: 8,
      jours: 930,
    })),
  };
}

async function ouvrirMeteo(page, opts) {
  const o = opts || {};
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
  await page.evaluate(async (arg) => {
    window._meteoData = arg.d;
    window._meteoDataAt = arg.at;
    window._meteoDataStale = arg.stale;
    openMeteo();
    await window.loadMeteoDetail();
  }, {
    d: Object.assign(payload(), o.normales ? { normales: o.normales } : {}),
    at: new Date(MAINTENANT).getTime() - 7 * 60000,
    stale: !!o.stale,
  });
  await page.waitForSelector('#meteo-detail .meteo-premium');
}

test('la carte « Maintenant » affiche le ressenti et l’humidité', async ({ page }) => {
  await ouvrirMeteo(page);

  const r = await page.evaluate(() => {
    const c = document.querySelector('.meteo-now-card');
    return { txt: c ? c.innerText.replace(/\s+/g, ' ') : null };
  });

  // Ces mesures étaient calculées puis jetées : sept variables mortes.
  expect(r.txt).toContain('37°');
  expect(r.txt).toMatch(/ressenti/i); // le libellé est mis en capitales par le CSS
  expect(r.txt).toContain('41°');
  expect(r.txt).toContain('38 %');
  expect(r.txt).toContain('1013 hPa');
  expect(r.txt).toContain('52 km/h');

  // Humidité 55 % il y a trois heures → 38 % : une flèche de tendance.
  await expect(page.locator('.meteo-now-stat .meteo-trend-inline').first()).toBeVisible();
});

test('rafales et pression ont quitté le bloc « Air »', async ({ page }) => {
  await ouvrirMeteo(page);
  const air = await page.evaluate(() => {
    const h = [...document.querySelectorAll('#meteo-detail h3')].find((e) => /Air/.test(e.textContent));
    return h ? h.parentElement.innerText : '';
  });
  expect(air).toContain('Qualité de l’air'.replace('’', "'")); // libellé rendu avec apostrophe droite
  expect(air).not.toContain('Rafales');
  expect(air).not.toContain('Pression');
});

test('une donnée absente s’écrit « – », jamais 0 °C ni grand soleil', async ({ page }) => {
  await ouvrirMeteo(page);

  const dernier = await page.evaluate(() => {
    const cartes = document.querySelectorAll('.meteo-day-card');
    const c = cartes[cartes.length - 1];
    return { txt: c.innerText.replace(/\s+/g, ' '), ico: c.querySelector('.meteo-day-icon').textContent };
  });

  expect(dernier.txt).toContain('–');
  expect(dernier.txt).not.toContain('0°');
  expect(dernier.txt).not.toContain('Ciel dégagé');
  expect(dernier.ico).not.toBe('☀️');
});

test('l’indice UV porte sa couleur d’échelle', async ({ page }) => {
  await ouvrirMeteo(page);

  // Style CALCULÉ : la pastille est posée en JS et peinte par le CSS.
  const r = await page.evaluate(() => {
    const chips = [...document.querySelectorAll('.meteo-uv-chip')];
    return chips.slice(0, 3).map((c) => ({
      txt: c.textContent, cls: c.className, bg: getComputedStyle(c).backgroundColor,
    }));
  });

  expect(r[0].txt).toBe('UV 9.2');
  expect(r[0].cls).toContain('uv-4');           // 8-10 : très fort
  expect(r[1].cls).toContain('uv-2');           // 3-5 : modéré
  expect(r[2].cls).toContain('uv-0');           // valeur absente
  expect(new Set(r.map((c) => c.bg)).size).toBe(3); // trois couleurs distinctes
});

test('les carrousels sont atteignables au clavier et nommés', async ({ page }) => {
  await ouvrirMeteo(page);
  for (const sel of ['.meteo-hourly-track', '.meteo-days-scroll']) {
    const el = page.locator(sel);
    await expect(el).toHaveAttribute('tabindex', '0');
    await expect(el).toHaveAttribute('aria-label', /.+/);
    await el.focus();
    await expect(el).toBeFocused();
  }
});

test('la source et l’heure du relevé sont indiquées', async ({ page }) => {
  await ouvrirMeteo(page);
  const src = await page.locator('.meteo-source').innerText();
  expect(src).toContain('Open-Meteo');
  expect(src).toContain('Météo-France');
  expect(src).toMatch(/\d{1,2}h\d{2}/);
});

test('hors ligne : le bulletin en cache est affiché, et daté', async ({ page }) => {
  await ouvrirMeteo(page, { stale: true });
  const banner = page.locator('.meteo-stale-banner');
  await expect(banner).toHaveCount(1);
  await expect(banner).toContainText('Hors ligne');
  await expect(banner).toContainText(/\d{1,2}h\d{2}/);
  // Les prévisions restent lisibles : c'est tout l'intérêt du cache.
  await expect(page.locator('.meteo-day-card').first()).toBeVisible();
});

test('une alerte expirée n’est pas réaffichée depuis le cache', async ({ page }) => {
  await ouvrirMeteo(page);
  const v = await page.evaluate((maintenant) => {
    localStorage.setItem('mat_meteo_cache', JSON.stringify({
      t: new Date(maintenant).getTime() - 30 * 60000,
      d: { forecast: {}, vigilance: { level: 3, end: new Date(maintenant).getTime() - 3600000 } },
    }));
    // La vigilance stockée s'est terminée il y a une heure.
    const c = window.meteoReadCache(new Date(maintenant).getTime());
    return c ? c.d.vigilance : 'pas-de-cache';
  }, MAINTENANT);
  expect(v).toBe(null);
});

/* ── Écart à la normale du mois (v4.79, ADR-0024) ─────────────────────────── */

test('l’écart à la normale s’affiche avec sa provenance', async ({ page }) => {
  await ouvrirMeteo(page, { normales: normales(26) });

  const txt = await page.evaluate(() => {
    const el = document.querySelector('.meteo-now-norm');
    return el ? el.innerText.replace(/\s+/g, ' ') : null;
  });

  expect(txt).toContain('37 °C');            // maximale d'aujourd'hui
  expect(txt).toContain('+11 °C');           // 37 − 26
  expect(txt).toContain('Normale de juillet');
  expect(txt).toContain('26 °C');
  // La provenance n'est pas facultative : ces normales avaient été retirées
  // faute de source (ADR-0022). Et ERA5 est une réanalyse, pas une station.
  expect(txt).toContain('réanalyse ERA5');
  expect(txt).not.toMatch(/station/i);

  // La période a rejoint la ligne de sources (v4.80) pour tenir sur une ligne
  // en « grand texte » — elle reste visible, ailleurs, une seule fois.
  expect(txt).not.toContain('1991-2020');
  const source = await page.locator('.meteo-source').innerText();
  expect(source).toContain('normales 1991-2020');
});

test('le mois s’élide : « d’août », jamais « de août »', async ({ page }) => {
  await ouvrirMeteo(page, { normales: normales(26) });
  const r = await page.evaluate(() => [1, 4, 7, 8, 10].map((m) => window.meteoMoisPrefixe(m)));
  expect(r).toEqual(['de janvier', "d'avril", 'de juillet', "d'août", "d'octobre"]);
});

// Régression de mise en page : ces deux libellés passaient à la ligne dès le
// réglage « grand texte », et la carte gagnait 35 px pour rien. On mesure le
// RENDU (hauteur / interligne), pas la chaîne — règle 7 du CLAUDE.md.
test('en grand texte, la provenance et « Rafales 24 h » tiennent sur une ligne', async ({ page }) => {
  await ouvrirMeteo(page, { normales: normales(26) });
  await page.evaluate(() => document.documentElement.classList.add('font-large'));
  await page.waitForTimeout(200);

  const r = await page.evaluate(() => {
    const lignes = (el) => Math.round(el.offsetHeight / parseFloat(getComputedStyle(el).lineHeight));
    const src = document.querySelector('.meteo-now-norm-src');
    const labels = [...document.querySelectorAll('.meteo-now-stat .meteo-mini-label')];
    const rafales = labels.find((e) => /Rafales/.test(e.textContent));
    return { provenance: lignes(src), rafales: rafales ? lignes(rafales) : null, txt: rafales && rafales.textContent };
  });

  expect(r.txt).toBe('Rafales 24 h');   // la puce médiane offrait un point de coupure
  expect(r.provenance).toBe(1);
  expect(r.rafales).toBe(1);
});

test('l’écart est calculé sur AUJOURD’HUI, jamais sur daily[0] qui est hier', async ({ page }) => {
  // daily[0] = 35 °C (hier), daily[1] = 37 °C (aujourd'hui). Face à une normale
  // de 26 °C, l'écart juste est +11. Un décalage d'un jour donnerait +9 — le
  // bug ADR-0007, qui a déjà frappé cette fenêtre.
  await ouvrirMeteo(page, { normales: normales(26) });
  const txt = await page.evaluate(() => document.querySelector('.meteo-now-norm').innerText);
  expect(txt).toContain('+11');
  expect(txt).not.toContain('+9');
});

test('sans normales servies, aucune ligne d’écart — et rien d’approximatif', async ({ page }) => {
  await ouvrirMeteo(page);                    // payload sans champ `normales`
  await expect(page.locator('.meteo-now-norm')).toHaveCount(0);
  // La carte « Maintenant », elle, reste entière.
  await expect(page.locator('.meteo-now-card')).toBeVisible();
  const source = await page.locator('.meteo-source').innerText();
  expect(source).not.toContain('normales');
});

test('sous 3 °C d’écart, la pastille reste neutre — mesuré sur le style calculé', async ({ page }) => {
  // Règle 7 du CLAUDE.md : un effet habillé par le CSS se vérifie sur le rendu,
  // pas sur une classe. Normale à 35 °C → écart +2, sous le seuil d'emphase.
  await ouvrirMeteo(page, { normales: normales(35) });
  const neutre = await page.evaluate(() => {
    const el = document.querySelector('.meteo-norm-ecart');
    return { fond: getComputedStyle(el).backgroundColor, txt: el.textContent };
  });
  expect(neutre.txt).toContain('+2');

  await ouvrirMeteo(page, { normales: normales(26) });   // écart +11 → emphase
  const chaud = await page.evaluate(() => {
    const el = document.querySelector('.meteo-norm-ecart');
    return { fond: getComputedStyle(el).backgroundColor, txt: el.textContent };
  });
  expect(chaud.fond).not.toBe(neutre.fond);

  // Le sens ne doit jamais tenir à la seule couleur : le signe le porte aussi.
  expect(chaud.txt).toContain('+');
});

test('une maximale du jour absente ne produit aucun écart', async ({ page }) => {
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (EXTERNAL_HOSTS.some((h) => url.includes(h))) return route.abort();
    return route.continue();
  });
  await page.addInitScript(() => { try { localStorage.setItem('mat_onboarded_v3', '1'); } catch (_) {} });
  await page.clock.setFixedTime(new Date(MAINTENANT));
  await page.goto('/');
  await page.waitForFunction(() => typeof window.loadMeteoDetail === 'function');
  await page.evaluate(async (arg) => {
    const d = arg.d;
    d.forecast.daily.temperature_2m_max[1] = null;   // aujourd'hui sans maximale
    d.normales = arg.n;
    window._meteoData = d;
    window._meteoDataAt = arg.at;
    window._meteoDataStale = false;
    openMeteo();
    await window.loadMeteoDetail();
  }, { d: payload(), n: normales(26), at: new Date(MAINTENANT).getTime() });
  await page.waitForSelector('#meteo-detail .meteo-premium');
  await expect(page.locator('.meteo-now-norm')).toHaveCount(0);
});

test('fenêtre météo : aucune violation axe sérieuse ou critique', async ({ page }) => {
  // Avec les normales : la pastille d'écart porte du texte sur fond coloré,
  // c'est un contraste de plus à vérifier, pas un détail décoratif.
  await ouvrirMeteo(page, { normales: normales(26) });
  const results = await new AxeBuilder({ page }).include('#ov-meteo')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  if (blocking.length) {
    console.log('Violations fenêtre météo:', JSON.stringify(
      blocking.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })), null, 2));
  }
  expect(blocking, 'axe fenêtre météo').toEqual([]);
});
