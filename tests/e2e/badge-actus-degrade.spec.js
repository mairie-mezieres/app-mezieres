// @ts-check
const { test, expect } = require('@playwright/test');
const { couperReseauExterne } = require('./helpers/reseau');

/*
 * Le badge des actualités doit survivre à l'absence d'un module voisin.
 *
 * `updateActuBadge` (js/mat-actus.js) appelait `updateAppBadge`, qui vit dans
 * js/mat-accessibility.js, SANS garde. En chargement nominal les deux fichiers
 * sont là — c'est pour ça que ça ne se voyait pas. Mais le service worker peut
 * servir un cache partiel (ADR-0032), et alors l'appel lève.
 *
 * ⚠️ Deux choses rendaient la panne muette, et ce sont elles que ce test vise :
 *
 *   1. `refreshActusBadge` est `async`. Ses quatre appelants l'enveloppent dans
 *      un `try/catch` SYNCHRONE, qui n'attrape pas un rejet de promesse. Le
 *      garde-fou existait donc sur le papier et ne protégeait rien.
 *   2. Le badge rouge est posé AVANT l'appel fautif, et l'encart « Boîte à
 *      idées » APRÈS : l'écran gardait l'air normal, seul l'encart manquait.
 *
 * On simule donc exactement le cache partiel — la fonction est retirée après
 * chargement — et on exige l'EFFET VISIBLE : l'encart doit s'afficher quand même.
 */

test('l’encart « Boîte à idées » s’affiche même si updateAppBadge manque', async ({ page }) => {
  await couperReseauExterne(page);
  await page.addInitScript(() => localStorage.setItem('mat_onboarded_v3', '1'));
  await page.goto('/');
  await page.waitForFunction(() => typeof window.refreshActusBadge === 'function');

  // ⚠️ L'encart se greffe au-dessus de `#actu-list`, qui vit dans l'écran
  // Notifications — monté paresseusement. Sans cette ouverture,
  // `ensureNotifIdeasCalloutBox` renvoie `null` et le test « passerait » sur une
  // boîte inexistante, donc ne mesurerait rien.
  await page.evaluate(() => window.openNotifs());
  await page.waitForSelector('#actu-list', { state: 'attached' });

  const resultat = await page.evaluate(async () => {
    // Le cache partiel : le module voisin n'a pas été servi.
    // ⚠️ `delete window.updateAppBadge` NE MARCHE PAS : une `function` déclarée
    // au premier niveau d'un script classique pose une propriété globale
    // **non configurable**, et le `delete` échoue en silence — l'auto-contrôle
    // ci-dessous l'a attrapé du premier coup. On l'écrase donc, ce qui est
    // permis (la propriété reste inscriptible).
    // @ts-ignore — on neutralise volontairement une globale pour reproduire ADR-0032.
    window.updateAppBadge = undefined;
    const absente = typeof window.updateAppBadge !== 'function';

    // Deux idées jamais vues, sans réseau : l'encart a de quoi s'afficher.
    localStorage.removeItem('mat_ideas_seen_v1');
    // @ts-ignore — stub local, le serveur de test bloque les appels sortants.
    window.fetchIdeasForBadge = async () => ([
      { id: 'i1', date: '2026-09-15', text: 'Une idée' },
      { id: 'i2', date: '2026-09-15', text: 'Une autre' },
    ]);

    let rejet = null;
    // @ts-ignore
    await window.refreshActusBadge().catch((e) => { rejet = String(e && e.message || e); });
    const box = document.getElementById('notif-ideas-callout');
    return { absente, rejet, encart: box ? box.textContent.trim() : '' };
  });

  // Auto-contrôle : sans cette ligne, le test passerait aussi sur une app saine
  // — il ne mesurerait alors pas ce qu'il prétend mesurer.
  expect(resultat.absente, 'la fonction devait être retirée : le test ne reproduit rien').toBe(true);

  expect(resultat.rejet, 'refreshActusBadge ne doit plus rejeter quand updateAppBadge manque').toBeNull();
  expect(resultat.encart, 'l’encart « Boîte à idées » doit être rendu malgré le module manquant')
    .toContain('idée');
});
