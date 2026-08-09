# ADR-0017 — Plancher typographique à 12 px, mesuré sur le rendu et non sur le CSS

- **Statut** : accepté
- **Date** : 2026-08-09
- **Contexte technique** : typographie / accessibilité / contrôles automatisés

## Contexte

Lighthouse mobile signalait « Document doesn't use legible font sizes — 29.6%
legible text ».

Mesure indépendante du texte réellement peint sur l'accueil (Pixel 7, appels
externes coupés) : **1 066 caractères visibles sur 1 491 étaient sous 12 px,
soit 70,5 %** — l'outil et la mesure se recoupent à 0,1 point.

Les plus gros volumes n'étaient pas décoratifs :

| Volume | Taille | Élément |
|---|---|---|
| 234 car. | 9,9 px | `.ct-sub` — sous-titres qui disent à quoi sert chaque carte |
| 145 car. | 9,9 px | `.sec` — titres de section |
| 80 car. | 10,1 px | `.top-sub` — « Prochaine ouverture lundi à 14 h » |
| 37 car. | 10,1 px | `#dechetterie-text` |
| 35 car. | **8,8 px** | `.footer-perf` |

Sur une application dont le public est très majoritairement senior, ce n'est
pas une métrique : c'est le jour de collecte illisible.

## Ce que l'audit a écarté

**La racine n'était pas en cause.** `html,body{font-size:16px}` — 1 rem = 16 px.
Il n'existait pas de correctif global : les 491 déclarations sous 12 px du dépôt
sont locales.

**Le multiplicateur d'accessibilité fonctionnait déjà.** L'hypothèse de départ
était que les tailles en dur échappaient au réglage « Taille du texte ». Mesure
dans les trois modes : **98,2 % des déclarations du dépôt sont en `rem`** (1 369
sur 1 394, contre 23 en `px`), et les tailles suivent exactement les ratios
16/19/22. **Seuls 2,7 % du texte étaient figés — exclusivement des emojis
d'icônes** (`.ico` à 22 px), donc des pictogrammes, pas du texte lisible.

**En revanche, le réglage ne rattrapait pas le problème** : curseur au maximum,
53,6 % du texte restait entre 12 et 14 px et 35,4 % seulement atteignait 16 px.
L'argument « l'habitant n'a qu'à agrandir » ne tenait pas.

**Et l'argument réglementaire ne tient pas non plus.** Ni le RGAA ni les WCAG
n'imposent de taille minimale ; le seuil de 12 px est une heuristique Google.
Le critère qui existe — RGAA 10.4 / WCAG 1.4.4, lisibilité à 200 % — était déjà
respecté grâce aux `rem`. Ce lot se justifie par la lisibilité réelle pour le
public visé, **pas** par une obligation ni par le score.

## Décision

**1. Plancher à 12 px (`0.75rem`), pas de refonte de l'échelle.**

La cible interne du projet est ≥ 16 px pour le corps de texte. Elle n'est pas
retenue ici : `.ct-sub` porte le plus gros volume de texte de l'accueil et
passerait de 9,9 à 16 px, soit **+62 %**. La maquette est bâtie sur une échelle
comprimée où 0,62–0,65 rem tient lieu de texte courant ; remonter à 16 px n'est
pas un ajustement de valeurs, c'est **redessiner la densité de l'accueil**.
Avec pour seule boucle de retour « déployer puis regarder sur un téléphone »,
le rapport gain/risque est mauvais. Le plancher à 12 px capte l'essentiel du
gain de lisibilité pour un déplacement de mise en page mesuré.

**2. Portée : l'accueil mobile uniquement.**

40 règles de `css/mat.css`, les styles inline correspondants d'`index.html`,
deux chaînes de `js/mat-core.js`. S'arrêter à la douzaine de règles couvrant
70 % du volume aurait laissé `.top-title` à 12 px à côté de `.top-badge` à
9,3 px **dans la même tuile** : l'incohérence visuelle aurait été pire que le
défaut d'origine.

**3. Les tests mesurent le style calculé, jamais la feuille de style.**

`.mat-version` était déclarée à `0.5rem` dans `mat.css` **et** à `0.52rem` en
inline dans `index.html` — l'inline gagnant. Un test qui lirait le CSS aurait
conclu à tort. C'est l'application directe de la règle 7 du `CLAUDE.md` : quand
un effet est produit d'un côté et habillé de l'autre, seul `getComputedStyle`
dit la vérité.

**4. `body{font-size:1rem}` au lieu de `16px`.**

`html.font-large` / `html.font-xl` ne redéfinissent que `html`. Tant que `body`
portait `font-size:16px`, il restait figé dans les trois modes (vérifié :
racine 22 px, body 16 px) et **tout élément sans `font-size` explicite héritait
de 16 px sans jamais échelonner**. L'impact était nul — ce code déclare une
taille partout — mais le premier texte ajouté sans `font-size` aurait été
insensible au réglage d'accessibilité, en silence.

**5. Géométrie des pastilles portée à 20 px.**

`min-width:18px; height:18px; line-height:18px` avec un texte à 12 px ne tient
plus. Un test vérifie que le contenu ne déborde pas du rond.

## Vérification

Mesure avant / après sur le rendu, même page, même appareil simulé :

| | avant | après |
|---|---|---|
| Texte lisible (≥ 12 px) | **30,0 %** | **100,0 %** |
| Caractères sous 12 px | 1 044 | **0** |
| Débordement horizontal | non | non |
| Conteneurs qui rognent | aucun | aucun |
| Hauteur de page | 1 765 px | 1 875 px (+6,2 %) |
| Tuiles du header | 81/81/82/82 | 106/106/104/104 |

Suite complète : 119 passés, 17 sautés, 0 échec.

## Conséquences

- Les tuiles du header grandissent de ~30 % en hauteur. C'est le changement
  visuel principal, et il est assumé : `.top-card` a un `min-height:72px` avec
  du mou, aucun contenu n'est rogné.
- `.plui-banner` présente un `scrollWidth` supérieur de 30 px à son
  `clientWidth`. **Ce comportement préexistait** (mesuré identique sur le code
  d'origine), il est clippé par `overflow:hidden` et la pastille agrandie n'est
  pas rognée (bord droit 385 px contre 399 px pour la bannière). Non traité ici.
- Les tests typographiques sont **bornés à l'écran mobile/PWA** : au-delà de
  1024 px, `css/mat-desktop.css` prend la main et `.header` est masqué.

## Ce qui reste à faire

- **`css/mat-desktop.css`** : 31 déclarations sous 12 px (`.d-nav-sub`,
  `.d-actu-date`, `.d-footer-links`…). Lot dédié, avec sa propre vérification :
  la topbar aligne 10 boutons sur une seule ligne, le débordement horizontal y
  est le risque principal.
- **Overlays de `css/mat.css`** : météo détaillée, agenda, trombinoscope, idées,
  actualités restent en partie sous 12 px. Non mesurés par Lighthouse (contenu
  paresseux) mais lus par les habitants.
- **`admin.html`** (109 déclarations) : outil de la mairie, pas l'app des
  habitants. Priorité basse, audience différente.
- **Remontée du contenu réellement lu vers 14–16 px** : à décider après retour
  sur téléphones réels, zone par zone, et non par passe globale.
