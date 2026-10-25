# ADR-0055 — Une regex moderne fait tomber tout le fichier

- **Statut** : accepté
- **Date** : 24 octobre 2026
- **Contexte** : issues #500 et #501 (Sentry, 24 octobre 2026)

## Constat

Sentry remonte, à deux secondes d'intervalle et sur un moteur WebKit :

- `ReferenceError: Can't find variable: matAbortTimeout` (`js/mat-boot.js`)
- `ReferenceError: Can't find variable: trackAppOpenOncePerDay` (`js/mat-core.js`)

Les deux fonctions sont définies dans `js/mat-utils.js`. Le fichier n'avait donc
pas été chargé du tout.

Il contenait deux expressions régulières **littérales** avec une assertion
« regard en arrière » (lookbehind) : le lien `www.…` et le numéro de téléphone de
`formatMelText`. Safari ne connaît cette syntaxe qu'**à partir de la version 16.4**.
Avant, c'est une erreur de **syntaxe** : le navigateur refuse le fichier entier, et
toutes ses fonctions manquent aux autres scripts.

`js/mat-mel.js` avait le même défaut, sous deux formes :

- un `new RegExp(...)` de **niveau module** (`_MEL_LIEN`), qui arrête le script à
  cette ligne ;
- une expression littérale dans `_renderDirectAnswer`, qui fait refuser le fichier.

Résultat sur ces appareils : MEL absente, comptage d'ouverture et réglages
d'accueil en panne.

## Pourquoi personne ne l'a vu

- `node --check` accepte cette syntaxe : Node la connaît depuis des années.
- Playwright lance un Chromium récent.
- La panne ne touche que les iPhone et iPad restés sous iOS < 16.4, et rien ne
  s'affiche : il manque seulement des fonctions.

## Décision

1. **Aucune assertion « regard en arrière » dans le code servi** (`js/`, `jeu/`,
   `jeux/`, `*.html`, `service-worker.js`), y compris dans une chaîne passée à
   `new RegExp`.
2. Le caractère qui précède se teste dans la **fonction de remplacement**, grâce à
   l'argument `offset`. Si ce caractère est interdit, on renvoie la correspondance
   telle quelle. Le comportement est identique à l'ancien : les deux versions ont
   été comparées sur le même jeu d'entrées (liens, courriels, numéros, chemins).
3. Le contrôle est fait par `node scripts/check-regex-compat.js`, lancé par la CI.
   Il est volontairement grossier : la séquence est refusée **même en commentaire**,
   et en parler en toutes lettres suffit.

## Conséquences

- Écrire `(x, _groupe, off, str) => { if (off > 0 && /…/.test(str[off - 1])) return x; … }`
  plutôt qu'une assertion.
- Pour les autres syntaxes récentes, la même question se pose : une erreur de
  syntaxe ne coûte pas une fonction, elle coûte **le fichier**.
