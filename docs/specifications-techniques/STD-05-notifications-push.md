# STD-05 — Notifications push & tokens de suivi

> [Référentiel STD](README.md) · Fonctionnel : [SFD-08](../specifications/sfd/SFD-08-notifications-push.md) ·
> Architecture : [abonnement & envoi push](../architecture.md#45-notifications-push-abonnement--envoi)
> Fichiers : `routes/push.js`, `routes/notify.js`, `lib/push-notify.js`, `lib/webpush.js`.

## Stores d'abonnements

| Store Redis | Usage | Champ spécifique |
|-------------|-------|------------------|
| `mat:subs` | abonnés généraux (actualités, alertes) | — |
| `mat:subs:meteo` | abonnés météo | `minLevel` (défaut 2) |
| `mat:subs:dechets` | rappels de collecte | — |
| `mat:notify:token:<token>` | suivi individuel (signalement/idée/demande) | TTL **1 an** |

> **Purge des endpoints expirés.** Sur `410`/`404` lors d'un envoi, l'endpoint est retiré des **3**
> stores (`purgeEndpointsEverywhere`, sérialisé pour éviter les pertes en écriture concurrente).

## Routes

| Méthode | Chemin | Auth | Rate-limit |
|---------|--------|------|-----------|
| POST | `/push/subscribe` | — | 20 / min |
| POST | `/push/status` | — | 20 / min |
| POST | `/push/test` | — | 20 / min |
| POST | `/push/unsubscribe` | — | — |
| POST | `/push/subscribe/dechets` · `/push/subscribe/meteo` | — | 20 / min |
| POST | `/push/unsubscribe/dechets` · `/push/unsubscribe/meteo` | — | — |
| POST | `/notify/register-token` | — | 20 / min |

## Détail des endpoints

- **`POST /push/subscribe`** : corps = objet `PushSubscription`. 400 `Subscription invalide` si pas
  d'`endpoint`. Dédup par endpoint. Succès `{ success:true, total }`.
- **`POST /push/status`** : `{ endpoint }` → `{ found:<bool> }`. 400 `Endpoint requis`.
- **`POST /push/test`** : envoie une notification de test (titre `🔔 Test notification MAT`, body
  `Votre appareil reçoit bien les notifications !`, `urgency:high, TTL:3600`).
  - 400 `Endpoint requis`, **404** `Abonnement non trouvé sur le serveur — réactivez les notifications`,
    **410** `Abonnement expiré — réactivez les notifications` (sur 410/404 → purge), 500 `Échec d'envoi: …`.
    Succès `{ ok:true }`.
- **`POST /push/unsubscribe`** : `{ endpoint }` → `{ success:true }`. 400 `Endpoint requis`. **Pas de rate-limit.**
- **`POST /push/subscribe/dechets`** : store `mat:subs:dechets`. 400 `Subscription invalide`. `{ success:true, total }`.
- **`POST /push/subscribe/meteo`** : store `mat:subs:meteo`, champ `minLevel` (`Number(sub.minLevel)||2`) ;
  **upsert** par endpoint (met à jour le seuil si déjà présent). `{ success:true, total }`.
  - *Migration one-shot* au démarrage : si `mat:subs:meteo` absent, peuplé depuis `mat:subs` (`minLevel:2`).
- **`POST /notify/register-token`** : `{ token, sub }` requis → met à jour la subscription liée au token
  (re-`setex` TTL 1 an). 400 `token et sub requis`. Succès `{ ok:true, updated:<bool> }`.

## VAPID & envoi (`lib/webpush.js`, `lib/push-notify.js`)

- **VAPID** configuré (`setVapidDetails`) **uniquement** si `VAPID_PUBLIC_KEY` **et** `VAPID_PRIVATE_KEY`
  sont présentes ; sinon `sendNotification` échoue silencieusement côté librairie.
- **`sendPushToToken`** : `urgency:'normal', TTL:86400` ; retours best-effort (`{ skipped, reason }` :
  *no token* / *token not found* / *no subscription* / *subscription expired*, ou `{ sent:true }`).
  Sur 410/404 → suppression de la clé `mat:notify:token:<token>`.
- Les payloads push contiennent un **deep-link** (`data.url`, ex. `./#notifs`, `./#actu={id}`).

## Notes d'exploitation

- Les routes `unsubscribe` ne sont **pas** rate-limitées (désinscription toujours possible).
- iOS &lt; 16.4 ne supporte pas le Web Push (limite navigateur, cf. [SFD-08](../specifications/sfd/SFD-08-notifications-push.md)).
