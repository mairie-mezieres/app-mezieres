#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Commune de Mézières-lez-Cléry
//
// Pipeline conseil municipal — ÉTAPE 3 : fusionner la proposition de l'agent
// dans `data/conseil.json`. Voir ADR-0053.
//
// ⛔ L'AGENT NE TOUCHE JAMAIS `data/conseil.json` : il écrit une PROPOSITION
// (`conseil-drive/proposition.json`), et c'est CE script qui fusionne — même
// partage des rôles que la mémoire de veille (ADR-0027 : l'agent produit un
// JSON, un script écrit le fichier). Tout ce qui garantit l'anti-doublon vit
// donc ici, en code relu, pas dans un prompt.
//
// Règles anti-doublon (cahier des charges §11) :
//   séance            id = date        existe → mise à jour, drive_id posé
//   CR partiel → PV   même id          `document` passe à "pv", jamais l'inverse
//   décision          id (n° délib.)   mise à jour, jamais d'ajout en double
//   décision du Maire date+objet+montant (normalisés)   idem
//   projet            id               existant → mise à jour, pas de doublon
//   fichier Drive     drive_id         traité → inscrit à l'état, plus jamais relu
// Et : AUCUNE séance antérieure à `depuis` (2026-04-01) n'entre dans le fichier.
//
// Node 20+. Aucune dépendance externe.

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const RACINE = path.resolve(__dirname, '..');
const DIR = path.resolve(RACINE, process.env.CONSEIL_DRIVE_DIR || 'conseil-drive');

const RESULTATS = ['adopte', 'avis_favorable', 'prise_acte'];
const NATURES = ['depense', 'recette', 'subvention'];
const STATUTS = ['etude', 'decide', 'en_cours', 'termine'];
const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;

/* ── Validation ───────────────────────────────────────────────
   Chaque refus NOMME le champ fautif : une proposition rejetée en silence
   se relancerait à l'identique la semaine suivante. */
function erreurs(prop, themes) {
  const err = [];
  const dire = (m) => err.push(m);

  // ⛔ Apostrophe ASCII interdite dans tout texte affiché (règle MAT) —
  // parcourue sur TOUTES les chaînes de la proposition.
  (function chasse(v, chemin) {
    if (typeof v === 'string') { if (v.includes("'")) dire("apostrophe ASCII dans " + chemin + ' : « ' + v.slice(0, 60) + ' »'); }
    else if (Array.isArray(v)) v.forEach((x, i) => chasse(x, chemin + '[' + i + ']'));
    else if (v && typeof v === 'object') Object.keys(v).forEach((k) => chasse(v[k], chemin + '.' + k));
  })(prop, 'proposition');

  const seances = Array.isArray(prop.seances) ? prop.seances : [];
  const idsSeance = new Set();
  seances.forEach((s, i) => {
    const ou = 'seances[' + i + ']';
    if (!s || typeof s !== 'object') return dire(ou + ' : pas un objet');
    if (!DATE_ISO.test(s.id || '') || s.id !== s.date) dire(ou + " : id et date doivent être la même date AAAA-MM-JJ (clé anti-doublon)");
    if (idsSeance.has(s.id)) dire(ou + ' : séance ' + s.id + ' en double dans la proposition');
    idsSeance.add(s.id);
    if (s.document !== 'pv' && s.document !== 'cr_partiel') dire(ou + '.document : « pv » ou « cr_partiel »');
    if (typeof s.resume !== 'string' || !s.resume.trim()) dire(ou + '.resume : une phrase obligatoire');
    const idsDec = new Set();
    (Array.isArray(s.decisions) ? s.decisions : []).forEach((d, j) => {
      const dou = ou + '.decisions[' + j + ']';
      if (!d.id || typeof d.id !== 'string') dire(dou + '.id manquant (n° de délibération, sinon identifiant stable)');
      if (idsDec.has(d.id)) dire(dou + ' : décision ' + d.id + ' en double dans la séance');
      idsDec.add(d.id);
      if (themes && d.theme && !themes[d.theme]) dire(dou + '.theme « ' + d.theme + ' » inconnu');
      if (!d.titre || !d.en_clair) dire(dou + ' : titre et en_clair obligatoires');
      if (!RESULTATS.includes(d.resultat)) dire(dou + '.resultat hors ' + RESULTATS.join('/'));
      if (typeof d.unanimite !== 'boolean') dire(dou + '.unanimite : booléen');
      if (d.vote != null && typeof d.vote.pour !== 'number') dire(dou + '.vote : {pour, contre, abstention} ou null');
      if (d.montant != null && (typeof d.montant.valeur !== 'number' || !isFinite(d.montant.valeur)
        || !NATURES.includes(d.montant.nature))) dire(dou + '.montant : {valeur numérique, nature ' + NATURES.join('/') + '} ou null');
    });
    (Array.isArray(s.decisions_maire) ? s.decisions_maire : []).forEach((d, j) => {
      const dou = ou + '.decisions_maire[' + j + ']';
      if (!DATE_ISO.test(d.date || '')) dire(dou + '.date : AAAA-MM-JJ');
      if (!d.objet) dire(dou + '.objet manquant');
      if (d.montant != null && (typeof d.montant !== 'number' || !isFinite(d.montant))) dire(dou + '.montant : nombre ou null');
    });
  });

  const idsProjet = new Set();
  (Array.isArray(prop.projets) ? prop.projets : []).forEach((p, i) => {
    const ou = 'projets[' + i + ']';
    if (!p.id || typeof p.id !== 'string') dire(ou + '.id manquant');
    if (idsProjet.has(p.id)) dire(ou + ' : projet ' + p.id + ' en double dans la proposition');
    idsProjet.add(p.id);
    if (!STATUTS.includes(p.statut)) dire(ou + '.statut hors ' + STATUTS.join('/'));
    if (!p.titre || !p.en_clair) dire(ou + ' : titre et en_clair obligatoires');
    if (!Array.isArray(p.sources) || !p.sources.length) dire(ou + '.sources : au moins une séance source');
    if (!DATE_ISO.test(p.maj || '')) dire(ou + '.maj : AAAA-MM-JJ');
  });

  return err;
}

/* Clé d'une décision du Maire : date + objet + montant, l'objet NORMALISÉ
   (minuscules, sans accents, espaces réduits) — deux extractions du même PDF
   n'écrivent jamais l'objet à l'octet près. */
function cleMaire(d) {
  const objet = String(d.objet || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return d.date + '|' + objet + '|' + (typeof d.montant === 'number' ? d.montant : 'null');
}

/* ── Fusion (pure : rend le nouveau fichier + le journal des changements) ── */
function fusionner(conseil, prop) {
  const journal = [];
  const depuis = conseil.depuis || '2026-04-01';

  (prop.seances || []).forEach((sp) => {
    if (sp.date < depuis) { journal.push('⛔ séance ' + sp.id + ' antérieure au mandat (' + depuis + ') : refusée'); return; }
    const existante = conseil.seances.find((s) => s.id === sp.id);
    if (!existante) {
      conseil.seances.push({
        id: sp.id, date: sp.date, document: sp.document,
        drive_id: sp.drive_id || null, publie: sp.publie !== false,
        resume: sp.resume, decisions: sp.decisions || [], decisions_maire: sp.decisions_maire || []
      });
      journal.push('➕ séance ' + sp.id + ' (' + (sp.decisions || []).length + ' décisions)');
      return;
    }
    // Mise à jour de l'existante — le cas « saisie par anticipation » du
    // cahier des charges : le PDF arrive, la séance est complétée, pas doublée.
    if (sp.drive_id && !existante.drive_id) { existante.drive_id = sp.drive_id; journal.push('🔗 séance ' + sp.id + ' : drive_id renseigné'); }
    if (existante.document === 'cr_partiel' && sp.document === 'pv') { existante.document = 'pv'; journal.push('📄 séance ' + sp.id + ' : cr_partiel → pv'); }
    if (sp.resume && sp.resume !== existante.resume) { existante.resume = sp.resume; journal.push('✏️ séance ' + sp.id + ' : résumé mis à jour'); }
    (sp.decisions || []).forEach((dp) => {
      const dej = existante.decisions.find((d) => d.id === dp.id);
      if (dej) {
        const avant = JSON.stringify(dej);
        Object.assign(dej, dp);
        if (JSON.stringify(dej) !== avant) journal.push('✏️ décision ' + dp.id + ' mise à jour');
      } else {
        existante.decisions.push(dp);
        journal.push('➕ décision ' + dp.id + ' (séance ' + sp.id + ')');
      }
    });
    const clesMaire = new Map(existante.decisions_maire.map((d) => [cleMaire(d), d]));
    (sp.decisions_maire || []).forEach((dp) => {
      const dej = clesMaire.get(cleMaire(dp));
      if (dej) Object.assign(dej, dp);
      else { existante.decisions_maire.push(dp); journal.push('➕ décision du Maire du ' + dp.date + ' (séance ' + sp.id + ')'); }
    });
  });

  const idsSeance = new Set(conseil.seances.map((s) => s.id));
  (prop.projets || []).forEach((pp) => {
    pp.sources = (pp.sources || []).filter((id) => idsSeance.has(id));
    if (!pp.sources.length) { journal.push('⛔ projet ' + pp.id + ' : aucune séance source connue, refusé'); return; }
    const dej = conseil.projets.find((p) => p.id === pp.id);
    if (dej) {
      const avant = JSON.stringify(dej);
      // Mise à jour, jamais un second projet ; les sources s'unissent.
      pp.sources = [...new Set([...(dej.sources || []), ...pp.sources])];
      const publie = dej.publie === true || pp.publie === true; // ne jamais dépublier depuis le pipeline
      Object.assign(dej, pp, { publie });
      if (JSON.stringify(dej) !== avant) journal.push('✏️ projet ' + pp.id + ' mis à jour (' + pp.statut + ')');
    } else {
      // ⛔ « Mise à jour du statut, PAS de nouveau projet » (§11) : créer un
      // projet reste un geste humain — le pipeline le propose dans le résumé
      // de PR, sans toucher au fichier.
      journal.push('⛔ projet ' + pp.id + ' inconnu : le pipeline ne crée pas de projet — « '
        + String(pp.titre).slice(0, 80) + ' » (' + pp.statut + ') est laissé à la main de la mairie');
    }
  });

  conseil.seances.sort((a, b) => (a.date < b.date ? 1 : -1));
  return journal;
}

module.exports = { erreurs, fusionner, cleMaire };
if (require.main !== module) return;

/* ── Exécution ─────────────────────────────────────────────── */
function lire(f) { return JSON.parse(fs.readFileSync(f, 'utf8')); }
function stop(m) { console.error('✗ ' + m); process.exit(1); }

const conseil = lire(path.join(RACINE, 'data/conseil.json'));
const etat = lire(path.join(RACINE, 'data/conseil-drive-etat.json'));
const nouveaux = fs.existsSync(path.join(DIR, 'nouveaux.json')) ? lire(path.join(DIR, 'nouveaux.json')) : [];
const chProp = path.join(DIR, 'proposition.json');
if (!fs.existsSync(chProp)) stop('conseil-drive/proposition.json absent : l’agent n’a rien produit — échec, pas un « rien de nouveau ».');
const prop = lire(chProp);

const fautes = erreurs(prop, conseil.themes);
if (fautes.length) stop('proposition refusée :\n  - ' + fautes.join('\n  - '));

const journal = fusionner(conseil, prop);

/* État des drive_id : ceux consommés par une séance, ceux écartés par l'agent
   (avant-mandat, illisible, pas un compte rendu). Un fichier téléchargé que la
   proposition ne mentionne NULLE PART n'est pas marqué : il sera retenté, et
   le résumé de PR le dit — une absence ne se remarque pas toute seule. */
const consommes = new Map();
(prop.seances || []).forEach((s) => { if (s.drive_id) consommes.set(s.drive_id, s.id); });
const ecartes = new Map((prop.ecartes || []).map((e) => [e.driveId, e]));
const oublies = [];
nouveaux.forEach(({ driveId, nom }) => {
  if (consommes.has(driveId)) etat.traites[driveId] = { seance: consommes.get(driveId), nom };
  else if (ecartes.has(driveId)) etat.traites[driveId] = { ecarte: ecartes.get(driveId).raison || 'ecarte', nom };
  else oublies.push(nom + ' (' + driveId + ')');
});

conseil.maj = new Date().toISOString().slice(0, 10);
const jsonConseil = JSON.stringify(conseil, null, 2) + '\n';
if (jsonConseil.length > 1024 * 1024) stop('data/conseil.json dépasserait 1 Mo : fusion suspecte, on n’écrit pas (ADR-0009).');
fs.writeFileSync(path.join(RACINE, 'data/conseil.json'), jsonConseil);
fs.writeFileSync(path.join(RACINE, 'data/conseil-drive-etat.json'), JSON.stringify(etat, null, 2) + '\n');

const md = ['## Fusion du ' + conseil.maj, '', ...journal.map((l) => '- ' + l)];
if (ecartes.size) { md.push('', '### Fichiers écartés'); ecartes.forEach((e) => md.push('- `' + e.driveId + '` — ' + (e.raison || 'écarté') + (e.detail ? ' : ' + String(e.detail).slice(0, 200) : ''))); }
if (oublies.length) { md.push('', '### ⚠️ Fichiers téléchargés mais ni intégrés ni écartés (seront retentés)'); oublies.forEach((n) => md.push('- ' + n)); }
fs.writeFileSync(path.join(DIR, 'resume-pr.md'), md.join('\n') + '\n');

const changements = journal.some((l) => !l.startsWith('⛔'));
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, 'changements=' + (changements ? 'true' : 'false') + '\n');
console.log(journal.length ? journal.join('\n') : 'Aucun changement.');
