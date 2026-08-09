# ADR-0016 — axe ne voit pas un `<div onclick>` : l'accessibilité clavier demande son propre test

- **Statut** : accepté
- **Date** : 2026-08-09
- **Contexte technique** : accessibilité (RGAA 7.3 / WCAG 2.1.1) / contrôles automatisés

## Contexte

`tests/e2e/smoke.spec.js` fait tourner **axe-core** sur l'accueil et sur cinq
overlays, et bloque la CI sur toute violation `serious` ou `critical`. Ces tests
étaient au vert depuis leur création.

Pendant ce temps, un utilisateur naviguant au clavier ne pouvait ouvrir **ni la
météo, ni les collectes, ni les horaires de la mairie, ni la prochaine
manifestation** — les quatre tuiles colorées du haut de l'accueil. Il ne pouvait
pas non plus atteindre la présentation « Qui suis-je ? », ni, dans la galerie,
**envoyer une photo** : la zone de dépôt était le seul chemin possible et
l'`<input type="file">` qu'elle pilote est en `display:none`.

Neuf éléments interactifs au total étaient hors de portée du clavier.

## Mécanisme

Tous ces éléments étaient de la forme :

```html
<div class="top-card top-meteo meteo-strip" onclick="openMeteo()">
```

Pour axe, ce `<div>` est un **conteneur inerte**. Rien dans le DOM ne dit qu'il
est actionnable : `onclick` n'est pas une sémantique d'accessibilité, c'est un
gestionnaire d'événement. Il n'y a donc ni rôle à vérifier, ni nom accessible à
exiger, ni ordre de tabulation à contrôler. **Zéro violation, et c'est correct
de son point de vue** — l'outil ne peut pas deviner l'intention.

C'est la même classe de piège que l'ADR-0015 : un contrôle automatisé au vert ne
prouve pas que la chose fonctionne, il prouve que *ce qu'il sait regarder* est
en ordre. Là, l'accolade orpheline ne cassait pas le parseur ; ici, le `<div>`
cliquable ne casse pas l'analyseur.

Le défaut était d'autant plus discret que **le bon motif existait déjà dans le
fichier**, appliqué à deux cas sur six :

```html
<div class="bus-strip bus-half" onclick="openRemi()" role="button" tabindex="0"
     aria-label="Voir le détail des prochains bus Rémi"
     onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openRemi();}">
```

`.bus-strip` et `.fuel-strip` l'avaient. Les quatre tuiles voisines, non. Ce
n'était pas une décision, c'était une finition oubliée.

## Décision

**1. `role="button"` + `tabindex="0"` + `onkeydown`, pas de conversion en `<button>`.**

Convertir ces conteneurs en `<button>` serait plus juste sémantiquement, mais
impose une remise à zéro complète du style (`appearance`, `padding`, `font`,
`text-align`) sur des blocs qui portent des dégradés, des badges positionnés en
absolu et des grilles internes. Le risque de régression visuelle est réel et ne
serait couvert par aucun test. Le motif retenu est **celui déjà en place dans le
fichier** : cohérence, et aucun pixel déplacé.

**2. `aria-label` explicite sur chaque conteneur.**

Sans lui, `role="button"` fait annoncer par le lecteur d'écran la concaténation
de tout le contenu interne — « Météo 18° Ensoleillé Aucune alerte 🌤️ ». Le
libellé explicite dit ce que fait la commande, pas ce qu'elle contient.

**3. `preventDefault()` obligatoire dans chaque `onkeydown`.**

Sur un `role="button"`, la barre d'espace **fait défiler la page** par défaut.
Sans le `preventDefault()`, l'utilisateur voit l'écran sauter à chaque tentative
d'activation. Un test le vérifie explicitement.

**4. L'anneau de focus est posé sur `[role="button"]:focus-visible`, pas classe
par classe.**

Spécificité 0-2-0, il l'emporte donc sur les `outline:none` déjà présents sur
`.bus-strip` et `.fuel-strip` — qui signalaient le focus par un simple
changement de fond à peine perceptible, insuffisant au regard du critère 10.7.
`:focus-visible` et non `:focus` : l'anneau n'apparaît jamais au clic ni au
toucher.

**5. Deux exceptions documentées, encodées dans le test.**

- **Fonds d'overlay** (`ovClick`, `closeTrombi`) : ils ne servent qu'à fermer au
  clic extérieur, et le panneau qu'ils habillent a son propre bouton « Fermer ».
  Les rendre focusables ajouterait un arrêt de tabulation qui n'ouvre rien.
- **Conteneur ayant un descendant focusable qui porte la même action** : la
  bannière d'installation contient son bouton « Installer ». Le clic sur le bloc
  n'est qu'un raccourci souris ; l'action reste atteignable.

**6. Un fichier de test dédié, avec un test de propriété.**

`tests/e2e/accessibilite-clavier.spec.js` énumère **tous** les `[onclick]` du
DOM et échoue si l'un d'eux n'est ni nativement focusable, ni doté d'un
`tabindex`, ni couvert par les deux exceptions ci-dessus. C'est ce test — et non
la revue manuelle — qui a trouvé les deux derniers cas (`img.mat-img` et la
bannière d'installation) après le premier passage de corrections.

## Conséquences

- Toute nouvelle zone cliquable non native fait échouer la CI tant qu'elle n'est
  pas utilisable au clavier. L'invariant est verrouillé pour le HTML à venir.
- Les tests des quatre tuiles sont **sautés sur `desktop-chromium`** : le bandeau
  est masqué au-delà de 1024 px (`css/mat-desktop.css` → `.header{display:none}`),
  même idiome que `ambiance.spec.js`.
- Le focus posé avant `body.app-ready` ne tient pas — la séquence d'amorçage le
  reprend. Les tests attendent ce signal puis réessaient le focus jusqu'à ce
  qu'il tienne, plutôt que de fixer un délai arbitraire. Un utilisateur réel n'y
  est jamais confronté : il agit après l'affichage.
- La déclaration RGAA de l'application reste **« non conforme »** : aucun audit
  formel n'a eu lieu. Ce lot corrige des défauts identifiés, il ne vaut pas
  audit. La liste des mesures en place a été complétée en conséquence.

## Ce qui reste à faire

- **Hiérarchie de titres** : l'application compte 1 `<h1>`, 3 `<h2>` et 4 `<h3>`
  pour ~29 overlays. Les panneaux utilisent `.panel-title`, un `<div>` stylé. La
  navigation par titres — mode de déplacement principal d'un lecteur d'écran —
  ne donne donc presque rien. Passer `.panel-title` en `<h2>` est additif (même
  classe, même rendu) mais touche 29 gabarits : lot séparé.
- **Cibles tactiles** : la ligne de version (`0.52 rem`) est désormais
  atteignable au clavier mais reste bien en deçà de 44 px au toucher. La
  redimensionner déplacerait la mise en page de l'en-tête — à arbitrer.
