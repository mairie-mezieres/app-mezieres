# ADR-0051 — « Remonter le temps » : une époque se relève, elle ne se suppose pas

- **Date** : 22 septembre 2026
- **Statut** : accepté
- **Concerne** : `js/mat-carte3d.js` (`_c3dSonderEpoque`, `_c3dTempsOpacites`), `SFD-17` §RG-17.31

## Contexte

La carte 3D gagne un curseur qui fait défiler les époques du village en fondu :
carte de Cassini (XVIIIᵉ siècle), carte de l'état-major (XIXᵉ siècle), photographies
aériennes de 1950-1965, puis le fond actuel. L'IGN diffuse ces trois documents sur la
Géoplateforme, et le Géoportail les nomme `GEOGRAPHICALGRIDSYSTEMS.CASSINI`,
`GEOGRAPHICALGRIDSYSTEMS.ETATMAJOR40` et `ORTHOIMAGERY.ORTHOPHOTOS.1950-1965`.

Une tuile WMTS se demande avec ces **trois** paramètres : la couche, le **format d'image**
et le **niveau de zoom**. Les deux derniers ne se devinent pas : selon la couche, l'IGN
sert du JPEG ou du PNG, et chaque document s'arrête à son propre zoom maximal (une carte
au 1/40 000 ne descend pas aussi bas qu'une photo aérienne).

Or `data.geopf.fr` est **bloqué depuis l'environnement de développement**, comme le sont
les sites qui en citent les capacités. Les identifiants ont été confirmés par recherche.
Le format et les zooms, eux, n'ont pas pu l'être.

## Décision

### 1. Seuls les identifiants sont écrits. Format et zooms sont relevés à l'exécution

À la première ouverture du panneau, et une seule fois par session, la carte demande pour
chaque époque une **tuile témoin** au zoom 14, au-dessus du bourg, dans chaque format
candidat. Le premier format qui répond est retenu, puis les zooms voisins (11 à 18) sont
sondés dans ce format. La plage retenue est **contiguë** autour du zoom témoin :
MapLibre ne sait pas sauter un trou.

Une réponse n'est une tuile que si c'est **une image**. Un serveur OGC renvoie ses refus
en XML, parfois sous un statut 200 : se fier au seul statut, c'est prendre une page
d'erreur pour une carte.

Le coût est borné : au plus 9 petites requêtes par époque, soit moins de 30, et
seulement pour l'habitant qui ouvre le panneau.

### 2. Une époque muette n'est pas proposée, et elle le dit

Elle n'a ni repère sur le curseur, ni couche sur la carte. Son échec est inscrit au
« 🔎 Détail des sources » avec la phrase du serveur (`ExceptionText`), comme toute autre
source de la carte (ADR-0018). Si aucune ne répond, le panneau le dit et le curseur est
retiré. On ne montre **jamais** le fond actuel sous une étiquette « 1950-1965 ».

Pour la même raison, un avertissement s'affiche **sous le zoom minimal** relevé d'une
époque (la couche ne s'y dessine pas), et le bouton est retiré en **vue territoire**.

### 3. Les dates sont celles des documents, à la précision où on peut les affirmer

« XVIIIᵉ siècle » pour Cassini, « XIXᵉ siècle » pour l'état-major, « 1950-1965 » pour
les photos, qui est le nom même de la couche. Pas d'année : la carte de Cassini a été
levée sur plusieurs décennies, et l'année de la feuille de Mézières n'est pas connue ici.
Une année précise serait **inventée**, au sens exact d'ADR-0018.

### 4. Le fondu repose sur un empilement, pas sur une superposition à parts égales

Les couches d'époque sont posées juste au-dessus du fond et sous tout le reste (zonage,
bâti, noms). La **plus ancienne est en haut**. À la position `v` du curseur (0 = la plus
ancienne, n = aujourd'hui), l'époque `k` a pour opacité `k + 1 − v`, bornée à [0, 1].
Entre deux époques, la plus ancienne s'efface et laisse voir la suivante, entièrement
opaque dessous. Un simple mélange des opacités laisserait transparaître le fond actuel
à mi-course.

## Conséquences

- ✅ Si l'IGN change un format ou ajoute des niveaux, la carte suit sans modification.
- ✅ Le bâti 3D d'aujourd'hui reste en relief par-dessus les cartes anciennes : on voit
  d'un coup d'œil ce qui a été construit depuis. Le zonage, lui, s'efface tant qu'on
  regarde le passé, car il brouille une carte ancienne. Il revient à « Aujourd'hui » si le
  bouton « Zonage du PLU » est toujours actif.
- ⚠️ **Rien de ceci n'a pu être vu sur les vraies tuiles depuis le développement.** Les
  tests (`carte3d.spec.js`, section « Remonter le temps ») simulent un IGN qui répond de
  trois façons : une époque en JPEG, une en PNG sur d'autres zooms, une qui refuse. La
  première ouverture en production doit se vérifier au « 🔎 Détail des sources », qui
  affiche pour chaque époque le format et les zooms réellement relevés.
- ❌ Le cadastre napoléonien n'est pas proposé. Il est conservé par les archives
  départementales et n'est pas diffusé en tuiles sur la Géoplateforme : le brancher
  supposerait une source qu'on n'a pas vérifiée.
