const { test, expect } = require('@playwright/test');

// Bandeau « Carburant » de l'accueil — fraîcheur du relevé.
//
// Le relevé national (data.economie.gouv.fr) n'est pas quotidien : celui de
// l'Intermarché de Cléry peut dater de plusieurs jours. Le bandeau affichait
// ce prix sans sa date — un prix périmé y était indistinguable d'un prix du
// jour. Deux règles depuis, et TOUJOURS en deux lignes :
//   1. la date du relevé est écrite sur la ligne du nom ;
//   2. si Cléry a pris du retard, on montre la station la MOINS CHÈRE parmi
//      celles dont le relevé est le plus récent.
//
// Les tests tournent sans backend : on sert un payload /carburant fabriqué.

const EXTERNAL_HOSTS = [
  'googleapis.com', 'gstatic.com', 'clearbit.com',
  'open-meteo.com', 'facebook.com', 'api-adresse.data.gouv.fr',
  'apicarto.ign.fr', 'data.geopf.fr', 'cadastre.data.gouv.fr',
  'geoportail-urbanisme', 'raw.githubusercontent.com', 'res.cloudinary.com',
  'data.education.gouv.fr', 'ingest.de.sentry.io', 'sentry.io',
  'tile.openstreetmap.org', 'openstreetmap.org'
];

function pad(n) { return String(n).padStart(2, '0'); }

// Un relevé à J-delta, tel que le backend l'envoie : horodatage brut + la
// chaîne « JJ/MM HH:MM » (sans année) qu'affiche déjà le panneau.
function releve(delta, sp95, gazole) {
  const n = new Date();
  const d = new Date(n.getFullYear(), n.getMonth(), n.getDate() - delta, 10, 30, 0);
  return {
    sp95, gazole,
    maj: pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()),
    majISO: d.toISOString(),
    _court: pad(d.getDate()) + '/' + pad(d.getMonth() + 1)
  };
}

async function ouvrirAvecCarburant(page, payload) {
  await page.addInitScript(() => { localStorage.setItem('mat_onboarded_v3', '1'); });
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (EXTERNAL_HOSTS.some((h) => url.includes(h))) return route.abort();
    return route.continue();
  });
  await page.route('**/carburant', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) })
  );
  await page.goto('/index.html');
  // Présence, pas visibilité : le bandeau est masqué en rendu bureau, qui a
  // sa propre mise en page — le même code le remplit dans les deux cas.
  await expect(page.locator('#fuel-prices .fuel-station-name')).toHaveCount(1, { timeout: 15000 });
}

test.describe('Bandeau carburant — fraîcheur du relevé', () => {
  test('⛔ à date égale, la moins chère gagne — même contre Cléry', async ({ page }) => {
    // Le 16 septembre 2026, les six stations étaient au 16/09 : Cléry gardait
    // le bandeau à 2.436 € pendant que le panneau classait trois stations à
    // 2.369 € avant elle. La proximité ne départage plus qu'à PRIX égal.
    const olivet = releve(0, 1.649, 1.589);
    await ouvrirAvecCarburant(page, {
      clery:  { label: 'Intermarché Cléry-St-André', ...releve(0, 1.719, 1.659) },
      olivet: { label: 'E.Leclerc Olivet', ...olivet }
    });

    await expect(page.locator('#fuel-prices .fuel-station-name'))
      .toHaveText('Leclerc Olivet ' + olivet._court);
    await expect(page.locator('#fuel-prices')).toContainText('1.589');
    await expect(page.locator('#fuel-prices')).not.toContainText('1.659');
  });

  test('Cléry gagne encore à date ET prix égaux (proximité)', async ({ page }) => {
    const clery = releve(0, 1.719, 1.659);
    await ouvrirAvecCarburant(page, {
      clery:  { label: 'Intermarché Cléry-St-André', ...clery },
      olivet: { label: 'E.Leclerc Olivet', ...releve(0, 1.719, 1.659) }
    });
    await expect(page.locator('#fuel-prices .fuel-station-name'))
      .toHaveText('Intermarché Cléry ' + clery._court);
  });

  test('Cléry en retard : la moins chère des stations les plus récentes', async ({ page }) => {
    const frais = releve(0, 1.699, 1.629);
    await ouvrirAvecCarburant(page, {
      clery:      { label: 'Intermarché Cléry-St-André', ...releve(4, 1.659, 1.599) },
      meung:      { label: 'Super U Meung-sur-Loire',    ...releve(0, 1.749, 1.689) },
      olivet:     { label: 'E.Leclerc Olivet',           ...frais },
      beaugency:  { label: 'E.Leclerc Beaugency',        ...releve(2, 1.609, 1.549) }
    });

    const nom = page.locator('#fuel-prices .fuel-station-name');
    // Olivet : relevé du jour, et gazole le plus bas parmi les relevés du jour.
    // Beaugency est moins chère mais son relevé date de 2 jours.
    await expect(nom).toHaveText('Leclerc Olivet ' + frais._court);
    await expect(page.locator('#fuel-prices')).toContainText('1.629');
    await expect(page.locator('#fuel-prices')).not.toContainText('1.549');
  });

  test('le bandeau garde exactement deux lignes', async ({ page }) => {
    await ouvrirAvecCarburant(page, {
      clery:  { label: 'Intermarché Cléry-St-André', ...releve(6, 1.719, 1.659) },
      olivet: { label: 'E.Leclerc Olivet', ...releve(0, 1.649, 1.589) }
    });
    await expect(page.locator('#fuel-prices .fuel-price-row')).toHaveCount(2);
  });

  test('sur un écran étroit, c’est le nom qui s’abrège — jamais la date', async ({ page }) => {
    // La ligne « Intermarché Cléry 31/08 » dépasse de quelques pixels sur un
    // écran de 360 px. Sans le découpage en deux `<span>`, l'ellipse de fin
    // rognait la DATE, c'est-à-dire l'information qu'on venait d'ajouter.
    const clery = releve(0, 1.719, 1.659);
    await ouvrirAvecCarburant(page, {
      clery: { label: 'Intermarché Cléry-St-André', ...clery }
    });
    await page.setViewportSize({ width: 320, height: 700 });
    const mesure = await page.evaluate(() => {
      const maj = document.querySelector('#fuel-prices .fuel-station-maj');
      return { texte: maj.textContent.trim(), sw: maj.scrollWidth, cw: maj.clientWidth };
    });
    expect(mesure.texte).toBe(clery._court);
    expect(mesure.sw).toBeLessThanOrEqual(mesure.cw);
  });

  test('sans aucune date, il ne reste que le prix pour départager', async ({ page }) => {
    // Aucune fraîcheur à comparer : préférer Cléry serait préférer une station
    // sans rien pour le justifier.
    await ouvrirAvecCarburant(page, {
      clery:  { label: 'Intermarché Cléry-St-André', sp95: 1.719, gazole: 1.659, maj: null, majISO: null },
      olivet: { label: 'E.Leclerc Olivet', sp95: 1.649, gazole: 1.589, maj: null, majISO: null }
    });
    await expect(page.locator('#fuel-prices .fuel-station-name')).toHaveText('Leclerc Olivet');
  });

  test('payload de l’ancien backend (sans majISO) : la date « JJ/MM » suffit', async ({ page }) => {
    const clery = releve(3, 1.719, 1.659);
    const olivet = releve(0, 1.649, 1.589);
    await ouvrirAvecCarburant(page, {
      clery:  { label: 'Intermarché Cléry-St-André', sp95: clery.sp95,  gazole: clery.gazole,  maj: clery.maj },
      olivet: { label: 'E.Leclerc Olivet',           sp95: olivet.sp95, gazole: olivet.gazole, maj: olivet.maj }
    });
    await expect(page.locator('#fuel-prices .fuel-station-name')).toHaveText('Leclerc Olivet ' + olivet._court);
  });
});

// ── Panneau détaillé (« Voir les 5 stations ») ─────────────────────────
//
// Le bandeau choisit la MOINS CHÈRE parmi les relevés les plus récents ; la
// liste détaillée, elle, restait rangée par proximité. La station mise en
// avant à l'accueil pouvait donc apparaître en 3ᵉ position — la liste semblait
// contredire le bandeau. Elle porte désormais le même ordre : relevé le plus
// récent d'abord, puis prix croissant à date égale.
//
// Et la fraîcheur se voit : teinte de fond neutre pour un relevé du jour, gris
// clair à 1-2 jours, gris plus soutenu au-delà. La couleur n'est qu'un rappel
// — chaque carte écrit son âge en toutes lettres (RGAA 1.1).

async function ouvrirPanneauCarburant(page, payload) {
  await ouvrirAvecCarburant(page, payload);
  await page.evaluate(() => window.openCarburant());
  await expect(page.locator('#carburant-panel-body .fuel-card').first()).toBeVisible({ timeout: 10000 });
}

test.describe('Panneau carburant — tri et fraîcheur', () => {
  test('relevé le plus récent d’abord, puis prix croissant', async ({ page }) => {
    await ouvrirPanneauCarburant(page, {
      clery:      { label: 'Intermarché Cléry-St-André', ...releve(4, 1.659, 1.599) },
      meung:      { label: 'Super U Meung-sur-Loire',    ...releve(0, 1.749, 1.689) },
      olivet:     { label: 'E.Leclerc Olivet',           ...releve(0, 1.699, 1.629) },
      beaugency:  { label: 'E.Leclerc Beaugency',        ...releve(2, 1.609, 1.549) },
      saintpryve: { label: 'Super U Les Quinze Pierres', sp95: 1.679, gazole: 1.619, maj: null, majISO: null }
    });

    const noms = await page.locator('#carburant-panel-body .fuel-card-nom').allTextContents();
    expect(noms.map((t) => t.replace(/^\S+\s/, ''))).toEqual([
      'E.Leclerc Olivet',            // aujourd'hui, gazole 1.629
      'Super U Meung-sur-Loire',     // aujourd'hui, gazole 1.689
      'E.Leclerc Beaugency',         // J-2, pourtant la moins chère
      'Intermarché Cléry-St-André',  // J-4
      'Super U Les Quinze Pierres'   // date inconnue : jamais supposée fraîche
    ]);
  });

  test('l’âge du relevé est écrit, et la teinte le rappelle', async ({ page }) => {
    await ouvrirPanneauCarburant(page, {
      clery:     { label: 'Intermarché Cléry-St-André', ...releve(0, 1.719, 1.659) },
      meung:     { label: 'Super U Meung-sur-Loire',    ...releve(1, 1.729, 1.669) },
      olivet:    { label: 'E.Leclerc Olivet',           ...releve(5, 1.649, 1.589) }
    });

    const cartes = page.locator('#carburant-panel-body .fuel-card');
    await expect(cartes).toHaveCount(3);
    await expect(cartes.nth(0)).toContainText('Relevé du jour');
    await expect(cartes.nth(1)).toContainText('Relevé d\'hier');
    await expect(cartes.nth(2)).toContainText('Relevé d\'il y a 5 jours');

    // ⚠️ La teinte est posée par le CSS : un test qui n'interroge que le JS
    // ne prouverait pas qu'elle se voit. On mesure le rendu (règle 7 du
    // CLAUDE.md), et on exige trois fonds DISTINCTS.
    const fonds = await cartes.evaluateAll((els) =>
      els.map((e) => getComputedStyle(e).backgroundColor));
    expect(new Set(fonds).size).toBe(3);
    await expect(cartes.nth(0)).not.toHaveClass(/fuel-card--/);
    await expect(cartes.nth(1)).toHaveClass(/fuel-card--tiede/);
    await expect(cartes.nth(2)).toHaveClass(/fuel-card--froid/);
  });

  test('un relevé d’hier 23 h reste « hier », pas « du jour »', async ({ page }) => {
    // ⛔ ADR-0031 : un nombre de jours ne se calcule pas par une division.
    // À 23 h, l'écart au « maintenant » du matin vaut 0,4 jour — donc 0 si on
    // divise, donc « relevé du jour » pour un prix de la veille.
    const n = new Date();
    const hier = new Date(n.getFullYear(), n.getMonth(), n.getDate() - 1, 23, 45, 0);
    await ouvrirPanneauCarburant(page, {
      clery: { label: 'Intermarché Cléry-St-André', sp95: 1.719, gazole: 1.659,
               maj: '—', majISO: hier.toISOString() }
    });
    const carte = page.locator('#carburant-panel-body .fuel-card').first();
    await expect(carte).toContainText('Relevé d\'hier');
    await expect(carte).toHaveClass(/fuel-card--tiede/);
  });
});

// ── Une date PAR CARBURANT ─────────────────────────────────────────────
//
// Le relevé national date chaque carburant séparément. Le 16 septembre 2026,
// le E.Leclerc « Beaugency » (en réalité Tavers, 45190) servait un SP95 relevé
// le 08/09 et un gazole relevé le 16/09 — et la carte annonçait « relevé d'il
// y a 8 jours » pour les deux, parce que le backend ne gardait que la première
// date trouvée. Un prix du matin passait pour un prix de la semaine passée ;
// l'ordre des champs inversé, c'est un prix périmé qui passerait pour frais.

function releveSepare(sp95, sp95Delta, gazole, gazoleDelta) {
  const s = releve(sp95Delta, sp95, null);
  const g = releve(gazoleDelta, null, gazole);
  return {
    sp95, gazole,
    sp95Maj: s.maj,   sp95MajISO: s.majISO,
    gazoleMaj: g.maj, gazoleMajISO: g.majISO,
    // Le backend expose au niveau station le PLUS ANCIEN des deux : la date
    // annoncée doit rester vraie pour tous les prix montrés.
    maj: sp95Delta >= gazoleDelta ? s.maj : g.maj,
    majISO: sp95Delta >= gazoleDelta ? s.majISO : g.majISO,
    _courtSp95: s._court, _courtGazole: g._court
  };
}

test.describe('Panneau carburant — seul le relevé le plus récent s’affiche', () => {
  test('le carburant en retard n’est pas affiché, et son absence est dite', async ({ page }) => {
    const beaugency = releveSepare(2.149, 8, 2.369, 0);
    await ouvrirPanneauCarburant(page, {
      beaugency: { label: 'E.Leclerc Beaugency', ...beaugency }
    });

    const carte = page.locator('#carburant-panel-body .fuel-card').first();
    // Seul le gazole du jour est montré — le SP95 du 08/09 ne l'est pas.
    await expect(carte.locator('.fuel-card-prix')).toHaveCount(1);
    await expect(carte).toContainText('Diesel 2.369');
    await expect(carte).not.toContainText('2.149');

    // Une seule date, celle des prix montrés, et une carte « du jour ».
    await expect(carte.locator('.fuel-card-maj')).toHaveCount(1);
    await expect(carte).toContainText('Relevé du jour');
    await expect(carte).not.toHaveClass(/fuel-card--/);

    // ⛔ Le carburant écarté est nommé : une absence muette se lirait
    // « cette station ne vend pas de SP95 ».
    const omis = carte.locator('.fuel-card-omis');
    await expect(omis).toHaveCount(1);
    await expect(omis).toContainText('SP95');
    await expect(omis).toContainText(beaugency._courtSp95);
    await expect(omis).toContainText('non affiché');
  });

  test('même date pour les deux : les deux prix, une seule ligne', async ({ page }) => {
    const clery = releve(0, 2.239, 2.436);
    await ouvrirPanneauCarburant(page, {
      clery: { label: 'Intermarché Cléry-St-André', ...clery }
    });
    const carte = page.locator('#carburant-panel-body .fuel-card').first();
    await expect(carte.locator('.fuel-card-prix')).toHaveCount(2);
    await expect(carte.locator('.fuel-card-omis')).toHaveCount(0);
    await expect(carte.locator('.fuel-card-maj')).toHaveCount(1);
    await expect(carte).toContainText('Relevé du jour');
  });

  test('le bandeau d’accueil ne montre pas non plus le prix écarté', async ({ page }) => {
    // ⛔ Le bandeau et le panneau lisent la même règle : un prix écarté là ne
    // peut pas réapparaître ici, sinon les deux écrans se contredisent.
    const beaugency = releveSepare(2.149, 8, 2.369, 0);
    await ouvrirAvecCarburant(page, {
      beaugency: { label: 'E.Leclerc Beaugency', ...beaugency }
    });
    const bandeau = page.locator('#fuel-prices');
    await expect(bandeau).toContainText('2.369');
    await expect(bandeau).not.toContainText('2.149');
    await expect(bandeau.locator('.fuel-station-maj')).toHaveText(' ' + beaugency._courtGazole);
  });

  test('⛔ le bandeau porte TOUJOURS la première carte du panneau', async ({ page }) => {
    // L'invariant que la v4.120 a violé en production : le bandeau annonçait
    // Cléry (2.436 €) au-dessus d'un panneau qui classait trois stations
    // moins chères avant elle, sous le titre « classées par prix croissant ».
    // Depuis, le bandeau ne choisit plus — il lit `_carburantOrdonner[0]`.
    // Ce jeu reproduit la journée du 16/09 : tout le monde au même jour,
    // Cléry la plus chère, et la proximité qui la mettait en tête.
    await ouvrirPanneauCarburant(page, {
      clery:      { label: 'Intermarché Cléry-St-André', ...releve(0, 2.239, 2.436) },
      meung:      { label: 'Super U Meung-sur-Loire',    ...releve(0, 2.259, 2.369) },
      olivet:     { label: 'E.Leclerc Olivet',           ...releve(0, 2.188, 2.369) },
      saintpryve: { label: 'Super U Les Quinze Pierres', ...releve(1, 2.219, 2.349) }
    });

    const premiere = await page.locator('#carburant-panel-body .fuel-card-nom')
      .first().textContent();
    // Le libellé du panneau est complet, le bandeau l'abrège : on compare la
    // clé de station plutôt que le texte — c'est l'identité qui doit coïncider.
    expect(premiere.replace(/^\S+\s/, '')).toBe('Super U Meung-sur-Loire');
    await expect(page.locator('#fuel-prices .fuel-station-nom')).toHaveText('Super U Meung');
    // ⛔ Et surtout : pas Cléry, la plus proche et la plus chère du jour.
    await expect(page.locator('#fuel-prices')).not.toContainText('2.436');
  });

  // ⚠️ Les deux stations du 45160 — E.Leclerc Olivet et le relais du Coudray —
  // ne sont départagées que par leur identifiant, côté backend (ADR-0047). Ici
  // on verrouille l'autre moitié : deux cartes DISTINCTES, avec chacune son nom
  // et son prix. Retiré en v4.119 faute d'identifiant vérifiable, le relais est
  // revenu en v4.120 ; ce cas a couvert l'intervalle en n'affirmant rien de
  // plus que ce que le front sait faire.
  test('les deux stations d’Olivet s’affichent séparément', async ({ page }) => {
    await ouvrirPanneauCarburant(page, {
      clery:   { label: 'Intermarché Cléry-St-André', ...releve(2, 2.239, 2.436) },
      olivet:  { label: 'E.Leclerc Olivet', ...releve(0, 2.209, 2.379) },
      coudray: { label: 'TotalEnergies Relais du Coudray', ...releve(0, 2.199, 2.359) }
    });
    const noms = await page.locator('#carburant-panel-body .fuel-card-nom').allTextContents();
    expect(noms.map((t) => t.replace(/^\S+\s/, ''))).toEqual([
      'TotalEnergies Relais du Coudray',
      'E.Leclerc Olivet',
      'Intermarché Cléry-St-André'
    ]);
    // ⛔ Deux cartes, deux prix : un même enregistrement servi deux fois se
    // verrait ici, et nulle part ailleurs.
    const corps = page.locator('#carburant-panel-body');
    await expect(corps).toContainText('2.359');
    await expect(corps).toContainText('2.379');
    // Et le relais, plus récent et moins cher, prend la tête du bandeau.
    await expect(page.locator('#fuel-prices .fuel-station-name')).toHaveText(/^Total Coudray /);
  });
});
