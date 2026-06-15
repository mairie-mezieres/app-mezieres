# SFD-10 — Déchets & collecte

> [Référentiel](../README.md) · [SFG](../SFG-specifications-generales.md) · Processus : **Déchets & collecte**

## 1. Objectif

Informer les habitants du **calendrier de collecte** des déchets, fournir un **guide de tri**, et
proposer des **rappels par notification** la veille de la collecte.

## 2. Acteurs concernés

- **Citoyen** : consulte les prochaines collectes et le guide de tri ; active les rappels.
- **Système** : envoie les rappels push la veille de chaque collecte.

## 3. User stories

- **US-10.1** — En tant que citoyen, je veux connaître la prochaine collecte (type de bac, date)
  afin de sortir le bon bac au bon moment.
- **US-10.2** — En tant que citoyen, je veux consulter le guide de tri afin de bien trier mes déchets.
- **US-10.3** — En tant que citoyen, je veux recevoir un rappel la veille de la collecte afin de ne pas l'oublier.

## 4. Critères d'acceptation (Gherkin)

### US-10.1
```
Étant donné le calendrier de collecte
Quand j'ouvre la tuile « Déchets »
Alors le type du prochain bac et le décompte de jours sont affichés.
```

### US-10.2
```
Étant donné le guide de tri
Quand je l'ouvre
Alors les consignes par bac (emballages, papier, verre) sont présentées, consultables hors-ligne.
```

### US-10.3
```
Étant donné que j'ai activé les rappels de collecte sur un appareil compatible
Quand la veille d'une collecte arrive
Alors je reçois une notification indiquant le(s) bac(s) à sortir.
```

## 5. Règles de gestion

- **RG-10.1** — Le **rappel** est envoyé **la veille** de la collecte, dans une fenêtre de soirée
  (≈ 18 h–21 h, heure de Paris), aux abonnés du groupe `mat:subs:dechets`.
- **RG-10.2** — **Déduplication journalière** : un seul envoi par jour (`mat:dechets:lastSent`),
  sauf déclenchement forcé.
- **RG-10.3** — Le **type de collecte du lendemain** est calculé (`noir` / `jaune` / les deux /
  aucun) en tenant compte des **jours fériés**.
- **RG-10.4** — Les endpoints morts (410/404) rencontrés lors de l'envoi sont **purgés** du groupe
  déchets (cf. RG-08.5).
- **RG-10.5** — Le **guide de tri** est embarqué dans l'application et **disponible hors-ligne**.
- **RG-10.6** — Les appareils **iOS < 16** ne supportent pas les rappels push (cf. RG-08.6).

## 6. Données manipulées

- **Abonnés déchets** : `mat:subs:dechets`.
- **Anti-doublon** : `mat:dechets:lastSent` (date, TTL 24 h).
- **Local** : `mat_dechets_notif_v1` (rappels actifs).

## 7. Intégrations & dépendances

- **Web Push** (cf. [SFD-08](SFD-08-notifications-push.md)).
- Cron / endpoint : `GET /cron/dechets?key=<CRON_SECRET>` (option `force=1`).

## 8. Cas limites & mode dégradé

- **Hors-ligne** : calendrier et guide de tri en cache restent consultables.
- **Jour férié** : décalage/annulation pris en compte dans le calcul (RG-10.3).

## 9. Exigences de conformité spécifiques

- **RGPD** : abonnement aux rappels **anonyme** (RG-T-5) ; désabonnement direct possible (RG-T-11).
