const { test, expect } = require('@playwright/test');

// ── Plancher typographique (12 px) ─────────────────────────────────────
//
// Lighthouse mobile signalait « Document doesn't use legible font sizes —
// 29.6% legible text ». Mesure indépendante à l'ouverture de ce lot :
// 70,5 % du texte peint sur l'accueil était sous 12 px. Le plus gros
// volume était `.ct-sub` à 9,9 px — les sous-titres qui disent à quoi sert
// chaque carte — et `.top-sub` à 10,1 px (« Prochaine ouverture lundi
// à 14 h »). Sur une application dont le public est très majoritairement
// senior, ce n'est pas une métrique : c'est le jour de collecte illisible.
//
// ⚠️ Ce test mesure le RENDU, pas la feuille de style. Une règle CSS
// correcte peut être écrasée par un style inline — c'était le cas de
// `.mat-version`, déclarée à 0.5rem dans mat.css et à 0.52rem en inline
// dans index.html. Seul le style calculé dit la vérité (règle 7 du
// CLAUDE.md). Voir ADR-0017.

const PLANCHER_PX = 12;

const EXTERNAL_HOSTS = [
  'onrender.com', 'googleapis.com', 'gstatic.com', 'clearbit.com',
  'open-meteo.com', 'facebook.com', 'api-adresse.data.gouv.fr',
  'apicarto.ign.fr', 'data.geopf.fr', 'cadastre.data.gouv.fr',
  'geoportail-urbanisme', 'raw.githubusercontent.com', 'res.cloudinary.com',
  'data.education.gouv.fr', 'ingest.de.sentry.io', 'sentry.io',
  'tile.openstreetmap.org', 'openstreetmap.org'
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mat_onboarded_v3', '1'));
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (EXTERNAL_HOSTS.some((h) => url.includes(h))) return route.abort();
    return route.continue();
  });
  await page.goto('/');
  await page.waitForSelector('body.app-ready', { timeout: 15000 });
  await page.waitForTimeout(500);
});

// ⚠️ PORTÉE : écran mobile/PWA uniquement.
// Au-delà de 1024 px, `css/mat-desktop.css` prend la main et masque `.header`
// (`.header{display:none}`). Ce lot n'a traité que `css/mat.css` : les 31
// déclarations sous 12 px de la feuille desktop (`.d-nav-sub`, `.d-actu-date`,
// `.d-footer-links`…) restent à corriger dans un lot dédié — la topbar aligne
// 10 boutons sur une seule ligne, l'agrandissement y demande sa propre
// vérification de débordement horizontal. Même idiome de saut que
// `ambiance.spec.js` et `accessibilite-clavier.spec.js`.
async function mobileSeulement(page) {
  const mobile = await page.evaluate(() => {
    const h = document.querySelector('.header');
    return !!h && getComputedStyle(h).display !== 'none';
  });
  test.skip(!mobile, 'feuille desktop non traitée dans ce lot — voir ADR-0017');
}

// Relève chaque nœud de texte réellement peint, avec sa taille calculée.
const RELEVE = (plancher) => {
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const fautifs = [];
  let total = 0, sousPlancher = 0, n;
  while ((n = w.nextNode())) {
    const t = (n.nodeValue || '').trim();
    if (!t) continue;
    const el = n.parentElement;
    if (!el) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const px = parseFloat(cs.fontSize);
    total += t.length;
    if (px < plancher - 0.05) {
      sousPlancher += t.length;
      const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/)[0] : '';
      fautifs.push(`${px.toFixed(1)}px  <${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}>  ${JSON.stringify(t.slice(0, 40))}`);
    }
  }
  return { fautifs: [...new Set(fautifs)], total, sousPlancher };
};

test('accueil : aucun texte peint sous 12 px', async ({ page }) => {
  await mobileSeulement(page);
  const r = await page.evaluate(RELEVE, PLANCHER_PX);
  const lisible = (100 * (r.total - r.sousPlancher) / r.total).toFixed(1);
  console.log(`   texte lisible (>= ${PLANCHER_PX}px) : ${lisible}%  (${r.total} caractères)`);
  expect(r.fautifs, `texte sous ${PLANCHER_PX}px`).toEqual([]);
});

// Le réglage « Taille du texte » ne peut que grandir : si le plancher tient
// en taille normale, il tient a fortiori au-dessus. On le vérifie quand même,
// parce qu'une valeur en px échapperait au multiplicateur sans prévenir.
for (const mode of ['font-large', 'font-xl']) {
  test(`accueil en ${mode} : aucun texte peint sous 12 px`, async ({ page }) => {
    await mobileSeulement(page);
    await page.evaluate((m) => document.documentElement.classList.add(m), mode);
    await page.waitForTimeout(300);
    const r = await page.evaluate(RELEVE, PLANCHER_PX);
    expect(r.fautifs, `texte sous ${PLANCHER_PX}px en ${mode}`).toEqual([]);
  });
}

// `html.font-large` / `html.font-xl` ne redéfinissent que `html`. Si `body`
// portait à nouveau une taille en px, il resterait figé et tout élément sans
// font-size explicite cesserait d'échelonner — en silence.
test('body suit la racine quand le réglage de taille change', async ({ page }) => {
  const lire = () => page.evaluate(() => ({
    html: getComputedStyle(document.documentElement).fontSize,
    body: getComputedStyle(document.body).fontSize
  }));

  expect(await lire()).toEqual({ html: '16px', body: '16px' });

  await page.evaluate(() => document.documentElement.classList.add('font-xl'));
  await page.waitForTimeout(200);
  const xl = await lire();
  expect(xl.html, 'racine en « très grand »').toBe('22px');
  expect(xl.body, 'body doit suivre la racine, pas rester à 16px').toBe('22px');
});

// Garde-fou de mise en page : agrandir du texte ne doit ni pousser la page
// hors de l'écran, ni faire rogner un conteneur sur sa hauteur.
for (const mode of ['normal', 'font-xl']) {
  test(`mise en page intacte en ${mode}`, async ({ page }) => {
    await mobileSeulement(page);
    if (mode !== 'normal') {
      await page.evaluate((m) => document.documentElement.classList.add(m), mode);
      await page.waitForTimeout(300);
    }
    const r = await page.evaluate(() => {
      const rogne = [];
      document.querySelectorAll('.top-card,.card,.ib-t,.bus-strip,.fuel-strip,.header-tools').forEach((el) => {
        if (getComputedStyle(el).overflow !== 'visible' && el.scrollHeight > el.clientHeight + 1) {
          rogne.push(`${(el.className || '').slice(0, 32)} : ${el.scrollHeight} > ${el.clientHeight}`);
        }
      });
      return { rogne, scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth };
    });
    expect(r.scrollW, 'la page déborde horizontalement').toBeLessThanOrEqual(r.clientW);
    expect(r.rogne, 'conteneurs qui rognent leur contenu en hauteur').toEqual([]);
  });
}

// Les pastilles ont une géométrie figée (min-width/height/line-height) : un
// texte agrandi doit continuer à tenir dans le rond, pas déborder du cercle.
test('pastilles : le contenu tient dans la géométrie figée', async ({ page }) => {
  await mobileSeulement(page);
  const g = await page.evaluate(() => {
    const out = [];
    [['#notif-unread-badge', '3'], ['#sondages-badge', '!'], ['#photos-badge', '!'], ['#plui-badge', 'Nouveau']]
      .forEach(([s, txt]) => {
        const el = document.querySelector(s);
        if (!el) return;
        el.style.display = 'inline-flex';
        el.textContent = txt;
        out.push({
          s,
          deborde: el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1
        });
      });
    return out;
  });
  expect(g.length, 'aucune pastille trouvée').toBeGreaterThan(0);
  expect(g.filter((p) => p.deborde), 'pastilles dont le contenu déborde').toEqual([]);
});
