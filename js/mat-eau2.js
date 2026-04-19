/* MAT — Eau v3.8.3 */
function _eauFetch(url) {
  return new Promise(function(resolve) {
    var c = new AbortController();
    var t = setTimeout(function() { c.abort(); }, 8000);
    fetch(url, { signal: c.signal })
      .then(function(r) { clearTimeout(t); resolve(r.ok ? r : null); })
      .catch(function() { clearTimeout(t); resolve(null); });
  });
}
async function _loadEauSection() {
  var s = document.getElementById('mat-eau-section');
  if (!s) return;
  var nappe = '—';
  var restric = '🟢 Aucune restriction';
  var restricColor = '#16a34a';
  function render() {
    s.innerHTML = '<div style="margin-top:10px;border-radius:14px;border:1px solid #e2e8f0;overflow:hidden;background:#fff">'
      + '<div style="padding:9px 14px;font-size:0.82rem;font-weight:900;color:#1a3d2b;border-bottom:1px solid #f1f5f9">💧 Eau</div>'
      + '<div style="display:flex;justify-content:space-between;padding:8px 14px;font-size:0.77rem"><span style="color:#64748b">🌊 Nappe phréatique</span><span style="font-weight:700">' + nappe + '</span></div>'
      + '<div style="display:flex;justify-content:space-between;padding:8px 14px;font-size:0.77rem;border-top:1px solid #f1f5f9"><span style="color:#64748b">🚰 Restrictions</span><span style="font-weight:700;color:' + restricColor + '">' + restric + '</span></div>'
      + '</div>';
  }
  render();
  try {
    var urls = [
      'https://hubeau.eaufrance.fr/api/v1/niveaux_nappes/observations_tr?code_departement=45&size=1',
      'https://hubeau.eaufrance.fr/api/v1/niveaux_nappes/observations?code_departement=45&size=1&sort=desc'
    ];
    for (var i = 0; i < urls.length; i++) {
      var r1 = await _eauFetch(urls[i]);
      if (!r1) continue;
      var d1 = await r1.json();
      var obs = d1.data && d1.data[0];
      if (!obs) continue;
      var prof = obs.profondeur_nappe != null ? parseFloat(obs.profondeur_nappe).toFixed(2) + ' m/sol'
               : obs.niveau_nappe_eau  != null ? parseFloat(obs.niveau_nappe_eau).toFixed(2) + ' m NGF'
               : null;
      if (prof) { nappe = prof + (obs.nom_commune ? ' (' + obs.nom_commune + ')' : ''); render(); break; }
    }
  } catch(_) {}
  try {
    var r2 = await _eauFetch('https://api.vigieau.gouv.fr/communes/45204/restrictions');
    if (r2) {
      var d2 = await r2.json();
      if (Array.isArray(d2) && d2.length > 0) {
        var niveaux = d2.map(function(x) { return (x.niveauAlerte || '').toLowerCase(); });
        if (niveaux.indexOf('crise') >= 0)            { restric = '🟣 Crise';             restricColor = '#7c3aed'; }
        else if (niveaux.some(function(n){ return n.indexOf('renforcee') >= 0 || n.indexOf('renforcée') >= 0; })) { restric = '🔴 Alerte renforcée'; restricColor = '#dc2626'; }
        else if (niveaux.indexOf('alerte') >= 0)      { restric = '🟠 Alerte';            restricColor = '#ea580c'; }
        else if (niveaux.indexOf('vigilance') >= 0)   { restric = '🟡 Vigilance';         restricColor = '#d97706'; }
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
