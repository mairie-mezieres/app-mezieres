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
| **Accessibilité RGAA** — audit **complet** (106 critères, aucun sans verdict, **100 %** depuis la v4.97, mention *totalement conforme*), **schéma pluriannuel 2026-2029** et plan d'action publiés dans l'app, **aucune non-conformité** ; le plan devient un plan de **maintien** ; ⚠️ un contrôle qui ne mesure rien **ne rougit pas, il verdit** (axe sur un écran encore invisible ; repère de JSON introuvable dans `validite-html.yml`) | `docs/accessibilite/audit-rgaa-2026-08-27.md` et `docs/accessibilite/schema-pluriannuel.md`, puis `docs/adr/0030-axe-mesure-un-ecran-encore-invisible.md` |
| **Mention d'accessibilité** (décret n° 2019-768) — ⛔ elle est **obligatoire** en page d'accueil et atteignable depuis chaque page ; le libellé est celui du décret, pas une reformulation. ⚠️ **Deux pieds de page** la portent : `.footer` (mobile) et `.d-footer-links` (bureau, ≥ 1024 px) — l'un remplace l'autre, l'oublier quelque part la fait disparaître pour la moitié des habitants. ⛔ Si le taux change, la mention doit changer **en même temps que la déclaration** : `tests/e2e/mention-accessibilite.spec.js` refuse qu'elles divergent. ⛔ Si le taux change, la mention doit changer **en même temps que la déclaration** — et la **déclaration doit rester cohérente avec elle-même** : à 100 %, elle ne peut pas lister de chantiers restants (c'est arrivé, en production, la v4.98 l'a publié). ⚠️ `#decl-a11y` n'existe pas avant l'ouverture de l'écran (montage paresseux) | `tests/e2e/mention-accessibilite.spec.js` puis `js/mat-accessibility.js` (`openDeclarationA11y`) |
| **RGAA 5 / WCAG 2.2 — cibles et focus** — ⚠️ **anticipation, pas obligation** : le RGAA 5 (attendu fin 2026) intégrera les WCAG 2.2. Seuls **2.5.8** (cible ≥ 24 px) et **2.4.11** (focus non masqué) sont traités ; le reste attend le texte réel. ⛔ Le contrôle de 2.5.8 **doit rester déterministe** : sous l'exception d'espacement, une cible trop petite ne devient un défaut que si une voisine passe près — il concluait vert en solo et rouge en suite complète, sur la même app. D'où la bannière d'installation **dépliée de force** et l'assertion de couverture sur `.ib-x`. ⛔ Ne jamais durcir 2.5.8 en exigeant 24 px partout : ce serait plus sévère que la norme, donc une autre façon de ne pas mesurer la bonne chose | `tests/e2e/cible-taille.spec.js` puis l'audit §« Onzième passe » |
| **Déclarations de couleur (RGAA 10.5)** — ⛔ le critère se mesure par **élément rendu**, pas par déclaration : sa note admet un fond posé sur un **parent**. C'est en comptant les déclarations que l'audit s'était donné « ≈ 356 emplacements » à corriger, pour **9** en réalité (`.sec`, `.d-col-titre`, `.d-loading`). ⛔ Ne jamais « corriger » 10.5 avec `background:transparent` : déclarer la couleur **réellement peinte**. ⚠️ Le contrôle de 10.5.1 ne peut pas être mis en défaut par sabotage (le script anti-flash d'`index.html` pose un fond sur `documentElement` avant le CSS) — d'où l'**auto-contrôle du détecteur** dans le test | `tests/e2e/declarations-couleur.spec.js` puis l'audit §« Dixième passe » |
| **Contraste (RGAA 3.2)** — ⛔ un contrôle peut aussi **rougir à tort** : un dégradé se mesure **là où le texte est** (projeter son rectangle sur l'axe, sinon on mesure un orange qui vit sous les cartes), `getComputedStyle` rend une valeur **périmée** après un changement de thème (forcer la purge), et la photo du hero bureau est une couche **sœur** — d'où le `background` invisible de `.d-hero`, égal au pire cas du voile. ⛔ Et trois pièges qui font **verdir** un contrôle faux : un `rgba(255,255,255,.72)` **n'est pas du blanc** (compositer avant de comparer), un **dégradé** se mesure sur tout son continuum (`#38bdf8` échouait quand `#2563eb` passait, sur la même carte), et un **voile clair** sur fond sombre *éclaircit* le fond — d'où des voiles **sombres** sur les pastilles et les panneaux. Les libellés « Bac noir/jaune » ne portent plus la couleur : les **pastilles rondes** le font. Le voile du hero bureau est calculé pour le **pire cas absolu**, jamais sur la photo du jour | `docs/accessibilite/audit-rgaa-2026-08-27.md` §« Huitième » et « Neuvième passe », puis `tests/e2e/contraste-bandeaux.spec.js` et `tests/e2e/contraste-global.spec.js` |
| **Thèmes de couleur** (`theme-sombre`, `theme-bleu`, `colorblind-mode`, `high-contrast`) — ⛔ `--forest` et `--leaf` sont des verts foncés **utilisés comme texte** dans la palette claire, mais le thème sombre les redéfinit en **fonds** : toute règle qui les emploie en `color:` y devient du noir sur noir. ⛔ Une couleur écrite en **style inline** dans le JS est hors de portée de tout thème — la passer en classe. Les cinq rendus sont mesurés par `tests/e2e/contraste-global.spec.js` | `css/mat.css` (blocs `html.theme-sombre` / `html.theme-bleu`) puis l'audit §« Neuvième passe » |
| **Plan du site** (RGAA 12.1/12.3/12.4) — ⛔ **ouvrir un écran, ce n'est PAS `openOv(id)`** : `openOv` ne pose que la coquille, la fonction dédiée va chercher le contenu (`openConseil` = `openOv` **puis** `buildTrombi`). D'où `PLAN_OUVERTURE`, qui déclare la fonction de chaque écran (et ses arguments : `openSuivi()` sans type reste sur « Chargement… »). Ces fonctions sont **enveloppées pour les stats** — résoudre `window[nom]` au clic, jamais avant. ⚠️ ses intitulés sont **lus dans les écrans** (`.panel-title`), jamais recopiés ; seul le **classement par rubrique** est écrit à la main dans `PLAN_RUBRIQUES`, et `tests/e2e/plan-du-site.spec.js` **refuse tout écran ni classé ni écarté**. Une tuile d'accueil ne satisferait PAS 12.4 (elle disparaît dès qu'on ouvre autre chose) : l'accès doit rester en **pied de page** | `js/mat-plan-site.js` puis `tests/e2e/plan-du-site.spec.js` |
| **Structure de l'accueil (RGAA 9.1/9.3)** — ⛔ le `h1` est `.mat-title`, le titre **qui existait déjà** dans le bandeau ; les 7 `.sec` sont des `<h2>` et les 7 `.grid2` des `<ul>`. Leurs `margin:0` / `list-style:none` / `padding:0` en CSS **ne sont pas décoratifs** : les retirer décale tout l'accueil | `css/mat.css` (`.mat-title`, `.sec`, `.grid2`) puis l'audit §« Septième passe » |
| **Validité HTML (RGAA 8.2)** — `vnu` en local, une seule issue vivante, ⚠️ **ne fait pas échouer le build** ; **0 erreur depuis la v4.91** — le maintenir à zéro. ⛔ Les tuiles de l'accueil et les cartes à cocher de `partager.html` sont des `<span>` : leur `display:block` en CSS **n'est pas décoratif**, le retirer remet le sous-titre sur la ligne du titre | `.github/workflows/validite-html.yml` puis l'audit §« Sixième passe » et `tests/e2e/tuiles-mise-en-page.spec.js` |
| **« Aujourd'hui » / « Demain » / « Dans N j. »** (carte « Prochaine manifestation ») — ⛔ un nombre de jours ne se calcule **JAMAIS** par `(date - now) / 86400000` : ce quotient mesure une durée, pas des dates. Le conseil municipal du 31 août à 19 h s'annonçait « Demain » le 31 août au matin (0,48 j → `Math.ceil` → 1). Source unique : `matDaysUntil` / `matDaysLabel` (`js/mat-utils.js`) — le bureau **délègue**, il ne recopie pas | `docs/adr/0031-compter-des-jours-de-calendrier-pas-des-durees.md` puis `tests/e2e/prochaine-manifestation.spec.js` |
| **Fichiers injectés par `js/mat-boot.js`** (`mat-pwa-notif.js`, `mat-dechets-notif.js`, `mat-carte3d.js`…) — ⛔ ils ne peuvent **pas** tenir pour acquis qu'un autre `.js` a été chargé (cache partiel du SW) : `typeof f === 'function'` avant tout appel externe, repli local sinon. Un `ReferenceError` sur la 1ʳᵉ ligne de `checkFirstStandaloneRun` supprimait à la fois le comptage d'installations et la proposition d'activer les alertes, **sans rien afficher** — seule Sentry le voyait | `docs/adr/0032-un-script-injecte-ne-peut-pas-tenir-ses-dependances-pour-acquises.md` |
| **Prix carburant du bandeau d'accueil** — ⛔ un prix **sans sa date** se lit comme un prix du jour ; la station affichée n'est plus figée sur Cléry (repli sur la moins chère des relevés les plus récents) ; ⚠️ `maj` est une chaîne **sans année**, seul `majISO` se compare ; ⚠️ l'ellipse de fin de ligne rognait **exactement** la date ajoutée — d'où deux `<span>` en `flex` | `docs/adr/0033-un-prix-sans-sa-date-est-un-prix-du-jour.md` puis `tests/e2e/carburant-fraicheur.spec.js` |
| **Réponses de la mairie à un signalement / une demande / un bug** — ⛔ le re-raccordement des tokens (`mat:notify:*`) passe **AVANT** le garde-fou `mat_push_active` : ce drapeau n'est posé que par le menu Notifications et le prompt d'installation, jamais par le formulaire — le placer après, c'est ne jamais l'exécuter pour les seuls abonnements qui en dépendent. ⚠️ Le service worker **n'a pas de `localStorage`** : les tokens transitent par le Cache API (`mat-notify-tokens`), comme `mat-push-prefs`. ⛔ La panne est **totalement muette** — l'habitant ne voit rien, et le log mairie dit `subscription expired`, qui se lit comme un fonctionnement normal | `docs/adr/0034-un-garde-fou-peut-emporter-ce-qu-il-protege.md` puis `docs/guide-technique.md` §8 et `scripts/check-notify-relink.js` |
| **Atelier fichiers** (onglet 📎 de l'admin — compresser images/PDF, assembler, extraire le texte) — ⛔ quatre propriétés SONT la fonctionnalité, pas des détails : **aucun octet ne sort** (ni `fetch`, ni domaine tiers, ni **nom de fichier dans un `console.*`**), **aucun stockage persistant**, bibliothèques dans `vendor/` et jamais un CDN, aucun script en ligne dans le module. ⚠️ pdf.js est figé en **3.11.174** : à partir de la 5, `page.render()` attend `canvas` et non `canvasContext`. ⚠️ pdf.js réclame son worker **par URL** → une requête par `getDocument` si on ne partage pas `workerPort` | `docs/adr/0035-atelier-fichiers-les-documents-de-la-mairie-ne-sortent-pas-du-navigateur.md` puis `js/mat-atelier-fichiers.js` |
| **Masquer une zone / Organiser un PDF** (atelier fichiers) — ⛔ **seul le masque NOIR est irréversible** : l'interface doit continuer à le dire, proposer trois masques comme s'ils se valaient serait pire que n'en proposer qu'un. ⛔ « Organiser un PDF » **ne rasterise jamais** (`copyPages`), à l'inverse de « Compresser un PDF » — leurs descriptions le disent, sans quoi on choisit le mauvais. ⚠️ une rotation **s'ajoute** à celle que la page portait déjà. ⚠️ un `<canvas>` sans attribut fait **300 px de large** : « le canvas a une largeur » ne prouve pas que l'aperçu est prêt. ⛔ le retrait des métadonnées (**position GPS**) est désormais une promesse affichée — ne jamais renvoyer les octets d'origine tels quels | `docs/adr/0036-masquer-une-zone-seul-le-noir-est-irreversible.md` |
| **« Le jeu du moment »** (`/jeu`, `/jeu/archives`, `jeux/jeux.json`) — ⛔ **le nom d'un jeu ne s'écrit QUE dans le manifeste** (`tests/e2e/jeu.spec.js` échoue si le titre courant est dans `index.html`, ou son id dans `service-worker.js`) ; ⚠️ `/jeu` est un **lanceur**, pas le jeu — une adresse imprimée sur des affiches ne peut pas servir un fichier variable sans indirection ; ⚠️ la pastille se souvient d'un **identifiant** (`jeu-vu`), jamais d'une date — comparer des dates rallumerait la pastille partout à la première coquille corrigée dans `publie` ; ⛔ un jeu ne cite **aucun** domaine externe (c'est ce qui fait tenir le hors-ligne *et* le « rien ne sort ») ; ⚠️ **pas de point d'entrée bureau** : au-delà de 1024 px, l'accès passe par le plan du site | `docs/adr/0037-le-jeu-du-moment-une-page-statique-et-une-url-imprimee.md` puis `docs/guide-technique.md` §7 et `docs/guide-utilisateur.md` §19-20 |
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
