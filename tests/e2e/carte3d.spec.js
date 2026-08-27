// @ts-check
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

/*
 * Carte 3D du village (overlay ov-carte3d).
 *
 * Les tests portent sur ce qui doit tenir quoi qu'il arrive — l'ouverture de
 * l'overlay, l'absence de chargement de MapLibre au démarrage, l'accessibilité,
 * et le fait qu'aucun bâtiment inventé n'apparaisse quand les sources sont
 * muettes (ADR-0018).
 *
 * ⚠️ Les hôtes externes sont COUPÉS, comme dans smoke.spec.js. Sans cela, le
 * test « aucun bâtiment inventé » dépend de l'environnement : il passait en
 * local (réseau fermé) et échouait en CI, où le runner GitHub atteint
 * réellement l'IGN et charge donc de vrais bâtiments. Un test dont le verdict
 * change avec la connexion ne prouve rien.
 *
 * Leçon des étoiles invisibles (ADR-0015) : on assert le STYLE CALCULÉ, pas
 * seulement l'attribut — `.c3d-btn{display:flex}` l'emporte sur le display:none
 * que le navigateur applique à [hidden].
 */

const HOTES_EXTERNES = [
  'onrender.com', 'googleapis.com', 'gstatic.com', 'open-meteo.com',
  'facebook.com', 'api-adresse.data.gouv.fr', 'apicarto.ign.fr',
  'data.geopf.fr', 'cadastre.data.gouv.fr', 'geoportail-urbanisme',
  'raw.githubusercontent.com', 'res.cloudinary.com', 'data.education.gouv.fr',
  'sentry.io', 'overpass-api.de', 'openstreetmap.org'
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mat_onboarded_v3', '1');
  });
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (HOTES_EXTERNES.some((h) => url.includes(h))) return route.abort();
    return route.continue();
  });
});

async function ouvrirAccueil(page) {
  await page.goto('/');
  await page.waitForFunction(() => typeof window.openOv === 'function');
}

test.describe('Carte 3D', () => {

  test('MapLibre n’est pas chargé au démarrage', async ({ page }) => {
    await ouvrirAccueil(page);
    // Le module léger doit être là, la bibliothèque lourde non : c'est toute
    // la raison du chargement à la demande (ADR-0018).
    await page.waitForFunction(() => typeof window.matOuvrirCarte3D === 'function');
    expect(await page.evaluate(() => typeof window.maplibregl)).toBe('undefined');
    const scripts = await page.evaluate(() =>
      [...document.querySelectorAll('script[src]')].map(s => s.getAttribute('src')));
    expect(scripts.some(s => /maplibre/i.test(s || ''))).toBe(false);
  });

  test('la page PLUi-H-D propose la carte', async ({ page }) => {
    await ouvrirAccueil(page);
    await page.evaluate(() => window.openPlui());
    const bouton = page.locator('#ov-plui button', { hasText: 'Voir le zonage en relief' });
    await expect(bouton).toBeVisible();
  });

  // La grille de cartes est celle du téléphone : au-delà de 1024 px, la mise
  // en page desktop prend le relais et la masque. Le test est donc borné,
  // comme celui des étoiles du bandeau.
  test('l’accueil propose la carte, sous MEL', async ({ page, viewport }) => {
    test.skip(!viewport || viewport.width >= 1024, 'mise en page téléphone uniquement');
    await ouvrirAccueil(page);
    const tuile = page.locator('.content button.card', { hasText: 'Mon village en 3D' });
    await expect(tuile).toBeVisible();
    // La tuile doit venir APRÈS celle de MEL : c'est la hiérarchie voulue
    // dans « Démarches et Services ».
    const ordre = await page.evaluate(() => {
      const cartes = [...document.querySelectorAll('.content button.card')];
      const i = cartes.findIndex(c => c.textContent.includes('MEL'));
      const j = cartes.findIndex(c => c.textContent.includes('Mon village en 3D'));
      return { i, j };
    });
    expect(ordre.i).toBeGreaterThanOrEqual(0);
    expect(ordre.j).toBeGreaterThan(ordre.i);
  });

  test('sur ordinateur, la carte est dans « Vous aider » et dans le menu', async ({ page, viewport }) => {
    test.skip(!viewport || viewport.width < 1024, 'mise en page ordinateur uniquement');
    await ouvrirAccueil(page);
    await expect(page.locator('.d-col-right button', { hasText: 'Mon village en 3D' })).toBeVisible();
    await expect(page.locator('.d-nav-links button', { hasText: 'Mon village en 3D' })).toBeVisible();
  });

  test('la couche des bâtiments est acceptée par MapLibre', async ({ page }) => {
    /*
     * En v4.66, `fill-extrusion-opacity` recevait une expression basée sur les
     * données pour estomper les communes voisines. MapLibre ne le permet pas
     * (« data expressions not supported ») et refuse alors la couche ENTIÈRE :
     * plus aucun bâtiment sur la carte. Aucun test ne l'a vu, parce que sans
     * réseau il n'y a pas de bâti à poser — la couche n'était jamais créée.
     *
     * Ce test pose la couche avec un bâtiment fictif : il n'a besoin d'aucune
     * donnée distante, seulement de la bibliothèque, servie en local.
     */
    await ouvrirAccueil(page);
    await page.evaluate(() => window.matOuvrirCarte3D());
    await page.waitForFunction(() => window._c3dMap && window._c3dMap.loaded(), null, { timeout: 30000 });

    const erreurs = [];
    page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });

    const pose = await page.evaluate(() => {
      const carre = (lon, lat) => ({ type: 'Polygon', coordinates: [[
        [lon, lat], [lon + 0.0002, lat], [lon + 0.0002, lat + 0.0002], [lon, lat + 0.0002], [lon, lat]
      ]] });
      // Une maison, une église, un hangar, et un bâtiment hors commune :
      // les quatre chemins des expressions de couleur sont exercés.
      const fc = { type: 'FeatureCollection', features: [
        { type: 'Feature', properties: { mat_h: 8,  mat_dans: 1, mat_type: 'habitat',   mat_toit: 1.3 },
          geometry: carre(1.8079, 47.8219) },
        { type: 'Feature', properties: { mat_h: 14, mat_dans: 1, mat_type: 'culte',     mat_toit: 3.2 },
          geometry: carre(1.8083, 47.8219) },
        { type: 'Feature', properties: { mat_h: 7,  mat_dans: 1, mat_type: 'agricole',  mat_toit: 0.9 },
          geometry: carre(1.8087, 47.8219) },
        { type: 'Feature', properties: { mat_h: 6,  mat_dans: 0, mat_type: 'habitat',   mat_toit: 1.3 },
          geometry: carre(1.7700, 47.7950) }
      ]};
      window._c3dPoserBati(fc);
      const m = window._c3dMap;
      const toits = m.getSource('toits').serialize().data.features;
      // Largeur au sol d'une tranche, en degrés de latitude : sert à vérifier
      // que la pile RÉTRÉCIT — c'est ce qui fait la pente.
      const larg = (f) => {
        const ys = f.geometry.coordinates[0].map(c => c[1]);
        return Math.max(...ys) - Math.min(...ys);
      };
      const pileMaison = toits.filter(f => f.properties.mat_type === 'habitat');
      return {
        bati: !!m.getLayer('bati'), toit: !!m.getLayer('bati-toit'),
        plat: !!m.getLayer('bati-toit-plat'), contour: !!m.getLayer('bati-contour'),
        // La maison est bien découpée en tranches empilées…
        tranches: pileMaison.length,
        // …qui montent bord à bord, sans trou ni recouvrement…
        continue: pileMaison.every((f, i, a) =>
          i === 0 || Math.abs(f.properties.mat_b - a[i - 1].properties.mat_t) < 1e-6),
        // …et rétrécissent : la dernière est plus étroite que la première.
        retrecit: pileMaison.length > 1 && larg(pileMaison[pileMaison.length - 1]) < larg(pileMaison[0]),
        // Le toit part du haut des murs, jamais du sol.
        basAuSommet: Math.abs(pileMaison[0].properties.mat_b - 8) < 1e-6,
        // Hors commune et industriel : pas de tranches, donc pas de pente.
        horsCommune: toits.filter(f => f.properties.mat_dans === 0).length
      };
    });

    expect(pose.bati, 'la couche « bati » doit exister').toBe(true);
    expect(pose.toit, 'la couche des toits en pente doit exister').toBe(true);
    expect(pose.plat, 'la couche des casquettes plates doit exister').toBe(true);
    expect(pose.contour, 'la couche « bati-contour » doit exister').toBe(true);
    expect(pose.tranches, 'la maison doit être coiffée de plusieurs tranches').toBeGreaterThan(3);
    expect(pose.continue, 'les tranches doivent s’empiler sans trou').toBe(true);
    expect(pose.retrecit, 'la pile doit rétrécir vers le faîtage — sinon ce n’est pas une pente').toBe(true);
    expect(pose.basAuSommet, 'le toit doit démarrer au sommet des murs').toBe(true);
    expect(pose.horsCommune, 'le bâti hors commune garde une casquette plate').toBe(0);
    const refus = erreurs.filter(e => /paint|layers\.bati|not supported|unknown property/i.test(e));
    expect(refus, refus.join(' | ')).toEqual([]);
  });

  test('un toit ne déborde jamais de son bâtiment', async ({ page }) => {
    /*
     * Le faîtage est posé le long du grand axe de l'emprise. Une approche
     * naïve — coiffer le rectangle englobant — ferait déborder le toit d'une
     * maison en L au-dessus de la cour. Le découpage se fait donc sur
     * l'emprise réelle : chaque tranche doit rester dans le polygone d'origine.
     */
    await ouvrirAccueil(page);
    await page.evaluate(() => window.matOuvrirCarte3D());
    await page.waitForFunction(() => window._c3dMap && window._c3dMap.loaded(), null, { timeout: 30000 });

    const debord = await page.evaluate(() => {
      // Un bâtiment en L, cas où un toit posé sur la boîte englobante
      // couvrirait un vide.
      const L = 1.8079, T = 47.8219, d = 0.0003;
      const enL = [[L, T], [L + d, T], [L + d, T + d / 2], [L + d / 2, T + d / 2],
                   [L + d / 2, T + d], [L, T + d], [L, T]];
      const fc = { type:'FeatureCollection', features:[
        { type:'Feature', properties:{ mat_h:7, mat_dans:1, mat_type:'habitat', mat_toit:2.6 },
          geometry:{ type:'Polygon', coordinates:[enL] } }
      ]};
      const toits = window._c3dToitsPente(fc);
      // Test du point dans le polygone, par lancer de rayon.
      const dedans = (p, poly) => {
        let ok = false;
        for (let i = 0, j = poly.length - 2; i < poly.length - 1; j = i++) {
          const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
          if ((yi > p[1]) !== (yj > p[1]) &&
              p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) ok = !ok;
        }
        return ok;
      };
      const marge = 1e-9;
      let hors = 0, sommets = 0;
      for (const f of toits.features)
        for (const p of f.geometry.coordinates[0]) {
          sommets++;
          // Un sommet posé exactement sur le bord compte comme dedans.
          const surBord = enL.some(q => Math.abs(q[0] - p[0]) < marge && Math.abs(q[1] - p[1]) < marge);
          if (!surBord && !dedans(p, enL) && !enL.some((q, i) => {
            const r = enL[(i + 1) % (enL.length - 1)];
            const dx = r[0] - q[0], dy = r[1] - q[1];
            const t = ((p[0] - q[0]) * dx + (p[1] - q[1]) * dy) / (dx * dx + dy * dy);
            if (t < -1e-6 || t > 1 + 1e-6) return false;
            return Math.hypot(q[0] + t * dx - p[0], q[1] + t * dy - p[1]) < 1e-9;
          })) hors++;
        }
      return { hors, sommets, tranches: toits.features.length };
    });

    expect(debord.tranches, 'le bâtiment en L doit recevoir des tranches').toBeGreaterThan(3);
    expect(debord.hors, `${debord.hors} sommet(s) de toit hors de l’emprise sur ${debord.sommets}`).toBe(0);
  });

  test('territoire : les communes viennent du Géoportail, jamais d’une supposition', async ({ page }) => {
    /*
     * ⚠️ Le cœur de la garantie « aucun code INSEE inventé ». Les 25 NOMS
     * viennent de la mairie ; les codes, contours et partitions doivent venir
     * du Géoportail. `_c3dApparier` est la charnière : elle ne doit retenir
     * que ce que le service a réellement renvoyé, et signaler le reste.
     *
     * Fonction pure → testable sans réseau, alors que tout le reste de cette
     * vue est invérifiable ici (apicarto est bloqué).
     */
    await ouvrirAccueil(page);
    await page.evaluate(() => window.matOuvrirCarte3D());
    await page.waitForFunction(() => typeof window._c3dApparier === 'function', null, { timeout: 30000 });

    const r = await page.evaluate(() => {
      const f = (name, extra) => ({ type: 'Feature', properties: Object.assign({ name }, extra || {}),
                                    geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] } });
      const res = window._c3dApparier([
        // casse et accents différents de la liste de la mairie
        f('MEZIERES-LEZ-CLERY', { insee: '45204', partition: 'DU_45204' }),
        f('Épieds-en-Beauce',   { insee: '45131', partition: 'DU_45131' }),
        f('Baule',              { insee: '45025', is_rnu: true }),
        // une commune voisine hors CCTVL : ne doit PAS entrer
        f('Orléans',            { insee: '45234', partition: 'DU_45234' }),
        // un doublon : ne doit pas compter deux fois
        f('Baule',              { insee: '45025' })
      ]);
      return {
        noms: res.trouvees.map(c => c.nom),
        insee: res.trouvees.map(c => c.insee),
        rnu: res.trouvees.filter(c => c.rnu).map(c => c.nom),
        nbManquantes: res.manquantes.length,
        orleans: res.trouvees.some(c => /orl/i.test(c.nom)),
        // aucune commune retenue ne doit porter un code que le service n'a pas donné
        inventes: res.trouvees.filter(c => !c.insee).length,
        total: window.C3D_CCTVL.length
      };
    });

    expect(r.total, 'les 25 communes de la CCTVL sont listées').toBe(25);
    expect(r.orleans, 'une commune hors CCTVL ne doit pas être retenue').toBe(false);
    expect(r.noms.length, 'trois communes appariées, sans doublon').toBe(3);
    expect(r.insee.sort()).toEqual(['45025', '45131', '45204']);
    expect(r.rnu, 'le RNU est une information, pas une erreur').toEqual(['Baule']);
    expect(r.inventes, 'aucun code INSEE ne doit être fabriqué').toBe(0);
    // 25 attendues − 3 trouvées = 22 signalées, jamais silencieusement oubliées
    expect(r.nbManquantes, 'les communes non placées doivent être signalées').toBe(22);
  });

  test('territoire : « AU » n’est pas rangé en agricole', async ({ page }) => {
    /*
     * Les codes de zones diffèrent d'un PLU à l'autre : à cette échelle on ne
     * peut colorer que par le type normalisé. Or « AU » commence par un « A »,
     * et une zone à urbaniser peinte en agricole raconterait exactement
     * l'inverse de la réalité — sur la carte du territoire que porte le maire.
     */
    await ouvrirAccueil(page);
    await page.evaluate(() => window.matOuvrirCarte3D());
    await page.waitForFunction(() => typeof window._c3dTypeZone === 'function', null, { timeout: 30000 });

    const cas = await page.evaluate(() => ({
      au:      window._c3dTypeZone({ typezone: 'AU' }),
      au1:     window._c3dTypeZone({ typezone: '1AU' }),
      auLong:  window._c3dTypeZone({ typezone: 'A urbaniser' }),
      u:       window._c3dTypeZone({ typezone: 'U' }),
      ua:      window._c3dTypeZone({ typezone: 'Ua' }),
      a:       window._c3dTypeZone({ typezone: 'A' }),
      ah:      window._c3dTypeZone({ typezone: 'Ah' }),
      n:       window._c3dTypeZone({ typezone: 'N' }),
      nj:      window._c3dTypeZone({ typezone: 'Nj' }),
      libelle: window._c3dTypeZone({ libelle: 'Ub1' }),
      vide:    window._c3dTypeZone({})
    }));

    expect(cas.au).toBe('AU');
    expect(cas.au1, '« 1AU » commence par un chiffre : la famille reste AU').toBe('AU');
    expect(cas.auLong).toBe('AU');
    expect(cas.u).toBe('U');
    expect(cas.ua).toBe('U');
    expect(cas.a).toBe('A');
    expect(cas.ah).toBe('A');
    expect(cas.n).toBe('N');
    expect(cas.nj).toBe('N');
    expect(cas.libelle, 'à défaut de typezone, le libellé sert de repli').toBe('U');
    expect(cas.vide, 'sans information, aucune famille n’est devinée').toBe('');
  });

  test('territoire : des contours sans zonage se dénoncent', async ({ page }) => {
    /*
     * Le défaut vu sur le téléphone du porteur : les 25 contours arrivaient,
     * aucun zonage ne suivait, et RIEN ne le disait. `municipality?geom=` ne
     * renvoie pas toujours `partition`, et le code abandonnait alors en
     * silence — l'écran paraissait simplement vide.
     *
     * On simule ici une réponse SANS partition : la commune doit basculer sur
     * l'interrogation par contour, et si celle-ci ne donne rien, le dire.
     */
    await ouvrirAccueil(page);
    await page.evaluate(() => window.matOuvrirCarte3D());
    await page.waitForFunction(() => typeof window._c3dTerrZonesDe === 'function', null, { timeout: 30000 });

    const r = await page.evaluate(async () => {
      const carre = { type: 'Polygon', coordinates: [[[1.80, 47.82], [1.81, 47.82],
                                                      [1.81, 47.83], [1.80, 47.83], [1.80, 47.82]]] };
      const appels = [];
      const vrai = window.fetch;
      window.fetch = function (url) {
        appels.push(String(url));
        return Promise.resolve(new Response(JSON.stringify(
          { type: 'FeatureCollection', features: [] }), { status: 200 }));
      };
      // Commune SANS partition — exactement le cas qui échouait en silence.
      const c = { insee: '45204', nom: 'Mézières-lez-Cléry', partition: '', rnu: false,
                  geom: carre, nZones: 0, err: '' };
      const zones = await window._c3dTerrZonesDe(c);
      window.fetch = vrai;
      return { zones: zones.length, err: c.err, sansDoc: !!c.sansDoc, via: c.via,
               aTenteContour: appels.some(u => /zone-urba\?geom=/.test(u)) };
    });

    expect(r.aTenteContour, 'sans partition, le zonage doit être demandé par contour').toBe(true);
    expect(r.zones).toBe(0);
    /* La garantie tient toujours — une commune muette ne reste JAMAIS sans état
       explicite — mais l'état juste n'est pas « erreur » : une commune sans PLU
       est en règle. C'est `sansDoc` qui la décrit, et le panneau l'affiche
       « pas de PLU au Géoportail » au lieu d'un motif d'échec. */
    expect(r.err || r.sansDoc,
      'une commune muette doit porter un état, jamais rester vide').toBeTruthy();
    expect(r.err, 'et cet état ne doit pas être présenté comme une panne').toBe('');
  });

  test('territoire : jamais un contour entier dans une URL', async ({ page }) => {
    /*
     * Relevé sur le terrain : les quatre communes de la première vague
     * échouaient toutes en « Failed to fetch » — pas une erreur HTTP, un refus
     * de la pile réseau. Un contour communal compte des milliers de sommets ;
     * sérialisé dans une chaîne de requête, il produit une URL démesurée.
     *
     * On interroge donc sur le RECTANGLE englobant (5 points), et l'exactitude
     * est rétablie par le découpage sur le vrai contour.
     */
    await ouvrirAccueil(page);
    await page.evaluate(() => window.matOuvrirCarte3D());
    await page.waitForFunction(() => typeof window._c3dTerrZonesDe === 'function', null, { timeout: 30000 });

    const r = await page.evaluate(async () => {
      // Contour réaliste : 2 000 sommets, comme en renvoie le Géoportail.
      const anneau = [];
      for (let i = 0; i < 2000; i++) {
        const a = i / 2000 * Math.PI * 2;
        anneau.push([1.80 + Math.cos(a) * 0.04123456, 47.82 + Math.sin(a) * 0.03987654]);
      }
      anneau.push(anneau[0]);
      const contour = { type: 'Polygon', coordinates: [anneau] };

      const urls = [];
      const vrai = window.fetch;
      window.fetch = function (url) {
        urls.push(String(url));
        return Promise.resolve(new Response(JSON.stringify(
          { type: 'FeatureCollection', features: [] }), { status: 200 }));
      };
      const c = { insee: '45204', nom: 'Test', partition: '', rnu: false,
                  geom: contour, nZones: 0, err: '' };
      await window._c3dTerrZonesDe(c);
      window.fetch = vrai;

      const zoneUrls = urls.filter(u => /zone-urba/.test(u));
      return { sommetsContour: anneau.length,
               urlMax: Math.max(0, ...urls.map(u => u.length)),
               aInterroge: zoneUrls.length > 0 };
    });

    expect(r.sommetsContour).toBe(2001);
    expect(r.aInterroge, 'le zonage doit tout de même être demandé').toBe(true);
    // 5 points suffisent : une URL saine reste très en deçà des limites usuelles.
    expect(r.urlMax, `URL de ${r.urlMax} caractères — un contour entier a dû s’y glisser`)
      .toBeLessThan(2000);
  });

  test('territoire : une commune au RNU n’est pas une panne', async ({ page }) => {
    /*
     * `municipality?geom=` ne renvoie ni `partition` ni `is_rnu` ; seul
     * `municipality?insee=` fait autorité. Sans ce second appel, une commune
     * sans PLU était comptée parmi les « sans zonage », c'est-à-dire présentée
     * comme une panne — alors qu'elle est parfaitement en règle.
     */
    await ouvrirAccueil(page);
    await page.evaluate(() => window.matOuvrirCarte3D());
    await page.waitForFunction(() => typeof window._c3dTerrZonesDe === 'function', null, { timeout: 30000 });

    const r = await page.evaluate(async () => {
      const carre = { type: 'Polygon', coordinates: [[[1.80, 47.82], [1.81, 47.82],
                                                      [1.81, 47.83], [1.80, 47.83], [1.80, 47.82]]] };
      const vrai = window.fetch;
      window.fetch = function (url) {
        const u = String(url);
        // Le second appel, par code INSEE, révèle le statut RNU.
        if (u.indexOf('municipality?insee=') > -1)
          return Promise.resolve(new Response(JSON.stringify({ type: 'FeatureCollection',
            features: [{ type: 'Feature', properties: { name: 'Test', is_rnu: true }, geometry: carre }] }),
            { status: 200 }));
        return Promise.resolve(new Response(JSON.stringify(
          { type: 'FeatureCollection', features: [] }), { status: 200 }));
      };
      const c = { insee: '45204', nom: 'Test', partition: '', rnu: false,
                  geom: carre, nZones: 0, err: '' };
      await window._c3dTerrZonesDe(c);
      window.fetch = vrai;
      return { rnu: c.rnu, err: c.err, via: c.via };
    });

    expect(r.rnu, 'le statut RNU doit être reconnu via l’appel par code INSEE').toBe(true);
    expect(r.err, 'une commune au RNU ne porte aucune erreur').toBe('');
    expect(r.via).toBe('RNU');
  });

  test('territoire : la recherche de carte communale laisse une trace lisible', async ({ page }) => {
    /*
     * Confirmé par la mairie : Le Bardon relève d'une carte communale, pas d'un
     * PLU. L'hypothèse était juste — mais la tentative écrivait son motif
     * d'échec dans une variable que RIEN ne lisait. L'écran annonçait « pas de
     * PLU » sans pouvoir dire si le service avait répondu vide, renvoyé une
     * erreur, ou n'existait pas sous ce nom.
     *
     * C'est exactement la faute que le panneau de diagnostic existe pour
     * empêcher. Ce test la rend impossible : chaque tentative doit laisser une
     * trace, et cette trace doit être exploitable.
     */
    await ouvrirAccueil(page);
    await page.evaluate(() => window.matOuvrirCarte3D());
    await page.waitForFunction(() => typeof window._c3dTerrZonesDe === 'function', null, { timeout: 30000 });

    const r = await page.evaluate(async () => {
      const carre = { type: 'Polygon', coordinates: [[[1.80, 47.82], [1.81, 47.82],
                                                      [1.81, 47.83], [1.80, 47.83], [1.80, 47.82]]] };
      const vus = [];
      const vrai = window.fetch;
      window.fetch = function (url) {
        const u = String(url);
        vus.push(u);
        // Le service des cartes communales répond en erreur : c'est ce motif
        // qui doit remonter jusqu'à l'écran.
        if (u.indexOf('secteur-cc') > -1)
          return Promise.resolve(new Response('<ExceptionText>couche inconnue</ExceptionText>',
            { status: 404 }));
        return Promise.resolve(new Response(JSON.stringify(
          { type: 'FeatureCollection', features: [] }), { status: 200 }));
      };
      const c = { insee: '45020', nom: 'Le Bardon', partition: '', rnu: false,
                  geom: carre, nZones: 0, err: '' };
      await window._c3dTerrZonesDe(c);
      window.fetch = vrai;
      return { journal: c.ccJournal || [], sansDoc: !!c.sansDoc,
               aTenteCc: vus.some(u => /secteur-cc/.test(u)),
               aTenteDocument: vus.some(u => /document\?insee=/.test(u)) };
    });

    expect(r.aTenteCc, 'une carte communale doit être cherchée').toBe(true);
    expect(r.aTenteDocument, 'à défaut, le Géoportail doit être interrogé sur ses documents').toBe(true);
    expect(r.journal.length, 'chaque tentative doit laisser une trace').toBeGreaterThan(1);
    expect(r.journal.join(' '), 'le motif exact du service doit remonter')
      .toMatch(/couche inconnue|404/);
    expect(r.sansDoc, 'et la commune reste annoncée sans PLU, pas en panne').toBe(true);
  });

  test('territoire : un découpage qui vide tout ne stoppe pas la recherche', async ({ page }) => {
    /*
     * ⚠️ Un tableau VIDE est truthy en JavaScript.
     *
     * L'interrogation par emprise rectangulaire ramène le zonage des communes
     * VOISINES ; le découpage sur le contour les élimine toutes lorsque la
     * commune n'a pas de PLU. Le résultat est alors `[]` — truthy — et un
     * simple `r || suite()` arrêtait la chaîne là. La recherche de carte
     * communale n'était jamais lancée, son journal restait vide, et le panneau
     * de diagnostic n'affichait aucune ligne : sur le terrain, cela a fait
     * croire que le code n'était pas déployé.
     */
    await ouvrirAccueil(page);
    await page.evaluate(() => window.matOuvrirCarte3D());
    await page.waitForFunction(() => typeof window._c3dTerrZonesDe === 'function', null, { timeout: 30000 });

    const r = await page.evaluate(async () => {
      // Contour minuscule ; les zones renvoyées sont TRÈS loin, donc toutes
      // écartées par le découpage — exactement le cas du terrain.
      const carre = { type: 'Polygon', coordinates: [[[1.80, 47.82], [1.801, 47.82],
                                                      [1.801, 47.821], [1.80, 47.821], [1.80, 47.82]]] };
      const loin = { type: 'Polygon', coordinates: [[[1.60, 47.60], [1.61, 47.60],
                                                     [1.61, 47.61], [1.60, 47.61], [1.60, 47.60]]] };
      const vus = [];
      const vrai = window.fetch;
      window.fetch = function (url) {
        const u = String(url);
        vus.push(u);
        if (u.indexOf('zone-urba') > -1)   // des zones, mais celles des voisines
          return Promise.resolve(new Response(JSON.stringify({ type: 'FeatureCollection',
            features: [{ type: 'Feature', properties: { typezone: 'A' }, geometry: loin }] }),
            { status: 200 }));
        return Promise.resolve(new Response(JSON.stringify(
          { type: 'FeatureCollection', features: [] }), { status: 200 }));
      };
      const c = { insee: '45020', nom: 'Le Bardon', partition: '', rnu: false,
                  geom: carre, nZones: 0, err: '' };
      const zones = await window._c3dTerrZonesDe(c);
      window.fetch = vrai;
      return { zones: zones.length, journal: c.ccJournal || [], sansDoc: !!c.sansDoc,
               aChercheCc: vus.some(u => /secteur-cc/.test(u)) };
    });

    expect(r.zones, 'le zonage des voisines est bien écarté').toBe(0);
    expect(r.aChercheCc, 'la carte communale doit être cherchée malgré le découpage').toBe(true);
    expect(r.journal.length, 'et la tentative doit laisser une trace').toBeGreaterThan(0);
    expect(r.sansDoc, 'la commune reste annoncée sans PLU, pas en panne').toBe(true);
  });

  test('territoire : une commune sans zonage répond quand même au clic', async ({ page }) => {
    /*
     * ⚠️ Le clic n'interrogeait que la couche du ZONAGE. Une commune sans PLU
     * n'a aucun polygone de zonage : le doigt ne rencontrait rien et l'écran
     * restait muet — précisément sur les communes dont on se demande pourquoi
     * elles sont vides. Dix des vingt-cinq étaient dans ce cas.
     *
     * Le repli se fait sur le CONTOUR communal, testé en JavaScript : les
     * contours sont dessinés par des couches `line`, qu'un doigt ne touche
     * presque jamais.
     */
    await ouvrirAccueil(page);
    await page.evaluate(() => window.matOuvrirCarte3D());
    await page.waitForFunction(() => typeof window._c3dClicTerritoire === 'function', null, { timeout: 30000 });

    const r = await page.evaluate(() => {
      const carre = (cx, cy, r) => ({ type: 'Polygon', coordinates: [[
        [cx - r, cy - r], [cx + r, cy - r], [cx + r, cy + r], [cx - r, cy + r], [cx - r, cy - r]]] });
      window._c3dTerr = [
        { nom: 'Le Bardon', insee: '45020', geom: carre(1.70, 47.85, 0.02),
          nZones: 0, sansDoc: true, err: '' },
        { nom: 'Baule', insee: '45025', geom: carre(1.76, 47.85, 0.02),
          nZones: 37, err: '' }
      ];
      const lu = () => document.getElementById('c3d-statut').innerHTML;
      const dedans = window._c3dClicTerritoire([1.70, 47.85], { x: 0, y: 0 });
      const msgSansPlu = lu();
      window._c3dClicTerritoire([1.76, 47.85], { x: 0, y: 0 });
      const msgAvecPlu = lu();
      const dehors = window._c3dClicTerritoire([1.20, 47.20], { x: 0, y: 0 });
      return { dedans, dehors, msgSansPlu, msgAvecPlu };
    });

    expect(r.dedans, 'un clic dans une commune doit être reconnu').toBe(true);
    expect(r.msgSansPlu, 'la commune doit être nommée').toContain('Le Bardon');
    expect(r.msgSansPlu, 'et son état expliqué').toContain('pas de PLU');
    expect(r.msgSansPlu, 'sans laisser croire à une panne').toContain('pas une panne');
    expect(r.msgAvecPlu, 'une commune avec zonage est nommée aussi').toContain('Baule');
    expect(r.msgAvecPlu).toContain('37 secteurs');
    expect(r.dehors, 'hors de tout contour, rien n’est inventé').toBe(false);
  });

  test('territoire : sources coupées, aucune commune n’est inventée', async ({ page }) => {
    await ouvrirAccueil(page);
    await page.evaluate(() => window.matOuvrirCarte3D());
    await expect(page.locator('#c3d-btn-terr')).toBeVisible();
    await page.locator('#c3d-btn-terr').click();
    // Le Géoportail est coupé : la vue doit le dire, et ne rien dessiner.
    await expect(page.locator('#c3d-statut')).toContainText('Territoire indisponible', { timeout: 20000 });
    const dessine = await page.evaluate(() => {
      const m = window._c3dMap;
      return { source: !!(m.getSource && m.getSource('terr-zones')),
               communes: (window._c3dTerr || []).length };
    });
    expect(dessine.communes, 'aucune commune ne doit apparaître sans réponse du service').toBe(0);
    expect(dessine.source, 'aucune couche de territoire posée sans données').toBe(false);
  });

  /*
   * ── Le nom des 25 communes ──────────────────────────────────────────────
   * Les contours étaient anonymes. Ces quatre tests tiennent les quatre
   * promesses des étiquettes : le nom vient du service et de nulle part
   * ailleurs, il est posé dans le plus grand polygone, deux noms ne se
   * recouvrent jamais, et le nom ne prend ni le clic ni la place du village.
   *
   * ⚠️ apicarto est coupé ici : on ne charge donc PAS le territoire, on injecte
   * ce que le service aurait renvoyé et on appelle la pose directement. C'est
   * la même stratégie que pour `_c3dApparier`.
   */
  async function poserEtiquettes(page, communes) {
    await ouvrirAccueil(page);
    await page.evaluate(() => window.matOuvrirCarte3D());
    await page.waitForFunction(() => window._c3dMap && window._c3dMap.loaded(), null, { timeout: 30000 });
    await page.evaluate((liste) => {
      window._c3dTerr = liste;
      window._c3dTerrActif = true;
      window._c3dTerrPoserEtiquettes();
    }, communes);
  }

  // Carré de 0,004° de côté centré sur (lon, lat) — l'ordre des sommets est
  // celui du Géoportail : anneau extérieur fermé.
  const carre = (lon, lat, cote = 0.004) => ({
    type: 'Polygon',
    coordinates: [[[lon - cote, lat - cote], [lon + cote, lat - cote],
                   [lon + cote, lat + cote], [lon - cote, lat + cote],
                   [lon - cote, lat - cote]]]
  });

  test('territoire : chaque étiquette porte le nom renvoyé par le service', async ({ page }) => {
    /*
     * Le pendant visuel de RG-17.20 : ce qui est ÉCRIT sur la carte est ce que
     * le Géoportail a renvoyé. Une commune sans géométrie n'a pas d'étiquette
     * — elle est signalée dans le panneau, jamais posée au jugé.
     */
    await poserEtiquettes(page, [
      { nom: 'Mézières-lez-Cléry', insee: '45204', geom: carre(1.808, 47.822) },
      { nom: 'Cléry-Saint-André',  insee: '45098', geom: carre(1.760, 47.822) },
      { nom: 'Dry',                insee: '45130', geom: carre(1.856, 47.822) },
      // Non appariée par le Géoportail : aucune géométrie, donc aucun nom posé.
      { nom: 'Villermain',         insee: '',      geom: null }
    ]);

    const r = await page.evaluate(() => ({
      textes: [...document.querySelectorAll('.c3d-lab')].map(e => e.textContent),
      moi: [...document.querySelectorAll('.c3d-lab-moi')].map(e => e.textContent),
      // Les noms sont déjà dans le panneau, en texte : la synthèse vocale ne
      // doit pas les lire deux fois.
      masques: [...document.querySelectorAll('.c3d-lab')]
        .every(e => e.getAttribute('aria-hidden') === 'true')
    }));

    expect(r.textes.sort(), 'un nom par commune réellement renvoyée')
      .toEqual(['Cléry-Saint-André', 'Dry', 'Mézières-lez-Cléry']);
    expect(r.textes.includes('Villermain'), 'une commune non placée n’a pas d’étiquette').toBe(false);
    expect(r.moi, 'Mézières doit se distinguer, comme son contour').toEqual(['Mézières-lez-Cléry']);
    expect(r.masques, 'les étiquettes doublonnent le panneau : aria-hidden').toBe(true);
  });

  test('territoire : le nom se pose dans le plus grand polygone', async ({ page }) => {
    /*
     * `_c3dCentroide` moyenne les sommets du PREMIER anneau : elle suffit à
     * dire « cet objet est dans la commune », mais poserait le nom sur un écart
     * de territoire dès qu'une commune en compte plusieurs. Fonction pure,
     * donc testable sans réseau.
     */
    await ouvrirAccueil(page);
    await page.evaluate(() => window.matOuvrirCarte3D());
    await page.waitForFunction(() => typeof window._c3dCentreEtiquette === 'function', null, { timeout: 30000 });

    const r = await page.evaluate(() => {
      // Un grand polygone autour de (1.80 ; 47.82), et un minuscule écart à
      // 0,5° de là. Le nom doit aller sur le grand.
      const grand = [[1.78, 47.80], [1.82, 47.80], [1.82, 47.84], [1.78, 47.84], [1.78, 47.80]];
      const ecart = [[2.30, 47.80], [2.301, 47.80], [2.301, 47.801], [2.30, 47.801], [2.30, 47.80]];
      const p = window._c3dCentreEtiquette({ type: 'MultiPolygon', coordinates: [[ecart], [grand]] });
      // Contour aplati (aire nulle) : aucun endroit défendable où poser le nom.
      // On attend `null` — pas un point calculé sur une division par zéro.
      const plat = window._c3dCentreEtiquette({ type: 'Polygon',
        coordinates: [[[1.8, 47.8], [1.9, 47.8], [1.85, 47.8], [1.8, 47.8]]] });
      return { c: p && p.c, aire: p && p.aire, plat: plat };
    });

    expect(r.c[0], 'le nom doit tomber dans le grand polygone, pas sur l’écart').toBeGreaterThan(1.78);
    expect(r.c[0]).toBeLessThan(1.82);
    expect(r.c[1]).toBeGreaterThan(47.80);
    expect(r.c[1]).toBeLessThan(47.84);
    expect(r.aire, 'l’aire retenue est celle du plus grand polygone').toBeGreaterThan(0.001);
    expect(r.plat, 'un contour sans surface ne reçoit pas de nom posé au jugé').toBe(null);
  });

  test('territoire : deux noms ne se recouvrent jamais, et Mézières l’emporte', async ({ page }) => {
    /*
     * ⚠️ MapLibre ne décale et ne masque que les couches `symbol`. Des marqueurs
     * HTML se superposent sans rien dire — deux noms l'un sur l'autre ne se
     * lisent ni l'un ni l'autre. Mézières est prioritaire même si sa commune est
     * la plus PETITE des deux : c'est le point de vue de la carte.
     *
     * Leçon des étoiles invisibles (ADR-0015) : on assert le style CALCULÉ.
     */
    await poserEtiquettes(page, [
      { nom: 'Grande-Voisine',     insee: '45999', geom: carre(1.8081, 47.8220, 0.02) },
      { nom: 'Mézières-lez-Cléry', insee: '45204', geom: carre(1.8080, 47.8220, 0.001) }
    ]);

    const vus = await page.evaluate(() =>
      [...document.querySelectorAll('.c3d-lab')]
        .filter(e => getComputedStyle(e).visibility === 'visible')
        .map(e => e.textContent));

    expect(vus, 'un seul des deux noms superposés doit rester lisible').toEqual(['Mézières-lez-Cléry']);
  });

  test('territoire : le nom ne prend ni le clic ni la place du village', async ({ page }) => {
    /*
     * Deux régressions possibles d'un coup :
     *  • une étiquette qui capte le clic empêcherait de nommer la commune —
     *    or « toute commune répond au clic » est une règle acquise (RG-17.21) ;
     *  • les étiquettes sont des éléments HTML, que `setLayoutProperty` n'atteint
     *    pas : sans traitement explicite, les 25 noms resteraient affichés
     *    par-dessus le village au retour.
     */
    await poserEtiquettes(page, [
      { nom: 'Mézières-lez-Cléry', insee: '45204', geom: carre(1.808, 47.822) }
    ]);

    const clic = await page.evaluate(() =>
      getComputedStyle(document.querySelector('.c3d-lab')).pointerEvents);
    expect(clic, 'une étiquette ne doit jamais avaler le clic de la carte').toBe('none');

    await page.evaluate(() => window._c3dVoirTerritoire(false));
    const restants = await page.evaluate(() =>
      [...document.querySelectorAll('.c3d-lab')]
        .filter(e => getComputedStyle(e).visibility === 'visible').length);
    expect(restants, 'de retour au village, plus aucun nom de commune').toBe(0);
  });

  /*
   * ── Les lieux-dits ──────────────────────────────────────────────────────
   * Jeu d'essai RÉEL, relevé sur `BDTOPO_V3:toponymie` pour l'emprise de la
   * commune : trois croix, un pont, une source, et les DEUX « manthelon » de
   * France — le nôtre et celui de l'Eure-et-Loir, à 120 km. C'est ce dernier
   * qui rend le test intéressant : un nom ne prouve rien, seul le contour
   * tranche. Exactement ce qu'ADR-0021 avait anticipé pour les communes.
   */
  const TOPONYMES = [
    { classe: 'Construction ponctuelle', nature: 'Croix', nom: 'croix glaneuse', pt: [1.80179786, 47.82295509] },
    { classe: 'Construction ponctuelle', nature: 'Croix', nom: 'croix des morts', pt: [1.80845209, 47.81593453] },
    { classe: 'Construction ponctuelle', nature: 'Croix', nom: 'croix de bailly', pt: [1.82122217, 47.79893985] },
    { classe: 'Construction linéaire',   nature: 'Pont',  nom: 'pont des dames',  pt: [1.79807795, 47.80398847] },
    { classe: 'Détail hydrographique',   nature: 'Source', nom: 'fosse de lézeau', pt: [1.82607885, 47.8106586] },
    { classe: "Zone d'habitation", nature: 'Lieu-dit habité', nom: 'manthelon', pt: [1.7930418, 47.82132338] },
    // Le Manthelon d'Eure-et-Loir : même graphie, même classe, autre commune.
    { classe: "Zone d'habitation", nature: 'Lieu-dit habité', nom: 'manthelon', pt: [1.0477489, 48.91099394] }
  ].map((t) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: t.pt },
    properties: { classe_de_l_objet: t.classe, nature_de_l_objet: t.nature,
                  graphie_du_toponyme: t.nom, statut_du_toponyme: 'Validé' }
  }));

  test('lieux-dits : seul l’habitat est étiqueté, et seulement dans la commune', async ({ page }) => {
    await ouvrirAccueil(page);
    await page.evaluate(() => window.matOuvrirCarte3D());
    await page.waitForFunction(() => typeof window._c3dTrierToponymes === 'function', null, { timeout: 30000 });

    const r = await page.evaluate((features) => {
      // Contour approximatif de Mézières : il exclut l'Eure-et-Loir.
      window._c3dContour = { type: 'Polygon', coordinates: [[
        [1.762, 47.792], [1.856, 47.792], [1.856, 47.852], [1.762, 47.852], [1.762, 47.792]]] };
      const res = window._c3dTrierToponymes(features);
      return { noms: res.gardes.map(g => g.nom), hors: res.hors,
               ecartes: window._c3dToposEcartes };
    }, TOPONYMES);

    expect(r.noms, 'un seul Manthelon retenu, et avec sa capitale').toEqual(['Manthelon']);
    expect(r.hors, 'le Manthelon d’Eure-et-Loir est écarté par le contour').toBe(1);
    // Ce qui n'est pas affiché doit rester comptable : c'est ce panneau qui
    // dira, le jour venu, sous quelle classe un hameau manquant a été rangé.
    expect(r.ecartes['Construction ponctuelle'], 'les trois croix sont comptées').toBe(3);
    expect(r.ecartes['Construction linéaire']).toBe(1);
    expect(r.ecartes['Détail hydrographique']).toBe(1);
  });

  test('lieux-dits : la BD TOPO écrit en minuscules, la carte remet les capitales', async ({ page }) => {
    /*
     * ⚠️ Le service renvoie « manthelon », pas « Manthelon ». Mais on ne
     * retouche JAMAIS une graphie que l'IGN a déjà capitalisée : la seule
     * transformation admise est de remettre des majuscules là où il n'y en a
     * aucune. Les particules restent en bas de casse.
     */
    await ouvrirAccueil(page);
    await page.evaluate(() => window.matOuvrirCarte3D());
    await page.waitForFunction(() => typeof window._c3dCapitales === 'function', null, { timeout: 30000 });

    const r = await page.evaluate(() => ['manthelon', 'le bréau', 'clos de manthelon',
      "l'étang du bois", 'Saint-Laurent-des-Bois', 'la grange'].map(window._c3dCapitales));

    expect(r).toEqual(['Manthelon', 'Le Bréau', 'Clos de Manthelon',
      "L'Étang du Bois", 'Saint-Laurent-des-Bois', 'La Grange']);
  });

  test('lieux-dits : le mât mesure des mètres, et disparaît à la verticale', async ({ page }) => {
    /*
     * `sin(pitch)` et non `cos` : à pitch nul, vue à la verticale, une hauteur
     * ne se projette pas — le mât doit valoir zéro. Et il grandit quand on
     * approche, puisqu'il vaut 13 m réels. C'est ce qui distingue ce trait
     * d'un décalage écrit en pixels, qui mentirait à tous les zooms sauf un.
     */
    await ouvrirAccueil(page);
    await page.evaluate(() => window.matOuvrirCarte3D());
    await page.waitForFunction(() => window._c3dMap && window._c3dMap.loaded(), null, { timeout: 30000 });

    const r = await page.evaluate(() => {
      const lire = (zoom, pitch) => {
        window._c3dMap.jumpTo({ center: [1.808, 47.822], zoom, pitch });
        return window._c3dTigePx(47.822);
      };
      return { plat: lire(17, 0), proche: lire(17.4, 62), loin: lire(15, 62) };
    });

    expect(r.plat, 'à la verticale, une hauteur ne se projette pas').toBe(0);
    expect(r.proche, 'de près, le mât dépasse les toits').toBeGreaterThan(25);
    expect(r.loin, 'de loin il rétrécit, comme le bâti').toBeLessThan(r.proche);
    expect(r.loin, 'mais il ne disparaît pas').toBeGreaterThan(0);
  });

  test('lieux-dits : le nom est ancré au sol, et s’efface en vue territoire', async ({ page }) => {
    await ouvrirAccueil(page);
    await page.evaluate(() => window.matOuvrirCarte3D());
    await page.waitForFunction(() => window._c3dMap && window._c3dMap.loaded(), null, { timeout: 30000 });

    const pose = await page.evaluate(() => {
      window._c3dMap.jumpTo({ center: [1.808, 47.822], zoom: 17, pitch: 62 });
      window._c3dPoserLieux([{ nom: 'Manthelon', pt: [1.808, 47.822], nature: 'Lieu-dit habité' }]);
      const el = document.querySelector('.c3d-lieu');
      const tige = document.querySelector('.c3d-lieu-tige');
      return {
        nom: el.textContent,
        clic: getComputedStyle(el).pointerEvents,
        // Le trait doit avoir une hauteur RÉELLE : c'est lui qui rattache le
        // nom à son point au sol. Zéro, et le nom flotte sans rien dire.
        tige: parseFloat(getComputedStyle(tige).height),
        visible: getComputedStyle(el).visibility
      };
    });

    expect(pose.nom).toContain('Manthelon');
    expect(pose.clic, 'un nom ne doit jamais avaler le clic d’un bâtiment').toBe('none');
    expect(pose.tige, 'le trait doit relier le nom au sol').toBeGreaterThan(10);
    expect(pose.visible).toBe('visible');

    // En vue territoire, à 30 km, les lieux-dits couvriraient le zonage.
    await page.evaluate(() => window._c3dVoirTerritoire(true));
    const apres = await page.evaluate(() =>
      getComputedStyle(document.querySelector('.c3d-lieu')).visibility);
    expect(apres, 'aucun lieu-dit par-dessus la vue territoire').toBe('hidden');
  });

  test('le bouton « Où suis-je » est proposé', async ({ page }) => {
    await ouvrirAccueil(page);
    await page.evaluate(() => window.matOuvrirCarte3D());
    await expect(page.locator('#c3d-btn-ici')).toBeVisible();
  });

  test('« Où suis-je » clignote à l’ouverture, puis se tait', async ({ page }) => {
    /*
     * Le bouton ne se distinguait pas de ses cinq voisins, et sa fonction —
     * situer SA maison dans le zonage — est la moins devinable de la carte.
     *
     * ⚠️ On assert le STYLE CALCULÉ, pas seulement la classe : c'est le CSS qui
     * produit l'effet, et une classe posée sans règle correspondante ne
     * clignoterait pas (leçon des étoiles invisibles, ADR-0015).
     */
    await ouvrirAccueil(page);
    await page.evaluate(() => window.matOuvrirCarte3D());
    await expect(page.locator('#c3d-btn-ici')).toBeVisible();

    await expect.poll(async () => page.evaluate(() => {
      const b = document.getElementById('c3d-btn-ici');
      return b ? getComputedStyle(b).animationName : 'absent';
    }), { timeout: 6000, message: 'l’animation d’appel doit démarrer' }).toBe('c3dAttire');

    const tours = await page.evaluate(() =>
      getComputedStyle(document.getElementById('c3d-btn-ici')).animationIterationCount);
    expect(tours, 'trois clignotements, pas un de plus').toBe('3');

    // …puis il se tait : la classe est retirée à la fin de l'animation.
    await expect.poll(async () => page.evaluate(() =>
      document.getElementById('c3d-btn-ici').classList.contains('c3d-attire')),
      { timeout: 10000, message: 'l’appel doit cesser de lui-même' }).toBe(false);
  });

  test('territoire : le panneau déplié ne recouvre aucun bouton', async ({ page, viewport }) => {
    /*
     * ⚠️ Le contrôle précédent mesurait le panneau REPLIÉ, et passait au vert.
     * Déplié, il recouvrait « Zonage du PLU », « Bâtiments » et « Revenir au
     * village ». Aucune hauteur écrite en CSS ne peut convenir : elle dépend du
     * nombre de boutons, de la barre système et du réglage de taille du texte.
     * La hauteur est donc mesurée en JS — et c'est cette mesure qu'on vérifie.
     */
    test.skip(!viewport || viewport.width >= 1024, 'mise en page téléphone uniquement');
    /* ⚠️ Hauteur volontairement CONTRAINTE. Sur un grand téléphone, le plafond
       CSS suffit et le test passerait même sans la mesure — il ne prouverait
       rien. C'est sur un écran court, ou avec la barre d'adresse du navigateur
       visible, que le panneau mordait sur les boutons : le cas du terrain. */
    await page.setViewportSize({ width: 360, height: 620 });
    await ouvrirAccueil(page);
    await page.evaluate(() => window.matOuvrirCarte3D());
    await page.locator('#c3d-btn-terr').click();
    await expect(page.locator('#c3d-terr')).toBeVisible();

    // On déplie, comme le ferait l'habitant.
    await page.locator('#c3d-terr summary').click();
    await expect(page.locator('#c3d-terr')).toHaveJSProperty('open', true);
    await page.waitForTimeout(400);

    const collisions = await page.evaluate(() => {
      const pan = document.getElementById('c3d-terr').getBoundingClientRect();
      const heurte = [];
      document.querySelectorAll('.c3d-btn').forEach((b) => {
        if (b.hidden) return;
        const r = b.getBoundingClientRect();
        if (!(r.right < pan.left || r.left > pan.right ||
              r.bottom < pan.top || r.top > pan.bottom))
          heurte.push((b.textContent || '').trim());
      });
      return heurte;
    });
    expect(collisions, 'boutons recouverts : ' + collisions.join(' / ')).toEqual([]);
  });

  test('territoire : le fond de carte reste celui choisi par l’habitant', async ({ page }) => {
    /*
     * La v4.72 basculait d'office sur le plan IGN en vue territoire. À l'usage
     * c'est la vue aérienne qu'on préfère — elle donne le paysage. Le bouton
     * « Vue aérienne / Plan » doit rester le seul maître du fond.
     */
    await ouvrirAccueil(page);
    await page.evaluate(() => window.matOuvrirCarte3D());
    await page.waitForFunction(() => window._c3dMap && window._c3dMap.loaded(), null, { timeout: 30000 });

    const lire = () => page.evaluate(() => ({
      ortho: window._c3dMap.getLayoutProperty('l-ortho', 'visibility') || 'visible',
      presse: document.getElementById('c3d-btn-fond').getAttribute('aria-pressed')
    }));
    const avant = await lire();
    await page.locator('#c3d-btn-terr').click();
    await page.waitForTimeout(1500);
    const apres = await lire();

    expect(avant.ortho, 'la vue aérienne est le fond par défaut').toBe('visible');
    expect(apres.ortho, 'passer au territoire ne doit pas changer le fond').toBe(avant.ortho);
    expect(apres.presse, 'ni l’état du bouton de fond').toBe(avant.presse);
  });

  test('aucune carte d’accueil ne partage son icône avec une autre', async ({ page, viewport }) => {
    test.skip(!viewport || viewport.width >= 1024, 'mise en page téléphone uniquement');
    // « Communauté » et « Mon village en 3D » portaient toutes deux 🏘️ :
    // deux entrées différentes qui se ressemblent, on hésite avant de toucher.
    await ouvrirAccueil(page);
    const doublons = await page.evaluate(() => {
      const vues = {}, dbl = [];
      document.querySelectorAll('.content .card .ico').forEach(el => {
        const ico = (el.textContent || '').trim();
        if (!ico) return;
        if (vues[ico]) dbl.push(ico); else vues[ico] = 1;
      });
      return dbl;
    });
    expect(doublons, 'icônes en double : ' + doublons.join(' ')).toEqual([]);
  });

  test('un seul nom pour la fonctionnalité, partout', async ({ page }) => {
    // Trois formulations différentes avaient cohabité (tuile, titre d'écran,
    // bloc PLUi). Une divergence de nom est le premier pas vers une
    // divergence de contenu — on la verrouille.
    await ouvrirAccueil(page);
    await page.evaluate(() => window.matOuvrirCarte3D());
    await expect(page.locator('#ov-carte3d .panel-title')).toHaveText('Mon village en 3D');
    // Ce qui compte est le nom ANNONCÉ, pas l'attribut qui le porte. Il venait
    // d'un `aria-label` écrit en dur sur le <div class="ov"> — invalide selon le
    // validateur du W3C (RGAA 8.2 : `aria-label` n'est pas admis sur un <div>
    // sans rôle propre) et redondant depuis que openOv() pose `aria-labelledby`
    // vers le titre du panneau. Asserter l'attribut aurait interdit la
    // correction ; asserter le nom calculé verrouille la même chose en mieux :
    // le nom annoncé et le titre affiché ne peuvent plus diverger.
    const nomAnnonce = await page.locator('#ov-carte3d').evaluate(el => {
      const id = el.getAttribute('aria-labelledby');
      const cible = id && document.getElementById(id);
      return (cible ? cible.textContent : el.getAttribute('aria-label')) || '';
    });
    expect(nomAnnonce.trim()).toBe('Mon village en 3D');
  });

  test('l’overlay s’ouvre, se ferme avec Échap, et n’invente aucun bâtiment', async ({ page }) => {
    await ouvrirAccueil(page);
    await page.evaluate(() => window.matOuvrirCarte3D());

    const ov = page.locator('#ov-carte3d');
    await expect(ov).toHaveClass(/open/);
    await expect(page.locator('#c3d-map')).toBeVisible();

    // Sources coupées : la carte ne doit surtout pas fabriquer un village de
    // substitution. On attend l'apparition du bouton de diagnostic — signal
    // déterministe de fin de chargement — plutôt qu'un délai arbitraire.
    await expect(page.locator('#c3d-btn-diag')).toBeVisible({ timeout: 20000 });
    const batiments = await page.evaluate(() => {
      const m = window._c3dMap;
      return m && m.getSource && m.getSource('bati') ? 'présent' : 'absent';
    });
    expect(batiments).toBe('absent');
    await expect(page.locator('#c3d-statut')).toContainText('Aucun bâtiment chargé');

    // Un seul gestionnaire d'Échap a le droit de fermer un overlay (ADR-0011).
    await page.keyboard.press('Escape');
    await expect(ov).not.toHaveClass(/open/);
  });

  test('le bouton de diagnostic est réellement masqué tant qu’il n’a rien à dire', async ({ page }) => {
    await ouvrirAccueil(page);
    await page.evaluate(() => window.matOuvrirCarte3D());
    await expect(page.locator('#c3d-btn-diag')).toBeHidden();
    // L'attribut ne suffit pas : c'est le style calculé qui décide.
    const display = await page.evaluate(() => {
      const b = document.getElementById('c3d-btn-diag');
      return b ? getComputedStyle(b).display : 'absent';
    });
    expect(display).toBe('none');
  });

  test('aucune violation d’accessibilité sérieuse', async ({ page }) => {
    await ouvrirAccueil(page);
    await page.evaluate(() => window.matOuvrirCarte3D());
    await page.waitForTimeout(1200);
    const res = await new AxeBuilder({ page }).include('#ov-carte3d').analyze();
    const graves = res.violations.filter(v => ['serious', 'critical'].includes(v.impact || ''));
    expect(graves, JSON.stringify(graves.map(v => v.id))).toEqual([]);
  });

});
