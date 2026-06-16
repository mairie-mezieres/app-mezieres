# STD-00 — Conventions techniques transverses

> [Référentiel STD](README.md) · S'applique à **toutes** les routes du backend `chatbot-mairie-mezieres`.

Règles techniques communes à l'ensemble de l'API, numérotées `RT-x` (référençables depuis les
documents de domaine).

## 1. Authentification

- **RT-1 — Routes publiques.** La plupart des routes citoyennes sont **sans authentification**.
  L'identification technique se fait par l'en-tête **`x-device-id`** (anonyme) lorsqu'une
  déduplication est nécessaire (votes, quotas).
- **RT-2 — Back-office (`/admin/*`).** En-tête **`x-admin-token`** comparé en **temps constant**
  (SHA-256 puis `crypto.timingSafeEqual`) à `ADMIN_PASSWORD` **ou** `ADMIN_PASSWORD2`.
  - **Fail-closed** : si `ADMIN_PASSWORD` n'est pas défini → `401 { error: "Admin désactivé (ADMIN_PASSWORD manquant)" }`.
  - Token absent/invalide → `401 { error: "Non autorisé" }`.
  - Le `POST /admin/login` renvoie le jeton (qui **est** la valeur du mot de passe admin) ; pas de session, pas de rôles granulaires.
- **RT-3 — Anti-force brute admin.** Limiteur sur les routes `adminAuth` : **20 tentatives / 15 min**,
  `skipSuccessfulRequests` (seuls les échecs comptent) → dépassement `429 { error: "Trop de tentatives. Réessayez dans quelques minutes." }`. Le `POST /admin/login` a son propre limiteur : **8 / 5 min** → `429 { error: "Trop de tentatives de connexion. Patientez 5 minutes." }`.
- **RT-4 — Tâches planifiées (`/cron/*`).** Clé en query **`?key=`** comparée à `CRON_SECRET`.
  Absente/invalide ou `CRON_SECRET` non défini → `401 { error: 'Clé cron invalide' }`.
- **RT-5 — Webhooks signés.** Webhook Facebook : **HMAC-SHA256** sur le corps brut
  (`x-hub-signature-256`), fail-closed (`503` si `FACEBOOK_APP_SECRET` absent, `403` si signature
  absente/invalide). Webhook Trello : **HMAC-SHA1** (`x-trello-webhook`) **optionnel** (vérifié
  seulement si `TRELLO_WEBHOOK_SECRET` est défini) → `401` si invalide. Comparaisons en temps constant.

## 2. Format des réponses

- **RT-6 — Erreurs JSON.** Les erreurs métier sont renvoyées en JSON `{ "error": "<message>" }`
  (parfois enrichi : `{ error, reply }` pour MEL, `{ ok:false, error }` ailleurs). Quelques
  endcondpoints renvoient un **corps vide** (`res.end()` / `res.sendStatus(...)`) — voir le domaine.
- **RT-7 — Succès.** Forme variable selon l'endpoint : `{ success:true, … }`, `{ ok:true, … }`, ou
  l'objet métier directement. Documentée par endpoint.
- **RT-8 — Pas de handler 404/erreur global personnalisé.** Une route inconnue retombe sur le 404
  par défaut d'Express ; une exception non capturée dans une route sans `try/catch` produit un 500
  générique Express. Sentry capture les erreurs si `SENTRY_DSN` est défini.

## 3. Limites & robustesse

- **RT-9 — Taille du corps.** `express.json` limité à **256 Ko** par défaut ; **6 Mo** pour les
  routes à média (`/signal`, `/photos`, `/admin/actus/add`, `/admin/entreprises[...]`, `/admin/mascotte`).
  Dépassement → **413** (géré par Express).
- **RT-10 — Rate-limiting par domaine** (`express-rate-limit`, par IP) :

  | Limiteur | Fenêtre | Max | Routes |
  |----------|---------|-----|--------|
  | MEL / parcours | 60 s | 30 | `POST /mel`, `POST /api/parcours` |
  | Signalements | 60 s | 10 | `POST /signal` |
  | Upload photos | 60 s | 5 | `POST /photos` |
  | Abonnement push | 60 s | 20 | `POST /push/subscribe[...]`, `/push/status`, `/push/test` |
  | Enregistrement token | 60 s | 20 | `POST /notify/register-token` |
  | Logs PWA | 60 s | 60 | `POST /logs/error` |
  | Login admin | 5 min | 8 | `POST /admin/login` |
  | Auth admin (échecs) | 15 min | 20 | toutes les routes `adminAuth` |

- **RT-11 — Timeouts sortants.** Axios par défaut **8 s**. Surcharges notables : Mistral MEL **20 s**,
  génération de parcours **25 s**, Open-Meteo / Météo-France **15 s**, proxy iCal **10 s**, IGN PLU
  **8 s**, Overpass **30 s**, création de carte Trello **15 s**, pièce jointe Trello **30 s**
  (corps ≤ 10 Mo), Upstash Redis **8 s**.
- **RT-12 — Quotas Redis (Upstash) & mode dégradé.** Quota **10 000 commandes/jour** (et 500 000/mois,
  suivis au tableau de bord). Sur réponse **429** d'Upstash, le backend bascule en **mode dégradé
  jusqu'à minuit UTC** : les opérations de Set (déduplication votes/réactions) sont court-circuitées
  et les réactions/votes renvoient `503 { error: "Réactions désactivées" }`. Le quota MEL bascule sur
  un compteur **mémoire** (flush vers Redis toutes les 2 min et à l'arrêt). `GET /health` expose
  `mode: "degraded" | "normal"`.
- **RT-13 — Plafonds de stockage (listes Redis).** Actualités **30**, idées **200**, signalements **100**,
  photos **300**, posts Facebook vus **500**, historique push **50**, réponses libres de sondage **200**,
  options par sondage **10**, logs d'erreur **200**, cache de réponses MEL **300**.

## 4. Sécurité & en-têtes

- **RT-14 — En-têtes de sécurité** (sur toutes les réponses) : `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.
- **RT-15 — CORS.** Routes publiques : `Access-Control-Allow-Origin: *`. Routes `/admin/*` :
  origine autorisée **uniquement** si elle figure dans la liste blanche
  (`mairie-mezieres.github.io`, `mezieres-lez-clery.fr`, `localhost:8080/3000`, `127.0.0.1:8080`) +
  `Vary: Origin`. En-têtes autorisés : `Content-Type, x-admin-token, x-device-id`. Méthodes :
  `GET, POST, PUT, PATCH, DELETE, OPTIONS`. Préflight `OPTIONS` → `200`.
- **RT-16 — `trust proxy`.** `app.set('trust proxy', 1)` (Render derrière reverse proxy) : `req.ip`
  et les rate-limiters s'appuient sur l'IP réelle transmise.
- **RT-17 — Validation `x-device-id`.** Pour les votes/réactions, le device-id doit matcher
  `/^[\w-]{4,100}$/`, sinon il est ignoré (`null`) et la requête est rejetée en `400 { error: "device-id requis" }`.

## 5. Données personnelles & minimisation

- **RT-18 — Champs privés masqués en sortie publique.** Les vues publiques retirent les champs
  techniques : `notifyToken` (signalements), `deviceId`/`publicId` (photos), liste brute des
  appareils `allDevices` (statistiques). Les signalements publics sont **anonymisés** (téléphone →
  `[tél. masqué]`, email → `[email masqué]`).
- **RT-19 — Journalisation MEL.** Désactivée par défaut (`melQuestionLogEnabled`), rétention **90 jours**
  quand activée (question ≤ 500 car., réponse ≤ 2000 car.). Cf. [SFD-15](../specifications/sfd/SFD-15-supervision-conformite.md).

## 6. Arrêt propre

- **RT-20 — SIGTERM / SIGINT.** À l'arrêt (redéploiement Render, ~30 s avant kill), le serveur
  **flushe les statistiques** et les **quotas MEL** en attente vers Redis avant de fermer, évitant la
  perte de ~5 min de compteurs.

---

> Détail des constantes : `config.js` (backend). Les seuils chiffrés cités ici reflètent le code à la
> date de rédaction et doivent être revérifiés lors d'une évolution.
