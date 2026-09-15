/**
 * Socle commun de l'ÉTAGE 3 de la veille — le suivi (ADR-0042).
 *
 * Les étages 1 et 2 produisent : une issue-checklist par exécution
 * (`create-veille-issue.js`) et des PR **draft** (`create-veille-pr.js`). Aucun
 * des deux ne revient jamais sur ce qu'il a ouvert. Sans étage 3, les issues
 * s'empilent une par semaine et les PR draft vieillissent sans coche verte —
 * personne ne sait laquelle est encore vivante.
 *
 * Ce module porte ce qui est commun aux trois scripts de suivi :
 *   - `suivi-veille-issues.js`  → traite les issues « Actions PWA » ouvertes ;
 *   - `suivi-veille-prs.js`     → hygiène des PR draft + matrice à vérifier ;
 *   - `suivi-veille-pr-etat.js` → coche verte (commit status) + commentaire.
 *
 * ⚠️ Best-effort, comme tout le canal actionnable : aucune fonction d'ici ne
 * fait échouer un job. Une API muette se solde par un log et une sortie propre —
 * le suivi ne doit jamais coûter ce que la veille a déjà livré.
 *
 * ⚠️ `SUIVI_DRY_RUN=1` neutralise TOUTES les écritures (POST/PATCH/PUT) et les
 * journalise à la place. C'est le seul moyen d'essayer ce workflow sur le vrai
 * dépôt sans commenter ni fermer quoi que ce soit.
 *
 * Node 20+ requis (fetch global). Aucune dépendance externe.
 */

'use strict';

const { CATEGORIES, identifiant } = require('./veille-actions');

const TOKEN = process.env.GITHUB_TOKEN || '';
const REPO = process.env.GITHUB_REPOSITORY || '';
const API = (process.env.GITHUB_API_URL || 'https://api.github.com').replace(/\/$/, '');
const DRY_RUN = /^(1|true|oui)$/i.test(String(process.env.SUIVI_DRY_RUN || '').trim());

/** Préfixe des branches ouvertes par l'étage 2 — cf. `select-veille-actions.js`. */
const PREFIXE_BRANCHE = 'claude/veille-';
/** Début du titre des issues de l'étage 1 — cf. `create-veille-issue.js`. */
const PREFIXE_ISSUE = '🔭 Actions PWA';

/**
 * Marqueur HTML invisible dans un corps ou un commentaire.
 *
 * ⛔ C'est LUI qui rend le suivi idempotent, pas la ressemblance des textes : le
 * workflow repasse à chaque veille (et tous les jours en filet). Sans marqueur,
 * chaque passage ajouterait une relance de plus sous la même PR.
 */
function marqueur(nom) {
  return `<!-- suivi-veille:${nom} -->`;
}

/**
 * Âge en JOURS d'un horodatage ISO.
 *
 * ⚠️ C'est bien une DURÉE qu'on mesure ici (« cette PR traîne depuis 45 jours »),
 * pas un nombre de jours de calendrier : l'ADR-0031 interdit ce quotient pour
 * dire « Demain » à un habitant, pas pour comparer un âge à un seuil.
 */
function ageJours(iso) {
  const t = Date.parse(iso || '');
  if (Number.isNaN(t)) return 0;
  return Math.floor((Date.now() - t) / 86400000);
}

function entetes(json) {
  const h = {
    Authorization: `Bearer ${TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'mat-veille-suivi',
  };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

/** Appel API. Renvoie `{ ok, status, data }` ; ne lève pas sur un statut HTTP. */
async function gh(chemin, options = {}) {
  const methode = options.method || 'GET';
  const ecriture = methode !== 'GET';

  if (ecriture && DRY_RUN) {
    console.log(`[dry-run] ${methode} ${chemin} ${JSON.stringify(options.body || {}).slice(0, 300)}`);
    return { ok: true, status: 0, data: { dryRun: true } };
  }

  const res = await fetch(`${API}${chemin}`, {
    method: methode,
    headers: entetes(ecriture),
    body: ecriture && options.body ? JSON.stringify(options.body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  if (!res.ok) console.log(`::warning title=Suivi veille::${methode} ${chemin} → HTTP ${res.status}`);
  return { ok: res.ok, status: res.status, data };
}

/** Pagination simple, plafonnée : ce dépôt n'a pas des milliers d'items. */
async function ghListe(chemin, pagesMax = 5) {
  const tout = [];
  for (let page = 1; page <= pagesMax; page += 1) {
    const sep = chemin.includes('?') ? '&' : '?';
    const { ok, data } = await gh(`${chemin}${sep}per_page=100&page=${page}`);
    if (!ok || !Array.isArray(data) || data.length === 0) break;
    tout.push(...data);
    if (data.length < 100) break;
  }
  return tout;
}

/** Sortie d'étape GitHub Actions (format multi-lignes). */
function sortie(nom, valeur) {
  const fichier = process.env.GITHUB_OUTPUT;
  const ligne = `${nom}<<SUIVI_EOF\n${valeur}\nSUIVI_EOF\n`;
  if (fichier) require('fs').appendFileSync(fichier, ligne);
  else console.log(`[sortie] ${nom}=${valeur}`);
}

/** Ajoute une ligne au résumé du run (onglet « Summary »). */
function resume(texte) {
  const fichier = process.env.GITHUB_STEP_SUMMARY;
  if (fichier) require('fs').appendFileSync(fichier, `${texte}\n`);
  console.log(texte);
}

/** Sortie propre et silencieuse : ce canal ne fait jamais échouer un job. */
function abandon(message) {
  console.log(message);
  process.exit(0);
}

/** Le socle est-il utilisable ? (token + dépôt) */
function pretOuAbandon() {
  if (!TOKEN || !REPO.includes('/')) {
    abandon('GITHUB_TOKEN ou GITHUB_REPOSITORY manquant — suivi de veille abandonné.');
  }
}

/**
 * Identifiant d'action porté par une branche de l'étage 2.
 * `claude/veille-<slug>-<id>` → `<id>` (10 caractères hexadécimaux).
 */
function idDepuisBranche(branche) {
  const m = /-([0-9a-f]{10})$/.exec(String(branche || ''));
  return m ? m[1] : null;
}

/** Libellé de catégorie (« 📦 Dépendances ») → clé (`dependance`). */
const CATEGORIE_PAR_LIBELLE = new Map(
  Object.entries(CATEGORIES).map(([cle, def]) => [def.label, cle])
);

/**
 * Parse le corps d'une issue « Actions PWA » en actions suivies.
 *
 * Le corps est celui qu'écrit `create-veille-issue.js` : des sections `## <libellé
 * de catégorie>` et, dessous, une case à cocher par action se terminant par
 * `— [source](URL)`. On en retire de quoi RETROUVER l'action : sa catégorie et
 * son URL — c'est-à-dire exactement ce dont `identifiant()` a besoin.
 *
 * ⛔ On ne se sert pas du titre : le LLM le reformule d'une semaine à l'autre
 * (ADR-0023 §6). Une action se reconnaît à `categorie + source`, sinon le suivi
 * croirait chaque semaine découvrir une action neuve.
 */
function lireActionsIssue(corps) {
  const lignes = String(corps || '').split('\n');
  const actions = [];
  let categorie = null;

  for (let i = 0; i < lignes.length; i += 1) {
    const ligne = lignes[i];
    const titreSection = /^##\s+(.+?)\s*$/.exec(ligne);
    if (titreSection) {
      categorie = CATEGORIE_PAR_LIBELLE.get(titreSection[1]) || null;
      continue;
    }
    const caseACocher = /^- \[( |x|X)\]\s+(.*)$/.exec(ligne);
    if (!caseACocher || !categorie) continue;

    const cochee = caseACocher[1].toLowerCase() === 'x';
    const texte = caseACocher[2];
    const source = /\[source\]\((https?:\/\/[^)\s]+)\)/.exec(texte);
    const titre = /\*\*(.+?)\*\*/.exec(texte);
    if (!source) continue; // une action sans source n'a jamais dû être publiée

    actions.push({
      indexLigne: i,
      cochee,
      categorie,
      source: source[1],
      titre: titre ? titre[1] : texte.slice(0, 80),
      id: identifiant({ categorie, source: source[1] }),
    });
  }
  return { lignes, actions };
}

/**
 * Inventaire des PR de veille, indexé par identifiant d'action.
 * `state=all` : une PR fermée compte comme « traitée » (ADR-0023 §6).
 */
async function inventairePrVeille() {
  const prs = await ghListe(`/repos/${REPO}/pulls?state=all&sort=created&direction=desc`);
  const parId = new Map();
  for (const pr of prs) {
    const branche = pr && pr.head && pr.head.ref;
    if (!branche || !branche.startsWith(PREFIXE_BRANCHE)) continue;
    const id = idDepuisBranche(branche);
    if (!id || parId.has(id)) continue; // la plus récente gagne (tri desc)
    parId.set(id, pr);
  }
  return parId;
}

/** État lisible d'une PR : « fusionnée », « fermée », « brouillon », « ouverte ». */
function etatPr(pr) {
  if (!pr) return null;
  if (pr.merged_at) return 'fusionnée';
  if (pr.state === 'closed') return 'fermée';
  return pr.draft ? 'brouillon' : 'ouverte';
}

/** Un commentaire portant ce marqueur existe-t-il déjà sur cette issue/PR ? */
async function dejaCommente(numero, nomMarqueur) {
  const commentaires = await ghListe(`/repos/${REPO}/issues/${numero}/comments`, 3);
  const cible = marqueur(nomMarqueur);
  return commentaires.some((c) => c && typeof c.body === 'string' && c.body.includes(cible));
}

/** Publie un commentaire idempotent (au plus un par marqueur). */
async function commenterUneFois(numero, nomMarqueur, corps) {
  if (await dejaCommente(numero, nomMarqueur)) {
    console.log(`#${numero} : commentaire « ${nomMarqueur} » déjà publié — rien à faire.`);
    return false;
  }
  const { ok } = await gh(`/repos/${REPO}/issues/${numero}/comments`, {
    method: 'POST',
    body: { body: `${marqueur(nomMarqueur)}\n${corps}` },
  });
  if (ok) console.log(`#${numero} : commentaire « ${nomMarqueur} » ${DRY_RUN ? 'simulé (dry-run)' : 'publié'}.`);
  return ok;
}

/**
 * État de la CI sur un commit : `{ etat, echecs }`.
 *
 * ⛔ Deux sources, et il faut les deux : les **check runs** (les jobs GitHub
 * Actions) et les **commit statuses** de l'API — c'est par ce second canal que
 * l'étage 3 pose `veille/controles`, et il n'apparaît dans aucun check run.
 * N'en lire qu'une, c'est conclure « verte » sur la moitié des preuves.
 *
 * ⚠️ `neutral` et `skipped` ne sont PAS des échecs : un job conditionnel ignoré
 * est un fonctionnement normal. ⚠️ « aucune » (rien n'a tourné) n'est pas
 * « verte » : l'appelant décide, et pour une fusion automatique l'absence de
 * preuve ne vaut pas preuve.
 */
async function etatCI(sha) {
  const echecs = [];
  let vus = 0;
  let enCours = false;

  const runs = await gh(`/repos/${REPO}/commits/${sha}/check-runs?per_page=100`);
  for (const run of (runs.data && runs.data.check_runs) || []) {
    vus += 1;
    if (run.status !== 'completed') { enCours = true; continue; }
    if (['failure', 'timed_out', 'action_required'].includes(run.conclusion)) echecs.push(run.name);
  }

  const st = await gh(`/repos/${REPO}/commits/${sha}/status`);
  for (const s of (st.data && st.data.statuses) || []) {
    vus += 1;
    if (s.state === 'pending') { enCours = true; continue; }
    if (s.state === 'failure' || s.state === 'error') echecs.push(s.context);
  }

  if (echecs.length > 0) return { etat: 'rouge', echecs };
  if (enCours) return { etat: 'en cours', echecs };
  return { etat: vus > 0 ? 'verte' : 'aucune', echecs };
}

/** Pastille lisible pour un tableau de résumé. */
function pastille(etat) {
  return { verte: '✅ verte', rouge: '❌ rouge', 'en cours': '⏳ en cours', aucune: '➖ aucune' }[etat] || etat;
}

module.exports = {
  API, REPO, TOKEN, DRY_RUN,
  PREFIXE_BRANCHE, PREFIXE_ISSUE,
  marqueur, ageJours, gh, ghListe, sortie, resume, abandon, pretOuAbandon,
  idDepuisBranche, lireActionsIssue, inventairePrVeille, etatPr, etatCI, pastille,
  dejaCommente, commenterUneFois,
};
