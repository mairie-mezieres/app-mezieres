# SFD-08 — Notifications push

> [Référentiel](../README.md) · [SFG](../SFG-specifications-generales.md) · Processus : **Notifications push**

## 1. Objectif

Permettre aux habitants de **recevoir des notifications** (actualités, vigilance météo, rappels de
collecte, suivi de leurs signalements/idées) via le **Web Push (VAPID)**, avec gestion fine de
l'abonnement et nettoyage automatique des abonnements expirés.

## 2. Acteurs concernés

- **Citoyen** : s'abonne / se désabonne, choisit les thèmes (météo, déchets).
- **Administrateur** : envoie des notifications (depuis une actualité), consulte l'historique
  (cf. [SFD-14](SFD-14-administration-backoffice.md)).
- **Système** : envoie les notifications automatiques (météo, déchets, changements de statut).

## 3. User stories

- **US-08.1** — En tant que citoyen, je veux activer les notifications afin d'être informé des
  actualités et alertes importantes.
- **US-08.2** — En tant que citoyen, je veux choisir les types de notifications (météo, déchets)
  afin de ne recevoir que ce qui m'intéresse.
- **US-08.3** — En tant que citoyen, je veux pouvoir me désabonner à tout moment afin de maîtriser
  mes notifications.
- **US-08.4** — En tant que citoyen, je veux que mon abonnement soit rétabli automatiquement s'il
  expire afin de continuer à recevoir les alertes.

## 4. Critères d'acceptation (Gherkin)

### US-08.1
```
Étant donné une PWA installée sur un appareil compatible
Quand j'active les notifications et accorde la permission
Alors mon abonnement (endpoint + clés) est enregistré côté serveur
Et l'état « notifications actives » est mémorisé localement.
```

### US-08.2
```
Étant donné l'écran d'abonnement
Quand j'active les rappels de collecte ou les alertes météo (avec un niveau minimal)
Alors je suis ajouté au groupe d'abonnés correspondant.
```

### US-08.3
```
Étant donné un abonnement actif
Quand je me désabonne
Alors mon endpoint est retiré des listes d'abonnés et l'état local est mis à jour.
```

### US-08.4
```
Étant donné un abonnement devenu invalide (endpoint expiré)
Quand le serveur tente un envoi et reçoit 410/404
Alors l'endpoint est automatiquement purgé de toutes les listes
Et, côté client, l'abonnement est resouscrit lors d'un prochain lancement.
```

## 5. Règles de gestion

- **RG-08.1** — Le Web Push repose sur une **paire de clés VAPID persistante** : la clé privée ne
  doit jamais changer (sous peine d'invalider tous les abonnements).
- **RG-08.2** — Trois groupes d'abonnés : `mat:subs` (général/actualités), `mat:subs:meteo`
  (alertes météo, avec niveau minimal), `mat:subs:dechets` (rappels collecte).
- **RG-08.3** — **Rate-limiting** des opérations d'abonnement/test : 20 requêtes/minute (RG-T-19).
- **RG-08.4** — Un endpoint **déjà enregistré** est ignoré silencieusement (idempotence).
- **RG-08.5** — Lors d'un envoi, tout endpoint répondant **410/404** est **purgé** de **toutes** les
  listes (`purgeEndpointsEverywhere`), sans bloquer l'émission aux autres.
- **RG-08.6** — Les appareils **iOS antérieurs à la version 16** ne supportent pas le Web Push : la
  fonction est désactivée et un message l'explique.
- **RG-08.7** — Côté PWA, en cas d'échec d'abonnement, un **drapeau de synchronisation différée** est
  posé et l'opération est retentée au prochain lancement (cooldown ~5 min).
- **RG-08.8** — Les notifications de **vigilance météo** sont envoyées en **urgence haute** (TTL 24 h) ;
  les notifications standard utilisent une urgence normale.
- **RG-08.9** — L'**historique** des 50 derniers envois est conservé (`mat:push:history`) :
  horodatage, type, titre, nombre d'envois réussis, morts.

## 6. Données manipulées

- **Abonnement** : `{ endpoint, p256dh, auth }` dans `mat:subs` / `mat:subs:meteo` (avec `minLevel`)
  / `mat:subs:dechets`.
- **Payload** : `title`, `body`, `icon`, `badge`, `tag`, `data` (cible de navigation : actu, notifs,
  meteo, idées, signalements…).
- **Local** : `mat_push_active`, `mat_push_pending_sync`, `mat_notif_prompted_v1`,
  `mat_dechets_notif_v1`, `mat:notify:signal:{id}`.

## 7. Intégrations & dépendances

- **Web Push API** (bibliothèque `web-push`, clés VAPID).
- Producteurs de notifications : actualités (SFD-01), météo (SFD-09), déchets (SFD-10),
  signalements (SFD-03), idées (SFD-04).
- Routes : `POST /push/subscribe`, `/push/status`, `/push/unsubscribe`, `/push/test`,
  `/push/subscribe/dechets`, `/push/subscribe/meteo`.

## 8. Cas limites & mode dégradé

- **Permission refusée** : aucune relance intempestive (drapeau mémorisé).
- **Hors-ligne** : abonnement reporté et retenté.
- **Endpoints morts** : purge automatique (RG-08.5).

## 9. Exigences de conformité spécifiques

- **RGPD** : l'abonnement (endpoint + clés) ne contient **aucune donnée nominative** ; le citoyen
  peut se désabonner directement (RG-T-11). Consentement explicite via la permission du navigateur.
