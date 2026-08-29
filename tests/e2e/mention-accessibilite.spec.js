const { test, expect } = require('@playwright/test');

// ── Mention d'accessibilité (décret n° 2019-768) ──────────────────────
//
// Le décret impose que la mention « Accessibilité : totalement conforme »
// (ou « partiellement », ou « non conforme ») figure sur la page d'accueil
// et reste atteignable depuis chaque page. Elle vivait jusqu'ici à trois
// clics, repliée dans l'écran ♿ Personnalisation.
//
// ⛔ CE QUE CE TEST GARDE VRAIMENT : que la mention et la déclaration ne
// divergent pas. Le jour où le taux redescend, la déclaration changera —
// et la mention du pied de page, écrite en dur dans index.html, resterait
// « totalement conforme » sans que rien ne bronche. Un pied de page qui
// ment sur la conformité est pire que pas de mention du tout : c'est une
// affirmation publique fausse, sur un point de droit.

const EXTERNAL_HOSTS = [
  'onrender.com', 'googleapis.com', 'gstatic.com', 'clearbit.com',
  'open-meteo.com', 'facebook.com', 'api-adresse.data.gouv.fr',
  'apicarto.ign.fr', 'data.geopf.fr', 'cadastre.data.gouv.fr',
  'geoportail-urbanisme', 'raw.githubusercontent.com', 'res.cloudinary.com',
  'data.education.gouv.fr', 'ingest.de.sentry.io', 'sentry.io',
  'tile.openstreetmap.org', 'openstreetmap.org'
];

const NIVEAUX = ['totalement conforme', 'partiellement conforme', 'non conforme'];

// ⚠️ Deux pieds de page cohabitent : `.footer` (mobile) et `.d-footer-links`
// (bureau, à partir de 1024 px). L'un remplace l'autre — on vise donc celui
// qui est RÉELLEMENT peint, sinon le test passerait sur le pied invisible et
// ne prouverait rien de ce que voit l'habitant.
const mentionVisible = (page) =>
  page.locator('.footer button:visible, .d-footer-links button:visible')
      .filter({ hasText: /Accessibilité/ }).first();

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mat_onboarded_v3', '1'));
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (EXTERNAL_HOSTS.some((h) => url.includes(h))) return route.abort();
    return route.continue();
  });
  await page.goto('/');
  await page.waitForSelector('body.app-ready', { timeout: 15000 });
  await page.waitForTimeout(500);
});

test('la mention est visible dans le pied de page, au libellé du décret', async ({ page }) => {
  const mention = mentionVisible(page);
  await expect(mention).toBeVisible();
  const txt = (await mention.textContent()).replace(/ /g, ' ').trim();
  // Le libellé est celui du décret, pas une reformulation.
  expect(txt, `libellé inattendu : « ${txt} »`).toMatch(/Accessibilité\s*:\s*(totalement conforme|partiellement conforme|non conforme)/);
});

test('la mention dit le MÊME niveau que la déclaration', async ({ page }) => {
  const mention = (await mentionVisible(page).textContent())
    .replace(/ /g, ' ').toLowerCase();
  const niveauMention = NIVEAUX.find((n) => mention.includes(n));
  expect(niveauMention, 'aucun niveau de conformité lisible dans la mention du pied de page').toBeTruthy();

  await page.evaluate(() => openDeclarationA11y());
  await page.waitForTimeout(700);
  const decl = (await page.locator('#decl-a11y').textContent()).replace(/ /g, ' ').toLowerCase();
  // On lit le niveau tel que la déclaration l'énonce, pas tel qu'on l'espère.
  const m = decl.match(/l['’]application mat est\s*(totalement conforme|partiellement conforme|non conforme)/);
  expect(m, 'la déclaration n’énonce plus son niveau dans la forme attendue — le contrôle ne peut pas comparer').toBeTruthy();
  expect(m[1], `le pied de page annonce « ${niveauMention} » et la déclaration « ${m && m[1]} » — l’un des deux ment`).toBe(niveauMention);
});

// ⚠️ L'écran Accessibilité est monté paresseusement : `#decl-a11y` n'existe
// pas avant son ouverture. Une version naïve de la mention ouvrait donc
// l'écran sans déplier la déclaration — et un test qui se contente de
// vérifier « l'écran s'ouvre » ne l'aurait jamais vu.
test('la mention ouvre la déclaration, dépliée', async ({ page }) => {
  expect(await page.locator('#decl-a11y').count(), 'la déclaration ne devrait pas exister avant ouverture (montage paresseux)').toBe(0);
  await mentionVisible(page).click();
  await page.waitForTimeout(900);
  const d = page.locator('#decl-a11y');
  await expect(d, 'la déclaration n’a pas été montée').toHaveCount(1);
  expect(await d.evaluate((el) => el.open), 'la déclaration est montée mais reste repliée').toBe(true);
  await expect(page.locator('#ov-accessibilite.open')).toHaveCount(1);
});

test('aucun pied de page ne déborde, de 320 à 1440 px', async ({ page }) => {
  // 1024 px et au-delà : c'est le pied de page BUREAU qui porte la mention.
  for (const width of [320, 360, 412, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(250);
    const { scrollW, clientW } = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth
    }));
    expect(scrollW, `débordement horizontal à ${width} px (${scrollW} > ${clientW})`).toBeLessThanOrEqual(clientW);
  }
});
