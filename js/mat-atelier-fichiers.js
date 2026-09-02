/* ════════════════════════════════════════════════════════════
   MAT — Atelier fichiers (onglet 📎 de l'administration) v1.1.0
   Copyright (c) 2024-2026 Commune de Mézières-lez-Cléry — Licence MIT

   Sept outils, tous exécutés DANS LE NAVIGATEUR : compresser des images vers
   un poids cible, masquer une zone d'une photo, compresser un PDF, organiser
   les pages d'un PDF, extraire les pages d'un PDF en images, assembler images
   et PDF en un document unique, extraire le texte d'un PDF.

   ⛔ PROPRIÉTÉ À PRÉSERVER : aucun octet ne sort de la machine.
   Pas de `fetch`, pas de `XMLHttpRequest`, pas de balise pointant un domaine
   tiers, pas de télémétrie, et AUCUN nom de fichier écrit dans un `console.*`
   ni dans les logs du backend. Les documents traités ici sont ceux de la
   mairie — délibérations, courriers, pièces de dossiers. C'est la raison pour
   laquelle les trois bibliothèques sont servies depuis `vendor/` et non
   depuis un CDN (voir scripts/vendor-libs.js et l'ADR-0035).

   ⛔ AUCUN STOCKAGE PERSISTANT : ni localStorage, ni sessionStorage, ni
   IndexedDB, ni Cache API. Tout vit dans `items` / `outputs`, en mémoire, et
   disparaît au rechargement. Fermer l'onglet suffit à ne rien laisser.

   Les moteurs de compression et de ciblage de poids (`imageToTarget`,
   `COMBOS`, `pickCombo`, `pdfToTarget`) sont repris tels quels de la maquette
   d'origine : ils sont éprouvés, ne pas les réécrire sans mesure à l'appui.

   Tout le module est enfermé dans une IIFE : les noms courts (`$`, `render`,
   `run`, `save`…) n'atteignent pas la portée globale d'admin.html, qui en
   utilise déjà de semblables.
   ════════════════════════════════════════════════════════════ */

(function(){
'use strict';

/* ── Bibliothèques, chargées à la demande ──────────────────────
   L'application n'a pas d'étape de construction, donc pas d'`import()` :
   l'équivalent maison est l'injection d'un <script src> local à la première
   ouverture de l'onglet, avec la promesse mémorisée. Même procédé que
   `_c3dChargerLib` pour MapLibre (js/mat-carte3d.js). Tant que l'onglet
   n'est pas ouvert, ces 1,9 Mo ne sont pas demandés. */
var LIBS = [
  'vendor/pdfjs/pdf.min.js?v=3.11.174',
  'vendor/pdf-lib/pdf-lib.min.js?v=1.17.1',
  'vendor/jszip/jszip.min.js?v=3.10.1'
];
var WORKER = 'vendor/pdfjs/pdf.worker.min.js?v=3.11.174';

var _libPromise = null;
var PDFDocument = null, degrees = null;

function injecter(src){
  return new Promise(function(resolve, reject){
    var s = document.createElement('script');
    s.src = src;
    s.onload = function(){ resolve(); };
    s.onerror = function(){ reject(new Error('bibliothèque indisponible')); };
    document.head.appendChild(s);
  });
}

function chargerLibs(){
  if (_libPromise) return _libPromise;
  _libPromise = Promise.all(LIBS.map(injecter)).then(function(){
    /* pdf.js réclame son worker PAR URL, donc une requête réseau — même
       locale — à CHAQUE `getDocument` : trois traitements PDF, trois lignes
       dans l'onglet Réseau, mesuré. Rien n'en sort (c'est notre propre
       fichier), mais la promesse tenue ici est « aucun appel réseau pendant
       le traitement », et un journal réseau VIDE se vérifie d'un coup d'œil
       là où « ces trois lignes-là sont inoffensives » demande une enquête.
       On construit donc le worker UNE fois, à l'ouverture de l'onglet, et
       pdf.js le réutilise pour tous les documents via `workerPort`.
       `workerSrc` reste renseigné : si la construction échoue, pdf.js
       retombe sur le chargement par URL plutôt que sur le worker simulé,
       bien plus lent. */
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER;
    try {
      window.pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(WORKER);
    } catch(e) {}
    PDFDocument = window.PDFLib.PDFDocument;
    degrees = window.PDFLib.degrees;
  }).catch(function(e){
    _libPromise = null;                      // réessayable au prochain « Traiter »
    throw e;
  });
  return _libPromise;
}

/* ── Catalogue des outils ──────────────────────────────────────
   Libellés français conservés à l'identique. */
var MB = 1048576;
var SIZES = [
  ['0.1','100 Ko — vignette'],
  ['0.3','300 Ko — web'],
  ['0.5','500 Ko — réseaux sociaux'],
  ['1','1 Mo'],
  ['2','2 Mo — pièce jointe'],
  ['5','5 Mo'],
  ['10','10 Mo'],
  ['custom','Autre…']
];

var TOOLS = {
  imgc:{
    name:'Compresser des images', hint:'vers un poids cible',
    lead:"Indiquez le poids voulu : la qualité et les dimensions sont ajustées automatiquement pour l'atteindre.",
    accept:'image/*', pick:'JPEG, PNG, WebP', camera:true,
    shootHint:'La photo prise est ajoutée à la liste, puis compressée comme les autres.',
    opts:[
      {id:'target', label:'Poids cible par image', type:'size', value:'0.5'},
      {id:'maxw', label:'Largeur max', type:'select', value:'2000',
        options:[['0','Aucune limite'],['1200','1200 px'],['1600','1600 px'],['2000','2000 px'],['3000','3000 px']]},
      {id:'fmt', label:'Format', type:'select', value:'image/jpeg',
        options:[['image/jpeg','JPEG'],['image/webp','WebP'],['image/png','PNG']]}
    ]
  },
  pdfc:{
    name:'Compresser un PDF', hint:'vers un poids cible',
    lead:"Chaque page est réencodée en image jusqu'à tenir dans le poids demandé. Le texte n'est alors plus sélectionnable ni recherchable — à réserver aux documents destinés à la lecture ou à l'impression.",
    warn:true, accept:'application/pdf', pick:'PDF uniquement',
    opts:[{id:'target', label:'Poids cible par PDF', type:'size', value:'2'}]
  },
  pdf2img:{
    name:'PDF vers images', hint:'une image par page',
    lead:"Extrait chaque page en image, au poids demandé. Pratique pour illustrer un post ou récupérer un visuel enfermé dans un PDF.",
    accept:'application/pdf', pick:'PDF uniquement',
    opts:[
      {id:'target', label:'Poids max par page', type:'size', value:'1'},
      {id:'fmt', label:'Format', type:'select', value:'image/jpeg',
        options:[['image/jpeg','JPEG'],['image/png','PNG']]}
    ]
  },
  merge:{
    name:'Assembler en PDF', hint:'images et PDF mélangés',
    lead:"Réunit plusieurs documents en un seul PDF, dans l'ordre de la liste. Réordonnez avec les flèches.",
    accept:'application/pdf,image/*', pick:'PDF et images, dans l\'ordre souhaité', camera:true,
    shootHint:'Photographiez une page à la fois, l\'ordre est modifiable ensuite.',
    opts:[{id:'target', label:'Poids cible du PDF final', type:'size', value:'0', none:true}]
  },
  text:{
    name:'Extraire le texte', hint:'PDF vers texte brut',
    lead:"Récupère le texte d'un PDF. Sans effet sur un document scanné : il ne contient que des images, pas de texte.",
    accept:'application/pdf', pick:'PDF uniquement', opts:[]
  },
  pdfpage:{
    name:'Organiser un PDF', hint:'découper, pivoter, réordonner',
    lead:"Choisissez les pages à garder, faites-les pivoter, changez leur ordre. Les pages conservées sont recopiées telles quelles : le texte reste sélectionnable et la qualité intacte, contrairement à « Compresser un PDF ».",
    accept:'application/pdf', pick:'un seul PDF à la fois', unique:true, pages:true,
    opts:[]
  },
  masque:{
    name:'Masquer une zone', hint:'visages, plaques, adresses',
    lead:"Tracez un rectangle sur ce qui doit disparaître — à la souris ou au doigt. Le masque est appliqué à la pleine résolution sur une image neuve ; l'originale n'est pas touchée.",
    accept:'image/*', pick:'JPEG, PNG, WebP', camera:true, editor:true, metadonnees:true,
    shootHint:'Photographiez le document, puis tracez les zones à masquer.',
    opts:[
      {id:'mode', label:'Masque', type:'select', value:'flou',
        options:[['flou','Flou'],['pixels','Pixels'],['noir','Noir opaque']]},
      {id:'fmt', label:'Format', type:'select', value:'image/jpeg',
        options:[['image/jpeg','JPEG'],['image/webp','WebP'],['image/png','PNG']]},
      {id:'target', label:'Poids cible', type:'size', value:'0', none:true}
    ]
  }
};

/* Les outils qui produisent une image la réencodent, donc n'emportent aucune
   métadonnée de l'original — position GPS comprise. C'est une propriété utile
   (une photo prise au téléphone trahit sinon le lieu de la prise de vue) et
   elle est ANNONCÉE : une garantie tacite n'en est pas une, et le jour où un
   outil passerait les octets d'origine tels quels, personne ne s'en
   apercevrait. Mesuré sur un JPEG porteur de coordonnées GPS — la sortie n'a
   plus ni marqueur APP1 ni chaîne « Exif ». Voir l'ADR-0036. */
TOOLS.imgc.metadonnees = true;
TOOLS.pdf2img.metadonnees = true;

var current='imgc', items=[], outputs=[], extracted='';

/* État des deux outils qui ne se contentent pas d'une liste de fichiers :
   `pages` décrit les pages du PDF ouvert dans « Organiser un PDF » (garder,
   rotation, ordre), `selected` désigne la photo en cours d'édition dans
   « Masquer une zone », dont les rectangles vivent dans `items[i].zones`. */
var pages = [], selected = -1, _srcDoc = null;

/* Les identifiants du DOM sont préfixés `af-` pour cohabiter avec les 18
   autres onglets d'admin.html. Le raccourci les préfixe une fois pour toutes,
   ce qui laisse le reste du code identique à la maquette. */
var $ = function(id){ return document.getElementById('af-' + id); };
var fmtSize = function(b){ return b < 1024 ? b+' o' : b < MB ? (b/1024).toFixed(0)+' Ko' : (b/MB).toFixed(2)+' Mo'; };
var stem = function(n){ return n.replace(/\.[^.]+$/,''); };
var ext = function(f){ return f==='image/png'?'png':f==='image/webp'?'webp':'jpg'; };

/* Un nom de fichier arrive de l'utilisateur : il finit dans du HTML construit
   par concaténation, donc il est échappé. La maquette l'insérait tel quel —
   sans conséquence sur une page locale, à corriger dans une console. */
function esc(s){
  return String(s).replace(/[&<>"']/g, function(c){
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
  });
}

function buildNav(){
  $('nav').innerHTML = Object.keys(TOOLS).map(function(k){
    var t = TOOLS[k];
    return '<button type="button" class="af-navbtn" data-t="'+k+'" aria-current="'+(k===current)+'">'
      + esc(t.name) + '<small>' + esc(t.hint) + '</small></button>';
  }).join('');
  Array.prototype.forEach.call($('nav').querySelectorAll('button'), function(b){
    b.addEventListener('click', function(){
      current = b.dataset.t; reset(); buildNav(); buildTool();
    });
  });
}

function buildTool(){
  var t = TOOLS[current];
  $('lead').textContent = t.lead;
  $('lead').className = 'af-lead' + (t.warn?' warn':'');
  $('dropHint').textContent = t.pick;
  $('picker').accept = t.accept;
  $('picker').multiple = !t.unique;
  $('shootRow').classList.toggle('af-hidden', !t.camera);
  $('shootHint').textContent = t.shootHint || '';
  $('privacy').classList.toggle('af-hidden', !t.metadonnees);

  $('opts').innerHTML = t.opts.map(function(o){
    if (o.type === 'size'){
      var list = (o.none ? [['0','Aucune limite']] : []).concat(SIZES);
      return '<div class="af-opt"><label for="af-o-'+o.id+'">'+esc(o.label)+'</label>'
        + '<select id="af-o-'+o.id+'">' + list.map(function(p){
            return '<option value="'+p[0]+'"'+(p[0]===o.value?' selected':'')+'>'+esc(p[1])+'</option>';
          }).join('') + '</select></div>'
        + '<div class="af-opt af-hidden" id="af-c-'+o.id+'"><label for="af-n-'+o.id+'">Poids (Mo)</label>'
        + '<input type="number" id="af-n-'+o.id+'" min="0.05" max="200" step="0.1" value="1"></div>';
    }
    return '<div class="af-opt"><label for="af-o-'+o.id+'">'+esc(o.label)+'</label>'
      + '<select id="af-o-'+o.id+'">' + o.options.map(function(p){
          return '<option value="'+p[0]+'"'+(p[0]===o.value?' selected':'')+'>'+esc(p[1])+'</option>';
        }).join('') + '</select></div>';
  }).join('');

  t.opts.filter(function(o){ return o.type === 'size'; }).forEach(function(o){
    var s = $('o-'+o.id);
    s.addEventListener('change', function(){
      $('c-'+o.id).classList.toggle('af-hidden', s.value !== 'custom');
    });
  });
  render();
}

/* Poids réellement visé pour une image déjà plus légère que la cible.
   Sans ce garde-fou, une vignette de 27 Ko soumise à une cible de 300 Ko
   ressortait à 44 Ko : le moteur essaie d'abord la qualité 0,95, la trouve
   sous la cible, et s'arrête — techniquement conforme, mais la liste
   affichait « +63 % » en rouge sur une compression demandée.
   ⛔ On ne renvoie PAS l'original tel quel : il emporterait ses métadonnées,
   position GPS comprise, et l'outil promet le contraire. On resserre la
   cible sur le poids d'origine, ce qui force le moteur à faire au moins
   aussi bien.
   ⚠️ Un premier essai plaçait ici un plancher de 50 Ko, censé éviter
   d'exiger l'impossible d'une petite image — il annulait exactement le cas
   qui motivait le correctif (27 Ko visait alors 50 Ko, et ressortait à 44).
   Le vrai risque, annoncer un échec sur une cible que l'utilisateur n'a
   jamais demandée, se traite à l'appel : `miss` n'est retenu que si la
   cible DEMANDÉE est ratée. */
function viser(tgt, taille){
  if (!tgt || !taille) return tgt;
  return Math.min(tgt, taille);
}

var opt = function(id){ return $('o-'+id) ? $('o-'+id).value : null; };
function target(id){
  var v = opt(id);
  if (v === null || v === '0') return 0;
  return (v === 'custom' ? +$('n-'+id).value : +v) * MB;
}

function render(){
  var reorder = current === 'merge';
  var choisir = TOOLS[current].editor;
  $('list').innerHTML = items.map(function(it, i){
    var right = '<span class="af-fsize">'+fmtSize(it.size)+'</span>';
    if (it.blob){
      var d = Math.round((1 - it.blob.size/it.size)*100);
      right = '<span class="af-fsize">'+fmtSize(it.size)+' → '+fmtSize(it.blob.size)+'</span>'
        + '<span class="af-delta'+(d<0?' up':'')+'">'+(d>=0?'−':'+')+Math.abs(d)+' %</span>';
    }
    var zones = choisir
      ? '<span class="af-fsize">'+(it.zones && it.zones.length
          ? it.zones.length + ' zone' + (it.zones.length>1?'s':'') : 'aucune zone')+'</span>'
      : '';
    var arrows = reorder
      ? '<button type="button" class="af-mini" data-up="'+i+'" '+(i===0?'disabled':'')+' aria-label="Monter">↑</button>'
        + '<button type="button" class="af-mini" data-down="'+i+'" '+(i===items.length-1?'disabled':'')+' aria-label="Descendre">↓</button>'
      : '';
    return '<li'+(choisir ? ' class="af-pick'+(i===selected?' on':'')+'" data-sel="'+i+'"' : '')+'>'
      + '<span class="af-fname">'+esc(it.name)+'</span>'+zones+right+arrows
      + '<button type="button" class="af-mini" data-rm="'+i+'" aria-label="Retirer">×</button></li>';
  }).join('');

  Array.prototype.forEach.call($('list').querySelectorAll('button'), function(b){
    b.addEventListener('click', function(e){
      e.stopPropagation();                       // sinon le clic sélectionne aussi la ligne
      var i = +(b.dataset.rm !== undefined ? b.dataset.rm
              : b.dataset.up !== undefined ? b.dataset.up : b.dataset.down);
      var t;
      if (b.dataset.rm !== undefined){
        items.splice(i,1);
        if (selected >= items.length) selected = items.length - 1;
      }
      else if (b.dataset.up !== undefined){ t = items[i-1]; items[i-1] = items[i]; items[i] = t; }
      else { t = items[i+1]; items[i+1] = items[i]; items[i] = t; }
      render();
      if (choisir) montrerEditeur();
    });
  });

  if (choisir) Array.prototype.forEach.call($('list').querySelectorAll('li[data-sel]'), function(li){
    li.addEventListener('click', function(){
      selected = +li.dataset.sel; render(); montrerEditeur();
    });
  });

  $('run').disabled = !items.length;
  $('save').classList.toggle('af-hidden', !outputs.length);
  $('copy').classList.toggle('af-hidden', !extracted);
  $('text').classList.toggle('af-hidden', !extracted);
  $('pages').classList.toggle('af-hidden', !(TOOLS[current].pages && pages.length));
  $('editor').classList.toggle('af-hidden', !(TOOLS[current].editor && items.length));
}

function reset(){
  items=[]; outputs=[]; extracted=''; pages=[]; selected=-1; _srcDoc=null;
  $('text').value=''; $('pages').innerHTML=''; setStatus(''); render();
}
function setStatus(msg, miss){
  $('status').textContent = msg;
  $('status').className = 'af-status' + (miss?' miss':'');
}

var shotCount = 0;

function addFiles(fl, fromCamera){
  outputs=[]; extracted=''; $('text').value='';
  var t = TOOLS[current], ok = t.accept;
  if (t.unique){ items = []; pages = []; $('pages').innerHTML = ''; }
  for (var i = 0; i < fl.length; i++){
    var f = fl[i];
    var isPdf = f.type === 'application/pdf', isImg = f.type.indexOf('image/') === 0;
    if (ok === 'application/pdf' && !isPdf) continue;
    if (ok === 'image/*' && !isImg) continue;
    if (ok.indexOf(',') > -1 && !isPdf && !isImg) continue;
    var name = fromCamera
      ? 'photo-' + String(++shotCount).padStart(2,'0') + '.jpg'
      : f.name;
    items.push({file:f, name:name, size:f.size, blob:null, zones:[]});
    if (t.unique) break;                          // un seul document à organiser
  }
  setStatus('');
  if (selected < 0 && items.length) selected = 0;
  render();
  if (t.pages && items.length) construirePages();
  if (t.editor && items.length) montrerEditeur();
}

/* ---------- moteur images ---------- */
function encode(bmp, w, h, fmt, q){
  var c = Object.assign(document.createElement('canvas'), {width:w, height:h});
  var ctx = c.getContext('2d');
  if (fmt !== 'image/png'){ ctx.fillStyle='#fff'; ctx.fillRect(0,0,w,h); }
  ctx.drawImage(bmp, 0, 0, w, h);
  return new Promise(function(r){ c.toBlob(r, fmt, q); });
}

async function imageToTarget(source, tgt, fmt, maxW){
  const bmp = await createImageBitmap(source, {imageOrientation:'from-image'});
  let w0 = bmp.width, h0 = bmp.height;
  if (maxW && w0 > maxW){ h0 = Math.round(h0*maxW/w0); w0 = maxW; }
  try{
    if (!tgt) return {blob: await encode(bmp,w0,h0,fmt,0.85), w:w0};
    let scale = 1, fallback = null;
    for (let a = 0; a < 5; a++){
      const w = Math.max(80, Math.round(w0*scale)), h = Math.max(80, Math.round(h0*scale));
      if (fmt === 'image/png'){
        const b = await encode(bmp,w,h,fmt);
        fallback = b;
        if (b.size <= tgt) return {blob:b, w:w};
      } else {
        const top = await encode(bmp,w,h,fmt,0.95);
        if (top.size <= tgt) return {blob:top, w:w, q:0.95};
        let lo = 0.28, hi = 0.95, best = null, bq = 0;
        for (let i = 0; i < 6; i++){
          const q = (lo+hi)/2, b = await encode(bmp,w,h,fmt,q);
          if (b.size <= tgt){ best = b; bq = q; lo = q; } else hi = q;
        }
        if (best) return {blob:best, w:w, q:bq};
        fallback = await encode(bmp,w,h,fmt,0.28);
      }
      scale *= 0.72;
    }
    return {blob:fallback, w:0, miss:true};
  } finally { bmp.close(); }
}

/* ---------- organiser un PDF : pages, rotations, ordre ----------
   ⚠️ Ici, à la différence de « Compresser un PDF », les pages ne sont JAMAIS
   rasterisées : pdf-lib recopie les objets de page d'origine. Le texte reste
   sélectionnable, la qualité est celle du document source, et le poids ne
   bouge presque pas. pdf.js ne sert qu'à dessiner les vignettes. */
var APERCU = 150;                                 // largeur d'une vignette, en px

async function rendreVignette(p){
  var page = await _srcDoc.getPage(p.n);
  var vp0 = page.getViewport({scale:1});
  var vp = page.getViewport({scale: APERCU / vp0.width, rotation: (vp0.rotation + p.rot) % 360});
  var c = Object.assign(document.createElement('canvas'),
    {width: Math.max(1, Math.ceil(vp.width)), height: Math.max(1, Math.ceil(vp.height))});
  var ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  await page.render({canvasContext: ctx, viewport: vp}).promise;
  p.canvas = c;
}

async function construirePages(){
  pages = [];
  $('pages').innerHTML = '';
  try {
    await chargerLibs();
    setStatus('Lecture du document…');
    _srcDoc = await window.pdfjsLib.getDocument({data: await items[0].file.arrayBuffer()}).promise;
    for (var n = 1; n <= _srcDoc.numPages; n++){
      setStatus('Aperçu ' + n + ' / ' + _srcDoc.numPages + '…');
      var p = {n: n, garder: true, rot: 0, canvas: null};
      await rendreVignette(p);
      pages.push(p);
    }
    setStatus(_srcDoc.numPages + ' page' + (_srcDoc.numPages > 1 ? 's' : ''));
  } catch(e){
    setStatus('Échec : ' + (e.message || 'PDF illisible ou protégé'), true);
    pages = [];
  }
  dessinerPages();
  render();
}

function dessinerPages(){
  var boite = $('pages');
  boite.innerHTML = '';
  pages.forEach(function(p, i){
    var el = document.createElement('div');
    el.className = 'af-pg' + (p.garder ? '' : ' out');
    var vue = document.createElement('div');
    vue.className = 'af-pg-vue';
    if (p.canvas) vue.appendChild(p.canvas);
    el.appendChild(vue);

    var barre = document.createElement('div');
    barre.className = 'af-pg-bar';
    barre.innerHTML =
      '<span class="af-pg-num">p. ' + p.n + (p.rot ? ' · ' + p.rot + '°' : '') + '</span>'
      + '<button type="button" class="af-mini" data-a="gauche" aria-label="Page ' + p.n + ' : pivoter à gauche">↺</button>'
      + '<button type="button" class="af-mini" data-a="droite" aria-label="Page ' + p.n + ' : pivoter à droite">↻</button>'
      + '<button type="button" class="af-mini" data-a="avant" ' + (i === 0 ? 'disabled' : '') + ' aria-label="Page ' + p.n + ' : déplacer avant">←</button>'
      + '<button type="button" class="af-mini" data-a="apres" ' + (i === pages.length - 1 ? 'disabled' : '') + ' aria-label="Page ' + p.n + ' : déplacer après">→</button>'
      + '<button type="button" class="af-mini' + (p.garder ? '' : ' on') + '" data-a="garder" aria-pressed="' + !p.garder + '" aria-label="Page ' + p.n + ' : ' + (p.garder ? 'écarter' : 'remettre') + '">' + (p.garder ? '×' : '+') + '</button>';
    el.appendChild(barre);

    Array.prototype.forEach.call(barre.querySelectorAll('button'), function(b){
      b.addEventListener('click', async function(){
        var a = b.dataset.a, t;
        if (a === 'garder') p.garder = !p.garder;
        else if (a === 'avant'){ t = pages[i-1]; pages[i-1] = pages[i]; pages[i] = t; }
        else if (a === 'apres'){ t = pages[i+1]; pages[i+1] = pages[i]; pages[i] = t; }
        else {
          p.rot = ((p.rot + (a === 'gauche' ? -90 : 90)) % 360 + 360) % 360;
          await rendreVignette(p);               // re-rendu exact plutôt qu'une rotation CSS
        }
        dessinerPages();
      });
    });
    boite.appendChild(el);
  });
}

async function organiserPdf(){
  var gardees = pages.filter(function(p){ return p.garder; });
  if (!gardees.length) throw new Error('aucune page conservée');
  var src = await PDFDocument.load(await items[0].file.arrayBuffer());
  var out = await PDFDocument.create();
  var copiees = await out.copyPages(src, gardees.map(function(p){ return p.n - 1; }));
  copiees.forEach(function(pg, i){
    var r = gardees[i].rot;
    /* La rotation demandée s'AJOUTE à celle que la page portait déjà : un scan
       enregistré à 90° et pivoté de 90° doit finir à 180°, pas à 90°. */
    if (r) pg.setRotation(degrees(((pg.getRotation().angle + r) % 360 + 360) % 360));
    out.addPage(pg);
  });
  return new Blob([await out.save()], {type: 'application/pdf'});
}

/* ---------- masquer une zone d'une photo ----------
   Les rectangles sont stockés en coordonnées NORMALISÉES (0 à 1). L'aperçu
   fait quelques centaines de pixels de large, la photo plusieurs milliers :
   des coordonnées en pixels d'aperçu masqueraient le mauvais endroit sur
   l'original. Le masque est appliqué à la pleine résolution, jamais sur
   l'image réduite qu'on voit à l'écran. */
var _apercu = null;                               // ImageBitmap de la photo sélectionnée

async function montrerEditeur(){
  var cv = $('canvas');
  if (!items.length || selected < 0){
    $('editor').classList.add('af-hidden');
    return;
  }
  $('editor').classList.remove('af-hidden');
  try {
    if (_apercu) { _apercu.close(); _apercu = null; }
    $('zonesInfo').textContent = 'Chargement de l\'aperçu…';   // l'attente doit se voir
    _apercu = await createImageBitmap(items[selected].file, {imageOrientation:'from-image'});
    var large = Math.min(_apercu.width, 720);
    cv.width = large;
    cv.height = Math.round(_apercu.height * large / _apercu.width);
    peindreEditeur();
  } catch(e){
    setStatus('Aperçu impossible : ' + (e.message || 'image illisible'), true);
  }
}

function peindreEditeur(provisoire){
  var cv = $('canvas'), ctx = cv.getContext('2d');
  if (!_apercu) return;
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.drawImage(_apercu, 0, 0, cv.width, cv.height);
  var zones = (items[selected] && items[selected].zones) || [];
  var toutes = provisoire ? zones.concat([provisoire]) : zones;
  toutes.forEach(function(z){
    var x = z.x * cv.width, y = z.y * cv.height, w = z.w * cv.width, h = z.h * cv.height;
    ctx.fillStyle = 'rgba(26,61,43,0.55)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#d4a843';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
  });
  $('zonesInfo').textContent = zones.length
    ? zones.length + ' zone' + (zones.length > 1 ? 's' : '') + ' — le masque sera appliqué à la pleine résolution.'
    : 'Tracez un rectangle sur la photo.';
}

function appliquerMasques(bmp, zones, mode){
  var W = bmp.width, H = bmp.height;
  var faire = function(w, h){ return Object.assign(document.createElement('canvas'), {width:w, height:h}); };
  var src = faire(W, H); src.getContext('2d').drawImage(bmp, 0, 0);
  var out = faire(W, H);
  var ctx = out.getContext('2d');
  ctx.drawImage(bmp, 0, 0);

  zones.forEach(function(z){
    var x = Math.round(z.x * W), y = Math.round(z.y * H);
    var w = Math.max(1, Math.round(z.w * W)), h = Math.max(1, Math.round(z.h * H));
    if (mode === 'noir'){
      ctx.fillStyle = '#000';
      ctx.fillRect(x, y, w, h);
    } else if (mode === 'pixels'){
      var bloc = Math.max(3, Math.round(Math.min(w, h) / 8));
      var petit = faire(Math.max(1, Math.round(w / bloc)), Math.max(1, Math.round(h / bloc)));
      petit.getContext('2d').drawImage(src, x, y, w, h, 0, 0, petit.width, petit.height);
      ctx.imageSmoothingEnabled = false;          // sinon le navigateur ré-interpole et « dé-pixelise »
      ctx.drawImage(petit, 0, 0, petit.width, petit.height, x, y, w, h);
      ctx.imageSmoothingEnabled = true;
    } else {
      /* Rayon proportionnel à la zone : un flou de 10 px ne masque rien sur une
         photo de 4000 px de large. Le découpage évite de baver au-delà du
         rectangle, tout en laissant le flou puiser dans le voisinage. */
      var r = Math.max(8, Math.round(Math.min(w, h) / 4));
      ctx.save();
      ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      ctx.filter = 'blur(' + r + 'px)';
      ctx.drawImage(src, 0, 0);
      ctx.restore();
      ctx.filter = 'none';
    }
  });
  return out;
}

/* ---------- moteur PDF ---------- */
var COMBOS = [[170,.88],[150,.85],[130,.8],[110,.75],[96,.7],[85,.62],[72,.55],[60,.45],[50,.35],[40,.3]];

async function renderPage(doc, n, dpi, q, fmt){
  const page = await doc.getPage(n);
  const base = page.getViewport({scale:1});
  const vp = page.getViewport({scale:dpi/72});
  const c = Object.assign(document.createElement('canvas'),
    {width:Math.max(1,Math.ceil(vp.width)), height:Math.max(1,Math.ceil(vp.height))});
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0,0,c.width,c.height);
  await page.render({canvasContext:ctx, viewport:vp}).promise;
  const blob = await new Promise(function(r){ c.toBlob(r, fmt||'image/jpeg', q); });
  return {blob:blob, w:base.width, h:base.height};
}

async function pickCombo(doc, tgt, perPage, fmt){
  if (!tgt) return COMBOS[3];
  const pages = [1];
  if (doc.numPages > 3) pages.push(Math.ceil(doc.numPages/2));
  for (const c of COMBOS){
    let s = 0;
    for (const p of pages) s += (await renderPage(doc,p,c[0],c[1],fmt)).blob.size;
    const avg = s/pages.length;
    const est = perPage ? avg : avg*doc.numPages*1.03 + 6000;
    if (est <= tgt) return c;
  }
  return COMBOS[COMBOS.length-1];
}

async function buildPdf(doc, combo){
  const out = await PDFDocument.create();
  for (let n = 1; n <= doc.numPages; n++){
    setStatus('Page ' + n + ' / ' + doc.numPages + '…');
    const p = await renderPage(doc, n, combo[0], combo[1], 'image/jpeg');
    const img = await out.embedJpg(await p.blob.arrayBuffer());
    out.addPage([p.w,p.h]).drawImage(img, {x:0,y:0,width:p.w,height:p.h});
  }
  return new Blob([await out.save()], {type:'application/pdf'});
}

async function pdfToTarget(source, tgt){
  const data = source instanceof Blob ? await source.arrayBuffer() : source;
  const doc = await window.pdfjsLib.getDocument({data:data}).promise;
  let combo = await pickCombo(doc, tgt, false);
  let blob = await buildPdf(doc, combo);
  if (tgt && blob.size > tgt){
    const i = COMBOS.indexOf(combo);
    if (i > -1 && i < COMBOS.length-1){ combo = COMBOS[i+2] || COMBOS[i+1]; blob = await buildPdf(doc, combo); }
  }
  return {blob:blob, combo:combo, miss: !!tgt && blob.size > tgt};
}

/* ---------- exécution ---------- */
async function run(){
  $('run').disabled = true;
  outputs = []; extracted = ''; $('text').value = '';
  let missed = 0, resume = '';
  try{
    if (current !== 'imgc' && current !== 'masque'){  // ces deux-là se passent des bibliothèques
      setStatus('Préparation des outils…');
      await chargerLibs();
    }

    if (current === 'imgc'){
      const tgt = target('target'), maxW = +opt('maxw'), fmt = opt('fmt');
      for (const it of items){
        setStatus('Compression : ' + it.name);
        const r = await imageToTarget(it.file, viser(tgt, it.size), fmt, maxW);
        if (r.miss && (!tgt || r.blob.size > tgt)) missed++;   // cible DEMANDÉE, pas la cible resserrée
        it.blob = r.blob;
        outputs.push({name: stem(it.name) + '-compresse.' + ext(fmt), blob:r.blob});
        render();
      }
    }

    else if (current === 'masque'){
      const tgt = target('target'), fmt = opt('fmt'), mode = opt('mode');
      for (const it of items){
        setStatus('Masquage : ' + it.name);
        const bmp = await createImageBitmap(it.file, {imageOrientation:'from-image'});
        let toile;
        try { toile = appliquerMasques(bmp, it.zones || [], mode); } finally { bmp.close(); }
        /* La toile masquée repart dans le moteur d'images : `createImageBitmap`
           accepte un canvas, donc aucun encodage intermédiaire ne s'intercale
           entre le masque et la sortie. */
        const r = await imageToTarget(toile, viser(tgt, it.size), fmt, 0);
        if (r.miss && (!tgt || r.blob.size > tgt)) missed++;
        it.blob = r.blob;
        outputs.push({name: stem(it.name) + '-masque.' + ext(fmt), blob:r.blob});
        render();
      }
    }

    else if (current === 'pdfpage'){
      setStatus('Assemblage des pages conservées…');
      const blob = await organiserPdf();
      items[0].blob = blob;
      const gardees = pages.filter(function(p){ return p.garder; }).length;
      resume = ' — ' + gardees + ' page' + (gardees > 1 ? 's' : '') + ' sur ' + pages.length;
      outputs.push({name: stem(items[0].name) + '-pages.pdf', blob:blob});
      render();
    }

    else if (current === 'pdfc'){
      const tgt = target('target');
      for (const it of items){
        setStatus('Analyse : ' + it.name);
        const r = await pdfToTarget(it.file, tgt);
        if (r.miss) missed++;
        it.blob = r.blob;
        outputs.push({name: stem(it.name) + '-compresse.pdf', blob:r.blob});
        render();
      }
    }

    else if (current === 'pdf2img'){
      const tgt = target('target'), fmt = opt('fmt');
      for (const it of items){
        const doc = await window.pdfjsLib.getDocument({data: await it.file.arrayBuffer()}).promise;
        const combo = await pickCombo(doc, tgt, true, fmt);
        for (let n = 1; n <= doc.numPages; n++){
          setStatus('Page ' + n + ' / ' + doc.numPages + '…');
          const p = await renderPage(doc, n, combo[0], combo[1], fmt);
          if (tgt && p.blob.size > tgt) missed++;
          outputs.push({name: stem(it.name) + '-p' + String(n).padStart(2,'0') + '.' + ext(fmt), blob:p.blob});
        }
      }
    }

    else if (current === 'merge'){
      const tgt = target('target');
      const pdf = await PDFDocument.create();
      for (const it of items){
        setStatus('Ajout : ' + it.name);
        if (it.file.type === 'application/pdf'){
          const src = await PDFDocument.load(await it.file.arrayBuffer());
          (await pdf.copyPages(src, src.getPageIndices())).forEach(function(p){ pdf.addPage(p); });
        } else {
          const r = await imageToTarget(it.file, 0, 'image/jpeg', 2000);
          const img = await pdf.embedJpg(await r.blob.arrayBuffer());
          const s = Math.min(595/img.width, 842/img.height, 1);
          const w = img.width*s, h = img.height*s;
          pdf.addPage([595,842]).drawImage(img, {x:(595-w)/2, y:(842-h)/2, width:w, height:h});
        }
      }
      let blob = new Blob([await pdf.save()], {type:'application/pdf'});
      if (tgt && blob.size > tgt){
        setStatus('Réduction au poids cible…');
        const r = await pdfToTarget(blob, tgt);
        blob = r.blob; if (r.miss) missed++;
      }
      outputs.push({name:'document-assemble.pdf', blob:blob});
    }

    else if (current === 'text'){
      let all = '';
      for (const it of items){
        const doc = await window.pdfjsLib.getDocument({data: await it.file.arrayBuffer()}).promise;
        all += '━━ ' + it.name + ' ━━\n\n';
        for (let n = 1; n <= doc.numPages; n++){
          setStatus('Lecture page ' + n + ' / ' + doc.numPages + '…');
          const tc = await (await doc.getPage(n)).getTextContent();
          const lines = []; let line = '';
          tc.items.forEach(function(i){ line += i.str; if (i.hasEOL){ lines.push(line); line = ''; } });
          if (line) lines.push(line);
          all += '[page ' + n + ']\n' + lines.join('\n').replace(/\n{3,}/g,'\n\n') + '\n\n';
        }
      }
      extracted = all.trim();
      $('text').value = extracted || 'Aucun texte trouvé. Ce PDF est probablement un scan.';
      if (!extracted) extracted = ' ';
    }

    const total = outputs.reduce(function(s,o){ return s+o.blob.size; }, 0);
    if (!outputs.length) setStatus('Terminé');
    else if (missed) setStatus(outputs.length + ' fichier' + (outputs.length>1?'s':'') + ' — ' + fmtSize(total)
      + '. Poids cible non atteint sur ' + missed + ' : réduisez la largeur max ou visez un poids plus élevé.', true);
    else setStatus(outputs.length + ' fichier' + (outputs.length>1?'s':'') + ' prêt' + (outputs.length>1?'s':'')
      + ' — ' + fmtSize(total) + resume);
  } catch(e){
    setStatus('Échec : ' + (e.message || 'fichier illisible ou protégé'), true);
  }
  $('run').disabled = false;
  render();
}

function download(blob, name){
  var u = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), {href:u, download:name}).click();
  setTimeout(function(){ URL.revokeObjectURL(u); }, 1500);
}

async function save(){
  if (extracted.trim()) return download(new Blob([$('text').value],{type:'text/plain'}), 'texte-extrait.txt');
  if (outputs.length === 1) return download(outputs[0].blob, outputs[0].name);
  await chargerLibs();                                  // JSZip n'est utile qu'ici
  const zip = new window.JSZip();
  outputs.forEach(function(o){ zip.file(o.name, o.blob); });
  download(await zip.generateAsync({type:'blob'}), 'atelier-fichiers.zip');
}

/* ── Branchement, une seule fois ───────────────────────────────
   Aucun gestionnaire en attribut HTML (`onclick=`) : le module reste
   compatible avec une politique de sécurité de contenu stricte, même si la
   page qui l'héberge ne l'est pas encore. */
var _pret = false;

function brancher(){
  $('drop').addEventListener('click', function(){ $('picker').click(); });
  $('drop').addEventListener('keydown', function(e){
    if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); $('picker').click(); }
  });
  $('picker').addEventListener('change', function(e){ addFiles(e.target.files); e.target.value=''; });
  $('shoot').addEventListener('click', function(){ $('cam').click(); });
  $('cam').addEventListener('change', function(e){
    if (e.target.files.length){
      addFiles(e.target.files, true);
      setStatus(items.length + ' page' + (items.length>1?'s':'') + ' en attente');
    }
    e.target.value = '';
  });
  ['dragenter','dragover'].forEach(function(ev){
    $('drop').addEventListener(ev, function(e){ e.preventDefault(); $('drop').classList.add('over'); });
  });
  ['dragleave','drop'].forEach(function(ev){
    $('drop').addEventListener(ev, function(e){ e.preventDefault(); $('drop').classList.remove('over'); });
  });
  $('drop').addEventListener('drop', function(e){ addFiles(e.dataTransfer.files); });

  /* Tracé des zones à masquer. `pointer*` couvre souris, stylet et doigt d'un
     seul jeu d'événements ; `touch-action:none` sur le canvas (CSS) empêche le
     navigateur d'interpréter le glissé comme un défilement de page. */
  (function tracer(){
    var cv = $('canvas'), depart = null;
    var pos = function(e){
      var r = cv.getBoundingClientRect();
      return {
        x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
        y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
      };
    };
    var rect = function(a, b){
      return {x: Math.min(a.x,b.x), y: Math.min(a.y,b.y),
              w: Math.abs(a.x-b.x), h: Math.abs(a.y-b.y)};
    };
    cv.addEventListener('pointerdown', function(e){
      /* ⚠️ `_apercu` doit exister AVANT d'accepter un tracé. La photo est
         décodée en tâche de fond ; sur un gros fichier, le panneau est déjà
         visible que le canvas est encore vide. Sans ce garde-fou, un tracé
         anticipé enregistrait bien une zone — elle était appliquée au
         traitement — mais `peindreEditeur` sortait aussitôt faute d'image :
         rien ne se dessinait, le compteur restait vide, et l'utilisateur
         recommençait, accumulant des zones invisibles. Mesuré. */
      if (selected < 0 || !_apercu) return;
      depart = pos(e);
      try { cv.setPointerCapture(e.pointerId); } catch(_){}
    });
    cv.addEventListener('pointermove', function(e){
      if (depart) peindreEditeur(rect(depart, pos(e)));
    });
    cv.addEventListener('pointerup', function(e){
      if (!depart) return;
      var z = rect(depart, pos(e));
      depart = null;
      /* Un clic sec ou un glissé d'un pixel produirait une zone invisible et
         inamovible : on l'ignore plutôt que de l'ajouter à la liste. */
      if (z.w > 0.015 && z.h > 0.015) items[selected].zones.push(z);
      peindreEditeur();
      render();
    });
    cv.addEventListener('pointercancel', function(){ depart = null; peindreEditeur(); });
  })();

  $('undo').addEventListener('click', function(){
    if (selected < 0 || !items[selected].zones.length) return;
    items[selected].zones.pop();
    peindreEditeur(); render();
  });
  $('clearZones').addEventListener('click', function(){
    if (selected < 0) return;
    items[selected].zones = [];
    peindreEditeur(); render();
  });

  /* Un fichier lâché à côté de la zone ouvrirait le document dans l'onglet,
     et la console d'administration serait perdue. On ne neutralise ce geste
     que pendant que l'atelier est affiché : les autres onglets gardent le
     comportement natif du navigateur. */
  function horsZone(e){
    var panneau = document.getElementById('tab-atelier');
    if (panneau && panneau.classList.contains('on')) e.preventDefault();
  }
  window.addEventListener('dragover', horsZone);
  window.addEventListener('drop', horsZone);

  $('run').addEventListener('click', run);
  $('save').addEventListener('click', save);
  $('clear').addEventListener('click', reset);
  $('copy').addEventListener('click', async function(){
    try {
      await navigator.clipboard.writeText($('text').value);
      setStatus('Texte copié');
    } catch(e){
      setStatus('Copie refusée par le navigateur — sélectionnez le texte et copiez-le à la main.', true);
    }
  });
}

/* Appelé par showTab('atelier') dans admin.html. L'interface se monte au
   premier affichage ; les bibliothèques ne sont demandées qu'ensuite, en
   arrière-plan, pour que le premier « Traiter » ne les attende pas. */
window.loadAtelierAdmin = function(){
  if (_pret) return;
  _pret = true;
  brancher();
  buildNav();
  buildTool();
  chargerLibs().catch(function(){
    setStatus('Les outils PDF n\'ont pas pu être chargés. Rechargez la page.', true);
  });
};

})();
