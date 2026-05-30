/* ════════════════════════════════════════════════════════════
   MAT — Formulaires v3.7.3
   Signalement, contact, bug, idées
   Copyright (c) 2024-2026 Commune de Mézières-lez-Cléry — Licence MIT
   ════════════════════════════════════════════════════════════ */

// ── Signalement → Trello ───────────────────────────────────────
let sigCat='',sigLat='',sigLon='';
function selCat(btn,cat){
  document.querySelectorAll('#signal-cats .cat-btn').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on'); sigCat=cat;
}
function _previewImageFromInput(inputId, previewId, actionsId, removeBtnId, resetInputIds){
  const input=document.getElementById(inputId);
  const file=input&&input.files&&input.files[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{
    const prev=document.getElementById(previewId);
    if(prev){ prev.src=e.target.result; prev.style.display='block'; }
    const actions=document.getElementById(actionsId);
    if(actions) actions.style.display='none';
    const removeBtn=document.getElementById(removeBtnId);
    if(removeBtn) removeBtn.style.display='block';
    (resetInputIds||[]).forEach(id=>{ if(id!==inputId){ const el=document.getElementById(id); if(el) el.value=''; } });
  };
  reader.readAsDataURL(file);
}
function _removePreviewImage(previewId, actionsId, removeBtnId, inputIds){
  const prev=document.getElementById(previewId);
  if(prev){ prev.src=''; prev.style.display='none'; }
  const actions=document.getElementById(actionsId);
  if(actions) actions.style.display='grid';
  const removeBtn=document.getElementById(removeBtnId);
  if(removeBtn) removeBtn.style.display='none';
  (inputIds||[]).forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
}
function previewPhoto(source){
  const inputId = source==='camera' ? 'signal-photo-camera-input' : 'signal-photo-input';
  _previewImageFromInput(inputId,'signal-photo-preview','signal-photo-actions','signal-photo-remove',['signal-photo-camera-input','signal-photo-input']);
}
function removeSignalPhoto(){
  _removePreviewImage('signal-photo-preview','signal-photo-actions','signal-photo-remove',['signal-photo-camera-input','signal-photo-input']);
}
function getLocation(){
  if(!navigator.geolocation){document.getElementById('loc-status').textContent='GPS non disponible';return;}
  document.getElementById('loc-btn').textContent='📍 Localisation en cours…';
  navigator.geolocation.getCurrentPosition(pos=>{
    sigLat=pos.coords.latitude.toFixed(5); sigLon=pos.coords.longitude.toFixed(5);
    document.getElementById('loc-btn').textContent='✅ Position obtenue ('+sigLat+', '+sigLon+')';
    document.getElementById('loc-btn').classList.add('on');
    document.getElementById('loc-status').textContent='';
  },()=>{document.getElementById('loc-btn').textContent='❌ Position refusée';document.getElementById('loc-status').textContent='Activez la localisation dans les paramètres';});
}

async function _getPushSubForNotify(){
  try{
    if(!('serviceWorker' in navigator)||!('PushManager' in window)) return null;
    const reg=await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  }catch(e){return null;}
}

function _saveMySig(id, cat, type){
  try{
    const list=JSON.parse(localStorage.getItem('mat_my_signals_v1')||'[]');
    list.unshift({id,cat,type:type||'signalement',date:new Date().toISOString()});
    localStorage.setItem('mat_my_signals_v1',JSON.stringify(list.slice(0,50)));
  }catch(_){}
}

async function submitSignal(){
  const desc=document.getElementById('signal-desc').value.trim();
  const photoEl=document.getElementById('signal-photo-preview');
  const btn=document.querySelector('#signal-form .submit-btn');
  btn.textContent='Envoi en cours…'; btn.disabled=true;

  // Compresser la photo (max 800px, qualité 0.7)
  let photoB64 = '';
  if(photoEl.style.display !== 'none' && photoEl.src){
    try{ photoB64 = await compressImage(photoEl.src, 800, 0.7); }
    catch(e){ photoB64 = photoEl.src.substring(0, 80000); }
  }

  const signalId = Date.now();
  const notifyToken = (typeof crypto!=='undefined'&&crypto.randomUUID) ? crypto.randomUUID() : null;
  const pushSub = notifyToken ? await _getPushSubForNotify() : null;

  const _dev = detectDevice();
  const descWithDevice = desc + (desc ? '\n\n' : '') + '📱 ' + _dev.type + ' · ' + _dev.os + ' · ' + _dev.browser + ' · ' + _dev.pwa;
  const body={cat:sigCat||'Non précisé',desc:descWithDevice,lat:sigLat,lon:sigLon,photoB64,
    ...(notifyToken?{notifyToken,sub:pushSub||undefined}:{})};
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(), 35000);
  try{
    const r = await fetch(SIGNAL_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
    clearTimeout(timer);
    if(notifyToken){try{localStorage.setItem('mat:notify:signal:'+signalId,notifyToken);}catch(_){}}
    _saveMySig(signalId, sigCat||'Non précisé', 'signalement');
    document.getElementById('signal-form').style.display='none';
    document.getElementById('signal-success').style.display='block';
  }catch(e){
    clearTimeout(timer);
    if(e.name==='AbortError'){
      if(notifyToken){try{localStorage.setItem('mat:notify:signal:'+signalId,notifyToken);}catch(_){}}
      _saveMySig(signalId, sigCat||'Non précisé', 'signalement');
      document.getElementById('signal-form').style.display='none';
      document.getElementById('signal-success').style.display='block';
    } else {
      alertMAT('Erreur d\'envoi. Vérifiez votre connexion.','Signalement','⚠️');
      btn.textContent='📤 Envoyer le signalement'; btn.disabled=false;
    }
  }
}

function restoreSignalFormState(){
  const btn=document.querySelector('#signal-form .submit-btn');
  if(btn){btn.textContent='📤 Envoyer le signalement'; btn.disabled=false;}
}

function resetSignal(){
  document.getElementById('signal-form').style.display='block';
  document.getElementById('signal-success').style.display='none';
  document.getElementById('signal-desc').value='';
  removeSignalPhoto();
  document.querySelectorAll('#signal-cats .cat-btn').forEach(b=>b.classList.remove('on'));
  sigCat='';sigLat='';sigLon='';
  document.getElementById('loc-btn').textContent='📍 Utiliser ma position GPS';
  document.getElementById('loc-btn').classList.remove('on');
  restoreSignalFormState();
}

// ── Boîte à idées ───────────────────────────────────────────────────
const IDEAS_KEY='mat_ideas_v3', VOTES_KEY='mat_votes_v3', IDEAS_SEEN_KEY='mat_ideas_seen_v1';
const IDEAS_URL='https://chatbot-mairie-mezieres.onrender.com/idees';
const IDEAS_SORT_KEY='mat_ideas_sort_v1';
const IDEA_TREND_MIN_VOTES=3;
const IDEA_TREND_MAX_AGE_DAYS=10;
const IDEA_TREND_MIN_VOTES_PER_DAY=1;
let ideaCat='';
let _ideasSort=(localStorage.getItem(IDEAS_SORT_KEY)||'popular');
function selIdeaCat(btn,cat){document.querySelectorAll('.idea-cat').forEach(b=>b.classList.remove('on'));btn.classList.add('on');ideaCat=cat;}
function getIdeas(){try{return JSON.parse(localStorage.getItem(IDEAS_KEY)||'[]');}catch(e){return[];}}
function getVotes(){try{return JSON.parse(localStorage.getItem(VOTES_KEY)||'{}');}catch(e){return {};}}
function getIdeaSeenKeys(){try{return JSON.parse(localStorage.getItem(IDEAS_SEEN_KEY)||'[]');}catch(e){return[];}}
function getIdeaKey(idea){return [(idea&&idea.id)||'',(idea&&idea.date)||'',(idea&&idea.text)||''].join('||');}
function rememberSeenIdeas(ideas){
  try{
    const merged=[...new Set(getIdeaSeenKeys().concat((ideas||[]).map(getIdeaKey)))].slice(-500);
    localStorage.setItem(IDEAS_SEEN_KEY,JSON.stringify(merged));
  }catch(e){}
}
function markIdeasAsSeen(ideas){
  rememberSeenIdeas(ideas||[]);
  try{ if(typeof refreshActusBadge==='function') refreshActusBadge(); }catch(e){}
}
function mergeIdeasLists(serverIdeas){
  const remote=Array.isArray(serverIdeas)?serverIdeas:[];
  const local=getIdeas().filter(li=>!remote.find(si=>String(si.id)===String(li.id)));
  return [...local,...remote].sort((a,b)=>(b.votes||0)-(a.votes||0));
}
function getUnreadIdeasCount(ideas){
  const seen=getIdeaSeenKeys();
  return (ideas||[]).filter(idea=>!seen.includes(getIdeaKey(idea))).length;
}
async function fetchIdeasList(){
  try{
    const r=await fetch(IDEAS_URL,{cache:'no-store'});
    const d=await r.json();
    return mergeIdeasLists(d.idees||[]);
  }catch(e){
    return getIdeas().sort((a,b)=>(b.votes||0)-(a.votes||0));
  }
}

function _ideaTimestamp(idea){
  if(idea && idea.createdAt){ const t=Date.parse(idea.createdAt); if(!isNaN(t)) return t; }
  if(idea && typeof idea.id==='number') return idea.id;
  const raw=(idea&&idea.date)||'';
  const m=String(raw).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if(m) return new Date(Number(m[3]), Number(m[2])-1, Number(m[1])).getTime();
  const p=Date.parse(raw);
  return isNaN(p)?0:p;
}
function _ideaAgeDays(idea){
  const ts=_ideaTimestamp(idea);
  if(!ts) return Infinity;
  const diff=Math.max(0, Date.now()-ts);
  return diff/86400000;
}
function _ideaVotesPerDay(idea){
  const votes=Math.max(0, Number((idea&&idea.votes)||0));
  const ageDays=_ideaAgeDays(idea);
  return votes/Math.max(1, ageDays);
}
function isIdeaTrending(idea){
  const votes=Math.max(0, Number((idea&&idea.votes)||0));
  const ageDays=_ideaAgeDays(idea);
  const speed=_ideaVotesPerDay(idea);
  return votes>=IDEA_TREND_MIN_VOTES && ageDays<=IDEA_TREND_MAX_AGE_DAYS && speed>=IDEA_TREND_MIN_VOTES_PER_DAY;
}
function sortIdeasList(ideas, mode){
  const list=(ideas||[]).slice();
  if(mode==='recent'){
    return list.sort((a,b)=>_ideaTimestamp(b)-_ideaTimestamp(a) || (b.votes||0)-(a.votes||0));
  }
  return list.sort((a,b)=>(b.votes||0)-(a.votes||0) || _ideaTimestamp(b)-_ideaTimestamp(a));
}
function refreshIdeasSortUi(){
  const mode=_ideasSort;
  const pop=document.getElementById('ideas-sort-pop');
  const recent=document.getElementById('ideas-sort-recent');
  const mine=document.getElementById('ideas-sort-mine');
  if(pop) pop.classList.toggle('on', mode==='popular');
  if(recent) recent.classList.toggle('on', mode==='recent');
  if(mine) mine.classList.toggle('on', mode==='mine');
  const note=document.getElementById('ideas-sort-note');
  if(note){
    if(mode==='mine') note.textContent='Vos idées soumises depuis cet appareil';
    else if(mode==='recent') note.textContent='Tri par date la plus récente';
    else note.textContent='Tri par votes décroissants';
  }
}
function setIdeasSort(mode){
  _ideasSort = mode==='recent' ? 'recent' : mode==='mine' ? 'mine' : 'popular';
  try{ localStorage.setItem(IDEAS_SORT_KEY,_ideasSort); }catch(e){}
  refreshIdeasSortUi();
  loadIdees();
}

async function submitIdee(){
  const txt=document.getElementById('idea-input').value.trim();
  if(!txt){await alertMAT('Veuillez écrire votre idée !','Vos idées','💡');return;}
  const idea={id:Date.now(),text:txt,cat:ideaCat||'💡 Autre',votes:0,date:new Date().toLocaleDateString('fr-FR'),createdAt:new Date().toISOString()};
  const ideas=getIdeas(); ideas.unshift(idea); localStorage.setItem(IDEAS_KEY,JSON.stringify(ideas));
  rememberSeenIdeas([idea]);
  const notifyToken=(typeof crypto!=='undefined'&&crypto.randomUUID)?crypto.randomUUID():null;
  const pushSub=notifyToken?await _getPushSubForNotify():null;
  const ideaBody=Object.assign({},idea,notifyToken?{notifyToken,sub:pushSub||undefined}:{});
  try{await fetch('https://chatbot-mairie-mezieres.onrender.com/idee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(ideaBody)});}catch(e){}
  if(notifyToken){try{localStorage.setItem('mat:notify:idea:'+idea.id,notifyToken);}catch(_){}}
  try{ if(typeof refreshActusBadge==='function') refreshActusBadge(); }catch(e){}
  document.getElementById('idea-input').value=''; ideaCat=''; document.querySelectorAll('.idea-cat').forEach(b=>b.classList.remove('on'));
  loadIdees();
}

async function voteIdee(id){
  const votes=getVotes(); if(votes[id]) return;
  votes[id]=1; localStorage.setItem(VOTES_KEY,JSON.stringify(votes));
  try{await fetch('https://chatbot-mairie-mezieres.onrender.com/idee/'+id+'/vote',{method:'POST'});}catch(e){}
  loadIdees();
}

function _ideaStatusBadgePublic(status){
  if(!status) return '';
  const map={
    studying:["🔍 En cours d'étude","#2563eb"],
    accepted:["✅ Retenue","#16a34a"],
    rejected:["❌ Non retenue","#dc2626"]
  };
  const entry=map[status]; if(!entry) return '';
  return `<div style="display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:3px 9px;font-size:0.58rem;font-weight:900;text-transform:uppercase;letter-spacing:.04em;color:white;background:${entry[1]}">${entry[0]}</div>`;
}

async function loadIdees(){
  const votes=getVotes(); const el=document.getElementById('ideas-list');
  if(!el) return;
  refreshIdeasSortUi();
  el.innerHTML='<div class="no-ideas">Chargement…</div>';
  const allIdeas=sortIdeasList(await fetchIdeasList(), _ideasSort==='mine'?'popular':_ideasSort);
  const localIds=new Set(getIdeas().map(i=>String(i.id)));
  const ideas=_ideasSort==='mine'?allIdeas.filter(i=>localIds.has(String(i.id))):allIdeas;
  if(!ideas.length){
    el.innerHTML=_ideasSort==='mine'?'<div class="no-ideas">Aucune idée soumise depuis cet appareil.</div>':`<div class="no-ideas">Aucune idée pour l'instant.<br>Soyez le premier à proposer !</div>`;
    markIdeasAsSeen([]); return;
  }
  el.innerHTML=ideas.map(idea=>{
    const hot = isIdeaTrending(idea);
    const metaDate = idea.createdAt ? new Date(idea.createdAt).toLocaleDateString('fr-FR') : (idea.date||'');
    const statusBadge = _ideaStatusBadgePublic(idea.status);
    const commentHtml = idea.adminComment && idea.status ? `<div style="margin-top:7px;padding:7px 10px;background:var(--warm);border-left:3px solid var(--sage);border-radius:0 8px 8px 0;font-size:0.78rem;color:var(--text);line-height:1.45;font-style:italic">🏛️ ${esc(idea.adminComment)}</div>` : '';
    const safeStatus = ['studying','accepted','rejected'].includes(idea.status) ? idea.status : '';
    const statusClass = safeStatus ? ` idea-card--${safeStatus}` : '';
    return `<div class="idea-card${statusClass}"><div class="idea-votes"><button class="vote-btn ${votes[idea.id]?'voted':''}" onclick="voteIdee(${idea.id})">👍</button><div class="vote-count">${idea.votes||0}</div></div><div class="idea-content"><div class="idea-topline"><div class="idea-badges"><div class="idea-cat-badge">${esc(idea.cat)}</div>${hot?'<div class="idea-hot" title="Idée récente qui reçoit des votes rapidement">🔥 Tendance</div>':''}${statusBadge}</div></div><div class="idea-text">${esc(idea.text)}</div>${commentHtml}<div class="idea-date">${esc(metaDate)}</div></div></div>`;
  }).join('');
  markIdeasAsSeen(ideas);
}

// ── Contact mairie → Trello ────────────────────────────
function contactViaMessenger(){window.open('https://m.me/RadioMezieres','_blank');}

async function submitContactForm(){
  const name=document.getElementById('contact-name').value.trim();
  const reply=document.getElementById('contact-reply').value.trim();
  const msg=document.getElementById('contact-msg').value.trim();
  if(!msg){await alertMAT('Merci de renseigner votre message.','Contacter la mairie','💬');return;}
  const btn=document.querySelector('#contact-form .submit-btn');
  btn.textContent='Envoi…'; btn.disabled=true;
  try{
    await fetch(SIGNAL_URL,{
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        cat:'[Demande] Contact mairie',
        desc:'Nom/prénom : '+(name||'Non précisé')+'\nRéponse : '+(reply||'Non précisée')+'\n\nMessage : '+msg
      })
    });
    trackStat('contact');
    document.getElementById('contact-form').style.display='none';
    document.getElementById('contact-success').style.display='block';
  }catch(e){
    alertMAT('Erreur d\'envoi. Réessayez plus tard.','MAT','⚠️');
    btn.textContent='📤 Envoyer ma demande'; btn.disabled=false;
  }
}

function restoreContactFormState(){
  const btn=document.querySelector('#contact-form .submit-btn');
  if(btn){btn.textContent='📤 Envoyer ma demande'; btn.disabled=false;}
}

function resetContact(){
  document.getElementById('contact-form').style.display='block';
  document.getElementById('contact-success').style.display='none';
  ['contact-name','contact-reply','contact-msg'].forEach(id=>{document.getElementById(id).value='';});
  const btn=document.querySelector('#contact-form .submit-btn');
  if(btn){btn.textContent='📤 Envoyer ma demande';btn.disabled=false;}
  closeOv('contact');
}

// ── Bug report ───────────────────────────────────────────────
let bugService='';
function selBugService(btn,val){document.querySelectorAll('#bug-services .cat-btn').forEach(b=>b.classList.remove('on'));btn.classList.add('on');bugService=val;}
function previewBugPhoto(source){
  const inputId = source==='camera' ? 'bug-photo-camera-input' : 'bug-photo-input';
  _previewImageFromInput(inputId,'bug-photo-preview','bug-photo-actions','bug-photo-remove',['bug-photo-camera-input','bug-photo-input']);
}
function removeBugPhoto(){
  _removePreviewImage('bug-photo-preview','bug-photo-actions','bug-photo-remove',['bug-photo-camera-input','bug-photo-input']);
}

async function submitBug(){
  const desc=document.getElementById('bug-desc').value.trim();
  const btn=document.querySelector('#bug-form .submit-btn');
  const photoEl=document.getElementById('bug-photo-preview');
  btn.textContent='Envoi…'; btn.disabled=true;
  let photoB64='';
  if(photoEl && photoEl.style.display !== 'none' && photoEl.src){
    try{ photoB64 = await compressImage(photoEl.src, 1200, 0.75); }
    catch(e){ photoB64 = photoEl.src.substring(0, 120000); }
  }
  const signalId=Date.now();
  const notifyToken=(typeof crypto!=='undefined'&&crypto.randomUUID)?crypto.randomUUID():null;
  const pushSub=notifyToken?await _getPushSubForNotify():null;
  try{
    const dev = detectDevice();
    const descFull = 'Appareil : '+dev.type
      +'\nModèle : '+dev.model
      +'\nOS : '+dev.os
      +'\nNavigateur : '+dev.browser
      +'\nÉcran : '+dev.screen
      +'\nPWA : '+dev.pwa
      +'\nMAT : '+dev.matVersion
      +'\n\nDescription :\n'+desc;
    const bugBody={cat:'[BUG] '+(bugService||'Non précisé'),desc:descFull,type:'bug',photoB64,
      ...(notifyToken?{notifyToken,sub:pushSub||undefined}:{})};
    await fetch('https://chatbot-mairie-mezieres.onrender.com/signal',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify(bugBody)
    });
    if(notifyToken){try{localStorage.setItem('mat:notify:signal:'+signalId,notifyToken);}catch(_){}}
    _saveMySig(signalId, bugService||'Non précisé', 'bug');
    trackStat('bug');
    document.getElementById('bug-form').style.display='none';
    document.getElementById('bug-success').style.display='block';
  }catch(e){
    alertMAT('Erreur d\'envoi. Réessayez plus tard.','MAT','⚠️');
    btn.textContent='📤 Envoyer le rapport'; btn.disabled=false;
  }
}

function restoreBugFormState(){
  const btn=document.querySelector('#bug-form .submit-btn');
  if(btn){btn.textContent='📤 Envoyer le rapport'; btn.disabled=false;}
}

function resetBug(){
  document.getElementById('bug-form').style.display='block';
  document.getElementById('bug-success').style.display='none';
  document.getElementById('bug-desc').value='';
  removeBugPhoto();
  bugService='';
  document.querySelectorAll('#bug-services .cat-btn').forEach(b=>b.classList.remove('on'));
  restoreBugFormState();
  closeOv('bug');
}

// ── Suivi public des signalements ─────────────────────────────
let _suiviItems=[], _suiviFilter='all';
let _suiviView='list', _suiviMap=null, _suiviMarkers=[], _leafletPromise=null;

// Chargement paresseux de Leaflet (auto-hébergé, uniquement à l'ouverture
// de la carte). Fichiers servis depuis ./vendor/leaflet/ (souveraineté :
// plus de dépendance au CDN unpkg) — byte-identiques à Leaflet 1.9.4.
function _loadLeaflet(){
  if(window.L) return Promise.resolve();
  if(_leafletPromise) return _leafletPromise;
  _leafletPromise=new Promise((resolve,reject)=>{
    const css=document.createElement('link');
    css.rel='stylesheet';
    css.href='./vendor/leaflet/leaflet.css';
    document.head.appendChild(css);
    const s=document.createElement('script');
    s.src='./vendor/leaflet/leaflet.js';
    s.onload=()=>resolve();
    s.onerror=()=>{ _leafletPromise=null; reject(new Error('leaflet load failed')); };
    document.head.appendChild(s);
  });
  return _leafletPromise;
}

function _suiviToggleHtml(){
  const b='border:1px solid var(--border);background:var(--card);border-radius:999px;padding:4px 14px;font-size:.72rem;cursor:pointer;font-family:inherit;font-weight:700';
  return `<div id="suivi-viewtoggle" style="display:flex;gap:6px;margin-bottom:10px">
    <button data-v="list" onclick="setSuiviView('list')" style="${b}">📋 Liste</button>
    <button data-v="map" onclick="setSuiviView('map')" style="${b}">🗺️ Carte</button>
  </div>`;
}

function _suiviFilteredItems(){
  const myTokens=new Set((()=>{try{return Object.keys(localStorage).filter(k=>k.startsWith('mat:notify:signal:')).map(k=>localStorage.getItem(k)).filter(Boolean);}catch(_){return[];}})());
  if(_suiviFilter==='all') return _suiviItems;
  if(_suiviFilter==='mine') return _suiviItems.filter(s=>(s.matRef&&myTokens.has(s.matRef))||_matchMySig(s));
  return _suiviItems.filter(s=>s.status===_suiviFilter);
}

async function setSuiviView(v){
  _suiviView=v;
  const cards=document.getElementById('suivi-cards');
  const map=document.getElementById('suivi-map');
  document.querySelectorAll('#suivi-viewtoggle button').forEach(btn=>{
    const on=btn.dataset.v===v;
    btn.style.background=on?'var(--forest)':'var(--card)';
    btn.style.color=on?'#fff':'var(--text)';
    btn.style.borderColor=on?'var(--forest)':'var(--border)';
  });
  if(v==='map'){
    if(cards) cards.style.display='none';
    if(map) map.style.display='block';
    await _renderSuiviMap();
  } else {
    if(map) map.style.display='none';
    if(cards){ cards.style.display='block'; _renderSuiviCards(); }
  }
}

// Carte affichée en haut de l'overlay de signalement (tous les signalements)
let _signalMap=null, _signalMarkers=[];
async function loadSignalMap(){
  const el=document.getElementById('signal-map');
  if(!el) return;
  let items=[];
  try{
    const r=await fetch('https://chatbot-mairie-mezieres.onrender.com/api/signalements');
    if(r.ok){ const d=await r.json(); items=(d.signalements||[]).filter(s=>typeof s.lat==='number'&&typeof s.lon==='number'); }
  }catch(_){}
  try{ await _loadLeaflet(); }
  catch(_){ el.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--muted);font-size:.8rem;text-align:center;padding:16px">Carte indisponible.<br>Vérifiez votre connexion.</div>'; return; }
  if(!_signalMap){
    _signalMap=L.map(el,{scrollWheelZoom:false}).setView([47.822,1.808],14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(_signalMap);
  }
  _signalMarkers.forEach(m=>_signalMap.removeLayer(m));
  _signalMarkers=[];
  const bounds=[];
  for(const s of items){
    const color=s.status==='resolved'?'#10b981':s.status==='in_progress'?'#3b82f6':'#f59e0b';
    const mk=L.circleMarker([s.lat,s.lon],{radius:9,color:'#fff',weight:2,fillColor:color,fillOpacity:0.9}).addTo(_signalMap);
    const photo=(s.photos&&s.photos[0])?`<img src="${esc(s.photos[0].url)}" style="width:100%;max-height:120px;object-fit:cover;border-radius:6px;margin-top:6px">`:'';
    mk.bindPopup(`<strong>${esc(s.cat)}</strong><br><span style="color:#666;font-size:.85em">${esc(s.statusLabel||'À traiter')}</span>${photo}`);
    _signalMarkers.push(mk); bounds.push([s.lat,s.lon]);
  }
  if(bounds.length) _signalMap.fitBounds(bounds,{padding:[30,30],maxZoom:16});
  setTimeout(()=>{ try{ _signalMap.invalidateSize(); }catch(_){} },150);
}

async function _renderSuiviMap(){
  const el=document.getElementById('suivi-map');
  if(!el) return;
  try{ await _loadLeaflet(); }
  catch(_){ el.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--muted);font-size:.8rem;text-align:center;padding:16px">Carte indisponible.<br>Vérifiez votre connexion.</div>'; return; }
  const items=_suiviFilteredItems().filter(s=>typeof s.lat==='number'&&typeof s.lon==='number');
  if(!_suiviMap){
    _suiviMap=L.map(el,{scrollWheelZoom:false}).setView([47.822,1.808],14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(_suiviMap);
  }
  _suiviMarkers.forEach(m=>_suiviMap.removeLayer(m));
  _suiviMarkers=[];
  const bounds=[];
  for(const s of items){
    const color=s.status==='resolved'?'#10b981':s.status==='in_progress'?'#3b82f6':'#f59e0b';
    const mk=L.circleMarker([s.lat,s.lon],{radius:9,color:'#fff',weight:2,fillColor:color,fillOpacity:0.9}).addTo(_suiviMap);
    const photo=(s.photos&&s.photos[0])?`<img src="${esc(s.photos[0].url)}" style="width:100%;max-height:120px;object-fit:cover;border-radius:6px;margin-top:6px">`:'';
    mk.bindPopup(`<strong>${esc(s.cat)}</strong><br><span style="color:#666;font-size:.85em">${esc(s.statusLabel||'À traiter')}</span>${photo}`);
    _suiviMarkers.push(mk); bounds.push([s.lat,s.lon]);
  }
  if(bounds.length) _suiviMap.fitBounds(bounds,{padding:[30,30],maxZoom:16});
  // recalcul de taille après l'animation d'ouverture de l'overlay
  setTimeout(()=>{ try{ _suiviMap.invalidateSize(); }catch(_){} },120);
}
const _suiviStCfg={
  pending:     {bg:'#fef3c7',color:'#92400e',label:'À traiter',ico:'🟡'},
  in_progress: {bg:'#dbeafe',color:'#1e40af',label:'En cours', ico:'🔵'},
  resolved:    {bg:'#d1fae5',color:'#065f46',label:'Résolu',   ico:'🟢'},
};

function filterSuivi(f){
  _suiviFilter=f;
  document.querySelectorAll('#suivi-filter-bar button').forEach(b=>{
    const on=b.dataset.f===f;
    b.style.fontWeight=on?'800':'600';
    b.style.opacity=on?'1':'0.6';
    b.style.borderWidth=on?'2px':'1px';
  });
  if(_suiviView==='map') _renderSuiviMap(); else _renderSuiviCards();
}

function _matchMySig(s){
  try{
    const myList=JSON.parse(localStorage.getItem('mat_my_signals_v1')||'[]');
    const sd=new Date(s.date).getTime();
    return myList.some(m=>{
      const md=new Date(m.date).getTime();
      return Math.abs(sd-md)<300000;
    });
  }catch(_){return false;}
}

function _renderSuiviCards(){
  const el=document.getElementById('suivi-cards');
  if(!el) return;
  const myTokens=new Set((()=>{try{return Object.keys(localStorage).filter(k=>k.startsWith('mat:notify:signal:')).map(k=>localStorage.getItem(k)).filter(Boolean);}catch(_){return[];}})());
  const items=_suiviFilter==='all'?_suiviItems:_suiviFilter==='mine'?_suiviItems.filter(s=>(s.matRef&&myTokens.has(s.matRef))||_matchMySig(s)):_suiviItems.filter(s=>s.status===_suiviFilter);
  if(!items.length){
    el.innerHTML='<div style="text-align:center;padding:24px;color:var(--muted)">Aucun élément pour ce statut.</div>';
    return;
  }
  let html='';
  for(const s of items){
    const st=_suiviStCfg[s.status]||_suiviStCfg.pending;
    const d=new Date(s.date);
    const ds=isNaN(d)?'':d.toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'});
    const descHtml=s.desc?`<div style="font-size:.72rem;color:var(--muted);margin:.4rem 0;line-height:1.5;white-space:pre-wrap">${esc(s.desc)}</div>`:'';
    const photosHtml=(s.photos||[]).map(p=>`<img src="${esc(p.url)}" loading="lazy" style="width:100%;max-height:320px;object-fit:contain;border-radius:8px;display:block;margin:.4rem 0;background:#f3f4f6">`).join('');
    const commentsHtml=(s.comments||[]).map(c=>{
      const cd=new Date(c.date);
      const cds=isNaN(cd)?'':cd.toLocaleDateString('fr-FR',{day:'2-digit',month:'short'});
      return `<div class="suivi-comment"><span class="suivi-comment-author">Mairie · ${esc(cds)}</span><br>${esc(c.text)}</div>`;
    }).join('');
    html+=`<div style="border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:10px;background:var(--card)">
<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px">
<div style="font-weight:700;font-size:.82rem">${esc(s.cat)}</div>
<span style="font-size:.62rem;padding:2px 8px;border-radius:999px;background:${st.bg};color:${st.color};font-weight:700;flex-shrink:0">${esc(s.statusLabel||'À traiter')}</span>
</div>
<div style="font-size:.65rem;color:var(--muted);margin-bottom:6px">${esc(ds)}</div>
${descHtml}${photosHtml}${commentsHtml}
</div>`;
  }
  el.innerHTML=html;
}

function openSuivi(type){
  const titleEl=document.querySelector('#ov-suivi .panel-title');
  const icoEl=document.querySelector('#ov-suivi .panel-ico');
  if(type==='bugs'){
    if(titleEl) titleEl.textContent='Suivi des bugs';
    if(icoEl) icoEl.textContent='🐞';
  } else {
    if(titleEl) titleEl.textContent='Suivi des signalements';
    if(icoEl) icoEl.textContent='📋';
  }
  openOv('suivi');
  loadSuivi(type);
}

async function loadSuivi(type){
  _suiviFilter='all';
  _suiviView='list';
  if(_suiviMap){ try{ _suiviMap.remove(); }catch(_){} _suiviMap=null; _suiviMarkers=[]; }
  const body=document.getElementById('suivi-body');
  if(!body) return;
  body.innerHTML='<div style="text-align:center;padding:24px;color:var(--muted)">Chargement…</div>';
  try{
    const r=await fetch('https://chatbot-mairie-mezieres.onrender.com/api/signalements');
    if(!r.ok) throw new Error('HTTP '+r.status);
    const data=await r.json();
    _suiviItems=(type==='bugs' ? (data.bugs||[]) : (data.signalements||[])).map(s=>({...s,status:(s.status in _suiviStCfg)?s.status:'pending'}));
    if(!_suiviItems.length){
      body.innerHTML='<div style="text-align:center;padding:32px;color:var(--muted)">Aucun élément pour l\'instant.</div>';
      return;
    }
    const cnt={all:_suiviItems.length,pending:0,in_progress:0,resolved:0};
    for(const s of _suiviItems){ if(s.status in cnt) cnt[s.status]++; }
    const btnBase='border-radius:999px;padding:4px 12px;font-size:.7rem;cursor:pointer;border:1px solid;font-family:inherit;';
    const myTokens=new Set((()=>{try{return Object.keys(localStorage).filter(k=>k.startsWith('mat:notify:signal:')).map(k=>localStorage.getItem(k)).filter(Boolean);}catch(_){return[];}})());
    const myCount=_suiviItems.filter(s=>(s.matRef&&myTokens.has(s.matRef))||_matchMySig(s)).length||0;
    const mkBtn=(f,ico,lbl,n)=>n===0&&f!=='all'&&f!=='mine'?'':`<button data-f="${f}" onclick="filterSuivi('${f}')" style="${btnBase}background:${f==='all'||f==='mine'?'var(--forest)':_suiviStCfg[f]?.bg||'#f3f4f6'};color:${f==='all'||f==='mine'?'white':_suiviStCfg[f]?.color||'#374151'};font-weight:${f==='all'||f==='mine'?'800':'600'};border-color:${f==='all'||f==='mine'?'var(--forest)':_suiviStCfg[f]?.color||'#9ca3af'};opacity:${f==='all'||f==='mine'?'1':'0.6'}">${ico} ${lbl}${n>0?' <strong>'+n+'</strong>':''}</button>`;
    body.innerHTML=`${_suiviToggleHtml()}<div id="suivi-filter-bar" style="display:flex;gap:6px;flex-wrap:wrap;padding-bottom:10px;margin-bottom:10px;border-bottom:1px solid var(--border)">${mkBtn('all','📋','Tous',cnt.all)}${mkBtn('mine','👤','Mes signalements',myCount)}${mkBtn('pending','🟡','À traiter',cnt.pending)}${mkBtn('in_progress','🔵','En cours',cnt.in_progress)}${mkBtn('resolved','🟢','Résolu',cnt.resolved)}</div><div id="suivi-cards"></div><div id="suivi-map" style="display:none;height:340px;border-radius:12px;overflow:hidden;border:1px solid var(--border)"></div>`;
    setSuiviView('list');
  }catch(e){
    body.innerHTML='<div style="text-align:center;padding:24px;color:#dc2626">Impossible de charger les données.</div>';
  }
}
