// @ts-check
const { test, expect } = require('@playwright/test');
const { couperReseauExterne } = require('./helpers/reseau');

/*
 * Contre-vérification RGAA de l'accueil (19 novembre 2026, v4.129) — voir
 * ADR-0056 et l'audit, « Douzième passe ».
 *
 * Ce que ces tests verrouillent, et pourquoi :
 *  - <main> CONTIENT ce qu'on voit. Il s'ouvrait après les tuiles du
 *    téléphone : sous 1024 px, tout son contenu était en display:none, et le
 *    lien d'évitement menait à une zone vide. axe ne le voit pas (un <main>
 *    existe, il a un id) ; seule la mesure du rendu le voit ;
 *  - un seul h1, un seul <main>, un seul pied de page EXPOSÉS par mise en page ;
 *  - les quatre fenêtres qui ne passent pas par openOv() : focus entrant,
 *    Tab qui reste dedans, Échap qui ferme LA fenêtre (et pas l'overlay du
 *    dessous), focus rendu ;
 *  - les sondages : légende, étoiles atteignables au clavier, statut annoncé ;
 *  - les pastilles « ! » et les emojis décoratifs des tuiles.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mat_onboarded_v3', '1'));
  await couperReseauExterne(page);
  await page.goto('/');
  await page.waitForSelector('body.app-ready', { timeout: 15000 });
});

const visible = (el) => {
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden';
};

test('le lien d’évitement mène à un <main> qui contient du contenu VISIBLE', async ({ page }) => {
  const r = await page.evaluate(() => {
    const skip = document.querySelector('a.skip-link');
    const id = skip && skip.getAttribute('href').slice(1);
    const main = document.getElementById(id);
    const vis = (el) => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
    const visibles = main ? [...main.querySelectorAll('button, a[href], h2, [role="button"]')].filter(vis).length : 0;
    return {
      cible: !!main, estMain: main && main.tagName,
      nbMain: document.querySelectorAll('main, [role="main"]').length,
      visibles
    };
  });
  expect(r.cible, 'la cible du lien d’évitement n’existe pas').toBe(true);
  expect(r.estMain).toBe('MAIN');
  expect(r.nbMain).toBe(1);
  expect(r.visibles, '<main> ne contient rien de visible dans cette mise en page').toBeGreaterThan(5);
});

test('un seul h1, un seul bandeau, un seul pied de page exposés', async ({ page }) => {
  const r = await page.evaluate((src) => {
    const vis = new Function('return ' + src)();
    const compte = (sel) => [...document.querySelectorAll(sel)].filter(vis).length;
    return {
      h1: compte('h1'),
      banner: compte('header, [role="banner"]'),
      contentinfo: compte('footer, [role="contentinfo"]')
    };
  }, visible.toString());
  expect(r).toEqual({ h1: 1, banner: r.banner, contentinfo: 1 });
  expect(r.banner).toBeLessThanOrEqual(1);
});

test('liens « Toutes → », « Voir tous → »… : un nom qui dit où ils mènent', async ({ page }) => {
  const sans = await page.evaluate(() =>
    [...document.querySelectorAll('.d-card-hdr button')]
      .filter((b) => !(b.getAttribute('aria-label') || '').includes(b.textContent.replace(/\s*→\s*$/, '').trim()))
      .map((b) => b.textContent.trim()));
  expect(sans, 'bouton d’en-tête sans nom contextualisé (ou nom qui ne reprend pas le texte visible)').toEqual([]);
});

test('tuiles de l’accueil : aucun emoji lu, les pastilles « ! » ont un texte', async ({ page }) => {
  const r = await page.evaluate(() => {
    const EMOJI = /\p{Extended_Pictographic}/u;
    const exposes = [];
    document.querySelectorAll('.content .ico').forEach((ico) => {
      const w = document.createTreeWalker(ico, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = w.nextNode())) {
        if (EMOJI.test(n.nodeValue) && !n.parentElement.closest('[aria-hidden="true"]')) exposes.push(n.nodeValue);
      }
    });
    const pastilles = ['docs-badge', 'sondages-badge', 'photos-badge'].map((id) => {
      const b = document.getElementById(id);
      return { id, cache: b.getAttribute('aria-hidden'), texte: (b.querySelector('.sr-only') || {}).textContent || '' };
    });
    return { exposes, pastilles };
  });
  expect(r.exposes, 'emoji exposé aux lecteurs d’écran').toEqual([]);
  for (const p of r.pastilles) {
    expect(p.cache, `${p.id} masquée aux lecteurs d’écran`).toBeNull();
    expect(p.texte.length, `${p.id} sans texte équivalent`).toBeGreaterThan(3);
  }
});

test('fiche d’un élu : Entrée l’ouvre, Tab y reste, Échap la ferme sans fermer le conseil', async ({ page }) => {
  await page.evaluate(() => openConseil());
  const vignette = page.locator('.trombi-item').first();
  await expect(vignette).toBeVisible();
  await vignette.focus();
  await page.keyboard.press('Enter');
  const carte = page.locator('#trombi-card');
  await expect(page.locator('#trombi-modal')).toBeVisible();
  await expect(carte).toHaveAttribute('role', 'dialog');
  await expect(carte).toHaveAttribute('aria-modal', 'true');
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.getElementById('trombi-card').contains(document.activeElement)),
      'le focus est sorti de la fiche').toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(page.locator('#trombi-modal')).toBeHidden();
  await expect(page.locator('#ov-conseil')).toHaveClass(/open/);
  expect(await page.evaluate(() => document.activeElement && document.activeElement.classList.contains('trombi-item'))).toBe(true);
});

test('proposition d’activer les alertes : fenêtre nommée, focus, Échap', async ({ page }) => {
  await page.waitForFunction(() => typeof _showNotifSheet === 'function', null, { timeout: 15000 });
  await page.evaluate(() => { window.__res = 'en attente'; _showNotifSheet().then((v) => { window.__res = v; }); });
  const sheet = page.locator('#mat-notif-sheet');
  await expect(sheet).toHaveAttribute('role', 'dialog');
  await expect(sheet).toHaveAttribute('aria-modal', 'true');
  await expect(page.locator('#_nsTitre')).toHaveText(/MAT est install/);
  await expect(page.locator('#_nsBtnClose')).toHaveAttribute('aria-label', 'Fermer');
  await expect(page.locator('#_nsBtnOk')).toBeFocused();
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.getElementById('mat-notif-sheet').contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  expect(await page.evaluate(() => window.__res)).toBe(false);
});

test('message de l’application par-dessus un écran : Échap ne ferme QUE le message', async ({ page }) => {
  await page.evaluate(() => { openOv('rgpd'); setTimeout(() => alertMAT('Essai', 'Titre'), 50); });
  await expect(page.locator('#mat-modal.open')).toBeVisible();
  await expect(page.locator('.mat-modal-close')).toHaveAttribute('aria-label', 'Fermer');
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.getElementById('mat-modal').contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(page.locator('#mat-modal.open')).toHaveCount(0);
  await expect(page.locator('#ov-rgpd')).toHaveClass(/open/);
});

test('présentation guidée : fenêtre nommée, focus posé, Échap la passe', async ({ page }) => {
  await page.evaluate(() => relancerOnboarding());
  const ob = page.locator('#mat-onboarding');
  await expect(ob).toHaveAttribute('role', 'dialog');
  await expect(ob).toHaveAttribute('aria-label', /Présentation/);
  expect(await page.evaluate(() => document.getElementById('mat-onboarding').contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(ob).toBeHidden({ timeout: 3000 });
});

test('sondage : légende, étoiles au clavier, statut annoncé', async ({ page }) => {
  await page.waitForFunction(() => typeof _renderSondageForm === 'function', null, { timeout: 15000 });
  await page.evaluate(() => {
    const d = document.createElement('div');
    d.id = 'essai-sondage';
    d.innerHTML = _renderSondageForm({ id: 991, type: 'notation_etoiles', titre: 'Note la fête' })
      + _renderSondageForm({ id: 992, type: 'choix_unique', titre: 'Quel jour ?', options: ['Samedi', 'Dimanche'] })
      + _renderSondageForm({ id: 993, type: 'texte_libre', titre: 'Une idée ?' });
    document.querySelector('main').prepend(d);
  });
  const etoiles = page.locator('#sond-stars-991 button');
  await expect(etoiles).toHaveCount(5);
  await expect(etoiles.nth(2)).toHaveAttribute('aria-label', '3 étoiles sur 5');
  await etoiles.nth(2).focus();
  await page.keyboard.press('Enter');
  await expect(etoiles.nth(2)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#sond-star-label-991')).toHaveText('Moyen');
  await expect(page.locator('#essai-sondage fieldset legend')).toHaveText('Quel jour ?');
  await expect(page.locator('#sond-input-993')).toHaveAttribute('aria-label', /Une idée/);
  await expect(page.locator('#sond-submit-status-992')).toHaveAttribute('role', 'status');
});

test('signalement : la catégorie choisie est annoncée (aria-pressed)', async ({ page }) => {
  await page.evaluate(() => openSignal());
  const groupe = page.locator('#signal-cats');
  await expect(groupe).toHaveAttribute('role', 'group');
  const b = groupe.locator('.cat-btn').nth(1);
  await b.click();
  await expect(b).toHaveAttribute('aria-pressed', 'true');
  await expect(groupe.locator('.cat-btn[aria-pressed="true"]')).toHaveCount(1);
});
