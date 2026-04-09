/* ════════════════════════════════════════════════════════════
   MAT — Actualités & Notifications Push v3.7.0
   ════════════════════════════════════════════════════════════ */

// ── Actualités ──────────────────────────────────────────
const ACTUS_SEEN_KEY='mat_actus_seen_v1';

function getActuKey(a){
  return [a.date||'',a.title||'',a.photo||''].join('||');
}

function updateActuBadge(count){
  const el=document.getElementById('notif-unread-badge');
  if(!el) return;
  const n=Number(count)||0;
  el.textContent=n>99?'99+':String(n);
  el.classList.toggle('show', n>0);
  // Badge icône PWA
  updateAppBadge(n);
}

function markActusAsSeen(actus){
  try{
    const keys=(actus||[]).map(getActuKey);
    localStorage.setItem(ACTUS_SEEN_KEY, JSON.stringify(keys));
    updateActuBadge(0);
  }catch(e){}
}

async function refreshActusBadge(){
  try{
    const r=await fetch(ACTU_URL,{cache:'no-store'});
    if(!r.ok) throw new Error('HTTP '+r.status);
    const d=await r.json();
    const actus=d.actus||[];
    const seen=JSON.parse(localStorage.getItem(ACTUS_SEEN_KEY)||'[]');
    const unseen=actus.filter(a=>!seen.includes(getActuKey(a))).length;
    updateActuBadge(unseen);
  }catch(e){
    updateActuBadge(0);
  }
}

// Formater une date ISO pour l'affichage d'un événement
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

async function loadActus(){
  const el=document.getElementById('actu-list');
  el.innerHTML='<div class="actu-empty">Chargement…</div>';
  try{
    const r=await fetch(ACTU_URL), d=await r.json();
    if(!d.actus||!d.actus.length){el.innerHTML='<div class="actu-empty">Aucune actualité communale récente.<br><br>Publiez sur Radio Mézières avec <strong>#app-mezieres</strong> pour faire remonter vos publications ici.</div>';return;}
    el.innerHTML=d.actus.map(a=>{
      const imgHTML=a.photo?`<img class="actu-img" src="${a.photo}" alt="" onerror="this.onerror=null;this.src='mat-header.png'">`:'';
      // Priorité : champ description dédié > parsing du text/title
      let titre, description;
      if(a.description && String(a.description).trim()){
        titre = esc((a.title||'Actualité').replace(/#app-mezieres/gi,'').trim());
        description = esc(String(a.description).trim()).replace(/\n/g,'<br>');
      } else {
        const fullText=((a.text||a.title||'').replace(/#app-mezieres/gi,'')).trim();
        const lines=fullText.split(/\r?\n/).map(l=>l.trim()).filter(l=>l.length>0);
        titre=esc(lines[0]||'Actualité');
        description=lines.length>1?esc(lines.slice(1).join('\n')).replace(/\n/g,'<br>'):'';
      }
      const eventHTML = a.eventDate ? `<div class="actu-event">📅 ${esc(formatEventDate(a.eventDate))}${a.eventLocation?' · 📍 '+esc(a.eventLocation):''}</div>` : '';
      return `<div class="actu-item">${imgHTML}<div class="actu-body"><div class="actu-title">${titre}</div>${description?`<div class="actu-text">${description}</div>`:''}${eventHTML}<div class="actu-date">📅 Publié ${esc(a.date)}</div><a class="actu-fb-link" href="https://www.facebook.com/RadioMezieres" target="_blank">📘 Voir sur Facebook</a></div></div>`;
    }).join('');
    markActusAsSeen(d.actus||[]);
  }catch(e){
    var offline = !navigator.onLine;
    el.innerHTML='<div class="actu-empty">'+(offline?'📡 <strong>Vous êtes hors ligne</strong><br><br>Les actualités seront à nouveau disponibles dès que votre connexion reviendra.':'Actualités communales indisponibles.<br><a href="https://www.facebook.com/RadioMezieres" target="_blank" style="color:var(--leaf)">Voir Radio Mézières sur Facebook →</a>')+'</div>';
  }
}

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
