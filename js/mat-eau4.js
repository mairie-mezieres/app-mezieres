/* MAT — Eau v3.8.5 — BSS Saint-Cyr-en-Val avec auto-découverte */
function _eauFetch(url) {
  return new Promise(function(resolve) {
    var c = new AbortController();
    var t = setTimeout(function() { c.abort(); }, 9000);
    fetch(url, { signal: c.signal })
      .then(function(r) { clearTimeout(t); resolve(r.ok ? r : null); })
      .catch(function() { clearTimeout(t); resolve(null); });
  });
}

function _parseNappeObs(obs, label) {
  if (!obs) return null;
  var hauteur = obs.niveau_nappe_eau  != null ? parseFloat(obs.niveau_nappe_eau)  : null;
  var prof    = obs.profondeur_nappe  != null ? parseFloat(obs.profondeur_nappe)   : null;
  if (hauteur == null && prof == null) return null;
  var parts = [];
  if (hauteur != null) parts.push(hauteur.toFixed(2) + '\u00a0m\u00a0NGF');
  if (prof    != null) parts.push(prof.toFixed(2)    + '\u00a0m/sol');
  return {
    value: parts.join(' · '),
    date:  (obs.date_mesure || '').slice(0, 10),
    hauteur: hauteur,
    label: label || (obs.nom_commune || '')
  };
}

async function _fetchNappe() {
  // Stratégie 1 : BSS001CCTX exact (observations temps réel)
  var tries = [
    'https://hubeau.eaufrance.fr/api/v1/niveaux_nappes/observations_tr?code_bss=BSS001CCTX&size=2&sort=desc',
    // Stratégie 2 : observations validées même BSS
    'https://hubeau.eaufrance.fr/api/v1/niveaux_nappes/observations?code_bss=BSS001CCTX&size=2&sort=desc',
    // Stratégie 3 : commune Saint-Cyr-en-Val (INSEE 45292)
    'https://hubeau.eaufrance.fr/api/v1/niveaux_nappes/observations?code_commune=45292&size=2&sort=desc',
    // Stratégie 4 : boîte géographique autour de St-Cyr-en-Val
    'https://hubeau.eaufrance.fr/api/v1/niveaux_nappes/observations?longitude_min=1.75&longitude_max=1.95&latitude_min=47.75&latitude_max=47.95&size=2&sort=desc'
  ];
  for (var i = 0; i < tries.length; i++) {
    try {
      var r = await _eauFetch(tries[i]);
      if (!r) continue;
      var d = await r.json();
      var obs = (d.data || []);
      if (obs.length === 0) continue;
      var latest = _parseNappeObs(obs[0]);
      if (!latest) continue;
      // Tendance
      var tendance = '';
      if (obs.length > 1 && obs[1].niveau_nappe_eau != null && latest.hauteur != null) {
        var delta = latest.hauteur - parseFloat(obs[1].niveau_nappe_eau);
        if      (delta >  0.03) tendance = '\u00a0<span style="color:#16a34a">\u2191</span>';
        else if (delta < -0.03) tendance = '\u00a0<span style="color:#ea580c">\u2193</span>';
        else                    tendance = '\u00a0<span style="color:#94a3b8">\u2192</span>';
      }
      return { value: latest.value + tendance, date: latest.date, label: obs[0].nom_commune || 'Loiret' };
    } catch(_) {}
  }
  return null;
}

async function _loadEauSection() {
  var s = document.getElementById('mat-eau-section');
  if (!s) return;
  var nappeVal = '\u2014';
  var nappeDate = '';
  var nappeLabel = 'St-Cyr-en-Val';
  var restric = '\uD83D\uDFE2\u00a0Aucune restriction';
  var restricColor = '#16a34a';
  function render() {
    s.innerHTML = '<div style="margin-top:10px;border-radius:14px;border:1px solid #e2e8f0;background:#fff">'
      + '<div style="padding:9px 14px;font-size:0.82rem;font-weight:900;color:#1a3d2b;border-bottom:1px solid #f1f5f9">💧 Eau</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 14px;font-size:0.77rem">'
      +   '<span style="color:#64748b">🌊 Nappe · ' + nappeLabel + '</span>'
      +   '<span style="font-weight:700;text-align:right">' + nappeVal
      +     (nappeDate ? '<br><span style="font-weight:400;color:#94a3b8;font-size:0.68rem">' + nappeDate + '</span>' : '')
      +   '</span>'
      + '</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 14px;font-size:0.77rem;border-top:1px solid #f1f5f9">'
      +   '<span style="color:#64748b">🚰 Restrictions</span>'
      +   '<span style="font-weight:700;color:' + restricColor + '">' + restric + '</span>'
      + '</div></div>';
  }
  render();

  var nappeResult = await _fetchNappe();
  if (nappeResult) {
    nappeVal   = nappeResult.value;
    nappeDate  = nappeResult.date ? 'Mesure du ' + nappeResult.date : '';
    nappeLabel = nappeResult.label || nappeLabel;
    render();
  }

  try {
    var r2 = await _eauFetch('https://api.vigieau.gouv.fr/communes/45204/restrictions');
    if (r2) {
      var d2 = await r2.json();
      if (Array.isArray(d2) && d2.length > 0) {
        var niveaux = d2.map(function(x) { return (x.niveauAlerte || '').toLowerCase(); });
        if      (niveaux.indexOf('crise') >= 0)                                       { restric = '🟣 Crise';             restricColor = '#7c3aed'; }
        else if (niveaux.some(function(n){ return n.indexOf('renforcé') >= 0; }))     { restric = '🔴 Alerte renforcée'; restricColor = '#dc2626'; }
        else if (niveaux.indexOf('alerte') >= 0)                                      { restric = '🟠 Alerte';            restricColor = '#ea580c'; }
        else if (niveaux.indexOf('vigilance') >= 0)                                   { restric = '🟡 Vigilance';         restricColor = '#d97706'; }
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
