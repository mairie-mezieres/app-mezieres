# ADR-0030 — Un contrôle d'accessibilité lancé trop tôt mesure un écran vide

- **Date** : 27 août 2026
- **Statut** : Accepté
- **Prolonge** : la règle 7 du `CLAUDE.md` (« un test qui n'interroge que le JS ne
  prouve pas qu'un effet est visible ») et l'ADR-0015 (l'accolade orpheline) —
  même classe : un contrôle vert qui ne contrôle rien.

## Contexte

L'audit RGAA du 27 août 2026 devait partir des tests existants. Ils étaient verts
depuis toujours. Le premier relevé indépendant, lui, a trouvé **neuf violations
`label` de niveau *critical*** sur l'écran Accessibilité — les douze interrupteurs
du panneau (contraste élevé, mode daltonien, lecture vocale…) n'avaient **aucun nom
accessible**. Une personne au lecteur d'écran entendait « case à cocher », sans
savoir laquelle.

Le test qui aurait dû l'attraper existait, tapait le bon sélecteur, avec les bons
filtres WCAG. Il passait.

### La cause

```js
await expect(page.locator('#ov-accessibilite')).toHaveClass(/open/);
const results = await new AxeBuilder({ page }).include('#ov-accessibilite')…
```

La classe `open` est posée **au début** de la transition CSS. Pendant environ
300 ms, l'écran reste `visibility: hidden`. Or **axe ignore délibérément tout ce
qui est masqué** — c'est le comportement attendu d'un outil d'accessibilité, un
contenu invisible n'étant pas restitué. `analyze()` mesurait donc un écran vide.

Mesuré sur les mêmes nœuds, le même jour :

| Instant | `visibility` calculée | Violations |
|---|---|---|
| t = 0 ms | `hidden` | **0** |
| t = 400 ms | `hidden` (opacité déjà à 1) | **9** |
| t = 1500 ms | `visible` | **9** |

Le test ne mesurait pas « peu » : il mesurait **rien**. Il ne pouvait pas échouer,
quel que soit le contenu de l'écran. Cinq tests étaient dans ce cas — l'écran
Accessibilité et les quatre de la boucle `A11Y_OVERLAYS`.

### Pourquoi ça a tenu si longtemps

Un test vert est un test qu'on ne relit pas. Celui-ci portait le bon nom, visait le
bon sélecteur, et son verdict était exactement celui qu'on espérait. Rien ne
distinguait « aucune violation » de « aucune mesure ». C'est la signature de cette
famille de bugs : **l'absence de signal se lit comme une bonne nouvelle.**

## Décision

Attendre le **style calculé**, pas la classe :

```js
await page.waitForFunction(
  (s) => getComputedStyle(document.querySelector(s)).visibility === 'visible', sel);
await expect.poll(() => page.evaluate(
  (s) => getComputedStyle(document.querySelector(s)).visibility, sel)).toBe('visible');
```

Le helper `ouvrirOverlayVisible()` de `tests/e2e/smoke.spec.js` porte cette
attente, et **tous** les contrôles axe d'écran passent par lui.

## Conséquences

- Dès la correction, les tests ont signalé des violations réelles sur deux autres
  écrans : contraste du bouton d'appel des **pompiers** (3,55:1 pour un minimum de
  4,5) et lien d'attribution de la carte. Corrigés.
- Les contrôles d'accessibilité peuvent désormais échouer. C'est le but.
- **Règle générale** : quand un outil ignore ce qui est masqué — axe, un calcul de
  contraste, une capture d'écran —, l'attente d'ouverture doit porter sur le rendu,
  jamais sur l'état interne qui la déclenche.

## Alternative écartée

**Ajouter un `waitForTimeout(500)`.** Ça aurait marché ce jour-là. Une transition
rallongée, un runner chargé, et le test redevient muet — sans que rien ne le dise.
Une attente sur une condition observable ne se périme pas ; une attente sur une
durée, si.
