// @ts-check
const { test, expect } = require('@playwright/test');
const { couperReseauExterne } = require('./helpers/reseau');

/*
 * Conseil municipal — onglets « Décisions » / « Projets » et bandeau d'accueil.
 *
 * Ce que ces tests verrouillent, et pourquoi :
 *  - la VISIBILITÉ (mandat en cours, publie, projets sans séance source) :
 *    une séance saisie mais non validée qui fuirait à l'écran serait publiée
 *    à tort — et rien d'autre ne le mesurerait ;
 *  - l'anti-doublon par id (première occurrence + console.warn), pensé pour
 *    le futur pipeline Drive → PR ;
 *  - les deux états du bandeau au MÊME emplacement, et le marquage « vue »
 *    — un matStore.get sur un id nu a détruit la clé à la première lecture
 *    pendant le développement : le test relit après clic ;
 *  - le repli en cas d'échec de chargement (message + lien officiel,
 *    bandeau masqué) ;
 *  - la navigation : openConseil() sans argument reste sur « Les élus »
 *    (bouton « Voir », [SHOW_ELUS]), les onglets ne créent AUCUNE entrée
 *    d'historique, le retour ferme l'overlay sans toucher à #ov-contact.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mat_onboarded_v3', '1'));
  await couperReseauExterne(page);
});

async function allerAccueil(page) {
  await page.goto('/');
  await page.waitForFunction(() => typeof window.matConseilOnglet === 'function');
  await page.waitForSelector('.cm-bandeau.cm-visible', { state: 'attached' });
}

test('openConseil() sans argument ouvre « Les élus », trombinoscope intact', async ({ page }) => {
  await allerAccueil(page);
  await page.evaluate(() => openConseil());
  await expect(page.locator('#conseil-tab-elus')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.trombi-item')).toHaveCount(15);
  // La modale photo existante répond toujours.
  await page.locator('.trombi-item').first().click();
  await expect(page.locator('#trombi-modal')).toBeVisible();
});

test('onglet Décisions : carte du dernier compte rendu, badges et montants', async ({ page }) => {
  await allerAccueil(page);
  await page.evaluate(() => openConseil('decisions'));
  await expect(page.locator('#conseil-tab-decisions')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.conseil-cr-sur')).toHaveText('Dernier compte rendu');
  await expect(page.locator('.conseil-cr-date')).toHaveText('Lundi 31 août 2026');
  await expect(page.locator('.conseil-cr-nb')).toContainText('8 décisions');
  // 17 décisions sur 3 séances, accordéons ouverts par défaut.
  await expect(page.locator('.conseil-dec')).toHaveCount(17);
  await expect(page.locator('.conseil-seance[open]')).toHaveCount(3);
  await expect(page.locator('.conseil-seance-partiel')).toHaveCount(2);
  // Table des badges : unanimité, majorité + détail du vote, prise d'acte.
  const badges = page.locator('.conseil-dec-badge');
  await expect(badges.filter({ hasText: 'Adopté à l’unanimité' }).first()).toBeVisible();
  const majorite = badges.filter({ hasText: 'Adopté à la majorité' });
  await expect(majorite).toHaveCount(1);
  await expect(majorite).toContainText('13 pour · 2 abstentions');
  await expect(badges.filter({ hasText: 'Le conseil en a pris acte' })).toHaveCount(1);
  // Montants selon la nature (format fr-FR, espace insécable tolérée).
  await expect(page.locator('.conseil-dec-montant').filter({ hasText: 'Recette' })).toContainText('91,65');
  await expect(page.locator('.conseil-dec-montant').filter({ hasText: 'Coût pour la commune' }).first()).toBeVisible();
  await expect(page.locator('.conseil-dec-montant').filter({ hasText: 'Subventions versées' })).toContainText('4');
  // Décisions du Maire : bloc présent, liste complète, AUCUN total.
  const dm = page.locator('.conseil-dm');
  await expect(dm).toHaveCount(1);
  await expect(dm.locator('li')).toHaveCount(12);
  await expect(dm).toContainText('délibération 2026/25');
  await expect(dm).not.toContainText(/total/i);
  // Pied : mention + lien vers les comptes rendus officiels.
  await expect(page.locator('#conseil-panel-decisions .conseil-pied')).toContainText('Seuls les documents officiels font foi');
  await expect(page.locator('#conseil-panel-decisions .conseil-pied a')).toHaveAttribute('href', /drive\.google\.com/);
});

test('filtre par thème : les autres séances disparaissent quand rien ne correspond', async ({ page }) => {
  await allerAccueil(page);
  await page.evaluate(() => openConseil('decisions'));
  await page.locator('[data-conseil-filtre="environnement"]').click();
  // Une seule décision environnement (2026/33), portée par la séance du 31/08.
  const visibles = page.locator('.conseil-dec:not(.conseil-hors-filtre)');
  await expect(visibles).toHaveCount(1);
  await expect(page.locator('.conseil-seance:not(.conseil-hors-filtre)')).toHaveCount(1);
  await page.locator('[data-conseil-filtre="tout"]').click();
  await expect(page.locator('.conseil-dec:not(.conseil-hors-filtre)')).toHaveCount(17);
});

test('onglet Projets : synthèse, groupes ordonnés, rail d’étapes accessible', async ({ page }) => {
  await allerAccueil(page);
  await page.evaluate(() => openConseil('projets'));
  await expect(page.locator('.conseil-synthese')).toHaveText('3 décidés, 2 terminés');
  await expect(page.locator('.conseil-groupe-titre')).toHaveText(['✅ Décidé', '🎉 Terminé']);
  await expect(page.locator('.conseil-projet')).toHaveCount(5);
  const rail = page.locator('.conseil-projet', { hasText: 'Climatisation' }).locator('.conseil-rail');
  await expect(rail).toHaveAttribute('aria-label', 'Étape 2 sur 4 : décidé');
  // L'étape courante est aussi écrite en toutes lettres (jamais couleur seule).
  await expect(page.locator('.conseil-rail-lib').first()).not.toBeEmpty();
  await expect(page.locator('.conseil-projet', { hasText: 'Ecopousse' })).toContainText('Année scolaire 2026-2027');
  await expect(page.locator('.conseil-projet').first()).toContainText('Mis à jour le');
});

test('visibilité : brouillons, séances hors mandat et doublons ne s’affichent pas', async ({ page }) => {
  const faux = {
    schema: 1, maj: '2026-09-26', prochaine_seance: null, depuis: '2026-04-01',
    themes: { mairie: { label: 'Mairie', ico: '🏛️', couleur: '#1A3D2B' } },
    seances: [
      { id: '2026-05-01', date: '2026-05-01', document: 'pv', drive_id: null, publie: true, resume: 'Visible.',
        decisions: [
          { id: 'D1', num: null, theme: 'mairie', titre: 'Décision visible', en_clair: 'Oui.', resultat: 'adopte', unanimite: true, vote: null, montant: null },
          { id: 'D1', num: null, theme: 'mairie', titre: 'Doublon à ignorer', en_clair: 'Non.', resultat: 'adopte', unanimite: true, vote: null, montant: null }
        ],
        decisions_maire: [] },
      { id: '2026-07-01', date: '2026-07-01', document: 'pv', drive_id: null, publie: false, resume: 'Brouillon.',
        decisions: [{ id: 'D2', num: null, theme: 'mairie', titre: 'Décision cachée', en_clair: 'Non.', resultat: 'adopte', unanimite: true, vote: null, montant: null }],
        decisions_maire: [] },
      { id: '2020-01-15', date: '2020-01-15', document: 'pv', drive_id: null, publie: true, resume: 'Ancien mandat.',
        decisions: [{ id: 'D3', num: null, theme: 'mairie', titre: 'Ancien mandat', en_clair: 'Non.', resultat: 'adopte', unanimite: true, vote: null, montant: null }],
        decisions_maire: [] }
    ],
    projets: [
      { id: 'p-visible', titre: 'Projet visible', theme: 'mairie', statut: 'decide', en_clair: 'Oui.', montant: null, echeance: null, maj: '2026-05-01', sources: ['2026-05-01'], publie: true },
      { id: 'p-brouillon', titre: 'Projet brouillon', theme: 'mairie', statut: 'decide', en_clair: 'Non.', montant: null, echeance: null, maj: '2026-05-01', sources: ['2026-05-01'], publie: false },
      { id: 'p-source-cachee', titre: 'Projet de séance cachée', theme: 'mairie', statut: 'decide', en_clair: 'Non.', montant: null, echeance: null, maj: '2026-07-01', sources: ['2026-07-01'], publie: true }
    ]
  };
  const avertissements = [];
  page.on('console', (m) => { if (m.type() === 'warning') avertissements.push(m.text()); });
  // Posé APRÈS couperReseauExterne : le dernier page.route inscrit gagne.
  await page.route('**/data/conseil.json*', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(faux) }));
  await allerAccueil(page);
  await page.evaluate(() => openConseil('decisions'));
  await expect(page.locator('.conseil-dec')).toHaveCount(1);
  await expect(page.locator('#conseil-panel-decisions')).not.toContainText('Décision cachée');
  await expect(page.locator('#conseil-panel-decisions')).not.toContainText('Ancien mandat');
  await expect(page.locator('#conseil-panel-decisions')).not.toContainText('Doublon à ignorer');
  expect(avertissements.some((t) => t.includes('id en double'))).toBe(true);
  await page.evaluate(() => matConseilOnglet('projets'));
  await expect(page.locator('.conseil-projet')).toHaveCount(1);
  await expect(page.locator('#conseil-panel-projets')).toContainText('Projet visible');
  // Bandeau : accordé au singulier (1 décision visible).
  await expect(page.locator('.cm-ligne-txt').first()).toContainText('1 décision');
});

test('bandeau : état Nouveau, clic → Décisions, séance marquée vue', async ({ page }) => {
  await allerAccueil(page);
  const ligne = page.locator('.cm-ligne:visible').first();
  await expect(ligne).toContainText('Conseil du 31 août : 8 décisions');
  await expect(ligne).toHaveClass(/is-nouveau/);
  const aria = await ligne.getAttribute('aria-label');
  expect(aria).toContain('nouveau');
  await ligne.click();
  await expect(page.locator('#ov-conseil')).toHaveClass(/open/);
  await expect(page.locator('#conseil-tab-decisions')).toHaveAttribute('aria-selected', 'true');
  // Marquée vue : la clé persiste (le piège matStore l'a détruite une fois),
  // la pastille s'éteint, le bandeau reste au même emplacement.
  await expect.poll(() => page.evaluate(() => localStorage.getItem('mat_conseil_vu'))).toBe('2026-08-31');
  await expect(page.locator('.cm-ligne:visible').first()).not.toHaveClass(/is-nouveau/);
  await expect(page.locator('.cm-ligne:visible').first()).toBeVisible();
});

test('échec de chargement : message avec lien officiel, bandeau masqué', async ({ page }) => {
  await page.route('**/data/conseil.json*', (route) => route.fulfill({ status: 500, body: 'boom' }));
  await page.goto('/');
  await page.waitForFunction(() => typeof window.matConseilOnglet === 'function');
  await page.evaluate(() => openConseil('decisions'));
  await expect(page.locator('#conseil-panel-decisions .conseil-echec'))
    .toContainText('Les décisions ne sont pas disponibles pour le moment.');
  await expect(page.locator('#conseil-panel-decisions .conseil-echec a')).toHaveAttribute('href', /drive\.google\.com/);
  await expect(page.locator('.cm-bandeau.cm-visible')).toHaveCount(0);
});

test('navigation : onglets sans historique, retour ferme conseil et garde contact', async ({ page }) => {
  await allerAccueil(page);
  // Conseil ouvert par-dessus Contact (bouton « Voir » : openConseil() nu).
  await page.evaluate(() => { openContact(); openConseil(); });
  const avant = await page.evaluate(() => history.length);
  await page.locator('#conseil-tab-decisions').click();
  await page.locator('#conseil-tab-projets').click();
  expect(await page.evaluate(() => history.length)).toBe(avant);
  await page.goBack();
  await expect(page.locator('#ov-conseil')).not.toHaveClass(/open/);
  await expect(page.locator('#ov-contact')).toHaveClass(/open/);
});

test('accessibilité : cibles 44 px, libellés 16 px, flèches entre onglets', async ({ page }) => {
  await allerAccueil(page);
  await page.evaluate(() => openConseil('decisions'));
  // L'ouverture passe par une View Transition asynchrone : attendre que la
  // barre soit rendue avant de mesurer (boundingBox ne réessaie pas).
  await expect(page.locator('.conseil-tab').first()).toBeVisible();
  for (const tab of await page.locator('.conseil-tab').all()) {
    const boite = await tab.boundingBox();
    expect(boite && boite.height).toBeGreaterThanOrEqual(44);
    const taille = await tab.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(taille).toBeGreaterThanOrEqual(16);
  }
  // Texte courant des décisions ≥ 16 px (public senior).
  const clair = await page.locator('.conseil-dec-clair').first()
    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(clair).toBeGreaterThanOrEqual(16);
  // Flèches : Décisions → (droite) Projets → (droite) Les élus (boucle).
  await page.locator('#conseil-tab-decisions').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#conseil-tab-projets')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#conseil-tab-projets')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#conseil-tab-elus')).toHaveAttribute('aria-selected', 'true');
});

test('tampon : joué une fois par séance, jamais sous prefers-reduced-motion', async ({ page }) => {
  await allerAccueil(page);
  await page.evaluate(() => openConseil('decisions'));
  await expect(page.locator('.conseil-sceau-wrap')).toHaveClass(/conseil-tampon-anim/);
  // Deuxième ouverture : même séance, pas de rejouage.
  await page.evaluate(() => { closeOv('conseil'); openConseil('decisions'); });
  await expect(page.locator('.conseil-sceau-wrap')).not.toHaveClass(/conseil-tampon-anim/);
});

test('tampon absent quand l’habitant demande moins d’animations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await allerAccueil(page);
  await page.evaluate(() => openConseil('decisions'));
  await expect(page.locator('.conseil-sceau-wrap')).not.toHaveClass(/conseil-tampon-anim/);
});

test.describe('bureau (≥ 1024 px)', () => {
  test('panneau élargi, grilles, bouton de navigation avec pastille', async ({ page }) => {
    const viewport = page.viewportSize();
    test.skip(!viewport || viewport.width < 1024, 'mise en page ordinateur uniquement');
    await allerAccueil(page);
    // Bouton 🏛️ Conseil dans .d-nav-links, pastille Nouveau visible.
    const bouton = page.locator('.d-nav-links button', { hasText: 'Conseil' });
    await expect(bouton).toBeVisible();
    await expect(page.locator('#conseil-badge-desktop')).toBeVisible();
    await bouton.click();
    await expect(page.locator('#conseil-tab-decisions')).toHaveAttribute('aria-selected', 'true');
    // View Transition asynchrone : attendre le rendu avant de mesurer.
    await expect(page.locator('#ov-conseil')).toHaveClass(/open/);
    await expect(page.locator('.conseil-cr')).toBeVisible();
    // Seul #ov-conseil est élargi (point validé n° 3).
    const largeur = await page.locator('#ov-conseil .panel').evaluate((el) => el.getBoundingClientRect().width);
    expect(largeur).toBeGreaterThan(700);
    // Décisions en 2 colonnes — mesuré sur le style calculé, pas déduit.
    const colonnes = await page.locator('.conseil-seance-corps').first()
      .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(colonnes).toBe(2);
    // La séance est vue : la pastille de navigation s'éteint.
    await expect(page.locator('#conseil-badge-desktop')).toBeHidden();
  });
});
