#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════
   MAT — Vérification structurelle des feuilles de style
   Copyright (c) 2024-2026 Commune de Mézières-lez-Cléry — Licence MIT
   ════════════════════════════════════════════════════════════

   Pourquoi ce script (ADR-0015) : une accolade fermante ORPHELINE a été
   laissée dans `css/mat.css` le 1ᵉʳ août 2026 en supprimant un effet
   (« poussière de lumière » de l'été). Conséquence non évidente : le parseur
   CSS ne « saute » pas simplement le `}` surnuméraire — il consomme
   `} .amb-star` comme le prélude d'une règle qualifiée invalide, avec son
   bloc. **Une seule règle disparaît**, celle qui suit immédiatement, et tout
   le reste du fichier continue de s'appliquer normalement.

   C'est ce qui rend la faute indétectable à l'œil : la page n'est pas cassée,
   le CI ne voyait rien (il ne vérifiait que la syntaxe JS), et les tests E2E
   d'ambiance ne regardaient que la composition JS (`dataset.kind`), jamais le
   rendu. Les étoiles du ciel nocturne sont restées invisibles pendant une
   semaine (v4.52.1 → v4.60).

   Ce contrôle est volontairement SANS DÉPENDANCE et grossier : il ne valide
   pas le CSS, il vérifie seulement que les accolades s'équilibrent — le seul
   symptôme mécanique de cette classe d'erreur. Les chaînes, commentaires et
   séquences échappées sont ignorés pour ne pas produire de faux positifs.
   ════════════════════════════════════════════════════════════ */

'use strict';

const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const DOSSIER = path.join(RACINE, 'css');

// Parcourt le fichier caractère par caractère en ignorant commentaires et
// chaînes, et renvoie { erreurs: [...], profondeur } où `profondeur` doit
// valoir 0 à la fin d'un fichier bien formé.
function analyser(source) {
  const erreurs = [];
  const pile = [];
  let ligne = 1;
  let i = 0;

  while (i < source.length) {
    const c = source[i];

    if (c === '\n') { ligne++; i++; continue; }

    // Commentaire /* … */
    if (c === '/' && source[i + 1] === '*') {
      const fin = source.indexOf('*/', i + 2);
      const bloc = source.slice(i, fin === -1 ? source.length : fin + 2);
      ligne += (bloc.match(/\n/g) || []).length;
      i += bloc.length;
      continue;
    }

    // Chaîne '…' ou "…", en tenant compte des échappements
    if (c === '"' || c === "'") {
      i++;
      while (i < source.length && source[i] !== c) {
        if (source[i] === '\\') i++;
        else if (source[i] === '\n') ligne++;
        i++;
      }
      i++;
      continue;
    }

    if (c === '{') { pile.push(ligne); i++; continue; }

    if (c === '}') {
      if (pile.length === 0) {
        erreurs.push(`ligne ${ligne} : accolade fermante « } » orpheline`);
      } else {
        pile.pop();
      }
      i++;
      continue;
    }

    i++;
  }

  pile.forEach((l) => {
    erreurs.push(`ligne ${l} : accolade ouvrante « { » jamais fermée`);
  });

  return erreurs;
}

function main() {
  if (!fs.existsSync(DOSSIER)) {
    console.error(`✗ dossier introuvable : ${DOSSIER}`);
    process.exit(1);
  }

  const fichiers = fs.readdirSync(DOSSIER)
    .filter((f) => f.endsWith('.css'))
    .sort();

  if (fichiers.length === 0) {
    console.error('✗ aucune feuille de style trouvée dans css/');
    process.exit(1);
  }

  let total = 0;

  fichiers.forEach((nom) => {
    const source = fs.readFileSync(path.join(DOSSIER, nom), 'utf8');
    const erreurs = analyser(source);
    if (erreurs.length === 0) {
      console.log(`✓ css/${nom}`);
    } else {
      total += erreurs.length;
      erreurs.forEach((e) => console.error(`✗ css/${nom} — ${e}`));
    }
  });

  if (total > 0) {
    console.error(`\n${total} accolade(s) déséquilibrée(s).`);
    console.error('Une accolade orpheline fait disparaître SILENCIEUSEMENT la règle');
    console.error('qui la suit, sans casser le reste du fichier. Voir ADR-0015.');
    process.exit(1);
  }

  console.log(`\n${fichiers.length} feuille(s) de style — accolades équilibrées.`);
}

main();
