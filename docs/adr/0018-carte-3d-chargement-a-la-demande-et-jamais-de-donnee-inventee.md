# ADR-0018 — Carte 3D : chargement à la demande, et jamais de donnée inventée

- **Date** : 9 août 2026
- **Statut** : Accepté

## Contexte

La v4.62 ajoute une vue en trois dimensions du bourg (`js/mat-carte3d.js`, overlay
`ov-carte3d`) : le bâti en relief, le zonage du PLU drapé au sol, et une fiche
« ce que vous avez le droit de construire » quand on touche un bâtiment.

Trois contraintes s'opposaient au fonctionnement habituel de l'application :

1. **Le moteur de rendu pèse ~1 Mo.** MapLibre GL est la seule bibliothèque de
   l'application à cet ordre de grandeur — Leaflet fait 150 Ko. L'Éco-index de
   MAT est déjà à 49 (grade D) et s'affiche dans le pied de page.
2. **Les données viennent de l'extérieur, à l'exécution** : orthophoto et BD TOPO
   de l'IGN, zonage du Géoportail de l'Urbanisme. Tout le reste de l'application
   est consultable hors connexion.
3. **Ces données peuvent être partiellement absentes.** Pendant la mise au point,
   le zonage se chargeait alors que le bâti échouait — et inversement.

## Décision

### 1. MapLibre n'est chargé qu'à la première ouverture de la carte

`js/mat-boot.js` charge `mat-carte3d.js` (29 Ko) en différé, comme les autres
modules non urgents. Ce module se contente de définir `matOuvrirCarte3D` ; il va
chercher `vendor/maplibre/maplibre-gl.js` **au premier appel seulement**
(`_c3dChargerLib`, promesse mémorisée).

`vendor/maplibre/maplibre-gl.js` n'est **pas** dans `PRECACHE_URLS` du service
worker. Le précacher triplerait le poids d'installation de l'application pour une
page que la plupart des habitants n'ouvriront jamais.

**Conséquence assumée : la carte 3D ne fonctionne pas hors connexion**, alors que
tout le reste de MAT le fait. C'est le prix à payer, et la page le dit au lieu de
tourner indéfiniment. Le fond de carte et le zonage sont de toute façon servis par
l'IGN à la demande : les précacher n'aurait pas suffi à rendre la page utilisable
hors ligne.

### 2. Aucune donnée n'est inventée pour combler un trou

La maquette d'origine possédait un village de substitution, dessiné quand aucune
source ne répondait. Sur la commune, l'orthophoto et le zonage se chargeaient bien
mais la BD TOPO échouait : l'écran a montré **de fausses maisons alignées en étoile
par-dessus les vrais champs et le vrai zonage**, sans que rien ne les distingue de
données exactes.

Un affichage dégradé est acceptable ; un affichage faux ne l'est pas. Le repli
inventé a donc été supprimé. Quand une source manque :

- il n'y a **aucun bâtiment**, et le bandeau d'état l'annonce ;
- un bouton « 🔎 Détail des sources » liste chaque service interrogé et le motif
  exact de son refus — y compris l'`ExceptionText` XML des serveurs OGC, seule
  phrase qui explique un refus du WFS ;
- l'échec **ne s'efface pas tout seul** au bout de quelques secondes, contrairement
  au message de succès : c'est précisément celui qu'il faut avoir le temps de lire.

### 3. Le nom de la commune servie est affiché

`INSEE = 45204` (Mézières-lez-Cléry). **45203 est Meung-sur-Loire.** Avec le mauvais
code, la maquette a drapé le zonage de la commune voisine sur la photo aérienne de
Mézières, sans que rien ne le signale — un habitant y aurait lu les règles du voisin
comme étant les siennes.

Le nom renvoyé par l'appel `municipality` du Géoportail est donc affiché dans le
bandeau (« 12 zones du PLU de Mézières-lez-Cléry ») et dans le panneau de
diagnostic. Une divergence se voit désormais à l'écran, sans relire le code.

### 4. Deux portes, un seul outil

La carte répond à une question de **compréhension du territoire** : où s'arrête le
constructible, ce qu'il y a autour de chez soi. MEL répond à une question de
**démarche** : quelle est ma zone, ai-je le droit de faire ceci.

- La page **PLUi-H-D** ouvre la vue d'ensemble (`matOuvrirCarte3D()`).
- **MEL**, une fois la zone détectée par `melFindZoneByAddr` / `melFindZoneByGPS`,
  propose « 🏘️ Voir ma zone sur la carte 3D » et transmet les coordonnées **déjà
  obtenues** (`matOuvrirCarte3D({lat, lon, zone})`).

La recherche d'adresse n'est **pas** réimplémentée dans la carte : elle existe dans
MEL et fonctionne. C'est la règle d'or du projet — vérifier l'existant avant de
construire — et l'inverse aurait créé une double source divergente de plus.

## Alternatives écartées

- **Précacher MapLibre pour l'hors-ligne** — inutile : sans les tuiles de l'IGN et
  sans le zonage, la carte n'aurait rien à afficher de toute façon.
- **Charger MapLibre depuis un CDN** — le projet vendorise ses bibliothèques
  (`vendor/leaflet/`, `vendor/sentry/`) ; un CDN ajoute une dépendance externe et
  une surface d'attaque, pour un gain nul ici.
- **Réutiliser Leaflet, déjà présent** — Leaflet ne fait pas de rendu 3D. Un plan
  de zonage en deux dimensions existe déjà, gratuitement, sur le Géoportail de
  l'Urbanisme : le refaire n'aurait rien apporté.
- **Un modèle numérique de terrain** — Mézières est dans le val de Loire, c'est
  plat. Le relief du sol n'apporterait rien de visible et coûterait cher en tuiles.
- **Colorer les bâtiments selon leur zone** — le bâti se serait confondu avec le
  drapé coloré du sol. Il reste crème, façon maquette d'architecte.

## Conséquences

**Positives** : l'application ne s'alourdit pas au démarrage ; la carte réutilise
`data/plu-data.json` et la recherche d'adresse de MEL sans les dupliquer ; une
donnée manquante est visible et nommée au lieu d'être masquée.

**Négatives** : une page de l'application ne fonctionne pas hors connexion ; le
dépôt gagne ~1 Mo dans `vendor/` ; la carte dépend de la disponibilité de l'IGN,
sur laquelle la commune n'a aucune prise.

**À surveiller** : l'Éco-index du pied de page est mesuré sur l'accueil
(`scripts/compute-ecoindex.js`) — il ne doit pas bouger, puisque MapLibre n'y est
pas chargé. Si un jour il chute, chercher un chargement de `mat-carte3d.js` devenu
non différé, ou un `import` de MapLibre remonté au démarrage.
