# ADR-0038 — Un nom de personnel se périme plus vite qu'un horaire

- **Statut** : accepté
- **Date** : 9 septembre 2026
- **Version** : v4.108
- **Concerne** : `data/mel-tree.json` et `js/mat-mel.js` (rubrique « Enfance & Jeunesse »),
  `js/mat-guide-arrivee.js` (fiches `ecole` et `periscolaire`),
  `data/saviez-vous.json`, `chatbot-mairie-mezieres/lib/mel.js` (`DIRECT_RULES` et
  `SYSTEM_PROMPT`), `tests/e2e/ecole-periscolaire.spec.js`,
  `chatbot-mairie-mezieres/test/ecole.test.js`

## Contexte

La mairie a remis le **règlement intérieur scolaire et périscolaire 2026-2027** de l'école
de la Forêt. En le confrontant à ce que l'application disait déjà, trois écarts sont
apparus — dont deux qu'aucun test ni aucune relecture n'aurait signalés.

**1. Deux noms de personnes étaient stockés.** L'arbre de décision invitait à « joindre la
directrice Mme *…* » et à remettre les fiches « auprès de la directrice du périscolaire
*…* ». Ces personnes changent d'une rentrée à l'autre, sans que rien dans le dépôt ne le
signale : un habitant qui demande une personne qui n'est plus là est renvoyé à un accueil
qui ne comprend pas sa demande, et l'application a l'air de savoir. Le règlement lui-même
nomme onze personnes — l'équipe scolaire, l'équipe périscolaire, l'inspection, la
présidence de l'association de parents d'élèves : autant de noms qu'il aurait été naturel
de recopier.

**2. Un tarif de cantine de 2022-2023 était encore affiché.** `js/mat-mel.js` annonçait une
grille à trois montants, « 1er / 2e / 3e enfant », datée dans son propre texte. Quatre ans
de retard, visibles de tous et vus de personne. Les tarifs périscolaires sont votés
**chaque année par délibération du conseil municipal** et calculés sur le **quotient
familial CAF** : la grille recopiée était condamnée dès le premier vote. C'est exactement
le mécanisme de l'ADR-0013 (tarifs de location) et du garde-fou de la crèche — mais il
n'avait jamais été appliqué ici.

**3. Un horaire d'ouverture faux, et une procédure supprimée.** L'arbre annonçait une
ouverture « à 8h20 et 13h30 » : l'après-midi commence à **13h45**, et l'accueil dix minutes
avant, soit **13h35**. Et l'inscription « par fiche à déposer en mairie avant le 30 juin »
n'existe plus : tout passe désormais par un **portail parents**, au fil de l'eau, avec des
délais de réservation. Le corpus « Le saviez-vous ? » portait ces deux affirmations, parce
qu'il puise dans l'arbre de décision.

## Décision

### 1. Aucun nom de personnel n'est stocké, pas même en commentaire

On désigne une **fonction** : « la direction de l'école », « l'enseignante de votre
enfant », « le service enfance », « la directrice du service périscolaire ». Une fonction
survit à un mouvement de personnel ; un nom, non.

Le garde-fou est mécanique, dans les deux dépôts, et porte sur les **fichiers entiers** —
pas seulement sur les textes affichés :

- `tests/e2e/ecole-periscolaire.spec.js` refuse une vingtaine de patronymes dans
  `data/mel-tree.json`, `js/mat-mel.js`, `js/mat-guide-arrivee.js` et
  `data/saviez-vous.json` ;
- `chatbot-mairie-mezieres/test/ecole.test.js` fait de même sur les réponses des
  `DIRECT_RULES`, et le `SYSTEM_PROMPT` interdit explicitement à MEL de nommer un
  enseignant, un animateur ou un agent.

> Le test a d'ailleurs échoué **sur ce commit** : le commentaire qui expliquait le retrait
> citait les deux noms. C'est le comportement voulu — un nom en commentaire est un nom
> stocké, et il ressortira à la première relecture qui le prend pour une source.

### 2. Aucun montant, mais le principe de tarification est dit

Ni tarif, ni pénalité de retard, ni montant de surcoût — dans aucune des deux copies de
l'arbre, ni dans les `DIRECT_RULES`. En revanche l'application dit **comment** le prix se
forme : quotient familial CAF au 1er août, délibération annuelle du conseil municipal,
tarif maximum en l'absence de justificatif — et **où** trouver la grille : le portail
parents, ou le service enfance.

C'est une perte assumée : l'habitant ne lit plus un chiffre dans l'application. Il ne
lisait de toute façon plus le bon.

Si la mairie souhaite publier la grille, sa place est l'**arbre de décision**, qu'elle
édite depuis l'admin sans passer par le code — pas une constante versionnée. Les deux
copies de l'arbre devraient alors rester en phase, ce que le test vérifie déjà.

### 3. Une date de calendrier porte son année scolaire

Les vacances 2026-2027 sont énoncées avec leur millésime à chaque borne, et la réponse
précise qu'elles valent **pour cette année scolaire uniquement**, avec un renvoi vers
`education.gouv.fr` pour une autre année. Même raisonnement que l'ADR-0033 : un calendrier
sans sa date se lit comme celui de l'année en cours, et une réponse fausse se propage sans
bruit — le règlement, lui, écrit ses congés en « S. 17 octobre » sans année, parce qu'il
est lui-même daté par sa couverture. L'application n'a pas de couverture.

### 4. Une quatrième fiche, « Accueil du mercredi »

L'accueil du mercredi (7h30-18h00, journée ou demi-journée, avec ou sans repas) n'existait
nulle part. Il a sa propre fiche dans les deux copies de l'arbre, plutôt qu'un paragraphe
dans « Accueil périscolaire » : ses horaires d'arrivée et de départ, ses délais de
réservation et sa limite de retard diffèrent tous de ceux du matin et du soir.

## Conséquences

- **Six endroits à garder en phase** dès qu'un fait scolaire change : les deux copies de
  l'arbre (`data/mel-tree.json` **et** `js/mat-mel.js`), la fiche `periscolaire` de
  `js/mat-guide-arrivee.js`, les entrées scolaires de `data/saviez-vous.json`, les
  `DIRECT_RULES` et le `SYSTEM_PROMPT` de `chatbot-mairie-mezieres/lib/mel.js`. Le test e2e
  vérifie la phase entre les deux copies de l'arbre ; le reste tient à cette liste.
- Une règle de `lib/mel.js` a dû être **restreinte** au passage : `demarches_etatcivil`
  attrapait le mot `certificat` nu, donc « certificat de radiation » et « certificat
  médical pour une absence » recevaient une réponse sur les actes de naissance. L'ordre du
  tableau étant la priorité, restreindre était plus sûr que remonter les règles scolaires
  au-dessus des démarches d'état civil.
- Le corpus « Le saviez-vous ? » passe de 172 à 180 entrées ; l'entrée
  `inscriptions-30-juin` disparaît au profit de `inscriptions-portail-parents`, qui répond
  **non** à la même question. Un habitant qui avait déjà vu l'ancienne reverra la nouvelle :
  c'est voulu, le fait a changé.
- Le règlement contient des informations que l'application **ne reprend pas** : la charte
  de la laïcité (reproduite en image), le protocole contre le harcèlement (annexe 1), le
  détail des réprimandes par niveau de classe. Elles relèvent du document remis aux
  familles, pas d'une réponse de trente secondes sur un téléphone.

## Alternatives écartées

- **Recopier la grille tarifaire du règlement.** Elle est exacte aujourd'hui et fausse au
  prochain conseil municipal, sans que rien ne le signale — c'est précisément le mode de
  panne qu'on vient de constater sur quatre ans.
- **Ne citer que le nom de la directrice, « qui, elle, ne change pas ».** Elle avait déjà
  changé de fonction dans le règlement précédent. Aucun nom n'est stable à l'échelle d'une
  application qui vit plusieurs années entre deux relectures.
- **Recopier les créneaux d'arrivée du mercredi dans la fiche périscolaire.** Ils diffèrent
  de ceux du matin et du soir ; les mêler produit exactement le genre de réponse à demi
  juste qu'un parent applique sans la vérifier.
