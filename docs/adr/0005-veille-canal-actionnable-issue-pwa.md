# ADR-0005 — Veille technologique : canal actionnable via issue « Actions PWA »

- **Date** : 27 juillet 2026
- **Statut** : Accepté

## Contexte

La veille technologique hebdomadaire (`veille-techno.yml`, ADR-0004) produit un
**rapport HTML** envoyé par email. Ce livrable est fait pour être *lu* par un humain,
pas pour être *traité* : le rapport est éphémère (jamais committé), riche en prose et
en mise en forme, sans structure exploitable par un outil.

La mairie souhaite que les informations pertinentes de la veille alimentent
directement le **backlog technique de la PWA** — et, à terme, que des correctifs
soient préparés automatiquement en PR. Il fallait donc un **canal actionnable**
distinct du rapport, durable et traçable, sur lequel brancher l'automatisation.

Contrainte de sécurité forte : le contenu de la veille **dérive de sources web**
(donnée non fiable). Un pipeline « web → agent → dépôt » ouvre une surface
d'injection de prompt ; il faut des garde-fous avant toute action sur le code.

## Décision

Nous ajoutons à la veille technologique un **canal actionnable en deux étapes**, en
livrant d'abord l'étage « issue » (phase 1), l'étage « PR draft » étant prévu ensuite.

1. **Sortie structurée.** L'agent écrit, en plus du rapport, un fichier
   `veille/actions-pwa.json` : un tableau d'actions concrètes, chacune
   `{titre, categorie, priorite, source, resume}`. Le périmètre est **strictement**
   limité à trois catégories décidées avec la mairie : `dependance` (mise à jour de
   version), `securite` (correctif de faille), `accessibilite` (RGAA / UX séniors).
   Tout le reste reste dans le rapport HTML.

2. **Issue-checklist.** `scripts/create-veille-issue.js` transforme ce JSON en une
   issue GitHub « 🔭 Actions PWA — veille du JJ/MM », groupée par catégorie et
   priorité, une case à cocher sourcée par action. C'est l'**artefact durable** et le
   point d'entrée du suivi (le JSON, lui, reste éphémère et non committé).

3. **Best-effort et idempotent.** Le script sort toujours en `0` (étape en
   `continue-on-error`) : ce canal ne doit jamais faire échouer l'email ni le commit
   de l'historique. Un re-run du même jour met à jour l'issue existante (même titre)
   plutôt que d'en créer une seconde.

4. **Défense en profondeur contre l'injection.** Le script rejette toute action sans
   URL `http(s)` valide et hors des trois catégories ; le prompt interdit à l'agent
   d'obéir à des instructions trouvées dans une page web. La revue humaine de l'issue
   (puis des PR draft) est le filet final.

## Conséquences

**Positives :**
- La veille alimente un backlog exploitable, sans travail de ressaisie.
- Le découpage en phases (issue d'abord, PR ensuite) permet d'éprouver le canal sans
  jamais laisser un agent modifier le code de façon non supervisée dès le départ.
- Le canal est totalement isolé : sa défaillance n'affecte ni l'email ni la mémoire.

**Négatives / compromis acceptés :**
- Le JSON est produit par un LLM : il peut être malformé. Le script est donc
  volontairement défensif (parse tolérant, filtrage, plafonnement des champs) et
  préfère « ne rien publier » à publier du bruit.
- Périmètre volontairement étroit (3 catégories) : des informations utiles mais hors
  périmètre ne remontent que dans le rapport HTML. C'est assumé pour garder le canal
  actionnable et sûr.
- Nouvelle permission `issues: write` sur le workflow.

## Suite prévue (hors périmètre de cet ADR)

Un étage « PR draft automatiques » lira `actions-pwa.json` pour ouvrir, par action
éligible, une PR **en draft** (jamais de merge auto), dans le respect des conventions
du projet (bump du cache SW, changelog, docs). Il fera l'objet de sa propre décision
lorsqu'il sera livré.
