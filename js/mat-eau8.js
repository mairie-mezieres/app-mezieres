/* MAT — Eau v3.8.9 — Niveau nappe en % (min/max sur 365 mesures) */
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
  var url = 'https://hubeau.eaufrance.fr/api/v1/niveaux_nappes/chroniques?code_bss=' + enc + '&sort=desc&format=json&size=365';
  try {
    var r = await _eauFetch(url);
    if (!r) return null;
    var d = await r.json();
    var obs = (d.data || []).filter(function(o) { return o.niveau_nappe_eau != null; });
    if (obs.length === 0) return null;

    var current = parseFloat(obs[0].niveau_nappe_eau);
    var hauteurs = obs.map(function(o) { return parseFloat(o.niveau_nappe_eau); });
    var minH = Math.min.apply(null, hauteurs);
    var maxH = Math.max.apply(null, hauteurs);
    var pct  = maxH > minH ? Math.round((current - minH) / (maxH - minH) * 100) : 50;

    // Tendance entre mesure actuelle et précédente
    var tendance = '';
    if (obs.length > 1) {
      var delta = current - parseFloat(obs[1].niveau_nappe_eau);
      if      (delta >  0.03) tendance = 'up';
      else if (delta < -0.03) tendance = 'down';
      else                    tendance = 'stable';
    }

    // Label et couleur
    var label, color;
    if      (pct >= 75) { label = 'Haut';      color = '#2563eb'; }
    else if (pct >= 50) { label = 'Normal';    color = '#16a34a'; }
    else if (pct >= 25) { label = 'Bas';       color = '#ea580c'; }
    else                { label = 'Très bas';  color = '#dc2626'; }

    var p = (obs[0].date_mesure || '').slice(0, 10).split('-');
    var dateStr = p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : '';

    return { pct: pct, label: label, color: color, tendance: tendance, date: dateStr };
  } catch(_) { return null; }
}

async function _loadEauSection() {
  var s = document.getElementById('mat-eau-section');
  if (!s) return;

  var nappeHtml  = '<span style="color:#94a3b8">\u2014</span>';
  var restric    = '\uD83D\uDFE2\u00a0Aucune restriction';
  var restCol    = '#16a34a';

  function render() {
    s.innerHTML = '<div style="margin-top:10px;border-radius:14px;border:1px solid #e2e8f0;background:#fff">'
      + '<div style="padding:9px 14px;font-size:0.82rem;font-weight:900;color:#1a3d2b;border-bottom:1px solid #f1f5f9">\uD83D\uDCA7 Eau</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 14px;font-size:0.77rem">'
      +   '<span style="color:#64748b">\uD83C\uDF0A Nappe \u00b7 ' + _EAU_LABEL + '</span>'
      +   '<span style="text-align:right">' + nappeHtml + '</span>'
      + '</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 14px;font-size:0.77rem;border-top:1px solid #f1f5f9">'
      +   '<span style="color:#64748b">\uD83D\uDEB0 Restrictions</span>'
      +   '<span style="font-weight:700;color:' + restCol + '">' + restric + '</span>'
      + '</div></div>';
  }
  render();

  var nappe = await _fetchNappe();
  if (nappe) {
    var arrow = nappe.tendance === 'up'
      ? '\u00a0<span style="color:#16a34a">\u2191</span>'
      : nappe.tendance === 'down'
        ? '\u00a0<span style="color:#ea580c">\u2193</span>'
        : '\u00a0<span style="color:#94a3b8">\u2192</span>';
    nappeHtml = '<span style="font-weight:700;color:' + nappe.color + '">'
      + nappe.pct + '%\u00a0' + nappe.label + arrow
      + '</span>'
      + (nappe.date ? '<br><span style="font-weight:400;color:#94a3b8;font-size:0.68rem">' + nappe.date + '</span>' : '');
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
        if      (niv.indexOf('crise') >= 0)                                    { restric = '\uD83D\uDFE3 Crise';              restCol = '#7c3aed'; }
        else if (niv.some(function(n){ return n.indexOf('renforcee') >= 0; }))  { restric = '\uD83D\uDD34 Alerte renforc\u00e9e'; restCol = '#dc2626'; }
        else if (niv.indexOf('alerte') >= 0)                                    { restric = '\uD83D\uDFE0 Alerte';             restCol = '#ea580c'; }
        else if (niv.indexOf('vigilance') >= 0)                                 { restric = '\uD83D\uDFE1 Vigilance';          restCol = '#d97706'; }
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
