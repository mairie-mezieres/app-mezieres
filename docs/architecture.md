# Architecture applicative — MAT (Mézières Avec Toi)

> **Documentation centrale d'architecture.** Schémas (rendus nativement par GitHub via Mermaid,
> sans dépendance externe) décrivant l'architecture technique de MAT : vues de contexte, de
> conteneurs et de déploiement, flux métier clés, fonctionnement hors-ligne et modèle de données.
>
> Documents liés : [README](../README.md) · [Guide technique](guide-technique.md) ·
> [Référentiel de spécifications (MOA)](specifications/README.md) ·
> [Cartographie visuelle des services](../architecture.html) (page interactive).
>
> 🔄 **Document vivant** — à mettre à jour à chaque évolution structurante de l'architecture.

---

## Sommaire

1. [Vue d'ensemble (contexte)](#1-vue-densemble-contexte)
2. [Vue des conteneurs](#2-vue-des-conteneurs)
3. [Vue de déploiement](#3-vue-de-déploiement)
4. [Flux métier clés (séquences)](#4-flux-métier-clés-séquences)
   - [4.1 Assistant MEL](#41-assistant-mel-pipeline-de-réponse)
   - [4.2 Import d'actualité (webhook Facebook)](#42-import-dactualité--webhook-facebook)
   - [4.3 Publication multi-canal (back-office)](#43-publication-multi-canal-back-office)
   - [4.4 Signalement citoyen](#44-signalement-citoyen--trello--push)
   - [4.5 Notifications push (abonnement + envoi)](#45-notifications-push-abonnement--envoi)
   - [4.6 Météo & vigilance (cron)](#46-météo--vigilance-cron-automatique)
5. [Fonctionnement hors-ligne (PWA)](#5-fonctionnement-hors-ligne-pwa)
6. [Modèle de données](#6-modèle-de-données)

---

## 1. Vue d'ensemble (contexte)

MAT est un portail citoyen composé d'un **frontend statique (PWA)** et d'un **backend Node.js**,
adossés à un **cache Redis** et à un ensemble d'**API tierces** (IA souveraine, données publiques,
services communaux).

```mermaid
flowchart TB
    citoyen(["👤 Citoyen<br/>(anonyme, deviceId)"])
    admin(["🏛️ Administrateur<br/>mairie"])

    subgraph mat["Système MAT"]
        front["PWA — app-mezieres<br/>HTML/CSS/JS vanilla"]
        back["Backend — chatbot-mairie-mezieres<br/>Node.js / Express"]
        redis[("Upstash Redis<br/>cache & données")]
    end

    ia["🤖 IA souveraine<br/>Mistral AI · Claude (fallback)"]
    donnees["📊 Données publiques<br/>Open-Meteo · Météo-France<br/>IGN/Cadastre · data.gouv.fr"]
    communaux["🗂️ Services communaux<br/>Facebook · Google Calendar<br/>Trello · Cloudinary · Resend"]
    push["🔔 Web Push<br/>FCM / APNs"]

    citoyen -->|HTTPS| front
    admin -->|HTTPS + token| front
    front <-->|API REST| back
    back <--> redis
    back --> ia
    back --> donnees
    back --> communaux
    back --> push
    push -.->|notification| citoyen
```

**Principes structurants**
- **Frontend 100 % statique** : aucun build, aucun bundler, aucune dépendance CDN au runtime
  (Leaflet, polices, Sentry auto-hébergés).
- **Anonymat** : pas de compte, identification technique par `deviceId` (cf.
  [SFG §2](specifications/SFG-specifications-generales.md)).
- **Souveraineté** : IA prioritaire Mistral (France), données applicatives en UE.

---

## 2. Vue des conteneurs

Détail des composants internes et de leurs responsabilités.

```mermaid
flowchart LR
    subgraph nav["Navigateur (iOS / Android / Desktop)"]
        direction TB
        ui["index.html + modules JS<br/>mat-core, mat-mel, mat-actus,<br/>mat-forms, mat-agenda…"]
        admin_ui["admin.html<br/>back-office mairie"]
        sw["service-worker.js<br/>cache Network-First + push"]
    end

    subgraph render["Backend Express (Render)"]
        direction TB
        routes["routes/*<br/>mel · webhook · push · meteo · geo<br/>signalements · idees · sondages<br/>admin-* · cron-* · core"]
        lib["lib/*<br/>mel · store · redis · webpush<br/>cloudinary · facebook · meteo<br/>middleware (auth, HMAC)"]
        routes --> lib
    end

    redis[("Upstash Redis<br/>clés mat:*")]

    ext["API tierces<br/>Mistral · Claude · Facebook<br/>Google Calendar · Trello · Cloudinary<br/>Open-Meteo · Météo-France · IGN · Resend"]

    ui <-->|fetch JSON| routes
    admin_ui <-->|x-admin-token| routes
    ui --> sw
    sw -.->|cache offline| ui
    lib <--> redis
    lib <--> ext
    ext -.->|webhook entrant| routes
```

Référence détaillée des fichiers : [Guide technique §2](guide-technique.md#2-dépôts-et-structure-des-fichiers).

---

## 3. Vue de déploiement

```mermaid
flowchart TB
    subgraph device["Appareil citoyen"]
        browser["Navigateur + PWA installée"]
    end

    subgraph cf["Cloudflare Pages"]
        static["Frontend statique<br/>mezieres-lez-clery.fr<br/>déploiement auto sur push main"]
    end

    subgraph rnd["Render (Node.js)"]
        api["chatbot-mairie-mezieres<br/>node index.js<br/>déploiement auto sur push main"]
    end

    subgraph upstash["Upstash (EU)"]
        db[("Redis REST<br/>10 000 req/jour")]
    end

    subgraph saas["Services externes"]
        apis["Mistral · Claude · Facebook<br/>Google Calendar · Trello<br/>Cloudinary · Open-Meteo<br/>Météo-France · IGN · Resend"]
    end

    gha["GitHub Actions<br/>CI · E2E · Lighthouse<br/>EcoIndex · liens-morts · veilles"]

    browser -->|HTTPS| static
    browser -->|HTTPS API| api
    api --> db
    api --> apis
    apis -.->|webhooks| api
    gha -.->|déploiement & qualité| static
    gha -.->|crons & veilles| api
```

> ⚠️ **Migration Render prévue en août 2026** (fin du plan Free) — prévoir le passage en
> Starter (cf. [Guide technique §11](guide-technique.md#11-déploiement)).

---

## 4. Flux métier clés (séquences)

### 4.1 Assistant MEL (pipeline de réponse)

Priorité aux réponses **sans appel IA** (règles directes, cache), puis **Mistral**, puis **Claude**
en repli, et enfin une réponse statique si tout est indisponible.

```mermaid
sequenceDiagram
    actor U as Citoyen
    participant F as PWA (mat-mel.js)
    participant B as Backend /mel
    participant R as Redis
    participant M as Mistral AI
    participant C as Claude (fallback)

    U->>F: Pose une question
    F->>B: POST /mel { question }
    B->>B: normalizeQuestion()
    B->>B: findDirectAnswer() (DIRECT_RULES)
    alt Règle directe trouvée
        B-->>F: Réponse fixe (aucun appel IA)
    else
        B->>R: Réponse en cache ?
        alt Cache hit
            R-->>B: Réponse mémorisée
            B-->>F: Réponse (cache)
        else Cache miss
            B->>M: Appel Mistral
            alt Mistral OK
                M-->>B: Réponse IA
                B->>R: Mémorise (TTL 24h)
                B-->>F: Réponse (mistral)
            else Mistral indisponible
                B->>C: Appel Claude Haiku
                alt Claude OK
                    C-->>B: Réponse IA
                    B->>R: Mémorise (TTL 24h)
                    B-->>F: Réponse (claude)
                else Claude indisponible
                    B-->>F: Réponse statique de repli
                end
            end
        end
    end
```

Détail des règles (quotas, anti-injection, valeur non juridique) :
[SFD-02](specifications/sfd/SFD-02-assistant-mel.md).

### 4.2 Import d'actualité — webhook Facebook

```mermaid
sequenceDiagram
    participant FB as Facebook (page mairie)
    participant B as Backend /webhook
    participant CL as Cloudinary
    participant R as Redis
    participant P as Web Push

    FB->>B: POST /webhook (post #MAT)
    B->>B: Vérifie HMAC-SHA256 (X-Hub-Signature-256)
    B->>R: postId déjà traité ? (déduplication)
    alt Nouveau post
        B->>CL: Héberge la photo (URL permanente)
        CL-->>B: secure_url
        B->>R: Stocke l'actualité (titre, desc, photo, date)
        B->>P: Notifie les abonnés
        P-->>B: ok / purge endpoints 410-404
    else Déjà importé
        B-->>FB: 200 (ignoré)
    end
```

Détail : [SFD-01](specifications/sfd/SFD-01-actualites.md).

### 4.3 Publication multi-canal (back-office)

Publication **atomique** : si Facebook échoue, l'image Cloudinary est nettoyée (rollback).

```mermaid
sequenceDiagram
    actor A as Administrateur
    participant AD as admin.html
    participant B as Backend /admin/actus
    participant CL as Cloudinary
    participant FB as Facebook
    participant R as Redis
    participant P as Web Push
    participant G as Google Calendar

    A->>AD: Rédige l'actu + choisit les canaux
    AD->>B: POST /admin/actus (x-admin-token)
    B->>CL: Upload image
    B->>FB: Publie (sans #MAT)
    alt Publication Facebook OK
        B->>R: Enregistre l'actualité
        B->>P: Push aux abonnés
        B->>G: Upsert événement agenda (si demandé)
        B-->>AD: Récapitulatif par canal
    else Échec Facebook
        B->>CL: Supprime l'image (rollback)
        B-->>AD: Erreur 502 (atomicité)
    end
```

Détail : [SFD-14](specifications/sfd/SFD-14-administration-backoffice.md).

### 4.4 Signalement citoyen → Trello → push

```mermaid
sequenceDiagram
    actor U as Citoyen
    participant F as PWA (mat-forms.js)
    participant B as Backend /signal
    participant CL as Cloudinary
    participant T as Trello
    participant R as Redis

    U->>F: Décrit le problème (+ photo, GPS)
    F->>F: Compresse la photo (≤ 6 Mo)
    F->>B: POST /signal (rate-limit 10/min)
    opt Photo jointe
        B->>CL: Héberge la photo
    end
    B->>T: Crée une carte (liste « signalements »)
    B->>R: Mémorise le suivi (statut pending)
    B-->>F: Confirmation + référence (MAT-REF)
    Note over T,U: Changement de statut Trello → push au citoyen
```

Détail : [SFD-03](specifications/sfd/SFD-03-signalements.md) ·
[SFD-12](specifications/sfd/SFD-12-contact-demandes.md).

### 4.5 Notifications push (abonnement + envoi)

```mermaid
sequenceDiagram
    actor U as Citoyen
    participant F as PWA (mat-pwa-notif.js)
    participant SW as Service Worker
    participant B as Backend /push
    participant R as Redis
    participant WP as Web Push (FCM/APNs)

    U->>F: Active les notifications
    F->>SW: subscribe(VAPID public key)
    SW-->>F: PushSubscription (endpoint)
    F->>B: POST /push/subscribe
    B->>R: Stocke l'endpoint (mat:subs / :meteo / :dechets)

    Note over B,WP: Plus tard — nouvel événement
    B->>WP: web-push(endpoint, payload)
    WP-->>SW: Notification
    SW-->>U: Affiche le message
    opt Endpoint expiré (410/404)
        WP-->>B: Erreur
        B->>R: Purge l'endpoint
    end
```

Détail : [SFD-08](specifications/sfd/SFD-08-notifications-push.md).

### 4.6 Météo & vigilance (cron automatique)

```mermaid
sequenceDiagram
    participant CR as Cron (GitHub Actions)
    participant B as Backend /cron/meteo
    participant OM as Open-Meteo
    participant MF as Météo-France
    participant R as Redis
    participant FB as Facebook
    participant P as Web Push

    CR->>B: GET /cron/meteo (CRON_SECRET)
    B->>OM: Prévisions locales
    B->>MF: Bulletin de vigilance
    B->>R: Déduplication 12h (niveau + phénomène)
    alt Vigilance significative & non dédupliquée
        opt Niveau ≥ 3
            B->>FB: Auto-post d'alerte
        end
        B->>P: Push aux abonnés météo
        B->>R: Mémorise l'envoi
    else Rien de nouveau
        B-->>CR: 200 (aucune action)
    end
```

Détail : [SFD-09](specifications/sfd/SFD-09-meteo-vigilance.md) ·
[SFD-10](specifications/sfd/SFD-10-dechets-collecte.md) ·
[SFD-15](specifications/sfd/SFD-15-supervision-conformite.md).

---

## 5. Fonctionnement hors-ligne (PWA)

Le service worker applique une stratégie **Network-First** : réseau d'abord, repli sur le cache
versionné en cas d'échec. L'app reste consultable hors-ligne, et n'affiche jamais de fausse donnée.

```mermaid
flowchart TB
    req["Requête (page / ressource)"] --> net{"Réseau<br/>disponible ?"}
    net -->|Oui| ok["Réponse réseau"]
    ok --> cache[("Met à jour le cache<br/>mat-vX.Y.Z")]
    ok --> render["Affichage"]
    net -->|Non| hit{"En cache ?"}
    hit -->|Oui| cached["Réponse cachée"] --> render
    hit -->|Non| offline["Page offline.html<br/>ou « Info indisponible »"]
```

- **Versionnement** : constante `CACHE = 'mat-vX.Y.Z'` dans `service-worker.js`, incrémentée à
  chaque déploiement frontend (cf. [CLAUDE.md](../CLAUDE.md) et
  [Guide technique §7](guide-technique.md#7-pwa-et-service-worker)).
- **Écritures hors-ligne** : brouillons de formulaires conservés en `localStorage`, envoi différé
  (cf. [SFD-03](specifications/sfd/SFD-03-signalements.md), [SFD-12](specifications/sfd/SFD-12-contact-demandes.md)).

---

## 6. Modèle de données

Les données applicatives sont stockées dans **Upstash Redis** sous des clés préfixées `mat:*`
(vue de synthèse ci-dessous ; détail et plafonds dans
[SFG §5](specifications/SFG-specifications-generales.md#5-vue-densemble-du-modèle-de-données)).

```mermaid
flowchart LR
    subgraph contenus["Contenus"]
        a["mat:actus (≤ 30)"]
        i["mat:idees (≤ 200)"]
        ph["mat:photos (≤ 300)"]
        s["mat:signals (≤ 100)"]
        so["mat:sondages"]
        en["mat:entreprises · mat:docs:*"]
    end
    subgraph push["Push & abonnements"]
        su["mat:subs · :meteo · :dechets"]
        hi["mat:push:history"]
    end
    subgraph mel["MEL & cache"]
        tr["mat:mel:tree:data"]
        ca["mat:mel:cache:* (TTL 24h)"]
        qu["quotas device (TTL 24h)"]
    end
    subgraph admin["Admin & système"]
        se["mat:admin:settings"]
        st["mat:stats · mat:ia:stats"]
        fl["mat:dechets:lastSent · mat:daily:stats:sent"]
    end
```

Côté **client**, les préférences et brouillons sont en `localStorage`
(`mat_accessibility`, `mat_contact_form_state`, `mat_my_signals_v1`…).

---

*Application MAT — Commune de Mézières-lez-Cléry — Licence MIT*
