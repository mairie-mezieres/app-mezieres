# SFD-17 — Carte 3D du village

> [Référentiel](../README.md) · [SFG](../SFG-specifications-generales.md) · Processus : **Carte 3D du village**

## 1. Objectif

Donner à l'habitant une **vue d'ensemble de sa commune** : le bâti en relief, le zonage
du plan local d'urbanisme coloré au sol, et pour chaque bâtiment les règles qui s'y
appliquent.

L'assistante MEL répond déjà à la question « quelle est **ma** zone, ai-je le droit de
faire ceci » (voir [SFD-02](SFD-02-assistant-mel.md)). La carte répond à une autre
question, que MEL ne sait pas traiter : **où s'arrête le constructible, qu'y a-t-il
autour de chez moi, pourquoi la limite passe là**. Les deux se complètent ; la carte ne
duplique ni la recherche d'adresse ni les règles.

Choix d'architecture : [ADR-0018](../../adr/0018-carte-3d-chargement-a-la-demande-et-jamais-de-donnee-inventee.md).

## 2. Acteurs concernés

- **Citoyen** : ouvre la carte, la fait pivoter, touche un bâtiment, lit les règles.
- **Système** : assemble l'orthophoto et le bâti de l'IGN, le zonage du Géoportail de
  l'Urbanisme, et les règles de `data/plu-data.json`.
- **Administrateur** : aucun rôle. Rien n'est administrable — les données viennent de
  sources nationales et le corpus de règles est versionné.

## 3. User stories

- **US-17.1** — En tant que citoyen, je veux voir ma commune en relief depuis la page
  PLUi-H-D, pour comprendre l'organisation du territoire.
- **US-17.2** — En tant que citoyen, je veux toucher un bâtiment et connaître sa zone
  ainsi que ce qu'on a le droit d'y construire.
- **US-17.3** — En tant que citoyen ayant trouvé ma zone dans MEL, je veux ouvrir la
  carte centrée sur mon adresse, sans ressaisir celle-ci.
- **US-17.4** — En tant que citoyen, je veux savoir quand une information manque, plutôt
  que de voir un affichage approximatif.
- **US-17.5** — En tant qu'utilisateur de lecteur d'écran ou sensible au mouvement, je
  veux pouvoir consulter la page sans être gêné.

## 4. Règles de gestion

- **RG-17.1** — Le zonage est celui du **PLU communal en vigueur**, publié au Géoportail
  de l'Urbanisme pour l'INSEE **45204** (Mézières-lez-Cléry). ⚠️ `45203` est
  **Meung-sur-Loire**. Le **nom de commune renvoyé par le Géoportail est affiché** à
  l'écran, afin qu'une erreur de code ne puisse pas passer inaperçue.
- **RG-17.2** — Les règles d'urbanisme affichées proviennent **exclusivement** de
  `data/plu-data.json`, source unique déjà utilisée par MEL. Aucune règle n'est écrite
  dans le module de la carte.
- **RG-17.3** — **Aucune donnée n'est inventée.** Si le bâti n'est pas disponible, aucun
  bâtiment n'est dessiné et le motif est affiché. Un affichage dégradé est acceptable ;
  un affichage faux ne l'est pas.
- **RG-17.4** — Un échec de chargement **reste affiché** jusqu'à ce que l'habitant le
  ferme. Seul un message de succès s'efface automatiquement.
- **RG-17.5** — La fiche d'un bâtiment porte la mention « information, pas autorisation :
  seul le service urbanisme de la mairie fait foi ».
- **RG-17.6** — La bibliothèque de rendu n'est chargée qu'à **la première ouverture** de
  la carte, jamais au démarrage de l'application.
- **RG-17.7** — La carte **nécessite une connexion** et l'annonce. C'est la seule page de
  l'application dans ce cas.
- **RG-17.8** — Aucune position n'est transmise à la commune ni à un tiers : la carte
  n'envoie rien, elle ne fait que lire des services publics de données ouvertes. Quand
  l'entrée se fait depuis MEL, les coordonnées restent dans le navigateur.
- **RG-17.9** — Le travelling d'arrivée est supprimé si « Réduire les animations » est
  actif, et interrompu au premier geste.
- **RG-17.10 — un seul nom.** La fonctionnalité s'appelle « Mon village en 3D » partout :
  tuile d'accueil, titre d'écran, `aria-label`, section de la page PLUi-H-D. Le bouton de
  MEL (« Voir ma zone en 3D ») nomme une **action**, pas la fonctionnalité. Verrouillé par test.
- **RG-17.11 — les chiffres annoncés portent sur la commune, pas sur l'emprise interrogée.**
  Celle-ci fait 7 km sur 6,7 km et déborde sur Cléry-Saint-André, Mareau-aux-Prés et Dry.
  Le bandeau compte les **bâtiments dont le centre est dans le contour communal** (renvoyé
  par l'appel `municipality`) et le nombre de **zones distinctes**, non de polygones : le
  Géoportail renvoie un polygone par secteur, et « 185 zones » laissait croire à 185 règles.
- **RG-17.12 — le zonage est découpé sur le contour de la commune.** Le repli par géométrie
  ramène le PLU de tout le secteur ; l'afficher tel quel reviendrait à draper le plan du
  voisin sur Mézières. Les bâtiments hors commune restent visibles mais **estompés**, et la
  **limite communale est tracée**.
- **RG-17.13 — « Où suis-je » ne transmet rien.** La position sert uniquement à centrer la
  carte et à lire la zone dans le zonage déjà chargé : aucune requête réseau n'est émise.
  Hors commune, l'écran l'indique explicitement.
- **RG-17.14 — le bâti est différencié, mais jamais deviné.** Un bâtiment est classé
  (habitat, agricole, industriel, cultuel, remarquable, annexe) à partir des seuls
  attributs `nature` / `usage_1` / `legere` **déjà renvoyés** par la BD TOPO. Chaque
  catégorie porte une teinte de murs, une teinte de toit et une hauteur de toit propres.
  Le classement **ne complète rien** : une valeur non reconnue retombe sur `habitat`, la
  catégorie la plus banale, et est **listée dans le panneau « 🔎 Détail des sources »**
  pour être affinée sur pièce. Le repli OpenStreetMap, qui n'a pas ces champs, utilise le
  tag `building` quand il est renseigné, sinon `habitat`.
  ⚠️ La valeur `nature` de la BD TOPO est souvent le fourre-tout « Industriel, agricole ou
  commercial », qui contient les trois mots à la fois : c'est `usage_1` qui doit être lu
  **en premier**, sans quoi une usine devient un hangar agricole.
- **RG-17.15 — les toits sont une lecture, pas une mesure.** La BD TOPO ne dit rien de la
  forme ni de la pente des toitures. La casquette colorée posée au sommet de chaque volume
  (couche `bati-toit`, entre `mat_h` et `mat_h + mat_toit`) est un **procédé de lisibilité**,
  pas une restitution du bâti réel — au même titre que la couleur des zones du PLU. Elle ne
  doit jamais être présentée comme une information sur la toiture d'un bâtiment donné.
- **RG-17.16 — la texture de façade est dessinée localement.** La trame de fenêtres des
  bâtiments d'habitation est générée en mémoire par l'application (`map.addImage`) : aucune
  image n'est téléchargée, le poids de la page est inchangé.
  ⚠️ `fill-extrusion-pattern` **remplace** `fill-extrusion-color`. Façade texturée et teinte
  par catégorie ne peuvent donc pas cohabiter sur une même couche : les deux couches
  `bati` et `bati-tex` portent des **filtres disjoints**, faute de quoi les volumes se
  superposent et scintillent.

## 5. Parcours

1. **Depuis l'écran d'accueil** → rubrique « Démarches et Services », tuile
   « 🏘️ Mon village en 3D », placée **sous MEL** → vue d'ensemble du bourg. C'est la porte
   principale : la carte n'était auparavant atteignable qu'à travers le dossier PLUi-H-D,
   donc en pratique jamais découverte.
2. **Depuis la page PLUi-H-D** → section « 🏘️ Mon village en 3D » → même vue d'ensemble.
3. **Depuis MEL** → « Urbanisme & Construction » → adresse ou GPS → zone détectée →
   bouton « 🏘️ Voir ma zone en 3D » → carte centrée, repère posé sur l'adresse.
4. **Sur ordinateur** → colonne « 🤝 Vous aider » et menu du haut. La grille de cartes
   étant propre au téléphone, sans ces deux entrées la carte serait invisible au-delà de
   1024 px.

## 6. Données et interfaces

| Élément | Source |
|---|---|
| Fond aérien, plan | Orthophoto et Plan IGN — Géoplateforme (couches ouvertes) |
| Bâti et hauteurs | BD TOPO de l'IGN via WFS ; repli OpenStreetMap |
| Zonage du PLU | Géoportail de l'Urbanisme via apicarto (`municipality` puis `zone-urba`) |
| Règles d'urbanisme | `data/plu-data.json` (embarqué) |
| Coordonnées d'adresse | Réutilisées de MEL — Base Adresse Nationale |

**Aucune route backend, aucune clé Redis.** La carte n'ajoute rien au serveur.

## 7. Accessibilité

Overlay nommé (`aria-label`), commandes avec `aria-pressed`, légende repliable au
clavier, bandeau d'état en `aria-live`, respect de `prefers-reduced-motion`. Audit
axe-core sans violation sérieuse ni critique (`tests/e2e/carte3d.spec.js`).

La carte reste, par nature, un contenu visuel. **Elle ne remplace pas MEL** : la même
information est accessible en texte, par l'assistante et par l'arbre de décision.

## 8. Tests

`tests/e2e/carte3d.spec.js` — MapLibre absent au démarrage, entrée depuis la page
PLUi-H-D, ouverture et fermeture par Échap, absence de bâti inventé hors connexion,
bouton de diagnostic vérifié sur le **style calculé**, audit axe.

Le test « la couche des bâtiments est acceptée par MapLibre » pose un jeu d'essai
comportant une maison, une église, un hangar et un bâtiment hors commune, puis vérifie que
les **quatre** couches (`bati`, `bati-tex`, `bati-toit`, `bati-contour`) existent, que la
texture de façade est enregistrée, et qu'aucune erreur de validation n'est remontée. Il ne
demande aucun réseau — seulement la bibliothèque servie en local — et c'est précisément
pour cela qu'il est capable de voir ce qu'aucun autre test ne voyait (v4.68).
