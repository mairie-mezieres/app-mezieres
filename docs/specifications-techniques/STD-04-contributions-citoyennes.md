# STD-04 — Idées, photos, sondages, réactions & RSVP

> [Référentiel STD](README.md) · Fonctionnel : [SFD-04](../specifications/sfd/SFD-04-idees-citoyennes.md),
> [SFD-05](../specifications/sfd/SFD-05-photos-communautaires.md), [SFD-06](../specifications/sfd/SFD-06-sondages.md),
> [SFD-07](../specifications/sfd/SFD-07-agenda-evenements.md)
> Fichiers : `routes/idees.js`, `routes/photos.js`, `routes/sondages.js`, `routes/reactions.js`, `routes/admin-simple.js`.

> **Règle commune (votes/réactions).** Déduplication par `x-device-id` (`/^[\w-]{4,100}$/`) via des
> Sets Redis **sans TTL**. En mode dégradé Redis → 503 `Réactions désactivées`. Erreurs récurrentes :
> 400 `device-id requis`, 400 `id invalide`, 409 `Déjà voté`/`Pas encore voté`, 500 `Erreur serveur`.

## Idées (`routes/idees.js`)

| Méthode | Chemin | Auth | Succès |
|---------|--------|------|--------|
| GET | `/idees` | — | `{ idees, count }` |
| POST | `/idee` | — | `{ success:true }` ou `{ success:true, duplicate:true }` |
| POST | `/idee/:id/vote` | — (device-id) | `{ success:true, votes, voted:true }` |
| DELETE | `/idee/:id/vote` | — (device-id) | `{ success:true, votes, voted:false }` |
| GET | `/admin/ideas` | `x-admin-token` | `{ ideas, count }` |
| DELETE | `/admin/ideas/:id` | `x-admin-token` | `{ ok:true, deleted }` |
| PATCH | `/admin/ideas/:id` | `x-admin-token` | `{ ok:true, idea }` |

- **`POST /idee`** : `text` requis (≤ 500), `cat` (≤ 100, défaut `💡 Autre`). Plafond liste **200**.
  400 `text requis`. Vote : clé `mat:votes:idee:{id}`, 404 `Idée non trouvée`.
- **`PATCH /admin/ideas/:id`** : `{ status, adminComment }`, statut ∈ `[null,"","studying","accepted","rejected"]`,
  commentaire ≤ 500. Push à l'auteur si statut changé et token présent (catalogue `IDEA_STATUS_PUSH` :
  🔍 *en cours d'étude* / ✅ *retenue* / 💡 *retour sur votre idée*). 400 `Statut invalide`, 404 `Idée non trouvée`.

## Photos (`routes/photos.js`)

| Méthode | Chemin | Auth | Rate-limit |
|---------|--------|------|-----------|
| GET | `/photos` | — | — |
| POST | `/photos` | — | 5 / min |
| POST/DELETE | `/photos/:id/vote` | — (device-id) | — |
| DELETE | `/photos/:id` | device-id propriétaire | — |
| GET | `/admin/photos` | `x-admin-token` | — |
| POST | `/admin/photos/:id/approve` | `x-admin-token` | — |
| DELETE | `/admin/photos/:id` | `x-admin-token` | — |

- **`GET /photos`** : uniquement `status==="approved"`, triées par votes ; projection publique
  `{ id, url, desc, lieu, votes, date }` (ni `deviceId`, ni `publicId`).
- **`POST /photos`** : `photoB64` requis (`data:image`), `desc` ≤ 200, `lieu` ≤ 100. **Modération** :
  stocké en `status:"pending"` (invisible jusqu'à approbation). Upload Cloudinary (`mat/galerie`).
  Plafond **300** (purge la plus ancienne non approuvée d'abord). 400 `photoB64 requis…`, 503
  `Stockage photos non configuré`, 500 `Erreur lors de l'envoi`. Succès `{ success:true, id, status:"pending" }`.
- **`DELETE /photos/:id`** (auteur) : 403 `Non autorisé` si `deviceId` ≠ propriétaire ; nettoyage Cloudinary.
- **`POST /admin/photos/:id/approve`** : modération `pending → approved`. **`DELETE /admin/photos/:id`** :
  suppression + Cloudinary. 404 `Photo non trouvée`.

## Sondages (`routes/sondages.js`)

| Méthode | Chemin | Auth |
|---------|--------|------|
| GET | `/sondages` · `/sondages/:id` · `/sondages/:id/results` | — |
| POST | `/sondages/:id/vote` | — (device-id) |
| GET/POST/PATCH/DELETE | `/admin/sondages[...]` | `x-admin-token` |

- **Types** : `texte_libre`, `choix_unique`, `choix_multiple`, `notation_etoiles`.
- **`POST /sondages/:id/vote`** : 400 `Sondage non disponible` (introuvable/inactif/clos), 503
  `Réactions désactivées`, 409 `Déjà participé`, 400 `Option invalide` / `Note invalide (1-5)`.
  Dédup `mat:voted:sondage:{id}` ; réponses libres plafonnées à **200** (≤ 500 car. chacune) ;
  notation recalcule la moyenne. Succès `{ ok:true, total, reponses, counts, distribution, average }`.
- **`POST /admin/sondages`** : `titre` (≤ 200) et `type` requis, `type` validé, `description` ≤ 500,
  **≤ 10 options** (≤ 200 car.). 400 `titre et type requis` / `type invalide`. **`PATCH`** : 404
  `Sondage non trouvé`. **`DELETE`** : supprime aussi `mat:sondage:results:{id}`.

## Réactions « j'aime » & RSVP (`routes/reactions.js`)

- **`GET /config/features`** → `{ reactionsEnabled }` (false en mode dégradé).
- **`POST /actu/:id/like`** (toggle) → `{ count, liked }`, clé `mat:likes:actu:{id}` (cf. [STD-02](STD-02-actualites-publication.md)).
- **`GET /event/:uid/rsvp`** → `{ count, rsvp }` (`{count:0,rsvp:false}` en erreur).
- **`POST /event/:uid/rsvp`** (toggle, device-id requis) → `{ count, rsvp }`. Clés
  `mat:rsvp:event:{uid}` (Set dédup) + `mat:rsvp:event:{uid}:count` (compteur clampé ≥ 0).
  503 `Réactions désactivées`, 400 `device-id requis`, 500 `Erreur serveur`.

## « Le saviez-vous ? » — répartition des réponses (`routes/reactions.js`)

Alimente la ligne « X % des Macérien(ne)s ont répondu comme vous »
(cf. [SFD-16](../specifications/sfd/SFD-16-le-saviez-vous.md)).

- **`GET /saviezvous/:id`** → `{ oui, non, moi }`. En erreur, renvoie
  `{oui:0,non:0,moi:false}` : le frontend masque alors simplement le pourcentage.
- **`POST /saviezvous/:id`** — corps `{ reponse: "oui"|"non" }`, device-id requis →
  `{ oui, non }`. Clés `mat:sv:votants:{id}` (Set dédup) + `mat:sv:count:{id}` (JSON
  `{oui, non}`).
  400 `identifiant invalide`, 400 `réponse attendue : oui ou non`, 400 `device-id requis`,
  503 `Réactions désactivées`, 500 `Erreur serveur`.

**Deux particularités par rapport aux RSVP ci-dessus :**

- **Pas de bascule** — une seule réponse par appareil et par fait, sans retour arrière. La
  répartition doit refléter les premières intuitions, pas un vote corrigé après avoir lu
  la réponse. Un second `POST` renvoie la répartition inchangée.
- **Le contenu du fait n'est pas ici.** Le backend ne connaît que des identifiants et des
  compteurs ; les questions, réponses et sources vivent dans `data/saviez-vous.json` du
  dépôt frontend, versionnées et relues (voir
  [ADR-0010](../adr/0010-saviez-vous-corpus-verifie-sans-ia-a-l-execution.md)).

Le format d'identifiant (`^[a-z0-9-]{2,64}$`) est validé côté route : `safeId` de
`lib/validate.js` ne vaut que pour des entiers. Le nombre de clés Redis est borné par la
taille du corpus, il n'y a donc pas de croissance à purger.
