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
  Le bouton **clignote trois fois à l'ouverture, puis se tait** — et immédiatement dès qu'on
  le touche. Il ne se distinguait pas de ses cinq voisins alors que sa fonction, situer *sa*
  maison dans le zonage, est la moins devinable de la carte. L'animation est neutralisée par
  la règle globale « Réduire les animations ». Verrouillé par un test qui assert le **style
  calculé**, pas la seule présence de la classe.
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
  forme, de la pente ni de l'orientation des toitures. Le toit à deux pentes est approché
  par des **tranches horizontales** de plus en plus étroites (≈ 30 cm chacune, de 4 à 12
  selon la hauteur), empilées entre le haut des murs et le faîtage, ce dernier posé le long
  du **grand axe de l'emprise**. C'est un **procédé de lisibilité**, au même titre que la
  couleur des zones du PLU, et il ne doit **jamais** être présenté comme une information
  sur la toiture d'une construction donnée. Voir ADR-0020.
- **RG-17.16 — un toit ne déborde jamais de son bâtiment.** Les tranches sont obtenues en
  découpant l'**emprise réelle**, jamais son rectangle englobant : sur une maison en L, un
  toit posé sur le rectangle couvrirait la cour. Verrouillé par un test qui échoue si l'on
  repasse au rectangle.
- **RG-17.17 — pas de texture ancrée sur les pixels.** `fill-extrusion-pattern` répète son
  motif en **pixels**, pas en mètres : le nombre de rangées de fenêtres augmente avec le
  zoom, et une maison de 6 m finit par ressembler à un immeuble. MapLibre n'offre aucun
  ancrage métrique — l'essai de la v4.69 a donc été **retiré**, pas réglé. Le grain de
  « tuiles » produit par les arêtes des tranches, lui, est exprimé en mètres et reste juste
  à tous les zooms.
- **RG-17.18 — les murs tiennent en une seule couche.** `queryRenderedFeatures` n'interroge
  que `bati` : tout bâtiment sorti de cette couche devient **inclicable**. En v4.69,
  l'habitat était passé dans une couche `bati-tex` pour porter une texture, et cliquer sur
  une maison — le cas le plus courant — n'ouvrait plus sa fiche. Les couches de toiture
  (`bati-toit` en pente, `bati-toit-plat` pour l'industriel et le hors-commune) portent des
  filtres **exactement complémentaires**, faute de quoi les volumes se superposent.

- **RG-17.19 — le territoire montre 25 PLU, pas un PLUi.** La vue « Le territoire »
  affiche les **25 PLU communaux en vigueur** des Terres du Val de Loire, chacun avec sa
  propre nomenclature. Le PLUi-H-D est en cours d'élaboration et n'existe pas au
  Géoportail : l'écran doit le dire, et ne jamais laisser croire à un document unique.
- **RG-17.20 — aucun code INSEE n'est écrit dans le code.** Seuls les 25 **noms** fournis
  par la mairie le sont. Codes, contours, partitions et statut RNU viennent du Géoportail.
  Une commune que le service ne place pas dans l'emprise est **signalée** — bandeau d'état
  et panneau « 🔎 Détail des sources » — jamais remplacée par une supposition. Écrire des
  codes de mémoire referait la faute 45203/45204, en 25 exemplaires et invisible à cette
  échelle.
- **RG-17.21 — aucune règle de construction hors de Mézières.** `data/plu-data.json`
  décrit le PLU de Mézières et lui seul. En vue territoire, un clic nomme la commune et la
  famille de zone ; il **n'ouvre pas** la fiche des règles.
  ⚠️ **Toute commune répond au clic, zonage ou pas.** Le clic n'interrogeait que la couche
  du zonage : une commune sans PLU n'ayant aucun polygone à toucher, l'écran restait muet —
  précisément sur les communes dont on se demande pourquoi elles sont vides. Le repli se
  fait sur le **contour communal**, testé en JavaScript (`_c3dDansGeom`) : les contours sont
  dessinés par des couches `line`, qu'un doigt ne touche presque jamais.
- **RG-17.28 — un tableau vide est truthy.** La chaîne de recherche du zonage teste la
  **longueur** du résultat, jamais sa seule vérité. L'interrogation par emprise ramène le
  zonage des communes voisines et le découpage sur le contour les élimine toutes : le `[]`
  qui en résulte arrêtait la chaîne juste avant l'étape « carte communale », qui n'était
  donc jamais lancée. Le journal restait vide, le diagnostic n'affichait rien, et le porteur
  en a conclu — à juste titre — que le code n'était pas déployé.
- **RG-17.22 — à cette échelle, on ne colore que par famille normalisée.** Les codes de
  zones diffèrent d'un PLU à l'autre (« Ua » ici, « UB » là) : seules les quatre familles
  du Géoportail (U, AU, A, N) sont comparables. ⚠️ Les zones à urbaniser s'écrivent
  presque toujours **« 1AU », « 2AU »** — chiffre de phasage en tête — et « AU » commence
  par un « A » : sans précaution, la forme la plus courante retombe en gris ou, pire, en
  agricole. Verrouillé par test.
- **RG-17.23 — le cadrage est déduit des contours reçus.** Un zoom écrit à la main
  couperait des communes ou les noierait ; `fitBounds` sur ce qui est réellement arrivé ne
  peut pas se tromper. Aucun bâtiment n'est chargé à cette échelle.
  ⚠️ Le **fond de carte n'est pas imposé**. La v4.72 basculait d'office sur le plan IGN ; à
  l'usage c'est la photo aérienne qu'on préfère — elle donne le paysage que le plan aplatit.
  Le double tracé des limites (RG-17.25) rend le zonage lisible sur les deux, donc rien
  n'oblige à choisir à la place de l'habitant : le bouton « Vue aérienne / Plan » reste le
  seul maître du fond.
- **RG-17.27 — aucun panneau ne recouvre les commandes, DÉPLIÉ compris.** Le panneau des 25
  communes tenait replié — d'où un contrôle de collision au vert — et recouvrait trois
  boutons une fois ouvert. Aucune hauteur écrite en CSS ne peut convenir : elle dépend du
  nombre de boutons visibles, de la barre système et du réglage de taille du texte. La
  hauteur disponible est donc **mesurée** à chaque ouverture. Le test correspondant s'exécute
  sur un **écran court** : sur un grand téléphone, le plafond CSS suffirait et le test
  passerait sans rien prouver.
- **RG-17.24 — trois chemins pour le zonage, jamais d'abandon silencieux.**
  `municipality?geom=` renvoie le nom, le code INSEE et le contour, mais **ni `partition` ni
  `is_rnu`** : seul `municipality?insee=` fait autorité. La chaîne est donc — partition
  connue → sinon `municipality?insee=` (qui donne la partition **et** le statut RNU) →
  sinon interrogation par **emprise rectangulaire**, découpée sur le vrai contour (la
  requête par emprise ramène aussi le zonage des voisines).
  **Zéro zone n'est pas un succès** : la commune porte un motif affiché dans le panneau, et
  si le territoire entier est muet le bandeau l'annonce et **désigne le bouton**
  « 🔎 Détail des sources ». Un écran vide qui ne se dénonce pas est la faute la plus
  coûteuse : elle a coûté une version — et c'est ce panneau qui a livré les deux causes
  réelles à la version suivante.
- **RG-17.24 bis — une commune sans PLU n'est pas en panne.** Qu'elle relève du RNU ou que
  le Géoportail n'ait aucun document pour elle, c'est une **information**, pas une erreur :
  elle ne compte pas dans les échecs, et la liste affiche « pas de PLU au Géoportail » et
  non un motif d'échec. Le bandeau annonce d'abord ce qui **est** là — « N communes avec
  zonage » — puis « X sans PLU », et réserve « indisponible » aux vraies pannes.
- **RG-17.24 ter — la carte communale est un document à part.** `zone-urba` ne sert que les
  PLU et les POS ; une petite commune rurale est souvent sous **carte communale**, à deux
  secteurs seulement (constructible / non constructible). Ces secteurs sont interrogés en
  dernier recours et portent leurs **propres couleurs** — les ranger dans les familles d'un
  PLU laisserait croire à un zonage qui n'existe pas. La légende ne montre que les familles
  **réellement présentes**.
  Le relevé de terrain a rendu le motif évident : les communes qui répondaient étaient les
  plus peuplées, celles qui restaient vides les plus petites. La mairie l'a confirmé — Le
  Bardon relève d'une carte communale approuvée en 2011.
  ⚠️ **Toute tentative laisse une trace exploitable.** Deux chemins sont essayés (emprise,
  puis les partitions annoncées par le Géoportail pour cette commune), et chacun inscrit son
  issue dans un journal affiché au diagnostic. La v4.74 écrivait ce motif dans une variable
  que **rien ne lisait** : l'écran disait « pas de PLU » sans pouvoir distinguer une réponse
  vide d'une erreur ou d'un endpoint inexistant. Un motif d'échec écrit et jamais lu ne vaut
  pas mieux que pas de motif du tout — verrouillé par test.
- **RG-17.26 — jamais une géométrie complète dans une URL.** Un contour communal du
  Géoportail compte des milliers de sommets ; sérialisé et encodé dans une chaîne de
  requête, il produit une URL de plusieurs dizaines de milliers de caractères que la pile
  réseau refuse — sans rendre d'erreur HTTP, seulement « Failed to fetch ». **Mesuré : 94 032
  caractères** pour un contour de 2 000 sommets. On interroge sur le **rectangle englobant**
  (5 points) et l'on rétablit l'exactitude par le découpage. Verrouillé par un test qui
  plafonne la longueur d'URL.
- **RG-17.25 — ce qui doit être vu doit être lisible sur le fond réel.** Un trait gris foncé
  de 1,1 px sur une photo aérienne est invisible : les 25 contours étaient tracés et l'écran
  paraissait n'en montrer aucun. Les limites portent donc un liseré sombre large sous un
  trait clair fin, et Mézières est en **or**. De même, aucun panneau ne doit recouvrir la
  colonne de boutons — surtout pas « 🔎 Détail des sources », celui qu'on cherche quand rien
  ne s'affiche.
- **RG-17.29 — un nom de commune est écrit tel que le service l'a renvoyé, et se retire
  plutôt que de devenir illisible.** En vue territoire, chaque contour porte son nom. Ce nom
  vient de `_c3dApparier`, donc du Géoportail : une commune que le service ne place pas
  **n'a pas d'étiquette** — elle reste signalée dans le panneau, jamais posée au jugé
  (prolongement de RG-17.20). Un contour sans surface n'en reçoit pas non plus : il n'existe
  aucun endroit défendable où poser le nom.
  Le nom est un **élément HTML**, pas une couche `symbol` : le style de la carte n'a pas
  d'URL `glyphs`, et sans glyphes un `text-field` ne rend **rien**, sans erreur ni trace —
  la panne silencieuse d'ADR-0015. Trois conséquences à tenir :
  ⚠️ MapLibre ne décale et ne masque **que** les couches `symbol` : l'anticollision est donc
  écrite à la main, et deux noms superposés se résolvent en **un seul affiché** — Mézières
  d'abord, puis les communes les plus étendues. Un nom manquant vaut mieux qu'une bouillie.
  ⚠️ `setLayoutProperty` **n'atteint pas** un élément HTML : le retour au village doit
  masquer les étiquettes explicitement, sans quoi les 25 noms flottent au-dessus du bourg.
  ⚠️ Une étiquette porte `pointer-events:none`, faute de quoi elle avale le clic qui doit
  nommer la commune (RG-17.21). Verrouillé par un test sur le **style calculé**.
  Voir ADR-0026.

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
| Communes du territoire | apicarto `municipality?geom=` — codes INSEE, contours, partitions, statut RNU (⚠️ **jamais écrits en dur**) |
| Zonage des 25 communes | apicarto `zone-urba?partition=`, une requête par commune, par vagues de quatre |

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
les quatre couches (`bati`, `bati-toit`, `bati-toit-plat`, `bati-contour`) existent,
qu'aucune erreur de validation n'est remontée, et que la pile de tranches de la maison
**monte bord à bord et rétrécit** vers le faîtage — sans quoi ce n'est pas une pente.

Le test « un toit ne déborde jamais de son bâtiment » pose une maison en L et vérifie que
tous les sommets des tranches restent dans l'emprise (RG-17.16).

Trois tests couvrent le territoire, tous **sans réseau** — ce qui compte, puisque apicarto
est inaccessible depuis l'environnement de développement :

- « les communes viennent du Géoportail, jamais d'une supposition » exerce `_c3dApparier`
  sur une réponse simulée : appariement malgré casse et accents, rejet d'une commune hors
  CCTVL, dédoublonnage, RNU conservé comme information, **aucun code INSEE fabriqué**, et
  les 22 communes absentes signalées (RG-17.20).
- « "AU" n'est pas rangé en agricole » verrouille `_c3dTypeZone`, y compris `1AU` / `2AU`
  (RG-17.22). Ce test a trouvé le défaut à l'écriture : le chiffre de tête faisait
  retomber toutes les zones à urbaniser en gris.
- « sources coupées, aucune commune n'est inventée » vérifie qu'en l'absence de réponse la
  vue le dit et ne pose aucune couche.

Quatre tests couvrent le **nom des communes** (RG-17.29), également sans réseau : le
territoire n'est pas chargé, on injecte ce que le service aurait renvoyé et l'on appelle la
pose directement.

- « chaque étiquette porte le nom renvoyé par le service » — une commune sans géométrie
  n'obtient pas d'étiquette, Mézières se distingue, et les libellés sont `aria-hidden`
  puisque le panneau les liste déjà en texte.
- « le nom se pose dans le plus grand polygone » exerce `_c3dCentreEtiquette` sur un
  MultiPolygon : le nom va sur le grand polygone et non sur l'écart de territoire, et un
  contour d'aire nulle renvoie `null` — pas un point calculé sur une division par zéro.
  ⚠️ C'est ce test qui a révélé que le repli « moyenne des sommets » de la première version
  était du **code mort** : une aire nulle n'est jamais retenue en amont. Il a été supprimé
  plutôt que laissé à dormir.
- « deux noms ne se recouvrent jamais, et Mézières l'emporte » superpose deux étiquettes et
  vérifie sur le **style calculé** qu'une seule reste visible — Mézières, même quand sa
  commune est la plus petite des deux.
- « le nom ne prend ni le clic ni la place du village » vérifie `pointer-events:none` sur le
  style calculé, puis qu'un retour au village ne laisse aucun nom affiché.

Ces tests ne demandent aucun réseau — seulement la bibliothèque servie en local — et c'est
précisément pour cela qu'ils voient ce qu'aucun autre test ne voyait (v4.68). Chacun a été
**vérifié en le faisant échouer** sur le défaut qu'il prétend attraper : pile qui ne
rétrécit pas, et toit posé sur le rectangle englobant.
