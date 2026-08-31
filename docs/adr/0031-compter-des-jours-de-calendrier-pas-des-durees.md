# ADR-0031 — « Demain » se compte en jours de calendrier, pas en heures restantes

- **Date** : 31 août 2026
- **Statut** : Accepté
- **Concerne** : la carte « Prochaine manifestation » de l'accueil (`js/mat-widgets.js`,
  `loadEvents`) et son équivalent bureau (`js/mat-desktop.js`, `renderFeatured`).
- **Verrouillé par** : `tests/e2e/prochaine-manifestation.spec.js`.

## Contexte

Le 31 août 2026 à 7 h 28, la carte « Prochaine manifestation » de l'accueil affichait :

```
PROCHAINE MANIFESTATION
31 AOÛT
📣 CONSEIL MUNICIPAL
Demain
```

Le 31 août **était** le jour même. La carte affichait la bonne date juste au-dessus du
mauvais libellé — elle se contredisait en trois lignes.

Le calcul en cause :

```js
var diff = Math.ceil((first.start - new Date()) / (1000*60*60*24));
var diffTxt = diff <= 0 ? "Aujourd'hui" : diff === 1 ? 'Demain' : 'Dans ' + diff + ' j.';
```

Le conseil municipal commençait à 19 h. À 7 h 28, il restait 11 h 32, soit **0,48 jour**.
`Math.ceil` arrondit au-dessus : **1** → « Demain ».

## Le fond du problème

Ce quotient mesure une **durée**, et le libellé parle de **dates**. Les deux ne coïncident
que par accident :

- avec `Math.ceil`, tout événement du jour encore à venir devient « Demain » — d'autant
  plus sûrement qu'il est tard dans la journée (à 23 h 59, la durée frôle 24 h) ;
- avec `Math.floor`, on obtient la faute symétrique : un événement de demain 8 h, consulté
  ce soir à 22 h, est à 10 h de distance → 0 → « Aujourd'hui » ;
- avec `Math.round`, les deux fautes subsistent, simplement déplacées à midi.

Aucun arrondi ne rattrape le calcul, parce que l'information cherchée — *combien de
minuits séparent maintenant de cet événement* — n'est pas dans l'écart en millisecondes.

Le bureau, lui, disait juste : `daysUntil` (`js/mat-desktop.js`) ramenait déjà les deux
dates à minuit avant de soustraire. Le bug ne tenait donc pas à une ignorance, mais à
**deux implémentations divergentes** du même calcul, dont une seule était correcte. Le
porteur du projet consulte l'application sur son téléphone : c'est la mauvaise des deux
qu'il voyait.

## Décision

1. Un seul calcul, publié dans `js/mat-utils.js` — chargé par tout le monde :

   ```js
   function matDaysUntil(date){
     var b = (date instanceof Date) ? new Date(date.getTime()) : new Date(date);
     if (isNaN(b.getTime())) return NaN;
     var a = new Date();
     a.setHours(0, 0, 0, 0);
     b.setHours(0, 0, 0, 0);
     return Math.round((b - a) / 86400000);
   }
   ```

   `Math.round` n'est pas ici un arrondi de confort : les deux opérandes sont des minuits
   locaux, donc l'écart est un multiple exact de 24 h **sauf** aux changements d'heure, où
   la journée fait 23 h ou 25 h. `Math.round` absorbe ces deux cas ; `floor` perdrait un
   jour fin mars, `ceil` en ajouterait un fin octobre.

2. Un seul libellé, `matDaysLabel(jours, suffixe)`, pour que « Aujourd'hui » / « Demain » /
   « Dans N j. » ne soient pas réécrits à chaque appelant.

3. `daysUntil` de `mat-desktop.js` **délègue** à `matDaysUntil` et ne garde sa copie qu'en
   repli — la double implémentation est ce qui a permis à l'erreur d'exister.

## Conséquences

- ⛔ **Ne jamais écrire `(date - now) / 86400000` pour obtenir un nombre de jours.** Si le
  résultat sert à écrire « aujourd'hui », « demain » ou « dans N jours », il faut passer par
  `matDaysUntil`. La division brute reste légitime pour ce qu'elle mesure vraiment : une
  durée (délai d'expiration, ancienneté d'un cache).
- Le test `tests/e2e/prochaine-manifestation.spec.js` sert un agenda iCal fabriqué et
  vérifie les quatre cas qui piégeaient l'ancien calcul, dont l'événement du jour à 23 h 59.
  Il échoue sur l'ancien code, sur les deux projets Playwright.
- La carte reste calculée à l'ouverture de l'application : passé minuit sur une application
  laissée ouverte, le libellé vieillit. C'est le comportement de tout l'accueil (agenda,
  déchets, mairie) et il n'est pas modifié ici.
