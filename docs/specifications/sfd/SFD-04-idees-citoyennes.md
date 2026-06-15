# SFD-04 — Boîte à idées & votes

> [Référentiel](../README.md) · [SFG](../SFG-specifications-generales.md) · Processus : **Idées citoyennes**

## 1. Objectif

Recueillir les **idées des habitants** pour la commune, permettre à la communauté de **voter**, et
à la mairie d'**instruire** chaque idée (statut + commentaire) avec un retour visible au citoyen.

## 2. Acteurs concernés

- **Citoyen** : propose une idée, vote pour les idées existantes.
- **Administrateur** : qualifie l'idée (statut, commentaire) — cf. [SFD-14](SFD-14-administration-backoffice.md).
- **Système** : notifie l'auteur lors d'un changement de statut (si jeton fourni).

## 3. User stories

- **US-04.1** — En tant que citoyen, je veux proposer une idée afin de contribuer à la vie de la commune.
- **US-04.2** — En tant que citoyen, je veux voter pour des idées afin de soutenir celles qui me
  semblent importantes.
- **US-04.3** — En tant que citoyen, je veux voir le statut donné par la mairie (à l'étude, retenue,
  non retenue) et son commentaire afin de connaître les suites.
- **US-04.4** — En tant que citoyen, je veux repérer les idées « tendance » afin de voir ce qui
  mobilise la commune.

## 4. Critères d'acceptation (Gherkin)

### US-04.1
```
Étant donné le formulaire « Boîte à idées »
Quand je saisis le texte de mon idée (et éventuellement une catégorie) puis valide
Alors l'idée est enregistrée avec 0 vote et apparaît dans la liste.
```

### US-04.2
```
Étant donné une idée que je n'ai pas encore soutenue
Quand je clique sur « voter »
Alors le compteur augmente de 1 et mon vote est mémorisé
Et si je tente de voter à nouveau depuis le même appareil, le vote est refusé (déjà voté).
```

### US-04.3
```
Étant donné que l'administrateur a qualifié mon idée
Quand j'ouvre la liste des idées
Alors le badge de statut (🔍 à l'étude / ✅ retenue / ❌ non retenue) et le commentaire sont affichés
Et si j'avais fourni un jeton de notification, j'ai reçu un push correspondant.
```

### US-04.4
```
Étant donné une idée récente cumulant suffisamment de votes
Quand les critères de tendance sont réunis (≥ 3 votes, ≤ 10 jours, rythme soutenu)
Alors un indicateur « tendance » est affiché sur l'idée.
```

## 5. Règles de gestion

- **RG-04.1** — Champs : **texte obligatoire** (≤ 500 caractères) ; catégorie facultative (≤ 100
  caractères, défaut « 💡 Autre »).
- **RG-04.2** — **Vote dédupliqué par `deviceId`** (set Redis `mat:votes:idee:{id}`) : 1 vote par
  appareil ; un second vote renvoie 409 (cf. RG-T-6).
- **RG-04.3** — Le stock d'idées est **plafonné à 200**.
- **RG-04.4** — Les idées sont **publiques** et visibles de tous ; **aucune modération a priori**
  (qualification a posteriori par l'admin).
- **RG-04.5** — Statuts possibles : `null` (aucun), `studying` (à l'étude), `accepted` (retenue),
  `rejected` (non retenue) ; le **commentaire admin** (≤ 500 caractères) est visible du citoyen.
- **RG-04.6** — Un **changement de statut** déclenche un **push** à l'auteur si un jeton de
  notification est associé (pas de re-notification si le statut est inchangé).
- **RG-04.7** — Critère **tendance** : au moins 3 votes, idée de moins de 10 jours, au moins ~1
  vote/jour.
- **RG-04.8** — Le tri par défaut est par **votes décroissants** (option : par date).

## 6. Données manipulées

- **Idée (Redis `mat:idees`)** : `id`, `text`, `cat`, `votes`, `date`, `status`, `adminComment`,
  `notifyToken` (optionnel).
- **Votes** : set Redis `mat:votes:idee:{id}` (membres = `deviceId`).
- **Local** : `mat_ideas_v3` (historique), `mat_votes_v3` (votes), `mat_ideas_seen_v1` (badge),
  `mat_ideas_sort_v1` (préférence de tri).

## 7. Intégrations & dépendances

- **Web Push** : notification de changement de statut (cf. [SFD-08](SFD-08-notifications-push.md)).
- Routes : `GET /idees`, `POST /idee`, `POST /idee/{id}/vote`, `DELETE /idee/{id}/vote`,
  `PATCH /admin/ideas/{id}`.

## 8. Cas limites & mode dégradé

- **Hors-ligne** : vote enregistré localement, synchronisé au retour du réseau (RG-T-1).
- **Quota Redis dépassé** : votes refusés (503) ; consultation maintenue (RG-T-22).
- **Doublon de soumission** (même id) : réponse idempotente (`duplicate: true`).

## 9. Exigences de conformité spécifiques

- **RGPD** : contributions **anonymes** (RG-T-5) ; le texte d'idée est public — un message
  d'information invite à ne pas y inscrire de données personnelles. Modération de retrait possible
  par l'admin en cas de contenu inapproprié.
