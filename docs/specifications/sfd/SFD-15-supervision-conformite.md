# SFD-15 — Supervision, exploitation & conformité

> [Référentiel](../README.md) · [SFG](../SFG-specifications-generales.md) · Processus : **Supervision & conformité**

## 1. Objectif

Doter la mairie des moyens de **piloter** (tableau de bord, statistiques), **superviser** (diagnostic
des services), **exploiter** (purge des données, traitements automatiques) et **garantir la
conformité** (RGPD, IA Act, RGAA, sécurité) de l'application.

## 2. Acteurs concernés

- **Administrateur** : consulte le tableau de bord, lance les diagnostics, déclenche les purges.
- **Système** : exécute les traitements planifiés (rappels, météo, statistiques, sauvegarde).

## 3. User stories

- **US-15.1** — En tant qu'administrateur, je veux un tableau de bord (fréquentation, usage, coûts
  IA, quotas) afin de piloter l'application.
- **US-15.2** — En tant qu'administrateur, je veux diagnostiquer l'état des services (Redis, météo,
  Trello, IA, Facebook, push…) afin d'identifier rapidement une panne.
- **US-15.3** — En tant qu'administrateur, je veux purger les données anciennes afin de respecter les
  durées de conservation.
- **US-15.4** — En tant que mairie, je veux que les données soient sauvegardées/répliquées afin de
  ne jamais les perdre et de pouvoir migrer de compte.
- **US-15.5** — En tant que mairie, je veux disposer de la documentation de conformité (RGPD, IA Act,
  RGAA, sécurité) afin de répondre à mes obligations.

## 4. Critères d'acceptation (Gherkin)

### US-15.1
```
Étant donné le tableau de bord admin
Quand je l'ouvre
Alors les indicateurs s'affichent : accès & visiteurs uniques (jour/mois + tendance), abonnés push,
nombre d'idées/signalements, usage et coûts IA, consommation Redis (jour/mois/mémoire).
```

### US-15.2
```
Étant donné l'onglet diagnostic
Quand je lance les tests
Alors chaque service est testé (serveur, Redis, Open-Meteo, vigilance, bus, agenda, Google Calendar,
Trello, Mistral, Facebook, webhook, push) avec un statut (ok/avertissement/erreur) et un message d'aide.
```

### US-15.3
```
Étant donné l'onglet purge
Quand je choisis un type de données et une date limite puis confirme
Alors les éléments antérieurs sont supprimés (avec nettoyage Cloudinary pour les images)
Et un récapitulatif du nombre d'éléments supprimés est affiché.
```

### US-15.4
```
Étant donné la réplication configurée vers une base cible
Quand le traitement de sauvegarde est déclenché (planifié ou manuel)
Alors les clés mat:* sont copiées vers la base cible
Et seuls des compteurs sont journalisés (jamais le contenu des données).
```

## 5. Règles de gestion

### Tableau de bord & statistiques
- **RG-15.1** — Les indicateurs couvrent : fréquentation (accès, visiteurs uniques, installations),
  répartition par appareil/OS/navigateur, usage MEL par catégorie, coûts IA (Mistral/Claude),
  consommation Redis (quotas 10 000/jour, 500 000/mois).
- **RG-15.2** — Les statistiques sont **agrégées en mémoire** puis **écrites par lots** vers Redis
  (≈ toutes les 5 min, + à l'arrêt propre) pour rester sous le quota.
- **RG-15.3** — **Rétention** : ~90 jours pour les données journalières, ~24 mois pour les mensuelles
  (compaction automatique).
- **RG-15.4** — Les statistiques détaillées peuvent être **désactivées** via les réglages
  (`detailedStatsEnabled`, `melUsageStatsEnabled`, `appOpenStatsEnabled`).
- **RG-15.5** — La donnée `allDevices` (liste brute d'identifiants) **n'est jamais exposée** dans les
  statistiques publiques (minimisation, RG-T-7).

### Diagnostic des services
- **RG-15.6** — Le diagnostic teste chaque dépendance et retourne un **statut** (ok / avertissement /
  erreur), un **message** et une **durée** ; en cas d'erreur, un message d'aide oriente la correction.
- **RG-15.7** — Endpoints de santé légers : `GET /ping` (texte « ok »), `GET /health`
  (`{ ok, redis, mode }`).

### Purge & exploitation
- **RG-15.8** — Types de purge : `actus`, `signals`, `stats_parjour`, `ia_stats_daily`,
  `ia_categories_parjour`, `mel_questions`, `all_before` ; entrée = **date limite**.
- **RG-15.9** — La purge des actualités/photos **nettoie aussi Cloudinary** (via `publicId`).
- **RG-15.10** — La purge est **irréversible** (pas de corbeille) : confirmation requise.

### Traitements automatiques (crons)
- **RG-15.11** — Tous les crons sont protégés par **`CRON_SECRET`** (cf. RG-T) : rappels déchets
  (veille, soirée), vérification météo (~15 min), email de statistiques (après 22 h, anti-doublon
  journalier), flush des statistiques (5 min), sauvegarde/réplication (planifiée).
- **RG-15.12** — Chaque cron applique une **déduplication journalière** lorsque pertinent
  (`mat:dechets:lastSent`, `mat:daily:stats:sent`).
- **RG-15.13** — **Arrêt propre** (SIGTERM/SIGINT) : flush des statistiques avant sortie (déploiement Render).

### Sauvegarde / réplication
- **RG-15.14** — La **réplication** copie toutes les clés `mat:*` d'une base source vers une base
  cible (sauvegarde + cible de migration), déclenchable manuellement ou par planification, protégée
  par `CRON_SECRET`.
- **RG-15.15** — La réplication **ne journalise que des compteurs** (jamais le contenu : données
  personnelles potentielles) ; aucun identifiant de base n'est exposé dans les dépôts publics.

## 6. Données manipulées

- **Statistiques** : `mat:stats`, `mat:ia:stats`, catégories MEL.
- **Historique push** : `mat:push:history`.
- **Drapeaux crons** : `mat:dechets:lastSent`, `mat:daily:stats:sent`.
- **Réplication** : variables d'environnement source/cible (hors dépôt).

## 7. Intégrations & dépendances

- **Upstash** (stats & réplication), **Resend** (email stats), **Sentry** (erreurs),
  ensemble des services testés par le diagnostic.
- Routes : `GET /admin/dashboard`, `GET /admin/services/test`, `POST /admin/purge`,
  `GET /cron/*`, `GET /ping`, `GET /health`.

## 8. Cas limites & mode dégradé

- **Quota Redis dépassé** : mode dégradé (lecture cache mémoire, écritures non critiques refusées) ;
  le dashboard signale le mode.
- **Cold start Render** : première réponse lente tolérée (RG-T-23).
- **Cron en échec** : journalisation ; pas de blocage de l'émetteur (best-effort).

## 9. Exigences de conformité spécifiques

- **RGPD** : registre de traitement à tenir par la mairie ; **AIPD** requise avant activation de la
  journalisation MEL (RG-T-10) ; durées de conservation appliquées via la purge (RG-15.8) ; droits
  des personnes exercés auprès de la mairie/DPO (RG-T-11). Référence : `docs/note-conformite-MEL.md`
  (dépôt backend).
- **IA Act** : MEL non haut-risque, transparence assurée (RG-T-12/RG-T-13).
- **RGAA / accessibilité** : audits continus (axe-core en CI, Lighthouse) — cf. [SFD-13](SFD-13-accessibilite-personnalisation.md).
- **Sécurité** : politique de divulgation responsable (`SECURITY.md`), secrets hors dépôt,
  rate-limiting, validation HMAC des webhooks (RG-T-16 à RG-T-20).
