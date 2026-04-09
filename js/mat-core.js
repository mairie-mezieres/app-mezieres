/* ════════════════════════════════════════════════════════════
   MAT — Core v3.7.0
   Overlays, installation PWA, splash, init
   ════════════════════════════════════════════════════════════ */

// ── Installation PWA ──────────────────────────────────────
let dp = null;

function isStandaloneMode(){
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function shouldHideInstallBanner(){
  if(isStandaloneMode()) return true;
  const v = localStorage.getItem(INSTALL_KEY);
  return v === '1' || v === 'dismissed';
}

function refreshInstallBannerVisibility(){
  const banner = document.getElementById('install-banner');
  if(!banner) return;
  banner.style.display = '';
  if(shouldHideInstallBanner()) banner.classList.add('hidden');
  else banner.classList.remove('hidden');
}

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  dp = e;
  if(!isStandaloneMode() && localStorage.getItem(INSTALL_KEY) !== 'dismissed'){
    const banner = document.getElementById('install-banner');
    if(banner) banner.classList.remove('hidden');
  }
});

window.addEventListener('appinstalled', () => {
  localStorage.setItem(INSTALL_KEY, '1');
  const banner = document.getElementById('install-banner');
  if(banner) banner.classList.add('hidden');
  trackStat('installation', { device: detectDevice() });
  updateInstallBtn();
});

function updateInstallBanner() {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const titleEl = document.getElementById('ib-title-txt');
  const subEl   = document.getElementById('ib-sub-txt');

  if (!isMobile) {
    if (titleEl) titleEl.textContent = 'Installez MAT sur votre ordinateur !';
    if (subEl) subEl.textContent = 'Chrome/Edge : cliquez l’icône ⊕ dans la barre d’adresse · Firefox : non supporté';
  }

  refreshInstallBannerVisibility();
}

function installApp(){
  if(dp){
    dp.prompt();
    dp.userChoice.then(r => {
      if(r.outcome === 'accepted'){
        localStorage.setItem(INSTALL_KEY, '1');
        const banner = document.getElementById('install-banner');
        if(banner) banner.classList.add('hidden');
      }
      dp = null;
    });
  } else {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      alertMAT(
        'Pour installer MAT :\n\niPhone/iPad : bouton Partager → "Sur l’écran d’accueil"\n\nAndroid : menu navigateur → "Ajouter à l’écran d’accueil"',
        'Installer MAT',
        '📲'
      );
    } else {
      alertMAT(
        'Pour installer MAT sur PC :\n\nChrome / Edge : cliquez sur l’icône ⊕ dans la barre d’adresse\n\nSinon ouvrez le menu du navigateur → "Installer l’application"',
        'Installer MAT',
        '📲'
      );
    }
  }
}

function hideBanner(e){
  e.stopPropagation();
  const banner = document.getElementById('install-banner');
  if(banner) banner.classList.add('hidden');
  localStorage.setItem(INSTALL_KEY, 'dismissed');
}

// ── Overlays + gestion bouton retour ─────────────────────────
const _ovStack = [];

function openOv(id){
  document.getElementById('ov-'+id).classList.add('open');
  document.body.style.overflow='hidden';
  _ovStack.push(id);
}
function closeOv(id){
  document.getElementById('ov-'+id).classList.remove('open');
  const idx = _ovStack.lastIndexOf(id);
  if(idx !== -1) _ovStack.splice(idx,1);
  if(_ovStack.length === 0) document.body.style.overflow='';
}
function ovClick(id,e){ if(e.target===document.getElementById('ov-'+id)) closeOv(id); }

// Bouton retour navigateur ferme le dernier overlay ouvert
window.addEventListener('popstate', function(){
  if(_ovStack.length > 0){
    const last = _ovStack[_ovStack.length-1];
    closeOv(last);
    history.pushState({mat:'overlay'}, '');
  }
});
history.pushState({mat:'overlay'}, '');

// ── Ouvertures d'overlays ────────────────────────────────────
function openMajordome(){ openOv('majordome'); }
function openConseil(){ openOv('conseil'); buildTrombi(); }
function openMel(){
  openOv('mel');
  renderContextHelp('mel');
  melShowTree();
}
function openSignal(){openOv('signal'); restoreSignalFormState(); renderContextHelp('signal');}
function openIdees(){openOv('idees'); loadIdees();}
function openNotifs(){openOv('notifs'); loadActus(); checkPushStatus();}
function openRgpd(){openOv('rgpd');}
function openMeteo(){openOv('meteo'); loadMeteoDetail();}
function openContact(){openOv('contact'); restoreContactFormState(); renderContextHelp('contact');}
function openAgenda(){
  openOv('agenda');
  _agendaYear=new Date().getFullYear();
  _agendaMonth=new Date().getMonth();
  loadAgenda();
}
function openDechets(){openOv('dechets'); loadDechetsDetail();}
function openNums(){ openOv('nums'); }
function openBug(){ openOv('bug'); restoreBugFormState(); }

function openAgendaFromTopEvent(){
  openOv('agenda');
  ensureAgendaEvents().then(function(evts){
    if(!evts||!evts.length)return;
    var first=evts[0];
    _agendaYear=first.start.getFullYear();
    _agendaMonth=first.start.getMonth();
    renderAgenda();
    setTimeout(function(){openEventDetail(first.uid);},200);
  }).catch(function(){loadAgenda();});
}

// Mapping tracking sur ouvertures
(function(){
  const _origOpenMel = openMel,
        _origOpenSignal = openSignal,
        _origOpenIdees = openIdees,
        _origOpenNotifs = openNotifs,
        _origOpenMeteo = openMeteo,
        _origOpenContact = openContact;

  window.openMel = () => { trackStat('mel'); _origOpenMel(); };
  window.openSignal = () => { trackStat('signalement'); _origOpenSignal(); };
  window.openIdees = () => { trackStat('idees'); _origOpenIdees(); };
  window.openNotifs = () => { trackStat('actualites'); _origOpenNotifs(); };
  window.openMeteo = () => { trackStat('meteo'); _origOpenMeteo(); };
  window.openContact = () => { trackStat('contact'); _origOpenContact(); };
})();

// ── Bouton install / bug ──────────────────────────────────────
function updateInstallBtn(){
  const ico=document.getElementById('iob-ico');
  const label=document.getElementById('iob-label');
  const sub=document.getElementById('iob-sub');
  const btn=document.getElementById('btn-install-or-bug');
  if(btn) btn.onclick=()=>openOv('bug');
  if(ico) ico.textContent='🐞';
  if(label) label.textContent='Signaler un bug';
  if(sub) sub.textContent="On s'en occupe !";
}
function installOrBug(){ openBug(); }

// ── Date du jour + saint dans le header ──────────────────────
const SAINTS = [
  ["Marie","Basile","Geneviève","Odilon","Édouard","Melchior","Raymond","Lucien","Alix","Guillaume",
   "Paulin","Tatiana","Yvette","Nina","Rémi","Marcel","Roseline","Prisca","Marius","Sébastien",
   "Agnès","Vincent","Barnard","François","Conv.Paul","Timothée","Angèle","Thomas Aquin","Gildas","Martine","Marcelle"],
  ["Ella","Présentation","Blaise","Véronique","Agathe","Gaston","Eugénie","Jacqueline","Apolline","Arnaud",
   "N.-D.Lourdes","Félix","Béatrice","Valentin","Claude","Julienne","Alexis","Bernadette","Gabin","Aimée",
   "Damien","Isabelle","Lazare","Modeste","Roméo","Nestor","Honorine","Romain","Auguste","--","--"],
  ["Aubin","Charles","Guénolé","Casimir","Olive","Colette","Félicité","Jean de Dieu","Françoise","Vivien",
   "Rosine","Justine","Rodrigue","Mathilde","Louise","Bénédicte","Patrick","Cyrille","Joseph","Herbert",
   "Clémence","Léa","Victorien","Cath.de Suède","Annonciation","Larissa","Habib","Gontran","Gwladys","Amédée","Benjamin"],
  ["Hugues","Sandrine","Richard","Isidore","Irène","Marcellin","J-B.de la Salle","Julie","Gautier","Fulbert",
   "Stanislas","Jules","Ida","Maxime","Paterne","Benoît-Joseph","Anicet","Parfait","Emma","Odette",
   "Anselme","Alexandre","Georges","Fidèle","Marc","Alida","Zita","Valérie","Catherine","Robert","--"],
  ["Fête du Travail","Boris","Phil.et Jacques","Sylvain","Judith","Prudence","Gisèle","Victoire","Pacôme","Isidore",
   "Estelle","Achille","Rolande","Matthias","Denise","Honoré","Pascal","Éric","Yves","Bernardin",
   "Constantin","Rita","Didier","Donatien","Sophie","Bérenger","Augustin","Germain","Aymar","Ferdinand","Pétronille"],
  ["Justin","Blandine","Kévin","Clotilde","Igor","Norbert","Gilbert","Médard","Diane","Landry",
   "Barnabé","Guy","Antoine","Élisée","Germaine","J-F.Régis","Hervé","Léonce","Romuald","Silvère",
   "Rodolphe","Alban","Audrey","Jean-Baptiste","Prosper","Anthelme","Fernand","Irénée","Pierre et Paul","Martial","--"],
  ["Thierry","Martinien","Thomas","Florent","Antoine","Mariette","Raoul","Thibaut","Amandine","Ulrich",
   "Benoît","Olivier","Henri","Camille","Bonaventure","N.-D.Carmel","Charlotte","Frédéric","Arsène","Marina",
   "Victor","Marie-Madeleine","Brigitte","Christine","Jacques","Anne","Nathalie","Samson","Marthe","Juliette","Ignace"],
  ["Alphonse","Julien Eymard","Lydie","Jean-Marie Vianney","Abel","Transfiguration","Gaétan","Dominique","Amour","Laurent",
   "Claire","Clarisse","Hippolyte","Evrard","Assomption","Armel","Hyacinthe","Hélène","Jean-Claude","Bernard",
   "Christophe","Fabrice","Rose","Barthélemy","Louis","Natacha","Monique","Augustin","Sabine","Fiacre","Aristide"],
  ["Gilles","Ingrid","Grégoire","Rosalie","Raïssa","Bertrand","Reine","Nativité","Alain","Inès",
   "Adelphe","Apollinaire","Aimé","La Sainte-Croix","Roland","Édith","Lambert","Nadège","Émilie","Davy",
   "Matthieu","Maurice","Constance","Thècle","Hermann","Côme et Damien","Vinc.de Paul","Venceslas","Michel","Jérôme","--"],
  ["Thérèse","Léger","Gérard","François","Fleur","Bruno","Serge","Pélagie","Denis","Ghislain",
   "Firmin","Wilfrid","Géraud","Juste","Thérèse Avila","Edwige","Baudouin","Luc","René","Adeline",
   "Céline","Élodie","Jean de Capistran","Florentin","Crépin","Dimitri","Émeline","Simon et Jude","Narcisse","Bienvenu","Quentin"],
  ["Toussaint","Défunts","Hubert","Charles","Sylvie","Bertille","Carine","Geoffrey","Théodore","Léon",
   "Martin","Christian","Brice","Sidoine","Albert","Marguerite","Élisabeth","Aude","Tanguy","Edmond",
   "Prés.Marie","Cécile","Clément","Flora","Catherine","Delphine","Sévrin","Jacques","Saturnin","André","--"],
  ["Florence","Viviane","François-Xavier","Barbara","Gérald","Nicolas","Ambroise","Immac.Conception","Pierre Fourier","Romaric",
   "Daniel","Jeanne de Chantal","Lucie","Odile","Ninon","Alice","Gaël","Gatien","Urbain","Abraham",
   "Pierre Canisius","Françoise-Xavière","Armand","Adèle","Noël","Étienne","Jean","Innocents","David","Roger","Sylvestre"]
];

function loadDateBadge() {
  const el = document.getElementById('mat-date-badge');
  if (!el) return;
  const now = new Date();
  const JOURS = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const MOIS  = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  const j = JOURS[now.getDay()];
  const d = now.getDate();
  const m = now.getMonth();
  const suf = d === 1 ? 'er' : '';
  const saint = (SAINTS[m] && SAINTS[m][d-1] && SAINTS[m][d-1] !== '--') ? SAINTS[m][d-1] : null;
  el.innerHTML = esc(j) + ' ' + d + suf + ' ' + esc(MOIS[m])
    + (saint ? '<br><span style="font-style:italic;font-weight:400;font-size:0.52rem;opacity:0.8">Ste/St ' + esc(saint) + '</span>' : '');
}

// ── Déprotection email mairie ─────────────────────────────────
function initMailProtection(){
  const link = document.getElementById('mairie-mail-link');
  if (!link) return;
  const email = atob('bWFpcmllQG1lemllcmVzLWxlei1jbGVyeS5mcg==');
  link.href = 'mailto:' + email;
  link.textContent = email;
}

// ── Splash d'ouverture ────────────────────────────────────────
let _splashShownAt = Date.now();
function hideSplash(forceDelay){
  const splash=document.getElementById('app-splash');
  if(!splash) return;
  const elapsed=Date.now()-_splashShownAt;
  const wait=Math.max(forceDelay||0, 1000-elapsed);
  setTimeout(function(){ document.body.classList.remove('preload'); document.body.classList.add('app-ready'); splash.classList.add('hide'); }, wait);
}
window.addEventListener('load', function(){ hideSplash(0); });

// ── Vider cache ──────────────────────────────────────────────
async function clearCacheAndReload() {
  localStorage.removeItem(ACC_KEY);
  const html = document.documentElement;
  html.classList.remove('font-large','font-xl','high-contrast','large-touch','line-spacing','theme-bleu','theme-sombre','no-header','no-widgets','colorblind-mode','simplified-mode');

  const bannerKeys = Object.keys(localStorage).filter(k => k.startsWith('mat_banner_dismissed'));
  bannerKeys.forEach(k => localStorage.removeItem(k));

  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
  }

  const toast = document.createElement('div');
  toast.textContent = '✅ Cache vidé — rechargement…';
  toast.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--forest);color:white;padding:16px 28px;border-radius:14px;font-family:Nunito,sans-serif;font-size:.88rem;font-weight:800;z-index:99999;box-shadow:0 8px 30px rgba(0,0,0,.3);';
  document.body.appendChild(toast);
  localStorage.removeItem(INSTALL_KEY);
  dp = null;
  setTimeout(() => window.location.reload(true), 600);
}

// ── Fix iPhone clavier / viewport ─────────────────────────────
function fixIOSViewportAfterKeyboard(){
  try{
    document.documentElement.style.width='100%';
    document.body.style.width='100%';
    document.documentElement.style.overflowX='hidden';
    document.body.style.overflowX='hidden';
    var vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    document.documentElement.style.setProperty('--vvh', vh + 'px');
  }catch(e){}
}

document.addEventListener('focusin', function(e){
  var t=e.target;
  if(t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)){
    fixIOSViewportAfterKeyboard();
    setTimeout(fixIOSViewportAfterKeyboard, 120);
    setTimeout(fixIOSViewportAfterKeyboard, 350);
  }
});

document.addEventListener('focusout', function(e){
  var t=e.target;
  if(t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)){
    setTimeout(function(){
      fixIOSViewportAfterKeyboard();
    }, 180);
  }
});

window.addEventListener('resize', function(){
  fixIOSViewportAfterKeyboard();
});
if(window.visualViewport){
  window.visualViewport.addEventListener('resize', fixIOSViewportAfterKeyboard);
  window.visualViewport.addEventListener('scroll', fixIOSViewportAfterKeyboard);
}

// ── Touche Échap pour fermer overlays & modales ───────────────
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    const matModal = document.getElementById('mat-modal');
    if (matModal && matModal.classList.contains('open')) { closeMatModal(false); return; }
    const trombi = document.getElementById('trombi-modal');
    if (trombi && trombi.style.display === 'flex') { closeTrombi(e); return; }
    if (_ovStack.length > 0) { closeOv(_ovStack[_ovStack.length - 1]); return; }
  }
});

// ── Détection hors-ligne ──────────────────────────────────────
(function(){
  let offlineBanner = null;
  function showOffline() {
    if (offlineBanner) return;
    offlineBanner = document.createElement('div');
    offlineBanner.id = 'mat-offline-banner';
    offlineBanner.innerHTML = '📡 Pas de connexion — certaines fonctions peuvent être limitées';
    offlineBanner.style.cssText = 'position:fixed;top:0;left:0;right:0;padding:8px 16px;background:#dc2626;color:white;font-family:Nunito,sans-serif;font-size:.72rem;font-weight:800;text-align:center;z-index:99998;box-shadow:0 2px 10px rgba(0,0,0,.3);animation:fadeOv .2s ease;';
    document.body.prepend(offlineBanner);
  }
  function hideOffline() {
    if (offlineBanner) { offlineBanner.remove(); offlineBanner = null; }
  }
  window.addEventListener('offline', showOffline);
  window.addEventListener('online', function(){ hideOffline(); loadMeteo(); loadEvents(); refreshActusBadge(); });
  if (!navigator.onLine) showOffline();
})();

// ── Service Worker + hash routing ─────────────────────────────
function handleMatHashRoute(){
  try{
    var h=(location.hash||'').trim();
    if(!h) return;
    if(h==='#notifs'){ setTimeout(function(){ openNotifs(); }, 180); return; }
    if(h==='#mel'){ setTimeout(function(){ openMel(); }, 180); return; }
    if(h.indexOf('#actu=')===0){
      var raw=h.substring(6);
      var id=decodeURIComponent(raw||'').trim();
      if(id && typeof openActuDetail==='function'){
        setTimeout(function(){ openActuDetail(id,{ fromHash:true }); }, 220);
      }
    }
  }catch(e){}
}

if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
  navigator.serviceWorker.addEventListener('message', function(e){
    var data=(e&&e.data)||{};
    if(data.action==='openNotifs'){ openNotifs(); return; }
    if(data.action==='openActu' && data.actuId!=null && typeof openActuDetail==='function'){
      openActuDetail(String(data.actuId),{ fromHash:false });
      return;
    }
    if(data.action==='openUrl' && data.url){
      try{
        var url=String(data.url);
        if(url.indexOf('#')!==-1){
          location.hash=url.substring(url.indexOf('#'));
          handleMatHashRoute();
        }
      }catch(_e){}
    }
  });
}
handleMatHashRoute();
window.addEventListener('hashchange', handleMatHashRoute);

window.addEventListener('load', function(){
  setTimeout(checkPushStatus, 250);
  setTimeout(refreshActusBadge, 300);
});
window.addEventListener('pageshow', function(){
  setTimeout(checkPushStatus, 150);
  setTimeout(refreshActusBadge, 200);
});
document.addEventListener('visibilitychange', function(){
  if(document.visibilityState==='visible'){
    checkPushStatus();
    refreshActusBadge();
    trackStat('app_resume');
  }
});

// Plus fiable que load
document.addEventListener('DOMContentLoaded', () => {
  trackAppOpenOncePerDay();
});
