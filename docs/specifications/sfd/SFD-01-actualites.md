# SFD-01 — Actualités communales

> [Référentiel](../README.md) · [SFG](../SFG-specifications-generales.md) · Processus : **Actualités**

## 1. Objectif

Diffuser aux habitants les informations de la commune (annonces, événements, communiqués) via une
tuile « Actualités » et des notifications, à partir de deux sources : la **page Facebook** de la
mairie (publications taguées `#MAT`) et la **saisie directe** par l'administrateur.

## 2. Acteurs concernés

- **Citoyen** : consulte les actualités, réagit (like / partage).
- **Administrateur** : publie/modifie/supprime une actualité (cf. [SFD-14](SFD-14-administration-backoffice.md)).
- **Système** : importe les publications Facebook taguées `#MAT`, envoie les notifications push.

## 3. User stories

- **US-01.1** — En tant que citoyen, je veux voir la liste des dernières actualités de la commune
  afin de rester informé de la vie locale.
- **US-01.2** — En tant que citoyen, je veux ouvrir le détail d'une actualité (texte intégral,
  photo, date) afin d'avoir l'information complète.
- **US-01.3** — En tant que citoyen, je veux être alerté quand de nouvelles actualités paraissent
  (badge « nouvelles » et/ou notification push) afin de ne rien manquer.
- **US-01.4** — En tant que citoyen, je veux réagir à une actualité (like, partage) afin
  d'exprimer mon intérêt — lorsque les réactions sont activées.

## 4. Critères d'acceptation (Gherkin)

### US-01.1
```
Étant donné que des actualités existent
Quand j'ouvre l'application ou la tuile « Actualités »
Alors la liste affiche les actualités les plus récentes (image, titre, aperçu de 180 caractères)
Et le hashtag « #MAT » est retiré du titre.
```

### US-01.2
```
Étant donné une actualité dans la liste
Quand je clique dessus
Alors son détail s'ouvre avec la photo, la description complète et la date
Et l'URL reflète l'actualité ouverte (#actu=<id>) pour permettre le partage.
```

### US-01.3
```
Étant donné des actualités déjà consultées (mémorisées localement)
Quand de nouvelles actualités paraissent
Alors un badge indique le nombre d'actualités non lues
Et, si j'ai accepté le push, je reçois une notification ouvrant l'actualité concernée.
```

### US-01.4 (alternatif — réactions désactivées)
```
Étant donné que l'administrateur a désactivé les réactions
Quand j'ouvre une actualité
Alors les boutons de réaction (like/partage) ne sont pas proposés.
```

## 5. Règles de gestion

- **RG-01.1** — Seules les publications Facebook contenant le hashtag **`#MAT`** sont importées
  comme actualités (filtrage du webhook entrant).
- **RG-01.2** — Le webhook Facebook entrant est validé par **signature HMAC-SHA256**
  (`FACEBOOK_APP_SECRET`) ; toute requête non signée est rejetée (cf. RG-T-18).
- **RG-01.3** — Une actualité est **dédupliquée** par identifiant de publication : une même
  publication n'est jamais importée deux fois.
- **RG-01.4** — Le stock d'actualités est **plafonné à 30** : au-delà, les plus anciennes sont purgées.
- **RG-01.5** — Le titre est la première ligne du texte ; la description est le reste. À l'affichage,
  l'aperçu en liste est tronqué à **180 caractères**.
- **RG-01.6** — Les photos sont **réhébergées sur Cloudinary** (les URLs Facebook expirent) et
  servies en WebP optimisé (cf. RG-T-21).
- **RG-01.7** — Le badge « nouvelles actualités » compare la signature (date + titre + photo) des
  actualités avec celles déjà vues, mémorisées localement (`mat_actus_seen_v1`).
- **RG-01.8** — Le cache de liste côté PWA est de **30 secondes** ; un rafraîchissement forcé est possible.
- **RG-01.9** — Les réactions (like/partage) sont proposées uniquement si le réglage
  `reactionsEnabled` est actif (cf. [SFD-14](SFD-14-administration-backoffice.md)).
- **RG-01.10** — Un like est **dédupliqué par `deviceId`** (cf. RG-T-6).

## 6. Données manipulées

- **Actualité (Redis `mat:actus`)** : `id`, `title`, `description`, `date`, `dateISO`, `photo` (URL
  Cloudinary), `photoPublicId`, `source` (`facebook` | `admin`), `likes`, `eventDate`, `eventLocation`.
- **Likes** : set Redis `mat:likes:actu:{id}` (membres = `deviceId`).
- **Local** : `mat_actus_seen_v1` (signatures vues), `mat_actus_notif_v1` (stats notification).

## 7. Intégrations & dépendances

- **Facebook Graph API** : webhook entrant (import) ; récupération de la photo haute résolution.
- **Cloudinary** : réhébergement des images.
- **Web Push** : notification à tous les abonnés à la publication (cf. [SFD-08](SFD-08-notifications-push.md)).
- Route de lecture : `GET /actus` (cache mémoire 60 s côté backend).

## 8. Cas limites & mode dégradé

- **Hors-ligne** : la dernière liste d'actualités en cache reste consultable (RG-T-1/RG-T-2).
- **Photo Facebook indisponible** : l'actualité est conservée en mode texte seul.
- **Quota Redis dépassé** : les likes sont refusés (503) mais la lecture des actualités continue (RG-T-22).

## 9. Exigences de conformité spécifiques

- Contenu éditorial public : pas de donnée personnelle de citoyen.
- Accessibilité de la liste et du détail (contraste, taille, lecture vocale) — cf. RG-T-15.
