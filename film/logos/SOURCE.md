# Logos de tiers utilisés dans le film

| Fichier | Marque | Autorisation |
|---|---|---|
| `mistral-ai.png` | Mistral AI | Accord **donné par Mistral AI** à la commune, le 14 octobre 2026, pour l'usage du logo **dans le contexte où l'application utilise Mistral** (l'assistante MEL). |

## ⛔ Ce que cet accord permet, et ce qu'il ne permet pas

Il permet d'**afficher le logo en disant qu'on les utilise**. Le film écrit donc
« **Propulsée par Mistral AI** » à côté du logo.

Il ne transforme pas la commune en partenaire, ni le logo en label : ⛔ ne jamais
écrire « labellisé », « certifié », « partenaire officiel » ni laisser entendre
que Mistral AI valide le contenu municipal. Si le terme « approuvé » doit un jour
être écrit, c'est à Mistral de l'avoir écrit en premier — dans l'échange conservé
par la mairie.

## ⛔ La preuve de l'accord ne vit pas ici

Comme pour la musique (`film/musique/SOURCE.md`), le dépôt garde le **fichier**,
pas le **droit de l'utiliser**. L'échange avec Mistral AI est conservé par la
mairie dans ses archives : c'est lui qu'on produira en cas de question, des mois
après la diffusion, quand plus personne ne se souviendra d'où venait l'image.

⚠️ Un logo de tiers dans un film communal se lit comme un **soutien officiel**.
N'en ajouter aucun autre sans le même accord écrit, archivé de la même façon.

## Fabrication du fichier

Recadré depuis l'image fournie par la mairie, fond blanc conservé (les cartouches
de remerciement du film sont blancs, le logo s'y pose sans halo) :

```bash
ffmpeg -i <image.jpg> -vf "crop=420:165:190:128,scale=840:-2:flags=lanczos" mistral-ai.png
```
