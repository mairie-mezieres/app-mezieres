const { test, expect } = require('@playwright/test');

// Pastille « Nouveau » des documents officiels.
//
// ⚠️ Ce test asserte le **style calculé** de la pastille, pas seulement l'état
// interne du JS : la pastille est produite par du JS mais habillée par du CSS
// en ligne (`display:none` par défaut), et un test qui n'interrogerait que
// `hasNewDoc()` ne prouverait pas qu'un habitant voit quoi que ce soit.
// Voir règle 7 du CLAUDE.md.

const DOC_TEMP = {
  id: 1770000000000,
  title: 'Enquête publique — dossier complet',
  description: 'Consultation ouverte jusqu’au 30 septembre',
  url: 'https://example.org/enquete.pdf'
};

const DOC_FEATURED = {
  title: 'Bulletin municipal — août 2026',
  description: 'Le journal de la commune',
  url: 'https://example.org/bulletin.pdf',
  icon: '📰',
  publishedAt: '2026-08-11T09:00:00.000Z'
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mat_onboarded_v3', '1');
  });
  // ⚠️ L'ordre compte : Playwright consulte les routes de la PLUS RÉCENTE à la
  // plus ancienne. Le filtre général doit donc être posé en premier, sinon il
  // avale les deux routes de documents et le test n'a plus rien à observer.
  await page.route('**/*', (route) => {
    const url = route.request().url();
    const externe = /onrender\.com|googleapis|gstatic|open-meteo|facebook|data\.gouv\.fr|apicarto|geopf|cloudinary|sentry|openstreetmap|clearbit|githubusercontent/.test(url);
    return externe ? route.abort() : route.continue();
  });
  await page.route('**/docs/temp', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify({ docs: [DOC_TEMP] }) }));
  await page.route('**/docs/featured', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify({ doc: DOC_FEATURED }) }));
});

test('la pastille s’allume sur l’accueil sans ouvrir l’écran', async ({ page }) => {
  await page.goto('/');
  const badge = page.locator('#docs-badge');
  // Le rafraîchissement est différé de 2,5 s au démarrage : c'est justement ce
  // qui permet à la pastille d'être allumée AVANT la première ouverture.
  await expect(badge).toHaveCSS('display', 'flex', { timeout: 10000 });
  await expect(badge).toBeVisible();
});

test('chaque document non consulté porte sa pastille « Nouveau »', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#docs-badge')).toHaveCSS('display', 'flex', { timeout: 10000 });

  await page.evaluate(() => window.openDocs());

  const panneau = page.locator('#ov-docs');
  await expect(panneau.getByText(DOC_TEMP.title)).toBeVisible();
  await expect(panneau.getByText(DOC_FEATURED.title)).toBeVisible();
  // Une pastille pour le document à la une, une pour le document temporaire.
  await expect(panneau.getByText('Nouveau', { exact: true })).toHaveCount(2);
});

test('la pastille s’éteint après consultation et le reste au rechargement', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#docs-badge')).toHaveCSS('display', 'flex', { timeout: 10000 });

  await page.evaluate(() => window.openDocs());
  await expect(page.locator('#ov-docs').getByText(DOC_TEMP.title)).toBeVisible();
  // Le marquage « vu » a lieu après le rafraîchissement déclenché par openDocs().
  await expect(page.locator('#docs-badge')).toHaveCSS('display', 'none');

  await page.reload();
  await page.waitForTimeout(3500);
  await expect(page.locator('#docs-badge')).toHaveCSS('display', 'none');
});

test('un document publié après la visite rallume la pastille', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.openDocs());
  await expect(page.locator('#ov-docs').getByText(DOC_TEMP.title)).toBeVisible();
  await expect(page.locator('#docs-badge')).toHaveCSS('display', 'none');

  // La mairie publie un second document : son identifiant est inconnu du
  // stockage local, la pastille doit donc se rallumer.
  await page.route('**/docs/temp', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ docs: [DOC_TEMP, { id: 1780000000001, title: 'Arrêté de circulation', url: 'https://example.org/arrete.pdf' }] })
    }));

  await page.reload();
  await expect(page.locator('#docs-badge')).toHaveCSS('display', 'flex', { timeout: 10000 });
});
