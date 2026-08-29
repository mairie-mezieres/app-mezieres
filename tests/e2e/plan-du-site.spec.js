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

/*
 * ⛔ LE TEST QUI MANQUAIT EN v4.93, ET QUE LE PORTEUR A DÛ FAIRE À MA PLACE.
 *
 * Le test ci-dessus vérifie que l'écran S'OUVRE. Il ne vérifiait pas qu'il se
 * REMPLIT. Or `openOv(id)` ne pose que la coquille : c'est la fonction dédiée
 * de chaque écran qui va chercher le contenu (`openConseil()` = `openOv` PUIS
 * `buildTrombi()`). Le plan appelait `openOv` directement : « Conseil
 * municipal » et « Je viens d'emménager » s'ouvraient vides, en production.
 *
 * Un écran ouvert mais vide passe tous les contrôles de structure. Seule la
 * vérification du CONTENU l'attrape. Elle porte donc sur TOUS les liens, pas
 * sur le premier.
 */
test('chaque lien du plan ouvre un écran RENSEIGNÉ, pas une coquille vide', async ({ page }) => {
  await page.evaluate(() => window.openPlanSite());
  const ids = await page.evaluate(() =>
    PLAN_RUBRIQUES.flatMap(([, l]) => l).filter((id) => _titreEcran(id)));

  expect(ids.length, 'aucun écran à vérifier : le test ne mesurerait rien').toBeGreaterThan(15);

  const vides = [];
  for (const id of ids) {
    await page.evaluate((id) => {
      document.querySelectorAll('.ov.open').forEach((o) => o.classList.remove('open'));
      _ouvrirEcran(id);
    }, id);
    // Le contenu de certains écrans arrive après un aller-retour réseau coupé
    // par les tests : on laisse le temps du rendu local, pas celui du réseau.
    await page.waitForTimeout(500);

    const etat = await page.evaluate((id) => {
      // ⚠️ On regarde TOUT l'écran, pas `.panel-body` : MEL, la carte 3D et le
      // majordome ont leur propre gabarit (`mel-panel`, `c3d-panel`,
      // `majordome-panel`) et n'en ont pas. Une première version de ce test les
      // déclarait vides à tort — le contrôle doit épouser l'application, pas
      // l'inverse.
      const ov = document.getElementById('ov-' + id);
      if (!ov) return { absent: true };
      const txt = (ov.textContent || '').replace(/\s+/g, ' ').trim();
      // On retire le titre et le bouton de fermeture, présents même à vide.
      const entete = (ov.querySelector('.panel-title') || {}).textContent || '';
      const utile = txt.replace(entete.trim(), '').replace(/^[✕\s]+/, '').trim();
      return {
        elements: ov.querySelectorAll('*').length,
        utile: utile.length,
        // Un écran resté sur « Chargement… » n'a jamais reçu son contenu.
        // À distinguer d'un message d'échec réseau (« Impossible de charger… »),
        // qui est un état RENDU : les tests tournent sans backend, c'est normal.
        bloqueSurChargement: /^(chargement|patientez)/i.test(utile) && utile.length < 40
      };
    }, id);

    if (etat.absent || etat.bloqueSurChargement || etat.elements < 6) {
      vides.push(`${id} (${etat.absent ? 'écran absent' :
        etat.bloqueSurChargement ? 'bloqué sur « Chargement… »' : etat.elements + ' élément(s)'})`);
    }
  }

  expect(vides,
    'écran(s) ouverts VIDES depuis le plan du site — la fonction d’ouverture dédiée '
    + 'n’a pas été appelée, ou n’est pas déclarée dans PLAN_OUVERTURE')
    .toEqual([]);
});

/*
 * ⛔ LE TEST QUI ATTRAPE VRAIMENT LE BUG DE LA v4.93.
 *
 * Le test de contenu ci-dessus ne suffit PAS : vérifié par sabotage, en
 * remettant `openOv` à la place de la fonction dédiée, il restait VERT. Un
 * écran non rempli garde son gabarit — en-tête, message d'accueil — et
 * franchit n'importe quel seuil de « nombre d'éléments ». « Conseil
 * municipal » vide affiche encore sa consigne « Cliquez sur une photo ».
 *
 * Ce test-ci ne mesure pas le résultat, il vérifie LE CONTRAT : la fonction
 * d'ouverture déclarée est-elle réellement appelée, avec ses arguments ?
 * C'est la question à laquelle la v4.93 répondait non.
 */
test('_ouvrirEcran appelle bien la fonction dédiée de chaque écran', async ({ page }) => {
  const bilan = await page.evaluate(() => {
    const ids = PLAN_RUBRIQUES.flatMap(([, l]) => l).filter((id) => _titreEcran(id));
    const jamaisAppelees = [];
    const mauvaisArguments = [];

    for (const id of ids) {
      const decl = PLAN_OUVERTURE[id];
      if (!decl) continue;                       // null = openOv suffit, assumé
      const nom = Array.isArray(decl) ? decl[0] : decl;
      const attendus = Array.isArray(decl) ? decl.slice(1) : [];

      const vraie = window[nom];
      let appels = 0, recus = null;
      window[nom] = function () { appels++; recus = [...arguments]; };
      try { _ouvrirEcran(id); } catch (_) { /* peu importe : on compte l’appel */ }
      window[nom] = vraie;                       // on remet toujours la vraie

      if (!appels) { jamaisAppelees.push(`${id} → ${nom}`); continue; }
      if (JSON.stringify(recus) !== JSON.stringify(attendus)) {
        mauvaisArguments.push(`${id} → ${nom}(${JSON.stringify(recus)}) au lieu de ${JSON.stringify(attendus)}`);
      }
    }
    return { total: ids.length, jamaisAppelees, mauvaisArguments };
  });

  expect(bilan.total, 'aucun écran vérifié : le test ne mesurerait rien').toBeGreaterThan(15);
  expect(bilan.jamaisAppelees,
    'fonction(s) d’ouverture JAMAIS appelée(s) : l’écran s’ouvrira vide, comme en v4.93')
    .toEqual([]);
  expect(bilan.mauvaisArguments,
    'fonction(s) appelée(s) avec les mauvais arguments — openSuivi() sans type reste sur « Chargement… »')
    .toEqual([]);
});

test('chaque écran du plan a une fonction d’ouverture déclarée et existante', async ({ page }) => {
  const bilan = await page.evaluate(() => {
    const ids = PLAN_RUBRIQUES.flatMap(([, l]) => l).filter((id) => _titreEcran(id));
    return {
      total: ids.length,
      // null est une déclaration valide : « pas de fonction dédiée, openOv suffit ».
      nonDeclares: ids.filter((id) => !(id in PLAN_OUVERTURE)),
      // Une déclaration vaut un nom de fonction, ou un tableau
      // [nom, ...arguments] quand la fonction en attend.
      introuvables: ids.filter((id) => {
        const d = PLAN_OUVERTURE[id];
        if (!d) return false;                 // null = openOv suffit
        const n = Array.isArray(d) ? d[0] : d;
        return typeof window[n] !== 'function';
      })
    };
  });
  expect(bilan.total).toBeGreaterThan(15);
  expect(bilan.nonDeclares,
    'écran(s) sans entrée dans PLAN_OUVERTURE : ajoutez le nom de la fonction, '
    + 'ou `null` si openOv suffit').toEqual([]);
  expect(bilan.introuvables,
    'fonction(s) d’ouverture déclarée(s) mais inexistante(s) : faute de frappe, '
    + 'ou fonction renommée').toEqual([]);
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
