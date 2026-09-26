#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Commune de Mézières-lez-Cléry
//
// Pipeline conseil municipal — ÉTAPE 1 : relever le dossier Drive public des
// comptes rendus, et télécharger les PDF pas encore traités. Voir ADR-0053.
//
// Le dossier est PUBLIC (c'est le lien « Comptes rendus du conseil municipal »
// de l'écran Documents) : la vue `embeddedfolderview` se lit sans clé d'API ni
// OAuth. ⚠️ `drive.google.com` est INJOIGNABLE depuis l'environnement de dev
// (même classe que `data.geopf.fr`, ADR-0051) : ce script ne peut être vérifié
// qu'en CI — d'où des échecs qui DISENT ce qu'ils ont vu.
//
// ⛔ Un parseur qui ne mesure rien ne rougit pas, il verdit (ADR-0030) : une
// page dont le format aurait changé rendrait « 0 fichier », qui se lit
// « rien de nouveau » — et le pipeline se serait éteint en silence. On exige
// donc le MARQUEUR STRUCTUREL de la vue (`flip-entry`) : présent avec
// 0 entrée = dossier vide (normal) ; absent = le parseur ne comprend plus la
// page = ÉCHEC du job, jamais un succès vide.
//
// Entrées (env) :
//   CONSEIL_DRIVE_FOLDER  id du dossier (défaut : le dossier officiel)
//   CONSEIL_DRIVE_DIR     répertoire de travail (défaut : conseil-drive)
// Sorties :
//   <dir>/pdf/<driveId>.pdf          les fichiers nouveaux
//   <dir>/nouveaux.json              [{ driveId, nom }]
//   GITHUB_OUTPUT : nouveaux=<n>
//
// Node 20+ (fetch global). Aucune dépendance externe.

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const RACINE = path.resolve(__dirname, '..');
// Même dossier que le lien « Comptes rendus du conseil municipal » d'index.html.
const DOSSIER = (process.env.CONSEIL_DRIVE_FOLDER || '1Cly3v5rrIo4wAkm2o8kfaWWjgqVsEVXq').trim();
const DIR = path.resolve(RACINE, process.env.CONSEIL_DRIVE_DIR || 'conseil-drive');
const MAX_OCTETS = 20 * 1024 * 1024; // un CR de conseil ne pèse pas 20 Mo
const UA = 'Mozilla/5.0 (X11; Linux x86_64) MAT-conseil-drive (+https://github.com/mairie-mezieres/app-mezieres)';

function stop(msg) { console.error('✗ ' + msg); process.exit(1); }

function lireJson(fichier, dflt) {
  const p = path.join(RACINE, fichier);
  if (!fs.existsSync(p)) return dflt;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

/* drive_id déjà traités : ceux portés par les séances de data/conseil.json
   ET ceux de l'état du pipeline (écartés avant-mandat, illisibles…). Un id
   présent ici n'est ni retéléchargé ni re-proposé — c'est la règle
   « Fichier déjà traité : ignoré » du cahier des charges. */
function idsTraites() {
  const vus = new Set();
  const conseil = lireJson('data/conseil.json', null);
  if (conseil && Array.isArray(conseil.seances)) {
    conseil.seances.forEach((s) => { if (s && s.drive_id) vus.add(String(s.drive_id)); });
  }
  const etat = lireJson('data/conseil-drive-etat.json', null);
  if (etat && etat.traites) Object.keys(etat.traites).forEach((id) => vus.add(id));
  return vus;
}

async function chercher(url) {
  const rep = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'fr' }, redirect: 'follow' });
  if (!rep.ok) throw new Error('HTTP ' + rep.status + ' sur ' + url);
  return rep;
}

/* La vue publique liste chaque fichier dans un bloc `flip-entry` portant
   l'id (`entry-<ID>`) et le nom (`flip-entry-title`). Un fallback relève
   les liens `/file/d/<ID>/` si la structure fine bouge mais pas les liens. */
function parserDossier(html) {
  if (!/flip-entry|embeddedfolderview/.test(html)) {
    stop('La page du dossier Drive ne porte plus le marqueur « flip-entry » : '
      + 'le format a changé, ce parseur ne mesure plus rien (ADR-0030). '
      + 'Relever le nouveau format avant de relancer.');
  }
  const entrees = new Map();
  const motifEntree = /id="entry-([-\w]{10,})"([\s\S]{0,2000}?)flip-entry-title">([^<]+)</g;
  let m;
  while ((m = motifEntree.exec(html)) !== null) {
    // Un SOUS-DOSSIER (« Archives » au premier run réel) pointe vers
    // /drive/folders/ : le télécharger rendait HTTP 500, retenté chaque
    // semaine. On ne descend pas dedans — le dossier des CR est plat.
    if (/\/folders\//.test(m[2])) { console.log('  ⤷ sous-dossier ignoré : ' + m[3].trim()); continue; }
    entrees.set(m[1], m[3].trim());
  }
  if (entrees.size === 0) {
    const motifLien = /\/file\/d\/([-\w]{10,})\//g;
    while ((m = motifLien.exec(html)) !== null) {
      if (!entrees.has(m[1])) entrees.set(m[1], 'fichier ' + m[1]);
    }
  }
  return entrees;
}

async function telecharger(driveId) {
  let rep = await chercher('https://drive.google.com/uc?export=download&id=' + encodeURIComponent(driveId));
  let corps = Buffer.from(await rep.arrayBuffer());
  // Gros fichier : Drive intercale une page « confirm » HTML. On rejoue avec
  // le jeton ; si on ne le trouve pas, on échoue en le disant.
  if (corps.subarray(0, 4).toString() !== '%PDF') {
    const html = corps.toString('utf8');
    const conf = html.match(/confirm=([0-9A-Za-z_-]+)/);
    if (conf) {
      rep = await chercher('https://drive.google.com/uc?export=download&confirm=' + conf[1]
        + '&id=' + encodeURIComponent(driveId));
      corps = Buffer.from(await rep.arrayBuffer());
    }
  }
  if (corps.subarray(0, 4).toString() !== '%PDF') {
    throw new Error('le contenu téléchargé n’est pas un PDF (' + corps.length + ' octets)');
  }
  if (corps.length > MAX_OCTETS) throw new Error('PDF de ' + corps.length + ' octets : au-delà du garde-fou');
  return corps;
}

(async () => {
  const vus = idsTraites();
  const rep = await chercher('https://drive.google.com/embeddedfolderview?id=' + encodeURIComponent(DOSSIER) + '#list');
  const entrees = parserDossier(await rep.text());
  console.log(entrees.size + ' fichier(s) dans le dossier, ' + vus.size + ' id déjà traités.');

  fs.mkdirSync(path.join(DIR, 'pdf'), { recursive: true });
  const nouveaux = [];
  for (const [driveId, nom] of entrees) {
    if (vus.has(driveId)) continue;
    try {
      const corps = await telecharger(driveId);
      fs.writeFileSync(path.join(DIR, 'pdf', driveId + '.pdf'), corps);
      nouveaux.push({ driveId, nom });
      console.log('  ↓ ' + driveId + ' — ' + nom + ' (' + corps.length + ' octets)');
    } catch (e) {
      // Un fichier qui refuse de descendre ne condamne pas les autres, mais
      // ne devient JAMAIS un « traité » : il sera retenté au prochain run.
      console.error('  ✗ ' + driveId + ' — ' + nom + ' : ' + e.message);
    }
  }

  fs.writeFileSync(path.join(DIR, 'nouveaux.json'), JSON.stringify(nouveaux, null, 2) + '\n');
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, 'nouveaux=' + nouveaux.length + '\n');
  }
  console.log(nouveaux.length + ' fichier(s) nouveau(x) à traiter.');
})().catch((e) => stop(e.message));
