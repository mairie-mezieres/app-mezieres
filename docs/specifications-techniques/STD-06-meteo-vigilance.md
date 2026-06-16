# STD-06 — Météo, vigilance & rappels déchets

> [Référentiel STD](README.md) · Fonctionnel : [SFD-09](../specifications/sfd/SFD-09-meteo-vigilance.md),
> [SFD-10](../specifications/sfd/SFD-10-dechets-collecte.md) ·
> Architecture : [météo & vigilance (cron)](../architecture.md#46-météo--vigilance-cron-automatique)
> Fichiers : `routes/meteo.js`, `lib/meteo.js`, `routes/admin-email.js` (`/cron/meteo`), `index.js` (`/cron/dechets`).

## Routes

| Méthode | Chemin | Auth | Notes |
|---------|--------|------|-------|
| GET | `/meteo/forecast` | — | prévisions locales (cache 30 min) |
| GET | `/meteo/commune` | — | prévisions + vigilance dépt 45 |
| GET | `/meteo/alertes/check` | — | contrôle d'alerte (polling/cron-job) |
| GET | `/cron/meteo` | `CRON_SECRET` | vérification + push météo |
| GET | `/cron/dechets` | `CRON_SECRET` | rappel de collecte |

## Météo (`routes/meteo.js`)

- **`GET /meteo/forecast`** : cache mémoire 30 min → Redis 30 min → Open-Meteo (timeout 15 s) → stale.
  Succès `{ …data, stale, cacheTime, source }` (`source ∈ memory|redis|open-meteo|*-stale`).
  503 `{ error: 'Météo indisponible', detail }`.
- **`GET /meteo/commune`** : `Promise.all(forecast, vigilance Météo-France dept 45)` (vigilance en
  `.catch(()=>null)`, timeout 15 s). Succès `{ forecast, vigilance, stale, cacheTime, source }`.
  500 `{ error: "Météo indisponible", detail }`.
- **`GET /meteo/alertes/check`** : query `force=true` ignore la déduplication.
  - **Seuils** : push si `level ≥ AUTO_PUSH_WEATHER_MIN_LEVEL` (défaut **2**/jaune) ; post Facebook si
    `level ≥ AUTO_POST_MIN_LEVEL` (défaut **3**/orange) **et** `AUTO_POST_WEATHER_ALERTS===true`.
  - **Déduplication** : `mat:weather:last:push` (re-notification bloquée **12 h** pour même niveau +
    phénomène, `isSameWeatherAlert`).
  - Réponses (toutes 200 sauf exception) : `{ status:"no-alert" }`, `{ status:"below-threshold", … }`,
    `{ status:"duplicate", … }`, `{ status:"published"|"stored", … }`, `{ status:"auth-error",
    source:"meteo-france", details:"Token vigilance invalide" }` ; sinon `<status||500>
    { error:"Contrôle alerte impossible", details }`.
  - **Push météo** : filtre par `minLevel` de l'abonné, `urgency:high, TTL:86400`, purge 410/404,
    `recordPushHistory`. **Jamais** de faux « aucune alerte » si l'API échoue.

## `GET /cron/meteo`

- **Auth** : `CRON_SECRET` (`?key=`). Query `force=1`.
- Envoie un push **uniquement** si `vigilance.level ≥ AUTO_PUSH_WEATHER_MIN_LEVEL` ; dédup via
  `mat:weather:last:push` + `isSameWeatherAlert` ; écrit l'état après envoi.
- Réponses : 401 `Clé cron invalide` ; 200 `{ ok:true, status:"no-alert", level }` /
  `{ status:"duplicate", … }` / `{ status:"pushed", level, upcoming, phenomenon, push }` ;
  500 `{ ok:false, error }`.

## `GET /cron/dechets`

- **Auth** : `CRON_SECRET` (`?key=`). Query `force=1` ignore la déduplication.
- **Déduplication journalière** : `mat:dechets:lastSent` (date `YYYY-MM-DD` Europe/Paris). Si déjà
  envoyé → 200 `{ ok:true, skipped:true, reason:'Déjà envoyé aujourd\'hui' }`.
- Calcule le type de collecte (`noir`/`jaune`/`both`/aucun), envoie un push aux abonnés
  `mat:subs:dechets`, purge les endpoints morts.
- Réponses : 401 `Clé cron invalide`, 200 `{ ok:true, sent:true }`, 500 `{ ok:false, error }`.

> **Planification interne.** Le serveur déclenche aussi le rappel déchets toutes les 5 min entre
> 18 h–21 h (Paris) et un polling météo toutes les ~15 min — en complément des appels cron externes.
> Le calcul des jours fériés (zone B) est dans `lib/dates.js`.
