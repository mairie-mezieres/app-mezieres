# Schéma pluriannuel de mise en accessibilité numérique — 2026-2029

**Commune de Mézières-lez-Cléry**
Adopté le : **27 août 2026**
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

- **Référent accessibilité** : **Fabrice Auffret**, joignable par la mairie —
  02 38 45 61 76, 36 rue du Bourg, 45370 Mézières-lez-Cléry.
- **Contact des usagers** : Mairie de Mézières-lez-Cléry, 36 rue du Bourg,
  45370 — 02 38 45 61 76. Toute demande d'alternative reçoit une réponse.
- **Voie de recours** : Défenseur des droits.
- **Ressources techniques** : l'accessibilité est vérifiée à chaque modification
  du code, automatiquement, avant toute mise en ligne :
  - `axe-core` s'exécute sur chaque écran à chaque proposition de modification ;
  - la navigation clavier est verrouillée par des tests dédiés (ADR-0016) ;
  - la taille de texte réellement peinte est mesurée sur le rendu (ADR-0017) ;
  - le **validateur officiel du W3C** contrôle la validité du code à chaque
    modification d'une page et chaque lundi (critère 8.2) ;
  - une régression sur un critère outillable **bloque** la mise en ligne.
- **Compétences** : la commune ne dispose pas d'expert RGAA en interne. Les critères
  relevant du jugement humain (pertinence des alternatives, information portée par la
  seule couleur, provenance des documents publiés, gestes complexes) ne sont pas
  outillables : ils ont été soumis au référent le 27 août 2026 et **se re-vérifient à
  chaque évolution** — nouveau document publié, nouveau geste sur la carte.

## 4. État des lieux au 27 août 2026

Un audit interne outillé des **106 critères** a été mené le 27 août 2026
(`audit-rgaa-2026-08-27.md`), en sept passes. **Il est complet : aucun critère n'est
laissé sans verdict.**

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

**La quatrième a posé les repères de page** — un lecteur d'écran peut enfin sauter
à l'en-tête, au contenu ou au pied — et a corrigé **une erreur de l'audit
lui-même** : le critère 10.8 avait été déclaré non conforme sur la foi d'un
comptage qui ne vérifiait pas si le conteneur incriminé était affiché. Il ne
l'était pas.

**La cinquième a tranché les six derniers critères.** Cinq relevaient du jugement
humain — aucun outil ne dit si une alternative d'image est *pertinente*, ni si un PDF
sort d'un scanner : le **référent accessibilité** y a répondu, et les cinq sont
conformes. Le sixième, la validité du code, n'était pas une question mais une mesure :
le validateur officiel du W3C a relevé **39 erreurs**. Quatre ont été corrigées ;
**33 subsistent**, toutes structurelles. Ce critère est donc **non conforme**, et le
validateur tourne désormais à chaque modification.

**La sixième a levé ces 33 erreurs, et le champ « e-mail ou téléphone ».** Le code
de l'application est **valide à 100 %** selon le validateur du W3C ; le formulaire de
contact demande désormais l'adresse et le numéro séparément, ce qui permet enfin au
navigateur de les pré-remplir. Elle a aussi **corrigé une troisième erreur de mesure
de l'audit** : le critère 10.5 était annoncé à « 45 déclarations », le vrai compte est
d'environ **356 emplacements** — le relevé d'origine ne regardait ni les écrans non
affichés, ni les feuilles de style.

**La septième a donné une structure à l'accueil et lui a ajouté un plan du site.**
L'écran d'accueil ne portait, sur téléphone, **aucun titre** : la navigation par
titres — celle qu'utilise toute personne aveugle pour survoler une page — ne
faisait rien. Le titre du bandeau, qui existait depuis toujours, est désormais
déclaré comme tel ; les sept intitulés de rubrique sont des titres de niveau 2 et
les grilles de tuiles de vraies listes, **sans qu'un pixel de l'écran change**. Un
écran « Plan du site », atteignable depuis le pied de page de chaque écran, apporte
le second chemin de navigation qui manquait sur téléphone.

**Résultat.** Sur 106 critères : **41 non applicables**, donc **65 applicables**.
Parmi eux, **63 conformes** et **2 non conformes** (état v4.93, 28 août 2026).

> **Taux de conformité : 96,9 %** — mention **partiellement conforme**.
>
> Ce taux n'est plus un plancher prudent : chaque critère applicable a été instruit
> jusqu'à un verdict.

## 5. Plan d'action annuel 2026-2027

Les six critères ouverts au moment de la quatrième passe ont été traités : cinq sont
conformes, un — la validité du code — a échoué à la mesure et rejoint le plan
ci-dessous.

### Les 2 non-conformités restantes

| # | Action | Critères | Visible | Échéance |
|---|---|---|---|---|
| 1 | **Lever les 136 contrastes indéterminés** — texte sur dégradé ou sur photo. La plupart sont du texte sur le dégradé du bandeau : un dégradé ayant deux extrémités connues, il suffit de calculer le contraste contre la plus claire. C'est un calcul, pas un jugement. | 3.2 | selon | T1 2027 |
| 2 | **Déclarations de couleur** : environ **356 emplacements** (91 règles CSS, 265 styles en ligne) ne posent que le fond **ou** que le texte. À traiter cas par cas — un texte posé sur un dégradé ne peut pas recevoir de fond plat, et poser `transparent` partout satisferait la lettre du critère sans protéger personne. | 10.5 | non | T2 2027 |

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
