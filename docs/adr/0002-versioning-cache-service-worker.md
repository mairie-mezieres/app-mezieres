# ADR-0002 — Versioning du cache Service Worker (`mat-vX.Y.Z`)

- **Date** : mai 2024
- **Statut** : Accepté

## Contexte

Le Service Worker précache les fichiers statiques (HTML, JS, CSS) pour le mode hors-ligne.
Quand une nouvelle version est déployée, les utilisateurs qui ont une version en cache ne
reçoivent pas la mise à jour tant que le nom du cache n'a pas changé. Sans discipline de
versioning, deux problèmes surgissent :

1. Les utilisateurs gardent indéfiniment une vieille version sans le savoir.
2. Les fichiers JS/CSS référencés avec un `?v=X.Y.Z` dans `PRECACHE_URLS` ne correspondent
   plus aux fichiers servis → erreurs silencieuses au chargement.

## Décision

Nous appliquons les règles suivantes, obligatoires et vérifiées à chaque PR :

1. **Nom du cache** dans `service-worker.js` : `mat-vX.Y.Z`
   - Incrémenter **Z** (patch) pour tout changement mineur d'un fichier précaché.
   - Incrémenter **Y** (mineur) pour une nouvelle fonctionnalité visible.
2. **Query strings des fichiers JS/CSS** (`?v=X.Y.Z`) dans `service-worker.js` (tableau
   `PRECACHE_URLS`) et dans `js/mat-boot.js` doivent être **identiques** entre eux.
3. Ces versions dans `index.html` (attributs `src="…?v=X.Y.Z"`) doivent correspondre.
4. La règle est rappelée dans `CLAUDE.md` (§ Service Worker) pour être appliquée même
   après une compaction de contexte.

## Conséquences

**Positives :**
- Les utilisateurs reçoivent systématiquement la nouvelle version dès leur prochaine visite.
- Le Service Worker affiche une bannière « Mise à jour disponible » qui déclenche
  `skipWaiting` + rechargement silencieux.
- Les incohérences de version entre `mat-boot.js` et `service-worker.js` sont détectables
  via une simple recherche textuelle avant merge.

**Négatives / compromis acceptés :**
- Nécessite une discipline manuelle à chaque PR touchant un fichier précaché.
- Le patch Z peut monter vite en cas de nombreux petits correctifs successifs —
  acceptable car il n'a pas de signification sémantique forte.

**Points de vigilance pour les futures évolutions :**
- Si le nombre de fichiers précachés devient très grand, envisager un outil de génération
  automatique du manifeste (Workbox ou équivalent) — mais ajouter une dépendance de build
  n'est pas anodin pour une app volontairement sans bundler.
