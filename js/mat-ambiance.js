/* ════════════════════════════════════════════════════════════
   MAT — Ambiance v1.1.0
   Header météo vivant + calendrier festif + confettis
   Copyright (c) 2024-2026 Commune de Mézières-lez-Cléry — Licence MIT
   ════════════════════════════════════════════════════════════ */

// ── Header météo vivant ──────────────────────────────────────
// Reflète la météo réelle de la commune (window._meteoData, alimenté par
// loadMeteo dans mat-widgets.js) dans le bandeau d'accueil : pluie, neige,
// orage ou brouillard en CSS pur, et teinte du dégradé selon le moment de
// la journée (aube, crépuscule, nuit — bornes lever/coucher Open-Meteo).
// Si l'utilisateur a activé « Réduire les animations », seule la teinte
// statique est appliquée — aucune particule.

function _ambReducedMotion(){
  try{ return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(_){ return false; }
}

// Familles visuelles à partir des codes météo WMO d'Open-Meteo
function _ambWeatherFamily(code){
  if(code == null) return '';
  var c = Number(code);
  if(c >= 95) return 'storm';
  if((c >= 71 && c <= 77) || c === 85 || c === 86) return 'snow';
  if((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) return 'rain';
  if(c === 45 || c === 48) return 'fog';
  return '';
}

// Moment de la journée : ±40 min autour du lever/coucher = aube/crépuscule
function _ambDayPhase(daily){
  var sr = Date.parse((daily.sunrise || [])[0] || '');
  var ss = Date.parse((daily.sunset || [])[0] || '');
  if(isNaN(sr) || isNaN(ss)) return '';
  var now = Date.now(), M = 40 * 60000;
  if(Math.abs(now - sr) <= M) return 'dawn';
  if(Math.abs(now - ss) <= M) return 'dusk';
  if(now < sr || now > ss) return 'night';
  return '';
}

// Calendrier festif : périodes de l'année où le header se décore quand la
// météo est calme — la météo réelle (pluie/neige/orage/brouillard) garde
// TOUJOURS la priorité sur les particules festives.
// Pâques s'appuie sur _getFeriesForYear (mat-jours-feries.js, chargé au boot
// par mat-boot.js) ; si le script n'est pas encore là, la période est
// simplement ignorée jusqu'à la prochaine ré-évaluation (10 min).
function _ambFestive(now){
  var m = now.getMonth() + 1, d = now.getDate();
  try{
    if(typeof _getFeriesForYear === 'function'){
      var lundi = _getFeriesForYear(now.getFullYear()).find(function(f){ return f.n === 'Lundi de Pâques'; });
      if(lundi){
        var diff = (new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(lundi.d.getFullYear(), lundi.d.getMonth(), lundi.d.getDate())) / 86400000;
        if(diff >= -2 && diff <= 0) return 'paques'; // samedi → lundi de Pâques
      }
    }
  }catch(_){}
  if(m === 12 && d <= 30) return 'noel';
  if((m === 12 && d === 31) || (m === 1 && d <= 2)) return 'nouvelan';
  if((m === 3 && d >= 20) || m === 4) return 'printemps';   // pétales
  if(m === 7 && (d === 13 || d === 14)) return 'juillet14';
  if(m === 10 && d >= 29) return 'halloween';               // avant l'automne
  if(m === 10 || (m === 11 && d <= 20)) return 'automne';   // feuilles mortes
  return '';
}

var _AMB_CLASSES = ['amb-rain','amb-snow','amb-storm','amb-fog','amb-dawn','amb-dusk','amb-night'];

function matHeaderAmbiance(){
  var header = document.querySelector('.header');
  if(!header) return;
  var forecast = (window._meteoData || {}).forecast || {};
  var fam = _ambWeatherFamily((forecast.current || {}).weather_code);
  var phase = _ambDayPhase(forecast.daily || {});
  _AMB_CLASSES.forEach(function(c){ header.classList.remove(c); });
  if(fam) header.classList.add('amb-' + fam);
  if(phase) header.classList.add('amb-' + phase);
  _ambRenderParticles(header, fam || _ambFestive(new Date()));
}

function _ambRenderParticles(header, fam){
  // Teinte seule si l'utilisateur préfère réduire les animations
  var kind = _ambReducedMotion() ? '' : fam;
  var layer = header.querySelector(':scope > .header-amb');
  if(layer && layer.dataset.kind === kind) return; // déjà en place, ne pas reconstruire
  if(layer) layer.remove();
  if(!kind) return;

  layer = document.createElement('div');
  layer.className = 'header-amb';
  layer.dataset.kind = kind;
  layer.setAttribute('aria-hidden', 'true');
  var i, s;
  if(kind === 'rain' || kind === 'storm'){
    var n = kind === 'storm' ? 26 : 20;
    for(i = 0; i < n; i++){
      s = document.createElement('span');
      s.className = 'amb-drop';
      s.style.left = (Math.random() * 100).toFixed(1) + '%';
      s.style.animationDelay = (Math.random() * 1.2).toFixed(2) + 's';
      s.style.animationDuration = (0.7 + Math.random() * 0.6).toFixed(2) + 's';
      layer.appendChild(s);
    }
    if(kind === 'storm'){
      s = document.createElement('span');
      s.className = 'amb-flash';
      layer.appendChild(s);
    }
  } else if(kind === 'snow'){
    _ambFall(layer, '❄', 14, 6, 12, 0.4, 0.9);
  } else if(kind === 'fog'){
    s = document.createElement('span'); s.className = 'amb-mist'; layer.appendChild(s);
    s = document.createElement('span'); s.className = 'amb-mist amb-mist2'; layer.appendChild(s);
  } else if(kind === 'noel'){
    _ambGuirlande(layer);
    _ambFall(layer, '❄', 8, 9, 15, 0.4, 0.7);
  } else if(kind === 'nouvelan'){
    _ambFall(layer, '✨', 12, 7, 12, 0.4, 0.7);
  } else if(kind === 'printemps'){
    _ambFall(layer, '🌸', 10, 8, 14, 0.5, 0.8);
  } else if(kind === 'paques'){
    _ambEggs(layer);
  } else if(kind === 'juillet14'){
    _ambTricolore(layer);
  } else if(kind === 'automne'){
    _ambFall(layer, '🍂', 10, 8, 14, 0.5, 0.9);
  } else if(kind === 'halloween'){
    _ambBats(layer);
    _ambFall(layer, '🍂', 6, 9, 14, 0.5, 0.8);
  }
  header.appendChild(layer);
}

// Chute avec balancement (réutilise les keyframes ambSnow) : flocons,
// pétales, feuilles, étincelles…
function _ambFall(layer, char, count, minDur, maxDur, minSize, maxSize){
  for(var i = 0; i < count; i++){
    var s = document.createElement('span');
    s.className = 'amb-flake';
    s.textContent = char;
    s.style.left = (Math.random() * 100).toFixed(1) + '%';
    s.style.fontSize = (minSize + Math.random() * (maxSize - minSize)).toFixed(2) + 'rem';
    s.style.animationDelay = '-' + (Math.random() * maxDur).toFixed(2) + 's';
    s.style.animationDuration = (minDur + Math.random() * (maxDur - minDur)).toFixed(2) + 's';
    layer.appendChild(s);
  }
}

// Guirlande lumineuse le long du bord supérieur (Noël)
var _AMB_GUIRLANDE_COLORS = ['#f87171','#fbbf24','#34d399','#60a5fa','#f472b6'];
function _ambGuirlande(layer){
  for(var i = 0; i < 14; i++){
    var s = document.createElement('span');
    s.className = 'amb-guirlande';
    s.style.left = (2 + i * 7).toFixed(1) + '%';
    s.style.background = _AMB_GUIRLANDE_COLORS[i % _AMB_GUIRLANDE_COLORS.length];
    s.style.animationDelay = (Math.random() * 2).toFixed(2) + 's';
    layer.appendChild(s);
  }
}

// Confettis bleu-blanc-rouge (14 Juillet)
var _AMB_TRICOLORE = ['#0055A4','#ffffff','#EF4135'];
function _ambTricolore(layer){
  for(var i = 0; i < 18; i++){
    var s = document.createElement('span');
    s.className = 'amb-conf';
    s.style.left = (Math.random() * 100).toFixed(1) + '%';
    s.style.background = _AMB_TRICOLORE[i % 3];
    s.style.animationDelay = '-' + (Math.random() * 6).toFixed(2) + 's';
    s.style.animationDuration = (5 + Math.random() * 4).toFixed(2) + 's';
    layer.appendChild(s);
  }
}

// Petits œufs pastel (week-end de Pâques)
var _AMB_EGG_COLORS = ['#fbcfe8','#bfdbfe','#fde68a','#bbf7d0','#ddd6fe'];
function _ambEggs(layer){
  for(var i = 0; i < 10; i++){
    var s = document.createElement('span');
    s.className = 'amb-egg';
    s.style.left = (Math.random() * 100).toFixed(1) + '%';
    s.style.background = _AMB_EGG_COLORS[i % _AMB_EGG_COLORS.length];
    s.style.animationDelay = '-' + (Math.random() * 8).toFixed(2) + 's';
    s.style.animationDuration = (7 + Math.random() * 5).toFixed(2) + 's';
    layer.appendChild(s);
  }
}

// Chauves-souris qui traversent le header (Halloween)
function _ambBats(layer){
  for(var i = 0; i < 4; i++){
    var s = document.createElement('span');
    s.className = 'amb-bat';
    s.textContent = '🦇';
    s.style.top = (8 + Math.random() * 45).toFixed(1) + '%';
    s.style.fontSize = (0.6 + Math.random() * 0.5).toFixed(2) + 'rem';
    s.style.animationDelay = '-' + (Math.random() * 9).toFixed(2) + 's';
    s.style.animationDuration = (8 + Math.random() * 6).toFixed(2) + 's';
    layer.appendChild(s);
  }
}

(function(){
  var apply = function(){ try{ matHeaderAmbiance(); }catch(_){} };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  else apply();
  // Re-évalue la phase du jour (aube → jour → crépuscule → nuit) sans appel réseau
  setInterval(apply, 10 * 60000);
})();

// ── Confettis de célébration ─────────────────────────────────
// Petit canvas éphémère (~1,8 s, aucune dépendance) déclenché à la
// soumission réussie d'une idée, d'un signalement, d'une demande ou d'un
// bug — pour récompenser l'engagement citoyen. Jamais si « Réduire les
// animations » est actif.

var _matCelebrating = false;
function matCelebrate(){
  if(_matCelebrating || _ambReducedMotion() || document.hidden) return;
  _matCelebrating = true;
  try{ if(navigator.vibrate) navigator.vibrate(25); }catch(_){}

  var canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999';
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = window.innerWidth, H = window.innerHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  document.body.appendChild(canvas);
  // getContext peut renvoyer null (mémoire, trop de contextes) : sans ce
  // garde, le canvas restait orphelin dans le DOM et _matCelebrating bloqué
  // à true — plus aucun confetti jusqu'au rechargement de l'app.
  var ctx = canvas.getContext('2d');
  if(!ctx){ canvas.remove(); _matCelebrating = false; return; }
  ctx.scale(dpr, dpr);

  var COLORS = ['#2e7d4f','#5cb85c','#a7f3d0','#f5c542','#fff7e6','#7cc4f5'];
  var parts = [];
  for(var i = 0; i < 90; i++){
    parts.push({
      x: W / 2 + (Math.random() - 0.5) * W * 0.3,
      y: H * 0.78,
      vx: (Math.random() - 0.5) * 11,
      vy: -(7 + Math.random() * 8),
      size: 4 + Math.random() * 5,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      color: COLORS[i % COLORS.length],
      round: Math.random() < 0.4
    });
  }

  var DUR = 1800, start = null;
  function frame(ts){
    if(start === null) start = ts;
    var t = ts - start;
    if(t >= DUR){
      canvas.remove();
      _matCelebrating = false;
      return;
    }
    ctx.clearRect(0, 0, W, H);
    var alpha = t < DUR - 500 ? 1 : (DUR - t) / 500;
    ctx.globalAlpha = Math.max(0, alpha);
    for(var j = 0; j < parts.length; j++){
      var p = parts[j];
      p.vy += 0.25; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if(p.round){ ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, 6.3); ctx.fill(); }
      else ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
