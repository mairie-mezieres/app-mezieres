# ADR-0046 — Facebook → l'app : lire toutes les photos d'un post, sans jamais fusionner les deux sources

- **Date** : 15 septembre 2026 (v4.115)
- **Statut** : accepté
- **Portée** : `chatbot-mairie-mezieres` (`routes/webhook.js`, `lib/facebook.js`,
  `test/webhook-photos.test.js`) — aucun changement côté app
- **Complète** : ADR-0039 (plusieurs photos par actualité), qui n'avait traité que
  le sens **sortant**

## Contexte

Depuis la v4.109, une actualité créée dans l'admin peut porter jusqu'à six photos,
et part sur Facebook en **un seul** post les portant toutes (ADR-0039).

Le chemin **inverse** était resté au point de départ. Quand la mairie publie
directement sur la page Facebook un post `#MAT` avec six photos, le webhook créait
une actualité à **une** image.

Deux causes se cumulaient :

- `full_picture`, le seul champ que la Graph API était interrogée pour lire, ne
  rend que la **couverture** du post — jamais les autres images ;
- `change.value.photo`, le repli, est une **chaîne** et n'existe que sur un post
  **mono-photo**. Un post multi-photos porte `change.value.photos`, un **tableau**,
  que personne ne lisait. Sur ce type de post, le repli ne repliait sur rien.

⛔ **Et la panne ne se signalait pas.** Une actu à une image est un résultat
d'apparence parfaitement normale : l'app l'affichait sans carrousel — exactement ce
qu'elle doit faire pour une actu réellement mono-photo — et les logs disaient
`💾 Actu FB stockée (photo: oui)`, qui se lit comme un succès. Cinq photos sur six
disparaissaient sans que rien, nulle part, ne compte celles qui manquaient.

## Décision

### 1. Lire les images dans les attachements, pas dans `full_picture`

`fetchFacebookPostImages` (`lib/facebook.js`) interroge
`attachments{media,subattachments{media}}` :

- un post **multi-photos** expose ses images dans
  `attachments.data[].subattachments.data[].media.image.src`, **dans l'ordre
  d'affichage** — la couverture en tête ;
- un post **mono-photo** n'a pas de `subattachments` : son image est sur
  l'attachement lui-même ;
- `full_picture` reste lu, mais **en dernier recours seulement** (post partagé,
  aperçu de lien : des formes où les attachements peuvent manquer).

### 2. Deux sources, et on n'en prend qu'une

Les images d'un post sont décrites à deux endroits : le **corps du webhook**
(`photos` / `photo`) et la **Graph API**. On ne les fusionne **jamais**.

⛔ Une même photo n'y a pas la même URL : deux hôtes CDN, deux jeux de paramètres
signés. Concaténer les deux listes publierait chaque image **en double**, et aucune
comparaison de chaînes ne pourrait s'en apercevoir — le dédoublonnage par URL
laisserait passer douze entrées pour six photos.

Règle retenue : **on garde la source qui décrit le plus d'images**, la Graph API
l'emportant à égalité (meilleure définition, et seule source quand le corps du
webhook n'annonce rien).

Ce choix a une conséquence qui est la raison même de la règle : la Graph API rend
un tableau vide **sans erreur** quand `PAGE_ACCESS_TOKEN` manque ou a expiré. Le
corps du webhook prend alors la main et l'actu garde ses six images. Une panne de
token ne doit pas se traduire par une perte de contenu silencieuse.

### 3. Une image ratée n'annule pas les autres

Chaque image est montée sur Cloudinary séparément ; celle qui échoue retombe sur
son URL Facebook directe — le comportement d'avant, quand il n'y en avait qu'une.

⚠️ Pas de rollback global ici, contrairement à la publication depuis l'admin
(`routes/admin-actus.js`). Les deux cas ne sont pas symétriques : l'admin **a** les
octets sous la main et peut refuser l'actu en bloc, l'habitant réessaiera. Le
webhook, lui, ne repasse pas : Facebook ne renvoie pas l'événement. Refuser l'actu
entière parce qu'une image sur six n'est pas montée, ce serait perdre le post.

### 4. `photo` reste la couverture

`photos[]` **s'ajoute** à `photo` / `photoPublicId`, comme pour les actus de
l'admin (ADR-0039) : le push, la vignette du rendu bureau et la carte « prochaine
manifestation » lisent `photo` seul et ne doivent rien savoir du reste.

## Conséquences

- Un post `#MAT` à plusieurs photos produit une actu à plusieurs photos, balayable
  dans l'app comme n'importe quelle autre (aucun code d'affichage n'a changé :
  `getActuPhotos` lisait déjà `photos[]`).
- Le plafond reste **6 images** (`MAX_ACTU_PHOTOS`), le même dans les deux sens.
- Les logs comptent désormais : `📰 Publication #MAT détectée … (N image(s)
  annoncée(s))` puis `💾 Actu FB stockée … (N photo(s))`. Un écart entre les deux
  se voit — c'est précisément ce qui manquait.
- `test/webhook-photos.test.js` verrouille les deux formes du corps du webhook, le
  plafond, et le cas dégradé « Graph API muette ». Il ne fait **aucun** appel
  réseau : sans `PAGE_ACCESS_TOKEN` la Graph API rend `[]` sans requête, et sans
  Cloudinary les URL sont conservées telles quelles.

## Alternatives écartées

- **Fusionner les deux sources en dédoublonnant par URL** — c'est le piège décrit
  au §2 : les URL diffèrent pour la même photo, le doublon passerait.
- **N'utiliser que le corps du webhook** — ses URL sont de définition moindre et
  expirent ; la Graph API donne de meilleures images à monter sur Cloudinary.
- **N'utiliser que la Graph API** — un `PAGE_ACCESS_TOKEN` périmé ramènerait alors
  l'actu à zéro image au lieu de six, toujours en silence.
- **Aller chercher chaque photo par son `id` d'album** — une requête par image, un
  quota Graph consommé pour rien : `subattachments` les rend toutes d'un coup.
