# Changelog — Mézières Avec Toi (MAT)

Toutes les évolutions notables de l'application sont documentées ici.  
Format : [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/).

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
