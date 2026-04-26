/* ════════════════════════════════════════════════════════════
   MAT — Accessibilité & Personnalisation v3.7.0
   Thèmes, tailles, contraste, TTS, onboarding, badge
   ════════════════════════════════════════════════════════════ */

const ACC_KEY = 'mat_accessibility';

function loadAccessibilite() {
  try {
    const saved = JSON.parse(localStorage.getItem(ACC_KEY) || '{}');
    if (saved.fontSize)  applyFontSize(saved.fontSize, false);
    if (saved.contrast)  applyContrast(true, false);
    if (saved.touch)     applyTouch(true, false);
    if (saved.spacing)   applySpacing(true, false);
    if (saved.tts)       { _ttsEnabled = true; }
    if (saved.contextHelp === true) toggleContextHelp(true, false); else toggleContextHelp(false, false);
    if (saved.theme)     setTheme(saved.theme);
    if (saved.noHeader)  toggleNoHeader(true);
    if (saved.noWidgets) toggleNoWidgets(true);
    if (saved.colorblind) toggleColorblind(true, false);
  } catch(e) {}
}

function saveAccessibilite() {
  const html = document.documentElement;
  const theme = html.classList.contains('theme-sombre') ? 'sombre' : html.classList.contains('theme-bleu') ? 'bleu' : 'vert';
  localStorage.setItem(ACC_KEY, JSON.stringify({
    fontSize: html.classList.contains('font-xl') ? 'xl' : html.classList.contains('font-large') ? 'large' : 'normal',
    contrast: html.classList.contains('high-contrast'),
    touch:    html.classList.contains('large-touch'),
    spacing:  html.classList.contains('line-spacing'),
    tts:      _ttsEnabled,
    contextHelp: _ctxEnabled,
    theme,
    noHeader:   html.classList.contains('no-header'),
    noWidgets:  html.classList.contains('no-widgets'),
    colorblind: html.classList.contains('colorblind-mode'),
  }));
}

function applyFontSize(size, save=true) {
  const html = document.documentElement;
  html.classList.remove('font-large', 'font-xl');
  if (size === 'large') html.classList.add('font-large');
  if (size === 'xl')    html.classList.add('font-xl');
  ['normal','large','xl'].forEach(s => {
    const btn = document.getElementById('acc-' + s);
    if (btn) btn.classList.toggle('on', s === size);
  });
  if (save) saveAccessibilite();
}

function applyContrast(on, save=true) {
  document.documentElement.classList.toggle('high-contrast', on);
  const el = document.getElementById('acc-contrast-toggle');
  if (el) el.checked = on;
  if (save) saveAccessibilite();
}

function applyTouch(on, save=true) {
  document.documentElement.classList.toggle('large-touch', on);
  const el = document.getElementById('acc-touch-toggle');
  if (el) el.checked = on;
  if (save) saveAccessibilite();
}

function applySpacing(on, save=true) {
  document.documentElement.classList.toggle('line-spacing', on);
  const el = document.getElementById('acc-spacing-toggle');
  if (el) el.checked = on;
  if (save) saveAccessibilite();
}

function setFontSize(size)       { applyFontSize(size); }
function toggleContrast(checked) { applyContrast(checked); }
function toggleTouch(checked)    { applyTouch(checked); }
function toggleSpacing(checked)  { applySpacing(checked); }

function toggleColorblind(on, save=true) {
  document.documentElement.classList.toggle('colorblind-mode', on);
  const el = document.getElementById('acc-colorblind-toggle');
  if (el) el.checked = on;
  if (save) saveAccessibilite();
}

function toggleTTS(on) {
  _ttsEnabled = on;
  if (!on) ttsStop();
  saveAccessibilite();
  if (on && 'speechSynthesis' in window) speechSynthesis.getVoices();
}

// ── Thèmes de personnalisation ────────────────────────────
function setTheme(theme) {
  const html = document.documentElement;
  html.classList.remove('theme-bleu','theme-sombre');
  if (theme !== 'vert') html.classList.add('theme-' + theme);
  ['vert','bleu','sombre'].forEach(t => {
    const btn = document.getElementById('theme-' + t);
    if (btn) btn.classList.toggle('on', t === theme);
  });
  saveAccessibilite();
}

function toggleNoHeader(on) {
  document.documentElement.classList.toggle('no-header', on);
  const el = document.getElementById('acc-noheader-toggle');
  if (el) el.checked = on;
  saveAccessibilite();
}

function toggleNoWidgets(on) {
  document.documentElement.classList.toggle('no-widgets', on);
  const el = document.getElementById('acc-nowidgets-toggle');
  if (el) el.checked = on;
  saveAccessibilite();
}

// ── Aide contextuelle ─────────────────────────────────────
let _ctxEnabled = false;
const CTX_TEXTS = {
  mel: {title:"Aide rapide", text:"Posez votre question comme si vous parliez à la mairie. Exemple : horaires, clôture, déchets, fibre ou agenda."},
  signal: {title:"Conseil utile", text:"Choisissez une catégorie, ajoutez une photo si besoin, puis envoyez. La description et la position GPS restent facultatives."},
  contact: {title:"Besoin d'aide ?", text:"Pour une urgence communale, utilisez Signalement. Pour une demande générale, appelez la mairie ou laissez un message."}
};
let _ctxDismissed = {};
function dismissContextHelp(key){
  _ctxDismissed[key] = true;
  renderContextHelp(key);
}
function renderContextHelp(key){
  const el=document.getElementById('ctx-'+key);
  if(!el) return;
  const data=CTX_TEXTS[key];
  if(!_ctxEnabled || !data || _ctxDismissed[key]){el.classList.remove('show'); el.innerHTML=''; return;}
  el.innerHTML=`<div class="ctx-head"><span class="ctx-ico">💡</span><div class="ctx-title">${data.title}</div><button type="button" class="ctx-close" aria-label="Fermer l'aide" onclick="dismissContextHelp('${key}')">✕</button></div><div class="ctx-text">${data.text}</div>`;
  el.classList.add('show');
}
function refreshAllContextHelp(){ ['mel','signal','contact'].forEach(function(key){ _ctxDismissed[key]=false; renderContextHelp(key); }); }
function toggleContextHelp(on, save=true){
  _ctxEnabled = on;
  const el=document.getElementById('acc-ctx-toggle');
  if(el) el.checked = on;
  if(on){ _ctxDismissed = {}; }
  refreshAllContextHelp();
  if(save) saveAccessibilite();
}

// ── Ouverture overlay accessibilité ──────────────────────
function openAccessibilite() {
  openOv('accessibilite');
  const html = document.documentElement;
  const size = html.classList.contains('font-xl') ? 'xl' : html.classList.contains('font-large') ? 'large' : 'normal';
  ['normal','large','xl'].forEach(s => {
    const btn = document.getElementById('acc-' + s);
    if (btn) btn.classList.toggle('on', s === size);
  });
  const ct = document.getElementById('acc-contrast-toggle');
  const tt = document.getElementById('acc-touch-toggle');
  const st = document.getElementById('acc-spacing-toggle');
  if (ct) ct.checked = html.classList.contains('high-contrast');
  if (tt) tt.checked = html.classList.contains('large-touch');
  if (st) st.checked = html.classList.contains('line-spacing');
  const ttsEl = document.getElementById('acc-tts-toggle');
  if (ttsEl) ttsEl.checked = _ttsEnabled;
  const ctxEl = document.getElementById('acc-ctx-toggle');
  if (ctxEl) ctxEl.checked = _ctxEnabled;
  const html2 = document.documentElement;
  const theme = html2.classList.contains('theme-sombre') ? 'sombre' : html2.classList.contains('theme-bleu') ? 'bleu' : 'vert';
  ['vert','bleu','sombre'].forEach(t => { const b = document.getElementById('theme-'+t); if(b) b.classList.toggle('on', t===theme); });
  const nh = document.getElementById('acc-noheader-toggle');
  const nw = document.getElementById('acc-nowidgets-toggle');
  const cb = document.getElementById('acc-colorblind-toggle');
  if (nh) nh.checked = html2.classList.contains('no-header');
  if (nw) nw.checked = html2.classList.contains('no-widgets');
  if (cb) cb.checked = html2.classList.contains('colorblind-mode');
}

function resetAccessibilite() {
  applyFontSize('normal', false);
  applyContrast(false, false);
  applyTouch(false, false);
  applySpacing(false, false);
  _ttsEnabled = false;
  _ctxEnabled = false;
  ttsStop();
  setTheme('vert');
  toggleNoHeader(false);
  toggleNoWidgets(false);
  toggleColorblind(false, false);
  localStorage.removeItem(ACC_KEY);
  openAccessibilite();
}

// ── Badge icône PWA ─────────────────────────────────────
function updateAppBadge(count) {
  if (!('setAppBadge' in navigator)) return;
  const saved = JSON.parse(localStorage.getItem(ACC_KEY) || '{}');
  if (saved.badgeNotif === false) return;
  if (count > 0) navigator.setAppBadge(count).catch(() => {});
  else navigator.clearAppBadge().catch(() => {});
}
function toggleBadgeNotif(on) {
  const saved = JSON.parse(localStorage.getItem(ACC_KEY) || '{}');
  saved.badgeNotif = on;
  localStorage.setItem(ACC_KEY, JSON.stringify(saved));
  if (!on && 'clearAppBadge' in navigator) navigator.clearAppBadge().catch(() => {});
}

// ── Onboarding ─────────────────────────────────────────
const OB_KEY = 'mat_onboarded_v3';
const OB_FEATURES = [
  { ico:'🏛️', title:`Mairie & Contact`, desc:`Accédez aux coordonnées de la mairie, aux horaires d'ouverture et contactez vos élus directement.`, sel:'.top-mairie' },
  { ico:'🌤️', title:`Météo locale`, desc:`Météo en temps réel pour Mézières avec alertes Météo-France intégrées.`, sel:'.top-meteo' },
  { ico:'🚌', title:`Bus Ligne 8 Rémi`, desc:`Horaires en temps réel du bus vers Orléans, avec détection automatique période scolaire/vacances.`, sel:'.bus-strip' },
  { ico:'👩‍💼', title:`MEL — Assistante IA`, desc:`Posez toutes vos questions : démarches, urbanisme, école, déchets, horaires… MEL répond 24h/24.`, sel:'button[onclick="openMel()"]' },
  { ico:'🔔', title:`Actualités communales`, desc:`Recevez les dernières infos de la mairie et abonnez-vous aux notifications push pour ne rien manquer.`, sel:'button[onclick="openNotifs()"]' },
  { ico:'💡', title:`Vos idées`, desc:`Partagez vos idées pour améliorer la commune. Votez pour les propositions des habitants !`, sel:'button[onclick="openIdees()"]' },
  { ico:'🚨', title:`Signalement citoyen`, desc:`Voirie abîmée, lampadaire en panne ? Signalez-le en quelques secondes, anonymement.`, sel:'button[onclick="openSignal()"]' },
  { ico:'📅', title:`Agenda`, desc:`Consultez toutes les manifestations de la commune. Ne manquez plus aucun événement !`, sel:'button[onclick="openAgenda()"]' },
  { ico:'🏃', title:`Randonnées — Réseau & Parcours`, desc:`Explorez les circuits pédestres autour de Mézières et générez des parcours sur mesure sur le réseau de chemins.`, sel:'a[href*="rando.html"]' },
  { ico:'⚙️', title:`Personnalisation`, desc:`Thème sombre, taille de texte, contraste élevé… Adaptez l\'appli à vos besoins.`, sel:'button[onclick="openAccessibilite()"]', scrollTop:true },
];
let _obStep = 0;

function initOnboarding() {
  if (localStorage.getItem(OB_KEY)) return;
  if (localStorage.getItem('mat_accessibility')) { localStorage.setItem(OB_KEY, '1'); return; }
  _obStep = 0;
  buildOnboardingDOM();
  document.getElementById('mat-onboarding').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function relancerOnboarding() {
  localStorage.removeItem(OB_KEY);
  _obStep = 0;
  buildOnboardingDOM();
  document.getElementById('mat-onboarding').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function buildOnboardingDOM() {
  let ob = document.getElementById('mat-onboarding');
  if (!ob) { ob = document.createElement('div'); ob.id = 'mat-onboarding'; document.body.appendChild(ob); }
  const total = OB_FEATURES.length + 1;
  const dots = Array.from({length:total},(_,i)=>`<div id="ob-dot-${i}" style="width:7px;height:7px;border-radius:50%;background:${i===0?'#fff':'rgba(255,255,255,0.35)'};transition:all 0.3s;flex-shrink:0;"></div>`).join('');
  ob.innerHTML = `
    <div id="ob-step-0" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:28px 24px;text-align:center;gap:18px;">
      <img src="MAT-explique.png" alt="MAT" style="width:130px;height:130px;object-fit:contain;filter:drop-shadow(0 8px 24px rgba(0,0,0,0.5));animation:obBounce 2.2s ease infinite;" onerror="this.src='MAT et MEL.png'">
      <div style="color:#fff;font-family:'Grape Nuts',cursive;font-size:2.2rem;">Bienvenue !</div>
      <div style="color:rgba(255,255,255,0.88);font-size:0.88rem;line-height:1.7;max-width:320px;">
        Je suis <strong style="color:#c9f0d1;">MAT</strong>, le majordome numérique de <strong style="color:#c9f0d1;">Mézières-lez-Cléry</strong>.<br><br>
        Votre application municipale : actualités, signalements, agenda, météo et bien plus.<br><br>
        <em style="color:rgba(255,255,255,0.5);font-size:0.76rem;">Laissez-moi vous présenter l'application.</em>
      </div>
      <button onclick="obNext()" style="background:linear-gradient(135deg,var(--leaf,#16a34a),var(--sage,#22c55e));color:#fff;border:none;border-radius:16px;padding:15px 36px;font-family:'Nunito',sans-serif;font-size:0.94rem;font-weight:900;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,0.3);">Découvrir l'appli →</button>
    </div>
    <div id="ob-feature-card" style="display:none;position:fixed;bottom:0;left:0;right:0;padding:18px 20px calc(20px + env(safe-area-inset-bottom,0px));background:linear-gradient(0deg,rgba(13,43,26,0.97) 70%,transparent);z-index:10002;text-align:center;">
      <div id="ob-feat-ico" style="font-size:2.8rem;margin-bottom:8px;"></div>
      <div id="ob-feat-title" style="color:#fff;font-size:1.05rem;font-weight:900;font-family:'Nunito',sans-serif;margin-bottom:6px;"></div>
      <div id="ob-feat-desc" style="color:rgba(255,255,255,0.8);font-size:0.82rem;line-height:1.6;margin-bottom:16px;max-width:340px;margin-left:auto;margin-right:auto;"></div>
      <button id="ob-next-btn" onclick="obNext()" style="background:linear-gradient(135deg,var(--leaf,#16a34a),var(--sage,#22c55e));color:#fff;border:none;border-radius:14px;padding:13px 30px;font-family:'Nunito',sans-serif;font-size:0.88rem;font-weight:900;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,0.3);">Suivant →</button>
    </div>
    <div id="ob-overlay-dark" style="display:none;position:fixed;inset:0;pointer-events:none;z-index:10001;">
      <svg id="ob-svg" style="position:absolute;inset:0;width:100%;height:100%;overflow:visible;"></svg>
      <div id="ob-finger" style="position:absolute;font-size:2rem;animation:obFinger 1s ease infinite;pointer-events:none;display:none;">👆</div>
    </div>
    <div id="ob-progress-bar-wrap" style="display:none;position:fixed;top:0;left:0;right:0;z-index:10003;padding:env(safe-area-inset-top,0px) 16px 0;pointer-events:none;">
      <div style="display:flex;align-items:center;gap:10px;padding:10px 0;pointer-events:all;">
        <div style="flex:1;height:3px;background:rgba(255,255,255,0.2);border-radius:2px;overflow:hidden;">
          <div id="ob-progress-fill" style="height:100%;background:linear-gradient(90deg,var(--leaf,#16a34a),var(--sage,#22c55e));border-radius:2px;transition:width 0.4s ease;width:0%"></div>
        </div>
        <button onclick="obSkip()" style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);color:rgba(255,255,255,0.75);border-radius:8px;padding:5px 12px;font-family:'Nunito',sans-serif;font-size:0.7rem;font-weight:800;cursor:pointer;pointer-events:all;">Passer</button>
      </div>
      <div style="display:flex;gap:6px;justify-content:center;padding-bottom:6px;" id="ob-dots">${dots}</div>
    </div>
  `;
  ob.style.cssText = 'display:flex;position:fixed;inset:0;z-index:10000;background:linear-gradient(160deg,var(--forest,#0d2b1a) 0%,var(--leaf,#1a3d2b) 100%);flex-direction:column;';
  ob.addEventListener('click', function(e){ if(e.target === ob) obFinish(); });
}

async function obNext() {
  _obStep++;
  const total = OB_FEATURES.length + 1;
  if (_obStep >= total) { obFinish(); return; }
  await showObFeature(_obStep - 1);
  const pct = (_obStep / (total - 1)) * 100;
  const fill = document.getElementById('ob-progress-fill');
  if (fill) fill.style.width = pct + '%';
  for (let i = 0; i < total; i++) {
    const dot = document.getElementById('ob-dot-' + i);
    if (dot) dot.style.background = i < _obStep ? 'var(--sage,#22c55e)' : i === _obStep ? '#fff' : 'rgba(255,255,255,0.35)';
  }
}

async function showObFeature(idx) {
  const f = OB_FEATURES[idx];
  if (!f) { obFinish(); return; }
  document.getElementById('ob-step-0').style.display = 'none';
  document.getElementById('ob-progress-bar-wrap').style.display = '';
  const card = document.getElementById('ob-feature-card');
  card.style.display = '';
  document.getElementById('ob-feat-ico').textContent = f.ico;
  document.getElementById('ob-feat-title').textContent = f.title;
  document.getElementById('ob-feat-desc').textContent = f.desc;
  const btn = document.getElementById('ob-next-btn');
  if (btn) btn.textContent = idx < OB_FEATURES.length - 1 ? 'Suivant →' : 'Terminer ✓';
  card.style.transform = 'translateY(28px)'; card.style.opacity = '0';
  card.style.transition = 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1),opacity 0.25s ease';
  requestAnimationFrame(() => requestAnimationFrame(() => { card.style.transform = 'translateY(0)'; card.style.opacity = '1'; }));
  const ob = document.getElementById('mat-onboarding');
  ob.style.background = 'transparent';
  const darkOverlay = document.getElementById('ob-overlay-dark');
  const svg = document.getElementById('ob-svg');
  const finger = document.getElementById('ob-finger');
  darkOverlay.style.display = '';

  let el = null;
  if (f.sel) {
    el = document.querySelector(f.sel);
    if (!el) {
      const alts = f.sel.split(' ');
      for (const alt of alts) {
        el = document.querySelector(alt);
        if (el) break;
      }
    }
    if (el && el.tagName !== 'BUTTON' && el.tagName !== 'A') {
      const parentBtn = el.closest('button') || el.closest('a');
      if (parentBtn) el = parentBtn;
    }
  }
  if (el) {
    const isInHeader = el.closest('.header') !== null;
    if (f.scrollTop) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      await new Promise(resolve => setTimeout(resolve, 250));
      window.scrollTo({ top: 0, behavior: 'instant' });
      await new Promise(resolve => setTimeout(resolve, 150));
    } else if (!isInHeader) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      await new Promise(resolve => setTimeout(resolve, 420));
    } else {
      await new Promise(resolve => setTimeout(resolve, 80));
    }
    const rect = el.getBoundingClientRect();
    // Élément invisible (display:none en mode desktop) → pas de spotlight
    if (rect.width === 0 && rect.height === 0) {
      svg.innerHTML = `<rect width="${window.innerWidth}" height="${window.innerHeight}" fill="rgba(0,0,0,0.65)"/>`;
      finger.style.display = 'none';
      return;
    }
    const pad = 10, r = 14;
    const yOff = f.yOffset || 0;
    const x = rect.left - pad, y = rect.top - pad + yOff;
    const w = rect.width + pad*2, h = rect.height + pad*2;
    const W = window.innerWidth, H = window.innerHeight;
    svg.innerHTML = `<defs><mask id="ob-mask"><rect width="${W}" height="${H}" fill="white"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="black"/></mask></defs><rect width="${W}" height="${H}" fill="rgba(0,0,0,0.78)" mask="url(#ob-mask)"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="none" stroke="var(--sage,#22c55e)" stroke-width="2.5" stroke-dasharray="8 4" style="animation:obDash 1.5s linear infinite;"/>`;
    finger.style.display = '';
    const fingerBelow = rect.bottom + 50 < window.innerHeight * 0.62;
    finger.innerHTML = fingerBelow ? '👆' : '👇';
    finger.style.left = (rect.left + rect.width / 2 - 16) + 'px';
    finger.style.top = (fingerBelow ? rect.bottom + 6 : rect.top - 44) + 'px';
  } else {
    svg.innerHTML = `<rect width="${window.innerWidth}" height="${window.innerHeight}" fill="rgba(0,0,0,0.65)"/>`;
    finger.style.display = 'none';
  }
}

function obSkip() { obFinish(); }
function obFinish() {
  localStorage.setItem(OB_KEY, '1');
  const ob = document.getElementById('mat-onboarding');
  if (ob) {
    ob.style.pointerEvents = 'none';
    ob.style.transition = 'opacity 0.45s';
    ob.style.opacity = '0';
    setTimeout(() => { ob.style.display = 'none'; ob.style.opacity = ''; ob.style.pointerEvents = ''; }, 460);
  }
  document.body.style.overflow = '';
}

// Animations CSS onboarding (injectées à l'init)
(function(){
  const s = document.createElement('style');
  s.textContent = '@keyframes obBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}@keyframes obFinger{0%,100%{transform:translateY(0)}50%{transform:translateY(7px)}}@keyframes obDash{to{stroke-dashoffset:-24}}';
  document.head.appendChild(s);
})();

// Masquer option badge si non supporté
window.addEventListener('load', function(){
  if (!('setAppBadge' in navigator)) {
    const el = document.getElementById('opt-badge-notif');
    if (el) el.style.display = 'none';
  }
});
