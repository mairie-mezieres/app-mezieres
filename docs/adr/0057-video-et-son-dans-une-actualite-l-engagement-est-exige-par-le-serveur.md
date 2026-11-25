# ADR-0057 — Vidéo et son dans une actualité : l'engagement d'accessibilité est exigé par le serveur

- **Date** : 25 novembre 2026
- **Version** : v4.130
- **Statut** : acceptée
- **Dépôts** : `app-mezieres` (affichage, admin) et `chatbot-mairie-mezieres` (`lib/actu-media.js`)

## Contexte

La mairie voulait pouvoir joindre une **vidéo** ou un **MP3** à une actualité, en plus
des photos. Deux obstacles :

1. **La taille.** Les photos passent en base64 dans un JSON plafonné à **6 Mo**
   (`app.js`). Une vidéo de téléphone en fait facilement 50 à 100.
2. **L'accessibilité.** L'audit RGAA classait les critères **4.1 à 4.13** en `NA` :
   « aucun média temporel ». ADR-0050 avait renoncé à une vidéo intégrée précisément
   pour cette raison. Afficher un média rend dix de ces critères applicables : sans
   sous-titres ni transcription, le taux tombe sous 100 % et la mention comme la
   déclaration doivent changer.

## Décision

### Envoi direct navigateur → Cloudinary, relecture par le serveur

L'admin demande une **signature** (`POST /admin/actus/media/signature`, dossier imposé
`mat/actus-media`) et envoie le fichier **directement** à Cloudinary, au clic sur
« Publier » seulement. Le backend ne reçoit que le `public_id` et **relit la ressource
chez Cloudinary** (`cloudinary.api.resource`) : le **format** donne le genre (vidéo ou
son), la **taille** est revérifiée (100 Mo, plafond vidéo de l'offre gratuite). Rien de
ce qu'annonce le navigateur n'est cru.

⚠️ Cloudinary range l'**audio** sous `resource_type: "video"` : envoi, relecture et
suppression utilisent ce type.

### L'engagement d'accessibilité est une condition de publication, côté serveur

| Média | Engagement exigé | Critères |
|---|---|---|
| Vidéo | sous-titres **incrustés**, et tout l'essentiel **dit à l'oral** (rien d'important seulement affiché à l'écran) | 4.3, 4.4 ; 4.1 et 4.5 deviennent « non nécessaires » |
| Son | la **description de l'actu reprend** ce qui est dit (une description vide est refusée) | 4.1, 4.2 |

Sans `accessibilite: true`, le backend répond **400** et **supprime** le fichier. Une
case à cocher dans l'admin ne suffirait pas : un client non à jour ou un appel direct à
l'API publierait sans elle.

Côté app : lecteur **natif** (`controls`), **jamais** d'`autoplay`, `preload="none"`
(une liste d'actus ne télécharge rien), légende qui **dit** où est l'alternative,
seules les URL `https://res.cloudinary.com/` sont lues. `closeOv` met en pause tout
média de l'écran qu'il ferme : un écran fermé reste dans le DOM, et un son y
continuerait de jouer sans contrôle visible (4.10).

### Pas sur Facebook, pas hors ligne

- Facebook reçoit le texte et les photos, **pas** le média (l'API vidéo de Facebook est
  un autre chantier) : l'admin le dit, le backend renvoie un avertissement.
- Le service worker ne cache pas `res.cloudinary.com` : un média n'est **pas**
  disponible hors connexion. Voulu : poids, et requêtes `Range` que le cache gère mal.

## Conséquences

- Audit RGAA, treizième passe : **75 critères applicables, 75 conformes**, 100 % —
  la mention ne change pas. ⚠️ Quatre verdicts (4.1, 4.2, 4.4, 4.5) reposent sur un
  **engagement éditorial** : le code exige la case, il ne peut pas regarder la vidéo.
- **Trois chemins de suppression** libèrent le fichier (suppression d'actu, purge,
  annulation d'une programmation), via `actuMediaPublicIds` — même piège que les
  photos (ADR-0039), en plus cher : jusqu'à 100 Mo par oubli.
- Orphelin possible : si la requête de publication n'atteint jamais le backend après
  un envoi réussi, le fichier reste dans `mat/actus-media` (à purger depuis la console
  Cloudinary). Tout refus **reçu** par le backend, lui, supprime le fichier.
- Le quota Cloudinary gratuit (crédits mensuels) se consomme vite en vidéo : à
  surveiller dans la console si l'usage devient régulier.

## Vérification

- `chatbot-mairie-mezieres/test/actu-media.test.js` — refus sans engagement, genre
  déduit du format, identifiants hors dossier, trois chemins de suppression.
- `tests/e2e/actu-media.spec.js` — pas d'`autoplay`, `preload="none"`, légende, fond
  déclaré, pause à la fermeture (rouge si on retire la pause de `closeOv`).
