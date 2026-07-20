# ADR-0004 — Veilles IA : vérification du livrable, 2e tentative et artefact de diagnostic

- **Date** : 20 juillet 2026
- **Statut** : Accepté

## Contexte

Les workflows `veille-techno.yml` (hebdomadaire) et `veille-bulletin.yml` (mensuel)
délèguent la rédaction du rapport à un agent Claude Code (`anthropics/claude-code-action`)
qui doit **écrire un fichier HTML** (`rapport-veille.html` / `rapport-bulletin.html`)
ensuite envoyé par email.

Le 20 juillet 2026 (run n°19 de la veille techno), l'étape Claude s'est terminée avec le
statut **« success »** après seulement 7 tours et 68 secondes — sans avoir écrit le
fichier. L'étape d'envoi a alors échoué (« Fichier introuvable : rapport-veille.html »).
Deux problèmes structurels sont apparus :

1. **Une exécution IA n'est pas déterministe** : l'agent peut terminer « avec succès »
   sans produire le livrable (recherches web en échec, abandon prématuré, réponse en
   texte au lieu d'un `Write`…). Un unique essai rend le job entier fragile.
2. **Le diagnostic a posteriori était impossible** : l'action masque la sortie de
   l'agent dans les logs (« full output hidden for security ») et le fichier
   `claude-execution-output.json` qu'elle dépose dans `$RUNNER_TEMP` n'était pas
   conservé. On sait *que* l'agent n'a rien écrit, jamais *pourquoi*.

## Décision

Nous traitons l'étape IA comme une étape **faillible avec livrable vérifiable** :

1. **Le prompt est construit une seule fois** (variable d'env `*_PROMPT` via
   `$GITHUB_ENV`) et partagé par les deux invocations — pas de duplication du texte
   dans le YAML.
2. **La 1re tentative est en `continue-on-error`**, suivie d'une **vérification
   explicite** de la présence du rapport (`[ -s fichier.html ]`). S'il manque, une
   **2e tentative** est lancée avec le même prompt ; une vérification finale fait
   échouer le job avec un message clair si le rapport manque toujours.
3. **La sortie de l'agent est archivée en artefact** (`claude-execution-output`,
   30 jours, les deux tentatives), seul moyen de comprendre a posteriori une
   exécution « success » sans livrable. On n'active pas `show_full_output` (repo
   public : la sortie resterait visible dans les logs ; l'artefact, lui, nécessite
   un accès au repo).
4. **Le prompt exige le livrable explicitement** (« quoi qu'il arrive, tu DOIS créer
   le fichier, au pire avec des sections “Rien de notable” ») et, côté techno, gère
   la reprise : si une section datée du jour existe déjà dans
   `veille/historique-techno.md` (tentative précédente), elle est **remplacée**, pas
   dupliquée.

## Conséquences

**Positives :**
- Un raté ponctuel de l'agent (le cas du 20/07/2026) est auto-réparé sans
  intervention : l'email part quand même, la mémoire de veille n'a pas de trou.
- Chaque échec devient diagnosticable (artefact 30 j) au lieu d'être une boîte noire.
- Le coût supplémentaire est nul quand la 1re tentative réussit (cas nominal).

**Négatives / compromis acceptés :**
- Une vraie panne (jeton OAuth expiré, quota d'abonnement épuisé) consomme deux
  tentatives avant d'échouer — acceptable pour un job hebdomadaire de ~2 min.
- Le prompt vit désormais dans un heredoc shell : les `${{ }}` y sont toujours
  interpolés par le runner, mais tout `$var` shell y resterait littéral (heredoc
  quoté) — c'est voulu, ne pas « corriger ».
- Deux tentatives peuvent produire deux rapports différents ; seule la dernière
  version des fichiers est envoyée/committée.
