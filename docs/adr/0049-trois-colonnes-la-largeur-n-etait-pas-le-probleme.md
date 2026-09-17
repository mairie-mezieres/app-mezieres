# ADR-0049 — Trois colonnes de même largeur, et pourtant déséquilibrées : ce qu'on voit d'une colonne, c'est son contenu

- **Date** : 17 septembre 2026
- **Statut** : accepté (v4.122)
- **Portée** : `index.html` (`.d-main-grid`), `css/mat-desktop.css`, `js/mat-desktop.js`,
  `tests/e2e/bureau-equilibre.spec.js`

## Contexte

La version ordinateur (≥ 1024 px) affiche l'accueil en trois colonnes thématiques,
chacune introduite par un `.d-col-titre`. La grille est déclarée
`grid-template-columns:1fr 1fr 1fr` depuis l'origine : les trois colonnes ont donc
**exactement** la même largeur — 432 px chacune sur un écran de 1440 px, mesuré au
rectangle rendu.

Le 17 septembre 2026, le porteur du projet ouvre l'application sur son ordinateur :
« ça ne va pas du tout, il faut que l'affichage soit équilibré avec les trois colonnes
de même dimension ». Le reproche porte sur la largeur ; le défaut n'est pas là.

Mesure du rendu, avec l'agenda et les actualités du jour :

| Colonne | Contenu |
|---|---|
| `.d-col-left` — la mairie au quotidien | **694 px** |
| `.d-col-center` — la vie de la commune | **1 338 px** |
| `.d-col-right` — vous aider | **761 px** |

Les colonnes n'ont pas de fond : **ce qu'un habitant voit d'une colonne, c'est la
hauteur de son contenu.** Deux d'entre elles s'arrêtaient donc à mi-page, laissant
600 px de blanc sous elles — ce qui se lit comme une page cassée, pas comme un choix
de mise en page. Et les actualités, qu'on vient chercher en premier, se trouvaient
sous une carte de 690 px, donc sous la ligne de flottaison.

## Ce qui a produit l'écart

Deux causes, et la seconde est la vraie.

1. **La répartition des cartes.** La colonne du centre portait à elle seule le prochain
   évènement, les actualités et les photos ; la colonne de gauche trois petites cartes.
   Les cartes étaient bien placées par thème — mais le thème ne dit rien du poids.

2. ⛔ **Une carte dont le texte vient d'ailleurs n'était plafonnée par rien.** La carte
   « Prochain évènement » rend la description de l'agenda public telle quelle
   (`nl2br`). Le concert du 27 septembre 2026 y était décrit en six paragraphes : la
   carte pesait **690 px**, à elle seule plus que toute la colonne de gauche. Personne
   dans ce dépôt ne maîtrise cette longueur — elle est saisie dans l'agenda de la
   mairie, et elle change à chaque évènement. Une mise en page équilibrée « à la main »
   sur l'évènement du jour se déséquilibre donc toute seule au suivant.

C'est la même leçon que les actualités à 5 articles (583 px, corrigées à 3) et que la
galerie en 2×2 (450 px, corrigée en une rangée de 4) : **les cartes du bureau sont des
aperçus.** Sauf que ces deux-là ont été corrigées au coup par coup, sans rien qui
empêche la troisième occurrence.

## Décision

1. **Plafonner ce qui vient de l'extérieur.** `.d-featured-desc` est limité à trois
   lignes (`-webkit-line-clamp:3`). Le texte complet reste à un clic, dans l'agenda.
2. **Répartir les cartes par thème ET par poids**, avec trois intitulés qui restent
   vrais :
   - `.d-col-left` — **🏛️ La mairie au quotidien** : horaires, bus Rémi, collectes,
     « Mon village en 3D » (le zonage du PLU, c'est de la mairie) — 797 px ;
   - `.d-col-center` — **🤝 Vous aider & participer** : « Je viens d'emménager », MEL,
     signalement rapide, contacter vos élus, « Vos photos » (des photos envoyées par
     les habitants : c'est de la participation) — 884 px ;
   - `.d-col-right` — **📰 Actualités & agenda** : les actualités **en tête**, le
     prochain évènement juste dessous — 938 px.
3. **Mesurer, et refuser la régression.** `tests/e2e/bureau-equilibre.spec.js` sert un
   agenda et des actualités simulés — dont une description de six paragraphes — puis
   mesure les trois colonnes et échoue au-delà de **25 %** d'écart. Écart actuel : 15 %.

## Conséquences

- Toute carte ajoutée ou déplacée dans `.d-main-grid` se **pèse**. Le test le rappelle,
  et son message nomme les trois hauteurs.
- ⚠️ **Le test devait pouvoir rougir.** Sans le plafond, il retrouve 1 106 px à droite
  contre 797 à gauche et échoue ; c'est vérifié, plafond retiré, avant de le déclarer
  utile. Un contrôle qui ne mesure rien ne rougit pas, il verdit (ADR-0030).
- ⚠️ **On ne mesure pas `height` de la colonne** : la grille étire les trois items à la
  même hauteur (`stretch`), donc cette valeur est identique pour les trois et ne mesure
  rien. On mesure le bas de la dernière carte visible, relativement au haut de la
  colonne.
- ⚠️ **Et on sert des images.** Une vignette absente est masquée par son `onerror` et la
  carte rétrécit : le test fournit un PNG 1×1 pour chaque image, dont les dimensions
  rendues sont de toute façon imposées par le CSS.
- Trois blocs de style **en ligne** ont été déplacés en CSS au passage
  (`.d-featured-desc`, `.d-featured-plus`, `.d-actu-excerpt`, `.d-suivi-btn`) : en ligne,
  leurs couleurs étaient hors de portée du thème sombre — le `#666` de l'extrait d'actu
  y restait gris moyen sur fond ardoise.
- `tests/e2e/carte3d.spec.js` n'exige plus la colonne de droite pour « Mon village
  en 3D », mais la présence de la carte dans `.d-main-grid` : la colonne peut changer,
  le point d'entrée doit exister.

## Alternatives écartées

- **Étirer les colonnes à la même hauteur** (fond blanc + `height:100%`) : ça déplace le
  blanc dans une carte au lieu de le laisser sous la colonne. Le vide reste, encadré.
- **Une disposition en maçonnerie** (`grid-template-rows: masonry`) : pas disponible dans
  les navigateurs qu'utilisent les habitants, et elle casserait la lecture par thème —
  une carte irait où il y a de la place, pas où elle a du sens.
- **Tronquer la description dans le JS** (`substring`) : une coupe en nombre de
  caractères ne connaît pas la largeur du rendu et couperait au milieu d'un mot. Le
  plafond appartient au CSS, qui sait combien de lignes tiennent.
