/**
 * Étage 2 de la veille (ADR-0005, ADR-0023) — SÉLECTION des actions qui méritent
 * une PR draft, et rien de plus : ce script ne modifie aucun code et n'ouvre
 * aucune PR. Il décide seulement *sur quoi* un agent sera lancé, et publie la
 * matrice correspondante dans `$GITHUB_OUTPUT`.
 *
 * Trois filtres, dans cet ordre :
 *   1. Validité      — via `lib/veille-actions.js` (source unique, cf. étage 1).
 *   2. Non-doublon   — une action déjà traitée ne revient jamais. L'identité
 *                      d'une action est `categorie + source` (pas le titre) :
 *                      le LLM reformule d'une semaine à l'autre, l'URL non.
 *                      Une branche existante OU une PR (même fermée, même
 *                      fusionnée) portant cette branche = déjà traitée.
 *   3. Plafond       — `VEILLE_PR_MAX` (défaut 3). Une veille bavarde ne doit
 *                      pas produire dix PR draft que personne ne relira.
 *
 * Best-effort : sort TOUJOURS en 0. Sans dédoublonnage possible (API muette), on
 * préfère ne rien sélectionner plutôt que risquer de rouvrir des PR en double.
 *
 * Variables d'environnement :
 *   GITHUB_TOKEN       - requis pour interroger branches et PR existantes
 *   GITHUB_REPOSITORY  - « owner/repo » (fourni par Actions)
 *   GITHUB_API_URL     - défaut « https://api.github.com »
 *   GITHUB_OUTPUT      - fichier de sortie d'étape (fourni par Actions)
 *   ACTIONS_PATH       - défaut « veille/actions-pwa.json »
 *   VEILLE_PR_MAX      - défaut 3
 *
 * Node 20+ requis (fetch global). Aucune dépendance externe.
 */

'use strict';

const fs = require('fs');
const { lireActions, trier } = require('./lib/veille-actions');

const ACTIONS_PATH = (process.env.ACTIONS_PATH || 'veille/actions-pwa.json').trim();
const MAX = Math.max(0, Number(process.env.VEILLE_PR_MAX || 3) || 0);
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPOSITORY || '';
const API = (process.env.GITHUB_API_URL || 'https://api.github.com').replace(/\/$/, '');

/** Écrit une sortie d'étape (format multi-lignes GitHub Actions). */
function sortie(nom, valeur) {
  const fichier = process.env.GITHUB_OUTPUT;
  const ligne = `${nom}<<VEILLE_EOF\n${valeur}\nVEILLE_EOF\n`;
  if (fichier) fs.appendFileSync(fichier, ligne);
  else console.log(`[sortie] ${nom}=${valeur}`);
}

/** Termine en publiant une matrice vide : aucune PR ne sera tentée. */
function rien(message) {
  console.log(message);
  sortie('matrice', JSON.stringify({ include: [] }));
  sortie('nombre', '0');
  process.exit(0);
}

function entetes() {
  return {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'mat-veille-pr',
  };
}

/**
 * Une action a-t-elle déjà été traitée ?
 *
 * Renvoie `{ traitee, sur }` — ou lève, pour que l'appelant préfère abandonner
 * plutôt que de créer un doublon sur une réponse d'API qu'il n'a pas comprise.
 */
async function dejaTraitee(branche) {
  const ref = await fetch(`${API}/repos/${REPO}/git/ref/heads/${branche}`, { headers: entetes() });
  if (ref.status === 200) return { traitee: true, sur: 'la branche existe déjà' };
  if (ref.status !== 404) throw new Error(`git/ref → HTTP ${ref.status}`);

  // La branche a pu être supprimée après fusion : la PR, elle, reste.
  const [owner] = REPO.split('/');
  const pr = await fetch(
    `${API}/repos/${REPO}/pulls?state=all&per_page=1&head=${encodeURIComponent(`${owner}:${branche}`)}`,
    { headers: entetes() }
  );
  if (!pr.ok) throw new Error(`pulls → HTTP ${pr.status}`);
  const liste = await pr.json();
  if (Array.isArray(liste) && liste.length > 0) {
    return { traitee: true, sur: `PR #${liste[0].number} (${liste[0].state}) déjà ouverte pour cette action` };
  }
  return { traitee: false, sur: null };
}

(async () => {
  if (MAX === 0) rien('VEILLE_PR_MAX=0 — étage PR draft désactivé.');

  const { actions, raison } = lireActions(ACTIONS_PATH);
  if (raison) rien(`${raison} Aucune PR draft à préparer.`);

  if (!GITHUB_TOKEN || !REPO.includes('/')) {
    rien('GITHUB_TOKEN ou GITHUB_REPOSITORY manquant — sélection abandonnée (aucune PR draft).');
  }

  const retenues = [];
  for (const action of trier(actions)) {
    if (retenues.length >= MAX) {
      console.log(`Plafond de ${MAX} PR atteint — actions suivantes laissées à l'issue-checklist.`);
      break;
    }
    const branche = `claude/veille-${action.slug}-${action.id}`;
    let verdict;
    try {
      verdict = await dejaTraitee(branche);
    } catch (err) {
      // Sans réponse fiable, on ne devine pas : mieux vaut zéro PR qu'un doublon.
      rien(`Dédoublonnage impossible (${err.message}) — aucune PR draft cette semaine.`);
    }
    if (verdict.traitee) {
      console.log(`↷ « ${action.titre} » ignorée : ${verdict.sur}.`);
      continue;
    }
    retenues.push({
      id: action.id,
      branche,
      categorie: action.categorie,
      priorite: action.priorite,
      titre: action.titre,
      source: action.source,
      resume: action.resume,
    });
  }

  if (retenues.length === 0) rien('Aucune action nouvelle à traiter — aucune PR draft.');

  console.log(`${retenues.length} action(s) retenue(s) pour une PR draft :`);
  for (const a of retenues) console.log(`  • [${a.categorie}] ${a.titre} → ${a.branche}`);

  sortie('matrice', JSON.stringify({ include: retenues }));
  sortie('nombre', String(retenues.length));
})().catch((error) => {
  rien(`Erreur inattendue pendant la sélection : ${error.message}`);
});
