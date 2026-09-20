# Musique du film

| Fichier | Titre | Artiste (étiquettes du fichier) |
|---|---|---|
| `funk-down-mk2.mp3` | Funk Down | MK2 |

Piste **fournie par la mairie** le 19 septembre 2026 pour la version sonore du
film (`film/sortie/mat-presentation-vertical-musique.mp4`).

## ⛔ La preuve de licence ne vit pas ici

Ce dépôt garde le **fichier**, pas le **droit de l'utiliser**. Les étiquettes
ci-dessus sont celles écrites dans le MP3 : elles disent qui a composé, pas ce
que la commune a le droit d'en faire.

La mairie conserve donc, dans ses propres archives, la page ou le document qui
établit la licence — bibliothèque audio de YouTube, Pixabay, Free Music
Archive, contrat… C'est ce qu'on demandera en cas de réclamation, des années
après la publication, quand plus personne ne se souviendra d'où venait le
fichier.

⚠️ Une réclamation de droits sur une vidéo de commune ne se règle pas en
retirant le post : la plateforme peut monétiser, bloquer ou signaler la page.
Ne jamais publier une piste dont la licence n'est pas écrite quelque part.

## Refaire la version sonore

```bash
node film/ajouter-musique.js film/musique/funk-down-mk2.mp3
```

Le script cale les fondus sur la durée réelle du film, normalise à −16 LUFS
(cible des réseaux sociaux) et **ne réencode pas l'image**.
