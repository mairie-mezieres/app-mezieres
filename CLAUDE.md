# Instructions pour Claude Code — MAT Mézières Avec Toi

## 📚 Documentation — aiguillage OBLIGATOIRE (à lire avant d'agir)

Ce fichier est le **seul** document automatiquement chargé à chaque session. Toute la
connaissance détaillée vit dans les fichiers ci-dessous. **Avant de coder, de répondre
à une question d'architecture, ou de créer une fonctionnalité, ouvre le(s) document(s)
correspondant(s)** — ne raisonne pas de mémoire et ne réinvente pas l'existant.

Règle d'or : **vérifier qu'une fonctionnalité n'existe pas déjà (code + UI + doc) avant de la construire.**

| Si la tâche touche à… | LIRE d'abord |
|---|---|
| Vue d'ensemble, conteneurs, déploiement, flux métier, modèle de données | `docs/architecture.md` (modèle C4) |
| Code, structure des fichiers, env, intégrations, **notifications push** (§8), **PWA/Service Worker** (§7), **webhook Facebook** (§9), CI/CD, ajout de feature (§12) | `docs/guide-technique.md` |
| Comportement attendu côté habitant (actus, agenda, MEL, signalements, idées, notifs, hors-ligne, RGPD) | `docs/guide-utilisateur.md` |
| Déployer pour une nouvelle commune (de zéro) | `docs/DEPLOIEMENT.md` |
| Répliquer / adapter l'app à une autre collectivité | `docs/REPLICATION.md` |
| Sécurité, signalement de vulnérabilité, périmètre | `SECURITY.md` |
| Historique des versions techniques | `CHANGELOG.md` |
| Présentation générale du frontend | `README.md` |
| **Décisions d'architecture** (pourquoi PWA, pourquoi ce versioning SW…) | `docs/adr/` — un fichier par décision |
| **Côté backend** (Trello, MEL, admin, diagnostic Services, env Render) | repo `chatbot-mairie-mezieres` → son `CLAUDE.md` puis `GUIDE-ADMIN.md` |

> ⚠️ Les notifications signalements/demandes/bugs reposent sur le **backend** (webhook
> Trello + tokens). Pour toute question sur ces notifs, lire **aussi** le `CLAUDE.md` et
> `GUIDE-ADMIN.md` du repo `chatbot-mairie-mezieres`.

Quand tu crées une doc durable, ajoute-la à ce tableau pour rester aiguillable.

## Règle de mise à jour de la documentation

**À chaque correction ou évolution du code**, avant de fermer la PR :
1. Identifier quelle(s) doc(s) décrivent la zone touchée (voir tableau ci-dessus).
2. Mettre à jour ces docs dans la **même PR** que le code.
3. Si une décision structurante est prise ou un bug non-évident corrigé → créer un ADR dans `docs/adr/`.

Cas typiques :
- Nouveau comportement d'une notification push → `docs/guide-technique.md` §8
- Nouvelle route admin ou nouveau check diagnostic → `GUIDE-ADMIN.md` du backend
- Changement de comportement visible habitant → `docs/guide-utilisateur.md`
- Décision « pourquoi on ne fait pas X » → ADR

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
