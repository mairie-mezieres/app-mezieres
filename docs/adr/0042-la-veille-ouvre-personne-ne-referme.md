# ADR-0042 — La veille ouvre, personne ne referme : un étage de suivi

- **Date** : 14 septembre 2026
- **Statut** : Accepté
- **Complète** : ADR-0005 (issue « Actions PWA »), ADR-0023 (PR draft sous barrière)

## Contexte

Le canal actionnable de la veille technologique a deux étages, et ils **ouvrent**
tous les deux :

- étage 1 — une **issue-checklist datée** par exécution (`🔭 Actions PWA — veille
  du 14 septembre 2026`) ;
- étage 2 — une **PR en draft** par action éligible.

Aucun des deux ne revient jamais sur ce qu'il a produit. Trois conséquences, dont
deux sont invisibles jusqu'à ce qu'on regarde la liste des issues :

### 1. Une issue par semaine, et rien pour les refermer

Le titre porte la date : chaque exécution crée une issue **nouvelle** (l'idempotence
de `create-veille-issue.js` ne vaut que pour un re-run du même jour). À raison d'une
par semaine, c'est 52 issues ouvertes par an. Une action réellement corrigée — par une
PR de l'étage 2, fusionnée — continue d'y figurer comme « à faire » : rien ne relie la
case cochable à la PR qui l'a traitée.

### 2. Une PR draft sans coche verte vieillit mal

L'ADR-0023 §5 l'a constaté sans pouvoir y remédier : ces PR sont ouvertes avec le
`GITHUB_TOKEN`, et GitHub ne déclenche **aucun** workflow pour les événements qu'il
produit. Le corps de la PR explique que l'absence de coche verte ne veut pas dire
« non testé »… ce qui ne se lit qu'en ouvrant la PR et en allant jusqu'au bout.

Pire : les contrôles qui passaient à l'ouverture **cessent de passer tout seuls**.
`main` avance, le numéro de version affiché bouge, le `CACHE` du service worker aussi,
et `scripts/check-cache-bust.js` voit alors un `?v=` en retard sur une branche que
personne n'a touchée. Un brouillon de trois semaines n'est plus applicable, et rien ne
le dit.

### 3. Le dédoublonnage rend l'abandon définitif

`select-veille-actions.js` écarte toute action dont la branche existe **ou** dont une
PR existe, même fermée (ADR-0023 §6). C'est voulu. Mais cela veut dire qu'un brouillon
laissé ouvert et oublié n'est pas « en attente » : c'est une action **retirée du
circuit**, qui ne reviendra jamais, sous une apparence de travail en cours.

## Décision

Un **étage 3** : `.github/workflows/veille-suivi.yml`, déclenché par `workflow_run`
juste après *Veille technologique MAT* (les étages 1 et 2 viennent de s'exécuter),
plus un filet quotidien — une PR relue et fusionnée un mercredi doit voir sa case
cochée le jeudi, pas le lundi suivant.

### 1. Il constate, il ne décide pas

Il ne fusionne rien, ne sort aucune PR du brouillon, n'approuve rien. Ce qu'il fait
tient en quatre gestes, tous réversibles à la main.

### 2. Une case ne se coche que sur une PR **fusionnée**

`scripts/suivi-veille-issues.js` retrouve, action par action, la PR de l'étage 2
correspondante, et coche la case **seulement** si cette PR est fusionnée. Une PR
ouverte ne prouve rien ; une PR fermée sans fusion prouve le contraire. Le reste est
écrit dans un bloc « Suivi automatique » délimité par marqueurs, qui dit pour chaque
action où elle en est — y compris « aucune PR : à traiter à la main ».

Une issue dont toutes les cases sont cochées est **refermée**, avec un commentaire qui
dit par qui et comment la rouvrir.

⛔ **Une action se reconnaît à `categorie + source`, jamais à son titre.** C'est la
règle de l'ADR-0023 §6, et elle vaut ici à l'identique : l'identifiant calculé depuis
le corps de l'issue est exactement celui que l'étage 2 a écrit dans le nom de branche.
Sans cela, le suivi croirait chaque semaine découvrir des actions neuves.

### 3. La coche verte est posée par l'API, pas par un workflow

`POST /repos/{repo}/statuses/{sha}` (contexte `veille/controles`) s'affiche là où l'œil
va : à côté du titre, dans la liste des PR. Un commit status est posé **par l'API**, et
non déduit d'un workflow — c'est précisément ce qui permet de contourner la limite de
l'ADR-0023 §5.

⛔ Ce statut porte sur les **contrôles du dépôt** (syntaxe, CSS, cache-busting,
re-raccordement des tokens), pas sur les tests Playwright ni sur la pertinence du
correctif. La description du statut le dit. Ne jamais l'élargir en silence : une coche
verte qui promet plus qu'elle ne vérifie est pire que pas de coche du tout.

### 4. Un agent, uniquement là où le travail est mécanique

Le job de vérification fusionne `main` dans la branche puis rejoue les contrôles. Si
et seulement si **la fusion s'est faite proprement et que les contrôles échouent**, un
agent est lancé pour remettre la branche à niveau — le cas typique étant un `?v=` ou un
numéro de version que `main` a doublés. C'est mécanique et vérifiable.

Tout le reste reste humain :

- **un conflit n'est jamais résolu automatiquement.** Distinguer ce que le correctif
  voulait dire de ce que `main` a changé depuis n'est pas une opération mécanique. La
  fusion est annulée, un commentaire le dit, le statut passe au rouge.
- l'agent a les mêmes outils qu'à l'étage 2 (`Read,Grep,Glob,Edit,Write` — **ni
  terminal, ni réseau**) et passe par la **même barrière** `scripts/check-veille-diff.js`.
  Un prompt est une consigne, pas une barrière.
- **rien n'est poussé si les contrôles ne passent pas** : une fusion poussée sans
  correctif rendrait le brouillon plus cassé qu'avant.

### 5. Relancer une fois, fermer en disant pourquoi

Un brouillon de plus de 14 jours reçoit **un** commentaire de relance ; au-delà de
60 jours, il est refermé, en disant que la **branche est conservée** et que l'action ne
reviendra pas par l'étage 2. Une issue de plus de 21 jours dont il reste des cases vides
reçoit **un** rappel listant ce qui reste.

⛔ L'idempotence repose sur un **marqueur HTML** dans le commentaire, pas sur la
ressemblance des textes : ce workflow repasse tous les jours. Sans marqueur, chaque
passage ajouterait une relance de plus.

⚠️ Les seuils se comptent depuis `created_at`, **jamais `updated_at`** : le job pousse
lui-même la fusion de `main` dans la branche, ce qui rafraîchit `updated_at`. Une PR
abandonnée paraîtrait éternellement active — le suivi s'auto-aveuglerait.

### 6. `SUIVI_DRY_RUN=1`

L'entrée `dry_run` du `workflow_dispatch` neutralise **toutes** les écritures (aucun
commentaire, aucune fermeture, aucun push) et les journalise à la place. C'est le seul
moyen d'essayer ce workflow sur le vrai dépôt sans rien y laisser.

## Conséquences

**Positives :**
- Le nombre d'issues ouvertes cesse de croître d'une par semaine.
- Une action traitée par une PR fusionnée se coche toute seule, avec le lien.
- Ces PR ont enfin une coche verte — et elle redevient rouge quand `main` les périme.
- Un brouillon abandonné est fermé **en le disant**, au lieu de faire croire à un
  travail en cours sur une action que le dédoublonnage a déjà retirée du circuit.

**Négatives / compromis acceptés :**
- Le suivi pousse des commits de fusion sur des branches de brouillon : l'historique
  de ces branches est plus bruyant. Elles ne sont pas destinées à être lues comme un
  historique propre, et une branche à jour vaut mieux qu'une branche lisible.
- `workflow_run` ne s'active que depuis la version du fichier présente sur la branche
  **par défaut** : tant que ce workflow n'est pas sur `main`, seuls le cron quotidien
  et le déclenchement manuel le font tourner.
- Un statut `veille/controles` rouge sur une PR draft peut se lire comme un échec de
  CI. C'est voulu : c'est bien un échec, simplement pas celui du correctif d'origine.

## Ce qu'on ne fait pas

- **Aucune fusion, aucune sortie du brouillon, aucune approbation.** L'étage 3 ne
  franchit pas la ligne que l'ADR-0005 a tracée.
- **Pas de résolution automatique de conflit.**
- **Pas de suppression de branche** à la fermeture d'une PR : la branche est ce qui
  empêche l'étage 2 de rouvrir la même action, et ce qui permet de la rouvrir à la main.
- **Pas de suivi du dépôt backend** depuis ce workflow (même raison qu'à l'étage 2 :
  ni le contexte, ni les droits).
- **Pas de nouvelle issue** : l'étage 3 écrit dans celles qui existent, il n'en crée
  aucune. Un canal qui se plaint dans un canal à lui n'est pas lu.
