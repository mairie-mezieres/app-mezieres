/* ════════════════════════════════════════════════════════════
   MAT — Eau v3.8.1
   Nappe phréatique (Hub'Eau BRGM) + Restrictions sécheresse
   affichés en bas de l'overlay météo.
   ════════════════════════════════════════════════════════════ */

var _EAU_ALERTE = {
  'vigilance':        { col: '#d97706', icon: '🟡', label: 'Vigilance' },
  'alerte':           { col: '#ea580c', icon: '🟠', label: 'Alerte' },
  'alerte renforcee': { col: '#dc2626', icon: '🔴', label: 'Alerte renforcée' },
  'alerte renforcée': { col: '#dc2626', icon: '🔴', label: 'Alerte renforcée' },
  'crise':            { col: '#7c3aed', icon: '🟣', label: 'Crise' }
};

function _eauFetch(url) {
  return new Promise(function(resolve) {
    var ctrl = new AbortController();
    var t = setTimeout(function() { ctrl.abort(); }, 8000);
    fetch(url, { signal: ctrl.signal })
      .then(function(r) { clearTimeout(t); resolve(r.ok ? r : null); })
      .catch(function() { clearTimeout(t); resolve(null); });
  });
}

async function _loadEauSection() {
  var section = document.getElementById('mat-eau-section');
  if (!section) return;

  var nappeRow = '<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 14px;border-top:1px solid rgba(0,0,0,0.06)">'
    + '<span style="font-size:0.77rem;color:var(--muted)">🌊 Nappe phréatique</span>'
    + '<span style="font-size:0.77rem;color:var(--muted)">—</span></div>';

  var restricRow = '<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 14px;border-top:1px solid rgba(0,0,0,0.06)">'
    + '<span style="font-size:0.77rem;color:var(--muted)">🚰 Restrictions d\'eau</span>'
    + '<span style="font-size:0.77rem;font-weight:700;color:#16a34a">🟢 Aucune en cours</span></div>';

  // Render immediately with defaults
  function render() {
    section.innerHTML = '<div style="margin-top:8px;background:white;border-radius:14px;border:1px solid var(--border)">'
      + '<div style="padding:10px 14px 4px;font-size:0.82rem;font-weight:900;color:var(--forest)">💧 Eau</div>'
      + nappeRow + restricRow + '</div>';
  }
  render();

  // — Nappe phréatique (Hub'Eau BRGM) —
  try {
    var r1 = await _eauFetch(
      'https://hubeau.eaufrance.fr/api/v1/niveaux_nappes/observations_tr' +
      '?code_departement=45&size=1'
    );
    if (r1) {
      var j1 = await r1.json();
      var obs = j1.data && j1.data[0];
      if (obs) {
        var prof = obs.profondeur_nappe != null
          ? parseFloat(obs.profondeur_nappe).toFixed(2) + ' m sous sol'
          : (obs.niveau_nappe_eau != null ? parseFloat(obs.niveau_nappe_eau).toFixed(2) + ' m NGF' : null);
        var lieu = obs.nom_commune || '';
        var dt = (obs.date_mesure || '').slice(0, 10);
        if (prof) {
          nappeRow = '<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 14px;border-top:1px solid rgba(0,0,0,0.06)">'
            + '<span style="font-size:0.77rem;color:var(--muted)">🌊 Nappe phréatique' + (lieu ? ' · ' + lieu : '') + '</span>'
            + '<span style="font-size:0.77rem;font-weight:700" title="' + dt + '">' + prof + '</span></div>';
          render();
        }
      }
    }
  } catch(_) {}

  // — Restrictions sécheresse (VigiEau) —
  try {
    var r2 = await _eauFetch('https://api.vigieau.gouv.fr/communes/45204/restrictions');
    if (r2) {
      var j2 = await r2.json();
      if (Array.isArray(j2) && j2.length > 0) {
        var ordre = ['vigilance', 'alerte', 'alerte renforcee', 'alerte renforcée', 'crise'];
        var maxIdx = -1;
        j2.forEach(function(x) {
          var n = (x.niveauAlerte || '').toLowerCase();
          var i = ordre.indexOf(n);
          if (i > maxIdx) maxIdx = i;
        });
        var aInfo = maxIdx >= 0 ? _EAU_ALERTE[ordre[maxIdx]] : null;
        if (aInfo) {
          restricRow = '<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 14px;border-top:1px solid rgba(0,0,0,0.06)">'
            + '<span style="font-size:0.77rem;color:var(--muted)">🚰 Restrictions d\'eau</span>'
            + '<span style="font-size:0.77rem;font-weight:700;color:' + aInfo.col + '">' + aInfo.icon + ' ' + aInfo.label + '</span></div>';
          render();
        }
      }
    }
  } catch(_) {}
}

// Patch loadMeteoDetail pour ajouter la section eau en bas
(function() {
  var _orig = window.loadMeteoDetail;
  window.loadMeteoDetail = function() {
    if (typeof _orig === 'function') _orig.apply(this, arguments);
    var detail = document.getElementById('meteo-detail');
    if (!detail) return;
    var premium = detail.querySelector('.meteo-premium');
    if (!premium) return;
    // Éviter les doublons si l'overlay est rouvert
    if (document.getElementById('mat-eau-section')) return;
    var section = document.createElement('div');
    section.id = 'mat-eau-section';
    premium.appendChild(section);
    _loadEauSection();
  };
})();
