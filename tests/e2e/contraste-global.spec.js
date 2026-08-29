const { test, expect } = require('@playwright/test');

// ── Balayage général des contrastes (RGAA 3.2 / WCAG 1.4.3) ────────────
//
// Le test `contraste-bandeaux.spec.js` verrouille les quatre cartes de
// l'accueil, une par une. Celui-ci fait l'inverse : il parcourt TOUT le
// texte peint, sans liste d'éléments à tenir à jour, et refuse tout ce qui
// passe sous le seuil. C'est ce balayage qui a trouvé, après les bandeaux,
// 15 défauts que personne n'avait listés — la croix de la bannière
// d'installation à 2,00:1, un bouton « Revoir la présentation » écrit en
// vert d'eau sur de la crème à 1,96:1, et six panneaux translucides dont
// le voile CLAIR remontait le fond juste assez pour tout faire échouer.
//
// Deux précautions sans lesquelles il conclurait à tort :
//
//   • Le fond effectif se construit en compositant les couches de
//     l'élément vers la racine. Sauter une couche semi-transparente fait
//     mesurer le fond d'un ancêtre lointain et invente des défauts ; s'y
//     arrêter fait manquer les vrais. `.c3d-statut` (alpha 0,93) et les
//     panneaux à voile (alpha 0,13-0,22) tombent chacun d'un côté.
//   • Les emoji sont peints par la police couleur : la propriété `color`
//     ne les touche pas. Un nœud sans lettre ni chiffre n'est pas
//     mesurable ici et doit être écarté, sinon 🚌 « échoue » à 1,23:1.
//
// Périmètre assumé : les trois rendus livrés par défaut. Les thèmes
// optionnels « bleu » et « sombre » portent encore des défauts connus,
// inventoriés dans docs/accessibilite/audit-rgaa-2026-08-27.md.

const EXTERNAL_HOSTS = [
  'onrender.com', 'googleapis.com', 'gstatic.com', 'clearbit.com',
  'open-meteo.com', 'facebook.com', 'api-adresse.data.gouv.fr',
  'apicarto.ign.fr', 'data.geopf.fr', 'cadastre.data.gouv.fr',
  'geoportail-urbanisme', 'raw.githubusercontent.com', 'res.cloudinary.com',
  'data.education.gouv.fr', 'ingest.de.sentry.io', 'sentry.io',
  'tile.openstreetmap.org', 'openstreetmap.org'
];

// PÉRIMÈTRE — mobile ET bureau, depuis la v4.96. Le hero de la mise en page
// bureau posait un problème que ce balayage ne sait pas résoudre seul : sa
// photographie est une couche SŒUR en position absolue, pas un fond
// d'ancêtre, donc remonter le DOM donne « blanc sur crème », à 1,19:1.
// La réponse n'est pas d'excepter l'élément — c'est de dire la vérité au
// contrôle : `.d-hero` porte désormais un `background` égal au pire cas
// mesuré du voile (#425e50). Il n'est jamais visible, et il rend l'écran
// mesurable. Voir css/mat-desktop.css.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mat_onboarded_v3', '1'));
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (EXTERNAL_HOSTS.some((h) => url.includes(h))) return route.abort();
    return route.continue();
  });
  await page.goto('/');
  await page.waitForSelector('body.app-ready', { timeout: 15000 });
  await page.waitForTimeout(600);
});

const SCAN = () => {
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const sur = (f, b, a) => [0, 1, 2].map((i) => f[i] * a + b[i] * (1 - a));
  const parse = (s) => { const n = (s.match(/[\d.]+/g) || []).map(Number); return n.length >= 3 ? { rgb: n.slice(0, 3), a: n.length > 3 ? n[3] : 1 } : null; };
  const stops = (img) => [...(img || '').matchAll(/rgba?\(([^)]+)\)/g)].map((m) => {
    const n = m[1].split(',').map(Number); return { rgb: n.slice(0, 3), a: n.length > 3 ? n[3] : 1 };
  });

  // ⚠️ Un dégradé ne se mesure pas en entier : il se mesure LÀ OÙ LE TEXTE EST.
  // Le bandeau d'accueil finit sur un orange de coucher de soleil, mais cet
  // orange est tout en bas, sous des cartes opaques — aucun texte ne s'y pose
  // jamais. Mesurer tout le dégradé signalait 4 faux défauts sur le thème
  // « bleu ». On projette donc le rectangle du texte sur l'axe du dégradé et
  // on n'échantillonne que cette portion.
  const angleDeg = (img) => { const m = (img || '').match(/linear-gradient\(\s*(-?[\d.]+)deg/); return m ? parseFloat(m[1]) : 180; };
  function plage(el, hote, img) {
    const a = (90 - angleDeg(img)) * Math.PI / 180;   // en CSS, 0deg pointe vers le haut
    const dx = Math.cos(a), dy = -Math.sin(a);
    const H = hote.getBoundingClientRect(), E = el.getBoundingClientRect();
    if (H.width < 1 || H.height < 1) return [0, 1];
    const L = Math.abs(H.width * dx) + Math.abs(H.height * dy);
    if (!(L > 0)) return [0, 1];
    const cx = H.left + H.width / 2, cy = H.top + H.height / 2;
    let lo = 1, hi = 0;
    for (const q of [[E.left, E.top], [E.right, E.top], [E.left, E.bottom], [E.right, E.bottom]]) {
      const t = 0.5 + ((q[0] - cx) * dx + (q[1] - cy) * dy) / L;
      lo = Math.min(lo, t); hi = Math.max(hi, t);
    }
    return [Math.max(0, Math.min(1, lo)), Math.max(0, Math.min(1, hi))];
  }

  function fonds(el) {
    const pile = []; let base = null;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      const g = stops(cs.backgroundImage);
      if (g.length >= 2) {
        const pl = plage(el, n, cs.backgroundImage);
        const ech = [];
        for (let i = 0; i <= 24; i++) {
          const t = pl[0] + (pl[1] - pl[0]) * (i / 24);
          const u = t * (g.length - 1), k = Math.min(g.length - 2, Math.floor(u)), f = u - k;
          ech.push([0, 1, 2].map((j) => g[k].rgb[j] + (g[k + 1].rgb[j] - g[k].rgb[j]) * f));
        }
        base = ech; break;
      }
      const b = parse(cs.backgroundColor);
      if (b && b.a >= 0.995) { base = [b.rgb]; break; }
      if (b && b.a > 0.004) pile.push(b);
    }
    if (!base) base = [[255, 255, 255]];
    return base.map((bg) => { let c = bg; for (let i = pile.length - 1; i >= 0; i--) c = sur(pile[i].rgb, c, pile[i].a); return c; });
  }

  const out = [];
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const vus = new Set();
  let n, mesures = 0;
  while ((n = walk.nextNode())) {
    const t = (n.textContent || '').trim();
    // ⚠️ Écarter « tout ce qui n'a ni lettre ni chiffre » est trop large :
    // ✕, →, ▼ sont du texte ordinaire, peint par `color`. Seuls les
    // pictogrammes de la police couleur échappent à `color`. Ce filtre-là
    // a laissé passer la croix de la bannière d'installation à 2,00:1.
    if (!t || [...t.replace(/[\s\u200d\ufe0f\ufe0e]/gu, '')].every((c) => /\p{Extended_Pictographic}/u.test(c))) continue;
    const el = n.parentElement; if (!el || vus.has(el)) continue; vus.add(el);
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.1) continue;
    const col = parse(cs.color);
    // Un texte totalement transparent (coche d'une case décochée) n'est pas
    // affiché : il n'a pas de contraste à tenir.
    if (!col || col.a < 0.02) continue;
    const px = parseFloat(cs.fontSize), gras = parseInt(cs.fontWeight, 10) >= 700;
    const seuil = (px >= 24 || (px >= 18.66 && gras)) ? 3 : 4.5;
    mesures++;
    let pire = Infinity, pf = null;
    for (const f of fonds(el)) { const fg = sur(col.rgb, f, col.a); const rr = ratio(fg, f); if (rr < pire) { pire = rr; pf = f; } }
    if (pire < seuil) out.push({
      texte: t.slice(0, 40), balise: el.tagName.toLowerCase(),
      classe: (typeof el.className === 'string' ? el.className : '').trim().slice(0, 60),
      px: Math.round(px * 10) / 10, seuil, ratio: Math.round(pire * 100) / 100,
      couleur: cs.color, fond: 'rgb(' + pf.map(Math.round).join(',') + ')'
    });
  }
  return { echecs: out, mesures };
};

// La bannière d'installation ne s'affiche que lorsque le navigateur propose
// l'installation — jamais sous Playwright. Ses règles ne sont donc peintes
// dans AUCUN test, et le balayage ci-dessus la traverse sans la voir : la
// croix de fermeture est restée à 2,00:1 sans qu'un contrôle bronche.
// Vérifié par sabotage : sans ce test, remettre `.ib-x` à 40 % d'opacité
// laisse toute la suite au vert.
test('la bannière d’installation, jamais visible en test, tient aussi le seuil', async ({ page }) => {
  const visible = await page.evaluate(() => {
    const b = document.getElementById('install-banner');
    if (!b) return false;
    b.classList.remove('hidden');
    b.style.display = 'flex';
    return b.getBoundingClientRect().height > 10;
  });
  expect(visible, '#install-banner introuvable ou non peint — le contrôle ne peut pas conclure').toBe(true);
  const { echecs } = await page.evaluate(SCAN);
  const banniere = echecs.filter((e) => /^ib-|install/.test(e.classe) || e.classe === '');
  expect(echecs, 'contrastes insuffisants (bannière d’installation dépliée) :\n' + JSON.stringify(echecs, null, 2)).toEqual([]);
  expect(banniere).toEqual([]);
});

// ── Le balayage qui compte : TOUS les écrans, TOUS les rendus ──────────
//
// L'accueil seul ne prouve pas grand-chose. Les défauts les plus graves de
// la v4.96 étaient ailleurs : l'écran Rémi affichait ses jours et ses arrêts
// en NOIR SUR NOIR (1,01:1) dans le thème sombre — pas un contraste faible,
// du texte effacé — et le RGPD, les subventions, la carte 3D portaient des
// fonds clairs que le thème sombre n'avait jamais atteints.
//
// Cause commune : `--forest` et `--leaf` sont des verts foncés dans la
// palette claire, parfaits en couleur de TEXTE ; le thème sombre les
// redéfinit en couleurs de FOND. Toute règle qui les employait en texte
// devenait invisible. Aucun contrôle ne pouvait le voir sans ouvrir les
// écrans un par un, dans chaque thème.
//
// ⛔ CHAQUE RENDU EST MESURÉ SUR UNE PAGE CHARGÉE DANS CE RENDU — jamais en
// basculant une classe sur une page déjà peinte. La première version faisait
// l'inverse, et `getComputedStyle` lui rendait une valeur PÉRIMÉE : sur une
// page portant 29 écrans, Chrome diffère le recalcul. Elle signalait 8
// défauts qui n'existaient pas — vérifié en interrogeant le navigateur règle
// par règle : les règles de thème s'appliquaient parfaitement. Forcer la
// purge du style suffisait sur une machine de développement et PAS sur le
// runner de CI, plus lent : le test est passé rouge à la première exécution
// distante. Un test à moitié déterministe est un test qui ment une fois sur
// deux. On recharge donc la page, avec le réglage écrit dans `mat_accessibility`,
// exactement comme un habitant qui a choisi son thème.
const RENDUS = [
  ['par défaut',      {}],
  ['daltonisme',      { colorblind: true }],
  ['contraste élevé', { contrast: true }],
  ['thème bleu',      { theme: 'bleu' }],
  ['thème sombre',    { theme: 'sombre' }]
];

async function chargerDans(page, reglages) {
  await page.addInitScript((r) => {
    localStorage.setItem('mat_onboarded_v3', '1');
    localStorage.setItem('mat_accessibility', JSON.stringify(r));
  }, reglages);
  await page.goto('/');
  await page.waitForSelector('body.app-ready', { timeout: 15000 });
  await page.waitForTimeout(600);
}

test('les 29 écrans tiennent le seuil dans les cinq rendus livrés', async ({ page }) => {
  test.slow();
  const bilan = [];
  for (const [nom, reglages] of RENDUS) {
    await chargerDans(page, reglages);

    // Le rendu doit être RÉELLEMENT actif : sans cette vérification, un
    // réglage mal nommé ferait mesurer cinq fois le thème par défaut et
    // conclure que tout va bien.
    const actif = await page.evaluate(() => document.documentElement.className);
    const attendu = reglages.theme === 'sombre' ? 'theme-sombre'
      : reglages.theme === 'bleu' ? 'theme-bleu'
      : reglages.colorblind ? 'colorblind-mode'
      : reglages.contrast ? 'high-contrast' : null;
    if (attendu) expect(actif, `rendu « ${nom} » : la classe ${attendu} n’est pas appliquée`).toContain(attendu);

    const ouverts = await page.evaluate(async () => {
      const ids = Object.keys(PLAN_OUVERTURE);
      for (const id of ids) { try { _ouvrirEcran(id); } catch (_) { /* l’écran suivant */ } }
      await new Promise((r) => setTimeout(r, 1500));
      return ids.length;
    });
    expect(ouverts, `rendu « ${nom} » : aucun écran ouvert`).toBeGreaterThan(20);

    const { echecs, mesures } = await page.evaluate(SCAN);
    expect(mesures, `rendu « ${nom} » : aucun texte mesuré`).toBeGreaterThan(200);
    for (const e of echecs) bilan.push({ rendu: nom, ...e });
  }
  expect(bilan, 'contrastes insuffisants :\n' + JSON.stringify(bilan, null, 2)).toEqual([]);
});

for (const [nom, reglages] of RENDUS) {
  test(`accueil — aucun texte sous le seuil (rendu ${nom})`, async ({ page }) => {
    await chargerDans(page, reglages);
    const { echecs, mesures } = await page.evaluate(SCAN);
    // ⚠️ Un balayage qui ne mesure rien ne rougit pas : il verdit. Le
    // garde-fou est ici, pas dans le nombre d'échecs.
    expect(mesures, 'le balayage n’a mesuré aucun texte — il ne peut pas conclure').toBeGreaterThan(40);
    expect(echecs, 'contrastes insuffisants :\n' + JSON.stringify(echecs, null, 2)).toEqual([]);
  });
}
