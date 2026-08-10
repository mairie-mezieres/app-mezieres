#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════
   Contrôle du cache-busting — MAT
   Copyright (c) 2024-2026 Commune de Mézières-lez-Cléry — Licence MIT

   POURQUOI CE SCRIPT EXISTE
   -------------------------
   Le service worker sert les assets en « stale-while-revalidate » : la copie
   en cache part immédiatement, la version réseau n'arrive qu'ensuite. C'est
   volontaire, et c'est ce qui rend l'application instantanée. La contrepartie
   est que **le seul signal de fraîcheur est l'URL**, donc la chaîne `?v=`.

   Le 10 août 2026, `js/mat-boot.js` a été modifié trois fois (v4.64, v4.66)
   sans que son `?v=4.4.1` change. Les habitants ont donc continué de recevoir
   l'ANCIEN `mat-boot.js`, qui demandait l'ANCIEN `mat-carte3d.js?v=1.0.0` :
   le bouton « Où suis-je » s'affichait — `index.html`, lui, n'est pas
   versionné — mais ne répondait pas, et le zonage n'était pas découpé sur la
   commune. Un correctif fusionné, testé, déployé… et invisible.

   CE QU'IL VÉRIFIE
   ----------------
   1. Cohérence : un même fichier doit porter le même `?v=` partout
      (`index.html`, `js/mat-boot.js`, `service-worker.js`).
   2. Fraîcheur : tout fichier de `js/` ou `css/` modifié par rapport à la
      branche de base doit voir son `?v=` modifié dans le même lot.

   Le contrôle 2 est ignoré si l'historique git n'est pas disponible (clone
   superficiel, exécution hors dépôt) : mieux vaut ne pas vérifier que d'échouer
   à tort. La CI récupère l'historique complet pour que ce cas ne se produise pas.
   ════════════════════════════════════════════════════════════ */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const RACINE = path.resolve(__dirname, '..');
const SOURCES = ['index.html', 'js/mat-boot.js', 'service-worker.js'];

/* Repère « js/mat-truc.js?v=1.2.3 » ou « ./css/mat.css?v=4.13.0 ».
   Le motif exige au moins un caractère de chemin ET une version : il ne peut
   pas matcher la chaîne vide (règle 2 du CLAUDE.md). */
const MOTIF = /(?:\.\/)?((?:js|css|data)\/[A-Za-z0-9._-]+\.(?:js|css|json))\?v=([A-Za-z0-9._-]+)/g;

function lire(f) {
  const p = path.join(RACINE, f);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

/* ── 1. Cohérence des versions entre les trois fichiers ───────── */
const versions = new Map();          // fichier → Map(version → [où])
for (const src of SOURCES) {
  const contenu = lire(src);
  if (contenu === null) continue;
  let m;
  MOTIF.lastIndex = 0;
  while ((m = MOTIF.exec(contenu)) !== null) {
    const [, fichier, version] = m;
    if (!versions.has(fichier)) versions.set(fichier, new Map());
    const par = versions.get(fichier);
    if (!par.has(version)) par.set(version, []);
    par.get(version).push(src);
  }
}

const incoherents = [];
for (const [fichier, par] of versions) {
  if (par.size > 1) {
    incoherents.push(
      `  ${fichier}\n` +
      [...par].map(([v, ou]) => `      ?v=${v}  →  ${[...new Set(ou)].join(', ')}`).join('\n')
    );
  }
}

/* ── 2. Un fichier modifié doit voir son ?v= modifié ──────────── */
function git(args) {
  return execFileSync('git', args, { cwd: RACINE, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

let oublies = [];
let baseUtilisee = null;
try {
  const base = process.env.BASE_REF || 'origin/main';
  git(['rev-parse', '--verify', base]);                 // lève si absent
  const fusion = git(['merge-base', 'HEAD', base]);
  const modifies = git(['diff', '--name-only', fusion, 'HEAD']).split('\n').filter(Boolean);
  baseUtilisee = base;

  const actifs = modifies.filter(f => /^(js|css)\/[^/]+\.(js|css)$/.test(f));
  if (actifs.length) {
    // Les versions déclarées avant / après, pour comparer.
    const avant = new Map();
    for (const src of SOURCES) {
      let contenu;
      try { contenu = git(['show', `${fusion}:${src}`]); } catch (_) { continue; }
      let m; MOTIF.lastIndex = 0;
      while ((m = MOTIF.exec(contenu)) !== null) avant.set(m[1], m[2]);
    }
    for (const f of actifs) {
      const apres = versions.has(f) ? [...versions.get(f).keys()][0] : null;
      if (apres === null) continue;                     // fichier non référencé : hors sujet
      if (avant.has(f) && avant.get(f) === apres) oublies.push(`  ${f}  (toujours ?v=${apres})`);
    }
  }
} catch (_) {
  baseUtilisee = null;                                   // historique indisponible → contrôle 2 ignoré
}

/* ── Verdict ─────────────────────────────────────────────────── */
let erreur = false;

if (incoherents.length) {
  erreur = true;
  console.error('✗ Versions incohérentes entre index.html, mat-boot.js et service-worker.js :\n');
  console.error(incoherents.join('\n') + '\n');
  console.error('  Un même fichier doit porter le même ?v= partout, sinon le service worker');
  console.error('  met deux copies en cache et en sert une au hasard.\n');
}

if (oublies.length) {
  erreur = true;
  console.error('✗ Fichiers modifiés dont le ?v= n\'a pas bougé :\n');
  console.error(oublies.join('\n') + '\n');
  console.error('  Le service worker sert la copie en cache tant que l\'URL est identique :');
  console.error('  vos modifications n\'atteindront pas les habitants déjà équipés.');
  console.error('  Incrémentez le ?v= dans index.html, js/mat-boot.js ET service-worker.js.\n');
}

if (erreur) process.exit(1);

const n = versions.size;
console.log(`✓ ${n} ressource(s) versionnée(s), versions cohérentes`
  + (baseUtilisee ? ` et à jour par rapport à ${baseUtilisee}.` : ' (fraîcheur non vérifiée : historique git indisponible).'));
