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
│   ├── mat-desktop.css     Styles layout desktop (≥ 900 px)
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
│   ├── mat-sondages.js     Sondages citoyens
│   ├── mat-accessibility.js Accessibilité (taille texte, contraste, TTS)
│   ├── mat-desktop.js      Rendu spécifique layout desktop
│   ├── mat-pwa-notif.js    Gestion abonnements push (frontend)
│   ├── mat-dechets-notif.js Notifications rappel collecte
│   ├── mat-eau8.js         Eau (qualité, distribution)
│   ├── mat-jours-feries.js Calcul jours fériés français
│   ├── mat-partager.js     Logique du générateur partager.html
│   └── mat-utils.js        Utilitaires communs
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
    └── veille-bulletin.yml Veille éditoriale bulletin municipal (mensuelle)
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
  (`.amb-star`, réutilise `ambTwinkle`) en phase `night`. Rien à l'aube/crépuscule
  (la teinte de phase suffit).
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
| `ci.yml` | push/PR sur `main`, `claude/**` | Vérification syntaxe JS (`node --check`) |
| `e2e.yml` | push/PR sur `main`, `claude/**` | Tests Playwright : 4 tests × 2 navigateurs (Desktop Chrome, Pixel 7) |
| `lighthouse.yml` | push sur `main` + hebdo (cron) | Audit Lighthouse (performance, accessibilité, SEO) |
| `liens-morts.yml` | hebdomadaire (cron, lundi) | Détection de liens morts dans l'app |
| `sauvegarde-upstash.yml` | hebdomadaire (cron, lundi) | Sauvegarde de la base Redis Upstash |
| `veille-techno.yml` | hebdomadaire (cron, lundi) | Veille technologique par IA (Claude Code + recherche web), rapport HTML envoyé par email (Resend) |
| `veille-bulletin.yml` | mensuel (1er lundi) | Veille éditoriale : idées d'articles pour le bulletin municipal, par email |

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

### Robustesse des veilles IA (retry + diagnostic)

L'étape Claude Code des deux veilles peut se terminer « avec succès » **sans avoir
écrit le rapport HTML** (abandon prématuré de l'agent, recherches en échec…). Les
workflows traitent donc le livrable comme vérifiable (ADR-0004) :

- le prompt est construit une fois dans une variable d'env (`VEILLE_PROMPT` /
  `BULLETIN_PROMPT`) partagée par les deux invocations ;
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
> Étape suivante prévue (non encore livrée) : un agent ouvrant automatiquement une
> **PR en draft** par action éligible. La `veille-bulletin.yml` (éditoriale) n'a pas
> ce canal : ses idées d'articles ne sont pas des actions techniques.

### Tests Playwright

Les tests sont dans `tests/e2e/smoke.spec.js` :
- Chargement de la page (titre, lang, meta description)
- Ouverture overlay RGPD (présence du texte "Souveraineté numérique")
- Ouverture overlay Accessibilité (présence de la déclaration RGAA)
- Audit AXE : zéro violation `serious` ou `critical` (WCAG 2.1 AA)

Le serveur statique de test est `tests/e2e/static-server.js`. Toutes les requêtes vers des hôtes externes sont interceptées et bloquées (tests hermétiques).

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
- [ ] **CSS** : ajouter les styles dans `css/mat.css` (mobile) et/ou `css/mat-desktop.css` (desktop ≥ 900 px)
- [ ] **Backend** (si API nécessaire) : créer `routes/<feature>.js` et l'enregistrer dans `index.js`
- [ ] **Service worker** : incrémenter `CACHE` dans `service-worker.js`
- [ ] **MEL** : si la fonctionnalité appelle souvent les mêmes questions, ajouter une `DIRECT_RULE` dans `lib/mel.js`
- [ ] **Tests** : vérifier que les 4 tests Playwright passent (`npx playwright test`)
- [ ] **AXE** : vérifier que les nouveaux éléments visibles respectent les contrastes WCAG AA (ratio ≥ 4.5:1 pour le texte normal, ≥ 3:1 pour le grand texte)
- [ ] **Docs** : mettre à jour `docs/guide-utilisateur.md` (section correspondante)
- [ ] **Docs** : mettre à jour ce guide si l'architecture change

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
