# ADR-0015 — Une accolade orpheline en CSS avale la règle suivante

- **Statut** : accepté
- **Date** : 2026-08-07
- **Contexte technique** : feuilles de style / contrôles automatisés

## Contexte

Le 7 août 2026, une question simple : « pour l'ambiance météo, la nuit, on n'est
pas censé avoir des étoiles ? »

Réponse attendue : si, le ciel dégagé la nuit affiche des étoiles scintillantes
depuis la v4.47.1. `js/mat-ambiance.js` le faisait correctement — la couche
`.header-amb` recevait bien treize `<span class="amb-star">✦</span>`, avec
`left`, `top`, `font-size` et délais d'animation posés en style *inline*.

Mais elles étaient **invisibles**, et l'étaient depuis six jours.

## Mécanisme

Le 1ᵉʳ août 2026 (commit `96b2d2d`, v4.52.1), la suppression de l'effet d'été
« poussière de lumière » (`.amb-mote` + `@keyframes ambMote`) a laissé une
**accolade fermante orpheline** dans `css/mat.css`, juste avant la règle
`.amb-star` :

```css
@keyframes ambPapillon{
  …
}

}                       /* ← orpheline, reliquat de la suppression */

.amb-star{position:absolute;color:rgba(255,255,255,0.92);…}
```

Le piège est là : **le parseur CSS ne se contente pas d'ignorer le `}`
surnuméraire.** Au niveau racine d'une feuille de style, un `}` inattendu n'est
pas traité comme un cas particulier — il est reconsommé comme le début d'une
**règle qualifiée**. Le prélude devient `} .amb-star`, sélecteur invalide, et le
bloc qui suit est consommé avec lui puis jeté.

Conséquence exacte, vérifiée sous Chromium sur la vraie feuille :

| Règle | Avant | Après |
|---|---|---|
| `.amb-star` | avalée — `position:static`, `animation:none`, couleur héritée | `position:absolute`, `ambTwinkle`, `rgba(255,255,255,.92)` |
| `.amb-cordon`, `.amb-ampoule`, `.amb-conf`, `.amb-egg`, `.amb-bat` | intactes | intactes |
| `.header.amb-night` et les autres teintes | intactes | intactes |

**Une seule règle disparaît : celle qui suit immédiatement.** Tout le reste du
fichier — y compris le dégradé de nuit — continue de s'appliquer.

Côté habitant, cela donnait des `✦` en `position:static`, donc empilés dans le
flux en haut à gauche du bandeau, à la couleur de texte héritée (vert sombre)
sur un dégradé de nuit vert sombre, sans scintillement. Ni vus, ni soupçonnés.
Les étoiles dorées de Noël (`_ambStars(layer, 9, .85, '#ffe9a8')`) étaient
touchées de la même façon.

## Pourquoi ça n'a pas été vu

Trois filets qui, chacun, auraient pu l'attraper :

1. **La CI ne regardait pas le CSS.** Le job `syntax-check` fait `node --check`
   sur `js/` et `service-worker.js`. Aucun contrôle ne portait sur `css/`.
2. **Les tests E2E d'ambiance ne regardaient que la composition JS.** Les onze
   tests de `tests/e2e/ambiance.spec.js` assertent sur `layer.dataset.kind`,
   c'est-à-dire sur la décision de `_ambCompose()`. Le test « ciel dégagé la
   nuit → étoiles » passait au vert pendant toute la durée du bug : les étoiles
   étaient bien *composées*, elles n'étaient pas *peintes*.
3. **La page n'était pas cassée.** Contrairement à une accolade manquante, qui
   fait dérailler tout ce qui suit et se voit immédiatement, une accolade *en
   trop* coûte exactement une règle. Rien ne saute aux yeux.

C'est la même leçon que l'ADR-0009, sur un autre terrain : le succès d'une
opération d'édition ne prouve pas la justesse du résultat.

## Décision

1. **Retirer l'accolade orpheline**, et laisser un commentaire au-dessus de
   `.amb-star` expliquant pourquoi cette règle mérite une vigilance
   particulière — c'est elle qui a payé, et c'est là qu'on regardera.

2. **Vérifier l'équilibre des accolades de `css/**.css` en CI**
   (`scripts/check-css.js`, branché sur le job `syntax-check`). Le script est
   sans dépendance et volontairement grossier : il ne valide pas le CSS, il
   détecte le seul symptôme mécanique de cette classe d'erreur — une accolade
   fermante sans ouvrante, ou l'inverse. Commentaires, chaînes et échappements
   sont ignorés pour éviter les faux positifs.

3. **Asserter le rendu, pas seulement la composition.** Un test E2E vérifie
   désormais que les `.amb-star` sont réellement en `position:absolute`, animées
   par `ambTwinkle`, et dispersées dans le bandeau (des glyphes en flux normal
   partagent la même ordonnée — c'est la signature du bug).

## Conséquences

- Toute future accolade orpheline échoue en CI avant la revue, dans les trois
  feuilles (`mat.css`, `mat-desktop.css`, `fonts.css`).
- Le principe généralisable : **quand un effet visuel est produit par du JS mais
  habillé par du CSS, un test qui n'interroge que le JS ne prouve rien.** Les
  futurs tests d'ambiance devraient suivre le même modèle pour les effets dont
  la disparition serait silencieuse.
- Le contrôle ne remplace pas un vrai *linter* CSS (stylelint) ; il en couvre le
  cas précis qui nous a coûté six jours, sans ajouter de dépendance à la CI.

## Alternatives écartées

- **Ajouter stylelint** : couvrirait bien plus large, mais introduit une
  dépendance npm et une configuration à maintenir dans un dépôt qui n'en a
  aucune côté frontend (les seules dépendances vivent dans `tests/e2e/`).
  Réévaluable si d'autres catégories d'erreurs CSS apparaissent.
- **Ne rien automatiser et s'en remettre à la relecture** : c'est précisément ce
  qui a échoué — l'accolade orpheline était visible dans le diff du commit
  `96b2d2d`, deux lignes après un bloc supprimé, et personne ne l'a vue.
