/* ════════════════════════════════════════════════════════════
   MAT — Agenda v3.7.0
   Parsing iCal, affichage mois, fiche événement
   ════════════════════════════════════════════════════════════ */

const MONTHS_LONG = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
var agendaView = 'today';
var _agendaYear  = new Date().getFullYear();
var _agendaMonth = new Date().getMonth();
var _agendaTargetMonth = null;

function decodeIcalText(v){ return (v||'').replace(/\\n/g,'\n').replace(/\\,/g,',').replace(/\\;/g,';').trim(); }
function parseIcalDateLine(line){
  if(!line) return null;
  var value = line.split(':').pop().trim();
  if(/^\d{8}$/.test(value)) return new Date(value.slice(0,4)+'-'+value.slice(4,6)+'-'+value.slice(6,8)+'T00:00:00');
  if(/^\d{8}T\d{6}Z$/.test(value)) return new Date(value.slice(0,4)+'-'+value.slice(4,6)+'-'+value.slice(6,8)+'T'+value.slice(9,11)+':'+value.slice(11,13)+':'+value.slice(13,15)+'Z');
  if(/^\d{8}T\d{6}$/.test(value)) return new Date(value.slice(0,4)+'-'+value.slice(4,6)+'-'+value.slice(6,8)+'T'+value.slice(9,11)+':'+value.slice(11,13)+':'+value.slice(13,15));
  return new Date(value);
}
function parseIcalDetailed(txt){
  var blocks = txt.replace(/\r/g,'').replace(/\n[ \t]/g,'').split('BEGIN:VEVENT').slice(1);
  var now = new Date(), limit = new Date(now.getTime()+365*86400000);
  var startToday = new Date(now.getFullYear(),now.getMonth(),now.getDate());
  var evts = [];
  blocks.forEach(function(b,idx){
    function getLine(name){ var re=new RegExp('^'+name+'[^:]*:(.+)$','m'); var m=b.match(re); return m?decodeIcalText(m[1]):''; }
    var summary=getLine('SUMMARY'), location=getLine('LOCATION'), description=getLine('DESCRIPTION'), uid=getLine('UID')||('evt-'+idx);
    var startLine=b.match(/^DTSTART[^:]*:.+$/m), endLine=b.match(/^DTEND[^:]*:.+$/m);
    var start=startLine?parseIcalDateLine(startLine[0]):null, end=endLine?parseIcalDateLine(endLine[0]):null;
    if(!summary||!start||isNaN(start.getTime())) return;
    if(start<startToday||start>limit) return;
    evts.push({uid,summary,location,description,start,end});
  });
  evts.sort(function(a,b){return a.start-b.start;});
  return evts;
}
function sameDay(a,b){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();}
function startOfWeek(d){var x=new Date(d);var day=x.getDay();var diff=day===0?-6:1-day;x.setHours(0,0,0,0);x.setDate(x.getDate()+diff);return x;}
function endOfWeek(d){var x=startOfWeek(d);x.setDate(x.getDate()+6);x.setHours(23,59,59,999);return x;}

function formatEventMeta(evt){
  var dateTxt=evt.start.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});
  var timeTxt=evt.start.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
  var endTxt=evt.end?evt.end.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'';
  var meta='🕒 '+timeTxt+(endTxt?' → '+endTxt:'')+' · '+dateTxt;
  if(evt.location) meta+='<br>📍 '+evt.location;
  return meta;
}

function buildIcsForEvent(evt){
  function pad(n){return String(n).padStart(2,'0');}
  function fmt(d){return d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate())+'T'+pad(d.getHours())+pad(d.getMinutes())+'00';}
  var end=evt.end||new Date(evt.start.getTime()+3600000);
  return 'BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:'+evt.summary.replace(/\n/g,' ')+'\nDTSTART:'+fmt(evt.start)+'\nDTEND:'+fmt(end)+'\nLOCATION:'+(evt.location||'').replace(/\n/g,' ')+'\nDESCRIPTION:'+(evt.description||'').replace(/\n/g,' ')+'\nEND:VEVENT\nEND:VCALENDAR';
}

async function ensureAgendaEvents(){
  if(window._agendaEvents) return window._agendaEvents;
  var r=await fetch(ICAL_URL,{cache:'no-store'});
  if(!r.ok) throw new Error('HTTP '+r.status);
  window._agendaEvents=parseIcalDetailed(await r.text());
  return window._agendaEvents;
}

async function loadAgenda(){
  var content=document.getElementById('agenda-content');
  content.innerHTML='<div class="agenda-empty">Chargement de l\'agenda…</div>';
  try{ await ensureAgendaEvents(); renderAgenda(); }
  catch(e){
    var offline = !navigator.onLine;
    content.innerHTML='<div class="agenda-empty">'+(offline?'📡 Vous êtes hors ligne.<br>L\'agenda sera disponible au retour de la connexion.':'Agenda indisponible.')+'</div>';
  }
}

function setAgendaView(view){
  agendaView=view;
  _agendaTargetMonth=null;
  ['today','week','month'].forEach(function(v){
    var el=document.getElementById('agenda-tab-'+v);
    if(el) el.classList.toggle('on',v===view);
  });
  renderAgenda();
}

function agendaNavMonth(delta){
  _agendaMonth+=delta;
  if(_agendaMonth>11){_agendaMonth=0;_agendaYear++;}
  if(_agendaMonth<0){_agendaMonth=11;_agendaYear--;}
  renderAgenda();
}

function renderAgenda(){
  var content=document.getElementById('agenda-content');
  var evts=window._agendaEvents||[];
  var now=new Date();
  var label=document.getElementById('agenda-month-label');
  if(label)label.textContent=MONTHS_LONG[_agendaMonth]+' '+_agendaYear;
  var list=evts.filter(function(e){return e.start.getFullYear()===_agendaYear&&e.start.getMonth()===_agendaMonth;});
  var first=new Date(_agendaYear,_agendaMonth,1);
  var last=new Date(_agendaYear,_agendaMonth+1,0);
  var startPad=first.getDay()===0?6:first.getDay()-1;
  var html='<div class="agenda-month-grid">';
  ['L','M','M','J','V','S','D'].forEach(function(h){html+='<div class="agenda-month-head">'+h+'</div>';});
  for(var p=0;p<startPad;p++)html+='<div class="agenda-month-day" style="visibility:hidden"></div>';
  for(var d=1;d<=last.getDate();d++){
    var cur=new Date(_agendaYear,_agendaMonth,d);
    var hasEvt=list.some(function(e){return sameDay(e.start,cur);});
    var cls='agenda-month-day'+(hasEvt?' has-event':'')+(sameDay(cur,now)?' today':'');
    if(hasEvt){var dayEvts=list.filter(function(e){return sameDay(e.start,cur);});html+='<div class="'+cls+'" onclick="openEventDetail(\''+dayEvts[0].uid.replace(/'/g,"\\'")+'\')" >'+d+'</div>';}
    else html+='<div class="'+cls+'">'+d+'</div>';
  }
  html+='</div>';
  html+=list.length?'<div class="agenda-list" style="margin-top:14px">'+list.map(renderAgendaItem).join('')+'</div>':'<div class="agenda-empty" style="margin-top:14px">Aucun événement ce mois-ci.</div>';
  content.innerHTML=html;
}

function renderAgendaItem(evt){
  var dayName=evt.start.toLocaleDateString('fr-FR',{weekday:'short'});
  return '<div class="agenda-item" onclick="openEventDetail(\''+evt.uid.replace(/'/g,"\\'")+'\')"><div class="agenda-item-head"><div class="agenda-date-badge"><div class="agenda-date-day">'+dayName+'</div><div class="agenda-date-num">'+evt.start.getDate()+'</div></div><div style="flex:1;min-width:0"><div class="agenda-title">'+esc(evt.summary)+'</div><div class="agenda-meta">'+formatEventMeta(evt)+'</div>'+(evt.description?'<div class="agenda-desc">'+esc(evt.description)+'</div>':'')+'</div></div></div>';
}

function openEventDetail(uid){
  var evt=(window._agendaEvents||[]).find(function(e){return e.uid===uid;});
  if(!evt) return;
  var body=document.getElementById('event-detail-body');
  body.innerHTML='<div class="event-detail-card"><div class="event-detail-title">'+esc(evt.summary)+'</div><div class="event-detail-meta">'+formatEventMeta(evt)+'</div><div class="event-detail-desc">'+(evt.description?esc(evt.description):'Aucune description.')+'</div><div class="event-detail-actions"><button class="event-btn primary" onclick="downloadEventIcs(\''+evt.uid.replace(/'/g,"\\'")+'\')">Ajouter à mon agenda</button>'+(evt.location?'<button class="event-btn secondary" onclick="openEventMap(\''+evt.uid.replace(/'/g,"\\'")+'\')">Voir le lieu</button>':'')+'</div></div>';
  openOv('event');
}

function downloadEventIcs(uid){
  var evt=(window._agendaEvents||[]).find(function(e){return e.uid===uid;});
  if(!evt) return;
  var blob=new Blob([buildIcsForEvent(evt)],{type:'text/calendar;charset=utf-8'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a'); a.href=url; a.download='evenement-mat.ics';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function(){URL.revokeObjectURL(url);},1000);
}

function openEventMap(uid){
  var evt=(window._agendaEvents||[]).find(function(e){return e.uid===uid;});
  if(!evt||!evt.location) return;
  window.open('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(evt.location),'_blank');
}
