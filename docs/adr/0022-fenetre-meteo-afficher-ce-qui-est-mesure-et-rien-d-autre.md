# ADR-0022 — Fenêtre météo : afficher ce qui est mesuré, et rien d'autre

- **Date** : 12 août 2026
- **Statut** : Accepté

## Contexte

La fenêtre météo a été relue de bout en bout après une remarque d'usage sur la carte
d'alerte (v4.77). Quatre constats, tous vérifiables dans le code d'alors :

### 1. Sept mesures étaient calculées, aucune n'était affichée

`loadMeteoDetail` calculait la température, le **ressenti**, l'humidité, la pression, les
tendances sur trois heures et l'écart aux normales — `tempCur`, `ressenti`, `humCur`,
`tHum`, `tPluie`, `eTemp`, `eRes`. Aucune de ces variables n'apparaissait dans le HTML
produit. Le CSS correspondant (`.meteo-current-card`, `.meteo-stat-card`, `.meteo-grid-2`,
`.meteo-current-norms-inline`…) existait et n'était référencé nulle part.

Conséquence : sur un écran de vigilance canicule à 37 °C, l'application ne disait pas le
**ressenti** — précisément le chiffre que l'on cherche — alors que le backend le récupérait
déjà (`current=…apparent_temperature,relative_humidity_2m`).

### 2. Les normales saisonnières n'avaient pas de source

L'écart aux normales s'appuyait sur deux tableaux mensuels codés en dur
(`NORM_MAX` / `NORM_MIN`), sans station de référence ni période citée.

### 3. Une donnée manquante devenait une prévision

`weather_code || 0` transformait un code absent en code 0, soit ☀️ « Ciel dégagé » ;
`temperature_2m_max || 0` affichait 0 °C. Un trou dans la réponse produisait donc une
prévision d'apparence normale.

### 4. Sans réseau, la fenêtre était vide

`loadMeteo` échouait, `window._meteoData` restait absent, et l'overlay affichait « Données
météo non disponibles » — alors que les actus et les documents officiels, eux, conservent
leur dernière copie.

## Décision

### 1. Une carte « Maintenant » affiche les mesures, et seulement les mesures

`meteoBuildNowCard` rend température, ressenti, humidité, pression et rafales maximales du
jour, avec les tendances sur trois heures. Si `temperature_2m` est absente, **la carte
entière n'est pas rendue** : pas de carte à moitié vraie.

Rafales et pression quittent le bloc **🌿 Air** — ce sont des paramètres de vent et de
pression, pas de qualité de l'air.

La flèche de tendance disparaît des rafales : la valeur affichée est un **maximum
quotidien**, et une tendance sur un maximum ne veut rien dire.

### 2. Pas d'écart aux normales tant qu'aucune source ne le porte

Les tableaux `NORM_MAX` / `NORM_MIN` sont supprimés. Annoncer « +6° au-dessus des
normales » à partir de valeurs non sourcées serait une donnée inventée au sens de
l'**ADR-0018**, sur un sujet où l'habitant n'a aucun moyen de vérifier.

Reprise possible le jour où le backend servira des normales sourcées (station et période
citées) — pas avant.

### 3. Une donnée absente s'écrit « – »

Plus aucun `|| 0` sur une mesure. Code météo absent → ❔ et « Indisponible » ; température,
cumul, rafales absents → « – ». L'indice UV porte une pastille de couleur suivant l'échelle
OMS reprise par Météo-France (1-2 faible, 3-5 modéré, 6-7 fort, 8-10 très fort, 11+
extrême) — **le même palier 8** que l'item « UV très fort » des prochains risques et que le
conseil du jour : une valeur, une seule lecture dans toute l'application.

### 4. Le dernier bulletin est conservé, daté, et purgé de ce qui a expiré

`mat_meteo_cache` conserve la dernière réponse reçue avec son horodatage. En cas d'échec
réseau, `loadMeteo` s'y replie, le bandeau d'accueil affiche « 📡 Hors ligne · relevé de
15h58 » et la fenêtre météo ouvre sur un bandeau daté.

Deux garde-fous :

- au-delà de **six heures**, le cache n'est plus servi — mieux vaut se taire ;
- une **vigilance dont l'échéance est passée est retirée** du bulletin relu. Réafficher
  hors ligne une alerte terminée ne serait pas une information datée, mais une fausse
  information.

### 5. La source et l'heure du relevé sont écrites

Une ligne de pied indique « Prévisions Open-Meteo (CC BY 4.0) · vigilance Météo-France —
mis à jour à … ». Open-Meteo est diffusé sous licence CC BY 4.0 : l'attribution est due.
Et l'habitant doit pouvoir savoir de quand date ce qu'il lit.

### 6. Les deux carrousels sont atteignables au clavier

`.meteo-hourly-track` et `.meteo-days-scroll` reçoivent `tabindex="0"`, un `role="group"`
et un nom accessible. Sous Chrome, un conteneur défilant sans `tabindex` est hors
d'atteinte au clavier — même famille de problème que l'**ADR-0016**. Les titres de section
deviennent de vrais `<h3>` pour que la fenêtre soit parcourable section par section.

## Conséquences

- La fenêtre météo dit enfin ce qu'elle mesurait déjà : le ressenti est visible.
- Aucune valeur affichée n'est dépourvue de source ou de mesure.
- Le hors-ligne est utilisable, sans jamais faire passer une copie pour un relevé frais.
- `tests/e2e/meteo-overlay.spec.js` verrouille les neuf comportements, dont la pastille UV
  et le focus clavier **sur le style calculé** (règle 7 du `CLAUDE.md`).

## Ce qu'on ne fait pas

- **Pas de second bloc de consignes** dans la carte d'alerte : les gestes vivent dans
  « 💡 Conseils du jour », qui existait déjà (voir v4.77).
- **Pas de normales inventées**, même plausibles.
- **Pas de cache indéfini** : six heures, puis silence.
