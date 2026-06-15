# SFD-11 — Services pratiques

> [Référentiel](../README.md) · [SFG](../SFG-specifications-generales.md) · Processus : **Services pratiques**

## 1. Objectif

Regrouper les services de **consultation** du quotidien qui ne nécessitent pas de workflow
contributif : transports (bus Rémi), carburants, eau & sécheresse, élus, associations, entreprises,
documents officiels, numéros d'urgence et événements locaux. Chaque service constitue une
sous-section avec ses propres règles de gestion.

## 2. Acteurs concernés

- **Citoyen** : consulte les informations.
- **Administrateur** : gère l'annuaire des entreprises et les documents (cf. [SFD-14](SFD-14-administration-backoffice.md)).

## 3. User stories

- **US-11.1** — En tant que citoyen, je veux consulter les horaires du **bus Rémi (ligne 8)** afin de planifier mes déplacements.
- **US-11.2** — En tant que citoyen, je veux comparer les **prix des carburants** des stations proches afin de faire des économies.
- **US-11.3** — En tant que citoyen, je veux connaître l'**état de l'eau** (nappe, restrictions sécheresse, niveau de la Loire) afin d'adapter mes usages.
- **US-11.4** — En tant que citoyen, je veux consulter le **trombinoscope des élus** et leurs commissions afin de savoir qui contacter.
- **US-11.5** — En tant que citoyen, je veux consulter l'**annuaire des associations** et des **entreprises** locales afin de les solliciter.
- **US-11.6** — En tant que citoyen, je veux accéder aux **documents officiels** (document à la une, documents temporaires) afin de m'informer.
- **US-11.7** — En tant que citoyen, je veux trouver rapidement les **numéros d'urgence** afin de réagir en cas de besoin.
- **US-11.8** — En tant que citoyen, je veux découvrir les **événements locaux** autour de la commune afin de participer à la vie du territoire.

## 4. Critères d'acceptation (Gherkin)

### US-11.1 — Bus Rémi
```
Étant donné l'overlay « Bus Rémi »
Quand je l'ouvre
Alors les horaires de la ligne 8 par jour et par arrêt sont affichés.
```

### US-11.3 — Eau & sécheresse
```
Étant donné l'overlay « Eau »
Quand je le consulte
Alors le niveau de nappe (avec tendance), le cumul de pluie, le niveau de la Loire et le niveau de restriction sécheresse sont affichés
Et, si une source est indisponible, « information indisponible » est affiché (jamais un faux « aucune restriction »).
```

### US-11.6 — Documents
```
Étant donné des documents publiés par la mairie
Quand j'ouvre « Documents officiels »
Alors le document « à la une » et la liste des documents temporaires sont affichés avec leurs liens.
```

### US-11.7 — Urgences
```
Étant donné l'overlay « Urgences »
Quand je l'ouvre
Alors les numéros (SAMU, pompiers, police, etc.) sont affichés et consultables hors-ligne.
```

## 5. Règles de gestion

### Transports (bus Rémi)
- **RG-11.1** — Les horaires de la **ligne 8** sont issus d'un PDF officiel **extrait par IA** côté
  backend et **mis en cache 7 jours**.

### Carburants
- **RG-11.2** — Les **prix** proviennent de l'open data **data.gouv.fr** (stations proches, ~30 km).

### Eau & sécheresse
- **RG-11.3** — Sources : **HubEau** (nappe phréatique, niveau Loire), **VigiEau** (restrictions,
  commune INSEE 45203) ; timeout ~9 s par appel ; cache de la dernière mesure.
- **RG-11.4** — En cas d'indisponibilité, afficher « information indisponible » (jamais une fausse
  absence de restriction, cf. RG-T-3) ; seuil de tendance de nappe ±0,03 m.

### Élus
- **RG-11.5** — Le **trombinoscope** (élus + commissions/représentations) est **embarqué** et
  consultable hors-ligne ; un suivi statistique anonyme est émis au clic (sans bloquer l'affichage).

### Associations & entreprises
- **RG-11.6** — L'**annuaire des associations** est embarqué (logo, description, contact, lien
  subvention vers [SFD-12](SFD-12-contact-demandes.md)).
- **RG-11.7** — L'**annuaire des entreprises** combine des données embarquées et un complément
  serveur ; les **logos** sont réhébergés sur **Cloudinary** (les liens Facebook expirent), avec une
  action admin de **réparation des logos** (cf. [SFD-14](SFD-14-administration-backoffice.md)).

### Documents officiels
- **RG-11.8** — **Un seul** « document à la une » à la fois (remplacé à chaque mise à jour) ; les
  **documents temporaires** forment une liste sans expiration automatique ; URLs en `https://`.

### Numéros d'urgence
- **RG-11.9** — Les **numéros d'urgence** sont embarqués et **consultables hors-ligne**.

### Événements locaux
- **RG-11.10** — Les **événements locaux** sont filtrés dans un **rayon ~20 km** autour de la commune
  (source OpenAgenda / agenda).

## 6. Données manipulées

- **Entreprises (Redis `mat:entreprises`)** : `nom`, `activite`, `gerant`, `telephone`, `email`,
  `siteWeb`, `logo` (Cloudinary), `description`.
- **Documents** : `mat:docs:featured` (1 document), `mat:docs:temp` (liste).
- **Élus / associations / urgences** : données embarquées côté PWA.
- **Caches** : bus (7 j), carburant, eau (dernière mesure).

## 7. Intégrations & dépendances

- **data.gouv.fr** (carburants), **HubEau** & **VigiEau** (eau), **OpenAgenda** (événements),
  **Cloudinary** (logos), **IA** (extraction PDF bus).
- Routes : `GET /carburant`, `GET /env-local`, `GET /events-locaux`, `GET /entreprises`,
  `GET /docs/featured`, `GET /docs/temp`.

## 8. Cas limites & mode dégradé

- **Hors-ligne** : élus, associations, urgences, guide → disponibles (embarqués) ; services
  externes (carburant, eau, événements) → dernière valeur en cache ou « indisponible ».
- **Source externe en panne** : message neutre, jamais de donnée erronée (RG-T-3).

## 9. Exigences de conformité spécifiques

- **RGPD** : données d'annuaire (élus, associations, entreprises) **publiques et professionnelles** ;
  pas de donnée personnelle de citoyen. Logos/contacts publiés avec l'accord des intéressés.
