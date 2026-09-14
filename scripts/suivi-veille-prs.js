#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════
   Étage 3 de la veille — inventaire et hygiène des PR draft (ADR-0042)
   Copyright (c) 2024-2026 Commune de Mézières-lez-Cléry — Licence MIT

   POURQUOI CE SCRIPT EXISTE
   -------------------------
   Les PR de l'étage 2 sont ouvertes avec le `GITHUB_TOKEN` : GitHub ne déclenche
   AUCUN workflow pour les événements qu'il produit (ADR-0023 §5). Ces PR n'ont
   donc pas de coche verte, et elles ne vieillissent pas bien : `main` avance, le
   numéro de version affiché bouge, et le cache-busting qui passait à l'ouverture
   ne passe plus. Une PR draft qu'aucun contrôle ne rejoue est un brouillon dont
   personne ne sait s'il est encore applicable.

   CE QU'IL FAIT
   -------------
   1. Inventorie les PR OUVERTES dont la branche commence par `claude/veille-`.
   2. Ferme celles qui traînent au-delà du seuil (avec un commentaire qui dit
      pourquoi et comment les rouvrir). ⚠️ La BRANCHE n'est pas supprimée : la
      sélection de l'étage 2 s'en sert pour ne jamais rouvrir la même action.
   3. Relance UNE FOIS celles qui dépassent le seuil de relance.
   4. Publie la matrice des PR restantes → le job qui rejoue les contrôles,
      publie la coche verte et tente une réparation.

   ⚠️ Les seuils se comptent depuis `created_at`, JAMAIS `updated_at` : le job de
   vérification pousse lui-même une fusion de `main` dans la branche, ce qui
   rafraîchit `updated_at`. Une PR abandonnée paraîtrait éternellement active.

   Best-effort : sort toujours en 0, et publie une matrice vide en cas de doute.

   Variables d'environnement :
     GITHUB_TOKEN / GITHUB_REPOSITORY / GITHUB_API_URL - fournis par Actions
     SUIVI_PR_RELANCE_JOURS   - relance (défaut 14)
     SUIVI_PR_FERMETURE_JOURS - fermeture (défaut 60 ; 0 = ne jamais fermer)
     SUIVI_PR_MAX             - plafond de PR vérifiées par exécution (défaut 5)
     SUIVI_DRY_RUN            - « 1 » : aucune écriture
   ════════════════════════════════════════════════════════════ */

'use strict';

const {
  REPO, DRY_RUN, PREFIXE_BRANCHE, ageJours, gh, ghListe, sortie, resume,
  pretOuAbandon, commenterUneFois,
} = require('./lib/veille-suivi');
// Le titre d'une PR de veille dérive d'une page web : aplati sur une ligne et
// tronqué avant d'entrer dans une matrice, comme partout ailleurs (ADR-0023 §7).
const { ligne } = require('./lib/veille-actions');

const RELANCE_JOURS = Math.max(1, Number(process.env.SUIVI_PR_RELANCE_JOURS || 14) || 14);
const FERMETURE_JOURS = Math.max(0, Number(process.env.SUIVI_PR_FERMETURE_JOURS || 60) || 0);
const MAX = Math.max(0, Number(process.env.SUIVI_PR_MAX || 5) || 0);

function rien(message) {
  console.log(message);
  sortie('matrice', JSON.stringify({ include: [] }));
  sortie('nombre', '0');
  process.exit(0);
}

(async () => {
  pretOuAbandon();

  const ouvertes = (await ghListe(`/repos/${REPO}/pulls?state=open&sort=created&direction=asc`))
    .filter((pr) => pr && pr.head && typeof pr.head.ref === 'string' && pr.head.ref.startsWith(PREFIXE_BRANCHE));

  if (ouvertes.length === 0) {
    resume('### 📝 Suivi de veille — PR\n\nAucune PR de veille ouverte.');
    rien('Aucune PR de veille ouverte.');
  }

  const bilan = [];
  const aVerifier = [];

  for (const pr of ouvertes) {
    const age = ageJours(pr.created_at);

    // 1. Trop vieille : on la ferme, en disant pourquoi.
    if (FERMETURE_JOURS > 0 && age >= FERMETURE_JOURS) {
      await commenterUneFois(
        pr.number, `fermeture-${FERMETURE_JOURS}j`,
        [`⌛ Ce brouillon de veille a **${age} jours** et n’a pas été relu. Le suivi automatique`,
         'le referme pour ne pas laisser croire qu’un correctif est en attente de fusion.',
         '',
         '- La **branche est conservée** : rien n’est perdu, il suffit de rouvrir cette PR.',
         '- L’action correspondante reste tracée dans son issue « Actions PWA ».',
         '- L’étage 2 ne rouvrira **pas** de PR pour la même action (dédoublonnage par URL, ADR-0023 §6).'].join('\n')
      );
      await gh(`/repos/${REPO}/pulls/${pr.number}`, { method: 'PATCH', body: { state: 'closed' } });
      bilan.push(`- #${pr.number} : **fermée** (${age} j sans relecture, branche conservée).`);
      continue;
    }

    // 2. Relance unique.
    if (age >= RELANCE_JOURS) {
      const publiee = await commenterUneFois(
        pr.number, `relance-${RELANCE_JOURS}j`,
        [`⏳ Brouillon ouvert depuis **${age} jours**. Il attend une relecture humaine :`,
         'vérifier la source, relire le correctif, lancer les tests Playwright, puis sortir',
         'du brouillon — ou fermer la PR si elle ne tient pas la route.',
         '',
         FERMETURE_JOURS > 0
           ? `Sans réponse, le suivi la refermera automatiquement à ${FERMETURE_JOURS} jours (la branche, elle, sera conservée).`
           : 'Le suivi ne la fermera pas tout seul.'].join('\n')
      );
      bilan.push(`- #${pr.number} : ${age} j — ${publiee ? 'relance publiée' : 'déjà relancée'}.`);
    } else {
      bilan.push(`- #${pr.number} : ${age} j — brouillon suivi.`);
    }

    if (aVerifier.length < MAX) {
      aVerifier.push({
        numero: pr.number,
        branche: pr.head.ref,
        titre: ligne(pr.title, 120),
        // `mergeable_state` n’est pas fiable ici : GitHub le calcule de façon
        // asynchrone et répond souvent « unknown » sur une PR qu’on vient de
        // lister. Le job fait autorité en tentant la fusion pour de vrai.
      });
    }
  }

  resume(['### 📝 Suivi de veille — PR', '', ...bilan, '', DRY_RUN ? '_(dry-run : aucune écriture)_' : ''].join('\n'));

  if (aVerifier.length === 0) rien('Aucune PR à vérifier.');
  if (DRY_RUN) rien('Dry-run : la matrice de vérification n’est pas publiée.');

  console.log(`${aVerifier.length} PR à vérifier :`);
  for (const p of aVerifier) console.log(`  • #${p.numero} ${p.branche}`);
  sortie('matrice', JSON.stringify({ include: aVerifier }));
  sortie('nombre', String(aVerifier.length));
})().catch((error) => {
  rien(`Erreur inattendue pendant l’inventaire des PR : ${error.message}`);
});
