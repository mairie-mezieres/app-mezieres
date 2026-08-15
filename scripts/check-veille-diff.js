#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════
   Garde-fou des PR draft de veille — MAT
   Copyright (c) 2024-2026 Commune de Mézières-lez-Cléry — Licence MIT

   POURQUOI CE SCRIPT EXISTE
   -------------------------
   L'étage 2 de la veille (ADR-0023) lance un agent sur une action déduite de
   PAGES WEB — une donnée non fiable par construction. Le prompt lui interdit
   d'obéir à des instructions trouvées dans ces pages, mais un prompt est une
   consigne, pas une barrière.

   Ce script est la barrière. Il s'exécute APRÈS l'agent et AVANT le commit :
   ce qui n'est pas explicitement autorisé est refusé.

   CE QU'IL REFUSE, ET POURQUOI
   ----------------------------
   • `.github/**`      — un correctif qui réécrit son propre workflow, c'est une
                         élévation de privilège : la veille suivante s'exécuterait
                         avec les règles qu'un site web aura dictées.
   • `scripts/**`      — dont ce fichier et `check-cache-bust.js` : un agent qui
                         peut désarmer les contrôles n'est plus contrôlé.
   • `veille/**`       — la mémoire de veille est écrite par le workflow, pas par
                         un correctif.
   • `data/saviez-vous.json` — « aucune IA ne doit jamais écrire ces faits »
                         (ADR-0012). La règle vaut aussi pour cet agent-ci.
   • Tout le reste hors liste blanche (CNAME, _headers, LICENSE, admin.html…).

   Et deux plafonds : un correctif de veille est un petit correctif. Au-delà,
   ce n'est plus une mise à jour sourcée, c'est un chantier — il passe par un
   humain.
   ════════════════════════════════════════════════════════════ */

'use strict';

const path = require('path');
const { execFileSync } = require('child_process');

const RACINE = path.resolve(__dirname, '..');
const MAX_FICHIERS = Number(process.env.VEILLE_MAX_FICHIERS || 8);
const MAX_LIGNES = Number(process.env.VEILLE_MAX_LIGNES || 400);

/* Liste blanche : ce qu'un correctif de veille peut légitimement toucher.
   Chaque motif exige au moins un caractère de nom de fichier — aucun ne peut
   matcher la chaîne vide (règle 2 du CLAUDE.md). */
const AUTORISES = [
  /^js\/[A-Za-z0-9._-]+\.js$/,
  /^css\/[A-Za-z0-9._-]+\.css$/,
  /^index\.html$/,
  /^offline\.html$/,
  /^notif\.html$/,
  /^partager\.html$/,
  /^service-worker\.js$/,
  /^manifest\.webmanifest$/,
  /^CHANGELOG\.md$/,
  /^docs\/[A-Za-z0-9._\/-]+\.md$/,
];

/* Refus explicites, prioritaires sur la liste blanche : `docs/**` est autorisé,
   mais pas au prix d'une exception qui passerait inaperçue. */
const REFUSES = [
  /^\.github\//,
  /^scripts\//,
  /^veille\//,
  /^data\//,
  /^\.git/,
];

function git(args) {
  return execFileSync('git', args, { cwd: RACINE, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
}

/* `git status --porcelain` plutôt qu'un `git diff` : l'agent peut aussi avoir
   CRÉÉ un fichier, et un fichier non suivi n'apparaît dans aucun diff. */
function fichiersModifies() {
  return git(['status', '--porcelain', '--untracked-files=all'])
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      const chemin = l.slice(3);
      // « ancien -> nouveau » pour un renommage : les deux comptent.
      return chemin.includes(' -> ') ? chemin.split(' -> ') : [chemin];
    })
    .flat()
    .map((f) => f.replace(/^"|"$/g, '').trim())
    .filter(Boolean);
}

function lignesModifiees() {
  // Fichiers suivis : le décompte exact du diff.
  let total = 0;
  const numstat = git(['diff', '--numstat', 'HEAD']).split('\n').filter(Boolean);
  for (const l of numstat) {
    const [ajouts, retraits] = l.split('\t');
    total += (Number(ajouts) || 0) + (Number(retraits) || 0);
  }
  // Fichiers non suivis : tout leur contenu est un ajout.
  const nouveaux = git(['ls-files', '--others', '--exclude-standard']).split('\n').filter(Boolean);
  for (const f of nouveaux) {
    try {
      total += git(['--no-pager', 'diff', '--no-index', '--numstat', '/dev/null', f])
        .split('\n').filter(Boolean)
        .reduce((n, l) => n + (Number(l.split('\t')[0]) || 0), 0);
    } catch (e) {
      // `diff --no-index` sort en 1 quand il y a des différences : c'est le cas normal.
      const sortie = (e.stdout || '').toString();
      total += sortie.split('\n').filter(Boolean)
        .reduce((n, l) => n + (Number(l.split('\t')[0]) || 0), 0);
    }
  }
  return total;
}

const fichiers = fichiersModifies();

if (fichiers.length === 0) {
  console.log('Aucune modification : l\'action ne s\'applique pas à ce dépôt. Aucune PR à ouvrir.');
  process.exit(0);
}

const interdits = fichiers.filter(
  (f) => REFUSES.some((r) => r.test(f)) || !AUTORISES.some((r) => r.test(f))
);

let erreur = false;

if (interdits.length) {
  erreur = true;
  console.error('✗ Fichiers hors périmètre d\'une PR de veille :\n');
  for (const f of interdits) console.error(`  ${f}`);
  console.error('\n  Un correctif déduit de pages web ne touche ni la CI, ni les scripts de');
  console.error('  contrôle, ni le corpus « Le saviez-vous ? ». Si l\'action est légitime,');
  console.error('  elle reste dans l\'issue-checklist et passe par un humain.\n');
}

if (fichiers.length > MAX_FICHIERS) {
  erreur = true;
  console.error(`✗ ${fichiers.length} fichiers modifiés (plafond : ${MAX_FICHIERS}).`);
  console.error('  Un correctif de veille est un petit correctif ; au-delà, c\'est un chantier.\n');
}

const lignes = lignesModifiees();
if (lignes > MAX_LIGNES) {
  erreur = true;
  console.error(`✗ ${lignes} lignes modifiées (plafond : ${MAX_LIGNES}).`);
  console.error('  Même remarque : ce volume demande une revue humaine en amont.\n');
}

if (erreur) process.exit(1);

console.log(`✓ ${fichiers.length} fichier(s), ${lignes} ligne(s) — périmètre respecté :`);
for (const f of fichiers) console.log(`    ${f}`);
