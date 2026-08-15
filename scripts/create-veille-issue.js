/**
 * Crée (ou met à jour) une Issue GitHub « Actions PWA » à partir du fichier
 * `veille/actions-pwa.json` produit par l'agent de veille technologique.
 *
 * C'est le canal ACTIONNABLE de la veille (voir ADR-0005) : là où le rapport
 * HTML est fait pour être lu par un humain (email), ce JSON liste des actions
 * concrètes à mener sur la PWA (mise à jour de dépendance, correctif de
 * sécurité, amélioration d'accessibilité). Ce script en fait une checklist
 * traçable dans une issue, point d'entrée du suivi.
 *
 * Best-effort : ce script ne fait JAMAIS échouer le job (il sort toujours en 0).
 * L'email reste le canal garanti ; un JSON absent, vide ou invalide, ou une
 * erreur d'API GitHub, se solde par un log et une sortie propre.
 *
 * Idempotence : si une issue OUVERTE portant exactement le même titre existe
 * déjà (re-run du même jour, 2e tentative), son corps est mis à jour au lieu
 * d'en créer une seconde.
 *
 * Variables d'environnement :
 *   GITHUB_TOKEN       - token Actions (permission `issues: write`) — requis pour écrire
 *   GITHUB_REPOSITORY  - « owner/repo » (fourni automatiquement par Actions)
 *   GITHUB_API_URL     - défaut « https://api.github.com » (fourni par Actions)
 *   ACTIONS_PATH       - chemin du JSON d'actions (défaut « veille/actions-pwa.json »)
 *   VEILLE_DATE        - date ISO du jour pour le titre (défaut : date du jour UTC)
 *
 * Node 20+ requis (fetch global). Aucune dépendance externe.
 */

// Lecture, normalisation et filtrage : `scripts/lib/veille-actions.js` est la
// source unique de ces règles, partagée avec l'étage 2 (PR draft). Deux
// filtrages divergents publieraient une action dans l'issue sans jamais la
// reprendre en PR, ou l'inverse, sans que rien ne le signale.
const { CATEGORIES, PRIORITES, lireActions } = require('./lib/veille-actions');

// --- Sortie best-effort : jamais d'échec du job ---------------------------
function bail(message) {
  console.log(message);
  process.exit(0);
}

const ACTIONS_PATH = (process.env.ACTIONS_PATH || 'veille/actions-pwa.json').trim();

const { actions, raison } = lireActions(ACTIONS_PATH);
if (raison) {
  bail(`${raison} Aucune issue créée.`);
}

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPOSITORY; // owner/repo
if (!GITHUB_TOKEN || !REPO || !REPO.includes('/')) {
  bail('GITHUB_TOKEN ou GITHUB_REPOSITORY manquant — impossible de créer l\'issue (actions détectées mais non publiées).');
}
const [OWNER, NAME] = REPO.split('/');
const API = (process.env.GITHUB_API_URL || 'https://api.github.com').replace(/\/$/, '');

// --- Construction du corps de l'issue -------------------------------------
const dateIso = (process.env.VEILLE_DATE || new Date().toISOString().slice(0, 10)).trim();
const dateFr = (() => {
  const d = new Date(`${dateIso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return dateIso;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' });
})();

const TITLE = `🔭 Actions PWA — veille du ${dateFr}`;

function buildBody() {
  const byCat = new Map();
  for (const a of actions) {
    if (!byCat.has(a.categorie)) byCat.set(a.categorie, []);
    byCat.get(a.categorie).push(a);
  }
  const cats = [...byCat.keys()].sort((x, y) => CATEGORIES[x].order - CATEGORIES[y].order);

  const lines = [];
  lines.push(`Actions concrètes détectées par la veille technologique du **${dateFr}**.`);
  lines.push('');
  lines.push('Cochez chaque action au fur et à mesure de son traitement. Chaque case est');
  lines.push('sourcée : vérifiez la source avant d\'agir.');
  lines.push('');

  for (const cat of cats) {
    lines.push(`## ${CATEGORIES[cat].label}`);
    lines.push('');
    const items = byCat.get(cat).sort((x, y) => PRIORITES[x.priorite].order - PRIORITES[y.priorite].order);
    for (const a of items) {
      const src = a.source ? ` — [source](${a.source})` : '';
      const resume = a.resume ? ` — ${a.resume}` : '';
      lines.push(`- [ ] **${a.titre}** _(${PRIORITES[a.priorite].pastille})_${resume}${src}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('_Issue générée automatiquement par la veille technologique (GitHub Actions)._');
  lines.push('_Périmètre : mises à jour de dépendances, correctifs de sécurité, accessibilité/séniors._');
  lines.push('_Contenu déduit de sources web : à vérifier avant toute mise en œuvre._');
  return lines.join('\n');
}

const BODY = buildBody();

// --- Appels API GitHub -----------------------------------------------------
function ghHeaders() {
  return {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
    'User-Agent': 'mat-veille-issue',
  };
}

async function findOpenIssueByTitle(title) {
  // Liste les issues ouvertes (hors PR) et cherche un titre identique.
  const url = `${API}/repos/${OWNER}/${NAME}/issues?state=open&per_page=100`;
  const res = await fetch(url, { headers: ghHeaders() });
  if (!res.ok) {
    console.log(`Recherche d'issue existante : HTTP ${res.status} (on tentera une création).`);
    return null;
  }
  const list = await res.json();
  if (!Array.isArray(list)) return null;
  const found = list.find((i) => i && !i.pull_request && i.title === title);
  return found ? found.number : null;
}

(async () => {
  const existing = await findOpenIssueByTitle(TITLE);

  if (existing) {
    const res = await fetch(`${API}/repos/${OWNER}/${NAME}/issues/${existing}`, {
      method: 'PATCH',
      headers: ghHeaders(),
      body: JSON.stringify({ body: BODY }),
    });
    if (!res.ok) {
      const text = await res.text();
      bail(`Mise à jour de l'issue #${existing} échouée : HTTP ${res.status} - ${text}`);
    }
    console.log(`Issue #${existing} mise à jour (${actions.length} action(s)).`);
    return;
  }

  const res = await fetch(`${API}/repos/${OWNER}/${NAME}/issues`, {
    method: 'POST',
    headers: ghHeaders(),
    body: JSON.stringify({ title: TITLE, body: BODY }),
  });
  if (!res.ok) {
    const text = await res.text();
    bail(`Création de l'issue échouée : HTTP ${res.status} - ${text}`);
  }
  const data = await res.json();
  console.log(`Issue #${data.number} créée (${actions.length} action(s)) : ${data.html_url}`);
})().catch((error) => {
  // Filet ultime : ne jamais faire échouer le job pour ce canal best-effort.
  bail(`Erreur inattendue lors de la création de l'issue : ${error.message}`);
});
