# Instructions pour Claude Code — MAT Mézières Avec Toi

## Changelog (`index.html` → overlay `ov-changelog`)

À chaque changement **significatif pour les habitants** (nouvelle fonctionnalité, amélioration visible, correction notable) :

1. **Ajouter une entrée en tête** du changelog dans `index.html` (template `data-lazy-ov` de `ov-changelog`), format :
   ```html
   <div style="background:var(--mist);border-radius:12px;padding:12px 14px">
   <div style="font-size:0.65rem;font-weight:900;color:var(--leaf);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:6px">🗓️ JJ mois AAAA — vX.Y</div>
   <ul style="margin:0;padding-left:18px;font-size:0.8rem;color:var(--text);line-height:1.7">
   <li>…</li>
   </ul>
   </div>
   ```
   L'entrée précédente perd son fond `var(--mist)` et prend `border:1px solid var(--border)`.

2. **Mettre à jour la version affichée** (`v4.XX`) dans deux endroits :
   - `<div class="mat-version" …>vX.Y · …</div>` (header mobile)
   - `<button onclick="openChangelog()" …>🆕 vX.Y</button>` (bouton desktop)

3. **Bumper le cache SW** dans `service-worker.js` : `mat-vX.Y.Z` → `mat-vX.Y.Z+1` pour que les utilisateurs existants reçoivent la notification de mise à jour.

### Changements considérés comme significatifs
- Nouvelle fonctionnalité visible par les habitants
- Amélioration de performance ou de chargement notable
- Nouveau badge ou indicateur affiché
- Correction d'un bug visible côté utilisateur
- Tout changement UX (texte, couleur, comportement d'overlay…)

### Changements non significatifs (pas de changelog)
- Corrections CI/CD internes
- Ajustements de workflow GitHub Actions
- Refactoring interne sans impact utilisateur
- Mise à jour de dépendances sans effet visible

## Service Worker

- Toujours bumper `CACHE` dans `service-worker.js` quand `index.html`, un `.js` ou un `.css` chargé par l'app est modifié.
- Format : `mat-vX.Y.Z` — incrémenter uniquement le patch (Z) pour les ajustements mineurs, le mineur (Y) pour les fonctionnalités.
