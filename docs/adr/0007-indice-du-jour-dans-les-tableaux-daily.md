# ADR-0007 — `daily[0]` est HIER : résoudre l'indice du jour, ancré sur Paris

- **Date** : 29 juillet 2026
- **Statut** : Accepté

## Contexte

Le backend interroge Open-Meteo avec **`past_days=1`**
(`chatbot-mairie-mezieres/lib/meteo.js`). Les tableaux `daily` renvoyés au frontend
commencent donc **la veille** : `daily[0]` = hier, `daily[1]` = aujourd'hui.

Cette subtilité n'était écrite nulle part. Elle ne survivait que dans une convention
implicite de `js/mat-widgets.js` : la liste des prévisions démarrait sa boucle à
`i = 1` et étiquetait cet indice « Auj. ». Tout code lisant `daily[0]` en croyant lire
aujourd'hui était donc silencieusement décalé d'un jour.

Trois lectures fautives coexistaient :

1. **`_ambDayPhase()`** (`js/mat-ambiance.js`, introduit en v4.44) comparait l'heure
   courante au **coucher de soleil de la veille**. `now > coucher` étant vrai dès
   minuit, la phase valait **« nuit » 24 h/24** : étoiles affichées en plein jour
   (signalé par un habitant à 9 h 30), halo de soleil impossible à déclencher, teintes
   d'aube et de crépuscule jamais atteintes. Un pan entier de la fonctionnalité était
   mort en production sans que rien ne le signale.
2. **`meteoBuildSunBlock()`** affichait les heures de lever/coucher de la veille
   (écart de 1-2 min en été, ~4 min aux équinoxes — invisible à l'œil, donc jamais
   remonté).
3. **`rafaleMax24`** affichait la rafale maximale de la veille.

Second piège, indépendant : Open-Meteo renvoie des heures **locales sans indicateur de
fuseau** (`2026-07-29T06:32`). `Date.parse` les interprète dans le fuseau de
l'appareil — correct pour un habitant en France, faux pour quelqu'un en voyage.

## Décision

1. **Ne jamais indexer `daily` en dur.** Un helper `meteoTodayIndex(daily, nowDate)`
   (`js/mat-widgets.js`) cherche la date du jour dans `daily.time` et renvoie son
   indice, ou `-1`. Le code reste juste si le backend change un jour `past_days`.
2. **Ancrer tous les calculs d'heure sur Europe/Paris**, jamais sur le fuseau de
   l'appareil : `meteoParisDateKey()` pour la date, `meteoParisNowMinutes()` pour
   l'heure courante, `meteoIsoToMinutes()` pour les heures d'Open-Meteo. On compare
   des minutes-depuis-minuit des deux côtés.
3. **Distinguer « indéterminé » de « plein jour ».** `_ambDayPhase()` renvoie
   `'day'` pour le plein jour et `''` quand la donnée manque (`indice -1`, réponse
   partielle). Sans donnée fiable, on n'affiche ni soleil ni étoiles plutôt que de
   risquer l'effet inverse de la réalité.

## Conséquences

**Positives :**
- Cycle jour/nuit correct : soleil, aube, crépuscule et nuit se déclenchent enfin.
- Lever/coucher et rafale max affichent le bon jour.
- Robuste au fuseau de l'appareil et à un changement de `past_days` côté backend.
- Le décalage `past_days=1` est désormais **documenté** (ici, dans le guide technique
  §7, et en commentaire aux points d'usage) au lieu de survivre comme convention orale.

**Négatives / compromis acceptés :**
- Un appel `Intl.DateTimeFormat` supplémentaire par évaluation (négligeable, et
  l'ambiance n'est ré-évaluée que toutes les 10 min).
- Si `daily.time` est absent, l'ambiance de ciel dégagé ne s'affiche pas du tout —
  choix assumé : mieux vaut rien qu'un effet faux.

**Points de vigilance pour les futures évolutions :**
- Tout nouvel accès à `daily[...]` doit passer par `meteoTodayIndex()`.
- **Les jeux de test doivent reproduire la vraie forme de la réponse**, avec hier en
  indice 0 et des heures distinctes entre les deux jours. Le bug avait échappé aux
  vérifications visuelles initiales précisément parce qu'elles injectaient un `daily`
  d'un seul élément valant aujourd'hui : elles validaient l'erreur. Voir
  `tests/e2e/ambiance.spec.js`, qui échoue sur 8 de ses 12 cas si l'on rétablit
  l'ancienne logique.
- Fixer une horloge de test en heure de Paris explicite (`+02:00` / `+01:00`) : la CI
  tourne en UTC, et « 23h30 » y devient 01h30 à Paris.
