#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════
   Suivi du dépôt — vérification et traitement des PR et issues ouvertes
   Copyright (c) 2024-2026 Commune de Mézières-lez-Cléry — Licence MIT

   POURQUOI CE SCRIPT EXISTE
   -------------------------
   L'étage 3 de la veille (ADR-0042) ne regarde que ce que la veille a ouvert.
   Tout le reste — PR Dependabot, PR d'un agent, PR humaines, issues — n'est
   regardé par personne entre deux passages du mainteneur. Une PR en conflit ou
   à la CI rouge ne le dit pas d'elle-même : il faut aller la voir.

   LE PRINCIPE, ET C'EST LUI QUI COMPTE
   ------------------------------------
   ⛔ **Plus une PR est « à nous », plus on agit.** Un robot qui commente sur la
   PR d'un humain pour lui apprendre ce que GitHub lui affiche déjà en rouge est
   du bruit, et le bruit fait qu'on cesse de lire le canal.

     • PR de la veille (`claude/veille-…`) → ENTIÈREMENT IGNORÉES ici : elles ont
       leur propre canal (`veille-suivi.yml`). Deux canaux = deux commentaires
       pour un même fait.
     • PR automatiques (Dependabot, agents) → commentaire quand c'est actionnable
       (conflit, CI rouge), relance unique après N jours d'inactivité. Jamais de
       fermeture : fermer la PR d'un robot, c'est perdre la mise à jour qu'il
       proposait, et il la rouvrira.
     • PR humaines → **aucun commentaire**, jamais. Elles figurent au résumé.
     • Issues → résumé. Les issues qui ont déjà un gardien (l'issue « liens-morts »,
       refermée par son propre workflow ; les issues « 🔭 Actions PWA », traitées
       par l'étage 3) sont écartées. Le rappel d'ancienneté est désactivé par
       défaut (`SUIVI_ISSUE_RAPPEL_JOURS=0`).

   Le canal par défaut est donc le **résumé du run** (onglet « Summary »), pas le
   commentaire. Le commentaire est l'exception, et il est idempotent : son marqueur
   porte le SHA de tête, de sorte qu'un même échec ne se re-signale pas à chaque
   passage, mais qu'un NOUVEL échec après un push parle.

   ⚠️ Ce script ne rejoue AUCUN contrôle : contrairement aux PR de la veille, ces
   PR-là déclenchent la CI normalement. Il LIT ce que la CI a conclu.

   Best-effort : sort toujours en 0. `SUIVI_DRY_RUN=1` n'écrit rien.

   Variables d'environnement :
     GITHUB_TOKEN / GITHUB_REPOSITORY / GITHUB_API_URL - fournis par Actions
     SUIVI_PR_RELANCE_JOURS    - relance des PR automatiques (défaut 14)
     SUIVI_ISSUE_RAPPEL_JOURS  - rappel des issues inactives (défaut 0 = désactivé)
     SUIVI_DRY_RUN             - « 1 » : aucune écriture
   ════════════════════════════════════════════════════════════ */

'use strict';

const {
  REPO, DRY_RUN, PREFIXE_BRANCHE, PREFIXE_ISSUE,
  ageJours, gh, ghListe, resume, pretOuAbandon, commenterUneFois,
} = require('./lib/veille-suivi');

const RELANCE_JOURS = Math.max(0, Number(process.env.SUIVI_PR_RELANCE_JOURS || 14) || 0);
const RAPPEL_JOURS = Math.max(0, Number(process.env.SUIVI_ISSUE_RAPPEL_JOURS || 0) || 0);

/* Préfixes de branche des PR ouvertes par un automate. Tout le reste est
   considéré comme humain — le doute profite à l'humain, qu'on ne commente pas. */
const BRANCHES_AUTO = ['dependabot/', 'claude/'];

/* Issues qui ont déjà un gardien : les toucher ici, c'est doubler leur canal.
   ⚠️ `liens-morts` est refermée automatiquement par son propre workflow quand le
   scan repasse au vert — un rappel posté ici survivrait à cette fermeture. */
const LABELS_ECARTES = ['liens-morts'];

function categorie(pr) {
  const ref = (pr.head && pr.head.ref) || '';
  if (ref.startsWith(PREFIXE_BRANCHE)) return 'veille';
  return BRANCHES_AUTO.some((p) => ref.startsWith(p)) ? 'auto' : 'humaine';
}

/**
 * État de la CI sur la tête d'une PR : `{ etat, echecs }`.
 *
 * Deux sources, et il faut les deux : les **check runs** (les jobs GitHub
 * Actions) et les **commit statuses** de l'API — c'est par ce second canal que
 * l'étage 3 pose `veille/controles`, et il n'apparaît dans aucun check run.
 */
async function etatCI(sha) {
  const echecs = [];
  let vus = 0;
  let enCours = false;

  const runs = await gh(`/repos/${REPO}/commits/${sha}/check-runs?per_page=100`);
  const liste = (runs.data && runs.data.check_runs) || [];
  for (const run of liste) {
    vus += 1;
    if (run.status !== 'completed') { enCours = true; continue; }
    // `neutral` et `skipped` ne sont pas des échecs : un job conditionnel ignoré
    // est un fonctionnement normal, le compter en rouge rendrait le signal faux.
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

/** Pastille lisible pour le tableau du résumé. */
function pastille(etat) {
  return { verte: '✅ verte', rouge: '❌ rouge', 'en cours': '⏳ en cours', aucune: '➖ aucune' }[etat] || etat;
}

async function traiterPr(numero) {
  // La liste des PR ne porte pas `mergeable_state` : il se lit PR par PR, et
  // GitHub le calcule de façon asynchrone — « unknown » veut dire « pas encore
  // calculé », jamais « en conflit ». Ne rien conclure dans ce cas.
  const { ok, data: pr } = await gh(`/repos/${REPO}/pulls/${numero}`);
  if (!ok || !pr || !pr.head) return null;

  const cat = categorie(pr);
  const sha = pr.head.sha;
  const conflit = pr.mergeable_state === 'dirty';
  const ci = await etatCI(sha);
  const inactif = ageJours(pr.updated_at);
  const ligne = `| #${pr.number} | ${cat} | ${pastille(ci.etat)} | ${conflit ? '⚠️ conflit' : 'ok'} | ${inactif} j | ${pr.draft ? 'brouillon' : 'ouverte'} |`;

  // La veille a son propre canal (ADR-0042) : ici, on ne fait que la recenser.
  if (cat === 'veille' || cat === 'humaine') return { ligne, ci, conflit };

  const court = String(sha).slice(0, 7);

  if (conflit) {
    await commenterUneFois(pr.number, `depot-conflit-${court}`, [
      '⚠️ **Cette PR ne se fusionne plus avec `main`.**',
      '',
      'Elle a été ouverte automatiquement : si c\'est une mise à jour de dépendance,',
      'le plus simple est de la laisser être régénérée (Dependabot rouvre une PR à',
      'jour au prochain passage) plutôt que de résoudre le conflit à la main.',
      '',
      '_Signalé par le suivi du dépôt — aucune fermeture automatique._',
    ].join('\n'));
  } else if (ci.etat === 'rouge') {
    await commenterUneFois(pr.number, `depot-ci-${court}`, [
      '❌ **La CI échoue sur cette PR ouverte automatiquement.**',
      '',
      ...ci.echecs.slice(0, 10).map((n) => `- \`${n}\``),
      '',
      'Une mise à jour de dépendance qui casse les tests **ne se fusionne pas** :',
      'soit le correctif d\'usage se fait dans la même PR, soit la version est',
      'écartée. Fermer sans regarder reviendrait à garder une version vulnérable.',
      '',
      '_Signalé par le suivi du dépôt._',
    ].join('\n'));
  } else if (RELANCE_JOURS > 0 && inactif >= RELANCE_JOURS) {
    await commenterUneFois(pr.number, `depot-relance-${RELANCE_JOURS}j`, [
      `⏳ Cette PR automatique est sans activité depuis **${inactif} jours** et sa CI`,
      'ne signale rien. Elle attend une décision : fusionner ou fermer.',
      '',
      '_Rappel unique du suivi du dépôt — il ne reviendra pas._',
    ].join('\n'));
  }

  return { ligne, ci, conflit };
}

(async () => {
  pretOuAbandon();

  // ── Les PR ──────────────────────────────────────────────────
  const ouvertes = await ghListe(`/repos/${REPO}/pulls?state=open&sort=created&direction=asc`);
  const lignes = [];
  let rouges = 0;
  let conflits = 0;

  for (const base of ouvertes) {
    const r = await traiterPr(base.number);
    if (!r) continue;
    lignes.push(r.ligne);
    if (r.ci.etat === 'rouge') rouges += 1;
    if (r.conflit) conflits += 1;
  }

  const blocPr = lignes.length > 0
    ? ['| PR | Origine | CI | Fusion | Inactivité | État |', '|---|---|---|---|---|---|', ...lignes]
    : ['_Aucune PR ouverte._'];

  // ── Les issues ──────────────────────────────────────────────
  const issues = (await ghListe(`/repos/${REPO}/issues?state=open&sort=updated&direction=asc`))
    .filter((i) => i && !i.pull_request)
    .filter((i) => !(i.labels || []).some((l) => LABELS_ECARTES.includes(l && l.name)))
    .filter((i) => !(typeof i.title === 'string' && i.title.startsWith(PREFIXE_ISSUE)));

  const lignesIssues = [];
  for (const issue of issues) {
    const inactif = ageJours(issue.updated_at);
    lignesIssues.push(`| #${issue.number} | ${String(issue.title).slice(0, 70)} | ${ageJours(issue.created_at)} j | ${inactif} j |`);
    if (RAPPEL_JOURS > 0 && inactif >= RAPPEL_JOURS) {
      await commenterUneFois(issue.number, `depot-rappel-${RAPPEL_JOURS}j`, [
        `⏳ Sans activité depuis **${inactif} jours**. Toujours d'actualité ?`,
        '',
        '_Rappel unique du suivi du dépôt — il ne reviendra pas._',
      ].join('\n'));
    }
  }

  const blocIssues = lignesIssues.length > 0
    ? ['| Issue | Titre | Âge | Inactivité |', '|---|---|---|---|', ...lignesIssues]
    : ['_Aucune issue ouverte à suivre (celles qui ont leur propre gardien sont écartées)._'];

  resume([
    '## 🩺 Suivi du dépôt',
    '',
    `**${ouvertes.length}** PR ouverte(s) — ${rouges} à la CI rouge, ${conflits} en conflit.`,
    '',
    '### Pull requests',
    '',
    ...blocPr,
    '',
    '### Issues',
    '',
    ...blocIssues,
    '',
    '> Les PR `claude/veille-…` sont suivies par `veille-suivi.yml` (ADR-0042) et les',
    '> issues « liens-morts » / « 🔭 Actions PWA » par leur propre workflow : elles ne',
    '> reçoivent aucun commentaire d\'ici.',
    DRY_RUN ? '\n_(dry-run : aucune écriture)_' : '',
  ].join('\n'));

  if (rouges > 0 || conflits > 0) {
    console.log(`::warning title=Suivi du dépôt::${rouges} PR à la CI rouge, ${conflits} en conflit — voir le résumé du run.`);
  }
})().catch((error) => {
  console.log(`::warning title=Suivi du dépôt::Erreur inattendue : ${error.message}`);
  process.exit(0);
});
