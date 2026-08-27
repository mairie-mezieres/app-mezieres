# Audit RGAA 4.1 — Mézières Avec Toi (MAT)

- **Date de l'audit** : 27 août 2026
- **Version auditée** : v4.86 (`mat-v4.86.0`)
- **Référentiel** : RGAA version 4.1 — 106 critères, 13 thématiques
- **Réalisé par** : audit interne outillé, commune de Mézières-lez-Cléry
- **Statut** : ⚠️ **projet — à valider par la mairie avant publication du taux**

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

**10.5 reste non conforme, et je n'y touche pas.** 45 déclarations inline posent le
fond **ou** la couleur du texte, mais pas les deux — dont **6 seulement** sur des
éléments visibles, et l'une d'elles est le fond de `<html>`, qui est légitime. Les
autres héritent du fond d'un conteneur qui, lui, le déclare. Corriger les 45 à
l'aveugle ferait courir un risque visuel réel pour un bénéfice théorique. Le
chantier reste au plan, à traiter en regardant chaque cas.

---

## 5. Les 106 critères

`C` conforme · `NC` non conforme · `NA` non applicable · `?` non tranché

| Thème | Critères | Verdicts |
|---|---|---|
| **1. Images** (9) | 1.1 `C` · 1.2 `C` · 1.3 `?` · 1.4 à 1.9 `NA` | Deux images porteuses d'information avec `alt` ; une décorative en `alt=""`. |
| **2. Cadres** (2) | 2.1 `NA` · 2.2 `NA` | Aucun `iframe` dans l'échantillon. |
| **3. Couleurs** (3) | 3.1 `?` · 3.2 `NC` · 3.3 `C` | 3.2 : **136 nœuds indéterminés** (texte sur dégradé ou photo). |
| **4. Multimédia** (13) | 4.1 à 4.13 `NA` | Aucun média temporel. |
| **5. Tableaux** (8) | 5.1 `NA` · 5.2 `NA` · 5.3 `NA` · 5.4 `C` · 5.5 `C` · 5.6 `C` · 5.7 `C` · 5.8 `NA` | Horaires de la mairie et tableaux RGPD balisés. |
| **6. Liens** (2) | 6.1 `C` · 6.2 `C` | |
| **7. Scripts** (5) | 7.1 `C` · 7.2 `NA` · 7.3 `C` · 7.4 `C` · 7.5 `C` | |
| **8. Éléments obligatoires** (10) | 8.1 `C` · 8.2 `?` · 8.3 `C` · 8.4 `C` · 8.5 `C` · 8.6 `C` · 8.7 `NA` · 8.8 `NA` · 8.9 `C` · 8.10 `NA` | 8.2 demande le validateur du W3C. |
| **9. Structuration** (4) | 9.1 `NC` · 9.2 `C` · 9.3 `NC` · 9.4 `NA` | Un seul titre et aucune liste sur l'accueil. Repères de page posés : `banner`, `main`, `contentinfo`, `navigation` sur l'accueil ; `main` sur les pages hors-ligne et architecture, qui n'en avaient aucun. |
| **10. Présentation** (14) | 10.1 `C` · 10.2 `C` · 10.3 `C` · 10.4 `C` · 10.5 `NC` · 10.6 `C` · 10.7 `C` · 10.8 `C` · 10.9 `C` · 10.10 `C` · 10.11 `C` · 10.12 `C` · 10.13 `NA` · 10.14 `NA` | 10.5 : 45 déclarations inline ne posent que le fond **ou** que le texte, dont 6 seulement sur des éléments visibles. |
| **11. Formulaires** (13) | 11.1 `C` · 11.2 `C` · 11.3 `C` · 11.4 `C` · 11.5 `C` · 11.6 `C` · 11.7 `C` · 11.8 `NA` · 11.9 `C` · 11.10 `C` · 11.11 `C` · 11.12 `NA` · 11.13 `NC` | 11.13 : le champ e-mail **ou** téléphone n'admet aucun jeton `autocomplete`. |
| **12. Navigation** (11) | 12.1 `NC` · 12.2 `C` · 12.3 `NC` · 12.4 `NC` · 12.5 `NA` · 12.6 `C` · 12.7 `C` · 12.8 `C` · 12.9 `C` · 12.10 `NA` · 12.11 `NA` | Manquent un second système de navigation et une page « plan du site ». |
| **13. Consultation** (12) | 13.1 `NA` · 13.2 `C` · 13.3 `?` · 13.4 `?` · 13.5 `NA` · 13.6 `NA` · 13.7 `C` · 13.8 `C` · 13.9 `C` · 13.10 `?` · 13.11 `C` · 13.12 `NA` | |

### Décompte

| | Nombre |
|---|---|
| Conformes | **51** |
| Non conformes | **8** |
| Non applicables | **41** |
| Non tranchés | **6** |
| Total | **106** |

## 6. Taux de conformité

Critères applicables : 106 − 41 = **65**. Les 6 non tranchés restent comptés comme
non conformes — le taux publié est un **plancher**.

> ## Taux de conformité : **78,5 %** (51 sur 65)
> ### Mention RGAA : **partiellement conforme**

| Étape | Conformes | Taux |
|---|---|---|
| Avant l'audit | *non mesuré* | — |
| Première et deuxième passe | 37 | 56,9 % |
| Troisième passe | 48 | 73,8 % |
| **Quatrième passe** | **51** | **78,5 %** |
| Si les 6 non tranchés passent | 57 | 87,7 % |
| Si tout le plan est traité | 65 | 100 % |

### Les 8 non-conformités restantes

| Critères | Chantier | Visible à l'écran ? |
|---|---|---|
| 9.1, 9.3 | Structurer le contenu par des titres et des listes | **oui** |
| 12.1, 12.3, 12.4 | Second système de navigation + page « plan du site » | **oui** |
| 3.2 | Lever les 136 contrastes indéterminés | selon les cas |
| 10.5 | 45 déclarations inline ne posent que le fond **ou** que le texte | non |
| 11.13 | Scinder le champ « e-mail ou téléphone » | **oui** |

### Les 6 critères non tranchés

| Critère | Question | Qui tranche |
|---|---|---|
| 1.3 | Les alternatives des images sont-elles **pertinentes** ? | la mairie |
| 3.1 | Une information est-elle donnée **uniquement par la couleur** ? | la mairie |
| 8.2 | Validité du code selon le validateur du W3C | à brancher en CI |
| 13.3 / 13.4 | Les **PDF du PLUi** sont-ils accessibles ? | la mairie |
| 13.10 | La **carte 3D** impose-t-elle un geste complexe sans alternative ? | la mairie |

## 7. Reproduire cet audit

```bash
cd tests/e2e && npm ci
npx playwright test                 # 260 tests, dont les contrôles axe par écran
```

Les tests d'accessibilité échouent désormais **vraiment** : ils attendent le style
calculé avant de mesurer. Toute régression sur un critère outillable est bloquée en
intégration continue.
