# ADR-0040 — Dix fichiers de police qui n'en faisaient qu'un

**Date :** 13 septembre 2026
**Statut :** acceptée
**Version :** v4.111

## Contexte

`css/fonts.css` déclarait Nunito sous **cinq graisses** (400, 600, 700, 800, 900),
chacune en deux sous-ensembles (`latin`, `latin-ext`), soit **dix `@font-face`
pointant vers dix URL distinctes** :

```
fonts/nunito-400-latin.woff2
fonts/nunito-600-latin.woff2
fonts/nunito-700-latin.woff2
…
```

C'est la forme que Google Fonts produisait historiquement, et le fichier dit
lui-même qu'il en est « généré ». Rien, à la lecture, ne le distingue d'une
famille correctement découpée en coupes statiques.

Un `md5sum` dit autre chose :

```
$ md5sum fonts/nunito-*.woff2
166202cc391c71a57730bed12cbcb159  fonts/nunito-400-latin.woff2
ffdc8b0c86fb7c4937165907dc90554c  fonts/nunito-400-latin-ext.woff2
166202cc391c71a57730bed12cbcb159  fonts/nunito-600-latin.woff2
ffdc8b0c86fb7c4937165907dc90554c  fonts/nunito-600-latin-ext.woff2
…
```

**Deux hachages pour dix fichiers.** Google Fonts ne livre plus de coupes
statiques pour Nunito : `wght@400` et `wght@200..1000` renvoient exactement le
même fichier — la police **variable**. Les dix fichiers du dépôt étaient dix
copies de deux fichiers.

## Le problème

Un navigateur ne déduplique pas par contenu : **une URL distincte est une entrée
de cache distincte**. Il téléchargeait donc les 39,1 Ko de Nunito *une fois par
graisse effectivement rencontrée dans le rendu*.

Mesuré sur l'écran d'accueil (Chromium, profil téléphone, cache vide, service
worker neutralisé) : **les cinq graisses partaient**, aucune n'était dispensée.

| | Avant (v4.110) | Après (v4.111) |
|---|---|---|
| Fichiers de police téléchargés | 6 | 2 |
| Octets | 226 376 (221,1 Ko) | 69 864 (68,2 Ko) |

**−152,8 Ko et −4 requêtes sur le chemin critique**, pour un rendu **identique au
pixel** : ce sont les mêmes octets de police, servis une fois au lieu de cinq.

## Pourquoi personne ne l'a vu

C'est la propriété qui rend ce bug intéressant, et la raison de cet ADR.

1. **Rien ne casse.** L'application s'affiche parfaitement. Il n'y a ni erreur,
   ni avertissement, ni régression visuelle — seulement du temps et des données.
2. **Le code a l'air juste.** « Une déclaration par graisse » est exactement ce
   qu'on attend d'un `fonts.css`. C'est le geste normal qui produit la faute.
3. **Les tests ne peuvent pas le voir.** Aucun test d'interface n'a de raison de
   compter des requêtes de police : le rendu qu'ils mesurent (plancher de 12 px,
   hauteurs de cartes, contrastes) est correct dans les deux cas. Les 382
   exécutions passent avant comme après.
4. **Lighthouse ne le nomme pas.** Il constate un poids et une latence, pas un
   doublon d'octets. L'eco-index à 45/D et la performance à 71 disaient qu'il y
   avait *quelque chose* ; ils ne pouvaient pas dire quoi.
5. **Le dépôt le dissimule.** Dix fichiers de tailles plausibles dans `fonts/` ne
   ressemblent pas à un problème. Seul un `md5sum` sur l'ensemble le montre — et
   on ne hache pas un dossier de polices sans raison de le suspecter.

Classe d'erreur voisine de l'ADR-0019 (un `?v=` non incrémenté) et de l'ADR-0032
(un script injecté qui suppose ses dépendances) : **un défaut qui ne produit
aucun symptôme observable depuis l'application**, et que seule une mesure
délibérée révèle.

## Décision

Une **seule** déclaration par sous-ensemble, couvrant tout l'intervalle de la
police variable :

```css
@font-face {
  font-family: 'Nunito';
  font-weight: 200 1000;      /* ⛔ pas 400, pas 900 : l'intervalle */
  font-display: swap;
  src: url(../fonts/nunito-variable-latin.woff2) format('woff2');
  unicode-range: U+0000-00FF, …;
}
```

Fichiers : `fonts/nunito-variable-latin.woff2` et `-latin-ext.woff2`. Les huit
copies sont supprimées (`fonts/` passe de 480 Ko à 176 Ko).

`font-weight: 200 1000` déclare au navigateur que **cette ressource unique sait
rendre toutes les graisses de l'intervalle**. Les `font-weight: 900` du CSS et du
HTML sont inchangés — c'est l'usage d'une graisse, pas sa déclaration.

## Conséquences

- **Aucun changement visuel.** Mêmes octets de police, même rendu. Vérifié par la
  suite complète : 382 exécutions, 0 échec.
- **Playfair Display et Grape Nuts restent en coupes statiques** : ce sont de
  vraies coupes uniques (700 italique, 400), pas des doublons. Leurs hachages
  diffèrent. Ne pas les « uniformiser » par symétrie.
- **Le nom `nunito-variable-*` est délibéré.** `nunito-400-*` décrivait une coupe
  qui n'existait pas ; le nouveau nom dit ce que le fichier est, et interdit de
  rouvrir la porte en ajoutant un `nunito-600-*` à côté.
- `css/fonts.css?v=2` dans `index.html` **et** `service-worker.js`, cache SW
  `mat-v4.111.0` (les anciennes URL disparaissent du précache avec l'ancien
  cache).

## Règle à retenir

⛔ **Une graisse s'utilise, elle ne se déclare pas.** Ajouter un `@font-face`
parce qu'on veut écrire en 600 est le geste exact qui a créé cette duplication.
Avec une police variable, `font-weight: 600` dans le CSS suffit : la déclaration
existe déjà.

⚠️ **Avant d'ajouter un fichier dans `fonts/`, hacher le dossier :**

```bash
md5sum fonts/*.woff2 | sort | uniq -c -w32
```

Un compte supérieur à 1 sur un hachage signale des octets servis deux fois sous
deux URL. C'est la seule vérification qui aurait attrapé ce défaut, et elle coûte
une seconde.
