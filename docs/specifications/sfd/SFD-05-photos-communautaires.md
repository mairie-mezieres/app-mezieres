# SFD-05 — Photos communautaires

> [Référentiel](../README.md) · [SFG](../SFG-specifications-generales.md) · Processus : **Photos communautaires**

## 1. Objectif

Permettre aux habitants de **partager des photos** de la commune, soumises à **modération** avant
publication, consultables en galerie et en diaporama, et soutenables par un **vote**.

## 2. Acteurs concernés

- **Citoyen** : dépose une photo, vote, consulte la galerie/diaporama, supprime sa propre photo.
- **Administrateur** : approuve ou supprime les photos (cf. [SFD-14](SFD-14-administration-backoffice.md)).

## 3. User stories

- **US-05.1** — En tant que citoyen, je veux envoyer une photo (avec lieu/description) afin de
  partager un moment ou un lieu de la commune.
- **US-05.2** — En tant que citoyen, je veux consulter la galerie des photos approuvées afin de
  découvrir les contributions.
- **US-05.3** — En tant que citoyen, je veux voter pour une photo afin de mettre en avant celles que j'apprécie.
- **US-05.4** — En tant que citoyen, je veux lancer un diaporama afin de voir les photos en grand,
  en plein écran.
- **US-05.5** — En tant que citoyen, je veux supprimer ma propre photo afin de garder la main sur ma contribution.

## 4. Critères d'acceptation (Gherkin)

### US-05.1
```
Étant donné le formulaire d'envoi de photo
Quand je sélectionne une image et valide
Alors la photo est hébergée et placée « en attente de modération » (non visible des autres citoyens)
Et un message m'informe qu'elle sera publiée après validation.
```

### US-05.2
```
Étant donné des photos approuvées
Quand j'ouvre la galerie
Alors seules les photos approuvées s'affichent, triées par votes décroissants.
```

### US-05.3
```
Étant donné une photo approuvée que je n'ai pas soutenue
Quand je vote
Alors le compteur augmente et mon vote est mémorisé (1 par appareil).
```

### US-05.4
```
Étant donné la galerie
Quand je lance le diaporama
Alors les photos s'affichent en plein écran, dans leur intégralité, ajustées à l'orientation (portrait/paysage)
Et je navigue manuellement d'une photo à l'autre.
```

### US-05.5
```
Étant donné une photo que j'ai moi-même envoyée
Quand je demande sa suppression
Alors elle est retirée de la galerie et de l'hébergement (Cloudinary).
```

## 5. Règles de gestion

- **RG-05.1** — **Modération a priori** : toute photo est créée au statut `pending` (invisible du
  public) ; elle ne devient visible qu'après passage au statut `approved` par l'admin.
- **RG-05.2** — **Rate-limiting** de l'envoi : 5 requêtes/minute (cf. RG-T-19).
- **RG-05.3** — Limites : description ≤ 200 caractères ; lieu ≤ 100 caractères ; image **≤ 6 Mo**,
  hébergée sur **Cloudinary** (transformation WebP, RG-T-21).
- **RG-05.4** — **Vote dédupliqué par `deviceId`** (set `mat:votes:photo:{id}`) — 1 par appareil (RG-T-6).
- **RG-05.5** — Stock **plafonné à 300** photos ; au-delà, purge des plus anciennes **non
  approuvées en priorité**.
- **RG-05.6** — La **vue publique** n'expose jamais le `deviceId` du contributeur ni le `publicId`
  Cloudinary.
- **RG-05.7** — Le **diaporama est lancé manuellement** (pas de déclenchement par capteur
  d'inclinaison) et affiche chaque photo **dans son intégralité** (`contain`), portrait comme paysage.
- **RG-05.8** — Un **badge « nouvelles photos »** signale les ajouts depuis la dernière visite
  (`mat_photos_seen_v1`), évalué au démarrage de l'application.
- **RG-05.9** — La suppression d'une photo (par son auteur ou par l'admin) entraîne le **nettoyage
  Cloudinary** (via `publicId`).

## 6. Données manipulées

- **Photo (Redis `mat:photos`)** : `id`, `url` (Cloudinary), `publicId`, `desc`, `lieu`, `votes`,
  `status` (`pending`|`approved`), `date`, `deviceId` (soumetteur, non exposé).
- **Votes** : set Redis `mat:votes:photo:{id}`.
- **Local** : `mat_photo_votes_v1` (votes), `mat_photos_seen_v1` (badge), `mat_my_photos_v1`
  (mes photos, max 50).

## 7. Intégrations & dépendances

- **Cloudinary** : upload, transformation, suppression.
- Routes : `GET /photos`, `POST /photos`, `POST /photos/{id}/vote`, `DELETE /photos/{id}/vote`,
  `DELETE /photos/{id}`, `POST /admin/photos/{id}/approve`.

## 8. Cas limites & mode dégradé

- **Hors-ligne** : galerie en cache consultable ; envoi reporté.
- **Cloudinary désactivé/indisponible** : l'envoi est refusé avec un message explicite.
- **Quota Redis** : votes refusés (503), consultation maintenue.

## 9. Exigences de conformité spécifiques

- **RGPD / droit à l'image** : modération a priori (RG-05.1) pour écarter les contenus
  inappropriés ou portant atteinte à la vie privée ; l'auteur peut supprimer sa photo (RG-T-11).
- Accessibilité : navigation diaporama au clavier/gestes, descriptions textuelles.
