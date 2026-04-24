/* MAT — Associations v4.0.5 */
(function(){
var _D=[
  {
    n:'Comité des fêtes',
    l:'cfetes.jpg',
    e:'ulrichbaudin1@aol.com',
    desc:"Organisation et animation des fêtes locales et événements festifs de la commune. Rassemble les habitants autour de manifestations conviviales tout au long de l'année."
  },
  {
    n:'GERM de Mézières',
    l:'germ.jpeg',
    e:'martine.baudoin.goyer@orange.fr',
    desc:"Groupe d'Études et de Réflexion Municipales. Participe à la réflexion et au débat sur la vie locale, les projets d'avenir et l'environnement de la commune."
  },
  {
    n:"Les Trialistes de l'Ardoux",
    l:'trail.jpeg',
    e:'lestrialistesdelardoux@gmail.com',
    url:'https://trialistes-de-lardoux.jimdosite.com/',
    desc:"Fondé en 1994, un des clubs régionaux de Trial les plus importants. A formé des dizaines de pilotes de renommée régionale, nationale et internationale. Affilié UFOLEP — organise chaque année une compétition régionale à Mézières-lez-Cléry."
  },
  {
    n:"Association des Parents d'élèves",
    l:'ape.jpg',
    e:'apemezieres@gmail.com',
    desc:"Représente les familles auprès de l'équipe enseignante. Participe activement à la vie scolaire et soutient les projets éducatifs de l'école de Mézières-lez-Cléry."
  },
  {
    n:'Pamela & Co',
    l:'pamco.jpg',
    e:'pamelacompagnie@gmail.com',
    url:'https://pamandco.fr/',
    desc:"Ferme d'animation pédagogique : éco-pâturage, enrichissement de la biodiversité, ruches pédagogiques, médiation animale et projets éducatifs avec les écoles. Sensibilisation à la préservation de l'environnement pour petits et grands."
  }
];

function _e(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

function _list(){
  return '<div style="font-size:0.82rem;font-weight:900;color:var(--forest);text-align:center;padding:6px 0 10px;letter-spacing:0.01em">Associations domiciliées à Mézières</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:4px 0">'
    +_D.map(function(a,i){
      return '<button onclick="_assocDetail('+i+')" style="background:#fff;border:1px solid var(--border);border-radius:14px;padding:12px 8px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:8px;font-family:inherit;width:100%">'
        +'<img src="'+_e(a.l)+'" alt="'+_e(a.n)+'" style="width:72px;height:72px;object-fit:contain;border-radius:10px;background:#e8f5ee" onerror="this.onerror=null;this.style.display=\'none\'">'
        +'<span style="font-size:0.62rem;font-weight:800;color:var(--forest);text-align:center;line-height:1.25">'+_e(a.n)+'</span>'
        +'</button>';
    }).join('')
    +'</div>'
    +'<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border)"><button onclick="openSubvention()" style="width:100%;background:var(--forest);color:#fff;border:none;border-radius:12px;padding:11px;font-family:inherit;font-size:0.82rem;font-weight:800;cursor:pointer">💶 Demander une subvention</button></div>';
}

window.openAssociations=function(){
  openOv('assoc');
  var el=document.getElementById('assoc-panel-body');
  if(el)el.innerHTML=_list();
};

window._assocDetail=function(i){
  var a=_D[i];if(!a)return;
  var el=document.getElementById('assoc-panel-body');if(!el)return;
  var h='<button onclick="_assocBack()" style="background:none;border:none;color:var(--leaf);font-family:inherit;font-size:0.82rem;font-weight:800;cursor:pointer;padding:0 0 12px 0">← Retour</button>'
    +'<div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:8px 0">'
    +'<img src="'+_e(a.l)+'" alt="'+_e(a.n)+'" style="width:100px;height:100px;object-fit:contain;border-radius:16px;border:1px solid var(--border);background:#e8f5ee" onerror="this.onerror=null;this.style.display=\'none\'">'
    +'<div style="font-size:0.96rem;font-weight:900;color:var(--forest);text-align:center">'+_e(a.n)+'</div>'
    +'<p style="font-size:0.80rem;color:var(--text);text-align:center;line-height:1.55;margin:4px 8px">'+_e(a.desc||'')+'</p>'
    +(a.url?'<a href="'+_e(a.url)+'" target="_blank" rel="noopener" style="font-size:0.76rem;color:var(--leaf);text-decoration:none;margin-top:2px">🌐 Site web →</a>':'')
    +'<a href="mailto:'+_e(a.e)+'" style="font-size:0.78rem;color:var(--leaf);text-decoration:none;margin-top:4px">✉️ '+_e(a.e)+'</a>'
    +'</div>';
  el.innerHTML=h;
};

window._assocBack=function(){var el=document.getElementById('assoc-panel-body');if(el)el.innerHTML=_list();};
window.openSubvention=function(){openOv('subvention');};
})();
