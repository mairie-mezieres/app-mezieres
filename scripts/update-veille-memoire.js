/**
 * Écrit la section datée de la mémoire de veille municipale
 * (`veille/historique-municipale.md`) à partir du fichier structuré
 * `veille/items-municipale.json` produit par l'agent.
 *
 * POURQUOI CE SCRIPT EXISTE (ADR-0027) : la première exécution réelle du
 * 19 août 2026 s'est terminée « avec succès », email envoyé — et l'étape de
 * commit a répondu « Historique inchangé — rien à committer ». L'agent avait
 * écrit son rapport puis n'avait pas touché la mémoire, dernière consigne d'un
 * prompt de 180 lignes. Résultat : la veille suivante aurait re-proposé les
 * mêmes items, c'est-à-dire exactement ce que la mémoire doit empêcher.
 *
 * La leçon est celle de l'ADR-0004 : un livrable confié à la discipline d'un
 * agent doit être VÉRIFIABLE, pas espéré. On ne demande donc plus à l'agent
 * d'éditer du Markdown — on lui demande une liste structurée, et ce script
 * écrit le fichier. La mémoire avance parce que du code l'écrit.
 *
 * Format attendu de `veille/items-municipale.json` — un tableau JSON, chaque
 * élément ayant exactement ces clés :
 *   {"niveau": "action" | "surveiller", "titre": "...", "url": "https://…"}
 * Un tableau vide (`[]`) est valide : c'est un mois sans rien à retenir.
 *
 * Best-effort SUR L'EMAIL, strict sur la trace : le script sort toujours en 0
 * (perdre l'email pour un souci de mémoire serait pire que le souci), mais un
 * JSON absent ou invalide écrit tout de même une section datée portant la
 * mention de l'anomalie, et émet un `::warning`. Une mémoire qui n'avance pas
 * ne doit plus jamais être silencieuse.
 *
 * Variables d'environnement :
 *   ITEMS_PATH      - chemin du JSON d'items (défaut « veille/items-municipale.json »)
 *   MEMOIRE_PATH    - chemin de la mémoire   (défaut « veille/historique-municipale.md »)
 *   VEILLE_DATE     - date ISO de l'édition  (défaut : date du jour UTC)
 *
 * Node 20+ requis. Aucune dépendance externe.
 */

'use strict';

const fs = require('fs');

const ITEMS_PATH = (process.env.ITEMS_PATH || 'veille/items-municipale.json').trim();
const MEMOIRE_PATH = (process.env.MEMOIRE_PATH || 'veille/historique-municipale.md').trim();
const DATE_ISO = (process.env.VEILLE_DATE || new Date().toISOString().slice(0, 10)).trim();

// Marqueur d'amorce du fichier : tout ce qui précède est l'en-tête explicatif,
// que ce script ne touche jamais ; les sections datées vivent après.
const MARQUEUR = '<!-- Les sections datées sont ajoutées ci-dessous, la plus récente en tête. -->';
const MAX_SECTIONS = 12;
const NIVEAUX = new Set(['action', 'surveiller']);

function avertir(message) {
  console.log(`::warning title=Veille municipale::${message}`);
}

/** Une ligne de mémoire ne doit jamais casser la structure du Markdown. */
function nettoyer(valeur, max) {
  return String(valeur == null ? '' : valeur)
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, max);
}

/**
 * Lit et valide le JSON d'items. Renvoie { lignes, anomalie } : `lignes` est
 * toujours un tableau utilisable, `anomalie` décrit ce qui a cloché (ou null).
 */
function lireItems() {
  if (!fs.existsSync(ITEMS_PATH)) {
    return { lignes: [], anomalie: `${ITEMS_PATH} absent — l'agent ne l'a pas écrit.` };
  }

  let brut;
  try {
    brut = JSON.parse(fs.readFileSync(ITEMS_PATH, 'utf8'));
  } catch (error) {
    return { lignes: [], anomalie: `${ITEMS_PATH} illisible (${error.message}).` };
  }

  if (!Array.isArray(brut)) {
    return { lignes: [], anomalie: `${ITEMS_PATH} n'est pas un tableau JSON.` };
  }

  const lignes = [];
  let ignores = 0;
  for (const item of brut) {
    if (!item || typeof item !== 'object') { ignores++; continue; }
    const niveau = nettoyer(item.niveau, 20).toLowerCase();
    const titre = nettoyer(item.titre, 160);
    const url = nettoyer(item.url, 400);
    // Un item sans URL ne sert à rien : le dédoublonnage du mois suivant se
    // fait d'abord sur l'adresse. Un niveau inconnu, de même, ne se relit pas.
    if (!NIVEAUX.has(niveau) || !titre || !/^https?:\/\//i.test(url)) { ignores++; continue; }
    lignes.push(`- [${niveau}] ${titre} — ${url}`);
  }

  if (ignores > 0) {
    avertir(`${ignores} item(s) de ${ITEMS_PATH} ignoré(s) : niveau, titre ou URL manquant ou invalide.`);
  }

  return { lignes, anomalie: null };
}

/**
 * Découpe la mémoire existante en { entete, sections } où chaque section est
 * le texte complet d'un bloc `## AAAA-MM-JJ`.
 */
function lireMemoire() {
  if (!fs.existsSync(MEMOIRE_PATH)) {
    return { entete: `${MARQUEUR}\n`, sections: [] };
  }

  const contenu = fs.readFileSync(MEMOIRE_PATH, 'utf8');
  const coupe = contenu.indexOf(MARQUEUR);

  // Sans marqueur (fichier réécrit à la main), on se rabat sur la première
  // section datée : l'en-tête est tout ce qui la précède.
  const debutSections = coupe >= 0
    ? coupe + MARQUEUR.length
    : (contenu.search(/^## \d{4}-\d{2}-\d{2}\s*$/m) >= 0 ? contenu.search(/^## \d{4}-\d{2}-\d{2}\s*$/m) : contenu.length);

  const entete = contenu.slice(0, debutSections).replace(/\s+$/, '') + '\n';
  const reste = contenu.slice(debutSections);

  const sections = [];
  const regex = /^## (\d{4}-\d{2}-\d{2})\s*$/gm;
  const debuts = [];
  let m;
  while ((m = regex.exec(reste)) !== null) debuts.push({ index: m.index, date: m[1] });
  for (let i = 0; i < debuts.length; i++) {
    const fin = i + 1 < debuts.length ? debuts[i + 1].index : reste.length;
    sections.push({ date: debuts[i].date, texte: reste.slice(debuts[i].index, fin).replace(/\s+$/, '') });
  }

  return { entete, sections };
}

// ─── Construction de la section du jour ───────────────────────────────────
const { lignes, anomalie } = lireItems();

let corps;
if (anomalie) {
  avertir(`${anomalie} La mémoire n'enregistre donc pas les items de cette édition : ils pourront être re-proposés le mois prochain.`);
  corps = `- (mémoire non renseignée par l'agent — items possiblement re-proposés)`;
} else if (lignes.length === 0) {
  corps = '- (rien de notable)';
} else {
  corps = lignes.join('\n');
}

const sectionDuJour = `## ${DATE_ISO}\n\n${corps}`;

// ─── Fusion : la section du jour remplace celle du même jour, en tête ──────
const { entete, sections } = lireMemoire();
const conservees = sections.filter((s) => s.date !== DATE_ISO);
const finales = [sectionDuJour, ...conservees.map((s) => s.texte)].slice(0, MAX_SECTIONS);

fs.writeFileSync(MEMOIRE_PATH, `${entete}\n${finales.join('\n\n')}\n`, 'utf8');

const remplacee = sections.some((s) => s.date === DATE_ISO);
console.log(
  `Mémoire ${MEMOIRE_PATH} mise à jour : section ${DATE_ISO} ${remplacee ? 'remplacée' : 'ajoutée'}, ` +
  `${lignes.length} item(s), ${finales.length} section(s) conservée(s).`
);
