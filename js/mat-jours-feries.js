/* ════════════════════════════════════════════════════════════
   MAT — Jours fériés & Vacances Zone B v4.0.0
   Données officielles via API education.gouv.fr (Zone B)
   Fallback hardcodé si API indisponible.
   ════════════════════════════════════════════════════════════ */

(function() {
  var style = document.createElement('style');
  style.textContent = [
    '.agenda-month-day.ferie{background:rgba(239,68,68,0.13);color:#b91c1c;font-weight:900;border-radius:6px;position:relative;}',
    '.agenda-month-day.ferie.today{background:rgba(239,68,68,0.23);}',
    '.agenda-month-day.ferie::after{content:"";display:block;width:4px;height:4px;border-radius:50%;background:#ef4444;margin:1px auto 0;}',
    '.agenda-month-day.vacances{background:rgba(234,179,8,0.14);border-radius:6px;position:relative;}',
    '.agenda-month-day.vacances.today{background:rgba(234,179,8,0.28);}',
    '.agenda-month-day.vacances::before{content:"";display:block;width:4px;height:4px;border-radius:50%;background:#ca8a04;margin:0 auto 1px;}',
    '.agenda-month-day.ferie.vacances{background:rgba(239,68,68,0.13);}',
    '.ferie-legend{display:flex;flex-direction:column;gap:3px;font-size:0.7rem;margin:4px 0 10px;padding:6px 8px;background:rgba(0,0,0,0.03);border-radius:8px;}',
    '.ferie-legend-row{display:flex;align-items:center;gap:6px;line-height:1.4;}',
  ].join('');
  document.head.appendChild(style);
})();

// ── Jours fériés ──────────────────────────────────────────
function _getFeriesForYear(year) {
  function easter(y) {
    var a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4;
    var f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3);
    var h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4;
    var l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451);
    var mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1;
    return new Date(y,mo-1,da);
  }
  function add(d,n){var r=new Date(d);r.setDate(r.getDate()+n);return r;}
  var e=easter(year);
  return [
    {d:new Date(year,0,1),   n:'Jour de l\'An'},
    {d:add(e,1),             n:'Lundi de Pâques'},
    {d:new Date(year,4,1),   n:'Fête du Travail'},
    {d:new Date(year,4,8),   n:'Victoire 1945'},
    {d:add(e,39),            n:'Ascension'},
    {d:add(e,50),            n:'Lundi de Pentecôte'},
    {d:new Date(year,6,14),  n:'Fête Nationale'},
    {d:new Date(year,7,15),  n:'Assomption'},
    {d:new Date(year,10,1),  n:'Toussaint'},
    {d:new Date(year,10,11), n:'Armistice'},
    {d:new Date(year,11,25), n:'Noël'},
  ];
}

// ── Vacances Zone B — fallback hardcodé (Zone B = dernier créneau) ──
// Source : Ministère EN — Zone B (Orléans-Tours) part en dernier
// f = premier jour de vacances, t = dernier jour de vacances (veille de la rentrée)
var _VACANCES_FALLBACK = [
  {n:'Toussaint 2024',   f:new Date(2024,9,19),  t:new Date(2024,10,3)},
  {n:'Noël 2024',        f:new Date(2024,11,21), t:new Date(2025,0,5)},
  {n:'Hiver 2025',       f:new Date(2025,1,22),  t:new Date(2025,2,9)},
  {n:'Printemps 2025',   f:new Date(2025,3,19),  t:new Date(2025,4,4)},
  {n:'Été 2025',         f:new Date(2025,6,5),   t:new Date(2025,7,31)},
  {n:'Toussaint 2025',   f:new Date(2025,9,18),  t:new Date(2025,10,2)},
  {n:'Noël 2025',        f:new Date(2025,11,20), t:new Date(2026,0,4)},
  {n:'Hiver 2026',       f:new Date(2026,1,21),  t:new Date(2026,2,8)},
  {n:'Printemps 2026',   f:new Date(2026,3,25),  t:new Date(2026,4,10)},
  {n:'Été 2026',         f:new Date(2026,6,4),   t:new Date(2026,7,31)},
];

var _VACANCES_ZONE_B = _VACANCES_FALLBACK.slice();

// ── Chargement dynamique via API officielle ───────────────
(function _loadVacancesAPI() {
  var CACHE_KEY = 'mat_vacances_zoneB_v4';
  var CACHE_TTL = 7 * 24 * 3600 * 1000; // 7 jours

  function parseAPIData(records) {
    var result = [];
    records.forEach(function(rec) {
      var fields = rec || {};
      var desc = fields.description || fields.Description || '';
      var start = fields.start_date || fields['start date'] || '';
      var end   = fields.end_date   || fields['end date']   || '';
      if (!start || !end) return;
      var sp = start.split('-').map(Number);
      var ep = end.split('-').map(Number);
      if (sp.length < 3 || ep.length < 3) return;
      var f = new Date(sp[0], sp[1]-1, sp[2]);
      // end_date = jour de rentrée → dernier jour vacances = end - 1
      var t = new Date(ep[0], ep[1]-1, ep[2]-1);
      var label = desc.replace('Vacances de la ','').replace('Vacances des ','').replace('Vacances d\'','');
      // Ajouter l'année scolaire
      var as = fields.annee_scolaire || fields['annee scolaire'] || '';
      var year = as ? as.substring(0,4) : sp[0];
      result.push({n: label + ' ' + year, f: f, t: t});
    });
    result.sort(function(a,b){return a.f-b.f;});
    return result;
  }

  try {
    var cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (cached && cached.ts && (Date.now() - cached.ts < CACHE_TTL) && Array.isArray(cached.data) && cached.data.length > 0) {
      _VACANCES_ZONE_B = cached.data.map(function(v){
        return {n:v.n, f:new Date(v.f), t:new Date(v.t)};
      });
      return;
    }
  } catch(e) {}

  var url = 'https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-calendrier-scolaire/records'
    + '?where=location%3D%22Zone%20B%22&order_by=start_date&limit=100&timezone=Europe%2FParis';

  fetch(url)
    .then(function(r){ return r.json(); })
    .then(function(d){
      var records = (d.results || d.records || []).map(function(r){ return r.fields || r; });
      if (!records.length) return;
      var parsed = parseAPIData(records);
      if (parsed.length < 5) return;
      _VACANCES_ZONE_B = parsed;
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          ts: Date.now(),
          data: parsed.map(function(v){return {n:v.n,f:v.f.getTime(),t:v.t.getTime()};})
        }));
      } catch(e) {}
      // Rafraîchir l'overlay si déjà affiché
      if (document.querySelector('#agenda-content .agenda-month-grid')) {
        _applyFeriesOverlay();
      }
    })
    .catch(function(){
      // Silently use fallback
    });
})();

function _getVacanceForDate(d) {
  var t = d.getTime();
  return _VACANCES_ZONE_B.find(function(v) {
    return t >= v.f.getTime() && t <= v.t.getTime();
  }) || null;
}

// ── Application de l'overlay ──────────────────────────────
function _applyFeriesOverlay() {
  var year  = (typeof _agendaYear  !== 'undefined') ? _agendaYear  : new Date().getFullYear();
  var month = (typeof _agendaMonth !== 'undefined') ? _agendaMonth : new Date().getMonth();
  var feries = _getFeriesForYear(year);
  var grid = document.querySelector('#agenda-content .agenda-month-grid');
  if (!grid) return;

  var old = document.getElementById('ferie-legend');
  if (old) old.remove();

  var cells = grid.querySelectorAll('.agenda-month-day');
  var feriesThisMonth = [];
  var vacancesThisMonth = [];

  cells.forEach(function(cell) {
    cell.classList.remove('ferie','vacances');
    var dayNum = parseInt(cell.textContent, 10);
    if (!dayNum || cell.style.visibility === 'hidden') return;
    var cur = new Date(year, month, dayNum);

    var ferie = feries.find(function(f) {
      return f.d.getFullYear()===year && f.d.getMonth()===month && f.d.getDate()===dayNum;
    });
    if (ferie) {
      cell.classList.add('ferie');
      cell.setAttribute('title', ferie.n);
      feriesThisMonth.push(ferie.n);
    }

    var vacance = _getVacanceForDate(cur);
    if (vacance) {
      cell.classList.add('vacances');
      if (!cell.getAttribute('title')) cell.setAttribute('title', 'Vacances ' + vacance.n);
      if (!vacancesThisMonth.includes(vacance.n)) vacancesThisMonth.push(vacance.n);
    }
  });

  if (feriesThisMonth.length || vacancesThisMonth.length) {
    var legend = document.createElement('div');
    legend.id = 'ferie-legend';
    legend.className = 'ferie-legend';
    if (feriesThisMonth.length) {
      var r1 = document.createElement('div');
      r1.className = 'ferie-legend-row';
      r1.innerHTML = '<span style="color:#ef4444">●</span><span style="color:#b91c1c;font-weight:700">Jours fériés&thinsp;: </span><span style="color:#b91c1c">' + feriesThisMonth.join(', ') + '</span>';
      legend.appendChild(r1);
    }
    if (vacancesThisMonth.length) {
      var r2 = document.createElement('div');
      r2.className = 'ferie-legend-row';
      r2.innerHTML = '<span style="color:#ca8a04">●</span><span style="color:#a16207;font-weight:700">Vacances Zone B&thinsp;: </span><span style="color:#a16207">' + vacancesThisMonth.join(', ') + '</span>';
      legend.appendChild(r2);
    }
    grid.insertAdjacentElement('afterend', legend);
  }
}

(function() {
  var _orig = window.renderAgenda;
  window.renderAgenda = function() {
    if (typeof _orig === 'function') _orig.apply(this, arguments);
    _applyFeriesOverlay();
  };
  if (document.querySelector('#agenda-content .agenda-month-grid')) {
    _applyFeriesOverlay();
  }
})();
