# ADR-0047 — Un carburant a sa propre date, et un code postal peut porter deux stations

- **Statut** : accepté
- **Date** : 16 septembre 2026
- **Version** : v4.117
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
2. **La date d'une station est celle du PLUS ANCIEN des prix qu'elle affiche.** Le
   bandeau d'accueil montre deux prix sous une seule date : la seule date qui ne mente
   sur aucun des deux est la plus ancienne. Elle sert aussi de clé de tri du panneau et
   de teinte de la carte — ni le rang ni la couleur ne peuvent ainsi être plus optimistes
   qu'un des prix montrés.
3. **Le panneau écrit une date par carburant dès que les deux diffèrent**, et garde une
   ligne unique quand elles coïncident (le cas de loin le plus fréquent).
4. **Une station peut être désignée par son `id`** — celui du jeu de données, visible
   dans l'URL `prix-carburants.gouv.fr/station/<id>`. Le relais du Coudray porte
   `45160006`.
5. **Le repli « à défaut, le premier enregistrement » ne s'applique plus qu'à un code
   postal qui n'en contient qu'un.** Ailleurs, pas de correspondance = **pas de prix** :
   une station absente se voit, une station aux prix du voisin, non.
6. La logique pure part dans `lib/carburant.js`, testable sans réseau
   (`test/carburant.test.js`) — la route ne garde que l'appel HTTP et le cache.

## Conséquences

- Clé Redis `mat:carburant:v8` → **`v9`** : la forme du payload change. Pendant l'heure
  de TTL qui suit un déploiement, l'app reçoit sinon des relevés sans date par carburant.
- Le front sait lire les deux formats : sans `sp95Maj*` / `gazoleMaj*`, il retombe sur la
  date de la station. Ce repli couvre le cache d'un habitant et l'heure de bascule.
- Le classement peut surprendre : une station qui vient de réévaluer son gazole reste
  derrière si son SP95 traîne. C'est voulu — le rang dit « tout ce que cette station
  affiche est à jour », et la carte donne le détail.

## Ce qu'on n'a pas fait

- **Trier par carburant** (un classement pour le SP95, un pour le gazole) : deux listes à
  lire, pour un écran qu'on consulte en marchant vers sa voiture.
- **Masquer un prix jugé trop vieux** : règle inchangée depuis l'ADR-0033, c'est
  l'habitant qui juge.
- **Suivre SP98, E85 et GPL** : ils figurent sur la fiche officielle, mais l'app parle de
  SP95 et de gazole depuis l'origine, et une colonne de plus ne se lit pas sur un
  bandeau de deux lignes. À rouvrir si la demande vient des habitants.
- **Recopier les `id` des cinq autres stations** : leur code postal ne porte qu'une
  station suivie, et un `id` inventé de mémoire serait pire que l'absence d'`id`. Ils
  s'ajouteront à mesure qu'on pourra les relever.
