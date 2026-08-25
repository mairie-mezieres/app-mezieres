# ADR-0028 — LAEP : un service intercommunal qui ne passe pas par Mézières

- **Date** : 25 août 2026
- **Statut** : Accepté
- **Prolonge** : ADR-0013 (fibre : opérateur d'infrastructure ≠ fournisseur d'accès) et la
  correction du 2 août 2026 sur la crèche Les Marmousets — même classe d'erreur.

## Contexte

La Communauté de Communes des Terres du Val de Loire ouvre le **7 septembre 2026** un
**LAEP** (Lieu d'Accueil Enfants-Parents) **itinérant** : gratuit, confidentiel, sans
inscription, pour les enfants de moins de 6 ans accompagnés d'un adulte et pour les futurs
parents. Rien dans l'application ni dans la base de MEL n'en parlait.

Deux pièges, tous deux déjà rencontrés sur d'autres sujets :

1. **Un service intercommunal n'est pas un service communal.** Le LAEP se déplace sur
   Beauce la Romaine, Beaugency, Cléry-Saint-André et Meung-sur-Loire — **pas** sur
   Mézières. C'est exactement la configuration de la crèche familiale Les Marmousets, que
   MEL a annoncée comme communale jusqu'au 2 août 2026, jusqu'à contaminer le corpus
   « Le saviez-vous ? ». Et c'est celle de la fibre, où Lysséo a été présenté deux ans
   comme un fournisseur d'accès.

2. **Un LAEP ressemble à un mode de garde, et n'en est pas un.** L'adulte accompagnant
   reste avec l'enfant pendant toute la durée de l'accueil. Une IA à qui l'on demande
   « où faire garder mon enfant » a toutes les raisons de le proposer — c'est un lieu, il
   accueille des enfants, il est gratuit. La formulation ne peut donc pas être laissée à
   son appréciation.

En écrivant cette entrée, un troisième constat s'est imposé : la fiche « Pensez au
périscolaire, à la cantine et à la crèche » du guide d'arrivée disait « **La commune
dispose** […] de la crèche familiale Les Marmousets » — l'erreur corrigée dans MEL trois
semaines plus tôt, toujours vivante à deux écrans de là. Le garde-fou avait été posé dans
le dépôt backend ; personne n'était allé voir si l'app disait la même chose.

## Décision

### 1. Les créneaux du LAEP ne sont pas dans le code

Au 25 août 2026, le planning **n'est pas encore publié** : le service ouvre dans deux
semaines et la Communauté de Communes annonce les créneaux « à venir ». Les jours,
horaires, salles et noms d'accueillants **ne seront recopiés nulle part** quand ils
paraîtront : ni dans `lib/mel.js`, ni dans l'arbre de décision, ni dans le guide
d'arrivée. Les trois endroits renvoient vers les renseignements du service —
**06 62 65 59 04**, `laep@ccterresduvaldeloire.fr`,
`https://www.ccterresduvaldeloire.fr/laep-lieu-accueil-enfants-parents/` — et vers la
mairie.

Raison : ces créneaux changeront — c'est un service itinérant qui démarre — et rien dans
la chaîne de déploiement ne préviendra que la copie a vieilli. C'est la leçon des horaires
de bruit inventés (v4.83) et celle des tarifs de la salle communale (ADR-0013 backend) :
**une donnée qui vit ailleurs et qui bouge ne se duplique pas, elle se référence.**
`test/laep.test.js` (dépôt backend) refuse toute mention d'un horaire ou d'un jour de la
semaine dans la réponse.

### 2. Trois formulations verrouillées, pas laissées à l'IA

- « ce n'est pas un mode de garde, l'adulte reste avec l'enfant » ;
- la liste des quatre communes d'accueil, **Mézières exclue explicitement** ;
- gratuit / confidentiel / sans inscription.

Elles sont portées par une `DIRECT_RULE` (réponse sans appel IA), par un bloc
`LAEP — LIEU D'ACCUEIL ENFANTS-PARENTS` du `SYSTEM_PROMPT` et par le prompt du topic
`enfance`. La règle est placée **avant** `centre_loisirs` dans `DIRECT_RULES`, dont
l'ordre fait la priorité : un LAEP n'est pas un accueil de loisirs.

### 3. La fiche du guide d'arrivée est corrigée dans la même PR

« Pensez au périscolaire, à la cantine et à la **petite enfance** » : la crèche est
rattachée à Cléry-Saint-André, Mézières nommée commune partenaire, et le LAEP ajouté.

## Conséquences

- Quatre endroits doivent rester en phase sur le LAEP : la règle `laep` et le bloc
  `SYSTEM_PROMPT` de `chatbot-mairie-mezieres/lib/mel.js`, les deux copies de l'arbre de
  décision (`data/mel-tree.json` **et** `js/mat-mel.js`), et la fiche `periscolaire` de
  `js/mat-guide-arrivee.js`.
- Le jour où la Communauté de Communes ajoutera Mézières aux communes d'accueil, c'est
  la liste des quatre communes qu'il faudra corriger — pas ajouter un horaire.
- **Ce qui reste ouvert** : l'arbre de décision existe en deux copies (JSON éditable
  depuis l'admin, et objet JavaScript de repli), qui divergent déjà sur d'autres entrées
  (les tarifs de cantine figurent dans l'une, pas dans l'autre). Aucun test ne les
  compare. Le LAEP a été ajouté aux deux à la main ; ce sera vrai du prochain sujet aussi,
  jusqu'à ce que la double source soit supprimée.
