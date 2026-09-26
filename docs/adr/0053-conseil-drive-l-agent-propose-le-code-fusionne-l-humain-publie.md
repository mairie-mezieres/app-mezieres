# ADR-0053 — Pipeline conseil-drive : l'agent propose, le code fusionne, l'humain publie

Date : 26 septembre 2026 · Complète l'ADR-0052

## Contexte

Les comptes rendus du conseil municipal sont déposés en PDF sur un dossier
Drive public (celui du lien « Comptes rendus du conseil municipal » de
l'écran Documents). L'ADR-0052 a fait de `data/conseil.json` la source des
onglets « Décisions »/« Projets » — mis à jour à la main. Ce pipeline
(`.github/workflows/conseil-drive.yml`, hebdomadaire) automatise le chemin
Drive → extraction → PR, **sans changer qui décide** : rien n'entre dans
`main` sans un humain.

## Décisions

### 1. Trois rôles, trois mécanismes — jamais mélangés

- **relever** : `scripts/conseil-drive-liste.js` lit la vue publique
  `embeddedfolderview` (pas de clé d'API) et télécharge les PDF nouveaux ;
- **proposer** : un agent (claude-code-action, outils Read/Write seulement)
  rédige `conseil-drive/proposition.json` — les résumés « en clair », et
  rien d'autre : il ne touche JAMAIS `data/conseil.json` ;
- **fusionner** : `scripts/conseil-drive-fusion.js` — du code relu — valide
  la proposition (schéma, apostrophes, thèmes, doublons internes) puis
  l'applique. Même partage que la mémoire de veille (ADR-0027) : ce qui
  garantit l'anti-doublon vit en code, pas dans un prompt.

La PR est un **draft** sur la branche fixe `conseil/maj-drive` (une seule PR
vivante, mise à jour par les runs suivants). La sortir du brouillon après
relecture des `en_clair` face aux PDF est LE geste de validation humaine
(ADR-0023). ⚠️ Ces PR n'ont pas de coche verte (`GITHUB_TOKEN`) : les
contrôles tournent dans le run, le corps de PR y renvoie.

### 2. Anti-doublon : les clés du cahier des charges, en code testé

| Élément | Clé | Comportement |
|---|---|---|
| Séance | `id` = date | existante → mise à jour, `drive_id` posé (cas « saisie par anticipation » : la séance du 31/08 saisie avant son PDF est complétée, pas doublée) |
| CR partiel puis PV | même `id` | `document` passe à `pv`, **jamais l'inverse** |
| Décision | n° de délibération, sinon id stable | mise à jour, jamais d'ajout en double — un re-run du job ne double rien |
| Décision du Maire | date + objet **normalisé** + montant | deux extractions n'écrivent jamais l'objet à l'octet près : minuscules, sans accents |
| Projet | `id` | existant → mise à jour (sources unies, **jamais dépublié** par le pipeline) ; **inconnu → refusé** : créer un projet reste un geste humain, le journal le nomme |
| Fichier Drive | `drive_id` | traité → inscrit à `data/conseil-drive-etat.json`, plus jamais relu |

Et : aucune séance antérieure à `depuis` (01/04/2026) n'entre dans le
fichier, même présente sur le Drive (`ecartes`, raison `avant-mandat`).
`scripts/check-conseil-drive.js` rejoue ces règles en CI — aucun test E2E ne
peut les voir, et un doublon de séance ne se verrait qu'au conseil suivant,
en production.

### 3. ⛔ Un fichier ni intégré ni écarté n'est PAS « traité »

L'état ne marque un `drive_id` que si la proposition l'a consommé (séance)
ou écarté (raison nommée). Un fichier passé sous silence est **retenté au
run suivant** et listé dans le résumé de PR : une absence ne se remarque pas
toute seule — la marquer « traitée » l'aurait fait disparaître pour toujours.

### 4. ⛔ Un parseur qui ne mesure rien verdit (ADR-0030)

`drive.google.com` est **injoignable depuis l'environnement de dev** (comme
`data.geopf.fr`, ADR-0051) : le format réel de la vue se relève au premier
run. D'où le garde-fou : la page doit porter le marqueur `flip-entry` —
présent avec 0 entrée = dossier vide (normal) ; absent = format inconnu =
**échec du job**, jamais un « rien de nouveau ». De même, une proposition
absente après deux tentatives d'agent est un échec, et un PDF scanné sans
couche texte est écarté `illisible`, jamais deviné.

### 5. Le texte des PDF est du contenu, pas une instruction

L'agent n'a que Read/Write (ni Bash, ni Web), son prompt lui impose
d'écarter (`pas-un-cr`) tout texte qui ressemble à des consignes, et la
fusion refuse tout ce qui sort du schéma. Les seuls textes de l'agent qui
atteignent la PR (raisons, détails) sont tronqués et traités comme du texte.

### 6. Pas de bump, pas de notification push

`data/conseil.json` est servi **réseau d'abord** (ADR-0052) : une fusion de
données ne bumpe ni le SW ni la version. La notification, c'est la PR
elle-même (et les notifications GitHub qui vont avec) ; le push habitant
« nouveau conseil » reste hors périmètre, comme au cahier des charges.

### 7. ⛔ Premier run réel : un run sans changement ne retenait rien

Le 26 septembre 2026, le premier run a relevé **41 fichiers** (le dossier
porte tout l'historique, 2020 → 2026) et en a téléchargé 40. L'agent les a
tous écartés, correctement — mais la mémoire des écartés ne voyageait que
dans la PR, et sans changement il n'y a pas de PR : **rien n'était
enregistré**. Chaque mardi, les mêmes 40 PDF auraient été retéléchargés et
relus par l'agent, à ~0,73 $ le run, sans fin et sans signal.

D'où **deux mémoires, deux chemins** :
- un fichier devenu séance se mémorise par son `drive_id` dans
  `data/conseil.json`, qui passe par la PR draft (refuser la PR, c'est
  accepter qu'il soit re-proposé) ;
- un fichier écarté se mémorise dans `data/conseil-drive-etat.json`,
  **commité directement sur `main`** par le workflow, comme la mémoire de
  veille (ADR-0027), depuis un checkout propre de `main`.
Deux fichiers distincts : le commit direct et la PR ne peuvent pas entrer
en conflit. Pour forcer la relecture d'un fichier écarté, supprimer son
entrée de l'état.

Et un **sous-dossier** (« Archives ») est ignoré au relevé : son
téléchargement rendait HTTP 500, retenté chaque semaine.

### 8. ⛔ Les PDF du Drive sont des SCANS : OCR en repli

Au même run, `pdftotext` rendait **1 à 4 octets** par fichier — tous des
scans, y compris le PV du 31 août 2026. D'où un repli OCR : sous 200
caractères non blancs, la page est rasterisée (`pdftoppm`, 300 dpi, niveaux
de gris) et lue par `tesseract` en français. Mesuré sur un scan simulé :
texte complet en 1 s, avec **une erreur typique : « O contre » pour
« 0 contre »**. Un fichier OCRisé porte donc un témoin `<id>.ocr`, et le
prompt impose à l'agent de n'écrire un nombre (vote, montant, n° de
délibération, date) que s'il est non ambigu — sinon `null`. La relecture
humaine des `en_clair` face au PDF, avant de sortir la PR du brouillon,
reste le dernier garde-fou.

## Conséquences

- Quand le PDF du 31/08 sera déposé, la séance existante gagnera son
  `drive_id` et ses éventuels compléments — pas de doublon (testé).
- Le premier run réel est à surveiller : format de la vue Drive, noms de
  fichiers, qualité des PDF. Tout échec dira ce qu'il a vu.
- Quatre fichiers du pipeline : `conseil-drive-liste.js`, le prompt
  `.github/prompts/conseil-drive.md`, `conseil-drive-fusion.js` (+ son
  check), `conseil-drive-pr.js` — et l'état `data/conseil-drive-etat.json`.
