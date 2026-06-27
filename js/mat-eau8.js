/* MAT — Eau v3.10.0 — Niveau nappe + restrictions VigiEau + consignes par niveau (endpoint /api/zones) */
var _EAU_BSS   = '03983X0267/PZ3';
var _EAU_LABEL = 'St-Cyr-en-Val';

function _eauFetch(url) {
  return new Promise(function(resolve) {
    var c = new AbortController();
    var t = setTimeout(function() { c.abort(); }, 9000);
    fetch(url, { signal: c.signal })
      .then(function(r) { clearTimeout(t); resolve(r); })
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
  // \u00C9tat neutre par d\u00E9faut : on n'affiche \u00AB Aucune restriction \u00BB (vert) QUE si
  // l'API VigiEau confirme explicitement l'absence de zone active. Tant qu'on ne
  // sait pas (chargement, API injoignable), on reste neutre \u2014 jamais de faux vert.
  var restric    = '\u26AA\u00a0V\u00E9rification\u2026';
  var restCol    = '#94a3b8';
  // Consignes / recommandations affich\u00E9es sous la ligne Restrictions (selon le
  // niveau VigiEau). Vide tant qu'aucune zone active n'est confirm\u00E9e.
  var restricNote = '';
  var _vigieauLink = 'https://vigieau.gouv.fr';

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
      + (restricNote
          ? '<div style="padding:2px 14px 10px;font-size:0.7rem;color:var(--muted);line-height:1.5">' + restricNote + '</div>'
          : '')
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

  // Restrictions s\u00e9cheresse \u2014 API officielle VigiEau (zones de restriction de la
  // commune 45203). _eauFetch renvoie null si l'appel \u00e9choue (404, r\u00e9seau, non-OK).
  // Endpoint migr\u00e9 : l'ancien /communes/{insee}/restrictions renvoie d\u00e9sormais 404.
  try {
    var r2 = await _eauFetch('https://api.vigieau.gouv.fr/api/zones?commune=45203&profil=particulier');
    if (!r2) {
      // Injoignable : surtout PAS de faux \u00AB Aucune restriction \u00BB. \u00C9tat neutre + log.
      restric = '\u26AA\u00A0Info indisponible';
      restCol = '#94a3b8';
      if (navigator.onLine && typeof matLogError === 'function') matLogError('eau', 'VigiEau injoignable (/api/zones)');
      render();
    } else if (r2.status === 409) {
      // La commune comporte plusieurs zones d'alerte de m\u00EAme type \u2192 restrictions
      // actives mais niveau ind\u00E9terminable via API. On affiche une alerte orange.
      restric = '\u26A0\uFE0F\u00A0Restrictions \u2014 voir vigieau.gouv.fr';
      restCol = '#ea580c';
      render();
    } else if (!r2.ok) {
      restric = '\u26AA\u00A0Info indisponible';
      restCol = '#94a3b8';
      if (navigator.onLine && typeof matLogError === 'function') matLogError('eau', 'VigiEau HTTP ' + r2.status);
      render();
    } else {
      var txt = await r2.text();
      var d2, _parseOk = true;
      try { d2 = txt ? JSON.parse(txt) : []; } catch (e) { d2 = null; _parseOk = false; }
      if (!_parseOk) {
        // 200 OK mais corps non-JSON (page d'erreur HTML d'un proxy/CDN) :
        // surtout PAS de faux « Aucune restriction ». État neutre + log.
        restric = '⚪ Info indisponible';
        restCol = '#94a3b8';
        if (navigator.onLine && typeof matLogError === 'function') matLogError('eau', 'VigiEau: réponse 200 non-JSON');
        render();
      } else {
      var zones = Array.isArray(d2) ? d2 : (d2 && Array.isArray(d2.zones) ? d2.zones : []);
      if (zones.length === 0) {
        // L'API confirme explicitement l'absence de zone de restriction active.
        restric = '\uD83D\uDFE2\u00A0Aucune restriction';
        restCol = '#16a34a';
      } else {
        // Au moins une zone active \u2192 jamais \u00AB aucune \u00BB. On lit le niveau de gravit\u00e9
        // en tol\u00e9rant plusieurs noms de champs possibles c\u00F4t\u00e9 VigiEau.
        var sev = 0; // 1=vigilance 2=alerte 3=renforc\u00e9e 4=crise
        zones.forEach(function(z) {
          var raw = [z.niveauGravite, z.niveauAlerte, z.niveau, z.niveauRestriction, z.type]
            .filter(Boolean).join(' ')
            .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if      (raw.indexOf('crise') >= 0)     sev = Math.max(sev, 4);
          else if (raw.indexOf('renforc') >= 0)   sev = Math.max(sev, 3);
          else if (raw.indexOf('alerte') >= 0)    sev = Math.max(sev, 2);
          else if (raw.indexOf('vigilance') >= 0) sev = Math.max(sev, 1);
        });
        var _lien = ' <a href="' + _vigieauLink + '" target="_blank" rel="noopener" style="color:var(--leaf);font-weight:600">consignes officielles \u2197</a>';
        if      (sev === 4) {
          restric = '\uD83D\uDFE3 Crise';                 restCol = '#7c3aed';
          restricNote = 'Usages essentiels uniquement (sant\u00e9, s\u00e9curit\u00e9, eau potable).' + _lien;
        }
        else if (sev === 3) {
          restric = '\uD83D\uDD34 Alerte renforc\u00e9e'; restCol = '#dc2626';
          restricNote = 'Restrictions durcies : arrosage, lavage, remplissage interdits sur de larges plages.' + _lien;
        }
        else if (sev === 2) {
          restric = '\uD83D\uDFE0 Alerte';                restCol = '#ea580c';
          restricNote = 'Premi\u00E8res restrictions : arrosage des pelouses, lavage des voitures, remplissage des piscines limit\u00e9s.' + _lien;
        }
        else if (sev === 1) {
          restric = '\uD83D\uDFE1 Vigilance';             restCol = '#d97706';
          restricNote = 'Pas d\u2019interdiction \u2014 \u00e9conomies d\u2019eau recommand\u00e9es.' + _lien;
        }
        else                {
          restric = '\uD83D\uDFE0 Restriction en vigueur'; restCol = '#ea580c';
          restricNote = 'Restrictions d\u2019usage de l\u2019eau en vigueur.' + _lien;
        }
      }
      render();
      }
    }
  } catch (_) {
    // Erreur inattendue : neutre, jamais de faux \u00AB Aucune restriction \u00BB.
    restric = '\u26AA\u00A0Info indisponible';
    restCol = '#94a3b8';
    if (navigator.onLine && typeof matLogError === 'function') matLogError('eau', 'VigiEau: ' + ((_ && _.message) || 'err'));
    render();
  }
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
