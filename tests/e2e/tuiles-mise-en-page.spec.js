// @ts-check
const { test, expect } = require('@playwright/test');

/*
 * Tuiles de l'accueil — le titre et le sous-titre doivent rester EMPILÉS.
 *
 * Ces éléments étaient des <div> dans un <button>, ce que le validateur du W3C
 * refuse (RGAA 8.2). Passés en <span>, ils perdent le `display:block` que la
 * balise <div> leur donnait gratuitement : sans la règle CSS ajoutée en même
 * temps, les 28 tuiles verraient leur sous-titre remonter sur la ligne du
 * titre. Ce test est le filet de cette conversion.
 *
 * ⚠️ Il asserte le STYLE CALCULÉ et la GÉOMÉTRIE, pas le balisage — et il
 * refuse de conclure sur une carte de hauteur nulle : la grille du téléphone
 * est masquée au-delà de 1024 px, et toute comparaison de position entre deux
 * boîtes vides est vraie. C'est la panne d'ADR-0030, qui a bel et bien rendu
 * une première version de ce test verte sans qu'elle mesure quoi que ce soit.
 */

const HOTES = ['onrender.com','googleapis.com','gstatic.com','open-meteo.com','facebook.com',
  'api-adresse.data.gouv.fr','apicarto.ign.fr','data.geopf.fr','cadastre.data.gouv.fr',
  'geoportail-urbanisme','raw.githubusercontent.com','res.cloudinary.com','data.education.gouv.fr','sentry.io'];

test('tuiles : le sous-titre reste sous le titre, pas à côté', async ({ page, viewport }) => {
  test.skip(!viewport || viewport.width >= 1024, 'grille du téléphone uniquement');
  await page.addInitScript(() => localStorage.setItem('mat_onboarded_v3','1'));
  await page.route('**/*', r => HOTES.some(h => r.request().url().includes(h)) ? r.abort() : r.continue());
  await page.goto('/');
  await page.waitForFunction(() => typeof window.openOv === 'function');

  const tuiles = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('button.card').forEach(b => {
      const l = b.querySelector('.ct-label'), s = b.querySelector('.ct-sub');
      if (!l || !s) return;
      const bl = l.getBoundingClientRect(), bs = s.getBoundingClientRect();
      out.push({
        txt: l.textContent.trim().slice(0, 24),
        hauteurCarte: Math.round(b.getBoundingClientRect().height),
        dispL: getComputedStyle(l).display,
        dispS: getComputedStyle(s).display,
        empile: bs.top >= bl.bottom - 1
      });
    });
    return out;
  });

  expect(tuiles.length, 'aucune tuile titre+sous-titre trouvée').toBeGreaterThan(8);

  for (const t of tuiles) {
    // Sans cette assertion, tout le reste passerait sur des boîtes de 0 px.
    expect(t.hauteurCarte, `carte « ${t.txt} » non mise en page : rien ne serait mesuré`).toBeGreaterThan(20);
    expect(t.dispL, `.ct-label de « ${t.txt} »`).toBe('block');
    expect(t.dispS, `.ct-sub de « ${t.txt} »`).toBe('block');
    expect(t.empile, `« ${t.txt} » : le sous-titre doit être SOUS le titre`).toBe(true);
  }
});

test('cartes à cocher de partager.html : description sous le titre', async ({ page }) => {
  await page.goto('/partager.html');
  const r = await page.evaluate(() => [...document.querySelectorAll('.radio-card')].map(c => {
    const t = c.querySelector('.rc-title'), d = c.querySelector('.rc-desc');
    const bt = t.getBoundingClientRect(), bd = d.getBoundingClientRect();
    return { txt: t.textContent.trim(), h: Math.round(c.getBoundingClientRect().height),
      dispT: getComputedStyle(t).display, dispD: getComputedStyle(d).display,
      empile: bd.top >= bt.bottom - 1 };
  }));
  expect(r.length).toBe(2);
  for (const c of r) {
    expect(c.h, `carte « ${c.txt} » non mise en page`).toBeGreaterThan(20);
    expect(c.dispT).toBe('block');
    expect(c.dispD).toBe('block');
    expect(c.empile, `« ${c.txt} » : la description doit être SOUS le titre`).toBe(true);
  }
});
