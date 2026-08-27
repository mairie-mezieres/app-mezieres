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
(`audit-rgaa-2026-08-27.md`), en trois passes.

**La première a montré que l'instrument de mesure était faussé.** Les contrôles
automatiques mesuraient les écrans pendant leur transition d'ouverture, alors
qu'ils étaient encore invisibles — donc vides pour l'outil. Ils étaient verts sans
rien vérifier. Corrigé, l'instrument a révélé que les **douze interrupteurs du
panneau Accessibilité n'avaient aucun nom annoncé**, que six champs de formulaire
étaient dans le même cas, et que les trente fenêtres s'annonçaient toutes
« dialogue » sans dire laquelle.

**La deuxième a tranché les critères outillables** et trouvé que les bordures des
champs de saisie ne faisaient que **1,17:1** — un minimum de 3 étant requis. Les
réglages destinés aux personnes qui voient mal étaient, eux aussi, à peine
visibles.

**La troisième a levé onze non-conformités** dont le code change sans que l'écran
bouge : régions live pour les messages dynamiques, erreurs de saisie rattachées au
champ fautif, groupement des champs de même nature, balisage du tableau des
horaires, mention des liens ouvrant une nouvelle fenêtre.

**Résultat.** Sur 106 critères : **41 non applicables**, donc **65 applicables**.
Parmi eux, **48 conformes**, **11 non conformes**, **6 non tranchés**.

> **Taux de conformité : 73,8 %** — mention **partiellement conforme**.
>
> Les 6 critères non tranchés restent comptés comme non conformes : le taux publié
> est un **plancher**, qui ne peut que monter.

## 5. Plan d'action annuel 2026-2027

### D'abord — les 6 critères encore ouverts (T4 2026)

Chacun fait monter le taux sans qu'aucune ligne de code ne change.

| # | Action | Critères | Qui |
|---|---|---|---|
| 1 | **Relecture par la mairie** : pertinence des alternatives d'images, information donnée par la seule couleur, accessibilité des PDF du PLUi, gestes complexes sur la carte 3D. | 1.3, 3.1, 13.3, 13.4, 13.10 | la mairie |
| 2 | **Brancher le validateur du W3C** en intégration continue. | 8.2 | technique |

Ces deux points portent le taux à **83,1 %**.

### Ensuite — les 11 non-conformités restantes

| # | Action | Critères | Visible | Échéance |
|---|---|---|---|---|
| 3 | **Structurer le contenu par des titres et des listes.** L'accueil ne porte qu'un titre et aucune liste : la navigation par titres est impossible. | 9.1, 9.3 | **oui** | T1 2027 |
| 4 | **Poser les repères de page** et rendre les regroupements contournables. | 9.2, 12.6 | non | T1 2027 |
| 5 | **Second système de navigation + page « plan du site ».** | 12.1, 12.3, 12.4 | **oui** | T1 2027 |
| 6 | **Lever les 136 contrastes indéterminés** — texte sur dégradé ou sur photo, à juger à l'œil. | 3.2 | selon | T1 2027 |
| 7 | **Scinder le champ « e-mail ou téléphone »** du formulaire de contact : aucun jeton `autocomplete` ne couvre les deux à la fois. | 11.13 | **oui** | 2027 |
| 8 | **Déclarations CSS de couleur** (45 cas ne posent que le fond ou que le texte) et conteneur `aria-hidden` contenant un focusable. | 10.5, 10.8 | non | T2 2027 |

Traiter l'ensemble porte le taux à **100 %**.

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
