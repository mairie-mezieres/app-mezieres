/* ════════════════════════════════════════════════════════════
   MAT — Carte 3D du village v1.0.0
   Le bourg en relief, avec le zonage du PLU drapé au sol. On touche
   un bâtiment : sa zone et les règles qui s'y appliquent.

   Deux portes d'entrée :
     • page PLUi-H-D  → vue d'ensemble de la commune ;
     • assistante MEL → après détection de zone, centré sur l'adresse
       déjà trouvée par melFindZoneByAddr / melFindZoneByGPS.

   ⚠️ MapLibre GL pèse ~1 Mo. Il n'est JAMAIS chargé au démarrage : le
   module ne va le chercher qu'à la première ouverture de la carte, et
   la bibliothèque n'est pas précachée par le service worker. Voir
   ADR-0018. C'est aussi pourquoi ce module ne s'exécute pas tout seul.

   ⚠️ INSEE de Mézières-lez-Cléry = 45204. 45203 est MEUNG-SUR-LOIRE.
   La maquette a d'abord affiché le zonage du voisin sur la photo
   aérienne de Mézières sans que rien ne le signale : le nom de commune
   renvoyé par le Géoportail est donc affiché à l'écran.

   Copyright (c) 2024-2026 Commune de Mézières-lez-Cléry — Licence MIT
   ════════════════════════════════════════════════════════════ */

var C3D_CENTRE = [1.8080, 47.8220];          // lon, lat — le bourg
var C3D_INSEE  = '45204';
var C3D_BBOX   = { w: 1.762, s: 47.792, e: 1.856, n: 47.852 };

var C3D_LIB    = 'vendor/maplibre/maplibre-gl.js';
var C3D_CSS    = 'vendor/maplibre/maplibre-gl.css';

/* Couleurs des zones du PLU communal (data/plu-data.json). */
var C3D_COULEURS = {
  'Ua':'#c0563f', 'Ub':'#e08a3c', 'Ub1':'#eeb15e', 'Ue':'#8e6bb5', 'Ui':'#7c8a91',
  '1AU':'#e2703a', '2AU':'#b4552b', 'A':'#e8c547', 'Ah':'#d9b44a',
  'N':'#2f9e5f', 'Nh':'#63c187', 'Nj':'#a3d9b1', 'Nl':'#8fcfae'
};
var C3D_DEFAUT = '#9aa5a0';

var _c3dMap = null, _c3dPlu = null, _c3dZones = null, _c3dCommune = '';
var _c3dJournal = [], _c3dDiag = '', _c3dPret = false, _c3dLibPromise = null;
var _c3dMarqueur = null;

function _c3dEsc(s){
  if (typeof esc === 'function') return esc(s == null ? '—' : s);
  return String(s == null ? '—' : s).replace(/[&<>"]/g, function(c){
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c];
  });
}

function _c3dStatut(html, masquer){
  var el = document.getElementById('c3d-statut');
  if (!el) return;
  el.innerHTML = html;
  el.hidden = !!masquer;
}

/* ── Chargement de la bibliothèque, une seule fois ─────────────── */
function _c3dChargerLib(){
  if (window.maplibregl) return Promise.resolve();
  if (_c3dLibPromise) return _c3dLibPromise;
  _c3dLibPromise = new Promise(function(resolve, reject){
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = C3D_CSS;
    document.head.appendChild(l);
    var s = document.createElement('script');
    s.src = C3D_LIB;
    s.onload = function(){ resolve(); };
    s.onerror = function(){ _c3dLibPromise = null; reject(new Error('bibliothèque 3D indisponible')); };
    document.head.appendChild(s);
  });
  return _c3dLibPromise;
}

/* ── Géométrie : point dans polygone, sans dépendance ──────────── */
function _c3dDansAnneau(pt, anneau){
  var x = pt[0], y = pt[1], dedans = false;
  for (var i = 0, j = anneau.length - 1; i < anneau.length; j = i++){
    var xi = anneau[i][0], yi = anneau[i][1], xj = anneau[j][0], yj = anneau[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) dedans = !dedans;
  }
  return dedans;
}
function _c3dDansGeom(pt, geom){
  if (!geom) return false;
  var polys = geom.type === 'Polygon' ? [geom.coordinates]
            : geom.type === 'MultiPolygon' ? geom.coordinates : [];
  for (var p = 0; p < polys.length; p++){
    var anneaux = polys[p];
    if (!anneaux.length || !_c3dDansAnneau(pt, anneaux[0])) continue;
    var trou = false;
    for (var t = 1; t < anneaux.length; t++) if (_c3dDansAnneau(pt, anneaux[t])) { trou = true; break; }
    if (!trou) return true;
  }
  return false;
}
/* Les zones sont ajoutées de la plus grande à la plus petite : on parcourt
   à l'envers pour que la plus précise l'emporte sous un point donné. */
function _c3dZoneSous(pt){
  if (!_c3dZones) return '';
  for (var i = _c3dZones.features.length - 1; i >= 0; i--){
    if (_c3dDansGeom(pt, _c3dZones.features[i].geometry)) return _c3dZones.features[i].properties.mat_code;
  }
  return '';
}

/* ── Règles du PLU : le fichier déjà embarqué dans l'application ── */
function _c3dChargerRegles(){
  if (_c3dPlu) return Promise.resolve();
  return fetch('data/plu-data.json')
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(j){ _c3dPlu = j; })
    .catch(function(){ _c3dPlu = null; });
}

/* ── Zonage : Géoportail de l'Urbanisme via apicarto ─────────────
   ⚠️ `zone-urba` n'accepte PAS de paramètre `insee` : il attend une
   partition (`DU_45204`) ou une géométrie. La première version passait
   `insee`, la requête échouait, et le catch avalait l'erreur en silence
   — ni zonage, ni légende, ni message. On procède en trois temps et on
   retient le motif d'échec de chaque étape. */
var C3D_GPU = 'https://apicarto.ign.fr/api/gpu/';

function _c3dNoter(nom, ok, detail, n){
  _c3dJournal.push({ nom:nom, ok:!!ok, detail:detail || '', n:n || 0 });
}

/* Un serveur OGC renvoie ses erreurs en XML : sans lire ce corps, on perd
   la seule phrase qui explique le refus. */
function _c3dLireErreur(r){
  return r.text().then(function(t){
    var m = t.match(/<(?:ows:)?ExceptionText[^>]*>([\s\S]*?)<\//i);
    return 'HTTP ' + r.status + (m ? ' — ' + m[1].trim().slice(0, 160) : '');
  }).catch(function(){ return 'HTTP ' + r.status; });
}
function _c3dJson(url){
  return fetch(url).then(function(r){
    if (!r.ok) return _c3dLireErreur(r).then(function(d){ throw new Error(d); });
    return r.json();
  });
}

function _c3dPartition(){
  return _c3dJson(C3D_GPU + 'municipality?insee=' + C3D_INSEE)
    .then(function(fc){
      var p = fc && fc.features && fc.features[0] && fc.features[0].properties;
      if (!p) { _c3dDiag = 'commune absente du Géoportail de l\'Urbanisme'; return null; }
      _c3dCommune = p.name || p.nom || p.commune || p.libelle || '';
      if (p.is_rnu === true || p.is_rnu === 'true'){
        _c3dDiag = 'commune au RNU — pas de document d\'urbanisme opposable';
        return null;
      }
      return p.partition || null;
    })
    .catch(function(e){ _c3dDiag = 'appel « municipality » : ' + e.message; return null; });
}
function _c3dZonesUrba(partition){
  if (partition) return _c3dJson(C3D_GPU + 'zone-urba?partition=' + encodeURIComponent(partition));
  var geom = { type:'Polygon', coordinates:[[
    [C3D_BBOX.w, C3D_BBOX.s], [C3D_BBOX.e, C3D_BBOX.s], [C3D_BBOX.e, C3D_BBOX.n],
    [C3D_BBOX.w, C3D_BBOX.n], [C3D_BBOX.w, C3D_BBOX.s]
  ]]};
  return _c3dJson(C3D_GPU + 'zone-urba?geom=' + encodeURIComponent(JSON.stringify(geom)));
}
function _c3dChargerZones(){
  return _c3dPartition()
    .then(function(partition){
      return _c3dZonesUrba(partition).catch(function(e){
        if (!partition) throw e;
        return _c3dZonesUrba(null);        // une partition qui échoue a droit à une seconde chance
      });
    })
    .then(function(fc){
      if (!fc || !fc.features || !fc.features.length){
        _c3dDiag = _c3dDiag || 'aucune zone renvoyée pour cette commune';
        throw new Error(_c3dDiag);
      }
      fc.features.forEach(function(f){
        var p = f.properties || {};
        f.properties.mat_code = _c3dNormZone(p.libelle || p.typezone || '');
      });
      _c3dZones = fc; _c3dDiag = '';
      _c3dNoter('Géoportail de l\'Urbanisme', true, _c3dCommune || ('INSEE ' + C3D_INSEE), fc.features.length);
      return true;
    })
    .catch(function(e){
      _c3dZones = null;
      _c3dDiag = _c3dDiag || (e && e.message) || 'raison inconnue';
      _c3dNoter('Géoportail de l\'Urbanisme', false, _c3dDiag);
      return false;
    });
}

/* Le libellé du Géoportail (« UA », « Ub1 », « 1AUb »…) doit retomber sur
   une des zones décrites dans data/plu-data.json. Du plus précis au plus
   général, sinon on garde le libellé tel quel pour l'affichage. */
function _c3dNormZone(lib){
  if (!lib) return '';
  var v = String(lib).trim();
  var cles = _c3dPlu && _c3dPlu.zones ? Object.keys(_c3dPlu.zones) : Object.keys(C3D_COULEURS);
  cles.sort(function(a,b){ return b.length - a.length; });
  for (var i = 0; i < cles.length; i++) if (v.toLowerCase() === cles[i].toLowerCase()) return cles[i];
  for (var k = 0; k < cles.length; k++) if (v.toLowerCase().indexOf(cles[k].toLowerCase()) === 0) return cles[k];
  return v;
}

/* ── Bâti : BD TOPO IGN (hauteurs réelles), repli OpenStreetMap ───
   Trois formulations de la requête, de la plus sûre à la plus ancienne.
   CRS:84 impose l'ordre longitude,latitude sans ambiguïté ; WFS 2.0 avec
   EPSG:4326 impose l'ordre inverse — d'où la bascule du BBOX. */
function _c3dBatiIGN(){
  var base = 'https://data.geopf.fr/wfs/ows?SERVICE=WFS&REQUEST=GetFeature&outputFormat=application/json';
  var essais = [
    ['BD TOPO (CRS:84)',
      base + '&VERSION=2.0.0&TYPENAMES=BDTOPO_V3:batiment&SRSNAME=CRS:84&count=6000'
           + '&BBOX=' + [C3D_BBOX.w, C3D_BBOX.s, C3D_BBOX.e, C3D_BBOX.n].join(',') + ',CRS:84'],
    ['BD TOPO (EPSG:4326)',
      base + '&VERSION=2.0.0&TYPENAMES=BDTOPO_V3:batiment&SRSNAME=EPSG:4326&count=6000'
           + '&BBOX=' + [C3D_BBOX.s, C3D_BBOX.w, C3D_BBOX.n, C3D_BBOX.e].join(',') + ',EPSG:4326'],
    ['BD TOPO (WFS 1.1)',
      base + '&VERSION=1.1.0&TYPENAME=BDTOPO_V3:batiment&SRSNAME=EPSG:4326&maxFeatures=6000'
           + '&BBOX=' + [C3D_BBOX.s, C3D_BBOX.w, C3D_BBOX.n, C3D_BBOX.e].join(',')]
  ];
  var chaine = Promise.reject(new Error('init'));
  essais.forEach(function(e){
    chaine = chaine.catch(function(){
      return _c3dJson(e[1]).then(function(fc){
        if (!fc || !fc.features || !fc.features.length) throw new Error('réponse vide');
        _c3dNoter(e[0], true, 'ok', fc.features.length);
        return fc;
      }).catch(function(err){ _c3dNoter(e[0], false, err.message); throw err; });
    });
  });
  return chaine.then(function(fc){
    fc.features.forEach(function(f){
      var p = f.properties || {};
      var h = parseFloat(p.hauteur);
      if (!isFinite(h) || h <= 0){
        var et = parseFloat(p.nombre_d_etages != null ? p.nombre_d_etages : p.nombre_etages);
        h = isFinite(et) && et > 0 ? (et * 2.8 + 1.2) : 6;
      }
      f.properties.mat_h = Math.max(2.5, Math.min(h, 40));
      f.properties.mat_src = 'IGN';
    });
    return fc;
  });
}
function _c3dBatiOSM(){
  var q = '[out:json][timeout:25];(way["building"]('
        + [C3D_BBOX.s, C3D_BBOX.w, C3D_BBOX.n, C3D_BBOX.e].join(',') + '););out geom;';
  return fetch('https://overpass-api.de/api/interpreter', {
    method:'POST', body:'data=' + encodeURIComponent(q),
    headers:{ 'Content-Type':'application/x-www-form-urlencoded' }
  })
  .then(function(r){ if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
  .then(function(j){
    var feats = (j.elements || []).filter(function(e){ return e.geometry && e.geometry.length > 3; })
      .map(function(e){
        var t = e.tags || {};
        var h = parseFloat(t.height);
        if (!isFinite(h) || h <= 0){
          var n = parseFloat(t['building:levels']);
          h = isFinite(n) && n > 0 ? (n * 2.8 + 1.2) : 6;
        }
        return { type:'Feature',
          properties:{ mat_h: Math.max(2.5, Math.min(h, 40)), mat_src:'OSM' },
          geometry:{ type:'Polygon', coordinates:[ e.geometry.map(function(g){ return [g.lon, g.lat]; }) ] } };
      });
    if (!feats.length) throw new Error('réponse vide');
    _c3dNoter('OpenStreetMap', true, 'ok', feats.length);
    return { type:'FeatureCollection', features:feats };
  })
  .catch(function(e){ _c3dNoter('OpenStreetMap', false, e.message); throw e; });
}

/* Contrôle de position : le bourg est à lon ≈ 1,81 / lat ≈ 47,82. Hors de
   cette fenêtre, ce sont soit des axes inversés, soit une projection non
   convertie. ⚠️ Aucun bâti de remplacement n'est inventé ici : dessiner de
   fausses maisons sur une vraie photo ne dégrade pas l'affichage, il le
   rend faux. Voir ADR-0018. */
function _c3dAudit(fc){
  var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  function pt(c){
    if (typeof c[0] === 'number'){
      minX = Math.min(minX, c[0]); maxX = Math.max(maxX, c[0]);
      minY = Math.min(minY, c[1]); maxY = Math.max(maxY, c[1]);
    } else { c.forEach(pt); }
  }
  fc.features.forEach(function(f){ if (f.geometry) pt(f.geometry.coordinates); });
  var a = { minX:minX, maxX:maxX, minY:minY, maxY:maxY, souci:'' };
  if (Math.abs(maxX) > 180 || Math.abs(maxY) > 90) a.souci = 'projection non convertie';
  else if (minX > 40 && maxY < 10) a.souci = 'axes inversés';
  else if (maxX < C3D_BBOX.w - 0.05 || minX > C3D_BBOX.e + 0.05 ||
           maxY < C3D_BBOX.s - 0.05 || minY > C3D_BBOX.n + 0.05) a.souci = 'emprise hors commune';
  return a;
}
function _c3dInverser(fc){
  function inv(c){ return typeof c[0] === 'number' ? [c[1], c[0]] : c.map(inv); }
  fc.features.forEach(function(f){ if (f.geometry) f.geometry.coordinates = inv(f.geometry.coordinates); });
  return fc;
}

/* ── Construction de la carte ──────────────────────────────────── */
function _c3dCreerCarte(){
  var ortho = 'https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile'
            + '&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM'
            + '&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/jpeg';
  var plan  = 'https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile'
            + '&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM'
            + '&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png';

  _c3dMap = new maplibregl.Map({
    container: 'c3d-map',
    center: C3D_CENTRE, zoom: 15.0, pitch: 62, bearing: -18, maxPitch: 80,
    attributionControl: { compact: true },
    style: {
      version: 8,
      sources: {
        ortho: { type:'raster', tiles:[ortho], tileSize:256, maxzoom:19, attribution:'© IGN — Géoplateforme' },
        plan:  { type:'raster', tiles:[plan],  tileSize:256, maxzoom:19, attribution:'© IGN' }
      },
      layers: [
        { id:'fond', type:'background', paint:{ 'background-color':'#cfe3d6' } },
        { id:'l-plan',  type:'raster', source:'plan', layout:{ visibility:'none' } },
        { id:'l-ortho', type:'raster', source:'ortho' }
      ]
    }
  });
  _c3dMap.addControl(new maplibregl.NavigationControl({ visualizePitch:true }), 'top-right');
  _c3dMap.touchZoomRotate.enableRotation();
  return _c3dMap;
}

/* Ciel et lumière rasante : sans eux, le fond coupe net à l'horizon et les
   volumes s'aplatissent. Conditionnels — une version plus ancienne de
   MapLibre les ignore au lieu de casser la page.
   ⚠️ `fill-extrusion-ambient-occlusion-*` appartient à Mapbox GL et NON à
   MapLibre : ces propriétés ne font rien et polluent la console. */
function _c3dAmbiance(){
  if (_c3dMap.setSky) _c3dMap.setSky({
    'sky-color':'#8fb8dd', 'horizon-color':'#e8eef2', 'fog-color':'#eef2f0',
    'sky-horizon-blend':0.6, 'horizon-fog-blend':0.5, 'fog-ground-blend':0.15
  });
  if (_c3dMap.setLight) _c3dMap.setLight({
    anchor:'map', position:[1.4, 215, 42], color:'#fff6e8', intensity:0.42
  });
}

function _c3dPoserZones(){
  if (!_c3dZones || _c3dMap.getSource('zones')) return;
  _c3dMap.addSource('zones', { type:'geojson', data:_c3dZones });
  var couleur = ['match', ['get','mat_code']];
  Object.keys(C3D_COULEURS).forEach(function(k){ couleur.push(k, C3D_COULEURS[k]); });
  couleur.push(C3D_DEFAUT);
  /* `beforeId` reste facultatif : le bâti peut ne jamais arriver, et
     MapLibre lèverait « layer does not exist ». */
  var sous = _c3dMap.getLayer('bati') ? 'bati' : undefined;
  _c3dMap.addLayer({ id:'zones-fill', type:'fill', source:'zones',
    paint:{ 'fill-color':couleur, 'fill-opacity':0.36 } }, sous);
  _c3dMap.addLayer({ id:'zones-line', type:'line', source:'zones',
    paint:{ 'line-color':couleur, 'line-width':1.6, 'line-opacity':0.9 } }, sous);
}

function _c3dPoserBati(fc){
  if (_c3dMap.getSource('bati')) return;
  _c3dMap.addSource('bati', { type:'geojson', data:fc });
  _c3dMap.addLayer({
    id:'bati', type:'fill-extrusion', source:'bati',
    paint:{
      /* Parti pris : la maquette d'architecte. Un bâti crème qui se détache
         du zonage coloré au sol au lieu de rivaliser avec lui. */
      'fill-extrusion-color':['interpolate',['linear'],['get','mat_h'],
        3,'#fbf7f0', 8,'#f2e9db', 14,'#e6d8c4', 25,'#d6c3a8'],
      'fill-extrusion-height':['get','mat_h'],
      'fill-extrusion-base':0,
      'fill-extrusion-opacity':1,
      'fill-extrusion-vertical-gradient':true
    }
  });
  /* Liseré au sol : sans lui, les maisons mitoyennes fondent en un bloc. */
  _c3dMap.addLayer({ id:'bati-contour', type:'line', source:'bati',
    paint:{ 'line-color':'#6b5a45', 'line-width':0.6, 'line-opacity':0.35 } });
}

function _c3dPoserLegende(){
  var ul = document.getElementById('c3d-legende-liste');
  if (!ul) return;
  var vues = {};
  if (_c3dZones) _c3dZones.features.forEach(function(f){ vues[f.properties.mat_code] = true; });
  var cles = Object.keys(C3D_COULEURS).filter(function(k){ return !_c3dZones || vues[k]; });
  if (!cles.length) cles = Object.keys(C3D_COULEURS);
  ul.innerHTML = cles.map(function(k){
    var lib = _c3dPlu && _c3dPlu.zones && _c3dPlu.zones[k]
            ? (_c3dPlu.zones[k].label.split('–')[1] || '').trim() : '';
    return '<li><i style="background:' + C3D_COULEURS[k] + '"></i><span>' + _c3dEsc(k)
         + (lib ? ' <span>' + _c3dEsc(lib) + '</span>' : '') + '</span></li>';
  }).join('');
  var l = document.getElementById('c3d-legende');
  if (l) l.hidden = !_c3dZones;
}

/* ── Fiche « ce que vous avez le droit de construire » ──────────── */
function _c3dClasseAuth(a){
  var s = String(a || '');
  if (/aucune formalit/i.test(s)) return 'ok';
  if (/permis de construire/i.test(s)) return 'pc';
  return 'dp';
}
function _c3dAbrege(a){
  var s = String(a || '');
  if (/aucune formalit/i.test(s)) return 'Rien à faire';
  if (/permis de construire/i.test(s)) return 'Permis';
  if (/d[ée]claration/i.test(s)) return 'Déclaration';
  return s.length > 22 ? s.slice(0, 21) + '…' : s;
}
function _c3dEtiquette(k){
  return { abri:'Abri de jardin', piscine:'Piscine', cloture:'Clôture',
           extension:'Extension', panneaux_solaires:'Panneaux solaires' }[k] || k;
}

function _c3dOuvrirFiche(code, h, src){
  var z = _c3dPlu && _c3dPlu.zones ? _c3dPlu.zones[code] : null;
  document.getElementById('c3d-fiche-zone').textContent = code || '?';
  document.getElementById('c3d-fiche-titre').textContent =
    z ? (z.label.split('–').slice(1).join('–').trim()) : 'Zone non déterminée';
  document.getElementById('c3d-fiche-sous').textContent =
    'Bâtiment de ' + h.toFixed(1) + ' m · hauteur ' + (src === 'IGN' ? 'BD TOPO IGN' : 'OpenStreetMap');

  var out = '';
  if (z){
    out += '<dl class="c3d-kv">'
        +  '<dt>Emprise au sol</dt><dd>' + _c3dEsc(z.emprise) + '</dd>'
        +  '<dt>Hauteur maximale</dt><dd>' + _c3dEsc(z.hauteur_principale) + '</dd>'
        +  '<dt>Recul sur voie</dt><dd>' + _c3dEsc(z.recul_voie_principale) + '</dd>'
        +  '<dt>Clôtures</dt><dd>' + _c3dEsc(z.cloture_voie) + '</dd></dl>';
    if (z.description) out += '<div class="c3d-note">' + _c3dEsc(z.description) + '</div>';
  } else {
    out += '<div class="c3d-note">Le zonage n\'a pas pu être déterminé pour ce point. '
        +  'Les règles ci-dessous sont celles du PLU communal, toutes zones confondues.</div>';
  }
  if (_c3dPlu && _c3dPlu.autorisations){
    ['abri','piscine','cloture','extension','panneaux_solaires'].forEach(function(k){
      var a = _c3dPlu.autorisations[k];
      if (!a || !a.tableau) return;
      out += '<div class="c3d-sec">' + _c3dEsc(a.label || _c3dEtiquette(k)) + '</div><div class="c3d-rows">';
      a.tableau.forEach(function(l){
        out += '<div class="c3d-row"><span class="c">' + _c3dEsc(l.cas) + '</span>'
            +  '<span class="a ' + _c3dClasseAuth(l.auth) + '">' + _c3dEsc(_c3dAbrege(l.auth)) + '</span></div>';
      });
      out += '</div>';
      if (a.note) out += '<div class="c3d-note">' + _c3dEsc(a.note) + '</div>';
    });
  }
  out += '<div class="c3d-note"><strong>Information, pas autorisation.</strong> '
      +  'Seul le service urbanisme de la mairie fait foi. En cas de doute, posez la question à MEL '
      +  'ou contactez la mairie.</div>';

  document.getElementById('c3d-fiche-corps').innerHTML = out;
  document.getElementById('c3d-fiche').classList.add('on');
}

function _c3dFermerFiche(){
  var f = document.getElementById('c3d-fiche');
  if (f) f.classList.remove('on');
}

/* ── Panneau « détail des sources » ────────────────────────────── */
function _c3dOuvrirDiag(){
  document.getElementById('c3d-fiche-zone').textContent = '🔎';
  document.getElementById('c3d-fiche-titre').textContent = 'Détail des sources';
  document.getElementById('c3d-fiche-sous').textContent = 'Ce que chaque service a répondu';
  var out = '<div class="c3d-rows">';
  if (!_c3dJournal.length) out += '<div class="c3d-row"><span class="c">Aucune source interrogée</span></div>';
  _c3dJournal.forEach(function(e){
    out += '<div class="c3d-row"><span class="c">' + _c3dEsc(e.nom)
        +  '<br><span class="d">' + _c3dEsc(e.detail) + '</span></span>'
        +  '<span class="a ' + (e.ok ? 'ok' : 'pc') + '">'
        +  (e.ok ? e.n + ' éléments' : 'échec') + '</span></div>';
  });
  out += '</div>';
  out += '<div class="c3d-note">Données : orthophoto et BD TOPO de l\'IGN, zonage du Géoportail '
      +  'de l\'Urbanisme, règles du PLU communal. Rien n\'est envoyé : votre position n\'est '
      +  'transmise à personne.</div>';
  document.getElementById('c3d-fiche-corps').innerHTML = out;
  document.getElementById('c3d-fiche').classList.add('on');
}

/* ── Interactions ──────────────────────────────────────────────── */
function _c3dBrancher(){
  _c3dMap.on('click', function(e){
    if (!_c3dMap.getLayer('bati')) return;
    var f = _c3dMap.queryRenderedFeatures(e.point, { layers:['bati'] })[0];
    if (!f) return;
    _c3dOuvrirFiche(_c3dZoneSous([e.lngLat.lng, e.lngLat.lat]),
                    Number(f.properties.mat_h) || 6, f.properties.mat_src);
  });
  _c3dMap.on('mouseenter', 'bati', function(){ _c3dMap.getCanvas().style.cursor = 'pointer'; });
  _c3dMap.on('mouseleave', 'bati', function(){ _c3dMap.getCanvas().style.cursor = ''; });

  function bascule(id, fn){
    var b = document.getElementById(id);
    if (!b) return;
    b.onclick = function(){
      var on = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(on));
      fn(on);
    };
  }
  bascule('c3d-btn-zones', function(on){
    ['zones-fill','zones-line'].forEach(function(l){
      if (_c3dMap.getLayer(l)) _c3dMap.setLayoutProperty(l, 'visibility', on ? 'visible' : 'none');
    });
    var lg = document.getElementById('c3d-legende');
    if (lg) lg.hidden = !(on && _c3dZones);
  });
  bascule('c3d-btn-bati', function(on){
    ['bati','bati-contour'].forEach(function(l){
      if (_c3dMap.getLayer(l)) _c3dMap.setLayoutProperty(l, 'visibility', on ? 'visible' : 'none');
    });
  });
  bascule('c3d-btn-fond', function(on){
    _c3dMap.setLayoutProperty('l-ortho', 'visibility', on ? 'visible' : 'none');
    _c3dMap.setLayoutProperty('l-plan',  'visibility', on ? 'none' : 'visible');
    var t = document.querySelector('#c3d-btn-fond span');
    if (t) t.textContent = on ? 'Vue aérienne' : 'Plan';
  });
  var d = document.getElementById('c3d-btn-diag');
  if (d) d.onclick = _c3dOuvrirDiag;
  var x = document.getElementById('c3d-fiche-fermer');
  if (x) x.onclick = _c3dFermerFiche;
}

/* Travelling d'arrivée : ce qui fait comprendre en une seconde qu'on est en
   trois dimensions. Interrompu au premier geste, supprimé si « Réduire les
   animations » est actif — la règle vaut ici comme partout dans l'app. */
function _c3dSurvol(){
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var stop = function(){ _c3dMap.stop(); };
  _c3dMap.once('mousedown', stop); _c3dMap.once('touchstart', stop); _c3dMap.once('wheel', stop);
  _c3dMap.easeTo({ bearing:_c3dMap.getBearing() + 26, pitch:66, zoom:_c3dMap.getZoom() + 0.45,
                   duration:5200, easing:function(t){ return t * (2 - t); } });
}

/* ── Chargement des données, une seule fois par session ─────────── */
function _c3dCharger(){
  if (_c3dPret) return Promise.resolve();
  _c3dStatut('Chargement des données de l\'IGN…');
  return _c3dChargerRegles()
    .then(_c3dChargerZones)
    .then(function(okZones){
      return _c3dBatiIGN()
        .catch(function(){ return _c3dBatiOSM(); })
        .catch(function(){ return null; })
        .then(function(fc){
          _c3dPoserZones();
          _c3dPoserLegende();
          var btnDiag = document.getElementById('c3d-btn-diag');
          if (btnDiag) btnDiag.hidden = false;
          if (!fc){
            _c3dStatut('<b>Aucun bâtiment chargé</b> — l\'IGN n\'a pas répondu.'
              + (okZones ? ' Le zonage du PLU et la photo aérienne, eux, sont là.' : '')
              + '<br>Touchez « 🔎 Détail » pour savoir pourquoi.');
            _c3dPret = true;
            return;
          }
          var a = _c3dAudit(fc);
          if (a.souci === 'axes inversés') _c3dInverser(fc);
          _c3dPoserBati(fc);
          _c3dSurvol();
          if (a.souci){
            _c3dStatut(fc.features.length + ' bâtiments — <b>position douteuse</b> : ' + _c3dEsc(a.souci));
          } else if (okZones){
            _c3dStatut(fc.features.length + ' bâtiments · ' + _c3dZones.features.length
              + ' zones du PLU de <b>' + _c3dEsc(_c3dCommune || 'la commune') + '</b>');
            setTimeout(function(){ _c3dStatut('', true); }, 6000);
          } else {
            _c3dStatut(fc.features.length + ' bâtiments — <b>zonage du PLU indisponible</b><br>'
              + _c3dEsc(_c3dDiag));
          }
          _c3dPret = true;
        });
    })
    .catch(function(e){
      _c3dStatut('⚠️ Impossible de charger la carte : ' + _c3dEsc(e && e.message));
    });
}

/* ── API publique ──────────────────────────────────────────────────
   matOuvrirCarte3D()                      → vue d'ensemble (page PLUi)
   matOuvrirCarte3D({lat, lon, zone})      → centré sur une adresse (MEL) */
window.matOuvrirCarte3D = function(opts){
  opts = opts || {};
  if (typeof trackStat === 'function'){ try { trackStat('carte3d'); } catch(_){} }
  openOv('carte3d');
  _c3dFermerFiche();

  var cible = (isFinite(opts.lat) && isFinite(opts.lon)) ? [Number(opts.lon), Number(opts.lat)] : null;

  _c3dChargerLib().then(function(){
    if (!_c3dMap){
      _c3dCreerCarte();
      _c3dMap.on('load', function(){
        _c3dAmbiance();
        _c3dBrancher();
        _c3dCharger().then(function(){ if (cible) _c3dViser(cible, opts.zone); });
      });
    } else {
      /* L'overlay était masqué : MapLibre a mesuré une taille nulle. */
      _c3dMap.resize();
      if (cible) _c3dViser(cible, opts.zone);
    }
  }).catch(function(e){
    _c3dStatut('⚠️ ' + _c3dEsc(e.message) + ' — réessayez avec une connexion.');
  });
};

/* Centrage sur une adresse déjà trouvée par MEL : on ne refait pas la
   recherche, on réutilise les coordonnées qu'elle a obtenues. */
function _c3dViser(lngLat, zone){
  if (!_c3dMap) return;
  var anim = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  _c3dMap[anim ? 'flyTo' : 'jumpTo']({ center:lngLat, zoom:17.4, pitch:62, duration:2200 });
  if (_c3dMarqueur) _c3dMarqueur.remove();
  var el = document.createElement('div');
  el.className = 'c3d-pin';
  el.setAttribute('aria-hidden', 'true');
  _c3dMarqueur = new maplibregl.Marker({ element:el }).setLngLat(lngLat).addTo(_c3dMap);
  var z = zone || _c3dZoneSous(lngLat);
  if (z) _c3dStatut('📍 Votre adresse — zone <b>' + _c3dEsc(z) + '</b>');
}
