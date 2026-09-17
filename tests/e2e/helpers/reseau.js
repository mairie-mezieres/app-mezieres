// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Commune de Mézières-lez-Cléry
//
// Coupure des appels sortants pendant les tests E2E — SOURCE UNIQUE.
//
// ⛔ POURQUOI CE FICHIER EXISTE. Chaque spec portait sa propre copie de la
// liste des hôtes à couper. `carburant-fraicheur.spec.js` l'a recopiée le
// 31 août 2026 en perdant UNE ligne — `'onrender.com'`, la première. Ses
// 30 tests (15 × 2 projets) ont donc appelé le backend de PRODUCTION à chaque
// exécution de CI, et `badge-perf` et `badge-actus-degrade` n'avaient aucune
// coupure du tout — 34 tests par exécution, au total.
//
// ⚠️ CE QUE ÇA A PRODUIT, ET POURQUOI PERSONNE NE L'A VU. L'app compte un
// visiteur unique par `deviceId` tiré de `localStorage` ; Playwright part d'un
// profil VIERGE à chaque test, donc chaque test s'enregistrait comme un
// habitant de plus. 19 exécutions le 16 septembre × 34 tests fuyants : le
// tableau de bord de la mairie a affiché jusqu'à ~550 visiteurs uniques par
// jour, et « Carburant » en tête des services à 234 ouvertures. Les tests
// étaient verts, la CI était verte, et le chiffre faux était **plausible** —
// c'est ce qui l'a fait tenir dix-sept jours. Voir ADR-0048.
//
// ⛔ Une spec qui charge `index.html` DOIT appeler `couperReseauExterne(page)`
// avant son `goto`. `node scripts/check-e2e-reseau.js` le refuse sinon, et la
// CI lance ce contrôle.
"use strict";

/* ⛔ `onrender.com` EN PREMIER, et il ne se retire jamais : c'est le backend de
   production, celui qui tient les statistiques publiées à la mairie. Les
   autres hôtes ne coûtent qu'un test instable ; celui-là fausse une donnée
   que des élus lisent. */
const EXTERNAL_HOSTS = [
  'onrender.com', 'googleapis.com', 'gstatic.com', 'clearbit.com',
  'open-meteo.com', 'facebook.com', 'api-adresse.data.gouv.fr',
  'apicarto.ign.fr', 'data.geopf.fr', 'cadastre.data.gouv.fr',
  'geoportail-urbanisme', 'raw.githubusercontent.com', 'res.cloudinary.com',
  'data.education.gouv.fr', 'ingest.de.sentry.io', 'sentry.io',
  'tile.openstreetmap.org', 'openstreetmap.org'
];

/* Coupe tout appel sortant. `avant` reçoit la route et l'URL : renvoyer `true`
   signifie « je m'en occupe » (une réponse simulée, par exemple), et la route
   n'est alors ni coupée ni relayée.
   ⚠️ L'ORDRE DES `page.route` COMPTE : le DERNIER inscrit gagne. Un
   `route('**\/*')` posé après une simulation la neutralise — d'où ce crochet,
   qui évite d'avoir à s'en souvenir. */
async function couperReseauExterne(page, avant) {
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (typeof avant === 'function' && await avant(route, url)) return;
    if (EXTERNAL_HOSTS.some((h) => url.includes(h))) return route.abort();
    return route.continue();
  });
}

module.exports = { EXTERNAL_HOSTS, couperReseauExterne };
