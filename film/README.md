# 🎬 Film de présentation — MAT

Un film **autonome** (MP4) pour présenter l'application : Facebook, WhatsApp, mail,
écran de la mairie. Il ne fait pas partie de l'application et n'est jamais chargé
par elle — voir `docs/adr/0050-un-film-qui-ne-vit-pas-dans-l-application.md`.

| Fichier | Rôle |
|---|---|
| `sortie/mat-presentation-vertical.mp4` | **Le livrable** — 41 s, 1080×1920, H.264, sans son |
| `sortie/mat-presentation-vertical-affiche.jpg` | Vignette à joindre au post |
| `presentation.html` | Le film lui-même (à ouvrir dans un navigateur pour l'aperçu) |
| `capturer-ecrans.js` | Capture les vrais écrans de l'app → `ecrans/*.png` |
| `fixtures.js` | Réponses simulées du backend, pour ces captures |
| `rendre-video.js` | `presentation.html` → MP4 |
| `qr.svg` | QR code vers `https://mezieres-lez-clery.fr` |

## Régénérer le film

```bash
npm i --no-save @playwright/test @ffmpeg-installer/ffmpeg   # une fois
node film/capturer-ecrans.js     # ~30 s — relance l'app en local et photographie 6 écrans
node film/rendre-video.js        # ~4 min — 1 230 images puis encodage
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

## Autres formats

`rendre-video.js` lit `LARGEUR`, `HAUTEUR`, `FPS` et `NOM`. Mais la mise en page est
dessinée pour du 1080×1920 : changer les dimensions **recadre**, cela ne réorganise
rien. Un format carré ou 16:9 demande de reprendre les positions dans le HTML.
