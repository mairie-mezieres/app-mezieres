# ADR-0029 — Un numéro de formulaire mort ne se voit pas comme un lien mort

- **Date** : 27 août 2026
- **Statut** : Accepté
- **Prolonge** : ADR-0013 (fibre : l'opérateur d'infrastructure n'est pas un fournisseur
  d'accès) et ADR-0028 (LAEP) — même classe d'erreur : un fait exact hier, faux
  aujourd'hui, que rien dans le dépôt ne remet en cause.
- **S'appuie sur** : le scan hebdomadaire `liens-morts.yml` des deux dépôts.

## Contexte

Le scan du 24 août 2026 a ouvert l'issue #400 sur une seule erreur :

```
### Errors in js/mat-mel.js
* [404] <https://www.service-public.gouv.fr/particuliers/vosdroits/R11646> (at 262:30)
```

C'était le lien « 📄 Cerfa DP » affiché à côté du zonage PLU. La page n'avait pas
déménagé : elle avait été **supprimée**, parce que le formulaire qu'elle portait n'existe
plus. Au **1er janvier 2025**, les cerfa **13703** (DP maison individuelle), **13702**
(DP lotissement) et **13404** (DP constructions et travaux) ont été **abrogés**, remplacés
par le **16702** (constructions et travaux) et le **16703** (aménagements). Le permis de
construire, lui, reste le **13406**.

En remontant le fil, le lien mort s'est révélé être la partie **visible** du problème.
Trois autres endroits portaient le même fait périmé, sans aucun lien pour les trahir :

| Où | Ce qui était écrit | Ce qu'un habitant en faisait |
|---|---|---|
| `chatbot-mairie-mezieres/lib/mel.js` — règle `plu_permis_construire_depot` | « Téléchargez le cerfa (PC = n°13406, DP = n°**13703**) » | Il téléchargeait un formulaire abrogé et déposait un dossier refusé |
| `chatbot-mairie-mezieres/lib/mel.js` — `SYSTEM_PROMPT`, bloc urbanisme | « Cerfa PC = 13406 ; DP = **13703** ; Clôture = 16702\*02 » | Le modèle reprenait le numéro abrogé dans toutes les formulations non couvertes par une règle directe |
| `app-mezieres/data/saviez-vous.json` — entrée `gnau-cerfa-cloture` | « le Cerfa 16702 est propre aux clôtures. Pour les autres déclarations préalables, c'est le Cerfa **13703** » | Le corpus enseignait activement la distinction inverse de la règle en vigueur |

L'entrée du corpus est la plus instructive : elle ne se contentait pas d'être périmée,
elle **répondait faux à sa propre question**. « Le formulaire d'une DP pour une clôture
est-il le même que pour un abri de jardin ? » — la réponse est **oui** depuis le
1er janvier 2025, et le corpus disait non, sous une source (« service urbanisme ») qui
n'invitait pas à vérifier.

## Ce qui a permis à l'erreur de durer

1. **Rien n'expire dans un dépôt.** Un lien mort finit par répondre 404, et le scan le
   voit. Un numéro de formulaire mort reste une chaîne de cinq chiffres parfaitement
   valide : aucun outil ne peut le distinguer d'un numéro vivant.
2. **Le millésime donne une fausse impression de fraîcheur.** Le code écrivait
   « 16702\*02 ». Un millésime précis se lit comme une donnée vérifiée récemment — alors
   qu'il change tous les six mois (le \*03 est en vigueur depuis le 1er juillet 2026) et
   périme la phrase qui le porte, en silence.
3. **Le lien et le texte étaient dans deux dépôts différents.** Le 404 était côté app, les
   trois occurrences textuelles côté backend et dans le corpus. Corriger l'issue au sens
   strict — remplacer une URL — aurait laissé les trois autres en place, et refermé
   l'issue.

## Décision

### 1. Ne jamais écrire de millésime de cerfa

Seul le **numéro à cinq chiffres** est stable. « Cerfa 16702 », jamais « 16702\*02 ».
Verrouillé par `test/urbanisme-cerfa.test.js` (dépôt backend), qui refuse tout motif
`1XXXX*NN` dans `lib/mel.js`.

### 2. Les numéros abrogés ne sont autorisés que dans le garde-fou

`13703`, `13702` et `13404` ne peuvent apparaître dans `lib/mel.js` que sur la ligne qui
les déclare **ABROGÉS**. Le même test le vérifie ligne à ligne. C'est délibéré : le
`SYSTEM_PROMPT` doit **nommer** les formulaires interdits pour que le modèle sache ne pas
les proposer — les faire disparaître du fichier affaiblirait la barrière.

### 3. Les quatre endroits restent en phase

Un changement de formulaire d'urbanisme touche :

- `app-mezieres/js/mat-mel.js` → `pluAuthLink()` (les liens « Cerfa DP » / « Cerfa PC ») ;
- `app-mezieres/data/saviez-vous.json` → entrées `cloture-dp` et `gnau-cerfa-cloture` ;
- `chatbot-mairie-mezieres/lib/mel.js` → règle `plu_permis_construire_depot` ;
- `chatbot-mairie-mezieres/lib/mel.js` → bloc AUTORISATIONS du `SYSTEM_PROMPT`.

### 4. « Où trouver le cerfa ? » doit tomber sur une règle

`où trouver le cerfa pour ma clôture ?` ne matchait **aucune** `DIRECT_RULE` : les règles
clôture exigent toutes un second terme (rue, voisin, hauteur), et la règle de dépôt ne
connaissait ni « cerfa » ni « formulaire ». La question partait donc au modèle — c'est-à-dire
à l'endroit précis où le numéro périmé était le plus susceptible d'être repris. La règle
`plu_permis_construire_depot` capture désormais « cerfa », et « formulaire » accompagné
d'un terme d'urbanisme.

## Conséquences

- Un habitant qui suit MEL ou le zonage PLU télécharge un formulaire recevable.
- Le corpus « Le saviez-vous ? » a **changé de verdict** sur une entrée
  (`gnau-cerfa-cloture` : `false` → `true`). L'identifiant est conservé — les compteurs de
  réactions du backend sont indexés dessus (ADR-0012).
- Le test ajouté échouera à la prochaine réforme des cerfa. C'est l'effet recherché : il
  transforme un fait qui vieillit en silence en une CI rouge.

## Alternative écartée

**Ne corriger que l'URL de l'issue #400.** C'était la lecture littérale du signalement, et
elle refermait l'issue. Elle laissait MEL conseiller un formulaire abrogé et le corpus
enseigner l'inverse de la règle — soit les deux canaux que les habitants consultent le
plus. Un lien mort n'est pas le problème : c'est le symptôme le plus bruyant d'un fait
périmé.
