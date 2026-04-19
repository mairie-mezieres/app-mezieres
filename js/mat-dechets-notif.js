/* ════════════════════════════════════════════════════════════
   MAT — Rappels collecte déchets v3.7.8
   Bouton dans l'overlay déchets pour activer les notifications
   de rappel la veille des collectes (à 18h).
   Chargé dynamiquement par mat-init.js.
   ════════════════════════════════════════════════════════════ */

var DECHETS_NOTIF_KEY = 'mat_dechets_notif_v1';

// Patch loadDechetsDetail pour ajouter la carte notification en bas
(function() {
  var _orig = window.loadDechetsDetail;
  window.loadDechetsDetail = function() {
    if (typeof _orig === 'function') _orig();
    var el = document.getElementById('dechets-content');
    if (!el) return;
    var card = document.createElement('div');
    card.style.cssText = 'background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-radius:14px;padding:14px;border:1px solid rgba(34,197,94,0.25);margin-bottom:12px';
    card.innerHTML = '<div style="font-size:0.86rem;font-weight:900;color:var(--forest);margin-bottom:4px">🔔 Rappels collecte</div>'
      + '<div style="font-size:0.75rem;color:var(--muted);line-height:1.55;margin-bottom:10px">Recevez une notification à 18h la veille de chaque collecte (bac noir et bac jaune).</div>'
      + '<button id="dechets-notif-btn" onclick="toggleDechetsNotif()" style="width:100%;padding:10px 14px;border:none;border-radius:10px;font-family:Nunito,sans-serif;font-size:0.8rem;font-weight:900;cursor:pointer;color:white;background:var(--forest)">Chargement…</button>'
      + '<div id="dechets-notif-info" style="font-size:0.7rem;color:var(--muted);margin-top:6px;min-height:1em"></div>';
    el.appendChild(card);
    checkDechetsNotifStatus();
  };
})();

async function checkDechetsNotifStatus() {
  var btn = document.getElementById('dechets-notif-btn');
  var info = document.getElementById('dechets-notif-info');
  if (!btn) return;
  var ua = navigator.userAgent || '';
  var ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var iosM = ua.match(/OS (\d+)/);
  var iosVer = iosM ? parseInt(iosM[1], 10) : null;
  if (ios && (iosVer === null || iosVer < 16)) {
    btn.textContent = 'Non disponible (iOS ≤ 15)';
    btn.disabled = true;
    return;
  }
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    btn.textContent = 'Non supporté sur ce navigateur';
    btn.disabled = true;
    return;
  }
  if ('Notification' in window && Notification.permission === 'denied') {
    btn.textContent = 'Notifications bloquées';
    btn.disabled = true;
    if (info) info.textContent = 'Activez les notifications dans les réglages du navigateur.';
    return;
  }
  var enabled = !!localStorage.getItem(DECHETS_NOTIF_KEY);
  btn.disabled = false;
  btn.textContent = enabled ? '🔕 Désactiver les rappels' : '🔔 Activer les rappels collecte';
  btn.style.background = enabled ? '#ef4444' : 'var(--forest)';
  if (info) info.textContent = enabled ? 'Rappel à 18h la veille de chaque collecte.' : '';
}

async function toggleDechetsNotif() {
  var btn = document.getElementById('dechets-notif-btn');
  var info = document.getElementById('dechets-notif-info');
  if (btn) { btn.disabled = true; btn.textContent = 'Chargement…'; }
  var enabled = !!localStorage.getItem(DECHETS_NOTIF_KEY);
  if (enabled) {
    try {
      var reg = await navigator.serviceWorker.ready;
      var sub = await reg.pushManager.getSubscription();
      if (sub) {
        fetch('https://chatbot-mairie-mezieres.onrender.com/push/unsubscribe/dechets', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }), keepalive: true
        }).catch(function() {});
      }
    } catch(_) {}
    localStorage.removeItem(DECHETS_NOTIF_KEY);
    checkDechetsNotifStatus();
    return;
  }
  try {
    var perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      if (info) info.textContent = perm === 'denied' ? 'Notifications bloquées dans les réglages.' : 'Permission non accordée.';
      checkDechetsNotifStatus();
      return;
    }
    var reg2 = await navigator.serviceWorker.ready;
    var existingSub = await reg2.pushManager.getSubscription();
    var newSub = existingSub || await reg2.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUB)
    });
    if (!existingSub) {
      fetch('https://chatbot-mairie-mezieres.onrender.com/push/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSub), keepalive: true
      }).catch(function() {});
    }
    await fetch('https://chatbot-mairie-mezieres.onrender.com/push/subscribe/dechets', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSub)
    });
    localStorage.setItem(DECHETS_NOTIF_KEY, '1');
    checkDechetsNotifStatus();
  } catch(e) {
    if (info) info.textContent = 'Activation impossible pour l\'instant. Réessayez.';
    checkDechetsNotifStatus();
  }
}
