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
| **« Le saviez-vous ? »** — le fait du jour, le corpus, la règle « aucune IA à l'exécution » | `docs/specifications/sfd/SFD-16-le-saviez-vous.md` puis `docs/adr/0012-…` |
| **Relire le corpus « Le saviez-vous ? » avant de le fusionner** (obligatoire, RG-16.13) | ouvrir `revue-saviez-vous.html` — corpus complet, ordre réel de passage, réponse et source |
| **Fibre** — qui fait quoi (Lysséo ≠ fournisseur d'accès), raccordement d'une construction neuve | `docs/adr/0013-fibre-operateur-d-infrastructure-et-fournisseur-d-acces.md` |
| **Documents du PLUi-H-D** — publiés par la mairie depuis l'admin (⚠️ **ne plus éditer `PLUI_DOCS` à la main**), cache hors-ligne, pastille « Nouveau » | `docs/adr/0014-documents-plui-administrables-page-embarquee.md` puis `chatbot-mairie-mezieres/GUIDE-ADMIN.md` §6quater |
| **Documents officiels** (écran 📁, `/docs/featured` + `/docs/temp`) — pastille « Nouveau », clés `mat_docs_seen` / `mat_docs_cache`, ⚠️ le document à la une n'a **pas d'`id`** (sa date de publication en tient lieu) | `docs/guide-technique.md` §7 « Documents officiels — pastille Nouveau » puis `docs/guide-utilisateur.md` §4 bis |
| **Carte 3D du village** — zonage PLU, MapLibre chargé à la demande, ⚠️ **INSEE 45204** (45203 = Meung-sur-Loire), règle « aucune donnée inventée » | `docs/adr/0018-carte-3d-chargement-a-la-demande-et-jamais-de-donnee-inventee.md` puis `docs/specifications/sfd/SFD-17-carte-3d-du-village.md` |
| **Rendu du bâti 3D** — toits en pente par tranches, pourquoi pas de texture de façade, pourquoi les murs tiennent en **une seule** couche (le clic) | `docs/adr/0020-toits-en-pente-par-tranches-et-abandon-de-la-texture-de-facade.md` puis `SFD-17` §RG-17.14 à RG-17.18 |
| **Vue « territoire » — les 25 communes de la CCTVL** : ⚠️ **aucun code INSEE en dur** (seuls les 25 noms), aucune règle hors Mézières, piège « 1AU » | `docs/adr/0021-territoire-des-25-communes-aucun-code-insee-en-dur.md` puis `SFD-17` §RG-17.19 à RG-17.23 |
| **Écrire un nom sur la carte 3D** (communes, et un jour lieux-dits/quartiers) — ⚠️ **pas d'URL `glyphs`** dans le style : une couche `symbol` ne rend RIEN, sans erreur ; d'où des marqueurs HTML, leur anticollision à la main et `pointer-events:none`. Le **Plan IGN porte déjà les lieux-dits** (vérifier l'existant). Sources possibles et pourquoi aucune n'est branchée de mémoire | `docs/adr/0026-noms-de-lieux-marqueurs-html-faute-de-glyphes.md` puis `SFD-17` §RG-17.29 |
| **Alerte météo & « Prochains risques »** — frise de l'alerte, seuils anti-bruit (UV ≥ 8, pas de répétition du phénomène en vigilance), ⚠️ `daily[0]` est **HIER** | `docs/guide-technique.md` §« Carte d'alerte météo » puis `tests/e2e/meteo-alerte.spec.js` |
| **Fenêtre météo** — carte « Maintenant », cache hors-ligne daté (`mat_meteo_cache`), aucune donnée absente affichée comme un 0, échelle UV | `docs/adr/0022-fenetre-meteo-afficher-ce-qui-est-mesure-et-rien-d-autre.md` puis `tests/e2e/meteo-overlay.spec.js` |
| **Écart à la normale du mois** — ⚠️ **ERA5 est une réanalyse, PAS une station** (ne jamais l'annoncer autrement) ; on compare la **maximale du jour** à la normale des maximales, jamais la température de l'instant ; emphase à partir de 3 °C ; tout ou rien | `docs/adr/0024-normales-era5-une-reanalyse-annoncee-comme-telle.md` puis `docs/guide-technique.md` §7 et `chatbot-mairie-mezieres/GUIDE-ADMIN.md` §6quinquies |
| **Veille technologique — canal actionnable** : issue « Actions PWA », puis **PR draft automatiques** (garde-fou de périmètre, dédoublonnage par URL, ⚠️ ces PR n'ont pas de coche verte) | `docs/adr/0005-veille-canal-actionnable-issue-pwa.md` puis `docs/adr/0023-veille-pr-draft-sous-barriere-pas-sous-consigne.md` et `docs/guide-technique.md` §10 |
| **Veille municipale (élus)** — subventions et obligations, profil `veille/commune.yml` (⚠️ **connaissance ET plan de recherche**, pas mise en forme), mémoire + fenêtre `J-35`, envoi test → conseil par secret | `docs/adr/0025-veille-municipale-memoire-et-fenetre-de-publication.md` puis `docs/guide-technique.md` §10 et `veille/README.md` |
| **La mémoire d'une veille ne s'écrit jamais dans le prompt** — l'agent produit un JSON, un script écrit le Markdown ; sinon l'étape est sautée en silence et la veille se répète | `docs/adr/0027-veille-municipale-la-memoire-est-ecrite-par-du-code.md` |
| **LAEP (Lieu d'Accueil Enfants-Parents)**, et plus généralement un service **intercommunal** — ⚠️ le LAEP n'est **pas un mode de garde** et **ne passe pas par Mézières** ; ses **créneaux ne sont dans aucun code** (référencés, jamais recopiés) ; quatre endroits à garder en phase | `docs/adr/0028-laep-un-service-intercommunal-qui-ne-passe-pas-par-mezieres.md` puis `docs/guide-utilisateur.md` §6 |
| Déployer pour une nouvelle commune (de zéro) | `docs/DEPLOIEMENT.md` |
| Répliquer / adapter l'app à une autre collectivité | `docs/REPLICATION.md` |
| Sécurité, signalement de vulnérabilité, périmètre | `SECURITY.md` |
| **« Est-ce qu'une alerte CERT-FR nous concerne ? »**, inventaire des domaines/hébergeurs/technologies, prestataires | `docs/surface-exposition.md` |
| Historique des versions techniques | `CHANGELOG.md` |
| Présentation générale du frontend | `README.md` |
| **Accessibilité clavier** — pourquoi `role="button"` et pas `<button>`, pourquoi axe ne voit pas un `<div onclick>`, quelles exceptions sont admises | `docs/adr/0016-clavier-axe-ne-voit-pas-un-div-onclick.md` puis `tests/e2e/accessibilite-clavier.spec.js` |
| **Taille du texte** — plancher de 12 px, pourquoi pas 16 px, pourquoi `body{font-size:1rem}`, ce qui reste à traiter (desktop, overlays, admin) | `docs/adr/0017-plancher-typographique-12px-mesure-sur-le-rendu.md` puis `tests/e2e/typographie.spec.js` |
| **Cerfa d'urbanisme** (lien « Cerfa DP » du zonage PLU, corpus « Le saviez-vous ? ») — ⚠️ les **13703, 13702 et 13404 sont abrogés** depuis le 1er janvier 2025 (→ **16702** et **16703** ; le PC reste le **13406**) ; ne jamais écrire de **millésime** (« 16702\*02 ») ; quatre endroits à garder en phase | `docs/adr/0029-un-numero-de-formulaire-mort-ne-se-voit-pas.md` puis `chatbot-mairie-mezieres/test/urbanisme-cerfa.test.js` |
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

> ⛔ **Le cache bouge ⇒ le numéro AFFICHÉ bouge.** Pas d'exception, même pour un
> correctif. La v4.74.1 a été fusionnée, testée, déployée avec succès… en continuant
> d'afficher `v4.74` : le porteur cherchait le nouveau numéro sur son téléphone et a
> conclu, à juste titre, que rien n'était arrivé. `index.html` n'étant pas versionné et
> le cache étant invisible, **ce numéro est le seul signal dont dispose un habitant**.
> Un déploiement muet est indistinguable d'un déploiement raté.
> `node scripts/check-cache-bust.js` le refuse désormais (contrôle 3), et la CI aussi.

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

### ⛔ Modifier `js/xxx.js`, c'est incrémenter son `?v=` — aux TROIS endroits

`index.html`, `js/mat-boot.js` et `service-worker.js`. Le service worker sert en
**stale-while-revalidate** : tant que l'URL ne change pas, l'habitant reçoit la copie
en cache. Un fichier modifié sans nouveau `?v=` **n'arrive jamais chez lui**.

`js/mat-boot.js` est resté en `?v=4.4.1` pendant trois modifications (v4.64 → v4.66) :
les habitants recevaient l'ancien boot, qui demandait l'ancien `mat-carte3d.js`. Le
bouton « Où suis-je » s'affichait — `index.html` n'est pas versionné — mais ne
répondait pas. Tout était vert : tests, CI, déploiement. Voir **ADR-0019**.

⚠️ **Les tests ne peuvent pas voir ce bug** : Playwright part d'un profil vierge et le
service worker y est bloqué (ADR-0006). Le contrôle est donc fait par
`node scripts/check-cache-bust.js`, lancé par la CI.

**Effet de cascade** : les modules différés (`mat-carte3d.js`, `mat-saviez-vous.js`,
`mat-plui.js`…) voient leur URL écrite **dans `js/mat-boot.js`**. Bumper l'un d'eux modifie
donc `mat-boot.js`, **qui doit être bumpé à son tour** — sinon l'habitant reçoit l'ancien
boot, qui réclame l'ancienne version du module, et le correctif n'arrive pas. Le contrôle
de CI attrape ce cas ; il l'a fait dès la première occasion.

## ⛔ Édition de fichiers — règles non négociables

**Incident du 1ᵉʳ août 2026 : `docs/guide-technique.md` est passé de 41 Ko à 85 Mo
(1 423 125 lignes) et a été poussé sur `main` sans que personne ne le voie.**
Une substitution par script dont le motif matchait la **chaîne vide** a inséré son
bloc de remplacement entre *chaque caractère* du fichier — 39 508 copies. Tout le
contenu réel avait disparu. Les déploiements GitHub Pages sont passés de 48 s à
plus de 20 minutes (Jekyll traite les `.md` du dépôt). Détecté seulement 2 versions
plus tard. Voir `docs/adr/0009-edition-de-fichiers-verifier-avant-de-commiter.md`.

Ce qui a permis le désastre : le fichier n'a jamais été rouvert après modification,
et `git add -A` ne dit rien de la taille de ce qu'il ajoute.

**Règles :**

1. **Utiliser l'outil `Edit`** pour modifier un fichier existant. Il échoue
   proprement si le motif est absent ou ambigu — un script de substitution, non.
2. **Ne jamais** faire de `re.sub` / `sed` / `.replace()` sur un fichier entier via
   un script sans avoir vérifié que le motif ne peut pas matcher la chaîne vide
   (`*`, `?`, `{0,n}`, alternance avec branche vide…).
3. **Après toute édition automatisée, vérifier avant de commiter** :
   ```bash
   ls -la <fichier> && wc -l <fichier>
   ```
   Une variation de taille sans rapport avec l'ampleur du changement = STOP.
4. **Avant tout commit**, contrôler ce qui part réellement :
   ```bash
   git diff --stat --cached
   ```
   Des dizaines de milliers de lignes ajoutées sur un fichier de doc = STOP.
5. Ne pas se fier au succès d'un script pour conclure que le résultat est correct :
   **relire le fichier** (ou au minimum sa taille et ses titres de section).
6. **En CSS, après avoir supprimé un bloc, compter les accolades.** Une accolade
   fermante orpheline ne casse pas la page : le parseur la consomme **avec le
   sélecteur qui suit**, donc **une seule règle disparaît**, silencieusement, et
   tout le reste du fichier continue de s'appliquer. C'est ainsi que les étoiles
   du ciel nocturne sont restées invisibles six jours (v4.52.1 → v4.60). Lancer
   `node scripts/check-css.js` — la CI le fait aussi. Voir ADR-0015.
7. **Un test qui n'interroge que le JS ne prouve pas qu'un effet est visible.**
   Quand un effet est produit par du JS mais habillé par du CSS, asserter le
   **style calculé** (`getComputedStyle`), pas seulement l'état interne.
