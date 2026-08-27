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

## 2. Résultat

### Corrections appliquées pendant l'audit

| Critère | Défaut | Correctif |
|---|---|---|
| **11.1** | 12 interrupteurs du panneau Accessibilité sans nom accessible (9 visibles simultanément, *critical*) | `aria-labelledby` vers le libellé visible |
| **3.2** | Bouton d'urgence **Pompiers 18** : blanc sur `#ea580c` = **3,55:1** | `#c2410c` = **5,18:1** |
| **3.2** | Intitulés de rubrique `--sage` `#52b788` sur blanc = **2,47:1** (Numéros utiles, documents, widgets, liens MEL) | jeton `--sage-ink` `#2d6a4f` = **6,39:1** |
| **3.2** | `offline.html` : texte `#52b788` (2,47:1) et `#aaa` (2,32:1) sur blanc | `#2d6a4f` (6,39:1) et `#6b7280` (4,83:1) |
| **3.2** | `architecture.html` : 26 nœuds, gris sur fond sombre jusqu'à **1,22:1** | palette relevée à `#94a3b8` / `#a3b1c2` (≥ 5,7:1) |
| **3.2** | Messages d'erreur `#dc2626` sur crème `#f4f0ea` = **4,25:1** | `#b91c1c` = **5,70:1** |
| **9.1** | `partager.html` sans aucun `<h1>` | titre visuel promu en `<h1>` (rendu inchangé) |
| **10.6** | Lien d'attribution Leaflet : 2,55:1 avec le texte voisin, aucune distinction non colorimétrique | souligné — avec la spécificité nécessaire pour battre `leaflet.css`, injecté après |

**Après correction : zéro violation axe** (WCAG 2.1 A/AA) sur les 6 pages et
21 écrans mesurés.

### Non-conformités restantes

| Critère | Constat | Effort |
|---|---|---|
| **9.1** | La page d'accueil ne porte **qu'un seul titre** (`<h1>`). Tout le reste est structuré par des `<div>` stylés. Le contenu n'est pas navigable par titres. | élevé |
| **9.2** | Repères manquants : `<header>` et `<footer>` absents de l'accueil ; `offline.html` et `architecture.html` n'ont aucun repère. | moyen |
| **13.2** | **7 liens** ouvrent une nouvelle fenêtre, **aucun** ne le signale. | faible |
| **7.5** | **Aucune** région live (`aria-live`, `role="status"`, `role="alert"`). Les messages dynamiques — erreurs de chargement, confirmations d'envoi, réponses de MEL — ne sont pas annoncés. | moyen |
| **7.1 / 12.9** | **30 écrans** de type fenêtre modale pour **un seul** `role="dialog"`. Ouverture et fermeture ne sont pas annoncées, le focus n'est pas piégé. | moyen |
| **5.x** | Un `<table class="d-horaires">` sans `<caption>` ni `<th>`. Tableau de données ou de mise en forme : à trancher, puis baliser ou neutraliser (`role="presentation"`). | faible |
| **3.2** | **136 nœuds** en statut « incomplet » chez axe : texte sur dégradé ou image, contraste non calculable automatiquement. À vérifier à la main. | moyen |
| **1.x** | Pertinence des alternatives textuelles : 4 images portent un `alt` rempli, 1 un `alt=""`. Le **caractère pertinent** du texte relève du jugement humain et n'a pas été validé. | faible |

### Points déjà conformes et vérifiés

`DOCTYPE` présent · `lang="fr"` · titre de page présent et pertinent · aucun
`meta refresh` · aucun `tabindex` positif · aucun `accesskey` · aucun contenu
clignotant · lien d'évitement « Aller au contenu principal » présent · `<main>` et
`<nav>` présents · **reflow à 320 px sans défilement horizontal** · zoom non
bloqué (`viewport` sans `user-scalable=no`) · aucun bouton sans nom accessible
(36 vérifiés) · aucun libellé de lien non explicite (« ici », « en savoir plus »…)
· aucun média audio ou vidéo (thématique 4 sans objet) · aucun cadre `<iframe>`
dans l'échantillon mesuré · navigation clavier complète et focus visible, y
compris en contraste élevé et thème sombre (verrouillée par
`tests/e2e/accessibilite-clavier.spec.js`, ADR-0016) · plancher typographique de
12 px mesuré sur le rendu (ADR-0017).

---

## 3. Taux de conformité — pourquoi il n'est pas encore publié

Le taux RGAA est le rapport des critères conformes aux critères **applicables**.
Cet audit établit les constats ci-dessus, mais **ne publie pas de pourcentage**, et
c'est délibéré :

1. **Huit familles de non-conformités restent ouvertes**, dont deux structurantes
   (titres, régions live) qui touchent un grand nombre de critères par ricochet.
2. **136 nœuds de contraste sont indéterminés.** Tant qu'ils ne sont pas tranchés,
   le critère 3.2 ne peut être déclaré ni conforme ni non conforme.
3. **La pertinence des alternatives textuelles et des libellés relève du jugement
   humain.** Aucun outil ne la mesure, et cet audit ne l'a pas validée.

Publier un pourcentage aujourd'hui reviendrait à faire exactement ce que le RGAA
interdit : afficher un niveau de conformité que rien n'établit. **La déclaration
reste donc « non conforme »** — mention exacte, et seule mention légale possible
en l'absence d'audit complet.

Le taux sera calculé et publié à l'achèvement du **plan d'action 2026-2027**
(`schema-pluriannuel.md`), qui traite les huit familles ci-dessus dans l'ordre de
leur effet sur les habitants.

---

## 4. Reproduire cet audit

```bash
cd tests/e2e && npm ci
npx playwright test                 # 260 tests, dont les contrôles axe par écran
```

Les tests d'accessibilité échouent désormais **vraiment** : ils attendent le style
calculé avant de mesurer. Toute régression sur un critère outillable est bloquée en
intégration continue.
