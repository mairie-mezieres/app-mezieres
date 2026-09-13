# ADR-0041 — Charger un écran quand on l'ouvre, pas quand on lance l'application

**Date :** 13 septembre 2026
**Statut :** acceptée
**Version :** v4.112

## Contexte

Deux mesures, faites sur l'écran d'accueil et sur le trombinoscope (Chromium,
profil téléphone, cache vide, service worker neutralisé, aucun appel réseau
sortant) :

| | Avant (v4.111) | Après (v4.112) |
|---|---|---|
| Accueil — fichiers JS | 29 (1 067,4 Ko) | **25 (939,9 Ko)** |
| Accueil — requêtes totales | 837 | **37** |
| Trombinoscope — images de la grille | 569 (2 038,4 Ko) | **15 (118,8 Ko)** |

Trois causes distinctes, découvertes en mesurant et non en relisant le code.

## 1. Des écrans chargés pour tout le monde, ouverts par presque personne

`js/mat-boot.js` injectait onze modules au démarrage, en plus des dix-sept
chargés par `index.html`. Quatre d'entre eux ne servent **qu'un seul écran** :

| Module | Poids brut | Écran |
|---|---|---|
| `mat-carte3d.js` | 98 Ko | Mon village en 3D |
| `mat-guide-arrivee.js` | 22 Ko | Je viens d'emménager |
| `mat-entreprises.js` | 8 Ko | Annuaire des entreprises |
| `mat-associations.js` | 5 Ko | Annuaire des associations |

136 Ko téléchargés, analysés et exécutés à chaque lancement, pour des écrans
que la plupart des habitants n'ouvriront jamais. La carte 3D à elle seule pèse
plus que `mat-core.js` et `mat-widgets.js` réunis.

L'ironie est que l'**ADR-0018 avait déjà posé la règle** — « la bibliothèque
MapLibre n'est pas chargée ici : le module va la chercher à la première
ouverture seulement » — et l'avait appliquée à MapLibre. Le module qui la
charge, lui, restait injecté au démarrage, et il a grossi de 29 Ko à 98 Ko
depuis que ce commentaire a été écrit. La bonne décision avait été prise un
palier trop haut.

### Décision

Un relais générique, `matDifferer(src, noms)`, prend la place de la fonction
d'ouverture. Au premier appel il charge le module — qui redéfinit la fonction,
donc le relais disparaît de lui-même — puis lui passe la main avec ses
arguments. Les appels suivants vont directement au vrai code.

```js
matDifferer('js/mat-carte3d.js?v=1.9.0', ['matOuvrirCarte3D']);
```

Trois garde-fous, chacun pour une panne rencontrée ou évitée :

- **`f !== relais`** avant d'appeler. Si le module se charge sans définir la
  fonction, sans ce test le relais s'appellerait lui-même en boucle.
- **La promesse échouée est oubliée** (`delete window._matModules[src]`) et le
  relais est réarmé : une coupure réseau ponctuelle ne condamne pas l'écran
  pour le reste de la session.
- **Une pastille « Chargement… »** (`matAttente`), en `role="status"`. Sans
  elle, appuyer sur « Mon village en 3D » ne produit rien de visible le temps
  du téléchargement, ce qui se lit comme un bouton mort.

### ⛔ Ne différer qu'un module sans effet de bord au chargement

Les quatre retenus ne sont que des suites de définitions. **`mat-eau8.js` ne
l'est pas et ne doit pas le devenir** : il *enveloppe* `window.loadMeteoDetail`
au chargement, pour y greffer la section « eau ». Son ordre par rapport à
`mat-widgets.js` est signifiant — différé, il envelopperait une fonction déjà
appelée, ou aucune. Même raisonnement pour `mat-plui.js` et `mat-sondages.js`,
qui alimentent une pastille de l'accueil dès leur chargement.

Le critère n'est donc pas « ce module est gros », c'est **« ce module ne fait
rien tant qu'on ne l'appelle pas »**.

### ⚠️ Le précache du service worker n'est pas contradictoire

Ces quatre fichiers **restent dans `PRECACHE_URLS`**. Les deux mécanismes
servent deux publics :

- le **précache** sert l'habitant qui a installé l'application : les modules
  sont déjà là, l'ouverture est instantanée, y compris hors connexion ;
- le **chargement à la demande** sert la **première visite**, qui n'a pas
  encore de service worker — celle que mesure l'éco-index, et la seule que
  connaîtront ceux qui n'installent pas.

Retirer ces lignes du précache ne gagnerait rien au premier chargement et
rendrait les écrans plus lents ensuite.

## 2. Le trombinoscope servait 2 Mo pour afficher des timbres-poste

La grille du conseil municipal affiche quinze carrés d'environ 120 px de côté.
Elle chargeait quinze portraits JPEG de **933 × 1400**, entre 65 et 208 Ko
pièce : **2 038 Ko** pour un écran de vignettes.

### Décision

Deux fichiers par élu, sous `img/trombi/` :

- `<slug>-vignette.webp` — carré de 360 px, ~8 Ko. C'est ce que charge la
  grille. Le cadrage reproduit le `object-fit:cover` + `object-position:top`
  du CSS : le carré du haut du portrait.
- `<slug>.webp` — portrait 933 × 1400, ~92 Ko, **mêmes dimensions que la
  source**. Chargé uniquement à l'ouverture de la fiche d'une personne.

Les vignettes portent `loading="lazy"`, `decoding="async"` et leurs dimensions
en attributs (pas de saut de mise en page au chargement).

Bilan : ouvrir le trombinoscope coûte **119 Ko au lieu de 2 038**. Consulter
trois fiches ajoute ~277 Ko — on reste très en dessous, et le pire cas (ouvrir
les quinze fiches) descend quand même de 2 038 à 1 500 Ko.

### ⛔ Un nom de fichier est un identifiant, pas une phrase

Les anciens fichiers s'appelaient
`Romuald GENTY 43 ans - 2 Mandats - Officier Sapeur-Pompier Professionnel - Le Bourg.jpg`.
Or la fiche de la même personne annonce **3 mandats**. Le nom de fichier
portait une donnée périmée que personne ne pouvait voir, puisqu'un nom de
fichier ne s'affiche nulle part — c'est la leçon de l'ADR-0038, appliquée
cette fois à un chemin d'image. Les nouveaux ne portent que
`prenom-nom` : `romuald-genty.webp`. **Ne rien y remettre d'autre.**

### Régénérer les images

Il n'y a **pas de dépendance de traitement d'image dans le dépôt** et il ne
doit pas y en avoir : l'application n'a pas d'étape de construction. La
conversion se fait une fois, à la main, quand le conseil change :

```bash
npx --yes sharp-cli@5 -i <portrait.jpg> -o img/trombi/<prenom-nom>.webp \
    -f webp -q 78
npx --yes sharp-cli@5 -i <portrait.jpg> -o img/trombi/<prenom-nom>-vignette.webp \
    -f webp -q 74 extract --top 0 --left 0 --width 933 --height 933 \
    resize 360 360
```

Puis ajouter `img:"prenom-nom"` dans `ELUS` (`js/mat-trombi.js`). Le champ
`img` est le **slug**, pas un nom de fichier : les deux chemins sont
reconstruits par `trombiVignette()` et `trombiPortrait()`.

## 3. Une image cherchée au mauvais endroit, redemandée 836 fois

Trouvé en comptant les requêtes de l'accueil : **837 requêtes** là où on en
attendait une quarantaine. Une seule URL en représentait 796.

`js/mat-accessibility.js`, illustration de bienvenue du parcours guidé :

```html
<img src="MAT-explique.webp" … onerror="this.src='MAT et MEL.webp'">
```

Deux fautes sur une ligne :

1. **Le dossier manque.** `MAT-explique.webp` au lieu de
   `img/MAT-explique.webp`. L'image existe pourtant dans le dépôt : la toute
   première illustration qu'un habitant voit en lançant l'application pour la
   première fois **n'a jamais pu s'afficher**.
2. **`onerror` ne se désarme pas**, et son repli est lui aussi sans dossier :
   404 → `onerror` → même 404 → `onerror`… La boucle tourne tant que l'écran
   est ouvert. Partout ailleurs dans le dépôt le motif est
   `this.onerror=null;` **avant** la réaffectation ; c'est exactement ce qui
   l'empêche.

Corrigé : chemin complet des deux côtés, `onerror` désarmé. 837 requêtes → 37.

### Pourquoi c'est resté

Une image cassée dans un parcours d'accueil qu'on ne voit qu'**au tout premier
lancement** n'est vue par personne qui puisse la signaler : le porteur du
projet a franchi cet écran une fois, il y a des mois. Les 404 ne remontent pas
dans Sentry (ce ne sont pas des erreurs JS). Et les tests d'interface
vérifient qu'un écran a du contenu, pas qu'une image s'est décodée.

⚠️ **Un test ne peut pas voir une image manquante s'il ne regarde que le
DOM** : un `<img>` au `src` cassé est présent, a une taille et un `alt`. Seul
`naturalWidth === 0` le trahit.

## Conséquences

- Suite complète rejouée : **382 exécutions, 0 échec**.
- Le nombre de requêtes est une entrée du calcul de l'éco-index : les trois
  corrections vont dans le même sens, mais **la mesure fait foi** — rouvrir
  `data/ecoindex.json` après le prochain audit hebdomadaire plutôt que
  d'annoncer un score attendu.
- `css/mat.css?v=4.14.22`, `js/mat-boot.js?v=4.13.0`,
  `js/mat-trombi.js?v=4.3.0`, `js/mat-accessibility.js?v=4.3.11`, cache SW
  `mat-v4.112.0`.

## Règles à retenir

⛔ **Un module qui ne sert qu'un écran se charge à l'ouverture de cet écran.**
La condition, et la seule, est qu'il n'ait **aucun effet de bord au
chargement**. Vérifier avant de différer : le module enveloppe-t-il une
fonction ? alimente-t-il une pastille ? lit-il le DOM ?

⛔ **Une grille de vignettes ne sert pas des images pleine définition.** Si le
CSS affiche 120 px, le fichier ne fait pas 1 400 px de haut.

⛔ **Tout `onerror` d'image commence par `this.onerror=null;`.** Sans ça, un
repli lui-même cassé boucle indéfiniment, en silence.

⚠️ **Compter les requêtes d'une page est un contrôle à part entière.** Aucune
des trois causes ci-dessus n'était visible à la lecture du code ; toutes
sautent aux yeux dans un décompte.
