#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Commune de Mézières-lez-Cléry
//
// Pipeline conseil municipal — mémoire des fichiers ÉCARTÉS (ADR-0053 §7).
//
// Ajoute `conseil-drive/ecartes.json` (produit par la fusion) à
// `data/conseil-drive-etat.json`. Lancé par le workflow sur un checkout
// PROPRE de main, puis commité directement sur main — comme la mémoire de
// veille (ADR-0027). Un fichier écarté n'est plus jamais retéléchargé ni
// relu par l'agent. Pour forcer une relecture (un scan remplacé par une
// version lisible, par exemple), supprimer son entrée à la main.
//
// ⚠️ Écrit SEULEMENT les écartés : les fichiers devenus séances sont
// mémorisés par leur `drive_id` dans data/conseil.json, qui voyage dans la
// PR draft. Deux fichiers distincts, deux chemins : aucun conflit possible
// entre ce commit direct et la PR.

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const RACINE = path.resolve(__dirname, '..');
const DIR = path.resolve(RACINE, process.env.CONSEIL_DRIVE_DIR || 'conseil-drive');
const ETAT = path.join(RACINE, 'data/conseil-drive-etat.json');

const ajouts = JSON.parse(fs.readFileSync(path.join(DIR, 'ecartes.json'), 'utf8'));
const etat = fs.existsSync(ETAT) ? JSON.parse(fs.readFileSync(ETAT, 'utf8')) : { schema: 1, traites: {} };
if (!etat.traites || typeof etat.traites !== 'object') etat.traites = {};

let n = 0;
Object.keys(ajouts).forEach((id) => {
  if (etat.traites[id]) return; // déjà mémorisé : idempotent
  etat.traites[id] = ajouts[id];
  n++;
});

fs.writeFileSync(ETAT, JSON.stringify(etat, null, 2) + '\n');
console.log(n + ' fichier(s) écarté(s) ajouté(s) à la mémoire ('
  + Object.keys(etat.traites).length + ' au total).');
