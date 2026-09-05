// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

/*
 * « Le jeu du moment » — rotation par période, tuile, pastille, archives,
 * hors-ligne, et comptage des ouvertures.
 *
 * CE QUE CES TESTS DÉFENDENT, ET POURQUOI
 * ---------------------------------------
 *  1. LA BASCULE EST AUTOMATIQUE ET SANS TROU. Les périodes sont en JJ-MM,
 *     sans année : elles se répètent seules. Un trou d'un jour dans le
 *     calendrier ne se verrait qu'une fois par an, le jour où il tombe — et
 *     personne ne serait là pour le corriger. Le contrôle balaie donc les 365
 *     jours et refuse aussi bien un jour sans jeu qu'un jour à deux jeux.
 *  2. AUCUN NOM DE JEU DANS LE CODE. Le manifeste est la seule source.
 *  3. AUCUNE REQUÊTE PENDANT UNE PARTIE. C'est ce qui rend les jeux jouables
 *     en mode avion ET ce qui garantit que rien de la partie ne sort. Le
 *     comptage a lieu dans le LANCEUR, avant le jeu — jamais dedans.
 *  4. LE COMPTAGE COMPTE DES PERSONNES. Une fois par appareil et par jour :
 *     trois parties d'affilée ne font pas trois joueurs.
 *
 * ⚠️ Le service worker est BLOQUÉ sous Playwright (ADR-0006) : ces tests ne
 * peuvent PAS mesurer le précache hors-ligne. Ils vérifient ce dont il dépend.
 */

const RACINE = path.resolve(__dirname, '..', '..');
const MANIFESTE = JSON.parse(fs.readFileSync(path.join(RACINE, 'jeux', 'jeux.json'), 'utf8'));

const HOTES = ['onrender.com', 'googleapis.com', 'gstatic.com', 'clearbit.com',
  'open-meteo.com', 'facebook.com', 'api-adresse.data.gouv.fr', 'apicarto.ign.fr',
  'data.geopf.fr', 'cadastre.data.gouv.fr', 'geoportail-urbanisme',
  'raw.githubusercontent.com', 'res.cloudinary.com', 'data.education.gouv.fr', 'sentry.io'];

/* La même règle que `js/mat-jeu.js`, réécrite ici volontairement : un test qui
   importerait la fonction testée ne prouverait rien sur la règle elle-même. */
function repere(jjmm) { const [j, m] = String(jjmm).split('-').map(Number); return m * 100 + j; }
function contient(jeu, d) {
  const auj = (d.getMonth() + 1) * 100 + d.getDate();
  const a = repere(jeu.debut), b = repere(jeu.fin);
  return a <= b ? (auj >= a && auj <= b) : (auj >= a || auj <= b);
}
const attendu = (d) => MANIFESTE.jeux.find((j) => contient(j, d));

/** Coupe le réseau externe et ouvre l'accueil, avec l'état de stockage voulu. */
async function accueil(page, seed, manifeste) {
  await page.addInitScript((vu) => {
    localStorage.setItem('mat_onboarded_v3', '1');
    if (localStorage.getItem('mat_semis_test')) return;
    localStorage.setItem('mat_semis_test', '1');
    if (vu) localStorage.setItem('jeu-vu', vu);
    else localStorage.removeItem('jeu-vu');
  }, seed || '');
  await page.route('**/*', (r) => HOTES.some((h) => r.request().url().includes(h)) ? r.abort() : r.continue());
  // ⚠️ Après le fourre-tout : quand deux routes correspondent, Playwright retient
  // la DERNIÈRE déclarée. Enregistré avant, un manifeste simulé serait ignoré.
  if (manifeste) {
    await page.route('**/jeux/jeux.json', (r) => r.fulfill({
      contentType: 'application/json', body: JSON.stringify(manifeste)
    }));
  }
  await page.goto('/');
  await page.waitForSelector('body.app-ready', { timeout: 15000 });
  // La tuile n'affiche aucun texte variable : `data-jeu-pret` est le seul repère
  // qui dise que le module a tourné et que la pastille est décidée.
  await page.waitForSelector('[data-jeu-tuile][data-jeu-pret]', { state: 'attached', timeout: 10000 });
}

/* ── 1. Le manifeste et le calendrier ──────────────────────────────── */

test('le manifeste est complet et chaque jeu existe sur le disque', () => {
  expect(Array.isArray(MANIFESTE.jeux)).toBe(true);
  expect(MANIFESTE.jeux.length).toBeGreaterThan(0);

  for (const j of MANIFESTE.jeux) {
    for (const champ of ['id', 'titre', 'saison', 'resume', 'fichier', 'debut', 'fin']) {
      expect(j[champ], `le jeu « ${j.id} » n’a pas de « ${champ} »`).toBeTruthy();
    }
    for (const c of ['debut', 'fin']) {
      expect(j[c], `« ${c} » de « ${j.id} » doit être au format JJ-MM, sans année`)
        .toMatch(/^\d{2}-\d{2}$/);
    }
    expect(fs.existsSync(path.join(RACINE, j.fichier.replace(/^\/+/, ''))),
      `le fichier de « ${j.id} » est absent du dépôt : ${j.fichier}`).toBe(true);
  }

  const ids = MANIFESTE.jeux.map((j) => j.id);
  expect(new Set(ids).size, 'deux jeux portent le même identifiant').toBe(ids.length);
  if (MANIFESTE.forcer) {
    expect(ids, `« forcer » vaut « ${MANIFESTE.forcer} », qui n’est aucun jeu`)
      .toContain(MANIFESTE.forcer);
  }
});

test('le calendrier couvre l’année entière, sans trou ni chevauchement', () => {
  // Une année bissextile, pour que le 29 février soit examiné lui aussi.
  const trous = [], doubles = [];
  for (let i = 0; i < 366; i++) {
    const d = new Date(2028, 0, 1 + i);
    if (d.getFullYear() !== 2028) break;
    const n = MANIFESTE.jeux.filter((j) => contient(j, d));
    const jour = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!n.length) trous.push(jour);
    if (n.length > 1) doubles.push(`${jour} → ${n.map((j) => j.id).join(', ')}`);
  }
  expect(trous, 'jour(s) sans aucun jeu : l’application afficherait un jeu de repli '
    + 'sans que personne ne le remarque').toEqual([]);
  expect(doubles, 'jour(s) couverts par deux jeux : lequel gagne dépendrait de '
    + 'l’ordre du tableau, ce qui n’est pas une règle').toEqual([]);
});

/* ── 2. La propriété qui fait tout tenir : rien ne sort ─────────────── */

test('aucun jeu ne dépend du réseau (ni CDN, ni police distante, ni appel)', () => {
  for (const j of MANIFESTE.jeux) {
    const html = fs.readFileSync(path.join(RACINE, j.fichier.replace(/^\/+/, '')), 'utf8');

    expect((html.match(/https?:\/\/[^"'\s)]+/g) || []),
      `« ${j.id} » cite un domaine externe`).toEqual([]);

    for (const interdit of [/\bfetch\s*\(/, /XMLHttpRequest/, /importScripts/, /new\s+Worker/,
      /EventSource/, /navigator\.sendBeacon/, /@import/, /@font-face/]) {
      expect(interdit.test(html), `« ${j.id} » utilise ${interdit}`).toBe(false);
    }
  }
});

test('chaque jeu laisse zoomer, sait revenir à l’app et décrit son canvas', () => {
  for (const j of MANIFESTE.jeux) {
    const html = fs.readFileSync(path.join(RACINE, j.fichier.replace(/^\/+/, '')), 'utf8');

    // ⚠️ On lit la BALISE, pas le fichier entier : le commentaire qui explique
    // pourquoi la mention a été retirée contient les mots « user-scalable=no ».
    // Un `grep` sur tout le fichier verdirait ou rougirait sur un commentaire.
    const meta = /<meta name="viewport" content="([^"]*)"/.exec(html);
    expect(meta, `« ${j.id} » n’a pas de balise viewport`).toBeTruthy();
    expect(meta[1], `« ${j.id} » interdit le zoom (RGAA 13.9)`).not.toMatch(/user-scalable\s*=\s*no/);
    expect(meta[1], `« ${j.id} » plafonne le zoom (RGAA 13.9)`).not.toMatch(/maximum-scale/);

    expect(/<a class="retour" href="\.\.\/"/.test(html),
      `« ${j.id} » n’offre aucun retour vers l’application — quelqu’un qui arrive `
      + `par un QR code y serait coincé`).toBe(true);
    expect(/class="sr-only"/.test(html),
      `« ${j.id} » n’a pas d’alternative textuelle au canvas`).toBe(true);
    expect(new RegExp("mat-jeu-best-" + j.id).test(html),
      `« ${j.id} » ne garde pas son meilleur score sur l’appareil`).toBe(true);
  }
});

/* ── 3. La bascule ─────────────────────────────────────────────────── */

test('le bon jeu est choisi aux six dates de bascule', async ({ page }) => {
  await accueil(page);

  // Les dates du cahier des charges, plus les deux bords qui coincent :
  // le 29 février et le passage d'année.
  const DATES = ['2026-03-01', '2026-05-16', '2026-07-01', '2026-09-01',
    '2026-10-21', '2026-12-01', '2026-12-31', '2027-01-01', '2028-02-29'];

  const obtenu = await page.evaluate(async (dates) => {
    const m = await window.matJeu.charger();
    return dates.map((s) => {
      const d = new Date(s + 'T12:00:00');
      const j = window.matJeu.courant(m, d);
      return j ? j.id : null;
    });
  }, DATES);

  DATES.forEach((s, i) => {
    const d = new Date(s + 'T12:00:00');
    expect(obtenu[i], `le ${s}`).toBe(attendu(d).id);
  });
});

test('« forcer » épingle un jeu hors calendrier, et seulement lui', async ({ page }) => {
  await accueil(page);
  const r = await page.evaluate(async () => {
    const m = await window.matJeu.charger();
    const aout = new Date('2026-08-15T12:00:00');
    const sans = window.matJeu.courant(m, aout).id;
    const avec = window.matJeu.courant(
      Object.assign({}, m, { forcer: 'les-batisseurs' }), aout).id;
    // Un identifiant inconnu ne doit pas figer l'application sur rien.
    const faux = window.matJeu.courant(
      Object.assign({}, m, { forcer: 'jeu-qui-n-existe-pas' }), aout).id;
    return { sans, avec, faux };
  });
  expect(r.avec).toBe('les-batisseurs');
  expect(r.sans).not.toBe('les-batisseurs');
  expect(r.faux, 'un « forcer » erroné doit retomber sur le calendrier').toBe(r.sans);
});

/* ── 4. La tuile et la pastille ────────────────────────────────────── */

/* ⚠️ La tuile vit dans la grille du TÉLÉPHONE, masquée au-delà de 1024 px : la
   mise en page bureau n'a pas de point d'entrée vers le jeu, l'accès s'y fait
   par le plan du site. Sans ce garde-fou, les assertions de visibilité
   mesureraient une boîte de hauteur nulle et verdiraient à tort (ADR-0030). */
function mobileSeulement(viewport) {
  test.skip(!viewport || viewport.width >= 1024, 'grille du téléphone uniquement');
}

test('la tuile mène à /jeu et ne dévoile pas le jeu', async ({ page }) => {
  await accueil(page);
  const tuile = page.locator('[data-jeu-tuile]');

  await expect(tuile).toHaveCount(1);
  await expect(tuile.locator('.ct-label')).toHaveText('Le jeu du moment');
  expect(new URL(await tuile.getAttribute('href'), page.url()).pathname).toBe('/jeu/');

  const texte = (await tuile.textContent()).replace(/\s+/g, ' ').trim();
  const nom = await tuile.getAttribute('aria-label');
  for (const j of MANIFESTE.jeux) {
    expect(texte, `la tuile affiche « ${j.titre} »`).not.toContain(j.titre);
    expect(nom, `le nom accessible du lien contient « ${j.titre} »`).not.toContain(j.titre);
  }
  expect(nom).toContain('Le jeu du moment');   // WCAG 2.5.3 : le libellé visible y est

  // ⛔ Aucun nom de jeu écrit en dur dans index.html — hors CHANGELOG, qui
  // raconte l'histoire et a le droit de nommer. Le découpage est vérifié :
  // un `indexOf` à -1 découperait au mauvais endroit et le contrôle verdirait
  // sans rien mesurer.
  const html = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8');
  const i = html.indexOf('id="ov-changelog"');
  expect(i, 'overlay du changelog introuvable').toBeGreaterThan(0);
  const horsChangelog = html.slice(0, i);
  for (const j of MANIFESTE.jeux) {
    expect(horsChangelog.includes(j.titre),
      `« ${j.titre} » est écrit en dur dans index.html`).toBe(false);
  }
});

test('la tuile est un lien, focalisable au clavier, au focus visible', async ({ page, viewport }) => {
  mobileSeulement(viewport);
  await accueil(page);
  const tuile = page.locator('[data-jeu-tuile]');
  expect(await tuile.evaluate((el) => el.tagName)).toBe('A');

  // Focus par le CLAVIER : `:focus-visible` ne se déclenche pas au toucher.
  await tuile.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');

  const vu = await tuile.evaluate((el) => ({
    actif: document.activeElement === el,
    focusVisible: el.matches(':focus-visible'),
    outline: parseFloat(getComputedStyle(el).outlineWidth) || 0,
    ombre: getComputedStyle(el).boxShadow
  }));
  expect(vu.actif).toBe(true);
  expect(vu.focusVisible).toBe(true);
  expect(vu.outline > 0 || (vu.ombre && vu.ombre !== 'none')).toBe(true);
});

test('la pastille apparaît, puis s’éteint quand le jeu a été ouvert', async ({ page, viewport }) => {
  mobileSeulement(viewport);
  await accueil(page);
  const badge = page.locator('[data-jeu-badge]');
  await expect(badge).toBeVisible();
  await expect(badge).toHaveText(/nouveau/i);
  await expect(page.locator('[data-jeu-tuile]'))
    .toHaveAttribute('aria-label', /nouveau jeu disponible/i);

  await page.goto('/jeu/');
  await page.waitForURL(/\/jeux\//, { timeout: 10000 });
  const vu = await page.evaluate(() => localStorage.getItem('jeu-vu'));
  expect(MANIFESTE.jeux.map((j) => j.id)).toContain(vu);

  await page.goto('/');
  await page.waitForSelector('body.app-ready', { timeout: 15000 });
  await expect(page.locator('[data-jeu-badge]')).toBeHidden();
});

test('la pastille se rallume à la bascule de période, et pas avant', async ({ page, viewport }) => {
  mobileSeulement(viewport);
  const courantId = attendu(new Date()).id;

  // Un appareil qui a vu le jeu de la période en cours : rien à annoncer.
  await accueil(page, courantId);
  await expect(page.locator('[data-jeu-badge]')).toBeHidden();

  // Le même appareil, une fois la période passée : la mémoire porte
  // l'identifiant d'un jeu qui n'est plus à l'affiche.
  await page.evaluate(() => localStorage.setItem('jeu-vu', 'un-jeu-d-une-autre-saison'));
  await page.reload();
  await page.waitForSelector('body.app-ready', { timeout: 15000 });
  await expect(page.locator('[data-jeu-badge]')).toBeVisible();
});

/* ── 5. Le jeu, et le comptage ─────────────────────────────────────── */

test('/jeu sert le jeu du jour, et le jeu ne demande rien au réseau', async ({ page }) => {
  const jour = attendu(new Date());

  await page.goto('/jeu/');
  await page.waitForURL((u) => u.pathname === jour.fichier, { timeout: 10000 });

  // Le jeu est là et mis en page : un <canvas> sans attribut ferait 300 px de
  // large « par défaut », ce qui ne prouverait rien.
  const boite = await page.locator('canvas#c').boundingBox();
  expect(boite && boite.width).toBeTruthy();
  expect(boite.width).toBeGreaterThan(100);
  expect(boite.height).toBeGreaterThan(100);

  const retour = page.locator('a.retour');
  await expect(retour).toBeVisible();
  expect(new URL(await retour.getAttribute('href'), page.url()).pathname).toBe('/');

  // ⛔ Zéro requête pendant la partie. On joue vraiment : doigt sur l'écran,
  // trois secondes. Le comptage, lui, a eu lieu AVANT, dans le lanceur.
  const requetes = [];
  page.on('request', (r) => requetes.push(r.url()));
  await page.mouse.move(boite.x + boite.width / 2, boite.y + boite.height / 2);
  await page.mouse.down();
  for (let i = 0; i < 12; i++) {
    await page.mouse.move(boite.x + (i % 2 ? 0.25 : 0.75) * boite.width, boite.y + boite.height * 0.7);
    await page.waitForTimeout(120);
  }
  await page.mouse.up();
  await page.waitForTimeout(1500);
  expect(requetes, 'le jeu a émis des requêtes réseau pendant la partie').toEqual([]);
});

test('l’ouverture est comptée une fois par appareil et par jour', async ({ page }) => {
  const envois = [];
  // Le backend est coupé partout ailleurs dans ces tests : on l'intercepte ici
  // pour lire ce qui SERAIT envoyé, sans rien envoyer.
  await page.route('**/stats/track', (r) => {
    envois.push(JSON.parse(r.request().postData() || '{}'));
    return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await page.goto('/jeu/');
  await page.waitForURL(/\/jeux\//, { timeout: 10000 });
  await page.waitForTimeout(400);

  expect(envois.length, 'l’ouverture du jeu n’a pas été comptée').toBe(1);
  expect(envois[0].service).toBe('jeu');

  // ⛔ Rien de la partie : ni score, ni durée, ni identifiant du jeu joué.
  const champs = Object.keys(envois[0]).sort();
  expect(champs.filter((k) => !['service', 'deviceId'].includes(k)),
    'le comptage transporte autre chose que le service et l’appareil').toEqual([]);

  // Deuxième ouverture le même jour : le même appareil ne doit pas compter deux fois.
  await page.goto('/jeu/');
  await page.waitForURL(/\/jeux\//, { timeout: 10000 });
  await page.waitForTimeout(400);
  expect(envois.length, 'une deuxième partie a été comptée comme une deuxième personne').toBe(1);

  // Demain, il compte de nouveau : c'est un chiffre par jour.
  await page.evaluate(() => localStorage.setItem('mat_jeu_compte', '1999-01-01'));
  await page.goto('/jeu/');
  await page.waitForURL(/\/jeux\//, { timeout: 10000 });
  await page.waitForTimeout(400);
  expect(envois.length, 'le compteur ne repart pas le lendemain').toBe(2);
});

test('le meilleur score reste sur l’appareil', async ({ page }) => {
  const jour = attendu(new Date());
  await page.goto(jour.fichier);
  await page.waitForSelector('canvas#c');
  const cles = await page.evaluate(() => Object.keys(localStorage));
  expect(cles.every((k) => !/score|best/i.test(k) || k.includes('mat-jeu-best-')),
    `clé de score inattendue : ${cles.join(', ')}`).toBe(true);
});

/* ── 6. Les archives ───────────────────────────────────────────────── */

test('les archives listent tous les jeux sauf celui du jour', async ({ page }) => {
  const jour = attendu(new Date());
  await page.goto('/jeu/archives/');
  const liens = page.locator('[data-jeu-archives] a.jeu');
  await expect(liens).toHaveCount(MANIFESTE.jeux.length - 1);

  const titres = await liens.allTextContents();
  const joints = titres.join(' | ');
  expect(joints, 'le jeu du jour ne doit pas figurer dans les autres jeux')
    .not.toContain(jour.titre);
  for (const j of MANIFESTE.jeux.filter((x) => x.id !== jour.id)) {
    expect(joints, `« ${j.titre} » manque dans la liste`).toContain(j.titre);
  }
});

/* ── 7. Le plan du site (RGAA 12.3) ────────────────────────────────── */

test('le plan du site mène au jeu, sous le même intitulé que la tuile', async ({ page }) => {
  await accueil(page);
  const intitule = (await page.locator('[data-jeu-tuile] .ct-label').textContent()).trim();

  await page.evaluate(() => window.openPlanSite());
  const lien = page.locator('#plansite-body a.plan-lien', { hasText: intitule });
  await expect(lien).toHaveCount(1);
  expect(new URL(await lien.getAttribute('href'), page.url()).pathname).toBe('/jeu/');

  await expect(page.locator('#plansite-body a.plan-lien', { hasText: 'Les autres jeux' }))
    .toHaveCount(1);
});

/* ── 8. Le service worker et le comptage, côté source ──────────────── */

test('le service worker précache la coquille et lit le manifeste', () => {
  const sw = fs.readFileSync(path.join(RACINE, 'service-worker.js'), 'utf8');

  for (const url of ['./jeu/index.html', './jeu/archives/index.html', './jeux/jeux.json',
    './js/mat-jeu.js', './css/mat-jeu.css']) {
    expect(sw.includes(url), `${url} n’est pas précaché`).toBe(true);
  }
  // ⛔ Aucun nom de jeu en dur : c'est le manifeste qui les désigne, tous.
  for (const j of MANIFESTE.jeux) {
    expect(sw.includes(j.id), `« ${j.id} » est écrit en dur dans service-worker.js`).toBe(false);
  }
  expect(/jeux\/jeux\.json/.test(sw), 'le service worker ne lit pas le manifeste').toBe(true);
});

test('le comptage vit dans le lanceur, jamais dans un jeu', () => {
  const mod = fs.readFileSync(path.join(RACINE, 'js', 'mat-jeu.js'), 'utf8');
  expect(/stats\/track/.test(mod), 'le module ne compte rien').toBe(true);

  // Le libellé doit exister des deux côtés, sinon le chiffre s'affiche sous son
  // identifiant technique — ou pas du tout dans le tableau de bord.
  const admin = fs.readFileSync(path.join(RACINE, 'admin.html'), 'utf8');
  expect(/jeu:'🎮 Jeu du moment'/.test(admin),
    'le tableau de bord n’a pas de libellé pour le service « jeu »').toBe(true);
  expect(/'jeu','partager_visite'/.test(admin),
    'le service « jeu » n’est pas dans la liste affichée par le tableau de bord').toBe(true);

  // ⛔ Et surtout : aucun jeu ne contient d'appel au comptage.
  for (const j of MANIFESTE.jeux) {
    const html = fs.readFileSync(path.join(RACINE, j.fichier.replace(/^\/+/, '')), 'utf8');
    expect(/stats\/track/.test(html),
      `« ${j.id} » compte quelque chose : le comptage doit rester dans le lanceur`).toBe(false);
  }
});
