# ADR-0014 — Documents du PLUi-H-D : administrables, alors que la page reste embarquée

- **Date** : 7 août 2026
- **Statut** : Accepté

## Contexte

La page « Grand dossier PLUi-H-D » (`js/mat-plui.js`, livrée en v4.53) affiche
quatre blocs : une explication, une frise d'avancement, les moyens de donner son
avis, et une liste de documents officiels. Ce dernier bloc annonçait depuis le
premier jour :

> Les documents seront publiés ici prochainement.

Et il n'y avait aucun moyen que cela change. La liste était un tableau vide
écrit en dur :

```js
// VIDE pour l’instant. Ajouter un objet { titre, url, date }…
var PLUI_DOCS = [];
```

Publier un document supposait donc : éditer un fichier JavaScript, bumper le
cache du service worker, commiter, pousser, attendre le déploiement. Autrement
dit, appeler un développeur. Le commentaire décrivait la marche à suivre pour
quelqu'un qui n'ouvrira jamais le fichier.

Le déclencheur : l'enquête publique est ouverte, la mairie a le dossier en PDF,
et d'autres documents suivront jusqu'à l'approbation prévue fin 2028. Une
fonctionnalité dont la mise à jour dépend d'un tiers extérieur à la mairie est
une fonctionnalité qui ne vivra pas.

## Décision

**Le contenu éditorial de la page reste embarqué ; seuls les documents passent
par le backend.**

- **Restent dans `js/mat-plui.js`** : la frise chronologique, les textes
  d'explication, les quatre moyens de participer. Ils changent au rythme d'un
  commit relu, et doivent rester lisibles hors connexion sans condition.
- **Passe au backend** : la liste des documents, via `GET /docs/plui` et une
  section dédiée de l'onglet 📁 Documents de l'administration
  (`POST`/`DELETE /admin/docs/plui`). Stockage `mat:docs:plui`, calqué sur le
  mécanisme déjà éprouvé des « documents temporaires » (`routes/docs.js`).

Trois conséquences retenues explicitement :

1. **Le cache local n'est pas optionnel.** La page promettait la consultation
   hors ligne ; la faire dépendre du réseau aurait été une régression silencieuse.
   La dernière liste reçue est donc conservée dans `localStorage`
   (`mat_plui_docs_cache`) et sert de source quand le réseau manque.
2. **La liste se rafraîchit au démarrage de l'app, pas à l'ouverture de la page.**
   La pastille « Nouveau » n'a de sens que si elle s'allume *avant* que
   l'habitant ouvre la page. La charger seulement à l'ouverture aurait rendu le
   badge structurellement inutile : il ne se serait allumé qu'une fois la page
   déjà vue. Le rafraîchissement est différé de 2,5 s pour ne pas concurrencer
   les widgets d'accueil au premier rendu.
3. **Deux façons de fournir un document, pas une.** L'envoi direct du PDF depuis
   l'admin est plafonné à 4 Mo — conséquence de la limite de corps de requête du
   backend (6 Mo) et du gonflement d'un tiers dû à l'encodage base64. Or les
   documents d'urbanisme (diagnostic, PADD avec cartes) dépassent couramment ce
   seuil. L'écran accepte donc **aussi** un lien externe, sans limite de taille,
   et refuse le fichier trop lourd *dans le navigateur* en indiquant la marche à
   suivre, plutôt que de laisser partir une requête qui reviendrait en 413.

## Alternatives écartées

- **Tout embarquer, comme le guide d'arrivée (ADR-0010).** Ce choix se justifie
  pour un contenu qui décrit des démarches stables et se relit avant publication.
  Il ne se justifie pas ici : le rythme de publication est dicté par la CCTVL, pas
  par nous, et chaque document impose sinon un aller-retour développeur.
- **Réutiliser tel quel les « documents temporaires ».** Le mécanisme existe et
  fonctionne, mais mélanger les documents de la commune et ceux du PLUi dans une
  seule liste aurait rendu les deux écrans confus, et privé le PLUi de la `date`
  dont dépendent le tri et la pastille. Une liste séparée reprenant le même
  patron coûte moins cher qu'un champ « catégorie » greffé sur l'existant.
- **N'accepter que des liens.** Plus simple à construire, mais impose à la mairie
  de trouver un hébergement pour chaque PDF, y compris une note de deux pages.
- **N'accepter que des fichiers.** Plus simple à l'usage, mais rend structurellement
  impubliables les gros documents — ceux qui comptent le plus.

## Conséquences

- Le commentaire « Ajouter un objet `{ titre, url, date }` » disparaît du code :
  ce n'est plus la marche à suivre. Elle est décrite dans `GUIDE-ADMIN.md`
  §6quater, à destination de la mairie.
- Une double source apparaît en creux : la limite de 4 Mo est écrite à trois
  endroits (garde-fou navigateur dans `admin.html`, `_isLargeBodyRoute` dans
  `app.js` côté backend, et la documentation). Si la limite du backend bouge, les
  trois doivent bouger ensemble.
- Supprimer un document supprime aussi le fichier hébergé, pour ne pas accumuler
  des PDF orphelins que plus rien ne référence. L'action est tracée au journal
  d'audit, comme toute suppression admin.
- Le PDF est envoyé à Cloudinary en `resource_type: "raw"` et non `"image"` :
  en `"image"`, Cloudinary applique aux PDF ses restrictions de transformation
  et la livraison est bloquée. L'extension `.pdf` doit figurer dans le
  `public_id`, sans quoi le fichier est servi en binaire anonyme au lieu de
  s'ouvrir dans le navigateur.

## Mise à jour du 7 août 2026 — l'URL doit être signée

Le premier document envoyé depuis l'admin s'est bien téléversé, et son lien a
répondu **HTTP 401** dans le navigateur. Le formulaire disait « Document
publié », la liste l'affichait, et personne ne pouvait l'ouvrir : la pire forme
de panne, celle qui se présente comme un succès.

Cause : Cloudinary bloque **par défaut** la livraison des « types de médias
restreints », PDF en tête, et répond 401 sur l'URL nue. `resource_type: "raw"`
était nécessaire mais **pas suffisant** — la conséquence notée ci-dessus était
donc incomplète. Le contournement documenté par Cloudinary est la **signature de
l'URL** : une URL signée est délivrée même quand le type est restreint.

Deux façons de s'en sortir, et le choix retenu :

| | |
|---|---|
| Décocher la restriction dans la console Cloudinary | Corrige tout d'un coup, mais c'est un réglage de compte invisible depuis le code : la prochaine personne qui déploiera MAT pour une autre commune retombera exactement dans le même piège, sans rien pour l'avertir |
| **Signer l'URL côté serveur** *(retenu)* | Le correctif vit dans le dépôt, se teste, et fonctionne quel que soit le réglage du compte |

Conséquence de conception : **l'URL de livraison n'est plus stockée**. Elle est
reconstruite signée à chaque lecture de `GET /docs/plui`, à partir du seul
`publicId` (`pluiDocUrl()` dans `lib/cloudinary.js`). Deux bénéfices : les
documents envoyés avant le correctif sont réparés sans migration de données, et
une rotation de la clé Cloudinary ne laisse pas derrière elle des liens morts
figés en base. Un document ajouté par lien externe garde évidemment le sien.

Verrouillé par `test/plui-url-signee.test.js` — `cloudinary.url()` ne fait que
construire une chaîne, le test reste donc déterministe et hors-ligne.
