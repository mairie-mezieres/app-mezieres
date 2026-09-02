# ADR-0036 — Masquer une zone : seul le noir est irréversible, et il faut le dire

- **Statut** : accepté
- **Date** : 2 septembre 2026
- **Portée** : `js/mat-atelier-fichiers.js` (outils « Organiser un PDF » et « Masquer une zone »)
- **Complète** : [ADR-0035](0035-atelier-fichiers-les-documents-de-la-mairie-ne-sortent-pas-du-navigateur.md)

## Contexte

Deux besoins revenaient constamment et passaient encore par des sites tiers :
redresser ou dégrossir un scan (supprimer une page blanche, remettre une page à
l'endroit, extraire un extrait), et masquer un visage, une plaque ou une adresse
avant publication.

## Décisions

### 1. Organiser un PDF ne rasterise jamais

`pdf-lib` recopie les objets de page d'origine (`copyPages`) : le texte reste
sélectionnable, la qualité est celle du document source, le poids ne bouge
presque pas. C'est **l'inverse** de « Compresser un PDF », qui réencode chaque
page en image et détruit le texte. Les deux outils étant voisins dans la même
barre, leur description le dit explicitement — sans quoi on choisit le mauvais
et on s'en aperçoit trop tard.

`pdf.js` ne sert qu'à dessiner les vignettes. Une rotation **re-rend** la
vignette concernée au lieu de la faire tourner en CSS : une rotation CSS sur une
vignette non carrée déborde de sa case, et surtout elle montrerait autre chose
que ce que le fichier contiendra.

⚠️ La rotation demandée **s'ajoute** à celle que la page portait déjà
(`page.getRotation().angle + r`). Un scan enregistré à 90° et pivoté d'un quart
de tour doit finir à 180°, pas à 90°.

### 2. Trois masques, et un seul qui garantit quelque chose

Flou, pixels, noir opaque. Le flou est le défaut : c'est ce qu'on attend sur une
photo de manifestation, et un visage noirci fait un mauvais cliché.

Mais **seul le noir supprime réellement l'information**. Un flou trop léger sur
un petit visage, une pixelisation à gros blocs sur une plaque : l'information
reste partiellement là, et des attaques par reconstruction existent. L'interface
le **dit**, sous l'éditeur, en une phrase : pour une plaque ou une adresse dans
un document, préférer le noir. Proposer trois options en laissant croire
qu'elles se valent aurait été pire que n'en proposer qu'une.

Le rayon du flou et la taille des blocs sont **proportionnels à la zone** : un
flou de 10 px ne masque rien sur une photo de 4 000 px de large.

### 3. Les zones sont stockées en coordonnées normalisées

L'aperçu fait au plus 720 px de large, la photo plusieurs milliers. Des
coordonnées en pixels d'aperçu masqueraient le mauvais endroit sur l'original.
Le masque est appliqué **à la pleine résolution**, jamais sur l'image réduite
qu'on voit à l'écran — et la toile masquée repart directement dans
`imageToTarget` (`createImageBitmap` accepte un canvas), donc sans encodage
intermédiaire entre le masque et la sortie.

## Deux pièges rencontrés, tous deux invisibles à l'usage

### Une zone tracée avant que l'aperçu soit prêt

La photo est décodée en tâche de fond. Le panneau devient visible avant que le
canvas porte quoi que ce soit — et un `<canvas>` sans attribut fait **300 px de
large par défaut**, donc « le canvas a une largeur » ne prouve rien.

Un tracé anticipé enregistrait bien une zone, appliquée au traitement, mais
`peindreEditeur` sortait aussitôt faute d'image : rien ne se dessinait, le
compteur restait vide. L'utilisateur recommençait, accumulant des zones
invisibles qui finissaient toutes sur la photo. `pointerdown` exige désormais
que l'aperçu existe, et l'attente s'affiche (« Chargement de l'aperçu… »).

*Le test avait le même défaut* : il attendait `canvas.width > 100`, condition
vraie immédiatement. C'est ce qui l'a fait échouer une fois sur trois — et
c'est ce qui a révélé le bug.

### Un garde-fou qui annulait exactement ce qu'il devait corriger

Une image de 27 Ko soumise à une cible de 300 Ko ressortait à **44 Ko** : le
moteur essaie d'abord la qualité 0,95, la trouve sous la cible, s'arrête. La
liste affichait « +63 % » en rouge sur une compression demandée.

Le correctif resserre la cible sur le poids d'origine. ⛔ Il ne renvoie **pas**
l'original tel quel : celui-ci emporterait ses métadonnées, position GPS
comprise, alors que l'outil promet le contraire (voir plus bas).

Un premier essai ajoutait un plancher de 50 Ko, censé éviter d'exiger
l'impossible d'une petite image. Il **annulait le cas qui motivait le
correctif** : 27 Ko visait alors 50 Ko et ressortait à 44 Ko, inchangé. Le vrai
risque — annoncer un échec sur une cible que personne n'a demandée — se traite
ailleurs : `miss` n'est retenu que si la cible **demandée** est ratée.

## La suppression des métadonnées devient une promesse

Les outils qui produisent une image la réencodent, donc n'emportent aucune
métadonnée de l'originale — position GPS comprise. C'était déjà vrai depuis
l'ADR-0035, mais par accident et sans que personne le sache.

Mesuré : un JPEG portant une section EXIF avec les coordonnées de Mézières
ressort sans marqueur `APP1` ni chaîne `Exif`. C'est utile — une photo prise au
téléphone et publiée trahit sinon le lieu de la prise de vue — donc c'est
désormais **affiché** sous la liste des fichiers (`TOOLS[…].metadonnees`).

Une garantie tacite n'en est pas une : le jour où un outil renverrait les octets
d'origine tels quels, personne ne s'en apercevrait. C'est précisément ce que le
correctif ci-dessus a failli faire.

## Ce qu'on n'a pas fait

- **Détecter les visages automatiquement.** Il faudrait embarquer un modèle
  lourd, et une détection qui rate un visage sur dix est pire qu'un tracé
  manuel : elle donne confiance.
- **Réordonner les pages par glisser-déposer.** Des flèches suffisent pour le
  besoin réel (déplacer une page ou deux) et fonctionnent au doigt comme au
  clavier, sans dépendance.
