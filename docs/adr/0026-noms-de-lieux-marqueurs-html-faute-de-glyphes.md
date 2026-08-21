# ADR-0026 — Écrire un nom sur la carte 3D : des marqueurs HTML, faute de glyphes

- **Date** : 21 août 2026
- **Statut** : Accepté
- **Complète** : ADR-0018 (aucune donnée inventée), ADR-0021 (le territoire des 25 communes)

## Contexte

La question posée était : « dans le PLU 3D, est-ce qu'on peut rajouter le nom des quartiers
ou des lieux-dits ? »

Elle recouvre deux besoins que rien n'oblige à traiter ensemble, et un constat.

**Le constat d'abord** : le **Plan IGN** porte déjà les lieux-dits, gravés dans ses tuiles.
Il est chargé depuis toujours dans le style de la carte (`l-plan`) et le bouton
« 🛰️ Vue aérienne / Plan » le fait apparaître. Un habitant qui bascule sur le plan voit donc
déjà Manthelon, Rolland, le Bréau. Ce qui manque, ce sont des noms **sur la photo aérienne**
et **dans la vue territoire** — pas des noms en général. La règle d'or du projet s'applique
ici comme ailleurs : vérifier l'existant avant de construire.

**Le trou réel** est ailleurs : la vue « Le territoire » — celle que le maire porte au titre
du PLUi-H-D — affichait **vingt-cinq contours anonymes**. Le seul endroit qui les nommait
était un panneau dépliant, c'est-à-dire pas là où se pose le regard.

## Décision

### 1. Les noms sont des éléments HTML, pas une couche `symbol`

Le style construit par `_c3dCreerCarte` **n'a pas d'URL `glyphs`**. Sans glyphes, une couche
`symbol` portant un `text-field` ne rend *rien* : pas d'erreur, pas de message en console,
du vide. C'est la famille de panne d'ADR-0015 (l'accolade orpheline) et d'ADR-0019 (le
fichier jamais rafraîchi) — un mécanisme qui échoue en laissant tous les voyants au vert.

Vendoriser un jeu de glyphes coûterait quelques centaines de kilo-octets à une bibliothèque
qui pèse déjà 1 Mo, sur une page dont ADR-0018 refuse déjà le précachage pour cette raison
exacte. Un marqueur HTML ne pèse rien, hérite de la typographie de l'application — donc du
plancher de 12 px d'ADR-0017 — et le `c3d-pin` de « Où suis-je » fait déjà exactement cela.

**Ce que ce choix coûte, et qu'il faut tenir à la main :**

| Ce que `symbol` ferait tout seul | Ce qu'il faut écrire |
|---|---|
| Décaler et masquer les libellés qui se chevauchent | `_c3dTerrRangerEtiquettes` |
| Disparaître avec `setLayoutProperty` | masquage explicite au retour au village |
| Ne pas intercepter les clics | `pointer-events:none` en CSS |

Chacune de ces trois lignes est un test. La troisième compte particulièrement : une
étiquette qui capte le clic empêcherait de nommer la commune, et « toute commune répond au
clic » est une règle **acquise au prix d'une version** (RG-17.21).

### 2. Un nom manquant vaut mieux qu'une bouillie de noms

Sur un territoire large de 30 km, vingt-cinq libellés se marchent dessus. L'anticollision
retient, dans l'ordre — Mézières d'abord, puis les communes les plus étendues, celles où le
nom a le plus de place — ceux dont le rectangle n'en touche aucun déjà retenu. Les autres
sont masqués.

C'est le même arbitrage que RG-17.25 : ce qui doit être vu doit être **lisible**. Deux noms
superposés n'en donnent pas deux, ils n'en donnent aucun.

### 3. Le nom écrit est celui que le service a renvoyé

Prolongement direct de RG-17.20. Les étiquettes sont construites depuis `_c3dTerr`,
c'est-à-dire depuis ce que `_c3dApparier` a retenu de la réponse du Géoportail — jamais
depuis les 25 noms de `C3D_CCTVL`. Une commune que le service ne place pas **reste sans nom
sur la carte**, et signalée dans le panneau.

Un contour sans surface n'obtient pas de nom non plus : il n'y a aucun endroit défendable où
le poser, et un nom collé au hasard sur la carte serait précisément la faute que tout ce
dossier cherche à éviter depuis le 45203/45204.

## Ce que le test a trouvé

La première version de `_c3dCentreEtiquette` se terminait par un repli : si l'aire de
l'anneau est nulle, prendre la moyenne des sommets. Le test écrit pour l'exercer a échoué —
la fonction renvoyait `null`.

Elle avait raison. Un anneau d'aire nulle n'est **jamais retenu** par la boucle qui précède,
qui cherche le plus grand polygone : le repli était **inatteignable**. Du code mort, écrit
par prudence, que rien n'exécutait jamais.

Il a été supprimé et le contrat rendu explicite — pas de surface, pas de nom — plutôt que
laissé à dormir. C'est la leçon de RG-17.24 ter appliquée à l'envers : là-bas un motif
d'échec était écrit et jamais lu ; ici une branche était écrite et jamais prise. Dans les
deux cas, du code qui rassure sans rien garantir.

## Ce qui n'est PAS fait, et pourquoi

**Les lieux-dits du village n'ont pas d'étiquette.** L'étape suivante demande une source, et
aucune ne peut être branchée de mémoire :

- **BD TOPO** (`data.geopf.fr`) est la bonne source, et le pipeline existe déjà tel quel
  dans `_c3dBatiIGN` — trois formulations, journal `_c3dNoter`, panneau de diagnostic. Mais
  les noms de couches doivent être **confirmés sur `GetCapabilities` depuis une machine
  connectée** : `data.geopf.fr` est injoignable depuis l'environnement de développement,
  comme apicarto (ADR-0021). Écrire un `TYPENAMES` de mémoire referait le 45203/45204.
- **Le cadastre** donne des noms de *sections*, souvent archaïques et rarement ceux que les
  habitants emploient, sans point où les poser — seulement des polygones.
- **OpenStreetMap** couvre inégalement une commune de 850 habitants.

**Les « quartiers », eux, ne peuvent venir que de la mairie.** Il n'existe aucun découpage
officiel à cette échelle : l'IRIS de l'INSEE ne descend pas sous 10 000 habitants, et
Mézières est non irisée — un IRIS pour toute la commune.

⚠️ Et une liste validée par la mairie **existe déjà dans le dépôt**, sans coordonnées : le
champ `hameau` du trombinoscope (`js/mat-trombi.js` — Le Bourg, Manthelon, Rolland, Le
Bréau, Le Buisson, La Grange), repris dans `data/saviez-vous.json`. Si un
`data/lieux-dits.json` voit le jour, il doit devenir la **source unique** et le
trombinoscope pointer dessus. Le dépôt a déjà payé deux fois la double source divergente
(les associations, la fibre) ; une troisième serait de la négligence.

## Et l'occultation par le bâti ?

La question posée était : un libellé de lieu-dit ne risque-t-il pas d'être caché par une
maison, faut-il le surélever de 10 à 20 m au bout d'un trait ?

**Le risque est l'inverse.** Un marqueur HTML vit dans un conteneur *au-dessus* du canvas
WebGL : il n'y a aucun test de profondeur contre les `fill-extrusion`, donc un libellé n'est
**jamais** masqué par un bâtiment. Le danger réel est symétrique — le nom d'un hameau situé
loin derrière flotte par-dessus les maisons du premier plan et **paraît les nommer**. Ce
n'est pas une donnée fausse, c'est un **rattachement** faux, et ADR-0018 ne fait pas la
différence : un affichage faux n'est pas acceptable.

La surélévation avec un trait reste donc la bonne réponse, mais pour l'autre raison : le
trait dit **à quel point du sol le nom appartient**. Surélever sans trait serait pire que ne
rien faire.

La mécanique, quand l'étape village viendra : cette version de MapLibre n'expose pas
d'altitude sur un `Marker`, il faut donc convertir des mètres en pixels —
`mpp = 40075016,686 × cos(lat) / (512 × 2^zoom)`, puis
`décalage = (h / mpp) × sin(pitch)`, recalculé sur `move`. `sin` et non `cos` : à pitch nul,
vue à la verticale, une hauteur ne se projette pas. Douze à quatorze mètres suffisent — le
bâti de village tourne autour de 6 m de murs et 2,6 m de toit (`C3D_TOITS`). Et comme le
toit en pente d'ADR-0020, **ce mât est un procédé de lisibilité, jamais une mesure** : il ne
doit à aucun moment être présenté comme la hauteur de quoi que ce soit.

## Alternatives écartées

- **Vendoriser des glyphes PBF.** Anticollision native et code plus court, contre quelques
  centaines de kilo-octets sur une page déjà lourde et un éco-index à 49. Le jour où la
  carte porterait des centaines de libellés, la balance changerait.
- **Basculer d'office sur le Plan IGN en vue territoire.** Les noms seraient venus gratis
  avec les tuiles — mais RG-17.23 a déjà tranché : le fond appartient à l'habitant, et c'est
  la photo aérienne qu'on préfère.
- **Un mât en `fill-extrusion`.** Géométriquement exact et correctement occulté, mais le
  texte resterait en HTML : les deux pourraient se désaligner, et cela se verrait.
- **Poser le nom au centre du rectangle englobant.** Une commune en croissant recevrait son
  nom chez sa voisine.

## Conséquences

**Positives** : la vue territoire se lit sans déplier de panneau ; aucun octet ajouté au
chargement ; la mécanique d'étiquette est en place et testée pour l'étape des lieux-dits.

**Négatives** : trois comportements que `symbol` offrirait gratuitement sont désormais du
code à maintenir. L'anticollision est recalculée à `moveend`, donc les noms se réorganisent
à la fin du geste et non pendant.

**À surveiller** : si un jour la carte porte beaucoup plus de libellés — les lieux-dits en
vue village, par exemple — l'anticollision en O(n²) et les mesures de rectangles deviendront
le point de bascule vers les glyphes vendorisés. Le seuil n'est pas atteint à 25.
