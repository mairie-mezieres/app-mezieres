# ADR-0037 — « Le jeu du moment » : une page statique, et une URL imprimée

- **Statut** : accepté
- **Date** : 4 septembre 2026
- **Version** : v4.104
- **Concerne** : `jeu/`, `jeu/archives/`, `jeux/`, `js/mat-jeu.js`, `css/mat-jeu.css`,
  `service-worker.js`, la tuile d'accueil, `js/mat-plan-site.js`

## Contexte

La commune veut publier un petit jeu, qui change au fil des saisons, et en
imprimer l'adresse sur des affiches et des QR codes. Trois contraintes sont
posées d'emblée, et ce sont elles qui décident de tout :

1. **L'adresse ne changera jamais** — `mezieres-lez-clery.fr/jeu` doit servir le
   jeu courant aujourd'hui et dans cinq ans. Une affiche ne se reprend pas.
2. **Changer de jeu ne doit toucher aucun code** — déposer un fichier, ajouter
   une entrée, changer une ligne. La mairie doit pouvoir le faire sans nous.
3. **Rien ne sort de l'appareil** — pas de télémétrie, pas de statistiques de
   parties, pas d'identifiant, pas de classement en ligne.

Le jeu fourni est un fichier HTML autonome : un `<canvas>`, un script en ligne,
aucune dépendance. Rien à installer, rien à télécharger.

## Décision

### 1. Le jeu est servi en page statique, pas dans une vue de l'application

MAT est une page unique avec des écrans `.ov` hydratés paresseusement. On aurait
pu y ajouter un écran « jeu ». On ne le fait pas, pour trois raisons qui se
cumulent :

- **Le script du jeu est en ligne.** L'injecter dans une vue supposerait de le
  ré-exécuter à la main (`new Function`, ou un `<script>` fabriqué), ce qu'une
  CSP stricte refuse — et devrait refuser. Servi comme page, il est simplement
  du HTML statique, et le prochain jeu le sera aussi, quel que soit son auteur.
- **Le canvas et le tactile se comportent mal en cadre imbriqué.** Une iframe
  décale les coordonnées, avale des gestes, et complique le plein écran. Le
  sujet est écarté : pas d'iframe.
- **La rotation.** Un écran de l'application impose de connaître le jeu au
  moment du build. Une page statique n'impose rien : on dépose un fichier.

### 2. `/jeu` est un **lanceur**, pas le jeu

Sur un hébergement statique (GitHub Pages), une adresse fixe ne peut pas servir
un fichier variable : il n'y a pas de serveur pour choisir. `jeu/index.html` lit
donc `jeux/jeux.json`, note l'identifiant du jeu ouvert, et **remplace** la page
par le fichier du jeu (`location.replace`, jamais `assign` : le retour arrière
doit ramener à l'application, pas dans une boucle).

Conséquence assumée : l'adresse affichée après le lancement est celle du
fichier (`/jeux/la-hotte.html`), pas `/jeu`. C'est sans importance — ce qui est
imprimé, c'est le point d'entrée.

L'alternative — faire de `/jeu/index.html` une **copie** du jeu courant —
donnerait une adresse parfaitement stable, mais rendrait la rotation impossible
sans manipulation de fichiers. Elle contredit la contrainte 2 ; écartée.

### 3. Un manifeste, et lui seul

`jeux/jeux.json` porte **tout** : titre, saison, résumé, fichier, vignette,
date de publication, et l'identifiant du jeu courant. Le nom d'un jeu n'est
écrit nulle part ailleurs — ni dans le HTML, ni dans le CSS, ni dans le service
worker, ni dans un test. `tests/e2e/jeu.spec.js` le vérifie explicitement : il
échoue si le titre du jeu courant apparaît dans `index.html`, ou si son
identifiant apparaît dans `service-worker.js`.

C'est la même leçon que les associations, la fibre et l'arbre MEL : **une
double source diverge, et elle diverge en silence.**

### 4. Le hors-ligne, en trois couches

Le service worker précache la coquille (`/jeu`, `/jeu/archives`, le manifeste,
le module, la feuille de style) et, **à l'installation**, le fichier que
`courant` désigne — lu dans le manifeste, jamais écrit en dur.

Mais un service worker déjà installé ne rejoue pas son `install`. Le jour où la
mairie publie le jeu suivant sans nouvelle version de l'application, ce jeu-là
ne serait donc jamais précaché. D'où les deux autres couches :

- le manifeste est servi **réseau d'abord, cache en secours** (tout le reste est
  en *stale-while-revalidate*) : sinon l'affiche imprimée et l'application
  annonceraient deux jeux différents pendant un jour ;
- le lanceur envoie au service worker un message `CACHE_JEU` avec l'adresse du
  jeu qu'il vient de résoudre. Le jeu est donc en cache **dès sa première
  ouverture**, et jouable en mode avion ensuite.

Reste une limite, qu'il faut dire : un jeu publié sans nouvelle version de
l'application n'est pas disponible hors connexion **avant** d'avoir été ouvert
une fois. Pour qu'il le soit, il faut bumper le cache du service worker — c'est
la seule ligne de code que la rotation peut demander, et elle est facultative.

### 5. La pastille se souvient d'un **identifiant**, pas d'une date

`localStorage['jeu-vu']` porte l'identifiant du dernier jeu ouvert. La pastille
s'affiche si cet identifiant diffère de `courant`. La date `publie` ne sert qu'à
une chose : ne rien annoncer avant elle, pour qu'un jeu puisse être déposé à
l'avance.

Comparer des dates aurait paru plus naturel, et aurait été un piège : corriger
une coquille dans `publie` aurait rallumé la pastille sur toute la commune, pour
un jeu que tout le monde avait déjà vu.

### 6. La pastille ne repose pas sur la couleur

Elle porte le mot « Nouveau », et le lien annonce « Nouveau jeu disponible »
dans son `aria-label` (RGAA 3.1). Sa couleur (`#b91c1c`) donne 6,47:1 avec du
blanc — les autres pastilles de l'application sont en `#ef4444` (3,76:1), ce qui
passe inaperçu parce qu'elles sont masquées par défaut et donc jamais mesurées.
Celle-ci est faite pour être vue : elle doit tenir le seuil.

### 7. La tuile a pris la place de « Contacter vos élus »

Cette tuile appelait `openContact()` — exactement comme le bandeau « Mairie » en
haut du même écran. Un doublon, signalé par le porteur. L'écran existe toujours
et reste atteignable depuis ce bandeau, depuis la mise en page bureau et depuis
le plan du site.

## Conséquences

- **La mise en page bureau (≥ 1024 px) n'a pas de point d'entrée vers le jeu.**
  La grille du téléphone y est masquée. L'accès s'y fait par le plan du site, en
  pied de page. C'est un choix explicite, à revoir quand on voudra une carte
  dédiée dans la colonne de droite.
- Le plan du site liste désormais des **pages** en plus des écrans (`PLAN_PAGES`).
  C'est le seul endroit du plan où un intitulé est **recopié** : on ne peut pas
  lire le titre d'un autre document. `tests/e2e/plan-du-site.spec.js` vérifie
  qu'il correspond à ce qui est déclaré, et `jeu.spec.js` qu'il reste identique
  à l'intitulé de la tuile d'accueil.
- `tests/e2e/static-server.js` résout maintenant les index de répertoire, comme
  GitHub Pages. Sans cela `/jeu/` renvoyait 404 **dans les tests seulement** — un
  contrôle qui échoue là où la production marche apprend à se méfier du signal.
- Le meilleur score est passé en `localStorage` (il vivait en mémoire, et
  disparaissait à chaque rechargement). Une clé par jeu : le jeu suivant ne doit
  pas effacer le record du précédent.
- `maximum-scale=1,user-scalable=no` a été retiré du `<meta viewport>` du jeu :
  interdire le zoom est un défaut RGAA (13.9). Le double-tap et le pincement ne
  perturbent pas la partie pour autant — c'est `touch-action:none` qui s'en
  charge.

## Ce qu'on ne fait pas, et pourquoi

- **Pas de classement en ligne, même anonyme.** Un score envoyé est une donnée
  qui sort, et un identifiant qui apparaît. Le jeu n'en a pas besoin.
- **Pas de comptage de parties.** Même remarque : ni score, ni durée, ni nombre
  de parties. ⚠️ La v4.106 compte en revanche les **ouvertures** du jeu, sur le
  canal commun de l'application — voir la mise à jour en fin de document. La
  distinction n'est pas cosmétique : on sait combien de personnes ouvrent le jeu,
  on ne sait rien de ce qu'elles y font.
- **Pas d'iframe** — voir plus haut.
- **Pas de bibliothèque de jeu, pas de CDN, pas de police distante.** Un jeu qui
  charge quoi que ce soit ne fonctionne pas en mode avion, et fait sortir une
  adresse IP. `tests/e2e/jeu.spec.js` refuse tout jeu du manifeste qui citerait
  un domaine externe ou appellerait le réseau — y compris ceux qui n'existent
  pas encore.

## Mise à jour — v4.105 (4 septembre 2026)

**La tuile d'accueil ne nomme plus le jeu.** Elle affichait « Le jeu du moment »,
puis le titre, puis la saison — quatre lignes avec la pastille, dans une tuile de
demi-largeur. Décision du porteur après l'avoir vue en place : la tuile porte
désormais son seul libellé, et le jeu se découvre en l'ouvrant. Le titre et la
saison restent affichés par le lanceur `/jeu`, et vivent toujours dans le
manifeste — rien n'a changé au mécanisme.

Le nom accessible du lien suit : il n'annonce plus le titre non plus. Un lecteur
d'écran ne doit pas dire ce que personne ne voit.

⚠️ Effet de bord à connaître : **plus rien de visible ne prouve que le module a
tourné.** D'où `data-jeu-pret`, posé sur la tuile après hydratation, sur lequel les
tests s'accrochent. Sans lui, ils mesuraient l'état de la pastille avant qu'elle
soit décidée — vert ou rouge selon la vitesse de la machine, ce qui est la
définition d'un contrôle qui ne mesure rien.


## Mise à jour — v4.106 (5 septembre 2026)

**Le jeu change tout seul.** Le champ `courant` disparaît : chaque entrée du
manifeste porte une période `debut`/`fin` au format **JJ-MM, sans année**. Elle se
répète donc d'elle-même chaque année — personne n'a rien à faire le 1er décembre,
et c'est tout l'intérêt. Sept jeux couvrent l'année.

Ce que ce choix implique, et qu'il faut avoir vu :

- **Un trou dans le calendrier ne se verrait qu'une fois par an**, le jour où il
  tombe, et personne ne serait là pour le corriger. Idem pour deux périodes qui se
  chevauchent : le gagnant dépendrait de l'ordre du tableau, ce qui n'est pas une
  règle. `tests/e2e/jeu.spec.js` balaie donc les 366 jours d'une année bissextile
  et refuse les deux cas.
- **Le service worker précache TOUS les jeux**, plus seulement celui du jour. La
  bascule doit fonctionner hors connexion le jour venu — c'est précisément le jour
  où l'on ne peut plus rien y faire. Coût : ~150 Ko pour sept jeux, assumé. La mise
  en cache est faite fichier par fichier : avec un `await` unique, le premier 404
  emportait tous les suivants.
- `forcer` remplace `courant` pour épingler un jeu hors saison. Un `forcer`
  inconnu **retombe sur le calendrier** au lieu de figer l'application sur rien.

**Les six jeux fournis ont été retouchés** — quatre lignes chacun, aucun changement
de gameplay — pour tenir trois promesses que le dépôt avait déjà faites : le zoom
reste possible (`user-scalable=no` retiré, RGAA 13.9), un lien ramène à
l'application (sans quoi qui arrive par un QR code y est coincé), le canvas a une
alternative textuelle, et le meilleur score survit au rechargement (il vivait en
mémoire). ⚠️ Le contrôle du zoom lit **la balise `<meta viewport>`**, pas le
fichier : le commentaire qui explique le retrait contient les mots
« user-scalable=no », et un `grep` sur tout le fichier rougirait sur un commentaire.

## Mise à jour — v4.106 : compter les joueurs sans trahir la promesse

La mairie veut savoir **combien de personnes jouent**. Les deux cahiers des charges
disaient « pas de télémétrie, pas de statistiques de parties ». Les deux tiennent,
à condition de tracer la ligne au bon endroit :

- ce qui est compté, c'est **l'ouverture du jeu**, exactement comme l'application
  compte déjà l'ouverture de MEL, de l'agenda ou des déchets — même route
  (`POST /stats/track`), même réglage d'admin, même agrégat quotidien ;
- **une fois par appareil et par jour** (clé `mat_jeu_compte`, qui porte le jour) :
  le chiffre est donc un nombre de **personnes**, pas de clics. Trois parties
  d'affilée ne font pas trois joueurs ;
- ce qui n'est **pas** compté : le score, la durée, le nombre de parties, le jeu
  joué. Rien de ce qui se passe pendant la partie ne sort ;
- le comptage a lieu **dans le lanceur, avant la redirection**. Jamais dans un jeu.
  C'est ce qui permet aux fichiers de jeu de rester sans réseau — et au contrôle
  « zéro requête pendant une partie » de rester vrai. Un test refuse `stats/track`
  dans le fichier d'un jeu ;
- **aucun identifiant n'est créé** : on réutilise `mat_device_id_v1` s'il existe.
  Qui arrive par un QR code sans avoir jamais ouvert l'app est compté sans
  identifiant.

Aucun mécanisme nouveau côté backend : la route accepte n'importe quel nom de
service et le mail quotidien affiche ce qu'il trouve. Il a suffi d'un libellé, à
deux endroits. ⚠️ Dans `admin.html`, **trois** endroits : `SVC_LABELS`, `icons`, et
la liste `services` — cette dernière est explicite, un service absent n'apparaît
pas dans le tableau de bord.

**Ce qu'on continue de ne pas faire** : aucun score envoyé, aucun classement,
aucune mesure de durée. Le paragraphe « Ce qu'on ne fait pas » ci-dessus reste vrai
mot pour mot.
