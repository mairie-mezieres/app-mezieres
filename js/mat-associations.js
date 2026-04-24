/* MAT — Associations v4.0.1 */
(function(){
var _D=[
  {n:'Comité des fêtes',l:'img/assoc/cfetes.jpg',e:'ulrichbaudin1@aol.com',p:'M. Ulrich BAUDIN',t:'06.24.15.05.77',d:true},
  {n:'GERM de Mézières',l:'img/assoc/germ.jpg',e:'martine.baudoin.goyer@orange.fr',p:'Mme Martine BAUDOIN',t:'06.14.47.30.38',d:true},
  {n:'La Fraternelle',l:'img/assoc/fraternelle.jpg',e:'lafraternelle.mareau@gmail.com',p:'M. Christophe BOIS',t:'06.80.00.03.25',d:true},
  {n:'Les Trialistes de l\'Ardoux',l:'img/assoc/trail.jpg',e:'lestrialistesdelardoux@gmail.com',p:'M. Adrien BOUCAULT',t:'06.78.83.94.53',d:true},
  {n:'Association des Parents d\'élèves',l:'img/assoc/ape.jpg',e:'apemezieres@gmail.com',t:'06.15.94.26.24',d:false},
  {n:'Association K ROUGE',l:'img/assoc/krouge.jpg',e:'associationkrouge@gmail.com',p:'M. Thomas PROUST',t:'06.24.60.28.82',d:false},
  {n:'Pamela & Co',l:'img/assoc/pamco.jpg',e:'pamelacompagnie@gmail.com',p:'Mme Magalie CHEVALLIER',d:true}
];
function _e(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function _list(){
  return '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;padding:4px 0">'
    +_D.map(function(a,i){
      return '<button onclick="_assocDetail('+i+')" style="background:#fff;border:1px solid var(--border);border-radius:14px;padding:10px 6px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;font-family:inherit;width:100%">'
        +'<img src="'+_e(a.l)+'" alt="'+_e(a.n)+'" style="width:52px;height:52px;object-fit:contain;border-radius:10px" onerror="this.onerror=null;this.style.display=\'none\'">'
        +'<span style="font-size:0.62rem;font-weight:800;color:var(--forest);text-align:center;line-height:1.25">'+_e(a.n)+'</span>'
        +'</button>';
    }).join('')
    +'</div>';
}
window.openAssociations=function(){openOv('assoc');var el=document.getElementById('assoc-panel-body');if(el)el.innerHTML=_list();};
window._assocDetail=function(i){
  var a=_D[i];if(!a)return;
  var el=document.getElementById('assoc-panel-body');if(!el)return;
  var h='<button onclick="_assocBack()" style="background:none;border:none;color:var(--leaf);font-family:inherit;font-size:0.82rem;font-weight:800;cursor:pointer;padding:0 0 12px 0">← Retour</button>'
    +'<div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:8px 0">'
    +'<img src="'+_e(a.l)+'" alt="'+_e(a.n)+'" style="width:88px;height:88px;object-fit:contain;border-radius:16px;border:1px solid var(--border)" onerror="this.onerror=null;this.style.display=\'none\'">'
    +'<div style="font-size:0.96rem;font-weight:900;color:var(--forest);text-align:center">'+_e(a.n)+'</div>';
  if(a.d&&a.p) h+='<div style="font-size:0.78rem;color:var(--text)">👤 '+_e(a.p)+'</div>';
  h+='<a href="mailto:'+_e(a.e)+'" style="font-size:0.78rem;color:var(--leaf);text-decoration:none">✉️ '+_e(a.e)+'</a>';
  if(a.d&&a.t) h+='<a href="tel:'+a.t.replace(/\./g,'')+'" style="font-size:0.78rem;color:var(--leaf);text-decoration:none">📞 '+_e(a.t)+'</a>';
  h+='</div>';
  el.innerHTML=h;
};
window._assocBack=function(){var el=document.getElementById('assoc-panel-body');if(el)el.innerHTML=_list();};
})();
