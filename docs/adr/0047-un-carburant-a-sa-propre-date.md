# ADR-0047 — Un carburant a sa propre date, et un code postal peut porter deux stations

- **Statut** : accepté
- **Date** : 16 septembre 2026
- **Version** : v4.117, révisée en v4.118 (§ « Révision »)
- **Concerne** : `chatbot-mairie-mezieres/lib/carburant.js` (nouveau),
  `routes/carburant.js`, `app-mezieres/js/mat-widgets.js`, `css/mat.css`
- **Prolonge** : [ADR-0033](0033-un-prix-sans-sa-date-est-un-prix-du-jour.md)

## Contexte

Le 16 septembre 2026, la v4.116 venait d'apprendre à dater les relevés et à trier les
stations par fraîcheur. Le porteur du projet ouvre l'écran et relève une incohérence :

> « Pour Leclerc Beaugency c'est bizarre, le SP95 non réévalué depuis le 08/09, par
> contre le diesel oui. »

Vérification sur `prix-carburants.gouv.fr`, station **BALGENDIS** (E.Leclerc, RN 152 à
**Tavers**, 45190 — la station que l'app appelle « Beaugency ») :

| Carburant | Prix | Date |
|---|---|---|
| SP95-E10 | 2.149 | **08/09** |
| SP98 | 2.239 | 15/09 |
| E85 | 0.879 | 14/09 |
| Gazole | 2.369 | **16/09** |

**Chaque carburant porte sa propre date de relevé.** Le backend, lui, n'en gardait
qu'une :

```js
const rawMaj = rec.sp95_maj || rec.e10_maj || rec.gazole_maj || rec.prix_maj || null;
```

La première trouvée. Pour cette station, celle du SP95 — donc un gazole relevé le matin
même s'affichait « relevé d'il y a 8 jours ». Et la réciproque est pire : il suffit
qu'une station ne déclare pas de `sp95_maj` pour que la date retenue soit celle du
gazole, et qu'un SP95 vieux d'une semaine s'affiche « relevé du jour ». C'est exactement
la faute que l'ADR-0033 avait entrepris de corriger, un cran plus bas.

Second sujet, arrivé par la même demande : ajouter le **relais TotalEnergies du Coudray**
(3091 rue Marcel Belot, Olivet). Olivet porte déjà le E.Leclerc dans la liste — même
code postal, **45160**. Or la station était désignée ainsi :

```js
const rec = records.find(x => stationName(x).includes(brandKey)) || records[0];
```

Le `|| records[0]` aurait suffi à afficher les prix du Leclerc sous le nom du Total au
premier changement d'orthographe d'enseigne dans le jeu de données — sans rien, à
l'écran, qui puisse le trahir.

## Décision

1. **Le backend date chaque carburant** : `sp95Maj` / `sp95MajISO` et `gazoleMaj` /
   `gazoleMajISO`, à côté des `maj` / `majISO` de la station. Le repli SP95 → E10
   emporte la date du E10 : dater un E10 avec l'horodatage du SP95 reviendrait à
   déplacer le bug.
2. **Une station n'affiche que son relevé le plus récent.** Le SP95 du 08/09 de
   Beaugency n'est plus montré du tout : sa carte ne porte que le gazole du jour. Deux
   dates côte à côte demandaient à l'habitant de trier lui-même le frais du périmé, sur
   un écran qu'on consulte en marchant vers sa voiture — alors que la seule information
   utile est le prix qu'il paiera.
3. **Tout se lit sur ce qui reste** : la date affichée, l'âge qui teinte la carte, le
   prix qui sert au classement et la station que retient le bandeau. Un prix écarté ne
   décide de rien, et ne peut pas réapparaître dans le bandeau.
   ⚠️ Un carburant sans date connue n'est pas « le plus récent » : il sort dès qu'un
   autre porte une date. Une station dont aucun carburant n'est daté garde tout, faute
   de pouvoir départager.
4. **Un prix écarté est nommé, jamais supprimé en silence** : « SP95 non réévalué
   depuis le 08/09 — non affiché ». Une absence ne se remarque pas, et « cette station
   ne vend pas de SP95 » est une conclusion que rien ne viendrait démentir.
5. **Une station peut être désignée par son `id`** — celui du jeu de données, visible
   dans l'URL `prix-carburants.gouv.fr/station/<id>`. Le relais du Coudray porte
   `45160006`.
6. **Le repli « à défaut, le premier enregistrement » ne s'applique plus qu'à un code
   postal qui n'en contient qu'un.** Ailleurs, pas de correspondance = **pas de prix** :
   une station absente se voit, une station aux prix du voisin, non.
7. La logique pure part dans `lib/carburant.js`, testable sans réseau
   (`test/carburant.test.js`) — la route ne garde que l'appel HTTP et le cache.

## Conséquences

- Clé Redis `mat:carburant:v8` → **`v9`** : la forme du payload change. Pendant l'heure
  de TTL qui suit un déploiement, l'app reçoit sinon des relevés sans date par carburant.
- Le front sait lire les deux formats : sans `sp95Maj*` / `gazoleMaj*`, il retombe sur la
  date de la station. Ce repli couvre le cache d'un habitant et l'heure de bascule.
- Une station remonte dans le classement dès qu'**un** de ses carburants est réévalué,
  puisque c'est celui-là qu'elle affiche. Beaugency passe ainsi devant des stations
  moins chères mais plus anciennes — avec un seul prix sur sa carte.
- Le backend, lui, continue d'exposer `maj` / `majISO` = le **plus ancien** des relevés.
  Ce n'est pas une contradiction : c'est la valeur sûre pour un consommateur qui
  afficherait tout (une version de l'app restée en cache, par exemple). L'app, qui
  n'affiche pas tout, recalcule la date sur les prix qu'elle montre.

## Révision (v4.118) — on n'affiche plus que le plus récent

La v4.117 a d'abord affiché **les deux prix avec leurs deux dates**. C'était exact, et
ça n'a pas tenu une heure : montrer « SP95 2.149 € · relevé d'il y a 8 jours » à côté de
« Diesel 2.369 € · relevé du jour », c'est demander à l'habitant de faire le tri
lui-même, sur un écran qu'on consulte en marchant vers sa voiture. Le porteur du projet
a tranché :

> « Je pense que c'est plus pertinent d'afficher uniquement les carburants avec la date
> de rafraîchissement la plus récente pour avoir les informations les plus fraîches. »

Les points 2 et 3 ci-dessus portent donc la règle révisée, et le point 4 (« un prix
écarté est nommé ») existe **à cause** de cette révision : masquer sans le dire aurait
créé une absence que personne ne remarque.

⚠️ Ce que la révision ne change pas : le backend continue d'exposer les dates par
carburant — c'est ce qui rend le tri possible — et son `maj` / `majISO` reste le plus
ancien, pour un consommateur qui afficherait tout.

## Ce qu'on n'a pas fait

- **Trier par carburant** (un classement pour le SP95, un pour le gazole) : deux listes à
  lire, pour un écran qu'on consulte en marchant vers sa voiture.
- **Masquer un prix sur un seuil d'ancienneté** (« au-delà de N jours, on n'affiche
  plus ») : l'ADR-0033 l'avait écarté et ça reste écarté. Ce qui est masqué ici ne
  l'est pas parce qu'il est *vieux*, mais parce que la **même station** en a déclaré un
  plus récent — une comparaison qui se démontre à partir des seules données, sans
  réglage à défendre. Une station entièrement figée depuis huit jours affiche donc
  toujours ses deux prix, datés.
- **Suivre SP98, E85 et GPL** : ils figurent sur la fiche officielle, mais l'app parle de
  SP95 et de gazole depuis l'origine, et une colonne de plus ne se lit pas sur un
  bandeau de deux lignes. À rouvrir si la demande vient des habitants.
- **Recopier les `id` des cinq autres stations** : leur code postal ne porte qu'une
  station suivie, et un `id` inventé de mémoire serait pire que l'absence d'`id`. Ils
  s'ajouteront à mesure qu'on pourra les relever.
