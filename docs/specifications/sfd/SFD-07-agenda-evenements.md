# SFD-07 — Agenda & événements

> [Référentiel](../README.md) · [SFG](../SFG-specifications-generales.md) · Processus : **Agenda & événements**

## 1. Objectif

Présenter l'**agenda communal** (vues jour/semaine/mois), le détail des événements, permettre leur
**ajout au calendrier personnel** (.ics) et l'indication de **participation (RSVP)**.

## 2. Acteurs concernés

- **Citoyen** : consulte l'agenda, ouvre un événement, l'ajoute à son calendrier, indique sa participation.
- **Administrateur** : alimente l'agenda via la publication d'actualités datées (cf. [SFD-14](SFD-14-administration-backoffice.md)) / Google Calendar.

## 3. User stories

- **US-07.1** — En tant que citoyen, je veux consulter les événements à venir afin de planifier ma participation.
- **US-07.2** — En tant que citoyen, je veux ouvrir le détail d'un événement (date, lieu, description) afin d'avoir toutes les informations.
- **US-07.3** — En tant que citoyen, je veux ajouter un événement à mon agenda personnel afin de ne pas l'oublier.
- **US-07.4** — En tant que citoyen, je veux indiquer que je serai présent (RSVP) afin de signaler ma participation — lorsque la fonction est activée.

## 4. Critères d'acceptation (Gherkin)

### US-07.1
```
Étant donné l'agenda communal
Quand j'ouvre la vue mois/semaine/jour
Alors les événements à venir (jusqu'à un an) sont affichés selon la vue choisie.
```

### US-07.2
```
Étant donné un événement de l'agenda
Quand je l'ouvre
Alors son détail affiche la date, l'heure, le lieu et la description
Et, le cas échéant, la photo de l'actualité associée du même jour.
```

### US-07.3
```
Étant donné le détail d'un événement
Quand je clique « Ajouter à mon agenda »
Alors un fichier .ics est téléchargé, importable dans mon application de calendrier.
```

### US-07.4
```
Étant donné que la fonction RSVP est activée
Quand je clique « J'y serai »
Alors ma participation est mémorisée (1 par appareil) et le compteur est mis à jour
Mais si la fonction est désactivée, l'état local est annulé (rollback) sans erreur bloquante.
```

## 5. Règles de gestion

- **RG-07.1** — La source des événements est le **calendrier Google** (flux iCal), relayé par le
  backend ; horizon d'affichage **~365 jours**.
- **RG-07.2** — Le **parsing iCal** prend en charge plusieurs formats de dates (`DTSTART`/`DTEND`).
- **RG-07.3** — Le **RSVP** est **optimiste** (mise à jour locale immédiate) puis synchronisé en
  arrière-plan ; **dédupliqué par `deviceId`** (cf. RG-T-6).
- **RG-07.4** — Le RSVP n'est proposé que si la fonctionnalité **`reactionsEnabled`** est active ;
  en cas de refus serveur (503), l'état local est annulé.
- **RG-07.5** — L'ajout au calendrier génère un fichier **.ics** standard côté PWA.

## 6. Données manipulées

- **Événement** : `uid`, date début/fin, `summary`, `location`, `description` (issus du flux iCal).
- **RSVP** : set Redis `mat:rsvp:event:{uid}` + compteur `mat:rsvp:event:{uid}:count`.
- **Local** : `mat_rsvp_events_v1`.

## 7. Intégrations & dépendances

- **Google Calendar** (flux iCal public) via le proxy backend.
- Routes : `GET /calendar-proxy`, `POST /event/{uid}/rsvp`.

## 8. Cas limites & mode dégradé

- **Hors-ligne** : dernier agenda en cache consultable ; RSVP local puis synchronisé.
- **Flux iCal indisponible** : message « information indisponible » (jamais d'agenda faux, RG-T-3).
- **`reactionsEnabled` désactivé** : RSVP masqué / rollback.

## 9. Exigences de conformité spécifiques

- **RGPD** : RSVP **anonyme** (RG-T-5) ; contenu agenda public (pas de donnée personnelle de citoyen).
- Le contenu iCal est **neutralisé** avant toute réutilisation par MEL (anti-injection indirecte, cf. SFD-02).
