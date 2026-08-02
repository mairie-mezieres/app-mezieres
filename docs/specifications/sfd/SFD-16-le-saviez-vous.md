# SFD-16 — « Le saviez-vous ? »

> [Référentiel](../README.md) · [SFG](../SFG-specifications-generales.md) · Processus : **Le saviez-vous ?**

## 1. Objectif

Donner à l'habitant une raison d'ouvrir l'application **chaque jour**, et de quoi en
parler avec ses voisins : un fait vérifiable sur la commune, posé sous forme de
question à laquelle on répond, dont la révélation cite systématiquement **sa source**.

Le contenu est **entièrement pré-rédigé et relu**. Aucune intelligence artificielle
n'intervient au moment de l'affichage — voir [ADR-0012](../../adr/0012-saviez-vous-corpus-verifie-sans-ia-a-l-execution.md).

## 2. Acteurs concernés

- **Citoyen** : ouvre la ligne, répond, découvre le fait et sa source.
- **Administrateur** : enrichit le corpus (entrées et sources).
- **Système** : sélectionne le fait du jour, agrège la répartition des réponses.

## 3. User stories

- **US-16.1** — En tant que citoyen, je veux découvrir chaque jour un fait sur ma commune afin d'apprendre quelque chose en ouvrant l'application.
- **US-16.2** — En tant que citoyen, je veux répondre par oui ou par non avant de connaître la réponse afin que ce soit un jeu et non une leçon.
- **US-16.3** — En tant que citoyen, je veux voir **d'où vient l'information** afin de pouvoir la vérifier moi-même.
- **US-16.4** — En tant que citoyen, je veux savoir combien d'habitants ont répondu comme moi afin de me situer.
- **US-16.5** — En tant que citoyen, je ne veux pas que cette rubrique encombre mon écran d'accueil.
- **US-16.6** — En tant qu'administrateur, je veux ajouter des faits sur la commune sans passer par un développeur.
- **US-16.7** — En tant qu'administrateur, je veux **relire tout le corpus avant sa mise en ligne**, en sachant quel jour chaque question passera, afin de valider les réponses et leurs sources plutôt que de les découvrir en production.

## 4. Critères d'acceptation (Gherkin)

### US-16.1 — Le fait du jour

```gherkin
Étant donné que j'ouvre l'application
Quand l'écran d'accueil s'affiche
Alors une ligne « 🤔 Le saviez-vous ? » apparaît sous les boutons Urgences et Personnalisation
Et elle est repliée

Étant donné que deux habitants ouvrent l'application le même jour
Quand ils déplient la rubrique
Alors ils voient exactement la même question
```

### US-16.2 — Répondre

```gherkin
Étant donné que la rubrique est dépliée et que je n'ai pas encore répondu aujourd'hui
Quand je lis la question
Alors deux boutons « Oui » et « Non » me sont proposés
Et aucune réponse n'est visible

Quand je choisis une réponse
Alors la bonne réponse s'affiche, accompagnée de son explication
Et les boutons disparaissent

Étant donné que j'ai déjà répondu aujourd'hui
Quand je rouvre l'application et déplie la rubrique
Alors la réponse est directement visible
Et je ne peux pas rejouer
```

### US-16.3 — La source

```gherkin
Étant donné qu'une réponse est révélée
Alors la source de l'information est affichée
Et lorsqu'une adresse web est renseignée, la source est un lien qui s'ouvre dans un nouvel onglet
```

### US-16.4 — La répartition

```gherkin
Étant donné que j'ai répondu et que le service est joignable
Et qu'au moins cinq habitants ont déjà répondu à ce fait
Alors la part d'habitants ayant répondu comme moi s'affiche

Étant donné que je suis hors ligne
Quand je réponds
Alors la réponse et sa source s'affichent normalement
Et aucun pourcentage n'est affiché
```

### US-16.5 — L'encombrement

```gherkin
Étant donné que la rubrique est repliée
Alors elle occupe une seule ligne

Étant donné que j'ai masqué l'en-tête dans Personnalisation
Alors la rubrique n'est pas affichée
```

### US-16.7 — Relire le corpus avant publication

```gherkin
Étant donné que j'ouvre la page de revue « saviez-vous.html »
Alors le corpus complet s'affiche dans l'ordre réel de passage
Et chaque entrée indique le jour et la date auxquels elle sera affichée
Et sa question, sa réponse, son explication et sa source

Étant donné qu'une entrée est mal formée ou non sourcée
Alors elle est signalée comme anomalie bloquante
Et je peux filtrer la liste sur les seules anomalies

Étant donné qu'une entrée est sourcée mais sans adresse web
Alors elle est signalée comme avertissement, sans bloquer
```

## 5. Règles de gestion

- **RG-16.1 — Aucune IA à l'exécution.** Le fait affiché provient du corpus versionné
  `data/saviez-vous.json` ou d'un générateur d'arithmétique pure. Aucun appel à un
  modèle de langage n'a lieu au moment de l'affichage.
- **RG-16.2 — Toute entrée porte une source.** Une entrée sans source ne peut pas
  entrer dans le corpus ; l'intégration continue la rejette.
- **RG-16.3 — Jamais d'affirmation fausse à l'écran.** Le corpus ne contient que des
  **questions** ; seule la révélation porte du contenu factuel. Une question se termine
  toujours par un point d'interrogation, ce qui est vérifié automatiquement.
- **RG-16.4 — Rotation déterministe.** Le fait du jour est fonction du nombre de jours
  écoulés depuis la mise en service (ancré sur Paris) et de l'ordre du corpus. Tous les
  habitants voient le même fait le même jour.
- **RG-16.5 — L'ordre est éditorial.** Les catégories passent à tour de rôle, du plus
  surprenant au plus aride : deux questions d'urbanisme ne peuvent pas se suivre tant
  qu'il reste de la matière ailleurs. À l'intérieur d'une catégorie, l'ordre est celui de
  déclaration du corpus — aucun hasard, pour que la mairie sache ce qui passera quand.
- **RG-16.6 — L'origine et la graine ne changent plus.** Les modifier ferait rejouer des
  faits déjà vus et en sauterait d'autres.
- **RG-16.7 — Une seule réponse par appareil et par fait**, sans retour arrière. La
  répartition doit refléter les premières intuitions, pas un vote corrigé après lecture
  de la réponse. Déduplication par `deviceId` (RG-T-6 du SFG).
- **RG-16.8 — Pas de pourcentage sous cinq réponses.** En deçà, une proportion n'a pas
  de sens et serait trompeuse.
- **RG-16.9 — Le pourcentage est facultatif.** S'il n'est pas disponible, il n'est pas
  affiché — jamais remplacé par « 0 % » (RG-T-3 du SFG : ne jamais afficher une donnée
  erronée).
- **RG-16.10 — Repliée par défaut.** L'ouverture est un geste volontaire ; rien
  d'agréable-mais-facultatif ne se place au-dessus du bouton Urgences.
- **RG-16.11 — Aucune donnée personnelle.** Ni la question, ni la réponse, ni la
  navigation ne sont rattachées à une identité : seul l'identifiant technique
  d'appareil sert à la déduplication.
- **RG-16.12 — Le corpus est relu AVANT la fusion**, sur la page `saviez-vous.html`,
  qui en donne l'ordre de passage daté. La relecture porte sur ce qu'aucun test ne
  peut vérifier : la réponse est-elle vraie ? La page rejoue l'ordre avec le code de
  l'application, jamais avec une copie.

## 6. Données manipulées

| Donnée | Emplacement | Contenu |
|---|---|---|
| Corpus | `data/saviez-vous.json` (dépôt, précaché) | `id`, `question`, `reponse` (booléen), `explication`, `source`, `url`, `categorie` |
| Entrées calculées | `js/mat-saviez-vous.js` → `SV_CALCULES` | générateurs purs (distances, jours fériés) |
| Page de revue | `saviez-vous.html` (interne, non précachée) | corpus daté, ordre de passage, anomalies |
| Réponse du jour | `localStorage` → `mat_sv_v1` | `{ jour, id, reponse }` |
| Déduplication | Redis → `mat:sv:votants:{id}` | ensemble de `deviceId` |
| Répartition | Redis → `mat:sv:count:{id}` | `{ oui, non }` |

## 7. Intégrations & dépendances

- **Aucune API externe.** La rubrique fonctionne intégralement hors ligne, à
  l'exception du pourcentage de répartition.
- **Backend MAT** : `GET /saviezvous/:id` et `POST /saviezvous/:id`
  (cf. [STD-04](../../specifications-techniques/STD-04-contributions-citoyennes.md)).
- **`js/mat-jours-feries.js`** pour l'entrée calculée sur les jours fériés.

## 8. Cas limites & mode dégradé

| Situation | Comportement attendu |
|---|---|
| Corpus indisponible | La ligne ne s'affiche pas du tout — pas de rubrique vide |
| Backend injoignable | Question, réponse et source normales ; pas de pourcentage |
| Moins de cinq réponses enregistrées | Pas de pourcentage |
| Entrée calculée non résoluble | Passage déterministe à l'entrée suivante, jamais au hasard |
| En-tête masqué (`Personnalisation`) | Rubrique masquée avec le reste du bandeau |
| Quota Redis dépassé (429) | Réponse acceptée côté affichage, répartition indisponible |

## 9. Exigences de conformité spécifiques

- **RGPD** — aucune donnée personnelle collectée. La réponse est rattachée au seul
  identifiant technique d'appareil, comme les votes d'idées et les RSVP.
- **Accessibilité (RGAA 4 / WCAG 2.1 AA)** — la ligne est un bouton avec
  `aria-expanded`, les réponses sont de vrais boutons, et la révélation est annoncée
  dans une région `role="status" aria-live="polite"`. Vérifié automatiquement par
  axe-core sur les deux profils, mobile et bureau.
- **Transparence** — la source affichée permet à l'habitant de vérifier l'information
  par lui-même, ce qui est la contrepartie de la confiance accordée à une publication
  municipale.
