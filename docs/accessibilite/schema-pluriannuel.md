# Schéma pluriannuel de mise en accessibilité numérique — 2026-2029

**Commune de Mézières-lez-Cléry**
Adopté le : *(à compléter — date de validation par la mairie)*
Période couverte : **2026 – 2029**

> Document rendu obligatoire par l'article 47 de la loi n° 2005-102 du 11 février
> 2005 et le décret n° 2019-768 du 24 juillet 2019. Il est publié en ligne, comme
> le plan d'action annuel qu'il contient et la déclaration d'accessibilité.

---

## 1. Engagement

La commune de Mézières-lez-Cléry rend ses services numériques accessibles à
toutes et tous, y compris aux personnes en situation de handicap. Cet engagement
porte sur l'application **Mézières Avec Toi (MAT)**, qui est aujourd'hui le
service de communication au public en ligne de la commune : le domaine
`mezieres-lez-clery.fr` la sert directement, l'ancien site n'existe plus.

L'accessibilité n'est pas traitée comme une couche ajoutée en fin de course. MAT
embarque déjà, et depuis sa conception, des réglages que peu de sites communaux
proposent : trois tailles de texte, un mode contraste élevé, un mode adapté au
daltonisme, un espacement des lignes renforcé, des zones tactiles agrandies, la
lecture vocale des actualités, trois thèmes visuels et une aide contextuelle.

Ce schéma organise le passage de cet acquis à une **conformité mesurée**.

## 2. Périmètre

| Service | Adresse | Dans le périmètre |
|---|---|---|
| Application MAT | `https://mezieres-lez-clery.fr` | **oui** |
| Page hors-ligne, aide notifications, kit de réplication, page d'architecture | mêmes domaines | **oui** |
| Tableau de bord d'administration | `admin.html`, accès authentifié | non — usage interne, non ouvert au public |
| Guichet d'urbanisme (GNAU), portail usagers | services de la Communauté de Communes | non — hors compétence communale |

## 3. Organisation et moyens

- **Responsable de l'accessibilité** : *(à désigner — élu ou agent référent)*
- **Contact des usagers** : Mairie de Mézières-lez-Cléry, 36 rue du Bourg,
  45370 — 02 38 45 61 76. Toute demande d'alternative reçoit une réponse.
- **Voie de recours** : Défenseur des droits.
- **Ressources techniques** : l'accessibilité est vérifiée à chaque modification
  du code, automatiquement, avant toute mise en ligne :
  - `axe-core` s'exécute sur chaque écran à chaque proposition de modification ;
  - la navigation clavier est verrouillée par des tests dédiés (ADR-0016) ;
  - la taille de texte réellement peinte est mesurée sur le rendu (ADR-0017) ;
  - une régression sur un critère outillable **bloque** la mise en ligne.
- **Compétences** : la commune ne dispose pas d'expert RGAA en interne. Les
  critères relevant du jugement humain (pertinence des alternatives, cohérence
  des libellés) feront l'objet d'une relecture dédiée, au besoin accompagnée.

## 4. État des lieux au 27 août 2026

Un audit interne outillé a été mené le 27 août 2026
(`audit-rgaa-2026-08-27.md`). Il a établi deux choses.

**D'abord que l'instrument de mesure était faussé.** Les contrôles automatiques
mesuraient les écrans pendant leur transition d'ouverture, alors qu'ils étaient
encore invisibles — donc vides pour l'outil. Ils étaient verts sans rien vérifier.
Corrigé, l'instrument a immédiatement révélé que les **douze interrupteurs du
panneau Accessibilité n'avaient aucun nom accessible** : les réglages destinés aux
personnes qui en ont le plus besoin étaient inutilisables au lecteur d'écran.

**Ensuite huit familles de non-conformités**, dont sept subsistent après les
corrections immédiates. Elles constituent le plan d'action ci-dessous.

L'application est déclarée **non conforme**, ce qui est la mention exacte : aucun
audit complet n'établit encore de taux. Ce n'est pas un constat d'inaccessibilité,
c'est un constat d'absence de mesure — et ce schéma en fixe le terme.

## 5. Plan d'action annuel 2026-2027

Ordonné par effet sur les habitants, pas par facilité.

| # | Action | Critères | Échéance |
|---|---|---|---|
| 1 | **Annoncer les messages dynamiques.** Doter d'une région live les erreurs de chargement, les confirmations d'envoi de signalement ou d'idée, et les réponses de l'assistante MEL. Aujourd'hui, un lecteur d'écran ne dit rien quand un envoi échoue. | 7.5 | T4 2026 |
| 2 | **Traiter les fenêtres modales comme telles.** Les 30 écrans de MAT doivent porter `role="dialog"`, un nom accessible, un focus piégé et rendu à l'ouvrant à la fermeture. | 7.1, 12.9 | T4 2026 |
| 3 | **Structurer le contenu par des titres.** L'accueil ne porte qu'un `<h1>` ; toute la hiérarchie est faite de `<div>` stylés. Reprendre la structure des écrans les plus consultés en premier. | 9.1 | T1 2027 |
| 4 | **Signaler les ouvertures de nouvelle fenêtre.** 7 liens concernés, aucun ne le dit. | 13.2 | T4 2026 |
| 5 | **Poser les repères de page** (`<header>`, `<footer>`) sur l'accueil, `offline.html` et `architecture.html`. | 9.2 | T1 2027 |
| 6 | **Trancher le cas du tableau des horaires** : tableau de données (`<caption>` + `<th scope>`) ou de mise en forme (`role="presentation"`). | 5.3 à 5.8 | T4 2026 |
| 7 | **Lever les 136 contrastes indéterminés** — texte sur dégradé ou sur image, que l'outil ne sait pas calculer. Vérification manuelle, écran par écran. | 3.2, 3.3 | T1 2027 |
| 8 | **Relire les alternatives textuelles.** Aucun outil ne juge la pertinence d'un `alt` : relecture humaine. | 1.1 à 1.9 | T1 2027 |
| 9 | **Audit complet des 106 critères et publication du taux.** Une fois 1 à 8 traités. | tous | T2 2027 |

## 6. Années suivantes

- **2027-2028** — Maintenir le taux atteint. Étendre le contrôle automatique aux
  critères aujourd'hui hors de sa portée (structure de titres, régions live).
  Envisager un audit externe pour confirmer le taux interne.
- **2028-2029** — Réexaminer l'échantillon à mesure que le service évolue.
  Recueillir l'avis d'usagers en situation de handicap, que ce schéma ne remplace
  pas : aucun référentiel ne dit ce qu'un habitant vit réellement.

## 7. Suivi

- Ce schéma et son plan d'action sont **publiés dans l'application**, écran
  Accessibilité, à côté de la déclaration.
- Le plan d'action est **révisé chaque année**.
- La déclaration d'accessibilité est mise à jour à chaque évolution du taux.
- Les demandes des habitants sont traitées par la mairie et alimentent le plan.
