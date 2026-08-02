/* ════════════════════════════════════════════════════════════
   MAT — Guide d’arrivée des nouveaux habitants v1.0.0
   Page « Je viens d’emménager » : check-list des démarches à faire
   en arrivant à Mézières-lez-Cléry, cochable et consultable
   hors-ligne. Feature 100 % additive, sans appel réseau.
   Copyright (c) 2024-2026 Commune de Mézières-lez-Cléry — Licence MIT
   ════════════════════════════════════════════════════════════ */
(function(){
'use strict';

// ── Contenu du guide ─────────────────────────────────────────
// Pour éditer le guide : ne toucher QUE ce tableau.
//
// Un item = { id, ico, titre, texte, liens:[…] }. L’`id` sert de clé de
// cochage dans localStorage : ne jamais le renommer sans accepter que les
// habitants qui avaient coché la ligne la retrouvent décochée.
//
// Trois formes de lien :
//   { label, open:'openDechets' }  → ouvre un autre écran de l’app
//   { label, url:'https://…' }     → lien externe (nouvel onglet)
//   { label, tel:'0238456176' }    → appel téléphonique
//   { label, mail:'…@…' }          → courriel
//
// ⚠️ On PRIVILÉGIE `open` : le guide renvoie vers les écrans qui portent
// déjà l’information (déchets, associations, élus, entreprises, MEL…)
// plutôt que de la recopier. Toute duplication crée une double source
// qui divergera — c’est déjà arrivé avec la liste des associations.
var GUIDE_ETAPES = [
  {
    id:'arrivee', ico:'📦', titre:'Dès votre arrivée',
    sous:'Les démarches à lancer tout de suite',
    items:[
      {
        id:'mairie', ico:'🏛️', titre:'Passez vous présenter en mairie',
        texte:'L’équipe vous accueille et vous remet les informations utiles sur la commune. Ouverture : lundi 14h-17h30, mercredi sur rendez-vous, vendredi 8h30-11h30.',
        liens:[
          { label:'02 38 45 61 76', tel:'0238456176' },
          { label:'mairie@mezieres-lez-clery.fr', mail:'mairie@mezieres-lez-clery.fr' },
          { label:'Contacter la mairie', open:'openContact' }
        ]
      },
      {
        id:'adresse', ico:'📮', titre:'Déclarez votre changement d’adresse',
        texte:'Un téléservice unique prévient en une seule fois l’assurance maladie, les caisses de retraite, les impôts, France Travail et la CAF. Pensez aussi à votre employeur, votre banque et vos assurances.',
        liens:[
          { label:'Je change de coordonnées', url:'https://www.service-public.gouv.fr/particuliers/vosdroits/R11193' },
          { label:'Réexpédition du courrier', url:'https://www.laposte.fr/changement-adresse-demenagement-reexpedition' }
        ]
      },
      {
        id:'carte-grise', ico:'🚗', titre:'Mettez à jour votre carte grise',
        texte:'Le changement d’adresse sur le certificat d’immatriculation est obligatoire dans le mois qui suit l’emménagement. La démarche est gratuite et se fait en ligne.',
        liens:[ { label:'ants.gouv.fr', url:'https://immatriculation.ants.gouv.fr/' } ]
      },
      {
        id:'compteurs', ico:'💡', titre:'Ouvrez vos compteurs d’eau, d’électricité et de gaz',
        texte:'Contactez les fournisseurs quelques jours avant l’emménagement pour la mise en service, et relevez les index le jour de votre arrivée. L’eau potable et l’assainissement collectif sont gérés par la communauté de communes.',
        liens:[
          { label:'CCTVL — 02 38 44 59 35', tel:'0238445935' },
          { label:'ccterresduvaldeloire.fr', url:'https://www.ccterresduvaldeloire.fr/' }
        ]
      },
      {
        id:'bacs', ico:'🗑️', titre:'Demandez vos bacs gris et jaune',
        texte:'La dotation, l’échange ou la réparation des bacs se demandent auprès de la communauté de communes. Le bac gris est collecté chaque lundi matin, le bac jaune un mardi sur deux (semaines paires).',
        liens:[
          { label:'Calendrier des collectes', open:'openDechets' },
          { label:'CCTVL — 02 38 44 59 35', tel:'0238445935' }
        ]
      },
      {
        id:'dechetterie', ico:'🏭', titre:'Inscrivez-vous à la déchetterie',
        texte:'L’accès se fait par lecture automatique de plaque : l’inscription préalable est obligatoire, avec un justificatif de domicile et votre carte grise. Enregistrez la plaque SANS tiret (ex. AA123BB). Une seule inscription vaut pour tous les sites.',
        liens:[ { label:'portail-usagers.ccterresduvaldeloire.fr', url:'https://portail-usagers.ccterresduvaldeloire.fr/' } ]
      },
      {
        id:'fibre', ico:'🌐', titre:'Vérifiez votre éligibilité à la fibre',
        // ⚠️ L'opérateur du réseau départemental est Lysséo — c'est ce que dit
        // l'arbre de décision de MEL, validé par la mairie (js/mat-mel.js, 3 entrées).
        // Ne pas réintroduire « Val de Loire Fibre » : ce réseau dessert
        // l'Indre-et-Loire et le Loir-et-Cher, pas le Loiret.
        texte:'Le réseau fibre du département est géré par Lysséo. Vérifiez votre adresse, puis souscrivez auprès du fournisseur de votre choix. Pour une construction neuve, déclarez-la le plus tôt possible.',
        liens:[ { label:'lysseo.fr', url:'https://lysseo.fr' } ]
      }
    ]
  },
  {
    id:'mois', ico:'🗓️', titre:'Dans le premier mois',
    sous:'À ne pas laisser traîner',
    items:[
      {
        id:'electeur', ico:'🗳️', titre:'Inscrivez-vous sur les listes électorales',
        texte:'Possible toute l’année, au plus tard le 6ᵉ vendredi précédant un scrutin. En ligne ou en mairie, avec une pièce d’identité et un justificatif de domicile de moins de 3 mois.',
        liens:[
          { label:'S’inscrire en ligne', url:'https://www.service-public.gouv.fr/particuliers/vosdroits/R16396' },
          { label:'02 38 45 61 76', tel:'0238456176' }
        ]
      },
      {
        id:'ecole', ico:'🎒', titre:'Inscrivez vos enfants à l’école',
        texte:'L’inscription à l’école de la Forêt passe d’abord par la mairie, qui délivre le certificat d’inscription, puis par la direction de l’école. Apportez le livret de famille, un justificatif de domicile et le carnet de santé. En cas de changement d’école, joignez le certificat de radiation.',
        liens:[
          { label:'02 38 45 61 76', tel:'0238456176' },
          { label:'Demander à MEL', open:'openMel' }
        ]
      },
      {
        id:'periscolaire', ico:'🧒', titre:'Pensez au périscolaire, à la cantine et à la crèche',
        texte:'La commune dispose d’une garderie matin et soir, d’un restaurant scolaire, d’un centre de loisirs et de la crèche familiale Les Marmousets. Inscriptions et tarifs auprès de la mairie.',
        liens:[ { label:'02 38 45 61 76', tel:'0238456176' } ]
      },
      {
        id:'medecin', ico:'🏥', titre:'Déclarez un médecin traitant',
        texte:'La maison de santé du Val d’Ardoux, à Cléry-Saint-André (1 allée Dr Roland Delastre), regroupe médecins généralistes, kinés, infirmiers, dentistes, podologue, orthophoniste, ostéopathe et psychologue.',
        liens:[ { label:'Prendre rendez-vous', url:'https://www.doctolib.fr/' } ]
      },
      {
        id:'spanc', ico:'🚰', titre:'Vérifiez votre assainissement',
        texte:'Si votre logement n’est pas raccordé au tout-à-l’égout, votre installation individuelle relève du SPANC, qui en contrôle le bon fonctionnement et vous accompagne en cas de travaux.',
        liens:[ { label:'CCTVL — 02 38 44 59 35', tel:'0238445935' } ]
      },
      {
        id:'recensement', ico:'🎖️', titre:'Recensez vos jeunes de 16 ans',
        texte:'Obligatoire dans les 3 mois qui suivent le 16ᵉ anniversaire, en mairie avec une pièce d’identité et le livret de famille. L’attestation est demandée pour le bac et le permis de conduire.',
        liens:[ { label:'02 38 45 61 76', tel:'0238456176' } ]
      }
    ]
  },
  {
    id:'vivre', ico:'🌳', titre:'Bien vivre à Mézières',
    sous:'À découvrir sans urgence',
    items:[
      {
        id:'assos', ico:'🤝', titre:'Découvrez les associations',
        texte:'Comité des fêtes, randonnée, trial vélo, parents d’élèves… La vie associative est le moyen le plus simple de rencontrer du monde en arrivant.',
        liens:[ { label:'Voir les associations', open:'openAssociations' } ]
      },
      {
        id:'entreprises', ico:'🛠️', titre:'Les entreprises et artisans du village',
        texte:'L’annuaire des professionnels installés sur la commune, pour trouver un artisan ou un commerce près de chez vous.',
        liens:[ { label:'Voir l’annuaire', open:'openEntreprises' } ]
      },
      {
        id:'bus', ico:'🚌', titre:'Le bus Rémi, ligne 8',
        texte:'La ligne 8 dessert la commune avec les arrêts Mairie et Le Bréau. Horaires par jour et par arrêt dans l’application.',
        liens:[ { label:'Voir les horaires', open:'openRemi' } ]
      },
      {
        id:'elus', ico:'🏛️', titre:'Vos élus et le conseil municipal',
        texte:'Le trombinoscope des élus, leurs délégations et les commissions — pour savoir qui contacter selon votre sujet.',
        liens:[ { label:'Voir le conseil municipal', open:'openConseil' } ]
      },
      {
        id:'urbanisme', ico:'🏗️', titre:'Avant d’engager des travaux',
        texte:'Clôture, abri de jardin, extension, piscine, ravalement de façade : la plupart des travaux demandent au minimum une déclaration préalable, et les règles dépendent de la zone de votre terrain.',
        liens:[
          { label:'Demander à MEL', open:'openMel' },
          { label:'Le dossier PLUi-H-D', open:'openPlui' }
        ]
      },
      {
        id:'opah', ico:'🔧', titre:'Les aides à la rénovation',
        texte:'La communauté de communes accompagne les travaux d’amélioration de l’habitat dans le cadre de l’OPAH. SOLIHA vous conseille gratuitement sur les aides mobilisables.',
        liens:[ { label:'SOLIHA — 02 38 77 87 21', tel:'0238778721' } ]
      }
    ]
  },
  {
    id:'informe', ico:'🔔', titre:'Rester informé',
    sous:'Pour ne rien manquer de la vie communale',
    items:[
      {
        id:'notifs', ico:'🔔', titre:'Activez les notifications',
        texte:'Actualités de la mairie, rappels de sortie des bacs, alertes météo et sécheresse : vous choisissez ce que vous recevez, et vous pouvez tout désactiver à tout moment.',
        liens:[ { label:'Actualités et notifications', open:'openNotifs' } ]
      },
      {
        id:'agenda', ico:'📅', titre:'Suivez l’agenda communal',
        texte:'Fêtes, réunions publiques, animations et sorties près de chez vous.',
        liens:[ { label:'Voir l’agenda', open:'openAgenda' } ]
      },
      {
        id:'signal', ico:'📍', titre:'Signalez un problème',
        texte:'Éclairage en panne, dépôt sauvage, nid-de-poule : le signalement part directement à la mairie et vous êtes notifié de son avancement.',
        liens:[ { label:'Faire un signalement', open:'openSignal' } ]
      },
      {
        id:'idees', ico:'💡', titre:'Proposez une idée',
        texte:'La boîte à idées est ouverte à tous. Ce guide est né comme ça : c’est un habitant qui l’a suggéré.',
        liens:[ { label:'Proposer une idée', open:'openIdees' } ]
      }
    ]
  }
];

var DONE_KEY = 'mat_guide_arrivee_done';

// ── Persistance du cochage ───────────────────────────────────
// Best-effort : en navigation privée ou stockage plein, le guide
// reste consultable, simplement sans mémoire.
function _readDone(){
  try {
    var raw = localStorage.getItem(DONE_KEY);
    var o = raw ? JSON.parse(raw) : null;
    return (o && typeof o === 'object') ? o : {};
  } catch(_) { return {}; }
}

function _writeDone(o){
  try { localStorage.setItem(DONE_KEY, JSON.stringify(o)); } catch(_){}
}

function _allItems(){
  return GUIDE_ETAPES.reduce(function(acc, e){
    return acc.concat(e.items.map(function(it){ return e.id + ':' + it.id; }));
  }, []);
}

function _esc(s){
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── Rendu d’un lien (puce cliquable) ─────────────────────────
var CHIP = 'display:inline-flex;align-items:center;gap:5px;background:var(--mist);color:var(--forest);'
  + 'border:1px solid var(--sage);border-radius:999px;padding:5px 11px;font-size:0.72rem;font-weight:800;'
  + 'text-decoration:none;font-family:inherit;cursor:pointer;line-height:1.3;-webkit-tap-highlight-color:transparent';

function _renderLien(l){
  if(l.open){
    // Le nom de fonction vient du tableau ci-dessus, jamais d’une saisie :
    // _guideGo revérifie malgré tout que la globale existe et est appelable.
    return '<button type="button" onclick="_guideGo(&#39;' + _esc(l.open) + '&#39;)" style="' + CHIP + '">'
      + _esc(l.label) + ' →</button>';
  }
  if(l.url){
    return '<a href="' + _esc(l.url) + '" target="_blank" rel="noopener noreferrer" style="' + CHIP + '">'
      + _esc(l.label) + ' ↗</a>';
  }
  if(l.tel){
    return '<a href="tel:' + _esc(l.tel) + '" style="' + CHIP + '">📞 ' + _esc(l.label) + '</a>';
  }
  if(l.mail){
    return '<a href="mailto:' + _esc(l.mail) + '" style="' + CHIP + '">✉️ ' + _esc(l.label) + '</a>';
  }
  return '';
}

// ── Rendu d’un item de la check-list ─────────────────────────
function _renderItem(etape, it, done){
  var key = etape.id + ':' + it.id;
  var ok = !!done[key];
  var box = 'width:26px;height:26px;flex-shrink:0;border-radius:8px;cursor:pointer;font-size:0.85rem;'
    + 'font-weight:900;line-height:1;display:flex;align-items:center;justify-content:center;font-family:inherit;'
    + '-webkit-tap-highlight-color:transparent;'
    + (ok ? 'background:var(--leaf);border:2px solid var(--leaf);color:#fff'
          : 'background:transparent;border:2px solid var(--sage);color:transparent');

  return '<div style="display:flex;gap:11px;align-items:flex-start;background:var(--card);'
    + 'border:1px solid ' + (ok ? 'var(--sage)' : 'var(--border)') + ';'
    + (ok ? 'border-left:4px solid var(--sage);' : '')
    + 'border-radius:14px;padding:12px 13px;margin-bottom:9px">'
    + '<button type="button" role="checkbox" aria-checked="' + (ok ? 'true' : 'false') + '" '
    +   'aria-label="' + (ok ? 'Décocher' : 'Marquer comme fait') + ' : ' + _esc(it.titre) + '" '
    +   'onclick="_guideToggle(&#39;' + _esc(key) + '&#39;)" style="' + box + '">✓</button>'
    + '<div style="flex:1;min-width:0">'
    +   '<div style="font-size:0.9rem;font-weight:900;line-height:1.35;'
    +     (ok ? 'color:var(--muted);text-decoration:line-through' : 'color:var(--forest)') + '">'
    +     '<span aria-hidden="true">' + _esc(it.ico) + '</span> ' + _esc(it.titre) + '</div>'
    +   '<div style="font-size:0.8rem;color:var(--muted);line-height:1.6;margin-top:5px">' + _esc(it.texte) + '</div>'
    +   (it.liens && it.liens.length
        ? '<div style="display:flex;flex-wrap:wrap;gap:7px;margin-top:10px">'
          + it.liens.map(_renderLien).join('') + '</div>'
        : '')
    + '</div>'
  + '</div>';
}

// ── Rendu complet ────────────────────────────────────────────
// openOv AVANT tout getElementById : l’overlay est lazy (template
// data-lazy-ov), son contenu n’existe qu’après hydratation.
function _render(){
  var el = document.getElementById('guide-etapes');
  if(!el) return;

  var done = _readDone();
  var all = _allItems();
  var n = all.filter(function(k){ return done[k]; }).length;
  var pct = all.length ? Math.round((n / all.length) * 100) : 0;

  var head = '<div style="background:var(--mist);border-radius:14px;padding:14px 15px;margin-bottom:18px">'
    + '<div style="font-size:0.95rem;font-weight:900;color:var(--forest);line-height:1.35">Bienvenue à Mézières-lez-Cléry <span aria-hidden="true">👋</span></div>'
    + '<p style="font-size:0.8rem;color:var(--leaf);line-height:1.6;margin:7px 0 0">Voici les démarches à prévoir en arrivant dans la commune. Cochez-les au fur et à mesure : la liste est gardée sur votre téléphone et reste consultable sans connexion.</p>'
    + '<div style="height:8px;background:var(--card);border-radius:999px;overflow:hidden;margin-top:12px">'
    +   '<div style="height:100%;width:' + pct + '%;background:var(--leaf);border-radius:999px;transition:width 0.25s"></div>'
    + '</div>'
    + '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:8px">'
    +   '<div role="status" style="font-size:0.72rem;font-weight:800;color:var(--forest)">'
    +     n + ' / ' + all.length + ' démarche' + (n > 1 ? 's' : '') + ' faite' + (n > 1 ? 's' : '') + '</div>'
    +   (n ? '<button type="button" onclick="_guideReset()" style="background:none;border:none;padding:0;'
        + 'font-family:inherit;font-size:0.72rem;font-weight:800;color:var(--leaf);text-decoration:underline;'
        + 'cursor:pointer">Tout décocher</button>' : '')
    + '</div>'
    + '</div>';

  var corps = GUIDE_ETAPES.map(function(etape){
    return '<section style="margin-bottom:22px">'
      + '<h3 style="font-size:1.05rem;font-weight:900;color:var(--forest);margin:0 0 3px">'
      +   '<span aria-hidden="true">' + _esc(etape.ico) + '</span> ' + _esc(etape.titre) + '</h3>'
      + '<div style="font-size:0.72rem;color:var(--muted);margin:0 0 11px">' + _esc(etape.sous) + '</div>'
      + etape.items.map(function(it){ return _renderItem(etape, it, done); }).join('')
      + '</section>';
  }).join('');

  var pied = '<div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:14px;text-align:center">'
    + '<div style="font-size:0.8rem;color:var(--muted);line-height:1.6">Une question qui n’est pas dans cette liste ?</div>'
    + '<button type="button" onclick="_guideGo(&#39;openMel&#39;)" style="margin-top:10px;width:100%;background:var(--forest);'
    + 'color:#fff;border:none;border-radius:12px;padding:11px;font-family:inherit;font-size:0.82rem;font-weight:800;'
    + 'cursor:pointer">👩‍💼 Demander à MEL</button>'
    + '</div>';

  el.innerHTML = head + corps + pied;
}

// ── Interactions (appelées depuis le HTML généré) ────────────
window._guideToggle = function(key){
  var done = _readDone();
  if(done[key]) delete done[key]; else done[key] = 1;
  _writeDone(done);
  _render();
};

window._guideReset = function(){
  _writeDone({});
  _render();
};

window._guideGo = function(fn){
  var f = window[fn];
  if(typeof f === 'function') f();
};

// ── Ouverture de la page ─────────────────────────────────────
window.openGuideArrivee = function(){
  if(typeof trackStat === 'function'){ try { trackStat('guide-arrivee'); } catch(_){} }
  openOv('guide');
  _render();
};

})();
