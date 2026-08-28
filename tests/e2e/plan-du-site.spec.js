// @ts-check
const { test, expect } = require('@playwright/test');

/*
 * Plan du site — RGAA 12.1, 12.3 et 12.4.
 *
 * Le plan est CONSTRUIT PAR LE CODE à partir des écrans eux-mêmes : les
 * intitulés sont lus dans chaque `.panel-title`, jamais recopiés. Ce fichier
 * garde les deux choses que ce mécanisme ne peut pas garantir seul :
 *
 *  1. qu'aucun écran ne soit oublié — le classement, lui, est écrit à la main
 *     dans `PLAN_RUBRIQUES`, et c'est là qu'un nouvel écran se perdrait en
 *     silence. Le critère 12.3 exige un plan « pertinent » : incomplet, il
 *     retombe sans que rien ne rougisse ;
 *  2. que le plan soit atteignable depuis chaque écran (12.4) — donc depuis
 *     un pied de page présent partout.
 *
 * ⚠️ Les écrans sont hydratés paresseusement : leur `.panel-title` vit dans un
 * `template` tant qu'ils ne sont pas ouverts. Un relevé qui interrogerait
 * seulement le DOM rendu trouverait zéro écran et passerait au vert sans rien
 * vérifier — la panne d'ADR-0030. Le test compte donc les écrans d'abord et
 * échoue si ce compte est absurdement bas.
 */

const HOTES = ['onrender.com','googleapis.com','gstatic.com','open-meteo.com','facebook.com',
  'api-adresse.data.gouv.fr','apicarto.ign.fr','data.geopf.fr','cadastre.data.gouv.fr',
  'geoportail-urbanisme','raw.githubusercontent.com','res.cloudinary.com',
  'data.education.gouv.fr','sentry.io'];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mat_onboarded_v3', '1'));
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (HOTES.some((h) => url.includes(h))) return route.abort();
    return route.continue();
  });
  await page.goto('/');
  await page.waitForFunction(() => typeof window.openPlanSite === 'function');
});

test('aucun écran n’est absent du plan du site', async ({ page }) => {
  const bilan = await page.evaluate(() => {
    const classes = new Set(PLAN_RUBRIQUES.flatMap(([, ids]) => ids));
    const ecartes = new Set(Object.keys(PLAN_ECARTES));
    const tous = _tousLesEcrans();
    return {
      tous,
      oublies: tous.filter((id) => !classes.has(id) && !ecartes.has(id)),
      // Un id classé qui ne correspond à aucun écran : faute de frappe, ou
      // écran supprimé. Il ne casse rien à l'affichage — il disparaît juste
      // du plan, en silence. C'est exactement ce qu'on refuse.
      fantomes: [...classes].filter((id) => !tous.includes(id))
    };
  });

  // Garde-fou : si le relevé ne trouve presque rien, c'est lui qui est cassé.
  expect(bilan.tous.length,
    'moins de 20 écrans relevés : le relevé ne mesure rien, il ne peut pas conclure')
    .toBeGreaterThan(20);

  expect(bilan.oublies,
    'écran(s) ni classé(s) dans PLAN_RUBRIQUES ni écarté(s) dans PLAN_ECARTES — '
    + 'le plan du site serait incomplet, et le critère 12.3 retomberait en silence')
    .toEqual([]);

  expect(bilan.fantomes,
    'identifiant(s) classé(s) ne correspondant à aucun écran : faute de frappe ou écran supprimé')
    .toEqual([]);
});

test('le plan liste les écrans avec leur vrai intitulé', async ({ page }) => {
  await page.evaluate(() => window.openPlanSite());
  await expect(page.locator('#ov-plansite .panel-title')).toHaveText('Plan du site');

  const r = await page.evaluate(() => {
    const liens = [...document.querySelectorAll('#plansite-body .plan-lien')];
    return {
      nb: liens.length,
      rubriques: document.querySelectorAll('#plansite-body .plan-rubrique').length,
      vides: liens.filter((b) => !b.textContent.trim()).length,
      // Chaque intitulé affiché doit être celui de l'écran correspondant.
      // C'est ce qui interdit une liste recopiée qui divergerait.
      ecarts: liens
        .map((b) => b.textContent.trim())
        .filter((t) => !_tousLesEcrans().some((id) => _titreEcran(id) === t))
    };
  });

  expect(r.nb, 'plan du site vide ou quasi vide').toBeGreaterThan(15);
  expect(r.rubriques).toBeGreaterThan(3);
  expect(r.vides, 'lien(s) sans intitulé').toBe(0);
  expect(r.ecarts,
    'intitulé(s) affiché(s) ne correspondant à aucun écran — le plan a divergé').toEqual([]);
});

test('un lien du plan ouvre bien l’écran visé', async ({ page }) => {
  await page.evaluate(() => window.openPlanSite());
  const lien = page.locator('#plansite-body .plan-lien').first();
  const intitule = (await lien.textContent()).trim();
  await lien.click();
  // La fermeture du plan précède l'ouverture de la cible, d'où l'attente.
  await expect(page.locator('.ov.open .panel-title')).toHaveText(intitule, { timeout: 5000 });
});

test('le plan est atteignable depuis le pied de page (12.4)', async ({ page }) => {
  // Le pied de page est présent sur chaque écran : c'est ce qui satisfait
  // « de manière identique depuis chaque page ».
  const acces = await page.evaluate(() =>
    [...document.querySelectorAll('button')]
      .filter((b) => (b.getAttribute('onclick') || '').includes('openPlanSite'))
      .map((b) => ({
        texte: b.textContent.trim(),
        dansPied: !!b.closest('.footer, .d-footer-bottom, .d-footer-links')
      })));

  expect(acces.length, 'aucun accès au plan du site').toBeGreaterThan(0);
  expect(acces.every((a) => a.dansPied),
    'tout accès au plan doit être en pied de page, pour être au même endroit partout').toBe(true);
});
