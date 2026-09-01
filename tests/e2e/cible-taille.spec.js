const { test, expect } = require('@playwright/test');

// ── WCAG 2.2 : taille de la cible et focus non masqué ─────────────────
//
// ANTICIPATION, pas obligation actuelle. Le RGAA 5, attendu fin 2026,
// intègre les WCAG 2.2 — publiées par le W3C depuis 2023, donc mesurables
// aujourd'hui. Deux de leurs nouveaux critères se testent mécaniquement :
//
//   2.5.8 Taille de la cible (minimum, AA) — 24 × 24 px, sauf exceptions
//   2.4.11 Focus non masqué (minimum, AA) — le focus n'est pas ENTIÈREMENT
//          recouvert par du contenu de l'auteur
//
// Le balayage des 29 écrans n'a trouvé que NEUF cibles trop petites : huit
// liens de pied de page ou de texte, et la croix de la bannière
// d'installation. Elles ont été agrandies par du `padding` — le libellé ne
// bouge pas, seule la zone cliquable grandit. Ce test empêche d'en
// réintroduire.
//
// ⚠️ CE QUI REND CE TEST HONNÊTE, c'est l'exception d'ESPACEMENT. Le critère
// admet une cible plus petite si un disque de 24 px centré sur elle ne
// croise le disque d'aucune autre cible. Sans cette exception, le test
// exigerait 24 px partout et ferait « corriger » des dizaines d'éléments
// que le référentiel accepte : il serait plus sévère que la norme, ce qui
// est une autre façon de ne pas mesurer la bonne chose.

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
  const ouverts = await page.evaluate(async () => {
    const ids = Object.keys(PLAN_OUVERTURE);
    for (const id of ids) { try { _ouvrirEcran(id); } catch (_) { /* l’écran suivant */ } }
    await new Promise((r) => setTimeout(r, 1500));
    return ids.length;
  });
  expect(ouverts, 'aucun écran ouvert — le contrôle ne peut pas conclure').toBeGreaterThan(20);
});

const CIBLES = () => {
  const SEL = 'a[href],button,input,select,textarea,[role="button"],[role="link"],'
    + '[role="checkbox"],[role="switch"],[tabindex]:not([tabindex="-1"]),summary';
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.1) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const nom = (el) => el.tagName.toLowerCase()
    + (el.id ? '#' + el.id : '')
    + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  return { SEL, visible, nom };
};

// ⚠️ LA BANNIÈRE D'INSTALLATION DOIT ÊTRE DÉPLIÉE DE FORCE. Sa croix `.ib-x`
// faisait 21 px de large : sous l'exception d'espacement, elle ne devient un
// défaut que lorsqu'une autre cible passe assez près — ce qui dépendait de
// l'état de la page au moment de la mesure. Le contrôle est donc passé au
// vert en solo et au ROUGE dans la suite complète, sur la même application.
// Un contrôle qui mesure une cible « quand ça tombe bien » ne mesure rien :
// on la déplie ici, et l'assertion de couverture ci-dessous refuse de
// conclure si `.ib-x` n'a pas été examinée.
test('2.5.8 — aucune cible sous 24 × 24 px sans marge suffisante', async ({ page }) => {
  const banniere = await page.evaluate(() => {
    const b = document.getElementById('install-banner');
    if (!b) return false;
    b.classList.remove('hidden');
    b.style.display = 'flex';
    return b.getBoundingClientRect().height > 10;
  });
  expect(banniere, '#install-banner non peint — la croix ne serait pas mesurée').toBe(true);

  const { trop, total, noms } = await page.evaluate(() => {
    const SEL = 'a[href],button,input,select,textarea,[role="button"],[role="link"],'
      + '[role="checkbox"],[role="switch"],[tabindex]:not([tabindex="-1"]),summary';
    const visible = (el) => {
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.1) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const nom = (el) => el.tagName.toLowerCase()
      + (el.id ? '#' + el.id : '')
      + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');

    const cibles = [...document.querySelectorAll(SEL)].filter(visible);
    const rects = cibles.map((el) => {
      const r = el.getBoundingClientRect();
      return { el, r, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
    });
    const trop = [];
    for (const c of rects) {
      if (c.r.width >= 24 && c.r.height >= 24) continue;
      // Exception « inline » : la cible est dans une phrase.
      const cs = getComputedStyle(c.el);
      if (cs.display === 'inline' && c.el.closest('p,li,td,summary')) continue;
      // Exception d'ESPACEMENT : aucun autre disque de 24 px ne croise le sien.
      let espace = true;
      for (const o of rects) {
        if (o.el === c.el) continue;
        if (Math.hypot(c.cx - o.cx, c.cy - o.cy) < 24) { espace = false; break; }
      }
      if (!espace) trop.push({
        nom: nom(c.el),
        texte: (c.el.textContent || '').trim().slice(0, 30),
        taille: Math.round(c.r.width) + '×' + Math.round(c.r.height)
      });
    }
    return { trop, total: rects.length, noms: rects.map((c) => nom(c.el)) };
  });

  expect(total, 'aucune cible interactive trouvée — le contrôle ne peut pas conclure').toBeGreaterThan(100);
  expect(noms, 'la croix de la bannière d’installation n’a pas été mesurée').toContain('button.ib-x');
  expect(trop, 'cibles sous 24 × 24 px sans marge suffisante :\n' + JSON.stringify(trop, null, 2)).toEqual([]);
});

// ⚠️ Ce contrôle-ci se fait sur l'accueil SEUL, écrans refermés. Avec les 29
// écrans empilés — l'état que monte le `beforeEach` pour le contrôle des
// tailles — les commandes de l'accueil sont évidemment recouvertes par les
// panneaux : le balayage signalait « Installer », « Nouveautés »…
// Ce n'est pas un défaut, c'est un état que l'application ne présente jamais,
// et où ces commandes ne reçoivent de toute façon pas le focus. Mesurer là
// aurait produit une liste de faux défauts, et fait « corriger » du code sain.
test('2.4.11 — le focus n’est jamais entièrement masqué', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('body.app-ready', { timeout: 15000 });
  await page.waitForTimeout(500);
  const { masques, examines, trouves } = await page.evaluate(() => {
    const SEL = 'a[href],button,input,select,textarea,[role="button"],[tabindex]:not([tabindex="-1"]),summary';
    const nom = (el) => el.tagName.toLowerCase()
      + (el.id ? '#' + el.id : '')
      + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
    const masques = []; let examines = 0, trouves = 0;
    for (const el of document.querySelectorAll(SEL)) {
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      let r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      trouves++;
      // ⚠️ PAS de `preventScroll`. C'est tout le sujet du critère : au clavier,
      // Tab fait défiler la cible jusque dans la vue — et la question est de
      // savoir si un bandeau collant la recouvre UNE FOIS ARRIVÉE. Empêcher le
      // défilement, c'est mesurer une position que personne n'a jamais.
      // (Avec `preventScroll`, ce contrôle n'examinait que 14 éléments : tous
      //  les autres restaient hors écran et étaient ignorés en silence.)
      el.focus();
      r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) continue;   // n'a pas pu défiler
      examines++;
      // Le critère demande que le focus ne soit pas ENTIÈREMENT masqué : il
      // suffit qu'un point de la cible reste atteignable au pointeur.
      const pts = [[r.left + 2, r.top + 2], [r.right - 2, r.top + 2],
        [r.left + r.width / 2, r.top + r.height / 2],
        [r.left + 2, r.bottom - 2], [r.right - 2, r.bottom - 2]];
      const visibleQqPart = pts.some(([x, y]) => {
        if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return false;
        const top = document.elementFromPoint(x, y);
        return top && (top === el || el.contains(top) || top.contains(el));
      });
      if (!visibleQqPart) masques.push({ nom: nom(el), texte: (el.textContent || '').trim().slice(0, 30) });
    }
    return { masques, examines, trouves };
  });

  // ⛔ Deux garde-fous, parce qu'un contrôle qui n'examine rien verdit.
  // L'accueil seul porte une petite quarantaine de commandes focalisables —
  // les écrans ne sont pas montés. On exige donc un plancher ET que le
  // balayage ait bien atteint la quasi-totalité de ce qu'il a trouvé : si des
  // éléments cessaient de pouvoir défiler jusque dans la vue, ils seraient
  // ignorés en silence, et le test resterait vert en ne mesurant plus rien.
  expect(trouves, 'trop peu de commandes focalisables — le contrôle ne peut pas conclure').toBeGreaterThan(25);
  expect(examines, `${trouves - examines} élément(s) n’ont pas pu défiler jusque dans la vue`).toBeGreaterThanOrEqual(trouves - 3);
  expect(masques, 'éléments dont le focus est entièrement masqué :\n' + JSON.stringify(masques, null, 2)).toEqual([]);
});
