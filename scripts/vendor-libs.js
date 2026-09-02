#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════
   Vendorisation des bibliothèques tierces — MAT
   Copyright (c) 2024-2026 Commune de Mézières-lez-Cléry — Licence MIT

   POURQUOI CE SCRIPT EXISTE
   -------------------------
   L'application n'a pas d'étape de construction : GitHub Pages sert le dépôt
   tel quel. Une dépendance npm n'arrive donc JAMAIS chez l'utilisateur si elle
   reste dans `node_modules/` — il faut que le fichier servi soit dans le dépôt.

   D'où ce script : `npm ci && npm run vendor` copie les builds UMD des
   bibliothèques figées dans `package.json` vers `vendor/`, qui EST commité.
   `package.json` garde la provenance et la version exacte ; `vendor/` garde
   ce qui est réellement servi. Les deux ne peuvent pas diverger en silence :
   le script refuse de copier si la version installée n'est pas celle attendue.

   Ce qui interdit de repasser par un CDN : l'atelier fichiers de l'admin
   traite des documents de la mairie **entièrement dans le navigateur**. Un
   `<script src>` vers un domaine tiers, c'est une requête sortante à chaque
   ouverture, et un tiers qui peut changer le code qui manipule ces documents.

   ⚠️ Ce script ne fait que des copies de fichiers entiers (`copyFileSync`).
   Aucune substitution de motif : la règle 2 du CLAUDE.md ne peut pas être
   enfreinte ici, et il n'y a rien à relire après coup au-delà de la taille,
   que le script affiche lui-même.
   ════════════════════════════════════════════════════════════ */

'use strict';

const fs = require('fs');
const path = require('path');

const RACINE = path.resolve(__dirname, '..');
const MODULES = path.join(RACINE, 'node_modules');

/* Chaque entrée : le paquet npm, et les fichiers à copier vers vendor/.
   Uniquement des builds UMD : l'application n'utilise pas de modules ES,
   les bibliothèques sont chargées par injection de <script src>. */
const A_COPIER = [
  {
    paquet: 'pdfjs-dist',
    destination: 'vendor/pdfjs',
    fichiers: [
      // Le moteur, et son worker — pdf.js réclame le second par URL, d'où
      // `workerSrc` pointé sur cette copie locale dans mat-atelier-fichiers.js.
      ['build/pdf.min.js', 'pdf.min.js'],
      ['build/pdf.worker.min.js', 'pdf.worker.min.js']
    ]
  },
  {
    paquet: 'pdf-lib',
    destination: 'vendor/pdf-lib',
    fichiers: [['dist/pdf-lib.min.js', 'pdf-lib.min.js']]
  },
  {
    paquet: 'jszip',
    destination: 'vendor/jszip',
    fichiers: [['dist/jszip.min.js', 'jszip.min.js']]
  }
];

const attendues = JSON.parse(
  fs.readFileSync(path.join(RACINE, 'package.json'), 'utf8')
).devDependencies || {};

if (!fs.existsSync(MODULES)) {
  console.error('✗ node_modules/ absent. Lancez `npm ci` avant `npm run vendor`.');
  process.exit(1);
}

let erreur = false;
const copies = [];

for (const lot of A_COPIER) {
  const racinePaquet = path.join(MODULES, lot.paquet);
  const manifeste = path.join(racinePaquet, 'package.json');

  if (!fs.existsSync(manifeste)) {
    console.error(`✗ ${lot.paquet} n'est pas installé.`);
    erreur = true;
    continue;
  }

  const installee = JSON.parse(fs.readFileSync(manifeste, 'utf8')).version;
  const attendue = attendues[lot.paquet];
  if (attendue && installee !== attendue) {
    console.error(`✗ ${lot.paquet} : version ${installee} installée, ${attendue} attendue.`);
    console.error('  vendor/ servirait un code que package.json ne décrit pas.');
    erreur = true;
    continue;
  }

  const dossier = path.join(RACINE, lot.destination);
  fs.mkdirSync(dossier, { recursive: true });

  for (const [source, nom] of lot.fichiers) {
    const depuis = path.join(racinePaquet, source);
    if (!fs.existsSync(depuis)) {
      console.error(`✗ ${lot.paquet}/${source} introuvable.`);
      erreur = true;
      continue;
    }
    const vers = path.join(dossier, nom);
    fs.copyFileSync(depuis, vers);
    copies.push({
      chemin: `${lot.destination}/${nom}`,
      version: installee,
      octets: fs.statSync(vers).size
    });
  }
}

if (erreur) process.exit(1);

/* Une note dans chaque dossier : sans elle, un fichier minifié de 1 Mo posé
   dans le dépôt n'a plus ni provenance ni version six mois plus tard. */
for (const lot of A_COPIER) {
  const installee = JSON.parse(
    fs.readFileSync(path.join(MODULES, lot.paquet, 'package.json'), 'utf8')
  ).version;
  fs.writeFileSync(
    path.join(RACINE, lot.destination, 'PROVENANCE.txt'),
    `${lot.paquet} ${installee}\n\n` +
    `Copié depuis node_modules/${lot.paquet}/ par scripts/vendor-libs.js.\n` +
    `Ne pas modifier à la main : régénérer avec « npm ci && npm run vendor ».\n` +
    `La version est figée dans package.json (devDependencies).\n`
  );
}

console.log('✓ Bibliothèques vendorisées :\n');
for (const c of copies) {
  const ko = (c.octets / 1024).toFixed(0).padStart(5);
  console.log(`  ${ko} Ko  ${c.chemin}  (v${c.version})`);
}
const total = copies.reduce((s, c) => s + c.octets, 0);
console.log(`\n  ${(total / 1024 / 1024).toFixed(2)} Mo au total — chargés uniquement à l'ouverture de l'onglet.`);
