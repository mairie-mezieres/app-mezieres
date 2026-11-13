# 🎬 Film de présentation — MAT

Un film **autonome** (MP4) pour présenter l'application : Facebook, WhatsApp, mail,
écran de la mairie. Il ne fait pas partie de l'application et n'est jamais chargé
par elle — voir `docs/adr/0050-un-film-qui-ne-vit-pas-dans-l-application.md`.

| Fichier | Rôle |
|---|---|
| `sortie/mat-presentation-vertical.mp4` | **Réseaux sociaux** — 120 s, 1080×1920, H.264, **sans son** |
| `sortie/mat-presentation-16x9.mp4` | **Projection** (grand écran, salle) — 120 s, 1920×1080 |
| `sortie/mat-presentation-vertical-affiche.jpg` | Vignette à joindre au post |
| `sortie/mat-presentation-16x9-affiche.jpg` | La même, en paysage |
| `logos/` | Les logos de tiers, et l'accord qui autorise chacun |
| `mel-avatar.webp` | Le visage de MEL, recadré depuis `img/MAT et MEL.webp` |
| `presentation.html` | Le film lui-même (à ouvrir dans un navigateur pour l'aperçu) |
| `capturer-ecrans.js` | Capture les quinze vrais écrans de l'app → `ecrans/*.png` |
| `fixtures.js` | Réponses simulées du backend, pour ces captures |
| `rendre-video.js` | `presentation.html` → MP4 |
| `ajouter-musique.js` | Pose une piste audio sur le MP4, sans réencoder l'image (**non utilisé** : le film est muet) |
| `musique/` | La piste fournie par la mairie, et d'où vient sa licence |
| `qr.svg` | QR code vers `https://mezieres-lez-clery.fr` |
| `ecrans/carte3d-anim/` | 73 images de la carte 3D, **fournies par la mairie** (voir plus bas) |
| `ecrans/carte3d-*.webp` | Les deux captures nettes de la carte 3D, même origine |
| `ecrans/actus-photos.webp` | L'écran Actualités **photographié sur un téléphone** (voir plus bas) |
| `ecrans/partager-*.png` | Le kit de réplication (`partager.html`), trois étapes |

⛔ **Le film est muet, et c'est un choix de la mairie.** `ajouter-musique.js` reste
là pour le jour où elle en redemandera une, mais **aucun fichier sonore n'est
publié** : une version musicale qui traîne à côté finit par être envoyée à la
place de l'autre, et elle ne correspond plus au montage dès que celui-ci bouge.

🖥️ **Deux formats, deux usages.** Le **vertical** est fait pour un pouce : on le
publie sur Facebook, on l'envoie par message. Le **16:9** est fait pour une
salle : il a été demandé pour une projection sur grand écran, ses textes sont
plus gros, le téléphone passe à droite et le texte occupe une colonne à gauche.

⏱️ **Durée : exactement 2 minutes**, et ce n'est plus seulement un plafond. Le
film **accompagne un discours de deux minutes** : il doit tenir tout le propos
sans le dépasser. Le total des durées de `SCENES` vaut donc 120,0 s **pile** —
le vérifier après chaque retouche.

⚠️ **La dernière page tient 14 s**, et c'est voulu : c'est là que la salle sort
son téléphone pour le QR code. Allonger la fin coûte moins cher que d'accélérer
le reste.

⚖️ **Et un second plafond, moins visible : ~16 Mo.** C'est la limite d'un envoi
WhatsApp. ⛔ **Le format décide de la qualité d'encodage**, parce que les deux
fichiers ne voyagent pas pareil :

| | part par | plafond | encodage | poids |
|---|---|---|---|---|
| vertical | message, Facebook | ~16 Mo | `crf 25` | 13,4 Mio |
| 16:9 | câble, clé USB | aucun | `crf 23` | 16,9 Mio |

À `crf 20`, les 63 s de la v3 pesaient déjà 16,1 Mio ; à `crf 23`, les 120 s du
vertical pesaient 17,4 Mio — film terminé, correct, et impossible à envoyer.
`CRF=20 node film/rendre-video.js` force une autre valeur. Après chaque
rallonge, vérifier le **poids**, pas seulement la durée.

## Régénérer le film

```bash
npm i --no-save @playwright/test @ffmpeg-installer/ffmpeg   # une fois
node film/capturer-ecrans.js             # ~2 min — relance l'app en local et photographie 17 écrans
node film/rendre-video.js                # ~18 min — 3 600 images puis encodage (vertical)
FORMAT=16x9 node film/rendre-video.js    # ~18 min — la version projetée
```

⛔ **Les deux formats sortent du MÊME fichier** (`?format=16x9`), et c'est la
seule chose à ne pas défaire : dupliquer `presentation.html` pour le paysage,
c'est se condamner à corriger deux films — et à n'en corriger qu'un, un jour de
hâte. Les scènes, les durées et les textes sont communs ; seule la **géométrie**
change (table `PAYSAGE` en tête du script, et les règles `.paysage` du CSS).

⚠️ `LARGEUR=`/`HAUTEUR=` ne suffisent PAS à changer de format : elles recadrent
la page, elles ne la remettent pas en page. Passer par `FORMAT=16x9`.

Pour mettre au point un seul plan sans tout reprendre :

```bash
FILM_ECRANS=partager-cout,mel node film/capturer-ecrans.js
```

⚠️ Il faut un **ffmpeg compilé avec libx264**. Celui qui accompagne Playwright ne
sait faire que du VP8/WebM : le fichier produit ne s'ouvrirait ni sur un iPhone ni
dans un message. `@ffmpeg-installer/ffmpeg` convient, `FFMPEG_PATH=…` aussi.

Aperçu sans rien encoder : ouvrir `film/presentation.html` dans un navigateur (il
tourne en boucle, avec Pause et Rejouer).

## Modifier le film

Tout se règle dans `presentation.html` :

- **le texte** → dans le HTML, une `div.couche` par scène ;
- **la durée d'une scène** → le tableau `SCENES` en tête du script. Les instants ne
  sont écrits nulle part ailleurs : rallonger une scène décale proprement le reste ;
- **un effet** → ⛔ **écrire une fonction de `t`, jamais un `@keyframes`.** Le film
  est rendu en appelant `filmSeek(t)` image par image : une animation CSS ne serait
  pas rendue du tout. Et `css/mat.css` de l'app coupe toutes les animations sous
  `prefers-reduced-motion` — la page resterait figée sur sa première image, sans
  aucune erreur pour le dire.

## ⛔ Ce que le film ne dit pas

**Aucune annonce communale.** La première version titrait une actualité inventée —
« La bibliothèque vous accueille le mercredi » — datée d'hier et signée de la
mairie. Dans un film, une phrase pareille ne se lit pas comme un exemple : elle se
lit comme une information de la commune, et elle est diffusée à des centaines de
personnes. Les écrans d'actualités, de signalements et d'idées ne montrent donc
plus que des **rubriques** et du **mécanisme** : aucun horaire, aucun lieu, aucune
décision, aucune date dans un titre. Voir les commentaires de `fixtures.js`.

**Deux tiers sont nommés, et chaque mot y est pesé :**

- **« Propulsée par Mistral AI »**, avec leur logo. C'est un fait technique
  vérifiable — les réponses libres de MEL sont produites par un modèle Mistral
  (`MISTRAL_MODEL`, `lib/mel.js` du backend, repli Anthropic) — et **Mistral AI a
  donné son accord écrit** pour l'usage du logo dans ce contexte précis : dire
  qu'on les utilise. ⛔ Cet accord ne fait pas de la commune un partenaire : ne
  jamais écrire « labellisé », « certifié » ou « partenaire officiel ».
  ⛔ **Aucun autre logo de tiers sans le même accord, archivé de la même façon** —
  un logo dans un film communal se lit comme un soutien officiel. Voir
  `logos/SOURCE.md`.
- **« Observatoire de l'innovation publique TERRITORIA »** est un remerciement, et
  rien d'autre : **le prix n'est pas nommé** (demande expresse de la mairie). Le
  badge « Territoria d'Or 2026 », lui, vit dans l'application — pas ici.

**Trois chiffres, et ils sont vrais.** « 180 questions » (`data/saviez-vous.json`),
« 100 % accessible RGAA » (`docs/accessibilite/audit-rgaa-2026-08-27.md`),
« gratuite, sans publicité, sans compte ». Les revérifier avant toute
rediffusion — le taux RGAA et la taille du corpus bougent.

## 📰 L'écran Actualités vient d'un téléphone, lui aussi

`fixtures.js` ne fabrique **aucune photo** : les actualités simulées ne portent
que des rubriques (voir ci-dessus). Une page d'actualités sans image ne montre
donc ni le carrousel, ni la pastille, ni ce à quoi ressemble vraiment une
publication de la mairie — c'est-à-dire exactement ce qu'on voulait montrer.

Le film utilise donc `ecrans/actus-photos.webp` : une **capture d'écran d'une
actualité réellement publiée**, prise sur un téléphone, recadrée pour retirer la
barre d'état et la barre de navigation Android :

```bash
ffmpeg -i <capture.jpg> -vf "crop=1220:2425:0:152,scale=780:-2" -q:v 82 actus-photos.webp
```

⚠️ **Elle porte une date de publication** (« Publié 14/10/2026 »), donc elle
vieillit avec le film. Avant une rediffusion lointaine, refaire la capture sur
une actualité récente — ou choisir une publication sans enjeu de fraîcheur.
⚠️ La capture automatique `ecrans/actus.png` existe toujours, **elle n'est pas
branchée** : son nom et sa description (`capturer-ecrans.js`) le disent.

## 🏛️ Le kit de réplication (`partager.html`)

Trois captures, prises sur **trois pages distinctes** (`url:` dans
`capturer-ecrans.js`, pas `fn:` — ce n'est pas un écran de l'app mais une page à
part) : le profil, le coût estimé, le prompt généré. ⚠️ Trois pages et non trois
captures d'une même page : `goTo()` masque l'étape précédente, photographier la
même page trois fois donnerait trois fois le dernier état.

⚠️ Le formulaire est rempli avec **le nom d'exemple du formulaire lui-même**
(« Mairie de Saint-Exemple ») : aucune commune réelle n'est nommée, et personne
ne peut lire la capture comme l'annonce d'un déploiement ailleurs.

## 🗺️ La carte 3D — le seul plan qui ne se régénère pas

La carte 3D du village (`matOuvrirCarte3D`) **ne peut pas être capturée
automatiquement** : son fond de plan, son bâti et le zonage PLU viennent de l'IGN
(`data.geopf.fr`, `apicarto.ign.fr`), et la capture coupe tout appel sortant. Sans
réseau, l'écran affiche honnêtement « Aucun bâtiment chargé — l'IGN n'a pas
répondu ». Cette capture-là porte son verdict dans son nom :
`ecrans/carte3d-sans-reseau.png`, **à ne jamais brancher dans le film**.

Les images utilisées viennent donc d'un **téléphone réellement connecté** :

- `ecrans/carte3d-anim/f001..f073.webp` — 73 images extraites d'un enregistrement
  d'écran, jouées en ~2,5 s (`ANIM_3D` dans `presentation.html`). Pour les
  refaire : `ffmpeg -ss <début> -t <durée> -i <enregistrement.mp4>
  -vf "fps=12,crop=340:714:40:38" -c:v libwebp -q:v 76 f%03d.webp`
  — le `crop` retire la barre d'état et la barre de navigation Android.
- `ecrans/carte3d-batiments.webp` et `carte3d-plu.webp` — deux captures d'écran
  recadrées pareil, puis réduites à 780 px de large.

⚠️ Ces images sont plus **larges** que l'écran du film (0,48 et 0,50 contre 0,46) :
elles portent la classe `.plein` (`object-fit:cover`, ancré à gauche pour garder
les boutons « Zonage du PLU », « Bâtiments », « Le territoire »).

⚠️ **Vie privée** : ces images montrent la bulle « Votre adresse — zone 1AU » et
une pastille orange à l'endroit du domicile de la personne qui a filmé. Sur une
vue large du village, cela ne désigne pas une maison — mais c'est à valider avant
diffusion, et à masquer si la personne le demande.

## ⚠️ Avant de publier

- **Les contenus affichés dans les captures sont des illustrations** (actualités,
  agenda, prix des carburants, température) : ils sont fabriqués par `fixtures.js`,
  volontairement intemporels, et **n'engagent pas la commune**. Ne jamais y mettre
  ce qui pourrait se lire comme une annonce officielle (coupure d'eau, fermeture,
  date de scrutin).
  Deux exceptions, vraies et vérifiables : la réponse de MEL sur les horaires de
  bricolage (arrêté préfectoral du Loiret du 1er mars 1999) et l'adresse de l'app.
- **Le film est muet**, et le reste tant que la mairie ne redemande pas de
  musique. Les réseaux lisent en sourdine par défaut, donc **tout ce qui compte
  est écrit à l'écran, et doit le rester** : une musique n'ajoute aucune
  information, et c'est ce qui la rendait sans danger pour l'accessibilité.
  ⚠️ Une **voix off**, elle, en ajoute — il faudrait alors des sous-titres, relus
  (les générateurs automatiques écorchent « Mézières-lez-Cléry »).
- ⛔ Si une version sonore revient un jour
  (`node film/ajouter-musique.js film/musique/<piste>.mp3`) : **la licence de la
  musique ne vit pas dans le dépôt**, la mairie garde la preuve dans ses
  archives. Voir `musique/SOURCE.md`.
- **Relire le numéro de version** visible dans la capture d'accueil : il vieillit.
  Relancer `capturer-ecrans.js` avant une diffusion importante.
- ⚠️ **Le fait du jour tourne avec le calendrier.** L'écran « Le saviez-vous ? » est
  capturé avec l'horloge décalée (`jours: 9` dans `capturer-ecrans.js`) : celui
  d'aujourd'hui portait sur le 3114, le numéro national de prévention du suicide —
  vrai, utile, et déplacé dans un film de promotion. Après une mise à jour du
  corpus, revérifier la question obtenue.

## Autres formats

`rendre-video.js` lit `LARGEUR`, `HAUTEUR`, `FPS` et `NOM`. Mais la mise en page est
dessinée pour du 1080×1920 : changer les dimensions **recadre**, cela ne réorganise
rien. Un format carré ou 16:9 demande de reprendre les positions dans le HTML.

## 👩 MEL est nommée et montrée

Dans l'application, l'avatar de MEL est l'émoji **👩** d'une bulle de
conversation : illisible à distance, et il ne dit pas qui elle est. Le film la
présente donc comme on présente quelqu'un — **son visage, son nom, sa fonction**
(`film/mel-avatar.webp`, recadré depuis `img/MAT et MEL.webp`, le dessin des deux
mascottes) — avant de montrer ce qu'elle répond.

⚠️ C'est un **recadrage du fichier de l'app**, pas une nouvelle image : si les
mascottes changent, refaire le recadrage, sinon le film montrera une MEL que
personne ne reconnaît.

```bash
ffmpeg -i "img/MAT et MEL.webp" -vf "crop=132:132:176:118,scale=440:440:flags=lanczos" \
  -pix_fmt yuva420p -c:v libwebp -q:v 90 film/mel-avatar.webp
```

## 🔤 Les icônes ont leur propre taille

Chaque puce porte son icône dans un `<span class="ico">` : la projection demande
des icônes plus grandes que le texte, et **grossir la puce entière grossirait le
texte**, qui est déjà à la bonne taille. ⚠️ `vertical-align` recale l'icône sur
la ligne de base — sans lui, une puce plus haute que ses voisines décale toute
la rangée.
