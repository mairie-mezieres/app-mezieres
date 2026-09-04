// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

/*
 * « Le jeu du moment » — tuile, pastille, route stable, archives, hors-ligne.
 *
 * CE QUE CES TESTS DÉFENDENT, ET POURQUOI
 * ---------------------------------------
 *  1. AUCUN NOM DE JEU DANS LE CODE. Le titre et la saison affichés doivent
 *     venir de `jeux/jeux.json`, jamais du HTML. Le test lit le manifeste sur
 *     le disque et exige que l'écran dise la même chose : si quelqu'un recopie
 *     « La Hotte » dans une tuile « en attendant », la promesse « changer de
 *     jeu ne touche aucun code » est morte, et personne ne le verrait avant la
 *     saison suivante.
 *  2. LA PASTILLE S'ÉTEINT. Elle ne doit pas rester allumée après la visite,
 *     ni se rallumer toute seule — un badge qui ment est pire que pas de badge.
 *  3. AUCUNE REQUÊTE PENDANT UNE PARTIE. C'est la propriété qui rend le jeu
 *     jouable en mode avion ET qui garantit qu'aucune donnée ne sort. Elle se
 *     perd d'un seul caractère (une police distante, un CDN) et rien ne le
 *     signalerait : le jeu marcherait très bien au bureau, en 4G.
 *  4. LE PLAN DU SITE LE CONNAÎT. `/jeu` n'est pas un `.ov` : le relevé
 *     automatique des écrans ne peut pas le voir (RGAA 12.3).
 *
 * ⚠️ Le service worker est BLOQUÉ sous Playwright (ADR-0006) : ces tests ne
 * peuvent donc PAS mesurer le précache hors-ligne. Ce qu'ils vérifient, c'est
 * ce dont dépend le hors-ligne — que le jeu ne demande rien au réseau, et que
 * le service worker déclare bien la coquille. Le reste se vérifie à la main,
 * en mode avion, sur un vrai téléphone.
 */

const RACINE = path.resolve(__dirname, '..', '..');
const MANIFESTE = JSON.parse(fs.readFileSync(path.join(RACINE, 'jeux', 'jeux.json'), 'utf8'));
const COURANT = MANIFESTE.jeux.find((j) => j.id === MANIFESTE.courant);

const HOTES = ['onrender.com', 'googleapis.com', 'gstatic.com', 'clearbit.com',
  'open-meteo.com', 'facebook.com', 'api-adresse.data.gouv.fr', 'apicarto.ign.fr',
  'data.geopf.fr', 'cadastre.data.gouv.fr', 'geoportail-urbanisme',
  'raw.githubusercontent.com', 'res.cloudinary.com', 'data.education.gouv.fr', 'sentry.io'];

/**
 * Coupe le réseau externe et ouvre l'accueil, avec l'état de stockage voulu.
 *
 * ⚠️ Le semis ne joue QU'UNE FOIS par contexte. `addInitScript` s'exécute à
 * chaque navigation : sans ce garde-fou, il effacerait « jeu-vu » juste après
 * que /jeu vient de l'écrire, et le test conclurait à une panne inexistante.
 *
 * ⚠️ Un manifeste simulé doit être enregistré APRÈS le fourre-tout `**\/*` :
 * quand deux routes correspondent, Playwright retient la DERNIÈRE déclarée.
 * Enregistré avant, le fourre-tout le court-circuite et le test mesure le vrai
 * manifeste sans s'en apercevoir.
 */
async function accueil(page, seed, manifeste) {
  await page.addInitScript((vu) => {
    localStorage.setItem('mat_onboarded_v3', '1');
    if (localStorage.getItem('mat_semis_test')) return;
    localStorage.setItem('mat_semis_test', '1');
    if (vu) localStorage.setItem('jeu-vu', vu);
    else localStorage.removeItem('jeu-vu');
  }, seed || '');
  await page.route('**/*', (r) => HOTES.some((h) => r.request().url().includes(h)) ? r.abort() : r.continue());
  if (manifeste) {
    await page.route('**/jeux/jeux.json', (r) => r.fulfill({
      contentType: 'application/json', body: JSON.stringify(manifeste)
    }));
  }
  await page.goto('/');
  await page.waitForSelector('body.app-ready', { timeout: 15000 });
  await page.waitForFunction(() => {
    const t = document.querySelector('[data-jeu-titre]');
    return t && t.textContent.trim().length > 0;
  }, null, { timeout: 10000 });
}

/* ── 1. Le manifeste lui-même ──────────────────────────────────────── */

test('le manifeste est complet et « courant » désigne un jeu existant', () => {
  expect(Array.isArray(MANIFESTE.jeux), 'jeux/jeux.json : « jeux » doit être un tableau').toBe(true);
  expect(MANIFESTE.jeux.length).toBeGreaterThan(0);
  expect(COURANT, `« courant » vaut « ${MANIFESTE.courant} », qui ne correspond à aucun jeu`).toBeTruthy();

  for (const j of MANIFESTE.jeux) {
    for (const champ of ['id', 'titre', 'saison', 'resume', 'fichier', 'publie']) {
      expect(j[champ], `le jeu « ${j.id} » n’a pas de « ${champ} »`).toBeTruthy();
    }
    expect(j.publie, `« publie » de « ${j.id} » doit être une date AAAA-MM-JJ`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(fs.existsSync(path.join(RACINE, j.fichier.replace(/^\/+/, ''))),
      `le fichier de « ${j.id} » est absent du dépôt : ${j.fichier}`).toBe(true);
  }
});

/* ── 2. La propriété qui fait tout tenir : rien ne sort ─────────────── */

test('aucun jeu ne dépend du réseau (ni CDN, ni police distante, ni appel)', () => {
  for (const j of MANIFESTE.jeux) {
    const html = fs.readFileSync(path.join(RACINE, j.fichier.replace(/^\/+/, '')), 'utf8');

    const externes = (html.match(/https?:\/\/[^"'\s)]+/g) || []);
    expect(externes, `« ${j.id} » cite un domaine externe — le hors-ligne et la `
      + `confidentialité en dépendent`).toEqual([]);

    for (const interdit of [/\bfetch\s*\(/, /XMLHttpRequest/, /importScripts/, /new\s+Worker/,
      /EventSource/, /navigator\.sendBeacon/, /@import/, /@font-face/]) {
      expect(interdit.test(html), `« ${j.id} » utilise ${interdit} : le jeu doit être `
        + `entièrement autonome`).toBe(false);
    }
  }
});

/* ── 3. La tuile de l'accueil ──────────────────────────────────────── */

/* ⚠️ La tuile vit dans la grille du TÉLÉPHONE, masquée au-delà de 1024 px : la
   mise en page bureau n'a pas encore de point d'entrée vers le jeu, l'accès s'y
   fait par le plan du site (pied de page). Sans ce garde-fou, les assertions de
   visibilité et de focus mesureraient une boîte de hauteur nulle — et
   `toBeHidden()` serait vraie pour la mauvaise raison, ce qui est la façon
   classique de faire verdir un contrôle qui ne mesure rien (ADR-0030). */
function mobileSeulement(viewport) {
  test.skip(!viewport || viewport.width >= 1024, 'grille du téléphone uniquement');
}

test('la tuile annonce le jeu du manifeste, sans rien recopier dans le code', async ({ page }) => {
  await accueil(page);
  const tuile = page.locator('[data-jeu-tuile]');

  await expect(tuile).toHaveCount(1);
  await expect(tuile.locator('.ct-label')).toHaveText('Le jeu du moment');
  await expect(tuile.locator('[data-jeu-titre]')).toHaveText(COURANT.titre);
  await expect(tuile.locator('[data-jeu-saison]')).toHaveText(COURANT.saison);

  // La route stable, celle des affiches et des QR codes.
  expect(new URL(await tuile.getAttribute('href'), page.url()).pathname).toBe('/jeu/');

  // ⛔ Le nom du jeu ne doit vivre QUE dans le manifeste. S'il apparaît dans le
  // HTML servi, c'est qu'on l'y a recopié — et la rotation du jeu suivant
  // laisserait l'ancien titre affiché.
  //
  // ⚠️ Une exception, et une seule : le CHANGELOG. Il nomme le jeu parce qu'il
  // raconte ce qui est arrivé un jour donné — c'est de l'histoire, pas de
  // l'affichage, et elle ne se périme pas. On l'écarte du relevé, en vérifiant
  // qu'on l'a bien trouvé : sans ce garde-fou, un `indexOf` à -1 découperait la
  // chaîne au mauvais endroit et le contrôle deviendrait vert sans rien mesurer.
  const html = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8');
  const iChangelog = html.indexOf('id="ov-changelog"');
  expect(iChangelog, 'overlay du changelog introuvable : le découpage ne vaut rien')
    .toBeGreaterThan(0);
  const horsChangelog = html.slice(0, iChangelog);
  expect(horsChangelog.includes(COURANT.titre),
    `« ${COURANT.titre} » est écrit en dur dans index.html, hors changelog`).toBe(false);
});

test('la tuile est un lien, focalisable au clavier, au focus visible', async ({ page, viewport }) => {
  mobileSeulement(viewport);
  await accueil(page);
  const tuile = page.locator('[data-jeu-tuile]');

  expect(await tuile.evaluate((el) => el.tagName)).toBe('A');

  // Focus par le CLAVIER : `:focus-visible` ne se déclenche pas au toucher, et
  // c'est voulu. On s'y rend au clavier pour mesurer ce que voit vraiment une
  // personne qui navigue au clavier.
  await tuile.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');

  const vu = await tuile.evaluate((el) => ({
    actif: document.activeElement === el,
    focusVisible: el.matches(':focus-visible'),
    outline: parseFloat(getComputedStyle(el).outlineWidth) || 0,
    ombre: getComputedStyle(el).boxShadow
  }));
  expect(vu.actif, 'la tuile n’a pas reçu le focus').toBe(true);
  expect(vu.focusVisible).toBe(true);
  expect(vu.outline > 0 || (vu.ombre && vu.ombre !== 'none'),
    'aucun indicateur de focus visible sur la tuile').toBe(true);
});

/* ── 4. La pastille « Nouveau » ────────────────────────────────────── */

test('la pastille apparaît, puis s’éteint quand le jeu a été ouvert', async ({ page, viewport }) => {
  mobileSeulement(viewport);
  // a) Appareil qui n'a jamais ouvert le jeu → pastille.
  await accueil(page);
  const badge = page.locator('[data-jeu-badge]');
  await expect(badge).toBeVisible();
  await expect(badge).toHaveText(/nouveau/i);

  // ⛔ Pas seulement de la couleur : l'information est dans le nom du lien.
  await expect(page.locator('[data-jeu-tuile]'))
    .toHaveAttribute('aria-label', /nouveau jeu disponible/i);

  // b) Le même appareil après avoir ouvert /jeu.
  await page.goto('/jeu/');
  await page.waitForURL(/la-hotte|jeux\//, { timeout: 10000 });
  expect(await page.evaluate(() => localStorage.getItem('jeu-vu'))).toBe(COURANT.id);

  await page.goto('/');
  await page.waitForSelector('body.app-ready', { timeout: 15000 });
  await expect(page.locator('[data-jeu-badge]')).toBeHidden();
});

test('la pastille ne revient que si « courant » change', async ({ page, viewport }) => {
  mobileSeulement(viewport);
  // Un appareil qui a vu le jeu courant : rien à annoncer.
  await accueil(page, COURANT.id);
  await expect(page.locator('[data-jeu-badge]')).toBeHidden();
  await expect(page.locator('[data-jeu-tuile]')).not.toHaveAttribute('aria-label', /nouveau jeu/i);

  // Le même appareil, après que la mairie a changé « courant » : la mémoire
  // locale porte l'identifiant d'un jeu qui n'est plus à l'affiche.
  await page.evaluate(() => localStorage.setItem('jeu-vu', 'un-jeu-d-avant'));
  await page.reload();
  await page.waitForSelector('body.app-ready', { timeout: 15000 });
  await expect(page.locator('[data-jeu-badge]')).toBeVisible();
});

test('un jeu daté du futur ne s’annonce pas avant sa date', async ({ page, viewport }) => {
  mobileSeulement(viewport);
  const demain = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  await accueil(page, '', {
    courant: 'plus-tard',
    jeux: [{ id: 'plus-tard', titre: 'Plus tard', saison: 'Bientôt', resume: '…',
      fichier: '/jeux/la-hotte.html', publie: demain }]
  });
  await expect(page.locator('[data-jeu-badge]')).toBeHidden();
});

/* ── 5. La route stable et le jeu ──────────────────────────────────── */

test('/jeu sert le jeu courant, et le jeu ne demande rien au réseau', async ({ page }) => {
  await page.goto('/jeu/');
  await page.waitForURL((u) => u.pathname === COURANT.fichier, { timeout: 10000 });

  // Le jeu est là, et il est utilisable : un canvas dimensionné, pas une
  // balise vide (un <canvas> sans attribut fait 300 px de large « par défaut »,
  // ce qui ne prouverait rien).
  const boite = await page.locator('canvas#c').boundingBox();
  expect(boite && boite.width, 'le canvas du jeu n’est pas mis en page').toBeTruthy();
  expect(boite.width).toBeGreaterThan(100);
  expect(boite.height).toBeGreaterThan(100);

  // Le chemin du retour, pour qui arrive par un QR code sans connaître l'app.
  const retour = page.locator('a.retour');
  await expect(retour).toBeVisible();
  expect(new URL(await retour.getAttribute('href'), page.url()).pathname).toBe('/');

  // ⛔ Zéro requête pendant la partie. On joue vraiment : on glisse le doigt,
  // et on laisse tourner trois secondes.
  const requetes = [];
  page.on('request', (r) => requetes.push(r.url()));
  await page.mouse.move(boite.x + boite.width / 2, boite.y + boite.height / 2);
  await page.mouse.down();
  for (let i = 0; i < 12; i++) {
    await page.mouse.move(boite.x + (i % 2 ? 0.25 : 0.75) * boite.width, boite.y + boite.height * 0.8);
    await page.waitForTimeout(120);
  }
  await page.mouse.up();
  await page.waitForTimeout(1500);
  expect(requetes, 'le jeu a émis des requêtes réseau pendant la partie').toEqual([]);
});

test('le meilleur score reste sur l’appareil', async ({ page }) => {
  await page.goto(COURANT.fichier);
  await page.waitForSelector('canvas#c');
  // La clé est propre au jeu : le jeu suivant ne doit pas effacer ce record.
  const cles = await page.evaluate(() => Object.keys(localStorage));
  expect(cles.every((k) => !/score|best/i.test(k) || k.includes('mat-jeu-best-')),
    `clé de score inattendue : ${cles.join(', ')}`).toBe(true);
});

/* ── 6. Les archives ───────────────────────────────────────────────── */

test('les archives listent les jeux précédents, et eux seuls', async ({ page }) => {
  await page.route('**/jeux/jeux.json', (r) => r.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      courant: 'jeu-b',
      jeux: [
        { id: 'jeu-a', titre: 'Le jeu d’avant', saison: 'Juin — la fenaison',
          resume: 'Un jeu de la saison passée.', fichier: '/jeux/la-hotte.html', publie: '2026-06-01' },
        { id: 'jeu-b', titre: 'Le jeu du moment', saison: 'Septembre',
          resume: 'Celui de maintenant.', fichier: '/jeux/la-hotte.html', publie: '2026-09-01' }
      ]
    })
  }));

  await page.goto('/jeu/archives/');
  const liens = page.locator('[data-jeu-archives] a.jeu');
  await expect(liens).toHaveCount(1);
  await expect(liens.first()).toContainText('Le jeu d’avant');
  await expect(liens.first()).toContainText('Juin — la fenaison');
  expect(new URL(await liens.first().getAttribute('href'), page.url()).pathname)
    .toBe('/jeux/la-hotte.html');
});

test('les archives le disent quand il n’y a encore rien à archiver', async ({ page }) => {
  await page.route('**/jeux/jeux.json', (r) => r.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ courant: 'seul', jeux: [{ id: 'seul', titre: 'Seul',
      saison: 'Maintenant', resume: '…', fichier: '/jeux/la-hotte.html', publie: '2026-09-01' }] })
  }));
  await page.goto('/jeu/archives/');
  await expect(page.locator('[data-jeu-archives] .vide')).toBeVisible();
  await expect(page.locator('[data-jeu-archives] a.jeu')).toHaveCount(0);
});

/* ── 7. Le plan du site (RGAA 12.3) ────────────────────────────────── */

test('le plan du site mène au jeu, sous le même intitulé que la tuile', async ({ page }) => {
  await accueil(page);
  const intitule = (await page.locator('[data-jeu-tuile] .ct-label').textContent()).trim();

  await page.evaluate(() => window.openPlanSite());
  const lien = page.locator('#plansite-body a.plan-lien', { hasText: intitule });
  await expect(lien).toHaveCount(1);
  expect(new URL(await lien.getAttribute('href'), page.url()).pathname).toBe('/jeu/');

  await expect(page.locator('#plansite-body a.plan-lien', { hasText: 'Jeux précédents' }))
    .toHaveCount(1);
});

/* ── 8. Le service worker déclare bien la coquille ─────────────────── */

test('le service worker précache la coquille du jeu, et lit le jeu courant', () => {
  const sw = fs.readFileSync(path.join(RACINE, 'service-worker.js'), 'utf8');

  for (const url of ['./jeu/index.html', './jeu/archives/index.html', './jeux/jeux.json',
    './js/mat-jeu.js', './css/mat-jeu.css']) {
    expect(sw.includes(url), `${url} n’est pas précaché : la page serait vide hors ligne`).toBe(true);
  }

  // ⛔ Et surtout : le fichier du jeu se déduit du manifeste, il ne s'écrit pas
  // ici. Un nom de jeu en dur dans le service worker rendrait la rotation
  // impossible sans nouvelle version de l'application.
  expect(sw.includes(COURANT.id), `« ${COURANT.id} » est écrit en dur dans service-worker.js`).toBe(false);
  expect(/jeux\/jeux\.json/.test(sw), 'le service worker ne lit pas le manifeste').toBe(true);
});
