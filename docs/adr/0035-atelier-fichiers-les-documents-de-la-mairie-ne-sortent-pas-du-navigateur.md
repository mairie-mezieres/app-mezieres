# ADR-0035 — Atelier fichiers : les documents de la mairie ne sortent pas du navigateur

- **Statut** : accepté
- **Date** : 2 septembre 2026
- **Portée** : `admin.html` (onglet 📎 Atelier fichiers), `js/mat-atelier-fichiers.js`,
  `vendor/pdfjs`, `vendor/pdf-lib`, `vendor/jszip`, `package.json`, `scripts/vendor-libs.js`

## Contexte

La mairie manipule en permanence des fichiers trop lourds : une photo de 8 Mo qu'il
faut passer sous les 500 Ko pour un post, un procès-verbal scanné de 20 Mo à joindre
à un courriel, un lot de justificatifs à réunir en un seul PDF. Jusqu'ici, la
réponse était un site de conversion en ligne — donc **téléverser un document
communal chez un tiers inconnu**, parfois un projet de délibération, parfois une
pièce nominative.

Tout ce que ces outils font est faisable dans le navigateur : `canvas.toBlob` pour
réencoder une image, pdf.js pour rasteriser un PDF, pdf-lib pour en écrire un.
Aucun serveur n'est nécessaire.

## Décision

**Un onglet de l'administration, dont le traitement s'exécute intégralement dans le
navigateur, et dont on peut le prouver d'un coup d'œil.**

Cinq outils : compresser des images vers un poids cible, compresser un PDF, extraire
les pages d'un PDF en images, assembler images et PDF, extraire le texte d'un PDF.

Quatre propriétés sont **la raison d'être** de l'outil, pas des détails
d'implémentation. Les perdre, c'est reconstruire le problème qu'on voulait supprimer :

1. **Aucun octet ne sort.** Pas de `fetch`, pas de `XMLHttpRequest`, pas de balise
   vers un domaine tiers, aucune télémétrie, et **aucun nom de fichier dans un
   `console.*`** — un nom de fichier est déjà une donnée (« recours-gracieux-M-X.pdf »).
2. **Aucun stockage persistant.** Ni `localStorage`, ni `sessionStorage`, ni
   IndexedDB, ni Cache API. Tout vit en mémoire ; fermer l'onglet ne laisse rien.
3. **Aucun domaine externe.** Les trois bibliothèques sont servies depuis `vendor/`.
4. **Aucun script en ligne dans le module.** Uniquement `addEventListener`, pour que
   le module reste valide sous une politique de sécurité de contenu stricte, même si
   la page qui l'héberge ne l'est pas encore (voir « Ce qu'on n'a pas fait »).

### Pourquoi `vendor/` et pas un CDN

C'est la question qui décide de tout le reste. Un `<script src="https://un-cdn/...">`,
c'est une requête sortante à chaque ouverture — donc un tiers qui apprend que la
mairie ouvre l'outil — et surtout **un tiers qui peut changer le code qui manipule
ces documents**, sans que personne ici ne le voie. Une intégrité SRI fige le
contenu, pas la disponibilité, et ne dit rien de la version suivante.

`package.json` fige les versions (`pdfjs-dist@3.11.174`, `pdf-lib@1.17.1`,
`jszip@3.10.1`), `npm run vendor` les recopie dans `vendor/`, et `vendor/` est
committé. ⚠️ **Ce `package.json` ne construit rien** : l'application est servie
telle quelle par GitHub Pages. Une dépendance qui reste dans `node_modules/`
n'arrive jamais chez l'utilisateur.

pdf.js est figé en **3.11.174** et pas en version récente : à partir de la 5,
`page.render()` attend `canvas` là où le code éprouvé passe `canvasContext`.
Monter de version, c'est réécrire — et remesurer — le moteur de rendu.

### Pourquoi un worker pdf.js unique

pdf.js réclame son worker **par URL**, donc une requête réseau à chaque
`getDocument`. Trois traitements PDF, trois lignes dans l'onglet Réseau — mesuré.
Rien n'en sortait : c'est notre propre fichier, servi depuis notre propre domaine.

On l'a quand même supprimé, et la raison n'est pas technique. **La promesse est
« aucun appel réseau pendant le traitement », et un journal réseau vide se vérifie
d'un coup d'œil**, par n'importe qui, sans rien connaître au dossier. « Ces trois
lignes-là sont inoffensives » demande une enquête, et une enquête qu'on doit refaire
à chaque relecture finit par ne plus être faite. Le worker est donc construit **une
fois**, à l'ouverture de l'onglet, et partagé via `GlobalWorkerOptions.workerPort`.
`workerSrc` reste renseigné en repli.

### Le poids, et pourquoi il ne coûte rien

1,94 Mo de bibliothèques. Elles ne sont demandées qu'à **l'ouverture de l'onglet** —
même procédé que MapLibre pour la carte 3D (ADR-0018). Tant qu'on ne clique pas sur
📎, l'administration ne pèse pas un octet de plus qu'avant.

## Conséquences

- Les fichiers de la mairie ne transitent plus par un service tiers.
- L'outil fonctionne **hors connexion** une fois l'onglet ouvert.
- Le travail est plafonné par la mémoire de la machine : un PDF de plusieurs
  centaines de pages peut faire souffrir un téléphone. C'est un compromis assumé —
  l'alternative était de téléverser le document.
- Deux endroits doivent rester en phase : les versions de `package.json` et les
  chaînes `?v=` des trois `<script>` de `js/mat-atelier-fichiers.js`. Une montée de
  version qui oublie les secondes sert l'ancienne copie en cache (le service worker
  répond en *stale-while-revalidate*, cf. ADR-0019).

## Ce qu'on n'a pas fait, et pourquoi

- **Rendre `admin.html` conforme à une politique de sécurité stricte.** La page est
  deux `<script>` en ligne de 3 700 lignes, tous ses boutons portent un `onclick=`,
  et elle charge Chart.js depuis `cdn.jsdelivr.net`. Le module ajouté ici est
  conforme ; la page ne l'est pas, et la rendre conforme est un chantier distinct
  qu'il ne fallait pas dissimuler dans celui-ci.
- **Traiter l'onglet au titre du RGAA.** `admin.html` est hors périmètre de l'audit
  (usage interne, non ouvert au public) — c'est écrit dans
  `docs/accessibilite/audit-rgaa-2026-08-27.md` et dans le schéma pluriannuel. Les
  libellés associés aux champs et le focus visible de la maquette ont été conservés
  parce qu'ils y étaient déjà, pas au titre d'une obligation.
- **Corriger l'étiquette des préréglages de poids.** « 100 Ko » vise en réalité
  0,1 × 1 048 576 = 104 858 octets, soit 102 Ko. L'écart est de 2 % et le moteur est
  éprouvé : on ne touche pas à un calcul mesuré pour un arrondi d'affichage.
- **Écrire un test E2E.** Les suites Playwright du dépôt couvrent l'application
  habitant. L'outil a été vérifié à la main sur de vrais fichiers (photo de 7,3 Mo,
  PDF illustré de 6 pages) : poids cible tenu, journal réseau vide, stockage intact.
