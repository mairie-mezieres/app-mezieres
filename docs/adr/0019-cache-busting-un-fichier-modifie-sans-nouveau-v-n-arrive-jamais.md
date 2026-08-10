# ADR-0019 — Un fichier modifié sans nouveau `?v=` n'arrive jamais chez l'habitant

- **Date** : 10 août 2026
- **Statut** : Accepté

## Contexte

Les versions 4.64 à 4.66 ont livré la carte 3D, puis deux correctifs : le
découpage du zonage sur le contour communal et le bouton « Où suis-je ».

Tout était fusionné, testé, déployé. **Et rien n'arrivait chez l'habitant.**
Sur son téléphone : le bouton « Où suis-je » s'affichait mais ne répondait pas,
et le zonage continuait de déborder sur les communes voisines.

### Le mécanisme

Le service worker sert les ressources en **stale-while-revalidate** : la copie
en cache part immédiatement, la version réseau n'arrive qu'ensuite et ne servira
qu'au lancement suivant. C'est délibéré, et c'est ce qui rend l'application
instantanée. La contrepartie est que **le seul signal de fraîcheur est l'URL**,
donc la chaîne `?v=` — le commentaire de `service-worker.js` le dit déjà :

> Les assets JS/CSS étant versionnés (`?v=`), un changement = nouvelle URL =
> cache miss = re-téléchargement → aucun risque de servir du périmé pour eux.

La prémisse « un changement = nouvelle URL » n'était pas tenue.
`js/mat-boot.js` a été modifié **trois fois** (v4.64, v4.66) en restant servi
sous `?v=4.4.1`. Le navigateur recevait donc l'ancien `mat-boot.js`, lequel
demandait l'ancien `mat-carte3d.js?v=1.0.0`.

### Pourquoi c'était invisible

Trois raisons se sont additionnées, et c'est leur combinaison qui rend le bug
pernicieux :

1. **`index.html` n'est pas versionné.** Il arrivait à jour, avec le bouton
   « Où suis-je » dans le DOM. L'interface paraissait donc neuve — seul le code
   derrière était ancien.
2. **Les tests ne pouvaient rien voir.** Playwright part d'un profil vierge et
   le service worker est explicitement bloqué pendant les tests (ADR-0006). Le
   scénario « cache d'un habitant qui a déjà l'application » n'existe dans aucun
   test, par construction.
3. **Le déploiement était correct.** Le fichier servi par GitHub Pages était le
   bon ; c'est le navigateur qui, à juste titre, ne le demandait pas.

C'est la même famille que l'accolade orpheline d'ADR-0015 : un mécanisme qui
échoue **silencieusement**, en laissant tous les voyants au vert.

## Décision

### 1. Le contrôle est automatisé, pas confié à la vigilance

`scripts/check-cache-bust.js`, branché sur le job `syntax-check` de `ci.yml`,
vérifie deux invariants :

1. **Cohérence** — un même fichier porte le même `?v=` dans `index.html`,
   `js/mat-boot.js` et `service-worker.js`. Une divergence ferait cacher deux
   copies de la même ressource.
2. **Fraîcheur** — tout fichier de `js/` ou `css/` modifié par rapport à la
   branche de base doit voir son `?v=` modifié **dans le même lot**.

Le second invariant est celui qui aurait arrêté ce bug. Il exige l'historique
git : `actions/checkout` est donc configuré en `fetch-depth: 0`. Sans lui, le
contrôle s'ignore **silencieusement** — ce qui serait la même faute que celle
qu'il corrige, d'où l'annonce explicite dans sa sortie.

### 2. La règle est écrite là où on la lit

`CLAUDE.md` mentionnait déjà le bump du `CACHE` du service worker. Il ne disait
rien du `?v=` de chaque module. La règle y est ajoutée : **modifier
`js/xxx.js`, c'est incrémenter son `?v=` aux trois endroits**.

## Alternatives écartées

- **Supprimer les `?v=` et se fier au `CACHE`** — le bump de `CACHE` vide bien
  l'ancien cache, mais seulement à l'activation du nouveau service worker, qui
  n'a lieu qu'après un chargement complet. Les ressources versionnées sont plus
  fines et plus sûres ; c'est le `?v=` qui manquait de discipline, pas le principe.
- **Un hash de contenu calculé à la construction** — il n'y a aucune étape de
  construction dans ce projet, et en introduire une pour cela coûterait bien
  plus que ce script.
- **Passer le service worker en network-first pour le JS** — on perdrait
  l'affichage instantané et le fonctionnement hors connexion, pour corriger une
  discipline défaillante. Le remède serait pire.
- **S'en remettre à la relecture** — c'est ce qui était en place. Trois versions
  successives ont laissé passer la même omission.

## Conséquences

**Positives** : un correctif fusionné atteint réellement les habitants ; la CI
refuse une modification qui ne serait jamais distribuée ; le script énonce en
clair le geste à faire.

**Négatives** : `fetch-depth: 0` allonge un peu le `checkout` en CI ; le contrôle
peut demander un bump pour une modification purement cosmétique (un commentaire),
ce qui est un faux positif acceptable — bumper ne coûte rien, ne pas bumper coûte
une version invisible.

**À surveiller** : le contrôle ne couvre que `js/`, `css/` et `data/` référencés
avec `?v=`. Les images et les polices ne sont pas versionnées ; elles changent
rarement, et le bump de `CACHE` les rattrape à l'activation suivante.
