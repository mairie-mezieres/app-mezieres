# Audit PWA — iOS 26 « web app par défaut »

*Audit réalisé le 11 juin 2026 (MAT v4.36.4, SW mat-v4.36.5).*

## Contexte

Depuis iOS 26, **tout site ajouté à l'écran d'accueil s'ouvre par défaut en
mode web app** (plein écran, sans interface Safari), même sans manifest.
Auparavant, seuls les sites avec `display: standalone` bénéficiaient de ce
comportement ; les autres s'ouvraient comme de simples signets Safari.

Pour MAT, c'est une opportunité majeure côté seniors sur iPhone : le geste
« Partager → Sur l'écran d'accueil » suffit désormais à obtenir une
expérience d'app native, sans étape supplémentaire.

## Résultats de l'audit

### Manifest (`manifest.webmanifest`) — ✅ conforme

| Champ | Valeur | Verdict |
|---|---|---|
| `start_url` | `./` (relatif) | ✅ correct sous le domaine `mezieres-lez-clery.fr` |
| `id` | `./` | ✅ identité stable de l'app |
| `display` | `standalone` | ✅ mode app dès avant iOS 26 |
| `scope` | absent (défaut = répertoire du manifest) | ✅ suffisant |
| `icons` | 192 + 512 px, `any` + `maskable` | ✅ |
| `share_target` | POST multipart | ℹ️ ignoré par iOS (Android uniquement), sans effet de bord |
| `shortcuts` | MEL, Signalement | ℹ️ ignorés par iOS, utiles sur Android |

### Icônes — ✅ fonctionnel

- `apple-touch-icon` présent (`icon-192.png`) : iOS l'utilise pour l'écran
  d'accueil. La taille canonique Apple est 180×180, mais 192×192 est
  redimensionné proprement par iOS — aucun changement requis.
- `icon-192.png` / `icon-512.png` vérifiés : dimensions réelles conformes
  aux déclarations du manifest.

### Service Worker — ✅ conforme

- Enregistré **inline dans le `<head>`** (`index.html:22`) avec chemin
  relatif `./service-worker.js` → scope correct, actif dès le premier
  chargement.
- `offline.html` précaché et servi sur échec de navigation → l'app installée
  fonctionne sans réseau.
- Stratégie stale-while-revalidate + prompt de mise à jour utilisateur
  (pas de `skipWaiting` automatique) → pas de rechargement surprise en
  pleine utilisation, important pour les seniors.
- iOS exécute les Service Workers normalement en mode web app depuis
  iOS 16.4 ; rien de spécifique à iOS 26.

### Affichage standalone — ✅ conforme

- Détection : `matchMedia('(display-mode: standalone)')` **et**
  `navigator.standalone === true` (spécifique iOS) — les deux chemins sont
  couverts (`mat-core.js:10`).
- `viewport-fit=cover` + `env(safe-area-inset-*)` appliqués sur header,
  panels, footer, barre TTS → pas de contenu sous l'encoche ni sous la barre
  d'accueil.
- `apple-mobile-web-app-status-bar-style: black-translucent` cohérent avec
  le header forêt.

### Notifications push — ✅ prêt

- Web Push iOS exige le mode web app installé (iOS 16.4+) : avec iOS 26,
  **davantage d'utilisateurs iPhone entrent en mode standalone**, donc
  deviennent éligibles aux notifications.
- Le prompt post-installation (`checkFirstStandaloneRun`) se déclenche au
  premier lancement standalone — il captera automatiquement ces nouveaux
  utilisateurs iOS 26.
- Le texte d'aide (overlay notifications) mentionne déjà « iOS 16.4+ ».

### Statistiques d'installation — ℹ️ à connaître

Le compteur d'installations (`trackStat('installation')`) se déclenche au
premier lancement standalone. Avec iOS 26, des utilisateurs qui ajoutaient
auparavant un simple signet seront désormais comptés comme installations —
attendre une hausse mécanique du compteur côté iPhone, qui reflète bien la
réalité d'usage.

## Conclusion

**Aucun correctif requis.** La PWA MAT est déjà entièrement conforme au mode
« web app par défaut » d'iOS 26 : manifest correct, icônes en place, Service
Worker opérationnel, safe-areas gérées, détection standalone iOS couverte,
chaîne push fonctionnelle.

Action recommandée côté communication (hors code) : promouvoir le geste
« Partager → Sur l'écran d'accueil » auprès des habitants sur iPhone,
puisqu'il suffit désormais à installer MAT comme une vraie app.
