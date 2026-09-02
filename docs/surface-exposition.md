# Surface d'exposition technique — inventaire et vérification

Ce document recense **tout ce qui porte le nom de la commune sur Internet**, qui
l'exploite, sur quelle technologie, et comment re-vérifier rapidement qu'un
avis CERT-FR ne nous concerne pas.

Il sert à répondre en quelques minutes à la question qui revient à chaque alerte :
« est-ce qu'on est touchés ? ».

> 📌 À mettre à jour quand un service est ajouté, retiré ou change d'hébergeur.

---

## 1. Ce que la commune exploite elle-même

| Service | Domaine | Hébergeur | Technologie | Code |
|---|---|---|---|---|
| Application citoyenne MAT (site principal) | `mezieres-lez-clery.fr` | GitHub Pages | **Site 100 % statique** : HTML/CSS/JS, aucun code exécuté côté serveur, aucun build | `app-mezieres` |
| Miroir de publication | `mairie-mezieres.github.io` | GitHub Pages | idem | `app-mezieres` |
| Backend / API | `chatbot-mairie-mezieres.onrender.com` | Render (région Frankfurt, UE) | **Node.js + Express** | `chatbot-mairie-mezieres` |

Aucun **CMS**, aucun **PHP**, aucun **.NET/IIS**, aucun **intranet** exploité par
la commune. Il n'existe pas de site vitrine distinct de l'application : le nom de
domaine principal sert directement la PWA statique.

### Bibliothèques tierces embarquées

Elles sont **vendorées** dans le dépôt plutôt que chargées depuis un CDN : pas de
dépendance à un tiers au chargement, et le contenu servi est celui qui a été relu
et committé.

| Dossier | Bibliothèque | Version | Où elle sert |
|---|---|---|---|
| `vendor/leaflet` | Leaflet | voir `PROVENANCE.txt` | cartes 2D (signalements, suivi) |
| `vendor/maplibre` | MapLibre GL | voir le fichier | carte 3D du village, à la demande |
| `vendor/sentry` | Sentry Browser | voir le fichier | remontée d'erreurs |
| `vendor/pdfjs` | pdfjs-dist | 3.11.174 | atelier fichiers de l'admin, à la demande |
| `vendor/pdf-lib` | pdf-lib | 1.17.1 | idem |
| `vendor/jszip` | JSZip | 3.10.1 | idem |

Les trois dernières sont figées dans le `package.json` de la racine et recopiées
par `npm ci && npm run vendor` : c'est **ce couple** qu'il faut consulter pour
répondre à « sommes-nous concernés par cette alerte ? ». Le `package.json` ne
construit rien — l'application est servie telle quelle.

⚠️ Une exception demeure : `admin.html` charge **Chart.js depuis
`cdn.jsdelivr.net`** (avec `integrity`). C'est la dernière dépendance de
chargement à un tiers du dépôt.

---

## 2. Services tiers utilisés (SaaS)

Render, Upstash, Trello, Cloudinary, Google (Calendar/Drive), Sentry, Mistral,
Anthropic, Resend, OpenAgenda, Facebook.

La commune y est **cliente, pas exploitante** : le maintien en condition de
sécurité incombe à leurs éditeurs. Ils sont explicitement **hors périmètre** de
[`SECURITY.md`](../SECURITY.md). Les données traitées et les sous-traitants sont
détaillés dans la rubrique « Vie privée & RGPD » de l'application.

---

## 3. Domaines liés mais exploités par des tiers

Ces sites sont **liés depuis l'application** sans être sous le contrôle de la
commune. Ils peuvent parfaitement tourner sur WordPress ou SharePoint — c'est à
leur exploitant de les tenir à jour, mais une compromission de l'un d'eux
touche des habitants venus depuis MAT. À interroger en cas d'alerte majeure.

| Domaine | Exploitant | Lien avec la commune |
|---|---|---|
| `ccterresduvaldeloire.fr`, `portail-usagers.ccterresduvaldeloire.fr`, `numerique.ccterresduvaldeloire.com` | Communauté de communes des Terres du Val de Loire | Déchets, portail usagers, services intercommunaux |
| `lysseo.fr` | Lysseo | Urbanisme / fibre — liens dans les réponses de MEL |
| `remi-centrevaldeloire.fr` | Région Centre-Val de Loire | Horaires de bus |
| Sites d'associations et de commerçants locaux | Divers | Annuaire de l'application |

---

## 4. Vérification CERT-FR — juillet 2026 (ALE-007 WordPress / ALE-008 SharePoint)

**Date de vérification** : 27 juillet 2026
**Alertes** : [CERTFR-2026-ALE-007](https://www.cert.ssi.gouv.fr/alerte/CERTFR-2026-ALE-007/)
(WordPress, exploitation massive anticipée) et
[CERTFR-2026-ALE-008](https://www.cert.ssi.gouv.fr/alerte/CERTFR-2026-ALE-008/)
(SharePoint, activement exploitées).

### Résultat

**Aucun composant exploité par la commune n'est concerné.** Ni WordPress ni
SharePoint ne sont utilisés, et l'architecture les exclut structurellement :
le site principal est un ensemble de fichiers statiques servis par GitHub Pages
— il n'exécute aucun code côté serveur, donc aucun CMS ; le backend est un
service Node.js, sans composant Microsoft.

### Méthode

Audit documentaire et **revue de code des deux dépôts** :

- Recherche sur les deux dépôts des marqueurs `wordpress`, `wp-content`,
  `wp-json`, `wp-admin`, `sharepoint`, `.aspx`, `onmicrosoft`, `elementor`,
  `woocommerce` → **aucune occurrence**, hormis la note de veille qui a déclenché
  cette vérification (`veille/historique-techno.md`).
- Inventaire des dépendances (`package.json` du backend) : aucun composant PHP
  ni .NET, par construction.
- Inventaire des domaines référencés dans le code (section 3 ci-dessus).

### Limite à connaître

Cette vérification porte sur le **code et la configuration**, qui décrivent
intégralement ce que la commune exploite. Elle **n'a pas inclus de sondage
réseau en direct** des domaines tiers de la section 3 : ils ne sont ni exploités
ni administrés par la commune, et les sonder relèverait de leur exploitant.

Pour les tiers, la démarche adaptée est de **demander confirmation par écrit** à
la communauté de communes et aux prestataires qu'ils ont appliqué ALE-007/008 —
pas de les scanner.

### Re-vérifier plus tard (30 secondes)

À la prochaine alerte visant un CMS, depuis la racine d'un des deux dépôts :

```bash
grep -rniE "wordpress|wp-content|wp-json|sharepoint|\.aspx" \
  --include="*.js" --include="*.html" --include="*.json" --include="*.md" . \
  | grep -v node_modules
```

Un résultat vide **sur les deux dépôts** signifie que la commune n'est pas
concernée : la stack n'a pas changé de nature.

---

## 5. Pourquoi cette architecture réduit la surface d'attaque

Le choix d'une PWA statique (voir [ADR-0001](adr/0001-pwa-pas-app-native.md))
a un effet de bord précieux en sécurité : **un site sans code serveur n'a ni
base de données à injecter, ni page d'administration à forcer, ni greffons à
tenir à jour.** Les vagues d'exploitation qui visent périodiquement les CMS
grand public ne trouvent aucune prise.

La surface réellement à surveiller se réduit donc à trois points :

1. le **runtime du backend** (Node.js) et ses dépendances npm — surveillés par
   le check 🟩 « Node.js (runtime) » du diagnostic admin et par `npm audit` en
   CI (voir `GUIDE-ADMIN.md` §6ter du dépôt backend) ;
2. les **comptes SaaS** et leurs jetons (rotation, expiration) ;
3. les **domaines tiers** de la section 3, par le dialogue avec leurs
   exploitants.
