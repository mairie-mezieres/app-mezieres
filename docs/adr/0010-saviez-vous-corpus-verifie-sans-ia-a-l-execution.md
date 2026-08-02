# ADR-0010 — « Le saviez-vous ? » : corpus vérifié, aucune IA à l'exécution

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

**La rotation est déterministe** : quantième du jour modulo la taille du corpus,
sur un ordre mélangé une fois avec une graine fixe (`SV_GRAINE`). Tout le
village voit le même fait le même jour.

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
- La graine `SV_GRAINE` ne doit **jamais** changer : l'ordre du corpus est un
  engagement implicite. La modifier ferait rejouer des faits déjà vus et en
  sauterait d'autres.

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
