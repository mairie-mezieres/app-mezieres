# Politique de sécurité — MAT (Mézières Avec Toi)

La commune de Mézières-lez-Cléry prend la sécurité de son application
citoyenne au sérieux. Cette page explique comment signaler une faille de
manière responsable.

## Signaler une vulnérabilité

Si vous découvrez une faille de sécurité (fuite de données, contournement
d'authentification, injection, etc.) :

1. **Ne la divulguez pas publiquement** (pas d'issue GitHub publique, pas de
   réseaux sociaux) tant qu'elle n'a pas été corrigée.
2. Contactez la mairie en **divulgation responsable** :
   - ✉️ `mairie@mezieres-lez-clery.fr`
   - 📞 02 38 45 61 76 — Mairie de Mézières-lez-Cléry, 36 rue du bourg, 45370
3. Décrivez : le composant concerné, les étapes de reproduction, et l'impact
   potentiel. Une preuve de concept (capture, requête) aide beaucoup.

Nous nous engageons à **accuser réception sous 5 jours ouvrés** et à vous
tenir informé de la correction.

## Périmètre

- **Application / site** : https://mezieres-lez-clery.fr (ce dépôt)
- **Backend / API** : dépôt `chatbot-mairie-mezieres`

Sont **hors périmètre** : les services tiers utilisés (Render, Upstash,
Trello, Mistral, etc. — voir la rubrique « Vie privée & RGPD » de
l'application) ; merci de signaler les failles les concernant directement à
leurs éditeurs.

## Bonnes pratiques déjà en place

- Aucun secret committé dans le dépôt (clés et tokens en variables
  d'environnement côté serveur uniquement).
- Signalements citoyens **anonymes** (principe de minimisation des données).
- En-têtes de sécurité HTTP côté API (`X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`), limitation de débit
  (rate-limiting) sur les routes sensibles.
- Intégration continue : vérification de syntaxe à chaque modification.
- Suivi des erreurs en production (Sentry) pour détecter rapidement les
  comportements anormaux.

## Merci

Toute contribution responsable à la sécurité de l'application aide à
protéger les habitants. Merci de votre vigilance.
