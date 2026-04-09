/* ════════════════════════════════════════════════════════════
   MAT — Formulaires v3.7.0
   Signalement, contact, bug, idées
   ════════════════════════════════════════════════════════════ */

// ── Signalement → Trello ─────────────────────────────────
let sigCat='',sigLat='',sigLon='';
function selCat(btn,cat){
  document.querySelectorAll('#signal-cats .cat-btn').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on'); sigCat=cat;
}
function previewPhoto(){
  const file=document.getElementById('signal-photo-input').files[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{
    const prev=document.getElementById('signal-photo-preview');
    prev.src=e.target.result; prev.style.display='block';
    document.querySelector('.photo-btn').style.display='none';
  };
  reader.readAsDataURL(file);
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

  const _dev = detectDevice();
  const descWithDevice = desc + (desc ? '\n\n' : '') + '📱 ' + _dev.type + ' · ' + _dev.os + ' · ' + _dev.browser + ' · ' + _dev.pwa;
  const body={cat:sigCat||'Non précisé',desc:descWithDevice,lat:sigLat,lon:sigLon,photoB64};
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
  document.getElementById('signal-photo-preview').style.display='none';
  document.querySelector('.photo-btn').style.display='block';
  document.querySelectorAll('#signal-cats .cat-btn').forEach(b=>b.classList.remove('on'));
  sigCat='';sigLat='';sigLon='';
  document.getElementById('loc-btn').textContent='📍 Utiliser ma position GPS';
  document.getElementById('loc-btn').classList.remove('on');
  restoreSignalFormState();
}

// ── Boîte à idées ─────────────────────────────────────────
const IDEAS_KEY='mat_ideas_v3', VOTES_KEY='mat_votes_v3';
let ideaCat='';
function selIdeaCat(btn,cat){document.querySelectorAll('.idea-cat').forEach(b=>b.classList.remove('on'));btn.classList.add('on');ideaCat=cat;}
function getIdeas(){try{return JSON.parse(localStorage.getItem(IDEAS_KEY)||'[]');}catch(e){return[];}}
function getVotes(){try{return JSON.parse(localStorage.getItem(VOTES_KEY)||'{}');}catch(e){return {};}}

async function submitIdee(){
  const txt=document.getElementById('idea-input').value.trim();
  if(!txt){await alertMAT('Veuillez écrire votre idée !','Vos idées','💡');return;}
  const idea={id:Date.now(),text:txt,cat:ideaCat||'💡 Autre',votes:0,date:new Date().toLocaleDateString('fr-FR')};
  const ideas=getIdeas(); ideas.unshift(idea); localStorage.setItem(IDEAS_KEY,JSON.stringify(ideas));
  try{await fetch('https://chatbot-mairie-mezieres.onrender.com/idee',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(idea)});}catch(e){}
  document.getElementById('idea-input').value=''; ideaCat=''; document.querySelectorAll('.idea-cat').forEach(b=>b.classList.remove('on'));
  loadIdees();
}

async function voteIdee(id){
  const votes=getVotes(); if(votes[id]) return;
  votes[id]=1; localStorage.setItem(VOTES_KEY,JSON.stringify(votes));
  try{await fetch('https://chatbot-mairie-mezieres.onrender.com/idee/'+id+'/vote',{method:'POST'});}catch(e){}
  loadIdees();
}

async function loadIdees(){
  const votes=getVotes(); const el=document.getElementById('ideas-list');
  el.innerHTML='<div class="no-ideas">Chargement…</div>';
  let ideas=[];
  try{
    const r=await fetch('https://chatbot-mairie-mezieres.onrender.com/idees');
    const d=await r.json(); ideas=d.idees||[];
    const local=getIdeas().filter(li=>!ideas.find(si=>si.id===li.id));
    ideas=[...local,...ideas].sort((a,b)=>(b.votes||0)-(a.votes||0));
  }catch(e){ideas=getIdeas().sort((a,b)=>(b.votes||0)-(a.votes||0));}
  if(!ideas.length){el.innerHTML='<div class="no-ideas">Aucune idée pour l\'instant.<br>Soyez le premier à proposer !</div>';return;}
  el.innerHTML=ideas.map(idea=>`<div class="idea-card"><div class="idea-votes"><button class="vote-btn ${votes[idea.id]?'voted':''}" onclick="voteIdee(${idea.id})">👍</button><div class="vote-count">${idea.votes||0}</div></div><div class="idea-content"><div class="idea-cat-badge">${esc(idea.cat)}</div><div class="idea-text">${esc(idea.text)}</div><div class="idea-date">${esc(idea.date)}</div></div></div>`).join('');
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

// ── Bug report ───────────────────────────────────────────
let bugService='';
function selBugService(btn,val){document.querySelectorAll('#bug-services .cat-btn').forEach(b=>b.classList.remove('on'));btn.classList.add('on');bugService=val;}

async function submitBug(){
  const desc=document.getElementById('bug-desc').value.trim();
  const btn=document.querySelector('#bug-form .submit-btn');
  btn.textContent='Envoi…'; btn.disabled=true;
  try{
    await fetch('https://chatbot-mairie-mezieres.onrender.com/signal',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:(()=>{
        const dev = detectDevice();
        const descFull = 'Appareil : '+dev.type
          +'\nModèle : '+dev.model
          +'\nOS : '+dev.os
          +'\nNavigateur : '+dev.browser
          +'\nÉcran : '+dev.screen
          +'\nPWA : '+dev.pwa
          +'\nMAT : '+dev.matVersion
          +'\n\nDescription :\n'+desc;
        return JSON.stringify({cat:'[BUG] '+(bugService||'Non précisé'),desc:descFull,type:'bug'});
      })()
    });
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
  bugService='';
  document.querySelectorAll('#bug-services .cat-btn').forEach(b=>b.classList.remove('on'));
  restoreBugFormState();
  closeOv('bug');
}
