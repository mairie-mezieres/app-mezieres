#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════
   Veille presse « Ils parlent de MAT » — filtre et mémoire
   Copyright (c) 2024-2026 Commune de Mézières-lez-Cléry — Licence MIT

   L'agent de `.github/workflows/veille-presse.yml` cherche ; CE SCRIPT décide
   de ce qui est nouveau et écrit la mémoire (ADR-0027, ADR-0054). La consigne
   « ne re-signale pas un lien déjà vu » est donnée à l'agent pour qu'il ne
   perde pas son temps, mais ce n'est pas elle qui protège le porteur des
   répétitions : c'est le filtre ci-dessous, appliqué à chaque item.

   Deux sous-commandes :

     node scripts/veille-presse.js filtrer
       lit   veille/items-presse.json   (écrit par l'agent — tableau JSON)
             veille/presse-vues.json    (mémoire : URL normalisée → {titre, source, vu})
       écrit veille-presse-nouveaux.json (éphémère, non committé) : { items: [...] }
       ⛔ sort en ERREUR si l'agent n'a pas écrit son JSON : une veille muette
          ne doit pas se lire comme « personne n'a parlé de MAT ».

     node scripts/veille-presse.js memoriser
       ajoute à la mémoire les items de veille-presse-nouveaux.json.
       À lancer SEULEMENT après que le backend a accepté l'envoi : sinon un
       item mémorisé mais jamais reçu ne serait plus jamais proposé.

   Variable : VEILLE_DATE (AAAA-MM-JJ, défaut : aujourd'hui UTC).
   Node 20+. Aucune dépendance.
   ════════════════════════════════════════════════════════════ */

'use strict';

const fs = require('fs');

const ITEMS_PATH = 'veille/items-presse.json';
const JOURNAL_PATH = 'veille/journal-presse.json';
const SOURCES_PATH = 'veille/presse-sources.json';
// En dessous, la recherche est bâclée : le 1er passage réel (14/10/2026) s'est
// arrêté en 39 s sur `[]`, alors que MAT figurait au palmarès Territoria 2026.
const MIN_RECHERCHES = 8;
const MEMOIRE_PATH = 'veille/presse-vues.json';
const NOUVEAUX_PATH = 'veille-presse-nouveaux.json';
const DATE_ISO = (process.env.VEILLE_DATE || new Date().toISOString().slice(0, 10)).trim();
const MAX_PAR_JOUR = 15;
const TYPES = new Set(['presse', 'site', 'reseau', 'institution', 'autre']);

// Nos propres canaux : ce qu'on publie soi-même n'est pas une mention.
// Hôtes comparés sans « www. » ; un préfixe de chemin restreint au compte.
const NOS_CANAUX = [
  { hote: 'mezieres-lez-clery.fr' },
  { hote: 'mairie-mezieres.github.io' },
  { hote: 'chatbot-mairie-mezieres.onrender.com' },
  { hote: 'github.com', chemin: '/mairie-mezieres' }
];

/**
 * Forme canonique d'une URL (sans fragment, paramètres de suivi, « www. »,
 * barre finale). ⚠️ Même règle que `lib/veille-presse.js` du backend : les
 * garder en phase, `scripts/check-veille-presse.js` en verrouille les cas.
 */
function normaliserUrl(url) {
  let u;
  try { u = new URL(String(url || '').trim()); } catch { return ''; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
  u.hash = '';
  for (const k of [...u.searchParams.keys()]) {
    if (/^(utm_|fbclid$|gclid$|mc_|igshid$|ref$|ref_src$)/i.test(k)) u.searchParams.delete(k);
  }
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  const chemin = u.pathname.replace(/\/+$/, '');
  const qs = u.searchParams.toString();
  return `https://${host}${chemin}${qs ? '?' + qs : ''}`;
}

function estNotreCanal(cle) {
  const u = new URL(cle);
  return NOS_CANAUX.some(c => (u.hostname === c.hote || u.hostname.endsWith('.' + c.hote))
    && (!c.chemin || u.pathname.toLowerCase().startsWith(c.chemin)));
}

const propre = (v, max) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);

function lireMemoire() {
  if (!fs.existsSync(MEMOIRE_PATH)) return {};
  const m = JSON.parse(fs.readFileSync(MEMOIRE_PATH, 'utf8'));
  if (!m || typeof m !== 'object' || Array.isArray(m)) throw new Error(`${MEMOIRE_PATH} n'est pas un objet JSON`);
  return m;
}

/** Garde les items valides, absents de la mémoire, hors de nos canaux, sans doublon. */
function filtrer(brut, memoire) {
  const out = [];
  const ecartes = { invalides: 0, dejaVus: 0, nosCanaux: 0, doublons: 0, auDela: 0 };
  const vus = new Set();
  for (const it of Array.isArray(brut) ? brut : []) {
    const cle = it && typeof it === 'object' ? normaliserUrl(it.url) : '';
    const titre = cle ? propre(it.titre, 200) : '';
    if (!cle || !titre) { ecartes.invalides++; continue; }
    if (memoire[cle]) { ecartes.dejaVus++; continue; }
    if (estNotreCanal(cle)) { ecartes.nosCanaux++; continue; }
    if (vus.has(cle)) { ecartes.doublons++; continue; }
    if (out.length >= MAX_PAR_JOUR) { ecartes.auDela++; continue; }
    vus.add(cle);
    const type = propre(it.type, 20).toLowerCase();
    out.push({
      titre,
      url: new URL(String(it.url).trim()).href,
      source: propre(it.source, 80),
      date: /^\d{4}-\d{2}-\d{2}$/.test(String(it.date || '')) ? String(it.date) : '',
      type: TYPES.has(type) ? type : 'autre',
      resume: propre(it.resume, 300)
    });
  }
  return { items: out, ecartes };
}

/**
 * Contrôle que l'agent a réellement cherché. Renvoie { erreur, avertissements, recherches, pages }.
 * `erreur` non vide = le run doit échouer : « rien trouvé » n'a de sens qu'après avoir cherché.
 */
function verifierJournal(journal, sources) {
  const avertissements = [];
  if (!journal || typeof journal !== 'object' || Array.isArray(journal)) {
    return { erreur: `${JOURNAL_PATH} absent ou illisible — impossible de savoir ce que l'agent a cherché.`, avertissements, recherches: [], pages: [] };
  }
  const recherches = (Array.isArray(journal.recherches) ? journal.recherches : []).map(r => propre(r, 200)).filter(Boolean);
  const pages = (Array.isArray(journal.pages_lues) ? journal.pages_lues : []).map(u => propre(u, 500)).filter(Boolean);
  const lues = new Set(pages.map(normaliserUrl).filter(Boolean));
  for (const src of Array.isArray(sources) ? sources : []) {
    const cle = normaliserUrl(src && src.url);
    if (cle && !lues.has(cle)) avertissements.push(`source suivie non relue : ${src.url}`);
  }
  const erreur = recherches.length < MIN_RECHERCHES
    ? `seulement ${recherches.length} recherche(s) déclarée(s) (minimum ${MIN_RECHERCHES}) — recherche bâclée, résultat non fiable.`
    : '';
  return { erreur, avertissements, recherches, pages };
}

function lireJson(chemin) {
  if (!fs.existsSync(chemin)) return null;
  try { return JSON.parse(fs.readFileSync(chemin, 'utf8')); } catch { return null; }
}

/** Ajoute les items à la mémoire ; clés triées pour des diffs lisibles. */
function memoriser(memoire, items, date) {
  const m = { ...memoire };
  for (const it of items) {
    const cle = normaliserUrl(it.url);
    if (cle && !m[cle]) m[cle] = { titre: it.titre, source: it.source || '', vu: date };
  }
  return Object.fromEntries(Object.keys(m).sort().map(k => [k, m[k]]));
}

function main(cmd) {
  if (cmd === 'filtrer') {
    if (!fs.existsSync(ITEMS_PATH)) {
      console.log(`::error title=Veille presse::${ITEMS_PATH} absent — l'agent n'a rien écrit. Ce n'est PAS « aucune mention » : la recherche n'a pas abouti. Voir l'artefact claude-execution-output.`);
      process.exit(1);
    }
    let brut;
    try { brut = JSON.parse(fs.readFileSync(ITEMS_PATH, 'utf8')); } catch (e) {
      console.log(`::error title=Veille presse::${ITEMS_PATH} illisible (${e.message}).`);
      process.exit(1);
    }
    if (!Array.isArray(brut)) {
      console.log(`::error title=Veille presse::${ITEMS_PATH} n'est pas un tableau JSON.`);
      process.exit(1);
    }
    const { items, ecartes } = filtrer(brut, lireMemoire());
    const j = verifierJournal(lireJson(JOURNAL_PATH), lireJson(SOURCES_PATH));
    fs.writeFileSync(NOUVEAUX_PATH, JSON.stringify({ items }, null, 2) + '\n');
    console.log(`Proposés par l'agent : ${brut.length} — nouveaux : ${items.length} — écartés : ${JSON.stringify(ecartes)}`);
    console.log(`Recherches : ${j.recherches.length} — pages lues : ${j.pages.length}`);
    if (ecartes.invalides) console.log(`::warning title=Veille presse::${ecartes.invalides} item(s) sans titre ou sans URL http(s) écarté(s).`);
    for (const a of j.avertissements) console.log(`::warning title=Veille presse::${a}`);
    // Le résumé du run dit ce qui a été cherché : « 0 mention » se lit enfin à côté de l'effort fourni.
    if (process.env.GITHUB_STEP_SUMMARY) {
      const l = [`## Veille presse — ${DATE_ISO}`, '',
        `**${items.length} nouveauté(s)** sur ${brut.length} proposée(s) — écartées : ${JSON.stringify(ecartes)}`, '',
        ...items.map(i => `- [${i.titre}](${i.url})${i.source ? ` — ${i.source}` : ''}`), '',
        `### Recherches (${j.recherches.length})`, ...j.recherches.map(r => `- ${r}`), '',
        `### Pages lues (${j.pages.length})`, ...j.pages.map(u => `- ${u}`),
        ...(j.avertissements.length ? ['', '### ⚠️ Avertissements', ...j.avertissements.map(a => `- ${a}`)] : [])];
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, l.join('\n') + '\n');
    }
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `nouveaux=${items.length}\n`);
    // Recherche bâclée : les nouveautés trouvées partent quand même (seule
    // l'affirmation « rien d'autre » est douteuse). Ce script sort donc en 0 et
    // pose `bacle` ; c'est la DERNIÈRE étape du workflow qui fait échouer le run.
    if (j.erreur) {
      console.log(`::error title=Veille presse::${j.erreur}`);
      if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `bacle=${j.erreur}\n`);
    }
    return;
  }
  if (cmd === 'memoriser') {
    const { items } = JSON.parse(fs.readFileSync(NOUVEAUX_PATH, 'utf8'));
    const m = memoriser(lireMemoire(), items, DATE_ISO);
    fs.writeFileSync(MEMOIRE_PATH, JSON.stringify(m, null, 2) + '\n');
    console.log(`Mémoire : ${Object.keys(m).length} lien(s) connu(s) (+${items.length}).`);
    return;
  }
  console.error('Usage : node scripts/veille-presse.js filtrer|memoriser');
  process.exit(2);
}

if (require.main === module) main(process.argv[2]);

module.exports = { normaliserUrl, estNotreCanal, filtrer, memoriser, verifierJournal, MAX_PAR_JOUR, MIN_RECHERCHES };
