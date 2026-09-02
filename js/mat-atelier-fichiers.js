/* ════════════════════════════════════════════════════════════
   MAT — Atelier fichiers (onglet 📎 de l'administration) v1.0.0
   Copyright (c) 2024-2026 Commune de Mézières-lez-Cléry — Licence MIT

   Cinq outils, tous exécutés DANS LE NAVIGATEUR : compresser des images vers
   un poids cible, compresser un PDF, extraire les pages d'un PDF en images,
   assembler images et PDF en un document unique, extraire le texte d'un PDF.

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
var PDFDocument = null;

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
    opts:[{id:'target', label:'Poids cible du PDF final', type:'size', value:'0', none:true}]
  },
  text:{
    name:'Extraire le texte', hint:'PDF vers texte brut',
    lead:"Récupère le texte d'un PDF. Sans effet sur un document scanné : il ne contient que des images, pas de texte.",
    accept:'application/pdf', pick:'PDF uniquement', opts:[]
  }
};

var current='imgc', items=[], outputs=[], extracted='';

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
  $('shootRow').classList.toggle('af-hidden', !t.camera);

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

var opt = function(id){ return $('o-'+id) ? $('o-'+id).value : null; };
function target(id){
  var v = opt(id);
  if (v === null || v === '0') return 0;
  return (v === 'custom' ? +$('n-'+id).value : +v) * MB;
}

function render(){
  var reorder = current === 'merge';
  $('list').innerHTML = items.map(function(it, i){
    var right = '<span class="af-fsize">'+fmtSize(it.size)+'</span>';
    if (it.blob){
      var d = Math.round((1 - it.blob.size/it.size)*100);
      right = '<span class="af-fsize">'+fmtSize(it.size)+' → '+fmtSize(it.blob.size)+'</span>'
        + '<span class="af-delta'+(d<0?' up':'')+'">'+(d>=0?'−':'+')+Math.abs(d)+' %</span>';
    }
    var arrows = reorder
      ? '<button type="button" class="af-mini" data-up="'+i+'" '+(i===0?'disabled':'')+' aria-label="Monter">↑</button>'
        + '<button type="button" class="af-mini" data-down="'+i+'" '+(i===items.length-1?'disabled':'')+' aria-label="Descendre">↓</button>'
      : '';
    return '<li><span class="af-fname">'+esc(it.name)+'</span>'+right+arrows
      + '<button type="button" class="af-mini" data-rm="'+i+'" aria-label="Retirer">×</button></li>';
  }).join('');

  Array.prototype.forEach.call($('list').querySelectorAll('button'), function(b){
    b.addEventListener('click', function(){
      var i = +(b.dataset.rm !== undefined ? b.dataset.rm
              : b.dataset.up !== undefined ? b.dataset.up : b.dataset.down);
      var t;
      if (b.dataset.rm !== undefined) items.splice(i,1);
      else if (b.dataset.up !== undefined){ t = items[i-1]; items[i-1] = items[i]; items[i] = t; }
      else { t = items[i+1]; items[i+1] = items[i]; items[i] = t; }
      render();
    });
  });

  $('run').disabled = !items.length;
  $('save').classList.toggle('af-hidden', !outputs.length);
  $('copy').classList.toggle('af-hidden', !extracted);
  $('text').classList.toggle('af-hidden', !extracted);
}

function reset(){ items=[]; outputs=[]; extracted=''; $('text').value=''; setStatus(''); render(); }
function setStatus(msg, miss){
  $('status').textContent = msg;
  $('status').className = 'af-status' + (miss?' miss':'');
}

var shotCount = 0;

function addFiles(fl, fromCamera){
  outputs=[]; extracted=''; $('text').value='';
  var ok = TOOLS[current].accept;
  for (var i = 0; i < fl.length; i++){
    var f = fl[i];
    var isPdf = f.type === 'application/pdf', isImg = f.type.indexOf('image/') === 0;
    if (ok === 'application/pdf' && !isPdf) continue;
    if (ok === 'image/*' && !isImg) continue;
    if (ok.indexOf(',') > -1 && !isPdf && !isImg) continue;
    var name = fromCamera
      ? 'photo-' + String(++shotCount).padStart(2,'0') + '.jpg'
      : f.name;
    items.push({file:f, name:name, size:f.size, blob:null});
  }
  setStatus(''); render();
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
  let missed = 0;
  try{
    if (current !== 'imgc'){                       // seul l'outil images se passe des bibliothèques
      setStatus('Préparation des outils…');
      await chargerLibs();
    }

    if (current === 'imgc'){
      const tgt = target('target'), maxW = +opt('maxw'), fmt = opt('fmt');
      for (const it of items){
        setStatus('Compression : ' + it.name);
        const r = await imageToTarget(it.file, tgt, fmt, maxW);
        if (r.miss) missed++;
        it.blob = r.blob;
        outputs.push({name: stem(it.name) + '-compresse.' + ext(fmt), blob:r.blob});
        render();
      }
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
      + ' — ' + fmtSize(total));
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
