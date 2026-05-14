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
    var meteo   = window._meteoData || {};
    var days    = (meteo.forecast || {}).daily   || {};
    var hourly  = (meteo.forecast || {}).hourly  || {};
    var cur     = (meteo.forecast || {}).current || {};
    var now2    = new Date();
    var times   = hourly.time || [];
    var hrlyPrec = hourly.precipitation || [];
    var hrlyHum  = hourly.relative_humidity_2m || [];

    var pluie24h = days.precipitation_sum && days.precipitation_sum[0] != null
      ? parseFloat(days.precipitation_sum[0]).toFixed(1) + '\u00A0mm' : '\u2013';

    var idx    = (typeof meteoFindClosestHourlyIndex === 'function') ? meteoFindClosestHourlyIndex(times, now2) : -1;
    var idx3h  = (typeof meteoFindClosestHourlyIndex === 'function') ? meteoFindClosestHourlyIndex(times, new Date(now2.getTime() - 10800000)) : -1;
    var humCur = cur.relative_humidity_2m != null ? cur.relative_humidity_2m : (idx !== -1 && hrlyHum[idx] != null ? hrlyHum[idx] : null);
    var humBef = idx3h !== -1 && hrlyHum[idx3h] != null ? hrlyHum[idx3h] : null;
    var pluieCur = idx !== -1 && hrlyPrec[idx] != null ? hrlyPrec[idx] : null;
    var pluieBef = idx3h !== -1 && hrlyPrec[idx3h] != null ? hrlyPrec[idx3h] : null;
    var humStr  = humCur != null ? Math.round(humCur) + '\u00A0%' : '\u2013';
    var badge   = typeof meteoTrendBadge === 'function' ? meteoTrendBadge : function(){ return ''; };
    var trend   = typeof meteoTrend === 'function' ? meteoTrend : function(){ return 0; };

    var env     = window._envLocalData || {};
    var loireStr = '\u2013';
    if (env.loire && env.loire.hauteur != null) {
      var _lh = parseFloat(env.loire.hauteur);
      loireStr = _lh.toFixed(2) + '\u00A0m';
      var _ls = env.loire.seuils;
      if (_ls) {
        var _seuilLabels = ['vigilance', 'alerte', 'alerte renforc\u00E9e', 'crise'];
        var _seuilVals   = [_ls.seuil1, _ls.seuil2, _ls.seuil3, _ls.seuil4];
        for (var _si = 0; _si < _seuilVals.length; _si++) {
          if (_seuilVals[_si] != null && _lh < _seuilVals[_si]) {
            loireStr += '<br><span style="font-weight:400;font-size:.7rem;color:var(--muted)">\u26A0\uFE0F seuil\u00A0' + _seuilLabels[_si] + '\u00A0' + parseFloat(_seuilVals[_si]).toFixed(2) + '\u00A0m</span>';
            break;
          }
        }
      }
    }

    function row(label, val, border) {
      return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 14px;font-size:0.77rem'
        + (border ? ';border-top:1px solid var(--border)' : '') + '">'
        + '<span style="color:var(--muted)">' + label + '</span>'
        + '<span>' + val + '</span>'
        + '</div>';
    }

    s.innerHTML = '<div style="margin-top:10px;border-radius:14px;border:1px solid var(--border);background:var(--card)">'
      + '<div style="padding:9px 14px;font-size:0.82rem;font-weight:900;color:var(--forest);border-bottom:1px solid var(--border)">\uD83D\uDCA7 Eau</div>'
      + row('\uD83C\uDF27\uFE0F Cumul pluie \u00b7 24h', '<span style="font-weight:700">' + pluie24h + '</span>' + badge(trend(pluieCur, pluieBef, 2, 0.5)), false)
      + row('\uD83D\uDCA7 Humidit\u00E9', '<span style="font-weight:700">' + humStr + '</span>' + badge(trend(humCur, humBef, 15, 5)), true)
      + row('\uD83C\uDFDE\uFE0F Loire \u00b7 Meung-sur-Loire', '<span style="font-weight:700">' + loireStr + '</span>', true)
      + row('\uD83C\uDF0A Nappe \u00b7 ' + _EAU_LABEL, '<span style="text-align:right">' + nappeHtml + '</span>', true)
      + row('\uD83D\uDEB0 Restrictions', '<span style="font-weight:700;color:' + restCol + '">' + restric + '</span>', true)
      + '</div>';
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
    var r2 = await _eauFetch('https://api.vigieau.gouv.fr/communes/45203/restrictions');
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
