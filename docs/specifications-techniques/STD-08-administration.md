# STD-08 — Administration (auth, réglages, tableau de bord, arbre MEL, purge)

> [Référentiel STD](README.md) · Fonctionnel : [SFD-14](../specifications/sfd/SFD-14-administration-backoffice.md)
> Fichiers : `routes/logs.js` (login), `lib/middleware.js`, `routes/admin-simple.js`,
> `routes/admin-dashboard.js`, `routes/admin-purge.js`.

> Toutes les routes `/admin/*` sont protégées par `adminAuth` (cf.
> [RT-2/RT-3](STD-00-conventions-transverses.md#1-authentification)), **sauf** `POST /admin/login`
> (le point d'entrée d'authentification).

## Authentification

- **`POST /admin/login`** (public, rate-limit **8 / 5 min**) : `{ password }` comparé en temps constant
  à `ADMIN_PASSWORD`. 401 `{ ok:false, error: "Mot de passe incorrect" }` ; succès
  `{ ok:true, token: <ADMIN_PASSWORD> }`. **Le jeton renvoyé est la valeur du mot de passe admin**
  (réutilisé ensuite dans l'en-tête `x-admin-token`). Pas de session ni de rôles.

## Réglages (`routes/admin-simple.js`)

- **`GET /admin/settings`** → `{ ok:true, settings }`. **`POST /admin/settings`** met à jour
  `mat:admin:settings` :

  | Réglage | Type | Défaut |
  |---------|------|--------|
  | `melEnabled` | `!== false` | activé |
  | `reactionsEnabled` | `!== false` | activé |
  | `detailedStatsEnabled` | `=== true` | désactivé |
  | `melUsageStatsEnabled` | `=== true` | désactivé |
  | `appOpenStatsEnabled` | `=== true` | désactivé |
  | `melQuestionLogEnabled` | `=== true` | **désactivé** (RGPD, cf. [RT-19](STD-00-conventions-transverses.md#5-données-personnelles--minimisation)) |
  | `melDisabledMessage` | string ≤ 300 | — |

  Erreur : 500 `{ ok:false, error: <e.message> }`.

- **Arbre MEL** (`GET/POST /admin/mel-tree`, `GET /admin/mel-questions`) : voir [STD-01](STD-01-assistant-mel.md#arbre-mel-meltree-adminmel-tree).
- **Idées admin** (`GET /admin/ideas`, `PATCH/DELETE /admin/ideas/:id`) : voir [STD-04](STD-04-contributions-citoyennes.md#idées-routesideesjs).
- **Actus admin** (`GET /admin/actus`, `DELETE /admin/actus/:id`) : voir [STD-02](STD-02-actualites-publication.md).

## Tableau de bord (`routes/admin-dashboard.js`)

- **`GET /admin/dashboard`** : agrège statistiques, abonnés, contenus, consommation Redis et coûts IA.
  - **Quotas Redis** (codés en dur) : `limitMB:256`, `limitDay:10000`, `limitMonth:500000` ;
    `pctDay`/`pctMonth` calculés contre ces seuils.
  - **Coûts IA** : crédits Anthropic (`/v1/organizations/usage`, timeout 8 s) et usage Mistral
    (`/v1/usage`, timeout 8 s) — erreurs capturées en `{ error: <e.message> }`, non bloquantes.
  - Succès : objet `{ ok:true, redis:{…}, ia:{daily, monthly, claude, mistral}, app:{…}, iaCategories:{…},
    settings }`. Erreur globale → 500 `{ ok:false, error: <e.message> }`.

## Purge (`routes/admin-purge.js`)

- **`POST /admin/purge`** : `{ type (requis), beforeDate (requis) }`.
  - **Types** : `actus`, `signals`, `stats_parjour`, `ia_stats_daily`, `ia_categories_parjour`,
    `mel_questions`, `all_before`.
  - `actus` / `all_before` suppriment aussi les **images Cloudinary** (via `photoPublicId`) ;
    `mel_questions` purge `mat:mel:questions:<date>` sur une fenêtre de **90 jours** avant la date limite.
  - **Irréversible** (pas de corbeille). 400 `type et beforeDate requis` / `type inconnu`,
    500 `<e.message>` ; succès `{ ok:true, deleted:<n>, cloudinary?:[…] }`.

> La supervision opérationnelle (diagnostic, statistiques, crons, sauvegarde) est documentée dans
> [STD-09](STD-09-supervision-exploitation.md).
