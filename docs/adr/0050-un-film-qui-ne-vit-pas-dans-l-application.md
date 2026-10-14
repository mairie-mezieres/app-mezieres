# ADR-0050 — Un film de présentation qui ne vit pas dans l'application

- **Date** : 19 septembre 2026
- **Statut** : accepté
- **Concerne** : `film/`, diffusion externe (réseaux sociaux, mail, écran de la mairie)

## Contexte

La mairie voulait « une vidéo moderne pour expliquer le fonctionnement de la PWA »,
**à publier sur les réseaux ou à envoyer** — donc un fichier qui se suffit à
lui-même, indépendant de l'application.

Le parcours guidé existant (`initOnboarding`, `js/mat-accessibility.js` : 11 étapes,
spotlight SVG, rejouable par « 🎬 Revoir la présentation ») ne répond pas à ce
besoin : il ne s'exécute que **dans** l'app, sur l'appareil de l'habitant.

## Décision

Un film **fabriqué**, pas **filmé** :

1. `film/presentation.html` est une page de 1080×1920 dont **toute** l'animation est
   produite par une fonction pure du temps, `filmSeek(t)`.
2. `film/rendre-video.js` appelle `filmSeek(i / 30)`, photographie la page et envoie
   les images à ffmpeg par un tuyau → un MP4 H.264.
3. Les écrans montrés sont les **vrais** écrans de l'app, capturés par
   `film/capturer-ecrans.js` sur des réponses simulées (`film/fixtures.js`).

Et une frontière : **rien de tout cela n'entre dans l'application**. Le dossier
`film/` n'est ni précaché par le service worker, ni chargé par `index.html`.

## Pourquoi pas une vraie vidéo intégrée à l'app

Ce fut la première idée, et elle coûte deux choses :

- **Le poids.** `img/installer-ios.mp4` pèse déjà 10,7 Mo — c'est pour cela qu'il
  s'ouvre dans un onglet et n'est jamais embarqué. Une vidéo précachée, c'est
  autant chez chaque habitant installé, pour un contenu qu'il ne regardera qu'une
  fois.
- **L'accessibilité.** L'audit RGAA classe aujourd'hui les critères **4.1 à 4.13 en
  `NA` — « aucun média temporel »**. Embarquer une vidéo dans l'app rend treize
  critères applicables d'un coup (sous-titres, transcription, audio-description) :
  le taux tombe sous 100 % tant qu'ils ne sont pas satisfaits, et la mention
  d'accessibilité **comme** la déclaration devraient changer en même temps
  (`tests/e2e/mention-accessibilite.spec.js` refuse qu'elles divergent).

Un film **externe** ne touche ni l'un ni l'autre : il n'est pas un contenu de la
page. Rien n'interdit de lui ajouter des sous-titres — c'est souhaitable pour le
public sourd et malentendant, et les réseaux lisent un fichier `.srt` — mais ce
n'est alors plus une obligation réglementaire opposable à l'app.

## Pourquoi `filmSeek(t)` et pas des animations CSS

⛔ **Deux raisons, et la seconde est un piège qui ne se voit pas.**

1. **Reproductibilité.** Le rendu image par image ne dépend d'aucune horloge
   réelle : la frame 431 est la même à chaque exécution, sur une machine chargée
   comme au repos. Un enregistrement d'écran, lui, saute des images dès que la
   machine tousse — et c'est invisible jusqu'à la relecture.
2. **`prefers-reduced-motion`.** `css/mat.css` (ligne ~1830) impose
   `animation-duration:.01ms !important` sur `*`. Une page cadencée par
   `animationend` ne démarrerait **jamais** chez un utilisateur ayant activé
   « réduire les animations » : elle resterait sur sa première image, sans la
   moindre erreur en console. Ici le réglage ne change rien.

Corollaire pour qui reprendra ce fichier : **un effet s'écrit comme une fonction de
`t`, jamais comme un `@keyframes`.**

## Pourquoi des captures simulées plutôt que la production

⛔ `POST /stats/track` compte un visiteur unique par `deviceId` tiré d'un
`localStorage` vierge. Un navigateur piloté qui atteint le backend s'enregistre
comme un habitant de plus au tableau de bord de la mairie — c'est exactement ce
qui a pollué les statistiques du 31 août au 17 septembre 2026 (ADR-0048). La
capture coupe donc tout ce qui n'est pas `localhost`.

⚠️ Et un film vit des mois : des données réelles y figeraient une actualité datée,
voire des contenus d'habitants (idées, signalements). Les données de
`film/fixtures.js` sont donc **fabriquées et intemporelles**, à deux exceptions
près, reprises telles quelles parce qu'elles sont vraies et vérifiables :
la réponse de MEL sur les horaires de bricolage (arrêté préfectoral du Loiret du
1er mars 1999) et l'adresse de l'application.

⚠️ Trois pièges rencontrés, tous invisibles avant de regarder une image rendue :

- l'écran Actualités d'un **iPhone** non installé remplace le bouton d'abonnement
  par un « Installation requise » rouge — vrai dans l'app, absurde dans un film :
  la capture se fait donc sous un user-agent **Android** ;
- les tuiles OpenStreetMap étant coupées, la carte du signalement apparaît en
  rectangle gris — on déroule l'écran avant de photographier ;
- `img/MAT-explique.webp` porte un **damier de fausse transparence cuit dans les
  pixels**. Invisible à 130 px dans l'onboarding, c'est un rectangle quadrillé à
  480 px sur fond vert. Le film utilise `MAT et MEL.webp`, avec un masque
  elliptique qui efface le voile blanchâtre résiduel de son détourage.

## Conséquences

- Le MP4 et son affiche vivent dans `film/sortie/` et sont versionnés : la mairie
  peut les envoyer, mais aussi en donner l'**adresse** (le dépôt est publié).
- Le film se **régénère** : `node film/capturer-ecrans.js && node film/rendre-video.js`.
  Une refonte d'écran ne demande pas de re-tournage.
- Aucun bump de version, aucun bump de cache SW, aucune entrée de changelog : rien
  de ce qui est servi à l'habitant ne change. ⚠️ Cela cesse d'être vrai le jour où
  un lien vers le film est ajouté dans l'app — ce serait alors un changement
  visible, avec tout ce que le `CLAUDE.md` impose.

## Deuxième version (19 septembre 2026) — ce que la première a raté

Trois reproches, tous justes, et tous instructifs.

**1. Une actualité inventée est une fausse information, pas un exemple.** L'écran
« Actualités » montrait « La bibliothèque vous accueille le mercredi », daté
d'hier, sous le bandeau de la mairie. Dans un film diffusé sur la page de la
commune, cette phrase **est** une annonce municipale : rien à l'écran ne dit
qu'elle illustre une mise en page. Les données simulées ne nomment donc plus que
des **rubriques** (« Compte rendu du conseil municipal ») et du **mécanisme**
(trois statuts de signalement, une réponse de la mairie) — jamais un horaire, un
lieu, une décision ou une date dans un titre. Le même raisonnement vaut pour la
boîte à idées : on n'invente pas la proposition d'un habitant.

⚠️ Corollaire pour le prochain film, quel qu'en soit le sujet : **tout ce qui est
lisible à l'écran engage la commune**, y compris ce qui n'était là que pour
remplir une maquette.

**2. Le rythme d'un film n'est pas celui d'une démonstration.** La première
version tenait 6,5 s par idée, sept scènes, des fondus d'une demi-seconde. Un fil
d'actualité ne pardonne pas les temps morts : onze scènes, des coupes de 0,3 s,
une lame de transition sur les changements d'acte, des titres qui arrivent un peu
trop gros et se calent. Même durée par minute d'information, deux fois plus de
choses montrées.

**3. Ce qu'on montre doit être ce qui distingue l'app.** Un agenda et une météo,
toutes les communes en ont. Le suivi **public** des signalements avec la réponse
de la mairie, l'assistante MEL, le fait du jour sourcé, la boîte à idées votée :
ça, non. Ces écrans existaient tous et aucun n'était filmé.

### ⛔ Et la carte 3D, la plus spectaculaire, ne se capture pas ici

`matOuvrirCarte3D` construit le village à partir du bâti et du fond de plan de
l'IGN (`data.geopf.fr`), et le zonage PLU vient d'`apicarto.ign.fr`. La capture
coupant tout appel sortant — et l'environnement de développement n'ayant de toute
façon pas accès à ces domaines — l'écran rend exactement ce qu'il doit rendre :
« Aucun bâtiment chargé — l'IGN n'a pas répondu ».

C'est une **bonne nouvelle sur l'app** (elle dit la panne au lieu de montrer un
vide) et une **impasse pour le film** : aucune automatisation ne produira cette
image. Elle doit venir d'un appareil réellement connecté. Le film l'attend ;
`film/README.md` dit comment l'ajouter le jour où elle existe.

### La carte 3D est finalement dans le film — et elle y restera à la main

La mairie a fourni ce qu'aucun script ne pouvait produire : un enregistrement
d'écran de 11 s et deux captures, pris sur un téléphone connecté. Le film en
garde **73 images** (`film/ecrans/carte3d-anim/`, ~2,5 s de vol au-dessus du
bâti et du zonage) puis les **deux captures nettes** — bâtiments, puis zonage du
PLU avec les lieux-dits.

⚠️ **C'est le seul plan du film qui ne se régénère pas tout seul.** Tout le reste
se refait en deux commandes ; celui-ci demande un nouvel enregistrement. Le code
le dit là où on l'oublierait (`ANIM_3D` dans `presentation.html`), et il tombe
proprement : sans les images, la scène disparaît, le reste du film tient.

⚠️ Trois détails qui ne se voient qu'au rendu :
- les images d'un vrai téléphone sont plus **larges** que l'écran du film (0,48
  et 0,50 contre 0,46) — posées comme les autres, elles laissent une bande crème
  en bas ou à droite ; d'où la classe `.plein` (`object-fit:cover`), **ancrée à
  gauche** pour garder les boutons « Zonage du PLU », « Bâtiments », « Le
  territoire », qui sont précisément ce qu'on veut montrer ;
- les **73 images sont montées d'avance**, jamais chargées à la volée : changer
  le `src` d'une seule balise rendrait `filmSeek` asynchrone sans le dire, et le
  moteur de rendu photographierait des trous — visibles seulement après encodage ;
- un enchaînement de plans à parts égales donnait à l'animation trois fois trop
  de vitesse, d'où `poids` dans `SCENES`.

⚠️ **Vie privée.** Ces images portent la bulle « Votre adresse — zone 1AU » et une
pastille orange à l'endroit du domicile de la personne qui a filmé. À l'échelle du
village cela ne désigne pas une maison, et la bulle démontre une vraie fonction
(l'app dit à l'habitant SA zone PLU) — mais c'est un arbitrage à faire tenir par
la personne concernée, pas par le code. Noté dans `film/README.md`.

## Troisième version (14 octobre 2026) — le kit, les mercis, et une actualité qui a des photos

Quatre demandes de la mairie, et une contrainte chiffrée : **2 minutes maximum**.
Le montage passe de 50,6 s à **62,6 s**, quatorze scènes.

### 1. Le kit de réplication entre dans le film

`partager.html` — « Osez la vôtre » — est la seule partie de MAT qui ne
s'adresse **pas** aux habitants de Mézières mais aux autres communes. Trois
plans : le profil, le coût mensuel estimé, le prompt généré.

⚠️ **Ce n'est pas un écran de l'application mais une page à part.** Le script de
capture ne savait qu'ouvrir des overlays d'`index.html` (`fn:`) ; il accepte
désormais une `url:`, chargée dans son propre contexte — sans attendre
`app-ready`, que cette page ne pose jamais (20 s de timeout par capture, sinon).

⚠️ **Trois pages distinctes pour trois captures.** `goTo()` masque l'étape
précédente dans le DOM : photographier la même page trois fois aurait donné trois
fois le dernier état, sans erreur et sans que rien ne le signale.

⚠️ Le formulaire est rempli avec **le nom d'exemple du formulaire lui-même**
(« Mairie de Saint-Exemple ») : aucune commune réelle n'est nommée, et aucune
capture ne peut se lire comme l'annonce d'un déploiement ailleurs.

### 2. Deux tiers sont nommés — et c'est là qu'on pèse les mots

La mairie demandait « un logo *approuvé par Mistral* » et un remerciement à
l'Observatoire de l'innovation publique TERRITORIA.

⛔ **« Approuvé par » n'a pas été écrit, et aucun logo de tiers n'a été posé.**
Ce qui est vrai et vérifiable, c'est que les réponses libres de MEL sont
produites par un modèle Mistral (`MISTRAL_MODEL`, `lib/mel.js` du backend, repli
Anthropic) : le film écrit donc **« Propulsée par Mistral AI »**. Un logo ou le
mot « approuvé » affirmeraient un **soutien officiel** — quelque chose qui se
demande par écrit, et qu'une commune ne peut pas se donner elle-même. La
différence tient en deux mots et elle est juridique, pas stylistique.

⚠️ **TERRITORIA est remercié sans que le prix soit nommé** (demande expresse).
Le badge « Territoria d'Or 2026 » vit dans l'application ; le film, lui, dit
seulement merci.

### 3. Une actualité sans photo ne montre pas les actualités

Les données simulées ne portent **aucune image** — c'est la règle posée à la
deuxième version (aucune annonce communale inventée), et elle ne bouge pas. Mais
une page d'actualités sans photo ne montre ni le carrousel, ni la mise en page,
ni ce à quoi ressemble vraiment une publication de la mairie.

La sortie est la même que pour la carte 3D : **une capture d'un vrai téléphone**,
sur une actualité **réellement publiée** (`ecrans/actus-photos.webp`). Rien n'y
est inventé, puisque rien n'y est fabriqué.

⚠️ **Elle porte sa date de publication**, donc elle vieillit — contrairement à
tout le reste du film. C'est le prix d'une image vraie, et il est noté dans
`film/README.md`.

⛔ Et un piège de code : `_source()` déduisait l'extension du **préfixe** du nom
(`carte3d…` → `.webp`, sinon `.png`). « actus-photos » serait parti chercher un
`.png` inexistant — donc un écran blanc dans le téléphone, visible seulement
après encodage. La provenance est désormais une **liste explicite**
(`DU_TELEPHONE`).

### 4. Sans le son

La version musicale est retirée : la mairie veut un film muet. `ajouter-musique.js`
reste dans le dépôt pour le jour où elle en redemandera une, mais **aucun fichier
sonore n'est publié** — une version musicale qui traîne à côté finit par être
envoyée à la place de l'autre, et elle cesse de correspondre au montage dès que
celui-ci bouge.

### 5. Deux plafonds, et le second ne se voit pas

La mairie a fixé **2 minutes maximum** : au-delà, un fil d'actualité ne lit pas
le film jusqu'au bout, et le QR code de fin — le seul appel à l'action — n'est
jamais vu. Le total des durées de `SCENES` suffit à le surveiller.

⚖️ Le second plafond est **le poids du fichier**, et rien à l'écran ne l'annonce :
WhatsApp refuse une vidéo au-delà de ~16 Mo. À `crf 20`, les 63 s pesaient
**16,1 Mio** — le film était terminé, correct, et impossible à envoyer. Le rendu
encode donc en `crf 23` (ajustable par `CRF=`), ce qui le ramène sous 11 Mio sans
différence visible sur ce contenu (aplats, texte, captures d'écran).
**Après chaque rallonge, vérifier le poids, pas seulement la durée.**
