# ADR-0032 — Un script injecté à la main ne peut pas tenir ses dépendances pour acquises

- **Date** : 31 août 2026
- **Statut** : Accepté
- **Origine** : Sentry `JAVASCRIPT-NEXTJS-C` → issue #425,
  `ReferenceError: isStandaloneMode is not defined at checkFirstStandaloneRun
  (/js/mat-pwa-notif.js:219)`.
- **Prolonge** : ADR-0019 (un fichier modifié sans nouveau `?v=` n'arrive jamais chez
  l'habitant) — même cause racine : le cache du service worker peut servir un lot de
  fichiers qui ne forment pas un ensemble cohérent.

## Contexte

`js/mat-pwa-notif.js` n'est pas déclaré dans `index.html` : il est **injecté** par
`js/mat-boot.js`.

```js
(function(){
  var s = document.createElement('script');
  s.src = 'js/mat-pwa-notif.js?v=4.2.8';
  document.head.appendChild(s);
})();
```

Il appelait `isStandaloneMode()`, une fonction déclarée dans `js/mat-core.js`, un **autre**
fichier, chargé par une balise `<script defer>` d'`index.html`. Sur le papier l'ordre est
garanti : les scripts `defer` s'exécutent dans l'ordre du document, `mat-boot.js` est le
dernier, donc `mat-core.js` est déjà passé quand l'injection a lieu.

Sur le papier seulement. Le lien tient tant que **les deux fichiers arrivent**. Il suffit
que `js/mat-core.js?v=…` manque à l'appel — entrée absente du cache après une mise à jour
partielle, requête coupée sur ce seul `.js`, réseau qui lâche entre deux fichiers — pour
que `mat-boot.js`, lui servi depuis le cache, injecte un script dont la dépendance n'existe
pas. `index.html` n'étant pas versionné, rien n'empêche cette combinaison d'exister chez un
habitant.

## Ce que le plantage coûtait

`checkFirstStandaloneRun` échouait sur sa **première ligne**. Tout ce qui suit n'était donc
jamais atteint :

| Ce qui ne se faisait plus | Effet visible |
|---|---|
| `localStorage.setItem(INSTALL_KEY, '1')` | La bannière « Installer l'application » revenait chez quelqu'un qui l'avait déjà installée |
| `trackInstallOnce({ method: 'standalone' })` | L'appareil n'était pas compté — le badge « 431 Macérien(ne)s ont installé MAT » sous-comptait |
| `showPostInstallNotifPrompt()` | L'habitant n'était **jamais** invité à activer les alertes : ni actualités, ni vigilance météo, ni rappel de collecte |

Trois fonctions perdues pour un `if`. Et rien ne le signalait à l'écran : l'application
s'affichait normalement, seule Sentry voyait l'erreur.

## Décision

1. **Le repli est du côté de celui qui appelle.** `mat-pwa-notif.js` teste l'existence de
   la fonction et, à défaut, refait le test lui-même :

   ```js
   function _isStandaloneModeSafe() {
     try { if (typeof isStandaloneMode === 'function') return isStandaloneMode(); } catch (e) {}
     try {
       return window.matchMedia('(display-mode: standalone)').matches
           || window.navigator.standalone === true;
     } catch (e) { return false; }
   }
   ```

   `typeof` sur un identifiant non déclaré ne lève pas — c'est la seule façon de tester une
   dépendance absente sans provoquer soi-même le `ReferenceError`.

2. `mat-core.js` publie explicitement `window.isStandaloneMode = isStandaloneMode;`. Une
   déclaration de fonction de premier niveau est déjà globale ; l'affectation dit qu'il
   s'agit d'un point d'entrée **attendu par un autre fichier**, et pas d'un détail interne
   qu'on peut renommer sans regarder ailleurs.

## Conséquences

- ⛔ **Tout fichier injecté par `mat-boot.js`** (`mat-pwa-notif.js`, `mat-dechets-notif.js`,
  `mat-jours-feries.js`, `mat-sondages.js`, `mat-carte3d.js`, `mat-saviez-vous.js`,
  `mat-plui.js`…) doit se comporter comme du code chargé dans un contexte inconnu :
  `typeof f === 'function'` avant tout appel à une fonction d'un autre fichier, ou repli
  local. Le reste de ces fichiers utilise déjà largement ce garde-fou — c'est ici qu'il
  manquait, sur la ligne la plus précoce.
- ⛔ **Ne pas placer un appel à une dépendance externe dans un garde de sortie anticipée**
  (`if (!f()) return;`) sans repli : c'est l'endroit où un plantage emporte le plus de code
  d'un coup.
- Les tests E2E ne peuvent pas voir cette classe de bug *spontanément* : Playwright bloque
  le service worker (ADR-0006) et charge donc toujours un lot cohérent. Ils peuvent en
  revanche la **simuler** — voir la deuxième occurrence ci-dessous. La détection en
  production, elle, reste Sentry.

## Deuxième occurrence — 15 septembre 2026 (issue #455)

`ReferenceError: updateAppBadge is not defined`, dans `updateActuBadge`
(`js/mat-actus.js`) appelé par `refreshActusBadge`. Même mécanisme, mais **hors des
fichiers injectés** : `mat-actus.js` est un script `defer` ordinaire, chargé par
`index.html` **après** `mat-accessibility.js` qui définit `updateAppBadge`. L'ordre est
correct ; c'est le cache partiel qui ne l'est pas. La règle vaut donc pour **tout** appel
d'une fonction définie dans un autre fichier, injecté ou non.

Deux enseignements nouveaux, et ce sont eux qui ont rendu la panne muette pendant des
semaines :

1. ⛔ **Un `try/catch` synchrone autour d'un appel `async` ne protège rien.**
   `refreshActusBadge` est `async` ; ses quatre appelants l'enveloppent tous dans
   `try{ refreshActusBadge(); }catch(e){}` (`mat-boot.js`, `mat-core.js`, `mat-forms.js`).
   Une exception levée à l'intérieur ne remonte pas au `catch` : elle devient un **rejet
   de promesse**. Le garde-fou existait sur le papier, était visible en revue, et
   n'attrapait rien. Pour protéger un appel `async`, il faut `.catch()` sur la promesse —
   ou, mieux, ne pas laisser l'exception se produire.

2. ⛔ **La panne s'arrête à la ligne qui lève, et le reste ne se voit pas manquer.**
   `updateActuBadge` pose le badge rouge **avant** l'appel fautif, et
   `renderNotifIdeasCallout` — l'encart « 💡 Boîte à idées » — vient **après** dans
   `refreshActusBadge`. L'écran Notifications gardait donc l'air parfaitement normal :
   badge correct, encart absent. Personne ne remarque une absence.

**Ce qui a été fait** : la garde `typeof` sur l'appel, et un test E2E qui **simule** le
cache partiel — `tests/e2e/badge-actus-degrade.spec.js`. ⚠️ Deux pièges de ce test, à
connaître avant d'en écrire un semblable :

- `delete window.updateAppBadge` **ne supprime rien** : une `function` déclarée au premier
  niveau d'un script classique pose une propriété globale **non configurable**, et le
  `delete` échoue en silence. Il faut l'**écraser** (`window.updateAppBadge = undefined`).
  Sans l'auto-contrôle (« la fonction devait être retirée »), le test aurait été vert
  tout en ne reproduisant rien — exactement le piège de l'ADR-0030.
- L'encart se greffe sur `#actu-list`, qui vit dans un écran à **montage paresseux** : sans
  `openNotifs()` préalable, la boîte n'existe pas et l'assertion ne mesure rien.
