#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════
   Contrôle du filtre de la veille presse — MAT (ADR-0054)
   Copyright (c) 2024-2026 Commune de Mézières-lez-Cléry — Licence MIT

   La promesse faite au porteur est « un lien déjà envoyé ne revient jamais ».
   Elle tient tout entière dans `scripts/veille-presse.js` : aucun test E2E ne
   la voit (elle vit dans un workflow quotidien). Ce script la verrouille, et
   verrouille aussi la PARITÉ de `normaliserUrl` avec le backend
   (`chatbot-mairie-mezieres/lib/veille-presse.js`) sur des cas écrits ici :
   deux normalisations divergentes feraient qu'un lien filtré ici passe là-bas.
   ════════════════════════════════════════════════════════════ */

'use strict';

const assert = require('assert');
const { normaliserUrl, estNotreCanal, filtrer, memoriser, verifierJournal, MAX_PAR_JOUR, MIN_RECHERCHES } = require('./veille-presse');

let n = 0;
const ok = (nom, f) => { f(); n++; console.log(`✓ ${nom}`); };

// Cas partagés avec test/veille-presse.test.js du backend : NE PAS les changer d'un seul côté.
const CAS = [
  ['https://www.larep.fr/article/mat/?utm_source=fb&fbclid=x#top', 'https://larep.fr/article/mat'],
  ['http://larep.fr/article/mat', 'https://larep.fr/article/mat'],
  ['https://x.fr/p?id=1', 'https://x.fr/p?id=1'],
  ['javascript:alert(1)', ''],
  ['pas une url', '']
];

ok('normaliserUrl : cas partagés avec le backend', () => {
  for (const [entree, attendu] of CAS) assert.strictEqual(normaliserUrl(entree), attendu, entree);
});

ok('nos propres canaux ne sont pas des mentions', () => {
  assert.ok(estNotreCanal('https://mezieres-lez-clery.fr/actus'));
  assert.ok(estNotreCanal('https://github.com/mairie-mezieres/app-mezieres'));
  assert.ok(!estNotreCanal('https://github.com/autre/projet'));
  assert.ok(!estNotreCanal('https://larep.fr/mezieres-lez-clery.fr'));
});

ok('un lien en mémoire ne revient pas, même sous un autre habit', () => {
  const memoire = { 'https://larep.fr/article/mat': { titre: 'x', source: '', vu: '2026-10-01' } };
  const { items, ecartes } = filtrer([
    { titre: 'Même article', url: 'https://www.larep.fr/article/mat?utm_medium=social' },
    { titre: 'Nouveau', url: 'https://francebleu.fr/mat', type: 'presse', date: '2026-10-12' },
    { titre: 'Nouveau (doublon)', url: 'https://francebleu.fr/mat/' },
    { titre: 'Chez nous', url: 'https://mezieres-lez-clery.fr/' },
    { titre: '', url: 'https://a.fr' }, { titre: 'ftp', url: 'ftp://a.fr' }
  ], memoire);
  assert.deepStrictEqual(items.map(i => i.titre), ['Nouveau']);
  assert.deepStrictEqual(ecartes, { invalides: 2, dejaVus: 1, nosCanaux: 1, doublons: 1, auDela: 0 });
});

ok('date illisible effacée, type inconnu ramené à « autre », guillemet encodé', () => {
  const [it] = filtrer([{ titre: 'x', url: 'https://a.fr/p" onmouseover="y', date: '12/10/2026', type: 'blog' }], {}).items;
  assert.strictEqual(it.date, '');
  assert.strictEqual(it.type, 'autre');
  assert.ok(!it.url.includes('"'));
});

ok(`plafond de ${MAX_PAR_JOUR} par jour`, () => {
  const brut = Array.from({ length: MAX_PAR_JOUR + 3 }, (_, i) => ({ titre: `t${i}`, url: `https://a.fr/${i}` }));
  const { items, ecartes } = filtrer(brut, {});
  assert.strictEqual(items.length, MAX_PAR_JOUR);
  assert.strictEqual(ecartes.auDela, 3);
});

ok('memoriser ajoute sans écraser la première date vue, clés triées', () => {
  const avant = { 'https://b.fr': { titre: 'b', source: '', vu: '2026-01-01' } };
  const m = memoriser(avant, [{ titre: 'a', url: 'https://www.a.fr/', source: 'A' }, { titre: 'b2', url: 'https://b.fr' }], '2026-10-14');
  assert.deepStrictEqual(Object.keys(m), ['https://a.fr', 'https://b.fr']);
  assert.strictEqual(m['https://b.fr'].vu, '2026-01-01');
  assert.strictEqual(m['https://a.fr'].vu, '2026-10-14');
});

ok('journal : une recherche bâclée est une erreur, pas « aucune mention »', () => {
  // Le 1er passage réel : 39 s, `[]`, alors que MAT figurait au palmarès Territoria 2026.
  assert.match(verifierJournal(null, []).erreur, /absent/);
  assert.match(verifierJournal({ recherches: ['a', 'b'], pages_lues: [] }, []).erreur, /bâclée/);
  const assez = Array.from({ length: MIN_RECHERCHES }, (_, i) => `requête ${i}`);
  assert.strictEqual(verifierJournal({ recherches: assez, pages_lues: [] }, []).erreur, '');
});

ok('journal : une source suivie non relue est signalée, même sous un autre habit', () => {
  const sources = [{ url: 'https://www.a.fr/palmares/' }, { url: 'https://b.fr/x' }];
  const recherches = Array.from({ length: MIN_RECHERCHES }, (_, i) => `r${i}`);
  const r = verifierJournal({ recherches, pages_lues: ['https://a.fr/palmares?utm_source=x'] }, sources);
  assert.deepStrictEqual(r.avertissements, ['source suivie non relue : https://b.fr/x']);
});

ok('les sources suivies sont des URL https valides', () => {
  const sources = require('../veille/presse-sources.json');
  assert.ok(Array.isArray(sources) && sources.length > 0);
  for (const s of sources) assert.ok(/^https:\/\//.test(s.url) && normaliserUrl(s.url) && s.pourquoi, s.url);
});

console.log(`\n${n} contrôle(s) de la veille presse : OK.`);
