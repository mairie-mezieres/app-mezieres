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

  test('le bouton « Où suis-je » est proposé', async ({ page }) => {
    await ouvrirAccueil(page);
    await page.evaluate(() => window.matOuvrirCarte3D());
    await expect(page.locator('#c3d-btn-ici')).toBeVisible();
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
    await expect(page.locator('#ov-carte3d')).toHaveAttribute('aria-label', 'Mon village en 3D');
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
