# Spécifications Fonctionnelles Générales (SFG) — MAT (Mézières Avec Toi)

> Document chapeau du [référentiel de spécifications](README.md). Il pose le cadre commun à
> tous les [SFD](README.md#index-des-sfd) : vision, acteurs, cartographie des processus,
> exigences transverses et modèle de données.

## 1. Objet & contexte

**MAT — « Mézières Avec Toi »** est le **portail citoyen** de la commune de
Mézières-lez-Cléry (Loiret, ~1 000 habitants). C'est une **application web progressive (PWA)**
installable, conçue pour :

- rapprocher la mairie des habitants (actualités, agenda, contact, signalements) ;
- offrir des services pratiques du quotidien (météo, déchets, transports, urbanisme) ;
- favoriser la participation citoyenne (idées, sondages, photos) ;
- le tout dans une démarche d'**accessibilité** (public majoritairement sénior), de
  **souveraineté numérique** (IA française, pas de CDN tiers) et de **sobriété**.

### Périmètre

| Composant | Description | Dépôt |
|-----------|-------------|-------|
| **Frontend PWA** | Application citoyenne (HTML/CSS/JS vanilla), Service Worker, hors-ligne, notifications push. Back-office mairie (`admin.html`). | `app-mezieres` (public) |
| **Backend / API** | Service Node.js/Express : assistant IA, stockage, notifications, intégrations. | `chatbot-mairie-mezieres` |

Le présent référentiel couvre **les deux composants** d'un point de vue fonctionnel unifié.

## 2. Acteurs / rôles

| Acteur | Description | Identification |
|--------|-------------|----------------|
| **Citoyen** | Habitant ou visiteur utilisant la PWA. **Aucun compte** : usage anonyme. | `deviceId` technique (identifiant d'appareil), jamais nominatif |
| **Administrateur mairie** | Agent/élu gérant les contenus et la modération via le back-office. **Accès complet** (pas de rôles granulaires). | Mot de passe unique transmis en en-tête `x-admin-token` |
| **Système** | Traitements automatiques planifiés (crons) : rappels déchets, vérification météo, statistiques quotidiennes, sauvegarde. | Clé `CRON_SECRET` |
| **Intégrations tierces** | Services externes mobilisés par les processus. | Voir tableau ci-dessous |

### Intégrations tierces

| Service | Rôle | Souveraineté / hébergement |
|---------|------|----------------------------|
| **Mistral AI** | Assistant MEL (réponses IA) — **prioritaire** | France / UE |
| **Anthropic Claude** | Repli IA (MEL) + extraction PDF horaires bus | USA |
| **Upstash Redis** | Stockage des données | UE |
| **Cloudinary** | Hébergement & transformation des images | — |
| **Trello** | Gestion des signalements / demandes | — |
| **Facebook (Graph API)** | Publication & récupération des actualités | — |
| **Google Calendar** | Agenda communal (lecture iCal + écriture) | — |
| **Météo-France** | Vigilances météorologiques | France |
| **Open-Meteo** | Prévisions météo | UE |
| **IGN (Apicarto / Géoplateforme)** | Zones PLU, urbanisme | France |
| **Resend** | Envoi des emails de statistiques | — |
| **Sentry** | Supervision des erreurs (optionnel) | — |
| **Render** | Hébergement du backend | USA |

## 3. Cartographie des processus

| Réf. | Processus | Citoyen | Admin | Système |
|------|-----------|:-------:|:-----:|:-------:|
| SFD-01 | Actualités communales | Lecture, réactions | Publication multi-canal | Import Facebook, push |
| SFD-02 | Assistant virtuel MEL | Questions | Configuration arbre/réponses | — |
| SFD-03 | Signalements citoyens | Dépôt, suivi | Traitement, statut | Sync Trello, push |
| SFD-04 | Boîte à idées & votes | Dépôt, vote | Statut, commentaire | Push |
| SFD-05 | Photos communautaires | Dépôt, vote | Modération | — |
| SFD-06 | Sondages citoyens | Vote | Création, résultats | — |
| SFD-07 | Agenda & événements | Consultation, RSVP | (via actualités/Agenda) | — |
| SFD-08 | Notifications push | Abonnement | Envoi manuel, historique | Envois automatiques |
| SFD-09 | Météo & vigilance | Consultation | — | Auto-post, push |
| SFD-10 | Déchets & collecte | Consultation, rappels | — | Rappels push |
| SFD-11 | Services pratiques | Consultation | Annuaires (entreprises, docs) | — |
| SFD-12 | Contact & demandes | Envoi | Traitement | Sync Trello, push |
| SFD-13 | Accessibilité & personnalisation | Réglages | — | — |
| SFD-14 | Administration (back-office) | — | Tous contenus | — |
| SFD-15 | Supervision & conformité | — | Tableau de bord, diagnostic, purge | Crons, sauvegarde |

## 4. Exigences transverses (règles de gestion transverses)

Ces règles s'appliquent à **l'ensemble des processus**. Elles sont référencées dans les SFD par
leur identifiant `RG-T-x`.

### Offline-first & résilience

- **RG-T-1** — Toute fonctionnalité doit **dégrader gracieusement hors-ligne** : lecture depuis
  le cache, écriture conservée localement puis synchronisée dès le retour du réseau.
- **RG-T-2** — Le Service Worker applique une stratégie **« stale-while-revalidate »** : la version
  en cache est servie immédiatement, puis rafraîchie en arrière-plan.
- **RG-T-3** — En cas d'indisponibilité d'une source de données, l'application **n'affiche jamais
  une donnée erronée** : elle indique « Information indisponible » (jamais un faux « aucune alerte »).
- **RG-T-4** — Les appels réseau sortants sont bornés par un **timeout** (8 s par défaut côté PWA).

### Anonymat & minimisation des données

- **RG-T-5** — Aucun compte utilisateur : le citoyen est identifié uniquement par un `deviceId`
  technique, jamais par une donnée nominative.
- **RG-T-6** — Toute action « 1 par personne » (vote, RSVP, participation sondage) est
  **dédupliquée par `deviceId`** : une seule contribution par appareil.
- **RG-T-7** — Les contenus exposés publiquement (signalements) sont **anonymisés** : masquage
  automatique des numéros de téléphone et adresses email, suppression des métadonnées d'appareil.

### RGPD & gouvernance des données

- **RG-T-8** — Responsable de traitement : **la commune de Mézières-lez-Cléry**. Base légale :
  **mission d'intérêt public** (art. 6-1-e du RGPD).
- **RG-T-9** — Les **durées de conservation** sont définies par donnée (voir chaque SFD et le
  modèle de données §5). Les contenus publics (idées, photos approuvées) sont conservés tant
  qu'ils restent pertinents ; les données techniques (quotas, caches) ont un TTL court.
- **RG-T-10** — La **journalisation du contenu des questions MEL est désactivée par défaut**.
  Son activation (conservation 90 jours) nécessite une **AIPD** préalable.
- **RG-T-11** — Les **droits des personnes** (accès, rectification, suppression) s'exercent
  auprès de la mairie / DPO ; le citoyen peut directement se désabonner du push et supprimer ses
  propres photos.

### IA Act & transparence (assistant MEL)

- **RG-T-12** — L'assistant MEL est présenté **explicitement comme un assistant virtuel** (obligation
  de transparence, art. 50 IA Act).
- **RG-T-13** — MEL est un système à **risque limité, non « haut risque »** : il ne prend **aucune
  décision administrative** (n'accorde, ne refuse ni ne révoque aucun droit ou aide) et **renvoie
  systématiquement à la mairie** pour toute décision.
- **RG-T-14** — Les réponses de MEL sont **sans valeur juridique** et le précisent ; des mesures
  anti-injection et anti-hallucination sont en place (voir SFD-02).

### Accessibilité

- **RG-T-15** — Objectif de conformité **RGAA 4 / WCAG 2.1 niveau AA** : contrastes vérifiés
  automatiquement (axe-core en CI), tailles de texte réglables, mode contraste élevé, mode
  daltonien, lecture vocale (TTS), thèmes clair/sombre.

### Sécurité

- **RG-T-16** — Les secrets (clés API, mots de passe) sont **hors dépôt** (variables
  d'environnement uniquement).
- **RG-T-17** — L'authentification administrateur repose sur une **comparaison à temps constant**
  (anti timing-attack) et un **rate-limiting anti-force brute** (20 tentatives / 15 min).
- **RG-T-18** — Les webhooks entrants (Facebook, Trello) sont validés par **signature HMAC**.
- **RG-T-19** — Les routes publiques sensibles sont protégées par **rate-limiting** (voir chaque SFD).
- **RG-T-20** — En-têtes HTTP durcis (`X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`) ; CORS strict sur les routes d'administration.

### Performance & sobriété

- **RG-T-21** — Images servies en **WebP** optimisé (transformation Cloudinary), chargement
  paresseux des overlays, budget mesuré en continu (Lighthouse + EcoIndex).

### Disponibilité & quotas

- **RG-T-22** — Le stockage Redis (offre gratuite Upstash : ~10 000 commandes/jour) bascule en
  **mode dégradé** au-delà du quota (HTTP 429) : les écritures non critiques (votes, réactions)
  sont refusées avec un code 503, les lectures continuent depuis le cache mémoire.
- **RG-T-23** — Le backend (Render, offre gratuite) peut subir un **démarrage à froid** (cold
  start) : les appels doivent tolérer une première réponse lente.

## 5. Vue d'ensemble du modèle de données

### Stockage serveur (Redis / Upstash) — principales clés

| Clé | Type | Contenu | Plafond / TTL |
|-----|------|---------|---------------|
| `mat:actus` | tableau JSON | Actualités | 30 max |
| `mat:idees` | tableau JSON | Idées citoyennes | 200 max |
| `mat:signals` | tableau JSON | Signalements (cache ; vérité = Trello) | 100 max |
| `mat:photos` | tableau JSON | Photos galerie | 300 max |
| `mat:sondages` + `mat:sondage:results:{id}` | JSON | Sondages & résultats | — |
| `mat:subs` / `mat:subs:meteo` / `mat:subs:dechets` | tableau JSON | Abonnements push (général / météo / déchets) | — |
| `mat:votes:idee:{id}` / `mat:votes:photo:{id}` / `mat:voted:sondage:{id}` / `mat:likes:actu:{id}` / `mat:rsvp:event:{uid}` | set | `deviceId` ayant contribué (déduplication) | — |
| `mat:mel:tree:data` | JSON | Arbre de décision MEL (configurable admin) | — |
| `mat:mel:quotas:{deviceId}:{date}` | nombre | Quota questions MEL | TTL 24–26 h |
| `mat:mel:blocked:{deviceId}` | horodatage | Blocage suite à injection | TTL 24 h |
| `mat:mel:questions:{date}` | liste | Journal des questions MEL (**si activé**) | TTL 90 j |
| `mat:admin:settings` | JSON | Réglages back-office (feature flags) | — |
| `mat:info_banner` / `mat:mascotte` | JSON | Encart d'alerte / photo mascotte | — |
| `mat:entreprises` / `mat:docs:temp` / `mat:docs:featured` | JSON | Annuaire entreprises / documents | — |
| `mat:stats` / `mat:ia:stats` | JSON | Statistiques d'usage & coûts IA | rétention 90 j (jour) / 24 mois (mois) |
| `mat:weather:last` / `mat:meteo:cache` | JSON | Dernière vigilance / cache prévisions | 12 h / 30 min |
| `mat:push:history` | tableau JSON | Historique des 50 derniers envois push | — |

### Stockage local (PWA — `localStorage`)

Brouillons de formulaires (`mat_*_form_state`), préférences d'accessibilité
(`mat_accessibility`), suivis de votes locaux (`mat_votes_v3`, `mat_photo_votes_v1`,
`mat_rsvp_events_v1`), états « déjà vu » pour les badges (`mat_actus_seen_v1`,
`mat_photos_seen_v1`), abonnements (`mat_push_active`, `mat_dechets_notif_v1`), et historiques
locaux des contributions (`mat_my_signals_v1`, `mat_my_photos_v1`, max 50 éléments).

> Détail exhaustif des clés : voir SFD concernés et le [guide technique](../guide-technique.md).

## 6. Glossaire & conventions

| Terme | Définition |
|-------|------------|
| **PWA** | Progressive Web App — application web installable, fonctionnant hors-ligne. |
| **MEL** | Assistant virtuel conversationnel de MAT (« Mézières en Ligne »). |
| **MAT-REF** | Référence technique liant un signalement à un jeton de notification push. |
| **Vigilance** | Niveau d'alerte Météo-France (vert / jaune / orange / rouge). |
| **deviceId** | Identifiant technique d'appareil, anonyme, servant à la déduplication. |
| **Mode dégradé** | État de fonctionnement réduit lorsque le quota Redis est dépassé. |
| **SFG / SFD** | Spécifications Fonctionnelles Générales / Détaillées. |
| **RG / US** | Règle de Gestion / User Story. |

Les conventions de rédaction (gabarit des SFD, identifiants) sont décrites dans le
[README du référentiel](README.md#conventions-de-rédaction).
