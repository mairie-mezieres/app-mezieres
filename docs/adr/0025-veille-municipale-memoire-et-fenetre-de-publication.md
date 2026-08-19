# ADR-0025 — Veille municipale : un agent sourcé, deux garde-fous contre la répétition

- **Date** : 19 août 2026
- **Statut** : Accepté
- **Voisin de** : ADR-0004 (retry + artefact de diagnostic des veilles IA), ADR-0005 et
  ADR-0023 (canal actionnable de la veille **technologique**, qui ne s'applique pas ici).

## Contexte

Les élus de Mézières sont bénévoles. Les subventions ouvertes aux communes rurales, les
campagnes DETR/DSIL, les textes nouveaux du CGCT ne leur arrivent aujourd'hui que par
hasard — une lettre de la préfecture, un échange en réunion d'intercommunalité — et une
échéance manquée est une enveloppe perdue pour un an.

Un cahier des charges décrivait un pipeline Python dédié : appels authentifiés à l'API
d'Aides-territoires et à Légifrance via PISTE, extraction PDF du recueil des actes
administratifs, tri LLM, état `state/seen.json`, cron GitHub Actions hebdomadaire.

Trois faits ont orienté la décision autrement :

1. **Le dépôt fait déjà tourner deux veilles de ce type.** `veille-techno.yml` et
   `veille-bulletin.yml` reposent sur `anthropics/claude-code-action` avec recherche
   web, un rapport HTML éphémère, `scripts/send-veille-email.js` (générique, déjà
   paramétrable : `REPORT_PATH`, `EMAIL_SUBJECT`, `EMAIL_TO`) et une mémoire committée
   après l'envoi. Recoder un pipeline parallèle en Python aurait créé une **seconde
   mécanique** à maintenir pour le même besoin — la classe d'erreur que le `CLAUDE.md`
   du backend rappelle à propos des « fiches contexte » doublonnant `DIRECT_RULES`.
2. **Le pipeline authentifié ne peut pas démarrer aujourd'hui.** Aides-territoires exige
   un compte et une clé API ; Légifrance exige une inscription PISTE, une application et
   l'acceptation des CGU. Tant que ces comptes n'existent pas, un pipeline Python ne
   produit rien du tout, alors qu'un agent avec recherche web produit un premier envoi
   dès la première exécution.
3. **La cadence hebdomadaire du cahier des charges ne tient pas.** Une commune de moins
   de 1 000 habitants ne dépose pas un dossier par semaine ; quatre envois par mois dont
   trois vides apprennent aux élus à ne plus ouvrir le message.

## Décision

**La veille municipale est un workflow d'agent mensuel, sur le même patron que les deux
veilles existantes**, et non un pipeline Python distinct.
`.github/workflows/veille-municipale.yml` : 1er lundi du mois, deux tentatives, artefact
de diagnostic, rapport HTML envoyé par Resend, mémoire committée après l'envoi.

**Le profil de la commune est un fichier de données, pas du texte de prompt.**
`veille/commune.yml` porte population, EPCI, compétences exercées, compétences
**déléguées** (eau au C3M, déchets et PLUi à la CCTVL…) et seuils d'exclusion. L'agent le
lit à chaque exécution. Une aide qui ne passe pas ce filtre est écartée avant rédaction.

**Deux garde-fous indépendants empêchent de re-servir un sujet d'un mois sur l'autre** —
les deux, pas l'un ou l'autre :

1. **La mémoire.** `veille/historique-municipale.md`, lu avant les recherches, listant
   les items déjà signalés (niveau, titre, URL), tronqué à 12 éditions. Seule exception
   au non-doublon : une évolution notable, annoncée comme telle.
2. **La fenêtre de publication.** Ne sont retenus que les dispositifs publiés, ouverts ou
   modifiés entre `J-35` et `J`, chacun daté ; un dispositif permanent qui n'a pas bougé
   n'entre pas, et une date limite déjà passée écarte l'item.

**Le tri est plafonné dans le prompt** : au plus 4 « action requise », au plus 6 « à
surveiller », les écartés réduits à un nombre et à leurs motifs. Un mois sans action
requise le dit explicitement.

**Passer de l'envoi de test à l'envoi au conseil est une création de secret, pas un
commit.** L'exécution planifiée vise `VEILLE_MUNICIPALE_EMAIL_TO` ; tant que ce secret
n'existe pas, elle retombe sur `VEILLE_EMAIL_TO` (l'adresse de test). Une exécution
manuelle vise l'adresse de test par défaut, et n'écrit au conseil que si on le demande
explicitement.

## Conséquences

**Positives :**
- Un premier envoi utile sans créer aucun compte ni aucune clé d'API.
- Un seul mécanisme de veille à comprendre et à maintenir : mêmes fichiers, même script
  d'envoi, même façon de diagnostiquer un run sans livrable.
- Le profil de la commune est relisible et corrigible par un élu — c'est un `.yml`
  commenté, pas une consigne noyée dans un prompt de 200 lignes.
- La période couverte est écrite dans l'objet de l'email et sous le titre : le lecteur
  sait ce que la veille a regardé, et ce qu'elle n'a pas regardé.

**Négatives / compromis acceptés :**
- **Pas d'exhaustivité.** Une recherche web ne balaie pas les ~3 000 dispositifs de
  l'API d'Aides-territoires. La veille rate des aides ; c'est assumé tant que le compte
  API n'existe pas — un tri sévère qui rate vaut mieux qu'une liste que personne n'ouvre.
- **Pas de journal des décisions de tri.** Le cahier des charges prévoyait de conserver
  chaque décision du LLM pour ajuster le prompt. Ici, seul l'artefact
  `claude-execution-output` (30 jours) en garde la trace.
- **Le rapport n'est pas committé** : l'email est le seul exemplaire. Un envoi Resend
  perdu est un mois perdu — mais la mémoire n'ayant pas avancé, les items reviennent le
  mois suivant.

**Points de vigilance pour les futures évolutions :**
- ⚠️ **Écrire au conseil suppose un domaine vérifié chez Resend.** L'expéditeur est
  aujourd'hui le sender de test `onboarding@resend.dev`, qui n'autorise l'envoi que vers
  l'adresse du compte Resend. Renseigner `VEILLE_MUNICIPALE_EMAIL_TO` avec quinze
  adresses **sans** avoir vérifié `mezieres-lez-clery.fr` et renseigné `RESEND_FROM`
  produira un 403, pas un envoi. Ne jamais mettre une adresse Gmail dans `RESEND_FROM` :
  Resend la rejette.
- ⚠️ **Le nom du mois ne vient pas de `date`.** Les runners GitHub n'ont pas la locale
  `fr_FR.UTF-8` : `LC_TIME=fr_FR.UTF-8 date +%B` y retombe silencieusement en anglais.
  Le workflow construit le mois avec un `case` explicite. `veille-bulletin.yml` porte
  encore l'ancienne forme.
- ⚠️ **`veille/commune.yml` n'est pas de la mise en forme.** Une compétence déléguée
  oubliée (l'eau, les déchets) fait remonter chaque mois des aides que la commune ne peut
  pas solliciter. C'est le fichier à corriger en premier si la veille dérive.
- La suite naturelle est la clé API d'Aides-territoires : elle remplacerait la recherche
  web de l'étape 3 par une collecte filtrée côté serveur (périmètre 45 / Centre-Val de
  Loire / national, bénéficiaire « commune »), sans rien changer au reste de la chaîne —
  ni à la mémoire, ni à la fenêtre, ni à l'envoi. L'obligation de citer Aides-territoires
  avec un lien et une date de mise à jour vaut dans les deux cas.
