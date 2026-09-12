const { test, expect } = require('@playwright/test');

// ── Plusieurs photos par actualité : balayage horizontal (v4.109) ──────
//
// CE QUE CE TEST PROTÈGE, et pourquoi il ne suffit pas de regarder le JS :
//
//  1. Une actu publiée AVANT la v4.109 n'a qu'un champ `photo`. Si
//     `getActuPhotos` ne lisait que `photos[]`, la moitié du parc perdrait son
//     image — sans erreur, sans log, juste une carte sans visuel. On vérifie
//     donc les DEUX formes de stockage dans la même page.
//  2. Le balayage repose sur du CSS (`scroll-snap-type`, `flex:0 0 100%`) que
//     rien dans le JS ne trahit s'il disparaît. D'où l'assertion sur le STYLE
//     CALCULÉ, et sur la largeur réelle d'une diapositive — règle 7 du
//     CLAUDE.md : un test qui n'interroge que le JS ne prouve pas qu'un effet
//     est visible. Une seule photo, au contraire, ne DOIT PAS produire de
//     carrousel (ni barre, ni compteur) : c'est la régression la plus probable.
//  3. Le carrousel doit rester atteignable sans doigt : conteneur focusable et
//     deux boutons ≥ 44 px (clavier, souris, lecteur d'écran).
//
// L'API est bouchonnée ici (les autres specs la coupent) : sans actualités, la
// liste n'affiche qu'un message d'erreur et le test passerait à vide.

const EXTERNAL_HOSTS = [
  'googleapis.com', 'gstatic.com', 'clearbit.com',
  'open-meteo.com', 'facebook.com', 'api-adresse.data.gouv.fr',
  'apicarto.ign.fr', 'data.geopf.fr', 'cadastre.data.gouv.fr',
  'geoportail-urbanisme', 'raw.githubusercontent.com', 'res.cloudinary.com',
  'data.education.gouv.fr', 'ingest.de.sentry.io', 'sentry.io',
  'tile.openstreetmap.org', 'openstreetmap.org'
];

// Images servies en local (le shell de test les a sous la main) : matCloudImg
// laisse passer toute URL qui n'est pas Cloudinary, donc elles s'affichent
// vraiment — une diapositive vide mesurerait une largeur fausse.
const IMG = ['img/mat-header.webp', 'icon-192.png', 'icon-512.png'];

const ACTUS = [
  {
    id: 900001,
    title: 'Fête du village — plusieurs photos',
    description: 'Retour en images sur la fête du village.',
    date: '05/09/2026',
    dateISO: '2026-09-05',
    photo: IMG[0],
    photos: IMG.map((u) => ({ url: u, publicId: null })),
    source: 'admin'
  },
  {
    // Forme d'AVANT la v4.109 (et celle du webhook Facebook) : `photo` seul.
    id: 900002,
    title: 'Conseil municipal — une seule photo',
    description: 'Séance publique.',
    date: '02/09/2026',
    dateISO: '2026-09-02',
    photo: IMG[1],
    source: 'facebook'
  },
  {
    id: 900003,
    title: 'Communiqué sans photo',
    description: 'Texte seul.',
    date: '01/09/2026',
    dateISO: '2026-09-01',
    photo: null,
    source: 'admin'
  }
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mat_onboarded_v3', '1'));
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (/\/actus(\?|$)/.test(url)) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ actus: ACTUS, count: ACTUS.length })
      });
    }
    if (url.includes('onrender.com')) return route.abort();
    if (EXTERNAL_HOSTS.some((h) => url.includes(h))) return route.abort();
    return route.continue();
  });
  await page.goto('/');
  await page.waitForSelector('body.app-ready', { timeout: 15000 });
});

async function ouvrirListeActus(page) {
  await page.waitForFunction(() => typeof window.loadActus === 'function');
  await page.evaluate(() => { window.openNotifs ? window.openNotifs() : window.loadActus(); });
  await page.waitForFunction(() => typeof window.loadActus === 'function');
  await page.evaluate(() => window.loadActus());
  await expect(page.locator('#actu-list .actu-item').first()).toBeVisible({ timeout: 10000 });
}

test('trois photos → un carrousel balayable, une seule photo → aucun carrousel', async ({ page }) => {
  await ouvrirListeActus(page);

  const strips = page.locator('#actu-list .actu-gal-strip');
  // Une seule des trois actus est multi-photos : exactement un carrousel.
  await expect(strips).toHaveCount(1);
  await expect(page.locator('#actu-list .actu-gal-img')).toHaveCount(IMG.length);
  // L'actu à photo unique garde l'image simple d'avant la v4.109…
  await expect(page.locator('#actu-list img.actu-img')).toHaveCount(1);
  // …et l'actu sans photo n'a ni image ni barre.
  await expect(page.locator('#actu-list .actu-gal-bar')).toHaveCount(1);
  await expect(page.locator('#actu-list .actu-gal-count').first()).toHaveText('1 / ' + IMG.length);

  // Le balayage est du CSS : s'il disparaît, le JS ne dit rien.
  const snap = await strips.first().evaluate((el) => getComputedStyle(el).scrollSnapType);
  expect(snap).toContain('x');
  const overflow = await strips.first().evaluate((el) => getComputedStyle(el).overflowX);
  expect(['auto', 'scroll']).toContain(overflow);

  // Une diapositive = toute la largeur visible (à 1 px près), sinon deux photos
  // se partagent l'écran et le snap ne tombe plus sur une image entière.
  const mesures = await strips.first().evaluate((el) => ({
    vue: el.clientWidth,
    diapo: el.firstElementChild.getBoundingClientRect().width,
    defilable: el.scrollWidth
  }));
  expect(Math.abs(mesures.diapo - mesures.vue)).toBeLessThanOrEqual(1);
  expect(mesures.defilable).toBeGreaterThan(mesures.vue + 1);
});

test('le compteur suit le défilement et les deux boutons naviguent', async ({ page }) => {
  await ouvrirListeActus(page);
  const strip = page.locator('#actu-list .actu-gal-strip').first();
  const compteur = page.locator('#actu-list .actu-gal-count').first();

  await page.locator('#actu-list .actu-gal-nav').nth(1).click();   // ▶
  await expect(compteur).toHaveText('2 / ' + IMG.length);
  await page.locator('#actu-list .actu-gal-nav').nth(0).click();   // ◀
  await expect(compteur).toHaveText('1 / ' + IMG.length);

  // Bornes : un clic ◀ sur la première photo ne doit pas sortir de la liste.
  // ⚠️ `behavior:'smooth'` → la position n'est pas celle d'arrivée à l'instant
  // du clic (mesuré : 87 px en vol). On attend que le défilement se pose.
  await page.locator('#actu-list .actu-gal-nav').nth(0).click();
  await expect(compteur).toHaveText('1 / ' + IMG.length);
  await expect.poll(() => strip.evaluate((el) => el.scrollLeft), { timeout: 3000 }).toBeLessThanOrEqual(1);
});

test('le carrousel est utilisable sans doigt : focusable et cibles ≥ 44 px', async ({ page }) => {
  await ouvrirListeActus(page);
  const strip = page.locator('#actu-list .actu-gal-strip').first();

  // Un conteneur défilant non focusable est inatteignable au clavier.
  await expect(strip).toHaveAttribute('tabindex', '0');
  await expect(strip).toHaveAttribute('role', 'group');
  const label = await strip.getAttribute('aria-label');
  expect(label).toMatch(/\d+ photos/);

  for (const i of [0, 1]) {
    const b = page.locator('#actu-list .actu-gal-nav').nth(i);
    const box = await b.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect((await b.getAttribute('aria-label')) || '').toMatch(/Photo (précédente|suivante)/);
  }
});

test('le détail de l’actu porte son propre carrousel (compteur indépendant)', async ({ page }) => {
  await ouvrirListeActus(page);
  // Avancer d'une photo dans la LISTE avant d'ouvrir le détail : les deux
  // rendus coexistent dans le DOM, et un identifiant partagé ferait piloter
  // l'un par l'autre.
  await page.locator('#actu-list .actu-gal-nav').nth(1).click();
  await expect(page.locator('#actu-list .actu-gal-count').first()).toHaveText('2 / ' + IMG.length);

  await page.evaluate((id) => window.openActuDetail(String(id)), ACTUS[0].id);
  const detail = page.locator('#actu-detail-body .actu-gal-detail');
  await expect(detail).toBeVisible({ timeout: 10000 });
  await expect(detail.locator('.actu-gal-img')).toHaveCount(IMG.length);
  await expect(detail.locator('.actu-gal-count')).toHaveText('1 / ' + IMG.length);

  const ids = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.actu-gal-strip')).map((el) => el.id)
  );
  expect(new Set(ids).size).toBe(ids.length);
});
