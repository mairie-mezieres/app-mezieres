/* ════════════════════════════════════════════════════════════
   MAT — Widgets header v3.8.0
   Météo, déchets, bus Rémi, mairie, prochain événement
   Copyright (c) 2024-2026 Commune de Mézières-lez-Cléry — Licence MIT
   ════════════════════════════════════════════════════════════ */

// ── Météo ─────────────────────────────────────────────────
const METEO_ICONS = {0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',48:'🌫️',51:'🌦️',53:'🌦️',55:'🌧️',61:'🌧️',63:'🌧️',65:'🌧️',71:'❄️',73:'❄️',75:'❄️',80:'🌦️',81:'🌧️',82:'⛈️',95:'⛈️',99:'⛈️'};
const METEO_DESC  = {0:'Ciel dégagé',1:'Principalement dégagé',2:'Partiellement nuageux',3:'Couvert',45:'Brouillard',48:'Brouillard givrant',51:'Bruine légère',53:'Bruine modérée',55:'Bruine dense',61:'Pluie légère',63:'Pluie modérée',65:'Pluie forte',71:'Neige légère',73:'Neige modérée',75:'Neige forte',80:'Averses légères',81:'Averses modérées',82:'Averses violentes',95:'Orage',99:'Orage fort'};
const METEO_ALERT_COLORS = {1:'vert',2:'jaune',3:'orange',4:'rouge'};
// Mois en toutes lettres, pour nommer la normale affichée (« Normale de juillet »).
const METEO_MOIS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

// « de juillet », mais « d'avril », « d'août », « d'octobre » : l'élision est
// obligatoire devant une voyelle. Un simple 'de ' + mois écrivait « Normale de
// août » trois mois par an.
function meteoMoisPrefixe(moisNum) {
  var nom = METEO_MOIS[Number(moisNum) - 1] || '';
  if (!nom) return '';
  return (/^[aeiouyâàéèêîôû]/i.test(nom) ? 'd\'' : 'de ') + nom;
}
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
    var statusLabel = vigilance.upcoming ? 'prévue' : 'en cours';
    return 'Vigilance ' + (vigilance.color_label || METEO_ALERT_COLORS[Number(vigilance.level || 0)] || 'météo') + ' ' + statusLabel + ' sur le Loiret.';
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

// Échelle UV de l'OMS, reprise par Météo-France : 1-2 faible, 3-5 modéré,
// 6-7 fort, 8-10 très fort, 11 et plus extrême. Le palier 8 est le même que
// celui des « Prochains risques » et du conseil du jour — une valeur, une
// seule lecture dans toute l'application.
function meteoUvLevel(uv) {
  if (uv == null || isNaN(Number(uv))) return null;
  var v = Number(uv);
  if (v < 3) return { cls: 'uv-1', label: 'faible' };
  if (v < 6) return { cls: 'uv-2', label: 'modéré' };
  if (v < 8) return { cls: 'uv-3', label: 'fort' };
  if (v < 11) return { cls: 'uv-4', label: 'très fort' };
  return { cls: 'uv-5', label: 'extrême' };
}

function meteoUvChip(uv) {
  var lvl = meteoUvLevel(uv);
  if (!lvl) return '<span class="meteo-uv-chip uv-0">UV –</span>';
  var val = Number(uv).toFixed(1);
  return '<span class="meteo-uv-chip ' + lvl.cls + '" aria-label="' + esc('Indice UV ' + val + ', ' + lvl.label) + '">UV ' + val + '</span>';
}

// Durée lisible (« 45 min », « 8 h 30 », « 2 j 4 h ») — pour le compte à rebours
// d'une vigilance. C'est la seule information que l'habitant ne peut pas lire
// lui-même sur les deux dates affichées.
function meteoHumanDelay(ms) {
  var mins = Math.max(0, Math.round(ms / 60000));
  if (mins < 60) return mins + ' min';
  var h = Math.floor(mins / 60);
  var m = mins % 60;
  if (h < 24) return h + ' h' + (m ? ' ' + String(m).padStart(2, '0') : '');
  var d = Math.floor(h / 24);
  var rh = h % 24;
  return d + ' j' + (rh ? ' ' + rh + ' h' : '');
}

// Avancement d'une vigilance : { label, progress }.
// `progress` vaut null quand les dates ne permettent pas de situer l'instant
// présent — la frise est alors omise plutôt que dessinée au hasard.
function meteoAlertProgress(vigilance, nowDate) {
  var v = vigilance || {};
  var now = (nowDate || new Date()).getTime();
  var startMs = v.start ? new Date(v.start).getTime() : NaN;
  var endMs = v.end ? new Date(v.end).getTime() : NaN;
  if (isNaN(startMs) && isNaN(endMs)) return { label: '', progress: null };

  if (!isNaN(startMs) && now < startMs) {
    return { label: '⏳ Débute dans ' + meteoHumanDelay(startMs - now), progress: 0 };
  }
  if (!isNaN(endMs) && now < endMs) {
    var pct = (!isNaN(startMs) && endMs > startMs)
      ? Math.max(0, Math.min(100, ((now - startMs) / (endMs - startMs)) * 100))
      : null;
    return { label: '⏳ Se termine dans ' + meteoHumanDelay(endMs - now), progress: pct };
  }
  // Fin dépassée : Météo-France n'a pas encore levé la vigilance côté API.
  return { label: '⏳ Fin annoncée passée — en attente de mise à jour', progress: 100 };
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

// ── Indice du jour dans les tableaux `daily` ────────────────
// ⚠️ PIÈGE : le backend interroge Open-Meteo avec `past_days=1`
// (chatbot-mairie-mezieres/lib/meteo.js), donc `daily[0]` est **HIER** et
// `daily[1]` aujourd'hui. Lire l'indice 0 en croyant lire aujourd'hui a
// produit un bug d'un jour (voir ADR-0007).
// On ne code pas ce décalage en dur : on cherche la date du jour — calculée
// à Paris, pas dans le fuseau du téléphone — dans `daily.time`. Le code reste
// juste si le backend change un jour ses paramètres.
function meteoParisDateKey(dateObj) {
  try {
    // en-CA formate en YYYY-MM-DD, directement comparable à daily.time
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(dateObj || new Date());
  } catch (e) {
    var d = dateObj || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
}

// Renvoie l'indice d'aujourd'hui dans daily.time, ou -1 si introuvable
// (données périmées, réponse partielle…). Les appelants doivent traiter -1
// comme « je ne sais pas » plutôt que de retomber sur 0.
function meteoTodayIndex(daily, nowDate) {
  var times = (daily && daily.time) || [];
  if (!times.length) return -1;
  var today = meteoParisDateKey(nowDate);
  for (var i = 0; i < times.length; i++) {
    if (String(times[i] || '').slice(0, 10) === today) return i;
  }
  return -1;
}

// Minutes écoulées depuis minuit, heure de Paris — pour comparer une heure
// locale d'Open-Meteo (« 2026-07-29T06:32 ») sans dépendre du fuseau du
// téléphone (un habitant en vacances à l'étranger verrait sinon la mauvaise
// phase du jour).
function meteoParisNowMinutes(dateObj) {
  try {
    var parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(dateObj || new Date());
    var get = function (type) { var p = parts.find(function (x) { return x.type === type; }); return p ? Number(p.value) : 0; };
    return get('hour') * 60 + get('minute');
  } catch (e) {
    var d = dateObj || new Date();
    return d.getHours() * 60 + d.getMinutes();
  }
}

// « 2026-07-29T06:32 » → 392 (minutes depuis minuit), ou null
function meteoIsoToMinutes(iso) {
  var m = String(iso || '').match(/T(\d{2}):(\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
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
  return ' <span class="meteo-trend-inline" style="color:' + trend.col + '" title="' + esc(trend.lbl || '') + '">' + trend.ico + '</span>';
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
    var tempVal = ((hourly || {}).temperature_2m || [])[i];
    slice.push({
      hour: dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h'),
      // Température absente : « – », jamais 0 °C (ADR-0018).
      temp: tempVal != null ? Math.round(tempVal) + '°' : '–',
      prob: Math.round(((hourly || {}).precipitation_probability || [])[i] || 0),
      mm: mmVal,
      wind: Math.round((((hourly || {}).wind_speed_10m || [])[i] || 0)),
      windDir: meteoDir((((hourly || {}).wind_direction_10m || [])[i])),
      windDeg: (((hourly || {}).wind_direction_10m || [])[i] || 0),
      code: ((hourly || {}).weather_code || [])[i]
    });
  }
  if (!slice.length) return '';
  var maxMm = 0;
  slice.forEach(function(item){ maxMm = Math.max(maxMm, Number(item.mm || 0)); });
  if (maxMm <= 0) maxMm = 1;

  return '<div class="meteo-card meteo-hourly-card">'
    + '<h3 class="meteo-card-kicker">🕒 Prochaines 12 heures</h3>'
    // tabindex + nom accessible : sous Chrome, un conteneur défilant sans
    // tabindex est hors d'atteinte au clavier (ADR-0016).
    + '<div class="meteo-hourly-track" tabindex="0" role="group" aria-label="Prévisions heure par heure, liste défilante">'
    + slice.map(function(item){
        var barH = Math.max(5, Math.round((Number(item.mm || 0) / maxMm) * 30));
        return '<div class="meteo-hour-col">'
          + '<div class="meteo-hour-time">' + esc(item.hour) + '</div>'
          + '<div class="meteo-hour-icon">' + (item.code != null ? (METEO_ICONS[item.code] || '🌡️') : '❔') + '</div>'
          + '<div class="meteo-hour-temp">' + esc(item.temp) + '</div>'
          + '<div class="meteo-hour-rain-wrap"><div class="meteo-hour-rain-bar" style="height:' + barH + 'px"></div></div>'
          + '<div class="meteo-hour-rain">' + item.prob + '%</div>'
          + '<div class="meteo-hour-mm">' + (item.mm > 0 ? item.mm.toFixed(1) + ' mm' : '—') + '</div>'
          + '<div class="meteo-hour-wind"><span style="display:inline-block;transform:rotate(' + (item.windDeg + 90) + 'deg)">➜</span> ' + item.wind + (item.windDir ? ' ' + item.windDir : '') + '</div>'
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
  // daily[0] = hier (past_days=1) : on résout l'indice du jour courant.
  var dayIdx = meteoTodayIndex(days, nowDate);
  if (dayIdx < 0) return '';
  var sunriseIso = (days.sunrise || [])[dayIdx];
  var sunsetIso  = (days.sunset || [])[dayIdx];
  if (!sunriseIso || !sunsetIso) return '';

  var isoToMinutes = meteoIsoToMinutes;
  function minutesToLabel(mins) {
    if (mins == null || isNaN(mins)) return '—';
    var h = String(Math.floor(mins / 60)).padStart(2, '0');
    var m = String(mins % 60).padStart(2, '0');
    return h + 'h' + m;
  }
  var parisNowMinutes = meteoParisNowMinutes;

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
    + '<div><h3 class="meteo-card-kicker">☀️ Soleil</h3></div>'
    + '<div class="meteo-moon-chip" title="' + esc(moon.label) + '"><span>' + moon.icon + '</span>' + esc(moon.label) + '</div>'
    + '</div>'
    + '<div class="meteo-sun-row">'
    + '<div><div class="meteo-mini-label">Lever</div><div class="meteo-sun-time">' + esc(minutesToLabel(sunriseMins)) + '</div></div>'
    + '<div class="meteo-sun-progress"><div class="meteo-sun-progress-bar" style="width:' + progress + '%"></div><div class="meteo-sun-progress-dot" style="left:calc(' + progress + '% - 7px)"></div></div>'
    + '<div><div class="meteo-mini-label">Coucher</div><div class="meteo-sun-time">' + esc(minutesToLabel(sunsetMins)) + '</div></div>'
    + '</div>'
    + '</div>';
}

// Risques prévisionnels des 18 prochaines heures, sous forme d'items visuels
// { icon, label, when, value, pct, tone }.
//
// Deux garde-fous contre le bruit — c'est ce que les habitants reprochaient à
// la section « Prochains risques » :
//   1. une vigilance en cours dit déjà son risque : on ne le répète pas ici ;
//   2. l'indice UV ne remonte qu'à partir de 8 (« très fort », seuil des
//      conseils du jour). À 6, l'item s'affichait tous les jours de l'été sans
//      rien apprendre à personne.
function meteoBuildRiskItems(forecast, vigilance, nowDate) {
  var hourly = forecast.hourly || {};
  var daily = forecast.daily || {};
  var times = hourly.time || [];
  var start = meteoFindFirstFutureIndex(times, nowDate);
  var hasAlert = meteoHasAlert(vigilance);
  var phenom = Number((vigilance || {}).phenomenon_id || 0);
  var skipRain = hasAlert && (phenom === 2 || phenom === 3 || phenom === 4);
  var skipWind = hasAlert && (phenom === 1 || phenom === 3);

  var items = [];
  var bestRain = null, bestGust = null;
  for (var i = start; i !== -1 && i < Math.min(start + 18, times.length); i++) {
    var prob = Math.round((hourly.precipitation_probability || [])[i] || 0);
    var mm = Number((hourly.precipitation || [])[i] || 0);
    var gust = Math.round((hourly.wind_gusts_10m || [])[i] || 0);
    if (prob >= 40 || mm >= 0.3) {
      if (!bestRain || prob > bestRain.prob || mm > bestRain.mm) {
        bestRain = { idx: i, prob: prob, mm: mm };
      }
    }
    if (gust >= 35) {
      if (!bestGust || gust > bestGust.gust) bestGust = { idx: i, gust: gust };
    }
  }

  function heure(idx) {
    return new Date(times[idx]).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
  }

  if (bestRain && !skipRain) {
    items.push({
      icon: bestRain.prob >= 70 ? '🌧️' : '🌦️',
      label: 'Pluie',
      when: 'vers ' + heure(bestRain.idx),
      value: bestRain.prob + ' % de risque · ' + bestRain.mm.toFixed(1) + ' mm',
      pct: Math.max(6, Math.min(100, bestRain.prob)),
      tone: (bestRain.prob >= 80 || bestRain.mm >= 3) ? 'high' : (bestRain.prob >= 60 || bestRain.mm >= 1) ? 'mid' : 'low'
    });
  }
  if (bestGust && !skipWind) {
    items.push({
      icon: '💨',
      label: 'Rafales',
      when: 'vers ' + heure(bestGust.idx),
      value: bestGust.gust + ' km/h',
      // Jauge graduée sur 100 km/h : au-delà, le vent est déjà une vigilance.
      pct: Math.max(6, Math.min(100, bestGust.gust)),
      tone: bestGust.gust >= 80 ? 'high' : bestGust.gust >= 60 ? 'mid' : 'low'
    });
  }

  // ⚠️ daily[0] = HIER (past_days=1) — indexer par meteoTodayIndex, jamais en
  // dur. L'ancien code lisait daily[1] en l'annonçant « Demain » : il affichait
  // en fait l'UV du jour même.
  var dayIdx = meteoTodayIndex(daily, nowDate);
  if (dayIdx >= 0) {
    var uvs = daily.uv_index_max || [];
    var uvToday = Number(uvs[dayIdx]);
    var uvTomorrow = Number(uvs[dayIdx + 1]);
    // Avant 14 h, le pic UV du jour est encore devant l'habitant ; après, seul
    // le lendemain a du sens.
    var pick = (meteoParisNowMinutes(nowDate) < 14 * 60 && isFinite(uvToday) && uvToday >= 8)
      ? { uv: uvToday, when: "aujourd'hui" }
      : (isFinite(uvTomorrow) && uvTomorrow >= 8 ? { uv: uvTomorrow, when: 'demain' } : null);
    if (pick) {
      items.push({
        icon: '🧴',
        label: 'UV très fort',
        when: pick.when,
        value: 'Indice ' + pick.uv.toFixed(1) + ' — crème et ombre aux heures chaudes',
        pct: Math.max(6, Math.min(100, Math.round((pick.uv / 11) * 100))),
        tone: pick.uv >= 11 ? 'high' : 'mid'
      });
    }
  }

  return items;
}

function meteoRiskItemHtml(r) {
  return '<div class="meteo-risk-item tone-' + r.tone + '" role="group" aria-label="' + esc(r.label + ' ' + r.when + ' : ' + r.value) + '">'
    + '<span class="meteo-risk-ico" aria-hidden="true">' + r.icon + '</span>'
    + '<span class="meteo-risk-body">'
    + '<span class="meteo-risk-line"><span class="meteo-risk-label">' + esc(r.label) + '</span><span class="meteo-risk-when">' + esc(r.when) + '</span></span>'
    + '<span class="meteo-risk-gauge" aria-hidden="true"><span class="meteo-risk-gauge-fill" style="width:' + r.pct + '%"></span></span>'
    + '<span class="meteo-risk-value">' + esc(r.value) + '</span>'
    + '</span>'
    + '</div>';
}

// Conditions du moment. Ces mesures étaient toutes calculées par
// `loadMeteoDetail` — température, ressenti, humidité, pression, tendances sur
// trois heures — et aucune n'était affichée : sept variables mortes et un lot
// de règles CSS orphelines. Sur un écran de canicule, le **ressenti** est
// justement le chiffre que l'on cherche.
//
// ⚠️ Pas d'« écart aux normales » ici : les normales mensuelles étaient
// codées en dur dans `loadMeteoDetail`, sans source vérifiable. Afficher
// « +6° au-dessus des normales » sur cette base serait une donnée inventée
// (ADR-0018). À reprendre le jour où le backend servira des normales sourcées.
/* Écart à la normale du mois — rendu seulement si TOUT est là et sourcé.
   ────────────────────────────────────────────────────────────────────────
   ⚠️ La comparaison porte sur la MAXIMALE DU JOUR face à la normale des
   maximales. Comparer la température de l'instant à une moyenne mensuelle de
   maximales afficherait « bien en dessous des normales » tous les matins, et
   « au-dessus » tous les après-midis d'été : deux affirmations fausses tirées
   de chiffres justes. C'est l'ancienne version qui faisait cela (ADR-0022).

   Le mois est lu sur le JOUR comparé (`daily.time[dayIdx]`) et non sur l'heure
   du navigateur : le 1er du mois, les deux ne disent pas la même chose.

   Les normales viennent du backend avec leur provenance (`lib/normales.js`) ;
   sans elles, cette ligne n'existe pas — l'app n'invente aucune normale. */
function meteoBuildNormLine(daily, normales, nowDate) {
  if (!normales || !Array.isArray(normales.mois) || !normales.mois.length) return '';
  if (!daily || !daily.temperature_2m_max) return '';

  var dayIdx = meteoTodayIndex(daily, nowDate);   // daily[0] = HIER (ADR-0007)
  if (dayIdx < 0) return '';

  var brut = daily.temperature_2m_max[dayIdx];
  if (brut == null) return '';                    // « – » ailleurs, rien ici : c'est un complément
  var tmaxJour = Number(brut);
  if (!isFinite(tmaxJour)) return '';

  var jour = String((daily.time && daily.time[dayIdx]) || '');
  var m = /^\d{4}-(\d{2})-\d{2}/.exec(jour);
  if (!m) return '';
  var moisNum = Number(m[1]);

  var norme = null;
  for (var i = 0; i < normales.mois.length; i++) {
    if (Number(normales.mois[i].mois) === moisNum) { norme = normales.mois[i]; break; }
  }
  if (!norme || norme.tmax == null || !isFinite(Number(norme.tmax))) return '';

  var ecart = Math.round((tmaxJour - Number(norme.tmax)) * 10) / 10;
  var abs = Math.abs(ecart);
  // Seuil d'emphase : sous 3 °C, l'écart est affiché mais reste neutre. Une
  // pastille rouge à +1,2 °C banaliserait la couleur, comme l'UV à 6 le faisait
  // dans « Prochains risques » avant la v4.77.
  var ton = abs < 3 ? 'tone-neutre' : (ecart > 0 ? 'tone-chaud' : 'tone-froid');
  var libelleEcart = abs < 0.05
    ? 'conforme à la normale'
    : (ecart > 0 ? '+' : '−') + String(abs).replace('.', ',') + ' °C';

  var jeu = normales.jeu ? String(normales.jeu) : '';
  // Provenance écrite sous la valeur : « réanalyse » et non « station », parce
  // qu'ERA5 est une maille de modèle. Le backend le dit (`reanalyse: true`), on
  // le répète à l'habitant plutôt que de le laisser supposer un relevé local.
  //
  // ⚠️ Cette ligne doit tenir sur UNE ligne, y compris en « très grand texte »
  // (`html.font-xl`) : à deux lignes elle poussait la carte de 90 px. La période
  // (1991-2020) a donc rejoint la ligne de sources en pied de fenêtre, où vivent
  // déjà le fournisseur et la licence — chaque fait reste visible, une fois.
  var provenance = 'Normale ' + meteoMoisPrefixe(moisNum) + ' : '
    + String(Math.round(Number(norme.tmax) * 10) / 10).replace('.', ',') + ' °C'
    + (jeu ? ' · ' + (normales.reanalyse ? 'réanalyse ' : '') + jeu : '');

  return '<div class="meteo-now-norm ' + ton + '">'
    + '<div class="meteo-now-norm-main">'
    + '<span class="meteo-mini-label">Maximale prévue aujourd\'hui</span>'
    + '<strong>' + Math.round(tmaxJour) + ' °C</strong>'
    + '<span class="meteo-norm-ecart">' + esc(libelleEcart) + '</span>'
    + '</div>'
    + '<div class="meteo-now-norm-src">' + esc(provenance) + '</div>'
    + '</div>';
}

function meteoBuildNowCard(forecast, nowDate, normales) {
  var cur = (forecast || {}).current || {};
  var hourly = (forecast || {}).hourly || {};
  var daily = (forecast || {}).daily || {};
  var times = hourly.time || [];

  var temp = cur.temperature_2m != null ? Math.round(cur.temperature_2m) : null;
  if (temp == null) return ''; // sans mesure, pas de carte : rien à inventer

  var idxNow = meteoFindClosestHourlyIndex(times, nowDate);
  var idx3h = meteoFindClosestHourlyIndex(times, new Date(nowDate.getTime() - 3 * 3600000));
  var dayIdx = meteoTodayIndex(daily, nowDate);
  function at(arr, i) { return (i !== -1 && arr && arr[i] != null) ? Number(arr[i]) : null; }

  var ressenti = cur.apparent_temperature != null ? Math.round(cur.apparent_temperature) : null;
  var hum = cur.relative_humidity_2m != null ? Math.round(cur.relative_humidity_2m) : at(hourly.relative_humidity_2m, idxNow);
  var pres = cur.pressure_msl != null ? Math.round(cur.pressure_msl) : at(hourly.surface_pressure, idxNow);
  var gust24 = dayIdx >= 0 ? at(daily.wind_gusts_10m_max, dayIdx) : null;
  var vent = cur.wind_speed_10m != null ? Math.round(cur.wind_speed_10m) : null;
  var dirCur = meteoDir(cur.wind_direction_10m);
  var code = cur.weather_code;

  var tHum = meteoTrend(hum, at(hourly.relative_humidity_2m, idx3h), 15, 5);
  var tPres = meteoTrend(pres, at(hourly.surface_pressure, idx3h), 5, 1.5);
  // Pas de flèche de tendance sur les rafales : la valeur affichée est le
  // maximum de la journée, pas une mesure de l'instant — une tendance sur un
  // maximum quotidien ne veut rien dire. (Le bloc « Air » en affichait une.)

  function stat(label, valeur, badge) {
    return '<div class="meteo-now-stat">'
      + '<span class="meteo-mini-label">' + esc(label) + '</span>'
      + '<strong>' + (valeur == null ? '–' : esc(valeur)) + (valeur == null ? '' : (badge || '')) + '</strong>'
      + '</div>';
  }

  var desc = (code != null && METEO_DESC[code]) ? METEO_DESC[code] : null;
  var sousTitre = [desc, vent != null ? 'Vent ' + vent + ' km/h' + (dirCur ? ' ' + dirCur : '') : null]
    .filter(Boolean).join(' · ');

  return '<div class="meteo-card meteo-now-card">'
    + '<h3 class="meteo-card-kicker">🌡️ Maintenant</h3>'
    + '<div class="meteo-now-head">'
    + '<span class="meteo-now-ico" aria-hidden="true">' + (code != null ? (METEO_ICONS[code] || '🌡️') : '🌡️') + '</span>'
    + '<span class="meteo-now-temp">' + temp + '<span>°</span></span>'
    + (ressenti != null
        ? '<span class="meteo-now-feels"><span class="meteo-mini-label">Ressenti</span><strong>' + ressenti + '°</strong></span>'
        : '')
    + '</div>'
    + (sousTitre ? '<div class="meteo-now-desc">' + esc(sousTitre) + '</div>' : '')
    + meteoBuildNormLine(daily, normales, nowDate)
    + '<div class="meteo-now-grid">'
    + stat('Humidité', hum != null ? hum + ' %' : null, meteoTrendBadge(tHum))
    + stat('Pression', pres != null ? pres + ' hPa' : null, meteoTrendBadge(tPres))
    // « Rafales · 24 h » passait à la ligne dans sa tuile dès le réglage
    // « grand texte » : la puce médiane offrait un point de coupure de plus.
    + stat('Rafales 24 h', gust24 != null ? Math.round(gust24) + ' km/h' : null, '')
    + '</div>'
    + '</div>';
}

function meteoBuildAlertRiskCard(forecast, vigilance, nowDate) {
  var hasAlert = meteoHasAlert(vigilance);
  var level = hasAlert ? Number(vigilance.level || 2) : 1;
  var riskItems = meteoBuildRiskItems(forecast, vigilance, nowDate);

  var alertHtml;
  if (!hasAlert) {
    alertHtml = '<div class="meteo-alert-topline"><span class="meteo-alert-chip">✅ Pas de vigilance météo</span></div>'
      + '<div class="meteo-alert-text" style="margin-top:4px">' + esc(meteoAlertSummary(vigilance)) + '</div>';
  } else {
    // Le repli automatique de meteoAlertSummary (« Vigilance orange en cours
    // sur le Loiret. ») redit mot pour mot la pastille de niveau : on n'affiche
    // le texte que si Météo-France a réellement fourni un bulletin.
    var bulletin = (vigilance.main_text || '').trim();
    var progression = meteoAlertProgress(vigilance, nowDate);
    var startTxt = meteoFormatAlertDate(vigilance.start, false);
    var endTxt = meteoFormatAlertDate(vigilance.end, false);
    var pct = progression.progress;

    alertHtml = '<div class="meteo-alert-topline">'
      + '<span class="meteo-alert-chip">' + (METEO_ALERT_ICONS[level] || '⚠️') + ' Vigilance ' + esc(vigilance.color_label || METEO_ALERT_COLORS[level] || '') + (vigilance.upcoming ? ' · À venir' : '') + '</span>'
      + '<span class="meteo-alert-zone">📍 Loiret (45)</span>'
      + '</div>'
      + '<div class="meteo-alert-head">'
      + '<div class="meteo-alert-icon" aria-hidden="true">' + meteoPhenomenonIcon(vigilance) + '</div>'
      + '<div class="meteo-alert-copy">'
      + '<div class="meteo-alert-title">' + esc(vigilance.phenomenon_label || 'Alerte météo') + '</div>'
      + (bulletin ? '<div class="meteo-alert-text">' + esc(bulletin).replace(/\n/g, '<br>') + '</div>' : '')
      + '</div>'
      + '</div>'
      + '<div class="meteo-alert-timeline">'
      + (progression.label ? '<div class="meteo-alert-countdown">' + esc(progression.label) + '</div>' : '')
      + (pct != null
          ? '<div class="meteo-alert-bar" role="img" aria-label="' + esc('Alerte du ' + startTxt + ' au ' + endTxt) + '">'
            + '<div class="meteo-alert-bar-fill" style="width:' + pct + '%"></div>'
            // Pastille bornée : à 0 % comme à 100 %, elle reste dans la barre.
            + '<div class="meteo-alert-bar-dot" style="left:min(calc(100% - 14px), max(0px, calc(' + pct + '% - 7px)))"></div>'
            + '</div>'
          : '')
      + '<div class="meteo-alert-bounds"><span>' + esc(startTxt) + '</span><span>' + esc(endTxt) + '</span></div>'
      + '</div>';
  }

  // Sous une vigilance, une section « Prochains risques » vide dirait
  // « aucun risque notable » juste sous une alerte orange : on l'omet.
  var riskHtml = '';
  if (riskItems.length || !hasAlert) {
    riskHtml = '<div class="meteo-risk-block">'
      + '<h3 class="meteo-card-kicker">⚡ Prochains risques</h3>'
      + '<div class="meteo-risk-list">'
      + (riskItems.length
          ? riskItems.slice(0, 3).map(meteoRiskItemHtml).join('')
          : '<div class="meteo-risk-item meteo-risk-calm">'
            + '<span class="meteo-risk-ico" aria-hidden="true">✅</span>'
            + '<span class="meteo-risk-body">'
            + '<span class="meteo-risk-label">Rien à signaler</span>'
            + '<span class="meteo-risk-value">Aucun risque notable dans les 18 prochaines heures.</span>'
            + '</span></div>')
      + '</div>'
      + '</div>';
  }

  return '<div class="meteo-card meteo-alert-card level-' + level + '">'
    + '<div class="meteo-alert-block">' + alertHtml + '</div>'
    + riskHtml
    + '</div>';
}

// ── Dernier bulletin reçu, conservé pour le hors-ligne ────────────────────
// Même principe que les actus et les documents officiels : sans cache, ouvrir
// l'application sans réseau donnait « Données météo non disponibles » et une
// fenêtre météo vide, alors qu'un bulletin d'il y a vingt minutes reste utile.
const METEO_CACHE_KEY = 'mat_meteo_cache';
const METEO_CACHE_MAX_AGE = 6 * 3600000; // au-delà, mieux vaut se taire

function meteoWriteCache(d) {
  try { localStorage.setItem(METEO_CACHE_KEY, JSON.stringify({ t: Date.now(), d: d })); } catch (_) {}
}

// Renvoie { t, d } ou null si le cache est absent, illisible ou trop vieux.
// ⚠️ La vigilance est purgée si son échéance est passée : une alerte terminée
// réaffichée hors ligne ne serait pas une information datée, mais une fausse
// information.
function meteoReadCache(nowMs) {
  try {
    var raw = localStorage.getItem(METEO_CACHE_KEY);
    if (!raw) return null;
    var c = JSON.parse(raw);
    if (!c || !c.d || !c.t) return null;
    var now = nowMs || Date.now();
    if (now - Number(c.t) > METEO_CACHE_MAX_AGE) return null;
    var v = c.d.vigilance;
    if (v && v.end && new Date(v.end).getTime() < now) c.d.vigilance = null;
    return c;
  } catch (_) { return null; }
}

function meteoClockLabel(ms) {
  var d = new Date(ms);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
}

// Peint le bandeau d'accueil. `cachedAt` non nul = données relues du cache :
// on le dit, plutôt que de laisser croire à un relevé de l'instant.
function meteoPaintHeader(d, cachedAt) {
  const cur = (d.forecast || {}).current || {};
  const vigilance = d.vigilance || null;
  const code = cur.weather_code;
  const temp = Math.round(cur.temperature_2m != null ? cur.temperature_2m : 0);
  const vent = Math.round(cur.wind_speed_10m != null ? cur.wind_speed_10m : 0);
  const badge = document.getElementById('meteo-alerte');
  const descEl = document.getElementById('meteo-desc');
  const baseDesc = (METEO_DESC[code] || 'Météo') + ' · Vent ' + vent + ' km/h';
  const staleTxt = cachedAt ? '📡 Hors ligne · relevé de ' + meteoClockLabel(cachedAt) : '';

  document.getElementById('meteo-ico').textContent = METEO_ICONS[code] || '🌡️';
  document.getElementById('meteo-temp').innerHTML = '<strong style="font-size:1.2rem;color:var(--cream)">' + temp + '°C</strong>';

  if (meteoHasAlert(vigilance)) {
    const startTxt = meteoFormatAlertDate(vigilance.start, false);
    const endTxt = meteoFormatAlertDate(vigilance.end, false);
    const upcomingLabel = vigilance.upcoming ? ' · À venir' : '';
    descEl.innerHTML = esc(baseDesc) + '<br><span class="meteo-alert-times">' + (vigilance.upcoming ? 'Prévu ' : 'Début ') + esc(startTxt) + ' · Fin ' + esc(endTxt) + '</span>'
      + (staleTxt ? '<br><span class="meteo-stale-note">' + esc(staleTxt) + '</span>' : '');
    badge.textContent = '⚠️ Vigilance ' + (vigilance.color_label || METEO_ALERT_COLORS[Number(vigilance.level || 0)] || 'météo') + upcomingLabel;
    badge.classList.add('meteo-badge-alert', 'level-' + Number(vigilance.level || 2));
    badge.title = vigilance.upcoming ? 'Alerte météo prévue — touchez pour le détail' : "Touchez pour voir le détail de l'alerte";
  } else {
    descEl.innerHTML = esc(baseDesc)
      + (staleTxt ? '<br><span class="meteo-stale-note">' + esc(staleTxt) + '</span>' : '');
    badge.textContent = cachedAt ? '📡 Hors ligne' : '✅ Pas d\'alerte';
    badge.classList.remove('meteo-badge-alert', 'level-2', 'level-3', 'level-4');
    badge.title = cachedAt ? 'Dernier bulletin reçu — reconnectez-vous pour actualiser' : '';
  }
  badge.style.display = 'inline-flex';
}

async function loadMeteo() {
  try {
    const fr = await fetch(METEO_URL, { cache: 'no-store', signal: matAbortTimeout(8000) });
    if (!fr.ok) throw new Error('HTTP ' + fr.status);
    const d = await fr.json();
    window._meteoData = d;
    window._meteoDataAt = Date.now();
    window._meteoDataStale = false;
    meteoWriteCache(d);
    meteoPaintHeader(d, null);
    // Header vivant : reflète la météo dans le bandeau (js/mat-ambiance.js)
    try{ if(typeof matHeaderAmbiance === 'function') matHeaderAmbiance(); }catch(_){}
  } catch (e) {
    if(typeof matLogError==='function' && navigator.onLine) matLogError('meteo','loadMeteo: '+e.message);
    var offline = !navigator.onLine;
    if(!offline && typeof window.matSignalServerError==='function') window.matSignalServerError();

    // Repli sur le dernier bulletin reçu — daté, jamais présenté comme frais.
    var cache = meteoReadCache();
    if (cache) {
      window._meteoData = cache.d;
      window._meteoDataAt = Number(cache.t);
      window._meteoDataStale = true;
      meteoPaintHeader(cache.d, Number(cache.t));
      try{ if(typeof matHeaderAmbiance === 'function') matHeaderAmbiance(); }catch(_){}
      return;
    }

    document.getElementById('meteo-temp').innerHTML = '<span class="meteo-loading">' + (offline ? '📡 Hors ligne' : '☁️ Météo indisponible') + '</span>';
    document.getElementById('meteo-desc').textContent = offline ? 'Reconnectez-vous pour actualiser' : 'Serveur chargé — réessayez dans quelques secondes';
    document.getElementById('meteo-alerte').style.display = 'none';
  }
}

async function loadMeteoDetail() {
  var el = document.getElementById('meteo-detail');
  if (!el) return;

  if (!window._meteoData) {
    el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted)">⏳ Chargement de la météo…</div>';
    try { await loadMeteo(); } catch(_) {}
    if (!window._meteoData) {
      el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted)">Données météo non disponibles.<br>Vérifiez votre connexion puis réessayez.</div>';
      return;
    }
  }

  var d = window._meteoData;

  var forecast = d.forecast || {};
  var days = forecast.daily || {};
  var hourly = forecast.hourly || {};
  var vigilance = d.vigilance || null;
  var now = new Date();
  var JOURS = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];

  // Indice du jour courant : daily[0] = hier (past_days=1) — cf. ADR-0007.
  var dayIdx = meteoTodayIndex(days, now);

  var html = '<div class="meteo-premium">';
  // Bulletin relu du cache : on le date en tête, avant toute autre lecture.
  if (window._meteoDataStale && window._meteoDataAt) {
    html += '<div class="meteo-stale-banner">📡 Hors ligne — dernier bulletin reçu à '
      + esc(meteoClockLabel(window._meteoDataAt)) + '. Les prévisions peuvent avoir changé.</div>';
  }
  html += meteoBuildAlertRiskCard(forecast, vigilance, now);
  html += meteoBuildNowCard(forecast, now, d.normales);
  html += meteoBuildHourlyTimeline(hourly, now);

  html += '<div class="meteo-days-block">'
    + '<h3 class="meteo-card-kicker">📅 Prochains jours</h3>'
    + '<div class="meteo-days-scroll" tabindex="0" role="group" aria-label="Prévisions des prochains jours, liste défilante">'
    + '<div class="meteo-days-track">';
  // Démarre au jour courant (et non à l'indice 1 en dur) : même source de
  // vérité que le reste, robuste si le backend change `past_days`.
  var dStart = dayIdx >= 0 ? dayIdx : 1;
  var nD = Math.min((days.time || []).length, dStart + 10);
  for (var i = dStart; i < nD; i++) {
    var dt = days.time[i] ? new Date(days.time[i]) : new Date();
    var jr = i === dStart ? 'Auj.' : i === dStart + 1 ? 'Dem.' : JOURS[dt.getDay()] + ' ' + dt.getDate();
    // ⚠️ Aucun `|| 0` sur une mesure absente : un code météo manquant devenait
    // le code 0, soit ☀️ « Ciel dégagé », et une température manquante devenait
    // 0 °C. Une donnée qu'on n'a pas s'écrit « – » (ADR-0018).
    var co = (days.weather_code || [])[i];
    var txV = (days.temperature_2m_max || [])[i];
    var tnV = (days.temperature_2m_min || [])[i];
    var plV = (days.precipitation_sum || [])[i];
    var uvV = (days.uv_index_max || [])[i];
    var tx = txV != null ? Math.round(txV) + '°' : '–';
    var tn = tnV != null ? Math.round(tnV) + '°' : '–';
    var pl = plV != null ? parseFloat(plV).toFixed(1) + ' mm' : '–';
    var uv = uvV != null ? Number(uvV) : null;
    var wd = meteoDir((days.wind_direction_10m_dominant || [])[i]);
    var wdDeg = (days.wind_direction_10m_dominant || [])[i] || 0;
    var gust = (days.wind_gusts_10m_max || [])[i] != null ? Math.round((days.wind_gusts_10m_max || [])[i]) + ' km/h' : '–';
    html += '<div class="meteo-day-card">'
      + '<div class="meteo-day-title">' + jr + '</div>'
      + '<div class="meteo-day-icon">' + (co != null ? (METEO_ICONS[co] || '🌡️') : '❔') + '</div>'
      + '<div class="meteo-day-temp"><span>' + tn + '</span><span>' + tx + '</span></div>'
      + '<div class="meteo-day-desc">' + (co != null ? (METEO_DESC[co] || '') : 'Indisponible') + '</div>'
      + '<div class="meteo-day-meta">🌧️ ' + pl + '</div>'
      + '<div class="meteo-day-meta">' + meteoUvChip(uv) + '</div>'
      + '<div class="meteo-day-meta"><span style="display:inline-block;transform:rotate(' + (wdDeg + 90) + 'deg)">➜</span> ' + gust + (wd ? ' ' + wd : '') + '</div>'
      + '</div>';
  }
  html += '</div></div></div>';

  var env = window._envLocalData || {};
  function _envSeuil(val, seuils) {
    if (val == null) return null;
    for (var i = 0; i < seuils.length; i++) { if (val < seuils[i]) return seuils[i]; }
    return null;
  }
  // Retourne un texte lisible sur le palier suivant :
  // sans icône si on est au niveau le plus bas (sûr), avec ⚠️ si on est dans une zone intermédiaire.
  function _envSeuilInfo(val, seuils, niveaux, unit) {
    if (val == null) return '';
    for (var i = 0; i < seuils.length; i++) {
      if (val < seuils[i]) {
        var icon = i === 0 ? '' : '⚠️ ';
        var nextLabel = niveaux && niveaux[i + 1] ? ' (' + niveaux[i + 1] + ')' : '';
        return icon + 'palier suivant : ' + seuils[i] + (unit || '') + nextLabel;
      }
    }
    return '';
  }
  function _pollenPct(val) {
    var zones = [0, 1, 10, 50, 100];
    for (var i = 0; i < zones.length - 1; i++) {
      if (val <= zones[i + 1])
        return (i + (val - zones[i]) / (zones[i + 1] - zones[i])) * 20;

    }
    return 100;
  }
  function _envBar(icon, label, valDisplay, levelLabel, pct, legendItems, border) {
    var p = Math.max(0, Math.min(100, +pct || 0));
    var grad = 'linear-gradient(90deg,#22c55e 0%,#a3e635 20%,#fde047 40%,#fb923c 60%,#ef4444 80%,#b91c1c 100%)';
    return '<div style="padding:10px 14px' + (border ? ';border-top:1px solid var(--border)' : '') + '">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px">'
      + '<span style="font-size:.77rem;color:var(--muted)">' + icon + ' ' + label + '</span>'
      + '<span style="font-size:.77rem;font-weight:800">' + levelLabel + (valDisplay ? ' <span style="font-weight:400;color:var(--muted)">· ' + valDisplay + '</span>' : '') + '</span>'
      + '</div>'
      + '<div style="height:9px;border-radius:999px;background:' + grad + ';position:relative;border:1px solid rgba(0,0,0,.08)">'
      + '<div style="position:absolute;top:50%;left:calc(' + p + '% - 7px);width:14px;height:14px;border-radius:50%;transform:translateY(-50%);background:#fff;border:2.5px solid #1f2937;box-shadow:0 1px 6px rgba(0,0,0,.25)"></div>'
      + '</div>'
      + '<div style="display:flex;justify-content:space-between;margin-top:5px;font-size:.58rem;color:var(--muted)">'
      + legendItems.map(function(l){ return '<span>' + esc(l) + '</span>'; }).join('')
      + '</div>'
      + '</div>';
  }
  var aqiBarHtml = '';
  if (env.aqi && env.aqi.valeur != null) {
    var aqiV = env.aqi.valeur;
    var aqiN = Math.round(+aqiV);
    aqiBarHtml = _envBar('🏭', 'Qualité de l\'air', 'IQA ' + aqiN, esc(env.aqi.label || '–'),
      Math.min(100, Math.max(0, +aqiV)),
      ['Bon', 'Moyen', 'Dégradé', 'Mauvais', 'Très mauv.'], false);
    if (env.aqi.dominant && env.aqi.dominant.label) {
      aqiBarHtml += '<div style="padding:0 14px 10px;margin-top:-3px;font-size:.68rem;color:var(--muted)">↳ Polluant dominant : <span style="font-weight:700;color:var(--text)">' + esc(env.aqi.dominant.label) + '</span></div>';
    }
  }
  var pollenBarHtml = '';
  if (env.pollen && env.pollen.niveau != null) {
    var polV = +env.pollen.niveau;
    pollenBarHtml = _envBar('🌸', 'Pollens', (Math.round(polV * 10) / 10) + ' gr/m³', esc(env.pollen.label || '–'),
      _pollenPct(polV),
      ['Nul', 'Très faible', 'Faible', 'Modéré', 'Élevé'], true);
  }

  function _airRow(label, val, border) {
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 14px;font-size:0.77rem'
      + (border ? ';border-top:1px solid var(--border)' : '') + '">'
      + '<span style="color:var(--muted)">' + label + '</span>'
      + '<span style="font-weight:700">' + val + '</span>'
      + '</div>';
  }

  html += meteoBuildSunBlock(days, now);

  // Rafales et pression ont quitté ce bloc pour la carte « Maintenant » : ce
  // sont des paramètres de vent et de pression, pas de qualité de l'air.
  html += '<div style="margin-top:10px;border-radius:14px;border:1px solid var(--border);background:var(--card)">'
    + '<h3 style="margin:0;padding:9px 14px;font-size:0.82rem;font-weight:900;color:var(--forest);border-bottom:1px solid var(--border)">🌿 Air</h3>'
    + (aqiBarHtml || _airRow('🏭 Qualité de l\'air', '–', false))
    + (pollenBarHtml || _airRow('🌸 Pollens', '–', true))
    + '</div>';

  // ── Conseils du jour (par seuil) — n’apparaît QUE si un paramètre le justifie.
  //    Déterministe (pas d’IA), gestes de bon sens de santé publique, source citée.
  //    Chaque règle est auto-limitante par sa saison (froid l’hiver, UV l’été…).
  //    ⚠️ daily[0] = HIER (past_days=1) : ces trois seuils lisaient la journée
  //    de la veille. Indexer par meteoTodayIndex, jamais en dur.
  var _cons = [];
  var _dj = dayIdx >= 0 ? dayIdx : 1;
  var _txT = (days.temperature_2m_max || [])[_dj];
  var _tnT = (days.temperature_2m_min || [])[_dj];
  var _uvT = (days.uv_index_max || [])[_dj];
  var _aqV = (env && env.aqi) ? env.aqi.valeur : null;
  var _plV = (env && env.pollen) ? env.pollen.niveau : null;
  var _dom = (env && env.aqi && env.aqi.dominant) ? env.aqi.dominant.label : null;
  if (_txT != null && _txT >= 36) _cons.push(['🥵', 'Chaleur extrême : buvez souvent, restez au frais aux heures chaudes, ne laissez jamais un enfant ou un animal seul dans une voiture, et prenez des nouvelles des personnes isolées.']);
  else if (_txT != null && _txT >= 32) _cons.push(['☀️', 'Forte chaleur : buvez régulièrement, fermez volets et fenêtres le jour, gardez une pièce fraîche, pensez aux personnes âgées ou isolées.']);
  if (_tnT != null && _tnT <= -4) _cons.push(['🥶', 'Grand froid : couvrez-vous bien, surveillez le chauffage (risque de monoxyde de carbone), prenez des nouvelles des voisins isolés.']);
  if (_aqV != null && _aqV >= 80) _cons.push(['🏭', 'Air très pollué' + (_dom ? ' (' + _dom + ')' : '') + ' : limitez les efforts physiques intenses en extérieur, même en bonne santé.']);
  else if (_aqV != null && _aqV >= 60) _cons.push(['🏭', 'Air pollué' + (_dom ? ' (' + _dom + ')' : '') + ' : personnes sensibles (asthme, enfants, seniors), évitez les efforts intenses dehors.']);
  if (_plV != null && _plV >= 50) _cons.push(['🌸', 'Pollens élevés : aérez tôt le matin, fenêtres fermées en journée ; pour les allergiques, évitez de tondre et rincez-vous les cheveux le soir.']);
  if (_uvT != null && +_uvT >= 8) _cons.push(['🧴', 'UV très fort : chapeau, lunettes et crème solaire ; évitez le soleil entre 12 h et 16 h.']);
  //    Une vigilance en cours mérite ses propres gestes : sans cela, une alerte
  //    « vent violent » ou « orages » n’était accompagnée d’aucun conseil — aucun
  //    seuil de température ne se déclenchant. Les gestes vivent ICI, dans le bloc
  //    qui existe déjà : pas de second encart de consignes dans la carte d’alerte.
  var _phen = meteoHasAlert(vigilance) ? Number(vigilance.phenomenon_id || 0) : 0;
  var _VIG_CONSEILS = {
    1: ['💨', 'Vent violent : limitez vos déplacements, rangez ou arrimez ce qui peut s’envoler, et ne touchez jamais un fil électrique tombé.'],
    2: ['🌧️', 'Pluie-inondation : ne vous engagez ni à pied ni en voiture sur une route inondée, et éloignez-vous des cours d’eau.'],
    3: ['⛈️', 'Orages : abritez-vous dans un bâtiment en dur, évitez les arbres isolés et reportez les activités de plein air.'],
    4: ['🌊', 'Crues : ne traversez jamais une zone inondée, mettez vos biens en hauteur et suivez la situation sur Vigicrues.'],
    5: ['❄️', 'Neige-verglas : ne prenez la route qu’en cas de nécessité et avec des équipements adaptés ; dégagez le trottoir devant chez vous.'],
    6: ['🥵', 'Canicule : buvez régulièrement sans attendre la soif, fermez volets et fenêtres le jour, aérez la nuit, et prenez des nouvelles des personnes isolées.'],
    7: ['🥶', 'Grand froid : couvrez-vous, surveillez le chauffage (risque de monoxyde de carbone) et prenez des nouvelles des personnes isolées.']
  };
  if (_VIG_CONSEILS[_phen]) {
    var _dejaDit = _cons.some(function(c){ return c[0] === _VIG_CONSEILS[_phen][0]; });
    // La canicule recoupe les seuils 32/36 °C ci-dessus : on ne dit pas deux fois
    // de boire de l’eau.
    if (!_dejaDit && !(_phen === 6 && _cons.some(function(c){ return c[0] === '☀️'; }))) {
      _cons.unshift(_VIG_CONSEILS[_phen]);
    }
  }
  if (_cons.length) {
    html += '<div style="margin-top:10px;border-radius:14px;border:1px solid var(--border);background:var(--card)">'
      + '<h3 style="margin:0;padding:9px 14px;font-size:0.82rem;font-weight:900;color:var(--forest);border-bottom:1px solid var(--border)">💡 Conseils du jour</h3>'
      + _cons.map(function(c, i){
          return '<div style="display:flex;gap:10px;padding:10px 14px;font-size:0.8rem;line-height:1.5;color:var(--text)' + (i ? ';border-top:1px solid var(--border)' : '') + '">'
            + '<span style="flex-shrink:0" aria-hidden="true">' + c[0] + '</span><span>' + esc(c[1]) + '</span></div>';
        }).join('')
      + '<div style="padding:8px 14px 10px;font-size:.62rem;color:var(--muted);border-top:1px solid var(--border)">Recommandations générales — source&nbsp;: Santé publique France / ATMO. En cas de doute, demandez conseil à votre médecin.</div>'
      + '</div>';
  }

  // Attribution et fraîcheur : Open-Meteo est diffusé sous licence CC BY 4.0,
  // et l'habitant doit pouvoir savoir de quand date ce qu'il lit. Les normales
  // viennent du même fournisseur (archive ERA5) : l'attribution les couvre, et
  // ne les mentionne que si elles ont réellement été servies.
  // La période des normales (1991-2020) est écrite ICI et plus dans la carte :
  // là-haut elle faisait passer la provenance sur deux lignes en « grand texte ».
  var _periodeNorm = (d.normales && d.normales.periode && d.normales.periode.debut && d.normales.periode.fin)
    ? ' ' + d.normales.periode.debut + '-' + d.normales.periode.fin : '';
  html += '<div class="meteo-source">Prévisions'
    + (d.normales ? ' et normales' + _periodeNorm : '') + ' Open-Meteo (CC BY 4.0) · vigilance Météo-France'
    + (window._meteoDataAt ? ' — ' + (window._meteoDataStale ? 'dernier bulletin reçu à ' : 'mis à jour à ') + esc(meteoClockLabel(window._meteoDataAt)) : '')
    + '</div>';

  html += '</div>';
  el.innerHTML = html;
}

// ── Jours fériés ──────────────────────────────────────────
const FERIES_FIXES=['01-01','05-01','05-08','07-14','08-15','11-01','11-11','12-25'];
const FERIES_DATES=['2025-04-21','2025-05-29','2025-06-09','2026-04-06','2026-05-14','2026-05-25','2027-03-29','2027-05-17'];
function isFerieDate(d){
  const mm=String(d.getMonth()+1).padStart(2,'0'),dd=String(d.getDate()).padStart(2,'0');
  const iso=d.getFullYear()+'-'+mm+'-'+dd;
  return FERIES_FIXES.includes(mm+'-'+dd)||FERIES_DATES.includes(iso);
}

// ── Mairie ────────────────────────────────────────────────
// ── Horaires exceptionnels (mairie & déchetterie) ───────────────
// Exceptions administrables (fermeture / horaires de remplacement) servies par
// le backend. Pré-chargées depuis localStorage pour un rendu immédiat hors-ligne.
var _matHoraires = { exceptions: [] };
try { var _hc=localStorage.getItem('mat_horaires_exc'); if(_hc) _matHoraires.exceptions=JSON.parse(_hc)||[]; } catch(e){}

function loadHoraireExceptions(){
  fetch(window.MAT_API+'/horaires/exceptions',{signal:matAbortTimeout(6000)})
    .then(function(r){ return r.ok?r.json():null; })
    .then(function(d){
      if(d && Array.isArray(d.exceptions)){
        _matHoraires.exceptions=d.exceptions;
        try{ localStorage.setItem('mat_horaires_exc',JSON.stringify(d.exceptions)); }catch(e){}
        try{ loadMairieStatus(); }catch(e){}
        try{ loadDechets(); }catch(e){}
      }
    })
    .catch(function(){});
}

// Exception active aujourd'hui (Europe/Paris) pour un service, sinon null.
function _matHoraireActive(service){
  var ex=_matHoraires.exceptions; if(!ex||!ex.length) return null;
  var today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris'}).format(new Date());
  for(var i=0;i<ex.length;i++){
    var e=ex[i]; if(!e||e.service!==service) continue;
    var s=e.start, en=e.end||e.start;
    if(today>=s && today<=en) return e;
  }
  return null;
}

function _hm2min(s){ var p=String(s).split(':'); return (parseInt(p[0],10)||0)*60+(parseInt(p[1],10)||0); }
function _fmtHM(s){ var p=String(s).split(':'); var h=parseInt(p[0],10)||0,m=parseInt(p[1],10)||0; return m?(h+'h'+String(m).padStart(2,'0')):(h+'h'); }

// Statut ouvert/fermé pour un jeu de plages horaires « HH:MM » et l'heure courante (minutes).
function _matRangeStatus(ranges, mins){
  var nextOpen=null;
  for(var i=0;i<ranges.length;i++){
    var o=_hm2min(ranges[i][0]), c=_hm2min(ranges[i][1]);
    if(mins>=o && mins<c) return {open:true, sub:"ferme à "+_fmtHM(ranges[i][1])};
    if(mins<o && nextOpen===null) nextOpen=ranges[i][0];
  }
  if(nextOpen!==null) return {open:false, sub:"ouvre à "+_fmtHM(nextOpen)};
  return {open:false, sub:"fermé pour aujourd'hui"};
}

function loadMairieStatus(){
  var nowParis=new Date(new Date().toLocaleString('en-US',{timeZone:'Europe/Paris'}));
  var day=nowParis.getDay(), mins=nowParis.getHours()*60+nowParis.getMinutes();
  function setStatus(main,sub,badge){
    document.getElementById('mairie-status').textContent=main;
    document.getElementById('mairie-desc').textContent=sub;
    document.getElementById('mairie-badge').textContent=badge;
  }
  function nextOpen(from){
    var map={1:['lundi','à 14h'],3:['mercredi','sur RDV'],5:['vendredi','à 8h30']};
    var d=new Date(from); d.setDate(d.getDate()+1);
    for(var i=0;i<14;i++){var dow=d.getDay();if(map[dow]&&!isFerieDate(d))return map[dow][0]+' '+map[dow][1];d.setDate(d.getDate()+1);}
    return 'prochainement';
  }
  var _mExc=_matHoraireActive('mairie');
  if(_mExc){
    if(_mExc.type==='closed') return setStatus('Fermée', _mExc.message||'Fermeture exceptionnelle', 'Exceptionnel');
    if(_mExc.type==='hours' && _mExc.ranges && _mExc.ranges.length && !isFerieDate(nowParis) && (day===1||day===3||day===5)){
      var _ms=_matRangeStatus(_mExc.ranges, mins);
      return setStatus(_ms.open?'Ouverte':'Fermée', (_ms.open?'Accueil ':'Mairie ')+_ms.sub+' · horaires exceptionnels', 'Exceptionnel');
    }
  }
  if(isFerieDate(nowParis)) return setStatus('Fermée','Prochaine ouverture '+nextOpen(nowParis),'Mairie');
  if(day===1){
    if(mins>=14*60&&mins<17*60+30) return setStatus('Ouverte',"Accueil ouvert jusqu'à 17h30",'Lundi');
    if(mins<14*60) return setStatus('Fermée',"Ouvre aujourd'hui à 14h",'Lundi');
  }
  if(day===5){
    if(mins>=8*60+30&&mins<11*60+30) return setStatus('Ouverte',"Accueil ouvert jusqu'à 11h30",'Vendredi');
    if(mins<8*60+30) return setStatus('Fermée',"Ouvre aujourd'hui à 8h30",'Vendredi');
  }
  if(day===3) return setStatus('Sur RDV','Mercredi uniquement sur rendez-vous','Mercredi');
  if(day===0||day===6) return setStatus('Fermée','Prochaine ouverture '+nextOpen(nowParis),'Week-end');
  if(day===1&&mins>=17*60+30) return setStatus('Fermée','Prochaine ouverture '+nextOpen(nowParis),'Mairie');
  if(day===2) return setStatus('Fermée','Prochaine ouverture '+nextOpen(nowParis),'Mairie');
  if(day===4) return setStatus('Fermée','Prochaine ouverture '+nextOpen(nowParis),'Mairie');
  if(day===5&&mins>=11*60+30) return setStatus('Fermée','Prochaine ouverture '+nextOpen(nowParis),'Mairie');
  setStatus('Fermée','Horaires : lun 14h-17h30 · mer sur RDV · ven 8h30-11h30','Horaires');
}

// ── Déchets ───────────────────────────────────────────────
// Numéro de semaine ISO 8601 (lundi = 1er jour, semaine 1 = celle du 1er jeudi).
// Calcul en UTC pour ne dépendre que de la date calendaire (robuste aux
// changements d'heure). La parité « semaines paires ISO » pilote le bac jaune ;
// l'ancienne formule simplifiée divergeait de l'ISO aux frontières d'année
// (ex. toute l'année 2027 inversée car 1er janv. = vendredi).
function getWeekNumber(d){
  const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
  const dayNum=(t.getUTCDay()+6)%7;          // lundi=0 … dimanche=6
  t.setUTCDate(t.getUTCDate()-dayNum+3);     // jeudi de la semaine courante
  const firstThu=new Date(Date.UTC(t.getUTCFullYear(),0,4)); // le 4 janv. ∈ S1
  const firstThuDayNum=(firstThu.getUTCDay()+6)%7;
  firstThu.setUTCDate(firstThu.getUTCDate()-firstThuDayNum+3);
  return 1+Math.round((t-firstThu)/(7*86400000));
}
function loadDechets(){
  const now=new Date(), tz={timeZone:'Europe/Paris'};
  const hP=parseInt(new Intl.DateTimeFormat('fr-FR',{...tz,hour:'numeric',hour12:false}).format(now));
  const minP=parseInt(new Intl.DateTimeFormat('fr-FR',{...tz,minute:'numeric'}).format(now))||0;
  const jour=parseInt(new Intl.DateTimeFormat('fr-FR',{...tz,day:'numeric'}).format(now));
  const moisP=parseInt(new Intl.DateTimeFormat('fr-FR',{...tz,month:'numeric'}).format(now));
  const annee=parseInt(new Intl.DateTimeFormat('fr-FR',{...tz,year:'numeric'}).format(now));
  const dateP=new Date(annee,moisP-1,jour), dowP=dateP.getDay();

  // Bac noir : collecte lundi matin (avant 8h) — sortir dimanche soir
  let noirJours=(1-dowP+7)%7;
  if(noirJours===0&&hP>=8&&!isFerieDate(new Date(annee,moisP-1,jour))) noirJours=7;

  // Bac jaune : collecte mardi matin (semaines paires ISO, avant 8h) — sortir lundi soir
  let jauneJours;
  {
    const d=new Date(annee,moisP-1,jour);
    if(dowP===2&&(hP<8||isFerieDate(d))&&getWeekNumber(d)%2===0){jauneJours=0;}
    else{
      const candidate=new Date(annee,moisP-1,jour);
      candidate.setDate(candidate.getDate()+1);
      for(let i=0;i<15;i++){
        if(candidate.getDay()===2&&getWeekNumber(candidate)%2===0) break;
        candidate.setDate(candidate.getDate()+1);
      }
      jauneJours=Math.round((candidate-d)/86400000);
    }
  }

  // Décalage si le jour de collecte tombe un jour férié
  {
    const noirDate=new Date(annee,moisP-1,jour); noirDate.setDate(noirDate.getDate()+noirJours);
    if(isFerieDate(noirDate)) noirJours++;
    const jauneDate=new Date(annee,moisP-1,jour); jauneDate.setDate(jauneDate.getDate()+jauneJours);
    if(isFerieDate(jauneDate)) jauneJours++;
    // Si le noir décalé tombe le même jour que le jaune, le jaune décale aussi
    const noirFinal=new Date(annee,moisP-1,jour); noirFinal.setDate(noirFinal.getDate()+noirJours);
    const jauneFinal=new Date(annee,moisP-1,jour); jauneFinal.setDate(jauneFinal.getDate()+jauneJours);
    if(noirFinal.getTime()===jauneFinal.getTime()) jauneJours++;
  }

  function fmtJ(j){
    if(j===0) return "aujourd'hui";
    if(j===1) return 'demain';
    return j+' j';
  }
  function renderInfo(el,jours,consigne){
    if(!el) return;
    if(consigne) el.innerHTML='<span class="dechet-consigne-pill">'+consigne+'</span>';
    else el.textContent=fmtJ(jours);
  }

  const noirConsigne=noirJours===0?'Ce matin !':noirJours===1?'Ce soir !':'';
  const jauneConsigne=jauneJours===0?'Ce matin !':jauneJours===1?'Ce soir !':'';
  renderInfo(document.getElementById('bac-noir-info'),noirJours,noirConsigne);
  renderInfo(document.getElementById('bac-jaune-info'),jauneJours,jauneConsigne);

  const mmdd=String(moisP).padStart(2,'0')+'-'+String(jour).padStart(2,'0');
  const iso=annee+'-'+String(moisP).padStart(2,'0')+'-'+String(jour).padStart(2,'0');
  const ferie=FERIES_FIXES.includes(mmdd)||FERIES_DATES.includes(iso);
  const isH=moisP>=10||moisP<=3, matO=isH?10:9, apF=isH?17:18;
  const isJourOuv=dowP>=1&&dowP<=6&&!ferie;
  let dTxt='',dOuv=false;
  const _dExc=_matHoraireActive('dechetterie');
  if(_dExc && _dExc.type==='closed'){dTxt=_dExc.message||'Déchetterie fermée (exceptionnel)';dOuv=false;}
  else if(_dExc && _dExc.type==='hours' && _dExc.ranges && _dExc.ranges.length && isJourOuv){
    const _ds=_matRangeStatus(_dExc.ranges,hP*60+minP);
    dOuv=_ds.open;dTxt='Déchetterie '+(_ds.open?'ouverte':'fermée')+' — '+_ds.sub+' (except.)';}
  else if(!isJourOuv){dTxt=ferie?'Déchetterie fermée (jour férié)':'Déchetterie fermée (ouvre lundi à '+matO+'h)';}
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
  var _de=_matHoraireActive('dechetterie');
  var _esc=function(s){return (''+s).replace(/[&<>]/g,function(c){return c==='&'?'&amp;':c==='<'?'&lt;':'&gt;';});};
  var _deNote=_de?('<div style="background:#fff7e6;border:1px solid #f5d77b;border-radius:12px;padding:12px 14px;margin-bottom:12px;font-size:0.8rem;color:#5a3d00;line-height:1.5"><strong>♻️ Horaires exceptionnels</strong><br>'
    +(_de.type==='closed'
      ? _esc(_de.message||'Déchetterie fermée sur cette période.')
      : 'Horaires de remplacement : '+_de.ranges.map(function(r){return r[0]+'–'+r[1];}).join(' / ')+(_de.message?(' — '+_esc(_de.message)):''))
    +'</div>'):'';
  el.innerHTML=_deNote+'<div style="background:var(--card);border-radius:14px;padding:14px;border:1px solid var(--border);margin-bottom:12px">'
    +'<div style="font-size:0.86rem;font-weight:900;color:var(--forest);margin-bottom:8px">🗑️ Collecte des ordures</div>'
    +'<div style="font-size:0.78rem;color:var(--muted);line-height:1.7">Bac noir (ordures ménagères) : chaque <strong>lundi matin</strong>. Sortez-le le dimanche soir.<br>'
    +'Bac jaune (recyclables) : un <strong>mardi sur deux</strong> (semaines paires). Sortez-le le lundi soir.</div>'
    +'</div>'
    +'<div style="background:var(--card);border-radius:14px;padding:14px;border:1px solid var(--border);margin-bottom:12px">'
    +'<div style="font-size:0.86rem;font-weight:900;color:var(--forest);margin-bottom:8px">🏭 Réseau des déchetteries</div>'
    +'<div style="font-size:0.78rem;color:var(--muted);line-height:1.7">Déchetterie de Cléry-Saint-André — lundi au samedi (sauf jours fériés)<br>'
    +'🕐 <strong>Hiver (oct-mars)</strong> : 10h-12h et 14h-17h<br>'
    +'🕐 <strong>Été (avr-sep)</strong> : 9h-12h et 14h-18h</div>'
    +'<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">'
    +'<a href="https://portail-usagers.ccterresduvaldeloire.fr/" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:5px;font-size:0.78rem;font-weight:700;color:var(--forest);text-decoration:none;background:var(--mist);border-radius:8px;padding:6px 11px">🔗 S\'inscrire à la déchetterie →</a>'
    +'<div style="font-size:0.72rem;color:var(--muted);margin-top:5px">Accès soumis à inscription (déclaration de plaque d\'immatriculation)</div>'
    +'</div>'
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

function toParisDate(date) {
  return date ? new Date(date.toLocaleString('en-US',{timeZone:'Europe/Paris'})) : new Date(new Date().toLocaleString('en-US',{timeZone:'Europe/Paris'}));
}

function isVacancesScolairesForDate(date) {
  var d = toParisDate(date);
  var iso = d.toISOString().slice(0,10);
  return VACANCES_SCOLAIRES.some(function(p){ return iso >= p[0] && iso <= p[1]; });
}

function isVacancesScolaires() {
  return isVacancesScolairesForDate(new Date());
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

function getBusTimes(stopKey, directionKey, date) {
  var vac = isVacancesScolairesForDate(date);
  var stop = BUS_HORAIRES[stopKey] || {};
  var suffix = vac ? '_vacances' : '_scolaire';
  return stop[directionKey + suffix] || [];
}

function formatBusTimesList(times) {
  return (times && times.length) ? times.join(' · ') : '—';
}

function formatRemiDayLabel(date) {
  var d = toParisDate(date);
  return d.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });
}

function buildRemiWeekCard(date, isToday) {
  var vac = isVacancesScolairesForDate(date);
  var mairieOrleans = formatBusTimesList(getBusTimes('mairie', 'orleans', date));
  var mairieNouan   = formatBusTimesList(getBusTimes('mairie', 'nouan', date));
  var breauOrleans  = formatBusTimesList(getBusTimes('breau',  'orleans', date));
  var breauNouan    = formatBusTimesList(getBusTimes('breau',  'nouan', date));

  return '<div class="remi-day-card' + (isToday ? ' today' : '') + '">'     + '<div class="remi-day-head">'     +   '<div class="remi-day-title">' + esc(formatRemiDayLabel(date)) + '</div>'     +   '<div class="remi-day-badge">' + (vac ? 'Vacances' : 'Scolaire') + '</div>'     + '</div>'     + '<div class="remi-grid">'     +   '<div class="remi-stop-box">'     +     '<div class="remi-stop-title">Mairie</div>'     +     '<div class="remi-line"><span>→ Orléans</span><strong>' + esc(mairieOrleans) + '</strong></div>'     +     '<div class="remi-line"><span>→ Saint-Laurent-Nouan</span><strong>' + esc(mairieNouan) + '</strong></div>'     +   '</div>'     +   '<div class="remi-stop-box">'     +     '<div class="remi-stop-title">Le Bréau</div>'     +     '<div class="remi-line"><span>→ Orléans</span><strong>' + esc(breauOrleans) + '</strong></div>'     +     '<div class="remi-line"><span>→ Saint-Laurent-Nouan</span><strong>' + esc(breauNouan) + '</strong></div>'     +   '</div>'     + '</div>'     + '</div>';
}

function loadRemiDetail() {
  var el = document.getElementById('remi-detail');
  if (!el) return;

  var now = toParisDate(new Date());
  var cards = '';
  for (var i = 0; i < 7; i++) {
    var day = new Date(now);
    day.setDate(now.getDate() + i);
    cards += buildRemiWeekCard(day, i === 0);
  }

  el.innerHTML = '<div class="remi-tad-block">'
    + '<div class="remi-tad-title">🚐 Transport à la demande</div>'
    + '<p class="remi-tad-text">Service Rémi TAD desservant les communes rurales — réservation obligatoire avant 17h la veille.</p>'
    + '<div class="remi-tad-rows">'
    + '<div class="remi-tad-row"><span class="remi-tad-day">Mardi</span><span class="remi-tad-zone">Secteur Meung-sur-Loire</span></div>'
    + '<div class="remi-tad-row"><span class="remi-tad-day">Jeudi</span><span class="remi-tad-zone">Secteur Beaugency</span></div>'
    + '</div>'
    + '<a class="remi-link-btn" href="https://www.remi-centrevaldeloire.fr/se-deplacer/transports-a-la-demande" target="_blank" rel="noopener">Réserver · En savoir plus →</a>'
    + '</div>'
    + '<details style="margin:8px 0;background:var(--card);border:1px solid var(--border);border-radius:14px;overflow:hidden">'
    + '<summary style="cursor:pointer;padding:10px 14px;font-size:.82rem;font-weight:800;color:#1a6b8a;list-style:none;display:flex;align-items:center;gap:6px;user-select:none">'
    + '<span style="font-size:1rem">🗺️</span> Plan de la ligne <span style="margin-left:auto">▼</span>'
    + '</summary>'
    + '<div style="padding:0 12px 12px;display:flex;justify-content:center">'
    + '<img src="./img/ligne8-plan.svg" alt="Plan ligne 8 Rémi — Saint-Laurent-Nouan ↔ Orléans" style="width:100%;max-width:320px;border-radius:14px;box-shadow:0 2px 10px rgba(0,0,0,.08)">'
    + '</div>'
    + '</details>'
    + '<div style="background:var(--card);border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:4px">'
    + '<div style="padding:9px 14px;font-size:.88rem;font-weight:900;color:var(--forest);border-bottom:1px solid var(--border)">🚌 Ligne 8 Rémi · Planning 7 jours</div>'
    + '<div class="remi-week" style="padding:8px">' + cards + '</div>'
    + '</div>'
    + '<div style="margin-top:10px;font-size:.72rem;color:var(--muted);line-height:1.5">Horaires intégrés dans MAT · distinction <strong>scolaire</strong> / <strong>vacances</strong> · vérifiez la fiche officielle en cas de doute.</div>'
    + '<a class="remi-link-btn" style="margin-top:8px" href="https://www.remi-centrevaldeloire.fr/" target="_blank" rel="noopener">🌐 Fiche officielle Rémi</a>';
}

function openRemi(){
  trackStat('remi');
  openOv('remi');
  loadRemiDetail();
}

function loadBusRemi() {
  var el  = document.getElementById('bus-strip-stops');
  if (!el) return;

  var vac = isVacancesScolaires();
  var H   = BUS_HORAIRES;

  var mOrl = getNextBus(vac ? H.mairie.orleans_vacances : H.mairie.orleans_scolaire);
  var bOrl = getNextBus(vac ? H.breau.orleans_vacances  : H.breau.orleans_scolaire);

  var html = '';
  if (mOrl) html += '<span class="bus-stop-row"><span class="bus-stop-name">Mairie</span> → Orléans <span class="bus-next">' + mOrl.label + '</span></span>';
  if (bOrl) html += '<span class="bus-stop-row"><span class="bus-stop-name">Le Bréau</span> → Orléans <span class="bus-next">' + bOrl.label + '</span></span>';
  if (!html) html = '<span class="bus-loading">Plus de bus vers Orléans aujourd\'hui</span>';

  el.innerHTML = html;
}

// ── Prix carburant ───────────────────────────────────────
var _carburantCache = null;

async function loadCarburant() {
  var el = document.getElementById('fuel-prices');
  if (!el) return;
  try {
    if (!_carburantCache) {
      var r = await fetch(window.MAT_API+'/carburant', { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      var fetched = await r.json();
      if (!fetched || fetched.error) throw new Error('payload carburant invalide');
      // Ne met en cache QUE sur succès : un hoquet backend transitoire ne fige
      // plus le widget sur « indisponible » pour toute la session.
      _carburantCache = fetched;
    }
    var d = _carburantCache;
    var s = d['clery'];
    var html = '';
    if (s) {
      var sp  = s.sp95   != null ? '<span class="fuel-val">' + parseFloat(s.sp95).toFixed(3)   + '</span> SP95' : '';
      var go  = s.gazole != null ? '<span class="fuel-val">' + parseFloat(s.gazole).toFixed(3) + '</span> GO'   : '';
      var line = [sp, go].filter(Boolean).join('<span class="fuel-sep">·</span>');
      html = '<span class="fuel-price-row fuel-station-name">Intermarché Cléry</span>';
      html += '<span class="fuel-price-row">' + (line || '<span style="color:rgba(255,255,255,.4)">N/D</span>') + '</span>';
    }
    if (!html) html = '<span class="bus-loading">Données indisponibles</span>';
    el.innerHTML = html;
  } catch(e) {
    if (el) el.innerHTML = '<span class="bus-loading">Indisponible</span>';
  }
}

function loadCarburantPanel() {
  var el = document.getElementById('carburant-panel-body');
  if (!el) return;
  if (!_carburantCache) {
    fetch(window.MAT_API+'/carburant', { cache: 'no-store' })
      .then(function(r){ if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function(d){ if (!d || d.error) throw new Error('payload'); _carburantCache = d; renderCarburantPanel(el, d); })
      .catch(function(){ el.innerHTML = '<p style="color:var(--muted);text-align:center">Données temporairement indisponibles.</p>'; });
  } else {
    renderCarburantPanel(el, _carburantCache);
  }
}

function renderCarburantPanel(el, d) {
  var stations = [
    { key: 'clery',      emoji: '🛒' },
    { key: 'meung',      emoji: '🏪' },
    { key: 'olivet',     emoji: '🏬' },
    { key: 'beaugency',  emoji: '🛒' },
    { key: 'saintpryve', emoji: '🏪' },
  ];
  var html = '<div style="display:flex;flex-direction:column;gap:10px">';
  stations.forEach(function(s) {
    var info = d[s.key];
    if (!info) return;
    var sp  = info.sp95   != null ? '<span style="font-size:.88rem;font-weight:900;color:var(--leaf)">SP95 ' + parseFloat(info.sp95).toFixed(3)   + ' €</span>' : '';
    var go  = info.gazole != null ? '<span style="font-size:.88rem;font-weight:900;color:var(--forest)">Diesel ' + parseFloat(info.gazole).toFixed(3) + ' €</span>' : '';
    var maj = info.maj ? '<div style="font-size:.64rem;color:var(--muted);margin-top:4px">Mis à jour le ' + info.maj + '</div>' : '';
    html += '<div style="background:white;border-radius:14px;padding:14px;border:1px solid var(--border);box-shadow:0 2px 8px rgba(0,0,0,.04)">'
          + '<div style="font-size:.7rem;font-weight:900;text-transform:uppercase;letter-spacing:.07em;color:var(--sage);margin-bottom:8px">' + s.emoji + ' ' + (info.label || s.key) + '</div>'
          + '<div style="display:flex;gap:14px;flex-wrap:wrap">' + [sp, go].filter(Boolean).join('') + '</div>'
          + maj
          + '</div>';
  });
  html += '</div>';
  el.innerHTML = html;
}

// ── Environnement local ────────────────────────────────────
var _envLocalCache = null;
async function loadEnvLocal() {
  try {
    if (_envLocalCache && Date.now() - (_envLocalCache._ts || 0) < 15 * 60000) return;
    var r = await fetch(window.MAT_API+'/env-local', { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    var d = await r.json();
    d._ts = Date.now();

    _envLocalCache = d;
    window._envLocalData = d;
  } catch(e) {
    _envLocalCache = { _ts: Date.now() };
  }
}

// ── Événements locaux ────────────────────────────────────
async function _fetchOAAgendaEvents(key, uid, now) {
  var url = 'https://api.openagenda.com/v2/agendas/' + uid
    + '/events?key=' + encodeURIComponent(key)
    + '&size=10&lang=fr&relative%5B%5D=upcoming&timings%5Bgte%5D=' + encodeURIComponent(now);
  var r = await fetch(url);
  if (!r.ok) return [];
  var d = await r.json();
  return d.events || [];
}

function _renderEventsLocaux(el, events) {
  if (!events.length) {
    el.innerHTML = '<div class="actu-empty">Aucun événement trouvé prochainement.</div>';
    return;
  }
  var html = '<div style="display:flex;flex-direction:column;gap:10px">';
  events.forEach(function(ev) {
    var tag   = ev.url ? 'a' : 'div';
    var attrs = ev.url ? ' href="' + safeHref(ev.url) + '" target="_blank" rel="noopener noreferrer"' : '';
    var cardStyle = 'display:block;background:white;border-radius:14px;padding:12px 14px;border:1px solid var(--border);box-shadow:0 2px 8px rgba(0,0,0,.04);text-decoration:none;color:inherit'
      + (ev.url ? ';cursor:pointer' : '');
    html += '<' + tag + attrs + ' style="' + cardStyle + '">'
          + '<div style="font-size:.62rem;font-weight:900;text-transform:uppercase;letter-spacing:.07em;color:#7c3aed;margin-bottom:4px">📅 ' + esc(ev.date || '') + ' — ' + esc(ev.city || '') + '</div>'
          + '<div style="font-size:.86rem;font-weight:800;color:var(--forest);line-height:1.3">' + esc(ev.title) + '</div>'
          + (ev.place ? '<div style="font-size:.68rem;color:var(--muted);margin-top:2px">📍 ' + esc(ev.place) + '</div>' : '')
          + '</' + tag + '>';
  });
  html += '</div>';
  el.innerHTML = html;

  var preview = document.getElementById('dsk-events-preview');
  if (preview) {
    preview.innerHTML = events.slice(0, 3).map(function(ev) {
      var tag   = ev.url ? 'a' : 'div';
      var attrs = ev.url ? ' href="' + safeHref(ev.url) + '" target="_blank" rel="noopener noreferrer"' : '';
      return '<' + tag + attrs + ' class="d-event-card"' + (ev.url ? ' style="cursor:pointer;text-decoration:none;color:inherit"' : '') + '>'
        + '<div class="d-event-card-date">' + esc(ev.date || '') + '</div>'
        + '<div class="d-event-card-title">' + esc(ev.title) + '</div>'
        + '<div class="d-event-card-place">📍 ' + esc(ev.city || ev.place || '') + '</div>'
        + '</' + tag + '>';
    }).join('');
  }
}

async function loadEventsLocaux() {
  var el = document.getElementById('events-locaux-body');
  if (!el) return;

  var CACHE_KEY = 'mat_evtloc_v2';
  var CACHE_TTL = 30 * 60 * 1000;
  try {
    var cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
    if (cached && Date.now() - cached._ts < CACHE_TTL) { _renderEventsLocaux(el, cached.events); return; }
  } catch(_) {}

  try {
    var r = await fetch(window.MAT_API+'/events-locaux', { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    var d = await r.json();
    if (d.nokey) {
      el.innerHTML = '<div class="actu-empty" style="text-align:center;padding:24px 16px">'
        + '<div style="font-size:2rem;margin-bottom:8px">🎭</div>'
        + '<div style="font-weight:800;color:var(--forest);margin-bottom:6px">Fonctionnalité à configurer</div>'
        + '<div style="font-size:.78rem;color:var(--muted);line-height:1.6">Ajoutez la variable <code>OPENAGENDA_API_KEY</code> dans les paramètres du serveur pour activer l\'affichage des événements locaux.</div>'
        + '</div>';
      return;
    }

    var events;
    if (d.clientSide && d.key && d.agendas) {
      var now = new Date().toISOString();
      var results = await Promise.all(d.agendas.map(function(uid) {
        return _fetchOAAgendaEvents(d.key, uid, now).catch(function(){ return []; });
      }));
      var all = [];
      results.forEach(function(evts, i) {
        var agendaUid = d.agendas[i];
        evts.forEach(function(e) { e._agendaUid = agendaUid; all.push(e); });
      });
      all.sort(function(a, b) {
        var ta = a.nextTiming && a.nextTiming.begin ? new Date(a.nextTiming.begin).getTime() : Infinity;
        var tb = b.nextTiming && b.nextTiming.begin ? new Date(b.nextTiming.begin).getTime() : Infinity;
        return ta - tb;
      });
      // Dédoublonnage strict : titre normalisé + date (les uids diffèrent entre agendas)
      var _seen = {};
      all = all.filter(function(e) {
        var raw = (e.title && (e.title.fr || e.title.en)) || '';
        var titleKey = raw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '').trim();
        var dateKey  = (e.nextTiming && e.nextTiming.begin) ? e.nextTiming.begin.slice(0, 10) : '';
        if (!titleKey || !dateKey) return true;
        var key = titleKey + '|' + dateKey;
        if (_seen[key]) return false;
        _seen[key] = true;
        return true;
      });
      events = all.slice(0, 15).map(function(e) {
        return {
          uid:   e.uid,
          title: (e.title && (e.title.fr || e.title.en)) || '',
          place: (e.location && e.location.name) || '',
          city:  (e.location && e.location.city) || '',
          date:  e.nextTiming && e.nextTiming.begin
                   ? new Date(e.nextTiming.begin).toLocaleDateString('fr-FR', { weekday:'short', day:'numeric', month:'short' })
                   : '',
          url:   (e.originAgenda && e.originAgenda.slug && e.slug)
                   ? 'https://openagenda.com/' + e.originAgenda.slug + '/events/' + e.slug
                   : (e._agendaUid && e.uid)
                     ? 'https://openagenda.com/agendas/' + e._agendaUid + '/events/' + e.uid
                     : (e.links && e.links[0] && e.links[0].link) || null,
          image: (e.image && e.image.base) || null,
        };
      });
    } else {
      events = d.events || [];
    }

    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ events: events, _ts: Date.now() })); } catch(_) {}
    _renderEventsLocaux(el, events);
  } catch(e) {
    if (el) el.innerHTML = '<div class="actu-empty">Impossible de charger les événements.</div>';
  }
}

// ── Prochain événement (header) ──────────────────────────
// Abréviation du mois : même source que le desktop (`fmtShort` de mat-desktop.js).
// Ne PAS revenir à une table codée en dur tronquée à 3 lettres : « août » y devenait
// « aoû » et « juin »/« juillet » y étaient orthographiés à l'anglaise (« jun »/« jul »).
function shortMonth(date){
  return date.toLocaleDateString('fr-FR', { month:'short' }).replace('.','');
}

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
    document.getElementById('next-event-date').textContent=first.start.getDate()+' '+shortMonth(first.start);
    document.getElementById('next-event-name').textContent=first.summary;
    document.getElementById('next-event-days').textContent=diffTxt;
  }catch(e){
    var offline = !navigator.onLine;
    if(!offline && typeof window.matSignalServerError==='function') window.matSignalServerError();
    document.getElementById('next-event-date').textContent = offline?'📡 Hors ligne':'Indisponible';
    document.getElementById('next-event-name').textContent = offline?'Agenda non dispo':'Agenda';
    document.getElementById('next-event-days').textContent = offline?'Reconnectez-vous':'Réessayez plus tard';
  }
}