# SFD-14 — Administration (back-office mairie)

> [Référentiel](../README.md) · [SFG](../SFG-specifications-generales.md) · Processus : **Administration**

## 1. Objectif

Doter la mairie d'un **back-office** (`admin.html`) pour **publier**, **modérer** et **configurer**
l'ensemble des contenus de MAT : actualités multi-canal, idées, signalements, photos, sondages,
documents, entreprises, encart d'information, mascotte, et configuration de l'assistant MEL.

## 2. Acteurs concernés

- **Administrateur mairie** : accès complet (pas de rôles granulaires).

## 3. User stories

- **US-14.1** — En tant qu'administrateur, je veux m'authentifier afin d'accéder au back-office en sécurité.
- **US-14.2** — En tant qu'administrateur, je veux publier une actualité sur plusieurs canaux
  (Facebook, push, agenda) en une seule opération afin de gagner du temps.
- **US-14.3** — En tant qu'administrateur, je veux modérer les contributions (idées, signalements,
  photos, sondages) afin de garantir la qualité des contenus.
- **US-14.4** — En tant qu'administrateur, je veux configurer l'arbre de l'assistant MEL afin
  d'améliorer ses réponses.
- **US-14.5** — En tant qu'administrateur, je veux gérer les contenus pratiques (documents,
  entreprises, encart d'info, mascotte) afin de tenir l'application à jour.

## 4. Critères d'acceptation (Gherkin)

### US-14.1
```
Étant donné l'écran de connexion admin
Quand je saisis le mot de passe correct
Alors j'accède au back-office et un jeton est conservé pour les requêtes suivantes
Et après plusieurs tentatives échouées, l'accès est temporairement bloqué (anti-force brute).
```

### US-14.2
```
Étant donné le formulaire de création d'actualité
Quand je saisis le contenu, sélectionne les canaux (Facebook / push / agenda) et publie
Alors l'image est hébergée, l'actualité est publiée sur Facebook, poussée aux abonnés et créée dans l'agenda
Et un récapitulatif par canal (succès/avertissement/erreur) m'est présenté.
```

### US-14.3 (modération photo)
```
Étant donné une photo « en attente »
Quand je l'approuve
Alors elle devient visible dans la galerie publique
Et si je la supprime, elle est retirée de l'application et de l'hébergement.
```

### US-14.4
```
Étant donné l'éditeur d'arbre MEL
Quand j'ajoute/édite/réordonne des catégories et questions puis j'enregistre
Alors la nouvelle configuration est validée et persistée côté serveur
Et une structure invalide est rejetée avec un message.
```

## 5. Règles de gestion

### Authentification
- **RG-14.1** — Authentification par **mot de passe unique** (`ADMIN_PASSWORD`, plus
  `ADMIN_PASSWORD2` optionnel) transmis en en-tête `x-admin-token`, vérifié par **comparaison à
  temps constant** (SHA-256) — cf. RG-T-17.
- **RG-14.2** — **Fail-closed** : si aucun mot de passe n'est configuré, toutes les routes `/admin`
  renvoient 401.
- **RG-14.3** — **Anti-force brute** : 20 tentatives échouées / 15 min (les requêtes authentifiées
  ne sont pas comptées). **Pas de rôles** : tout admin a un accès complet.

### Publication d'actualité multi-canal
- **RG-14.4** — Titre **≤ 150** caractères, description **≤ 3 000** ; image **≤ 6 Mo** (Cloudinary).
- **RG-14.5** — Enchaînement : **Cloudinary → Facebook → Redis → push → Google Agenda**. Si la
  publication Facebook échoue, l'image Cloudinary est **nettoyée** (rollback) et une erreur 502 est
  retournée (atomicité).
- **RG-14.6** — Création/mise à jour d'événement agenda en **upsert** : un événement de **titre
  proche (> 60 % de similarité)** le même jour est **remplacé** plutôt que dupliqué.
- **RG-14.7** — Publication Facebook **sans** le hashtag `#MAT` (évite la boucle d'import du webhook,
  cf. [SFD-01](SFD-01-actualites.md)).
- **RG-14.8** — Possibilité de **programmer** jusqu'à 2 notifications push.

### Modération
- **RG-14.9** — **Idées** : changement de statut (`studying`/`accepted`/`rejected`) + commentaire
  (≤ 500) → push à l'auteur (cf. [SFD-04](SFD-04-idees-citoyennes.md)).
- **RG-14.10** — **Signalements** : changement de statut → déplacement de carte Trello → push au
  citoyen (cf. [SFD-03](SFD-03-signalements.md)).
- **RG-14.11** — **Photos** : approbation (`pending`→`approved`) ou suppression (avec nettoyage
  Cloudinary) — cf. [SFD-05](SFD-05-photos-communautaires.md).
- **RG-14.12** — **Sondages** : création (titre ≤ 200, ≤ 10 options), activation/désactivation,
  consultation des résultats, suppression — cf. [SFD-06](SFD-06-sondages.md).

### Configuration MEL
- **RG-14.13** — L'**arbre MEL** est éditable (catégories/questions, réponses directes, liens
  `libellé | URL` ou `libellé | téléphone`, options `needZone`/`openChatDirectly`) ; toute
  structure invalide est rejetée ; import/export JSON possible.
- **RG-14.14** — **Réglages globaux** (`mat:admin:settings`) : `melEnabled`, `melDisabledMessage`,
  `reactionsEnabled`, `detailedStatsEnabled`, `melUsageStatsEnabled`, `appOpenStatsEnabled`,
  `melQuestionLogEnabled` (off par défaut — cf. RG-T-10).

### Contenus pratiques
- **RG-14.15** — **Document à la une** : un seul à la fois ; **documents temporaires** : liste sans
  expiration auto (cf. [SFD-11](SFD-11-services-pratiques.md)).
- **RG-14.16** — **Entreprises** : ajout/modification/suppression ; logos hébergés sur Cloudinary ;
  action de **réparation des logos** Facebook expirés.
- **RG-14.17** — **Encart d'information / alerte** : icône, titre, texte, activation ; les vigilances
  Météo-France s'affichent **par-dessus** même si l'encart est inactif.
- **RG-14.18** — **Photo MAT & MEL (mascotte)** : image unique activable/désactivable (personnalisation
  saisonnière) ; à défaut, illustration par défaut.

## 6. Données manipulées

- Toutes les clés Redis de contenu (`mat:actus`, `mat:idees`, `mat:photos`, `mat:sondages`,
  `mat:entreprises`, `mat:docs:*`, `mat:mel:tree:data`, `mat:admin:settings`, `mat:info_banner`,
  `mat:mascotte`).
- **Authentification** : `ADMIN_PASSWORD`(/2) ; jeton conservé localement côté `admin.html`.

## 7. Intégrations & dépendances

- **Cloudinary**, **Facebook**, **Google Calendar**, **Trello**, **Web Push**.
- Routes `/admin/*` (voir [SFD-15](SFD-15-supervision-conformite.md) pour la liste de supervision).

## 8. Cas limites & mode dégradé

- **Publication partielle** : récapitulatif par canal (un canal en échec n'empêche pas les autres,
  sauf la règle d'atomicité Facebook/Cloudinary RG-14.5).
- **Jeton expiré** : déconnexion automatique (401).
- **Quota Redis** : certaines écritures peuvent être différées/refusées (cf. RG-T-22).

## 9. Exigences de conformité spécifiques

- **Sécurité** : accès strictement authentifié, CORS restreint au domaine mairie, secrets hors
  dépôt (RG-T-16/RG-T-20).
- **RGPD** : la modération permet le **retrait** de tout contenu inapproprié ; l'activation de la
  journalisation MEL requiert une **AIPD** (RG-T-10).
