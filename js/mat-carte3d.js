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
/* Contour de la commune, renvoyé par l'appel `municipality`. Sert à ne
   compter et à ne draper QUE ce qui est à Mézières : l'emprise interrogée
   fait 7 km sur 6,7 km et déborde largement sur Cléry, Mareau et Dry. */
var _c3dContour = null;

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
/* Centre approximatif d'une géométrie : moyenne des sommets de l'anneau
   extérieur. Suffisant pour dire « cet objet appartient à la commune » —
   on ne cherche pas un centroïde exact. */
function _c3dCentroide(geom){
  if (!geom) return [0, 0];
  var anneau = geom.type === 'Polygon' ? geom.coordinates[0]
             : geom.type === 'MultiPolygon' ? geom.coordinates[0][0] : null;
  if (!anneau || !anneau.length) return [0, 0];
  var x = 0, y = 0;
  for (var i = 0; i < anneau.length; i++){ x += anneau[i][0]; y += anneau[i][1]; }
  return [x / anneau.length, y / anneau.length];
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

function _c3dNoter(nom, ok, detail, n, retenu){
  _c3dJournal.push({ nom:nom, ok:!!ok, detail:detail || '', n:n || 0,
                     retenu: retenu == null ? null : retenu });
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
      var g = fc.features[0].geometry;
      if (g && (g.type === 'Polygon' || g.type === 'MultiPolygon')) _c3dContour = g;
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
      var recus = fc.features.length;
      /* ⚠️ Le repli par géométrie interroge la BBOX, pas la commune : il
         ramène le zonage de Cléry, Mareau et Dry. Draper le PLU du voisin
         sur Mézières, c'est la même faute que l'INSEE 45203 — on découpe. */
      if (_c3dContour){
        var dedans = fc.features.filter(function(f){
          return _c3dDansGeom(_c3dCentroide(f.geometry), _c3dContour);
        });
        if (dedans.length) fc = { type:'FeatureCollection', features:dedans };
      }
      _c3dZones = fc; _c3dDiag = '';
      _c3dNoter('Géoportail de l\'Urbanisme', true, _c3dCommune || ('INSEE ' + C3D_INSEE),
                recus, fc.features.length);
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

/* ── Types de bâtiments ──────────────────────────────────────────
   La BD TOPO porte `nature` et `usage_1`, que la première version jetait.
   C'est la VARIÉTÉ qui fait qu'un village paraît vrai — bien plus que la
   finesse de chaque volume. Sans elle, l'église, un hangar et une maison
   sont trois prismes identiques.

   ⚠️ Les libellés exacts de la BD TOPO ne sont pas vérifiables depuis
   l'environnement de développement (data.geopf.fr y est bloqué). On
   classe donc par FRAGMENTS, en minuscules et sans accents, avec repli sur
   `habitat` — et toute valeur non reconnue est relevée dans `_c3dInconnus`
   puis affichée dans le panneau de diagnostic, pour affiner sur pièce. */
var _c3dInconnus = {};

function _c3dSansAccent(s){
  return String(s || '').toLowerCase()
    .normalize ? String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
               : String(s || '').toLowerCase();
}

/* Hauteur du toit, en mètres, du haut des murs au faîtage.
   ⚠️ Ce n'est pas une donnée : la BD TOPO ignore tout des toitures. Ces
   valeurs sont des ordres de grandeur de bâti rural — voir RG-17.15. */
var C3D_TOITS = { culte:5.5, remarquable:4.5, habitat:2.6, agricole:1.8, industriel:0.6, annexe:1.0 };

function _c3dTypeBati(p){
  var n = _c3dSansAccent(p.nature);
  var u = _c3dSansAccent(p.usage_1 || p.usage);

  /* 1. La nature architecturale l'emporte toujours : une église reste une
     église quel que soit son « usage » déclaré. */
  if (/eglise|chapelle|cathedrale|cultuel/.test(n))                  return 'culte';
  if (/chateau|tour|donjon|monument|moulin|arc de triomphe/.test(n)) return 'remarquable';
  if (/serre|silo|etable|hangar/.test(n))                            return 'agricole';

  /* 2. ⚠️ `nature` vaut très souvent « Industriel, agricole ou commercial » :
     un fourre-tout qui contient les TROIS mots à la fois. S'y fier ferait
     passer une usine pour une ferme. On lit donc `usage_1`, plus précis, et
     on ne retombe sur `nature` que s'il est muet. */
  var fourreTout = /industriel.*agricole.*commercial/.test(n);
  var t = u || (fourreTout ? '' : n);

  if (/religieux/.test(t))                       return 'culte';
  if (/agricole/.test(t))                        return 'agricole';
  if (/industriel|commercial|sportif/.test(t))   return 'industriel';
  if (/annexe|legere|abri/.test(t) || p.legere === true || p.legere === 'true') return 'annexe';
  if (/residentiel|habitation|indifferenci/.test(t)) return 'habitat';

  /* 3. Fourre-tout sans usage : ce n'est pas de l'habitat, mais on ne sait pas
     quoi. Dans une commune rurale, l'hypothèse la plus probable est agricole —
     et le rendu (murs nus, toit bac acier) reste sobre si l'on se trompe. */
  if (!t.trim()) return fourreTout ? 'agricole' : 'habitat';

  /* 4. Valeur présente mais non reconnue : relevée pour le diagnostic. */
  var brut = (p.usage_1 || p.nature || '').toString().trim();
  if (brut) _c3dInconnus[brut] = (_c3dInconnus[brut] || 0) + 1;
  return 'habitat';
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
    /* Le journal a noté le nombre reçu ; on lui ajoutera le nombre retenu
       une fois le marquage communal fait. */
    fc.features.forEach(function(f){
      var p = f.properties || {};
      var h = parseFloat(p.hauteur);
      if (!isFinite(h) || h <= 0){
        var et = parseFloat(p.nombre_d_etages != null ? p.nombre_d_etages : p.nombre_etages);
        h = isFinite(et) && et > 0 ? (et * 2.8 + 1.2) : 6;
      }
      f.properties.mat_h = Math.max(2.5, Math.min(h, 40));
      f.properties.mat_src = 'IGN';
      var type = _c3dTypeBati(p);
      f.properties.mat_type = type;
      f.properties.mat_toit = C3D_TOITS[type] || 1.2;
    });
    return _c3dMarquerCommune(fc);
  });
}

/* Les bâtiments des communes voisines restent affichés — sans eux, le
   village flotterait dans le vide et on ne verrait plus son insertion dans
   le territoire. Mais ils sont MARQUÉS : estompés à l'écran, et surtout
   exclus du décompte. Annoncer « 4 382 bâtiments de Mézières-lez-Cléry »
   quand l'emprise couvre quatre communes est faux. */
function _c3dMarquerCommune(fc){
  fc.mat_nCommune = 0;
  var derniere = _c3dJournal.length ? _c3dJournal[_c3dJournal.length - 1] : null;
  fc.features.forEach(function(f){
    var dedans = _c3dContour ? _c3dDansGeom(_c3dCentroide(f.geometry), _c3dContour) : true;
    f.properties.mat_dans = dedans ? 1 : 0;
    if (dedans) fc.mat_nCommune++;
  });
  if (derniere && derniere.ok) derniere.retenu = fc.mat_nCommune;
  return fc;
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
        /* OpenStreetMap n'a ni `nature` ni `usage_1`, mais son tag
           `building` porte la même information sous d'autres mots. */
        var b = _c3dSansAccent(t.building);
        var type = /church|chapel|cathedral|mosque|synagogue/.test(b) ? 'culte'
                 : /castle|tower|monument|windmill/.test(b)           ? 'remarquable'
                 : /barn|farm|greenhouse|silo|stable|cowshed/.test(b) ? 'agricole'
                 : /industrial|warehouse|commercial|retail|sports/.test(b) ? 'industriel'
                 : /garage|shed|carport|hut|roof/.test(b)             ? 'annexe'
                 : 'habitat';
        return { type:'Feature',
          properties:{ mat_h: Math.max(2.5, Math.min(h, 40)), mat_src:'OSM',
                       mat_type: type, mat_toit: C3D_TOITS[type] || 1.2 },
          geometry:{ type:'Polygon', coordinates:[ e.geometry.map(function(g){ return [g.lon, g.lat]; }) ] } };
      });
    if (!feats.length) throw new Error('réponse vide');
    _c3dNoter('OpenStreetMap', true, 'ok', feats.length);
    return _c3dMarquerCommune({ type:'FeatureCollection', features:feats });
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

/* Limite communale : sans elle, impossible de savoir où s'arrête Mézières
   — et c'est précisément une des questions auxquelles la carte doit répondre. */
function _c3dPoserContour(){
  if (!_c3dContour || _c3dMap.getSource('contour')) return;
  _c3dMap.addSource('contour', { type:'geojson',
    data:{ type:'Feature', properties:{}, geometry:_c3dContour } });
  _c3dMap.addLayer({ id:'contour-ligne', type:'line', source:'contour',
    paint:{ 'line-color':'#1a3d2b', 'line-width':2.4, 'line-opacity':0.75,
            'line-dasharray':[2, 1.4] } });
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

/* ── Toits en pente ────────────────────────────────────────────────────
   MapLibre ne sait extruder que des prismes à sommet PLAT. Un toit à deux
   pentes est donc approché par des TRANCHES horizontales de plus en plus
   étroites, empilées du haut des murs jusqu'au faîtage. De près, les arêtes
   des tranches se lisent comme des rangées de tuiles ; de loin, comme une
   pente franche.

   ⚠️ La forme d'un toit N'EST PAS une donnée. La BD TOPO donne l'emprise au
   sol et la hauteur, rien d'autre. Le faîtage est posé le long du GRAND AXE
   de l'emprise — vrai pour la plupart des maisons de village, faux pour
   certaines. C'est un procédé de lisibilité, au même titre que la couleur
   des zones du PLU, jamais une information sur une construction précise.
   Voir RG-17.15 : cela ne doit jamais être présenté comme la toiture réelle.

   ⚠️ Pourquoi pas une texture de façade : `fill-extrusion-pattern` répète le
   motif en PIXELS, pas en mètres. Le nombre de rangées de fenêtres grandit
   donc avec le zoom, et une maison de 6 m finit par ressembler à un immeuble
   de six étages. MapLibre n'offre aucun ancrage du motif sur la taille réelle
   du bâtiment : l'essai de la v4.69 a été retiré. Voir ADR-0020. */

var C3D_PENTE_TRANCHE = 0.30;              // hauteur visée d'une tranche (m)
var C3D_PENTE_MIN = 4, C3D_PENTE_MAX = 12; // une annexe n'a pas besoin d'autant
                                           // de marches qu'un clocher

/* Repère métrique local. Un degré de longitude et un degré de latitude ne
   couvrent pas la même distance : découper en degrés donnerait des pentes
   fausses, d'autant plus que le bâtiment est orienté est-ouest. */
function _c3dRepere(lon0, lat0){
  var kx = 111320 * Math.cos(lat0 * Math.PI / 180), ky = 110540;
  return {
    vers: function(p){ return [(p[0] - lon0) * kx, (p[1] - lat0) * ky]; },
    de:   function(p){ return [lon0 + p[0] / kx, lat0 + p[1] / ky]; }
  };
}

/* Sutherland–Hodgman : ne garde du polygone que le demi-plan n·p ≤ c.
   Le découpage se fait sur l'emprise RÉELLE, jamais sur son rectangle
   englobant : un toit ne peut donc pas déborder du bâtiment. */
function _c3dClip(poly, nx, ny, c){
  var out = [];
  for (var i = 0; i < poly.length; i++){
    var a = poly[i], b = poly[(i + 1) % poly.length];
    var da = nx * a[0] + ny * a[1] - c, db = nx * b[0] + ny * b[1] - c;
    if (da <= 0) out.push(a);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)){
      var t = da / (da - db);
      out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    }
  }
  return out;
}

/* Grand axe de l'emprise = orientation du faîtage. On prend la direction qui
   minimise l'aire de la boîte englobante orientée ; pour un bâti rectangulaire
   — l'immense majorité — c'est exactement la longueur de la maison. */
function _c3dGrandAxe(pts){
  var best = null;
  for (var i = 0; i < pts.length; i++){
    var a = pts[i], b = pts[(i + 1) % pts.length];
    var dx = b[0] - a[0], dy = b[1] - a[1], L = Math.sqrt(dx * dx + dy * dy);
    if (L < 0.2) continue;                       // arête négligeable
    var ux = dx / L, uy = dy / L;
    var u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (var j = 0; j < pts.length; j++){
      var u =  pts[j][0] * ux + pts[j][1] * uy;
      var v = -pts[j][0] * uy + pts[j][1] * ux;
      if (u < u0) u0 = u; if (u > u1) u1 = u;
      if (v < v0) v0 = v; if (v > v1) v1 = v;
    }
    var aire = (u1 - u0) * (v1 - v0);
    if (!best || aire < best.aire)
      best = { aire:aire, nx:-uy, ny:ux, centre:(v0 + v1) / 2, demi:(v1 - v0) / 2 };
  }
  return best;
}

/* Empile les tranches d'un anneau. Renvoie le nombre de tranches produites. */
function _c3dTranches(ring, p, out){
  if (!ring || ring.length < 4) return 0;
  var rep = _c3dRepere(ring[0][0], ring[0][1]), pts = [];
  for (var i = 0; i < ring.length - 1; i++) pts.push(rep.vers(ring[i]));
  if (pts.length < 3) return 0;
  var axe = _c3dGrandAxe(pts);
  if (!axe || !(axe.demi > 0.1)) return 0;

  var ht = p.mat_toit || 1.2;
  var n = Math.max(C3D_PENTE_MIN,
          Math.min(C3D_PENTE_MAX, Math.round(ht / C3D_PENTE_TRANCHE)));
  var faites = 0;
  for (var t = 0; t < n; t++){
    var marge = axe.demi * (t / n);
    var q = _c3dClip(pts, axe.nx, axe.ny, axe.centre + axe.demi - marge);
    q = _c3dClip(q, -axe.nx, -axe.ny, -(axe.centre - axe.demi + marge));
    if (q.length < 3) break;                     // tranche dégénérée : on arrête
    var co = [];
    for (var m = 0; m < q.length; m++) co.push(rep.de(q[m]));
    co.push(co[0]);
    out.push({ type:'Feature', properties:{
      mat_type: p.mat_type, mat_dans: p.mat_dans,
      mat_b: p.mat_h + ht * (t / n),
      mat_t: p.mat_h + ht * ((t + 1) / n)
    }, geometry:{ type:'Polygon', coordinates:[co] } });
    faites++;
  }
  return faites;
}

function _c3dToitsPente(fc){
  var out = [];
  for (var k = 0; k < fc.features.length; k++){
    var f = fc.features[k], g = f.geometry;
    if (!g) continue;
    if (g.type === 'Polygon') _c3dTranches(g.coordinates[0], f.properties, out);
    else if (g.type === 'MultiPolygon')
      for (var j = 0; j < g.coordinates.length; j++)
        _c3dTranches(g.coordinates[j][0], f.properties, out);
  }
  return { type:'FeatureCollection', features:out };
}

function _c3dPoserBati(fc){
  if (_c3dMap.getSource('bati')) return;
  _c3dMap.addSource('bati', { type:'geojson', data:fc });

  var commun = {
    'fill-extrusion-height':['get','mat_h'],
    'fill-extrusion-base':0,
    'fill-extrusion-opacity':1,
    'fill-extrusion-vertical-gradient':true
  };

  /* Un toit en pente pour la commune, sauf l'industriel — dont les toitures
     sont réellement plates ou très peu inclinées. Le bâti hors commune garde
     une simple casquette : il est volontairement en arrière-plan, et c'est
     autant de géométrie en moins (≈ 8 000 polygones au lieu de 40 000). */
  var aPente = function(p){
    return p.mat_dans === 1 && p.mat_type !== 'industriel';
  };
  var pentus = { type:'FeatureCollection', features:fc.features.filter(function(f){
    return aPente(f.properties);
  })};
  _c3dMap.addSource('toits', { type:'geojson', data:_c3dToitsPente(pentus) });

  /* Murs — une seule couche, donc un seul clic à gérer.
     ⚠️ En v4.69, l'habitat vivait dans une couche `bati-tex` séparée pour
     porter une texture. `queryRenderedFeatures` n'interrogeant que `bati`,
     cliquer sur une MAISON n'ouvrait plus sa fiche — le cas le plus courant.
     ⚠️ La distinction passe par la COULEUR, jamais par l'opacité :
     `fill-extrusion-opacity` n'accepte aucune expression basée sur les
     données (« data expressions not supported ») et MapLibre refuse alors la
     couche ENTIÈRE — plus aucun bâtiment. C'est ce qui est arrivé en v4.66.
     Même piège que `fill-extrusion-ambient-occlusion-*`, propriété de Mapbox
     absente de MapLibre. Vérifié par test (`carte3d.spec.js`). */
  _c3dMap.addLayer({
    id:'bati', type:'fill-extrusion', source:'bati',
    paint: Object.assign({
      'fill-extrusion-color':['case', ['==', ['get','mat_dans'], 0], '#cfd6cd',
        ['match', ['get','mat_type'],
          'culte',       '#efe7d6',
          'remarquable', '#eae0cd',
          'agricole',    '#dcd8cc',
          'industriel',  '#d3d6d6',
          'annexe',      '#f0eade',
          ['interpolate',['linear'],['get','mat_h'],
            3,'#fbf7f0', 8,'#f2e9db', 14,'#e6d8c4', 25,'#d6c3a8']]]
    }, commun)
  });

  /* Couleur de couverture : tuile sur l'habitat, ardoise sur l'église et les
     bâtiments remarquables, bac acier sur les hangars. Partagée par les deux
     couches de toiture pour qu'un bâtiment ne change pas de teinte selon
     qu'il a une pente ou une casquette. */
  var couvertures = ['case', ['==', ['get','mat_dans'], 0], '#b9bfb8',
    ['match', ['get','mat_type'],
      'culte',       '#5b6570',
      'remarquable', '#5b6570',
      'agricole',    '#8f9490',
      'industriel',  '#9aa0a0',
      'annexe',      '#9c6b52',
      '#a8533f']];

  /* Les toits en pente : une pile de tranches entre `mat_b` et `mat_t`. */
  _c3dMap.addLayer({
    id:'bati-toit', type:'fill-extrusion', source:'toits',
    paint:{
      'fill-extrusion-color': couvertures,
      'fill-extrusion-base':['get','mat_b'],
      'fill-extrusion-height':['get','mat_t'],
      'fill-extrusion-opacity':1,
      'fill-extrusion-vertical-gradient':true
    }
  });

  /* Casquette plate — le bâti hors commune et l'industriel, qui n'ont pas de
     tranches. Le filtre est l'exact complément de `aPente` : aucun bâtiment
     ne reçoit les deux, sans quoi les volumes se superposeraient. */
  _c3dMap.addLayer({
    id:'bati-toit-plat', type:'fill-extrusion', source:'bati',
    filter:['any', ['!=', ['get','mat_dans'], 1], ['==', ['get','mat_type'], 'industriel']],
    paint:{
      'fill-extrusion-color': couvertures,
      'fill-extrusion-base':['get','mat_h'],
      'fill-extrusion-height':['+', ['get','mat_h'], ['get','mat_toit']],
      'fill-extrusion-opacity':1,
      'fill-extrusion-vertical-gradient':true
    }
  });

  /* Liseré au sol : sans lui, les maisons mitoyennes fondent en un bloc. */
  _c3dMap.addLayer({ id:'bati-contour', type:'line', source:'bati',
    paint:{ 'line-color':'#6b5a45', 'line-width':0.6, 'line-opacity':0.35 } });
}

/* ══════════════════════════════════════════════════════════════════
   LE TERRITOIRE — les 25 communes de la CCTVL

   Le maire de Mézières porte le PLUi-H-D comme vice-président de la
   communauté de communes des Terres du Val de Loire. Cette vue montre aux
   Macériens le territoire dans lequel s'inscrit leur propre PLU.

   ⚠️ Ce qui est montré, ce sont les **25 PLU communaux d'aujourd'hui**,
   chacun avec ses propres règles et sa propre nomenclature de zones. Le
   PLUi-H-D n'existe pas encore au Géoportail de l'Urbanisme : la carte ne
   doit donc jamais laisser croire qu'elle affiche un document unique.

   ⚠️ **Aucune règle de construction hors de Mézières.** `data/plu-data.json`
   décrit le PLU de Mézières et lui seul — jusqu'au « Clos de Manthelon » et
   au recul de l'A71. Appliquer ces règles à Baule ou à Tavers serait faux.

   ⚠️ **Aucun code INSEE n'est écrit ici.** Les 25 NOMS viennent de la mairie ;
   les codes, contours et partitions sont ceux que renvoie le Géoportail.
   Écrire une liste de codes de mémoire, ce serait refaire la faute
   45203/45204 — mais à 25 exemplaires, et invisible à cette échelle. Un nom
   que le Géoportail ne place pas dans l'emprise est **signalé**, jamais
   deviné : voir `_c3dTerrManquantes` et le panneau « 🔎 Détail des sources ».
   ══════════════════════════════════════════════════════════════════ */

var C3D_CCTVL = [
  'Baccon', 'Baule', 'Beauce-la-Romaine', 'Beaugency', 'Binas', 'Chaingy',
  'Charsonville', 'Cléry-Saint-André', 'Coulmiers', 'Cravant', 'Dry',
  'Épieds-en-Beauce', 'Huisseau-sur-Mauves', 'Lailly-en-Val', 'Le Bardon',
  'Mareau-aux-Prés', 'Messas', 'Meung-sur-Loire', 'Mézières-lez-Cléry',
  'Rozières-en-Beauce', 'Saint-Ay', 'Saint-Laurent-des-Bois', 'Tavers',
  'Villermain', 'Villorceau'
];

/* Fenêtre de recherche, volontairement large. Ce n'est PAS une affirmation
   sur l'étendue de la CCTVL : trop petite, des communes manquent — et elles
   sont alors signalées ; trop grande, des voisines reviennent — et le
   filtrage par nom les écarte. L'erreur est donc rattrapable dans les deux
   sens, ce qu'une liste de codes écrite à la main n'aurait pas été. */
var C3D_TERR_BBOX = { w: 1.30, s: 47.63, e: 1.99, n: 48.06 };

/* Les codes de zones diffèrent d'un PLU à l'autre (« Ua » ici, « UB » là) :
   à l'échelle du territoire on ne peut colorer que par le TYPE normalisé du
   Géoportail — les quatre familles communes à tous les PLU de France. */
var C3D_TYPEZONE = {
  U:  { c:'#c0563f', lib:'Zone urbanisée' },
  AU: { c:'#e2703a', lib:'À urbaniser' },
  A:  { c:'#e8c547', lib:'Agricole' },
  N:  { c:'#2f9e5f', lib:'Naturelle et forestière' },
  /* Carte communale : deux secteurs seulement — constructible ou non. Ce n'est
     pas un PLU et la carte ne doit pas le faire croire. */
  CU: { c:'#a2708f', lib:'Constructible (carte communale)' },
  CN: { c:'#7f9c86', lib:'Non constructible (carte communale)' }
};

var _c3dTerr = null;              // [{insee, nom, partition, rnu, geom, nZones, err}]
var _c3dTerrManquantes = [];      // noms fournis par la mairie, non placés
var _c3dTerrZones = null;         // FeatureCollection des zonages des 25
var _c3dTerrEtat = 'vierge';      // vierge | charge | pret | echec
var _c3dTerrActif = false;

/* Clé de comparaison des noms : sans accent, sans casse, sans tiret ni
   espace. « Épieds-en-Beauce » et « EPIEDS EN BEAUCE » doivent s'apparier. */
function _c3dNomCle(s){
  return _c3dSansAccent(s).replace(/[^a-z0-9]+/g, '');
}

/* ⚠️ Deux pièges, tous deux attrapés par `carte3d.spec.js` :
   1. « AU » commence par un « A » — une zone à urbaniser rangée en agricole
      raconterait l'inverse de la réalité. D'où l'ordre des tests.
   2. Les zones à urbaniser s'écrivent presque toujours « 1AU », « 2AU » : le
      chiffre de phasage est en TÊTE. Sans le retirer, la forme la plus
      courante — celle du PLU de Mézières lui-même — retombait en gris. */
function _c3dTypeZone(p){
  var t = _c3dSansAccent((p && (p.typezone || p.type_zone || p.libelle)) || '')
            .trim().replace(/^[0-9]+/, '');
  if (!t) return '';
  if (t.indexOf('au') === 0 || /a urbaniser/.test(t)) return 'AU';
  if (t.indexOf('u') === 0  || /urbanis/.test(t))     return 'U';
  if (t.indexOf('a') === 0  || /agricole/.test(t))    return 'A';
  if (t.indexOf('n') === 0  || /naturel|forest/.test(t)) return 'N';
  return '';
}

/* Apparie ce que renvoie le Géoportail avec les 25 noms de la mairie.
   Fonction PURE : testable sans réseau, et c'est elle qui porte la garantie
   « aucun code inventé ». */
function _c3dApparier(features){
  var attendues = {}, trouvees = [], vus = {}, manquantes = [];
  C3D_CCTVL.forEach(function(n){ attendues[_c3dNomCle(n)] = n; });
  (features || []).forEach(function(f){
    var p = (f && f.properties) || {};
    var nom = p.name || p.nom || p.commune || p.libelle || '';
    var cle = _c3dNomCle(nom);
    if (!attendues[cle] || vus[cle]) return;   // hors CCTVL, ou déjà vue
    vus[cle] = 1;
    trouvees.push({
      insee: p.insee || p.code_insee || p.insee_com || '',
      nom: nom,
      partition: p.partition || '',
      rnu: (p.is_rnu === true || p.is_rnu === 'true'),
      geom: f.geometry, nZones: 0, err: ''
    });
  });
  C3D_CCTVL.forEach(function(n){ if (!vus[_c3dNomCle(n)]) manquantes.push(n); });
  trouvees.sort(function(a, b){ return a.nom.localeCompare(b.nom, 'fr'); });
  return { trouvees: trouvees, manquantes: manquantes };
}

function _c3dTerrCommunes(){
  var b = C3D_TERR_BBOX;
  var geom = { type:'Polygon', coordinates:[[
    [b.w, b.s], [b.e, b.s], [b.e, b.n], [b.w, b.n], [b.w, b.s]
  ]]};
  return _c3dJson(C3D_GPU + 'municipality?geom=' + encodeURIComponent(JSON.stringify(geom)))
    .then(function(fc){ return (fc && fc.features) || []; });
}

/* Emprise rectangulaire d'une géométrie, en 5 points.

   ⚠️ Ne JAMAIS mettre un contour communal complet dans une URL. Un contour du
   Géoportail compte des centaines à des milliers de sommets ; sérialisé en
   JSON puis encodé dans une chaîne de requête, il produit une URL de plusieurs
   dizaines de milliers de caractères, que la pile réseau refuse — le navigateur
   ne rend même pas une erreur HTTP, seulement « Failed to fetch ».
   C'est ce qui est arrivé en v4.72 : les quatre premières communes de la
   première vague (Baccon, Baule, Beauce-la-Romaine, Beaugency) échouaient
   toutes ainsi. On interroge donc sur le RECTANGLE — 5 points — et l'exactitude
   est rétablie ensuite par le découpage sur le vrai contour. */
function _c3dBBoxGeom(geom){
  if (!geom) return null;
  var polys = geom.type === 'Polygon' ? [geom.coordinates]
            : geom.type === 'MultiPolygon' ? geom.coordinates : [];
  var w = 180, s = 90, e = -180, n = -90, vus = 0;
  polys.forEach(function(anneaux){
    (anneaux[0] || []).forEach(function(p){
      if (p[0] < w) w = p[0]; if (p[0] > e) e = p[0];
      if (p[1] < s) s = p[1]; if (p[1] > n) n = p[1];
      vus++;
    });
  });
  if (!vus) return null;
  return { type:'Polygon', coordinates:[[[w,s],[e,s],[e,n],[w,n],[w,s]]] };
}

/* Le zonage d'UNE commune, en trois chemins — parce qu'aucun ne suffit seul.

   Ce que le diagnostic a montré sur le terrain (v4.72, 25 communes) :
     • `municipality?geom=` renvoie le nom, le code INSEE et le contour, mais
       NI `partition` NI `is_rnu` — contrairement à `municipality?insee=` ;
     • une commune au RNU n'a pas de zonage : ce n'est pas une panne, c'est
       une information, et l'afficher comme un « échec » est faux ;
     • une URL contenant un contour entier échoue au niveau réseau.

   D'où la chaîne : partition connue → sinon `municipality?insee=` pour obtenir
   la partition ET le statut RNU faisant autorité → sinon interrogation par
   emprise rectangulaire, découpée sur le vrai contour (la requête par emprise
   ramène le zonage des voisines, et draper le PLU du voisin serait la faute
   du 45203/45204). */
function _c3dTerrZonesDe(c){
  if (c.rnu) { c.via = 'RNU'; return Promise.resolve([]); }

  function habiller(out, via, decouper){
    if (decouper && c.geom){
      out = out.filter(function(f){
        return _c3dDansGeom(_c3dCentroide(f.geometry), c.geom);
      });
    }
    out.forEach(function(f){
      f.properties = f.properties || {};
      f.properties.mat_tz  = _c3dTypeZone(f.properties);
      f.properties.mat_com = c.nom;
      f.properties.mat_moi = (c.insee && c.insee === C3D_INSEE) ? 1 : 0;
    });
    c.nZones = out.length;
    c.via = via;
    /* Zéro zone n'est PAS un succès : sans cela, une commune muette se
       confondait à l'écran avec une commune encore en cours de chargement.
       À l'inverse, un repli qui réussit efface l'échec du premier chemin. */
    if (out.length) c.err = '';
    return out;
  }

  /* Une panne réseau passagère ne doit pas condamner une commune pour la
     session : sur un téléphone, quatre requêtes simultanées en échouent une
     de temps en temps. Un seul second essai, sans insister. */
  function jsonRessaye(url){
    return _c3dJson(url).catch(function(e){
      if (!/failed to fetch|networkerror|load failed/i.test((e && e.message) || '')) throw e;
      return _c3dJson(url);
    });
  }

  function parPartition(part, via){
    return jsonRessaye(C3D_GPU + 'zone-urba?partition=' + encodeURIComponent(part))
      .then(function(fc){
        var out = (fc && fc.features) || [];
        return out.length ? habiller(out, via, false) : null;   // null = essayer la suite
      })
      .catch(function(e){ c.err = (e && e.message) || 'échec'; return null; });
  }

  /* `municipality?insee=` fait autorité : c'est lui qui porte `partition` et
     `is_rnu`. Le code INSEE vient du Géoportail, jamais d'une supposition. */
  function parInsee(){
    if (!c.insee) return null;
    return jsonRessaye(C3D_GPU + 'municipality?insee=' + encodeURIComponent(c.insee))
      .then(function(fc){
        var p = (fc && fc.features && fc.features[0] && fc.features[0].properties) || null;
        if (!p) return null;
        if (p.is_rnu === true || p.is_rnu === 'true'){
          c.rnu = true; c.via = 'RNU'; c.err = ''; c.nZones = 0;
          return [];                                  // tableau = terminé, sans erreur
        }
        if (!p.partition) return null;
        c.partition = p.partition;
        return parPartition(p.partition, 'partition (via INSEE)');
      })
      .catch(function(e){ c.err = c.err || (e && e.message) || 'échec'; return null; });
  }

  function parEmprise(){
    var bbox = _c3dBBoxGeom(c.geom);
    if (!bbox){ c.err = c.err || 'ni partition ni contour'; return null; }
    return jsonRessaye(C3D_GPU + 'zone-urba?geom=' + encodeURIComponent(JSON.stringify(bbox)))
      .then(function(fc){
        var out = (fc && fc.features) || [];
        return out.length ? habiller(out, 'emprise', true) : null;
      })
      .catch(function(e){ c.err = (e && e.message) || 'échec'; return null; });
  }

  /* ⚠️ `zone-urba` ne sert QUE les PLU et les POS. Une petite commune rurale
     est très souvent sous CARTE COMMUNALE — un document plus simple, à deux
     secteurs : constructible ou non. Sa réponse `zone-urba` est légitimement
     vide, et l'afficher comme « aucune zone renvoyée » laisse croire à une
     panne alors que la commune est parfaitement en règle.

     Le relevé de terrain le montre sans ambiguïté : les communes qui
     répondaient sont les plus peuplées (Beaugency, Meung, Cléry, Lailly…),
     celles qui restaient vides sont les plus petites (Baccon, Binas,
     Charsonville, Coulmiers, Villermain…).

     Confirmé par la mairie : Le Bardon relève d'une carte communale approuvée
     en 2011, modifiée en 2022. L'hypothèse est donc juste — restait à trouver
     la bonne porte.

     ⚠️ Les noms d'endpoints au-delà de `municipality` et `zone-urba` sont
     déduits de la documentation d'apicarto et NON vérifiables depuis
     l'environnement de développement. D'où deux chemins, et surtout un
     JOURNAL : chaque tentative inscrit son issue dans `c.ccJournal`, affiché
     dans « 🔎 Détail des sources ».

     ⚠️ La version précédente écrivait le motif d'échec dans `c.errCc`… que
     RIEN ne lisait. Exactement la faute que ce panneau existe pour empêcher :
     l'écran annonçait « pas de PLU » sans pouvoir dire si l'endpoint avait
     répondu vide, renvoyé une erreur, ou n'existait pas. */
  function parCarteCommunale(){
    var bbox = _c3dBBoxGeom(c.geom);
    c.ccJournal = c.ccJournal || [];

    /* Une carte communale n'a que deux secteurs. Les ranger dans les familles
       d'un PLU (U/AU/A/N) laisserait croire à un zonage qui n'existe pas :
       elles ont leurs propres couleurs. */
    function retenir(out, via){
      c.cc = true;
      var res = habiller(out, via, true);
      res.forEach(function(f){
        var t = _c3dSansAccent(f.properties.libelle || f.properties.typesect
                            || f.properties.typezone || f.properties.type || '');
        f.properties.mat_tz = (/non/.test(t) || /^nc/.test(t) || /^n/.test(t)) ? 'CN' : 'CU';
      });
      return res;
    }

    function essai(url, via){
      return jsonRessaye(url)
        .then(function(fc){
          var out = (fc && fc.features) || [];
          c.ccJournal.push(via + ' : ' + out.length + ' secteur(s)');
          return out.length ? retenir(out, via) : null;
        })
        .catch(function(e){
          c.ccJournal.push(via + ' : ' + ((e && e.message) || 'échec'));
          return null;
        });
    }

    /* Second chemin : demander au Géoportail QUELS documents couvrent la
       commune. C'est lui qui donne la partition d'une carte communale, dont la
       forme n'a aucune raison d'être celle d'un PLU. */
    function parDocument(){
      if (!c.insee) return null;
      return jsonRessaye(C3D_GPU + 'document?insee=' + encodeURIComponent(c.insee))
        .then(function(fc){
          var fs = (fc && fc.features) || [];
          var parts = [];
          fs.forEach(function(f){
            var p = (f && f.properties) || {};
            if (p.partition) parts.push(p.partition);
            if (p.du || p.type) c.docType = String(p.du || p.type);
          });
          c.ccJournal.push('document : ' + fs.length + ' document(s)'
                         + (c.docType ? ' — ' + c.docType : ''));
          if (!parts.length) return null;
          /* On tente chaque partition annoncée, l'une après l'autre. */
          return parts.reduce(function(chaine, p){
            return chaine.then(function(r){
              return r || essai(C3D_GPU + 'secteur-cc?partition=' + encodeURIComponent(p),
                                'carte communale (' + p + ')');
            });
          }, Promise.resolve(null));
        })
        .catch(function(e){
          c.ccJournal.push('document : ' + ((e && e.message) || 'échec'));
          return null;
        });
    }

    return Promise.resolve()
      .then(function(){
        return bbox ? essai(C3D_GPU + 'secteur-cc?geom=' + encodeURIComponent(JSON.stringify(bbox)),
                            'carte communale (emprise)') : null;
      })
      .then(function(r){ return r || parDocument(); });
  }

  /* Enchaînement : chaque étape renvoie un tableau si elle conclut, `null` si
     elle passe la main. La dernière conclut toujours. */
  return Promise.resolve()
    .then(function(){ return c.partition ? parPartition(c.partition, 'partition') : null; })
    .then(function(r){ return r || parInsee(); })
    .then(function(r){ return r || parEmprise(); })
    .then(function(r){ return r || parCarteCommunale(); })
    .then(function(r){
      var out = r || [];
      /* Sans PLU ET sans carte communale, on ne conclut PAS à une panne : on
         dit ce qu'on sait — le Géoportail n'a pas de document de zonage pour
         cette commune. C'est une information, pas une erreur. */
      if (!out.length && !c.rnu && !c.err) c.sansDoc = true;
      return out;
    });
}

/* Chargement par vagues de quatre : 25 requêtes lancées d'un coup, c'est
   un téléphone qui s'étrangle. La carte se remplit au fur et à mesure. */
function _c3dTerrCharger(){
  if (_c3dTerrEtat === 'pret' || _c3dTerrEtat === 'charge') return Promise.resolve();
  _c3dTerrEtat = 'charge';
  _c3dStatut('Chargement du territoire — 25 communes…');

  return _c3dTerrCommunes()
    .then(function(features){
      var r = _c3dApparier(features);
      _c3dTerr = r.trouvees;
      _c3dTerrManquantes = r.manquantes;
      _c3dNoter('Géoportail — communes du territoire', !!r.trouvees.length,
        r.manquantes.length ? ('non placées : ' + r.manquantes.join(', ')) : 'les 25 communes',
        (features || []).length, r.trouvees.length);
      if (!r.trouvees.length) throw new Error('aucune commune du territoire trouvée');

      _c3dTerrZones = { type:'FeatureCollection', features:[] };
      _c3dPoserTerritoire();
      _c3dCadrerTerritoire();

      var i = 0;
      function vague(){
        var lot = _c3dTerr.slice(i, i + 4);
        if (!lot.length) return Promise.resolve();
        i += 4;
        return Promise.all(lot.map(_c3dTerrZonesDe)).then(function(res){
          res.forEach(function(zs){ _c3dTerrZones.features.push.apply(_c3dTerrZones.features, zs); });
          var s = _c3dMap && _c3dMap.getSource('terr-zones');
          if (s) s.setData(_c3dTerrZones);
          _c3dTerrPanneau();
          _c3dStatut('Territoire — ' + Math.min(i, _c3dTerr.length) + '/' + _c3dTerr.length
                   + ' communes chargées…');
          return vague();
        });
      }
      return vague();
    })
    .then(function(){
      _c3dTerrEtat = 'pret';
      var rnu = _c3dTerr.filter(function(c){ return c.rnu; }).length;
      /* ⚠️ Ne comptent comme ÉCHECS que les vraies pannes. Une commune au RNU
         ou sans document au Géoportail est en règle : elle n'a pas de PLU.
         Les mélanger annonçait « 13 sans zonage » — un chiffre qui donnait
         l'impression d'une carte à moitié cassée. */
      var sansPlu = _c3dTerr.filter(function(c){ return c.rnu || c.sansDoc; }).length;
      var ko  = _c3dTerr.filter(function(c){ return c.err && !c.rnu && !c.sansDoc; }).length;
      var nz  = _c3dTerrZones.features.length;
      _c3dNoter('Géoportail — zonages du territoire', nz > 0,
        (_c3dTerr.length - sansPlu - ko) + ' commune(s) avec zonage · '
        + sansPlu + ' sans PLU (RNU ou hors Géoportail)', nz, nz);

      /* Contours sans zonage : le cas où l'écran paraît vide alors que tout a
         « marché ». Il doit se dénoncer lui-même, et dire OÙ regarder. */
      if (!nz){
        _c3dStatut('<b>' + _c3dTerr.length + ' communes tracées, aucun zonage reçu.</b><br>'
                 + 'Le Géoportail n\'a renvoyé aucune zone. Touchez le bouton '
                 + '« 🔎 Détail des sources », en bas, pour voir sa réponse exacte.');
        _c3dTerrPanneau();
        return;
      }
      /* On annonce d'abord ce qui EST là. Le reste se dit en clair : « sans
         PLU » n'est pas un défaut de la carte, c'est la situation de ces
         communes. Seul `ko` désigne une vraie panne. */
      var avecPlu = _c3dTerr.length - sansPlu - ko;
      var msg = '<b>Les Terres du Val de Loire</b> · ' + avecPlu + ' communes avec zonage sur '
              + C3D_CCTVL.length;
      if (sansPlu) msg += ' · ' + sansPlu + ' sans PLU';
      if (ko)      msg += ' · ' + ko + ' indisponible' + (ko > 1 ? 's' : '');
      if (_c3dTerrManquantes.length)
        msg += '<br>⚠️ non placées : ' + _c3dEsc(_c3dTerrManquantes.join(', '));
      _c3dStatut(msg);
      _c3dTerrPanneau();
    })
    .catch(function(e){
      _c3dTerrEtat = 'echec';
      _c3dNoter('Géoportail — communes du territoire', false, (e && e.message) || 'raison inconnue');
      _c3dStatut('⚠️ Territoire indisponible : ' + _c3dEsc(e && e.message)
               + '<br>Touchez « 🔎 Détail des sources ».');
    });
}

function _c3dPoserTerritoire(){
  if (!_c3dMap || _c3dMap.getSource('terr-zones')) return;

  _c3dMap.addSource('terr-communes', { type:'geojson', data:{ type:'FeatureCollection',
    features: _c3dTerr.map(function(c){
      return { type:'Feature', geometry:c.geom,
               properties:{ mat_com:c.nom, mat_rnu:c.rnu ? 1 : 0,
                            mat_moi:(c.insee && c.insee === C3D_INSEE) ? 1 : 0 } };
    }) }});
  _c3dMap.addSource('terr-zones', { type:'geojson', data:_c3dTerrZones });

  /* Construite depuis `C3D_TYPEZONE` : ajouter une famille au tableau suffit,
     sans risque d'oublier la couche. */
  var couleur = ['match', ['get','mat_tz']];
  Object.keys(C3D_TYPEZONE).forEach(function(k){ couleur.push(k, C3D_TYPEZONE[k].c); });
  couleur.push(C3D_DEFAUT);

  _c3dMap.addLayer({ id:'terr-fill', type:'fill', source:'terr-zones',
    paint:{ 'fill-color':couleur, 'fill-opacity':0.55 } });
  /* ⚠️ Un trait gris foncé de 1,1 px sur une photo aérienne est INVISIBLE.
     La première version en était là : les 25 contours étaient bien tracés, et
     l'écran semblait n'en montrer aucun. D'où le doublon — un liseré sombre
     large dessous, un trait clair fin dessus — qui tient sur n'importe quel
     fond, sombre comme clair. */
  _c3dMap.addLayer({ id:'terr-line-fond', type:'line', source:'terr-communes',
    paint:{ 'line-color':'#12261c', 'line-width':3.2, 'line-opacity':0.55 } });
  _c3dMap.addLayer({ id:'terr-line', type:'line', source:'terr-communes',
    paint:{ 'line-color':'#f4f7f2', 'line-width':1.2, 'line-opacity':0.95 } });
  /* Mézières doit se retrouver d'un coup d'œil : c'est de là qu'on regarde. */
  _c3dMap.addLayer({ id:'terr-moi', type:'line', source:'terr-communes',
    filter:['==', ['get','mat_moi'], 1],
    paint:{ 'line-color':'#ffcf3f', 'line-width':4, 'line-opacity':1 } });
}

/* Le cadrage est DÉDUIT des contours reçus, jamais fixé à un zoom écrit à la
   main : je ne connais pas l'étendue exacte de la CCTVL, et un zoom deviné
   couperait des communes ou les noierait. `fitBounds` sur ce qui est
   réellement arrivé ne peut pas se tromper. */
function _c3dCadrerTerritoire(){
  if (!_c3dMap || !_c3dTerr || !_c3dTerr.length) return;
  var w = 180, s = 90, e = -180, n = -90, vus = 0;
  _c3dTerr.forEach(function(c){
    var g = c.geom;
    if (!g) return;
    var polys = g.type === 'Polygon' ? [g.coordinates]
              : g.type === 'MultiPolygon' ? g.coordinates : [];
    polys.forEach(function(anneaux){
      (anneaux[0] || []).forEach(function(pt){
        if (pt[0] < w) w = pt[0]; if (pt[0] > e) e = pt[0];
        if (pt[1] < s) s = pt[1]; if (pt[1] > n) n = pt[1];
        vus++;
      });
    });
  });
  if (!vus) return;
  _c3dMap.fitBounds([[w, s], [e, n]], { padding:34, duration:1400, pitch:0, bearing:0 });
}

/* ⚠️ Déplié, le panneau des 25 communes recouvrait la colonne de boutons.
   Replié il tenait — d'où un contrôle de collision qui passait au vert. Aucune
   valeur écrite en CSS ne peut convenir : la hauteur dépend du nombre de
   boutons visibles, de la barre système et du réglage de taille du texte.
   On MESURE donc l'espace réellement libre au-dessus des boutons, à chaque
   ouverture du panneau. */
function _c3dTerrHauteurPanneau(){
  var det = document.getElementById('c3d-terr');
  var outils = document.querySelector('.c3d-outils');
  if (!det || !outils || !det.open){ if (det) det.style.maxHeight = ''; return; }
  var haut = det.getBoundingClientRect().top;
  var bas  = outils.getBoundingClientRect().top;
  var libre = bas - haut - 12;
  det.style.maxHeight = Math.max(120, libre) + 'px';
}

/* Liste des communes : le seul endroit qui dise, commune par commune, ce que
   la carte sait et ce qu'elle ignore. */
function _c3dTerrPanneau(){
  var ul = document.getElementById('c3d-terr-liste');
  if (!ul) return;
  /* ⚠️ L'ordre départage panne et situation normale. Une commune au RNU ou
     sans document au Géoportail n'est PAS en échec : elle est en règle, elle
     n'a simplement pas de PLU. « aucune zone renvoyée » se lisait comme un
     bug — dix communes sur onze étaient dans ce cas. */
  var lignes = (_c3dTerr || []).map(function(c){
    var etat = c.rnu     ? '<em>au RNU — pas de PLU</em>'
             : c.nZones  ? (c.nZones + ' secteurs' + (c.cc ? ' <em>(carte communale)</em>' : ''))
             : c.sansDoc ? '<em>pas de PLU au Géoportail</em>'
             : c.err     ? '<em>' + _c3dEsc(c.err) + '</em>'
             : '<em>en cours…</em>';
    return '<li' + (c.insee === C3D_INSEE ? ' class="c3d-terr-moi"' : '') + '>'
         + '<span>' + _c3dEsc(c.nom) + '</span> <small>' + etat + '</small></li>';
  });
  _c3dTerrManquantes.forEach(function(n){
    lignes.push('<li><span>' + _c3dEsc(n) + '</span> <small><em>non trouvée au Géoportail</em></small></li>');
  });
  ul.innerHTML = lignes.join('');

  /* La légende ne montre que les familles RÉELLEMENT présentes : afficher les
     couleurs de la carte communale là où il n'y en a aucune ferait chercher
     sur la carte quelque chose qui n'y est pas. */
  var vues = {};
  ((_c3dTerrZones && _c3dTerrZones.features) || []).forEach(function(f){
    if (f.properties.mat_tz) vues[f.properties.mat_tz] = 1;
  });
  var cles = Object.keys(C3D_TYPEZONE).filter(function(k){ return vues[k]; });
  if (!cles.length) cles = ['U', 'AU', 'A', 'N'];
  var lg = document.getElementById('c3d-terr-legende');
  if (lg) lg.innerHTML = cles.map(function(k){
    return '<li><i style="background:' + C3D_TYPEZONE[k].c + '"></i><span>' + k
         + ' <span>' + C3D_TYPEZONE[k].lib + '</span></span></li>';
  }).join('');
}

/* Bascule village ↔ territoire. Les bâtiments n'ont aucun sens à 30 km de
   distance : ils sont masqués, pas seulement invisibles — c'est autant de
   géométrie que la carte ne dessine plus. */
var C3D_COUCHES_VILLAGE = ['bati','bati-toit','bati-toit-plat','bati-contour',
                           'zones-fill','zones-line','contour-ligne'];
var C3D_COUCHES_TERR = ['terr-fill','terr-line-fond','terr-line','terr-moi'];

function _c3dVoirTerritoire(on){
  _c3dTerrActif = !!on;
  var det = document.getElementById('c3d-terr');
  if (det){
    det.hidden = !on;
    if (!det._c3dMesure){
      det._c3dMesure = true;
      det.addEventListener('toggle', _c3dTerrHauteurPanneau);
      window.addEventListener('resize', _c3dTerrHauteurPanneau);
    }
  }
  var lg = document.getElementById('c3d-legende');
  if (lg) lg.hidden = on || !_c3dZones;

  function vis(ids, montrer){
    ids.forEach(function(l){
      if (_c3dMap && _c3dMap.getLayer(l))
        _c3dMap.setLayoutProperty(l, 'visibility', montrer ? 'visible' : 'none');
    });
  }
  vis(C3D_COUCHES_VILLAGE, !on);
  vis(C3D_COUCHES_TERR, on);

  /* ⚠️ Le fond n'est PAS imposé. La v4.72 basculait d'office sur le plan IGN,
     au motif qu'à 30 km la photo aérienne n'est qu'un tapis de parcelles. À
     l'usage, c'est la vue aérienne qu'on préfère : elle donne le paysage — la
     Loire, la forêt, les bourgs — que le plan aplatit. Le double tracé des
     limites (liseré sombre + trait clair) rend le zonage lisible sur les deux,
     donc rien n'oblige à choisir à la place de l'habitant.
     Le bouton « Vue aérienne / Plan » reste le seul maître du fond. */

  if (!on){
    _c3dMap.easeTo({ center:C3D_CENTRE, zoom:14.4, pitch:55, duration:1400 });
    return Promise.resolve();
  }
  /* À plat : à cette échelle, l'inclinaison ne montre rien et gêne la lecture.
     Ce recul n'est qu'un premier pas — `_c3dCadrerTerritoire` reprend la main
     dès que les contours sont là. */
  _c3dMap.easeTo({ center:C3D_CENTRE, zoom:9.6, pitch:0, bearing:0, duration:1600 });
  return _c3dTerrCharger().then(function(){
    vis(C3D_COUCHES_TERR, true);
    _c3dCadrerTerritoire();
  });
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
  /* ⚠️ Ces nombres sont ceux RENVOYÉS par le service, sur une emprise de
     7 km sur 6,7 km qui déborde sur les communes voisines. Ils étaient lus
     comme des totaux communaux — d'où la distinction explicite. */
  _c3dJournal.forEach(function(e){
    /* ⚠️ « retenus dans la commune » est faux pour les lignes du TERRITOIRE :
       on n'y découpe pas sur Mézières, on apparie 25 communes parmi celles que
       l'emprise a ramenées. Le chiffre était juste, la phrase non. */
    var retenu = e.retenu != null && e.retenu !== e.n
      ? '<br><span class="d">' + e.retenu
        + (/territoire/i.test(e.nom) ? ' retenues sur ' + e.n
                                     : ' retenus dans la commune') + '</span>' : '';
    out += '<div class="c3d-row"><span class="c">' + _c3dEsc(e.nom)
        +  '<br><span class="d">' + _c3dEsc(e.detail) + '</span>' + retenu + '</span>'
        +  '<span class="a ' + (e.ok ? 'ok' : 'pc') + '">'
        +  (e.ok ? e.n + ' reçus' : 'échec') + '</span></div>';
  });
  out += '</div>';
  /* Natures de bâtiments non reconnues : de quoi affiner le classement sur
     pièce plutôt qu'à l'aveugle — les libellés exacts de la BD TOPO ne sont
     pas vérifiables depuis l'environnement de développement. */
  var inconnus = Object.keys(_c3dInconnus);
  if (inconnus.length){
    out += '<div class="c3d-sec">Natures de bâtiments non classées</div><div class="c3d-rows">';
    inconnus.sort(function(a,b){ return _c3dInconnus[b] - _c3dInconnus[a]; })
      .slice(0, 12).forEach(function(k){
        out += '<div class="c3d-row"><span class="c">' + _c3dEsc(k) + '</span>'
            +  '<span class="a dp">' + _c3dInconnus[k] + '</span></div>';
      });
    out += '</div>';
  }

  /* Territoire : la liste des noms fournis par la mairie que le Géoportail
     n'a pas placés dans l'emprise. Sans elle, la carte afficherait 23
     communes en laissant croire qu'elle en montre 25. */
  if (_c3dTerrManquantes.length){
    out += '<div class="c3d-sec">Communes annoncées, non trouvées au Géoportail</div>'
        +  '<div class="c3d-rows">';
    _c3dTerrManquantes.forEach(function(n){
      out += '<div class="c3d-row"><span class="c">' + _c3dEsc(n)
          +  '<br><span class="d">nom absent de l\'emprise interrogée</span></span>'
          +  '<span class="a pc">absente</span></div>';
    });
    out += '</div><div class="c3d-note">Un nom non trouvé n\'est jamais remplacé par une '
        +  'supposition : ni code INSEE, ni commune approchante. Soit le Géoportail ne la '
        +  'connaît pas sous ce nom, soit elle est hors de l\'emprise interrogée.</div>';
  }
  var ko = (_c3dTerr || []).filter(function(c){ return c.err; });
  if (ko.length){
    out += '<div class="c3d-sec">Zonages du territoire indisponibles</div><div class="c3d-rows">';
    ko.forEach(function(c){
      out += '<div class="c3d-row"><span class="c">' + _c3dEsc(c.nom)
          +  '<br><span class="d">' + _c3dEsc(c.err) + '</span></span>'
          +  '<span class="a pc">échec</span></div>';
    });
    out += '</div>';
  }

  /* Communes sans PLU : ce que chaque tentative de carte communale a répondu.
     Sans ce détail, l'écran annonce « pas de PLU » sans pouvoir dire si le
     service a répondu vide, renvoyé une erreur, ou n'existe pas sous ce nom —
     et c'est justement la question qui reste ouverte. */
  var sans = (_c3dTerr || []).filter(function(c){ return c.sansDoc && c.ccJournal; });
  if (sans.length){
    out += '<div class="c3d-sec">Communes sans PLU — recherche d\'une carte communale</div>'
        +  '<div class="c3d-rows">';
    sans.slice(0, 8).forEach(function(c){
      out += '<div class="c3d-row"><span class="c">' + _c3dEsc(c.nom)
          +  '<br><span class="d">' + _c3dEsc(c.ccJournal.join(' · ')) + '</span></span>'
          +  '<span class="a dp">sans PLU</span></div>';
    });
    out += '</div>';
  }

  out += '<div class="c3d-note">Données : orthophoto et BD TOPO de l\'IGN, zonage du Géoportail '
      +  'de l\'Urbanisme, règles du PLU communal. Rien n\'est envoyé : votre position n\'est '
      +  'transmise à personne.</div>';
  document.getElementById('c3d-fiche-corps').innerHTML = out;
  document.getElementById('c3d-fiche').classList.add('on');
}

/* ── Interactions ──────────────────────────────────────────────── */
function _c3dBrancher(){
  _c3dMap.on('click', function(e){
    /* En vue territoire, un clic nomme la commune et la famille de zone —
       et RIEN de plus. Ouvrir la fiche des règles reviendrait à appliquer le
       PLU de Mézières à Baule ou à Tavers : `data/plu-data.json` ne décrit
       que Mézières. Voir RG-17.21. */
    if (_c3dTerrActif){
      if (!_c3dMap.getLayer('terr-fill')) return;
      var t = _c3dMap.queryRenderedFeatures(e.point, { layers:['terr-fill'] })[0];
      if (!t) return;
      var tz = t.properties.mat_tz;
      var lib = C3D_TYPEZONE[tz] ? C3D_TYPEZONE[tz].lib : 'type non renseigné';
      _c3dStatut('<b>' + _c3dEsc(t.properties.mat_com) + '</b> — ' + _c3dEsc(lib)
        + (Number(t.properties.mat_moi) === 1
            ? '<br>Revenez au village pour les règles qui s\'y appliquent.'
            : '<br>Les règles de construction de cette commune ne sont pas dans l\'application.'));
      return;
    }
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
    ['bati','bati-toit','bati-toit-plat','bati-contour'].forEach(function(l){
      if (_c3dMap.getLayer(l)) _c3dMap.setLayoutProperty(l, 'visibility', on ? 'visible' : 'none');
    });
  });
  /* Le territoire est FERMÉ par défaut (aria-pressed="false") : c'est une vue
     supplémentaire, et son chargement coûte 26 requêtes. On ne l'impose pas. */
  bascule('c3d-btn-terr', function(on){
    var t = document.querySelector('#c3d-btn-terr span');
    if (t) t.textContent = on ? 'Revenir au village' : 'Le territoire';
    _c3dVoirTerritoire(on);
  });
  bascule('c3d-btn-fond', function(on){
    _c3dMap.setLayoutProperty('l-ortho', 'visibility', on ? 'visible' : 'none');
    _c3dMap.setLayoutProperty('l-plan',  'visibility', on ? 'none' : 'visible');
    var t = document.querySelector('#c3d-btn-fond span');
    if (t) t.textContent = on ? 'Vue aérienne' : 'Plan';
  });
  var g = document.getElementById('c3d-btn-ici');
  if (g) g.onclick = _c3dLocaliser;
  var d = document.getElementById('c3d-btn-diag');
  if (d) d.onclick = _c3dOuvrirDiag;
  var x = document.getElementById('c3d-fiche-fermer');
  if (x) x.onclick = _c3dFermerFiche;
}

/* Trois clignotements à l'ouverture, puis plus rien. Le bouton ne se
   distinguait pas de ses voisins, et sa fonction — situer SA maison dans le
   zonage — est la moins devinable de la carte.
   Il se tait dès qu'on le touche : insister après un clic serait du bruit. */
function _c3dAttirerIci(){
  setTimeout(function(){
    var b = document.getElementById('c3d-btn-ici');
    if (!b) return;
    b.classList.remove('c3d-attire');
    void b.offsetWidth;              // force le redémarrage à chaque ouverture
    b.classList.add('c3d-attire');
    var taire = function(){ b.classList.remove('c3d-attire'); };
    b.addEventListener('animationend', taire, { once:true });
    b.addEventListener('click', taire, { once:true });
  }, 700);
}

/* « Où suis-je » — la position ne sort pas du navigateur : elle sert
   uniquement à centrer la carte et à lire la zone dans le zonage déjà
   chargé. Aucune requête réseau, rien n'est transmis à la commune. */
function _c3dLocaliser(){
  if (!navigator.geolocation){
    _c3dStatut('⚠️ La localisation n\'est pas disponible sur cet appareil.');
    return;
  }
  _c3dStatut('📍 Localisation en cours…');
  navigator.geolocation.getCurrentPosition(function(pos){
    var pt = [pos.coords.longitude, pos.coords.latitude];
    /* Hors commune, on le dit : la carte ne porte que le PLU de Mézières,
       et laisser croire le contraire serait trompeur. */
    if (_c3dContour && !_c3dDansGeom(pt, _c3dContour)){
      _c3dViser(pt);
      _c3dStatut('📍 Vous êtes <b>hors de la commune</b> — le zonage affiché '
               + 'est celui de ' + _c3dEsc(_c3dCommune || 'Mézières-lez-Cléry') + '.');
      return;
    }
    _c3dViser(pt);
  }, function(err){
    _c3dStatut(err && err.code === 1
      ? '⚠️ Localisation refusée. Vous pouvez l\'autoriser dans les réglages du navigateur.'
      : '⚠️ Position introuvable. Réessayez à l\'extérieur.');
  }, { enableHighAccuracy:true, timeout:9000, maximumAge:60000 });
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
          _c3dPoserContour();
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
            /* Le Géoportail renvoie un POLYGONE par secteur : une même zone
               Ua peut en compter vingt. Annoncer « 185 zones » laissait
               croire à 185 règles différentes. On compte les zones
               distinctes, et les bâtiments réellement dans la commune. */
            var codes = {};
            _c3dZones.features.forEach(function(f){ codes[f.properties.mat_code] = 1; });
            var nZones = Object.keys(codes).length;
            var nBati = fc.mat_nCommune != null ? fc.mat_nCommune : fc.features.length;
            _c3dStatut('<b>' + _c3dEsc(_c3dCommune || 'la commune') + '</b> · '
              + nBati + ' bâtiments · ' + nZones + (nZones > 1 ? ' zones' : ' zone')
              + ' du PLU');
            /* ⚠️ Ce minuteur a effacé les messages du TERRITOIRE : basculer
               dans les six secondes suivant l'arrivée du village, et l'écran
               n'annonçait plus rien — ni progression, ni échec. */
            setTimeout(function(){ if (!_c3dTerrActif) _c3dStatut('', true); }, 6000);
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
        _c3dAttirerIci();
      });
    } else {
      /* L'overlay était masqué : MapLibre a mesuré une taille nulle. */
      _c3dMap.resize();
      if (cible) _c3dViser(cible, opts.zone);
      _c3dAttirerIci();
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
