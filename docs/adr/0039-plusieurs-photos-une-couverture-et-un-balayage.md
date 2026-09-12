# ADR-0039 — Plusieurs photos par actualité : une couverture, un balayage, un seul post Facebook

- **Date** : 12 septembre 2026 (v4.109)
- **Statut** : accepté
- **Portée** : `app-mezieres` (`js/mat-actus.js`, `css/mat.css`, `admin.html`) et
  `chatbot-mairie-mezieres` (`lib/actu.js`, `routes/admin-actus.js`,
  `routes/admin-simple.js`, `routes/admin-purge.js`, `app.js`)

## Contexte

L'admin n'acceptait qu'**une** image par actualité. Pour une fête du village, une
remise de prix ou des travaux, la mairie devait choisir une photo et renoncer aux
autres — ou publier plusieurs actualités quasi identiques.

Trois questions se posaient ensemble, et aucune ne se règle seule :

1. **Comment les stocker** sans casser les actualités déjà publiées ?
2. **Comment les montrer** sans faire d'une carte d'actualité un mur d'images qui
   repousse le texte hors de l'écran ?
3. **Comment les publier sur Facebook** sans inonder la page de posts séparés ?

## Décision

### 1. Une couverture, et un tableau en plus — jamais à la place

Une actu porte désormais `photos: [{url, publicId}]`. Mais `photo` et
`photoPublicId` **restent renseignés** avec la **première** image.

C'est volontaire et non négociable : cinq endroits n'affichent qu'une vignette et
lisent `photo` sans rien savoir du reste — la liste admin, la colonne de gauche du
rendu bureau (`js/mat-desktop.js`), la carte « prochaine manifestation », l'image
de la **notification push**, et les actus créées par le **webhook Facebook**, qui
n'ont jamais de tableau. Remplacer `photo` par `photos` aurait vidé ces cinq
affichages d'un coup, sans erreur et sans log.

⛔ **Conséquence directe : toute lecture des images d'une actu passe par
`actuPhotoList` (backend) ou `getActuPhotos` (app).** Les deux formes de stockage
coexistent pour toujours : les actus d'avant la v4.109 n'ont que `photo`.

Ce qui se joue n'est pas l'affichage — une image manquante se voit — mais la
**suppression**. Le `DELETE /admin/actus/:id` ne détruisait que
`actu.photoPublicId` ; appliqué tel quel à une actu de six photos, il aurait
libéré la couverture et laissé **cinq images** sur Cloudinary, orphelines, alors
que le seul objet qui les référençait vient de disparaître. Rien ne l'aurait
signalé : la suppression répond `ok: true`. Même piège dans `POST /admin/purge`
et dans l'annulation d'une publication programmée. Les trois passent désormais par
`actuPhotoList`, et `test/actu-photos.test.js` verrouille les deux formes.

### 2. Balayage horizontal natif, contrôles SOUS les photos

L'affichage retenu est un **carrousel une-photo-par-vue** : `overflow-x:auto` +
`scroll-snap-type:x mandatory`, les images en `flex:0 0 100%`.

- **Aucun gestionnaire `touchstart`/`touchend`.** Le diaporama plein écran des
  photos d'habitants (`js/mat-photos.js`) en a un, légitimement : il remplace
  l'écran entier. Ici, le carrousel vit **dans** une page qui défile
  verticalement ; un gestionnaire maison y dispute le geste au défilement de la
  page et au « retour » du navigateur. Le scroll-snap du navigateur arbitre seul,
  mieux, et reste défilable au clavier.
- **Deux boutons ◀ ▶ et un compteur « 2 / 5 »**, en `tabindex="0"` +
  `role="group"` sur la piste. Les boutons ne doublent pas le balayage : ils en
  sont le **seul** équivalent à la souris et au clavier. Le compteur est aussi le
  seul indice qu'il y a autre chose à voir — sans lui, une deuxième photo
  n'existe pas pour qui ne balaie pas par réflexe.
- ⛔ **La barre de contrôle est sous les photos, sur `var(--mist)` opaque, pas en
  surimpression.** Un libellé posé sur une photo a un contraste **indécidable** :
  il change avec chaque image. C'est le piège de la neuvième passe de l'audit
  RGAA (un voile clair sur fond sombre *éclaircit* le fond). Le fond opaque rend
  le contraste mesurable une fois pour toutes.
- ⛔ **`object-fit:contain`, jamais `cover`.** Le snap impose des pages de même
  largeur, donc une hauteur fixe ; `cover` rognerait une photo de groupe en
  portrait. Les bandes latérales prennent la couleur du fond.
- ⛔ **Une seule photo ne produit AUCUN carrousel** — ni piste, ni barre, ni
  compteur : exactement le rendu d'avant la v4.109. C'est la régression la plus
  probable de cette fonctionnalité, et `tests/e2e/actu-galerie.spec.js` la refuse.

Deux rendus coexistent dans le DOM pour la même actu (la carte de la liste et
l'écran de détail) : leurs identifiants portent un suffixe, sinon le compteur de
l'un piloterait l'autre.

### 3. Facebook : photos non publiées puis un seul post

Pour N ≥ 2 images, chaque photo part d'abord en **`published=false`** sur
`/{page}/photos` — invisible sur la page — puis **un** `POST /{page}/feed` porte
le message et les `attached_media[i]`. Un post, toutes les images.

Cela **déplace l'ambiguïté**, et c'est le vrai gain. La règle de la v4.x disait :
un échec réseau ou 5xx sur un envoi de photo peut avoir créé le post, donc pas de
repli texte (sinon doublon). Ici, **un envoi non publié qui échoue ne crée rien de
public** : au pire une photo orpheline invisible. La seule requête ambiguë est le
`POST /feed` final. Donc : une photo refusée sur cinq → le post part avec les
quatre autres (`skippedPhotos`), aucune photo acceptée → repli texte, et
l'ambiguïté ne concerne plus que la dernière requête.

⚠️ `fallbackUsed` reste **faux** quand le post porte des photos, même si l'une a
été refusée. Le récapitulatif de l'admin lit ce drapeau pour écrire « photo non
envoyée, fallback texte » : le mettre à vrai annoncerait un post sans image alors
qu'il en a quatre.

### 4. Redimensionnement côté navigateur, avant l'envoi

L'admin ramène chaque photo à 1600 px / qualité 0,82 (`pubCompress`) avant de
l'envoyer. Six photos de smartphone brutes pèsent plusieurs dizaines de Mo : le
backend plafonne les corps JSON à 6 Mo, et **un 413 se lit comme une panne
réseau**, pas comme « vos photos sont trop lourdes ».

Au passage, un défaut préexistant : `/admin/actus/schedule` n'était **pas** dans
`_isLargeBodyRoute` (`app.js`). Une publication programmée avec photo était donc
refusée dès 256 Ko — depuis toujours, et sans message interprétable.

## Conséquences

- Plafond à **6 photos** (Facebook en accepte 10) : ergonomique, pas technique.
  `MAX_ACTU_PHOTOS` dans `lib/actu.js` est la source unique.
- **Cinq endroits à garder en phase** : `getActuPhotos` (`js/mat-actus.js`),
  `actuPhotoList` (`lib/actu.js`), les trois chemins de suppression
  (`admin-simple`, `admin-purge`, annulation d'une programmation).
- L'**édition** d'une actu ne change toujours pas ses images (comme avant) ; une
  re-publication Facebook reprend en revanche **toutes** ses photos.
- Verrous : `test/actu-photos.test.js` (backend),
  `tests/e2e/actu-galerie.spec.js` (app).

## Alternatives écartées

- **Tout afficher à la verticale** : la demande initiale. Une actu de six photos
  aurait occupé deux écrans et repoussé le texte et les boutons hors de vue.
- **Mosaïque de vignettes + visionneuse plein écran** (réutiliser le diaporama de
  `mat-photos.js`) : deux gestes au lieu d'un pour voir une photo, et il aurait
  fallu démêler ce diaporama de ses votes, de son défilement automatique de 5 s et
  de sa liste `_allPhotos`. Le balayage n'a besoin de rien de tout cela.
- **Une actualité par photo** : c'est la situation qu'on voulait quitter.
- **Remplacer `photo` par `photos`** : voir §1 — cinq affichages vidés en silence.
