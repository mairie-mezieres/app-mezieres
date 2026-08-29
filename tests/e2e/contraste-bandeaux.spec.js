const { test, expect } = require('@playwright/test');

// ── Contraste des quatre bandeaux de l'accueil (RGAA 3.2 / WCAG 1.4.3) ──
//
// Les 35 mesures de ces bandeaux échouaient toutes avant la v4.95, la plus
// basse à 1,73:1 pour un seuil de 4,5:1. Trois pièges expliquent que le
// défaut ait survécu si longtemps sans que rien ne rougisse :
//
//   1. axe-core ne conclut PAS sur du texte posé sur un dégradé : il le
//      range dans `incomplete`, pas dans `violations`. Un rapport « 0
//      violation » ne dit donc rien de ces quatre cartes.
//   2. `rgba(255,255,255,.72)` n'est pas du blanc. Sans compositage sur le
//      fond, on mesure un contraste que personne ne voit.
//   3. Un dégradé n'a pas deux couleurs mais un continuum. `#2563eb`
//      passait ; `#38bdf8`, à l'autre bout de la MÊME carte, tombait à
//      1,73:1. Ne mesurer que la couleur déclarée en premier verdit.
//
// Ce test refait le calcul de bout en bout, dans un vrai navigateur, à
// partir du style CALCULÉ (donc après cascade, thèmes et styles inline) :
// il balaie le dégradé sur 51 points, composite les alphas, et exige
// 4,5:1 partout. Il couvre aussi le mode daltonisme, qui redéfinit deux
// des quatre dégradés et qui échouait sur ses 8 mesures.
//
// ⚠️ Vérifié par sabotage : remettre `.top-title` à rgba(255,255,255,.72),
// ou `.top-badge` à un voile clair, ou l'un des dégradés à sa valeur
// d'avant la v4.95, fait échouer ce test. Voir l'audit § « Huitième passe ».

const SEUIL = 4.5;

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
  await page.waitForTimeout(400);
});

// Les textes de chaque bandeau. Un sélecteur absent du DOM est ignoré —
// certains ne sont peints que dans un état donné (chargement, alerte…) —
// mais le test exige qu'au moins un texte par bandeau ait été mesuré,
// sinon il conclurait « tout va bien » en n'ayant rien regardé.
const BANDEAUX = [
  { carte: '.top-mairie',  textes: ['.top-title', '.top-main', '.top-sub', '.top-badge'] },
  { carte: '.top-meteo',   textes: ['.top-title', '.top-main', '.top-sub', '.top-badge', '.meteo-loading', '.meteo-alerte'] },
  { carte: '.top-dechets', textes: ['.top-title', '.dechet-row', '.dechet-label-noir', '.dechet-label-jaune', '.dechet-info-cell', '.dechet-ok', '.dechet-warn'] },
  { carte: '.top-event',   textes: ['.top-title', '.event-date', '.event-name', '.event-days', '.event-loading'] }
];

// Tout le calcul tourne DANS la page : c'est le navigateur qui résout la
// cascade, pas une relecture de la feuille de style.
const MESURE = ([bandeaux, seuil]) => {
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const sur = (fg, bg, a) => [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a));

  // « rgb(37, 99, 235) » ou « rgba(255, 255, 255, 0.72) »
  const parse = (s) => {
    const n = (s.match(/[\d.]+/g) || []).map(Number);
    return n.length >= 3 ? { rgb: n.slice(0, 3), a: n.length > 3 ? n[3] : 1 } : null;
  };
  // Toutes les couleurs citées par un linear-gradient(), dans l'ordre.
  const arrets = (img) => {
    const out = [];
    const re = /rgba?\(([^)]+)\)/g;
    let m;
    while ((m = re.exec(img))) { const p = parse('rgb(' + m[1] + ')'); if (p) out.push(p); }
    return out;
  };

  const res = [];
  for (const { carte, textes } of bandeaux) {
    const el = document.querySelector(carte);
    if (!el) { res.push({ carte, erreur: 'carte absente du DOM' }); continue; }
    const cs = getComputedStyle(el);
    const stops = arrets(cs.backgroundImage || '');
    if (stops.length < 2) { res.push({ carte, erreur: 'aucun dégradé lu sur ' + carte }); continue; }

    // Balayage : 51 points entre chaque paire d'arrêts consécutifs.
    const fonds = [];
    for (let s = 0; s < stops.length - 1; s++) {
      for (let i = 0; i <= 50; i++) {
        const t = i / 50;
        fonds.push([0, 1, 2].map((k) => stops[s].rgb[k] + (stops[s + 1].rgb[k] - stops[s].rgb[k]) * t));
      }
    }

    let mesures = 0;
    for (const sel of textes) {
      const t = el.querySelector(sel);
      if (!t) continue;
      const tcs = getComputedStyle(t);
      const col = parse(tcs.color);
      if (!col) continue;
      // Voile propre au texte (pastille) : composité entre le dégradé et le texte.
      const voile = parse(tcs.backgroundColor);
      const opaque = voile && voile.a > 0.01;
      mesures++;
      let pire = Infinity, pireFond = null;
      for (const f of fonds) {
        const bg = opaque ? sur(voile.rgb, f, voile.a) : f;
        const fg = sur(col.rgb, bg, col.a);
        const r = ratio(fg, bg);
        if (r < pire) { pire = r; pireFond = bg; }
      }
      if (pire < seuil) {
        res.push({ carte, sel, pire: Math.round(pire * 100) / 100,
                   couleur: tcs.color, fond: 'rgb(' + pireFond.map(Math.round).join(',') + ')' });
      }
    }
    if (mesures === 0) res.push({ carte, erreur: 'aucun texte mesuré sur ' + carte });
  }
  return res;
};

test('les quatre bandeaux atteignent 4,5:1 sur tout leur dégradé', async ({ page }) => {
  const echecs = await page.evaluate(MESURE, [BANDEAUX, SEUIL]);
  expect(echecs, 'contrastes insuffisants ou mesure impossible :\n' + JSON.stringify(echecs, null, 2)).toEqual([]);
});

test('les bandeaux tiennent aussi en mode daltonisme', async ({ page }) => {
  await page.evaluate(() => document.documentElement.classList.add('colorblind-mode'));
  await page.waitForTimeout(150);
  const echecs = await page.evaluate(MESURE, [BANDEAUX, SEUIL]);
  expect(echecs, 'contrastes insuffisants en mode daltonisme :\n' + JSON.stringify(echecs, null, 2)).toEqual([]);
});

test('les pastilles de couleur des bacs restent le repère visuel (non-texte, 3:1)', async ({ page }) => {
  // Le libellé « Bac jaune » ayant perdu sa couleur, c'est la pastille qui
  // porte l'information — elle doit donc tenir le seuil non-texte de 3:1.
  const r = await page.evaluate(() => {
    const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const lum = ([a, b, c]) => 0.2126 * lin(a) + 0.7152 * lin(b) + 0.0722 * lin(c);
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
    const num = (s) => (s.match(/[\d.]+/g) || []).map(Number).slice(0, 3);
    const carte = document.querySelector('.top-dechets');
    const stops = [...(getComputedStyle(carte).backgroundImage || '').matchAll(/rgba?\(([^)]+)\)/g)]
      .map((m) => m[1].split(',').map(Number).slice(0, 3));
    return ['.dechet-dot-jaune', '.dechet-dot-noir'].map((sel) => {
      const d = carte.querySelector(sel);
      if (!d) return { sel, pire: null };
      const c = num(getComputedStyle(d).backgroundColor);
      let pire = Infinity;
      for (let s = 0; s < stops.length - 1; s++)
        for (let i = 0; i <= 50; i++) {
          const t = i / 50;
          pire = Math.min(pire, ratio(c, [0, 1, 2].map((k) => stops[s][k] + (stops[s + 1][k] - stops[s][k]) * t)));
        }
      return { sel, pire: Math.round(pire * 100) / 100 };
    });
  });
  for (const { sel, pire } of r) {
    expect(pire, sel + ' : la pastille doit exister pour porter le repère de couleur').not.toBeNull();
    expect(pire, sel + ' : ' + pire + ':1, seuil non-texte 3:1').toBeGreaterThanOrEqual(3);
  }
});

test('aucun texte de bandeau ne redevient semi-transparent', async ({ page }) => {
  // Garde-fou de forme, en plus de la mesure : c'est la transparence qui a
  // rendu le défaut invisible pendant des mois — une couleur « blanche »
  // dans la feuille de style, un gris clair à l'écran.
  const flous = await page.evaluate(([bandeaux]) => {
    const out = [];
    for (const { carte, textes } of bandeaux) {
      const el = document.querySelector(carte);
      if (!el) continue;
      for (const sel of textes) {
        const t = el.querySelector(sel);
        if (!t) continue;
        const n = (getComputedStyle(t).color.match(/[\d.]+/g) || []).map(Number);
        if (n.length > 3 && n[3] < 1) out.push({ carte, sel, couleur: getComputedStyle(t).color });
      }
    }
    return out;
  }, [BANDEAUX]);
  expect(flous, 'textes semi-transparents :\n' + JSON.stringify(flous, null, 2)).toEqual([]);
});
