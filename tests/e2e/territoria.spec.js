// @ts-check
const { test, expect } = require('@playwright/test');
const { couperReseauExterne } = require('./helpers/reseau');

/*
 * Badge « Territoria d’Or 2026 » de l'accueil.
 *
 * Ce que ces tests verrouillent :
 *  - le libellé exact, avec l'apostrophe TYPOGRAPHIQUE (’, U+2019) — une
 *    apostrophe droite s'y glisserait au premier copier-coller ;
 *  - ce que lit la lecture vocale : le libellé seul, l'emoji étant masqué ;
 *  - le contraste AA mesuré sur le RENDU (style calculé), pas sur le code ;
 *  - un seul badge visible par mise en page (en-tête mobile / hero bureau) ;
 *  - l'animation : jouée à la première ouverture seulement, jamais sous
 *    « Réduire les animations », et sans jamais toucher à l'opacité.
 */

const LIBELLE = 'Territoria d’Or 2026';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mat_onboarded_v3', '1'));
  await couperReseauExterne(page);
});

function badgeVisible(page) {
  const bureau = (page.viewportSize()?.width || 0) >= 1024;
  return page.locator(bureau ? '.territoria-bureau' : '.territoria-mobile');
}

function luminance(rgb) {
  const c = rgb.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map(v => v / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

test('libellé avec apostrophe typographique, emoji masqué à la lecture vocale', async ({ page }) => {
  await page.goto('/');
  const badge = badgeVisible(page);
  await expect(badge).toBeVisible();
  await expect(badge.locator('.territoria-txt')).toHaveText(LIBELLE);
  expect(LIBELLE).not.toContain("'");
  await expect(badge.locator('.territoria-ico')).toHaveAttribute('aria-hidden', 'true');
  // Ce que reçoit un lecteur d'écran : le libellé, sans « trophée ».
  const lu = await badge.evaluate(el => {
    let t = '';
    el.childNodes.forEach(n => {
      if (n.nodeType === 1 && /** @type {Element} */ (n).getAttribute('aria-hidden') === 'true') return;
      t += n.textContent;
    });
    return t.trim();
  });
  expect(lu).toBe(LIBELLE);
});

test('un seul badge visible par mise en page', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.territoria:visible')).toHaveCount(1);
});

test('contraste AA mesuré sur le rendu', async ({ page }) => {
  await page.goto('/');
  const { fg, bg, opacite } = await badgeVisible(page).evaluate(el => {
    const s = getComputedStyle(el);
    return { fg: s.color, bg: s.backgroundColor, opacite: s.opacity };
  });
  // Fond opaque : sinon le contraste dépendrait de l'en-tête animé ou de la photo.
  expect(bg).not.toMatch(/rgba\([^)]*,\s*0(\.\d+)?\)/);
  expect(opacite).toBe('1');
  const [a, b] = [luminance(fg), luminance(bg)];
  const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  expect(ratio).toBeGreaterThanOrEqual(4.5);
});

test('animation jouée à la première ouverture seulement, sans toucher à l’opacité', async ({ page }) => {
  await page.goto('/');
  const badge = badgeVisible(page);
  await expect(badge).toHaveClass(/territoria-anim/);
  // Lisible à chaque image : l'animation ne passe jamais par une opacité réduite.
  const noms = await badge.evaluate(el => getComputedStyle(el).animationName);
  expect(noms).toContain('territoriaPose');
  const opacites = await badge.evaluate(el => {
    const vus = [];
    el.getAnimations().forEach(a => {
      const eff = /** @type {KeyframeEffect} */ (a.effect);
      eff.getKeyframes().forEach(k => { if (k.opacity !== undefined) vus.push(k.opacity); });
    });
    return vus;
  });
  expect(opacites.filter(o => Number(o) !== 1)).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem('mat_territoria_vu'))).toBe('1');

  await page.reload();
  await expect(badgeVisible(page)).toBeVisible();
  await expect(badgeVisible(page)).not.toHaveClass(/territoria-anim/);
});

test('aucune animation sous « Réduire les animations »', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const badge = badgeVisible(page);
  await expect(badge).toBeVisible();
  await page.waitForFunction(() => localStorage.getItem('mat_territoria_vu') === '1');
  await expect(badge).not.toHaveClass(/territoria-anim/);
});
