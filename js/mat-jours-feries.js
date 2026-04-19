/* ════════════════════════════════════════════════════════════
   MAT — Jours fériés v3.7.9
   Marque les jours fériés français dans la grille du calendrier.
   Chargé dynamiquement par mat-init.js.
   ════════════════════════════════════════════════════════════ */

(function() {
  var style = document.createElement('style');
  style.textContent = [
    '.agenda-month-day.ferie{background:rgba(239,68,68,0.12);color:#b91c1c;font-weight:900;border-radius:6px;position:relative;}',
    '.agenda-month-day.ferie.today{background:rgba(239,68,68,0.22);}',
    '.agenda-month-day.ferie::after{content:"";display:block;width:4px;height:4px;border-radius:50%;background:#ef4444;margin:1px auto 0;}',
    '.ferie-legend{display:flex;align-items:center;gap:5px;font-size:0.7rem;color:#b91c1c;margin:4px 0 10px;padding:4px 8px;background:rgba(239,68,68,0.08);border-radius:6px;}',
  ].join('');
  document.head.appendChild(style);
})();

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

function _applyFeriesOverlay() {
  var year  = (typeof _agendaYear  !== 'undefined') ? _agendaYear  : new Date().getFullYear();
  var month = (typeof _agendaMonth !== 'undefined') ? _agendaMonth : new Date().getMonth();
  var feries = _getFeriesForYear(year);
  var grid = document.querySelector('#agenda-content .agenda-month-grid');
  if (!grid) return;

  // Remove stale legend if re-rendering
  var old = document.getElementById('ferie-legend');
  if (old) old.remove();

  var cells = grid.querySelectorAll('.agenda-month-day');
  var feriesThisMonth = [];
  cells.forEach(function(cell) {
    var dayNum = parseInt(cell.textContent, 10);
    if (!dayNum || cell.style.visibility === 'hidden') return;
    var ferie = feries.find(function(f) {
      return f.d.getFullYear()===year && f.d.getMonth()===month && f.d.getDate()===dayNum;
    });
    if (ferie) {
      cell.classList.add('ferie');
      cell.setAttribute('title', ferie.n);
      feriesThisMonth.push(ferie.n);
    }
  });

  if (feriesThisMonth.length) {
    var legend = document.createElement('div');
    legend.id = 'ferie-legend';
    legend.className = 'ferie-legend';
    legend.innerHTML = '🔴 Jours fériés ce mois : ' + feriesThisMonth.join(', ');
    grid.insertAdjacentElement('afterend', legend);
  }
}

// Patch renderAgenda pour appliquer le marquage après chaque rendu
(function() {
  var _orig = window.renderAgenda;
  window.renderAgenda = function() {
    if (typeof _orig === 'function') _orig.apply(this, arguments);
    _applyFeriesOverlay();
  };
  // Appliquer immédiatement si déjà rendu
  if (document.querySelector('#agenda-content .agenda-month-grid')) {
    _applyFeriesOverlay();
  }
})();
