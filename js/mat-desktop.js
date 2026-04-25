/* mat-desktop.js v4.0.5 — populates desktop panels (≥1024px only) */
(function(){
'use strict';
if(window.innerWidth<1024)return;

var API='https://chatbot-mairie-mezieres.onrender.com';

/* ── helpers ─────────────────────────────────────────────────── */
function qs(id){return document.getElementById(id);}
function fmt(d){
  var dt=d instanceof Date?d:new Date(d);
  return dt.toLocaleDateString('fr-FR',{day:'numeric',month:'long'});
}
function fmtShort(d){
  var dt=d instanceof Date?d:new Date(d);
  if(isNaN(dt.getTime()))return '';
  return dt.toLocaleDateString('fr-FR',{day:'2-digit',month:'short'}).replace('.',' ');
}
function daysUntil(d){
  var now=new Date(); now.setHours(0,0,0,0);
  var dt=d instanceof Date?new Date(d):new Date(d); dt.setHours(0,0,0,0);
  return Math.round((dt-now)/86400000);
}
function safeSet(id,html){var el=qs(id);if(el)el.innerHTML=html;}

/* ── météo ───────────────────────────────────────────────────── */
function loadMeteo(){
  var el=qs('d-hero-meteo');
  if(!el)return;
  fetch(API+'/meteo/commune')
    .then(function(r){return r.ok?r.json():null;})
    .then(function(d){
      if(!d){el.innerHTML='';return;}
      var cur=(d.forecast||{}).current||{};
      var code=cur.weather_code;
      var icons=typeof METEO_ICONS!=='undefined'?METEO_ICONS:
        {0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',51:'🌦️',61:'🌧️',63:'🌧️',65:'🌧️',71:'❄️',80:'🌦️',95:'⛈️'};
      var descs=typeof METEO_DESC!=='undefined'?METEO_DESC:{};
      var ico=icons[code]||'🌤️';
      var temp=cur.temperature_2m!=null?Math.round(cur.temperature_2m)+'°C':'—';
      var desc=descs[code]||'';
      var wind=cur.wind_speed_10m!=null?Math.round(cur.wind_speed_10m)+' km/h':'';
      el.innerHTML='<div class="d-meteo-card" onclick="openMeteo&&openMeteo()" title="Cliquer pour le détail météo">'+
        '<div class="d-meteo-label"><span>🌤️ Météo locale</span><span class="d-meteo-click-hint">Détail →</span></div>'+
        '<div class="d-meteo-ico" style="font-size:2.2rem;line-height:1;margin-bottom:6px">'+ico+'</div>'+
        '<div class="d-meteo-temp" style="font-size:2.4rem;font-weight:900;line-height:1;margin-bottom:4px">'+temp+'</div>'+
        '<div class="d-meteo-desc" style="font-size:.78rem;color:rgba(255,255,255,.85)">'+desc+'</div>'+
        (wind?'<div class="d-meteo-row"><span>💨 Vent</span><strong>'+wind+'</strong></div>':'')+
      '</div>';
    })
    .catch(function(){el.innerHTML='';});
}

/* ── actualités ──────────────────────────────────────────────── */
function loadActus(){
  var el=qs('dsk-actus-list');
  if(!el)return;
  fetch(API+'/actus')
    .then(function(r){return r.ok?r.json():[];})
    .then(function(data){
      var items=Array.isArray(data)?data:(data&&Array.isArray(data.actus)?data.actus:[]);
      if(!items.length){
        el.innerHTML='<p class="d-empty">Aucune actualité</p>';
        return;
      }
      var html='';
      items.slice(0,5).forEach(function(a){
        var img=a.image?'<img src="'+a.image+'" alt="" onerror="this.style.display=\'none\'">':'';
        var rawDate=a.date||a.createdAt||'';
        var dateStr=rawDate?fmtShort(rawDate):'';
        var actuId=encodeURIComponent(a.id||a._id||'');
        html+='<div class="d-actu-item" onclick="(typeof openActuDetail===\'function\'?openActuDetail:function(){openNotifs&&openNotifs()})(\''+actuId+'\')" role="button">'+
          (img?'<div class="d-actu-thumb" style="width:52px;height:52px;border-radius:10px;overflow:hidden;flex-shrink:0">'+img+'</div>':'')+
          '<div class="d-actu-body">'+
            (dateStr?'<span class="d-actu-date">'+dateStr+'</span>':'')+
            '<strong class="d-actu-title">'+escHtml(a.titre||a.title||'')+'</strong>'+
            '<p class="d-actu-excerpt" style="font-size:.72rem;color:#666;margin:2px 0 0;line-height:1.4">'+escHtml((a.contenu||a.content||'').substring(0,90))+'…</p>'+
          '</div>'+
        '</div>';
      });
      el.innerHTML=html;
    })
    .catch(function(){safeSet('dsk-actus-list','<p class="d-empty">Chargement impossible</p>');});
}

/* ── bus rémi ─────────────────────────────────────────────────── */
function loadBusDesktop(){
  var el=qs('dsk-bus-body');
  if(!el)return;
  if(typeof isVacancesScolaires!=='function'||typeof BUS_HORAIRES==='undefined'){
    el.innerHTML='<p class="d-bus-empty">Données bus non chargées</p>';
    return;
  }
  var vac=isVacancesScolaires();
  var H=BUS_HORAIRES;
  var periode=vac?'Vacances scolaires':'Période scolaire';

  function getNext(times){
    if(!times||!times.length)return null;
    var now=new Date(new Date().toLocaleString('en-US',{timeZone:'Europe/Paris'}));
    var nowMins=now.getHours()*60+now.getMinutes();
    for(var i=0;i<times.length;i++){
      var parts=times[i].split(':');
      var busMins=parseInt(parts[0])*60+parseInt(parts[1]);
      if(busMins>nowMins){
        var diff=busMins-nowMins;
        return {time:times[i],soon:diff<=30,label:diff<=30?'dans '+diff+' min':times[i]};
      }
    }
    return null;
  }

  var stops=[
    {name:'Mairie',key:'mairie'},
    {name:'Le Bréau',key:'breau'}
  ];
  var dirs=[
    {label:'→ Orléans',key:'orleans'},
    {label:'→ Nouan',key:'nouan'}
  ];
  var html='<div style="padding:4px 0 8px;font-size:.65rem;color:#52b788;font-weight:800;display:flex;align-items:center;gap:6px">'+
    '<span class="d-bus-periode">'+periode+'</span>'+
  '</div>';
  var hasNext=false;
  stops.forEach(function(stop){
    dirs.forEach(function(dir){
      var sfx=vac?'_vacances':'_scolaire';
      var times=(H[stop.key]||{})[dir.key+sfx]||[];
      var next=getNext(times);
      if(next){
        hasNext=true;
        html+='<div class="d-bus-item">'+
          '<span class="d-bus-stop">'+stop.name+'</span>'+
          '<span class="d-bus-dir">'+dir.label+'</span>'+
          '<span class="d-bus-time'+(next.soon?' d-bus-soon':'')+'">'+next.label+'</span>'+
        '</div>';
      }
    });
  });
  if(!hasNext){
    html+='<p class="d-bus-empty">Plus de bus aujourd\'hui</p>';
  }
  el.innerHTML=html;
}

/* ── agenda (via ensureAgendaEvents du module mat-agenda) ────── */
function loadAgenda(){
  if(typeof ensureAgendaEvents!=='function')return;
  ensureAgendaEvents()
    .then(function(evts){
      if(!evts||!evts.length)return;
      var now=new Date();
      var future=evts.filter(function(e){return e.start>=now;});
      future.sort(function(a,b){return a.start-b.start;});
      if(!future.length)return;

      renderFeatured(future[0]);

      var elList=qs('dsk-agenda-list');
      if(elList&&future.length>1){
        var html='';
        future.slice(1,6).forEach(function(e){
          var d=e.start;
          html+='<div class="d-agenda-item">'+
            '<div class="d-agenda-date">'+
              '<span class="d-agenda-day">'+d.getDate()+'</span>'+
              '<span class="d-agenda-mon">'+d.toLocaleDateString('fr-FR',{month:'short'}).replace('.','')+'</span>'+
            '</div>'+
            '<div class="d-agenda-info">'+
              '<strong>'+escHtml(e.summary||'')+'</strong>'+
              (e.location?'<small>'+escHtml(e.location)+'</small>':'')+
            '</div>'+
          '</div>';
        });
        elList.innerHTML=html;
      }
    })
    .catch(function(){});
}

function renderFeatured(e){
  var el=qs('dsk-featured');
  if(!el||!e)return;
  var d=e.start;
  var days=daysUntil(d);
  var countdown=days===0?'Aujourd\'hui !':days===1?'Demain':'Dans '+days+' jour'+(days>1?'s':'');
  el.innerHTML=
    '<div class="d-featured" onclick="openAgenda&&openAgenda()" title="Voir l\'agenda complet">'+
      '<div class="d-featured-body">'+
        '<div class="d-featured-badge">Prochain évènement</div>'+
        '<h3 class="d-featured-title">'+escHtml(e.summary||'')+'</h3>'+
        (e.location?'<p class="d-featured-lieu">📍 '+escHtml(e.location)+'</p>':'')+
        '<div class="d-featured-meta">'+
          '<span class="d-featured-date">'+fmt(d)+'</span>'+
          ' · <span class="d-featured-countdown">'+countdown+'</span>'+
        '</div>'+
        (e.description?'<p class="d-featured-desc" style="font-size:.78rem;color:rgba(255,255,255,.8);margin:8px 0 0;line-height:1.5">'+escHtml(e.description)+'</p>':'')+
        '<p style="font-size:.68rem;color:rgba(255,255,255,.45);margin:8px 0 0">Voir l\'agenda complet →</p>'+
      '</div>'+
    '</div>';
}

/* ── horaires mairie (statiques — lun/mer/ven uniquement) ─────── */
function renderHoraires(){
  var el=qs('dsk-mairie-body');
  if(!el)return;
  var rows=[
    ['Lundi','14h00 – 17h30'],
    ['Mardi','Fermée'],
    ['Mercredi','Sur RDV uniquement'],
    ['Jeudi','Fermée'],
    ['Vendredi','8h30 – 11h30']
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
  var btnStyle='flex:1;display:flex;align-items:center;justify-content:center;gap:5px;background:var(--forest);color:#fff;text-decoration:none;border-radius:10px;padding:9px 8px;font-family:inherit;font-size:0.74rem;font-weight:800';
  html+='<div style="display:flex;gap:8px;margin-top:10px">'+
    '<a href="tel:+33238457028" style="'+btnStyle+'">📞 02 38 45 70 28</a>'+
    '<a href="mailto:mairie.mezieres@wanadoo.fr" style="'+btnStyle+'">✉️ Écrire</a>'+
  '</div>';
  el.innerHTML=html;
}

/* ── collectes (statiques) ───────────────────────────────────── */
function renderCollectes(){
  var el=qs('dsk-collectes-body');
  if(!el)return;
  el.innerHTML='<p style="font-size:0.78rem;color:var(--text);line-height:1.6;margin:0">'
    +'🗑️ Ordures ménag. — semaines impaires<br>'
    +'♻️ Tri sélectif — semaines paires<br>'
    +'🫙 Verre — en déchetterie'
    +'</p>'
    +'<button onclick="openDechets()" style="margin-top:10px;width:100%;background:var(--forest);color:#fff;border:none;border-radius:10px;padding:8px;font-family:inherit;font-size:0.76rem;font-weight:800;cursor:pointer">📅 Voir le calendrier complet</button>';
}

/* ── élus (statiques) ────────────────────────────────────────── */
function renderElus(){
  var el=qs('dsk-elus-body');
  if(!el)return;
  el.innerHTML='<p style="font-size:0.78rem;color:var(--text);line-height:1.5;margin:0 0 10px 0">'
    +'Découvrez vos élus et leurs délégations.'
    +'</p>'
    +'<button onclick="openConseil()" style="width:100%;background:var(--forest);color:#fff;border:none;border-radius:10px;padding:8px;font-family:inherit;font-size:0.76rem;font-weight:800;cursor:pointer">🏛️ Voir le conseil municipal</button>';
}

/* ── utils ───────────────────────────────────────────────────── */
function escHtml(s){
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

/* ── boot ────────────────────────────────────────────────────── */
function init(){
  loadMeteo();
  loadActus();
  loadAgenda();
  loadBusDesktop();
  renderHoraires();
  renderCollectes();
  renderElus();
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',init);
}else{
  setTimeout(init,100);
}

})();