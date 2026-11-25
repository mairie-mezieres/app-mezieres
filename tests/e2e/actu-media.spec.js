const { test, expect } = require('@playwright/test');
const { couperReseauExterne } = require('./helpers/reseau');

// ── Vidéo ou son d'une actualité (v4.130, ADR-0057) ────────────────────
//
// CE QUE CE TEST PROTÈGE :
//  1. RGAA 4.10 — rien ne se lance tout seul : ni `autoplay`, et
//     `preload="none"` (une liste d'actus ne doit rien télécharger avant le
//     clic). Et un écran FERMÉ met ses médias en pause : il reste dans le DOM,
//     masqué, et un son continuerait de jouer sans contrôle visible.
//  2. RGAA 4.2 / 4.4 — la légende DIT à l'habitant où est l'alternative
//     (sous-titres incrustés, ou transcription dans le texte). Sans elle, la
//     garantie exigée de la mairie par le backend serait introuvable.
//  3. Lecteur NATIF à `controls` (4.11 / 4.13).
//  4. Seules les adresses https://res.cloudinary.com/ sont lues : un champ
//     `media` venu d'ailleurs ne produit aucun lecteur.
//
// Les fichiers ne sont jamais téléchargés ici (res.cloudinary.com est coupé,
// et `preload="none"`) : on vérifie le balisage et le style calculé.

const CDN = 'https://res.cloudinary.com/demo/video/upload/v1/mat/actus-media/';
const ACTUS = [
  {
    id: 910001, title: 'Vœux du maire en vidéo', description: 'Les vœux 2027.',
    date: '20/11/2026', dateISO: '2026-11-20', photo: null, source: 'admin',
    media: { kind: 'video', url: CDN + 'voeux.mp4', publicId: 'mat/actus-media/voeux', format: 'mp4', duration: 75, poster: CDN + 'voeux.jpg', accessibilite: 'sous-titres-incrustes' }
  },
  {
    id: 910002, title: 'Message audio de la mairie', description: 'Transcription : bonjour à toutes et à tous…',
    date: '19/11/2026', dateISO: '2026-11-19', photo: null, source: 'admin',
    media: { kind: 'audio', url: CDN + 'message.mp3', publicId: 'mat/actus-media/message', format: 'mp3', duration: 42, accessibilite: 'transcription-dans-le-texte' }
  },
  {
    // Adresse hors Cloudinary : aucun lecteur ne doit apparaître.
    id: 910003, title: 'Média douteux', description: 'x',
    date: '18/11/2026', dateISO: '2026-11-18', photo: null, source: 'admin',
    media: { kind: 'video', url: 'https://exemple.invalid/a.mp4' }
  }
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mat_onboarded_v3', '1'));
  await couperReseauExterne(page, (route, url) => {
    if (/\/actus(\?|$)/.test(url)) {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ actus: ACTUS, count: ACTUS.length }) });
      return true;
    }
    return false;
  });
  await page.goto('/');
  await page.waitForSelector('body.app-ready', { timeout: 15000 });
});

async function ouvrirListeActus(page) {
  await page.waitForFunction(() => typeof window.loadActus === 'function');
  await page.evaluate(() => { window.openNotifs ? window.openNotifs() : window.loadActus(); });
  await page.evaluate(() => window.loadActus());
  await expect(page.locator('#actu-list .actu-item').first()).toBeVisible({ timeout: 10000 });
}

test('vidéo et son : lecteur natif, sans lecture ni téléchargement automatiques', async ({ page }) => {
  await ouvrirListeActus(page);
  await expect(page.locator('#actu-list .actu-media')).toHaveCount(2);   // pas la 3ᵉ

  const video = page.locator('#actu-list video.actu-media-player');
  await expect(video).toHaveCount(1);
  await expect(video).toHaveAttribute('controls', '');
  await expect(video).toHaveAttribute('preload', 'none');
  await expect(video).toHaveAttribute('playsinline', '');
  await expect(video).toHaveAttribute('aria-label', /Vidéo : Vœux du maire/);
  expect(await video.getAttribute('autoplay')).toBeNull();
  expect(await video.getAttribute('poster')).toMatch(/^https:\/\/res\.cloudinary\.com\//);

  const audio = page.locator('#actu-list audio.actu-media-player');
  await expect(audio).toHaveCount(1);
  await expect(audio).toHaveAttribute('controls', '');
  await expect(audio).toHaveAttribute('preload', 'none');
  expect(await audio.getAttribute('autoplay')).toBeNull();

  // Aucun média ne joue au chargement.
  const enLecture = await page.evaluate(() =>
    Array.from(document.querySelectorAll('video,audio')).filter((m) => !m.paused).length);
  expect(enLecture).toBe(0);
});

test('la légende dit où trouver l’alternative (RGAA 4.2 / 4.4), sur un fond déclaré', async ({ page }) => {
  await ouvrirListeActus(page);
  const caps = page.locator('#actu-list .actu-media-cap');
  await expect(caps.nth(0)).toContainText('Vidéo sous-titrée');
  await expect(caps.nth(0)).toContainText('1 min 15 s');
  await expect(caps.nth(1)).toContainText('en reprend le contenu');
  // Règle 7 du CLAUDE.md : le style se mesure rendu. Un fond transparent
  // rendrait le contraste de la légende indécidable (RGAA 10.5).
  const bg = await caps.nth(0).evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).not.toBe('rgba(0, 0, 0, 0)');
});

test('le détail porte le lecteur, et fermer l’écran met le média en pause', async ({ page }) => {
  await ouvrirListeActus(page);
  await page.evaluate((id) => window.openActuDetail(String(id)), ACTUS[1].id);
  const audio = page.locator('#actu-detail-body audio.actu-media-player');
  await expect(audio).toHaveCount(1, { timeout: 10000 });

  // Le fichier n'est pas joignable ici : on observe l'appel à pause().
  await page.evaluate(() => {
    window.__pauses = 0;
    const el = document.querySelector('#actu-detail-body audio');
    el.pause = () => { window.__pauses++; };
  });
  await page.evaluate(() => window.closeOv('actu'));
  expect(await page.evaluate(() => window.__pauses)).toBeGreaterThanOrEqual(1);
});
