# ADR-0005 — View Transitions : seul le changement visuel est asynchrone

- **Date** : 25 juillet 2026
- **Statut** : Accepté

## Contexte

Pour fluidifier l'ouverture/fermeture des ~28 overlays, la v4.44 introduit la
View Transitions API (`document.startViewTransition`). Or le callback de cette
API est **asynchrone** (le navigateur capture d'abord un instantané de la page),
alors que tout le code appelant repose sur un contrat **synchrone** avec
`openOv()` :

- les fonctions d'ouverture font `openOv('x')` puis immédiatement
  `getElementById` sur le contenu de l'overlay (contenu hydraté depuis un
  `<template data-lazy-ov>` à la première ouverture — voir guide technique §12) ;
- les gestionnaires Échap / bouton retour / clic fond lisent la pile `_ovStack`
  au moment de l'événement.

Déplacer naïvement tout le corps d'`openOv()`/`closeOv()` dans le callback de
transition casserait ces appelants (contenu `null` à la première ouverture,
pile incohérente en cas d'ouvertures/fermetures rapides).

## Décision

Nous découpons `openOv()`/`closeOv()` en deux temps :

- **Synchrone (hors transition)** : hydratation du `<template data-lazy-ov>`,
  mise à jour de `_ovStack` et `_ovReturnFocus`, attributs ARIA (`role`,
  `aria-modal`, `tabindex`).
- **Dans la transition** (`_ovVisual(mutate)`) : uniquement la classe `.open`,
  le `z-index`, le verrou de scroll du `body` et le déplacement du focus.

`_ovVisual` n'utilise la transition que si l'API existe **et** que
`prefers-reduced-motion` n'est pas actif ; sinon la mutation est immédiate
(comportement historique, aucun navigateur pénalisé).

## Conséquences

**Positives :**
- Fondu fluide type app native sur Chrome/Edge/Safari récents, sans dépendance.
- Aucun des ~30 appelants d'`openOv`/`closeOv` à modifier.
- Respect automatique de « Réduire les animations ».

**Négatives / compromis acceptés :**
- Le focus et le verrou de scroll sont appliqués avec ~1 frame de retard sur
  les navigateurs compatibles (imperceptible, y compris au clavier).
- Pendant la transition (~220 ms), la page est brièvement non interactive
  (comportement standard de l'API).

**Points de vigilance pour les futures évolutions :**
- Toute nouvelle logique dont un appelant dépend au retour d'`openOv()`
  (lecture du DOM, état) doit rester **hors** de `_ovVisual`.
- Ne pas mettre dans `_ovVisual` du code qui mesure la mise en page
  (`offsetHeight`, `scrollTop`…) d'un élément encore en `display:none`.
