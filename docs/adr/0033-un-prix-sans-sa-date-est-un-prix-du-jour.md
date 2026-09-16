# ADR-0033 — Un prix sans sa date se lit comme un prix du jour

- **Statut** : accepté
- **Date** : 31 août 2026
- **Version** : v4.101
- **Concerne** : `js/mat-widgets.js` (bandeau « Carburant » de l'accueil), `css/mat.css`
  (`.fuel-station-name`), `chatbot-mairie-mezieres/routes/carburant.js`

## Contexte

Le bandeau « Carburant » de l'accueil affichait deux lignes : « Intermarché Cléry », puis
les prix du SP95 et du gazole. Ces prix viennent du **relevé national**
(`data.economie.gouv.fr`), que chaque station alimente **quand elle le veut** : celui de
l'Intermarché de Cléry avait plusieurs jours de retard.

Rien ne le disait. Un prix de la semaine passée s'affichait exactement comme un prix du
matin même — et un habitant qui se déplace sur la foi de ce chiffre découvre l'écart à la
pompe. L'écran détaillé, lui, portait déjà « Mis à jour le … » pour les cinq stations :
**l'information existait, elle ne remontait pas là où la décision se prend.**

## Décision

1. **La date du relevé est écrite dans le bandeau**, sur la ligne du nom :
   « Intermarché Cléry 24/08 ». Pas de troisième ligne — le bandeau partage sa rangée avec
   celui du bus Rémi, il n'a pas la hauteur.
2. **La station affichée n'est plus figée.** Cléry reste la station par défaut (c'est la
   plus proche). Mais si son relevé n'est pas le plus récent connu, on affiche la
   **moins chère parmi les stations au relevé le plus récent**, avec son nom et sa date.
   Un prix frais et comparé vaut mieux qu'un prix familier et périmé ; le nom affiché
   empêche toute confusion, et l'écran détaillé garde les cinq stations.
3. **Le backend expose `majISO`**, l'horodatage brut, à côté du `maj` d'affichage.

## Conséquences

- La clé Redis du cache carburant passe à `mat:carburant:v8`. **Changer la forme du payload
  sans changer la clé** aurait servi pendant une heure des relevés sans `majISO` — donc un
  bandeau qui retombe sur son repli.
- Le front sait **encore** dater un payload sans `majISO` : `maj` (« JJ/MM HH:MM ») est
  rapporté à l'année courante, avec un recul d'un an si la date tombe dans le futur (le
  « 31/12 » lu le 2 janvier). Ce repli couvre l'heure de bascule ; il ne dispense pas
  `majISO` d'exister, une chaîne sans année n'étant pas comparable d'une station à l'autre.

## Le piège : l'ellipse mange exactement ce qu'on vient d'ajouter

La ligne du nom est en `white-space:nowrap` + `text-overflow:ellipsis`. Sur un écran de
360 px, « Intermarché Cléry 31/08 » dépasse de 9 px — et l'ellipse **rogne la fin**,
c'est-à-dire la date. Le bandeau aurait affiché « Intermarché Clér… » : le correctif
invisible, et un contrôle sur le seul JS aurait été vert (règle 7 du `CLAUDE.md`).

D'où deux `<span>` dans une ligne en `flex` : le nom porte l'ellipse et **cède la place**,
la date est en `flex-shrink:0` et ne se tronque jamais.
`tests/e2e/carburant-fraicheur.spec.js` mesure `scrollWidth` contre `clientWidth` de la
date à 320 px de large — la mesure du rendu, pas l'état interne.

## Ce qu'on n'a pas fait

- **Une troisième ligne « Mis à jour le … »** : le bandeau n'en a pas la place, et la règle
  `.fuel-maj` qui l'aurait habillée (blanc à 40 %) n'aurait pas passé le critère RGAA 3.2
  sur le fond vert. Elle dormait, inutilisée, dans `css/mat.css` ; elle est supprimée.
- **Masquer un prix jugé trop vieux** : un prix daté vaut mieux que pas de prix. C'est
  l'habitant qui juge si « 24/08 » lui suffit.
- **Un seuil d'ancienneté** (« bascule au-delà de N jours ») : un seuil est un réglage de
  plus à défendre. « Le relevé le plus récent » se démontre à partir des données seules.

---

## Suite (v4.116) — la liste détaillée disait le contraire du bandeau

La décision ci-dessus n'avait traité que le bandeau. L'écran détaillé, lui, gardait
ses cinq stations rangées **par proximité** et se contentait d'un « Mis à jour le … »
en gris pâle sous chaque prix.

Deux conséquences, invisibles tant qu'on ne regarde qu'un écran à la fois :

1. **La liste contredisait le bandeau.** Celui-ci affiche la moins chère parmi les
   relevés les plus récents ; l'habitant qui appuie dessus pour « voir les cinq »
   retrouvait cette station en 3ᵉ ou 4ᵉ position, sous des prix plus bas… mais plus
   vieux. La règle de choix n'était énoncée nulle part, donc l'écran détaillé se
   lisait comme un démenti.
2. **« Mis à jour le 12/09 » ne se compare pas tout seul.** Lire cinq dates et les
   rapporter à la date du jour est un calcul qu'on demandait à chaque habitant, sur
   un écran qu'on consulte en marchant vers sa voiture.

**Décision.** Le panneau porte le même ordre que le bandeau — relevé le plus récent
d'abord, prix croissant à date égale — et chaque carte annonce l'âge de son relevé
en toutes lettres, avec une teinte de fond qui grise à mesure que le prix vieillit
(normal le jour même, gris clair à 1-2 jours, gris plus soutenu au-delà).

**Ce qui n'a pas changé :** aucun prix n'est masqué, aucun seuil n'écarte une
station. C'est toujours l'habitant qui juge si « il y a 4 jours » lui suffit — la
v4.116 lui évite seulement de faire la soustraction.

### Trois pièges de cette suite

- **Le seuil n'est pas une durée.** L'âge se compte en jours de **calendrier**
  (`matDaysUntil`, ADR-0031) : un relevé d'hier 23 h divisé par 86 400 000 vaut
  0,4 — donc « relevé du jour », pour un prix de la veille.
- **La couleur ne porte jamais l'information.** Le texte dit l'âge ; la teinte le
  rappelle. Sans quoi le RGAA 1.1 tombe, et avec lui les habitants qui ne
  distinguent pas deux gris voisins.
- **Un gris de fond est un fond de texte.** Les premiers essais (#d9d9d9) faisaient
  chuter le vert des prix à 4,52:1, le seuil au centième près. Les jetons
  `--fuel-*` de `css/mat.css` sont calculés pour que la pire paire de chaque thème
  reste au-dessus de 4,5:1 — et le thème sombre les inverse, un gris clair y étant
  un éclairage, pas un estompage. C'est aussi ce qui a révélé que les prix de ce
  panneau, écrits en `var(--leaf)` **en style inline**, y étaient noir sur noir
  depuis toujours : une couleur écrite dans le JS est hors de portée des thèmes.
