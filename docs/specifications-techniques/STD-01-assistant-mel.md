# STD-01 — Assistant MEL & génération de parcours

> [Référentiel STD](README.md) · Fonctionnel : [SFD-02](../specifications/sfd/SFD-02-assistant-mel.md) ·
> Architecture : [pipeline MEL](../architecture.md#41-assistant-mel-pipeline-de-réponse)
> Fichiers : `routes/mel.js`, `lib/mel.js`, `lib/text.js`, `routes/geo.js`, `routes/admin-simple.js`.

## Routes

| Méthode | Chemin | Auth | Rate-limit |
|---------|--------|------|-----------|
| POST | `/mel` | — (quota `x-device-id`) | 30 / min |
| POST | `/api/parcours` | — | 30 / min |
| GET | `/mel/tree` | — | — |
| GET | `/admin/mel-tree` | `x-admin-token` | — |
| POST | `/admin/mel-tree` | `x-admin-token` | — |
| GET | `/admin/mel-questions` | `x-admin-token` | — |

## `POST /mel`

- **Entrée** (JSON, ≤ 256 Ko) : `messages` (array, requis), `category` (string, défaut `"autre"`),
  `extraCtx` (string, optionnel — tronqué à 200 car., `<>` retirés). En-tête `x-device-id` (≤ 80 car.,
  sinon repli sur l'IP).
- **Validation** : `messages` doit être un array non vide ; chaque entrée doit avoir
  `role ∈ {user, assistant}` (les `system` injectés sont filtrés) ; historique tronqué aux **8 derniers**
  messages, `content` à **2000** car.
- **Quotas** : **5 questions/jour/device** (`mat:mel:count:<date>:<device>`, TTL 26 h) ;
  garde-fou **60/jour/IP** (`mat:mel:ipcount:…`). En mode dégradé Redis → compteur mémoire.
- **Pipeline de génération** : easter-egg → règles directes (`provider:"direct"`, hors-ligne) →
  cache Redis (TTL 24 h, ou 7 j pour urbanisme/PLU/fibre/cantine/école/crèche/état-civil/passeport/CNI) →
  **Mistral** (`provider:"mistral"`, temp 0.2, max 450 tokens, timeout 20 s) → **Claude (Anthropic)** en
  repli (`provider:"claude"`, max 350 tokens) → **réponse statique** (`provider:"fallback"`).
- **Anti-injection** : ~30 motifs (FR/EN) après désobfuscation leetspeak/Base64 → blocage du device ;
  neutralisation des contextes non fiables (agenda, pages web) avant insertion dans le prompt.
- **Succès (200)** : `{ reply, provider, showElus, showUrbanisme }`. `provider ∈
  {direct, mistral, claude, cache:<provider>, fallback, mel-fangirl-mode}`.
- **Codes d'erreur** : voir [catalogue STD-01](STD-catalogue-erreurs.md#std-01--assistant-mel)
  (400 messages, 503 disabled, 403 blocked, 429 quota/rate-limit, 200 fallback technique).

## `POST /api/parcours`

- **Entrée** (JSON) : `mode` (`pied`|`velo`|`cheval`, requis), `distance` (nombre 1–50 km, requis),
  `style` (`nature`|`patrimoine`|`vignes`|`mixte`, optionnel).
- **Traitement** : Mistral (temp 0.6, max 600 tokens, timeout 25 s) ; nettoyage des balises markdown
  avant `JSON.parse`.
- **Succès (200)** : `{ ok:true, parcours:{ titre, duree, description, conseils, waypoints:[[lat,lng],…] } }`.
- **Codes d'erreur** : 400 (mode/distance/style), 500 (clé manquante / JSON non parsable / génération impossible).

## Arbre MEL (`/mel/tree`, `/admin/mel-tree`)

- **`GET /mel/tree`** (public) → `{ ok:true, tree }` (arbre de catégories/questions consommé par la PWA).
- **`GET /admin/mel-tree`** → `{ ok:true, tree }`.
- **`POST /admin/mel-tree`** : corps `{ tree }` normalisé/validé (`normalizeMelTree`).
  - Catégorie : `label` requis, `ico` (défaut 💬), `needZone` (bool), `openChatDirectly` (bool), `questions[]`.
  - Question : `id`/`label` requis, `directAnswer` = string **ou** `{ text, links:[{label, tel|url}] }`.
  - Erreurs : `400 { ok:false, error: <e.message | "Structure MEL invalide"> }` (arbre non-objet ou
    aucune catégorie valide). Succès : `{ ok:true, tree, categories:<n> }`.
- **`GET /admin/mel-questions`** : query `date` (défaut aujourd'hui) → `{ ok:true, date, questions, count }`
  (journal RGPD, **désactivé par défaut**, TTL 90 j — cf. [RT-19](STD-00-conventions-transverses.md#5-données-personnelles--minimisation)).

## Helpers texte (`lib/text.js`)

`cleanMarkdown` (épuration des réponses), `cleanHtml` (retrait des balises + **troncature 2500 car.**
du contenu web injecté), `normalizeQuestion` (minuscules + sans accents → clé de cache),
`hashKey` (FNV-1a 32 bits → clé de cache).
