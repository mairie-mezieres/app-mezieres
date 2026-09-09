const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

/* ════════════════════════════════════════════════════════════
   École de la Forêt & services périscolaires — garde-fous

   Source : règlement intérieur scolaire et périscolaire 2026-2027, remis par
   la mairie en septembre 2026.

   Ces tests lisent les fichiers sur disque, sans navigateur : ce sont eux qui
   empêchent une régression d'entrer dans le dépôt. Trois propriétés, chacune
   pour une raison vécue.

   1. AUCUN NOM DE PERSONNEL. L'arbre de décision citait le nom de la
      directrice de l'école et le prénom de la directrice du périscolaire. Ces
      personnes changent d'une rentrée à l'autre, et rien ne le signalait : un
      nom faux est pire qu'une fonction juste. On écrit « la direction de
      l'école », « l'enseignante de votre enfant ».

   2. AUCUN MONTANT. `js/mat-mel.js` a affiché « Tarifs 2022/2023 : 3,80 € »
      jusqu'en septembre 2026 — quatre ans de retard, invisibles, parce que les
      tarifs sont votés chaque année par le conseil municipal et calculés sur
      le quotient familial CAF. Ils vivent sur le portail parents, pas dans le
      code. Même règle que la salle communale (ADR-0013) et la crèche.

   3. LES DEUX COPIES DE L'ARBRE RESTENT EN PHASE. `data/mel-tree.json` est
      édité par la mairie depuis l'admin ; `js/mat-mel.js` en porte un doublon
      volontaire, qui sert de repli. Une divergence entre les deux est la
      classe de bug la plus fréquente de ce dépôt (associations, fibre, crèche).
   ════════════════════════════════════════════════════════════ */

const RACINE = path.join(__dirname, '..', '..');
const lire = (f) => fs.readFileSync(path.join(RACINE, f), 'utf8');

const ARBRE = JSON.parse(lire('data/mel-tree.json'));
const MAT_MEL = lire('js/mat-mel.js');
const GUIDE = lire('js/mat-guide-arrivee.js');
const CORPUS = JSON.parse(lire('data/saviez-vous.json'));

/* Les quatre entrées « enfance » issues du règlement. */
const FICHES = ['ecole', 'periscolaire', 'mercredi', 'cantine'];

const fiche = (id) => ARBRE.enfance.questions.find((q) => q.id === id);

/* ⚠️ Le détecteur ne contient AUCUN nom — écrire la liste des patronymes à
   proscrire serait encore les stocker, et c'est exactement ce qu'on interdit.
   On détecte donc la FORME d'une identité, ce qui a l'avantage d'attraper
   aussi les noms qu'on ne connaît pas encore :

     A. une civilité suivie d'un mot capitalisé — « Mme Untel » ;
     B. un intitulé de poste suivi d'un mot capitalisé — « la directrice du
        périscolaire Prénom » (le cas réel n'avait pas de civilité) ; les
        enchaînements légitimes (« la direction de l'école ») passent, parce
        qu'ils continuent en minuscules ;
     C. dans les textes des fiches, un mot en CAPITALES d'au moins quatre
        lettres qui ne soit pas un sigle connu — c'est ainsi que le règlement
        écrit les patronymes. */
const CIVILITE = /\b(?:Mme|Mlle|Mr|M\.)\s*[A-ZÉÈÀÂÎÔÛ]/;

const POSTES = /\b(?:directeur|directrice|enseignante?|animat(?:eur|rice)|atsem|cuisini(?:er|ère)|président[e]?|inspect(?:eur|rice))s?\b/gi;
/* Noms propres légitimes au voisinage d'un intitulé de poste : des lieux et
   des institutions, jamais une personne. Tout autre mot capitalisé qui suit
   un poste est traité comme une identité. */
const PROPRES_ADMIS = new Set(['Mézières', 'Cléry', 'Saint', 'André', 'Meung',
  'Loire', 'Val', 'Ardoux', 'Beaugency', 'Beauce', 'Romaine', 'Mareau', 'Prés',
  'Muids', 'Bourg', 'Forêt', 'Marmousets', 'Accueil', 'Communauté', 'Communes',
  'Terres', 'Éducation', 'École', 'Nationale', 'Trésor', 'Public', 'Maréchal',
  'Foch', 'Barre', 'CCTVL', 'DASEN', 'SIVU', 'LAEP', 'CAF', 'CNAF', 'PAI', 'APC']);

/* Renvoie les identités apparentes trouvées dans un texte. Aucun patronyme
   n'est écrit ici : on cherche la FORME d'un nom après un intitulé de poste. */
function identitesApparentes(texte) {
  const trouves = [];
  POSTES.lastIndex = 0;
  let m;
  while ((m = POSTES.exec(texte)) !== null) {
    const debut = m.index + m[0].length;
    // La fenêtre est complétée jusqu'à la fin du mot qu'elle coupe : tronqué à
    // « M », « Mézières » n'était plus reconnu comme un lieu et passait pour
    // une initiale. Puis on s'arrête à la fin de phrase — « … le président.
    // Une commune … » ne nomme personne, la majuscule y ouvre une phrase.
    const suite = (texte.slice(debut, debut + 40)
      + (texte.slice(debut + 40).match(/^[A-Za-zÀ-ÿ'’-]*/) || [''])[0])
      .split(/[.!?;:\n]/)[0];
    // ⚠️ `\w` ignore les accents en JavaScript : sans cette classe explicite,
    // « Mézières » se réduisait au seul « M », introuvable dans l'allowlist.
    for (const mot of suite.match(/[A-ZÉÈÀÂÎÔÛÇ][A-Za-zÀ-ÿ'’-]*/g) || []) {
      if (!PROPRES_ADMIS.has(mot)) trouves.push(`${m[0]} … ${mot}`);
    }
  }
  return trouves;
}
/* Sigles admis dans les fiches enfance. Aucun n'est un nom de personne. */
const SIGLES = new Set(['APC', 'PAI', 'CAF', 'CNAF', 'ALSH', 'SIVU', 'LAEP',
  'CCTVL', 'DASEN', 'CM1', 'CM2', 'GS', 'CP', 'CE1', 'CE2', 'PS', 'MS', 'EPS']);

test.describe('École & périscolaire — le règlement 2026-2027', () => {

  test('les quatre fiches enfance existent dans l’arbre éditable', () => {
    for (const id of FICHES) {
      expect(fiche(id), `fiche « ${id} » absente de data/mel-tree.json`).toBeTruthy();
      expect(fiche(id).directAnswer.text.trim().length).toBeGreaterThan(80);
    }
  });

  test('aucune identité de personne n’est stockée', () => {
    // Le fichier ENTIER, commentaires compris : un nom en commentaire est un
    // nom stocké, et il ressortira à la première relecture qui le prend pour
    // une source. Ce test a échoué sur le commit qui l'a introduit, pour
    // exactement cette raison.
    // Les fichiers TELS QU'ILS SONT SUR DISQUE : `JSON.stringify` échappe les
    // accents (« Mézières » → « Mézières »), ce qui réduisait chaque
    // nom propre accentué à son initiale et faisait rougir le détecteur à tort.
    const sources = {
      'data/mel-tree.json': lire('data/mel-tree.json'),
      'js/mat-mel.js': MAT_MEL,
      'js/mat-guide-arrivee.js': GUIDE,
      'data/saviez-vous.json': lire('data/saviez-vous.json')
    };
    for (const [nom, contenu] of Object.entries(sources)) {
      expect(contenu, `${nom} nomme une personne (civilité + nom)`).not.toMatch(CIVILITE);
      expect(identitesApparentes(contenu), `${nom} nomme une personne après un intitulé de poste`)
        .toEqual([]);
    }
  });

  test('les fiches enfance ne portent aucun patronyme en capitales', () => {
    for (const id of FICHES) {
      const t = fiche(id).directAnswer.text;
      const capitales = (t.match(/\b[A-ZÉÈÀÂÎÔÛ]{4,}\b/g) || [])
        .filter((mot) => !SIGLES.has(mot));
      expect(capitales, `la fiche « ${id} » porte un mot en capitales non reconnu`)
        .toEqual([]);
    }
  });

  test('le détecteur d’identité ne verdit pas à tort', () => {
    // Un contrôle qui ne mesure rien ne rougit pas : il verdit. On lui soumet
    // les deux formes réellement rencontrées dans l'arbre avant la v4.108.
    expect('joindre la directrice Mme Untel').toMatch(CIVILITE);
    expect(identitesApparentes('auprès de la directrice du périscolaire Prenom')).not.toEqual([]);
    expect(identitesApparentes('l’enseignante des PS/MS Prenom Nom')).not.toEqual([]);
    // Et les formulations légitimes doivent passer.
    expect(identitesApparentes('adressez-vous à la direction de l’école')).toEqual([]);
    expect(identitesApparentes('la directrice du service périscolaire')).toEqual([]);
    expect(identitesApparentes(
      'l’inspectrice de l’Éducation nationale de la circonscription')).toEqual([]);
  });

  test('les fiches désignent les personnes par leur fonction', () => {
    expect(fiche('ecole').directAnswer.text).toMatch(/direction de l’école|direction de l'école/);
  });

  test('aucun montant n’est écrit dans les fiches enfance', () => {
    // Un tarif dans le code est une double source vouée à diverger : ils sont
    // votés chaque année et calculés sur le quotient familial CAF.
    for (const id of FICHES) {
      const t = fiche(id).directAnswer.text;
      expect(t, `la fiche « ${id} » annonce un montant`).not.toMatch(/\d+\s*[.,]?\d*\s*€/);
      expect(t, `la fiche « ${id} » annonce un montant`).not.toMatch(/euros?/i);
    }
    // Et le tarif périmé qui a vécu quatre ans dans le repli ne revient pas.
    expect(MAT_MEL).not.toMatch(/3,80\s*€/);
    expect(MAT_MEL).not.toMatch(/2022\s*\/\s*2023/);
  });

  test('le principe de tarification est dit, à défaut du montant', () => {
    for (const id of ['periscolaire', 'mercredi', 'cantine']) {
      expect(fiche(id).directAnswer.text).toMatch(/quotient familial CAF/);
      expect(fiche(id).directAnswer.text).toMatch(/délibération du conseil municipal/);
    }
  });

  test('les horaires sont ceux du règlement', () => {
    const ecole = fiche('ecole').directAnswer.text;
    expect(ecole).toMatch(/8h30 à 11h45/);
    expect(ecole).toMatch(/13h45 à 16h30/);
    expect(ecole).toMatch(/lundi, mardi, jeudi et vendredi/);
    expect(ecole).toMatch(/pas de classe le mercredi/);
    // L'accueil commence dix minutes avant la classe : 8h20 et 13h35.
    expect(ecole).toMatch(/8h20/);
    expect(ecole).toMatch(/13h35/);
    // L'arbre annonçait « ouvre à 8h20 et 13h30 » : l'après-midi est à 13h45.
    expect(ecole).not.toMatch(/13h30/);

    expect(fiche('periscolaire').directAnswer.text).toMatch(/7h30 à 8h20/);
    expect(fiche('periscolaire').directAnswer.text).toMatch(/16h30 à 18h30/);
    expect(fiche('mercredi').directAnswer.text).toMatch(/7h30 à 18h00/);
    expect(fiche('cantine').directAnswer.text).toMatch(/11h45 à 13h30/);
  });

  test('le portail parents est cité en https, dans les trois fiches concernées', () => {
    for (const id of ['periscolaire', 'mercredi', 'cantine']) {
      const liens = fiche(id).directAnswer.links.map((l) => l.url || '');
      expect(liens, `la fiche « ${id} » n’offre pas le portail parents`)
        .toContain('https://parents.logiciel-enfance.fr/mezieres-lez-clery');
    }
  });

  test('les deux copies de l’arbre restent en phase', () => {
    // `js/mat-mel.js` porte un doublon volontaire de `data/mel-tree.json`. Une
    // divergence est silencieuse : le repli sert un texte que personne ne relit.
    for (const id of FICHES) {
      const texte = fiche(id).directAnswer.text;
      expect(MAT_MEL, `js/mat-mel.js diverge de l’arbre sur la fiche « ${id} »`)
        .toContain(texte);
    }
  });

  test('le guide d’arrivée renvoie au portail parents et au service enfance', () => {
    expect(GUIDE).toContain('https://parents.logiciel-enfance.fr/mezieres-lez-clery');
    expect(GUIDE).toMatch(/0967280120/);
    expect(GUIDE).toMatch(/L’Accueil enchanté/);
  });

  test('le corpus « Le saviez-vous ? » ne contredit plus le règlement', () => {
    const par = Object.fromEntries(CORPUS.entrees.map((e) => [e.id, e]));
    // L'entrée « fiches à déposer en mairie avant le 30 juin » décrivait une
    // procédure supprimée par le portail parents : elle a été remplacée.
    expect(par['inscriptions-30-juin']).toBeUndefined();
    expect(par['inscriptions-portail-parents']).toBeTruthy();
    expect(par['inscriptions-portail-parents'].reponse).toBe(false);
    // L'ancien horaire d'ouverture de l'après-midi ne traîne plus.
    expect(par['ecole-horaires-fin'].explication).not.toMatch(/13 h 30/);
    expect(par['ecole-horaires-fin'].explication).toMatch(/13 h 45/);
    // Toute entrée scolaire issue du règlement le cite comme source.
    for (const id of ['ecole-quatre-jours', 'ecole-apc', 'ecole-portable',
                      'ecole-echarpe', 'ecole-medicament', 'cantine-midi-ferme',
                      'periscolaire-gouter', 'alsh-noel']) {
      expect(par[id], `entrée « ${id} » absente du corpus`).toBeTruthy();
      expect(par[id].source).toMatch(/règlement intérieur scolaire et périscolaire 2026-2027/);
    }
  });
});
