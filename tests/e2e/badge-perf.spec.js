// @ts-check
const { test, expect } = require('@playwright/test');

/*
 * Badge de performances du pied de page.
 *
 * ⚠️ Le score d'accessibilité de Lighthouse N'EST PAS un taux de conformité
 * RGAA. Lighthouse passe une quarantaine de contrôles automatisables ; le
 * référentiel en compte 106, dont beaucoup ne se mesurent pas sans jugement
 * humain — Lighthouse le dit lui-même.
 *
 * L'infobulle de ce badge a longtemps annoncé « conformité RGAA/WCAG ». Le pied
 * de page affichait donc 100 pendant que la déclaration publiée annonçait
 * 89,2 % : deux chiffres contradictoires, et le plus flatteur des deux
 * n'engageait rien. C'est la même erreur, en miroir, que celle qui a déclenché
 * l'audit d'août 2026 — prendre un contrôle automatique vert pour une
 * conformité.
 *
 * Ce test empêche la formulation de revenir.
 */

test('le badge n’annonce pas Lighthouse comme une conformité RGAA', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mat_onboarded_v3', '1'));
  await page.goto('/');

  // ⚠️ Il y a DEUX .footer-perf (mobile et ordinateur) et l'un des deux est
  // toujours replié à 0 px. Viser « le premier » et asserter sa visibilité
  // faisait échouer ce test sur une boîte vide — la panne d'ADR-0030, encore.
  // On attend que le badge soit peuplé, puis on vérifie TOUS les exemplaires :
  // le libellé doit être honnête partout, qu'il soit affiché ici ou là.
  await expect
    .poll(() => page.evaluate(() =>
      [...document.querySelectorAll('.footer-perf')].filter(e => e.innerHTML.trim()).length),
      { message: 'aucun badge peuplé — data/ecoindex.json n’a pas été lu' })
    .toBeGreaterThan(0);

  const badges = await page.evaluate(() =>
    [...document.querySelectorAll('.footer-perf')]
      .filter(e => e.innerHTML.trim())
      .map(e => ({
        texte: e.textContent,
        titres: [...e.querySelectorAll('span[title]')]
          .map(s => s.getAttribute('title')).join(' | ')
      })));

  expect(badges.length, 'aucun badge à vérifier : le test ne mesurerait rien').toBeGreaterThan(0);

  for (const b of badges) {
    // Le libellé visible ne doit pas se lire comme un taux de conformité.
    expect(b.texte, 'le badge ne doit pas afficher « Accessibilité <chiffre> », qui se lit comme un taux')
      .not.toMatch(/Accessibilit[ée][\s ]*\d/i);
    // Et l'infobulle ne doit pas revendiquer la conformité.
    // ⚠️ Chercher la simple sous-chaîne « conformité RGAA » ne marche pas : le
    // démenti la contient lui aussi (« ce n'est PAS le taux de conformité
    // RGAA »). Ce premier motif a fait échouer le test sur le texte corrigé.
    // On vise donc l'affirmation exacte qu'il s'agit d'interdire, et on exige
    // le démenti — un texte qui ne dirait ni l'un ni l'autre échoue aussi.
    expect(b.titres, 'aucune infobulle ne doit présenter Lighthouse comme une conformité')
      .not.toMatch(/Accessibilit[ée]\s+Lighthouse\s*:\s*conformit/i);
    expect(b.titres, 'l’infobulle doit dire explicitement que ce n’est PAS le taux de conformité')
      .toMatch(/n.{0,3}est pas le taux de conformit/i);
    expect(b.titres, 'l’infobulle doit renvoyer à la déclaration pour le taux officiel')
      .toMatch(/d[ée]claration/i);
  }
});
