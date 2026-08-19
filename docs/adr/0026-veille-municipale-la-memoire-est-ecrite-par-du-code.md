# ADR-0026 — La mémoire de la veille municipale est écrite par du code, pas par l'agent

- **Date** : 19 août 2026
- **Statut** : Accepté
- **Complète** : ADR-0025 (veille municipale — mémoire et fenêtre de publication)
- **Même leçon que** : ADR-0004 (un livrable confié à un agent doit être vérifiable)

## Contexte

La toute première exécution réelle de `veille-municipale.yml` (run #1, 19 août 2026,
déclenchement manuel) s'est terminée **en succès**. Le rapport a été produit, l'email
est parti, les élus l'ont reçu. Puis l'étape de commit a répondu :

```
Historique inchangé — rien à committer.
```

`veille/historique-municipale.md` n'avait pas bougé d'un octet. L'agent avait écrit son
rapport HTML et s'était arrêté là : l'ÉTAPE 6 — mettre à jour la mémoire — était la
dernière consigne d'un prompt de 180 lignes, et elle a été sautée.

Rien n'a échoué. Le workflow était vert, l'email correct, la seule trace de l'anomalie
était une ligne de log que personne ne lit dans un run réussi. **La conséquence n'aurait
été visible que le mois suivant**, sous la forme d'un email re-proposant des dispositifs
déjà signalés — exactement ce que la mémoire existe pour empêcher, et exactement le
genre de défaut qui fait cesser de lire une newsletter.

C'est la même classe de problème que l'ADR-0004 : une étape confiée à la discipline d'un
agent, dont l'omission ne casse rien d'observable sur le moment.

Deux détails ont aggravé le piège :

- l'ÉTAPE 6 demandait à l'agent d'**éditer du Markdown** — insérer une section en tête,
  remplacer celle du même jour, tronquer à douze. Trois règles de manipulation de texte,
  là où le vrai besoin tient en une liste ;
- la mémoire avait été amorcée le jour même avec une section `## 2026-08-19`, et la
  consigne « si une section du même jour existe, REMPLACE-la » invitait l'agent à
  réécrire ce qu'il venait de lire.

## Décision

**L'agent ne touche plus à `veille/historique-municipale.md`.** Il écrit une liste
structurée, `veille/items-municipale.json` — un tableau de
`{niveau, titre, url}` — sur le modèle de `veille/actions-pwa.json` de la veille
technologique (ADR-0005).

**`scripts/update-veille-memoire.js` écrit la mémoire**, de façon déterministe :
section datée en tête, remplacement de la section du même jour, troncature à douze,
en-tête explicatif du fichier jamais touché. La mémoire avance parce que du code
l'écrit, pas parce qu'un agent y a pensé.

**Une mémoire qui n'avance pas ne peut plus être silencieuse.** Si le JSON manque ou
est invalide, le script écrit tout de même une section datée portant
`- (mémoire non renseignée par l'agent — items possiblement re-proposés)` et émet un
`::warning` dans le run. Le script **sort toujours en 0** : perdre l'email pour un
souci de mémoire serait pire que le souci.

**Le JSON devient un livrable annoncé en tête de prompt**, au même rang que le rapport,
et non une consigne de dernière ligne. Il est archivé dans l'artefact de diagnostic.

## Conséquences

**Positives :**
- Le format de la mémoire est garanti : plus de dérive de mise en forme d'un mois sur
  l'autre, et le dédoublonnage du mois suivant lit toujours la même structure.
- Une anomalie devient visible **le jour même**, dans le run, au lieu d'être découverte
  un mois plus tard par un lecteur qui reçoit deux fois le même dispositif.
- L'agent a une tâche de moins et une tâche plus simple : lister ce qu'il a retenu
  plutôt que manipuler un fichier Markdown existant.
- Le script est testable hors CI, ce que l'ÉTAPE 6 n'était pas.

**Négatives / compromis acceptés :**
- Un fichier et un script de plus dans la chaîne.
- Le script ne peut pas inventer ce que l'agent n'a pas écrit : si le JSON manque, les
  items de ce mois-là restent inconnus et pourront revenir une fois. La trace datée
  et l'avertissement rendent au moins le trou explicite.
- La section « anomalie » occupe une des douze places de l'historique.

**Points de vigilance pour les futures évolutions :**
- ⚠️ **Ne pas remettre l'écriture de la mémoire dans le prompt.** La tentation reviendra
  (« c'est juste une ligne à ajouter ») : c'est précisément ce qui a échoué.
- ⚠️ **`url` est la clé du dédoublonnage.** Un item enregistré sans URL valide est
  ignoré par le script — c'est voulu : une ligne sans adresse ne permet pas de
  reconnaître le dispositif le mois suivant.
- Les items **écartés** n'entrent pas dans la mémoire : elle ne retient que ce qui a été
  effectivement signalé aux élus. Un dispositif écarté ce mois-ci doit pouvoir être
  proposé le mois prochain s'il devient éligible.
- Si la même omission se reproduisait sur le **rapport** malgré les deux tentatives, la
  réponse serait la même : rendre le livrable vérifiable, pas répéter la consigne.
