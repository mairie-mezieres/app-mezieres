# État des lieux — MAT (Mézières Avec Toi)

**Date du relevé :** 21 août 2026
**Périmètre :** dépôts `mairie-mezieres/app-mezieres` (application) et
`mairie-mezieres/chatbot-mairie-mezieres` (backend), branches `origin/main`.
**Méthode :** lecture directe du code, de la documentation versionnée et de
l'historique git. Aucune donnée d'usage n'est accessible depuis le code
(voir §6).

**Version en production au moment du relevé :** v4.80 (cache service worker
`mat-v4.80.0`), backend `6.9.0`.

> Note de lecture : ce document ne contient que des éléments vérifiables dans
> les dépôts. Chaque incertitude est signalée explicitement.

> ⚠️ **Une section a été mise à jour après le relevé : §3, conformité
> réglementaire.** Le 21 août, l'application était déclarée *non conforme* faute
> d'audit. L'**audit RGAA complet a été mené le 27 août 2026** : le taux est
> désormais de **86,2 %**, mention *partiellement conforme*. La date du relevé
> ci-dessus reste celle du reste du document — les chiffres de code, de tests et
> de commits n'ont pas été recomptés.

---

## 1. Inventaire fonctionnel

31 écrans (« overlays ») sont déclarés dans l'application, plus l'écran
d'accueil et une variante ordinateur en trois colonnes.

Légende : **🆕** = ajouté après le 31 mai 2026 (dernière version de mai :
v4.15, du 31 mai 2026). La datation vient de l'historique git (`origin/main`).

### Information

| Fonctionnalité | Description |
|---|---|
| Actualités municipales | Fil des nouvelles de la commune, avec photo, date et texte long. |
| Agenda communal | Liste des manifestations à venir, avec lieu et horaire. |
| Prochain événement en accueil | La manifestation la plus proche est rappelée en haut de l'écran. |
| Documents officiels 🆕 | Écran où la mairie publie comptes rendus et documents ; une pastille « Nouveau » signale ceux qu'on n'a pas encore ouverts, et la liste reste lisible sans connexion. |
| Grand dossier PLUi-H-D 🆕 | Page de suivi du plan d'urbanisme intercommunal, avec les documents publiés par la mairie. |
| Bandeau d'information | Message ponctuel affiché en haut de l'accueil par la mairie. |
| Horaires de la mairie | Tableau des horaires, avec mention « ouvert / fermé » calculée à l'heure courante. |
| Horaires exceptionnels 🆕 | La mairie peut annoncer une fermeture ou un horaire particulier (mairie et déchetterie) sans passer par un informaticien. |
| Jours fériés et vacances scolaires | Pris en compte dans les horaires et le calendrier des collectes. |
| Trombinoscope des élus | Photos, fonctions et mandats du conseil municipal. |
| Conseil municipal | Écran dédié aux comptes rendus et informations du conseil. |
| Annuaire des associations | Liste des associations de la commune avec leur activité. |
| Annuaire des entreprises et commerces | Liste des professionnels locaux. |
| Numéros utiles / urgences | Répertoire des numéros d'urgence et de santé, accessible aussi sur ordinateur 🆕. |
| Bus Rémi (ligne 8) | Prochains passages et horaires de la semaine. |
| Prix des carburants | Relevé des prix des stations proches (écran téléphone). |
| Événements locaux 🆕 | Manifestations des communes voisines, en complément de l'agenda municipal. |
| Galerie de paysages | Photothèque des paysages de la commune. |
| Radio Mézières et groupe Facebook 🆕 | Liens vers les canaux locaux, depuis le pied de page ordinateur. |
| Nouveautés de l'application | Journal des changements consultable depuis le numéro de version. |

### Participation citoyenne

| Fonctionnalité | Description |
|---|---|
| Signalements | Photo + localisation d'un problème (voirie, éclairage…) transmis à la mairie, avec suivi de l'avancement. |
| Suivi de mes signalements | Écran où l'habitant retrouve ce qu'il a envoyé et les réponses de la mairie. |
| Boîte à idées | Propositions des habitants, avec message anti-doublon 🆕 quand un sujet a déjà été soumis. |
| Sondages citoyens | Consultations ponctuelles ouvertes par la mairie. |
| Photos des habitants 🆕 | Galerie « Vos photos » : chacun peut envoyer une photo de la commune, modérée avant publication ; diaporama, navigation au doigt 🆕 et au mouvement du téléphone 🆕, mise en évidence des nouvelles photos 🆕. |
| Réactions aux publications 🆕 | Possibilité de réagir à une actualité. |
| Signaler un bug | Formulaire dédié aux dysfonctionnements de l'application, avec suivi. |
| Contacter les élus | Formulaire de demande adressé à la mairie, avec suivi de la réponse. |
| Demande de subvention (associations) 🆕 | Accès direct à la demande depuis l'annuaire des associations. |

### Environnement, météo et cadre de vie

| Fonctionnalité | Description |
|---|---|
| Météo locale | Température, ressenti, vent, pluie et prévisions pour la commune. |
| Fenêtre météo détaillée 🆕 | Carte « Maintenant », frise des heures à venir, lever et coucher du soleil, phase de la lune ; ce qui n'est pas mesuré n'est jamais affiché comme un zéro. |
| Écart à la normale du mois 🆕 | Comparaison de la température maximale du jour avec la moyenne 1991-2020, avec sa source annoncée (réanalyse ERA5, pas une station météo). |
| Alerte météo (vigilance) 🆕 | Carte d'alerte reprenant la vigilance Météo-France, avec une frise de la durée et un encart « Prochains risques ». |
| Visuels d'alerte 🆕 | Une image par phénomène et par niveau, utilisable pour la communication. |
| Qualité de l'air 🆕 | Indice, polluant dominant et conseils du jour par seuil. |
| Restrictions sécheresse 🆕 | Niveau de restriction en vigueur et consignes correspondantes, alignés sur VigiEau. |
| Calendrier des déchets | Prochain ramassage, détail par type de bac, lien vers la déchetterie. |
| Rappel de collecte | Notification la veille du ramassage, sur abonnement. |
| Carte 3D du village 🆕 | « Mon village en 3D » : le bâti de la commune en relief, avec le zonage du PLU, les toits en pente 🆕, la limite communale 🆕, un bouton « Où suis-je » 🆕 et une vue des 25 communes de l'intercommunalité 🆕. |
| Bandeau d'accueil vivant 🆕 | L'en-tête reflète la météo réelle (pluie, neige, orage, brume, nuages), l'heure du jour, les saisons et quelques fêtes. Désactivé si le téléphone est réglé sur « Réduire les animations ». |
| Sentiers et randonnées | Parcours autour de la commune. |

### Démarches et information administrative

| Fonctionnalité | Description |
|---|---|
| MEL — assistante virtuelle | Répond en langage courant aux questions sur la commune et les démarches. 39 réponses de référence sont écrites à la main et servies sans passer par une IA. |
| Arbre de décision MEL | Parcours guidé cliquable (8 rubriques, 37 questions), modifiable par la mairie sans code. |
| Guide « Je viens d'emménager » 🆕 | Check-list cochable des démarches d'arrivée, en quatre étapes, consultable sans connexion. |
| Consultation du PLU / cadastre | Règles d'urbanisme applicables à une parcelle (13 zones du PLU décrites). |
| Documents officiels et PLUi-H-D | Voir §Information. |
| Renvois vers les téléservices | Liens vers les services de l'État et de l'intercommunalité (carte d'identité, passeport, élections, recensement, PACS, fibre, assainissement…). |

### Accessibilité et confort

Voir §3 pour le détail. En résumé : trois tailles de texte, contraste élevé,
mode daltonien, lecture vocale, trois thèmes, espacement des lignes, zones
tactiles agrandies, navigation complète au clavier 🆕, aide contextuelle,
parcours d'accueil guidé, possibilité de masquer l'en-tête ou les widgets.

### Notifications et hors-ligne

| Fonctionnalité | Description |
|---|---|
| Application installable (PWA) | S'installe sur le téléphone depuis le navigateur, sans passer par un magasin d'applications. |
| Fonctionnement sans connexion | Les informations de la dernière visite restent consultables ; le fait du jour et le guide d'arrivée fonctionnent hors ligne 🆕. |
| Notifications push | Trois abonnements séparés : actualités, alertes météo, rappels de collecte. |
| Réponse à un signalement | L'habitant est prévenu quand la mairie change le statut de son signalement ou y répond. |
| Invitation à activer les notifications 🆕 | Proposée après l'envoi d'un formulaire, au moment où elle a du sens. |
| Notification de mise à jour | L'application signale qu'une nouvelle version est disponible. |

### Culture locale

| Fonctionnalité | Description |
|---|---|
| « Le saviez-vous ? » 🆕 | Un fait sourcé sur la commune chaque jour, posé sous forme de question. Le corpus compte 172 entrées vérifiées, réparties en 12 thèmes, plus des faits calculés à partir de données publiques. Aucune IA n'intervient au moment de l'affichage. |
| Page de relecture du corpus 🆕 | `revue-saviez-vous.html` : la mairie relit l'intégralité des faits, dans l'ordre réel de passage, avant publication. |

### Administration (côté mairie)

18 onglets dans le tableau de bord : vue d'ensemble, actualités, bandeau,
documents, entreprises, IA, idées, journaux, MEL, migration, photos, purge,
notifications, Redis, services, signalements, sondages, réglages application.

| Fonctionnalité | Description |
|---|---|
| Publication des actualités | Rédaction, photo, publication immédiate ou programmée 🆕. |
| Publication automatique sur Facebook | Une actualité peut être relayée sur la page de la commune ; un badge indique le post correspondant 🆕. |
| Reprise d'un post Facebook | Un post marqué `#MAT` sur la page de la commune devient une actualité dans l'application. |
| Gestion des signalements | Suivi, changement de statut, réponse — également possible directement depuis Trello. |
| Gestion des idées | Traitement, filtrage par statut de résolution 🆕. |
| Modération des photos 🆕 | Validation ou refus des photos envoyées par les habitants. |
| Gestion des sondages | Création, ouverture, clôture, résultats. |
| Publication des documents 🆕 | Documents officiels et documents du PLUi-H-D, envoyés depuis le tableau de bord (fichier ou lien). |
| Horaires exceptionnels 🆕 | Saisie des fermetures et horaires particuliers. |
| Envoi de notifications | Rédaction et envoi d'une notification push, avec historique. |
| Test de l'alerte météo 🆕 | Bouton pour vérifier le circuit d'alerte sans attendre un vrai épisode. |
| Diagnostic « Services » | 16 contrôles automatiques (serveur, base, météo, normales, vigilance, bus, agenda, Google Calendar, Trello, IA, Facebook, webhook, notifications, sécheresse, compteur d'installations, version de Node). |
| Journaux et journal d'audit | Historique des erreurs et trace de toute suppression faite depuis l'administration. |
| Purge des données | Suppression contrôlée des contenus, tracée dans le journal d'audit. |
| Mail quotidien de statistiques | Résumé envoyé chaque jour à la mairie. |
| Personnalisation | Photo de MAT et MEL 🆕, thèmes, aperçu des ambiances d'accueil 🆕. |

### Réplication et transparence

| Fonctionnalité | Description |
|---|---|
| Générateur de réplication (`partager.html`) | Voir §5. |
| Page architecture | `architecture.html` : présentation publique du fonctionnement technique. |
| Page RGPD | Explication des données collectées et des droits associés. |
| Déclaration d'accessibilité RGAA, schéma pluriannuel et plan d'action | Publiés dans l'application. Voir §3. |
| Veille technologique automatique 🆕 | Un agent examine chaque semaine l'état de l'art et ouvre une fiche d'actions ; depuis peu, il peut aussi proposer des correctifs en brouillon. |
| Veille pour le bulletin municipal 🆕 | Suggestions mensuelles de sujets pour le bulletin. |
| Veille municipale (élus) 🆕 | Point mensuel sur les subventions et obligations qui concernent la commune. |

> ⚠️ **Limite de datation.** Le fichier `CHANGELOG.md` documente les versions
> v4.54 à v4.80 (août 2026) puis saute directement à v4.15 (31 mai 2026) :
> **les versions v4.16 à v4.53, soit juin et juillet 2026, n'y figurent pas.**
> Les repères 🆕 de ces deux mois proviennent donc de l'historique git et non
> du changelog. C'est une lacune documentaire réelle, pas une incertitude sur
> les fonctionnalités elles-mêmes.

---

## 2. Chiffres techniques

### Routes API (backend)

| | Nombre |
|---|---|
| Points d'entrée déclarés | **140** |
| dont réservés à l'administration (`/admin/…`) | 62 |
| dont accessibles à l'application | 78 |
| Fichiers de routes | 32 |

### Modules JavaScript côté application

| | Nombre |
|---|---|
| Modules dans `js/` | **27** |
| Service worker | 1 fichier séparé |
| Scripts de contrôle et d'automatisation (`scripts/`) | 10 |

### Lignes de code (hors dépendances)

Dépendances exclues : `node_modules/`, `vendor/` (Leaflet, MapLibre, Sentry),
fichiers `package-lock.json`.

| Périmètre | Lignes |
|---|---|
| Application — JS | 19 420 |
| Application — CSS | 2 072 |
| Application — HTML | 7 022 |
| **Sous-total code application** | **28 514** |
| Backend — JS (routes, bibliothèques, tests, scripts) | 12 164 |
| **Total code (JS + CSS + HTML)** | **40 678** |
| Documentation versionnée (`.md`) | 12 588 |
| Configuration CI/CD (`.yml`) | 1 820 |
| Données versionnées (`.json`, hors lock) | 2 892 |
| **Total tous fichiers versionnés** | **57 978** |

> ⚠️ Le compte de lignes est à manier avec prudence pour ce projet : la
> feuille de style principale fait en moyenne 68 caractères par ligne, et
> plusieurs fichiers JS sont écrits en lignes longues. En volume de
> caractères, le code représente environ **1,6 Mo** côté application et
> **0,55 Mo** côté backend. Si un chiffre unique est nécessaire pour le
> dossier, « environ 40 000 lignes de code » est défendable ; il ne dit rien
> de la densité.

### Documentation

| | Nombre |
|---|---|
| Décisions d'architecture (ADR) | 27 côté application + 14 côté backend |
| Spécifications fonctionnelles (SFD) | 17 |
| Spécifications techniques (STD) | 12 |
| Guides et documents transverses (utilisateur, technique, architecture, déploiement, réplication, administration, surface d'exposition, sécurité ×2, README ×2, changelog) | 12 |

### Sources de données externes intégrées

**13 sources appelées par le code**, réparties ainsi :

*Données publiques (7)*

| Source | Usage |
|---|---|
| Open-Meteo (prévisions) | Météo de la commune, prévisions sur 10 jours. |
| Open-Meteo Archive (réanalyse ERA5) | Normales saisonnières 1991-2020 et écart à la normale. |
| Météo-France (vigilance) | Alertes de vigilance météo. |
| VigiEau (`api.vigieau.gouv.fr`) | Niveau de restriction sécheresse et consignes. |
| IGN — API Carto GPU (`apicarto.ign.fr`) | Zonage du PLU d'une parcelle. |
| IGN — Géoplateforme (`data.geopf.fr`, BD TOPO) | Bâti et fonds de carte de la vue 3D. |
| OpenStreetMap / Overpass | Chemins et sentiers de randonnée. |

*Données publiques, autres administrations (2)*

| Source | Usage |
|---|---|
| data.economie.gouv.fr | Prix des carburants des stations proches. |
| data.education.gouv.fr | Calendrier des vacances scolaires (zone B). |

*(Les jours fériés ne viennent d'aucune source externe : ils sont calculés
localement à partir de la date de Pâques.)*

*Services tiers (9)*

| Source | Usage |
|---|---|
| Mistral AI | Moteur de réponse de MEL quand aucune réponse de référence ne s'applique. |
| Anthropic (API) | Agents de veille et suivi de consommation. |
| Trello | Réception et suivi des signalements, demandes et bugs. |
| Facebook Graph | Reprise des posts `#MAT` et publication des actualités. |
| Google Calendar / iCal | Agenda communal. |
| Cloudinary | Stockage et optimisation des images et documents. |
| Resend | Envoi des courriels (statistiques quotidiennes, veille). |
| Upstash Redis | Stockage des données de l'application. |
| OpenAgenda | Événements des communes voisines. |

> Le total dépend de ce qu'on décide de compter : **9 sources de données**
> (publiques ou ouvertes) et **9 services tiers** d'exécution, dont trois
> d'infrastructure (Cloudinary, Resend, Upstash) auxquels s'ajoute Sentry
> pour la supervision. Pour un pitch, la formulation la plus honnête est :
> *« 9 sources de données publiques ou ouvertes, dont 6 issues de l'État ou
> d'établissements publics. »*

### Historique git

| | Application | Backend |
|---|---|---|
| Commits sur `main` | **949** | **384** |
| Premier commit | 26 mars 2026 | 22 mars 2026 |
| Dernier commit (au relevé) | 19 août 2026 | 16 août 2026 |

**Total : 1 333 commits en cinq mois** (22 mars → 19 août 2026).

Répartition des auteurs sur l'application : 779 `mairie-mezieres`, 122
`Claude`, 27 `github-actions[bot]`, 12 compte personnel, 6 Dependabot.

### Couverture de tests

**Aucune mesure de couverture n'est instrumentée** dans les deux dépôts : ni
`c8`, ni `nyc`, ni option de couverture dans les scripts de test. Le
pourcentage de couverture n'est donc **pas disponible** et ne peut pas être
estimé honnêtement.

Ce qui est mesurable :

| | Nombre |
|---|---|
| Tests backend (`node:test`) | **140**, répartis en 17 fichiers |
| Tests d'interface (Playwright) | **109** déclarations, exécutées sur 2 profils (ordinateur + téléphone), soit **218 exécutions** |
| **Total** | **249 tests déclarés** |

Les tests backend couvrent en priorité les chemins sans appel réseau réel
(validation, authentification, santé, CORS, règles de MEL, sécheresse,
documents). Les tests d'interface tournent sans backend, sur fichiers
statiques, avec le service worker volontairement désactivé.

---

## 3. Accessibilité

### Dispositifs réellement implémentés

Vérifiés dans `js/mat-accessibility.js`, `css/mat.css` et les tests.

| Dispositif | État |
|---|---|
| Taille du texte | Trois niveaux (normal / A+ / A++), appliqués à toute l'application. |
| Plancher typographique | Aucun texte de l'accueil sous 12 pixels (depuis v4.63, vérifié par 6 tests qui mesurent le rendu réel et non le code). |
| Contraste élevé | Mode dédié, réglage mémorisé. |
| Mode daltonien | Palette adaptée. |
| Espacement des lignes | Mode d'espacement renforcé. |
| Zones tactiles agrandies | Mode dédié pour les gestes imprécis. |
| Lecture vocale | Synthèse vocale du navigateur : lecture automatique d'une actualité à l'ouverture, bouton « 🔊 Écouter », barre de contrôle Pause / Arrêter en bas d'écran. |
| Thèmes | Vert (défaut), Bleu, Sombre. |
| Navigation complète au clavier | Échap ferme la fenêtre, Tab reste piégé à l'intérieur, le focus revient à son point de départ ; toutes les tuiles et cartes de l'accueil s'ouvrent avec Entrée ou Espace. |
| Indicateur de focus | Cadre visible au clavier uniquement, y compris en contraste élevé et thème sombre. |
| Respect de « Réduire les animations » | Toutes les animations décoratives sont désactivées si le réglage système est actif. |
| Aide contextuelle | Explications activables sur les écrans. |
| Parcours d'accueil guidé | Visite guidée au premier lancement, relançable. |
| Interface allégée | Possibilité de masquer l'en-tête animé ou les widgets. |
| Zone `aria-live` | Annonce aux lecteurs d'écran de la révélation du fait du jour. |
| Langue déclarée | Français, déclaré sur la page. |
| Persistance | Tous les réglages sont mémorisés sur l'appareil, entre les visites. |

### Vérification automatique

- **axe-core** (`@axe-core/playwright`) est exécuté dans 4 des 9 fichiers de
  tests d'interface, à chaque intégration ; le fichier `smoke.spec.js` passe
  axe sur chaque fenêtre qui se rend sans backend.
- Un fichier de tests dédié à la navigation clavier existe parce qu'axe **ne
  peut pas** détecter un élément cliquable non focalisable — la limite est
  documentée et compensée par un test de propriété.

### Score Lighthouse

Dernier audit enregistré, **17 août 2026** (`data/ecoindex.json`, produit par
le workflow Lighthouse sur le site en production, moyenne de 3 mesures en
profil mobile) :

| Métrique | Score |
|---|---|
| **Accessibilité** | **100 / 100** |
| Performance | 72 / 100 |
| SEO | 100 / 100 |
| Bonnes pratiques | 100 / 100 |
| Eco-index | 46 / 100 — note D |

### Conformité réglementaire

> ⚠️ **Mis à jour le 27 août 2026.** Ce paragraphe annonçait l'application comme
> *non conforme, faute d'audit formel* — c'était exact au 21 août, ça ne l'est
> plus. L'audit a été mené entre-temps.

**L'audit RGAA 4.1 des 106 critères a été réalisé le 27 août 2026**, en interne
et outillé (`docs/accessibilite/audit-rgaa-2026-08-27.md`). Il est **complet** :
chaque critère a un verdict, aucun n'est laissé ouvert.

| | |
|---|---|
| Critères non applicables | 41 (ni vidéo, ni son, ni cadre, ni CAPTCHA) |
| Critères applicables | **65** |
| Conformes | **56** |
| Non conformes | **9** |
| **Taux de conformité** | **86,2 %** |
| **Mention RGAA** | **partiellement conforme** |

La déclaration publiée dans l'application porte ce taux. Le **schéma pluriannuel
2026-2029** et le **plan d'action 2026-2027** exigés par le décret n° 2019-768
sont publiés (`docs/accessibilite/schema-pluriannuel.md`), avec un référent
accessibilité nommé, un contact usagers et la voie de recours auprès du
Défenseur des droits. Les 9 chantiers restants sont datés.

L'audit a conduit à corriger, entre le 27 août et la v4.90, une vingtaine de
défauts réels : les douze interrupteurs de l'écran Accessibilité n'avaient aucun
nom annoncé, six champs de formulaire non plus, les bordures de saisie ne
faisaient que 1,17:1 de contraste (minimum requis : 3), et aucune page ne portait
de repère permettant à un lecteur d'écran de sauter au contenu.

> Pour le dossier : annoncer « **audit RGAA 4.1 complet des 106 critères,
> partiellement conforme à 86,2 %, schéma pluriannuel et plan d'action publiés** »
> est exact et vérifiable — le document d'audit expose la méthode et les preuves
> critère par critère. Annoncer « conforme RGAA » ne le serait toujours pas :
> cette mention suppose 100 %.

Le score Lighthouse de 100/100 ci-dessus ne vaut toujours pas conformité RGAA —
il mesure une quarantaine de points automatisables, là où le référentiel en
compte 106, dont beaucoup ne se mesurent pas sans jugement humain.

---

## 4. Industrialisation

| Dispositif | Ce qu'il fait |
|---|---|
| **Intégration continue — application** | À chaque modification : vérification de la syntaxe de tous les fichiers JavaScript, contrôle de structure des feuilles de style (une accolade orpheline fait disparaître une règle en silence), et contrôle que tout fichier modifié porte bien un nouveau numéro de version — sans quoi les habitants continuent de recevoir l'ancienne copie. |
| **Intégration continue — backend** | À chaque modification : vérification de syntaxe, exécution des 140 tests, et audit de sécurité des bibliothèques utilisées (signalé sans bloquer). |
| **Tests d'interface automatisés** | 109 scénarios rejoués sur écran d'ordinateur et de téléphone à chaque modification, avec contrôle automatique d'accessibilité. |
| **Audit Lighthouse hebdomadaire** | Chaque lundi matin, le site en production est audité (performance, accessibilité, référencement, bonnes pratiques) et le résultat est publié automatiquement. |
| **Eco-index hebdomadaire** | Le même audit calcule l'empreinte environnementale de la page et met à jour le badge affiché dans l'application. |
| **Détection de liens morts** | Chaque lundi, toutes les adresses citées dans l'application, le backend et la documentation sont testées ; une fiche unique est ouverte et mise à jour, puis refermée quand tout est réparé. |
| **Sauvegarde de la base** | Chaque lundi, réplication automatique de la base de données vers une base de secours. |
| **Rappels de collecte** | Une tâche quotidienne déclenche l'envoi des rappels de ramassage des déchets. |
| **Supervision des erreurs** | Sentry enregistre les erreurs du serveur et de l'application ; les erreurs sont aussi consultables dans le tableau de bord. |
| **Diagnostic à la demande** | 16 contrôles automatiques dans l'administration vérifient que chaque service extérieur répond (météo, Trello, Facebook, notifications, base…). |
| **Rapport quotidien** | Un courriel récapitule chaque jour l'activité et la consommation des services. |
| **Journal d'audit** | Toute suppression faite depuis l'administration laisse une trace horodatée. |
| **Mise à jour des bibliothèques** | Dependabot propose automatiquement les mises à jour de sécurité sur les deux dépôts. |
| **Veille technologique** | Chaque semaine, un agent examine l'état de l'art des applications de ce type et ouvre une fiche d'actions concrètes ; il peut proposer des correctifs en brouillon, soumis à relecture. |
| **Veille pour le bulletin et veille municipale** | Deux points mensuels : sujets pour le bulletin municipal, et subventions ou obligations qui concernent la commune. |
| **Documentation liée au code** | Toute évolution doit mettre à jour la documentation dans la même livraison ; les décisions structurantes font l'objet d'une fiche datée (41 fiches à ce jour). |

**Total : 11 chaînes automatisées** (8 côté application, 3 côté backend).

---

## 5. Générateur de réplication (`partager.html`)

### Ce qu'il fait aujourd'hui

Une page publique en trois étapes, destinée à une autre commune qui voudrait
se doter d'une application équivalente :

1. **Profil de la commune** — nom, population, budget mensuel disponible
   (curseur), hébergeur souhaité, et une case « souveraineté active » qui
   restreint les propositions à des solutions européennes.
2. **Choix des fonctionnalités** — catalogue à cocher, avec pour chacune une
   pastille indiquant si elle est essentielle, recommandée ou optionnelle.
   Le coût mensuel estimé se recalcule en direct, avec le détail poste par
   poste, une jauge de comparaison au budget déclaré et un indicateur de
   trafic attendu.
3. **Prompt personnalisé** — la page produit un texte détaillé, prêt à être
   remis à un assistant IA, contenant les spécifications de chaque
   fonctionnalité cochée, les modèles de fichiers de données, les prérequis
   de comptes à créer, une méthode de travail et une FAQ sur le financement.
   Un bouton ouvre l'assistant choisi.

Le modèle de coût est calibré sur les mesures réelles de MAT : 900 habitants
de référence, 15 à 20 % de visiteurs actifs par jour, environ 0,044 question à
l'IA par habitant et par mois, 30 commandes de base de données par visiteur
actif et par jour. Les paliers gratuits des hébergeurs sont pris en compte.

À la génération du prompt, le profil de commune saisi est transmis au backend
(`POST /stats/partager`), ce qui permet à la mairie de savoir quelles communes
s'intéressent au dispositif.

### Ce qui a évolué depuis fin mai 2026

22 modifications enregistrées sur `partager.html` et son module depuis le
1ᵉʳ juin, dont :

- **Modèle de coût entièrement refondu** (3 juin) : coûts simulés par
  population, ancrés sur le trafic réellement observé, avec correction d'un
  calibrage erroné (coût de l'IA compté par jour au lieu de par mois).
- **Comparaison au budget déclaré** et jauge visuelle (3 juin).
- **Mode « souveraineté active »** et distinction claire entre hébergement de
  la partie visible et hébergement du serveur (3 juin).
- **Section prérequis** guidant la création des comptes nécessaires (2 juin).
- **Invitation à joindre ses documents existants** — PLU, liste des élus — au
  prompt plutôt que de les ressaisir (9 juin).
- **Guide de méthode, forfaits et modes de travail** dans l'étape 3, et
  **FAQ sur le financement autonome des collectivités** (21 juin).
- **Neutralité entre assistants IA** : ChatGPT et Mistral cités à côté de
  Claude, sans favoritisme (21 juin).
- **Envoi du profil de commune au backend** à la génération (13 juillet).
- **Deux fonctionnalités ajoutées au catalogue** : le guide d'arrivée des
  nouveaux habitants (2 août) et « Le saviez-vous ? » (2 août).

### Catalogue

**23 fonctionnalités proposées** (contre 21 au 31 mai 2026), réparties en :

- **5 essentielles** : actualités municipales, agenda des événements,
  trombinoscope des élus, horaires et jours fériés, formulaire de contact.
- **8 recommandées** : guide d'arrivée des nouveaux habitants, signalements
  citoyens, météo locale, calendrier des déchets, notifications push,
  application installable (PWA), mode accessibilité, assistance IA pour
  développer et maintenir.
- **10 optionnelles** : « Le saviez-vous ? », annuaire des associations,
  annuaire des entreprises et commerces, sondages citoyens, transports
  locaux, sentiers et randonnées, visualiseur PLU / cadastre, chatbot IA,
  interface d'administration, publication automatique Facebook.

Neuf de ces fonctionnalités sont cochées par défaut. Quatre nécessitent un
serveur (notifications push, sondages, chatbot IA, publication Facebook).
Les deux ajouts depuis mai sont le guide d'arrivée et « Le saviez-vous ? ».

Le générateur propose par ailleurs **7 hébergeurs** au choix, avec leur coût.

---

## 6. Ce que je ne peux pas extraire du code

Ces chiffres existent, mais **uniquement dans les données d'exploitation**
(base Upstash, tableau de bord admin, comptes des prestataires). Rien dans le
code ne les contient. À récupérer manuellement :

### Usage

- **Nombre de visiteurs** (jour, mois, total) — compteurs `mat:stats`,
  onglet « Vue d'ensemble » du tableau de bord.
- **Nombre d'installations de l'application** — source unique
  `services.installation`, visible dans le badge de l'application, le mail
  quotidien et le tableau de bord.
- **Répartition téléphone / ordinateur** des visites.
- **Écrans les plus consultés** — compteurs par service, onglet « Vue
  d'ensemble ».
- **Nombre d'abonnés aux notifications**, par canal : actualités
  (`mat:subs`), météo (`mat:subs:meteo`), collecte des déchets
  (`mat:subs:dechets`) — trois compteurs distincts, à relever séparément.
- **Notifications envoyées** — historique `mat:push:history`, onglet
  « Notifications ».

### Contributions des habitants

- **Nombre de signalements** reçus, traités, délai moyen de traitement —
  tableau Trello + onglet « Signalements ».
- **Nombre d'idées** déposées et traitées.
- **Nombre de photos** envoyées, publiées, refusées.
- **Nombre de sondages** ouverts et de votes exprimés.
- **Nombre de demandes** adressées aux élus.
- **Nombre de questions posées à MEL**, part traitée sans appel à l'IA,
  questions restées sans réponse — onglet « IA ».
- **Taux de réponse au fait du jour** et répartition des réponses.

### Coûts réels

- **Facture mensuelle constatée** : Render, Upstash, Cloudinary, Mistral,
  Anthropic, Resend, nom de domaine. Le générateur de réplication contient
  une **estimation** calibrée sur MAT, pas le relevé comptable.
- **Coût cumulé depuis le lancement.**
- **Temps agent consacré au projet**, s'il est suivi.

### Retours et reconnaissance

- **Avis, notes, retours des habitants** — aucun dispositif de notation n'est
  intégré à l'application ; ces retours n'existent que hors ligne (réunions,
  courriers, accueil de la mairie) ou sur les réseaux sociaux.
- **Nombre de communes ayant utilisé le générateur de réplication** —
  profils enregistrés via `POST /stats/partager`, consultables par
  `GET /admin/partager-profils`.
- **Reprises effectives par d'autres communes** (une commune peut avoir
  répliqué le code sans passer par le générateur — le dépôt étant public sous
  licence MIT, il n'existe aucun moyen fiable de le savoir depuis le code).
- **Couverture presse, prix déjà obtenus, soutiens institutionnels.**

### Données démographiques

- **Population exacte de Mézières-lez-Cléry** au dernier recensement. Le code
  utilise 900 habitants comme référence de calibrage des coûts — c'est un
  ordre de grandeur de travail, à ne pas citer comme chiffre officiel.

---

## Points d'attention pour le dossier

Trois éléments à connaître avant de rédiger le pitch :

1. **Le changelog a un trou de deux mois** (v4.16 à v4.53, juin-juillet 2026).
   Si le dossier s'appuie sur une chronologie, elle doit être reconstruite
   depuis l'historique git, pas depuis `CHANGELOG.md`.
2. **La conformité RGAA est mesurée, pas totale** : l'audit complet des 106
   critères a été mené le 27 août 2026 et donne **86,2 %** — mention
   *partiellement conforme*, 9 non-conformités restantes, datées dans le plan
   d'action. Ne pas écrire « conforme RGAA », qui suppose 100 % ; écrire le taux,
   qui est vérifiable. Le score Lighthouse de 100/100 reste un indicateur
   automatique, pas un audit.
3. **L'Eco-index est à 46/100 (note D)** au dernier audit, pour une
   performance à 72/100. C'est le seul indicateur mesuré qui ne soit pas au
   maximum ; mieux vaut l'assumer que le laisser découvrir.
