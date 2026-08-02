# Changelog — Mézières Avec Toi (MAT)

Toutes les évolutions notables de l'application sont documentées ici.  
Format : [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/).

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
