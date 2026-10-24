#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════
   MAT — Aucune assertion « regard en arrière » dans le code servi
   Copyright (c) 2024-2026 Commune de Mézières-lez-Cléry — Licence MIT
   ════════════════════════════════════════════════════════════

   Pourquoi ce script (ADR-0055) : Safari ne connaît les assertions
   « regard en arrière » des expressions régulières (lookbehind, positive
   ou négative) qu'à partir de la version 16.4. Écrite en LITTÉRAL, une
   seule de ces expressions fait refuser le fichier ENTIER à la lecture :
   aucune de ses fonctions n'existe, et les autres scripts plantent au
   premier appel (« Can't find variable: matAbortTimeout », issues #500 et
   #501). Écrite dans un `new RegExp(...)` de niveau module, elle arrête le
   script à cette ligne.

   Les tests ne peuvent pas le voir : Playwright lance un Chromium récent.
   `node --check` non plus : Node la connaît depuis longtemps.

   Contrôle volontairement grossier et sans dépendance : toute occurrence
   des deux séquences dans un fichier servi est refusée, commentaires
   compris — en parler en toutes lettres suffit.
   ════════════════════════════════════════════════════════════ */

'use strict';

const fs = require('fs');
const path = require('path');

const RACINE = path.resolve(__dirname, '..');
const DOSSIERS = ['js', 'jeu', 'jeux'];
const EXCLUS = new Set(['vendor', 'node_modules']);
// Les deux séquences, assemblées pour que ce fichier ne se signale pas lui-même.
const MOTIF = new RegExp('\\(\\?<[' + '=!]');

function lister(dossier) {
  const abs = path.join(RACINE, dossier);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((e) => {
    if (EXCLUS.has(e.name)) return [];
    const rel = path.join(dossier, e.name);
    if (e.isDirectory()) return lister(rel);
    return /\.(js|html)$/.test(e.name) ? [rel] : [];
  });
}

const fichiers = [
  ...fs.readdirSync(RACINE).filter((f) => /\.html$/.test(f) || f === 'service-worker.js'),
  ...DOSSIERS.flatMap(lister),
];

const fautes = [];
for (const f of fichiers) {
  fs.readFileSync(path.join(RACINE, f), 'utf8').split('\n').forEach((ligne, i) => {
    if (MOTIF.test(ligne)) fautes.push(`${f}:${i + 1}: ${ligne.trim().slice(0, 120)}`);
  });
}

if (fautes.length) {
  console.error('❌ Assertion « regard en arrière » dans une expression régulière :');
  for (const l of fautes) console.error('   ' + l);
  console.error('\n   Safari < 16.4 refuse le fichier entier. Tester le caractère');
  console.error('   précédent dans la fonction de remplacement (offset). ADR-0055.');
  process.exit(1);
}
console.log(`✅ ${fichiers.length} fichiers, aucune assertion « regard en arrière ».`);
