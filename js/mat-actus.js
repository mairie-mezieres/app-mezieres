/* ════════════════════════════════════════════════════════════
   MAT — Actualités & Notifications Push v3.7.3
   ════════════════════════════════════════════════════════════ */

// ── Actualités ──────────────────────────────────────────
const ACTUS_SEEN_KEY='mat_actus_seen_v1';
const IDEAS_SEEN_BADGE_KEY='mat_ideas_seen_v1';
const ACTUS_ROUTE_PREFIX='#actu=';
let _actusCache = null;
let _actusCacheAt = 0;
const ACTUS_CACHE_MS = 30000;

function getActuKey(a){
  return [a.date||'',a.title||'',a.photo||''].join('||');
}

function getIdeaBadgeKey(idea){
  return [(idea&&idea.id)||'',(idea&&idea.date)||'',(idea&&idea.text)||''].join('||');
}

function getActuId(a){
  return a && a.id != null ? String(a.id) : '';
}

function getActuPlainDescription(a){
  if(a && a.description && String(a.description).trim()) return String(a.description).trim();
  const fullText=((a && (a.text||a.title))||'').replace(/#app-mezieres/gi,'').trim();
  const lines=fullText.split(/\r?\n/).map(l=>l.trim()).filter(l=>l.length>0);
  return lines.length>1 ? lines.slice(1).join('\n') : '';
}

function getActuDisplayTitle(a){
  if(!a) return 'Actualité';
  if(a.title && String(a.title).trim()) return String(a.title).replace(/#app-mezieres/gi,'').trim();
  const fullText=((a.text||'')+'').replace(/#app-mezieres/gi,'').trim();
  const lines=fullText.split(/\r?\n/).map(l=>l.trim()).filter(l=>l.length>0);
  return lines[0] || 'Actualité';
}

function getActuPreviewDescription(a, maxLen){
  const txt=getActuPlainDescription(a);
  if(!txt) return '';
  const oneLine=txt.replace(/\s+/g,' ').trim();
  const limit=maxLen||180;
  return oneLine.length>limit ? oneLine.substring(0,limit-1)+'…' : oneLine;
}

function actuHash(id){
  return ACTUS_ROUTE_PREFIX + encodeURIComponent(String(id||''));
}

function setActuHash(id){
  try{ history.replaceState(history.state||{},'',actuHash(id)); }
  catch(e){ location.hash=actuHash(id); }
}

function clearActuHash(){
  try{
    if((location.hash||'').indexOf(ACTUS_ROUTE_PREFIX)===0){
      history.replaceState(history.state||{},'',location.pathname+location.search);
    }
  }catch(e){}
}

async function fetchActus(force){
  const fresh = _actusCache && (Date.now()-_actusCacheAt < ACTUS_CACHE_MS);
  if(!force && fresh) return _actusCache;
  const r=await fetch(ACTU_URL,{cache:'no-store'});
  if(!r.ok) throw new Error('HTTP '+r.status);
  const d=await r.json();
  _actusCache=d.actus||[];
  _actusCacheAt=Date.now();
  return _actusCache;
}

async function fetchIdeasForBadge(){
  try{
    if(typeof fetchIdeasList==='function') return await fetchIdeasList();
  }catch(e){}
  try{
    const r=await fetch('https://chatbot-mairie-mezieres.onrender.com/idees',{cache:'no-store'});
    const d=await r.json();
    return d.idees||[];
  }catch(e){
    try{ return typeof getIdeas==='function' ? getIdeas() : []; }catch(_e){ return []; }
  }
}

function getUnseenIdeasCount(ideas){
  try{
    if(typeof getUnreadIdeasCount==='function') return getUnreadIdeasCount(ideas||[]);
  }catch(e){}
  const seen=JSON.parse(localStorage.getItem(IDEAS_SEEN_BADGE_KEY)||'[]');
  return (ideas||[]).filter(idea=>!seen.includes(getIdeaBadgeKey(idea))).length;
}

function updateActuBadge(count, titleTxt){
  const el=document.getElementById('notif-unread-badge');
  if(!el) return;
  const n=Number(count)||0;
  el.textContent=n>99?'99+':String(n);
  el.classList.toggle('show', n>0);
  if(titleTxt) el.title=titleTxt;
  else el.removeAttribute('title');
  updateAppBadge(n);
}

function markActusAsSeen(actus){
  try{
    const keys=(actus||[]).map(getActuKey);
    localStorage.setItem(ACTUS_SEEN_KEY, JSON.stringify(keys));
  }catch(e){}
  try{ refreshActusBadge(); }catch(e){}
}

function ensureNotifIdeasCalloutBox(){
  const actusList=document.getElementById('actu-list');
  if(!actusList || !actusList.parentNode) return null;
  let box=document.getElementById('notif-ideas-callout');
  if(!box){
    box=document.createElement('div');
    box.id='notif-ideas-callout';
    actusList.parentNode.insertBefore(box, actusList);
  }
  return box;
}

async function renderNotifIdeasCallout(ideasUnseen, ideas){
  const box=ensureNotifIdeasCalloutBox();
  if(!box) return;
  const unseen = typeof ideasUnseen === 'number' ? ideasUnseen : getUnseenIdeasCount(ideas || await fetchIdeasForBadge());
  if(!unseen){ box.innerHTML=''; return; }
  box.innerHTML=`<div style="background:linear-gradient(135deg,#fff7cc,#fff1a8);border:1px solid rgba(212,168,67,0.35);border-radius:16px;padding:12px 14px;margin-bottom:10px;box-shadow:0 6px 18px rgba(212,168,67,0.12)"><div style="font-size:0.6rem;font-weight:900;text-transform:uppercase;letter-spacing:0.08em;color:#8a5a00;margin-bottom:6px">💡 Boîte à idées</div><div style="font-size:0.84rem;font-weight:900;color:#5b3d00">${unseen} nouvelle${unseen>1?'s':''} idée${unseen>1?'s':''} à consulter</div><div style="font-size:0.72rem;color:#7a5600;line-height:1.45;margin-top:4px">Des habitants ont proposé de nouvelles idées pour la commune.</div><button onclick="openIdeasFromNotifs()" style="margin-top:10px;background:var(--forest);color:white;border:none;border-radius:10px;padding:8px 12px;font-size:0.74rem;font-weight:900;cursor:pointer">Voir les idées</button></div>`;
}

function openIdeasFromNotifs(){
  try{ closeOv('notifs'); }catch(e){}
  openIdees();
}

async function refreshActusBadge(){
  let actusUnseen=0, ideasUnseen=0;
  try{
    const actus=await fetchActus(true);
    const seen=JSON.parse(localStorage.getItem(ACTUS_SEEN_KEY)||'[]');
    actusUnseen=actus.filter(a=>!seen.includes(getActuKey(a))).length;
  }catch(e){}
  let ideas=[];
  try{
    ideas=await fetchIdeasForBadge();
    ideasUnseen=getUnseenIdeasCount(ideas);
  }catch(e){}
  const total=actusUnseen+ideasUnseen;
  const parts=[];
  if(actusUnseen) parts.push(actusUnseen+' actu'+(actusUnseen>1?'s':''));
  if(ideasUnseen) parts.push(ideasUnseen+' idée'+(ideasUnseen>1?'s':''));
  updateActuBadge(total, parts.length ? 'Nouveautés : '+parts.join(' · ') : '');
  renderNotifIdeasCallout(ideasUnseen, ideas).catch(()=>{});
}

function formatEventDate(iso){
  try{
    const d = new Date(iso);
    if(isNaN(d)) return iso;
    const days=['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
    const months=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
    const dayName = days[d.getDay()];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hasTime = /T\d{2}:\d{2}/.test(iso);
    if(hasTime){
      const h = d.getHours().toString().padStart(2,'0');
      const m = d.getMinutes().toString().padStart(2,'0');
      return `${dayName} ${day} ${month} ${year} à ${h}h${m}`;
    }
    return `${dayName} ${day} ${month} ${year}`;
  }catch(e){ return iso; }
}

function renderActuListItem(a){
  const id=getActuId(a);
  const jsId=JSON.stringify(id).replace(/"/g,'&quot;');
  const imgHTML=a.photo?`<img class="actu-img" src="${a.photo}" alt="" onerror="this.onerror=null;this.src='mat-header.png'">`:'';
  const titre=esc(getActuDisplayTitle(a));
  const preview=esc(getActuPreviewDescription(a, 190));
  const descriptionHTML=preview?`<div class="actu-text">${preview}</div>`:'';
  const eventHTML = a.eventDate ? `<div class="actu-event">📅 ${esc(formatEventDate(a.eventDate))}${a.eventLocation?' · 📍 '+esc(a.eventLocation):''}</div>` : '';
  return `<div class="actu-item">${imgHTML}<div class="actu-body"><div class="actu-title">${titre}</div>${descriptionHTML}${eventHTML}<div class="actu-date">📅 Publié ${esc(a.date)}</div><div class="actu-actions"><button class="actu-btn actu-btn-detail" onclick="openActuDetail(${jsId})">📰 Détail</button><a class="actu-btn actu-btn-fb" href="https://www.facebook.com/RadioMezieres" target="_blank">📘 Facebook</a></div></div></div>`;
}

function renderActuDetail(actu){
  const el=document.getElementById('actu-detail-body');
  if(!el) return;
  if(!actu){
    el.innerHTML='<div class="actu-empty">Actualité introuvable.</div><div class="actu-detail-actions"><button class="actu-btn actu-btn-detail" onclick="backToActus()">← Retour aux actualités</button></div>';
    return;
  }
  const title=esc(getActuDisplayTitle(actu));
  const desc=getActuPlainDescription(actu);
  const descHTML=desc?`<div class="actu-detail-text">${esc(desc).replace(/\n/g,'<br>')}</div>`:'';
  const imgHTML=actu.photo?`<div class="actu-detail-media"><img class="actu-detail-img" src="${actu.photo}" alt="" onerror="this.onerror=null;this.src='mat-header.png'"></div>`:'';
  const sourceLabel=actu.source==='facebook'?'Publication Facebook':'Publication mairie';
  const eventHTML = actu.eventDate ? `<div class="actu-event">📅 ${esc(formatEventDate(actu.eventDate))}${actu.eventLocation?' · 📍 '+esc(actu.eventLocation):''}</div>` : '';
  el.innerHTML = `<div class="actu-detail-card">${imgHTML}<div class="actu-detail-meta">${esc(sourceLabel)} · ${esc(actu.date||'')}</div><h2 class="actu-detail-title">${title}</h2>${eventHTML}${descHTML}<div class="actu-detail-actions"><button class="actu-btn actu-btn-detail" onclick="backToActus()">← Retour aux actualités</button><a class="actu-btn actu-btn-fb" href="https://www.facebook.com/RadioMezieres" target="_blank">📘 Voir Facebook</a></div></div>`;
}

async function openActuDetail(id, opts){
  opts=opts||{};
  const body=document.getElementById('actu-detail-body');
  if(body) body.innerHTML='<div class="actu-empty">Chargement…</div>';
  const notifs=document.getElementById('ov-notifs');
  if(notifs && notifs.classList.contains('open')) closeOv('notifs');
  openOv('actu');
  if(!opts.fromHash) setActuHash(id);
  try{
    const actus=await fetchActus(false);
    renderActuDetail((actus||[]).find(a=>getActuId(a)===String(id)));
    markActusAsSeen(actus||[]);
  }catch(e){
    if(body) body.innerHTML='<div class="actu-empty">Impossible de charger cette actualité.</div><div class="actu-detail-actions"><button class="actu-btn actu-btn-detail" onclick="backToActus()">← Retour aux actualités</button></div>';
  }
}

function backToActus(){
  closeOv('actu');
  try{ history.replaceState(history.state||{},'', '#notifs'); }catch(e){ location.hash='#notifs'; }
  openNotifs();
}

function closeActuDetail(){
  closeOv('actu');
  clearActuHash();
}

async function loadActus(){
  const el=document.getElementById('actu-list');
  if(!el) return;
  el.innerHTML='<div class="actu-empty">Chargement…</div>';
  try{
    const actus=await fetchActus(true);
    await renderNotifIdeasCallout();
    if(!actus.length){el.innerHTML='<div class="actu-empty">Aucune actualité communale récente.<br><br>Publiez sur Radio Mézières avec <strong>#app-mezieres</strong> pour faire remonter vos publications ici.</div>';return;}
    el.innerHTML=actus.map(renderActuListItem).join('');
    markActusAsSeen(actus||[]);
  }catch(e){
    var offline = !navigator.onLine;
    el.innerHTML='<div class="actu-empty">'+(offline?'📡 <strong>Vous êtes hors ligne</strong><br><br>Les actualités seront à nouveau disponibles dès que votre connexion reviendra.':'Actualités communales indisponibles.<br><a href="https://www.facebook.com/RadioMezieres" target="_blank" style="color:var(--leaf)">Voir Radio Mézières sur Facebook →</a>')+'</div>';
  }
}

function handleActuHashRoute(){
  try{
    const hash=location.hash||'';
    if(hash.indexOf(ACTUS_ROUTE_PREFIX)!==0) return;
    const id=decodeURIComponent(hash.substring(ACTUS_ROUTE_PREFIX.length));
    if(id) openActuDetail(id,{fromHash:true});
  }catch(e){}
}
window.addEventListener('hashchange', handleActuHashRoute);
window.addEventListener('load', function(){ setTimeout(handleActuHashRoute, 700); });

// ── Notifications Push ────────────────────────────────
let pushRegistered=false;

function updateNotifCardStatus(enabled){
  const el=document.getElementById('notif-card-status');
  if(!el) return;
  if(enabled===null){
    el.textContent='Chargement…';
    el.classList.remove('notif-status-on','notif-status-off');
    el.classList.add('notif-status-loading');
    return;
  }
  el.textContent=enabled ? 'ACTIVÉ' : 'DÉSACTIVÉ';
  el.classList.remove('notif-status-on','notif-status-off','notif-status-loading');
  el.classList.add(enabled ? 'notif-status-on' : 'notif-status-off');
}

function _getIOSVersion(){const ua=navigator.userAgent;if(!/iPhone|iPad|iPod/.test(ua))return null;const m=ua.match(/OS (\d+)[_\d]*/);return m?parseInt(m[1],10):null;}
function _isIOS(){return /iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);}
function _isStandalone(){return window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;}
function _setNotifHelp(txt){const el=document.getElementById('push-notif-info');if(el)el.innerHTML=txt||'';}

async function checkPushStatus(){
  const btn=document.getElementById('push-btn');
  updateNotifCardStatus(null);
  if(btn){btn.textContent='Chargement…';btn.disabled=true;btn.classList.remove('on');btn.classList.add('off');}
  _setNotifHelp('');
  const ios=_isIOS(),iosVer=_getIOSVersion(),sa=_isStandalone();
  if(ios&&(iosVer===null||iosVer<16)){updateNotifCardStatus(false);if(btn){btn.disabled=true;btn.textContent='Non disponible';btn.className='notif-btn off';}_setNotifHelp('📵 Notifications indisponibles sur iOS '+(iosVer||'?')+'. Requiert iOS 16.4+.');return;}
  if(ios&&iosVer>=16&&!sa){updateNotifCardStatus(false);if(btn){btn.disabled=true;btn.textContent='Installation requise';btn.className='notif-btn off';}_setNotifHelp("📲 Sur iPhone : installez MAT sur l'écran d'accueil (Bouton Partager → \"Sur l'écran d'accueil\"), puis rouvrez.");return;}
  if(!('serviceWorker' in navigator)||!('PushManager' in window)){updateNotifCardStatus(false);if(btn){btn.disabled=true;btn.textContent='Non supporté';btn.className='notif-btn off';}_setNotifHelp('⚠️ Non supporté sur ce navigateur.');return;}
  if('Notification' in window&&Notification.permission==='denied'){updateNotifCardStatus(false);if(btn){btn.disabled=true;btn.textContent='Bloquées';btn.className='notif-btn off';}_setNotifHelp('🚫 Bloquées dans les réglages du navigateur.');return;}
  if(btn)btn.disabled=false;
  try{
    const reg=await navigator.serviceWorker.ready;
    const sub=await reg.pushManager.getSubscription();
    if(sub){pushRegistered=true;if(btn){btn.textContent='Ne pas être alerté';btn.classList.remove('on');btn.classList.add('off');}updateNotifCardStatus(true);}
    else{pushRegistered=false;if(btn){btn.textContent='Être alerté';btn.classList.remove('off');btn.classList.add('on');}updateNotifCardStatus(false);}
  }catch(e){pushRegistered=false;if(btn){btn.textContent='Être alerté';btn.classList.remove('off');btn.classList.add('on');}updateNotifCardStatus(false);}
}

async function togglePush(){
  const btn=document.getElementById('push-btn');
  if(pushRegistered){
    try{const reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();if(sub){await fetch('https://chatbot-mairie-mezieres.onrender.com/push/unsubscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({endpoint:sub.endpoint})});await sub.unsubscribe();}}catch(e){}
    if(btn){btn.textContent='Être alerté';btn.classList.remove('off');btn.classList.add('on');}
    updateNotifCardStatus(false);
    pushRegistered=false; return;
  }
  if(!('Notification' in window)){await alertMAT('Notifications non supportées sur ce navigateur.','Notifications','🔔');return;}
  const perm=await Notification.requestPermission();
  if(perm!=='granted'){await alertMAT('Notifications refusées. Modifiez les paramètres de votre navigateur.','Notifications','🔔');return;}
  if('serviceWorker' in navigator){
    try{
      const reg=await navigator.serviceWorker.ready;
      const sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(VAPID_PUB)});
      await fetch('https://chatbot-mairie-mezieres.onrender.com/push/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(sub)});
      if(btn){btn.textContent='Ne pas être alerté';btn.classList.remove('on');btn.classList.add('off');}
      updateNotifCardStatus(true);
      pushRegistered=true;
      await alertMAT('Notifications activées !','Notifications','✅');
    }catch(e){await alertMAT('Erreur lors de l\'activation des notifications.','Notifications','⚠️');}
  }
}

// ── Encart info/alerte dans le header ────────────────
const MAT_BANNER_DISMISS_KEY = 'mat_banner_dismissed_v3_';

async function loadMatInfoBanner() {
  // 1. Vigilance météo prioritaire
  try {
    const r = await fetch('https://chatbot-mairie-mezieres.onrender.com/meteo/vigilance');
    if (r.ok) {
      const d = await r.json();
      const v = d.vigilance;
      if (v && v.level >= 2) {
        const icons = {1:'✅',2:'🟡',3:'🟠',4:'🔴'};
        const ico = icons[v.level] || '⚠️';
        const txt = v.phenomenon_label + (v.main_text ? ' — ' + v.main_text.substring(0,80) : '');
        showMatInfoBanner(ico, 'Vigilance météo ' + (v.color_label || ''), txt, 'alert', false, null);
        return;
      }
    }
  } catch(_) {}
  // 2. Sinon, encart admin
  try {
    const r = await fetch('https://chatbot-mairie-mezieres.onrender.com/info-banner');
    if (!r.ok) return;
    const d = await r.json();
    if (!d.active || !d.text) return;
    const dk = MAT_BANNER_DISMISS_KEY + (d.id || '');
    if (localStorage.getItem(dk)) return;
    showMatInfoBanner(d.icon || 'ℹ️', d.title || 'Information', d.text, 'info', true, dk);
  } catch(_) {}
}

function showMatInfoBanner(ico, title, text, type, closeable, dismissKey) {
  let b = document.getElementById('mat-info-banner');
  if (!b) {
    b = document.createElement('div');
    b.id = 'mat-info-banner';
    b.style.cssText = 'margin-bottom:6px;border-radius:14px;padding:10px 14px;border:1px solid rgba(255,255,255,0.3);backdrop-filter:blur(4px);position:relative;';
    b.innerHTML = '<div style="display:flex;align-items:center;gap:10px;">'
      + '<span id="mat-info-ico" style="font-size:1.4rem;flex-shrink:0;"></span>'
      + '<div style="flex:1;min-width:0;">'
      + '<div id="mat-info-title" style="font-size:0.7rem;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:0.06em;"></div>'
      + '<div id="mat-info-text" style="font-size:0.76rem;color:rgba(255,255,255,0.92);line-height:1.4;margin-top:2px;"></div>'
      + '</div>'
      + '<button id="mat-info-close" onclick="dismissMatInfoBanner()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:26px;height:26px;border-radius:50%;cursor:pointer;font-size:0.8rem;flex-shrink:0;display:flex;align-items:center;justify-content:center;">✕</button>'
      + '</div>';
    const grid = document.querySelector('.header-bottom-grid');
    if (grid && grid.parentNode) {
      b.style.margin = '0 0 6px 0';
      grid.parentNode.insertBefore(b, grid);
    } else {
      const hero = document.querySelector('.mat-hero');
      const headerEl = document.querySelector('.header') || document.body;
      if (hero && hero.parentNode) hero.parentNode.insertBefore(b, hero.nextSibling);
      else headerEl.appendChild(b);
    }
  }
  document.getElementById('mat-info-ico').textContent = ico;
  document.getElementById('mat-info-title').textContent = title;
  document.getElementById('mat-info-text').textContent = text;
  const cb = document.getElementById('mat-info-close');
  if (cb) cb.style.display = closeable ? 'flex' : 'none';
  b._dismissKey = dismissKey || null;
  if (type === 'alert') {
    b.style.background = 'rgba(220,38,38,0.75)';
    b.style.borderColor = 'rgba(255,100,100,0.5)';
  } else {
    b.style.background = 'rgba(255,255,255,0.18)';
    b.style.borderColor = 'rgba(255,255,255,0.3)';
  }
  b.style.display = '';
}

function dismissMatInfoBanner() {
  const b = document.getElementById('mat-info-banner');
  if (!b) return;
  if (b._dismissKey) localStorage.setItem(b._dismissKey, '1');
  b.style.opacity = '0';
  b.style.transition = 'opacity 0.3s';
  setTimeout(() => { if (b.parentNode) b.parentNode.removeChild(b); }, 300);
}
