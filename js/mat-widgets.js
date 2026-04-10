/* ════════════════════════════════════════════════════════════
   MAT — Widgets header v3.7.0
   Météo, déchets, bus Rémi, mairie, prochain événement
   ════════════════════════════════════════════════════════════ */

// ── Météo ─────────────────────────────────────────────────
const METEO_ICONS = {0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',48:'🌫️',51:'🌦️',53:'🌦️',55:'🌧️',61:'🌧️',63:'🌧️',65:'🌧️',71:'❄️',73:'❄️',75:'❄️',80:'🌦️',81:'🌧️',82:'⛈️',95:'⛈️',99:'⛈️'};
const METEO_DESC  = {0:'Ciel dégagé',1:'Principalement dégagé',2:'Partiellement nuageux',3:'Couvert',45:'Brouillard',48:'Brouillard givrant',51:'Bruine légère',53:'Bruine modérée',55:'Bruine dense',61:'Pluie légère',63:'Pluie modérée',65:'Pluie forte',71:'Neige légère',73:'Neige modérée',75:'Neige forte',80:'Averses légères',81:'Averses modérées',82:'Averses violentes',95:'Orage',99:'Orage fort'};
const METEO_ALERT_COLORS = {1:'vert',2:'jaune',3:'orange',4:'rouge'};
const METEO_ALERT_ICONS = {1:'✅',2:'🟡',3:'🟠',4:'🔴'};

function meteoHasAlert(vigilance) {
  return !!(vigilance && Number(vigilance.level || 0) >= 2);
}

function meteoFormatAlertDate(iso, withYear) {
  if (!iso) return 'à préciser';
  var d = new Date(iso);
  if (isNaN(d.getTime())) return 'à préciser';
  return d.toLocaleString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: withYear ? 'numeric' : undefined,
    hour: '2-digit',
    minute: '2-digit'
  }).replace(',', ' ·');
}

function meteoAlertSummary(vigilance) {
  if (vigilance && vigilance.main_text) return vigilance.main_text;
  if (meteoHasAlert(vigilance)) {
    return 'Vigilance ' + (vigilance.color_label || METEO_ALERT_COLORS[Number(vigilance.level || 0)] || 'météo') + ' en cours sur le Loiret.';
  }
  return 'Situation météo normale sur la commune.';
}

function meteoPhenomenonIcon(vigilance) {
  var id = Number((vigilance || {}).phenomenon_id || 0);
  if (id === 1) return '💨';
  if (id === 2 || id === 4 || id === 9) return '🌊';
  if (id === 3) return '⛈️';
  if (id === 5) return '❄️';
  if (id === 6) return '🥵';
  if (id === 7) return '🥶';
  return METEO_ALERT_ICONS[Number((vigilance || {}).level || 1)] || '⚠️';
}

function meteoFindClosestHourlyIndex(times, targetDate) {
  if (!times || !times.length || !targetDate) return -1;
  var targetMs = targetDate.getTime();
  var bestIdx = -1;
  var bestDiff = Infinity;
  for (var i = 0; i < times.length; i++) {
    var dt = new Date(times[i]);
    var ms = dt.getTime();
    if (isNaN(ms)) continue;
    var diff = Math.abs(ms - targetMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function meteoFindFirstFutureIndex(times, nowDate) {
  if (!times || !times.length) return -1;
  var nowMs = nowDate.getTime();
  for (var i = 0; i < times.length; i++) {
    var ms = new Date(times[i]).getTime();
    if (!isNaN(ms) && ms >= nowMs - 30 * 60000) return i;
  }
  return meteoFindClosestHourlyIndex(times, nowDate);
}

function meteoDir(deg) {
  if (deg == null || isNaN(Number(deg))) return '';
  var dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  return dirs[Math.round((Number(deg) || 0) / 45) % 8];
}

function meteoTrend(valNow, valBefore, seuilFort, seuilMod) {
  if (valBefore == null || valNow == null || isNaN(Number(valBefore)) || isNaN(Number(valNow))) {
    return { ico:'', lbl:'', col:'var(--muted)' };
  }
  var diff = Number(valNow) - Number(valBefore);
  var absDiff = Math.abs(diff);
  if (absDiff < seuilMod * 0.3) return { ico:'➡', lbl:'Stable', col:'#6b7280' };
  if (diff > 0) {
    if (absDiff >= seuilFort) return { ico:'⬆', lbl:'Hausse importante', col:'#dc2626' };
    return { ico:'↗', lbl:'Hausse modérée', col:'#f59e0b' };
  }
  if (absDiff >= seuilFort) return { ico:'⬇', lbl:'Baisse forte', col:'#2563eb' };
  return { ico:'↘', lbl:'Baisse modérée', col:'#60a5fa' };
}

function meteoTrendBadge(trend) {
  if (!trend || !trend.ico) return '';
  return '<div class="meteo-trend-badge" style="color:' + trend.col + '" title="' + esc(trend.lbl || '') + '">'
    + '<span class="meteo-trend-ico">' + trend.ico + '</span>'
    + '</div>';
}

function meteoBuildHourlyTimeline(hourly, nowDate) {
  var times = (hourly || {}).time || [];
  var start = meteoFindFirstFutureIndex(times, nowDate);
  if (start === -1) return '';
  var slice = [];
  for (var i = start; i < Math.min(start + 12, times.length); i++) {
    var dt = new Date(times[i]);
    if (isNaN(dt.getTime())) continue;
    var mmVal = Number(((((hourly || {}).precipitation || [])[i] || 0)));
    slice.push({
      hour: dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h'),
      temp: Math.round(((hourly || {}).temperature_2m || [])[i] != null ? ((hourly || {}).temperature_2m || [])[i] : 0),
      prob: Math.round(((hourly || {}).precipitation_probability || [])[i] || 0),
      mm: mmVal,
      wind: Math.round((((hourly || {}).wind_speed_10m || [])[i] || 0)),
      code: (((hourly || {}).weather_code || [])[i] || 0)
    });
  }
  if (!slice.length) return '';
  var maxMm = 0;
  slice.forEach(function(item){ maxMm = Math.max(maxMm, Number(item.mm || 0)); });
  if (maxMm <= 0) maxMm = 1;

  return '<div class="meteo-card meteo-hourly-card">'
    + '<div class="meteo-card-kicker">🕒 Prochaines 12 heures</div>'
    + '<div class="meteo-hourly-track">'
    + slice.map(function(item){
        var barH = Math.max(5, Math.round((Number(item.mm || 0) / maxMm) * 30));
        return '<div class="meteo-hour-col">'
          + '<div class="meteo-hour-time">' + esc(item.hour) + '</div>'
          + '<div class="meteo-hour-icon">' + (METEO_ICONS[item.code] || '🌡️') + '</div>'
          + '<div class="meteo-hour-temp">' + item.temp + '°</div>'
          + '<div class="meteo-hour-rain-wrap"><div class="meteo-hour-rain-bar" style="height:' + barH + 'px"></div></div>'
          + '<div class="meteo-hour-rain">' + item.prob + '%</div>'
          + '<div class="meteo-hour-mm">' + (item.mm > 0 ? item.mm.toFixed(1) + ' mm' : '—') + '</div>'
          + '<div class="meteo-hour-wind">➜ ' + item.wind + '</div>'
          + '</div>';
      }).join('')
    + '</div>'
    + '<div class="meteo-card-foot">Barres : pluie prévue · % : risque · mm : cumul estimé sur le créneau</div>'
    + '</div>';
}


function meteoGetMoonPhase(nowDate) {
  var lp = 2551443;
  var newMoon = new Date(Date.UTC(1970, 0, 7, 20, 35, 0));
  var phase = (((nowDate.getTime() - newMoon.getTime()) / 1000) % lp + lp) % lp;
  var ratio = phase / lp;
  var phases = [
    { limit: 0.03, icon: '🌑', label: 'Nouvelle lune' },
    { limit: 0.22, icon: '🌒', label: 'Premier croissant' },
    { limit: 0.28, icon: '🌓', label: 'Premier quartier' },
    { limit: 0.47, icon: '🌔', label: 'Lune gibbeuse croissante' },
    { limit: 0.53, icon: '🌕', label: 'Pleine lune' },
    { limit: 0.72, icon: '🌖', label: 'Lune gibbeuse décroissante' },
    { limit: 0.78, icon: '🌗', label: 'Dernier quartier' },
    { limit: 0.97, icon: '🌘', label: 'Dernier croissant' },
    { limit: 1.01, icon: '🌑', label: 'Nouvelle lune' }
  ];
  for (var i = 0; i < phases.length; i++) {
    if (ratio < phases[i].limit) return phases[i];
  }
  return phases[0];
}

function meteoBuildSunBlock(days, nowDate) {
  var sunriseIso = (days.sunrise || [])[0];
  var sunsetIso  = (days.sunset || [])[0];
  if (!sunriseIso || !sunsetIso) return '';

  function isoToMinutes(iso) {
    var m = String(iso || '').match(/T(\d{2}):(\d{2})/);
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  }
  function minutesToLabel(mins) {
    if (mins == null || isNaN(mins)) return '—';
    var h = String(Math.floor(mins / 60)).padStart(2, '0');
    var m = String(mins % 60).padStart(2, '0');
    return h + 'h' + m;
  }
  function parisNowMinutes(dateObj) {
    var parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(dateObj || new Date());
    var get = function(type){ var p = parts.find(function(x){ return x.type === type; }); return p ? Number(p.value) : 0; };
    return get('hour') * 60 + get('minute');
  }

  var sunriseMins = isoToMinutes(sunriseIso);
  var sunsetMins = isoToMinutes(sunsetIso);
  if (sunriseMins == null || sunsetMins == null || sunsetMins <= sunriseMins) return '';

  var nowMins = parisNowMinutes(nowDate);
  var total = sunsetMins - sunriseMins;
  var progress = ((nowMins - sunriseMins) / total) * 100;
  progress = Math.max(0, Math.min(100, progress));
  var moon = meteoGetMoonPhase(nowDate);

  return '<div class="meteo-card meteo-sun-card">'
    + '<div class="meteo-sun-head">'
    + '<div><div class="meteo-card-kicker">☀️ Soleil</div></div>'
    + '<div class="meteo-moon-chip" title="' + esc(moon.label) + '"><span>' + moon.icon + '</span>' + esc(moon.label) + '</div>'
    + '</div>'
    + '<div class="meteo-sun-row">'
    + '<div><div class="meteo-mini-label">Lever</div><div class="meteo-sun-time">' + esc(minutesToLabel(sunriseMins)) + '</div></div>'
    + '<div class="meteo-sun-progress"><div class="meteo-sun-progress-bar" style="width:' + progress + '%"></div><div class="meteo-sun-progress-dot" style="left:calc(' + progress + '% - 7px)"></div></div>'
    + '<div><div class="meteo-mini-label">Coucher</div><div class="meteo-sun-time">' + esc(minutesToLabel(sunsetMins)) + '</div></div>'
    + '</div>'
    + '</div>';
}

function meteoBuildRiskCard(forecast, vigilance, nowDate) {
  var hourly = forecast.hourly || {};
  var daily = forecast.daily || {};
  var times = hourly.time || [];
  var start = meteoFindFirstFutureIndex(times, nowDate);
  var items = [];

  if (meteoHasAlert(vigilance)) {
    items.push('Vigilance ' + esc(vigilance.color_label || 'météo') + ' : ' + esc(vigilance.phenomenon_label || 'phénomène météo') + '.');
  }

  var bestRain = null, bestGust = null;
  for (var i = start; i !== -1 && i < Math.min(start + 18, times.length); i++) {
    var prob = Math.round((hourly.precipitation_probability || [])[i] || 0);
    var mm = Number((hourly.precipitation || [])[i] || 0);
    var gust = Math.round((hourly.wind_gusts_10m || [])[i] || 0);
    if (prob >= 40 || mm >= 0.3) {
      if (!bestRain || prob > bestRain.prob || mm > bestRain.mm) {
        bestRain = { idx:i, prob:prob, mm:mm };
      }
    }
    if (gust >= 35) {
      if (!bestGust || gust > bestGust.gust) bestGust = { idx:i, gust:gust };
    }
  }

  if (bestRain) {
    var rainDt = new Date(times[bestRain.idx]);
    items.push('Précipitations vers ' + rainDt.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' }).replace(':', 'h') + ' : ' + bestRain.prob + '% · ' + bestRain.mm.toFixed(1) + ' mm.');
  }
  if (bestGust) {
    var gustDt = new Date(times[bestGust.idx]);
    items.push('Vent plus soutenu vers ' + gustDt.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' }).replace(':', 'h') + ' : rafales ' + bestGust.gust + ' km/h.');
  }
  if ((daily.uv_index_max || [])[1] != null && Number((daily.uv_index_max || [])[1]) >= 6) {
    items.push('Demain : UV ' + Number((daily.uv_index_max || [])[1]).toFixed(1) + '.');
  }
  if (!items.length) {
    items.push('Pas de risque météo notable détecté dans les prochaines heures.');
  }

  return '<div class="meteo-card meteo-risk-card">'
    + '<div class="meteo-card-kicker">⚡ Prochains risques</div>'
    + '<div class="meteo-risk-list">'
    + items.slice(0, 3).map(function(txt){ return '<div class="meteo-risk-item">' + txt + '</div>'; }).join('')
    + '</div>'
    + '</div>';
}

function meteoBuildAlertCard(vigilance) {
  if (!meteoHasAlert(vigilance)) {
    return '<div class="meteo-card meteo-alert-card level-1">'
      + '<div class="meteo-alert-topline"><span class="meteo-alert-chip">✅ Situation</span></div>'
      + '<div class="meteo-alert-title">Aucune vigilance météo en cours</div>'
      + '<div class="meteo-alert-text">' + esc(meteoAlertSummary(vigilance)) + '</div>'
      + '</div>';
  }

  var level = Number(vigilance.level || 2);
  var startTxt = meteoFormatAlertDate(vigilance.start, false);
  var endTxt = meteoFormatAlertDate(vigilance.end, false);
  var summary = meteoAlertSummary(vigilance);

  return '<details class="meteo-card meteo-alert-card level-' + level + '" open>'
    + '<summary class="meteo-alert-summary">'
    + '<div class="meteo-alert-topline">'
    + '<span class="meteo-alert-chip">' + (METEO_ALERT_ICONS[level] || '⚠️') + ' Vigilance ' + esc(vigilance.color_label || METEO_ALERT_COLORS[level] || '') + '</span>'
    + '<span class="meteo-alert-action">Touchez pour le détail</span>'
    + '</div>'
    + '<div class="meteo-alert-head">'
    + '<div class="meteo-alert-icon">' + meteoPhenomenonIcon(vigilance) + '</div>'
    + '<div class="meteo-alert-copy">'
    + '<div class="meteo-alert-title">' + esc(vigilance.phenomenon_label || 'Alerte météo') + '</div>'
    + '<div class="meteo-alert-text">' + esc(summary) + '</div>'
    + '</div>'
    + '</div>'
    + '<div class="meteo-alert-periods">'
    + '<div class="meteo-alert-period"><span>Début</span><strong>' + esc(startTxt) + '</strong></div>'
    + '<div class="meteo-alert-period"><span>Fin</span><strong>' + esc(endTxt) + '</strong></div>'
    + '</div>'
    + '</summary>'
    + '<div class="meteo-alert-detail">'
    + '<div class="meteo-alert-detail-line"><strong>Début :</strong> ' + esc(startTxt) + '</div>'
    + '<div class="meteo-alert-detail-line"><strong>Fin :</strong> ' + esc(endTxt) + '</div>'
    + '<div class="meteo-alert-detail-line"><strong>Zone :</strong> Loiret (45)</div>'
    + '<div class="meteo-alert-detail-text">' + esc(summary).replace(/\n/g, '<br>') + '</div>'
    + '</div>'
    + '</details>';
}

async function loadMeteo() {
  try {
    const fr = await fetch(METEO_URL, { cache: 'no-store' });
    if (!fr.ok) throw new Error('HTTP ' + fr.status);
    const d = await fr.json();
    const cur = (d.forecast || {}).current || {};
    const vigilance = d.vigilance || null;
    const code = cur.weather_code;
    const temp = Math.round(cur.temperature_2m != null ? cur.temperature_2m : 0);
    const vent = Math.round(cur.wind_speed_10m != null ? cur.wind_speed_10m : 0);
    const badge = document.getElementById('meteo-alerte');
    const descEl = document.getElementById('meteo-desc');
    const baseDesc = (METEO_DESC[code] || 'Météo') + ' · Vent ' + vent + ' km/h';

    document.getElementById('meteo-ico').textContent = METEO_ICONS[code] || '🌡️';
    document.getElementById('meteo-temp').innerHTML = '<strong style="font-size:1.2rem;color:var(--cream)">' + temp + '°C</strong>';

    if (meteoHasAlert(vigilance)) {
      const startTxt = meteoFormatAlertDate(vigilance.start, false);
      const endTxt = meteoFormatAlertDate(vigilance.end, false);
      descEl.innerHTML = esc(baseDesc) + '<br><span class="meteo-alert-times">Début ' + esc(startTxt) + ' · Fin ' + esc(endTxt) + '</span>';
      badge.textContent = '⚠️ Vigilance ' + (vigilance.color_label || METEO_ALERT_COLORS[Number(vigilance.level || 0)] || 'météo');
      badge.classList.add('meteo-badge-alert', 'level-' + Number(vigilance.level || 2));
      badge.title = 'Touchez pour voir le détail de l’alerte';
    } else {
      descEl.textContent = baseDesc;
      badge.textContent = '✅ Pas d\'alerte';
      badge.classList.remove('meteo-badge-alert', 'level-2', 'level-3', 'level-4');
      badge.title = '';
    }

    badge.style.display = 'inline-flex';
    window._meteoData = d;
  } catch (e) {
    var offline = !navigator.onLine;
    document.getElementById('meteo-temp').innerHTML = '<span class="meteo-loading">' + (offline ? '📡 Hors ligne' : 'Météo indisponible') + '</span>';
    document.getElementById('meteo-desc').textContent = offline ? 'Reconnectez-vous pour actualiser' : '';
    document.getElementById('meteo-alerte').style.display = 'none';
  }
}

function loadMeteoDetail() {
  var d = window._meteoData;
  var el = document.getElementById('meteo-detail');
  if (!d) {
    el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted)">Données météo non disponibles.</div>';
    return;
  }

  var forecast = d.forecast || {};
  var cur = forecast.current || {};
  var days = forecast.daily || {};
  var hourly = forecast.hourly || {};
  var vigilance = d.vigilance || null;
  var now = new Date();
  var JOURS = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
  var NORM_MAX = [5,7,12,16,20,24,26,26,22,17,10,6];
  var NORM_MIN = [0,1,3,6,10,13,15,15,11,8,4,1];
  var moisN = now.getMonth();
  var times = hourly.time || [];

  var idxNow = meteoFindClosestHourlyIndex(times, now);
  var idx3hBefore = meteoFindClosestHourlyIndex(times, new Date(now.getTime() - 3 * 3600000));

  var hrlyHum  = hourly.relative_humidity_2m || [];
  var hrlyPres = hourly.surface_pressure || hourly.pressure_msl || [];
  var hrlyWGst = hourly.wind_gusts_10m || [];
  var hrlyPrec = hourly.precipitation || [];

  var pluie24h = days.precipitation_sum && days.precipitation_sum[0] != null ? parseFloat(days.precipitation_sum[0]).toFixed(1) : '–';
  var rafaleMax24 = days.wind_gusts_10m_max && days.wind_gusts_10m_max[0] != null ? Math.round(days.wind_gusts_10m_max[0]) : '–';
  var ventDirCur = meteoDir(cur.wind_direction_10m);
  var tempCur = cur.temperature_2m != null ? Math.round(cur.temperature_2m) : '–';
  var ressenti = cur.apparent_temperature != null ? Math.round(cur.apparent_temperature) : '–';

  var pluieCur3h = idxNow !== -1 ? (hrlyPrec[idxNow] != null ? hrlyPrec[idxNow] : null) : null;
  var pluieBef3h = idx3hBefore !== -1 ? (hrlyPrec[idx3hBefore] != null ? hrlyPrec[idx3hBefore] : null) : null;
  var rafCur = idxNow !== -1 ? (hrlyWGst[idxNow] != null ? hrlyWGst[idxNow] : null) : null;
  var rafBef = idx3hBefore !== -1 ? (hrlyWGst[idx3hBefore] != null ? hrlyWGst[idx3hBefore] : null) : null;
  var presCur = cur.pressure_msl != null ? cur.pressure_msl : (idxNow !== -1 ? hrlyPres[idxNow] : null);
  var presBef = idx3hBefore !== -1 ? (hrlyPres[idx3hBefore] != null ? hrlyPres[idx3hBefore] : null) : null;
  var humCur = cur.relative_humidity_2m != null ? cur.relative_humidity_2m : (idxNow !== -1 ? hrlyHum[idxNow] : null);
  var humBef = idx3hBefore !== -1 ? (hrlyHum[idx3hBefore] != null ? hrlyHum[idx3hBefore] : null) : null;

  var tPluie = meteoTrend(pluieCur3h, pluieBef3h, 2, 0.5);
  var tRaf = meteoTrend(rafCur, rafBef, 20, 5);
  var tPres = meteoTrend(presCur, presBef, 5, 1.5);
  var tHum = meteoTrend(humCur, humBef, 15, 5);

  var tempNormNow = NORM_MAX[moisN] != null && NORM_MIN[moisN] != null ? Math.round((NORM_MAX[moisN] + NORM_MIN[moisN]) / 2) : null;
  function fmtNorm(v, n) {
    if (v == null || n == null) return '—';
    var e = v - n;
    return (e >= 0 ? '+' : '') + e + '°';
  }
  var eTemp = fmtNorm(tempCur !== '–' ? tempCur : null, tempNormNow);
  var eRes = fmtNorm(ressenti !== '–' ? ressenti : null, tempNormNow);

  var html = '<div class="meteo-premium">';
  html += meteoBuildAlertCard(vigilance);
  html += meteoBuildHourlyTimeline(hourly, now);
  html += meteoBuildRiskCard(forecast, vigilance, now);

  html += '<div class="meteo-days-block">'
    + '<div class="meteo-card-kicker">📅 Prochains jours</div>'
    + '<div class="meteo-days-scroll"><div class="meteo-days-track">';
  var nD = Math.min((days.time || []).length, 11);
  for (var i = 1; i < nD; i++) {
    var dt = days.time[i] ? new Date(days.time[i]) : new Date();
    var jr = i === 1 ? 'Auj.' : i === 2 ? 'Dem.' : JOURS[dt.getDay()] + ' ' + dt.getDate();
    var co = (days.weather_code || [])[i] || 0;
    var tx = Math.round((days.temperature_2m_max || [])[i] || 0);
    var tn = Math.round((days.temperature_2m_min || [])[i] || 0);
    var pl = parseFloat((days.precipitation_sum || [])[i] || 0).toFixed(1);
    var uv = (days.uv_index_max || [])[i] != null ? Number((days.uv_index_max || [])[i]).toFixed(1) : '–';
    var wd = meteoDir((days.wind_direction_10m_dominant || [])[i]);
    var gust = (days.wind_gusts_10m_max || [])[i] != null ? Math.round((days.wind_gusts_10m_max || [])[i]) : '–';
    html += '<div class="meteo-day-card">'
      + '<div class="meteo-day-title">' + jr + '</div>'
      + '<div class="meteo-day-icon">' + (METEO_ICONS[co] || '🌡️') + '</div>'
      + '<div class="meteo-day-temp"><span>' + tn + '°</span><span>' + tx + '°</span></div>'
      + '<div class="meteo-day-desc">' + (METEO_DESC[co] || '') + '</div>'
      + '<div class="meteo-day-meta">🌧️ ' + pl + ' mm</div>'
      + '<div class="meteo-day-meta">☀️ UV ' + uv + '</div>'
      + '<div class="meteo-day-meta">➜ ' + gust + (wd ? ' ' + wd : '') + '</div>'
      + '</div>';
  }
  html += '</div></div></div>';

  html += '<div class="meteo-card meteo-current-card">'
    + '<div class="meteo-current-main">'
    + '<div><div class="meteo-card-kicker">🌡️ Température actuelle</div><div class="meteo-current-value">' + tempCur + '°C <span>(ressenti ' + ressenti + '°)</span></div></div>'
    + '<div class="meteo-current-norms">'
    + '<div class="meteo-current-norm"><span>Saison T°</span><strong>' + eTemp + '</strong></div>'
    + '<div class="meteo-current-norm"><span>Saison ress.</span><strong>' + eRes + '</strong></div>'
    + '</div>'
    + '</div>'
    + '</div>';

  html += meteoBuildSunBlock(days, now);

  html += '<div class="meteo-grid-2 meteo-grid-secondary">'
    + '<div class="meteo-card meteo-stat-card meteo-stat-compact"><div class="meteo-card-kicker">🌧️ Cumul pluie</div><div class="meteo-stat-value">' + pluie24h + ' mm</div>' + meteoTrendBadge(tPluie) + '</div>'
    + '<div class="meteo-card meteo-stat-card meteo-stat-compact"><div class="meteo-card-kicker">💧 Humidité</div><div class="meteo-stat-value">' + (humCur != null ? Math.round(humCur) : '–') + '%</div>' + meteoTrendBadge(tHum) + '</div>'
    + '<div class="meteo-card meteo-stat-card meteo-stat-compact"><div class="meteo-card-kicker">💨 Rafales</div><div class="meteo-stat-value">' + rafaleMax24 + ' km/h' + (ventDirCur ? ' <span class="meteo-inline-soft">' + ventDirCur + '</span>' : '') + '</div>' + meteoTrendBadge(tRaf) + '</div>'
    + '<div class="meteo-card meteo-stat-card meteo-stat-compact"><div class="meteo-card-kicker">📊 Pression</div><div class="meteo-stat-value">' + (presCur != null ? Math.round(presCur) : '–') + ' hPa</div>' + meteoTrendBadge(tPres) + '</div>'
    + '</div>';

  html += '<div class="meteo-source">Source : Open-Meteo · Vigilance : Météo-France</div>';
  html += '</div>';
  el.innerHTML = html;
}

// ── Mairie ────────────────────────────────────────────────
function loadMairieStatus(){
  var nowParis=new Date(new Date().toLocaleString('en-US',{timeZone:'Europe/Paris'}));
  var day=nowParis.getDay(), mins=nowParis.getHours()*60+nowParis.getMinutes();
  function setStatus(main,sub,badge){
    document.getElementById('mairie-status').textContent=main;
    document.getElementById('mairie-desc').textContent=sub;
    document.getElementById('mairie-badge').textContent=badge;
  }
  if(day===1){
    if(mins>=14*60&&mins<17*60+30) return setStatus('Ouverte','Accueil ouvert jusqu\'à 17h30','Lundi');
    if(mins<14*60) return setStatus('Fermée','Ouvre aujourd\'hui à 14h','Lundi');
  }
  if(day===5){
    if(mins>=8*60+30&&mins<11*60+30) return setStatus('Ouverte','Accueil ouvert jusqu\'à 11h30','Vendredi');
    if(mins<8*60+30) return setStatus('Fermée','Ouvre aujourd\'hui à 8h30','Vendredi');
  }
  if(day===3) return setStatus('Sur RDV','Mercredi uniquement sur rendez-vous','Mercredi');
  if(day===0||day===6) return setStatus('Fermée','Prochaine ouverture lundi à 14h','Week-end');
  if(day===1&&mins>=17*60+30) return setStatus('Fermée','Prochaine ouverture mercredi sur RDV','Mairie');
  if(day===2) return setStatus('Fermée','Prochaine ouverture mercredi sur RDV','Mairie');
  if(day===4) return setStatus('Fermée','Prochaine ouverture vendredi à 8h30','Mairie');
  if(day===5&&mins>=11*60+30) return setStatus('Fermée','Prochaine ouverture lundi à 14h','Mairie');
  setStatus('Fermée','Horaires : lun 14h-17h30 · mer sur RDV · ven 8h30-11h30','Horaires');
}

// ── Déchets ───────────────────────────────────────────────
function getWeekNumber(d){const j=new Date(d.getFullYear(),0,1);return Math.ceil((((d-j)/86400000)+j.getDay()+1)/7);}
function loadDechets(){
  const now=new Date(), tz={timeZone:'Europe/Paris'};
  const hP=parseInt(new Intl.DateTimeFormat('fr-FR',{...tz,hour:'numeric',hour12:false}).format(now));
  const jour=parseInt(new Intl.DateTimeFormat('fr-FR',{...tz,day:'numeric'}).format(now));
  const moisP=parseInt(new Intl.DateTimeFormat('fr-FR',{...tz,month:'numeric'}).format(now));
  const annee=parseInt(new Intl.DateTimeFormat('fr-FR',{...tz,year:'numeric'}).format(now));
  const dateP=new Date(annee,moisP-1,jour), dowP=dateP.getDay(), semPaire=getWeekNumber(dateP)%2===0;
  const FERIES_FIXES=['01-01','05-01','05-08','07-14','08-15','11-01','11-11','12-25'];
  const FERIES_DATES=['2025-04-21','2025-05-29','2025-06-09','2026-04-06','2026-05-14','2026-05-25'];
  const mmdd=String(moisP).padStart(2,'0')+'-'+String(jour).padStart(2,'0');
  const iso=annee+'-'+String(moisP).padStart(2,'0')+'-'+String(jour).padStart(2,'0');
  const ferie=FERIES_FIXES.includes(mmdd)||FERIES_DATES.includes(iso);
  let bTxt='',bUrg=false;
  if(dowP===0){bTxt='🗑️ Sortir le bac noir ce soir !';bUrg=true;}
  else if(dowP===1&&hP<8){bTxt='🗑️ Bac noir : collecte ce matin';bUrg=true;}
  else if(dowP===1&&semPaire&&hP>=8){bTxt='♻️ Sortir le bac jaune ce soir !';bUrg=true;}
  else if(dowP===2&&semPaire&&hP<8){bTxt='♻️ Bac jaune : collecte ce matin';bUrg=true;}
  else{const j2lun=dowP===1?7:(8-dowP)%7||7;if(j2lun===1){bTxt='🗑️ Bac noir demain — sortir ce soir';bUrg=true;}else{bTxt='🗑️ Prochain bac noir : lundi matin';}}
  const omEl=document.getElementById('om-text');
  if(omEl){omEl.innerHTML=bTxt;omEl.style.color=bUrg?'#fcd34d':'rgba(216,243,220,0.85)';}
  const isH=moisP>=10||moisP<=3, matO=isH?10:9, apF=isH?17:18;
  const isJourOuv=dowP>=1&&dowP<=6&&!ferie;
  let dTxt='',dOuv=false;
  if(!isJourOuv){dTxt=ferie?'Déchetterie fermée (jour férié)':'Déchetterie fermée (ouvre lundi à '+matO+'h)';}
  else if(hP<matO){dTxt='Déchetterie fermée — ouvre à '+matO+'h';}
  else if(hP<12){dOuv=true;dTxt='Déchetterie ouverte — ferme à 12h';}
  else if(hP<14){dTxt='Déchetterie fermée — ouvre à 14h';}
  else if(hP<apF){dOuv=true;dTxt='Déchetterie ouverte — ferme à '+apF+'h';}
  else{dTxt='Déchetterie fermée — ouvre '+(dowP<6?'demain':'lundi')+' à '+matO+'h';}
  const dEl=document.getElementById('dechetterie-text'), dIco=document.getElementById('dech-ico');
  if(dEl){dEl.textContent=dTxt;dEl.style.color=dOuv?'#86efac':'rgba(216,243,220,0.75)';}
  if(dIco){dIco.textContent=dOuv?'🟢':'🔴';}
}

function loadDechetsDetail(){
  var el=document.getElementById('dechets-content');
  el.innerHTML='<div style="background:white;border-radius:14px;padding:14px;border:1px solid var(--border);margin-bottom:12px">'
    +'<div style="font-size:0.86rem;font-weight:900;color:var(--forest);margin-bottom:8px">🗑️ Collecte des ordures</div>'
    +'<div style="font-size:0.78rem;color:var(--muted);line-height:1.7">Bac noir (ordures ménagères) : chaque <strong>lundi matin</strong>. Sortez-le le dimanche soir.<br>'
    +'Bac jaune (recyclables) : un <strong>lundi sur deux</strong> (semaines paires). Sortez-le le lundi soir précédent.</div>'
    +'</div>'
    +'<div style="background:white;border-radius:14px;padding:14px;border:1px solid var(--border);margin-bottom:12px">'
    +'<div style="font-size:0.86rem;font-weight:900;color:var(--forest);margin-bottom:8px">🏭 Réseau des déchetteries</div>'
    +'<div style="font-size:0.78rem;color:var(--muted);line-height:1.7">Déchetterie de Cléry-Saint-André — lundi au samedi (sauf jours fériés)<br>'
    +'🕐 <strong>Hiver (oct-mars)</strong> : 10h-12h et 14h-17h<br>'
    +'🕐 <strong>Été (avr-sep)</strong> : 9h-12h et 14h-18h</div>'
    +'</div>';
}

// ── Bus Rémi ─────────────────────────────────────────────
// Vacances scolaires zone B 2025-2026
const VACANCES_SCOLAIRES = [
  ['2025-10-18','2025-11-03'],
  ['2025-12-20','2026-01-05'],
  ['2026-02-07','2026-02-23'],
  ['2026-04-04','2026-04-20'],
  ['2026-07-04','2026-08-31'],
];

function isVacancesScolaires() {
  const now = new Date(new Date().toLocaleString('en-US',{timeZone:'Europe/Paris'}));
  const iso = now.toISOString().slice(0,10);
  return VACANCES_SCOLAIRES.some(function(p){ return iso >= p[0] && iso <= p[1]; });
}

const BUS_HORAIRES = {
  mairie: {
    orleans_scolaire: ['06:44','14:20'],
    orleans_vacances: ['06:52','14:13'],
    nouan_scolaire:   ['12:57','18:08'],
    nouan_vacances:   ['18:06','18:31','19:05']
  },
  breau: {
    orleans_scolaire: ['06:46','07:35','09:26'],
    orleans_vacances: ['06:54','09:26'],
    nouan_scolaire:   ['18:06','18:31','19:05'],
    nouan_vacances:   ['18:06','18:31','19:05']
  }
};

function getNextBus(times) {
  if (!times || !times.length) return null;
  const now = new Date(new Date().toLocaleString('en-US',{timeZone:'Europe/Paris'}));
  const nowMins = now.getHours()*60 + now.getMinutes();
  for (var i=0; i<times.length; i++) {
    var parts = times[i].split(':');
    var busMins = parseInt(parts[0])*60 + parseInt(parts[1]);
    if (busMins > nowMins) {
      var diff = busMins - nowMins;
      if (diff <= 30) return { time: times[i], label: 'dans ' + diff + ' min' };
      return { time: times[i], label: times[i] };
    }
  }
  return null;
}

function loadBusRemi() {
  var el  = document.getElementById('bus-strip-stops');
  var pel = document.getElementById('bus-periode');
  if (!el) return;

  var vac = isVacancesScolaires();
  var H   = BUS_HORAIRES;
  if (pel) pel.textContent = '';

  var mOrl = getNextBus(vac ? H.mairie.orleans_vacances : H.mairie.orleans_scolaire);
  var bOrl = getNextBus(vac ? H.breau.orleans_vacances  : H.breau.orleans_scolaire);

  var html = '';
  if (mOrl) html += '<span class="bus-stop-row"><span class="bus-stop-name">Mairie</span> → Orléans <span class="bus-next">' + mOrl.label + '</span></span>';
  if (bOrl) html += '<span class="bus-stop-row"><span class="bus-stop-name">Le Bréau</span> → Orléans <span class="bus-next">' + bOrl.label + '</span></span>';
  if (!html) html = '<span class="bus-loading">Plus de bus vers Orléans aujourd\'hui</span>';

  el.innerHTML = html;
}

// ── Prochain événement (header) ──────────────────────────
const MONTHS = ['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc'];

async function loadEvents(){
  try{
    var evts=await ensureAgendaEvents();
    var first=evts.length?evts[0]:null;
    if(!first){
      document.getElementById('next-event-date').textContent='Aucune date';
      document.getElementById('next-event-name').textContent='Aucune manifestation à venir';
      document.getElementById('next-event-days').textContent='Ouvrir l\'agenda';
      return;
    }
    var diff=Math.ceil((first.start-new Date())/(1000*60*60*24));
    var diffTxt=diff<=0?'Aujourd\'hui':diff===1?'Demain':'Dans '+diff+' j.';
    document.getElementById('next-event-date').textContent=first.start.getDate()+' '+MONTHS[first.start.getMonth()];
    document.getElementById('next-event-name').textContent=first.summary;
    document.getElementById('next-event-days').textContent=diffTxt;
  }catch(e){
    var offline = !navigator.onLine;
    document.getElementById('next-event-date').textContent = offline?'📡 Hors ligne':'Indisponible';
    document.getElementById('next-event-name').textContent = offline?'Agenda non dispo':'Agenda';
    document.getElementById('next-event-days').textContent = offline?'Reconnectez-vous':'Réessayez plus tard';
  }
}
