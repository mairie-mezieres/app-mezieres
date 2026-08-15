/**
 * Lecture et normalisation de `veille/actions-pwa.json` — source unique.
 *
 * Ce fichier est produit par un LLM à partir de pages web : c'est une donnée
 * NON FIABLE (ADR-0005). Trois consommateurs s'appuient dessus et doivent voir
 * exactement les mêmes actions, filtrées selon exactement les mêmes règles :
 *
 *   - `scripts/create-veille-issue.js`   → l'issue-checklist (étage 1) ;
 *   - `scripts/select-veille-actions.js` → la sélection des PR draft (étage 2) ;
 *   - `scripts/create-veille-pr.js`      → le corps de la PR.
 *
 * D'où ce module commun : deux filtrages divergents, c'est une action publiée
 * dans l'issue mais jamais reprise en PR (ou l'inverse), sans que rien ne le dise.
 *
 * Aucune dépendance externe. Node 20+.
 */

'use strict';

const fs = require('fs');
const crypto = require('crypto');

const CATEGORIES = {
  dependance: { label: '📦 Dépendances', order: 1 },
  securite: { label: '🔒 Sécurité', order: 0 },
  accessibilite: { label: '♿ Accessibilité / séniors', order: 2 },
};

const PRIORITES = {
  haute: { pastille: '🔴 haute', order: 0 },
  moyenne: { pastille: '🟠 moyenne', order: 1 },
  basse: { pastille: '🟡 basse', order: 2 },
};

/* Ces deux motifs sont construits depuis une CHAÎNE (et non écrits en littéral)
   pour qu'aucun caractère de contrôle ne puisse se retrouver tel quel dans le
   source : un fichier .js contenant des octets de contrôle bruts devient
   illisible en revue et binaire pour grep. Aucun des deux ne peut matcher la
   chaîne vide (`+`) — règle 2 du CLAUDE.md. */
const CARACTERES_DE_CONTROLE = new RegExp('[\\u0000-\\u001F\\u007F]+', 'g');
const DIACRITIQUES = new RegExp('[\\u0300-\\u036F]+', 'g');

/** Tronque à `max` caractères. */
function clip(value, max) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

/**
 * Réduit une valeur à UNE SEULE LIGNE lisible.
 *
 * Ces chaînes finissent dans un prompt d'agent (étage 2), dans du Markdown
 * d'issue et dans un corps de PR. Un retour à la ligne ou un caractère de
 * contrôle y ouvrirait une structure que l'auteur du texte — c'est-à-dire une
 * page web quelconque — n'a aucune raison de pouvoir ouvrir.
 */
function ligne(value, max) {
  const plat = String(value == null ? '' : value)
    .replace(CARACTERES_DE_CONTROLE, ' ')
    .replace(/\s{2,}/g, ' ');
  return clip(plat, max);
}

/**
 * Identifiant stable d'une action, indépendant de la formulation.
 *
 * Volontairement calculé sur `categorie + source` et NON sur le titre : la même
 * information reformulée d'une semaine à l'autre par le LLM doit produire le
 * même identifiant, sinon l'étage 2 rouvrirait chaque semaine une PR pour un
 * fait déjà traité.
 */
function identifiant(action) {
  const graine = `${action.categorie}|${action.source.toLowerCase()}`;
  return crypto.createHash('sha256').update(graine).digest('hex').slice(0, 10);
}

/** Fragment de branche lisible tiré du titre (jamais vide). */
function slug(titre) {
  const base = ligne(titre, 80)
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITIQUES, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    .slice(0, 40)
    .replace(/-+$/, '');
  return base || 'action';
}

/**
 * Normalise et filtre une action brute. Renvoie `null` si elle est inexploitable.
 *
 * Règles (identiques pour tous les consommateurs) :
 *   - titre non vide et catégorie parmi les trois autorisées ;
 *   - `source` obligatoire et en http(s) — garde-fou anti-injection : une action
 *     qu'on ne peut pas remonter à une page vérifiable n'est pas publiable ;
 *   - priorité inconnue → « moyenne » plutôt que rejet.
 */
function normaliser(item) {
  if (!item || typeof item !== 'object') return null;
  const categorie = ligne(item.categorie, 40).toLowerCase();
  const titre = ligne(item.titre, 200);
  if (!titre || !CATEGORIES[categorie]) return null;
  const source = ligne(item.source, 500);
  if (!/^https?:\/\//i.test(source)) return null;
  if (/\s/.test(source)) return null; // une URL ne contient pas d'espace : texte déguisé en lien
  let priorite = ligne(item.priorite, 20).toLowerCase();
  if (!PRIORITES[priorite]) priorite = 'moyenne';
  const action = { categorie, titre, priorite, source, resume: ligne(item.resume, 600) };
  action.id = identifiant(action);
  action.slug = slug(titre);
  return action;
}

/**
 * Lit le fichier d'actions et renvoie `{ actions, raison }`.
 * `raison` est non nulle quand il n'y a rien à publier (message prêt à logguer).
 * Ne lève jamais.
 */
function lireActions(chemin) {
  if (!fs.existsSync(chemin)) {
    return { actions: [], raison: `Aucun fichier ${chemin} : pas d'action PWA cette semaine.` };
  }

  let brut;
  try {
    brut = fs.readFileSync(chemin, 'utf8');
  } catch (err) {
    return { actions: [], raison: `Lecture de ${chemin} impossible (${err.message}).` };
  }

  let parse;
  try {
    parse = JSON.parse(brut);
  } catch (err) {
    return { actions: [], raison: `${chemin} n'est pas un JSON valide (${err.message}).` };
  }

  if (!Array.isArray(parse)) {
    return { actions: [], raison: `${chemin} ne contient pas un tableau JSON.` };
  }

  const actions = parse.map(normaliser).filter(Boolean);
  if (actions.length === 0) {
    return { actions: [], raison: `${chemin} ne contient aucune action valide.` };
  }
  return { actions, raison: null };
}

/** Tri de publication : sécurité d'abord, puis priorité, puis catégorie. */
function trier(actions) {
  return [...actions].sort((a, b) =>
    PRIORITES[a.priorite].order - PRIORITES[b.priorite].order ||
    CATEGORIES[a.categorie].order - CATEGORIES[b.categorie].order ||
    a.titre.localeCompare(b.titre, 'fr')
  );
}

module.exports = { CATEGORIES, PRIORITES, clip, ligne, slug, identifiant, normaliser, lireActions, trier };
