/* ════════════════════════════════════════════════════════════
   MAT — Formulaires v3.7.3
   Signalement, contact, bug, idées
   ════════════════════════════════════════════════════════════ */

// ── Signalement → Trello ─────────────────────────────────
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
  document.getElementById('loc-btn').textContent='\uD83D\uDCCD Localisation en cours\u2026';
  navigator.geolocation.getCurrentPosition(pos=>{
    sigLat=pos.coords.latitude.toFixed(5); sigLon=pos.coords.longitude.toFixed(5);
    document.getElementById('loc-btn').textContent='\u2705 Position obtenue ('+sigLat+', '+sigLon+')';
    document.getElementById('loc-btn').classList.add('on');
    document.getElementById('loc-status').textContent='';
  },()=>{document.getElementById('loc-btn').textContent='\u274C Position refus\u00E9e';document.getElementById('loc-status').textContent='Activez la localisation dans les param\u00E8tres';});
}

async function submitSignal(){
  const desc=document.getElementById('signal-desc').value.trim();
  const photoEl=document.getElementById('signal-photo-preview');
  const btn=document.querySelector('#signal-form .submit-btn');
  btn.textContent='Envoi en cours\u2026'; btn.disabled=true;

  // Compresser la photo (max 800px, qualité 0.7)
  let photoB64 = '';
  if(photoEl.style.display !== 'none' && photoEl.src){
    try{ photoB64 = await compressImage(photoEl.src, 800, 0.7); }
    catch(e){ photoB64 = photoEl.src.substring(0, 80000); }
  }

  const _dev = detectDevice();
  const descWithDevice = desc + (desc ? '\n\n' : '') + '\uD83D\uDCF1 ' + _dev.type + ' \u00B7 ' + _dev.os + ' \u00B7 ' + _dev.browser + ' \u00B7 ' + _dev.pwa;
  const body={cat:sigCat||'Non pr\u00E9cis\u00E9',desc:descWithDevice,lat:sigLat,lon:sigLon,photoB64};
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(), 35000);
  try{
    const r = await fetch(SIGNAL_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
    clearTimeout(timer);
    document.getElementById('signal-form').style.display='none';
    document.getElementById('signal-success').style.display='block';
  }catch(e){
    clearTimeout(timer);
    if(e.name==='AbortError'){
      document.getElementById('signal-form').style.display='none';
      document.getElementById('signal-success').style.display='block';
    } else {
      alertMAT('Erreur d\'envoi. V\u00E9rifiez votre connexion.','Signalement','\u26A0\uFE0F');
      btn.textContent='\uD83D\uDCE4 Envoyer le signalement'; btn.disabled=false;
    }
  }
}

function restoreSignalFormState(){
  const btn=document.querySelector('#signal-form .submit-btn');
  if(btn){btn.textContent='\uD83D\uDCE4 Envoyer le signalement'; btn.disabled=false;}
}

function resetSignal(){
  document.getElementById('signal-form').style.display='block';
  document.getElementById('signal-success').style.display='none';
  document.getElementById('signal-desc').value='';
  removeSignalPhoto();
  document.querySelectorAll('#signal-cats .cat-btn').forEach(b=>b.classList.remove('on'));
  sigCat='';sigLat='';sigLon='';
  document.getElementById('loc-btn').textContent='\uD83D\uDCCD Utiliser ma position GPS';
  document.getElementById('loc-btn').classList.remove('on');
  restoreSignalFormState();
}

// ── Boîte à idées ─────────────────────────────────────────
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
  const mode=_ideasSort==='recent'?'recent':'popular';
  const pop=document.getElementById('ideas-sort-pop');
  const recent=document.getElementById('ideas-sort-recent');
  if(pop) pop.classList.toggle('on', mode==='popular');
  if(recent) recent.classList.toggle('on', mode==='recent');
  const note=document.getElementById('ideas-sort-note');
  if(note) note.textContent = mode==='recent' ? 'Tri par date la plus r\u00E9cente' : 'Tri par votes d\u00E9croissants';
}
function setIdeasSort(mode){
  _ideasSort = mode==='recent' ? 'recent' : 'popular';
  try{ localStorage.setItem(IDEAS_SORT_KEY,_ideasSort); }catch(e){}
  refreshIdeasSortUi();
  loadIdees();
}

async function submitIdee(){
  const txt=document.getElementById('idea-input').value.trim();
  if(!txt){await alertMAT('Veuillez \u00E9crire votre id\u00E9e !','Vos id\u00E9es','\uD83D\uDCA1');return;}
  const idea={id:Date.now(),text:txt,cat:ideaCat||'\uD83D\uDCA1 Autre',votes:0,date:new Date().toLocaleDateString('fr-FR'),createdAt:new Date().toISOString()};
  const ideas=getIdeas(); ideas.unshift(idea); localStorage.setItem(IDEAS_KEY,JSON.stringify(ideas));
  rememberSeenIdeas([idea]);
  try{await fetch('https://chatbot-mairie-mezieres.onrender.com/idee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(idea)});}catch(e){}
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
    studying:['\uD83D\uDD0D En cours d\u2019\u00E9tude','#2563eb'],
    accepted:['\u2705 Retenue','#16a34a'],
    rejected:['\u274C Non retenue','#dc2626']
  };
  const entry=map[status]; if(!entry) return '';
  return `<div style="display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:3px 9px;font-size:0.58rem;font-weight:900;text-transform:uppercase;letter-spacing:.04em;color:white;background:${entry[1]}">${entry[0]}</div>`;
}

async function loadIdees(){
  const votes=getVotes(); const el=document.getElementById('ideas-list');
  if(!el) return;
  refreshIdeasSortUi();
  el.innerHTML='<div class="no-ideas">Chargement\u2026</div>';
  const ideas=sortIdeasList(await fetchIdeasList(), _ideasSort);
  if(!ideas.length){el.innerHTML=`<div class="no-ideas">Aucune id\u00E9e pour l'instant.<br>Soyez le premier \u00E0 proposer !</div>`; markIdeasAsSeen([]); return;}
  el.innerHTML=ideas.map(idea=>{
    const hot = isIdeaTrending(idea);
    const metaDate = idea.createdAt ? new Date(idea.createdAt).toLocaleDateString('fr-FR') : (idea.date||'');
    const statusBadge = _ideaStatusBadgePublic(idea.status);
    const commentHtml = idea.adminComment && idea.status ? `<div style="margin-top:7px;padding:7px 10px;background:var(--warm);border-left:3px solid var(--sage);border-radius:0 8px 8px 0;font-size:0.78rem;color:var(--text);line-height:1.45;font-style:italic">\uD83C\uDFDB\uFE0F ${esc(idea.adminComment)}</div>` : '';
    return `<div class="idea-card"><div class="idea-votes"><button class="vote-btn ${votes[idea.id]?'voted':''}" onclick="voteIdee(${idea.id})">\uD83D\uDC4D</button><div class="vote-count">${idea.votes||0}</div></div><div class="idea-content"><div class="idea-topline"><div class="idea-badges"><div class="idea-cat-badge">${esc(idea.cat)}</div>${hot?'<div class="idea-hot" title="Id\u00E9e r\u00E9cente qui re\u00E7oit des votes rapidement">\uD83D\uDD25 Tendance</div>':''}${statusBadge}</div></div><div class="idea-text">${esc(idea.text)}</div>${commentHtml}<div class="idea-date">${esc(metaDate)}</div></div></div>`;
  }).join('');
  markIdeasAsSeen(ideas);
}

// ── Contact mairie → Trello ────────────────────────────
function contactViaMessenger(){window.open('https://m.me/RadioMezieres','_blank');}

async function submitContactForm(){
  const name=document.getElementById('contact-name').value.trim();
  const reply=document.getElementById('contact-reply').value.trim();
  const msg=document.getElementById('contact-msg').value.trim();
  if(!msg){await alertMAT('Merci de renseigner votre message.','Contacter la mairie','\uD83D\uDCAC');return;}
  const btn=document.querySelector('#contact-form .submit-btn');
  btn.textContent='Envoi\u2026'; btn.disabled=true;
  try{
    await fetch(SIGNAL_URL,{
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        cat:'[Demande] Contact mairie',
        desc:'Nom/pr\u00E9nom : '+(name||'Non pr\u00E9cis\u00E9')+'\nR\u00E9ponse : '+(reply||'Non pr\u00E9cis\u00E9e')+'\n\nMessage : '+msg
      })
    });
    trackStat('contact');
    document.getElementById('contact-form').style.display='none';
    document.getElementById('contact-success').style.display='block';
  }catch(e){
    alertMAT('Erreur d\'envoi. R\u00E9essayez plus tard.','MAT','\u26A0\uFE0F');
    btn.textContent='\uD83D\uDCE4 Envoyer ma demande'; btn.disabled=false;
  }
}

function restoreContactFormState(){
  const btn=document.querySelector('#contact-form .submit-btn');
  if(btn){btn.textContent='\uD83D\uDCE4 Envoyer ma demande'; btn.disabled=false;}
}

function resetContact(){
  document.getElementById('contact-form').style.display='block';
  document.getElementById('contact-success').style.display='none';
  ['contact-name','contact-reply','contact-msg'].forEach(id=>{document.getElementById(id).value='';});
  const btn=document.querySelector('#contact-form .submit-btn');
  if(btn){btn.textContent='\uD83D\uDCE4 Envoyer ma demande';btn.disabled=false;}
  closeOv('contact');
}

// ── Bug report ───────────────────────────────────────────
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
  btn.textContent='Envoi\u2026'; btn.disabled=true;
  let photoB64='';
  if(photoEl && photoEl.style.display !== 'none' && photoEl.src){
    try{ photoB64 = await compressImage(photoEl.src, 1200, 0.75); }
    catch(e){ photoB64 = photoEl.src.substring(0, 120000); }
  }
  try{
    await fetch('https://chatbot-mairie-mezieres.onrender.com/signal',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:(()=>{
        const dev = detectDevice();
        const descFull = 'Appareil : '+dev.type
          +'\nMod\u00E8le : '+dev.model
          +'\nOS : '+dev.os
          +'\nNavigateur : '+dev.browser
          +'\n\u00C9cran : '+dev.screen
          +'\nPWA : '+dev.pwa
          +'\nMAT : '+dev.matVersion
          +'\n\nDescription :\n'+desc;
        return JSON.stringify({cat:'[BUG] '+(bugService||'Non pr\u00E9cis\u00E9'),desc:descFull,type:'bug',photoB64});
      })()
    });
    trackStat('bug');
    document.getElementById('bug-form').style.display='none';
    document.getElementById('bug-success').style.display='block';
  }catch(e){
    alertMAT('Erreur d\'envoi. R\u00E9essayez plus tard.','MAT','\u26A0\uFE0F');
    btn.textContent='\uD83D\uDCE4 Envoyer le rapport'; btn.disabled=false;
  }
}

function restoreBugFormState(){
  const btn=document.querySelector('#bug-form .submit-btn');
  if(btn){btn.textContent='\uD83D\uDCE4 Envoyer le rapport'; btn.disabled=false;}
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
