/* mat-desktop.js v4.0.2 — populates desktop panels (≥1024px only) */
(function(){
'use strict';
if(window.innerWidth<1024)return;

var API='https://chatbot-mairie-mezieres.onrender.com';

function qs(id){return document.getElementById(id);}
function fmt(d){
  var dt=new Date(d);
  return dt.toLocaleDateString('fr-FR',{day:'numeric',month:'long'});
}
function fmtShort(d){
  var dt=new Date(d);
  return dt.toLocaleDateString('fr-FR',{day:'2-digit',month:'short'}).replace('.',' ');
}
function daysUntil(d){
  var now=new Date(); now.setHours(0,0,0,0);
  var dt=new Date(d); dt.setHours(0,0,0,0);
  return Math.round((dt-now)/86400000);
}
function safeSet(id,html){var el=qs(id);if(el)el.innerHTML=html;}

function loadMeteo(){
  var el=qs('d-hero-meteo');
  if(!el)return;
  fetch(API+'/meteo?commune=mezieres-lez-clery')
    .then(function(r){return r.ok?r.json():null;})
    .then(function(d){
      if(!d){el.innerHTML='';return;}
      var ico=d.icon||'🌤️';
      var temp=d.temperature!=null?Math.round(d.temperature)+'°C':'—';
      var desc=d.description||'';
      el.innerHTML='<div class="d-meteo-box">'+
        '<div class="d-meteo-ico">'+ico+'</div>'+
        '<div class="d-meteo-info">'+
          '<span class="d-meteo-temp">'+temp+'</span>'+
          '<span class="d-meteo-desc">'+desc+'</span>'+
        '</div>'+
      '</div>';
    })
    .catch(function(){el.innerHTML='';});
}

function loadActus(){
  var el=qs('dsk-actus-list');
  if(!el)return;
  fetch(API+'/actus')
    .then(function(r){return r.ok?r.json():[];})
    .then(function(data){
      if(!data||!data.length){
        el.innerHTML='<p class="d-empty">Aucune actualité</p>';
        return;
      }
      var html='';
      data.slice(0,5).forEach(function(a){
        var img=a.image?'<img src="'+a.image+'" alt="" onerror="this.style.display=\'none\'">':\'\'';
        html+='<div class="d-actu-item" onclick="openActu && openActu(\''+encodeURIComponent(a.id||a._id||'')+'\'" role="button">'+
          (img?'<div class="d-actu-thumb">'+img+'</div>':'')+
          '<div class="d-actu-body">'+
            '<span class="d-actu-date">'+fmtShort(a.date||a.createdAt||new Date())+'</span>'+
            '<strong class="d-actu-title">'+escHtml(a.titre||a.title||'')+'</strong>'+
            '<p class="d-actu-excerpt">'+escHtml((a.contenu||a.content||'').substring(0,90))+'…</p>'+
          '</div>'+
        '</div>';
      });
      el.innerHTML=html;
    })
    .catch(function(){safeSet('dsk-actus-list','<p class="d-empty">Chargement impossible</p>');});
}

function loadAgenda(){
  fetch(API+'/agenda')
    .then(function(r){return r.ok?r.json():[];})
    .then(function(data){
      if(!data||!data.length)return;
      var now=new Date();
      var future=data.filter(function(e){return new Date(e.date||e.dateDebut)>=now;});
      future.sort(function(a,b){return new Date(a.date||a.dateDebut)-new Date(b.date||b.dateDebut);});
      renderFeatured(future[0]);
      var elList=qs('dsk-agenda-list');
      if(elList&&future.length>1){
        var html='';
        future.slice(1,6).forEach(function(e){
          var d=new Date(e.date||e.dateDebut);
          html+='<div class="d-agenda-item">'+
            '<div class="d-agenda-date">'+
              '<span class="d-agenda-day">'+d.getDate()+'</span>'+
              '<span class="d-agenda-mon">'+d.toLocaleDateString('fr-FR',{month:'short'}).replace('.','')+'</span>'+
            '</div>'+
            '<div class="d-agenda-info">'+
              '<strong>'+escHtml(e.titre||e.title||'')+'</strong>'+
              (e.lieu||e.location?'<small>'+escHtml(e.lieu||e.location)+'</small>':'')+
            '</div>'+
          '</div>';
        });
        elList.innerHTML=html;
      }
      var sc=qs('dsk-stat-events');
      if(sc)sc.textContent=future.length;
    })
    .catch(function(){});
}

function renderFeatured(e){
  var el=qs('dsk-featured');
  if(!el||!e)return;
  var d=new Date(e.date||e.dateDebut);
  var days=daysUntil(e.date||e.dateDebut);
  var countdown=days===0?'Aujourd\'hui !':days===1?'Demain':'Dans '+days+' jour'+(days>1?'s':'');
  var img=e.image||e.photo||'';
  el.innerHTML=
    '<div class="d-featured">'+
      (img?'<div class="d-featured-img"><img src="'+img+'" alt="" onerror="this.parentElement.style.display=\'none\'"></div>':'')+
      '<div class="d-featured-body">'+
        '<div class="d-featured-badge">'+escHtml(e.categorie||e.category||'Événement')+'</div>'+
        '<h3 class="d-featured-title">'+escHtml(e.titre||e.title||'')+'</h3>'+
        (e.lieu||e.location?'<p class="d-featured-lieu">📍 '+escHtml(e.lieu||e.location)+'</p>':'')+
        '<div class="d-featured-meta">'+
          '<span class="d-featured-date">'+fmt(d)+'</span>'+
          '<span class="d-featured-countdown">'+countdown+'</span>'+
        '</div>'+
        (e.description||e.contenu?'<p class="d-featured-desc">'+escHtml((e.description||e.contenu).substring(0,120))+'…</p>':'')+
      '</div>'+
    '</div>';
}

function renderHoraires(){
  var el=qs('dsk-mairie-body');
  if(!el)return;
  var rows=[
    ['Lundi','14h00 – 17h30'],
    ['Mardi','Fermée'],
    ['Mercredi','Sur RDV uniquement'],
    ['Jeudi','Fermée'],
    ['Vendredi','8h30 – 11h30'],
    ['Samedi','Fermée'],
    ['Dimanche','Fermée']
  ];
  var now=new Date();
  var today=now.getDay();
  var dayIdx=[6,0,1,2,3,4,5];
  var html='<table class="d-horaires"><tbody>';
  rows.forEach(function(r,i){
    var isCurrent=(dayIdx[today]===i);
    html+='<tr'+(isCurrent?' class="d-hor-today"':'')+'>'+
      '<td>'+r[0]+'</td>'+
      '<td>'+r[1]+'</td>'+
    '</tr>';
  });
  html+='</tbody></table>';
  html+='<div class="d-mairie-contact">'+
    '<a href="tel:+33238457028" class="d-contact-btn">📞 02 38 45 70 28</a>'+
    '<a href="mailto:mairie.mezieres@wanadoo.fr" class="d-contact-btn">✉️ Écrire</a>'+
  '</div>';
  el.innerHTML=html;
}

function loadCollectes(){
  var el=qs('dsk-collectes-body');
  if(!el)return;
  fetch(API+'/collectes')
    .then(function(r){return r.ok?r.json():null;})
    .then(function(d){
      if(!d){el.innerHTML='<p class="d-empty">Données indisponibles</p>';return;}
      var types=['ordures','recyclables','verre'];
      var labels={ordures:'🗑️ Ordures ménagères',recyclables:'♻️ Tri sélectif',verre:'🪴 Verre'};
      var html='';
      types.forEach(function(t){
        if(!d[t])return;
        html+='<div class="d-collecte-row">'+
          '<span class="d-collecte-lbl">'+labels[t]+'</span>'+
          '<span class="d-collecte-date">'+fmtShort(d[t])+'</span>'+
        '</div>';
      });
      el.innerHTML=html||'<p class="d-empty">Pas de données</p>';
    })
    .catch(function(){el.innerHTML='<p class="d-empty">Chargement impossible</p>';});
}

function loadElus(){
  var el=qs('dsk-elus-body');
  if(!el)return;
  fetch(API+'/elus')
    .then(function(r){return r.ok?r.json():[];})
    .then(function(data){
      if(!data||!data.length){el.innerHTML='<p class="d-empty">—</p>';return;}
      var html='';
      data.forEach(function(elu){
        html+='<div class="d-elu-row">'+
          (elu.photo?'<img class="d-elu-photo" src="'+elu.photo+'" alt="" onerror="this.style.display=\'none\'">':
            '<div class="d-elu-avatar">'+initials(elu.nom||'')+'</div>')+
          '<div class="d-elu-info">'+
            '<strong>'+escHtml(elu.prenom||'')+' '+escHtml(elu.nom||'')+'</strong>'+
            '<small>'+escHtml(elu.fonction||elu.role||'Conseiller·e municipal·e')+'</small>'+
          '</div>'+
        '</div>';
      });
      el.innerHTML=html;
    })
    .catch(function(){el.innerHTML='<p class="d-empty">Chargement impossible</p>';});
}

window.deskMelSend=function(ev){
  ev.preventDefault();
  var inp=document.getElementById('dsk-mel-inp');
  var msg=inp?inp.value.trim():'';
  if(!msg)return;
  if(typeof openMel==='function')openMel();
  setTimeout(function(){
    var mainInp=document.querySelector('#ov-mel textarea, #ov-mel input[type="text"]');
    if(mainInp){mainInp.value=msg;mainInp.dispatchEvent(new Event('input'));}
    if(inp)inp.value='';
  },300);
};

window.openMelCat=function(cat){
  if(typeof openMel==='function')openMel();
  setTimeout(function(){
    var btns=document.querySelectorAll('#ov-mel [data-cat]');
    btns.forEach(function(b){if(b.dataset.cat===cat)b.click();});
  },300);
};

function loadStats(){
  fetch(API+'/stats')
    .then(function(r){return r.ok?r.json():null;})
    .then(function(d){
      if(!d)return;
      if(d.signalements!=null){var s=qs('dsk-stat-sig');if(s)s.textContent=d.signalements;}
      if(d.conversations!=null){var m=qs('dsk-stat-mel');if(m)m.textContent=d.conversations;}
    })
    .catch(function(){});
}

function escHtml(s){
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}
function initials(nom){
  return nom.split(' ').map(function(p){return p[0]||'';}).join('').substring(0,2).toUpperCase();
}

function init(){
  loadMeteo();
  loadActus();
  loadAgenda();
  renderHoraires();
  loadCollectes();
  loadElus();
  loadStats();
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',init);
}else{
  init();
}

})();