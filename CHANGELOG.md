# Changelog — Mézières Avec Toi (MAT)

Toutes les évolutions notables de l'application sont documentées ici.  
Format : [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/).

---

## [4.125.1] — 24 septembre 2026

### Modifié

- **« Remonter le temps » s'ouvre sur l'époque la plus détaillée** (photos 1950-1965,
  zoom 18) au lieu de la plus ancienne (Cassini, zoom 15), et la caméra s'approche du
  bourg. Choix sur le zoom maximal **relevé**, sans id en dur (`_c3dTempsParDefaut`).
  ADR-0051 §« L'ouverture sur la plus détaillée ».

---

## [4.125] — 22 septembre 2026

### Modifié

- **« Remonter le temps » : un rideau remplace le fondu.** Retour du terrain sur la
  v4.124 : à mi-course, une carte à moitié transparente sur la photo actuelle, « ça fait
  à moitié une fondue ». L'écran est coupé en deux, l'époque choisie **entière et
  opaque** à gauche, aujourd'hui à droite, avec une poignée (`role="slider"`). Seconde
  carte MapLibre (`_c3dMapTemps`) découpée par `clip-path`, qui recopie la caméra et est
  détruite à la fermeture. ADR-0051 §« Le fondu remplacé par un rideau », RG-17.31.

### Corrigé

- **Tests verts, moitié gauche vide.** La seconde carte, créée dans un conteneur masqué,
  mesurait 0 × 0, et `.maplibregl-map{position:relative}` écrasait la règle de classe du
  calque. Vu sur une capture : le test mesure désormais la taille du canevas.
- Le trait du rideau masquait les boutons de zoom (z-index 2 → 1).
- **Préexistant** : `.c3d-wrap` en `overflow:hidden` restait défilable (la fiche du
  bâtiment attend hors champ) ; un clic faisait glisser la carte de 89 px sous l'en-tête.
  Passé en `overflow:clip`.
- **Test instable préexistant** : « le bouton de diagnostic est réellement masqué »
  mesurait parfois avant la construction de l'écran (2 à 5 échecs sur 20 sous charge,
  `main` compris). Requêtes IGN tenues en suspens, attente de l'élément.

---

## [4.124.1] — 22 septembre 2026

### Corrigé

- **Cassini absente de « Remonter le temps ».** Premier passage en production : le
  « Détail des sources » a relevé l'état-major (`image/jpeg`, z11-15) et les photos
  1950-1965 (`image/png`, z11-18), mais Cassini répondait « HTTP 400 / HTTP 400 ».
  L'identifiant servi par le WMTS est `BNF-IGNF_GEOGRAPHICALGRIDSYSTEMS.CASSINI`
  (exemplaire BnF), pas le nom court. Le relevé a fonctionné comme prévu : l'époque en
  échec n'a jamais été proposée. Voir ADR-0051 §« Premier passage en production ».
- Un refus sans `ExceptionText` affiche désormais le début du corps de la réponse.

---

## [4.124] — 22 septembre 2026

### Ajouté

- **« Remonter le temps »** dans la carte 3D (`js/mat-carte3d.js`, RG-17.31, ADR-0051) :
  curseur en fondu entre Cassini (XVIIIᵉ), l'état-major (XIXᵉ), les photos aériennes
  1950-1965 et le fond actuel. ⛔ Format et zooms de chaque couche **relevés à
  l'exécution** par une tuile témoin, jamais écrits — une époque muette n'est pas
  proposée et s'inscrit au « Détail des sources ». Sept tests dans `carte3d.spec.js`,
  sur un IGN simulé qui répond de trois façons.

---

## [4.123] — 22 septembre 2026

### Corrigé

- **Le raccourci « Signalement » ouvrait l'accueil.** `./#signal` était déclaré au
  manifeste sans être routé par `handleMatHashRoute`. Routé, avec `#agenda`.
  Verrouillé par `tests/e2e/manifeste-raccourcis.spec.js`, qui ouvre chaque raccourci.

### Ajouté

- Raccourcis **Météo** et **Agenda** sur l'icône.
- `screenshots` au manifeste (4 captures WebP, `img/screenshots/`) : fiche
  d'installation enrichie sur Chrome Android. L'accueil du film est écarté (annonce
  fabriquée).
- `launch_handler: navigate-existing` : réutilisation de la fenêtre ouverte.

---

## [4.122] — 17 septembre 2026

### Corrigé

- **Trois colonnes de même largeur, et pourtant déséquilibrées.** Sur ordinateur, la
  colonne du centre de l'accueil descendait 1 338 px quand celles de gauche et de droite
  s'arrêtaient à 694 et 761 : 600 px de blanc sous deux colonnes sur trois.

  ⛔ **La largeur n'a jamais été le problème** — `grid-template-columns:1fr 1fr 1fr`
  donne 432 px à chacune sur un écran de 1440 px, et c'est mesuré. Les colonnes n'ayant
  **pas de fond**, ce qu'un habitant voit d'une colonne, c'est la hauteur de son
  **contenu**.

  ⛔ **Et la cause n'était pas la répartition des cartes seule.** La carte « Prochain
  évènement » rend la description de l'agenda public telle quelle : le concert du
  27 septembre, décrit en six paragraphes, faisait à lui seul **690 px**, plus que toute
  la colonne de gauche. Personne ici ne maîtrise cette longueur — elle est saisie dans
  l'agenda de la mairie et change à chaque évènement, donc tout équilibrage « à la main »
  se défait tout seul au suivant. `.d-featured-desc` est désormais plafonné à trois
  lignes ; le texte complet reste dans l'agenda.

### Modifié

- **Les actualités ouvrent la colonne de droite** (« 📰 Actualités & agenda »), visibles
  sans défiler ; le prochain évènement les suit. Elles étaient auparavant sous une carte
  de 690 px.
- **Les trois colonnes sont réparties par thème *et* par poids** : « 🏛️ La mairie au
  quotidien » (horaires, bus, collectes, village en 3D — 797 px) · « 🤝 Vous aider &
  participer » (guide d'arrivée, MEL, signalement, élus, vos photos — 884 px) ·
  « 📰 Actualités & agenda » (938 px). Écart : 15 %, contre 48 % en v4.121.
- Quatre blocs de style **en ligne** passent en CSS (`.d-featured-desc`,
  `.d-featured-plus`, `.d-actu-excerpt`, `.d-suivi-btn`) : en ligne, leurs couleurs
  étaient hors de portée du thème sombre — le `#666` de l'extrait d'actualité y restait
  gris moyen sur fond ardoise.

### Ajouté

- `tests/e2e/bureau-equilibre.spec.js` — sert un agenda et des actualités simulés (dont
  une description de six paragraphes), mesure les trois colonnes et **refuse plus de
  25 % d'écart**. ⚠️ Il mesure le bas de la dernière carte, pas `height` de la colonne :
  la grille étire les trois items à l'identique, donc cette hauteur est la même pour
  toutes et ne mesure rien. Vérifié rouge sans le plafond (ADR-0030).
- `docs/adr/0049-trois-colonnes-la-largeur-n-etait-pas-le-probleme.md`

---

## [4.121] — 16 septembre 2026

### Corrigé

- **Le bandeau d'accueil affichait la station la plus chère du jour.** Les six stations
  étaient toutes relevées le 16/09 ; l'accueil annonçait Intermarché Cléry à 2.436 €
  pendant que le panneau, à un doigt en dessous, classait Meung, Olivet et Beaugency à
  2.369 € **avant** elle — sous le titre « classées par prix croissant ».

  ⛔ **Deux classements séparés sont deux classements qui divergent.** Le bandeau
  appliquait l'ADR-0033 point 2 (Cléry par défaut tant que son relevé est le plus
  récent), le panneau appliquait l'ADR-0047 (plus récent, puis moins cher). Chacun était
  fidèle à sa règle ; ensemble, ils se contredisaient à l'écran. `choisirStationCarburant`
  ne choisit donc plus rien : il lit le **premier élément de `_carburantOrdonner`**, la
  fonction qui range déjà le panneau. L'invariant « bandeau = 1ʳᵉ carte » devient vrai par
  construction, pas par coïncidence.

  ⚠️ **Le privilège de proximité de Cléry est levé, pas supprimé** : elle l'emporte
  encore à date **et** prix égaux (elle passe en premier dans l'ordre de proximité).
  Ce qu'elle perd, c'est de gagner en étant plus chère.

  ⚠️ **Sans aucune date connue**, il ne reste que le prix pour départager — préférer
  Cléry n'y reposerait sur rien.

  Trois cas E2E le verrouillent, vérifiés dans les deux sens (l'ancienne règle en fait
  rougir trois), dont un qui rejoue la journée du 16/09 en entier.

---

## [4.120] — 16 septembre 2026

### Ajouté

- **Le relais TotalEnergies du Coudray (Olivet) est suivi** — sixième station du panneau
  et du bandeau. Ses deux identifiants de jeu de données ont été relevés sur les fiches
  officielles : `45160005` pour le E.Leclerc Olivet, `45160006` pour le relais.

### Corrigé

- **La carte « E.Leclerc Olivet » affichait les prix du relais du Coudray depuis
  l'origine.** Les deux stations partagent le 45160, et le flux instantané v2 ne porte
  aucune enseigne : `liste[0]` désignait la première du code postal — c'était le relais.

  ⚠️ **Ce que l'incident de la veille avait montré sans qu'on le lise ainsi.** Forcé sur
  `45160006`, le relais avait affiché « Diesel 2.250 € — 16/09 00:01 », au centime et à
  la minute près la carte « Leclerc » de la veille. Or un `id` renseigné supprime tout
  repli : ce record était bien `liste[0]`. La preuve était là, prise pour un symptôme.

  ⛔ **Une station absente se voit, une station qui ment sur son nom, non.** C'est ce qui
  a permis à l'erreur de tenir depuis le premier jour, tests verts et écran d'apparence
  normale. Désormais, seules les deux stations d'un code postal partagé portent un `id`,
  et sans lui `pickStationRecord` rend `null` — une carte vide plutôt qu'une carte fausse.

  ⚠️ **Un `id` reste une donnée, pas une déduction** : celui du relais, écrit de mémoire
  en v4.117, avait dû être retiré le jour même. Ceux-ci viennent des fiches
  `prix-carburants.gouv.fr/station/<id>`. Trois tests de `test/carburant.test.js` les
  verrouillent, vérifiés dans les deux sens (les retirer en fait rougir trois).

  Clé Redis `mat:carburant:v10` → **`v11`** : garder la clé, c'est servir une heure de
  prix attribués à la mauvaise enseigne.

---

## [4.119] — 16 septembre 2026

### Corrigé

- **Trois cartes sur six affichaient « Prix non communiqué », et une station montrait
  les prix de sa voisine.** Deux heures après la v4.117, l'écran réel donnait Cléry,
  Meung et Olivet vides, et le relais du Coudray à « Diesel 2.250 € — 16/09 00:01 » —
  au centime et à la minute près ce que le E.Leclerc d'Olivet affichait avant le
  déploiement.

  ⛔ **Le repli « à défaut, le premier enregistrement du code postal » n'était pas un
  confort : c'était le seul mécanisme qui fonctionnait.** Le flux instantané v2 ne porte
  **aucune enseigne** (un `id`, un `cp`, une `adresse`, une `ville`, des prix), donc la
  correspondance par marque ne matchait **jamais**. L'avoir restreint aux codes postaux
  à un seul enregistrement a vidé toutes les stations dont le code postal en porte
  plusieurs. Le repli est rétabli, et n'est refusé que si **deux de nos stations**
  partagent le code postal.

  ⛔ **Un `id` de station se relève, il ne se déduit pas.** Celui du relais du Coudray
  avait été pris sur un titre de résultat de recherche, faute de pouvoir interroger le
  jeu de données. La v4.117 promettait « une carte vide, jamais les prix d'une autre » :
  c'était faux — le garde-fou protège d'un mauvais choix par *marque*, pas d'un `id`
  recopié de travers. **Le relais du Coudray est retiré** en attendant les deux
  identifiants (le sien et celui du Leclerc, qui partagent le 45160).

  ⚠️ Les douze tests étaient **verts pendant la panne** : ils fabriquaient des
  enregistrements avec un champ `ensigne` que le vrai jeu de données n'a pas. Un test
  qui invente ses données ne mesure que l'idée qu'on s'en fait. Le cas ajouté — « chaque
  station suivie ressort d'un lot **sans enseigne** » — échoue sur la version fautive et
  passe sur le correctif (vérifié dans les deux sens).

### Technique

- **Backend** : clé Redis `mat:carburant:v9` → **`v10`**. La forme du payload ne change
  pas, mais le cache tient une heure : garder la clé, c'est servir les mauvaises
  stations jusqu'à expiration et laisser conclure que le correctif ne marche pas.
- Aucun changement de code côté app — `CARBURANT_CLES` garde la clé `coudray`, sans
  effet tant que le payload ne la porte pas.

### Documentation

- `docs/adr/0047-…` — section « Rectificatif (16 septembre, même jour) », qui garde la
  trace des deux affirmations fausses et de ce qui les a rendues possibles :
  `data.economie.gouv.fr` est **injoignable depuis l'environnement de développement**.
- `docs/guide-technique.md` §7, `docs/guide-utilisateur.md` §3, `STD-07`, les deux
  `CLAUDE.md`.

---

## [4.118] — 16 septembre 2026

### Modifié

- **Prix carburant : une station n'affiche plus que son relevé le plus récent.** La
  v4.117 montrait les deux prix avec leurs deux dates ; c'était exact, mais cela
  demandait à l'habitant de trier lui-même le frais du périmé, sur un écran qu'on
  consulte en marchant vers sa voiture. Le SP95 du 08/09 de Beaugency n'est donc plus
  affiché : sa carte ne porte que le gazole du jour.

  Date affichée, âge qui teinte la carte, prix qui sert au classement, station retenue
  par le bandeau d'accueil : **tout se lit sur ce qui reste**. Un prix écarté ne décide
  de rien et ne peut pas réapparaître dans le bandeau — les deux écrans ne peuvent plus
  se contredire. ⚠️ Une station remonte donc au classement dès qu'**un** de ses
  carburants est réévalué.

  ⚠️ Un carburant sans date connue n'est pas « le plus récent » : il sort dès qu'un
  autre porte une date. Une station dont aucun carburant n'est daté garde tout, faute de
  pouvoir départager.

  ⛔ Le carburant écarté est **nommé** (« SP95 non réévalué depuis le 08/09 — non
  affiché ») : une absence ne se remarque pas, et « cette station ne vend pas de SP95 »
  serait une conclusion que rien ne viendrait démentir.

  ⛔ Ce n'est **pas** un seuil d'ancienneté (que l'ADR-0033 avait écarté, et qui le
  reste) : ce qui est masqué ne l'est pas parce qu'il est vieux, mais parce que la
  **même station** en a déclaré un plus récent. Une station entièrement figée depuis
  huit jours affiche donc toujours ses deux prix, datés.

### Tests

- `tests/e2e/carburant-fraicheur.spec.js` — le carburant en retard n'est pas affiché et
  son absence est dite, les deux prix restent quand les dates coïncident, et le bandeau
  d'accueil ne montre pas non plus le prix écarté.

### Documentation

- `docs/adr/0047-un-carburant-a-sa-propre-date.md` — décision révisée (§ « Révision »).
- `docs/guide-technique.md` §7, `docs/guide-utilisateur.md` §3, les deux `CLAUDE.md`.

---

## [4.117] — 16 septembre 2026

### Ajouté

- **Sixième station suivie : le relais TotalEnergies du Coudray** (3091 rue Marcel
  Belot, Olivet). ⛔ Olivet porte désormais **deux** stations sur le même code
  postal : celle du Coudray est désignée par son **identifiant de jeu de données**
  (`45160006`, celui de l'URL `prix-carburants.gouv.fr/station/<id>`), et le repli
  « à défaut, le premier enregistrement du code postal » ne vaut plus que lorsqu'il
  n'y en a qu'un. Sans correspondance, la station n'affiche **rien** : un trou se
  voit, des prix attribués au voisin, non.

### Corrigé

- **Chaque carburant porte SA date de relevé.** Les stations déclarent leurs prix
  carburant par carburant : le 16 septembre, le E.Leclerc « Beaugency » (en réalité
  Tavers, 45190) servait un SP95 relevé le **08/09** et un gazole relevé le
  **16/09**. Le backend ne gardait que la première date trouvée
  (`sp95_maj || e10_maj || gazole_maj`) : l'app annonçait « relevé d'il y a 8 jours »
  pour les deux. ⛔ Et la réciproque est pire — une station sans `sp95_maj` faisait
  dater son SP95 de l'horodatage du gazole, donc un prix d'une semaine affiché
  « relevé du jour », exactement ce que l'ADR-0033 avait entrepris de corriger.

  `sp95Maj`/`sp95MajISO` et `gazoleMaj`/`gazoleMajISO` s'ajoutent au payload ; le
  panneau écrit les deux dates dès qu'elles diffèrent, et garde une ligne unique
  quand elles coïncident. ⚠️ Le repli SP95 → E10 emporte la date **du E10**.

- **La date d'une station est celle du plus ancien de ses prix affichés.** Le bandeau
  d'accueil montre deux prix sous une seule date : c'est la seule qui ne mente sur
  aucun des deux. Elle sert aussi de clé de tri et de teinte de carte — ni le rang ni
  la couleur ne peuvent ainsi être plus optimistes qu'un prix montré.

### Technique

- **Backend** : la logique pure part dans `lib/carburant.js` (liste des stations,
  désignation de l'enregistrement, extraction des prix et des dates), testable sans
  réseau. Cache Redis `mat:carburant:v8` → **`v9`**, la clé devant suivre la forme du
  payload.
- Le front lit les deux formats : sans date par carburant, il retombe sur celle de la
  station — ce qui couvre l'heure de TTL Redis qui suit un déploiement.

### Tests

- `chatbot-mairie-mezieres/test/carburant.test.js` — 12 cas, aucun appel réseau.
- `tests/e2e/carburant-fraicheur.spec.js` — trois cas de plus : deux dates affichées,
  une seule quand elles coïncident, et le relais du Coudray.

### Documentation

- `docs/adr/0047-un-carburant-a-sa-propre-date.md` (nouveau).
- `docs/guide-technique.md` §7, `docs/guide-utilisateur.md` §3,
  `docs/specifications-techniques/STD-07-services-pratiques.md`.

---

## [4.116] — 16 septembre 2026

### Modifié

- **Panneau « Prix carburant » : les cinq stations sont triées par relevé le plus
  récent, puis par prix croissant.** Le bandeau d'accueil applique cette règle
  depuis la v4.101 pour choisir la station qu'il montre ; la liste détaillée, elle,
  restait rangée par proximité — la station mise en avant pouvait y apparaître en
  3ᵉ position, sous des prix plus bas mais plus vieux. L'écran détaillé se lisait
  donc comme un démenti du bandeau.

  Une station sans date connue passe en dernier (jamais supposée fraîche), une
  station sans aucun prix après celles qui en ont un, et la proximité départage les
  ex æquo.

- **L'âge de chaque relevé est écrit et rappelé par une teinte.** « Relevé du
  jour », « Relevé d'hier », « Relevé d'il y a N jours » — et le fond de la carte
  grise à mesure que le prix vieillit : normal le jour même, gris clair à 1-2
  jours, gris plus soutenu au-delà. ⛔ La couleur ne porte **jamais** seule
  l'information (RGAA 1.1) : le texte suffit.

  ⛔ L'âge se compte en jours de **calendrier** (`matDaysUntil`, ADR-0031). Un
  relevé d'hier 23 h divisé par 86 400 000 vaut 0,4 jour, donc « relevé du jour »,
  pour un prix de la veille.

### Corrigé

- **Thème sombre : les prix du panneau carburant étaient noir sur noir.** Ils
  étaient écrits `color:var(--leaf)` / `var(--forest)` **en style inline**, donc
  hors de portée de tout thème — or le thème sombre redéfinit ces deux jetons en
  **fonds** bleu nuit. Tout passe désormais par les classes `.fuel-card*` et les
  jetons `--fuel-*` de `css/mat.css`, déclinés pour la palette claire, le thème
  sombre et le contraste renforcé. Les gris de fraîcheur sont calibrés pour que la
  pire paire encre/fond de chaque thème reste au-dessus de 4,5:1 (RGAA 3.2).

### Tests

- `tests/e2e/carburant-fraicheur.spec.js` — trois cas de plus : l'ordre des cinq
  cartes, les libellés d'âge, et le cas « hier 23 h ». ⚠️ Les trois fonds sont
  mesurés sur le **rendu** (`getComputedStyle`) : un test qui n'interroge que le JS
  ne prouve pas qu'une teinte se voit.

### Documentation

- `docs/adr/0033-un-prix-sans-sa-date-est-un-prix-du-jour.md` — section « Suite
  (v4.116) ».
- `docs/guide-technique.md` §7 — nouvelle section « Prix carburant ».
- `docs/guide-utilisateur.md` §3 — ordre et code couleur de la liste détaillée.

---

## [4.115] — 15 septembre 2026

### Ajouté

- **Facebook → l'app : un post `#MAT` à plusieurs photos donne une actualité à
  plusieurs photos.** Le sens sortant (admin → Facebook) existait depuis la
  v4.109 ; le sens entrant reprenait **une seule** image.

  Deux causes cumulées, côté `chatbot-mairie-mezieres` : `full_picture` (Graph
  API) ne rend que la **couverture**, et `change.value.photo` — le repli — est une
  **chaîne absente** d'un post multi-photos, lequel porte `change.value.photos`,
  un **tableau** que personne ne lisait. `resolvePostImages` lit désormais
  `attachments{media,subattachments{media}}`.

  ⛔ **Les deux sources ne sont jamais fusionnées** : une même photo n'a pas la
  même URL dans le corps du webhook et dans la Graph API (deux CDN, deux
  signatures), donc les concaténer publierait chaque image en double sans qu'aucun
  dédoublonnage par URL ne s'en aperçoive. On garde celle qui en décrit le plus,
  la Graph API l'emportant à égalité — ce qui laisse un `PAGE_ACCESS_TOKEN`
  périmé (qui rend `[]` **sans erreur**) retomber sur le corps du webhook.

  ⚠️ La panne était **muette** : un post à six photos produisait une actu à une
  image, c'est-à-dire un résultat d'apparence normale. Les logs comptent
  maintenant les deux côtés (`N image(s) annoncée(s)` → `N photo(s)`).

  Voir **ADR-0046** ; `chatbot-mairie-mezieres/test/webhook-photos.test.js`.

---

## [4.114] — 15 septembre 2026

### Corrigé

- **L'encadré « Boîte à idées » ne s'affichait plus dans l'écran Notifications**,
  et la pastille de l'icône de l'application restait figée. `updateActuBadge`
  (`js/mat-actus.js`) appelait `updateAppBadge` — définie dans
  `js/mat-accessibility.js` — **sans garde `typeof`**, seul appel du fichier dans
  ce cas. Sur un cache de service worker partiel (ADR-0032), la fonction manque et
  l'appel lève.

  ⚠️ Deux raisons pour lesquelles la panne était muette : `refreshActusBadge` est
  **`async`**, donc le `try/catch` **synchrone** de ses quatre appelants n'attrape
  rien — l'exception devient un rejet de promesse ; et le badge rouge, lui, est posé
  **avant** l'appel fautif, si bien que l'écran a l'air normal. Seule Sentry le
  voyait (issue #455).

---

## [4.112] — 13 septembre 2026

Trois causes distinctes, toutes trouvées **en mesurant**, aucune visible à la
lecture du code. Mesures : Chromium, profil téléphone, cache vide, service
worker neutralisé, aucun appel réseau sortant.

| | Avant | Après |
|---|---|---|
| Accueil — fichiers JS | 29 (1 067,4 Ko) | **25 (939,9 Ko)** |
| Accueil — requêtes totales | 837 | **37** |
| Trombinoscope — images de la grille | 569 (2 038,4 Ko) | **15 (118,8 Ko)** |

### Modifié
- **Quatre écrans ne se chargent plus qu'à leur ouverture.** `mat-carte3d.js`
  (98 Ko), `mat-guide-arrivee.js`, `mat-entreprises.js` et
  `mat-associations.js` étaient injectés par `mat-boot.js` à chaque lancement —
  136 Ko pour des écrans que la plupart des habitants n'ouvriront jamais.
  Nouveau relais `matDifferer()`, avec pastille « Chargement… » en
  `role="status"` et réarmement après échec réseau.
  ⛔ Ne différer qu'un module **sans effet de bord au chargement** :
  `mat-eau8.js` enveloppe `loadMeteoDetail`, `mat-plui.js` et `mat-sondages.js`
  alimentent une pastille.
  ⚠️ Les fichiers **restent précachés** : le précache sert l'habitant installé,
  le chargement à la demande sert la première visite.
- **Trombinoscope : vignettes pour la grille, portrait pour la fiche.** La
  grille chargeait quinze JPEG de 933 × 1400 (2 038 Ko) pour afficher quinze
  carrés de 120 px. Elle charge désormais quinze WebP de 360 px (118,8 Ko) ;
  le portrait pleine taille (~92 Ko, dimensions inchangées) n'arrive qu'à
  l'ouverture d'une fiche. `loading="lazy"` + dimensions en attributs.
- **Les photos sont nommées par un slug** (`romuald-genty.webp`). Les anciens
  noms portaient l'âge et le nombre de mandats — et l'un d'eux annonçait
  « 2 Mandats » quand la fiche de la même personne en disait 3. Une donnée
  recopiée dans un nom de fichier ne se met jamais à jour, et personne ne la
  relit.

### Corrigé
- **L'illustration de bienvenue du parcours guidé ne s'était jamais
  affichée.** Dans `js/mat-accessibility.js`, son chemin n'avait pas son
  dossier (`MAT-explique.webp` au lieu de `img/MAT-explique.webp`) ; le repli
  `onerror` avait la même faute **et ne se désarmait pas** : 404 → `onerror` →
  même 404 → `onerror`… **796 requêtes** sur la seule URL de repli, mesurées en
  5 secondes. Corrigé des deux côtés, `onerror` désarmé.
  ⚠️ Un `<img>` au `src` cassé est présent dans le DOM, a une taille et un
  `alt` : aucun test de structure ne peut le voir, seul `naturalWidth === 0`
  le trahit.

### Documentation
- `docs/adr/0041-charger-un-ecran-quand-on-l-ouvre.md` (nouveau), y compris la
  commande de régénération des photos — il n'y a **pas** de dépendance de
  traitement d'image dans le dépôt, et il ne doit pas y en avoir.
- `CLAUDE.md` : deux entrées d'aiguillage (chargement à la demande, photos du
  trombinoscope).
- `service-worker.js` : le commentaire d'ADR-0018 disait « 29 Ko » pour
  `mat-carte3d.js`, qui en fait 98.

### Versions
`css/mat.css?v=4.14.22`, `js/mat-boot.js?v=4.13.0`, `js/mat-trombi.js?v=4.3.0`,
`js/mat-accessibility.js?v=4.3.11`, cache SW `mat-v4.112.0`.

---

## [4.111] — 13 septembre 2026

### Modifié
- **Nunito n'est plus téléchargée qu'une fois.** `css/fonts.css` déclarait cinq
  `@font-face` Nunito (400, 600, 700, 800, 900) × deux sous-ensembles, soit dix
  URL — qui servaient **le même fichier, octet pour octet** (`md5sum` ne rendait
  que deux hachages pour dix fichiers). Google Fonts ne livre plus de coupes
  statiques pour Nunito : `wght@400` et `wght@200..1000` renvoient la même police
  variable. Une URL distincte étant une entrée de cache distincte, le navigateur
  retéléchargeait ces 39 Ko **une fois par graisse rencontrée** — quatre fois sur
  le seul écran d'accueil.
  Remplacé par **une** déclaration `font-weight: 200 1000` par sous-ensemble
  (`fonts/nunito-variable-latin.woff2` et `-latin-ext.woff2`). Rendu identique :
  ce sont les mêmes octets.
  - Mesuré sur l'écran d'accueil (Chromium, profil téléphone, cache vide) :
    **221,1 Ko de polices → 68,2 Ko**, soit **−152,8 Ko** et **−4 requêtes**.
    Les cinq graisses étaient bien téléchargées, aucune n'était dispensée.
  - Dépôt : `fonts/` passe de 480 Ko à 176 Ko (8 fichiers supprimés).
  - `css/fonts.css?v=2` (`index.html` + `service-worker.js`), cache SW
    `mat-v4.111.0`.

### Documentation
- `ETAT_DES_LIEUX.md` remis à jour : le relevé du 21 août annonçait encore RGAA
  **86,2 % « partiellement conforme »** et interdisait d'écrire « conforme
  RGAA » — l'audit est à **100 %, totalement conforme** depuis la v4.97. Version
  de production, nombre de tests et chaînes automatisées recomptés.

---

## [4.110] — 12 septembre 2026

### Modifié
- **Frise du PLUi-H-D** : le COPIL de restitution du PADD modifié (8 septembre 2026)
  passe en `done` ; l'étape en cours devient la **réunion de présentation des
  modifications** du 22 septembre 2026 (`PLUI_TIMELINE`, `js/mat-plui.js`).

---

## [4.109] — 12 septembre 2026

### Ajouté
- **Plusieurs photos par actualité (jusqu'à 6).** L'admin accepte une sélection
  multiple, réordonnable (◀ ▶) et retirable vignette par vignette ; la première est la
  **couverture**. Côté habitant, les photos se parcourent par **balayage horizontal**
  (`scroll-snap`) sur la carte comme dans l'article, avec un compteur « 2 / 5 » et deux
  boutons de 44 px — seul accès au clavier et à la souris. Une photo unique produit
  exactement le rendu d'avant : aucun carrousel.
- **Publication Facebook multi-images** : les photos partent en `published=false` puis
  un seul `POST /feed` les attache (`attached_media`) — un post, toutes les images. Une
  photo refusée n'empêche plus les autres de partir (`skippedPhotos`).

### Corrigé
- **`/admin/actus/schedule` refusait toute photo de plus de 256 Ko** depuis sa création :
  la route était absente de `_isLargeBodyRoute` (`app.js`), et le 413 obtenu se lit comme
  une panne réseau. Les images d'une publication programmée sont pourtant hébergées *à la
  programmation*, pas à l'heure dite.
- **La suppression d'une actu ne libérait que sa couverture sur Cloudinary.** Les trois
  chemins de suppression (actu, purge, annulation d'une programmation) passent désormais
  par `actuPhotoList`, qui couvre les deux formes de stockage — sans quoi cinq images sur
  six restaient hébergées sans plus rien pour les retrouver, sous un `ok: true`.

### Technique
- `photos: [{url, publicId}]` **s'ajoute** à `photo` / `photoPublicId`, qui continuent de
  porter la couverture : cinq affichages (vignette bureau, prochaine manifestation, image
  de la notification push, liste admin, actus du webhook Facebook) lisent `photo` et
  l'ignorent. Chaque image est redimensionnée dans le navigateur (1600 px / 0,82) avant
  l'envoi.
- Nouveaux verrous : `test/actu-photos.test.js` (backend) et
  `tests/e2e/actu-galerie.spec.js` (app — deux formes de stockage, style calculé du
  scroll-snap, largeur réelle d'une diapositive, bornes, cibles ≥ 44 px).
- ADR-0039 — « Plusieurs photos : une couverture, un balayage, un seul post Facebook ».

---

## [4.108] — 9 septembre 2026

### Ajouté
- **École de la Forêt et services périscolaires, à jour du règlement intérieur
  2026-2027.** MEL répond désormais directement sur les horaires de classe (8h30-11h45 et
  13h45-16h30, quatre jours, accueil dix minutes avant, portail fermé à l'heure de la
  classe), les APC du lundi et du jeudi, le signalement d'une absence, les médicaments et
  le PAI, les règles de vie de l'école (téléphone confisqué une semaine, écharpes
  proscrites, tenues, vélo sur autorisation écrite) et le **calendrier des vacances
  2026-2027**.
- **Quatrième fiche « Accueil du mercredi »** dans les deux copies de l'arbre de décision
  (7h30-18h00, journée ou demi-journée, avec ou sans repas) : ses horaires d'arrivée, ses
  délais de réservation et sa limite de retard diffèrent tous de ceux du matin et du soir.
- **Le portail parents est le point d'entrée unique** du périscolaire — dossier,
  réservations, annulations, personnes autorisées, paiement — avec ses délais : 3 jours
  avant pour le matin et le soir, le mardi de la semaine précédente pour la cantine et le
  mercredi.
- Dix entrées scolaires dans « Le saviez-vous ? » (corpus 1.5.0, 180 entrées).

### Modifié
- **Un horaire faux depuis longtemps** : l'arbre annonçait une ouverture « à 8h20 et
  13h30 ». L'après-midi commence à **13h45**, l'accueil à **13h35**.
- **L'inscription « par fiche à déposer en mairie avant le 30 juin » n'existe plus** :
  l'entrée correspondante du corpus est remplacée par une entrée qui répond *non* à la
  même question.
- `centre_loisirs` décrit l'**ALSH du Val d'Ardoux** (3-13 ans, Cléry-Saint-André, toutes
  les vacances **sauf Noël**) au lieu d'une réponse générique.

### Supprimé
- **Une grille tarifaire de cantine datée de 2022-2023**, affichée pendant quatre ans dans
  `js/mat-mel.js`. Les tarifs sont votés chaque année par le conseil municipal et calculés
  sur le quotient familial CAF : l'application dit désormais **comment** le prix se forme
  et **où** trouver la grille, sans en recopier aucune.
- **Les noms des personnels** (direction de l'école, direction du périscolaire), qui
  vivaient dans l'arbre de décision. On désigne une fonction, qui survit à un mouvement de
  personnel. Deux tests refusent leur retour, y compris en commentaire.

### Corrigé
- `demarches_etatcivil` (backend) attrapait le mot `certificat` nu : « certificat de
  radiation » et « certificat médical pour une absence » recevaient une réponse sur les
  actes de naissance.

Voir `docs/adr/0038-un-nom-de-personnel-perime-plus-vite-qu-un-horaire.md`.

---

## [4.107] — 6 septembre 2026

### Ajouté
- **Deux jeux de plus, et le calendrier se resserre — neuf jeux couvrent l'année.**
  - *Attrape le lapin* (**1er → 31 octobre**) : une minute dans un pré en bordure de
    vigne, deux boutons pour tourner, et un lapin qui apprend une ruse à chaque
    capture — anticipation, crochets, buissons, terriers.
  - *Le Lancer de tong* (**1er → 31 août**) : trois lancers, on garde le meilleur,
    avec battement de tong en vol et rafales de vent qui portent.
  - Décalages induits : *Le Feu d'artifice* se replie sur **juillet**, *La Hotte* sur
    **septembre**, *La Course d'automne* sur **novembre**. Calendrier revérifié sur
    les 366 jours d'une année bissextile : aucun trou, aucun chevauchement.

### Modifié
- **La Bataille de boules de neige est remplacée par la version révisée** : rythme
  plus vif (apparitions et tirs plus rapides, niveau tous les 10 touchés) et un
  **ours blanc** qui se rend, pattes en l'air — le toucher coûte un bonnet.
- ⚠️ **Correctif dans le jeu fourni : `C.alerte` n'existait pas dans sa palette.**
  Le canvas **ignore en silence** une couleur `undefined` : l'onde et le message
  « PAS L'OURS ! » se peignaient dans la teinte laissée par le dessin précédent,
  sans la moindre erreur. La couleur est déclarée (`#FF6B5B`).
- Les trois fichiers ont reçu la retouche habituelle — zoom rétabli (RGAA 13.9),
  retour vers l'application, alternative textuelle au canvas, meilleur score
  persistant. ⚠️ Pour *Le Lancer de tong*, le record est une **distance** et vit dans
  `meilleur`, pas dans `best` : la clé `mat-jeu-best-lancer-de-tong` stocke un flottant.

---

## [4.106] — 5 septembre 2026

### Ajouté
- **Le jeu du moment tourne tout seul avec les saisons.** Six jeux rejoignent
  *La Hotte* : *La Bataille de boules de neige* (janvier-février), *Les Bâtisseurs*
  (mars-avril), *Le Parcours VTT* (mai-juin), *Le Feu d'artifice* (juillet-août),
  *La Course d'automne* (21 octobre - novembre), *Où est le Père Noël ?* (décembre).
  - Le champ `courant` disparaît : chaque entrée porte une période `debut`/`fin` au
    format **JJ-MM, sans année** — elle se répète donc d'elle-même chaque année.
    Personne n'a rien à faire le 1er décembre. `forcer` épingle un jeu hors saison,
    et un `forcer` inconnu retombe sur le calendrier plutôt que de figer l'app.
  - ⛔ **Un trou ou un chevauchement dans le calendrier ne se verrait qu'une fois
    par an**, le jour où il tombe, et personne ne serait là pour le corriger. Le
    test balaie donc **les 366 jours d'une année bissextile** et refuse les deux.
  - Le service worker précache **tous** les jeux, plus seulement celui du jour : la
    bascule doit fonctionner hors connexion le jour venu. ~150 Ko pour sept jeux.
    Mise en cache fichier par fichier — avec un `await` unique, le premier 404
    emportait tous les suivants.
- **Le nombre de personnes qui jouent entre dans les statistiques quotidiennes.**
  Aucun mécanisme nouveau : `POST /stats/track` avec `service: 'jeu'`, le canal
  générique de MEL, de l'agenda et des déchets. Côté backend, un libellé ; côté
  admin, trois lignes (`SVC_LABELS`, `icons`, **et la liste `services`** — celle-là
  est explicite, un service absent n'apparaît pas dans le tableau de bord).
  - ⛔ **Ce qui est compté : l'ouverture, une fois par appareil et par jour** (clé
    `mat_jeu_compte`, qui porte le jour — une seule clé, et non une par jour qui
    s'empilerait). Le chiffre est donc un nombre de **personnes**, pas de clics.
  - ⛔ **Ce qui n'est pas compté** : score, durée, nombre de parties, jeu joué.
  - ⚠️ Le comptage vit **dans le lanceur, avant la redirection** — jamais dans un
    jeu. C'est ce qui permet aux fichiers de jeu de rester sans réseau et au
    contrôle « zéro requête pendant une partie » de rester vrai. Deux tests le
    verrouillent, dont un qui refuse `stats/track` dans le fichier d'un jeu.
  - ⚠️ Aucun identifiant n'est **créé** : on réutilise `mat_device_id_v1` s'il
    existe. Qui arrive par QR code sans avoir jamais ouvert l'app est compté sans
    identifiant. Le comptage suit le réglage « statistiques détaillées » de l'admin.

### Modifié
- **Les six jeux fournis ont été retouchés** — quatre lignes chacun, aucun
  changement de gameplay — pour tenir des promesses déjà faites : zoom rétabli
  (`user-scalable=no` retiré, RGAA 13.9), lien de retour vers l'application (sans
  lui, qui arrive par un QR code y est coincé), alternative textuelle au canvas, et
  meilleur score persistant (il vivait en mémoire et disparaissait au rechargement).
  ⚠️ Le contrôle du zoom lit **la balise `<meta viewport>`**, pas le fichier : le
  commentaire qui explique le retrait contient les mots « user-scalable=no », et un
  `grep` sur tout le fichier rougirait sur un commentaire.
- « Jeux précédents » devient **« Les autres jeux »** : avec une rotation annuelle,
  la moitié des jeux listés sont ceux des saisons *à venir*.
- Les liens de retour et les icônes des jeux passent en **relatif** (`../`) : une
  commune qui réplique l'app dans un sous-répertoire n'a rien à réécrire.

---

## [4.105] — 4 septembre 2026

### Modifié
- **La tuile « Le jeu du moment » ne nomme plus le jeu.** Elle affichait le libellé,
  puis le titre, puis la saison — quatre lignes avec la pastille, dans une tuile de
  demi-largeur. Elle porte désormais son seul libellé ; le titre et la saison restent
  affichés par le lanceur `/jeu`, et vivent toujours dans `jeux/jeux.json`. Le nom
  accessible du lien suit : il n'annonce plus le titre non plus — un lecteur d'écran
  ne doit pas dire ce que personne ne voit.
- ⚠️ **Effet de bord** : plus rien de visible ne prouve que `js/mat-jeu.js` a tourné.
  D'où **`data-jeu-pret`**, posé sur la tuile après hydratation, sur lequel les tests
  s'accrochent. Sans lui, ils mesuraient l'état de la pastille **avant** qu'elle soit
  décidée — vert ou rouge selon la vitesse de la machine, ce qui est la définition
  d'un contrôle qui ne mesure rien. (`waitForSelector` en `attached` et non `visible` :
  au-delà de 1024 px la grille du téléphone est masquée.)
- Voir **ADR-0037**, §« Mise à jour — v4.105 ».

---

## [4.104] — 4 septembre 2026

### Ajouté
- **« Le jeu du moment »** — un petit jeu communal, qui change au fil des saisons.
  Le premier est *La Hotte* (les vendanges).
  - **Route stable `/jeu`** (`jeu/index.html`), destinée à être imprimée sur des
    affiches et des QR codes : elle sert toujours le jeu courant, quel qu'il soit.
    C'est un **lanceur**, pas le jeu — sur un hébergement statique, une adresse fixe
    ne peut pas servir un fichier variable, il n'y a pas de serveur pour choisir.
    Il lit le manifeste et fait `location.replace()` (jamais `assign` : le retour
    arrière doit ramener à l'application, pas reboucler).
  - **`jeux/jeux.json`, source unique** : titre, saison, résumé, fichier, vignette,
    date, et `courant`. Publier le jeu suivant = déposer un fichier, ajouter une
    entrée, changer une ligne. **Aucun code à toucher.**
  - **Tuile d'accueil** avec pastille « Nouveau ». La mémoire de l'appareil est
    `localStorage['jeu-vu']`, un **identifiant** — pas une date : comparer des dates
    aurait rallumé la pastille sur toute la commune à la première coquille corrigée
    dans `publie`. La date ne sert qu'à ne rien annoncer avant elle.
  - **`/jeu/archives`** — les jeux des saisons passées, toujours jouables.
  - **Hors-ligne en trois couches** : précache de la coquille **et** du jeu que
    `courant` désigne (lu dans le manifeste à l'installation, jamais écrit en dur) ;
    manifeste servi **réseau d'abord, cache en secours** ; message `CACHE_JEU` du
    lanceur au service worker, pour qu'un jeu publié sans nouvelle version de l'app
    soit en cache dès sa première ouverture.
  - `tests/e2e/jeu.spec.js` — 13 contrôles, dont trois qui gardent les promesses :
    **aucun nom de jeu dans le code** (échoue si le titre courant apparaît dans
    `index.html` ou son identifiant dans `service-worker.js`), **aucune requête
    réseau pendant une partie** (mesurée, doigt sur l'écran, trois secondes), et
    **aucun jeu du manifeste ne dépend du réseau** — y compris ceux qui n'existent
    pas encore.
  - Voir **ADR-0037**.

### Modifié
- **La tuile « Contacter vos élus » de l'accueil mobile a cédé sa place au jeu.**
  Elle appelait `openContact()` — exactement comme le bandeau « Mairie » en haut du
  même écran. Doublon signalé par le porteur. L'écran reste atteignable depuis ce
  bandeau, depuis la mise en page bureau et depuis le plan du site.
- **Le meilleur score du jeu est passé en `localStorage`** (`mat-jeu-best-<id>`) : il
  vivait en mémoire et disparaissait à chaque rechargement. Une clé par jeu — le jeu
  suivant ne doit pas effacer le record du précédent. Rien n'est envoyé nulle part.
- **`maximum-scale=1,user-scalable=no` retiré** du `<meta viewport>` du jeu :
  interdire le zoom est un défaut RGAA 13.9. `touch-action:none` suffit à empêcher le
  double-tap et le pincement de gêner la partie.
- **Plan du site (RGAA 12.3)** — `js/mat-plan-site.js` liste désormais des **pages**
  autonomes en plus des écrans (`PLAN_PAGES`, rubrique « Se détendre »). `/jeu` n'est
  pas un `.ov` : le relevé automatique des écrans ne pouvait pas le voir, et le plan
  l'aurait ignoré en silence. ⚠️ C'est le seul endroit du plan où un intitulé est
  **recopié** — on ne peut pas lire le titre d'un autre document ; deux tests
  vérifient qu'il ne diverge ni de `PLAN_PAGES` ni de la tuile d'accueil.
- **`tests/e2e/static-server.js` résout les index de répertoire**, comme GitHub Pages
  (`/jeu/` → `jeu/index.html`, `/jeu` → 301 vers `/jeu/`). Sans cela `/jeu/` renvoyait
  404 **dans les tests seulement** : un contrôle qui échoue là où la production marche
  apprend à se méfier du signal.

### Connu, et assumé
- **La mise en page bureau (≥ 1024 px) n'a pas de point d'entrée dédié vers le jeu** :
  la grille du téléphone y est masquée, l'accès se fait par le plan du site en pied de
  page. Choix explicite, à revoir avec une carte dans la colonne de droite.
- **Un jeu publié sans nouvelle version de l'application n'est pas jouable hors
  connexion avant d'avoir été ouvert une fois.** Le service worker en place ne rejoue
  pas son `install`. Pour le précacher d'emblée, bumper `CACHE` (et donc le numéro
  affiché).

---

## [4.103] — 1er septembre 2026

### Corrigé
- **Le bandeau « serveur très sollicité » recouvrait le bouton « Installer ».**
  `#mat-server-banner` était en `position:fixed;top:0;left:0;right:0` : pendant
  ses 20 secondes, il masquait **entièrement** le bouton d'installation et sa
  croix de fermeture. Cas typique : la toute première visite, quand l'hébergement
  gratuit sort de veille — l'habitant voit le bouton, le vise, rien ne se passe.
  Passé en `position:sticky;top:0`, il occupe sa place au lieu de passer par-dessus.
  Trouvé par le contrôle **WCAG 2.4.11**, pas par un signalement.

### Ajouté
- **Anticipation du RGAA 5** (attendu fin 2026, il intégrera les WCAG 2.2,
  publiées depuis 2023). Les deux nouveaux critères AA mécaniquement mesurables
  sont traités :
  - **2.5.8 Taille de la cible** — 9 cibles sous 24 px agrandies par du
    `padding` : liens des deux pieds de page, adresses e-mail des panneaux, lien
    « aucune actualité », attribution Leaflet, croix de la bannière
    d'installation. **Le libellé ne bouge pas**, seule la zone touchable grandit ;
    aucun débordement horizontal de 320 à 1440 px.
  - **2.4.11 Focus non masqué** — un seul défaut, le bandeau ci-dessus.
- `tests/e2e/cible-taille.spec.js` — les deux contrôles, **mis en défaut par
  sabotage** avant d'être retenus. Le contrôle de 2.5.8 a d'abord dû être rendu
  **déterministe** : il concluait au vert lancé seul et au rouge dans la suite
  complète, sur la même application, parce que l'exception d'espacement dépendait
  de l'état de la page. La bannière est maintenant dépliée de force et une
  assertion de couverture refuse de conclure sans avoir examiné `.ib-x`.

> **Le taux RGAA 4.1 reste à 100 %** : rien de tout cela n'est un critère du
> référentiel en vigueur. C'est une avance prise, pas une mise en conformité.

---

## [4.102] — 31 août 2026

### Corrigé
- **Les réponses de la mairie à un signalement cessaient d'arriver après une
  rotation d'endpoint push, définitivement et en silence.** Le backend est
  pourtant conçu pour ce cas : sur 410/404 il garde le token et met
  `sub = null`, en comptant sur le frontend pour le re-raccorder. Ce
  re-raccordement n'avait jamais lieu, pour deux raisons indépendantes.
  Voir **ADR-0034**.
- **`checkAndRenewPushSubscription()` sortait sur `mat_push_active` avant de
  re-raccorder les tokens.** Ce drapeau n'est posé que par le menu
  « Notifications » et le prompt post-installation : un habitant ayant activé
  les alertes depuis le **formulaire** d'un signalement ne l'a jamais — c'est la
  définition d'un abonnement « réponse uniquement ». Le garde-fou filtrait donc
  exactement la population qu'il désignait, et emportait la seule opération dont
  elle dépendait.
- **Le handler `pushsubscriptionchange` du service worker ignorait
  `/notify/register-token`.** Il re-synchronisait actus, déchets et météo. C'est
  le cas le plus fréquent : la rotation survient typiquement application fermée.

### Ajouté
- **Les tokens de suivi transitent par le Cache API** sous `mat-notify-tokens` —
  un service worker n'a pas accès au `localStorage`. Même mécanisme que
  `mat-push-prefs` pour les préférences de canal.
- **Repli local `_registerNotifyTokensSafe`** : `mat-pwa-notif.js` est injecté par
  `mat-boot.js` et ne peut pas tenir `_registerPendingNotifyTokens`
  (`mat-actus.js`) pour acquis. Le `typeof … === 'function'` qui l'entourait
  sautait l'opération en silence (ADR-0032).
- **`scripts/check-notify-relink.js`**, lancé par la CI : verrouille l'ordre
  appel/garde-fou, la présence de `/notify/register-token` dans le handler, et
  l'identité de la clé de cache des deux côtés. Un test de bout en bout est
  impossible (service worker bloqué sous Playwright, ADR-0006 ;
  `pushsubscriptionchange` déclenché par le navigateur des semaines plus tard).
  Le script a verdi à tort sur deux sabotages sur trois avant d'être corrigé —
  `indexOf` trouvait la déclaration au lieu de l'appel, et
  `'mat-notify-tokens-v2'.includes('mat-notify-tokens')` vaut `true`.

---

## [4.101] — 31 août 2026

### Corrigé
- **Le bandeau « Carburant » présentait un relevé vieux de plusieurs jours comme
  un prix du jour.** Les prix viennent du relevé national
  (`data.economie.gouv.fr`), que chaque station alimente quand elle le veut :
  celui de l'Intermarché de Cléry avait pris du retard, et rien dans le bandeau
  ne permettait de le voir. L'écran détaillé portait pourtant déjà
  « Mis à jour le … » pour les cinq stations — l'information existait, elle ne
  remontait pas là où la décision se prend. Voir **ADR-0033**.

### Ajouté
- **La date du relevé, sur la ligne du nom** : « Intermarché Cléry 24/08 ».
  Aucune ligne supplémentaire — le bandeau partage sa rangée avec celui du bus
  Rémi. La ligne dépassant de 9 px sur un écran de 360 px, elle est découpée en
  deux `<span>` en `flex` : le **nom** porte l'ellipse et cède la place, la
  **date** est en `flex-shrink:0` et ne se tronque jamais (sans quoi l'ellipse
  aurait mangé exactement l'information ajoutée).
- **La station affichée n'est plus figée sur Cléry** : tant que son relevé est le
  plus récent connu, c'est elle (la plus proche). Sinon, le bandeau montre la
  **moins chère parmi les stations au relevé le plus récent**, avec son nom et sa
  date. Les cinq stations restent consultables d'un appui.
- `tests/e2e/carburant-fraicheur.spec.js` — six cas servis depuis un payload
  `/carburant` fabriqué (les tests tournent sans backend), dont la mesure du
  rendu (`scrollWidth` / `clientWidth`) qui interdit de tronquer la date, et un
  payload de l'ancien backend, sans `majISO`.
- `docs/adr/0033-un-prix-sans-sa-date-est-un-prix-du-jour.md`.

### Modifié
- **Backend** : `GET /carburant` expose `majISO` (horodatage brut) à côté de
  `maj` — une chaîne « JJ/MM HH:MM » **sans année**, incomparable d'une station à
  l'autre. Cache Redis `mat:carburant:v7` → `mat:carburant:v8`, la clé devant
  suivre la forme du payload.
- Suppression de la règle CSS `.fuel-maj`, jamais utilisée, et dont le blanc à
  40 % n'aurait pas passé le critère RGAA 3.2 sur le fond vert du bandeau.

---

## [4.100] — 31 août 2026

### Corrigé
- **La carte « Prochaine manifestation » annonçait « Demain » un événement du
  jour.** Le 31 août 2026 à 7 h 28, le conseil municipal du 31 août à 19 h était
  présenté comme étant le lendemain — sous la date « 31 AOÛT », affichée juste
  au-dessus. Le calcul était
  `Math.ceil((debut - maintenant) / 86400000)` : un écart de 11 h 32 donne
  0,48 jour, arrondi au-dessus. Ce quotient mesure une **durée** quand le libellé
  parle de **dates** ; aucun arrondi ne le rattrape (`Math.floor` produit la
  faute symétrique le soir pour un événement du lendemain matin).
  Le calcul passe désormais par `matDaysUntil` / `matDaysLabel`
  (`js/mat-utils.js`), qui ramènent les deux dates à **minuit local**.
  La version bureau était déjà juste : c'est la double implémentation qui a
  laissé le bug vivre — `js/mat-desktop.js` **délègue** maintenant au helper
  partagé. Voir **ADR-0031**.
- **Sentry #425 — `ReferenceError: isStandaloneMode is not defined`** sur la
  première ligne de `checkFirstStandaloneRun` (`js/mat-pwa-notif.js`). Ce fichier
  est **injecté** par `mat-boot.js` et appelait une fonction de `mat-core.js` :
  un seul `.js` manquant (cache partiel du service worker, requête coupée) rendait
  l'appel impossible. Le plantage emportait d'un coup le drapeau d'installation
  (la bannière « Installer » revenait chez quelqu'un qui avait déjà installé),
  le comptage des installations, et la proposition d'activer les alertes —
  **sans rien afficher**. Repli local côté appelant
  (`_isStandaloneModeSafe`, via `typeof`, qui ne lève pas sur un identifiant non
  déclaré) et point d'entrée publié côté `mat-core.js`. Voir **ADR-0032**.

### Ajouté
- `tests/e2e/prochaine-manifestation.spec.js` — sert un agenda iCal fabriqué
  (les tests tournent sans backend) et vérifie les quatre cas qui piégeaient
  l'ancien calcul, dont l'événement du jour à **23 h 59**, celui où la durée
  restante frôle 24 h. Les 8 tests (2 projets) échouent sur l'ancien code.
- `docs/adr/0031-compter-des-jours-de-calendrier-pas-des-durees.md` et
  `docs/adr/0032-un-script-injecte-ne-peut-pas-tenir-ses-dependances-pour-acquises.md`.

---

## [4.99] — 29 août 2026

### Corrigé
- **La déclaration d'accessibilité se contredisait, en production.** Elle
  annonçait « Sur les 65 restants : 65 conformes. Aucune non-conformité ne
  subsiste » — puis, six lignes plus bas, « *Les deux non-conformités qui restent
  à traiter :* » avec les deux chantiers déjà clos et des échéances 2027, et
  concluait « une fois tout traité, le taux atteint 100 % ».
  Le plan d'action publié affiche désormais ce qu'il est réellement devenu : un
  **plan de maintien** (empêcher le taux de redescendre, remesurer à la parution
  du RGAA 5, envisager un audit externe, recueillir l'avis d'usagers en situation
  de handicap). La date de mise à jour de la déclaration passe au 29 août 2026 —
  elle disait encore le 27, avant les trois versions qui l'ont changée.
- Mêmes corrections dans `docs/accessibilite/schema-pluriannuel.md`, dont le
  tableau « Plan d'action » listait encore 10.5 à traiter pour le T2 2027, sous
  un titre « Aucune non-conformité restante ».

### Leçon — un contrôle qui compare deux textes ne regarde pas à l'intérieur d'eux
Le test écrit la veille (v4.98) comparait le **mot** « totalement conforme » entre
le pied de page et la déclaration. Les deux disaient la même chose : il est passé
au vert. La contradiction était **à l'intérieur** de la déclaration, là où il ne
regardait pas. C'est le porteur qui l'a vue, pas un test — et le texte était déjà
en ligne.

Une déclaration d'accessibilité est un **document opposable**. Qu'elle se
contredise est plus grave qu'une couleur trop pâle : elle devient inutilisable
pour l'habitant qui veut savoir à quoi s'en tenir, et indéfendable pour la mairie
si on la lui oppose.

`tests/e2e/mention-accessibilite.spec.js` vérifie désormais la **cohérence interne**
de la déclaration : à 100 %, elle ne peut porter aucune tournure annonçant un
chantier restant (« restent à traiter », « une fois tout traité »…), et son
décompte doit s'additionner (« sur les N restants : N conformes »).

Deux sabotages vérifiés, dont le plus utile : **remettre le texte exact qui était
parti en production** → rouge. Puis un décompte incohérent (65 applicables,
64 conformes, mais « totalement conforme ») → rouge.

---

## [4.98] — 29 août 2026

### Ajouté
- **La mention « Accessibilité : totalement conforme » en pied de page**, sur
  chaque écran, dans les deux mises en page (mobile et bureau — le pied de page
  bureau *remplace* celui du mobile à partir de 1024 px, la mention doit donc
  exister aux deux endroits). Un clic ouvre la déclaration, **dépliée**.
  Ce n'est pas une décoration : le **décret n° 2019-768** impose cette mention
  sur la page d'accueil, atteignable depuis chaque page. Elle vivait jusqu'ici à
  trois clics, repliée dans l'écran ♿ Personnalisation — l'application était
  donc conforme à 100 % **sans le dire là où le droit l'exige**.
  Le libellé est celui du décret, pas une reformulation.
- `tests/e2e/mention-accessibilite.spec.js`.

### Ce que le test garde vraiment
Pas « la mention existe » — **que la mention et la déclaration ne divergent
pas.** Le jour où le taux redescend, la déclaration changera ; la mention, écrite
en dur dans `index.html`, resterait « totalement conforme » sans que rien ne
bronche. Un pied de page qui ment sur la conformité est pire que pas de mention
du tout : c'est une affirmation publique fausse, sur un point de droit. Le test
lit le niveau dans les deux endroits et refuse qu'ils diffèrent.

Il vérifie aussi que la mention **déplie** la déclaration. L'écran Accessibilité
est monté paresseusement (`data-lazy-ov`) : `#decl-a11y` n'existe pas avant
l'ouverture. Une version naïve ouvrait donc l'écran sans déplier ce que la
mention annonce — et un contrôle qui se contente de « l'écran s'ouvre » ne
l'aurait jamais vu.

Trois sabotages vérifiés : mention passée à « partiellement conforme » alors que
la déclaration dit 100 % → rouge ; mention retirée du pied mobile → rouge ;
mention qui ouvre l'écran sans déplier → rouge.

### Mesuré
Aucun débordement horizontal de 320 à 1440 px — le pied mobile passe de 108 à
131 px à 320 px, la mention prenant sa propre ligne. C'est le même piège qu'en
v4.93, où l'ajout d'un troisième lien avait fait déborder le pied de page à
320 px : réparer un défaut d'accessibilité en en créant un autre.

---

## [4.97] — 29 août 2026

### Corrigé
- **Critère RGAA 10.5 levé — l'application est totalement conforme, 100 %.**
  C'était la dernière non-conformité, chiffrée par l'audit à « ≈ 356
  emplacements (91 règles CSS, 265 styles en ligne) qui ne posent que le fond
  OU que le texte ». **Ce chiffre était faux, et c'est cet audit qui l'avait
  produit.**
  Les tests 10.5.1 et 10.5.2 portent une note qui change tout : la couleur
  manquante peut venir d'un **élément parent**, « au moins par héritage ». Le
  référentiel n'exige pas que les deux propriétés soient posées sur le même
  sélecteur. Compter chaque règle posant l'une sans l'autre revenait à compter
  des centaines de fois un problème qui n'existe presque nulle part : la bonne
  unité n'est pas la **déclaration**, c'est l'**élément rendu**.
  Mesuré sur les 29 écrans, dans les deux mises en page : **0** texte sans
  aucun fond déclaré dans sa chaîne, et **9** dont le fond ne venait que de
  `body` — les sept intitulés de rubrique de l'accueil (`.sec`), les intitulés
  de colonne du bureau (`.d-col-titre`) et le message d'attente (`.d-loading`).
  **Trois règles CSS.** Elles déclarent désormais la couleur RÉELLEMENT peinte
  derrière elles (`var(--warm)`, qui suit le thème), pas un `transparent` qui
  satisferait la lettre du critère sans protéger personne.
- **Le mode daltonisme clignotait à chaque ouverture.** Le script anti-flash en
  tête d'`index.html` lisait `saved.daltonien` là où l'application écrit
  `colorblind` : le mode n'était donc JAMAIS appliqué avant le premier rendu, et
  l'habitant qui l'a choisi voyait la palette verte lui passer sous les yeux à
  chaque lancement. Il s'appliquait bien ensuite, par `loadAccessibilite()` —
  c'est ce qui rendait le défaut invisible à la relecture comme aux tests.

### Ajouté
- `tests/e2e/declarations-couleur.spec.js` — les deux sens du critère, sur les
  29 écrans : chaque texte peint repose-t-il sur un fond déclaré ? aucun ne
  dépend-il de `body` (lecture sévère) ? la racine déclare-t-elle bien les deux
  propriétés, `color` étant héritée ?

### Leçon — un test qu'on ne sait pas faire rougir est un test dont on ne sait rien
Le contrôle « chaque texte repose sur un fond déclaré » **résiste au sabotage** :
même en retirant les trois déclarations de fond de `html` et `body` dans la
feuille de style, la racine en garde une — le script anti-flash pose
`documentElement.style.background` avant le chargement du CSS.

Plutôt que de garder un test dont la sensibilité n'est pas démontrable, on
vérifie le **mécanisme** : sur un élément détaché, sans fond nulle part, le
détecteur doit rendre « aucun » ; sous un parent qui pose un fond, il doit
s'arrêter à ce parent. C'est un auto-contrôle du détecteur, pas du produit — et
c'est précisément ce qui manquait aux six contrôles qui ont verdi à tort au fil
de cet audit. Les deux autres contrôles, eux, ont été mis en défaut par
sabotage : retirer le fond de `.sec` fait échouer la lecture sévère ; retirer
celui de `html` et `body` fait échouer 10.5.2.

### Bilan de l'audit
**106 critères, 41 non applicables, 65 applicables — 65 conformes.** Mention
**totalement conforme**. Le schéma pluriannuel devient un plan de *maintien*.
Au passage, cet audit aura vu **six contrôles verdir à tort** et **deux rougir à
tort** ; chaque passe en documente la cause, parce que c'est la seule chose qui
empêche le taux de redescendre en silence.

---

## [4.96] — 29 août 2026

### Corrigé
- **Critère RGAA 3.2 levé.** Les 29 écrans tiennent le seuil dans les **cinq
  rendus livrés** — normal, daltonisme, contraste élevé, thème bleu, thème
  sombre — et dans les **deux mises en page**, téléphone et ordinateur. Taux
  de conformité : **96,9 % → 98,5 %**.
- **Le thème sombre n'affichait pas du texte peu lisible : il ne l'affichait
  pas.** Sur l'écran des bus Rémi, les jours (« samedi 29 août ») et les noms
  d'arrêts étaient à **1,01:1** — du noir sur du noir.
  **Cause structurelle :** `--forest` et `--leaf` sont des verts foncés dans la
  palette claire, parfaits comme couleur de TEXTE sur du blanc. Le thème sombre
  les redéfinit en couleurs de FOND (#111827, #1f2937). Toute règle qui les
  employait en texte devenait invisible dès qu'on activait ce thème. Le miroir
  existait aussi : des fonds CLAIRS posés en style inline (#f0f8f3, #e8f5e9,
  `white`) qu'aucune règle de thème ne pouvait atteindre sans `!important`,
  sous du texte clair, à 1,02:1.
- **Le thème bleu : 26 textes, un seul jeton.** `--leaf` valait `#2563eb` et
  servait de couleur de texte sur `--mist` (`#dbeafe`) : 4,24:1. Intitulés,
  en-têtes de tableau, liens du RGPD, badges de l'écran Rémi — tous dus à cette
  unique paire. `#1b4fca` les lève d'un coup.
- **Le bouton « Bloquées » des notifications** (blanc sur `#ef4444`, 3,76:1) et
  le **hero de la mise en page bureau** passent aussi le seuil.
- Trois couleurs qui vivaient en style INLINE dans le JS — message d'erreur,
  lien dépliant de l'écran Rémi, chevron des bacs — passent en **classes**
  (`.mat-erreur`, `.remi-summary`, `.tri-chev`), pour que les thèmes puissent
  les reprendre. Une couleur inline est hors de portée de tout thème.

### Ajouté
- `tests/e2e/contraste-global.spec.js` — un test qui ouvre **les 29 écrans** et
  balaie **les cinq rendus**. L'accueil seul ne prouvait pas grand-chose : le
  bouton « Bloquées » n'apparaît que si le navigateur a refusé les
  notifications, et aucun balayage de l'accueil ne le rencontre.

### Leçon — un contrôle peut aussi rougir à tort
Les trois quarts du temps de cette version sont partis à poursuivre des défauts
qui n'existaient pas. Trois défauts de l'outil de mesure, pas du produit :

1. **Un dégradé se mesure là où le texte est, pas sur toute sa longueur.** Le
   bandeau d'accueil finit sur un orange de coucher de soleil — mais cet orange
   est tout en bas, SOUS les cartes opaques. Aucun texte ne s'y pose jamais.
   4 faux défauts sur le thème bleu. Le balayage projette désormais le
   rectangle du texte sur l'axe du dégradé.
2. **`getComputedStyle` peut rendre une valeur périmée.** Sur une page portant
   déjà 29 écrans, changer la classe de thème ne suffit pas : Chrome diffère le
   recalcul et la mesure lit l'ANCIENNE palette. 8 faux défauts, sur des règles
   dont on a vérifié — en interrogeant le navigateur règle par règle — qu'elles
   s'appliquaient correctement. Sans cette vérification, on corrigeait du code
   qui n'avait rien.
3. **Un fond invisible peut être la seule façon de dire la vérité.** La photo du
   hero bureau est une couche SŒUR en position absolue, pas un fond d'ancêtre :
   remonter le DOM donne « blanc sur crème », à 1,19:1. Excepter l'élément
   aurait rendu le contrôle aveugle à un vrai défaut futur. `.d-hero` porte donc
   un `background` égal au pire cas mesuré du voile (`#425e50`) — jamais
   visible, entièrement recouvert, et qui rend l'écran mesurable.

Quatre sabotages vérifiés : `--leaf` du thème bleu remis à `#2563eb`, les titres
Rémi rendus au thème sombre, `.d-hero` privé de son fond, le bouton « Bloquées »
rendu à son rouge clair. Chacun fait échouer la suite.

**Et une cinquième fois la même leçon, en CI.** La première version de ce test
basculait la classe de thème sur une page déjà peinte, puis forçait la purge du
style. Cela suffisait sur une machine de développement et **pas sur le runner de
CI**, plus lent : le test est passé rouge à sa première exécution distante, sur
les mêmes faux défauts. Un test à moitié déterministe est un test qui ment une
fois sur deux. Chaque rendu est désormais mesuré sur une **page rechargée dans
ce rendu**, le réglage écrit dans `mat_accessibility` — exactement comme un
habitant qui a choisi son thème. Trois exécutions consécutives, deux sabotages
re-vérifiés.

### Reste ouvert
Le critère **10.5** (≈ 356 emplacements qui ne posent que le fond **ou** que le
texte) est la dernière non-conformité. Le traiter porte le taux à **100 %**.

---

## [4.95] — 29 août 2026

### Corrigé
- **Critère RGAA 3.2 — les contrastes.** Le rendu par défaut de l'application
  passe de **0 texte conforme** sur ses quatre bandeaux d'accueil à **zéro
  défaut** sur l'accueil et les 28 écrans, dans les trois rendus livrés par
  défaut (normal, **daltonisme**, **contraste élevé**).
  **Ce qui échouait**, et pourquoi personne ne le voyait :
  - `rgba(255,255,255,.72)` **n'est pas du blanc.** Sans compositage sur le
    fond, la feuille de style dit « blanc sur bleu » et rassure ; l'écran
    affiche du gris clair. Le titre « Prochaine manifestation » était à
    **1,73:1** pour un seuil de 4,5.
  - **Un dégradé n'a pas deux couleurs, il en a un continuum.** `#2563eb`
    passait ; `#38bdf8`, à l'autre bout de la *même* carte, tombait à 1,73:1.
  - **Un voile clair sur fond sombre éclaircit.** `rgba(255,255,255,.16)` sous
    la pastille « Aucune alerte » était le point le plus faible de toute
    l'application (**1,91:1**) — et invisible dans le code : texte `#fff`,
    voile `#fff`, tout paraît cohérent. Six autres panneaux avaient le même
    voile. Ils portent désormais un voile **sombre**, la teinte du panneau
    étant tenue par son liseré ; deux points de contraste gagnés d'un coup.
  - **axe-core ne conclut pas** sur du texte posé sur un dégradé : il le range
    dans `incomplete`. Le rapport « 0 violation » ne disait rien de ces
    **136 nœuds**.
- **Les libellés des bacs.** « Bac noir » en `#111` (3,76:1) et « Bac jaune »
  en `#facc15` (**1,49:1**) tiraient dans le sens **inverse** des textes blancs
  de la même carte : le noir veut un fond clair, le blanc un fond sombre.
  Aucun réglage du dégradé ne satisfaisait les deux. Le repère de couleur est
  passé sur les **pastilles rondes** (non-texte, seuil 3:1, tenu à 3,11:1) ;
  le libellé, qui dit déjà « Bac noir », est passé en crème.
- **La croix de fermeture (`.panel-close`), présente sur les 29 écrans**, était
  à 3,38-3,55:1. Opaque, sur voile sombre : ≥ 6,4:1.
- **Le mode « contraste élevé » était moins lisible que le mode normal** sur
  deux tuiles : il forçait leur libellé en noir par-dessus un dégradé coloré
  posé en style *inline* (2,82:1 et 2,84:1). Il rend maintenant vraiment du
  noir sur blanc.
- **Hero de la mise en page bureau** : texte blanc sur une photographie que la
  mairie peut remplacer. Le voile est dimensionné pour le **pire cas absolu**
  (un pixel blanc sous `brightness(.82)`) et non sur les pixels d'aujourd'hui —
  sinon l'accessibilité devient otage du prochain changement d'image. À 0,78
  sur la moitié gauche : blanc **7,16:1**, vert d'eau **5,58:1**, quelle que
  soit la photo.

### Ajouté
- `tests/e2e/contraste-bandeaux.spec.js` — les quatre cartes, élément par
  élément, en normal **et** en daltonisme : balayage du dégradé sur 51 points,
  compositage des alphas, seuil 4,5:1. Plus un contrôle que les pastilles de
  couleur tiennent le seuil non-texte, et un garde-fou de forme contre le
  retour d'un texte semi-transparent. Cinq sabotages vérifiés.
- `tests/e2e/contraste-global.spec.js` — le balayage **générique** : tout le
  texte peint, sans liste d'éléments à tenir à jour, dans les trois rendus.
  C'est lui qui a trouvé les 15 défauts que personne n'avait listés.

### Leçon — sixième occurrence de « un contrôle qui ne mesure rien verdit »
Le premier test de non-régression écrit pour cette passe est resté **vert** avec
`.ib-x` ramené à **2,00:1** : la bannière d'installation ne s'affiche jamais sous
Playwright — le navigateur n'y propose pas l'installation — donc **ses règles ne
sont peintes dans aucun test**. `contraste-global.spec.js` la déplie maintenant
de force, et échoue si elle n'est pas peinte.

Deux réglages du balayage ont chacun coûté une passe à blanc :
- Écarter « tout ce qui n'a ni lettre ni chiffre » pour ignorer les emoji est
  **trop large** : `✕`, `→`, `▼` sont du texte ordinaire, peint par `color`.
  C'est ce filtre qui masquait la croix de la bannière et `.panel-close`.
- Sauter les couches semi-transparentes fait mesurer le fond d'un ancêtre
  lointain et **invente** des défauts (`.c3d-statut`, alpha 0,93) ; s'y arrêter
  en fait **manquer** de vrais (les panneaux à voile). Il faut les compositer.

### Reste ouvert
Le critère 3.2 **n'est pas levé** : les deux thèmes de couleur optionnels
« bleu » (30 textes) et « sombre » (68) et la mise en page bureau hors de son
hero échouent encore. Le taux RGAA reste donc à **96,9 %** — mais ce que voit un
habitant qui n'a rien réglé est conforme, et deux tests l'empêchent de repartir.

---

## [4.94] — 28 août 2026

### Corrigé
- **Depuis le plan du site, la moitié des écrans s'ouvraient VIDES.** Signalé en
  production par le porteur, captures à l'appui : « Conseil municipal » sans
  aucun élu, « Je viens d'emménager » bloqué sur « Chargement… ».
  **Cause :** `openOv(id)` ne pose que la coquille. C'est la fonction dédiée de
  chaque écran qui va chercher le contenu — `openConseil()` fait `openOv('conseil')`
  **puis** `buildTrombi()`. Le plan appelait `openOv` directement, donc la
  seconde moitié n'arrivait jamais.
  **Correctif :** `PLAN_OUVERTURE` déclare la fonction d'ouverture de chaque
  écran, et `_ouvrirEcran()` l'appelle. Une déclaration peut porter des
  arguments (`['openSuivi', 'signalements']`) : `openSuivi()` sans type reste
  précisément bloqué sur « Chargement… ».
  ⚠️ Ces fonctions sont **enveloppées pour les statistiques**
  (`window.openMel = () => { _track('mel'); _origOpenMel(); }`). Il faut donc
  résoudre `window[nom]` **au moment du clic** — une référence prise au
  chargement court-circuiterait le comptage.

### Ajouté
- `tests/e2e/plan-du-site.spec.js` — deux contrôles de plus, et une leçon.
  - **`_ouvrirEcran appelle bien la fonction dédiée`** : remplace chaque
    fonction déclarée par un espion, appelle `_ouvrirEcran`, vérifie l'appel
    **et ses arguments**. Vérifié par sabotage : il rougit en nommant
    `mel → openMel` et `conseil → openConseil`.
  - **`chaque lien ouvre un écran RENSEIGNÉ`** : ouvre les 27 écrans du plan et
    refuse un écran resté sur « Chargement… ».
  ⚠️ **Ce second test, écrit en premier, ne suffisait pas — et je l'ai su parce
  que je l'ai saboté.** Avec le bug réintroduit, il restait VERT : un écran non
  rempli garde son gabarit et franchit n'importe quel seuil de « nombre
  d'éléments » (« Conseil municipal » vide affiche encore sa consigne
  « Cliquez sur une photo »). Mesurer le résultat ne suffisait pas ; il fallait
  vérifier **le contrat** — la fonction est-elle appelée. Un test de
  non-régression qu'on n'a pas vu échouer ne prouve rien.
  ⚠️ Sa première version cherchait le contenu dans `.panel-body` : MEL, la carte
  3D et le majordome ont leur propre gabarit (`mel-panel`, `c3d-panel`,
  `majordome-panel`) et n'en ont pas. Elle les déclarait vides à tort. Le
  contrôle doit épouser l'application, pas l'inverse.

### Non modifié
- Taux de conformité RGAA : **96,9 %** inchangé. Le plan du site satisfaisait
  déjà 12.1, 12.3 et 12.4 en tant que structure ; c'est son comportement qui
  était fautif.

---

## [4.93] — 28 août 2026

### Ajouté
- **Écran « Plan du site »** (RGAA 12.1, 12.3, 12.4) — `js/mat-plan-site.js`,
  overlay `ov-plansite`, accessible depuis le pied de page **de chaque écran**.
  Le `<nav>` de l'application étant **masqué sur téléphone**, il n'existait
  qu'un seul chemin vers chaque écran : sa tuile sur l'accueil. Le plan apporte
  le second, et satisfait les trois critères d'un coup.
  ⚠️ **Ses intitulés ne sont écrits nulle part.** Ils sont lus à l'ouverture
  dans le `.panel-title` de chaque écran. Une liste recopiée aurait divergé au
  premier intitulé modifié, en silence — la classe d'erreur qui a déjà mordu ce
  dépôt sur les associations, la fibre et l'arbre MEL. Seul le **classement par
  rubrique** est déclaré à la main (`PLAN_RUBRIQUES`), avec une liste explicite
  d'écrans écartés et leur raison (`PLAN_ECARTES`).
  ⚠️ Une tuile d'accueil **n'aurait pas satisfait 12.4** : elle disparaît dès
  qu'on ouvre autre chose. Le pied de page est le seul endroit présent partout.
- `tests/e2e/plan-du-site.spec.js` — **échoue si un écran n'est ni classé ni
  explicitement écarté**, et si un identifiant classé ne correspond à aucun
  écran. Oublier un écran devient impossible en silence : c'est ce qui protège
  la « pertinence » qu'exige 12.3. Le test a servi immédiatement — il a rejeté
  sept identifiants devinés au lieu d'être relevés (`actus` pour `notifs`,
  `bugs` pour `bug`, `associations` pour `assoc`…). Écrit après coup, il
  n'aurait rien trouvé.

### Corrigé
- **RGAA 9.1 et 9.3 — l'accueil a enfin une structure, sans bouger d'un pixel.**
  Sur téléphone, il ne portait **aucun titre**, d'aucun niveau : la navigation
  par titres, celle qu'utilise toute personne aveugle pour survoler une page, ne
  faisait rien.

  | Élément | Avant | Après |
  |---|---|---|
  | Titre de la page | *aucun* | `<h1>` — **le titre qui était déjà là** |
  | Intitulés de rubrique | 7 × `<div class="sec">` | 7 × `<h2 class="sec">` |
  | Grilles de tuiles | 7 × `<div class="grid2">` | 7 × `<ul>`, 16 tuiles en `<li>` |

  Le `h1` n'est **pas** un titre ajouté : c'est « Mézières Avec Toi », en haut du
  bandeau depuis toujours, écrit `<div class="mat-title">`. Signalé par le
  porteur alors que la proposition était d'en ajouter un nouveau — promouvoir
  l'existant est plus juste et ne coûte rien. Même correctif que `partager.html`
  en première passe de l'audit.

  ⚠️ **Trois `margin:0` et un `list-style:none` portent tout le rendu.** Un
  `<h1>` apporte 0,67 em de marge, un `<h2>` 0,83 em, un `<ul>` une marge
  verticale, 40 px d'indentation et des puces — que les `<div>` n'avaient pas.
  Sans ces neutralisations posées dans `mat.css` **dans le même commit**,
  l'accueil se serait décalé partout. Le `<li>` devenant l'élément de grille,
  `.grid2 > li{display:flex}` et `.card{height:100%}` préservent l'égalité des
  hauteurs de rangée. C'est le piège des tuiles de la v4.91, en plus large.

  **Vérifié :** la zone de contenu rendue donne la **même empreinte de fichier**
  qu'avant modification (`230a35590f51e51e…`) et la page fait **1836 px dans les
  deux cas**.

### Modifié
- **Pied de page** — seul changement visible de cette version. Sur téléphone, le
  libellé « MAT · Mézières-lez-Cléry » cède sa place au lien « Plan du site », et
  les trois liens se centrent sur une ligne. Aucune information perdue : ces deux
  noms sont exactement le `h1` du bandeau.
  Mesuré : **88 px avant, 88 px après** en 412 et 360 px de large ; **129 → 111 px**
  en 320 px, où le libellé passait à la ligne — le pied y est donc **plus court
  qu'avant**. Aucun débordement horizontal.
  ⚠️ Une première tentative ajoutait simplement un troisième lien à la suite :
  elle **faisait déborder le pied de page horizontalement à 320 px**. Réparer un
  défaut d'accessibilité en en créant un autre — mesuré avant d'être commité.
  Sur ordinateur, le lien s'ajoute aux liens de pied existants ; le libellé y reste.
- **Taux de conformité RGAA : 89,2 % → 96,9 %** (63 conformes sur 65 applicables).
  Mention inchangée : **partiellement conforme** — elle ne change qu'à 100 %.
  Non-conformités restantes : 7 → **2** (critères 3.2 et 10.5).
- Audit (§ Septième passe, tableau des 106 critères, décompte, taux), schéma
  pluriannuel, déclaration publiée dans l'app et `CLAUDE.md` mis en phase.

---

## [4.92] — 28 août 2026

### Corrigé
- **Le pied de page affichait « ♿ Accessibilité 100 » pendant que la déclaration
  publiée annonçait 89,2 %.** Deux chiffres contradictoires sous les yeux des
  habitants, et le plus flatteur des deux n'engageait rien.
  Le score lui-même est exact — Lighthouse renvoie bien 100 (`data/ecoindex.json`).
  Ce qui était faux, c'est **l'infobulle** : « Accessibilité Lighthouse :
  **conformité RGAA/WCAG** — 100/100 ». Lighthouse ne mesure pas la conformité
  RGAA ; il passe une quarantaine de contrôles automatisables là où le
  référentiel en compte 106, dont beaucoup ne se mesurent pas sans jugement
  humain — Lighthouse le dit lui-même.
  - Libellé : `♿ Accessibilité 100` → **`♿ Contrôle auto 100`**, qui ne se lit
    plus comme un taux.
  - Infobulle : dit explicitement que **ce n'est pas** le taux de conformité, et
    renvoie à la déclaration pour le chiffre officiel.
  - ⚠️ **Le taux réel n'est PAS recopié dans le pied de page** : il y vivrait en
    double et divergerait au premier audit. Une seule source, la déclaration.
  Signalé par le porteur. C'est la même erreur que celle qui a ouvert l'audit
  d'août 2026, prise par l'autre bout : **prendre un contrôle automatique vert
  pour une conformité.**

### Ajouté
- `tests/e2e/badge-perf.spec.js` — verrouille la formulation. Vérifié par
  sabotage : l'ancienne infobulle remise en place fait rougir le test.
  Deux pièges rencontrés en l'écrivant, tous deux documentés dans le fichier :
  - il y a **deux** `.footer-perf` (mobile et ordinateur) dont l'un est replié à
    0 px ; viser « le premier » et asserter sa visibilité échouait sur une boîte
    vide — ADR-0030, encore. Le test attend un badge peuplé et vérifie **tous**
    les exemplaires ;
  - chercher la sous-chaîne « conformité RGAA » ne marche pas : **le démenti la
    contient aussi**. Le test vise l'affirmation exacte à interdire, et exige le
    démenti — un texte qui ne dirait ni l'un ni l'autre échoue également.

### Non modifié
- **Le taux de conformité RGAA reste 89,2 %** (58 conformes sur 65 applicables).
  Aucun critère ne change : c'est un affichage trompeur qui est corrigé, pas une
  mesure.

---

## [4.91] — 28 août 2026

### Corrigé
- **RGAA 11.13 — le champ « e-mail ou téléphone » est scindé.** Un champ unique
  n'admet **aucun** jeton `autocomplete` : il n'en existe pas pour « l'un ou
  l'autre ». Le navigateur ne pouvait donc rien pré-remplir. Deux champs
  (`autocomplete="email"` et `autocomplete="tel"`, `type` correspondant pour
  appeler le bon clavier sur téléphone), tous deux facultatifs comme avant.
  La carte Trello reçue par la mairie garde **exactement** le même format : une
  ligne `Réponse :` composée des valeurs saisies.
  Bonus RGAA 11.10 : chaque erreur de saisie désigne maintenant le bon champ,
  au lieu d'un message commun aux deux.
- **RGAA 8.2 — les 33 erreurs de validité sont levées. Le code est valide à 100 %.**
  - **28 × `<div>` dans un `<button>`** (les tuiles de l'accueil) → 52 balises
    converties en `<span>` dans les 14 boutons `.card`.
    ⚠️ **`.ct`, `.ct-label` et `.ct-sub` ne déclaraient AUCUN `display`** : ils le
    tenaient de la balise `<div>`. Sans le `display:block` ajouté dans `mat.css` en
    même temps, le sous-titre de chaque tuile remontait sur la ligne du titre.
    C'est le piège annoncé en v4.90, et il était réel.
  - **4 × `<div>` dans un `<label>`** (cartes à cocher de `partager.html`) → même
    traitement, `display:block` sur `.rc-title` et `.rc-desc`.
  - **1 × `<style>` dans le `<body>`** → déplacé dans le `<head>`, juste après
    `mat-desktop.css`. Vérifié avant de bouger : **rien d'autre ne pose de CSS
    entre les deux**, donc l'ordre de la cascade est inchangé.

### Ajouté
- `tests/e2e/tuiles-mise-en-page.spec.js` — filet de la conversion ci-dessus. Il
  asserte le **style calculé** et la **géométrie** (le sous-titre doit être *sous*
  le titre), pas le balisage. Vérifié en retirant le `display:block` : il rougit.
  ⚠️ Il **refuse de conclure sur une carte de hauteur nulle**. Sa première version
  passait sur ordinateur, où la grille du téléphone est masquée : deux boîtes de
  0 px sont toujours « empilées ». Encore ADR-0030.

### Audit — une troisième erreur de mesure corrigée
- **Le critère 10.5 était annoncé à « 45 déclarations, dont 6 visibles ». C'est
  faux : il y en a environ 356.** Deux causes cumulées — le relevé ne regardait
  que les éléments **affichés au chargement** (une fraction de l'accueil, aucun
  des 31 écrans), et **uniquement les styles en ligne**, jamais les feuilles.
- **Et le premier relevé des feuilles a échoué en silence.** Il testait
  `if (rule.cssRules)` pour distinguer un bloc `@media` d'une règle simple. Or
  **toute** règle CSS porte un `cssRules` — vide, mais *truthy* (support du CSS
  imbriqué). Chaque règle était prise pour un conteneur, parcourue à vide, sautée :
  **87 règles comptées sur 1 046, dont zéro avec une couleur.** Un zéro qui vient
  d'une boucle cassée ressemble trait pour trait à un zéro qui vient d'un code
  propre. Même famille que le contrôle de validité de la v4.90 et que les tests
  axe d'ADR-0030.
- Compte réel, DOM complet avec les 31 écrans hydratés : **1 201 règles CSS
  parcourues, 612 déséquilibrées, 91 portant réellement du texte** ; **265
  déclarations en ligne** dans le même cas. Total : **≈ 356 emplacements**.
- La conclusion de fond ne bouge pas, elle se renforce : chantier **cas par cas**.
  Un `.ct-label` sur une tuile à dégradé ne peut pas recevoir de fond plat sans
  écraser le dégradé, et poser `background: transparent` partout satisferait la
  lettre du critère sans protéger le lecteur qui force ses propres couleurs — ce
  que 10.5 est précisément là pour protéger.

### Modifié
- **Taux de conformité RGAA : 86,2 % → 89,2 %** (58 conformes sur 65 applicables).
  Mention inchangée : **partiellement conforme**. Non-conformités restantes : 9 → **7**.
- Audit (§ Sixième passe, tableau des 106 critères, décompte, taux), schéma
  pluriannuel, déclaration publiée dans l'app et `CLAUDE.md` mis en phase.

---

## [4.90] — 27 août 2026

### Ajouté
- **Le validateur du W3C est branché en intégration continue** —
  `.github/workflows/validite-html.yml` (RGAA 8.2). Chaque lundi et à chaque
  modification d'un `.html`, `vnu` — le moteur même de `validator.w3.org`, exécuté
  en local pour ne dépendre d'aucun service tiers — valide les six pages de
  l'échantillon. Même modèle que `liens-morts.yml` : **une seule issue vivante**,
  mise à jour à chaque passage, refermée d'elle-même à zéro erreur.
  ⚠️ **Il ne fait pas échouer le build** : faire rougir chaque PR sur un passif
  connu de 33 erreurs apprendrait surtout à ignorer le rouge.
  ⚠️ **Le contrôle a failli naître aveugle.** Sa première version cherchait le début
  du JSON à `{"messages"` — or `vnu` émet `{"version":…,"messages":[…]}`. Le repère
  était introuvable, le script lisait donc **zéro message, donc zéro erreur**, et
  aurait annoncé le critère 8.2 satisfait à chaque passage, pour toujours. Pris au
  moment de le lancer contre les pages réelles, qui en comptaient 33. Même panne que
  les tests axe lancés sur un écran encore invisible (ADR-0030) : **un contrôle qui
  ne mesure rien ne rougit pas, il verdit.** Le script échoue désormais bruyamment
  quand la sortie du validateur est illisible, plutôt que de conclure au vert.

### Corrigé
- **RGAA 8.2 — quatre erreurs de validité, dont une qui pouvait recharger la page.**
  Le validateur en a relevé 39 ; ces quatre-là étaient sans risque :
  - espaces non encodées dans un `src` — `img/MAT et MEL.webp` (4 occurrences dans
    `index.html`) et `img/Fabrice AUFFRET ….jpg` dans `partager.html` → `%20` ;
  - `src=""` sur `#trombi-big-img` : invalide, et **interprété par certains
    navigateurs comme une requête vers la page courante** — donc un rechargement
    parasite. Remplacé par un pixel transparent en `data:` ; la vraie photo est
    posée par le script à l'ouverture du trombinoscope ;
  - `aria-label` sur le `<div class="ov" id="ov-carte3d">`, sans rôle propre :
    invalide, et inutile depuis que `openOv()` pose `aria-labelledby` vers le titre
    du panneau.

### Audit — l'audit RGAA est terminé
- **Les 106 critères ont tous un verdict.** Aucun `?` ne subsiste. Cinquième et
  dernière passe.
- **Cinq critères de jugement humain tranchés par le référent accessibilité**
  (27 août 2026) — aucun outil ne dit si une alternative d'image est *pertinente*,
  ni si un PDF sort d'un scanner :
  - **1.3** les quatre alternatives d'images conviennent → `C` ;
  - **3.1** partout un mot ou un symbole double la couleur (vigilance météo,
    sécheresse, statut des signalements, zonage du PLU) → `C` ;
  - **13.3 / 13.4** les documents du PLUi sont des **exports numériques**, non des
    scans : ils portent une couche de texte → `C` ;
  - **13.10** zoom, rotation et remise à plat de la carte 3D se font aux boutons,
    à un doigt → `C`.
  Ce sont des **déclarations, pas des mesures** : le RGAA les admet, mais elles se
  re-vérifient à chaque nouveau document publié ou changement de gestes.
- **8.2 était une mesure, et il tombe.** 39 erreurs relevées, 4 corrigées ci-dessus,
  **33 restantes** en trois familles seulement : 28 `<div>` dans un `<button>` (les
  tuiles de l'accueil), 4 `<div>` dans un `<label>` (`partager.html`), 1 `<style>`
  dans le `<body>` (`index.html` ligne 80, la feuille du lien d'évitement — la
  déplacer dans le `<head>` change l'ordre de la cascade). Passe de `?` à **`NC`**.
  ⚠️ Vérifié avant de renoncer : `.ct-label` et `.ct-sub` ne déclarent **aucun**
  `display`. Convertir ces `<div>` en `<span>` casserait la mise en page des 28
  tuiles tant qu'un `display:block` ne leur est pas rendu — le chantier rejoint le
  plan d'action, il n'est pas un remplacement mécanique.
- **La quatrième passe pronostiquait 87,7 %, la mesure dit 86,2 %.** Le saut n'est
  pas de 6 critères mais de 5 : c'est la différence entre un pronostic et un audit.

### Modifié
- **Taux de conformité RGAA : 78,5 % → 86,2 %** (56 conformes sur 65 applicables,
  41 non applicables). Mention inchangée : **partiellement conforme**.
- Déclaration d'accessibilité publiée dans l'app, `docs/accessibilite/audit-rgaa-2026-08-27.md`
  et `docs/accessibilite/schema-pluriannuel.md` mis en phase. Le plan d'action publié
  passe de « six critères ouverts + huit chantiers » à **neuf non-conformités datées** ;
  « poser les repères de page », traité en v4.89, en disparaît.

---

## [4.89] — 27 août 2026

### Corrigé
- **RGAA 9.2 / 12.6 — aucun repère de page.** Un lecteur d'écran devait parcourir
  toute la page de haut en bas, sans pouvoir sauter à l'en-tête, au contenu principal
  ou au pied. `offline.html` et `architecture.html` n'en avaient aucun.
  `role="banner"`, `role="main"` et `role="contentinfo"` posés — **le rôle plutôt que
  la balise** : `<div>` → `<header>` aurait le même effet sémantique, mais imposerait
  de retrouver la bonne balise fermante dans un gabarit de 560 lignes. Vérifié après
  coup : un seul repère de chaque type par page.

### Audit — une erreur corrigée
- **10.8 était un faux positif.** La deuxième passe avait relevé « un conteneur
  `aria-hidden` contient un élément focusable » à partir d'un comptage qui ne
  vérifiait pas si le conteneur était affiché. Mesuré : `display:none`, boîte du
  bouton à 0 px, hors ordre de tabulation — et le script bascule bien `aria-hidden`
  à `false` à l'ouverture. **Conforme, sans correctif.**
- **10.5 reste non conforme, délibérément.** 45 déclarations inline posent le fond
  **ou** la couleur du texte, dont **6 seulement** sur des éléments visibles, et l'une
  est le fond de `<html>`. Corriger les 45 à l'aveugle ferait courir un risque visuel
  réel pour un bénéfice théorique : à traiter cas par cas.

### Modifié
- **Taux de conformité RGAA : 73,8 % → 78,5 %** (51 conformes sur 65 applicables).
- **Aucun changement visible.**

---

## [4.88] — 27 août 2026

### Corrigé
- **RGAA 7.5 — aucune région live.** Les réponses de MEL, le suivi des signalements
  et la galerie photos étaient mis à jour en silence : un lecteur d'écran n'annonçait
  rien. Un habitant aveugle dont l'envoi échouait croyait que c'était parti.
  `role="status"` + `aria-live="polite"` sur `#msgs`, `#suivi-body` et `#photos-list` ;
  la modale de validation devient un `alertdialog` et prend le focus.
- **RGAA 11.10 / 11.11 — l'erreur de saisie ne désignait pas le champ fautif.** Elle
  s'affichait dans une fenêtre, et après fermeture le focus repartait au début du
  document. Désormais : `aria-invalid` sur le champ, focus rendu au champ, marqueur
  effacé dès la première frappe. Le focus est aussi rendu à son point de départ à la
  fermeture de toute modale (12.9).
- **RGAA 11.5 à 11.7 — champs de même nature non groupés.** Les vingt cases de
  `partager.html` n'avaient aucun groupement, et le libellé « Votre niveau en
  informatique » **ne portait aucun `for`** : affiché, rattaché à rien. `role="group"`
  + `aria-labelledby`, et le libellé orphelin devient la légende du groupe.
- **RGAA 5.4 à 5.7 — les horaires de la mairie** étaient lus d'une traite, sans lien
  entre le jour et l'heure. `caption` réservé aux lecteurs d'écran, jour passé en
  `th scope="row"`. **Rendu vérifié identique** — les règles CSS rendent au `th`
  l'apparence exacte de l'ancien `td`. Idem pour les deux tableaux RGPD.
- **RGAA 13.2 — 7 liens** ouvraient une nouvelle fenêtre sans le dire. Mention
  ajoutée en texte réservé aux lecteurs d'écran, posée au chargement puis à
  l'ouverture de chaque écran — ce qui couvre les contenus injectés après coup sans
  imposer d'observateur de mutations permanent.

### Modifié
- **Taux de conformité RGAA : 56,9 % → 73,8 %** (48 conformes sur 65 applicables).
  Mention inchangée : **partiellement conforme**.
- **Aucun changement visible.** L'apparence de l'application est identique.

### Connu
- **RGAA 11.13 reste non conforme, délibérément.** Le champ « Coordonnée de réponse »
  accepte un e-mail **ou** un téléphone : aucun jeton `autocomplete` ne couvre les
  deux. Le corriger demande de scinder le champ — un changement visible, planifié
  pour 2027.

---

## [4.87] — 27 août 2026

### Modifié
- **L'application n'est plus déclarée « non conforme ».** L'audit des 106 critères
  du RGAA est achevé : **41 non applicables**, donc **65 applicables** — **37
  conformes**, 22 non conformes, 6 non tranchés. **Taux : 56,9 %**, mention
  **partiellement conforme**. Les 6 non tranchés sont comptés comme non conformes :
  le taux publié est un **plancher**, qui ne peut que monter.
- Plan d'action réordonné : d'abord les 6 critères ouverts (ils font monter le taux
  sans qu'une ligne de code change), puis les non-conformités. Les traiter porterait
  le taux au-delà de **90 %**.

### Corrigé
- **RGAA 3.3 — les bordures des champs de saisie étaient presque invisibles.**
  `rgba(0,0,0,0.07)` = **1,17:1**, pour un minimum de 3:1. Nouveau jeton
  `--border-champ` à **3,88:1**, décliné pour le contraste élevé (10,37:1) et le
  thème sombre (4,79:1). `--border` reste inchangé : il sert aussi à des séparateurs
  décoratifs, qui n'ont aucun minimum à respecter.
- **RGAA 3.3 — les interrupteurs du panneau Accessibilité** : piste `#ccc` sur blanc
  = **1,61:1**, état allumé **2,47:1**. Bordure ajoutée (**3,95:1**), état allumé
  passé à `--sage-ink` (**6,39:1**), distinction éteint/allumé à **3,98:1**.
- **RGAA 10.9 / 10.10 — l'état sélectionné n'était donné que par la couleur** sur les
  boutons de taille de texte, de thème et les onglets de l'agenda. `aria-pressed`
  ajouté sur les six.
- **RGAA 8.9 — 15 séquences de `<br><br>`** servaient à espacer des paragraphes
  (présentation du majordome, contact RGPD, écran d'accueil). Remplacées par de vrais
  paragraphes, l'espacement rendu au CSS.

### Audit — critères tranchés dans cette version
- **8.9**, **13.11** (aucun gestionnaire `mousedown`/`touchstart`/`pointerdown` :
  tout passe par `click` et `change`, annulables), **3.3**, **10.9**, **10.10** →
  conformes. **10.13**, **10.14**, **12.11** → non applicables : aucun contenu
  additionnel révélé au survol par CSS ou JavaScript.
- Restent 6 critères, dont 5 relèvent du jugement de la mairie et 1 du validateur
  du W3C.

---

## [4.86] — 27 août 2026

### Corrigé
- **Les douze interrupteurs du panneau Accessibilité n'avaient aucun nom accessible**
  (RGAA 11.1, axe `label`, niveau *critical*). Contraste élevé, mode daltonien,
  lecture vocale, espacement des lignes… : au lecteur d'écran, tous s'annonçaient
  « case à cocher », sans distinction. Le libellé visible existait, dans un `<div>`
  frère non associé. Rattaché par `aria-labelledby`.
- **Six champs de formulaire sans étiquette associée** (RGAA 11.1) — signalement,
  contact (×3), bug, boîte à idées. Le `<label class="form-label">` existait mais
  **sans `for`** : seul le `placeholder` portait l'information, et un `placeholder`
  n'est pas une étiquette — il disparaît à la saisie. `for` posé sur les cinq
  libellés existants, `aria-label` sur la boîte à idées qui n'en avait aucun.
- **Les trente fenêtres modales n'avaient pas de nom** (RGAA 12.9). Elles portaient
  bien `role="dialog"` et `aria-modal`, mais un lecteur d'écran annonçait
  « dialogue » sans dire lequel. `openOv()` pose désormais un `aria-labelledby`
  vers le titre visible du panneau.
- **Contrastes insuffisants** relevés et corrigés :
  - bouton d'appel **Pompiers 18** — blanc sur `#ea580c` = **3,55:1** → `#c2410c` = 5,18:1 ;
  - intitulés de rubrique `--sage` `#52b788` sur blanc = **2,47:1** → jeton `--sage-ink`
    `#2d6a4f` = 6,39:1 (numéros utiles, dernier document, widgets, liens MEL) ;
  - `offline.html` — texte à 2,47:1 et 2,32:1 ;
  - `architecture.html` — 26 nœuds sur fond sombre, jusqu'à **1,22:1** ;
  - messages d'erreur `#dc2626` sur crème `#f4f0ea` = **4,25:1** → `#b91c1c`.
- **`partager.html` n'avait aucun `<h1>`** (RGAA 9.1). Le titre visuel en devient un,
  rendu inchangé.
- **Lien d'attribution de la carte** (RGAA 10.6) : 2,55:1 avec le texte voisin et
  aucune distinction non colorimétrique. Souligné — avec la spécificité nécessaire
  pour battre `leaflet.css`, injecté dans le `<head>` après `mat.css`.

### Modifié
- **La déclaration d'accessibilité explique enfin ce que « non conforme » signifie** :
  non pas inaccessible, mais **non mesurée** sur les 106 critères. Le RGAA ne connaît
  que trois états et n'autorise les deux autres que sur la foi d'un audit.
- **Schéma pluriannuel 2026-2029 et plan d'action 2026-2027 publiés dans l'app**,
  écran Accessibilité — neuf chantiers datés, obligation du décret n° 2019-768.
- Le badge « ♿ RGAA · WCAG AA » de l'écran RGPD, affiché sous le titre
  « Certifications & engagements », **contredisait la déclaration à deux écrans
  d'écart**. Devenu « ♿ Accessibilité renforcée ».

### Tests
- **Cinq contrôles axe ne pouvaient pas échouer.** Ils mesuraient l'écran pendant sa
  transition d'ouverture, alors qu'il était encore `visibility:hidden` — et axe ignore
  ce qui est masqué. 0 violation à t=0, 9 à t=400 ms, mêmes nœuds. Ils attendent
  désormais le **style calculé**. Ils ont aussitôt révélé deux défauts réels.

### Audit des 106 critères
- Sur 106 critères, **38 non applicables** (ni média temporel, ni cadre, ni CAPTCHA),
  donc **68 applicables** : **32 conformes**, 22 non conformes, **14 non tranchés**.
- Le seuil de « partiellement conforme » est à **34 sur 68**. **Il suffit que deux
  des quatorze critères non tranchés soient conformes** pour que la mention change.
  Le travail restant n'est pas de rendre l'application accessible : c'est de finir
  de la mesurer.
- Des quatorze, **huit** sont résolubles par des mesures complémentaires, **un**
  demande le validateur du W3C, et **cinq** relèvent du jugement humain (pertinence
  des alternatives, information par la seule couleur, accessibilité des PDF du PLUi,
  gestes sur la carte 3D).

### Documentation
- `docs/accessibilite/audit-rgaa-2026-08-27.md` — méthode, échantillon, preuves,
  tableau des 106 critères, et les 14 questions restantes.
- `docs/accessibilite/schema-pluriannuel.md` — schéma 2026-2029.
- **ADR-0030** — « Un contrôle d'accessibilité lancé trop tôt mesure un écran vide ».

---

## [4.85.1] — 27 août 2026

### Corrigé
- **Les cerfa d'urbanisme cités par l'application étaient abrogés.** Au **1er janvier
  2025**, les cerfa **13703** (DP maison individuelle), **13702** (DP lotissement) et
  **13404** (DP constructions et travaux) ont été remplacés par le **16702**
  (constructions et travaux) et le **16703** (aménagements) ; le permis de construire
  reste le **13406**. Un dossier déposé sur l'ancien formulaire est refusé.
  - `js/mat-mel.js` — le lien « 📄 Cerfa DP » du zonage PLU pointait `…/vosdroits/R11646`,
    **supprimée** du site Service-Public (404 signalé par le scan hebdomadaire, issue
    #400). Il pointe désormais `…/vosdroits/R2028`.
  - `data/saviez-vous.json` — l'entrée `gnau-cerfa-cloture` enseignait que le 16702 était
    « propre aux clôtures » et renvoyait au 13703 pour le reste : **verdict inversé**
    (`false` → `true`, l'identifiant est conservé pour les compteurs de réactions), texte
    réécrit et sourcé. L'entrée `cloture-dp` perd son millésime « \*02 ».
  - Backend `lib/mel.js` — la règle `plu_permis_construire_depot` et le bloc AUTORISATIONS
    du `SYSTEM_PROMPT` conseillaient le 13703. Corrigés, et le prompt interdit désormais
    explicitement les trois numéros abrogés. Verrouillé par `test/urbanisme-cerfa.test.js`.
- **« Où trouver le cerfa pour ma clôture ? » ne tombait sur aucune règle directe** — les
  règles clôture exigent toutes un second terme (rue, voisin, hauteur) — et partait donc
  au modèle, à l'endroit précis où le numéro périmé risquait le plus d'être repris.
- **`data/saviez-vous.json` était précaché sous une URL que personne ne demandait.** Le
  service worker précachait `?v=1.3.1` quand `js/mat-saviez-vous.js` réclamait `?v=1.3.0` :
  l'entrée de précache ne servait jamais. Les deux passent à `?v=1.4.0`.
- **Scan de liens morts : trois faux positifs par étranglement.** lychee lançait jusqu'à
  128 requêtes en parallèle avec 20 s de patience ; `service-public.gouv.fr` laissait
  expirer une partie de la rafale (issue #201 du dépôt backend, sur des pages vivantes).
  Les deux workflows passent à `--max-concurrency 8 --timeout 30`.

### Documentation
- **ADR-0029** — « Un numéro de formulaire mort ne se voit pas comme un lien mort ».

---

## [4.83] — 23 août 2026

### Ajouté
- **MEL connaît les horaires de bruit.** Nouvelle `DIRECT_RULE` `bruit_travaux_horaires`
  (backend `lib/mel.js`) : réponse instantanée, sans appel IA, tirée de l'**arrêté
  préfectoral du Loiret du 1er mars 1999**. Outils bruyants autorisés du lundi au vendredi
  8h30-12h et 14h30-19h30, le samedi 9h-12h et 15h-19h, le dimanche et les jours fériés
  10h-12h. Un bloc **BRUITS DE VOISINAGE** est ajouté au `SYSTEM_PROMPT` pour les
  formulations qui passeraient à travers la regex.

### Corrigé
- **MEL inventait les horaires de bruit.** Le changelog de la **v4.15** annonçait déjà une
  « règle MEL directe pour les horaires de bruit et de bricolage » — elle **n'a jamais
  existé dans le code**. Conséquence en production : « quelles sont les horaires de bruit »
  → « je n'ai pas cette information », et la même question reformulée → des horaires
  **inventés** (« interdit de 22h à 7h », « dimanche toute la journée ») attribués à un
  **arrêté municipal inexistant**. Une règle absente ne se manifeste pas par un silence,
  mais par une hallucination plausible.
  - `chatbot-mairie-mezieres/test/bruit.test.js` verrouille les deux faces : les plages
    exactes sont présentes, **et** les plages hallucinées sont absentes.
  - Voir **ADR-0013 du backend** (« Une règle absente ne se tait pas, elle hallucine »).
- **MEL improvisait sur la location de la salle communale.** « Je souhaite louer la salle
  des fêtes, quel est le tarif pour le 1er week-end d'octobre 2026 ? » partait dans la
  catégorie « autre ». Or **la salle n'est plus proposée à la location**. Le fait existait
  pourtant dans le dépôt — mais enterré en 9ᵉ ligne d'un paragraphe de 200 mots de la
  rubrique « Location de matériel » (`data/mel-tree.json`), **absent** de l'autre copie de
  l'arbre (`js/mat-mel.js`), et inconnu du backend.
  - Nouvelle `DIRECT_RULE` `location_salle_materiel` + bloc `SALLE COMMUNALE ET LOCATION
    DE MATÉRIEL` dans le `SYSTEM_PROMPT`, côté backend.
  - `js/mat-mel.js` et `data/mel-tree.json` : la rubrique « Location de matériel communal »
    l'annonce désormais **en première phrase**, dans les deux copies de l'arbre.
  - **Aucun tarif n'est recopié dans le code** : les prix vivent dans l'arbre de décision,
    que la mairie édite depuis l'admin. Les dupliquer créerait une double source vouée à
    diverger — un test le vérifie (`test/location-salle.test.js`).

### Supprimé
- Lien mort **« 🌐 Page location matériel »** (`mezieres-lez-clery.fr/2018/10/24/…`) dans
  `data/mel-tree.json` : l'ancien site WordPress n'existe plus, le domaine sert
  l'application. Dernière URL de ce type dans `data/` et `js/`.

---

## [4.82] — 21 août 2026

### Ajouté
- **Les lieux-dits et hameaux nommés sur la carte 3D du village.** Manthelon, Rolland, le
  Bréau… La couche `BDTOPO_V3:toponymie` de l'IGN les porte avec leur point exact. Chaque
  nom est posé **au bout d'un mât terminé par un point au sol** : sans lui, un nom au ras du
  sol à côté d'une maison de 6 m semblerait nommer la maison — et un marqueur HTML n'étant
  jamais occulté par le bâti, un nom lointain flotterait sur les maisons du premier plan.
  - **Le mât vaut 13 m réels**, convertis en pixels par `(h / mpp) × sin(pitch)` : il
    rétrécit avec la distance comme le bâti, à l'inverse d'un décalage écrit en pixels
    (RG-17.17). `sin` et non `cos` — à la verticale, une hauteur ne se projette pas. Ce
    n'est **pas une mesure** : même statut que les toits en pente (RG-17.15).
  - Voir **ADR-0026** (complété) et **RG-17.30**.

### Ce que la source a appris
- ⚠️ **La couche de toponymie ne contient pas que des lieux-dits** : 219 objets sur
  l'emprise de la commune — croix, ponts, sources. Seule la classe « Zone d'habitation » est
  affichée ; **tout le reste est compté par classe** dans « 🔎 Détail des sources », pour
  qu'un hameau rangé un jour ailleurs se voie au lieu de manquer en silence.
- ⚠️ **Il existe deux « manthelon » en France** — le nôtre et un autre à 120 km, en
  Eure-et-Loir, sortis de la même requête avec la même graphie et la même classe. C'est très
  exactement le risque qu'ADR-0021 avait invoqué pour refuser de résoudre les communes par
  leur nom, et cette fois la preuve était dans la réponse du service. Le découpage sur le
  contour communal est verrouillé par un test qui échoue si on le retire.
- ⚠️ **La graphie arrive en minuscules.** `_c3dCapitales` remet les majuscules, particules
  exceptées — et seulement si la graphie n'en porte aucune, pour ne jamais retoucher un
  « Saint-Laurent-des-Bois » déjà bien écrit.

### Modifié
- **La chaîne de requête WFS est partagée** entre le bâti et la toponymie (`_c3dWfs`) : deux
  couches de la même base, servies par le même service, avec les mêmes trois formulations de
  repli. Les libellés du journal gagnent un préfixe (« BD TOPO bâti », « BD TOPO
  toponymie ») — sans quoi le panneau de diagnostic afficherait deux lignes identiques.
- **L'anticollision des étiquettes est mutualisée** (`_c3dRangerEtiquettes`) entre les noms
  de communes et ceux des lieux-dits.

## [4.81] — 21 août 2026

### Ajouté
- **Le nom des 25 communes en vue « Le territoire ».** La vue du PLUi-H-D affichait
  vingt-cinq contours anonymes : le seul endroit qui les nommait était un panneau dépliant,
  c'est-à-dire pas là où se pose le regard. Chaque contour porte désormais son nom, posé au
  centroïde d'aire de son **plus grand** polygone (`_c3dCentreEtiquette`), Mézières en or
  comme sa limite.
  - **Des marqueurs HTML, pas une couche `symbol`** : le style de la carte n'a pas d'URL
    `glyphs`, et sans glyphes un `text-field` ne rend *rien*, sans erreur ni trace. Les
    vendoriser coûterait quelques centaines de kilo-octets à une page déjà lourde
    (ADR-0018). Coût assumé, et tenu par trois tests : anticollision écrite à la main,
    masquage explicite au retour au village (`setLayoutProperty` n'atteint pas un élément
    HTML), et `pointer-events:none` pour ne pas avaler le clic qui nomme la commune.
  - **Le nom écrit est celui que le Géoportail a renvoyé**, jamais la liste de la mairie :
    une commune non appariée reste sans nom sur la carte, et signalée dans le panneau
    (prolongement de RG-17.20). Un contour sans surface n'en reçoit pas non plus.
  - Voir **ADR-0026** et **RG-17.29**. L'ADR consigne aussi ce qui n'est pas fait — les
    lieux-dits du village — et pourquoi : les noms de couches BD TOPO doivent être confirmés
    depuis une machine connectée, et les « quartiers » ne peuvent venir que de la mairie
    (l'IRIS de l'INSEE ne descend pas sous 10 000 habitants).

### Supprimé
- **Un repli inatteignable dans `_c3dCentreEtiquette`.** Le test écrit pour l'exercer a
  échoué : un anneau d'aire nulle n'est jamais retenu par la boucle qui cherche le plus
  grand polygone, donc la branche « moyenne des sommets » ne pouvait pas être prise. Le
  contrat est rendu explicite — pas de surface, pas de nom — plutôt que gardé endormi.

## [4.80] — 17 août 2026

### Modifié
- **Deux lignes gagnées sur la carte « Maintenant ».** En réglage « grand texte »
  (`html.font-large`, et a fortiori `font-xl`), la ligne de provenance de la normale et le
  libellé « Rafales · 24 h » passaient chacun **sur deux lignes** : la carte mesurait 332 px
  au lieu de 297. Mesuré au rendu, avant et après.
  - La **période 1991-2020** quitte la carte pour la ligne de sources en pied de fenêtre
    (« Prévisions et normales 1991-2020 Open-Meteo (CC BY 4.0) »), où vivent déjà le
    fournisseur et la licence. Le mot **« réanalyse » reste dans la carte** — c'est lui qui
    porte la décision de l'ADR-0024, pas la période. Chaque fait reste affiché une fois.
  - Le libellé devient **« Rafales 24 h »** : la puce médiane offrait un point de coupure
    de plus dans une tuile large d'un tiers d'écran.

### Corrigé
- **« Normale de août » → « Normale d'août ».** L'élision manquait devant une voyelle : la
  faute s'affichait trois mois par an (avril, août, octobre). Nouveau helper
  `meteoMoisPrefixe()`, verrouillé par un test sur les cinq cas.

## [4.79] — 15 août 2026

### Ajouté
- **L'écart à la normale du mois revient dans la carte « Maintenant »** — avec sa source.
  `meteoBuildNormLine` compare la **maximale du jour** à la **normale des maximales** du
  mois : « Maximale prévue aujourd'hui 31 °C · +5,4 °C », suivi de « Normale de juillet :
  25,6 °C — réanalyse ERA5, 1991-2020 ». La v4.78 avait supprimé cet écart faute de
  source (ADR-0022) ; il ne revient qu'accompagné de la sienne.
- **La comparaison porte sur la maximale du jour, pas sur la température de l'instant.**
  Confronter le thermomètre de 8 h à une moyenne mensuelle de maximales afficherait « bien
  en dessous des normales » tous les matins, et « au-dessus » tous les après-midis d'été :
  deux affirmations fausses tirées de chiffres justes. Le mois est lu sur le **jour
  comparé** (`daily.time[dayIdx]`), pas sur l'horloge du navigateur — le 1er du mois, les
  deux divergent.
- **Seuil d'emphase à 3 °C** : en deçà, l'écart s'affiche mais reste neutre. Une pastille
  rouge à +1,2 °C banaliserait la couleur, comme l'UV à 6 le faisait avant la v4.77. Le
  sens est porté par le **signe** (+ / −), jamais par la seule couleur.
- **Backend** (`lib/normales.js`, dépôt `chatbot-mairie-mezieres`) : normales 1991-2020
  calculées sur la réanalyse **ERA5** (archive Open-Meteo, jeu épinglé `models=era5`) aux
  coordonnées de la commune, en cache Redis six mois. Servies dans `/meteo/commune` —
  l'app n'a **aucun appel supplémentaire** à faire, et elles suivent le cache hors-ligne
  `mat_meteo_cache` sans code supplémentaire. Check 📊 dans le diagnostic Services.

### Modifié
- La ligne de source du bas de fenêtre devient « Prévisions **et normales** Open-Meteo
  (CC BY 4.0) » — uniquement quand des normales ont réellement été servies.

### Notes
- **ERA5 est une réanalyse, pas une station.** L'ADR-0022 demandait « station et période
  citées » ; l'ADR-0024 amende ce point plutôt que de le contourner : l'étiquette affichée
  dit « réanalyse ERA5, 1991-2020 », et le payload porte `reanalyse: true`, `station: null`.
  Le token Météo-France du backend est abonné à la vigilance, pas à la climatologie.
- **Rien n'est affiché si quoi que ce soit manque** : pas de normales, pas de maximale du
  jour, ou un seul mois trop lacunaire côté backend → aucune ligne, aucun écart approché.

## [4.78] — 12 août 2026

### Ajouté
- **Carte « Maintenant » dans la fenêtre météo** (`meteoBuildNowCard`) : température,
  **ressenti**, humidité, pression, rafales maximales du jour, avec les tendances sur trois
  heures. Ces sept mesures étaient calculées par `loadMeteoDetail` depuis l'origine et
  **aucune n'était affichée** — sept variables mortes et une douzaine de règles CSS
  orphelines (`.meteo-current-*`, `.meteo-stat-*`, `.meteo-grid-*`). Sur un écran de
  vigilance canicule, le ressenti est justement le chiffre que l'on cherche. Si
  `temperature_2m` manque, la carte n'est pas rendue du tout.
- **La météo survit au hors-ligne.** `mat_meteo_cache` conserve le dernier bulletin reçu
  avec son horodatage ; `loadMeteo` s'y replie en cas d'échec réseau. Le bandeau d'accueil
  affiche « 📡 Hors ligne · relevé de 15h58 » et la fenêtre météo s'ouvre sur un bandeau
  daté. Au-delà de 6 h le cache n'est plus servi, et une **vigilance expirée est retirée**
  avant réaffichage — une alerte terminée réaffichée serait une fausse information.
- **Source et fraîcheur** en pied de fenêtre : « Prévisions Open-Meteo (CC BY 4.0) ·
  vigilance Météo-France — mis à jour à … ». Open-Meteo est diffusé sous CC BY 4.0.
- **Pastille d'échelle sur l'indice UV** (`meteoUvLevel`, échelle OMS/Météo-France), au
  même palier 8 que les prochains risques et les conseils du jour.
- `tests/e2e/meteo-overlay.spec.js` — neuf cas : ressenti affiché, bloc Air allégé, « – »
  sur donnée absente, couleurs UV mesurées sur le style calculé, carrousels focusables,
  ligne de source, hors-ligne daté, purge d'une vigilance expirée, et passage axe de la
  fenêtre entière.

### Modifié
- **Rafales et pression quittent le bloc 🌿 Air** pour la carte « Maintenant » : ce sont des
  paramètres de vent et de pression, pas de qualité de l'air. La flèche de tendance des
  rafales disparaît — la valeur affichée est un maximum quotidien, et une tendance sur un
  maximum ne veut rien dire.
- **Plus d'écart aux normales** : les tableaux `NORM_MAX`/`NORM_MIN` codés en dur, sans
  station ni période citée, sont supprimés. Voir ADR-0022 — à reprendre le jour où le
  backend servira des normales sourcées.
- **Accessibilité** : les carrousels `.meteo-hourly-track` et `.meteo-days-scroll`
  reçoivent `tabindex="0"`, `role="group"` et un nom accessible (sous Chrome, un conteneur
  défilant sans `tabindex` est hors d'atteinte au clavier — ADR-0016), et les titres de
  section deviennent de vrais `<h3>`.

### Corrigé
- **Une donnée absente n'est plus affichée comme une prévision.** `weather_code || 0`
  transformait un code manquant en code 0, soit ☀️ « Ciel dégagé », et
  `temperature_2m_max || 0` affichait 0 °C. Désormais « – » et « Indisponible » (ADR-0018).
- Mode sombre : les titres 🌿 Air et 💡 Conseils du jour s'affichaient en texte sombre sur
  fond sombre, et les lignes de détail des cartes « Prochains jours » étaient à 1,9:1 de
  contraste.

## [4.77] — 12 août 2026

### Modifié
- **La carte d'alerte météo ne se répète plus.** Le dépliant « Touchez pour le détail »
  affichait, une fois ouvert, les deux mêmes horaires et la même phrase que le résumé
  juste au-dessus — trois occurrences de « Vigilance orange en cours sur le Loiret. » sur
  un même écran. Il est remplacé par une **frise** (`meteoAlertProgress`) qui situe
  l'instant présent entre le début et la fin de l'alerte et annonce le temps restant
  (« ⏳ Se termine dans 8 h », « ⏳ Débute dans 3 h »). Le texte du bulletin n'est affiché
  que si Météo-France en a réellement publié un (`vigilance.main_text`) : le repli
  automatique redisait mot pour mot la pastille de niveau.
- **« Prochains risques » passe en jauges.** Pluie, rafales et UV sont rendus par
  `meteoBuildRiskItems` sous forme d'items `{icon,label,when,value,pct,tone}` : une barre
  qui se remplit et change de couleur selon l'intensité, au lieu d'une phrase.
- **… et se tait quand il n'a rien à dire.** Trois règles anti-bruit : l'indice UV ne
  remonte qu'à partir de **8** (« très fort ») au lieu de 6 — à 6, l'item s'affichait tous
  les jours de l'été ; le risque déjà porté par la vigilance en cours n'est plus répété
  (pas de ligne « rafales » sous une alerte vent violent) ; et sous une vigilance, le bloc
  entier disparaît s'il est vide, au lieu d'annoncer « aucun risque météo notable » juste
  sous une alerte orange.
- **Les 💡 Conseils du jour sont alimentés par la vigilance en cours** (vent violent,
  orages, pluie-inondation, crues, neige-verglas, canicule, grand froid). Une alerte vent
  ou orage ne déclenchait auparavant **aucun** conseil, faute de seuil de température
  atteint. Les gestes restent regroupés dans ce bloc unique : la carte d'alerte n'en
  ouvre pas un second.

### Corrigé
- **Bug d'un jour dans l'overlay météo — `daily[0]` est HIER** (`past_days=1`, ADR-0007).
  « Prochains risques » lisait `daily.uv_index_max[1]` en l'annonçant **« Demain »** : il
  affichait l'UV du jour même. Et les **💡 Conseils du jour** lisaient `[0]`, soit les
  températures et l'UV **de la veille** — le conseil canicule pouvait donc manquer le jour
  où il servait. Les deux passent désormais par `meteoTodayIndex`.
- Mode sombre : les textes de la carte d'alerte (bulletin, bornes de la frise, zone)
  restaient en gris clair sur fond sombre, le dégradé de niveau étant écrasé par le fond
  de `.meteo-card`.

## [4.76] — 11 août 2026

### Ajouté
- **Pastille « Nouveau » sur les documents officiels.** Publier un document temporaire ou
  un document à la une depuis le tableau de bord ne produisait **aucun signal** côté
  habitant : ni sur la carte 📁 « Documents officiels » de l'accueil, ni dans la liste une
  fois l'écran ouvert. Seuls les documents du **PLUi** disposaient du mécanisme
  ([ADR-0014](docs/adr/0014-documents-plui-administrables-page-embarquee.md)) ; il est
  désormais appliqué aux deux routes `/docs/featured` et `/docs/temp` :
  - une pastille rouge sur la carte d'accueil **et** sur l'entrée du menu bureau, allumée
    par un rafraîchissement d'arrière-plan **au démarrage de l'application** — donc avant
    que l'écran soit ouvert, sans quoi la pastille arriverait toujours trop tard ;
  - une pastille « Nouveau » et un contour coloré **sur chaque document non consulté**, de
    sorte qu'on voie lequel vient d'arriver quand plusieurs sont publiés ensemble ;
  - le marquage « vu » après le rafraîchissement **et** après le rendu : un document publié
    pendant la visite n'est pas compté comme lu, et les pastilles ne s'éteignent qu'à la
    visite suivante.
  Les identifiants déjà vus sont conservés dans `mat_docs_seen`. Le document à la une n'a
  pas d'`id` côté backend : sa date de publication en tient lieu.
- **Les documents officiels sont consultables hors connexion.** La dernière liste reçue est
  conservée dans `mat_docs_cache` : l'écran s'ouvre sur son contenu réel au lieu d'un
  « Chargement… », et reste lisible sans réseau.
- **`tests/e2e/documents-officiels.spec.js`** — quatre cas verrouillent le comportement
  (allumage sans ouverture, pastille par document, extinction persistante après
  consultation, rallumage à la publication suivante). Le test asserte le **style calculé**
  de la pastille, pas l'état interne du JS : règle 7 du `CLAUDE.md`.

---

## [4.75] — 10 août 2026

### Corrigé
- **Une version déployée avec succès paraissait n'être jamais arrivée.** La v4.74.1 a été
  fusionnée, la CI est passée, GitHub Pages l'a publiée — et l'application a continué
  d'afficher **v4.74**, parce que seuls le cache du service worker et les `?v=` des modules
  avaient été incrémentés, pas le numéro visible. Le porteur, qui cherchait le nouveau
  numéro sur son téléphone, ne pouvait conclure qu'une chose : « ça ne se charge pas ».

- **La recherche de carte communale n'était jamais lancée.** Un tableau **vide est truthy**
  en JavaScript : l'interrogation par emprise ramène le zonage des communes voisines, le
  découpage sur le contour les élimine toutes, et le résultat `[]` arrêtait la chaîne juste
  avant l'étape « carte communale ». Le journal restait donc vide, et le panneau de
  diagnostic n'affichait aucune ligne — ce qui a fait croire, à juste titre, que le code
  n'était pas déployé. La chaîne teste maintenant la **longueur**, pas la vérité du tableau.
- **Cliquer sur une commune sans zonage ne répondait rien.** Le clic n'interrogeait que la
  couche du zonage ; une commune sans PLU n'a aucun polygone à toucher, donc l'écran restait
  muet — précisément sur les communes dont on se demande pourquoi elles sont vides. Le clic
  retombe désormais sur le **contour communal**, et nomme la commune en expliquant son état.

### Ajouté
- **`scripts/check-cache-bust.js` refuse désormais un cache qui change en silence.** Si
  `CACHE` bouge dans `service-worker.js`, le numéro affiché dans `index.html` — bandeau
  mobile **et** bouton « 🆕 » du bureau — doit bouger aussi. Le contrôle échoue en CI sinon,
  avec le geste exact à faire.
  Le numéro affiché est le **seul** moyen qu'a un habitant de savoir ce qu'il a en main :
  `index.html` n'est pas versionné, le cache est invisible, et « fermer puis rouvrir l'app »
  ne dit rien de ce qu'on a reçu. Un déploiement muet est indistinguable d'un déploiement
  raté — pour le porteur comme pour moi.

---

## [4.74.1] — 10 août 2026

### Corrigé
- **La recherche de carte communale avalait son motif d'échec.** Confirmé par la mairie :
  Le Bardon relève d'une **carte communale** approuvée en 2011, pas d'un PLU — l'hypothèse
  de la v4.74 était juste. Mais la tentative écrivait son motif d'erreur dans une variable
  que **rien ne lisait** : l'écran annonçait « pas de PLU » sans pouvoir dire si le service
  avait répondu vide, renvoyé une erreur, ou n'existait pas sous ce nom. C'est exactement la
  faute que le panneau de diagnostic existe pour empêcher. Chaque tentative laisse désormais
  une **trace lisible**, affichée dans « 🔎 Détail des sources ».
- **Un second chemin pour les cartes communales** : à défaut de réponse par emprise, le
  Géoportail est interrogé sur les **documents** qui couvrent la commune, et chaque partition
  annoncée est essayée. La partition d'une carte communale n'a aucune raison d'avoir la
  forme de celle d'un PLU.
- **« 25 retenus dans la commune »** était une phrase fausse sur les lignes du territoire :
  on n'y découpe pas sur Mézières, on apparie 25 communes parmi celles que l'emprise a
  ramenées. Le chiffre était juste, la phrase non — elle devient « 25 retenues sur 151 ».

---

## [4.74] — 10 août 2026

### Corrigé
- **« Aucune zone renvoyée » sur dix communes : ce n'était pas une panne.** Le relevé de
  terrain montre le motif sans ambiguïté — les communes qui affichaient leur zonage sont les
  plus peuplées (Beaugency, Meung-sur-Loire, Cléry, Lailly-en-Val, Mézières…), celles qui
  restaient vides sont les plus petites (Baccon, Binas, Charsonville, Coulmiers, Villermain,
  Villorceau…). **Une petite commune rurale n'a souvent pas de PLU** mais une **carte
  communale**, un document plus simple que la requête « zone-urba » ne sert pas.
  L'application interroge désormais aussi les **secteurs de carte communale**, avec leurs
  propres couleurs — constructible / non constructible — pour ne pas laisser croire à un
  zonage de PLU qui n'existe pas.
- **Une commune sans PLU n'est plus présentée comme en échec.** Le bandeau annonce d'abord
  ce qui *est* là — « N communes avec zonage » — puis « X sans PLU », et ne réserve
  « indisponible » qu'aux vraies pannes. La liste dit « pas de PLU au Géoportail » plutôt
  qu'un motif d'erreur.
- **Le panneau des 25 communes recouvrait trois boutons une fois déplié** — « Zonage du
  PLU », « Bâtiments », « Revenir au village ». Replié il tenait, d'où un contrôle qui
  passait au vert. Aucune hauteur écrite en CSS ne peut convenir : elle dépend du nombre de
  boutons, de la barre système et du réglage de taille du texte. La hauteur est désormais
  **mesurée** à chaque ouverture du panneau, et le test s'exécute sur un écran court — sur
  un grand téléphone il passerait sans rien prouver.
- La légende ne montre plus que les familles de zones **réellement présentes** : afficher
  les couleurs de la carte communale là où il n'y en a aucune ferait chercher sur la carte
  quelque chose qui n'y est pas.

---

## [4.73] — 10 août 2026

### Corrigé
- **Le zonage du territoire n'arrivait que pour 12 communes sur 25.** Le panneau de
  diagnostic, mis en place en v4.72, a livré les deux causes exactes — c'était sa raison
  d'être.
- **« Failed to fetch » sur quatre communes : l'URL faisait 94 000 caractères.** Le zonage
  était demandé en passant le **contour communal entier** dans la chaîne de requête. Un
  contour du Géoportail compte des milliers de sommets ; sérialisé et encodé, il produit une
  URL que la pile réseau refuse — sans même rendre d'erreur HTTP. La requête porte désormais
  sur le **rectangle englobant (5 points)**, et l'exactitude est rétablie par le découpage
  sur le vrai contour. Mesuré : 94 032 caractères avant, moins de 400 après.
- **Neuf communes annoncées « sans zonage » alors que plusieurs sont simplement au RNU.**
  `municipality?geom=` renvoie le nom, le code INSEE et le contour, mais **ni `partition` ni
  `is_rnu`** — seul `municipality?insee=` fait autorité. Ce second appel est maintenant fait
  pour toute commune restée muette : il donne la partition, et surtout distingue une commune
  **sans PLU** (information) d'une commune **en panne** (erreur).
- **Un échec réseau passager n'élimine plus une commune** : un seul second essai, sur les
  seules erreurs de type « Failed to fetch ». Sur un téléphone, quatre requêtes simultanées
  en perdent une de temps en temps.
- Le bandeau ne compte plus les communes au RNU parmi les « sans zonage ». Il annonçait
  « 13 sans zonage » là où plusieurs étaient parfaitement en règle.

### Modifié
- **« Où suis-je » clignote trois fois à l'ouverture de la carte, puis se tait.** Le bouton
  ne se distinguait pas de ses cinq voisins, et sa fonction — situer *sa* maison dans le
  zonage — est la moins devinable de la carte. Il cesse immédiatement dès qu'on le touche,
  et l'animation est neutralisée par le réglage « Réduire les animations ».
- **La vue territoire garde la vue aérienne.** La v4.72 basculait d'office sur le plan IGN ;
  à l'usage, c'est la photo qui parle — elle donne le paysage, la Loire, les bourgs, que le
  plan aplatit. Le double tracé des limites rend le zonage lisible sur les deux fonds, donc
  rien n'oblige à choisir à la place de l'habitant : le bouton « Vue aérienne / Plan » reste
  le seul maître.

### Confirmé
- **Les 25 communes de la liste de la mairie sont toutes reconnues** par le Géoportail —
  y compris Beauce-la-Romaine, Binas, Villermain et Saint-Laurent-des-Bois, sur lesquelles
  un doute avait été exprimé. C'est l'application qui l'a établi, pas une supposition.

---

## [4.72] — 10 août 2026

### Corrigé
- **La vue territoire montrait 25 contours et aucun zonage — sans rien dire.** Signalé sur
  téléphone dès la mise en ligne : la carte semblait vide. `municipality?geom=` ne renvoie
  pas le champ `partition` (contrairement à `municipality?insee=`), et le code **abandonnait
  en silence**. Le zonage est désormais demandé **par contour de commune** quand la
  partition manque, puis découpé sur ce contour pour ne pas draper le PLU du voisin.
- **Une commune sans zonage porte maintenant un motif**, affiché dans le panneau. Elle se
  confondait à l'écran avec une commune encore en cours de chargement.
- **Zéro zone n'est plus traité comme un succès** : le bandeau annonce en clair
  « X communes tracées, aucun zonage reçu » et **désigne le bouton** « 🔎 Détail des
  sources ». Un échec muet est le pire des échecs.
- **Les limites communales étaient invisibles.** Un trait gris foncé de 1,1 px sur une photo
  aérienne ne se voit pas : les 25 contours étaient bien tracés et l'écran paraissait n'en
  montrer aucun. Ils portent désormais un liseré sombre large sous un trait clair fin, qui
  tient sur n'importe quel fond. Mézières passe en **or** — le blanc se confondait avec eux.
- **Le panneau des 25 communes recouvrait les boutons**, dont « 🔎 Détail des sources » —
  précisément celui qu'il faut atteindre quand la vue ne montre rien. Sur un téléphone de
  360 px, il n'en laissait que 80. Il passe en haut à droite.
- **Le bandeau d'état disparaissait au bout de six secondes.** Le minuteur qui masque le
  message du village effaçait aussi ceux du territoire : ni progression, ni échec.

### Modifié
- **Le fond bascule sur le plan IGN en vue territoire.** À 30 km de distance, la photo
  aérienne n'est qu'un tapis de parcelles ; le plan laisse lire les couleurs et les limites.
  Le bouton « Vue aérienne » reste maître ensuite.

---

## [4.71] — 10 août 2026

### Ajouté
- **« Le territoire » — les 25 communes des Terres du Val de Loire.** Un bouton de la carte
  3D prend du recul et affiche le zonage des **25 PLU communaux en vigueur**, coloré par
  les quatre familles normalisées du Géoportail (U, AU, A, N). Mézières est cerclée de
  blanc. Un panneau liste les 25 communes avec, pour chacune, son nombre de secteurs, son
  statut RNU, ou l'échec de son zonage.
- **Le PLUi-H-D est annoncé comme en cours d'élaboration**, pas comme le document en
  vigueur : ce sont bien 25 PLU distincts qui sont montrés (RG-17.19).

### Note technique
- **Aucun code INSEE n'est écrit dans le code.** Seuls les 25 **noms**, fournis par la
  mairie, le sont ; codes, contours, partitions et statut RNU viennent de
  `municipality?geom=`. Une commune que le Géoportail ne place pas dans l'emprise est
  **signalée** dans le bandeau et dans « 🔎 Détail des sources » — jamais remplacée par une
  supposition. Écrire 25 codes de mémoire referait la faute 45203/45204, à 25 exemplaires
  et invisible à cette échelle. La fenêtre de recherche est volontairement large : trop
  petite, des communes manquent et sont signalées ; trop grande, des voisines reviennent et
  le filtrage par nom les écarte. L'erreur est rattrapable dans les deux sens.
- **Aucune règle de construction hors de Mézières** : `data/plu-data.json` ne décrit que le
  PLU communal. En vue territoire, un clic nomme la commune et la famille de zone, sans
  ouvrir la fiche des règles (RG-17.21).
- ⚠️ **Le piège « 1AU ».** Les zones à urbaniser s'écrivent presque toujours avec le
  chiffre de phasage en tête, et « AU » commence par un « A ». Le test écrit avant la
  correction a attrapé les deux : sans précaution, toutes les zones à urbaniser du
  territoire retombaient en gris — y compris celles de Mézières.
- Le cadrage est **déduit des contours reçus** (`fitBounds`), pas d'un zoom écrit à la
  main. Aucun bâtiment n'est chargé à cette échelle.
- Chargement par **vagues de quatre** requêtes : 25 appels lancés d'un coup étranglent un
  téléphone. La carte se remplit au fur et à mesure.

---

## [4.70] — 10 août 2026

### Ajouté
- **De vrais toits en pente sur la carte 3D.** MapLibre ne sait extruder que des prismes à
  sommet plat — mais rien n'interdit d'en empiler. Un toit à deux pentes est approché par
  des **tranches horizontales** de ≈ 30 cm, de plus en plus étroites, entre le haut des murs
  et le faîtage, ce dernier posé le long du **grand axe de l'emprise**. De 4 à 12 tranches
  selon la hauteur : une annexe n'a pas besoin d'autant de marches qu'un clocher.
  Les arêtes des tranches se lisent de près comme des **rangées de tuiles** — effet non
  recherché mais heureux, et exprimé en mètres, donc stable à tous les zooms.
- **Un test vérifie qu'un toit ne déborde jamais de son bâtiment.** Le découpage porte sur
  l'emprise réelle et jamais sur son rectangle englobant : sur une maison en L, un toit posé
  sur le rectangle couvrirait la cour.

### Retiré
- **La trame de fenêtres sur les façades, introduite en v4.69.** `fill-extrusion-pattern`
  répète son motif en **pixels**, pas en mètres : le nombre de rangées grandit avec le zoom,
  et une maison de 6 m finissait par ressembler à un immeuble de six étages. MapLibre
  n'offre aucun ancrage métrique — il n'y avait rien à régler, seulement à retirer. Un rendu
  dégradé est acceptable, un rendu faux ne l'est pas.

### Corrigé
- **Cliquer sur une maison n'ouvrait plus sa fiche depuis la v4.69.**
  `queryRenderedFeatures` n'interroge que la couche `bati` ; pour porter la texture,
  l'habitat était passé dans une couche `bati-tex` séparée, et devenait donc inclicable —
  le cas le plus courant. La suppression de la texture ramène tous les murs dans une seule
  couche. Aucun test ne couvrait le clic ; la maquette de rendu, elle, ne clique pas.
- **Les maisons retrouvent leur teinte selon la hauteur.** `fill-extrusion-pattern`
  remplaçant `fill-extrusion-color`, l'habitat était le seul type à ne plus être coloré.

### Note technique
- L'industriel et le bâti hors commune gardent une **casquette plate** : toitures réellement
  plates pour l'un, arrière-plan assumé pour l'autre — et ≈ 32 000 polygones économisés.
  Les filtres des deux couches de toiture sont **exactement complémentaires**, sans quoi les
  volumes se superposeraient. Voir **ADR-0020**.

---

## [4.69] — 10 août 2026

### Ajouté
- **Des toits sur les bâtiments de la carte 3D.** Une seconde couche d'extrusion posée sur
  la **même source**, entre `fill-extrusion-base = mat_h` et
  `fill-extrusion-height = mat_h + mat_toit` : tuile sur l'habitat, ardoise sur l'église et
  les bâtiments remarquables, bac acier sur l'agricole et l'industriel. MapLibre ne sait
  faire que des prismes — ce n'est donc pas une pente, mais une casquette colorée en haut
  de chaque volume, qui se lit comme un toit dès qu'on prend du recul (RG-17.15).
- **Six catégories de bâtiments au lieu d'une.** La requête BD TOPO ramenait déjà `nature`,
  `usage_1` et `legere` : ces attributs étaient **jetés**. Ils servent désormais à
  distinguer habitat, agricole, industriel, cultuel, remarquable et annexe, par la couleur
  des murs, celle du toit et la hauteur de la casquette. C'est la variété qui fait qu'un
  village paraît vrai, plus que la finesse de chaque volume.
  ⚠️ `nature` vaut très souvent le fourre-tout « Industriel, agricole ou commercial », qui
  contient les trois mots : `usage_1` est lu **en premier**, sinon une usine est classée
  agricole. Les valeurs non reconnues retombent sur `habitat` et sont **listées dans le
  panneau « 🔎 Détail des sources »** — de quoi affiner sur pièce plutôt qu'à l'aveugle,
  l'IGN étant inaccessible depuis l'environnement de développement.
- **Une trame de fenêtres sur les façades d'habitation**, dessinée en mémoire par
  l'application (`map.addImage`) : **aucune image téléchargée**, poids de page inchangé.
- **Le test de pose des couches est étendu** à quatre bâtiments d'essai (maison, église,
  hangar, hors commune) et vérifie les quatre couches plus l'enregistrement de la texture.

### Note technique
- `fill-extrusion-pattern` **remplace** `fill-extrusion-color` : une façade texturée ne peut
  pas être en même temps teintée par catégorie sur la même couche. D'où deux couches à
  **filtres disjoints** — `bati-tex` pour l'habitat de la commune, `bati` pour tout le
  reste. Sans la disjonction, les volumes se superposent et scintillent, et la trame de
  fenêtres se retrouve sur les hangars et sur l'église.

---

## [4.68] — 10 août 2026

### Corrigé
- **Plus aucun bâtiment ne s'affichait sur la carte 3D.** Pour estomper les constructions
  des communes voisines, la v4.66 passait une expression basée sur les données à
  `fill-extrusion-opacity`. MapLibre ne le permet pas (« data expressions not supported »)
  et **refuse alors la couche entière** : au lieu d'un estompage, la disparition totale du
  bâti. La distinction passe désormais par la **couleur** — `fill-extrusion-color` accepte,
  lui, les expressions de données. Les bâtiments hors commune sont d'un gris sourd.
  Même piège que `fill-extrusion-ambient-occlusion-*`, propriété de Mapbox absente de
  MapLibre : une propriété peut exister sans accepter ce qu'on lui demande.

### Ajouté
- **Un test pose la couche des bâtiments avec un bâti fictif** et vérifie qu'elle est bien
  acceptée, sans aucune erreur de validation. Aucun test ne pouvait voir la régression :
  sans réseau il n'y a pas de bâti à poser, donc la couche n'était jamais créée. Le test a
  été vérifié en le faisant échouer sur le code fautif avant d'être conservé.

---

## [4.67] — 10 août 2026

### Corrigé
- **Les correctifs des v4.64 à v4.66 n'arrivaient pas chez les habitants.** `js/mat-boot.js`
  a été modifié trois fois en restant servi sous `?v=4.4.1`. Le service worker sert en
  stale-while-revalidate : tant que l'URL ne change pas, c'est la copie en cache qui part.
  Le navigateur recevait donc l'ancien boot, qui demandait l'ancien `mat-carte3d.js` — d'où
  un bouton « Où suis-je » **affiché mais inerte** (`index.html`, lui, n'est pas versionné)
  et un zonage toujours non découpé sur la commune. `mat-boot.js` et `mat-mel.js` sont
  repassés en `?v=4.5.0` et `?v=4.4.0`. Voir **ADR-0019**.

### Ajouté
- **`scripts/check-cache-bust.js`, branché sur la CI.** Il vérifie que chaque ressource
  porte le même `?v=` dans `index.html`, `js/mat-boot.js` et `service-worker.js`, et
  surtout qu'un fichier de `js/` ou `css/` modifié voit son `?v=` modifié **dans le même
  lot**. `actions/checkout` passe en `fetch-depth: 0` — sans historique, le contrôle
  s'ignorerait en silence, ce qui reproduirait la faute qu'il corrige.
- Le panneau « 🔎 Détail des sources » distingue désormais ce que le service a **renvoyé**
  de ce qui est **retenu pour la commune** : « 185 reçus · 12 dans la commune ». Les deux
  chiffres avaient la même apparence, et le premier était lu comme le second.

### Documentation
- `docs/adr/0019-cache-busting-un-fichier-modifie-sans-nouveau-v-n-arrive-jamais.md`
- `CLAUDE.md` — règle du `?v=` aux trois endroits, avec la raison

---

## [4.66] — 10 août 2026

### Corrigé
- **Les compteurs annoncés par la carte 3D étaient faux.** Le bandeau affichait « 4 382
  bâtiments · 185 zones du PLU de Mézières-lez-Cléry ». Or l'emprise interrogée fait
  **7 km sur 6,7 km** et déborde sur Cléry-Saint-André, Mareau-aux-Prés et Dry : ces chiffres
  couvraient quatre communes tout en étant attribués à une seule. Et le Géoportail renvoyant
  **un polygone par secteur**, « 185 zones » laissait croire à 185 règles différentes alors
  qu'il n'y a qu'une douzaine de zones. Le bandeau annonce désormais les **bâtiments
  réellement situés dans la commune** et le nombre de **zones distinctes**.
- **Le zonage des communes voisines pouvait s'afficher comme s'il était le nôtre.** Quand la
  requête par partition échouait, le repli géographique ramenait le PLU de tout le secteur.
  Le zonage est maintenant découpé sur le **contour réel de la commune**, renvoyé par le
  Géoportail. C'est la même classe d'erreur que l'INSEE 45203, et elle est refermée.
- **Restrictions sécheresse : le code INSEE interrogé était celui de Meung-sur-Loire.**
  `_EAU_INSEE` valait `45203` ; Mézières-lez-Cléry est `45204`. Le module retenant le niveau
  le plus sévère entre la requête par coordonnées (correcte) et celle par commune, une
  restriction d'eau qui n'était pas la nôtre a pu être affichée. Corrigé aussi côté backend.
- **La carte « Communauté » portait la même icône 🏘️ que « Mon village en 3D »** : deux
  entrées voisines qu'on hésitait à distinguer. Elle passe à 👥.

### Ajouté
- **Bouton « 📍 Où suis-je »** dans la carte 3D : centre la vue sur votre position et affiche
  la zone du PLU correspondante. La position **ne quitte pas le navigateur** — aucune requête
  réseau, rien n'est transmis à la commune. Si vous êtes hors de la commune, c'est dit.
- **La limite communale est tracée** sur la carte, et les bâtiments des communes voisines
  sont **estompés** : ils situent Mézières dans son territoire sans se faire passer pour elle.
- Trois tests : présence du bouton « Où suis-je », et **garde-fou contre les icônes en
  double** parmi les cartes d'accueil — c'est ce doublon qui avait été signalé.

---

## [4.65] — 9 août 2026

### Modifié
- **« Mon village en 3D » sort du grand dossier PLUi-H-D et rejoint l'accueil.** La carte
  n'était atteignable qu'après avoir ouvert le dossier PLUi — autant dire jamais découverte.
  Elle a désormais sa tuile dans « Démarches et Services », sous MEL.
- **Rubrique « Démarches et Services » réorganisée en grille régulière** : MEL et « Je viens
  d'emménager » sur la première rangée, « Mon village en 3D » et « Documents officiels » sur
  la seconde. « Je viens d'emménager » perd son bandeau pleine largeur — beaucoup de surface
  pour un sujet qui concerne quelques foyers par an — et son sous-titre passe de « Guide
  d'arrivée des nouveaux habitants » à « Guide d'arrivée ». Les rangées restent de hauteur
  égale à 320, 360 et 390 px (tests de v4.63 au vert).
- **Sur ordinateur**, la carte apparaît dans la colonne « 🤝 Vous aider » et dans le menu du
  haut, à côté de PLUi-H-D. Sans quoi elle serait restée invisible aux visiteurs sur écran
  large, la grille de cartes étant propre au téléphone.
- **Un seul nom partout : « Mon village en 3D ».** Trois formulations cohabitaient — titre
  d'écran « Le village en 3D », bloc PLUi « Voir le zonage actuel en 3D », et l'intitulé
  souhaité pour la tuile. Une divergence de nom est le premier pas vers une divergence de
  contenu. Le bouton de MEL devient « 🏘️ Voir ma zone en 3D » : c'est une action, pas un
  second nom de la fonctionnalité.

### Ajouté
- Trois tests dans `tests/e2e/carte3d.spec.js` : présence de la tuile d'accueil **après**
  celle de MEL (mise en page téléphone), présence dans la colonne « Vous aider » et dans le
  menu (mise en page ordinateur), et unicité du nom entre la tuile, le titre d'écran et
  l'attribut d'accessibilité.

---

## [4.64] — 9 août 2026

### Ajouté
- **Le village en 3D** (`js/mat-carte3d.js`, overlay `ov-carte3d`). Le bâti de Mézières en
  relief sur l'orthophoto de l'IGN, avec le **zonage du PLU drapé au sol**. Toucher un
  bâtiment ouvre sa zone et les règles qui s'y appliquent — emprise, hauteur, recul,
  clôtures, puis abri de jardin, piscine, extension et panneaux solaires avec « rien à
  faire / déclaration / permis ». Ces règles viennent de `data/plu-data.json`, le fichier
  qui alimente déjà MEL : aucune donnée n'a été dupliquée.
- **Deux portes d'entrée.** La page PLUi-H-D ouvre la vue d'ensemble ; **MEL** propose
  « 🏘️ Voir ma zone sur la carte 3D » une fois la zone détectée, et transmet les
  coordonnées **déjà trouvées** par `melFindZoneByAddr` / `melFindZoneByGPS`. La recherche
  d'adresse n'est pas réimplémentée.
- **Panneau « 🔎 Détail des sources »** : chaque service interrogé et le motif exact de son
  refus, `ExceptionText` XML des serveurs OGC compris.
- **Le nom de la commune servie par le Géoportail est affiché.** Voir ci-dessous.
- `tests/e2e/carte3d.spec.js` — 5 tests × 2 formats : MapLibre absent au démarrage, entrée
  depuis la page PLUi-H-D, fermeture par Échap, bouton de diagnostic masqué vérifié sur le
  **style calculé**, et audit axe sans violation sérieuse.

### Corrigé
- **Le zonage affiché n'était pas celui de Mézières.** Le code INSEE utilisé était `45203`,
  qui est **Meung-sur-Loire** ; Mézières-lez-Cléry est `45204`. Le plan de la commune
  voisine se trouvait drapé sur la photo aérienne de Mézières, sans aucun signe distinctif.
  Le nom de commune renvoyé par le Géoportail est désormais affiché à l'écran pour qu'une
  telle divergence ne puisse plus passer inaperçue.
- **Le zonage ne se chargeait pas du tout au départ** : la requête passait `insee` à
  l'appel `zone-urba`, qui n'accepte que `partition` ou `geom`. L'erreur était avalée en
  silence — ni zonage, ni légende, ni message. Trois tentatives enchaînées désormais, et
  le motif d'échec est conservé et affiché.

### Sécurité / robustesse
- **Aucune donnée n'est inventée pour combler un trou.** Un village de substitution était
  dessiné quand les sources ne répondaient pas : sur la commune, cela a produit de fausses
  maisons par-dessus les vrais champs et le vrai zonage. Supprimé. Quand une source manque,
  il n'y a aucun bâtiment, et c'est écrit. Voir **ADR-0018**.
- **MapLibre GL (~1 Mo) n'est chargé qu'à la première ouverture de la carte** et n'est pas
  précaché par le service worker. L'Éco-index de l'accueil est donc inchangé. Conséquence
  assumée : la carte 3D ne fonctionne pas hors connexion, contrairement au reste de l'app.

### Documentation
- `docs/adr/0018-carte-3d-chargement-a-la-demande-et-jamais-de-donnee-inventee.md`
- `docs/specifications/sfd/SFD-17-carte-3d-du-village.md`
- `docs/guide-utilisateur.md`, `docs/guide-technique.md`, `CLAUDE.md` (tableau d'aiguillage)

---

## [4.63] — 9 août 2026

### Corrigé
- **70,5 % du texte peint sur l'accueil était sous 12 px** (Lighthouse mobile : « Document
  doesn't use legible font sizes — 29.6% legible text »). Mesure indépendante sur le rendu
  réel : 1 066 caractères visibles sur 1 491. Les plus gros volumes étaient `.ct-sub` à
  **9,9 px** (les sous-titres qui disent à quoi sert chaque carte), `.sec` à 9,9 px et
  `.top-sub` à **10,1 px** (« Prochaine ouverture lundi à 14 h »). Plancher de **12 px
  (0.75rem)** appliqué à 40 règles de `css/mat.css`, aux styles inline correspondants
  d'`index.html` et à deux chaînes de `js/mat-core.js`. **Après : 100 % du texte ≥ 12 px.**
- **`body` ne suivait pas le réglage « Taille du texte ».** `html,body{font-size:16px}`
  posait la taille sur les deux éléments, alors que `html.font-large` / `html.font-xl` ne
  redéfinissent que `html` : `body` restait figé à 16 px dans les trois modes (vérifié :
  racine 22 px, body 16 px). Tout élément **sans `font-size` explicite** héritait donc de
  16 px sans jamais échelonner. Impact nul à ce jour — ce code déclare une taille partout —
  mais piège silencieux pour toute addition future. `body{font-size:1rem}`.
- Géométrie des pastilles portée de 18 à **20 px** (`.notif-badge`, `#sondages-badge`,
  `#photos-badge`) : à 12 px de texte, le chiffre ne tenait plus dans un rond de 18 px.
- **`line-height` manquant sur `.top-title`, `.sec` et `.ct-sub`** : ces règles héritaient
  du `1.5` de la racine, soit 18 px de hauteur de ligne pour 12 px de texte, quand leurs
  voisins du même composant (`.top-main` 1.15, `.ct-label` 1.2) étaient serrés. Invisible
  à 9,9 px, c'est devenu la moitié de l'enflure au passage à 12 px : les tuiles du header
  montaient à 106 px. Avec `line-height:1.2`/`1.25` et un rognage mineur des marges
  (`.top-card` 8→7 px, `.sec` 12/8→9/6 px, `.top-badge` 2→1 px) : **tuiles à 95–96 px et
  page à 1 795 px, soit +1,7 % au lieu de +6,2 %** — sans toucher à une seule taille de
  police.
- **Marges des cartes resserrées** (`.card` padding 14→10 px, gap icône/texte 11→9 px).
  La vérification initiale ayant été faite à 412 px, elle était aveugle au cas courant :
  à **360 px**, deux cartes par ligne ne laissent que ~130 px de texte utile et les
  sous-titres coupés passaient de 2 à **10 sur 15**. Ces 6 px récupérés les ramènent à
  5 sur 15, et la page à **+1,3 %** contre `main` (1 838 → 1 862 px) au lieu de +2,9 %.
  Les **libellés** qui se coupent (« Sondage citoyen », « Vos photos »…) se coupaient
  **déjà avant** : `.ct-label` n'a pas été modifié.
- **Rangées de cartes de hauteurs inégales.** Quatre sous-titres retirés ou fusionnés pour
  que chaque carte tienne sur deux lignes : « Votre avis compte » (Sondage citoyen) et
  « On s'en occupe ! » (Signaler un bug) supprimés, « Ici c'est Mézières ! » → « Ici c'est
  Mézières », et « Entreprises » + « Artisans & services » fusionnés en « Entreprises &
  services ». **Toutes les rangées ont désormais la même hauteur à 320, 360 et 390 px**, et
  la page revient à 1 837 px — soit celle d'avant le lot (1 838 px), avec 100 % du texte
  lisible. Verrouillé par un test par rangée.
- Apostrophe droite ASCII dans « Ici c'est Mézières ! » remplacée par U+2019.
- **Libellés du badge performances en toutes lettres** (`js/mat-perf.js`) : « Perf » →
  « Performances », « Access » → « Accessibilité », « Pratiques » → « Bonnes pratiques ».
  Le badge occupant de toute façon deux lignes en mobile, l'abréviation ne faisait plus
  gagner de place et rendait ces libellés obscurs pour un habitant. Date conservée en
  **jj/mm/aaaa**, avec un `title` qui précise ce qu'elle désigne.
  Coût mesuré : à 360, 390 et 412 px le badge reste sur 2 lignes (41 px) ; à **320 px** il
  passe à 3 lignes (+23 px) ; en desktop il reste sur 1 ligne, mais la rangée basse du pied
  de page passe de 28 à 50 px à 1 280 px (elle ne bougeait pas à 1 440 px). Aucun
  débordement horizontal à aucune largeur.

### Ajouté
- **`tests/e2e/typographie.spec.js`** — 7 tests qui mesurent le **style calculé** du texte
  réellement peint, et non la feuille de style. Nécessaire : `.mat-version` était déclarée
  à `0.5rem` dans `mat.css` **et** à `0.52rem` en inline dans `index.html`, l'inline
  gagnant. Couvre le plancher dans les trois modes de taille, le suivi `body`/racine,
  l'absence de débordement horizontal et de rognage vertical, et la tenue des pastilles.

### Notes
- **Non traité dans ce lot** : les 31 déclarations sous 12 px de `css/mat-desktop.css`, les
  overlays de `css/mat.css`, `admin.html` (109), et les pages secondaires. Les tests
  typographiques sont explicitement bornés à l'écran mobile/PWA. Voir **ADR-0017**.
- Le multiplicateur d'accessibilité fonctionnait déjà : 98 % des déclarations du dépôt sont
  en `rem`. Seuls 2,7 % du texte étaient figés, et exclusivement des emojis d'icônes.

---

## [4.62] — 9 août 2026

### Corrigé
- **Neuf éléments interactifs étaient hors de portée du clavier** (RGAA 7.3 / WCAG 2.1.1),
  dont les quatre tuiles du haut de l'accueil (`.mairie-strip`, `.meteo-strip`,
  `.dechets-strip`, `.event-strip`), la photo `img.mat-img` qui est le **seul** accès à
  l'overlay « Qui suis-je ? », et la zone de dépôt de `#photo-upload-area` — dont
  l'`<input type="file">` est en `display:none`, ce qui rendait le partage d'une photo
  **impossible** sans écran tactile ni souris. Tous étaient des `<div onclick>` : pour
  axe-core, des conteneurs inertes. Les tests d'accessibilité étaient donc au vert.
  Le motif correct (`role="button"` + `tabindex="0"` + `onkeydown` avec `preventDefault()`)
  existait déjà dans `index.html`, appliqué à `.bus-strip` et `.fuel-strip` seulement.
  Voir **ADR-0016**.
- **Le focus clavier n'était pas signalé de façon suffisante.** `.bus-strip` et
  `.fuel-strip` portaient `outline:none` et ne marquaient le focus que par un changement
  de fond à peine perceptible. Nouvel anneau sur `[role="button"]:focus-visible`
  (spécificité 0-2-0, il l'emporte sur ces `outline:none`), avec variantes contraste élevé
  et thème sombre. `:focus-visible` : rien ne change au clic ni au toucher.
- **Aperçus de photo jointe sans `alt`** (`#signal-photo-preview`, `#bug-photo-preview`).

### Ajouté
- **`tests/e2e/accessibilite-clavier.spec.js`** — 14 tests, dont un **test de propriété**
  qui énumère tous les `[onclick]` du DOM et échoue si l'un d'eux n'est ni nativement
  focusable, ni doté d'un `tabindex`, ni couvert par une exception documentée (fonds
  d'overlay, conteneur dont un descendant focusable porte l'action). C'est ce test qui a
  trouvé `img.mat-img` après le premier passage de corrections manuelles.
- Mention de la navigation clavier dans la **déclaration RGAA** de l'application et dans
  `docs/guide-utilisateur.md` §10.

### Modifié
- Le bouton **Vos photos** de l'accueil perd son sous-titre « Galerie communale » : sa
  hauteur s'alignait mal sur celle des cartes voisines.

---

## [4.61] — 7 août 2026

### Corrigé
- **Les étoiles du ciel dégagé ne s'affichaient plus depuis le 1ᵉʳ août** (v4.52.1), la nuit
  comme à l'aube et au crépuscule, décor de Noël compris. La suppression de l'effet d'été
  « poussière de lumière » avait laissé une **accolade fermante orpheline** dans
  `css/mat.css`, juste au-dessus de `.amb-star`. Le parseur CSS ne se contente pas d'ignorer
  un `}` surnuméraire : il le consomme **avec le sélecteur qui suit** — une seule règle
  disparaît, silencieusement, et le reste du fichier continue de s'appliquer. Les `✦`
  étaient donc bien créés par `js/mat-ambiance.js`, mais rendus en `position:static`,
  empilés en haut du bandeau, à la couleur de texte héritée et sans scintillement :
  invisibles sur le dégradé de nuit. Voir **ADR-0015**.

### Ajouté
- **Contrôle de structure des feuilles de style en CI** (`scripts/check-css.js`, branché sur
  le job `syntax-check` de `ci.yml`) : l'équilibre des accolades de `css/**.css` est vérifié
  à chaque push. Sans dépendance. La CI ne portait jusqu'ici que sur la syntaxe JS.
- **Test E2E sur le rendu des étoiles**, et plus seulement sur leur composition. Les onze
  tests de `tests/e2e/ambiance.spec.js` assertaient sur `dataset.kind` — ils sont tous restés
  au vert pendant les six jours du bug. Le nouveau test vérifie le **style calculé**
  (`position`, `animation`) et la dispersion des étoiles dans le bandeau.

### Documentation
- `docs/adr/0015-accolade-orpheline-css-avale-la-regle-suivante.md` — mécanisme exact,
  pourquoi les trois filets (CI, tests, relecture) ont laissé passer, et alternatives écartées.
- `docs/guide-technique.md` §7 — les étoiles d'aube/crépuscule (`stars-dim`) y étaient encore
  décrites comme inexistantes ; avertissement ajouté sur `.amb-star`, et `ci.yml` mis à jour
  dans le tableau des workflows.
- `CLAUDE.md` — deux règles ajoutées à la section « Édition de fichiers ».

---

## [4.60] — 7 août 2026

### Corrigé
- **Un document PDF envoyé depuis l'admin renvoyait `HTTP ERROR 401`.** Le fichier se
  téléversait sans erreur, l'écran affichait « Document publié », la liste l'affichait — et
  le lien était inouvrable. Cloudinary bloque **par défaut** la livraison des « types de
  médias restreints », PDF en tête, et répond 401 sur l'URL nue : `resource_type: "raw"`
  était nécessaire mais **pas suffisant**. L'URL de livraison est désormais **signée**
  (`pluiDocUrl()`, backend), une URL signée étant délivrée même quand le type est restreint.
  Elle n'est plus stockée mais reconstruite à chaque `GET /docs/plui` à partir du `publicId`,
  ce qui répare sans migration les documents envoyés avant le correctif. Voir ADR-0014,
  section « Mise à jour du 7 août 2026 ».

### Ajouté
- **Pastille « Nouveau » sur chaque document non encore consulté** (+ contour vert), et plus
  seulement sur le bandeau d'accueil. Avec plusieurs documents publiés, rien n'indiquait
  lequel venait d'arriver.

### Modifié
- **Le suivi « déjà vu » passe des identifiants de documents à la place d'une clé globale**
  (`mat_plui_docs_seen` contient désormais un tableau d'`id`). L'ancienne clé
  *date du plus récent + nombre* disait seulement « quelque chose a changé » : elle ne
  permettait pas de savoir **quel** document était neuf, donc pas de le signaler dans la
  liste. L'ancienne valeur est ignorée sans casse (repli sur « rien de vu »).
- `GET /docs/plui` n'expose plus le `publicId` Cloudinary — détail interne — et renvoie à la
  place un booléen `fichier` qui dit à l'admin si le document est hébergé (📎) ou pointé par
  un lien (🔗).

---

## [4.59] — 7 août 2026

### Ajouté
- **Les documents du PLUi-H-D s'administrent depuis le tableau de bord.** Nouvelle section
  « Documents du PLUi-H-D » dans l'onglet 📁 Documents (`admin.html`) : titre, date, puis au
  choix un **fichier PDF** (jusqu'à 4 Mo, hébergé via Cloudinary en `resource_type: "raw"`)
  ou un **lien externe** sans limite de taille. Côté backend : `GET /docs/plui`,
  `POST`/`DELETE /admin/docs/plui`, stockage `mat:docs:plui`, sur le patron des « documents
  temporaires » de `routes/docs.js`. Voir ADR-0014.

### Modifié
- **`PLUI_DOCS` n'est plus une constante à éditer** (`js/mat-plui.js` v1.1.0). Le tableau
  était vide et le serait resté : publier un document imposait un commit et un déploiement.
  Il devient le miroir local de `GET /docs/plui`, réhydraté depuis `localStorage`
  (`mat_plui_docs_cache`) — **la page reste consultable hors connexion**, ce qui aurait été
  perdu en passant naïvement au réseau.
- **La pastille « Nouveau » s'allume enfin au bon moment.** La liste est rafraîchie au
  démarrage de l'application (différé de 2,5 s), et plus seulement à l'ouverture de la page :
  chargée à l'ouverture, le badge ne se serait allumé qu'une fois la page déjà vue.

### Sécurité / robustesse
- Garde-fou de taille **dans le navigateur** avant tout envoi : un PDF de plus de 4 Mo est
  refusé avec la marche à suivre (déposer sur Drive et coller le lien), plutôt que de laisser
  partir une requête qui reviendrait en 413. `/admin/docs/plui` est ajouté à
  `_isLargeBodyRoute` côté backend (6 Mo au lieu de 256 Ko).
- Supprimer un document supprime aussi le fichier hébergé (pas de PDF orphelin) et l'action
  est tracée au **journal d'audit**.

---

## [4.58] — 6 août 2026

### Modifié
- **Grille desktop réorganisée par thème, colonnes de largeur égale.** Les cartes étaient
  réparties sans logique et la colonne de gauche descendait **344 px** plus bas que les deux
  autres (1114 px contre 770 et 781, mesuré à 1920 px). Trois colonnes désormais, chacune
  introduite par un `.d-col-titre` : `.d-col-left` « 🏛️ La mairie au quotidien » (horaires,
  bus, collectes), `.d-col-center` « 📰 La vie de la commune » (évènement, actualités,
  photos), `.d-col-right` « 🤝 Vous aider » (guide d'arrivée, MEL, signalement, élus).
  `grid-template-columns` passe de `1fr 1.15fr 1fr` à `1fr 1fr 1fr`.
- **« Le saviez-vous ? » sort des colonnes** et devient un bandeau pleine largeur
  (`.d-sv-bandeau`) au-dessus de la grille, comme sur mobile où il est en tête de page. Il
  n'appartenait à aucun des trois thèmes, et l'enfermer dans une colonne la déséquilibrait
  dès qu'on le dépliait.
- **Densité des aperçus réduite** : `loadActus()` affiche 3 articles au lieu de 5 (carte
  583 → 360 px), et `#dsk-photos-grid` passe de 2×2 à une rangée de 4 vignettes carrées
  (450 → 214 px). Ce sont des aperçus — « Toutes → » et « Galerie → » ouvrent le reste.
- Résultat mesuré : **789 / 843 / 668 px**, écart max ramené de 344 à **175 px**.

### Corrigé
- **Le bandeau « Le saviez-vous ? » restait blanc sur fond sombre.** Les règles
  `.d-col-left .sv-*` n'avaient aucun pendant `html.theme-sombre` ; le défaut existait déjà
  mais passait inaperçu dans une colonne étroite. Onze règles sombres ajoutées.

## [4.57] — 5 août 2026

### Ajouté
- **Les numéros d'urgence sont accessibles sur ordinateur.** Le bouton « 📞 Urgences » vivait
  dans `.header`, que `css/mat-desktop.css` passe en `display:none` au-dessus de 1024 px :
  `openNums()` n'avait donc **aucun** point d'entrée desktop. Nouveau bouton `.d-nav-urgence`
  dans la barre de navigation, groupé avec Accessibilité dans `.d-nav-tools`. Même dégradé
  rouge que sur mobile (blanc sur `#b91c1c` = 6,4:1, WCAG AA respecté).
- **Carte « Je viens d'emménager » sur ordinateur** (`.d-guide-card`, colonne centrale). Le
  guide d'arrivée n'était atteignable que par l'entrée « Nouveaux habitants » du menu ; il
  porte maintenant le même libellé que sur mobile, là où l'habitant qui arrive le cherche.
- **Aperçu de la galerie photos sur ordinateur** (`#dsk-photos`, colonne centrale) :
  `loadPhotosDesktop()` affiche les 4 dernières photos, le clic ouvre `openGalerie()`, et le
  diaporama plein écran se lance depuis la carte. La tuile mobile vivait dans `.content`,
  également masqué au-dessus de 1024 px.
- **Radio Mézières et le groupe « Ici c'est Mézières ! »** dans `.d-footer-links`.

### Documentation
- `docs/guide-utilisateur.md` §3 : nouvelle sous-section « Sur ordinateur » décrivant la mise
  en page en trois colonnes et ce qui reste propre au téléphone (carburants, majordome).
- `docs/guide-technique.md` §12 : nouvel item de checklist « Point d'entrée desktop », avec la
  commande de comparaison des `open*()` mobile / desktop. Origine de ces trois oublis : rien
  ne signale qu'une tuile ajoutée dans `.header` ou `.content` est invisible sur ordinateur.
- `docs/guide-technique.md` : le point de bascule desktop était annoncé à **900 px** à deux
  endroits alors que toutes les media queries sont à **1024 px**.

## [4.56.1] — 4 août 2026

### Corrigé
- **La carte « Prochaine manifestation » tronquait le nom du mois à trois lettres.** L'accueil
  affichait « 30 AOÛ » au lieu de « 30 AOÛT ». En cause, une table d'abréviations codée en dur
  dans `js/mat-widgets.js` (`MONTHS`), calibrée sur trois caractères : le seul mois de quatre
  lettres y perdait le sien, et `jun` / `jul` étaient les abréviations **anglaises** de juin et
  juillet. La carte utilise désormais `toLocaleDateString('fr-FR', {month:'short'})`, comme
  `fmtShort` côté desktop (`js/mat-desktop.js`) — une seule source, plus de double table.

## [4.56] — 3 août 2026

### Corrigé
- **Fibre : le rôle de chacun était faux, dans les trois canaux à la fois.** L'app, le guide
  d'arrivée et MEL présentaient Lysséo comme un guichet où l'habitant « vérifie son
  éligibilité » et « déclare sa construction ». Lysséo est le **réseau public fibre du
  Loiret**, exploité par **Loiret Fibre / XpFibre** en délégation de service public du
  Département : opérateur d'**infrastructure**, il ne vend **aucun** abonnement. Les trois
  entrées `numerique` de l'arbre de décision (`js/mat-mel.js` + `data/mel-tree.json`), la
  fiche fibre du guide d'arrivée (`js/mat-guide-arrivee.js`) et la règle `fibre` de
  `lib/mel.js` côté backend disent maintenant la même chose.
- **L'étape préalable d'une construction neuve était absente partout.** Une adresse neuve
  n'est pas connue de l'opérateur d'infrastructure : tant qu'elle n'y figure pas comme
  « raccordable », **aucun opérateur ne peut enregistrer la commande**. La déclaration se
  fait auprès de **XpFibre / Loiret THD** (permis de construire, certificat de numérotation,
  plan de masse localisant regard et fourreaux). Le rôle de la mairie — faire remonter la
  numérotation de la parcelle à la **Base Adresse Nationale** — est désormais énoncé.
- **Deux liens fibre cassés ou fragiles.** `lysseo.fr/page-contact/41` n'est pas l'adresse du
  formulaire de contact (`lysseo.fr/pagecontact/`), et deux réponses renvoyaient vers la page
  d'accueil en décrivant un bouton « en haut à droite » — une instruction de navigation qui
  casse au premier changement de menu. Les URL directes remplacent les deux.
- **Résidu « Val de Loire Fibre » dans `js/mat-utils.js`.** Le nettoyage de la v4.55 avait
  laissé `valdeloire-fibre.fr` — domaine inexistant — dans `URL_LABELS` et `KNOWN_DOMAINS` :
  un domaine nu écrit dans une réponse MEL devenait donc un lien mort, tandis que `lysseo.fr`
  n'était pas reconnu du tout. Remplacé par `lysseo.fr` et `xpfibre.com`.
- **Backend : le prompt du topic `numerique` était resté à l'ère pré-fibre** (« l'offre
  principale est le THD Radio / 4G fixe »). Il contredisait la règle directe située quelques
  lignes plus haut : en mode IA, MEL orientait vers le THD Radio une commune fibrée.

---

## [4.55] — 3 août 2026

### Ajouté
- **Corpus « Le saviez-vous ? » : 75 → 184 entrées** (172 sourcées + 12 calculées), soit
  six mois sans répétition. L'effort a porté sur les catégories les plus pauvres —
  santé, transports, intercommunalité, habitat, environnement, vie communale — et non sur
  l'urbanisme, déjà fourni. Les nouvelles entrées sont ajoutées **en fin de leur catégorie**,
  l'ordre de déclaration valant ordre de passage (RG-16.5).
- **Deux nouvelles catégories, `histoire` et `patrimoine`**, insérées dans
  `SV_ORDRE_CATEGORIES` après `decouverte`. Elles ne pouvaient pas rejoindre `decouverte` :
  le corpus fixe est concaténé **avant** les entrées calculées, si bien que des entrées
  `decouverte` du JSON se seraient placées en tête de rotation — à rebours de la RG-16.5.
- **Cinq entrées calculées** dans `SV_CALCULES` (`js/mat-saviez-vous.js`), toutes en
  arithmétique pure dérivée des seules coordonnées de la commune : vitesse d'entraînement par
  la rotation terrestre, tour du monde au parallèle de Mézières, longueur d'un degré de
  longitude, distance au méridien de Greenwich, antipode.
- **`revue-saviez-vous.html`** — page de relecture du corpus pour la mairie : question,
  réponse, explication, source et **date de passage**, dans l'ordre réel de rotation, avec
  filtres et mise en page d'impression. Elle interroge `window.matSaviezVousInventaire()`
  plutôt que de réordonner le corpus de son côté : une seconde implémentation divergerait, et
  la revue mentirait alors sur ce que voient les habitants. L'ADR-0012 exigeait cette relecture
  **avant** la fusion ; jusqu'ici rien ne la rendait praticable.
- **Trois tests Playwright** sur la page de revue (exhaustivité, filtre, axe-core).

### Corrigé
Trois erreurs relevées par la mairie sur la première version du corpus, et corrigées
**partout où elles vivaient** — pas seulement dans le corpus :

- **L'eau potable est gérée par le C3M**, syndicat intercommunal d'eau et d'assainissement
  dont le siège est à Mézières (36 rue du Bourg), et non par la Communauté de communes.
  Corrigé dans `data/saviez-vous.json`, dans `js/mat-guide-arrivee.js` et dans la règle
  `energie_eau_compteurs` de `lib/mel.js` côté backend — MEL racontait la même erreur.
- **Les mairies à station biométrique les plus proches sont Meung-sur-Loire, Ardon et
  Orléans.** La divergence signalée dans l'ADR-0012 est tranchée : `data/mel-tree.json`,
  édité par la mairie, fait foi. `lib/mel.js` disait Saint-Hilaire-Saint-Mesmin et
  Cléry-Saint-André — commune qui n'est pas équipée ; corrigé côté backend aussi.
- **L'inscription en déchèterie se fait par immatriculation** : une seule inscription vaut
  pour tous les sites, mais chaque véhicule utilisé doit être enregistré.

### Retiré
- L'entrée calculée sur le **midi solaire** : sa formulation dépendait de la date
  (heure d'été/hiver, et l'équation du temps décale le résultat de ±16 min selon la
  saison). Un fait du jour ne peut pas être approximatif de façon variable.
- Les trois questions sur les **prescriptions du Clos de Manthelon** : trop spécifiques à
  un lotissement pour une rubrique lue par toute la commune.
- Les questions portant sur des **tarifs communaux** (barnums, tables et chaises,
  concessions de cimetière) : elles vieillissent au premier vote du conseil.
- Deux questions de détail : le seuil de cinq réponses avant affichage du pourcentage, et
  la hauteur de clôture au droit des carrefours.

### Équilibre
- Ramené à 84 « oui » pour 88 « non » sur le corpus sourcé, pour qu'aucune des deux
  réponses ne devienne le réflexe gagnant.

### Notes
- Les sources externes visées (INSEE, IGN Géoplateforme, base POP/Mérimée, Hub'Eau,
  VigiEau, Vigicrues, Wikipédia) **n'ont pas pu être ouvertes** depuis l'environnement de
  développement : la politique d'egress refuse le CONNECT vers ces hôtes. Aucune entrée n'a
  donc été rédigée à partir d'elles — la règle « pas de source ouvrable, pas d'entrée » l'a
  emporté sur l'objectif de volume.
- Le déblocage est venu de la mairie, qui a **fourni elle-même les extraits** : le texte de
  la page Wikipédia de la commune (toponymie, administration, occupation des sols,
  recensements depuis 1793, base Mérimée, personnalités) et le **bulletin 2026 du C3M**
  (qualité de l'eau, gestes d'économie, loi Warsmann). C'est le mode d'emploi pour la suite :
  tant que la politique réseau ne s'ouvre pas, le corpus s'enrichit d'exports transmis par
  la commune, pas de données devinées.

---

## [4.54] — 2 août 2026

### Ajouté
- **« Le saviez-vous ? »** : un fait sourcé sur la commune chaque jour, posé sous forme de
  question, sur l'écran d'accueil. Repliée, la rubrique tient sur une ligne (~34 px).
  46 entrées sourcées + 7 générateurs calculés (`data/saviez-vous.json`,
  `js/mat-saviez-vous.js`).
- **Aucune IA à l'exécution** : le contenu vient du corpus versionné ou d'arithmétique
  pure ; chaque entrée porte sa source, affichée à l'écran. Voir
  [ADR-0012](docs/adr/0012-saviez-vous-corpus-verifie-sans-ia-a-l-execution.md) et
  [SFD-16](docs/specifications/sfd/SFD-16-le-saviez-vous.md).
- **Backend** : `GET` et `POST /saviezvous/:id` pour la répartition des réponses
  (déduplication par appareil, même motif que les RSVP).
- **Tests** : 7 scénarios Playwright × 2 profils, dont un **test d'intégrité du corpus**
  qui rejette toute entrée sans source — la règle anti-fake-news est vérifiée
  mécaniquement, pas laissée à la vigilance du relecteur.
- **Accessibilité** : première région `aria-live` du dépôt, sur la révélation de la
  réponse.

### Modifié
- Le lien de pied de page **« 🔗 Partager » devient « 🏛️ Créer la vôtre »** : il mène au
  kit de réplication destiné à une autre commune, pas à un partage entre voisins.

---

## [4.15] — 31 mai 2026

### Ajouté
- **Documentation** : guide utilisateur et guide technique publiés dans `docs/`
- **MEL** : règle directe pour les horaires de bruit et de bricolage (arrêté municipal)
- **RGPD** : badges de certification remontés en tête de l'overlay (0 CDN, IA souveraine…)
- **Desktop** : lien "Partager" discret dans le pied de page

### Corrigé
- Coordonnées mairie mises à jour (02 38 45 61 76 / mairie@mezieres-lez-clery.fr)
- CI : concurrence activée pour éviter les doublons de notifications

---

## [4.14] — 30 mai 2026

### Ajouté
- **Souveraineté** : Leaflet 1.9.4, polices Nunito et Sentry auto-hébergés — **0 dépendance CDN tierce**
- **Accessibilité** : déclaration RGAA v4 complète dans l'overlay, section Souveraineté numérique
- **CI** : audit EcoIndex hebdomadaire (empreinte carbone), audit Lighthouse automatique
- **Images** : conversion PNG → WebP (−95 %), optimisation JPG (−86 %)
- **Sécurité** : politique de divulgation responsable publiée (`SECURITY.md`)

### Corrigé
- Contrastes WCAG 2.1 AA vérifiés et corrigés dans toute l'app

---

## [4.13] — 29 mai 2026

### Ajouté
- **Suivi des signalements** : carte interactive + liste publique avec statuts (reçu, en cours, résolu)
- **Carte signalement** : localisation en haut de l'overlay de signalement
- **Admin Trello** : pilotage des signalements (déplacement/archivage de cartes)
- **Notifications propriétaires** : recevez une notification quand votre idée ou votre signalement change de statut
- **Filtres** : "Mes idées" / "Mes signalements" dans les overlays

---

## [4.12] — 27 mai 2026

### Ajouté
- **Boîte à idées** : couleurs des cartes selon le statut (accepté, en cours, refusé…)
- **Documents officiels** : rubrique Urbanisme ajoutée

### Corrigé
- Mode sombre sur overlays signalement et météo
- Filtres de suivi par statut avec compteurs

---

## [4.11] — 19–20 mai 2026

### Ajouté
- **Qualité de l'air & pollen** : barres de progression visuelles avec seuils d'alerte
- **Migration DNS** : domaine officiel `mezieres-lez-clery.fr` (Cloudflare Pages)

---

## [4.10] — 16–17 mai 2026

### Ajouté
- **Notifications météo** : alertes indépendantes avec niveau d'alerte configurable (orange, rouge)
- **Notifications** : guide batterie / optimisation dans l'overlay
- **Partager** : kit de réplication complet pour d'autres communes (`partager.html`)
- **Revue qualité** : 6 jalons de code review (sécurité, robustesse, maintenabilité, PWA)

---

## [4.9] — 15 mai 2026

### Ajouté
- **Entreprises** : logos hébergés sur Cloudinary, administration depuis le panneau admin
- **Stats** : tracking des ouvertures d'encarts/overlays, rapport quotidien par email
- **Admin** : onglet Push avec historique des envois

---

## [4.8] — 14 mai 2026

### Ajouté
- **Météo** : qualité de l'air (IQA) et pollen avec seuils d'alerte
- **Agenda** : amélioration du cache et des URL de fallback

---

## [4.7] — mai 2026 (semaine 2)

### Ajouté
- **Signalements** : formulaire avec carte Leaflet, catégories, photo
- **Boîte à idées** : soumission, vote, modération admin
- **Sondages** : création et participation depuis l'app
- **Notifications push** : actualités, déchets, météo — gestion indépendante par type
- **Trombinoscope** : photos et biographies des élus
- **Associations** : annuaire des associations de la commune
- **Entreprises** : annuaire des commerces et artisans locaux

---

## [4.6] — mai 2026 (semaine 1)

### Ajouté
- **MEL** : chatbot IA (Mistral Small) avec catégories thématiques
- **Actualités** : publication automatique depuis Facebook (`#MAT`) avec images hébergées
- **Agenda** : synchronisation Google Calendar
- **Bus Rémi** : prochains passages ligne 8 en temps réel
- **Carburants** : prix en temps réel (data.gouv.fr)
- **Eau** : qualité de l'eau (Loire / Meung-sur-Loire)
- **Admin** : interface d'administration sécurisée

---

## [4.0] — lancement initial

### Ajouté
- Application web progressive (PWA) installable sur mobile
- Météo locale (Open-Meteo) avec alertes Météo-France
- Horaires et statut de la mairie en temps réel
- Collecte des déchets (bacs noir et jaune) avec rappels
- Interface accessible (RGAA) : taille de texte, contraste, daltonien, TTS
- Thèmes : vert, bleu, sombre
- Fonctionnement hors ligne (service worker)
- 100 % open source — licence MIT

---

*Application MAT — Commune de Mézières-lez-Cléry*
