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

## Conséquences

- Quand le PDF du 31/08 sera déposé, la séance existante gagnera son
  `drive_id` et ses éventuels compléments — pas de doublon (testé).
- Le premier run réel est à surveiller : format de la vue Drive, noms de
  fichiers, qualité des PDF. Tout échec dira ce qu'il a vu.
- Quatre fichiers du pipeline : `conseil-drive-liste.js`, le prompt
  `.github/prompts/conseil-drive.md`, `conseil-drive-fusion.js` (+ son
  check), `conseil-drive-pr.js` — et l'état `data/conseil-drive-etat.json`.
