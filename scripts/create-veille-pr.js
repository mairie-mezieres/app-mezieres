/**
 * Étage 2 de la veille (ADR-0023) — ouvre la PR **draft** d'une action, une fois
 * que la branche a été poussée et que tous les contrôles sont passés.
 *
 * Le draft n'est pas un détail de présentation : c'est la décision de l'ADR-0005.
 * Un correctif déduit de pages web n'entre jamais dans `main` sans qu'un humain
 * l'ait ouvert, lu et sorti du brouillon lui-même.
 *
 * Idempotent : si une PR existe déjà pour cette branche, son corps est mis à jour
 * et le script sort en 0 (re-run d'un job, reprise après échec réseau).
 *
 * Variables d'environnement :
 *   GITHUB_TOKEN         - requis (permission `pull-requests: write`)
 *   GITHUB_REPOSITORY    - « owner/repo » (fourni par Actions)
 *   GITHUB_API_URL       - défaut « https://api.github.com »
 *   VEILLE_PR_BRANCH     - branche source (requis)
 *   VEILLE_PR_BASE       - branche cible (défaut « main »)
 *   VEILLE_DATE          - date ISO de la veille
 *   VEILLE_ACTION_*      - TITRE / CATEGORIE / PRIORITE / SOURCE / RESUME
 *
 * ⚠️ Les champs `VEILLE_ACTION_*` proviennent d'un LLM ayant lu des pages web :
 * ils sont traités comme du TEXTE (aplatis sur une ligne, tronqués), jamais comme
 * des instructions. Ils sont passés par l'environnement et non interpolés dans un
 * shell — une valeur ne doit pas pouvoir devenir une commande.
 *
 * Node 20+ requis (fetch global). Aucune dépendance externe.
 */

'use strict';

const { CATEGORIES, PRIORITES, ligne } = require('./lib/veille-actions');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPOSITORY || '';
const API = (process.env.GITHUB_API_URL || 'https://api.github.com').replace(/\/$/, '');
const BRANCHE = (process.env.VEILLE_PR_BRANCH || '').trim();
const BASE = (process.env.VEILLE_PR_BASE || 'main').trim();
const DATE = ligne(process.env.VEILLE_DATE || new Date().toISOString().slice(0, 10), 20);

const action = {
  titre: ligne(process.env.VEILLE_ACTION_TITRE, 200),
  categorie: ligne(process.env.VEILLE_ACTION_CATEGORIE, 40).toLowerCase(),
  priorite: ligne(process.env.VEILLE_ACTION_PRIORITE, 20).toLowerCase(),
  source: ligne(process.env.VEILLE_ACTION_SOURCE, 500),
  resume: ligne(process.env.VEILLE_ACTION_RESUME, 600),
};

function stop(message, code) {
  console.error(message);
  process.exit(code);
}

if (!GITHUB_TOKEN || !REPO.includes('/')) stop('GITHUB_TOKEN ou GITHUB_REPOSITORY manquant.', 1);
if (!BRANCHE) stop('VEILLE_PR_BRANCH manquant.', 1);
if (!action.titre) stop('VEILLE_ACTION_TITRE manquant.', 1);
if (!/^https?:\/\//i.test(action.source)) stop('VEILLE_ACTION_SOURCE absente ou non http(s).', 1);

const categorie = CATEGORIES[action.categorie] ? action.categorie : 'dependance';
const priorite = PRIORITES[action.priorite] ? action.priorite : 'moyenne';

const TITRE_PR = ligne(`veille(${categorie}) : ${action.titre}`, 120);

const CORPS = [
  '> ⚠️ **PR préparée automatiquement par la veille technologique** — brouillon à relire.',
  '> Son contenu dérive de **pages web** (donnée non fiable) : vérifiez la source avant',
  '> de sortir cette PR du brouillon. Aucune fusion automatique n\'est prévue (ADR-0005).',
  '',
  `**Action** — ${action.titre}`,
  '',
  `- **Catégorie** : ${CATEGORIES[categorie].label}`,
  `- **Priorité** : ${PRIORITES[priorite].pastille}`,
  `- **Source** : ${action.source}`,
  `- **Veille du** : ${DATE}`,
  action.resume ? `- **Ce qu'annonce la veille** : ${action.resume}` : null,
  '',
  '### Ce qui a été vérifié avant l\'ouverture',
  '',
  '- [x] Périmètre des fichiers (`scripts/check-veille-diff.js`) — ni CI, ni scripts de',
  '      contrôle, ni corpus « Le saviez-vous ? », et volume plafonné.',
  '- [x] Syntaxe de `js/` et du service worker (`node --check`).',
  '- [x] Structure CSS (`scripts/check-css.js`, ADR-0015).',
  '- [x] Cache-busting et numéro de version affiché (`scripts/check-cache-bust.js`, ADR-0019).',
  '',
  '### Ce qui reste à faire par un humain',
  '',
  '- [ ] Vérifier la source et la réalité du besoin.',
  '- [ ] Relire le correctif ligne à ligne.',
  '- [ ] Lancer les tests Playwright (non exécutés ici).',
  '- [ ] Sortir la PR du brouillon si elle tient la route — sinon la fermer.',
  '',
  '> ℹ️ Cette PR a été ouverte avec le `GITHUB_TOKEN` des Actions : GitHub ne déclenche',
  '> **pas** de workflow pour les événements qu\'il produit. L\'absence de coche verte ne',
  '> veut donc pas dire « non testé » — les contrôles ci-dessus ont tourné dans le job',
  '> qui a préparé la branche. Pour relancer la CI, poussez un commit sur la branche.',
  '',
  '---',
  '',
  '_PR générée automatiquement par la veille technologique (GitHub Actions) — étage 2, ADR-0023._',
].filter((l) => l !== null).join('\n');

function entetes() {
  return {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
    'User-Agent': 'mat-veille-pr',
  };
}

(async () => {
  const [owner] = REPO.split('/');

  // Idempotence : une PR existe-t-elle déjà pour cette branche ?
  const existantes = await fetch(
    `${API}/repos/${REPO}/pulls?state=all&per_page=1&head=${encodeURIComponent(`${owner}:${BRANCHE}`)}`,
    { headers: entetes() }
  );
  if (existantes.ok) {
    const liste = await existantes.json();
    if (Array.isArray(liste) && liste.length > 0) {
      const pr = liste[0];
      await fetch(`${API}/repos/${REPO}/pulls/${pr.number}`, {
        method: 'PATCH', headers: entetes(), body: JSON.stringify({ body: CORPS }),
      });
      console.log(`PR #${pr.number} déjà ouverte pour ${BRANCHE} — corps mis à jour : ${pr.html_url}`);
      return;
    }
  }

  const res = await fetch(`${API}/repos/${REPO}/pulls`, {
    method: 'POST',
    headers: entetes(),
    body: JSON.stringify({ title: TITRE_PR, head: BRANCHE, base: BASE, body: CORPS, draft: true }),
  });
  if (!res.ok) {
    const texte = await res.text();
    stop(`Création de la PR échouée : HTTP ${res.status} - ${texte}`, 1);
  }
  const pr = await res.json();
  console.log(`PR draft #${pr.number} ouverte : ${pr.html_url}`);
})().catch((error) => stop(`Erreur inattendue : ${error.message}`, 1));
