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

/* ⚠️ Ouvrir un overlay ne suffit PAS pour l'auditer avec axe.
   La classe `open` est posée AVANT la fin de la transition CSS : pendant
   ~300 ms l'overlay reste `visibility:hidden`, et axe IGNORE tout ce qui est
   masqué. Un `analyze()` lancé à cet instant renvoie donc zéro violation,
   quel que soit le contenu — le test passe à vide et ne peut pas échouer.

   Mesuré le 27 août 2026 sur #ov-accessibilite : 0 violation à t=0,
   9 violations `label` (critical) à t=400 ms, sur les mêmes nœuds. Les douze
   interrupteurs du panneau Accessibilité n'avaient aucun nom accessible
   depuis leur création, sous un test vert.

   D'où cette attente sur le STYLE CALCULÉ, et pas sur la classe :
   c'est la règle 7 du CLAUDE.md — un test qui n'interroge que le JS ne
   prouve pas qu'un effet est visible. */
async function ouvrirOverlayVisible(page, fn, sel) {
  await page.waitForFunction((f) => typeof window[f] === 'function', fn);
  await expect(async () => {
    await page.evaluate((f) => window[f](), fn);
    await expect(page.locator(sel)).toHaveClass(/open/, { timeout: 1000 });
  }).toPass({ timeout: 8000 });
  await page.waitForFunction(
    (s) => getComputedStyle(document.querySelector(s)).visibility === 'visible',
    sel,
    { timeout: 5000 }
  );
  // Garde-fou : si l'overlay redevenait masqué, axe mesurerait du vide.
  await expect
    .poll(() => page.evaluate((s) => getComputedStyle(document.querySelector(s)).visibility, sel))
    .toBe('visible');
}

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

test('clavier : la touche Échap ferme l’overlay ouvert', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => typeof window.openAccessibilite === 'function');
  await expect(async () => {
    await page.evaluate(() => window.openAccessibilite());
    await expect(page.locator('#ov-accessibilite')).toHaveClass(/open/, { timeout: 1000 });
  }).toPass({ timeout: 8000 });
  await page.keyboard.press('Escape');
  await expect(page.locator('#ov-accessibilite')).not.toHaveClass(/open/);
});

test('overlay Accessibilité : aucune violation axe sérieuse ou critique', async ({ page }) => {
  await page.goto('/');
  await ouvrirOverlayVisible(page, 'openAccessibilite', '#ov-accessibilite');
  const results = await new AxeBuilder({ page })
    .include('#ov-accessibilite')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical'
  );
  if (blocking.length) {
    console.log('Violations overlay accessibilité:', JSON.stringify(
      blocking.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })), null, 2));
  }
  expect(blocking, 'axe overlay accessibilité').toEqual([]);
});

// Couverture axe étendue (EAA / RGAA) : on ouvre chaque overlay qui se rend sans
// backend et on vérifie l'absence de violation sérieuse/critique sur son contenu.
const A11Y_OVERLAYS = [
  { fn: 'openContact',       sel: '#ov-contact', label: 'Contact' },
  { fn: 'openNums',          sel: '#ov-nums',    label: 'Numéros utiles' },
  { fn: 'openSignal',        sel: '#ov-signal',  label: 'Signalement' },
  { fn: 'openGuideArrivee',  sel: '#ov-guide',   label: 'Guide d’arrivée' },
];

for (const ov of A11Y_OVERLAYS) {
  test(`overlay ${ov.label} : aucune violation axe sérieuse ou critique`, async ({ page }) => {
    await page.goto('/');
    await ouvrirOverlayVisible(page, ov.fn, ov.sel);
    const results = await new AxeBuilder({ page })
      .include(ov.sel)
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical'
    );
    if (blocking.length) {
      console.log(`Violations overlay ${ov.label}:`, JSON.stringify(
        blocking.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })), null, 2));
    }
    expect(blocking, `axe overlay ${ov.label}`).toEqual([]);
  });
}

// Guide d'arrivée des nouveaux habitants : contenu 100 % embarqué, donc
// entièrement testable sans backend (les hôtes externes sont coupés ci-dessus).
async function ouvrirGuide(page) {
  await page.goto('/');
  await page.waitForFunction(() => typeof window.openGuideArrivee === 'function');
  await expect(async () => {
    await page.evaluate(() => window.openGuideArrivee());
    await expect(page.locator('#ov-guide')).toHaveClass(/open/, { timeout: 1000 });
  }).toPass({ timeout: 8000 });
}

test('guide d’arrivée : hydraté dès la première ouverture, 4 étapes rendues', async ({ page }) => {
  // L'overlay est lazy : son contenu vit dans un <template> tant qu'on ne l'a
  // pas ouvert. C'est le piège n°1 d'un nouvel overlay (getElementById avant
  // openOv → null), donc on vérifie qu'il est peuplé au PREMIER affichage.
  await page.goto('/');
  expect(await page.locator('#ov-guide section').count()).toBe(0);
  await ouvrirGuide(page);
  await expect(page.getByRole('heading', { name: /Dès votre arrivée/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Dans le premier mois/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Bien vivre à Mézières/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Rester informé/ })).toBeVisible();
  await expect(page.locator('#ov-guide [role="checkbox"]')).toHaveCount(23);
});

test('guide d’arrivée : cocher une démarche est mémorisé après rechargement', async ({ page }) => {
  await ouvrirGuide(page);
  const cases = page.locator('#ov-guide [role="checkbox"]');
  await expect(cases.first()).toHaveAttribute('aria-checked', 'false');
  await cases.first().click();
  await expect(page.locator('#ov-guide [role="checkbox"]').first())
    .toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('#ov-guide')).toContainText('1 / 23 démarche faite');
  // Rechargement complet : l'état vient de localStorage, pas du DOM.
  await ouvrirGuide(page);
  await expect(page.locator('#ov-guide [role="checkbox"]').first())
    .toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('#ov-guide')).toContainText('1 / 23 démarche faite');
  // « Tout décocher » remet le compteur à zéro.
  await page.getByRole('button', { name: 'Tout décocher' }).click();
  await expect(page.locator('#ov-guide')).toContainText('0 / 23 démarche faite');
});

// Régression : deux gestionnaires `keydown` distincts fermaient chacun le
// dernier overlay de la pile à chaque Échap. Comme closeOv() dépile _ovStack
// de façon SYNCHRONE (seul le visuel passe par la view transition), une seule
// frappe en fermait deux. Invisible tant qu'un seul overlay était ouvert —
// il fallait une pile de deux pour le voir.
test('guide d’arrivée : un lien interne empile l’overlay cible sans fermer le guide', async ({ page }) => {
  await ouvrirGuide(page);
  await page.getByRole('button', { name: /Calendrier des collectes/ }).click();
  await expect(page.locator('#ov-dechets')).toHaveClass(/open/);
  // Le guide reste ouvert dessous : Échap ne doit refermer que le dernier.
  await expect(page.locator('#ov-guide')).toHaveClass(/open/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#ov-dechets')).not.toHaveClass(/open/);
  await expect(page.locator('#ov-guide')).toHaveClass(/open/);
  // Second Échap : c'est au tour du guide, et de lui seul.
  await page.keyboard.press('Escape');
  await expect(page.locator('#ov-guide')).not.toHaveClass(/open/);
});

test('guide d’arrivée : l’adresse #guide ouvre la page directement', async ({ page }) => {
  await page.goto('/#guide');
  await expect(page.locator('#ov-guide')).toHaveClass(/open/, { timeout: 8000 });
  await expect(page.getByRole('heading', { name: /Dès votre arrivée/ })).toBeVisible();
});

// Liens des réponses de MEL. Signalé en production : la réponse « carte
// d'identité » affichait « mairie-clery-saint-andre.fr » sans que rien ne
// s'ouvre. Le linkifieur ne traitait que `https://…` et `www.…` — 14 règles
// backend sur 27 contenaient un domaine nu, donc du texte mort. Et son motif
// d'URL `[^\s<>]+` avalait la ponctuation collée derrière, cassant le href.
test('MEL : adresses cliquables dans les réponses, sans faux positif', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => typeof window._melLinkify === 'function');

  const hrefs = (html) => Array.from(html.matchAll(/href="([^"]+)"/g), (m) => m[1]);

  // Domaine écrit nu → lien https, c'est le cas qui manquait.
  expect(hrefs(await page.evaluate(() => window._melLinkify('Vérifiez sur lysseo.fr ou appelez.'))))
    .toEqual(['https://lysseo.fr']);

  // Ponctuation collée : elle ne doit pas entrer dans le href.
  expect(hrefs(await page.evaluate(() => window._melLinkify('Téléservice (https://www.service-public.gouv.fr/particuliers/vosdroits/R16396) ou en mairie.'))))
    .toEqual(['https://www.service-public.gouv.fr/particuliers/vosdroits/R16396']);

  // Courriel → mailto, et surtout pas un lien vers le domaine.
  expect(hrefs(await page.evaluate(() => window._melLinkify('Écrivez à mairie@mezieres-lez-clery.fr.'))))
    .toEqual(['mailto:mairie@mezieres-lez-clery.fr']);

  // Faux positifs : plaque, article de loi, nom de fichier, numéro de version.
  expect(hrefs(await page.evaluate(() => window._melLinkify('Plaque AA123BB, art. R421-12, index.html, version 4.53.'))))
    .toEqual([]);

  // Un seul passage : pas de lien imbriqué dans le HTML produit.
  const html = await page.evaluate(() => window._melLinkify('Voir https://exemple.fr et www.cnil.fr et soliha.fr'));
  expect(html).not.toMatch(/<a[^>]*>[^<]*<a/);
  expect(hrefs(html)).toEqual(['https://exemple.fr', 'https://www.cnil.fr', 'https://soliha.fr']);
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
