# STD — Catalogue consolidé des messages d'erreur

> [Référentiel STD](README.md) · Tous les messages d'erreur renvoyés par l'API backend, **cités
> verbatim**, regroupés par domaine. `<e.message>` / `<…>` = valeur interpolée à l'exécution.

Ce catalogue est la **référence unique** des codes HTTP et messages. Il facilite le support
(rapprocher un message vu côté app de sa cause) et la cohérence (éviter les doublons/divergences).

## Transverse — authentification & limites (STD-00)

| Code | Message (verbatim) | Condition |
|------|--------------------|-----------|
| 401 | `{ error: "Admin désactivé (ADMIN_PASSWORD manquant)" }` | `ADMIN_PASSWORD` non configuré (fail-closed) |
| 401 | `{ error: "Non autorisé" }` | `x-admin-token` absent/invalide |
| 401 | `{ ok:false, error: "Mot de passe incorrect" }` | `POST /admin/login` échoué |
| 401 | `{ error: 'Clé cron invalide' }` | `/cron/*` clé absente/fausse |
| 429 | `{ error: "Trop de tentatives. Réessayez dans quelques minutes." }` | brute-force `adminAuth` (20/15 min) |
| 429 | `{ error: "Trop de tentatives de connexion. Patientez 5 minutes." }` | `POST /admin/login` (8/5 min) |
| 403 / 503 | *(corps vide, `sendStatus`)* | signature/secret webhook Facebook |
| 401 | *(corps vide, `sendStatus`)* | signature webhook Trello invalide |
| 413 | *(par défaut Express)* | corps &gt; 256 Ko (ou 6 Mo sur routes média) |

## STD-01 — Assistant MEL

| Code | Message (verbatim) | Condition |
|------|--------------------|-----------|
| 400 | `{ error:"messages[] requis" }` | `messages` absent ou non-array |
| 400 | `{ error: "messages[] doit contenir au moins une entrée {role:'user'\|'assistant', content:string}" }` | aucun message de rôle valide |
| 503 | `{ error: "disabled", reply: "Le chat MEL est temporairement indisponible. Contactez la mairie au 02 38 45 61 76 😊" }` | MEL désactivé (ou message admin personnalisé) |
| 403 | `{ error:"blocked", reply:"Votre accès au chat a été suspendu pour utilisation abusive. Contactez la mairie si nécessaire : 02 38 45 61 76 😊" }` | device déjà bloqué |
| 403 | `{ error:"blocked", reply:"Votre accès au chat a été suspendu. Contactez la mairie si nécessaire : 02 38 45 61 76 😊" }` | injection détectée → blocage |
| 429 | `{ error:"quota", reply:"Vous avez atteint la limite de 5 questions par jour. Revenez demain ! 😊" }` | quota device/IP atteint |
| 429 | `{ error: "Trop de requêtes, réessayez dans une minute." }` | rate-limit MEL (30/min) |
| 200 | `{ reply:"Je rencontre une difficulté technique. Contactez la mairie au 02 38 45 61 76 ou mairie@mezieres-lez-clery.fr 😊", provider:"fallback" }` | exception interne (renvoyée en succès, jamais de fausse info) |

**Génération de parcours** (`POST /api/parcours`) :

| Code | Message (verbatim) | Condition |
|------|--------------------|-----------|
| 400 | `{ error: "mode invalide (pied\|velo\|cheval)" }` | `mode` hors valeurs |
| 400 | `{ error: "distance invalide (1–50 km)" }` | `distance` falsy / &lt;1 / &gt;50 |
| 400 | `{ error: "style invalide" }` | `style` fourni mais inconnu |
| 500 | `{ error: "MISTRAL_API_KEY manquante" }` | clé Mistral absente |
| 500 | `{ error: "Réponse Mistral non parsable", raw: <clean> }` | JSON Mistral invalide |
| 500 | `{ ok: false, error: "Génération impossible", details: <e.message> }` | erreur d'appel |

## STD-02 — Actualités & publication

| Code | Message (verbatim) | Condition |
|------|--------------------|-----------|
| 400 | `{ error: "title requis" }` | `POST /admin/actus/add` sans titre |
| 400 | `{ error: "imageBase64 requis pour publier sur Facebook avec image" }` | publication FB sans image |
| 500 | `{ ok: false, error: "Cloudinary: " + <e.message> }` | échec upload image |
| 502 | `{ ok: false, error: "Facebook: " + <e.message> }` | échec publication FB (rollback Cloudinary effectué) |
| 404 | `{ error: "Actu non trouvée" }` | `PATCH/DELETE /admin/actus/:id` id absent |
| 502 | `{ error: "Suppression Cloudinary impossible : " + <e.message> }` | échec nettoyage image à la suppression |
| 400 | `{ error: "title et scheduledAt requis" }` | `POST /admin/push/schedule` incomplet |
| 400 | `{ error: "date requise (YYYY-MM-DD)" }` | `GET /admin/calendar/day` sans date |

> Le webhook Facebook (`/webhook`) ne renvoie que des `sendStatus` (200 `EVENT_RECEIVED`, 403, 503).

## STD-03 — Signalements & demandes

| Code | Message (verbatim) | Condition |
|------|--------------------|-----------|
| 429 | `{ error: "Trop de signalements, patientez avant de réessayer." }` | rate-limit `POST /signal` (10/min) |
| 502 | `{ signalements: [], bugs: [], error: 'Service temporairement indisponible' }` | `GET /api/signalements` Trello KO |
| 502 | `{ signals: [], count: 0, error: 'Trello temporairement indisponible' }` | `GET /admin/signals` Trello KO |
| 400 | `{ error: "Statut invalide" }` | `PATCH /admin/signals/:id` statut hors liste |
| 503 | `{ error: "Trello non configuré" }` | clés Trello absentes |
| 422 | `{ error: "Aucune liste Trello ne correspond au statut « <status> ». Renommez une liste (ex. « En cours », « Résolu ») ou créez-la." }` | aucune liste ne mappe le statut |
| 502 | `{ error: <e.response.data \| e.message> }` | erreur API Trello (statut/suppression) |
| 400 / 503 / 404 / 502 | *(corps vide `.end()`)* | proxy image Trello (params invalides / non configuré / introuvable / amont KO) |
| 400 | `{ error: "Aucune liste SIG/BUG configurée" }` | enregistrement webhook Trello sans board |

## STD-04 — Idées, photos, sondages, réactions

| Code | Message (verbatim) | Condition |
|------|--------------------|-----------|
| 400 | `{ error: "text requis" }` | `POST /idee` sans texte |
| 400 | `{ error: "photoB64 requis (data:image/...)" }` | `POST /photos` sans image valide |
| 503 | `{ error: "Stockage photos non configuré" }` | Cloudinary désactivé |
| 500 | `{ error: "Erreur lors de l'envoi" }` | échec upload photo |
| 503 | `{ error: "Réactions désactivées" }` | mode dégradé Redis ou réactions off (votes/likes/RSVP) |
| 400 | `{ error: "device-id requis" }` | `x-device-id` absent/invalide |
| 400 | `{ error: "id invalide" }` | identifiant non numérique |
| 409 | `{ error: "Déjà voté", voted: true }` | vote en double (idée/photo) |
| 409 | `{ error: "Pas encore voté", voted: false }` | retrait de vote sans vote préalable |
| 404 | `{ error: "Idée non trouvée" }` / `{ error: "Photo non trouvée" }` | cible absente |
| 403 | `{ error: "Non autorisé" }` | suppression photo par un non-propriétaire |
| 500 | `{ error: "Erreur serveur" }` | exception (vote/like/RSVP) |
| 404 | `{ error: "Sondage non trouvé" }` | sondage absent |
| 400 | `{ error: "Sondage non disponible" }` | sondage inactif/clos |
| 409 | `{ error: "Déjà participé", alreadyVoted: true }` | second vote au même sondage |
| 400 | `{ error: "Option invalide" }` | option de sondage inconnue |
| 400 | `{ error: "Note invalide (1-5)" }` | notation hors [1,5] |
| 400 | `{ error: "titre et type requis" }` / `{ error: "type invalide" }` | création de sondage |

## STD-05 — Notifications push

| Code | Message (verbatim) | Condition |
|------|--------------------|-----------|
| 400 | `{ error:"Subscription invalide" }` / `{ error: 'Subscription invalide' }` | abonnement sans `endpoint` |
| 400 | `{ error: "Endpoint requis" }` / `{ error:"Endpoint requis" }` / `{ error: 'Endpoint requis' }` | route push sans endpoint |
| 404 | `{ error: "Abonnement non trouvé sur le serveur — réactivez les notifications" }` | `POST /push/test` sub absente |
| 410 | `{ error: "Abonnement expiré — réactivez les notifications" }` | endpoint expiré (410/404) |
| 500 | `{ error: "Échec d'envoi: " + <message> }` | autre erreur d'envoi de test |
| 429 | `{ error: "Trop de tentatives d'abonnement." }` | rate-limit abonnement (20/min) |
| 400 | `{ error: "token et sub requis" }` | `POST /notify/register-token` incomplet |
| 429 | `{ error: "Trop de requêtes, patientez avant de réessayer." }` | rate-limit register-token |

## STD-06 — Météo, vigilance & déchets

| Code | Message (verbatim) | Condition |
|------|--------------------|-----------|
| 503 | `{ error: 'Météo indisponible', detail: <e.message> }` | `GET /meteo/forecast` KO |
| 500 | `{ error: "Météo indisponible", detail: <e.message> }` | `GET /meteo/commune` KO |
| `<status>\|\|500` | `{ error: "Contrôle alerte impossible", details: <…> }` | erreur vigilance |
| 401 | `{ error: 'Clé cron invalide' }` | `/cron/dechets`, `/cron/meteo` clé KO |
| 500 | `{ ok: false, error: <e.message> }` | erreur cron déchets / météo |

## STD-07 — Services pratiques

| Code | Message (verbatim) | Condition |
|------|--------------------|-----------|
| 400 | `{ ok:false, error:"lat et lon requis" }` / `{ ok:false, error:"lat/lon invalides" }` | `GET /api/zone-plu` |
| 502 | `{ ok:false, error:"Service IGN indisponible" }` | IGN en erreur |
| 500 | `{ ok: false, error: "Overpass indisponible", details: <e.message> }` | `GET /api/chemins` |
| 500 | `{ error: <e.message> }` | `GET /carburant` |
| 500 | `"GOOGLE_CALENDAR_ICAL non configuré"` / `"Calendrier indisponible"` *(texte brut)* | `GET /calendar-proxy` |
| 400 | `{ error: "nom requis" }` | `POST /admin/entreprises` |
| 502 | `{ error: "Logo Cloudinary: " + <e.message> }` | échec upload logo |
| 404 | `{ error: "Entreprise non trouvée" }` | entreprise absente |
| 400 | `{ error: "title et url requis" }` | `POST /admin/docs/*` |
| 400 | `{ error: "Le champ 'active' (boolean) est requis" }` | `POST /admin/migration` |
| 400 | `{ error: "Aucune image : téléversez une photo avant d'activer." }` | `POST /admin/mascotte` |
| 500 | `{ error: <e.message> }` | mascotte (exception upload) |

## STD-08 — Administration

| Code | Message (verbatim) | Condition |
|------|--------------------|-----------|
| 500 | `{ ok:false, error: <e.message> }` | `/admin/settings`, `/admin/dashboard`, MEL tree |
| 400 | `{ ok:false, error: <e.message \| "Structure MEL invalide"> }` | `POST /admin/mel-tree` structure invalide |
| 400 | `{ error: "Statut invalide" }` | `PATCH /admin/ideas/:id` statut hors liste |
| 404 | `{ error: "Idée non trouvée" }` | idée absente |
| 400 | `{ error: "type et beforeDate requis" }` / `{ error: "type inconnu" }` | `POST /admin/purge` |
| 500 | `{ error: <e.message> }` | purge en erreur |

## STD-09 — Supervision & exploitation

| Code | Message (verbatim) | Condition |
|------|--------------------|-----------|
| 500 | `{ error: "PAGE_ACCESS_TOKEN manquant" }` | `GET /setup-webhook` |
| 500 | `{ error: <e.message>, details: <e.response?.data> }` | échec setup webhook |
| 200 | `{ logs: [] }` | `GET /admin/logs` sans Redis |
| 500 | `{ error: <e.message> }` | logs / email stats / upstash-raw |
| 401 | `{ error: 'Clé cron invalide' }` | `/cron/stats`, `/cron/backup` |

> Les routes de diagnostic `GET /debug-mistral` et `GET /debug-calendar` renvoient leurs erreurs en
> **HTTP 200** avec un drapeau `ok:false` et un champ `step` indiquant l'étape échouée (par conception,
> pour faciliter le diagnostic depuis le navigateur).
