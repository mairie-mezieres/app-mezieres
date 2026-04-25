/* ════════════════════════════════════════════════════════════
   MAT — Prompt notifications post-installation v3.7.7
   Propose d'activer les alertes juste après l'installation PWA.
   Chargé dynamiquement par mat-init.js.
   ════════════════════════════════════════════════════════════ */

var PUSH_PENDING_SYNC_KEY = 'mat_push_pending_sync';
var PUSH_ACTIVE_KEY = 'mat_push_active';

// Renouvelle silencieusement l'abonnement push si le navigateur l'a invalidé
async function checkAndRenewPushSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    var reg = await navigator.serviceWorker.ready;
    var sub = await reg.pushManager.getSubscription();
    if (sub) { localStorage.setItem(PUSH_ACTIVE_KEY, '1'); return; }
    if (!localStorage.getItem(PUSH_ACTIVE_KEY)) return;
    var newSub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUB)
    });
    fetch('https://chatbot-mairie-mezieres.onrender.com/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSub),
      keepalive: true
    }).then(function(r) {
      if (!r.ok) localStorage.setItem(PUSH_PENDING_SYNC_KEY, '1');
    }).catch(function() { localStorage.setItem(PUSH_PENDING_SYNC_KEY, '1'); });
  } catch(e) {}
}

// Retente l'enregistrement serveur si échoué lors d'une session précédente
async function retryPendingPushSync() {
  if (!localStorage.getItem(PUSH_PENDING_SYNC_KEY)) return;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    var reg = await navigator.serviceWorker.ready;
    var sub = await reg.pushManager.getSubscription();
    if (!sub) { localStorage.removeItem(PUSH_PENDING_SYNC_KEY); return; }
    var r = await fetch('https://chatbot-mairie-mezieres.onrender.com/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub),
      keepalive: true
    });
    if (r.ok) localStorage.removeItem(PUSH_PENDING_SYNC_KEY);
  } catch(_) {}
}

async function showPostInstallNotifPrompt() {
  if (localStorage.getItem(NOTIF_PROMPTED_KEY)) return;
  localStorage.setItem(NOTIF_PROMPTED_KEY, '1');

  var ua = navigator.userAgent || '';
  var ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var iosM = ua.match(/OS (\d+)/);
  var iosVer = iosM ? parseInt(iosM[1], 10) : null;

  if (ios && (iosVer === null || iosVer < 16)) return;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  if ('Notification' in window && Notification.permission === 'denied') return;

  try {
    var reg = await navigator.serviceWorker.ready;
    var sub = await reg.pushManager.getSubscription();
    if (sub) return;
  } catch(e) {}

  await new Promise(function(r){ setTimeout(r, 1200); });

  var accepted = await confirmMAT(
    'Voulez-vous recevoir les actualités communales et alertes directement sur votre téléphone ?',
    '\u2705 MAT est installé !', '\uD83D\uDD14', 'Activer les alertes', 'Plus tard'
  );

  if (!accepted) return;

  try {
    if (!('Notification' in window)) return;
    var perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      if (perm === 'denied') await alertMAT('Notifications bloquées. Modifiez les réglages de votre navigateur.', 'Notifications', '\uD83D\uDD14');
      return;
    }
    var reg2 = await navigator.serviceWorker.ready;
    var newSub = await reg2.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUB)
    });
    // Enregistrement serveur en arrière-plan ; si échec, flag pour retry au prochain lancement
    fetch('https://chatbot-mairie-mezieres.onrender.com/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSub),
      keepalive: true
    }).then(function(r) {
      if (!r.ok) localStorage.setItem(PUSH_PENDING_SYNC_KEY, '1');
      else localStorage.removeItem(PUSH_PENDING_SYNC_KEY);
    }).catch(function() {
      localStorage.setItem(PUSH_PENDING_SYNC_KEY, '1');
    });
    pushRegistered = true;
    localStorage.setItem(PUSH_ACTIVE_KEY, '1');
    try { updateNotifCardStatus(true); } catch(_) {}
    try {
      var btn = document.getElementById('push-btn');
      if (btn) { btn.textContent = 'Ne pas être alerté'; btn.classList.remove('on'); btn.classList.add('off'); }
    } catch(_) {}
    await alertMAT('Alertes activées ! Vous recevrez les actualités communales.', '\u2705 Notifications', '\uD83D\uDD14');
  } catch(e) {
    await alertMAT('Activation impossible pour l\'instant. Réessayez depuis le menu Notifications.', 'Notifications', '\u26A0\uFE0F');
  }
}

function checkFirstStandaloneRun() {
  if (!isStandaloneMode()) return;
  if (!localStorage.getItem(INSTALL_KEY)) {
    localStorage.setItem(INSTALL_KEY, '1');
    try { trackStat('installation', { device: detectDevice(), method: 'standalone' }); } catch(e) {}
    try { updateInstallBtn(); } catch(e) {}
  }
  showPostInstallNotifPrompt();
}

// Override installApp pour intercepter l'acceptation Chrome/Android
(function() {
  window.installApp = function() {
    if (typeof dp !== 'undefined' && dp) {
      dp.prompt();
      dp.userChoice.then(function(r) {
        if (r.outcome === 'accepted') {
          localStorage.setItem(INSTALL_KEY, '1');
          var banner = document.getElementById('install-banner');
          if (banner) banner.classList.add('hidden');
          setTimeout(showPostInstallNotifPrompt, 800);
        }
        dp = null;
      });
    } else {
      if (typeof openInstallHelp === 'function') openInstallHelp();
    }
  };
})();

// Cas appinstalled
window.addEventListener('appinstalled', function() {
  setTimeout(showPostInstallNotifPrompt, 800);
});

// Détection premier démarrage standalone — compatible chargement dynamique
if (document.readyState === 'complete') {
  setTimeout(checkFirstStandaloneRun, 1500);
  setTimeout(retryPendingPushSync, 3000);
  setTimeout(checkAndRenewPushSubscription, 5000);
} else {
  window.addEventListener('load', function() {
    setTimeout(checkFirstStandaloneRun, 1500);
    setTimeout(retryPendingPushSync, 3000);
    setTimeout(checkAndRenewPushSubscription, 5000);
  });
}
