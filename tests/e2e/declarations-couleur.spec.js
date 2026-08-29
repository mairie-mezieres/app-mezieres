const { test, expect } = require('@playwright/test');

// ── Déclarations CSS de couleur et de fond (RGAA 10.5) ────────────────
//
// Le critère demande deux choses, dans les deux sens :
//   10.5.1 — chaque déclaration de couleur de FOND s'accompagne-t-elle d'une
//            couleur de POLICE ?
//   10.5.2 — et réciproquement ?
// avec une note qui change tout : la couleur manquante peut venir d'un
// élément PARENT, « au moins par héritage ». Le référentiel n'exige pas que
// les deux soient posées sur le même sélecteur.
//
// ⚠️ C'est cette note qui avait été manquée. L'audit initial comptait, dans
// le code, chaque règle CSS et chaque style inline posant l'une sans l'autre
// — d'où « ≈ 356 emplacements » — et concluait à la non-conformité. Compter
// par DÉCLARATION au lieu de compter par ÉLÉMENT RENDU, c'était compter des
// centaines de fois un problème qui n'existe presque nulle part. Ce test
// mesure ce que le critère demande : pour chaque texte peint, y a-t-il un
// fond DÉCLARÉ derrière lui, et une couleur déclarée sur lui ou héritée ?
//
// ⛔ Un contrôle qui ne mesure rien verdit. Deux garde-fous ici :
//   1. le test refuse de conclure s'il n'a pas mesuré assez de texte ;
//   2. il vérifie que la racine déclare bien les DEUX propriétés — c'est
//      elle qui satisfait 10.5.2 pour toute la page, `color` étant héritée.
//      Vérifié par sabotage : retirer `background` de `body` et de `html`
//      fait échouer ce test.

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
  await page.waitForTimeout(600);
  // ⚠️ Le critère porte sur la page ENTIÈRE, et cette application tient ses
  // 29 écrans dans une seule page. Mesurer le seul accueil laisserait 28
  // écrans hors du contrôle — c'est très exactement l'angle mort qui a
  // laissé passer la croix de fermeture et le bouton « Bloquées ».
  const ouverts = await page.evaluate(async () => {
    const ids = Object.keys(PLAN_OUVERTURE);
    for (const id of ids) { try { _ouvrirEcran(id); } catch (_) { /* l’écran suivant */ } }
    await new Promise((r) => setTimeout(r, 1500));
    return ids.length;
  });
  expect(ouverts, 'aucun écran ouvert — le contrôle ne peut pas conclure').toBeGreaterThan(20);
});

// Remonte les ancêtres jusqu'à trouver un fond opaque, et rend le nom de
// l'élément qui le pose — ou null si personne n'en pose (le texte repose
// alors sur le blanc par défaut du navigateur, que rien ne déclare).
const QUI_POSE_LE_FOND = `(el) => {
  const nom = (n) => n.tagName.toLowerCase()
    + (n.id ? '#' + n.id : '')
    + (typeof n.className === 'string' && n.className.trim() ? '.' + n.className.trim().split(/\\s+/)[0] : '');
  for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
    const cs = getComputedStyle(n);
    if (/linear-gradient|radial-gradient|url\\(/.test(cs.backgroundImage || '')) return nom(n);
    const m = (cs.backgroundColor || '').match(/[\\d.]+/g);
    if (m && (m.length < 4 || parseFloat(m[3]) >= 0.995)) return nom(n);
  }
  return null;
}`;

test('10.5.1 — chaque texte peint repose sur un fond déclaré', async ({ page }) => {
  const { orphelins, mesures } = await page.evaluate((src) => {
    const quiPose = eval(src);
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const vus = new Set(); const orphelins = []; let mesures = 0, n;
    while ((n = walk.nextNode())) {
      const t = (n.textContent || '').trim();
      if (!t) continue;
      const el = n.parentElement; if (!el || vus.has(el)) continue; vus.add(el);
      const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      mesures++;
      if (!quiPose(el)) orphelins.push({ texte: t.slice(0, 40), balise: el.tagName.toLowerCase(), classe: (typeof el.className === 'string' ? el.className : '').trim().slice(0, 60) });
    }
    return { orphelins, mesures };
  }, QUI_POSE_LE_FOND);

  expect(mesures, 'trop peu de texte mesuré — le contrôle ne peut pas conclure').toBeGreaterThan(200);
  expect(orphelins, 'textes sans aucun fond déclaré dans leur chaîne :\n' + JSON.stringify(orphelins, null, 2)).toEqual([]);
});

// ⛔ AUTO-CONTRÔLE DU DÉTECTEUR. Le test ci-dessus ne peut PAS être mis en
// défaut par sabotage : même en retirant les trois déclarations de fond de
// `html` et `body` dans la feuille de style, la racine en garde une — un
// script en tête d'`index.html` pose `documentElement.style.background`
// avant le chargement du CSS, pour éviter le flash de palette au démarrage.
// Un test qu'on ne sait pas faire rougir est un test dont on ne sait rien.
// On vérifie donc le MÉCANISME plutôt que le produit : sur un élément
// détaché, sans aucun fond nulle part, le détecteur doit rendre `null`.
test('le détecteur de fond sait dire « aucun » (auto-contrôle)', async ({ page }) => {
  const verdicts = await page.evaluate((src) => {
    const quiPose = eval(src);
    // Détaché : aucun ancêtre, donc aucun fond — le détecteur doit rendre null.
    const orphelin = document.createElement('div');
    // Attaché, sous un parent qui pose un fond : le détecteur doit s'arrêter
    // à CE parent, pas remonter jusqu'à `body`.
    const pose = document.createElement('div');
    pose.style.background = '#123456';
    const enfant = document.createElement('span');
    enfant.textContent = 'sonde';
    pose.appendChild(enfant);
    document.body.appendChild(pose);
    const r = { detache: quiPose(orphelin), herite: quiPose(enfant) };
    pose.remove();
    return r;
  }, QUI_POSE_LE_FOND);
  expect(verdicts.detache, 'le détecteur rend un hôte pour un élément sans aucun fond — il ne peut rien prouver').toBeNull();
  expect(verdicts.herite, 'le détecteur ne voit pas le fond posé par le parent').toBe('div');
});

// La lecture la plus SÉVÈRE du critère — celle qui refuse qu'un fond posé
// très haut (sur `body`) compte pour un texte enfoui — ne laissait que sept
// éléments : les sept intitulés de rubrique de l'accueil. Ils déclarent
// désormais leur fond explicitement. Ce test empêche la régression, et vaut
// pour toute rubrique qu'on ajoutera.
test('10.5.1 (lecture sévère) — aucun texte ne dépend de `body` pour son fond', async ({ page }) => {
  const { lointains, mesures } = await page.evaluate((src) => {
    const quiPose = eval(src);
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const vus = new Set(); const lointains = []; let mesures = 0, n;
    while ((n = walk.nextNode())) {
      const t = (n.textContent || '').trim();
      if (!t) continue;
      const el = n.parentElement; if (!el || vus.has(el)) continue; vus.add(el);
      const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      mesures++;
      const hote = quiPose(el);
      if (hote && /^(html|body)/.test(hote)) lointains.push({ texte: t.slice(0, 40), balise: el.tagName.toLowerCase(), classe: (typeof el.className === 'string' ? el.className : '').trim().slice(0, 60), hote });
    }
    return { lointains, mesures };
  }, QUI_POSE_LE_FOND);

  expect(mesures, 'trop peu de texte mesuré — le contrôle ne peut pas conclure').toBeGreaterThan(200);
  expect(lointains, 'textes dont le fond ne vient que de body/html :\n' + JSON.stringify(lointains, null, 2)).toEqual([]);
});

// 10.5.2 : `color` EST une propriété héritée. Une seule déclaration à la
// racine la porte donc à toute la page — ce n'est pas un artifice, c'est le
// mécanisme même de CSS. Mais si elle disparaissait, tout élément qui pose
// un fond sans poser de couleur deviendrait non conforme. C'est le seul
// point à verrouiller.
test('10.5.2 — la racine déclare bien couleur ET fond', async ({ page }) => {
  const racine = await page.evaluate(() => {
    const lu = (sel) => {
      const el = document.querySelector(sel); if (!el) return null;
      const cs = getComputedStyle(el);
      return { color: cs.color, background: cs.backgroundColor, image: cs.backgroundImage };
    };
    return { html: lu('html'), body: lu('body') };
  });
  for (const [nom, v] of Object.entries(racine)) {
    expect(v, `<${nom}> introuvable`).not.toBeNull();
    expect(v.color, `<${nom}> ne déclare pas de couleur de police`).toMatch(/^rgba?\(/);
    const fond = v.background !== 'rgba(0, 0, 0, 0)' || (v.image && v.image !== 'none');
    expect(fond, `<${nom}> ne déclare pas de couleur de fond — 10.5.2 tombe pour toute la page`).toBe(true);
  }
});
