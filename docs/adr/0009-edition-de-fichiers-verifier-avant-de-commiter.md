# ADR-0009 — Édition de fichiers : vérifier la taille avant de commiter

- **Statut** : accepté
- **Date** : 2026-08-01
- **Contexte technique** : outillage / process de contribution

## Contexte

Le 1ᵉʳ août 2026, les déploiements GitHub Pages du dépôt sont passés d'environ
**48 secondes à plus de 20 minutes**, bloqués sur l'étape « Build with Jekyll ».
Le symptôme est apparu au commit `3a6bd16` (v4.52) et s'est aggravé en v4.52.1.

La cause n'était pas GitHub, mais le dépôt lui-même : `docs/guide-technique.md`
était passé de **41 Ko à 85 Mo** — 1 423 125 lignes. GitHub Pages fait tourner
Jekyll sur le dépôt à chaque déploiement, et Jekyll traite les fichiers markdown.

### Mécanisme

Le fichier avait été modifié par un script de substitution dont le motif matchait
la **chaîne vide**. En Python comme en `sed`, une substitution dont le motif peut
matcher une position vide s'applique **entre chaque caractère** de la chaîne. Le
bloc de remplacement a donc été inséré 39 508 fois — exactement le nombre de
caractères du fichier d'origine.

Le contenu réel avait entièrement disparu : sur 1,4 million de lignes, il ne
restait que **173 lignes uniques** et **plus aucun titre de section**.

### Pourquoi ça n'a pas été vu

Trois défaillances qui se sont enchaînées, chacune suffisante à elle seule :

1. Le fichier **n'a jamais été rouvert** après modification. Le script s'était
   terminé sans erreur, ce qui a été pris à tort pour une preuve de succès.
2. `git add -A` a été utilisé sans regarder ce qui partait. **`git add` ne dit
   rien de la taille de ce qu'il ajoute.**
3. Le diff n'a pas été inspecté avant commit — `git diff --stat --cached` aurait
   affiché plus d'un million de lignes ajoutées sur un fichier de documentation.

L'erreur a survécu à **deux versions** et deux passages en CI, parce qu'aucun
contrôle automatisé ne portait sur la taille des fichiers : la CI vérifie la
syntaxe JS et le comportement de l'UI, pas le volume de la documentation.

## Décision

**Privilégier l'édition ciblée** (outil `Edit`, qui échoue proprement si le motif
est absent ou ambigu) plutôt que la substitution par script sur fichier entier.

Quand une substitution scriptée est malgré tout nécessaire :

- vérifier que le motif **ne peut pas matcher la chaîne vide** — attention à `*`,
  `?`, `{0,n}` et aux alternances comportant une branche vide ;
- contrôler le résultat **avant de commiter** :
  ```bash
  ls -la <fichier> && wc -l <fichier>
  git diff --stat --cached
  ```
- toute variation de taille sans rapport avec l'ampleur du changement est un
  signal d'arrêt, pas une curiosité.

Ces règles sont inscrites dans `CLAUDE.md` (chargé automatiquement à chaque
session) plutôt que dans ce seul ADR, afin qu'elles soient présentes au moment où
l'erreur peut être commise.

## Conséquences

**Positives**

- Le mode de défaillance est documenté à l'endroit où il sera relu.
- Le contrôle proposé (`ls -la` + `wc -l` + `git diff --stat --cached`) coûte
  quelques secondes et détecte toute la classe de bugs « le script a produit
  autre chose que ce que je croyais », pas seulement la substitution vide.

**Négatives / limites**

- Ce sont des règles de discipline, pas un garde-fou automatique. Elles reposent
  sur leur application effective.
- Un contrôle automatisé (job CI refusant un fichier `.md` au-delà d'un seuil,
  ou un hook pre-commit) serait plus robuste. Il n'est pas mis en place ici pour
  ne pas ajouter de friction à un dépôt maintenu par une petite équipe, mais
  reste la suite logique si l'incident se reproduit.

## Alternatives écartées

- **Retirer `docs/` du build Jekyll** (via `_config.yml` ou `.nojekyll`) :
  traiterait le symptôme — la lenteur du déploiement — mais laisserait un fichier
  corrompu et illisible dans le dépôt. Le problème n'était pas Jekyll.
- **Interdire toute édition scriptée** : trop rigide ; les substitutions de masse
  restent utiles et légitimes sur des changements répétitifs.
