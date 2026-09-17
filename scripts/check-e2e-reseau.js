#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Commune de Mézières-lez-Cléry
//
// ⛔ AUCUNE SPEC E2E NE DOIT APPELER LE BACKEND DE PRODUCTION.
//
// Le 31 août 2026, `carburant-fraicheur.spec.js` a recopié la liste des hôtes
// coupés en perdant sa première ligne — `'onrender.com'`. Pendant dix-sept
// jours, chaque exécution de CI a posté des `/stats/track` réels : Playwright
// partant d'un profil vierge, CHAQUE TEST comptait comme un visiteur unique de
// plus. Le tableau de bord de la mairie a affiché jusqu'à ~550 visiteurs par
// jour et « Carburant » en tête des services, à 234 ouvertures.
//
// ⚠️ RIEN NE POUVAIT LE VOIR. Les tests étaient verts (ils ne testaient pas
// ça), la CI était verte, et le chiffre faux était PLAUSIBLE — une commune qui
// décolle. Un test ne peut pas attraper ce défaut : il porte sur ce que les
// tests EUX-MÊMES font. D'où ce contrôle statique, lancé par la CI.
//
// ⚠️ On vérifie le COMPORTEMENT (la production est-elle coupée ?), pas le
// mécanisme : une spec qui garde sa propre liste passe, tant que
// `onrender.com` y est. Exiger le module partagé ferait échouer onze specs
// correctes, et un contrôle qui rougit à tort finit par être désactivé.
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DIR  = path.join(__dirname, '..', 'tests', 'e2e');
const PROD = 'onrender.com';

/* ⚠️ DEUX PIÈGES, UN DANS CHAQUE SENS.

   Il rougit à tort : l'hôte s'écrit en chaîne (`'onrender.com'`) mais aussi
   dans une REGEX, où le point est échappé (`/onrender\.com|…/`). Un `includes`
   naïf déclarait `documents-officiels.spec.js` fautive alors qu'elle coupe
   parfaitement — et un contrôle qui rougit à tort finit désactivé.

   ⛔ Il verdit à tort, et c'est pire : **une mention en COMMENTAIRE n'est pas
   une coupure.** Ce script a d'abord validé une spec délibérément sabotée,
   uniquement parce qu'un commentaire y racontait l'incident en citant
   `onrender.com`. Un contrôle qui ne mesure rien ne rougit pas, il verdit
   (ADR-0030) — et celui-ci serait né vert. On retire donc les commentaires
   avant de chercher.

   ⚠️ Et on ne retire PAS les commentaires de bloc par une regex : le motif
   Playwright « deux étoiles, barre, étoile », présent dans chaque
   `page.route`, porte exactement les deux délimiteurs d'un bloc, dans l'ordre.
   Un stripper naïf y voit un commentaire ouvert et avale la moitié du fichier
   — c'est ce qui a fait rougir `documents-officiels.spec.js`, qui coupe
   pourtant parfaitement. (Le piège mord aussi celui qui l'explique : la
   première version de ce commentaire citait le délimiteur fermant en clair,
   et refermait donc le bloc qu'on est en train de lire.)

   On exige donc DEUX choses de chaque occurrence :
     1. sa ligne n'est pas une ligne de commentaire (`//`, `*`, `/*`) ;
     2. elle est collée à un délimiteur de chaîne ou de regex (`'`, `"`, `/`,
        `|`), ou à un point de sous-domaine (`x.onrender.com` dans une URL
        écrite en dur) — donc du code, pas une citation dans une phrase. */
function bloqueProd(src) {
  return src.split('\n').some((ligne) => {
    const nu = ligne.trim();
    if (nu.startsWith('//') || nu.startsWith('*') || nu.startsWith('/*')) return false;
    return /['"/|.]onrender\\?\.com/.test(ligne);
  });
}

/* ⛔ AUTO-CONTRÔLE DU DÉTECTEUR. Un contrôle qui ne mesure rien ne rougit pas :
   il VERDIT (c'est la leçon d'ADR-0030). On vérifie donc ici que `bloqueProd`
   sait dire non — sans quoi ce script signerait un blanc-seing à tout le
   dossier le jour où une refonte casse sa détection. */
for (const [src, attendu] of [
  ["const H = ['onrender.com', 'sentry.io'];",    true],  // liste en chaînes
  ['const e = /onrender\\.com|geopf/.test(u);',     true],  // regex échappée
  ["const H = ['googleapis.com','sentry.io'];",   false],  // la copie fautive
  ["const u = 'https://x.onrender.com/stats';",    true],  // une URL reste du code
  // ⛔ LES TROIS CAS QUI ONT RÉELLEMENT MIS CE SCRIPT EN DÉFAUT.
  // Les deux premiers le faisaient VERDIR sur une spec sabotée : un
  // commentaire racontant l'incident suffisait à le satisfaire.
  ["// la copie avait perdu 'onrender.com'\nconst H = ['gstatic.com'];", false],
  [" * on coupait bien onrender.com avant\nconst H = ['gstatic.com'];",  false],
  // Le troisième le faisait ROUGIR sur une spec saine : le motif Playwright
  // `'**/*'` porte `*/` puis `/*`, que tout stripper de blocs prend pour un
  // commentaire — il avalait alors la vraie liste, plus bas dans le fichier.
  ["page.route('**/*', f);\nconst e = /onrender\\.com|geopf/.test(u);",  true],
]) {
  if (bloqueProd(src) !== attendu) {
    console.error('⛔ Le détecteur lui-même est cassé : « ' + src + ' » devrait valoir ' + attendu);
    process.exit(1);
  }
}

const specs = fs.readdirSync(DIR).filter((f) => f.endsWith('.spec.js'));
const fautives = [];

for (const nom of specs) {
  const src = fs.readFileSync(path.join(DIR, nom), 'utf8');

  // Une spec qui n'ouvre jamais de page ne peut rien appeler : plusieurs ne
  // lisent que des fichiers (ecole-periscolaire, par exemple).
  if (!/\bpage\s*\.\s*goto\s*\(/.test(src)) continue;

  const viaHelper = /require\(['"]\.\/helpers\/reseau['"]\)/.test(src)
                 && /couperReseauExterne\s*\(/.test(src);
  const viaListe  = bloqueProd(src);

  if (!viaHelper && !viaListe) fautives.push(nom);
}

if (fautives.length) {
  console.error('\n⛔ Spec(s) E2E pouvant appeler le backend de PRODUCTION :\n');
  for (const f of fautives) console.error('   • tests/e2e/' + f);
  console.error(
    '\nChaque test y compte un visiteur unique de plus dans les statistiques\n' +
    'publiées à la mairie. Corriger ainsi, AVANT le `goto` :\n\n' +
    "   const { couperReseauExterne } = require('./helpers/reseau');\n" +
    '   await couperReseauExterne(page);\n\n' +
    'Pour simuler une réponse, passer le crochet plutôt qu\'un `page.route`\n' +
    'ajouté ensuite — le dernier inscrit gagne. Voir ADR-0048.\n'
  );
  process.exit(1);
}

const ouvrantes = specs.filter((f) =>
  /\bpage\s*\.\s*goto\s*\(/.test(fs.readFileSync(path.join(DIR, f), 'utf8')));
console.log(`✓ ${ouvrantes.length} spec(s) chargeant une page — toutes coupent la production.`);
console.log(`  (${specs.length - ouvrantes.length} spec(s) sans navigateur, hors périmètre.)`);
