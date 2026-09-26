#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2024-2026 Commune de Mézières-lez-Cléry
//
// Rejoue les règles anti-doublon de la fusion conseil-drive (ADR-0053) sur
// des fixtures. ⛔ Ces règles ne peuvent PAS être couvertes par les tests
// E2E : elles ne s'exécutent qu'en workflow, sur des PDF qui n'existent pas
// encore — et un doublon de séance ne se verrait qu'au conseil suivant, en
// production, dans l'application. Lancé par la CI (ci.yml).

'use strict';

const { erreurs, fusionner, cleMaire } = require('./conseil-drive-fusion.js');

let rate = 0;
function verifier(nom, ok, detail) {
  if (ok) { console.log('✓ ' + nom); return; }
  rate++;
  console.error('✗ ' + nom + (detail ? ' — ' + detail : ''));
}

function base() {
  return {
    schema: 1, maj: '2026-09-26', prochaine_seance: null, depuis: '2026-04-01',
    themes: { mairie: { label: 'Mairie', ico: '🏛️', couleur: '#1A3D2B' } },
    seances: [{
      id: '2026-08-31', date: '2026-08-31', document: 'pv', drive_id: null, publie: true,
      resume: 'Résumé initial.',
      decisions: [{ id: '2026/29', num: '2026/29', theme: 'mairie', titre: 'T', en_clair: 'E', resultat: 'adopte', unanimite: true, vote: null, montant: null }],
      decisions_maire: [{ date: '2026-08-20', theme: 'mairie', objet: 'Achat d’une éplucheuse', montant: 3956.52 }]
    }],
    projets: [{ id: 'toiture-ecole', titre: 'Toiture', theme: 'mairie', statut: 'decide', en_clair: 'E', montant: null, echeance: null, maj: '2026-08-31', sources: ['2026-08-31'], publie: true }]
  };
}
const decision = (id, extra) => Object.assign({ id, num: id, theme: 'mairie', titre: 'T', en_clair: 'E', resultat: 'adopte', unanimite: true, vote: null, montant: null }, extra);
const seance = (extra) => Object.assign({ id: '2026-08-31', date: '2026-08-31', document: 'pv', drive_id: 'DRV1', publie: true, resume: 'Résumé initial.', decisions: [], decisions_maire: [] }, extra);

// 1. Le PDF d'une séance saisie par anticipation MET À JOUR, ne double pas.
{
  const c = base();
  fusionner(c, { seances: [seance({ resume: 'Résumé du PV.' })], projets: [] });
  verifier('séance anticipée : mise à jour, pas de doublon', c.seances.length === 1
    && c.seances[0].drive_id === 'DRV1' && c.seances[0].resume === 'Résumé du PV.');
}
// 2. Une décision déjà connue est mise à jour ; une nouvelle s'ajoute — une seule fois.
{
  const c = base();
  const p = { seances: [seance({ decisions: [decision('2026/29', { titre: 'T2' }), decision('2026/30')] })], projets: [] };
  fusionner(c, p); fusionner(c, p); // le re-run d'un job ne double rien
  verifier('décisions : maj par id, jamais d’ajout en double (re-run compris)',
    c.seances[0].decisions.length === 2 && c.seances[0].decisions[0].titre === 'T2');
}
// 3. cr_partiel → pv, jamais l'inverse.
{
  const c = base();
  c.seances[0].document = 'cr_partiel';
  fusionner(c, { seances: [seance({ document: 'pv' })], projets: [] });
  const monte = c.seances[0].document === 'pv';
  fusionner(c, { seances: [seance({ document: 'cr_partiel' })], projets: [] });
  verifier('document : cr_partiel → pv et jamais l’inverse', monte && c.seances[0].document === 'pv');
}
// 4. Séance antérieure au mandat : refusée, même présente dans la proposition.
{
  const c = base();
  const j = fusionner(c, { seances: [seance({ id: '2020-01-15', date: '2020-01-15' })], projets: [] });
  verifier('séance avant `depuis` refusée', c.seances.length === 1 && j.some((l) => l.includes('antérieure')));
}
// 5. Décision du Maire : même date+objet+montant, à l'accent et à la casse près.
{
  const c = base();
  fusionner(c, { seances: [seance({ decisions_maire: [{ date: '2026-08-20', theme: 'mairie', objet: 'Achat d’une  EPLUCHEUSE', montant: 3956.52 }] })], projets: [] });
  verifier('décision du Maire : clé normalisée, pas de doublon', c.seances[0].decisions_maire.length === 1);
  verifier('cleMaire distingue un montant différent',
    cleMaire({ date: 'd', objet: 'o', montant: 1 }) !== cleMaire({ date: 'd', objet: 'o', montant: 2 }));
}
// 6. Projet existant : mise à jour (sources unies, jamais dépublié) ; pas de second projet.
{
  const c = base();
  fusionner(c, { seances: [], projets: [{ id: 'toiture-ecole', titre: 'Toiture', theme: 'mairie', statut: 'termine', en_clair: 'Fini.', montant: null, echeance: null, maj: '2026-09-01', sources: ['2026-08-31'], publie: false }] });
  verifier('projet : maj du statut, publie conservé, pas de doublon',
    c.projets.length === 1 && c.projets[0].statut === 'termine' && c.projets[0].publie === true);
}
// 7. Un projet dont aucune séance source n'existe est refusé.
{
  const c = base();
  fusionner(c, { seances: [], projets: [{ id: 'fantome', titre: 'F', theme: 'mairie', statut: 'etude', en_clair: 'E', montant: null, echeance: null, maj: '2026-09-01', sources: ['2099-01-01'], publie: true }] });
  verifier('projet sans séance source connue refusé', c.projets.length === 1);
}
// 7 bis. Un projet INCONNU n'est jamais créé par le pipeline (§11) : il est
// seulement nommé dans le journal, la création reste un geste humain.
{
  const c = base();
  const j = fusionner(c, { seances: [], projets: [{ id: 'nouveau-projet', titre: 'N', theme: 'mairie', statut: 'etude', en_clair: 'E', montant: null, echeance: null, maj: '2026-09-01', sources: ['2026-08-31'], publie: true }] });
  verifier('projet inconnu : pas créé, mais nommé dans le journal',
    c.projets.length === 1 && j.some((l) => l.includes('nouveau-projet')));
}
// 8. La validation refuse : apostrophe ASCII, thème inconnu, doublon interne, id ≠ date.
{
  const t = base().themes;
  verifier('validation : apostrophe ASCII refusée',
    erreurs({ seances: [seance({ resume: "l'apostrophe" })] }, t).length > 0);
  verifier('validation : thème inconnu refusé',
    erreurs({ seances: [seance({ decisions: [decision('2026/40', { theme: 'zzz' })] })] }, t).length > 0);
  verifier('validation : séance en double dans la proposition refusée',
    erreurs({ seances: [seance({}), seance({})] }, t).length > 0);
  verifier('validation : id de séance ≠ date refusé',
    erreurs({ seances: [seance({ id: 'seance-31' })] }, t).length > 0);
  verifier('validation : une proposition saine passe',
    erreurs({ seances: [seance({})], projets: [] }, t).length === 0);
}

if (rate) { console.error('\n' + rate + ' contrôle(s) en échec.'); process.exit(1); }
console.log('\nFusion conseil-drive : règles anti-doublon vérifiées.');
