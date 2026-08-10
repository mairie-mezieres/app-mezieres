// @ts-check
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

/*
 * Carte 3D du village (overlay ov-carte3d).
 *
 * Les tests portent sur ce qui doit tenir quoi qu'il arrive — l'ouverture de
 * l'overlay, l'absence de chargement de MapLibre au démarrage, l'accessibilité,
 * et le fait qu'aucun bâtiment inventé n'apparaisse quand les sources sont
 * muettes (ADR-0018).
 *
 * ⚠️ Les hôtes externes sont COUPÉS, comme dans smoke.spec.js. Sans cela, le
 * test « aucun bâtiment inventé » dépend de l'environnement : il passait en
 * local (réseau fermé) et échouait en CI, où le runner GitHub atteint
 * réellement l'IGN et charge donc de vrais bâtiments. Un test dont le verdict
 * change avec la connexion ne prouve rien.
 *
 * Leçon des étoiles invisibles (ADR-0015) : on assert le STYLE CALCULÉ, pas
 * seulement l'attribut — `.c3d-btn{display:flex}` l'emporte sur le display:none
 * que le navigateur applique à [hidden].
 */

const HOTES_EXTERNES = [
  'onrender.com', 'googleapis.com', 'gstatic.com', 'open-meteo.com',
  'facebook.com', 'api-adresse.data.gouv.fr', 'apicarto.ign.fr',
  'data.geopf.fr', 'cadastre.data.gouv.fr', 'geoportail-urbanisme',
  'raw.githubusercontent.com', 'res.cloudinary.com', 'data.education.gouv.fr',
  'sentry.io', 'overpass-api.de', 'openstreetmap.org'
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mat_onboarded_v3', '1');
  });
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (HOTES_EXTERNES.some((h) => url.includes(h))) return route.abort();
    return route.continue();
  });
});

async function ouvrirAccueil(page) {
  await page.goto('/');
  await page.waitForFunction(() => typeof window.openOv === 'function');
}

test.describe('Carte 3D', () => {

  test('MapLibre n’est pas chargé au démarrage', async ({ page }) => {
    await ouvrirAccueil(page);
    // Le module léger doit être là, la bibliothèque lourde non : c'est toute
    // la raison du chargement à la demande (ADR-0018).
    await page.waitForFunction(() => typeof window.matOuvrirCarte3D === 'function');
    expect(await page.evaluate(() => typeof window.maplibregl)).toBe('undefined');
    const scripts = await page.evaluate(() =>
      [...document.querySelectorAll('script[src]')].map(s => s.getAttribute('src')));
    expect(scripts.some(s => /maplibre/i.test(s || ''))).toBe(false);
  });

  test('la page PLUi-H-D propose la carte', async ({ page }) => {
    await ouvrirAccueil(page);
    await page.evaluate(() => window.openPlui());
    const bouton = page.locator('#ov-plui button', { hasText: 'Le village en relief' });
    await expect(bouton).toBeVisible();
  });

  test('l’overlay s’ouvre, se ferme avec Échap, et n’invente aucun bâtiment', async ({ page }) => {
    await ouvrirAccueil(page);
    await page.evaluate(() => window.matOuvrirCarte3D());

    const ov = page.locator('#ov-carte3d');
    await expect(ov).toHaveClass(/open/);
    await expect(page.locator('#c3d-map')).toBeVisible();

    // Sources coupées : la carte ne doit surtout pas fabriquer un village de
    // substitution. On attend l'apparition du bouton de diagnostic — signal
    // déterministe de fin de chargement — plutôt qu'un délai arbitraire.
    await expect(page.locator('#c3d-btn-diag')).toBeVisible({ timeout: 20000 });
    const batiments = await page.evaluate(() => {
      const m = window._c3dMap;
      return m && m.getSource && m.getSource('bati') ? 'présent' : 'absent';
    });
    expect(batiments).toBe('absent');
    await expect(page.locator('#c3d-statut')).toContainText('Aucun bâtiment chargé');

    // Un seul gestionnaire d'Échap a le droit de fermer un overlay (ADR-0011).
    await page.keyboard.press('Escape');
    await expect(ov).not.toHaveClass(/open/);
  });

  test('le bouton de diagnostic est réellement masqué tant qu’il n’a rien à dire', async ({ page }) => {
    await ouvrirAccueil(page);
    await page.evaluate(() => window.matOuvrirCarte3D());
    await expect(page.locator('#c3d-btn-diag')).toBeHidden();
    // L'attribut ne suffit pas : c'est le style calculé qui décide.
    const display = await page.evaluate(() => {
      const b = document.getElementById('c3d-btn-diag');
      return b ? getComputedStyle(b).display : 'absent';
    });
    expect(display).toBe('none');
  });

  test('aucune violation d’accessibilité sérieuse', async ({ page }) => {
    await ouvrirAccueil(page);
    await page.evaluate(() => window.matOuvrirCarte3D());
    await page.waitForTimeout(1200);
    const res = await new AxeBuilder({ page }).include('#ov-carte3d').analyze();
    const graves = res.violations.filter(v => ['serious', 'critical'].includes(v.impact || ''));
    expect(graves, JSON.stringify(graves.map(v => v.id))).toEqual([]);
  });

});
