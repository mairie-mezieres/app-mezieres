# ADR-0013 — Fibre : ne jamais confondre opérateur d'infrastructure et fournisseur d'accès

- **Date** : 3 août 2026
- **Statut** : Accepté

## Contexte

Un habitant construisant rue de Rolland a demandé à la mairie comment faire
raccorder sa maison neuve. En relisant ce que l'application répond à cette
question, on a constaté que les trois canaux — l'arbre de décision de MEL, la
fiche fibre du guide d'arrivée, et la règle directe du backend — racontaient la
même chose, et que cette chose était fausse.

Tous présentaient **Lysséo** comme le guichet de l'habitant : « vérifiez votre
éligibilité sur lysseo.fr ou contactez votre fournisseur internet », « déclarez
votre construction neuve auprès de Lysséo ». La formulation mettait l'opérateur
du réseau et le fournisseur d'accès sur le même plan, comme deux portes d'entrée
équivalentes.

Or :

- **Lysséo est le réseau public fibre du Loiret**, construit et exploité par
  **Loiret THD / Loiret Fibre** (groupe XpFibre) en délégation de service public
  du Département. C'est un **opérateur d'infrastructure**. Il ne vend aucun
  abonnement — les « forfaits » visibles sur son site sont ceux des opérateurs
  commerciaux présents sur le réseau.
- L'habitant souscrit donc chez **Orange, SFR, Bouygues, Free…** — jamais chez
  Lysséo.

La conséquence pratique n'était pas anodine. Pour une **construction neuve**,
l'étape réellement bloquante — et absente de nos trois canaux — est la
**déclaration de l'adresse auprès de l'opérateur d'infrastructure**. Une maison
neuve n'est pas automatiquement présente dans sa base d'adresses ; tant qu'elle
n'y figure pas comme « raccordable », **aucun opérateur commercial ne peut
enregistrer la commande**. L'habitant qui suivait notre réponse appelait donc
son FAI, s'entendait dire que son adresse n'existait pas, et revenait en mairie
sans savoir quoi faire.

Deux liens étaient par ailleurs inexploitables : `lysseo.fr/page-contact/41`
(qui n'est pas l'adresse du formulaire de contact) et deux renvois vers la page
d'accueil accompagnés de « cliquez sur le bouton en haut à droite » — une
instruction de navigation qui casse au premier changement de menu du site.

Enfin, le prompt du topic `numerique` du backend affirmait encore que
« l'offre principale est le THD Radio / 4G fixe ». Il contredisait la règle
directe située quelques lignes plus haut : dès qu'une question sortait du
périmètre de la règle, MEL orientait vers le THD Radio une commune fibrée.

## Décision

**Toute réponse sur la fibre distingue explicitement les trois acteurs, et
énonce l'étape préalable pour une construction neuve.**

1. **Lysséo / Loiret THD / Loiret Fibre (XpFibre)** — opérateur d'infrastructure.
   Interlocuteur pour : déclarer une construction neuve, l'avancement du
   déploiement, un dommage sur les équipements du réseau. **Ne vend rien.**
2. **Orange, SFR, Bouygues, Free…** — opérateurs commerciaux. Interlocuteurs
   pour : l'abonnement, le rendez-vous d'installation, la facture, une panne de
   la ligne. Le tirage de la fibre du point de branchement jusqu'au logement est
   réalisé par **leur** prestataire.
3. **La mairie** — vérifie que la numérotation de la parcelle a été transmise et
   intégrée à la **Base Adresse Nationale**, condition nécessaire à la prise en
   compte de l'adresse par l'opérateur d'infrastructure. Elle ne raccorde
   personne et n'a aucun pouvoir sur le calendrier de déploiement.

Corollaires :

- **Pas d'instruction de navigation** (« le bouton en haut à droite »,
  « en bas de page ») dans une réponse : on pointe l'URL du formulaire.
- **Pas de « déclarez-la auprès de Lysséo »** sans dire ce que cela veut dire
  concrètement — le formulaire, et les pièces à joindre (permis de construire,
  certificat de numérotation, plan de masse localisant le regard et les
  fourreaux en limite de propriété).

## Conséquences

- L'arbre de décision (`js/mat-mel.js` **et** `data/mel-tree.json` — double
  source à garder en phase), `js/mat-guide-arrivee.js` et la règle `fibre` de
  `lib/mel.js` côté backend sont alignés sur ce découpage.
- Le prompt du topic `numerique` (`lib/mel.js`) décrit le réseau fibre et le
  rôle de chacun, au lieu du THD Radio.
- `js/mat-utils.js` reconnaît `lysseo.fr` et `xpfibre.com` ; `valdeloire-fibre.fr`,
  résidu de la v4.55 dans `URL_LABELS` et `KNOWN_DOMAINS`, disparaît.
- Deux tests de non-régression dans `test/guide-arrivee.test.js` côté backend
  verrouillent la mention « ne vend aucun abonnement », le mot « raccordable »,
  les pièces à joindre et la Base Adresse Nationale.

## Ce qu'on n'a pas fait

- **Annoncer un délai de raccordement.** Il dépend de l'opérateur commercial
  choisi et de l'état des fourreaux ; la mairie ne le maîtrise pas.
- **Fusionner l'arbre `mat-mel.js` / `mel-tree.json` en une source unique.**
  Le fallback embarqué existe pour que l'arbre fonctionne hors ligne et avant
  l'arrivée du JSON — voir ADR-0010 pour la même logique sur le guide
  d'arrivée. La divergence reste possible : elle est signalée en commentaire au
  point d'édition.

## Lien avec les autres décisions

- **ADR-0010** — contenu embarqué du guide d'arrivée (même arbitrage
  hors-ligne / source unique).
- La leçon générale — *une information juste dans un canal ne garantit rien pour
  les autres* — est la même que pour les associations et pour l'eau potable
  (C3M), corrigées en v4.55.
