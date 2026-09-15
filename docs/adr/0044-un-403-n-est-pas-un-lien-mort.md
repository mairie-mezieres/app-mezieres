# ADR-0044 — Un 403 n'est pas un lien mort : re-tester, plutôt qu'exclure

**Date** : 14 septembre 2026
**Statut** : accepté
**Note** : publié d'abord sous le numéro **0042**, déjà pris le même jour par
« La veille ouvre, personne ne referme » (fusionné quelques heures plus tôt).
Renuméroté en 0044 le 15 septembre 2026 — un numéro d'ADR désigne une décision
et une seule, sans quoi « voir l'ADR-0042 » ne désigne plus rien.
**Portée** : `.github/workflows/liens-morts.yml` (app **et** backend),
`scripts/verifier-liens-signales.js` (les deux dépôts)

## Contexte

Le scan hebdomadaire de liens morts a ouvert l'**issue #450** avec quatre erreurs.
Trois n'en étaient pas :

| Signalé | Réalité |
|---|---|
| `https://www.chaiamandineetquentin.fr/` — 403 | page vivante, s'ouvre dans un navigateur |
| `https://www.xpfibre.com/loiret-thd` — 403 (`js/mat-guide-arrivee.js`) | idem — c'est **l'étape bloquante** du raccordement fibre d'une construction neuve (ADR-0013) |
| `https://www.xpfibre.com/loiret-thd` — « Error (cached) » (`js/mat-mel.js`) | la **même** URL, recomptée |
| `img/Fabrice AUFFRET 47 ans - 3 Mandats …jpg` introuvable | **vraie** erreur : fichier supprimé par la réorganisation des portraits (ADR-0041) |

Trois faux positifs sur quatre : le rapport devient un texte qu'on parcourt en
diagonale, et la seule erreur réelle — un carré vide à la place d'une photo, en
production — y passe inaperçue. C'est exactement le mécanisme décrit pour les
« TIMEOUT » de l'issue #201 : *un faux positif coûte plus cher qu'un scan lent,
il apprend à se méfier du signal.*

Un 403 ne dit pas « cette page n'existe pas ». Il dit « ce serveur ne répond pas
**à ce client-là** » : sans en-têtes de navigateur (User-Agent, `Accept`,
`Accept-Language`), Cloudflare et la plupart des éditeurs de sites clés en main
refusent la requête. Le scan mesurait donc la politique anti-robots des sites,
pas l'accessibilité des pages pour un habitant.

## Décision

**Re-tester pour de vrai, au lieu d'allonger la liste des exclusions.**

Après lychee, une étape `node scripts/verifier-liens-signales.js` rappelle
**chaque URL rejetée** avec des en-têtes de navigateur (2 essais, 30 s) :

- elle répond (< 400) → **faux positif** : elle sort du rapport et va dans un bloc
  repliable « signalés mais ouverts sans problème », pour rester consultable sans
  faire de bruit ;
- elle ne répond toujours pas → elle **reste** dans le rapport, avec les deux
  verdicts (lychee et re-test) ;
- ce n'est pas une URL HTTP (`file://`, chemin local) → **conservée telle quelle** :
  c'est le cas de la photo manquante, et c'est le genre d'erreur qu'on veut voir.

C'est le nombre de liens **restants** qui ouvre, met à jour ou referme l'issue —
plus le code de sortie de lychee.

## Pourquoi pas `--exclude`, ni `--accept 403`

C'était le geste réflexe, et c'est le mauvais.

- **`--exclude 'xpfibre\.com'`** : un domaine exclu n'est **plus jamais vérifié**,
  y compris le jour où il meurt pour de bon. Or ce scan existe précisément parce
  que `valdeloire-fibre.fr` — un domaine **inexistant** — a été annoncé aux
  habitants pendant des mois sans que rien ne le détecte. Chaque exclusion est un
  trou permanent dans le filet, et elle vieillit elle-même en silence (trois des
  cinq faux positifs de l'issue #181 venaient de motifs d'exclusion devenus faux).
- **`--accept 403`** : ce serait aveugler le scan sur *tous* les 403, y compris un
  vrai (page passée en accès restreint, lien devenu réservé). Le re-test, lui,
  répond à la seule question qui compte : **est-ce qu'un navigateur l'ouvre ?**

Les exclusions existantes restent en place : elles couvrent surtout des points
d'entrée d'API et des préfixes d'URL jamais requis tels quels, qu'aucun re-test
ne rendrait verts.

## Conséquences

- ⚠️ Le rapport de l'issue n'est plus celui de lychee : il est **écrit par le
  script** (`--format json` en entrée). Changer le format de sortie de lychee, ou
  la version de l'action, impose de vérifier que `error_map` est toujours lu —
  le script tolère déjà `fail_map`, l'ancien nom.
- ⚠️ Le re-test suit les redirections et ne lit pas le corps de la réponse : une
  page qui répond 200 avec un contenu « introuvable » (*soft 404*) passe. C'était
  déjà la limite de lychee ; elle n'est pas aggravée.
- ⚠️ Le script vit en **double** (`app-mezieres` et `chatbot-mairie-mezieres`),
  comme les deux workflows : les garder identiques. Son test vit dans le dépôt
  backend (`test/liens-signales.test.js`, seul des deux à avoir un lanceur
  `node:test`) et couvre les deux copies : un serveur local y rejoue un 403
  servi au robot mais pas au navigateur, un vrai 404 et un fichier introuvable.
- Un lien réellement mort met désormais ~1 minute de plus à être signalé (deux
  essais espacés de 2 s, par URL en erreur). Sur quatre erreurs, c'est invisible ;
  le job reste très en deçà de ses 10 minutes.

## Amendement du 15 septembre 2026 — le re-test ne suffit pas non plus

**L'issue #453 a rouvert sur `https://www.xpfibre.com/loiret-thd`** : l'URL même
qui a motivé ce script, signalée une deuxième fois, avec cette mention —
`re-test navigateur : HTTP 403`. La page, elle, s'ouvre parfaitement sur un
téléphone.

La décision ci-dessus reposait sur une hypothèse implicite : *un serveur qui
refuse un robot accepte des en-têtes de navigateur*. C'est vrai de la plupart
des sites — ce fut vrai de `chaiamandineetquentin.fr` — et **faux de
Cloudflare**. Les en-têtes ne sont qu'une partie de ce qu'un serveur voit :
l'**empreinte TLS** (ordre des ciphers, extensions du ClientHello) et le
**protocole** trahissent le client bien avant le `User-Agent`. Node parle en
HTTP/1.1 quand Chrome parle en h2 ; annoncer « Chrome 140 » par-dessus une
poignée de main qui n'est pas celle de Chrome est même un **signal de robot
supplémentaire**. Rien de tout cela ne se falsifie depuis `fetch`.

Le script traitait donc « il me refuse encore » comme « la page est morte » — et
c'est ce glissement qui est faux. Un 403 ne devient pas un constat de décès
parce qu'on l'a obtenu deux fois.

**Décision : un verdict à trois états**, et un seul ouvre une issue.

| Verdict | Quand | Conséquence |
|---|---|---|
| `vivant` | réponse < 400 | faux positif → bloc repliable |
| `bloque` | **403, 429, 999** persistants | **invérifiable** : listé, re-testé chaque semaine, **non compté** dans `restants` |
| `casse` | 404, 410, 401, 5xx, DNS, connexion refusée, expiration | reste dans le rapport, ouvre l'issue |

Ce n'est pas `--accept 403` déguisé : l'URL continue d'être **testée à chaque
scan** et **affichée**, elle cesse seulement de déclencher une alerte. La
différence tient à ce qu'on écrit dans le rapport — « je ne sais pas » au lieu de
« c'est cassé ». Un `--exclude`, lui, aurait supprimé la mesure.

Le jeu d'en-têtes a par ailleurs été complété (`sec-ch-ua`, `Sec-Fetch-*`) : leur
absence est à elle seule un marqueur de robot, et les envoyer récupère les sites
dont le filtrage s'arrête là.

**Limite assumée** : une page réellement passée en accès interdit sur un site
protégé par Cloudflare ne sera plus signalée. C'est un risque faible — une page
supprimée répond **404**, un domaine mort échoue en **DNS**, et ni l'un ni
l'autre n'entre dans la liste ci-dessus — et il coûte moins cher que l'inverse :
trois faux positifs sur quatre avaient déjà appris à lire ce rapport en
diagonale.

⚠️ **Conséquence sur la visibilité** : quand il ne reste que des liens `bloque`,
`restants=0`, donc aucune issue n'est ouverte — et le rapport n'irait nulle part.
Le script l'écrit donc aussi dans `$GITHUB_STEP_SUMMARY` (le canal par défaut,
comme pour le suivi du dépôt, ADR-0043). Une sortie `bloques=<n>` accompagne
`restants=<n>`.

## Voir aussi

- `docs/adr/0013-fibre-operateur-d-infrastructure-et-fournisseur-d-acces.md` — pourquoi le lien XpFibre compte
- `docs/adr/0041-charger-un-ecran-quand-on-l-ouvre.md` — la réorganisation des portraits, à l'origine de la vraie erreur
- `chatbot-mairie-mezieres/CLAUDE.md` §« Liens des réponses — vérification automatique »
