const { test, expect } = require('@playwright/test');

// ── Accessibilité clavier (RGAA 7.3 / WCAG 2.1.1) ──────────────────────
//
// Pourquoi un fichier dédié alors que smoke.spec.js passe déjà axe ?
// Parce qu'axe ne peut PAS voir ce défaut. Un `<div onclick="…">` est,
// pour l'analyseur, un conteneur inerte : rien dans le DOM ne dit qu'il
// est cliquable. Les violations restent donc à zéro pendant qu'un
// utilisateur au clavier ne peut atteindre ni la météo, ni les collectes,
// ni la mairie, ni le dépôt de photo.
//
// Les fonds d'overlay (`ovClick`, `closeTrombi`) sont l'exception
// légitime : ils ne servent qu'à fermer au clic extérieur, et le panneau
// qu'ils habillent a son propre bouton « Fermer ». Les rendre focusables
// ajouterait un arrêt de tabulation qui n'ouvre rien.

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
  await page.goto('/');
  // Le splash (mat-core.js) rend la main en posant `app-ready` sur <body>.
  // Avant ce point, le focus posé sur un élément ne tient pas : la séquence
  // d'amorçage le reprend. Un vrai utilisateur n'y est jamais confronté —
  // il agit après l'affichage — mais le test, lui, court plus vite que le boot.
  await page.waitForSelector('body.app-ready', { timeout: 15000 });
});

// Le focus peut encore être repris par une tâche d'init tardive : on
// réessaie jusqu'à ce qu'il tienne, plutôt que de fixer un délai arbitraire.
async function focusStable(page, locator) {
  await expect(async () => {
    await locator.focus();
    await expect(locator).toBeFocused({ timeout: 500 });
  }).toPass({ timeout: 10000 });
}

// Ouvre un overlay paresseux et attend son hydratation.
async function ouvrirOverlay(page, fn, ov) {
  await page.waitForFunction((f) => typeof window[f] === 'function', fn);
  await expect(async () => {
    await page.evaluate((f) => window[f](), fn);
    await expect(page.locator(ov)).toHaveClass(/open/, { timeout: 1000 });
  }).toPass({ timeout: 10000 });
}

// Test de propriété : verrouille l'invariant pour tout le HTML à venir.
// Si quelqu'un rajoute un jour un `<div onclick>` sans clavier, il casse ici.
test('aucun élément cliquable n’est hors de portée du clavier', async ({ page }) => {
  const orphelins = await page.evaluate(() => {
    const NATIF = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'SUMMARY'];
    return Array.from(document.querySelectorAll('[onclick]'))
      .filter((el) => {
        if (NATIF.includes(el.tagName)) return false;
        const h = el.getAttribute('onclick') || '';
        // Fonds d'overlay : fermeture au clic extérieur, pas une commande.
        if (h.includes('ovClick(') || h.includes('closeTrombi(')) return false;
        // Conteneur dont un descendant focusable porte déjà l'action : le
        // clic sur le bloc n'est qu'un raccourci souris. C'est le cas de la
        // bannière d'installation, qui contient son bouton « Installer ».
        if (el.querySelector('a[href],button,input,select,textarea,[tabindex]')) return false;
        return !el.hasAttribute('tabindex');
      })
      .map((el) => {
        const id = el.id ? '#' + el.id : '';
        const cls = el.className && typeof el.className === 'string'
          ? '.' + el.className.trim().split(/\s+/).join('.')
          : '';
        return `<${el.tagName.toLowerCase()}${id}${cls}> onclick="${el.getAttribute('onclick').slice(0, 60)}"`;
      });
  });

  expect(orphelins, 'cliquables sans tabindex').toEqual([]);
});

// Un tabindex sans role ni libellé laisse le lecteur d'écran annoncer
// « groupe » : l'utilisateur entend qu'il y a quelque chose, sans savoir quoi.
test('chaque cliquable focusable annonce son rôle et son intitulé', async ({ page }) => {
  const muets = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[onclick][tabindex]'))
      .filter((el) => {
        const natif = ['A', 'BUTTON'].includes(el.tagName);
        const role = natif || el.getAttribute('role') === 'button';
        const nom = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
        return !role || !nom;
      })
      .map((el) => (el.id ? '#' + el.id : el.className))
  );

  expect(muets, 'focusables sans role=button ou sans aria-label').toEqual([]);
});

// Le bandeau du header est masqué au-delà de 1024 px
// (`css/mat-desktop.css` → `.header{display:none}`) : c'est un écran
// mobile/PWA. Sur `desktop-chromium` les bandeaux ne sont pas rendus, donc
// pas focusables — même idiome de saut que dans `ambiance.spec.js`.
async function skipSiBandeauMasque(page) {
  const visible = await page.evaluate(() => {
    const h = document.querySelector('.header');
    return !!h && getComputedStyle(h).display !== 'none';
  });
  test.skip(!visible, 'bandeau masqué au-delà de 1024 px — écran mobile/PWA');
}

// Les 4 bandeaux du header : le cœur du défaut corrigé. On vérifie le
// parcours réel — focus, puis Entrée — et non la seule présence d'attributs.
const BANDEAUX = [
  { sel: '.mairie-strip',  ov: '#ov-contact', label: 'Mairie' },
  { sel: '.meteo-strip',   ov: '#ov-meteo',   label: 'Météo' },
  { sel: '.dechets-strip', ov: '#ov-dechets', label: 'Déchets' },
  { sel: '.event-strip',   ov: '#ov-agenda',  label: 'Prochaine manifestation' }
];

for (const b of BANDEAUX) {
  test(`bandeau ${b.label} : Entrée au clavier ouvre l’overlay`, async ({ page }) => {
    await skipSiBandeauMasque(page);
    await page.waitForFunction(() => typeof window.openOv === 'function');
    const strip = page.locator(b.sel).first();
    await expect(strip).toHaveAttribute('role', 'button');

    await focusStable(page, strip);

    await expect(async () => {
      await page.keyboard.press('Enter');
      await expect(page.locator(b.ov)).toHaveClass(/open/, { timeout: 1000 });
    }).toPass({ timeout: 10000 });
  });

  test(`bandeau ${b.label} : Espace au clavier ouvre l’overlay`, async ({ page }) => {
    await skipSiBandeauMasque(page);
    await page.waitForFunction(() => typeof window.openOv === 'function');
    const strip = page.locator(b.sel).first();
    await focusStable(page, strip);

    await expect(async () => {
      await page.keyboard.press(' ');
      await expect(page.locator(b.ov)).toHaveClass(/open/, { timeout: 1000 });
    }).toPass({ timeout: 10000 });
  });
}

// Espace sur un role=button doit activer, PAS faire défiler la page.
// C'est le rôle du preventDefault() dans chaque onkeydown ; sans lui,
// l'utilisateur voit la page sauter d'un écran à chaque tentative.
test('Espace sur un bandeau ne fait pas défiler la page', async ({ page }) => {
  await skipSiBandeauMasque(page);
  await page.waitForFunction(() => typeof window.openOv === 'function');
  const strip = page.locator('.dechets-strip').first();
  await focusStable(page, strip);
  const avant = await page.evaluate(() => window.scrollY);
  await page.keyboard.press(' ');
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.scrollY)).toBe(avant);
});

// L'anneau de focus est produit par du CSS, pas par du JS : suivant la
// règle 7 du CLAUDE.md, on interroge le style calculé et non l'attribut.
test('le focus clavier produit un anneau visible', async ({ page }) => {
  await skipSiBandeauMasque(page);
  const strip = page.locator('.meteo-strip').first();
  await focusStable(page, strip);

  const style = await strip.evaluate((el) => {
    const s = getComputedStyle(el);
    return { width: s.outlineWidth, style: s.outlineStyle, shadow: s.boxShadow };
  });

  expect(parseFloat(style.width)).toBeGreaterThanOrEqual(3);
  expect(style.style).not.toBe('none');
  expect(style.shadow).not.toBe('none');
});

// Le dépôt de photo est le cas bloquant : l'input fichier est en
// display:none, donc la zone était le SEUL chemin d'accès. Sans clavier,
// partager une photo était purement impossible.
test('galerie : la zone de dépôt de photo est atteignable au clavier', async ({ page }) => {
  await ouvrirOverlay(page, 'openPhotos', '#ov-photos');

  const zone = page.locator('#photo-upload-area');
  await expect(zone).toHaveAttribute('role', 'button');
  await expect(zone).toHaveAttribute('tabindex', '0');
  await focusStable(page, zone);
});

// Les aperçus de photo jointe n'avaient pas d'alt : un lecteur d'écran
// annonçait le nom de fichier, ou rien du tout. Ils vivent dans des
// overlays paresseux — absents du DOM tant qu'on ne les a pas ouverts.
test('les aperçus de photo jointe ont un texte alternatif', async ({ page }) => {
  await ouvrirOverlay(page, 'openSignal', '#ov-signal');
  await expect(page.locator('#signal-photo-preview')).toHaveAttribute('alt', /.+/);

  await ouvrirOverlay(page, 'openBug', '#ov-bug');
  await expect(page.locator('#bug-photo-preview')).toHaveAttribute('alt', /.+/);
});
