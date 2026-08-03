# Changelog — Mézières Avec Toi (MAT)

Toutes les évolutions notables de l'application sont documentées ici.  
Format : [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/).

---

## [4.56] — 3 août 2026

### Corrigé
- **Fibre : le rôle de chacun était faux, dans les trois canaux à la fois.** L'app, le guide
  d'arrivée et MEL présentaient Lysséo comme un guichet où l'habitant « vérifie son
  éligibilité » et « déclare sa construction ». Lysséo est le **réseau public fibre du
  Loiret**, exploité par **Loiret Fibre / XpFibre** en délégation de service public du
  Département : opérateur d'**infrastructure**, il ne vend **aucun** abonnement. Les trois
  entrées `numerique` de l'arbre de décision (`js/mat-mel.js` + `data/mel-tree.json`), la
  fiche fibre du guide d'arrivée (`js/mat-guide-arrivee.js`) et la règle `fibre` de
  `lib/mel.js` côté backend disent maintenant la même chose.
- **L'étape préalable d'une construction neuve était absente partout.** Une adresse neuve
  n'est pas connue de l'opérateur d'infrastructure : tant qu'elle n'y figure pas comme
  « raccordable », **aucun opérateur ne peut enregistrer la commande**. La déclaration se
  fait auprès de **XpFibre / Loiret THD** (permis de construire, certificat de numérotation,
  plan de masse localisant regard et fourreaux). Le rôle de la mairie — faire remonter la
  numérotation de la parcelle à la **Base Adresse Nationale** — est désormais énoncé.
- **Deux liens fibre cassés ou fragiles.** `lysseo.fr/page-contact/41` n'est pas l'adresse du
  formulaire de contact (`lysseo.fr/pagecontact/`), et deux réponses renvoyaient vers la page
  d'accueil en décrivant un bouton « en haut à droite » — une instruction de navigation qui
  casse au premier changement de menu. Les URL directes remplacent les deux.
- **Résidu « Val de Loire Fibre » dans `js/mat-utils.js`.** Le nettoyage de la v4.55 avait
  laissé `valdeloire-fibre.fr` — domaine inexistant — dans `URL_LABELS` et `KNOWN_DOMAINS` :
  un domaine nu écrit dans une réponse MEL devenait donc un lien mort, tandis que `lysseo.fr`
  n'était pas reconnu du tout. Remplacé par `lysseo.fr` et `xpfibre.com`.
- **Backend : le prompt du topic `numerique` était resté à l'ère pré-fibre** (« l'offre
  principale est le THD Radio / 4G fixe »). Il contredisait la règle directe située quelques
  lignes plus haut : en mode IA, MEL orientait vers le THD Radio une commune fibrée.

---

## [4.55] — 3 août 2026

### Ajouté
- **Corpus « Le saviez-vous ? » : 75 → 184 entrées** (172 sourcées + 12 calculées), soit
  six mois sans répétition. L'effort a porté sur les catégories les plus pauvres —
  santé, transports, intercommunalité, habitat, environnement, vie communale — et non sur
  l'urbanisme, déjà fourni. Les nouvelles entrées sont ajoutées **en fin de leur catégorie**,
  l'ordre de déclaration valant ordre de passage (RG-16.5).
- **Deux nouvelles catégories, `histoire` et `patrimoine`**, insérées dans
  `SV_ORDRE_CATEGORIES` après `decouverte`. Elles ne pouvaient pas rejoindre `decouverte` :
  le corpus fixe est concaténé **avant** les entrées calculées, si bien que des entrées
  `decouverte` du JSON se seraient placées en tête de rotation — à rebours de la RG-16.5.
- **Cinq entrées calculées** dans `SV_CALCULES` (`js/mat-saviez-vous.js`), toutes en
  arithmétique pure dérivée des seules coordonnées de la commune : vitesse d'entraînement par
  la rotation terrestre, tour du monde au parallèle de Mézières, longueur d'un degré de
  longitude, distance au méridien de Greenwich, antipode.
- **`revue-saviez-vous.html`** — page de relecture du corpus pour la mairie : question,
  réponse, explication, source et **date de passage**, dans l'ordre réel de rotation, avec
  filtres et mise en page d'impression. Elle interroge `window.matSaviezVousInventaire()`
  plutôt que de réordonner le corpus de son côté : une seconde implémentation divergerait, et
  la revue mentirait alors sur ce que voient les habitants. L'ADR-0012 exigeait cette relecture
  **avant** la fusion ; jusqu'ici rien ne la rendait praticable.
- **Trois tests Playwright** sur la page de revue (exhaustivité, filtre, axe-core).

### Corrigé
Trois erreurs relevées par la mairie sur la première version du corpus, et corrigées
**partout où elles vivaient** — pas seulement dans le corpus :

- **L'eau potable est gérée par le C3M**, syndicat intercommunal d'eau et d'assainissement
  dont le siège est à Mézières (36 rue du Bourg), et non par la Communauté de communes.
  Corrigé dans `data/saviez-vous.json`, dans `js/mat-guide-arrivee.js` et dans la règle
  `energie_eau_compteurs` de `lib/mel.js` côté backend — MEL racontait la même erreur.
- **Les mairies à station biométrique les plus proches sont Meung-sur-Loire, Ardon et
  Orléans.** La divergence signalée dans l'ADR-0012 est tranchée : `data/mel-tree.json`,
  édité par la mairie, fait foi. `lib/mel.js` disait Saint-Hilaire-Saint-Mesmin et
  Cléry-Saint-André — commune qui n'est pas équipée ; corrigé côté backend aussi.
- **L'inscription en déchèterie se fait par immatriculation** : une seule inscription vaut
  pour tous les sites, mais chaque véhicule utilisé doit être enregistré.

### Retiré
- L'entrée calculée sur le **midi solaire** : sa formulation dépendait de la date
  (heure d'été/hiver, et l'équation du temps décale le résultat de ±16 min selon la
  saison). Un fait du jour ne peut pas être approximatif de façon variable.
- Les trois questions sur les **prescriptions du Clos de Manthelon** : trop spécifiques à
  un lotissement pour une rubrique lue par toute la commune.
- Les questions portant sur des **tarifs communaux** (barnums, tables et chaises,
  concessions de cimetière) : elles vieillissent au premier vote du conseil.
- Deux questions de détail : le seuil de cinq réponses avant affichage du pourcentage, et
  la hauteur de clôture au droit des carrefours.

### Équilibre
- Ramené à 84 « oui » pour 88 « non » sur le corpus sourcé, pour qu'aucune des deux
  réponses ne devienne le réflexe gagnant.

### Notes
- Les sources externes visées (INSEE, IGN Géoplateforme, base POP/Mérimée, Hub'Eau,
  VigiEau, Vigicrues, Wikipédia) **n'ont pas pu être ouvertes** depuis l'environnement de
  développement : la politique d'egress refuse le CONNECT vers ces hôtes. Aucune entrée n'a
  donc été rédigée à partir d'elles — la règle « pas de source ouvrable, pas d'entrée » l'a
  emporté sur l'objectif de volume.
- Le déblocage est venu de la mairie, qui a **fourni elle-même les extraits** : le texte de
  la page Wikipédia de la commune (toponymie, administration, occupation des sols,
  recensements depuis 1793, base Mérimée, personnalités) et le **bulletin 2026 du C3M**
  (qualité de l'eau, gestes d'économie, loi Warsmann). C'est le mode d'emploi pour la suite :
  tant que la politique réseau ne s'ouvre pas, le corpus s'enrichit d'exports transmis par
  la commune, pas de données devinées.

---

## [4.54] — 2 août 2026

### Ajouté
- **« Le saviez-vous ? »** : un fait sourcé sur la commune chaque jour, posé sous forme de
  question, sur l'écran d'accueil. Repliée, la rubrique tient sur une ligne (~34 px).
  46 entrées sourcées + 7 générateurs calculés (`data/saviez-vous.json`,
  `js/mat-saviez-vous.js`).
- **Aucune IA à l'exécution** : le contenu vient du corpus versionné ou d'arithmétique
  pure ; chaque entrée porte sa source, affichée à l'écran. Voir
  [ADR-0012](docs/adr/0012-saviez-vous-corpus-verifie-sans-ia-a-l-execution.md) et
  [SFD-16](docs/specifications/sfd/SFD-16-le-saviez-vous.md).
- **Backend** : `GET` et `POST /saviezvous/:id` pour la répartition des réponses
  (déduplication par appareil, même motif que les RSVP).
- **Tests** : 7 scénarios Playwright × 2 profils, dont un **test d'intégrité du corpus**
  qui rejette toute entrée sans source — la règle anti-fake-news est vérifiée
  mécaniquement, pas laissée à la vigilance du relecteur.
- **Accessibilité** : première région `aria-live` du dépôt, sur la révélation de la
  réponse.

### Modifié
- Le lien de pied de page **« 🔗 Partager » devient « 🏛️ Créer la vôtre »** : il mène au
  kit de réplication destiné à une autre commune, pas à un partage entre voisins.

---

## [4.15] — 31 mai 2026

### Ajouté
- **Documentation** : guide utilisateur et guide technique publiés dans `docs/`
- **MEL** : règle directe pour les horaires de bruit et de bricolage (arrêté municipal)
- **RGPD** : badges de certification remontés en tête de l'overlay (0 CDN, IA souveraine…)
- **Desktop** : lien "Partager" discret dans le pied de page

### Corrigé
- Coordonnées mairie mises à jour (02 38 45 61 76 / mairie@mezieres-lez-clery.fr)
- CI : concurrence activée pour éviter les doublons de notifications

---

## [4.14] — 30 mai 2026

### Ajouté
- **Souveraineté** : Leaflet 1.9.4, polices Nunito et Sentry auto-hébergés — **0 dépendance CDN tierce**
- **Accessibilité** : déclaration RGAA v4 complète dans l'overlay, section Souveraineté numérique
- **CI** : audit EcoIndex hebdomadaire (empreinte carbone), audit Lighthouse automatique
- **Images** : conversion PNG → WebP (−95 %), optimisation JPG (−86 %)
- **Sécurité** : politique de divulgation responsable publiée (`SECURITY.md`)

### Corrigé
- Contrastes WCAG 2.1 AA vérifiés et corrigés dans toute l'app

---

## [4.13] — 29 mai 2026

### Ajouté
- **Suivi des signalements** : carte interactive + liste publique avec statuts (reçu, en cours, résolu)
- **Carte signalement** : localisation en haut de l'overlay de signalement
- **Admin Trello** : pilotage des signalements (déplacement/archivage de cartes)
- **Notifications propriétaires** : recevez une notification quand votre idée ou votre signalement change de statut
- **Filtres** : "Mes idées" / "Mes signalements" dans les overlays

---

## [4.12] — 27 mai 2026

### Ajouté
- **Boîte à idées** : couleurs des cartes selon le statut (accepté, en cours, refusé…)
- **Documents officiels** : rubrique Urbanisme ajoutée

### Corrigé
- Mode sombre sur overlays signalement et météo
- Filtres de suivi par statut avec compteurs

---

## [4.11] — 19–20 mai 2026

### Ajouté
- **Qualité de l'air & pollen** : barres de progression visuelles avec seuils d'alerte
- **Migration DNS** : domaine officiel `mezieres-lez-clery.fr` (Cloudflare Pages)

---

## [4.10] — 16–17 mai 2026

### Ajouté
- **Notifications météo** : alertes indépendantes avec niveau d'alerte configurable (orange, rouge)
- **Notifications** : guide batterie / optimisation dans l'overlay
- **Partager** : kit de réplication complet pour d'autres communes (`partager.html`)
- **Revue qualité** : 6 jalons de code review (sécurité, robustesse, maintenabilité, PWA)

---

## [4.9] — 15 mai 2026

### Ajouté
- **Entreprises** : logos hébergés sur Cloudinary, administration depuis le panneau admin
- **Stats** : tracking des ouvertures d'encarts/overlays, rapport quotidien par email
- **Admin** : onglet Push avec historique des envois

---

## [4.8] — 14 mai 2026

### Ajouté
- **Météo** : qualité de l'air (IQA) et pollen avec seuils d'alerte
- **Agenda** : amélioration du cache et des URL de fallback

---

## [4.7] — mai 2026 (semaine 2)

### Ajouté
- **Signalements** : formulaire avec carte Leaflet, catégories, photo
- **Boîte à idées** : soumission, vote, modération admin
- **Sondages** : création et participation depuis l'app
- **Notifications push** : actualités, déchets, météo — gestion indépendante par type
- **Trombinoscope** : photos et biographies des élus
- **Associations** : annuaire des associations de la commune
- **Entreprises** : annuaire des commerces et artisans locaux

---

## [4.6] — mai 2026 (semaine 1)

### Ajouté
- **MEL** : chatbot IA (Mistral Small) avec catégories thématiques
- **Actualités** : publication automatique depuis Facebook (`#MAT`) avec images hébergées
- **Agenda** : synchronisation Google Calendar
- **Bus Rémi** : prochains passages ligne 8 en temps réel
- **Carburants** : prix en temps réel (data.gouv.fr)
- **Eau** : qualité de l'eau (Loire / Meung-sur-Loire)
- **Admin** : interface d'administration sécurisée

---

## [4.0] — lancement initial

### Ajouté
- Application web progressive (PWA) installable sur mobile
- Météo locale (Open-Meteo) avec alertes Météo-France
- Horaires et statut de la mairie en temps réel
- Collecte des déchets (bacs noir et jaune) avec rappels
- Interface accessible (RGAA) : taille de texte, contraste, daltonien, TTS
- Thèmes : vert, bleu, sombre
- Fonctionnement hors ligne (service worker)
- 100 % open source — licence MIT

---

*Application MAT — Commune de Mézières-lez-Cléry*
