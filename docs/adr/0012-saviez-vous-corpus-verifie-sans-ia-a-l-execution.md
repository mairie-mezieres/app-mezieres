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
allant du plus surprenant au plus aride : découvertes calculées, l'application
elle-même, la vie communale, l'environnement, le pratique, les transports, la
santé, les déchets, l'intercommunalité, l'habitat, les démarches, l'urbanisme.
Deux entrées de même catégorie ne peuvent pas se suivre tant qu'il reste de la
matière ailleurs. Le mélange par graine ne joue plus qu'**à l'intérieur** d'une
catégorie.

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
  dans la durée.
- Les entrées dépendant de sources externes (INSEE, IGN, patrimoine) n'ont pas
  pu être rédigées dans l'environnement de développement, dont la politique
  réseau bloque l'accès à ces sources. Elles demandent soit un accès réseau,
  soit des exports fournis par la mairie.
- Ni `SV_GRAINE` ni `SV_ORIGINE` ne doivent changer une fois la rubrique en
  service depuis un moment : l'ordre du corpus est un engagement implicite, et
  les modifier ferait rejouer des faits déjà vus tout en en sautant d'autres.
  Ces deux constantes ont été ajustées le jour même de la mise en service,
  quand personne n'avait vu plus d'une question — ce qui ne se représentera pas.

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
