# SFD-12 — Contact & demandes

> [Référentiel](../README.md) · [SFG](../SFG-specifications-generales.md) · Processus : **Contact & demandes**

## 1. Objectif

Permettre à un habitant de **contacter la mairie / les élus** (question, demande, demande de
subvention association) et de **signaler un bug** de l'application, avec création d'un ticket côté
mairie et suivi.

## 2. Acteurs concernés

- **Citoyen** : envoie un message de contact, une demande de subvention, ou un rapport de bug.
- **Administrateur** : traite les demandes (cf. [SFD-14](SFD-14-administration-backoffice.md)).
- **Système** : crée le ticket Trello et notifie le citoyen le cas échéant.

## 3. User stories

- **US-12.1** — En tant que citoyen, je veux envoyer un message à la mairie/aux élus afin de poser
  une question ou faire une demande.
- **US-12.2** — En tant que représentant d'association, je veux déposer une demande de subvention
  afin de solliciter un soutien de la commune.
- **US-12.3** — En tant que citoyen, je veux signaler un dysfonctionnement de l'application
  (avec capture d'écran) afin d'aider à l'améliorer.
- **US-12.4** — En tant que citoyen, je veux retrouver mes demandes et leur suivi afin de savoir où elles en sont.

## 4. Critères d'acceptation (Gherkin)

### US-12.1
```
Étant donné le formulaire de contact
Quand je renseigne au moins une coordonnée (email ou téléphone), un sujet et un message, puis valide
Alors la demande est transmise et un ticket est créé côté mairie
Et un brouillon est conservé localement tant que l'envoi n'a pas abouti.
```

### US-12.3
```
Étant donné le formulaire « Bug »
Quand je choisis le service concerné, décris le problème et joins une capture d'écran
Alors le rapport est transmis (avec les informations techniques de l'appareil) et un ticket est créé.
```

### US-12.4
```
Étant donné des demandes envoyées depuis mon appareil
Quand j'ouvre « Suivi »
Alors mes demandes (contact, bug, signalement) et leur état sont listées localement.
```

## 5. Règles de gestion

- **RG-12.1** — Pour le **contact**, au moins une **coordonnée** (email ou téléphone) est requise,
  avec un **sujet** et un **message**.
- **RG-12.2** — Les demandes (contact / bug) créent un **ticket Trello** dans la liste
  correspondante ; les **rapports de bug** incluent les informations techniques de l'appareil.
- **RG-12.3** — Les **demandes de type contact** peuvent déclencher un **push** au citoyen lors d'un
  changement de statut ou d'un commentaire de la mairie (via MAT-REF, cf. [SFD-03](SFD-03-signalements.md)).
- **RG-12.4** — Les **brouillons** de formulaires sont conservés localement
  (`mat_contact_form_state`, `mat_bug_form_state`) et restaurés à la réouverture.
- **RG-12.5** — La **vue publique** éventuelle des demandes est **anonymisée** (masquage tél/email,
  cf. RG-T-7).
- **RG-12.6** — Les rapports de bug et contacts partagent le mécanisme de soumission des
  signalements (rate-limiting 10/min, taille photo ≤ 6 Mo — cf. [SFD-03](SFD-03-signalements.md)).

## 6. Données manipulées

- **Demande** : `type` (`contact` | `bug`), `cat`/sujet, `desc`, coordonnée, photo (bug), `notifyToken`.
- **Local** : `mat_contact_form_state`, `mat_bug_form_state`, `mat_my_signals_v1` (suivi unifié).
- **Côté mairie** : carte Trello (liste contact/demande ou bug).

## 7. Intégrations & dépendances

- **Trello** (tickets), **Web Push** (suivi), éventuellement **Cloudinary** (capture d'écran).
- Route : `POST /signal` (endpoint partagé avec les signalements et bugs).

## 8. Cas limites & mode dégradé

- **Hors-ligne / timeout** : brouillon conservé, envoi reporté (cf. [SFD-03](SFD-03-signalements.md)).
- **Trello indisponible** : la demande n'est pas perdue (repli / réessai).

## 9. Exigences de conformité spécifiques

- **RGPD** : la coordonnée fournie (email/téléphone) est une **donnée personnelle** transmise
  **volontairement** pour permettre la réponse de la mairie ; elle n'est pas exposée publiquement
  (RG-T-7) et est conservée le temps du traitement de la demande (RG-T-9).
