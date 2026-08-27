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

Un audit interne outillé des **106 critères** a été mené le 27 août 2026
(`audit-rgaa-2026-08-27.md`). Il a établi trois choses.

**D'abord que l'instrument de mesure était faussé.** Les contrôles automatiques
mesuraient les écrans pendant leur transition d'ouverture, alors qu'ils étaient
encore invisibles — donc vides pour l'outil. Ils étaient verts sans rien vérifier.
Corrigé, l'instrument a immédiatement révélé que les **douze interrupteurs du
panneau Accessibilité n'avaient aucun nom accessible** : les réglages destinés aux
personnes qui en ont le plus besoin étaient inutilisables au lecteur d'écran. Six
champs de formulaire étaient dans le même cas, et les trente fenêtres de
l'application s'annonçaient toutes « dialogue », sans dire lequel.

**Ensuite un décompte.** Sur 106 critères : **38 non applicables** (l'application
ne contient ni média temporel, ni cadre, ni CAPTCHA), donc **68 applicables**.
Parmi eux, **32 conformes**, **22 non conformes**, et **14 non tranchés**.

**Enfin une conclusion qui commande ce plan.** Le seuil de « partiellement
conforme » est à 50 %, soit **34 critères sur 68**. L'application en compte 32.

> **Il suffit que deux des quatorze critères non tranchés soient conformes** pour
> que la mention change. Le travail restant n'est donc pas de rendre l'application
> accessible : c'est de **finir de la mesurer**.

L'application reste déclarée **non conforme** tant que cette mesure n'est pas
achevée — c'est la mention exacte, et la seule que la loi autorise sans audit
complet. Ce n'est pas un constat d'inaccessibilité ; c'est un constat d'absence de
mesure, et ce schéma en fixe le terme.

## 5. Plan d'action annuel 2026-2027

### Priorité immédiate — finir la mesure (T4 2026)

Ce bloc ne corrige rien : il tranche les 14 critères en suspens, et détermine à lui
seul si la déclaration peut changer de mention.

| # | Action | Critères |
|---|---|---|
| 1 | **Mesures complémentaires** : contraste des composants, balises détournées, information par la forme ou la position, contenus au survol, actions par appui. | 3.3, 8.9, 10.9, 10.10, 10.13, 10.14, 12.11, 13.11 |
| 2 | **Brancher le validateur du W3C** en intégration continue. | 8.2 |
| 3 | **Relecture par la mairie** : pertinence des alternatives d'images, information donnée par la seule couleur, accessibilité des PDF du PLUi, gestes complexes sur la carte 3D. | 1.3, 3.1, 13.3, 13.4, 13.10 |

### Ensuite — monter le taux, par effet sur les habitants

| # | Action | Critères | Échéance |
|---|---|---|---|
| 4 | **Annoncer les messages dynamiques.** Aujourd'hui, un lecteur d'écran ne dit rien quand l'envoi d'un signalement échoue. | 7.5 | T4 2026 |
| 5 | **Signaler les liens qui ouvrent une nouvelle fenêtre** — 7 concernés. | 13.2 | T4 2026 |
| 6 | **Baliser le tableau des horaires** de la mairie (`<caption>`, `<th scope>`). | 5.4 à 5.7 | T4 2026 |
| 7 | **Contrôle de saisie des formulaires** : messages d'erreur reliés au champ, suggestions de correction, `autocomplete` sur les champs d'identité. | 11.10, 11.11, 11.13 | T1 2027 |
| 8 | **Grouper les champs de même nature** (`fieldset` / `legend`). | 11.5 à 11.7 | T1 2027 |
| 9 | **Structurer le contenu par des titres et des listes.** L'accueil ne porte qu'un titre et aucune liste. | 9.1, 9.3 | T1 2027 |
| 10 | **Poser les repères de page** (`<header>`, `<footer>`) et rendre les regroupements contournables. | 9.2, 12.6 | T1 2027 |
| 11 | **Second système de navigation + page « plan du site ».** | 12.1, 12.3, 12.4 | T1 2027 |
| 12 | **Lever les 136 contrastes indéterminés** — texte sur dégradé ou sur photo. | 3.2 | T1 2027 |
| 13 | **Déclarations CSS de couleur** : 45 cas ne posent que le fond ou que le texte. Purger le conteneur `aria-hidden` de son élément focusable. | 10.5, 10.8 | T2 2027 |
| 14 | **Publier le taux** dans la déclaration. | tous | dès le bloc 1 tranché |

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
