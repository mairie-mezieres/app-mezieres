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
  test('Cléry à jour : Cléry est affichée, avec la date de son relevé', async ({ page }) => {
    const clery = releve(0, 1.719, 1.659);
    await ouvrirAvecCarburant(page, {
      clery:  { label: 'Intermarché Cléry-St-André', ...clery },
      olivet: { label: 'E.Leclerc Olivet', ...releve(0, 1.649, 1.589) }
    });

    const nom = page.locator('#fuel-prices .fuel-station-name');
    await expect(nom).toHaveText('Intermarché Cléry ' + clery._court);
    // Cléry n'est pas la moins chère : la proximité prime tant qu'elle est à jour.
    await expect(page.locator('#fuel-prices')).toContainText('1.719');
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

  test('sans aucune date, on reste sur Cléry', async ({ page }) => {
    await ouvrirAvecCarburant(page, {
      clery:  { label: 'Intermarché Cléry-St-André', sp95: 1.719, gazole: 1.659, maj: null, majISO: null },
      olivet: { label: 'E.Leclerc Olivet', sp95: 1.649, gazole: 1.589, maj: null, majISO: null }
    });
    await expect(page.locator('#fuel-prices .fuel-station-name')).toHaveText('Intermarché Cléry');
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
