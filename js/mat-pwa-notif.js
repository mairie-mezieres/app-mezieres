/* ════════════════════════════════════════════════════════════
   MAT — Prompt notifications post-installation v3.7.5
   Propose d'activer les alertes juste après l'installation PWA.
   Chargé après mat-core.js, mat-actus.js et mat-utils.js.
   ════════════════════════════════════════════════════════════ */

// Affiche la modale de proposition d'alertes
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
    'Voulez-vous recevoir les actualités communales et alertes directement sur votre téléphone ?',
    '✅ MAT est installé !',
    '🔔',
    'Activer les alertes',
    'Plus tard'
  );

  if (accepted) {
    try { await togglePush(); } catch(e) {}
  }
}

// Détection premier lancement en mode standalone (iOS / navigateurs sans beforeinstallprompt)
function checkFirstStandaloneRun() {
  if (!isStandaloneMode()) return;
  if (!localStorage.getItem(INSTALL_KEY)) {
    localStorage.setItem(INSTALL_KEY, '1');
    try { trackStat('installation', { device: detectDevice(), method: 'standalone' }); } catch(e) {}
    try { updateInstallBtn(); } catch(e) {}
  }
  showPostInstallNotifPrompt();
}

// Cas Chrome/Android : override de installApp pour intercepter l'acceptation
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

// Cas appinstalled (complète le listener de mat-core.js)
window.addEventListener('appinstalled', function() {
  setTimeout(showPostInstallNotifPrompt, 800);
});

// Détection premier démarrage standalone au chargement
window.addEventListener('load', function() {
  setTimeout(checkFirstStandaloneRun, 1500);
});
