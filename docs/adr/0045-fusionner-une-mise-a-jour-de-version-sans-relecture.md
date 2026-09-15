# ADR-0045 — Fusionner une mise à jour de version sans relecture, et jusqu'où

- **Date** : 15 septembre 2026
- **Statut** : Accepté
- **Complète** : ADR-0043 (suivi du dépôt), qui pose explicitement « aucune fusion »

## Contexte

L'ADR-0043 a tranché : le suivi du dépôt **constate, il ne décide pas**. Il n'a que
`contents: read`, et laisse chaque PR Dependabot verte en attente d'une décision
humaine. C'est la bonne règle pour un *suivi*.

Mais elle laisse un problème entier. Sur ce dépôt, la décision est presque toujours la
même — « oui » pour un correctif de version — et c'est ce « oui » répété, sans enjeu,
qui finit par ne plus être donné du tout. Au 15 septembre 2026, trois PR Dependabot
attendaient côté backend, toutes vertes, ouvertes la veille. Ce n'est pas beaucoup.
C'est le début de la pile dans laquelle, un jour, la mise à jour de sécurité qu'il
fallait vraiment prendre ne se verra plus.

## Décision

Un workflow **séparé**, `dependabot-auto-merge.yml`, dans les deux dépôts. Il
fusionne — donc il porte ses propres barrières, et elles sont **exécutables**.

### 1. Ce n'est pas un assouplissement du suivi, c'est un autre métier

`suivi-depot.yml` garde `contents: read` et ne fusionnera jamais. Les deux workflows
coexistent : l'un rend l'état lisible, l'autre prend une décision étroite et
mécanique. Mélanger les deux aurait donné à un script de lecture le droit d'écrire
dans `main`.

### 2. Six barrières, toutes vérifiées dans le script

| Barrière | Ce qu'elle empêche |
|---|---|
| Auteur `dependabot[bot]`, **lu sur l'API** | Un titre ou un nom de branche, ça s'écrit. Une identité d'App, non. |
| La PR ne touche **que** `package.json` / `package-lock.json` | Une « mise à jour de version » qui modifie du code n'en est pas une. C'est la barrière qui compte vraiment. |
| Correctif toujours ; mineure **seulement à partir de la 1.0.0** | Voir §3. |
| CI **verte**, sur les deux sources (check runs **et** commit statuses) | Un seul des deux canaux, c'est conclure sur la moitié des preuves. |
| `mergeable_state === 'clean'` | Conflit, ou état non calculé. |
| Plafond de 5 fusions par exécution | Un emballement (Dependabot qui rouvre tout après un changement de config). |

⛔ **« aucune » n'est pas « verte ».** Quand aucun check n'a tourné, le script refuse :
pour une fusion automatique, l'absence de preuve ne vaut pas preuve. C'est la même
erreur que l'ADR-0030 (un contrôle qui ne mesure rien ne rougit pas, il verdit),
appliquée cette fois à une décision irréversible.

### 3. ⛔ Jamais une majeure, **et jamais une mineure en 0.x**

La seconde moitié de cette phrase est celle qu'on oublie. En pré-1.0, semver (§4)
réserve explicitement la mineure aux ruptures : `0.124.0 → 0.125.0` peut casser autant
qu'un `1 → 2`. Traiter les deux de la même façon parce qu'elles « ont la même forme »
serait lire le numéro, pas la promesse qu'il porte.

C'est concret ici : des trois PR en attente le 15 septembre, la règle en écarte deux —
`googleapis 178 → 180` (majeure) et `@anthropic-ai/sdk 0.124 → 0.125` (mineure en 0.x)
— et n'en fusionne qu'une, `@sentry/node 10.73 → 10.74`. Une règle qui les aurait
toutes prises aurait été plus satisfaisante sur le moment et fausse sur le fond.

### 4. ⚠️ Pourquoi pas l'auto-merge natif de GitHub

`main` **n'est protégée dans aucun des deux dépôts** (vérifié : `"protected": false`).
Or l'auto-merge natif (`gh pr merge --auto`) n'attend les checks que s'il existe une
règle de protection qui les **exige**. Sans protection, il fusionne **immédiatement**,
sans rien attendre — l'exact contraire de ce qu'on croit activer.

Le script lit donc l'état réel des checks lui-même. Il restera correct le jour où
`main` sera protégée ; l'inverse n'était pas vrai.

### 5. Le déclencheur est la **fin** de la CI, pas l'ouverture de la PR

`workflow_run` sur les workflows de CI (`CI` côté backend, `CI` **et** `E2E` côté app),
plus un filet quotidien. À l'ouverture d'une PR, il n'y a rien à lire.

⚠️ Côté app, deux workflows de CI : le déclencheur n'est **qu'un réveil**. La décision
se prend sur l'état **global** des checks de la tête, jamais sur la conclusion du seul
workflow qui vient de finir — sinon la première CI verte fusionnerait sans attendre la
seconde.

⚠️ `workflow_run` s'exécute dans le contexte du dépôt de base avec un token complet.
C'est ce qui rend l'opération possible : le `GITHUB_TOKEN` d'un workflow déclenché
*par* une PR Dependabot est en lecture seule.

### 6. Le canal reste le résumé du run

Aucun commentaire sur les PR, y compris pour un refus : le tableau du résumé dit ce
qui a été fusionné, ce qui a été laissé, et **pourquoi**, dans des termes écrits pour
quelqu'un qui se demande « pourquoi pas celle-là ? ». C'est la même règle qu'à
l'ADR-0043 : le bruit fait qu'on cesse de lire le canal.

### 7. Un socle de lecture commun, dans chaque dépôt

`etatCI` est désormais partagé entre le suivi et l'auto-merge
(`scripts/lib/veille-suivi.js` côté app, `scripts/lib/gh.js` côté backend). ⛔ Deux
lectures divergentes de l'état de CI — un suivi qui annonce « verte » pendant qu'un
auto-merge lit « rouge », ou l'inverse — porteraient sur la décision la plus lourde des
deux.

## Conséquences

**Positives :**
- Les correctifs de version se prennent tout seuls, CI verte à l'appui.
- Ce qui demande un jugement (majeure, 0.x, groupe, fichier inattendu) arrive à un
  humain **sans être noyé** dans ce qui n'en demandait pas.
- Le refus est expliqué, pas silencieux.

**Négatives / compromis acceptés :**
- Une régression peut passer si elle n'est pas couverte par la CI. C'est le pari
  assumé : la CI du backend joue `npm test` (golden-master + routes), celle de l'app
  la suite Playwright complète. Un correctif de version qui les passe toutes a plus de
  chances d'être bon qu'une PR relue en diagonale trois semaines plus tard.
- Le parsing du titre Dependabot (`from X to Y`) est un point de fragilité : si le
  format change, le script **refuse** (versions illisibles) plutôt que de deviner. Le
  défaut va donc vers l'inaction, ce qui est le bon sens de l'erreur.
- Deux copies du script, une par dépôt. Comme pour `suivi-depot.js`, la divergence est
  signalée en tête de fichier.

## Ce qu'on ne fait pas

- **Pas de fusion d'une majeure**, ni d'une **mineure en 0.x**, jamais, quel que soit
  l'état de la CI.
- **Pas de fusion d'une PR qui touche autre chose** que `package.json` /
  `package-lock.json`.
- **Pas d'`--auto` natif** tant que `main` n'est pas protégée (§4).
- **Pas de fermeture** de PR : ce qui n'est pas fusionné est laissé tel quel, pas
  écarté.
- **Pas de commentaire** sur les PR : le résumé du run est le canal.
