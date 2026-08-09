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

**6. `line-height` explicite là où il manquait — le vrai coupable de l'enflure.**

Premier jet du plancher : les tuiles du header passaient de 81 à **106 px**
(+30 %), assez pour que le résultat soit jugé « trop gros ». Le réflexe aurait
été de redescendre sous 12 px. La cause était ailleurs.

`.top-title`, `.sec` et `.ct-sub` **ne déclaraient aucun `line-height`** : ils
héritaient donc du `1.5` de la racine, soit **18 px de hauteur de ligne pour
12 px de texte** — alors que leurs voisins immédiats dans le même composant
(`.top-main` à 1.15, `.ct-label` à 1.2) étaient serrés. À 9,9 px le surplus
passait inaperçu ; à 12 px il devenait la moitié de l'enflure.

Poser `line-height:1.2` / `1.25` sur ces trois règles, plus un rognage mineur
des marges (`.top-card` 8→7 px, `.sec` 12/8→9/6 px, `.top-badge` 2→1 px),
ramène les tuiles à **95–96 px** et la page à **1 795 px — soit +1,7 % contre
+6,2 %**, sans toucher à une seule taille de police.

Leçon : quand une valeur de `font-size` augmente, vérifier d'abord si le
`line-height` est hérité. Un `1.5` global appliqué à des micro-libellés coûte
plus cher que la police elle-même.

**7. Mesurer aux largeurs étroites, pas seulement sur l'appareil par défaut.**

Toute la vérification initiale a été faite à **412 px** (Pixel 7, appareil par
défaut de Playwright). À cette largeur, **0 sous-titre sur 15** passe à la
ligne — la mise en page paraissait intacte. Sur un téléphone réel à 360 px,
**10 sur 15** débordaient. La vérification était aveugle au cas le plus courant.

Correction : marges horizontales de `.card` 14 → 10 px et gap icône/texte
11 → 9 px. À 360 px, deux cartes par ligne ne laissent que ~130 px de texte
utile ; ces 6 px récupérés ramènent les sous-titres coupés de 10 à **5 sur 15**.
Aucune taille de police ni la taille de l'icône ne sont touchées.

Comparaison honnête contre `main`, à 360 px :

| | avant le lot | après |
|---|---|---|
| Libellés sur 2 lignes | 6/17 | **6/17 — identique** |
| Sous-titres sur 2 lignes | 2/15 | 5/15 |
| Hauteur de page | 1 838 px | 1 862 px (+1,3 %) |
| Cartes | 72/73/75/89 | 72/75/76/91 |

Les libellés qui se coupent (« Sondage citoyen », « Vos photos », « Contacter
vos élus », « Signaler un bug », « Radio Mézières ») **se coupaient déjà
avant** : `.ct-label` n'a pas été modifié. C'est un défaut de densité
préexistant du gabarit à deux colonnes, indépendant de ce lot.

L'interlettrage a été testé (`.08em` → `0`) : **aucun effet** sur le retour à
la ligne de « Prochaine manifestation », qui passe de 1 à 2 lignes à 12 px quoi
qu'on fasse. Comme les tuiles sont en grille, cette seule tuile impose sa
hauteur aux quatre. Non résolu — le seul levier restant serait de raccourcir le
libellé, hors périmètre.

## Vérification

Mesure avant / après sur le rendu, même page, même appareil simulé :

| | avant | après |
|---|---|---|
| Texte lisible (≥ 12 px) | **30,0 %** | **100,0 %** |
| Caractères sous 12 px | 1 044 | **0** |
| Débordement horizontal | non | non |
| Conteneurs qui rognent | aucun | aucun |
| Hauteur de page | 1 765 px | **1 795 px (+1,7 %)** |
| Tuiles du header | 81/81/82/82 | **96/96/95/95** |
| Cartes d'accueil | 72–75 px | 72–76 px |

(Sans la correction des `line-height` du point 6 : 1 875 px et 106/106/104/104.)

Suite complète : 119 passés, 17 sautés, 0 échec.

## Conséquences

- Les tuiles du header grandissent de ~17 % en hauteur (81 → 95 px). C'est le
  changement visuel principal, et il est assumé : `.top-card` a un
  `min-height:72px` avec du mou, aucun contenu n'est rogné. La page entière ne
  s'allonge que de 1,7 %.
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
