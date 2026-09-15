# ADR-0043 — Suivi du dépôt : agir selon qui tient la PR

- **Date** : 15 septembre 2026
- **Statut** : Accepté
- **Complète** : ADR-0042 (suivi de la veille), dont il reprend les mécanismes pour
  un périmètre plus large

## Contexte

L'ADR-0042 a donné un gardien aux issues et aux PR **de la veille**. Tout le reste
n'en a pas : les PR de Dependabot, celles d'un agent, celles d'un humain, et les
issues ouvertes à la main. Entre deux passages du mainteneur — une commune de moins
de 1 000 habitants, un porteur — personne ne les regarde.

Les deux pannes concrètes, et elles sont silencieuses :

1. **Une PR Dependabot dont la CI est rouge.** Rien ne le dit hors de la page de la
   PR. Elle finit fusionnée sans qu'on ait vu le rouge, ou elle dort. Or une mise à
   jour de dépendance qui casse les tests est exactement celle qu'il faut regarder :
   la fermer sans instruire, c'est conserver la version vulnérable.
2. **Une PR en conflit avec `main`.** GitHub ne prévient pas l'auteur : l'état
   apparaît sur la page, et nulle part ailleurs.

## La question qui décide de tout : jusqu'où commenter ?

La tentation est d'écrire partout — c'est facile, et ça donne l'impression d'un
dépôt suivi. C'est l'erreur. Un robot qui commente sur la PR d'un humain pour lui
apprendre ce que GitHub lui affiche déjà en rouge est du **bruit**, et le bruit fait
qu'on cesse de lire le canal. Le dépôt en a déjà fait l'expérience côté liens morts :
deux issues identiques à un jour d'intervalle (#176 et #181) ont suffi à rendre le
signal suspect.

## Décision

Un workflow séparé, `.github/workflows/suivi-depot.yml`, et un script sans
dépendance, `scripts/suivi-depot.js`.

### 1. Le canal par défaut est le résumé du run, pas le commentaire

Chaque exécution écrit dans l'onglet « Summary » un tableau de **toutes** les PR
ouvertes (origine, état de CI, fusionnabilité, inactivité) et de toutes les issues
suivies. Le commentaire est l'**exception**, réservé à ce qui est actionnable.

### 2. Plus une PR est « à nous », plus on agit

| Origine | Ce que fait le suivi |
|---|---|
| PR de la **veille** (`claude/veille-…`) | **Rien** — elle a son canal (`veille-suivi.yml`). Deux canaux, c'est deux commentaires pour un même fait. |
| PR **automatique** (Dependabot, agent) | Commentaire si conflit ou CI rouge ; relance unique après 14 jours d'inactivité. |
| PR **humaine** | **Aucun commentaire, jamais.** Elle figure au résumé. |

Le doute profite à l'humain : une branche dont le préfixe n'est pas reconnu est
classée « humaine », donc jamais commentée.

### 3. Aucune fermeture, jamais

L'ADR-0042 referme les brouillons de veille au-delà de 60 jours, parce que la branche
reste et que l'action ne reviendra pas. Ici, non : fermer la PR d'un robot, c'est
perdre la mise à jour qu'il proposait — et il la rouvrira au passage suivant. Fermer
celle d'un humain ne se discute même pas. Le workflow n'a d'ailleurs que
`contents: read` : il ne pousse rien.

### 4. Les issues qui ont déjà un gardien sont écartées

L'issue **`liens-morts`** est mise à jour *et refermée* par son propre workflow quand
le scan repasse au vert ; un rappel posté ici lui survivrait. Les issues
**« 🔭 Actions PWA »** appartiennent à l'étage 3. Le rappel d'ancienneté sur les
autres issues existe mais est **désactivé par défaut** (`SUIVI_ISSUE_RAPPEL_JOURS=0`) :
on ne relance pas quelqu'un sur une issue qu'il a écrite lui-même, sauf à le demander.

### 5. Il lit la CI, il ne la rejoue pas

Contrairement aux PR de la veille — ouvertes par le `GITHUB_TOKEN`, donc sans
workflow déclenché (ADR-0023 §5) — ces PR-là font tourner la CI normalement. Le
script **lit** les verdicts.

⚠️ Il en lit **deux** sources, et il faut les deux : les *check runs* (les jobs
GitHub Actions) et les *commit statuses* de l'API. C'est par ce second canal que
l'étage 3 pose `veille/controles`, et il n'apparaît dans aucun check run.

⚠️ `neutral` et `skipped` ne sont **pas** des échecs : un job conditionnel ignoré est
un fonctionnement normal. Les compter en rouge rendrait le tableau faux, donc inutile.

⚠️ `mergeable_state` se lit **PR par PR** (la liste ne le porte pas) et GitHub le
calcule de façon asynchrone : `unknown` veut dire « pas encore calculé », jamais
« en conflit ».

### 6. Idempotence par marqueur, indexé sur le SHA de tête

Chaque commentaire porte un marqueur HTML `<!-- suivi-depot:… -->` contenant les
7 premiers caractères du SHA de tête. Un même échec ne se re-signale donc pas à
chaque passage quotidien, mais un **nouvel** échec après un push parle. La relance
d'inactivité, elle, n'a pas de SHA : elle est unique, définitivement.

### 7. Le même dispositif dans les deux dépôts

`chatbot-mairie-mezieres` reçoit un jumeau : même principe, même prudence, à un
détail près — la veille n'y ouvre aucune PR, il n'y a donc pas de catégorie
« veille ». Le script y est **autonome** (il n'a pas de `scripts/lib/` à réutiliser).
Toute correction de fond se reporte dans les deux, et les en-têtes des deux fichiers
le disent.

## Conséquences

**Positives :**
- Un état du dépôt lisible d'un coup d'œil, à la demande (`workflow_dispatch`) ou
  chaque matin.
- Une PR de robot en conflit ou en échec se signale d'elle-même, une fois.
- Aucun commentaire sur le travail d'un humain.

**Négatives / compromis acceptés :**
- Le résumé de run n'est lu que si on l'ouvre : ce n'est pas un email. C'est assumé —
  un canal supplémentaire (issue de bord, email quotidien) coûterait plus
  d'attention qu'il n'en rendrait, et l'ADR-0042 a déjà tranché contre la création
  d'issues par un suivi.
- Une PR Dependabot rebasée chaque semaine produira un commentaire par SHA en échec.
  C'est le prix de « un nouvel échec parle ».
- Deux copies du script, une par dépôt, qui peuvent diverger. Le risque est admis
  (les deux dépôts ne partagent aucun code) et signalé en tête de fichier.

## Ce qu'on ne fait pas

- **Aucune fermeture, aucune fusion, aucun push.**
- **Aucun commentaire sur une PR humaine**, quelle que soit la gravité de ce qu'on
  y voit.
- **Pas de doublon du canal de la veille** ni de celui des liens morts.
- **Pas de création d'issue** (ADR-0042 : un canal qui se plaint dans un canal à lui
  n'est pas lu).
