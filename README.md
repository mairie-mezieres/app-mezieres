# MAT — Mézières Avec Toi (frontend)

[![CI](https://github.com/mairie-mezieres/app-mezieres/actions/workflows/ci.yml/badge.svg)](https://github.com/mairie-mezieres/app-mezieres/actions/workflows/ci.yml)
[![E2E](https://github.com/mairie-mezieres/app-mezieres/actions/workflows/e2e.yml/badge.svg)](https://github.com/mairie-mezieres/app-mezieres/actions/workflows/e2e.yml)
[![Licence MIT](https://img.shields.io/badge/licence-MIT-2d6a4f)](LICENSE)
[![Souveraineté : 0 CDN tiers](https://img.shields.io/badge/souverainet%C3%A9-0%20CDN%20tiers-1a3d2b)](#souverainet%C3%A9--sobri%C3%A9t%C3%A9--accessibilit%C3%A9)
[![Écoconception : EcoIndex](https://img.shields.io/badge/%C3%A9coconception-EcoIndex-2d6a4f)](https://www.ecoindex.fr/resultat/?url=https://mezieres-lez-clery.fr)
[![PWA installable](https://img.shields.io/badge/PWA-installable%20%C2%B7%20hors--ligne-5a67d8)](https://mezieres-lez-clery.fr)

Application web progressive (PWA) officielle de la commune de
[Mézières-lez-Cléry](https://mezieres-lez-clery.fr).  
Interface citoyenne : météo, agenda, actualités, signalements, chatbot IA,
notifications push, déchets, trombinoscope et bien plus.

> Démo live : **[mezieres-lez-clery.fr](https://mezieres-lez-clery.fr)**

---

## Souveraineté · sobriété · accessibilité

Engagements **vérifiables** (et non simplement déclaratifs) de l'application :

- 🔒 **Souveraineté — 0 dépendance CDN tierce au runtime** : polices, cartographie
  (Leaflet), suivi d'erreurs (Sentry) et scripts sont **auto-hébergés**. Aucune
  requête vers Google, jsDelivr, unpkg… depuis l'app citoyenne.
- 🇫🇷 **IA souveraine** : l'assistante MEL s'appuie en priorité sur **Mistral AI**
  (France) ; données applicatives hébergées en **Union européenne**.
- 🌱 **Sobriété** : images optimisées (**−86 %** JPG, **−95 %** PNG→WebP), polices
  sous-ensemblées, chargement paresseux ; empreinte suivie en continu via
  [EcoIndex](.github/workflows/lighthouse.yml) et [Lighthouse](.github/workflows/lighthouse.yml).
- ♿ **Accessibilité** : démarche RGAA documentée, contrastes **WCAG 2.1 AA
  vérifiés automatiquement** (axe-core, dans la CI E2E).
- 🛡️ **Sécurité** : politique de divulgation responsable ([SECURITY.md](SECURITY.md)),
  en-têtes HTTP durcis, secrets hors dépôt.
- 📖 **100 % open source (MIT)** — réplicable par toute commune
  (voir [REPLICATION.md](docs/REPLICATION.md)).

---

## Documentation

| Document | Audience | Contenu |
|----------|----------|---------|
| [Guide utilisateur](docs/guide-utilisateur.md) | Habitants | Installation PWA, toutes les fonctionnalités, RGPD |
| [Guide technique](docs/guide-technique.md) | Développeurs | Architecture, variables d'env, MEL, CI/CD, déploiement |
| [Architecture applicative](docs/architecture.md) | Développeurs · MOA | Schémas (contexte, conteneurs, déploiement, flux métier, données) |
| [Spécifications fonctionnelles (MOA)](docs/specifications/README.md) | Maîtrise d'ouvrage | Exigences & règles de gestion par processus (référentiel SFG + SFD) |
| [Spécifications techniques (STD)](docs/specifications-techniques/README.md) | Développeurs · intégrateurs | Contrat de chaque endpoint : validations, codes HTTP, messages d'erreur, limites |
| [Guide de déploiement](docs/DEPLOIEMENT.md) | Autres communes | Mise en ligne « de zéro » : checklist des comptes, déploiement 1-clic, où coller chaque clé |
| [Kit de réplication](docs/REPLICATION.md) | Autres communes | Prompt Claude pour générer un site similaire |
| [Politique de sécurité](SECURITY.md) | Tous | Divulgation responsable, périmètre |

---

## Fonctionnalités

| Module | Description |
|--------|-------------|
| 📰 **Actualités** | Publications Facebook automatiques (webhook `#MAT` → stockage → push) |
| 📅 **Agenda** | Événements Google Calendar synchronisés |
| 🤖 **MEL** | Assistante IA (Mistral Small) avec règles directes pour les questions fréquentes |
| 🗺️ **Signalements** | Carte Leaflet auto-hébergée, transmission Trello |
| 💡 **Boîte à idées** | Soumission et vote citoyen |
| 🔔 **Push notifications** | Actualités et rappels collecte (Web Push / VAPID) |
| 🌤️ **Météo** | Open-Meteo + vigilances Météo-France |
| 🚌 **Bus Rémi** | Prochains passages ligne 8 |
| ⛽ **Carburants** | Prix en temps réel (data.gouv.fr) |
| ♿ **Accessibilité** | RGAA 4 — taille texte, contraste, daltonien, TTS, thèmes |
| 📴 **Hors-ligne** | Service worker Network-First, cache versionné |
| 🏛️ **Trombinoscope** | Élus et conseil municipal |
| 🏢 **Admin** | Interface protégée : gestion actus, stats, push, purge |

---

## Architecture

Application entièrement statique (HTML / CSS / JS vanilla) — aucun bundler,
aucun framework, déployable sur n'importe quel hébergeur statique (Cloudflare Pages,
GitHub Pages, Netlify…).

| Composant | Rôle |
|-----------|------|
| `index.html` | Point d'entrée principal, structure des overlays |
| `css/mat.css` | Feuille de style unique (thèmes clair / sombre / haut-contraste) |
| `js/mat-core.js` | Gestion des overlays, PWA, navigation |
| `js/mat-mel.js` | Assistante IA MEL (interface chatbot) |
| `js/mat-widgets.js` | Widgets header : météo, bus Rémi, mairie |
| `js/mat-forms.js` | Signalements citoyens, formulaires, suivi |
| `js/mat-actus.js` | Actualités et notifications push |
| `js/mat-utils.js` | Utilitaires communs, VAPID, helpers |
| `js/mat-boot.js` | Séquence d'initialisation |
| `service-worker.js` | Cache offline, push notifications |
| `admin.html` | Interface d'administration (protégée par token) |

Le backend est le projet [chatbot-mairie-mezieres](https://github.com/mairie-mezieres/chatbot-mairie-mezieres)
hébergé sur Render.

---

## Démarrage local

Le projet est un site statique — aucune installation requise.  
Ouvrez simplement `index.html` dans un navigateur, ou servez-le avec :

```bash
# Python
python3 -m http.server 8080

# Node.js
npx serve .
```

Pour que le chatbot et les APIs fonctionnent, configurez l'URL du backend
dans `js/mat-utils.js` (variable `CHATBOT_URL`).

---

## Déploiement

Le site est conçu pour **[Cloudflare Pages](https://pages.cloudflare.com)** (free tier).  
Branchez simplement ce dépôt — aucun build step requis, le fichier `_headers`
configure automatiquement les en-têtes de sécurité (CSP, HSTS, etc.).

---

## Licence

Ce projet est distribué sous licence **MIT**.  
Voir le fichier [LICENSE](LICENSE) pour les détails.

---

*Backend API : [mairie-mezieres/chatbot-mairie-mezieres](https://github.com/mairie-mezieres/chatbot-mairie-mezieres)*  
*Site officiel : [mezieres-lez-clery.fr](https://mezieres-lez-clery.fr)*
