# ADR-0010 — Guide d'arrivée : contenu embarqué, et liens plutôt que copies

- **Date** : 2 août 2026
- **Statut** : Accepté

## Contexte

Un habitant a proposé via la boîte à idées un guide d'arrivée pour les nouveaux habitants.
L'information nécessaire existait déjà, mais éclatée entre l'arbre de décision de MEL
(`data/mel-tree.json`), plusieurs overlays de l'app (déchets, élus, associations,
entreprises, bus) et le `SYSTEM_PROMPT` du backend (horaires de mairie, santé, transports,
CCTVL). Rien ne la rassemblait pour quelqu'un qui vient de poser ses cartons.

Trois façons d'héberger ce contenu étaient possibles :

1. **Module frontend statique**, sur le patron de `mat-plui.js` / `mat-associations.js`.
2. **Arbre de décision MEL** — clé Redis `mat:mel:tree:data`, déjà éditable par la mairie
   depuis l'onglet 👩‍💼 MEL du tableau de bord, avec un champ `directAnswer` + `links`.
3. **Nouvelle route backend dédiée** (`mat:guide:arrivee`) sur le patron de
   `routes/horaires.js`, plus une UI d'administration.

Les options 2 et 3 ont un vrai avantage : la mairie met à jour le contenu sans passer par
un développeur. Deux contraintes ont pourtant tranché autrement.

**Le hors-ligne.** C'est exactement la population visée qui n'a pas de connexion : on
emménage, la ligne internet n'est pas encore ouverte, la fibre est justement l'une des
démarches du guide. Un contenu servi par le backend est indisponible au moment précis où
il est le plus utile. Un module précaché par le service worker, non.

**Le quota Redis.** Le plan gratuit Upstash est limité à 10 000 commandes/jour (voir
ADR-0007). Un contenu qui ne change que quelques fois par an ne justifie ni une clé Redis,
ni une route, ni un cache mémoire, ni une entrée de plus au diagnostic Services.

## Décision

Le guide d'arrivée est un **module frontend statique**, `js/mat-guide-arrivee.js`, dont
tout le contenu tient dans la constante `GUIDE_ETAPES` en tête de fichier. Il est ajouté à
`PRECACHE_URLS` du service worker : consultable hors-ligne. **Aucune route, aucune clé
Redis, aucun appel réseau.**

Corollaire, tout aussi important : **le guide renvoie vers l'existant, il ne le recopie
pas.** Chaque item porte des liens, dont la forme `{ label, open:'openDechets' }` qui
appelle la fonction d'ouverture d'un autre écran de l'app. Les jours de collecte, la liste
des associations, le trombinoscope des élus, les horaires du bus restent la propriété de
leur écran d'origine. Le guide n'écrit en dur que ce qui n'existait nulle part :
changement d'adresse, compteurs eau/énergie, inscription scolaire, médecin traitant.

Le contenu recopié est celui qui divergera. La double source `lib/mel.js ASSOCIATIONS` ↔
`js/mat-associations.js` est déjà signalée dans les deux `CLAUDE.md` ; le jour de collecte
du bac jaune, lui, avait **effectivement** divergé — trois implémentations disaient mardi,
deux textes affichés disaient lundi. C'est précisément ce que ce guide aurait aggravé en
recopiant.

## Conséquences

**Positives :**
- Le guide fonctionne hors-ligne, pour la population qui en a le plus besoin.
- Aucun coût d'hébergement, aucune commande Redis, aucune surface d'API supplémentaire.
- Les liens internes garantissent que le guide ne peut pas dire autre chose que l'écran
  qui fait autorité : il n'a pas de version concurrente de l'information.
- Un habitant peut cocher ses démarches ; l'état vit dans `localStorage`, donc aucune
  donnée personnelle ne transite ni n'est stockée côté serveur — rien à déclarer au RGPD.

**Négatives / compromis acceptés :**
- **La mairie ne peut pas éditer le guide sans développeur.** C'est le vrai prix payé. Il
  est atténué par la structure : tout le contenu est dans un seul tableau commenté en tête
  de fichier, et modifier un numéro de téléphone ne demande pas de comprendre le rendu.
- Chaque mise à jour de contenu impose de bumper `CACHE` et le `?v=` du module — sinon les
  installations existantes gardent l'ancienne version.
- Le contenu propre au guide (changement d'adresse, compteurs…) est dupliqué avec les
  `DIRECT_RULES` du backend, qui répondent à la même question en langage naturel. C'est
  assumé : ce sont deux canaux différents pour deux usages différents. Les faits verrouillés
  par `test/guide-arrivee.test.js` côté backend servent de garde-fou.

## Mise à jour — 2 août 2026 : le contenu embarqué vieillit en silence

Deux liens du guide sont morts en production dès le premier jour :
`laposte.fr/reexpedition-courrier` (404) et `valdeloire-fibre.fr` (domaine inexistant).

Le workflow `liens-morts.yml` existait déjà mais ne scannait que les **fichiers HTML** —
or tout le contenu du guide vit dans `js/mat-guide-arrivee.js`. Le scan couvre désormais
`js/*.js`, et un workflow équivalent a été ajouté au dépôt backend pour les réponses de
MEL.

Ce point renforce le compromis accepté ci-dessus : du contenu embarqué **n'est pas
auto-vérifiant**. Il lui faut un filet automatique, sinon une adresse périmée reste
affichée aux habitants sans que personne ne s'en aperçoive.

Corollaire découvert au passage : le guide annonçait « Val de Loire Fibre » alors que
l'arbre de décision de MEL, validé par la mairie, désignait **Lysséo** depuis toujours.
Le guide avait recopié une information erronée d'une autre source au lieu de pointer
vers celle qui fait foi — exactement ce que la règle « lier plutôt que copier » vise à
empêcher.

**Points de vigilance pour les futures évolutions :**
- Si la mairie demande à éditer le guide elle-même, la bonne migration n'est **pas** une
  route dédiée mais l'arbre MEL, déjà administrable — au prix du hors-ligne, qu'il faudra
  alors compenser (mise en cache de la réponse dans le service worker).
- Avant d'ajouter un fait au guide, chercher s'il existe déjà un écran qui le porte : dans
  ce cas, ajouter un lien `open:` et non une phrase.
- Les `id` des items sont les clés de cochage dans `localStorage`. Les renommer décoche
  silencieusement la ligne chez tous les habitants qui l'avaient validée.
