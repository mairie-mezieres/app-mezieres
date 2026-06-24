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
└── .github/workflows/
    ├── ci.yml              Vérification syntaxe JS
    ├── e2e.yml             Tests Playwright
    ├── lighthouse.yml      Audit performance/accessibilité
    └── ecoindex.yml        Mesure empreinte carbone (hebdomadaire)
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

Quatre workflows dans `.github/workflows/` :

| Workflow | Déclencheur | Description |
|----------|-------------|-------------|
| `ci.yml` | push/PR sur `main`, `claude/**` | Vérification syntaxe JS (`node --check`) |
| `e2e.yml` | push/PR sur `main`, `claude/**` | Tests Playwright : 4 tests × 2 navigateurs (Desktop Chrome, Pixel 7) |
| `lighthouse.yml` | push sur `main` | Audit Lighthouse (performance, accessibilité, SEO) |
| `ecoindex.yml` | hebdomadaire (cron) | Mesure EcoIndex (empreinte carbone de la page) |

**Concurrence** : chaque workflow annule le run précédent en cours pour le même PR ou la même branche (évite les doublons d'emails).

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
- [ ] **JS** : créer ou modifier le fichier `js/mat-<feature>.js`
- [ ] **CSS** : ajouter les styles dans `css/mat.css` (mobile) et/ou `css/mat-desktop.css` (desktop ≥ 900 px)
- [ ] **Backend** (si API nécessaire) : créer `routes/<feature>.js` et l'enregistrer dans `index.js`
- [ ] **Service worker** : incrémenter `CACHE` dans `service-worker.js`
- [ ] **MEL** : si la fonctionnalité appelle souvent les mêmes questions, ajouter une `DIRECT_RULE` dans `lib/mel.js`
- [ ] **Tests** : vérifier que les 4 tests Playwright passent (`npx playwright test`)
- [ ] **AXE** : vérifier que les nouveaux éléments visibles respectent les contrastes WCAG AA (ratio ≥ 4.5:1 pour le texte normal, ≥ 3:1 pour le grand texte)
- [ ] **Docs** : mettre à jour `docs/guide-utilisateur.md` (section correspondante)
- [ ] **Docs** : mettre à jour ce guide si l'architecture change

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
