# Référentiel de spécifications fonctionnelles — MAT (Mézières Avec Toi)

Ce dossier constitue le **référentiel fonctionnel de maîtrise d'ouvrage (MOA)** de l'application
MAT. Il décrit, processus par processus, **ce que fait le produit**, sous forme de
**user stories**, de **critères d'acceptation** testables et de **règles de gestion** numérotées.

> 📌 **Document vivant.** Ce référentiel reflète l'état du produit à la date de rédaction.
> Toute évolution fonctionnelle doit s'accompagner d'une mise à jour du SFD concerné
> (et, le cas échéant, de la cartographie du SFG).

## Public visé

- **Élus et agents de la mairie** (maîtrise d'ouvrage) : comprendre, arbitrer, faire évoluer.
- **Recette / tests** : les critères d'acceptation et règles de gestion servent de base de validation.
- **Prestataires / développeurs** : référence fonctionnelle contractuelle, complémentaire du
  [guide technique](../guide-technique.md).

## Structure du référentiel

| Document | Contenu |
|----------|---------|
| [Spécifications Fonctionnelles Générales (SFG)](SFG-specifications-generales.md) | Vision, acteurs, cartographie des processus, exigences transverses (offline, RGPD, accessibilité, sécurité…), modèle de données. |
| **Spécifications Fonctionnelles Détaillées (SFD)** | Un document par processus métier (voir ci-dessous). |

> 🏗️ **Vue d'architecture.** Pour la traduction technique de ces processus (schémas de contexte,
> conteneurs, déploiement et flux métier), voir la [documentation d'architecture applicative](../architecture.md).
>
> ⚙️ **Contrat technique.** Pour le détail des endpoints (validations, codes HTTP, messages d'erreur,
> limites), voir le [référentiel de spécifications techniques (STD)](../specifications-techniques/README.md).
> Chaque STD renvoie au SFD correspondant.

### Index des SFD

| Réf. | Processus | Acteurs principaux |
|------|-----------|--------------------|
| [SFD-01](sfd/SFD-01-actualites.md) | Actualités communales | Citoyen · Admin · Système |
| [SFD-02](sfd/SFD-02-assistant-mel.md) | Assistant virtuel MEL | Citoyen · Admin |
| [SFD-03](sfd/SFD-03-signalements.md) | Signalements citoyens | Citoyen · Admin |
| [SFD-04](sfd/SFD-04-idees-citoyennes.md) | Boîte à idées & votes | Citoyen · Admin |
| [SFD-05](sfd/SFD-05-photos-communautaires.md) | Photos communautaires | Citoyen · Admin |
| [SFD-06](sfd/SFD-06-sondages.md) | Sondages citoyens | Citoyen · Admin |
| [SFD-07](sfd/SFD-07-agenda-evenements.md) | Agenda & événements | Citoyen · Admin |
| [SFD-08](sfd/SFD-08-notifications-push.md) | Notifications push | Citoyen · Admin · Système |
| [SFD-09](sfd/SFD-09-meteo-vigilance.md) | Météo & vigilance | Citoyen · Système |
| [SFD-10](sfd/SFD-10-dechets-collecte.md) | Déchets & collecte | Citoyen · Système |
| [SFD-11](sfd/SFD-11-services-pratiques.md) | Services pratiques (bus, carburant, eau, élus, associations, entreprises, documents, urgences, événements locaux) | Citoyen · Admin |
| [SFD-12](sfd/SFD-12-contact-demandes.md) | Contact & demandes | Citoyen · Admin |
| [SFD-13](sfd/SFD-13-accessibilite-personnalisation.md) | Accessibilité & personnalisation | Citoyen |
| [SFD-14](sfd/SFD-14-administration-backoffice.md) | Administration (back-office mairie) | Admin |
| [SFD-15](sfd/SFD-15-supervision-conformite.md) | Supervision, exploitation & conformité | Admin · Système |

## Conventions de rédaction

Chaque SFD suit le même gabarit en 9 sections :

1. **Objectif** — finalité métier du processus.
2. **Acteurs concernés**.
3. **User stories** — `US-NN.x` : « En tant que `<acteur>`, je veux `<action>` afin de `<bénéfice>` ».
4. **Critères d'acceptation (Gherkin)** — `Étant donné / Quand / Alors`, scénarios nominaux et alternatifs.
5. **Règles de gestion** — `RG-NN.x` : contraintes vérifiables (validations, limites, TTL, quotas, modération, fallback…).
6. **Données manipulées** — champs, clés Redis, `localStorage`, payloads.
7. **Intégrations & dépendances**.
8. **Cas limites & mode dégradé**.
9. **Exigences de conformité spécifiques**.

### Identifiants

- `US-NN.x` : user story du processus `NN`.
- `RG-NN.x` : règle de gestion du processus `NN`.
- `RG-T-x` : règle de gestion **transverse** (définie dans le SFG, applicable à tous les processus).

Les identifiants sont **stables** : ne pas réutiliser un identifiant supprimé ; ajouter à la suite.
