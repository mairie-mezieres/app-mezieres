# Guide de déploiement « de zéro » — MAT pour votre commune

Ce guide explique **pas à pas** comment mettre MAT en ligne pour une nouvelle
commune, **sans compétence technique avancée**. Comptez **1 à 2 heures** la
première fois (l'essentiel, c'est créer les comptes et copier-coller des clés).

> 🤝 **Pas à pas, pour les non-techniciens** : le site d'entraide
> [MAT · entraide entre communes](https://mairie-mezieres.github.io/mat-communes/)
> reprend ce guide un écran à la fois, avec un carnet de route à imprimer, une
> FAQ et un espace où les communes s'entraident. Ce fichier-ci reste la source
> technique de référence.

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
- **Upstash Free** : 500 000 commandes/mois, 256 Mo, environ 10 Go de bande
  passante (formule mensuelle depuis mars 2025 : l'ancien plafond de « 10 000
  commandes/jour » n'existe plus). Largement suffisant ; au-delà, l'app passe en
  mode dégradé automatiquement.

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
4. ⚠️ **Le fichier `CNAME` de votre copie porte le domaine de Mézières**
   (`mezieres-lez-clery.fr`). Supprimez-le, ou remplacez son contenu par votre
   propre domaine : il ne doit jamais désigner celui d'une autre commune.
5. *(Optionnel)* **Nom de domaine perso** : saisissez-le dans le champ *Custom
   domain* (ex. `mezieres-lez-clery.fr`). GitHub crée alors un fichier `CNAME`
   dans le dépôt ; configurez ensuite les enregistrements DNS chez votre
   registrar comme indiqué par GitHub.

### F. Brancher le front sur votre back
Ce sont **les seuls réglages de code** de la mise en ligne. Dans le dépôt
`app-mezieres` :

**L'URL du backend** (notée à l'étape B), à **3 endroits balisés** `⚙️ RÉPLICATION` :
1. `js/mat-config.js` → la valeur de `window.MAT_API`.
2. `service-worker.js` → la constante `MAT_API` en tête (le service worker ne
   peut pas lire le fichier de config, il garde sa propre copie).
3. `index.html` → les 2 balises `preconnect` / `dns-prefetch` (optimisation,
   facultatif mais recommandé).

> Avant la centralisation, cette URL était codée en dur ~60 fois. Désormais ce
> sont **ces 3 endroits**, tous commentés `⚙️ RÉPLICATION`.

**La clé publique de notification** (étape C) :

4. `js/mat-utils.js` → la constante `VAPID_PUB`, en tête : collez-y **la même
   valeur** que `VAPID_PUBLIC_KEY` côté Render. ⚠️ Sans ce remplacement, le
   téléphone de l'habitant s'abonne avec la clé de Mézières et votre serveur ne
   peut rien lui envoyer : **aucune notification n'arrive**, sans message
   d'erreur visible. (La clé publique n'est pas un secret : elle a sa place dans
   le code. La clé **privée**, jamais.)

**Le suivi d'erreurs Sentry** :

5. `index.html` **et** `admin.html` → la variable `dsn` du bloc « Sentry » :
   collez le DSN de **votre** projet Sentry, ou une chaîne vide `''` pour
   désactiver le suivi. ⚠️ Laissé tel quel, il envoie les erreurs de **votre**
   application dans le tableau de bord de Mézières.

Commitez : GitHub Pages redéploie automatiquement à chaque push sur `main`.
**C'est en ligne. 🎉** Reste à l'adapter à votre commune (§9) et à décider des
tâches automatiques (§10).

---

## 6. Où coller chaque clé ?

| Type de valeur | Où | Comment |
|---|---|---|
| Secrets du **backend** (API keys, tokens, mots de passe) | **Render** → service → **Environment** | une variable par clé (ou via `render.yaml` à la création) |
| URL du **backend** côté front | **Code** `app-mezieres` | `js/mat-config.js` + `service-worker.js` (§5.F) |
| Clé **publique** de notification côté front | **Code** `app-mezieres` | `js/mat-utils.js` → `VAPID_PUB` (§5.F) — la clé privée, jamais |
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
| Pas de notifications push | `VAPID_*` manquantes/incohérentes (régénérez et recollez les deux), ou `VAPID_PUB` de `js/mat-utils.js` resté sur la clé de Mézières (§5.F, point 4). Après un changement de clés, chaque habitant doit réactiver les notifications. |
| Une publication Facebook échoue | Token de Page expiré, ou `PAGE_ACCESS_TOKEN` / `FACEBOOK_PAGE_ID` incorrects. |

Diagnostic intégré : l'admin de votre back propose un onglet **Diagnostic des
services** qui teste chaque intégration et signale les variables manquantes. Voir
aussi `chatbot-mairie-mezieres/GUIDE-ADMIN.md`.

---

## 9. Personnaliser pour votre commune

Votre copie fonctionne, mais **parle encore de Mézières-lez-Cléry** : élus,
coordonnées de la mairie, informations locales, connaissances de l'assistante MEL.
Ces contenus sont répartis dans les deux dépôts ; la liste ci-dessous indique les
principaux, **sans prétendre être exhaustive**.

**Pour tout repérer**, cherchez dans chaque dépôt (sur GitHub : touche `/`, puis
*Search in this repository*) : `Mézières`, `Cléry`, `45204` (code INSEE),
`47.822` (latitude du bourg), `CCTVL` (communauté de communes), `02 38 45 61 76`
(téléphone de la mairie) et `mezieres-lez-clery.fr`.

| Où | Ce qui est propre à Mézières |
|---|---|
| `manifest.webmanifest`, `index.html`, `admin.html` | Nom de l'application, titres, textes d'accueil, coordonnées |
| `js/mat-trombi.js`, `img/trombi/` | Élus et leurs portraits |
| `js/mat-carte3d.js`, `js/mat-eau8.js`, `js/mat-forms.js`, `js/mat-saviez-vous.js` | Coordonnées du bourg, code INSEE |
| `js/mat-mel.js` et `data/mel-tree.json` | Arbre de décision de l'assistante (deux copies à garder en phase) |
| `js/mat-guide-arrivee.js` | Guide d'arrivée des nouveaux habitants |
| `js/mat-widgets.js` | Stations du bandeau carburant |
| `data/conseil.json`, `data/plu-data.json`, `data/saviez-vous.json` | Conseil municipal, urbanisme, « Le saviez-vous ? » |
| Backend : variables `OPEN_METEO_LAT`, `OPEN_METEO_LON`, `VIGIEAU_COMMUNE_INSEE`, `DAILY_STATS_EMAIL` | Valeurs par défaut de Mézières dans `config.js` : renseignez-les sur Render |
| Backend : `config.js` → `VAPID_EMAIL` | Adresse de contact des notifications, écrite en dur |
| Backend : `lib/mel.js` | Connaissances de MEL (`SYSTEM_PROMPT`, `DIRECT_RULES`, `ASSOCIATIONS`, `SOURCES`) et coordonnées de la mairie dans le message de secours |
| Backend : `lib/carburant.js` | Stations suivies |

> ⚠️ **Une information fausse coûte plus cher qu'une information absente** :
> l'assistante MEL répond avec assurance à partir de ce qu'elle trouve. Avant de
> l'ouvrir aux habitants, retirez ce qui concerne Mézières plutôt que de le
> laisser « en attendant ».
>
> ⚠️ Une fois l'application ouverte aux habitants, **modifier un fichier `js/…`
> impose d'incrémenter son `?v=`** et le cache du service worker, sans quoi la
> modification n'arrive jamais sur les téléphones : voir le `CLAUDE.md` du dépôt,
> § Service Worker.

---

## 10. Tâches automatiques (GitHub Actions)

Le dépôt `app-mezieres` contient des tâches automatiques (`.github/workflows/`).
**Sur une copie (fork), GitHub les désactive** jusqu'à ce que vous les activiez
dans l'onglet *Actions*. Activez-les **une par une**, en connaissance de cause :

| Tâche | À activer ? | Ce qu'il lui faut |
|---|---|---|
| `ci.yml`, `e2e.yml`, `validite-html.yml`, `liens-morts.yml` | Oui : contrôles du code, sans secret | Rien |
| `lighthouse.yml` | Après avoir remplacé l'adresse `mezieres-lez-clery.fr` qu'elle audite | Rien |
| `sauvegarde-upstash.yml` | Après avoir remplacé l'adresse du backend de Mézières, **écrite dans le fichier** | Secret `CRON_SECRET` (même valeur que sur Render) |
| `suivi-depot.yml`, `dependabot-auto-merge.yml` | Facultatif (entretien du dépôt) | Rien (`GITHUB_TOKEN` est fourni par GitHub) |
| `veille-techno.yml`, `veille-bulletin.yml`, `veille-municipale.yml`, `veille-suivi.yml` | Facultatif ; la veille municipale décrit Mézières (`veille/commune.yml`) | `CLAUDE_CODE_OAUTH_TOKEN`, `RESEND_API_KEY`, `RESEND_FROM`, `VEILLE_EMAIL_TO` (+ `VEILLE_MUNICIPALE_EMAIL_TO`) |
| `conseil-drive.yml` | **Non** : relève le dossier Drive du conseil municipal de Mézières | — |

Les secrets se saisissent dans *Settings → Secrets and variables → Actions* (§6).

---

> 📌 Ce guide reflète l'état du code à sa rédaction. Les noms exacts des variables
> font foi dans `.env.example` (back) et `js/mat-config.js` (front).
