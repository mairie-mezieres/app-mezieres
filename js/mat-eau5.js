/* MAT — Eau v3.8.6 — auto-découverte station Hub'Eau */
function _eauFetch(url) {
  return new Promise(function(resolve) {
    var c = new AbortController();
    var t = setTimeout(function() { c.abort(); }, 9000);
    fetch(url, { signal: c.signal })
      .then(function(r) { clearTimeout(t); resolve(r.ok ? r : null); })
      .catch(function() { clearTimeout(t); resolve(null); });
  });
}

async function _findNappeStation() {
  // Cherche la station piezométrique la plus proche de Saint-Cyr-en-Val
  var searches = [
    'https://hubeau.eaufrance.fr/api/v1/niveaux_nappes/stations?code_commune=45292&format=json&size=5',
    'https://hubeau.eaufrance.fr/api/v1/niveaux_nappes/stations?bbox=1.75%2C47.75%2C1.95%2C47.95&format=json&size=5',
    'https://hubeau.eaufrance.fr/api/v1/niveaux_nappes/stations?code_departement=45&format=json&size=10'
  ];
  for (var i = 0; i < searches.length; i++) {
    try {
      var r = await _eauFetch(searches[i]);
      if (!r) continue;
      var d = await r.json();
      if (d.data && d.data.length > 0) {
        var st = d.data[0];
        return { code: st.code_bss, label: st.nom_commune || 'Loiret' };
      }
    } catch(_) {}
  }
  return null;
}

async function _fetchNappeObs(codeBss) {
  var enc = encodeURIComponent(codeBss);
  var tries = [
    'https://hubeau.eaufrance.fr/api/v1/niveaux_nappes/observations_tr?code_bss=' + enc + '&size=2&sort=desc',
    'https://hubeau.eaufrance.fr/api/v1/niveaux_nappes/observations?code_bss='    + enc + '&size=2&sort=desc'
  ];
  for (var i = 0; i < tries.length; i++) {
    try {
      var r = await _eauFetch(tries[i]);
      if (!r) continue;
      var d = await r.json();
      var obs = d.data || [];
      if (obs.length === 0) continue;
      var o0 = obs[0];
      var hauteur = o0.niveau_nappe_eau  != null ? parseFloat(o0.niveau_nappe_eau)  : null;
      var prof    = o0.profondeur_nappe  != null ? parseFloat(o0.profondeur_nappe)  : null;
      if (hauteur == null && prof == null) continue;
      var parts = [];
      if (hauteur != null) parts.push(hauteur.toFixed(2) + '\u00a0m\u00a0NGF');
      if (prof    != null) parts.push(prof.toFixed(2)    + '\u00a0m/sol');
      var val = parts.join(' · ');
      // Tendance
      var tendance = '';
      if (obs.length > 1 && obs[1].niveau_nappe_eau != null && hauteur != null) {
        var delta = hauteur - parseFloat(obs[1].niveau_nappe_eau);
        if      (delta >  0.03) tendance = '\u00a0<span style="color:#16a34a">\u2191</span>';
        else if (delta < -0.03) tendance = '\u00a0<span style="color:#ea580c">\u2193</span>';
        else                    tendance = '\u00a0<span style="color:#94a3b8">\u2192</span>';
      }
      return {
        value: val + tendance,
        date:  (o0.date_mesure || '').slice(0, 10)
      };
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
      + '<div style="padding:9px 14px;font-size:0.82rem;font-weight:900;color:#1a3d2b;border-bottom:1px solid #f1f5f9">\uD83D\uDCA7 Eau</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 14px;font-size:0.77rem">'
      +   '<span style="color:#64748b">\uD83C\uDF0A Nappe \u00b7 ' + nappeLabel + '</span>'
      +   '<span style="font-weight:700;text-align:right">' + nappeVal
      +     (nappeDate ? '<br><span style="font-weight:400;color:#94a3b8;font-size:0.68rem">' + nappeDate + '</span>' : '')
      +   '</span>'
      + '</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 14px;font-size:0.77rem;border-top:1px solid #f1f5f9">'
      +   '<span style="color:#64748b">\uD83D\uDEB0 Restrictions</span>'
      +   '<span style="font-weight:700;color:' + restricColor + '">' + restric + '</span>'
      + '</div></div>';
  }
  render();

  // Étape 1 : trouver le code_bss réel de la station
  var station = await _findNappeStation();
  if (station) {
    nappeLabel = station.label;
    render();
    // Étape 2 : récupérer les observations
    var obs = await _fetchNappeObs(station.code);
    if (obs) {
      nappeVal  = obs.value;
      nappeDate = obs.date ? 'Mesure du ' + obs.date : '';
      render();
    }
  }

  // Restrictions sécheresse (VigiEau)
  try {
    var r2 = await _eauFetch('https://api.vigieau.gouv.fr/communes/45204/restrictions');
    if (r2) {
      var d2 = await r2.json();
      if (Array.isArray(d2) && d2.length > 0) {
        var niveaux = d2.map(function(x) { return (x.niveauAlerte || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); });
        if      (niveaux.indexOf('crise') >= 0)             { restric = '\uD83D\uDFE3 Crise';             restricColor = '#7c3aed'; }
        else if (niveaux.some(function(n){ return n.indexOf('renforcee') >= 0 || n.indexOf('renforcee') >= 0; }))
                                                             { restric = '\uD83D\uDD34 Alerte renforcée'; restricColor = '#dc2626'; }
        else if (niveaux.indexOf('alerte') >= 0)             { restric = '\uD83D\uDFE0 Alerte';            restricColor = '#ea580c'; }
        else if (niveaux.indexOf('vigilance') >= 0)          { restric = '\uD83D\uDFE1 Vigilance';         restricColor = '#d97706'; }
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
