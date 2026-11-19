# ADR-0056 — Un `<main>` qui ne contient que l'invisible

- **Statut** : accepté
- **Date** : 19 novembre 2026
- **Contexte** : test automatisé externe de la page d'accueil (consultant RGAA, 79 %),
  contre-vérifié dans le code — audit, « Douzième passe »

## Constat

L'accueil a **deux mises en page** dans le même document : les tuiles du téléphone
(`.content`) et la grille du bureau (`.d-main-grid`), l'une masquée quand l'autre
s'affiche (seuil 1024 px, `css/mat-desktop.css`).

`<main id="main-content">` s'ouvrait **après** `.content`. Il ne contenait donc que la
grille du bureau et ses bandeaux — tous en `display:none` sous 1024 px. Sur téléphone :

- le repère `main` existait, avait un `id`, était unique : **axe-core ne voit rien** ;
- le lien « Aller au contenu principal » visait une zone **sans rien d'affiché** ;
- les tuiles — tout le contenu réel — n'appartenaient à **aucun** repère.

L'audit de septembre l'avait coché conforme (9.2, 12.6, 12.7) en lisant le balisage, pas
le rendu. Même famille que l'ADR-0030 : un contrôle qui ne mesure pas ce qu'on voit ne
rougit pas, il verdit.

Le pied de page avait le défaut symétrique : `.footer` (téléphone) portait
`role="contentinfo"`, `.d-footer` (bureau), qui le **remplace**, ne le portait pas.

## Décision

1. `<main>` s'ouvre **avant** `.content` : il englobe les deux mises en page. Aucune
   règle CSS ne dépend du parent de `.content` (vérifié : ni `main …`, ni `body > …`).
2. `.d-footer` porte `role="contentinfo"`. Les deux pieds de page n'étant jamais
   affichés ensemble, un seul repère est exposé à la fois. Idem pour les deux `h1`
   (`.mat-title` / `.d-hero-title`) : un seul est rendu par mise en page — ce n'est
   **pas** un défaut, contrairement à ce qu'annonce un outil qui lit le DOM brut.
3. Le contrôle mesure le **rendu** : `tests/e2e/accessibilite-accueil.spec.js` exige
   que la cible du lien d'évitement soit un `<main>` contenant plus de cinq éléments
   **visibles**, dans les deux mises en page, et qu'un seul `h1` et un seul
   `contentinfo` soient visibles.

## Ce que la même passe a corrigé (hors repères)

- **Quatre fenêtres hors `openOv()`** — modale MAT, fiche d'un élu, proposition
  d'alertes, présentation guidée — sans piège à focus ; Échap fermait **l'overlay du
  dessous** (le gestionnaire de `mat-core.js` ne connaît que sa pile). Utilitaire
  commun `matDialogue(el, fermer)` (`js/mat-utils.js`) : écoute en **capture** et arrête
  la propagation, donc la fenêtre ouverte reçoit seule Tab et Échap. ⛔ ADR-0032 :
  appelé derrière `typeof` depuis les scripts injectés.
- `role="button"` **sans** `tabindex` ni Entrée : actualités du bureau
  (`mat-desktop.js`) ; avec `tabindex` mais **sans** Entrée : vignettes des élus.
- Étoiles des sondages en `<span onclick>` → boutons `aria-pressed` ; choix regroupés
  en `fieldset` + légende ; statut d'envoi en `role="status"`.
- Pastilles « ! » : texte réservé (« Nouveaux documents »…) au lieu d'un `aria-hidden`
  qui supprimait l'information.

## Ce qui n'a PAS été fait, et pourquoi

- **`aria-live` sur les encarts « Chargement… » de l'accueil** (météo, bus, carburant,
  déchets…). Une dizaine d'encarts se remplissent ensemble au lancement, puis se
  rafraîchissent : les déclarer zones vivantes ferait lire à la suite, sans action de
  l'habitant, météo, horaires de bus et prix des carburants — l'inverse de ce qu'on
  veut pour un public senior au lecteur d'écran. RGAA 7.5 vise les **messages de
  statut** consécutifs à une action ; ceux-là le sont désormais (sondages), les autres
  l'étaient déjà (MEL, suivi, photos, carte 3D).
- **La mention du pied de page** reste « totalement conforme » : un score d'outil
  automatique n'est pas un taux RGAA, et la déclaration doit énoncer un taux mesuré.
  Les défauts trouvés ont été corrigés et sont listés dans la déclaration
  (« Contre-vérification du 19 novembre 2026 »). Rétrograder la mention est une
  décision de la mairie, à prendre avec un nouvel audit.
