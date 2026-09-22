const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Manifeste — raccourcis de l'icône et captures d'installation.
//
// ⛔ Un raccourci qui ouvre l'accueil ne se remarque pas : le raccourci
// « Signalement » (`./#signal`) figurait au manifeste depuis l'origine sans être
// routé par `handleMatHashRoute` (js/mat-core.js). Aucune erreur, l'app
// s'ouvrait simplement sur l'accueil. Ce test ouvre CHAQUE raccourci déclaré et
// exige l'écran correspondant : en ajouter un sans le router échoue ici.
//
// Réseau coupé (ADR-0048).
const { couperReseauExterne } = require('./helpers/reseau');

const RACINE = path.join(__dirname, '..', '..');
const manifeste = JSON.parse(fs.readFileSync(path.join(RACINE, 'manifest.webmanifest'), 'utf8'));

// Dimensions lues dans l'en-tête WebP (les trois variantes du format).
function tailleWebp(buf, nom) {
  const bloc = buf.toString('ascii', 12, 16);
  if (bloc === 'VP8X') return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
  if (bloc === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
  if (bloc === 'VP8L') {
    const b = buf.readUInt32LE(21);
    return { w: 1 + (b & 0x3fff), h: 1 + ((b >> 14) & 0x3fff) };
  }
  throw new Error(`${nom} : bloc WebP inconnu « ${bloc} »`);
}

// Hash du raccourci → overlay attendu.
const ECRAN = { '#mel': 'mel', '#signal': 'signal', '#meteo': 'meteo', '#agenda': 'agenda' };

test('chaque raccourci du manifeste a un écran attendu déclaré ici', () => {
  for (const s of manifeste.shortcuts) {
    const hash = s.url.slice(s.url.indexOf('#'));
    expect(ECRAN[hash], `raccourci ${s.url} sans écran attendu`).toBeTruthy();
  }
});

for (const s of manifeste.shortcuts) {
  const hash = s.url.slice(s.url.indexOf('#'));
  test(`le raccourci « ${s.name} » ouvre son écran`, async ({ page }) => {
    await page.addInitScript(() => { localStorage.setItem('mat_onboarded_v3', '1'); });
    await couperReseauExterne(page);
    await page.goto('/' + hash);
    await expect(page.locator('#ov-' + ECRAN[hash])).toHaveClass(/\bopen\b/, { timeout: 15000 });
  });
}

// Chrome n'affiche la fiche d'installation enrichie que si les captures
// respectent ses règles : taille déclarée = taille réelle, côtés entre 320 et
// 3840 px, grand côté ≤ 2,3 × petit côté. Une capture non conforme est ignorée
// sans erreur visible.
test('les captures du manifeste existent et respectent les règles de Chrome', () => {
  expect(manifeste.screenshots.length).toBeGreaterThan(0);
  for (const c of manifeste.screenshots) {
    const buf = fs.readFileSync(path.join(RACINE, c.src));
    expect(buf.toString('ascii', 0, 4)).toBe('RIFF');
    expect(buf.toString('ascii', 8, 12)).toBe('WEBP');
    const { w, h } = tailleWebp(buf, c.src);
    expect(c.sizes, c.src).toBe(`${w}x${h}`);
    expect(Math.min(w, h)).toBeGreaterThanOrEqual(320);
    expect(Math.max(w, h)).toBeLessThanOrEqual(3840);
    expect(Math.max(w, h) / Math.min(w, h)).toBeLessThanOrEqual(2.3);
    expect(c.label, c.src).toBeTruthy();
  }
});
