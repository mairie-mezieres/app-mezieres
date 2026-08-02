const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const fs = require('node:fs');
const path = require('node:path');

// Mêmes hôtes coupés que smoke.spec.js : les tests tournent SANS backend, ce
// qui est exactement la bonne configuration pour éprouver le dégradé — le fait
// du jour, son explication et sa source doivent s'afficher quand même, seul le
// pourcentage de réponses disparaît.
const EXTERNAL_HOSTS = [
  'onrender.com', 'googleapis.com', 'gstatic.com', 'clearbit.com',
  'open-meteo.com', 'facebook.com', 'api-adresse.data.gouv.fr',
  'apicarto.ign.fr', 'data.geopf.fr', 'cadastre.data.gouv.fr',
  'geoportail-urbanisme', 'raw.githubusercontent.com', 'res.cloudinary.com',
  'data.education.gouv.fr', 'ingest.de.sentry.io', 'sentry.io',
  'tile.openstreetmap.org', 'openstreetmap.org'
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mat_onboarded_v3', '1');
  });
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (EXTERNAL_HOSTS.some((h) => url.includes(h))) return route.abort();
    return route.continue();
  });
});

// Le conteneur visible dépend du projet : le bandeau mobile est masqué en CSS
// sur desktop, et .d-main-grid l'est sur mobile. On cible donc « celui qui est
// rendu » plutôt que de dupliquer les tests par projet.
function ligne(page) {
  return page.locator('.sv-ligne:visible').first();
}

test('la ligne « Le saviez-vous ? » est repliée au chargement', async ({ page }) => {
  await page.goto('/');
  const l = ligne(page);
  await expect(async () => {
    await expect(l).toBeVisible();
  }).toPass({ timeout: 15000 });
  await expect(l).toHaveAttribute('aria-expanded', 'false');
  await expect(l).toContainText('Le saviez-vous ?');
  // Repliée, elle ne montre ni question ni boutons de réponse.
  await expect(page.locator('.sv-question')).toHaveCount(0);
});

test('au clic, elle déplie une question et deux réponses', async ({ page }) => {
  await page.goto('/');
  const l = ligne(page);
  await expect(async () => { await expect(l).toBeVisible(); }).toPass({ timeout: 15000 });

  await l.click();
  await expect(l).toHaveAttribute('aria-expanded', 'true');

  const q = page.locator('.sv-question:visible').first();
  await expect(q).toBeVisible();
  // Une question, donc un point d'interrogation — jamais une affirmation.
  await expect(q).toContainText('?');
  await expect(page.locator('.sv-btn:visible')).toHaveCount(2);
});

test('sans backend, la réponse et sa SOURCE s’affichent quand même', async ({ page }) => {
  await page.goto('/');
  const l = ligne(page);
  await expect(async () => { await expect(l).toBeVisible(); }).toPass({ timeout: 15000 });
  await l.click();
  await page.locator('.sv-btn:visible').first().click();

  await expect(page.locator('.sv-verdict:visible').first()).toBeVisible();
  const source = page.locator('.sv-source:visible').first();
  await expect(source).toBeVisible();
  await expect(source).toContainText('Source :');

  // Le pourcentage vient du backend : coupé, il doit rester ABSENT — jamais
  // affiché à 0 %, une donnée manquante ne doit pas se lire comme une valeur.
  await expect(page.locator('.sv-part:visible')).toHaveCount(0);
});

test('la réponse est mémorisée pour la journée', async ({ page }) => {
  await page.goto('/');
  const l = ligne(page);
  await expect(async () => { await expect(l).toBeVisible(); }).toPass({ timeout: 15000 });
  await l.click();
  await page.locator('.sv-btn:visible').first().click();
  await expect(page.locator('.sv-verdict:visible').first()).toBeVisible();

  await page.reload();
  const l2 = ligne(page);
  await expect(async () => { await expect(l2).toBeVisible(); }).toPass({ timeout: 15000 });
  await l2.click();
  // Plus de boutons : on ne rejoue pas le même jour, la révélation est là.
  await expect(page.locator('.sv-btn:visible')).toHaveCount(0);
  await expect(page.locator('.sv-verdict:visible').first()).toBeVisible();
});

test('le fait du jour est le même à deux chargements successifs', async ({ page }) => {
  await page.goto('/');
  const l = ligne(page);
  await expect(async () => { await expect(l).toBeVisible(); }).toPass({ timeout: 15000 });
  await l.click();
  const premiere = await page.locator('.sv-question:visible').first().textContent();

  await page.context().clearCookies();
  await page.evaluate(() => localStorage.removeItem('mat_sv_v1'));
  await page.reload();
  const l2 = ligne(page);
  await expect(async () => { await expect(l2).toBeVisible(); }).toPass({ timeout: 15000 });
  await l2.click();
  const seconde = await page.locator('.sv-question:visible').first().textContent();

  // Rotation déterministe : tout le village voit le même fait le même jour.
  expect(seconde).toBe(premiere);
});

test('« Le saviez-vous ? » déplié : aucune violation axe sérieuse ou critique', async ({ page }) => {
  await page.goto('/');
  const l = ligne(page);
  await expect(async () => { await expect(l).toBeVisible(); }).toPass({ timeout: 15000 });
  await l.click();
  await expect(page.locator('.sv-question:visible').first()).toBeVisible();

  const res = await new AxeBuilder({ page }).include('.sv-bloc').analyze();
  const graves = res.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
  expect(graves.map((v) => `${v.id} (${v.impact})`)).toEqual([]);
});

// ── Page de revue pour la mairie ──────────────────────────────
// L'ADR-0012 demande que le corpus soit relu AVANT la fusion. La page n'a de
// valeur que si elle montre l'ordre RÉEL de passage : elle interroge donc
// js/mat-saviez-vous.js plutôt que de réordonner le corpus de son côté. Ces
// tests verrouillent ce contrat — une revue qui diverge de l'app ne sert à rien.

test('revue : toutes les entrées sont listées, corpus et calculées', async ({ page }) => {
  await page.goto('/revue-saviez-vous.html');
  const cartes = page.locator('.entree');
  await expect(async () => {
    expect(await cartes.count()).toBeGreaterThan(0);
  }).toPass({ timeout: 15000 });

  const brut = fs.readFileSync(
    path.join(__dirname, '..', '..', 'data', 'saviez-vous.json'), 'utf8'
  );
  const attendu = JSON.parse(brut).entrees.length;

  // Au moins le corpus fixe ; les entrées calculées s'y ajoutent.
  expect(await cartes.count()).toBeGreaterThan(attendu);

  // Chaque carte porte une réponse ET une source — c'est tout l'objet de la revue.
  await expect(page.locator('.entree .e-rep')).toHaveCount(await cartes.count());
  await expect(page.locator('.entree .e-src')).toHaveCount(await cartes.count());
  await expect(page.locator('.entree').first()).toContainText('Source :');
});

test('revue : le filtre par réponse ne garde que les « Non »', async ({ page }) => {
  await page.goto('/revue-saviez-vous.html');
  const cartes = page.locator('.entree');
  await expect(async () => {
    expect(await cartes.count()).toBeGreaterThan(0);
  }).toPass({ timeout: 15000 });

  const total = await cartes.count();
  await page.selectOption('#rep', 'non');
  const filtre = await cartes.count();
  expect(filtre).toBeGreaterThan(0);
  expect(filtre).toBeLessThan(total);
  await expect(page.locator('.e-rep.oui')).toHaveCount(0);
});

test('revue : aucune violation axe sérieuse ou critique', async ({ page }) => {
  await page.goto('/revue-saviez-vous.html');
  await expect(async () => {
    expect(await page.locator('.entree').count()).toBeGreaterThan(0);
  }).toPass({ timeout: 15000 });

  const res = await new AxeBuilder({ page }).analyze();
  const graves = res.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
  expect(graves.map((v) => `${v.id} (${v.impact})`)).toEqual([]);
});

// ── Garde-fou anti-fake-news ──────────────────────────────────
// Ce test lit le corpus sur disque, sans navigateur. C'est LUI qui empêche une
// entrée non sourcée d'entrer dans le dépôt : la règle « une affirmation sans
// source ne part pas » n'a de valeur que si elle est vérifiée mécaniquement.

test('intégrité du corpus : chaque entrée est sourcée et bien formée', async () => {
  const brut = fs.readFileSync(
    path.join(__dirname, '..', '..', 'data', 'saviez-vous.json'), 'utf8'
  );
  const corpus = JSON.parse(brut);
  const entrees = corpus.entrees;

  expect(Array.isArray(entrees)).toBe(true);
  expect(entrees.length).toBeGreaterThan(0);

  const vus = new Set();
  const fautifs = [];

  for (const e of entrees) {
    const pb = [];
    if (!e.id || !/^[a-z0-9-]{2,64}$/i.test(e.id)) pb.push('id absent ou mal formé');
    if (vus.has(e.id)) pb.push('id en double');
    vus.add(e.id);
    if (!e.question || !e.question.trim()) pb.push('question vide');
    // Une QUESTION, jamais une affirmation : c'est ce qui interdit
    // structurellement d'afficher une contre-vérité.
    else if (!e.question.trim().endsWith('?')) pb.push('la question ne se termine pas par « ? »');
    if (typeof e.reponse !== 'boolean') pb.push('reponse doit être un booléen');
    if (!e.explication || !e.explication.trim()) pb.push('explication vide');
    if (!e.source || !e.source.trim()) pb.push('SOURCE ABSENTE');
    if (!e.categorie || !e.categorie.trim()) pb.push('categorie vide');
    if (e.url && !/^https:\/\//.test(e.url)) pb.push('url non https');
    if (pb.length) fautifs.push(`${e.id || '(sans id)'} → ${pb.join(', ')}`);
  }

  expect(fautifs).toEqual([]);
});
