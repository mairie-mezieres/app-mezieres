# ADR-0021 — Le territoire des 25 communes, et pourquoi aucun code INSEE n'est écrit en dur

- **Date** : 10 août 2026
- **Statut** : Accepté

## Contexte

Le maire de Mézières porte le PLUi-H-D comme vice-président de la communauté de communes
des Terres du Val de Loire. La carte 3D montrait la commune seule ; il fallait montrer le
**territoire** dans lequel elle s'inscrit — 25 communes.

Trois faits contraignent la solution, et aucun n'est négociable.

### 1. Le PLUi-H-D n'existe pas encore

Il est en cours d'élaboration : le Géoportail de l'Urbanisme ne sert que les **25 PLU
communaux en vigueur**, chacun avec sa propre nomenclature de zones. Montrer un document
unique serait faux. L'écran dit donc explicitement que ce sont 25 plans distincts.

### 2. Les codes de zones ne sont pas comparables d'une commune à l'autre

« Ua » à Mézières, « UB » ailleurs, « 1AUb » chez un troisième. La palette de
`data/plu-data.json` n'a de sens que pour Mézières. Seules les **quatre familles
normalisées** du Géoportail — U, AU, A, N — sont communes à tous les PLU de France.

### 3. Les règles de construction ne valent que pour Mézières

`data/plu-data.json` décrit le PLU communal jusqu'au « Clos de Manthelon » et au recul de
l'A71. Les appliquer à Baule ou à Tavers produirait une réponse d'apparence officielle et
entièrement fausse, sur un sujet — le droit de construire — où l'erreur coûte cher.

## Décision

### 1. Aucun code INSEE n'est écrit dans le code

**Seuls les 25 noms**, fournis par la mairie, figurent dans `C3D_CCTVL`. Les codes INSEE,
les contours, les partitions et le statut RNU viennent tous de
`apicarto/gpu/municipality?geom=`, en un seul appel sur une fenêtre volontairement large.
`_c3dApparier` retient les communes dont le **nom renvoyé par le service** correspond à
l'un des 25, à la casse et aux accents près.

C'est la leçon du 45203/45204 poussée à sa conclusion. Une seule fois, un code écrit de
mémoire a drapé le PLU de Meung-sur-Loire sur Mézières, et **rien ne le signalait** — il a
fallu que le porteur le voie sur son téléphone. Écrire 25 codes de mémoire, c'était offrir
25 occasions de la même faute, sur une carte où personne ne peut vérifier de tête que le
polygone de Villorceau est bien Villorceau.

**Une commune que le Géoportail ne place pas dans l'emprise est signalée** — dans le
bandeau d'état et dans « 🔎 Détail des sources » — jamais remplacée par une supposition, ni
par une commune de nom voisin. Vingt-trois communes affichées en annonçant vingt-cinq
serait un mensonge silencieux ; c'est précisément ce que le panneau empêche.

La fenêtre de recherche est large à dessein. **L'erreur est rattrapable dans les deux
sens** : trop petite, des communes manquent — et elles sont signalées ; trop grande, des
voisines reviennent — et le filtrage par nom les écarte. Une liste de codes écrite à la
main n'aurait offert ni l'un ni l'autre.

### 2. Le rendu est une carte de familles, pas un plan opposable

Zonage coloré par famille normalisée (U / AU / A / N), contours communaux, Mézières cerclée
de blanc. **Aucun bâtiment** à cette échelle. Un clic nomme la commune et la famille de
zone, et **n'ouvre pas** la fiche des règles.

### 3. Le cadrage est déduit des contours reçus

`fitBounds` sur ce qui est réellement arrivé. Je ne connais pas l'étendue exacte de la
CCTVL, et un zoom écrit à la main couperait des communes ou les noierait.

## Le piège qui a failli passer

Les zones à urbaniser s'écrivent presque toujours **« 1AU », « 2AU »** — le chiffre de
phasage est en tête — et « AU » commence par un « A ». La première version testait
`indexOf('au') === 0` : avec le chiffre devant, la forme la plus courante retombait en
gris, et sans l'ordre AU-avant-A elle serait devenue **agricole**. Sur la carte que porte
le maire, cela aurait montré des terrains à urbaniser comme des terres agricoles.

Le test a été écrit avant la correction et a échoué comme prévu. Le PLU de Mézières
lui-même contient `1AU` et `2AU` : le défaut était sous nos yeux.

## Alternatives écartées

- **Coder les 25 codes INSEE en dur.** Plus simple, plus rapide, invérifiable. Voir
  ci-dessus.
- **Résoudre chaque nom par la Base Adresse Nationale** (`type=municipality` → `citycode`).
  Fonctionnerait, mais 25 requêtes de plus, et un nom ambigu — il existe plusieurs
  « Cravant » en France — se résoudrait silencieusement à la mauvaise commune. La
  résolution par **géométrie** ne peut pas commettre cette erreur.
- **Un seul `zone-urba?geom=` sur tout le territoire.** Une requête au lieu de 25, mais
  aucun moyen fiable de rattacher chaque polygone à sa commune, et une réponse énorme d'un
  coup. Les vagues de quatre permettent en prime de remplir la carte progressivement.
- **Afficher les règles de chaque commune.** Il faudrait 25 fichiers de règles que
  personne n'a saisis, relus, ni ne maintiendra. Hors de question de les deviner.

## Conséquences

**Positives** : le dossier PLUi-H-D du maire devient visible pour les habitants ; la carte
ne peut pas attribuer un zonage à la mauvaise commune sans le dire ; les trois tests de la
vue tournent **sans réseau**, ce qui compte puisque apicarto est inaccessible depuis
l'environnement de développement.

**Négatives** : 26 requêtes réseau à l'ouverture de la vue — d'où un bouton, jamais un
chargement automatique. La vue ne fonctionne pas hors connexion.

**À surveiller** : si la liste des 25 noms évolue (fusion de communes, changement de
périmètre), c'est `C3D_CCTVL` qu'on met à jour — et le panneau signalera immédiatement tout
nom devenu introuvable. C'est le seul endroit à toucher.
