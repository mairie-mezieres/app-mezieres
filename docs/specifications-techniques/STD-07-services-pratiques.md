# STD-07 — Services pratiques (carburant, PLU/géo, entreprises, documents, bannière, mascotte)

> [Référentiel STD](README.md) · Fonctionnel : [SFD-11](../specifications/sfd/SFD-11-services-pratiques.md)
> Fichiers : `routes/carburant.js`, `routes/geo.js`, `routes/events-locaux.js`, `routes/entreprises.js`,
> `routes/docs.js`, `routes/info-banner.js`, `routes/mascotte.js`, `routes/core.js`.

## Routes publiques

| Méthode | Chemin | Auth | Succès |
|---------|--------|------|--------|
| GET | `/carburant` | — | prix 5 stations (cache 1 h) |
| GET | `/api/zone-plu` | — | `{ ok:true, zone, liblong, partition }` |
| GET | `/api/chemins` | — | `{ ok:true, count, elements }` |
| GET | `/events-locaux` | — | clé OpenAgenda côté client |
| GET | `/entreprises` | — | `{ entreprises }` |
| GET | `/docs/temp` · `/docs/featured` | — | listes documents |
| GET | `/info-banner` · `/migration-status` | — | bannière / overlay migration |
| GET | `/config/mascotte` | — | `{ active, url }` |
| GET | `/` · `/status` · `/calendar-proxy` | — | santé / proxy iCal |

## Carburant & géo

- **`GET /carburant`** : cache Redis `mat:carburant:v10` (TTL **3600 s**) ; 5 stations interrogées sur
  data.economie.gouv.fr (timeout 8 s, repli v2.1 → v1). Succès `{ _ts, clery, meung, olivet,
  beaugency, saintpryve }`. 500 `{ error: <e.message> }`.
  Chaque station porte `{ label, sp95, gazole, sp95Maj, sp95MajISO, gazoleMaj, gazoleMajISO,
  maj, majISO }` : les `maj*` sont des chaînes d'affichage **« JJ/MM HH:MM » sans année** —
  incomparables d'une station à l'autre — et les `*ISO` les horodatages bruts, dont l'app a besoin
  pour savoir quel relevé est le plus récent (cf. SFD-11 RG-11.2 ter).
  ⛔ **Chaque carburant porte SA date** : les stations les déclarent séparément (le Leclerc de
  Tavers servait un SP95 du 08/09 sous un gazole du 16/09). `maj` / `majISO` au niveau de la
  station valent le **plus ancien** des relevés affichés — la seule date qui ne mente sur aucun
  des deux prix que montre le bandeau d'accueil. ⚠️ Le repli SP95 → E10 emporte la date du E10.
  ⛔ **Le flux ne porte AUCUNE enseigne** (`id`, `cp`, `adresse`, `ville`, prix) : la
  correspondance par marque ne matche jamais, c'est `liste[0]` qui désigne les stations —
  l'avoir restreint a vidé trois cartes sur six en production. Le repli n'est refusé que si
  **deux de nos stations** partagent le code postal ; là, seul l'**`id`** de jeu de données les
  départage. ⛔ Un `id` se **relève** (`prix-carburants.gouv.fr/station/<id>`), il ne se déduit
  pas. Le **45160 en porte deux** (`45160005` E.Leclerc Olivet, `45160006` relais du Coudray) :
  les renseigner a révélé que `liste[0]` y désignait le **relais**, dont les prix s'affichaient
  donc sous le nom du Leclerc depuis l'origine. Logique pure dans `lib/carburant.js`, testée
  sans réseau sur la **forme réelle** des enregistrements.
  **La clé Redis change avec la forme du payload** : la faire évoluer en même temps qu'un champ,
  sinon l'app reçoit pendant une heure des relevés à l'ancien format. Voir
  `docs/adr/0047-un-carburant-a-sa-propre-date.md`.
- **`GET /api/zone-plu`** : query `lat`/`lon` (requis, numériques) → IGN apicarto (timeout 8 s).
  400 `lat et lon requis` / `lat/lon invalides` ; 200 `{ ok:true, zone:null, message:"Aucune zone PLU
  trouvée (hors périmètre ou PLU non publié)" }` ; 502 `Service IGN indisponible`.
- **`GET /api/chemins`** : Overpass (bbox figée, timeout 30 s). 200 `{ ok:true, count, elements }` ;
  500 `Overpass indisponible`.
- **`GET /events-locaux`** : aucun appel sortant ; renvoie la clé **publique** OpenAgenda au client
  (`{ clientSide:true, key, agendas:[…] }`) ou `{ events:[], nokey:true }`.

## Entreprises (`routes/entreprises.js`)

| Méthode | Chemin | Auth |
|---------|--------|------|
| GET | `/entreprises` · `/admin/entreprises` | — · `x-admin-token` |
| POST | `/admin/entreprises` | `x-admin-token` |
| PUT | `/admin/entreprises/:id` | `x-admin-token` |
| DELETE | `/admin/entreprises/:id` | `x-admin-token` |
| POST | `/admin/entreprises/fix-logos` | `x-admin-token` |

- **`POST`/`PUT`** : `nom` requis (400 `nom requis`). Plafonds : `nom`/`activite` 200, `description`
  1000, `siteWeb`/`logo` 500, `telephone` 50, `email`/`gerant` 200. Logo via `logoBase64` → upload
  Cloudinary (`mat/entreprises`) ; échec → 502 `Logo Cloudinary: <e.message>`. 404 `Entreprise non trouvée`.
- **`POST /admin/entreprises/fix-logos`** : répare les logos Facebook expirés (photo de profil →
  URL Graph permanente ; photo de post → re-upload Cloudinary). Succès `{ ok:true, fixed, skipped, errors? }`.

## Documents, bannière, migration, mascotte

- **`POST /admin/docs/temp`** / **`/admin/docs/featured`** : `title` et `url` requis (400
  `title et url requis`). Plafonds `title` 200, `url` 500, `description` 300, `icon` 10. **Featured** :
  un seul à la fois (`DELETE` → `writeFeaturedDoc(null)`).
- **`POST /admin/info-banner`** : `{ active, title (≤100), text (≤300), icon }` → `mat:info_banner`.
- **`POST /admin/migration`** : `{ active }` **booléen requis** → 400 `Le champ 'active' (boolean)
  est requis`.
- **`POST /admin/mascotte`** : `{ active, imageBase64 }` → upload Cloudinary (`mat/mascotte`).
  400 `Aucune image : téléversez une photo avant d'activer.`, 500 `<e.message>`. `GET /config/mascotte`
  → `{ active, url }` (`publicId` jamais exposé).

## Santé & proxy (`routes/core.js`)

- **`GET /`** : réponse instantanée (health Render, sans Redis) `{ status, version, uptime, routes }`.
- **`GET /status`** : lit Redis → `{ status, version, abonnes, actus, idees, signalements, routes }`.
- **`GET /calendar-proxy`** : proxy iCal Google (CORS `*`, `Content-Type: text/calendar`, timeout 10 s).
  500 (texte) `"GOOGLE_CALENDAR_ICAL non configuré"` / `"Calendrier indisponible"`.
