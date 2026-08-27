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

## 3. Les 106 critères

`C` conforme · `NC` non conforme · `NA` non applicable · `?` non tranché

| Thème | Critères | Verdicts |
|---|---|---|
| **1. Images** (9) | 1.1 `C` · 1.2 `C` · 1.3 `?` · 1.4 `NA` · 1.5 `NA` · 1.6 `NA` · 1.7 `NA` · 1.8 `NA` · 1.9 `NA` | Deux images porteuses d'information, toutes deux avec `alt` ; une image décorative en `alt=""`. Aucun CAPTCHA, aucune image-texte, aucune image complexe, aucun SVG. |
| **2. Cadres** (2) | 2.1 `NA` · 2.2 `NA` | Aucun `<iframe>` dans l'échantillon. |
| **3. Couleurs** (3) | 3.1 `?` · 3.2 `NC` · 3.3 `?` | 3.2 : les contrastes calculables sont corrigés, mais **136 nœuds restent indéterminés** (texte sur dégradé ou sur photo). |
| **4. Multimédia** (13) | 4.1 à 4.13 `NA` | Aucun média temporel : ni audio, ni vidéo, ni animation synchronisée. |
| **5. Tableaux** (8) | 5.1 `NA` · 5.2 `NA` · 5.3 `NA` · 5.4 `NC` · 5.5 `NC` · 5.6 `NC` · 5.7 `NC` · 5.8 `NA` | Un tableau de données — les horaires de la mairie, 5 lignes — sans `<caption>`, sans `<th>`, sans `scope`. |
| **6. Liens** (2) | 6.1 `C` · 6.2 `C` | Aucun lien sans intitulé, aucun libellé non explicite (« ici », « en savoir plus »…). |
| **7. Scripts** (5) | 7.1 `C` · 7.2 `NA` · 7.3 `C` · 7.4 `C` · 7.5 `NC` | 7.5 : **aucune région live**. Erreurs de chargement, confirmations d'envoi et réponses de MEL ne sont pas annoncées. |
| **8. Éléments obligatoires** (10) | 8.1 `C` · 8.2 `?` · 8.3 `C` · 8.4 `C` · 8.5 `C` · 8.6 `C` · 8.7 `NA` · 8.8 `NA` · 8.9 `?` · 8.10 `NA` | `DOCTYPE`, `lang="fr"`, titre pertinent, 108 `id` tous uniques. 8.2 demande le validateur du W3C, inaccessible depuis l'environnement d'audit. |
| **9. Structuration** (4) | 9.1 `NC` · 9.2 `NC` · 9.3 `NC` · 9.4 `NA` | L'accueil ne porte **qu'un titre** et **aucune liste** ; `<header>` et `<footer>` absents ; 7 « fausses listes » sur `partager.html`. |
| **10. Présentation** (14) | 10.1 `C` · 10.2 `C` · 10.3 `C` · 10.4 `C` · 10.5 `NC` · 10.6 `C` · 10.7 `C` · 10.8 `NC` · 10.9 `?` · 10.10 `?` · 10.11 `C` · 10.12 `C` · 10.13 `?` · 10.14 `?` | Sans CSS, 4 431 caractères restent lisibles et ordonnés. Zoom 200 % et largeur 320 px : aucun débordement. Espacement du texte forcé : aucun élément tronqué. 10.5 : 45 déclarations inline ne posent que le fond **ou** que la couleur du texte. 10.8 : un conteneur `aria-hidden` contient un élément focusable. |
| **11. Formulaires** (13) | 11.1 `C` · 11.2 `C` · 11.3 `C` · 11.4 `C` · 11.5 `NC` · 11.6 `NC` · 11.7 `NC` · 11.8 `NA` · 11.9 `C` · 11.10 `NC` · 11.11 `NC` · 11.12 `NA` · 11.13 `NC` | Étiquetage corrigé. Restent : aucun `fieldset`/`legend` sur le groupe de cases de `partager.html`, aucun contrôle de saisie ni message d'erreur structuré, aucun `autocomplete` sur les champs d'identité. |
| **12. Navigation** (11) | 12.1 `NC` · 12.2 `C` · 12.3 `NC` · 12.4 `NC` · 12.5 `NA` · 12.6 `NC` · 12.7 `C` · 12.8 `C` · 12.9 `C` · 12.10 `NA` · 12.11 `?` | Lien d'évitement présent, ordre de tabulation cohérent, aucun piège au clavier, Échap ferme. Manquent un **second système de navigation** et une **page « plan du site »**. |
| **13. Consultation** (12) | 13.1 `NA` · 13.2 `NC` · 13.3 `?` · 13.4 `?` · 13.5 `NA` · 13.6 `NA` · 13.7 `C` · 13.8 `C` · 13.9 `C` · 13.10 `?` · 13.11 `?` · 13.12 `NA` | 13.2 : **7 liens** ouvrent une nouvelle fenêtre sans le signaler. 13.8 conforme : `prefers-reduced-motion: reduce` neutralise toutes les animations. |

### Décompte

| | Nombre |
|---|---|
| Conformes | **32** |
| Non conformes | **22** |
| Non applicables | **38** |
| **Non tranchés** | **14** |
| Total | **106** |

## 4. Le taux dépend de 14 critères — et il en faut deux

Le taux RGAA est le rapport des critères conformes aux critères **applicables** :
106 − 38 = **68 critères applicables**.

| Hypothèse sur les 14 non tranchés | Taux | Mention |
|---|---|---|
| Tous non conformes (plancher) | 32/68 = **47,1 %** | non conforme |
| **Seuil des 50 %** | **34/68** | |
| Tous conformes (plafond) | 46/68 = **67,6 %** | partiellement conforme |

**Il suffit que 2 des 14 critères non tranchés soient conformes** pour que
l'application passe la barre et que la déclaration devienne « **partiellement
conforme** », avec son pourcentage.

Autrement dit : le travail restant n'est pas de rendre l'application accessible,
c'est de **finir de la mesurer**.

### Les 14, et qui peut les trancher

**Résolubles par des mesures complémentaires** (8) — ne demandent personne :

| Critère | Question |
|---|---|
| 3.3 | Contraste des composants d'interface (bordures de champs, états actifs). |
| 8.9 | Des balises sont-elles détournées à des fins de présentation ? |
| 10.9 / 10.10 | Une information est-elle donnée uniquement par la forme, la taille ou la position ? |
| 10.13 / 10.14 | Les contenus additionnels au survol sont-ils contrôlables et fermables ? |
| 12.11 | Ces mêmes contenus sont-ils atteignables au clavier ? |
| 13.11 | Les actions déclenchées par appui sont-elles annulables ? |

**Demande un accès réseau** (1) :

| Critère | Question |
|---|---|
| 8.2 | Validité du code selon le validateur du W3C — à brancher en intégration continue. |

**Demandent un jugement humain** (5) — personne d'autre que la mairie :

| Critère | Question |
|---|---|
| 1.3 | Les alternatives des images sont-elles **pertinentes** ? Le blason est décrit « Mézières », l'avatar de l'assistante « MEL ». Est-ce ce qu'il faut entendre ? |
| 3.1 | Une information est-elle donnée **uniquement par la couleur** quelque part — pastilles de statut, zonage du PLU, niveaux de vigilance ? |
| 13.3 / 13.4 | Les **PDF du PLUi** publiés depuis l'administration sont-ils accessibles, ou une version accessible existe-t-elle ? La mairie sait d'où ils viennent ; l'audit ne peut pas le deviner. |
| 13.10 | La **carte 3D** impose-t-elle un geste complexe (pincer, tourner à deux doigts) sans solution de remplacement ? |

## 5. Reproduire cet audit

```bash
cd tests/e2e && npm ci
npx playwright test                 # 260 tests, dont les contrôles axe par écran
```

Les tests d'accessibilité échouent désormais **vraiment** : ils attendent le style
calculé avant de mesurer. Toute régression sur un critère outillable est bloquée en
intégration continue.
