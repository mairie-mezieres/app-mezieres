# ADR-0006 — Bloquer le service worker pendant les tests E2E

- **Date** : 25 juillet 2026
- **Statut** : Accepté

## Contexte

La suite Playwright « smoke » échouait par intermittence depuis longtemps, sans lien
avec le code testé : tantôt un scan axe, tantôt une attente de locator, tantôt sur le
projet `desktop-chromium`, tantôt sur `mobile-chromium`. Le symptôme le plus visible
était un test bloqué jusqu'au timeout de 30 s avec
`Error: page.evaluate: Target page, context or browser has been closed`.

Ce flake a longtemps été mis sur le compte de la « charge parallèle » et absorbé par
`retries: 1` en CI. Il a fini par rougir `main` après le merge de #303.

**Cause réelle, mesurée** : le service worker s'installe pendant le test, appelle
`skipWaiting()`, prend le contrôle de la page — et `mat-core.js` recharge alors la page
sur l'événement `controllerchange`. Le frame principal navigue **en plein test**
(4 navigations mesurées contre 2 avec le SW bloqué). Toute opération en vol est coupée :
une assertion de locator repart sur la nouvelle page (parfois elle s'en remet), tandis
qu'`analyze()` d'`@axe-core/playwright` reste pendant jusqu'au timeout du test.

Le diagnostic initial — « le scan axe de l'accueil desktop est devenu trop lent avec
axe-core 4.12 » — était faux : mesuré, `analyze()` prend **0,9 s** en desktop comme en
mobile, pour 0 violation.

## Décision

Nous bloquons le service worker dans `tests/e2e/playwright.config.js` :
`use: { serviceWorkers: 'block' }`.

Ces tests vérifient le **shell et l'accessibilité** ; le service worker n'est pas leur
objet. Les couper du SW les rend hermétiques, conformément à l'intention déjà écrite en
tête de la configuration.

## Conséquences

**Positives :**
- Flake éliminé : 2 exécutions sur 3 échouaient avant, 5 sur 5 au vert après (parallèle).
- Exécutions plus rapides (~17 s contre ~22-25 s) : plus de rechargements parasites.
- Les échecs futurs redeviennent un signal fiable, au lieu d'être noyés dans le bruit.

**Négatives / compromis acceptés :**
- Le comportement hors-ligne et le cycle de mise à jour du SW ne sont plus couverts —
  ils ne l'étaient de toute façon pas *volontairement*, et leur couverture accidentelle
  était précisément la source du bruit.

**Points de vigilance pour les futures évolutions :**
- Ne pas retirer `serviceWorkers: 'block'` sans reproduire le problème d'origine.
- Pour tester un jour le SW (précache, hors-ligne, notification de mise à jour), créer
  une suite **dédiée** qui attend explicitement `navigator.serviceWorker.ready` et le
  rechargement, plutôt que de réactiver le SW dans la suite smoke.
- `retries: 1` en CI reste utile, mais ne doit plus servir à masquer un flake :
  si un test échoue deux fois de suite, chercher une cause réelle comme ici.
