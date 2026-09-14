#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════
   Étage 3 de la veille — verdict d'une PR draft (ADR-0042)
   Copyright (c) 2024-2026 Commune de Mézières-lez-Cléry — Licence MIT

   POURQUOI CE SCRIPT EXISTE
   -------------------------
   Une PR sans coche verte se lit spontanément comme « non testée ». L'ADR-0023
   le constatait sans pouvoir y remédier : les PR de veille sont ouvertes par le
   `GITHUB_TOKEN`, et GitHub ne déclenche aucun workflow pour ses propres
   événements. Le corps de la PR le disait en toutes lettres… ce qui ne se voit
   qu'en ouvrant la PR et en lisant jusqu'au bout.

   Un **commit status** (`POST /statuses/{sha}`), lui, s'affiche là où l'œil va :
   à côté du titre, dans la liste des PR. Il est publié par l'API, et non déduit
   d'un workflow — c'est justement ce qui permet de le poser ici.

   ⛔ Le statut porte sur les contrôles du dépôt (syntaxe, CSS, cache-busting),
   PAS sur les tests Playwright ni sur la pertinence du correctif. La description
   le dit ; ne jamais l'élargir en silence — une coche verte qui promet plus
   qu'elle ne vérifie est pire que pas de coche du tout.

   Variables d'environnement :
     GITHUB_TOKEN / GITHUB_REPOSITORY / GITHUB_API_URL - fournis par Actions
     SUIVI_PR_NUMERO - numéro de la PR (requis)
     SUIVI_PR_SHA    - commit sur lequel poser le statut (requis)
     SUIVI_PR_ETAT   - ok | repare | echec | conflit
     SUIVI_PR_DETAIL - une ligne de contexte (facultatif)
     SUIVI_RUN_URL   - URL du run, pour le lien « Details »
     SUIVI_DRY_RUN   - « 1 » : aucune écriture
   ════════════════════════════════════════════════════════════ */

'use strict';

const { REPO, gh, pretOuAbandon, commenterUneFois } = require('./lib/veille-suivi');
const { ligne } = require('./lib/veille-actions');

const NUMERO = Number(process.env.SUIVI_PR_NUMERO || 0);
const SHA = ligne(process.env.SUIVI_PR_SHA, 40);
const ETAT = ligne(process.env.SUIVI_PR_ETAT, 20).toLowerCase() || 'echec';
const DETAIL = ligne(process.env.SUIVI_PR_DETAIL, 300);
const RUN_URL = ligne(process.env.SUIVI_RUN_URL, 300);

const VERDICTS = {
  ok: {
    state: 'success',
    description: 'Syntaxe, CSS et cache-busting OK (hors tests Playwright)',
  },
  repare: {
    state: 'success',
    description: 'Branche remise à niveau sur main, contrôles du dépôt OK',
  },
  echec: {
    state: 'failure',
    description: 'Contrôles du dépôt en échec — voir le commentaire',
  },
  conflit: {
    state: 'failure',
    description: 'Conflit avec main — fusion à faire à la main',
  },
};

(async () => {
  pretOuAbandon();
  if (!NUMERO || !/^[0-9a-f]{40}$/i.test(SHA)) {
    console.log('SUIVI_PR_NUMERO ou SUIVI_PR_SHA manquant/invalide — aucun verdict publié.');
    process.exit(0);
  }

  const verdict = VERDICTS[ETAT] || VERDICTS.echec;

  await gh(`/repos/${REPO}/statuses/${SHA}`, {
    method: 'POST',
    body: {
      state: verdict.state,
      context: 'veille/controles',
      description: verdict.description.slice(0, 140),
      target_url: RUN_URL || undefined,
    },
  });
  console.log(`PR #${NUMERO} — statut « ${verdict.state} » posé sur ${SHA.slice(0, 7)}.`);

  // Un commentaire seulement quand il y a quelque chose à faire, ou quelque
  // chose à savoir. Le marqueur inclut le SHA : un nouvel échec sur un nouveau
  // commit parle, un re-run sur le même commit se tait.
  const court = SHA.slice(0, 7);
  if (ETAT === 'conflit') {
    await commenterUneFois(NUMERO, `conflit-${court}`, [
      '⚠️ **Cette branche ne se fusionne plus toute seule avec `main`.**',
      '',
      DETAIL ? `Détail : ${DETAIL}` : null,
      '',
      'Le suivi automatique ne résout pas les conflits : il refuserait de distinguer',
      'ce que le correctif voulait dire de ce que `main` a changé depuis. À reprendre',
      'à la main :',
      '',
      '```bash',
      `git fetch origin && git switch ${process.env.SUIVI_PR_BRANCHE || '<branche>'}`,
      'git merge origin/main   # puis résoudre, puis pousser',
      '```',
    ].filter((l) => l !== null).join('\n'));
  } else if (ETAT === 'echec') {
    await commenterUneFois(NUMERO, `echec-${court}`, [
      '❌ **Les contrôles du dépôt ne passent plus sur cette branche.**',
      '',
      DETAIL ? `Détail : ${DETAIL}` : null,
      RUN_URL ? `Journal complet : ${RUN_URL}` : null,
      '',
      'Le cas le plus courant : `main` a avancé (numéro de version affiché, `CACHE` du',
      'service worker) et `scripts/check-cache-bust.js` voit désormais un `?v=` en',
      'retard. Le suivi a tenté une remise à niveau automatique et n’y est pas arrivé —',
      'à reprendre à la main, ou à fermer si le correctif n’a plus lieu d’être.',
    ].filter((l) => l !== null).join('\n'));
  } else if (ETAT === 'repare') {
    await commenterUneFois(NUMERO, `repare-${court}`, [
      '🔧 **Brouillon remis à niveau automatiquement.**',
      '',
      DETAIL ? `Ce qui a été fait : ${DETAIL}` : null,
      '',
      'Les contrôles du dépôt (syntaxe, CSS, cache-busting) repassent au vert. Cela ne',
      'dit **rien** de la pertinence du correctif ni des tests Playwright : la relecture',
      'humaine reste entière, et la PR reste un brouillon.',
    ].filter((l) => l !== null).join('\n'));
  }
})().catch((error) => {
  console.log(`::warning title=Suivi veille::Erreur inattendue (verdict PR) : ${error.message}`);
  process.exit(0);
});
