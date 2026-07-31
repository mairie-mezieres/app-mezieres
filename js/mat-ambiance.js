/* ════════════════════════════════════════════════════════════
   MAT — Ambiance v1.6.0
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
  if(c === 3) return 'overcast';  // couvert : nuages + teinte grisée
  if(c === 2) return 'cloudy';    // partiellement nuageux : quelques nuages
  return '';
}

// Moment de la journée : ±40 min autour du lever/coucher = aube/crépuscule.
// Renvoie 'dawn' | 'dusk' | 'night' | 'day', ou '' si indéterminé.
//
// ⚠️ DEUX PIÈGES, tous deux à l'origine du bug corrigé en v4.47.1 (ADR-0007) :
//  1. `daily[0]` est **HIER** (le backend demande `past_days=1`) — lire l'indice 0
//     comparait l'heure courante au coucher de la veille, donc `now > coucher`
//     était vrai en permanence : phase « nuit » 24 h/24, aube/crépuscule et
//     soleil jamais déclenchés.
//  2. Open-Meteo renvoie des heures locales sans fuseau (« 2026-07-29T06:32 ») ;
//     `Date.parse` les interprète dans le fuseau du téléphone. On compare donc
//     des minutes-depuis-minuit calculées à Paris, des deux côtés.
// '' (indéterminé) est volontairement distinct de 'day' : sans donnée fiable,
// on n'affiche ni soleil ni étoiles plutôt que de risquer le mauvais effet.
function _ambDayPhase(daily){
  if(typeof meteoTodayIndex !== 'function' || typeof meteoParisNowMinutes !== 'function') return '';
  var idx = meteoTodayIndex(daily);
  if(idx < 0) return '';
  var sr = meteoIsoToMinutes((daily.sunrise || [])[idx]);
  var ss = meteoIsoToMinutes((daily.sunset || [])[idx]);
  if(sr == null || ss == null || ss <= sr) return '';
  var now = meteoParisNowMinutes(), M = 40;
  if(Math.abs(now - sr) <= M) return 'dawn';
  if(Math.abs(now - ss) <= M) return 'dusk';
  if(now < sr || now > ss) return 'night';
  return 'day';
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

// Ciel dégagé (codes WMO 0-1) : reflet de soleil en plein jour, étoiles
// scintillantes dès la tombée du jour.
function _ambClearSky(code, phase){
  var c = Number(code);
  if(c !== 0 && c !== 1) return '';
  if(phase === 'night') return 'stars';
  // Aube et crépuscule : les premières (ou dernières) étoiles, en retrait.
  // Sans cela, le bandeau restait vide ~80 min autour du coucher — soit l'heure
  // où l'app est le plus consultée, et le plus beau moment du ciel.
  if(phase === 'dusk' || phase === 'dawn') return 'stars-dim';
  if(phase === 'day') return 'sun';
  return ''; // phase indéterminée : ni soleil ni étoiles
}

// Décors festifs compatibles avec la nuit — fêtes du soir ou effets lumineux :
// ils se SUPERPOSENT aux étoiles. Les autres (nature diurne : pétales, feuilles,
// œufs) leur cèdent la place, car des feuilles qui tombent à 19 h en décembre,
// dans le noir, n'évoquent rien.
var _AMB_FEST_NOCTURNES = ['noel', 'nouvelan', 'juillet14', 'halloween'];

// Compose la liste des effets à peindre, par ordre de superposition.
function _ambCompose(fam, fest, clear, phase){
  if(fam) return [fam];                      // météo active : elle seule (pas d'étoiles sous les nuages)
  var sombre = (phase === 'night' || phase === 'dusk' || phase === 'dawn');
  if(fest){
    if(!sombre) return [fest];               // en journée, le décor festif prime sur le soleil
    if(_AMB_FEST_NOCTURNES.indexOf(fest) >= 0) return [clear, fest].filter(Boolean);
    return [clear || fest];                  // décor diurne la nuit → étoiles à la place
  }
  return [clear].filter(Boolean);
}

var _AMB_CLASSES = ['amb-rain','amb-snow','amb-storm','amb-fog','amb-cloudy','amb-overcast','amb-dawn','amb-dusk','amb-night','amb-sunny'];

// Aperçu (mairie) : quand il est actif, il se substitue à la météo et au
// moment réels. Volontairement EN MÉMOIRE SEULEMENT — jamais de localStorage
// ni de paramètre d'URL : un rechargement rend toujours l'ambiance réelle, et
// aucun habitant ne peut tomber dessus par accident. Voir matAmbianceApercu().
var _ambSim = null; // { code, phase, date } ou null

function matHeaderAmbiance(){
  var header = document.querySelector('.header');
  if(!header) return;
  var forecast = (window._meteoData || {}).forecast || {};
  var code = _ambSim ? _ambSim.code : (forecast.current || {}).weather_code;
  var fam = _ambWeatherFamily(code);
  var phase = _ambSim ? _ambSim.phase : _ambDayPhase(forecast.daily || {});
  var clear = _ambClearSky(code, phase);
  _AMB_CLASSES.forEach(function(c){ header.classList.remove(c); });
  if(fam) header.classList.add('amb-' + fam);
  // 'day' n'a pas de teinte propre (c'est le dégradé par défaut) et '' signifie
  // « indéterminé » : seules aube/crépuscule/nuit posent une classe.
  if(phase === 'dawn' || phase === 'dusk' || phase === 'night') header.classList.add('amb-' + phase);
  if(clear === 'sun') header.classList.add('amb-sunny');
  _ambRenderParticles(header, _ambCompose(fam, _ambFestive(_ambSim ? _ambSim.date : new Date()), clear, phase));
}

// `kinds` : liste d'effets superposés (ex. ['stars','noel']). `dataset.kind`
// porte leur clé jointe — c'est aussi l'identité utilisée pour ne pas
// reconstruire la couche à chaque ré-évaluation.
function _ambRenderParticles(header, kinds){
  if(typeof kinds === 'string') kinds = [kinds];
  kinds = (_ambReducedMotion() ? [] : (kinds || [])).filter(Boolean);
  var key = kinds.join('+');
  var layer = header.querySelector(':scope > .header-amb');
  if(layer && layer.dataset.kind === key) return; // déjà en place, ne pas reconstruire
  if(layer) layer.remove();
  if(!key) return;

  layer = document.createElement('div');
  layer.className = 'header-amb';
  layer.dataset.kind = key;
  layer.setAttribute('aria-hidden', 'true');
  kinds.forEach(function(k){ _ambPaint(layer, k); });
  header.appendChild(layer);
}

function _ambPaint(layer, kind){
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
  } else if(kind === 'cloudy'){
    _ambClouds(layer, 3);
  } else if(kind === 'overcast'){
    _ambClouds(layer, 5);
  } else if(kind === 'sun'){
    layer.appendChild(_ambFlare());
  } else if(kind === 'stars'){
    _ambStars(layer, 13, 1);
  } else if(kind === 'stars-dim'){
    _ambStars(layer, 6, 0.5);
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

// Nuages qui dérivent (partiellement nuageux / couvert). Traversée en
// ~25-45 s : le mouvement doit être perceptible pendant les quelques
// secondes qu'un habitant passe sur l'accueil.
function _ambClouds(layer, count){
  for(var i = 0; i < count; i++){
    var s = document.createElement('span');
    s.className = 'amb-cloud';
    var dur = 25 + Math.random() * 20;
    s.style.top = (4 + Math.random() * 50).toFixed(1) + '%';
    s.style.width = (140 + Math.random() * 130).toFixed(0) + 'px';
    s.style.height = (36 + Math.random() * 30).toFixed(0) + 'px';
    s.style.animationDuration = dur.toFixed(1) + 's';
    s.style.animationDelay = '-' + (Math.random() * dur).toFixed(1) + 's';
    layer.appendChild(s);
  }
}

// Reflet d'objectif par ciel dégagé : une étoile lumineuse aux branches
// inégales, suivie de cercles irisés (« fantômes ») alignés sur l'axe du
// reflet. La source est volontairement placée en HAUT À GAUCHE : au centre
// droit elle voilait l'illustration MAT & MEL.
function _ambFlare(){
  var wrap = document.createElement('span');
  wrap.className = 'amb-sun';

  var core = document.createElement('span');
  core.className = 'amb-sun-core';
  // [angle°, longueur px, opacité] — longueurs inégales : un reflet réel n'a
  // pas de branches régulières (c'est ce qui faisait « roue » auparavant).
  [[0, 400, 0.70], [62, 230, 0.40], [118, 170, 0.28], [28, 130, 0.20]].forEach(function(r){
    var ray = document.createElement('span');
    ray.className = 'amb-flare-ray';
    ray.style.width = r[1] + 'px';
    ray.style.opacity = r[2];
    ray.style.transform = 'translate(-50%,-50%) rotate(' + r[0] + 'deg)';
    core.appendChild(ray);
  });
  wrap.appendChild(core);

  // Fantômes le long de l'axe, vers le bas-droite : [gauche%, haut%, ø px, opacité]
  [[30, 31, 28, 0.18], [41, 45, 16, 0.14], [52, 58, 36, 0.11], [63, 72, 20, 0.16], [74, 85, 26, 0.10]]
    .forEach(function(g, i){
      var ghost = document.createElement('span');
      ghost.className = 'amb-flare-ghost';
      ghost.style.left = g[0] + '%';
      ghost.style.top = g[1] + '%';
      ghost.style.width = g[2] + 'px';
      ghost.style.height = g[2] + 'px';
      ghost.style.opacity = g[3];
      ghost.style.animationDelay = '-' + (i * 1.9).toFixed(1) + 's';
      wrap.appendChild(ghost);
    });

  return wrap;
}

// Étoiles scintillantes par ciel dégagé (réutilise les keyframes ambTwinkle).
// `eclat` < 1 pour les premières étoiles du crépuscule / les dernières de l'aube.
function _ambStars(layer, nombre, eclat){
  nombre = nombre || 13;
  eclat = eclat == null ? 1 : eclat;
  for(var i = 0; i < nombre; i++){
    var s = document.createElement('span');
    s.className = 'amb-star';
    s.textContent = '✦';
    s.style.left = (2 + Math.random() * 96).toFixed(1) + '%';
    s.style.top = (3 + Math.random() * 55).toFixed(1) + '%';
    s.style.fontSize = ((0.3 + Math.random() * 0.4) * (eclat < 1 ? 0.85 : 1)).toFixed(2) + 'rem';
    s.style.opacity = eclat;
    s.style.animationDelay = '-' + (Math.random() * 3).toFixed(2) + 's';
    s.style.animationDuration = (1.6 + Math.random() * 2.4).toFixed(2) + 's';
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

/* ── Aperçu des ambiances (usage mairie) ─────────────────────
   Permet de visualiser toutes les combinaisons météo × moment × saison sans
   attendre la vraie météo, et SANS jamais perturber les habitants :
     • déclencheur caché — appui long (900 ms) sur le titre de l'écran
       ♿ Personnalisation. Aucun bouton visible, rien dans l'URL ;
     • l'état vit en mémoire seulement : tout rechargement revient au réel ;
     • un bandeau « APERÇU » reste affiché tant que la simulation est active,
       pour ne jamais confondre avec la réalité ;
     • le panneau n'est construit qu'à l'ouverture — il n'existe donc pas dans
       le DOM des habitants (ni pour les audits d'accessibilité).
   ──────────────────────────────────────────────────────────── */

var _AMB_APERCU_METEO = [
  ['Ciel dégagé', 0], ['Partiellement nuageux', 2], ['Couvert', 3],
  ['Brouillard', 45], ['Pluie', 61], ['Averses', 80], ['Orage', 95], ['Neige', 73]
];
var _AMB_APERCU_MOMENT = [
  ['Plein jour', 'day'], ['Aube', 'dawn'], ['Crépuscule', 'dusk'], ['Nuit', 'night']
];
// Dates choisies pour tomber dans chaque période de _ambFestive()
var _AMB_APERCU_SAISON = [
  ['Aucune (période réelle)', ''], ['Noël', '2026-12-15'], ['Nouvel An', '2026-12-31'],
  ['Printemps', '2026-04-10'], ['14 Juillet', '2026-07-14'],
  ['Halloween', '2026-10-30'], ['Automne', '2026-11-10']
];

function _ambSelect(id, label, options){
  var opts = options.map(function(o){
    return '<option value="' + o[1] + '">' + o[0] + '</option>';
  }).join('');
  return '<label style="display:block;margin-bottom:10px;font-size:.75rem;font-weight:800;color:#1a3d2b">'
    + label
    + '<select id="' + id + '" style="display:block;width:100%;margin-top:4px;padding:9px 10px;border:1.5px solid #cfe0d4;'
    + 'border-radius:10px;font-family:inherit;font-size:.85rem;background:#fff;color:#1a3d2b">'
    + opts + '</select></label>';
}

function matAmbianceApercu(){
  if(document.getElementById('amb-apercu')) return;
  var box = document.createElement('div');
  box.id = 'amb-apercu';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', 'Aperçu des ambiances');
  box.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:99998;'
    + 'width:min(340px,92vw);background:#fff;border-radius:16px;padding:16px;'
    + 'box-shadow:0 12px 40px rgba(0,0,0,.35);font-family:Nunito,sans-serif';
  box.innerHTML =
      '<div style="font-size:.9rem;font-weight:900;color:#1a3d2b;margin-bottom:12px">🎨 Aperçu des ambiances</div>'
    + _ambSelect('amb-ap-meteo',  'Météo',  _AMB_APERCU_METEO)
    + _ambSelect('amb-ap-moment', 'Moment', _AMB_APERCU_MOMENT)
    + _ambSelect('amb-ap-saison', 'Saison / fête', _AMB_APERCU_SAISON)
    + '<div style="display:flex;gap:8px;margin-top:6px">'
    + '<button type="button" id="amb-ap-stop" style="flex:1;padding:11px;border:1.5px solid #cfe0d4;background:#fff;'
    + 'color:#1a3d2b;border-radius:10px;font-family:inherit;font-weight:800;font-size:.82rem;cursor:pointer">Revenir au réel</button>'
    + '<button type="button" id="amb-ap-close" style="flex:1;padding:11px;border:none;background:linear-gradient(135deg,#1a3d2b,#2d6a4f);'
    + 'color:#fff;border-radius:10px;font-family:inherit;font-weight:800;font-size:.82rem;cursor:pointer">Fermer</button>'
    + '</div>';
  document.body.appendChild(box);

  var appliquer = function(){
    var saison = document.getElementById('amb-ap-saison').value;
    _ambSim = {
      code: Number(document.getElementById('amb-ap-meteo').value),
      phase: document.getElementById('amb-ap-moment').value,
      date: saison ? new Date(saison + 'T12:00:00') : new Date()
    };
    _ambApercuBandeau(true);
    matHeaderAmbiance();
  };
  ['amb-ap-meteo','amb-ap-moment','amb-ap-saison'].forEach(function(id){
    document.getElementById(id).addEventListener('change', appliquer);
  });
  document.getElementById('amb-ap-stop').addEventListener('click', matAmbianceApercuStop);
  document.getElementById('amb-ap-close').addEventListener('click', function(){ box.remove(); });
  appliquer();
}

function matAmbianceApercuStop(){
  _ambSim = null;
  _ambApercuBandeau(false);
  matHeaderAmbiance();
}

function _ambApercuBandeau(actif){
  var b = document.getElementById('amb-apercu-bandeau');
  if(!actif){ if(b) b.remove(); return; }
  if(!b){
    b = document.createElement('div');
    b.id = 'amb-apercu-bandeau';
    b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;padding:7px 14px;background:#b45309;'
      + 'color:#fff;font-family:Nunito,sans-serif;font-size:.72rem;font-weight:800;text-align:center;'
      + 'box-shadow:0 2px 10px rgba(0,0,0,.25)';
    b.textContent = '🎨 APERÇU — ambiance simulée, non réelle';
    document.body.prepend(b);
  }
}

// Déclencheur caché : appui long sur le titre de l'écran Personnalisation.
// Délégué sur document car l'overlay est hydraté à la première ouverture.
(function(){
  var timer = null;
  var annule = function(){ if(timer){ clearTimeout(timer); timer = null; } };
  document.addEventListener('pointerdown', function(e){
    var t = e.target.closest && e.target.closest('#ov-accessibilite .panel-title');
    if(!t) return;
    annule();
    timer = setTimeout(function(){ timer = null; try{ matAmbianceApercu(); }catch(_){} }, 900);
  }, true);
  ['pointerup','pointercancel','pointermove','scroll'].forEach(function(ev){
    document.addEventListener(ev, annule, true);
  });
})();
