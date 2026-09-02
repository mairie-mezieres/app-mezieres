# Guide technique — MAT (Mézières Avec Toi)

> Ce guide s'adresse aux développeurs et aux mainteneurs de l'application. Il couvre l'architecture, le développement local, les déploiements et l'ajout de nouvelles fonctionnalités.

---

## Sommaire

1. [Architecture générale](#1-architecture-générale)
2. [Dépôts et structure des fichiers](#2-dépôts-et-structure-des-fichiers)
3. [Développement local](#3-développement-local)
4. [Variables d'environnement (backend)](#4-variables-denvironnement-backend)
5. [Intégrations tierces](#5-intégrations-tierces)
6. [MEL — l'assistante virtuelle](#6-mel--lassistante-virtuelle)
7. [PWA et service worker](#7-pwa-et-service-worker)
8. [Notifications push](#8-notifications-push)
9. [Webhook Facebook](#9-webhook-facebook)
10. [CI/CD (GitHub Actions)](#10-cicd-github-actions)
10 bis. [Atelier fichiers de l'administration](#10-bis-atelier-fichiers-de-ladministration)
11. [Déploiement](#11-déploiement)
12. [Ajouter une fonctionnalité](#12-ajouter-une-fonctionnalité)
13. [Gestion des secrets](#13-gestion-des-secrets)

---

## 1. Architecture générale

> 🏗️ Pour les **schémas détaillés** (vues de contexte, conteneurs, déploiement, diagrammes de
> séquence des flux métier et modèle de données), voir la
> [documentation d'architecture applicative](architecture.md).
>
> ⚙️ Pour le **contrat technique de l'API** (chaque endpoint : validations, codes HTTP, messages
> d'erreur exacts, limites), voir le [référentiel de spécifications techniques (STD)](specifications-techniques/README.md).

MAT est une application en deux parties indépendantes :

```
┌─────────────────────────────────┐       ┌──────────────────────────────────┐
│  Frontend (app-mezieres)        │       │  Backend (chatbot-mairie-mezieres)│
│  HTML / CSS / JS vanilla        │ HTTP  │  Node.js / Express               │
│  Hébergé sur GitHub Pages       │──────▶│  Hébergé sur Render              │
│  https://mezieres-lez-clery.fr  │       │  https://chatbot-*.onrender.com  │
└─────────────────────────────────┘       └──────────────────────────────────┘
         ▲                                          │
         │ PWA / Service Worker                     │
         │ Cache offline                            ├── Mistral AI (chatbot MEL)
         │                                          ├── Upstash Redis (stockage)
    Navigateur                                      ├── Cloudinary (images)
    (iOS / Android / Desktop)                       ├── Facebook Graph API (actus)
                                                    ├── Trello (signalements/bugs)
                                                    ├── Resend (emails admin)
                                                    └── Météo-France API (vigilances)
```

**Principe clé** : le frontend est entièrement statique (aucun build, aucun bundler). Toutes les dépendances (Leaflet, polices, Sentry) sont auto-hébergées dans le dépôt — aucun CDN tiers.

---

## 2. Dépôts et structure des fichiers

### Frontend — `app-mezieres`

```
app-mezieres/
├── index.html              Point d'entrée unique + tous les overlays
├── admin.html              Interface d'administration (protégée par token)
├── partager.html           Générateur de prompt pour répliquer l'app
├── service-worker.js       Cache offline + réception push
├── manifest.webmanifest    Métadonnées PWA (icônes, couleurs, orientation)
│
├── css/
│   ├── mat.css             Styles principaux (mobile + thèmes)
│   ├── mat-desktop.css     Styles layout desktop (≥ 1024 px)
│   └── fonts.css           Polices auto-hébergées (Nunito)
│
├── js/
│   ├── mat-boot.js         Bootstrap : détection device, thème, onboarding
│   ├── mat-core.js         Météo, déchets, bus, carburants, mairie status
│   ├── mat-actus.js        Actualités Facebook + détail article
│   ├── mat-agenda.js       Agenda (Google Calendar via backend)
│   ├── mat-mel.js          Chatbot MEL (appels backend)
│   ├── mat-widgets.js      Widgets header (météo mini, bus mini…)
│   ├── mat-ambiance.js     Header météo vivant + confettis de célébration
│   ├── mat-forms.js        Signalements, boîte à idées, sondages, bugs
│   ├── mat-trombi.js       Trombinoscope des élus
│   ├── mat-associations.js Liste des associations
│   ├── mat-entreprises.js  Annuaire des entreprises
│   ├── mat-plui.js         Grand dossier PLUi-H-D (page embarquée ; documents via /docs/plui)
│   ├── mat-carte3d.js      Carte 3D du village + zonage PLU (MapLibre chargé à la demande)
│   ├── mat-guide-arrivee.js Guide d'arrivée des nouveaux habitants (embarqué)
│   ├── mat-saviez-vous.js  « Le saviez-vous ? » — fait du jour (corpus + calculs)
│   ├── mat-sondages.js     Sondages citoyens
│   ├── mat-accessibility.js Accessibilité (taille texte, contraste, TTS)
│   ├── mat-desktop.js      Rendu spécifique layout desktop
│   ├── mat-pwa-notif.js    Gestion abonnements push (frontend)
│   ├── mat-dechets-notif.js Notifications rappel collecte
│   ├── mat-eau8.js         Eau (qualité, distribution)
│   ├── mat-jours-feries.js Calcul jours fériés français
│   ├── mat-partager.js     Logique du générateur partager.html
│   ├── mat-atelier-fichiers.js  Atelier fichiers de l'admin (100 % local, hors app habitant)
│   └── mat-utils.js        Utilitaires communs
│
├── vendor/                 Bibliothèques auto-hébergées (pas de CDN)
│   ├── leaflet/            Cartes 2D (signalements, suivi)
│   ├── maplibre/           Rendu 3D — ~1 Mo, chargé À LA DEMANDE, non précaché (ADR-0018)
│   ├── pdfjs/              Lecture PDF — atelier fichiers de l'admin, à la demande (ADR-0035)
│   ├── pdf-lib/            Écriture PDF — idem
│   ├── jszip/              Archive ZIP des sorties multiples — idem
│   └── sentry/             Remontée d'erreurs
│
├── package.json            ⚠️ NE construit RIEN : fige seulement les versions des
│                           bibliothèques copiées dans vendor/ (npm run vendor)
│
├── docs/
│   ├── guide-utilisateur.md  Guide citoyen
│   └── guide-technique.md    Ce fichier
│
├── tests/
│   └── e2e/                Tests Playwright (smoke UI + AXE accessibilité)
│
├── veille/                 Mémoire des veilles automatiques (voir §10)
└── .github/workflows/
    ├── ci.yml              Vérification syntaxe JS
    ├── e2e.yml             Tests Playwright
    ├── lighthouse.yml      Audit performance/accessibilité
    ├── liens-morts.yml     Détection de liens morts (hebdomadaire)
    ├── sauvegarde-upstash.yml  Sauvegarde Redis Upstash (hebdomadaire)
    ├── veille-techno.yml   Veille technologique par IA (hebdomadaire)
    ├── veille-bulletin.yml Veille éditoriale bulletin municipal (mensuelle)
    └── veille-municipale.yml  Veille élus : subventions et obligations (mensuelle)
```

### Backend — `chatbot-mairie-mezieres`

```
chatbot-mairie-mezieres/
├── index.js                Point d'entrée Express + init services
├── config.js               Toutes les variables d'env (lecture seule)
│
├── routes/
│   ├── mel.js              Chatbot MEL (POST /mel)
│   ├── webhook.js          Webhook Facebook (GET+POST /webhook)
│   ├── push.js             Abonnements push (subscribe/unsubscribe)
│   ├── notify.js           Envoi notifications manuelles
│   ├── actu.js             API actualités (GET /api/actus)
│   ├── meteo.js            API météo (GET /api/meteo)
│   ├── carburant.js        Prix carburants (GET /api/carburants)
│   ├── geo.js              Géolocalisation et PLU/cadastre
│   ├── idees.js            Boîte à idées
│   ├── sondages.js         Sondages citoyens
│   ├── signalements.js     Signalements voie publique
│   ├── events-locaux.js    Événements locaux (rayon 20 km)
│   ├── entreprises.js      Annuaire entreprises
│   ├── calendar.js         Agenda (Google Calendar)
│   ├── docs.js             Documents officiels
│   ├── info-banner.js      Bannière info (ex. fermeture mairie)
│   ├── stats-public.js     Stats anonymes publiques
│   ├── logs.js             Logs admin
│   └── admin-*.js          Routes admin (dashboard, actus, purge…)
│
└── lib/
    ├── mel.js              Logique MEL : DIRECT_RULES + appel Mistral
    ├── store.js            Lecture/écriture JSON (actualités, subs, sondages…)
    ├── redis.js            Client Upstash Redis
    ├── webpush.js          Configuration web-push (VAPID)
    ├── push-notify.js      Envoi notifications push
    ├── cloudinary.js       Upload images vers Cloudinary
    ├── facebook.js         Client Facebook Graph API
    ├── middleware.js        Auth admin, raw body (HMAC webhook)
    ├── logger.js           Sentry + console structurée
    ├── meteo.js            Fetch météo Open-Meteo + Météo-France
    ├── actu.js             Scraping / parsing actualités
    ├── calendar.js         Parse iCal Google Calendar
    ├── dates.js            Utilitaires dates françaises
    ├── stats.js            Compteurs internes
    └── text.js             Normalisation texte (accents, ponctuation)
```

---

## 3. Développement local

### Prérequis

- Node.js ≥ 18
- Git

### Frontend (app-mezieres)

Le frontend n'a aucune dépendance npm. Un simple serveur HTTP statique suffit :

```bash
# Option 1 : Python
cd app-mezieres
python3 -m http.server 8080

# Option 2 : Node.js
npx serve app-mezieres

# Option 3 : serveur de test Playwright (déjà configuré)
cd app-mezieres/tests/e2e
node static-server.js
```

Puis ouvrir `http://localhost:8080`.

### Backend (chatbot-mairie-mezieres)

```bash
cd chatbot-mairie-mezieres
npm install

# Créer un fichier .env.local avec les variables minimales (voir section 4)
# puis :
node index.js
```

Le backend écoute sur le port `3000` par défaut (`PORT` configurable).

### Tests E2E (Playwright)

```bash
cd app-mezieres/tests/e2e
npm install
npx playwright install chromium
npx playwright test          # tous les tests
npx playwright test --ui     # mode interactif
```

Les tests démarrent automatiquement le serveur statique via `static-server.js`.

⚠️ **Le service worker est bloqué pendant les tests** (`serviceWorkers: 'block'` dans
`playwright.config.js`) — ne pas retirer. Sinon le SW s'installe, prend le contrôle via
`skipWaiting()`, et `mat-core.js` recharge la page sur `controllerchange` : le frame
principal navigue en plein test et coupe l'opération en cours (attente de locator, ou
`analyze()` d'axe qui reste pendant jusqu'au timeout). Cette course faisait échouer
~2 exécutions sur 3, au hasard des projets et des tests. Voir ADR-0006.

Les tests couvrent le shell et l'accessibilité, pas le service worker : tester le
comportement hors-ligne demanderait une suite dédiée, avec attente explicite de
l'activation du SW.

---

## 4. Variables d'environnement (backend)

Toutes les variables sont lues dans `config.js` depuis `process.env`. **Aucune valeur par défaut sensible n'est codée en dur.** Sur Render, les secrets sont configurés dans le tableau de bord Environment → Secret Files / Environment Variables.

### Obligatoires

| Variable | Description |
|----------|-------------|
| `MISTRAL_API_KEY` | Clé API Mistral AI (chatbot MEL) |
| `VAPID_PUBLIC_KEY` | Clé publique VAPID (notifications push) |
| `VAPID_PRIVATE_KEY` | Clé privée VAPID |
| `UPSTASH_REDIS_REST_URL` | URL REST Upstash Redis |
| `UPSTASH_REDIS_REST_TOKEN` | Token Upstash Redis |
| `ADMIN_PASSWORD` | Mot de passe interface admin |

### Webhook Facebook

| Variable | Description |
|----------|-------------|
| `FACEBOOK_APP_SECRET` | Secret de l'app Facebook (vérification HMAC) |
| `PAGE_ACCESS_TOKEN` | Token d'accès page Facebook |
| `VERIFY_TOKEN` | Token de vérification webhook (choisi librement) |
| `FACEBOOK_PAGE_ID` | ID de la page Facebook |

### Optionnelles (fonctionnalités avancées)

| Variable | Description |
|----------|-------------|
| `CLOUDINARY_NAME` | Nom du compte Cloudinary (hébergement photos) |
| `CLOUDINARY_KEY` | Clé API Cloudinary |
| `CLOUDINARY_SECRET` | Secret Cloudinary |
| `TRELLO_KEY` | Clé API Trello (signalements/bugs) |
| `TRELLO_TOKEN` | Token Trello |
| `TRELLO_LIST_ID_BUG` | ID de la liste Trello bugs |
| `TRELLO_LIST_ID_SIG` | ID de la liste Trello signalements |
| `TRELLO_LIST_ID_DEMANDE` | ID de la liste Trello demandes |
| `RESEND_API_KEY` | Clé API Resend (emails admin) |
| `DAILY_STATS_EMAIL` | Adresse destinataire rapport quotidien |
| `GOOGLE_CALENDAR_ICAL` | URL iCal agenda Google |
| `METEOFRANCE_API_TOKEN` | Token API Météo-France (vigilances) |
| `CRON_SECRET` | Secret pour sécuriser les routes cron |
| `ANTHROPIC_API_KEY` | Clé API Claude (Anthropic) — si MEL utilise Claude |
| `MISTRAL_MODEL` | Modèle Mistral (défaut : `mistral-small-latest`) |
| `OPEN_METEO_LAT` / `OPEN_METEO_LON` | Coordonnées GPS pour la météo locale |

### Générer les clés VAPID

```bash
npx web-push generate-vapid-keys
```

Copiez `VAPID_PUBLIC_KEY` aussi dans `index.html` (ligne recherche `vapidPublicKey`).

---

## 5. Intégrations tierces

### Mistral AI — chatbot MEL

- Modèle : `mistral-small-latest` (configurable via `MISTRAL_MODEL`)
- Route backend : `POST /mel`
- Logique principale : `lib/mel.js` — voir [section 6](#6-mel--lassistante-virtuelle)

### Upstash Redis

Utilisé comme base de données principale (plan gratuit, 10 000 req/jour).  
Stocke : actualités, abonnements push, idées, sondages, signalements, logs, posts Facebook déjà traités.  
Client : `lib/redis.js` (appels REST, pas de connexion TCP persistante).

### Cloudinary

Upload automatique des photos des actualités Facebook pour les héberger durablement (les URLs Facebook expirent).  
Activé uniquement si les 3 variables `CLOUDINARY_*` sont définies (`CLOUDINARY_ENABLED`).

### Trello

Création automatique de cartes à chaque signalement citoyen, bug ou demande de contact.  
Configurer les IDs de listes dans les variables `TRELLO_LIST_ID_*`.

### Resend

Envoi d'emails transactionnels (rapport quotidien des stats, alertes admin).

### Météo-France

Récupération des bulletins de vigilance (orange, rouge) pour alertes automatiques.  
URL configurée via `METEOFRANCE_VIGILANCE_URL`.

### Open-Meteo

API météo gratuite et sans clé (données ECMWF). Coordonnées GPS dans `OPEN_METEO_LAT` / `OPEN_METEO_LON`.

### VigiEau (restrictions sécheresse)

`js/mat-eau8.js` interroge `api.vigieau.gouv.fr` pour afficher le niveau de restriction
sécheresse et les **consignes par niveau** dans la section 💧 Eau de l'overlay météo.

L'API est interrogée **deux fois en parallèle** — par **coordonnées du bourg**
(`lon`/`lat`, le chemin utilisé par vigieau.gouv.fr quand un habitant saisit son
adresse) et par **code commune** — et le niveau **le plus grave** est retenu :
les deux chemins de résolution de l'API peuvent diverger (zone AEP « eau potable »
absente de l'index par commune, constaté le 15/07/2026 — l'app affichait
« vigilance » quand le site officiel affichait « alerte renforcée »). Même logique
côté backend (`lib/vigieau.js`) : toute évolution doit être répercutée des deux
côtés. Décision : ADR-0009 du repo backend.

**Robustesse du chargement (ADR-0008).** La nappe (hubeau) et les restrictions
(VigiEau) sont chargées **en parallèle** — aucune ligne n'attend l'autre — et le
délai de garde de `_eauFetch` (9 s) couvre **aussi la lecture du corps** de la
réponse. Avant, les deux étaient enchaînées et le minuteur était désarmé dès les
en-têtes : sur réseau mobile lent, un corps qui n'arrivait jamais laissait la
section bloquée sur « ⚪ Vérification… » indéfiniment (constaté le 30/07/2026).
Si les deux appels directs à VigiEau échouent, on interroge en **repli** le
backend (`GET /eau/restrictions`) ; un niveau `0` venu du serveur n'est retenu
que s'il est marqué `complete: true` — jamais de faux « Aucune restriction ».

> ⚠️ **Séparation stricte d'avec la vigilance Météo-France.** La sécheresse n'occupe **jamais**
> le bandeau de vigilance météo (`js/mat-widgets.js`). Côté backend, un flux dédié
> (`lib/vigieau.js` + `routes/eau.js`, polling `DROUGHT_CHECK_INTERVAL_MS`) publie, à partir du
> niveau **Alerte**, une **actualité distincte** (`source: vigieau`) + push + Facebook
> (`AUTO_POST_DROUGHT_ALERTS`). Voir le `GUIDE-ADMIN.md` §5ter du repo backend. Décisions :
> ADR-0004 (séparation) et ADR-0005 (seuil Alerte).

**Visuels d'alerte sécheresse** : les cartes 1200×630 (`img/secheresse/secheresse-*.png`)
sont générées par `scripts/generate-secheresse-cards.js` (Chromium/Playwright, même
approche que les visuels de vigilance météo `img/vigilance/`). Pour les régénérer après
un changement de design : `node scripts/generate-secheresse-cards.js`.

---

## 6. MEL — l'assistante virtuelle

### Principe

MEL répond aux questions des habitants sur la vie locale. La logique est dans `lib/mel.js`.

**Ordre de traitement d'une question :**

```
Question utilisateur
        │
        ▼
1. normalizeQuestion()     — supprime accents, met en minuscules
        │
        ▼
2. findDirectAnswer()      — cherche dans DIRECT_RULES
   (règles à réponse fixe)
        │
        ├─▶ Trouvé → retourne la réponse directement (sans appel Mistral)
        │
        ▼
3. Cache Redis             — réponse identique déjà stockée ?
        │
        ├─▶ Hit → retourne la réponse cachée
        │
        ▼
4. Appel Mistral API       — génère une réponse IA
        │
        ▼
5. Stockage cache Redis    — TTL 24h
        │
        ▼
   Réponse à l'utilisateur
```

### DIRECT_RULES

Tableau de règles dans `lib/mel.js`. Chaque règle a la forme :

```javascript
{
  name: "identifiant_unique",
  test: (q) => /regex/.test(q),   // q = question normalisée (sans accents, minuscules)
  answer: "Réponse exacte à retourner"
}
```

**Ajouter une règle directe :**
1. Trouver le tableau `DIRECT_RULES` dans `lib/mel.js`
2. Ajouter un objet `{ name, test, answer }` avant la fermeture `]`
3. La regex doit utiliser des caractères sans accents (la normalisation les a supprimés)
4. Tester avec plusieurs formulations de la question

### Contexte système Mistral

Le prompt système envoyé à Mistral est défini en haut de `lib/mel.js`. Il décrit la commune, les services disponibles et les contraintes de réponse. À mettre à jour quand de nouvelles informations officielles changent.

---

## 7. PWA et service worker

### Cache offline

Le service worker (`service-worker.js`) utilise une stratégie **Network First** : il tente le réseau, et en cas d'échec retourne la version cachée.

**Version du cache :** constante `CACHE = 'mat-vX.Y.Z'` en haut du fichier.  
**À chaque modification du frontend**, incrémenter cette version pour forcer la mise à jour sur tous les appareils.

```javascript
// service-worker.js
const CACHE = 'mat-v4.15.0';  // ← incrémenter à chaque déploiement
```

### Contenus embarqués et précachés

Certaines fonctionnalités fonctionnent **entièrement hors ligne** parce que leur contenu
est versionné dans le dépôt et listé dans `PRECACHE_URLS` :

| Fichier | Alimente |
|---|---|
| `data/mel-tree.json` | L'arbre de décision de MEL |
| `data/plu-data.json` | Le module PLU / urbanisme |
| `data/saviez-vous.json` | Le fait du jour — voir ci-dessous |

⚠️ **Tout nouveau fichier de contenu doit être ajouté à `PRECACHE_URLS` avec son
paramètre `?v=`**, sinon il ne sera pas disponible hors ligne et échappera à
l'invalidation de cache.

### Documents officiels — pastille « Nouveau » et cache local

L'écran 📁 **Documents officiels** (`ov-docs`, code dans `js/mat-core.js`) agrège deux
routes du backend : `GET /docs/featured` (le document mis en avant) et `GET /docs/temp`
(les documents temporaires). Les documents *permanents* sont, eux, des liens Drive écrits
en dur dans `index.html` — ils ne bougent pas et n'entrent pas dans le mécanisme.

Le repérage des nouveautés reprend **exactement** le patron des documents du PLUi
([ADR-0014](adr/0014-documents-plui-administrables-page-embarquee.md)) :

| Clé `localStorage` | Contenu |
|---|---|
| `mat_docs_seen` | Tableau des identifiants **déjà vus** |
| `mat_docs_cache` | Dernière réponse reçue — `{ temp: [], featured: {} }` |

Trois points à connaître avant de toucher à ce code :

1. **On mémorise des identifiants, pas une date de dernière visite.** Une date dit
   seulement « quelque chose a changé » ; un ensemble d'identifiants dit **lequel** est
   neuf, ce qui permet de poser une pastille sur le document concerné dans la liste.
   Les identifiants sont préfixés (`temp:<id>`, `featured:<publishedAt>`) : les deux
   routes vivent dans le même ensemble sans risque de collision.
2. **Le document mis en avant n'a pas d'`id` côté backend** (`routes/docs.js` :
   `POST /admin/docs/featured` écrit un objet unique, sans identifiant). Sa **date de
   publication** en tient lieu. Republier remplace `publishedAt`, produit donc un
   identifiant neuf, et rallume la pastille — ce qui est le comportement voulu.
3. **La liste est rafraîchie au démarrage de l'application** (`setTimeout` de 2,5 s dans
   `mat-core.js`), **pas** à l'ouverture de l'écran. Charger à l'ouverture rendrait la
   pastille structurellement inutile : elle ne s'allumerait qu'une fois l'écran déjà vu.
   Le délai évite de concurrencer les widgets d'accueil au premier rendu.

Le marquage « vu » (`_markDocsSeen()`) intervient **après** le rafraîchissement déclenché
par `openDocs()`, et **après** le rendu : un document arrivé pendant la consultation n'est
donc pas compté comme lu, et les pastilles restent visibles pendant toute la visite.

Conséquence assumée : au tout premier chargement après le déploiement, `mat_docs_seen` est
vide, donc **tous** les documents en ligne sont « nouveaux » et la pastille s'allume une
fois. C'est le prix à payer pour ne pas avoir à choisir entre « ne rien signaler à
personne » et « inventer un historique de consultation » ; une visite l'éteint.

⚠️ La pastille est produite par du JS mais habillée par du CSS en ligne
(`display:none` par défaut). Le test `tests/e2e/documents-officiels.spec.js` asserte donc
le **style calculé**, pas l'état interne — règle 7 du `CLAUDE.md`.

⚠️ **Deux pastilles, une par mise en page**, commandées ensemble par `refreshDocsBadge()` :
`#docs-badge` (carte de l'accueil) et `#docs-badge-desktop` (menu du haut). Sur ordinateur,
`.content` — l'accueil mobile — est en `display:none` : la carte n'a donc **aucune boîte**,
et seule la pastille du menu est peinte. Deux conséquences pour qui écrit un test :

- asserter `toBeVisible()` sur `#docs-badge` échoue en `desktop-chromium` sans qu'aucun
  défaut n'existe — il faut viser la pastille de la mise en page courante ;
- **ne pas figer une valeur exacte de `display`** : `refreshDocsBadge()` pose `inline-flex`,
  que le navigateur *blockifie* en `flex` quand le parent est un conteneur flex. La même
  pastille est donc calculée `inline-flex` sur mobile et `flex` sur ordinateur. La question
  utile est « allumée ou éteinte », d'où un `not.toHaveCSS('display', 'none')`.

### « Le saviez-vous ? » — aucune IA à l'exécution

`js/mat-saviez-vous.js` affiche un fait par jour sur la commune. **Le contenu ne provient
jamais d'un modèle de langage au moment de l'affichage** — c'est une règle, pas une
préférence, formalisée par l'[ADR-0012](adr/0012-saviez-vous-corpus-verifie-sans-ia-a-l-execution.md).

Deux sources, et deux seulement :

1. **`data/saviez-vous.json`** — corpus versionné et relu. Chaque entrée porte une
   `source` et une `url`, **affichées à l'écran**. Une entrée sans source fait échouer la
   CI (`tests/e2e/saviez-vous.spec.js`, test « intégrité du corpus »).
2. **`SV_CALCULES`** dans le module — des générateurs d'arithmétique pure (distances
   orthodromiques depuis les coordonnées de la commune, jours fériés). Le calcul *est* la
   preuve.

Deux points de vigilance pour qui reprendra ce code :

- **Le corpus ne contient que des questions**, jamais des affirmations. C'est ce qui
  interdit structurellement d'afficher une contre-vérité : seule la révélation, après la
  réponse de l'habitant, porte du contenu factuel.
- **L'ordre du corpus est éditorial, pas aléatoire.** `_ordonner()` fait tourner les
  catégories à tour de rôle (`SV_ORDRE_CATEGORIES`), du plus surprenant au plus aride :
  deux questions d'urbanisme ne peuvent pas se suivre tant qu'il reste de la matière
  ailleurs. À l'intérieur d'une catégorie, l'ordre est celui de **déclaration du corpus** —
  aucun hasard. Un mélange y avait été essayé puis retiré : il plaçait au premier jour une
  question sur les jours fériés en France, alors que la rubrique porte sur la commune.
  Motif : avec 18 entrées d'urbanisme sur 75, un mélange aveugle ouvrait la rubrique sur
  des règles de construction — utile, mais mauvaise entrée en matière.
- **La rotation compte les jours depuis `SV_ORIGINE`**, pas depuis le 1er janvier. Avec
  un quantième d'année, le premier jour affiché aurait été la 213e entrée du cycle, soit
  sa fin — là où les catégories les plus fournies se retrouvent seules, réduisant à néant
  l'ordre éditorial. Effet de bord bienvenu : plus de saut au changement d'année.
- **`SV_GRAINE` et `SV_ORIGINE` ne doivent plus changer** : les modifier ferait rejouer
  des faits déjà vus et en sauterait d'autres. Tout le village voit le même fait le même
  jour, c'est un engagement implicite.

#### Relire le corpus avant de le fusionner

`revue-saviez-vous.html` liste le corpus complet dans l'**ordre réel de passage**, avec la
date à laquelle chaque question tombera, sa réponse, son explication et sa source. C'est
l'outil de la relecture exigée par la RG-16.13 — qui a lieu **avant** le merge, pas après :
la mise en service a montré qu'une règle qu'aucune étape n'impose n'est qu'une intention.

La page **ne réordonne rien de son côté**. Elle appelle deux fonctions exposées par le
module :

| Fonction | Rôle |
|---|---|
| `window.matSaviezVousInventaire()` | Promesse → corpus ordonné, entrées calculées résolues, marquées `calculee` / `indisponible` |
| `window.matSaviezVousDatePassage(rang, taille)` | `{ jour, date, dejaVue, aujourdhui }` pour un rang donné |

C'est délibéré : une seconde implémentation de `_ordonner()` finirait par diverger, et la
revue certifierait alors autre chose que ce que voient les habitants. Même raison d'être
que la source unique pour les associations ou pour l'opérateur fibre. Si vous touchez à
l'ordonnancement, la revue suit automatiquement — et les tests
`revue : …` de `tests/e2e/saviez-vous.spec.js` le vérifient.

⚠️ La page est **hors précache** : c'est un outil de la mairie, pas un écran habitant. Elle
n'a donc pas à être disponible hors ligne, et n'alourdit pas l'app installée.

**Ajouter des entrées.** Elles se placent **à la fin de leur catégorie** (l'ordre du tableau
est l'ordre de passage) et chacune doit porter une source **réellement consultée**. Si la
source ne peut pas être ouverte, l'entrée ne s'écrit pas : c'est la RG-16.12.

INSEE, IGN, POP/Mérimée, Hub'Eau et Wikipédia sont inaccessibles depuis l'environnement de
développement (403 au CONNECT). Le contournement qui marche n'est pas d'aller les chercher,
c'est que **la mairie transmette le document** — un bulletin municipal, un extrait de page,
une plaquette de syndicat. C'est ainsi que sont nées les catégories `histoire` et
`patrimoine` et la série sur l'eau : à partir d'un texte fourni, pas d'un accès réseau.

⚠️ **Une nouvelle catégorie doit être déclarée dans `SV_ORDRE_CATEGORIES`**, sinon elle est
reléguée en fin de rotation par ordre alphabétique. Et attention au point suivant :
`_construire()` fait `fixes.concat(calc)`, donc pour une catégorie qui contient **à la fois**
des entrées du JSON et des entrées calculées, les entrées du JSON passent **avant** les
calculées — quelle que soit la date d'ajout. C'est pourquoi `histoire` et `patrimoine` sont
des catégories distinctes de `decouverte` : y verser des entrées JSON les aurait placées en
tête de rotation, devant les distances calculées qui ouvrent la rubrique depuis sa mise en
service.

### Régions `aria-live` — la règle du silence

`js/mat-saviez-vous.js` introduit la **première région `aria-live` du dépôt**
(`role="status" aria-live="polite" aria-atomic="true"` sur la révélation). Deux principes
à reprendre pour les suivantes :

- **N'annoncer que ce qui vient de changer sous l'action de l'utilisateur.** Ici, la
  région est vide tant que l'habitant n'a pas répondu ; elle ne se remplit qu'à ce
  moment-là.
- **Ne jamais y déverser des données qui arrivent en rafale.** Une région live alimentée
  par des chargements asynchrones successifs bavarderait sans fin dans l'oreille d'un
  utilisateur de lecteur d'écran. Si le cas se présente, il faut regrouper et temporiser.

### Manifest PWA

`manifest.webmanifest` définit le nom, les icônes, la couleur de thème et l'orientation.  
Vérifier la cohérence avec `<meta name="theme-color">` dans `index.html`.

### 🎨 Aperçu des ambiances (outil mairie, v4.51)

Pour visualiser une ambiance sans attendre la météo ou la saison correspondante :

1. Ouvrir **♿ Personnalisation** depuis l'accueil.
2. **Cinq appuis rapides sur le titre** « ♿ Accessibilité & Personnalisation »
   (moins de 800 ms entre deux appuis).
3. Un panneau propose trois listes : **Météo** (dégagé, nuageux, couvert,
   brouillard, pluie, averses, orage, neige), **Moment** (plein jour, aube,
   crépuscule, nuit) et **Saison / fête** (Noël, Nouvel An, printemps,
   14 Juillet, Halloween, automne). Le bandeau se met à jour à chaque choix.
4. « Revenir au réel » rend la main à la météo réelle.

Garanties de non-perturbation, à préserver si l'outil évolue :

- ⚠️ Un **appui long** avait été essayé d'abord : inutilisable au doigt, car le
  moindre micro-déplacement l'annulait. Le test Playwright maintenait une souris
  parfaitement immobile — il validait donc un geste que la main humaine ne
  reproduit pas. Ne pas y revenir sans simuler un vrai doigt (léger glissement).
- **Aucun élément visible** : pas de bouton, pas de paramètre d'URL. Le panneau
  n'est **construit qu'à l'ouverture** — il n'existe donc pas dans le DOM des
  habitants, ni pour les audits d'accessibilité.
- **État en mémoire seulement** (`_ambSim`) : aucun `localStorage`. Tout
  rechargement revient à l'ambiance réelle, même si l'aperçu a été laissé actif.
- Un bandeau orange **« APERÇU — ambiance simulée, non réelle »** reste affiché
  tant que la simulation tourne.

Couvert par `tests/e2e/ambiance.spec.js` : absence du DOM avant ouverture, appui
bref sans effet, simulation effective, et absence de trace persistée après arrêt.

### Statistiques d'usage — le tracking ne doit jamais bloquer l'UI

`trackStat()` (défini dans `js/mat-utils.js`) est appelé à l'ouverture de chaque
écran via les wrappers de `js/mat-core.js`. Ces appels passent **obligatoirement**
par le helper `_track()` (garde `typeof trackStat === 'function'` + `try/catch`) :
si `mat-utils.js` n'a pas pu être chargé ou exécuté (réseau instable, cache
partiel), un appel direct lèverait une `ReferenceError` **avant** d'ouvrir
l'overlay — le bouton ne réagirait alors plus du tout (issue #324). Même garde
dans `js/mat-forms.js`, où un `trackStat` absent faisait afficher « Erreur
d'envoi » sur une demande pourtant transmise. Règle : **une statistique ne doit
jamais faire échouer une action habitant.**

### ⚠️ Données météo — `daily[0]` est HIER

Le backend interroge Open-Meteo avec **`past_days=1`** : les tableaux `daily`
commencent la veille (`daily[0]` = hier, `daily[1]` = aujourd'hui). **Ne jamais
indexer `daily` en dur** — utiliser `meteoTodayIndex(daily, nowDate)`
(`js/mat-widgets.js`), qui cherche la date du jour dans `daily.time` et renvoie `-1`
si elle est absente (à traiter comme « je ne sais pas », pas comme `0`).

Les heures d'Open-Meteo sont **locales sans fuseau** (`2026-07-29T06:32`) :
`Date.parse` les interprète dans le fuseau de l'appareil. Comparer via
`meteoParisNowMinutes()` / `meteoIsoToMinutes()`, qui ancrent tout sur Europe/Paris.

Lire l'indice 0 en croyant lire aujourd'hui a produit un bug d'un jour resté invisible
plusieurs versions (phase « nuit » 24 h/24, soleil et crépuscule jamais déclenchés).
Voir **ADR-0007** — et les tests de régression `tests/e2e/ambiance.spec.js`, dont le
jeu de données reproduit volontairement la vraie forme de la réponse.

La même erreur a été retrouvée deux fois en v4.77 dans `loadMeteoDetail` :
« Prochains risques » lisait `daily.uv_index_max[1]` en l'annonçant **« Demain »**
(c'était l'UV du jour même), et **💡 Conseils du jour** lisait `[0]`, c'est-à-dire les
températures et l'UV **de la veille** — un conseil canicule pouvait donc manquer le
jour où il servait. Les deux passent désormais par `meteoTodayIndex`.

### ⚠️ « Aujourd'hui » / « Demain » — jours de calendrier, jamais une durée (v4.100)

La carte « Prochaine manifestation » de l'accueil (`loadEvents`, `js/mat-widgets.js`)
calculait son libellé ainsi :

```js
var diff = Math.ceil((first.start - new Date()) / (1000*60*60*24));   // ⛔
```

Ce quotient mesure une **durée**, alors que le libellé parle de **dates**. Le 31 août
2026 à 7 h 28, le conseil municipal du 31 août à 19 h était à 11 h 32, soit 0,48 jour :
`Math.ceil` → 1 → **« Demain »**, juste sous la date « 31 août ». Aucun arrondi ne
rattrape ce calcul — `Math.floor` produit la faute symétrique (un événement de demain
matin devient « Aujourd'hui » quand on regarde le soir).

**Source unique** : `matDaysUntil(date)` et `matDaysLabel(jours, suffixe)` dans
`js/mat-utils.js`. `matDaysUntil` ramène les deux dates à **minuit local** avant de
soustraire, puis arrondit avec `Math.round` — indispensable pour les journées de 23 h
et 25 h des changements d'heure. Il renvoie `NaN` sur une date invalide.

`daysUntil` de `js/mat-desktop.js` **délègue** désormais à `matDaysUntil` (copie locale
conservée en repli seulement). C'est la divergence entre les deux implémentations —
le bureau juste, le mobile faux — qui avait laissé le bug vivre.

⛔ La division par `86400000` reste légitime pour ce qu'elle mesure vraiment : une durée
(péremption d'un cache, ancienneté d'une donnée). Elle ne l'est jamais pour écrire
« aujourd'hui », « demain » ou « dans N jours ». Verrouillé par
`tests/e2e/prochaine-manifestation.spec.js`, qui sert un agenda iCal fabriqué (les tests
tournent sans backend) et couvre l'événement du jour à 23 h 59. Voir **ADR-0031**.

### Carte d'alerte météo et « Prochains risques » (v4.77)

`meteoBuildAlertRiskCard` (`js/mat-widgets.js`) rend une seule carte, en deux blocs :

- **L'alerte** — pastille de niveau, zone, phénomène, puis une **frise** (`meteoAlertProgress`)
  qui situe l'instant présent entre `start` et `end` et affiche le temps restant. Le dépliant
  `<details>` « Touchez pour le détail » a été supprimé : il ne faisait que redire les deux
  dates et le résumé déjà visibles. Le texte du bulletin n'est affiché que si Météo-France l'a
  réellement fourni (`vigilance.main_text`) — le repli de `meteoAlertSummary` (« Vigilance
  orange en cours sur le Loiret. ») est mot pour mot ce que dit déjà la pastille.
- **Les risques** — `meteoBuildRiskItems` renvoie des objets `{icon,label,when,value,pct,tone}`
  rendus en jauges. Trois règles anti-bruit : le risque déjà porté par la vigilance en cours
  n'est pas répété (`phenomenon_id` 1/3 → rafales, 2/3/4 → pluie), l'UV ne remonte qu'à partir
  de **8** (seuil « très fort », le même que les conseils du jour ; à 6 l'item s'affichait tous
  les jours de l'été), et sous une vigilance le bloc entier disparaît s'il n'a rien à dire —
  sinon il annonçait « aucun risque notable » juste sous une alerte orange.

Les **gestes de protection** ne sont pas dans cette carte : ils vivent dans le bloc
**💡 Conseils du jour** du même overlay, qui existait déjà et qu'une vigilance en cours
alimente maintenant (vent violent, orages, neige-verglas… n'y déclenchaient auparavant
aucun conseil, faute de seuil de température atteint).

### Fenêtre météo — carte « Maintenant » et hors-ligne (v4.78)

`meteoBuildNowCard` affiche les mesures du moment : température, **ressenti**, humidité,
pression, rafales maximales du jour, avec les tendances sur trois heures (`meteoTrend`).
Ces sept valeurs étaient déjà calculées par `loadMeteoDetail` et **jamais rendues** — sept
variables mortes et une douzaine de règles CSS orphelines. Si `temperature_2m` manque, la
carte entière n'est pas rendue. Rafales et pression ont quitté le bloc **🌿 Air**, où elles
n'avaient rien à faire.

Trois règles à ne pas défaire, détaillées dans **ADR-0022** :

- **Pas d'écart aux normales** tant qu'aucune source ne le porte. Les tableaux
  `NORM_MAX`/`NORM_MIN` codés en dur ont été supprimés : sans station ni période citée,
  « +6° au-dessus des normales » est une donnée inventée (ADR-0018). Depuis la **v4.79**,
  la condition est remplie — voir la sous-section suivante.
- **Aucun `|| 0` sur une mesure.** Un `weather_code` absent devenait le code 0, soit ☀️
  « Ciel dégagé », et une température absente devenait 0 °C. Une donnée qu'on n'a pas
  s'écrit « – ». L'UV porte une pastille d'échelle OMS (`meteoUvLevel`), dont le palier 8
  est celui des prochains risques et des conseils du jour.
- **Cache hors-ligne daté.** `mat_meteo_cache` garde le dernier bulletin avec son
  horodatage ; `loadMeteo` s'y replie en cas d'échec réseau et `meteoPaintHeader` le dit
  (« 📡 Hors ligne · relevé de 15h58 »). Au-delà de **6 h** le cache n'est plus servi, et
  une **vigilance expirée est retirée** avant réaffichage — sinon on servirait une alerte
  terminée comme si elle courait encore.

Côté accessibilité, les deux carrousels (`.meteo-hourly-track`, `.meteo-days-scroll`)
portent `tabindex="0"` + `role="group"` + nom accessible : sans `tabindex`, un conteneur
défilant est hors d'atteinte au clavier sous Chrome (ADR-0016). Les titres de section sont
de vrais `<h3>`.

### Écart à la normale du mois (v4.79)

`meteoBuildNormLine(daily, normales, nowDate)` ajoute une ligne à la carte « Maintenant » :

```
Maximale prévue aujourd'hui   31 °C          [ +5,4 °C ]
Normale de juillet : 25,6 °C · réanalyse ERA5
```

⚠️ **Cette ligne doit tenir sur une seule ligne, y compris en `html.font-xl`.** Elle en
occupait deux dès le réglage « grand texte », et la carte gagnait 35 px pour rien (v4.80).
Deux conséquences à ne pas défaire :

- la **période** (1991-2020) est écrite dans la ligne de sources en pied de fenêtre
  (« Prévisions et normales 1991-2020 Open-Meteo »), plus dans la carte — chaque fait reste
  visible, une seule fois ;
- le mois passe par `meteoMoisPrefixe()`, qui élide devant une voyelle : `'de ' + mois`
  écrivait « Normale de août » trois mois par an (avril, août, octobre).

Le libellé de la tuile voisine est « Rafales 24 h » et non « Rafales · 24 h » : la puce
médiane offrait un point de coupure de plus, et la tuile passait à deux lignes. Les deux
comportements sont mesurés sur le rendu dans `tests/e2e/meteo-overlay.spec.js`.

Les normales viennent du **backend** dans le champ `normales` de `/meteo/commune`
(`chatbot-mairie-mezieres/lib/normales.js`, `GUIDE-ADMIN.md` §6quinquies). Aucun appel
supplémentaire côté app — et comme elles voyagent dans la même réponse, elles suivent le
cache `mat_meteo_cache` **sans une ligne de code de plus**.

Cinq points à ne pas défaire (**ADR-0024**) :

- **ERA5 est une réanalyse, PAS une station.** La ligne affichée le dit (« réanalyse
  ERA5 »), le payload aussi (`reanalyse: true`, `station: null`), et un test vérifie que le
  mot « station » n'apparaît pas. Annoncer une maille de modèle comme un relevé local
  serait la faute de l'ADR-0022 sous une autre forme.
- **On compare la maximale du JOUR à la normale des MAXIMALES.** Comparer la température
  de l'instant à une moyenne mensuelle de maximales dirait « bien en dessous des normales »
  tous les matins : faux, à partir de chiffres justes. Et l'indice du jour vient de
  `meteoTodayIndex` — `daily[0]` est **hier** (ADR-0007).
- **Le mois est lu sur `daily.time[dayIdx]`**, pas sur l'horloge du navigateur : le 1er du
  mois, les deux ne disent pas la même chose.
- **Emphase à partir de 3 °C** seulement, et le signe (+ / −) porte le sens autant que la
  couleur (lisible en niveaux de gris, et pour un daltonien).
- **Tout ou rien** : pas de normales, pas de maximale du jour, mois introuvable → aucune
  ligne. C'est un complément, pas une mesure attendue : il ne s'écrit pas « – ».

> Le mode sombre a ses propres règles (`html.theme-sombre .meteo-now-norm…`) : sans elles,
> le bloc garderait son dégradé clair et son texte `#4b5563` — gris foncé sur gris foncé,
> le défaut corrigé en v4.78 sur les titres 🌿 Air.

### Effets visuels — ambiance météo, View Transitions, confettis

Trois effets « vitrine » introduits en v4.44, tous en **amélioration progressive**
(aucune dépendance, dégradation silencieuse) :

- **Header météo vivant** (`js/mat-ambiance.js` + styles `amb-*` dans `css/mat.css`) :
  `matHeaderAmbiance()` lit `window._meteoData` (alimenté par `loadMeteo`) et pose
  sur `.header` une classe de famille météo (`amb-rain`, `amb-snow`, `amb-storm`,
  `amb-fog`, `amb-cloudy` code WMO 2, `amb-overcast` code 3 — nuages dérivants,
  teinte grisée pour le couvert) et une classe de phase du jour (`amb-dawn`, `amb-dusk`, `amb-night`,
  bornes = lever/coucher Open-Meteo ± 40 min). Les particules (pluie/neige/brume,
  éclairs) sont des `<span>` animés en CSS dans une couche `.header-amb` ; la phase
  est ré-évaluée toutes les 10 min sans appel réseau. Les teintes de dégradé ne
  s'appliquent **jamais** sur les thèmes d'accessibilité (`high-contrast`,
  `colorblind-mode`) ni sur le thème Sombre (déjà nocturne) ; le thème **Bleu** a
  ses propres déclinaisons dans sa gamme (`html.theme-bleu … .header.amb-*`).
  Les particules (nuages, pluie…) s'affichent sur tous les thèmes. Règle de
  calibrage : l'effet doit être perceptible en **quelques secondes** (temps réel
  passé sur l'accueil) — c'est pourquoi les nuages traversent en ~25-45 s.
  Si « Réduire les animations » est actif : teinte statique seule, aucune
  particule. Le header étant masqué en desktop (≥ 1024 px), l'effet est
  mobile/PWA uniquement.
- **Ciel dégagé** (`_ambClearSky()`, v4.47 ; rendu revu en v4.48) : codes WMO 0-1
  → **reflet d'objectif** construit par `_ambFlare()` — cœur lumineux compact
  (`.amb-sun-core`), branches d'étoile de longueurs **inégales**
  (`.amb-flare-ray`, angle et longueur posés en JS) et chaîne de cercles irisés
  (`.amb-flare-ghost`) alignés sur l'axe du reflet — + teinte `amb-sunny` en
  plein jour ; étoiles scintillantes
  (`.amb-star`, réutilise `ambTwinkle`) en phase `night` (13 étoiles, éclat 1) et,
  en retrait, à l'**aube et au crépuscule** (`stars-dim` : 6 étoiles, éclat 0,5).
  Sans ces dernières, le bandeau restait vide ~80 min autour du coucher — soit
  l'heure où l'app est le plus consultée.
  ⚠️ **`.amb-star` est une règle à surveiller.** Une accolade fermante orpheline
  laissée juste au-dessus d'elle dans `css/mat.css` l'a rendue morte de la v4.52.1
  à la v4.60 : le parseur CSS consomme le `}` surnuméraire **avec le sélecteur qui
  suit**, donc une seule règle disparaît et le reste du fichier s'applique
  normalement. Les `✦` étaient bien posés par le JS, mais en `position:static` et
  sans scintillement — invisibles. Les tests d'ambiance passaient tous, car ils
  n'assertaient que `dataset.kind` (la composition), jamais le rendu. Depuis :
  `scripts/check-css.js` en CI + un test E2E sur le style calculé. Voir **ADR-0015**.
- **Composition des effets** (`_ambCompose()`, v4.50) — la couche peut désormais
  superposer plusieurs effets, sa clé est leur jointure (`dataset.kind` =
  `"stars+noel"`). Règles :
  1. **Météo active** (pluie/neige/orage/brouillard/nuages) → **elle seule**.
     Pas d'étoiles sous les nuages : c'est ce qui rend le rendu crédible.
  2. **Journée + décor festif** → le décor prime sur le reflet de soleil (une
     guirlande de Noël ne disparaît pas parce qu'il fait beau).
  3. **Nuit/aube/crépuscule + décor festif** → les décors **du soir** de
     `_AMB_FEST_NOCTURNES` (Noël, Nouvel An, 14 Juillet, Halloween, hiver) se
     **superposent** aux étoiles ; les décors **diurnes** (pétales, feuilles,
     œufs) leur **cèdent la place** — des feuilles qui tombent à 19 h dans le
     noir de novembre n'évoquent rien.
  Conséquence voulue en hiver : le soleil se couchant vers 16 h 55, les étoiles
  occupent une grande partie de la soirée — c'est la réalité du ciel.
  ⚠️ Deux contraintes issues du terrain, à ne pas défaire : la source est en
  **haut à gauche** (à droite, elle voilait l'illustration MAT & MEL) et le cœur
  est **petit et intense** plutôt que large et diffus — une tache large lave le
  texte de la date, alors que de fines branches le traversent sans nuire à la
  lisibilité. Pas de rotation, mais une dérive et une palpitation **franchement
  perceptibles** : une animation trop timide revient à ne rien animer.
- **Calendrier festif** (`_ambFestive()` dans `js/mat-ambiance.js`, dates
  révisées en v4.52) : quand la météo est calme (aucune famille météo active),
  le header se décore selon la période. Deux natures de fenêtres, toutes
  **courtes** :

  | Période | Fenêtre | Effet |
  |---|---|---|
  | Printemps | 20-22 mars | pétales 🌸 |
  | Été | 21-23 juin | papillons qui traversent (`.amb-papillon`) |
  | Automne | 23-25 septembre | feuilles **oscillantes** (`.amb-leaf`) |
  | Hiver | 21-23 décembre | givre fixe aux angles (`.amb-givre`) |
  | Pâques | samedi → lundi de Pâques | œufs pastel |
  | 14 Juillet | 13-14 juillet | fanions tricolores + feux d'artifice |
  | Halloween | 29-31 octobre | chauves-souris + feuilles |
  | Noël | 15-30 décembre | guirlande **festonnée** + étoiles dorées |
  | Nouvel An | 31 déc – 2 janvier | étincelles |

  **Les saisons annoncent un début sur 3 jours** — elles n'habillent pas des
  semaines entières. Les dates d'équinoxe et de solstice varient d'un jour
  selon les années ; la fenêtre de 3 jours absorbe l'écart.

  Ordre = priorité, avec deux chevauchements voulus : **Pâques** est testé en
  premier (fenêtre mobile, calculée via `_getFeriesForYear` de
  `mat-jours-feries.js` avec garde `typeof` : chargé en async par mat-boot, il
  peut arriver après la 1re évaluation), et **l'hiver l'emporte sur Noël** du 21
  au 23 déc — sans quoi cette annonce, entièrement contenue dans la fenêtre de
  Noël, ne s'afficherait jamais.

  Choix de rendu issus du terrain, à ne pas défaire sans raison : la guirlande
  de Noël est **festonnée** (`.amb-cordon` + `.amb-ampoule` le long d'une courbe
  en sinus) — une simple rangée de points alignés ne se lisait pas comme une
  guirlande ; Noël **n'a plus de flocons** (ils se lisaient comme « il neige »
  alors qu'il s'agit d'un décor) ; l'été a des **papillons** — une « poussière de
  lumière » se lisait comme des bulles, sans rapport perçu avec la saison ; les
  feuilles d'automne ont leur **propre keyframe** (`ambLeaf` : forte oscillation
  latérale + rotation — une feuille ne tombe pas droit comme un flocon) ; le
  14 Juillet est passé des confettis aux **fanions + feux d'artifice**, avec
  17 fanions et 5 éclosions décalées de 0,9 s — avec 3 éclosions à 2,6 s
  d'intervalle, l'effet paraissait totalement figé.

  **La météo réelle garde toujours la priorité** sur les particules festives ;
  mêmes règles d'accessibilité (aria-hidden, `prefers-reduced-motion`).
- **View Transitions** (`_ovVisual()` dans `js/mat-core.js`) : l'ouverture/fermeture
  des overlays passe par `document.startViewTransition` quand l'API existe.
  ⚠️ **Seul le changement visuel est dans la transition** — l'hydratation lazy des
  `<template data-lazy-ov>`, la pile `_ovStack` et les attributs ARIA restent
  synchrones, car les appelants font `getElementById` dès le retour d'`openOv()`.
  Les trois promesses de la transition (`ready`, `updateCallbackDone`,
  `finished`) reçoivent un `catch` neutre : leur rejet (`AbortError`) est normal
  quand une transition en remplace une autre, et sans ce garde il remontait dans
  Sentry sur WebKit/Safari. Voir ADR-0005.
- **Confettis** (`matCelebrate()` dans `js/mat-ambiance.js`) : canvas éphémère
  (~1,8 s, ~90 particules) appelé — toujours via
  `try{ if(typeof matCelebrate==='function') matCelebrate(); }catch(_){}` — à la
  soumission réussie d'une idée, d'un signalement, d'une demande de contact ou
  d'un bug (`js/mat-forms.js`). Jamais si « Réduire les animations » est actif.

---

## 8. Notifications push

### Architecture

```
Navigateur                Backend (Render)
    │                          │
    ├── /push/subscribe ──────▶│  Stocke l'endpoint dans Redis
    │                          │
    │◀── notification ─────────┤  web-push → endpoint navigateur
    │   (titre, body, icône)   │
```

### Routage du clic sur une notification

Le payload push porte `data.open` (type d'écran cible). Le clic est routé en **trois
endroits à garder synchronisés** — ajouter un type = modifier les trois :

1. `service-worker.js` (`notificationclick`) — app déjà ouverte : `postMessage({action})`
2. `notif.html` — app fermée : landing `?open=…` → redirection `index.html#hash`
3. `js/mat-core.js` — récepteur `postMessage` + routeur `handleMatHashRoute()`

| `data.open` | Écran ouvert |
|---|---|
| `actu` (+ `actuId`) | Détail de l'actualité |
| `meteo` | Overlay météo |
| `dechets` | Calendrier des déchets |
| `idees` / `signalements` / `bugs` / `contact` | Écran correspondant |
| *(défaut)* | Notifications/actus |

### VAPID

La paire de clés VAPID identifie le serveur émetteur. Générée une fois avec `npx web-push generate-vapid-keys` et jamais changée (sinon tous les abonnements deviennent invalides).

La clé publique est présente en **deux endroits** :
- Variable d'env `VAPID_PUBLIC_KEY` côté backend
- Dans `js/mat-utils.js` côté frontend (constante `VAPID_PUB` ligne 13) — consommée par `mat-pwa-notif.js`, `mat-dechets-notif.js` et `mat-actus.js`

### ⚠️ `mat-pwa-notif.js` est injecté — il ne présuppose aucun autre `.js` (v4.100)

Ce fichier n'a **pas** de balise dans `index.html` : `js/mat-boot.js` l'injecte
(`document.createElement('script')`). L'ordre d'exécution semble garanti — `mat-boot.js`
est le dernier `defer`, donc `mat-core.js` est déjà passé — mais il ne l'est que si **les
deux fichiers arrivent**. Un `js/mat-core.js?v=…` absent du cache du service worker, ou
une requête coupée sur ce seul fichier, suffit à casser le lien.

C'est ce qu'a remonté Sentry (issue #425) :

```
ReferenceError: isStandaloneMode is not defined
  at checkFirstStandaloneRun (/js/mat-pwa-notif.js:219:3)
```

L'erreur tombait sur la **première ligne** de la fonction, donc emportait tout ce qui
suit : le drapeau `INSTALL_KEY` (la bannière « Installer » revenait chez quelqu'un qui
avait déjà installé), `trackInstallOnce({method:'standalone'})` (le badge « N Macérien(ne)s
ont installé MAT » sous-comptait) et surtout `showPostInstallNotifPrompt()` — l'habitant
n'était **jamais** invité à activer les alertes. Rien ne se voyait à l'écran.

Le garde-fou est du côté de l'appelant : `_isStandaloneModeSafe()` teste
`typeof isStandaloneMode === 'function'` (le `typeof` d'un identifiant non déclaré ne lève
pas) et refait sinon le test lui-même. `mat-core.js` publie en regard
`window.isStandaloneMode = isStandaloneMode;` pour marquer le point d'entrée.

⛔ **Règle pour tout module injecté par `mat-boot.js`** — `mat-pwa-notif.js`,
`mat-dechets-notif.js`, `mat-jours-feries.js`, `mat-sondages.js`, `mat-carte3d.js`,
`mat-saviez-vous.js`, `mat-plui.js`… : jamais d'appel direct à une fonction d'un autre
fichier, surtout dans une sortie anticipée (`if (!f()) return;`) où le plantage emporte le
plus de code. Les tests E2E ne voient pas cette classe de bug (le service worker y est
bloqué, ADR-0006) : la détection reste Sentry. Voir **ADR-0032**.

### Abonnements expirés

Quand un endpoint répond 410 ou 404 (endpoint révoqué par FCM/APNs après mise à jour du navigateur), le backend met le champ `sub` à `null` dans l'entrée Redis — il **ne supprime pas** le token. Le frontend re-synchronise l'abonnement à la prochaine ouverture de l'app via `_registerPendingNotifyTokens()` (dans `mat-actus.js`, appelée par `mat-pwa-notif.js`). Voir ADR-0003 du repo `chatbot-mairie-mezieres` pour le raisonnement complet.

### Notifications citoyens — signalements, demandes et bugs

En plus des notifications broadcast (actus, météo, déchets), MAT envoie des notifications **individuelles** aux citoyens lorsque leur signalement, demande ou bug évolue.

**Flux :**
1. À la soumission, le backend génère un `notifyToken` (UUID) et écrit `MAT-REF: {uuid}` dans la description de la carte Trello.
2. Le frontend stocke l'UUID en `localStorage` et enregistre l'abonnement push via `POST /notify/register-token`.
3. Quand la carte est déplacée dans Trello (changement de statut) ou commentée, le webhook Trello notifie le backend qui envoie le push au citoyen.

**Routage selon le type de carte :**

| Type | Déclencheur | Notification | Ouvre dans l'app |
|------|-------------|-------------|-----------------|
| `[Signalement]` | Déplacement de liste | « 🔵 En cours / ✅ Résolu » | Onglet Signalements |
| `[Signalement]` | Commentaire | « 💬 Réponse de la mairie » | Onglet Signalements |
| `[BUG]` | Déplacement de liste | « 🔵 En cours / ✅ Résolu » | Onglet Bugs |
| `[BUG]` | Commentaire | « 💬 Réponse de la mairie » | Onglet Bugs |
| `[Demande]` | Déplacement de liste | « 🔵 En cours / ✅ Traitée » | Onglet Contact |
| `[Demande]` | Commentaire | « 💬 Nouveau message » | Onglet Contact |

> Le push ne fonctionne que si la carte contient `MAT-REF: {uuid}` dans sa description (ajouté automatiquement à la création). Les cartes créées manuellement dans Trello ne notifient personne.

**Fichiers concernés (backend) :** `lib/push-notify.js`, `routes/trello-webhook.js`, `routes/signalements.js`.
**Fichier concerné (frontend) :** `js/mat-pwa-notif.js` (renouvellement abonnement), `js/mat-actus.js` (`_registerPendingNotifyTokens`).

#### ⛔ Le re-raccordement des tokens n'est PAS derrière `mat_push_active` (v4.102)

Un navigateur fait tourner l'endpoint push de temps à autre. Le backend traite ce
cas sans perdre le token : sur 410/404 il met `entry.sub = null` **et garde
l'entrée**, en comptant sur le frontend pour la re-raccorder au chargement suivant.
Encore faut-il que ce re-raccordement ait lieu.

Il ne l'avait pas, pour exactement les habitants concernés. `mat_push_active` n'est
posé que par le menu « Notifications » (`togglePush`) et par le prompt
post-installation. Un habitant qui a activé les alertes depuis le **formulaire d'un
signalement** (`_doAskPush`, `js/mat-forms.js`) ne l'a jamais — c'est le sens même
d'un abonnement « réponse uniquement ». Or `checkAndRenewPushSubscription()` sortait
sur ce drapeau **avant** d'appeler `_registerPendingNotifyTokens` :

```js
if (sub) {
  if (!localStorage.getItem(PUSH_ACTIVE_KEY)) return;   // ← sortie
  …
  _registerPendingNotifyTokens(sub);                    // ← jamais atteint
```

Le garde-fou est légitime (ne pas inscrire ces abonnements aux **alertes
générales**), mais il emportait aussi la seule chose dont ils dépendaient. Le
re-raccordement passe donc **avant** le garde-fou ; seule la ré-inscription aux
canaux généraux reste derrière.

Deuxième trou, même conséquence : le handler `pushsubscriptionchange` du service
worker re-synchronisait `/push/subscribe`, `/push/subscribe/dechets` et
`/push/subscribe/meteo` — **jamais** `/notify/register-token`. Un service worker n'a
pas accès au `localStorage` où vivent les clés `mat:notify:signal:*` et
`mat:notify:idea:*` ; le client en dépose donc une copie dans le Cache API sous
`mat-notify-tokens`, exactement comme pour les préférences de canal.

**Symptôme** : aucun. L'habitant ne voit rien, l'app n'affiche rien, et côté mairie
le push renvoie `{skipped: true, reason: "subscription expired"}` dans les logs — un
message qui décrit un abonnement expiré, pas une chaîne rompue. Verrouillé par
`node scripts/check-notify-relink.js` (CI). Voir **ADR-0034**.

---

## 9. Webhook Facebook

### Flux complet

```
Post Facebook (hashtag #MAT)
        │
        ▼
Facebook envoie POST /webhook
        │
        ▼
Vérification HMAC-SHA256
(X-Hub-Signature-256 vs FACEBOOK_APP_SECRET)
        │
        ▼
handleFacebookPublication()
        │
        ├── fetchAndHostPhoto()
        │     ├── Graph API → full_picture (haute résolution)
        │     └── Upload Cloudinary → URL permanente
        │
        ├── Déduplication (postId déjà traité ?)
        │
        ├── Stockage dans Redis (titre, description, photo, date)
        │
        └── Envoi notification push à tous les abonnés
```

### Configurer le webhook sur Facebook

1. App Facebook → Webhooks → Ajouter un webhook
2. URL : `https://<votre-backend>.onrender.com/webhook`
3. Token de vérification : valeur de `VERIFY_TOKEN`
4. S'abonner à l'événement `feed` de la page

---

## 10. CI/CD (GitHub Actions)

Les workflows dans `.github/workflows/` :

| Workflow | Déclencheur | Description |
|----------|-------------|-------------|
| `ci.yml` | push/PR sur `main`, `claude/**` | Vérification syntaxe JS (`node --check`) **+ structure CSS** (`scripts/check-css.js` : équilibre des accolades — une accolade orpheline fait disparaître silencieusement la règle suivante, ADR-0015) |
| `e2e.yml` | push/PR sur `main`, `claude/**` | Tests Playwright : 4 tests × 2 navigateurs (Desktop Chrome, Pixel 7) |
| `lighthouse.yml` | push sur `main` + hebdo (cron) | Audit Lighthouse (performance, accessibilité, SEO) |
| `liens-morts.yml` | hebdomadaire (cron, lundi) | Détection de liens morts dans l'app |
| `sauvegarde-upstash.yml` | hebdomadaire (cron, lundi) | Sauvegarde de la base Redis Upstash |
| `veille-techno.yml` | hebdomadaire (cron, lundi) | Veille technologique par IA (Claude Code + recherche web), rapport HTML envoyé par email (Resend) |
| `veille-bulletin.yml` | mensuel (1er lundi) | Veille éditoriale : idées d'articles pour le bulletin municipal, par email |
| `veille-municipale.yml` | mensuel (1er lundi) | Veille pour les **élus** : subventions ouvertes, obligations réglementaires nouvelles, bonnes pratiques applicables — par email (ADR-0025) |

**Concurrence** : chaque workflow annule le run précédent en cours pour le même PR ou la même branche (évite les doublons d'emails).

### Mémoire de la veille technologique (anti-redondance)

`veille-techno.yml` maintient une **mémoire compacte** dans `veille/historique-techno.md`
pour ne pas re-signaler d'une semaine sur l'autre une information déjà rapportée :

1. Avant ses recherches, l'agent **lit** l'historique (12 dernières semaines maximum,
   une ligne « Titre — URL » par info rapportée, `[reco]` pour les recommandations).
2. Il exclut du rapport tout ce qui y figure déjà, sauf évolution notable (alors
   signalée explicitement comme mise à jour).
3. Après rédaction, il **met à jour** l'historique (nouvelle section datée en tête,
   troncature à 12 semaines) ; le workflow le **committe sur `main` uniquement après
   l'envoi réussi de l'email** (`[skip ci]`) — un envoi raté n'avance pas la mémoire,
   les infos seront re-proposées la semaine suivante.

Pour re-signaler volontairement une info, supprimer sa ligne de l'historique.
Voir aussi `veille/README.md`.

### Veille municipale — profil, mémoire et fenêtre de publication (ADR-0025)

`veille-municipale.yml` s'adresse aux **élus** : subventions ouvertes, obligations
réglementaires nouvelles, bonnes pratiques applicables. Même patron que les deux
autres veilles (agent + recherche web + `scripts/send-veille-email.js`), avec trois
spécificités.

**1. Un profil de commune comme filtre.** `veille/commune.yml` porte la population
(883 hab., strate « moins de 1 000 »), l'EPCI (CCTVL), les compétences réellement
exercées, les compétences **déléguées** (eau au C3M, déchets et PLUi à la CCTVL,
petite enfance à la crèche intercommunale) et les seuils d'exclusion. L'agent le lit
à chaque exécution ; un dispositif qui ne passe pas ce filtre est écarté avant
rédaction. ⚠️ Ce fichier est de la **connaissance**, pas de la mise en forme : une
compétence déléguée oubliée fait remonter chaque mois des aides que la commune ne
peut pas solliciter. Il se tient à jour à la main.

Le profil sert **aussi de plan de recherche** : l'agent doit consacrer au moins une
recherche à chacune des compétences listées, et pas seulement à celles qui remontent
d'elles-mêmes. L'urbanisme, la voirie et les subventions d'investissement se signalent
tout seuls ; **l'école, l'action sociale et les aînés passent à la trappe si on ne les
cherche pas nommément**. Le rapport se termine donc par une ligne « 🔍 Compétences
balayées ce mois-ci », qui nomme aussi celles restées sans résultat — sans elle, un
silence sur un domaine se lit comme un oubli.

**2. Deux garde-fous anti-répétition, pas un.**

- la **mémoire** `veille/historique-municipale.md` (12 dernières éditions, une ligne
  `- [action|surveiller] Titre — URL` par item), lue avant les recherches et
  committée après l'envoi réussi, comme pour la veille techno ;
- la **fenêtre de publication** : seuls entrent les dispositifs publiés, ouverts ou
  modifiés entre `J-35` et `J`, chacun daté. Un dispositif permanent qui n'a pas
  bougé n'entre pas ; une date limite déjà passée écarte l'item.

⚠️ **La mémoire est écrite par du code, pas par l'agent** (ADR-0027). L'agent produit
`veille/items-municipale.json` (`{niveau, titre, url}`, éphémère et non committé, sur
le modèle de `veille/actions-pwa.json`) ; `scripts/update-veille-memoire.js` en écrit
la section datée. Le script écrit **toujours** une section — avec les items, ou avec
`- (mémoire non renseignée par l'agent…)` et un `::warning` si le JSON manque — et
sort toujours en 0 : un souci de mémoire ne doit pas coûter l'email.

> Pourquoi : au **premier run réel** (19 août 2026), tout était vert, l'email est
> parti, et l'étape de commit a répondu « Historique inchangé — rien à committer ».
> L'agent avait sauté l'ÉTAPE 6, dernière consigne d'un prompt de 180 lignes. Rien
> n'avait échoué ; la panne ne serait devenue visible que le mois suivant, sous la
> forme d'items re-proposés. Ne pas remettre l'écriture de la mémoire dans le prompt.

La période est écrite dans l'objet de l'email et sous le titre, et le rapport
s'ouvre sur une introduction qui rappelle l'objectif et que **l'outil oriente mais
ne décide pas**. Le tri est plafonné : au plus 4 « action requise », 6 « à
surveiller », les écartés réduits à un nombre et à leurs motifs.

Le rapport commence par un **préen-tête masqué** (`<div>` invisible, premier enfant
de `<body>`) portant le résumé chiffré — « 2 actions requises · 1 à surveiller ·
période du … ». C'est la ligne d'aperçu affichée par Gmail sous l'objet, la plus lue
sur mobile : sans elle, l'aperçu ne fait que recopier le titre du rapport, ce qui
donne l'illusion d'un doublon dans la liste des messages.

⚠️ **Les plafonds vont avec un plancher** (calibrage du 25 août 2026, voir le retour
d'expérience en fin d'ADR-0025). Trois exécutions le même jour ont produit 2, 0 puis
1 items sur la même fenêtre, en manquant les deux dispositifs les plus utiles de la
période. Le prompt n'avait que des consignes poussant à écarter. Trois règles ont été
posées, à ne pas défaire :

- **la fenêtre de publication n'est pas l'anti-répétition** — c'est la mémoire qui
  joue ce rôle. Un dispositif permanent absent de l'historique n'a jamais été signalé
  aux élus, donc il est neuf pour eux. Une **échéance à venir dans les 3 mois** suffit
  à inclure un item, même ouvert avant la période (c'est ce qui récupère la DETR et le
  Fonds vert, mécaniquement écartés jusque-là) ;
- **une liste de vérification de quatre sources** — Aides-territoires, JORF de la
  période, Fonds vert, préfecture du Loiret — doit être cochée avant de pouvoir
  conclure. Le balayage par compétence lui est subordonné : s'il faut écourter, c'est
  lui qu'on écourte ;
- **la sévérité porte sur le tri, pas sur la recherche.** Un rapport vide n'est pas le
  résultat prudent par défaut : annoncer « rien ce mois-ci » alors qu'une aide était
  ouverte fait manquer l'échéance, soit l'exact contraire de la raison d'être de
  l'outil.

Le rapport se termine donc par un encadré **« 🔍 Ce qui a été consulté ce mois-ci »** :
les quatre sources avec ✓ ou ✗, puis les compétences balayées et celles restées sans
résultat. C'est ce qui rend une édition maigre vérifiable au lieu d'être prise sur
parole.

**3. Destinataires — un secret, pas un commit.**

| Exécution | Destinataire |
|---|---|
| planifiée (1er lundi) | `VEILLE_MUNICIPALE_EMAIL_TO`, **ou** `VEILLE_EMAIL_TO` si ce secret n'existe pas |
| manuelle, entrée `destinataire: test` (défaut) | `VEILLE_EMAIL_TO` |
| manuelle, entrée `destinataire: conseil` | `VEILLE_MUNICIPALE_EMAIL_TO` |

Tant que `VEILLE_MUNICIPALE_EMAIL_TO` n'est pas créé, tout part à l'adresse de test.

### Expéditeur : `mezieres-lez-clery.fr` vérifié chez Resend (25 août 2026)

Le domaine **racine** `mezieres-lez-clery.fr` est vérifié dans le compte Resend
(DNS chez OVH, gérés par le prestataire ADEFI ; région d'envoi `eu-west-1`). Les
trois veilles et le mail de stats partent donc d'une vraie adresse de la mairie,
`numerique@mezieres-lez-clery.fr`, via le secret **`RESEND_FROM`** :

| Où | Valeur |
|---|---|
| Secret GitHub `RESEND_FROM` (les 3 veilles) | `MAT Veille <numerique@mezieres-lez-clery.fr>` |
| Variable Render `RESEND_FROM` (mail de stats) | `MAT Stats <numerique@mezieres-lez-clery.fr>` |

**Pourquoi le domaine racine et non un sous-domaine d'envoi.** Resend n'autorise un
`From` que sur un domaine **vérifié dans le compte**. Vérifier
`send.mezieres-lez-clery.fr` aurait imposé d'écrire depuis `…@send.mezieres-lez-clery.fr`
— une adresse qui n'existe pas et où personne ne lit les réponses. Un élu qui répond à
la veille doit tomber dans une boîte réelle.

**Pourquoi c'était sans risque pour la messagerie existante.** Dans la configuration
que Resend génère pour le domaine racine, le `MX` et le `TXT v=spf1` se posent sur
`send.mezieres-lez-clery.fr`, pas à la racine : le SPF existant de la mairie n'est pas
modifié et le courrier entrant n'est pas concerné. Le sélecteur DKIM
(`resend._domainkey`) est unique et ne peut pas entrer en collision. **Seul le `_dmarc`
est à la racine** — un domaine ne pouvant en porter qu'un, ne jamais écraser celui qui
existe.

⚠️ **Le secret doit être passé dans l'`env` de l'étape d'envoi.** Sans cette ligne il
peut exister sans rien changer, le script retombant sur son défaut
(`onboarding@resend.dev`), qui n'autorise l'envoi que vers l'adresse du compte Resend.
Le cas s'est produit : le commentaire du workflow réclamait `RESEND_FROM` que l'étape
ne lisait pas. Les trois veilles le passent désormais.

⚠️ **Ne jamais mettre une adresse Gmail dans `RESEND_FROM`** : le domaine `gmail.com`
n'est pas vérifiable par la commune (il faudrait écrire dans le DNS de Google), et
Resend rejette en 403.

`veille-municipale.yml` refuse d'envoyer au conseil si `RESEND_FROM` est vide, avec un
`::error` explicite : Resend répondrait 403 avec un message obscur, et l'échec serait
attribué au mauvais endroit.

### Robustesse des veilles IA (retry + diagnostic)

L'étape Claude Code des trois veilles peut se terminer « avec succès » **sans avoir
écrit le rapport HTML** (abandon prématuré de l'agent, recherches en échec…). Les
workflows traitent donc le livrable comme vérifiable (ADR-0004) :

- le prompt est construit une fois dans une variable d'env (`VEILLE_PROMPT` /
  `BULLETIN_PROMPT` / `MUNICIPALE_PROMPT`) partagée par les deux invocations ;
- 1re tentative en `continue-on-error`, puis vérification `[ -s rapport-*.html ]` ;
  si le fichier manque, **2e tentative** avec le même prompt, puis vérification
  finale bloquante ;
- la sortie de l'agent (`claude-execution-output.json`, masquée dans les logs par
  l'action) est archivée en **artefact 30 jours** (`claude-execution-output`,
  les deux tentatives) pour diagnostiquer tout run sans livrable.

### Canal actionnable : issue « Actions PWA » (ADR-0005)

En plus du rapport HTML (fait pour être lu par un humain), la veille technologique
produit un **canal actionnable** qui alimente le backlog technique de la PWA :

1. L'agent écrit un 3e fichier `veille/actions-pwa.json` — un tableau d'actions
   **concrètes et sourcées**, limitées à trois catégories : `dependance`,
   `securite`, `accessibilite`. Rien d'éligible → `[]`.
2. L'étape « Créer l'issue "Actions PWA" » exécute `scripts/create-veille-issue.js`,
   qui transforme ce JSON en une **issue-checklist** GitHub (`🔭 Actions PWA —
   veille du JJ/MM`), groupée par catégorie et priorité, une case sourcée par action.
3. Le script est **best-effort** (il sort toujours en `0`, l'étape est en
   `continue-on-error`) : un JSON absent/vide/invalide ou une erreur d'API ne bloque
   jamais l'email ni le commit de l'historique. Il est **idempotent** : un re-run du
   même jour met à jour l'issue existante au lieu d'en créer une seconde.
4. **Anti-injection** : le rapport dérive de sources web (non fiables). Le script
   rejette toute action sans URL `http(s)` valide, le périmètre est restreint aux 3
   catégories, et le prompt interdit à l'agent d'obéir à des instructions trouvées
   dans une page. La revue humaine de l'issue (puis, à terme, des PR) reste le filet.

> Le fichier `actions-pwa.json` est **éphémère** (comme `rapport-veille.html`) : il
> n'est pas committé ; l'issue est l'artefact durable. Permission requise :
> `issues: write`.
>
> Ni `veille-bulletin.yml` (éditoriale) ni `veille-municipale.yml` (élus) n'ont ce
> canal : des idées d'articles et des dossiers de subvention ne sont pas des actions
> techniques, et rien n'y est traduisible en une modification de ce dépôt.

### Étage 2 : une PR **en draft** par action (ADR-0023)

Le job `pr-draft` de `veille-techno.yml` prend la suite. Il est **séparé** du job de
veille (`needs: veille`) : quand il démarre, le rapport est envoyé, l'issue est publiée
et la mémoire est committée — son échec ne coûte rien de ce qui compte.

| Étape | Script | Ce qu'elle garantit |
|---|---|---|
| Sélection | `scripts/select-veille-actions.js` | Écarte toute action **déjà traitée**, plafonne à 3 PR, publie une matrice. N'écrit aucun code. |
| Correctif | `anthropics/claude-code-action` | `--allowedTools "Read,Grep,Glob,Edit,Write"` : **ni terminal, ni réseau**. |
| Garde-fou | `scripts/check-veille-diff.js` | Liste blanche de fichiers + plafonds (8 fichiers, 400 lignes). |
| Contrôles | `check-css.js`, `check-cache-bust.js`, `node --check` | Les mêmes que `ci.yml`, joués **avant** l'ouverture de la PR. |
| Ouverture | `scripts/create-veille-pr.js` | PR **draft**, jamais fusionnée automatiquement. |

Quatre points à connaître avant d'y toucher :

- **Ne rien faire est le résultat normal.** La plupart des actions ne concernent pas ce
  dépôt (paquets npm et Node.js → dépôt backend ; versions d'actions GitHub → interdit
  ici ; failles de produits que MAT n'utilise pas). Le prompt demande alors de **ne rien
  écrire** ; le workflow le détecte et n'ouvre pas de PR. L'action reste dans l'issue.
- **L'identité d'une action est `categorie + source`, pas son titre** : le LLM reformule,
  l'URL non. La branche `claude/veille-<slug>-<id>` ne contient pas de date, de sorte
  qu'une action déjà traitée (branche existante, ou PR même fermée) soit écartée pour
  toujours. Si l'API ne répond pas, le script ne sélectionne **rien** — un doublon coûte
  plus cher qu'une semaine de retard.
- **`.github/**` et `scripts/**` sont refusés par le garde-fou**, y compris les scripts de
  contrôle eux-mêmes. Un correctif issu du web ne doit pas pouvoir réécrire la CI qui le
  contrôle. Idem `data/saviez-vous.json` (ADR-0012).
- **Ces PR n'ont pas de coche verte** : GitHub ne déclenche aucun workflow pour les
  événements produits par le `GITHUB_TOKEN`. C'est pour cela que les contrôles tournent
  dans le job, et le corps de la PR l'explique au relecteur. Pour relancer la CI, pousser
  un commit sur la branche.

> Le filtrage des actions est porté par `scripts/lib/veille-actions.js`, **commun aux deux
> étages** : deux filtrages divergents publieraient une action dans l'issue sans jamais la
> reprendre en PR, sans que rien ne le signale. Permissions du job : `contents: write` et
> `pull-requests: write`.

### Tests Playwright

Les tests sont dans `tests/e2e/smoke.spec.js` :
- Chargement de la page (titre, lang, meta description)
- Ouverture overlay RGPD (présence du texte "Souveraineté numérique")
- Ouverture overlay Accessibilité (présence de la déclaration RGAA)
- Audit AXE : zéro violation `serious` ou `critical` (WCAG 2.1 AA)

Le serveur statique de test est `tests/e2e/static-server.js`. Toutes les requêtes vers des hôtes externes sont interceptées et bloquées (tests hermétiques).

---

## 10 bis. Atelier fichiers de l'administration

Onglet **📎 Atelier fichiers**, premier de la barre d'`admin.html`. Sept outils :
compresser des images vers un poids cible, **masquer une zone d'une photo**,
compresser un PDF, **organiser les pages d'un PDF**, extraire les pages d'un PDF
en images, assembler images et PDF, extraire le texte d'un PDF.

Il existe pour une raison précise : sans lui, compresser une photo de 8 Mo ou un
procès-verbal scanné passait par un site de conversion en ligne — donc par le
**téléversement d'un document communal chez un tiers inconnu**.

### ⛔ Quatre propriétés qui SONT la fonctionnalité

Ce ne sont pas des détails d'implémentation. Les perdre, c'est reconstruire le
problème que l'outil supprime.

1. **Aucun octet ne sort.** Pas de `fetch`, pas de `XMLHttpRequest`, pas de balise
   vers un domaine tiers, aucune télémétrie — et **aucun nom de fichier dans un
   `console.*`** : « recours-gracieux-M-X.pdf » est déjà une donnée.
2. **Aucun stockage persistant.** Ni `localStorage`, ni `sessionStorage`, ni
   IndexedDB, ni Cache API. Tout vit en mémoire.
3. **Aucun domaine externe.** pdf.js, pdf-lib et JSZip sont dans `vendor/`.
4. **Aucun script en ligne dans le module** — uniquement `addEventListener`.

Le contrôle est direct : ouvrir l'onglet Réseau, traiter un fichier, **le journal
doit rester vide**.

### Fichiers concernés

| Fichier | Rôle |
|---|---|
| `js/mat-atelier-fichiers.js` | toute la logique, dans une IIFE (ids du DOM préfixés `af-`) |
| `admin.html` | le panneau `#tab-atelier`, le bouton de nav, le CSS préfixé `af-` et confiné à `#tab-atelier` |
| `package.json` + `scripts/vendor-libs.js` | fige les versions et les recopie dans `vendor/` |
| `vendor/pdfjs`, `vendor/pdf-lib`, `vendor/jszip` | ce qui est réellement servi (1,94 Mo) |

### ⚠️ Pièges

- **`package.json` ne construit rien.** GitHub Pages sert le dépôt tel quel : une
  dépendance restée dans `node_modules/` n'arrive jamais chez l'utilisateur. Le
  fichier servi est celui de `vendor/`, et il est committé. Après une montée de
  version : `npm ci && npm run vendor`, **puis** incrémenter les `?v=` des trois
  `<script>` en tête de `js/mat-atelier-fichiers.js` — le service worker répond en
  *stale-while-revalidate*, une URL inchangée sert l'ancienne copie (ADR-0019).
- **pdf.js est figé en 3.11.174.** À partir de la 5, `page.render()` attend `canvas`
  là où le code éprouvé passe `canvasContext`. Monter de version = réécrire et
  remesurer le moteur de rendu.
- **pdf.js réclame son worker par URL**, donc une requête réseau à chaque
  `getDocument`. D'où le worker construit **une fois** à l'ouverture de l'onglet et
  partagé via `GlobalWorkerOptions.workerPort`. Retirer ce partage remet trois
  lignes dans le journal réseau — inoffensives, mais elles rendent la propriété 1
  invérifiable d'un coup d'œil.
- **Le CSS est confiné à `#tab-atelier`.** Les sélecteurs de la maquette d'origine
  (`nav button`, `main`, `h1`, `.btn`…) écraseraient les 18 autres onglets.
- **Les moteurs de compression ne se réécrivent pas sans mesure.** `imageToTarget`,
  `COMBOS`, `pickCombo`, `pdfToTarget` sont éprouvés ; le préréglage « 100 Ko » vise
  en réalité 0,1 × 1 048 576 = 102 Ko, et cet écart de 2 % ne justifie pas d'y toucher.
- **« Organiser un PDF » ne rasterise JAMAIS** (`pdf-lib.copyPages`), à l'inverse de
  « Compresser un PDF ». Leurs descriptions le disent : les deux outils sont voisins
  dans la même barre, et se tromper ne se voit qu'après coup, quand le texte du
  document n'est plus sélectionnable. Une rotation **s'ajoute** à celle que la page
  portait déjà, et la vignette est **re-rendue** plutôt que tournée en CSS.
- **Seul le masque « noir opaque » est irréversible.** Le flou reste le défaut (c'est
  ce qu'on attend sur une photo de manifestation), mais l'interface indique en une
  phrase que pour une plaque ou une adresse, le noir s'impose. Les zones sont
  stockées en coordonnées **normalisées** : l'aperçu fait 720 px, la photo plusieurs
  milliers.
- **Le retrait des métadonnées est une promesse affichée**, plus un effet de bord
  heureux : les outils qui produisent une image la réencodent, donc perdent l'EXIF
  et la **position GPS**. Ne jamais « optimiser » en renvoyant les octets d'origine
  tels quels — c'est ce que le correctif du réencodage inutile a failli faire.
- ⚠️ **Un `<canvas>` sans attribut fait 300 px de large.** « Le canvas a une largeur »
  ne prouve donc pas que l'aperçu est chargé — ni dans le code, ni dans un test.

Voir [ADR-0035](adr/0035-atelier-fichiers-les-documents-de-la-mairie-ne-sortent-pas-du-navigateur.md)
et [SFD-14](specifications/sfd/SFD-14-administration-backoffice.md) §RG-14.19 à RG-14.23.

---

## 11. Déploiement

### Frontend — GitHub Pages

Déploiement automatique à chaque push sur `main` (*Settings → Pages* du dépôt).

- Branche de production : `main`
- Commande de build : aucune (fichiers statiques directs)
- Répertoire de sortie : `/` (racine du dépôt)
- Domaine personnalisé `mezieres-lez-clery.fr` via le fichier `CNAME`

> ℹ️ Le fichier `_headers` (en-têtes CSP/HSTS) n'est honoré que par Cloudflare
> Pages / Netlify ; **GitHub Pages l'ignore** — ces en-têtes ne sont donc pas
> appliqués sur l'hébergement actuel.

### Backend — Render

Service web Node.js, déploiement automatique à chaque push sur `main` du dépôt `chatbot-mairie-mezieres`.

- **Plan** : Free (750h/mois — suffisant pour fonctionnement 24h/24 grâce au cron keepalive)
- **Start command** : `node index.js`
- **Variables d'env** : configurées dans Render Dashboard → Environment

> ⚠️ **Migration Render prévue en août 2026** : le plan Free sera supprimé. Prévoir le passage sur Starter (~7 €/mois) avant cette date.

---

## 12. Ajouter une fonctionnalité

### Checklist type

- [ ] **Frontend** : ajouter la section HTML dans `index.html` (overlay ou section principale)
  - ⚠️ **Nouvel overlay = lazy par défaut** : envelopper le contenu (le `.panel`) dans un
    `<template data-lazy-ov>` enfant direct du `<div class="ov">` — il est hydraté à la
    première ouverture par `openOv()` (allège le DOM initial, éco-index).
    Corollaire : la fonction d'ouverture doit appeler `openOv('x')` **avant** tout
    `getElementById` sur le contenu de l'overlay (sinon `null` au premier affichage).
    Seule exception : un overlay dont le contenu est écrit par un chargement au boot
    (ex. `ov-sondages`, rempli par `loadSondages()` qui alimente aussi le badge) reste inline.
- [ ] **JS** : créer ou modifier le fichier `js/mat-<feature>.js`
- [ ] **CSS** : ajouter les styles dans `css/mat.css` (mobile) et/ou `css/mat-desktop.css` (desktop ≥ 1024 px)
- [ ] **Point d'entrée desktop** : ⚠️ au-dessus de 1024 px, `.header` **et** `.content`
  passent en `display:none` (`css/mat-desktop.css`). Une tuile ajoutée dans l'une des deux
  est donc **invisible sur ordinateur**, sans erreur ni signe visible. Toute nouvelle
  fonctionnalité a besoin de son propre point d'entrée desktop : un bouton de `.d-nav-links`,
  une carte de `.d-main-grid`, ou un lien de `.d-footer-links`.
- [ ] **Choisir la bonne colonne desktop.** `.d-main-grid` a trois colonnes thématiques de
  largeur égale, chacune introduite par un `.d-col-titre` :
  `.d-col-left` = **la mairie au quotidien** (horaires, bus, collectes) · `.d-col-center` =
  **la vie de la commune** (évènement, actualités, photos) · `.d-col-right` = **vous aider**
  (guide d'arrivée, MEL, signalement, élus). Placer la carte selon son thème, pas selon la
  place disponible. Ce qui n'entre dans aucun des trois va en bandeau pleine largeur
  au-dessus de la grille (voir `.d-sv-bandeau`).
- [ ] **Vérifier l'équilibre des colonnes après ajout.** Une carte trop haute fait déborder
  sa colonne — c'est arrivé avec les actualités à 5 articles (583 px, contre 89 à 262 px pour
  les autres cartes), qui creusaient un écart de 344 px. Les listes desktop sont des
  **aperçus** : 3 actualités, 4 photos sur une rangée, le reste derrière « Toutes → ».
  Mesure rapide, en console sur l'accueil ≥ 1024 px :
  ```js
  [...document.querySelectorAll('.d-col')].map(c => [
    c.querySelector('.d-col-titre')?.textContent,
    [...c.children].reduce((s, k) => s + k.getBoundingClientRect().height + 16, 0) | 0
  ])
  ```
  Viser moins de ~200 px d'écart entre la plus haute et la plus basse.
  Vérification rapide de ce qui manque :
  ```bash
  # points d'entrée mobile absents du desktop
  { awk 'NR>=151 && NR<=218' index.html; awk 'NR>=257 && NR<=362' index.html; } \
    | grep -o 'open[A-Za-z]*(' | sort -u > /tmp/mob.txt
  awk 'NR>=219 && NR<=256 || NR>=363 && NR<=470' index.html \
    | grep -o 'open[A-Za-z]*(' | sort -u > /tmp/desk.txt
  comm -23 /tmp/mob.txt /tmp/desk.txt
  ```
  (Les numéros de lignes bougent — ajuster aux bornes réelles de `.header`, `.content`,
  `.d-nav` / `.d-main-grid` / `.d-footer`.)
- [ ] **Backend** (si API nécessaire) : créer `routes/<feature>.js` et l'enregistrer dans `index.js`
- [ ] **Service worker** : incrémenter `CACHE` dans `service-worker.js`
- [ ] **MEL** : si la fonctionnalité appelle souvent les mêmes questions, ajouter une `DIRECT_RULE` dans `lib/mel.js`
- [ ] **Tests** : vérifier que les 4 tests Playwright passent (`npx playwright test`)
- [ ] **AXE** : vérifier que les nouveaux éléments visibles respectent les contrastes WCAG AA (ratio ≥ 4.5:1 pour le texte normal, ≥ 3:1 pour le grand texte)
- [ ] **Contenu embarqué** : si la fonctionnalité s'appuie sur un fichier de `data/`,
  l'ajouter à `PRECACHE_URLS` **avec son `?v=`** — sinon elle ne fonctionnera pas hors ligne
- [ ] **Docs** : mettre à jour `docs/guide-utilisateur.md` (section correspondante)
- [ ] **Docs** : mettre à jour ce guide si l'architecture change
- [ ] **Spécification** : créer ou mettre à jour le SFD concerné dans
  `docs/specifications/sfd/`, et la cartographie §3 du SFG

### Mettre à jour le générateur "Partager" (`js/mat-partager.js`)

La page `partager.html` utilise exclusivement `js/mat-partager.js`. Quand vous ajoutez une
fonctionnalité à MAT ou que vous modifiez les coûts d'hébergement :

1. **Catalogue des fonctionnalités** — tableau `FEATURES` en début de fichier. Chaque entrée :
   - `id` : identifiant unique (ex. `"sondages"`)
   - `label` / `desc` : libellé et description courte
   - `pill` : badge affiché (`"ess"` | `"reco"` | `"opt"`)
   - `cost` : objet `{ cloudflare, render, hybrid }` avec `min`/`max` en euros/mois
   - `instructions` : texte long injecté dans le prompt généré — à rédiger avec soin

2. **Coûts d'hébergement** — constantes `HOSTING_COSTS` (render, cloudflare, upstash, domain,
   cloudinary). À mettre à jour si les tarifs changent.

3. **Test après modification** : parcourir les 3 étapes complètes, tester avec chaque niveau
   technique (débutant/intermédiaire/expert), chaque hébergeur (Render, Cloudflare, Hybride)
   et vérifier que le prompt généré est cohérent.

4. **Bumper** le numéro de version dans `PRECACHE_URLS` du service worker :
   `'./js/mat-partager.js?v=X.Y.Z'`.

5. **Suivi des réutilisations du kit** : à la génération du prompt, la page envoie
   le profil déclaré (nom de commune, population, budget, niveau informatique,
   hébergeur, mode souverain) au backend via `POST /stats/partager`
   (`_sendPartagerProfile()`), en plus des compteurs anonymes `partager_visite` /
   `partager_prompt`. Envoi best-effort, uniquement si le nom de commune est
   renseigné ; une mention de transparence est affichée à l'étape 3. Ces profils
   apparaissent dans le mail quotidien « MAT stats » (voir `GUIDE-ADMIN.md` §6bis
   du backend).

### Règles de contraste AXE (pièges fréquents)

- `color:var(--muted)` (`#5a7065`) sur `background:var(--mist)` (`#d8f3dc`) → ratio ~4.1:1 — **échoue** pour le texte normal. Utiliser `var(--leaf)` ou `var(--forest)` à la place.
- `color:var(--muted)` sur fond blanc → ratio ~4.8:1 — passe.
- Tout texte dans un overlay (`display:none` au repos) n'est **pas** vérifié par AXE.

---

## 13. Gestion des secrets

**Règle absolue : aucun secret ne doit être committé dans le dépôt.**

- Les secrets du backend sont stockés exclusivement dans Render (Dashboard → Environment).
- La clé publique VAPID est la seule "clé" présente dans le code frontend — c'est une clé publique, ça ne pose pas de problème.
- Pour le développement local, créer un fichier `.env.local` (jamais committé — ajouté dans `.gitignore`).
- Pour tester le webhook Facebook en local : utiliser [ngrok](https://ngrok.com) pour exposer `localhost:3000` et mettre à jour temporairement l'URL du webhook dans l'app Facebook.

---

*Dernière mise à jour : mai 2026*  
*Application MAT — Commune de Mézières-lez-Cléry — Licence MIT*
