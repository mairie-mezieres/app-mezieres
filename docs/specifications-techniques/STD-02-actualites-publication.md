# STD-02 — Actualités, webhook Facebook & publication multi-canal

> [Référentiel STD](README.md) · Fonctionnel : [SFD-01](../specifications/sfd/SFD-01-actualites.md) ·
> Architecture : [import webhook](../architecture.md#42-import-dactualité--webhook-facebook),
> [publication multi-canal](../architecture.md#43-publication-multi-canal-back-office)
> Fichiers : `routes/webhook.js`, `routes/admin-actus.js`, `routes/admin-simple.js`, `routes/reactions.js`, `lib/actu.js`.

## Routes

| Méthode | Chemin | Auth | Notes |
|---------|--------|------|-------|
| GET | `/webhook` | `VERIFY_TOKEN` | vérification d'abonnement Facebook |
| POST | `/webhook` | HMAC-SHA256 | réception des posts `#MAT` |
| GET | `/actus` · `/admin/actus` | — · `x-admin-token` | liste publique / admin |
| POST | `/admin/actus/add` | `x-admin-token` | publication atomique multi-canal |
| PATCH | `/admin/actus/:id` | `x-admin-token` | mise à jour + re-publication optionnelle |
| DELETE | `/admin/actus/:id` | `x-admin-token` | suppression (+ nettoyage Cloudinary) |
| POST | `/admin/push/schedule` | `x-admin-token` | programmation de push |
| DELETE | `/admin/push/schedule/:id` | `x-admin-token` | annulation |
| GET | `/admin/push/history` | `x-admin-token` | historique des push |
| GET | `/admin/calendar/day` | `x-admin-token` | événements agenda d'un jour |
| GET | `/actu/:id/likes` · POST `/actu/:id/like` | — (device-id) | réactions « j'aime » |

## Webhook Facebook (`/webhook`)

- **`GET /webhook`** : si `hub.mode==="subscribe"` et `hub.verify_token===VERIFY_TOKEN` → renvoie
  `hub.challenge` (texte). Sinon **403**.
- **`POST /webhook`** : **fail-closed HMAC** — 503 si `FACEBOOK_APP_SECRET` absent ; 403 si
  `x-hub-signature-256` absente/invalide ; sinon **200 `EVENT_RECEIVED`** (ACK immédiat, traitement
  asynchrone). Seuls les posts `feed` contenant `#MAT` (`/#MAT\b/i`) sont traités.
- **Traitement** (`handleFacebookPublication`) : déduplication (`postKey` dans `mat:seen_posts`,
  plafond 500) ; titre = 1re ligne (≤ 150 car.), description = reste (≤ 3000 car.), hashtag retiré ;
  image résolue via Graph API → **upload Cloudinary** (dossier `mat/actus`, fetch source 10 s) ;
  stockage `mat:actus` (plafond **30**) ; **push** à tous les abonnés (`mat:subs`, TTL 86400 s,
  urgency high) ; purge des endpoints morts (410/404).

## `POST /admin/actus/add` — publication atomique

- **Entrée** : `title` (requis, ≤ 150), `description` (≤ 3000), `imageBase64` (data URL),
  `imageUrl` (repli), `eventDate` (ISO), `eventLocation` (≤ 200), `publishFacebook` (défaut `true`),
  `sendPush` (défaut `true`), `createCalendar` (défaut `true`, ignoré sans `eventDate`).
- **Pipeline avec rollback** : Cloudinary → **Facebook** (publication **sans** `#MAT`) → Redis → push →
  Google Agenda (upsert, dédup par similarité de titre &gt; 0,6). **Si Facebook échoue, l'image
  Cloudinary est supprimée (rollback) et la requête renvoie 502.** Push et Agenda sont **non bloquants**
  (échecs cumulés dans `warnings[]`).
- **Succès (200)** : `{ ok, actu, facebook, cloudinary, push, calendar, warnings:[] }`.
- **Codes d'erreur** : 400 (`title requis` / `imageBase64 requis…`), 500 (`Cloudinary: …`), 502 (`Facebook: …`).

## Autres endpoints admin

- **`PATCH /admin/actus/:id`** : champs optionnels (≤ 150 / ≤ 3000 / ≤ 200) ; 404 `Actu non trouvée` ;
  re-publication FB/push/agenda optionnelle (erreurs en `warnings`).
- **`DELETE /admin/actus/:id`** : supprime l'image Cloudinary si `photoPublicId` ; 404 `Actu non trouvée`,
  502 `Suppression Cloudinary impossible : …`, succès `{ ok:true, deleted, cloudinary }`.
- **`POST /admin/push/schedule`** : `{ title (≤150, requis), body (≤300), photoUrl, scheduledAt (requis), actuId }`
  → stocké dans `mat:push:scheduled`. Un **cron interne (60 s)** envoie les push dus (marquage `sent`
  **avant** envoi pour éviter la boucle ; abandon après **3** tentatives ; purge &gt; 7 jours).
- **`GET /admin/push/history`** → `{ history, aliveSubs }`.
- **`GET /admin/calendar/day`** : query `date` (requise) → `{ ok:true, events:[…] }` ; 400 `date requise…`,
  200 `{ ok:false, … "Calendar non configuré" }`, 500 `{ ok:false, error }`.

## Réactions « j'aime » (`/actu/:id/like`)

- **`GET /actu/:id/likes`** → `{ count, liked }` (toujours 200, `{count:0,liked:false}` en erreur).
- **`POST /actu/:id/like`** (toggle, device-id requis) → `{ count, liked }`. Clé `mat:likes:actu:{id}`.
  Erreurs : 503 `Réactions désactivées`, 400 `device-id requis`, 500 `Erreur serveur`.
