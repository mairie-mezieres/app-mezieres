/* MAT — Entreprises v1.2.0 */
(function(){
'use strict';

var API='https://chatbot-mairie-mezieres.onrender.com';
var _cache=null;

/* Données initiales — complétées/corrigées via l'onglet Admin */
var _STATIC=[
  {
    id:1,
    nom:'Pascal Foulon Photographies',
    activite:'Photographie',
    description:'Photographe professionnel basé à Mézières-lez-Cléry. Reportages, portraits, paysages et événements.',
    siteWeb:'https://www.pascalfoulon-photographies.com/',
    gerant:'Pascal Foulon',
    telephone:'',email:'',logo:''
  },
  {
    id:2,
    nom:'Novo Assainissement',
    activite:'Assainissement & Plomberie',
    description:'Spécialiste de l\'assainissement non collectif, débouchage, travaux de plomberie et entretien de fosses septiques.',
    siteWeb:'https://www.novo-assainissement.com/',
    gerant:'',telephone:'',email:'',logo:''
  },
  {
    id:3,
    nom:'Chai Amandine et Quentin',
    activite:'Viticulture & dégustation',
    description:'Chai viticole proposant dégustation et vente de vins. Amandine et Quentin vous accueillent dans leur domaine pour découvrir leurs productions.',
    siteWeb:'https://www.chaiamandineetquentin.fr/',
    gerant:'Amandine et Quentin',
    telephone:'',email:'',logo:''
  },
  {
    id:4,
    nom:'Hypnoser',
    activite:'Hypnothérapie',
    description:'Cabinet d\'hypnothérapie : accompagnement pour l\'arrêt du tabac, gestion du stress, phobies, confiance en soi et développement personnel.',
    siteWeb:'https://www.hypnoser.fr/',
    gerant:'',telephone:'',email:'',logo:''
  },
  {
    id:5,
    nom:'EMAN Coach',
    activite:'Coaching & développement personnel',
    description:'Accompagnement individuel et professionnel : coaching de vie, développement personnel et bilan de compétences.',
    siteWeb:'https://eman-coach.fr/',
    gerant:'',telephone:'',email:'',logo:''
  },
  {
    id:6,
    nom:'Horticulteur Gatelier',
    activite:'Horticulture',
    description:'Exploitation horticole familiale à Mézières-lez-Cléry : plants, fleurs, légumes et produits horticoles de qualité.',
    siteWeb:'https://www.horticulteur-gatelier.fr/',
    gerant:'Famille Gatelier',
    telephone:'',email:'',logo:''
  },
  {
    id:7,
    nom:'Les Fruits de la Masure',
    activite:'Production fruitière & dégustation',
    description:'Producteur de fruits locaux à Mézières-lez-Cléry. Vente directe à la ferme et dégustation de produits du terroir.',
    siteWeb:'',gerant:'',telephone:'',email:'',logo:''
  }
];

function _e(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

function _domain(url){
  try{return new URL(url).hostname.replace(/^www\./,'');}catch(e){return '';}
}

function _logo(e,size){
  size=size||72;
  var r='border-radius:10px';
  var bg='background:#fff';
  var style='width:'+size+'px;height:'+size+'px;object-fit:contain;'+r+';'+bg;
  if(e.logo){
    return '<img src="'+_e(e.logo)+'" alt="'+_e(e.nom)+'" style="'+style+'" onerror="this.remove()">';
  }
  if(e.siteWeb){
    var d=_domain(e.siteWeb);
    if(d){
      var src='https://logo.clearbit.com/'+encodeURIComponent(d);
      var fav='https://www.google.com/s2/favicons?domain='+encodeURIComponent(d)+'&sz=64';
      return '<img src="'+src+'" alt="'+_e(e.nom)+'" style="'+style+'" onerror="this.src=\''+fav+'\';this.onerror=function(){this.remove();}">';
    }
  }
  return '<div style="width:'+size+'px;height:'+size+'px;'+r+';'+bg+';display:flex;align-items:center;justify-content:center;font-size:'+(size>80?'2.6':'1.8')+'rem">🛠️</div>';
}

function _sorted(items){
  return items.slice().sort(function(a,b){
    return (a.nom||'').localeCompare(b.nom||'','fr',{sensitivity:'base'});
  });
}

function _list(items){
  if(!items||!items.length){
    return '<div style="text-align:center;padding:24px;color:var(--muted);font-size:0.82rem">Aucune entreprise enregistrée pour l\'instant.</div>';
  }
  var sorted=_sorted(items);
  return '<div style="font-size:0.82rem;font-weight:900;color:var(--forest);text-align:center;padding:6px 0 10px;letter-spacing:0.01em">Entreprises de Mézières-lez-Cléry</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:4px 0">'
    +sorted.map(function(e,i){
      return '<button onclick="_entrepriseDetail('+i+')" style="background:#fff;border:1px solid var(--border);border-radius:14px;padding:12px 8px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:8px;font-family:inherit;width:100%">'
        +_logo(e,72)
        +'<span style="font-size:0.62rem;font-weight:800;color:var(--forest);text-align:center;line-height:1.25">'+_e(e.nom)+'</span>'
        +(e.activite?'<span style="font-size:0.58rem;color:var(--muted);text-align:center;line-height:1.2">'+_e(e.activite)+'</span>':'')
        +'</button>';
    }).join('')
    +'</div>';
}

function _detail(e){
  var h='<button onclick="_entrepriseBack()" style="background:none;border:none;color:var(--leaf);font-family:inherit;font-size:0.82rem;font-weight:800;cursor:pointer;padding:0 0 12px 0">← Retour</button>'
    +'<div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:8px 0">'
    +_logo(e,100).replace('border-radius:10px','border-radius:16px').replace('background:#fff','border:1px solid var(--border);background:#fff')
    +'<div style="font-size:0.96rem;font-weight:900;color:var(--forest);text-align:center">'+_e(e.nom)+'</div>'
    +(e.activite?'<div style="font-size:0.74rem;color:var(--muted);text-align:center;font-weight:700;background:#e8f0fe;border-radius:20px;padding:3px 12px">'+_e(e.activite)+'</div>':'')
    +(e.description?'<p style="font-size:0.80rem;color:var(--text);text-align:center;line-height:1.6;margin:4px 8px">'+_e(e.description)+'</p>':'')
    +(e.gerant?'<div style="font-size:0.76rem;color:var(--text);text-align:center;margin-top:4px"><strong>👤 Gérant :</strong> '+_e(e.gerant)+'</div>':'')
    +'<div style="display:flex;flex-direction:column;align-items:center;gap:8px;margin-top:6px;width:100%">'
    +(e.telephone?'<a href="tel:'+_e(e.telephone)+'" style="font-size:0.78rem;color:var(--leaf);text-decoration:none;font-weight:700">📞 '+_e(e.telephone)+'</a>':'')
    +(e.email?'<a href="mailto:'+_e(e.email)+'" style="font-size:0.78rem;color:var(--leaf);text-decoration:none;font-weight:700">✉️ '+_e(e.email)+'</a>':'')
    +(e.siteWeb?'<a href="'+_e(e.siteWeb)+'" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;background:var(--forest);color:#fff;text-decoration:none;border-radius:10px;padding:9px 18px;font-size:0.80rem;font-weight:800;margin-top:4px">🌐 Visiter le site web</a>':'')
    +'</div>'
    +'</div>';
  return h;
}

function _load(){
  if(_cache)return Promise.resolve(_cache);
  return fetch(API+'/entreprises')
    .then(function(r){return r.ok?r.json():null;})
    .then(function(d){
      if(!d||!Array.isArray(d.entreprises)){_cache=_STATIC;}
      else{_cache=d.entreprises;}
      return _cache;
    })
    .catch(function(){_cache=_STATIC;return _cache;});
}

window.openEntreprises=function(){
  if(typeof openOv==='function')openOv('entreprises');
  var el=document.getElementById('entreprises-panel-body');
  if(!el)return;
  el.innerHTML='<div class="actu-empty">Chargement…</div>';
  _load().then(function(items){
    window._entreprisesList=_sorted(items);
    if(el)el.innerHTML=_list(items);
  });
};

window._entrepriseDetail=function(i){
  var items=window._entreprisesList||[];
  var e=items[i];if(!e)return;
  var el=document.getElementById('entreprises-panel-body');
  if(el)el.innerHTML=_detail(e);
};

window._entrepriseBack=function(){
  var items=window._entreprisesList||[];
  var el=document.getElementById('entreprises-panel-body');
  if(el)el.innerHTML=_list(items);
};

})();
