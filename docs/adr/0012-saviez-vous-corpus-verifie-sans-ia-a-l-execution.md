# ADR-0012 — « Le saviez-vous ? » : corpus vérifié, aucune IA à l'exécution

- **Date** : 2 août 2026
- **Statut** : Accepté

## Contexte

L'application affiche désormais un fait sur la commune chaque jour. La tentation
immédiate était de le faire écrire par MEL : le modèle est déjà branché, il
saurait produire 365 anecdotes en quelques minutes, et le corpus n'aurait
demandé aucun travail de rédaction.

C'est précisément ce qu'il ne fallait pas faire.

Un fait affiché par la mairie sur son application officielle est **cru**. Il ne
se présente pas comme une opinion ni comme une réponse d'assistant : il se
présente comme un renseignement communal. Une seule date fausse, un seul chiffre
inventé, et c'est la crédibilité de l'ensemble de l'application qui est atteinte
— y compris pour les informations qui, elles, sont justes.

Le projet a déjà tranché ce type d'arbitrage deux fois :

- la liste `ASSOCIATIONS` est une **constante en dur** dans `lib/mel.js`,
  précisément pour que MEL ne puisse pas inventer d'association ;
- l'**ADR-0003** a rendu les conseils santé **déterministes par seuil** plutôt
  que générés.

S'y ajoutent trois contraintes pratiques : le quota de MEL est de 5 questions
par jour et par appareil, chaque appel coûte de l'argent, et un fait généré à la
volée serait **différent d'un habitant à l'autre** — ce qui tue l'effet
recherché, celui d'un rendez-vous quotidien dont on parle au boulanger.

## Décision

**Aucune IA n'écrit le fait affiché.** Le contenu provient exclusivement de deux
sources, et jamais d'un appel à un modèle au moment de l'affichage :

1. `data/saviez-vous.json` — corpus versionné dans le dépôt, précaché par le
   service worker. **Chaque entrée porte une source et une URL, affichées à
   l'écran sous la réponse.** Une entrée sans source ne part pas : le test
   d'intégrité de `tests/e2e/saviez-vous.spec.js` la rejette.
2. Les générateurs `SV_CALCULES` de `js/mat-saviez-vous.js` — de l'arithmétique
   pure (distances orthodromiques depuis les coordonnées de la commune, jours
   fériés). Là, le calcul **est** la preuve : il n'y a rien à croire.

Un LLM peut aider à **rédiger** le corpus en amont. Chaque entrée est alors
vérifiée contre la source citée et validée par la mairie avant le merge. La
différence n'est pas cosmétique : dans un cas la machine publie, dans l'autre un
humain signe.

**Nous n'affichons jamais une affirmation fausse.** Le format l'interdit par
construction : l'entrée pose une **question**, et seule la révélation porte du
contenu factuel. Un vrai/faux classique afficherait la contre-vérité à l'écran,
où elle serait lue et parfois mémorisée par qui ne fait pas défiler jusqu'à la
réponse. Ici, c'est structurellement impossible.

**La rotation est déterministe** : nombre de jours écoulés depuis la mise en
service (`SV_ORIGINE`) modulo la taille du corpus. Tout le village voit le même
fait le même jour.

**L'ordre est éditorial, pas aléatoire.** Un mélange aveugle a été essayé puis
abandonné : avec 18 entrées d'urbanisme sur 75, une question sur quatre portait
sur les règles de construction, et elles tombaient dès les premiers jours. « Faut-il
une déclaration pour une fenêtre de toit » est une information utile mais une
mauvaise entrée en matière — la rubrique doit donner envie d'être ouverte.

`_ordonner()` fait donc tourner les catégories à tour de rôle, dans un ordre
allant du plus surprenant au plus aride : découvertes calculées, l'histoire de la
commune, l'application elle-même, le patrimoine, la vie communale,
l'environnement, le pratique, les transports, la santé, les déchets,
l'intercommunalité, l'habitat, les démarches, l'urbanisme.
Deux entrées de même catégorie ne peuvent pas se suivre tant qu'il reste de la
matière ailleurs. À l'intérieur d'une catégorie, l'ordre est celui de **déclaration du corpus**.
Un mélange y avait été essayé puis retiré : il plaçait au premier jour une question
sur les jours fériés en France, alors que la rubrique porte sur la commune.
L'ouverture d'un rendez-vous quotidien ne se joue pas aux dés — et un ordre
explicite est aussi ce qui permet à la mairie de relire le corpus en sachant ce qui
passera quand.

Le compte depuis une origine, et non depuis le 1er janvier, n'est pas un détail :
avec un quantième d'année, le premier jour affiché aurait été la 213e entrée du
cycle — soit sa fin, là où les catégories les plus fournies se retrouvent seules.
L'ordre éditorial n'aurait alors servi à rien. Effet de bord bienvenu : le passage
d'une année à l'autre ne provoque plus de saut.

## Conséquences

**Positives :**

- Aucun risque d'hallucination sur un contenu que l'habitant croit sur parole.
- La source affichée est elle-même le dispositif de vérification : l'habitant
  peut contrôler, et la mairie peut être challengée sur pièce.
- Fonctionne hors ligne, gratuitement, et sans consommer le quota de MEL.
- Le fait du jour est le même pour tout le monde — condition nécessaire pour
  qu'il devienne un sujet de conversation.
- Le test d'intégrité rend la règle opposable : elle ne dépend pas de la
  vigilance du relecteur.

**Négatives / compromis acceptés :**

- **Le corpus doit être écrit à la main.** C'est le coût réel de cette décision,
  et il est assumé. À la livraison initiale, 46 entrées sourcées et 7 calculées,
  soit moins de deux mois avant répétition — l'objectif de 365 se construira
  dans la durée. Deuxième passe (août 2026) : 172 sourcées et 12 calculées, soit
  six mois.
- Les entrées dépendant de sources externes (INSEE, IGN, patrimoine) n'ont pas
  pu être rédigées dans l'environnement de développement, dont la politique
  réseau bloque l'accès à ces sources. Elles demandent soit un accès réseau,
  soit des exports fournis par la mairie.
- Ni `SV_GRAINE` ni `SV_ORIGINE` ne doivent changer une fois la rubrique en
  service depuis un moment : l'ordre du corpus est un engagement implicite, et
  les modifier ferait rejouer des faits déjà vus tout en en sautant d'autres.
  Ces deux constantes ont été ajustées le jour même de la mise en service,
  quand personne n'avait vu plus d'une question — ce qui ne se représentera pas.

**Ce que la mise en service a appris, le jour même :**

Deux erreurs factuelles sont passées en production et ont été relevées par la mairie
quelques heures après le déploiement.

- « Existe-t-il une crèche à Mézières ? → Oui » : **faux**. La crèche est dans une
  commune voisine, dont Mézières est partenaire.
- « Peut-on faire une procuration entièrement en ligne ? → Non » : **faux depuis
  France Identité**, qui permet la vérification d'identité à distance.

Leurs origines diffèrent, et c'est l'enseignement principal :

1. **La crèche était fausse en amont**, dans la base de connaissances de MEL
   (`lib/mel.js`). Le corpus a hérité de l'erreur, et MEL la racontait déjà aux
   habitants. Traiter cette base comme une source vérifiée était une facilité :
   elle est validée par la mairie sur le fond, mais elle vieillit et n'avait jamais
   été relue ligne à ligne. **Une entrée qui en provient doit citer la mairie comme
   source — ce qui vaut demande de relecture, pas certificat de conformité.**
2. **La procuration était une erreur de transcription.** La réponse de MEL mentionne
   bien France Identité ; elle a été perdue en réécrivant l'entrée sous forme de
   question. Reformuler, c'est réintroduire du risque.

**Et surtout : la relecture par la mairie était prévue *avant* le merge. Elle n'a pas
eu lieu.** L'ADR posait la règle, le processus ne l'a pas appliquée — les entrées ont
été livrées puis relues. La page de revue générée pour la mairie (liste complète,
question, réponse, source, ordre de passage) doit être soumise **avant** la fusion,
pas après. Une règle qu'aucune étape n'impose n'est qu'une intention.

**Ce que la deuxième passe a appris (août 2026) :**

L'objectif fixé était de passer à environ 250 entrées en s'appuyant sur l'INSEE
(recensements de la commune depuis 1793), l'IGN (Cassini, état-major, vues
aériennes 1950-1965), la base POP/Mérimée, Hub'Eau, VigiEau, Vigicrues et
Wikipédia. **Aucune de ces sources n'était joignable** : la politique d'egress de
l'environnement de développement répond 403 au CONNECT vers ces hôtes — vérifié
un par un, y compris `geo.api.gouv.fr`, `service-public.fr` et `legifrance.gouv.fr`.
Seul GitHub passe.

La règle a tranché toute seule : **une source qu'on ne peut pas ouvrir ne produit
pas d'entrée.** Le corpus s'est donc étendu à partir des seules sources
consultables depuis le dépôt — règlement du PLU (`data/plu-data.json`), arbre de
décision de MEL (`data/mel-tree.json`), trombinoscope, guide d'arrivée, annuaires
des associations et des entreprises, documentation de MAT. 77 entrées, et non 175.

Deux enseignements :

1. **L'écart entre l'objectif et le livrable est une donnée, pas un échec à
   masquer.** Atteindre 250 aurait supposé d'écrire des chiffres de mémoire —
   exactement ce que cet ADR interdit, et exactement ce qui a produit l'erreur sur
   la crèche. Le volume est négociable, la vérification ne l'est pas.
2. **Le dépôt est une source sous-exploitée, mais ce n'est pas une source
   certifiée.** Le règlement du PLU et l'arbre de décision de MEL sont validés par
   la mairie sur le fond ; ils vieillissent. Toute entrée qui en provient cite la
   mairie et vaut demande de relecture.

Deux divergences de double source ont été relevées au passage et **volontairement
exclues** du corpus, faute d'arbitrage : le rang des deux premiers adjoints (déjà
signalé plus bas), et la liste des mairies équipées d'une station biométrique la
plus proche — `lib/mel.js` disait Saint-Hilaire-Saint-Mesmin / Cléry-Saint-André /
Orléans, `data/mel-tree.json` dit Meung-sur-Loire / Ardon / Orléans.

**La seconde a été tranchée par la mairie dès la relecture : `mel-tree.json` fait
foi**, parce que c'est le document qu'elle édite elle-même. `lib/mel.js` a été
aligné dessus, pour la CNI comme pour le passeport. La leçon est la même qu'en
août pour la crèche : la divergence n'a pas été inventée par le corpus, elle
dormait dans la base depuis longtemps — écrire des questions dessus est ce qui l'a
rendue visible. **Le corpus est devenu, incidemment, un révélateur de double
source.**

### La relecture a bien eu lieu, et elle a servi

Contrairement à la mise en service, la mairie a relu **avant** la fusion, sur la
page de revue. Trois erreurs en sont sorties, dont deux qui vivaient ailleurs que
dans le corpus :

1. **L'eau potable relève du C3M**, syndicat intercommunal d'eau et
   d'assainissement dont le siège est à Mézières même (36 rue du Bourg), et non de
   la Communauté de communes. L'erreur était dans le corpus, dans
   `js/mat-guide-arrivee.js`, **et** dans la règle `energie_eau_compteurs` de
   `lib/mel.js` : MEL la racontait aux habitants. Les trois sont corrigés.
2. **Les mairies à station biométrique** — voir ci-dessus.
3. **L'inscription en déchèterie se fait par immatriculation** : une inscription
   vaut pour tous les sites, mais chaque véhicule doit être enregistré. Nuance
   absente de la formulation initiale.

Aucune de ces trois erreurs n'aurait été rattrapée par le test d'intégrité : elles
sont toutes correctement sourcées et bien formées. **Le test garantit la forme, la
relecture garantit le fond — l'un ne remplace pas l'autre.**

Un point reste ouvert et n'a volontairement pas été tranché ici : le C3M s'intitule
« Syndicat Intercommunal d'Eau **et d'Assainissement** », alors que `mel-tree.json`
attribue l'assainissement collectif et le SPANC à la CCTVL depuis 2018. Le corpus
n'affirme rien sur ce point. À clarifier par la mairie.

### Ce que la mairie a débloqué en fournissant des sources

Le plafond de la première passe n'était pas la rédaction, c'était l'accès. La
mairie l'a levé en **transmettant elle-même les documents** : le texte de la page
Wikipédia de la commune et le bulletin 2026 du C3M. D'un coup, l'histoire du
village (le décret de 1918, les recensements depuis 1793, le tumulus de la Butte
des élus, Marlon Brando) et la qualité de l'eau sont devenues rédigeables.

C'est le mode opératoire à retenir tant que la politique réseau ne s'ouvre pas :
**le corpus s'enrichit de documents transmis, pas de données devinées.** Un bulletin
municipal, un compte rendu de conseil, une plaquette de syndicat valent mieux qu'un
accès API — ils sont déjà relus.

**La relecture avant fusion est enfin outillée.** L'ADR posait la règle depuis le
premier jour ; rien ne la rendait praticable — personne ne relit un JSON de 1 300
lignes en devinant l'ordre de passage. `revue-saviez-vous.html` affiche le corpus
complet dans l'ordre réel, avec la date à laquelle chaque question tombera, sa
réponse et sa source. Elle **n'implémente pas** l'ordonnancement : elle appelle
`window.matSaviezVousInventaire()`, c'est-à-dire le module que voient les
habitants. Une seconde implémentation aurait divergé, et la revue aurait fini par
certifier autre chose que ce qui est affiché — la classe de bug que le dépôt
connaît déjà pour la liste des associations et pour l'opérateur fibre.

**Points de vigilance pour les futures évolutions :**

- Ajouter une entrée sans source fera **échouer la CI**. C'est voulu.
- Si un écran d'administration permet un jour à la mairie d'ajouter des entrées,
  le champ source doit y être **obligatoire côté serveur**, pas seulement côté
  formulaire.
- Ne pas céder à la tentation de « laisser MEL compléter le corpus quand il est
  épuisé ». Mieux vaut répéter un fait vrai que d'en inventer un nouveau.
- Une incohérence de données a été relevée pendant ce travail et volontairement
  exclue du corpus : `lib/mel.js` (backend) donne Sandra BARET comme 1ʳᵉ
  adjointe et Damien BOUGRÉ comme 2ᵉ, tandis que `js/mat-trombi.js` (frontend)
  affirme l'inverse. C'est exactement le risque de double source que le
  `CLAUDE.md` du backend signale déjà pour les associations. À trancher par la
  mairie, puis à aligner des deux côtés.
