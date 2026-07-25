/* ════════════════════════════════════════════════════════════
   MAT — Ambiance v1.0.0
   Header météo vivant + confettis de célébration
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
  _ambRenderParticles(header, fam);
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
    for(i = 0; i < 14; i++){
      s = document.createElement('span');
      s.className = 'amb-flake';
      s.textContent = '❄';
      s.style.left = (Math.random() * 100).toFixed(1) + '%';
      s.style.fontSize = (0.4 + Math.random() * 0.5).toFixed(2) + 'rem';
      s.style.animationDelay = (Math.random() * 8).toFixed(2) + 's';
      s.style.animationDuration = (6 + Math.random() * 6).toFixed(2) + 's';
      layer.appendChild(s);
    }
  } else if(kind === 'fog'){
    s = document.createElement('span'); s.className = 'amb-mist'; layer.appendChild(s);
    s = document.createElement('span'); s.className = 'amb-mist amb-mist2'; layer.appendChild(s);
  }
  header.appendChild(layer);
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
  var ctx = canvas.getContext('2d');
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
