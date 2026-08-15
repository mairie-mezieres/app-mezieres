# ADR-0024 — Normales saisonnières : une réanalyse, annoncée comme telle

- **Date** : 15 août 2026
- **Statut** : Accepté
- **Amende** : ADR-0022 (« pas d'écart aux normales tant qu'aucune source ne le porte »),
  dont la condition de reprise est ici remplie — mais pas à la lettre : voir §2.

## Contexte

La v4.78 a supprimé l'écart aux normales de la fenêtre météo. Il s'appuyait sur deux
tableaux mensuels codés en dur (`NORM_MAX` / `NORM_MIN`), sans station de référence ni
période citée : une donnée inventée au sens de l'**ADR-0018**, sur un sujet où l'habitant
n'a aucun moyen de vérifier. L'ADR-0022 laissait la porte ouverte : « reprise possible le
jour où le backend servira des normales sourcées (station et période citées) ».

Trois contraintes commandent la reprise :

1. **Le token Météo-France du backend est abonné à la vigilance, pas à la climatologie.**
   Ce sont deux souscriptions distinctes sur le portail. Les normales officielles d'une
   station (Orléans-Bricy) sont donc hors d'atteinte tant que la mairie n'a pas souscrit.
2. La question posée par l'habitant devant sa fenêtre est simple — « fait-il plus chaud
   que d'habitude ? » — et l'application avait la moitié de la réponse sans la donner.
3. L'ancien calcul était **faux dans sa forme même**, indépendamment de la source : il
   comparait la température de l'instant à une moyenne mensuelle de **maximales**.

## Décision

### 1. La source est la réanalyse ERA5, servie par l'archive Open-Meteo

`lib/normales.js` (dépôt backend) calcule les normales **1991-2020** à partir des
températures quotidiennes ERA5 (ECMWF) aux coordonnées de la commune. Le jeu de données
est **épinglé** (`models=era5`) : l'étiquette affichée dit « ERA5 », elle doit rester vraie
même si le défaut d'Open-Meteo (`best_match`) change un jour.

C'est le même fournisseur et la même licence (CC BY 4.0) que les prévisions déjà
affichées : l'attribution du pied de fenêtre les couvre, et le mentionne — « Prévisions
**et normales** Open-Meteo » — uniquement quand des normales ont réellement été servies.

### 2. Ce n'est pas une station, et rien ne le laisse croire

L'ADR-0022 demandait « station et période citées ». ERA5 est une **maille de modèle**, pas
un relevé de terrain : nous amendons ce point plutôt que de le contourner par une
formulation floue.

- Le payload porte `reanalyse: true` et `station: null`.
- La ligne affichée dit, sous la valeur : « Normale de juillet : 25,6 °C — **réanalyse
  ERA5**, 1991-2020 ».
- Un test vérifie que le mot « station » n'apparaît **pas** dans cette ligne.

Une normale de maille annoncée comme une normale de station serait exactement la faute que
l'ADR-0022 a corrigée — sous une autre forme, avec une source en plus.

### 3. On compare la maximale du jour à la normale des maximales

C'est le point le plus important, et il est indépendant de la source.

Comparer le thermomètre de 8 h du matin à une moyenne mensuelle de maximales afficherait
« bien en dessous des normales » tous les matins, et « au-dessus » tous les après-midis
d'été. Deux affirmations fausses tirées de chiffres exacts. La comparaison porte donc sur
la **maximale du jour** (`daily.temperature_2m_max` à l'indice du jour courant — rappel :
`daily[0]` est **hier**, ADR-0007) face à la **normale des maximales** du mois.

Le libellé dit « Maximale prévue aujourd'hui » : la valeur vient d'un modèle de prévision,
y compris en fin de journée. Un libellé qui dépendrait de l'heure serait faux une partie
du temps.

Le mois est lu sur le **jour comparé** (`daily.time[dayIdx]`), pas sur l'horloge du
navigateur : le 1er du mois, les deux divergent.

### 4. Emphase seulement au-delà de 3 °C, et jamais par la couleur seule

Sous 3 °C d'écart, la valeur s'affiche mais la pastille reste neutre. Une pastille rouge à
+1,2 °C banaliserait la couleur, comme l'indice UV à 6 le faisait dans « Prochains
risques » avant la v4.77. Le sens est porté par le **signe** (+ / −) autant que par la
couleur : la ligne reste lisible en niveaux de gris et pour un daltonien.

### 5. Tout ou rien, à chaque étage

- **Backend** : si un seul mois n'a pas 80 % de ses jours mesurés, le calcul échoue en
  entier. Onze mois sur douze ne se servent pas.
- **Frontend** : pas de normales, pas de maximale du jour, ou mois introuvable → la ligne
  n'est pas rendue. Aucun écart approché, aucun « – » de remplissage : c'est un complément,
  pas une mesure attendue.

### 6. Le calcul ne se met jamais sur le chemin d'un habitant

Trente ans de valeurs quotidiennes, c'est une requête lourde. Elle part **en arrière-plan**
et n'est faite qu'une fois par semestre (cache Redis six mois — une normale trentenaire ne
bouge pas, et le quota Upstash non plus, cf. ADR-0007 du backend). `/meteo/commune` répond
sans l'attendre ; les normales arrivent au chargement suivant.

Comme elles voyagent dans la réponse de `/meteo/commune`, elles suivent le cache
hors-ligne `mat_meteo_cache` **sans une ligne de code supplémentaire**.

## Conséquences

**Positives :**
- L'application répond enfin à « fait-il plus chaud que d'habitude ? », avec une source
  vérifiable et une comparaison qui a un sens.
- La provenance est écrite à côté de la valeur, pas seulement dans une documentation.
- Aucun appel réseau supplémentaire côté app, et le hors-ligne fonctionne par construction.

**Négatives / compromis acceptés :**
- **ERA5 n'est pas une station.** Sur une maille de plusieurs kilomètres, la normale n'est
  pas exactement celle du bourg. C'est assumé et écrit ; l'ordre de grandeur d'un écart
  saisonnier n'en dépend pas.
- Le premier chargement après un déploiement n'a pas d'écart, le temps que le calcul de
  fond aboutisse. Le check 📊 du diagnostic Services est là pour que cette absence soit
  visible côté mairie — sinon un calcul en échec resterait indétectable, l'app affichant
  simplement la température comme avant.
- Une normale de maximales ne dit rien des minimales, calculées et stockées mais **non
  affichées** aujourd'hui. Elles sont dans le payload pour le jour où une nuit
  exceptionnellement chaude mériterait sa ligne.

## Ce qu'on ne fait pas

- **Pas de normales Météo-France** tant que le token n'est pas abonné à la climatologie.
  Livrer du code en sommeil, non testable, pour respecter la lettre de l'ADR-0022 aurait
  coûté plus qu'il n'aurait apporté. Le jour où la souscription existe, le contrat de
  `lib/normales.js` ne change pas : seule la fonction de collecte change, et l'étiquette
  suit la source réellement utilisée.
- **Pas d'écart sur la température de l'instant** : voir §3.
- **Pas de normale de pluie ni d'ensoleillement** : une seule question à la fois.
