# ADR-0001 — PWA plutôt qu'application native iOS/Android

- **Date** : mai 2024
- **Statut** : Accepté

## Contexte

La commune de Mézières-lez-Cléry souhaitait une application mobile pour ses habitants
(actus, agenda, signalements, notifications…). Les contraintes principales :

- Budget communal très limité (zéro frais de compte développeur Apple/Google).
- Absence de compétence iOS/Swift ou Android/Kotlin en interne.
- Exigence de souveraineté : hébergement maîtrisé, pas de dépendance à un éditeur privé.
- Délais courts ; mise à jour du contenu sans validation par l'App Store.

## Décision

Nous construisons MAT comme une **Progressive Web App (PWA)** servie depuis un CDN/hébergeur
web standard, avec un Service Worker pour le mode hors-ligne et les notifications push via
l'API Web Push (VAPID). Aucune application native n'est publiée sur l'App Store ou le Google
Play Store.

## Conséquences

**Positives :**
- Zéro frais de compte développeur ; déploiement instantané sans validation d'un store.
- Une seule base de code HTML/JS/CSS pour toutes les plateformes.
- Mise à jour du contenu et du code sans action de l'utilisateur (Service Worker).
- Indépendance totale vis-à-vis d'Apple et Google pour la distribution.
- Accessibilité directe par URL (partage, QR code, lien).

**Négatives / compromis acceptés :**
- Sur iOS < 16.4, les notifications push Web Push ne sont pas disponibles (limitation Apple
  levée partiellement depuis iOS 16.4 et complètement depuis iOS 17).
- Pas d'accès aux API natives avancées (Bluetooth, NFC, ARKit…) — non nécessaires pour
  notre périmètre.
- L'icône « Installer » sur l'écran d'accueil iOS passe par « Partager → Sur l'écran d'accueil »,
  moins visible que l'App Store.

**Points de vigilance pour les futures évolutions :**
- Si une fonctionnalité requiert une API native indisponible en PWA, réévaluer via ADR
  séparé plutôt que d'introduire une app native « en plus ».
- Surveiller l'évolution du support Web Push sur iOS (actuellement acceptable pour iOS 16.4+).
