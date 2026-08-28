/* ════════════════════════════════════════════════════════════
   MAT — Plan du site v1.0.0
   RGAA 12.1 (deuxième système de navigation), 12.3 (plan du site
   pertinent) et 12.4 (atteignable de la même manière depuis chaque écran).

   ⚠️ LES INTITULÉS NE SONT PAS ÉCRITS ICI. Ils sont lus dans les écrans
   eux-mêmes, à l'ouverture — chaque `.ov` porte son titre dans son
   `.panel-title`. Une liste recopiée à la main se périmerait au premier
   intitulé modifié, en silence : l'habitant verrait un nom, l'écran en
   afficherait un autre, et le critère 12.3 retomberait sans que rien ne le
   signale. C'est la même classe d'erreur que les doubles sources qui ont
   déjà mordu ce dépôt (associations, fibre, arbre MEL).

   Ce qui EST déclaré ici, c'est le classement : quel écran dans quelle
   rubrique. Un écran ajouté au fil du temps n'y sera pas — c'est pourquoi
   `tests/e2e/plan-du-site.spec.js` échoue si un écran n'est ni classé ni
   explicitement écarté. Oublier devient impossible en silence.
   ════════════════════════════════════════════════════════════ */

// Classement des écrans par rubrique. Le vocabulaire reprend celui de
// l'accueil : un habitant ne doit pas avoir à apprendre un second rangement.
const PLAN_RUBRIQUES = [
  ['Démarches et services',      ['mel', 'guide', 'carte3d', 'docs', 'plui']],
  ['Actualité et calendrier',    ['notifs', 'agenda', 'events-locaux', 'meteo', 'dechets', 'remi']],
  ['Participez',                 ['idees', 'sondages', 'photos', 'contact']],
  ['Signalements et contacts',   ['signal', 'suivi', 'bug', 'nums']],
  ['Vie locale',                 ['assoc', 'subvention', 'entreprises', 'carburant']],
  ['La commune',                 ['conseil', 'majordome']],
  ['L’application',              ['accessibilite', 'rgpd', 'changelog']]
];

/* ⛔ OUVRIR UN ÉCRAN, CE N'EST PAS `openOv(id)`.
   La v4.93 a livré ce plan en appelant `openOv` directement : les écrans
   s'ouvraient VIDES. `openOv` ne pose que la coquille — c'est la fonction
   dédiée de chaque écran qui va chercher le contenu. `openConseil()` fait
   `openOv('conseil')` PUIS `buildTrombi()` ; sans le second, le trombinoscope
   ne se construit jamais et l'habitant voit un panneau nu. Signalé en
   production par le porteur, sur « Conseil municipal » et « Je viens
   d'emménager ».
   ⚠️ Ces fonctions sont en plus ENVELOPPÉES pour les statistiques
   (`window.openMel = () => { _track('mel'); _origOpenMel(); }`) : il faut
   appeler `window[nom]` au moment du clic, jamais garder une référence prise
   au chargement, sinon on court-circuite le comptage.
   Le nom est déclaré ici pour chaque écran. `tests/e2e/plan-du-site.spec.js`
   ouvre CHAQUE lien et vérifie que l'écran se remplit vraiment — c'est ce
   contrôle-là qui manquait. */
const PLAN_OUVERTURE = {
  'mel': 'openMel',                     'guide': 'openGuideArrivee',
  'carte3d': 'matOuvrirCarte3D',        'docs': 'openDocs',
  'plui': 'openPlui',                   'notifs': 'openNotifs',
  'agenda': 'openAgenda',               'events-locaux': 'openEventsLocaux',
  'meteo': 'openMeteo',                 'dechets': 'openDechets',
  'remi': 'openRemi',                   'idees': 'openIdees',
  'sondages': 'openSondages',           'photos': 'openPhotos',
  'contact': 'openContact',             'signal': 'openSignal',
  'bug': 'openBug',                     'nums': 'openNums',
  'assoc': 'openAssociations',          'subvention': 'openSubvention',
  'entreprises': 'openEntreprises',     'conseil': 'openConseil',
  'majordome': 'openMajordome',         'accessibilite': 'openAccessibilite',
  'rgpd': 'openRgpd',                   'changelog': 'openChangelog',
  'carburant': 'openCarburant',
  // Certaines fonctions attendent un argument : on le déclare avec elles.
  // `openSuivi()` sans argument reste bloqué sur « Chargement… » — c'est
  // exactement le genre de vide que ce plan a livré en v4.93.
  'suivi': ['openSuivi', 'signalements']
};

/* Ouvre un écran comme le ferait une tuile de l'accueil. */
function _ouvrirEcran(id) {
  const decl = PLAN_OUVERTURE[id];
  const nom = Array.isArray(decl) ? decl[0] : decl;
  const args = Array.isArray(decl) ? decl.slice(1) : [];
  const fn = nom && window[nom];
  if (typeof fn === 'function') { fn.apply(null, args); return; }
  openOv(id);
}

// Écrans volontairement absents du plan, avec leur raison. Le test exige que
// tout écran soit ici ou dans une rubrique — jamais nulle part.
const PLAN_ECARTES = {
  'actu':     'écran de détail : ne s’ouvre jamais seul, toujours depuis une actualité',
  'event':    'écran de détail : ne s’ouvre jamais seul, toujours depuis un événement de l’agenda',
  'plansite': 'c’est cet écran lui-même'
};

/* Lit le titre d'un écran là où il vit : dans son propre `.panel-title`.
   Les écrans sont hydratés paresseusement (ADR : `template[data-lazy-ov]`),
   donc on regarde dans le template quand le panneau n'est pas encore posé. */
function _titreEcran(id) {
  const ov = document.getElementById('ov-' + id);
  if (!ov) return null;
  const tpl = ov.querySelector('template[data-lazy-ov]');
  const source = tpl ? tpl.content : ov;
  const t = source.querySelector('.panel-title');
  return t ? t.textContent.trim() : null;
}

/* Recense les écrans réellement présents dans la page. Sert au rendu et au
   test de complétude. */
function _tousLesEcrans() {
  return [...document.querySelectorAll('.ov[id^="ov-"]')]
    .map(ov => ov.id.replace(/^ov-/, ''))
    .filter(id => _titreEcran(id));
}

function construirePlanSite() {
  const corps = document.getElementById('plansite-body');
  if (!corps) return;

  // On repart du chapeau : la fonction doit pouvoir être rejouée sans empiler.
  corps.querySelectorAll('[data-plan]').forEach(n => n.remove());

  const frag = document.createDocumentFragment();
  PLAN_RUBRIQUES.forEach(([rubrique, ids]) => {
    const entrees = ids
      .map(id => ({ id: id, titre: _titreEcran(id) }))
      .filter(e => e.titre);
    if (!entrees.length) return;

    const h = document.createElement('h2');
    h.setAttribute('data-plan', '');
    h.className = 'plan-rubrique';
    h.textContent = rubrique;
    frag.appendChild(h);

    const ul = document.createElement('ul');
    ul.setAttribute('data-plan', '');
    ul.className = 'plan-liste';
    entrees.forEach(e => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.className = 'plan-lien';
      b.type = 'button';
      b.textContent = e.titre;
      b.addEventListener('click', () => {
        closeOv('plansite');
        // Laisser la fermeture se jouer avant d'ouvrir : sinon les deux
        // transitions se chevauchent et l'écran cible s'ouvre invisible.
        setTimeout(() => { try { _ouvrirEcran(e.id); } catch (_) {} }, 220);
      });
      li.appendChild(b);
      ul.appendChild(li);
    });
    frag.appendChild(ul);
  });
  corps.appendChild(frag);
}

function openPlanSite() {
  openOv('plansite');
  // openOv hydrate le template : le corps n'existe qu'après.
  construirePlanSite();
}
