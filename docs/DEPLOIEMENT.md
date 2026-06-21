# Guide de déploiement « de zéro » — MAT pour votre commune

Ce guide explique **pas à pas** comment mettre MAT en ligne pour une nouvelle
commune, **sans compétence technique avancée**. Comptez **1 à 2 heures** la
première fois (l'essentiel, c'est créer les comptes et copier-coller des clés).

> 💡 Deux façons de répliquer :
> - **Assistée par IA** : le [kit de réplication](REPLICATION.md) génère un site
>   personnalisé via un prompt Claude. Idéal pour partir d'une page blanche.
> - **Manuelle (ce guide)** : vous déployez le code existant tel quel, puis vous
>   l'adaptez. Idéal pour reproduire MAT à l'identique.

---

## 1. Ce que vous déployez, et où

MAT, c'est **deux morceaux** hébergés gratuitement :

| Morceau | Dépôt | Hébergeur | Rôle |
|---|---|---|---|
| **Front** (l'app que voient les habitants) | `app-mezieres` | **GitHub Pages** | Pages HTML/JS statiques (PWA) |
| **Back** (l'API) | `chatbot-mairie-mezieres` | **Render** | Node.js : chatbot, push, météo, photos… |

Le front appelle le back via **une seule URL** (configurable, voir §6). Aucune
base de données à héberger vous-même : l'état est stocké dans **Upstash Redis**
(gratuit).

---

## 2. Choisissez votre niveau (vous pouvez enrichir plus tard)

L'app **démarre et fonctionne en mode dégradé** sans la plupart des services.
Commencez petit, ajoutez les intégrations au fur et à mesure.

| Niveau | Ce que vous obtenez | Comptes à créer |
|---|---|---|
| 🟢 **Minimum** | Portail consultable (agenda, infos, météo de base), admin, notifications push | GitHub (+ Pages), Render, **Upstash** |
| 🟡 **Recommandé** | + Assistant MEL (chatbot), vigilance Météo-France | + **Anthropic** (ou Mistral), + Météo-France |
| 🔵 **Complet** | + Publication Facebook, photos, signalements Trello, agenda Google, e-mails | + Facebook, Cloudinary, Trello, Google, Resend |

---

## 3. Checklist des comptes

Créez-les **dans cet ordre**. Tous ont une offre gratuite suffisante pour une
petite commune.

| # | Service | Niveau | À récupérer | Lien |
|---|---|---|---|---|
| 1 | **GitHub** | 🟢 requis | héberge le **code ET le front** (via **GitHub Pages**) | https://github.com |
| 2 | **Render** | 🟢 requis | (héberge le back) | https://dashboard.render.com |
| 3 | **Upstash** | 🟢 requis | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | https://console.upstash.com |
| — | **Clés VAPID** | 🟢 requis | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (générées, pas de compte) | voir §5.C |
| 4 | **Anthropic** | 🟡 reco | `ANTHROPIC_API_KEY` | https://console.anthropic.com |
| 5 | **Mistral** *(alternative IA)* | 🟡 option | `MISTRAL_API_KEY` | https://console.mistral.ai |
| 6 | **Météo-France** | 🟡 reco | `METEOFRANCE_VIGILANCE_URL` | https://portail-api.meteofrance.fr |
| 7 | **Facebook / Meta** | 🔵 option | `PAGE_ACCESS_TOKEN`, `FACEBOOK_PAGE_ID`, `FACEBOOK_APP_SECRET` | https://developers.facebook.com |
| 8 | **Cloudinary** | 🔵 option | `CLOUDINARY_NAME`, `CLOUDINARY_KEY`, `CLOUDINARY_SECRET` | https://cloudinary.com |
| 9 | **Trello** | 🔵 option | `TRELLO_KEY`, `TRELLO_TOKEN`, IDs de listes | https://trello.com/app-key |
| 10 | **Google Cloud** | 🔵 option | compte de service JSON, `GOOGLE_CALENDAR_ID` | https://console.cloud.google.com |
| 11 | **Resend** | 🔵 option | `RESEND_API_KEY` | https://resend.com |
| 12 | **Sentry** | 🔵 option | `SENTRY_DSN` | https://sentry.io |

> La liste **exhaustive et commentée** des variables est dans
> [`chatbot-mairie-mezieres/.env.example`](https://github.com/mairie-mezieres/chatbot-mairie-mezieres/blob/main/.env.example).

---

## 4. Coûts

Tout est **gratuit pour démarrer**. Points d'attention :
- **Render Free** se met en veille après 15 min d'inactivité (réveil ~30-60 s).
  Pour l'éviter, passez au plan *Starter* (~7 €/mois) ou ajoutez un « ping »
  externe (cron-job.org) toutes les 10 min.
- **Anthropic / Mistral** : à l'usage (quelques euros/mois pour un petit village).
- **Upstash Free** : 10 000 commandes/jour (largement suffisant ; au-delà, l'app
  passe en mode dégradé automatiquement).

---

## 5. Déploiement pas à pas

### A. Préparer le code (GitHub)
1. Créez un compte **GitHub** et connectez-vous.
2. **Forkez** (ou copiez) les deux dépôts dans votre compte/organisation :
   `app-mezieres` et `chatbot-mairie-mezieres`.

### B. Backend sur Render (déploiement « 1-clic »)
1. Sur **Render** → **New +** → **Blueprint**.
2. Connectez votre dépôt **`chatbot-mairie-mezieres`**. Render détecte le fichier
   `render.yaml` (à la racine du dépôt back) et crée le service automatiquement
   (Node 22, build, démarrage, health check).
3. Render **vous demande les variables** : remplissez au minimum `ADMIN_PASSWORD`,
   `UPSTASH_*` (étape D), `VAPID_*` (étape C). Laissez vides les intégrations que
   vous n'utilisez pas encore. `CRON_SECRET` est généré automatiquement.
4. Validez : le service se construit et démarre. Notez son **URL** (ex.
   `https://mon-commune-api.onrender.com`) — vous en aurez besoin à l'étape F.
5. Vérifiez que `https://VOTRE-URL/health` répond `{"status":"ok",...}`.

### C. Générer les clés de notification (VAPID)
Sur votre ordinateur (Node installé), lancez :
```bash
npx web-push generate-vapid-keys
```
Copiez la **Public Key** dans `VAPID_PUBLIC_KEY` et la **Private Key** dans
`VAPID_PRIVATE_KEY` (côté Render). Aucune création de compte n'est nécessaire.

### D. Base Redis (Upstash)
1. Sur **Upstash** → **Create Database** (type *Redis*), région **UE** (ex.
   Frankfurt), nom au choix (ex. `mat-prod`).
2. Dans l'onglet **REST API**, copiez `UPSTASH_REDIS_REST_URL` et
   `UPSTASH_REDIS_REST_TOKEN` → collez-les côté Render.

### E. Frontend sur GitHub Pages
1. Dans votre dépôt **`app-mezieres`** sur GitHub → **Settings** → **Pages**.
2. **Build and deployment** → *Source* = **Deploy from a branch** ; branche =
   **`main`**, dossier = **`/ (root)`**. Le site est statique : aucun build.
3. GitHub publie le site (en quelques minutes) à
   `https://VOTRE-COMPTE.github.io/app-mezieres/`.
4. *(Optionnel)* **Nom de domaine perso** : saisissez-le dans le champ *Custom
   domain* (ex. `mezieres-lez-clery.fr`). GitHub crée alors un fichier `CNAME`
   dans le dépôt ; configurez ensuite les enregistrements DNS chez votre
   registrar comme indiqué par GitHub.

### F. Brancher le front sur votre back ⚙️
C'est **le seul réglage de code**. Dans le dépôt `app-mezieres`, modifiez l'URL
du backend (celle notée à l'étape B) à **3 endroits balisés** :
1. `js/mat-config.js` → la valeur de `window.MAT_API`.
2. `service-worker.js` → la constante `MAT_API` en tête (le service worker ne
   peut pas lire le fichier de config, il garde sa propre copie).
3. `index.html` → les 2 balises `preconnect` / `dns-prefetch` (optimisation,
   facultatif mais recommandé).

> Avant la centralisation, cette URL était codée en dur ~60 fois. Désormais ce
> sont **ces 3 endroits**, tous commentés `⚙️ RÉPLICATION`.

Commitez : GitHub Pages redéploie automatiquement à chaque push sur `main`.
**C'est en ligne. 🎉**

---

## 6. Où coller chaque clé ?

| Type de valeur | Où | Comment |
|---|---|---|
| Secrets du **backend** (API keys, tokens, mots de passe) | **Render** → service → **Environment** | une variable par clé (ou via `render.yaml` à la création) |
| URL du **backend** côté front | **Code** `app-mezieres` | `js/mat-config.js` + `service-worker.js` (§5.F) |
| Secrets des **GitHub Actions** (sauvegarde, veille) | **GitHub** → dépôt → **Settings → Secrets and variables → Actions** | ex. `CRON_SECRET` (même valeur que Render), `RESEND_API_KEY` |

> ⚠️ Les secrets ne vont **jamais** dans le code/dépôt — uniquement dans les
> tableaux de bord Render / GitHub.

---

## 7. Mini-guides des intégrations optionnelles

### Météo-France (vigilance) 🟡
Créez un compte sur le **portail API Météo-France**, abonnez-vous à l'API
*DPVigilance*, et récupérez l'URL du flux « carte vigilance en cours » →
`METEOFRANCE_VIGILANCE_URL`. (La météo courante via Open-Meteo ne demande **aucune
clé** ; ajustez juste `OPEN_METEO_LAT` / `OPEN_METEO_LON` à votre commune.)

### Facebook / Meta (publication automatique) 🔵
1. Ayez une **Page Facebook** pour votre commune.
2. Sur **developers.facebook.com**, créez une **App**.
3. Via le *Graph API Explorer*, générez un **token de Page longue durée** →
   `PAGE_ACCESS_TOKEN`.
4. Récupérez l'**ID de la Page** → `FACEBOOK_PAGE_ID`, et l'**App Secret** →
   `FACEBOOK_APP_SECRET` (validation des webhooks). Choisissez un `VERIFY_TOKEN`
   (chaîne libre).

### Cloudinary (photos communautaires) 🔵
Dans le **Dashboard** Cloudinary, copiez *Cloud name*, *API Key*, *API Secret* →
`CLOUDINARY_NAME`, `CLOUDINARY_KEY`, `CLOUDINARY_SECRET`.

### Trello (signalements & demandes) 🔵
1. Récupérez votre **clé** et un **token** sur https://trello.com/app-key.
2. Créez un tableau avec des listes (À traiter / En cours / Résolu) et notez les
   **IDs de listes** → `TRELLO_LIST_ID_SIG`, `TRELLO_LIST_ID_BUG`,
   `TRELLO_LIST_ID_DEMANDE`.

### Google Agenda 🔵
1. Sur **Google Cloud**, créez un **compte de service**, activez l'API Calendar,
   téléchargez la clé **JSON**.
2. Encodez-la en base64 → `GOOGLE_SERVICE_ACCOUNT_B64`. Partagez votre agenda avec
   l'e-mail du compte de service et notez l'**ID de l'agenda** → `GOOGLE_CALENDAR_ID`.

### Resend (e-mails de stats / veille) 🔵
Créez une clé API → `RESEND_API_KEY`. Sans domaine vérifié, l'expéditeur de test
`onboarding@resend.dev` n'envoie qu'à l'adresse du compte (`DAILY_STATS_EMAIL`).

---

## 8. Vérification & dépannage

| Symptôme | Piste |
|---|---|
| `…/health` ne répond pas | Le service Render démarre encore (cold start, ~1 min), ou une variable requise manque (voir les *Logs* Render). |
| L'app charge mais « Serveur très sollicité » | Backend en réveil à froid (plan Free). Patientez ; envisagez le ping anti-veille ou le plan Starter. |
| Les appels API échouent (front) | L'URL `window.MAT_API` (§5.F) ne pointe pas sur votre back, ou le service worker garde l'ancienne (videz le cache / réinstallez la PWA). |
| L'admin renvoie 401 | `ADMIN_PASSWORD` non défini côté Render. |
| Pas de notifications push | `VAPID_*` manquantes/incohérentes (régénérez et recollez les deux). |
| Une publication Facebook échoue | Token de Page expiré, ou `PAGE_ACCESS_TOKEN` / `FACEBOOK_PAGE_ID` incorrects. |

Diagnostic intégré : l'admin de votre back propose un onglet **Diagnostic des
services** qui teste chaque intégration et signale les variables manquantes. Voir
aussi `chatbot-mairie-mezieres/GUIDE-ADMIN.md`.

---

> 📌 Ce guide reflète l'état du code à sa rédaction. Les noms exacts des variables
> font foi dans `.env.example` (back) et `js/mat-config.js` (front).
