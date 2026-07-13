# Mémoire de veille

Ce dossier contient la **mémoire compacte des veilles automatiques** (workflow
`.github/workflows/veille-techno.yml`) :

- `historique-techno.md` — créé et mis à jour par l'agent de veille lui-même à
  chaque exécution hebdomadaire : une section par semaine (`## AAAA-MM-JJ`),
  une ligne par information rapportée (`- Titre court — URL`) ou recommandation
  émise (`- [reco] Titre court`). Limité aux 12 dernières semaines.

L'agent lit ce fichier **avant** ses recherches pour ne pas re-signaler une
information déjà rapportée (anti-redondance), puis le met à jour ; le workflow
le committe **après l'envoi réussi de l'email** (si l'envoi échoue, la mémoire
n'avance pas et les infos seront re-proposées la semaine suivante).

Ne pas éditer `historique-techno.md` à la main, sauf pour retirer une entrée
que l'on souhaite voir re-signalée.
