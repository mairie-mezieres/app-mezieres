# Mémoire et configuration des veilles

Ce dossier contient la **mémoire compacte des veilles automatiques** et le profil
de la commune qui leur sert de filtre.

## Veille technologique — `.github/workflows/veille-techno.yml` (hebdomadaire)

- `historique-techno.md` — créé et mis à jour par l'agent de veille lui-même à
  chaque exécution hebdomadaire : une section par semaine (`## AAAA-MM-JJ`),
  une ligne par information rapportée (`- Titre court — URL`) ou recommandation
  émise (`- [reco] Titre court`). Limité aux 12 dernières semaines.

- `actions-pwa.json` — **éphémère, non committé** (généré à chaque run, comme le
  rapport HTML). Tableau d'actions concrètes et sourcées à mener sur la PWA
  (catégories `dependance` / `securite` / `accessibilite`).
  `scripts/create-veille-issue.js` le transforme en une **issue-checklist**
  « 🔭 Actions PWA — veille du JJ/MM ». Voir ADR-0005 et
  `docs/guide-technique.md` §10.

## Veille municipale — `.github/workflows/veille-municipale.yml` (mensuelle)

Destinée aux **élus** : subventions ouvertes, obligations réglementaires
nouvelles, bonnes pratiques applicables. Voir ADR-0025.

- `commune.yml` — **profil de la commune**, et donc filtre de pertinence de la
  veille : population, EPCI, compétences réellement exercées, compétences
  déléguées (eau, déchets, PLUi…), projets en cours, seuils d'exclusion.
  ⚠️ C'est de la connaissance, pas de la mise en forme : une donnée fausse ici
  produit un mois entier de signalements hors sujet. **À tenir à jour à la
  main**, jamais par un agent.

- `historique-municipale.md` — la mémoire des éditions : une section par mois
  (`## AAAA-MM-JJ`), une ligne par item retenu
  (`- [action] Titre court — URL` / `- [surveiller] Titre court — URL`).
  Limité aux 12 dernières éditions.

## Règle commune aux deux veilles

L'agent lit son fichier d'historique **avant** ses recherches pour ne pas
re-signaler une information déjà rapportée (anti-redondance), puis le met à
jour ; le workflow le committe **après l'envoi réussi de l'email** (si l'envoi
échoue, la mémoire n'avance pas et les infos seront re-proposées à l'exécution
suivante).

Ne pas éditer les fichiers `historique-*.md` à la main, sauf pour retirer une
entrée que l'on souhaite voir re-signalée.

> `veille/**` fait partie des chemins **interdits** au correcteur automatique de
> la veille technologique (`scripts/check-veille-diff.js`, ADR-0023) : aucune PR
> draft ne peut réécrire une mémoire ni le profil de la commune.
