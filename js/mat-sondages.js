/* ═══════════════════════════════════════════════════════════
   MAT — Sondages citoyens v4.0.0
   ═══════════════════════════════════════════════════════════ */
var _SONDAGES_API = 'https://chatbot-mairie-mezieres.onrender.com';
var _selectedStar = 0;
var _currentSondages = [];

async function loadSondages() {
  var el = document.getElementById('sondages-container');
  if (!el) return;
  el.innerHTML = '<div class="actu-empty">Chargement…</div>';
  try {
    var r = await fetch(_SONDAGES_API + '/sondages', {cache:'no-store'});
    var d = await r.json();
    _currentSondages = d.sondages || [];
    _renderSondagesList();
    refreshSondagesBadge();
  } catch(e) {
    el.innerHTML = '<div class="actu-empty">Impossible de charger les sondages.</div>';
  }
}

function _renderSondagesList() {
  var el = document.getElementById('sondages-container');
  if (!el) return;
  if (!_currentSondages.length) {
    el.innerHTML = '<div class="actu-empty" style="text-align:center;padding:28px 0">&#128202; Aucun sondage en cours.<br><span style="font-size:0.76rem;color:var(--muted)">Revenez bientôt !</span></div>';
    return;
  }
  el.innerHTML = _currentSondages.map(function(s){ return _renderSondageCard(s); }).join('');
}

function _renderSondageCard(s) {
  var voted = !!localStorage.getItem('mat_voted_' + s.id);
  var TYPES = {texte_libre:'Texte libre', choix_unique:'Choix unique', choix_multiple:'Choix multiple', notation_etoiles:'Notation étoiles'};
  var endsStr = s.endsAt ? '<span style="font-size:0.7rem;color:var(--muted)">Jusqu\'au ' + new Date(s.endsAt).toLocaleDateString('fr-FR') + '</span>' : '';
  return '<div style="background:var(--card);border-radius:14px;border:1px solid var(--border);padding:16px;margin-bottom:12px">'
    + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:10px">'
    + '<div style="font-weight:900;font-size:0.9rem;line-height:1.35;color:var(--text)">' + esc(s.titre) + '</div>'
    + (voted ? '<span style="background:#86efac;color:#166534;border-radius:6px;padding:2px 8px;font-size:0.68rem;font-weight:900;white-space:nowrap">✓ Voté</span>' : '')
    + '</div>'
    + (s.description ? '<div style="font-size:0.78rem;color:var(--muted);margin-bottom:10px;line-height:1.45">' + esc(s.description) + '</div>' : '')
    + '<div style="display:flex;justify-content:space-between;align-items:center">'
    + '<span style="font-size:0.7rem;color:var(--muted)">' + (TYPES[s.type] || s.type) + (s.totalVotes ? ' · ' + s.totalVotes + ' réponse' + (s.totalVotes > 1 ? 's' : '') : '') + '</span>'
    + endsStr + '</div>'
    + (!voted
      ? '<button onclick="_openSondageDetail(' + s.id + ')" style="margin-top:12px;width:100%;background:linear-gradient(135deg,var(--forest),var(--leaf));color:white;border:none;border-radius:10px;padding:11px;font-family:Nunito,sans-serif;font-size:0.84rem;font-weight:900;cursor:pointer">Participer →</button>'
      : '<button onclick="_openSondageDetail(' + s.id + ')" style="margin-top:12px;width:100%;background:var(--warm);color:var(--muted);border:1px solid var(--border);border-radius:10px;padding:11px;font-family:Nunito,sans-serif;font-size:0.84rem;font-weight:800;cursor:pointer">Voir les résultats</button>')
    + '</div>';
}

function _openSondageDetail(id) {
  var s = _currentSondages.find(function(x){ return x.id === id; });
  if (!s) return;
  var el = document.getElementById('sondages-container');
  if (!el) return;
  var voted = !!localStorage.getItem('mat_voted_' + id);
  el.innerHTML = '<button onclick="_sondageBack()" style="background:none;border:none;color:var(--leaf);font-family:Nunito,sans-serif;font-size:0.82rem;font-weight:900;cursor:pointer;padding:0;margin-bottom:16px">← Retour</button>'
    + '<div style="font-weight:900;font-size:1rem;color:var(--text);margin-bottom:6px">' + esc(s.titre) + '</div>'
    + (s.description ? '<div style="font-size:0.8rem;color:var(--muted);margin-bottom:14px;line-height:1.45">' + esc(s.description) + '</div>' : '')
    + (voted ? _renderSondageResults(s, null) : _renderSondageForm(s));
}

function _sondageBack() {
  _renderSondagesList();
}

function _renderSondageForm(s) {
  _selectedStar = 0;
  var html = '';
  if (s.type === 'texte_libre') {
    html += '<textarea id="sond-input-' + s.id + '" placeholder="Votre réponse…" rows="4" style="width:100%;border:1.5px solid var(--border);border-radius:10px;padding:10px 12px;font-family:Nunito,sans-serif;font-size:0.84rem;resize:vertical;box-sizing:border-box"></textarea>';
  } else if (s.type === 'choix_unique') {
    html += '<div style="display:flex;flex-direction:column;gap:8px">' + (s.options||[]).map(function(opt) {
      return '<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1.5px solid var(--border);border-radius:10px;cursor:pointer;font-size:0.84rem">'
        + '<input type="radio" name="sond-' + s.id + '" value="' + esc(opt) + '"> ' + esc(opt) + '</label>';
    }).join('') + '</div>';
  } else if (s.type === 'choix_multiple') {
    html += '<div style="display:flex;flex-direction:column;gap:8px">' + (s.options||[]).map(function(opt) {
      return '<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1.5px solid var(--border);border-radius:10px;cursor:pointer;font-size:0.84rem">'
        + '<input type="checkbox" name="sond-' + s.id + '" value="' + esc(opt) + '"> ' + esc(opt) + '</label>';
    }).join('') + '</div>';
  } else if (s.type === 'notation_etoiles') {
    html += '<div id="sond-stars-' + s.id + '" style="display:flex;gap:8px;font-size:2rem;cursor:pointer">'
      + [1,2,3,4,5].map(function(n){ return '<span onclick="_selectStar(' + n + ',' + s.id + ')" style="transition:transform .1s">☆</span>'; }).join('')
      + '</div><div style="font-size:0.75rem;color:var(--muted);margin-top:4px" id="sond-star-label-' + s.id + '">Touchez une étoile</div>';
  }
  html += '<div id="sond-submit-status-' + s.id + '" style="font-size:0.78rem;min-height:1.2em;margin-top:10px"></div>';
  html += '<button onclick="_submitSondage(' + s.id + ')" style="margin-top:12px;width:100%;background:linear-gradient(135deg,var(--forest),var(--leaf));color:white;border:none;border-radius:10px;padding:12px;font-family:Nunito,sans-serif;font-size:0.86rem;font-weight:900;cursor:pointer">Envoyer ma réponse</button>';
  return html;
}

function _selectStar(n, sondId) {
  _selectedStar = n;
  var starsEl = document.getElementById('sond-stars-' + sondId);
  var labelEl = document.getElementById('sond-star-label-' + sondId);
  if (starsEl) {
    starsEl.querySelectorAll('span').forEach(function(sp, i) {
      sp.textContent = i < n ? '★' : '☆';
      sp.style.color = i < n ? '#f59e0b' : '';
      sp.style.transform = i === n-1 ? 'scale(1.2)' : '';
    });
  }
  var labels = ['','Échec total','Insuffisant','Moyen','Satisfaisant','Excellent'];
  if (labelEl) labelEl.textContent = labels[n] || '';
}

async function _submitSondage(id) {
  var s = _currentSondages.find(function(x){ return x.id === id; });
  if (!s) return;
  var statusEl = document.getElementById('sond-submit-status-' + id);
  var reponse = null;

  if (s.type === 'texte_libre') {
    var inp = document.getElementById('sond-input-' + id);
    reponse = inp ? inp.value.trim() : '';
    if (!reponse) { if(statusEl){statusEl.textContent='⚠️ Veuillez écrire une réponse';statusEl.style.color='#dc2626';} return; }
  } else if (s.type === 'choix_unique') {
    var checked = document.querySelector('input[name="sond-' + id + '"]:checked');
    if (!checked) { if(statusEl){statusEl.textContent='⚠️ Sélectionnez une option';statusEl.style.color='#dc2626';} return; }
    reponse = checked.value;
  } else if (s.type === 'choix_multiple') {
    var checkboxes = document.querySelectorAll('input[name="sond-' + id + '"]:checked');
    reponse = Array.from(checkboxes).map(function(c){ return c.value; });
    if (!reponse.length) { if(statusEl){statusEl.textContent='⚠️ Sélectionnez au moins une option';statusEl.style.color='#dc2626';} return; }
  } else if (s.type === 'notation_etoiles') {
    if (!_selectedStar) { if(statusEl){statusEl.textContent='⚠️ Sélectionnez une note';statusEl.style.color='#dc2626';} return; }
    reponse = _selectedStar;
  }

  if (statusEl) { statusEl.textContent = 'Envoi…'; statusEl.style.color = 'var(--muted)'; }
  try {
    var resp = await fetch(_SONDAGES_API + '/sondages/' + id + '/vote', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({reponse: reponse})
    });
    var d = await resp.json();
    if (!resp.ok) throw new Error(d.error || 'Erreur');
    localStorage.setItem('mat_voted_' + id, '1');
    var idx = _currentSondages.findIndex(function(x){ return x.id === id; });
    if (idx >= 0 && d.total != null) _currentSondages[idx].totalVotes = d.total;
    var el = document.getElementById('sondages-container');
    if (el) {
      var s2 = _currentSondages[idx] || s;
      el.innerHTML = '<button onclick="_sondageBack()" style="background:none;border:none;color:var(--leaf);font-family:Nunito,sans-serif;font-size:0.82rem;font-weight:900;cursor:pointer;padding:0;margin-bottom:16px">← Retour</button>'
        + '<div style="font-weight:900;font-size:1rem;color:var(--text);margin-bottom:12px">' + esc(s2.titre) + '</div>'
        + '<div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;padding:12px 14px;font-size:0.84rem;font-weight:800;color:#166534;margin-bottom:14px">✅ Merci pour votre participation !</div>'
        + _renderSondageResults(s2, d);
    }
    refreshSondagesBadge();
  } catch(e) {
    if (statusEl) { statusEl.textContent = '❌ ' + e.message; statusEl.style.color = '#dc2626'; }
  }
}

function _renderSondageResults(s, data) {
  if (!data) {
    return '<div style="color:var(--muted);font-size:0.82rem;text-align:center;padding:20px">Résultats disponibles après votre vote.</div>';
  }
  var total = data.total || 0;
  var html = '<div style="font-size:0.78rem;color:var(--muted);margin-bottom:10px">' + total + ' réponse' + (total !== 1 ? 's' : '') + '</div>';
  if (s.type === 'texte_libre') {
    var reponses = data.reponses || [];
    if (!reponses.length) return html + '<div style="color:var(--muted);font-size:0.82rem">Aucune réponse pour le moment.</div>';
    html += '<div style="display:flex;flex-direction:column;gap:8px">'
      + reponses.slice(0,10).map(function(r){ return '<div style="background:var(--warm);border-radius:8px;padding:10px 12px;font-size:0.82rem;line-height:1.4">' + esc(r) + '</div>'; }).join('')
      + '</div>';
  } else if (s.type === 'notation_etoiles') {
    var avg = data.average != null ? parseFloat(data.average).toFixed(1) : '—';
    var dist = data.distribution || {};
    html += '<div style="font-size:1.4rem;font-weight:900;color:var(--forest);margin-bottom:10px">⭐ ' + avg + ' / 5</div><div style="display:flex;flex-direction:column;gap:5px">';
    for (var i = 5; i >= 1; i--) {
      var cnt = dist[String(i)] || 0;
      var pct = total ? Math.round(cnt/total*100) : 0;
      html += '<div style="display:flex;align-items:center;gap:8px;font-size:0.78rem"><span style="min-width:40px;font-weight:800;color:#f59e0b">' + '★'.repeat(i) + '</span><div style="flex:1;background:#e5e7eb;border-radius:4px;height:8px"><div style="background:var(--leaf);height:8px;border-radius:4px;width:' + pct + '%"></div></div><span style="min-width:50px;color:var(--muted);text-align:right">' + cnt + ' (' + pct + '%)</span></div>';
    }
    html += '</div>';
  } else {
    var counts = data.counts || {};
    html += '<div style="display:flex;flex-direction:column;gap:8px">';
    (s.options||[]).forEach(function(opt) {
      var cnt = counts[opt] || 0;
      var pct = total ? Math.round(cnt/total*100) : 0;
      html += '<div style="font-size:0.82rem"><div style="display:flex;justify-content:space-between;margin-bottom:3px"><span>' + esc(opt) + '</span><span style="font-weight:800;color:var(--forest)">' + cnt + ' (' + pct + '%)</span></div><div style="background:#e5e7eb;border-radius:4px;height:8px"><div style="background:var(--leaf);height:8px;border-radius:4px;width:' + pct + '%"></div></div></div>';
    });
    html += '</div>';
  }
  return html;
}

function refreshSondagesBadge() {
  var badge = document.getElementById('sondages-badge');
  if (!badge) return;
  var count = (_currentSondages || []).filter(function(s) {
    return !localStorage.getItem('mat_voted_' + s.id);
  }).length;
  if (count > 0) {
    badge.textContent = count > 9 ? '9+' : String(count);
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}
