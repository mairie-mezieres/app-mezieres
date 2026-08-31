/* ╔════════════════════════════════════════════════════════════
   MAT — Prompt notifications post-installation v3.8.0
   Propose d'activer les alertes juste après l'installation PWA.
   Chargé dynamiquement par mat-boot.js.
   ╔════════════════════════════════════════════════════════════ */

// Stocke la clé VAPID publique dans le Cache API pour que le service worker
// puisse se ré-abonner lui-même lors d'un pushsubscriptionchange sans onglet ouvert.
if ('caches' in window && typeof VAPID_PUB !== 'undefined') {
  caches.open('mat-config-v1').then(function(cache) {
    cache.put('mat-vapid-public-key', new Response(VAPID_PUB, { headers: { 'Content-Type': 'text/plain' } }));
  }).catch(function() {});
}

// Stocke les préférences de canal (déchets / météo) dans le Cache API pour
// que le SW puisse les relire lors d'un pushsubscriptionchange sans onglet ouvert.
function _updatePushPrefsCache() {
  if (!('caches' in window)) return;
  var prefs = {
    dechets:    localStorage.getItem('mat_dechets_notif_v1') === '1',
    meteo:      localStorage.getItem('mat_meteo_notif_v1') !== '0',
    meteoLevel: parseInt(localStorage.getItem('mat_meteo_notif_level')) || 2,
  };
  caches.open('mat-config-v1').then(function(cache) {
    cache.put('mat-push-prefs', new Response(JSON.stringify(prefs), { headers: { 'Content-Type': 'application/json' } }));
  }).catch(function() {});
}
_updatePushPrefsCache();

// Recopie dans le Cache API la liste des tokens de suivi (signalements, idées,
// demandes, bugs) stockés en localStorage. Le service worker n'a PAS accès au
// localStorage : sans cette copie, il ne peut pas re-raccorder ces tokens lors
// d'un `pushsubscriptionchange` survenu sans onglet ouvert — et l'habitant ne
// reçoit plus jamais la réponse de la mairie. Même mécanisme que les préfs.
function _readNotifyTokens() {
  var out = [];
  try {
    var keys = Object.keys(localStorage);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].indexOf('mat:notify:idea:') !== 0 && keys[i].indexOf('mat:notify:signal:') !== 0) continue;
      var t = localStorage.getItem(keys[i]);
      if (t && out.indexOf(t) === -1) out.push(t);
    }
  } catch (_) {}
  return out;
}

function _updateNotifyTokensCache() {
  if (!('caches' in window)) return;
  var tokens = _readNotifyTokens();
  caches.open('mat-config-v1').then(function(cache) {
    cache.put('mat-notify-tokens', new Response(JSON.stringify(tokens), { headers: { 'Content-Type': 'application/json' } }));
  }).catch(function() {});
}
_updateNotifyTokensCache();

// Ce fichier est injecté par mat-boot.js : `_registerPendingNotifyTokens` vit
// dans mat-actus.js et peut manquer (cache partiel du SW, cf. ADR-0032). Repli
// local plutôt que de sauter le re-raccordement en silence.
function _registerNotifyTokensSafe(sub) {
  if (!sub) return;
  try {
    if (typeof _registerPendingNotifyTokens === 'function') {
      _registerPendingNotifyTokens(sub).catch(function() {});
      return;
    }
  } catch (_) {}
  var tokens = _readNotifyTokens();
  for (var i = 0; i < tokens.length; i++) {
    try {
      fetch(window.MAT_API + '/notify/register-token', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokens[i], sub: sub }), keepalive: true
      }).catch(function() {});
    } catch (_) {}
  }
}

// Re-synchronise les canaux push spécifiques (déchets + météo) selon les
// préférences enregistrées en localStorage. Fire-and-forget, erreurs ignorées.
function _syncSubChannels(sub) {
  if (localStorage.getItem('mat_dechets_notif_v1') === '1') {
    fetch(window.MAT_API+'/push/subscribe/dechets', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub), keepalive: true
    }).catch(function() {});
  }
  try {
    if (localStorage.getItem('mat_meteo_notif_v1') !== '0') {
      var lvl = parseInt(localStorage.getItem('mat_meteo_notif_level')) || 2;
      var subM = Object.assign(JSON.parse(JSON.stringify(sub)), { minLevel: lvl });
      fetch(window.MAT_API+'/push/subscribe/meteo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subM), keepalive: true
      }).catch(function() {});
    }
  } catch(_) {}
}

var PUSH_PENDING_SYNC_KEY = 'mat_push_pending_sync';
var PUSH_ACTIVE_KEY = 'mat_push_active';
var _lastPushSync = 0;
var PUSH_SYNC_COOLDOWN = 5 * 60 * 1000; // 5 minutes entre deux syncs visibilité

// Renouvelle silencieusement l'abonnement push si le navigateur l'a invalidé,
// et re-synchronise TOUS les canaux actifs (actus + déchets + météo) pour
// éviter que la liste mat:subs:dechets / mat:subs:meteo ne se vide en silence
// lors d'une rotation d'endpoint côté navigateur.
async function checkAndRenewPushSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    var reg = await navigator.serviceWorker.ready;
    var sub = await reg.pushManager.getSubscription();
    if (sub) {
      // ⛔ Les tokens de suivi se re-raccordent AVANT le garde-fou ci-dessous.
      // Ils appartiennent justement aux abonnements "réponse uniquement", qui
      // n'ont jamais PUSH_ACTIVE_KEY : les traiter après, c'est ne jamais les
      // traiter. Le backend met `sub = null` sur 410 en comptant sur ce
      // re-raccordement — sans lui, la réponse de la mairie n'arrive plus.
      _updateNotifyTokensCache();
      _registerNotifyTokensSafe(sub);
      // Ne ré-inscrire aux alertes générales que si l'utilisateur a explicitement opté
      // (évite d'inscrire les abonnements "réponse uniquement" créés via les formulaires)
      if (!localStorage.getItem(PUSH_ACTIVE_KEY)) return;
      _updatePushPrefsCache();
      // Re-synchroniser avec le serveur au cas où il a perdu la souscription (redémarrage Render/Redis)
      fetch(window.MAT_API+'/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
        keepalive: true
      }).then(function(r) {
        if (r.ok) { localStorage.removeItem(PUSH_PENDING_SYNC_KEY); _lastPushSync = Date.now(); }
        else localStorage.setItem(PUSH_PENDING_SYNC_KEY, '1');
      }).catch(function() { localStorage.setItem(PUSH_PENDING_SYNC_KEY, '1'); });
      // Re-sync canaux spécifiques : si l'endpoint a tourné, ces listes ont
      // gardé l'ancien endpoint mort — on remet le nouveau sans attendre.
      _syncSubChannels(sub);
      return;
    }
    if (!localStorage.getItem(PUSH_ACTIVE_KEY)) return;
    var newSub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUB)
    });
    _updatePushPrefsCache();
    fetch(window.MAT_API+'/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSub),
      keepalive: true
    }).then(function(r) {
      if (r.ok) _lastPushSync = Date.now();
      else localStorage.setItem(PUSH_PENDING_SYNC_KEY, '1');
    }).catch(function() { localStorage.setItem(PUSH_PENDING_SYNC_KEY, '1'); });
    _syncSubChannels(newSub);
    _updateNotifyTokensCache();
    _registerNotifyTokensSafe(newSub);
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
    var r = await fetch(window.MAT_API+'/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub),
      keepalive: true
    });
    if (r.ok) { localStorage.removeItem(PUSH_PENDING_SYNC_KEY); _lastPushSync = Date.now(); }
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

  var accepted = await _showNotifSheet();

  if (!accepted) return;

  try {
    if (!('Notification' in window)) return;
    var perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      if (perm === 'denied') await alertMAT('Notifications bloquées. Modifiez les réglages de votre navigateur.', 'Notifications', '🔔');
      return;
    }
    var reg2 = await navigator.serviceWorker.ready;
    var newSub = await reg2.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUB)
    });
    // Enregistrement serveur en arrière-plan ; si échec, flag pour retry au prochain lancement
    fetch(window.MAT_API+'/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSub),
      keepalive: true
    }).then(function(r) {
      if (!r.ok) localStorage.setItem(PUSH_PENDING_SYNC_KEY, '1');
      else { localStorage.removeItem(PUSH_PENDING_SYNC_KEY); _lastPushSync = Date.now(); }
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
    await alertMAT('Alertes activées ! Vous recevrez les actualités communales.', '✅ Notifications', '🔔');
  } catch(e) {
    await alertMAT('Activation impossible pour l\'instant. Réessayez depuis le menu Notifications.', 'Notifications', '⚠️');
  }
}

// Bottom sheet notifications : gros bouton CTA en haut pour accessibilité seniors
function _showNotifSheet() {
  return new Promise(function(resolve) {
    var sheet = document.createElement('div');
    sheet.id = 'mat-notif-sheet';
    sheet.style.cssText = 'position:fixed;top:0;right:0;bottom:0;left:0;z-index:9998;background:rgba(26,61,43,.55);backdrop-filter:blur(4px);display:flex;align-items:flex-end;justify-content:center;animation:fadeOv .2s ease;';
    sheet.innerHTML =
      '<div style="background:var(--warm,#f4f0ea);border-radius:20px 20px 0 0;padding:22px 20px 32px;width:100%;max-width:480px;box-shadow:0 -8px 40px rgba(0,0,0,.22);">'
      + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">'
      +   '<span style="font-size:1.4rem;">🔔</span>'
      +   '<span style="font-size:.94rem;font-weight:900;color:var(--text,#1a1a1a);flex:1;">MAT est installé !</span>'
      +   '<button id="_nsBtnClose" style="border:none;background:rgba(0,0,0,.08);width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:.9rem;flex-shrink:0;">✕</button>'
      + '</div>'
      + '<button id="_nsBtnOk" style="display:block;width:100%;background:linear-gradient(135deg,var(--forest,#1a3d2b),var(--leaf,#52b788));color:#fff;border:none;border-radius:14px;padding:17px;font-size:1.05rem;font-weight:900;cursor:pointer;margin-bottom:14px;font-family:\'Nunito\',sans-serif;">🔔  Activer les alertes</button>'
      + '<p style="font-size:.82rem;color:var(--muted,#64748b);line-height:1.6;text-align:center;margin:0 0 4px;">Recevez les actualités communales et alertes directement sur votre téléphone.</p>'
      + '<button id="_nsBtnLater" style="display:block;width:100%;background:none;border:none;color:var(--muted,#64748b);font-size:.82rem;padding:10px 0 0;cursor:pointer;font-family:\'Nunito\',sans-serif;">Plus tard</button>'
      + '</div>';
    document.body.appendChild(sheet);
    function done(result) { sheet.remove(); resolve(result); }
    document.getElementById('_nsBtnOk').onclick    = function() { done(true);  };
    document.getElementById('_nsBtnLater').onclick = function() { done(false); };
    document.getElementById('_nsBtnClose').onclick = function() { done(false); };
    sheet.onclick = function(e) { if (e.target === sheet) done(false); };
  });
}

// Ce fichier est injecté dynamiquement par mat-boot.js : il ne peut PAS tenir
// pour acquis que mat-core.js a été exécuté. Sentry #425 :
// « ReferenceError: isStandaloneMode is not defined » — un seul .js manquant
// (cache partiel du service worker, coupure réseau) suffisait à faire planter
// tout le démarrage standalone, donc le comptage d'installation ET la
// proposition d'activer les notifications. Le repli reproduit le test de
// mat-core.js ; il doit rester en phase avec lui.
function _isStandaloneModeSafe() {
  try {
    if (typeof isStandaloneMode === 'function') return isStandaloneMode();
  } catch (e) {}
  try {
    return window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;
  } catch (e) { return false; }
}

function checkFirstStandaloneRun() {
  if (!_isStandaloneModeSafe()) return;
  if (localStorage.getItem(INSTALL_KEY) !== '1') {
    localStorage.setItem(INSTALL_KEY, '1');
    try { updateInstallBtn(); } catch(e) {}
  }
  // Comptage dédoublonné (drapeau mat_install_tracked, cf. mat-utils.js) :
  // ne recompte pas un appareil déjà vu par l'événement `appinstalled`, et
  // compte enfin ceux qui avaient masqué la bannière avant d'installer.
  try { if (typeof trackInstallOnce === 'function') trackInstallOnce({ method: 'standalone' }); } catch(e) {}
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

// Re-sync au retour au premier plan (ex: app en arrière-plan puis rouverte)
document.addEventListener('visibilitychange', function() {
  if (document.visibilityState !== 'visible') return;
  if (Date.now() - _lastPushSync < PUSH_SYNC_COOLDOWN) return;
  retryPendingPushSync();
  checkAndRenewPushSubscription();
});

// Détection premier démarrage standalone — compatible chargement dynamique
if (document.readyState === 'complete') {
  setTimeout(checkFirstStandaloneRun, 1500);
  setTimeout(retryPendingPushSync, 2000);
  setTimeout(checkAndRenewPushSubscription, 2000);
} else {
  window.addEventListener('load', function() {
    setTimeout(checkFirstStandaloneRun, 1500);
    setTimeout(retryPendingPushSync, 2000);
    setTimeout(checkAndRenewPushSubscription, 2000);
  });
}
