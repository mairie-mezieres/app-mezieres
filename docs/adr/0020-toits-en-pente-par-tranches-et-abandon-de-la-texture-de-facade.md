# ADR-0020 — Des toits en pente par tranches, et l'abandon de la texture de façade

- **Date** : 10 août 2026
- **Statut** : Accepté
- **Remplace** : la partie « façades texturées » de la v4.69

## Contexte

La v4.69 avait donné aux bâtiments de la carte 3D une **casquette plate** colorée en
guise de toit, et une **trame de fenêtres** sur les murs des maisons. Les deux ont été
mises à l'épreuve sur un vrai téléphone. Verdict du porteur :

> « pour les textures c'est pas mal mais dès qu'on zoome ça ajoute des carrés, on dirait
> un immeuble une simple maison. on ne pouvait pas faire des toits en pente plutôt que
> plat pour les maisons ! »

Les deux remarques portent, et chacune a une cause technique précise.

### 1. La texture ne peut pas être ancrée au monde réel

`fill-extrusion-pattern` répète le motif en **pixels**, pas en mètres. Le nombre de
rangées de fenêtres sur un mur ne dépend donc pas de la hauteur du bâtiment mais du
**niveau de zoom** : plus on approche, plus il y a d'étages. Mesuré au zoom 18,6, une
maison de 6 m affiche cinq à six rangées — un immeuble.

MapLibre n'expose aucun réglage pour ancrer un motif sur la taille réelle de la
géométrie. Ce n'est pas un défaut de paramétrage : **il n'y a rien à régler**.

### 2. Une casquette plate reste une boîte

MapLibre ne sait extruder que des **prismes à sommet plat** : il n'existe pas de
propriété de pente. C'était la raison invoquée en v4.69 pour s'en tenir à une casquette.
Elle était incomplète — la contrainte porte sur *un* prisme, pas sur ce qu'on peut faire
avec plusieurs.

## Décision

### 1. La texture de façade est retirée

Sans ancrage métrique, elle produit une information visuelle **fausse** : elle suggère un
nombre d'étages qui n'existe pas, et qui change quand on zoome. Un rendu dégradé est
acceptable, un rendu faux ne l'est pas — c'est la règle posée en ADR-0018 pour les
données, elle vaut aussi pour l'habillage.

Deux bénéfices collatéraux :

- les maisons **retrouvent leur teinte** selon la hauteur (`fill-extrusion-pattern`
  remplaçait `fill-extrusion-color`, donc l'habitat était le seul type non coloré) ;
- **le clic sur une maison refonctionne**. `queryRenderedFeatures` n'interroge que la
  couche `bati` ; en v4.69 l'habitat était passé dans une couche `bati-tex` séparée, si
  bien que cliquer sur une maison — le cas le plus courant — n'ouvrait plus sa fiche.
  Personne ne l'avait vu : le test de clic n'existait pas, et la maquette de rendu ne
  clique pas.

### 2. Le toit est une pile de tranches

Un toit à deux pentes est approché par des **tranches horizontales de plus en plus
étroites**, empilées entre le haut des murs et le faîtage :

- le **faîtage** suit le grand axe de l'emprise — la direction qui minimise l'aire de la
  boîte englobante orientée ;
- chaque tranche est obtenue en **découpant l'emprise réelle** par deux demi-plans
  parallèles au faîtage (Sutherland–Hodgman), qui se rapprochent à chaque étage ;
- la hauteur visée d'une tranche est de **30 cm**, entre 4 et 12 tranches : une annexe
  n'a pas besoin d'autant de marches qu'un clocher.

Le découpage porte sur l'emprise réelle et **jamais sur son rectangle englobant** : un
toit ne peut donc pas déborder au-dessus de la cour d'une maison en L. Un test le vérifie
sur un bâtiment en L, et il échoue bien si l'on repasse au rectangle.

De près, les arêtes des tranches se lisent comme des **rangées de tuiles** — un effet
non recherché, mais heureux, et lui **exprimé en mètres** : contrairement au motif de
fenêtres, il ne se démultiplie pas quand on zoome.

### 3. Toutes les toitures ne sont pas en pente

- **L'industriel garde une casquette plate** : c'est la réalité des bâtiments d'activité.
- **Le bâti hors commune aussi** : il est volontairement en arrière-plan, et cela évite
  ≈ 32 000 polygones inutiles.

Les deux couches portent des **filtres exactement complémentaires** — aucun bâtiment ne
reçoit les deux, sans quoi les volumes se superposeraient.

## Ce qui est inventé, et assumé comme tel

**La BD TOPO ne dit rien des toitures** : ni forme, ni pente, ni orientation du faîtage.
Poser un faîtage le long du grand axe est **une convention**, juste pour la plupart des
maisons de village, fausse pour certaines. Comme la couleur des zones du PLU, c'est un
**procédé de lisibilité** : RG-17.15 interdit explicitement de le présenter comme une
information sur la toiture d'une construction donnée.

La frontière avec ADR-0018 (« aucune donnée inventée ») tient à ceci : on n'invente
aucun **bâtiment**, aucune **hauteur**, aucune **zone**. On habille des volumes dont
l'emprise et la hauteur sont mesurées.

## Alternatives écartées

- **Une couche `custom` WebGL avec de vraies pentes lisses.** MapLibre le permet, et le
  résultat serait géométriquement exact. Il faudrait écrire soi-même la projection, la
  lumière et le test de profondeur, sans bénéficier de `setLight` ni du tri des
  extrusions. Beaucoup de code non testable hors connexion, pour un gain que les tranches
  de 30 cm rendent marginal à l'écran.
- **De la photogrammétrie (3D Tiles).** Payante, hébergée hors de France, à rebours de la
  souveraineté revendiquée par la commune, et catastrophique pour l'éco-index (déjà 49,
  grade D).
- **Agrandir le motif de fenêtres.** Ne corrige rien : le problème n'est pas la taille du
  motif mais le fait qu'il soit exprimé en pixels. À un zoom donné il paraîtrait juste,
  et faux à tous les autres.
- **Limiter la texture à une plage de zoom.** Un rendu qui se contredit selon la distance
  serait plus déroutant qu'une façade unie.

## Conséquences

**Positives** : le village se lit enfin comme un village ; le clic sur une maison
refonctionne ; les maisons retrouvent leur teinte selon la hauteur ; le grain de
« tuiles » est stable en mètres.

**Négatives** : ≈ 8 000 polygones de toiture pour la commune (≈ 23 ms de calcul, mesurés
sur 900 bâtiments). Le coût de rendu double dans un test **logiciel** — plancher très
pessimiste, un GPU de téléphone traitant cette quantité sans peine. Si la carte devait
ramer sur un appareil modeste, le levier est le nombre de tranches
(`C3D_PENTE_TRANCHE`), pas la suppression de la fonctionnalité.

**À surveiller** : les emprises très concaves. Le découpage reste dans l'emprise, mais un
bâtiment en U reçoit un faîtage unique traversant, là où la réalité comporte plusieurs
pans. Aucune donnée ne permet de faire mieux.
