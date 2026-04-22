/* ════════════════════════════════════════════════════════════
   MAT — Déchets v3.7.9
   Guide tri sélectif + rappels collecte push (18h la veille).
   Chargé dynamiquement par mat-init.js.
   ════════════════════════════════════════════════════════════ */

var DECHETS_NOTIF_KEY = 'mat_dechets_notif_v1';

var _TRI_DATA = [
  {
    id: 'jaune', color: '#eab308', bg: '#fefce8', border: 'rgba(234,179,8,0.35)',
    label: 'Bac jaune', emoji: '🟡',
    subtitle: 'Emballages & cartons',
    items: [
      '♻️ Bouteilles et flacons plastiques',
      '🥫 Boîtes de conserve et canettes',
      '🧃 Briques alimentaires',
      '📦 Cartons et boîtes d\'emballage',
      '🛍️ Sacs et films plastiques propres'
    ],
    tip: 'Videz et essorez les emballages — pas besoin de les laver.'
  },
  {
    id: 'bleu', color: '#3b82f6', bg: '#eff6ff', border: 'rgba(59,130,246,0.35)',
    label: 'Bac bleu', emoji: '🔵',
    subtitle: 'Papiers',
    items: [
      '📰 Journaux et magazines',
      '✉️ Courrier et enveloppes',
      '📚 Cahiers et livres',
      '🖨️ Papiers d\'impression',
      '📄 Brochures et prospectus'
    ],
    tip: 'Le papier mouillé ou gras n\'est pas recyclable — jetez-le dans le bac noir.'
  },
  {
    id: 'vert', color: '#22c55e', bg: '#f0fdf4', border: 'rgba(34,197,94,0.35)',
    label: 'Bac vert', emoji: '🟢',
    subtitle: 'Verre',
    items: [
      '🍷 Bouteilles en verre',
      '🫙 Bocaux et pots en verre',
      '🍯 Pots à confiture et conserves'
    ],
    tip: 'Retirez bouchons et couvercles. Pas de verre cassé en vrac ni de vaisselle.'
  }
];

function _triToggle(id) {
  _TRI_DATA.forEach(function(b) {
    var body = document.getElementById('tri-body-' + b.id);
    var chevron = document.getElementById('tri-chev-' + b.id);
    if (!body) return;
    var open = b.id === id ? body.style.display === 'none' : false;
    body.style.display = open ? 'block' : 'none';
    if (chevron) chevron.textContent = open ? '▲' : '▼';
  });
}

function _buildTriCard() {
  var html = '<div style="background:#fff;border-radius:14px;padding:14px;border:1px solid rgba(0,0,0,0.08);margin-bottom:12px;box-shadow:0 1px 4px rgba(0,0,0,0.06)">'
    + '<div style="font-size:0.86rem;font-weight:900;color:var(--forest);margin-bottom:10px">♻️ Guide du tri sélectif</div>';
  _TRI_DATA.forEach(function(b) {
    html += '<div style="border:1px solid ' + b.border + ';border-radius:10px;margin-bottom:8px;overflow:hidden">'
      + '<button onclick="_triToggle(\'' + b.id + '\')" style="width:100%;display:flex;align-items:center;gap:8px;padding:10px 12px;background:' + b.bg + ';border:none;cursor:pointer;font-family:Nunito,sans-serif;text-align:left">'
      + '<span style="font-size:1rem">' + b.emoji + '</span>'
      + '<span style="flex:1;font-size:0.82rem;font-weight:900;color:#1e293b">' + b.label + ' <span style="font-weight:600;color:#64748b">· ' + b.subtitle + '</span></span>'
      + '<span id="tri-chev-' + b.id + '" style="font-size:0.65rem;color:#94a3b8">▼</span>'
      + '</button>'
      + '<div id="tri-body-' + b.id + '" style="display:none;padding:10px 12px;background:#fff">'
      + '<ul style="margin:0 0 8px 0;padding-left:18px;list-style:none">';
    b.items.forEach(function(item) {
      html += '<li style="font-size:0.77rem;color:#334155;line-height:1.7;padding-left:0;margin-left:-4px">' + item + '</li>';
    });
    html += '</ul><div style="font-size:0.72rem;color:#64748b;background:#f8fafc;border-radius:6px;padding:6px 8px;line-height:1.5">💡 ' + b.tip + '</div>'
      + '</div></div>';
  });
  html += '</div>';
  return html;
}

// Patch loadDechetsDetail — ordre : collecte → rappels → tri → déchetterie
(function() {
  var _orig = window.loadDechetsDetail;
  window.loadDechetsDetail = function() {
    if (typeof _orig === 'function') _orig();
    var el = document.getElementById('dechets-content');
    if (!el) return;
    // Référence au bloc déchetterie (2e enfant) pour insérer avant lui
    var dechetterie = el.children[1] || null;

    // Carte rappels collecte — juste sous "Collecte des ordures"
    var card = document.createElement('div');
    card.style.cssText = 'background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-radius:14px;padding:14px;border:1px solid rgba(34,197,94,0.25);margin-bottom:12px';
    card.innerHTML = '<div style="font-size:0.86rem;font-weight:900;color:var(--forest);margin-bottom:4px">🔔 Rappels collecte</div>'
      + '<div style="font-size:0.75rem;color:var(--muted);line-height:1.55;margin-bottom:10px">Recevez une notification à 18h la veille de chaque collecte (bac noir et bac jaune).</div>'
      + '<button id="dechets-notif-btn" onclick="toggleDechetsNotif()" style="width:100%;padding:10px 14px;border:none;border-radius:10px;font-family:Nunito,sans-serif;font-size:0.8rem;font-weight:900;cursor:pointer;color:white;background:var(--forest)">Chargement…</button>'
      + '<div id="dechets-notif-info" style="font-size:0.7rem;color:var(--muted);margin-top:6px;min-height:1em"></div>';
    el.insertBefore(card, dechetterie);

    // Guide tri sélectif — entre rappels et déchetterie
    var triDiv = document.createElement('div');
    triDiv.innerHTML = _buildTriCard();
    el.insertBefore(triDiv, dechetterie);

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
  if (info) info.textContent = '';
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
    // Toujours synchroniser l'abonnement aux actualités (idempotent côté serveur)
    fetch('https://chatbot-mairie-mezieres.onrender.com/push/subscribe', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSub), keepalive: true
    }).catch(function() {});
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
