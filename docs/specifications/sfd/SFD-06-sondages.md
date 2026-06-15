# SFD-06 — Sondages citoyens

> [Référentiel](../README.md) · [SFG](../SFG-specifications-generales.md) · Processus : **Sondages**

## 1. Objectif

Permettre à la mairie de **consulter les habitants** via des sondages (4 formats), et aux citoyens
d'**y participer** une fois par appareil puis de **consulter les résultats**.

## 2. Acteurs concernés

- **Citoyen** : répond à un sondage actif, consulte les résultats.
- **Administrateur** : crée, active/désactive, supprime un sondage et consulte les résultats
  (cf. [SFD-14](SFD-14-administration-backoffice.md)).

## 3. User stories

- **US-06.1** — En tant que citoyen, je veux répondre à un sondage afin de donner mon avis sur un
  sujet communal.
- **US-06.2** — En tant que citoyen, je veux voir les résultats après avoir voté afin de connaître
  la tendance générale.
- **US-06.3** — En tant que citoyen, je veux être informé qu'un sondage est ouvert afin de ne pas
  manquer la consultation.

## 4. Critères d'acceptation (Gherkin)

### US-06.1
```
Étant donné un sondage actif auquel je n'ai pas encore répondu
Quand je sélectionne ma/mes réponse(s) selon le type (texte libre, choix unique, choix multiple, notation)
Et que je valide
Alors ma participation est enregistrée
Et une nouvelle tentative depuis le même appareil est refusée (409, déjà participé).
```

### US-06.2
```
Étant donné que j'ai voté
Quand la confirmation s'affiche
Alors les résultats sont présentés selon le type :
  - choix unique/multiple : répartition en pourcentage par option
  - notation : moyenne et distribution des notes
  - texte libre : liste des réponses.
```

### US-06.3
```
Étant donné un sondage ouvert auquel je n'ai pas participé
Quand j'ouvre l'application
Alors un badge signale la consultation en attente.
```

## 5. Règles de gestion

- **RG-06.1** — Quatre **types** : `texte_libre`, `choix_unique`, `choix_multiple`, `notation_etoiles`.
- **RG-06.2** — **Participation dédupliquée par `deviceId`** (set `mat:voted:sondage:{id}`) :
  une seule fois par appareil ; nouvelle tentative → 409 (cf. RG-T-6).
- **RG-06.3** — Le vote est refusé (400) si le sondage est **inactif** ou **expiré** (`endsAt` dépassé).
- **RG-06.4** — Pour les types à choix, l'option votée doit appartenir aux **options définies**
  (≤ 10 options, ≤ 200 caractères chacune).
- **RG-06.5** — **Inactif ≠ supprimé** : un sondage désactivé n'est plus proposé mais ses résultats
  restent consultables ; la suppression efface le sondage **et** ses résultats.
- **RG-06.6** — Les résultats sont **agrégés côté serveur** (`mat:sondage:results:{id}`) :
  total, comptes par option, distribution et moyenne (notation), réponses (texte libre).
- **RG-06.7** — La **date de fin** est facultative : sans elle, le sondage reste actif indéfiniment.

## 6. Données manipulées

- **Sondage (Redis `mat:sondages`)** : `id`, `titre` (≤ 200), `description` (≤ 500), `type`,
  `options[]`, `endsAt`, `active`.
- **Résultats (Redis `mat:sondage:results:{id}`)** : `total`, `counts`, `distribution`, `average`, `reponses`.
- **Participation** : set Redis `mat:voted:sondage:{id}`.
- **Local** : `mat_voted_<id>` / `mat_seen_sondage_<id>`, `mat_sondages_seen_at`.

## 7. Intégrations & dépendances

- Routes : `GET /sondages`, `GET /sondages/{id}`, `GET /sondages/{id}/results`,
  `POST /sondages/{id}/vote`, `POST /admin/sondages`, `PATCH /admin/sondages/{id}`,
  `DELETE /admin/sondages/{id}`.

## 8. Cas limites & mode dégradé

- **Hors-ligne** : vote enregistré localement puis synchronisé.
- **Quota Redis dépassé (429)** : votes refusés (503).
- **Double participation** : bloquée (409) avec affichage des résultats.

## 9. Exigences de conformité spécifiques

- **RGPD** : participation **anonyme** (RG-T-5) ; les réponses en texte libre ne doivent pas
  contenir de données personnelles (message d'information).
