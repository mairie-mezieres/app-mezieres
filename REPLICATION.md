# Kit de réplication — Application / site municipal type « MAT »

Ce document permet à n'importe quelle commune ou administration de créer sa propre application ou son site municipal (et son chatbot facultatif) en partant d'une feuille blanche, à l'aide d'une intelligence artificielle conversationnelle. Il est inspiré de l'application « MAT — Mézières Avec Toi », partagée gratuitement par la commune de Mézières-lez-Cléry.

> **Vous préférez une interface visuelle ?** Ouvrez la page `partager.html` du site : un questionnaire interactif génère automatiquement le prompt personnalisé à coller dans Claude.

---

## 1. Mode d'emploi (à lire avant tout)

1. Créez un compte gratuit sur **[Claude](https://claude.ai)** (Anthropic).
2. **Remplissez les sections 2, 3 et 4 ci-dessous** directement dans ce fichier (en supprimant ce qui ne vous concerne pas).
3. Copiez **tout le contenu situé entre les marqueurs `--- DÉBUT DU PROMPT ---` et `--- FIN DU PROMPT ---`** (sections 5 à 10).
4. Collez-le dans une nouvelle conversation Claude et envoyez. L'IA produira un site adapté à vos réponses.
5. Suivez les instructions de déploiement données par Claude. La FAQ en fin de document répond aux questions les plus fréquentes.

Temps estimé : **30 minutes** pour remplir, **1 à 3 heures** pour ajuster et publier la première version.

---

## 2. Votre profil & votre budget

Remplacez les `[crochets]` par vos informations. Supprimez les lignes inutiles.

- **Nom de la commune / administration** : [ex. Mairie de Saint-Exemple]
- **Population** : [ex. 1 250 habitants]
- **Département** : [ex. Loiret (45)]
- **Site web actuel** (si existant) : [ex. https://saint-exemple.fr ou « aucun »]
- **Votre niveau en informatique** :
  - [ ] **Débutant** — je sais ouvrir un navigateur, télécharger un fichier, glisser-déposer. Je ne veux pas écrire de code.
  - [ ] **Intermédiaire** — j'utilise GitHub, je sais éditer un fichier HTML, je peux configurer un hébergement type Render ou Vercel.
- **Préférence souveraineté française (« 100 % FR »)** :
  - [ ] **Oui** — hébergement OVH, IA Mistral, services européens uniquement. Budget légèrement supérieur en moyenne, mais données 100 % en France/EU.
  - [ ] **Non** — solutions internationales acceptées (Netlify/Vercel/Render, Claude, Cloudinary). Datacenters EU recommandés pour le RGPD.
- **Budget mensuel total souhaité** : [ex. 0 € / 30 € / 80 €]
- **Hébergeur préféré** : [Netlify · Vercel · Render · OVH · GitHub Pages · autre]
- **Nom de domaine déjà acheté ?** : [oui : monsite.fr / non]

---

## 3. Catalogue des fonctionnalités

Conservez les fonctionnalités souhaitées, supprimez ou commentez les autres. Le code couleur indique le niveau de recommandation :

> 🟢 Essentielle · 🟡 Recommandée · 🔵 Optionnelle

Les coûts indiqués sont des **estimations médianes prudentes** (mairie de 1 000 à 5 000 habitants, trafic modéré). La colonne « Backend ? » signale les fonctionnalités qui nécessitent un serveur — une seule ligne « Hébergement backend » couvre l'ensemble, pas un serveur par fonctionnalité.

| # | Fonctionnalité | Reco | Coût moyen | Backend ? | Conserver ? |
|---|---|---|---|---|---|
| 1 | **Actualités municipales** — fil de news, photos, dates | 🟢 | 0 € | — | [x] |
| 2 | **Agenda événements** — calendrier des manifestations | 🟢 | 0 € | — | [x] |
| 3 | **Trombinoscope des élus** — photos, fonctions, mandats | 🟢 | 0 € | — | [x] |
| 4 | **Horaires & jours fériés** | 🟢 | 0 € | — | [x] |
| 5 | **Formulaire de contact** | 🟢 | 0 € | — | [x] |
| 6 | **Signalements citoyens** — voirie, éclairage, dépôts | 🟡 | 0 € | — | [ ] |
| 7 | **Météo locale** — open-meteo (gratuit, sans clé) | 🟡 | 0 € | — | [ ] |
| 8 | **Calendrier collecte des déchets** | 🟡 | 0 € | — | [ ] |
| 9 | **Notifications push web** (VAPID) | 🟡 | 0 € | oui | [ ] |
| 10 | **Application installable (PWA)** — hors-ligne | 🟡 | 0 € | — | [ ] |
| 11 | **Mode accessibilité** — contraste, gros texte, daltonisme | 🟡 | 0 € | — | [ ] |
| 12 | **Annuaire des associations** | 🔵 | 0 € | — | [ ] |
| 13 | **Annuaire entreprises / commerces** — logos Cloudinary ou Bunny.net (EU) | 🔵 | ~5 € | — | [ ] |
| 14 | **Sondages citoyens** | 🔵 | 0 € | oui | [ ] |
| 15 | **Transports locaux** — horaires bus, prix carburants | 🔵 | 0 € | — | [ ] |
| 16 | **Sentiers & randonnées** | 🔵 | 0 € | — | [ ] |
| 17 | **Visualiseur PLU / cadastre** — IGN, data.gouv | 🔵 | 0 € | — | [ ] |
| 18 | **Chatbot IA « assistant »** — LLM seul, trafic modéré | 🔵 | ~20 € (10–240) | oui | [ ] |
| 19 | **Interface d'administration intégrée** (côté client) | 🔵 | 0 € | — | [ ] |
| 20 | **Publication automatique Facebook** | 🔵 | 0 € | oui | [ ] |
| **100** | **Hébergement backend** — Render Starter ou OVH VPS d'entrée | 🟡 | ~7 € | — | [ ] (auto-coché si une ligne « oui » est cochée ci-dessus) |

**Pourquoi une ligne backend séparée ?** Plusieurs fonctionnalités (push, sondages, chatbot, Facebook) nécessitent un serveur, mais **un seul serveur suffit** pour les héberger toutes ensemble. Cette ligne évite le double comptage.

**Coût total mensuel estimé** : [faites la somme des cases cochées en ajoutant la ligne 100 si applicable]

**Attention paliers gratuits → payants** :
- Render Free : tombe en veille après 15 min d'inactivité (30 s de latence au réveil) → inadapté à un service public. Préférer Render Starter (~7 €/mois).
- Netlify / Vercel free : 100 Go de bande passante/mois — suffit pour 95 % des mairies, mais surveillez les pics (élections, événements).
- Cloudinary free : 25 Go — au-delà ~5 €/mois.
- LLM (chatbot) : ~20 €/mois pour ~50 questions/jour, peut monter à 200 €+/mois en cas de viralisation.

---

## 4. Contenu de votre commune

Remplissez ce gabarit. Il sera injecté dans le prompt. Soyez précis, l'IA s'en servira pour le contenu réel des pages.

```yaml
identité:
  nom: "Mairie de Saint-Exemple"
  slogan: "Vivre ensemble, autrement"
  couleur_principale: "#1a3d2b"  # vert forêt par défaut
  couleur_secondaire: "#d4a843"  # ambre

coordonnées:
  adresse: "1 place de la Mairie, 45000 Saint-Exemple"
  téléphone: "02 38 00 00 00"
  email: "mairie@saint-exemple.fr"
  horaires:
    lundi: "14h - 17h30"
    mercredi: "sur rendez-vous"
    vendredi: "8h30 - 11h30"

maire:
  nom: "Prénom NOM"
  fonction: "Maire"
  mandats: 2
  bio: "Quelques lignes de présentation."

élus:
  - { nom: "Prénom NOM", fonction: "1er adjoint", délégation: "Travaux" }
  - { nom: "Prénom NOM", fonction: "2e adjointe", délégation: "Affaires sociales" }

services_publics_proches:
  école: "École primaire — 12 rue de l'École"
  poste: "La Poste — agence communale"
  médecin: "Dr Untel — cabinet médical place du marché"
```

---

--- DÉBUT DU PROMPT ---

## 5. Ta mission

Tu es un assistant qui génère un **site web officiel de mairie**, sobre, accessible, conforme RGPD, et déployable rapidement par une équipe non technique. Tu produis du code complet et fonctionnel, prêt à être copié dans un hébergeur gratuit.

Le site est destiné à la commune décrite dans la section « Contenu de votre commune » ci-dessus.

Tu intègres uniquement les fonctionnalités cochées `[x]` dans la section « Catalogue des fonctionnalités » ci-dessus.

## 6. Contraintes techniques

### Si l'utilisateur a coché « Débutant » :

- Produis **un seul fichier `index.html` auto-portant** : HTML + CSS + JavaScript embarqués dans le même fichier.
- Aucune dépendance npm, aucun framework, aucun build. L'utilisateur doit pouvoir **double-cliquer sur le fichier** et le voir s'afficher dans son navigateur.
- Pour le déploiement, recommande **Netlify Drop** (https://app.netlify.com/drop) : glisser-déposer le fichier dans la page, le site est en ligne en 10 secondes.
- Tout contenu (actus, élus, événements) est stocké dans des **variables JavaScript en haut du fichier**, clairement commentées en français. L'utilisateur peut les modifier sans connaître le code.

### Si l'utilisateur a coché « Intermédiaire » :

- Produis une structure de projet inspirée de **MAT — Mézières Avec Toi** (https://github.com/mairie-mezieres/app-mezieres) :
  - `index.html` à la racine
  - `css/main.css`
  - `js/` avec un module par fonctionnalité (ex. `js/actus.js`, `js/agenda.js`)
  - `data/` avec des fichiers JSON pour le contenu modifiable
- Pas de framework lourd (pas de React, Vue, Angular). HTML5 + CSS3 + JavaScript vanille.
- Si une PWA est demandée, inclus un `service-worker.js` et un `manifest.webmanifest`.
- Recommande **Render, Vercel ou GitHub Pages** pour l'hébergement (tous ont une offre gratuite suffisante).
- Inclus un fichier `README.md` qui explique la structure, comment ajouter une actualité, comment déployer.

## 7. Règles communes (tous profils)

- **Langue** : français uniquement, ton institutionnel mais chaleureux.
- **Accessibilité** : respect du **RGAA 4** — contraste AA minimum, navigation clavier, balises ARIA, alternatives textuelles aux images.
- **Responsive** : mobile-first, testé du smartphone au grand écran.
- **Performance** : chargement initial inférieur à 1 Mo, aucune librairie externe lourde.
- **RGPD** : **aucun cookie tiers**, **aucun tracker** (pas de Google Analytics, pas de Meta Pixel). Si une mesure d'audience est souhaitée, propose **Plausible** ou **Matomo** en auto-hébergé.
- **Données publiques** : privilégier les services publics et open-source. Préfère `open-meteo.com` à OpenWeatherMap, `api-adresse.data.gouv.fr` à Google Maps Geocoding. Pour toute fonction IA générative côté backend, **Claude (Anthropic)** ou **Mistral**.
- **Mentions légales** : génère un gabarit conforme (éditeur, hébergeur, responsable de publication).
- **Pas d'emojis dans les titres officiels**, sauf si l'utilisateur le demande explicitement.

## 8. Instructions par fonctionnalité

Pour chaque fonctionnalité cochée `[x]` dans la section 3, produis le code nécessaire en suivant ces consignes :

### 1. Actualités municipales
Liste chronologique avec titre, date, photo (optionnelle), texte court + texte long. Affichage : 3 dernières en page d'accueil, page dédiée pour l'archive.

### 2. Agenda événements
Vue liste triée par date, avec lieu, horaire, description. Possibilité de filtrer par mois.

### 3. Trombinoscope des élus
Grille de cartes : photo, nom, fonction, mandats, courte bio au clic.

### 4. Horaires & jours fériés
Tableau hebdomadaire des horaires, encart « fermé aujourd'hui » dynamique selon le jour, banderole rouge pour les jours fériés (API publique : https://calendrier.api.gouv.fr/jours-feries/metropole.json).

### 5. Formulaire de contact
Champs nom, email, sujet, message. Anti-spam par champ honeypot (pas de captcha tiers). Envoi via **Formspree** (gratuit jusqu'à 50 envois/mois) ou par `mailto:`.

### 6. Signalements citoyens
Formulaire avec type (voirie, éclairage, propreté, autre), localisation (ville/quartier libre), photo optionnelle (base64), description. Envoi vers une adresse mail dédiée.

### 7. Météo locale
Fetch direct depuis `api.open-meteo.com` avec les coordonnées de la mairie. Affichage : température actuelle, prévision 3 jours, icône.

### 8. Calendrier collecte des déchets
Données saisies dans un fichier JSON ou directement dans le HTML : type de collecte par jour de la semaine, jours alternés (semaines paires/impaires). Encart « prochaine collecte » dynamique.

### 9. Notifications push web
Implémentation VAPID standard. Génération de paire de clés via `web-push generate-vapid-keys`. Backend minimal Node.js requis (à héberger sur Render free tier). Documente clairement la marche à suivre.

### 10. Application installable (PWA)
`manifest.webmanifest` avec icônes 192x192 et 512x512, `service-worker.js` avec stratégie network-first et fallback offline. Bouton « Installer » qui apparaît selon `beforeinstallprompt`.

### 11. Mode accessibilité
Panneau réglages : tailles de texte (A / A+ / A++), contraste élevé, mode daltonien (couleurs adaptées), lecteur d'écran intégré (`speechSynthesis` natif). Préférences sauvegardées en `localStorage`.

### 12. Annuaire des associations
Fichier JSON `associations.json` : nom, président, contact, description, site. Page dédiée avec recherche/filtre.

### 13. Annuaire des entreprises
Fichier JSON similaire. Si logos souhaités, recommande **Cloudinary free tier** (25 Go).

### 14. Sondages citoyens
Sondage simple à choix unique ou multiple. Résultats stockés via un backend léger (Render free + base SQLite ou Redis Upstash gratuit). Pour profil débutant, utilise un service externe type **Framaforms**.

### 15. Transports locaux
Affichage statique des horaires (les données changent rarement). Pour les prix carburants, fetch sur `https://donnees.roulez-eco.fr/opendata/instantane`.

### 16. Sentiers & randonnées
Liste de fiches avec titre, distance, dénivelé, durée, trace GPX (si disponible), photo. Visualisation possible via Leaflet + tuiles IGN.

### 17. Visualiseur PLU / cadastre
Carte Leaflet centrée sur la commune, tuiles **Géoportail IGN** (gratuit), couche cadastre via `cadastre.data.gouv.fr`. Encart règles d'urbanisme depuis le PLU communal (PDF ou JSON).

### 18. Chatbot IA « assistant »
Architecture recommandée (à ne proposer **que pour le profil intermédiaire**) :
- Backend Node.js Express déployé sur **Render** (~10 €/mois plan starter).
- LLM principal au choix : **Claude Haiku** via `api.anthropic.com` (rapide, économique, prompt caching natif) ou **Mistral Small** via `api.mistral.ai` (souverain européen, ~0,10 € / million de tokens entrée).
- Optionnel fallback : Claude Haiku 4.5 d'Anthropic.
- Pas d'embeddings ni de base vectorielle au démarrage : injecter les pages du site dans le prompt système (RAG syntaxique).
- Rate limiting : 5 questions / jour / appareil pour maîtriser les coûts.
- Détection d'injection prompt basique (regex sur patterns connus).
- Stockage cache : **Upstash Redis** (gratuit jusqu'à 10 000 requêtes/jour).
- Code de référence open-source : https://github.com/mairie-mezieres/chatbot-mairie-mezieres

Pour le profil débutant : propose plutôt un lien direct vers Claude (claude.ai) avec un prompt système pré-rempli — zéro infrastructure à gérer.

### 19. Interface d'administration intégrée
Page `admin.html` protégée par mot de passe simple (côté client suffisant pour une petite commune). Formulaires pour ajouter / modifier / supprimer actualités, événements, etc. Export du contenu en JSON téléchargeable.

### 20. Publication automatique Facebook
Webhook entre le backend du chatbot et l'API Graph de Meta. Nécessite une page Facebook officielle et un token d'accès longue durée. **À déconseiller** au profil débutant.

## 9. Format de sortie attendu

Renvoie ta réponse en trois parties :

1. **Résumé de ce que tu as construit** (5 lignes max).
2. **Le code complet**, organisé par fichier, chaque fichier dans son propre bloc ` ``` ` avec le nom du fichier en commentaire d'en-tête.
3. **Instructions de déploiement** numérotées, adaptées au niveau et à l'hébergeur choisi.

À la fin, propose **2 ou 3 améliorations possibles** que l'utilisateur pourrait demander dans un second tour.

## 10. Garde-fous

- Si l'utilisateur a coché « Débutant » mais demande des fonctionnalités complexes (chatbot, push, admin), **alerte-le** et propose une version simplifiée.
- Si une fonctionnalité nécessite une clé API ou un compte tiers, **liste-les explicitement** avant le code, avec les liens d'inscription.
- Ne jamais inventer de coordonnées : si une information manque dans la section « Contenu de votre commune », laisse un `[À COMPLÉTER]` visible plutôt qu'un faux contenu.
- Si tu détectes une demande contraire à l'éthique d'une publication municipale (contenu politique partisan, données nominatives sensibles, etc.), refuse poliment et explique pourquoi.

--- FIN DU PROMPT ---

---

## 11. FAQ & dépannage

**Q : Combien ça coûte au total ?**
- Site simple, profil débutant : **0 €/mois** (Netlify gratuit + nom de domaine ~10 €/an).
- Site complet avec chatbot : entre **20 € et 250 €/mois** selon le trafic.

**Q : Faut-il un développeur ?**
Non pour le profil débutant. Recommandé pour le chatbot et les fonctionnalités avancées.

**Q : Mes données restent-elles en France / en Europe ?**
La plupart des services recommandés sont européens : Netlify/Vercel proposent des datacenters EU, open-meteo (Allemagne), data.gouv (FR), Upstash (région EU sélectionnable). Pour l'IA générative, Anthropic (Claude) offre une option de résidence des données européenne via son offre Enterprise ; Mistral est nativement français si la souveraineté est un critère bloquant.

**Q : Claude me donne un résultat incomplet, que faire ?**
Renvoyez simplement : « Continue le fichier `[nom]` à partir d'où tu t'es arrêté » ou « Génère maintenant le fichier suivant ».

**Q : Comment mettre à jour le site après publication ?**
- Profil débutant : modifiez le fichier `index.html` localement, glissez-le à nouveau sur Netlify Drop.
- Profil intermédiaire : commit + push sur GitHub, le déploiement est automatique sur Render/Vercel.

**Q : Puis-je modifier ce kit pour ma collectivité ?**
Oui, librement. Le projet original est diffusé sous **licence MIT** : https://github.com/mairie-mezieres/app-mezieres

**Q : Comment citer le projet d'origine ?**
Un simple lien en pied de page suffit : « Inspiré de MAT — Mairie de Mézières-lez-Cléry ».

---

## 12. Aller plus loin

- Code source du site : https://github.com/mairie-mezieres/app-mezieres
- Code source du chatbot : https://github.com/mairie-mezieres/chatbot-mairie-mezieres
- Documentation Claude : https://docs.claude.com
- Documentation Mistral (alternative) : https://docs.mistral.ai
- Référentiel d'accessibilité (RGAA) : https://accessibilite.numerique.gouv.fr
- API publiques françaises : https://api.gouv.fr
