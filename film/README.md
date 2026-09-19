# 🎬 Film de présentation — MAT

Un film **autonome** (MP4) pour présenter l'application : Facebook, WhatsApp, mail,
écran de la mairie. Il ne fait pas partie de l'application et n'est jamais chargé
par elle — voir `docs/adr/0050-un-film-qui-ne-vit-pas-dans-l-application.md`.

| Fichier | Rôle |
|---|---|
| `sortie/mat-presentation-vertical.mp4` | **Le livrable** — 48 s, 1080×1920, H.264, sans son |
| `sortie/mat-presentation-vertical-affiche.jpg` | Vignette à joindre au post |
| `presentation.html` | Le film lui-même (à ouvrir dans un navigateur pour l'aperçu) |
| `capturer-ecrans.js` | Capture les onze vrais écrans de l'app → `ecrans/*.png` |
| `fixtures.js` | Réponses simulées du backend, pour ces captures |
| `rendre-video.js` | `presentation.html` → MP4 |
| `qr.svg` | QR code vers `https://mezieres-lez-clery.fr` |

## Régénérer le film

```bash
npm i --no-save @playwright/test @ffmpeg-installer/ffmpeg   # une fois
node film/capturer-ecrans.js     # ~1 min — relance l'app en local et photographie 11 écrans
node film/rendre-video.js        # ~5 min — 1 434 images puis encodage
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

**Trois chiffres, et ils sont vrais.** « 180 questions » (`data/saviez-vous.json`),
« 100 % accessible RGAA » (`docs/accessibilite/audit-rgaa-2026-08-27.md`),
« gratuite, sans publicité, sans compte ». Les revérifier avant toute
rediffusion — le taux RGAA et la taille du corpus bougent.

## 🗺️ Ce qui manque : la carte 3D

La carte 3D du village (`matOuvrirCarte3D`) **ne peut pas être capturée
automatiquement** : son fond de plan, son bâti et le zonage PLU viennent de l'IGN
(`data.geopf.fr`, `apicarto.ign.fr`), et la capture coupe tout appel sortant. Sans
réseau, l'écran affiche honnêtement « Aucun bâtiment chargé — l'IGN n'a pas
répondu ». La capture porte donc son verdict dans son nom :
`ecrans/carte3d-sans-reseau.png`, **à ne jamais brancher dans le film**.

Pour l'ajouter : poser une image (ou une suite d'images) de la carte 3D réelle dans
`ecrans/`, l'ajouter à `SCENES` dans `presentation.html`, et rendre à nouveau.

## ⚠️ Avant de publier

- **Les contenus affichés dans les captures sont des illustrations** (actualités,
  agenda, prix des carburants, température) : ils sont fabriqués par `fixtures.js`,
  volontairement intemporels, et **n'engagent pas la commune**. Ne jamais y mettre
  ce qui pourrait se lire comme une annonce officielle (coupure d'eau, fermeture,
  date de scrutin).
  Deux exceptions, vraies et vérifiables : la réponse de MEL sur les horaires de
  bricolage (arrêté préfectoral du Loiret du 1er mars 1999) et l'adresse de l'app.
- **Le film n'a pas de son** : les réseaux lisent en sourdine par défaut, tout est
  écrit à l'écran. Pour l'accessibilité des personnes sourdes et malentendantes,
  rien à sous-titrer — mais si une voix off était ajoutée un jour, des sous-titres
  deviendraient indispensables.
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
