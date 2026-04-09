/* ════════════════════════════════════════════════════════════
   MAT — Utilitaires communs v3.7.2
   Helpers partagés par tous les modules
   ════════════════════════════════════════════════════════════ */

// ── Constantes globales ──────────────────────────────────────
const MEL_PROXY   = 'https://chatbot-mairie-mezieres.onrender.com/mel';
const SIGNAL_URL  = 'https://chatbot-mairie-mezieres.onrender.com/signal';
const ACTU_URL    = 'https://chatbot-mairie-mezieres.onrender.com/actus';
const ICAL_URL    = 'https://chatbot-mairie-mezieres.onrender.com/calendar-proxy';
const METEO_URL   = 'https://chatbot-mairie-mezieres.onrender.com/meteo/commune';
const VAPID_PUB   = 'BNB6bL64B5oCbb9XYqQx37hGt9ZIdcXFuJvepRTRfpIiu146XfaoTtVVFgjbteSGq0Z7Kreo7oOYcGO3Kk4YAtA';
const INSTALL_KEY = 'mat_installed_v3';
const MAT_VERSION = 'v3.7.2';
const MEL_BACKEND = 'https://chatbot-mairie-mezieres.onrender.com';

// ── Échappement HTML (sécurité caractères spéciaux) ─────────
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── URL base64 → Uint8Array (pour VAPID) ────────────────────
function urlBase64ToUint8Array(b64){
  const pad='='.repeat((4-b64.length%4)%4);
  const raw=atob((b64+pad).replace(/-/g,'+').replace(/_/g,'/'));
  return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
}

// ── Détection appareil ───────────────────────────────────────
function detectDevice() {
  const ua = navigator.userAgent;
  const p  = navigator.platform || '';

  // OS
  let os = 'Inconnu', osVersion = '';
  if (/iPhone|iPad|iPod/.test(ua)) {
    os = /iPad/.test(ua) ? 'iPadOS' : 'iOS';
    const m = ua.match(/OS ([\d_]+)/);
    osVersion = m ? m[1].replace(/_/g, '.') : '';
  } else if (/Android/.test(ua)) {
    os = 'Android';
    const m = ua.match(/Android ([\d.]+)/);
    osVersion = m ? m[1] : '';
  } else if (/Windows/.test(ua)) {
    os = 'Windows';
    const m = ua.match(/Windows NT ([\d.]+)/);
    const versions = {'10.0':'10/11','6.3':'8.1','6.2':'8','6.1':'7'};
    osVersion = m ? (versions[m[1]] || m[1]) : '';
  } else if (/Mac OS X/.test(ua)) {
    os = 'macOS';
    const m = ua.match(/Mac OS X ([\d_]+)/);
    osVersion = m ? m[1].replace(/_/g, '.') : '';
  } else if (/Linux/.test(ua)) {
    os = 'Linux';
  }

  // Navigateur
  let browser = 'Inconnu', browserVersion = '';
  if (/CriOS/.test(ua))       { browser = 'Chrome iOS';  const m = ua.match(/CriOS\/([\d.]+)/);  browserVersion = m?m[1]:''; }
  else if (/FxiOS/.test(ua))  { browser = 'Firefox iOS'; const m = ua.match(/FxiOS\/([\d.]+)/);  browserVersion = m?m[1]:''; }
  else if (/EdgA/.test(ua))   { browser = 'Edge Android';const m = ua.match(/EdgA\/([\d.]+)/);   browserVersion = m?m[1]:''; }
  else if (/Edg\//.test(ua))  { browser = 'Edge';        const m = ua.match(/Edg\/([\d.]+)/);    browserVersion = m?m[1]:''; }
  else if (/OPR/.test(ua))    { browser = 'Opera';       const m = ua.match(/OPR\/([\d.]+)/);    browserVersion = m?m[1]:''; }
  else if (/Chrome/.test(ua)) { browser = 'Chrome';      const m = ua.match(/Chrome\/([\d.]+)/); browserVersion = m?m[1]:''; }
  else if (/Firefox/.test(ua)){ browser = 'Firefox';     const m = ua.match(/Firefox\/([\d.]+)/);browserVersion = m?m[1]:''; }
  else if (/Safari/.test(ua)) { browser = 'Safari';      const m = ua.match(/Version\/([\d.]+)/);browserVersion = m?m[1]:''; }

  // Type appareil
  let deviceType = 'Desktop';
  if (/iPhone|iPod/.test(ua)) deviceType = 'iPhone';
  else if (/iPad/.test(ua) || (os==='iPadOS')) deviceType = 'iPad';
  else if (/Android/.test(ua) && /Mobile/.test(ua)) deviceType = 'Android Mobile';
  else if (/Android/.test(ua)) deviceType = 'Android Tablet';

  // Modèle (best effort)
  let model = '';
  const mSamsung = ua.match(/Samsung|SM-[A-Z0-9]+/i);
  const mPixel   = ua.match(/Pixel \d+[a-z]*/i);
  const mHuawei  = ua.match(/Huawei|HW-/i);
  const mXiaomi  = ua.match(/Xiaomi|Redmi|MIUI/i);
  if (/iPhone/.test(ua)) model = 'iPhone';
  else if (/iPad/.test(ua)) model = 'iPad';
  else if (mPixel)   model = mPixel[0];
  else if (mSamsung) { const s = ua.match(/SM-[A-Z0-9]+/i); model = s ? s[0] : 'Samsung'; }
  else if (mHuawei)  model = 'Huawei';
  else if (mXiaomi)  model = 'Xiaomi/Redmi';

  // PWA installée ?
  const isPWA = window.matchMedia('(display-mode: standalone)').matches
             || window.navigator.standalone === true;

  return {
    type:      deviceType,
    model:     model || deviceType,
    os:        os + (osVersion ? ' ' + osVersion : ''),
    browser:   browser + (browserVersion ? ' ' + browserVersion.split('.')[0] : ''),
    screen:    screen.width + 'x' + screen.height,
    pwa:       isPWA ? 'Oui (installée)' : 'Non (navigateur)',
    matVersion: MAT_VERSION
  };
}

// ── Identifiant unique persistant pour les stats ────────────
const MAT_DEVICE_KEY = 'mat_device_id_v1';

function getMatDeviceId(){
  let id = localStorage.getItem(MAT_DEVICE_KEY);
  if(!id){
    id = 'mat-' + Date.now().toString(36) + '-' +
         Math.random().toString(36).substring(2, 10) +
         Math.random().toString(36).substring(2, 10);
    try { localStorage.setItem(MAT_DEVICE_KEY, id); } catch(e) {}
  }
  return id;
}

async function trackStat(service, extra = {}){
  try{
    const deviceId = getMatDeviceId();
    const payload = {
      service,
      deviceId,
      device: detectDevice(),
      ...extra
    };

    await fetch('https://chatbot-mairie-mezieres.onrender.com/stats/track', {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'x-device-id': deviceId
      },
      body: JSON.stringify(payload),
      keepalive: true
    });
  }catch(e){
    try{ updateNotifCardStatus(false); }catch(_e){}
  }
}

function trackAppOpenOncePerDay(){
  const now = new Date();
  const parts = new Intl.DateTimeFormat('fr-CA', {
    timeZone:'Europe/Paris',
    year:'numeric',
    month:'2-digit',
    day:'2-digit'
  }).formatToParts(now);

  const get = t => parts.find(p => p.type === t)?.value || '';
  const today = `${get('year')}-${get('month')}-${get('day')}`;
  const key = 'mat_app_open_tracked_' + today;

  try{
    if(localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
  }catch(e){}

  trackStat('app_open');
}

// ── Modale MAT (remplace alert/confirm natifs) ──────────────
let _matModalResolver = null;
function openMatModal(opts){
  opts = opts || {};
  let modal = document.getElementById('mat-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'mat-modal';
    modal.className = 'mat-modal';
    modal.setAttribute('onclick', 'matModalBackdrop(event)');
    modal.innerHTML = '<div class="mat-modal-card" role="dialog" aria-modal="true" aria-labelledby="mat-modal-title">'
      + '<div class="mat-modal-head">'
      + '<div class="mat-modal-ico" id="mat-modal-ico"></div>'
      + '<div class="mat-modal-title" id="mat-modal-title">MAT</div>'
      + '<button class="mat-modal-close" type="button" onclick="closeMatModal(false)">✕</button>'
      + '</div>'
      + '<div class="mat-modal-body">'
      + '<div class="mat-modal-text" id="mat-modal-text"></div>'
      + '<div class="mat-modal-actions" id="mat-modal-actions">'
      + '<button class="mat-modal-btn secondary" type="button" id="mat-modal-cancel" onclick="closeMatModal(false)">Annuler</button>'
      + '<button class="mat-modal-btn primary" type="button" id="mat-modal-ok" onclick="closeMatModal(true)">OK</button>'
      + '</div></div></div>';
    document.body.appendChild(modal);
  } else {
    document.body.appendChild(modal);
  }
  const title = document.getElementById('mat-modal-title');
  const text = document.getElementById('mat-modal-text');
  const ico = document.getElementById('mat-modal-ico');
  const ok = document.getElementById('mat-modal-ok');
  const cancel = document.getElementById('mat-modal-cancel');
  if(!title || !text || !ico || !ok || !cancel) return Promise.resolve(false);
  title.textContent = opts.title || 'MAT';
  text.textContent = opts.message || '';
  ico.textContent = opts.icon || 'ℹ️';
  ok.textContent = opts.okText || 'OK';
  cancel.textContent = opts.cancelText || 'Annuler';
  cancel.style.display = opts.type === 'alert' ? 'none' : '';
  modal.classList.add('open');
  document.body.style.overflow='hidden';
  return new Promise(resolve => { _matModalResolver = resolve; });
}
function closeMatModal(value){
  const modal = document.getElementById('mat-modal');
  if(modal) modal.classList.remove('open');
  if(typeof _ovStack !== 'undefined' && _ovStack.length === 0) document.body.style.overflow='';
  if(_matModalResolver){ const fn = _matModalResolver; _matModalResolver = null; fn(!!value); }
}
function matModalBackdrop(e){ if(e.target === document.getElementById('mat-modal')) closeMatModal(false); }
function alertMAT(message, title, icon, okText){
  return openMatModal({type:'alert', message, title:title||'MAT', icon:icon||'ℹ️', okText:okText||'OK'});
}
function confirmMAT(message, title, icon, okText, cancelText){
  return openMatModal({type:'confirm', message, title:title||'MAT', icon:icon||'❓', okText:okText||'Confirmer', cancelText:cancelText||'Annuler'});
}

// ── Text-to-Speech ───────────────────────────────────────────
let _ttsEnabled = false;
let _ttsUtterance = null;
let _ttsPaused = false;

function ttsSpeak(text, label) {
  if (!_ttsEnabled || !('speechSynthesis' in window)) return;
  ttsStop();
  const clean = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  _ttsUtterance = new SpeechSynthesisUtterance(clean);
  _ttsUtterance.lang = 'fr-FR';
  _ttsUtterance.rate = 0.92;
  _ttsUtterance.pitch = 1.0;

  const voices = speechSynthesis.getVoices();
  const frVoice = voices.find(v => v.lang.startsWith('fr') && !v.name.includes('Compact'))
               || voices.find(v => v.lang.startsWith('fr'));
  if (frVoice) _ttsUtterance.voice = frVoice;

  _ttsUtterance.onstart = () => {
    const bar = document.getElementById('tts-bar');
    const txt = document.getElementById('tts-bar-text');
    if (bar) bar.classList.add('visible');
    if (txt) txt.textContent = label || 'Lecture en cours…';
    _ttsPaused = false;
    updateTtsPauseBtn();
  };
  _ttsUtterance.onend = () => {
    const bar = document.getElementById('tts-bar');
    if (bar) bar.classList.remove('visible');
    _ttsPaused = false;
  };
  _ttsUtterance.onerror = () => {
    const bar = document.getElementById('tts-bar');
    if (bar) bar.classList.remove('visible');
  };

  speechSynthesis.speak(_ttsUtterance);
}

function ttsPause() {
  if (!('speechSynthesis' in window)) return;
  if (_ttsPaused) {
    speechSynthesis.resume();
    _ttsPaused = false;
  } else {
    speechSynthesis.pause();
    _ttsPaused = true;
  }
  updateTtsPauseBtn();
}

function ttsStop() {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  _ttsPaused = false;
  const bar = document.getElementById('tts-bar');
  if (bar) bar.classList.remove('visible');
}

function updateTtsPauseBtn() {
  const btn = document.getElementById('tts-pause-btn');
  if (btn) btn.textContent = _ttsPaused ? '▶' : '⏸';
}

async function ttsRead(text, label) {
  if (!('speechSynthesis' in window)) {
    await alertMAT('La lecture vocale n\'est pas disponible sur ce navigateur.','Lecture vocale','🔊');
    return;
  }
  ttsSpeak(text, label);
}

// ── Compression image via canvas (utilisé par signalement) ──
function compressImage(src, maxSize, quality){
  return new Promise((resolve, reject)=>{
    const img=new Image();
    img.onload=function(){
      const canvas=document.createElement('canvas');
      let w=img.width, h=img.height;
      if(w>maxSize||h>maxSize){
        if(w>h){h=Math.round(h*maxSize/w);w=maxSize;}
        else{w=Math.round(w*maxSize/h);h=maxSize;}
      }
      canvas.width=w; canvas.height=h;
      canvas.getContext('2d').drawImage(img,0,0,w,h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror=reject;
    img.src=src;
  });
}

// ── Formatage réponses MEL : URLs → liens cliquables ─────────
const URL_LABELS = {
  'mezieres-lez-clery.fr':         '🌐 Site de la commune',
  'ccterresduvaldeloire.fr':        '🏘️ Site CCTVL',
  'portail-usagers.ccterresduvaldeloire.fr': '🔑 Portail usagers CCTVL',
  'valdeloire-fibre.fr':            '🌐 Val de Loire Fibre',
  'service-public.fr':              '📋 Service-Public.fr',
  'doctolib.fr':                    '🏥 Prendre RDV Doctolib',
  'remi-centrevaldeloire.fr':       '🚌 Horaires Rémi',
  'mairie-clery-saint-andre.fr':    '🏛️ Mairie Cléry-Saint-André',
};
function urlToLabel(url) {
  try {
    const host = new URL(url.startsWith('http') ? url : 'https://'+url).hostname.replace('www.','');
    for (const [key, label] of Object.entries(URL_LABELS)) {
      if (host.includes(key)) return label;
    }
    return '🔗 ' + host;
  } catch(e) { return '🔗 Voir le lien'; }
}
const KNOWN_DOMAINS = [
  'mezieres-lez-clery.fr','ccterresduvaldeloire.fr','portail-usagers.ccterresduvaldeloire.fr',
  'valdeloire-fibre.fr','service-public.fr','doctolib.fr','remi-centrevaldeloire.fr',
  'mairie-clery-saint-andre.fr','mairie-mezieres.github.io'
];

function formatPhone(num) {
  return num.replace(/[\s\.\-]/g,'');
}
function formatMelText(text) {
  const linkStyle = 'color:var(--sage);font-weight:800;text-decoration:none;border-bottom:1px solid var(--sage);';

  // 0. Emails avant URLs
  let result = text.replace(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g, (email) => {
    return `<a href="mailto:${email}" style="${linkStyle}">✉️ ${email}</a>`;
  });

  // 1. URLs complètes
  result = result.replace(/(https?:\/\/[^\s<>"\)]+)/gi, (url) => {
    const label = urlToLabel(url);
    return `<a href="${url}" target="_blank" style="${linkStyle}">${label}</a>`;
  });

  // 2. www.xxx sans http
  result = result.replace(/(?<!["\/\w])(www\.[a-zA-Z0-9-]+\.[a-z]{2,}(?:\/[^\s<>"]*)?)/gi, (url) => {
    const href = 'https://' + url;
    return `<a href="${href}" target="_blank" style="${linkStyle}">${urlToLabel(href)}</a>`;
  });

  // 3. Domaines connus
  for (const domain of KNOWN_DOMAINS) {
    const esc2 = domain.replace(/\./g,'\\.');
    const re = new RegExp('(?<!["\/\.\w@])(' + esc2 + '(?:\/[^\s<>"]*)?)', 'gi');
    result = result.replace(re, (url) => {
      const href = 'https://' + url;
      return `<a href="${href}" target="_blank" style="${linkStyle}">${urlToLabel(href)}</a>`;
    });
  }

  // 4. Numéros de téléphone français
  result = result.replace(/(?<![\d@\/])(0[1-9](?:[\s\.\-]?\d{2}){4})(?![\d])/g, (num) => {
    const tel = formatPhone(num);
    return `<a href="tel:${tel}" style="${linkStyle}">📞 ${num}</a>`;
  });

  return result.replace(/\n/g,'<br>');
}
