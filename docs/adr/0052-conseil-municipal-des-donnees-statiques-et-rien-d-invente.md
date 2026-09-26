# ADR-0052 — Conseil municipal : des données statiques, et rien d'inventé

Date : 26 septembre 2026 · Version : v4.126

## Contexte

L'overlay `#ov-conseil` (trombinoscope) gagne deux onglets — « Décisions » et
« Projets » — et l'accueil un bandeau « 🏛️ Conseil du 31 août : 8 décisions ».
L'objectif : rendre lisibles « en clair » les décisions du conseil et
l'avancement des projets, pour un public majoritairement senior.

## Décisions

### 1. Un fichier statique versionné, aucune IA à l'exécution, pas de Redis

Le contenu vit dans `data/conseil.json`, versionné et relu avant fusion —
même philosophie que « Le saviez-vous ? » (ADR-0012). Le backend n'est pas
concerné. L'interface n'affiche QUE le contenu du fichier : un champ `null`
ou absent n'affiche rien. Les résumés `en_clair` sont écrits par un humain à
partir des comptes rendus officiels, et le pied de l'onglet le dit : « Seuls
les documents officiels font foi. »

### 2. La visibilité est calculée, jamais éditée

- séance visible = `publie: true` **et** `date ≥ depuis` (début du mandat,
  2026-04-01). Une séance de l'ancien mandat présente dans le fichier ne
  s'affiche jamais ;
- projet visible = `publie: true` **et** au moins une séance source visible.
  Une séance saisie par anticipation mais non validée reste masquée — et ses
  projets avec elle ;
- doublon d'`id` (séance, décision, projet) : la **première occurrence
  gagne**, les suivantes sont ignorées avec un `console.warn`. Ce garde-fou
  est pensé pour le futur pipeline Drive → PR (hors périmètre ici), dont la
  règle sera « mise à jour, jamais d'ajout en double ».

### 3. Réseau d'abord pour `conseil.json`, comme le manifeste des jeux

Servi en stale-while-revalidate, un compte rendu fraîchement publié
n'apparaîtrait qu'au lancement suivant — et le bandeau « Nouveau »
annoncerait une séance en retard. Le fichier est précaché **sans `?v=`** et
servi réseau d'abord avec repli cache (même branche que `jeux/jeux.json`).

### 4. ⛔ matStore a détruit la clé « séance vue » à la première lecture

`matStore.get` fait `JSON.parse` de ce qu'il relit et **supprime la clé** si
le parse échoue (garde-fou anti-corruption). Or l'id mémorisé est une chaîne
nue — `2026-08-31` — qui n'est **pas** du JSON valide : écrite brute par
`matStore.set`, elle s'auto-détruisait à la première lecture, et le bandeau
restait « Nouveau » pour toujours. Aucun test unitaire ne l'aurait vu (le
set réussit, le get renvoie la valeur par défaut « proprement ») ; c'est la
trace des écritures localStorage sous Chromium qui l'a montré : un `setItem`
suivi d'un `removeItem`. `mat_conseil_vu` et `mat_conseil_tampon` passent
donc par `localStorage` brut (mêmes try/catch que matStore). Leçon : ne
stocker via matStore que des valeurs qui survivent à `JSON.parse`.

### 5. Le tampon ne joue qu'une fois, et jamais contre l'habitant

L'animation « coup de tampon » du sceau (~300 ms) ne joue qu'à la première
consultation d'une **nouvelle** séance (`mat_conseil_tampon`), et jamais
sous `prefers-reduced-motion`. Le « mode simplifié » cité au cahier des
charges n'existe pas dans l'app (la classe `simplified-mode` n'est posée
nulle part) : décision validée de l'ignorer.

### 6. Le sceau est un dessin, pas le tampon officiel

SVG pur (aucune image) : cercle « CONSEIL MUNICIPAL · MÉZIÈRES-LEZ-CLÉRY »
autour d'une façade stylisée de la mairie (fronton « MAIRIE », toit à deux
cheminées, porte en arc, perron, l'arbre du parvis). Aucun blason n'existe
dans le dépôt — et on n'invente pas d'armoiries. Les couleurs des thèmes du
JSON ne servent que d'**accent** (liseré, jamais couleur de texte) : le
`#F5A623` des travaux échoue au contraste AA sur fond clair.

### 7. « Consulter » éteint « Nouveau », quel que soit le chemin

Le bandeau d'accueil, la pastille du bouton bureau et l'onglet Décisions
suivent la même règle : la séance est marquée vue (`mat_conseil_vu`) au
rendu de l'onglet Décisions — pas seulement au clic du bandeau, sans quoi la
pastille bureau ne s'éteindrait jamais pour qui passe par la navigation.

### 8. Seul `#ov-conseil` s'élargit au bureau

Les overlays de l'app sont des volets bas de 520 px à toutes les largeurs.
Une grille de décisions sur 2 colonnes n'y tient pas : à ≥ 1024 px,
`#ov-conseil` — et lui seul — devient un panneau centré de 960 px. Décision
validée (point 3 de l'audit).

## Conséquences

- Mettre à jour une séance = éditer `data/conseil.json` (PR relue), rien
  d'autre. Le SW le sert réseau d'abord : pas de bump nécessaire pour une
  mise à jour de données.
- `tests/e2e/conseil.spec.js` verrouille visibilité, anti-doublon, badges,
  bandeau (les deux états, le marquage vue), échec de chargement, historique
  (les onglets n'en créent pas) et la mise en page bureau.
- Quatre écrans à garder cohérents le jour où MEL répondra depuis ces
  données (hors périmètre) : l'overlay, le bandeau, la pastille bureau, MEL.
