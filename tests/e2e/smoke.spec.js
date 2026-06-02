const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

// Hôtes externes (API backend, météo, cartes, Sentry…) : on les coupe pour
// tester la résilience du shell « sans backend » et garder les tests
// hermétiques — aucun appel vers la production pendant la CI.
const EXTERNAL_HOSTS = [
  'onrender.com', 'googleapis.com', 'gstatic.com', 'clearbit.com',
  'open-meteo.com', 'facebook.com', 'api-adresse.data.gouv.fr',
  'apicarto.ign.fr', 'data.geopf.fr', 'cadastre.data.gouv.fr',
  'geoportail-urbanisme', 'raw.githubusercontent.com', 'res.cloudinary.com',
  'data.education.gouv.fr', 'ingest.de.sentry.io', 'sentry.io',
  'tile.openstreetmap.org', 'openstreetmap.org'
];

test.beforeEach(async ({ page }) => {
  // Bypass onboarding : localStorage pré-rempli avant le premier script de la page
  await page.addInitScript(() => {
    localStorage.setItem('mat_onboarded_v3', '1');
  });
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (EXTERNAL_HOSTS.some((h) => url.includes(h))) return route.abort();
    return route.continue();
  });
});

test('le shell se charge (lang, titre, meta description)', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Mézières Avec Toi/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    /Application officielle de la commune de Mézières/
  );
});

test('overlay RGPD : la section Souveraineté numérique est présente', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => typeof window.openRgpd === 'function');
  // Réessai : selon le rythme d'init (surtout en mobile), le 1er appel peut
  // précéder la fin du boot ; on rappelle l'ouverture jusqu'à ce qu'elle prenne.
  await expect(async () => {
    await page.evaluate(() => window.openRgpd());
    await expect(page.locator('#ov-rgpd')).toHaveClass(/open/, { timeout: 1000 });
  }).toPass({ timeout: 8000 });
  await expect(page.getByText(/Souveraineté numérique/).first()).toBeVisible();
});

test('overlay Accessibilité : la déclaration RGAA est présente', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => typeof window.openAccessibilite === 'function');
  await expect(async () => {
    await page.evaluate(() => window.openAccessibilite());
    await expect(page.locator('#ov-accessibilite')).toHaveClass(/open/, { timeout: 1000 });
  }).toPass({ timeout: 8000 });
  await expect(
    page.getByText(/Déclaration d.accessibilité \(RGAA\)/).first()
  ).toBeVisible();
});

test('overlay lazy (Majordome) : absent du DOM au chargement, hydraté à l’ouverture', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => typeof window.openOv === 'function');
  // Avant ouverture : le contenu vit dans un <template> inerte → pas dans le DOM
  // rendu (c'est le gain eco-index). Le shell #ov-majordome existe, mais vide.
  expect(await page.locator('#ov-majordome .majordome-name').count()).toBe(0);
  // Ouverture → hydratation du template
  await expect(async () => {
    await page.evaluate(() => window.openOv('majordome'));
    await expect(page.locator('#ov-majordome')).toHaveClass(/open/, { timeout: 1000 });
  }).toPass({ timeout: 8000 });
  await expect(page.getByText('Bonjour, je suis MAT !')).toBeVisible();
});

test('accueil : aucune violation axe sérieuse ou critique', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle').catch(() => {});
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical'
  );
  if (blocking.length) {
    console.log(
      'Violations bloquantes:',
      JSON.stringify(
        blocking.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
        null,
        2
      )
    );
  }
  expect(blocking, 'axe: violations sérieuses/critiques').toEqual([]);
});
