/* MAT — Eau v3.8.4 — BSS001CCTX Saint-Cyr-en-Val */
function _eauFetch(url) {
  return new Promise(function(resolve) {
    var c = new AbortController();
    var t = setTimeout(function() { c.abort(); }, 8000);
    fetch(url, { signal: c.signal })
      .then(function(r) { clearTimeout(t); resolve(r.ok ? r : null); })
      .catch(function() { clearTimeout(t); resolve(null); });
  });
}

async function _loadEauSection() {
  var s = document.getElementById('mat-eau-section');
  if (!s) return;

  var nappeVal = '—';
  var nappeDetail = '';
  var restric = '🟢 Aucune restriction';
  var restricColor = '#16a34a';

  function render() {
    s.innerHTML = '<div style="margin-top:10px;border-radius:14px;border:1px solid #e2e8f0;background:#fff">'
      + '<div style="padding:9px 14px;font-size:0.82rem;font-weight:900;color:#1a3d2b;border-bottom:1px solid #f1f5f9">💧 Eau</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 14px;font-size:0.77rem">'
      +   '<span style="color:#64748b">🌊 Nappe · St-Cyr-en-Val</span>'
      +   '<span style="font-weight:700;text-align:right">' + nappeVal + (nappeDetail ? '<br><span style="font-weight:400;color:#94a3b8;font-size:0.7rem">' + nappeDetail + '</span>' : '') + '</span>'
      + '</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 14px;font-size:0.77rem;border-top:1px solid #f1f5f9">'
      +   '<span style="color:#64748b">🚰 Restrictions</span>'
      +   '<span style="font-weight:700;color:' + restricColor + '">' + restric + '</span>'
      + '</div>'
      + '</div>';
  }
  render();

  // Nappe — Hub'Eau BSS001CCTX, 2 mesures pour tendance
  try {
    var endpoints = [
      'https://hubeau.eaufrance.fr/api/v1/niveaux_nappes/observations_tr?code_bss=BSS001CCTX&size=2&sort=desc',
      'https://hubeau.eaufrance.fr/api/v1/niveaux_nappes/observations?code_bss=BSS001CCTX&size=2&sort=desc'
    ];
    for (var i = 0; i < endpoints.length; i++) {
      var r1 = await _eauFetch(endpoints[i]);
      if (!r1) continue;
      var d1 = await r1.json();
      var obs = d1.data || [];
      if (obs.length === 0) continue;
      var latest = obs[0];
      var prev   = obs[1] || null;
      var hauteur = latest.niveau_nappe_eau != null ? parseFloat(latest.niveau_nappe_eau) : null;
      var prof    = latest.profondeur_nappe  != null ? parseFloat(latest.profondeur_nappe)  : null;
      if (hauteur == null && prof == null) continue;

      // Tendance
      var tendance = '';
      if (prev && prev.niveau_nappe_eau != null && hauteur != null) {
        var delta = hauteur - parseFloat(prev.niveau_nappe_eau);
        if      (delta >  0.05) tendance = ' <span style="color:#16a34a">↑</span>';
        else if (delta < -0.05) tendance = ' <span style="color:#ea580c">↓</span>';
        else                    tendance = ' <span style="color:#94a3b8">→</span>';
      }

      var parts = [];
      if (hauteur != null) parts.push(hauteur.toFixed(2) + ' m NGF');
      if (prof    != null) parts.push(prof.toFixed(2)    + ' m/sol');
      nappeVal   = parts.join(' · ') + tendance;
      nappeDetail = latest.date_mesure ? 'Mesure du ' + latest.date_mesure.slice(0, 10) : '';
      render();
      break;
    }
  } catch(_) {}

  // VigiEau restrictions
  try {
    var r2 = await _eauFetch('https://api.vigieau.gouv.fr/communes/45204/restrictions');
    if (r2) {
      var d2 = await r2.json();
      if (Array.isArray(d2) && d2.length > 0) {
        var niveaux = d2.map(function(x) { return (x.niveauAlerte || '').toLowerCase(); });
        if      (niveaux.indexOf('crise') >= 0)                                         { restric = '🟣 Crise';             restricColor = '#7c3aed'; }
        else if (niveaux.some(function(n) { return n.indexOf('renforcé') >= 0; }))      { restric = '🔴 Alerte renforcée'; restricColor = '#dc2626'; }
        else if (niveaux.indexOf('alerte') >= 0)                                        { restric = '🟠 Alerte';            restricColor = '#ea580c'; }
        else if (niveaux.indexOf('vigilance') >= 0)                                     { restric = '🟡 Vigilance';         restricColor = '#d97706'; }
        render();
      }
    }
  } catch(_) {}
}

(function() {
  var _orig = window.loadMeteoDetail;
  window.loadMeteoDetail = function() {
    if (typeof _orig === 'function') _orig.apply(this, arguments);
    var detail = document.getElementById('meteo-detail');
    if (!detail) return;
    var premium = detail.querySelector('.meteo-premium');
    if (!premium) return;
    if (document.getElementById('mat-eau-section')) return;
    var sec = document.createElement('div');
    sec.id = 'mat-eau-section';
    premium.appendChild(sec);
    _loadEauSection();
  };
})();
