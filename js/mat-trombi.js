/* ════════════════════════════════════════════════════════════
   MAT — Trombinoscope Conseil Municipal v3.7.3
   ════════════════════════════════════════════════════════════ */

const ELUS = [
  {nom:"Romuald GENTY",age:43,prof:"Officier Sapeur-Pompier Professionnel",mandats:"3 Mandats",hameau:"Le Bourg",role:"Maire",pole:"Finances et achats",representations:["3ème vice-président de la Communauté de communes"],img:"romuald-genty"},
  {nom:"Sandra BARET",age:50,prof:"Directrice d'établissements sociaux et médico-sociaux",mandats:"2 Mandats",hameau:"Manthelon",role:"2ème adjointe",pole:"Pôle Social et Environnement",img:"sandra-baret"},
  {nom:"Damien BOUGRÉ",age:49,prof:"Chef de service Jeunesse, Réussite et Parentalité",mandats:"2 Mandats",hameau:"Mézières",role:"1er adjoint",pole:"Pôle Vie scolaire / enfance-jeunesse",img:"damien-bougre"},
  {nom:"Stéphanie GREUIN",age:43,prof:"Hypnothérapeute",mandats:"2 Mandats",hameau:"",role:"4ème adjointe",pole:"Pôle Relation avec les entreprises",img:"stephanie-greuin"},
  {nom:"Stéphane MAROIS",age:55,prof:"Officier Sapeur-Pompier Professionnel",mandats:"3 Mandats",hameau:"La Grange",role:"3ème adjoint",pole:"Pôle Voirie et Sécurité",img:"stephane-marois"},
  {nom:"Fabrice AUFFRET",age:47,prof:"Responsable Informatique",mandats:"3 Mandats",hameau:"Le Bourg",role:"Conseiller délégué",pole:"Communication et innovations",img:"fabrice-auffret"},
  {nom:"Katia COURTOIS",age:53,prof:"Greffier",mandats:"3 Mandats",hameau:"Manthelon",role:"Conseillère municipale",pole:"",img:"katia-courtois"},
  {nom:"Christophe DESCHAMPS",age:59,prof:"Agent de maîtrise",mandats:"5 Mandats",hameau:"Rolland",role:"Conseiller délégué",pole:"Convivialité, fêtes et démocratie locale",img:"christophe-deschamps"},
  {nom:"Amandine BUREAU",age:42,prof:"Vigneronne",mandats:"1 Mandat",hameau:"Le Buisson",role:"Conseillère municipale",pole:"",img:"amandine-bureau"},
  {nom:"Bruno MAILLARY",age:65,prof:"Retraité",mandats:"2 Mandats",hameau:"Rolland",role:"Conseiller délégué",pole:"Urbanisme et travaux",img:"bruno-maillary"},
  {nom:"Caroline BAILLIOT-LEROY",age:46,prof:"Assistante de direction, Secteur Assurance",mandats:"1 Mandat",hameau:"",role:"Conseillère municipale",pole:"",img:"caroline-bailliot-leroy"},
  {nom:"Élodie FRANÇOIS",age:39,prof:"Ingénieur Paysage et Environnement",mandats:"1 Mandat",hameau:"Le Bréau",role:"Conseillère municipale",pole:"",img:"elodie-francois"},
  {nom:"Léane FARINA-JAVOY",age:24,prof:"Exploitante Agricole",mandats:"1 Mandat",hameau:"Le Bréau",role:"Conseillère municipale",pole:"",img:"leane-farina-javoy"},
  {nom:"Romain LOTHE",age:37,prof:"Chef d'équipe Gros Œuvre",mandats:"1 Mandat",hameau:"Manthelon",role:"Conseiller municipal",pole:"",img:"romain-lothe"},
  {nom:"Sarah MARÉCHAL",age:49,prof:"Officiante de cérémonie laïque",mandats:"2 Mandats",hameau:"Rolland",role:"Conseillère déléguée",pole:"Pôle aînés",img:"sarah-marechal"},
];

const COMMISSION_DATA = [
  {name:"Finances", president:"Romuald GENTY", members:["Bruno MAILLARY","Katia COURTOIS","Damien BOUGRÉ","Stéphanie GREUIN","Léane FARINA-JAVOY","Romain LOTHE"]},
  {name:"Achats", president:"Romuald GENTY", members:["Stéphane MAROIS","Caroline BAILLIOT-LEROY","Stéphanie GREUIN","Sarah MARÉCHAL","Romain LOTHE"]},
  {name:"Vie scolaire / enfance-jeunesse", president:"Damien BOUGRÉ", members:["Katia COURTOIS","Stéphanie GREUIN","Sarah MARÉCHAL"]},
  {name:"Menus restaurant scolaire", president:"Damien BOUGRÉ", members:["Stéphanie GREUIN","Katia COURTOIS","Amandine BUREAU"]},
  {name:"Gestion du personnel", president:"Damien BOUGRÉ", members:["Romuald GENTY"]},
  {name:"Environnement", president:"Sandra BARET", members:["Élodie FRANÇOIS","Fabrice AUFFRET","Léane FARINA-JAVOY","Caroline BAILLIOT-LEROY"]},
  {name:"Actions sociales", president:"Sandra BARET", members:["Damien BOUGRÉ","Romuald GENTY","Stéphanie GREUIN","Katia COURTOIS","Sarah MARÉCHAL"]},
  {name:"Voirie / sécurité", president:"Stéphane MAROIS", members:["Bruno MAILLARY","Romuald GENTY","Léane FARINA-JAVOY","Élodie FRANÇOIS","Romain LOTHE"]},
  {name:"Cimetière", president:"Stéphane MAROIS", members:["Sarah MARÉCHAL","Katia COURTOIS","Romain LOTHE","Léane FARINA-JAVOY"]},
  {name:"Relation avec les entreprises", president:"Stéphanie GREUIN", members:["Caroline BAILLIOT-LEROY"]},
  {name:"Pôle convivialité", president:"Christophe DESCHAMPS", members:"ALL"},
  {name:"Fêtes, cérémonies, vie associative et culturelle", president:"Christophe DESCHAMPS", members:["Romuald GENTY","Sarah MARÉCHAL","Fabrice AUFFRET","Damien BOUGRÉ","Bruno MAILLARY","Sandra BARET","Léane FARINA-JAVOY","Stéphane MAROIS","Romain LOTHE","Amandine BUREAU","Stéphanie GREUIN","Katia COURTOIS","Élodie FRANÇOIS","Caroline BAILLIOT-LEROY"]},
  {name:"Instances démocratiques", president:"Christophe DESCHAMPS", members:["Romuald GENTY","Sarah MARÉCHAL","Fabrice AUFFRET","Damien BOUGRÉ","Bruno MAILLARY","Sandra BARET","Léane FARINA-JAVOY","Stéphane MAROIS","Romain LOTHE","Amandine BUREAU","Stéphanie GREUIN","Katia COURTOIS","Élodie FRANÇOIS","Caroline BAILLIOT-LEROY"]},
  {name:"Urbanisme", president:"Bruno MAILLARY", members:["Sandra BARET","Romuald GENTY","Léane FARINA-JAVOY","Stéphanie GREUIN","Amandine BUREAU","Élodie FRANÇOIS","Romain LOTHE"]},
  {name:"Travaux / projets d’urbanisme", president:"Bruno MAILLARY", members:["Sandra BARET","Romain LOTHE","Stéphane MAROIS","Romuald GENTY","Caroline BAILLIOT-LEROY"]},
  {name:"Commission d’appel d’offres", president:"Romuald GENTY", titulaires:["Fabrice AUFFRET","Amandine BUREAU","Sandra BARET"], suppleants:["Stéphane MAROIS","Romain LOTHE","Bruno MAILLARY"]},
  {name:"Communication et innovations", president:"Fabrice AUFFRET", members:["Romuald GENTY","Sandra BARET","Stéphanie GREUIN","Caroline BAILLIOT-LEROY"]},
  {name:"Pôle aînés", president:"Sarah MARÉCHAL", members:["Sandra BARET","Élodie FRANÇOIS"]},
  {name:"Commission de contrôle des listes électorales", titulaires:["Katia COURTOIS"], suppleants:["Caroline BAILLIOT-LEROY"]},
  {name:"C3M", titulaires:["Christophe DESCHAMPS","Bruno MAILLARY","Romain LOTHE"], suppleants:["Fabrice AUFFRET","Sandra BARET","Stéphane MAROIS"]},
  {name:"Crèche des Marmousets", titulaires:["Damien BOUGRÉ","Katia COURTOIS","Romuald GENTY"], suppleants:["Christophe DESCHAMPS","Stéphanie GREUIN","Bruno MAILLARY"]},
  {name:"EPFLI 45", titulaires:["Romuald GENTY"], suppleants:["Sandra BARET"]},
  {name:"CNAS", delegues:["Damien BOUGRÉ"]},
  {name:"Commission de suivi de site non dangereux de la Préfecture du Loiret", titulaires:["Romuald GENTY","Bruno MAILLARY","Léane FARINA-JAVOY"], suppleants:["Christophe DESCHAMPS","Sandra BARET","Stéphane MAROIS"]},
  {name:"Référent sécurité civile", referents:["Stéphane MAROIS"]},
  {name:"GIP RECIA", titulaires:["Romuald GENTY"], suppleants:["Damien BOUGRÉ"]},
  {name:"Pays Beauce Val de Loire", titulaires:["Léane FARINA-JAVOY"], suppleants:["Romuald GENTY"]},
  {name:"APPROLYS", titulaires:["Stéphane MAROIS"], suppleants:["Romuald GENTY"]},
];

function normalizeEluName(v){
  return String(v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[’']/g,' ')
    .replace(/[^a-zA-Z0-9]+/g,' ')
    .trim()
    .toLowerCase();
}

/* ── Photos du conseil ────────────────────────────────────────────────
   Deux fichiers par élu, et c'est délibéré (ADR-0041) :
     • `<slug>-vignette.webp` — carré 360 px, ~8 Ko. C'est ce que charge la
       GRILLE, quinze fois. Le cadrage reproduit `object-fit:cover` +
       `object-position:top` du CSS : le carré du haut du portrait.
     • `<slug>.webp` — portrait 933 × 1400, ~92 Ko. Chargé uniquement quand
       on ouvre la fiche d'UNE personne.
   Avant, la grille servait quinze portraits JPEG pleine taille : 2 037 Ko
   pour afficher quinze carrés de 120 px. Elle en charge 119.

   ⛔ Le nom de fichier est un IDENTIFIANT (`prenom-nom`), pas une phrase.
   Les anciens portaient l'âge et le nombre de mandats — « Romuald GENTY 43
   ans - 2 Mandats… » alors que la fiche disait « 3 Mandats ». Une donnée
   recopiée dans un nom de fichier ne se met jamais à jour et personne ne
   la relit. Ne rien remettre d'autre que le nom. */
function trombiVignette(slug){
  return 'img/trombi/' + encodeURIComponent(slug || '') + '-vignette.webp';
}
function trombiPortrait(slug){
  return 'img/trombi/' + encodeURIComponent(slug || '') + '.webp';
}

function ensureCommissionBuckets(elu){
  if(!elu._commissionRoles) elu._commissionRoles = {};
  return elu._commissionRoles;
}

function setCommissionRole(name, commissionName, role){
  const key = normalizeEluName(name);
  const elu = ELUS.find(e => normalizeEluName(e.nom) === key);
  if(!elu) return;
  const bucket = ensureCommissionBuckets(elu);
  const current = bucket[commissionName];
  const priority = { membre:1, suppleant:2, titulaire:3, delegue:3, referent:3, president:4 };
  if(!current || (priority[role] || 0) > (priority[current] || 0)) bucket[commissionName] = role;
}

(function hydrateCommissions(){
  COMMISSION_DATA.forEach(c => {
    if(c.president) setCommissionRole(c.president, c.name, 'president');
    (c.titulaires || []).forEach(name => setCommissionRole(name, c.name, 'titulaire'));
    (c.suppleants || []).forEach(name => setCommissionRole(name, c.name, 'suppleant'));
    (c.delegues || []).forEach(name => setCommissionRole(name, c.name, 'delegue'));
    (c.referents || []).forEach(name => setCommissionRole(name, c.name, 'referent'));
    const members = c.members === 'ALL' ? ELUS.map(e => e.nom) : (c.members || []);
    members.forEach(name => setCommissionRole(name, c.name, 'membre'));
  });

  ELUS.forEach(elu => {
    const roles = elu._commissionRoles || {};
    elu.commissions = { president:[], titulaire:[], suppleant:[], delegue:[], referent:[], membre:[] };
    COMMISSION_DATA.forEach(c => {
      const role = roles[c.name];
      if(role && elu.commissions[role]) elu.commissions[role].push(c.name);
    });
    elu.totalCommissions = Object.keys(roles).length;
  });
})();

function commissionSectionHTML(title, icon, items, tone){
  if(!items || !items.length) return '';
  const bg = tone || 'rgba(26,61,43,0.05)';
  return `<div style="margin-top:12px;background:${bg};border:1px solid rgba(0,0,0,0.06);border-radius:14px;padding:10px 12px">`
    + `<div style="font-size:0.62rem;font-weight:900;text-transform:uppercase;letter-spacing:0.08em;color:var(--leaf);margin-bottom:8px">${icon} ${title}</div>`
    + `<div style="display:flex;flex-direction:column;gap:6px">`
    + items.map(item => `<div style="font-size:0.76rem;line-height:1.45;color:var(--text)">• ${esc(item)}</div>`).join('')
    + `</div></div>`;
}

function renderCommissionsForElu(elu){
  if(!elu || !elu.commissions) return '';
  const c = elu.commissions;
  const parts = [];
  parts.push(`<div style="margin-top:14px;padding:10px 12px;border-radius:14px;background:linear-gradient(135deg,rgba(26,61,43,0.08),rgba(82,183,136,0.08));border:1px solid rgba(26,61,43,0.08)">`
    + `<div style="font-size:0.62rem;font-weight:900;text-transform:uppercase;letter-spacing:0.08em;color:var(--leaf)">🏛️ Commissions et représentations</div>`
    + `<div style="font-size:0.78rem;font-weight:800;color:var(--forest);margin-top:4px">${elu.totalCommissions || 0} participation${(elu.totalCommissions || 0) > 1 ? 's' : ''}</div>`
    + `</div>`);
  parts.push(commissionSectionHTML('Présidence', '👑', c.president, 'rgba(212,168,67,0.12)'));
  parts.push(commissionSectionHTML('Titulaire', '✅', c.titulaire, 'rgba(37,99,235,0.08)'));
  parts.push(commissionSectionHTML('Suppléance', '🪪', c.suppleant, 'rgba(245,158,11,0.10)'));
  parts.push(commissionSectionHTML('Délégation / représentation', '🎯', [].concat(c.delegue || [], c.referent || []), 'rgba(124,58,237,0.08)'));
  parts.push(commissionSectionHTML('Membre', '👥', c.membre, 'rgba(26,61,43,0.04)'));
  return parts.join('');
}

function buildTrombi(){
  const grid = document.getElementById('trombi-grid');
  if(!grid) return;
  grid.innerHTML = ELUS.map((e,i) => {
    const isMaire = e.role === 'Maire';
    const isAdjoint = /adjoint/i.test(e.role);
    const isDelegue = /délégu/i.test(e.role);
    const badgeClass = isMaire ? 'trombi-badge is-maire' : isAdjoint ? 'trombi-badge is-adjoint' : 'trombi-badge';
    const badgeLabel = isMaire ? '⭐ Maire' : (isAdjoint || isDelegue ? e.role : 'Conseiller·e');
    const prenomNom = e.nom.split(' ');
    const prenom = prenomNom[0];
    const nomCourt = prenomNom.slice(1).join(' ');
    return `<div class="trombi-item" onclick="openTrombi(${i})" role="button" tabindex="0">`
      + `<div class="trombi-photo-wrap">`
      + `<img class="trombi-photo" src="${trombiVignette(e.img)}" alt="${e.nom}" width="360" height="360" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='img/mat-header.webp'">`
      + `<div class="${badgeClass}">${badgeLabel}</div>`
      + `</div>`
      + `<div class="trombi-name" title="${e.nom}">${prenom}<br><span style="font-weight:700;color:var(--muted)">${nomCourt}</span></div>`
      + `</div>`;
  }).join('');
}

function openTrombi(idx){
  const e = ELUS[idx];
  try{
    const eluKey='elu_'+(e.nom||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').substring(0,25);
    // Stats tracking fire-and-forget : timeout 5 s, on ignore les rejets.
    matFetch(window.MAT_API+'/stats/track',{method:'POST',headers:{'Content-Type':'application/json','x-device-id':getMatDeviceId()},body:JSON.stringify({service:eluKey})}, 5000).catch(function(){});
  }catch(_){ }
  const modal = document.getElementById('trombi-modal');
  const card = document.getElementById('trombi-card');
  document.getElementById('trombi-big-img').src = trombiPortrait(e.img);
  card.style.maxHeight='min(92vh,760px)';
  card.style.display='flex';
  card.style.flexDirection='column';
  document.getElementById('trombi-nom').textContent = e.nom;
  document.getElementById('trombi-role-badge').textContent = e.role;
  document.getElementById('trombi-pole').textContent = e.pole ? '🏷️ ' + e.pole : '';
  const poleEl = document.getElementById('trombi-pole');
  let topRepr = document.getElementById('trombi-top-representations');
  if(poleEl && poleEl.parentNode){
    if(!topRepr){
      topRepr = document.createElement('div');
      topRepr.id = 'trombi-top-representations';
      poleEl.insertAdjacentElement('afterend', topRepr);
    }
    if(e.representations && e.representations.length){
      topRepr.innerHTML = `<div style="margin-top:10px;padding:12px 14px;border-radius:16px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;box-shadow:0 8px 20px rgba(217,119,6,0.22)">`
        + `<div style="font-size:0.62rem;font-weight:900;text-transform:uppercase;letter-spacing:0.08em;opacity:0.9">🏛️ Intercommunalité</div>`
        + e.representations.map(item => `<div style="margin-top:5px;font-size:0.95rem;line-height:1.35;font-weight:900">${esc(item)}</div>`).join('')
        + `</div>`;
      topRepr.style.display = '';
    } else {
      topRepr.innerHTML = '';
      topRepr.style.display = 'none';
    }
  }
  document.getElementById('trombi-age').textContent = e.age + ' ans';
  document.getElementById('trombi-prof').textContent = e.prof;
  document.getElementById('trombi-mandats').textContent = e.mandats;
  const hWrap = document.getElementById('trombi-hameau-wrap');
  if(e.hameau){ document.getElementById('trombi-hameau').textContent = e.hameau; hWrap.style.display='flex'; }
  else { hWrap.style.display='none'; }
  let commissionsWrap = document.getElementById('trombi-commissions-wrap');
  const contentWrap = document.getElementById('trombi-pole') ? document.getElementById('trombi-pole').parentNode : null;
  if(contentWrap){
    contentWrap.style.overflowY='auto';
    contentWrap.style.flex='1';
    if(!commissionsWrap){
      commissionsWrap=document.createElement('div');
      commissionsWrap.id='trombi-commissions-wrap';
      contentWrap.appendChild(commissionsWrap);
    }
  }
  if(commissionsWrap) commissionsWrap.innerHTML = renderCommissionsForElu(e);
  modal.style.display='flex';
  card.style.transform='scale(0.7) rotate(-2deg)';
  card.style.opacity='0';
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      card.style.transform='scale(1) rotate(0deg)';
      card.style.opacity='1';
    });
  });
  const img = document.getElementById('trombi-big-img');
  img.style.filter='brightness(1.2) saturate(1.4)';
  setTimeout(()=>{ img.style.transition='filter 0.8s ease'; img.style.filter='brightness(1) saturate(1)'; },250);
}

function closeTrombi(e){
  if(e.target === document.getElementById('trombi-modal')) closeTrombiBtn();
}
function closeTrombiBtn(){
  const card = document.getElementById('trombi-card');
  card.style.transform='scale(0.8)';
  card.style.opacity='0';
  setTimeout(()=>{ document.getElementById('trombi-modal').style.display='none'; },250);
}
