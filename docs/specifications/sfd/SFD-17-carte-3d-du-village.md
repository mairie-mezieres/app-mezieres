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

Choix d'architecture : [ADR-0016](../../adr/0016-carte-3d-chargement-a-la-demande-et-jamais-de-donnee-inventee.md).

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

## 5. Parcours

1. **Depuis la page PLUi-H-D** → bloc « 🏘️ Voir le zonage actuel en 3D » → vue d'ensemble
   du bourg.
2. **Depuis MEL** → « Urbanisme & Construction » → adresse ou GPS → zone détectée →
   bouton « 🏘️ Voir ma zone sur la carte 3D » → carte centrée, repère posé sur l'adresse.

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
