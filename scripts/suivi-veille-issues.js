#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════
   Étage 3 de la veille — traitement des issues « Actions PWA » (ADR-0042)
   Copyright (c) 2024-2026 Commune de Mézières-lez-Cléry — Licence MIT

   POURQUOI CE SCRIPT EXISTE
   -------------------------
   L'étage 1 crée une issue-checklist PAR EXÉCUTION, titre daté
   (« 🔭 Actions PWA — veille du 14 septembre 2026 »). Rien ne la referme jamais :
   au rythme hebdomadaire, ce sont 52 issues ouvertes par an, dont personne ne
   sait lesquelles ont été traitées — et une action réellement corrigée par une
   PR fusionnée continue d'y figurer comme « à faire ».

   CE QU'IL FAIT, DANS CET ORDRE
   -----------------------------
   Pour chaque issue « Actions PWA » ouverte :
     1. retrouve, action par action, la PR de l'étage 2 correspondante ;
     2. COCHE les cases dont la PR est FUSIONNÉE (et rien d'autre : une PR
        ouverte ou fermée ne prouve pas que l'action est faite) ;
     3. réécrit un bloc « Suivi automatique » délimité par marqueurs, qui dit
        pour chaque action où elle en est ;
     4. ferme l'issue quand tout est coché ;
     5. relance UNE FOIS (marqueur, jamais deux) une issue plus ancienne que le
        seuil dont il reste des cases vides.

   ⛔ Une action se reconnaît à `categorie + source`, jamais à son titre : le LLM
   reformule d'une semaine à l'autre (ADR-0023 §6).

   Best-effort : sort toujours en 0. `SUIVI_DRY_RUN=1` n'écrit rien.

   Variables d'environnement :
     GITHUB_TOKEN / GITHUB_REPOSITORY / GITHUB_API_URL - fournis par Actions
     SUIVI_ISSUE_RELANCE_JOURS - âge de la relance (défaut 21)
     SUIVI_DRY_RUN             - « 1 » : aucune écriture
   ════════════════════════════════════════════════════════════ */

'use strict';

const {
  REPO, DRY_RUN, PREFIXE_ISSUE, marqueur, ageJours, gh, ghListe, resume,
  pretOuAbandon, lireActionsIssue, inventairePrVeille, etatPr, commenterUneFois,
} = require('./lib/veille-suivi');

const RELANCE_JOURS = Math.max(1, Number(process.env.SUIVI_ISSUE_RELANCE_JOURS || 21) || 21);

const DEBUT = marqueur('etat-debut');
const FIN = marqueur('etat-fin');

/** Bloc « Suivi automatique » : une ligne par action, avec sa PR s'il y en a une. */
function blocEtat(actions, parId, dateIso) {
  const lignes = [DEBUT, '', '### 🤖 Suivi automatique', ''];
  for (const action of actions) {
    const pr = parId.get(action.id);
    const etat = etatPr(pr);
    let situation;
    if (!pr) {
      situation = '_aucune PR — à traiter à la main, ou hors périmètre de ce dépôt_';
    } else if (etat === 'fusionnée') {
      situation = `✅ PR #${pr.number} **fusionnée**`;
    } else if (etat === 'fermée') {
      situation = `🚫 PR #${pr.number} fermée sans fusion — action écartée`;
    } else {
      situation = `📝 PR #${pr.number} ${etat} — à relire`;
    }
    lignes.push(`- ${action.cochee ? '✅' : '⬜'} **${action.titre}** — ${situation}`);
  }
  lignes.push('');
  lignes.push(`_Mis à jour automatiquement le ${dateIso} par le suivi de veille (étage 3, ADR-0042)._`);
  lignes.push('_Une case n’est cochée automatiquement que si sa PR a été **fusionnée**._');
  lignes.push('');
  lignes.push(FIN);
  return lignes.join('\n');
}

/** Remplace le bloc d'état s'il existe, l'ajoute en fin de corps sinon. */
function corpsAvecEtat(corps, bloc) {
  const i = corps.indexOf(DEBUT);
  const j = corps.indexOf(FIN);
  if (i !== -1 && j !== -1 && j > i) {
    return corps.slice(0, i) + bloc + corps.slice(j + FIN.length);
  }
  return `${corps.replace(/\s+$/, '')}\n\n${bloc}\n`;
}

(async () => {
  pretOuAbandon();
  const dateIso = new Date().toISOString().slice(0, 10);

  const issues = (await ghListe(`/repos/${REPO}/issues?state=open`))
    .filter((i) => i && !i.pull_request && typeof i.title === 'string' && i.title.startsWith(PREFIXE_ISSUE))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

  if (issues.length === 0) {
    resume('### 🔭 Suivi de veille — issues\n\nAucune issue « Actions PWA » ouverte.');
    return;
  }

  const parId = await inventairePrVeille();
  const bilan = [];

  for (const issue of issues) {
    const { lignes, actions } = lireActionsIssue(issue.body || '');
    if (actions.length === 0) {
      bilan.push(`- #${issue.number} : aucune action lisible dans le corps — laissée telle quelle.`);
      continue;
    }

    // 1. Cocher ce qui est démontré fait : une PR FUSIONNÉE, pas une PR ouverte.
    let cochees = 0;
    for (const action of actions) {
      const pr = parId.get(action.id);
      if (action.cochee || etatPr(pr) !== 'fusionnée') continue;
      lignes[action.indexLigne] = lignes[action.indexLigne].replace(/^- \[ \]/, '- [x]');
      action.cochee = true;
      cochees += 1;
    }

    // 2. Réécrire le bloc d'état.
    const nouveauCorps = corpsAvecEtat(lignes.join('\n'), blocEtat(actions, parId, dateIso));
    if (nouveauCorps !== (issue.body || '')) {
      await gh(`/repos/${REPO}/issues/${issue.number}`, { method: 'PATCH', body: { body: nouveauCorps } });
    }

    const restantes = actions.filter((a) => !a.cochee);
    const age = ageJours(issue.created_at);

    // 3. Tout est coché → l'issue a fait son travail.
    if (restantes.length === 0) {
      await commenterUneFois(
        issue.number, `cloture-${issue.number}`,
        ['Toutes les actions de cette veille sont traitées — issue refermée par le suivi automatique.',
         '',
         'Rouvrez-la si l\'une d\'elles doit être reprise : le suivi ne la rouvrira pas tout seul.'].join('\n')
      );
      await gh(`/repos/${REPO}/issues/${issue.number}`, {
        method: 'PATCH', body: { state: 'closed', state_reason: 'completed' },
      });
      bilan.push(`- #${issue.number} : **fermée** (${actions.length} action(s) traitée(s)${cochees ? `, dont ${cochees} cochée(s) ce passage` : ''}).`);
      continue;
    }

    // 4. Relance — une seule fois. Le seuil d'âge suffit à épargner l'issue de
    //    la veille du jour ; conditionner la relance à « ce n'est pas la plus
    //    récente » la rendrait muette le jour où la veille cesse de tourner,
    //    c'est-à-dire exactement quand on a besoin d'être relancé.
    if (age >= RELANCE_JOURS) {
      const liste = restantes.map((a) => `- ${a.titre} — ${a.source}`).join('\n');
      await commenterUneFois(
        issue.number, `relance-${RELANCE_JOURS}j`,
        [`⏳ Cette veille a **${age} jours** et il reste ${restantes.length} action(s) non traitée(s) :`,
         '',
         liste,
         '',
         'Trois issues valables : cocher ce qui est fait, fermer l\'issue si ces actions ne',
         'concernent pas ce dépôt, ou les reprendre à la main. Le suivi ne relancera plus.'].join('\n')
      );
      bilan.push(`- #${issue.number} : ${restantes.length} action(s) restante(s), ${age} j — relance.`);
      continue;
    }

    bilan.push(`- #${issue.number} : ${restantes.length} action(s) restante(s)${cochees ? `, ${cochees} cochée(s) ce passage` : ''}.`);
  }

  resume(['### 🔭 Suivi de veille — issues', '', ...bilan, '', DRY_RUN ? '_(dry-run : aucune écriture)_' : ''].join('\n'));
})().catch((error) => {
  // Filet ultime : ce canal ne fait jamais échouer un job.
  console.log(`::warning title=Suivi veille::Erreur inattendue (issues) : ${error.message}`);
  process.exit(0);
});
