# STD-03 — Signalements, demandes & webhook Trello

> [Référentiel STD](README.md) · Fonctionnel : [SFD-03](../specifications/sfd/SFD-03-signalements.md),
> [SFD-12](../specifications/sfd/SFD-12-contact-demandes.md) ·
> Architecture : [signalement](../architecture.md#44-signalement-citoyen--trello--push)
> Fichiers : `routes/signalements.js`, `routes/trello-webhook.js`, `lib/trello-status.js`, `lib/push-notify.js`.

## Routes

| Méthode | Chemin | Auth | Rate-limit |
|---------|--------|------|-----------|
| POST | `/signal` | — | 10 / min |
| GET | `/signalements` | — | — |
| GET | `/api/signalements` | — | — (cache 60 s) |
| GET | `/api/signalements/photo/:cardId/:attachId` | — | — |
| GET | `/admin/signals` | `x-admin-token` | — |
| PATCH | `/admin/signals/:id` | `x-admin-token` | — |
| DELETE | `/admin/signals/:id` | `x-admin-token` | — |
| HEAD/GET/POST | `/trello/webhook` | HMAC-SHA1 (optionnel) | — |
| POST/GET/DELETE | `/admin/trello/*` | `x-admin-token` | — |

## `POST /signal`

- **Entrée** : `cat` (≤ 200), `desc` (≤ 5000), `lat`/`lon` (numériques, conservés si tous deux finis),
  `photoB64` (`data:image…`), `type` (`bug`|`contact`|sinon signalement), `notifyToken`, `sub`.
- **Typage** : `bug` (type `bug` ou `cat` préfixée `[BUG]`), `demande` (type `contact` ou `[Demande]`),
  sinon `signalement`. Nom de carte Trello préfixé en conséquence (`[BUG]` / `[Demande]` / `[Signalement]`).
- **Effets de bord** : journal `mat:signals` (plafond **100**) ; `registerNotifyToken` si `notifyToken`
  (best-effort) ; **création de carte Trello** (`name` ≤ 512, `desc` ≤ 16384 avec référence `MAT-REF`
  ajoutée, timeout 15 s) ; pièce jointe photo si `data:image…` (timeout 30 s, corps ≤ 10 Mo).
- **Réponse** : **200 `{ success: true }`** uniquement (l'échec Trello est capturé et ignoré — le
  signalement reste journalisé). Rate-limit dépassé → 429 `Trop de signalements…`.

## Lecture des signalements

- **`GET /signalements`** → `{ signalements:[…], count }` (depuis `mat:signals`, **`notifyToken` retiré**).
- **`GET /api/signalements`** → `{ signalements, bugs }` depuis Trello (cache mémoire 60 s).
  Vue **anonymisée** : retrait des lignes techniques, téléphone → `[tél. masqué]`, email →
  `[email masqué]`. Erreur → 502 `Service temporairement indisponible`.
- **`GET /api/signalements/photo/:cardId/:attachId`** : proxy image (params `/^[a-zA-Z0-9]+$/`).
  Réponses **sans corps** : 400 (params), 503 (Trello non configuré), 404 (introuvable), 502 (amont KO),
  succès = flux image (`Cache-Control: public, max-age=3600`).

## Administration des signalements

- **`GET /admin/signals`** → `{ signals, count }` (desc brute, non anonymisée). Erreur → 502 `Trello temporairement indisponible`.
- **`PATCH /admin/signals/:id`** : `{ status }` ∈ `pending|in_progress|resolved`. Déplace la carte vers
  la liste Trello correspondante (mapping par nom de liste, cf. `lib/trello-status.js`). **Push** au
  citoyen si le statut change réellement et que `MAT-REF` est présent (`[Demande]` →
  `sendDemandeStatusPush`, sinon `sendSignalStatusPush`).
  - Erreurs : 400 `Statut invalide`, 503 `Trello non configuré`, **422** `Aucune liste Trello ne
    correspond au statut « … »…`, 502 `<réponse Trello | message>`.
- **`DELETE /admin/signals/:id`** : archive la carte (`closed:true`). 503 / 502 ; succès `{ ok:true, deleted }`.

## Webhook Trello (`/trello/webhook`)

- **`HEAD`/`GET`** → 200 (requis par Trello à la création).
- **`POST`** : HMAC-SHA1 (`x-trello-webhook`) vérifié **seulement** si `TRELLO_WEBHOOK_SECRET` défini
  → 401 si invalide, sinon 200 (ACK, traitement asynchrone). `commentCard` sur `[Demande]` avec
  `MAT-REF` → `sendDemandeCommentPush` ; `updateCard` avec changement de liste → push de statut.
- **`POST /admin/trello/register-webhook`** : 503 `Trello non configuré`, 400 `Aucune liste SIG/BUG
  configurée`, 500 `<réponse | message>` ; succès `{ callbackURL, signatureCheck, results }`.
- **`GET /admin/trello/webhooks`** · **`DELETE /admin/trello/webhooks/:id`** : 503 / 500 ; succès liste / `{ ok:true, deleted }`.

## Messages push de statut (`lib/push-notify.js`)

| Statut | Titre | Corps |
|--------|-------|-------|
| `in_progress` (signalement) | 🔵 Votre signalement est en cours de traitement | La mairie a pris en compte votre signalement. |
| `resolved` (signalement) | ✅ Votre signalement a été résolu | La mairie a traité votre signalement. Merci pour votre contribution ! |
| `in_progress` (demande) | 🔵 Votre demande est en cours de traitement | La mairie a pris en compte votre demande. |
| `resolved` (demande) | ✅ Votre demande a été traitée | La mairie a traité votre demande. Merci ! |
| commentaire (demande) | 💬 Nouveau message de la mairie | *(aperçu 120 car. ou message générique)* |
