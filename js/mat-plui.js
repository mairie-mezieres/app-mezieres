/* ════════════════════════════════════════════════════════════
   MAT — Grand dossier PLUi-H-D v1.1.0
   Page dédiée au Plan Local d’Urbanisme intercommunal (Habitat +
   Déplacements) porté par la CCTVL. Feature 100 % additive.

   v1.1.0 — la liste des documents officiels n’est plus écrite en dur :
   elle vient de GET /docs/plui et s’administre depuis le tableau de bord
   (onglet 📄 Documents). Le reste de la page — frise, textes, moyens de
   participer — reste embarqué : il change au rythme d’un commit, pas
   d’une décision de la mairie.
   Copyright (c) 2024-2026 Commune de Mézières-lez-Cléry — Licence MIT
   ════════════════════════════════════════════════════════════ */
(function(){
'use strict';

// ── Frise chronologique ──────────────────────────────────────
// Pour faire avancer le dossier : changer ’current’ de ligne (et passer
// les précédentes à ’done’). statut : ’done’ | ’current’ | ’todo’.
var PLUI_TIMELINE = [
  { statut:'done',    date:'Fin 2021',                    label:'Lancement de l’élaboration' },
  { statut:'done',    date:'Printemps 2026',              label:'Relance avec les bureaux Terr&Am et IEA' },
  { statut:'done',    date:'1er juin 2026',               label:'Formation des élus' },
  { statut:'done',    date:'15 juin 2026',                label:'Mise à jour du diagnostic' },
  { statut:'done',    date:'23 juin → 8 juillet 2026', label:'Permanences avec les communes' },
  { statut:'current', date:'8 septembre 2026',            label:'COPIL : restitution du PADD modifié' },
  { statut:'todo',    date:'22 septembre 2026',           label:'Réunion de présentation des modifications' },
  { statut:'todo',    date:'Fin 2028',                    label:'Approbation prévue du PLUi-H-D' }
];

// ── Documents officiels ──────────────────────────────────────
// Administrés depuis le tableau de bord (onglet 📄 Documents → « Documents du
// PLUi-H-D »). Chaque entrée : { id, titre, date (AAAA-MM-JJ), url }.
// Ce tableau n’est plus une source à éditer : c’est le miroir local de
// GET /docs/plui, réhydraté depuis localStorage au démarrage.
var PLUI_DOCS = [];

var SEEN_KEY  = 'mat_plui_docs_seen';
var CACHE_KEY = 'mat_plui_docs_cache';

// La page doit rester consultable hors connexion — c’est sa promesse depuis le
// premier jour. On garde donc une copie locale de la dernière liste reçue :
// sans réseau, on affiche celle-ci plutôt qu’un écran vide.
function _readCache(){
  try {
    var raw = localStorage.getItem(CACHE_KEY);
    var arr = raw ? JSON.parse(raw) : null;
    return Array.isArray(arr) ? arr : [];
  } catch(_) { return []; }
}

function _writeCache(docs){
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(docs)); } catch(_){}
}

PLUI_DOCS = _readCache();

// Rafraîchit la liste depuis le backend. Silencieux en cas d’échec : le cache
// prend le relais. Renvoie une promesse pour que openPlui() puisse re-rendre.
function _fetchDocs(){
  var api = (typeof window !== 'undefined' && window.MAT_API) || '';
  if(!api) return Promise.resolve(PLUI_DOCS);
  return fetch(api + '/docs/plui', { cache:'no-store' })
    .then(function(r){ return r.json(); })
    .then(function(d){
      if(!d || !Array.isArray(d.docs)) return PLUI_DOCS;
      PLUI_DOCS = d.docs;
      _writeCache(PLUI_DOCS);
      return PLUI_DOCS;
    })
    .catch(function(){ return PLUI_DOCS; });
}

// Clé de fraîcheur : date du document le plus récent + nombre de documents.
// Change dès qu’un document est ajouté → le badge réapparaît.
function _latestDocKey(){
  if(!PLUI_DOCS.length) return null;
  var latest = PLUI_DOCS.map(function(d){ return String(d.date || ''); }).sort().slice(-1)[0];
  return latest + '|' + PLUI_DOCS.length;
}

function hasNewPluiDoc(){
  var k = _latestDocKey();
  if(!k) return false;
  try { return localStorage.getItem(SEEN_KEY) !== k; } catch(_) { return true; }
}

function _markPluiSeen(){
  var k = _latestDocKey();
  try { if(k) localStorage.setItem(SEEN_KEY, k); } catch(_){}
}

// Affiche/masque les pastilles « Nouveau » (bandeau mobile + menu bureau).
function refreshPluiBadge(){
  var on = hasNewPluiDoc();
  ['plui-badge','plui-badge-desktop'].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.style.display = on ? 'inline-flex' : 'none';
  });
}
window.refreshPluiBadge = refreshPluiBadge;

function _esc(s){
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function _frDate(iso){
  // ’AAAA-MM-JJ’ → ’JJ mois AAAA’ ; toute autre valeur est renvoyée telle quelle.
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if(!m) return String(iso || '');
  var mois = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  return parseInt(m[3],10) + ' ' + mois[parseInt(m[2],10)-1] + ' ' + m[1];
}

// ── Rendu de la frise (BLOC 2) ───────────────────────────────
function _renderTimeline(){
  var el = document.getElementById('plui-timeline');
  if(!el) return;
  var cfg = {
    done:    { ico:'✅', dot:'var(--sage)',  bg:'transparent',        titcol:'var(--text)' },
    current: { ico:'🔵', dot:'var(--leaf)',  bg:'var(--mist)',        titcol:'var(--forest)' },
    todo:    { ico:'⏳', dot:'var(--border)', bg:'transparent',        titcol:'var(--muted)' }
  };
  el.innerHTML = PLUI_TIMELINE.map(function(step, i){
    var c = cfg[step.statut] || cfg.todo;
    var last = i === PLUI_TIMELINE.length - 1;
    var isCur = step.statut === 'current';
    return '<div style="display:flex;gap:12px;align-items:stretch">'
      // colonne repère (icône + trait)
      + '<div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0">'
      +   '<div style="font-size:1.35rem;line-height:1.1" aria-hidden="true">' + c.ico + '</div>'
      +   (last ? '' : '<div style="flex:1;width:3px;background:' + c.dot + ';margin:4px 0;border-radius:2px;min-height:14px"></div>')
      + '</div>'
      // carte étape
      + '<div style="flex:1;background:' + c.bg + ';border:' + (isCur ? '2px solid var(--leaf)' : '1px solid var(--border)')
      +   ';border-radius:14px;padding:12px 14px;margin-bottom:12px">'
      +   (isCur ? '<div style="display:inline-block;background:var(--leaf);color:#fff;font-size:0.62rem;font-weight:900;text-transform:uppercase;letter-spacing:0.06em;padding:3px 9px;border-radius:999px;margin-bottom:6px">Étape en cours</div>' : '')
      +   '<div style="font-size:0.72rem;font-weight:900;color:var(--sage-ink);text-transform:uppercase;letter-spacing:0.04em">' + _esc(step.date) + '</div>'
      +   '<div style="font-size:0.95rem;font-weight:800;color:' + c.titcol + ';line-height:1.35;margin-top:3px">' + _esc(step.label) + '</div>'
      + '</div>'
    + '</div>';
  }).join('');
}

// ── Rendu des documents (BLOC 4) ─────────────────────────────
function _renderDocs(){
  var el = document.getElementById('plui-docs');
  if(!el) return;
  if(!PLUI_DOCS.length){
    el.innerHTML = '<div style="background:var(--mist);border-radius:14px;padding:16px;text-align:center;color:var(--sage-ink);font-size:0.9rem;font-weight:700;line-height:1.5">'
      + 'Les documents seront publiés ici prochainement.</div>';
    return;
  }
  var docs = PLUI_DOCS.slice().sort(function(a,b){ return String(b.date||'').localeCompare(String(a.date||'')); });
  el.innerHTML = docs.map(function(d){
    return '<a href="' + _esc(d.url) + '" target="_blank" rel="noopener noreferrer" '
      + 'style="display:flex;align-items:center;gap:14px;padding:16px;background:var(--card);border:1.5px solid var(--border);'
      + 'border-radius:14px;text-decoration:none;color:var(--text);-webkit-tap-highlight-color:transparent">'
      + '<div style="font-size:1.8rem;flex-shrink:0" aria-hidden="true">📄</div>'
      + '<div style="flex:1;min-width:0">'
      +   '<div style="font-weight:900;font-size:0.92rem;line-height:1.35;color:var(--forest)">' + _esc(d.titre) + '</div>'
      +   '<div style="font-size:0.72rem;color:var(--muted);margin-top:4px">📅 ' + _esc(_frDate(d.date)) + '</div>'
      + '</div>'
      + '<div style="font-size:1.3rem;flex-shrink:0;opacity:0.8" aria-hidden="true">⬇</div>'
    + '</a>';
  }).join('');
}

// ── Ouverture de la page ─────────────────────────────────────
// openOv AVANT les getElementById : l’overlay est lazy (template
// data-lazy-ov), son contenu n’existe qu’après hydratation.
window.openPlui = function(){
  if(typeof trackStat === 'function'){ try { trackStat('plui'); } catch(_){} }
  openOv('plui');
  _renderTimeline();
  // On affiche d’abord ce qu’on a (cache), puis on rafraîchit : la page ne
  // reste jamais bloquée sur « Chargement… » si le réseau est absent.
  _renderDocs();
  _fetchDocs().then(function(){
    _renderDocs();
    // Le marquage « vu » se fait APRÈS le rafraîchissement, sinon un document
    // arrivé pendant la consultation serait considéré comme déjà lu.
    _markPluiSeen();
    refreshPluiBadge();
  });
};

// Rafraîchissement d’arrière-plan au démarrage de l’application. Sans lui, la
// pastille « Nouveau » ne pourrait s’allumer qu’après une première ouverture de
// la page — c’est-à-dire jamais au bon moment. Différé pour ne pas concurrencer
// les widgets d’accueil au premier rendu.
setTimeout(function(){
  _fetchDocs().then(function(){
    refreshPluiBadge();
    // Si la page est déjà ouverte quand la réponse arrive, on la met à jour.
    if(document.getElementById('plui-docs')) _renderDocs();
  });
}, 2500);

})();
