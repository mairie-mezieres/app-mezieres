/**
 * MAT — Captures d'écran complètes de l'application
 * Usage : node screenshots.js
 * Sortie : /tmp/mat-screenshots/
 *
 * Stratégie pleine page pour les overlays :
 *   1. Ouvrir l'overlay
 *   2. Laisser le contenu se charger (réseau réel)
 *   3. Déverrouiller l'overflow du conteneur scrollable
 *   4. Prendre la capture fullPage:true
 *   5. Restaurer l'overflow et fermer l'overlay
 */

const { chromium } = require('@playwright/test');
const path = require('path');
const fs   = require('fs');

const BASE_URL = 'http://localhost:4173';
const OUT      = '/tmp/mat-screenshots';
fs.mkdirSync(OUT, { recursive: true });

// Viewport mobile (iPhone 14 Pro)
const VIEWPORT = { width: 390, height: 844 };
// Délai après ouverture d'un overlay avant capture (chargement API)
const LOAD_DELAY = 3500;

// ── Helpers ─────────────────────────────────────────────────
async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

/** Capture un overlay en pleine hauteur en expandant son conteneur scrollable. */
async function screenshotOverlay(page, outName, scrollSel) {
  const sel = scrollSel || '.ov.open .panel-body';
  // 1. Mesurer la hauteur totale du conteneur scrollable
  const scrollH = await page.evaluate((s) => {
    const el = document.querySelector(s);
    return el ? el.scrollHeight : 0;
  }, sel);

  // 2. Si le contenu est plus grand que l'écran, agrandir le viewport
  const neededH = Math.max(VIEWPORT.height, scrollH + 120);
  if (neededH > VIEWPORT.height) {
    await page.setViewportSize({ width: VIEWPORT.width, height: neededH });
    // Expand l'overlay et le panel-body pour qu'ils prennent toute la hauteur
    await page.evaluate((s) => {
      const ov = document.querySelector('.ov.open');
      if (ov) ov.style.height = '100%';
      const body = document.querySelector(s);
      if (body) {
        body.style.overflowY = 'visible';
        body.style.maxHeight = 'none';
        body.style.height = 'auto';
      }
    }, sel);
  }

  await page.screenshot({ path: path.join(OUT, outName + '.png'), fullPage: true });

  // 3. Restaurer le viewport normal
  await page.setViewportSize(VIEWPORT);
  await page.evaluate((s) => {
    const ov = document.querySelector('.ov.open');
    if (ov) ov.style.height = '';
    const body = document.querySelector(s);
    if (body) { body.style.overflowY = ''; body.style.maxHeight = ''; body.style.height = ''; }
  }, sel).catch(() => {});
}

/** Ferme tous les overlays ouverts (robuste — ne plante pas si rien n'est ouvert). */
async function closeAll(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.ov.open').forEach(el => el.classList.remove('open'));
  }).catch(() => {});
  await delay(300);
}

// ── Catalogue des écrans ─────────────────────────────────────
const SCREENS = [
  { name: '00-accueil-top',  desc: 'Accueil (viewport)',    fn: null, scroll: null },
  { name: '01-accueil-full', desc: 'Accueil (pleine page)', fn: null, scroll: null },
  { name: '02-meteo',         fn: 'openMeteo()',                       scroll: '.panel-body' },
  { name: '03-agenda',        fn: 'openAgenda()',                      scroll: '.panel-body' },
  { name: '04-actualites',    fn: 'openNotifs()',                      scroll: '.panel-body' },
  { name: '05-mel',           fn: 'openMel()',                         scroll: '.msgs' },
  { name: '06-contact',       fn: 'openContact()',                     scroll: '.panel-body' },
  { name: '07-conseil',       fn: 'openConseil()',                     scroll: '.panel-body' },
  { name: '08-signalements',  fn: 'openSignal()',                      scroll: '.panel-body' },
  { name: '09-suivi-signal',  fn: "openSuivi('signalements')",         scroll: '.panel-body' },
  { name: '10-idees',         fn: 'openIdees()',                       scroll: '.panel-body' },
  { name: '11-sondages',      fn: 'openSondages()',                    scroll: '.panel-body' },
  { name: '12-bus-remi',      fn: 'openRemi()',                        scroll: '.panel-body' },
  { name: '13-dechets',       fn: 'openDechets()',                     scroll: '.panel-body' },
  { name: '14-carburant',     fn: 'openCarburant()',                   scroll: '.panel-body' },
  { name: '15-docs',          fn: 'openDocs()',                        scroll: '.panel-body' },
  { name: '16-entreprises',   fn: 'openEntreprises()',                 scroll: '.panel-body' },
  { name: '17-associations',  fn: 'openAssociations()',                scroll: '.panel-body' },
  { name: '18-evenements',    fn: 'openEventsLocaux()',                scroll: '.panel-body' },
  { name: '19-urgences',      fn: 'openNums()',                        scroll: '.panel-body' },
  { name: '20-bug',           fn: 'openBug()',                         scroll: '.panel-body' },
  { name: '21-suivi-bugs',    fn: "openSuivi('bugs')",                 scroll: '.panel-body' },
  { name: '22-rgpd',          fn: 'openRgpd()',                        scroll: '.panel-body' },
  { name: '23-accessibilite', fn: 'openAccessibilite()',               scroll: '.majordome-body, .panel-body' },
  { name: '24-majordome',     fn: 'openMajordome()',                   scroll: '.majordome-body' },
];

// ── Main ────────────────────────────────────────────────────
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--ignore-certificate-errors'],
  });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,   // Retina → captures HD
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
  });
  const page = await context.newPage();

  console.log(`\n📸 MAT — Captures d'écran complètes`);
  console.log(`   URL : ${BASE_URL}`);
  console.log(`   Sortie : ${OUT}\n`);

  // Bloquer les appels vers le backend (évite les erreurs réseau visibles dans l'UI)
  await page.route('**/chatbot-mairie-mezieres.onrender.com/**', route => route.abort());
  await page.route('**/api.sentry.io/**', route => route.abort());
  await page.route('**/api.open-meteo.com/**', route => route.abort());
  await page.route('**/graph.facebook.com/**', route => route.abort());

  // Chargement initial
  await page.goto(BASE_URL, { waitUntil: 'load', timeout: 60000 });

  // Pré-remplir le localStorage pour sauter l'onboarding "Découvrir l'appli"
  // et la bannière d'installation PWA
  await page.evaluate(() => {
    localStorage.setItem('mat_onboarded_v3', '1');
    localStorage.setItem('mat_installed_v3', 'dismissed');
    localStorage.setItem('mat_install_tracked', '1');
  });

  // Recharger avec ces préférences en place
  await page.reload({ waitUntil: 'load' });

  // Attendre que les scripts JS soient bien disponibles sur window
  await page.waitForFunction(() => typeof window.openMeteo === 'function', { timeout: 20000 })
    .catch(() => console.log('  ⚠️  Scripts pas encore prêts, on continue quand même'));
  // Attendre que le splash soit parti
  await page.waitForFunction(() => document.body.classList.contains('app-ready'), { timeout: 15000 }).catch(() => {});
  await delay(1500);

  for (const screen of SCREENS) {
    try {
      console.log(`  → ${screen.name} (${screen.desc || screen.fn || 'page'})`);

      // Fermer tout overlay précédent
      await closeAll(page);
      await delay(400);

      if (screen.fn === null && screen.name.startsWith('00')) {
        // Accueil viewport
        await page.screenshot({ path: path.join(OUT, screen.name + '.png'), fullPage: false });
      } else if (screen.fn === null && screen.name.startsWith('01')) {
        // Accueil pleine page
        await page.screenshot({ path: path.join(OUT, screen.name + '.png'), fullPage: true });
      } else if (screen.fn) {
        // Ouvrir l'overlay
        await page.evaluate((fn) => eval(fn), screen.fn);  // eslint-disable-line no-eval
        await delay(LOAD_DELAY);

        // Capture pleine page après expansion overflow
        await screenshotOverlay(page, screen.name, screen.scroll);
      }

      console.log(`     ✅ ${screen.name}.png`);
    } catch (err) {
      console.error(`     ❌ ${screen.name} : ${err.message}`);
      // Capture d'urgence
      await page.screenshot({ path: path.join(OUT, screen.name + '-error.png') }).catch(() => {});
    }
  }

  await browser.close();

  const files = fs.readdirSync(OUT).filter(f => f.endsWith('.png'));
  console.log(`\n✅ ${files.length} captures sauvegardées dans ${OUT}/`);
  files.forEach(f => console.log(`   ${f}`));
})();
