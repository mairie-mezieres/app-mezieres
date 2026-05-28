# MAT — Mézières Avec Toi (frontend)

Application web progressive (PWA) officielle de la commune de
[Mézières-lez-Cléry](https://mezieres-lez-clery.fr).  
Interface citoyenne : météo, agenda, actualités, signalements, chatbot IA,
notifications push, déchets, trombinoscope et bien plus.

> Démo live : **[mezieres-lez-clery.fr](https://mezieres-lez-clery.fr)**

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
