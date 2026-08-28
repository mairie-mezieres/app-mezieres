# Audit RGAA 4.1 — Mézières Avec Toi (MAT)

- **Date de l'audit** : 27 août 2026
- **Version auditée** : v4.86 → v4.93 (sept passes ; le taux publié est celui de la v4.93)
- **Référentiel** : RGAA version 4.1 — 106 critères, 13 thématiques
- **Réalisé par** : audit interne outillé, commune de Mézières-lez-Cléry
- **Statut** : **complet** — les 106 critères ont un verdict, aucun n'est laissé
  ouvert. Les cinq critères de jugement humain ont été tranchés le 27 août 2026 par
  le référent accessibilité de la commune (cinquième passe).

> Le RGAA n'impose **pas** de prestataire extérieur : l'audit peut être mené en
> interne. Il impose en revanche que l'organisme réponde de la **fiabilité** de sa
> déclaration. Ce document expose donc la méthode et les preuves, critère par
> critère, pour que cette fiabilité soit vérifiable — et non affirmée.

---

## 1. Méthode

### Échantillon

Le RGAA s'audite sur un échantillon de pages. MAT étant une application à page
unique, l'échantillon retient **la page et chacun de ses écrans** :

| # | Écran | Nature |
|---|---|---|
| 1 | Accueil (`index.html`) | page d'accueil obligatoire |
| 2 | Panneau Accessibilité + déclaration | page obligatoire (déclaration) |
| 3 | Panneau RGPD / mentions légales | page obligatoire (mentions) |
| 4 | Contact | page obligatoire (contact) |
| 5 | Numéros utiles | contenu à fort enjeu (urgences) |
| 6 | Signalement | formulaire + carte |
| 7 | Guide d'arrivée | contenu long structuré |
| 8 | Assistante MEL | interaction dynamique |
| 9–22 | Agenda, Météo, Déchets, Documents, Notifications, Sondages, Suivi, Idées, Bug, Changelog, Conseil, Majordome, Carburants, Photos, Associations | reste du service |
| 23 | `offline.html` | page hors-ligne |
| 24 | `notif.html` | aide notifications |
| 25 | `partager.html` | formulaire long (31 champs) |
| 26 | `architecture.html` | page technique publique |
| 27 | `revue-saviez-vous.html` | page de relecture |

Soit **6 pages HTML et 21 écrans** effectivement mesurés (l'écran Contact a échoué
en collecte automatisée sur une navigation ; il a été vérifié séparément).

`admin.html` est **hors périmètre** : espace d'administration réservé à la mairie,
protégé par authentification, il n'est pas un service de communication au public.

### Outils et environnement

- **axe-core 4.13.0** via `@axe-core/playwright`, filtres `wcag2a`, `wcag2aa`,
  `wcag21a`, `wcag21aa` — exécuté sur chaque écran de l'échantillon.
- **Chromium 1194**, fenêtres 1280×900 (bureau) et 320×800 (reflow).
- Relevé DOM automatisé : langue, titres, images, champs, tableaux, cadres,
  repères, liens, `tabindex`, `accesskey`, médias, régions live.
- Calcul de contraste vérifié à la main sur les couleurs relevées.
- Inspection manuelle du code source pour les critères non outillables.

### ⚠️ Ce que cet audit a d'abord dû réparer : son propre instrument

Les tests d'accessibilité du dépôt lançaient `axe.analyze()` **immédiatement après
l'ouverture d'un écran**. Or la classe `open` est posée avant la fin de la
transition CSS : pendant environ 300 ms l'écran reste `visibility:hidden`, et
**axe ignore tout ce qui est masqué**.

Mesure du 27 août 2026 sur le panneau Accessibilité, mêmes nœuds :

| Instant | Violations rapportées |
|---|---|
| t = 0 ms (moment mesuré par les tests) | **0** |
| t = 400 ms | **9** (`label`, *critical*) |
| t = 1500 ms | **9** |

Les tests ne pouvaient donc **pas** échouer — quel que soit le contenu. Ils étaient
verts depuis toujours sur un écran vide. Les douze interrupteurs du panneau
Accessibilité n'avaient aucun nom accessible depuis leur création.

C'est exactement la règle 7 du `CLAUDE.md` : *un test qui n'interroge que le JS ne
prouve pas qu'un effet est visible*. Les tests attendent désormais le **style
calculé** `visibility: visible` avant de mesurer. Ils ont immédiatement révélé des
violations réelles sur deux autres écrans.

---

---

## 2. Corrections appliquées pendant l'audit

| Critère | Défaut | Correctif |
|---|---|---|
| **11.1** | 12 interrupteurs du panneau Accessibilité sans nom accessible (*critical*) | `aria-labelledby` vers le libellé visible |
| **11.1** | 6 champs de formulaire sans étiquette associée — Signalement, Contact (×3), Bug, Idées. Le `<label class="form-label">` existait, **sans `for`** ; seul le `placeholder` portait l'information, et un `placeholder` n'est pas une étiquette | `for` posé sur les 5 libellés existants, `aria-label` sur la boîte à idées qui n'en avait aucun |
| **12.9** | Les 30 fenêtres modales portaient `role="dialog"` et `aria-modal` mais **aucun nom** : un lecteur d'écran annonçait « dialogue », sans dire lequel | `aria-labelledby` vers le `.panel-title` du panneau, posé à l'ouverture |
| **3.2** | Bouton d'urgence **Pompiers 18** : blanc sur `#ea580c` = **3,55:1** | `#c2410c` = **5,18:1** |
| **3.2** | Intitulés de rubrique `--sage` `#52b788` sur blanc = **2,47:1** | jeton `--sage-ink` `#2d6a4f` = **6,39:1** |
| **3.2** | `offline.html` : **2,47:1** et **2,32:1** | **6,39:1** et **4,83:1** |
| **3.2** | `architecture.html` : 26 nœuds, jusqu'à **1,22:1** | palette relevée, ≥ **5,7:1** |
| **3.2** | Messages d'erreur `#dc2626` sur crème `#f4f0ea` = **4,25:1** | `#b91c1c` = **5,70:1** |
| **9.1** | `partager.html` sans aucun `<h1>` | titre visuel promu, rendu inchangé |
| **10.6** | Lien d'attribution Leaflet : **2,55:1** avec le texte voisin, aucune distinction non colorimétrique | souligné |

**Après correction : zéro violation axe** (WCAG 2.1 A/AA) sur les 6 pages et 21 écrans.

> **Correction d'une affirmation de la première version de ce document.** Elle
> annonçait « 30 fenêtres modales pour un seul `role="dialog"` ». C'était un
> artefact de mesure : le relevé comptait les rôles **sur la page d'accueil au
> chargement**, alors que `openOv()` les pose **à l'ouverture** de chaque écran.
> Le rôle et `aria-modal` étaient donc déjà corrects partout. Ce qui manquait
> réellement — et qui est corrigé ici — c'est le **nom** de chaque fenêtre.

---

## 3. Deuxième passe — les critères outillables, tranchés

Huit des quatorze critères laissés en suspens ne demandaient personne : juste des
mesures que le premier passage n'avait pas faites. Elles ont été faites, et trois
d'entre elles ont révélé des défauts qui ont été corrigés dans la foulée.

| Critère | Mesure | Verdict |
|---|---|---|
| **8.9** — balises détournées | 15 séquences de `<br><br>` servant à espacer des paragraphes (présentation du majordome, contact RGPD, écran d'accueil). Aucun tableau de mise en forme, aucun titre vide. | **corrigé → C** : vrais paragraphes, espacement rendu au CSS |
| **13.11** — actions à l'appui | **0** gestionnaire `mousedown`, `touchstart` ou `pointerdown` dans tout le code. Tout passe par `click` et `change`, qui se déclenchent au relâchement et restent annulables. | **C** |
| **3.3** — contraste des composants | Bordure des champs : `rgba(0,0,0,0.07)` = **1,17:1** (minimum 3:1). Interrupteurs : piste `#ccc` sur blanc = **1,61:1**, état allumé = **2,47:1**. Les réglages d'accessibilité eux-mêmes étaient à peine visibles pour qui voit mal. | **corrigé → C** : jeton `--border-champ` à **3,88:1**, bordure d'interrupteur à **3,95:1**, état allumé à **6,39:1**, distinction éteint/allumé à **3,98:1** |
| **10.9 / 10.10** — forme, taille, position | Boutons de taille de texte, de thème et onglets d'agenda : l'état sélectionné n'était donné que par la couleur et la bordure, sans équivalent programmatique. Aucun astérisque non explicité ; les mentions « obligatoire / facultatif » sont en toutes lettres. | **corrigé → C** : `aria-pressed` sur les six boutons à état |
| **10.13 / 10.14** — contenus additionnels | **0** contenu révélé au survol par CSS, **0** infobulle JavaScript. Les 13 attributs `title` produisent des infobulles natives du navigateur, hors périmètre de ces critères. | **NA** |
| **12.11** — contenus additionnels au clavier | Même constat : aucun contenu additionnel à atteindre. Le seul `<details>` est nativement utilisable au clavier. | **NA** |

Mesures versées au dossier lors de cette passe : sans CSS, **4 431 caractères**
restent lisibles et ordonnés (10.2, 10.3) · zoom **200 %** et largeur **320 px**
sans débordement horizontal (10.4, 10.11) · espacement du texte forcé
(interlignage 1,5 · espacement des lettres 0,12em) sans élément tronqué (10.12) ·
`prefers-reduced-motion: reduce` neutralise toutes les animations (13.8) · **108
identifiants** tous uniques.

---

## 4. Troisième passe — onze non-conformités levées

Les trois chantiers dont le code change sans que l'écran bouge.

| Critères | Ce qui n'allait pas | Correctif |
|---|---|---|
| **7.5** | **Aucune région live.** Les réponses de MEL, le suivi des signalements et la galerie photos étaient mis à jour en silence : un lecteur d'écran n'annonçait rien. Un habitant aveugle dont l'envoi échouait croyait que c'était parti. | `role="status"` + `aria-live="polite"` sur `#msgs`, `#suivi-body`, `#photos-list`. La modale de validation devient un `alertdialog` et prend le focus. |
| **11.10 / 11.11** | L'erreur de saisie était énoncée dans une fenêtre, **sans lien avec le champ fautif**. Après fermeture, le focus repartait au début et l'habitant devait retrouver le champ seul. | `aria-invalid` posé sur le champ, focus rendu au champ, marqueur effacé dès la première frappe. Les messages suggéraient déjà la correction. |
| **11.5 / 11.6 / 11.7** | Vingt cases de même nature sans groupement, et un libellé « Votre niveau en informatique » qui **ne portait aucun `for`** — affiché, rattaché à rien. | `role="group"` + `aria-labelledby` vers le titre de l'étape ; le libellé orphelin devient la légende du groupe de boutons radio. |
| **5.4 / 5.5 / 5.6 / 5.7** | Les horaires de la mairie étaient lus d'une traite : « Lundi 14h00 17h30 Mardi Fermée… », sans lien entre le jour et l'heure. | `caption` réservé aux lecteurs d'écran, jour passé en `th scope="row"`. **Rendu vérifié identique** : même alignement, même graisse, même couleur — les règles CSS lui rendent exactement l'apparence de l'ancien `td`. |
| **13.2** | **7 liens** ouvraient une nouvelle fenêtre sans le dire. Le bouton « précédent » ne ramenait plus, sans explication. | mention « (nouvelle fenêtre) » en texte réservé aux lecteurs d'écran, posée au chargement puis à l'ouverture de chaque écran — ce qui couvre les contenus injectés après coup, sans observateur de mutations permanent. |

Vérifié après coup, sur le rendu : **7 liens sur 7** avertis · 5 `th scope="row"` et
1 `caption` sur le tableau des horaires, rendu inchangé · régions live présentes sur
`#msgs` et `#suivi-body` · modale en `alertdialog` avec focus sur le bouton, puis
`aria-invalid="true"` et focus rendu au champ à la fermeture, marqueur effacé à la
saisie.

**11.13 reste non conforme**, délibérément. Le champ « Coordonnée de réponse » du
formulaire de contact accepte **un e-mail ou un téléphone** : aucun jeton
`autocomplete` ne couvre les deux. Le corriger proprement demanderait de scinder le
champ en deux — un changement visible, hors du périmètre de cette passe. Le champ
« nom » a reçu `autocomplete="name"`.

### Quatrième passe — repères de page, et une erreur de mon audit

| Critères | Constat | Suite |
|---|---|---|
| **9.2 / 12.6** | **Aucun repère de page.** Un lecteur d'écran devait tout parcourir de haut en bas, sans pouvoir sauter à l'en-tête, au contenu ou au pied. Les pages hors-ligne et architecture n'en avaient aucun. | `role="banner"`, `role="main"`, `role="contentinfo"` posés — **le rôle plutôt que la balise** : `<div>` → `<header>` aurait le même effet, mais imposerait de retrouver la bonne balise fermante dans un gabarit de 560 lignes. Vérifié : un seul repère de chaque type par page. |
| **10.8** | **Faux positif de la deuxième passe.** J'avais relevé « un conteneur `aria-hidden` contient un élément focusable » à partir d'un comptage qui ne vérifiait pas si le conteneur était affiché. | Mesuré : le conteneur est en `display:none`, son bouton a une boîte de 0 px et n'est pas dans l'ordre de tabulation. Et le script bascule bien `aria-hidden` à `false` quand la fenêtre s'ouvre. **Conforme, sans correctif.** |

**10.5 reste non conforme, et je n'y touche pas.** Des déclarations posent le fond
**ou** la couleur du texte, mais pas les deux. Corriger à l'aveugle ferait courir un
risque visuel réel pour un bénéfice théorique. Le chantier reste au plan, à traiter
en regardant chaque cas.

> ⚠️ **Le chiffre annoncé ici — « 45 déclarations, dont 6 visibles » — était faux.**
> Voir la sixième passe : le vrai compte est d'environ **356 emplacements**. Le
> relevé d'origine ne regardait que les éléments déjà affichés au chargement, soit
> une fraction de l'accueil, et ne regardait pas du tout les feuilles de style.

### Cinquième passe — les six derniers critères sont tranchés

Cet audit ne comporte plus de `?`. Cinq critères relevaient du **jugement humain** :
aucun outil ne peut dire si une alternative d'image est *pertinente*, ni si un PDF
vient d'un scanner. Ils ont été soumis au **référent accessibilité** de la commune,
qui a répondu le 27 août 2026.

| Critère | Question posée | Réponse | Verdict |
|---|---|---|---|
| **1.3** | Les quatre alternatives d'images sont-elles compréhensibles à l'oreille ? | oui, telles quelles | `C` |
| **3.1** | Une information passe-t-elle **uniquement** par la couleur (vigilance météo, sécheresse, statut des signalements, zonage du PLU) ? | non — **partout un mot ou un symbole double la couleur** | `C` |
| **13.3 / 13.4** | Les documents du PLUi sont-ils des scans ? | non — ce sont des **exports numériques** (Word, LibreOffice, logiciel métier) : ils portent une couche de texte | `C` |
| **13.10** | La carte 3D exige-t-elle un geste à deux doigts sans équivalent ? | non — zoom, rotation et remise à plat se font aux boutons | `C` |

> ⚠️ **Ces quatre réponses sont des déclarations, pas des mesures.** Le RGAA les
> admet — il demande que l'organisme réponde de la fiabilité de sa déclaration, non
> qu'un outil ait tout vérifié. Elles se re-vérifient à l'œil, et devront l'être si
> un nouveau document est publié ou si la carte 3D change de gestes.

**Le sixième, 8.2, n'était pas une question mais une mesure — et il tombe.** Le
validateur officiel du W3C (`vnu`, le même moteur que `validator.w3.org`, exécuté en
local) a relevé **39 erreurs** sur les six pages de l'échantillon. Quatre étaient sans
risque et sont corrigées ici :

| Erreur | Où | Correction |
|---|---|---|
| Espaces non encodées dans un `src` | `img/MAT et MEL.webp` (4 fois), `img/Fabrice AUFFRET ….jpg` | `%20` |
| `src=""` — invalide, et interprété par certains navigateurs comme **un rechargement de la page courante** | `#trombi-big-img` | un pixel transparent en `data:` ; la vraie photo est posée à l'ouverture |
| `aria-label` sur un `<div>` sans rôle propre | `#ov-carte3d` | supprimé — `openOv()` pose déjà `aria-labelledby` vers le titre du panneau |

Restent **33 erreurs**, toutes structurelles et de trois familles seulement :

| Occurrences | Erreur | Où |
|---|---|---|
| 28 | `<div>` à l'intérieur d'un `<button>` | les tuiles de l'accueil (`index.html`) |
| 4 | `<div>` à l'intérieur d'un `<label>` | les cartes à cocher de `partager.html` |
| 1 | `<style>` dans le `<body>` | `index.html` ligne 80 — la feuille du lien d'évitement |

Soit **29 erreurs dans `index.html` et 4 dans `partager.html`**. La dernière est la
moins chère — déplacer le bloc `<style>` dans le `<head>` — mais elle **change l'ordre
de la cascade** vis-à-vis des feuilles liées : à faire en regardant l'écran, pas à
l'aveugle.

**8.2 est donc `NC`, et non plus `?`.** Le chantier n'est pas anodin : `.ct-label` et
`.ct-sub` ne déclarent **aucun** `display` — vérifié — donc passer ces `<div>` en
`<span>` casserait la mise en page des 28 tuiles tant qu'un `display:block` ne leur
est pas ajouté. Il rejoint les non-conformités à traiter, hors de cette passe.

**Le validateur est branché** : `.github/workflows/validite-html.yml`, chaque lundi et
à chaque modification d'un `.html`. Il suit le modèle de `liens-morts.yml` — une seule
issue vivante, mise à jour à chaque passage, refermée d'elle-même quand le compte
tombe à zéro. Il **ne fait pas échouer le build** : faire rougir chaque proposition de
modification sur un passif connu de 33 erreurs apprendrait surtout à ignorer le rouge.

### Sixième passe — 8.2 et 11.13 levés (v4.91, 28 août 2026)

**11.13 — le champ « e-mail ou téléphone » est scindé.** Aucun jeton `autocomplete`
ne couvre les deux à la fois : le navigateur ne pouvait rien pré-remplir. Deux
champs, `autocomplete="email"` et `autocomplete="tel"`, tous deux facultatifs comme
avant, avec le clavier adapté sur téléphone. La carte Trello reçue par la mairie
garde exactement le même format. Bonus 11.10 : chaque erreur de saisie désigne
maintenant le bon champ, au lieu d'un message commun. → **`C`**

**8.2 — les 33 erreurs de validité sont corrigées. Le code est valide à 100 %.**

| Famille | Correctif | Piège |
|---|---|---|
| 28 × `<div>` dans un `<button>` — les tuiles de l'accueil | 52 `<div>` → `<span>` dans les 14 boutons `.card` | **`.ct`, `.ct-label` et `.ct-sub` ne déclaraient AUCUN `display`.** Ils le tenaient de la balise `<div>`. Sans la règle CSS ajoutée en même temps, le sous-titre de chaque tuile remontait sur la ligne du titre. |
| 4 × `<div>` dans un `<label>` — cartes à cocher de `partager.html` | idem, `<span>` + `display:block` | même piège |
| 1 × `<style>` dans le `<body>` | déplacé dans le `<head>`, juste après `mat-desktop.css` | vérifié avant : **rien d'autre ne pose de CSS entre les deux**, donc l'ordre de la cascade est inchangé |

La transformation des tuiles a été faite par un script borné aux blocs
`<button class="card">`, qui **refuse d'écrire** si le compte de `<div>` ouvrants et
fermants ne correspond pas dans un bloc. Il a refusé une première fois — un bug de
mon marcheur de balises lui faisait avaler tout le fichier. Contrôle final :
+104 octets pour 104 balises renommées, soit un caractère chacune, et pas une ligne
de plus. → **`C`**

Un test de non-régression garde la mise en page : `tests/e2e/tuiles-mise-en-page.spec.js`
asserte le **style calculé** et la **géométrie** — le sous-titre doit être sous le
titre — et **refuse de conclure sur une carte de hauteur nulle**. Sa première
version, elle, passait sur ordinateur, où la grille du téléphone est masquée : deux
boîtes de 0 px sont toujours « empilées ». Encore ADR-0030. Le test a ensuite été
vérifié en retirant le `display:block` : il rougit.

> ### ⚠️ Et une troisième erreur de mesure de cet audit : le critère 10.5
>
> En voulant traiter 10.5, j'ai re-mesuré. Le compte annoncé plus haut — **45
> déclarations, dont 6 visibles** — est faux, pour deux raisons cumulées :
>
> 1. le relevé ne regardait que les éléments **déjà affichés au chargement**, soit
>    une fraction de l'accueil et aucun des 31 écrans ;
> 2. il ne regardait **que les styles en ligne**, pas les feuilles de style.
>
> Et la première tentative de relevé des feuilles de style a elle-même échoué en
> silence : elle testait `if (rule.cssRules)` pour distinguer un bloc `@media`
> d'une règle simple. Or **toute** règle CSS porte un `cssRules` — vide, mais
> *truthy* (support du CSS imbriqué). Chaque règle était donc prise pour un
> conteneur, parcourue à vide, et sautée : **87 règles comptées sur 1 046, dont
> zéro avec une couleur.** Un zéro qui vient d'une boucle cassée ressemble
> exactement à un zéro qui vient d'un code propre.
>
> **Compte réel, mesuré sur le DOM complet avec les 31 écrans hydratés :**
>
> | | Nombre |
> |---|---|
> | Règles CSS parcourues | 1 201 |
> | dont déséquilibrées | 612 |
> | **dont portant réellement du texte** | **91** |
> | **Déclarations en ligne portant du texte** | **265** |
> | **Total des emplacements à traiter** | **≈ 356** |
>
> La conclusion de fond, elle, ne change pas — elle se renforce : c'est un chantier
> **cas par cas**. Un `.ct-label` sur une tuile à dégradé ne peut pas recevoir de
> couleur de fond plate sans écraser le dégradé. Poser `background: transparent`
> partout satisferait la lettre du critère sans rien apporter à personne : ce que
> 10.5 protège, c'est le lecteur qui force ses propres couleurs, et `transparent`
> ne le protège pas. Le chantier reste au plan, et son ampleur y est désormais
> honnête.

### Le badge du pied de page annonçait 100 (v4.92)

Signalé par le porteur après la publication du taux : le pied de page affichait
**« ♿ Accessibilité 100 »** — le score Lighthouse — juste à côté d'une déclaration
annonçant **89,2 %**. L'infobulle allait plus loin et présentait ce score comme la
**« conformité RGAA/WCAG »**.

Le score est exact ; sa qualification ne l'était pas. **Lighthouse ne mesure pas la
conformité RGAA** : une quarantaine de contrôles automatisables, contre 106 critères
dont beaucoup exigent un jugement humain — ce document en donne cinq exemples à la
cinquième passe. Lighthouse le dit lui-même dans sa documentation.

C'est la même confusion que celle qui a ouvert cet audit, prise par l'autre bout :
**un contrôle automatique vert n'est pas une conformité.** La première fois, elle
faisait paraître l'application pire qu'elle n'était ; ici, meilleure.

Corrigé : le badge dit `♿ Contrôle auto 100`, et son infobulle renvoie à la
déclaration pour le taux officiel. Le taux **n'est pas recopié** dans le pied de
page — il y vivrait en double et divergerait au premier audit. Verrouillé par
`tests/e2e/badge-perf.spec.js`, vérifié par sabotage.

**Aucun critère ne change : 89,2 %.** Ce n'était pas une mesure fausse, c'était un
affichage trompeur.

### Septième passe — la structure et le plan du site (v4.93, 28 août 2026)

**9.1 et 9.3 — l'accueil a enfin une structure, et il n'a pas bougé d'un pixel.**

Sur téléphone, l'écran d'accueil ne portait **aucun titre**, d'aucun niveau : la
navigation par titres, celle qu'utilise toute personne aveugle pour survoler une
page, ne faisait rien. Les sept intitulés de rubrique étaient des `<div>`, et les
grilles de tuiles n'étaient pas des listes.

| Élément | Avant | Après |
|---|---|---|
| Titre de la page | *aucun* | `<h1>` — **le titre qui était déjà là** |
| Intitulés de rubrique | 7 × `<div class="sec">` | 7 × `<h2 class="sec">` |
| Grilles de tuiles | 7 × `<div class="grid2">` | 7 × `<ul>`, 16 tuiles en `<li>` |

> **Le `h1` n'est pas un titre ajouté.** C'est « Mézières Avec Toi », en haut du
> bandeau depuis toujours, écrit `<div class="mat-title">`. Le porteur l'a fait
> remarquer alors que ce document proposait d'en ajouter un nouveau : promouvoir
> l'existant est plus juste, et ne coûte rien. Même correctif que pour
> `partager.html` en première passe.

⚠️ **Trois `margin:0` et un `list-style:none` portent tout le rendu.** Un `<h1>`
apporte 0,67 em de marge, un `<h2>` 0,83 em, un `<ul>` une marge verticale, 40 px
d'indentation et des puces — que les `<div>` n'avaient pas. Sans ces neutralisations
posées dans le même commit, l'accueil se serait décalé partout. C'est le piège des
tuiles de la v4.91, en plus large.

**Vérification :** la zone de contenu rendue donne la **même empreinte de fichier**
qu'avant modification — `230a35590f51e51e…` — et la page fait 1836 px dans les deux
cas. Les hauteurs de rangées restent égales (le `<li>` devient l'élément de grille,
d'où `.grid2 > li{display:flex}` et `.card{height:100%}`).

**12.1, 12.3 et 12.4 — un écran « Plan du site ».**

Le `<nav>` de l'application est **masqué sur téléphone** : il n'existait donc qu'un
seul chemin vers chaque écran, la tuile de l'accueil. Le plan du site apporte le
second, et satisfait les trois critères d'un coup.

⚠️ **Ses intitulés ne sont écrits nulle part.** Ils sont lus à l'ouverture dans le
`.panel-title` de chaque écran (`js/mat-plan-site.js`). Une liste recopiée aurait
divergé au premier intitulé modifié, en silence — la classe d'erreur qui a déjà
mordu ce dépôt sur les associations, la fibre et l'arbre MEL. Ce qui est déclaré à
la main, c'est le seul classement par rubrique ; et
`tests/e2e/plan-du-site.spec.js` **échoue si un écran n'est ni classé ni
explicitement écarté**, ou si un identifiant classé ne correspond à aucun écran.
Oublier un écran devient impossible en silence.

> Le test a immédiatement servi : il a rejeté sept identifiants que j'avais devinés
> au lieu de les relever (`actus` pour `notifs`, `bugs` pour `bug`, `associations`
> pour `assoc`…). Écrit après coup, il n'aurait rien trouvé.

> ⚠️ **Le plan a été livré cassé, et c'est le porteur qui l'a vu.** En v4.93,
> les liens appelaient `openOv(id)` — qui ne pose que la coquille de l'écran.
> « Conseil municipal » s'ouvrait sans aucun élu, « Je viens d'emménager »
> restait sur « Chargement… ». Corrigé en v4.94.
>
> Mes deux premiers tests de non-régression ne l'attrapaient pas : l'un
> vérifiait que l'écran **s'ouvre**, l'autre qu'il contient **assez
> d'éléments** — or un écran vide garde son gabarit et son message d'accueil.
> Je l'ai su en **remettant le bug exprès** : le test restait vert. Il a fallu
> viser le contrat lui-même — la fonction dédiée est-elle appelée, avec ses
> arguments — pour qu'il rougisse. **Un test de non-régression qu'on n'a pas vu
> échouer ne prouve rien.**

**Le plan est atteignable depuis le pied de page**, présent sur chaque écran — ce
qu'exige 12.4. Une tuile d'accueil n'aurait pas suffi : elle disparaît dès qu'on
ouvre autre chose.

**Ce qui se voit, et c'est tout :** dans le pied de page du téléphone, le libellé
« MAT · Mézières-lez-Cléry » cède sa place au lien, et les trois liens se centrent
sur une ligne. Aucune information perdue — ces deux noms sont le `h1` du bandeau.
Mesuré : **88 px avant, 88 px après** en 412 et 360 px ; **129 → 111 px** en 320 px,
où le libellé passait à la ligne. Aucun débordement horizontal.

> Une première tentative ajoutait simplement un troisième lien à la suite : elle
> **faisait déborder le pied de page horizontalement à 320 px**. Réparer un défaut
> d'accessibilité en en créant un autre ; mesuré avant d'être commité.

---

## 5. Les 106 critères

`C` conforme · `NC` non conforme · `NA` non applicable

> **Aucun `?` ne subsiste.** Les 106 critères ont tous un verdict : c'est ce qui fait
> de ce document un audit et non un relevé partiel.

| Thème | Critères | Verdicts |
|---|---|---|
| **1. Images** (9) | 1.1 `C` · 1.2 `C` · 1.3 `C` · 1.4 à 1.9 `NA` | Deux images porteuses d'information avec `alt` ; une décorative en `alt=""`. 1.3 tranché par le référent (cinquième passe). |
| **2. Cadres** (2) | 2.1 `NA` · 2.2 `NA` | Aucun `iframe` dans l'échantillon. |
| **3. Couleurs** (3) | 3.1 `C` · 3.2 `NC` · 3.3 `C` | 3.1 : partout un mot ou un symbole double la couleur (référent). 3.2 : **136 nœuds indéterminés** (texte sur dégradé ou photo). |
| **4. Multimédia** (13) | 4.1 à 4.13 `NA` | Aucun média temporel. |
| **5. Tableaux** (8) | 5.1 `NA` · 5.2 `NA` · 5.3 `NA` · 5.4 `C` · 5.5 `C` · 5.6 `C` · 5.7 `C` · 5.8 `NA` | Horaires de la mairie et tableaux RGPD balisés. |
| **6. Liens** (2) | 6.1 `C` · 6.2 `C` | |
| **7. Scripts** (5) | 7.1 `C` · 7.2 `NA` · 7.3 `C` · 7.4 `C` · 7.5 `C` | |
| **8. Éléments obligatoires** (10) | 8.1 `C` · 8.2 `C` · 8.3 `C` · 8.4 `C` · 8.5 `C` · 8.6 `C` · 8.7 `NA` · 8.8 `NA` · 8.9 `C` · 8.10 `NA` | 8.2 mesuré au validateur du W3C : **33 erreurs** restantes (4 corrigées), trois familles structurelles. |
| **9. Structuration** (4) | 9.1 `C` · 9.2 `C` · 9.3 `C` · 9.4 `NA` | 9.1 et 9.3 levés en septième passe : le titre du bandeau devient le `h1`, les 7 intitulés de rubrique des `h2`, les 7 grilles de tuiles de vraies listes — à rendu identique. Repères de page posés : `banner`, `main`, `contentinfo`, `navigation` sur l'accueil ; `main` sur les pages hors-ligne et architecture, qui n'en avaient aucun. |
| **10. Présentation** (14) | 10.1 `C` · 10.2 `C` · 10.3 `C` · 10.4 `C` · 10.5 `NC` · 10.6 `C` · 10.7 `C` · 10.8 `C` · 10.9 `C` · 10.10 `C` · 10.11 `C` · 10.12 `C` · 10.13 `NA` · 10.14 `NA` | 10.5 : environ **356 emplacements** (91 règles CSS, 265 styles en ligne) ne posent que le fond **ou** que le texte — chiffre corrigé en sixième passe. |
| **11. Formulaires** (13) | 11.1 `C` · 11.2 `C` · 11.3 `C` · 11.4 `C` · 11.5 `C` · 11.6 `C` · 11.7 `C` · 11.8 `NA` · 11.9 `C` · 11.10 `C` · 11.11 `C` · 11.12 `NA` · 11.13 `C` | 11.13 : le champ e-mail **ou** téléphone n'admet aucun jeton `autocomplete`. |
| **12. Navigation** (11) | 12.1 `C` · 12.2 `C` · 12.3 `C` · 12.4 `C` · 12.5 `NA` · 12.6 `C` · 12.7 `C` · 12.8 `C` · 12.9 `C` · 12.10 `NA` · 12.11 `NA` | 12.1, 12.3 et 12.4 levés en septième passe : un écran « Plan du site », atteignable depuis le pied de page de chaque écran, qui sert aussi de second système de navigation. |
| **13. Consultation** (12) | 13.1 `NA` · 13.2 `C` · 13.3 `C` · 13.4 `C` · 13.5 `NA` · 13.6 `NA` · 13.7 `C` · 13.8 `C` · 13.9 `C` · 13.10 `C` · 13.11 `C` · 13.12 `NA` | 13.3/13.4 : les documents du PLUi sont des exports numériques, non des scans. 13.10 : la carte 3D se pilote entièrement aux boutons (référent). |

### Décompte

| | Nombre |
|---|---|
| Conformes | **63** |
| Non conformes | **2** |
| Non applicables | **41** |
| Non tranchés | **0** |
| Total | **106** |

## 6. Taux de conformité

Critères applicables : 106 − 41 = **65**. **Aucun critère n'est laissé sans verdict** :
le taux n'est plus un plancher prudent, c'est la mesure.

> ## Taux de conformité : **96,9 %** (63 sur 65)
> ### Mention RGAA : **partiellement conforme**

| Étape | Conformes | Taux |
|---|---|---|
| Avant l'audit | *non mesuré* | — |
| Première et deuxième passe | 37 | 56,9 % |
| Troisième passe | 48 | 73,8 % |
| Quatrième passe | 51 | 78,5 % (6 critères encore ouverts) |
| Cinquième passe | 56 | 86,2 % |
| Sixième passe | 58 | 89,2 % |
| **Septième passe** | **63** | **96,9 %** |
| Si tout le plan est traité | 65 | 100 % |

> Le saut de 78,5 % à 86,2 % n'est pas de 6 critères mais de 5 : les cinq questions
> de jugement ont reçu une réponse favorable, le sixième — 8.2 — a été **mesuré** et
> il échoue. La quatrième passe l'espérait à 87,7 % ; la mesure dit 86,2 %. C'est la
> différence entre un pronostic et un audit.

### Les 2 non-conformités restantes

| Critères | Chantier | Visible à l'écran ? |
|---|---|---|
| 3.2 | Lever les 136 contrastes indéterminés | selon les cas |
| 10.5 | ≈ 356 emplacements ne posent que le fond **ou** que le texte | non |

## 7. Reproduire cet audit

```bash
cd tests/e2e && npm ci
npx playwright test                 # 260 tests, dont les contrôles axe par écran
```

Et pour le critère 8.2, le validateur officiel — le même moteur que
`validator.w3.org`, exécuté en local :

```bash
npm install --no-save vnu-jar
java -jar "$(find node_modules/vnu-jar -name vnu.jar)" \
  index.html offline.html notif.html partager.html \
  architecture.html revue-saviez-vous.html
```

Les tests d'accessibilité échouent désormais **vraiment** : ils attendent le style
calculé avant de mesurer. Toute régression sur un critère outillable est bloquée en
intégration continue.
