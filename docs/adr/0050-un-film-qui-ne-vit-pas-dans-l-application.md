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
