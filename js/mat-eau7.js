/* MAT — Eau v3.8.8 — endpoint /chroniques + affichage date · NGF (profondeur) */
var _EAU_BSS   = '03983X0267/PZ3';
var _EAU_LABEL = 'St-Cyr-en-Val';

function _eauFetch(url) {
  return new Promise(function(resolve) {
    var c = new AbortController();
    var t = setTimeout(function() { c.abort(); }, 9000);
    fetch(url, { signal: c.signal })
      .then(function(r) { clearTimeout(t); resolve(r.ok ? r : null); })
      .catch(function() { clearTimeout(t); resolve(null); });
  });
}

async function _fetchNappe() {
  var enc = encodeURIComponent(_EAU_BSS);
  var url = 'https://hubeau.eaufrance.fr/api/v1/niveaux_nappes/chroniques?code_bss=' + enc + '&sort=desc&format=json&size=2';
  try {
    var r = await _eauFetch(url);
    if (!r) return null;
    var d = await r.json();
    var obs = d.data || [];
    if (obs.length === 0) return null;
    var o = obs[0];
    var hauteur = o.niveau_nappe_eau != null ? parseFloat(o.niveau_nappe_eau) : null;
    var prof    = o.profondeur_nappe != null ? parseFloat(o.profondeur_nappe)  : null;
    if (hauteur == null) return null;
    var val = hauteur.toFixed(2) + '\u00a0m\u00a0NGF';
    if (prof != null) val += ' (' + Math.round(prof) + '\u00a0m/sol)';
    // Tendance
    var tendance = '';
    if (obs.length > 1 && obs[1].niveau_nappe_eau != null) {
      var delta = hauteur - parseFloat(obs[1].niveau_nappe_eau);
      if      (delta >  0.03) tendance = '\u00a0<span style="color:#16a34a">\u2191</span>';
      else if (delta < -0.03) tendance = '\u00a0<span style="color:#ea580c">\u2193</span>';
      else                    tendance = '\u00a0<span style="color:#94a3b8">\u2192</span>';
    }
    // Date lisible
    var dateStr = '';
    if (o.date_mesure) {
      var parts = o.date_mesure.slice(0, 10).split('-');
      dateStr = parts[2] + '/' + parts[1] + '/' + parts[0];
    }
    return { value: val + tendance, date: dateStr };
  } catch(_) { return null; }
}

async function _loadEauSection() {
  var s = document.getElementById('mat-eau-section');
  if (!s) return;
  var nappeVal  = '\u2014';
  var nappeDate = '';
  var restric   = '\uD83D\uDFE2\u00a0Aucune restriction';
  var restCol   = '#16a34a';

  function render() {
    s.innerHTML = '<div style="margin-top:10px;border-radius:14px;border:1px solid #e2e8f0;background:#fff">'
      + '<div style="padding:9px 14px;font-size:0.82rem;font-weight:900;color:#1a3d2b;border-bottom:1px solid #f1f5f9">\uD83D\uDCA7 Eau</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 14px;font-size:0.77rem">'
      +   '<span style="color:#64748b">\uD83C\uDF0A Nappe \u00b7 ' + _EAU_LABEL + '</span>'
      +   '<span style="font-weight:700;text-align:right">' + nappeVal
      +     (nappeDate ? '<br><span style="font-weight:400;color:#94a3b8;font-size:0.68rem">' + nappeDate + '</span>' : '')
      +   '</span>'
      + '</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 14px;font-size:0.77rem;border-top:1px solid #f1f5f9">'
      +   '<span style="color:#64748b">\uD83D\uDEB0 Restrictions</span>'
      +   '<span style="font-weight:700;color:' + restCol + '">' + restric + '</span>'
      + '</div></div>';
  }
  render();

  var obs = await _fetchNappe();
  if (obs) {
    nappeVal  = obs.value;
    nappeDate = obs.date ? obs.date : '';
    render();
  }

  try {
    var r2 = await _eauFetch('https://api.vigieau.gouv.fr/communes/45204/restrictions');
    if (r2) {
      var d2 = await r2.json();
      if (Array.isArray(d2) && d2.length > 0) {
        var niv = d2.map(function(x) {
          return (x.niveauAlerte || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        });
        if      (niv.indexOf('crise') >= 0)                                    { restric = '\uD83D\uDFE3 Crise';             restCol = '#7c3aed'; }
        else if (niv.some(function(n){ return n.indexOf('renforcee') >= 0; }))  { restric = '\uD83D\uDD34 Alerte renforc\u00e9e'; restCol = '#dc2626'; }
        else if (niv.indexOf('alerte') >= 0)                                    { restric = '\uD83D\uDFE0 Alerte';            restCol = '#ea580c'; }
        else if (niv.indexOf('vigilance') >= 0)                                 { restric = '\uD83D\uDFE1 Vigilance';         restCol = '#d97706'; }
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
